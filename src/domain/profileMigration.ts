import { normalizeGender } from '../../shared/gender';
import type { UserProfile } from '../types';

/**
 * Hồ sơ tạo trước khi bỏ giới tính "Khác" phải chọn lại Nam/Nữ trước khi vào app.
 * Luật Firestore mới chỉ nhận Nam/Nữ và kiểm tra cả tài liệu sau khi gộp, nên mọi thứ cần sửa
 * được ghi trong cùng một lần cập nhật (xem ProfileMigrationGate).
 */
export function profileNeedsMigration(profile: Pick<UserProfile, 'gender'>): boolean {
  return normalizeGender(profile.gender) === null;
}
