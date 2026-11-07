export type GenderOption = 'Nữ' | 'Nam' | 'Khác';

export type AccentColorKey = 'amber' | 'rose' | 'emerald' | 'indigo' | 'violet' | 'slate';

export type ThemeMode = 'light' | 'dark';

export type GarmentCategory = 'Áo' | 'Quần & Chân váy' | 'Áo khoác' | 'Giày dép' | 'Phụ kiện';

export type WeatherSeason = 'Mọi thời tiết' | 'Nắng ấm' | 'Mát mẻ' | 'Se lạnh' | 'Mưa';

export type OccasionType =
  | 'Đi làm / Đi học'
  | 'Dạo phố / Cafe'
  | 'Tiệc tối / Hẹn hò'
  | 'Thể thao / Vận động'
  | 'Du lịch';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  gender: GenderOption;
  favoriteStyles: string[];
  accentColor: AccentColorKey;
  themeMode: ThemeMode;
  avatarUrl?: string;
  heightCm?: number;
  weightKg?: number;
  bustCm?: number;
  waistCm?: number;
  hipCm?: number;
  onboardingCompleted: boolean;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  passwordHash?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface WardrobeItem {
  id: string;
  userId: string;
  name: string;
  category: GarmentCategory;
  styleTag: string;
  color: string;
  season: WeatherSeason;
  occasion: OccasionType;
  imageUrl: string;
  favorite: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface SavedOutfit {
  id: string;
  userId: string;
  title: string;
  occasion: string;
  weatherNote: string;
  items: string[];
  auraAdvice: string;
  imageUrl?: string;
  styleTag?: string;
  createdAt?: any;
}

export interface AuraOutfitRecommendation {
  id?: string;
  title: string;
  styleTag: string;
  occasion: string;
  weatherNote: string;
  imageUrl: string;
  topImageUrl?: string;
  bottomImageUrl?: string;
  topName?: string;
  bottomName?: string;
  topColor?: string;
  bottomColor?: string;
  isDressOrSkirt?: boolean;
  items: string[];
  colorPalette: string[];
  auraAdvice: string;
}

export interface WeatherContextData {
  city: string;
  temp: number;
  condition: string;
  humidity: number;
  wind: string;
  uvIndex: string;
  seasonMatch: WeatherSeason;
}
