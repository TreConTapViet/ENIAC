
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
import { styleLabel, styleTagBadge } from '../../shared/styles';
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
export interface DiscoverSectionProps {
  accent: AccentTheme;
  activeSection: ActiveSection;
  generatingOutfits: boolean;
  handleGenerateAuraOutfits: () => Promise<void>;
  isLightMode: boolean;
  profile: UserProfile;
  savedTitles: string[];
  selectedOccasion: string;
  selectedStyleFilter: string;
  selectedWeather: WeatherContextData;
  setSelectedOccasion: Setter<string>;
  setSelectedOutfitDetail: Setter<AuraOutfitRecommendation | null>;
  setSelectedStyleFilter: Setter<string>;
  setShowProfileDrawer: Setter<boolean>;
  sizeCalculation: SizeCalculation;
  styleFilteredOutfits: AuraOutfitRecommendation[];
}

export function DiscoverSection({
  accent,
  activeSection,
  generatingOutfits,
  handleGenerateAuraOutfits,
  isLightMode,
  profile,
  savedTitles,
  selectedOccasion,
  selectedStyleFilter,
  selectedWeather,
  setSelectedOccasion,
  setSelectedOutfitDetail,
  setSelectedStyleFilter,
  setShowProfileDrawer,
  sizeCalculation,
  styleFilteredOutfits,
}: DiscoverSectionProps) {
  return (
    <>
            {/* TAB 1: GỢI Ý PHỐI ĐỒ (Merged Weather/Occasion + Image Lookbook Grid + Click for Size/Detail Modal) */}
            {activeSection === 'discover' && (
              <motion.div
                key="section-discover"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-7"
              >
                {/* Contrast Hero Control Panel:
                    - Chế độ sáng (ngoài trắng): Khung điều khiển bên trong màu tối sang trọng (bg-[#181512] text-white)
                    - Chế độ tối (ngoài tối): Khung điều khiển bên trong màu sáng nổi bật (bg-[#FAF8F5] text-stone-900)
                */}
                <section
                  className={`rounded-3xl border p-6 lg:p-7 shadow-md transition-colors duration-300 ${
                    isLightMode
                      ? 'bg-[#181512] text-white border-stone-800'
                      : 'bg-[#FAF8F5] text-stone-900 border-stone-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span>
                          Số đo: {sizeCalculation.heightCm}cm / {sizeCalculation.weightKg}kg ({sizeCalculation.bustCm}-{sizeCalculation.waistCm}-{sizeCalculation.hipCm}cm)
                        </span>
                        <span>·</span>
                        <span className="font-bold text-amber-500">
                          Size chuẩn: {sizeCalculation.overallSize}
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Gợi ý phối đồ ({styleFilteredOutfits.length} bộ trang phục)
                      </h2>

                      <p
                        className={`text-xs sm:text-sm leading-relaxed ${
                          isLightMode ? 'text-stone-300' : 'text-stone-600'
                        }`}
                      >
                        Theo phong cách bạn đã chọn. Nhấn vào một bộ để xem size và ướm thử trên ma-nơ-canh.
                      </p>
                    </div>

                    {/* Weather & Quick Action Box */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <div
                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                          isLightMode
                            ? 'bg-stone-800/90 border-stone-700 text-stone-100'
                            : 'bg-white border-stone-200 text-stone-800'
                        }`}
                      >
                        <div className="pr-3 border-r border-current/15">
                          <span className="text-[11px] opacity-65 block">{selectedWeather.city}</span>
                          <span className="text-xl font-bold font-mono tabular-nums">
                            {selectedWeather.temp}°C
                          </span>
                        </div>
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Droplets className="w-3.5 h-3.5 text-sky-400" />
                            <span>Độ ẩm {selectedWeather.humidity}%</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-75">
                            <Wind className="w-3.5 h-3.5" />
                            <span>{selectedWeather.condition}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={generatingOutfits}
                        onClick={handleGenerateAuraOutfits}
                        className={`px-4 py-3 rounded-2xl text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap ${accent.bgClass}`}
                      >
                        <Wand2 className={`w-4 h-4 ${generatingOutfits ? 'animate-spin' : ''}`} />
                        <span>
                          {generatingOutfits ? 'AI đang phối...' : 'Phối Thêm Bằng AI'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Row 1: User's Selected Styles */}
                  <div
                    className={`mt-5 pt-4 border-t flex flex-wrap items-center gap-2 ${
                      isLightMode ? 'border-stone-800' : 'border-stone-200'
                    }`}
                  >
                    <span className="text-xs font-bold opacity-70 mr-1">
                      Phong cách của bạn:
                    </span>
                    {['Tất cả', ...(profile.favoriteStyles || [])].map((stName) => {
                      const active = selectedStyleFilter === stName;
                      return (
                        <button
                          key={stName}
                          type="button"
                          onClick={() => setSelectedStyleFilter(stName)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? `${accent.bgClass} text-white shadow-xs scale-[1.02]`
                              : isLightMode
                              ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300/80'
                          }`}
                        >
                          {stName === 'Tất cả' ? 'Tất cả phong cách đã chọn' : styleLabel(stName)}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setShowProfileDrawer(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold underline opacity-80 hover:opacity-100 cursor-pointer"
                    >
                      + Đổi phong cách
                    </button>
                  </div>

                  {/* Filter Row 2: Occasions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold opacity-70 mr-1">Dịp sử dụng:</span>
                    {['Tất cả dịp', ...OCCASION_TYPES].map((occ) => {
                      const active = selectedOccasion === occ;
                      return (
                        <button
                          key={occ}
                          type="button"
                          onClick={() => setSelectedOccasion(occ)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-500 text-stone-950 font-bold shadow-2xs'
                              : isLightMode
                              ? 'bg-stone-800/60 text-stone-400 hover:text-white'
                              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                          }`}
                        >
                          {occ}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* OUTFIT IMAGE GALLERY GRID ("Phần giao diện bên trong Gợi ý phối đồ là ảnh của những bộ đồ, khi ấn vào mới ra phần thông tin chi tiết") */}
                {styleFilteredOutfits.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-12 text-center space-y-3 ${
                      isLightMode
                        ? 'bg-stone-900 text-white border-stone-800'
                        : 'bg-[#FAF8F5] text-stone-900 border-stone-200'
                    }`}
                  >
                    <Shirt className="w-10 h-10 text-amber-500 mx-auto" />
                    <h4 className="text-base font-bold">
                      Không có bộ trang phục nào khớp với dịp "{selectedOccasion}"
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOccasion('Tất cả dịp');
                        setSelectedStyleFilter('Tất cả');
                      }}
                      className={`px-4 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer ${accent.bgClass}`}
                    >
                      Xem tất cả bộ phối thuộc phong cách của bạn
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {styleFilteredOutfits.map((outfit, idx) => {
                      const isSaved = savedTitles.includes(outfit.title);
                      return (
                        <motion.div
                          key={outfit.id || idx}
                          initial={{ opacity: 0, y: 16, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            delay: idx * 0.04,
                            duration: 0.32,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          whileHover={{ y: -6, scale: 1.015 }}
                          onClick={() => setSelectedOutfitDetail(outfit)}
                          className={`group relative rounded-3xl overflow-hidden border cursor-pointer transition-shadow duration-300 shadow-sm hover:shadow-xl ${
                            isLightMode
                              ? 'bg-[#181512] border-stone-800 text-white'
                              : 'bg-[#FAF8F5] border-stone-200 text-stone-900'
                          }`}
                        >
                          {/* Clean Outfit Photo Container */}
                          <div className="relative aspect-[4/4.6] w-full bg-[#F8F7F4] overflow-hidden">
                            <img
                              src={outfit.imageUrl}
                              alt={outfit.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* Style Badge Top-Left */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1 pointer-events-none">
                              <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold truncate max-w-[75%]">
                                {styleTagBadge(outfit.styleTag, profile.gender)}
                              </span>
                              <span className="px-2 py-1 rounded-full bg-amber-500 text-stone-950 text-[10px] font-extrabold shadow-xs">
                                Size {sizeCalculation.topSize}
                              </span>
                            </div>

                            {/* Hover Overlay Prompt: "Nhấn để xem chi tiết & ướm thử" */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                              <div className="w-full py-2.5 px-3 rounded-xl bg-white/95 text-stone-900 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg">
                                <Eye className="w-3.5 h-3.5 text-amber-600" />
                                <span>Xem chi tiết Size & Ướm thử</span>
                              </div>
                            </div>
                          </div>

                          {/* Minimal Caption Bar under Photo */}
                          <div className="p-3.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{outfit.title}</p>
                              <p className="text-[11px] opacity-65 truncate">
                                {outfit.occasion}
                              </p>
                            </div>
                            {isSaved && (
                              <BookmarkCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

    </>
  );
}
