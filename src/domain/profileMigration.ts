import { normalizeGender } from '../../shared/gender';
import { MAX_FAVORITE_STYLES, MIN_FAVORITE_STYLES, migrateLegacyStyles } from '../../shared/styles';
import type { UserProfile } from '../types';

/**
 * Hồ sơ tạo trước khi đổi sang Nam/Nữ + id phong cách có thể cần sửa trước khi vào app.
 * Luật Firestore mới kiểm tra cả tài liệu sau khi gộp (giới tính Nam/Nữ, tối đa 8 phong cách),
 * nên phần cần sửa được ghi trong cùng một lần cập nhật.
 */

/** Phải hỏi người dùng: giới tính cũ "Khác", hoặc phong cách sau chuyển đổi rỗng / quá 8 */
export function profileNeedsMigration(profile: Pick<UserProfile, 'gender' | 'favoriteStyles'>): boolean {
  const gender = normalizeGender(profile.gender);
  if (!gender) return true;
  const styles = migrateLegacyStyles(profile.favoriteStyles, gender);
  return styles.length < MIN_FAVORITE_STYLES || styles.length > MAX_FAVORITE_STYLES;
}

/**
 * Chuyển tự động, không cần hỏi: tên phong cách cũ → id. Trả về danh sách mới nếu khác bản đang lưu,
 * null nếu không cần ghi (hoặc phải đi qua cổng cập nhật).
 */
export function autoMigratedStyles(profile: Pick<UserProfile, 'gender' | 'favoriteStyles'>): string[] | null {
  if (profileNeedsMigration(profile)) return null;
  const gender = normalizeGender(profile.gender)!;
  const next = migrateLegacyStyles(profile.favoriteStyles, gender);
  const current = profile.favoriteStyles ?? [];
  const same = next.length === current.length && next.every((s, i) => s === current[i]);
  return same ? null : next;
}
