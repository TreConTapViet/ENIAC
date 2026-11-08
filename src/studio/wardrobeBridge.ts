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
import { catalogGarmentForId, type StudioGarmentSpec } from '../catalog';
import { FEMALE_LOOK_STUDIO, femaleStudioForImage } from '../catalog/female.studio';

/** Studio chỉ nhận tối đa 16 món trong kho đồ đã tải lên */
export const STUDIO_INVENTORY_LIMIT = 16;

export function toStudioGender(gender: GenderOption | undefined): GenderProfile {
  return gender === 'Nam' ? 'male' : 'female';
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
  /**
   * Có thông số 3D (món trong danh mục): studio mặc mô hình vải 3D đúng kiểu/màu/chất liệu,
   * không dán ảnh chụp lên người (ảnh thật còn móc treo/nền nên sẽ thành ảnh phẳng).
   */
  studio?: StudioGarmentSpec;
}

export function wardrobeItemToSource(item: WardrobeItem): GarmentPhotoSource | null {
  const category = toStudioCategory(item.category);
  if (!category || !item.imageUrl) return null;
  return {
    id: `wardrobe_${item.id}`,
    name: item.name,
    imageUrl: item.imageUrl,
    category,
    // Đồ nam: danh mục; đồ mẫu nữ: thông số 3D theo ảnh (không có thì studio đoán từ ảnh)
    studio: catalogGarmentForId(item.id)?.studio ?? femaleStudioForImage(item.imageUrl),
  };
}

/** Bộ đồ ghép từ id món (danh mục hoặc tủ đồ) → nguồn cho studio, gồm cả áo khoác */
function garmentIdsToSources(ids: string[], wardrobeItems: WardrobeItem[], baseId: string): GarmentPhotoSource[] {
  const out: GarmentPhotoSource[] = [];
  for (const id of ids) {
    const fromWardrobe = wardrobeItems.find((w) => w.id === id);
    if (fromWardrobe) {
      const src = wardrobeItemToSource(fromWardrobe);
      if (src) out.push(src);
      continue;
    }
    const g = catalogGarmentForId(id);
    const category = g && toStudioCategory(g.category);
    if (g && category) {
      out.push({ id: `rec_${baseId}_${g.id}`, name: g.name, imageUrl: g.imageUrl, category, studio: g.studio });
    }
  }
  return out;
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

  const baseId = rec.id || rec.title;
  // Bộ đồ nữ có sẵn: dựng đúng từng món theo thông số 3D (đầm là một món, áo khoác có áo trong)
  const look = rec.id ? FEMALE_LOOK_STUDIO[rec.id] : undefined;
  if (look) {
    return look.map((piece, i) => ({
      id: `rec_${baseId}_${i}_${piece.category}`,
      name: piece.name,
      imageUrl: (piece.category === 'bottom' ? rec.bottomImageUrl : rec.topImageUrl) || rec.imageUrl,
      category: piece.category,
      studio: piece.spec,
    }));
  }
  if (rec.garmentIds?.length) {
    const fromIds = garmentIdsToSources(rec.garmentIds, wardrobeItems, baseId);
    if (fromIds.length) return fromIds;
  }

  const sources: GarmentPhotoSource[] = [];
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

  if (source.studio) {
    const spec = source.studio;
    const item: ExtractedGarmentItem = {
      id: source.id,
      category: source.category,
      vietnameseName: source.name,
      styleId: spec.styleId as ExtractedGarmentItem['styleId'],
      colorHex: spec.colorHex,
      secondaryColorHex: spec.secondaryColorHex,
      fabric: spec.fabric,
      weavePattern: spec.weave,
      fitEase: spec.fit,
      previewThumbUrl: source.imageUrl,
      // Không có ảnh phủ: studio dùng shader vải 3D theo màu + chất liệu
      uploadedTextureUrl: '',
      uploadedCutoutParams: [0.35, 0.25, 0.05, 0.96],
      sourceFileName: source.name,
      sourceMode: 'single_upload',
      confidence: 1,
    };
    const job = Promise.resolve(item);
    garmentCache.set(key, job);
    return job;
  }

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
