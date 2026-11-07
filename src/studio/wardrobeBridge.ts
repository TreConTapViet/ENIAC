/**
 * Cầu nối dữ liệu giữa app (hồ sơ, tủ đồ, gợi ý phối đồ) và Studio ma-nơ-canh 3D.
 * Chỉ chuyển đổi dữ liệu; việc dựng 3D vẫn do studio và src/three đảm nhiệm.
 */
import type {
  AuraOutfitRecommendation,
  GarmentCategory,
  GenderOption,
  UserProfile,
  WardrobeItem,
} from '../types';
import type {
  BodyMeasurements,
  ExtractedGarmentCategory,
  ExtractedGarmentItem,
  GenderProfile,
} from '../types/studio';
import { analyzeAndTransformUploadedGarment } from '../data/presets';
import { calculateRecommendedSize } from '../constants';

/** Studio chỉ nhận tối đa 16 món trong kho đồ đã tải lên */
export const STUDIO_INVENTORY_LIMIT = 16;

export function toStudioGender(gender: GenderOption | undefined): GenderProfile {
  if (gender === 'Nam') return 'male';
  if (gender === 'Khác') return 'neutral';
  return 'female';
}

export function toStudioCategory(
  category: GarmentCategory | string
): ExtractedGarmentCategory | null {
  switch (category) {
    case 'Áo':
      return 'top';
    case 'Áo khoác':
      return 'outerwear';
    case 'Đầm & Váy liền':
      return 'dress';
    case 'Quần':
    case 'Chân váy':
    case 'Quần & Chân váy':
      return 'bottom';
    case 'Giày dép':
      return 'footwear';
    default:
      return null; // Phụ kiện: studio có bộ phụ kiện 3D riêng
  }
}

/**
 * Số đo hồ sơ → số đo studio dùng để dựng ma-nơ-canh.
 * Dùng chung calculateRecommendedSize với phần đầu trang để hai nơi luôn hiện cùng một số
 * (kể cả khi hồ sơ chưa nhập số đo và app tự suy ra số mặc định).
 */
export function profileToStudioBody(profile: UserProfile): Partial<BodyMeasurements> {
  const size = calculateRecommendedSize(profile);
  return {
    genderProfile: toStudioGender(profile.gender),
    heightCm: size.heightCm,
    weightKg: size.weightKg,
    chestCm: size.bustCm,
    waistCm: size.waistCm,
    hipCm: size.hipCm,
  };
}

export interface GarmentPhotoSource {
  id: string;
  name: string;
  imageUrl: string;
  category: ExtractedGarmentCategory;
}

export function wardrobeItemToSource(item: WardrobeItem): GarmentPhotoSource | null {
  const category = toStudioCategory(item.category);
  if (!category || !item.imageUrl) return null;
  return { id: `wardrobe_${item.id}`, name: item.name, imageUrl: item.imageUrl, category };
}

/**
 * Bộ đồ cần ướm thử → danh sách ảnh từng món.
 * Bộ đồ tạo từ một món trong tủ (id `item_<id>`) dùng đúng loại của món đó;
 * bộ đồ gợi ý dùng ảnh áo/quần riêng nếu có.
 */
export function recommendationToSources(
  rec: AuraOutfitRecommendation,
  wardrobeItems: WardrobeItem[]
): GarmentPhotoSource[] {
  if (rec.id?.startsWith('item_')) {
    const item = wardrobeItems.find((w) => `item_${w.id}` === rec.id);
    const source = item ? wardrobeItemToSource(item) : null;
    return source ? [source] : [];
  }

  const sources: GarmentPhotoSource[] = [];
  const baseId = rec.id || rec.title;
  if (rec.topImageUrl) {
    sources.push({
      id: `rec_${baseId}_top`,
      name: rec.topName || rec.title,
      imageUrl: rec.topImageUrl,
      category: rec.isDressOrSkirt && !rec.bottomImageUrl ? 'dress' : 'top',
    });
  }
  if (rec.bottomImageUrl && rec.bottomImageUrl !== rec.topImageUrl) {
    sources.push({
      id: `rec_${baseId}_bottom`,
      name: rec.bottomName || rec.title,
      imageUrl: rec.bottomImageUrl,
      category: 'bottom',
    });
  }
  return sources;
}

const garmentCache = new Map<string, Promise<ExtractedGarmentItem | null>>();

/**
 * Ảnh quần áo → món đồ studio mặc được, dùng chính bộ tách nền + dựng 3D của studio.
 * Kết quả được nhớ theo id + giới tính để mở lại studio không phải xử lý ảnh lần nữa.
 */
export function sourceToStudioGarment(
  source: GarmentPhotoSource,
  gender: GenderProfile
): Promise<ExtractedGarmentItem | null> {
  const key = `${source.id}|${gender}`;
  const cached = garmentCache.get(key);
  if (cached) return cached;

  const job = analyzeAndTransformUploadedGarment(
    source.imageUrl,
    source.category,
    gender,
    undefined,
    source.name
  )
    .then((t): ExtractedGarmentItem => {
      const styleId =
        source.category === 'dress'
          ? t.dressStyleId
          : source.category === 'outerwear'
          ? t.outerwearStyleId
          : source.category === 'bottom'
          ? t.bottomStyleId
          : source.category === 'footwear'
          ? t.footwearStyleId
          : t.topStyleId;
      return {
        id: source.id,
        category: source.category,
        vietnameseName: source.name,
        styleId: styleId as ExtractedGarmentItem['styleId'],
        colorHex: t.colorHex,
        secondaryColorHex: t.secondaryColorHex,
        fabric: t.detectedFabric,
        weavePattern: t.weavePattern,
        fitEase: t.detectedFitEase,
        previewThumbUrl: source.imageUrl,
        uploadedTextureUrl: t.uploadedTextureUrl,
        uploadedCutoutParams: t.uploadedCutoutParams,
        sourceFileName: source.name,
        sourceMode: 'single_upload',
        confidence: 0.9,
      };
    })
    .catch((err) => {
      console.warn(`Không dựng được món đồ "${source.name}" cho studio:`, err);
      garmentCache.delete(key);
      return null;
    });

  garmentCache.set(key, job);
  return job;
}

export async function sourcesToStudioGarments(
  sources: GarmentPhotoSource[],
  gender: GenderProfile
): Promise<ExtractedGarmentItem[]> {
  const results = await Promise.all(sources.map((s) => sourceToStudioGarment(s, gender)));
  return results.filter((g): g is ExtractedGarmentItem => g !== null);
}
