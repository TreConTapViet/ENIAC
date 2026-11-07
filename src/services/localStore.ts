/**
 * Dữ liệu người dùng lưu trên máy (localStorage), theo uid Firebase.
 * Là bản chính khi chưa được đồng bộ lên Firestore (khách, email chưa xác thực) và là bộ nhớ đệm
 * cho người dùng đã xác thực.
 *
 * Các hàm lưu trả về false khi không ghi được (thường do bộ nhớ trình duyệt đầy).
 */
import type { SavedOutfit, UserProfile, WardrobeItem } from '../types';

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

export const loadLocalWardrobe = (uid: string) => readJson<WardrobeItem[]>(wardrobeKey(uid), []);
export const saveLocalWardrobe = (uid: string, items: WardrobeItem[]) => writeJson(wardrobeKey(uid), items);

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
