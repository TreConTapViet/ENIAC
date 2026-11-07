import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import { FASHION_STYLES } from '../constants';
import { GenderOption } from '../types';

interface OnboardingModalProps {
  initialName?: string;
  onComplete: (data: {
    displayName: string;
    gender: GenderOption;
    favoriteStyles: string[];
  }) => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialName = '',
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState(initialName);
  const [nameTouched, setNameTouched] = useState(false);
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isNameInvalid = nameTouched && displayName.trim().length === 0;

  const handleNextFromName = (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    if (displayName.trim().length === 0) return;
    setStep(2);
  };

  const handleSelectGender = (chosen: GenderOption) => {
    setGender(chosen);
    setStep(3);
  };

  const toggleStyleSelection = (styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName)
        ? prev.filter((item) => item !== styleName)
        : [...prev, styleName]
    );
  };

  const handleFinish = async () => {
    if (selectedStyles.length < 3 || !gender) return;
    setSubmitting(true);
    try {
      await onComplete({
        displayName: displayName.trim(),
        gender,
        favoriteStyles: selectedStyles,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full ${
          step === 3 ? 'max-w-3xl' : 'max-w-lg'
        } bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-10 transition-all`}
      >
        {/* Top Navigation & Progress Bar (Matching reference screenshots) */}
        <div className="relative flex items-center justify-center mb-8">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
              className="absolute left-0 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Segmented Red/Coral Progress Indicator */}
          <div className="w-32 h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-300"
              style={{
                width: step === 1 ? '33%' : step === 2 ? '66%' : '100%',
              }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Điền tên (Matches Screenshot 1) */}
          {step === 1 && (
            <motion.form
              key="step-1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleNextFromName}
              className="max-w-md mx-auto"
            >
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white leading-snug mb-3 font-sans">
                Rất vui được gặp bạn!
                <br />
                Bạn tên là gì?
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
                Câu trả lời của bạn cho những câu hỏi tiếp theo sẽ giúp Smart Wardrobe và AI Aura tìm ra những ý tưởng phối đồ phù hợp nhất cho bạn
              </p>

              <div
                className={`rounded-2xl border-2 px-4 py-3 transition-colors ${
                  isNameInvalid
                    ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20'
                    : 'border-blue-600 bg-white dark:bg-stone-950'
                }`}
              >
                <label className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1">
                  Tên
                </label>
                <input
                  type="text"
                  autoFocus
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (!nameTouched) setNameTouched(true);
                  }}
                  placeholder="Tên của bạn"
                  className="w-full bg-transparent text-base text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
                />
              </div>

              {isNameInvalid && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Và tên của bạn là...?</span>
                </div>
              )}

              <button
                type="submit"
                disabled={displayName.trim().length === 0}
                className={`w-full mt-8 py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all ${
                  displayName.trim().length > 0
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                Tiếp tục
              </button>
            </motion.form>
          )}

          {/* STEP 2: Chọn giới tính (Matches Screenshot 2) */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto"
            >
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white leading-snug mb-2 font-sans">
                Hãy giới thiệu về bản thân mình
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-7">
                Thông tin này sẽ luôn ở chế độ riêng tư và giúp AI Aura gợi ý phom dáng chuẩn xác
              </p>

              <div className="space-y-3.5">
                {(['Nữ', 'Nam', 'Khác'] as GenderOption[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelectGender(item)}
                    className={`w-full py-4 px-6 rounded-2xl text-base font-semibold transition-all cursor-pointer ${
                      gender === item
                        ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-md'
                        : 'bg-stone-200/80 hover:bg-stone-300/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Chọn phong cách thời trang yêu thích (Matches Screenshot 3) */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white mb-2 font-sans">
                Bạn yêu thích phong cách thời trang nào?
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
                Chọn ít nhất 3 phong cách để Smart Wardrobe và AI Aura cá nhân hóa tủ đồ cho{' '}
                <span className="font-semibold text-stone-900 dark:text-white">{displayName}</span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-105 overflow-y-auto pr-1">
                {FASHION_STYLES.map((style) => {
                  const isSelected = selectedStyles.some(
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
                      onClick={() => toggleStyleSelection(style.name)}
                      className="group text-left focus:outline-none cursor-pointer"
                    >
                      <div
                        className={`relative aspect-[4/3.6] w-full rounded-2xl overflow-hidden mb-2 border-2 bg-[#F8F7F4] transition-all ${
                          isSelected
                            ? 'border-red-600 ring-2 ring-red-500/30 scale-[0.98]'
                            : 'border-stone-200 dark:border-stone-800 group-hover:scale-[1.02]'
                        }`}
                      >
                        <img
                          src={style.image}
                          alt={style.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                        />
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                        {style.name}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                        {style.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={selectedStyles.length < 3 || submitting}
                onClick={handleFinish}
                className={`w-full mt-6 py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all ${
                  selectedStyles.length >= 3
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                {submitting
                  ? 'Đang khởi tạo tủ đồ thông minh...'
                  : selectedStyles.length < 3
                  ? `Chọn 3 trở lên để tiếp tục (Đã chọn ${selectedStyles.length}/3)`
                  : 'Hoàn tất & Vào Tủ Đồ Thông Minh'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
