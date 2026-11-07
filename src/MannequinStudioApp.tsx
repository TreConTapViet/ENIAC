import type { WeatherContextData } from './types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  BookmarkPlus,
  Camera,
  Columns2,
  History,
  Loader2,
  Palette,
  RotateCw,
  Send,
  Shirt,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ActiveDockTab,
  BodyMeasurements,
  BottomStyleId,
  CameraPresetId,
  DressStyleId,
  EulerDegrees,
  ExtractedGarmentItem,
  FabricType,
  FitEase,
  FootwearStyleId,
  GenderProfile,
  HairstyleId,
  HandbagStyleId,
  HatStyleId,
  JointId,
  JointRotationMap,
  OuterwearStyleId,
  OutfitConfiguration,
  OutfitHistoryEntry,
  PoseAiGenerationResult,
  PosePresetId,
  PropStyleId,
  StudioLightingId,
  SunglassesStyleId,
  TopStyleId,
  WatchStyleId,
  WeatherEffectConfig,
} from './types/studio';
import {
  ACCESSORY_LEATHER_SWATCHES,
  ACCESSORY_METAL_SWATCHES,
  analyzeAndTransformUploadedGarment,
  analyzeBodyAndGarmentFit,
  BOTTOM_STYLES,
  CROQUIS_SIGNATURE_ROTATIONS,
  DEFAULT_ACCESSORIES,
  DEFAULT_BODY_MEASUREMENTS,
  DEFAULT_OUTFIT,
  DEFAULT_WEATHER_EFFECT,
  deriveMeasurementsFromHeightWeight,
  DRESS_STYLES,
  EYE_LENS_SWATCHES,
  extractGarmentsFromPhoto,
  FASHION_SWATCHES,
  FOOTWEAR_STYLES,
  generatePoseFromNaturalLanguage,
  getUploadMatchedOutfitRecommendations,
  HAIR_COLOR_SWATCHES,
  HAIRSTYLE_OPTIONS,
  HANDBAG_STYLES,
  HAT_STYLES,
  LIPSTICK_SWATCHES,
  MAKEUP_PRESETS,
  OUTERWEAR_STYLES,
  POSE_AI_SUGGESTION_PROMPTS,
  POSE_PRESETS,
  PROP_STYLES,
  SUGGESTED_OUTFIT_PRESETS,
  SUNGLASSES_LENS_SWATCHES,
  SUNGLASSES_STYLES,
  synthesizeColorPalettesFromOutfit,
  TOP_STYLES,
  WATCH_STYLES,
  ZERO_JOINT_ROTATIONS,
} from './data/presets';
import { TopStudioBar } from './components/TopStudioBar';
import { MannequinViewport } from './components/MannequinViewport';
import { BottomControlDock } from './components/BottomControlDock';
import { Garment360Preview } from './components/Garment360Preview';

const TEMP_HISTORY_STORAGE_KEY = 'smart_wardrobe_temp_outfit_history_v1';

function cloneOutfitConfig(cfg: OutfitConfiguration): OutfitConfiguration {
  return {
    selectedSize: cfg.selectedSize,
    hideAllGarments: cfg.hideAllGarments,
    top: {
      ...cfg.top,
      uploadedCutoutParams: cfg.top.uploadedCutoutParams
        ? [...cfg.top.uploadedCutoutParams]
        : undefined,
    },
    dress: cfg.dress
      ? {
          ...cfg.dress,
          uploadedCutoutParams: cfg.dress.uploadedCutoutParams
            ? [...cfg.dress.uploadedCutoutParams]
            : undefined,
        }
      : undefined,
    outerwear: {
      ...cfg.outerwear,
      uploadedCutoutParams: cfg.outerwear.uploadedCutoutParams
        ? [...cfg.outerwear.uploadedCutoutParams]
        : undefined,
    },
    bottom: {
      ...cfg.bottom,
      uploadedCutoutParams: cfg.bottom.uploadedCutoutParams
        ? [...cfg.bottom.uploadedCutoutParams]
        : undefined,
    },
    footwear: { ...cfg.footwear },
    accessories: cfg.accessories
      ? {
          watch: { ...cfg.accessories.watch },
          handbag: { ...cfg.accessories.handbag },
          sunglasses: { ...cfg.accessories.sunglasses },
          hat: cfg.accessories.hat ? { ...cfg.accessories.hat } : undefined,
          prop: cfg.accessories.prop ? { ...cfg.accessories.prop } : undefined,
        }
      : undefined,
  };
}

function summarizeOutfitLabel(cfg: OutfitConfiguration): string {
  if (cfg.hideAllGarments) return 'Không mặc trang phục';
  const parts: string[] = [];
  if (cfg.outerwear.styleId !== 'none') {
    const owName =
      cfg.outerwear.transformedSummary ||
      OUTERWEAR_STYLES.find((o) => o.id === cfg.outerwear.styleId)?.name ||
      'Áo khoác';
    parts.push(owName);
  }
  if (cfg.dress && cfg.dress.styleId !== 'none') {
    const dressName =
      cfg.dress.transformedSummary ||
      DRESS_STYLES.find((d) => d.id === cfg.dress?.styleId)?.name ||
      'Đầm liền';
    parts.push(dressName);
  } else {
    if (cfg.top.styleId !== 'none') {
      const topName =
        cfg.top.transformedSummary ||
        TOP_STYLES.find((t) => t.id === cfg.top.styleId)?.name ||
        'Áo';
      parts.push(topName);
    }
    if (cfg.bottom.styleId !== 'none') {
      const botName =
        cfg.bottom.transformedSummary ||
        BOTTOM_STYLES.find((b) => b.id === cfg.bottom.styleId)?.name ||
        'Quần/Váy';
      parts.push(botName);
    }
  }
  return parts.length > 0 ? parts.slice(0, 2).join(' + ') : 'Phối đồ cơ bản';
}

const AI_SUFFIX = / \(Đã tách nền AI\)$/;

/** Tên từng món đang mặc, dùng khi lưu bộ đồ vào Lịch sử phối đồ của app */
function listOutfitPieces(cfg: OutfitConfiguration): string[] {
  if (cfg.hideAllGarments) return [];
  const pieceName = (
    layer: { styleId: string; uploadedName?: string } | undefined,
    styles: { id: string; name: string }[]
  ) =>
    layer && layer.styleId !== 'none'
      ? layer.uploadedName || styles.find((s) => s.id === layer.styleId)?.name || null
      : null;
  const hasDress = Boolean(cfg.dress && cfg.dress.styleId !== 'none');
  return [
    pieceName(cfg.outerwear, OUTERWEAR_STYLES),
    hasDress ? pieceName(cfg.dress, DRESS_STYLES) : pieceName(cfg.top, TOP_STYLES),
    hasDress ? null : pieceName(cfg.bottom, BOTTOM_STYLES),
    pieceName(cfg.footwear, FOOTWEAR_STYLES),
  ].filter((n): n is string => Boolean(n));
}

export interface StudioSavedOutfit {
  title: string;
  items: string[];
  scoreLabel: string;
}

export interface MannequinStudioAppProps {
  /** Nhúng trong app: co theo khung chứa, bỏ tên thương hiệu và lưu ý trùng với app */
  embedded?: boolean;
  /** Số đo lấy từ hồ sơ người dùng */
  initialBody?: Partial<BodyMeasurements>;
  /** Món đồ trong tủ của người dùng, đã chuyển sang dạng studio mặc được */
  wardrobeGarments?: ExtractedGarmentItem[];
  /** Mặc ngay các món này khi chúng thay đổi (ướm thử từ Tủ đồ / Gợi ý) */
  tryOnGarments?: ExtractedGarmentItem[];
  /** Gọi khi bấm "Lưu phối đồ": app ghi vào Lịch sử phối đồ */
  onSaveOutfit?: (saved: StudioSavedOutfit) => void;
  /** Thời tiết thật của app: đổi hiệu ứng mưa/gió trong cảnh 3D và hiện ở thanh trên studio */
  weatherContext?: WeatherContextData;
}

export default function App({
  embedded = false,
  weatherContext,
  initialBody,
  wardrobeGarments,
  tryOnGarments,
  onSaveOutfit,
}: MannequinStudioAppProps = {}) {
  const [activeTab, setActiveTab] = useState<ActiveDockTab>('body');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(true);

  // 1. User Body Measurements State
  const [body, setBody] = useState<BodyMeasurements>(DEFAULT_BODY_MEASUREMENTS);

  // 2. Multi-Layer Outfit & PBR Fabric State
  const [outfit, setOutfit] = useState<OutfitConfiguration>(DEFAULT_OUTFIT);

  // 2b. Temporary Outfit History Memory State (for quick comparison)
  const [outfitHistory, setOutfitHistory] = useState<OutfitHistoryEntry[]>(
    () => {
      try {
        const raw = sessionStorage.getItem(TEMP_HISTORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // Ignore sessionStorage errors
      }
      return [];
    }
  );
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeHistoryIdB, setActiveHistoryIdB] = useState<string | null>(null);
  const [isSplitCompareMode, setIsSplitCompareMode] = useState<boolean>(false);
  const [compareOutfitB, setCompareOutfitB] =
    useState<OutfitConfiguration | null>(null);

  // 3. Pose Preset & 17-Joint Euler Rotation State (Default: Symmetric T-Pose centered in viewport)
  const [posePreset, setPosePreset] = useState<PosePresetId>('stand_still');
  const [selectedJoint, setSelectedJoint] = useState<JointId>('rightShoulder');
  const [jointRotations, setJointRotations] = useState<JointRotationMap>(() => ({
    ...ZERO_JOINT_ROTATIONS,
  }));

  // 4. Camera & Studio Lighting Presets
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('full_front');
  const [cameraResetTrigger, setCameraResetTrigger] = useState<number>(0);
  const [lightingPreset, setLightingPreset] =
    useState<StudioLightingId>('daylight_studio');
  const [showMeasurementTape, setShowMeasurementTape] = useState<boolean>(false);
  const [isArMode, setIsArMode] = useState<boolean>(false);
  const [isQuickUploading, setIsQuickUploading] = useState<boolean>(false);
  const quickUploadRef = useRef<HTMLInputElement | null>(null);

  // 5. Environmental Weather Effects (Wind & Rain) & Pose AI Generator State
  const [weatherEffect, setWeatherEffect] = useState<WeatherEffectConfig>(
    DEFAULT_WEATHER_EFFECT
  );

  // Đồng bộ hiệu ứng thời tiết 3D với thời tiết thật của app (chuyển từ commit 52d16c7 của nhóm)
  useEffect(() => {
    if (!weatherContext) return;
    const cond = (weatherContext.condition || '').toLowerCase();
    if (cond.includes('mưa') || cond.includes('dông') || weatherContext.seasonMatch === 'Mưa') {
      setWeatherEffect({ mode: 'rain', windIntensity: 35, windDirectionDeg: 45, rainIntensity: 45 });
    } else if (cond.includes('gió') || cond.includes('bão')) {
      setWeatherEffect({ mode: 'wind', windIntensity: 55, windDirectionDeg: 45, rainIntensity: 0 });
    } else {
      setWeatherEffect({ mode: 'clear', windIntensity: 12, windDirectionDeg: 0, rainIntensity: 0 });
    }
  }, [weatherContext?.condition, weatherContext?.seasonMatch]);
  const [isGeneratingPose, setIsGeneratingPose] = useState<boolean>(false);
  const [lastAiPoseResult, setLastAiPoseResult] =
    useState<PoseAiGenerationResult | null>(null);
  const [quickPosePrompt, setQuickPosePrompt] = useState<string>('');

  // 6. Triggers for Video Walkthrough 360°, 3D Model Export (.GLB / .USDZ), and Outfit History Drawer
  const [videoWalkthroughTrigger, setVideoWalkthroughTrigger] =
    useState<number>(0);
  const [exportGlbTrigger, setExportGlbTrigger] = useState<number>(0);
  const [exportUsdzTrigger, setExportUsdzTrigger] = useState<number>(0);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isScoreDetailOpen, setIsScoreDetailOpen] = useState<boolean>(false);

  // 7. Uploaded Garments Inventory + Automatic 360° Garment Preview & Shuffle State
  const [uploadedGarmentsInventory, setUploadedGarmentsInventory] = useState<
    ExtractedGarmentItem[]
  >([]);
  const [active360GarmentId, setActive360GarmentId] = useState<string | null>(
    null
  );
  const [is360GarmentPreviewOpen, setIs360GarmentPreviewOpen] =
    useState<boolean>(false);
  const [shuffleStatusToast, setShuffleStatusToast] = useState<string | null>(
    null
  );

  const quickColorPalettes = useMemo(
    () => synthesizeColorPalettesFromOutfit(outfit),
    [outfit]
  );

  const quickUploadRecommendations = useMemo(
    () => getUploadMatchedOutfitRecommendations(outfit, body.genderProfile),
    [outfit, body.genderProfile]
  );

  const hasUploadedPiece = Boolean(
    outfit.dress?.uploadedName ||
      outfit.dress?.transformedSummary ||
      outfit.outerwear.uploadedName ||
      outfit.outerwear.transformedSummary ||
      outfit.top.uploadedName ||
      outfit.top.transformedSummary ||
      outfit.bottom.uploadedName ||
      outfit.bottom.transformedSummary ||
      uploadedGarmentsInventory.length > 0
  );

  const handleRegisterUploadedGarments = useCallback(
    (newItems: ExtractedGarmentItem[], autoOpen360 = true) => {
      if (!newItems || newItems.length === 0) return;
      setUploadedGarmentsInventory((prev) => {
        const newIds = new Set(newItems.map((it) => it.id));
        return [...newItems, ...prev.filter((p) => !newIds.has(p.id))].slice(
          0,
          16
        );
      });
      setActive360GarmentId(newItems[0].id);
      if (autoOpen360) {
        setIs360GarmentPreviewOpen(true);
      }
    },
    []
  );

  const handleOpenGarment360Preview = useCallback(
    (item?: ExtractedGarmentItem) => {
      if (item) {
        setUploadedGarmentsInventory((prev) => {
          const exists = prev.some((p) => p.id === item.id);
          return exists ? prev : [item, ...prev].slice(0, 16);
        });
        setActive360GarmentId(item.id);
      }
      setIs360GarmentPreviewOpen(true);
    },
    []
  );

  const handleApplySingleExtractedGarment = useCallback(
    (item: ExtractedGarmentItem) => {
      if (item.category === 'hair') {
        setBody((b) => ({
          ...b,
          hairstyleId:
            (item.styleId as HairstyleId) ||
            (b.genderProfile === 'male' ? 'male_vec_comma_part' : 'long_wavy'),
          hairColorHex: item.colorHex || b.hairColorHex,
        }));
        return;
      }

      setOutfit((prev) => {
        const currentAcc = prev.accessories || DEFAULT_ACCESSORIES;
        const nextAcc = {
          ...DEFAULT_ACCESSORIES,
          ...currentAcc,
          watch: { ...DEFAULT_ACCESSORIES.watch, ...currentAcc.watch },
          handbag: { ...DEFAULT_ACCESSORIES.handbag, ...currentAcc.handbag },
          sunglasses: {
            ...DEFAULT_ACCESSORIES.sunglasses,
            ...currentAcc.sunglasses,
          },
          hat: {
            ...(DEFAULT_ACCESSORIES.hat || {
              styleId: 'none' as HatStyleId,
              colorHex: '#18181B',
              trimColorHex: '#D4AF37',
            }),
            ...(currentAcc.hat || {}),
          },
          prop: {
            ...(DEFAULT_ACCESSORIES.prop || {
              styleId: 'none' as PropStyleId,
              colorHex: '#1E293B',
              secondaryColorHex: '#D4AF37',
              handSide: 'auto' as const,
            }),
            ...(currentAcc.prop || {}),
          },
        };

        const next: OutfitConfiguration = {
          ...prev,
          hideAllGarments: false,
          accessories: nextAcc,
          dress: prev.dress || {
            styleId: 'none',
            colorHex: '#9F1239',
            fabric: 'silk',
            weavePattern: 'solid',
            fitEase: 'regular',
          },
        };
        if (item.category === 'dress') {
          if (body.genderProfile !== 'female') {
            setBody((b) => ({ ...b, genderProfile: 'female' }));
          }
          next.dress = {
            styleId: (item.styleId as DressStyleId) || 'silk_slip_evening_dress',
            colorHex: item.colorHex,
            secondaryColorHex: item.secondaryColorHex,
            fabric: item.fabric,
            weavePattern: item.weavePattern,
            fitEase: item.fitEase,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
            uploadedCutoutParams: item.uploadedCutoutParams,
          };
          next.top = { ...next.top, styleId: 'none' };
          next.bottom = { ...next.bottom, styleId: 'none' };
        } else if (item.category === 'top') {
          next.top = {
            ...next.top,
            styleId: (item.styleId as TopStyleId) || 'baby_tee',
            colorHex: item.colorHex,
            secondaryColorHex: item.secondaryColorHex,
            fabric: item.fabric,
            weavePattern: item.weavePattern,
            fitEase: item.fitEase,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
            uploadedCutoutParams: item.uploadedCutoutParams,
          };
          if (next.dress) next.dress = { ...next.dress, styleId: 'none' };
        } else if (item.category === 'outerwear') {
          next.outerwear = {
            ...next.outerwear,
            styleId: (item.styleId as OuterwearStyleId) || 'tailored_blazer',
            colorHex: item.colorHex,
            secondaryColorHex: item.secondaryColorHex,
            fabric: item.fabric,
            weavePattern: item.weavePattern,
            fitEase: item.fitEase,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
            uploadedCutoutParams: item.uploadedCutoutParams,
          };
        } else if (item.category === 'bottom') {
          next.bottom = {
            ...next.bottom,
            styleId: (item.styleId as BottomStyleId) || 'slim_jeans',
            colorHex: item.colorHex,
            secondaryColorHex: item.secondaryColorHex,
            fabric: item.fabric,
            weavePattern: item.weavePattern,
            fitEase: item.fitEase,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
            uploadedCutoutParams: item.uploadedCutoutParams,
          };
          if (next.dress) next.dress = { ...next.dress, styleId: 'none' };
        } else if (item.category === 'footwear') {
          next.footwear = {
            ...next.footwear,
            styleId: (item.styleId as FootwearStyleId) || 'minimal_sneakers',
            colorHex: item.colorHex,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
          };
        } else if (item.category === 'hat') {
          nextAcc.hat = {
            styleId: (item.styleId as HatStyleId) || 'baseball_cap',
            colorHex: item.colorHex || '#18181B',
            trimColorHex: item.secondaryColorHex || '#D4AF37',
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
          };
        } else if (item.category === 'sunglasses') {
          nextAcc.sunglasses = {
            ...nextAcc.sunglasses,
            styleId: (item.styleId as SunglassesStyleId) || 'classic_aviator',
            frameColorHex: item.colorHex || '#D4AF37',
            lensColorHex: item.secondaryColorHex || '#1E293B',
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
          };
        } else if (item.category === 'watch') {
          nextAcc.watch = {
            ...nextAcc.watch,
            styleId: (item.styleId as WatchStyleId) || 'luxury_chronograph',
            caseColorHex: item.secondaryColorHex || '#D4AF37',
            strapColorHex: item.colorHex || '#1E293B',
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
          };
        } else if (item.category === 'handbag') {
          nextAcc.handbag = {
            ...nextAcc.handbag,
            styleId: (item.styleId as HandbagStyleId) || 'paris_saddle_bag',
            colorHex: item.colorHex || '#7F1D1D',
            hardwareColorHex: item.secondaryColorHex || '#D4AF37',
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
          };
        } else if (item.category === 'prop') {
          nextAcc.prop = {
            styleId: (item.styleId as PropStyleId) || 'luxury_umbrella',
            colorHex: item.colorHex || '#1E293B',
            secondaryColorHex: item.secondaryColorHex || '#D4AF37',
            handSide: 'auto',
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
          };
        }
        return next;
      });
      setActiveHistoryId(null);
    },
    [body.genderProfile]
  );

  // Random Outfit Shuffle: Combines available preset inventory AND current uploaded pieces
  const handleRandomOutfitShuffle = useCallback(() => {
    const pickRandom = <T,>(arr: T[]): T =>
      arr[Math.floor(Math.random() * arr.length)];

    const isMale = body.genderProfile === 'male';
    const validTops = TOP_STYLES.filter(
      (s) =>
        s.id !== 'none' &&
        (s.genderHint === (isMale ? 'male' : 'female') ||
          s.genderHint === 'unisex')
    );
    const validBottoms = BOTTOM_STYLES.filter(
      (s) =>
        s.id !== 'none' &&
        (s.genderHint === (isMale ? 'male' : 'female') ||
          s.genderHint === 'unisex')
    );
    const validDresses = DRESS_STYLES.filter((s) => s.id !== 'none');
    const validOuterwear = OUTERWEAR_STYLES.filter((s) => s.id !== 'none');
    const validFootwear = FOOTWEAR_STYLES.filter((s) => s.id !== 'none');

    // Gather uploaded items by category (including any currently worn uploaded piece)
    const uploadedTops = uploadedGarmentsInventory.filter(
      (i) => i.category === 'top'
    );
    const uploadedDresses = uploadedGarmentsInventory.filter(
      (i) => i.category === 'dress'
    );
    const uploadedOuters = uploadedGarmentsInventory.filter(
      (i) => i.category === 'outerwear'
    );
    const uploadedBottoms = uploadedGarmentsInventory.filter(
      (i) => i.category === 'bottom'
    );
    const uploadedShoes = uploadedGarmentsInventory.filter(
      (i) => i.category === 'footwear'
    );

    const fabricChoices: FabricType[] = [
      'cotton',
      'silk',
      'denim',
      'leather',
      'fleece',
      'linen',
    ];
    const easeChoices: FitEase[] = ['slim', 'regular', 'oversized'];

    // Decide whether to wear a One-Piece Dress (Female only) or Top + Bottom
    const canWearDress = !isMale && validDresses.length > 0;
    const useDressMode =
      canWearDress &&
      (uploadedDresses.length > 0
        ? Math.random() < 0.45
        : Math.random() < 0.28);

    const usedUploadedNames: string[] = [];

    // 1. Dress Layer
    let nextDress: NonNullable<OutfitConfiguration['dress']> = {
      styleId: 'none',
      colorHex: '#9F1239',
      fabric: 'silk',
      weavePattern: 'solid',
      fitEase: 'regular',
    };

    // 2. Top Layer
    let nextTop: OutfitConfiguration['top'] = {
      ...outfit.top,
    };

    // 3. Bottom Layer
    let nextBottom: OutfitConfiguration['bottom'] = {
      ...outfit.bottom,
    };

    if (useDressMode) {
      const useUploadedDress =
        uploadedDresses.length > 0 && Math.random() < 0.72;
      if (useUploadedDress) {
        const upDress = pickRandom(uploadedDresses);
        usedUploadedNames.push(upDress.vietnameseName);
        nextDress = {
          styleId: (upDress.styleId as DressStyleId) || 'silk_slip_evening_dress',
          colorHex: upDress.colorHex,
          secondaryColorHex: upDress.secondaryColorHex,
          fabric: upDress.fabric,
          weavePattern: upDress.weavePattern,
          fitEase: upDress.fitEase,
          uploadedName: upDress.vietnameseName,
          transformedSummary: `${upDress.vietnameseName} · Đã tách nền AI`,
          previewThumbUrl: upDress.previewThumbUrl,
          uploadedTextureUrl: upDress.uploadedTextureUrl,
          uploadedCutoutParams: upDress.uploadedCutoutParams,
        };
      } else {
        const presetDress = pickRandom(validDresses);
        const swatch = pickRandom(FASHION_SWATCHES);
        nextDress = {
          styleId: presetDress.id as DressStyleId,
          colorHex: Math.random() < 0.4 ? presetDress.defaultColor : swatch.hex,
          fabric: presetDress.defaultFabric,
          weavePattern: 'solid',
          fitEase: pickRandom(easeChoices),
        };
      }
      nextTop = { ...nextTop, styleId: 'none' };
      nextBottom = { ...nextBottom, styleId: 'none' };
    } else {
      // Top + Bottom combination
      const useUploadedTop = uploadedTops.length > 0 && Math.random() < 0.68;
      if (useUploadedTop) {
        const upTop = pickRandom(uploadedTops);
        usedUploadedNames.push(upTop.vietnameseName);
        nextTop = {
          styleId: (upTop.styleId as TopStyleId) || 'baby_tee',
          colorHex: upTop.colorHex,
          secondaryColorHex: upTop.secondaryColorHex,
          fabric: upTop.fabric,
          weavePattern: upTop.weavePattern,
          fitEase: upTop.fitEase,
          uploadedName: upTop.vietnameseName,
          transformedSummary: `${upTop.vietnameseName} · Đã tách nền AI`,
          previewThumbUrl: upTop.previewThumbUrl,
          uploadedTextureUrl: upTop.uploadedTextureUrl,
          uploadedCutoutParams: upTop.uploadedCutoutParams,
        };
      } else {
        const presetTop = pickRandom(validTops);
        const swatch = pickRandom(FASHION_SWATCHES);
        nextTop = {
          styleId: presetTop.id as TopStyleId,
          colorHex: Math.random() < 0.35 ? presetTop.defaultColor : swatch.hex,
          fabric:
            Math.random() < 0.6
              ? presetTop.defaultFabric
              : pickRandom(fabricChoices),
          weavePattern: 'solid',
          fitEase: pickRandom(easeChoices),
          uploadedName: undefined,
          transformedSummary: undefined,
          previewThumbUrl: undefined,
          uploadedTextureUrl: undefined,
          uploadedCutoutParams: undefined,
        };
      }

      const useUploadedBottom =
        uploadedBottoms.length > 0 && Math.random() < 0.68;
      if (useUploadedBottom) {
        const upBot = pickRandom(uploadedBottoms);
        usedUploadedNames.push(upBot.vietnameseName);
        nextBottom = {
          styleId: (upBot.styleId as BottomStyleId) || 'slim_jeans',
          colorHex: upBot.colorHex,
          secondaryColorHex: upBot.secondaryColorHex,
          fabric: upBot.fabric,
          weavePattern: upBot.weavePattern,
          fitEase: upBot.fitEase,
          uploadedName: upBot.vietnameseName,
          transformedSummary: `${upBot.vietnameseName} · Đã tách nền AI`,
          previewThumbUrl: upBot.previewThumbUrl,
          uploadedTextureUrl: upBot.uploadedTextureUrl,
          uploadedCutoutParams: upBot.uploadedCutoutParams,
        };
      } else {
        const presetBot = pickRandom(validBottoms);
        const swatch = pickRandom(FASHION_SWATCHES);
        nextBottom = {
          styleId: presetBot.id as BottomStyleId,
          colorHex: Math.random() < 0.4 ? presetBot.defaultColor : swatch.hex,
          fabric:
            Math.random() < 0.65
              ? presetBot.defaultFabric
              : pickRandom(fabricChoices),
          weavePattern: 'solid',
          fitEase: pickRandom(easeChoices),
          uploadedName: undefined,
          transformedSummary: undefined,
          previewThumbUrl: undefined,
          uploadedTextureUrl: undefined,
          uploadedCutoutParams: undefined,
        };
      }
    }

    // 4. Outerwear Layer (55% chance to wear outerwear, higher if uploaded outerwear exists)
    let nextOuterwear: OutfitConfiguration['outerwear'] = {
      ...outfit.outerwear,
      styleId: 'none',
      uploadedName: undefined,
      transformedSummary: undefined,
      previewThumbUrl: undefined,
      uploadedTextureUrl: undefined,
      uploadedCutoutParams: undefined,
    };
    const shouldIncludeOuterwear =
      uploadedOuters.length > 0 ? Math.random() < 0.72 : Math.random() < 0.52;
    if (shouldIncludeOuterwear) {
      if (uploadedOuters.length > 0 && Math.random() < 0.68) {
        const upOuter = pickRandom(uploadedOuters);
        usedUploadedNames.push(upOuter.vietnameseName);
        nextOuterwear = {
          styleId: (upOuter.styleId as OuterwearStyleId) || 'tailored_blazer',
          colorHex: upOuter.colorHex,
          secondaryColorHex: upOuter.secondaryColorHex,
          fabric: upOuter.fabric,
          weavePattern: upOuter.weavePattern,
          fitEase: upOuter.fitEase,
          uploadedName: upOuter.vietnameseName,
          transformedSummary: `${upOuter.vietnameseName} · Đã tách nền AI`,
          previewThumbUrl: upOuter.previewThumbUrl,
          uploadedTextureUrl: upOuter.uploadedTextureUrl,
          uploadedCutoutParams: upOuter.uploadedCutoutParams,
        };
      } else {
        const presetOuter = pickRandom(validOuterwear);
        const swatch = pickRandom(FASHION_SWATCHES);
        nextOuterwear = {
          styleId: presetOuter.id as OuterwearStyleId,
          colorHex: Math.random() < 0.45 ? presetOuter.defaultColor : swatch.hex,
          fabric: presetOuter.defaultFabric,
          weavePattern: 'solid',
          fitEase: pickRandom(easeChoices),
          uploadedName: undefined,
          transformedSummary: undefined,
          previewThumbUrl: undefined,
          uploadedTextureUrl: undefined,
          uploadedCutoutParams: undefined,
        };
      }
    }

    // 5. Footwear Layer
    let nextFootwear: OutfitConfiguration['footwear'];
    if (uploadedShoes.length > 0 && Math.random() < 0.65) {
      const upShoe = pickRandom(uploadedShoes);
      usedUploadedNames.push(upShoe.vietnameseName);
      nextFootwear = {
        styleId: (upShoe.styleId as FootwearStyleId) || 'minimal_sneakers',
        colorHex: upShoe.colorHex,
        uploadedName: upShoe.vietnameseName,
        transformedSummary: `${upShoe.vietnameseName} · Đã tách nền AI`,
        previewThumbUrl: upShoe.previewThumbUrl,
      };
    } else {
      const presetShoe = pickRandom(validFootwear);
      const swatch = pickRandom(FASHION_SWATCHES);
      nextFootwear = {
        styleId: presetShoe.id as FootwearStyleId,
        colorHex: Math.random() < 0.5 ? presetShoe.defaultColor : swatch.hex,
      };
    }

    // 6. Accessories Layer
    const currentAcc = outfit.accessories || DEFAULT_ACCESSORIES;
    const validWatches = WATCH_STYLES.filter((w) => w.id !== 'none');
    const validBags = HANDBAG_STYLES.filter((b) => b.id !== 'none');
    const validGlasses = SUNGLASSES_STYLES.filter((g) => g.id !== 'none');

    const pickedWatch =
      Math.random() < 0.75 ? pickRandom(validWatches).id : 'none';
    const pickedBag =
      Math.random() < (isMale ? 0.35 : 0.68)
        ? pickRandom(validBags).id
        : 'none';
    const pickedGlasses =
      Math.random() < 0.45 ? pickRandom(validGlasses).id : 'none';

    const nextOutfit: OutfitConfiguration = {
      ...outfit,
      hideAllGarments: false,
      dress: nextDress,
      top: nextTop,
      outerwear: nextOuterwear,
      bottom: nextBottom,
      footwear: nextFootwear,
      accessories: {
        ...currentAcc,
        watch: {
          ...currentAcc.watch,
          styleId: pickedWatch,
          caseColorHex: pickRandom(ACCESSORY_METAL_SWATCHES).hex,
          strapColorHex: pickRandom(ACCESSORY_LEATHER_SWATCHES).hex,
        },
        handbag: {
          ...currentAcc.handbag,
          styleId: pickedBag,
          colorHex: pickRandom(ACCESSORY_LEATHER_SWATCHES).hex,
          hardwareColorHex: pickRandom(ACCESSORY_METAL_SWATCHES).hex,
        },
        sunglasses: {
          ...currentAcc.sunglasses,
          styleId: pickedGlasses,
          frameColorHex: pickRandom(ACCESSORY_METAL_SWATCHES).hex,
          lensColorHex: pickRandom(SUNGLASSES_LENS_SWATCHES).hex,
        },
      },
    };

    setOutfit(nextOutfit);
    setActiveHistoryId(null);

    const summary = summarizeOutfitLabel(nextOutfit);
    const uploadNote =
      usedUploadedNames.length > 0
        ? ` (Kết hợp đồ đã Upload: ${usedUploadedNames.join(', ')})`
        : '';
    setShuffleStatusToast(`🎲 Đã phối ngẫu nhiên: ${summary}${uploadNote}`);
    setTimeout(() => {
      setShuffleStatusToast((prev) =>
        prev?.includes(summary) ? null : prev
      );
    }, 4200);
  }, [body.genderProfile, outfit, uploadedGarmentsInventory]);

  const handleUpdateHeightWeight = useCallback(
    (heightCm: number, weightKg: number, nextGender?: GenderProfile) => {
      const clampedH = Math.min(300, Math.max(100, heightCm));
      const clampedW = Math.min(500, Math.max(20, weightKg));

      setBody((prev) => {
        const isGenderChanged = nextGender && nextGender !== prev.genderProfile;
        const gender = nextGender ?? prev.genderProfile;

        const targetHeight = isGenderChanged
          ? gender === 'male'
            ? 178
            : gender === 'female'
            ? 168
            : 173
          : clampedH;
        const targetWeight = isGenderChanged
          ? gender === 'male'
            ? 72
            : gender === 'female'
            ? 52
            : 62
          : clampedW;

        const nextHairstyle = isGenderChanged
          ? gender === 'male'
            ? 'male_vec_comma_part'
            : gender === 'female'
            ? 'long_wavy'
            : 'shoulder_bob'
          : prev.hairstyleId;

        const derived = deriveMeasurementsFromHeightWeight(
          targetHeight,
          targetWeight,
          gender
        );
        return {
          ...prev,
          genderProfile: gender,
          heightCm: targetHeight,
          weightKg: targetWeight,
          hairstyleId: nextHairstyle,
          ...derived,
        };
      });

      if (nextGender === 'male') {
        setOutfit((prev) => ({
          ...prev,
          top: {
            styleId: 'oxford_shirt',
            fabric: 'cotton',
            colorHex: '#F8FAFC',
            fitEase: 'regular',
          },
          outerwear: {
            styleId: 'none',
            fabric: 'fleece',
            colorHex: '#1E293B',
            fitEase: 'regular',
          },
          bottom: {
            styleId: 'male_dress_trousers',
            fabric: 'fleece',
            colorHex: '#1E293B',
            fitEase: 'regular',
          },
          footwear: {
            styleId: 'penny_loafers',
            colorHex: '#78350F',
          },
          selectedSize: 'L',
        }));
      } else if (nextGender === 'female') {
        setOutfit((prev) => ({
          ...prev,
          top: {
            styleId: 'silk_blouse_bow',
            fabric: 'silk',
            colorHex: '#F3EFE6',
            fitEase: 'slim',
          },
          outerwear: {
            styleId: 'none',
            fabric: 'fleece',
            colorHex: '#1E293B',
            fitEase: 'regular',
          },
          bottom: {
            styleId: 'slim_jeans',
            fabric: 'denim',
            colorHex: '#2B4C7E',
            fitEase: 'slim',
          },
          footwear: {
            styleId: 'minimal_sneakers',
            colorHex: '#F8FAFC',
          },
          selectedSize: 'S',
        }));
      }
    },
    []
  );

  // Số đo từ hồ sơ: đổi giới tính trước (studio tự đặt dáng chuẩn), rồi mới áp chiều cao/cân nặng
  // để giữ nguyên logic suy ra số đo tay/chân của studio
  const initialBodyKey = initialBody ? JSON.stringify(initialBody) : '';
  useEffect(() => {
    if (!initialBody) return;
    const gender = initialBody.genderProfile;
    if (gender) {
      handleUpdateHeightWeight(
        DEFAULT_BODY_MEASUREMENTS.heightCm,
        DEFAULT_BODY_MEASUREMENTS.weightKg,
        gender
      );
    }
    if (initialBody.heightCm || initialBody.weightKg) {
      handleUpdateHeightWeight(
        initialBody.heightCm ?? (gender === 'male' ? 178 : 168),
        initialBody.weightKg ?? (gender === 'male' ? 72 : 52)
      );
    }
    const { chestCm, waistCm, hipCm } = initialBody;
    if (chestCm || waistCm || hipCm) {
      setBody((prev) => ({
        ...prev,
        ...(chestCm ? { chestCm } : {}),
        ...(waistCm ? { waistCm } : {}),
        ...(hipCm ? { hipCm } : {}),
      }));
    }
    // initialBodyKey thay cho initialBody để không chạy lại khi app tạo object mới cùng nội dung
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBodyKey, handleUpdateHeightWeight]);

  // Tủ đồ của người dùng → kho đồ của studio (giữ cả đồ người dùng tự tải lên trong studio)
  useEffect(() => {
    if (!wardrobeGarments || wardrobeGarments.length === 0) return;
    setUploadedGarmentsInventory((prev) => {
      const ids = new Set(wardrobeGarments.map((g) => g.id));
      return [...wardrobeGarments, ...prev.filter((p) => !ids.has(p.id))].slice(0, 16);
    });
  }, [wardrobeGarments]);

  // Ướm thử từ Tủ đồ / Gợi ý: mặc ngay các món được chọn
  useEffect(() => {
    if (!tryOnGarments || tryOnGarments.length === 0) return;
    tryOnGarments.forEach((g) => handleApplySingleExtractedGarment(g));
    setUploadedGarmentsInventory((prev) => {
      const ids = new Set(tryOnGarments.map((g) => g.id));
      return [...tryOnGarments, ...prev.filter((p) => !ids.has(p.id))].slice(0, 16);
    });
  }, [tryOnGarments, handleApplySingleExtractedGarment]);

  const handleUpdateBodyField = useCallback(
    <K extends keyof BodyMeasurements>(key: K, value: BodyMeasurements[K]) => {
      setBody((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const handleSelectPosePreset = useCallback((presetId: PosePresetId) => {
    setPosePreset(presetId);
    setLastAiPoseResult(null);
    const found = POSE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setJointRotations({ ...found.rotations });
    }
  }, []);

  const handleGenerateAiPose = useCallback(
    async (promptText: string) => {
      if (!promptText.trim()) return;
      setIsGeneratingPose(true);
      try {
        const res = await generatePoseFromNaturalLanguage(
          promptText,
          body.genderProfile
        );
        setLastAiPoseResult(res);
        setJointRotations({ ...res.rotations });
        // Use natural_idle for static/seated AI poses, catwalk_walk for catwalk, or greeting_wave for wave
        const norm = promptText.toLowerCase();
        if (norm.includes('catwalk') && !res.isSeated) {
          setPosePreset('catwalk_walk');
        } else if ((norm.includes('vẫy tay') || norm.includes('wave')) && !res.isSeated) {
          setPosePreset('greeting_wave');
        } else {
          setPosePreset('natural_idle');
        }
      } catch (err) {
        console.error('Pose AI error:', err);
      } finally {
        setIsGeneratingPose(false);
      }
    },
    [body.genderProfile]
  );

  const handleUpdateJointRotation = useCallback(
    (joint: JointId, nextEuler: EulerDegrees) => {
      setJointRotations((prev) => ({
        ...prev,
        [joint]: nextEuler,
      }));
    },
    []
  );

  const handleSelectJointFrom3D = useCallback((joint: JointId) => {
    setSelectedJoint(joint);
    setActiveTab('pose');
    setIsDockCollapsed(false);
  }, []);

  const handleResetCurrentJoint = useCallback(() => {
    setJointRotations((prev) => ({
      ...prev,
      [selectedJoint]: { ...CROQUIS_SIGNATURE_ROTATIONS[selectedJoint] },
    }));
  }, [selectedJoint]);

  const handleStandStillPose = useCallback(() => {
    setPosePreset('stand_still');
    setLastAiPoseResult(null);
    setJointRotations({ ...ZERO_JOINT_ROTATIONS });
    setCameraPreset('full_front');
    setCameraResetTrigger((c) => c + 1);
  }, []);

  const handleSelectCameraPreset = useCallback((nextCam: CameraPresetId) => {
    setCameraPreset(nextCam);
    setCameraResetTrigger((c) => c + 1);
  }, []);

  const handleQuickGarmentUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsQuickUploading(true);
      try {
        const extractionRes = await extractGarmentsFromPhoto(
          file,
          body.genderProfile,
          'model_photo_ai'
        );
        if (extractionRes.items.length > 0) {
          handleRegisterUploadedGarments(extractionRes.items, true);
          const extractedHair = extractionRes.items.find(
            (it) => it.category === 'hair'
          );
          if (extractedHair) {
            setBody((b) => ({
              ...b,
              hairstyleId:
                (extractedHair.styleId as HairstyleId) ||
                (b.genderProfile === 'male' ? 'male_vec_comma_part' : 'long_wavy'),
              hairColorHex: extractedHair.colorHex || b.hairColorHex,
            }));
          }

          setOutfit((prev) => {
            const currentAcc = prev.accessories || DEFAULT_ACCESSORIES;
            const nextAcc = {
              ...DEFAULT_ACCESSORIES,
              ...currentAcc,
              watch: { ...DEFAULT_ACCESSORIES.watch, ...currentAcc.watch },
              handbag: { ...DEFAULT_ACCESSORIES.handbag, ...currentAcc.handbag },
              sunglasses: {
                ...DEFAULT_ACCESSORIES.sunglasses,
                ...currentAcc.sunglasses,
              },
              hat: {
                ...(DEFAULT_ACCESSORIES.hat || {
                  styleId: 'none' as HatStyleId,
                  colorHex: '#18181B',
                  trimColorHex: '#D4AF37',
                }),
                ...(currentAcc.hat || {}),
              },
              prop: {
                ...(DEFAULT_ACCESSORIES.prop || {
                  styleId: 'none' as PropStyleId,
                  colorHex: '#1E293B',
                  secondaryColorHex: '#D4AF37',
                  handSide: 'auto' as const,
                }),
                ...(currentAcc.prop || {}),
              },
            };

            const next = {
              ...prev,
              hideAllGarments: false,
              accessories: nextAcc,
              dress: prev.dress || {
                styleId: 'none' as const,
                colorHex: '#9F1239',
                fabric: 'silk' as const,
                weavePattern: 'solid' as const,
                fitEase: 'regular' as const,
              },
            };
            for (const item of extractionRes.items) {
              if (item.category === 'dress') {
                if (body.genderProfile !== 'female') {
                  setBody((b) => ({ ...b, genderProfile: 'female' }));
                }
                next.dress = {
                  ...next.dress,
                  styleId: item.styleId as DressStyleId,
                  colorHex: item.colorHex,
                  secondaryColorHex: item.secondaryColorHex,
                  fabric: item.fabric,
                  weavePattern: item.weavePattern,
                  fitEase: item.fitEase,
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                  uploadedCutoutParams: item.uploadedCutoutParams,
                };
                next.top = { ...next.top, styleId: 'none' };
                next.bottom = { ...next.bottom, styleId: 'none' };
              } else if (item.category === 'top') {
                next.top = {
                  ...next.top,
                  styleId: item.styleId as TopStyleId,
                  colorHex: item.colorHex,
                  secondaryColorHex: item.secondaryColorHex,
                  fabric: item.fabric,
                  weavePattern: item.weavePattern,
                  fitEase: item.fitEase,
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                  uploadedCutoutParams: item.uploadedCutoutParams,
                };
                if (next.dress) next.dress = { ...next.dress, styleId: 'none' };
              } else if (item.category === 'outerwear') {
                next.outerwear = {
                  ...next.outerwear,
                  styleId: item.styleId as OuterwearStyleId,
                  colorHex: item.colorHex,
                  secondaryColorHex: item.secondaryColorHex,
                  fabric: item.fabric,
                  weavePattern: item.weavePattern,
                  fitEase: item.fitEase,
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                  uploadedCutoutParams: item.uploadedCutoutParams,
                };
              } else if (item.category === 'bottom') {
                next.bottom = {
                  ...next.bottom,
                  styleId: item.styleId as BottomStyleId,
                  colorHex: item.colorHex,
                  secondaryColorHex: item.secondaryColorHex,
                  fabric: item.fabric,
                  weavePattern: item.weavePattern,
                  fitEase: item.fitEase,
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                  uploadedCutoutParams: item.uploadedCutoutParams,
                };
                if (next.dress) next.dress = { ...next.dress, styleId: 'none' };
              } else if (item.category === 'footwear') {
                next.footwear = {
                  ...next.footwear,
                  styleId: item.styleId as FootwearStyleId,
                  colorHex: item.colorHex,
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                };
              } else if (item.category === 'hat') {
                nextAcc.hat = {
                  styleId: (item.styleId as HatStyleId) || 'baseball_cap',
                  colorHex: item.colorHex || '#18181B',
                  trimColorHex: item.secondaryColorHex || '#D4AF37',
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                };
              } else if (item.category === 'sunglasses') {
                nextAcc.sunglasses = {
                  ...nextAcc.sunglasses,
                  styleId:
                    (item.styleId as SunglassesStyleId) || 'classic_aviator',
                  frameColorHex: item.colorHex || '#D4AF37',
                  lensColorHex: item.secondaryColorHex || '#1E293B',
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                };
              } else if (item.category === 'watch') {
                nextAcc.watch = {
                  ...nextAcc.watch,
                  styleId:
                    (item.styleId as WatchStyleId) || 'luxury_chronograph',
                  caseColorHex: item.secondaryColorHex || '#D4AF37',
                  strapColorHex: item.colorHex || '#1E293B',
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                };
              } else if (item.category === 'handbag') {
                nextAcc.handbag = {
                  ...nextAcc.handbag,
                  styleId:
                    (item.styleId as HandbagStyleId) || 'paris_saddle_bag',
                  colorHex: item.colorHex || '#7F1D1D',
                  hardwareColorHex: item.secondaryColorHex || '#D4AF37',
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                };
              } else if (item.category === 'prop') {
                nextAcc.prop = {
                  styleId: (item.styleId as PropStyleId) || 'luxury_umbrella',
                  colorHex: item.colorHex || '#1E293B',
                  secondaryColorHex: item.secondaryColorHex || '#D4AF37',
                  handSide: 'auto',
                  uploadedName: item.vietnameseName,
                  transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
                  previewThumbUrl: item.previewThumbUrl,
                  uploadedTextureUrl: item.uploadedTextureUrl,
                };
              }
            }
            return next;
          });
        }
      } catch (err) {
        console.error('Quick garment upload error:', err);
      } finally {
        setIsQuickUploading(false);
        if (quickUploadRef.current) {
          quickUploadRef.current.value = '';
        }
      }
    },
    [body.genderProfile, handleRegisterUploadedGarments]
  );

  const fitAnalysis = useMemo(
    () => analyzeBodyAndGarmentFit(body, outfit),
    [body, outfit]
  );

  const score = fitAnalysis.outfitScore;

  // Sync temporary outfit history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        TEMP_HISTORY_STORAGE_KEY,
        JSON.stringify(outfitHistory)
      );
    } catch {
      // Ignore quota exceeded if large uploaded textures are present; keep in-memory state
    }
  }, [outfitHistory]);

  const handleSaveCurrentOutfit = useCallback(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const id = `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: OutfitHistoryEntry = {
      id,
      label: summarizeOutfitLabel(outfit),
      timestamp: `${hh}:${mm}:${ss}`,
      genderProfile: body.genderProfile,
      outfit: cloneOutfitConfig(outfit),
      score: { ...fitAnalysis.outfitScore },
    };
    setOutfitHistory((prev) => [entry, ...prev].slice(0, 12));
    setActiveHistoryId(id);
    onSaveOutfit?.({
      title: entry.label.split(' + ').map((p) => p.replace(AI_SUFFIX, '')).join(' + '),
      items: listOutfitPieces(outfit),
      scoreLabel: `${fitAnalysis.outfitScore.totalScore}/100 (${fitAnalysis.outfitScore.grade})`,
    });
  }, [outfit, body.genderProfile, fitAnalysis.outfitScore, onSaveOutfit]);

  const handleApplyHistoryEntry = useCallback((entry: OutfitHistoryEntry) => {
    setOutfit(cloneOutfitConfig(entry.outfit));
    setActiveHistoryId(entry.id);
  }, []);

  const handleSelectCompareHistoryB = useCallback(
    (entry: OutfitHistoryEntry) => {
      setCompareOutfitB(cloneOutfitConfig(entry.outfit));
      setActiveHistoryIdB(entry.id);
      setIsArMode(false);
      setIsDockCollapsed(true);
      setIsSplitCompareMode(true);
    },
    []
  );

  const handleToggleSplitCompareMode = useCallback(() => {
    setIsSplitCompareMode((prev) => {
      const next = !prev;
      if (next) {
        setIsArMode(false);
        setIsDockCollapsed(true);
        if (!compareOutfitB) {
          const otherHistory = outfitHistory.find(
            (h) => h.id !== activeHistoryId
          );
          if (otherHistory) {
            setCompareOutfitB(cloneOutfitConfig(otherHistory.outfit));
            setActiveHistoryIdB(otherHistory.id);
          } else if (outfitHistory.length > 0) {
            setCompareOutfitB(cloneOutfitConfig(outfitHistory[0].outfit));
            setActiveHistoryIdB(outfitHistory[0].id);
          } else {
            const genderPresets = SUGGESTED_OUTFIT_PRESETS.filter(
              (p) =>
                p.genderHint ===
                (body.genderProfile === 'male' ? 'male' : 'female')
            );
            const fallbackPreset = genderPresets[1] || genderPresets[0];
            if (fallbackPreset) {
              setCompareOutfitB({
                ...fallbackPreset.outfit,
                selectedSize: body.genderProfile === 'male' ? 'L' : 'M',
                hideAllGarments: false,
              });
              setActiveHistoryIdB(null);
            }
          }
        }
      }
      return next;
    });
  }, [
    compareOutfitB,
    outfitHistory,
    activeHistoryId,
    body.genderProfile,
  ]);

  const handleDeleteHistoryEntry = useCallback((id: string) => {
    setOutfitHistory((prev) => prev.filter((item) => item.id !== id));
    setActiveHistoryId((prev) => (prev === id ? null : prev));
    setActiveHistoryIdB((prev) => (prev === id ? null : prev));
  }, []);

  const handleClearHistory = useCallback(() => {
    setOutfitHistory([]);
    setActiveHistoryId(null);
    setActiveHistoryIdB(null);
    try {
      sessionStorage.removeItem(TEMP_HISTORY_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
  }, []);

  const handleQuickFlipAB = useCallback(() => {
    if (outfitHistory.length === 0) return;
    if (outfitHistory.length === 1) {
      handleApplyHistoryEntry(outfitHistory[0]);
      return;
    }
    const idx = outfitHistory.findIndex((h) => h.id === activeHistoryId);
    const nextEntry = idx === 0 ? outfitHistory[1] : outfitHistory[0];
    handleApplyHistoryEntry(nextEntry);
  }, [outfitHistory, activeHistoryId, handleApplyHistoryEntry]);

  const handleResetAll = useCallback(() => {
    setBody(DEFAULT_BODY_MEASUREMENTS);
    setOutfit(DEFAULT_OUTFIT);
    setCompareOutfitB(null);
    setIsSplitCompareMode(false);
    setPosePreset('stand_still');
    setLastAiPoseResult(null);
    setWeatherEffect(DEFAULT_WEATHER_EFFECT);
    setJointRotations({ ...ZERO_JOINT_ROTATIONS });
    setCameraPreset('full_front');
    setCameraResetTrigger((c) => c + 1);
    setLightingPreset('daylight_studio');
    setShowMeasurementTape(false);
    setIsArMode(false);
    setActiveHistoryId(null);
    setActiveHistoryIdB(null);
  }, []);

  const handleToggleArMode = useCallback(() => {
    setIsArMode((prev) => {
      const next = !prev;
      if (next) {
        setIsDockCollapsed(true);
        setIsSplitCompareMode(false);
      }
      return next;
    });
  }, []);

  const handleUpdateOutfitA = useCallback((next: OutfitConfiguration) => {
    setOutfit(next);
    setActiveHistoryId(null);
  }, []);

  const handleUpdateCompareOutfitB = useCallback(
    (next: OutfitConfiguration) => {
      setCompareOutfitB(next);
      setActiveHistoryIdB(null);
    },
    []
  );

  const handleToggleDockCollapse = useCallback(() => {
    setIsDockCollapsed((prev) => !prev);
  }, []);

  const handleToggleMeasurementTape = useCallback(() => {
    setShowMeasurementTape((prev) => !prev);
  }, []);

  const handleTriggerMannequin360Video = useCallback(() => {
    setVideoWalkthroughTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setIsDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className={`relative flex flex-col w-full overflow-hidden bg-[#FAF9F6] text-[#0F172A] select-none ${
        embedded ? 'h-full min-h-0' : 'h-[100dvh] min-h-[100dvh] max-h-[100dvh]'
      }`}
    >
      {/* Top Studio Bar + Advisory Banner in natural flex flow */}
      <header className="w-full shrink-0 z-30 flex flex-col bg-white border-b border-slate-200 shadow-2xs">
        <TopStudioBar
          weatherContext={weatherContext}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsDockCollapsed(false);
          }}
          showMeasurementTape={showMeasurementTape}
          onToggleMeasurementTape={() =>
            setShowMeasurementTape((prev) => !prev)
          }
          isSplitCompareMode={isSplitCompareMode}
          isArMode={isArMode}
          // Nhúng trong app: So sánh, AR, Video 360°, Xuất GLB/USDZ và Phối ngẫu nhiên đã có ngay trên khung 3D;
          // lịch sử dùng mục "Lịch sử phối đồ" chung. Chỉ giữ các nút này khi studio chạy độc lập.
          onToggleSplitCompareMode={embedded ? undefined : handleToggleSplitCompareMode}
          onToggleArMode={
            embedded
              ? undefined
              : () => {
                  setIsArMode((prev) => {
                    const next = !prev;
                    if (next) {
                      setIsDockCollapsed(true);
                      setIsSplitCompareMode(false);
                    }
                    return next;
                  });
                }
          }
          onResetAll={handleResetAll}
          onTriggerVideoWalkthrough={
            embedded ? undefined : () => setVideoWalkthroughTrigger((c) => c + 1)
          }
          onTriggerExportGlb={embedded ? undefined : () => setExportGlbTrigger((c) => c + 1)}
          onTriggerExportUsdz={embedded ? undefined : () => setExportUsdzTrigger((c) => c + 1)}
          outfitHistoryCount={outfitHistory.length}
          onToggleHistoryModal={
            embedded ? undefined : () => setIsHistoryModalOpen((prev) => !prev)
          }
          onRandomShuffleOutfit={embedded ? undefined : handleRandomOutfitShuffle}
          hideBrand={embedded}
        />
        {/* Top Mobile & Comparison Advisory Banner */}
        {!embedded && (
          <div className="w-full bg-amber-50/95 border-t border-amber-200/90 text-amber-950 px-3 py-1 text-[11px] sm:text-xs text-center font-medium shadow-2xs">
            Nếu bạn dùng điện thoại, vui lòng sử dụng thanh công cụ nhớ kéo ngang để dùng được toàn bộ thanh công cụ. Ngoài ra khi dùng tính năng so sánh trang phục, vui lòng thu nhỏ nhân vật để dễ thấy toàn diện
          </div>
        )}
      </header>

      {/* Main Studio Viewport (Occupies 100% of remaining screen, zero cutoff, zero white gaps) */}
      <main className="relative flex-1 w-full min-h-0 overflow-hidden bg-[#FAF9F6]">
        {/* Top-Left Gender Switcher (Clean, compact, never covers model) */}
        {!isArMode && !isSplitCompareMode && (
          <div className="pointer-events-auto absolute top-3 left-3 z-30 flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() =>
                handleUpdateHeightWeight(body.heightCm, body.weightKg, 'female')
              }
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                body.genderProfile === 'female'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Mẫu Nữ
            </button>
            <button
              type="button"
              onClick={() =>
                handleUpdateHeightWeight(body.heightCm, body.weightKg, 'male')
              }
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                body.genderProfile === 'male'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Mẫu Nam
            </button>
          </div>
        )}

        {/* Camera Quick Zoom Controls (Centered/Right on Viewport) */}
        {!isArMode && (
          <div className="pointer-events-auto absolute top-3 right-28 sm:right-32 md:right-36 z-30 flex items-center gap-0.5 p-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xs">
            <Camera className="w-3 h-3 text-slate-400 ml-1 mr-0.5 shrink-0" />
            {(
              [
                { id: 'full_front', label: 'Toàn thân' },
                { id: 'upper_detail', label: 'Cận Áo' },
                { id: 'lower_detail', label: 'Cận Quần' },
              ] as { id: CameraPresetId; label: string }[]
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => setCameraPreset(cam.id)}
                className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                  cameraPreset === cam.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>
        )}

        {/* Floating Top-Right Outfit Score Badge & Click-to-Toggle Detailed Breakdown */}
        {!isArMode && (
          <div className="pointer-events-auto absolute top-3 right-3 z-30 flex flex-col items-end">
            <button
              type="button"
              onClick={() => setIsScoreDetailOpen((prev) => !prev)}
              title="Nhấn để xem chi tiết / Nhấn lần nữa để tắt bảng điểm"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-105 ${
                isScoreDetailOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400/40'
                  : 'bg-slate-900/95 hover:bg-slate-900 text-white border-slate-700/80'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono font-bold text-xs">
                {fitAnalysis.outfitScore.totalScore}đ
              </span>
              <span className="text-[10px] text-amber-300 font-semibold">
                ({fitAnalysis.outfitScore.grade})
              </span>
            </button>

            {/* Visual Outfit Score Breakdown: Only visible when clicked (click 1 = show, click 2 = hide) */}
            {isScoreDetailOpen && (
              <div className="mt-2 w-[min(340px,92vw)] bg-white/98 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-xl text-slate-800 space-y-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Chấm Điểm Outfit Trực Quan
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {fitAnalysis.outfitScore.verdictTitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScoreDetailOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Đóng bảng điểm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 4 Category Score Bars */}
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <div className="flex justify-between text-slate-700 mb-0.5">
                      <span>Độ vừa vặn hình thể</span>
                      <span className="font-mono font-semibold">
                        {fitAnalysis.outfitScore.fitScore}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{ width: `${fitAnalysis.outfitScore.fitScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-0.5">
                      <span>Hài hòa màu sắc</span>
                      <span className="font-mono font-semibold">
                        {fitAnalysis.outfitScore.colorHarmonyScore}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${fitAnalysis.outfitScore.colorHarmonyScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-0.5">
                      <span>Phối chất liệu vải</span>
                      <span className="font-mono font-semibold">
                        {fitAnalysis.outfitScore.fabricBalanceScore}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${fitAnalysis.outfitScore.fabricBalanceScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-0.5">
                      <span>Đồng bộ Kiểu tóc &amp; Dáng</span>
                      <span className="font-mono font-semibold">
                        {fitAnalysis.outfitScore.styleSynergyScore}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${fitAnalysis.outfitScore.styleSynergyScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-600 leading-snug">
                  {fitAnalysis.outfitScore.stylistAdvice}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Mobile Quick Action AI Bar (Anchored Top-Right on Mobile) */}
        {!isArMode && (
          <div className="sm:hidden fixed top-14 right-3 z-20 w-[min(320px,92vw)] pointer-events-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickPosePrompt.trim() || isGeneratingPose) return;
                handleGenerateAiPose(quickPosePrompt.trim());
              }}
              className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <input
                type="text"
                value={quickPosePrompt}
                onChange={(e) => setQuickPosePrompt(e.target.value)}
                placeholder="Nhập hành động (VD: khoanh tay, thả tim, ngồi...)"
                className="flex-1 min-w-0 text-[11px] bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isGeneratingPose || !quickPosePrompt.trim()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold disabled:opacity-50 shrink-0"
              >
                {isGeneratingPose ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>Tạo dáng</span>
              </button>
            </form>
          </div>
        )}

        {/* Full Outfit History Review & Delete Modal (Anchored Fixed at Top-Right Corner so Mannequin stays visible) */}
        {isHistoryModalOpen && (
          <div className="fixed top-14 right-3 z-50 flex items-start justify-end pointer-events-none">
            <div className="pointer-events-auto w-[min(460px,94vw)] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      Lịch Sử Trang Phục Đã Phối ({outfitHistory.length}/12)
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Xem lại các bộ trang phục đã lưu, mặc thử lại hoặc xoá bớt những bộ không thích
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCurrentOutfit}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Lưu bộ đang mặc</span>
                  </button>
                  {outfitHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/30 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xoá tất cả</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-2.5">
                {outfitHistory.length === 0 ? (
                  <div className="py-10 text-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <History className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-sm font-bold text-slate-800">
                      Chưa có bộ trang phục nào trong lịch sử
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Hãy nhấn nút <strong>&ldquo;Lưu bộ đang mặc&rdquo;</strong> ở trên để lưu lại cấu hình hiện tại vào danh sách.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {outfitHistory.map((entry, idx) => {
                      const isCurrentActive = activeHistoryId === entry.id;
                      return (
                        <div
                          key={entry.id}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                            isCurrentActive
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-600 text-white">
                                  Bộ #{outfitHistory.length - idx}
                                </span>
                                <span
                                  className={`text-[10px] font-mono ${
                                    isCurrentActive
                                      ? 'text-slate-300'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  Lúc {entry.timestamp} · Size{' '}
                                  {entry.outfit.selectedSize}
                                </span>
                              </div>
                              <div className="text-xs font-bold mt-1 truncate">
                                {entry.label}
                              </div>
                              <div
                                className={`text-[11px] mt-0.5 ${
                                  isCurrentActive
                                    ? 'text-amber-300'
                                    : 'text-indigo-700'
                                } font-semibold`}
                              >
                                Điểm AI: {entry.score.totalScore}/100 (Hạng{' '}
                                {entry.score.grade})
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteHistoryEntry(entry.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                              title="Xoá bộ trang phục không thích này"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xoá bộ này</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/30">
                            <div className="flex items-center gap-1.5">
                              {entry.outfit.top.styleId !== 'none' && (
                                <span
                                  title="Màu Áo trong"
                                  className="w-4 h-4 rounded-full border border-slate-300"
                                  style={{
                                    backgroundColor:
                                      entry.outfit.top.colorHex,
                                  }}
                                />
                              )}
                              {entry.outfit.outerwear.styleId !== 'none' && (
                                <span
                                  title="Màu Áo khoác"
                                  className="w-4 h-4 rounded-full border border-slate-300"
                                  style={{
                                    backgroundColor:
                                      entry.outfit.outerwear.colorHex,
                                  }}
                                />
                              )}
                              {entry.outfit.bottom.styleId !== 'none' && (
                                <span
                                  title="Màu Quần/Váy"
                                  className="w-4 h-4 rounded-full border border-slate-300"
                                  style={{
                                    backgroundColor:
                                      entry.outfit.bottom.colorHex,
                                  }}
                                />
                              )}
                              {entry.outfit.footwear.styleId !== 'none' && (
                                <span
                                  title="Màu Giày"
                                  className="w-4 h-4 rounded-full border border-slate-300"
                                  style={{
                                    backgroundColor:
                                      entry.outfit.footwear.colorHex,
                                  }}
                                />
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectCompareHistoryB(entry);
                                  setIsHistoryModalOpen(false);
                                }}
                                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-indigo-100 hover:bg-indigo-600 text-indigo-900 hover:text-white transition-colors cursor-pointer"
                              >
                                So sánh A|B
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleApplyHistoryEntry(entry);
                                  setIsHistoryModalOpen(false);
                                }}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                              >
                                {isCurrentActive ? 'Đang mặc' : 'Mặc lại bộ này'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Random Outfit Shuffle Toast Banner (Anchored Top-Right Corner) */}
        {shuffleStatusToast && (
          <div className="pointer-events-none fixed top-32 right-3 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/95 text-white border border-violet-400/40 shadow-lg text-xs font-medium max-w-md">
            <Shuffle className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="truncate">{shuffleStatusToast}</span>
          </div>
        )}

        {/* Automatic Floating 360-Degree Garment Preview Card (Anchored Top-Right Corner) */}
        {is360GarmentPreviewOpen &&
          uploadedGarmentsInventory.length > 0 &&
          !isArMode && (
            <div className="fixed top-32 right-3 z-40 flex flex-col items-end justify-start">
              <Garment360Preview
                items={uploadedGarmentsInventory}
                activeItemId={active360GarmentId || undefined}
                onSelectItem={(item) => setActive360GarmentId(item.id)}
                onApplyItemToMannequin={handleApplySingleExtractedGarment}
                onTriggerMannequin360Video={() =>
                  setVideoWalkthroughTrigger((c) => c + 1)
                }
                onClose={() => setIs360GarmentPreviewOpen(false)}
                mode="floating_right"
              />
            </div>
          )}

        <MannequinViewport
          body={body}
          outfit={outfit}
          posePreset={posePreset}
          jointRotations={jointRotations}
          selectedJoint={selectedJoint}
          onSelectJoint={handleSelectJointFrom3D}
          cameraPreset={cameraPreset}
          lightingPreset={lightingPreset}
          showMeasurementTape={showMeasurementTape}
          resetTrigger={cameraResetTrigger}
          onResetToTPose={handleStandStillPose}
          isArMode={isArMode}
          onToggleArMode={handleToggleArMode}
          isSplitCompareMode={isSplitCompareMode}
          onToggleSplitCompareMode={handleToggleSplitCompareMode}
          compareOutfitB={compareOutfitB}
          outfitHistory={outfitHistory}
          activeHistoryIdA={activeHistoryId}
          activeHistoryIdB={activeHistoryIdB}
          onSelectCompareHistoryA={handleApplyHistoryEntry}
          onSelectCompareHistoryB={handleSelectCompareHistoryB}
          onUpdateOutfitA={handleUpdateOutfitA}
          onUpdateCompareOutfitB={handleUpdateCompareOutfitB}
          weatherEffect={weatherEffect}
          onUpdateWeatherEffect={setWeatherEffect}
          lastAiPoseResult={lastAiPoseResult}
          videoWalkthroughTrigger={videoWalkthroughTrigger}
          exportGlbTrigger={exportGlbTrigger}
          exportUsdzTrigger={exportUsdzTrigger}
          onRandomShuffleOutfit={handleRandomOutfitShuffle}
        />

        <BottomControlDock
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isDockCollapsed}
          onToggleCollapse={handleToggleDockCollapse}
          body={body}
          onUpdateHeightWeight={handleUpdateHeightWeight}
          onUpdateBodyField={handleUpdateBodyField}
          outfit={outfit}
          onUpdateOutfit={setOutfit}
          fitAnalysis={fitAnalysis}
          outfitHistory={outfitHistory}
          activeHistoryId={activeHistoryId}
          activeHistoryIdB={activeHistoryIdB}
          isSplitCompareMode={isSplitCompareMode}
          onToggleSplitCompareMode={handleToggleSplitCompareMode}
          onSaveCurrentOutfit={handleSaveCurrentOutfit}
          onApplyHistoryEntry={handleApplyHistoryEntry}
          onSelectCompareHistoryB={handleSelectCompareHistoryB}
          onDeleteHistoryEntry={handleDeleteHistoryEntry}
          onClearHistory={handleClearHistory}
          posePreset={posePreset}
          onSelectPosePreset={handleSelectPosePreset}
          selectedJoint={selectedJoint}
          onSelectJoint={setSelectedJoint}
          jointRotations={jointRotations}
          onUpdateJointRotation={handleUpdateJointRotation}
          onResetCurrentJoint={handleResetCurrentJoint}
          onStandStillPose={handleStandStillPose}
          cameraPreset={cameraPreset}
          onSelectCameraPreset={handleSelectCameraPreset}
          lightingPreset={lightingPreset}
          onSelectLightingPreset={setLightingPreset}
          showMeasurementTape={showMeasurementTape}
          onToggleMeasurementTape={handleToggleMeasurementTape}
          weatherEffect={weatherEffect}
          onUpdateWeatherEffect={setWeatherEffect}
          onGenerateAiPose={handleGenerateAiPose}
          isGeneratingPose={isGeneratingPose}
          lastAiPoseResult={lastAiPoseResult}
          uploadedGarmentsInventory={uploadedGarmentsInventory}
          onRegisterUploadedGarments={handleRegisterUploadedGarments}
          onOpenGarment360Preview={handleOpenGarment360Preview}
          onRandomShuffleOutfit={handleRandomOutfitShuffle}
          onTriggerMannequin360Video={handleTriggerMannequin360Video}
        />
      </main>
    </div>
  );
}
