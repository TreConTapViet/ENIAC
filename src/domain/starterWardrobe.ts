/**
 * Tủ đồ mẫu (id starter_{uid}_{key}): gieo theo giới tính, chỉ sống trên máy.
 *  - Đổi giới tính: đổi sang bộ mẫu của giới mới, giữ trạng thái yêu thích của món còn lại.
 *  - Món mẫu người dùng đã xoá được nhớ (sw_starter_removed_{uid}) để không gieo lại.
 *  - Không bao giờ đụng vào đồ người dùng tự thêm.
 */
import { starterTemplatesFor } from '../catalog';
import type { GenderOption, WardrobeItem } from '../types';

export const isStarterItem = (item: Pick<WardrobeItem, 'id'>) => item.id.startsWith('starter_');

const removedKey = (uid: string) => `sw_starter_removed_${uid}`;

export function loadRemovedStarters(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(removedKey(uid));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function rememberRemovedStarter(uid: string, itemId: string): void {
  const removed = loadRemovedStarters(uid);
  removed.add(itemId);
  try {
    localStorage.setItem(removedKey(uid), JSON.stringify([...removed]));
  } catch {
    // ignore
  }
}

export function reconcileStarterWardrobe(
  uid: string,
  gender: GenderOption,
  existing: WardrobeItem[],
  removed: Set<string> = new Set()
): WardrobeItem[] {
  const now = new Date().toISOString();
  const byId = new Map(existing.map((i) => [i.id, i]));
  const starters: WardrobeItem[] = starterTemplatesFor(gender)
    .map((t) => ({ t, id: `starter_${uid}_${t.key}` }))
    .filter(({ id }) => !removed.has(id))
    .map(({ t, id }) => {
      const prev = byId.get(id);
      return {
        id,
        userId: uid,
        name: t.name,
        category: t.category,
        styleTag: t.styleTag,
        color: t.color,
        season: t.season,
        occasion: t.occasion,
        imageUrl: t.imageUrl,
        favorite: prev?.favorite ?? t.favorite,
        createdAt: prev?.createdAt ?? now,
        updatedAt: prev?.updatedAt ?? now,
      };
    });
  return [...existing.filter((i) => !isStarterItem(i)), ...starters];
}
