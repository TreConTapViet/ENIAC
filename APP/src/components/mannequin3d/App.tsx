import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  BookmarkPlus,
  CloudLightning,
  CloudRain,
  Columns2,
  HelpCircle,
  History,
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCw,
  Send,
  Shirt,
  Shuffle,
  Sparkles,
  Sun,
  Thermometer,
  Trash2,
  Upload,
  Wind,
  X,
  Search,
} from 'lucide-react';
import { OCCASIONS, occasionInfo, type Occasion } from '@/lib/occasions';
import {
  getPresetsForOccasion,
  type OccasionOutfitPreset,
} from '@/lib/occasionOutfits';
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
  RealWeatherForecast,
  StudioLightingId,
  SunglassesStyleId,
  TopStyleId,
  WatchStyleId,
  WeatherEffectConfig,
  WeatherMode,
} from './types/studio';
import {
  ACCESSORY_LEATHER_SWATCHES,
  ACCESSORY_METAL_SWATCHES,
  analyzeAndTransformUploadedGarment,
  analyzeBodyAndGarmentFit,
  BOTTOM_STYLES,
  buildLocalWeatherForecastFallback,
  CROQUIS_SIGNATURE_ROTATIONS,
  DEFAULT_ACCESSORIES,
  DEFAULT_BODY_MEASUREMENTS,
  DEFAULT_OUTFIT,
  DEFAULT_WEATHER_EFFECT,
  deriveMeasurementsFromHeightWeight,
  DRESS_STYLES,
  EYE_LENS_SWATCHES,
  extractGarmentsFromPhoto,
  FABRIC_LIBRARY,
  FASHION_SWATCHES,
  fetchRealTimeWeatherForecast,
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
  SUGGESTED_OUTFIT_PRESETS,
  SUNGLASSES_LENS_SWATCHES,
  SUNGLASSES_STYLES,
  synthesizeColorPalettesFromOutfit,
  TOP_STYLES,
  WATCH_STYLES,
  WEATHER_CITY_PRESETS,
  ZERO_JOINT_ROTATIONS,
} from './data/presets';
import { TopStudioBar } from './components/TopStudioBar';
import { MannequinViewport } from './components/MannequinViewport';
import { BottomControlDock } from './components/BottomControlDock';
import { Garment360Preview } from './components/Garment360Preview';
import {
  BodyShapeGuideModal,
  mapStudioShapeNameToBodyType,
} from '../BodyShapeGuideModal';
import { SocialShareModal } from '../SocialShareModal';

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
          hat: cfg.accessories.hat
            ? { ...cfg.accessories.hat }
            : { ...DEFAULT_ACCESSORIES.hat! },
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

export interface Mannequin3DStudioProps {
  initialGender?: GenderProfile;
  initialHeightCm?: number | null;
  initialWeightKg?: number | null;
  initialWaistCm?: number | null;
  initialHipCm?: number | null;
  initialBustCm?: number | null;
  initialOccasion?: Occasion;
  onChangeOccasion?: (occasion: Occasion) => void;
  externalPreset?: {
    preset: OccasionOutfitPreset;
    trigger: number;
  } | null;
  aiOccasionOutfits?: OccasionOutfitPreset[];
  onRequestAiOccasionOutfits?: () => void;
  isGeneratingAiOutfits?: boolean;
}

export default function App({
  initialGender,
  initialHeightCm,
  initialWeightKg,
  initialWaistCm,
  initialHipCm,
  initialBustCm,
  initialOccasion = 'casual',
  onChangeOccasion,
  externalPreset,
  aiOccasionOutfits,
  onRequestAiOccasionOutfits,
  isGeneratingAiOutfits = false,
}: Mannequin3DStudioProps = {}) {
  const [activeTab, setActiveTab] = useState<ActiveDockTab>('body');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(true);
  const [showSidePanels, setShowSidePanels] = useState<boolean>(true);
  const [studioOccasion, setStudioOccasion] = useState<Occasion>(initialOccasion);
  const [activeOccasionPresetId, setActiveOccasionPresetId] = useState<string | null>(null);

  useEffect(() => {
    if (initialOccasion) {
      setStudioOccasion(initialOccasion);
    }
  }, [initialOccasion]);

  const buildInitialBody = useCallback((): BodyMeasurements => {
    const gender: GenderProfile = initialGender || DEFAULT_BODY_MEASUREMENTS.genderProfile;
    const h = initialHeightCm || (gender === 'male' ? 178 : DEFAULT_BODY_MEASUREMENTS.heightCm);
    const w = initialWeightKg || (gender === 'male' ? 72 : DEFAULT_BODY_MEASUREMENTS.weightKg);
    const derived = deriveMeasurementsFromHeightWeight(h, w, gender);
    return {
      ...DEFAULT_BODY_MEASUREMENTS,
      genderProfile: gender,
      heightCm: h,
      weightKg: w,
      hairstyleId: gender === 'male' ? 'male_classic_side_wave' : 'long_wavy',
      ...derived,
      ...(initialWaistCm ? { waistCm: initialWaistCm } : {}),
      ...(initialHipCm ? { hipCm: initialHipCm } : {}),
      ...(initialBustCm ? { chestCm: initialBustCm } : {}),
    };
  }, [initialGender, initialHeightCm, initialWeightKg, initialWaistCm, initialHipCm, initialBustCm]);

  const buildInitialOutfit = useCallback((): OutfitConfiguration => {
    const gender: GenderProfile = initialGender || DEFAULT_BODY_MEASUREMENTS.genderProfile;
    const occasionPresets = getPresetsForOccasion(initialOccasion || 'casual', gender);
    if (occasionPresets.length > 0) {
      return cloneOutfitConfig(occasionPresets[0].outfit);
    }
    if (gender === 'male') {
      return {
        ...DEFAULT_OUTFIT,
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
      };
    }
    return DEFAULT_OUTFIT;
  }, [initialGender, initialOccasion]);

  // 1. User Body Measurements State
  const [body, setBody] = useState<BodyMeasurements>(buildInitialBody);

  useEffect(() => {
    if (!initialHeightCm && !initialWeightKg && !initialGender) return;
    setBody(buildInitialBody());
  }, [buildInitialBody, initialGender, initialHeightCm, initialWeightKg]);

  // 2. Multi-Layer Outfit & PBR Fabric State
  const [outfit, setOutfit] = useState<OutfitConfiguration>(buildInitialOutfit);

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

  // 5. Environmental Weather Effects (Wind & Rain), Automated Location Weather Lookup & Pose AI Generator State
  const [weatherEffect, setWeatherEffect] = useState<WeatherEffectConfig>(
    DEFAULT_WEATHER_EFFECT
  );
  const [weatherLocationInput, setWeatherLocationInput] =
    useState<string>('Hà Nội, Việt Nam');
  const [liveWeather, setLiveWeather] = useState<RealWeatherForecast>(() =>
    buildLocalWeatherForecastFallback('Hà Nội, Việt Nam')
  );
  const [isFetchingWeather, setIsFetchingWeather] = useState<boolean>(false);
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
  const [captureSnapshotTrigger, setCaptureSnapshotTrigger] =
    useState<number>(0);
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isBodyGuideOpen, setIsBodyGuideOpen] = useState<boolean>(false);

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
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [showRightOccasion, setShowRightOccasion] = useState<boolean>(true);
  const [showRightCollection, setShowRightCollection] = useState<boolean>(true);
  const [showRightHistory, setShowRightHistory] = useState<boolean>(true);
  const [showRightPoseAi, setShowRightPoseAi] = useState<boolean>(true);
  const [showRightUploadMatch, setShowRightUploadMatch] =
    useState<boolean>(true);
  const [showRightColorPalette, setShowRightColorPalette] =
    useState<boolean>(true);
  const [showRightScoreDetail, setShowRightScoreDetail] =
    useState<boolean>(false);
  const [rightSearchQuery, setRightSearchQuery] = useState<string>('');

  const searchResults = useMemo(() => {
    const q = rightSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: {
      id: string;
      name: string;
      categoryLabel: string;
      action: () => void;
    }[] = [];

    // Tops
    TOP_STYLES.forEach((item) => {
      if (item.id !== 'none' && item.name.toLowerCase().includes(q)) {
        results.push({
          id: `top-${item.id}`,
          name: item.name,
          categoryLabel: 'Áo',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              hideAllGarments: false,
              top: { ...prev.top, styleId: item.id as TopStyleId },
            }));
            setShuffleStatusToast(`✨ Đã chọn Áo: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Bottoms
    BOTTOM_STYLES.forEach((item) => {
      if (item.id !== 'none' && item.name.toLowerCase().includes(q)) {
        results.push({
          id: `bottom-${item.id}`,
          name: item.name,
          categoryLabel: 'Quần / Váy',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              hideAllGarments: false,
              bottom: { ...prev.bottom, styleId: item.id as BottomStyleId },
            }));
            setShuffleStatusToast(`✨ Đã chọn Quần/Váy: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Dresses
    DRESS_STYLES.forEach((item) => {
      if (item.id !== 'none' && item.name.toLowerCase().includes(q)) {
        results.push({
          id: `dress-${item.id}`,
          name: item.name,
          categoryLabel: 'Đầm / Váy liền',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              hideAllGarments: false,
              top: { ...prev.top, styleId: 'none' },
              bottom: { ...prev.bottom, styleId: 'none' },
              dress: {
                styleId: item.id as DressStyleId,
                fabric: prev.dress?.fabric || 'silk',
                colorHex: prev.dress?.colorHex || '#F43F5E',
                fitEase: prev.dress?.fitEase || 'regular',
              },
            }));
            setShuffleStatusToast(`✨ Đã chọn Đầm: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Outerwear
    OUTERWEAR_STYLES.forEach((item) => {
      if (item.id !== 'none' && item.name.toLowerCase().includes(q)) {
        results.push({
          id: `outer-${item.id}`,
          name: item.name,
          categoryLabel: 'Áo Khoác',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              hideAllGarments: false,
              outerwear: { ...prev.outerwear, styleId: item.id as OuterwearStyleId },
            }));
            setShuffleStatusToast(`✨ Đã chọn Áo Khoác: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Footwear
    FOOTWEAR_STYLES.forEach((item) => {
      if (item.name.toLowerCase().includes(q)) {
        results.push({
          id: `footwear-${item.id}`,
          name: item.name,
          categoryLabel: 'Giày',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              footwear: { ...prev.footwear, styleId: item.id as FootwearStyleId },
            }));
            setShuffleStatusToast(`✨ Đã chọn Giày: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Hairstyles
    HAIRSTYLE_OPTIONS.forEach((item) => {
      if (
        item.name.toLowerCase().includes(q) ||
        (item.genderHint && item.genderHint.toLowerCase().includes(q))
      ) {
        results.push({
          id: `hair-${item.id}`,
          name: `${item.name} (${item.genderHint === 'male' ? 'Nam' : 'Nữ'})`,
          categoryLabel: 'Kiểu tóc',
          action: () => {
            setBody((prev) => ({ ...prev, hairstyleId: item.id as HairstyleId }));
            setShuffleStatusToast(`✨ Đã đổi Kiểu tóc: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Watches
    WATCH_STYLES.forEach((item) => {
      if (item.id !== 'none' && item.name.toLowerCase().includes(q)) {
        results.push({
          id: `watch-${item.id}`,
          name: item.name,
          categoryLabel: 'Đồng hồ',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              accessories: {
                ...(prev.accessories || DEFAULT_ACCESSORIES),
                watch: {
                  ...(prev.accessories?.watch || DEFAULT_ACCESSORIES.watch!),
                  styleId: item.id as WatchStyleId,
                },
              },
            }));
            setShuffleStatusToast(`✨ Đã chọn Đồng hồ: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Handbags & Toys
    HANDBAG_STYLES.forEach((item) => {
      if (item.id !== 'none' && item.name.toLowerCase().includes(q)) {
        results.push({
          id: `bag-${item.id}`,
          name: item.name,
          categoryLabel: 'Túi / Đồ chơi / Dù',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              accessories: {
                ...(prev.accessories || DEFAULT_ACCESSORIES),
                handbag: {
                  ...(prev.accessories?.handbag || DEFAULT_ACCESSORIES.handbag!),
                  styleId: item.id as HandbagStyleId,
                },
              },
            }));
            setShuffleStatusToast(`✨ Đã trang bị: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Hats
    HAT_STYLES.forEach((item) => {
      if (item.id !== 'none' && item.name.toLowerCase().includes(q)) {
        results.push({
          id: `hat-${item.id}`,
          name: item.name,
          categoryLabel: 'Nón',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              accessories: {
                ...(prev.accessories || DEFAULT_ACCESSORIES),
                hat: {
                  ...(prev.accessories?.hat || DEFAULT_ACCESSORIES.hat!),
                  styleId: item.id as HatStyleId,
                },
              },
            }));
            setShuffleStatusToast(`✨ Đã đội Nón: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Sunglasses
    SUNGLASSES_STYLES.forEach((item) => {
      if (item.id !== 'none' && item.name.toLowerCase().includes(q)) {
        results.push({
          id: `glasses-${item.id}`,
          name: item.name,
          categoryLabel: 'Kính mát',
          action: () => {
            setOutfit((prev) => ({
              ...prev,
              accessories: {
                ...(prev.accessories || DEFAULT_ACCESSORIES),
                sunglasses: {
                  ...(prev.accessories?.sunglasses || DEFAULT_ACCESSORIES.sunglasses!),
                  styleId: item.id as SunglassesStyleId,
                },
              },
            }));
            setShuffleStatusToast(`✨ Đã đeo Kính: ${item.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    // Outfits Presets
    SUGGESTED_OUTFIT_PRESETS.forEach((preset) => {
      if (preset.name.toLowerCase().includes(q) || preset.tag.toLowerCase().includes(q)) {
        results.push({
          id: `preset-${preset.id}`,
          name: `Bộ: ${preset.name} (${preset.tag})`,
          categoryLabel: 'Bộ trang phục',
          action: () => {
            setActiveOccasionPresetId(null);
            setOutfit({
              ...preset.outfit,
              selectedSize: body.genderProfile === 'male' ? 'L' : 'S',
              hideAllGarments: false,
            });
            setShuffleStatusToast(`✨ Đã mặc bộ: ${preset.name}`);
            setTimeout(() => setShuffleStatusToast(null), 3000);
          },
        });
      }
    });

    return results.slice(0, 15);
  }, [rightSearchQuery, body.genderProfile]);

  // Automated Weather Lookup by Location Query or GPS Coordinates
  const handleLookupWeatherByLocation = useCallback(
    async (queryText: string, lat?: number, lng?: number, sync3DMode = false) => {
      setIsFetchingWeather(true);
      try {
        const forecast = await fetchRealTimeWeatherForecast(
          queryText,
          lat,
          lng
        );
        setLiveWeather(forecast);
        if (forecast.locationName) {
          setWeatherLocationInput(forecast.locationName);
        }
        if (sync3DMode) {
          const nextMode: WeatherMode = forecast.recommendedWeatherMode || 'clear';
          setWeatherEffect((prev) => ({
            ...prev,
            mode: nextMode,
            windIntensity:
              nextMode === 'storm'
                ? 80
                : nextMode === 'wind'
                ? Math.min(90, Math.max(45, Math.round(forecast.windSpeedKmh * 2.5)))
                : prev.windIntensity,
            rainIntensity:
              nextMode === 'storm'
                ? 85
                : nextMode === 'rain'
                ? 68
                : prev.rainIntensity,
          }));
        }
      } catch (err) {
        console.error('Weather lookup error:', err);
      } finally {
        setIsFetchingWeather(false);
      }
    },
    []
  );

  const handleDetectUserLocationWeather = useCallback(
    (sync3DMode = true) => {
      const inferTimezoneCity = () => {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
          if (tz.includes('Saigon') || tz.includes('Ho_Chi_Minh')) {
            return 'TP. Hồ Chí Minh, Việt Nam';
          }
          if (tz.includes('Seoul')) return 'Seoul, South Korea';
          if (tz.includes('Tokyo')) return 'Tokyo, Japan';
          if (tz.includes('Paris')) return 'Paris, France';
        } catch {
          // ignore
        }
        return 'Hà Nội, Việt Nam';
      };

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        setIsFetchingWeather(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handleLookupWeatherByLocation(
              '',
              pos.coords.latitude,
              pos.coords.longitude,
              sync3DMode
            );
          },
          () => {
            const fallbackCity = inferTimezoneCity();
            handleLookupWeatherByLocation(
              fallbackCity,
              undefined,
              undefined,
              sync3DMode
            );
          },
          { timeout: 3200, maximumAge: 300000 }
        );
      } else {
        const fallbackCity = inferTimezoneCity();
        handleLookupWeatherByLocation(
          fallbackCity,
          undefined,
          undefined,
          sync3DMode
        );
      }
    },
    [handleLookupWeatherByLocation]
  );

  // Automatically look up user's local weather on initial Studio mount
  useEffect(() => {
    handleDetectUserLocationWeather(false);
  }, [handleDetectUserLocationWeather]);

  // Smart Weather-Based Outerwear & Fabric Suggestion Advisor
  const weatherOutfitAdvisor = useMemo(() => {
    const temp = liveWeather.temperatureC;
    const isStormy =
      weatherEffect.mode === 'storm' ||
      (liveWeather.isRainy && liveWeather.windSpeedKmh >= 25);
    const isRainy =
      weatherEffect.mode === 'rain' ||
      weatherEffect.mode === 'storm' ||
      (weatherEffect.mode === 'clear' && liveWeather.isRainy);
    const isColdOrWindy =
      weatherEffect.mode === 'wind' ||
      liveWeather.isCold ||
      temp <= 21;
    const isHot =
      weatherEffect.mode === 'clear' &&
      !liveWeather.isRainy &&
      !liveWeather.isCold &&
      temp >= 27;

    let recommendedOuterwearStyle: OuterwearStyleId = 'tailored_blazer';
    let recommendedOuterwearFabric: FabricType = 'fleece';
    let recommendedOuterwearColor = '#1E293B';
    let outerwearActionTitle = 'Khoác thêm Blazer Dạ Giữ Ấm';
    let outerwearReason = '';

    let recommendedTopFabric: FabricType = 'cotton';
    let recommendedBottomFabric: FabricType = 'denim';
    let recommendedDressFabric: FabricType = 'silk';
    let fabricActionTitle = 'Đổi Vải Cotton & Denim Cân Bằng';
    let fabricReason = '';

    if (isStormy || (isRainy && isColdOrWindy)) {
      recommendedOuterwearStyle = 'trench_coat';
      recommendedOuterwearFabric = 'leather';
      recommendedOuterwearColor = '#3F3D38';
      outerwearActionTitle = '+ Thêm Áo Khoác Trench Coat Chắn Mưa Gió';
      outerwearReason = `Thời tiết ${liveWeather.locationName} (${temp}°C, mưa lạnh/gió): Nên khoác thêm Trench Coat dáng dài chống thấm và giữ ấm toàn thân.`;

      recommendedTopFabric = 'fleece';
      recommendedBottomFabric = 'denim';
      recommendedDressFabric = 'fleece';
      fabricActionTitle = 'Đổi Vải: Len Nỉ 320 GSM + Da Chống Thấm';
      fabricReason =
        'Thay vải mỏng (Lụa/Linen dễ ướt bết dính) sang Len Nỉ 320 GSM giữ ấm bên trong và Da/Denim kháng nước bên ngoài.';
    } else if (isRainy) {
      recommendedOuterwearStyle = 'biker_leather';
      recommendedOuterwearFabric = 'leather';
      recommendedOuterwearColor = '#1C1917';
      outerwearActionTitle = '+ Thêm Áo Khoác Da Biker Kháng Nước Mưa';
      outerwearReason = `Trời đang có mưa (${temp}°C, độ ẩm ${liveWeather.humidityPercent}%): Nên mặc thêm Áo khoác Da chống thấm nước mưa.`;

      recommendedTopFabric = 'cotton';
      recommendedBottomFabric = 'denim';
      recommendedDressFabric = 'cotton';
      fabricActionTitle = 'Đổi Vải: Da 450 GSM & Denim Kháng Ẩm';
      fabricReason =
        'Đổi sang chất liệu Da & Denim dày dặn để hạn chế thấm nước mưa và tránh hiện tượng vải mỏng dính sát cơ thể.';
    } else if (isColdOrWindy) {
      recommendedOuterwearStyle = 'tailored_blazer';
      recommendedOuterwearFabric = 'fleece';
      recommendedOuterwearColor = '#1E293B';
      outerwearActionTitle = '+ Thêm Áo Khoác Blazer Dạ Chắn Gió';
      outerwearReason = `Trời se lạnh / gió (${temp}°C, gió ${liveWeather.windSpeedKmh} km/h): Gợi ý khoác thêm Blazer dạ nỉ giữ nhiệt vùng ngực và vai.`;

      recommendedTopFabric = 'fleece';
      recommendedBottomFabric = 'fleece';
      recommendedDressFabric = 'fleece';
      fabricActionTitle = 'Đổi Vải: Len Nỉ Dệt Kim (320 GSM Giữ Ấm)';
      fabricReason =
        'Chuyển chất liệu áo/quần sang Len Nỉ 320 GSM đầm chắc giúp giữ nhiệt và đứng phom trước sức gió.';
    } else if (isHot) {
      if (outfit.outerwear.styleId !== 'none') {
        recommendedOuterwearStyle = 'none';
        recommendedOuterwearFabric = 'linen';
        recommendedOuterwearColor = '#E5DCCB';
        outerwearActionTitle = 'Cởi Bỏ Áo Khoác Ngoài Cho Thoáng Mát';
        outerwearReason = `Nhiệt độ ${temp}°C khá nóng: Gợi ý cởi bỏ lớp áo khoác ngoài để cơ thể thoáng khí.`;
      } else {
        recommendedOuterwearStyle = 'bomber_jacket';
        recommendedOuterwearFabric = 'linen';
        recommendedOuterwearColor = '#E5DCCB';
        outerwearActionTitle = '+ Khoác Nhẹ Bomber Linen Chống Nắng';
        outerwearReason = `Trời nắng ấm (${temp}°C): Có thể khoác nhẹ Bomber vải Linen mỏng để chống nắng khi ra ngoài.`;
      }

      recommendedTopFabric = 'linen';
      recommendedBottomFabric = 'linen';
      recommendedDressFabric = 'silk';
      fabricActionTitle = 'Đổi Vải: Linen 145 GSM & Lụa Thoáng Mát';
      fabricReason =
        'Ưu tiên Vải Đay Linen (145 GSM) và Lụa Mulberry (95 GSM) siêu thoáng khí, tản nhiệt nhanh trong ngày nóng.';
    } else {
      recommendedOuterwearStyle = 'denim_jacket';
      recommendedOuterwearFabric = 'denim';
      recommendedOuterwearColor = '#2B4C7E';
      outerwearActionTitle = '+ Thêm Áo Khoác Denim Layering Thanh Lịch';
      outerwearReason = `Thời tiết dịu mát (${temp}°C): Phù hợp khoác nhẹ Denim Jacket hoặc giữ bản phối hiện tại.`;

      recommendedTopFabric = 'cotton';
      recommendedBottomFabric = 'cotton';
      recommendedDressFabric = 'silk';
      fabricActionTitle = 'Đổi Vải: Cotton Pima 190 GSM Mềm Thoáng';
      fabricReason =
        'Chất liệu Cotton Pima (190 GSM) và Lụa tự nhiên mang lại độ rủ mềm mại cho tiết trời ôn hòa.';
    }

    const currentTopFabricName =
      FABRIC_LIBRARY[outfit.top.fabric]?.name || outfit.top.fabric;
    const currentOuterName =
      outfit.outerwear.styleId === 'none'
        ? 'Chưa mặc áo khoác'
        : OUTERWEAR_STYLES.find((o) => o.id === outfit.outerwear.styleId)
            ?.name || 'Áo khoác';

    return {
      recommendedOuterwearStyle,
      recommendedOuterwearFabric,
      recommendedOuterwearColor,
      outerwearActionTitle,
      outerwearReason,
      recommendedTopFabric,
      recommendedBottomFabric,
      recommendedDressFabric,
      fabricActionTitle,
      fabricReason,
      currentTopFabricName,
      currentOuterName,
    };
  }, [liveWeather, weatherEffect.mode, outfit.outerwear.styleId, outfit.top.fabric]);

  const handleApplyWeatherOuterwearSuggestion = useCallback(() => {
    setOutfit((prev) => ({
      ...prev,
      hideAllGarments: false,
      outerwear: {
        ...prev.outerwear,
        styleId: weatherOutfitAdvisor.recommendedOuterwearStyle,
        fabric: weatherOutfitAdvisor.recommendedOuterwearFabric,
        colorHex:
          weatherOutfitAdvisor.recommendedOuterwearStyle === 'none'
            ? prev.outerwear.colorHex
            : weatherOutfitAdvisor.recommendedOuterwearColor,
        fitEase: 'regular',
        uploadedName: undefined,
        transformedSummary: undefined,
        previewThumbUrl: undefined,
        uploadedTextureUrl: undefined,
        uploadedCutoutParams: undefined,
      },
    }));
    setActiveHistoryId(null);
    setShuffleStatusToast(
      `🧥 Đã cập nhật Áo khoác theo thời tiết (${liveWeather.temperatureC}°C): ${weatherOutfitAdvisor.outerwearActionTitle}`
    );
    setTimeout(() => setShuffleStatusToast(null), 3800);
  }, [weatherOutfitAdvisor, liveWeather.temperatureC]);

  const handleApplyWeatherFabricSuggestion = useCallback(() => {
    setOutfit((prev) => ({
      ...prev,
      hideAllGarments: false,
      top: {
        ...prev.top,
        fabric: weatherOutfitAdvisor.recommendedTopFabric,
      },
      bottom: {
        ...prev.bottom,
        fabric: weatherOutfitAdvisor.recommendedBottomFabric,
      },
      outerwear: {
        ...prev.outerwear,
        fabric: weatherOutfitAdvisor.recommendedOuterwearFabric,
      },
      dress: prev.dress
        ? {
            ...prev.dress,
            fabric: weatherOutfitAdvisor.recommendedDressFabric,
          }
        : undefined,
    }));
    setActiveHistoryId(null);
    setShuffleStatusToast(
      `🧵 Đã đổi chất liệu vải phù hợp thời tiết (${liveWeather.temperatureC}°C): ${weatherOutfitAdvisor.fabricActionTitle}`
    );
    setTimeout(() => setShuffleStatusToast(null), 3800);
  }, [weatherOutfitAdvisor, liveWeather.temperatureC]);

  const handleApplyFullWeatherRecommendation = useCallback(() => {
    const recMode: WeatherMode = liveWeather.recommendedWeatherMode || 'clear';
    setWeatherEffect((prev) => ({
      ...prev,
      mode: recMode,
      windIntensity:
        recMode === 'storm'
          ? 80
          : recMode === 'wind'
          ? Math.min(90, Math.max(45, Math.round(liveWeather.windSpeedKmh * 2.5)))
          : prev.windIntensity,
      rainIntensity:
        recMode === 'storm' ? 85 : recMode === 'rain' ? 68 : prev.rainIntensity,
    }));
    setOutfit((prev) => ({
      ...prev,
      hideAllGarments: false,
      top: {
        ...prev.top,
        fabric: weatherOutfitAdvisor.recommendedTopFabric,
      },
      bottom: {
        ...prev.bottom,
        fabric: weatherOutfitAdvisor.recommendedBottomFabric,
      },
      outerwear: {
        ...prev.outerwear,
        styleId: weatherOutfitAdvisor.recommendedOuterwearStyle,
        fabric: weatherOutfitAdvisor.recommendedOuterwearFabric,
        colorHex:
          weatherOutfitAdvisor.recommendedOuterwearStyle === 'none'
            ? prev.outerwear.colorHex
            : weatherOutfitAdvisor.recommendedOuterwearColor,
        fitEase: 'regular',
        uploadedName: undefined,
        transformedSummary: undefined,
        previewThumbUrl: undefined,
        uploadedTextureUrl: undefined,
        uploadedCutoutParams: undefined,
      },
      dress: prev.dress
        ? {
            ...prev.dress,
            fabric: weatherOutfitAdvisor.recommendedDressFabric,
          }
        : undefined,
    }));
    setActiveHistoryId(null);
    setShuffleStatusToast(
      `⛅ Đã tối ưu trọn bộ Áo khoác & Chất vải theo thời tiết ${liveWeather.locationName} (${liveWeather.temperatureC}°C)`
    );
    setTimeout(() => setShuffleStatusToast(null), 4000);
  }, [liveWeather, weatherOutfitAdvisor]);

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

  const handleApplyMultipleExtractedGarments = useCallback(
    (items: ExtractedGarmentItem[]) => {
      if (!items || items.length === 0) return;

      for (const item of items) {
        if (item.category === 'hairstyle') {
          setBody((prev) => ({
            ...prev,
            hairstyleId:
              (item.styleId as HairstyleId) ||
              (prev.genderProfile === 'male'
                ? 'male_classic_side_wave'
                : 'long_wavy'),
            hairColorHex: item.colorHex || prev.hairColorHex,
          }));
        }
      }

      setOutfit((prev) => {
        const next: OutfitConfiguration = {
          ...prev,
          hideAllGarments: false,
          dress: prev.dress || {
            styleId: 'none',
            colorHex: '#9F1239',
            fabric: 'silk',
            weavePattern: 'solid',
            fitEase: 'regular',
          },
          accessories: prev.accessories
            ? {
                watch: { ...prev.accessories.watch },
                handbag: { ...prev.accessories.handbag },
                sunglasses: { ...prev.accessories.sunglasses },
                hat: prev.accessories.hat
                  ? { ...prev.accessories.hat }
                  : { ...DEFAULT_ACCESSORIES.hat! },
              }
            : {
                watch: { ...DEFAULT_ACCESSORIES.watch },
                handbag: { ...DEFAULT_ACCESSORIES.handbag },
                sunglasses: { ...DEFAULT_ACCESSORIES.sunglasses },
                hat: { ...DEFAULT_ACCESSORIES.hat! },
              },
        };

        for (const item of items) {
          if (item.category === 'dress') {
            if (body.genderProfile !== 'female') {
              setBody((b) => ({ ...b, genderProfile: 'female' }));
            }
            next.dress = {
              styleId:
                (item.styleId as DressStyleId) || 'silk_slip_evening_dress',
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
          } else if (item.category === 'watch' && next.accessories) {
            next.accessories.watch = {
              ...next.accessories.watch,
              styleId: (item.styleId as WatchStyleId) || 'luxury_chronograph',
              caseColorHex:
                item.colorHex || next.accessories.watch.caseColorHex,
              strapColorHex:
                item.secondaryColorHex || next.accessories.watch.strapColorHex,
              uploadedName: item.vietnameseName,
              transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
              previewThumbUrl: item.previewThumbUrl,
              uploadedTextureUrl: item.uploadedTextureUrl,
            };
          } else if (item.category === 'handbag' && next.accessories) {
            next.accessories.handbag = {
              ...next.accessories.handbag,
              styleId: (item.styleId as HandbagStyleId) || 'paris_saddle_bag',
              colorHex: item.colorHex || next.accessories.handbag.colorHex,
              hardwareColorHex:
                item.secondaryColorHex ||
                next.accessories.handbag.hardwareColorHex,
              uploadedName: item.vietnameseName,
              transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
              previewThumbUrl: item.previewThumbUrl,
              uploadedTextureUrl: item.uploadedTextureUrl,
            };
          } else if (item.category === 'sunglasses' && next.accessories) {
            next.accessories.sunglasses = {
              ...next.accessories.sunglasses,
              styleId: (item.styleId as SunglassesStyleId) || 'retro_cat_eye',
              frameColorHex:
                item.colorHex || next.accessories.sunglasses.frameColorHex,
              lensColorHex:
                item.secondaryColorHex ||
                next.accessories.sunglasses.lensColorHex,
              wearPosition: 'eyes',
              uploadedName: item.vietnameseName,
              transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
              previewThumbUrl: item.previewThumbUrl,
              uploadedTextureUrl: item.uploadedTextureUrl,
            };
          } else if (item.category === 'hat' && next.accessories) {
            next.accessories.hat = {
              ...(next.accessories.hat || DEFAULT_ACCESSORIES.hat!),
              styleId: (item.styleId as HatStyleId) || 'baseball_cap',
              colorHex: item.colorHex || '#1E293B',
              trimColorHex: item.secondaryColorHex || '#D4AF37',
              uploadedName: item.vietnameseName,
              transformedSummary: `${item.vietnameseName} (Đã tách nền AI)`,
              previewThumbUrl: item.previewThumbUrl,
              uploadedTextureUrl: item.uploadedTextureUrl,
            };
          }
        }

        return next;
      });
      setActiveHistoryId(null);
    },
    [body.genderProfile]
  );

  const handleApplySingleExtractedGarment = useCallback(
    (item: ExtractedGarmentItem) => {
      handleApplyMultipleExtractedGarments([item]);
    },
    [handleApplyMultipleExtractedGarments]
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
    const validHats = HAT_STYLES.filter((h) => h.id !== 'none');

    const pickedWatch =
      Math.random() < 0.75 ? pickRandom(validWatches).id : 'none';
    const pickedBag =
      Math.random() < (isMale ? 0.35 : 0.68)
        ? pickRandom(validBags).id
        : 'none';
    const pickedGlasses =
      Math.random() < 0.45 ? pickRandom(validGlasses).id : 'none';
    const pickedHat =
      Math.random() < 0.35 ? pickRandom(validHats).id : 'none';

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
        hat: {
          ...(currentAcc.hat || DEFAULT_ACCESSORIES.hat!),
          styleId: pickedHat,
          colorHex: pickRandom(ACCESSORY_LEATHER_SWATCHES).hex,
          trimColorHex: pickRandom(ACCESSORY_METAL_SWATCHES).hex,
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
            ? 'male_classic_side_wave'
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
            colorHex: '#DBEAFE',
            secondaryColorHex: '#1E3A8A',
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

  const handleQuickGarmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
        handleApplyMultipleExtractedGarments(extractionRes.items);
      }
    } catch (err) {
      console.error('Quick garment upload error:', err);
    } finally {
      setIsQuickUploading(false);
      if (quickUploadRef.current) {
        quickUploadRef.current.value = '';
      }
    }
  };

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
  }, [outfit, body.genderProfile, fitAnalysis.outfitScore]);

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
    setBody(buildInitialBody());
    setOutfit(buildInitialOutfit());
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
  }, [buildInitialBody, buildInitialOutfit]);

  const currentOccasionPresets = useMemo(() => {
    if (aiOccasionOutfits && aiOccasionOutfits.length > 0) {
      const filtered = aiOccasionOutfits.filter(
        (p) =>
          p.occasion === studioOccasion &&
          p.gender === (body.genderProfile === 'male' ? 'male' : 'female')
      );
      if (filtered.length > 0) return filtered;
    }
    return getPresetsForOccasion(studioOccasion, body.genderProfile);
  }, [aiOccasionOutfits, studioOccasion, body.genderProfile]);

  const handleApplyOccasionPreset = useCallback(
    (preset: OccasionOutfitPreset) => {
      setActiveOccasionPresetId(preset.id);
      setOutfit({
        ...cloneOutfitConfig(preset.outfit),
        selectedSize: body.genderProfile === 'male' ? 'L' : 'S',
        hideAllGarments: false,
      });
      setActiveHistoryId(null);
      if (preset.recommendedPose) {
        handleSelectPosePreset(preset.recommendedPose);
      }
      setShuffleStatusToast(
        `✨ Đã mặc bộ "${preset.name}" (${occasionInfo(preset.occasion).label})`
      );
      setTimeout(() => {
        setShuffleStatusToast((prev) =>
          prev?.includes(preset.name) ? null : prev
        );
      }, 3600);
    },
    [body.genderProfile, handleSelectPosePreset]
  );

  // Sync external preset selected from Wardrobe section
  useEffect(() => {
    if (!externalPreset?.preset) return;
    handleApplyOccasionPreset(externalPreset.preset);
  }, [externalPreset, handleApplyOccasionPreset]);

  const handleSelectStudioOccasion = useCallback(
    (nextOcc: Occasion) => {
      setStudioOccasion(nextOcc);
      onChangeOccasion?.(nextOcc);
      const presets = getPresetsForOccasion(nextOcc, body.genderProfile);
      if (presets.length > 0) {
        handleApplyOccasionPreset(presets[0]);
      }
    },
    [body.genderProfile, onChangeOccasion, handleApplyOccasionPreset]
  );

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

  const occMeta = occasionInfo(studioOccasion);

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-[#FAF9F6] text-[#0F172A]">
      {/* Row 1: Top Studio Navigation & Export Bar */}
      <TopStudioBar
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
        onToggleSplitCompareMode={handleToggleSplitCompareMode}
        isArMode={isArMode}
        onToggleArMode={() => {
          setIsArMode((prev) => {
            const next = !prev;
            if (next) {
              setIsDockCollapsed(true);
              setIsSplitCompareMode(false);
            }
            return next;
          });
        }}
        onResetAll={handleResetAll}
        onTriggerVideoWalkthrough={() =>
          setVideoWalkthroughTrigger((c) => c + 1)
        }
        onTriggerExportGlb={() => setExportGlbTrigger((c) => c + 1)}
        onTriggerExportUsdz={() => setExportUsdzTrigger((c) => c + 1)}
        outfitHistoryCount={outfitHistory.length}
        onToggleHistoryModal={() => setIsHistoryModalOpen((prev) => !prev)}
        onRandomShuffleOutfit={handleRandomOutfitShuffle}
        onTriggerSocialShare={() => setCaptureSnapshotTrigger((c) => c + 1)}
      />

      {/* Row 2: Dedicated Occasion & Outfit Selector Strip inside Mannequin Tab (Never overlaps 3D model) */}
      {!isArMode && !isSplitCompareMode && (
        <div className="shrink-0 bg-white border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-20">
          {/* Left: Occasion Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-0.5">
              Hoàn cảnh:
            </span>
            {OCCASIONS.map((occ) => {
              const active = studioOccasion === occ.value;
              return (
                <button
                  key={occ.value}
                  type="button"
                  onClick={() => handleSelectStudioOccasion(occ.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                >
                  <span>{occ.emoji}</span>
                  <span>{occ.label}</span>
                </button>
              );
            })}
          </div>

          {/* Center/Right: Occasion-Matched Outfits + AI Recommend Button + Sidebar Toggle */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full ml-auto">
            <span className="hidden xl:inline text-[11px] font-semibold text-slate-500 whitespace-nowrap">
              Trang phục {occMeta.emoji} {occMeta.label}:
            </span>
            {currentOccasionPresets.map((preset) => {
              const isSelected = activeOccasionPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyOccasionPreset(preset)}
                  title={preset.reason}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-rose-50/70 hover:bg-slate-900 hover:text-white text-slate-800 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    {preset.swatchColors.slice(0, 2).map((hex, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-black/20"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <span>{preset.name}</span>
                </button>
              );
            })}

            {onRequestAiOccasionOutfits && (
              <button
                type="button"
                onClick={onRequestAiOccasionOutfits}
                disabled={isGeneratingAiOutfits}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                {isGeneratingAiOutfits ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>AI Gợi ý đồ {occMeta.label}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSidePanels((prev) => !prev)}
              title={
                showSidePanels
                  ? 'Thu gọn bảng điều khiển 2 bên'
                  : 'Mở bảng điều khiển 2 bên'
              }
              aria-label={
                showSidePanels
                  ? 'Thu gọn bảng điều khiển 2 bên'
                  : 'Mở bảng điều khiển 2 bên'
              }
              className="hidden md:flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shrink-0 cursor-pointer"
            >
              {showSidePanels ? (
                <PanelLeftClose className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Row 3: Main 3-Column Non-Overlapping Workspace (Left Sidebar | Central 3D Mannequin | Right Sidebar) */}
      <div className="relative flex-1 flex min-h-0 w-full overflow-hidden">
        {/* LEFT COLUMN: Gender, Body Measurements, Hairstyle & Makeup (Never covers 3D Mannequin) */}
        {showSidePanels && !isArMode && !isSplitCompareMode && (
          <aside className="hidden md:flex flex-col gap-2 w-[248px] shrink-0 h-full overflow-y-auto bg-white border-r border-slate-200 p-2.5 z-10">
            {/* Active Gender Tab (Single Pre-Selected Gender) + Zoom Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-900 text-white">
                  {body.genderProfile === 'male'
                    ? 'Mẫu Nam (BMI)'
                    : 'Mẫu Nữ (3 Vòng)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCameraPreset((prev) =>
                    prev === 'upper_detail' ? 'full_front' : 'upper_detail'
                  )
                }
                className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {cameraPreset === 'upper_detail'
                  ? 'Góc Toàn Thân'
                  : 'Zoom Cận Mặt'}
              </button>
            </div>

            {/* Direct Height (100-300cm) & Weight (20-500kg) Range Sliders */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-600 font-medium">Chiều cao</span>
                  <span className="font-mono font-bold text-slate-900">
                    {body.heightCm} cm
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={300}
                  step={1}
                  value={body.heightCm}
                  onChange={(e) =>
                    handleUpdateHeightWeight(
                      Number(e.target.value),
                      body.weightKg
                    )
                  }
                  className="w-full studio-slider"
                />
              </div>

              <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-600 font-medium">Cân nặng</span>
                  <span className="font-mono font-bold text-slate-900">
                    {body.weightKg} kg
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={500}
                  step={1}
                  value={body.weightKg}
                  onChange={(e) =>
                    handleUpdateHeightWeight(
                      body.heightCm,
                      Number(e.target.value)
                    )
                  }
                  className="w-full studio-slider"
                />
              </div>
            </div>

            {/* Hairstyle Dropdown + Quick Buttons & Color Swatches */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="popup-hairstyle-select"
                  className="block text-[11px] font-semibold text-slate-800"
                >
                  {body.genderProfile === 'male'
                    ? 'Kiểu Tóc Nam'
                    : 'Kiểu Tóc Nữ'}
                </label>
                <div className="flex items-center gap-1">
                  {HAIR_COLOR_SWATCHES.slice(0, 6).map((hc) => (
                    <button
                      key={hc.hex}
                      type="button"
                      title={hc.name}
                      onClick={() =>
                        handleUpdateBodyField('hairColorHex', hc.hex)
                      }
                      className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                        body.hairColorHex.toLowerCase() ===
                        hc.hex.toLowerCase()
                          ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 border-slate-400'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hc.hex }}
                    />
                  ))}
                  <label
                    title="Tự chọn màu tóc bất kỳ"
                    className="relative w-4 h-4 rounded-full border border-indigo-400 overflow-hidden cursor-pointer shadow-xs"
                    style={{ backgroundColor: body.hairColorHex }}
                  >
                    <input
                      type="color"
                      value={body.hairColorHex}
                      onChange={(e) =>
                        handleUpdateBodyField('hairColorHex', e.target.value)
                      }
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <select
                id="popup-hairstyle-select"
                value={body.hairstyleId}
                onChange={(e) =>
                  handleUpdateBodyField(
                    'hairstyleId',
                    e.target.value as HairstyleId
                  )
                }
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
              >
                {HAIRSTYLE_OPTIONS.filter(
                  (h) =>
                    h.genderHint ===
                      (body.genderProfile === 'male' ? 'male' : 'female') ||
                    h.genderHint === 'unisex'
                ).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditional Gender Body Shape + Female 3D Makeup Studio Section */}
            {body.genderProfile !== 'male' ? (
              <>
                <div className="p-2 bg-rose-50/70 border border-rose-200/80 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-rose-950">
                      Trang Điểm Nữ &amp; Lens Mắt 3D
                    </span>
                    <div className="flex items-center gap-1">
                      {EYE_LENS_SWATCHES.map((lens) => (
                        <button
                          key={lens.hex}
                          type="button"
                          title={`Màu mắt: ${lens.name}`}
                          onClick={() =>
                            handleUpdateBodyField('eyeColorHex', lens.hex)
                          }
                          className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                            body.eyeColorHex.toLowerCase() ===
                            lens.hex.toLowerCase()
                              ? 'ring-2 ring-rose-700 ring-offset-1 scale-110 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: lens.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 6 Makeup Style Presets */}
                  <div className="grid grid-cols-3 gap-1">
                    {MAKEUP_PRESETS.map((mp) => (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() =>
                          handleUpdateBodyField('makeup', { ...mp.config })
                        }
                        className={`px-1.5 py-1 text-[10px] font-medium rounded border truncate transition-colors cursor-pointer ${
                          body.makeup.presetId === mp.id
                            ? 'bg-rose-700 text-white border-rose-700'
                            : 'bg-white text-slate-700 border-rose-200/80 hover:bg-rose-50'
                        }`}
                      >
                        {mp.name}
                      </button>
                    ))}
                  </div>

                  {/* Lipstick Color Swatches + Lip Gloss Toggle (Clean 2-row non-overflowing layout) */}
                  <div className="space-y-1 pt-1 border-t border-rose-100">
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="font-semibold text-rose-950">Màu son môi:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateBodyField('makeup', {
                            ...body.makeup,
                            lipGloss: body.makeup.lipGloss > 0.5 ? 0.15 : 0.85,
                          })
                        }
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors cursor-pointer shrink-0 ${
                          body.makeup.lipGloss > 0.5
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-rose-800 border-rose-300 hover:bg-rose-50'
                        }`}
                      >
                        {body.makeup.lipGloss > 0.5 ? '✨ Son Bóng' : '💄 Son Lì'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      {LIPSTICK_SWATCHES.map((lip) => (
                        <button
                          key={lip.hex}
                          type="button"
                          title={lip.name}
                          onClick={() =>
                            handleUpdateBodyField('makeup', {
                              ...body.makeup,
                              lipColorHex: lip.hex,
                              lipIntensity: Math.max(
                                0.68,
                                body.makeup.lipIntensity
                              ),
                            })
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer shrink-0 ${
                            body.makeup.lipColorHex.toLowerCase() ===
                            lip.hex.toLowerCase()
                              ? 'ring-2 ring-rose-950 ring-offset-1 scale-110 border-white'
                              : 'border-rose-200 hover:scale-105'
                          }`}
                          style={{ backgroundColor: lip.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200/90 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-800">
                      Số đo 3 Vòng Nữ:
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                      <span>{fitAnalysis.bodyShapeName}</span>
                      <button
                        type="button"
                        onClick={() => setIsBodyGuideOpen(true)}
                        title="Xem Cẩm nang Dáng người & Mẹo phối đồ"
                        className="p-0.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>Ngực</span>
                        <span className="font-mono font-semibold">
                          {body.chestCm}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={62}
                        max={160}
                        value={body.chestCm}
                        onChange={(e) =>
                          handleUpdateBodyField(
                            'chestCm',
                            Number(e.target.value)
                          )
                        }
                        className="w-full studio-slider"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>Eo</span>
                        <span className="font-mono font-semibold">
                          {body.waistCm}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={46}
                        max={150}
                        value={body.waistCm}
                        onChange={(e) =>
                          handleUpdateBodyField(
                            'waistCm',
                            Number(e.target.value)
                          )
                        }
                        className="w-full studio-slider"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>Hông</span>
                        <span className="font-mono font-semibold">
                          {body.hipCm}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={68}
                        max={165}
                        value={body.hipCm}
                        onChange={(e) =>
                          handleUpdateBodyField(
                            'hipCm',
                            Number(e.target.value)
                          )
                        }
                        className="w-full studio-slider"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-200/90 rounded-lg">
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="font-semibold text-slate-800">
                    Chỉ số BMI Nam:{' '}
                    <strong className="font-mono">{fitAnalysis.bmi}</strong>
                  </span>
                  <span className="font-bold text-blue-700">
                    Size {fitAnalysis.recommendedSize}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-900">
                  <span>{fitAnalysis.bodyShapeName}</span>
                  <button
                    type="button"
                    onClick={() => setIsBodyGuideOpen(true)}
                    title="Xem Cẩm nang Dáng người & Mẹo phối đồ"
                    className="p-0.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Automated Location Weather Lookup & Outerwear / Fabric Suggestion Advisor (Never covers 3D Mannequin) */}
            <div className="p-2.5 bg-sky-50/75 border border-sky-200/90 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-sky-950 truncate">
                  <Thermometer className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">Thời Tiết &amp; Gợi Ý Áo Khoác / Vải</span>
                </div>
                <button
                  type="button"
                  disabled={isFetchingWeather}
                  onClick={() => handleDetectUserLocationWeather(true)}
                  title="Tự động định vị GPS & cập nhật thời tiết thực tế tại vị trí của bạn"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-[9px] font-bold cursor-pointer shrink-0"
                >
                  {isFetchingWeather ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-2.5 h-2.5" />
                  )}
                  <span>GPS</span>
                </button>
              </div>

              {/* Live Weather Telemetry Summary */}
              <div className="p-2 rounded-lg bg-white border border-sky-200/80 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0 text-[10px] font-bold text-slate-900">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="truncate">{liveWeather.locationName}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-sky-900 text-white font-mono text-[10px] font-bold shrink-0">
                    {liveWeather.temperatureC}°C
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 flex items-center justify-between gap-1">
                  <span className="truncate">{liveWeather.conditionText}</span>
                  <span className="font-mono text-[9px] text-slate-500 shrink-0">
                    Ẩm {liveWeather.humidityPercent}% · Gió {liveWeather.windSpeedKmh}km/h
                  </span>
                </div>

                {/* Quick City Selector Pills */}
                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                  {WEATHER_CITY_PRESETS.slice(0, 6).map((city) => {
                    const isCurrentCity = weatherLocationInput
                      .toLowerCase()
                      .includes(city.label.toLowerCase());
                    return (
                      <button
                        key={city.id}
                        type="button"
                        disabled={isFetchingWeather}
                        onClick={() =>
                          handleLookupWeatherByLocation(
                            city.query,
                            undefined,
                            undefined,
                            true
                          )
                        }
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer ${
                          isCurrentCity
                            ? 'bg-sky-700 text-white'
                            : 'bg-slate-100 hover:bg-sky-100 text-slate-700'
                        }`}
                      >
                        {city.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Non-Overlapping 3D Weather Mode & Sliders (Adjusts Wind/Rain without covering Mannequin) */}
              <div className="p-2 rounded-lg bg-white border border-sky-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-700">
                    Hiệu ứng 3D:
                  </span>
                  <div className="flex items-center gap-0.5">
                    {(
                      [
                        { id: 'clear', label: 'Studio', icon: Sun },
                        { id: 'wind', label: 'Gió', icon: Wind },
                        { id: 'rain', label: 'Mưa', icon: CloudRain },
                        { id: 'storm', label: 'Bão', icon: CloudLightning },
                      ] as const
                    ).map((m) => {
                      const Icon = m.icon;
                      const active = weatherEffect.mode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setWeatherEffect((prev) => ({
                              ...prev,
                              mode: m.id,
                              windIntensity:
                                m.id === 'wind' && prev.windIntensity < 20
                                  ? 60
                                  : m.id === 'storm' && prev.windIntensity < 55
                                  ? 80
                                  : prev.windIntensity,
                              rainIntensity:
                                m.id === 'rain' && prev.rainIntensity < 20
                                  ? 65
                                  : m.id === 'storm' && prev.rainIntensity < 55
                                  ? 80
                                  : prev.rainIntensity,
                            }))
                          }
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            active
                              ? 'bg-sky-700 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {weatherEffect.mode !== 'clear' && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 text-[10px]">
                    {(weatherEffect.mode === 'wind' ||
                      weatherEffect.mode === 'storm') && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <div className="flex justify-between text-slate-600">
                            <span>Sức gió</span>
                            <span className="font-mono font-bold text-sky-700">
                              {weatherEffect.windIntensity}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={weatherEffect.windIntensity}
                            onChange={(e) =>
                              setWeatherEffect((prev) => ({
                                ...prev,
                                windIntensity: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-sky-600 cursor-pointer h-1"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600">
                            <span>Hướng gió</span>
                            <span className="font-mono font-bold text-sky-700">
                              {weatherEffect.windDirectionDeg}°
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            step={5}
                            value={weatherEffect.windDirectionDeg}
                            onChange={(e) =>
                              setWeatherEffect((prev) => ({
                                ...prev,
                                windDirectionDeg: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-sky-600 cursor-pointer h-1"
                          />
                        </div>
                      </div>
                    )}
                    {(weatherEffect.mode === 'rain' ||
                      weatherEffect.mode === 'storm') && (
                      <div>
                        <div className="flex justify-between text-slate-600">
                          <span>Lượng mưa &amp; độ thấm</span>
                          <span className="font-mono font-bold text-blue-700">
                            {weatherEffect.rainIntensity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={weatherEffect.rainIntensity}
                          onChange={(e) =>
                            setWeatherEffect((prev) => ({
                              ...prev,
                              rainIntensity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-600 cursor-pointer h-1"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Automated Outerwear & Fabric Recommendations */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-sky-950 leading-snug bg-white/90 p-1.5 rounded-lg border border-sky-200/70">
                  <div className="font-semibold text-sky-900">
                    Đang mặc: {weatherOutfitAdvisor.currentOuterName} · Vải{' '}
                    {weatherOutfitAdvisor.currentTopFabricName}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    {weatherOutfitAdvisor.outerwearReason}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyWeatherOuterwearSuggestion}
                  className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-white hover:bg-sky-700 hover:text-white text-sky-950 border border-sky-300 text-[10px] font-bold transition-colors cursor-pointer text-left"
                >
                  <span className="truncate">
                    🧥 {weatherOutfitAdvisor.outerwearActionTitle}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyWeatherFabricSuggestion}
                  title={weatherOutfitAdvisor.fabricReason}
                  className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-white hover:bg-indigo-700 hover:text-white text-indigo-950 border border-indigo-200 text-[10px] font-bold transition-colors cursor-pointer text-left"
                >
                  <span className="truncate">
                    <Layers className="w-3 h-3 inline mr-1 text-indigo-600" />
                    {weatherOutfitAdvisor.fabricActionTitle}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyFullWeatherRecommendation}
                  className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-[10px] font-bold shadow-2xs transition-all cursor-pointer text-center"
                >
                  ✨ Áp Dụng Trọn Bộ Áo Khoác &amp; Vải Theo Thời Tiết
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* CENTER COLUMN: 3D Mannequin Viewport (flex-1) + Bottom Control Dock (shrink-0, Never Overlaps Mannequin) */}
        <main className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <div className="relative flex-1 min-h-0 w-full overflow-hidden">
            {/* Full Outfit History Review & Delete Modal */}
            {isHistoryModalOpen && (
              <div className="absolute top-3 right-3 z-50 flex items-start justify-end pointer-events-none">
                <div className="pointer-events-auto w-[min(460px,94vw)] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
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
                          Xem lại các bộ trang phục đã lưu, mặc thử lại hoặc xoá bớt
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
                                  title="Xoá bộ trang phục này"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Xoá</span>
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
                                    {isCurrentActive ? 'Đang mặc' : 'Mặc lại'}
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

            {/* Random Outfit Shuffle / Occasion Toast Banner */}
            {shuffleStatusToast && (
              <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/95 text-white border border-violet-400/40 shadow-lg text-xs font-medium max-w-md">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="truncate">{shuffleStatusToast}</span>
              </div>
            )}

            {/* Automatic Floating 360-Degree Garment Preview Card */}
            {is360GarmentPreviewOpen &&
              uploadedGarmentsInventory.length > 0 &&
              !isArMode && (
                <div className="absolute top-14 right-3 z-40 flex flex-col items-end justify-start">
                  <Garment360Preview
                    items={uploadedGarmentsInventory}
                    activeItemId={active360GarmentId || undefined}
                    onSelectItem={(item) => setActive360GarmentId(item.id)}
                    onApplyItemToMannequin={handleApplySingleExtractedGarment}
                    onApplyAllItemsToMannequin={
                      handleApplyMultipleExtractedGarments
                    }
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
              onSelectCameraPreset={handleSelectCameraPreset}
              lightingPreset={lightingPreset}
              showMeasurementTape={showMeasurementTape}
              resetTrigger={cameraResetTrigger}
              onResetToTPose={handleStandStillPose}
              isArMode={isArMode}
              onToggleArMode={() => {
                setIsArMode((prev) => {
                  const next = !prev;
                  if (next) {
                    setIsDockCollapsed(true);
                    setIsSplitCompareMode(false);
                  }
                  return next;
                });
              }}
              isSplitCompareMode={isSplitCompareMode}
              onToggleSplitCompareMode={handleToggleSplitCompareMode}
              compareOutfitB={compareOutfitB}
              outfitHistory={outfitHistory}
              activeHistoryIdA={activeHistoryId}
              activeHistoryIdB={activeHistoryIdB}
              onSelectCompareHistoryA={handleApplyHistoryEntry}
              onSelectCompareHistoryB={handleSelectCompareHistoryB}
              onUpdateOutfitA={(next) => {
                setOutfit(next);
                setActiveHistoryId(null);
              }}
              onUpdateCompareOutfitB={(next) => {
                setCompareOutfitB(next);
                setActiveHistoryIdB(null);
              }}
              weatherEffect={weatherEffect}
              onUpdateWeatherEffect={setWeatherEffect}
              lastAiPoseResult={lastAiPoseResult}
              onDismissAiPoseResult={() => setLastAiPoseResult(null)}
              showRightPanelToggle={
                showSidePanels && !isArMode && !isSplitCompareMode
              }
              isRightPanelOpen={
                showSidePanels && !isArMode && !isSplitCompareMode && isRightPanelOpen
              }
              onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
              videoWalkthroughTrigger={videoWalkthroughTrigger}
              exportGlbTrigger={exportGlbTrigger}
              exportUsdzTrigger={exportUsdzTrigger}
              onRandomShuffleOutfit={handleRandomOutfitShuffle}
              captureSnapshotTrigger={captureSnapshotTrigger}
              onSnapshotCaptured={(dataUrl) => {
                setSnapshotDataUrl(dataUrl);
                setIsShareModalOpen(true);
              }}
            />
          </div>

          <BottomControlDock
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isCollapsed={isDockCollapsed}
            onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
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
            onToggleMeasurementTape={() => setShowMeasurementTape((prev) => !prev)}
            weatherEffect={weatherEffect}
            onUpdateWeatherEffect={setWeatherEffect}
            onGenerateAiPose={handleGenerateAiPose}
            isGeneratingPose={isGeneratingPose}
            lastAiPoseResult={lastAiPoseResult}
            uploadedGarmentsInventory={uploadedGarmentsInventory}
            onRegisterUploadedGarments={handleRegisterUploadedGarments}
            onOpenGarment360Preview={handleOpenGarment360Preview}
            onRandomShuffleOutfit={handleRandomOutfitShuffle}
            onTriggerMannequin360Video={() =>
              setVideoWalkthroughTrigger((c) => c + 1)
            }
            onOpenBodyShapeGuide={() => setIsBodyGuideOpen(true)}
            onCapture2DSnapshot={() => setCaptureSnapshotTrigger((c) => c + 1)}
          />
        </main>

        {/* RIGHT COLUMN: 1. Top Outfit Score Tab (Tab Điểm) -> 2. Below Score Tab: Suggestion Tab (Tab Gợi Ý & Phối Đồ AI) */}
        {showSidePanels && !isArMode && !isSplitCompareMode && isRightPanelOpen && (
          <aside className="flex flex-col gap-1.5 w-[200px] shrink-0 h-full overflow-y-auto bg-white border-l border-slate-200 p-1.5 z-20 max-lg:absolute max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:shadow-2xl">
            {/* 1. TAB ĐIỂM (Always at the very top of the right corner) */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setShowRightScoreDetail((prev) => !prev)}
                aria-expanded={showRightScoreDetail}
                title={
                  showRightScoreDetail
                    ? 'Nhấn lần nữa để đóng bảng Chấm Điểm Outfit Trực Quan'
                    : 'Nhấn để mở bảng Chấm Điểm Outfit Trực Quan'
                }
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-white shadow-sm border transition-all cursor-pointer ${
                  showRightScoreDetail
                    ? 'bg-emerald-900 border-emerald-400/50 ring-2 ring-emerald-400/30'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    Điểm Outfit:
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {score.totalScore}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-semibold text-amber-200 shrink-0">
                  Hạng {score.grade}
                </span>
              </button>

              {showRightScoreDetail && (
                <div className="mt-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 shadow-md text-slate-800 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <Award className="w-3 h-3 shrink-0 text-amber-500" />
                        <span>Chấm Điểm Outfit Trực Quan</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-900 truncate mt-0.5">
                        {score.verdictTitle}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRightScoreDetail(false)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 hover:bg-rose-500 text-slate-700 hover:text-white font-mono text-xs font-bold leading-none transition-colors cursor-pointer shrink-0"
                      title="Đóng bảng điểm (-)"
                    >
                      -
                    </button>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <div>
                      <div className="flex justify-between text-slate-700 mb-0.5">
                        <span>Độ vừa vặn hình thể</span>
                        <span className="font-mono font-semibold text-emerald-700">
                          {score.fitScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${score.fitScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-700 mb-0.5">
                        <span>Hài hòa màu sắc</span>
                        <span className="font-mono font-semibold text-blue-700">
                          {score.colorHarmonyScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${score.colorHarmonyScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-700 mb-0.5">
                        <span>Phối chất liệu vải</span>
                        <span className="font-mono font-semibold text-indigo-700">
                          {score.fabricBalanceScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${score.fabricBalanceScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-700 mb-0.5">
                        <span>Đồng bộ Kiểu tóc &amp; Dáng</span>
                        <span className="font-mono font-semibold text-amber-600">
                          {score.styleSynergyScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${score.styleSynergyScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 text-[10px] text-slate-600 leading-snug italic">
                    💡 {score.stylistAdvice}
                  </div>
                </div>
              )}
            </div>

            {/* 2. TAB GỢI Ý & PHỐI ĐỒ AI (Positioned directly BELOW Tab Điểm with "-" close button) */}
            <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950 text-white shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold truncate">
                  Tab Gợi Ý &amp; Phối Đồ AI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRightPanelOpen(false)}
                title="Đóng tab gợi ý bên góc phải màn hình (-)"
                aria-label="Đóng tab gợi ý bên góc phải màn hình"
                className="w-6 h-5 flex items-center justify-center rounded bg-white/15 hover:bg-rose-500 text-white font-mono text-sm font-bold leading-none transition-colors cursor-pointer shrink-0"
              >
                -
              </button>
            </div>

            {/* Quick Search Input for Outfits, Hairstyles, & Accessories */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                value={rightSearchQuery}
                onChange={(e) => setRightSearchQuery(e.target.value)}
                placeholder="Tìm trang phục, kiểu tóc..."
                className="w-full pl-8 pr-7 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white transition-all"
              />
              {rightSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRightSearchQuery('')}
                  title="Xoá tìm kiếm"
                  className="absolute right-2 top-1 text-slate-400 hover:text-slate-700 font-mono text-xs font-bold shrink-0"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Instant Search Results Panel */}
            {rightSearchQuery.trim().length > 0 && (
              <div className="p-2 rounded-xl bg-indigo-50/90 border border-indigo-200 space-y-1.5 shrink-0 max-h-[260px] overflow-y-auto shadow-sm">
                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-900 border-b border-indigo-200/80 pb-1">
                  <span>Kết quả tìm kiếm ({searchResults.length})</span>
                  <span className="text-indigo-600 font-mono truncate max-w-[90px]">
                    &ldquo;{rightSearchQuery}&rdquo;
                  </span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="py-3 text-center text-[10px] text-slate-500 italic">
                    Không tìm thấy trang phục hoặc phụ kiện khớp với từ khoá này.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={res.action}
                        className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-white hover:bg-indigo-600 hover:text-white border border-indigo-100 text-left transition-colors cursor-pointer group"
                      >
                        <span className="text-[11px] font-semibold text-slate-800 group-hover:text-white truncate">
                          {res.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 group-hover:bg-indigo-700 text-indigo-800 group-hover:text-indigo-100 shrink-0">
                          {res.categoryLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Occasion-Specific Outfits Selector inside Right Panel */}
            <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-rose-950 truncate">
                  {occMeta.emoji} Trang phục {occMeta.label}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleRandomOutfitShuffle}
                    title="Phối ngẫu nhiên"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[10px] font-bold transition-all cursor-pointer shrink-0"
                  >
                    <Shuffle className="w-2.5 h-2.5" />
                    <span>Shuffle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRightOccasion((prev) => !prev)}
                    title={showRightOccasion ? 'Thu gọn mục này (-)' : 'Mở rộng mục này (+)'}
                    className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-rose-200 text-rose-900 border border-rose-200 font-mono text-xs font-bold leading-none cursor-pointer shrink-0"
                  >
                    {showRightOccasion ? '-' : '+'}
                  </button>
                </div>
              </div>
              {showRightOccasion && (
              <div className="space-y-1">
                {currentOccasionPresets.map((preset) => {
                  const active = activeOccasionPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyOccasionPreset(preset)}
                      className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white hover:bg-rose-100/70 text-slate-800 border-rose-200/80'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold truncate">
                          {preset.name}
                        </div>
                        <div
                          className={`text-[9px] truncate ${
                            active ? 'text-amber-300' : 'text-rose-700'
                          }`}
                        >
                          {preset.tag}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {preset.swatchColors.map((hex, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              )}
            </div>

            {/* General Studio Lookbook Presets */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-semibold text-slate-700 truncate">
                  {body.genderProfile === 'male'
                    ? 'Bộ Sưu Tập Nam Cơ Bản'
                    : 'Bộ Sưu Tập Nữ Cơ Bản'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowRightCollection((prev) => !prev)}
                  title={showRightCollection ? 'Thu gọn bộ sưu tập (-)' : 'Mở bộ sưu tập (+)'}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-mono text-xs font-bold leading-none cursor-pointer shrink-0"
                >
                  {showRightCollection ? '-' : '+'}
                </button>
              </div>
              {showRightCollection && (
              <div className="grid grid-cols-2 gap-1">
                {SUGGESTED_OUTFIT_PRESETS.filter(
                  (preset) =>
                    preset.genderHint ===
                    (body.genderProfile === 'male' ? 'male' : 'female')
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setActiveOccasionPresetId(null);
                      setOutfit({
                        ...preset.outfit,
                        selectedSize: body.genderProfile === 'male' ? 'L' : 'S',
                        hideAllGarments: false,
                      });
                    }}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded transition-colors cursor-pointer truncate text-left"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              )}
            </div>

            {/* Temporary Outfit History & Quick Comparison Section */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-900">
                  <History className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Lịch sử ({outfitHistory.length})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleToggleSplitCompareMode}
                    title="So sánh song song 2 cấu hình trên 2 nửa màn hình"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-600 text-indigo-900 hover:text-white border border-indigo-200 rounded transition-colors cursor-pointer"
                  >
                    <Columns2 className="w-2.5 h-2.5" />
                    <span>Đôi A|B</span>
                  </button>
                  {outfitHistory.length >= 2 && (
                    <button
                      type="button"
                      onClick={handleQuickFlipAB}
                      title="Đảo nhanh giữa 2 bộ phối gần nhất"
                      className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white rounded transition-colors cursor-pointer"
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      <span>A↔B</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCurrentOutfit}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors cursor-pointer"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    <span>Lưu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRightHistory((prev) => !prev)}
                    title={showRightHistory ? 'Thu gọn lịch sử (-)' : 'Mở lịch sử (+)'}
                    className="w-4 h-4 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-mono text-[11px] font-bold leading-none cursor-pointer shrink-0"
                  >
                    {showRightHistory ? '-' : '+'}
                  </button>
                </div>
              </div>

              {showRightHistory && (
                outfitHistory.length === 0 ? (
                <div className="text-[10px] text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg px-2 py-1.5 text-center">
                  Nhấn <strong>&ldquo;Lưu&rdquo;</strong> để lưu tạm các lựa chọn và so sánh song song trên người mẫu 3D.
                </div>
              ) : (
                <div className="space-y-1 max-h-[115px] overflow-y-auto pr-0.5">
                  {outfitHistory.map((entry, idx) => {
                    const isCurrentActive = activeHistoryId === entry.id;
                    const diff = entry.score.totalScore - score.totalScore;
                    return (
                      <div
                        key={entry.id}
                        onClick={() => handleApplyHistoryEntry(entry)}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          isCurrentActive
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 hover:bg-indigo-50/70 text-slate-800 border-slate-200/90'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-[10px] font-mono font-bold px-1 rounded shrink-0 ${
                              isCurrentActive
                                ? 'bg-indigo-500 text-white'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            #{outfitHistory.length - idx}
                          </span>
                          <span className="text-[11px] font-medium truncate">
                            {entry.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                          <button
                            type="button"
                            title="So sánh song song bộ này ở Khung B"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCompareHistoryB(entry);
                            }}
                            className={`px-1 py-0.2 text-[9px] font-bold rounded cursor-pointer ${
                              isCurrentActive
                                ? 'bg-white/15 hover:bg-indigo-500 text-white'
                                : 'bg-indigo-100 hover:bg-indigo-600 text-indigo-800 hover:text-white'
                            }`}
                          >
                            So B
                          </button>
                          <span className="font-bold">
                            {entry.score.totalScore}đ
                          </span>
                          {!isCurrentActive && diff !== 0 && (
                            <span
                              className={`px-1 rounded font-bold ${
                                diff > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          )}
                          <button
                            type="button"
                            title="Xóa"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistoryEntry(entry.id);
                            }}
                            className={`p-0.5 rounded cursor-pointer ${
                              isCurrentActive
                                ? 'text-slate-300 hover:text-white'
                                : 'text-slate-400 hover:text-red-600'
                            }`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
              )}
            </div>

            {/* Quick Pose AI Generator Box */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1 truncate">
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">Pose AI (Tư thế tự nhiên)</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('pose');
                      setIsDockCollapsed(false);
                    }}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Mở 17 khớp
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRightPoseAi((prev) => !prev)}
                    title={showRightPoseAi ? 'Thu gọn Pose AI (-)' : 'Mở Pose AI (+)'}
                    className="w-4 h-4 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-mono text-[11px] font-bold leading-none cursor-pointer"
                  >
                    {showRightPoseAi ? '-' : '+'}
                  </button>
                </div>
              </div>

              {showRightPoseAi && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!quickPosePrompt.trim() || isGeneratingPose) return;
                      handleGenerateAiPose(quickPosePrompt.trim());
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      value={quickPosePrompt}
                      onChange={(e) => setQuickPosePrompt(e.target.value)}
                      placeholder="VD: đang ngồi bắt chéo chân, chống nạnh..."
                      className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={isGeneratingPose || !quickPosePrompt.trim()}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      {isGeneratingPose ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span>Tạo dáng</span>
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-1">
                    {POSE_AI_SUGGESTION_PROMPTS.slice(0, 4).map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        disabled={isGeneratingPose}
                        onClick={() => {
                          setQuickPosePrompt(chip.prompt);
                          handleGenerateAiPose(chip.prompt);
                        }}
                        className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 transition-colors cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Quick Upload Garment Image Button + Upload-Matched Suggestions + Color Palette AI */}
            <div className="pt-1.5 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  ref={quickUploadRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQuickGarmentUpload}
                  className="hidden"
                />
                <span className="text-[10px] text-slate-600 font-medium truncate">
                  {outfit.outerwear.transformedSummary ||
                  outfit.top.transformedSummary ||
                  outfit.bottom.transformedSummary
                    ? `AI 3D: ${
                        outfit.outerwear.transformedSummary ||
                        outfit.top.transformedSummary ||
                        outfit.bottom.transformedSummary
                      }`
                    : 'Tải ảnh quần áo để AI dựng 3D'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {uploadedGarmentsInventory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIs360GarmentPreviewOpen((prev) => !prev)}
                      title="Xem xoay 360° món đồ vừa tải lên"
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>360° Đồ</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isQuickUploading}
                    onClick={() => quickUploadRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{isQuickUploading ? 'Đang xử lý...' : 'Upload Đồ'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Upload-Matched Outfit Recommendations */}
              <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200/80 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-blue-950 flex items-center gap-1 truncate">
                    <Shirt className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="truncate">
                      {hasUploadedPiece
                        ? 'Phối hợp với đồ vừa Upload:'
                        : 'Phối đồ ăn ý với món đang mặc:'}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('wardrobe');
                        setIsDockCollapsed(false);
                      }}
                      className="text-[9px] font-semibold text-blue-700 hover:underline cursor-pointer"
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRightUploadMatch((prev) => !prev)}
                      title={showRightUploadMatch ? 'Đóng gợi ý phối đồ (-)' : 'Mở gợi ý phối đồ (+)'}
                      className="w-4 h-4 flex items-center justify-center rounded bg-white hover:bg-blue-200 text-blue-900 border border-blue-200 font-mono text-[11px] font-bold leading-none cursor-pointer"
                    >
                      {showRightUploadMatch ? '-' : '+'}
                    </button>
                  </div>
                </div>
                {showRightUploadMatch && (
                <div className="grid grid-cols-2 gap-1">
                  {quickUploadRecommendations.slice(0, 2).map((rec) => (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => {
                        setOutfit(rec.outfit);
                        setActiveHistoryId(null);
                      }}
                      className="p-1.5 rounded bg-white hover:bg-blue-600 hover:text-white text-slate-800 border border-blue-200/80 text-left transition-colors cursor-pointer"
                    >
                      <div className="text-[10px] font-bold truncate">
                        {rec.title}
                      </div>
                      <div className="text-[9px] opacity-80 truncate">
                        {rec.styleTag}
                      </div>
                    </button>
                  ))}
                </div>
                )}
              </div>

              {/* Quick Color Palette Generator Strip */}
              <div className="p-2 rounded-lg bg-violet-50/70 border border-violet-200/80 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-violet-950 flex items-center gap-1 truncate">
                    <Palette className="w-3 h-3 text-violet-600 shrink-0" />
                    <span className="truncate">Color Palette AI:</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('wardrobe');
                        setIsDockCollapsed(false);
                      }}
                      className="text-[9px] font-semibold text-violet-700 hover:underline cursor-pointer"
                    >
                      Mở 5 hệ màu
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRightColorPalette((prev) => !prev)}
                      title={showRightColorPalette ? 'Đóng gợi ý màu (-)' : 'Mở gợi ý màu (+)'}
                      className="w-4 h-4 flex items-center justify-center rounded bg-white hover:bg-violet-200 text-violet-900 border border-violet-200 font-mono text-[11px] font-bold leading-none cursor-pointer"
                    >
                      {showRightColorPalette ? '-' : '+'}
                    </button>
                  </div>
                </div>
                {showRightColorPalette && (
                <div className="grid grid-cols-3 gap-1">
                  {quickColorPalettes.palettes.slice(0, 3).map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      title={`${pal.paletteName} — ${pal.theoryExplanation}`}
                      onClick={() => {
                        setOutfit((prev) => ({
                          ...prev,
                          hideAllGarments: false,
                          top: { ...prev.top, colorHex: pal.topColorHex },
                          outerwear: {
                            ...prev.outerwear,
                            colorHex: pal.outerwearColorHex,
                          },
                          bottom: {
                            ...prev.bottom,
                            colorHex: pal.bottomColorHex,
                          },
                          footwear: {
                            ...prev.footwear,
                            colorHex: pal.footwearColorHex,
                          },
                        }));
                        setActiveHistoryId(null);
                      }}
                      className="p-1 rounded bg-white hover:bg-violet-600 hover:text-white text-slate-800 border border-violet-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="text-[9px] font-bold truncate">
                        {pal.schemeLabel}
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {pal.swatches.slice(0, 4).map((sw, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: sw.hex }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Body Shape Educational Guide Modal */}
      <BodyShapeGuideModal
        isOpen={isBodyGuideOpen}
        onClose={() => setIsBodyGuideOpen(false)}
        userBodyType={mapStudioShapeNameToBodyType(
          fitAnalysis.bodyShapeName,
          body.genderProfile === 'male' ? 'male' : 'female'
        )}
        userGender={body.genderProfile === 'male' ? 'male' : 'female'}
        userMeasurements={{
          heightCm: body.heightCm,
          weightKg: body.weightKg,
          bmi: fitAnalysis.bmi,
          waistCm: body.waistCm,
          hipCm: body.hipCm,
          bustCm: body.chestCm,
        }}
      />

      {/* Social Media 2D Snapshot Export & Sharing Modal */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        rawSnapshotDataUrl={snapshotDataUrl}
        onRetakeSnapshot={() => setCaptureSnapshotTrigger((c) => c + 1)}
        metadata={{
          gender: body.genderProfile === 'male' ? 'male' : 'female',
          heightCm: body.heightCm,
          weightKg: body.weightKg,
          waistCm: body.waistCm,
          hipCm: body.hipCm,
          bustCm: body.chestCm,
          bodyShapeName: fitAnalysis.bodyShapeName,
          occasionLabel: occMeta.label,
          occasionEmoji: occMeta.emoji,
          outfitTitle: summarizeOutfitLabel(outfit),
          swatchColors: [
            outfit.dress && outfit.dress.styleId !== 'none'
              ? outfit.dress.colorHex
              : outfit.top.colorHex,
            ...(outfit.outerwear.styleId !== 'none'
              ? [outfit.outerwear.colorHex]
              : []),
            ...(outfit.bottom.styleId !== 'none' &&
            (!outfit.dress || outfit.dress.styleId === 'none')
              ? [outfit.bottom.colorHex]
              : []),
            outfit.footwear.colorHex,
          ],
          harmonyScore: score.totalScore,
        }}
      />
    </div>
  );
}
