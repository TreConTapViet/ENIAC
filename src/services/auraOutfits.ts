/**
 * Gọi /api/aura/recommend-outfits: gửi món ứng viên (tủ đồ của người dùng + danh mục đúng giới tính,
 * tối đa 40) và các bộ đang hiển thị; nhận về bộ đồ ghép từ id món có thật, rồi dựng ảnh từ chính món đó.
 * Không gửi cả hồ sơ (ảnh đại diện có thể nặng 350 KB).
 */
import { catalogGarmentForId, catalogGarmentsFor } from '../catalog';
import { categoriesForGender } from '../domain/categories';
import { normalizeGender } from '../../shared/gender';
import { matchesStyles, styleLabel } from '../../shared/styles';
import { outfitKey, slotOf, type CandidateGarment } from '../../shared/outfitEngine';
import type { AuraOutfitRecommendation, UserProfile, WardrobeItem, WeatherContextData } from '../types';

const MAX_CANDIDATES = 40;

interface CandidateInfo extends CandidateGarment {
  imageUrl: string;
  colorHex?: string;
}

function buildCandidates(profile: UserProfile, wardrobe: WardrobeItem[]): CandidateInfo[] {
  const gender = normalizeGender(profile.gender) ?? 'Nữ';
  const allowed = new Set(categoriesForGender(gender, wardrobe.filter((i) => !i.id.startsWith('starter_'))));
  // Món mẫu (starter_{uid}_{garmentId}) dùng lại id danh mục, để so trùng được với bộ có sẵn
  const canonicalId = (id: string) => catalogGarmentForId(id)?.id ?? id;
  const fromWardrobe: CandidateInfo[] = wardrobe
    .filter((i) => allowed.has(i.category) && slotOf(i.category) && i.imageUrl)
    .map((i) => ({ id: canonicalId(i.id), name: i.name, category: i.category, color: i.color, styleTag: i.styleTag, season: i.season, occasion: i.occasion, imageUrl: i.imageUrl }));
  const knownImages = new Set(fromWardrobe.map((c) => c.imageUrl));
  const fromCatalog: CandidateInfo[] = catalogGarmentsFor(gender)
    .filter((g) => !knownImages.has(g.imageUrl))
    .map((g) => ({ id: g.id, name: g.name, category: g.category, color: g.color, styleTag: styleLabel(g.styleIds[0] ?? ''), season: g.season, occasion: g.occasion, imageUrl: g.imageUrl, colorHex: g.colorHex }));

  // Món khớp phong cách người dùng lên trước, rồi cắt còn 40
  const styles = profile.favoriteStyles ?? [];
  const all = [...fromWardrobe, ...fromCatalog];
  const matching = all.filter((c) => matchesStyles(c.styleTag, styles, gender));
  const rest = all.filter((c) => !matching.includes(c));
  return [...matching, ...rest].slice(0, MAX_CANDIDATES);
}

export async function requestAuraOutfits(args: {
  profile: UserProfile;
  wardrobe: WardrobeItem[];
  weather: WeatherContextData;
  occasion: string;
  /** Bộ đang hiển thị, để AI không đề xuất lại */
  shown: AuraOutfitRecommendation[];
  count?: number;
}): Promise<AuraOutfitRecommendation[]> {
  const { profile, weather, occasion } = args;
  const gender = normalizeGender(profile.gender) ?? 'Nữ';
  const candidates = buildCandidates(profile, args.wardrobe);
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const exclude = args.shown.filter((o) => o.garmentIds?.length).map((o) => outfitKey(o.garmentIds!));

  const response = await fetch('/api/aura/recommend-outfits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gender,
      styles: profile.favoriteStyles ?? [],
      weather: { city: weather.city, temp: weather.temp, condition: weather.condition, seasonMatch: weather.seasonMatch },
      occasion,
      candidates: candidates.map(({ imageUrl: _img, colorHex: _hex, ...c }) => c),
      exclude,
      count: args.count ?? 3,
    }),
  });
  const data = await response.json();
  if (!response.ok || !Array.isArray(data.outfits)) throw new Error(data.error || 'Không tạo được gợi ý.');

  const styleTag = profile.favoriteStyles?.length ? styleLabel(profile.favoriteStyles[0]) : 'Tối giản (Minimalist)';
  const stamp = Date.now();
  return data.outfits.map((o: { garmentIds: string[]; title: string; weatherNote: string; auraAdvice: string; colorPalette: string[] }, idx: number) => {
    const garments = o.garmentIds.map((id) => byId.get(id)).filter((g): g is CandidateInfo => Boolean(g));
    const find = (slot: ReturnType<typeof slotOf>) => garments.find((g) => slotOf(g.category) === slot);
    const top = find('top') ?? find('dress');
    const bottom = find('bottom');
    const outer = find('outer');
    const palette = o.colorPalette?.filter((c) => /^#[0-9a-f]{6}$/i.test(c)) ?? [];
    return {
      id: `aura_${stamp}_${idx}`,
      title: o.title,
      gender,
      garmentIds: o.garmentIds,
      styleTag,
      occasion,
      season: weather.seasonMatch,
      weatherNote: o.weatherNote,
      imageUrl: '',
      topImageUrl: top?.imageUrl,
      bottomImageUrl: bottom?.imageUrl,
      outerImageUrl: outer?.imageUrl,
      topName: top?.name,
      bottomName: bottom?.name,
      topColor: top?.color,
      bottomColor: bottom?.color,
      isDressOrSkirt: Boolean(find('dress')) || bottom?.category === 'Chân váy',
      items: garments.map((g) => g.name),
      colorPalette: palette.length ? palette : garments.map((g) => g.colorHex).filter((c): c is string => Boolean(c)),
      auraAdvice: o.auraAdvice,
    } satisfies AuraOutfitRecommendation;
  });
}
