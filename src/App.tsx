/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  ACCENT_COLORS,
  CURATED_OUTFIT_LOOKBOOK,
  OCCASION_TYPES,
  WEATHER_PRESETS,
  calculateRecommendedSize,
} from './constants';
import { matchesStyles, styleLabel, styleTagBadge, stylesForGender } from '../shared/styles';
import { normalizeVi } from '../shared/text';
import {
  AccentColorKey,
  AuraOutfitRecommendation,
  OccasionType,
  ThemeMode,
  WeatherContextData,
} from './types';
import { WardrobeDoorAuth } from './components/WardrobeDoorAuth';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileDrawer } from './components/ProfileDrawer';
import { AuraChatWidget } from './components/AuraChatWidget';
import { AddGarmentModal } from './components/AddGarmentModal';
import { AccountStatusBanner } from './components/account/AccountStatusBanner';
import { UpgradeAccountModal } from './components/account/UpgradeAccountModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { ProfileMigrationGate } from './components/account/ProfileMigrationGate';
import { autoMigratedStyles, profileNeedsMigration } from './domain/profileMigration';
import { categoriesForGender } from './domain/categories';
import { useThemePrefs } from './hooks/useThemePrefs';
import { useUserSession } from './hooks/useUserSession';
import { Sidebar } from './sections/Sidebar';
import { TopBar } from './sections/TopBar';
import { DiscoverSection } from './sections/DiscoverSection';
import { MannequinSection } from './sections/MannequinSection';
import { WardrobeSection } from './sections/WardrobeSection';
import { HistorySection } from './sections/HistorySection';
import { OutfitDetailModal } from './sections/OutfitDetailModal';
import type { ActiveSection } from './sections/types';
import { toMillis } from './utils/time';
import { Sparkles, Shirt, Compass, UserCheck, History } from 'lucide-react';

export default function App() {
  // Chế độ sáng/tối + màu nhấn: một nguồn duy nhất cho cả màn đăng nhập và trong app
  const theme = useThemePrefs();
  // Đăng nhập, hồ sơ, tủ đồ, lịch sử: lưu trên máy trước, chỉ gọi Firestore khi được đồng bộ
  const session = useUserSession({ onProfileLoaded: theme.adoptFromProfile });
  const { user, profile, wardrobeItems, savedOutfits, savedTitles } = session;

  // Navigation & Collapsible Sidebar state
  const [activeSection, setActiveSection] = useState<ActiveSection>('discover');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [wardrobeStyleFilter, setWardrobeStyleFilter] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeather, setSelectedWeather] = useState<WeatherContextData>(WEATHER_PRESETS[0]);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('Tất cả dịp');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('Tất cả');

  // Outfit Detail Modal & Try-On Mannequin Handoff
  const [selectedOutfitDetail, setSelectedOutfitDetail] =
    useState<AuraOutfitRecommendation | null>(null);
  const [tryOnOutfitForMannequin, setTryOnOutfitForMannequin] =
    useState<AuraOutfitRecommendation | null>(null);

  // Modals & Drawers
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showAddGarmentModal, setShowAddGarmentModal] = useState(false);
  const [openAuraChatSignal, setOpenAuraChatSignal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [confirmGuestSignOut, setConfirmGuestSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // AI Aura Dynamic Outfit Recommendations
  const [auraOutfits, setAuraOutfits] = useState<AuraOutfitRecommendation[]>([]);
  const [generatingOutfits, setGeneratingOutfits] = useState(false);

  // Outfit History Sorting & Filtering State
  const [historySortBy, setHistorySortBy] = useState<'newest' | 'oldest' | 'occasion'>('newest');
  const [historyOccasionFilter, setHistoryOccasionFilter] = useState<string>('Tất cả');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Hồ sơ cũ lưu tên phong cách đầy đủ: đổi sang id một lần, không cần hỏi (trường hợp phải hỏi
  // đi qua ProfileMigrationGate). Khoá theo nội dung vì mảng mới được tạo mỗi lần render.
  const styleMigration = profile?.onboardingCompleted ? autoMigratedStyles(profile) : null;
  const styleMigrationKey = styleMigration?.join('|') ?? '';
  useEffect(() => {
    if (styleMigration) void session.updateProfile({ favoriteStyles: styleMigration });
  }, [styleMigrationKey]);

  // Gợi ý chỉ lấy bộ thuộc phong cách người dùng chọn (so theo id, xem shared/styles.ts)
  const styleFilteredOutfits: AuraOutfitRecommendation[] = useMemo(() => {
    const combinedCatalog = [...auraOutfits, ...CURATED_OUTFIT_LOOKBOOK];
    const userStyles = profile?.favoriteStyles || [];
    const gender = profile?.gender;

    const matchingUserStyles = combinedCatalog.filter((outfit) =>
      matchesStyles(outfit.styleTag, userStyles, gender)
    );
    const basePool = matchingUserStyles.length > 0 ? matchingUserStyles : combinedCatalog;

    return basePool.filter((outfit) => {
      const matchesSubStyle =
        selectedStyleFilter === 'Tất cả' || matchesStyles(outfit.styleTag, [selectedStyleFilter], gender);
      const matchesOcc =
        selectedOccasion === 'Tất cả dịp' || outfit.occasion === selectedOccasion;
      return matchesSubStyle && matchesOcc;
    });
  }, [auraOutfits, profile?.favoriteStyles, profile?.gender, selectedStyleFilter, selectedOccasion]);

  // Đổi chế độ sáng/tối, màu nhấn: áp ngay (không chờ bấm Lưu) và đồng bộ vào hồ sơ
  const handleChangeTheme = (mode: ThemeMode) => {
    theme.setMode(mode);
    void session.updateProfile({ themeMode: mode });
  };

  const handleChangeAccent = (accentColor: AccentColorKey, customAccentHex?: string) => {
    theme.setAccent(accentColor, customAccentHex);
    void session.updateProfile(
      accentColor === 'custom' && customAccentHex ? { accentColor, customAccentHex } : { accentColor }
    );
  };

  // Khách đăng xuất là mất dữ liệu trên máy: hỏi lại trước
  const handleSignOut = () => {
    setShowProfileDrawer(false);
    if (user?.isAnonymous) {
      setConfirmGuestSignOut(true);
    } else {
      void session.signOut();
    }
  };

  // Generate AI Aura Outfit Recommendations strictly matching user's chosen styles
  const handleGenerateAuraOutfits = async () => {
    if (!profile || generatingOutfits) return;
    setGeneratingOutfits(true);
    try {
      const targetOccasion =
        selectedOccasion === 'Tất cả dịp' ? 'Dạo phố / Cafe' : selectedOccasion;
      const response = await fetch('/api/aura/recommend-outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: profile,
          wardrobeItems: wardrobeItems.filter((w) =>
            matchesStyles(w.styleTag, profile.favoriteStyles, profile.gender)
          ),
          weatherContext: selectedWeather,
          occasion: targetOccasion,
        }),
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.outfits) && data.outfits.length > 0) {
        const userStylePool = CURATED_OUTFIT_LOOKBOOK.filter((o) =>
          matchesStyles(o.styleTag, profile.favoriteStyles, profile.gender)
        );
        const fallbackPool =
          userStylePool.length > 0 ? userStylePool : CURATED_OUTFIT_LOOKBOOK;

        const mapped: AuraOutfitRecommendation[] = data.outfits.map(
          (o: any, idx: number) => {
            const template = fallbackPool[idx % fallbackPool.length];
            return {
              id: `aura_gen_${Date.now()}_${idx}`,
              title: o.title || template.title,
              styleTag: profile.favoriteStyles.length
                ? styleLabel(profile.favoriteStyles[idx % profile.favoriteStyles.length])
                : template.styleTag,
              occasion: o.occasion || targetOccasion,
              weatherNote:
                o.weatherNote ||
                `${selectedWeather.city} · ${selectedWeather.temp}°C (${selectedWeather.condition})`,
              imageUrl: template.imageUrl,
              topImageUrl: template.topImageUrl,
              bottomImageUrl: template.bottomImageUrl,
              topName: o.items?.[0] || template.topName,
              bottomName: o.items?.[1] || template.bottomName,
              topColor: template.topColor,
              bottomColor: template.bottomColor,
              isDressOrSkirt: template.isDressOrSkirt,
              items: Array.isArray(o.items) && o.items.length > 0 ? o.items : template.items,
              colorPalette:
                Array.isArray(o.colorPalette) && o.colorPalette.length > 0
                  ? o.colorPalette
                  : template.colorPalette,
              auraAdvice: o.auraAdvice || template.auraAdvice,
            };
          }
        );
        setAuraOutfits(mapped);
      }
    } catch (err) {
      console.error('Failed to generate outfits:', err);
    } finally {
      setGeneratingOutfits(false);
    }
  };

  const filteredWardrobeItems = useMemo(() => {
    return wardrobeItems.filter((item) => {
      let matchesCat = selectedCategory === 'Tất cả' || item.category === selectedCategory;
      if (!matchesCat && item.category === 'Quần & Chân váy') {
        const lowerName = item.name.toLowerCase();
        if (selectedCategory === 'Chân váy' && lowerName.includes('váy')) matchesCat = true;
        if (selectedCategory === 'Quần' && lowerName.includes('quần')) matchesCat = true;
      }

      const matchesStyle =
        wardrobeStyleFilter === 'Tất cả' ||
        matchesStyles(item.styleTag, [wardrobeStyleFilter], profile?.gender);

      // Tìm không cần gõ dấu: "ao so mi" khớp "Áo sơ mi"
      const q = normalizeVi(searchQuery);
      const matchesSearch =
        !q ||
        [item.name, item.styleTag, styleTagBadge(item.styleTag, profile?.gender), item.color].some((field) =>
          normalizeVi(field).includes(q)
        );
      return matchesCat && matchesStyle && matchesSearch;
    });
  }, [wardrobeItems, selectedCategory, wardrobeStyleFilter, searchQuery, profile?.gender]);

  // Sorted & Filtered Outfit History ("Lịch sử phối đồ")
  const sortedAndFilteredHistory = useMemo(() => {
    const filtered = savedOutfits.filter((outfit) => {
      const matchesOccasion =
        historyOccasionFilter === 'Tất cả' || outfit.occasion === historyOccasionFilter;
      const q = historySearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        outfit.title.toLowerCase().includes(q) ||
        outfit.occasion.toLowerCase().includes(q) ||
        outfit.items.some((it) => it.toLowerCase().includes(q));
      return matchesOccasion && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const timeA = toMillis(a.createdAt);
      const timeB = toMillis(b.createdAt);

      if (historySortBy === 'newest') return timeB - timeA;
      if (historySortBy === 'oldest') return timeA - timeB;

      const occIndexA = OCCASION_TYPES.indexOf(a.occasion as OccasionType);
      const occIndexB = OCCASION_TYPES.indexOf(b.occasion as OccasionType);
      const rankA = occIndexA === -1 ? 99 : occIndexA;
      const rankB = occIndexB === -1 ? 99 : occIndexB;
      if (rankA !== rankB) return rankA - rankB;
      return timeB - timeA;
    });
  }, [savedOutfits, historySortBy, historyOccasionFilter, historySearchQuery]);

  // Loading state
  if (!session.authReady || session.profileLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/15 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Đang đồng bộ không gian Smart Wardrobe...
          </p>
        </div>
      </div>
    );
  }

  // Stage 1: Wardrobe Opening Animation + Login / Registration (Synced with Light/Dark theme mode)
  if (!user) {
    return (
      <WardrobeDoorAuth
        themeMode={theme.mode}
        onChangeThemeMode={theme.setMode}
        // Người dùng được nạp qua onAuthStateChanged ngay khi Firebase Auth đăng nhập xong
        onAuthSuccess={() => {}}
      />
    );
  }

  // Stage 2: First-time 3-Step Onboarding Questions (Name -> Gender -> Favorite Styles)
  if (session.needsOnboarding || !profile) {
    const prefilledName =
      user.displayName || localStorage.getItem('sw_prefill_display_name') || '';
    return (
      <div className="min-h-screen bg-stone-950">
        <OnboardingModal
          initialName={prefilledName}
          onComplete={(data) =>
            session.completeOnboarding(data, {
              mode: theme.mode,
              accent: theme.accent,
              customHex: theme.customHex,
            })
          }
        />
      </div>
    );
  }

  // Hồ sơ cũ còn giới tính "Khác": chọn lại Nam/Nữ trước khi vào app
  if (profileNeedsMigration(profile)) {
    return (
      <ProfileMigrationGate
        profile={profile}
        onSubmit={session.updateProfile}
        onSignOut={() => void session.signOut()}
      />
    );
  }

  const accent = ACCENT_COLORS[theme.accent];
  const isLightMode = theme.mode === 'light';
  const sizeCalculation = calculateRecommendedSize(profile);
  // Chỉ tính đồ người dùng tự thêm: đồ mẫu không làm hiện lại loại Chân váy/Đầm cho Nam
  const categories = categoriesForGender(
    profile.gender,
    wardrobeItems.filter((i) => !i.id.startsWith('starter_'))
  );

  // Merged "Phối theo Thời tiết & Dịp" + "Gợi ý phối đồ hôm nay" -> "Gợi ý phối đồ"
  const navItems: { id: ActiveSection; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'discover', label: 'Gợi ý phối đồ', icon: Compass, count: styleFilteredOutfits.length },
    { id: 'mannequin', label: 'Ma-nơ-canh 3D', icon: UserCheck },
    { id: 'wardrobe', label: 'Tủ đồ của tôi', icon: Shirt, count: wardrobeItems.length },
    { id: 'history', label: 'Lịch sử phối đồ', icon: History, count: savedOutfits.length },
  ];

  // Stage 3: Main Smart Wardrobe Workspace
  // Synchronized Contrast Rule:
  // - Chế độ sáng (isLightMode): Ngoài trắng (bg-white) - Trong tối (các khung điều khiển chính / thẻ nổi bật tương phản sắc nét)
  // - Chế độ tối (!isLightMode): Ngoài tối (bg-[#12100E]) - Trong sáng (các khung thẻ sáng nổi bật hoặc tương phản rõ ràng)
  return (
    <div
      className={`min-h-screen flex transition-colors duration-300 ${
        isLightMode
          ? 'bg-white text-stone-900'
          : 'bg-[#12100E] text-stone-100'
      }`}
    >
      <Sidebar
        accent={accent}
        activeSection={activeSection}
        handleChangeTheme={handleChangeTheme}
        isLightMode={isLightMode}
        navItems={navItems}
        setActiveSection={setActiveSection}
        setShowAddGarmentModal={setShowAddGarmentModal}
        setSidebarCollapsed={setSidebarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        sizeCalculation={sizeCalculation}
        theme={theme}
      />

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          accent={accent}
          isLightMode={isLightMode}
          profile={profile}
          selectedWeather={selectedWeather}
          setSelectedWeather={setSelectedWeather}
          setShowProfileDrawer={setShowProfileDrawer}
          sizeCalculation={sizeCalculation}
        />

        {/* MAIN SCROLLABLE WORKSPACE */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 pb-24">
          <AccountStatusBanner
            user={user}
            storageWarning={session.storageWarning}
            onDismissStorageWarning={session.dismissStorageWarning}
            onUpgrade={() => setShowUpgradeModal(true)}
            onRefreshVerification={session.refreshVerification}
          />
          <AnimatePresence mode="wait">
            {activeSection === 'discover' && (
              <DiscoverSection
                key="discover"
                accent={accent}
                activeSection={activeSection}
                generatingOutfits={generatingOutfits}
                handleGenerateAuraOutfits={handleGenerateAuraOutfits}
                isLightMode={isLightMode}
                profile={profile}
                savedTitles={savedTitles}
                selectedOccasion={selectedOccasion}
                selectedStyleFilter={selectedStyleFilter}
                selectedWeather={selectedWeather}
                setSelectedOccasion={setSelectedOccasion}
                setSelectedOutfitDetail={setSelectedOutfitDetail}
                setSelectedStyleFilter={setSelectedStyleFilter}
                setShowProfileDrawer={setShowProfileDrawer}
                sizeCalculation={sizeCalculation}
                styleFilteredOutfits={styleFilteredOutfits}
              />
            )}
            {activeSection === 'mannequin' && (
              <MannequinSection
                key="mannequin"
                activeSection={activeSection}
                handleSaveOutfit={session.saveOutfit}
                profile={profile}
                selectedOccasion={selectedOccasion}
                selectedWeather={selectedWeather}
                tryOnOutfitForMannequin={tryOnOutfitForMannequin}
                wardrobeItems={wardrobeItems}
              />
            )}
            {activeSection === 'wardrobe' && (
              <WardrobeSection
                key="wardrobe"
                accent={accent}
                categories={categories}
                styleFilterIds={stylesForGender(profile.gender).map((p) => p.id)}
                gender={profile.gender}
                activeSection={activeSection}
                filteredWardrobeItems={filteredWardrobeItems}
                handleDeleteWardrobeItem={session.deleteGarment}
                handleToggleFavoriteItem={session.toggleFavorite}
                isLightMode={isLightMode}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                setActiveSection={setActiveSection}
                setSearchQuery={setSearchQuery}
                setSelectedCategory={setSelectedCategory}
                setShowAddGarmentModal={setShowAddGarmentModal}
                setTryOnOutfitForMannequin={setTryOnOutfitForMannequin}
                setWardrobeStyleFilter={setWardrobeStyleFilter}
                sizeCalculation={sizeCalculation}
                wardrobeStyleFilter={wardrobeStyleFilter}
              />
            )}
            {activeSection === 'history' && (
              <HistorySection
                key="history"
                accent={accent}
                activeSection={activeSection}
                handleDeleteSavedOutfit={session.deleteSavedOutfit}
                historyOccasionFilter={historyOccasionFilter}
                historySearchQuery={historySearchQuery}
                historySortBy={historySortBy}
                isLightMode={isLightMode}
                savedOutfits={savedOutfits}
                setActiveSection={setActiveSection}
                setHistoryOccasionFilter={setHistoryOccasionFilter}
                setHistorySearchQuery={setHistorySearchQuery}
                setHistorySortBy={setHistorySortBy}
                sortedAndFilteredHistory={sortedAndFilteredHistory}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      <OutfitDetailModal
        accent={accent}
        handleSaveOutfit={session.saveOutfit}
        isLightMode={isLightMode}
        savedTitles={savedTitles}
        selectedOutfitDetail={selectedOutfitDetail}
        setActiveSection={setActiveSection}
        setSelectedOutfitDetail={setSelectedOutfitDetail}
        setShowProfileDrawer={setShowProfileDrawer}
        setTryOnOutfitForMannequin={setTryOnOutfitForMannequin}
        sizeCalculation={sizeCalculation}
      />

      {/* Top-Right Avatar User Profile Drawer ("Thông tin cá nhân") */}
      {showProfileDrawer && (
        <ProfileDrawer
          profile={profile}
          onClose={() => setShowProfileDrawer(false)}
          onUpdateProfile={session.updateProfile}
          themeMode={theme.mode}
          accentColor={theme.accent}
          customAccentHex={theme.customHex}
          onChangeTheme={handleChangeTheme}
          onChangeAccent={handleChangeAccent}
          onSignOut={handleSignOut}
          isGuest={user.isAnonymous}
          onUpgradeAccount={() => {
            setShowProfileDrawer(false);
            setShowUpgradeModal(true);
          }}
        />
      )}

      {/* Add Garment Modal */}
      {showAddGarmentModal && (
        <AddGarmentModal
          accentColor={theme.accent}
          gender={profile.gender}
          favoriteStyles={profile.favoriteStyles}
          categories={categories}
          onClose={() => setShowAddGarmentModal(false)}
          onAddGarment={session.addGarment}
        />
      )}

      <UpgradeAccountModal
        open={showUpgradeModal}
        displayName={profile.displayName}
        onClose={() => setShowUpgradeModal(false)}
      />

      <ConfirmDialog
        open={confirmGuestSignOut}
        tone="danger"
        title="Đăng xuất khỏi chế độ khách?"
        description={
          <>
            Tủ đồ, các bộ đã lưu và hồ sơ khách trên trình duyệt này sẽ bị xoá vĩnh viễn.{' '}
            <button
              type="button"
              className="font-semibold text-accent-text underline-offset-2 hover:underline cursor-pointer"
              onClick={() => {
                setConfirmGuestSignOut(false);
                setShowUpgradeModal(true);
              }}
            >
              Nâng cấp tài khoản
            </button>{' '}
            để giữ lại.
          </>
        }
        confirmLabel="Đăng xuất và xoá"
        busy={signingOut}
        onCancel={() => setConfirmGuestSignOut(false)}
        onConfirm={() => {
          setSigningOut(true);
          session
            .signOut()
            .catch((err) => console.warn('Đăng xuất lỗi:', err))
            .finally(() => {
              setSigningOut(false);
              setConfirmGuestSignOut(false);
            });
        }}
      />

      {/* Bottom-Right Circular AI Aura Stylist Chat Widget */}
      <AuraChatWidget
        profile={profile}
        wardrobeItems={wardrobeItems}
        weather={selectedWeather}
        selectedOccasion={
          (selectedOccasion === 'Tất cả dịp'
            ? 'Dạo phố / Cafe'
            : selectedOccasion) as OccasionType
        }
        externalOpen={openAuraChatSignal}
        onExternalOpenHandled={() => setOpenAuraChatSignal(false)}
      />
    </div>
  );
}
