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
  FASHION_STYLES,
  calculateRecommendedSize,
  resolveUserAvatar,
} from '../constants';
import { uploadImageToCloudinary } from '../services/integrations';
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

  const [favoriteStyles, setFavoriteStyles] = useState<string[]>(profile.favoriteStyles || []);
  const [accentColor, setAccentColor] = useState<AccentColorKey>(profile.accentColor || 'amber');
  const [themeMode, setThemeMode] = useState<ThemeMode>(profile.themeMode || 'dark');

  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accent = ACCENT_COLORS[accentColor] || ACCENT_COLORS.amber;
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

  const toggleStyle = (styleName: string) => {
    const styleObj = FASHION_STYLES.find(
      (s) => s.name === styleName || s.aliases?.includes(styleName)
    );
    const aliases = styleObj ? [styleObj.name, ...(styleObj.aliases || [])] : [styleName];
    setFavoriteStyles((prev) => {
      const isCurrentlySelected = prev.some((s) => aliases.includes(s));
      if (isCurrentlySelected) {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => !aliases.includes(s));
      }
      return [...prev, styleName];
    });
  };

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
        accentColor,
        themeMode,
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
              <p className="text-xs text-stone-500 dark:text-stone-400">{profile.email}</p>
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
                <div className="grid grid-cols-3 gap-2">
                  {(['Nữ', 'Nam', 'Khác'] as GenderOption[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGender(g);
                        if (
                          !avatarUrl ||
                          avatarUrl === DEFAULT_AVATARS.female ||
                          avatarUrl === DEFAULT_AVATARS.male
                        ) {
                          setAvatarUrl(
                            g === 'Nam' ? DEFAULT_AVATARS.male : DEFAULT_AVATARS.female
                          );
                        }
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
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
          </div>

          {/* 2. Thông số cơ thể: Chiều cao, Cân nặng & Số đo 3 vòng */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <Ruler className="w-4 h-4" />
                <span>Chiều cao, Cân nặng & Số đo 3 vòng</span>
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
                Số đo 3 vòng (Vòng 1 - Vòng 2 - Vòng 3 tính bằng cm)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <span className="text-[11px] text-stone-500 block mb-1">Vòng 1 (Ngực)</span>
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
                  <span className="text-[11px] text-stone-500 block mb-1">Vòng 2 (Eo)</span>
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
                  <span className="text-[11px] text-stone-500 block mb-1">Vòng 3 (Hông)</span>
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
                  onClick={() => setThemeMode('light')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    themeMode === 'light'
                      ? `${accent.bgClass} text-white border-transparent shadow-xs`
                      : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Chế độ sáng</span>
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
                  <span>Chế độ tối</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">
                Màu sắc chủ đạo
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

          {/* 4. Phong cách trang phục yêu thích (Chỉ gợi ý những bộ đồ theo phong cách đã chọn) */}
          <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <Sparkles className="w-4 h-4" />
                <span>Phong cách yêu thích ({favoriteStyles.length} đã chọn)</span>
              </div>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Hệ thống sẽ chỉ gợi ý những bộ quần áo / váy thuộc các phong cách mà bạn chọn bên dưới:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {FASHION_STYLES.map((style) => {
                const selected = favoriteStyles.some(
                  (fav) =>
                    fav === style.name ||
                    fav === style.shortTag ||
                    style.aliases?.includes(fav) ||
                    fav.toLowerCase() === style.name.toLowerCase()
                );
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleStyle(style.name)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                      selected
                        ? `${accent.softBgClass} ${accent.borderClass} ${accent.textClass}`
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-950'
                    }`}
                  >
                    <img
                      src={style.image}
                      alt={style.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-stone-100"
                    />
                    <span className="line-clamp-2 flex-1 leading-tight font-semibold">
                      {style.name}
                    </span>
                    {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

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
