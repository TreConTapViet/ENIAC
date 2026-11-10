import type { Occasion } from './occasions';
import { occasionInfo } from './occasions';
import type {
  BottomStyleId,
  DressStyleId,
  FabricType,
  FootwearStyleId,
  GenderProfile,
  HandbagStyleId,
  HatStyleId,
  OuterwearStyleId,
  OutfitConfiguration,
  PosePresetId,
  SunglassesStyleId,
  TopStyleId,
  WatchStyleId,
} from '@/components/mannequin3d/types/studio';
import { DEFAULT_ACCESSORIES } from '@/components/mannequin3d/data/presets';

export interface OccasionOutfitPreset {
  id: string;
  occasion: Occasion;
  gender: GenderProfile;
  name: string;
  tag: string;
  reason: string;
  recommendedPose: PosePresetId;
  swatchColors: string[];
  outfit: OutfitConfiguration;
  isAiGenerated?: boolean;
}

function makeOutfit(params: {
  size?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  dressStyleId?: DressStyleId;
  dressColor?: string;
  dressFabric?: FabricType;
  topStyleId?: TopStyleId;
  topColor?: string;
  topFabric?: FabricType;
  outerwearStyleId?: OuterwearStyleId;
  outerwearColor?: string;
  outerwearFabric?: FabricType;
  bottomStyleId?: BottomStyleId;
  bottomColor?: string;
  bottomFabric?: FabricType;
  footwearStyleId: FootwearStyleId;
  footwearColor: string;
  watchStyleId?: WatchStyleId;
  handbagStyleId?: HandbagStyleId;
  sunglassesStyleId?: SunglassesStyleId;
  hatStyleId?: HatStyleId;
  accLeatherHex?: string;
  accMetalHex?: string;
}): OutfitConfiguration {
  const accLeather = params.accLeatherHex || '#1E293B';
  const accMetal = params.accMetalHex || '#D4AF37';

  return {
    selectedSize: params.size || 'M',
    hideAllGarments: false,
    dress: {
      styleId: params.dressStyleId || 'none',
      colorHex: params.dressColor || '#7F1D1D',
      fabric: params.dressFabric || 'silk',
      weavePattern: 'solid',
      fitEase: 'slim',
    },
    top: {
      styleId: params.dressStyleId && params.dressStyleId !== 'none' ? 'none' : (params.topStyleId || 'silk_blouse_bow'),
      colorHex: params.topColor || '#F8FAFC',
      fabric: params.topFabric || 'cotton',
      weavePattern: 'solid',
      fitEase: 'regular',
    },
    outerwear: {
      styleId: params.outerwearStyleId || 'none',
      colorHex: params.outerwearColor || '#1E293B',
      fabric: params.outerwearFabric || 'fleece',
      weavePattern: 'solid',
      fitEase: 'regular',
    },
    bottom: {
      styleId: params.dressStyleId && params.dressStyleId !== 'none' ? 'none' : (params.bottomStyleId || 'tailored_trousers'),
      colorHex: params.bottomColor || '#1E293B',
      fabric: params.bottomFabric || 'fleece',
      weavePattern: 'solid',
      fitEase: 'regular',
    },
    footwear: {
      styleId: params.footwearStyleId,
      colorHex: params.footwearColor,
    },
    accessories: {
      ...DEFAULT_ACCESSORIES,
      watch: {
        ...DEFAULT_ACCESSORIES.watch,
        styleId: params.watchStyleId || 'none',
        strapColorHex: accLeather,
        caseColorHex: accMetal,
      },
      handbag: {
        ...DEFAULT_ACCESSORIES.handbag,
        styleId: params.handbagStyleId || 'none',
        colorHex: accLeather,
        hardwareColorHex: accMetal,
      },
      sunglasses: {
        ...DEFAULT_ACCESSORIES.sunglasses,
        styleId: params.sunglassesStyleId || 'none',
        frameColorHex: accMetal,
      },
      hat: {
        ...DEFAULT_ACCESSORIES.hat!,
        styleId: params.hatStyleId || 'none',
        colorHex: accLeather,
        trimColorHex: accMetal,
      },
    },
  };
}

export const OCCASION_OUTFIT_PRESETS: OccasionOutfitPreset[] = [
  // ==================== FEMALE: WORK (ĐI LÀM) ====================
  {
    id: 'f_work_1',
    occasion: 'work',
    gender: 'female',
    name: 'Blazer Công Sở & Sơ Mi Lụa Nơ',
    tag: 'Thanh lịch · Tôn vòng eo',
    reason: 'Áo sơ mi lụa thắt nơ kết hợp Blazer chiết eo và quần âu ống suông giúp kéo dài đôi chân và tạo vẻ chuyên nghiệp.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#1E293B', '#F8FAFC', '#334155'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'silk_blouse_bow',
      topColor: '#F8FAFC',
      topFabric: 'silk',
      outerwearStyleId: 'tailored_blazer',
      outerwearColor: '#1E293B',
      outerwearFabric: 'fleece',
      bottomStyleId: 'tailored_trousers',
      bottomColor: '#334155',
      bottomFabric: 'fleece',
      footwearStyleId: 'pointed_heels',
      footwearColor: '#1E293B',
      watchStyleId: 'vintage_gold_tank',
      handbagStyleId: 'structured_tote',
      accLeatherHex: '#1E293B',
      accMetalHex: '#D4AF37',
    }),
  },
  {
    id: 'f_work_2',
    occasion: 'work',
    gender: 'female',
    name: 'Sơ Mi Tay Phồng & Chân Váy Bút Chì',
    tag: 'Nữ tính · Chuẩn công sở',
    reason: 'Chân váy bút chì cạp cao ôm gọn vòng eo và hông, phối cùng áo tay phồng lụa kem nhẹ nhàng.',
    recommendedPose: 'editorial_crossed',
    swatchColors: ['#DBEAFE', '#475569', '#78350F'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'puff_blouse',
      topColor: '#DBEAFE',
      topFabric: 'silk',
      outerwearStyleId: 'none',
      bottomStyleId: 'pencil_skirt',
      bottomColor: '#475569',
      bottomFabric: 'fleece',
      footwearStyleId: 'pointed_heels',
      footwearColor: '#78350F',
      watchStyleId: 'minimal_dress_watch',
      handbagStyleId: 'mini_top_handle',
      accLeatherHex: '#78350F',
      accMetalHex: '#D4AF37',
    }),
  },
  {
    id: 'f_work_3',
    occasion: 'work',
    gender: 'female',
    name: 'Gile Vest & Quần Âu Kem Sang Trọng',
    tag: 'Quiet Luxury · Hiện đại',
    reason: 'Bản phối Gile Vest cùng quần âu kem tôn dáng thanh thoát, phù hợp họp hành và gặp đối tác.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#D6C7B2', '#F8FAFC', '#78350F'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'silk_camisole',
      topColor: '#F8FAFC',
      topFabric: 'silk',
      outerwearStyleId: 'gilet_vest',
      outerwearColor: '#D6C7B2',
      outerwearFabric: 'linen',
      bottomStyleId: 'tailored_trousers',
      bottomColor: '#D6C7B2',
      bottomFabric: 'linen',
      footwearStyleId: 'penny_loafers',
      footwearColor: '#78350F',
      watchStyleId: 'vintage_gold_tank',
      handbagStyleId: 'paris_saddle_bag',
      accLeatherHex: '#78350F',
      accMetalHex: '#D4AF37',
    }),
  },

  // ==================== FEMALE: CASUAL (ĐI CHƠI / HẸN HÒ) ====================
  {
    id: 'f_casual_1',
    occasion: 'casual',
    gender: 'female',
    name: 'Đầm Xòe Công Chúa Hẹn Hò',
    tag: 'Ngọt ngào · Nổi bật',
    reason: 'Đầm chữ A chiết eo cao giúp tôn trọn vòng eo nhỏ gọn và tạo độ xòe tự nhiên khi dạo phố hay hẹn hò cafe.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#E11D48', '#F8FAFC', '#D4AF37'],
    outfit: makeOutfit({
      size: 'S',
      dressStyleId: 'aline_princess_dress',
      dressColor: '#E11D48',
      dressFabric: 'silk',
      footwearStyleId: 'platform_mary_jane',
      footwearColor: '#1E293B',
      watchStyleId: 'vintage_gold_tank',
      handbagStyleId: 'mini_top_handle',
      accLeatherHex: '#F8FAFC',
      accMetalHex: '#D4AF37',
    }),
  },
  {
    id: 'f_casual_2',
    occasion: 'casual',
    gender: 'female',
    name: 'Áo Len Trễ Vai & Chân Váy Xếp Ly',
    tag: 'Hàn Quốc · Dịu dàng',
    reason: 'Áo trễ vai khoe khéo xương quai xanh kết hợp chân váy dài xếp ly tạo hiệu ứng thướt tha, nữ tính.',
    recommendedPose: 'natural_idle',
    swatchColors: ['#F43F5E', '#F3EFE6', '#78350F'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'off_shoulder_knit',
      topColor: '#FCE7F3',
      topFabric: 'fleece',
      outerwearStyleId: 'none',
      bottomStyleId: 'pleated_maxi_skirt',
      bottomColor: '#F3EFE6',
      bottomFabric: 'silk',
      footwearStyleId: 'pointed_heels',
      footwearColor: '#D6C7B2',
      watchStyleId: 'vintage_gold_tank',
      handbagStyleId: 'quilted_chain_flap',
      accLeatherHex: '#78350F',
      accMetalHex: '#D4AF37',
    }),
  },
  {
    id: 'f_casual_3',
    occasion: 'casual',
    gender: 'female',
    name: 'Áo Khoác Denim & Quần Jeans Ôm',
    tag: 'Trẻ trung · Năng động',
    reason: 'Set Baby Tee trắng phối cùng khoác Denim và quần Jeans cạp cao giúp hack dáng cực đỉnh cho buổi đi chơi.',
    recommendedPose: 'catwalk_walk',
    swatchColors: ['#2B4C7E', '#F8FAFC', '#1E293B'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'baby_tee',
      topColor: '#F8FAFC',
      topFabric: 'cotton',
      outerwearStyleId: 'denim_jacket',
      outerwearColor: '#3B82F6',
      outerwearFabric: 'denim',
      bottomStyleId: 'slim_jeans',
      bottomColor: '#1E3A8A',
      bottomFabric: 'denim',
      footwearStyleId: 'minimal_sneakers',
      footwearColor: '#F8FAFC',
      watchStyleId: 'minimal_dress_watch',
      handbagStyleId: 'paris_saddle_bag',
      sunglassesStyleId: 'retro_cat_eye',
    }),
  },

  // ==================== FEMALE: PARTY (ĐI TIỆC) ====================
  {
    id: 'f_party_1',
    occasion: 'party',
    gender: 'female',
    name: 'Đầm Lụa Dạ Hội Đỏ Rượu Vang',
    tag: 'Quyến rũ · Sang trọng',
    reason: 'Chất liệu lụa satin bóng nhẹ ôm theo đường cong 3 vòng, tôn vinh trọn vẹn vóc dáng trong đêm tiệc.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#881337', '#D4AF37', '#1E293B'],
    outfit: makeOutfit({
      size: 'S',
      dressStyleId: 'silk_slip_evening_dress',
      dressColor: '#881337',
      dressFabric: 'silk',
      footwearStyleId: 'strappy_stiletto_heels',
      footwearColor: '#1E293B',
      watchStyleId: 'vintage_gold_tank',
      handbagStyleId: 'quilted_chain_flap',
      accLeatherHex: '#1E293B',
      accMetalHex: '#D4AF37',
    }),
  },
  {
    id: 'f_party_2',
    occasion: 'party',
    gender: 'female',
    name: 'Đầm Cúp Ngực Corset Đen Huyền Bí',
    tag: 'Couture · Tôn 3 vòng',
    reason: 'Thiết kế cúp ngực định hình vòng eo thon gọn và tôn vòng 1 quyến rũ, nổi bật dưới ánh đèn sự kiện.',
    recommendedPose: 'editorial_crossed',
    swatchColors: ['#0F172A', '#D4AF37', '#9F1239'],
    outfit: makeOutfit({
      size: 'S',
      dressStyleId: 'corset_bustier_dress',
      dressColor: '#0F172A',
      dressFabric: 'silk',
      footwearStyleId: 'strappy_stiletto_heels',
      footwearColor: '#0F172A',
      watchStyleId: 'vintage_gold_tank',
      handbagStyleId: 'mini_top_handle',
      accLeatherHex: '#9F1239',
      accMetalHex: '#D4AF37',
    }),
  },
  {
    id: 'f_party_3',
    occasion: 'party',
    gender: 'female',
    name: 'Đầm Trễ Vai Dạ Tiệc & Áo Da Biker',
    tag: 'Cá tính · Thời thượng',
    reason: 'Sự kết hợp phá cách giữa đầm midi ôm sát và phụ kiện kim loại vàng tạo phong thái cuốn hút.',
    recommendedPose: 'catwalk_walk',
    swatchColors: ['#4C1D95', '#F3EFE6', '#D4AF37'],
    outfit: makeOutfit({
      size: 'S',
      dressStyleId: 'off_shoulder_couture_dress',
      dressColor: '#4C1D95',
      dressFabric: 'silk',
      footwearStyleId: 'pointed_heels',
      footwearColor: '#F3EFE6',
      watchStyleId: 'vintage_gold_tank',
      handbagStyleId: 'quilted_chain_flap',
      accLeatherHex: '#F3EFE6',
      accMetalHex: '#D4AF37',
    }),
  },

  // ==================== FEMALE: SPORTS (THỂ THAO) ====================
  {
    id: 'f_sports_1',
    occasion: 'sports',
    gender: 'female',
    name: 'Áo Baby Tee Thể Thao & Quần Cargo',
    tag: 'Thoáng mát · Linh hoạt',
    reason: 'Chất liệu cotton co giãn thấm hút tốt kết hợp quần Cargo năng động và giày Sneaker êm ái.',
    recommendedPose: 'catwalk_walk',
    swatchColors: ['#F8FAFC', '#334155', '#E11D48'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'baby_tee',
      topColor: '#F8FAFC',
      topFabric: 'cotton',
      outerwearStyleId: 'none',
      bottomStyleId: 'female_cargo_pants',
      bottomColor: '#334155',
      bottomFabric: 'cotton',
      footwearStyleId: 'chunky_dad_sneakers',
      footwearColor: '#F8FAFC',
      watchStyleId: 'smart_watch_ultra',
      sunglassesStyleId: 'cyber_shield_sport',
    }),
  },
  {
    id: 'f_sports_2',
    occasion: 'sports',
    gender: 'female',
    name: 'Áo Khoác Bomber & Quần Short Năng Động',
    tag: 'Sporty Chic · Khỏe khoắn',
    reason: 'Bản phối Bomber khoác ngoài croptop giúp giữ ấm nhẹ khi khởi động ngoài trời mà vẫn cực kỳ trẻ trung.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#065F46', '#F8FAFC', '#1E293B'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'halter_crop',
      topColor: '#F8FAFC',
      topFabric: 'cotton',
      outerwearStyleId: 'bomber_jacket',
      outerwearColor: '#065F46',
      outerwearFabric: 'cotton',
      bottomStyleId: 'female_denim_shorts',
      bottomColor: '#1E293B',
      bottomFabric: 'cotton',
      footwearStyleId: 'high_top_sneakers',
      footwearColor: '#F8FAFC',
      watchStyleId: 'smart_watch_ultra',
    }),
  },

  // ==================== FEMALE: LOUNGING (Ở NHÀ) ====================
  {
    id: 'f_lounging_1',
    occasion: 'lounging',
    gender: 'female',
    name: 'Áo Hai Dây Lụa & Quần Suông Mềm',
    tag: 'Thư giãn · Mềm mại',
    reason: 'Chất liệu lụa và linen nhẹ tênh, thoáng khí mang lại sự thoải mái tối đa khi thư giãn tại nhà.',
    recommendedPose: 'natural_idle',
    swatchColors: ['#E0E7FF', '#D6C7B2', '#F8FAFC'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'silk_camisole',
      topColor: '#E0E7FF',
      topFabric: 'silk',
      outerwearStyleId: 'none',
      bottomStyleId: 'tailored_trousers',
      bottomColor: '#D6C7B2',
      bottomFabric: 'linen',
      footwearStyleId: 'minimal_sneakers',
      footwearColor: '#F8FAFC',
    }),
  },
  {
    id: 'f_lounging_2',
    occasion: 'lounging',
    gender: 'female',
    name: 'Áo Thun Baby Tee & Quần Short Thoải Mái',
    tag: 'Gọn gàng · Tự nhiên',
    reason: 'Phom dáng gọn nhẹ, co giãn dễ chịu cho các hoạt động sinh hoạt thường ngày ở nhà.',
    recommendedPose: 'natural_idle',
    swatchColors: ['#FCE7F3', '#60A5FA', '#F8FAFC'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'baby_tee',
      topColor: '#FCE7F3',
      topFabric: 'cotton',
      outerwearStyleId: 'none',
      bottomStyleId: 'female_denim_shorts',
      bottomColor: '#60A5FA',
      bottomFabric: 'cotton',
      footwearStyleId: 'minimal_sneakers',
      footwearColor: '#F8FAFC',
    }),
  },

  // ==================== FEMALE: BEACH (BIỂN / DU LỊCH) ====================
  {
    id: 'f_beach_1',
    occasion: 'beach',
    gender: 'female',
    name: 'Áo Yếm Halter & Chân Váy Maxi Đi Biển',
    tag: 'Đón nắng · Phóng khoáng',
    reason: 'Áo yếm khoe bờ vai thon phối cùng chân váy dài bay bổng trong gió biển, lên hình du lịch cực ăn ảnh.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#0284C7', '#F8FAFC', '#D97706'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'halter_crop',
      topColor: '#0284C7',
      topFabric: 'linen',
      outerwearStyleId: 'none',
      bottomStyleId: 'pleated_maxi_skirt',
      bottomColor: '#F8FAFC',
      bottomFabric: 'linen',
      footwearStyleId: 'strappy_stiletto_heels',
      footwearColor: '#D6C7B2',
      handbagStyleId: 'paris_saddle_bag',
      sunglassesStyleId: 'oversized_square',
      accLeatherHex: '#D97706',
      accMetalHex: '#D4AF37',
    }),
  },
  {
    id: 'f_beach_2',
    occasion: 'beach',
    gender: 'female',
    name: 'Áo Hai Dây Lụa & Quần Short Denim Dạo Biển',
    tag: 'Mát mẻ · Trẻ trung',
    reason: 'Set đồ mát mẻ, năng động cho những chuyến dạo biển và khám phá kỳ nghỉ hè.',
    recommendedPose: 'catwalk_walk',
    swatchColors: ['#F59E0B', '#3B82F6', '#F8FAFC'],
    outfit: makeOutfit({
      size: 'S',
      topStyleId: 'silk_camisole',
      topColor: '#FEF3C7',
      topFabric: 'silk',
      outerwearStyleId: 'none',
      bottomStyleId: 'female_denim_shorts',
      bottomColor: '#3B82F6',
      bottomFabric: 'denim',
      footwearStyleId: 'minimal_sneakers',
      footwearColor: '#F8FAFC',
      sunglassesStyleId: 'retro_cat_eye',
      handbagStyleId: 'crossbody_messenger',
    }),
  },

  // ==================== MALE: WORK (ĐI LÀM) ====================
  {
    id: 'm_work_1',
    occasion: 'work',
    gender: 'male',
    name: 'Suit Blazer Công Sở & Sơ Mi Oxford',
    tag: 'Lịch lãm · Chuyên nghiệp',
    reason: 'Áo sơ mi Oxford trắng kết hợp Blazer xanh navy và quần âu tạo phong thái đĩnh đạc nơi công sở.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#1E293B', '#F8FAFC', '#78350F'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'oxford_shirt',
      topColor: '#F8FAFC',
      topFabric: 'cotton',
      outerwearStyleId: 'tailored_blazer',
      outerwearColor: '#1E293B',
      outerwearFabric: 'fleece',
      bottomStyleId: 'male_dress_trousers',
      bottomColor: '#1E293B',
      bottomFabric: 'fleece',
      footwearStyleId: 'oxford_dress_shoes',
      footwearColor: '#78350F',
      watchStyleId: 'luxury_chronograph',
    }),
  },
  {
    id: 'm_work_2',
    occasion: 'work',
    gender: 'male',
    name: 'Áo Polo Dệt Kim & Quần Khaki Chino',
    tag: 'Smart Casual · Gọn gàng',
    reason: 'Phong cách công sở hiện đại, thoáng mát nhưng vẫn giữ trọn nét lịch sự.',
    recommendedPose: 'natural_idle',
    swatchColors: ['#1E3A8A', '#D6C7B2', '#78350F'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'polo_shirt',
      topColor: '#1E3A8A',
      topFabric: 'cotton',
      outerwearStyleId: 'none',
      bottomStyleId: 'male_chino_khaki',
      bottomColor: '#D6C7B2',
      bottomFabric: 'cotton',
      footwearStyleId: 'penny_loafers',
      footwearColor: '#78350F',
      watchStyleId: 'minimal_dress_watch',
    }),
  },

  // ==================== MALE: CASUAL (ĐI CHƠI / HẸN HÒ) ====================
  {
    id: 'm_casual_1',
    occasion: 'casual',
    gender: 'male',
    name: 'Khoác Bomber & Quần Jeans Xanh',
    tag: 'Nam tính · Năng động',
    reason: 'Bản phối áo thun trắng cùng Bomber và quần Jeans mang lại vẻ ngoài trẻ trung, thu hút khi đi hẹn hò.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#334155', '#F8FAFC', '#1E3A8A'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'crewneck_tee',
      topColor: '#F8FAFC',
      topFabric: 'cotton',
      outerwearStyleId: 'bomber_jacket',
      outerwearColor: '#334155',
      outerwearFabric: 'cotton',
      bottomStyleId: 'male_denim_jeans',
      bottomColor: '#1E3A8A',
      bottomFabric: 'denim',
      footwearStyleId: 'minimal_sneakers',
      footwearColor: '#F8FAFC',
      watchStyleId: 'luxury_chronograph',
      sunglassesStyleId: 'classic_aviator',
    }),
  },
  {
    id: 'm_casual_2',
    occasion: 'casual',
    gender: 'male',
    name: 'Áo Khoác Denim & Quần Chino Kem',
    tag: 'Trẻ trung · Lãng tử',
    reason: 'Sự tương phản giữa Denim xanh và quần Chino màu kem giúp tổng thể sáng sủa và tôn chiều cao.',
    recommendedPose: 'catwalk_walk',
    swatchColors: ['#2B4C7E', '#F8FAFC', '#D6C7B2'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'crewneck_tee',
      topColor: '#F8FAFC',
      topFabric: 'cotton',
      outerwearStyleId: 'denim_jacket',
      outerwearColor: '#2B4C7E',
      outerwearFabric: 'denim',
      bottomStyleId: 'male_chino_khaki',
      bottomColor: '#D6C7B2',
      bottomFabric: 'cotton',
      footwearStyleId: 'chelsea_boots',
      footwearColor: '#78350F',
      watchStyleId: 'minimal_dress_watch',
    }),
  },

  // ==================== MALE: PARTY (ĐI TIỆC) ====================
  {
    id: 'm_party_1',
    occasion: 'party',
    gender: 'male',
    name: 'Áo Cổ Lọ Đen & Blazer Sang Trọng',
    tag: 'Quý ông · Đi tiệc tối',
    reason: 'Phong cách Quý ông châu Âu với áo cổ lọ dệt kim phối cùng Blazer và Chelsea Boots da bóng.',
    recommendedPose: 'editorial_crossed',
    swatchColors: ['#0F172A', '#334155', '#D4AF37'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'turtleneck_knit',
      topColor: '#0F172A',
      topFabric: 'fleece',
      outerwearStyleId: 'tailored_blazer',
      outerwearColor: '#1E293B',
      outerwearFabric: 'fleece',
      bottomStyleId: 'male_dress_trousers',
      bottomColor: '#0F172A',
      bottomFabric: 'fleece',
      footwearStyleId: 'chelsea_boots',
      footwearColor: '#0F172A',
      watchStyleId: 'luxury_chronograph',
    }),
  },
  {
    id: 'm_party_2',
    occasion: 'party',
    gender: 'male',
    name: 'Áo Khoác Da Biker & Quần Âu Đen',
    tag: 'Cá tính · Nổi bật',
    reason: 'Chất liệu da Biker cao cấp tạo điểm nhấn mạnh mẽ, cuốn hút trong các buổi tiệc đêm.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#1E293B', '#9F1239', '#0F172A'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'crewneck_tee',
      topColor: '#9F1239',
      topFabric: 'cotton',
      outerwearStyleId: 'biker_leather',
      outerwearColor: '#0F172A',
      outerwearFabric: 'leather',
      bottomStyleId: 'male_dress_trousers',
      bottomColor: '#0F172A',
      bottomFabric: 'fleece',
      footwearStyleId: 'chelsea_boots',
      footwearColor: '#0F172A',
      watchStyleId: 'luxury_chronograph',
      sunglassesStyleId: 'classic_aviator',
    }),
  },

  // ==================== MALE: SPORTS (THỂ THAO) ====================
  {
    id: 'm_sports_1',
    occasion: 'sports',
    gender: 'male',
    name: 'Áo Thun Thể Thao & Quần Jogger',
    tag: 'Vận động · Thoáng khí',
    reason: 'Thiết kế co giãn 4 chiều giúp vận động linh hoạt kết hợp giày Sneaker thể thao.',
    recommendedPose: 'catwalk_walk',
    swatchColors: ['#1E293B', '#475569', '#F8FAFC'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'compression_athletic',
      topColor: '#1E293B',
      topFabric: 'cotton',
      outerwearStyleId: 'none',
      bottomStyleId: 'male_jogger_sport',
      bottomColor: '#475569',
      bottomFabric: 'cotton',
      footwearStyleId: 'chunky_dad_sneakers',
      footwearColor: '#F8FAFC',
      watchStyleId: 'smart_watch_ultra',
      sunglassesStyleId: 'cyber_shield_sport',
    }),
  },

  // ==================== MALE: LOUNGING (Ở NHÀ) ====================
  {
    id: 'm_lounging_1',
    occasion: 'lounging',
    gender: 'male',
    name: 'Áo Thun Cotton & Quần Short Ở Nhà',
    tag: 'Thoải mái · Nhẹ nhàng',
    reason: 'Chất vải cotton mềm mại, thoáng mát cho ngày nghỉ ngơi thư giãn tại nhà.',
    recommendedPose: 'natural_idle',
    swatchColors: ['#DBEAFE', '#475569', '#F8FAFC'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'crewneck_tee',
      topColor: '#DBEAFE',
      topFabric: 'cotton',
      outerwearStyleId: 'none',
      bottomStyleId: 'tailored_shorts',
      bottomColor: '#475569',
      bottomFabric: 'cotton',
      footwearStyleId: 'minimal_sneakers',
      footwearColor: '#F8FAFC',
    }),
  },

  // ==================== MALE: BEACH (BIỂN / DU LỊCH) ====================
  {
    id: 'm_beach_1',
    occasion: 'beach',
    gender: 'male',
    name: 'Sơ Mi Linen Trắng & Quần Short Đi Biển',
    tag: 'Phóng khoáng · Mùa hè',
    reason: 'Chất liệu Linen thoáng mát phối cùng quần short màu xanh biển và kính mát Aviator.',
    recommendedPose: 'lookbook_pose',
    swatchColors: ['#F8FAFC', '#0284C7', '#D6C7B2'],
    outfit: makeOutfit({
      size: 'L',
      topStyleId: 'oxford_shirt',
      topColor: '#F8FAFC',
      topFabric: 'linen',
      outerwearStyleId: 'none',
      bottomStyleId: 'tailored_shorts',
      bottomColor: '#0284C7',
      bottomFabric: 'linen',
      footwearStyleId: 'penny_loafers',
      footwearColor: '#D6C7B2',
      sunglassesStyleId: 'classic_aviator',
      watchStyleId: 'smart_watch_ultra',
    }),
  },
];

export function getPresetsForOccasion(
  occasion: Occasion,
  gender: GenderProfile
): OccasionOutfitPreset[] {
  const targetGender = gender === 'male' ? 'male' : 'female';
  const matched = OCCASION_OUTFIT_PRESETS.filter(
    (p) => p.occasion === occasion && p.gender === targetGender
  );
  if (matched.length > 0) return matched;
  return OCCASION_OUTFIT_PRESETS.filter((p) => p.gender === targetGender).slice(0, 3);
}

export async function generateAiOutfitsForOccasion(params: {
  occasion: Occasion;
  gender: GenderProfile;
  heightCm: number;
  weightKg: number;
  waistCm?: number | null;
  hipCm?: number | null;
  bustCm?: number | null;
  bodyShapeName?: string;
}): Promise<OccasionOutfitPreset[]> {
  const occ = occasionInfo(params.occasion);
  const trendMap: Record<Occasion, { id: string; label: string }> = {
    work: { id: 'office_siren_tailored', label: 'Công Sở Thanh Lịch & Tailored' },
    casual: { id: 'parisian_chic', label: 'Dạo Phố & Hẹn Hò Trẻ Trung' },
    party: { id: 'quiet_luxury', label: 'Dạ Tiệc Sang Trọng & Nổi Bật' },
    sports: { id: 'streetwear_athleisure', label: 'Thể Thao Năng Động Athleisure' },
    lounging: { id: 'minimal_scandi', label: 'Thư Giãn Tối Giản Tại Nhà' },
    beach: { id: 'resort_summer', label: 'Resort Du Lịch Biển Thoáng Mát' },
  };
  const trend = trendMap[params.occasion] || trendMap.casual;

  try {
    const resp = await fetch('/api/ai-stylist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trendId: trend.id,
        trendLabel: trend.label,
        occasion: params.occasion,
        occasionLabel: `${occ.emoji} ${occ.label} (${occ.description})`,
        genderProfile: params.gender === 'male' ? 'male' : 'female',
        heightCm: params.heightCm,
        weightKg: params.weightKg,
        waistCm: params.waistCm,
        hipCm: params.hipCm,
        bustCm: params.bustCm,
        bodyShapeName: params.bodyShapeName || 'Cân đối',
        customPrompt: `Hãy gợi ý 3 bộ trang phục đẹp nhất cho hoàn cảnh "${occ.label}" (${occ.description}), phù hợp với chiều cao ${params.heightCm}cm, cân nặng ${params.weightKg}kg${
          params.gender !== 'male' && params.bustCm && params.waistCm && params.hipCm
            ? ` và số đo 3 vòng ${params.bustCm}-${params.waistCm}-${params.hipCm}cm`
            : ''
        }.`,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data?.recommendations) && data.recommendations.length > 0) {
        return data.recommendations.map((rec: Record<string, unknown>, idx: number): OccasionOutfitPreset => {
          const topHex = String(rec.topColorHex || '#F8FAFC');
          const outHex = String(rec.outerwearColorHex || '#1E293B');
          const botHex = String(rec.bottomColorHex || '#1E293B');
          const shoeHex = String(rec.footwearColorHex || '#1E293B');
          const accHex = String(rec.accessoryColorHex || '#78350F');
          const metalHex = String(rec.accessoryMetalHex || '#D4AF37');

          return {
            id: `ai_${params.occasion}_${Date.now()}_${idx}`,
            occasion: params.occasion,
            gender: params.gender,
            name: String(rec.title || `AI Phối Đồ ${occ.label} #${idx + 1}`),
            tag: `AI Stylist · ${rec.styleCompatibilityScore || 96}% hợp dáng`,
            reason: String(rec.savedStyleMatchReason || rec.trendAnalysis || occ.description),
            recommendedPose: (rec.recommendedPose as PosePresetId) || 'lookbook_pose',
            swatchColors: [topHex, outHex, botHex],
            isAiGenerated: true,
            outfit: makeOutfit({
              size: params.gender === 'male' ? 'L' : 'S',
              topStyleId: (rec.topStyleId as TopStyleId) || 'silk_blouse_bow',
              topColor: topHex,
              topFabric: (rec.topFabric as FabricType) || 'silk',
              outerwearStyleId: (rec.outerwearStyleId as OuterwearStyleId) || 'none',
              outerwearColor: outHex,
              outerwearFabric: (rec.outerwearFabric as FabricType) || 'fleece',
              bottomStyleId: (rec.bottomStyleId as BottomStyleId) || 'tailored_trousers',
              bottomColor: botHex,
              bottomFabric: (rec.bottomFabric as FabricType) || 'fleece',
              footwearStyleId: (rec.footwearStyleId as FootwearStyleId) || 'pointed_heels',
              footwearColor: shoeHex,
              watchStyleId: (rec.watchStyleId as WatchStyleId) || 'vintage_gold_tank',
              handbagStyleId: (rec.handbagStyleId as HandbagStyleId) || 'none',
              sunglassesStyleId: (rec.sunglassesStyleId as SunglassesStyleId) || 'none',
              accLeatherHex: accHex,
              accMetalHex: metalHex,
            }),
          };
        });
      }
    }
  } catch {
    // Fallback to curated presets below
  }

  return getPresetsForOccasion(params.occasion, params.gender).map((p, idx) => ({
    ...p,
    id: `${p.id}_ai_${idx}`,
    isAiGenerated: true,
    tag: `AI Đề Xuất · ${p.tag}`,
  }));
}
