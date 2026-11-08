
import React, {    } from 'react';
import { motion } from 'motion/react';
import {
  AuraOutfitRecommendation,
  UserProfile,
  WardrobeItem,
  WeatherContextData,
} from '../types';

// Studio ma-nơ-canh 3D chuyên sâu: tải lười để màn đăng nhập và các mục khác không phải tải three.js + GLB
const StudioSection = React.lazy(() => import('../studio/StudioSection'));

import type { ActiveSection, SaveOutfitInput } from './types';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

// Tách nguyên văn từ App.tsx (Giai đoạn 2, không đổi hành vi)
export interface MannequinSectionProps {
  activeSection: ActiveSection;
  handleSaveOutfit: (outfit: SaveOutfitInput) => Promise<void>;
  profile: UserProfile;
  selectedOccasion: string;
  selectedWeather: WeatherContextData;
  tryOnOutfitForMannequin: AuraOutfitRecommendation | null;
  wardrobeItems: WardrobeItem[];
}

export function MannequinSection({
  activeSection,
  handleSaveOutfit,
  profile,
  selectedOccasion,
  selectedWeather,
  tryOnOutfitForMannequin,
  wardrobeItems,
}: MannequinSectionProps) {
  return (
    <>
            {/* TAB 2: MANNEQUIN 3D TRY-ON STUDIO */}
            {activeSection === 'mannequin' && (
              <motion.div
                key="section-mannequin"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <ErrorBoundary
                  title="Ma-nơ-canh 3D đang gặp sự cố"
                  resetKey={`${profile.gender}|${tryOnOutfitForMannequin?.id ?? ''}`}
                >
                <React.Suspense
                  fallback={
                    <div className="flex h-[calc(100dvh-9rem)] min-h-[560px] items-center justify-center rounded-3xl border border-line  text-sm text-fg-muted ">
                      Đang tải ma-nơ-canh 3D…
                    </div>
                  }
                >
                  <StudioSection
                    profile={profile}
                    wardrobeItems={wardrobeItems}
                    tryOnOutfit={tryOnOutfitForMannequin}
                    weather={selectedWeather}
                    onSaveOutfit={(saved) =>
                      handleSaveOutfit({
                        title: saved.title,
                        occasion:
                          selectedOccasion === 'Tất cả dịp'
                            ? 'Ma-nơ-canh 3D'
                            : selectedOccasion,
                        weatherNote: `${selectedWeather.city} · ${selectedWeather.temp}°C`,
                        items: saved.items,
                        auraAdvice: `Phối trên ma-nơ-canh 3D · Điểm ${saved.scoreLabel}`,
                        styleTag: 'Ma-nơ-canh 3D',
                      })
                    }
                  />
                </React.Suspense>
                </ErrorBoundary>
              </motion.div>
            )}

    </>
  );
}
