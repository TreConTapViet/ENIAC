/**
 * Danh mục đồ của app: món đồ + bộ đồ gợi ý, lọc theo giới tính.
 *  - Đồ nam: src/catalog/{garments,outfits}.male.ts, bộ đồ tham chiếu món bằng id.
 *  - Bộ sưu tập nữ cũ (CURATED_OUTFIT_LOOKBOOK) giữ nguyên ảnh, chỉ được gắn giới tính;
 *    4 bộ đường phố dùng được cho cả hai giới.
 */
import { CURATED_OUTFIT_LOOKBOOK, STARTER_WARDROBE_TEMPLATES } from '../constants';
import { isForGender } from '../../shared/gender';
import { styleLabel } from '../../shared/styles';
import type { AuraOutfitRecommendation, GenderOption, GarmentCategory, OccasionType, WeatherSeason } from '../types';
import { MALE_GARMENTS } from './garments.male';
import { MALE_OUTFITS } from './outfits.male';
import type { CatalogGarment, CuratedOutfit } from './types';

export type { CatalogGarment, CuratedOutfit, ImageCredit } from './types';

export const CATALOG_GARMENTS: readonly CatalogGarment[] = [...MALE_GARMENTS];
export const CURATED_OUTFITS: readonly CuratedOutfit[] = [...MALE_OUTFITS];

const GARMENT_BY_ID = new Map(CATALOG_GARMENTS.map((g) => [g.id, g]));
export const getCatalogGarment = (id: string) => GARMENT_BY_ID.get(id);

const UNISEX_LOOKBOOK_IDS = new Set(['look_street_new_1', 'look_street_new_2', 'look_street_new_3', 'look_street_new_4']);

const TOP_CATEGORIES: GarmentCategory[] = ['Áo', 'Đầm & Váy liền'];
const BOTTOM_CATEGORIES: GarmentCategory[] = ['Quần', 'Chân váy', 'Quần & Chân váy'];

/** Bộ đồ trong danh mục → dạng gợi ý mà giao diện và studio dùng. Ảnh, tên, màu lấy từ chính món đồ. */
export function toRecommendation(outfit: CuratedOutfit): AuraOutfitRecommendation {
  const garments = outfit.garmentIds
    .map((id) => GARMENT_BY_ID.get(id))
    .filter((g): g is CatalogGarment => Boolean(g));
  const top = garments.find((g) => TOP_CATEGORIES.includes(g.category));
  const bottom = garments.find((g) => BOTTOM_CATEGORIES.includes(g.category));
  const outer = garments.find((g) => g.category === 'Áo khoác');
  return {
    id: outfit.id,
    title: outfit.title,
    gender: outfit.gender,
    garmentIds: outfit.garmentIds,
    styleTag: styleLabel(outfit.styleId),
    occasion: outfit.occasion,
    season: outfit.season,
    weatherNote: `${outfit.season} · ${outfit.occasion}`,
    // Không có ảnh cả bộ: giao diện ghép ảnh các món (OutfitCollage)
    imageUrl: '',
    topImageUrl: top?.imageUrl,
    bottomImageUrl: bottom?.imageUrl,
    outerImageUrl: outer?.imageUrl,
    topName: top?.name,
    bottomName: bottom?.name,
    topColor: top?.color,
    bottomColor: bottom?.color,
    isDressOrSkirt: top?.category === 'Đầm & Váy liền' || bottom?.category === 'Chân váy',
    items: [...garments.map((g) => g.name), ...outfit.extras],
    colorPalette: Array.from(new Set(garments.map((g) => g.colorHex))).slice(0, 3),
    auraAdvice: outfit.auraAdvice,
  };
}

const LOOKBOOK: AuraOutfitRecommendation[] = CURATED_OUTFIT_LOOKBOOK.map((o) => ({
  ...o,
  gender: o.id && UNISEX_LOOKBOOK_IDS.has(o.id) ? 'Unisex' : 'Nữ',
}));

const ALL_OUTFITS: AuraOutfitRecommendation[] = [...CURATED_OUTFITS.map(toRecommendation), ...LOOKBOOK];

/** Bộ đồ gợi ý có sẵn cho người dùng giới tính `gender` (đồ của giới đó + Unisex) */
export function catalogOutfitsFor(gender: GenderOption): AuraOutfitRecommendation[] {
  return ALL_OUTFITS.filter((o) => isForGender(o.gender ?? 'Nữ', gender));
}

export function catalogGarmentsFor(gender: GenderOption): CatalogGarment[] {
  return CATALOG_GARMENTS.filter((g) => isForGender(g.gender, gender));
}

/** Món đồ mẫu gieo vào tủ đồ: key ổn định để dựng id starter_{uid}_{key} */
export interface StarterTemplate {
  key: string;
  name: string;
  category: GarmentCategory;
  styleTag: string;
  color: string;
  season: WeatherSeason;
  occasion: OccasionType;
  imageUrl: string;
  favorite: boolean;
}

export function starterTemplatesFor(gender: GenderOption): StarterTemplate[] {
  if (gender === 'Nam') {
    return MALE_GARMENTS.filter((g) => g.starter).map((g) => ({
      key: g.id,
      name: g.name,
      category: g.category,
      styleTag: styleLabel(g.styleIds[0] ?? 'minimalist'),
      color: g.color,
      season: g.season,
      occasion: g.occasion,
      imageUrl: g.imageUrl,
      favorite: false,
    }));
  }
  // Tủ đồ mẫu nữ cũ: key là số thứ tự để giữ đúng id starter_{uid}_{idx} đã lưu trước đây
  return STARTER_WARDROBE_TEMPLATES.map((t, idx) => ({ key: String(idx), ...t }));
}
