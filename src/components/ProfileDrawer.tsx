import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Sun,
  Moon,
  Check,
  CloudUpload,
  User,
  Palette,
  Sparkles,
  LogOut,
  Save,
} from 'lucide-react';
import { ACCENT_COLORS, FASHION_STYLES } from '../constants';
import { AccentColorKey, GenderOption, ThemeMode, UserProfile } from '../types';

interface ProfileDrawerProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onSignOut: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  profile,
  onClose,
  onUpdateProfile,
  onSignOut,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [gender, setGender] = useState<GenderOption>(profile.gender);
  const [favoriteStyles, setFavoriteStyles] = useState<string[]>(profile.favoriteStyles || []);
  const [accentColor, setAccentColor] = useState<AccentColorKey>(profile.accentColor || 'amber');
  const [themeMode, setThemeMode] = useState<ThemeMode>(profile.themeMode || 'dark');
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(
    profile.cloudinaryCloudName || localStorage.getItem('sw_cloudinary_cloud_name') || ''
  );
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState(
    profile.cloudinaryUploadPreset || localStorage.getItem('sw_cloudinary_upload_preset') || ''
  );

  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const accent = ACCENT_COLORS[accentColor] || ACCENT_COLORS.amber;

  const toggleStyle = (styleName: string) => {
    setFavoriteStyles((prev) =>
      prev.includes(styleName)
        ? prev.length > 1
          ? prev.filter((s) => s !== styleName)
          : prev
        : [...prev, styleName]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem('sw_cloudinary_cloud_name', cloudinaryCloudName.trim());
      localStorage.setItem('sw_cloudinary_upload_preset', cloudinaryUploadPreset.trim());

      await onUpdateProfile({
        displayName: displayName.trim() || profile.displayName,
        gender,
        favoriteStyles,
        accentColor,
        themeMode,
        cloudinaryCloudName: cloudinaryCloudName.trim(),
        cloudinaryUploadPreset: cloudinaryUploadPreset.trim(),
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg h-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-xs ${accent.bgClass}`}
            >
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight font-sans">Thông tin cá nhân & Giao diện</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">{profile.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Tên & Giới tính */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <User className="w-4 h-4" />
              <span>Hồ sơ người dùng</span>
            </div>

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
                Giới tính (Để AI Aura tối ưu phom dáng)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['Nữ', 'Nam', 'Khác'] as GenderOption[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      gender === g
                        ? `${accent.bgClass} text-white border-transparent shadow-xs`
                        : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Chế độ Sáng / Tối (Tiết kiệm pin) & Màu sắc chủ đạo */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <Palette className="w-4 h-4" />
              <span>Màu sắc giao diện & Chế độ tiết kiệm pin</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">
                Chế độ hiển thị
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    themeMode === 'light'
                      ? `${accent.bgClass} text-white border-transparent shadow-xs`
                      : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Chế độ Sáng (Light)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    themeMode === 'dark'
                      ? `${accent.bgClass} text-white border-transparent shadow-xs`
                      : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Chế độ Tối (Tiết kiệm pin)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">
                Đổi màu giao diện theo màu sắc yêu thích
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(ACCENT_COLORS) as AccentColorKey[]).map((key) => {
                  const item = ACCENT_COLORS[key];
                  const active = accentColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAccentColor(key)}
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
            </div>
          </div>

          {/* 3. Phong cách trang phục yêu thích */}
          <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <Sparkles className="w-4 h-4" />
              <span>Phong cách trang phục yêu thích</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {FASHION_STYLES.map((style) => {
                const selected = favoriteStyles.includes(style.name);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleStyle(style.name)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                      selected
                        ? `${accent.softBgClass} ${accent.borderClass} ${accent.textClass}`
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <span className="truncate pr-2">{style.name}</span>
                    {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Tích hợp Cloudinary quản lý ảnh quần áo */}
          <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <CloudUpload className="w-4 h-4" />
              <span>Tích hợp Cloudinary (Lưu trữ hình ảnh quần áo)</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Nhập Cloud Name và Unsigned Upload Preset để tự động tải ảnh trang phục lên đám mây Cloudinary của bạn.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Cloudinary Cloud Name</label>
                <input
                  type="text"
                  value={cloudinaryCloudName}
                  onChange={(e) => setCloudinaryCloudName(e.target.value)}
                  placeholder="Ví dụ: dxyz12345"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Unsigned Upload Preset</label>
                <input
                  type="text"
                  value={cloudinaryUploadPreset}
                  onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                  placeholder="Ví dụ: smart_wardrobe_preset"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs"
                />
              </div>
            </div>
          </div>

          {savedToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Đã cập nhật hồ sơ & giao diện thành công!</span>
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
              disabled={saving}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${accent.bgClass}`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
