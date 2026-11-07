
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  clearLegacySession,
  refreshEmailVerification,
  resendVerificationEmail,
} from '../services/integrations';
import {
  ACCENT_COLORS,
  CURATED_OUTFIT_LOOKBOOK,
  GARMENT_CATEGORIES,
  OCCASION_TYPES,
  STARTER_WARDROBE_TEMPLATES,
  WEATHER_PRESETS,
  calculateRecommendedSize,
  resolveUserAvatar,
} from '../constants';
import {
  AccentColorKey,
  AuraOutfitRecommendation,
  GarmentCategory,
  GenderOption,
  OccasionType,
  SavedOutfit,
  ThemeMode,
  UserProfile,
  WardrobeItem,
  WeatherContextData,
  WeatherSeason,
} from '../types';
import { WardrobeDoorAuth } from '../components/WardrobeDoorAuth';
import { OnboardingModal } from '../components/OnboardingModal';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { AuraChatWidget } from '../components/AuraChatWidget';
import { AddGarmentModal } from '../components/AddGarmentModal';
import { useThemePrefs } from '../hooks/useThemePrefs';
import {
  loadLocalOutfits,
  loadLocalProfile,
  loadLocalWardrobe,
  saveLocalOutfits,
  saveLocalProfile,
  saveLocalWardrobe,
} from '../services/localStore';

// Studio ma-nơ-canh 3D chuyên sâu: tải lười để màn đăng nhập và các mục khác không phải tải three.js + GLB
const StudioSection = React.lazy(() => import('../studio/StudioSection'));
import {
  Sparkles,
  Shirt,
  Compass,
  CloudSun,
  Plus,
  Heart,
  Trash2,
  Sun,
  Moon,
  Wind,
  Droplets,
  Wand2,
  BookmarkCheck,
  Bookmark,
  Search,
  MessageCircle,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
  History,
  Palette,
  Ruler,
  X,
  Eye,
} from 'lucide-react';


import type { ActiveSection, AccentTheme, SizeCalculation, Setter, SaveOutfitInput, NavItem } from './types';
import type { ThemeState } from './types';

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
                <React.Suspense
                  fallback={
                    <div className="flex h-[calc(100dvh-9rem)] min-h-[560px] items-center justify-center rounded-3xl border border-stone-200 dark:border-white/10 text-sm text-stone-500 dark:text-stone-400">
                      Đang tải ma-nơ-canh 3D…
                    </div>
                  }
                >
                  <StudioSection
                    profile={profile}
                    wardrobeItems={wardrobeItems}
                    tryOnOutfit={tryOnOutfitForMannequin}
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
              </motion.div>
            )}

    </>
  );
}
