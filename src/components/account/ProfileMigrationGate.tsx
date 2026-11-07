import React, { useState } from 'react';
import { GENDER_OPTIONS, type GenderOption } from '../../../shared/gender';
import { DEFAULT_AVATARS, resolveUserAvatar } from '../../constants';
import type { UserProfile } from '../../types';

interface ProfileMigrationGateProps {
  profile: UserProfile;
  onSubmit: (updates: Partial<UserProfile>) => Promise<void>;
  onSignOut: () => void;
}

/**
 * Cổng cập nhật hồ sơ cũ: hồ sơ có giới tính "Khác" chọn lại Nam/Nữ.
 * Ghi một lần duy nhất; ảnh đại diện mặc định đổi theo giới tính mới, ảnh tự tải lên giữ nguyên.
 */
export function ProfileMigrationGate({ profile, onSubmit, onSignOut }: ProfileMigrationGateProps) {
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!gender) return;
    setSaving(true);
    setError(null);
    try {
      const avatar = profile.avatarUrl;
      const isDefaultAvatar =
        !avatar || avatar === DEFAULT_AVATARS.female || avatar === DEFAULT_AVATARS.male;
      await onSubmit({
        gender,
        ...(isDefaultAvatar ? { avatarUrl: resolveUserAvatar(gender) } : {}),
      });
    } catch {
      setError('Chưa lưu được. Vui lòng thử lại.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-fg flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-6 sm:p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">Cập nhật hồ sơ</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Chào {profile.displayName || 'bạn'}, bạn muốn xem đồ Nam hay Nữ?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Smart Wardrobe giờ gợi ý trang phục, bảng size và ma-nơ-canh riêng cho Nam và Nữ. Chọn một lựa
          chọn để tiếp tục; bạn có thể đổi lại bất cứ lúc nào trong Hồ sơ.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Giới tính">
          {GENDER_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={gender === g}
              onClick={() => setGender(g)}
              className={`h-14 rounded-card border text-base font-semibold transition-colors cursor-pointer ${
                gender === g
                  ? 'border-accent bg-accent-soft text-accent-text'
                  : 'border-line bg-surface-2 hover:border-fg-subtle'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!gender || saving}
          className="mt-6 h-11 w-full rounded-control bg-accent text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? 'Đang lưu…' : 'Tiếp tục'}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 h-10 w-full rounded-control text-sm font-medium text-fg-muted hover:text-fg cursor-pointer"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
