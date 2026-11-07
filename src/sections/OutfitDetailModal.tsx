
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
export interface OutfitDetailModalProps {
  accent: AccentTheme;
  handleSaveOutfit: (outfit: SaveOutfitInput) => Promise<void>;
  isLightMode: boolean;
  savedTitles: string[];
  selectedOutfitDetail: AuraOutfitRecommendation | null;
  setActiveSection: Setter<ActiveSection>;
  setSelectedOutfitDetail: Setter<AuraOutfitRecommendation | null>;
  setShowProfileDrawer: Setter<boolean>;
  setTryOnOutfitForMannequin: Setter<AuraOutfitRecommendation | null>;
  sizeCalculation: SizeCalculation;
}

export function OutfitDetailModal({
  accent,
  handleSaveOutfit,
  isLightMode,
  savedTitles,
  selectedOutfitDetail,
  setActiveSection,
  setSelectedOutfitDetail,
  setShowProfileDrawer,
  setTryOnOutfitForMannequin,
  sizeCalculation,
}: OutfitDetailModalProps) {
  return (
    <>
      {/* OUTFIT DETAIL MODAL — Opens when clicking an Outfit Image Card in "Gợi ý phối đồ" */}
      <AnimatePresence>
        {selectedOutfitDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
            onClick={() => setSelectedOutfitDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 cursor-default ${
                isLightMode
                  ? 'bg-[#181512] text-white border-stone-800'
                  : 'bg-[#FAF8F5] text-stone-900 border-stone-200'
              }`}
            >
              {/* Left 5 Cols: Outfit Image & Constituent Cropped Pieces */}
              <div className="lg:col-span-5 bg-[#F8F7F4] p-6 flex flex-col justify-between gap-4 border-b lg:border-b-0 lg:border-r border-stone-200/60">
                <div className="aspect-[4/4.4] w-full rounded-2xl overflow-hidden bg-white border border-stone-200/80 flex items-center justify-center p-3">
                  <img
                    src={selectedOutfitDetail.imageUrl}
                    alt={selectedOutfitDetail.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Cropped Individual Pieces Preview */}
                {(selectedOutfitDetail.topImageUrl || selectedOutfitDetail.bottomImageUrl) && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedOutfitDetail.topImageUrl && (
                      <div className="p-2 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5 text-stone-900">
                        <img
                          src={selectedOutfitDetail.topImageUrl}
                          alt="Áo"
                          className="w-12 h-12 rounded-lg object-contain bg-stone-50 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] text-stone-500 block">
                            Size {sizeCalculation.topSize}
                          </span>
                          <span className="text-xs font-bold truncate block">
                            {selectedOutfitDetail.topName || 'Áo phối'}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedOutfitDetail.bottomImageUrl && (
                      <div className="p-2 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5 text-stone-900">
                        <img
                          src={selectedOutfitDetail.bottomImageUrl}
                          alt="Quần / Váy"
                          className="w-12 h-12 rounded-lg object-contain bg-stone-50 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] text-stone-500 block">
                            Size {sizeCalculation.bottomSize}
                          </span>
                          <span className="text-xs font-bold truncate block">
                            {selectedOutfitDetail.bottomName || 'Quần / Chân váy'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right 7 Cols: Detailed Size Recommendation (Height, Weight, 3-Ring) & Try-On Mannequin Button */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-bold">
                          {selectedOutfitDetail.styleTag}
                        </span>
                        <span className="opacity-70">
                          {selectedOutfitDetail.occasion} · {selectedOutfitDetail.weatherNote}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-extrabold leading-snug pt-1">
                        {selectedOutfitDetail.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOutfitDetail(null)}
                      className="p-2 rounded-full hover:bg-stone-500/20 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* SIZE & BODY MEASUREMENT ANALYSIS BOX */}
                  <div
                    className={`rounded-2xl p-4 border space-y-3 ${
                      isLightMode
                        ? 'bg-stone-900/90 border-stone-700 text-stone-100'
                        : 'bg-white border-stone-200 text-stone-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-extrabold uppercase tracking-wider">
                          Tư vấn Size theo chỉ số cơ thể của bạn
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOutfitDetail(null);
                          setShowProfileDrawer(true);
                        }}
                        className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                      >
                        Chỉnh sửa số đo →
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                        <span className="text-[11px] opacity-75 block">Size Áo / Đầm</span>
                        <span className="text-lg font-extrabold text-amber-500">
                          Size {sizeCalculation.topSize}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                        <span className="text-[11px] opacity-75 block">Size Quần / Váy</span>
                        <span className="text-lg font-extrabold text-amber-500">
                          Size {sizeCalculation.bottomSize} ({sizeCalculation.jeansSize})
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-500/10 border border-stone-500/20">
                        <span className="text-[11px] opacity-75 block">Chiều cao · Nặng</span>
                        <span className="text-sm font-bold font-mono block mt-0.5">
                          {sizeCalculation.heightCm}cm · {sizeCalculation.weightKg}kg
                        </span>
                      </div>
                    </div>

                    <div className="text-xs leading-relaxed opacity-85">
                      <strong>Số đo 3 vòng ({sizeCalculation.bustCm} - {sizeCalculation.waistCm} - {sizeCalculation.hipCm} cm):</strong>{' '}
                      {sizeCalculation.fitAdvice}
                    </div>
                  </div>

                  {/* Items & Styling Advice */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                      Các món đồ trong bộ trang phục:
                    </p>
                    <ul className="space-y-1.5 text-xs sm:text-sm">
                      {selectedOutfitDetail.items.map((piece, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${accent.bgClass}`} />
                          <span className="font-medium">{piece}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs leading-relaxed opacity-80 italic border-l-2 border-amber-500 pl-3">
                    {selectedOutfitDetail.auraAdvice}
                  </p>
                </div>

                {/* Modal Action Buttons: Try On 3D Mannequin + Save to History */}
                <div className="pt-4 border-t border-stone-500/20 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTryOnOutfitForMannequin(selectedOutfitDetail);
                      setSelectedOutfitDetail(null);
                      setActiveSection('mannequin');
                    }}
                    className={`w-full sm:flex-1 py-3 px-5 rounded-2xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer ${accent.bgClass}`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Ướm thử trên ma-nơ-canh</span>
                  </button>

                  <button
                    type="button"
                    disabled={savedTitles.includes(selectedOutfitDetail.title)}
                    onClick={() =>
                      handleSaveOutfit({
                        title: selectedOutfitDetail.title,
                        occasion: selectedOutfitDetail.occasion,
                        weatherNote: selectedOutfitDetail.weatherNote,
                        items: selectedOutfitDetail.items,
                        auraAdvice: selectedOutfitDetail.auraAdvice,
                        imageUrl: selectedOutfitDetail.imageUrl,
                        styleTag: selectedOutfitDetail.styleTag,
                      })
                    }
                    className={`w-full sm:w-auto py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                      savedTitles.includes(selectedOutfitDetail.title)
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'border-stone-500/30 hover:bg-stone-500/10'
                    }`}
                  >
                    {savedTitles.includes(selectedOutfitDetail.title) ? (
                      <>
                        <BookmarkCheck className="w-4 h-4" />
                        <span>Đã lưu lịch sử</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span>Lưu vào Lịch sử</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
