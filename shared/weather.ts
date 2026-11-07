/**
 * Thời tiết dùng chung client + server: mô tả tiếng Việt cho mã WMO, chọn "mùa" để lọc đồ,
 * và số liệu khí hậu dự phòng theo vùng/tháng khi không gọi được Open-Meteo.
 */
import type { ClimateZone, Province } from './provinces';

/** Trùng với WeatherSeason ở src/types.ts (trừ "Mọi thời tiết") */
export type SeasonMatch = 'Nắng ấm' | 'Mát mẻ' | 'Se lạnh' | 'Mưa';

export interface ProvinceWeather {
  provinceId: string;
  city: string;
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  wind: string;
  uvIndex: string;
  seasonMatch: SeasonMatch;
  /** live: vừa lấy; stale: số liệu cũ (≤ 6 giờ) vì Open-Meteo lỗi; climate: số liệu khí hậu trung bình */
  source: 'live' | 'stale' | 'climate';
  /** Thời điểm đo (ISO) */
  observedAt: string;
}

const WMO: [number[], string][] = [
  [[0], 'Trời quang'],
  [[1], 'Ít mây'],
  [[2], 'Có mây'],
  [[3], 'Nhiều mây'],
  [[45, 48], 'Sương mù'],
  [[51, 53, 55], 'Mưa phùn'],
  [[56, 57], 'Mưa phùn lạnh'],
  [[61], 'Mưa nhỏ'],
  [[63], 'Mưa vừa'],
  [[65], 'Mưa to'],
  [[66, 67], 'Mưa lạnh'],
  [[71, 73, 75, 77], 'Có tuyết'],
  [[80], 'Mưa rào nhẹ'],
  [[81], 'Mưa rào'],
  [[82], 'Mưa rào rất to'],
  [[85, 86], 'Mưa tuyết'],
  [[95], 'Dông'],
  [[96, 99], 'Dông kèm mưa đá'],
];

export function describeWeatherCode(code: number): string {
  return WMO.find(([codes]) => codes.includes(code))?.[1] ?? 'Không rõ';
}

const isRainCode = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;

/** Mưa (theo mã hoặc lượng mưa) > nhiệt độ cảm nhận: ≥ 27 Nắng ấm, ≥ 22 Mát mẻ, còn lại Se lạnh */
export function toSeasonMatch(feelsLike: number, precipitationMm: number, code: number): SeasonMatch {
  if (precipitationMm >= 0.5 || isRainCode(code)) return 'Mưa';
  if (feelsLike >= 27) return 'Nắng ấm';
  if (feelsLike >= 22) return 'Mát mẻ';
  return 'Se lạnh';
}

export function uvLabel(uv: number): string {
  const v = Math.round(uv);
  if (v <= 2) return `${v} (Thấp)`;
  if (v <= 5) return `${v} (Trung bình)`;
  if (v <= 7) return `${v} (Cao)`;
  return `${v} (Rất cao)`;
}

// Nhiệt độ trung bình theo tháng (°C, tháng 1 → 12) và các tháng mùa mưa của từng vùng khí hậu.
// Số liệu làm tròn từ trung bình nhiều năm; chỉ dùng khi không có số liệu thật.
const CLIMATE: Record<ClimateZone, { temps: number[]; rainyMonths: number[]; humidity: number }> = {
  north: { temps: [17, 18, 20, 24, 28, 30, 30, 29, 28, 26, 22, 18], rainyMonths: [5, 6, 7, 8, 9], humidity: 80 },
  north_mountain: { temps: [14, 16, 19, 22, 25, 26, 26, 26, 25, 22, 18, 15], rainyMonths: [5, 6, 7, 8, 9], humidity: 84 },
  central: { temps: [21, 22, 24, 27, 29, 30, 30, 30, 28, 26, 24, 22], rainyMonths: [9, 10, 11, 12], humidity: 83 },
  highland: { temps: [21, 23, 25, 26, 26, 25, 24, 24, 24, 23, 22, 21], rainyMonths: [5, 6, 7, 8, 9, 10], humidity: 82 },
  dalat: { temps: [16, 17, 18, 19, 20, 19, 19, 19, 19, 18, 17, 16], rainyMonths: [5, 6, 7, 8, 9, 10], humidity: 86 },
  south: { temps: [26, 27, 28, 29, 29, 28, 28, 28, 27, 27, 27, 26], rainyMonths: [5, 6, 7, 8, 9, 10, 11], humidity: 78 },
};

/** Số liệu dự phòng: nhiệt độ trung bình tháng của vùng khí hậu */
export function climateFallback(province: Province, now = new Date()): ProvinceWeather {
  const month = now.getMonth() + 1;
  const zone = CLIMATE[province.climate];
  const temp = zone.temps[month - 1];
  const rainy = zone.rainyMonths.includes(month);
  return {
    provinceId: province.id,
    city: province.name,
    temp,
    feelsLike: temp,
    condition: rainy ? 'Mùa mưa (số liệu trung bình)' : 'Trung bình nhiều năm',
    humidity: zone.humidity,
    wind: '—',
    uvIndex: '—',
    seasonMatch: rainy ? 'Mưa' : toSeasonMatch(temp, 0, 0),
    source: 'climate',
    observedAt: now.toISOString(),
  };
}
