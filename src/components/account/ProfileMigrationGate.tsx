import React, { useState } from 'react';
import { GENDER_OPTIONS, normalizeGender, type GenderOption } from '../../../shared/gender';
import { migrateLegacyStyles } from '../../../shared/styles';
import { DEFAULT_AVATARS, resolveUserAvatar } from '../../constants';
import type { UserProfile } from '../../types';
import { StylePicker, isValidStyleSelection } from '../StylePicker';

interface ProfileMigrationGateProps {
  profile: UserProfile;
  onSubmit: (updates: Partial<UserProfile>) => Promise<void>;
  onSignOut: () => void;
}

/**
 * Cổng cập nhật hồ sơ cũ:
 *  1. Giới tính "Khác" → chọn lại Nam/Nữ (bỏ qua nếu đã hợp lệ).
 *  2. Xem lại phong cách: tên cũ đã được đổi sang id, chọn lại cho đủ 1–8.
 * Ghi một lần duy nhất (luật Firestore kiểm tra cả tài liệu sau khi gộp). Ảnh đại diện mặc định
 * đổi theo giới tính mới; ảnh tự tải lên giữ nguyên.
 */
export function ProfileMigrationGate({ profile, onSubmit, onSignOut }: ProfileMigrationGateProps) {
  const initialGender = normalizeGender(profile.gender);
  const [gender, setGender] = useState<GenderOption | null>(initialGender);
  const [step, setStep] = useState<'gender' | 'styles'>(initialGender ? 'styles' : 'gender');
  const [styles, setStyles] = useState<string[]>(() =>
    initialGender ? migrateLegacyStyles(profile.favoriteStyles, initialGender) : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseGender = (g: GenderOption) => {
    setGender(g);
    setStyles(migrateLegacyStyles(profile.favoriteStyles, g));
  };

  const submit = async () => {
    if (!gender || !isValidStyleSelection(styles)) return;
    setSaving(true);
    setError(null);
    try {
      const avatar = profile.avatarUrl;
      const isDefaultAvatar =
        !avatar || avatar === DEFAULT_AVATARS.female || avatar === DEFAULT_AVATARS.male;
      await onSubmit({
        gender,
        favoriteStyles: styles,
        ...(isDefaultAvatar ? { avatarUrl: resolveUserAvatar(gender) } : {}),
      });
    } catch {
      setError('Chưa lưu được. Vui lòng thử lại.');
      setSaving(false);
    }
  };

  const primaryBtn =
    'mt-6 h-11 w-full rounded-control bg-accent text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed';

  return (
    <div className="min-h-screen bg-canvas text-fg flex items-center justify-center p-4">
      <div
        className={`w-full rounded-panel border border-line bg-surface p-6 sm:p-8 shadow-card ${
          step === 'styles' ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">
          Cập nhật hồ sơ {initialGender ? '' : `· Bước ${step === 'gender' ? 1 : 2}/2`}
        </p>

        {step === 'gender' ? (
          <>
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
                  onClick={() => chooseGender(g)}
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
            <button type="button" onClick={() => setStep('styles')} disabled={!gender} className={primaryBtn}>
              Tiếp tục
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Xem lại phong cách yêu thích</h1>
            <p className="mt-3 mb-5 text-sm leading-relaxed text-fg-muted">
              Danh sách phong cách đã được làm mới theo giới tính {gender}. Những lựa chọn cũ còn phù hợp đã
              được giữ lại; bạn có thể chọn thêm hoặc tự nhập phong cách riêng.
            </p>
            {gender && <StylePicker gender={gender} value={styles} onChange={setStyles} />}
            {error && (
              <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-300">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={saving || !isValidStyleSelection(styles)}
              className={primaryBtn}
            >
              {saving ? 'Đang lưu…' : 'Lưu và vào Smart Wardrobe'}
            </button>
            {!initialGender && (
              <button
                type="button"
                onClick={() => setStep('gender')}
                className="mt-3 h-10 w-full rounded-control text-sm font-medium text-fg-muted hover:text-fg cursor-pointer"
              >
                Quay lại chọn giới tính
              </button>
            )}
          </>
        )}

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
