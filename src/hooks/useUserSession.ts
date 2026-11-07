/**
 * Phiên người dùng: trạng thái đăng nhập Firebase, hồ sơ, tủ đồ, lịch sử phối đồ và các thao tác ghi.
 *
 * Dữ liệu đi theo hướng "máy trước, mây sau":
 *  - Mọi thay đổi ghi vào state + localStorage ngay (localStore.ts).
 *  - Chỉ khi canSync (không phải khách, email đã xác thực) mới gọi Firestore (userData.ts). Khách và
 *    tài khoản chưa xác thực không phát sinh request Firestore nào, nên không còn lỗi permission-denied.
 *  - Lần đầu được đồng bộ trên máy này: tải dữ liệu trên máy lên (syncLocalToCloud), rồi nghe thay đổi
 *    trên mây. Đồ mẫu (starter_) chỉ sống trên máy.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';
import { resolveUserAvatar } from '../constants';
import { normalizeGender } from '../../shared/gender';
import {
  isStarterItem,
  loadRemovedStarters,
  reconcileStarterWardrobe,
  rememberRemovedStarter,
} from '../domain/starterWardrobe';
import type { GenderOption, SavedOutfit, UserProfile, WardrobeItem } from '../types';
import type { ThemePrefs } from '../theme/themePrefs';
import type { AddGarmentInput, SaveOutfitInput } from '../sections/types';
import {
  consumePendingGuestMerge,
  loadLocalOutfits,
  loadLocalProfile,
  loadLocalWardrobe,
  saveLocalOutfits,
  saveLocalProfile,
  saveLocalWardrobe,
} from '../services/localStore';
import {
  canSyncUser,
  cloudCreateSavedOutfit,
  cloudCreateWardrobeItem,
  cloudDeleteSavedOutfit,
  cloudDeleteWardrobeItem,
  cloudGetProfile,
  cloudSaveProfile,
  cloudSetFavorite,
  resetCloudSyncMarker,
  subscribeUserData,
  syncLocalToCloud,
  type SyncCtx,
} from '../services/userData';
import { signOutCurrentUser } from '../services/auth';
import { clearLegacySession, refreshEmailVerification } from '../services/integrations';
import { toMillis } from '../utils/time';
import { DEFAULT_MEASUREMENTS } from '../../shared/sizing';
import { MAX_FAVORITE_STYLES } from '../../shared/styles';

export interface SessionUser {
  uid: string;
  /** null với khách */
  email: string | null;
  displayName: string;
  isAnonymous: boolean;
  emailVerified: boolean;
}

function toSessionUser(u: User | null): SessionUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName || '',
    isAnonymous: u.isAnonymous,
    emailVerified: u.emailVerified,
  };
}

const sameSessionUser = (a: SessionUser | null, b: SessionUser | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.uid === b.uid &&
    a.email === b.email &&
    a.displayName === b.displayName &&
    a.isAnonymous === b.isAnonymous &&
    a.emailVerified === b.emailVerified);

export const STORAGE_FULL_MESSAGE =
  'Bộ nhớ trình duyệt đã đầy nên thay đổi mới chưa được lưu trên máy này. Hãy xoá bớt ảnh tự tải lên.';

const isStarter = isStarterItem;

/** Đồ người dùng tự thêm (mới nhất trước), rồi tới đồ mẫu */
const orderWardrobe = (items: WardrobeItem[]) => [
  ...items.filter((i) => !isStarter(i)).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)),
  ...items.filter(isStarter),
];

const byNewest = (outfits: SavedOutfit[]) =>
  [...outfits].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

const syncWarn = (what: string) => (err: unknown) => console.warn(`Chưa đồng bộ được ${what}:`, err);


export interface OnboardingInput {
  displayName: string;
  gender: GenderOption;
  favoriteStyles: string[];
}

export function useUserSession(options: {
  /** Gọi khi nạp được hồ sơ (để áp chế độ sáng/tối của hồ sơ nếu máy chưa chọn) */
  onProfileLoaded?: (profile: UserProfile) => void;
}) {
  const onProfileLoadedRef = useRef(options.onProfileLoaded);
  onProfileLoadedRef.current = options.onProfileLoaded;

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [wardrobeItems, setWardrobeState] = useState<WardrobeItem[]>([]);
  const [savedOutfits, setOutfitsState] = useState<SavedOutfit[]>([]);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // Bản mới nhất cho các thao tác bất đồng bộ (tránh dùng state cũ trong closure)
  const profileRef = useRef<UserProfile | null>(null);
  const wardrobeRef = useRef<WardrobeItem[]>([]);
  const outfitsRef = useRef<SavedOutfit[]>([]);

  const canSync = canSyncUser(user);
  const uid = user?.uid ?? null;
  const email = user?.email ?? null;

  const ctx = useMemo<SyncCtx | null>(
    () => (uid ? { uid, email, canSync } : null),
    [uid, email, canSync]
  );
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const commitProfile = useCallback((next: UserProfile | null) => {
    profileRef.current = next;
    setProfileState(next);
    if (next && !saveLocalProfile(next.uid, next)) setStorageWarning(STORAGE_FULL_MESSAGE);
  }, []);

  const commitWardrobe = useCallback((owner: string, next: WardrobeItem[]) => {
    wardrobeRef.current = next;
    setWardrobeState(next);
    if (!saveLocalWardrobe(owner, next)) setStorageWarning(STORAGE_FULL_MESSAGE);
  }, []);

  const commitOutfits = useCallback((owner: string, next: SavedOutfit[]) => {
    outfitsRef.current = next;
    setOutfitsState(next);
    if (!saveLocalOutfits(owner, next)) setStorageWarning(STORAGE_FULL_MESSAGE);
  }, []);

  // Phiên OTP kiểu cũ trong localStorage không được Firebase xác thực (ai cũng tự tạo được),
  // nên không còn được chấp nhận. Chỉ người dùng Firebase Auth mới vào được app.
  useEffect(() => {
    clearLegacySession();
  }, []);

  // onIdTokenChanged (không phải onAuthStateChanged): còn báo cả khi khách nâng cấp (link giữ nguyên uid)
  // và khi email vừa được xác thực (refreshEmailVerification làm mới token).
  useEffect(
    () =>
      onIdTokenChanged(auth, (firebaseUser) => {
        const next = toSessionUser(firebaseUser);
        setUser((prev) => (sameSessionUser(prev, next) ? prev : next));
        setAuthReady(true);
      }),
    []
  );

  // Nạp hồ sơ + dữ liệu trên máy mỗi khi đổi tài khoản, đổi email (khách vừa nâng cấp) hoặc vừa được đồng bộ
  useEffect(() => {
    if (!authReady) return;
    if (!uid) {
      profileRef.current = null;
      wardrobeRef.current = [];
      outfitsRef.current = [];
      setProfileState(null);
      setWardrobeState([]);
      setOutfitsState([]);
      setNeedsOnboarding(false);
      setStorageWarning(null);
      return;
    }

    let cancelled = false;
    const isAnonymous = Boolean(user?.isAnonymous);
    if (!isAnonymous && consumePendingGuestMerge(uid)) resetCloudSyncMarker(uid);

    (async () => {
      if (profileRef.current?.uid !== uid) setProfileLoading(true);
      let loaded: UserProfile | null = null;
      try {
        loaded = await cloudGetProfile({ uid, email, canSync });
      } catch (err) {
        console.warn('Không đọc được hồ sơ trên mây, dùng bản trên máy:', err);
      }
      if (!loaded) {
        const local = loadLocalProfile(uid);
        if (local?.onboardingCompleted) {
          // Khách vừa nâng cấp: hồ sơ trên máy chưa có email
          loaded = email && local.email !== email ? { ...local, email } : local;
        }
      }
      if (cancelled) return;

      if (loaded) {
        onProfileLoadedRef.current?.(loaded);
        commitProfile(loaded);
        const gender = normalizeGender(loaded.gender) ?? 'Nữ';
        commitWardrobe(
          uid,
          orderWardrobe(reconcileStarterWardrobe(uid, gender, loadLocalWardrobe(uid), loadRemovedStarters(uid)))
        );
        commitOutfits(uid, byNewest(loadLocalOutfits(uid)));
        setNeedsOnboarding(!loaded.onboardingCompleted);
      } else {
        profileRef.current = null;
        setProfileState(null);
        setNeedsOnboarding(true);
      }
      setProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // user.isAnonymous đổi cùng lúc với email khi khách nâng cấp, nên không cần đưa vào deps
  }, [authReady, uid, email, canSync, commitProfile, commitWardrobe, commitOutfits]);

  // Được đồng bộ: tải dữ liệu trên máy lên một lần, rồi nghe thay đổi trên mây.
  // Chỉ chạy khi hồ sơ đã nạp đúng uid này (lúc chuyển tài khoản, state cũ còn là của uid trước).
  const onboardedUid = profile?.onboardingCompleted ? profile.uid : null;
  useEffect(() => {
    if (!ctx || !ctx.canSync || onboardedUid !== ctx.uid) return;
    const owner = ctx.uid;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        await syncLocalToCloud(ctx, {
          profile: profileRef.current,
          wardrobe: wardrobeRef.current,
          outfits: outfitsRef.current,
        });
      } catch (err) {
        console.warn('Chưa tải được dữ liệu trên máy lên mây, sẽ thử lại lần sau:', err);
      }
      if (cancelled) return;
      unsubscribe = subscribeUserData(ctx, {
        onWardrobe: (cloudItems) => {
          const starters = wardrobeRef.current.filter(isStarter);
          commitWardrobe(owner, orderWardrobe([...cloudItems, ...starters]));
        },
        onOutfits: (cloudOutfits) => {
          // Ảnh và phong cách của bộ đồ chỉ lưu trên máy (luật Firestore chưa nhận hai trường này)
          const local = new Map(outfitsRef.current.map((o) => [o.id, o]));
          const merged = cloudOutfits.map((o) => {
            const l = local.get(o.id);
            return l ? { ...o, imageUrl: l.imageUrl, styleTag: l.styleTag } : o;
          });
          commitOutfits(owner, byNewest(merged));
        },
        onError: (err) => console.warn('Mất kết nối đồng bộ, tạm dùng dữ liệu trên máy:', err),
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [ctx, onboardedUid, commitWardrobe, commitOutfits]);

  const completeOnboarding = useCallback(
    async (data: OnboardingInput, themePrefs: ThemePrefs) => {
      const c = ctxRef.current;
      if (!c) return;
      const now = new Date().toISOString();
      const measures = DEFAULT_MEASUREMENTS[data.gender];
      const newProfile: UserProfile = {
        uid: c.uid,
        displayName: data.displayName.slice(0, 80),
        email: (c.email ?? '').slice(0, 150),
        gender: data.gender,
        avatarUrl: resolveUserAvatar(data.gender),
        ...measures,
        favoriteStyles: data.favoriteStyles.slice(0, MAX_FAVORITE_STYLES),
        accentColor: themePrefs.accent,
        ...(themePrefs.accent === 'custom' ? { customAccentHex: themePrefs.customHex } : {}),
        themeMode: themePrefs.mode,
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
      };

      commitProfile(newProfile);
      commitWardrobe(
        c.uid,
        orderWardrobe(reconcileStarterWardrobe(c.uid, data.gender, wardrobeRef.current, loadRemovedStarters(c.uid)))
      );
      setNeedsOnboarding(false);
      await cloudSaveProfile(c, newProfile, newProfile).catch(syncWarn('hồ sơ'));
    },
    [commitProfile, commitWardrobe]
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const c = ctxRef.current;
      const current = profileRef.current;
      if (!c || !current) return;
      const next: UserProfile = { ...current, ...updates, updatedAt: new Date().toISOString() };
      commitProfile(next);
      // Đổi giới tính: đổi tủ đồ mẫu theo (đồ tự thêm giữ nguyên)
      const nextGender = normalizeGender(updates.gender);
      if (nextGender && nextGender !== normalizeGender(current.gender)) {
        commitWardrobe(
          c.uid,
          orderWardrobe(reconcileStarterWardrobe(c.uid, nextGender, wardrobeRef.current, loadRemovedStarters(c.uid)))
        );
      }
      await cloudSaveProfile(c, next, updates).catch(syncWarn('hồ sơ'));
    },
    [commitProfile, commitWardrobe]
  );

  const addGarment = useCallback(
    async (input: AddGarmentInput) => {
      const c = ctxRef.current;
      if (!c) return;
      const now = new Date().toISOString();
      const item: WardrobeItem = {
        id: `item_${Date.now()}`,
        userId: c.uid,
        name: input.name.slice(0, 100),
        category: input.category,
        styleTag: input.styleTag.slice(0, 60),
        color: input.color.slice(0, 50),
        season: input.season,
        occasion: input.occasion,
        imageUrl: input.imageUrl.slice(0, 350000),
        favorite: input.favorite,
        createdAt: now,
        updatedAt: now,
      };
      commitWardrobe(c.uid, [item, ...wardrobeRef.current]);
      await cloudCreateWardrobeItem(c, item).catch(syncWarn('món đồ mới'));
    },
    [commitWardrobe]
  );

  const toggleFavorite = useCallback(
    async (item: WardrobeItem) => {
      const c = ctxRef.current;
      if (!c) return;
      const favorite = !item.favorite;
      commitWardrobe(
        c.uid,
        wardrobeRef.current.map((w) => (w.id === item.id ? { ...w, favorite } : w))
      );
      await cloudSetFavorite(c, item.id, favorite).catch(syncWarn('mục yêu thích'));
    },
    [commitWardrobe]
  );

  const deleteGarment = useCallback(
    async (itemId: string) => {
      const c = ctxRef.current;
      if (!c) return;
      if (itemId.startsWith('starter_')) rememberRemovedStarter(c.uid, itemId);
      commitWardrobe(
        c.uid,
        wardrobeRef.current.filter((w) => w.id !== itemId)
      );
      await cloudDeleteWardrobeItem(c, itemId).catch(syncWarn('việc xoá món đồ'));
    },
    [commitWardrobe]
  );

  const saveOutfit = useCallback(
    async (input: SaveOutfitInput) => {
      const c = ctxRef.current;
      if (!c) return;
      const outfit: SavedOutfit = {
        id: `outfit_${Date.now()}`,
        userId: c.uid,
        title: input.title.slice(0, 120),
        occasion: input.occasion.slice(0, 60),
        weatherNote: input.weatherNote.slice(0, 120),
        items: input.items.slice(0, 8).map((i) => i.slice(0, 120)),
        auraAdvice: input.auraAdvice.slice(0, 800),
        imageUrl: input.imageUrl,
        styleTag: input.styleTag,
        createdAt: new Date().toISOString(),
      };
      commitOutfits(c.uid, [outfit, ...outfitsRef.current]);
      await cloudCreateSavedOutfit(c, outfit).catch(syncWarn('bộ đồ đã lưu'));
    },
    [commitOutfits]
  );

  const deleteSavedOutfit = useCallback(
    async (outfitId: string) => {
      const c = ctxRef.current;
      if (!c) return;
      commitOutfits(
        c.uid,
        outfitsRef.current.filter((o) => o.id !== outfitId)
      );
      await cloudDeleteSavedOutfit(c, outfitId).catch(syncWarn('việc xoá bộ đồ'));
    },
    [commitOutfits]
  );

  const savedTitles = useMemo(() => savedOutfits.map((o) => o.title), [savedOutfits]);

  return {
    authReady,
    user,
    canSync,
    profile,
    profileLoading,
    needsOnboarding,
    wardrobeItems,
    savedOutfits,
    savedTitles,
    storageWarning,
    dismissStorageWarning: useCallback(() => setStorageWarning(null), []),
    completeOnboarding,
    updateProfile,
    addGarment,
    toggleFavorite,
    deleteGarment,
    saveOutfit,
    deleteSavedOutfit,
    /** Kiểm tra lại email đã xác thực chưa; nếu rồi, token mới kích hoạt đồng bộ */
    refreshVerification: refreshEmailVerification,
    signOut: signOutCurrentUser,
  };
}

export type UserSession = ReturnType<typeof useUserSession>;
