import { useRef, useState } from 'react';
import {
  X,
  Upload,
  Check,
  User as UserIcon,
  Camera,
  Sparkles,
  Ruler,
} from 'lucide-react';
import type { Profile } from '@/lib/profileStore';
import { analyzeBody } from '@/lib/bodyAnalysis';

export interface SuggestedAvatarOption {
  id: string;
  label: string;
  genderHint: 'male' | 'female';
  url: string;
}

export const SUGGESTED_AVATARS: SuggestedAvatarOption[] = [
  {
    id: 'avatar_1',
    label: 'Nam năng động (Cam)',
    genderHint: 'male',
    url: '/assets/avatars/avatar_1.png',
  },
  {
    id: 'avatar_2',
    label: 'Nữ thanh lịch (Xanh nhạt)',
    genderHint: 'female',
    url: '/assets/avatars/avatar_2.png',
  },
  {
    id: 'avatar_3',
    label: 'Nam trẻ trung (Xám)',
    genderHint: 'male',
    url: '/assets/avatars/avatar_3.png',
  },
  {
    id: 'avatar_4',
    label: 'Nữ công sở (Xanh ngọc)',
    genderHint: 'female',
    url: '/assets/avatars/avatar_4.png',
  },
  {
    id: 'avatar_5',
    label: 'Quý ông cổ điển (Nâu)',
    genderHint: 'male',
    url: '/assets/avatars/avatar_5.png',
  },
  {
    id: 'avatar_6',
    label: 'Nữ cá tính (Xanh lam)',
    genderHint: 'female',
    url: '/assets/avatars/avatar_6.png',
  },
  {
    id: 'avatar_7',
    label: 'Nữ dịu dàng (Vàng)',
    genderHint: 'female',
    url: '/assets/avatars/avatar_7.png',
  },
  {
    id: 'avatar_8',
    label: 'Nam lịch lãm (Cà vạt)',
    genderHint: 'male',
    url: '/assets/avatars/avatar_8.png',
  },
  {
    id: 'avatar_9',
    label: 'Quý ông doanh nhân (Vest)',
    genderHint: 'male',
    url: '/assets/avatars/avatar_9.png',
  },
];

interface ProfileEditModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: Profile) => void;
}

export default function ProfileEditModal({
  profile,
  isOpen,
  onClose,
  onSave,
}: ProfileEditModalProps) {
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState(String(profile.age || 25));
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender);
  const [heightCm, setHeightCm] = useState(String(profile.height_cm || 160));
  const [weightKg, setWeightKg] = useState(String(profile.weight_kg || 45));
  const [bustCm, setBustCm] = useState(
    profile.bust_cm ? String(profile.bust_cm) : '88'
  );
  const [waistCm, setWaistCm] = useState(
    profile.waist_cm ? String(profile.waist_cm) : '66'
  );
  const [hipCm, setHipCm] = useState(
    profile.hip_cm ? String(profile.hip_cm) : '90'
  );
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    profile.avatar_url
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }
    setError(null);
    setUploadingAvatar(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 160;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Center-crop square
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
          setAvatarUrl(dataUrl);
        }
        setUploadingAvatar(false);
      };
      img.onerror = () => {
        setError('Không thể đọc hình ảnh này. Vui lòng thử ảnh khác.');
        setUploadingAvatar(false);
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setError('Lỗi tải ảnh từ thiết bị.');
      setUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedHeight = Math.round(Number(heightCm) || 0);
    const parsedWeight = Math.round(Number(weightKg) || 0);
    const parsedAge = Math.min(120, Math.max(5, Math.round(Number(age) || 25)));

    if (parsedHeight < 80 || parsedHeight > 250) {
      setError('Chiều cao cần nằm trong khoảng 80cm – 250cm.');
      return;
    }
    if (parsedWeight < 20 || parsedWeight > 300) {
      setError('Cân nặng cần nằm trong khoảng 20kg – 300kg.');
      return;
    }

    const parsedBust =
      gender === 'female'
        ? Math.min(200, Math.max(40, Math.round(Number(bustCm) || 88)))
        : null;
    const parsedWaist =
      gender === 'female'
        ? Math.min(180, Math.max(35, Math.round(Number(waistCm) || 66)))
        : null;
    const parsedHip =
      gender === 'female'
        ? Math.min(200, Math.max(45, Math.round(Number(hipCm) || 90)))
        : null;

    const computed = analyzeBody({
      gender,
      height_cm: parsedHeight,
      weight_kg: parsedWeight,
      waist_cm: parsedWaist,
      hip_cm: parsedHip,
      bust_cm: parsedBust,
    });

    const updated: Profile = {
      ...profile,
      name: name.trim() || 'Người dùng',
      age: parsedAge,
      gender,
      height_cm: parsedHeight,
      weight_kg: parsedWeight,
      waist_cm: parsedWaist,
      hip_cm: parsedHip,
      bust_cm: parsedBust,
      bmi: computed.bmi,
      body_type: computed.bodyType,
      avatar_url: avatarUrl,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-rose-100 bg-white p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-800">
                Chỉnh sửa Hồ sơ &amp; Ảnh đại diện
              </h3>
              <p className="text-xs text-stone-500">
                Tự động đồng bộ với Ma-nơ-canh 3D &amp; tài khoản Firebase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-5">
          {/* Avatar Section */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name || 'Avatar'}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 rounded-full border-2 border-rose-400 object-cover bg-white shadow-sm"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 text-2xl font-bold text-white shadow-sm">
                    {(name || 'K')[0]?.toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Tải ảnh đại diện của bạn lên"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-stone-900 text-white shadow-md transition hover:bg-rose-600 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="text-sm font-bold text-stone-800">
                  Ảnh đại diện cá nhân
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  Tải ảnh từ thiết bị của bạn hoặc chọn nhanh bộ avatar minh họa bên dưới
                </p>
                <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-600 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>
                      {uploadingAvatar ? 'Đang xử lý ảnh...' : 'Tải ảnh cá nhân lên'}
                    </span>
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(undefined)}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
                    >
                      Dùng chữ cái tên
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Suggested Avatars Grid (from user's uploaded avatar collection) */}
            <div className="mt-4 border-t border-rose-100/80 pt-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                  <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                  Ảnh đại diện gợi ý từ web (Nhấn để chọn):
                </span>
                <span className="text-[11px] text-stone-400">
                  9 mẫu nhân vật
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-9 gap-2.5">
                {SUGGESTED_AVATARS.map((item) => {
                  const selected = avatarUrl === item.url;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAvatarUrl(item.url)}
                      title={item.label}
                      className={`group relative flex flex-col items-center rounded-2xl p-1.5 transition cursor-pointer ${
                        selected
                          ? 'bg-rose-100 ring-2 ring-rose-500 shadow-xs'
                          : 'bg-white/80 hover:bg-white hover:ring-2 hover:ring-rose-200'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={item.label}
                        className="h-11 w-11 rounded-full object-contain transition group-hover:scale-105"
                      />
                      {selected && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Personal & Body Measurements Section */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
              <Ruler className="h-3.5 w-3.5 text-rose-500" />
              <span>Thông tin &amp; Số đo cơ thể</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên của bạn"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Tuổi
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min={5}
                  max={120}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Giới tính
                </label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-stone-200 bg-stone-50 p-1">
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                      gender === 'female'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-stone-600 hover:bg-white'
                    }`}
                  >
                    ♀ Nữ
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                      gender === 'male'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-stone-600 hover:bg-white'
                    }`}
                  >
                    ♂ Nam
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Chiều cao (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  min={80}
                  max={250}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Cân nặng (kg)
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  min={20}
                  max={300}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>
            </div>

            {gender === 'female' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">
                    Vòng ngực (cm)
                  </label>
                  <input
                    type="number"
                    value={bustCm}
                    onChange={(e) => setBustCm(e.target.value)}
                    min={40}
                    max={200}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">
                    Vòng eo (cm)
                  </label>
                  <input
                    type="number"
                    value={waistCm}
                    onChange={(e) => setWaistCm(e.target.value)}
                    min={35}
                    max={180}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">
                    Vòng hông (cm)
                  </label>
                  <input
                    type="number"
                    value={hipCm}
                    onChange={(e) => setHipCm(e.target.value)}
                    min={45}
                    max={200}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="rounded-xl bg-rose-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:bg-rose-600 cursor-pointer"
            >
              Lưu hồ sơ &amp; Cập nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
