/**
 * Thông số 3D cho đồ nữ (bộ sưu tập cũ dùng ảnh, chưa có danh mục như đồ nam).
 *
 * Không có thông số này, studio phải đoán kiểu dáng từ ảnh chụp và hay đoán sai: quần jeans ống rộng
 * thành chân váy xoè, đầm thành áo + quần, chân váy đen thành vải denim. Có thông số thì studio dựng
 * mô hình vải 3D đúng kiểu/màu/chất liệu, vừa với dáng ma-nơ-canh (giống đồ nam trong garments.male.ts).
 *
 * Quy tắc độ rộng: áo khoác không bao giờ `slim` (phải rộng hơn lớp áo trong, nếu không áo trong xuyên qua).
 */
import type { ExtractedGarmentCategory } from '../types/studio';
import type { StudioGarmentSpec } from './types';

const A = '/assets/aistudio';
const C = '/assets/cropped';

const spec = (
  styleId: StudioGarmentSpec['styleId'],
  colorHex: string,
  secondaryColorHex: string,
  fabric: StudioGarmentSpec['fabric'],
  weave: StudioGarmentSpec['weave'],
  fit: StudioGarmentSpec['fit']
): StudioGarmentSpec => ({ styleId, colorHex, secondaryColorHex, fabric, weave, fit });

/** Từng món trong tủ đồ mẫu nữ, theo đường dẫn ảnh */
export const FEMALE_IMAGE_STUDIO: Record<string, StudioGarmentSpec> = {
  [`${A}/garment_01_espresso_corset_fca6056c.png`]: spec('corset_top', '#4A2C1F', '#5E3A29', 'silk', 'silk_satin', 'slim'),
  [`${A}/garment_02_espresso_halter_5e7833a6.png`]: spec('halter_crop', '#4A2C1F', '#5E3A29', 'cotton', 'solid', 'slim'),
  [`${A}/garment_03_espresso_knit_ce0956dc.png`]: spec('crop_cardigan', '#7A4E36', '#8C5E44', 'cotton', 'ribbed_knit', 'regular'),
  [`${A}/garment_04_grey_offshoulder_4fab34c8.png`]: spec('off_shoulder_knit', '#9CA3AF', '#18181B', 'cotton', 'ribbed_knit', 'regular'),
  [`${A}/garment_05_mesh_bell_top_72b8b96f.png`]: spec('puff_blouse', '#4B5563', '#9CA3AF', 'silk', 'striped', 'regular'),
  [`${C}/top_black_puff.png`]: spec('puff_blouse', '#18181B', '#27272A', 'cotton', 'solid', 'slim'),
  [`${C}/top_star_raglan.png`]: spec('baby_tee', '#9CA3AF', '#18181B', 'cotton', 'solid', 'regular'),
  [`${A}/garment_07_flared_bow_jeans_3e67863f.png`]: spec('slim_jeans', '#A9C3E0', '#8DAAD0', 'denim', 'denim_twill', 'regular'),
  [`${A}/garment_08_pink_bow_baggy_d5ea866c.png`]: spec('slim_jeans', '#9DB8D9', '#F4A6C1', 'denim', 'denim_twill', 'oversized'),
  [`${C}/pant_cargo_beige.png`]: spec('female_cargo_pants', '#D8CBB0', '#C4B595', 'cotton', 'solid', 'oversized'),
  [`${C}/pant_dress_taupe.png`]: spec('tailored_trousers', '#8B7D72', '#7A6C61', 'cotton', 'solid', 'regular'),
  [`${C}/pant_highwaist_black.png`]: spec('slim_jeans', '#1F1F22', '#2B2B30', 'denim', 'denim_twill', 'oversized'),
  [`${A}/garment_09_pleated_denim_skirt_7fb2b758.png`]: spec('aline_skirt', '#2F4B7A', '#3E5C8E', 'denim', 'denim_twill', 'regular'),
  [`${A}/garment_10_black_bow_skirt_c6108f12.png`]: spec('aline_skirt', '#18181B', '#27272A', 'cotton', 'solid', 'regular'),
  [`${C}/skirt_pink_tiered.png`]: spec('aline_skirt', '#F4C2D0', '#EFAFC1', 'cotton', 'solid', 'regular'),
  [`${C}/skirt_white_maxi.png`]: spec('pleated_maxi_skirt', '#F8F7F2', '#ECEAE2', 'cotton', 'solid', 'regular'),
  [`${C}/skirt_white_mini.png`]: spec('aline_skirt', '#F5F5F4', '#E7E5E4', 'cotton', 'solid', 'regular'),
  [`${A}/outfit_dress_23_coquette_ribbon_3a26beae.jpg`]: spec('aline_princess_dress', '#F3EBDD', '#E7DCC8', 'cotton', 'solid', 'regular'),
  [`${A}/outfit_dress_24_silk_midi_evening_8dc9f369.jpg`]: spec('bodycon_midi_dress', '#7F1D1D', '#991B1B', 'silk', 'silk_satin', 'regular'),
  [`${A}/outfit_dress_25_blazer_pleated_office_1b75a8e6.jpg`]: spec('aline_princess_dress', '#1E2A4A', '#F5F5F4', 'cotton', 'solid', 'regular'),
  [`${A}/outfit_dress_26_halter_denim_y2k_deb4e06f.jpg`]: spec('aline_princess_dress', '#4A6FA5', '#3B5B8C', 'denim', 'denim_twill', 'regular'),
  [`${A}/garment_06_california_hoodie_b08928ac.png`]: spec('bomber_jacket', '#3F3F46', '#52525B', 'fleece', 'solid', 'oversized'),
  [`${A}/garment_11_valley_hoodie_7e4135bb.png`]: spec('bomber_jacket', '#18181B', '#27272A', 'fleece', 'solid', 'oversized'),
  [`${A}/garment_12_flannel_shirt_1c1d05e0.png`]: spec('denim_jacket', '#27272A', '#71717A', 'cotton', 'plaid_check', 'oversized'),
};

export function femaleStudioForImage(imageUrl: string | undefined): StudioGarmentSpec | undefined {
  return imageUrl ? FEMALE_IMAGE_STUDIO[imageUrl] : undefined;
}

export interface LookPiece {
  category: Extract<ExtractedGarmentCategory, 'top' | 'bottom' | 'outerwear' | 'dress'>;
  name: string;
  spec: StudioGarmentSpec;
}

const img = (url: string) => FEMALE_IMAGE_STUDIO[url];
const WHITE_TEE = spec('baby_tee', '#F5F5F4', '#E7E5E4', 'cotton', 'solid', 'regular');

/** Các bộ đồ nữ trong mục Gợi ý: đúng món theo tên bộ (đầm là một món, áo khoác có áo trong) */
export const FEMALE_LOOK_STUDIO: Record<string, LookPiece[]> = {
  look_coquette_new_1: [
    { category: 'top', name: 'Áo kiểu xám viền bèo', spec: img(`${A}/garment_04_grey_offshoulder_4fab34c8.png`) },
    { category: 'bottom', name: 'Chân váy đen xếp tầng', spec: img(`${A}/garment_10_black_bow_skirt_c6108f12.png`) },
  ],
  look_coquette_new_2: [
    { category: 'top', name: 'Áo quây nâu espresso', spec: img(`${A}/garment_01_espresso_corset_fca6056c.png`) },
    { category: 'bottom', name: 'Chân váy bèo tầng trắng', spec: img(`${C}/skirt_white_mini.png`) },
  ],
  look_coquette_new_3: [
    { category: 'dress', name: 'Đầm corset trắng kem', spec: img(`${A}/outfit_dress_23_coquette_ribbon_3a26beae.jpg`) },
  ],
  look_y2k_new_1: [
    { category: 'top', name: 'Áo lưới tay loe', spec: img(`${A}/garment_05_mesh_bell_top_72b8b96f.png`) },
    { category: 'bottom', name: 'Quần baggy jeans nơ hồng', spec: img(`${A}/garment_08_pink_bow_baggy_d5ea866c.png`) },
  ],
  look_y2k_new_2: [
    { category: 'top', name: 'Áo len nâu mocha cổ V', spec: img(`${A}/garment_03_espresso_knit_ce0956dc.png`) },
    { category: 'bottom', name: 'Quần jeans đen ống rộng', spec: img(`${C}/pant_highwaist_black.png`) },
  ],
  look_y2k_new_3: [
    { category: 'dress', name: 'Đầm denim cổ yếm', spec: img(`${A}/outfit_dress_26_halter_denim_y2k_deb4e06f.jpg`) },
  ],
  look_min_new_1: [
    { category: 'top', name: 'Áo cổ yếm nâu espresso', spec: img(`${A}/garment_02_espresso_halter_5e7833a6.png`) },
    { category: 'bottom', name: 'Chân váy denim xếp ly', spec: img(`${A}/garment_09_pleated_denim_skirt_7fb2b758.png`) },
  ],
  look_min_new_2: [
    { category: 'top', name: 'Áo len đắp chéo xanh rêu', spec: spec('crop_cardigan', '#7C8B6F', '#6B7A5F', 'cotton', 'ribbed_knit', 'regular') },
    { category: 'bottom', name: 'Chân váy denim chữ A', spec: img(`${A}/garment_09_pleated_denim_skirt_7fb2b758.png`) },
  ],
  look_min_new_3: [
    { category: 'top', name: 'Áo len gân sát nách nâu mocha', spec: spec('halter_crop', '#6B4A3A', '#7C5A48', 'cotton', 'ribbed_knit', 'slim') },
    { category: 'bottom', name: 'Chân váy denim đuôi cá', spec: spec('pencil_skirt', '#2F4B7A', '#3E5C8E', 'denim', 'denim_twill', 'regular') },
  ],
  look_smart_new_1: [
    { category: 'dress', name: 'Đầm lụa midi đỏ burgundy', spec: img(`${A}/outfit_dress_24_silk_midi_evening_8dc9f369.jpg`) },
  ],
  look_preppy_new_1: [
    { category: 'dress', name: 'Đầm giả vest navy', spec: img(`${A}/outfit_dress_25_blazer_pleated_office_1b75a8e6.jpg`) },
  ],
  look_preppy_new_2: [
    { category: 'top', name: 'Áo xám trễ vai', spec: img(`${A}/garment_04_grey_offshoulder_4fab34c8.png`) },
    { category: 'bottom', name: 'Chân váy xếp ly denim sáng', spec: spec('aline_skirt', '#6F93C4', '#5C80B2', 'denim', 'denim_twill', 'regular') },
  ],
  look_street_new_1: [
    { category: 'top', name: 'Áo thun trắng', spec: WHITE_TEE },
    { category: 'outerwear', name: 'Áo khoác hoodie zip đen', spec: img(`${A}/garment_11_valley_hoodie_7e4135bb.png`) },
    { category: 'bottom', name: 'Quần jeans đen ống suông', spec: img(`${C}/pant_highwaist_black.png`) },
  ],
  look_street_new_2: [
    { category: 'top', name: 'Áo thun in sao', spec: WHITE_TEE },
    { category: 'outerwear', name: 'Áo khoác bomber đen', spec: spec('bomber_jacket', '#18181B', '#3F3F46', 'cotton', 'solid', 'oversized') },
    { category: 'bottom', name: 'Quần baggy đen', spec: spec('tailored_trousers', '#1C1C1E', '#2A2A2D', 'cotton', 'solid', 'oversized') },
  ],
  look_street_new_3: [
    { category: 'top', name: 'Áo sweater wash xám khói', spec: spec('crop_cardigan', '#6B6B6E', '#55555A', 'fleece', 'solid', 'oversized') },
    { category: 'bottom', name: 'Quần jeans đen wash', spec: img(`${C}/pant_highwaist_black.png`) },
  ],
  look_street_new_4: [
    { category: 'top', name: 'Áo thun trắng', spec: WHITE_TEE },
    { category: 'outerwear', name: 'Áo sơ mi khoác kaki xám rêu', spec: spec('denim_jacket', '#6E7458', '#5C624A', 'cotton', 'solid', 'oversized') },
    { category: 'bottom', name: 'Quần ống suông đen', spec: spec('tailored_trousers', '#1C1C1E', '#2A2A2D', 'cotton', 'solid', 'oversized') },
  ],
  look_vintage_new_1: [
    { category: 'top', name: 'Áo len gân xám tay loe', spec: spec('off_shoulder_knit', '#C9C9CC', '#18181B', 'cotton', 'ribbed_knit', 'regular') },
    { category: 'bottom', name: 'Quần jeans ống loe xanh sáng', spec: img(`${A}/garment_07_flared_bow_jeans_3e67863f.png`) },
  ],
  look_sporty_1: [
    { category: 'top', name: 'Áo croptop thể thao đen', spec: spec('halter_crop', '#18181B', '#27272A', 'cotton', 'solid', 'slim') },
    { category: 'bottom', name: 'Quần jogger nỉ xám', spec: spec('male_jogger_sport', '#9CA3AF', '#8B929E', 'fleece', 'solid', 'oversized') },
  ],
  look_boho_1: [
    { category: 'top', name: 'Áo cổ yếm lụa xanh pastel', spec: spec('halter_crop', '#9EC5E8', '#8AB6DE', 'silk', 'silk_satin', 'regular') },
    { category: 'bottom', name: 'Chân váy maxi tầng trắng', spec: img(`${C}/skirt_white_maxi.png`) },
  ],
};
