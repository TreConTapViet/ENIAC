import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Check, Sparkles, Wand2 } from 'lucide-react';
import {
  ACCENT_COLORS,
  FASHION_STYLES,
  GARMENT_CATEGORIES,
  OCCASION_TYPES,
  WEATHER_SEASONS,
} from '../constants';
import {
  AccentColorKey,
  GarmentCategory,
  OccasionType,
  WeatherSeason,
} from '../types';
import { uploadImageToCloudinary } from '../services/integrations';

interface AddGarmentModalProps {
  accentColor: AccentColorKey;
  onClose: () => void;
  onAddGarment: (item: {
    name: string;
    category: GarmentCategory;
    styleTag: string;
    color: string;
    season: WeatherSeason;
    occasion: OccasionType;
    imageUrl: string;
    favorite: boolean;
  }) => Promise<void>;
}

export const AddGarmentModal: React.FC<AddGarmentModalProps> = ({
  accentColor,
  onClose,
  onAddGarment,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GarmentCategory>('Áo');
  const [styleTag, setStyleTag] = useState(FASHION_STYLES[0].name);
  const [color, setColor] = useState('Trắng Kem');
  const [season, setSeason] = useState<WeatherSeason>('Mọi thời tiết');
  const [occasion, setOccasion] = useState<OccasionType>('Đi làm / Đi học');
  const [imageUrl, setImageUrl] = useState(FASHION_STYLES[0].image);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI Create & Edit Image state
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAiImage, setGeneratingAiImage] = useState(false);

  const accent = ACCENT_COLORS[accentColor] || ACCENT_COLORS.amber;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('Đang xử lý ảnh trang phục...');
    try {
      const result = await uploadImageToCloudinary(file);
      setImageUrl(result.url);
      setUploadStatus('Đã tối ưu hóa và tải ảnh trang phục thành công!');
    } catch (_error) {
      setUploadStatus('Không thể xử lý file ảnh. Vui lòng thử ảnh khác.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAiGarmentImage = async () => {
    if (!aiPrompt.trim() || generatingAiImage) return;
    setGeneratingAiImage(true);
    setUploadStatus('AI đang thiết kế hình ảnh trang phục...');
    try {
      const isDataUrl = imageUrl.startsWith('data:image/');
      const response = await fetch('/api/aura/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          base64Image: isDataUrl ? imageUrl : undefined,
          aspectRatio: '4:3',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || 'Không thể tạo ảnh AI lúc này.');
      }
      setImageUrl(data.imageUrl);
      if (!name.trim()) {
        setName(aiPrompt.trim().slice(0, 60));
      }
      setUploadStatus('Đã tạo hình ảnh trang phục bằng AI thành công!');
    } catch (err: any) {
      setUploadStatus(err?.message || 'Tạo ảnh AI chưa thành công, vui lòng thử lại.');
    } finally {
      setGeneratingAiImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onAddGarment({
        name: name.trim(),
        category,
        styleTag,
        color: color.trim() || 'Trung tính',
        season,
        occasion,
        imageUrl,
        favorite: true,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden cursor-default"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${accent.textClass}`} />
            <h3 className="text-base font-bold font-sans">
              Thêm Trang Phục Mới Vào Tủ Đồ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image Preview, Upload & AI Image Generation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              <img
                src={imageUrl}
                alt="Preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="sm:col-span-2 space-y-2.5">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Đang tải ảnh...' : 'Tải ảnh từ thiết bị'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* AI Create / Edit Garment Image Prompt */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Hoặc mô tả để AI tạo/sửa ảnh (VD: Áo blazer kem Hàn Quốc)..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs"
                />
                <button
                  type="button"
                  disabled={generatingAiImage || !aiPrompt.trim()}
                  onClick={handleGenerateAiGarmentImage}
                  className={`px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1 shrink-0 disabled:opacity-40 cursor-pointer ${accent.bgClass}`}
                >
                  <Wand2 className={`w-3.5 h-3.5 ${generatingAiImage ? 'animate-spin' : ''}`} />
                  <span>{generatingAiImage ? 'Đang tạo...' : 'Tạo ảnh AI'}</span>
                </button>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {FASHION_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setImageUrl(st.image);
                      setStyleTag(st.name);
                    }}
                    className={`w-9 h-9 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                      imageUrl === st.image ? 'border-amber-500' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={st.image}
                      alt={st.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {uploadStatus && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadStatus}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Tên món đồ *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Áo Sơ Mi Lụa Trắng"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Danh mục
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GarmentCategory)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm"
              >
                {GARMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Phong cách
              </label>
              <select
                value={styleTag}
                onChange={(e) => setStyleTag(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm"
              >
                {FASHION_STYLES.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Màu sắc chủ đạo
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ví dụ: Đen, Beige, Xanh Navy"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Thời tiết phù hợp
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value as WeatherSeason)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm"
              >
                {WEATHER_SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Dịp mặc phù hợp
              </label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value as OccasionType)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm"
              >
                {OCCASION_TYPES.map((occ) => (
                  <option key={occ} value={occ}>
                    {occ}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || uploading || generatingAiImage}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-semibold shadow-sm cursor-pointer ${accent.bgClass}`}
            >
              {submitting ? 'Đang lưu vào tủ đồ...' : 'Lưu vào Tủ Đồ'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
