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
  getActiveSessionAccount,
  setActiveSessionAccount,
  SessionUserAccount,
} from './services/integrations';
import {
  ACCENT_COLORS,
  CURATED_OUTFIT_LOOKBOOK,
  FASHION_STYLES,
  GARMENT_CATEGORIES,
  OCCASION_TYPES,
  STARTER_WARDROBE_TEMPLATES,
  WEATHER_PRESETS,
  applyAccentCssVariables,
  calculateRecommendedSize,
  getAccentConfig,
  getRealtimeWeatherContext,
  getShortStyleBadge,
  matchesUserSelectedStyles,
  normalizeHexColor,
  resolveUserAvatar,
} from './constants';
import {
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

// Studio ma-nơ-canh 3D chuyên sâu: tải lười để màn đăng nhập và các mục khác không phải tải three.js + GLB
const StudioSection = React.lazy(() => import('./MannequinStudioApp'));
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
  History,
  Palette,
  Ruler,
  X,
  Eye,
} from 'lucide-react';

type ActiveSection = 'discover' | 'studio3d' | 'wardrobe' | 'history';

// Local storage helpers so both Firebase Auth users and OTP + SHA-256 users have instant persistence
function loadLocalProfile(uid: string): UserProfile | null {
  try {
    const raw =
      localStorage.getItem(`sw_profile_${uid}`) ||
      (uid.startsWith('otp_')
        ? localStorage.getItem(`sw_profile_usr_${uid.slice(4, 36)}`)
        : null);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function saveLocalProfile(uid: string, profile: UserProfile) {
  try {
    localStorage.setItem(`sw_profile_${uid}`, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

function loadLocalWardrobe(uid: string): WardrobeItem[] {
  try {
    const raw =
      localStorage.getItem(`sw_wardrobe_${uid}`) ||
      (uid.startsWith('otp_')
        ? localStorage.getItem(`sw_wardrobe_usr_${uid.slice(4, 36)}`)
        : null);
    return raw ? (JSON.parse(raw) as WardrobeItem[]) : [];
  } catch {
    return [];
  }
}

function saveLocalWardrobe(uid: string, items: WardrobeItem[]) {
  try {
    localStorage.setItem(`sw_wardrobe_${uid}`, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadLocalOutfits(uid: string): SavedOutfit[] {
  try {
    const raw =
      localStorage.getItem(`sw_outfits_${uid}`) ||
      (uid.startsWith('otp_')
        ? localStorage.getItem(`sw_outfits_usr_${uid.slice(4, 36)}`)
        : null);
    return raw ? (JSON.parse(raw) as SavedOutfit[]) : [];
  } catch {
    return [];
  }
}

function saveLocalOutfits(uid: string, outfits: SavedOutfit[]) {
  try {
    localStorage.setItem(`sw_outfits_${uid}`, JSON.stringify(outfits));
  } catch {
    // ignore
  }
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [customSessionUser, setCustomSessionUser] = useState<SessionUserAccount | null>(
    () => getActiveSessionAccount()
  );
  const [authReady, setAuthReady] = useState(false);

  // Unified ThemeMode synchronized between Login/Wardrobe screen and inside Main App
  const [globalThemeMode, setGlobalThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('sw_theme_mode');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

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
  const [selectedWeather, setSelectedWeather] = useState<WeatherContextData>(() =>
    getRealtimeWeatherContext(WEATHER_PRESETS[0])
  );

  // Cập nhật ngữ cảnh thời tiết theo thời gian thực (Realtime Weather)
  useEffect(() => {
    const updateRealtimeWeather = () => {
      setSelectedWeather((prev) => {
        const base = WEATHER_PRESETS.find((w) => w.city === prev.city) || WEATHER_PRESETS[0];
        return getRealtimeWeatherContext(base);
      });
    };
    updateRealtimeWeather();
    const timer = setInterval(updateRealtimeWeather, 60000);
    return () => clearInterval(timer);
  }, []);
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

  // Active User Identity (either Firebase Auth or OTP + SHA-256 session)
  const activeUser = useMemo(() => {
    if (firebaseUser) {
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || 'user@gmail.com',
        displayName: firebaseUser.displayName || '',
        passwordHash: undefined,
        hasFirebaseAuth: true,
      };
    }
    if (customSessionUser) {
      return {
        uid: customSessionUser.uid,
        email: customSessionUser.email,
        displayName: customSessionUser.displayName,
        passwordHash: customSessionUser.passwordHash,
        hasFirebaseAuth: false,
      };
    }
    return null;
  }, [firebaseUser, customSessionUser]);

  // 1. Listen to Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Merge starter studio wardrobe items if user doesn't have the latest cleaned studio garments (v=3) yet
  const ensureRichWardrobe = useCallback((uid: string, existing: WardrobeItem[]): WardrobeItem[] => {
    const hasLatestCleanedItems = existing.some((i) =>
      i.imageUrl?.includes('garment_01_espresso_corset_fca6056c.png?v=3')
    );
    if (existing.length > 0 && hasLatestCleanedItems) return existing;

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
    const customOnly = existing.filter(
      (e) =>
        !e.id.startsWith('starter_') &&
        !e.imageUrl?.includes('/assets/aistudio/') &&
        !e.imageUrl?.includes('/assets/cropped/')
    );
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
          const syncedTheme =
            (localStorage.getItem('sw_theme_mode') as ThemeMode) || data.themeMode || 'dark';
          const mergedProfile = { ...data, themeMode: syncedTheme };
          setProfile(mergedProfile);
          setGlobalThemeMode(syncedTheme);
          saveLocalProfile(activeUser.uid, mergedProfile);
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
        const syncedTheme =
          (localStorage.getItem('sw_theme_mode') as ThemeMode) ||
          cachedProfile.themeMode ||
          'dark';
        const mergedProfile = { ...cachedProfile, themeMode: syncedTheme };
        setProfile(mergedProfile);
        setGlobalThemeMode(syncedTheme);
        setNeedsOnboarding(false);
        setWardrobeItems(ensureRichWardrobe(activeUser.uid, loadLocalWardrobe(activeUser.uid)));
        setSavedOutfits(loadLocalOutfits(activeUser.uid));
      } else {
        setNeedsOnboarding(true);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [authReady, activeUser, ensureRichWardrobe]);

  useEffect(() => {
    hydrateUserSession();
  }, [hydrateUserSession]);

  // 3. Sync Light / Dark Theme and User's Chosen Accent Color Variables (including Custom Color) to <html>
  useEffect(() => {
    const mode = profile?.themeMode || globalThemeMode;
    const rootEl = document.documentElement;
    if (mode === 'dark') {
      rootEl.classList.add('dark');
    } else {
      rootEl.classList.remove('dark');
    }
    localStorage.setItem('sw_theme_mode', mode);

    applyAccentCssVariables(profile?.accentColor || 'amber', profile?.customAccentHex);
  }, [profile?.themeMode, profile?.accentColor, profile?.customAccentHex, globalThemeMode, showProfileDrawer]);

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
      accentColor: 'amber',
      themeMode: globalThemeMode,
      onboardingCompleted: true,
      ...(activeUser.passwordHash && activeUser.passwordHash.length === 64
        ? { passwordHash: activeUser.passwordHash }
        : {}),
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
          themeMode: newProfile.themeMode,
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        };
        if (newProfile.passwordHash && newProfile.passwordHash.length === 64) {
          updatePayload.passwordHash = newProfile.passwordHash;
        }
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
          themeMode: newProfile.themeMode,
          onboardingCompleted: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (newProfile.passwordHash && newProfile.passwordHash.length === 64) {
          createPayload.passwordHash = newProfile.passwordHash;
        }
        await setDoc(userDocRef, createPayload);
      }
    } catch (error) {
      console.warn('Firestore onboarding sync warning:', error);
    }
  };

  // Update User Profile from Top-Right Circular Avatar Drawer
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!activeUser || !profile) return;

    if (updates.themeMode) {
      setGlobalThemeMode(updates.themeMode);
      localStorage.setItem('sw_theme_mode', updates.themeMode);
    }

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
    if (updates.customAccentHex !== undefined)
      cleanUpdates.customAccentHex = normalizeHexColor(updates.customAccentHex);
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
          ...(updatedProfile.customAccentHex
            ? { customAccentHex: normalizeHexColor(updatedProfile.customAccentHex) }
            : {}),
          themeMode: updatedProfile.themeMode,
          onboardingCompleted: true,
          ...(updatedProfile.passwordHash && updatedProfile.passwordHash.length === 64
            ? { passwordHash: updatedProfile.passwordHash }
            : {}),
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
        themeMode={globalThemeMode}
        onChangeThemeMode={(newMode) => {
          setGlobalThemeMode(newMode);
          localStorage.setItem('sw_theme_mode', newMode);
        }}
        onAuthSuccess={(customAccount) => {
          if (customAccount) {
            setCustomSessionUser(customAccount);
          } else {
            setCustomSessionUser(getActiveSessionAccount());
          }
        }}
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

  const accent = getAccentConfig(profile.accentColor, profile.customAccentHex);
  const isLightMode = profile.themeMode === 'light';
  const sizeCalculation = calculateRecommendedSize(profile);

  // Bỏ Manocanh 3D — giữ Studio 3D chuyên sâu là không gian 3D duy nhất của ứng dụng
  const navItems: { id: ActiveSection; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'discover', label: 'Gợi ý phối đồ', icon: Compass, count: styleFilteredOutfits.length },
    { id: 'studio3d', label: 'Studio 3D chuyên sâu', icon: Wand2 },
    { id: 'wardrobe', label: 'Tủ đồ của tôi', icon: Shirt, count: wardrobeItems.length },
    { id: 'history', label: 'Lịch sử phối đồ', icon: History, count: savedOutfits.length },
  ];

  // Stage 3: Main Smart Wardrobe Workspace
  // - Chế độ sáng (isLightMode): Nền trắng tinh khiết (bg-white), giao diện thoáng sạch, các nút đặc biệt theo màu chủ đạo (accent)
  // - Chế độ tối (!isLightMode): Nền đen sâu sang trọng (bg-[#09090B]), thẻ tối tinh tế, các nút đặc biệt theo màu chủ đạo (accent)
  return (
    <div
      className={`min-h-screen flex transition-colors duration-300 ${
        isLightMode
          ? 'bg-white text-stone-900'
          : 'bg-[#09090B] text-zinc-100'
      }`}
    >
      {/* COLLAPSIBLE LEFT SIDEBAR TOOLBAR */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 268 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`shrink-0 border-r flex flex-col justify-between p-4 select-none sticky top-0 h-screen z-30 transition-colors ${
          isLightMode
            ? 'bg-white border-stone-200/90'
            : 'bg-[#0D0D11] border-white/10'
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
                  <span className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5 block">
                    Size đề xuất: {sizeCalculation.shortSize}
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
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
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
            className={`w-full py-2.5 px-3.5 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95 cursor-pointer whitespace-nowrap ${accent.bgClass}`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Thêm trang phục mới</span>}
          </button>

          {/* Left Navigation Links */}
          <nav className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-2">
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
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
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
                          : 'text-stone-400 dark:text-zinc-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Category Filter in Left Sidebar */}
          {!sidebarCollapsed && (
            <div className="pt-4 border-t border-stone-200/80 dark:border-white/10">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-2">
                Danh mục tủ đồ
              </p>
              <div className="space-y-0.5">
                {['Tất cả', ...GARMENT_CATEGORIES].map((cat) => {
                  const active = activeSection === 'wardrobe' && selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setActiveSection('wardrobe');
                      }}
                      className={`w-full text-left px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? `${accent.softBgClass} ${accent.textClass} font-bold`
                          : isLightMode
                          ? 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Light / Dark Mode Toggle — Strictly "Chế độ sáng" / "Chế độ tối" */}
        <div className="pt-4 border-t border-stone-200/80 dark:border-white/10">
          <button
            type="button"
            onClick={() =>
              handleUpdateProfile({
                themeMode: profile.themeMode === 'dark' ? 'light' : 'dark',
              })
            }
            title={
              profile.themeMode === 'dark' ? 'Chế độ tối' : 'Chế độ sáng'
            }
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
            } rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isLightMode
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-900 border-stone-200'
                : 'bg-white/5 hover:bg-white/10 text-zinc-100 border-white/10'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              {profile.themeMode === 'dark' ? (
                <Moon className={`w-4 h-4 shrink-0 ${accent.textClass}`} />
              ) : (
                <Sun className={`w-4 h-4 shrink-0 ${accent.textClass}`} />
              )}
              {!sidebarCollapsed && (
                <span className="truncate">
                  {profile.themeMode === 'dark' ? 'Chế độ tối' : 'Chế độ sáng'}
                </span>
              )}
            </span>
          </button>
        </div>
      </motion.aside>

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER: Clean, uncluttered layout with User Name, Body Metrics, Weather, AI Stylist Aura & Avatar */}
        <header
          className={`h-16 sm:h-18 px-6 lg:px-8 border-b flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors ${
            isLightMode
              ? 'bg-white/95 border-stone-200/90'
              : 'bg-[#09090B]/90 border-white/10'
          } backdrop-blur-md`}
        >
          {/* Left: User Name & Body Metrics Pill */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
              {profile.displayName}
            </h1>
            <button
              type="button"
              onClick={() => setShowProfileDrawer(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono tabular-nums font-semibold border transition-colors cursor-pointer shrink-0 ${accent.softBgClass} ${accent.textClass} ${accent.borderClass}`}
              title="Nhấn để cập nhật chiều cao, cân nặng và số đo 3 vòng"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>
                {sizeCalculation.heightCm}cm · {sizeCalculation.weightKg}kg · Size {sizeCalculation.shortSize}
              </span>
            </button>
          </div>

          {/* Right: Local Weather Selector, AI Stylist Aura Button & User Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                isLightMode
                  ? 'bg-stone-50 border-stone-200 text-stone-700'
                  : 'bg-[#121217] border-white/10 text-zinc-200'
              }`}
            >
              <CloudSun className={`w-4 h-4 shrink-0 ${accent.textClass}`} />
              <select
                value={selectedWeather.city}
                onChange={(e) => {
                  const found = WEATHER_PRESETS.find((w) => w.city === e.target.value);
                  if (found) setSelectedWeather(getRealtimeWeatherContext(found));
                }}
                aria-label="Chọn thành phố thời tiết"
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                {WEATHER_PRESETS.map((w) => {
                  const rt = getRealtimeWeatherContext(w);
                  return (
                    <option
                      key={w.city}
                      value={w.city}
                      className="bg-white text-stone-900"
                    >
                      {w.city}: {rt.temp}°C — {rt.condition}
                    </option>
                  );
                })}
              </select>
              <span className="font-bold font-mono tabular-nums text-xs ml-0.5">
                {selectedWeather.temp}°C
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpenAuraChatSignal(true)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap ${accent.bgClass}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Stylist Aura</span>
            </button>

            <button
              type="button"
              onClick={() => setShowProfileDrawer(true)}
              title="Thông tin cá nhân"
              aria-label="Mở Thông tin cá nhân"
              className={`w-9 h-9 rounded-full overflow-hidden shadow-xs ring-2 ring-offset-2 ${
                isLightMode ? 'ring-offset-white' : 'ring-offset-[#09090B]'
              } ${accent.ringClass} hover:scale-105 transition-transform cursor-pointer shrink-0`}
            >
              <img
                src={resolveUserAvatar(profile.gender, profile.avatarUrl)}
                alt={profile.displayName || 'Avatar'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>

        {/* MAIN SCROLLABLE WORKSPACE */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24">
          <AnimatePresence mode="wait">
            {/* TAB 1: GỢI Ý PHỐI ĐỒ */}
            {activeSection === 'discover' && (
              <motion.div
                key="section-discover"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* Streamlined Header & Filter Bar */}
                <section
                  className={`rounded-3xl border p-5 sm:p-6 transition-colors duration-300 ${
                    isLightMode
                      ? 'bg-white border-stone-200/90 text-stone-900 shadow-2xs'
                      : 'bg-[#121217] border-white/10 text-zinc-100'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold ${accent.softBgClass} ${accent.textClass}`}
                        >
                          Size đề xuất: {sizeCalculation.overallSize}
                        </span>
                        <span className="text-stone-400 dark:text-zinc-500">·</span>
                        <span className="text-stone-500 dark:text-zinc-400">
                          Số đo {sizeCalculation.bustCm}-{sizeCalculation.waistCm}-{sizeCalculation.hipCm}cm
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                        Gợi ý phối đồ ({styleFilteredOutfits.length} bộ)
                      </h2>

                      <p className="text-xs text-stone-500 dark:text-zinc-400">
                        Nhấn vào bộ trang phục bất kỳ để xem chi tiết tư vấn size và ướm thử trực tiếp trong Studio 3D chuyên sâu.
                      </p>
                    </div>

                    {/* Weather Summary & AI Generate Button */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <div
                        className={`flex items-center gap-3 rounded-2xl px-3.5 py-2 border text-xs ${
                          isLightMode
                            ? 'bg-stone-50 border-stone-200 text-stone-700'
                            : 'bg-white/5 border-white/10 text-zinc-200'
                        }`}
                      >
                        <div className="pr-2.5 border-r border-stone-200 dark:border-white/10">
                          <span className="text-[10px] text-stone-400 dark:text-zinc-400 block">
                            {selectedWeather.city}
                          </span>
                          <span className="text-sm font-bold font-mono tabular-nums">
                            {selectedWeather.temp}°C
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Droplets className={`w-3 h-3 ${accent.textClass}`} />
                            <span>Độ ẩm {selectedWeather.humidity}% · Gió {selectedWeather.wind}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-stone-600 dark:text-zinc-300 font-medium">
                            <Wind className="w-3 h-3 shrink-0" />
                            <span title={selectedWeather.condition}>{selectedWeather.condition}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={generatingOutfits}
                        onClick={handleGenerateAuraOutfits}
                        className={`px-4 py-2.5 rounded-2xl text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap ${accent.bgClass}`}
                      >
                        <Wand2 className={`w-4 h-4 ${generatingOutfits ? 'animate-spin' : ''}`} />
                        <span>
                          {generatingOutfits ? 'AI đang phối...' : 'Phối Thêm Bằng AI'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Clean Filter Rows */}
                  <div className="mt-4 pt-4 border-t border-stone-100 dark:border-white/10 space-y-2.5">
                    {/* Style Filter */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-stone-500 dark:text-zinc-400 mr-1">
                        Phong cách:
                      </span>
                      {['Tất cả', ...(profile.favoriteStyles || [])].map((stName) => {
                        const active = selectedStyleFilter === stName;
                        return (
                          <button
                            key={stName}
                            type="button"
                            onClick={() => setSelectedStyleFilter(stName)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              active
                                ? `${accent.bgClass} text-white shadow-2xs`
                                : isLightMode
                                ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                                : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                            }`}
                          >
                            {stName === 'Tất cả' ? 'Tất cả' : getShortStyleBadge(stName)}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setShowProfileDrawer(true)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:underline cursor-pointer ${accent.textClass}`}
                      >
                        + Đổi phong cách
                      </button>
                    </div>

                    {/* Occasion Filter */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-stone-500 dark:text-zinc-400 mr-1">
                        Dịp sử dụng:
                      </span>
                      {['Tất cả dịp', ...OCCASION_TYPES].map((occ) => {
                        const active = selectedOccasion === occ;
                        return (
                          <button
                            key={occ}
                            type="button"
                            onClick={() => setSelectedOccasion(occ)}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              active
                                ? `${accent.bgClass} text-white shadow-2xs`
                                : isLightMode
                                ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                                : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                            }`}
                          >
                            {occ}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* OUTFIT IMAGE GALLERY GRID */}
                {styleFilteredOutfits.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-12 text-center space-y-3 ${
                      isLightMode
                        ? 'bg-white border-stone-200 text-stone-900'
                        : 'bg-[#121217] border-white/10 text-zinc-100'
                    }`}
                  >
                    <Shirt className={`w-10 h-10 mx-auto ${accent.textClass}`} />
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
                      Xem tất cả bộ phối
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {styleFilteredOutfits.map((outfit, idx) => {
                      const isSaved = savedTitles.includes(outfit.title);
                      return (
                        <motion.div
                          key={outfit.id || idx}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: idx * 0.03,
                            duration: 0.28,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          whileHover={{ y: -4 }}
                          onClick={() => setSelectedOutfitDetail(outfit)}
                          className={`group relative rounded-3xl overflow-hidden border cursor-pointer transition-all duration-300 shadow-2xs hover:shadow-lg ${
                            isLightMode
                              ? 'bg-white border-stone-200/90 text-stone-900 hover:border-stone-300'
                              : 'bg-[#121217] border-white/10 text-zinc-100 hover:border-white/20'
                          }`}
                        >
                          {/* Clean Studio Photo Frame */}
                          <div className="relative aspect-[4/4.5] w-full bg-[#F8F8FA] overflow-hidden border-b border-stone-100 dark:border-white/5">
                            <img
                              src={outfit.imageUrl}
                              alt={outfit.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain p-2.5 transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* Top Badges */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5 pointer-events-none">
                              <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-stone-800 border border-stone-200/80 text-[10px] font-semibold truncate max-w-[72%] shadow-2xs">
                                {getShortStyleBadge(outfit.styleTag)}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-white text-[10px] font-bold shadow-2xs ${accent.bgClass}`}
                              >
                                Size {sizeCalculation.topSize}
                              </span>
                            </div>

                            {/* Hover Overlay Button */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3.5">
                              <div
                                className={`w-full py-2 px-3 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md ${accent.bgClass}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem chi tiết & Ướm thử</span>
                              </div>
                            </div>
                          </div>

                          {/* Minimal Caption Bar */}
                          <div className="p-3.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{outfit.title}</p>
                              <p className="text-[11px] text-stone-500 dark:text-zinc-400 truncate mt-0.5">
                                {outfit.occasion}
                              </p>
                            </div>
                            {isSaved && (
                              <BookmarkCheck className={`w-4 h-4 shrink-0 ${accent.textClass}`} />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}


            {/* TAB 3: DIGITAL WARDROBE CLOSET */}
            {activeSection === 'wardrobe' && (
              <motion.section
                key="section-wardrobe"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      Tủ Đồ Cá Nhân ({filteredWardrobeItems.length} món)
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      Phân loại theo thể loại trang phục · Size đề xuất: {sizeCalculation.shortSize}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên, phong cách..."
                        className={`pl-9 pr-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                          isLightMode
                            ? 'bg-white border-stone-200 text-stone-900'
                            : 'bg-[#121217] border-white/10 text-zinc-100'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddGarmentModal(true)}
                      className={`px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap ${accent.bgClass}`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm đồ</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {['Tất cả', ...GARMENT_CATEGORIES].map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          active
                            ? `${accent.bgClass} text-white shadow-xs`
                            : isLightMode
                            ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                            : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Style Tag Filter Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-xs font-semibold text-stone-400 dark:text-zinc-500 shrink-0 mr-1">
                    Phong cách:
                  </span>
                  {['Tất cả', ...FASHION_STYLES.map((s) => s.shortTag)].map((tag) => {
                    const active = wardrobeStyleFilter === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setWardrobeStyleFilter(tag)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? `${accent.bgClass} text-white font-semibold`
                            : isLightMode
                            ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Wardrobe Grid */}
                {filteredWardrobeItems.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-12 text-center space-y-3 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-[#121217] border-white/10'
                    }`}
                  >
                    <Shirt className="w-10 h-10 text-stone-400 mx-auto" />
                    <h4 className="text-base font-bold">
                      Chưa có trang phục nào trong bộ lọc này
                    </h4>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('Tất cả');
                          setWardrobeStyleFilter('Tất cả');
                          setSearchQuery('');
                        }}
                        className="px-4 py-2 rounded-xl border border-stone-300 dark:border-white/15 text-xs font-semibold cursor-pointer"
                      >
                        Xem tất cả tủ đồ
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddGarmentModal(true)}
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer ${accent.bgClass}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tải ảnh trang phục mới</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredWardrobeItems.map((item, idx) => {
                      const shortBadge = getShortStyleBadge(item.styleTag);
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.025 }}
                          whileHover={{ y: -4 }}
                          className={`group rounded-3xl border overflow-hidden flex flex-col justify-between transition-all shadow-2xs hover:shadow-md ${
                            isLightMode
                              ? 'bg-white text-stone-900 border-stone-200/90'
                              : 'bg-[#121217] text-zinc-100 border-white/10'
                          }`}
                        >
                          <div>
                            {/* Isolated Minimalist Studio Card Frame */}
                            <div className="relative aspect-[4/4.2] w-full bg-[#F8F8FA] overflow-hidden border-b border-stone-100 dark:border-white/5">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFavoriteItem(item)}
                                  aria-label="Yêu thích"
                                  className="p-2 rounded-full bg-white/90 text-stone-700 hover:bg-white shadow-xs transition-colors cursor-pointer"
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 ${
                                      item.favorite ? 'fill-rose-500 text-rose-500' : 'text-stone-600'
                                    }`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWardrobeItem(item.id)}
                                  aria-label="Xóa trang phục"
                                  className="p-2 rounded-full bg-white/90 text-stone-600 hover:text-rose-500 hover:bg-white shadow-xs transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="p-4 space-y-1">
                              <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-zinc-400">
                                <span className={`font-semibold ${accent.textClass}`}>
                                  {shortBadge}
                                </span>
                                <span>·</span>
                                <span>{item.category}</span>
                                <span>·</span>
                                <span className="font-mono tabular-nums">
                                  Size {sizeCalculation.shortSize}
                                </span>
                              </div>

                              <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-1">
                                {item.name}
                              </h4>

                              <p className="text-[11px] text-stone-500 dark:text-zinc-400 truncate">
                                Màu: {item.color} · {item.occasion}
                              </p>
                            </div>
                          </div>

                          <div className="px-4 pb-4">
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent('sw_studio_tryon', {
                                    detail: {
                                      type: 'garment',
                                      name: item.name,
                                      category: item.category,
                                      color: item.color,
                                      imageUrl: item.imageUrl,
                                    },
                                  })
                                );
                                setActiveSection('studio3d');
                              }}
                              className={`w-full py-2 rounded-xl text-xs font-semibold text-white transition-all hover:-translate-y-0.5 cursor-pointer ${accent.bgClass}`}
                            >
                              Ướm thử Studio 3D
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            )}

            {/* TAB 4: OUTFIT HISTORY & SAVED COLLECTION */}
            {activeSection === 'history' && (
              <motion.section
                key="section-history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      Lịch Sử Phối Đồ ({sortedAndFilteredHistory.length}/{savedOutfits.length})
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      Sắp xếp theo thời gian gần nhất hoặc theo dịp sử dụng để dễ dàng tìm lại các outfit yêu thích
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('studio3d')}
                    className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 ${accent.bgClass}`}
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Phối đồ mới trong Studio 3D</span>
                  </button>
                </div>

                {/* Sorting & Occasion Filtering Toolbar */}
                {savedOutfits.length > 0 && (
                  <div
                    className={`rounded-2xl border p-4 space-y-3.5 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-[#121217] border-white/10'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-stone-500 dark:text-zinc-400">
                          Sắp xếp theo:
                        </span>
                        {[
                          { id: 'newest', label: 'Thời gian gần nhất' },
                          { id: 'occasion', label: 'Theo dịp sử dụng' },
                          { id: 'oldest', label: 'Thời gian cũ nhất' },
                        ].map((opt) => {
                          const active = historySortBy === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setHistorySortBy(opt.id as 'newest' | 'oldest' | 'occasion')
                              }
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                active
                                  ? `${accent.bgClass} text-white shadow-xs`
                                  : isLightMode
                                  ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative min-w-[220px]">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          placeholder="Tìm tên outfit, món đồ, dịp..."
                          className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                            isLightMode
                              ? 'bg-stone-50 border-stone-200 text-stone-900'
                              : 'bg-black/40 border-white/10 text-zinc-100'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-stone-100 dark:border-white/10 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-stone-500 dark:text-zinc-400 mr-1">
                        Lọc theo dịp:
                      </span>
                      {['Tất cả', ...OCCASION_TYPES].map((occ) => {
                        const active = historyOccasionFilter === occ;
                        return (
                          <button
                            key={occ}
                            type="button"
                            onClick={() => setHistoryOccasionFilter(occ)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              active
                                ? `${accent.bgClass} text-white`
                                : isLightMode
                                ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                            }`}
                          >
                            {occ}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {savedOutfits.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-12 text-center space-y-3 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-[#121217] border-white/10'
                    }`}
                  >
                    <History className="w-10 h-10 text-stone-400 mx-auto" />
                    <h4 className="text-base font-bold">Chưa có lịch sử phối đồ nào</h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      Hãy nhấn vào các bộ đồ trong mục Gợi ý phối đồ hoặc Manocanh 3D để lưu lại bộ trang phục yêu thích.
                    </p>
                  </div>
                ) : sortedAndFilteredHistory.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-10 text-center space-y-2.5 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-[#121217] border-white/10'
                    }`}
                  >
                    <p className="text-sm font-bold">
                      Không tìm thấy bộ trang phục nào khớp với bộ lọc hiện tại
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryOccasionFilter('Tất cả');
                        setHistorySearchQuery('');
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${accent.softBgClass} ${accent.textClass}`}
                    >
                      Đặt lại bộ lọc tìm kiếm
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sortedAndFilteredHistory.map((saved, idx) => (
                      <motion.div
                        key={saved.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 shadow-2xs ${
                          isLightMode
                            ? 'bg-white border-stone-200'
                            : 'bg-[#121217] border-white/10'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg font-semibold ${accent.softBgClass} ${accent.textClass}`}
                              >
                                {saved.occasion}
                              </span>
                              <span className="text-stone-500 dark:text-zinc-400">
                                {saved.weatherNote}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedOutfit(saved.id)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Xóa khỏi lịch sử"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <h4 className="text-lg font-bold">
                            {saved.title}
                          </h4>

                          <ul className="space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-zinc-300">
                            {saved.items.map((it, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <Check className={`w-3.5 h-3.5 shrink-0 ${accent.textClass}`} />
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>

                          <p className="text-xs text-stone-500 dark:text-zinc-400 italic pt-2 border-t border-stone-100 dark:border-white/10">
                            "{saved.auraAdvice}"
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

            {/* SECTION 5: STUDIO 3D CHUYÊN SÂU */}
            {activeSection === 'studio3d' && (
              <motion.section
                key="studio3d"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full"
              >
                <React.Suspense
                  fallback={
                    <div className="p-12 text-center text-sm text-stone-500">
                      Đang khởi tạo Studio 3D chuyên sâu...
                    </div>
                  }
                >
                  <StudioSection weatherContext={selectedWeather} />
                </React.Suspense>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* OUTFIT DETAIL MODAL — Clean White in Light Mode, Sleek Dark in Dark Mode */}
      <AnimatePresence>
        {selectedOutfitDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
            onClick={() => setSelectedOutfitDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 cursor-default ${
                isLightMode
                  ? 'bg-white text-stone-900 border-stone-200'
                  : 'bg-[#121217] text-zinc-100 border-white/15'
              }`}
            >
              {/* Left 5 Cols: Outfit Image & Constituent Cropped Pieces */}
              <div className="lg:col-span-5 bg-[#F8F8FA] p-6 flex flex-col justify-between gap-4 border-b lg:border-b-0 lg:border-r border-stone-200/80 dark:border-white/10">
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

              {/* Right 7 Cols: Detailed Size Recommendation & Try-On Mannequin Button */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-white font-bold ${accent.bgClass}`}
                        >
                          {getShortStyleBadge(selectedOutfitDetail.styleTag)}
                        </span>
                        <span className="text-stone-500 dark:text-zinc-400">
                          {selectedOutfitDetail.occasion} · {selectedOutfitDetail.weatherNote}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20 text-[11px] inline-flex items-center gap-1">
                          <CloudSun className="w-3 h-3 text-amber-500" />
                          <span>{selectedWeather.city} · {selectedWeather.temp}°C</span>
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-extrabold leading-snug pt-1">
                        {selectedOutfitDetail.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOutfitDetail(null)}
                      className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* SIZE & BODY MEASUREMENT ANALYSIS BOX */}
                  <div
                    className={`rounded-2xl p-4 border space-y-3 ${
                      isLightMode
                        ? 'bg-stone-50 border-stone-200 text-stone-900'
                        : 'bg-white/5 border-white/10 text-zinc-100'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Ruler className={`w-4 h-4 ${accent.textClass}`} />
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
                        className={`text-xs font-semibold hover:underline cursor-pointer ${accent.textClass}`}
                      >
                        Chỉnh sửa số đo →
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div
                        className={`p-2.5 rounded-xl border ${accent.softBgClass} ${accent.borderClass}`}
                      >
                        <span className="text-[11px] opacity-75 block">Size Áo / Đầm</span>
                        <span className={`text-lg font-extrabold ${accent.textClass}`}>
                          Size {sizeCalculation.topSize}
                        </span>
                      </div>
                      <div
                        className={`p-2.5 rounded-xl border ${accent.softBgClass} ${accent.borderClass}`}
                      >
                        <span className="text-[11px] opacity-75 block">Size Quần / Váy</span>
                        <span className={`text-lg font-extrabold ${accent.textClass}`}>
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

                    <div className="text-xs leading-relaxed text-stone-600 dark:text-zinc-300">
                      <strong>Số đo 3 vòng ({sizeCalculation.bustCm} - {sizeCalculation.waistCm} - {sizeCalculation.hipCm} cm):</strong>{' '}
                      {sizeCalculation.fitAdvice}
                    </div>
                  </div>

                  {/* Items & Styling Advice */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
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

                  <p
                    className={`text-xs leading-relaxed text-stone-600 dark:text-zinc-300 italic border-l-2 pl-3 ${accent.borderClass}`}
                  >
                    {selectedOutfitDetail.auraAdvice}
                  </p>
                </div>

                {/* Modal Action Buttons: Try On 3D Studio + Save to History */}
                <div className="pt-4 border-t border-stone-200 dark:border-white/10 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('sw_studio_tryon', {
                          detail: {
                            type: 'outfit',
                            title: selectedOutfitDetail.title,
                            topName: selectedOutfitDetail.topName,
                            bottomName: selectedOutfitDetail.bottomName,
                            topColor: selectedOutfitDetail.topColor,
                            bottomColor: selectedOutfitDetail.bottomColor,
                            topImageUrl: selectedOutfitDetail.topImageUrl,
                            bottomImageUrl: selectedOutfitDetail.bottomImageUrl,
                            imageUrl: selectedOutfitDetail.imageUrl,
                            isDressOrSkirt: selectedOutfitDetail.isDressOrSkirt,
                          },
                        })
                      );
                      setSelectedOutfitDetail(null);
                      setActiveSection('studio3d');
                    }}
                    className={`w-full sm:flex-1 py-3 px-5 rounded-2xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer ${accent.bgClass}`}
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Ướm thử trong Studio 3D</span>
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
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'border-stone-300 dark:border-white/15 hover:bg-stone-100 dark:hover:bg-white/5'
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

      {/* Top-Right Avatar User Profile Drawer ("Thông tin cá nhân") */}
      {showProfileDrawer && (
        <ProfileDrawer
          profile={profile}
          onClose={() => setShowProfileDrawer(false)}
          onUpdateProfile={handleUpdateProfile}
          onSignOut={() => {
            setShowProfileDrawer(false);
            setActiveSessionAccount(null);
            setCustomSessionUser(null);
            signOut(auth).catch(() => {});
          }}
        />
      )}

      {/* Add Garment Modal */}
      {showAddGarmentModal && (
        <AddGarmentModal
          accentColor={profile.accentColor}
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
