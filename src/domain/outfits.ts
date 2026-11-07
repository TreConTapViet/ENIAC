/**
 * Gợi ý phối đồ: bỏ trùng, xếp hạng, chia nhóm "khớp phong cách" và "gợi ý thêm".
 * Danh sách đầu vào đã được lọc theo giới tính (catalogOutfitsFor) và gồm cả bộ do AI tạo.
 */
import { matchesStyles } from '../../shared/styles';
import { normalizeVi } from '../../shared/text';
import type { AuraOutfitRecommendation, GenderOption, WeatherSeason } from '../types';

const SEASONS: WeatherSeason[] = ['Mưa', 'Se lạnh', 'Mát mẻ', 'Nắng ấm', 'Mọi thời tiết'];

/** Mùa của bộ đồ: trường season, hoặc đọc từ ghi chú thời tiết của bộ sưu tập cũ */
export function seasonOf(o: Pick<AuraOutfitRecommendation, 'season' | 'weatherNote'>): WeatherSeason | null {
  if (o.season) return o.season;
  const note = normalizeVi(o.weatherNote || '');
  return SEASONS.find((s) => note.includes(normalizeVi(s))) ?? null;
}

function signatures(o: AuraOutfitRecommendation): string[] {
  const keys = [`t:${normalizeVi(o.title)}`];
  if (o.imageUrl) keys.push(`i:${o.imageUrl}`);
  if (o.garmentIds?.length) keys.push(`g:${[...o.garmentIds].sort().join('+')}`);
  else if (o.topImageUrl && o.bottomImageUrl) keys.push(`g:${o.topImageUrl}+${o.bottomImageUrl}`);
  return keys;
}

/** Bỏ bộ trùng tên (không phân biệt dấu), trùng ảnh, hoặc trùng đúng các món; giữ bộ xuất hiện trước */
export function dedupeOutfits(list: AuraOutfitRecommendation[]): AuraOutfitRecommendation[] {
  const seen = new Set<string>();
  const out: AuraOutfitRecommendation[] = [];
  for (const o of list) {
    const keys = signatures(o);
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    out.push(o);
  }
  return out;
}

export interface RankContext {
  gender?: GenderOption;
  styles: readonly string[];
  season?: WeatherSeason;
  occasion?: string;
}

export function outfitScore(o: AuraOutfitRecommendation, ctx: RankContext): number {
  let score = 0;
  if (ctx.styles.length && matchesStyles(o.styleTag, ctx.styles, ctx.gender)) score += 3;
  const s = seasonOf(o);
  if (ctx.season && s === ctx.season) score += 2;
  else if (s === 'Mọi thời tiết') score += 1;
  if (ctx.occasion && o.occasion === ctx.occasion) score += 1;
  return score;
}

/** Sắp xếp giảm dần theo điểm; bằng điểm thì giữ thứ tự cũ */
export function rankOutfits(list: AuraOutfitRecommendation[], ctx: RankContext): AuraOutfitRecommendation[] {
  return list
    .map((o, i) => ({ o, i, score: outfitScore(o, ctx) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.o);
}

export const MIN_MAIN_OUTFITS = 6;

export interface DiscoverFeedInput extends RankContext {
  /** Bộ do AI tạo (hiện trước) */
  generated: AuraOutfitRecommendation[];
  catalog: AuraOutfitRecommendation[];
  /** Bộ lọc trên giao diện: 'Tất cả' hoặc id phong cách; 'Tất cả dịp' hoặc tên dịp */
  styleFilter: string;
  occasionFilter: string;
}

/**
 * main: bộ thuộc phong cách người dùng chọn (và khớp bộ lọc), đã bỏ trùng + xếp hạng.
 * extra: khi main ít hơn 6 bộ, thêm các bộ khác cùng giới tính để màn hình không trống.
 */
export function buildDiscoverFeed(input: DiscoverFeedInput): {
  main: AuraOutfitRecommendation[];
  extra: AuraOutfitRecommendation[];
} {
  const all = dedupeOutfits([...input.generated, ...input.catalog]);
  const passesFilters = (o: AuraOutfitRecommendation) =>
    (input.styleFilter === 'Tất cả' || matchesStyles(o.styleTag, [input.styleFilter], input.gender)) &&
    (input.occasionFilter === 'Tất cả dịp' || o.occasion === input.occasionFilter);
  const inUserStyles = (o: AuraOutfitRecommendation) =>
    input.styles.length === 0 || matchesStyles(o.styleTag, input.styles, input.gender);

  let main = rankOutfits(all.filter((o) => inUserStyles(o) && passesFilters(o)), input);

  // Fallback 1: Nếu chưa có bộ thuộc phong cách cá nhân, mở rộng cho toàn bộ catalog khớp bộ lọc
  if (main.length === 0) {
    main = rankOutfits(all.filter((o) => passesFilters(o)), input);
  }

  // Fallback 2: Nếu chọn lọc kết hợp mà không khớp dịp, lấy các bộ thuộc phong cách đã chọn
  if (main.length === 0 && input.styleFilter !== 'Tất cả') {
    main = rankOutfits(all.filter((o) => matchesStyles(o.styleTag, [input.styleFilter], input.gender)), input);
  }

  // Fallback 3: Nếu chọn dịp mà chưa có bộ cụ thể, lấy bộ theo dịp
  if (main.length === 0 && input.occasionFilter !== 'Tất cả dịp') {
    main = rankOutfits(all.filter((o) => o.occasion === input.occasionFilter), input);
  }

  // Fallback 4: Đảm bảo không bao giờ trống màn hình
  if (main.length === 0) {
    main = rankOutfits(all, input);
  }

  const mainKeys = new Set(main.map((o) => o.id || o.title));
  const extraCandidates = all.filter((o) => !mainKeys.has(o.id || o.title));
  const extra = rankOutfits(
    extraCandidates.filter((o) => (input.occasionFilter === 'Tất cả dịp' || o.occasion === input.occasionFilter)),
    input
  ).slice(0, Math.max(0, MIN_MAIN_OUTFITS * 2 - main.length));

  return { main, extra };
}
