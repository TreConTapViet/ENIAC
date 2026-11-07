import type { CatalogGender, GarmentCategory, OccasionType, WeatherSeason } from '../types';

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
