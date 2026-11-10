export type GenderProfile = 'female' | 'male' | 'neutral';

export type HairstyleId =
  // Female-Exclusive Hairstyles (12 Original + 6 Extracted Cutout Styles)
  | 'long_wavy'
  | 'long_straight'
  | 'curly_voluminous'
  | 'korean_hime_layer'
  | 'butterfly_wolf_cut'
  | 'shoulder_bob'
  | 'clavicle_lob'
  | 'high_ponytail'
  | 'updo_bun'
  | 'low_chignon'
  | 'pixie_short'
  | 'twin_braids'
  | 'female_cut_side_ponytail'
  | 'female_cut_long_side_straight'
  | 'female_cut_long_wavy_bangs'
  | 'female_cut_long_curtain_wave'
  | 'female_cut_medium_c_curl'
  | 'female_cut_side_low_bun'
  // Male-Exclusive Hairstyles (9 Vector Shaded + 24 Silhouette Cutout Styles)
  | 'male_vec_side_swept_pomp'
  | 'male_vec_textured_pompadour'
  | 'male_vec_spiky_quiff'
  | 'male_vec_side_comb_layer'
  | 'male_vec_textured_crop'
  | 'male_vec_classic_pompadour'
  | 'male_vec_comma_part'
  | 'male_vec_long_diagonal_fringe'
  | 'male_vec_wavy_center_back'
  | 'male_sil_r1c1_square_part'
  | 'male_sil_r1c2_jagged_fringe'
  | 'male_sil_r1c3_flat_crest'
  | 'male_sil_r2c1_round_bowl'
  | 'male_sil_r2c2_wavy_widow'
  | 'male_sil_r2c3_classic_side'
  | 'male_sil_r3c1_crew_dome'
  | 'male_sil_r3c2_side_sweep_bang'
  | 'male_sil_r3c3_french_crop'
  | 'male_sil_r4c1_faux_hawk'
  | 'male_sil_r4c2_dandy_fringe'
  | 'male_sil_r4c3_shaggy_layer'
  | 'male_sil_r5c1_messy_fringe'
  | 'male_sil_r5c2_curtain_part'
  | 'male_sil_r5c3_winged_back'
  | 'male_sil_r6c1_swept_quiff'
  | 'male_sil_r6c2_asym_wave'
  | 'male_sil_r6c3_soft_two_block'
  | 'male_sil_r7c1_side_strands'
  | 'male_sil_r7c2_ivy_league'
  | 'male_sil_r7c3_spiky_sweep'
  | 'male_sil_r8c1_silver_classic'
  | 'male_sil_r8c2_round_shag'
  | 'male_sil_r8c3_short_spiky_crew'
  // Shared
  | 'none';

export type MannequinSurfaceId =
  | 'natural_fair'
  | 'natural_light'
  | 'natural_medium'
  | 'natural_tan'
  | 'natural_deep'
  | 'croquis_sketch'
  | 'studio_porcelain'
  | 'studio_plaster'
  | 'studio_titanium';

export type MakeupPresetId =
  | 'natural_no_makeup'
  | 'korean_peach_glow'
  | 'parisian_classic_red'
  | 'douyin_rose_glam'
  | 'soft_latte_nude'
  | 'evening_burgundy';

export interface FemaleMakeupConfig {
  presetId: MakeupPresetId;
  lipColorHex: string;
  lipIntensity: number;       // 0.0 - 1.0
  lipGloss: number;           // 0.0 (Matte) - 1.0 (Glossy)
  blushColorHex: string;
  blushIntensity: number;     // 0.0 - 1.0
  eyeshadowColorHex: string;
  eyeshadowIntensity: number; // 0.0 - 1.0
  eyelinerIntensity: number;  // 0.0 - 1.0
  highlighterGlow: number;    // 0.0 - 1.0
}

export interface BodyMeasurements {
  genderProfile: GenderProfile;
  heightCm: number;      // 100 - 300 cm
  weightKg: number;      // 20 - 500 kg
  shoulderCm: number;    // 30 - 75 cm
  chestCm: number;       // 60 - 180 cm
  waistCm: number;       // 45 - 170 cm
  hipCm: number;         // 65 - 185 cm
  inlegCm: number;       // 45 - 140 cm
  bicepCm?: number;      // 18 - 65 cm (Chu vi bắp tay trên)
  forearmCm?: number;    // 16 - 50 cm (Chu vi cẳng tay)
  thighCm?: number;      // 36 - 105 cm (Chu vi bắp đùi)
  calfCm?: number;       // 26 - 68 cm (Chu vi bắp chân)
  armSkeletalScale?: number; // Tỷ lệ mở rộng khung xương và cơ tay theo cân nặng
  legSkeletalScale?: number; // Tỷ lệ mở rộng khung xương và cơ chân theo cân nặng
  surfaceId: MannequinSurfaceId;
  hairstyleId: HairstyleId;
  hairColorHex: string;
  eyeColorHex: string;
  makeup: FemaleMakeupConfig;
  autoScaleFromWeight: boolean;
}

export type FabricType =
  | 'cotton'
  | 'silk'
  | 'denim'
  | 'leather'
  | 'fleece'
  | 'linen';

export type FitEase = 'slim' | 'regular' | 'oversized';

export type GarmentWeavePattern =
  | 'solid'
  | 'ribbed_knit'
  | 'denim_twill'
  | 'striped'
  | 'plaid_check'
  | 'leather_grain'
  | 'silk_satin';

export type TopStyleId =
  | 'none'
  // Female-Exclusive Top Styles
  | 'silk_blouse_bow'
  | 'baby_tee'
  | 'off_shoulder_knit'
  | 'corset_top'
  | 'silk_camisole'
  | 'puff_blouse'
  | 'halter_crop'
  | 'crop_cardigan'
  | 'female_turtleneck'
  | 'peplum_waist_top'
  // Male-Exclusive Top Styles
  | 'oxford_shirt'
  | 'crewneck_tee'
  | 'polo_shirt'
  | 'henley_shirt'
  | 'hoodie_street'
  | 'turtleneck_knit'
  | 'compression_athletic'
  | 'fitted_tank';

export type DressStyleId =
  | 'none'
  | 'silk_slip_evening_dress'
  | 'aline_princess_dress'
  | 'bodycon_midi_dress'
  | 'pleated_gala_gown'
  | 'off_shoulder_couture_dress'
  | 'corset_bustier_dress';

export type OuterwearStyleId =
  | 'none'
  | 'tailored_blazer'
  | 'bomber_jacket'
  | 'biker_leather'
  | 'trench_coat'
  | 'gilet_vest'
  | 'denim_jacket';

export type BottomStyleId =
  | 'none'
  // Female-Exclusive Bottom Styles
  | 'aline_skirt'
  | 'pleated_maxi_skirt'
  | 'pencil_skirt'
  | 'female_denim_shorts'
  | 'female_cargo_pants'
  | 'slim_jeans'
  | 'tailored_trousers'
  // Male-Exclusive Bottom Styles
  | 'male_dress_trousers'
  | 'male_denim_jeans'
  | 'cargo_pants'
  | 'tailored_shorts'
  | 'male_chino_khaki'
  | 'male_jogger_sport';

export type FootwearStyleId =
  | 'none'
  | 'minimal_sneakers'
  | 'chunky_dad_sneakers'
  | 'high_top_sneakers'
  | 'chelsea_boots'
  | 'knee_high_boots'
  | 'penny_loafers'
  | 'oxford_dress_shoes'
  | 'pointed_heels'
  | 'strappy_stiletto_heels'
  | 'platform_mary_jane';

export type WatchStyleId =
  | 'none'
  | 'luxury_chronograph'
  | 'minimal_dress_watch'
  | 'smart_watch_ultra'
  | 'vintage_gold_tank';

export type HandbagStyleId =
  | 'none'
  | 'paris_saddle_bag'
  | 'structured_tote'
  | 'quilted_chain_flap'
  | 'mini_top_handle'
  | 'crossbody_messenger';

export type SunglassesStyleId =
  | 'none'
  | 'classic_aviator'
  | 'retro_cat_eye'
  | 'oversized_square'
  | 'cyber_shield_sport'
  | 'vintage_round_metal';

export type HatStyleId =
  | 'none'
  | 'baseball_cap'
  | 'bucket_hat'
  | 'beret_paris'
  | 'wide_brim_sunhat'
  | 'fedora_classic';

export type PropStyleId =
  | 'none'
  | 'luxury_umbrella'
  | 'transparent_dome_umbrella'
  | 'basketball_pro'
  | 'soccer_ball_fifa'
  | 'art_toy_bear'
  | 'plush_bunny_toy';

export type ArmSideChoice = 'auto' | 'left' | 'right';

export type HandbagCarryMode =
  | 'auto'
  | 'hand_held'
  | 'crook_of_arm'
  | 'shoulder_bag';

export type SunglassesWearPosition = 'eyes' | 'head_crown';

export interface AccessoriesConfiguration {
  watch: {
    styleId: WatchStyleId;
    caseColorHex: string;
    strapColorHex: string;
    wristSide: ArmSideChoice;
    uploadedName?: string;
    transformedSummary?: string;
    previewThumbUrl?: string;
    uploadedTextureUrl?: string;
  };
  handbag: {
    styleId: HandbagStyleId;
    colorHex: string;
    hardwareColorHex: string;
    armSide: ArmSideChoice;
    carryMode: HandbagCarryMode;
    uploadedName?: string;
    transformedSummary?: string;
    previewThumbUrl?: string;
    uploadedTextureUrl?: string;
  };
  sunglasses: {
    styleId: SunglassesStyleId;
    frameColorHex: string;
    lensColorHex: string;
    wearPosition: SunglassesWearPosition;
    uploadedName?: string;
    transformedSummary?: string;
    previewThumbUrl?: string;
    uploadedTextureUrl?: string;
  };
  hat?: {
    styleId: HatStyleId;
    colorHex: string;
    trimColorHex?: string;
    uploadedName?: string;
    transformedSummary?: string;
    previewThumbUrl?: string;
    uploadedTextureUrl?: string;
  };
  prop?: {
    styleId: PropStyleId;
    colorHex: string;
    secondaryColorHex?: string;
    handSide?: ArmSideChoice;
    uploadedName?: string;
    transformedSummary?: string;
    previewThumbUrl?: string;
    uploadedTextureUrl?: string;
  };
}

export interface GarmentLayerConfig<TStyle extends string> {
  styleId: TStyle;
  fabric: FabricType;
  colorHex: string;
  secondaryColorHex?: string;
  weavePattern?: GarmentWeavePattern;
  fitEase: FitEase;
  uploadedName?: string;
  transformedSummary?: string;
  previewThumbUrl?: string;
  uploadedTextureUrl?: string;
  uploadedCutoutParams?: [number, number, number, number];
}

export type ExtractedGarmentCategory =
  | 'top'
  | 'dress'
  | 'outerwear'
  | 'bottom'
  | 'footwear'
  | 'hair'
  | 'hat'
  | 'sunglasses'
  | 'watch'
  | 'handbag'
  | 'prop';

export interface ExtractedGarmentItem {
  id: string;
  category: ExtractedGarmentCategory;
  vietnameseName: string;
  categoryLabel?: string;
  name?: string;
  styleId:
    | TopStyleId
    | DressStyleId
    | OuterwearStyleId
    | BottomStyleId
    | FootwearStyleId
    | HairstyleId
    | HatStyleId
    | SunglassesStyleId
    | WatchStyleId
    | HandbagStyleId
    | PropStyleId;
  colorHex: string;
  secondaryColorHex: string;
  fabric: FabricType;
  weavePattern: GarmentWeavePattern;
  fitEase: FitEase;
  previewThumbUrl: string;
  uploadedTextureUrl: string;
  uploadedCutoutParams: [number, number, number, number];
  sourceFileName?: string;
  sourceMode: 'model_photo_ai' | 'camera_capture' | 'single_upload';
  confidence: number;
  sunglassesWearPosition?: SunglassesWearPosition;
  handbagCarryMode?: HandbagCarryMode;
}

export interface OutfitConfiguration {
  top: GarmentLayerConfig<TopStyleId>;
  dress?: GarmentLayerConfig<DressStyleId>;
  outerwear: GarmentLayerConfig<OuterwearStyleId>;
  bottom: GarmentLayerConfig<BottomStyleId>;
  footwear: {
    styleId: FootwearStyleId;
    colorHex: string;
    uploadedName?: string;
    transformedSummary?: string;
    previewThumbUrl?: string;
  };
  accessories?: AccessoriesConfiguration;
  selectedSize: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  hideAllGarments?: boolean;
}

export type JointId =
  | 'head'
  | 'neck'
  | 'chest'
  | 'spine'
  | 'pelvis'
  | 'leftShoulder'
  | 'leftElbow'
  | 'leftWrist'
  | 'rightShoulder'
  | 'rightElbow'
  | 'rightWrist'
  | 'leftHip'
  | 'leftKnee'
  | 'leftAnkle'
  | 'rightHip'
  | 'rightKnee'
  | 'rightAnkle';

export interface EulerDegrees {
  x: number; // Pitch (Gập / Duỗi)
  y: number; // Yaw (Xoay trục)
  z: number; // Roll (Nghiêng)
}

export type JointRotationMap = Record<JointId, EulerDegrees>;

export type PosePresetId =
  | 'croquis_signature'
  | 'stand_still'
  | 'natural_idle'
  | 'lookbook_pose'
  | 'catwalk_walk'
  | 'editorial_crossed'
  | 'greeting_wave'
  | 'turn_360';

export type CameraPresetId =
  | 'full_front'
  | 'three_quarter'
  | 'upper_detail'
  | 'lower_detail'
  | 'back_view';

export type StudioLightingId = 'daylight_studio' | 'warm_editorial' | 'high_contrast';

export type ActiveDockTab =
  | 'body'
  | 'wardrobe'
  | 'accessories'
  | 'pose'
  | 'ai_stylist';

export type FashionTrendId =
  | 'quiet_luxury'
  | 'modern_tailoring'
  | 'street_avant_garde'
  | 'cyber_tech_editorial'
  | 'resort_mediterranean';

export type FitStatus = 'tight' | 'optimal' | 'relaxed';

export interface FitZoneReport {
  zone: string;
  userCm: number;
  garmentCm: number;
  diffCm: number;
  status: FitStatus;
  label: string;
}

export interface OutfitScoreBreakdown {
  totalScore: number;         // 0 - 100
  grade: 'S' | 'A+' | 'A' | 'B+' | 'B';
  verdictTitle: string;
  fitScore: number;           // 0 - 100
  colorHarmonyScore: number;  // 0 - 100
  fabricBalanceScore: number; // 0 - 100
  styleSynergyScore: number;  // 0 - 100
  stylistAdvice: string;
}

export interface FitAnalysisResult {
  bmi: number;
  bmiCategory: string;
  bodyShapeName: string;
  bodyShapeDescription: string;
  determinationMethod: 'three_measurements' | 'bmi_index';
  recommendedSize: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  overallFitLabel: string;
  zones: FitZoneReport[];
  outfitScore: OutfitScoreBreakdown;
}

export interface OutfitHistoryEntry {
  id: string;
  label: string;
  timestamp: string;
  genderProfile: GenderProfile;
  outfit: OutfitConfiguration;
  score: OutfitScoreBreakdown;
}

export type WeatherMode = 'clear' | 'wind' | 'rain' | 'storm';

export interface WeatherEffectConfig {
  mode: WeatherMode;
  windIntensity: number; // 0.0 to 1.0 (0 m/s to 18 m/s)
  windDirectionDeg: number; // -180 to 180 degrees
  rainIntensity: number; // 0.0 to 1.0 (0% to 100% wet saturation)
}

export interface FabricWeatherReport {
  fabricName: string;
  weightGsm: number;
  thicknessLabel: string;
  drapeIndex: number; // 0 - 100
  drapeScore: number; // 0 - 100
  stiffnessScore: number; // 0 - 100
  windResponseLabel: string;
  rainResponseLabel: string;
  windBehaviorText: string;
  rainBehaviorText: string;
  weatherVerdict: string;
}

export interface PoseAiGenerationResult {
  poseTitle: string;
  explanation: string;
  isSeated: boolean;
  rotations: JointRotationMap;
  source: 'gemini_ai' | 'biomechanical_engine';
}

export type ColorHarmonyScheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split_complementary'
  | 'monochromatic';

export interface ColorPaletteSwatch {
  role: string;
  name: string;
  hex: string;
}

export interface ColorPaletteSuggestion {
  id: string;
  scheme: ColorHarmonyScheme;
  schemeLabel: string;
  paletteName: string;
  theoryExplanation: string;
  topColorHex: string;
  outerwearColorHex: string;
  bottomColorHex: string;
  footwearColorHex: string;
  accessoryColorHex: string;
  accessoryMetalHex: string;
  swatches: ColorPaletteSwatch[];
}

export interface ColorPaletteAiResult {
  anchorColorHex: string;
  anchorCategoryLabel: string;
  source: 'gemini_ai' | 'color_theory_engine';
  palettes: ColorPaletteSuggestion[];
}

export interface UploadMatchedOutfitSuggestion {
  id: string;
  title: string;
  styleTag: string;
  harmonyNote: string;
  anchorLayer: 'top' | 'outerwear' | 'bottom';
  anchorName: string;
  outfit: OutfitConfiguration;
}

export interface WeatherGroundingSource {
  title: string;
  uri: string;
}

export interface RealWeatherForecast {
  locationName: string;
  temperatureC: number;
  feelsLikeC: number;
  conditionText: string;
  humidityPercent: number;
  windSpeedKmh: number;
  isRainy: boolean;
  isCold: boolean;
  weatherCategory: 'rainy_cold' | 'rainy' | 'cold' | 'cool' | 'mild' | 'hot';
  stylistWeatherAdvice: string;
  recommendedWeatherMode: WeatherMode;
  searchSources: WeatherGroundingSource[];
  updatedAt: string;
}

export interface AiStylistLookbookRecommendation {
  id: string;
  title: string;
  trendId: FashionTrendId;
  trendName: string;
  seasonTag: string;
  styleCompatibilityScore: number;
  savedStyleMatchReason: string;
  trendAnalysis: string;
  imagePrompt: string;
  lookbookImageUrl: string;
  recommendedPose: PosePresetId;
  outfit: OutfitConfiguration;
  weatherBadge?: string;
  isWeatherPrioritized?: boolean;
}

export interface AiStylistResponse {
  userStyleProfileSummary: string;
  dominantSavedColors: string[];
  dominantSavedFabrics: string[];
  source: 'gemini_image_stylist' | 'fashion_trend_engine';
  recommendations: AiStylistLookbookRecommendation[];
  weatherForecast?: RealWeatherForecast | null;
}

