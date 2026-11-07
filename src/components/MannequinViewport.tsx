import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
import {
  ArrowLeftRight,
  Award,
  Box,
  Camera,
  CloudLightning,
  CloudRain,
  Columns2,
  Download,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Layers,
  Move,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Sparkles,
  Sun,
  SwitchCamera,
  Video,
  Wind,
  X,
} from 'lucide-react';
import {
  BodyMeasurements,
  CameraPresetId,
  JointId,
  JointRotationMap,
  OutfitConfiguration,
  OutfitHistoryEntry,
  PoseAiGenerationResult,
  PosePresetId,
  StudioLightingId,
  WeatherEffectConfig,
  WeatherMode,
} from '../types/studio';
import {
  buildHumanMannequinRig,
  HumanMannequinRig,
} from '../three/humanMannequinBuilder';
import {
  createContactShadowTexture,
  disposeCachedTextures,
} from '../three/proceduralTextures';
import {
  analyzeBodyAndGarmentFit,
  analyzeFabricUnderWeather,
  DEFAULT_WEATHER_EFFECT,
  JOINT_METADATA,
  MANNEQUIN_SURFACES,
  SUGGESTED_OUTFIT_PRESETS,
} from '../data/presets';

interface MannequinViewportProps {
  body: BodyMeasurements;
  outfit: OutfitConfiguration;
  posePreset: PosePresetId;
  jointRotations: JointRotationMap;
  selectedJoint: JointId | null;
  onSelectJoint: (joint: JointId) => void;
  cameraPreset: CameraPresetId;
  lightingPreset: StudioLightingId;
  showMeasurementTape: boolean;
  resetTrigger?: number;
  onResetToTPose?: () => void;
  isArMode?: boolean;
  onToggleArMode?: () => void;
  isSplitCompareMode?: boolean;
  onToggleSplitCompareMode?: () => void;
  compareOutfitB?: OutfitConfiguration | null;
  outfitHistory?: OutfitHistoryEntry[];
  activeHistoryIdA?: string | null;
  activeHistoryIdB?: string | null;
  onSelectCompareHistoryA?: (entry: OutfitHistoryEntry) => void;
  onSelectCompareHistoryB?: (entry: OutfitHistoryEntry) => void;
  onUpdateOutfitA?: (next: OutfitConfiguration) => void;
  onUpdateCompareOutfitB?: (next: OutfitConfiguration) => void;
  weatherEffect?: WeatherEffectConfig;
  onUpdateWeatherEffect?: (next: WeatherEffectConfig) => void;
  lastAiPoseResult?: PoseAiGenerationResult | null;
  videoWalkthroughTrigger?: number;
  exportGlbTrigger?: number;
  exportUsdzTrigger?: number;
  onRandomShuffleOutfit?: () => void;
}

const CAMERA_PRESET_TARGETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  full_front: { pos: [0, 0.90, 2.95], target: [0, 0.87, 0] },
  three_quarter: { pos: [1.45, 0.98, 2.45], target: [0, 0.87, 0] },
  upper_detail: { pos: [0, 1.32, 1.35], target: [0, 1.24, 0] },
  lower_detail: { pos: [0.35, 0.58, 1.65], target: [0, 0.52, 0] },
  back_view: { pos: [0, 0.94, -2.95], target: [0, 0.87, 0] },
};

const _targetCameraPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _studioBgColor = new THREE.Color('#FAF9F6');
const _studioFog = new THREE.Fog('#FAF9F6', 6.0, 14.0);
const _arFloorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _arHitPoint = new THREE.Vector3();

interface ViewportQuickActionsDockProps {
  onRandomShuffleOutfit?: () => void;
  onResetToTPose?: () => void;
  isSplitCompareMode: boolean;
  onToggleSplitCompareMode?: () => void;
  isArMode: boolean;
  onToggleArMode?: () => void;
  weatherMode: WeatherMode;
  hasWeatherCallback: boolean;
  onSelectWeatherMode: (mode: WeatherMode) => void;
  isRecording360: boolean;
  recording360Progress: number;
  onStartVideoWalkthrough: () => void;
  isExportingModel: 'glb' | 'usdz' | null;
  onExportGlb: () => void;
  onExportUsdz: () => void;
}

const ViewportQuickActionsDock = memo<ViewportQuickActionsDockProps>(
  ({
    onRandomShuffleOutfit,
    onResetToTPose,
    isSplitCompareMode,
    onToggleSplitCompareMode,
    isArMode,
    onToggleArMode,
    weatherMode,
    hasWeatherCallback,
    onSelectWeatherMode,
    isRecording360,
    recording360Progress,
    onStartVideoWalkthrough,
    isExportingModel,
    onExportGlb,
    onExportUsdz,
  }) => (
    <div className="absolute top-14 right-3 z-20 flex flex-col items-end gap-1.5 max-w-[94vw] pointer-events-none">
      {/* Row 1: Shuffle + Reset T-Pose + Compare + Place in Space (AR) */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
        {onRandomShuffleOutfit && (
          <button
            type="button"
            onClick={onRandomShuffleOutfit}
            title="Phối đồ ngẫu nhiên từ kho trang phục có sẵn và các món đồ bạn đã upload"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold tracking-tight shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5 shrink-0" />
            <span>Phối Ngẫu Nhiên</span>
          </button>
        )}

        {onResetToTPose && (
          <button
            type="button"
            onClick={onResetToTPose}
            className="px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 text-xs font-medium tracking-tight shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            T-Pose
          </button>
        )}

        {onToggleSplitCompareMode && !isArMode && (
          <button
            type="button"
            onClick={onToggleSplitCompareMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold tracking-tight shadow-xs transition-colors cursor-pointer whitespace-nowrap ${
              isSplitCompareMode
                ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                : 'bg-white/95 text-indigo-950 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isSplitCompareMode ? 'Đang So sánh (A|B)' : 'So sánh'}
            </span>
          </button>
        )}

        {onToggleArMode && (
          <button
            type="button"
            onClick={onToggleArMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold tracking-tight shadow-xs transition-colors cursor-pointer whitespace-nowrap ${
              isArMode
                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700'
                : 'bg-white/95 text-emerald-900 border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isArMode ? 'Đang bật AR' : 'Đặt vào không gian'}
            </span>
          </button>
        )}
      </div>

      {/* Row 2: Studio Weather Switcher + Video 360° & 3D Export (.GLB / .USDZ) */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
        {hasWeatherCallback && (
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-0.5 shadow-xs">
            {(
              [
                { id: 'clear', label: 'Studio', icon: Sun },
                { id: 'wind', label: 'Gió', icon: Wind },
                { id: 'rain', label: 'Mưa', icon: CloudRain },
                { id: 'storm', label: 'Bão', icon: CloudLightning },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = weatherMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectWeatherMode(item.id)}
                  title={`Giả lập hiệu ứng môi trường: ${item.label}`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? item.id === 'clear'
                        ? 'bg-slate-900 text-white'
                        : item.id === 'wind'
                        ? 'bg-sky-600 text-white'
                        : item.id === 'rain'
                        ? 'bg-blue-600 text-white'
                        : 'bg-indigo-700 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-0.5 shadow-xs">
          <button
            type="button"
            onClick={onStartVideoWalkthrough}
            disabled={isRecording360}
            title="Tạo Video 360° xoay quanh người mẫu với tư thế & hiệu ứng vải hiện tại"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              isRecording360
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isRecording360
                ? `Quay 360° (${recording360Progress}%)`
                : 'Video 360°'}
            </span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200" />

          <button
            type="button"
            onClick={onExportGlb}
            disabled={Boolean(isExportingModel)}
            title="Xuất mô hình 3D hiện tại dưới dạng tệp .GLB để xem AR trên Android / Web"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Box className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>.GLB</span>
          </button>

          <button
            type="button"
            onClick={onExportUsdz}
            disabled={Boolean(isExportingModel)}
            title="Xuất mô hình 3D hiện tại dưới dạng tệp .USDZ để xem AR Quick Look trên iPhone / iPad"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>.USDZ</span>
          </button>
        </div>
      </div>
    </div>
  )
);
ViewportQuickActionsDock.displayName = 'ViewportQuickActionsDock';

const MannequinViewportComponent: React.FC<MannequinViewportProps> = ({
  body,
  outfit,
  posePreset,
  jointRotations,
  selectedJoint,
  onSelectJoint,
  cameraPreset,
  lightingPreset,
  showMeasurementTape,
  resetTrigger = 0,
  onResetToTPose,
  isArMode = false,
  onToggleArMode,
  isSplitCompareMode = false,
  onToggleSplitCompareMode,
  compareOutfitB = null,
  outfitHistory = [],
  activeHistoryIdA = null,
  activeHistoryIdB = null,
  onSelectCompareHistoryA,
  onSelectCompareHistoryB,
  onUpdateOutfitA,
  onUpdateCompareOutfitB,
  weatherEffect = DEFAULT_WEATHER_EFFECT,
  onUpdateWeatherEffect,
  lastAiPoseResult = null,
  videoWalkthroughTrigger = 0,
  exportGlbTrigger = 0,
  exportUsdzTrigger = 0,
  onRandomShuffleOutfit,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const uploadedRoomImgRef = useRef<HTMLImageElement | null>(null);
  const roomUploadInputRef = useRef<HTMLInputElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const compareSceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rigRef = useRef<HumanMannequinRig | null>(null);
  const compareRigRef = useRef<HumanMannequinRig | null>(null);

  const [hoveredJoint, setHoveredJoint] = useState<JointId | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastResetTriggerRef = useRef<number>(resetTrigger);

  // 360° Video Walkthrough & 3D Export (.GLB / .USDZ) States
  const [isRecording360, setIsRecording360] = useState<boolean>(false);
  const [recording360Progress, setRecording360Progress] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedVideoExt, setRecordedVideoExt] = useState<string>('webm');
  const [exportStatusToast, setExportStatusToast] = useState<string | null>(
    null
  );
  const [isExportingModel, setIsExportingModel] = useState<
    'glb' | 'usdz' | null
  >(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Augmented Reality (AR) Camera & Spatial Placement States
  const [arCameraFacing, setArCameraFacing] = useState<'environment' | 'user'>(
    'environment'
  );
  const [arCameraStatus, setArCameraStatus] = useState<
    'idle' | 'starting' | 'active' | 'fallback_room'
  >('idle');
  const [arCameraErrorMsg, setArCameraErrorMsg] = useState<string | null>(null);
  const [customRoomPhotoUrl, setCustomRoomPhotoUrl] = useState<string | null>(
    null
  );
  const [arBackdropSource, setArBackdropSource] = useState<'camera' | 'photo'>(
    'camera'
  );
  const [arInteractionMode, setArInteractionMode] = useState<'place' | 'orbit'>(
    'place'
  );
  const [arScale, setArScale] = useState<number>(1.0);
  const [arRotationDeg, setArRotationDeg] = useState<number>(0);
  const [arPositionXZ, setArPositionXZ] = useState<{ x: number; z: number }>({
    x: 0,
    z: 0,
  });
  const [showArReticle, setShowArReticle] = useState<boolean>(true);
  const [arCaptureFlash, setArCaptureFlash] = useState<boolean>(false);
  const [arCameraRetryTrigger, setArCameraRetryTrigger] = useState<number>(0);
  const mobileCameraCaptureInputRef = useRef<HTMLInputElement | null>(null);

  const isShowingUploadedRoomPhoto = Boolean(
    customRoomPhotoUrl &&
      (arBackdropSource === 'photo' || arCameraStatus !== 'active')
  );

  const effectiveOutfitB = compareOutfitB || outfit;

  const stateRef = useRef({
    body,
    outfit,
    compareOutfitB: effectiveOutfitB,
    isSplitCompareMode,
    posePreset,
    jointRotations,
    selectedJoint,
    hoveredJoint,
    cameraPreset,
    lightingPreset,
    showMeasurementTape,
    isCameraTransitioning: false,
    shouldSnapCamera: false,
    isArMode,
    arInteractionMode,
    arScale,
    arRotationDeg,
    arPositionXZ,
    showArReticle,
    arAmbientColor: new THREE.Color('#FFFFFF'),
    arAmbientIntensity: 1.45,
    weatherEffect,
    isRecording360: false,
    record360Elapsed: 0,
    record360Duration: 5.0,
    record360StartYaw: 0,
  });

  useEffect(() => {
    stateRef.current.body = body;
    stateRef.current.outfit = outfit;
    stateRef.current.compareOutfitB = effectiveOutfitB;
    stateRef.current.isSplitCompareMode = isSplitCompareMode;
    stateRef.current.posePreset = posePreset;
    stateRef.current.jointRotations = jointRotations;
    stateRef.current.selectedJoint = selectedJoint;
    stateRef.current.hoveredJoint = hoveredJoint;
    stateRef.current.lightingPreset = lightingPreset;
    stateRef.current.showMeasurementTape = showMeasurementTape;
    stateRef.current.isArMode = isArMode;
    stateRef.current.arInteractionMode = arInteractionMode;
    stateRef.current.arScale = arScale;
    stateRef.current.arRotationDeg = arRotationDeg;
    stateRef.current.arPositionXZ = arPositionXZ;
    stateRef.current.showArReticle = showArReticle;
    stateRef.current.weatherEffect = weatherEffect;
  }, [
    body,
    outfit,
    effectiveOutfitB,
    isSplitCompareMode,
    posePreset,
    jointRotations,
    selectedJoint,
    hoveredJoint,
    lightingPreset,
    showMeasurementTape,
    isArMode,
    arInteractionMode,
    arScale,
    arRotationDeg,
    arPositionXZ,
    showArReticle,
    weatherEffect,
  ]);

  // Manage Live Camera Stream when AR Mode is toggled (strictly decoupled from arCameraStatus so state updates never kill the stream on mobile!)
  useEffect(() => {
    if (!isArMode) {
      setArCameraStatus('idle');
      setArCameraErrorMsg(null);
      const vid = videoRef.current;
      if (vid && vid.srcObject) {
        const stream = vid.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        vid.srcObject = null;
      }
      return;
    }

    // Frame camera nicely for AR room placement when entering AR mode
    _targetCameraPos.set(0, 1.08, 3.25);
    _targetLookAt.set(0, 0.85, 0);
    stateRef.current.isCameraTransitioning = true;

    let cancelled = false;
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      setArCameraStatus('starting');
      setArCameraErrorMsg(null);

      // Stop any existing tracks first so mobile camera hardware is released cleanly
      const existingVid = videoRef.current;
      if (existingVid && existingVid.srcObject) {
        const prevStream = existingVid.srcObject as MediaStream;
        prevStream.getTracks().forEach((t) => t.stop());
        existingVid.srcObject = null;
      }

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        if (!cancelled) {
          setArCameraStatus('fallback_room');
          setArCameraErrorMsg(
            'Trình duyệt không cấp quyền WebRTC — hãy bấm "Mở Cam Điện Thoại" để mở máy ảnh gốc hoặc tải ảnh phòng lên.'
          );
        }
        return;
      }

      // 4-tier progressive mobile camera constraints (handles iOS Safari, Android Chrome, and tablet cameras)
      const constraintTiers: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: arCameraFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: arCameraFacing,
          },
          audio: false,
        },
        {
          video: {
            facingMode:
              arCameraFacing === 'environment' ? 'user' : 'environment',
          },
          audio: false,
        },
        {
          video: true,
          audio: false,
        },
      ];

      try {
        for (const constraints of constraintTiers) {
          try {
            activeStream = await navigator.mediaDevices.getUserMedia(
              constraints
            );
            if (activeStream) break;
          } catch {
            // Try next fallback tier
          }
        }

        if (!activeStream) {
          throw new Error('CAMERA_UNAVAILABLE');
        }

        if (cancelled) {
          activeStream.getTracks().forEach((t) => t.stop());
          return;
        }

        const vid = videoRef.current;
        if (vid) {
          vid.setAttribute('playsinline', 'true');
          vid.setAttribute('webkit-playsinline', 'true');
          vid.muted = true;
          vid.autoplay = true;
          vid.srcObject = activeStream;
          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => {
              if (!done) {
                done = true;
                resolve();
              }
            };
            vid.onloadedmetadata = finish;
            window.setTimeout(finish, 600);
          });
          await vid.play().catch(() => {});
        }
        if (!cancelled) {
          setArCameraStatus('active');
          setArCameraErrorMsg(null);
        }
      } catch {
        if (!cancelled) {
          setArCameraStatus('fallback_room');
          setArCameraErrorMsg(
            'Nếu trình duyệt trên điện thoại chặn luồng Live, hãy bấm "Mở Cam Điện Thoại (Chụp AR)" bên dưới để mở trực tiếp Camera máy!'
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      const vid = videoRef.current;
      if (vid && vid.srcObject) {
        const s = vid.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
        vid.srcObject = null;
      }
    };
  }, [isArMode, arCameraFacing, arCameraRetryTrigger]);

  // Separate effect for real-time Camera / Room Photo Ambient Light Estimation (every 450ms)
  useEffect(() => {
    if (!isArMode) return;
    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = 16;
    probeCanvas.height = 16;
    const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });

    const lightTimer = window.setInterval(() => {
      if (!stateRef.current.isArMode || !probeCtx) return;

      const uploadedImg = uploadedRoomImgRef.current;
      const vid = videoRef.current;
      const usePhoto =
        Boolean(customRoomPhotoUrl) &&
        (arBackdropSource === 'photo' || arCameraStatus !== 'active');

      try {
        if (
          usePhoto &&
          uploadedImg &&
          uploadedImg.complete &&
          uploadedImg.naturalWidth > 0
        ) {
          probeCtx.drawImage(uploadedImg, 0, 0, 16, 16);
        } else if (vid && vid.readyState >= 2) {
          probeCtx.drawImage(vid, 0, 0, 16, 16);
        } else {
          return;
        }

        const data = probeCtx.getImageData(0, 0, 16, 16).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        const count = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
        }
        const rAvg = rSum / count / 255;
        const gAvg = gSum / count / 255;
        const bAvg = bSum / count / 255;
        const luma = 0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg;

        stateRef.current.arAmbientColor.setRGB(
          0.65 + rAvg * 0.35,
          0.65 + gAvg * 0.35,
          0.65 + bAvg * 0.35
        );
        stateRef.current.arAmbientIntensity = THREE.MathUtils.clamp(
          1.05 + luma * 0.75,
          0.95,
          1.85
        );
      } catch {
        // Ignore cross-origin or video frame read issues
      }
    }, 450);

    return () => {
      window.clearInterval(lightTimer);
    };
  }, [isArMode, customRoomPhotoUrl, arBackdropSource, arCameraStatus]);

  const handleRoomPhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const dataUrl = reader.result;
          setCustomRoomPhotoUrl(dataUrl);
          setArBackdropSource('photo');
          if (!isArMode && onToggleArMode) {
            onToggleArMode();
          }

          // Immediately sample room lighting from the uploaded photo
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = 16;
            c.height = 16;
            const ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            let rS = 0,
              gS = 0,
              bS = 0;
            const n = data.length / 4;
            for (let i = 0; i < data.length; i += 4) {
              rS += data[i];
              gS += data[i + 1];
              bS += data[i + 2];
            }
            const rA = rS / n / 255;
            const gA = gS / n / 255;
            const bA = bS / n / 255;
            const lum = 0.299 * rA + 0.587 * gA + 0.114 * bA;
            stateRef.current.arAmbientColor.setRGB(
              0.65 + rA * 0.35,
              0.65 + gA * 0.35,
              0.65 + bA * 0.35
            );
            stateRef.current.arAmbientIntensity = THREE.MathUtils.clamp(
              1.05 + lum * 0.75,
              0.95,
              1.85
            );
          };
          img.src = dataUrl;
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [isArMode, onToggleArMode]
  );

  const handleResetArPlacement = useCallback(() => {
    setArPositionXZ({ x: 0, z: 0 });
    setArScale(1.0);
    setArRotationDeg(0);
    _targetCameraPos.set(0, 1.08, 3.25);
    _targetLookAt.set(0, 0.85, 0);
    stateRef.current.isCameraTransitioning = true;
  }, []);

  const handleCaptureArSnapshot = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    setArCaptureFlash(true);
    window.setTimeout(() => setArCaptureFlash(false), 260);

    const glCanvas = renderer.domElement;
    const w = glCanvas.width || 1280;
    const h = glCanvas.height || 720;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Uploaded Room Photo, Live Camera Feed, or Studio AR Room Backdrop
    const uploadedImg = uploadedRoomImgRef.current;
    const vid = videoRef.current;
    if (
      isShowingUploadedRoomPhoto &&
      uploadedImg &&
      uploadedImg.complete &&
      uploadedImg.naturalWidth > 0
    ) {
      const iw = uploadedImg.naturalWidth;
      const ih = uploadedImg.naturalHeight;
      const canvasAspect = w / h;
      const imgAspect = iw / ih;
      let sx = 0;
      let sy = 0;
      let sw = iw;
      let sh = ih;
      if (imgAspect > canvasAspect) {
        sw = ih * canvasAspect;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / canvasAspect;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(uploadedImg, sx, sy, sw, sh, 0, 0, w, h);
    } else if (vid && arCameraStatus === 'active' && vid.videoWidth > 0) {
      const vw = vid.videoWidth;
      const vh = vid.videoHeight;
      const canvasAspect = w / h;
      const videoAspect = vw / vh;
      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;
      if (videoAspect > canvasAspect) {
        sw = vh * canvasAspect;
        sx = (vw - sw) / 2;
      } else {
        sh = vw / canvasAspect;
        sy = (vh - sh) / 2;
      }
      ctx.save();
      if (arCameraFacing === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, w, h);
      ctx.restore();
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#E2E8F0');
      grad.addColorStop(0.62, '#CBD5E1');
      grad.addColorStop(0.63, '#94A3B8');
      grad.addColorStop(1, '#64748B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Render 3D Mannequin synchronously right before copying buffer
    renderer.render(scene, camera);
    ctx.drawImage(glCanvas, 0, 0, w, h);

    // 3. Trigger PNG download
    try {
      const dataUrl = outCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `smart-wardrobe-ar-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('AR snapshot error:', err);
    }
  }, [arCameraStatus, arCameraFacing, isShowingUploadedRoomPhoto]);

  // ===========================================================================
  // Export 3D Model (.GLB for Android/Web AR & .USDZ for iOS AR Quick Look)
  // ===========================================================================
  const handleExport3DModel = useCallback(
    async (format: 'glb' | 'usdz') => {
      const rig = rigRef.current;
      if (!rig || isExportingModel) return;

      setIsExportingModel(format);
      setExportStatusToast(
        format === 'glb'
          ? 'Đang đóng gói mô hình 3D (.GLB) chuẩn AR Android / Web...'
          : 'Đang đóng gói mô hình 3D (.USDZ) chuẩn iOS AR Quick Look...'
      );

      try {
        const exportGroup = rig.buildExportablePosedScene();

        const disposeExportGroup = () => {
          exportGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              m.geometry?.dispose();
              if (m.material) {
                (m.material as THREE.Material).dispose();
              }
            }
          });
        };

        if (format === 'glb') {
          const exporter = new GLTFExporter();
          exporter.parse(
            exportGroup,
            (result) => {
              disposeExportGroup();
              if (result instanceof ArrayBuffer) {
                const blob = new Blob([result], {
                  type: 'model/gltf-binary',
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `mannequin-ar-${body.genderProfile}-${Date.now()}.glb`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.setTimeout(() => URL.revokeObjectURL(url), 4000);
                setExportStatusToast(
                  'Đã xuất tệp 3D .GLB thành công! Bạn có thể mở bằng chế độ AR trên điện thoại.'
                );
              }
              setIsExportingModel(null);
              window.setTimeout(() => setExportStatusToast(null), 4500);
            },
            (err) => {
              disposeExportGroup();
              console.error('GLB export error:', err);
              setExportStatusToast('Không thể xuất tệp .GLB. Vui lòng thử lại.');
              setIsExportingModel(null);
              window.setTimeout(() => setExportStatusToast(null), 3500);
            },
            { binary: true }
          );
        } else {
          const usdzExporter = new USDZExporter();
          const arraybuffer = await usdzExporter.parseAsync(exportGroup);
          disposeExportGroup();
          const blob = new Blob([arraybuffer], {
            type: 'model/vnd.usdz+zip',
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('rel', 'ar');
          link.download = `mannequin-ar-${body.genderProfile}-${Date.now()}.usdz`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(() => URL.revokeObjectURL(url), 4000);
          setExportStatusToast(
            'Đã xuất tệp 3D .USDZ thành công! Mở trên iPhone/iPad để xem AR Quick Look.'
          );
          setIsExportingModel(null);
          window.setTimeout(() => setExportStatusToast(null), 4500);
        }
      } catch (err) {
        console.error('3D export error:', err);
        setExportStatusToast('Lỗi khi xuất mô hình 3D. Vui lòng thử lại.');
        setIsExportingModel(null);
        window.setTimeout(() => setExportStatusToast(null), 3500);
      }
    },
    [body.genderProfile, isExportingModel]
  );

  // ===========================================================================
  // 360° Video Walkthrough Generator (5-Second Full Turntable Recording)
  // ===========================================================================
  const handleStartVideoWalkthrough = useCallback(() => {
    const renderer = rendererRef.current;
    const rig = rigRef.current;
    if (!renderer || !rig || stateRef.current.isRecording360) return;

    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }

    // Frame full body nicely if not already framed
    _targetCameraPos.set(0, 0.92, 2.95);
    _targetLookAt.set(0, 0.87, 0);
    stateRef.current.isCameraTransitioning = true;

    const canvas = renderer.domElement;
    if (typeof canvas.captureStream !== 'function') {
      setExportStatusToast(
        'Trình duyệt hiện tại không hỗ trợ quay video Canvas trực tiếp.'
      );
      window.setTimeout(() => setExportStatusToast(null), 3500);
      return;
    }

    try {
      const stream = canvas.captureStream(30);
      const mimeCandidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      let chosenMime = '';
      for (const candidate of mimeCandidates) {
        if (
          typeof MediaRecorder !== 'undefined' &&
          typeof MediaRecorder.isTypeSupported === 'function' &&
          MediaRecorder.isTypeSupported(candidate)
        ) {
          chosenMime = candidate;
          break;
        }
      }

      const recorder = chosenMime
        ? new MediaRecorder(stream, {
            mimeType: chosenMime,
            videoBitsPerSecond: 6_500_000,
          })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const isMp4 = chosenMime.includes('mp4');
        const blob = new Blob(chunks, {
          type: chosenMime || 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        setRecordedVideoExt(isMp4 ? 'mp4' : 'webm');
        setRecordedVideoUrl(url);
        setIsRecording360(false);
        setRecording360Progress(100);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      stateRef.current.record360StartYaw = rig.root.rotation.y;
      stateRef.current.record360Elapsed = 0;
      stateRef.current.record360Duration = 5.0;
      stateRef.current.isRecording360 = true;

      setIsRecording360(true);
      setRecording360Progress(0);
      recorder.start(100);
    } catch (err) {
      console.error('Video walkthrough recording error:', err);
      stateRef.current.isRecording360 = false;
      setIsRecording360(false);
      setExportStatusToast('Không thể khởi tạo trình quay Video 360°.');
      window.setTimeout(() => setExportStatusToast(null), 3500);
    }
  }, [recordedVideoUrl]);

  const lastVideoTriggerRef = useRef<number>(videoWalkthroughTrigger);
  const lastGlbTriggerRef = useRef<number>(exportGlbTrigger);
  const lastUsdzTriggerRef = useRef<number>(exportUsdzTrigger);

  useEffect(() => {
    if (
      videoWalkthroughTrigger > 0 &&
      videoWalkthroughTrigger !== lastVideoTriggerRef.current
    ) {
      lastVideoTriggerRef.current = videoWalkthroughTrigger;
      handleStartVideoWalkthrough();
    }
  }, [videoWalkthroughTrigger, handleStartVideoWalkthrough]);

  useEffect(() => {
    if (
      exportGlbTrigger > 0 &&
      exportGlbTrigger !== lastGlbTriggerRef.current
    ) {
      lastGlbTriggerRef.current = exportGlbTrigger;
      handleExport3DModel('glb');
    }
  }, [exportGlbTrigger, handleExport3DModel]);

  useEffect(() => {
    if (
      exportUsdzTrigger > 0 &&
      exportUsdzTrigger !== lastUsdzTriggerRef.current
    ) {
      lastUsdzTriggerRef.current = exportUsdzTrigger;
      handleExport3DModel('usdz');
    }
  }, [exportUsdzTrigger, handleExport3DModel]);

  useEffect(() => {
    const targetCfg = CAMERA_PRESET_TARGETS[cameraPreset];
    if (targetCfg) {
      const container = canvasMountRef.current;
      const aspect = container
        ? container.clientWidth / Math.max(1, container.clientHeight)
        : 1.0;
      let targetZ = targetCfg.pos[2];
      let targetY = targetCfg.pos[1];
      if (aspect < 0.85 && cameraPreset === 'full_front') {
        targetZ = Math.min(
          3.85,
          Math.max(2.95, 1.88 / (2 * Math.tan((34 * Math.PI) / 360) * aspect))
        );
        targetY = 0.90;
      }
      _targetCameraPos.set(
        targetCfg.pos[0],
        targetY,
        targetZ
      );
      _targetLookAt.set(
        targetCfg.target[0],
        targetCfg.target[1],
        targetCfg.target[2]
      );
      if (lastResetTriggerRef.current !== resetTrigger) {
        lastResetTriggerRef.current = resetTrigger;
        stateRef.current.shouldSnapCamera = true;
      }
      stateRef.current.isCameraTransitioning = true;
    }
  }, [cameraPreset, resetTrigger]);

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.updateBodyMorph(body, outfit, showMeasurementTape);
    }
    if (compareRigRef.current) {
      compareRigRef.current.updateBodyMorph(
        body,
        effectiveOutfitB,
        showMeasurementTape
      );
    }
  }, [body, outfit, effectiveOutfitB, showMeasurementTape, isSplitCompareMode]);

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.highlightJoint(selectedJoint, hoveredJoint);
    }
    if (compareRigRef.current) {
      compareRigRef.current.highlightJoint(selectedJoint, hoveredJoint);
    }
  }, [selectedJoint, hoveredJoint]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // Pre-acquire and validate WebGL context with alpha: true so the 3D canvas
    // can seamlessly switch between Studio background (#FAF9F6) and transparent AR camera overlay.
    const canvas = document.createElement('canvas');
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: true,
      stencil: false,
      powerPreference: 'default',
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    };

    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl =
        (canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext | null) ||
        (canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext | null) ||
        (canvas.getContext(
          'experimental-webgl',
          contextAttributes
        ) as WebGLRenderingContext | null);
    } catch {
      gl = null;
    }

    if (!gl || (typeof gl.isContextLost === 'function' && gl.isContextLost())) {
      setWebglFallback(true);
      if (retryCount < 4) {
        const timer = window.setTimeout(() => {
          setRetryCount((c) => c + 1);
        }, 350);
        return () => clearTimeout(timer);
      }
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl,
        alpha: true,
        antialias: false,
        powerPreference: 'default',
        preserveDrawingBuffer: false,
      });
    } catch {
      setWebglFallback(true);
      return;
    }
    rendererRef.current = renderer;

    const isSoftwareGl = (() => {
      try {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    setWebglFallback(false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
    );
    renderer.setSize(
      Math.max(1, container.clientWidth),
      Math.max(1, container.clientHeight)
    );
    renderer.shadowMap.enabled = false;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    let isContextLost = false;
    let frameId = 0;
    let restoreTimer = 0;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      isContextLost = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      setWebglFallback(true);
      if (retryCount < 4) {
        restoreTimer = window.setTimeout(() => {
          setRetryCount((c) => c + 1);
        }, 450);
      }
    };
    const handleContextRestored = () => {
      clearTimeout(restoreTimer);
      isContextLost = false;
      setWebglFallback(false);
      frameId = requestAnimationFrame(tick);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored
    );

    const scene = new THREE.Scene();
    scene.background = stateRef.current.isArMode ? null : _studioBgColor;
    scene.fog = stateRef.current.isArMode ? null : _studioFog;
    sceneRef.current = scene;

    // Studio RoomEnvironment PMREM reflection map so metallic watches, sunglasses, handbag hardware,
    // silk garments, and wet rain-soaked clothes reflect realistic studio light instead of appearing flat/black.
    let pmremGenerator: THREE.PMREMGenerator | null = null;
    let envMapTexture: THREE.Texture | null = null;
    try {
      pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      envMapTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      scene.environment = envMapTexture;
      roomEnv.dispose();
    } catch {
      // Fallback gracefully if PMREM fails on constrained software WebGL
    }

    const camera = new THREE.PerspectiveCamera(
      34,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      50
    );
    camera.position.set(0, 0.90, 2.95);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.87, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.85;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.08;
    controls.update();

    const cancelTransitionOnUserStart = () => {
      stateRef.current.isCameraTransitioning = false;
    };
    controls.addEventListener('start', cancelTransitionOnUserStart);

    // Balanced 4-Point Studio Lighting
    const hemiLight = new THREE.HemisphereLight('#FFFFFF', '#E2E8F0', 1.45);
    hemiLight.position.set(0, 4, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFFDF9', 1.45);
    keyLight.position.set(2.0, 3.4, 2.8);
    keyLight.castShadow = false;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#F8FAFC', 0.9);
    fillLight.position.set(-2.4, 2.0, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#FFFFFF', 0.92);
    rimLight.position.set(0, 2.6, -2.5);
    scene.add(rimLight);

    // Grounding Shadow & AR Spatial Floor Reticle
    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    const contactShadowTex = createContactShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(0.95, 0.95);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const contactShadowMesh = new THREE.Mesh(
      contactShadowGeo,
      contactShadowMat
    );
    contactShadowMesh.position.y = 0.002;
    floorGroup.add(contactShadowMesh);

    // 3D AR Floor Placement Reticle (Target Rings + Cardinal Crosshairs)
    const arReticleGroup = new THREE.Group();
    arReticleGroup.position.y = 0.004;
    arReticleGroup.visible = false;

    const outerRingGeo = new THREE.RingGeometry(0.42, 0.45, 48);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    arReticleGroup.add(new THREE.Mesh(outerRingGeo, outerRingMat));

    const innerRingGeo = new THREE.RingGeometry(0.24, 0.255, 40);
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    arReticleGroup.add(new THREE.Mesh(innerRingGeo, innerRingMat));

    const tickGeo = new THREE.PlaneGeometry(0.025, 0.14);
    tickGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const tick = new THREE.Mesh(tickGeo, outerRingMat);
      const angle = (i * Math.PI) / 2;
      tick.position.set(Math.sin(angle) * 0.48, 0, Math.cos(angle) * 0.48);
      tick.rotation.y = angle;
      arReticleGroup.add(tick);
    }
    floorGroup.add(arReticleGroup);

    // =========================================================================
    // 3D Environmental Weather System (Wind Streamlines + Rain Drops + Ripples)
    // =========================================================================
    const weatherGroup = new THREE.Group();
    weatherGroup.name = 'StudioWeatherEffectsGroup';
    scene.add(weatherGroup);

    // 1. 3D Wind Streamlines (48 aerodynamic wind ribbons)
    const WIND_COUNT = 48;
    const windGeo = new THREE.BufferGeometry();
    const windPositions = new Float32Array(WIND_COUNT * 2 * 3);
    const windSeeds = new Float32Array(WIND_COUNT * 4); // [phase, yHeight, lateralOffset, speedMult]
    for (let i = 0; i < WIND_COUNT; i++) {
      windSeeds[i * 4 + 0] = (i / WIND_COUNT) * 3.2;
      windSeeds[i * 4 + 1] = 0.22 + ((i * 17) % 100) * 0.017; // 0.22m to 1.92m
      windSeeds[i * 4 + 2] = (((i * 29) % 100) / 100 - 0.5) * 1.65;
      windSeeds[i * 4 + 3] = 0.75 + ((i * 13) % 10) * 0.06;
    }
    windGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(windPositions, 3)
    );
    const windMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const windStreamLines = new THREE.LineSegments(windGeo, windMat);
    windStreamLines.visible = false;
    weatherGroup.add(windStreamLines);

    // 2. 3D Falling Rain Streaks (200 raindrops falling from sky to studio floor)
    const RAIN_COUNT = 200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(RAIN_COUNT * 2 * 3);
    const rainState = new Float32Array(RAIN_COUNT * 4); // [x, y, z, speed]
    for (let i = 0; i < RAIN_COUNT; i++) {
      rainState[i * 4 + 0] = (((i * 37) % 100) / 100 - 0.5) * 2.1;
      rainState[i * 4 + 1] = ((i * 53) % 100) * 0.026; // 0 to 2.6m
      rainState[i * 4 + 2] = (((i * 71) % 100) / 100 - 0.5) * 2.1;
      rainState[i * 4 + 3] = 3.2 + ((i * 19) % 10) * 0.22;
    }
    rainGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(rainPositions, 3)
    );
    const rainMat = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    const rainDropLines = new THREE.LineSegments(rainGeo, rainMat);
    rainDropLines.visible = false;
    weatherGroup.add(rainDropLines);

    // 3. 3D Floor Water Splash Ripples around mannequin feet when raining
    const rainRippleGroup = new THREE.Group();
    rainRippleGroup.position.y = 0.003;
    rainRippleGroup.visible = false;
    const RIPPLE_COUNT = 10;
    const rippleMeshes: THREE.Mesh[] = [];
    const rippleRingGeo = new THREE.RingGeometry(0.05, 0.062, 28);
    rippleRingGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(rippleRingGeo, rMat);
      const angle = (i / RIPPLE_COUNT) * Math.PI * 2;
      const dist = 0.14 + (i % 3) * 0.16;
      rMesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      rainRippleGroup.add(rMesh);
      rippleMeshes.push(rMesh);
    }
    floorGroup.add(rainRippleGroup);

    // Build Articulated Human Mannequin (Left / Primary Slot A)
    const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy() || 1);
    const rig = buildHumanMannequinRig(maxAniso);
    rigRef.current = rig;
    rig.updateBodyMorph(
      stateRef.current.body,
      stateRef.current.outfit,
      stateRef.current.showMeasurementTape
    );
    scene.add(rig.root);

    // Lazily constructed Right Comparison Scene & Rig (Slot B) for Split-Screen Mode
    let compareScene: THREE.Scene | null = null;
    let compareRig: HumanMannequinRig | null = null;
    let compareHemiLight: THREE.HemisphereLight | null = null;
    let compareKeyLight: THREE.DirectionalLight | null = null;
    let compareFillLight: THREE.DirectionalLight | null = null;
    let compareFloorGroup: THREE.Group | null = null;

    const ensureCompareSceneAndRig = () => {
      if (compareScene && compareRig) return;
      compareScene = new THREE.Scene();
      compareScene.background = _studioBgColor;
      compareScene.fog = _studioFog;
      if (envMapTexture) {
        compareScene.environment = envMapTexture;
      }
      compareSceneRef.current = compareScene;

      compareHemiLight = new THREE.HemisphereLight('#FFFFFF', '#E2E8F0', 1.45);
      compareHemiLight.position.set(0, 4, 0);
      compareScene.add(compareHemiLight);

      compareKeyLight = new THREE.DirectionalLight('#FFFDF9', 1.45);
      compareKeyLight.position.set(2.0, 3.4, 2.8);
      compareKeyLight.castShadow = false;
      compareScene.add(compareKeyLight);

      compareFillLight = new THREE.DirectionalLight('#F8FAFC', 0.9);
      compareFillLight.position.set(-2.4, 2.0, 2.0);
      compareScene.add(compareFillLight);

      const compareRimLight = new THREE.DirectionalLight('#FFFFFF', 0.92);
      compareRimLight.position.set(0, 2.6, -2.5);
      compareScene.add(compareRimLight);

      compareFloorGroup = new THREE.Group();
      const compareShadowMesh = new THREE.Mesh(
        contactShadowGeo,
        contactShadowMat
      );
      compareShadowMesh.position.y = 0.002;
      compareFloorGroup.add(compareShadowMesh);
      compareScene.add(compareFloorGroup);

      compareRig = buildHumanMannequinRig(maxAniso);
      compareRigRef.current = compareRig;
      compareRig.updateBodyMorph(
        stateRef.current.body,
        stateRef.current.compareOutfitB,
        stateRef.current.showMeasurementTape
      );
      compareScene.add(compareRig.root);
    };

    // Raycasting for 3D joint selection AND AR Floor Placement
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let isDraggingArFloor = false;
    let lastHoverTime = 0;

    // Two-finger pinch-to-scale support on mobile AR
    const activeTouchPoints = new Map<number, { x: number; y: number }>();
    let initialPinchDistance = 0;
    let initialPinchScale = 1.0;

    const findJointFromObject = (obj: THREE.Object3D | null): JointId | null => {
      let curr: THREE.Object3D | null = obj;
      while (curr) {
        if (curr.userData && curr.userData.jointId) {
          return curr.userData.jointId as JointId;
        }
        curr = curr.parent;
      }
      return null;
    };

    const setPointerForActiveViewport = (
      clientX: number,
      clientY: number,
      rect: DOMRect
    ) => {
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      if (stateRef.current.isSplitCompareMode && !stateRef.current.isArMode) {
        const halfW = Math.max(1, w / 2);
        const localX = relX <= halfW ? relX : relX - halfW;
        pointer.x = (localX / halfW) * 2 - 1;
      } else {
        pointer.x = (relX / w) * 2 - 1;
      }
      pointer.y = -(relY / h) * 2 + 1;
    };

    const placeMannequinAtClientXY = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster.ray.intersectPlane(_arFloorPlane, _arHitPoint);
      if (hit) {
        const clampedX = THREE.MathUtils.clamp(hit.x, -1.65, 1.65);
        const clampedZ = THREE.MathUtils.clamp(hit.z, -2.2, 1.35);
        stateRef.current.arPositionXZ = { x: clampedX, z: clampedZ };
        setArPositionXZ({ x: clampedX, z: clampedZ });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activeTouchPoints.size === 2) {
        const pts = Array.from(activeTouchPoints.values());
        initialPinchDistance = Math.hypot(
          pts[0].x - pts[1].x,
          pts[0].y - pts[1].y
        );
        initialPinchScale = stateRef.current.arScale;
        isDraggingArFloor = false;
        return;
      }

      if (
        stateRef.current.isArMode &&
        stateRef.current.arInteractionMode === 'place' &&
        activeTouchPoints.size === 1
      ) {
        isDraggingArFloor = true;
        controls.enabled = false;
        placeMannequinAtClientXY(e.clientX, e.clientY);
      } else {
        controls.enabled = true;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      activeTouchPoints.delete(e.pointerId);
      if (isDraggingArFloor) {
        isDraggingArFloor = false;
        controls.enabled = !(
          stateRef.current.isArMode &&
          stateRef.current.arInteractionMode === 'place'
        );
        return;
      }

      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      setPointerForActiveViewport(e.clientX, e.clientY, rect);

      raycaster.setFromCamera(pointer, camera);

      if (
        stateRef.current.isArMode &&
        stateRef.current.arInteractionMode === 'place'
      ) {
        placeMannequinAtClientXY(e.clientX, e.clientY);
        return;
      }

      const hits = raycaster.intersectObjects(rig.root.children, true);
      for (const hit of hits) {
        const jId = findJointFromObject(hit.object);
        if (jId) {
          onSelectJoint(jId);
          return;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (activeTouchPoints.has(e.pointerId)) {
        activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Two-finger pinch scaling in AR mode
      if (stateRef.current.isArMode && activeTouchPoints.size === 2) {
        const pts = Array.from(activeTouchPoints.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (initialPinchDistance > 15) {
          const nextScale = THREE.MathUtils.clamp(
            Number(
              (initialPinchScale * (dist / initialPinchDistance)).toFixed(2)
            ),
            0.5,
            1.75
          );
          stateRef.current.arScale = nextScale;
          setArScale(nextScale);
        }
        return;
      }

      if (
        isDraggingArFloor &&
        stateRef.current.isArMode &&
        stateRef.current.arInteractionMode === 'place'
      ) {
        placeMannequinAtClientXY(e.clientX, e.clientY);
        return;
      }

      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      if (
        stateRef.current.isArMode &&
        stateRef.current.arInteractionMode === 'place'
      ) {
        setHoveredJoint(null);
        renderer.domElement.style.cursor = 'crosshair';
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      setPointerForActiveViewport(e.clientX, e.clientY, rect);

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(rig.root.children, true);
      let found: JointId | null = null;
      for (const hit of hits) {
        const jId = findJointFromObject(hit.object);
        if (jId) {
          found = jId;
          break;
        }
      }
      setHoveredJoint(found);
      renderer.domElement.style.cursor = found ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    const handleResize = () => {
      if (!container || isContextLost) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      const isSplit =
        stateRef.current.isSplitCompareMode && !stateRef.current.isArMode;
      const aspect = (isSplit ? Math.max(1, w / 2) : w) / h;
      camera.aspect = aspect;

      // On portrait mobile/tablet screens: automatically frame mannequin from head to toe
      if (aspect < 0.85 && stateRef.current.cameraPreset === 'full_front' && !stateRef.current.isCameraTransitioning) {
        const requiredZ = Math.min(
          3.85,
          Math.max(2.95, 1.88 / (2 * Math.tan((camera.fov * Math.PI) / 360) * aspect))
        );
        camera.position.z = requiredZ;
        camera.position.y = 0.90;
        controls.target.set(0, 0.87, 0);
      }

      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const viewportResizeObserver = new ResizeObserver(handleResize);
    viewportResizeObserver.observe(container);

    const clock = new THREE.Clock();

    function tick() {
      if (isContextLost) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const st = stateRef.current;

      // Switch between transparent AR overlay and Paper-White Studio background seamlessly
      if (st.isArMode) {
        if (scene.background !== null) {
          scene.background = null;
          scene.fog = null;
        }
        renderer.setClearColor(0x000000, 0);
        controls.enabled = st.arInteractionMode === 'orbit';
        arReticleGroup.visible = st.showArReticle;
        contactShadowMat.opacity = 0.62;
        outerRingMat.opacity =
          0.65 + 0.25 * Math.sin(clock.elapsedTime * 3.2);

        // Apply real-world camera or uploaded room photo ambient light estimation to 3D mannequin
        hemiLight.color.copy(st.arAmbientColor);
        hemiLight.intensity = st.arAmbientIntensity;
        keyLight.color.copy(st.arAmbientColor);
        keyLight.intensity = st.arAmbientIntensity * 1.05;
        fillLight.intensity = 0.85;
      } else {
        if (scene.background === null) {
          scene.background = _studioBgColor;
          scene.fog = _studioFog;
        }
        controls.enabled = true;
        arReticleGroup.visible = false;
        contactShadowMat.opacity = 0.45;
        hemiLight.color.setHex(0xffffff);
        hemiLight.intensity = 1.45;

        if (st.lightingPreset === 'warm_editorial') {
          keyLight.color.setHex(0xfff3e0);
          keyLight.intensity = 1.65;
          fillLight.color.setHex(0xfef3c7);
        } else if (st.lightingPreset === 'high_contrast') {
          keyLight.color.setHex(0xffffff);
          keyLight.intensity = 1.95;
          fillLight.intensity = 0.45;
        } else {
          keyLight.color.setHex(0xfffdf9);
          keyLight.intensity = 1.45;
          fillLight.color.setHex(0xf8fafc);
          fillLight.intensity = 0.9;
        }
      }

      const preset = st.posePreset;
      const baseRot = st.jointRotations;

      (Object.keys(rig.joints) as JointId[]).forEach((jId) => {
        const jointGrp = rig.joints[jId];
        const userDeg = baseRot[jId] || { x: 0, y: 0, z: 0 };

        const targetRadX = THREE.MathUtils.degToRad(userDeg.x);
        const targetRadY = THREE.MathUtils.degToRad(userDeg.y);
        const targetRadZ = THREE.MathUtils.degToRad(userDeg.z);

        jointGrp.rotation.x = THREE.MathUtils.damp(
          jointGrp.rotation.x,
          targetRadX,
          10,
          dt
        );
        jointGrp.rotation.y = THREE.MathUtils.damp(
          jointGrp.rotation.y,
          targetRadY,
          10,
          dt
        );
        jointGrp.rotation.z = THREE.MathUtils.damp(
          jointGrp.rotation.z,
          targetRadZ,
          10,
          dt
        );
      });

      if (st.shouldSnapCamera) {
        st.shouldSnapCamera = false;
        rig.root.position.set(0, 0, 0);
        rig.root.rotation.set(0, 0, 0);
        rig.root.scale.setScalar(1);
        floorGroup.position.set(0, 0, 0);
        floorGroup.scale.setScalar(1);
        (Object.keys(rig.joints) as JointId[]).forEach((jId) => {
          const userDeg = baseRot[jId] || { x: 0, y: 0, z: 0 };
          rig.joints[jId].rotation.set(
            THREE.MathUtils.degToRad(userDeg.x),
            THREE.MathUtils.degToRad(userDeg.y),
            THREE.MathUtils.degToRad(userDeg.z)
          );
        });
        camera.position.copy(_targetCameraPos);
        controls.target.copy(_targetLookAt);
        controls.update();
        st.isCameraTransitioning = false;
      }

      // Position, Scale & Rotate Mannequin in AR Space vs Studio Space
      const targetPosX = st.isArMode ? st.arPositionXZ.x : 0;
      const targetPosZ = st.isArMode ? st.arPositionXZ.z : 0;
      const targetScale = st.isArMode ? st.arScale : 1.0;
      const targetRotY = st.isArMode
        ? THREE.MathUtils.degToRad(st.arRotationDeg)
        : 0;

      rig.root.position.x = THREE.MathUtils.damp(
        rig.root.position.x,
        targetPosX,
        12,
        dt
      );
      rig.root.position.z = THREE.MathUtils.damp(
        rig.root.position.z,
        targetPosZ,
        12,
        dt
      );
      const nextScale = THREE.MathUtils.damp(
        rig.root.scale.x,
        targetScale,
        10,
        dt
      );
      rig.root.scale.setScalar(nextScale);

      floorGroup.position.x = rig.root.position.x;
      floorGroup.position.z = rig.root.position.z;
      floorGroup.scale.setScalar(nextScale);

      if (st.isRecording360) {
        st.record360Elapsed += dt;
        const progress = Math.min(
          1.0,
          st.record360Elapsed / Math.max(1.0, st.record360Duration)
        );
        // Smooth cosine-eased 360° turntable rotation
        const smoothTurn =
          progress < 0.08
            ? (progress / 0.08) * 0.08
            : progress;
        rig.root.rotation.y =
          st.record360StartYaw + smoothTurn * Math.PI * 2;
        setRecording360Progress(Math.round(progress * 100));

        if (progress >= 1.0) {
          st.isRecording360 = false;
          rig.root.rotation.y = st.record360StartYaw;
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== 'inactive'
          ) {
            mediaRecorderRef.current.stop();
          }
        }
      } else if (preset === 'turn_360') {
        rig.root.rotation.y += dt * 0.75;
      } else {
        rig.root.rotation.y = THREE.MathUtils.damp(
          rig.root.rotation.y,
          targetRotY,
          8,
          dt
        );
      }

      rig.updateAnimation(dt, preset, st.weatherEffect);

      // Update 3D Wind Streamlines & 3D Rain Streaks + Floor Ripples
      const wMode = st.weatherEffect?.mode || 'clear';
      const hasWind = wMode === 'wind' || wMode === 'storm';
      const hasRain = wMode === 'rain' || wMode === 'storm';
      const wInt = hasWind ? (st.weatherEffect.windIntensity || 0) / 100 : 0;
      const rInt = hasRain ? (st.weatherEffect.rainIntensity || 0) / 100 : 0;
      const wRad = THREE.MathUtils.degToRad(
        st.weatherEffect?.windDirectionDeg || 0
      );
      const wDirX = Math.cos(wRad);
      const wDirZ = Math.sin(wRad);

      weatherGroup.position.copy(rig.root.position);
      weatherGroup.scale.copy(rig.root.scale);

      windStreamLines.visible = hasWind && wInt > 0.02;
      if (windStreamLines.visible) {
        windMat.opacity = 0.18 + wInt * 0.42;
        const posArr = windGeo.attributes.position.array as Float32Array;
        const speed = 1.4 + wInt * 3.2;
        for (let i = 0; i < WIND_COUNT; i++) {
          const phase =
            (windSeeds[i * 4 + 0] +
              clock.elapsedTime * speed * windSeeds[i * 4 + 3]) %
            2.6;
          const distAlong = phase - 1.3; // -1.3m to +1.3m along wind vector
          const yBase = windSeeds[i * 4 + 1];
          const lat = windSeeds[i * 4 + 2];
          const perpX = -wDirZ;
          const perpZ = wDirX;
          const waveY =
            Math.sin(clock.elapsedTime * 5.0 + i) * 0.035 * (0.4 + wInt);
          const streakLen = 0.16 + wInt * 0.34;

          const x0 = wDirX * distAlong + perpX * lat;
          const y0 = yBase + waveY;
          const z0 = wDirZ * distAlong + perpZ * lat;

          const x1 = x0 + wDirX * streakLen;
          const y1 = y0 + Math.cos(clock.elapsedTime * 4.2 + i) * 0.015;
          const z1 = z0 + wDirZ * streakLen;

          const idx6 = i * 6;
          posArr[idx6 + 0] = x0;
          posArr[idx6 + 1] = y0;
          posArr[idx6 + 2] = z0;
          posArr[idx6 + 3] = x1;
          posArr[idx6 + 4] = y1;
          posArr[idx6 + 5] = z1;
        }
        windGeo.attributes.position.needsUpdate = true;
      }

      rainDropLines.visible = hasRain && rInt > 0.02;
      rainRippleGroup.visible = hasRain && rInt > 0.02;
      if (rainDropLines.visible) {
        rainMat.opacity = 0.25 + rInt * 0.48;
        const rArr = rainGeo.attributes.position.array as Float32Array;
        const driftX = wDirX * wInt * 1.35;
        const driftZ = wDirZ * wInt * 1.35;
        const streakLen = 0.11 + rInt * 0.12;
        for (let i = 0; i < RAIN_COUNT; i++) {
          const fallSpeed = rainState[i * 4 + 3] * (0.65 + rInt * 0.85);
          let rx = rainState[i * 4 + 0] + driftX * dt;
          let ry = rainState[i * 4 + 1] - fallSpeed * dt;
          let rz = rainState[i * 4 + 2] + driftZ * dt;

          if (ry < 0.02) {
            ry = 2.45 + (i % 7) * 0.05;
            rx = (((i * 37) % 100) / 100 - 0.5) * 2.0 - driftX * 0.35;
            rz = (((i * 71) % 100) / 100 - 0.5) * 2.0 - driftZ * 0.35;
          }
          rainState[i * 4 + 0] = rx;
          rainState[i * 4 + 1] = ry;
          rainState[i * 4 + 2] = rz;

          const idx6 = i * 6;
          rArr[idx6 + 0] = rx;
          rArr[idx6 + 1] = ry;
          rArr[idx6 + 2] = rz;
          rArr[idx6 + 3] = rx - driftX * 0.055;
          rArr[idx6 + 4] = ry + streakLen;
          rArr[idx6 + 5] = rz - driftZ * 0.055;
        }
        rainGeo.attributes.position.needsUpdate = true;

        rippleMeshes.forEach((rMesh, idx) => {
          const cycle = (clock.elapsedTime * (1.8 + rInt) + idx * 0.37) % 1.0;
          const sc = 0.4 + cycle * 2.1;
          rMesh.scale.setScalar(sc);
          const mat = rMesh.material as THREE.MeshBasicMaterial;
          mat.opacity = (1.0 - cycle) * (0.22 + rInt * 0.38);
        });
      }

      if (st.isCameraTransitioning) {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _targetCameraPos.x,
          6,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _targetCameraPos.y,
          6,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _targetCameraPos.z,
          6,
          dt
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _targetLookAt.x,
          6,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _targetLookAt.y,
          6,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _targetLookAt.z,
          6,
          dt
        );
        if (camera.position.distanceTo(_targetCameraPos) < 0.015) {
          st.isCameraTransitioning = false;
        }
      }

      controls.update();

      const fullW = Math.max(1, container?.clientWidth || 1);
      const fullH = Math.max(1, container?.clientHeight || 1);

      if (st.isSplitCompareMode && !st.isArMode) {
        ensureCompareSceneAndRig();
        if (
          compareScene &&
          compareRig &&
          compareHemiLight &&
          compareKeyLight &&
          compareFillLight &&
          compareFloorGroup
        ) {
          compareHemiLight.color.copy(hemiLight.color);
          compareHemiLight.intensity = hemiLight.intensity;
          compareKeyLight.color.copy(keyLight.color);
          compareKeyLight.intensity = keyLight.intensity;
          compareFillLight.color.copy(fillLight.color);
          compareFillLight.intensity = fillLight.intensity;

          compareRig.root.position.copy(rig.root.position);
          compareRig.root.rotation.copy(rig.root.rotation);
          compareRig.root.scale.copy(rig.root.scale);
          compareFloorGroup.position.copy(floorGroup.position);
          compareFloorGroup.scale.copy(floorGroup.scale);

          (Object.keys(rig.joints) as JointId[]).forEach((jId) => {
            compareRig!.joints[jId].rotation.copy(rig.joints[jId].rotation);
          });
          compareRig.updateAnimation(dt, preset, st.weatherEffect);

          const halfW = Math.max(1, Math.floor(fullW / 2));
          const rightW = Math.max(1, fullW - halfW);
          const targetAspect = halfW / fullH;
          if (Math.abs(camera.aspect - targetAspect) > 0.002) {
            camera.aspect = targetAspect;
            camera.updateProjectionMatrix();
          }

          renderer.setScissorTest(true);

          // Left Pane (Slot A)
          renderer.setViewport(0, 0, halfW, fullH);
          renderer.setScissor(0, 0, halfW, fullH);
          renderer.render(scene, camera);

          // Right Pane (Slot B)
          renderer.setViewport(halfW, 0, rightW, fullH);
          renderer.setScissor(halfW, 0, rightW, fullH);
          renderer.render(compareScene, camera);
        }
      } else {
        const targetAspect = fullW / fullH;
        if (Math.abs(camera.aspect - targetAspect) > 0.002) {
          camera.aspect = targetAspect;
          camera.updateProjectionMatrix();
        }
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, fullW, fullH);
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        frameId = window.setTimeout(tick, 65);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      isContextLost = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      viewportResizeObserver.disconnect();
      controls.removeEventListener('start', cancelTransitionOnUserStart);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored
      );
      controls.dispose();
      contactShadowTex.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
      tickGeo.dispose();
      windGeo.dispose();
      windMat.dispose();
      rainGeo.dispose();
      rainMat.dispose();
      rippleRingGeo.dispose();
      if (envMapTexture) envMapTexture.dispose();
      if (pmremGenerator) pmremGenerator.dispose();
      disposeCachedTextures();
      renderer.dispose();
    };
  }, [retryCount]);

  const hoveredJointLabel = hoveredJoint
    ? JOINT_METADATA.find((j) => j.id === hoveredJoint)?.label
    : null;

  const skinColorHex =
    MANNEQUIN_SURFACES.find((s) => s.id === body.surfaceId)?.colorHex ||
    '#EEC7B0';
  const isMale = body.genderProfile === 'male';
  const hasTop = !outfit.hideAllGarments && outfit.top.styleId !== 'none';
  const hasDress =
    !isMale &&
    !outfit.hideAllGarments &&
    Boolean(outfit.dress && outfit.dress.styleId !== 'none');
  const hasOuter =
    !outfit.hideAllGarments && outfit.outerwear.styleId !== 'none';
  const hasBottom = !outfit.hideAllGarments && outfit.bottom.styleId !== 'none';
  const hasShoes =
    !outfit.hideAllGarments && outfit.footwear.styleId !== 'none';
  const isSleeveless =
    outfit.top.styleId === 'silk_camisole' ||
    outfit.top.styleId === 'corset_top' ||
    outfit.top.styleId === 'halter_crop' ||
    outfit.top.styleId === 'fitted_tank';
  const isSkirt =
    outfit.bottom.styleId === 'aline_skirt' ||
    outfit.bottom.styleId === 'pleated_maxi_skirt' ||
    outfit.bottom.styleId === 'pencil_skirt';
  const isShorts =
    outfit.bottom.styleId === 'female_denim_shorts' ||
    outfit.bottom.styleId === 'tailored_shorts';

  const baseShoulder = isMale ? 45 : 38;
  const baseChest = isMale ? 98 : 84;
  const baseWaist = isMale ? 78 : 62;
  const baseHip = isMale ? 96 : 90;
  const baseWeight = isMale ? 72 : 52;
  const weightDelta = (body.weightKg - baseWeight) * 0.18;
  const shHalf = Math.min(
    74,
    Math.max(
      36,
      (isMale ? 56 : 48) +
        (body.shoulderCm - baseShoulder) * 0.85 +
        weightDelta * 0.25
    )
  );
  const chHalf = Math.min(
    68,
    Math.max(
      30,
      (isMale ? 48 : 42) +
        (body.chestCm - baseChest) * 0.48 +
        weightDelta * 0.45
    )
  );
  const waHalf = Math.min(
    66,
    Math.max(
      24,
      (isMale ? 42 : 33) +
        (body.waistCm - baseWaist) * 0.55 +
        weightDelta * 0.65
    )
  );
  const hiHalf = Math.min(
    72,
    Math.max(
      32,
      (isMale ? 46 : 45) +
        (body.hipCm - baseHip) * 0.52 +
        weightDelta * 0.55
    )
  );
  const legThick = Math.min(
    14,
    Math.max(-5, (hiHalf - (isMale ? 46 : 45)) * 0.38)
  );
  const armThick = Math.min(
    10,
    Math.max(
      -3,
      weightDelta * 0.36 + (chHalf - (isMale ? 48 : 42)) * 0.22
    )
  );

  // Memoize fit analysis & weather reports so continuous joint/body slider drags do not recalculate on every tick
  const fitAnalysisA = useMemo(
    () => analyzeBodyAndGarmentFit(body, outfit),
    [body, outfit]
  );
  const fitAnalysisB = useMemo(
    () =>
      isSplitCompareMode
        ? analyzeBodyAndGarmentFit(body, effectiveOutfitB)
        : fitAnalysisA,
    [isSplitCompareMode, body, effectiveOutfitB, fitAnalysisA]
  );
  const scoreA = fitAnalysisA.outfitScore;
  const scoreB = fitAnalysisB.outfitScore;
  const totalScoreDiff = scoreB.totalScore - scoreA.totalScore;
  const fitScoreDiff = scoreB.fitScore - scoreA.fitScore;

  const topWeatherReport = useMemo(
    () => analyzeFabricUnderWeather(outfit.top.fabric, weatherEffect),
    [outfit.top.fabric, weatherEffect]
  );
  const bottomWeatherReport = useMemo(
    () => analyzeFabricUnderWeather(outfit.bottom.fabric, weatherEffect),
    [outfit.bottom.fabric, weatherEffect]
  );
  const outerWeatherReport = useMemo(
    () =>
      outfit.outerwear.styleId !== 'none'
        ? analyzeFabricUnderWeather(outfit.outerwear.fabric, weatherEffect)
        : null,
    [outfit.outerwear.styleId, outfit.outerwear.fabric, weatherEffect]
  );

  const genderPresets = useMemo(
    () =>
      SUGGESTED_OUTFIT_PRESETS.filter(
        (p) => p.genderHint === body.genderProfile
      ),
    [body.genderProfile]
  );

  const [showSplitFitDetails, setShowSplitFitDetails] = useState(false);

  const handleSwapSplitOutfits = useCallback(() => {
    if (!onUpdateOutfitA || !onUpdateCompareOutfitB) return;
    const tempA = outfit;
    onUpdateOutfitA(effectiveOutfitB);
    onUpdateCompareOutfitB(tempA);
  }, [onUpdateOutfitA, onUpdateCompareOutfitB, outfit, effectiveOutfitB]);

  const handleSelectWeatherMode = useCallback(
    (mode: WeatherMode) => {
      if (!onUpdateWeatherEffect) return;
      onUpdateWeatherEffect({
        ...weatherEffect,
        mode,
        windIntensity:
          mode === 'wind' && weatherEffect.windIntensity < 20
            ? 60
            : mode === 'storm' && weatherEffect.windIntensity < 55
            ? 78
            : weatherEffect.windIntensity,
        rainIntensity:
          mode === 'rain' && weatherEffect.rainIntensity < 20
            ? 65
            : mode === 'storm' && weatherEffect.rainIntensity < 55
            ? 80
            : weatherEffect.rainIntensity,
      });
    },
    [onUpdateWeatherEffect, weatherEffect]
  );

  const handleExportGlb = useCallback(
    () => handleExport3DModel('glb'),
    [handleExport3DModel]
  );
  const handleExportUsdz = useCallback(
    () => handleExport3DModel('usdz'),
    [handleExport3DModel]
  );
  const handleArScaleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setArScale(Number(e.target.value)),
    []
  );
  const handleArRotationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setArRotationDeg(Number(e.target.value)),
    []
  );

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden ${
        isArMode ? 'bg-slate-950' : 'bg-[#FAF9F6]'
      }`}
    >
      {/* Hidden input for custom room backdrop photo in AR mode */}
      <input
        ref={roomUploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleRoomPhotoUpload}
        className="hidden"
      />
      {/* Native Mobile Camera Hardware Capture Input (works 100% on iOS/Android even in restricted webviews/iframes) */}
      <input
        ref={mobileCameraCaptureInputRef}
        type="file"
        accept="image/*"
        capture={arCameraFacing === 'user' ? 'user' : 'environment'}
        onChange={handleRoomPhotoUpload}
        className="hidden"
      />

      {/* Layer 0: Uploaded Room Photo, Live Camera Stream, or Realistic AR Room Backdrop */}
      {isArMode && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              arCameraStatus === 'active' && !isShowingUploadedRoomPhoto
                ? 'opacity-100'
                : 'opacity-0'
            } ${arCameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {isShowingUploadedRoomPhoto && customRoomPhotoUrl && (
            <img
              ref={uploadedRoomImgRef}
              src={customRoomPhotoUrl}
              alt="Ảnh không gian phòng thực tế AR"
              className="absolute inset-0 w-full h-full object-cover select-none"
            />
          )}

          {!isShowingUploadedRoomPhoto && arCameraStatus !== 'active' && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                background:
                  'linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 62%, #94A3B8 62.5%, #64748B 100%)',
              }}
            >
              <div
                className="absolute inset-x-0 bottom-0 h-[38%] opacity-35"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)',
                  backgroundSize: '48px 32px',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Camera Snapshot Flash Effect */}
      {arCaptureFlash && (
        <div className="pointer-events-none absolute inset-0 z-30 bg-white/80 transition-opacity duration-200" />
      )}

      {/* Layer 1: Interactive Three.js 3D Canvas */}
      <div ref={canvasMountRef} className="relative z-[1] w-full h-full" />

      {/* Split-Screen Center Divider Line & Non-Occluding Top-Edge Pane Headers (Khung A Left / Khung B Right) */}
      {isSplitCompareMode && !isArMode && (
        <>
          {/* Thin Subtle Vertical Viewport Divider Line Only */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 z-10 w-[1.5px] bg-gradient-to-b from-slate-300/40 via-indigo-400/60 to-slate-300/40" />

          {/* LEFT PANE HEADER: KHUNG A (Anchored Top-Left of Pane A — Never Covers Character A) */}
          <div className="absolute top-14 left-3 w-[min(330px,calc(50vw-16px))] z-20 bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-xl p-2 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-900 text-white shrink-0">
                  KHUNG A
                </span>
                <span className="text-[11px] font-bold text-slate-900 truncate">
                  Nhân vật Trái
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-[10px] font-bold">
                  <Award className="w-3 h-3 text-emerald-600" />
                  <span>
                    {scoreA.totalScore}đ ({scoreA.grade})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSplitFitDetails((prev) => !prev)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Ẩn/Hiện bảng thông số độ dư (Ease)"
                >
                  {showSplitFitDetails ? 'Ẩn số đo' : 'Số đo'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <select
                value={activeHistoryIdA || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('preset_')) {
                    const pr = genderPresets.find(
                      (p) => `preset_${p.id}` === val
                    );
                    if (pr && onUpdateOutfitA) {
                      onUpdateOutfitA({
                        ...pr.outfit,
                        selectedSize: outfit.selectedSize,
                        hideAllGarments: false,
                      });
                    }
                    return;
                  }
                  const found = outfitHistory.find((h) => h.id === val);
                  if (found && onSelectCompareHistoryA) {
                    onSelectCompareHistoryA(found);
                  }
                }}
                className="flex-1 min-w-0 px-1.5 py-1 text-[10px] font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-slate-900"
              >
                <option value="">-- Đổi bộ đồ Khung A --</option>
                {outfitHistory.length > 0 && (
                  <optgroup label="Lịch sử phối đồ đã lưu">
                    {outfitHistory.map((h, i) => (
                      <option key={h.id} value={h.id}>
                        #{outfitHistory.length - i} · {h.label} (Size{' '}
                        {h.outfit.selectedSize} · {h.score.totalScore}đ)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Bộ phối mẫu Studio">
                  {genderPresets.map((p) => (
                    <option key={p.id} value={`preset_${p.id}`}>
                      Mẫu: {p.name} ({p.tag})
                    </option>
                  ))}
                </optgroup>
              </select>

              {onUpdateOutfitA && (
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md shrink-0">
                  {(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() =>
                        onUpdateOutfitA({ ...outfit, selectedSize: sz })
                      }
                      className={`px-1 py-0.5 text-[9px] font-mono font-bold rounded transition-colors cursor-pointer ${
                        outfit.selectedSize === sz
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showSplitFitDetails && (
              <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                {fitAnalysisA.zones.map((z) => (
                  <div
                    key={z.zone}
                    className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/70"
                  >
                    <span className="text-slate-600 font-medium truncate">
                      {z.zone}:
                    </span>
                    <span
                      className={`font-mono font-semibold ${
                        z.status === 'tight'
                          ? 'text-rose-700'
                          : z.status === 'optimal'
                          ? 'text-emerald-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {z.diffCm >= 0 ? `+${z.diffCm}` : z.diffCm}cm
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANE HEADER: KHUNG B (Anchored Top-Right of Pane B — Never Covers Character B) */}
          <div className="absolute top-14 right-3 w-[min(350px,calc(50vw-16px))] z-20 bg-white/92 backdrop-blur-md border border-indigo-200 rounded-xl p-2 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-600 text-white shrink-0">
                  KHUNG B
                </span>
                <span className="text-[11px] font-bold text-slate-900 truncate">
                  Nhân vật Phải
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-950 font-mono text-[10px] font-bold">
                  <Award className="w-3 h-3 text-indigo-600" />
                  <span>
                    {scoreB.totalScore}đ ({scoreB.grade})
                  </span>
                </div>
                {totalScoreDiff !== 0 && (
                  <span
                    className={`px-1 py-0.5 text-[9px] font-mono font-bold rounded ${
                      totalScoreDiff > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {totalScoreDiff > 0
                      ? `+${totalScoreDiff}đ`
                      : `${totalScoreDiff}đ`}
                  </span>
                )}
                {onUpdateOutfitA && onUpdateCompareOutfitB && (
                  <button
                    type="button"
                    onClick={handleSwapSplitOutfits}
                    title="Đảo vị trí cấu hình Trái (A) và Phải (B)"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    <ArrowLeftRight className="w-2.5 h-2.5" />
                    <span>Đảo</span>
                  </button>
                )}
                {onToggleSplitCompareMode && (
                  <button
                    type="button"
                    onClick={onToggleSplitCompareMode}
                    title="Đóng chế độ So sánh"
                    className="p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <select
                value={activeHistoryIdB || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('preset_')) {
                    const pr = genderPresets.find(
                      (p) => `preset_${p.id}` === val
                    );
                    if (pr && onUpdateCompareOutfitB) {
                      onUpdateCompareOutfitB({
                        ...pr.outfit,
                        selectedSize: effectiveOutfitB.selectedSize,
                        hideAllGarments: false,
                      });
                    }
                    return;
                  }
                  const found = outfitHistory.find((h) => h.id === val);
                  if (found && onSelectCompareHistoryB) {
                    onSelectCompareHistoryB(found);
                  }
                }}
                className="flex-1 min-w-0 px-1.5 py-1 text-[10px] font-medium bg-indigo-50/50 border border-indigo-200 rounded-md text-slate-800 focus:outline-none focus:border-indigo-600"
              >
                <option value="">-- Đổi bộ đồ Khung B --</option>
                {outfitHistory.length > 0 && (
                  <optgroup label="Lịch sử phối đồ đã lưu">
                    {outfitHistory.map((h, i) => (
                      <option key={h.id} value={h.id}>
                        #{outfitHistory.length - i} · {h.label} (Size{' '}
                        {h.outfit.selectedSize} · {h.score.totalScore}đ)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Bộ phối mẫu Studio">
                  {genderPresets.map((p) => (
                    <option key={p.id} value={`preset_${p.id}`}>
                      Mẫu: {p.name} ({p.tag})
                    </option>
                  ))}
                </optgroup>
              </select>

              {onUpdateCompareOutfitB && (
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md shrink-0">
                  {(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() =>
                        onUpdateCompareOutfitB({
                          ...effectiveOutfitB,
                          selectedSize: sz,
                        })
                      }
                      className={`px-1 py-0.5 text-[9px] font-mono font-bold rounded transition-colors cursor-pointer ${
                        effectiveOutfitB.selectedSize === sz
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showSplitFitDetails && (
              <>
                <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                  {fitAnalysisB.zones.map((z, idx) => {
                    const zoneA = fitAnalysisA.zones[idx];
                    const easeDiff = zoneA
                      ? Number((z.diffCm - zoneA.diffCm).toFixed(1))
                      : 0;
                    return (
                      <div
                        key={z.zone}
                        className="flex items-center justify-between px-1.5 py-0.5 rounded bg-indigo-50/40 border border-indigo-100"
                      >
                        <span className="text-slate-600 font-medium truncate">
                          {z.zone}:
                        </span>
                        <span
                          className={`font-mono font-semibold ${
                            z.status === 'tight'
                              ? 'text-rose-700'
                              : z.status === 'optimal'
                              ? 'text-emerald-700'
                              : 'text-blue-700'
                          }`}
                        >
                          {z.diffCm >= 0 ? `+${z.diffCm}` : z.diffCm}cm
                          {easeDiff !== 0 && (
                            <span className="text-[9px] text-slate-400 ml-0.5">
                              ({easeDiff > 0 ? `+${easeDiff}` : easeDiff})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {fitScoreDiff !== 0 && (
                  <div className="text-[10px] text-slate-600 flex items-center justify-between pt-0.5">
                    <span>Độ vừa vặn so với Khung A:</span>
                    <span
                      className={`font-mono font-bold ${
                        fitScoreDiff > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {scoreB.fitScore}% (
                      {fitScoreDiff > 0 ? `+${fitScoreDiff}%` : `${fitScoreDiff}%`})
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Memoized Right-Corner Quick Action Dock */}
      {!isSplitCompareMode && (
        <ViewportQuickActionsDock
          onRandomShuffleOutfit={onRandomShuffleOutfit}
          onResetToTPose={onResetToTPose}
          isSplitCompareMode={isSplitCompareMode}
          onToggleSplitCompareMode={onToggleSplitCompareMode}
          isArMode={isArMode}
          onToggleArMode={onToggleArMode}
          weatherMode={weatherEffect.mode}
          hasWeatherCallback={Boolean(onUpdateWeatherEffect)}
          onSelectWeatherMode={handleSelectWeatherMode}
          isRecording360={isRecording360}
          recording360Progress={recording360Progress}
          onStartVideoWalkthrough={handleStartVideoWalkthrough}
          isExportingModel={isExportingModel}
          onExportGlb={handleExportGlb}
          onExportUsdz={handleExportUsdz}
        />
      )}

      {/* Live 360° Recording Progress Banner (Anchored Top-Right Corner) */}
      {isRecording360 && (
        <div className="pointer-events-none absolute top-24 right-3 z-30 flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/95 text-white border border-rose-500/40 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-semibold">
            Đang quay Video Walkthrough 360° ({recording360Progress}%) — Giữ nguyên khung hình...
          </span>
        </div>
      )}

      {/* Export Status Toast Banner (Anchored Top-Right Corner) */}
      {exportStatusToast && (
        <div className="pointer-events-none absolute top-24 right-3 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/95 text-white border border-emerald-400/40 shadow-lg text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{exportStatusToast}</span>
        </div>
      )}

      {/* 360° Video Walkthrough Preview & Download Modal (Anchored Fixed to Top-Right Corner) */}
      {recordedVideoUrl && (
        <div className="absolute top-20 right-3 z-40 flex items-start justify-end pointer-events-none">
          <div className="pointer-events-auto w-[min(390px,92vw)] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-rose-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Video Walkthrough 360° Hoàn Tất
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    Góc nhìn toàn diện 360° trang phục, tư thế &amp; độ rủ chất liệu vải
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(recordedVideoUrl);
                  setRecordedVideoUrl(null);
                }}
                className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-[#FAF9F6] aspect-video w-full flex items-center justify-center overflow-hidden border-b border-slate-200">
              <video
                src={recordedVideoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-3.5 bg-white flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-600">
                Định dạng: <span className="font-mono font-bold uppercase text-slate-900">.{recordedVideoExt} (30 FPS · 360° Turntable)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartVideoWalkthrough}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Quay lại</span>
                </button>
                <a
                  href={recordedVideoUrl}
                  download={`smart-wardrobe-360-walkthrough-${Date.now()}.${recordedVideoExt}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Video 360°</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Environmental Weather & Fabric Drape/Thickness Telemetry Card (Docked Right Corner) */}
      {weatherEffect.mode !== 'clear' && !isSplitCompareMode && (
        <div className="absolute top-24 right-3 w-[min(320px,90vw)] z-20 bg-white/95 backdrop-blur-md border border-sky-200 rounded-xl p-3 shadow-md space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              {weatherEffect.mode === 'wind' ? (
                <Wind className="w-3.5 h-3.5 text-sky-600" />
              ) : weatherEffect.mode === 'rain' ? (
                <CloudRain className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <CloudLightning className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>
                Hiệu ứng Môi trường:{' '}
                {weatherEffect.mode === 'wind'
                  ? 'Gió thổi (Drape Test)'
                  : weatherEffect.mode === 'rain'
                  ? 'Mưa ướt (Wet Cling Test)'
                  : 'Mưa bão (Gió + Mưa)'}
              </span>
            </div>
            {onUpdateWeatherEffect && (
              <button
                type="button"
                onClick={() => handleSelectWeatherMode('clear')}
                className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                Tắt
              </button>
            )}
          </div>

          {/* Sliders for Wind & Rain */}
          {onUpdateWeatherEffect && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[10px]">
              {(weatherEffect.mode === 'wind' ||
                weatherEffect.mode === 'storm') && (
                <>
                  <div>
                    <div className="flex justify-between text-slate-600 mb-0.5">
                      <span>Sức gió:</span>
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
                        onUpdateWeatherEffect({
                          ...weatherEffect,
                          windIntensity: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-600 cursor-pointer h-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-600 mb-0.5">
                      <span>Hướng gió:</span>
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
                      className="w-full accent-sky-600 cursor-pointer h-1"
                    />
                  </div>
                </>
              )}
              {(weatherEffect.mode === 'rain' ||
                weatherEffect.mode === 'storm') && (
                <div className="col-span-2">
                  <div className="flex justify-between text-slate-600 mb-0.5">
                    <span>Lượng mưa &amp; Độ thấm ướt vải:</span>
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
                      onUpdateWeatherEffect({
                        ...weatherEffect,
                        rainIntensity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-600 cursor-pointer h-1"
                  />
                </div>
              )}
            </div>
          )}

          {/* Real-Time Fabric Drape & Thickness Breakdown */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 text-[10px]">
            <div className="flex items-center gap-1 font-semibold text-slate-700">
              <Layers className="w-3 h-3 text-sky-600" />
              <span>Phản ứng Độ rủ (Drape) &amp; Độ dày vải (GSM):</span>
            </div>

            {[
              { slot: 'Áo trong', rep: topWeatherReport },
              ...(outerWeatherReport
                ? [{ slot: 'Áo khoác', rep: outerWeatherReport }]
                : []),
              { slot: 'Quần/Váy', rep: bottomWeatherReport },
            ].map((item) => (
              <div
                key={item.slot}
                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5"
              >
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>
                    {item.slot}: {item.rep.fabricName}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">
                    {item.rep.weightGsm} GSM · Độ rủ {item.rep.drapeScore}/100
                  </span>
                </div>
                <div className="text-slate-600 leading-tight">
                  {weatherEffect.mode === 'rain'
                    ? item.rep.rainBehaviorText
                    : weatherEffect.mode === 'wind'
                    ? item.rep.windBehaviorText
                    : `${item.rep.windBehaviorText} · ${item.rep.rainBehaviorText}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Pose AI Generator Status Badge (Anchored Top-Right Corner) */}
      {lastAiPoseResult && !isSplitCompareMode && !isArMode && (
        <div className="pointer-events-none absolute top-20 right-3 z-20 max-w-xs bg-slate-900/90 backdrop-blur-md text-white border border-white/15 rounded-xl px-3 py-2 shadow-md">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Pose AI: {lastAiPoseResult.poseTitle}</span>
          </div>
          <p className="text-[10px] text-slate-300 leading-snug mt-0.5">
            {lastAiPoseResult.explanation}
          </p>
        </div>
      )}

      {/* AR Mode Interactive HUD Overlay (Docked to Right Corner so Mannequin stays unobstructed) */}
      {isArMode && (
        <>
          {/* Right-Corner AR Instructions & Room Photo / Camera Status Banner */}
          <div className="absolute top-24 right-3 w-[min(380px,94vw)] z-20 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md text-white border border-white/15 rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Không gian thực AR (Camera / Ảnh phòng)</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {isShowingUploadedRoomPhoto
                  ? 'ẢNH PHÒNG CỦA BẠN'
                  : arCameraStatus === 'active'
                  ? 'LIVE CAMERA'
                  : arCameraStatus === 'starting'
                  ? 'ĐANG MỞ CAM...'
                  : 'PHÒNG AR MẪU'}
              </span>
            </div>

            <p className="text-[11px] text-slate-200 leading-snug">
              {arInteractionMode === 'place'
                ? 'Chạm hoặc kéo trực tiếp trên sàn để đặt người mẫu 3D vào đúng vị trí trong ảnh phòng / camera. Kéo thanh trượt bên dưới để chỉnh kích thước & hướng đứng.'
                : 'Chế độ Xoay góc & Chỉnh khớp: Kéo để xoay góc nhìn 3D hoặc nhấp vào khớp cơ thể để tạo dáng.'}
            </p>

            {/* Always-visible Mobile Camera & Room Photo Controls */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setArBackdropSource('camera');
                  setArCameraRetryTrigger((c) => c + 1);
                  const vid = videoRef.current;
                  if (vid && vid.srcObject) {
                    vid.play().catch(() => {});
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shrink-0 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>
                  {arCameraStatus === 'active'
                    ? 'Làm mới Camera Live'
                    : 'Bật Camera Live'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => mobileCameraCaptureInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shrink-0 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Mở Cam Điện Thoại (Chụp AR)</span>
              </button>

              <button
                type="button"
                onClick={() => roomUploadInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500/30 hover:bg-blue-500/45 text-blue-100 border border-blue-400/40 font-semibold shrink-0 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-300" />
                <span>
                  {customRoomPhotoUrl ? 'Đổi ảnh phòng' : 'Tải ảnh phòng'}
                </span>
              </button>

              {customRoomPhotoUrl && arCameraStatus === 'active' && (
                <button
                  type="button"
                  onClick={() =>
                    setArBackdropSource((prev) =>
                      prev === 'photo' ? 'camera' : 'photo'
                    )
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white font-medium shrink-0 cursor-pointer"
                >
                  <Camera className="w-3 h-3 text-emerald-300" />
                  <span>
                    {arBackdropSource === 'photo'
                      ? 'Dùng Camera Live'
                      : 'Dùng Ảnh Phòng'}
                  </span>
                </button>
              )}
            </div>

            {arCameraErrorMsg && !isShowingUploadedRoomPhoto && (
              <div className="pt-1 border-t border-white/10 text-[10px] text-amber-300 leading-tight">
                {arCameraErrorMsg}
              </div>
            )}
          </div>

          {/* Floating AR Spatial Placement & Camera Controls Card (Docked Right) */}
          <div className="absolute bottom-14 right-3 z-20 w-[94%] max-w-xl bg-slate-900/90 backdrop-blur-md text-white border border-white/15 rounded-2xl p-3 shadow-xl space-y-2.5">
            {/* Row 1: Mode Switcher + Camera Actions */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setArInteractionMode('place')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    arInteractionMode === 'place'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Move className="w-3 h-3" />
                  <span>Chạm sàn đặt vị trí</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArInteractionMode('orbit')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    arInteractionMode === 'orbit'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Xoay góc &amp; Chỉnh khớp</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setArBackdropSource('camera');
                    setArCameraFacing((prev) =>
                      prev === 'environment' ? 'user' : 'environment'
                    );
                  }}
                  title="Đổi Camera Trước / Sau"
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 cursor-pointer"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {arCameraFacing === 'environment' ? 'Cam Sau' : 'Cam Trước'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => mobileCameraCaptureInputRef.current?.click()}
                  title="Mở trực tiếp ứng dụng Camera của điện thoại để chụp không gian thực AR"
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cam Điện Thoại</span>
                </button>

                <button
                  type="button"
                  onClick={() => roomUploadInputRef.current?.click()}
                  title="Tải ảnh không gian phòng thật của bạn để đặt người mẫu vào trong ảnh"
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer ${
                    isShowingUploadedRoomPhoto
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-300" />
                  <span>Tải ảnh phòng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowArReticle((prev) => !prev)}
                  title="Ẩn/Hiện vòng tâm định vị sàn AR"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 cursor-pointer"
                >
                  {showArReticle ? (
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetArPlacement}
                  title="Đặt lại vị trí AR giữa phòng"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleCaptureArSnapshot}
                  className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Chụp ảnh AR</span>
                </button>
              </div>
            </div>

            {/* Row 2: Scale & Rotation Sliders in Real Space */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/10">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-300 font-medium">
                    Kích thước trong phòng
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {Math.round(arScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.75}
                  step={0.01}
                  value={arScale}
                  onChange={handleArScaleChange}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-300 font-medium">
                    Xoay hướng người mẫu
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {arRotationDeg}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={arRotationDeg}
                  onChange={handleArRotationChange}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {hoveredJointLabel && (
        <div className="pointer-events-none absolute bottom-14 right-3 z-20 px-3 py-1.5 rounded-lg bg-slate-900/90 text-white text-xs font-medium tracking-tight shadow-sm whitespace-nowrap">
          Nhấp để chỉnh khớp: {hoveredJointLabel}
        </div>
      )}

      {webglFallback && (
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-4 ${
            isArMode ? 'bg-transparent' : 'bg-[#FAF9F6]'
          }`}
        >
          {/* Interactive 2D Studio Croquis Mannequin Preview */}
          <div
            className="relative flex items-center justify-center w-full max-w-md h-[78vh] transition-transform duration-150"
            style={
              isArMode
                ? {
                    transform: `translate(${arPositionXZ.x * 75}px, ${
                      arPositionXZ.z * 38
                    }px) scale(${arScale})`,
                  }
                : undefined
            }
          >
            <svg
              viewBox="0 0 260 540"
              className="h-full w-auto drop-shadow-sm"
              aria-label="Mô hình người mẫu Studio"
            >
              {/* Studio Floor Contact Shadow */}
              <ellipse
                cx="130"
                cy="512"
                rx="54"
                ry="11"
                fill="rgba(15, 23, 42, 0.12)"
              />

              {/* Back Hair Volume (Female Long Styles) */}
              {!isMale && (
                <path
                  d="M98 48 C86 76, 86 128, 94 156 L166 156 C174 128, 174 76, 162 48 Z"
                  fill={body.hairColorHex}
                />
              )}

              {/* Neck & Anatomical Torso Silhouette */}
              <rect
                x="118"
                y="84"
                width="24"
                height="28"
                rx="8"
                fill={skinColorHex}
              />
              <path
                d={`M${130 - shHalf} 113 Q130 102 ${130 + shHalf} 113 L${130 + chHalf} 152 Q${130 + waHalf} 190 ${130 + hiHalf} 240 L${130 - hiHalf} 240 Q${130 - waHalf} 190 ${130 - chHalf} 152 Z`}
                fill={skinColorHex}
              />

              {/* Bare Arms (Default T-Pose when posePreset === 'stand_still') */}
              <path
                d={
                  posePreset === 'stand_still'
                    ? `M${130 - shHalf + 2} ${114 - armThick * 0.35} Q${65} ${128 - armThick * 0.6} 14 148 L22 ${162 + armThick * 0.55} Q${72} ${152 + armThick * 0.85} ${130 - chHalf + 4} ${136 + armThick * 0.7} Z`
                    : `M${130 - shHalf + 2} 114 Q${82 - armThick * 0.85} 182 ${50 - armThick * 0.5} 252 L${66 + armThick * 0.4} 256 Q${92 + armThick * 0.5} 192 ${130 - chHalf + 4} 138 Z`
                }
                fill={skinColorHex}
                onClick={() => onSelectJoint('leftShoulder')}
                className="cursor-pointer"
              />
              <path
                d={
                  posePreset === 'stand_still'
                    ? `M${130 + shHalf - 2} ${114 - armThick * 0.35} Q${195} ${128 - armThick * 0.6} 246 148 L238 ${162 + armThick * 0.55} Q${188} ${152 + armThick * 0.85} ${130 + chHalf - 4} ${136 + armThick * 0.7} Z`
                    : `M${130 + shHalf - 2} 114 Q${178 + armThick * 0.85} 182 ${210 + armThick * 0.5} 252 L${194 - armThick * 0.4} 256 Q${168 - armThick * 0.5} 192 ${130 + chHalf - 4} 138 Z`
                }
                fill={skinColorHex}
                onClick={() => onSelectJoint('rightShoulder')}
                className="cursor-pointer"
              />

              {/* Bare Legs */}
              <path
                d={`M${130 - hiHalf + 4} 238 L${100 - legThick * 0.45} 478 L118 478 L126 268 Z`}
                fill={skinColorHex}
                onClick={() => onSelectJoint('leftHip')}
                className="cursor-pointer"
              />
              <path
                d={`M${130 + hiHalf - 4} 238 L${160 + legThick * 0.45} 478 L142 478 L134 268 Z`}
                fill={skinColorHex}
                onClick={() => onSelectJoint('rightHip')}
                className="cursor-pointer"
              />

              {/* One-Piece Dress Layer (when equipped) */}
              {hasDress && outfit.dress && (
                <g
                  onClick={() => onSelectJoint('chest')}
                  className="cursor-pointer"
                >
                  <path
                    d={`M${130 - chHalf} 132 Q130 146 ${130 + chHalf} 132 Q${130 + waHalf} 188 ${130 + hiHalf + 18} 395 L${130 - hiHalf - 18} 395 Q${130 - waHalf} 188 ${130 - chHalf} 132 Z`}
                    fill={outfit.dress.colorHex}
                  />
                </g>
              )}

              {/* Top Garment Layer */}
              {!hasDress && hasTop && (
                <g
                  onClick={() => onSelectJoint('chest')}
                  className="cursor-pointer"
                >
                  {outfit.top.styleId === 'silk_camisole' ? (
                    <>
                      {/* Spaghetti Straps over Real Bare Skin */}
                      <line
                        x1="104"
                        y1="112"
                        x2="104"
                        y2="146"
                        stroke={outfit.top.colorHex}
                        strokeWidth="3.5"
                      />
                      <line
                        x1="156"
                        y1="112"
                        x2="156"
                        y2="146"
                        stroke={outfit.top.colorHex}
                        strokeWidth="3.5"
                      />
                      <path
                        d={`M${130 - chHalf} 142 Q130 156 ${130 + chHalf} 142 Q${130 + waHalf} 188 ${130 + hiHalf - 4} 232 L${130 - hiHalf + 4} 232 Q${130 - waHalf} 188 ${130 - chHalf} 142 Z`}
                        fill={outfit.top.colorHex}
                      />
                    </>
                  ) : isSleeveless ? (
                    <path
                      d={`M${130 - chHalf} 128 Q130 140 ${130 + chHalf} 128 Q${130 + waHalf} 184 ${130 + waHalf + 4} 222 L${130 - waHalf - 4} 222 Q${130 - waHalf} 184 ${130 - chHalf} 128 Z`}
                      fill={outfit.top.colorHex}
                    />
                  ) : (
                    <path
                      d={`M${130 - shHalf} 113 Q130 126 ${130 + shHalf} 113 L${130 + shHalf + 12} 178 L${130 + chHalf + 6} 182 L${130 + chHalf} 142 Q${130 + waHalf} 188 ${130 + hiHalf - 4} 232 L${130 - hiHalf + 4} 232 Q${130 - waHalf} 188 ${130 - chHalf} 142 L${130 - chHalf - 6} 182 L${130 - shHalf - 12} 178 Z`}
                      fill={outfit.top.colorHex}
                    />
                  )}
                </g>
              )}

              {/* Bottom Garment Layer */}
              {!hasDress && hasBottom && (
                <g
                  onClick={() => onSelectJoint('pelvis')}
                  className="cursor-pointer"
                >
                  {isSkirt ? (
                    <path
                      d={
                        outfit.bottom.styleId === 'pleated_maxi_skirt'
                          ? `M${130 - waHalf - 4} 224 L${130 + waHalf + 4} 224 L${130 + hiHalf + 18} 415 L${130 - hiHalf - 18} 415 Z`
                          : `M${130 - waHalf - 4} 224 L${130 + waHalf + 4} 224 L${130 + hiHalf + 10} 335 L${130 - hiHalf - 10} 335 Z`
                      }
                      fill={outfit.bottom.colorHex}
                    />
                  ) : isShorts ? (
                    <path
                      d={`M${130 - waHalf - 4} 224 L${130 + waHalf + 4} 224 L${130 + hiHalf + 2} 320 L134 320 L130 272 L126 320 L${130 - hiHalf - 2} 320 Z`}
                      fill={outfit.bottom.colorHex}
                    />
                  ) : (
                    <path
                      d={`M${130 - waHalf - 4} 224 L${130 + waHalf + 4} 224 Q${130 + hiHalf + 4} 252 ${164 + legThick * 0.45} 462 L138 462 L130 276 L122 462 L${96 - legThick * 0.45} 462 Q${130 - hiHalf - 4} 252 ${130 - waHalf - 4} 224 Z`}
                      fill={outfit.bottom.colorHex}
                    />
                  )}
                </g>
              )}

              {/* Outerwear Layer */}
              {hasOuter && (
                <path
                  d={`M${130 - shHalf - 2} 112 L112 112 L108 256 L${130 - hiHalf - 6} 256 L${130 - shHalf - 14} 220 Z M${130 + shHalf + 2} 112 L148 112 L152 256 L${130 + hiHalf + 6} 256 L${130 + shHalf + 14} 220 Z`}
                  fill={outfit.outerwear.colorHex}
                  opacity="0.95"
                />
              )}

              {/* Sculpted Footwear Layer */}
              {hasShoes && (
                <g>
                  <path
                    d="M94 472 L120 472 L122 504 L86 504 Q86 486 94 472 Z"
                    fill={outfit.footwear.colorHex}
                  />
                  <rect
                    x="85"
                    y="498"
                    width="38"
                    height="7"
                    rx="3"
                    fill="#E2E8F0"
                  />
                  <path
                    d="M140 472 L166 472 Q174 486 174 504 L138 504 Z"
                    fill={outfit.footwear.colorHex}
                  />
                  <rect
                    x="137"
                    y="498"
                    width="38"
                    height="7"
                    rx="3"
                    fill="#E2E8F0"
                  />
                </g>
              )}

              {/* Head & Facial Features */}
              <g
                onClick={() => onSelectJoint('head')}
                className="cursor-pointer"
              >
                <ellipse
                  cx="130"
                  cy="58"
                  rx="24"
                  ry="30"
                  fill={skinColorHex}
                />
                {/* Eyes */}
                <circle
                  cx="121"
                  cy="56"
                  r="2.4"
                  fill={body.eyeColorHex || '#2C1E18'}
                />
                <circle
                  cx="139"
                  cy="56"
                  r="2.4"
                  fill={body.eyeColorHex || '#2C1E18'}
                />
                {/* Lips */}
                <path
                  d="M124 72 Q130 76 136 72"
                  stroke={
                    !isMale && body.makeup
                      ? body.makeup.lipColorHex
                      : '#C96A6A'
                  }
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Hair Crown */}
                <path
                  d={
                    isMale
                      ? 'M105 52 C104 26, 156 26, 155 52 C146 38, 114 38, 105 52 Z'
                      : 'M102 62 C100 22, 160 22, 158 62 C150 38, 110 38, 102 62 Z'
                  }
                  fill={body.hairColorHex}
                />
              </g>
            </svg>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-white/90 border border-slate-200 rounded-lg shadow-xs">
            <span className="text-xs text-slate-600">
              Chế độ xem nhanh Studio (WebGL tạm ngắt trên trình duyệt)
            </span>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-3 py-1 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Khởi tạo lại 3D
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const MannequinViewport = memo(MannequinViewportComponent);
MannequinViewport.displayName = 'MannequinViewport';
