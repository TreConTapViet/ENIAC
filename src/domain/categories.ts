import { GARMENT_CATEGORIES } from '../constants';
import type { GarmentCategory, GenderOption, WardrobeItem } from '../types';

/** Loại đồ chỉ dành cho nữ: ẩn với người dùng Nam (trừ khi họ đã có món thuộc loại đó) */
const FEMALE_ONLY_CATEGORIES: readonly GarmentCategory[] = ['Chân váy', 'Đầm & Váy liền'];

export function categoriesForGender(
  gender: GenderOption,
  _ownedItems: Pick<WardrobeItem, 'category'>[] = []
): GarmentCategory[] {
  if (gender === 'Nam') {
    return GARMENT_CATEGORIES.filter((c) => !FEMALE_ONLY_CATEGORIES.includes(c));
  }
  return GARMENT_CATEGORIES;
}
