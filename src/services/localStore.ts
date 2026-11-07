/**
 * Dữ liệu người dùng lưu trên máy (localStorage), theo uid Firebase.
 * Là bản chính khi chưa được đồng bộ lên Firestore (khách, email chưa xác thực) và là bộ nhớ đệm
 * cho người dùng đã xác thực.
 *
 * Các hàm lưu trả về false khi không ghi được (thường do bộ nhớ trình duyệt đầy).
 */
import type { SavedOutfit, UserProfile, WardrobeItem } from '../types';
import { isStarterId } from '../domain/ids';

const profileKey = (uid: string) => `sw_profile_${uid}`;
const wardrobeKey = (uid: string) => `sw_wardrobe_${uid}`;
const outfitsKey = (uid: string) => `sw_outfits_${uid}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadLocalProfile = (uid: string) => readJson<UserProfile | null>(profileKey(uid), null);
export const saveLocalProfile = (uid: string, profile: UserProfile) => writeJson(profileKey(uid), profile);

const PURGED_LEGACY_ITEM_NAMES = new Set([
  'Áo Len Cashmere Beige Tối Giản',
  'Áo Khoác Denim Wash Cổ Điển',
  'Áo Blazer Kẻ Tartan & Chân Váy Xếp Ly',
  'Sơ Mi Oxford Phối Cardigan Merino',
  'Áo Khoác Nỉ Thể Thao & Giày Chạy Bộ',
  'Áo Khoác Tweed Pastel & Quần Ống Suông',
]);

const PURGED_LEGACY_IMAGE_SUBSTRINGS = [
  'style_minimalist_fashion_1794032022720',
  'style_streetwear_fashion_1794032024479',
  'style_vintage_retro_1794032025329',
  'style_smart_casual_1794032025174',
  'style_sporty_athleisure_1794032026888',
  'style_korean_chic_1794032027385',
];

export function isPurgedLegacyWardrobeItem(item: Partial<WardrobeItem> | null | undefined): boolean {
  if (!item) return false;
  const name = (item.name || '').trim();
  if (PURGED_LEGACY_ITEM_NAMES.has(name)) return true;
  const img = item.imageUrl || '';
  return PURGED_LEGACY_IMAGE_SUBSTRINGS.some((sub) => img.includes(sub));
}

export const loadLocalWardrobe = (uid: string): WardrobeItem[] => {
  const raw = readJson<WardrobeItem[]>(wardrobeKey(uid), []);
  const filtered = raw.filter((item) => !isPurgedLegacyWardrobeItem(item));
  if (filtered.length !== raw.length) {
    writeJson(wardrobeKey(uid), filtered);
  }
  return filtered;
};
export const saveLocalWardrobe = (uid: string, items: WardrobeItem[]) =>
  writeJson(
    wardrobeKey(uid),
    items.filter((item) => !isPurgedLegacyWardrobeItem(item))
  );

export const loadLocalOutfits = (uid: string) => readJson<SavedOutfit[]>(outfitsKey(uid), []);
export const saveLocalOutfits = (uid: string, outfits: SavedOutfit[]) => writeJson(outfitsKey(uid), outfits);

/** Xoá toàn bộ dữ liệu của một uid trên máy (khách đăng xuất) */
export function clearLocalUserData(uid: string): void {
  for (const key of [profileKey(uid), wardrobeKey(uid), outfitsKey(uid)]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

// ---------- Gộp dữ liệu khách vào tài khoản đã có ----------
// Khi khách nâng cấp bằng Google/email đã có tài khoản, uid đổi. auth.ts đánh dấu uid khách trước
// khi đăng nhập; useUserSession gọi consumePendingGuestMerge với uid mới trước khi đọc dữ liệu.

const PENDING_GUEST_MERGE_KEY = 'sw_pending_guest_merge';

export function markPendingGuestMerge(guestUid: string): void {
  try {
    localStorage.setItem(PENDING_GUEST_MERGE_KEY, guestUid);
  } catch {
    // ignore
  }
}

export function clearPendingGuestMerge(): void {
  try {
    localStorage.removeItem(PENDING_GUEST_MERGE_KEY);
  } catch {
    // ignore
  }
}

/** Chuyển đồ tự thêm + bộ đồ đã lưu của khách sang uid mới (không đụng dữ liệu sẵn có của uid mới) */
export function mergeLocalUserData(fromUid: string, toUid: string): { items: number; outfits: number } {
  const toWardrobe = loadLocalWardrobe(toUid);
  const knownItemIds = new Set(toWardrobe.map((i) => i.id));
  const movedItems = loadLocalWardrobe(fromUid)
    .filter((i) => !isStarterId(i.id) && !knownItemIds.has(i.id))
    .map((i) => ({ ...i, userId: toUid }));

  const toOutfits = loadLocalOutfits(toUid);
  const knownOutfitIds = new Set(toOutfits.map((o) => o.id));
  const movedOutfits = loadLocalOutfits(fromUid)
    .filter((o) => !knownOutfitIds.has(o.id))
    .map((o) => ({ ...o, userId: toUid }));

  if (movedItems.length) saveLocalWardrobe(toUid, [...movedItems, ...toWardrobe]);
  if (movedOutfits.length) saveLocalOutfits(toUid, [...movedOutfits, ...toOutfits]);

  const guestProfile = loadLocalProfile(fromUid);
  if (guestProfile && !loadLocalProfile(toUid)) {
    saveLocalProfile(toUid, { ...guestProfile, uid: toUid });
  }

  clearLocalUserData(fromUid);
  return { items: movedItems.length, outfits: movedOutfits.length };
}

/** Trả về true nếu vừa gộp dữ liệu khách vào uid này */
export function consumePendingGuestMerge(uid: string): boolean {
  let guestUid: string | null = null;
  try {
    guestUid = localStorage.getItem(PENDING_GUEST_MERGE_KEY);
  } catch {
    return false;
  }
  if (!guestUid) return false;
  clearPendingGuestMerge();
  if (guestUid === uid) return false;
  mergeLocalUserData(guestUid, uid);
  return true;
}
