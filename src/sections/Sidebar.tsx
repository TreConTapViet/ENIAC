
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
export interface SidebarProps {
  accent: AccentTheme;
  activeSection: ActiveSection;
  handleChangeTheme: (mode: ThemeMode) => void;
  isLightMode: boolean;
  navItems: NavItem[];
  setActiveSection: Setter<ActiveSection>;
  setShowAddGarmentModal: Setter<boolean>;
  setSidebarCollapsed: Setter<boolean>;
  sidebarCollapsed: boolean;
  sizeCalculation: SizeCalculation;
  theme: ThemeState;
}

export function Sidebar({
  accent,
  activeSection,
  handleChangeTheme,
  isLightMode,
  navItems,
  setActiveSection,
  setShowAddGarmentModal,
  setSidebarCollapsed,
  sidebarCollapsed,
  sizeCalculation,
  theme,
}: SidebarProps) {
  return (
    <>
      {/* COLLAPSIBLE LEFT SIDEBAR TOOLBAR */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 272 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`shrink-0 border-r flex flex-col justify-between p-4 select-none sticky top-0 h-screen z-30 transition-colors ${
          isLightMode
            ? 'bg-white border-stone-200'
            : 'bg-[#171412] border-stone-800/80'
        }`}
      >
        <div className="space-y-5 overflow-y-auto overflow-x-hidden pr-0.5">
          {/* Brand Title & Collapse Toggle Button */}
          <div className="flex items-center justify-between gap-2 px-1">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5 min-w-0"
              >
                <div
                  className={`w-9 h-9 rounded-xl ${accent.bgClass} text-white flex items-center justify-center shadow-xs shrink-0`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-base font-extrabold tracking-tight block leading-none">
                    Smart Wardrobe
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Size đề xuất: {sizeCalculation.overallSize}
                  </span>
                </div>
              </motion.div>
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                sidebarCollapsed ? 'mx-auto' : ''
              } ${
                isLightMode
                  ? 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                  : 'bg-stone-800/70 hover:bg-stone-800 border-stone-700 text-stone-300'
              }`}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Primary Quick Add Button */}
          <button
            type="button"
            onClick={() => setShowAddGarmentModal(true)}
            title="Thêm trang phục mới"
            className={`w-full py-2.5 px-3.5 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${accent.bgClass}`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Thêm trang phục mới</span>}
          </button>

          {/* Left Navigation Links */}
          <nav className="space-y-1.5">
            {!sidebarCollapsed && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
                Không gian chính
              </p>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? `${accent.bgClass} text-white shadow-xs`
                      : isLightMode
                      ? 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      : 'text-stone-400 hover:bg-stone-800/70 hover:text-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.count !== undefined && (
                    <span
                      className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-stone-400 dark:text-stone-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Bottom Light / Dark Mode Toggle — Strictly "Chế độ sáng" / "Chế độ tối" */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
          <button
            type="button"
            onClick={() => handleChangeTheme(theme.mode === 'dark' ? 'light' : 'dark')}
            title={
              theme.mode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'
            }
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
            } rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              isLightMode
                ? 'border-stone-200 text-stone-600 hover:bg-stone-100'
                : 'border-white/10 text-stone-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              {theme.mode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-stone-500 shrink-0" />
              )}
              {!sidebarCollapsed && (
                <span className="truncate">
                  {theme.mode === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                </span>
              )}
            </span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
