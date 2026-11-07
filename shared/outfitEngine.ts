/**
 * Ghép bộ đồ từ danh sách món ứng viên (dùng chung client + server).
 *  - validateOutfitIds: kiểm tra một bộ do AI đề xuất (id có thật, đúng vị trí mặc, không trùng món).
 *  - composeFallbackOutfits: tự ghép khi AI không trả đủ bộ hoặc không có key Gemini.
 */
export interface CandidateGarment {
  id: string;
  name: string;
  category: string;
  color: string;
  styleTag?: string;
  season?: string;
  occasion?: string;
}

export type Slot = 'outer' | 'top' | 'dress' | 'bottom' | 'shoes' | 'accessory';

export function slotOf(category: string): Slot | null {
  switch (category) {
    case 'Áo':
      return 'top';
    case 'Áo khoác':
      return 'outer';
    case 'Đầm & Váy liền':
      return 'dress';
    case 'Quần':
    case 'Chân váy':
    case 'Quần & Chân váy':
      return 'bottom';
    case 'Giày dép':
      return 'shoes';
    case 'Phụ kiện':
      return 'accessory';
    default:
      return null;
  }
}

const SLOT_ORDER: Slot[] = ['outer', 'top', 'dress', 'bottom', 'shoes', 'accessory'];

/** Khoá so trùng của một bộ: tập id đã sắp xếp */
export const outfitKey = (ids: readonly string[]) => [...ids].sort().join('+');

/**
 * Chuẩn hoá bộ đồ AI trả về: bỏ id lạ / trùng, mỗi vị trí một món, phải có (áo + quần) hoặc đầm.
 * Trả về id theo thứ tự khoác ngoài → áo/đầm → quần → giày → phụ kiện, hoặc null nếu không hợp lệ.
 */
export function validateOutfitIds(ids: unknown, byId: Map<string, CandidateGarment>): string[] | null {
  if (!Array.isArray(ids)) return null;
  const picked = new Map<Slot, string>();
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const g = byId.get(raw);
    const slot = g && slotOf(g.category);
    if (!slot || picked.has(slot)) continue;
    picked.set(slot, raw);
  }
  const hasTopBottom = picked.has('top') && picked.has('bottom');
  const hasDress = picked.has('dress');
  if (!hasTopBottom && !hasDress) return null;
  if (hasDress) {
    picked.delete('top');
    picked.delete('bottom');
  }
  return SLOT_ORDER.filter((s) => picked.has(s)).map((s) => picked.get(s)!);
}

export interface FallbackOptions {
  count: number;
  /** Khoá các bộ đang hiển thị (outfitKey), không ghép lại */
  exclude?: Iterable<string>;
  season?: string;
  occasion?: string;
}

const COOL_SEASONS = new Set(['Mát mẻ', 'Se lạnh', 'Mưa']);

/** Ghép áo × quần (và đầm) theo điểm: hợp mùa +2, hợp dịp +1, cùng phong cách +1 */
export function composeFallbackOutfits(
  candidates: CandidateGarment[],
  opts: FallbackOptions
): { garmentIds: string[]; title: string }[] {
  const exclude = new Set(opts.exclude ?? []);
  const by = (slot: Slot) => candidates.filter((g) => slotOf(g.category) === slot);
  const fitScore = (g: CandidateGarment) =>
    (opts.season && (g.season === opts.season || g.season === 'Mọi thời tiết') ? 2 : 0) +
    (opts.occasion && g.occasion === opts.occasion ? 1 : 0);
  const outers = by('outer').sort((a, b) => fitScore(b) - fitScore(a));
  const wantOuter = opts.season ? COOL_SEASONS.has(opts.season) : false;

  const combos: { ids: string[]; title: string; score: number }[] = [];
  for (const top of by('top')) {
    for (const bottom of by('bottom')) {
      const ids = [top.id, bottom.id];
      let title = `${top.name} & ${bottom.name}`;
      if (wantOuter && outers[0]) {
        ids.unshift(outers[0].id);
        title = `${outers[0].name} khoác ngoài ${top.name.toLowerCase()}`;
      }
      const sameStyle = top.styleTag && top.styleTag === bottom.styleTag ? 1 : 0;
      combos.push({ ids, title, score: fitScore(top) + fitScore(bottom) + sameStyle });
    }
  }
  for (const dress of by('dress')) combos.push({ ids: [dress.id], title: dress.name, score: fitScore(dress) * 2 });

  const out: { garmentIds: string[]; title: string }[] = [];
  const usedTops = new Set<string>();
  // Ưu tiên đa dạng: mỗi áo/đầm chỉ dùng một lần trước, rồi mới lặp lại
  for (const pass of [0, 1]) {
    for (const c of combos.sort((a, b) => b.score - a.score)) {
      if (out.length >= opts.count) return out;
      const key = outfitKey(c.ids);
      const lead = c.ids[c.ids.length - 2] ?? c.ids[0];
      if (exclude.has(key) || (pass === 0 && usedTops.has(lead))) continue;
      exclude.add(key);
      usedTops.add(lead);
      out.push({ garmentIds: c.ids, title: c.title });
    }
  }
  return out;
}
