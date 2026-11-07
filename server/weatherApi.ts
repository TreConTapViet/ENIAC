/**
 * GET /api/weather/current?province=<id>
 *
 * - Chỉ nhận id trong 34 tỉnh/thành (shared/provinces.ts).
 * - Một lần gọi Open-Meteo lấy cả 34 điểm, lưu trong bộ nhớ 30 phút; gọi quá 5 giây thì bỏ.
 * - Open-Meteo lỗi: dùng số liệu cũ tối đa 6 giờ, quá hạn thì dùng số liệu khí hậu trung bình.
 * - Chỉ gửi toạ độ tỉnh ra ngoài, không gửi dữ liệu người dùng.
 * Nguồn: Open-Meteo.com (CC BY 4.0), gói miễn phí dành cho mục đích phi thương mại.
 */
import express from 'express';
import { PROVINCES, getProvince } from '../shared/provinces.ts';
import {
  climateFallback,
  describeWeatherCode,
  toSeasonMatch,
  uvLabel,
  type ProvinceWeather,
} from '../shared/weather.ts';

const FRESH_MS = 30 * 60 * 1000;
const STALE_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;

let cache: { at: number; data: Map<string, ProvinceWeather> } | null = null;
let inflight: Promise<Map<string, ProvinceWeather>> | null = null;

async function fetchAllProvinces(): Promise<Map<string, ProvinceWeather>> {
  const params = new URLSearchParams({
    latitude: PROVINCES.map((p) => p.lat.toFixed(4)).join(','),
    longitude: PROVINCES.map((p) => p.lon.toFixed(4)).join(','),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index',
    timezone: 'Asia/Ho_Chi_Minh',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const body = (await res.json()) as { current: Record<string, number | string> }[];
  if (!Array.isArray(body) || body.length !== PROVINCES.length) throw new Error('Open-Meteo trả sai số điểm');

  const data = new Map<string, ProvinceWeather>();
  PROVINCES.forEach((province, i) => {
    const c = body[i].current;
    const temp = Math.round(Number(c.temperature_2m));
    const feelsLike = Math.round(Number(c.apparent_temperature));
    const code = Number(c.weather_code);
    data.set(province.id, {
      provinceId: province.id,
      city: province.name,
      temp,
      feelsLike,
      condition: describeWeatherCode(code),
      humidity: Math.round(Number(c.relative_humidity_2m)),
      wind: `${Math.round(Number(c.wind_speed_10m))} km/h`,
      uvIndex: uvLabel(Number(c.uv_index) || 0),
      seasonMatch: toSeasonMatch(feelsLike, Number(c.precipitation) || 0, code),
      source: 'live',
      observedAt: String(c.time),
    });
  });
  return data;
}

async function getAll(): Promise<{ data: Map<string, ProvinceWeather> | null; stale: boolean }> {
  const now = Date.now();
  if (cache && now - cache.at < FRESH_MS) return { data: cache.data, stale: false };
  try {
    // Nhiều người hỏi cùng lúc thì chỉ gọi Open-Meteo một lần
    inflight ??= fetchAllProvinces().finally(() => {
      inflight = null;
    });
    const data = await inflight;
    cache = { at: Date.now(), data };
    return { data, stale: false };
  } catch (err) {
    console.warn('Không lấy được thời tiết Open-Meteo:', (err as Error).message);
    if (cache && now - cache.at < STALE_MS) return { data: cache.data, stale: true };
    return { data: null, stale: true };
  }
}

export const weatherApi = express.Router();

weatherApi.get('/api/weather/current', async (req, res) => {
  const province = getProvince(String(req.query.province ?? ''));
  if (!province) return res.status(400).json({ error: 'Tỉnh/thành không hợp lệ.' });

  const { data, stale } = await getAll();
  const live = data?.get(province.id);
  const weather: ProvinceWeather = live
    ? { ...live, source: stale ? 'stale' : 'live' }
    : climateFallback(province);
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ weather, attribution: 'Open-Meteo.com (CC BY 4.0)' });
});
