/**
 * Đọc/ghi dữ liệu người dùng trên Firestore.
 *
 * Mọi hàm nhận SyncCtx và không gọi mạng khi canSync = false (tài khoản khách, email chưa xác thực):
 * firestore.rules chỉ cho người dùng đã xác thực email đọc/ghi, nên gọi lúc đó chỉ sinh lỗi
 * permission-denied. Khi đó dữ liệu chỉ nằm trong localStorage (xem localStore.ts).
 *
 * Tài liệu dùng id cố định bằng id trên máy (item_…, outfit_…) để lần đồng bộ đầu tiên không tạo trùng.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { isStarterId } from '../domain/ids';
import { MAX_FAVORITE_STYLES } from '../../shared/styles';
import type { SavedOutfit, UserProfile, WardrobeItem } from '../types';
import { isPurgedLegacyWardrobeItem } from './localStore';

export interface SyncCtx {
  uid: string;
  /** Email của tài khoản Firebase (null với khách) */
  email: string | null;
  /** true khi không phải khách và email đã xác thực */
  canSync: boolean;
}

// Khớp firestore.rules: tối đa 8 phong cách (shared/styles.ts)
const MAX_STYLES_STORED = MAX_FAVORITE_STYLES;

export const canSyncUser = (u: { isAnonymous: boolean; emailVerified: boolean } | null) =>
  Boolean(u && !u.isAnonymous && u.emailVerified);

/**
 * Chuẩn hoá các trường hồ sơ có mặt trong `p` để ghi lên Firestore (khớp hasOnly trong firestore.rules).
 * Chỉ trả về trường được truyền vào, nên đổi màu nhấn không ghi lại ảnh đại diện 350 KB.
 */
export function toFirestoreProfile(p: Partial<UserProfile>): Record<string, unknown> {
  const out: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (p.displayName !== undefined) out.displayName = p.displayName.slice(0, 80);
  if (p.gender !== undefined) out.gender = p.gender;
  if (p.favoriteStyles !== undefined) out.favoriteStyles = p.favoriteStyles.slice(0, MAX_STYLES_STORED);
  if (p.accentColor !== undefined) out.accentColor = p.accentColor;
  if (p.customAccentHex) out.customAccentHex = p.customAccentHex;
  if (p.themeMode !== undefined) out.themeMode = p.themeMode;
  if (p.onboardingCompleted !== undefined) out.onboardingCompleted = p.onboardingCompleted;
  if (p.avatarUrl) out.avatarUrl = p.avatarUrl.slice(0, 350000);
  for (const key of ['heightCm', 'weightKg', 'bustCm', 'waistCm', 'hipCm'] as const) {
    if (p[key]) out[key] = Number(p[key]);
  }
  return out;
}

/** Tài liệu hồ sơ đầy đủ khi tạo mới; email lấy từ Firebase Auth (luật cấm đổi email về sau) */
function toFirestoreProfileCreate(p: UserProfile, uid: string, email: string): Record<string, unknown> {
  return {
    ...toFirestoreProfile(p),
    uid,
    email: email.slice(0, 150),
    onboardingCompleted: true,
    createdAt: serverTimestamp(),
  };
}

export async function cloudGetProfile(ctx: SyncCtx): Promise<UserProfile | null> {
  if (!ctx.canSync) return null;
  const snap = await getDoc(doc(db, 'users', ctx.uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/**
 * Ghi hồ sơ: cập nhật đúng các trường `changes` nếu mây đã có tài liệu, tạo mới từ `profile` nếu chưa.
 */
export async function cloudSaveProfile(
  ctx: SyncCtx,
  profile: UserProfile,
  changes: Partial<UserProfile>
): Promise<void> {
  if (!ctx.canSync || !ctx.email) return;
  const ref = doc(db, 'users', ctx.uid);
  if ((await getDoc(ref)).exists()) {
    await updateDoc(ref, toFirestoreProfile(changes));
  } else {
    await setDoc(ref, toFirestoreProfileCreate(profile, ctx.uid, ctx.email));
  }
}

function wardrobeFields(item: WardrobeItem) {
  return {
    userId: item.userId,
    name: item.name.slice(0, 100),
    category: item.category,
    styleTag: item.styleTag.slice(0, 60),
    color: item.color.slice(0, 50),
    season: item.season,
    occasion: item.occasion,
    imageUrl: item.imageUrl.slice(0, 350000),
    favorite: item.favorite,
  };
}

/** Món đồ mẫu (starter_) chỉ sống trên máy, không đồng bộ lên mây */
const isStarterItem = isStarterId;

export async function cloudCreateWardrobeItem(ctx: SyncCtx, item: WardrobeItem): Promise<void> {
  if (!ctx.canSync || isStarterItem(item.id)) return;
  await setDoc(doc(db, 'wardrobeItems', item.id), {
    ...wardrobeFields(item),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cloudSetFavorite(ctx: SyncCtx, itemId: string, favorite: boolean): Promise<void> {
  if (!ctx.canSync || isStarterItem(itemId)) return;
  await updateDoc(doc(db, 'wardrobeItems', itemId), { favorite, updatedAt: serverTimestamp() });
}

export async function cloudDeleteWardrobeItem(ctx: SyncCtx, itemId: string): Promise<void> {
  if (!ctx.canSync || isStarterItem(itemId)) return;
  await deleteDoc(doc(db, 'wardrobeItems', itemId));
}

export async function cloudCreateSavedOutfit(ctx: SyncCtx, outfit: SavedOutfit): Promise<void> {
  if (!ctx.canSync) return;
  await setDoc(doc(db, 'savedOutfits', outfit.id), {
    userId: outfit.userId,
    title: outfit.title.slice(0, 120),
    occasion: outfit.occasion.slice(0, 60),
    weatherNote: outfit.weatherNote.slice(0, 120),
    items: outfit.items.slice(0, 8).map((i) => i.slice(0, 120)),
    auraAdvice: outfit.auraAdvice.slice(0, 800),
    createdAt: serverTimestamp(),
  });
}

export async function cloudDeleteSavedOutfit(ctx: SyncCtx, outfitId: string): Promise<void> {
  if (!ctx.canSync) return;
  await deleteDoc(doc(db, 'savedOutfits', outfitId));
}

// Tài liệu vừa ghi chưa có giờ máy chủ: dùng giờ ước tính để sắp xếp không nhảy lung tung
const ESTIMATE = { serverTimestamps: 'estimate' } as const;

/** Theo dõi tủ đồ + lịch sử trên mây; trả về null khi không được đồng bộ */
export function subscribeUserData(
  ctx: SyncCtx,
  handlers: {
    onWardrobe: (items: WardrobeItem[]) => void;
    onOutfits: (outfits: SavedOutfit[]) => void;
    onError: (err: unknown) => void;
  }
): Unsubscribe | null {
  if (!ctx.canSync) return null;
  const byUser = (name: string) => query(collection(db, name), where('userId', '==', ctx.uid));
  const unsubWardrobe = onSnapshot(
    byUser('wardrobeItems'),
    (snap) => {
      const items: WardrobeItem[] = [];
      for (const d of snap.docs) {
        const item = { id: d.id, ...(d.data(ESTIMATE) as Omit<WardrobeItem, 'id'>) };
        if (isPurgedLegacyWardrobeItem(item)) {
          void deleteDoc(doc(db, 'wardrobeItems', d.id)).catch(() => {});
        } else {
          items.push(item);
        }
      }
      handlers.onWardrobe(items);
    },
    handlers.onError
  );
  const unsubOutfits = onSnapshot(
    byUser('savedOutfits'),
    (snap) => handlers.onOutfits(snap.docs.map((d) => ({ id: d.id, ...(d.data(ESTIMATE) as Omit<SavedOutfit, 'id'>) }))),
    handlers.onError
  );
  return () => {
    unsubWardrobe();
    unsubOutfits();
  };
}

const syncedMarkerKey = (uid: string) => `sw_cloud_synced_${uid}`;

/** Thời điểm (ms) lần đồng bộ đầu thành công trên máy này, null nếu chưa đồng bộ */
export function cloudSyncedAt(uid: string): number | null {
  try {
    const raw = localStorage.getItem(syncedMarkerKey(uid));
    if (!raw) return null;
    const ms = Number(raw);
    // Dấu kiểu cũ ('1') không có thời gian: coi như đồng bộ từ đầu
    return Number.isFinite(ms) && ms > 1 ? ms : 0;
  } catch {
    return null;
  }
}

export const hasSyncedToCloud = (uid: string) => cloudSyncedAt(uid) !== null;

export function resetCloudSyncMarker(uid: string): void {
  try {
    localStorage.removeItem(syncedMarkerKey(uid));
  } catch {
    // ignore
  }
}

// Dữ liệu cũ trên mây được tạo bằng addDoc (id ngẫu nhiên) nên id khác id trên máy (item_…, outfit_…).
// So theo nội dung để lần đồng bộ đầu tiên không tải lên bản trùng.
const itemSignature = (i: Pick<WardrobeItem, 'name' | 'category' | 'imageUrl'>) =>
  `${i.name}|${i.category}|${i.imageUrl.slice(0, 200)}`;
const outfitSignature = (o: Pick<SavedOutfit, 'title' | 'occasion' | 'items'>) =>
  `${o.title}|${o.occasion}|${o.items.join(',')}`;

/**
 * Lần đầu tài khoản được phép đồng bộ trên máy này (vừa xác thực email, vừa nâng cấp từ khách,
 * vừa gộp dữ liệu khách): tạo hồ sơ nếu mây chưa có, rồi tải lên đồ/bộ đồ trên máy mà mây chưa có.
 * Chỉ tạo mới, không ghi đè: luật Firestore không cho đổi createdAt của tài liệu đã có.
 */
export async function syncLocalToCloud(
  ctx: SyncCtx,
  local: { profile: UserProfile | null; wardrobe: WardrobeItem[]; outfits: SavedOutfit[] }
): Promise<{ items: number; outfits: number }> {
  if (!ctx.canSync || hasSyncedToCloud(ctx.uid)) return { items: 0, outfits: 0 };

  if (local.profile?.onboardingCompleted && ctx.email) {
    const ref = doc(db, 'users', ctx.uid);
    if (!(await getDoc(ref)).exists()) {
      await setDoc(ref, toFirestoreProfileCreate(local.profile, ctx.uid, ctx.email));
    }
  }

  const cloudDocs = async (name: string) =>
    (await getDocs(query(collection(db, name), where('userId', '==', ctx.uid)))).docs;

  const cloudItems = await cloudDocs('wardrobeItems');
  const itemIds = new Set(cloudItems.map((d) => d.id));
  const itemSigs = new Set(cloudItems.map((d) => itemSignature(d.data() as WardrobeItem)));
  const newItems = local.wardrobe.filter(
    (i) => !isStarterItem(i.id) && !itemIds.has(i.id) && !itemSigs.has(itemSignature(i))
  );
  for (const item of newItems) await cloudCreateWardrobeItem(ctx, { ...item, userId: ctx.uid });

  const cloudOutfits = await cloudDocs('savedOutfits');
  const outfitIds = new Set(cloudOutfits.map((d) => d.id));
  const outfitSigs = new Set(cloudOutfits.map((d) => outfitSignature(d.data() as SavedOutfit)));
  const newOutfits = local.outfits.filter((o) => !outfitIds.has(o.id) && !outfitSigs.has(outfitSignature(o)));
  for (const outfit of newOutfits) await cloudCreateSavedOutfit(ctx, { ...outfit, userId: ctx.uid });

  try {
    localStorage.setItem(syncedMarkerKey(ctx.uid), String(Date.now()));
  } catch {
    // ignore
  }
  return { items: newItems.length, outfits: newOutfits.length };
}
