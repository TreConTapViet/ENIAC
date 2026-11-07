import {
  AccentColorKey,
  AuraOutfitRecommendation,
  GarmentCategory,
  OccasionType,
  WeatherContextData,
  WeatherSeason,
} from './types';

export interface StyleOption {
  id: string;
  name: string;
  shortTag: string;
  subtitle: string;
  image: string;
  aliases?: string[];
}

export const FASHION_STYLES: StyleOption[] = [
  {
    id: 'coquette_party',
    name: 'Tiểu thư Cổ điển',
    shortTag: 'Tiểu thư Cổ điển',
    subtitle: 'Quyến rũ, kiêu kỳ với áo corset, đầm nơ ruy băng & chân váy xếp tầng',
    image: '/assets/aistudio/outfit_set_17_grey_bow_black_skirt_67b245d7.png',
    aliases: [
      'Tiểu thư Cổ điển',
      'Dark Coquette (Tiểu thư Cổ điển)',
      'Tiểu thư Dạ tiệc (Little Black Dress)',
      'Dark Coquette',
      'Coquette',
      'Tiểu thư',
      'Party Dress',
    ],
  },
  {
    id: 'y2k_grunge',
    name: 'Cá tính Hiện đại (Y2K)',
    shortTag: 'Cá tính Y2K',
    subtitle: 'Nổi bật với áo lưới xuyên thấu, áo trễ vai & quần jeans đính nơ / bươm bướm',
    image: '/assets/aistudio/outfit_set_10_mesh_top_pink_bow_jeans_dc58c8f8.png',
    aliases: [
      'Cá tính Hiện đại (Y2K)',
      'Cá tính Y2K (Cyber Grunge)',
      'Cá tính Y2K',
      'Y2K',
      'Cyber Grunge',
    ],
  },
  {
    id: 'minimalist',
    name: 'Tối giản Tinh tế',
    shortTag: 'Tối giản',
    subtitle: 'Tinh tế, tôn dáng với áo cổ yếm/cổ lọ dệt kim & gam màu nâu espresso, kem, rêu',
    image: '/assets/aistudio/outfit_set_22_turtleneck_ruffle_skirt_f1c7ebce.png',
    aliases: [
      'Tối giản Tinh tế',
      'Tối giản (Minimalist)',
      'Tối giản',
      'Minimalist',
    ],
  },
  {
    id: 'preppy_korean',
    name: 'Học đường Trẻ trung',
    shortTag: 'Học đường',
    subtitle: 'Trẻ trung với đầm giả vest xếp ly, sơ mi, cardigan navy & chân váy chữ A',
    image: '/assets/aistudio/outfit_dress_25_blazer_pleated_office_1b75a8e6.jpg',
    aliases: [
      'Học đường Trẻ trung',
      'Preppy Goth / Học đường (Korean Chic)',
      'Preppy Học đường (Korean Chic)',
      'Hàn Quốc (Korean Chic)',
      'Preppy Goth',
      'Preppy',
      'Korean Chic',
      'Học đường',
    ],
  },
  {
    id: 'streetwear',
    name: 'Đường phố Năng động',
    shortTag: 'Đường phố',
    subtitle: 'Năng động, phóng khoáng cùng Hoodie Valley, Bomber ngôi sao & quần Baggy',
    image: '/assets/aistudio/outfit_set_01_valley_hoodie_803fab0c.png',
    aliases: [
      'Đường phố Năng động',
      'Đường phố (Streetwear)',
      'Đường phố',
      'Streetwear',
    ],
  },
  {
    id: 'soft_girl',
    name: 'Nữ tính Dịu dàng',
    shortTag: 'Nữ tính',
    subtitle: 'Dịu dàng với đầm ren trắng thắt nơ, áo quây nơ & chân váy bèo tầng',
    image: '/assets/aistudio/outfit_dress_23_coquette_ribbon_3a26beae.jpg',
    aliases: [
      'Nữ tính Dịu dàng',
      'Nữ tính Ngọt ngào (Soft Girl / Balletcore)',
      'Nữ tính',
      'Soft Girl',
      'Balletcore',
    ],
  },
  {
    id: 'smart_casual',
    name: 'Thanh lịch Nhã nhặn',
    shortTag: 'Thanh lịch',
    subtitle: 'Chỉn chu công sở & tiệc tối với đầm lụa midi đỏ rượu vang & quần âu ống suông',
    image: '/assets/aistudio/outfit_dress_24_silk_midi_evening_8dc9f369.jpg',
    aliases: [
      'Thanh lịch Nhã nhặn',
      'Thanh lịch (Smart Casual)',
      'Thanh lịch',
      'Smart Casual',
    ],
  },
  {
    id: 'vintage',
    name: 'Cổ điển Hoài niệm',
    shortTag: 'Cổ điển',
    subtitle: 'Hoài niệm với áo len dệt kim tay loe, họa tiết chấm bi & quần jeans ống loe',
    image: '/assets/aistudio/outfit_set_15_grey_bell_pearl_jeans_845b5138.png',
    aliases: [
      'Cổ điển Hoài niệm',
      'Cổ điển (Vintage / Retro)',
      'Cổ điển',
      'Vintage',
      'Retro',
    ],
  },
  {
    id: 'sporty',
    name: 'Thể thao Khỏe khoắn',
    shortTag: 'Thể thao',
    subtitle: 'Thoáng khí, linh hoạt với hoodie California, croptop & quần nỉ ống rộng',
    image: '/assets/cropped/outfit_sporty_1.jpg?v=3',
    aliases: [
      'Thể thao Khỏe khoắn',
      'Thể thao (Sporty / Athleisure)',
      'Thể thao',
      'Sporty',
      'Athleisure',
    ],
  },
  {
    id: 'boho_resort',
    name: 'Phóng khoáng Du lịch',
    shortTag: 'Phóng khoáng',
    subtitle: 'Bay bổng cho chuyến đi xa với áo cổ yếm lụa & chân váy maxi dài xếp tầng',
    image: '/assets/cropped/outfit_boho_1.jpg?v=3',
    aliases: [
      'Phóng khoáng Du lịch',
      'Du lịch Phóng khoáng (Boho / Maxi)',
      'Phóng khoáng',
      'Du lịch',
      'Boho',
      'Maxi',
    ],
  },
];

/**
 * Helper to get concise editorial style badge in natural Vietnamese (e.g. "Tiểu thư Cổ điển", "Tối giản", "Đường phố")
 */
export function getShortStyleBadge(styleTag: string): string {
  const normalized = (styleTag || '').toLowerCase().trim();
  for (const s of FASHION_STYLES) {
    if (
      s.name.toLowerCase() === normalized ||
      s.shortTag.toLowerCase() === normalized ||
      s.aliases?.some((a) => a.toLowerCase() === normalized || normalized.includes(a.toLowerCase()))
    ) {
      return s.shortTag;
    }
  }
  return styleTag.split('(')[0].trim() || 'Tối giản';
}

/**
 * Helper to check if an outfit or garment styleTag matches any of the user's selected favoriteStyles.
 * Supports cross-matching between Vietnamese names, shortTags, and legacy English aliases.
 */
export function matchesUserSelectedStyles(
  itemStyleTag: string,
  userFavoriteStyles?: string[]
): boolean {
  if (!userFavoriteStyles || userFavoriteStyles.length === 0) return true;
  const normalizedTarget = itemStyleTag.toLowerCase().trim();

  const targetStyleObj = FASHION_STYLES.find(
    (s) =>
      s.name.toLowerCase() === normalizedTarget ||
      s.shortTag.toLowerCase() === normalizedTarget ||
      s.aliases?.some((a) => a.toLowerCase() === normalizedTarget || normalizedTarget.includes(a.toLowerCase()))
  );

  return userFavoriteStyles.some((userStyle) => {
    const u = userStyle.toLowerCase().trim();
    if (u === normalizedTarget || normalizedTarget.includes(u) || u.includes(normalizedTarget)) {
      return true;
    }

    const userStyleObj = FASHION_STYLES.find(
      (s) =>
        s.name.toLowerCase() === u ||
        s.shortTag.toLowerCase() === u ||
        s.aliases?.some((a) => a.toLowerCase() === u || u.includes(a.toLowerCase()))
    );

    if (targetStyleObj && userStyleObj && targetStyleObj.id === userStyleObj.id) {
      return true;
    }

    if (targetStyleObj) {
      if (targetStyleObj.name.toLowerCase() === u || targetStyleObj.shortTag.toLowerCase() === u) return true;
      if (targetStyleObj.aliases?.some((a) => u.includes(a.toLowerCase()) || a.toLowerCase().includes(u))) return true;
    }

    if (userStyleObj) {
      if (userStyleObj.name.toLowerCase() === normalizedTarget || userStyleObj.shortTag.toLowerCase() === normalizedTarget) return true;
      if (userStyleObj.aliases?.some((a) => normalizedTarget.includes(a.toLowerCase()) || a.toLowerCase().includes(normalizedTarget))) return true;
    }

    return false;
  });
}

/**
 * Compute recommended garment size (XS, S, M, L, XL) and detailed fit advice based on height, weight, and 3-ring measurements.
 */
export function calculateRecommendedSize(profile: {
  heightCm?: number;
  weightKg?: number;
  bustCm?: number;
  waistCm?: number;
  hipCm?: number;
  gender?: string;
}): {
  overallSize: string;
  shortSize: string;
  topSize: string;
  bottomSize: string;
  jeansSize: string;
  heightCm: number;
  weightKg: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
  hasCustomMeasurements: boolean;
  fitAdvice: string;
} {
  const isMale = profile.gender === 'Nam';
  const hasCustomMeasurements = Boolean(
    profile.heightCm || profile.weightKg || profile.bustCm || profile.waistCm || profile.hipCm
  );

  const heightCm = profile.heightCm || (isMale ? 172 : 162);
  const weightKg = profile.weightKg || (isMale ? 65 : 50);
  const bustCm = profile.bustCm || (isMale ? 94 : 84);
  const waistCm = profile.waistCm || (isMale ? 76 : 64);
  const hipCm = profile.hipCm || (isMale ? 94 : 90);

  // Determine Top Size from Bust + Weight + Height
  let topSize = 'S';
  if (bustCm <= 80 && weightKg <= 45) topSize = 'XS';
  else if (bustCm <= 86 && weightKg <= 52) topSize = 'S';
  else if (bustCm <= 91 && weightKg <= 59) topSize = 'M';
  else if (bustCm <= 97 && weightKg <= 68) topSize = 'L';
  else topSize = 'XL';

  // Determine Bottom / Skirt Size from Waist + Hip + Weight
  let bottomSize = 'S';
  let jeansSize = '26';
  if (waistCm <= 61 && hipCm <= 86) {
    bottomSize = 'XS';
    jeansSize = '25';
  } else if (waistCm <= 66 && hipCm <= 91) {
    bottomSize = 'S';
    jeansSize = '26';
  } else if (waistCm <= 71 && hipCm <= 96) {
    bottomSize = 'M';
    jeansSize = '27 - 28';
  } else if (waistCm <= 77 && hipCm <= 102) {
    bottomSize = 'L';
    jeansSize = '29 - 30';
  } else {
    bottomSize = 'XL';
    jeansSize = '31+';
  }

  const overallSize =
    topSize === bottomSize ? topSize : `${topSize} (Áo) / ${bottomSize} (Quần·Váy)`;
  const shortSize = topSize;

  const lengthNote =
    heightCm >= 166
      ? 'Chiều cao tôn dáng tốt với cả quần ống suông dài và chân váy maxi.'
      : heightCm <= 156
      ? 'Ưu tiên thiết kế cạp cao (High-waist) hoặc chân váy ngắn trên gối để tạo hiệu ứng kéo dài đôi chân.'
      : 'Tỷ lệ chiều cao cân đối, dễ dàng diện cả thiết kế croptop, corset lẫn đầm chiết eo.';

  const fitAdvice = `Dựa trên chiều cao ${heightCm}cm, cân nặng ${weightKg}kg và số đo 3 vòng ${bustCm}-${waistCm}-${hipCm}cm: Áo/Đầm vừa vặn nhất ở size ${topSize}, Quần/Chân váy chuẩn phom ở size ${bottomSize} (tương đương size quần Jeans ${jeansSize}). ${lengthNote}`;

  return {
    overallSize,
    shortSize,
    topSize,
    bottomSize,
    jeansSize,
    heightCm,
    weightKg,
    bustCm,
    waistCm,
    hipCm,
    hasCustomMeasurements,
    fitAdvice,
  };
}

export interface AccentThemeConfig {
  name: string;
  hex: string;
  hoverHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  softBgClass: string;
  ringClass: string;
}

export const ACCENT_COLORS: Record<AccentColorKey, AccentThemeConfig> = {
  violet: {
    name: 'Tím Neon (Violet)',
    hex: '#7c3aed',
    hoverHex: '#6d28d9',
    bgClass: 'accent-bg',
    textClass: 'accent-text',
    borderClass: 'accent-border',
    softBgClass: 'accent-soft-bg',
    ringClass: 'accent-ring',
  },
  amber: {
    name: 'Hổ phách (Amber)',
    hex: '#b45309',
    hoverHex: '#92400e',
    bgClass: 'accent-bg',
    textClass: 'accent-text',
    borderClass: 'accent-border',
    softBgClass: 'accent-soft-bg',
    ringClass: 'accent-ring',
  },
  rose: {
    name: 'Hồng đất (Rose)',
    hex: '#be123c',
    hoverHex: '#9f1239',
    bgClass: 'accent-bg',
    textClass: 'accent-text',
    borderClass: 'accent-border',
    softBgClass: 'accent-soft-bg',
    ringClass: 'accent-ring',
  },
  emerald: {
    name: 'Lục bảo (Emerald)',
    hex: '#047857',
    hoverHex: '#065f46',
    bgClass: 'accent-bg',
    textClass: 'accent-text',
    borderClass: 'accent-border',
    softBgClass: 'accent-soft-bg',
    ringClass: 'accent-ring',
  },
  indigo: {
    name: 'Chàm (Indigo)',
    hex: '#4338ca',
    hoverHex: '#3730a3',
    bgClass: 'accent-bg',
    textClass: 'accent-text',
    borderClass: 'accent-border',
    softBgClass: 'accent-soft-bg',
    ringClass: 'accent-ring',
  },
  slate: {
    name: 'Xanh Đá (Slate)',
    hex: '#0284c7',
    hoverHex: '#0369a1',
    bgClass: 'accent-bg',
    textClass: 'accent-text',
    borderClass: 'accent-border',
    softBgClass: 'accent-soft-bg',
    ringClass: 'accent-ring',
  },
  custom: {
    name: 'Tùy chỉnh (Custom)',
    hex: '#d97706',
    hoverHex: '#b45309',
    bgClass: 'accent-bg',
    textClass: 'accent-text',
    borderClass: 'accent-border',
    softBgClass: 'accent-soft-bg',
    ringClass: 'accent-ring',
  },
};

export const CUSTOM_COLOR_PRESETS = [
  { label: 'Vàng Champagne', hex: '#C59B27' },
  { label: 'Đỏ Rượu Vang', hex: '#9F1239' },
  { label: 'Hồng Cánh Sen', hex: '#DB2777' },
  { label: 'Tím Lavender', hex: '#8B5CF6' },
  { label: 'Xanh Cổ Vịt', hex: '#0D9488' },
  { label: 'Xanh Rêu Matcha', hex: '#4D7C0F' },
  { label: 'Xanh Dương Hoàng Gia', hex: '#2563EB' },
  { label: 'Nâu Espresso', hex: '#78350F' },
];

export function normalizeHexColor(input?: string, fallback = '#b45309'): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex).slice(1);
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function getAccentConfig(
  accentKey?: AccentColorKey,
  customHex?: string
): AccentThemeConfig {
  const key = accentKey && ACCENT_COLORS[accentKey] ? accentKey : 'amber';
  if (key !== 'custom') {
    return ACCENT_COLORS[key];
  }
  const baseHex = normalizeHexColor(customHex, '#d97706');
  const { r, g, b } = hexToRgb(baseHex);
  const hoverHex = rgbToHex(r * 0.85, g * 0.85, b * 0.85);
  return {
    ...ACCENT_COLORS.custom,
    hex: baseHex,
    hoverHex,
  };
}

export function applyAccentCssVariables(
  accentKey?: AccentColorKey,
  customHex?: string
): void {
  if (typeof document === 'undefined') return;
  const config = getAccentConfig(accentKey, customHex);
  const { r, g, b } = hexToRgb(config.hex);
  const darkTextHex = rgbToHex(r + (255 - r) * 0.35, g + (255 - g) * 0.35, b + (255 - b) * 0.35);

  const rootEl = document.documentElement;
  rootEl.style.setProperty('--accent-primary', config.hex);
  rootEl.style.setProperty('--accent-primary-hover', config.hoverHex);
  rootEl.style.setProperty('--accent-text-dark', darkTextHex);
  rootEl.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
  rootEl.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.38)`);
}

export const GARMENT_CATEGORIES: GarmentCategory[] = [
  'Áo',
  'Quần',
  'Chân váy',
  'Đầm & Váy liền',
  'Áo khoác',
  'Giày dép',
  'Phụ kiện',
];

export const WEATHER_SEASONS: WeatherSeason[] = [
  'Mọi thời tiết',
  'Nắng ấm',
  'Mát mẻ',
  'Se lạnh',
  'Mưa',
];

export const OCCASION_TYPES: OccasionType[] = [
  'Đi làm / Đi học',
  'Dạo phố / Cafe',
  'Tiệc tối / Hẹn hò',
  'Thể thao / Vận động',
  'Du lịch',
];

export const WEATHER_PRESETS: WeatherContextData[] = [
  {
    city: 'TP. Hồ Chí Minh',
    temp: 31,
    condition: 'Nắng ấm dịu nhẹ',
    humidity: 62,
    wind: '11 km/h',
    uvIndex: 'Cao (7)',
    seasonMatch: 'Nắng ấm',
  },
  {
    city: 'Hà Nội',
    temp: 24,
    condition: 'Trời thu mát mẻ',
    humidity: 68,
    wind: '14 km/h',
    uvIndex: 'Trung bình (4)',
    seasonMatch: 'Mát mẻ',
  },
  {
    city: 'Đà Lạt',
    temp: 16,
    condition: 'Se lạnh & sương sớm',
    humidity: 78,
    wind: '9 km/h',
    uvIndex: 'Thấp (2)',
    seasonMatch: 'Se lạnh',
  },
  {
    city: 'Đà Nẵng',
    temp: 25,
    condition: 'Mưa rào nhẹ ven biển',
    humidity: 84,
    wind: '19 km/h',
    uvIndex: 'Thấp (3)',
    seasonMatch: 'Mưa',
  },
];

/**
 * Lấy dữ liệu thời tiết theo thời gian thực (Realtime Weather):
 * Tự động đồng bộ thời tiết, nhiệt độ theo giờ thực tế trong ngày và đặc thù khí hậu từng vùng:
 * - 05:00 - 11:59 (Buổi sáng): Nắng ấm dịu nhẹ (theo thời tiết)
 * - 12:00 - 17:29 (Buổi chiều): Nắng trưa thoáng mát (theo thời tiết)
 * - 17:30 - 21:59 (Buổi tối): Tối trời mát mẻ dễ chịu (theo thời tiết)
 * - 22:00 - 04:59 (Đêm muộn): Đêm se lạnh thanh tĩnh (theo thời tiết)
 */
export function getRealtimeWeatherContext(
  basePreset: WeatherContextData = WEATHER_PRESETS[0],
  customDate: Date = new Date()
): WeatherContextData {
  const hour = customDate.getHours() + customDate.getMinutes() / 60;
  let timeGreeting = '';
  let season: WeatherSeason = 'Mát mẻ';
  let tempDelta = 0;
  const isDalat = basePreset.city === 'Đà Lạt';
  const isDanang = basePreset.city === 'Đà Nẵng';
  const isHanoi = basePreset.city === 'Hà Nội';

  if (hour >= 5 && hour < 12) {
    if (isDalat) {
      timeGreeting = 'Sáng se lạnh & sương sớm (theo thời tiết)';
      season = 'Se lạnh';
      tempDelta = -1;
    } else if (isDanang) {
      timeGreeting = 'Sáng mưa rào nhẹ ven biển (theo thời tiết)';
      season = 'Mưa';
      tempDelta = 0;
    } else if (isHanoi) {
      timeGreeting = 'Nắng sớm dịu nhẹ trời thu (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = 0;
    } else {
      timeGreeting = 'Nắng ấm dịu nhẹ (theo thời tiết)';
      season = 'Nắng ấm';
      tempDelta = 0;
    }
  } else if (hour >= 12 && hour < 17.5) {
    if (isDalat) {
      timeGreeting = 'Trưa dịu mát trong lành (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = 2;
    } else if (isDanang) {
      timeGreeting = 'Trưa râm mát ven biển (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = 2;
    } else if (isHanoi) {
      timeGreeting = 'Nắng trưa dịu mát trời thu (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = 2;
    } else {
      timeGreeting = 'Nắng trưa thoáng mát (theo thời tiết)';
      season = 'Nắng ấm';
      tempDelta = 2;
    }
  } else if (hour >= 17.5 && hour < 22) {
    if (isDalat) {
      timeGreeting = 'Tối sương lạnh phố núi (theo thời tiết)';
      season = 'Se lạnh';
      tempDelta = -2;
    } else if (isDanang) {
      timeGreeting = 'Tối gió biển mát lành (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = -1;
    } else if (isHanoi) {
      timeGreeting = 'Tối se lạnh gió thu (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = -2;
    } else {
      timeGreeting = 'Tối trời mát mẻ dễ chịu (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = -2;
    }
  } else {
    if (isDalat) {
      timeGreeting = 'Đêm lạnh sương buốt nhẹ (theo thời tiết)';
      season = 'Se lạnh';
      tempDelta = -4;
    } else if (isDanang) {
      timeGreeting = 'Đêm mát mẻ thanh tĩnh (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = -3;
    } else if (isHanoi) {
      timeGreeting = 'Đêm se lạnh thanh tĩnh (theo thời tiết)';
      season = 'Se lạnh';
      tempDelta = -3;
    } else {
      timeGreeting = 'Đêm dịu mát thanh tĩnh (theo thời tiết)';
      season = 'Mát mẻ';
      tempDelta = -4;
    }
  }

  const adjustedTemp = Math.max(10, Math.min(38, basePreset.temp + tempDelta));

  return {
    ...basePreset,
    temp: adjustedTemp,
    condition: timeGreeting,
    seasonMatch: season,
  };
}


/**
 * Curated Outfit Lookbook built from clean studio sets, dresses & background-removed garments.
 * Zero watermarks, zero neighboring clothing fragments, dynamically filtered by user's styles.
 */
export const CURATED_OUTFIT_LOOKBOOK: AuraOutfitRecommendation[] = [
  // ================= DARK COQUETTE & TIỂU THƯ DẠ TIỆC =================
  {
    id: 'look_coquette_new_1',
    title: 'Set Áo Xám Viền Bèo Đính Nơ Đen & Chân Váy Tầng Nơ Bản To',
    styleTag: 'Tiểu thư Cổ điển',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Mát mẻ · Dạo phố & Hẹn hò',
    imageUrl: '/assets/aistudio/outfit_set_17_grey_bow_black_skirt_67b245d7.png?v=3',
    topImageUrl: '/assets/cropped/top_black_puff.png?v=3',
    bottomImageUrl: '/assets/aistudio/garment_10_black_bow_skirt_c6108f12.png?v=3',
    topName: 'Áo Kiểu Xám Viền Bèo Nhún Đính Nơ Đen',
    bottomName: 'Chân Váy Đen Xếp Tầng Đính Nơ Bản To',
    topColor: 'Xám',
    bottomColor: 'Đen',
    isDressOrSkirt: true,
    items: [
      'Áo Thun Xám Cổ Vuông Viền Bèo Đính Nơ Đen',
      'Chân Váy Ngắn Xếp Tầng Đen Thắt Nơ Bản To',
      'Giày Mary Jane Đế Dày & Tất Ren Cổ Cao',
    ],
    colorPalette: ['#18181B', '#9CA3AF', '#F4F4F5'],
    auraAdvice:
      'Vạt áo bất đối xứng kết hợp chân váy xếp tầng cạp cao giúp thu gọn vòng eo (64cm) và tôn đôi chân thon dài chuẩn phong cách Dark Coquette.',
  },
  {
    id: 'look_coquette_new_2',
    title: 'Set Áo Quây Nâu Espresso Thắt Nơ & Chân Váy Bèo Tầng Trắng',
    styleTag: 'Tiểu thư Cổ điển',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Nắng ấm · Mát mẻ',
    imageUrl: '/assets/aistudio/outfit_set_13_coquette_bow_skirt_32abe60e.png?v=3',
    topImageUrl: '/assets/aistudio/garment_01_espresso_corset_fca6056c.png?v=3',
    bottomImageUrl: '/assets/cropped/skirt_white_mini.png?v=3',
    topName: 'Áo Quây Nâu Espresso Thắt Nơ Ruy Băng',
    bottomName: 'Chân Váy Ngắn Bèo Tầng Trắng Tinh Khôi',
    topColor: 'Nâu',
    bottomColor: 'Trắng',
    isDressOrSkirt: true,
    items: [
      'Áo Tube Top Nâu Espresso Thắt Nơ Giữa Ngực',
      'Chân Váy Mini Xếp Tầng Trắng Đính Nơ Eo',
      'Túi Kẹp Nách Da Nâu & Giày Búp Bê',
    ],
    colorPalette: ['#451A03', '#FFFFFF', '#F5F5F4'],
    auraAdvice:
      'Tông Nâu Espresso tương phản cùng sắc Trắng kem giúp tôn làn da sáng và làm nổi bật đường cong xương quai xanh.',
  },
  {
    id: 'look_coquette_new_3',
    title: 'Đầm Trắng Kem Phối Ren Corset Tay Bồng Đính Nơ Tiểu Thư',
    styleTag: 'Nữ tính Dịu dàng',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Nắng ấm · Tiệc trà & Hẹn hò',
    imageUrl: '/assets/aistudio/outfit_dress_23_coquette_ribbon_3a26beae.jpg?v=3',
    topImageUrl: '/assets/aistudio/outfit_dress_23_coquette_ribbon_3a26beae.jpg?v=3',
    bottomImageUrl: '/assets/cropped/skirt_white_mini.png?v=3',
    topName: 'Đầm Corset Phối Ren Trắng Kem Tay Bồng',
    bottomName: 'Tùng Váy Xòe Hai Tầng Mềm Mại',
    topColor: 'Trắng kem',
    bottomColor: 'Trắng kem',
    isDressOrSkirt: true,
    items: [
      'Đầm Liền Thân Trắng Kem Ngực Phối Ren Đính Nơ Satin',
      'Khuyên Tai Ngọc Trai Nhỏ',
      'Giày Cao Gót Mũi Nhọn Quai Mảnh Kem Sữa',
    ],
    colorPalette: ['#FEFCE8', '#F5F5F4', '#D6D3D1'],
    auraAdvice:
      'Phần thân trên dựng gọng corset nhẹ ôm vừa vặn vòng 1 và vòng 2, kết hợp tùng váy xòe 2 tầng giúp vóc dáng 162cm - 50kg thanh thoát như nàng thơ.',
  },

  // ================= Y2K & CYBER GRUNGE =================
  {
    id: 'look_y2k_new_1',
    title: 'Set Áo Lưới Tay Loe Xuyên Thấu & Quần Baggy Jeans Đính Nơ Hồng',
    styleTag: 'Cá tính Hiện đại (Y2K)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Mát mẻ · Dạo phố & Chụp hình',
    imageUrl: '/assets/aistudio/outfit_set_10_mesh_top_pink_bow_jeans_dc58c8f8.png?v=3',
    topImageUrl: '/assets/aistudio/garment_05_mesh_bell_top_72b8b96f.png?v=3',
    bottomImageUrl: '/assets/aistudio/garment_08_pink_bow_baggy_d5ea866c.png?v=3',
    topName: 'Áo Lưới Xuyên Thấu Tay Loe Xám Đen',
    bottomName: 'Quần Baggy Jeans Xanh Đính Nơ Ruy Băng Hồng',
    topColor: 'Đen',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: false,
    items: [
      'Áo Lưới Tay Loe Xếp Nếp Bất Đối Xứng',
      'Quần Baggy Jeans Cạp Cao Đính Nơ Hồng Toàn Thân',
      'Giày Sneaker Chunky Đế Cao & Túi Bạc Metallic',
    ],
    colorPalette: ['#27272A', '#93C5FD', '#F9A8D4'],
    auraAdvice:
      'Sự đối lập đầy cuốn hút giữa chất liệu lưới ombre cá tính ở phần thân trên và chi tiết nơ hồng ngọt ngào trên quần jeans ống rộng giúp kéo dài tỷ lệ đôi chân.',
  },
  {
    id: 'look_y2k_new_2',
    title: 'Set Áo Len Dệt Kim Nâu Cổ V & Quần Jeans Đen Họa Tiết Bươm Bướm',
    styleTag: 'Cá tính Hiện đại (Y2K)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Mát mẻ · Se lạnh',
    imageUrl: '/assets/aistudio/outfit_set_12_espresso_knit_butterfly_jeans_8c2804a0.png?v=3',
    topImageUrl: '/assets/aistudio/garment_03_espresso_knit_ce0956dc.png?v=3',
    bottomImageUrl: '/assets/cropped/pant_dress_taupe.png?v=3',
    topName: 'Áo Len Dệt Kim Nâu Mocha Cổ V Tay Bồng',
    bottomName: 'Quần Jeans Đen Ống Rộng In Bươm Bướm',
    topColor: 'Nâu',
    bottomColor: 'Đen',
    isDressOrSkirt: false,
    items: [
      'Áo Len Dệt Kim Dáng Croptop Cổ V Nâu Mocha',
      'Quần Baggy Jeans Đen Wash Họa Tiết Bươm Bướm Trắng',
      'Giày Sneaker Trắng Cổ Thấp',
    ],
    colorPalette: ['#78350F', '#27272A', '#F4F4F5'],
    auraAdvice:
      'Dáng áo len croptop cổ V sâu vừa phải kết hợp quần cạp cao ống suông rộng tạo hiệu ứng lưng ngắn - chân dài cực kỳ tôn dáng.',
  },
  {
    id: 'look_y2k_new_3',
    title: 'Đầm Denim Cổ Yếm Cài Cúc Dáng Chữ A Năng Động',
    styleTag: 'Cá tính Hiện đại (Y2K)',
    occasion: 'Du lịch',
    weatherNote: 'Nắng ấm · Dạo phố & Du lịch',
    imageUrl: '/assets/aistudio/outfit_dress_26_halter_denim_y2k_deb4e06f.jpg?v=3',
    topImageUrl: '/assets/aistudio/outfit_dress_26_halter_denim_y2k_deb4e06f.jpg?v=3',
    bottomImageUrl: '/assets/aistudio/garment_09_pleated_denim_skirt_7fb2b758.png?v=3',
    topName: 'Đầm Denim Cổ Yếm Hàng Cúc Kim Loại',
    bottomName: 'Chân Đầm Denim Chữ A Cạp Liền',
    topColor: 'Xanh Denim',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: true,
    items: [
      'Đầm Ngắn Denim Cổ Yếm Ôm Ngực Dáng Chữ A',
      'Kính Mát Gọng Vuông Y2K',
      'Bốt Cổ Cao Hoặc Giày Sneaker Trắng',
    ],
    colorPalette: ['#1E3A8A', '#60A5FA', '#E2E8F0'],
    auraAdvice:
      'Đường may chiết eo dọc thân đầm denim kết hợp thiết kế cổ yếm khoe trọn bờ vai thon gọn, rất hợp với vóc dáng 162cm, 50kg.',
  },

  // ================= MINIMALIST & SMART CASUAL =================
  {
    id: 'look_min_new_1',
    title: 'Set Áo Cổ Yếm Nâu Espresso & Chân Váy Denim Xếp Ly',
    styleTag: 'Tối giản Tinh tế',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Nắng ấm · Thoáng mát',
    imageUrl: '/assets/aistudio/outfit_set_08_espresso_halter_skirt_5376e11d.png?v=3',
    topImageUrl: '/assets/aistudio/garment_02_espresso_halter_5e7833a6.png?v=3',
    bottomImageUrl: '/assets/aistudio/garment_09_pleated_denim_skirt_7fb2b758.png?v=3',
    topName: 'Áo Cổ Yếm Nâu Espresso Xoắn Ngực Viền Lượn',
    bottomName: 'Chân Váy Ngắn Denim Xanh Đậm Xếp Ly',
    topColor: 'Nâu',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: true,
    items: [
      'Áo Halter Top Nâu Espresso Ôm Dáng',
      'Chân Váy Denim Ngắn Xếp Ly Bản Rộng',
      'Túi Đeo Vai Da Nâu & Giày Loafer',
    ],
    colorPalette: ['#451A03', '#1E3A8A', '#F5F5F4'],
    auraAdvice:
      'Sự kết hợp giữa Nâu Espresso và Xanh Indigo Denim tạo nên tổng thể tối giản nhưng có chiều sâu, cực kỳ tôn vòng eo và bờ vai.',
  },
  {
    id: 'look_min_new_2',
    title: 'Set Áo Len Đắp Chéo Xanh Rêu Phối Ren & Chân Váy Chữ A Denim',
    styleTag: 'Tối giản Tinh tế',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mát mẻ · Trời thu',
    imageUrl: '/assets/aistudio/outfit_set_19_sage_wrap_pleated_skirt_1a2fc5cc.png?v=3',
    topImageUrl: '/assets/cropped/top_star_raglan.png?v=3',
    bottomImageUrl: '/assets/aistudio/garment_09_pleated_denim_skirt_7fb2b758.png?v=3',
    topName: 'Áo Len Đắp Chéo Xanh Rêu Phối Dây Ren',
    bottomName: 'Chân Váy Denim Xếp Ly Chữ A Tối Giản',
    topColor: 'Xanh rêu',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: true,
    items: [
      'Áo Len Trễ Vai Đắp Chéo Xanh Rêu Sage',
      'Chân Váy Ngắn Denim Xếp Ly Gọn Gàng',
      'Giày Bốt Cổ Thấp Da Mềm',
    ],
    colorPalette: ['#4D5D53', '#1E293B', '#E2E8F0'],
    auraAdvice:
      'Thiết kế vạt đắp chéo (wrap top) luôn là vũ khí bí mật giúp thu nhỏ vòng eo và tạo độ cân đối giữa vai và hông.',
  },
  {
    id: 'look_min_new_3',
    title: 'Set Áo Cổ Lọ Sát Nách Nâu Mocha & Chân Váy Denim Đuôi Cá',
    styleTag: 'Tối giản Tinh tế',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Mọi thời tiết',
    imageUrl: '/assets/aistudio/outfit_set_22_turtleneck_ruffle_skirt_f1c7ebce.png?v=3',
    topImageUrl: '/assets/aistudio/garment_02_espresso_halter_5e7833a6.png?v=3',
    bottomImageUrl: '/assets/aistudio/garment_09_pleated_denim_skirt_7fb2b758.png?v=3',
    topName: 'Áo Len Gân Cổ Lọ Sát Nách Nâu Mocha',
    bottomName: 'Chân Váy Ngắn Denim Phối Bèo Đuôi Cá',
    topColor: 'Nâu',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: true,
    items: [
      'Áo Len Gân Sát Nách Cổ Cao Nâu Mocha',
      'Chân Váy Denim Cạp Cao Viền Bèo Nhún',
      'Đồng Hồ Dây Da Mảnh & Túi Xách Nhỏ',
    ],
    colorPalette: ['#5C4033', '#1E3A8A', '#F5F5F4'],
    auraAdvice:
      'Phom áo cổ lọ sát nách giúp phần thân trên trông thanh mảnh và cao ráo, kết hợp chân váy đuôi cá tạo độ mở tự nhiên cho vòng 3.',
  },
  {
    id: 'look_smart_new_1',
    title: 'Đầm Lụa Midi Cổ Đổ Đỏ Rượu Vang Sang Trọng',
    styleTag: 'Thanh lịch Nhã nhặn',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Buổi tối · Tiệc sang trọng',
    imageUrl: '/assets/aistudio/outfit_dress_24_silk_midi_evening_8dc9f369.jpg?v=3',
    topImageUrl: '/assets/aistudio/outfit_dress_24_silk_midi_evening_8dc9f369.jpg?v=3',
    bottomImageUrl: '/assets/aistudio/outfit_dress_24_silk_midi_evening_8dc9f369.jpg?v=3',
    topName: 'Đầm Lụa Satin Cổ Đổ Đỏ Burgundy',
    bottomName: 'Tùng Đầm Midi Lụa Rủ Mềm Tôn Dáng',
    topColor: 'Đỏ',
    bottomColor: 'Đỏ',
    isDressOrSkirt: true,
    items: [
      'Đầm Lụa Satin Dáng Midi Cổ Đổ Đỏ Rượu Vang (Burgundy)',
      'Ví Cầm Tay Ánh Kim (Clutch)',
      'Giày Sandal Cao Gót Quai Mảnh',
    ],
    colorPalette: ['#4C0519', '#881337', '#FDE68A'],
    auraAdvice:
      'Chất liệu lụa satin bóng nhẹ kết hợp đường chiết eo cao và cổ đổ mềm mại giúp tôn trọn đường cong 3 vòng một cách tinh tế, quý phái.',
  },

  // ================= PREPPY GOTH / KOREAN CHIC =================
  {
    id: 'look_preppy_new_1',
    title: 'Đầm Giả Vest Xếp Ly Xanh Navy Viền Trắng Kèm Đai Eo',
    styleTag: 'Học đường Trẻ trung',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mọi thời tiết · Thanh lịch',
    imageUrl: '/assets/aistudio/outfit_dress_25_blazer_pleated_office_1b75a8e6.jpg?v=3',
    topImageUrl: '/assets/aistudio/outfit_dress_25_blazer_pleated_office_1b75a8e6.jpg?v=3',
    bottomImageUrl: '/assets/aistudio/garment_09_pleated_denim_skirt_7fb2b758.png?v=3',
    topName: 'Đầm Blazer Cổ Веst Xanh Navy Viền Trắng',
    bottomName: 'Chân Đầm Xếp Ly Kèm Đai Khóa Vàng',
    topColor: 'Xanh Navy',
    bottomColor: 'Xanh Navy',
    isDressOrSkirt: true,
    items: [
      'Đầm Liền Cổ Vest Ngắn Tay Xanh Navy Viền Trắng Kèm Thắt Lưng',
      'Giày Loafer Da Đen Kèm Tất Cổ Cao',
      'Túi Xách Dáng Hộp Cổ Điển',
    ],
    colorPalette: ['#172554', '#FFFFFF', '#D97706'],
    auraAdvice:
      'Thiết kế cổ vest chỉn chu đi kèm đai thắt lưng khóa vàng ngay eo giúp định hình tỷ lệ vàng 1/3 - 2/3 cho vóc dáng 162cm.',
  },
  {
    id: 'look_preppy_new_2',
    title: 'Set Áo Trễ Vai Xám Phối Dây Đen & Chân Váy Xếp Ly Xanh Đá',
    styleTag: 'Học đường Trẻ trung',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mát mẻ · Dạo phố & Đi học',
    imageUrl: '/assets/aistudio/outfit_set_09_grey_offshoulder_skirt_9dcc467c.png?v=3',
    topImageUrl: '/assets/aistudio/garment_04_grey_offshoulder_4fab34c8.png?v=3',
    bottomImageUrl: '/assets/aistudio/garment_09_pleated_denim_skirt_7fb2b758.png?v=3',
    topName: 'Áo Dài Tay Xám Trễ Vai Layer Cổ Yếm Đen',
    bottomName: 'Chân Váy Xếp Ly Xanh Denim Sáng Màu',
    topColor: 'Xám',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: true,
    items: [
      'Áo Thun Dài Tay Xám Trễ Vai Phối Dây Yếm Đen',
      'Chân Váy Ngắn Xếp Ly Xanh Denim Nhạt',
      'Giày Sneaker Trắng & Tất Cao Cổ',
    ],
    colorPalette: ['#9CA3AF', '#18181B', '#93C5FD'],
    auraAdvice:
      'Áo layer giả hai lớp vừa giữ ấm nhẹ nhàng vừa tạo điểm nhấn cá tính ở phần cổ và vai, phối cùng chân váy xếp ly trẻ trung.',
  },

  // ================= STREETWEAR =================
  {
    id: 'look_street_new_1',
    title: 'Set Áo Khoác Hoodie Zip Đen Valley & Quần Jeans Đen Phối Xích',
    styleTag: 'Đường phố Năng động',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Mát mẻ · Se lạnh',
    imageUrl: '/assets/aistudio/outfit_set_01_valley_hoodie_803fab0c.png?v=3',
    topImageUrl: '/assets/aistudio/garment_11_valley_hoodie_7e4135bb.png?v=3',
    bottomImageUrl: '/assets/cropped/pant_highwaist_black.png?v=3',
    topName: 'Áo Khoác Hoodie Zip Đen Valley Layer Thun Trắng',
    bottomName: 'Quần Jeans Đen Ống Suông Rộng Kèm Xích Bạc',
    topColor: 'Đen',
    bottomColor: 'Đen',
    isDressOrSkirt: false,
    items: [
      'Áo Khoác Hoodie Zip Đen Valley',
      'Áo Thun Trắng Layer Bên Trong',
      'Quần Jeans Đen Ống Rộng Kèm Dây Xích Hông',
      'Giày Sneaker Canvas Đen Trắng',
    ],
    colorPalette: ['#18181B', '#FFFFFF', '#71717A'],
    auraAdvice:
      'Mẹo để mặc đồ Streetwear phom rộng không bị dìm chiều cao là để lộ viền áo thun trắng 2-3cm ở gấu áo và chọn quần cạp cao suông thẳng xuống giày.',
  },
  {
    id: 'look_street_new_2',
    title: 'Set Áo Khoác Bomber Ngôi Sao & Quần Baggy Đen Kèm Giày Star',
    styleTag: 'Đường phố Năng động',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mát mẻ · Năng động',
    imageUrl: '/assets/aistudio/outfit_set_03_star_bomber_7bbf5231.png?v=3',
    topImageUrl: '/assets/aistudio/garment_11_valley_hoodie_7e4135bb.png?v=3',
    bottomImageUrl: '/assets/cropped/pant_barrel_black.png?v=3',
    topName: 'Áo Khoác Bomber Đen Khoác Ngoài Áo Thun In Sao',
    bottomName: 'Quần Baggy Đen Ống Rộng Thoải Mái',
    topColor: 'Đen',
    bottomColor: 'Đen',
    isDressOrSkirt: false,
    items: [
      'Áo Khoác Bomber Đen Dáng Ngắn Vừa',
      'Áo Thun Trắng In Ngôi Sao Bạc',
      'Quần Baggy Đen Ống Suông Rộng',
      'Giày Sneaker Đế Bánh Mì Đen Trắng',
    ],
    colorPalette: ['#09090B', '#FAFAFA', '#52525B'],
    auraAdvice:
      'Sự đồng điệu giữa họa tiết ngôi sao trên áo thun và trên giày sneaker tạo nên bản phối Streetwear cực kỳ có gu.',
  },
  {
    id: 'look_street_new_3',
    title: 'Set Áo Sweater Wash Xám Khói & Quần Jeans Đen Ống Rộng',
    styleTag: 'Đường phố Năng động',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Se lạnh · Mát mẻ',
    imageUrl: '/assets/aistudio/outfit_set_02_washed_sweater_9ada2a98.png?v=3',
    topImageUrl: '/assets/aistudio/garment_06_california_hoodie_b08928ac.png?v=3',
    bottomImageUrl: '/assets/cropped/pant_highwaist_black.png?v=3',
    topName: 'Áo Sweater Nỉ Wash Xám Khói Vintage',
    bottomName: 'Quần Jeans Đen Wash Bụi Ống Suông',
    topColor: 'Xám',
    bottomColor: 'Đen',
    isDressOrSkirt: false,
    items: [
      'Áo Sweater Dài Tay Wash Xám Than',
      'Quần Jeans Đen Wash Xám Ống Suông Rộng',
      'Giày Thể Thao Chunky Đen Toàn Tập',
    ],
    colorPalette: ['#3F3F46', '#18181B', '#71717A'],
    auraAdvice:
      'Phối màu Monochrome Xám khói - Đen than tạo hiệu ứng liền mạch theo chiều dọc, giúp vóc dáng trông cao và gọn hơn.',
  },
  {
    id: 'look_street_new_4',
    title: 'Set Sơ Mi Khoác Kaki Xám Rêu & Quần Ống Rộng Đen',
    styleTag: 'Đường phố Năng động',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mọi thời tiết · Chống nắng nhẹ',
    imageUrl: '/assets/aistudio/outfit_set_05_khaki_overshirt_612a1982.png?v=3',
    topImageUrl: '/assets/aistudio/garment_12_flannel_shirt_1c1d05e0.png?v=3',
    bottomImageUrl: '/assets/cropped/pant_barrel_black.png?v=3',
    topName: 'Áo Sơ Mi Khoác Ngoài Kaki Xám Rêu & Thun Trắng',
    bottomName: 'Quần Ống Suông Rộng Đen Tối Giản',
    topColor: 'Xanh rêu',
    bottomColor: 'Đen',
    isDressOrSkirt: false,
    items: [
      'Áo Khoác Sơ Mi (Overshirt) Kaki Nâu Rêu',
      'Áo Thun Trắng Cổ Tròn Cơ Bản',
      'Quần Ống Rộng Đen Dáng Suông',
      'Giày Sneaker Trắng Kem',
    ],
    colorPalette: ['#78716C', '#FFFFFF', '#18181B'],
    auraAdvice:
      'Set đồ Smart-Streetwear thanh lịch, vừa đủ lịch sự để đi học, đi làm vừa thoải mái khi đi cafe cùng bạn bè.',
  },

  // ================= VINTAGE, SPORTY & BOHO =================
  {
    id: 'look_vintage_new_1',
    title: 'Set Áo Len Gân Xám Tay Loe Cổ Yếm & Quần Jeans Ống Loe Đính Nơ',
    styleTag: 'Cổ điển Hoài niệm',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Mát mẻ · Dạo phố',
    imageUrl: '/assets/aistudio/outfit_set_15_grey_bell_pearl_jeans_845b5138.png?v=3',
    topImageUrl: '/assets/aistudio/garment_04_grey_offshoulder_4fab34c8.png?v=3',
    bottomImageUrl: '/assets/aistudio/garment_07_flared_bow_jeans_3e67863f.png?v=3',
    topName: 'Áo Len Gân Xám Sáng Tay Loe Phối Dây Đen',
    bottomName: 'Quần Jeans Ống Loe Xanh Sáng Đính Nơ Trắng',
    topColor: 'Xám',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: false,
    items: [
      'Áo Dệt Kim Gân Xám Sáng Tay Loe Dáng Croptop',
      'Quần Jeans Ống Loe Xanh Nhạt Đính Nơ & Ngọc Trai',
      'Giày Đế Xuồng Hoặc Boots Mũi Vuông',
    ],
    colorPalette: ['#D1D5DB', '#93C5FD', '#18181B'],
    auraAdvice:
      'Quần jeans ống loe ôm phần đùi và xòe nhẹ từ đầu gối xuống giúp tạo hiệu ứng đôi chân dài thêm 5cm cho vóc dáng 162cm.',
  },
  {
    id: 'look_sporty_1',
    title: 'Set Áo Hoodie Nỉ California & Quần Nỉ Xám Ống Rộng',
    styleTag: 'Thể thao Khỏe khoắn',
    occasion: 'Thể thao / Vận động',
    weatherNote: 'Mát mẻ · Năng động',
    imageUrl: '/assets/cropped/outfit_sporty_1.jpg?v=3',
    topImageUrl: '/assets/aistudio/garment_06_california_hoodie_b08928ac.png?v=3',
    bottomImageUrl: '/assets/cropped/pant_sweat_grey.png?v=3',
    topName: 'Áo Hoodie Nỉ Xám Than California Phom Rộng',
    bottomName: 'Quần Jogger Nỉ Xám Ống Rộng Dây Rút',
    topColor: 'Xám than',
    bottomColor: 'Xám',
    isDressOrSkirt: false,
    items: [
      'Áo Hoodie Nỉ Xám Than California',
      'Quần Sweatpants Nỉ Xám Phom Rộng Thoải Mái',
      'Giày Thể Thao Chạy Bộ Siêu Nhẹ',
    ],
    colorPalette: ['#18181B', '#9CA3AF', '#F3F4F6'],
    auraAdvice:
      'Sự kết hợp giữa Hoodie phom rộng và quần nỉ ống suông cạp cao mang lại vẻ ngoài Athleisure khỏe khoắn, thoải mái tối đa khi di chuyển.',
  },
  {
    id: 'look_boho_1',
    title: 'Set Áo Cổ Yếm Nâu Espresso & Chân Váy Maxi Tầng Trắng',
    styleTag: 'Phóng khoáng Du lịch',
    occasion: 'Du lịch',
    weatherNote: 'Nắng ấm · Dạo biển',
    imageUrl: '/assets/cropped/outfit_boho_1.jpg?v=3',
    topImageUrl: '/assets/aistudio/garment_02_espresso_halter_5e7833a6.png?v=3',
    bottomImageUrl: '/assets/cropped/skirt_white_maxi.png?v=3',
    topName: 'Áo Cổ Yếm Nâu Espresso Xoắn Ngực',
    bottomName: 'Chân Váy Maxi Dài Xếp Tầng Trắng Tinh Khôi',
    topColor: 'Nâu Espresso',
    bottomColor: 'Trắng',
    isDressOrSkirt: true,
    items: [
      'Áo Cổ Yếm Nâu Espresso Tôn Vai Thon',
      'Chân Váy Maxi Trắng Dáng Dài Bay Bổng',
      'Sandal Đế Cói & Mũ Rộng Vành',
    ],
    colorPalette: ['#451A03', '#FFFFFF', '#E2E8F0'],
    auraAdvice:
      'Áo cổ yếm ôm gọn thân trên kết hợp chân váy maxi trắng xếp tầng dài chấm gót giúp tôn chiều cao và cực kỳ ăn ảnh khi đi du lịch.',
  },
];

/**
 * Starter Wardrobe Templates organized cleanly by Category:
 * 'Áo', 'Quần', 'Chân váy', 'Đầm & Váy liền', 'Áo khoác', 'Giày dép', 'Phụ kiện'
 * Isolated studio garments with clean backgrounds and zero text clutter.
 */
export const STARTER_WARDROBE_TEMPLATES = [
  // ================= DANH MỤC: ÁO (TOPS) =================
  {
    name: 'Áo Corset Nâu Espresso Tay Bồng Cổ Vuông',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Tiểu thư Cổ điển',
    color: 'Nâu Espresso',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: '/assets/aistudio/garment_01_espresso_corset_fca6056c.png?v=3',
    favorite: true,
  },
  {
    name: 'Áo Cổ Yếm Nâu Espresso Xoắn Ngực',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Tối giản Tinh tế',
    color: 'Nâu Espresso',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/aistudio/garment_02_espresso_halter_5e7833a6.png?v=3',
    favorite: true,
  },
  {
    name: 'Áo Len Dệt Kim Nâu Mocha Cổ V Tay Bồng',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Tối giản Tinh tế',
    color: 'Nâu Mocha',
    season: 'Se lạnh' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/aistudio/garment_03_espresso_knit_ce0956dc.png?v=3',
    favorite: true,
  },
  {
    name: 'Áo Thun Xám Trễ Vai Phối Dây Yếm Đen',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Học đường Trẻ trung',
    color: 'Xám & Đen',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/aistudio/garment_04_grey_offshoulder_4fab34c8.png?v=3',
    favorite: true,
  },
  {
    name: 'Áo Lưới Xuyên Thấu Tay Loe Xám Đen',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Cá tính Hiện đại (Y2K)',
    color: 'Xám Đen Ombre',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/aistudio/garment_05_mesh_bell_top_72b8b96f.png?v=3',
    favorite: true,
  },
  {
    name: 'Áo Kiểu Xám Viền Bèo Nhún Đính Nơ Đen',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Tiểu thư Cổ điển',
    color: 'Xám phối Đen',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: '/assets/cropped/top_black_puff.png?v=3',
    favorite: false,
  },
  {
    name: 'Áo Len Đắp Chéo Xanh Rêu Phối Dây Ren',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Tối giản Tinh tế',
    color: 'Xanh rêu Sage',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/cropped/top_star_raglan.png?v=3',
    favorite: false,
  },

  // ================= DANH MỤC: QUẦN (PANTS & JEANS) =================
  {
    name: 'Quần Jeans Ống Loe Xanh Nhạt Đính Nơ Gối',
    category: 'Quần' as GarmentCategory,
    styleTag: 'Cổ điển Hoài niệm',
    color: 'Xanh Denim nhạt',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/aistudio/garment_07_flared_bow_jeans_3e67863f.png?v=3',
    favorite: true,
  },
  {
    name: 'Quần Baggy Jeans Xanh Đính Nơ Ruy Băng Hồng',
    category: 'Quần' as GarmentCategory,
    styleTag: 'Cá tính Hiện đại (Y2K)',
    color: 'Xanh phối Nơ Hồng',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/aistudio/garment_08_pink_bow_baggy_d5ea866c.png?v=3',
    favorite: true,
  },
  {
    name: 'Quần Cargo Túi Hộp Ống Rộng Màu Kem',
    category: 'Quần' as GarmentCategory,
    styleTag: 'Đường phố Năng động',
    color: 'Beige kem',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/pant_cargo_beige.png?v=3',
    favorite: true,
  },
  {
    name: 'Quần Jeans Đen Wash Họa Tiết Bươm Bướm',
    category: 'Quần' as GarmentCategory,
    styleTag: 'Cá tính Hiện đại (Y2K)',
    color: 'Đen Wash',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/pant_dress_taupe.png?v=3',
    favorite: true,
  },
  {
    name: 'Quần Jeans Đen Cạp Cao Ống Rộng',
    category: 'Quần' as GarmentCategory,
    styleTag: 'Thanh lịch Nhã nhặn',
    color: 'Đen than',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/cropped/pant_highwaist_black.png?v=3',
    favorite: false,
  },

  // ================= DANH MỤC: CHÂN VÁY (SKIRTS) =================
  {
    name: 'Chân Váy Ngắn Denim Xếp Ly Xanh Đậm',
    category: 'Chân váy' as GarmentCategory,
    styleTag: 'Học đường Trẻ trung',
    color: 'Xanh Indigo Denim',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/aistudio/garment_09_pleated_denim_skirt_7fb2b758.png?v=3',
    favorite: true,
  },
  {
    name: 'Chân Váy Đen Xếp Tầng Thắt Nơ Bản To',
    category: 'Chân váy' as GarmentCategory,
    styleTag: 'Tiểu thư Cổ điển',
    color: 'Đen',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: '/assets/aistudio/garment_10_black_bow_skirt_c6108f12.png?v=3',
    favorite: true,
  },
  {
    name: 'Chân Váy Ngắn Bèo Tầng Trắng Đính Nơ Eo',
    category: 'Chân váy' as GarmentCategory,
    styleTag: 'Tiểu thư Cổ điển',
    color: 'Trắng tinh khôi',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: '/assets/cropped/skirt_white_mini.png?v=3',
    favorite: true,
  },
  {
    name: 'Chân Váy Maxi Tầng Trắng Dáng Dài',
    category: 'Chân váy' as GarmentCategory,
    styleTag: 'Phóng khoáng Du lịch',
    color: 'Trắng kem',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Du lịch' as OccasionType,
    imageUrl: '/assets/cropped/skirt_white_maxi.png?v=3',
    favorite: false,
  },

  // ================= DANH MỤC: ĐẦM & VÁY LIỀN (DRESSES) =================
  {
    name: 'Đầm Trắng Kem Phối Ren Corset Tay Bồng Đính Nơ',
    category: 'Đầm & Váy liền' as GarmentCategory,
    styleTag: 'Nữ tính Dịu dàng',
    color: 'Trắng kem',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: '/assets/aistudio/outfit_dress_23_coquette_ribbon_3a26beae.jpg?v=3',
    favorite: true,
  },
  {
    name: 'Đầm Lụa Midi Cổ Đổ Đỏ Rượu Vang (Burgundy)',
    category: 'Đầm & Váy liền' as GarmentCategory,
    styleTag: 'Thanh lịch Nhã nhặn',
    color: 'Đỏ Burgundy',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: '/assets/aistudio/outfit_dress_24_silk_midi_evening_8dc9f369.jpg?v=3',
    favorite: true,
  },
  {
    name: 'Đầm Giả Vest Xếp Ly Xanh Navy Viền Trắng',
    category: 'Đầm & Váy liền' as GarmentCategory,
    styleTag: 'Học đường Trẻ trung',
    color: 'Xanh Navy',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/aistudio/outfit_dress_25_blazer_pleated_office_1b75a8e6.jpg?v=3',
    favorite: true,
  },
  {
    name: 'Đầm Denim Cổ Yếm Cài Cúc Dáng Chữ A Y2K',
    category: 'Đầm & Váy liền' as GarmentCategory,
    styleTag: 'Cá tính Hiện đại (Y2K)',
    color: 'Xanh Denim',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/aistudio/outfit_dress_26_halter_denim_y2k_deb4e06f.jpg?v=3',
    favorite: true,
  },

  // ================= DANH MỤC: ÁO KHOÁC (OUTERWEAR) =================
  {
    name: 'Áo Hoodie Nỉ Xám Than California Phom Rộng',
    category: 'Áo khoác' as GarmentCategory,
    styleTag: 'Thể thao Khỏe khoắn',
    color: 'Xám than',
    season: 'Se lạnh' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/aistudio/garment_06_california_hoodie_b08928ac.png?v=3',
    favorite: true,
  },
  {
    name: 'Áo Khoác Hoodie Zip Đen Valley',
    category: 'Áo khoác' as GarmentCategory,
    styleTag: 'Đường phố Năng động',
    color: 'Đen',
    season: 'Se lạnh' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/aistudio/garment_11_valley_hoodie_7e4135bb.png?v=3',
    favorite: true,
  },
  {
    name: 'Áo Khoác Sơ Mi Flannel Kẻ Caro Đen Xám',
    category: 'Áo khoác' as GarmentCategory,
    styleTag: 'Đường phố Năng động',
    color: 'Đen kẻ xám',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/aistudio/garment_12_flannel_shirt_1c1d05e0.png?v=3',
    favorite: true,
  },
];

// Default Male & Female Editorial Fashion Avatars (Crisp SVG Data URLs)
export const DEFAULT_AVATARS = {
  female: `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id="bgF" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FDF2F8"/>
          <stop offset="100%" stop-color="#F3E8FF"/>
        </linearGradient>
        <linearGradient id="hairF" x1="40" y1="20" x2="120" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#3B2314"/>
          <stop offset="100%" stop-color="#1C1008"/>
        </linearGradient>
        <linearGradient id="coatF" x1="30" y1="105" x2="130" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#BE185D"/>
          <stop offset="100%" stop-color="#831843"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#bgF)"/>
      <path d="M40 72C40 40 58 24 80 24C102 24 120 40 120 72C120 98 128 122 122 142H38C32 122 40 98 40 72Z" fill="url(#hairF)"/>
      <path d="M26 160C28 126 50 112 80 112C110 112 132 126 134 160H26Z" fill="url(#coatF)"/>
      <path d="M64 112L80 144L96 112H64Z" fill="#FFFBEB"/>
      <rect x="69" y="92" width="22" height="26" rx="10" fill="#FDE6D8"/>
      <path d="M67 114Q80 124 93 114" stroke="#FEF08A" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 5"/>
      <ellipse cx="80" cy="68" rx="26" ry="31" fill="#FDE6D8"/>
      <circle cx="65" cy="74" r="5" fill="#F43F5E" fill-opacity="0.22"/>
      <circle cx="95" cy="74" r="5" fill="#F43F5E" fill-opacity="0.22"/>
      <path d="M63 60Q68 56 73 60" stroke="#3B2314" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M87 60Q92 56 97 60" stroke="#3B2314" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="68" cy="65" r="2.6" fill="#291810"/>
      <circle cx="92" cy="65" r="2.6" fill="#291810"/>
      <path d="M74 82Q80 87 86 82" stroke="#BE123C" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M52 60C54 40 72 32 94 36C104 38 110 48 108 62C101 50 90 44 78 46C65 48 57 54 52 60Z" fill="url(#hairF)"/>
    </svg>`
  )}`,
  male: `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id="bgM" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#EFF6FF"/>
          <stop offset="100%" stop-color="#E0E7FF"/>
        </linearGradient>
        <linearGradient id="hairM" x1="45" y1="20" x2="115" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#27272A"/>
          <stop offset="100%" stop-color="#09090B"/>
        </linearGradient>
        <linearGradient id="suitM" x1="25" y1="110" x2="135" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#1E293B"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#bgM)"/>
      <path d="M22 160C25 124 48 110 80 110C112 110 135 124 138 160H22Z" fill="url(#suitM)"/>
      <path d="M63 110L80 148L97 110H63Z" fill="#F8FAFC"/>
      <path d="M77 116H83L85 144L80 150L75 144L77 116Z" fill="#B45309"/>
      <path d="M55 112L74 146L64 110H55Z" fill="#334155"/>
      <path d="M105 112L86 146L96 110H105Z" fill="#334155"/>
      <rect x="68" y="90" width="24" height="24" rx="10" fill="#F5D0BA"/>
      <circle cx="52" cy="68" r="6" fill="#F5D0BA"/>
      <circle cx="108" cy="68" r="6" fill="#F5D0BA"/>
      <rect x="53" y="36" width="54" height="62" rx="26" fill="#F5D0BA"/>
      <path d="M62 58H73" stroke="#18181B" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M87 58H98" stroke="#18181B" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="68" cy="65" r="2.6" fill="#18181B"/>
      <circle cx="92" cy="65" r="2.6" fill="#18181B"/>
      <path d="M73 82Q80 87 87 82" stroke="#7C2D12" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M50 60C48 36 62 24 82 24C102 24 112 36 110 60C106 47 96 41 80 41C64 41 54 47 50 60Z" fill="url(#hairM)"/>
    </svg>`
  )}`,
};

export function resolveUserAvatar(gender?: string, customAvatarUrl?: string): string {
  if (customAvatarUrl && customAvatarUrl.trim().length > 0) {
    return customAvatarUrl.trim();
  }
  return gender === 'Nam' ? DEFAULT_AVATARS.male : DEFAULT_AVATARS.female;
}
