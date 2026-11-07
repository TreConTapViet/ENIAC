import { AccentColorKey, GarmentCategory, OccasionType, WeatherContextData, WeatherSeason } from './types';
import minimalistImg from './assets/images/style_minimalist_fashion_1794032022720.jpg';
import streetwearImg from './assets/images/style_streetwear_fashion_1794032024479.jpg';
import vintageImg from './assets/images/style_vintage_retro_1794032025329.jpg';
import smartCasualImg from './assets/images/style_smart_casual_1794032025174.jpg';
import sportyImg from './assets/images/style_sporty_athleisure_1794032026888.jpg';
import koreanChicImg from './assets/images/style_korean_chic_1794032027385.jpg';

export interface StyleOption {
  id: string;
  name: string;
  subtitle: string;
  image: string;
}

export const FASHION_STYLES: StyleOption[] = [
  {
    id: 'minimalist',
    name: 'Tối giản (Minimalist)',
    subtitle: 'Tinh tế, phom dáng gọn gàng & gam màu trung tính',
    image: minimalistImg,
  },
  {
    id: 'streetwear',
    name: 'Đường phố (Streetwear)',
    subtitle: 'Năng động, cá tính với phom rộng & chất liệu denim',
    image: streetwearImg,
  },
  {
    id: 'vintage',
    name: 'Cổ điển (Vintage / Retro)',
    subtitle: 'Hoài niệm, ấm áp với họa tiết kẻ & tông màu trầm',
    image: vintageImg,
  },
  {
    id: 'smart_casual',
    name: 'Thanh lịch (Smart Casual)',
    subtitle: 'Chỉn chu nơi công sở nhưng vẫn thoải mái dạo phố',
    image: smartCasualImg,
  },
  {
    id: 'sporty',
    name: 'Thể thao (Sporty / Athleisure)',
    subtitle: 'Thoáng khí, linh hoạt cho ngày dài năng lượng',
    image: sportyImg,
  },
  {
    id: 'korean_chic',
    name: 'Hàn Quốc (Korean Chic)',
    subtitle: 'Trẻ trung, nhẹ nhàng với cách phối layer hiện đại',
    image: koreanChicImg,
  },
];

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

export const STARTER_WARDROBE_TEMPLATES = [
  {
    name: 'Áo Len Cashmere Beige Tối Giản',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Tối giản (Minimalist)',
    color: 'Beige kem',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: minimalistImg,
    favorite: true,
  },
  {
    name: 'Áo Khoác Denim Wash Cổ Điển',
    category: 'Áo khoác' as GarmentCategory,
    styleTag: 'Đường phố (Streetwear)',
    color: 'Xanh Indigo',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Dạo phố / Cafe' as OccasionType,
    imageUrl: streetwearImg,
    favorite: true,
  },
  {
    name: 'Áo Blazer Kẻ Tartan & Chân Váy Xếp Ly',
    category: 'Áo khoác' as GarmentCategory,
    styleTag: 'Cổ điển (Vintage / Retro)',
    color: 'Nâu trầm & Xanh rêu',
    season: 'Se lạnh' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: vintageImg,
    favorite: false,
  },
  {
    name: 'Sơ Mi Oxford Phối Cardigan Merino',
    category: 'Áo' as GarmentCategory,
    styleTag: 'Thanh lịch (Smart Casual)',
    color: 'Xanh Navy & Trắng',
    season: 'Mọi thời tiết' as WeatherSeason,
    occasion: 'Đi làm / Đi học' as OccasionType,
    imageUrl: smartCasualImg,
    favorite: true,
  },
  {
    name: 'Áo Khoác Nỉ Thể Thao & Giày Chạy Bộ',
    category: 'Áo khoác' as GarmentCategory,
    styleTag: 'Thể thao (Sporty / Athleisure)',
    color: 'Xám Than (Charcoal)',
    season: 'Mát mẻ' as WeatherSeason,
    occasion: 'Thể thao / Vận động' as OccasionType,
    imageUrl: sportyImg,
    favorite: false,
  },
  {
    name: 'Áo Khoác Tweed Pastel & Quần Ống Suông',
    category: 'Quần & Chân váy' as GarmentCategory,
    styleTag: 'Hàn Quốc (Korean Chic)',
    color: 'Kem Sữa (Ivory)',
    season: 'Nắng ấm' as WeatherSeason,
    occasion: 'Tiệc tối / Hẹn hò' as OccasionType,
    imageUrl: koreanChicImg,
    favorite: true,
  },
];
