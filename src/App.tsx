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
  GARMENT_CATEGORIES,
  OCCASION_TYPES,
  STARTER_WARDROBE_TEMPLATES,
  WEATHER_PRESETS,
} from './constants';
import {
  AuraOutfitRecommendation,
  GarmentCategory,
  GenderOption,
  OccasionType,
  SavedOutfit,
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
import { MannequinTryOnStudio } from './components/MannequinTryOnStudio';

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
} from 'lucide-react';

type ActiveSection =
  | 'discover'
  | 'mannequin'
  | 'studio3d'
  | 'wardrobe'
  | 'weather_occasions'
  | 'history';

// Local storage helpers so both Firebase Auth users and EmailJS OTP + SHA-256 users have instant, reliable persistence
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

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);

  // Navigation & Collapsible Sidebar state
  const [activeSection, setActiveSection] = useState<ActiveSection>('discover');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeather, setSelectedWeather] = useState<WeatherContextData>(WEATHER_PRESETS[0]);
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionType>('Đi làm / Đi học');

  // Modals & Drawers
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showAddGarmentModal, setShowAddGarmentModal] = useState(false);
  const [openAuraChatSignal, setOpenAuraChatSignal] = useState(false);

  // AI Aura Dynamic Outfit Recommendations
  const [auraOutfits, setAuraOutfits] = useState<AuraOutfitRecommendation[]>([]);
  const [generatingOutfits, setGeneratingOutfits] = useState(false);
  const [savedTitles, setSavedTitles] = useState<string[]>([]);

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
          setProfile(data);
          saveLocalProfile(activeUser.uid, data);
          setWardrobeItems(loadLocalWardrobe(activeUser.uid));
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
        setProfile(cachedProfile);
        setNeedsOnboarding(false);
        setWardrobeItems(loadLocalWardrobe(activeUser.uid));
        setSavedOutfits(loadLocalOutfits(activeUser.uid));
      } else {
        setNeedsOnboarding(true);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [authReady, activeUser]);

  useEffect(() => {
    hydrateUserSession();
  }, [hydrateUserSession]);

  // 3. Sync Light / Dark Theme and User's Chosen Accent Color Variables to <html>
  useEffect(() => {
    const mode = profile?.themeMode || 'light';
    const rootEl = document.documentElement;
    if (mode === 'dark') {
      rootEl.classList.add('dark');
    } else {
      rootEl.classList.remove('dark');
    }

    const accentObj = ACCENT_COLORS[profile?.accentColor || 'amber'] || ACCENT_COLORS.amber;
    rootEl.style.setProperty('--accent-primary', accentObj.hex);
    rootEl.style.setProperty('--accent-primary-hover', accentObj.hoverHex);
  }, [profile?.themeMode, profile?.accentColor]);

  // 4. Real-time Firestore Listeners when authenticated with Firebase Auth
  useEffect(() => {
    if (!authReady || !activeUser || !profile?.onboardingCompleted) return;

    if (!activeUser.hasFirebaseAuth) {
      setWardrobeItems(loadLocalWardrobe(activeUser.uid));
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
          setWardrobeItems(items);
          saveLocalWardrobe(activeUser.uid, items);
        } else {
          setWardrobeItems(loadLocalWardrobe(activeUser.uid));
        }
      },
      (error) => {
        console.warn('Wardrobe listener fallback to local cache:', error);
        setWardrobeItems(loadLocalWardrobe(activeUser.uid));
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
  }, [authReady, activeUser, profile?.onboardingCompleted]);

  // 5. Compute Default Curated Outfits when AI Aura hasn't been triggered yet
  const defaultCuratedOutfits: AuraOutfitRecommendation[] = useMemo(() => {
    const primaryStyle = profile?.favoriteStyles?.[0] || 'Tối giản (Minimalist)';
    const secondaryStyle = profile?.favoriteStyles?.[1] || 'Thanh lịch (Smart Casual)';

    return [
      {
        title: `Phối Đồ ${selectedOccasion.split('/')[0].trim()} — ${primaryStyle.split('(')[0].trim()}`,
        occasion: selectedOccasion,
        weatherNote: `${selectedWeather.city} · ${selectedWeather.temp}°C (${selectedWeather.condition})`,
        items: [
          wardrobeItems[0]?.name || 'Áo Len Cashmere Beige Tối Giản',
          wardrobeItems[3]?.name || 'Quần Âu Ống Suông Kem Sữa',
          'Giày Loafer Da Nâu Cổ Điển',
          'Đồng Hồ Dây Da Tối Giản',
        ],
        colorPalette: ['#E7E5E4', '#A8A29E', '#78350F'],
        auraAdvice: `Với tiết trời ${selectedWeather.temp}°C (${selectedWeather.condition.toLowerCase()}) tại ${selectedWeather.city}, sự kết hợp chất liệu thoáng nhẹ cùng phom dáng ${primaryStyle} giúp ${profile?.displayName || 'bạn'} giữ vẻ ngoài thanh lịch suốt cả ngày.`,
      },
      {
        title: `Năng Lượng Ngày Mới — ${secondaryStyle.split('(')[0].trim()}`,
        occasion: 'Dạo phố / Cafe',
        weatherNote: `Độ ẩm ${selectedWeather.humidity}% · Gió ${selectedWeather.wind}`,
        items: [
          wardrobeItems[1]?.name || 'Áo Khoác Denim Wash Cổ Điển',
          'Áo Thun Cotton Trắng Định Lượng Cao',
          'Quần Chinos Tông Trung Tính',
          'Giày Sneaker Da Phối Màu Retro',
        ],
        colorPalette: ['#1E293B', '#F8FAFC', '#92400E'],
        auraAdvice: `Lớp áo khoác ngoài linh hoạt giúp bạn dễ dàng thích ứng khi di chuyển giữa không gian điều hòa và ngoài trời cho dịp dạo phố hoặc gặp gỡ bạn bè.`,
      },
      {
        title: `Điểm Nhấn Tinh Tế Cho Buổi Tối`,
        occasion: 'Tiệc tối / Hẹn hò',
        weatherNote: `Thích hợp tiết trời ${selectedWeather.seasonMatch}`,
        items: [
          wardrobeItems[2]?.name || 'Áo Blazer Kẻ Tartan Thanh Lịch',
          wardrobeItems[5]?.name || 'Quần Ống Suông Cạp Cao Ivory',
          'Túi Đeo Chéo Da Thuộc Tối Giản',
        ],
        colorPalette: ['#292524', '#D6D3D1', '#B45309'],
        auraAdvice: `Tông màu trầm ấm tôn lên nét cuốn hút tự nhiên, phù hợp với giới tính ${profile?.gender || 'của bạn'} và gu thẩm mỹ cá nhân đã chọn.`,
      },
    ];
  }, [profile, selectedOccasion, selectedWeather, wardrobeItems]);

  const displayedOutfits = auraOutfits.length > 0 ? auraOutfits : defaultCuratedOutfits;

  // Complete Initial 3-Step Onboarding & Seed Starter Wardrobe
  const handleCompleteOnboarding = async (data: {
    displayName: string;
    gender: GenderOption;
    favoriteStyles: string[];
  }) => {
    if (!activeUser) return;

    const newProfile: UserProfile = {
      uid: activeUser.uid,
      displayName: data.displayName.slice(0, 80),
      email: (activeUser.email || 'user@gmail.com').slice(0, 150),
      gender: data.gender,
      favoriteStyles: data.favoriteStyles.slice(0, 10),
      accentColor: 'amber',
      themeMode: 'light',
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

    // Always persist locally first so transition is immediate and error-free
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

        for (const template of STARTER_WARDROBE_TEMPLATES) {
          await addDoc(collection(db, 'wardrobeItems'), {
            userId: activeUser.uid,
            name: template.name,
            category: template.category,
            styleTag: template.styleTag,
            color: template.color,
            season: template.season,
            occasion: template.occasion,
            imageUrl: template.imageUrl,
            favorite: template.favorite,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.warn('Firestore onboarding sync warning:', error);
    }
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
    if (updates.displayName !== undefined) cleanUpdates.displayName = updates.displayName.slice(0, 80);
    if (updates.gender !== undefined) cleanUpdates.gender = updates.gender;
    if (updates.favoriteStyles !== undefined) cleanUpdates.favoriteStyles = updates.favoriteStyles.slice(0, 10);
    if (updates.accentColor !== undefined) cleanUpdates.accentColor = updates.accentColor;
    if (updates.themeMode !== undefined) cleanUpdates.themeMode = updates.themeMode;
    if (updates.cloudinaryCloudName !== undefined) cleanUpdates.cloudinaryCloudName = updates.cloudinaryCloudName.slice(0, 100);
    if (updates.cloudinaryUploadPreset !== undefined) cleanUpdates.cloudinaryUploadPreset = updates.cloudinaryUploadPreset.slice(0, 100);

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
          favoriteStyles: updatedProfile.favoriteStyles.slice(0, 10),
          accentColor: updatedProfile.accentColor,
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

  // Add Garment to Wardrobe (Cloudinary + Firestore/Local)
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

  // Generate AI Aura Outfit Recommendations based on Weather & Occasion
  const handleGenerateAuraOutfits = async () => {
    if (!profile || generatingOutfits) return;
    setGeneratingOutfits(true);
    try {
      const response = await fetch('/api/aura/recommend-outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: profile,
          wardrobeItems,
          weatherContext: selectedWeather,
          occasion: selectedOccasion,
        }),
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.outfits) && data.outfits.length > 0) {
        setAuraOutfits(data.outfits);
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
      const matchesCat =
        selectedCategory === 'Tất cả' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.styleTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [wardrobeItems, selectedCategory, searchQuery]);

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

  // Stage 1: Wardrobe Opening Animation + Login / Registration
  if (!activeUser) {
    return (
      <WardrobeDoorAuth
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

  const accent = ACCENT_COLORS[profile.accentColor || 'amber'] || ACCENT_COLORS.amber;
  const isLightMode = profile.themeMode === 'light';

  const navItems: { id: ActiveSection; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'discover', label: 'Gợi ý phối đồ hôm nay', icon: Compass },
    { id: 'mannequin', label: 'Manocanh 3D ướm thử đồ', icon: UserCheck },
    { id: 'studio3d', label: 'Studio 3D chuyên sâu', icon: Wand2 },
    { id: 'wardrobe', label: 'Tủ đồ của tôi', icon: Shirt, count: wardrobeItems.length },
    { id: 'weather_occasions', label: 'Phối theo Thời tiết & Dịp', icon: CloudSun },
    { id: 'history', label: 'Lịch sử phối đồ', icon: History, count: savedOutfits.length },
  ];

  // Stage 3: Main Smart Wardrobe Workspace
  // Light Mode: Pure crisp white surfaces (`bg-white`) + buttons strictly in user's chosen accent color (`accent.bgClass`).
  // Dark Mode: Deep battery-saving dark surfaces (`dark:bg-stone-950` / `dark:bg-stone-900`) + accent buttons.
  return (
    <div
      className={`min-h-screen flex transition-colors duration-300 ${
        isLightMode
          ? 'bg-white text-stone-900'
          : 'bg-stone-950 text-stone-100'
      }`}
    >
      {/* COLLAPSIBLE LEFT SIDEBAR TOOLBAR */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 276 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`shrink-0 border-r flex flex-col justify-between p-4 select-none sticky top-0 h-screen z-30 transition-colors ${
          isLightMode
            ? 'bg-white border-stone-200'
            : 'bg-stone-900/95 border-stone-800/80'
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
                    AI Stylist · Aura
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

          {/* Primary Quick Add Button (Uses User's Chosen Accent Color) */}
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
                Thanh công cụ
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

          {/* Quick Category Filter in Left Sidebar (Hidden when collapsed) */}
          {!sidebarCollapsed && (
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
                Danh mục tủ đồ
              </p>
              <div className="space-y-1">
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
                          : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
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

        {/* Bottom Light / Dark Mode & Accent Color Quick Controls */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
          <button
            type="button"
            onClick={() =>
              handleUpdateProfile({
                themeMode: profile.themeMode === 'dark' ? 'light' : 'dark',
              })
            }
            title={
              profile.themeMode === 'dark'
                ? 'Đang ở Chế độ Tối — Nhấn để sang Chế độ Sáng (Nền trắng)'
                : 'Đang ở Chế độ Sáng (Nền trắng) — Nhấn để sang Chế độ Tối'
            }
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
            } rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isLightMode
                ? `${accent.softBgClass} ${accent.textClass} border ${accent.borderClass}`
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              {profile.themeMode === 'dark' ? (
                <Moon className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Sun className="w-4 h-4 shrink-0" />
              )}
              {!sidebarCollapsed && (
                <span className="truncate">
                  {profile.themeMode === 'dark' ? 'Chế độ Tối (Pin)' : 'Chế độ Sáng (Trắng)'}
                </span>
              )}
            </span>
            {!sidebarCollapsed && (
              <span className="text-[10px] font-mono uppercase opacity-75">Đổi</span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER (Crisp white in Light mode, dark in Dark mode, circular avatar top-right) */}
        <header
          className={`h-16 sm:h-20 px-6 lg:px-8 border-b flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors ${
            isLightMode
              ? 'bg-white/95 border-stone-200'
              : 'bg-stone-900/90 border-stone-800/80'
          } backdrop-blur-md`}
        >
          {/* Zone 1: Contextual Greeting */}
          <div className="truncate">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-white truncate">
              Xin chào, {profile.displayName}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
              Phong cách yêu thích: {(profile.favoriteStyles || []).join(' · ')}
            </p>
          </div>

          {/* Zone 2: Quick Section Pills & Live Weather */}
          <div className="hidden xl:flex items-center gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveSection('mannequin')}
              className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSection === 'mannequin'
                  ? `${accent.bgClass} text-white shadow-xs`
                  : `${accent.softBgClass} ${accent.textClass}`
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Ướm thử Manocanh 3D</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('history')}
              className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSection === 'history'
                  ? `${accent.bgClass} text-white shadow-xs`
                  : `${accent.softBgClass} ${accent.textClass}`
              }`}
            >
              <History className="w-4 h-4" />
              <span>Lịch sử phối đồ ({savedOutfits.length})</span>
            </button>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                isLightMode
                  ? 'bg-white border-stone-200 text-stone-700'
                  : 'bg-stone-800/90 border-stone-700 text-stone-200'
              }`}
            >
              <CloudSun className={`w-4 h-4 ${accent.textClass}`} />
              <select
                value={selectedWeather.city}
                onChange={(e) => {
                  const found = WEATHER_PRESETS.find((w) => w.city === e.target.value);
                  if (found) setSelectedWeather(found);
                }}
                aria-label="Chọn thành phố thời tiết"
                className="bg-transparent font-semibold focus:outline-none cursor-pointer"
              >
                {WEATHER_PRESETS.map((w) => (
                  <option key={w.city} value={w.city} className="bg-white dark:bg-stone-900">
                    {w.city}: {w.temp}°C — {w.condition}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Zone 3: Top-Right Controls & Circular User Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowProfileDrawer(true)}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${accent.softBgClass} ${accent.textClass}`}
            >
              <Palette className="w-4 h-4" />
              <span>Màu sắc & Giao diện</span>
            </button>

            <button
              type="button"
              onClick={() => setOpenAuraChatSignal(true)}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${accent.bgClass}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat AI Aura</span>
            </button>

            <button
              type="button"
              onClick={() => setShowProfileDrawer(true)}
              title="Thông tin người dùng & Tùy chỉnh giao diện"
              aria-label="Mở trang thông tin người dùng"
              className={`w-10 h-10 rounded-full ${accent.bgClass} text-white font-bold text-sm flex items-center justify-center shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-stone-950 ring-stone-300 dark:ring-stone-700 hover:scale-105 transition-transform cursor-pointer shrink-0`}
            >
              {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
            </button>
          </div>
        </header>

        {/* MAIN SCROLLABLE WORKSPACE WITH SMOOTH MOTION TRANSITIONS */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 pb-24">
          <AnimatePresence mode="wait">
            {/* TAB: MANNEQUIN 3D TRY-ON STUDIO */}
            {activeSection === 'mannequin' && (
              <motion.div
                key="section-mannequin"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <MannequinTryOnStudio
                  gender={profile.gender}
                  accentColor={profile.accentColor}
                  themeMode={profile.themeMode}
                  wardrobeItems={wardrobeItems}
                  savedOutfits={savedOutfits}
                  weather={selectedWeather}
                  selectedOccasion={selectedOccasion}
                  onSaveTryOnHistory={handleSaveOutfit}
                  onDeleteHistoryItem={handleDeleteSavedOutfit}
                />
              </motion.div>
            )}

            {/* TAB: STUDIO MA-NƠ-CANH 3D CHUYÊN SÂU (tải lười) */}
            {activeSection === 'studio3d' && (
              <motion.div
                key="section-studio3d"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <React.Suspense
                  fallback={
                    <div className="flex h-[calc(100dvh-10rem)] min-h-[620px] items-center justify-center text-sm text-stone-500 dark:text-stone-400">
                      Đang tải Studio 3D…
                    </div>
                  }
                >
                  <StudioSection />
                </React.Suspense>
              </motion.div>
            )}

            {/* TAB: DISCOVER & WEATHER OUTFIT RECOMMENDATIONS */}
            {(activeSection === 'discover' || activeSection === 'weather_occasions') && (
              <motion.div
                key="section-discover"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                {/* Weather & Occasion Interactive Banner */}
                <section
                  className={`rounded-3xl border p-6 lg:p-8 shadow-xs transition-colors ${
                    isLightMode
                      ? 'bg-white border-stone-200'
                      : 'bg-stone-900 border-stone-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
                        <span className={accent.textClass}>Trợ lý thời trang AI Aura</span>
                        <span aria-hidden="true">·</span>
                        <span>Giới tính: {profile.gender}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{selectedWeather.temp}°C</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                        Gợi ý phối đồ theo thời tiết & sự kiện trong ngày
                      </h2>
                      <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                        Hôm nay tại <strong>{selectedWeather.city}</strong> trời{' '}
                        <strong>{selectedWeather.condition.toLowerCase()}</strong> (Nhiệt độ{' '}
                        <span className="font-mono tabular-nums">{selectedWeather.temp}°C</span>, Độ ẩm{' '}
                        <span className="font-mono tabular-nums">{selectedWeather.humidity}%</span>). Chọn dịp bên dưới để AI Aura thiết kế bộ trang phục hoặc vào phòng <strong>Manocanh 3D</strong> để ướm thử trực tiếp.
                      </p>
                    </div>

                    {/* Weather Metric Summary */}
                    <div
                      className={`flex flex-wrap items-center gap-4 border rounded-2xl p-4 shrink-0 ${
                        isLightMode
                          ? 'bg-white border-stone-200'
                          : 'bg-stone-950 border-stone-800'
                      }`}
                    >
                      <div className="pr-4 border-r border-stone-200 dark:border-stone-800">
                        <span className="text-xs text-stone-400 block">Nhiệt độ</span>
                        <span className="text-2xl font-bold font-mono tabular-nums">
                          {selectedWeather.temp}°C
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-stone-600 dark:text-stone-400">
                        <div className="flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-sky-500" />
                          <span>Độ ẩm: {selectedWeather.humidity}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Wind className="w-3.5 h-3.5 text-stone-400" />
                          <span>Gió: {selectedWeather.wind}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Occasion Buttons (All styled with User's Chosen Accent Color) */}
                  <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {OCCASION_TYPES.map((occ) => {
                        const active = selectedOccasion === occ;
                        return (
                          <button
                            key={occ}
                            type="button"
                            onClick={() => setSelectedOccasion(occ)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                              active
                                ? `${accent.bgClass} text-white shadow-xs scale-[1.02]`
                                : `${accent.softBgClass} ${accent.textClass} hover:opacity-90`
                            }`}
                          >
                            {occ}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveSection('mannequin')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${accent.borderClass} ${accent.textClass} ${accent.softBgClass}`}
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Mở Manocanh ướm đồ</span>
                      </button>

                      <button
                        type="button"
                        disabled={generatingOutfits}
                        onClick={handleGenerateAuraOutfits}
                        className={`px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap ${accent.bgClass}`}
                      >
                        <Wand2 className={`w-4 h-4 ${generatingOutfits ? 'animate-spin' : ''}`} />
                        <span>
                          {generatingOutfits ? 'Aura đang phối đồ...' : 'AI Aura Phối Đồ Mới'}
                        </span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 3 Curated Outfit Cards from AI Aura */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight">
                        Đề xuất từ AI Aura cho dịp {selectedOccasion}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Được tinh chỉnh theo phong cách {(profile.favoriteStyles || []).slice(0, 3).join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {displayedOutfits.map((outfit, idx) => {
                      const isAlreadySaved = savedTitles.includes(outfit.title);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06 }}
                          whileHover={{ y: -3 }}
                          className={`rounded-3xl border p-6 flex flex-col justify-between space-y-5 shadow-xs transition-all ${
                            isLightMode
                              ? 'bg-white border-stone-200'
                              : 'bg-stone-900 border-stone-800'
                          }`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                              <span>{outfit.occasion}</span>
                              <span aria-hidden="true">·</span>
                              <span>{outfit.weatherNote}</span>
                            </div>

                            <h4 className="text-lg font-bold text-stone-900 dark:text-white leading-snug">
                              {outfit.title}
                            </h4>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-stone-400">Bảng màu:</span>
                              <div className="flex items-center gap-1.5">
                                {(outfit.colorPalette || ['#E7E5E4', '#1E293B', '#B45309']).map(
                                  (hex, i) => (
                                    <span
                                      key={i}
                                      className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-700"
                                      style={{ backgroundColor: hex }}
                                      title={hex}
                                    />
                                  )
                                )}
                              </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800/80">
                              <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                                Các item phối hợp:
                              </p>
                              <ul className="space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                                {outfit.items.map((piece, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent.bgClass}`}
                                    />
                                    <span>{piece}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div
                              className={`p-3.5 rounded-2xl ${accent.softBgClass} text-xs text-stone-700 dark:text-stone-300 leading-relaxed`}
                            >
                              <strong className={`${accent.textClass} block mb-1`}>
                                Lời khuyên từ AI Aura:
                              </strong>
                              {outfit.auraAdvice}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              disabled={isAlreadySaved}
                              onClick={() => handleSaveOutfit(outfit)}
                              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isAlreadySaved
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : `${accent.bgClass} text-white shadow-xs`
                              }`}
                            >
                              {isAlreadySaved ? (
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

                            <button
                              type="button"
                              onClick={() => setActiveSection('mannequin')}
                              className={`py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${accent.softBgClass} ${accent.textClass}`}
                            >
                              Ướm thử
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>

                {/* Preview of Wardrobe in Discover View */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight">
                        Tủ Đồ Cá Nhân ({wardrobeItems.length} món)
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Các món đồ hiện có để phối trên Manocanh 3D và AI Aura
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('wardrobe')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${accent.softBgClass} ${accent.textClass}`}
                    >
                      Xem toàn bộ tủ đồ →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wardrobeItems.slice(0, 3).map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ y: -3 }}
                        className={`rounded-3xl border overflow-hidden flex flex-col justify-between transition-all ${
                          isLightMode
                            ? 'bg-white border-stone-200'
                            : 'bg-stone-900 border-stone-800'
                        }`}
                      >
                        <div className="relative aspect-[4/3] w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 space-y-1">
                          <div className="text-xs text-stone-500">
                            {item.category} · {item.color}
                          </div>
                          <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                            {item.name}
                          </h4>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {/* TAB: DIGITAL WARDROBE CLOSET */}
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
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Quản lý hình ảnh trang phục qua Cloudinary & đồng bộ trực tiếp với Firebase
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm áo, quần, màu sắc..."
                        className={`pl-9 pr-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                          isLightMode
                            ? 'bg-white border-stone-200 text-stone-900'
                            : 'bg-stone-900 border-stone-800 text-stone-100'
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

                {/* Category Filter Tabs (Styled with User's Chosen Accent Color) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
                            : `${accent.softBgClass} ${accent.textClass} hover:opacity-90`
                        }`}
                      >
                        {cat}
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
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    <Shirt className="w-10 h-10 text-stone-400 mx-auto" />
                    <h4 className="text-base font-bold">Chưa có trang phục nào trong danh mục này</h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      Hãy tải ảnh quần áo của bạn lên để ướm thử trên Manocanh 3D và nhận gợi ý từ AI Aura.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddGarmentModal(true)}
                      className={`mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer ${accent.bgClass}`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tải ảnh trang phục đầu tiên</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWardrobeItems.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ y: -4 }}
                        className={`group rounded-3xl border overflow-hidden flex flex-col justify-between transition-all shadow-xs ${
                          isLightMode
                            ? 'bg-white border-stone-200'
                            : 'bg-stone-900 border-stone-800'
                        }`}
                      >
                        <div>
                          <div className="relative aspect-[4/3] w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleFavoriteItem(item)}
                                aria-label="Yêu thích"
                                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    item.favorite ? 'fill-rose-500 text-rose-500' : 'text-white'
                                  }`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteWardrobeItem(item.id)}
                                aria-label="Xóa trang phục"
                                className="p-2 rounded-full bg-black/50 text-white/80 hover:text-rose-400 hover:bg-black/70 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="p-5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                              <span>{item.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.color}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.season}</span>
                            </div>

                            <h4 className="text-base font-bold text-stone-900 dark:text-white leading-snug">
                              {item.name}
                            </h4>

                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              Phong cách: {item.styleTag} · Dịp: {item.occasion}
                            </p>
                          </div>
                        </div>

                        <div className="px-5 pb-4">
                          <button
                            type="button"
                            onClick={() => setActiveSection('mannequin')}
                            className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${accent.softBgClass} ${accent.textClass}`}
                          >
                            Ướm thử lên Manocanh 3D
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

            {/* TAB: OUTFIT HISTORY & SAVED COLLECTION */}
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
                      Lịch Sử Phối Đồ & Bộ Sưu Tập Đã Lưu ({savedOutfits.length})
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Toàn bộ các bộ trang phục bạn đã ướm thử trên Manocanh 3D hoặc lưu từ gợi ý của AI Aura
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('mannequin')}
                    className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 cursor-pointer ${accent.bgClass}`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Phối đồ mới trên Manocanh</span>
                  </button>
                </div>

                {savedOutfits.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-12 text-center space-y-3 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    <History className="w-10 h-10 text-stone-400 mx-auto" />
                    <h4 className="text-base font-bold">Chưa có lịch sử phối đồ nào</h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      Hãy vào mục Manocanh 3D hoặc nhấn "Lưu vào Lịch sử" ở các gợi ý của AI Aura để lưu giữ công thức phối đồ.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSection('mannequin')}
                      className={`mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer ${accent.bgClass}`}
                    >
                      <span>Mở Manocanh 3D ngay</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedOutfits.map((saved, idx) => (
                      <motion.div
                        key={saved.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 shadow-xs ${
                          isLightMode
                            ? 'bg-white border-stone-200'
                            : 'bg-stone-900 border-stone-800'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                              <span>{saved.occasion}</span>
                              <span aria-hidden="true">·</span>
                              <span>{saved.weatherNote}</span>
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

                          <h4 className="text-lg font-bold text-stone-900 dark:text-white">
                            {saved.title}
                          </h4>

                          <ul className="space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                            {saved.items.map((it, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <Check className={`w-3.5 h-3.5 shrink-0 ${accent.textClass}`} />
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>

                          <p className="text-xs text-stone-500 dark:text-stone-400 italic pt-2 border-t border-stone-100 dark:border-stone-800">
                            "{saved.auraAdvice}"
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Top-Right Avatar User Profile & Theme Settings Drawer */}
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

      {/* Add Garment Modal (Cloudinary + Firestore) */}
      {showAddGarmentModal && (
        <AddGarmentModal
          accentColor={profile.accentColor}
          cloudinaryCloudName={profile.cloudinaryCloudName}
          cloudinaryUploadPreset={profile.cloudinaryUploadPreset}
          onClose={() => setShowAddGarmentModal(false)}
          onAddGarment={handleAddGarment}
        />
      )}

      {/* Bottom-Right Circular AI Aura Stylist Chat Widget */}
      <AuraChatWidget
        profile={profile}
        wardrobeItems={wardrobeItems}
        weather={selectedWeather}
        selectedOccasion={selectedOccasion}
        externalOpen={openAuraChatSignal}
        onExternalOpenHandled={() => setOpenAuraChatSignal(false)}
      />
    </div>
  );
}
