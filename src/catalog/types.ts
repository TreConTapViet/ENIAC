import type { CatalogGender, GarmentCategory, OccasionType, WeatherSeason } from '../types';
import type {
  BottomStyleId,
  FabricType,
  FitEase,
  GarmentWeavePattern,
  OuterwearStyleId,
  TopStyleId,
} from '../types/studio';

/**
 * Cách studio 3D dựng món đồ: chọn mô hình vải 3D có sẵn + màu + chất liệu, thay vì dán ảnh chụp
 * (ảnh thật có móc treo/nền nên dán lên người sẽ thành ảnh phẳng).
 */
export interface StudioGarmentSpec {
  styleId: TopStyleId | OuterwearStyleId | BottomStyleId;
  colorHex: string;
  secondaryColorHex: string;
  fabric: FabricType;
  weave: GarmentWeavePattern;
  fit: FitEase;
}

/** Nguồn ảnh của một món trong danh mục (liệt kê đầy đủ ở vanhanh/nguon-anh.md) */
export interface ImageCredit {
  source: 'Unsplash' | 'Pexels' | 'Gemini (AI)' | 'AI Studio (Gemini)';
  author?: string;
  url?: string;
  license: 'Unsplash License' | 'Pexels License' | 'Ảnh do AI tạo cho dự án';
}

/** Món đồ có sẵn trong danh mục của app (không phải đồ người dùng tự thêm) */
export interface CatalogGarment {
  id: string;
  name: string;
  category: GarmentCategory;
  gender: CatalogGender;
  /** id phong cách (shared/styles.ts) */
  styleIds: string[];
  color: string;
  colorHex: string;
  season: WeatherSeason;
  occasion: OccasionType;
  imageUrl: string;
  /** Có gieo vào tủ đồ mẫu của người dùng mới không */
  starter: boolean;
  credit: ImageCredit;
  studio: StudioGarmentSpec;
}

/** Bộ đồ gợi ý ghép từ các món trong danh mục, tham chiếu bằng id nên ảnh luôn đúng món */
export interface CuratedOutfit {
  id: string;
  title: string;
  gender: CatalogGender;
  styleId: string;
  occasion: OccasionType;
  season: WeatherSeason;
  garmentIds: string[];
  /** Giày, phụ kiện gợi ý thêm (chỉ là chữ, không có trong danh mục) */
  extras: string[];
  auraAdvice: string;
}
