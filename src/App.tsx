/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { auth, db } from './firebase';
import {
  clearLegacySession,
  refreshEmailVerification,
  resendVerificationEmail,
} from './services/integrations';
import {
  ACCENT_COLORS,
  CURATED_OUTFIT_LOOKBOOK,
  FASHION_STYLES,
  GARMENT_CATEGORIES,
  OCCASION_TYPES,
  STARTER_WARDROBE_TEMPLATES,
  WEATHER_PRESETS,
  calculateRecommendedSize,
  getShortStyleBadge,
  matchesUserSelectedStyles,
  resolveUserAvatar,
} from './constants';
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
} from './types';
import { WardrobeDoorAuth } from './components/WardrobeDoorAuth';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileDrawer } from './components/ProfileDrawer';
import { AuraChatWidget } from './components/AuraChatWidget';
import { AddGarmentModal } from './components/AddGarmentModal';
import { useThemePrefs } from './hooks/useThemePrefs';
import { Sidebar } from './sections/Sidebar';
import { TopBar } from './sections/TopBar';
import { DiscoverSection } from './sections/DiscoverSection';
import { MannequinSection } from './sections/MannequinSection';
import { WardrobeSection } from './sections/WardrobeSection';
import { HistorySection } from './sections/HistorySection';
import { OutfitDetailModal } from './sections/OutfitDetailModal';
import {
  loadLocalOutfits,
  loadLocalProfile,
  loadLocalWardrobe,
  saveLocalOutfits,
  saveLocalProfile,
  saveLocalWardrobe,
} from './services/localStore';

// Studio ma-nơ-canh 3D chuyên sâu: tải lười để màn đăng nhập và các mục khác không phải tải three.js + GLB
const StudioSection = React.lazy(() => import('./studio/StudioSection'));
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

type ActiveSection = 'discover' | 'mannequin' | 'wardrobe' | 'history';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Phiên OTP kiểu cũ trong localStorage không được Firebase xác thực (ai cũng tự tạo được),
  // nên không còn được chấp nhận. Chỉ người dùng Firebase Auth mới vào được app.
  useEffect(() => {
    clearLegacySession();
  }, []);

  // Chế độ sáng/tối + màu nhấn: một nguồn duy nhất cho cả màn đăng nhập và trong app
  const theme = useThemePrefs();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);

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

  // AI Aura Dynamic Outfit Recommendations
  const [auraOutfits, setAuraOutfits] = useState<AuraOutfitRecommendation[]>([]);
  const [generatingOutfits, setGeneratingOutfits] = useState(false);
  const [savedTitles, setSavedTitles] = useState<string[]>([]);

  // Outfit History Sorting & Filtering State
  const [historySortBy, setHistorySortBy] = useState<'newest' | 'oldest' | 'occasion'>('newest');
  const [historyOccasionFilter, setHistoryOccasionFilter] = useState<string>('Tất cả');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Firestore Rules chỉ cho lưu dữ liệu khi email đã xác thực. Chưa xác thực thì app chạy
  // bằng dữ liệu trên máy (hasFirebaseAuth = false) cho tới khi người dùng bấm link trong thư.
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  useEffect(() => {
    setEmailVerified(Boolean(firebaseUser?.emailVerified));
  }, [firebaseUser]);

  // Người dùng hiện tại: luôn do Firebase Auth xác thực (Google hoặc email + mật khẩu)
  const activeUser = useMemo(() => {
    if (!firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || 'user@gmail.com',
      displayName: firebaseUser.displayName || '',
      hasFirebaseAuth: emailVerified,
    };
  }, [firebaseUser, emailVerified]);

  // 1. Listen to Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Merge starter studio wardrobe items if user doesn't have the latest studio garments yet
  const ensureRichWardrobe = useCallback((uid: string, existing: WardrobeItem[]): WardrobeItem[] => {
    const hasNewStudioItems = existing.some((i) =>
      i.imageUrl?.includes('garment_01_espresso_corset')
    );
    if (existing.length > 0 && hasNewStudioItems) return existing;

    const seeded: WardrobeItem[] = STARTER_WARDROBE_TEMPLATES.map((template, idx) => ({
      id: `starter_${uid}_${idx}`,
      userId: uid,
      name: template.name,
      category: template.category,
      styleTag: template.styleTag,
      color: template.color,
      season: template.season,
      occasion: template.occasion,
      imageUrl: template.imageUrl,
      favorite: template.favorite,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const customOnly = existing.filter((e) => !e.id.startsWith('starter_'));
    const combined = [...seeded, ...customOnly];
    saveLocalWardrobe(uid, combined);
    return combined;
  }, []);

  // 2. Load User Profile when activeUser changes
  const hydrateUserSession = useCallback(async () => {
    if (!authReady) return;
    if (!activeUser) {
      setProfile(null);
      setNeedsOnboarding(false);
      setWardrobeItems([]);
      setSavedOutfits([]);
      return;
    }

    setProfileLoading(true);
    try {
      try {
        const userSnap = await getDoc(doc(db, 'users', activeUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          theme.adoptFromProfile(data);
          setProfile(data);
          saveLocalProfile(activeUser.uid, data);
          setWardrobeItems(ensureRichWardrobe(activeUser.uid, loadLocalWardrobe(activeUser.uid)));
          setSavedOutfits(loadLocalOutfits(activeUser.uid));
          setNeedsOnboarding(!data.onboardingCompleted);
          setProfileLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Firestore profile read fallback to local storage:', err);
      }

      const cachedProfile = loadLocalProfile(activeUser.uid);
      if (cachedProfile && cachedProfile.onboardingCompleted) {
        theme.adoptFromProfile(cachedProfile);
        setProfile(cachedProfile);
        setNeedsOnboarding(false);
        setWardrobeItems(ensureRichWardrobe(activeUser.uid, loadLocalWardrobe(activeUser.uid)));
        setSavedOutfits(loadLocalOutfits(activeUser.uid));
      } else {
        setNeedsOnboarding(true);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [authReady, activeUser, ensureRichWardrobe, theme.adoptFromProfile]);

  useEffect(() => {
    hydrateUserSession();
  }, [hydrateUserSession]);

  // 4. Real-time Firestore Listeners when authenticated with Firebase Auth
  useEffect(() => {
    if (!authReady || !activeUser || !profile?.onboardingCompleted) return;

    if (!activeUser.hasFirebaseAuth) {
      setWardrobeItems(ensureRichWardrobe(activeUser.uid, loadLocalWardrobe(activeUser.uid)));
      setSavedOutfits(loadLocalOutfits(activeUser.uid));
      return;
    }

    const wardrobeQuery = query(
      collection(db, 'wardrobeItems'),
      where('userId', '==', activeUser.uid)
    );

    const unsubWardrobe = onSnapshot(
      wardrobeQuery,
      (snapshot) => {
        const items: WardrobeItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WardrobeItem, 'id'>),
        }));
        if (items.length > 0) {
          const enriched = ensureRichWardrobe(activeUser.uid, items);
          setWardrobeItems(enriched);
        } else {
          setWardrobeItems(ensureRichWardrobe(activeUser.uid, loadLocalWardrobe(activeUser.uid)));
        }
      },
      (error) => {
        console.warn('Wardrobe listener fallback to local cache:', error);
        setWardrobeItems(ensureRichWardrobe(activeUser.uid, loadLocalWardrobe(activeUser.uid)));
      }
    );

    const savedQuery = query(
      collection(db, 'savedOutfits'),
      where('userId', '==', activeUser.uid)
    );

    const unsubSaved = onSnapshot(
      savedQuery,
      (snapshot) => {
        const list: SavedOutfit[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SavedOutfit, 'id'>),
        }));
        if (list.length > 0) {
          setSavedOutfits(list);
          saveLocalOutfits(activeUser.uid, list);
        } else {
          setSavedOutfits(loadLocalOutfits(activeUser.uid));
        }
      },
      (error) => {
        console.warn('Saved outfits listener fallback to local cache:', error);
        setSavedOutfits(loadLocalOutfits(activeUser.uid));
      }
    );

    return () => {
      unsubWardrobe();
      unsubSaved();
    };
  }, [authReady, activeUser, profile?.onboardingCompleted, ensureRichWardrobe]);

  // 5. Filter Outfits STRICTLY by User's Selected Styles ("Chỉ gợi ý những bộ quần áo/ váy theo phong cách mà người dùng đã chọn")
  const styleFilteredOutfits: AuraOutfitRecommendation[] = useMemo(() => {
    const combinedCatalog = [...auraOutfits, ...CURATED_OUTFIT_LOOKBOOK];
    const userStyles = profile?.favoriteStyles || [];

    // First filter strictly to user's selected styles
    const matchingUserStyles = combinedCatalog.filter((outfit) =>
      matchesUserSelectedStyles(outfit.styleTag, userStyles)
    );

    const basePool = matchingUserStyles.length > 0 ? matchingUserStyles : combinedCatalog;

    return basePool.filter((outfit) => {
      const matchesSubStyle =
        selectedStyleFilter === 'Tất cả' ||
        matchesUserSelectedStyles(outfit.styleTag, [selectedStyleFilter]);
      const matchesOcc =
        selectedOccasion === 'Tất cả dịp' || outfit.occasion === selectedOccasion;
      return matchesSubStyle && matchesOcc;
    });
  }, [auraOutfits, profile?.favoriteStyles, selectedStyleFilter, selectedOccasion]);

  // Complete Initial 3-Step Onboarding & Seed Cropped Wardrobe
  const handleCompleteOnboarding = async (data: {
    displayName: string;
    gender: GenderOption;
    favoriteStyles: string[];
  }) => {
    if (!activeUser) return;

    const isMale = data.gender === 'Nam';
    const newProfile: UserProfile = {
      uid: activeUser.uid,
      displayName: data.displayName.slice(0, 80),
      email: (activeUser.email || 'user@gmail.com').slice(0, 150),
      gender: data.gender,
      avatarUrl: resolveUserAvatar(data.gender),
      heightCm: isMale ? 172 : 162,
      weightKg: isMale ? 65 : 50,
      bustCm: isMale ? 94 : 84,
      waistCm: isMale ? 76 : 64,
      hipCm: isMale ? 94 : 90,
      favoriteStyles: data.favoriteStyles.slice(0, 15),
      accentColor: theme.accent,
      ...(theme.accent === 'custom' ? { customAccentHex: theme.customHex } : {}),
      themeMode: theme.mode,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const seededWardrobe: WardrobeItem[] = STARTER_WARDROBE_TEMPLATES.map((template, idx) => ({
      id: `starter_${activeUser.uid}_${idx}`,
      userId: activeUser.uid,
      name: template.name,
      category: template.category,
      styleTag: template.styleTag,
      color: template.color,
      season: template.season,
      occasion: template.occasion,
      imageUrl: template.imageUrl,
      favorite: template.favorite,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    saveLocalProfile(activeUser.uid, newProfile);
    saveLocalWardrobe(activeUser.uid, seededWardrobe);
    setProfile(newProfile);
    setWardrobeItems(seededWardrobe);
    setNeedsOnboarding(false);

    try {
      const userDocRef = doc(db, 'users', activeUser.uid);
      const existingSnap = await getDoc(userDocRef);

      if (existingSnap.exists()) {
        const updatePayload: Record<string, any> = {
          displayName: newProfile.displayName,
          gender: newProfile.gender,
          avatarUrl: newProfile.avatarUrl,
          heightCm: newProfile.heightCm,
          weightKg: newProfile.weightKg,
          bustCm: newProfile.bustCm,
          waistCm: newProfile.waistCm,
          hipCm: newProfile.hipCm,
          favoriteStyles: newProfile.favoriteStyles,
          accentColor: newProfile.accentColor,
          ...(newProfile.customAccentHex ? { customAccentHex: newProfile.customAccentHex } : {}),
          themeMode: newProfile.themeMode,
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        };
        await updateDoc(userDocRef, updatePayload);
      } else {
        const createPayload: Record<string, any> = {
          uid: newProfile.uid,
          displayName: newProfile.displayName,
          email: newProfile.email,
          gender: newProfile.gender,
          avatarUrl: newProfile.avatarUrl,
          heightCm: newProfile.heightCm,
          weightKg: newProfile.weightKg,
          bustCm: newProfile.bustCm,
          waistCm: newProfile.waistCm,
          hipCm: newProfile.hipCm,
          favoriteStyles: newProfile.favoriteStyles,
          accentColor: newProfile.accentColor,
          ...(newProfile.customAccentHex ? { customAccentHex: newProfile.customAccentHex } : {}),
          themeMode: newProfile.themeMode,
          onboardingCompleted: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userDocRef, createPayload);
      }
    } catch (error) {
      console.warn('Firestore onboarding sync warning:', error);
    }
  };

  // Đổi chế độ sáng/tối, màu nhấn: áp ngay (không chờ bấm Lưu) và đồng bộ vào hồ sơ
  const handleChangeTheme = (mode: ThemeMode) => {
    theme.setMode(mode);
    void handleUpdateProfile({ themeMode: mode });
  };

  const handleChangeAccent = (accentColor: AccentColorKey, customAccentHex?: string) => {
    theme.setAccent(accentColor, customAccentHex);
    void handleUpdateProfile(
      accentColor === 'custom' && customAccentHex ? { accentColor, customAccentHex } : { accentColor }
    );
  };

  // Update User Profile from Top-Right Circular Avatar Drawer
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!activeUser || !profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setProfile(updatedProfile);
    saveLocalProfile(activeUser.uid, updatedProfile);

    const cleanUpdates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined)
      cleanUpdates.displayName = updates.displayName.slice(0, 80);
    if (updates.gender !== undefined) cleanUpdates.gender = updates.gender;
    if (updates.avatarUrl !== undefined)
      cleanUpdates.avatarUrl = updates.avatarUrl.slice(0, 350000);
    if (updates.heightCm !== undefined) cleanUpdates.heightCm = Number(updates.heightCm);
    if (updates.weightKg !== undefined) cleanUpdates.weightKg = Number(updates.weightKg);
    if (updates.bustCm !== undefined) cleanUpdates.bustCm = Number(updates.bustCm);
    if (updates.waistCm !== undefined) cleanUpdates.waistCm = Number(updates.waistCm);
    if (updates.hipCm !== undefined) cleanUpdates.hipCm = Number(updates.hipCm);
    if (updates.favoriteStyles !== undefined)
      cleanUpdates.favoriteStyles = updates.favoriteStyles.slice(0, 15);
    if (updates.accentColor !== undefined) cleanUpdates.accentColor = updates.accentColor;
    if (updates.customAccentHex !== undefined) cleanUpdates.customAccentHex = updates.customAccentHex;
    if (updates.themeMode !== undefined) cleanUpdates.themeMode = updates.themeMode;

    try {
      const userDocRef = doc(db, 'users', activeUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        await updateDoc(userDocRef, cleanUpdates);
      } else {
        await setDoc(userDocRef, {
          uid: updatedProfile.uid,
          displayName: updatedProfile.displayName.slice(0, 80),
          email: updatedProfile.email.slice(0, 150),
          gender: updatedProfile.gender,
          ...(updatedProfile.avatarUrl
            ? { avatarUrl: updatedProfile.avatarUrl.slice(0, 350000) }
            : {}),
          ...(updatedProfile.heightCm ? { heightCm: Number(updatedProfile.heightCm) } : {}),
          ...(updatedProfile.weightKg ? { weightKg: Number(updatedProfile.weightKg) } : {}),
          ...(updatedProfile.bustCm ? { bustCm: Number(updatedProfile.bustCm) } : {}),
          ...(updatedProfile.waistCm ? { waistCm: Number(updatedProfile.waistCm) } : {}),
          ...(updatedProfile.hipCm ? { hipCm: Number(updatedProfile.hipCm) } : {}),
          favoriteStyles: updatedProfile.favoriteStyles.slice(0, 15),
          accentColor: updatedProfile.accentColor,
          ...(updatedProfile.customAccentHex ? { customAccentHex: updatedProfile.customAccentHex } : {}),
          themeMode: updatedProfile.themeMode,
          onboardingCompleted: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.warn('Firestore profile update fallback to local storage:', error);
    }
  };

  // Add Garment to Wardrobe
  const handleAddGarment = async (item: {
    name: string;
    category: GarmentCategory;
    styleTag: string;
    color: string;
    season: WeatherSeason;
    occasion: OccasionType;
    imageUrl: string;
    favorite: boolean;
  }) => {
    if (!activeUser) return;

    const newItem: WardrobeItem = {
      id: `item_${Date.now()}`,
      userId: activeUser.uid,
      name: item.name.slice(0, 100),
      category: item.category,
      styleTag: item.styleTag.slice(0, 60),
      color: item.color.slice(0, 50),
      season: item.season,
      occasion: item.occasion,
      imageUrl: item.imageUrl.slice(0, 350000),
      favorite: item.favorite,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextItems = [newItem, ...wardrobeItems];
    setWardrobeItems(nextItems);
    saveLocalWardrobe(activeUser.uid, nextItems);

    try {
      await addDoc(collection(db, 'wardrobeItems'), {
        userId: activeUser.uid,
        name: newItem.name,
        category: newItem.category,
        styleTag: newItem.styleTag,
        color: newItem.color,
        season: newItem.season,
        occasion: newItem.occasion,
        imageUrl: newItem.imageUrl,
        favorite: newItem.favorite,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Firestore add garment fallback:', error);
    }
  };

  const handleToggleFavoriteItem = async (item: WardrobeItem) => {
    if (!activeUser) return;
    const updatedList = wardrobeItems.map((w) =>
      w.id === item.id ? { ...w, favorite: !w.favorite } : w
    );
    setWardrobeItems(updatedList);
    saveLocalWardrobe(activeUser.uid, updatedList);

    if (!item.id.startsWith('starter_') && !item.id.startsWith('item_')) {
      try {
        await updateDoc(doc(db, 'wardrobeItems', item.id), {
          favorite: !item.favorite,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn('Firestore favorite toggle fallback:', error);
      }
    }
  };

  const handleDeleteWardrobeItem = async (itemId: string) => {
    if (!activeUser) return;
    const updatedList = wardrobeItems.filter((w) => w.id !== itemId);
    setWardrobeItems(updatedList);
    saveLocalWardrobe(activeUser.uid, updatedList);

    if (!itemId.startsWith('starter_') && !itemId.startsWith('item_')) {
      try {
        await deleteDoc(doc(db, 'wardrobeItems', itemId));
      } catch (error) {
        console.warn('Firestore delete garment fallback:', error);
      }
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
            matchesUserSelectedStyles(w.styleTag, profile.favoriteStyles)
          ),
          weatherContext: selectedWeather,
          occasion: targetOccasion,
        }),
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.outfits) && data.outfits.length > 0) {
        const userStylePool = CURATED_OUTFIT_LOOKBOOK.filter((o) =>
          matchesUserSelectedStyles(o.styleTag, profile.favoriteStyles)
        );
        const fallbackPool =
          userStylePool.length > 0 ? userStylePool : CURATED_OUTFIT_LOOKBOOK;

        const mapped: AuraOutfitRecommendation[] = data.outfits.map(
          (o: any, idx: number) => {
            const template = fallbackPool[idx % fallbackPool.length];
            return {
              id: `aura_gen_${Date.now()}_${idx}`,
              title: o.title || template.title,
              styleTag:
                profile.favoriteStyles[idx % profile.favoriteStyles.length] ||
                template.styleTag,
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

  // Save a recommended or Mannequin outfit to History
  const handleSaveOutfit = async (outfit: {
    title: string;
    occasion: string;
    weatherNote: string;
    items: string[];
    auraAdvice: string;
    imageUrl?: string;
    styleTag?: string;
  }) => {
    if (!activeUser) return;

    const newSaved: SavedOutfit = {
      id: `outfit_${Date.now()}`,
      userId: activeUser.uid,
      title: outfit.title.slice(0, 120),
      occasion: outfit.occasion.slice(0, 60),
      weatherNote: outfit.weatherNote.slice(0, 120),
      items: outfit.items.slice(0, 8).map((i) => i.slice(0, 120)),
      auraAdvice: outfit.auraAdvice.slice(0, 800),
      imageUrl: outfit.imageUrl,
      styleTag: outfit.styleTag,
      createdAt: new Date().toISOString(),
    };

    const nextSaved = [newSaved, ...savedOutfits];
    setSavedOutfits(nextSaved);
    saveLocalOutfits(activeUser.uid, nextSaved);
    setSavedTitles((prev) => [...prev, outfit.title]);

    try {
      await addDoc(collection(db, 'savedOutfits'), {
        userId: activeUser.uid,
        title: newSaved.title,
        occasion: newSaved.occasion,
        weatherNote: newSaved.weatherNote,
        items: newSaved.items,
        auraAdvice: newSaved.auraAdvice,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Firestore save outfit fallback:', error);
    }
  };

  const handleDeleteSavedOutfit = async (id: string) => {
    if (!activeUser) return;
    const nextSaved = savedOutfits.filter((s) => s.id !== id);
    setSavedOutfits(nextSaved);
    saveLocalOutfits(activeUser.uid, nextSaved);

    if (!id.startsWith('outfit_')) {
      try {
        await deleteDoc(doc(db, 'savedOutfits', id));
      } catch (error) {
        console.warn('Firestore delete outfit fallback:', error);
      }
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
        matchesUserSelectedStyles(item.styleTag, [wardrobeStyleFilter]);

      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.styleTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getShortStyleBadge(item.styleTag).toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesStyle && matchesSearch;
    });
  }, [wardrobeItems, selectedCategory, wardrobeStyleFilter, searchQuery]);

  // Sorted & Filtered Outfit History ("Lịch sử phối đồ")
  const sortedAndFilteredHistory = useMemo(() => {
    const parseTimestampMs = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val?.toMillis === 'function') return val.toMillis();
      if (typeof val?.seconds === 'number') return val.seconds * 1000;
      const parsed = Date.parse(String(val));
      return Number.isNaN(parsed) ? 0 : parsed;
    };

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
      const timeA = parseTimestampMs(a.createdAt);
      const timeB = parseTimestampMs(b.createdAt);

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
  if (!authReady || profileLoading) {
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
  if (!activeUser) {
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
  if (needsOnboarding || !profile) {
    const prefilledName =
      activeUser.displayName || localStorage.getItem('sw_prefill_display_name') || '';
    return (
      <div className="min-h-screen bg-stone-950">
        <OnboardingModal
          initialName={prefilledName}
          onComplete={handleCompleteOnboarding}
        />
      </div>
    );
  }

  const accent = ACCENT_COLORS[theme.accent];
  const isLightMode = theme.mode === 'light';
  const sizeCalculation = calculateRecommendedSize(profile);

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
          {!emailVerified && (
            <div
              role="status"
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${
                isLightMode
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              }`}
            >
              <span>
                {verifyNotice ||
                  `Xác thực email ${activeUser?.email ?? ''} để đồng bộ tủ đồ lên mây. Hiện dữ liệu chỉ lưu trên máy này.`}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    resendVerificationEmail()
                      .then(() => setVerifyNotice('Đã gửi lại thư xác thực. Kiểm tra hộp thư (cả mục Spam).'))
                      .catch((e: Error) => setVerifyNotice(e.message))
                  }
                  className="rounded-lg border border-current/30 px-3 py-1.5 font-semibold cursor-pointer hover:bg-current/10"
                >
                  Gửi lại thư
                </button>
                <button
                  type="button"
                  onClick={() =>
                    refreshEmailVerification().then((ok) => {
                      setEmailVerified(ok);
                      setVerifyNotice(ok ? null : 'Email chưa được xác thực. Hãy bấm link trong thư rồi thử lại.');
                    })
                  }
                  className={`rounded-lg px-3 py-1.5 font-semibold text-white cursor-pointer ${accent.bgClass}`}
                >
                  Tôi đã xác thực
                </button>
              </span>
            </div>
          )}
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
                handleSaveOutfit={handleSaveOutfit}
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
                activeSection={activeSection}
                filteredWardrobeItems={filteredWardrobeItems}
                handleDeleteWardrobeItem={handleDeleteWardrobeItem}
                handleToggleFavoriteItem={handleToggleFavoriteItem}
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
                handleDeleteSavedOutfit={handleDeleteSavedOutfit}
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
        handleSaveOutfit={handleSaveOutfit}
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
          onUpdateProfile={handleUpdateProfile}
          themeMode={theme.mode}
          accentColor={theme.accent}
          customAccentHex={theme.customHex}
          onChangeTheme={handleChangeTheme}
          onChangeAccent={handleChangeAccent}
          onSignOut={() => {
            setShowProfileDrawer(false);
            signOut(auth).catch(() => {});
          }}
        />
      )}

      {/* Add Garment Modal */}
      {showAddGarmentModal && (
        <AddGarmentModal
          accentColor={theme.accent}
          onClose={() => setShowAddGarmentModal(false)}
          onAddGarment={handleAddGarment}
        />
      )}

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
