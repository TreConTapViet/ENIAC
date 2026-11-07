import { GARMENT_CATEGORIES } from '../constants';
import type { GarmentCategory, GenderOption, WardrobeItem } from '../types';

/** Loại đồ chỉ dành cho nữ: ẩn với người dùng Nam (trừ khi họ đã có món thuộc loại đó) */
const FEMALE_ONLY_CATEGORIES: readonly GarmentCategory[] = ['Chân váy', 'Đầm & Váy liền'];

export function categoriesForGender(
  gender: GenderOption,
  ownedItems: Pick<WardrobeItem, 'category'>[] = []
): GarmentCategory[] {
  if (gender !== 'Nam') return GARMENT_CATEGORIES;
  const owned = new Set(ownedItems.map((i) => i.category));
  return GARMENT_CATEGORIES.filter((c) => !FEMALE_ONLY_CATEGORIES.includes(c) || owned.has(c));
}
