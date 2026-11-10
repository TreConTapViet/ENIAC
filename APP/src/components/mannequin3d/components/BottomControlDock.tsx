import React, { useCallback, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  BookmarkPlus,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  CloudLightning,
  CloudRain,
  Columns2,
  Glasses,
  HelpCircle,
  History,
  Layers,
  Loader2,
  Move3d,
  Palette,
  RotateCcw,
  RotateCw,
  Ruler,
  Send,
  Shirt,
  ShoppingBag,
  Shuffle,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Watch,
  Wind,
  X,
  Share2,
} from 'lucide-react';
import { Garment360Preview } from './Garment360Preview';
import {
  AccessoriesConfiguration,
  ActiveDockTab,
  AiStylistLookbookRecommendation,
  AiStylistResponse,
  ArmSideChoice,
  BodyMeasurements,
  BottomStyleId,
  CameraPresetId,
  ColorPaletteAiResult,
  ColorPaletteSuggestion,
  DressStyleId,
  EulerDegrees,
  ExtractedGarmentCategory,
  ExtractedGarmentItem,
  FabricType,
  FashionTrendId,
  FitAnalysisResult,
  FitEase,
  FootwearStyleId,
  GenderProfile,
  HairstyleId,
  HandbagCarryMode,
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
  SunglassesWearPosition,
  TopStyleId,
  WatchStyleId,
  WeatherEffectConfig,
  WeatherMode,
} from '../types/studio';
import {
  ACCESSORY_LEATHER_SWATCHES,
  ACCESSORY_METAL_SWATCHES,
  analyzeAndTransformUploadedAccessory,
  analyzeAndTransformUploadedGarment,
  analyzeFabricUnderWeather,
  blendHexColors,
  BLUSH_SWATCHES,
  BOTTOM_STYLES,
  buildLocalAiStylistRecommendations,
  DEFAULT_ACCESSORIES,
  DEFAULT_WEATHER_EFFECT,
  DRESS_STYLES,
  extractGarmentsFromPhoto,
  EYE_LENS_SWATCHES,
  EYESHADOW_SWATCHES,
  FABRIC_LIBRARY,
  FASHION_SWATCHES,
  FASHION_TREND_PRESETS,
  fetchRealTimeWeatherForecast,
  FOOTWEAR_STYLES,
  generateAiStylistRecommendations,
  generateColorPalettesForOutfit,
  getRecommendedHairstyle,
  getUploadMatchedOutfitRecommendations,
  HAIR_COLOR_SWATCHES,
  HAIR_MIX_PRESETS,
  HAIRSTYLE_OPTIONS,
  HANDBAG_STYLES,
  HAT_STYLES,
  JOINT_METADATA,
  LIPSTICK_SWATCHES,
  MAKEUP_PRESETS,
  MANNEQUIN_SURFACES,
  OUTERWEAR_STYLES,
  POSE_AI_SUGGESTION_PROMPTS,
  POSE_PRESETS,
  resolvePoseAwareAccessoryAlignment,
  SUGGESTED_OUTFIT_PRESETS,
  SUNGLASSES_LENS_SWATCHES,
  SUNGLASSES_STYLES,
  synthesizeColorPalettesFromOutfit,
  TOP_STYLES,
  WATCH_STYLES,
  WEATHER_CITY_PRESETS,
} from '../data/presets';

interface BottomControlDockProps {
  activeTab: ActiveDockTab;
  onSelectTab: (tab: ActiveDockTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  body: BodyMeasurements;
  onUpdateHeightWeight: (
    heightCm: number,
    weightKg: number,
    gender?: GenderProfile
  ) => void;
  onUpdateBodyField: <K extends keyof BodyMeasurements>(
    key: K,
    value: BodyMeasurements[K]
  ) => void;
  outfit: OutfitConfiguration;
  onUpdateOutfit: (next: OutfitConfiguration) => void;
  fitAnalysis: FitAnalysisResult;
  outfitHistory: OutfitHistoryEntry[];
  activeHistoryId: string | null;
  activeHistoryIdB?: string | null;
  isSplitCompareMode?: boolean;
  onToggleSplitCompareMode?: () => void;
  onSaveCurrentOutfit: () => void;
  onApplyHistoryEntry: (entry: OutfitHistoryEntry) => void;
  onSelectCompareHistoryB?: (entry: OutfitHistoryEntry) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onClearHistory: () => void;
  posePreset: PosePresetId;
  onSelectPosePreset: (preset: PosePresetId) => void;
  selectedJoint: JointId;
  onSelectJoint: (joint: JointId) => void;
  jointRotations: JointRotationMap;
  onUpdateJointRotation: (joint: JointId, nextEuler: EulerDegrees) => void;
  onResetCurrentJoint: () => void;
  onStandStillPose: () => void;
  cameraPreset: CameraPresetId;
  onSelectCameraPreset: (cam: CameraPresetId) => void;
  lightingPreset: StudioLightingId;
  onSelectLightingPreset: (light: StudioLightingId) => void;
  showMeasurementTape: boolean;
  onToggleMeasurementTape: () => void;
  weatherEffect?: WeatherEffectConfig;
  onUpdateWeatherEffect?: (next: WeatherEffectConfig) => void;
  onGenerateAiPose?: (promptText: string) => Promise<void>;
  isGeneratingPose?: boolean;
  lastAiPoseResult?: PoseAiGenerationResult | null;
  uploadedGarmentsInventory?: ExtractedGarmentItem[];
  onRegisterUploadedGarments?: (
    items: ExtractedGarmentItem[],
    autoOpen360?: boolean
  ) => void;
  onOpenGarment360Preview?: (item?: ExtractedGarmentItem) => void;
  onRandomShuffleOutfit?: () => void;
  onTriggerMannequin360Video?: () => void;
  onOpenBodyShapeGuide?: () => void;
  onCapture2DSnapshot?: () => void;
}

type WardrobeCategory = 'top' | 'dress' | 'outerwear' | 'bottom' | 'footwear';

interface DockSegmentedTabBarProps {
  activeTab: ActiveDockTab;
  onSelectTab: (tab: ActiveDockTab) => void;
  equippedAccessoriesCount: number;
  lightingPreset: StudioLightingId;
  onSelectLightingPreset: (light: StudioLightingId) => void;
  onToggleCollapse?: () => void;
}

const MemoizedDockSegmentedTabBar = React.memo<DockSegmentedTabBarProps>(
  ({
    activeTab,
    onSelectTab,
    equippedAccessoriesCount,
    lightingPreset,
    onSelectLightingPreset,
    onToggleCollapse,
  }) => (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
        <button
          type="button"
          onClick={() => onSelectTab('body')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'body'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>1. Hình thể &amp; Kiểu tóc</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('wardrobe')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'wardrobe'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shirt className="w-3.5 h-3.5" />
          <span>2. Tủ đồ &amp; AI Upload Đồ</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('accessories')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'accessories'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>
            3. Phụ kiện (Đồng hồ, Túi, Bóng rổ, Đồ chơi, Dù, Kính, Nón)
          </span>
          {equippedAccessoriesCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-indigo-600 text-white rounded-full">
              {equippedAccessoriesCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('pose')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'pose'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Move3d className="w-3.5 h-3.5" />
          <span>4. Tư thế &amp; 17 Khớp Cử động</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('ai_stylist')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'ai_stylist'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>5. AI Stylist (Lookbook &amp; Xu hướng)</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="hidden md:flex items-center gap-1">
          <Sun className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
          {(
            [
              { id: 'daylight_studio', label: 'Studio Trắng' },
              { id: 'warm_editorial', label: 'Nắng Ấm' },
              { id: 'high_contrast', label: 'Tương Phản' },
            ] as { id: StudioLightingId; label: string }[]
          ).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectLightingPreset(l.id)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                lightingPreset === l.id
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Thu gọn bảng điều khiển (-)"
            aria-label="Thu gọn bảng điều khiển"
            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded-md transition-colors cursor-pointer shrink-0"
          >
            <span>Thu gọn</span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
          </button>
        )}
      </div>
    </div>
  )
);
MemoizedDockSegmentedTabBar.displayName = 'MemoizedDockSegmentedTabBar';

interface BiometricNumberRangeCardProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (nextVal: number) => void;
  ticks?: [string, string, string];
  compact?: boolean;
}

const MemoizedBiometricNumberRangeCard =
  React.memo<BiometricNumberRangeCardProps>(
    ({ label, unit, min, max, value, onChange, ticks, compact = false }) => {
      const handleNumberChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          const parsed = Number(e.target.value);
          onChange(Math.min(max, Math.max(min, parsed || min)));
        },
        [min, max, onChange]
      );
      const handleRangeChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          onChange(Number(e.target.value));
        },
        [onChange]
      );

      if (compact) {
        return (
          <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-slate-600 font-medium">{label}</span>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={value}
                  onChange={handleNumberChange}
                  className="w-11 text-right text-[11px] font-semibold font-mono bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-900"
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  {unit}
                </span>
              </div>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={handleRangeChange}
              className="w-full studio-slider"
            />
          </div>
        );
      }

      return (
        <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">
              {label}
            </label>
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={handleNumberChange}
                className="w-12 text-right text-xs font-semibold font-mono bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-900"
              />
              <span className="text-[11px] text-slate-500 font-mono">
                {unit}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={handleRangeChange}
            className="w-full studio-slider"
          />
          {ticks && (
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>{ticks[0]}</span>
              <span>{ticks[1]}</span>
              <span>{ticks[2]}</span>
            </div>
          )}
        </div>
      );
    }
  );
MemoizedBiometricNumberRangeCard.displayName =
  'MemoizedBiometricNumberRangeCard';

interface JointEulerSlidersCardProps {
  selectedJoint: JointId;
  jointLabel: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  eulerX: number;
  eulerY: number;
  eulerZ: number;
  onUpdateJointRotation: (joint: JointId, nextEuler: EulerDegrees) => void;
  onResetCurrentJoint: () => void;
}

const MemoizedJointEulerSlidersCard = React.memo<JointEulerSlidersCardProps>(
  ({
    selectedJoint,
    jointLabel,
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    eulerX,
    eulerY,
    eulerZ,
    onUpdateJointRotation,
    onResetCurrentJoint,
  }) => {
    const handleXChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateJointRotation(selectedJoint, {
          x: Number(e.target.value),
          y: eulerY,
          z: eulerZ,
        });
      },
      [selectedJoint, eulerY, eulerZ, onUpdateJointRotation]
    );
    const handleYChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateJointRotation(selectedJoint, {
          x: eulerX,
          y: Number(e.target.value),
          z: eulerZ,
        });
      },
      [selectedJoint, eulerX, eulerZ, onUpdateJointRotation]
    );
    const handleZChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateJointRotation(selectedJoint, {
          x: eulerX,
          y: eulerY,
          z: Number(e.target.value),
        });
      },
      [selectedJoint, eulerX, eulerY, onUpdateJointRotation]
    );

    return (
      <div className="lg:col-span-4 flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 truncate">
            Góc xoay: {jointLabel}
          </span>
          <button
            type="button"
            onClick={onResetCurrentJoint}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại khớp</span>
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-600">Gập / Duỗi (Trục X)</span>
              <span className="font-mono font-semibold text-slate-900">
                {eulerX}°
              </span>
            </div>
            <input
              type="range"
              min={minX}
              max={maxX}
              value={eulerX}
              onChange={handleXChange}
              className="w-full studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-600">Xoay trục (Trục Y)</span>
              <span className="font-mono font-semibold text-slate-900">
                {eulerY}°
              </span>
            </div>
            <input
              type="range"
              min={minY}
              max={maxY}
              value={eulerY}
              onChange={handleYChange}
              className="w-full studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-600">Dang / Nghiêng (Trục Z)</span>
              <span className="font-mono font-semibold text-slate-900">
                {eulerZ}°
              </span>
            </div>
            <input
              type="range"
              min={minZ}
              max={maxZ}
              value={eulerZ}
              onChange={handleZChange}
              className="w-full studio-slider"
            />
          </div>
        </div>
      </div>
    );
  }
);
MemoizedJointEulerSlidersCard.displayName = 'MemoizedJointEulerSlidersCard';

const BottomControlDockComponent: React.FC<BottomControlDockProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  body,
  onUpdateHeightWeight,
  onUpdateBodyField,
  outfit,
  onUpdateOutfit,
  fitAnalysis,
  outfitHistory,
  activeHistoryId,
  activeHistoryIdB = null,
  isSplitCompareMode = false,
  onToggleSplitCompareMode,
  onSaveCurrentOutfit,
  onApplyHistoryEntry,
  onSelectCompareHistoryB,
  onDeleteHistoryEntry,
  onClearHistory,
  posePreset,
  onSelectPosePreset,
  selectedJoint,
  onSelectJoint,
  jointRotations,
  onUpdateJointRotation,
  onResetCurrentJoint,
  onStandStillPose,
  cameraPreset,
  onSelectCameraPreset,
  lightingPreset,
  onSelectLightingPreset,
  showMeasurementTape,
  onToggleMeasurementTape,
  weatherEffect = DEFAULT_WEATHER_EFFECT,
  onUpdateWeatherEffect,
  onGenerateAiPose,
  isGeneratingPose = false,
  lastAiPoseResult = null,
  uploadedGarmentsInventory = [],
  onRegisterUploadedGarments,
  onOpenGarment360Preview,
  onRandomShuffleOutfit,
  onTriggerMannequin360Video,
  onOpenBodyShapeGuide,
  onCapture2DSnapshot,
}) => {
  const [wardrobeCat, setWardrobeCat] = useState<WardrobeCategory>('top');
  const [isUploadingGarment, setIsUploadingGarment] = useState(false);
  const [extractedGarments, setExtractedGarments] = useState<
    ExtractedGarmentItem[]
  >([]);
  const [extractionSummary, setExtractionSummary] = useState<string>('');
  const [isExtractingModelPhoto, setIsExtractingModelPhoto] = useState(false);
  const [activeInline360ItemId, setActiveInline360ItemId] = useState<
    string | null
  >(null);
  const [showInline360Preview, setShowInline360Preview] =
    useState<boolean>(true);
  const [extractedFilterTab, setExtractedFilterTab] = useState<
    'all' | 'clothing' | 'hairstyle' | 'accessories'
  >('all');

  const combinedExtractedGarments = React.useMemo(() => {
    const map = new Map<string, ExtractedGarmentItem>();
    for (const item of extractedGarments) {
      map.set(item.id, item);
    }
    for (const item of uploadedGarmentsInventory) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [extractedGarments, uploadedGarmentsInventory]);

  const filteredExtractedGarments = React.useMemo(() => {
    if (extractedFilterTab === 'clothing') {
      return combinedExtractedGarments.filter(
        (it) =>
          it.category === 'top' ||
          it.category === 'dress' ||
          it.category === 'outerwear' ||
          it.category === 'bottom' ||
          it.category === 'footwear'
      );
    }
    if (extractedFilterTab === 'hairstyle') {
      return combinedExtractedGarments.filter(
        (it) => it.category === 'hairstyle'
      );
    }
    if (extractedFilterTab === 'accessories') {
      return combinedExtractedGarments.filter(
        (it) =>
          it.category === 'watch' ||
          it.category === 'handbag' ||
          it.category === 'sunglasses' ||
          it.category === 'hat'
      );
    }
    return combinedExtractedGarments;
  }, [combinedExtractedGarments, extractedFilterTab]);

  // Live Camera Capture State for Garment Auto-Background Removal
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<
    'environment' | 'user'
  >('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturingCamera, setIsCapturingCamera] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mobileCameraFallbackInputRef = useRef<HTMLInputElement | null>(null);
  const modelPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const [posePromptInput, setPosePromptInput] = useState<string>('');
  const [colorAnchorSlot, setColorAnchorSlot] = useState<
    'auto' | 'top' | 'outerwear' | 'bottom'
  >('auto');
  const [aiPaletteResult, setAiPaletteResult] =
    useState<ColorPaletteAiResult | null>(null);
  const [isGeneratingPalettes, setIsGeneratingPalettes] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);
  const [uploadingAccessoryCat, setUploadingAccessoryCat] = useState<
    'watch' | 'handbag' | 'sunglasses' | 'hat' | null
  >(null);
  const [selectedTrendId, setSelectedTrendId] =
    useState<FashionTrendId>('quiet_luxury');
  const [stylistCustomPrompt, setStylistCustomPrompt] = useState<string>('');
  const [aiStylistResult, setAiStylistResult] =
    useState<AiStylistResponse | null>(null);
  const [isGeneratingStylist, setIsGeneratingStylist] = useState(false);
  const [activeStylistLookbookId, setActiveStylistLookbookId] = useState<
    string | null
  >(null);

  // Interactive 2-Color Mixer States for Hair, Garments & Accessories
  const [hairMixColorA, setHairMixColorA] = useState<string>('#795548');
  const [hairMixColorB, setHairMixColorB] = useState<string>('#C8A97E');
  const [hairMixRatio, setHairMixRatio] = useState<number>(45);

  const [garmentMixColorA, setGarmentMixColorA] = useState<string>('#2B4C7E');
  const [garmentMixColorB, setGarmentMixColorB] = useState<string>('#F3EFE6');
  const [garmentMixRatio, setGarmentMixRatio] = useState<number>(50);

  const [watchMixTarget, setWatchMixTarget] = useState<'case' | 'strap'>('strap');
  const [watchMixColorA, setWatchMixColorA] = useState<string>('#78350F');
  const [watchMixColorB, setWatchMixColorB] = useState<string>('#1E293B');
  const [watchMixRatio, setWatchMixRatio] = useState<number>(40);

  const [bagMixTarget, setBagMixTarget] = useState<'leather' | 'hardware'>('leather');
  const [bagMixColorA, setBagMixColorA] = useState<string>('#7F1D1D');
  const [bagMixColorB, setBagMixColorB] = useState<string>('#D6C7B2');
  const [bagMixRatio, setBagMixRatio] = useState<number>(35);

  const [glassMixTarget, setGlassMixTarget] = useState<'frame' | 'lens'>('lens');
  const [glassMixColorA, setGlassMixColorA] = useState<string>('#1E293B');
  const [glassMixColorB, setGlassMixColorB] = useState<string>('#D97706');
  const [glassMixRatio, setGlassMixRatio] = useState<number>(45);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const watchUploadRef = useRef<HTMLInputElement | null>(null);
  const handbagUploadRef = useRef<HTMLInputElement | null>(null);
  const sunglassesUploadRef = useRef<HTMLInputElement | null>(null);
  const hatUploadRef = useRef<HTMLInputElement | null>(null);

  const [weatherLocationInput, setWeatherLocationInput] =
    useState<string>('Hà Nội, Việt Nam');
  const [liveWeatherForecast, setLiveWeatherForecast] =
    useState<RealWeatherForecast | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState<boolean>(false);
  const [weatherStatusNote, setWeatherStatusNote] = useState<string | null>(
    null
  );
  const [showUploadMatchSection, setShowUploadMatchSection] =
    useState<boolean>(true);
  const [showColorPaletteSection, setShowColorPaletteSection] =
    useState<boolean>(true);
  const [showHistorySection, setShowHistorySection] = useState<boolean>(true);
  const [showWeatherLabSection, setShowWeatherLabSection] =
    useState<boolean>(true);

  const lastAiStylistCacheRef = useRef<AiStylistResponse | null>(null);
  const currentAiStylistData: AiStylistResponse = React.useMemo(() => {
    if (
      aiStylistResult &&
      aiStylistResult.recommendations.length > 0 &&
      aiStylistResult.recommendations[0].trendId === selectedTrendId
    ) {
      lastAiStylistCacheRef.current = aiStylistResult;
      return aiStylistResult;
    }
    if (activeTab !== 'ai_stylist' && lastAiStylistCacheRef.current) {
      return lastAiStylistCacheRef.current;
    }
    const localData = buildLocalAiStylistRecommendations(
      selectedTrendId,
      body,
      outfit,
      outfitHistory,
      stylistCustomPrompt,
      liveWeatherForecast
    );
    lastAiStylistCacheRef.current = localData;
    return localData;
  }, [
    activeTab,
    selectedTrendId,
    body,
    outfit,
    outfitHistory,
    stylistCustomPrompt,
    liveWeatherForecast,
    aiStylistResult,
  ]);

  const handleGenerateAiStylistLookbooks = async (
    overrideTrendId?: FashionTrendId,
    overrideWeather?: RealWeatherForecast | null
  ) => {
    const targetTrend = overrideTrendId || selectedTrendId;
    if (overrideTrendId) {
      setSelectedTrendId(overrideTrendId);
    }
    const activeWeather =
      overrideWeather !== undefined ? overrideWeather : liveWeatherForecast;
    setIsGeneratingStylist(true);
    try {
      const res = await generateAiStylistRecommendations(
        targetTrend,
        body,
        fitAnalysis.bodyShapeName,
        outfit,
        outfitHistory,
        stylistCustomPrompt.trim() || undefined,
        activeWeather
      );
      if (res.weatherForecast) {
        setLiveWeatherForecast(res.weatherForecast);
      }
      setAiStylistResult(res);
    } finally {
      setIsGeneratingStylist(false);
    }
  };

  const handleFetchLocationWeatherAndRecommend = async (
    customQuery?: string,
    useGps = false
  ) => {
    const queryToUse =
      customQuery !== undefined ? customQuery : weatherLocationInput;
    if (customQuery !== undefined) {
      setWeatherLocationInput(customQuery);
    }
    setIsFetchingWeather(true);
    setWeatherStatusNote(null);

    let lat: number | undefined;
    let lng: number | undefined;

    if (useGps && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 180000,
            });
          }
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setWeatherStatusNote(
          `Đã xác định tọa độ GPS (${lat.toFixed(3)}, ${lng.toFixed(3)}) — đang tra cứu Google Search...`
        );
      } catch {
        setWeatherStatusNote(
          `Không lấy được GPS trực tiếp trong khung trình duyệt, tự động tra cứu thời tiết theo khu vực "${queryToUse || 'Hà Nội, Việt Nam'}".`
        );
      }
    }

    try {
      const forecast = await fetchRealTimeWeatherForecast(
        queryToUse || 'Hà Nội, Việt Nam',
        lat,
        lng
      );
      setLiveWeatherForecast(forecast);
      setWeatherLocationInput(forecast.locationName);
      setWeatherStatusNote(
        `Đã cập nhật dự báo thời tiết thực tế tại ${forecast.locationName} (${forecast.temperatureC}°C - ${forecast.conditionText}).`
      );
      await handleGenerateAiStylistLookbooks(selectedTrendId, forecast);
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const handleApplyStylistLookbook = (
    rec: AiStylistLookbookRecommendation
  ) => {
    setActiveStylistLookbookId(rec.id);
    onUpdateOutfit({
      ...rec.outfit,
      selectedSize: outfit.selectedSize,
      hideAllGarments: false,
    });
    onSelectPosePreset(rec.recommendedPose);
  };

  const lastColorPaletteCacheRef = useRef<ColorPaletteAiResult | null>(null);
  const currentColorPaletteData: ColorPaletteAiResult = React.useMemo(() => {
    if (activeTab !== 'wardrobe' && lastColorPaletteCacheRef.current) {
      return lastColorPaletteCacheRef.current;
    }
    const preferred =
      colorAnchorSlot === 'auto' ? undefined : colorAnchorSlot;
    const localSynth = synthesizeColorPalettesFromOutfit(outfit, preferred);
    if (
      aiPaletteResult &&
      aiPaletteResult.anchorCategoryLabel === localSynth.anchorCategoryLabel &&
      aiPaletteResult.anchorColorHex.toLowerCase() ===
        localSynth.anchorColorHex.toLowerCase()
    ) {
      lastColorPaletteCacheRef.current = aiPaletteResult;
      return aiPaletteResult;
    }
    lastColorPaletteCacheRef.current = localSynth;
    return localSynth;
  }, [activeTab, outfit, colorAnchorSlot, aiPaletteResult]);

  const uploadMatchedSuggestions = React.useMemo(
    () =>
      activeTab === 'wardrobe'
        ? getUploadMatchedOutfitRecommendations(outfit, body.genderProfile)
        : [],
    [activeTab, outfit, body.genderProfile]
  );

  const hasUploadedGarmentOnMannequin = Boolean(
    outfit.outerwear.uploadedName ||
      outfit.outerwear.transformedSummary ||
      outfit.top.uploadedName ||
      outfit.top.transformedSummary ||
      outfit.bottom.uploadedName ||
      outfit.bottom.transformedSummary
  );

  const handleGenerateAiColorPalettes = async () => {
    setIsGeneratingPalettes(true);
    try {
      const preferred =
        colorAnchorSlot === 'auto' ? undefined : colorAnchorSlot;
      const res = await generateColorPalettesForOutfit(
        outfit,
        body.genderProfile,
        preferred
      );
      setAiPaletteResult(res);
    } finally {
      setIsGeneratingPalettes(false);
    }
  };

  const handleApplyColorPalette = (palette: ColorPaletteSuggestion) => {
    setActivePaletteId(palette.id);
    const currentAcc = outfit.accessories ?? DEFAULT_ACCESSORIES;
    onUpdateOutfit({
      ...outfit,
      hideAllGarments: false,
      top: {
        ...outfit.top,
        colorHex: palette.topColorHex,
      },
      outerwear: {
        ...outfit.outerwear,
        colorHex: palette.outerwearColorHex,
      },
      bottom: {
        ...outfit.bottom,
        colorHex: palette.bottomColorHex,
      },
      footwear: {
        ...outfit.footwear,
        colorHex: palette.footwearColorHex,
      },
      accessories: {
        ...currentAcc,
        watch: {
          ...currentAcc.watch,
          strapColorHex: palette.accessoryColorHex,
          caseColorHex: palette.accessoryMetalHex,
        },
        handbag: {
          ...currentAcc.handbag,
          colorHex: palette.accessoryColorHex,
          hardwareColorHex: palette.accessoryMetalHex,
        },
        sunglasses: {
          ...currentAcc.sunglasses,
          frameColorHex: palette.accessoryColorHex,
        },
      },
    });
  };

  const currentJointMeta =
    JOINT_METADATA.find((j) => j.id === selectedJoint) || JOINT_METADATA[0];
  const currentJointEuler = jointRotations[selectedJoint] || {
    x: 0,
    y: 0,
    z: 0,
  };

  const hairRecommendation = getRecommendedHairstyle(
    body.genderProfile,
    outfit
  );
  const recommendedHairOption = HAIRSTYLE_OPTIONS.find(
    (h) => h.id === hairRecommendation.hairstyleId
  );

  const currentDressLayer = outfit.dress || {
    styleId: 'none' as DressStyleId,
    fabric: 'silk' as FabricType,
    colorHex: '#7F1D1D',
    fitEase: 'slim' as FitEase,
  };

  const activeLayerConfig =
    wardrobeCat === 'top'
      ? outfit.top
      : wardrobeCat === 'dress'
      ? currentDressLayer
      : wardrobeCat === 'outerwear'
      ? outfit.outerwear
      : outfit.bottom;

  const updateActiveGarment = (
    partial: Partial<{
      fabric: FabricType;
      colorHex: string;
      secondaryColorHex?: string;
      fitEase: FitEase;
      uploadedName?: string;
      transformedSummary?: string;
      previewThumbUrl?: string;
      uploadedTextureUrl?: string;
      uploadedCutoutParams?: [number, number, number, number];
    }>
  ) => {
    if (wardrobeCat === 'footwear') {
      if (partial.colorHex) {
        onUpdateOutfit({
          ...outfit,
          footwear: { ...outfit.footwear, colorHex: partial.colorHex },
        });
      }
      return;
    }

    if (wardrobeCat === 'dress') {
      onUpdateOutfit({
        ...outfit,
        dress: {
          ...currentDressLayer,
          ...partial,
        },
      });
      return;
    }

    onUpdateOutfit({
      ...outfit,
      [wardrobeCat]: {
        ...outfit[wardrobeCat],
        ...partial,
      },
    });
  };

  const applyExtractedItemsToOutfit = (
    itemsToApply: ExtractedGarmentItem[],
    baseOutfit: OutfitConfiguration = outfit
  ) => {
    let nextOutfit: OutfitConfiguration = {
      ...baseOutfit,
      hideAllGarments: false,
      dress: baseOutfit.dress || { ...currentDressLayer },
    };

    for (const item of itemsToApply) {
      if (item.category === 'dress') {
        nextOutfit = {
          ...nextOutfit,
          top: {
            ...nextOutfit.top,
            styleId: 'none',
          },
          bottom: {
            ...nextOutfit.bottom,
            styleId: 'none',
          },
          dress: {
            styleId: (item.styleId as DressStyleId) || 'silk_slip_evening_dress',
            colorHex: item.colorHex,
            secondaryColorHex: item.secondaryColorHex,
            fabric: item.fabric,
            weavePattern: item.weavePattern,
            fitEase: item.fitEase,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
            uploadedCutoutParams: item.uploadedCutoutParams,
          },
        };
      } else if (item.category === 'top') {
        nextOutfit = {
          ...nextOutfit,
          dress: {
            ...(nextOutfit.dress || currentDressLayer),
            styleId: 'none',
          },
          top: {
            ...nextOutfit.top,
            styleId: (item.styleId as TopStyleId) || 'baby_tee',
            colorHex: item.colorHex,
            secondaryColorHex: item.secondaryColorHex,
            fabric: item.fabric,
            weavePattern: item.weavePattern,
            fitEase: item.fitEase,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
            uploadedCutoutParams: item.uploadedCutoutParams,
          },
        };
      } else if (item.category === 'outerwear') {
        nextOutfit = {
          ...nextOutfit,
          outerwear: {
            ...nextOutfit.outerwear,
            styleId: (item.styleId as OuterwearStyleId) || 'tailored_blazer',
            colorHex: item.colorHex,
            secondaryColorHex: item.secondaryColorHex,
            fabric: item.fabric,
            weavePattern: item.weavePattern,
            fitEase: item.fitEase,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
            uploadedCutoutParams: item.uploadedCutoutParams,
          },
        };
      } else if (item.category === 'bottom') {
        nextOutfit = {
          ...nextOutfit,
          dress: {
            ...(nextOutfit.dress || currentDressLayer),
            styleId: 'none',
          },
          bottom: {
            ...nextOutfit.bottom,
            styleId: (item.styleId as BottomStyleId) || 'slim_jeans',
            colorHex: item.colorHex,
            secondaryColorHex: item.secondaryColorHex,
            fabric: item.fabric,
            weavePattern: item.weavePattern,
            fitEase: item.fitEase,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
            previewThumbUrl: item.previewThumbUrl,
            uploadedTextureUrl: item.uploadedTextureUrl,
            uploadedCutoutParams: item.uploadedCutoutParams,
          },
        };
      } else if (item.category === 'footwear') {
        nextOutfit = {
          ...nextOutfit,
          footwear: {
            styleId: (item.styleId as FootwearStyleId) || 'minimal_sneakers',
            colorHex: item.colorHex,
            uploadedName: item.vietnameseName,
            transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
            previewThumbUrl: item.previewThumbUrl,
          },
        };
      } else if (item.category === 'hairstyle') {
        onUpdateBodyField(
          'hairstyleId',
          (item.styleId as HairstyleId) ||
            (body.genderProfile === 'male'
              ? 'male_classic_side_wave'
              : 'long_wavy')
        );
        if (item.colorHex) {
          onUpdateBodyField('hairColorHex', item.colorHex);
        }
      } else if (item.category === 'watch') {
        const currentAcc = nextOutfit.accessories || DEFAULT_ACCESSORIES;
        nextOutfit = {
          ...nextOutfit,
          accessories: {
            ...currentAcc,
            watch: {
              ...currentAcc.watch,
              styleId: (item.styleId as WatchStyleId) || 'luxury_chronograph',
              caseColorHex: item.colorHex || currentAcc.watch.caseColorHex,
              strapColorHex:
                item.secondaryColorHex || currentAcc.watch.strapColorHex,
              uploadedName: item.vietnameseName,
              transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
              previewThumbUrl: item.previewThumbUrl,
              uploadedTextureUrl: item.uploadedTextureUrl,
            },
          },
        };
      } else if (item.category === 'handbag') {
        const currentAcc = nextOutfit.accessories || DEFAULT_ACCESSORIES;
        nextOutfit = {
          ...nextOutfit,
          accessories: {
            ...currentAcc,
            handbag: {
              ...currentAcc.handbag,
              styleId: (item.styleId as HandbagStyleId) || 'paris_saddle_bag',
              colorHex: item.colorHex || currentAcc.handbag.colorHex,
              hardwareColorHex:
                item.secondaryColorHex || currentAcc.handbag.hardwareColorHex,
              uploadedName: item.vietnameseName,
              transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
              previewThumbUrl: item.previewThumbUrl,
              uploadedTextureUrl: item.uploadedTextureUrl,
            },
          },
        };
      } else if (item.category === 'sunglasses') {
        const currentAcc = nextOutfit.accessories || DEFAULT_ACCESSORIES;
        nextOutfit = {
          ...nextOutfit,
          accessories: {
            ...currentAcc,
            sunglasses: {
              ...currentAcc.sunglasses,
              styleId: (item.styleId as SunglassesStyleId) || 'retro_cat_eye',
              frameColorHex:
                item.colorHex || currentAcc.sunglasses.frameColorHex,
              lensColorHex:
                item.secondaryColorHex || currentAcc.sunglasses.lensColorHex,
              wearPosition: 'eyes',
              uploadedName: item.vietnameseName,
              transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
              previewThumbUrl: item.previewThumbUrl,
              uploadedTextureUrl: item.uploadedTextureUrl,
            },
          },
        };
      } else if (item.category === 'hat') {
        const currentAcc = nextOutfit.accessories || DEFAULT_ACCESSORIES;
        nextOutfit = {
          ...nextOutfit,
          accessories: {
            ...currentAcc,
            hat: {
              ...(currentAcc.hat || DEFAULT_ACCESSORIES.hat!),
              styleId: (item.styleId as HatStyleId) || 'baseball_cap',
              colorHex: item.colorHex || '#1E293B',
              trimColorHex: item.secondaryColorHex || '#D4AF37',
              uploadedName: item.vietnameseName,
              transformedSummary: `${item.vietnameseName} · Đã tách nền AI`,
              previewThumbUrl: item.previewThumbUrl,
              uploadedTextureUrl: item.uploadedTextureUrl,
            },
          },
        };
      }
    }

    onUpdateOutfit(nextOutfit);
    const firstWardrobeItem = itemsToApply.find(
      (it) =>
        it.category === 'top' ||
        it.category === 'dress' ||
        it.category === 'outerwear' ||
        it.category === 'bottom' ||
        it.category === 'footwear'
    );
    if (firstWardrobeItem) {
      setWardrobeCat(firstWardrobeItem.category as WardrobeCategory);
    }
  };

  const handleGarmentFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingGarment(true);
    try {
      const res = await extractGarmentsFromPhoto(
        file,
        body.genderProfile,
        'single_upload',
        undefined
      );
      if (res.items.length > 0) {
        setExtractedGarments((prev) => [...res.items, ...prev].slice(0, 12));
        setExtractionSummary(res.summaryText);
        setActiveInline360ItemId(res.items[0].id);
        setShowInline360Preview(true);
        onRegisterUploadedGarments?.(res.items, true);
        applyExtractedItemsToOutfit(res.items);
      }
    } catch (err) {
      console.error('Lỗi xử lý ảnh trang phục:', err);
    } finally {
      setIsUploadingGarment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleModelPhotoExtraction = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingModelPhoto(true);
    try {
      const res = await extractGarmentsFromPhoto(
        file,
        body.genderProfile,
        'model_photo_ai'
      );
      if (res.items.length > 0) {
        setExtractedGarments((prev) => [...res.items, ...prev].slice(0, 12));
        setExtractionSummary(res.summaryText);
        setActiveInline360ItemId(res.items[0].id);
        setShowInline360Preview(true);
        onRegisterUploadedGarments?.(res.items, true);
        applyExtractedItemsToOutfit(res.items);
      }
    } catch (err) {
      console.error('Lỗi AI tách trang phục từ ảnh người mẫu:', err);
    } finally {
      setIsExtractingModelPhoto(false);
      if (modelPhotoInputRef.current) {
        modelPhotoInputRef.current.value = '';
      }
    }
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const startCameraStream = async (mode: 'environment' | 'user') => {
    stopCameraStream();
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Trình duyệt không hỗ trợ mở camera trực tiếp. Hãy nhấn nút "Mở Camera Điện Thoại" bên dưới.'
      );
      return;
    }

    const constraintCandidates: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      },
      {
        video: { facingMode: mode },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    for (const c of constraintCandidates) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.setAttribute('playsinline', 'true');
          await cameraVideoRef.current.play().catch(() => {});
        }
        return;
      } catch {
        // try next fallback constraint
      }
    }

    setCameraError(
      'Không thể kết nối luồng video trực tiếp. Bạn có thể bấm "Chụp Bằng Camera Điện Thoại" ngay bên dưới để chụp trang phục.'
    );
  };

  const openCameraCaptureModal = () => {
    setIsCameraModalOpen(true);
    setTimeout(() => {
      startCameraStream(cameraFacingMode);
    }, 60);
  };

  const closeCameraCaptureModal = () => {
    stopCameraStream();
    setIsCameraModalOpen(false);
    setCameraError(null);
  };

  const switchCameraFacing = () => {
    const nextMode =
      cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  const captureGarmentFromCamera = async () => {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      mobileCameraFallbackInputRef.current?.click();
      return;
    }
    setIsCapturingCamera(true);
    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = video.videoWidth;
      snapCanvas.height = video.videoHeight;
      const sCtx = snapCanvas.getContext('2d');
      if (!sCtx) return;
      if (cameraFacingMode === 'user') {
        sCtx.translate(snapCanvas.width, 0);
        sCtx.scale(-1, 1);
      }
      sCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      const snapDataUrl = snapCanvas.toDataURL('image/png');

      closeCameraCaptureModal();
      setIsExtractingModelPhoto(true);
      const res = await extractGarmentsFromPhoto(
        snapDataUrl,
        body.genderProfile,
        'camera_capture'
      );
      if (res.items.length > 0) {
        setExtractedGarments((prev) => [...res.items, ...prev].slice(0, 12));
        setExtractionSummary(res.summaryText);
        setActiveInline360ItemId(res.items[0].id);
        setShowInline360Preview(true);
        onRegisterUploadedGarments?.(res.items, true);
        applyExtractedItemsToOutfit(res.items);
      }
    } catch (err) {
      console.error('Lỗi chụp & tách nền trang phục từ camera:', err);
    } finally {
      setIsCapturingCamera(false);
      setIsExtractingModelPhoto(false);
    }
  };

  const handleMobileCameraFallbackCapture = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    closeCameraCaptureModal();
    setIsExtractingModelPhoto(true);
    try {
      const res = await extractGarmentsFromPhoto(
        file,
        body.genderProfile,
        'camera_capture'
      );
      if (res.items.length > 0) {
        setExtractedGarments((prev) => [...res.items, ...prev].slice(0, 12));
        setExtractionSummary(res.summaryText);
        setActiveInline360ItemId(res.items[0].id);
        setShowInline360Preview(true);
        onRegisterUploadedGarments?.(res.items, true);
        applyExtractedItemsToOutfit(res.items);
      }
    } catch (err) {
      console.error('Lỗi xử lý ảnh chụp camera:', err);
    } finally {
      setIsExtractingModelPhoto(false);
      if (mobileCameraFallbackInputRef.current) {
        mobileCameraFallbackInputRef.current.value = '';
      }
    }
  };

  const score = fitAnalysis.outfitScore;
  const activeAccessories: AccessoriesConfiguration =
    outfit.accessories || DEFAULT_ACCESSORIES;

  const handleAccessoryFileUpload = async (
    category: 'watch' | 'handbag' | 'sunglasses' | 'hat',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAccessoryCat(category);
    try {
      const result = await analyzeAndTransformUploadedAccessory(
        file,
        category === 'hat' ? 'handbag' : category
      );
      if (category === 'watch') {
        onUpdateOutfit({
          ...outfit,
          accessories: {
            ...activeAccessories,
            watch: {
              ...activeAccessories.watch,
              styleId: result.watchStyleId || 'luxury_chronograph',
              caseColorHex: result.secondaryColorHex,
              strapColorHex: result.primaryColorHex,
              uploadedName: result.fileName,
              transformedSummary: result.transformedSummary,
              previewThumbUrl: result.previewThumbUrl,
              uploadedTextureUrl: result.uploadedTextureUrl,
            },
          },
        });
      } else if (category === 'handbag') {
        onUpdateOutfit({
          ...outfit,
          accessories: {
            ...activeAccessories,
            handbag: {
              ...activeAccessories.handbag,
              styleId: result.handbagStyleId || 'paris_saddle_bag',
              colorHex: result.primaryColorHex,
              hardwareColorHex: result.secondaryColorHex,
              uploadedName: result.fileName,
              transformedSummary: result.transformedSummary,
              previewThumbUrl: result.previewThumbUrl,
              uploadedTextureUrl: result.uploadedTextureUrl,
            },
          },
        });
      } else if (category === 'hat') {
        onUpdateOutfit({
          ...outfit,
          accessories: {
            ...activeAccessories,
            hat: {
              ...(activeAccessories.hat || DEFAULT_ACCESSORIES.hat!),
              styleId:
                (activeAccessories.hat?.styleId &&
                activeAccessories.hat.styleId !== 'none'
                  ? activeAccessories.hat.styleId
                  : 'baseball_cap') as HatStyleId,
              colorHex: result.primaryColorHex,
              trimColorHex: result.secondaryColorHex,
              uploadedName: result.fileName,
              transformedSummary: `Nón 3D · ${result.fileName}`,
              previewThumbUrl: result.previewThumbUrl,
              uploadedTextureUrl: result.uploadedTextureUrl,
            },
          },
        });
      } else {
        onUpdateOutfit({
          ...outfit,
          accessories: {
            ...activeAccessories,
            sunglasses: {
              ...activeAccessories.sunglasses,
              styleId: result.sunglassesStyleId || 'classic_aviator',
              frameColorHex: result.primaryColorHex,
              lensColorHex: result.secondaryColorHex,
              uploadedName: result.fileName,
              transformedSummary: result.transformedSummary,
              previewThumbUrl: result.previewThumbUrl,
              uploadedTextureUrl: result.uploadedTextureUrl,
            },
          },
        });
      }
    } catch (err) {
      console.error('Lỗi tải ảnh phụ kiện:', err);
    } finally {
      setUploadingAccessoryCat(null);
      e.target.value = '';
    }
  };

  const resolvedAccAlignment = resolvePoseAwareAccessoryAlignment(
    posePreset,
    jointRotations,
    activeAccessories
  );
  const activeHat = activeAccessories.hat || DEFAULT_ACCESSORIES.hat!;
  const equippedAccessoriesCount =
    (activeAccessories.watch.styleId !== 'none' ? 1 : 0) +
    (activeAccessories.handbag.styleId !== 'none' ? 1 : 0) +
    (activeAccessories.sunglasses.styleId !== 'none' ? 1 : 0) +
    (activeHat.styleId !== 'none' ? 1 : 0);

  const updateAccessories = useCallback(
    (nextAcc: AccessoriesConfiguration) => {
      onUpdateOutfit({
        ...outfit,
        hideAllGarments: false,
        accessories: nextAcc,
      });
    },
    [onUpdateOutfit, outfit]
  );

  const handleQuickFlipAB = useCallback(() => {
    if (outfitHistory.length === 0) return;
    if (outfitHistory.length === 1) {
      onApplyHistoryEntry(outfitHistory[0]);
      return;
    }
    const idx = outfitHistory.findIndex((h) => h.id === activeHistoryId);
    const nextEntry = idx === 0 ? outfitHistory[1] : outfitHistory[0];
    onApplyHistoryEntry(nextEntry);
  }, [outfitHistory, activeHistoryId, onApplyHistoryEntry]);

  const handleToggleHideAllGarments = useCallback(() => {
    onUpdateOutfit({
      ...outfit,
      hideAllGarments: !outfit.hideAllGarments,
    });
  }, [onUpdateOutfit, outfit]);

  const handleHeightChange = useCallback(
    (nextHeightCm: number) => {
      onUpdateHeightWeight(nextHeightCm, body.weightKg);
    },
    [onUpdateHeightWeight, body.weightKg]
  );

  const handleWeightChange = useCallback(
    (nextWeightKg: number) => {
      onUpdateHeightWeight(body.heightCm, nextWeightKg);
    },
    [onUpdateHeightWeight, body.heightCm]
  );

  const handleChestChange = useCallback(
    (nextChestCm: number) => {
      onUpdateBodyField('chestCm', nextChestCm);
    },
    [onUpdateBodyField]
  );

  const handleWaistChange = useCallback(
    (nextWaistCm: number) => {
      onUpdateBodyField('waistCm', nextWaistCm);
    },
    [onUpdateBodyField]
  );

  const handleHipChange = useCallback(
    (nextHipCm: number) => {
      onUpdateBodyField('hipCm', nextHipCm);
    },
    [onUpdateBodyField]
  );

  return (
    <div className="absolute bottom-2 inset-x-2 z-20 pointer-events-none">
      <div className="max-w-[920px] mx-auto">
      {/* Top Collapse / Quick Bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 px-0.5">
        {/* Compact Biometric & Body Shape Summary */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-2xs text-xs text-slate-600 truncate">
          <span className="font-semibold text-slate-900 font-mono">
            {body.heightCm} cm
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-slate-900 font-mono">
            {body.weightKg} kg
          </span>
          {body.genderProfile !== 'male' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-900 font-mono">
                3 vòng: {body.chestCm}-{body.waistCm}-{body.hipCm} cm
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 truncate">
            <strong className="text-slate-900">{fitAnalysis.bodyShapeName}</strong>
            {onOpenBodyShapeGuide && (
              <button
                type="button"
                onClick={onOpenBodyShapeGuide}
                title="Cẩm nang Dáng người & Mẹo phối đồ"
                className="p-0.5 rounded-full text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Quick Save Outfit & History Compare Controls */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={onSaveCurrentOutfit}
              title="Lưu cấu hình trang phục hiện tại vào bộ nhớ tạm để so sánh"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-600 text-indigo-800 hover:text-white border border-indigo-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Lưu phối đồ</span>
              {outfitHistory.length > 0 && (
                <span className="px-1 py-0.2 text-[10px] font-mono bg-indigo-600 text-white rounded-full">
                  {outfitHistory.length}
                </span>
              )}
            </button>

            {onToggleSplitCompareMode && (
              <button
                type="button"
                onClick={onToggleSplitCompareMode}
                title="Bật/tắt chế độ So sánh song song (Split-Screen) hiển thị đồng thời 2 người mẫu A và B"
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSplitCompareMode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-200'
                }`}
              >
                <Columns2 className="w-3 h-3 shrink-0" />
                <span>
                  {isSplitCompareMode ? 'Đang chia đôi A|B' : 'So sánh đôi A|B'}
                </span>
              </button>
            )}

            {outfitHistory.length >= 2 && (
              <button
                type="button"
                onClick={handleQuickFlipAB}
                title="Đảo nhanh giữa 2 bộ phối gần nhất để so sánh trực tiếp trên người mẫu 3D"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3 shrink-0" />
                <span>Đảo A↔B</span>
              </button>
            )}
          </div>

          {/* Feature Action Buttons: Shuffle */}
          {onRandomShuffleOutfit && (
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <button
                type="button"
                onClick={onRandomShuffleOutfit}
                title="Phối ngẫu nhiên trang phục & phụ kiện"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-purple-50 hover:bg-purple-600 text-purple-800 hover:text-white border border-purple-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 shrink-0" />
                <span>Phối ngẫu nhiên</span>
              </button>
            </div>
          )}

          {/* Quick Camera View Selector */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <Camera className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5 shrink-0" />
            {(
              [
                { id: 'full_front', label: 'Toàn thân' },
                { id: 'upper_detail', label: 'Cận Áo' },
                { id: 'lower_detail', label: 'Cận Quần' },
                { id: 'footwear_detail', label: 'Cận Giày' },
                { id: 'face_detail', label: 'Cận Mặt' },
                { id: 'three_quarter', label: 'Góc 3/4' },
                { id: 'back_view', label: 'Sau lưng' },
              ] as { id: CameraPresetId; label: string }[]
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onSelectCameraPreset(cam.id)}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  cameraPreset === cam.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          {/* Collapse / Expand Dock Button (rendered when dock is open) */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Thu gọn bảng điều khiển"
              aria-label="Thu gọn bảng điều khiển"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white border border-slate-900 rounded-lg shadow-md hover:bg-slate-800 transition-colors shrink-0 cursor-pointer text-[11px] font-bold"
            >
              <span>Thu gọn</span>
              <ChevronDown className="w-4 h-4 text-slate-300" />
            </button>
          )}
        </div>
      </div>

      {/* Prominent floating bottom pill handle when collapsed */}
      {isCollapsed && (
        <div className="pointer-events-auto mt-2 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/95 text-white hover:bg-slate-800 border border-slate-700 rounded-full shadow-xl text-xs font-bold transition-all cursor-pointer animate-bounce hover:animate-none"
          >
            <ChevronUp className="w-4 h-4 text-amber-400" />
            <span>Mở Bảng Điều Khiển &amp; Tủ Đồ 3D</span>
            <ChevronUp className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      )}

      {/* Main Dock Panel — completely hidden when collapsed */}
      {!isCollapsed && (
      <div className="pointer-events-auto mt-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-[28vh] sm:max-h-[32vh] flex flex-col">
        {/* Memoized Segmented Tab Bar */}
        <MemoizedDockSegmentedTabBar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          equippedAccessoriesCount={equippedAccessoriesCount}
          lightingPreset={lightingPreset}
          onSelectLightingPreset={onSelectLightingPreset}
          onToggleCollapse={onToggleCollapse}
        />

        {/* TAB 1: BODY MEASUREMENTS (100-300cm, 20-500kg), HAIRSTYLE DROPDOWN & GENDER-SPECIFIC BODY SHAPE */}
        {activeTab === 'body' && (
          <div className="p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[305px] overflow-y-auto">
            {/* Column 1: Gender Profile + Height (100-300cm) & Weight (20-500kg) Range Sliders (4 cols) */}
            <div className="lg:col-span-4 min-w-0 flex flex-col justify-between gap-2.5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 lg:pb-0 lg:pr-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between mb-2 gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    Giới tính &amp; Chiều cao / Cân nặng
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleHideAllGarments}
                      title="Bật/tắt chế độ lộ rõ cơ thể giải phẫu 3D để quan sát chuẩn số đo 3 vòng, vai, eo, hông và đôi chân"
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        outfit.hideAllGarments
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {outfit.hideAllGarments
                        ? 'Mặc Lại Đồ'
                        : 'Xem Rõ Cơ Thể'}
                    </button>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-900 text-white shadow-xs whitespace-nowrap shrink-0">
                      {body.genderProfile === 'male'
                        ? 'Nam (BMI)'
                        : 'Nữ (3 Vòng)'}
                    </span>
                  </div>
                </div>

                {/* Memoized Height (100cm - 300cm) & Weight (20kg - 500kg) Range Sliders + Number Inputs */}
                <div className="grid grid-cols-2 gap-2.5 mb-2">
                  <MemoizedBiometricNumberRangeCard
                    label="Chiều cao (100-300)"
                    unit="cm"
                    min={100}
                    max={300}
                    value={body.heightCm}
                    onChange={handleHeightChange}
                    ticks={['100cm', '200cm', '300cm']}
                  />
                  <MemoizedBiometricNumberRangeCard
                    label="Cân nặng (20-500)"
                    unit="kg"
                    min={20}
                    max={500}
                    value={body.weightKg}
                    onChange={handleWeightChange}
                    ticks={['20kg', '250kg', '500kg']}
                  />
                </div>
              </div>

              {/* Skin Tone Swatches */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-600">
                    Sắc độ Da người mẫu
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {
                      MANNEQUIN_SURFACES.find((s) => s.id === body.surfaceId)
                        ?.name
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {MANNEQUIN_SURFACES.map((surf) => (
                    <button
                      key={surf.id}
                      type="button"
                      title={surf.name}
                      onClick={() => onUpdateBodyField('surfaceId', surf.id)}
                      className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                        body.surfaceId === surf.id
                          ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 border-slate-400'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: surf.colorHex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Hairstyle Dropdown (<select>) + Quick Hair Buttons + Custom Hair Color & 2-Color Mixer (4 cols) */}
            <div className="lg:col-span-4 min-w-0 flex flex-col justify-between gap-2 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 lg:pb-0 lg:pr-4">
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-1.5 gap-1">
                  <label
                    htmlFor="dock-hairstyle-select"
                    className="text-xs font-semibold text-slate-900"
                  >
                    {body.genderProfile === 'male'
                      ? 'Kiểu Tóc Nam & Màu Tóc'
                      : 'Kiểu Tóc Nữ & Màu Tóc'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {body.hairColorHex.toUpperCase()}
                    </span>
                    <input
                      type="color"
                      title="Tự chọn màu tóc bất kỳ"
                      value={body.hairColorHex}
                      onChange={(e) =>
                        onUpdateBodyField('hairColorHex', e.target.value)
                      }
                      className="w-5 h-5 rounded border border-slate-300 cursor-pointer shrink-0"
                    />
                  </div>
                </div>

                {/* 12 Hair Color Swatches */}
                <div className="flex flex-wrap items-center gap-1 mb-2">
                  {HAIR_COLOR_SWATCHES.map((hc) => (
                    <button
                      key={hc.hex}
                      type="button"
                      title={hc.name}
                      onClick={() => onUpdateBodyField('hairColorHex', hc.hex)}
                      className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                        body.hairColorHex.toLowerCase() === hc.hex.toLowerCase()
                          ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 border-slate-400'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hc.hex }}
                    />
                  ))}
                </div>

                {/* Dropdown (<select>) strictly separated by active gender */}
                <select
                  id="dock-hairstyle-select"
                  value={body.hairstyleId}
                  onChange={(e) =>
                    onUpdateBodyField(
                      'hairstyleId',
                      e.target.value as HairstyleId
                    )
                  }
                  className="w-full px-2.5 py-2 mb-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
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

                {/* Interactive 2-Color Hair Dye Mixer (Tự Pha Màu Tóc A + B) */}
                <div className="mt-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                      <Palette className="w-3 h-3 text-amber-600" />
                      <span>Tự Pha Màu Tóc (Mix 2 Màu A + B)</span>
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-amber-900">
                      Tỷ lệ B: {hairMixRatio}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 shrink-0">
                      <span>Màu A</span>
                      <input
                        type="color"
                        value={hairMixColorA}
                        onChange={(e) => {
                          const nextA = e.target.value;
                          setHairMixColorA(nextA);
                          onUpdateBodyField(
                            'hairColorHex',
                            blendHexColors(nextA, hairMixColorB, hairMixRatio)
                          );
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer"
                      />
                    </label>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={hairMixRatio}
                      onChange={(e) => {
                        const nextR = Number(e.target.value);
                        setHairMixRatio(nextR);
                        onUpdateBodyField(
                          'hairColorHex',
                          blendHexColors(hairMixColorA, hairMixColorB, nextR)
                        );
                      }}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />

                    <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 shrink-0">
                      <input
                        type="color"
                        value={hairMixColorB}
                        onChange={(e) => {
                          const nextB = e.target.value;
                          setHairMixColorB(nextB);
                          onUpdateBodyField(
                            'hairColorHex',
                            blendHexColors(hairMixColorA, nextB, hairMixRatio)
                          );
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer"
                      />
                      <span>Màu B</span>
                    </label>
                  </div>

                  {/* Quick Hair Dye Formula Chips */}
                  <div className="flex flex-wrap gap-1">
                    {HAIR_MIX_PRESETS.map((mix) => (
                      <button
                        key={mix.label}
                        type="button"
                        onClick={() => {
                          setHairMixColorA(mix.colorA);
                          setHairMixColorB(mix.colorB);
                          setHairMixRatio(mix.ratioB);
                          onUpdateBodyField(
                            'hairColorHex',
                            blendHexColors(mix.colorA, mix.colorB, mix.ratioB)
                          );
                        }}
                        className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-white hover:bg-amber-600 hover:text-white text-slate-700 border border-amber-200 transition-colors cursor-pointer"
                      >
                        {mix.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Gender-Specific Body Shape (Female = Enter 3 Measurements Ngực/Eo/Hông; Male = BMI from Height/Weight) (4 cols) */}
            <div className="lg:col-span-4 min-w-0 flex flex-col justify-between gap-2">
              {body.genderProfile !== 'male' ? (
                <>
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      Số đo 3 Vòng Nữ (Xác định Dáng người)
                    </span>
                    <button
                      type="button"
                      onClick={onToggleMeasurementTape}
                      className={`text-[11px] font-medium cursor-pointer transition-colors shrink-0 ${
                        showMeasurementTape
                          ? 'text-blue-600 font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {showMeasurementTape ? 'Ẩn thước 3D' : 'Hiện thước 3D'}
                    </button>
                  </div>

                  {/* Memoized Female 3 Measurements Sliders + Inputs: Ngực, Eo, Hông */}
                  <div className="grid grid-cols-3 gap-2">
                    <MemoizedBiometricNumberRangeCard
                      label="Ngực"
                      unit="cm"
                      min={62}
                      max={160}
                      value={body.chestCm}
                      onChange={handleChestChange}
                      compact
                    />
                    <MemoizedBiometricNumberRangeCard
                      label="Eo"
                      unit="cm"
                      min={46}
                      max={150}
                      value={body.waistCm}
                      onChange={handleWaistChange}
                      compact
                    />
                    <MemoizedBiometricNumberRangeCard
                      label="Hông"
                      unit="cm"
                      min={68}
                      max={165}
                      value={body.hipCm}
                      onChange={handleHipChange}
                      compact
                    />
                  </div>

                  {/* Determined Female Body Shape Card */}
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                        <span>{fitAnalysis.bodyShapeName}</span>
                        {onOpenBodyShapeGuide && (
                          <button
                            type="button"
                            onClick={onOpenBodyShapeGuide}
                            title="Xem Cẩm nang Dáng người & Mẹo phối đồ"
                            className="p-0.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-blue-700">
                        Khuyên mặc Size {fitAnalysis.recommendedSize}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {fitAnalysis.bodyShapeDescription}
                    </p>
                  </div>
                </>
              ) : (
                /* Male Body Shape Determined Automatically from Height & Weight -> BMI */
                <div className="flex flex-col justify-between h-full gap-2 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      Dáng Người Nam (Tính từ Chiều cao &amp; Cân nặng)
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-900 text-white rounded whitespace-nowrap shrink-0">
                      BMI: {fitAnalysis.bmi}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                        <span>{fitAnalysis.bodyShapeName}</span>
                        {onOpenBodyShapeGuide && (
                          <button
                            type="button"
                            onClick={onOpenBodyShapeGuide}
                            title="Xem Cẩm nang Dáng người & Mẹo phối đồ"
                            className="p-0.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                      <span className="text-[11px] font-semibold text-blue-600">
                        Gợi ý: Size {fitAnalysis.recommendedSize}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {fitAnalysis.bodyShapeDescription}
                    </p>

                    {/* Visual BMI Scale Bar */}
                    <div className="pt-1">
                      <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-500 to-amber-500 relative">
                        <div
                          className="w-3 h-3 rounded-full bg-slate-900 border-2 border-white shadow absolute -top-0.5 -translate-x-1/2"
                          style={{
                            left: `${Math.min(
                              98,
                              Math.max(4, ((fitAnalysis.bmi - 14) / 26) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                        <span>Mảnh (&lt;18.5)</span>
                        <span>Chuẩn (18.5-22.5)</span>
                        <span>Vạm vỡ (23-25)</span>
                        <span>Khung lớn (&gt;25)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Full-Width Female 3D Makeup & Contact Lens Studio Row (Only for Female Profile) */}
            {body.genderProfile !== 'male' && (
              <div className="lg:col-span-12 pt-3 border-t border-slate-200">
                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-950">
                        Studio Trang Điểm Nữ 3D &amp; Kính Áp Tròng (Makeup &amp; Lens)
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-100 text-rose-800 rounded-md">
                        Son môi · Phấn má · Phấn mắt · Eyeliner · Highlight căng bóng
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-700">
                        Màu Lens Mắt:
                      </span>
                      <div className="flex items-center gap-1">
                        {EYE_LENS_SWATCHES.map((lens) => (
                          <button
                            key={lens.hex}
                            type="button"
                            title={lens.name}
                            onClick={() =>
                              onUpdateBodyField('eyeColorHex', lens.hex)
                            }
                            className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                              body.eyeColorHex.toLowerCase() ===
                              lens.hex.toLowerCase()
                                ? 'ring-2 ring-rose-700 ring-offset-1 scale-110 border-white'
                                : 'border-slate-300 hover:scale-105'
                            }`}
                            style={{ backgroundColor: lens.hex }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onSelectCameraPreset(
                            cameraPreset === 'upper_detail'
                              ? 'full_front'
                              : 'upper_detail'
                          )
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-md transition-colors cursor-pointer"
                      >
                        {cameraPreset === 'upper_detail'
                          ? 'Thu Góc Toàn Thân'
                          : 'Zoom Cận Mặt Xem Makeup'}
                      </button>
                    </div>
                  </div>

                  {/* 6 Makeup Presets */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                    {MAKEUP_PRESETS.map((mp) => (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() =>
                          onUpdateBodyField('makeup', { ...mp.config })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          body.makeup.presetId === mp.id
                            ? 'bg-rose-800 text-white border-rose-800 shadow-xs'
                            : 'bg-white text-slate-800 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        <div className="text-[11px] font-semibold truncate">
                          {mp.name}
                        </div>
                        <div
                          className={`text-[10px] truncate ${
                            body.makeup.presetId === mp.id
                              ? 'text-rose-100'
                              : 'text-slate-500'
                          }`}
                        >
                          {mp.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Detailed Lip, Blush, Eyeshadow, Eyeliner & Dewy Skin Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* 1. Lipstick & Gloss */}
                    <div className="p-2 bg-white border border-rose-200/70 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-900">
                          1. Màu Son Môi &amp; Độ Bóng
                        </span>
                        <div className="flex items-center gap-1">
                          {LIPSTICK_SWATCHES.map((lip) => (
                            <button
                              key={lip.hex}
                              type="button"
                              title={lip.name}
                              onClick={() =>
                                onUpdateBodyField('makeup', {
                                  ...body.makeup,
                                  lipColorHex: lip.hex,
                                  lipIntensity: Math.max(
                                    0.65,
                                    body.makeup.lipIntensity
                                  ),
                                })
                              }
                              className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                                body.makeup.lipColorHex.toLowerCase() ===
                                lip.hex.toLowerCase()
                                  ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 border-white'
                                  : 'border-slate-300 hover:scale-105'
                              }`}
                              style={{ backgroundColor: lip.hex }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Độ đậm son</span>
                            <span className="font-mono font-semibold">
                              {Math.round(body.makeup.lipIntensity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(body.makeup.lipIntensity * 100)}
                            onChange={(e) =>
                              onUpdateBodyField('makeup', {
                                ...body.makeup,
                                lipIntensity: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full studio-slider"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Chất son (Lì ↔ Bóng)</span>
                            <span className="font-mono font-semibold">
                              {Math.round(body.makeup.lipGloss * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(body.makeup.lipGloss * 100)}
                            onChange={(e) =>
                              onUpdateBodyField('makeup', {
                                ...body.makeup,
                                lipGloss: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full studio-slider"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Cheek Blush & Glass-Skin Highlighter */}
                    <div className="p-2 bg-white border border-rose-200/70 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-900">
                          2. Phấn Má Hồng &amp; Căng Bóng
                        </span>
                        <div className="flex items-center gap-1">
                          {BLUSH_SWATCHES.map((bl) => (
                            <button
                              key={bl.hex}
                              type="button"
                              title={bl.name}
                              onClick={() =>
                                onUpdateBodyField('makeup', {
                                  ...body.makeup,
                                  blushColorHex: bl.hex,
                                  blushIntensity: Math.max(
                                    0.5,
                                    body.makeup.blushIntensity
                                  ),
                                })
                              }
                              className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                                body.makeup.blushColorHex.toLowerCase() ===
                                bl.hex.toLowerCase()
                                  ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 border-white'
                                  : 'border-slate-300 hover:scale-105'
                              }`}
                              style={{ backgroundColor: bl.hex }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Má hồng ửng</span>
                            <span className="font-mono font-semibold">
                              {Math.round(body.makeup.blushIntensity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(body.makeup.blushIntensity * 100)}
                            onChange={(e) =>
                              onUpdateBodyField('makeup', {
                                ...body.makeup,
                                blushIntensity: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full studio-slider"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Bắt sáng sống mũi</span>
                            <span className="font-mono font-semibold">
                              {Math.round(
                                body.makeup.highlighterGlow * 100
                              )}
                              %
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(
                              body.makeup.highlighterGlow * 100
                            )}
                            onChange={(e) =>
                              onUpdateBodyField('makeup', {
                                ...body.makeup,
                                highlighterGlow:
                                  Number(e.target.value) / 100,
                              })
                            }
                            className="w-full studio-slider"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Eyeshadow & Winged Eyeliner */}
                    <div className="p-2 bg-white border border-rose-200/70 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-900">
                          3. Phấn Mắt &amp; Kẻ Mắt Eyeliner
                        </span>
                        <div className="flex items-center gap-1">
                          {EYESHADOW_SWATCHES.map((es) => (
                            <button
                              key={es.hex}
                              type="button"
                              title={es.name}
                              onClick={() =>
                                onUpdateBodyField('makeup', {
                                  ...body.makeup,
                                  eyeshadowColorHex: es.hex,
                                  eyeshadowIntensity: Math.max(
                                    0.45,
                                    body.makeup.eyeshadowIntensity
                                  ),
                                })
                              }
                              className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                                body.makeup.eyeshadowColorHex.toLowerCase() ===
                                es.hex.toLowerCase()
                                  ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 border-white'
                                  : 'border-slate-300 hover:scale-105'
                              }`}
                              style={{ backgroundColor: es.hex }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Bầu mắt &amp; Nhũ</span>
                            <span className="font-mono font-semibold">
                              {Math.round(body.makeup.eyeshadowIntensity * 100)}
                              %
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(
                              body.makeup.eyeshadowIntensity * 100
                            )}
                            onChange={(e) =>
                              onUpdateBodyField('makeup', {
                                ...body.makeup,
                                eyeshadowIntensity:
                                  Number(e.target.value) / 100,
                              })
                            }
                            className="w-full studio-slider"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Eyeliner sắc nét</span>
                            <span className="font-mono font-semibold">
                              {Math.round(body.makeup.eyelinerIntensity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(
                              body.makeup.eyelinerIntensity * 100
                            )}
                            onChange={(e) =>
                              onUpdateBodyField('makeup', {
                                ...body.makeup,
                                eyelinerIntensity: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full studio-slider"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WARDROBE, SUGGESTED OUTFITS, AI GARMENT UPLOAD & VISUAL OUTFIT SCORING */}
        {activeTab === 'wardrobe' && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[310px] overflow-y-auto">
            {/* Column 1: Layer Category + Garment Style Dropdown Selector + AI Upload Garment (6 cols) */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-2.5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 lg:pb-0 lg:pr-4">
              <div>
                {/* Layer Selector Tabs (Including One-Piece Dress / Đầm liền + Bare Body Toggle) */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-2 overflow-x-auto">
                  {(
                    [
                      { id: 'top', label: 'Áo' },
                      ...(body.genderProfile !== 'male'
                        ? [{ id: 'dress' as WardrobeCategory, label: 'Đầm liền' }]
                        : []),
                      { id: 'outerwear', label: 'Khoác' },
                      { id: 'bottom', label: 'Quần/Váy' },
                      { id: 'footwear', label: 'Giày' },
                    ] as { id: WardrobeCategory; label: string }[]
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setWardrobeCat(cat.id)}
                      className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        wardrobeCat === cat.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateOutfit({
                        ...outfit,
                        hideAllGarments: !outfit.hideAllGarments,
                      })
                    }
                    className={`py-1 px-2 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      outfit.hideAllGarments
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-100/90 text-amber-900 hover:bg-amber-200'
                    }`}
                  >
                    {outfit.hideAllGarments ? 'Mặc Lại Đồ' : 'Lộ Cơ Thể'}
                  </button>
                </div>

                {/* Clean Dropdown Selection (<select>) for Garment Styles */}
                <div className="mb-2">
                  {wardrobeCat === 'top' && (
                    <select
                      value={currentDressLayer.styleId !== 'none' ? 'none' : outfit.top.styleId}
                      onChange={(e) => {
                        const styleId = e.target.value as TopStyleId;
                        const item = TOP_STYLES.find((t) => t.id === styleId);
                        if (!item) return;
                        onUpdateOutfit({
                          ...outfit,
                          dress: {
                            ...currentDressLayer,
                            styleId: 'none',
                          },
                          top: {
                            ...outfit.top,
                            styleId,
                            fabric: item.defaultFabric,
                            colorHex: item.defaultColor,
                            uploadedTextureUrl: undefined,
                            uploadedName: undefined,
                            transformedSummary: undefined,
                            previewThumbUrl: undefined,
                          },
                        });
                      }}
                      className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      {TOP_STYLES.filter(
                        (item) =>
                          item.genderHint ===
                            (body.genderProfile === 'male' ? 'male' : 'female') ||
                          item.genderHint === 'unisex'
                      ).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {wardrobeCat === 'dress' && (
                    <select
                      value={currentDressLayer.styleId}
                      onChange={(e) => {
                        const styleId = e.target.value as DressStyleId;
                        const item = DRESS_STYLES.find((d) => d.id === styleId);
                        if (!item) return;
                        onUpdateOutfit({
                          ...outfit,
                          hideAllGarments: false,
                          dress: {
                            ...currentDressLayer,
                            styleId,
                            fabric: item.defaultFabric,
                            colorHex: item.defaultColor,
                            uploadedTextureUrl: undefined,
                            uploadedName: undefined,
                            transformedSummary: undefined,
                            previewThumbUrl: undefined,
                          },
                        });
                      }}
                      className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      {DRESS_STYLES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {wardrobeCat === 'outerwear' && (
                    <select
                      value={outfit.outerwear.styleId}
                      onChange={(e) => {
                        const styleId = e.target.value as OuterwearStyleId;
                        const item = OUTERWEAR_STYLES.find((o) => o.id === styleId);
                        if (!item) return;
                        onUpdateOutfit({
                          ...outfit,
                          outerwear: {
                            ...outfit.outerwear,
                            styleId,
                            fabric: item.defaultFabric,
                            colorHex: item.defaultColor,
                            uploadedTextureUrl: undefined,
                            uploadedName: undefined,
                            transformedSummary: undefined,
                            previewThumbUrl: undefined,
                          },
                        });
                      }}
                      className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      {OUTERWEAR_STYLES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {wardrobeCat === 'bottom' && (
                    <select
                      value={currentDressLayer.styleId !== 'none' ? 'none' : outfit.bottom.styleId}
                      onChange={(e) => {
                        const styleId = e.target.value as BottomStyleId;
                        const item = BOTTOM_STYLES.find((b) => b.id === styleId);
                        if (!item) return;
                        onUpdateOutfit({
                          ...outfit,
                          dress: {
                            ...currentDressLayer,
                            styleId: 'none',
                          },
                          bottom: {
                            ...outfit.bottom,
                            styleId,
                            fabric: item.defaultFabric,
                            colorHex: item.defaultColor,
                            uploadedTextureUrl: undefined,
                            uploadedName: undefined,
                            transformedSummary: undefined,
                            previewThumbUrl: undefined,
                          },
                        });
                      }}
                      className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      {BOTTOM_STYLES.filter(
                        (item) =>
                          item.genderHint ===
                            (body.genderProfile === 'male' ? 'male' : 'female') ||
                          item.genderHint === 'unisex'
                      ).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {wardrobeCat === 'footwear' && (
                    <select
                      value={outfit.footwear.styleId}
                      onChange={(e) => {
                        const styleId = e.target.value as FootwearStyleId;
                        const item = FOOTWEAR_STYLES.find((f) => f.id === styleId);
                        if (!item) return;
                        onUpdateOutfit({
                          ...outfit,
                          footwear: {
                            styleId,
                            colorHex: item.defaultColor,
                          },
                        });
                      }}
                      className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      {FOOTWEAR_STYLES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* AI Upload Custom Garment + Model Photo Extraction + Live Camera Capture Bar */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGarmentFileUpload}
                  className="hidden"
                />
                <input
                  ref={modelPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleModelPhotoExtraction}
                  className="hidden"
                />
                <input
                  ref={mobileCameraFallbackInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleMobileCameraFallbackCapture}
                  className="hidden"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {activeLayerConfig.previewThumbUrl && (
                      <img
                        src={activeLayerConfig.previewThumbUrl}
                        alt="Ảnh đã tách nền"
                        className="w-8 h-8 rounded object-contain bg-white p-0.5 border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-900 truncate">
                        {activeLayerConfig.transformedSummary
                          ? activeLayerConfig.transformedSummary
                          : 'AI Tách Nền Trang Phục & Chụp Ảnh Đồ'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {activeLayerConfig.uploadedName
                          ? `Đang mặc: ${activeLayerConfig.uploadedName}`
                          : 'Up ảnh lẻ, ảnh người mẫu mặc đồ hoặc chụp trực tiếp bằng Camera'}
                      </div>
                    </div>
                  </div>
                  {activeLayerConfig.transformedSummary && (
                    <button
                      type="button"
                      title="Xóa thông tin ảnh trang phục đã tải lên"
                      onClick={() =>
                        updateActiveGarment({
                          uploadedName: undefined,
                          transformedSummary: undefined,
                          previewThumbUrl: undefined,
                          uploadedTextureUrl: undefined,
                          uploadedCutoutParams: undefined,
                        })
                      }
                      className="p-1 text-slate-500 hover:text-red-600 bg-white border border-slate-200 rounded-md cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    disabled={isUploadingGarment || isExtractingModelPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-semibold rounded-md transition-colors cursor-pointer truncate"
                  >
                    <Upload className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {isUploadingGarment ? 'Đang tách...' : 'Up Đồ Lẻ'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isExtractingModelPhoto || isUploadingGarment}
                    onClick={() => modelPhotoInputRef.current?.click()}
                    title="Tải ảnh người mẫu đang mặc đồ — AI sẽ tự động nhận diện và tách riêng Áo / Đầm / Khoác / Quần / Giày khỏi nền"
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-semibold rounded-md transition-colors cursor-pointer truncate"
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {isExtractingModelPhoto ? 'AI đang tách...' : 'Tách Ảnh Mẫu'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isExtractingModelPhoto || isUploadingGarment}
                    onClick={openCameraCaptureModal}
                    title="Tự chụp ảnh trang phục bằng Camera — AI tự động xóa nền và mặc lên ma-nơ-canh"
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-semibold rounded-md transition-colors cursor-pointer truncate"
                  >
                    <Camera className="w-3 h-3 shrink-0" />
                    <span className="truncate">Chụp Đồ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Suggested Complete Outfits + PBR Fabric + Color Swatches (6 cols) */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-2">
              {/* Suggested Complete Outfits + Random Outfit Shuffle */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {body.genderProfile === 'male'
                      ? 'Trang Phục Nam Gợi Ý'
                      : 'Trang Phục Nữ Gợi Ý'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {onRandomShuffleOutfit && (
                      <button
                        type="button"
                        onClick={onRandomShuffleOutfit}
                        title="Phối đồ ngẫu nhiên kết hợp giữa tủ đồ có sẵn và các món đồ bạn đã upload"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                      >
                        <Shuffle className="w-3 h-3" />
                        <span>Phối Ngẫu Nhiên</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {SUGGESTED_OUTFIT_PRESETS.filter(
                    (preset) =>
                      preset.genderHint ===
                      (body.genderProfile === 'male' ? 'male' : 'female')
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        onUpdateOutfit({
                          ...preset.outfit,
                          selectedSize: outfit.selectedSize,
                          hideAllGarments: false,
                        })
                      }
                      className="px-2 py-1 text-left bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 rounded-md transition-colors cursor-pointer truncate"
                    >
                      <div className="text-[11px] font-medium truncate">
                        {preset.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fabric + Swatches Row */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-900">
                    Chất liệu Vải PBR & Bảng Màu
                  </span>
                  <div className="flex items-center gap-1.5">
                    {wardrobeCat !== 'footwear' && (
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {FABRIC_LIBRARY[activeLayerConfig.fabric].name}
                      </span>
                    )}
                    <input
                      type="color"
                      aria-label="Chọn màu tùy ý"
                      value={
                        wardrobeCat === 'footwear'
                          ? outfit.footwear.colorHex
                          : activeLayerConfig.colorHex
                      }
                      onChange={(e) =>
                        updateActiveGarment({ colorHex: e.target.value })
                      }
                      className="w-5 h-5 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>

                {wardrobeCat !== 'footwear' && (
                  <div className="grid grid-cols-6 gap-1 mb-1.5">
                    {(
                      [
                        { id: 'cotton', label: 'Cotton' },
                        { id: 'silk', label: 'Lụa Silk' },
                        { id: 'denim', label: 'Vải Bò' },
                        { id: 'leather', label: 'Da Thuộc' },
                        { id: 'fleece', label: 'Len Nỉ' },
                        { id: 'linen', label: 'Vải Đay' },
                      ] as { id: FabricType; label: string }[]
                    ).map((fb) => (
                      <button
                        key={fb.id}
                        type="button"
                        title={FABRIC_LIBRARY[fb.id].subtitle}
                        onClick={() => updateActiveGarment({ fabric: fb.id })}
                        className={`px-1 py-1 text-[10px] font-medium rounded border transition-colors cursor-pointer truncate ${
                          activeLayerConfig.fabric === fb.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {fb.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-7 gap-1.5 py-1">
                  {FASHION_SWATCHES.map((sw) => {
                    const currentHex =
                      wardrobeCat === 'footwear'
                        ? outfit.footwear.colorHex
                        : activeLayerConfig.colorHex;
                    const active =
                      currentHex.toLowerCase() === sw.hex.toLowerCase();
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.name}
                        onClick={() => updateActiveGarment({ colorHex: sw.hex })}
                        className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                          active
                            ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 border-slate-400'
                            : 'border-slate-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>

                {/* Interactive 2-Color Garment Mixer (Tự Pha Màu Áo / Quần / Váy / Giày) */}
                <div className="mt-1.5 p-2 rounded-lg bg-violet-50/70 border border-violet-200/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                      <Palette className="w-3 h-3 text-violet-600" />
                      <span>
                        Pha Màu{' '}
                        {wardrobeCat === 'top'
                          ? 'Áo Trong'
                          : wardrobeCat === 'dress'
                          ? 'Đầm Liền'
                          : wardrobeCat === 'outerwear'
                          ? 'Áo Khoác'
                          : wardrobeCat === 'bottom'
                          ? 'Quần / Váy'
                          : 'Giày'}{' '}
                        (Mix A + B)
                      </span>
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-violet-900">
                      {(wardrobeCat === 'footwear'
                        ? outfit.footwear.colorHex
                        : activeLayerConfig.colorHex
                      ).toUpperCase()}{' '}
                      ({garmentMixRatio}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 shrink-0">
                      <span>Màu A</span>
                      <input
                        type="color"
                        value={garmentMixColorA}
                        onChange={(e) => {
                          const nextA = e.target.value;
                          setGarmentMixColorA(nextA);
                          updateActiveGarment({
                            colorHex: blendHexColors(
                              nextA,
                              garmentMixColorB,
                              garmentMixRatio
                            ),
                          });
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer"
                      />
                    </label>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={garmentMixRatio}
                      onChange={(e) => {
                        const nextR = Number(e.target.value);
                        setGarmentMixRatio(nextR);
                        updateActiveGarment({
                          colorHex: blendHexColors(
                            garmentMixColorA,
                            garmentMixColorB,
                            nextR
                          ),
                        });
                      }}
                      className="flex-1 accent-violet-600 cursor-pointer"
                    />

                    <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 shrink-0">
                      <input
                        type="color"
                        value={garmentMixColorB}
                        onChange={(e) => {
                          const nextB = e.target.value;
                          setGarmentMixColorB(nextB);
                          updateActiveGarment({
                            colorHex: blendHexColors(
                              garmentMixColorA,
                              nextB,
                              garmentMixRatio
                            ),
                          });
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer"
                      />
                      <span>Màu B</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Size Selector */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">Size đồ:</span>
                <div className="flex items-center gap-1">
                  {(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() =>
                        onUpdateOutfit({ ...outfit, selectedSize: sz })
                      }
                      className={`px-1.5 py-0.5 text-[11px] font-mono font-medium rounded transition-colors cursor-pointer ${
                        outfit.selectedSize === sz
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Full-Width Row 0: Khay Trang Phục Đã Tách Nền AI + Tự Động Xoay 360° (Generate 360 View) + Phối Ngẫu Nhiên */}
            <div className="lg:col-span-12 pt-2.5 border-t border-slate-200">
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50/90 via-white to-emerald-50/80 border border-indigo-200/90 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          AI Bóc Tách Trọn Bộ Từ Ảnh Người Mẫu (Quần Áo + Kiểu Tóc + Phụ Kiện)
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-600 text-white">
                          THỬ TRỌN BỘ &amp; XOAY 360°
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {extractionSummary ||
                          'Khi tải ảnh người mẫu mặc đồ, AI tự động phân loại tách riêng Trang phục, Kiểu tóc và Phụ kiện đi kèm (Túi xách, Kính mát, Đồng hồ) để bạn thử trọn vẹn tất cả.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      disabled={isExtractingModelPhoto}
                      onClick={() => modelPhotoInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {isExtractingModelPhoto ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Up Ảnh Người Mẫu (Tách Đồ + Tóc + Phụ Kiện)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isExtractingModelPhoto}
                      onClick={openCameraCaptureModal}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Chụp Ảnh Trang Phục</span>
                    </button>

                    {onRandomShuffleOutfit && (
                      <button
                        type="button"
                        onClick={onRandomShuffleOutfit}
                        title="Phối ngẫu nhiên kết hợp trang phục trong kho và các món đồ đã upload"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Phối Ngẫu Nhiên</span>
                      </button>
                    )}

                    {combinedExtractedGarments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowInline360Preview((prev) => !prev);
                          onOpenGarment360Preview?.(
                            combinedExtractedGarments[0]
                          );
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Generate 360° View</span>
                      </button>
                    )}

                    {combinedExtractedGarments.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          applyExtractedItemsToOutfit(combinedExtractedGarments)
                        }
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          Thử Trọn Bộ Tất Cả ({combinedExtractedGarments.length})
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {combinedExtractedGarments.length > 0 && (
                  <>
                    {/* Category Filter Pills for Clothing / Hair / Accessories */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-indigo-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                        Phân loại đã tách:
                      </span>
                      {(
                        [
                          {
                            id: 'all',
                            label: `Tất cả (${combinedExtractedGarments.length})`,
                          },
                          {
                            id: 'clothing',
                            label: `Quần áo & Giày (${
                              combinedExtractedGarments.filter(
                                (i) =>
                                  i.category === 'top' ||
                                  i.category === 'dress' ||
                                  i.category === 'outerwear' ||
                                  i.category === 'bottom' ||
                                  i.category === 'footwear'
                              ).length
                            })`,
                          },
                          {
                            id: 'hairstyle',
                            label: `Kiểu Tóc (${
                              combinedExtractedGarments.filter(
                                (i) => i.category === 'hairstyle'
                              ).length
                            })`,
                          },
                          {
                            id: 'accessories',
                            label: `Phụ Kiện Đi Kèm (${
                              combinedExtractedGarments.filter(
                                (i) =>
                                  i.category === 'watch' ||
                                  i.category === 'handbag' ||
                                  i.category === 'sunglasses'
                              ).length
                            })`,
                          },
                        ] as const
                      ).map((tab) => {
                        const active = extractedFilterTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setExtractedFilterTab(tab.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              active
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
                      {/* Left 7 cols: Extracted Garments, Hairstyle & Accessories List */}
                      <div
                        className={`${
                          showInline360Preview
                            ? 'lg:col-span-7'
                            : 'lg:col-span-12'
                        } grid grid-cols-1 sm:grid-cols-2 gap-2 content-start`}
                      >
                        {(filteredExtractedGarments.length > 0
                          ? filteredExtractedGarments
                          : combinedExtractedGarments
                        ).map((item) => {
                          const catLabel =
                            item.category === 'dress'
                              ? 'ĐẦM LIỀN'
                              : item.category === 'outerwear'
                              ? 'ÁO KHOÁC'
                              : item.category === 'bottom'
                              ? 'QUẦN / VÁY'
                              : item.category === 'footwear'
                              ? 'GIÀY'
                              : item.category === 'hairstyle'
                              ? 'KIỂU TÓC'
                              : item.category === 'watch'
                              ? 'PP: ĐỒNG HỒ'
                              : item.category === 'handbag'
                              ? 'PK: TÚI XÁCH'
                              : item.category === 'sunglasses'
                              ? 'PK: KÍNH MÁT'
                              : 'ÁO';
                          const badgeColorClass =
                            item.category === 'hairstyle'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : item.category === 'watch' ||
                                item.category === 'handbag' ||
                                item.category === 'sunglasses'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200';
                          const actionLabel =
                            item.category === 'hairstyle'
                              ? 'Chạm đổi kiểu tóc →'
                              : item.category === 'watch' ||
                                item.category === 'handbag' ||
                                item.category === 'sunglasses'
                              ? 'Chạm đeo phụ kiện →'
                              : 'Chạm mặc 3D →';
                          const isSelected360 =
                            (activeInline360ItemId ||
                              combinedExtractedGarments[0]?.id) === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setActiveInline360ItemId(item.id);
                                applyExtractedItemsToOutfit([item]);
                              }}
                              className={`group flex items-center gap-2.5 p-2 rounded-lg bg-white border transition-all cursor-pointer ${
                                isSelected360
                                  ? 'border-indigo-600 ring-1 ring-indigo-600/40 shadow-xs'
                                  : 'border-slate-200 hover:border-indigo-500 shadow-2xs'
                              }`}
                            >
                              <img
                                src={item.previewThumbUrl}
                                alt={item.vietnameseName}
                                className="w-12 h-12 rounded-md object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${badgeColorClass}`}
                                  >
                                    {catLabel}
                                  </span>
                                  <span
                                    className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                                    style={{ backgroundColor: item.colorHex }}
                                  />
                                </div>
                                <div className="text-[11px] font-bold text-slate-900 truncate group-hover:text-indigo-700">
                                  {item.vietnameseName}
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <span className="text-[10px] text-emerald-700 font-medium">
                                    {actionLabel}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveInline360ItemId(item.id);
                                      setShowInline360Preview(true);
                                      onOpenGarment360Preview?.(item);
                                    }}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-100 hover:bg-indigo-600 text-indigo-900 hover:text-white text-[9px] font-bold transition-colors cursor-pointer"
                                  >
                                    <RotateCw className="w-2.5 h-2.5" />
                                    <span>Xem 360°</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right 5 cols: Automatic Interactive 360-Degree Garment Preview */}
                      {showInline360Preview && (
                        <div className="lg:col-span-5">
                          <Garment360Preview
                            items={combinedExtractedGarments}
                            activeItemId={
                              activeInline360ItemId ||
                              combinedExtractedGarments[0]?.id
                            }
                            onSelectItem={(item) =>
                              setActiveInline360ItemId(item.id)
                            }
                            onApplyItemToMannequin={(item) =>
                              applyExtractedItemsToOutfit([item])
                            }
                            onApplyAllItemsToMannequin={(allItems) =>
                              applyExtractedItemsToOutfit(allItems)
                            }
                            onTriggerMannequin360Video={
                              onTriggerMannequin360Video
                            }
                            onClose={() => setShowInline360Preview(false)}
                            mode="inline"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Full-Width Row 1: Gợi Ý Trang Phục Phối Hợp Với Đồ Người Dùng Upload (Upload-Matched Outfit Recommendations) */}
            <div className="lg:col-span-12 pt-2.5 border-t border-slate-200">
              <div
                className={`p-3 rounded-xl border space-y-2.5 ${
                  hasUploadedGarmentOnMannequin
                    ? 'bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-emerald-50/70 border-blue-300 shadow-xs'
                    : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg text-white ${
                        hasUploadedGarmentOnMannequin
                          ? 'bg-blue-600'
                          : 'bg-slate-800'
                      }`}
                    >
                      <Shirt className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {hasUploadedGarmentOnMannequin
                            ? 'Gợi Ý Phối Đồ Hợp Với Trang Phục Bạn Đã Upload'
                            : 'Gợi Ý Phối Đồ Đồng Bộ Với Món Đồ Chủ Đạo Đang Mặc'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                            hasUploadedGarmentOnMannequin
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {hasUploadedGarmentOnMannequin
                            ? 'GIỮ NGUYÊN ĐỒ UPLOAD 3D'
                            : '4 SET PHỐI TỰ ĐỘNG'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {hasUploadedGarmentOnMannequin
                          ? 'Hệ thống giữ nguyên món đồ 3D bạn vừa tải ảnh lên và tự động gợi ý các món Áo / Quần / Váy / Giày & Phụ kiện ăn ý nhất về phom dáng và màu sắc.'
                          : 'Tải ảnh trang phục của bạn lên (nút Upload Đồ) hoặc chọn ngay 1 trong 4 phương án phối đồ ăn ý dưới đây.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {hasUploadedGarmentOnMannequin
                          ? 'Upload đổi món đồ khác'
                          : 'Upload ảnh trang phục để gợi ý'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadMatchSection((prev) => !prev)}
                      title={
                        showUploadMatchSection
                          ? 'Đóng / Thu gọn tab gợi ý phối đồ'
                          : 'Mở tab gợi ý phối đồ'
                      }
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-mono text-sm font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {showUploadMatchSection ? '−' : '+'}
                    </button>
                  </div>
                </div>

                {showUploadMatchSection && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {uploadMatchedSuggestions.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => onUpdateOutfit(rec.outfit)}
                      className="group flex flex-col justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 truncate">
                            {rec.styleTag}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 truncate max-w-[110px]">
                            Giữ: {rec.anchorName}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {rec.title}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                          {rec.harmonyNote}
                        </p>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span
                            title="Màu Áo trong"
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{
                              backgroundColor: rec.outfit.top.colorHex,
                            }}
                          />
                          {rec.outfit.outerwear.styleId !== 'none' && (
                            <span
                              title="Màu Áo khoác"
                              className="w-3.5 h-3.5 rounded-full border border-slate-300"
                              style={{
                                backgroundColor: rec.outfit.outerwear.colorHex,
                              }}
                            />
                          )}
                          <span
                            title="Màu Quần/Váy"
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{
                              backgroundColor: rec.outfit.bottom.colorHex,
                            }}
                          />
                          <span
                            title="Màu Giày"
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{
                              backgroundColor: rec.outfit.footwear.colorHex,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                          Mặc thử ngay →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>

            {/* Full-Width Row 2: Bộ Công Cụ 'Color Palette Generator' AI (Color Theory Matching) */}
            <div className="lg:col-span-12 pt-2.5 border-t border-slate-200">
              <div className="p-3 bg-gradient-to-r from-violet-50/80 via-fuchsia-50/40 to-amber-50/60 border border-violet-200/90 rounded-xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-600 text-white">
                      <Palette className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          Color Palette Generator AI — Gợi Ý Phối Màu Chuyên Nghiệp (Color Theory Matching)
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-violet-100 text-violet-900 border border-violet-200">
                          {currentColorPaletteData.source === 'gemini_ai'
                            ? 'GEMINI AI COLORIST'
                            : 'HSL COLOR WHEEL ENGINE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Phân tích từ món chủ đạo:{' '}
                        <strong>
                          {currentColorPaletteData.anchorCategoryLabel}
                        </strong>{' '}
                        ({currentColorPaletteData.anchorColorHex}) — Chọn 1
                        trong 5 nguyên lý bánh xe màu để áp dụng đồng bộ lên
                        người mẫu.
                      </p>
                    </div>
                  </div>

                  {/* Anchor Piece Selector + AI Refresh Button */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[11px]">
                      <span className="px-1.5 text-slate-500 font-medium">
                        Màu gốc chủ đạo:
                      </span>
                      {(
                        [
                          { id: 'auto', label: 'Tự động' },
                          { id: 'top', label: 'Áo trong' },
                          { id: 'outerwear', label: 'Áo khoác' },
                          { id: 'bottom', label: 'Quần/Váy' },
                        ] as const
                      ).map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setColorAnchorSlot(slot.id)}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                            colorAnchorSlot === slot.id
                              ? 'bg-violet-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-violet-200 text-[11px]">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                        style={{
                          backgroundColor:
                            currentColorPaletteData.anchorColorHex,
                        }}
                      />
                      <span className="font-mono font-bold text-slate-800">
                        {currentColorPaletteData.anchorColorHex}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isGeneratingPalettes}
                      onClick={handleGenerateAiColorPalettes}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      {isGeneratingPalettes ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isGeneratingPalettes
                          ? 'AI đang phân tích màu...'
                          : 'Gợi ý Phối Màu AI'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowColorPaletteSection((prev) => !prev)}
                      title={
                        showColorPaletteSection
                          ? 'Đóng / Thu gọn tab gợi ý phối màu AI'
                          : 'Mở tab gợi ý phối màu AI'
                      }
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-mono text-sm font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {showColorPaletteSection ? '−' : '+'}
                    </button>
                  </div>
                </div>

                {/* 5 Color Harmony Palette Cards */}
                {showColorPaletteSection && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {currentColorPaletteData.palettes.map((pal) => {
                    const isSelected = activePaletteId === pal.id;
                    return (
                      <div
                        key={pal.id}
                        onClick={() => handleApplyColorPalette(pal)}
                        className={`group flex flex-col justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-violet-400 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded truncate ${
                                isSelected
                                  ? 'bg-violet-500 text-white'
                                  : 'bg-violet-100 text-violet-900'
                              }`}
                            >
                              {pal.schemeLabel}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs font-bold truncate">
                            {pal.paletteName}
                          </div>
                          <p
                            className={`text-[10px] mt-0.5 leading-snug line-clamp-2 ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {pal.theoryExplanation}
                          </p>
                        </div>

                        {/* Interactive 5-piece Color Bar */}
                        <div className="mt-2 space-y-1.5">
                          <div className="grid grid-cols-5 gap-1">
                            {pal.swatches.map((sw, idx) => (
                              <div
                                key={idx}
                                title={`${sw.role}: ${sw.name} (${sw.hex})`}
                                className="flex flex-col items-center gap-0.5"
                              >
                                <div
                                  className="w-full h-5 rounded border border-black/15 shadow-2xs"
                                  style={{ backgroundColor: sw.hex }}
                                />
                                <span
                                  className={`text-[8px] font-mono truncate max-w-full ${
                                    isSelected
                                      ? 'text-slate-300'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {sw.role.replace('Áo ', '')}
                                </span>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyColorPalette(pal);
                            }}
                            className={`w-full py-1 px-2 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'bg-violet-50 group-hover:bg-violet-600 text-violet-900 group-hover:text-white'
                            }`}
                          >
                            {isSelected
                              ? 'Đang áp dụng trên Mannequin'
                              : 'Áp dụng bảng màu này'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </div>

            {/* Full-Width Row 3: Xem Lại Lịch Sử Trang Phục Đã Phối & Xoá Bộ Không Thích */}
            <div className="lg:col-span-12 pt-2.5 border-t border-slate-200">
              <div className="p-2.5 bg-indigo-50/50 border border-indigo-200/80 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                    <span className="text-xs font-bold text-slate-900">
                      Xem Lại Lịch Sử Trang Phục Đã Phối &amp; Xoá Bộ Không Thích ({outfitHistory.length}/12)
                    </span>
                    <span className="hidden sm:inline text-[10px] text-slate-500">
                      Nhấp vào thẻ để mặc lại, so sánh song song A|B, hoặc nhấn &ldquo;Xoá bộ này&rdquo; để loại bỏ bộ phối không ưng ý
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {onToggleSplitCompareMode && (
                      <button
                        type="button"
                        onClick={onToggleSplitCompareMode}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border rounded-md transition-colors cursor-pointer ${
                          isSplitCompareMode
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-300'
                        }`}
                      >
                        <Columns2 className="w-3 h-3" />
                        <span>
                          {isSplitCompareMode
                            ? 'Đang bật So Sánh Song Song (A | B)'
                            : 'So sánh song song 2 màn hình (Split-Screen)'}
                        </span>
                      </button>
                    )}

                    {outfitHistory.length >= 2 && (
                      <button
                        type="button"
                        onClick={handleQuickFlipAB}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-300 rounded-md transition-colors cursor-pointer"
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>Đảo nhanh 2 bộ gần nhất (A ↔ B)</span>
                      </button>
                    )}

                    {outfitHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearHistory}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:text-white bg-white hover:bg-rose-600 border border-rose-200 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xoá tất cả lịch sử</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onSaveCurrentOutfit}
                      className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors cursor-pointer"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Lưu Outfit Đang Mặc</span>
                    </button>
                  </div>
                </div>

                {outfitHistory.length === 0 ? (
                  <div className="text-[11px] text-slate-500 py-2 text-center bg-white/80 rounded-lg border border-dashed border-indigo-200">
                    Chưa có bộ trang phục nào trong lịch sử. Hãy nhấn <strong>&ldquo;Lưu Outfit Đang Mặc&rdquo;</strong> để lưu lại các bộ đồ bạn đã phối và dễ dàng xem lại hoặc xoá bớt bất kỳ lúc nào!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {outfitHistory.map((entry, idx) => {
                      const isCurrentActive = activeHistoryId === entry.id;
                      const isCurrentCompareB =
                        isSplitCompareMode && activeHistoryIdB === entry.id;
                      const scoreDiff = entry.score.totalScore - score.totalScore;
                      return (
                        <div
                          key={entry.id}
                          onClick={() => onApplyHistoryEntry(entry)}
                          className={`group relative flex flex-col justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isCurrentActive
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : isCurrentCompareB
                              ? 'bg-indigo-950 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                    isCurrentActive || isCurrentCompareB
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-indigo-100 text-indigo-800'
                                  }`}
                                >
                                  #{outfitHistory.length - idx}
                                </span>
                                <span
                                  className={`text-[10px] font-mono ${
                                    isCurrentActive || isCurrentCompareB
                                      ? 'text-slate-300'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {entry.timestamp}
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-semibold ${
                                    isCurrentActive || isCurrentCompareB
                                      ? 'text-amber-300'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  · Size {entry.outfit.selectedSize}
                                </span>
                              </div>
                              <div className="text-[11px] font-semibold truncate mt-0.5">
                                {entry.label}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {onSelectCompareHistoryB && (
                                <button
                                  type="button"
                                  title="Đặt bộ phối này vào Khung B (Bên Phải) để so sánh song song"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCompareHistoryB(entry);
                                  }}
                                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded transition-colors cursor-pointer ${
                                    isCurrentCompareB
                                      ? 'bg-indigo-500 text-white'
                                      : isCurrentActive
                                      ? 'bg-white/15 hover:bg-indigo-500 text-white'
                                      : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-800 hover:text-white border border-indigo-200'
                                  }`}
                                >
                                  {isCurrentCompareB ? 'Khung B' : 'So sánh B'}
                                </button>
                              )}

                              <button
                                type="button"
                                title="Xoá bộ trang phục này khỏi lịch sử"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteHistoryEntry(entry.id);
                                }}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer shrink-0 ${
                                  isCurrentActive || isCurrentCompareB
                                    ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-600 hover:text-white'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'
                                }`}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Xoá</span>
                              </button>
                            </div>
                          </div>

                          {/* Color Swatches + Score Comparison Row */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/20">
                            <div className="flex items-center gap-1">
                              {entry.outfit.top.styleId !== 'none' && (
                                <span
                                  title="Màu Áo trong"
                                  className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                                  style={{
                                    backgroundColor: entry.outfit.top.colorHex,
                                  }}
                                />
                              )}
                              {entry.outfit.outerwear.styleId !== 'none' && (
                                <span
                                  title="Màu Áo khoác"
                                  className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                                  style={{
                                    backgroundColor:
                                      entry.outfit.outerwear.colorHex,
                                  }}
                                />
                              )}
                              {entry.outfit.bottom.styleId !== 'none' && (
                                <span
                                  title="Màu Quần/Váy"
                                  className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                                  style={{
                                    backgroundColor:
                                      entry.outfit.bottom.colorHex,
                                  }}
                                />
                              )}
                              {entry.outfit.footwear.styleId !== 'none' && (
                                <span
                                  title="Màu Giày"
                                  className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                                  style={{
                                    backgroundColor:
                                      entry.outfit.footwear.colorHex,
                                  }}
                                />
                              )}
                            </div>

                            <div className="flex items-center gap-1 font-mono text-[10px]">
                              <span className="font-bold">
                                {entry.score.totalScore}đ ({entry.score.grade})
                              </span>
                              {!isCurrentActive && scoreDiff !== 0 && (
                                <span
                                  className={`px-1 py-0.2 rounded font-bold ${
                                    scoreDiff > 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {scoreDiff > 0
                                    ? `+${scoreDiff}đ`
                                    : `${scoreDiff}đ`}
                                </span>
                              )}
                              {isCurrentActive && (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-sans font-semibold">
                                  Đang mặc
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2 (Full-Width 12 Cols): Environmental Weather Effects (Wind & Rain) & Fabric Drape / GSM Thickness Lab */}
            {onUpdateWeatherEffect && (
              <div className="lg:col-span-12 pt-3 border-t border-slate-200">
                <div className="p-3 rounded-xl bg-gradient-to-r from-sky-50/90 via-slate-50 to-indigo-50/80 border border-sky-200/90 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-600 text-white">
                        <Wind className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>
                            Hiệu ứng Môi trường (Weather Effects) — Kiểm tra Độ
                            rủ (Drape) &amp; Độ dày vải (GSM)
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-sky-100 text-sky-900 border border-sky-200">
                            REAL-TIME 3D PHYSICS
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Giả lập tác động ngoại cảnh (Gió thổi tung tà, Mưa
                          thấm ướt ôm sát cơ thể) trực tiếp lên chất liệu vải
                          đang mặc.
                        </p>
                      </div>
                    </div>

                    {/* Weather Mode Selector Buttons */}
                    <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                      {(
                        [
                          {
                            id: 'clear',
                            label: 'Studio Khô ráo',
                            icon: Sun,
                          },
                          {
                            id: 'wind',
                            label: 'Gió thổi (Drape)',
                            icon: Wind,
                          },
                          {
                            id: 'rain',
                            label: 'Mưa (Độ dày & Thấm)',
                            icon: CloudRain,
                          },
                          {
                            id: 'storm',
                            label: 'Mưa bão (Gió + Mưa)',
                            icon: CloudLightning,
                          },
                        ] as {
                          id: WeatherMode;
                          label: string;
                          icon: React.ComponentType<{ className?: string }>;
                        }[]
                      ).map((m) => {
                        const Icon = m.icon;
                        const isSelected = weatherEffect.mode === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              onUpdateWeatherEffect({
                                ...weatherEffect,
                                mode: m.id,
                                windIntensity:
                                  m.id === 'wind' &&
                                  weatherEffect.windIntensity < 20
                                    ? 65
                                    : m.id === 'storm' &&
                                      weatherEffect.windIntensity < 55
                                    ? 80
                                    : weatherEffect.windIntensity,
                                rainIntensity:
                                  m.id === 'rain' &&
                                  weatherEffect.rainIntensity < 20
                                    ? 65
                                    : m.id === 'storm' &&
                                      weatherEffect.rainIntensity < 55
                                    ? 80
                                    : weatherEffect.rainIntensity,
                              })
                            }
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? m.id === 'clear'
                                  ? 'bg-slate-900 text-white'
                                  : m.id === 'wind'
                                  ? 'bg-sky-600 text-white'
                                  : m.id === 'rain'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-indigo-700 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sliders Row when Wind or Rain is enabled */}
                  {weatherEffect.mode !== 'clear' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-sky-200/60">
                      <div
                        className={
                          weatherEffect.mode === 'rain' ? 'opacity-50' : ''
                        }
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700">
                            Cường độ gió (Tác động độ rủ / tung tà):
                          </span>
                          <span className="font-mono font-bold text-sky-700">
                            {weatherEffect.windIntensity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={weatherEffect.windIntensity}
                          onChange={(e) =>
                            onUpdateWeatherEffect({
                              ...weatherEffect,
                              mode:
                                weatherEffect.mode === 'clear'
                                  ? 'wind'
                                  : weatherEffect.mode,
                              windIntensity: Number(e.target.value),
                            })
                          }
                          className="w-full accent-sky-600 cursor-pointer"
                        />
                      </div>

                      <div
                        className={
                          weatherEffect.mode === 'rain' ? 'opacity-50' : ''
                        }
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700">
                            Góc hướng gió thổi (-180° đến +180°):
                          </span>
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
                            onUpdateWeatherEffect({
                              ...weatherEffect,
                              windDirectionDeg: Number(e.target.value),
                            })
                          }
                          className="w-full accent-sky-600 cursor-pointer"
                        />
                      </div>

                      <div
                        className={
                          weatherEffect.mode === 'wind' ? 'opacity-50' : ''
                        }
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700">
                            Lượng mưa &amp; Độ thấm ướt bề mặt vải:
                          </span>
                          <span className="font-mono font-bold text-blue-700">
                            {weatherEffect.rainIntensity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={weatherEffect.rainIntensity}
                          onChange={(e) =>
                            onUpdateWeatherEffect({
                              ...weatherEffect,
                              mode:
                                weatherEffect.mode === 'clear'
                                  ? 'rain'
                                  : weatherEffect.mode,
                              rainIntensity: Number(e.target.value),
                            })
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3-Column Fabric Drape & GSM Thickness Inspection Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    {(
                      [
                        {
                          slotTitle: 'Áo trong (Top)',
                          fabric: outfit.top.fabric,
                          active:
                            !outfit.hideAllGarments &&
                            outfit.top.styleId !== 'none',
                        },
                        {
                          slotTitle: 'Áo khoác (Outerwear)',
                          fabric: outfit.outerwear.fabric,
                          active:
                            !outfit.hideAllGarments &&
                            outfit.outerwear.styleId !== 'none',
                        },
                        {
                          slotTitle: 'Quần / Chân váy (Bottom)',
                          fabric: outfit.bottom.fabric,
                          active:
                            !outfit.hideAllGarments &&
                            outfit.bottom.styleId !== 'none',
                        },
                      ] as const
                    ).map((slot) => {
                      const rep = analyzeFabricUnderWeather(
                        slot.fabric,
                        weatherEffect
                      );
                      return (
                        <div
                          key={slot.slotTitle}
                          className={`p-2.5 rounded-lg border bg-white/95 space-y-1.5 ${
                            slot.active
                              ? 'border-slate-200/90 shadow-2xs'
                              : 'border-slate-200/50 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-sky-600 shrink-0" />
                              <span>
                                {slot.slotTitle}: {rep.fabricName}
                              </span>
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-900 text-white shrink-0">
                              {rep.weightGsm} GSM
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-600">
                            <span>
                              Phân loại: <strong>{rep.thicknessLabel}</strong>
                            </span>
                            <span className="font-mono font-bold text-sky-700">
                              Độ rủ (Drape): {rep.drapeScore}/100
                            </span>
                          </div>

                          {/* Progress Bars for Drape & Stiffness */}
                          <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500">
                            <div>
                              <div className="flex justify-between mb-0.5">
                                <span>Độ rủ mềm</span>
                                <span className="font-mono font-semibold text-sky-700">
                                  {rep.drapeScore}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-sky-500 rounded-full"
                                  style={{ width: `${rep.drapeScore}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-0.5">
                                <span>Độ giữ phom</span>
                                <span className="font-mono font-semibold text-indigo-700">
                                  {rep.stiffnessScore}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${rep.stiffnessScore}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-600 leading-snug pt-0.5 border-t border-slate-100">
                            {weatherEffect.mode === 'rain'
                              ? rep.rainBehaviorText
                              : weatherEffect.mode === 'wind'
                              ? rep.windBehaviorText
                              : weatherEffect.mode === 'storm'
                              ? `${rep.windBehaviorText} ${rep.rainBehaviorText}`
                              : `Gió: ${rep.windBehaviorText}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 3D ACCESSORIES (WATCH, HANDBAG, SUNGLASSES) WITH POSE-AWARE AUTO-ALIGNMENT */}
        {activeTab === 'accessories' && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[305px] overflow-y-auto">
            {/* Column 1: 3D Wristwatch & Pose-Aware Wrist Selector (4 cols) */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-2.5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 lg:pb-0 lg:pr-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Watch className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-900">
                      Đồng hồ 3D
                    </span>
                  </div>
                </div>

                <select
                  value={activeAccessories.watch.styleId}
                  onChange={(e) => {
                    const nextId = e.target.value as WatchStyleId;
                    const opt =
                      WATCH_STYLES.find((w) => w.id === nextId) ||
                      WATCH_STYLES[0];
                    updateAccessories({
                      ...activeAccessories,
                      watch: {
                        ...activeAccessories.watch,
                        styleId: nextId,
                        caseColorHex: opt.defaultCaseColor,
                        strapColorHex: opt.defaultStrapColor,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 mb-2"
                >
                  {WATCH_STYLES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                {/* Upload Custom Watch Image */}
                <div className="mb-2 p-2 rounded-lg bg-indigo-50/60 border border-indigo-200/80">
                  <input
                    ref={watchUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAccessoryFileUpload('watch', e)}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {activeAccessories.watch.previewThumbUrl ? (
                        <img
                          src={activeAccessories.watch.previewThumbUrl}
                          alt="Watch upload"
                          className="w-7 h-7 rounded bg-white border border-indigo-200 object-contain shrink-0"
                        />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-900 truncate">
                          {activeAccessories.watch.uploadedName
                            ? `Ảnh: ${activeAccessories.watch.uploadedName}`
                            : 'Tải ảnh Đồng hồ của bạn'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {activeAccessories.watch.transformedSummary ||
                            'Tự tách nền & gắn mặt đồng hồ lên trên cổ tay'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={uploadingAccessoryCat === 'watch'}
                        onClick={() => watchUploadRef.current?.click()}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        {uploadingAccessoryCat === 'watch'
                          ? 'Đang xử lý...'
                          : 'Upload Đồng Hồ'}
                      </button>
                      {activeAccessories.watch.uploadedTextureUrl && (
                        <button
                          type="button"
                          title="Xóa ảnh đồng hồ đã tải"
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              watch: {
                                ...activeAccessories.watch,
                                uploadedName: undefined,
                                transformedSummary: undefined,
                                previewThumbUrl: undefined,
                                uploadedTextureUrl: undefined,
                              },
                            })
                          }
                          className="p-1 rounded bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Case & Strap Color Swatches */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">
                      Vỏ kim loại:
                    </span>
                    <div className="flex items-center gap-1">
                      {ACCESSORY_METAL_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          title={`Vỏ: ${sw.name}`}
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              watch: {
                                ...activeAccessories.watch,
                                styleId:
                                  activeAccessories.watch.styleId === 'none'
                                    ? 'luxury_chronograph'
                                    : activeAccessories.watch.styleId,
                                caseColorHex: sw.hex,
                              },
                            })
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeAccessories.watch.caseColorHex === sw.hex
                              ? 'scale-115 ring-2 ring-slate-900 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                      <input
                        type="color"
                        title="Tự chọn màu vỏ đồng hồ"
                        value={activeAccessories.watch.caseColorHex}
                        onChange={(e) =>
                          updateAccessories({
                            ...activeAccessories,
                            watch: {
                              ...activeAccessories.watch,
                              styleId:
                                activeAccessories.watch.styleId === 'none'
                                  ? 'luxury_chronograph'
                                  : activeAccessories.watch.styleId,
                              caseColorHex: e.target.value,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer ml-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Màu dây:</span>
                    <div className="flex items-center gap-1">
                      {ACCESSORY_LEATHER_SWATCHES.slice(0, 6).map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          title={`Dây: ${sw.name}`}
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              watch: {
                                ...activeAccessories.watch,
                                styleId:
                                  activeAccessories.watch.styleId === 'none'
                                    ? 'minimal_dress_watch'
                                    : activeAccessories.watch.styleId,
                                strapColorHex: sw.hex,
                              },
                            })
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeAccessories.watch.strapColorHex === sw.hex
                              ? 'scale-115 ring-2 ring-slate-900 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                      <input
                        type="color"
                        title="Tự chọn màu dây đồng hồ"
                        value={activeAccessories.watch.strapColorHex}
                        onChange={(e) =>
                          updateAccessories({
                            ...activeAccessories,
                            watch: {
                              ...activeAccessories.watch,
                              styleId:
                                activeAccessories.watch.styleId === 'none'
                                  ? 'minimal_dress_watch'
                                  : activeAccessories.watch.styleId,
                              strapColorHex: e.target.value,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer ml-0.5"
                      />
                    </div>
                  </div>

                  {/* Watch 2-Color Mixer */}
                  <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-800">
                        Pha màu Đồng hồ (A + B):
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setWatchMixTarget('strap')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                            watchMixTarget === 'strap'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          Dây ({watchMixRatio}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWatchMixTarget('case')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                            watchMixTarget === 'case'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          Vỏ
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={watchMixColorA}
                        onChange={(e) => {
                          const nextA = e.target.value;
                          setWatchMixColorA(nextA);
                          const mixed = blendHexColors(
                            nextA,
                            watchMixColorB,
                            watchMixRatio
                          );
                          updateAccessories({
                            ...activeAccessories,
                            watch: {
                              ...activeAccessories.watch,
                              styleId:
                                activeAccessories.watch.styleId === 'none'
                                  ? 'luxury_chronograph'
                                  : activeAccessories.watch.styleId,
                              ...(watchMixTarget === 'case'
                                ? { caseColorHex: mixed }
                                : { strapColorHex: mixed }),
                            },
                          });
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer shrink-0"
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={watchMixRatio}
                        onChange={(e) => {
                          const nextR = Number(e.target.value);
                          setWatchMixRatio(nextR);
                          const mixed = blendHexColors(
                            watchMixColorA,
                            watchMixColorB,
                            nextR
                          );
                          updateAccessories({
                            ...activeAccessories,
                            watch: {
                              ...activeAccessories.watch,
                              styleId:
                                activeAccessories.watch.styleId === 'none'
                                  ? 'luxury_chronograph'
                                  : activeAccessories.watch.styleId,
                              ...(watchMixTarget === 'case'
                                ? { caseColorHex: mixed }
                                : { strapColorHex: mixed }),
                            },
                          });
                        }}
                        className="flex-1 accent-indigo-600 cursor-pointer"
                      />
                      <input
                        type="color"
                        value={watchMixColorB}
                        onChange={(e) => {
                          const nextB = e.target.value;
                          setWatchMixColorB(nextB);
                          const mixed = blendHexColors(
                            watchMixColorA,
                            nextB,
                            watchMixRatio
                          );
                          updateAccessories({
                            ...activeAccessories,
                            watch: {
                              ...activeAccessories.watch,
                              styleId:
                                activeAccessories.watch.styleId === 'none'
                                  ? 'luxury_chronograph'
                                  : activeAccessories.watch.styleId,
                              ...(watchMixTarget === 'case'
                                ? { caseColorHex: mixed }
                                : { strapColorHex: mixed }),
                            },
                          });
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer shrink-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: 3D Handbag & Props (4 cols) */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-2.5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 lg:pb-0 lg:pr-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-xs font-semibold text-slate-900">
                      Túi xách &amp; Phụ kiện cầm tay 3D
                    </span>
                  </div>
                </div>

                <select
                  value={activeAccessories.handbag.styleId}
                  onChange={(e) => {
                    const nextId = e.target.value as HandbagStyleId;
                    const opt =
                      HANDBAG_STYLES.find((b) => b.id === nextId) ||
                      HANDBAG_STYLES[0];
                    updateAccessories({
                      ...activeAccessories,
                      handbag: {
                        ...activeAccessories.handbag,
                        styleId: nextId,
                        colorHex: opt.defaultColor,
                        hardwareColorHex: opt.defaultHardwareColor,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 mb-1.5"
                >
                  {HANDBAG_STYLES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Quick Handheld Props Bar: Basketball, Art Toy Plush, Fashion Umbrella */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {(
                    [
                      {
                        id: 'pro_basketball' as HandbagStyleId,
                        label: '🏀 Bóng Rổ',
                        color: '#D95B16',
                        hw: '#1E293B',
                      },
                      {
                        id: 'art_toy_plush' as HandbagStyleId,
                        label: '🧸 Đồ Chơi',
                        color: '#F472B6',
                        hw: '#FBBF24',
                      },
                      {
                        id: 'fashion_umbrella' as HandbagStyleId,
                        label: '☂️ Dù / Ô',
                        color: '#1E293B',
                        hw: '#D4AF37',
                      },
                    ]
                  ).map((prop) => {
                    const isSelected =
                      activeAccessories.handbag.styleId === prop.id;
                    return (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() =>
                          updateAccessories({
                            ...activeAccessories,
                            handbag: {
                              ...activeAccessories.handbag,
                              styleId: isSelected ? 'none' : prop.id,
                              colorHex: prop.color,
                              hardwareColorHex: prop.hw,
                            },
                          })
                        }
                        className={`px-1.5 py-1 text-[10px] font-semibold rounded border transition-colors cursor-pointer truncate ${
                          isSelected
                            ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        {prop.label}
                      </button>
                    );
                  })}
                </div>

                {/* Upload Custom Handbag Image */}
                <div className="mb-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200/80">
                  <input
                    ref={handbagUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAccessoryFileUpload('handbag', e)}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {activeAccessories.handbag.previewThumbUrl ? (
                        <img
                          src={activeAccessories.handbag.previewThumbUrl}
                          alt="Handbag upload"
                          className="w-7 h-7 rounded bg-white border border-amber-200 object-contain shrink-0"
                        />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-900 truncate">
                          {activeAccessories.handbag.uploadedName
                            ? `Ảnh: ${activeAccessories.handbag.uploadedName}`
                            : 'Tải ảnh Túi xách của bạn'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {activeAccessories.handbag.transformedSummary ||
                            'Tự tách nền & tạo túi xách 3D đeo trên tay'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={uploadingAccessoryCat === 'handbag'}
                        onClick={() => handbagUploadRef.current?.click()}
                        className="px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        {uploadingAccessoryCat === 'handbag'
                          ? 'Đang xử lý...'
                          : 'Upload Túi Xách'}
                      </button>
                      {activeAccessories.handbag.uploadedTextureUrl && (
                        <button
                          type="button"
                          title="Xóa ảnh túi xách đã tải"
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              handbag: {
                                ...activeAccessories.handbag,
                                uploadedName: undefined,
                                transformedSummary: undefined,
                                previewThumbUrl: undefined,
                                uploadedTextureUrl: undefined,
                              },
                            })
                          }
                          className="p-1 rounded bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Carry Mode & Arm Side Selectors */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <div>
                    <span className="block text-[10px] font-medium text-slate-500 mb-0.5">
                      Kiểu mang túi:
                    </span>
                    <select
                      value={activeAccessories.handbag.carryMode}
                      onChange={(e) =>
                        updateAccessories({
                          ...activeAccessories,
                          handbag: {
                            ...activeAccessories.handbag,
                            carryMode: e.target.value as HandbagCarryMode,
                          },
                        })
                      }
                      className="w-full px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded text-slate-900"
                    >
                      <option value="auto">Tự động theo tư thế tay</option>
                      <option value="hand_held">Cầm ở bàn tay</option>
                      <option value="crook_of_arm">Vắt khuỷu tay (Couture)</option>
                      <option value="shoulder_bag">Đeo trên vai</option>
                    </select>
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-slate-500 mb-0.5">
                      Bên tay / vai:
                    </span>
                    <select
                      value={activeAccessories.handbag.armSide}
                      onChange={(e) =>
                        updateAccessories({
                          ...activeAccessories,
                          handbag: {
                            ...activeAccessories.handbag,
                            armSide: e.target.value as ArmSideChoice,
                          },
                        })
                      }
                      className="w-full px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded text-slate-900"
                    >
                      <option value="auto">Tự động chọn tay rảnh</option>
                      <option value="left">Bên Trái (Tay/Vai Trái)</option>
                      <option value="right">Bên Phải (Tay/Vai Phải)</option>
                    </select>
                  </div>
                </div>

                {/* Bag Leather & Hardware Swatches + Custom Color Picker & 2-Color Mixer */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Màu da túi:</span>
                    <div className="flex items-center gap-1">
                      {ACCESSORY_LEATHER_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          title={`Da túi: ${sw.name}`}
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              handbag: {
                                ...activeAccessories.handbag,
                                styleId:
                                  activeAccessories.handbag.styleId === 'none'
                                    ? 'paris_saddle_bag'
                                    : activeAccessories.handbag.styleId,
                                colorHex: sw.hex,
                              },
                            })
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeAccessories.handbag.colorHex === sw.hex
                              ? 'scale-115 ring-2 ring-slate-900 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                      <input
                        type="color"
                        title="Tự chọn màu da túi xách"
                        value={activeAccessories.handbag.colorHex}
                        onChange={(e) =>
                          updateAccessories({
                            ...activeAccessories,
                            handbag: {
                              ...activeAccessories.handbag,
                              styleId:
                                activeAccessories.handbag.styleId === 'none'
                                  ? 'paris_saddle_bag'
                                  : activeAccessories.handbag.styleId,
                              colorHex: e.target.value,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer ml-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">
                      Khóa &amp; Dây xích:
                    </span>
                    <div className="flex items-center gap-1">
                      {ACCESSORY_METAL_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          title={`Khóa kim loại: ${sw.name}`}
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              handbag: {
                                ...activeAccessories.handbag,
                                styleId:
                                  activeAccessories.handbag.styleId === 'none'
                                    ? 'quilted_chain_flap'
                                    : activeAccessories.handbag.styleId,
                                hardwareColorHex: sw.hex,
                              },
                            })
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeAccessories.handbag.hardwareColorHex === sw.hex
                              ? 'scale-115 ring-2 ring-slate-900 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                      <input
                        type="color"
                        title="Tự chọn màu khóa & dây xích"
                        value={activeAccessories.handbag.hardwareColorHex}
                        onChange={(e) =>
                          updateAccessories({
                            ...activeAccessories,
                            handbag: {
                              ...activeAccessories.handbag,
                              styleId:
                                activeAccessories.handbag.styleId === 'none'
                                  ? 'quilted_chain_flap'
                                  : activeAccessories.handbag.styleId,
                              hardwareColorHex: e.target.value,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer ml-0.5"
                      />
                    </div>
                  </div>

                  {/* Handbag 2-Color Mixer */}
                  <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-800">
                        Pha màu Túi xách (A + B):
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setBagMixTarget('leather')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                            bagMixTarget === 'leather'
                              ? 'bg-amber-700 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          Da túi ({bagMixRatio}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBagMixTarget('hardware')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                            bagMixTarget === 'hardware'
                              ? 'bg-amber-700 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          Khóa
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={bagMixColorA}
                        onChange={(e) => {
                          const nextA = e.target.value;
                          setBagMixColorA(nextA);
                          const mixed = blendHexColors(
                            nextA,
                            bagMixColorB,
                            bagMixRatio
                          );
                          updateAccessories({
                            ...activeAccessories,
                            handbag: {
                              ...activeAccessories.handbag,
                              styleId:
                                activeAccessories.handbag.styleId === 'none'
                                  ? 'paris_saddle_bag'
                                  : activeAccessories.handbag.styleId,
                              ...(bagMixTarget === 'leather'
                                ? { colorHex: mixed }
                                : { hardwareColorHex: mixed }),
                            },
                          });
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer shrink-0"
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={bagMixRatio}
                        onChange={(e) => {
                          const nextR = Number(e.target.value);
                          setBagMixRatio(nextR);
                          const mixed = blendHexColors(
                            bagMixColorA,
                            bagMixColorB,
                            nextR
                          );
                          updateAccessories({
                            ...activeAccessories,
                            handbag: {
                              ...activeAccessories.handbag,
                              styleId:
                                activeAccessories.handbag.styleId === 'none'
                                  ? 'paris_saddle_bag'
                                  : activeAccessories.handbag.styleId,
                              ...(bagMixTarget === 'leather'
                                ? { colorHex: mixed }
                                : { hardwareColorHex: mixed }),
                            },
                          });
                        }}
                        className="flex-1 accent-amber-700 cursor-pointer"
                      />
                      <input
                        type="color"
                        value={bagMixColorB}
                        onChange={(e) => {
                          const nextB = e.target.value;
                          setBagMixColorB(nextB);
                          const mixed = blendHexColors(
                            bagMixColorA,
                            nextB,
                            bagMixRatio
                          );
                          updateAccessories({
                            ...activeAccessories,
                            handbag: {
                              ...activeAccessories.handbag,
                              styleId:
                                activeAccessories.handbag.styleId === 'none'
                                  ? 'paris_saddle_bag'
                                  : activeAccessories.handbag.styleId,
                              ...(bagMixTarget === 'leather'
                                ? { colorHex: mixed }
                                : { hardwareColorHex: mixed }),
                            },
                          });
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer shrink-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: 3D Sunglasses & Hat (4 cols) */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Glasses className="w-3.5 h-3.5 text-slate-900" />
                    <span className="text-xs font-semibold text-slate-900">
                      Kính mát 3D
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectCameraPreset('face_detail')}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Zoom Cận Mặt
                  </button>
                </div>

                <select
                  value={activeAccessories.sunglasses.styleId}
                  onChange={(e) => {
                    const nextId = e.target.value as SunglassesStyleId;
                    const opt =
                      SUNGLASSES_STYLES.find((s) => s.id === nextId) ||
                      SUNGLASSES_STYLES[0];
                    updateAccessories({
                      ...activeAccessories,
                      sunglasses: {
                        ...activeAccessories.sunglasses,
                        styleId: nextId,
                        frameColorHex: opt.defaultFrameColor,
                        lensColorHex: opt.defaultLensColor,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 mb-2"
                >
                  {SUNGLASSES_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {/* Upload Custom Sunglasses Image */}
                <div className="mb-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <input
                    ref={sunglassesUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAccessoryFileUpload('sunglasses', e)}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {activeAccessories.sunglasses.previewThumbUrl ? (
                        <img
                          src={activeAccessories.sunglasses.previewThumbUrl}
                          alt="Sunglasses upload"
                          className="w-7 h-7 rounded bg-white border border-slate-300 object-contain shrink-0"
                        />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-900 truncate">
                          {activeAccessories.sunglasses.uploadedName
                            ? `Ảnh: ${activeAccessories.sunglasses.uploadedName}`
                            : 'Tải ảnh Kính mắt của bạn'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {activeAccessories.sunglasses.transformedSummary ||
                            'Tự tách nền & đeo chuẩn lên sống mũi 3D'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={uploadingAccessoryCat === 'sunglasses'}
                        onClick={() => sunglassesUploadRef.current?.click()}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        {uploadingAccessoryCat === 'sunglasses'
                          ? 'Đang xử lý...'
                          : 'Upload Kính Mắt'}
                      </button>
                      {activeAccessories.sunglasses.uploadedTextureUrl && (
                        <button
                          type="button"
                          title="Xóa ảnh kính mắt đã tải"
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              sunglasses: {
                                ...activeAccessories.sunglasses,
                                uploadedName: undefined,
                                transformedSummary: undefined,
                                previewThumbUrl: undefined,
                                uploadedTextureUrl: undefined,
                              },
                            })
                          }
                          className="p-1 rounded bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sunglasses Wear Position */}
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {(
                    [
                      { id: 'eyes', label: 'Đeo trên mắt' },
                      { id: 'head_crown', label: 'Cài lên đỉnh đầu / tóc' },
                    ] as { id: SunglassesWearPosition; label: string }[]
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() =>
                        updateAccessories({
                          ...activeAccessories,
                          sunglasses: {
                            ...activeAccessories.sunglasses,
                            wearPosition: pos.id,
                          },
                        })
                      }
                      className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                        activeAccessories.sunglasses.wearPosition === pos.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                {/* Frame & Lens Swatches + Custom Color Picker & 2-Color Mixer */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Màu gọng:</span>
                    <div className="flex items-center gap-1">
                      {ACCESSORY_METAL_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          title={`Gọng kính: ${sw.name}`}
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              sunglasses: {
                                ...activeAccessories.sunglasses,
                                styleId:
                                  activeAccessories.sunglasses.styleId === 'none'
                                    ? 'classic_aviator'
                                    : activeAccessories.sunglasses.styleId,
                                frameColorHex: sw.hex,
                              },
                            })
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeAccessories.sunglasses.frameColorHex === sw.hex
                              ? 'scale-115 ring-2 ring-slate-900 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                      <input
                        type="color"
                        title="Tự chọn màu gọng kính"
                        value={activeAccessories.sunglasses.frameColorHex}
                        onChange={(e) =>
                          updateAccessories({
                            ...activeAccessories,
                            sunglasses: {
                              ...activeAccessories.sunglasses,
                              styleId:
                                activeAccessories.sunglasses.styleId === 'none'
                                  ? 'classic_aviator'
                                  : activeAccessories.sunglasses.styleId,
                              frameColorHex: e.target.value,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer ml-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Màu tròng:</span>
                    <div className="flex items-center gap-1">
                      {SUNGLASSES_LENS_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          title={`Tròng kính: ${sw.name}`}
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              sunglasses: {
                                ...activeAccessories.sunglasses,
                                styleId:
                                  activeAccessories.sunglasses.styleId === 'none'
                                    ? 'classic_aviator'
                                    : activeAccessories.sunglasses.styleId,
                                lensColorHex: sw.hex,
                              },
                            })
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeAccessories.sunglasses.lensColorHex === sw.hex
                              ? 'scale-115 ring-2 ring-slate-900 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                      <input
                        type="color"
                        title="Tự chọn màu tròng kính"
                        value={activeAccessories.sunglasses.lensColorHex}
                        onChange={(e) =>
                          updateAccessories({
                            ...activeAccessories,
                            sunglasses: {
                              ...activeAccessories.sunglasses,
                              styleId:
                                activeAccessories.sunglasses.styleId === 'none'
                                  ? 'classic_aviator'
                                  : activeAccessories.sunglasses.styleId,
                              lensColorHex: e.target.value,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer ml-0.5"
                      />
                    </div>
                  </div>

                  {/* Sunglasses 2-Color Mixer */}
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-800">
                        Pha màu Kính mắt (A + B):
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setGlassMixTarget('lens')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                            glassMixTarget === 'lens'
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          Tròng ({glassMixRatio}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setGlassMixTarget('frame')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                            glassMixTarget === 'frame'
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          Gọng
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={glassMixColorA}
                        onChange={(e) => {
                          const nextA = e.target.value;
                          setGlassMixColorA(nextA);
                          const mixed = blendHexColors(
                            nextA,
                            glassMixColorB,
                            glassMixRatio
                          );
                          updateAccessories({
                            ...activeAccessories,
                            sunglasses: {
                              ...activeAccessories.sunglasses,
                              styleId:
                                activeAccessories.sunglasses.styleId === 'none'
                                  ? 'classic_aviator'
                                  : activeAccessories.sunglasses.styleId,
                              ...(glassMixTarget === 'frame'
                                ? { frameColorHex: mixed }
                                : { lensColorHex: mixed }),
                            },
                          });
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer shrink-0"
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={glassMixRatio}
                        onChange={(e) => {
                          const nextR = Number(e.target.value);
                          setGlassMixRatio(nextR);
                          const mixed = blendHexColors(
                            glassMixColorA,
                            glassMixColorB,
                            nextR
                          );
                          updateAccessories({
                            ...activeAccessories,
                            sunglasses: {
                              ...activeAccessories.sunglasses,
                              styleId:
                                activeAccessories.sunglasses.styleId === 'none'
                                  ? 'classic_aviator'
                                  : activeAccessories.sunglasses.styleId,
                              ...(glassMixTarget === 'frame'
                                ? { frameColorHex: mixed }
                                : { lensColorHex: mixed }),
                            },
                          });
                        }}
                        className="flex-1 accent-slate-900 cursor-pointer"
                      />
                      <input
                        type="color"
                        value={glassMixColorB}
                        onChange={(e) => {
                          const nextB = e.target.value;
                          setGlassMixColorB(nextB);
                          const mixed = blendHexColors(
                            glassMixColorA,
                            nextB,
                            glassMixRatio
                          );
                          updateAccessories({
                            ...activeAccessories,
                            sunglasses: {
                              ...activeAccessories.sunglasses,
                              styleId:
                                activeAccessories.sunglasses.styleId === 'none'
                                  ? 'classic_aviator'
                                  : activeAccessories.sunglasses.styleId,
                              ...(glassMixTarget === 'frame'
                                ? { frameColorHex: mixed }
                                : { lensColorHex: mixed }),
                            },
                          });
                        }}
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer shrink-0"
                      />
                    </div>
                  </div>
                </div>
                {/* 3D Hat & Headwear Selector (Baseball Cap, Bucket Hat, Wide-Brim Sun Hat, French Beret) */}
                <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200/80 space-y-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950">
                      🧢 Nón &amp; Mũ Thời Trang 3D (Đội Đầu)
                    </span>
                    {activeHat.styleId !== 'none' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateAccessories({
                            ...activeAccessories,
                            hat: {
                              ...activeHat,
                              styleId: 'none',
                            },
                          })
                        }
                        className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Tháo Nón
                      </button>
                    )}
                  </div>

                  <select
                    value={activeHat.styleId}
                    onChange={(e) => {
                      const nextHatId = e.target.value as HatStyleId;
                      const hatOpt =
                        HAT_STYLES.find((h) => h.id === nextHatId) ||
                        HAT_STYLES[0];
                      updateAccessories({
                        ...activeAccessories,
                        hat: {
                          ...activeHat,
                          styleId: nextHatId,
                          colorHex: hatOpt.defaultColor,
                          trimColorHex: hatOpt.defaultTrimColor,
                        },
                      });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-indigo-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-700"
                  >
                    {HAT_STYLES.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>

                  {/* Hat Quick Swatches & Upload */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-slate-600 mr-0.5">
                        Màu nón:
                      </span>
                      {[
                        { hex: '#1E293B', name: 'Đen Navy' },
                        { hex: '#F5E6D3', name: 'Kem Cối' },
                        { hex: '#991B1B', name: 'Đỏ Đô' },
                        { hex: '#1E3A8A', name: 'Xanh Royal' },
                        { hex: '#065F46', name: 'Xanh Rêu' },
                      ].map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          title={sw.name}
                          onClick={() =>
                            updateAccessories({
                              ...activeAccessories,
                              hat: {
                                ...activeHat,
                                styleId:
                                  activeHat.styleId === 'none'
                                    ? 'baseball_cap'
                                    : activeHat.styleId,
                                colorHex: sw.hex,
                              },
                            })
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeHat.colorHex.toLowerCase() ===
                            sw.hex.toLowerCase()
                              ? 'scale-115 ring-2 ring-indigo-700 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                      <input
                        type="color"
                        title="Tự chọn màu nón"
                        value={activeHat.colorHex}
                        onChange={(e) =>
                          updateAccessories({
                            ...activeAccessories,
                            hat: {
                              ...activeHat,
                              styleId:
                                activeHat.styleId === 'none'
                                  ? 'baseball_cap'
                                  : activeHat.styleId,
                              colorHex: e.target.value,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border border-slate-300 cursor-pointer ml-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        ref={hatUploadRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAccessoryFileUpload('hat', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingAccessoryCat === 'hat'}
                        onClick={() => hatUploadRef.current?.click()}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        {uploadingAccessoryCat === 'hat'
                          ? 'Đang xử lý...'
                          : 'Upload Ảnh Nón'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Pose Switcher to test Pose-Aware Accessory Auto-Alignment */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Đổi nhanh Tư thế Tay (Kiểm tra Tự căn chỉnh):
                  </span>
                  {equippedAccessoriesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => updateAccessories({ ...DEFAULT_ACCESSORIES })}
                      className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Tháo hết phụ kiện
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'lookbook_pose', label: 'Chống Hông Lookbook' },
                      { id: 'editorial_crossed', label: 'Haute Couture (Gập tay)' },
                      { id: 'greeting_wave', label: 'Vẫy Tay Chào' },
                      { id: 'catwalk_walk', label: 'Bước Đi Catwalk' },
                    ] as { id: PosePresetId; label: string }[]
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPosePreset(p.id)}
                      className={`px-2 py-1 text-[10px] font-semibold rounded border text-left truncate transition-colors cursor-pointer ${
                        posePreset === p.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: POSE AI GENERATOR, POSE PRESETS, ANIMATIONS & 17-JOINT RIGGING */}
        {activeTab === 'pose' && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[325px] overflow-y-auto">
            {/* Row 1 (Full-Width 12 Cols): Pose AI Generator (Natural Language to 17-Joint Rotations) */}
            {onGenerateAiPose && (
              <div className="lg:col-span-12 p-3 rounded-xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white border border-indigo-500/30 shadow-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>
                          Pose AI Generator — Tạo tư thế người mẫu bằng Ngôn ngữ
                          Tự nhiên
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          17 KHỚP XƯƠNG 3D
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Nhập mô tả tư thế mong muốn (ví dụ:{' '}
                        <em>
                          &ldquo;đang ngồi bắt chéo chân&rdquo;, &ldquo;đang
                          chống nạnh nhìn sang trái&rdquo;
                        </em>
                        ) để AI tự động tính toán góc xoay 17 khớp xương.
                      </p>
                    </div>
                  </div>

                  {lastAiPoseResult && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-semibold">
                      Đang áp dụng: {lastAiPoseResult.poseTitle}
                      {lastAiPoseResult.isSeated ? ' (Có ghế Studio 3D)' : ''}
                    </span>
                  )}
                </div>

                {/* Natural Language Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!posePromptInput.trim() || isGeneratingPose) return;
                    onGenerateAiPose(posePromptInput.trim());
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={posePromptInput}
                    onChange={(e) => setPosePromptInput(e.target.value)}
                    placeholder="Mô tả tư thế bạn muốn: ví dụ 'đang ngồi bắt chéo chân', 'đang chống nạnh nhìn sang trái', 'khoanh tay trước ngực'..."
                    className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-amber-300 rounded-lg text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isGeneratingPose || !posePromptInput.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    {isGeneratingPose ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tạo dáng...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Tạo tư thế AI</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Static Standing Poses Quick Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-amber-300 font-semibold mr-1">
                    Gợi ý tư thế đứng:
                  </span>
                  {POSE_PRESETS.filter((p) => !p.isAnimated).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPosePreset(p.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                        posePreset === p.id
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                          : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {/* Quick Natural Language Pose Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">
                    Gợi ý thử nhanh AI:
                  </span>
                  {POSE_AI_SUGGESTION_PROMPTS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      disabled={isGeneratingPose}
                      onClick={() => {
                        setPosePromptInput(chip.prompt);
                        onGenerateAiPose(chip.prompt);
                      }}
                      className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-slate-200 border border-white/15 text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {lastAiPoseResult && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-200 flex items-center justify-between gap-2">
                    <span className="truncate">
                      <strong className="text-amber-300">
                        {lastAiPoseResult.poseTitle}:
                      </strong>{' '}
                      {lastAiPoseResult.explanation}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {lastAiPoseResult.source === 'gemini_ai'
                        ? 'Gemini AI + Biomechanics'
                        : 'Biomechanical Solver'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Column 1: Dynamic Animations List (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-2 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 lg:pb-0 lg:pr-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Bảng Hoạt Ảnh Chuyển Động
                </span>
                <button
                  type="button"
                  onClick={onStandStillPose}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Đứng nghiêm (0°)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {POSE_PRESETS.filter((preset) => preset.isAnimated).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPosePreset(preset.id)}
                    className={`px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      posePreset === preset.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-medium truncate">
                      {preset.name}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        posePreset === preset.id
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {preset.description || 'Hoạt ảnh động liên tục'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Column 2: 17-Joint Selector (3 cols) */}
            <div className="lg:col-span-3 flex flex-col justify-between gap-2 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 lg:pb-0 lg:pr-5">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Chọn Khớp Xương (17 khớp)
                </label>
                <select
                  value={selectedJoint}
                  onChange={(e) => onSelectJoint(e.target.value as JointId)}
                  className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <optgroup label="Thân trên & Đầu">
                    {JOINT_METADATA.filter((j) => j.group === 'core').map(
                      (j) => (
                        <option key={j.id} value={j.id}>
                          {j.label}
                        </option>
                      )
                    )}
                  </optgroup>
                  <optgroup label="Khớp Vai, Khuỷu Tay & Cổ Tay">
                    {JOINT_METADATA.filter((j) => j.group === 'upper').map(
                      (j) => (
                        <option key={j.id} value={j.id}>
                          {j.label}
                        </option>
                      )
                    )}
                  </optgroup>
                  <optgroup label="Khớp Hông, Đầu Gối & Cổ Chân">
                    {JOINT_METADATA.filter((j) => j.group === 'lower').map(
                      (j) => (
                        <option key={j.id} value={j.id}>
                          {j.label}
                        </option>
                      )
                    )}
                  </optgroup>
                </select>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mẹo: Bạn có thể{' '}
                <strong>
                  nhấp trực tiếp vào tay, chân, đầu hoặc thân người trên mô hình
                  3D
                </strong>{' '}
                để chọn nhanh khớp cần xoay.
              </p>
            </div>

            {/* Column 3: Memoized 3-Axis Euler Rotation Sliders for Selected Joint (4 cols) */}
            <MemoizedJointEulerSlidersCard
              selectedJoint={selectedJoint}
              jointLabel={currentJointMeta.label}
              minX={currentJointMeta.minX}
              maxX={currentJointMeta.maxX}
              minY={currentJointMeta.minY}
              maxY={currentJointMeta.maxY}
              minZ={currentJointMeta.minZ}
              maxZ={currentJointMeta.maxZ}
              eulerX={currentJointEuler.x}
              eulerY={currentJointEuler.y}
              eulerZ={currentJointEuler.z}
              onUpdateJointRotation={onUpdateJointRotation}
              onResetCurrentJoint={onResetCurrentJoint}
            />
          </div>
        )}

        {/* TAB 5: AI STYLIST — FULL OUTFIT & LOOKBOOK IMAGE GENERATOR BASED ON TRENDS, REAL-TIME WEATHER & SAVED STYLE HISTORY */}
        {activeTab === 'ai_stylist' && (
          <div className="p-4 space-y-3.5 max-h-[340px] overflow-y-auto">
            {/* Top Header & Trend + Saved Style DNA Controls */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>
                        AI Stylist Lookbook — Đề xuất Trang phục theo Thời tiết
                        Thực tế, Xu hướng &amp; Phong cách Đã lưu
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {currentAiStylistData.userStyleProfileSummary}
                    </p>
                  </div>
                </div>

                {/* Dominant Saved Colors & Fabrics Badge */}
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  <span className="text-[10px] font-medium text-slate-300">
                    DNA Màu &amp; Vải đã lưu:
                  </span>
                  <div className="flex items-center gap-1">
                    {currentAiStylistData.dominantSavedColors.map((hex, i) => (
                      <span
                        key={`${hex}_${i}`}
                        className="w-3.5 h-3.5 rounded-full border border-white/70"
                        style={{ backgroundColor: hex }}
                        title={`Màu chủ đạo đã lưu: ${hex}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 uppercase">
                    {currentAiStylistData.dominantSavedFabrics.join(' · ')}
                  </span>
                </div>
              </div>

              {/* REAL-TIME WEATHER FORECAST (GOOGLE SEARCH GROUNDING) & WARM/RAIN PRIORITY PANEL */}
              <div className="p-2.5 rounded-xl bg-white/8 border border-sky-400/30 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-sky-300" />
                    <span className="text-[11px] font-bold text-sky-200">
                      Gợi ý Trang phục theo Dự báo Thời tiết Thực tế (Google
                      Search):
                    </span>
                    <span className="text-[10px] text-slate-300">
                      Trời mưa hoặc lạnh (&le;22&deg;C) tự động ưu tiên Áo khoác
                      &amp; Đồ giữ ấm
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isFetchingWeather || isGeneratingStylist}
                      onClick={() =>
                        handleFetchLocationWeatherAndRecommend(undefined, true)
                      }
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      {isFetchingWeather ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sun className="w-3 h-3" />
                      )}
                      <span>Vị trí GPS của tôi + Google Search</span>
                    </button>
                    {liveWeatherForecast && (
                      <button
                        type="button"
                        onClick={() => {
                          setLiveWeatherForecast(null);
                          setWeatherStatusNote(null);
                          handleGenerateAiStylistLookbooks(
                            selectedTrendId,
                            null
                          );
                        }}
                        className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-semibold cursor-pointer"
                      >
                        Bỏ lọc thời tiết
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick City Presets + Search Input */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Chọn nhanh vị trí:
                  </span>
                  {WEATHER_CITY_PRESETS.map((city) => {
                    const isSelectedCity =
                      liveWeatherForecast?.locationName
                        .toLowerCase()
                        .includes(city.label.toLowerCase()) ||
                      weatherLocationInput
                        .toLowerCase()
                        .includes(city.label.toLowerCase());
                    return (
                      <button
                        key={city.id}
                        type="button"
                        disabled={isFetchingWeather || isGeneratingStylist}
                        onClick={() =>
                          handleFetchLocationWeatherAndRecommend(
                            city.query,
                            false
                          )
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          isSelectedCity && liveWeatherForecast
                            ? 'bg-sky-400 text-slate-950 font-bold'
                            : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15'
                        }`}
                      >
                        {city.label}
                      </button>
                    );
                  })}

                  <div className="flex items-center gap-1 ml-auto flex-1 min-w-[210px]">
                    <input
                      type="text"
                      value={weatherLocationInput}
                      onChange={(e) => setWeatherLocationInput(e.target.value)}
                      placeholder="Nhập tỉnh/thành phố bất kỳ (VD: Hà Nội, Đà Lạt, Sapa)..."
                      className="flex-1 min-w-0 px-2.5 py-1 text-[11px] bg-slate-900/90 border border-white/20 focus:border-sky-400 rounded-md text-white placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isFetchingWeather || isGeneratingStylist}
                      onClick={() =>
                        handleFetchLocationWeatherAndRecommend(
                          weatherLocationInput,
                          false
                        )
                      }
                      className="px-2.5 py-1 rounded-md bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {isFetchingWeather ? 'Đang lấy...' : 'Tra Thời tiết'}
                    </button>
                  </div>
                </div>

                {weatherStatusNote && !liveWeatherForecast && (
                  <p className="text-[10px] text-sky-200">
                    {weatherStatusNote}
                  </p>
                )}

                {/* Active Live Weather Forecast Card */}
                {liveWeatherForecast && (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-sky-400/40 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-sky-500/25 border border-sky-400/50 text-sky-200 text-[11px] font-bold">
                          📍 {liveWeatherForecast.locationName}
                        </span>
                        <span className="text-sm font-extrabold text-amber-300 font-mono">
                          {liveWeatherForecast.temperatureC}&deg;C
                        </span>
                        <span className="text-[11px] text-slate-200 font-medium">
                          {liveWeatherForecast.conditionText} (Cảm giác{' '}
                          {liveWeatherForecast.feelsLikeC}&deg;C · Độ ẩm{' '}
                          {liveWeatherForecast.humidityPercent}% · Gió{' '}
                          {liveWeatherForecast.windSpeedKmh} km/h)
                        </span>
                        {(liveWeatherForecast.isRainy ||
                          liveWeatherForecast.isCold) && (
                          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wide">
                            {liveWeatherForecast.isRainy &&
                            liveWeatherForecast.isCold
                              ? 'Ưu tiên Áo khoác Giữ ấm & Chống mưa'
                              : liveWeatherForecast.isRainy
                                ? 'Ưu tiên Áo khoác Chắn mưa'
                                : 'Ưu tiên Áo khoác & Đồ giữ ấm'}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateWeatherEffect?.({
                            ...(weatherEffect || DEFAULT_WEATHER_EFFECT),
                            mode: liveWeatherForecast.recommendedWeatherMode,
                            windIntensity:
                              liveWeatherForecast.recommendedWeatherMode ===
                              'clear'
                                ? 0.15
                                : Math.min(
                                    0.95,
                                    Math.max(
                                      0.45,
                                      liveWeatherForecast.windSpeedKmh / 45
                                    )
                                  ),
                            rainIntensity:
                              liveWeatherForecast.recommendedWeatherMode ===
                              'rain'
                                ? 0.78
                                : 0,
                          })
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        <Wind className="w-3 h-3" />
                        <span>
                          Đồng bộ hiệu ứng{' '}
                          {liveWeatherForecast.recommendedWeatherMode === 'rain'
                            ? 'Mưa 3D'
                            : liveWeatherForecast.recommendedWeatherMode ===
                                'wind'
                              ? 'Gió 3D'
                              : 'Nắng 3D'}
                        </span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      <strong className="text-amber-300">
                        Cố vấn AI theo Thời tiết:
                      </strong>{' '}
                      {liveWeatherForecast.stylistWeatherAdvice}
                    </p>

                    {liveWeatherForecast.searchSources &&
                      liveWeatherForecast.searchSources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
                          <span className="text-[9px] text-slate-400 uppercase font-mono">
                            Nguồn Google Search ({liveWeatherForecast.updatedAt}
                            ):
                          </span>
                          {liveWeatherForecast.searchSources
                            .slice(0, 3)
                            .map((src, idx) => (
                              <a
                                key={`${src.uri}_${idx}`}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-sky-300 text-[9px] underline truncate max-w-[200px]"
                              >
                                {src.title}
                              </a>
                            ))}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Trend Selector Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                  Xu hướng hiện tại:
                </span>
                {FASHION_TREND_PRESETS.map((trend) => (
                  <button
                    key={trend.id}
                    type="button"
                    onClick={() => handleGenerateAiStylistLookbooks(trend.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedTrendId === trend.id
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15'
                    }`}
                  >
                    {trend.name}
                  </button>
                ))}
              </div>

              {/* Custom Style Prompt + Generate AI Lookbook Button */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerateAiStylistLookbooks();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={stylistCustomPrompt}
                  onChange={(e) => setStylistCustomPrompt(e.target.value)}
                  placeholder="Nhập thêm yêu cầu bối cảnh hoặc phong cách (VD: đi tiệc tối sang trọng, dạo phố mùa thu Milan, công sở quyền lực)..."
                  className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-amber-300 rounded-lg text-white placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isGeneratingStylist}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  {isGeneratingStylist ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang thiết kế Lookbook...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tạo Lookbook &amp; Đề xuất AI</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 3 Full-Outfit Lookbook Recommendation Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
              {currentAiStylistData.recommendations.map((rec) => {
                const isApplied = activeStylistLookbookId === rec.id;
                const outerStyleObj = OUTERWEAR_STYLES.find(
                  (o) => o.id === rec.outfit.outerwear.styleId
                );
                const outerFabObj =
                  FABRIC_LIBRARY[rec.outfit.outerwear.fabric];
                return (
                  <div
                    key={rec.id}
                    className={`flex flex-col justify-between rounded-xl border p-3 transition-all ${
                      isApplied
                        ? 'bg-indigo-50/70 border-indigo-600 ring-1 ring-indigo-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-2.5">
                        {/* Generated Lookbook Image Thumbnail */}
                        <img
                          src={rec.lookbookImageUrl}
                          alt={rec.title}
                          referrerPolicy="no-referrer"
                          className="w-24 h-32 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0 bg-slate-900"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[9px] font-mono font-bold truncate">
                              {rec.seasonTag}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold shrink-0">
                              {rec.styleCompatibilityScore}% Hợp Gu
                            </span>
                          </div>
                          {rec.weatherBadge && (
                            <div className="mb-1">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  rec.isWeatherPrioritized
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-sky-50 text-sky-800 border-sky-200'
                                }`}
                              >
                                🌦️ {rec.weatherBadge}
                              </span>
                            </div>
                          )}
                          <h4 className="text-xs font-bold text-slate-900 leading-snug mb-1">
                            {rec.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-snug line-clamp-3">
                            {rec.savedStyleMatchReason}
                          </p>
                        </div>
                      </div>

                      {outerStyleObj && rec.outfit.outerwear.styleId !== 'none' && (
                        <div className="mb-2 px-2 py-1 rounded bg-slate-100 border border-slate-200/80 flex items-center justify-between text-[10px] text-slate-700">
                          <span>
                            <strong>Lớp khoác ngoài:</strong> {outerStyleObj.name}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500">
                            {outerFabObj?.name}
                          </span>
                        </div>
                      )}

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] text-slate-600 leading-relaxed mb-2.5">
                        <strong className="text-slate-900">
                          Xu hướng &amp; Thời tiết:
                        </strong>{' '}
                        {rec.trendAnalysis}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleApplyStylistLookbook(rec)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          isApplied
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-900 hover:bg-indigo-600 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {isApplied
                            ? 'Đang mặc trên 3D'
                            : 'Mặc thử Trọn bộ lên 3D'}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Mặc bộ này và lưu vào Lịch sử phối đồ"
                        onClick={() => {
                          handleApplyStylistLookbook(rec);
                          setTimeout(() => onSaveCurrentOutfit(), 60);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-200 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Live Camera Capture Modal for Garments (Docked on Right Side so Mannequin stays visible) */}
      {isCameraModalOpen && (
        <div className="pointer-events-auto fixed bottom-16 right-3 z-50 w-[min(420px,94vw)] bg-slate-950/95 text-white border border-slate-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <div>
                <h4 className="text-xs font-bold text-white">
                  Chụp Ảnh Trang Phục — AI Tự Động Tách Nền
                </h4>
                <p className="text-[10px] text-slate-400">
                  Hướng camera vào áo, đầm, quần hoặc người mẫu để tách đồ 3D
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeCameraCaptureModal}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-2.5">
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  cameraFacingMode === 'user' ? '-scale-x-100' : ''
                }`}
              />
              {/* Framing Guide Box */}
              <div className="pointer-events-none absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-xl flex items-end justify-center pb-2">
                <span className="px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-medium text-emerald-300">
                  Đặt trang phục vào khung — AI tự xóa nền &amp; phân loại
                </span>
              </div>
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center gap-2">
                  <p className="text-xs text-amber-300 leading-relaxed">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={() => mobileCameraFallbackInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Mở Camera Điện Thoại / Chọn Ảnh Chụp
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={switchCameraFacing}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Đổi Camera ({cameraFacingMode === 'environment' ? 'Sau' : 'Trước'})
              </button>

              <button
                type="button"
                disabled={isCapturingCamera}
                onClick={captureGarmentFromCamera}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {isCapturingCamera
                    ? 'Đang tách nền...'
                    : 'Chụp & Tách Nền Mặc Ngay'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => mobileCameraFallbackInputRef.current?.click()}
                title="Dùng ứng dụng Camera gốc trên điện thoại"
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                Camera ĐT
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export const BottomControlDock = React.memo(BottomControlDockComponent);
BottomControlDock.displayName = 'BottomControlDock';

