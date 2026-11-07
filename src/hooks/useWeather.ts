/**
 * Thời tiết của tỉnh/thành đang chọn: nhớ lựa chọn trên máy (sw_weather_province), lấy từ
 * /api/weather/current, tự làm mới mỗi 30 phút. Trong lúc chờ (hoặc mất mạng) dùng số liệu khí hậu
 * trung bình để giao diện và bộ lọc gợi ý luôn có giá trị.
 */
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PROVINCE_ID, getProvince } from '../../shared/provinces';
import { climateFallback, type ProvinceWeather } from '../../shared/weather';
import type { WeatherContextData } from '../types';

const STORAGE_KEY = 'sw_weather_province';
const REFRESH_MS = 30 * 60 * 1000;

function readProvinceId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return getProvince(id) ? id! : DEFAULT_PROVINCE_ID;
  } catch {
    return DEFAULT_PROVINCE_ID;
  }
}

export function toWeatherContext(w: ProvinceWeather): WeatherContextData {
  return {
    city: w.city,
    temp: w.temp,
    condition: w.condition,
    humidity: w.humidity,
    wind: w.wind,
    uvIndex: w.uvIndex,
    seasonMatch: w.seasonMatch,
    provinceId: w.provinceId,
    feelsLike: w.feelsLike,
    source: w.source,
    observedAt: w.observedAt,
  };
}

export function useWeather() {
  const [provinceId, setProvinceId] = useState(readProvinceId);
  const [weather, setWeather] = useState<WeatherContextData>(() =>
    toWeatherContext(climateFallback(getProvince(provinceId)!))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const province = getProvince(provinceId)!;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/weather/current?province=${encodeURIComponent(provinceId)}`);
        const body = await res.json();
        if (!cancelled && res.ok && body.weather) setWeather(toWeatherContext(body.weather));
      } catch {
        if (!cancelled) setWeather(toWeatherContext(climateFallback(province)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    // Đổi tỉnh: hiện ngay số liệu trung bình của tỉnh mới thay vì số của tỉnh cũ
    setWeather((prev) => (prev.provinceId === provinceId ? prev : toWeatherContext(climateFallback(province))));
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [provinceId]);

  const selectProvince = useCallback((id: string) => {
    if (!getProvince(id)) return;
    setProvinceId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  return { provinceId, weather, loading, selectProvince };
}
