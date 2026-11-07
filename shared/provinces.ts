/**
 * 34 tỉnh/thành sau sắp xếp theo Nghị quyết 202/2025/QH15 (hiệu lực 1/7/2025): 6 thành phố + 28 tỉnh.
 * Toạ độ là trung tâm hành chính – chính trị của tỉnh mới (thường là tỉnh lỵ của tỉnh cũ được chọn).
 * `formerNames` giữ tên các tỉnh cũ đã sáp nhập để người dùng gõ tên cũ vẫn tìm ra (vd. "Vũng Tàu" → TP.HCM).
 *
 * Giới hạn đã biết: tỉnh sau sáp nhập trải rộng nhiều vùng khí hậu (Lâm Đồng gồm cả Đà Lạt và Phan Thiết),
 * nên thời tiết lấy theo toạ độ trung tâm hành chính.
 */
import { normalizeVi } from './text';

export type Region = 'Miền Bắc' | 'Miền Trung' | 'Tây Nguyên' | 'Miền Nam';
/** Vùng khí hậu dùng cho số liệu dự phòng (shared/weather.ts) */
export type ClimateZone = 'north' | 'north_mountain' | 'central' | 'highland' | 'dalat' | 'south';

export interface Province {
  id: string;
  name: string;
  isCity: boolean;
  region: Region;
  climate: ClimateZone;
  /** Trung tâm hành chính */
  center: string;
  lat: number;
  lon: number;
  formerNames: string[];
}

const p = (
  id: string,
  name: string,
  isCity: boolean,
  region: Region,
  climate: ClimateZone,
  center: string,
  lat: number,
  lon: number,
  formerNames: string[] = []
): Province => ({ id, name, isCity, region, climate, center, lat, lon, formerNames });

export const PROVINCES: readonly Province[] = [
  // ---------- Miền Bắc ----------
  p('ha-noi', 'Hà Nội', true, 'Miền Bắc', 'north', 'Hà Nội', 21.0285, 105.8542),
  p('hai-phong', 'Hải Phòng', true, 'Miền Bắc', 'north', 'Hải Phòng', 20.8449, 106.6881, ['Hải Dương']),
  p('quang-ninh', 'Quảng Ninh', false, 'Miền Bắc', 'north', 'Hạ Long', 20.9599, 107.0425),
  p('bac-ninh', 'Bắc Ninh', false, 'Miền Bắc', 'north', 'Bắc Giang', 21.2731, 106.1946, ['Bắc Giang']),
  p('hung-yen', 'Hưng Yên', false, 'Miền Bắc', 'north', 'Hưng Yên', 20.6464, 106.0511, ['Thái Bình']),
  p('ninh-binh', 'Ninh Bình', false, 'Miền Bắc', 'north', 'Ninh Bình', 20.2506, 105.9745, ['Hà Nam', 'Nam Định']),
  p('phu-tho', 'Phú Thọ', false, 'Miền Bắc', 'north', 'Việt Trì', 21.3227, 105.4019, ['Vĩnh Phúc', 'Hòa Bình']),
  p('thai-nguyen', 'Thái Nguyên', false, 'Miền Bắc', 'north_mountain', 'Thái Nguyên', 21.5942, 105.8482, ['Bắc Kạn']),
  p('tuyen-quang', 'Tuyên Quang', false, 'Miền Bắc', 'north_mountain', 'Tuyên Quang', 21.8233, 105.2180, ['Hà Giang']),
  p('lao-cai', 'Lào Cai', false, 'Miền Bắc', 'north_mountain', 'Yên Bái', 21.7229, 104.9113, ['Yên Bái', 'Sa Pa']),
  p('cao-bang', 'Cao Bằng', false, 'Miền Bắc', 'north_mountain', 'Cao Bằng', 22.6657, 106.2577),
  p('lang-son', 'Lạng Sơn', false, 'Miền Bắc', 'north_mountain', 'Lạng Sơn', 21.8537, 106.7615),
  p('lai-chau', 'Lai Châu', false, 'Miền Bắc', 'north_mountain', 'Lai Châu', 22.3964, 103.4582),
  p('dien-bien', 'Điện Biên', false, 'Miền Bắc', 'north_mountain', 'Điện Biên Phủ', 21.3860, 103.0230),
  p('son-la', 'Sơn La', false, 'Miền Bắc', 'north_mountain', 'Sơn La', 21.3256, 103.9188),

  // ---------- Miền Trung ----------
  p('thanh-hoa', 'Thanh Hóa', false, 'Miền Trung', 'north', 'Thanh Hóa', 19.8067, 105.7852),
  p('nghe-an', 'Nghệ An', false, 'Miền Trung', 'central', 'Vinh', 18.6796, 105.6813),
  p('ha-tinh', 'Hà Tĩnh', false, 'Miền Trung', 'central', 'Hà Tĩnh', 18.3428, 105.9057),
  p('quang-tri', 'Quảng Trị', false, 'Miền Trung', 'central', 'Đồng Hới', 17.4689, 106.6223, ['Quảng Bình']),
  p('hue', 'Huế', true, 'Miền Trung', 'central', 'Huế', 16.4637, 107.5909, ['Thừa Thiên Huế']),
  p('da-nang', 'Đà Nẵng', true, 'Miền Trung', 'central', 'Đà Nẵng', 16.0544, 108.2022, ['Quảng Nam', 'Hội An', 'Tam Kỳ']),
  p('quang-ngai', 'Quảng Ngãi', false, 'Miền Trung', 'central', 'Quảng Ngãi', 15.1205, 108.7923, ['Kon Tum']),
  p('khanh-hoa', 'Khánh Hòa', false, 'Miền Trung', 'central', 'Nha Trang', 12.2388, 109.1967, ['Ninh Thuận', 'Phan Rang']),

  // ---------- Tây Nguyên ----------
  p('gia-lai', 'Gia Lai', false, 'Tây Nguyên', 'central', 'Quy Nhơn', 13.7820, 109.2192, ['Bình Định', 'Pleiku']),
  p('dak-lak', 'Đắk Lắk', false, 'Tây Nguyên', 'highland', 'Buôn Ma Thuột', 12.6667, 108.0500, ['Phú Yên', 'Tuy Hòa']),
  p('lam-dong', 'Lâm Đồng', false, 'Tây Nguyên', 'dalat', 'Đà Lạt', 11.9404, 108.4583, ['Đắk Nông', 'Bình Thuận', 'Phan Thiết', 'Gia Nghĩa']),

  // ---------- Miền Nam ----------
  p('ho-chi-minh', 'TP. Hồ Chí Minh', true, 'Miền Nam', 'south', 'TP. Hồ Chí Minh', 10.7769, 106.7009, ['Sài Gòn', 'Bình Dương', 'Bà Rịa – Vũng Tàu', 'Vũng Tàu', 'Thủ Dầu Một']),
  p('dong-nai', 'Đồng Nai', false, 'Miền Nam', 'south', 'Biên Hòa', 10.9574, 106.8427, ['Bình Phước']),
  p('tay-ninh', 'Tây Ninh', false, 'Miền Nam', 'south', 'Tân An', 10.5360, 106.4130, ['Long An']),
  p('dong-thap', 'Đồng Tháp', false, 'Miền Nam', 'south', 'Mỹ Tho', 10.3600, 106.3600, ['Tiền Giang']),
  p('vinh-long', 'Vĩnh Long', false, 'Miền Nam', 'south', 'Vĩnh Long', 10.2537, 105.9722, ['Bến Tre', 'Trà Vinh']),
  p('can-tho', 'Cần Thơ', true, 'Miền Nam', 'south', 'Cần Thơ', 10.0452, 105.7469, ['Sóc Trăng', 'Hậu Giang']),
  p('an-giang', 'An Giang', false, 'Miền Nam', 'south', 'Rạch Giá', 10.0125, 105.0809, ['Kiên Giang', 'Phú Quốc', 'Long Xuyên']),
  p('ca-mau', 'Cà Mau', false, 'Miền Nam', 'south', 'Cà Mau', 9.1769, 105.1524, ['Bạc Liêu']),
];

export const DEFAULT_PROVINCE_ID = 'ho-chi-minh';
export const REGIONS: readonly Region[] = ['Miền Bắc', 'Miền Trung', 'Tây Nguyên', 'Miền Nam'];

const BY_ID = new Map(PROVINCES.map((pr) => [pr.id, pr]));
export const getProvince = (id: string | null | undefined) => (id ? BY_ID.get(id) : undefined);

/**
 * Tìm tỉnh không cần dấu, theo tên mới hoặc tên cũ. Trả về tỉnh kèm tên cũ khớp (nếu khớp tên cũ)
 * để giao diện hiện "TP. Hồ Chí Minh (Vũng Tàu đã sáp nhập)".
 */
export interface ProvinceMatch {
  province: Province;
  /** Khớp theo tên tỉnh cũ đã sáp nhập */
  matchedFormer?: string;
  /** Khớp theo tên trung tâm hành chính (vd. "Đà Lạt" → Lâm Đồng) */
  matchedCenter?: string;
}

export function searchProvinces(query: string): ProvinceMatch[] {
  const q = normalizeVi(query);
  if (!q) return PROVINCES.map((province) => ({ province }));
  const out: (ProvinceMatch & { rank: number })[] = [];
  for (const province of PROVINCES) {
    const name = normalizeVi(province.name);
    if (name.includes(q)) {
      out.push({ province, rank: name.startsWith(q) ? 0 : 1 });
      continue;
    }
    const former = province.formerNames.find((f) => normalizeVi(f).includes(q));
    if (former) {
      out.push({ province, matchedFormer: former, rank: 2 });
      continue;
    }
    if (province.center !== province.name && normalizeVi(province.center).includes(q)) {
      out.push({ province, matchedCenter: province.center, rank: 2 });
    }
  }
  return out.sort((a, b) => a.rank - b.rank).map(({ rank: _rank, ...m }) => m);
}
