/**
 * Giới tính dùng chung cho client và server.
 * Chỉ còn Nam/Nữ. Hồ sơ cũ có thể còn "Khác": normalizeGender trả về null để app hỏi lại
 * (ProfileMigrationGate) thay vì tự đoán.
 */
export type GenderOption = 'Nữ' | 'Nam';

/** Món đồ / bộ đồ trong danh mục: dành cho Nam, Nữ hoặc cả hai */
export type CatalogGender = GenderOption | 'Unisex';

export const GENDER_OPTIONS: readonly GenderOption[] = ['Nữ', 'Nam'];

export function isGenderOption(value: unknown): value is GenderOption {
  return value === 'Nữ' || value === 'Nam';
}

/** "Nam"/"Nữ" giữ nguyên; giá trị khác (kể cả "Khác" của hồ sơ cũ) là null */
export function normalizeGender(value: unknown): GenderOption | null {
  return isGenderOption(value) ? value : null;
}

/** Đồ dành cho `target` có hợp với người dùng giới tính `user` không (Unisex hợp với cả hai) */
export function isForGender(target: CatalogGender | undefined, user: GenderOption): boolean {
  return !target || target === 'Unisex' || target === user;
}
