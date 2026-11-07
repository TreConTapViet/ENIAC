import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Sun,
  Moon,
  Check,
  User,
  Palette,
  Sparkles,
  LogOut,
  Save,
  Camera,
  Upload,
  Ruler,
} from 'lucide-react';
import {
  ACCENT_COLORS,
  DEFAULT_AVATARS,
  calculateRecommendedSize,
  resolveUserAvatar,
} from '../constants';
import { uploadImageToCloudinary } from '../services/integrations';
import { CUSTOM_COLOR_PRESETS, normalizeHexColor } from '../theme/themePrefs';
import { AccentColorKey, GenderOption, ThemeMode, UserProfile } from '../types';
import { GENDER_OPTIONS } from '../../shared/gender';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StylePicker, isValidStyleSelection } from './StylePicker';
import { migrateLegacyStyles } from '../../shared/styles';

interface ProfileDrawerProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  /** Chế độ và màu nhấn đang áp dụng; đổi ở đây là áp ngay cho cả app (không cần bấm Lưu) */
  themeMode: ThemeMode;
  accentColor: AccentColorKey;
  customAccentHex: string;
  onChangeTheme: (mode: ThemeMode) => void;
  onChangeAccent: (accent: AccentColorKey, customHex?: string) => void;
  onSignOut: () => void;
  /** Tài khoản khách: hiện ghi chú "chỉ lưu trên máy này" và nút nâng cấp thay cho email */
  isGuest?: boolean;
  onUpgradeAccount?: () => void;
  /** Bong bóng trợ lý Aura đang hiện hay đã ẩn */
  auraVisible?: boolean;
  onToggleAura?: (visible: boolean) => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  profile,
  onClose,
  onUpdateProfile,
  themeMode,
  accentColor,
  customAccentHex,
  onChangeTheme,
  onChangeAccent,
  onSignOut,
  isGuest = false,
  onUpgradeAccount,
  auraVisible = true,
  onToggleAura,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [gender, setGender] = useState<GenderOption>(profile.gender);
  // Đổi giới tính làm đổi gợi ý, bảng size và ma-nơ-canh: hỏi lại trước khi áp
  const [pendingGender, setPendingGender] = useState<GenderOption | null>(null);
  const applyGender = (g: GenderOption) => {
    setGender(g);
    // Giữ phong cách dùng chung + phong cách tự nhập, bỏ phong cách chỉ dành cho giới tính kia
    setFavoriteStyles((prev) => migrateLegacyStyles(prev, g));
    if (!avatarUrl || avatarUrl === DEFAULT_AVATARS.female || avatarUrl === DEFAULT_AVATARS.male) {
      setAvatarUrl(g === 'Nam' ? DEFAULT_AVATARS.male : DEFAULT_AVATARS.female);
    }
  };
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Body Measurements: Height (cm), Weight (kg), 3-Ring Measurements (Bust - Waist - Hip in cm)
  const [heightCm, setHeightCm] = useState<number>(
    profile.heightCm || (profile.gender === 'Nam' ? 172 : 162)
  );
  const [weightKg, setWeightKg] = useState<number>(
    profile.weightKg || (profile.gender === 'Nam' ? 65 : 50)
  );
  const [bustCm, setBustCm] = useState<number>(
    profile.bustCm || (profile.gender === 'Nam' ? 94 : 84)
  );
  const [waistCm, setWaistCm] = useState<number>(
    profile.waistCm || (profile.gender === 'Nam' ? 76 : 64)
  );
  const [hipCm, setHipCm] = useState<number>(
    profile.hipCm || (profile.gender === 'Nam' ? 94 : 90)
  );

  const [favoriteStyles, setFavoriteStyles] = useState<string[]>(() =>
    migrateLegacyStyles(profile.favoriteStyles, profile.gender)
  );
  const stylesValid = isValidStyleSelection(favoriteStyles);
  const [hexDraft, setHexDraft] = useState(customAccentHex);

  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accent = ACCENT_COLORS[accentColor];

  const applyCustomHex = (raw: string) => {
    const hex = normalizeHexColor(raw, '');
    if (hex) {
      setHexDraft(hex);
      onChangeAccent('custom', hex);
    }
  };
  const currentAvatarSrc = resolveUserAvatar(gender, avatarUrl);

  const sizeCalc = calculateRecommendedSize({
    heightCm,
    weightKg,
    bustCm,
    waistCm,
    hipCm,
    gender,
  });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadImageToCloudinary(file);
      setAvatarUrl(uploaded.url);
      await onUpdateProfile({ avatarUrl: uploaded.url });
    } catch (err) {
      console.error('Lỗi tải ảnh đại diện:', err);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectDefaultAvatar = async (targetGender: 'Nữ' | 'Nam') => {
    const defaultUrl =
      targetGender === 'Nam' ? DEFAULT_AVATARS.male : DEFAULT_AVATARS.female;
    setAvatarUrl(defaultUrl);
    await onUpdateProfile({ avatarUrl: defaultUrl });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stylesValid) return;
    setSaving(true);
    try {
      const finalAvatar = avatarUrl.trim() || resolveUserAvatar(gender);

      await onUpdateProfile({
        displayName: displayName.trim() || profile.displayName,
        gender,
        avatarUrl: finalAvatar,
        heightCm: Math.min(250, Math.max(100, Number(heightCm) || 162)),
        weightKg: Math.min(250, Math.max(25, Number(weightKg) || 50)),
        bustCm: Math.min(200, Math.max(40, Number(bustCm) || 84)),
        waistCm: Math.min(200, Math.max(35, Number(waistCm) || 64)),
        hipCm: Math.min(200, Math.max(40, Number(hipCm) || 90)),
        favoriteStyles,
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Thông tin cá nhân"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg h-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden cursor-default"
      >
        {/* Header — Chỉ để tiêu đề "Thông tin cá nhân" */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3.5">
            <img
              src={currentAvatarSrc}
              alt={displayName || 'Avatar'}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover border-2 border-stone-200 dark:border-stone-700 shadow-xs shrink-0"
            />
            <div>
              <h2 className="text-lg font-bold tracking-tight font-sans">Thông tin cá nhân</h2>
              {isGuest ? (
                <p className="text-xs text-fg-muted">
                  Tài khoản khách · chỉ lưu trên máy này
                  {onUpgradeAccount && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        onClick={onUpgradeAccount}
                        className="font-semibold text-accent-text underline-offset-2 hover:underline cursor-pointer"
                      >
                        Nâng cấp
                      </button>
                    </>
                  )}
                </p>
              ) : (
                <p className="text-xs text-fg-muted">{profile.email}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng (Hoặc nhấn ra vùng bên ngoài để tắt)"
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Ảnh đại diện (Avatar) & Hồ sơ người dùng */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <User className="w-4 h-4" />
                <span>Ảnh đại diện & Hồ sơ</span>
              </div>
              <span className="text-[11px] text-stone-400 dark:text-stone-500">
                Nhấn ra bên ngoài để tắt
              </span>
            </div>

            {/* Avatar Upload & 2 Default Male/Female Avatars */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative group shrink-0">
                    <img
                      src={currentAvatarSrc}
                      alt="Ảnh đại diện hiện tại"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-full object-cover border-2 border-stone-300 dark:border-stone-700 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer"
                      title="Tải ảnh lên"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Ảnh đại diện (Avatar)
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Tải ảnh cá nhân từ thiết bị hoặc chọn 1 trong 2 ảnh mặc định Nam / Nữ bên dưới.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${accent.bgClass}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar ? 'Đang tải ảnh...' : 'Tải ảnh lên'}</span>
                  </button>
                </div>
              </div>

              {/* Hai ảnh mặc định Nam / Nữ */}
              <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Hoặc chọn ảnh mặc định:
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectDefaultAvatar('Nữ')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      currentAvatarSrc === DEFAULT_AVATARS.female
                        ? `${accent.softBgClass} ${accent.borderClass} ${accent.textClass} ring-1 ring-current`
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <img
                      src={DEFAULT_AVATARS.female}
                      alt="Mặc định Nữ"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>Mặc định Nữ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDefaultAvatar('Nam')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      currentAvatarSrc === DEFAULT_AVATARS.male
                        ? `${accent.softBgClass} ${accent.borderClass} ${accent.textClass} ring-1 ring-current`
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <img
                      src={DEFAULT_AVATARS.male}
                      alt="Mặc định Nam"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>Mặc định Nam</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Giới tính
                </label>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Giới tính">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={gender === g}
                      onClick={() => {
                        if (g !== gender) setPendingGender(g);
                      }}
                      className={`h-10 px-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                        gender === g
                          ? `${accent.bgClass} border-transparent shadow-xs`
                          : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Thông số cơ thể: Chiều cao, Cân nặng & Số đo 3 vòng */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <Ruler className="w-4 h-4" />
                <span>Chiều cao, cân nặng & số đo</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${accent.softBgClass} ${accent.textClass}`}
              >
                Size gợi ý: {sizeCalc.overallSize}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Chiều cao (cm)
                </label>
                <input
                  type="number"
                  min={100}
                  max={250}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm font-mono focus:outline-none focus:border-stone-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Cân nặng (kg)
                </label>
                <input
                  type="number"
                  min={25}
                  max={250}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm font-mono focus:outline-none focus:border-stone-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                {gender === 'Nam'
                  ? 'Vòng ngực - Vòng eo - Vòng hông (cm)'
                  : 'Số đo 3 vòng (Vòng 1 - Vòng 2 - Vòng 3 tính bằng cm)'}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <span className="text-xs text-stone-500 block mb-1">{gender === 'Nam' ? 'Ngực' : 'Vòng 1 (Ngực)'}</span>
                  <input
                    type="number"
                    min={40}
                    max={200}
                    value={bustCm}
                    onChange={(e) => setBustCm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm font-mono focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-stone-500 block mb-1">{gender === 'Nam' ? 'Eo' : 'Vòng 2 (Eo)'}</span>
                  <input
                    type="number"
                    min={35}
                    max={200}
                    value={waistCm}
                    onChange={(e) => setWaistCm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm font-mono focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-stone-500 block mb-1">{gender === 'Nam' ? 'Hông' : 'Vòng 3 (Hông)'}</span>
                  <input
                    type="number"
                    min={40}
                    max={200}
                    value={hipCm}
                    onChange={(e) => setHipCm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm font-mono focus:outline-none focus:border-stone-500"
                  />
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-xs leading-relaxed ${accent.softBgClass}`}>
              <span className={`font-bold ${accent.textClass}`}>Tư vấn kích cỡ tự động: </span>
              <span className="text-stone-700 dark:text-stone-300">{sizeCalc.fitAdvice}</span>
            </div>
          </div>

          {/* 3. Chế độ sáng / Chế độ tối & Màu sắc giao diện */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <Palette className="w-4 h-4" />
              <span>Giao diện & Màu sắc</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">
                Chế độ hiển thị
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onChangeTheme('light')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    themeMode === 'light'
                      ? `${accent.bgClass} border-transparent shadow-xs`
                      : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Chế độ sáng</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTheme('dark')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    themeMode === 'dark'
                      ? `${accent.bgClass} border-transparent shadow-xs`
                      : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Chế độ tối</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">
                Màu sắc chủ đạo
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(ACCENT_COLORS) as AccentColorKey[])
                  .filter((key) => key !== 'custom')
                  .map((key) => {
                  const item = ACCENT_COLORS[key];
                  const active = accentColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onChangeAccent(key)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? 'border-stone-900 dark:border-white bg-stone-100 dark:bg-stone-800'
                          : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-950'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: item.hex }}
                      />
                      <span className="truncate">{item.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Màu tuỳ chọn bằng mã hex (từ bản của nhóm, commit 0c35c38) */}
              <div
                className={`mt-3 rounded-xl border p-3 space-y-2.5 ${
                  accentColor === 'custom'
                    ? 'border-stone-900 dark:border-white'
                    : 'border-stone-200 dark:border-stone-800'
                }`}
              >
                <p className="text-xs font-medium text-stone-700 dark:text-stone-300">Màu tuỳ chọn</p>
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      title={preset.label}
                      aria-label={preset.label}
                      onClick={() => applyCustomHex(preset.hex)}
                      className={`w-7 h-7 rounded-full border border-black/10 cursor-pointer ${
                        accentColor === 'custom' && customAccentHex === preset.hex
                          ? 'ring-2 ring-offset-2 ring-stone-900 dark:ring-white dark:ring-offset-stone-900'
                          : ''
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Chọn màu"
                    value={normalizeHexColor(hexDraft, customAccentHex)}
                    onChange={(e) => applyCustomHex(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-stone-200 dark:border-stone-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    aria-label="Mã màu hex"
                    value={hexDraft}
                    maxLength={7}
                    onChange={(e) => setHexDraft(e.target.value)}
                    onBlur={(e) => applyCustomHex(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCustomHex(hexDraft);
                      }
                    }}
                    placeholder="#c59b27"
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-transparent text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Phong cách trang phục yêu thích (Chỉ gợi ý những bộ đồ theo phong cách đã chọn) */}
          <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <Sparkles className="w-4 h-4" />
                <span>Phong cách yêu thích</span>
              </div>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Gợi ý phối đồ chỉ lấy những bộ thuộc các phong cách bạn chọn.
            </p>
            <StylePicker gender={gender} value={favoriteStyles} onChange={setFavoriteStyles} compact />
          </div>

          {onToggleAura && (
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <div>
                <p id="aura-toggle-label" className="text-sm font-semibold">Bong bóng trợ lý Aura</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Hiện nút Aura nổi trên màn hình để hỏi phối đồ nhanh.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={auraVisible}
                aria-labelledby="aura-toggle-label"
                onClick={() => onToggleAura(!auraVisible)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer ${
                  auraVisible ? 'bg-accent' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    auraVisible ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {savedToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Đã cập nhật thông tin cá nhân thành công!</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>

            <button
              type="submit"
              disabled={saving || !stylesValid}
              title={stylesValid ? undefined : 'Chọn từ 1 đến 8 phong cách'}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${accent.bgClass}`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </motion.div>

      {/* Bọc để cú bấm trong hộp xác nhận không đóng luôn khung Hồ sơ */}
      <div onClick={(e) => e.stopPropagation()} className="cursor-default">
        <ConfirmDialog
          open={pendingGender !== null}
          title={`Đổi giới tính sang ${pendingGender ?? ''}?`}
          description="Gợi ý phối đồ, bảng size và ma-nơ-canh sẽ đổi theo giới tính mới. Thay đổi được lưu khi bạn bấm “Lưu thay đổi”."
          confirmLabel="Đổi giới tính"
          onCancel={() => setPendingGender(null)}
          onConfirm={() => {
            if (pendingGender) applyGender(pendingGender);
            setPendingGender(null);
          }}
        />
      </div>
    </div>
  );
};
