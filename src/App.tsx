/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  ACCENT_COLORS,
  OCCASION_TYPES,
  calculateRecommendedSize,
} from './constants';
import { matchesStyles, styleTagBadge, stylesForGender } from '../shared/styles';
import { normalizeVi } from '../shared/text';
import {
  AccentColorKey,
  AuraOutfitRecommendation,
  OccasionType,
  ThemeMode,
} from './types';
import { WardrobeDoorAuth } from './components/WardrobeDoorAuth';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileDrawer } from './components/ProfileDrawer';
import { AuraChatPanel } from './components/aura/AuraChatPanel';
import { AuraBubble } from './components/aura/AuraBubble';
import { useAura } from './hooks/useAura';
import { AddGarmentModal } from './components/AddGarmentModal';
import { AccountStatusBanner } from './components/account/AccountStatusBanner';
import { UpgradeAccountModal } from './components/account/UpgradeAccountModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { ProfileMigrationGate } from './components/account/ProfileMigrationGate';
import { autoMigratedStyles, profileNeedsMigration } from './domain/profileMigration';
import { categoriesForGender } from './domain/categories';
import { isStarterId } from './domain/ids';
import { useThemePrefs } from './hooks/useThemePrefs';
import { useUserSession } from './hooks/useUserSession';
import { useWeather } from './hooks/useWeather';
import { MobileTabBar } from './shell/MobileTabBar';
import { Sidebar } from './sections/Sidebar';
import { TopBar } from './sections/TopBar';
import { DiscoverSection } from './sections/DiscoverSection';
import { MannequinSection } from './sections/MannequinSection';
import { WardrobeSection } from './sections/WardrobeSection';
import { HistorySection } from './sections/HistorySection';
import { OutfitDetailModal } from './sections/OutfitDetailModal';
import type { ActiveSection } from './sections/types';
import { toMillis } from './utils/time';
import { MOBILE_LAYOUT_QUERY } from './utils/device';
import { catalogOutfitsFor } from './catalog';
import { buildDiscoverFeed, dedupeOutfits } from './domain/outfits';
import { requestAuraOutfits } from './services/auraOutfits';
import { normalizeGender } from '../shared/gender';
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
  // Thời tiết thật của tỉnh/thành đang chọn (Open-Meteo qua /api/weather/current)
  const weatherState = useWeather();
  // Trợ lý Aura dạng bong bóng (vị trí + ẩn/hiện lưu trên máy)
  const aura = useAura();
  // Màn hình < 768px hoặc điện thoại xoay ngang: thanh điều hướng dưới đáy thay thanh bên
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_LAYOUT_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const selectedWeather = weatherState.weather;
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [confirmGuestSignOut, setConfirmGuestSignOut] = useState(false);
  const [auraHiddenToast, setAuraHiddenToast] = useState(false);
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

  // Đổi giới tính: bỏ mọi thứ chọn theo giới tính cũ (bộ AI đã tạo, bộ đang ướm thử, bộ đang xem,
  // bộ lọc phong cách/loại đồ) để không còn đồ nữ trên hồ sơ nam và ngược lại
  const currentGender = profile ? normalizeGender(profile.gender) : null;
  const prevGenderRef = React.useRef(currentGender);
  useEffect(() => {
    const prev = prevGenderRef.current;
    prevGenderRef.current = currentGender;
    if (!prev || !currentGender || prev === currentGender) return;
    setAuraOutfits([]);
    setTryOnOutfitForMannequin(null);
    setSelectedOutfitDetail(null);
    setSelectedStyleFilter('Tất cả');
    setWardrobeStyleFilter('Tất cả');
    setSelectedCategory('Tất cả');
  }, [currentGender]);

  // Gợi ý: đúng giới tính, không trùng, xếp theo phong cách / thời tiết / dịp (domain/outfits.ts)
  const discoverFeed = useMemo(() => {
    if (!profile) return { main: [], extra: [] };
    const gender = normalizeGender(profile.gender) ?? 'Nữ';
    return buildDiscoverFeed({
      generated: auraOutfits,
      catalog: catalogOutfitsFor(gender),
      gender,
      styles: profile.favoriteStyles || [],
      season: selectedWeather.seasonMatch,
      occasion: selectedOccasion === 'Tất cả dịp' ? undefined : selectedOccasion,
      styleFilter: selectedStyleFilter,
      occasionFilter: selectedOccasion,
    });
  }, [auraOutfits, profile, selectedWeather.seasonMatch, selectedStyleFilter, selectedOccasion]);
  const styleFilteredOutfits = discoverFeed.main;

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

  // Thông báo "Đã ẩn Aura" tự tắt sau 6 giây
  useEffect(() => {
    if (!auraHiddenToast) return;
    const t = window.setTimeout(() => setAuraHiddenToast(false), 6000);
    return () => window.clearTimeout(t);
  }, [auraHiddenToast]);

  // Khách đăng xuất là mất dữ liệu trên máy: hỏi lại trước
  const handleSignOut = () => {
    setShowProfileDrawer(false);
    if (user?.isAnonymous) {
      setConfirmGuestSignOut(true);
    } else {
      void session.signOut();
    }
  };

  // "Phối thêm bằng AI": bộ mới ghép từ món có thật, nối vào đầu danh sách (tối đa 12), không trùng
  const handleGenerateAuraOutfits = async () => {
    if (!profile || generatingOutfits) return;
    setGeneratingOutfits(true);
    try {
      const fresh = await requestAuraOutfits({
        profile,
        wardrobe: wardrobeItems,
        weather: selectedWeather,
        occasion: selectedOccasion === 'Tất cả dịp' ? 'Dạo phố / Cafe' : selectedOccasion,
        // Loại trừ mọi bộ đã có (kể cả bộ danh mục đang ẩn vì khác phong cách) để luôn ra bộ mới
        shown: [...auraOutfits, ...catalogOutfitsFor(normalizeGender(profile.gender) ?? 'Nữ')],
      });
      setAuraOutfits((prev) => dedupeOutfits([...fresh, ...prev]).slice(0, 12));
    } catch (err) {
      console.error('Không tạo được gợi ý AI:', err);
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
      <div className="min-h-screen bg-surface  text-fg  flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/15 border border-amber-500/40 flex items-center justify-center text-amber-600 ">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-sm text-fg-muted ">
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
      <div className="min-h-screen bg-surface-2">
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
  const sizeCalculation = calculateRecommendedSize(profile);
  // Chỉ tính đồ người dùng tự thêm: đồ mẫu không làm hiện lại loại Chân váy/Đầm cho Nam
  const categories = categoriesForGender(
    profile.gender,
    wardrobeItems.filter((i) => !isStarterId(i.id))
  );

  // Merged "Phối theo Thời tiết & Dịp" + "Gợi ý phối đồ hôm nay" -> "Gợi ý phối đồ"
  const navItems: { id: ActiveSection; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'discover', label: 'Gợi ý phối đồ', icon: Compass, count: styleFilteredOutfits.length },
    { id: 'mannequin', label: 'Ma-nơ-canh 3D', icon: UserCheck },
    { id: 'wardrobe', label: 'Tủ đồ của tôi', icon: Shirt, count: wardrobeItems.length },
    { id: 'history', label: 'Lịch sử phối đồ', icon: History, count: savedOutfits.length },
  ];

  // Stage 3: Main Smart Wardrobe Workspace
  return (
    <div
      className={`min-h-dvh flex transition-colors duration-300 bg-canvas text-fg`}
    >
      <Sidebar
        accent={accent}
        activeSection={activeSection}
        handleChangeTheme={handleChangeTheme}
        navItems={navItems}
        setActiveSection={setActiveSection}
        setShowAddGarmentModal={setShowAddGarmentModal}
        setSidebarCollapsed={setSidebarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        sizeCalculation={sizeCalculation}
        theme={theme}
        auraVisible={aura.visible}
        auraUnread={aura.unread}
        onOpenAura={() => aura.show(true)}
      />

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          profile={profile}
          selectedWeather={selectedWeather}
          provinceId={weatherState.provinceId}
          weatherLoading={weatherState.loading}
          onSelectProvince={weatherState.selectProvince}
          setShowProfileDrawer={setShowProfileDrawer}
          sizeCalculation={sizeCalculation}
        />

        {/* MAIN SCROLLABLE WORKSPACE */}
        {/* Điện thoại: chừa đúng chiều cao thanh tab dưới đáy (+ vùng an toàn của iPhone); mục
            Ma-nơ-canh dùng lề mỏng để khung 3D rộng nhất có thể */}
        <main
          className={`flex-1 max-w-7xl w-full mx-auto sm:p-6 lg:p-8 md:pb-24 pb-[calc(4.5rem+env(safe-area-inset-bottom))] phone-land:p-3 phone-land:pb-[calc(4.5rem+env(safe-area-inset-bottom))] ${
            activeSection === 'mannequin'
              ? 'px-2 pt-2 space-y-3 sm:space-y-8'
              : 'px-4 pt-5 space-y-6 sm:space-y-8'
          }`}
        >
          {/* Banner tài khoản chiếm nhiều chỗ trên điện thoại: ẩn riêng ở mục Ma-nơ-canh (các mục khác vẫn hiện) */}
          <div className={activeSection === 'mannequin' ? 'hidden md:block phone-land:hidden' : undefined}>
            <AccountStatusBanner
              user={user}
              storageWarning={session.storageWarning}
              onDismissStorageWarning={session.dismissStorageWarning}
              onUpgrade={() => setShowUpgradeModal(true)}
              onRefreshVerification={session.refreshVerification}
            />
          </div>
          <AnimatePresence mode="wait">
            {activeSection === 'discover' && (
              <DiscoverSection
                key="discover"
                accent={accent}
                activeSection={activeSection}
                generatingOutfits={generatingOutfits}
                handleGenerateAuraOutfits={handleGenerateAuraOutfits}
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
                extraOutfits={discoverFeed.extra}
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

      <MobileTabBar
        navItems={navItems}
        activeSection={activeSection}
        onSelect={setActiveSection}
        onAddGarment={() => setShowAddGarmentModal(true)}
        onOpenAura={() => aura.show(true)}
        auraUnread={aura.unread}
      />

      <OutfitDetailModal
        accent={accent}
        handleSaveOutfit={session.saveOutfit}
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
          auraVisible={aura.visible}
          onToggleAura={(visible) => (visible ? aura.show(false) : aura.hide())}
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

      {/* Trợ lý Aura: bong bóng kéo thả + khung chat. Điện thoại đã có nút Aura (kèm chấm tin mới)
          trên thanh tab, nên không hiện bong bóng nổi che nội dung và nút của studio. */}
      {aura.visible && !aura.open && !isMobile && (
        <AuraBubble
          side={aura.side}
          yRatio={aura.yRatio}
          unread={aura.unread}
          // Chừa chỗ cho thanh điều khiển của studio ma-nơ-canh
          bottomInset={activeSection === 'mannequin' ? 140 : 0}
          onTap={() => aura.setOpen(true)}
          onMove={aura.setPosition}
          onHide={() => {
            aura.hide();
            setAuraHiddenToast(true);
          }}
        />
      )}
      <AuraChatPanel
        // Đổi giới tính thì mở cuộc trò chuyện mới: lịch sử cũ mang số đo/gợi ý của giới tính trước
        key={profile.gender}
        open={aura.open}
        side={aura.side}
        onMinimize={() => aura.setOpen(false)}
        onHide={() => {
          aura.hide();
          setAuraHiddenToast(true);
        }}
        onReply={aura.notify}
        profile={profile}
        wardrobeItems={wardrobeItems}
        weather={selectedWeather}
        selectedOccasion={
          (selectedOccasion === 'Tất cả dịp' ? 'Dạo phố / Cafe' : selectedOccasion) as OccasionType
        }
      />
      {auraHiddenToast && (
        <div
          role="status"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 left-1/2 z-[70] flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm text-fg shadow-pop"
        >
          <span>Đã ẩn Aura. Bật lại ở mục Aura trên thanh bên hoặc trong Hồ sơ.</span>
          <button
            type="button"
            onClick={() => {
              aura.show(false);
              setAuraHiddenToast(false);
            }}
            className="h-9 shrink-0 rounded-control px-3 text-sm font-semibold text-accent-text hover:bg-surface-2 cursor-pointer"
          >
            Hoàn tác
          </button>
        </div>
      )}
    </div>
  );
}
