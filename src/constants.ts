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
  subtitle: string;
  image: string;
  aliases?: string[];
}

export const FASHION_STYLES: StyleOption[] = [
  {
    id: 'preppy_korean',
    name: 'Preppy Học đường (Korean Chic)',
    subtitle: 'Trẻ trung với sơ mi, cardigan navy & chân váy xếp ly',
    image: '/assets/cropped/set_preppy_2.jpg',
    aliases: ['Hàn Quốc (Korean Chic)', 'Preppy', 'Korean Chic'],
  },
  {
    id: 'coquette_party',
    name: 'Tiểu thư Dạ tiệc (Little Black Dress)',
    subtitle: 'Quyến rũ, kiêu kỳ với đầm đen tay bồng & chiết eo',
    image: '/assets/cropped/style_coquette_dresses.jpg',
    aliases: ['Tiểu thư', 'Coquette', 'Party Dress'],
  },
  {
    id: 'y2k_grunge',
    name: 'Cá tính Y2K (Cyber Grunge)',
    subtitle: 'Nổi bật với áo baby tee, raglan ngôi sao & chân váy/jeans cạp trễ',
    image: '/assets/cropped/outfit_y2k_1.jpg',
    aliases: ['Y2K', 'Cyber Grunge'],
  },
  {
    id: 'streetwear',
    name: 'Đường phố (Streetwear)',
    subtitle: 'Năng động, phóng khoáng cùng quần Cargo túi hộp & Baggy Jeans',
    image: '/assets/cropped/outfit_streetwear_1.jpg',
    aliases: ['Đường phố (Streetwear)', 'Streetwear'],
  },
  {
    id: 'smart_casual',
    name: 'Thanh lịch (Smart Casual)',
    subtitle: 'Chỉn chu công sở với áo kiểu chiết eo & quần âu ống suông',
    image: '/assets/cropped/outfit_smart_1.jpg',
    aliases: ['Thanh lịch (Smart Casual)', 'Smart Casual'],
  },
  {
    id: 'soft_girl',
    name: 'Nữ tính Ngọt ngào (Soft Girl / Balletcore)',
    subtitle: 'Dịu dàng với áo thắt nơ ren & chân váy bèo tầng pastel',
    image: '/assets/cropped/outfit_softgirl_1.jpg',
    aliases: ['Soft Girl', 'Balletcore', 'Nữ tính'],
  },
  {
    id: 'minimalist',
    name: 'Tối giản (Minimalist)',
    subtitle: 'Tinh tế, phom dáng gọn gàng & gam màu kem, nâu, đen trung tính',
    image: '/assets/cropped/outfit_minimalist_1.jpg',
    aliases: ['Tối giản (Minimalist)', 'Minimalist'],
  },
  {
    id: 'vintage',
    name: 'Cổ điển (Vintage / Retro)',
    subtitle: 'Hoài niệm với họa tiết chấm bi, áo ringer & quần jeans ống loe',
    image: '/assets/cropped/outfit_vintage_1.jpg',
    aliases: ['Cổ điển (Vintage / Retro)', 'Vintage', 'Retro'],
  },
  {
    id: 'sporty',
    name: 'Thể thao (Sporty / Athleisure)',
    subtitle: 'Thoáng khí, linh hoạt với croptop & quần nỉ ống rộng / quần short',
    image: '/assets/cropped/outfit_sporty_1.jpg',
    aliases: ['Thể thao (Sporty / Athleisure)', 'Sporty'],
  },
  {
    id: 'boho_resort',
    name: 'Du lịch Phóng khoáng (Boho / Maxi)',
    subtitle: 'Bay bổng cho chuyến đi xa với áo cổ yếm/trễ vai & chân váy maxi dài',
    image: '/assets/cropped/outfit_boho_1.jpg',
    aliases: ['Du lịch', 'Boho', 'Maxi'],
  },
];

/**
 * Helper to check if an outfit or garment styleTag matches any of the user's selected favoriteStyles.
 */
export function matchesUserSelectedStyles(
  itemStyleTag: string,
  userFavoriteStyles?: string[]
): boolean {
  if (!userFavoriteStyles || userFavoriteStyles.length === 0) return true;
  const normalizedTarget = itemStyleTag.toLowerCase().trim();

  return userFavoriteStyles.some((userStyle) => {
    const u = userStyle.toLowerCase().trim();
    if (u === normalizedTarget || normalizedTarget.includes(u) || u.includes(normalizedTarget)) {
      return true;
    }
    // Check style aliases (e.g., 'Hàn Quốc (Korean Chic)' matches 'Preppy Học đường (Korean Chic)')
    const styleObj = FASHION_STYLES.find(
      (s) =>
        s.name.toLowerCase() === normalizedTarget ||
        s.aliases?.some((a) => a.toLowerCase() === normalizedTarget)
    );
    if (styleObj) {
      if (styleObj.name.toLowerCase() === u) return true;
      if (styleObj.aliases?.some((a) => u.includes(a.toLowerCase()) || a.toLowerCase().includes(u))) {
        return true;
      }
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
  let topSize = 'M';
  if (bustCm <= 80 && weightKg <= 45) topSize = 'XS';
  else if (bustCm <= 85 && weightKg <= 52) topSize = 'S';
  else if (bustCm <= 91 && weightKg <= 59) topSize = 'M';
  else if (bustCm <= 97 && weightKg <= 68) topSize = 'L';
  else topSize = 'XL';

  // Determine Bottom / Skirt Size from Waist + Hip + Weight
  let bottomSize = 'M';
  let jeansSize = '27';
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

  const overallSize = topSize === bottomSize ? topSize : `${topSize} (Áo) / ${bottomSize} (Quần·Váy)`;

  const lengthNote =
    heightCm >= 166
      ? 'Chiều cao tôn dáng tốt với cả quần ống suông dài và chân váy maxi.'
      : heightCm <= 156
      ? 'Ưu tiên thiết kế cạp cao (High-waist) hoặc chân váy ngắn trên gối để tạo hiệu ứng kéo dài đôi chân.'
      : 'Tỷ lệ chiều cao cân đối, dễ dàng diện cả thiết kế croptop lẫn đầm chiết eo.';

  const fitAdvice = `Dựa trên chiều cao ${heightCm}cm, cân nặng ${weightKg}kg và số đo 3 vòng ${bustCm}-${waistCm}-${hipCm}cm: Áo/Đầm vừa vặn nhất ở size ${topSize}, Quần/Chân váy chuẩn phom ở size ${bottomSize} (tương đương size quần Jeans ${jeansSize}). ${lengthNote}`;

  return {
    overallSize,
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

export const ACCENT_COLORS: Record<
  AccentColorKey,
  {
    name: string;
    hex: string;
    hoverHex: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    softBgClass: string;
    ringClass: string;
  }
> = {
  amber: {
    name: 'Hổ phách (Amber)',
    hex: '#b45309',
    hoverHex: '#92400e',
    bgClass: 'bg-amber-700 hover:bg-amber-800',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-700 dark:border-amber-500',
    softBgClass: 'bg-amber-50/80 dark:bg-amber-950/40',
    ringClass: 'focus:ring-amber-600',
  },
  rose: {
    name: 'Hồng đất (Rose)',
    hex: '#be123c',
    hoverHex: '#9f1239',
    bgClass: 'bg-rose-700 hover:bg-rose-800',
    textClass: 'text-rose-700 dark:text-rose-400',
    borderClass: 'border-rose-700 dark:border-rose-500',
    softBgClass: 'bg-rose-50/80 dark:bg-rose-950/40',
    ringClass: 'focus:ring-rose-600',
  },
  emerald: {
    name: 'Ngọc lục bảo (Emerald)',
    hex: '#047857',
    hoverHex: '#065f46',
    bgClass: 'bg-emerald-700 hover:bg-emerald-800',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-700 dark:border-emerald-500',
    softBgClass: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    ringClass: 'focus:ring-emerald-600',
  },
  indigo: {
    name: 'Chàm (Indigo)',
    hex: '#4338ca',
    hoverHex: '#3730a3',
    bgClass: 'bg-indigo-700 hover:bg-indigo-800',
    textClass: 'text-indigo-700 dark:text-indigo-400',
    borderClass: 'border-indigo-700 dark:border-indigo-500',
    softBgClass: 'bg-indigo-50/80 dark:bg-indigo-950/40',
    ringClass: 'focus:ring-indigo-600',
  },
  violet: {
    name: 'Tím Oải Hương (Violet)',
    hex: '#6d28d9',
    hoverHex: '#5b21b6',
    bgClass: 'bg-violet-700 hover:bg-violet-800',
    textClass: 'text-violet-700 dark:text-violet-400',
    borderClass: 'border-violet-700 dark:border-violet-500',
    softBgClass: 'bg-violet-50/80 dark:bg-violet-950/40',
    ringClass: 'focus:ring-violet-600',
  },
  slate: {
    name: 'Xanh Đá (Slate Blue)',
    hex: '#0284c7',
    hoverHex: '#0369a1',
    bgClass: 'bg-sky-600 hover:bg-sky-700',
    textClass: 'text-sky-600 dark:text-sky-400',
    borderClass: 'border-sky-600 dark:border-sky-400',
    softBgClass: 'bg-sky-50 dark:bg-sky-950/45',
    ringClass: 'focus:ring-sky-600',
  },
};

export const GARMENT_CATEGORIES: GarmentCategory[] = [
  'Áo',
  'Quần & Chân váy',
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
    temp: 22,
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
 * Curated Outfit Lookbook built from the cropped & paired garment images.
 * Filtered dynamically by the user's selected fashion styles!
 */
export const CURATED_OUTFIT_LOOKBOOK: AuraOutfitRecommendation[] = [
  // 1. Preppy Học đường (Korean Chic)
  {
    id: 'look_preppy_1',
    title: 'Set Sơ Mi Kẻ Caro Navy Thắt Nơ & Chân Váy Xếp Ly',
    styleTag: 'Preppy Học đường (Korean Chic)',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mát mẻ · Dịu nhẹ',
    imageUrl: '/assets/cropped/set_preppy_2.jpg',
    topImageUrl: '/assets/cropped/set_preppy_2.jpg',
    bottomImageUrl: '/assets/cropped/skirt_plaid_pleated.jpg',
    topName: 'Áo Sơ Mi Kẻ Caro Navy Cổ Thủy Thủ',
    bottomName: 'Chân Váy Xếp Ly Cạp Cao Kèm Thắt Lưng',
    topColor: 'Xanh Navy',
    bottomColor: 'Xanh Navy',
    isDressOrSkirt: true,
    items: [
      'Áo Sơ Mi Kẻ Caro Navy Cổ Thủy Thủ',
      'Khăn Choàng Thắt Nơ Đen',
      'Chân Váy Xếp Ly Cạp Cao Kèm Thắt Lưng Nâu',
    ],
    colorPalette: ['#1E293B', '#E2E8F0', '#78350F'],
    auraAdvice:
      'Thiết kế cổ thủy thủ kết hợp thắt lưng bản nhỏ tại eo tạo điểm nhấn thon gọn cho vòng 2 và tôn dáng trẻ trung khi đi học hoặc dạo phố.',
  },
  {
    id: 'look_preppy_2',
    title: 'Set Cardigan Navy Phối Áo Thun Trắng & Chân Váy Chữ A',
    styleTag: 'Preppy Học đường (Korean Chic)',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mọi thời tiết · Phòng điều hòa',
    imageUrl: '/assets/cropped/set_preppy_6.jpg',
    topImageUrl: '/assets/cropped/set_preppy_6.jpg',
    bottomImageUrl: '/assets/cropped/skirt_plaid_pleated.jpg',
    topName: 'Áo Khoác Cardigan Len Navy & Áo Thun Trắng',
    bottomName: 'Chân Váy Ngắn Chữ A Xám Than',
    topColor: 'Xanh Navy',
    bottomColor: 'Xám',
    isDressOrSkirt: true,
    items: [
      'Áo Khoác Cardigan Len Vặn Thừng Xanh Navy',
      'Áo Thun Trắng Cổ Tròn Cơ Bản',
      'Chân Váy Ngắn Chữ A Xám Than',
      'Túi Đeo Chéo Da Nâu Vintage',
    ],
    colorPalette: ['#172554', '#F8FAFC', '#4B5563'],
    auraAdvice:
      'Cách phối layer cardigan khoác ngoài áo trắng tạo sự thanh lịch chuẩn Hàn Quốc, dễ dàng cởi khoác linh hoạt theo nhiệt độ trong ngày.',
  },
  {
    id: 'look_preppy_3',
    title: 'Set Đồng Phục Preppy Sơ Mi Cà Vạt & Váy Yếm Xếp Ly',
    styleTag: 'Preppy Học đường (Korean Chic)',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Se lạnh · Mát mẻ',
    imageUrl: '/assets/cropped/set_preppy_9.jpg',
    topImageUrl: '/assets/cropped/set_preppy_9.jpg',
    bottomImageUrl: '/assets/cropped/skirt_plaid_pleated.jpg',
    topName: 'Sơ Mi Xanh Nhạt Phối Cà Vạt Học Đường',
    bottomName: 'Váy Yếm Xếp Ly Navy Đai Khoen Đồng',
    topColor: 'Xanh Navy',
    bottomColor: 'Xanh Navy',
    isDressOrSkirt: true,
    items: [
      'Áo Sơ Mi Dài Tay Xanh Pastel Kèm Cà Vạt',
      'Đầm Yếm Xếp Ly Xanh Navy Viền Trắng',
      'Thắt Lưng Bản To Khóa Kim Loại',
    ],
    colorPalette: ['#1E3A8A', '#DBEAFE', '#B45309'],
    auraAdvice:
      'Phom váy chữ A có đai chiết eo cao giúp cân đối tỷ lệ lưng và chân, mang lại vẻ ngoài chỉn chu, nổi bật.',
  },
  {
    id: 'look_preppy_4',
    title: 'Set Áo Trễ Vai Kẻ Sọc Ngang & Chân Váy Nỉ Dây Rút',
    styleTag: 'Preppy Học đường (Korean Chic)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Mát mẻ · Dạo phố',
    imageUrl: '/assets/cropped/set_preppy_8.jpg',
    topImageUrl: '/assets/cropped/top_striped_sailor.jpg',
    bottomImageUrl: '/assets/cropped/skirt_white_mini.jpg',
    topName: 'Áo Dài Tay Trễ Vai Kẻ Sọc Xám Navy',
    bottomName: 'Chân Váy Ôm Kẻ Sọc Dây Rút Đồng Bộ',
    topColor: 'Xám',
    bottomColor: 'Xám',
    isDressOrSkirt: true,
    items: [
      'Áo Dài Tay Trễ Vai Kẻ Sọc Xám Navy',
      'Chân Váy Ngắn Kẻ Sọc Dây Rút',
      'Dây Chuyền Bạc Mặt Chữ Thập',
    ],
    colorPalette: ['#1E293B', '#94A3B8', '#E2E8F0'],
    auraAdvice:
      'Set đồ đồng bộ kẻ ngang tôn phần xương quai xanh thanh mảnh và rất thoải mái khi đi cafe cuối tuần.',
  },

  // 2. Tiểu thư Dạ tiệc (Little Black Dress)
  {
    id: 'look_coquette_1',
    title: 'Đầm Đen Tay Bồng Chiết Eo Nơ Ngực Tiểu Thư',
    styleTag: 'Tiểu thư Dạ tiệc (Little Black Dress)',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Buổi tối · Lãng mạn',
    imageUrl: '/assets/cropped/dress_black_3.jpg',
    topImageUrl: '/assets/cropped/top_black_puff.jpg',
    bottomImageUrl: '/assets/cropped/dress_black_3.jpg',
    topName: 'Đầm Đen Tay Phồng Nơ Ngực Tiểu Thư',
    bottomName: 'Chân Đầm Xòe Bồng Tôn Eo',
    topColor: 'Đen',
    bottomColor: 'Đen',
    isDressOrSkirt: true,
    items: [
      'Đầm Đen Tay Bồng Chiết Eo Đính Nơ',
      'Vòng Cổ Ngọc Trai Tinh Tế',
      'Giày Mary Jane Đen Bóng',
    ],
    colorPalette: ['#18181B', '#3F3F46', '#F4F4F5'],
    auraAdvice:
      'Thiết kế tay bồng cùng tùng váy phồng nhẹ giúp che khuyết điểm bắp tay và làm nổi bật vòng eo con kiến trong các buổi tiệc tối.',
  },
  {
    id: 'look_coquette_2',
    title: 'Đầm Corset Trễ Vai Phối Bèo Trắng Kiêu Kỳ',
    styleTag: 'Tiểu thư Dạ tiệc (Little Black Dress)',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Mát mẻ · Tiệc tối',
    imageUrl: '/assets/cropped/set_preppy_5.jpg',
    topImageUrl: '/assets/cropped/top_black_puff.jpg',
    bottomImageUrl: '/assets/cropped/set_preppy_5.jpg',
    topName: 'Áo Corset Đen Đính Cúc Đôi Trễ Vai',
    bottomName: 'Chân Váy Xếp Ly Đen Viền Ren Trắng',
    topColor: 'Đen',
    bottomColor: 'Đen',
    isDressOrSkirt: true,
    items: [
      'Đầm Corset Hai Dây Trễ Vai Tay Dài Trắng',
      'Cổ Áo Sơ Mi Rời Cách Điệu',
      'Chân Váy Xếp Ly Viền Bèo',
    ],
    colorPalette: ['#09090B', '#F8FAFC', '#94A3B8'],
    auraAdvice:
      'Đường cắt corset ôm sát vòng 1 và vòng 2 kết hợp bèo trắng tạo điểm nhấn thị giác sang trọng, cực kỳ ăn ảnh.',
  },
  {
    id: 'look_coquette_3',
    title: 'Phối Áo Tay Phồng Cổ Vuông Đen & Chân Váy Maxi Trắng',
    styleTag: 'Tiểu thư Dạ tiệc (Little Black Dress)',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Mọi thời tiết',
    imageUrl: '/assets/cropped/outfit_coquette_pair.jpg',
    topImageUrl: '/assets/cropped/top_black_puff.jpg',
    bottomImageUrl: '/assets/cropped/skirt_white_maxi.jpg',
    topName: 'Áo Kiểu Đen Tay Phồng Cổ Vuông',
    bottomName: 'Chân Váy Maxi Tầng Trắng Tinh Khôi',
    topColor: 'Đen',
    bottomColor: 'Trắng',
    isDressOrSkirt: true,
    items: [
      'Áo Kiểu Đen Tay Phồng Cổ Vuông Chiết Eo',
      'Chân Váy Maxi Bèo Tầng Trắng Dài',
    ],
    colorPalette: ['#18181B', '#FFFFFF', '#D4D4D8'],
    auraAdvice:
      'Sự tương phản Đen - Trắng cổ điển giữa áo corset tay bồng và chân váy maxi dài mang lại nét thanh thoát, thướt tha.',
  },

  // 3. Cá tính Y2K (Cyber Grunge)
  {
    id: 'look_y2k_1',
    title: 'Áo Thun Raglan Ngôi Sao & Quần Jeans Túi Hộp Bạc Màu',
    styleTag: 'Cá tính Y2K (Cyber Grunge)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Nắng ấm · Mát mẻ',
    imageUrl: '/assets/cropped/outfit_y2k_1.jpg',
    topImageUrl: '/assets/cropped/top_star_raglan.jpg',
    bottomImageUrl: '/assets/cropped/pant_cargo_denim.jpg',
    topName: 'Áo Raglan Dài Tay In Ngôi Sao Y2K',
    bottomName: 'Quần Cargo Jeans Ống Rộng Nhiều Túi',
    topColor: 'Xám',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: false,
    items: [
      'Áo Thun Raglan Dài Tay Ôm Body In Sao Đen',
      'Quần Cargo Jeans Bạc Màu Ống Rộng',
      'Giày Sneaker Đế Bánh Mì',
    ],
    colorPalette: ['#374151', '#93C5FD', '#111827'],
    auraAdvice:
      'Công thức áo ôm sát bên trên kết hợp quần ống rộng túi hộp bên dưới tạo tỷ lệ cơ thể chuẩn Y2K năng động và tôn vòng eo.',
  },
  {
    id: 'look_y2k_2',
    title: 'Áo Lệch Vai Bươm Bướm & Chân Váy Denim Bèo Đính Nơ',
    styleTag: 'Cá tính Y2K (Cyber Grunge)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Nắng ấm · Dạo phố',
    imageUrl: '/assets/cropped/outfit_y2k_2.jpg',
    topImageUrl: '/assets/cropped/top_butterfly_asym.jpg',
    bottomImageUrl: '/assets/cropped/skirt_denim_bow.jpg',
    topName: 'Áo Thun Trắng Lệch Vai Họa Tiết Bươm Bướm',
    bottomName: 'Chân Váy Ngắn Denim Xếp Tầng Đính Nơ Hồng',
    topColor: 'Trắng',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: true,
    items: [
      'Áo Lệch Vai Trắng Graphic Bươm Bướm',
      'Chân Váy Denim Tầng Đính Nơ Hồng Hai Bên',
    ],
    colorPalette: ['#F8FAFC', '#1E3A8A', '#F472B6'],
    auraAdvice:
      'Sự kết hợp giữa nét cá tính của áo graphic lệch vai và nét ngọt ngào của chân váy denim đính nơ giúp đôi chân trông dài và thon hơn.',
  },
  {
    id: 'look_y2k_3',
    title: 'Áo Tanktop Đính Sao Đen & Quần Jeans Rách Bụi Bặm',
    styleTag: 'Cá tính Y2K (Cyber Grunge)',
    occasion: 'Du lịch',
    weatherNote: 'Nắng ấm · Hoạt động ngoài trời',
    imageUrl: '/assets/cropped/outfit_y2k_3.jpg',
    topImageUrl: '/assets/cropped/top_black_star.jpg',
    bottomImageUrl: '/assets/cropped/pant_ripped_jeans.jpg',
    topName: 'Áo Tanktop Đen Đính Đá Ngôi Sao Dây Rút',
    bottomName: 'Quần Jeans Ống Suông Rách Gối Cá Tính',
    topColor: 'Đen',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: false,
    items: [
      'Áo Tanktop Đen Đính Đá Ngôi Sao',
      'Quần Ripped Jeans Xanh Nhạt Ống Rộng',
    ],
    colorPalette: ['#18181B', '#60A5FA', '#E5E7EB'],
    auraAdvice:
      'Phù hợp cho những buổi dạo phố, chụp hình streetstyle hoặc đi concert dưới tiết trời nắng ấm.',
  },

  // 4. Đường phố (Streetwear)
  {
    id: 'look_street_1',
    title: 'Áo Lệch Vai Xanh Rêu Grunge & Quần Cargo Túi Hộp Kem',
    styleTag: 'Đường phố (Streetwear)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Mọi thời tiết',
    imageUrl: '/assets/cropped/outfit_streetwear_1.jpg',
    topImageUrl: '/assets/cropped/top_olive_grunge.jpg',
    bottomImageUrl: '/assets/cropped/pant_cargo_beige.jpg',
    topName: 'Áo Thun Xanh Rêu Lệch Vai Họa Tiết',
    bottomName: 'Quần Cargo Túi Hộp Ống Rộng Màu Kem Be',
    topColor: 'Xanh rêu',
    bottomColor: 'Beige kem',
    isDressOrSkirt: false,
    items: [
      'Áo Lệch Vai Xanh Rêu Ôm Dáng',
      'Quần Cargo Pants Màu Kem Dây Rút',
    ],
    colorPalette: ['#3F6212', '#E7E5E4', '#292524'],
    auraAdvice:
      'Bảng màu Xanh Rêu (Olive) phối cùng Kem Be (Beige) luôn tạo cảm giác thời thượng, hài hòa và tôn da.',
  },
  {
    id: 'look_street_2',
    title: 'Áo Thun Graphic Trắng Phom Rộng & Quần Baggy Jeans Cổ Điển',
    styleTag: 'Đường phố (Streetwear)',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Nắng ấm · Thoáng mát',
    imageUrl: '/assets/cropped/outfit_streetwear_2.jpg',
    topImageUrl: '/assets/cropped/top_white_graphic.jpg',
    bottomImageUrl: '/assets/cropped/pant_baggy_denim.jpg',
    topName: 'Áo Thun Trắng In Hình Nghệ Thuật',
    bottomName: 'Quần Baggy Jeans Wash Cổ Điển',
    topColor: 'Trắng',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: false,
    items: [
      'Áo Thun Trắng Oversize In Graphic',
      'Quần Baggy Jeans Ống Rộng Wash Retro',
    ],
    colorPalette: ['#FFFFFF', '#1E3A8A', '#78350F'],
    auraAdvice:
      'Set đồ thoải mái, năng động cho cả ngày dài di chuyển, có thể sơ vin nhẹ vạt trước để ăn gian chiều cao.',
  },

  // 5. Thanh lịch (Smart Casual)
  {
    id: 'look_smart_1',
    title: 'Áo Sơ Mi Đen Buộc Vạt & Quần Tây Ống Suông Xếp Ly',
    styleTag: 'Thanh lịch (Smart Casual)',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mọi thời tiết · Công sở',
    imageUrl: '/assets/cropped/outfit_smart_1.jpg',
    topImageUrl: '/assets/cropped/top_black_shirt.jpg',
    bottomImageUrl: '/assets/cropped/pant_dress_taupe.jpg',
    topName: 'Áo Sơ Mi Đen Ngắn Tay Buộc Vạt Eo',
    bottomName: 'Quần Âu Ống Suông Cạp Cao Nâu Xám (Dress Pants)',
    topColor: 'Đen',
    bottomColor: 'Nâu',
    isDressOrSkirt: false,
    items: [
      'Áo Sơ Mi Đen Cổ V Buộc Eo',
      'Quần Tây Ống Suông Xếp Ly Cạp Cao',
    ],
    colorPalette: ['#18181B', '#78716C', '#F5F5F4'],
    auraAdvice:
      'Quần âu ống đứng xếp ly kết hợp áo sơ mi buộc eo vừa giữ nét lịch sự nơi công sở vừa giúp đôi chân trông dài miên man.',
  },
  {
    id: 'look_smart_2',
    title: 'Áo Nhún Ngực Tay Phồng Peplum & Quần Jeans Đen Cạp Cao',
    styleTag: 'Thanh lịch (Smart Casual)',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Mát mẻ · Thanh lịch',
    imageUrl: '/assets/cropped/outfit_smart_2.jpg',
    topImageUrl: '/assets/cropped/top_black_peplum.jpg',
    bottomImageUrl: '/assets/cropped/pant_highwaist_black.jpg',
    topName: 'Áo Peplum Đen Cổ Vuông Tay Bồng',
    bottomName: 'Quần Jeans Đen Cạp Cao Ống Rộng (High Waist)',
    topColor: 'Đen',
    bottomColor: 'Đen',
    isDressOrSkirt: false,
    items: [
      'Áo Kiểu Peplum Đen Nhún Thân',
      'Quần Jeans Đen Cạp Cao Ống Suông Rộng',
    ],
    colorPalette: ['#18181B', '#3F3F46', '#D4AF37'],
    auraAdvice:
      'Tông đen All-Black sang trọng kết hợp phom áo Peplum giúp che vòng bụng dưới hoàn hảo và tôn dáng cao ráo.',
  },

  // 6. Nữ tính Ngọt ngào (Soft Girl / Balletcore)
  {
    id: 'look_soft_1',
    title: 'Áo Hai Dây Ren Xanh Cốm Thắt Nơ & Chân Váy Tầng Hồng Pastel',
    styleTag: 'Nữ tính Ngọt ngào (Soft Girl / Balletcore)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Nắng ấm · Mùa xuân hè',
    imageUrl: '/assets/cropped/outfit_softgirl_1.jpg',
    topImageUrl: '/assets/cropped/top_green_lace_bow.jpg',
    bottomImageUrl: '/assets/cropped/skirt_pink_tiered.jpg',
    topName: 'Áo Hai Dây Ren Xanh Cốm Thắt Nơ Ngực',
    bottomName: 'Chân Váy Ngắn Bèo Tầng Hồng Phấn',
    topColor: 'Xanh lục',
    bottomColor: 'Hồng',
    isDressOrSkirt: true,
    items: [
      'Áo Cami Ren Xanh Cốm Đính Nơ Bản To',
      'Chân Váy Bèo Tầng Hồng Pastel Dáng Ngắn',
    ],
    colorPalette: ['#A3E635', '#F9A8D4', '#FFF1F2'],
    auraAdvice:
      'Sự kết hợp màu sắc Pastel ngọt ngào giữa Xanh Cốm và Hồng Phấn mang lại vẻ ngoài tươi tắn, trẻ trung khi đi dạo phố hay chụp ảnh.',
  },
  {
    id: 'look_soft_2',
    title: 'Áo Đỏ Viền Trắng Thắt Nơ & Chân Váy Ngắn Bèo Tầng Trắng',
    styleTag: 'Nữ tính Ngọt ngào (Soft Girl / Balletcore)',
    occasion: 'Tiệc tối / Hẹn hò',
    weatherNote: 'Nắng ấm · Mát mẻ',
    imageUrl: '/assets/cropped/outfit_softgirl_2.jpg',
    topImageUrl: '/assets/cropped/top_red_milkmaid.jpg',
    bottomImageUrl: '/assets/cropped/skirt_white_mini.jpg',
    topName: 'Áo Kiểu Đỏ Đô Viền Trắng Thắt Nơ Ngực',
    bottomName: 'Chân Váy Ngắn Bèo Nhún Trắng Tinh Khôi',
    topColor: 'Đỏ',
    bottomColor: 'Trắng',
    isDressOrSkirt: true,
    items: [
      'Áo Thun Đỏ Cổ Vuông Viền Trắng Đính Nơ',
      'Chân Váy Mini Xếp Tầng Trắng',
    ],
    colorPalette: ['#991B1B', '#FFFFFF', '#FCA5A5'],
    auraAdvice:
      'Tông đỏ đô làm bật tông da trắng hồng, phối cùng chân váy bèo trắng tạo tỷ lệ cân đối và cuốn hút.',
  },
  {
    id: 'look_soft_3',
    title: 'Áo Babydoll Hai Dây Nâu Thắt Nơ & Chân Váy Xếp Ly Kẻ Be',
    styleTag: 'Nữ tính Ngọt ngào (Soft Girl / Balletcore)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Mát mẻ · Thu đông nhẹ',
    imageUrl: '/assets/cropped/outfit_softgirl_3.jpg',
    topImageUrl: '/assets/cropped/top_brown_bow_cami.jpg',
    bottomImageUrl: '/assets/cropped/skirt_plaid_pleated.jpg',
    topName: 'Áo Hai Dây Babydoll Nâu Chocolate Đính Nơ',
    bottomName: 'Chân Váy Xếp Ly Kẻ Caro Tông Kem Rêu',
    topColor: 'Nâu',
    bottomColor: 'Beige kem',
    isDressOrSkirt: true,
    items: [
      'Áo Hai Dây Babydoll Nâu Xếp Ly',
      'Chân Váy Xếp Ly Kẻ Caro Vintage',
    ],
    colorPalette: ['#5C3A21', '#D6D3D1', '#A8A29E'],
    auraAdvice:
      'Tông nâu trầm ấm phối cùng kẻ caro kem mang đậm chất thơ nhẹ nhàng, phù hợp cho buổi chiều cafe cuối tuần.',
  },

  // 7. Tối giản (Minimalist)
  {
    id: 'look_min_1',
    title: 'Áo Lệch Vai Kem Sữa Nhún Eo & Quần Ống Suông Kẻ Sọc Mảnh',
    styleTag: 'Tối giản (Minimalist)',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mọi thời tiết',
    imageUrl: '/assets/cropped/outfit_minimalist_1.jpg',
    topImageUrl: '/assets/cropped/top_cream_asym.jpg',
    bottomImageUrl: '/assets/cropped/pant_pinstripe_cream.jpg',
    topName: 'Áo Lệch Vai Kem Sữa Nhún Thân Tinh Tế',
    bottomName: 'Quần Ống Rộng Kẻ Sọc Dọc Màu Kem (Pinstripe)',
    topColor: 'Beige kem',
    bottomColor: 'Trắng kem',
    isDressOrSkirt: false,
    items: [
      'Áo Lệch Vai Kem Sữa Ôm Nhẹ',
      'Quần Ống Suông Kẻ Sọc Dọc Cạp Cao',
    ],
    colorPalette: ['#FEF3C7', '#F5F5F4', '#A8A29E'],
    auraAdvice:
      'Phối đồ Monochrome (đơn sắc kem - trắng ngà) cùng họa tiết sọc dọc trên quần giúp vóc dáng thanh mảnh và cao ráo vượt trội.',
  },
  {
    id: 'look_min_2',
    title: 'Áo Cổ Vuông Nâu Đậm & Quần Âu Ống Suông Tông Nâu Xám',
    styleTag: 'Tối giản (Minimalist)',
    occasion: 'Đi làm / Đi học',
    weatherNote: 'Mát mẻ · Thanh lịch',
    imageUrl: '/assets/cropped/outfit_minimalist_2.jpg',
    topImageUrl: '/assets/cropped/top_brown_square.jpg',
    bottomImageUrl: '/assets/cropped/pant_dress_taupe.jpg',
    topName: 'Áo Thun Cổ Vuông Nâu Espresso Ôm Dáng',
    bottomName: 'Quần Âu Ống Suông Nâu Xám Tối Giản',
    topColor: 'Nâu',
    bottomColor: 'Nâu',
    isDressOrSkirt: false,
    items: [
      'Áo Cổ Vuông Nâu Đậm Tôn Xương Quai Xanh',
      'Quần Tây Ống Suông Cạp Cao',
    ],
    colorPalette: ['#451A03', '#78716C', '#E7E5E4'],
    auraAdvice:
      'Phong cách Minimalist tập trung vào đường cắt sắc sảo và tông màu đất ấm áp, không bao giờ lỗi mốt.',
  },

  // 8. Cổ điển (Vintage / Retro)
  {
    id: 'look_vintage_1',
    title: 'Áo Cổ Yếm Vàng Chấm Bi & Quần Jeans Ống Loe Cổ Điển',
    styleTag: 'Cổ điển (Vintage / Retro)',
    occasion: 'Dạo phố / Cafe',
    weatherNote: 'Nắng ấm · Hoài niệm',
    imageUrl: '/assets/cropped/outfit_vintage_1.jpg',
    topImageUrl: '/assets/cropped/top_yellow_polka.jpg',
    bottomImageUrl: '/assets/cropped/pant_flaired_denim.jpg',
    topName: 'Áo Cổ Yếm Vàng Bơ Họa Tiết Chấm Bi',
    bottomName: 'Quần Jeans Ống Loe Xanh Đậm (Flaired Jeans)',
    topColor: 'Beige kem',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: false,
    items: [
      'Áo Halter Cổ Yếm Vàng Chấm Bi Nâu',
      'Quần Jeans Ống Loe Ôm Đùi Tôn Dáng',
    ],
    colorPalette: ['#FEF08A', '#1E3A8A', '#451A03'],
    auraAdvice:
      'Quần jeans ống loe kết hợp áo cổ yếm chấm bi gợi nhớ vẻ đẹp thập niên 70s, cực kỳ tôn vòng 3 và tạo đường cong chữ S.',
  },
  {
    id: 'look_vintage_2',
    title: 'Áo Thun Ringer Dream Tunnel & Quần Bootcut Jeans Thắt Lưng Da',
    styleTag: 'Cổ điển (Vintage / Retro)',
    occasion: 'Du lịch',
    weatherNote: 'Mọi thời tiết',
    imageUrl: '/assets/cropped/outfit_vintage_2.jpg',
    topImageUrl: '/assets/cropped/top_dream_ringer.jpg',
    bottomImageUrl: '/assets/cropped/pant_bootcut_denim.jpg',
    topName: 'Áo Thun Raglan Dream Tunnel Retro',
    bottomName: 'Quần Bootcut Jeans Kèm Thắt Lưng Da Nâu',
    topColor: 'Trắng kem',
    bottomColor: 'Xanh Denim',
    isDressOrSkirt: false,
    items: [
      'Áo Croptop Raglan Phối Tay Đen Retro',
      'Quần Bootcut Jeans Cạp Cao Thắt Lưng Da',
    ],
    colorPalette: ['#F5F5F4', '#1E293B', '#78350F'],
    auraAdvice:
      'Sự kết hợp hoàn hảo giữa nét bụi bặm cổ điển và phom dáng hiện đại, rất hợp cho những chuyến dã ngoại hay cafe nhạc acoustic.',
  },

  // 9. Thể thao (Sporty / Athleisure)
  {
    id: 'look_sporty_1',
    title: 'Áo Croptop Đen Đan Chéo Eo & Quần Nỉ Xám Ống Rộng',
    styleTag: 'Thể thao (Sporty / Athleisure)',
    occasion: 'Thể thao / Vận động',
    weatherNote: 'Mát mẻ · Năng động',
    imageUrl: '/assets/cropped/outfit_sporty_1.jpg',
    topImageUrl: '/assets/cropped/top_black_crisscross.jpg',
    bottomImageUrl: '/assets/cropped/pant_sweat_grey.jpg',
    topName: 'Áo Croptop Đen Đai Chéo Eo Thể Thao',
    bottomName: 'Quần Jogger Nỉ Xám Ống Rộng Dây Rút',
    topColor: 'Đen',
    bottomColor: 'Xám',
    isDressOrSkirt: false,
    items: [
      'Áo Croptop Đen Đai Chéo Tôn Eo',
      'Quần Sweatpants Nỉ Xám Phom Rộng Thoải Mái',
    ],
    colorPalette: ['#18181B', '#9CA3AF', '#F3F4F6'],
    auraAdvice:
      'Chi tiết đan chéo ở eo giúp tôn vòng 2 săn chắc, trong khi quần nỉ ống rộng mang lại sự thoải mái tối đa khi tập luyện hoặc di chuyển.',
  },
  {
    id: 'look_sporty_2',
    title: 'Áo Thun Rút Dây California & Quần Short Thể Thao Viền Trắng',
    styleTag: 'Thể thao (Sporty / Athleisure)',
    occasion: 'Thể thao / Vận động',
    weatherNote: 'Nắng ấm · Thoáng khí',
    imageUrl: '/assets/cropped/outfit_sporty_2.jpg',
    topImageUrl: '/assets/cropped/top_california_tee.jpg',
    bottomImageUrl: '/assets/cropped/short_sport_navy.jpg',
    topName: 'Áo Thun Rút Dây Hai Bên California',
    bottomName: 'Quần Short Thể Thao Xanh Navy Viền Trắng',
    topColor: 'Xám',
    bottomColor: 'Xanh Navy',
    isDressOrSkirt: false,
    items: [
      'Áo Thun Cổ V Rút Dây Hai Bên Hông',
      'Quần Dolphin Shorts Thể Thao Viền Trắng',
    ],
    colorPalette: ['#6B7280', '#1E1B4B', '#FFFFFF'],
    auraAdvice:
      'Thiết kế rút dây hai bên cho phép bạn tùy chỉnh độ dài áo theo sở thích, kết hợp quần short thể thao giúp vận động linh hoạt.',
  },

  // 10. Du lịch Phóng khoáng (Boho / Maxi)
  {
    id: 'look_boho_1',
    title: 'Áo Cổ Yếm Lụa Xanh Dương Nhạt & Chân Váy Maxi Tầng Trắng',
    styleTag: 'Du lịch Phóng khoáng (Boho / Maxi)',
    occasion: 'Du lịch',
    weatherNote: 'Nắng ấm · Dạo biển',
    imageUrl: '/assets/cropped/outfit_boho_1.jpg',
    topImageUrl: '/assets/cropped/top_blue_halter.jpg',
    bottomImageUrl: '/assets/cropped/skirt_white_maxi.jpg',
    topName: 'Áo Cổ Yếm Lụa Xanh Pastel Nhún Thân',
    bottomName: 'Chân Váy Maxi Dài Xếp Tầng Trắng Tinh Khôi',
    topColor: 'Xanh',
    bottomColor: 'Trắng',
    isDressOrSkirt: true,
    items: [
      'Áo Halter Lụa Xanh Dương Nhạt Mát Mẻ',
      'Chân Váy Maxi Trắng Dáng Dài Bay Bổng',
    ],
    colorPalette: ['#93C5FD', '#FFFFFF', '#E2E8F0'],
    auraAdvice:
      'Tông xanh dương pastel và trắng tinh khôi là lựa chọn số 1 cho những chuyến du lịch biển hoặc nghỉ dưỡng resort.',
  },
  {
    id: 'look_boho_2',
    title: 'Áo Trễ Vai Bèo Nhún Đen & Chân Váy Maxi Tầng Xanh Navy',
    styleTag: 'Du lịch Phóng khoáng (Boho / Maxi)',
    occasion: 'Du lịch',
    weatherNote: 'Mát mẻ · Dạo phố biển',
    imageUrl: '/assets/cropped/outfit_boho_2.jpg',
    topImageUrl: '/assets/cropped/top_black_offshoulder.jpg',
    bottomImageUrl: '/assets/cropped/skirt_navy_maxi.jpg',
    topName: 'Áo Croptop Trễ Vai Bèo Nhún Hai Dây Đen',
    bottomName: 'Chân Váy Maxi Dài Xếp Tầng Xanh Navy Đậm',
    topColor: 'Đen',
    bottomColor: 'Xanh Navy',
    isDressOrSkirt: true,
    items: [
      'Áo Trễ Vai Bèo Nhún Đen Nữ Tính',
      'Chân Váy Maxi Xếp Tầng Xanh Navy',
    ],
    colorPalette: ['#18181B', '#1E3A8A', '#94A3B8'],
    auraAdvice:
      'Phom áo trễ vai khoe bờ vai thanh mảnh kết hợp chân váy maxi dài giúp che nắng tốt và tạo bước đi uyển chuyển.',
  },
];

export const STARTER_WARDROBE_TEMPLATES = [
  {
    name: 'Áo Kiểu Đen Tay Phồng Cổ Vuông',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Tiểu thư Dạ tiệc (Little Black Dress)',
    color: 'Đen',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: '/assets/cropped/top_black_puff.jpg',
    favorite: true,
  },
  {
    name: 'Áo Sơ Mi Đen Ngắn Tay Buộc Vạt',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Thanh lịch (Smart Casual)',
    color: 'Đen',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/cropped/top_black_shirt.jpg',
    favorite: true,
  },
  {
    name: 'Áo Lệch Vai Kem Sữa Nhún Eo',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Tối giản (Minimalist)',
    color: 'Beige kem',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/cropped/top_cream_asym.jpg',
    favorite: true,
  },
  {
    name: 'Áo Raglan Dài Tay In Ngôi Sao Y2K',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Cá tính Y2K (Cyber Grunge)',
    color: 'Xám & Đen',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/top_star_raglan.jpg',
    favorite: true,
  },
  {
    name: 'Áo Hai Dây Ren Xanh Cốm Thắt Nơ',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Nữ tính Ngọt ngào (Soft Girl / Balletcore)',
    color: 'Xanh lục pastel',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/top_green_lace_bow.jpg',
    favorite: true,
  },
  {
    name: 'Áo Lệch Vai Xanh Rêu Grunge',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Đường phố (Streetwear)',
    color: 'Xanh rêu',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/top_olive_grunge.jpg',
    favorite: false,
  },
  {
    name: 'Áo Cổ Yếm Vàng Chấm Bi Cổ Điển',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Cổ điển (Vintage / Retro)',
    color: 'Beige kem',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/top_yellow_polka.jpg',
    favorite: false,
  },
  {
    name: 'Áo Cổ Yếm Lụa Xanh Dương Nhạt',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Du lịch Phóng khoáng (Boho / Maxi)',
    color: 'Xanh pastel',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Du lịch' as OccasionType,
    imageUrl: '/assets/cropped/top_blue_halter.jpg',
    favorite: true,
  },
  {
    name: 'Set Cardigan Len Navy & Chân Váy Chữ A',
    category: 'Áo khoác' as GarmentCategory,
    styleTag: 'Preppy Học đường (Korean Chic)',
    color: 'Xanh Navy',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/cropped/set_preppy_6.jpg',
    favorite: true,
  },
  {
    name: 'Set Sơ Mi Caro Xanh Navy Cổ Thủy Thủ',
    category: 'Áo khoác' as GarmentCategory,
    styleTag: 'Preppy Học đường (Korean Chic)',
    color: 'Xanh Navy',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/cropped/set_preppy_2.jpg',
    favorite: true,
  },
  {
    name: 'Quần Cargo Túi Hộp Ống Rộng Màu Kem',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Đường phố (Streetwear)',
    color: 'Beige kem',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/pant_cargo_beige.jpg',
    favorite: true,
  },
  {
    name: 'Quần Âu Ống Suông Cạp Cao (Dress Pants)',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Thanh lịch (Smart Casual)',
    color: 'Nâu xám',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/cropped/pant_dress_taupe.jpg',
    favorite: true,
  },
  {
    name: 'Quần Jeans Ống Loe Cổ Điển (Flaired Jeans)',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Cổ điển (Vintage / Retro)',
    color: 'Xanh Denim',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/pant_flaired_denim.jpg',
    favorite: true,
  },
  {
    name: 'Quần Cargo Jeans Bạc Màu Y2K',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Cá tính Y2K (Cyber Grunge)',
    color: 'Xanh Denim nhạt',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/pant_cargo_denim.jpg',
    favorite: false,
  },
  {
    name: 'Chân Váy Bèo Tầng Hồng Pastel',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Nữ tính Ngọt ngào (Soft Girl / Balletcore)',
    color: 'Hồng phấn',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: '/assets/cropped/skirt_pink_tiered.jpg',
    favorite: true,
  },
  {
    name: 'Chân Váy Xếp Ly Kẻ Caro Học Đường',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Preppy Học đường (Korean Chic)',
    color: 'Beige kẻ caro',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: '/assets/cropped/skirt_plaid_pleated.jpg',
    favorite: true,
  },
  {
    name: 'Chân Váy Maxi Tầng Trắng Dáng Dài',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Du lịch Phóng khoáng (Boho / Maxi)',
    color: 'Trắng',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Du lịch' as OccasionType,
    imageUrl: '/assets/cropped/skirt_white_maxi.jpg',
    favorite: true,
  },
  {
    name: 'Quần Nỉ Xám Ống Rộng Thể Thao',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Thể thao (Sporty / Athleisure)',
    color: 'Xám',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Thể thao / Vận động' as OccasionType,
    imageUrl: '/assets/cropped/pant_sweat_grey.jpg',
    favorite: false,
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
