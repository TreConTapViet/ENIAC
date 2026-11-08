import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  AccessoriesConfiguration,
  BodyMeasurements,
  BottomStyleId,
  DressStyleId,
  FabricType,
  FootwearStyleId,
  GarmentWeavePattern,
  HairstyleId,
  HandbagStyleId,
  HatStyleId,
  JointId,
  OuterwearStyleId,
  OutfitConfiguration,
  PosePresetId,
  SunglassesStyleId,
  TopStyleId,
  WatchStyleId,
  WeatherEffectConfig,
} from '../types/studio';
import {
  DEFAULT_ACCESSORIES,
  DEFAULT_WEATHER_EFFECT,
  deriveMeasurementsFromHeightWeight,
  FABRIC_LIBRARY,
  FABRIC_PHYSICS_META,
  MANNEQUIN_SURFACES,
} from '../data/presets';

export interface HumanMannequinRig {
  root: THREE.Group;
  joints: Record<JointId, THREE.Bone>;
  jointIndicators: Record<JointId, THREE.Mesh>;
  skinMaterial: THREE.MeshPhysicalMaterial;
  garmentGroups: {
    top: THREE.Object3D[];
    outerwear: THREE.Object3D[];
    bottom: THREE.Object3D[];
    footwear: THREE.Object3D[];
  };
  measurementRingsGroup: THREE.Group;
  updateBodyMorph: (
    body: BodyMeasurements,
    outfit: OutfitConfiguration,
    showRings: boolean
  ) => void;
  updateGarments: (
    outfit: OutfitConfiguration,
    body: BodyMeasurements,
    maxAnisotropy: number
  ) => void;
  updateAnimation: (
    dt: number,
    posePreset: PosePresetId,
    weather?: WeatherEffectConfig
  ) => void;
  highlightJoint: (
    selectedJoint: JointId | null,
    hoveredJoint: JointId | null
  ) => void;
  buildExportablePosedScene: () => THREE.Group;
}

const JOINT_TO_GLB_BONE_NAME: Record<JointId, string> = {
  pelvis: 'Hips',
  spine: 'Spine',
  chest: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  leftShoulder: 'LeftArm',
  leftElbow: 'LeftForeArm',
  leftWrist: 'LeftHand',
  rightShoulder: 'RightArm',
  rightElbow: 'RightForeArm',
  rightWrist: 'RightHand',
  leftHip: 'LeftUpLeg',
  leftKnee: 'LeftLeg',
  leftAnkle: 'LeftFoot',
  rightHip: 'RightUpLeg',
  rightKnee: 'RightLeg',
  rightAnkle: 'RightFoot',
};

interface TopShaderUniforms {
  uTopStyle: { value: number };
  uIsMale: { value: number };
  uIsDress: { value: number };
  uFabricCode: { value: number };
  uSkinColor: { value: THREE.Color };
  uTrimColor: { value: THREE.Color };
  uHasPhotoTex: { value: number };
  uPhotoTex: { value: THREE.Texture };
  uPhotoCutout: { value: THREE.Vector4 };
  uWetness: { value: number };
}

interface OuterShaderUniforms {
  uOuterStyle: { value: number };
  uIsMale: { value: number };
  uFabricCode: { value: number };
  uTrimColor: { value: THREE.Color };
  uHasPhotoTex: { value: number };
  uPhotoTex: { value: THREE.Texture };
  uWetness: { value: number };
}

interface BottomShaderUniforms {
  uBottomStyle: { value: number };
  uIsMale: { value: number };
  uIsDress: { value: number };
  uFabricCode: { value: number };
  uSkinColor: { value: THREE.Color };
  uTrimColor: { value: THREE.Color };
  uHasPhotoTex: { value: number };
  uPhotoTex: { value: THREE.Texture };
  uWetness: { value: number };
}

interface FootwearShaderUniforms {
  uShoeStyle: { value: number };
  uIsMale: { value: number };
  uSkinColor: { value: THREE.Color };
  uShoeColor: { value: THREE.Color };
  uFootBoundsX: { value: THREE.Vector2 }; // x = footCenterX, y = footHalfWidthX
  uFootBoundsY: { value: THREE.Vector2 }; // x = footMinY, y = footMaxY
  uFootBoundsZ: { value: THREE.Vector2 }; // x = footMinZ, y = footMaxZ
}

interface MakeupShaderUniforms {
  uEnableMakeup: { value: number };
  uEyeLandmark: { value: THREE.Vector3 };
  uMouthLandmark: { value: THREE.Vector3 };
  uLipColor: { value: THREE.Color };
  uBlushColor: { value: THREE.Color };
  uEyeshadowColor: { value: THREE.Color };
  uMakeupWeights1: { value: THREE.Vector4 }; // x=lipIntensity, y=lipGloss, z=blushIntensity, w=eyeshadowIntensity
  uMakeupWeights2: { value: THREE.Vector4 }; // x=eyelinerIntensity, y=highlighterGlow, z=0, w=0
}

interface AnatomicalMorphParams {
  key: string;
  chestDelta: number;
  waistDelta: number;
  hipDelta: number;
  shoulderDelta: number;
  bmiDelta: number;
  massDelta: number;
  bicepDelta: number;
  forearmDelta: number;
  thighDelta: number;
  calfDelta: number;
  armSkeletalScale: number;
  legSkeletalScale: number;
}

interface AnatomicalRigLandmarks {
  shoulderPos: [number, number, number];
  elbowPos: [number, number, number];
  wristPos: [number, number, number];
  hipPos: [number, number, number];
  kneePos: [number, number, number];
  anklePos: [number, number, number];
}

interface SkinnedGarmentSystem {
  bodySkinMesh: THREE.SkinnedMesh | null;
  baseBodyPos: Float32Array | null;
  baseBodyNorm: Float32Array | null;
  baseBodyAnatWeights: Float32Array | null;
  topMesh: THREE.SkinnedMesh | null;
  baseTopPos: Float32Array | null;
  baseTopNorm: Float32Array | null;
  baseTopAnatWeights: Float32Array | null;
  topShaderUniforms: TopShaderUniforms;
  outerwearSkinnedMesh: THREE.SkinnedMesh | null;
  baseOuterPos: Float32Array | null;
  baseOuterNorm: Float32Array | null;
  baseOuterAnatWeights: Float32Array | null;
  outerShaderUniforms: OuterShaderUniforms;
  bottomMesh: THREE.SkinnedMesh | null;
  baseBottomPos: Float32Array | null;
  baseBottomNorm: Float32Array | null;
  baseBottomAnatWeights: Float32Array | null;
  bottomShaderUniforms: BottomShaderUniforms;
  footwearMesh: THREE.SkinnedMesh | null;
  baseFootwearPos: Float32Array | null;
  baseFootwearNorm: Float32Array | null;
  footwearShaderUniforms: FootwearShaderUniforms;
  landmarks: AnatomicalRigLandmarks;
  footBounds: {
    centerX: number;
    halfWidthX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  appliedBodyMorphKey: string | null;
  appliedTopStyle: string | null;
  appliedOuterStyle: string | null;
  appliedBottomStyle: string | null;
  appliedFootwearStyle: FootwearStyleId | null;
  blouseBowGroup: THREE.Group;
  trenchOpenHemMesh: THREE.Mesh;
  blazerTailMesh: THREE.Mesh;
  peplumWaistMesh: THREE.Mesh;
  alineSkirtMesh: THREE.Mesh;
  maxiSkirtMesh: THREE.Mesh;
  pencilSkirtMesh: THREE.Mesh;
}

interface HeadHairSystem {
  cleanSinglePieceHair: THREE.SkinnedMesh;
  cleanBasePos: Float32Array;
  twoBunchHair: THREE.SkinnedMesh | null;
  ponytailAttachment: THREE.Group;
  bunAttachment: THREE.Group;
  lowChignonAttachment: THREE.Group;
  longBackHairAttachment: THREE.Group;
  himeSideLocksAttachment: THREE.Group;
  butterflyWingsAttachment: THREE.Group;
  femaleCustomLocksAttachment: THREE.Group;
  maleCrownLocksAttachment: THREE.Group;
  mulletTailAttachment: THREE.Group;
  hairStrandMat: THREE.MeshStandardMaterial;
  accessoryMat: THREE.MeshStandardMaterial;
  appliedStyle: HairstyleId | null;
  lastHairColor: string;
}

interface AccessoryRigSystem {
  sunglassesRoot: THREE.Group;
  sunglassesByStyle: Record<Exclude<SunglassesStyleId, 'none'>, THREE.Group>;
  sunglassesFrameMat: THREE.MeshStandardMaterial;
  sunglassesLensMat: THREE.MeshPhysicalMaterial;
  sunglassesUploadedMesh: THREE.Mesh;
  sunglassesUploadedMat: THREE.MeshStandardMaterial;
  eyeLocalPos: THREE.Vector3;
  watchRoot: THREE.Group;
  watchByStyle: Record<Exclude<WatchStyleId, 'none'>, THREE.Group>;
  watchCaseMat: THREE.MeshStandardMaterial;
  watchStrapMat: THREE.MeshStandardMaterial;
  watchDialMat: THREE.MeshStandardMaterial;
  watchUploadedMesh: THREE.Mesh;
  watchUploadedMat: THREE.MeshStandardMaterial;
  handbagRoot: THREE.Group;
  handbagBodyPivot: THREE.Group;
  handbagByStyle: Record<Exclude<HandbagStyleId, 'none'>, THREE.Group>;
  handbagShoulderStraps: THREE.Group[];
  handbagTopHandles: THREE.Group[];
  handbagLeatherMat: THREE.MeshStandardMaterial;
  handbagHardwareMat: THREE.MeshStandardMaterial;
  handbagUploadedGroup: THREE.Group;
  handbagUploadedMat: THREE.MeshStandardMaterial;
  hatRoot: THREE.Group;
  hatByStyle: Record<Exclude<HatStyleId, 'none'>, THREE.Group>;
  hatCrownMat: THREE.MeshStandardMaterial;
  hatTrimMat: THREE.MeshStandardMaterial;
  hatUploadedMesh: THREE.Mesh;
  hatUploadedMat: THREE.MeshStandardMaterial;
}

interface CharacterRigSlot {
  scene: THREE.Group;
  bonesByName: Map<string, THREE.Bone>;
  tPoseBaseQuats: Map<string, THREE.Quaternion>;
  standingBaseQuats: Map<string, THREE.Quaternion>;
  standingBasePos: Map<string, THREE.Vector3>;
  animPreDeltaQuats: Map<string, THREE.Quaternion>;
  mixer: THREE.AnimationMixer;
  idleAction: THREE.AnimationAction | null;
  walkAction: THREE.AnimationAction | null;
  baseLeftShoulderX: number;
  baseRightShoulderX: number;
  baseLeftUpLegX: number;
  baseRightUpLegX: number;
  baseHeadSkinColor: THREE.Color;
  makeupUniforms: MakeupShaderUniforms | null;
  skinMeshes: THREE.SkinnedMesh[];
  eyeMeshes: THREE.SkinnedMesh[];
  topMeshes: THREE.SkinnedMesh[];
  bottomMeshes: THREE.SkinnedMesh[];
  footwearMeshes: THREE.SkinnedMesh[];
  hairSystem: HeadHairSystem;
  garmentSystem: SkinnedGarmentSystem;
  accessorySystem: AccessoryRigSystem;
  topOverlayMat: THREE.MeshStandardMaterial;
  outerOverlayMat: THREE.MeshStandardMaterial;
  bottomOverlayMat: THREE.MeshStandardMaterial;
}

const FABRIC_SHADER_CODE: Record<FabricType, number> = {
  cotton: 1,
  silk: 2,
  denim: 3,
  leather: 4,
  fleece: 5,
  linen: 6,
};

const TOP_STYLE_SHADER_CODE: Record<TopStyleId, number> = {
  none: 100,
  silk_blouse_bow: 1,
  baby_tee: 2,
  off_shoulder_knit: 3,
  corset_top: 4,
  silk_camisole: 5,
  puff_blouse: 6,
  halter_crop: 7,
  crop_cardigan: 8,
  female_turtleneck: 9,
  peplum_waist_top: 10,
  oxford_shirt: 20,
  crewneck_tee: 21,
  polo_shirt: 22,
  henley_shirt: 23,
  hoodie_street: 24,
  turtleneck_knit: 25,
  compression_athletic: 26,
  fitted_tank: 27,
};

const OUTER_STYLE_SHADER_CODE: Record<OuterwearStyleId, number> = {
  none: 0,
  tailored_blazer: 1,
  trench_coat: 2,
  biker_leather: 3,
  denim_jacket: 4,
  bomber_jacket: 5,
  gilet_vest: 6,
};

const BOTTOM_STYLE_SHADER_CODE: Record<BottomStyleId, number> = {
  none: 100,
  aline_skirt: 1,
  pleated_maxi_skirt: 2,
  pencil_skirt: 3,
  female_denim_shorts: 4,
  female_cargo_pants: 5,
  slim_jeans: 6,
  tailored_trousers: 7,
  male_dress_trousers: 20,
  male_denim_jeans: 21,
  cargo_pants: 22,
  tailored_shorts: 23,
  male_chino_khaki: 24,
  male_jogger_sport: 25,
};

const SHOE_STYLE_SHADER_CODE: Record<FootwearStyleId, number> = {
  none: 100,
  minimal_sneakers: 1,
  chunky_dad_sneakers: 2,
  chelsea_boots: 3,
  penny_loafers: 4,
  pointed_heels: 5,
  strappy_stiletto_heels: 6,
  knee_high_boots: 7,
  platform_mary_jane: 8,
  oxford_dress_shoes: 9,
  high_top_sneakers: 10,
};

/**
 * Samples the unshadowed RGB skin albedo from `Wolf3D_Body` / `Wolf3D_Head`
 * so bare shoulders, collarbones, chest, upper arms, and cropped waist on `topMesh`
 * match the neck and forearms (`Wolf3D_Body`) 100% seamlessly with zero dark/leathery tint!
 */
function sampleBaseSkinColorFromHead(
  skinMeshes: THREE.SkinnedMesh[]
): THREE.Color {
  const calibratedBase = new THREE.Color(0.88, 0.72, 0.64);
  const bodyMesh =
    skinMeshes.find((m) => m.name.toLowerCase().includes('body')) ||
    skinMeshes.find((m) => m.name.toLowerCase().includes('head')) ||
    skinMeshes[0];
  if (!bodyMesh) return calibratedBase.convertSRGBToLinear();
  const mat = bodyMesh.material as THREE.MeshStandardMaterial | undefined;
  const tex = (mat?.userData?.origMap || mat?.map) as THREE.Texture | undefined;
  if (!tex || !tex.image) return calibratedBase.convertSRGBToLinear();

  try {
    const img = tex.image as HTMLImageElement | ImageBitmap;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return calibratedBase.convertSRGBToLinear();
    ctx.drawImage(img as CanvasImageSource, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    // Sample only bright, unshadowed skin pixels (excluding dark nostril/ear/lip/shadow creases)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      if (
        r > 0.78 &&
        g > 0.62 &&
        b > 0.52 &&
        r > g &&
        g > b &&
        r - b > 0.12 &&
        r - b < 0.34
      ) {
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }

    if (count > 16) {
      const avgR = Math.min(0.91, Math.max(0.85, rSum / count));
      const avgG = Math.min(0.76, Math.max(0.69, gSum / count));
      const avgB = Math.min(0.68, Math.max(0.61, bSum / count));
      return new THREE.Color(avgR, avgG, avgB).convertSRGBToLinear();
    }
  } catch {
    // Fallback
  }
  return calibratedBase.convertSRGBToLinear();
}

const compositeTextureCache = new Map<string, THREE.CanvasTexture>();
const hairStrandTextureCache = new Map<string, THREE.CanvasTexture>();
let sharedHairBumpTex: THREE.CanvasTexture | null = null;

/**
 * Generates a high-resolution procedural hair-strand fiber normal/bump map
 * and color texture so sculpted 3D hair locks have realistic silk-like hair strands.
 */
function getSharedHairBumpTexture(): THREE.CanvasTexture {
  if (sharedHairBumpTex) return sharedHairBumpTex;
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);

  for (let x = 0; x < w; x++) {
    const strand =
      Math.sin(x * 0.85) * 32 +
      Math.sin(x * 2.3) * 18 +
      Math.cos(x * 5.1) * 12;
    const v = Math.max(20, Math.min(235, Math.round(128 + strand)));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.repeat.set(3, 2);
  sharedHairBumpTex = tex;
  return tex;
}

function getProceduralHairStrandTexture(hairColorHex: string): THREE.CanvasTexture {
  const key = hairColorHex.toLowerCase();
  if (hairStrandTextureCache.has(key)) {
    return hairStrandTextureCache.get(key)!;
  }

  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(hairColorHex);
  const rBase = baseCol.r * 255;
  const gBase = baseCol.g * 255;
  const bBase = baseCol.b * 255;

  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    const vNorm = y / h;
    // Dual Kajiya-Kay anisotropic crown & mid-shaft specular bands + natural root-to-tip depth gradient
    const primaryHalo = Math.pow(Math.max(0, Math.sin(vNorm * Math.PI * 2.0)), 6) * 0.28;
    const secondaryHalo = Math.pow(Math.max(0, Math.sin((vNorm + 0.18) * Math.PI * 2.0)), 4) * 0.14;
    const rootTipDepth = 0.88 + 0.14 * Math.sin(vNorm * Math.PI);
    const sheenBand = primaryHalo + secondaryHalo;

    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const uWave = x + Math.sin(vNorm * Math.PI * 4.0) * 3.5;
      const clumpedLock = Math.sin(uWave * 0.28) * 0.09;
      const mediumStrand = Math.sin(uWave * 0.95 + y * 0.04) * 0.085;
      const microCuticle =
        Math.sin(uWave * 2.65) * 0.065 + Math.cos(uWave * 5.2) * 0.045;
      const fiber = clumpedLock + mediumStrand + microCuticle;
      const shade = Math.max(
        0.42,
        Math.min(1.45, rootTipDepth + fiber + sheenBand)
      );

      data[i] = Math.min(255, Math.round(rBase * shade + sheenBand * 36));
      data[i + 1] = Math.min(255, Math.round(gBase * shade + sheenBand * 31));
      data[i + 2] = Math.min(255, Math.round(bBase * shade + sheenBand * 26));
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  hairStrandTextureCache.set(key, tex);
  return tex;
}

const fabricBumpTextureCache = new Map<FabricType, THREE.CanvasTexture>();

/**
 * Generates a distinct procedural 3D micro-weave bump map for each FabricType
 * so switching between Cotton, Silk, Denim, Leather, Fleece, and Linen
 * visibly transforms surface relief and light reflection.
 */
function getFabricBumpTexture(fabric: FabricType): THREE.CanvasTexture {
  if (fabricBumpTextureCache.has(fabric)) {
    return fabricBumpTextureCache.get(fabric)!;
  }

  const w = 128;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let v = 128;

      if (fabric === 'silk') {
        const satin = Math.sin(x * 0.45 + y * 0.1) * 8 + Math.cos(y * 1.2) * 4;
        v = 128 + satin;
      } else if (fabric === 'denim') {
        const diag = ((x + y * 2) % 6) < 3 ? 42 : -36;
        const slub = Math.sin(y * 0.7) * 14;
        v = 128 + diag + slub;
      } else if (fabric === 'leather') {
        const cell1 = Math.sin(x * 0.55 + Math.cos(y * 0.48) * 2.6);
        const cell2 = Math.cos(y * 0.55 + Math.sin(x * 0.48) * 2.6);
        const pebble = Math.pow(Math.abs(cell1 * cell2), 0.65) * 84 - 38;
        v = 128 + pebble;
      } else if (fabric === 'fleece') {
        const ribCol = Math.sin(x * 0.75) * 52;
        const knitLoop = Math.cos(y * 1.3 + (x % 8 < 4 ? 0.9 : -0.9)) * 28;
        v = 128 + ribCol + knitLoop;
      } else if (fabric === 'linen') {
        const warp = Math.sin(x * 1.35) * 38;
        const weft = Math.sin(y * 1.35) * 38;
        const slub = (x % 17 === 0 || y % 19 === 0) ? 26 : 0;
        v = 128 + warp + weft + slub;
      } else {
        // cotton jersey knit
        const jersey = Math.sin(x * 1.6) * 20 + Math.cos(y * 1.6) * 18;
        v = 128 + jersey;
      }

      const clamped = Math.max(8, Math.min(248, Math.round(v)));
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.repeat.set(6, 6);
  tex.needsUpdate = true;
  fabricBumpTextureCache.set(fabric, tex);
  return tex;
}

function getStyledGarmentTexture(
  origTex: THREE.Texture | null,
  colorHex: string,
  secondaryColorHex: string | undefined,
  fabric: FabricType | null,
  styleTag: string,
  weavePattern: GarmentWeavePattern | undefined,
  minLum = 142,
  lumRange = 113
): THREE.Texture | null {
  if (!origTex || !origTex.image) return origTex;

  const secHex = secondaryColorHex || colorHex;
  const pattern = weavePattern || 'solid';
  const fabKey = fabric || 'cotton';
  const cacheKey = `${origTex.uuid}_${colorHex}_${secHex}_${fabKey}_${styleTag}_${pattern}_${minLum}`;

  if (compositeTextureCache.has(cacheKey)) {
    return compositeTextureCache.get(cacheKey)!;
  }

  try {
    const img = origTex.image as HTMLImageElement | ImageBitmap;
    const w = 256;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return origTex;

    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const baseData = ctx.getImageData(0, 0, w, h);
    const data = baseData.data;

    const col = new THREE.Color(colorHex);
    const targetR = col.r * 255;
    const targetG = col.g * 255;
    const targetB = col.b * 255;

    const secCol = new THREE.Color(secHex);
    const secR = secCol.r * 255;
    const secG = secCol.g * 255;
    const secB = secCol.b * 255;

    const isStriped = pattern === 'striped';
    const isPlaid = pattern === 'plaid_check';
    const isCoutureDressOrSkirt =
      styleTag.startsWith('dress_') || styleTag.includes('skirt');
    const isHairMesh = styleTag.startsWith('hair_');

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const rawLum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // For dresses & skirts, use clean continuous couture drape luminance instead of baked T-shirt hem or blue-jeans pocket/waistband shadows
        const coutureLum =
          0.77 +
          Math.sin((x / w) * Math.PI * 8) * 0.032 +
          Math.cos((y / h) * Math.PI * 2) * 0.018;
        const lum = isCoutureDressOrSkirt ? coutureLum : rawLum;
        const contrastLum = lum * (0.85 + 0.15 * lum);
        let shade = (minLum + contrastLum * lumRange) / 255;
        let specAdd = 0;
        let mixSec = 0;

        // Distinct visual texture & sheen per FabricType (with dedicated anisotropic silk hair-fiber branch)
        if (isHairMesh) {
          const vRatio = y / h;
          const strandFlow =
            Math.sin(x * 1.15 + Math.sin(vRatio * Math.PI * 3.0) * 2.2) * 0.075 +
            Math.sin(x * 3.1 + y * 0.08) * 0.055 +
            Math.cos(x * 5.8) * 0.035;
          const kajiyaBand =
            Math.pow(Math.max(0, Math.sin(vRatio * Math.PI * 2.2)), 5) * 0.24 +
            Math.pow(Math.max(0, Math.sin((vRatio + 0.22) * Math.PI * 2.0)), 4) * 0.11;
          const rootDarken = 0.86 + 0.14 * Math.sin(vRatio * Math.PI);
          shade = Math.max(
            0.32,
            Math.min(1.42, shade * rootDarken + strandFlow + kajiyaBand)
          );
          specAdd = kajiyaBand * 42;
        } else if (fabKey === 'silk') {
          const satinCurve = lum * Math.sqrt(lum) * 0.42;
          const sWave = Math.max(0, Math.sin((x + y * 0.6) * 0.09));
          const sheenWave = sWave * sWave * sWave * sWave * 0.16;
          shade = 0.72 + satinCurve + sheenWave;
          specAdd = (satinCurve + sheenWave) * 36;
        } else if (fabKey === 'denim') {
          const diagTwill = (x + y * 2) % 4 === 0 ? 0.095 : -0.055;
          const slub = (y % 7 === 0 ? 0.035 : 0) + Math.sin(x * 0.5) * 0.025;
          shade = Math.max(0.24, Math.min(1.18, shade + diagTwill + slub));
          if ((x + y * 2) % 4 === 0) {
            specAdd = 14;
          }
        } else if (fabKey === 'leather') {
          const pebble =
            Math.sin(x * 2.2 + Math.cos(y * 2.0) * 2.2) *
            Math.cos(y * 2.2) *
            0.075;
          const gVal = Math.max(0, (lum - 0.52) * 2.0);
          const glossHighlight = gVal * gVal * 0.35;
          shade = Math.max(0.22, Math.min(1.28, shade * 0.92 + pebble + glossHighlight));
          specAdd = glossHighlight * 65;
        } else if (fabKey === 'fleece') {
          const cableRib = Math.sin(x * 0.95) * 0.095;
          const stitchV = Math.cos(y * 1.8 + (x % 6 < 3 ? 0.6 : -0.6)) * 0.045;
          shade = Math.max(0.25, Math.min(1.12, shade * 0.96 + cableRib + stitchV));
        } else if (fabKey === 'linen') {
          const crossWeave =
            Math.sin(x * 2.1) * 0.065 + Math.sin(y * 2.1) * 0.065;
          const slubThread = (x % 15 === 0 || y % 13 === 0) ? 0.06 : 0;
          shade = Math.max(0.26, Math.min(1.15, shade + crossWeave + slubThread));
        } else {
          // cotton
          const jersey =
            Math.sin(x * 1.8) * 0.028 + Math.cos(y * 1.8) * 0.022;
          shade = Math.max(0.25, Math.min(1.14, shade + jersey));
        }

        if (isStriped) {
          const stripe = Math.sin(y * 0.65) > 0.55 ? 1 : 0;
          mixSec = stripe * 0.35;
        } else if (isPlaid) {
          const hBand = Math.sin(y * 0.42) > 0.65 ? 0.3 : 0;
          const vBand = Math.sin(x * 0.42) > 0.65 ? 0.3 : 0;
          mixSec = Math.min(0.55, hBand + vBand);
        }

        const cR = targetR * (1 - mixSec) + secR * mixSec;
        const cG = targetG * (1 - mixSec) + secG * mixSec;
        const cB = targetB * (1 - mixSec) + secB * mixSec;

        data[i] = Math.min(255, Math.round(cR * shade + specAdd));
        data[i + 1] = Math.min(255, Math.round(cG * shade + specAdd));
        data[i + 2] = Math.min(255, Math.round(cB * shade + specAdd));
      }
    }

    ctx.putImageData(baseData, 0, 0);
    const canvasTex = new THREE.CanvasTexture(canvas);
    canvasTex.flipY = origTex.flipY;
    canvasTex.wrapS = origTex.wrapS;
    canvasTex.wrapT = origTex.wrapT;
    canvasTex.generateMipmaps = false;
    canvasTex.minFilter = THREE.LinearFilter;
    canvasTex.colorSpace = THREE.SRGBColorSpace;
    canvasTex.needsUpdate = true;

    if (compositeTextureCache.size > 32) {
      const firstKey = compositeTextureCache.keys().next().value;
      if (firstKey) {
        compositeTextureCache.get(firstKey)?.dispose();
        compositeTextureCache.delete(firstKey);
      }
    }
    compositeTextureCache.set(cacheKey, canvasTex);
    return canvasTex;
  } catch {
    return origTex;
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Clones the clean single-piece hair mesh from `rpm_female_2.glb` onto either the Female (`F1`)
 * or Male (`M1`) character skeleton.
 * For Male (`isMale === true`), applies the exact `F2_Head_World * M1_Head_World^(-1)` bone-inverse
 * compensation so the hair cap sits 100% level and flush on the male skull.
 */
function cloneCleanHairOntoCharacterSkeleton(
  sourceCleanHair: THREE.SkinnedMesh,
  targetBonesByName: Map<string, THREE.Bone>,
  targetScene: THREE.Object3D,
  isMale: boolean
): { mesh: THREE.SkinnedMesh; basePos: Float32Array } {
  const cloned = sourceCleanHair.clone();
  const srcGeo = sourceCleanHair.geometry;
  const geo = new THREE.BufferGeometry();

  if (srcGeo.index) {
    geo.setIndex(srcGeo.index.clone());
  }

  const srcPos = srcGeo.attributes.position;
  const srcNorm = srcGeo.attributes.normal;
  const srcUv = srcGeo.attributes.uv;
  const count = srcPos.count;

  const posArray = new Float32Array(count * 3);
  const normArray = new Float32Array(count * 3);
  const uvArray = srcUv ? new Float32Array(count * 2) : null;
  const skinIdxArray = new Uint16Array(count * 4);
  const skinWgtArray = new Float32Array(count * 4);

  targetScene.updateMatrixWorld(true);
  const mappedBones = sourceCleanHair.skeleton.bones.map(
    (srcBone) => targetBonesByName.get(srcBone.name) || srcBone
  );

  const headBoneIdx = mappedBones.findIndex((b) => b.name === 'Head');
  const safeHeadIdx = headBoneIdx !== -1 ? headBoneIdx : 5;

  // Source female Head bone inverse matrix (maps source hair vertex into Head-local coords)
  const srcHeadIdx = sourceCleanHair.skeleton.bones.findIndex((b) => b.name === 'Head');
  const srcHeadInv = sourceCleanHair.skeleton.boneInverses[srcHeadIdx !== -1 ? srcHeadIdx : 5];

  // Target Head bone rest world matrix
  const targetHead = targetBonesByName.get('Head');
  const targetHeadMatrixWorld = targetHead ? targetHead.matrixWorld.clone() : new THREE.Matrix4();
  const targetHeadInv = targetHeadMatrixWorld.clone().invert();

  const _v = new THREE.Vector3();
  const _n = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    _v.set(srcPos.getX(i), srcPos.getY(i), srcPos.getZ(i));
    if (srcNorm) _n.set(srcNorm.getX(i), srcNorm.getY(i), srcNorm.getZ(i));

    // Convert into Head-local coordinates
    if (srcHeadInv) {
      _v.applyMatrix4(srcHeadInv);
      if (srcNorm) _n.transformDirection(srcHeadInv);
    }

    // On Male, scale cranial width/height subtly to match the broader male skull profile
    if (isMale) {
      _v.x *= 1.025;
      _v.y = (_v.y - 0.05) * 1.035 + 0.05;
      _v.z = (_v.z + 0.02) * 1.02 - 0.02;
    }

    // Convert into target character's rest world position
    _v.applyMatrix4(targetHeadMatrixWorld);
    if (srcNorm) _n.transformDirection(targetHeadMatrixWorld);

    posArray[i * 3] = _v.x;
    posArray[i * 3 + 1] = _v.y;
    posArray[i * 3 + 2] = _v.z;

    if (srcNorm) {
      normArray[i * 3] = _n.x;
      normArray[i * 3 + 1] = _n.y;
      normArray[i * 3 + 2] = _n.z;
    }
    if (srcUv && uvArray) {
      uvArray[i * 2] = srcUv.getX(i);
      uvArray[i * 2 + 1] = srcUv.getY(i);
    }

    // Bind 100% of hair vertices to the Head bone
    skinIdxArray[i * 4] = safeHeadIdx;
    skinIdxArray[i * 4 + 1] = safeHeadIdx;
    skinIdxArray[i * 4 + 2] = safeHeadIdx;
    skinIdxArray[i * 4 + 3] = safeHeadIdx;

    skinWgtArray[i * 4] = 1.0;
    skinWgtArray[i * 4 + 1] = 0.0;
    skinWgtArray[i * 4 + 2] = 0.0;
    skinWgtArray[i * 4 + 3] = 0.0;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
  if (uvArray) geo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIdxArray, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWgtArray, 4));

  const basePos = new Float32Array(posArray);
  cloned.geometry = geo;

  const origMat = sourceCleanHair.material as THREE.MeshStandardMaterial;
  const clonedMat = origMat.clone();
  clonedMat.roughnessMap = null;
  clonedMat.metalnessMap = null;
  clonedMat.normalMap = null;
  clonedMat.userData = {
    origMap: origMat.map || null,
    origColor: origMat.color ? origMat.color.clone() : new THREE.Color('#FFFFFF'),
    origRoughness: origMat.roughness ?? 0.55,
    origMetalness: origMat.metalness ?? 0.04,
  };
  cloned.material = clonedMat;

  // Custom inverses: use the target Head bone inverse for the Head bone
  const customInverses = sourceCleanHair.skeleton.boneInverses.map((inv, idx) => {
    const bName = sourceCleanHair.skeleton.bones[idx]?.name;
    if (bName === 'Head') {
      return targetHeadInv.clone();
    }
    return inv.clone();
  });

  const remappedSkeleton = new THREE.Skeleton(mappedBones, customInverses);

  cloned.bind(remappedSkeleton, sourceCleanHair.bindMatrix.clone());
  cloned.frustumCulled = false;
  cloned.castShadow = true;
  cloned.receiveShadow = true;
  cloned.visible = true;
  targetScene.add(cloned);

  return { mesh: cloned, basePos };
}

let sharedDummyWhiteTex: THREE.DataTexture | null = null;
function getDummyWhiteTexture(): THREE.DataTexture {
  if (sharedDummyWhiteTex) return sharedDummyWhiteTex;
  const data = new Uint8Array([255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  sharedDummyWhiteTex = tex;
  return tex;
}

const uploadedPhotoTextureCache = new Map<string, THREE.Texture>();
function getUploadedGarmentTexture(
  dataUrl?: string | null
): THREE.Texture | null {
  if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length < 10) {
    return null;
  }
  if (uploadedPhotoTextureCache.has(dataUrl)) {
    return uploadedPhotoTextureCache.get(dataUrl)!;
  }
  const tex = new THREE.TextureLoader().load(dataUrl, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.wrapS = THREE.ClampToEdgeWrapping;
    loaded.wrapT = THREE.ClampToEdgeWrapping;
    loaded.generateMipmaps = false;
    loaded.minFilter = THREE.LinearFilter;
    loaded.magFilter = THREE.LinearFilter;
    loaded.needsUpdate = true;
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  if (uploadedPhotoTextureCache.size > 24) {
    const firstKey = uploadedPhotoTextureCache.keys().next().value;
    if (firstKey) {
      uploadedPhotoTextureCache.get(firstKey)?.dispose();
      uploadedPhotoTextureCache.delete(firstKey);
    }
  }
  uploadedPhotoTextureCache.set(dataUrl, tex);
  return tex;
}

const eyeIrisTextureCache = new Map<string, THREE.CanvasTexture>();
function getStyledEyeIrisTexture(
  origTex: THREE.Texture | null,
  eyeColorHex: string
): THREE.Texture | null {
  if (!origTex || !origTex.image) return origTex;
  const key = `${origTex.uuid}_${eyeColorHex.toLowerCase()}`;
  if (eyeIrisTextureCache.has(key)) {
    return eyeIrisTextureCache.get(key)!;
  }
  try {
    const img = origTex.image as HTMLImageElement | ImageBitmap;
    const w = 256;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return origTex;
    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const targetCol = new THREE.Color(eyeColorHex);
    const tR = targetCol.r * 255;
    const tG = targetCol.g * 255;
    const tB = targetCol.b * 255;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // Sclera (white of the eye) has high luminance (> 0.72); pupil has very low luminance (< 0.12).
        // Tint the mid-luminance iris ring smoothly while keeping pupil dark and sclera bright!
        if (lum > 0.11 && lum < 0.72) {
          const irisWeight =
            smoothstep(0.11, 0.22, lum) * (1.0 - smoothstep(0.56, 0.72, lum));
          const shade = 0.55 + lum * 0.95;
          data[i] = Math.min(
            255,
            Math.round(r * (1 - irisWeight) + tR * shade * irisWeight)
          );
          data[i + 1] = Math.min(
            255,
            Math.round(g * (1 - irisWeight) + tG * shade * irisWeight)
          );
          data[i + 2] = Math.min(
            255,
            Math.round(b * (1 - irisWeight) + tB * shade * irisWeight)
          );
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = origTex.flipY;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    eyeIrisTextureCache.set(key, tex);
    return tex;
  } catch {
    return origTex;
  }
}

/**
 * Helper to build a contoured 3D double-sided silk hair ribbon lock along a 3D spine curve
 * with flat-ribbon width (`widthM`), thin anatomical depth (`thicknessM`), longitudinal strand grooves,
 * and smooth root-to-tip taper (eliminating unnatural round cylinder pipes!).
 */
function buildSculptedHairRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  widthM: number,
  thicknessM: number,
  tipTaperMode: 'blunt_hime' | 'feathered_wing' | 'wispy_tendril',
  segsU = 14,
  segsV = 24
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pt = new THREE.Vector3();
  const tang = new THREE.Vector3();
  const sideDir = new THREE.Vector3();
  const outNormal = new THREE.Vector3();
  const upRef = new THREE.Vector3(0, 0, 1);

  for (let iv = 0; iv <= segsV; iv++) {
    const v = iv / segsV;
    curve.getPointAt(v, pt);
    curve.getTangentAt(v, tang).normalize();

    // Compute local ribbon width axis (tangent x outward-Z/X)
    upRef.set(pt.x * 2.2, 0.15, pt.z + 0.08).normalize();
    sideDir.crossVectors(tang, upRef).normalize();
    outNormal.crossVectors(sideDir, tang).normalize();

    let widthProfile = 1.0;
    if (tipTaperMode === 'blunt_hime') {
      // Hime cut stays wide and flat all the way to 92% length, then crisply bevels at the horizontal step-cut edge
      widthProfile =
        v < 0.12
          ? 0.75 + (v / 0.12) * 0.25
          : v > 0.92
          ? Math.max(0.68, 1.0 - ((v - 0.92) / 0.08) * 0.32)
          : 1.0 + Math.sin(v * Math.PI) * 0.06;
    } else if (tipTaperMode === 'feathered_wing') {
      widthProfile =
        v < 0.15
          ? 0.65 + (v / 0.15) * 0.35
          : v > 0.65
          ? Math.max(0.12, 1.0 - Math.pow((v - 0.65) / 0.35, 1.3) * 0.88)
          : 1.0 + Math.sin(v * Math.PI) * 0.22;
    } else {
      // wispy_tendril
      widthProfile = Math.max(0.08, (1.0 - v * 0.85) * Math.sin(Math.min(1, v * 4) * Math.PI * 0.5));
    }

    for (let iu = 0; iu <= segsU; iu++) {
      const u = iu / segsU;
      const centeredU = (u - 0.5) * 2.0; // -1 .. +1
      const edgeTaper = Math.sqrt(Math.max(0.05, 1.0 - centeredU * centeredU * 0.85));
      const strandGroove = Math.sin(u * Math.PI * 7) * 0.0008;
      const archC = (1.0 - centeredU * centeredU) * thicknessM + strandGroove;

      const vx =
        pt.x +
        sideDir.x * (centeredU * widthM * 0.5 * widthProfile) +
        outNormal.x * archC * edgeTaper;
      const vy =
        pt.y +
        sideDir.y * (centeredU * widthM * 0.5 * widthProfile) +
        outNormal.y * archC * edgeTaper;
      const vz =
        pt.z +
        sideDir.z * (centeredU * widthM * 0.5 * widthProfile) +
        outNormal.z * archC * edgeTaper;

      vertices.push(vx, vy, vz);
      uvs.push(u, v);
    }
  }

  const rowStride = segsU + 1;
  for (let iv = 0; iv < segsV; iv++) {
    for (let iu = 0; iu < segsU; iu++) {
      const a = iv * rowStride + iu;
      const b = a + 1;
      const c = (iv + 1) * rowStride + iu;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createHeadHairSystem(
  headBone: THREE.Bone,
  cleanSinglePieceHair: THREE.SkinnedMesh,
  cleanBasePos: Float32Array,
  twoBunchHair: THREE.SkinnedMesh | null,
  isMale: boolean
): HeadHairSystem {
  const hairStrandMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFFFFF'),
    map: getProceduralHairStrandTexture('#2D1E18'),
    bumpMap: getSharedHairBumpTexture(),
    bumpScale: 0.0058,
    roughness: 0.4,
    metalness: 0.07,
    side: THREE.DoubleSide,
  });

  const accessoryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D4AF37'),
    roughness: 0.28,
    metalness: 0.65,
  });

  const zShift = isMale ? -0.008 : 0;
  const yShift = isMale ? 0.006 : 0;

  // 1. High Ponytail Attachment (`high_ponytail`)
  const ponytailAttachment = new THREE.Group();
  ponytailAttachment.visible = false;
  {
    const scrunchyGeo = new THREE.TorusGeometry(0.024, 0.007, 12, 28);
    const scrunchy = new THREE.Mesh(scrunchyGeo, accessoryMat);
    scrunchy.position.set(0, 0.108 + yShift, -0.092 + zShift);
    scrunchy.rotation.x = Math.PI * 0.35;
    ponytailAttachment.add(scrunchy);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.108 + yShift, -0.09 + zShift),
      new THREE.Vector3(0, 0.122 + yShift, -0.132 + zShift),
      new THREE.Vector3(0, 0.045 + yShift, -0.162 + zShift),
      new THREE.Vector3(0, -0.085 + yShift, -0.152 + zShift),
      new THREE.Vector3(0, -0.22 + yShift, -0.165 + zShift),
    ]);
    const tailGeo = new THREE.TubeGeometry(curve, 32, 0.042, 18, false);
    const tPos = tailGeo.attributes.position as THREE.BufferAttribute;
    const center = new THREE.Vector3();
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      curve.getPointAt(t, center);
      const profile =
        t < 0.15
          ? 0.52 + (t / 0.15) * 0.48
          : t > 0.65
          ? Math.max(0.08, 1.0 - ((t - 0.65) / 0.35) * 0.92)
          : 1.0 + Math.sin(t * Math.PI) * 0.2;
      for (let j = 0; j <= 18; j++) {
        const idx = i * 19 + j;
        const angle = (j / 18) * Math.PI * 2;
        const strandWave = 1.0 + Math.sin(angle * 8 + t * 10) * 0.06;
        const dx = (tPos.getX(idx) - center.x) * profile * 1.22 * strandWave;
        const dy = (tPos.getY(idx) - center.y) * profile;
        const dz = (tPos.getZ(idx) - center.z) * profile * 0.72 * strandWave;
        tPos.setXYZ(idx, center.x + dx, center.y + dy, center.z + dz);
      }
    }
    tailGeo.computeVertexNormals();
    const tailMesh = new THREE.Mesh(tailGeo, hairStrandMat);
    tailMesh.castShadow = true;
    ponytailAttachment.add(tailMesh);
  }
  headBone.add(ponytailAttachment);

  // 2. Sculpted Multi-Coil Braided High Crown Bun (`updo_bun`)
  const bunAttachment = new THREE.Group();
  bunAttachment.visible = false;
  {
    // Subtle satin/gold hair band seated flush against the crown
    const tieGeo = new THREE.TorusGeometry(0.036, 0.0055, 12, 32);
    const tie = new THREE.Mesh(tieGeo, accessoryMat);
    tie.position.set(0, 0.152 + yShift, -0.052 + zShift);
    tie.rotation.x = Math.PI * 0.36;
    bunAttachment.add(tie);

    // Outer twisted braided hair coil ring
    const outerCoilGeo = new THREE.TorusGeometry(0.032, 0.022, 20, 40);
    const ocPos = outerCoilGeo.attributes.position;
    for (let i = 0; i < ocPos.count; i++) {
      const vx = ocPos.getX(i);
      const vy = ocPos.getY(i);
      const vz = ocPos.getZ(i);
      const theta = Math.atan2(vy, vx);
      const twist = Math.sin(theta * 10) * 0.0028;
      ocPos.setXYZ(i, vx * 1.08 + twist, vy * 1.05 + twist, vz * 0.88);
    }
    outerCoilGeo.computeVertexNormals();
    const outerCoilMesh = new THREE.Mesh(outerCoilGeo, hairStrandMat);
    outerCoilMesh.position.set(0, 0.172 + yShift, -0.062 + zShift);
    outerCoilMesh.rotation.x = Math.PI * 0.36;
    outerCoilMesh.castShadow = true;
    bunAttachment.add(outerCoilMesh);

    // Inner tucked bun core
    const coreGeo = new THREE.SphereGeometry(0.034, 24, 18);
    coreGeo.scale(1.12, 0.82, 1.04);
    const coreMesh = new THREE.Mesh(coreGeo, hairStrandMat);
    coreMesh.position.set(0, 0.176 + yShift, -0.064 + zShift);
    coreMesh.castShadow = true;
    bunAttachment.add(coreMesh);
  }
  headBone.add(bunAttachment);

  // 3. Sculpted Korean Figure-8 Low Chignon + Wispy Temple Tendrils (`low_chignon`)
  const lowChignonAttachment = new THREE.Group();
  lowChignonAttachment.visible = false;
  {
    const pinGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.088, 10);
    pinGeo.rotateZ(Math.PI * 0.42);
    const hairPin = new THREE.Mesh(pinGeo, accessoryMat);
    hairPin.position.set(0, 0.015 + yShift, -0.112 + zShift);
    lowChignonAttachment.add(hairPin);

    // Left & right interlocking twisted chignon loops at the nape
    [-1, 1].forEach((side) => {
      const loopGeo = new THREE.TorusGeometry(0.024, 0.016, 16, 32);
      loopGeo.scale(1.15, 0.92, 0.82);
      const loopMesh = new THREE.Mesh(loopGeo, hairStrandMat);
      loopMesh.position.set(side * 0.016, 0.01 + yShift, -0.104 + zShift);
      loopMesh.rotation.set(Math.PI * 0.12, side * 0.28, side * 0.35);
      loopMesh.castShadow = true;
      lowChignonAttachment.add(loopMesh);
    });

    const centerKnotGeo = new THREE.SphereGeometry(0.032, 20, 16);
    centerKnotGeo.scale(1.28, 0.88, 0.85);
    const centerKnot = new THREE.Mesh(centerKnotGeo, hairStrandMat);
    centerKnot.position.set(0, 0.01 + yShift, -0.106 + zShift);
    centerKnot.castShadow = true;
    lowChignonAttachment.add(centerKnot);

    // Delicate wispy Korean S-wave temple tendrils framing the OUTER face (strictly outside x = ±0.076 so face is never covered)
    [-1, 1].forEach((side) => {
      const wispCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.074, 0.125, 0.024),
        new THREE.Vector3(side * 0.080, 0.068, 0.030),
        new THREE.Vector3(side * 0.078, 0.010, 0.026),
        new THREE.Vector3(side * 0.074, -0.038, 0.022),
      ]);
      const wispGeo = buildSculptedHairRibbonGeometry(
        wispCurve,
        0.014,
        0.0035,
        'wispy_tendril',
        10,
        18
      );
      const wispMesh = new THREE.Mesh(wispGeo, hairStrandMat);
      wispMesh.castShadow = true;
      lowChignonAttachment.add(wispMesh);
    });
  }
  headBone.add(lowChignonAttachment);

  // 4. Seamless Contoured 3D Curved Back-Hair Mantle (`long_wavy`, `long_straight`, `curly_voluminous`, `korean_hime_layer`, `butterfly_wolf_cut`, and new long female styles)
  const longBackHairAttachment = new THREE.Group();
  longBackHairAttachment.visible = false;
  {
    const segsU = 56;
    const segsV = 34;
    const mantleGeo = new THREE.BufferGeometry();
    const mVerts: number[] = [];
    const mUvs: number[] = [];
    const mIndices: number[] = [];

    for (let iv = 0; iv <= segsV; iv++) {
      const v = iv / segsV; // 0 = inside occipital crown (+0.122), 1 = lower back hem (-0.255)
      const y = 0.122 - v * 0.377;
      const drapeFlare = smoothstep(0.12, 0.88, v);
      const tipTaper = v > 0.80 ? Math.max(0.18, 1.0 - ((v - 0.80) / 0.20) * 0.82) : 1.0;

      for (let iu = 0; iu <= segsU; iu++) {
        const u = iu / segsU; // 0 = left temple, 0.5 = center back, 1 = right temple
        const angle = (u - 0.5) * Math.PI * 1.18; // spans behind the ears so it never wraps over the cheeks
        const lockWave =
          (Math.sin(u * Math.PI * 16) * 0.0048 + Math.cos(u * Math.PI * 8) * 0.0028) *
          smoothstep(0.08, 0.92, v) *
          tipTaper;
        const sWaveY = Math.sin(v * Math.PI * 2.8 + Math.abs(u - 0.5) * 4.2) * 0.0065 * drapeFlare;

        const baseRadiusX = 0.078 + drapeFlare * 0.028;
        const baseRadiusZ = 0.080 + drapeFlare * 0.022;

        const vx = Math.sin(angle) * (baseRadiusX + lockWave);
        const vz = -Math.cos(angle) * (baseRadiusZ + lockWave) - 0.022 + sWaveY;
        const vy = y - (1.0 - Math.cos(angle * 0.55)) * 0.014;

        mVerts.push(vx, vy, vz);
        mUvs.push(u * 2.5, v * 1.4);
      }
    }

    const stride = segsU + 1;
    for (let iv = 0; iv < segsV; iv++) {
      for (let iu = 0; iu < segsU; iu++) {
        const a = iv * stride + iu;
        const b = a + 1;
        const c = (iv + 1) * stride + iu;
        const d = c + 1;
        mIndices.push(a, b, d);
        mIndices.push(a, d, c);
      }
    }

    mantleGeo.setAttribute('position', new THREE.Float32BufferAttribute(mVerts, 3));
    mantleGeo.setAttribute('uv', new THREE.Float32BufferAttribute(mUvs, 2));
    mantleGeo.setIndex(mIndices);
    mantleGeo.computeVertexNormals();

    const mantleMesh = new THREE.Mesh(mantleGeo, hairStrandMat);
    mantleMesh.castShadow = true;
    mantleMesh.receiveShadow = true;
    longBackHairAttachment.add(mantleMesh);

    // Outer shoulder-draping silk locks positioned strictly outside the face width (|x| >= 0.082)
    [-1, 1].forEach((side) => {
      const fSegsU = 16;
      const fSegsV = 24;
      const frontLockGeo = new THREE.BufferGeometry();
      const fVerts: number[] = [];
      const fUvs: number[] = [];
      const fIndices: number[] = [];

      for (let iv = 0; iv <= fSegsV; iv++) {
        const v = iv / fSegsV;
        const y = 0.095 - v * 0.28;
        const lockWidth = (0.014 + 0.012 * Math.sin(v * Math.PI * 0.82)) * (1.0 - 0.55 * smoothstep(0.75, 1.0, v));
        const forwardArc = smoothstep(0.22, 0.80, v) * 0.032;
        const waveX = Math.sin(v * Math.PI * 2.4) * 0.004 * side;
        const centerX = side * (0.082 + 0.014 * smoothstep(0.1, 0.65, v)) + waveX;
        const centerZ = -0.006 + forwardArc + Math.cos(v * Math.PI * 2.2) * 0.003;

        for (let iu = 0; iu <= fSegsU; iu++) {
          const u = iu / fSegsU;
          const uCentered = (u - 0.5) * 2.0;
          const archZ = (1.0 - uCentered * uCentered) * 0.0055;
          const vx = centerX + side * uCentered * lockWidth;
          const vy = y;
          const vz = centerZ + archZ;
          fVerts.push(vx, vy, vz);
          fUvs.push(u, v);
        }
      }

      const fStride = fSegsU + 1;
      for (let iv = 0; iv < fSegsV; iv++) {
        for (let iu = 0; iu < fSegsU; iu++) {
          const a = iv * fStride + iu;
          const b = a + 1;
          const c = (iv + 1) * fStride + iu;
          const d = c + 1;
          fIndices.push(a, b, d);
          fIndices.push(a, d, c);
        }
      }

      frontLockGeo.setAttribute('position', new THREE.Float32BufferAttribute(fVerts, 3));
      frontLockGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fUvs, 2));
      frontLockGeo.setIndex(fIndices);
      frontLockGeo.computeVertexNormals();

      const frontLockMesh = new THREE.Mesh(frontLockGeo, hairStrandMat);
      frontLockMesh.castShadow = true;
      frontLockMesh.receiveShadow = true;
      longBackHairAttachment.add(frontLockMesh);
    });
  }
  headBone.add(longBackHairAttachment);

  // 5. Authentic Flat Silk Cheek-Framing Hime Side-Cut Panels (`korean_hime_layer`) — positioned outside face width (|x| >= 0.076)
  const himeSideLocksAttachment = new THREE.Group();
  himeSideLocksAttachment.visible = false;
  {
    [-1, 1].forEach((side) => {
      const himeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.076, 0.125, 0.018),
        new THREE.Vector3(side * 0.080, 0.062, 0.026),
        new THREE.Vector3(side * 0.078, -0.002, 0.028),
        new THREE.Vector3(side * 0.074, -0.052, 0.026),
      ]);
      const himeGeo = buildSculptedHairRibbonGeometry(
        himeCurve,
        0.024,
        0.005,
        'blunt_hime',
        16,
        24
      );
      const himeMesh = new THREE.Mesh(himeGeo, hairStrandMat);
      himeMesh.castShadow = true;
      himeSideLocksAttachment.add(himeMesh);

      const subLayerCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.080, 0.11, -0.004),
        new THREE.Vector3(side * 0.086, 0.03, 0.004),
        new THREE.Vector3(side * 0.086, -0.055, 0.008),
        new THREE.Vector3(side * 0.082, -0.135, 0.012),
      ]);
      const subGeo = buildSculptedHairRibbonGeometry(
        subLayerCurve,
        0.026,
        0.005,
        'feathered_wing',
        14,
        22
      );
      const subMesh = new THREE.Mesh(subGeo, hairStrandMat);
      subMesh.castShadow = true;
      himeSideLocksAttachment.add(subMesh);
    });
  }
  headBone.add(himeSideLocksAttachment);

  // 6. Dedicated Feathered Butterfly Layer Wings (`butterfly_wolf_cut`) — strictly outside face width
  const butterflyWingsAttachment = new THREE.Group();
  butterflyWingsAttachment.visible = false;
  {
    [-1, 1].forEach((side) => {
      const upperWingCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.058, 0.148, 0.044),
        new THREE.Vector3(side * 0.080, 0.095, 0.034),
        new THREE.Vector3(side * 0.090, 0.028, 0.022),
        new THREE.Vector3(side * 0.096, -0.032, 0.010),
      ]);
      const upperWingGeo = buildSculptedHairRibbonGeometry(
        upperWingCurve,
        0.028,
        0.0055,
        'feathered_wing',
        16,
        24
      );
      const upperWingMesh = new THREE.Mesh(upperWingGeo, hairStrandMat);
      upperWingMesh.castShadow = true;
      butterflyWingsAttachment.add(upperWingMesh);

      const midWingCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.078, 0.095, 0.004),
        new THREE.Vector3(side * 0.090, 0.015, 0.008),
        new THREE.Vector3(side * 0.098, -0.068, 0.008),
        new THREE.Vector3(side * 0.106, -0.135, 0.014),
      ]);
      const midWingGeo = buildSculptedHairRibbonGeometry(
        midWingCurve,
        0.032,
        0.0055,
        'feathered_wing',
        16,
        24
      );
      const midWingMesh = new THREE.Mesh(midWingGeo, hairStrandMat);
      midWingMesh.castShadow = true;
      butterflyWingsAttachment.add(midWingMesh);

      const lowerWingCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.080, 0.065, -0.022),
        new THREE.Vector3(side * 0.092, -0.035, -0.018),
        new THREE.Vector3(side * 0.100, -0.125, -0.008),
        new THREE.Vector3(side * 0.110, -0.205, 0.006),
      ]);
      const lowerWingGeo = buildSculptedHairRibbonGeometry(
        lowerWingCurve,
        0.034,
        0.0055,
        'feathered_wing',
        16,
        24
      );
      const lowerWingMesh = new THREE.Mesh(lowerWingGeo, hairStrandMat);
      lowerWingMesh.castShadow = true;
      butterflyWingsAttachment.add(lowerWingMesh);
    });
  }
  headBone.add(butterflyWingsAttachment);

  // 6B. 6 New 3D Female Hairstyles Extracted from Reference Image 1 (Zero Face Occlusion!)
  const femaleCustomLocksAttachment = new THREE.Group();
  femaleCustomLocksAttachment.visible = false;
  {
    // Style 1 (Top-Left): `female_side_ponytail_sweep` (Tóc Đuôi Lệch Vai Mái Vòm)
    const sidePonytailGrp = new THREE.Group();
    sidePonytailGrp.name = 'fem_side_ponytail';
    {
      // Long curved side ponytail sweeping from behind right ear over right shoulder down to chest
      const mainTailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.072, 0.085, -0.028),
        new THREE.Vector3(-0.092, 0.015, 0.005),
        new THREE.Vector3(-0.098, -0.065, 0.032),
        new THREE.Vector3(-0.082, -0.155, 0.048),
        new THREE.Vector3(-0.052, -0.245, 0.056),
      ]);
      const mainTailGeo = buildSculptedHairRibbonGeometry(
        mainTailCurve,
        0.046,
        0.010,
        'feathered_wing',
        16,
        28
      );
      const mainTailMesh = new THREE.Mesh(mainTailGeo, hairStrandMat);
      mainTailMesh.castShadow = true;
      sidePonytailGrp.add(mainTailMesh);

      const innerTailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.068, 0.075, -0.018),
        new THREE.Vector3(-0.084, -0.010, 0.015),
        new THREE.Vector3(-0.086, -0.095, 0.038),
        new THREE.Vector3(-0.062, -0.195, 0.052),
      ]);
      sidePonytailGrp.add(
        new THREE.Mesh(
          buildSculptedHairRibbonGeometry(innerTailCurve, 0.034, 0.007, 'wispy_tendril', 14, 24),
          hairStrandMat
        )
      );
    }
    femaleCustomLocksAttachment.add(sidePonytailGrp);

    // Style 2 (Top-Middle): `female_side_swept_layered` (Tóc Dài Tỉa Layer Mái Xéo)
    const sideLayeredGrp = new THREE.Group();
    sideLayeredGrp.name = 'fem_side_layered';
    {
      // Diagonal forehead-skimming side bang (strictly above eyebrow y >= 0.128 so face is 100% open!)
      const diagBangCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.028, 0.162, 0.064),
        new THREE.Vector3(-0.012, 0.150, 0.078),
        new THREE.Vector3(-0.052, 0.134, 0.064),
        new THREE.Vector3(-0.076, 0.112, 0.034),
      ]);
      sideLayeredGrp.add(
        new THREE.Mesh(
          buildSculptedHairRibbonGeometry(diagBangCurve, 0.028, 0.0055, 'feathered_wing', 14, 20),
          hairStrandMat
        )
      );

      // Feathered multi-strand straight layers cascading down both shoulders outside the face
      [-1, 1].forEach((side) => {
        [0, 1, 2].forEach((tier) => {
          const xBase = side * (0.080 + tier * 0.008);
          const zBase = 0.018 - tier * 0.014;
          const layerCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(xBase * 0.92, 0.110 - tier * 0.015, zBase),
            new THREE.Vector3(xBase * 1.04, 0.015 - tier * 0.020, zBase + 0.010),
            new THREE.Vector3(xBase * 1.08, -0.095 - tier * 0.025, zBase + 0.018),
            new THREE.Vector3(xBase * 1.02, -0.215 - tier * 0.025, zBase + 0.022),
          ]);
          sideLayeredGrp.add(
            new THREE.Mesh(
              buildSculptedHairRibbonGeometry(
                layerCurve,
                0.028 - tier * 0.003,
                0.0055,
                tier === 2 ? 'wispy_tendril' : 'feathered_wing',
                14,
                24
              ),
              hairStrandMat
            )
          );
        });
      });
    }
    femaleCustomLocksAttachment.add(sideLayeredGrp);

    // Style 3 (Top-Right): `female_blunt_bang_twin_curls` (Tóc Xoăn Lọn Lớn Mái Bằng)
    const twinCurlsGrp = new THREE.Group();
    twinCurlsGrp.name = 'fem_twin_curls';
    {
      // Neat blunt forehead bangs sitting cleanly above the eyebrows (y = 0.130..0.162)
      [-0.036, -0.018, 0, 0.018, 0.036].forEach((xOff) => {
        const archZ = Math.cos((xOff / 0.05) * Math.PI * 0.5) * 0.010;
        const bangCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(xOff * 0.85, 0.165, 0.048 + archZ),
          new THREE.Vector3(xOff * 0.95, 0.148, 0.072 + archZ),
          new THREE.Vector3(xOff, 0.128, 0.076 + archZ),
        ]);
        twinCurlsGrp.add(
          new THREE.Mesh(
            buildSculptedHairRibbonGeometry(bangCurve, 0.022, 0.0055, 'blunt_hime', 10, 16),
            hairStrandMat
          )
        );
      });

      // Twin voluminous spiral S-curl locks cascading down both shoulders
      [-1, 1].forEach((side) => {
        [0, 1].forEach((layerIdx) => {
          const zOff = layerIdx * 0.014;
          const spiralCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.078, 0.105, 0.012 - zOff),
            new THREE.Vector3(side * 0.096, 0.035, 0.026 - zOff),
            new THREE.Vector3(side * 0.082, -0.035, 0.036 - zOff),
            new THREE.Vector3(side * 0.104, -0.105, 0.028 - zOff),
            new THREE.Vector3(side * 0.086, -0.175, 0.038 - zOff),
            new THREE.Vector3(side * 0.098, -0.235, 0.028 - zOff),
          ]);
          twinCurlsGrp.add(
            new THREE.Mesh(
              buildSculptedHairRibbonGeometry(
                spiralCurve,
                0.040 - layerIdx * 0.006,
                0.0085,
                'feathered_wing',
                16,
                30
              ),
              hairStrandMat
            )
          );
        });
      });
    }
    femaleCustomLocksAttachment.add(twinCurlsGrp);

    // Style 4 (Bottom-Left): `female_center_wavy_feather` (Tóc Dài Rẽ Ngôi Uốn Lượn Đuôi)
    const centerWavyGrp = new THREE.Group();
    centerWavyGrp.name = 'fem_center_wavy';
    {
      [-1, 1].forEach((side) => {
        // S-wave shoulder locks curving around outer jawline and flipping outward at the ends
        [0, 1].forEach((tier) => {
          const waveCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.068, 0.135, 0.030 - tier * 0.014),
            new THREE.Vector3(side * 0.086, 0.055, 0.024 - tier * 0.014),
            new THREE.Vector3(side * 0.078, -0.025, 0.028 - tier * 0.012),
            new THREE.Vector3(side * 0.096, -0.115, 0.034 - tier * 0.012),
            new THREE.Vector3(side * (0.114 + tier * 0.008), -0.205, 0.042 - tier * 0.010),
          ]);
          centerWavyGrp.add(
            new THREE.Mesh(
              buildSculptedHairRibbonGeometry(
                waveCurve,
                0.036 - tier * 0.006,
                0.0068,
                'feathered_wing',
                16,
                26
              ),
              hairStrandMat
            )
          );
        });
      });
    }
    femaleCustomLocksAttachment.add(centerWavyGrp);

    // Style 5 (Bottom-Middle): `female_center_inward_lob` (Tóc Ngang Vai Rẽ Ngôi Uốn Cụp)
    const inwardLobGrp = new THREE.Group();
    inwardLobGrp.name = 'fem_inward_lob';
    {
      [-1, 1].forEach((side) => {
        // Voluminous bell-shaped medium lob with thick inward C-curl at collarbone
        [-0.018, 0.0, 0.018].forEach((zOff, idx) => {
          const lobCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.066, 0.138, 0.022 + zOff),
            new THREE.Vector3(side * 0.088, 0.065, 0.020 + zOff),
            new THREE.Vector3(side * 0.106, -0.025, 0.018 + zOff),
            new THREE.Vector3(side * 0.102, -0.098, 0.022 + zOff),
            new THREE.Vector3(side * 0.074, -0.138, 0.028 + zOff),
          ]);
          inwardLobGrp.add(
            new THREE.Mesh(
              buildSculptedHairRibbonGeometry(
                lobCurve,
                idx === 1 ? 0.044 : 0.036,
                0.0082,
                'blunt_hime',
                16,
                26
              ),
              hairStrandMat
            )
          );
        });
      });
    }
    femaleCustomLocksAttachment.add(inwardLobGrp);

    // Style 6 (Bottom-Right): `female_side_low_bun_tendrils` (Tóc Búi Thấp Lệch Vai Mai Rơi)
    const sideLowBunGrp = new THREE.Group();
    sideLowBunGrp.name = 'fem_side_low_bun';
    {
      // Multi-coil low side bun resting behind the right ear/nape
      const bunCoreGeo = new THREE.SphereGeometry(0.038, 22, 18);
      bunCoreGeo.scale(1.15, 0.95, 0.92);
      const bunCore = new THREE.Mesh(bunCoreGeo, hairStrandMat);
      bunCore.position.set(-0.062, 0.005, -0.062);
      bunCore.castShadow = true;
      sideLowBunGrp.add(bunCore);

      const bunCoilGeo = new THREE.TorusGeometry(0.028, 0.016, 16, 32);
      const bunCoil = new THREE.Mesh(bunCoilGeo, hairStrandMat);
      bunCoil.position.set(-0.068, 0.004, -0.064);
      bunCoil.rotation.set(0.3, -0.6, 0.4);
      bunCoil.castShadow = true;
      sideLowBunGrp.add(bunCoil);

      // Loose wavy tendrils dropping below the right side bun
      const bunWispCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.066, -0.015, -0.055),
        new THREE.Vector3(-0.078, -0.065, -0.035),
        new THREE.Vector3(-0.068, -0.115, -0.020),
      ]);
      sideLowBunGrp.add(
        new THREE.Mesh(
          buildSculptedHairRibbonGeometry(bunWispCurve, 0.022, 0.0045, 'wispy_tendril', 12, 18),
          hairStrandMat
        )
      );

      // Delicate side-framing temple tendrils on the opposite (left) side outside the cheek
      const leftTendrilCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.074, 0.118, 0.026),
        new THREE.Vector3(0.082, 0.048, 0.030),
        new THREE.Vector3(0.078, -0.025, 0.026),
        new THREE.Vector3(0.072, -0.085, 0.020),
      ]);
      sideLowBunGrp.add(
        new THREE.Mesh(
          buildSculptedHairRibbonGeometry(leftTendrilCurve, 0.020, 0.0042, 'wispy_tendril', 12, 20),
          hairStrandMat
        )
      );
    }
    femaleCustomLocksAttachment.add(sideLowBunGrp);
  }
  headBone.add(femaleCustomLocksAttachment);

  // 7. 3D Sculpted Male Barbershop & Salon Forelocks & Crown Layers (`maleCrownLocksAttachment`)
  //    All forehead fringes stay strictly above the male eyebrows (y >= 0.126 in headBone local space) so the face is never covered!
  const maleCrownLocksAttachment = new THREE.Group();
  maleCrownLocksAttachment.visible = false;
  {
    // Group A: Rounded Bowl / Textured Crop (`male_rounded_bowl`, `male_choppy_textured_crop`, `mushroom_cut`)
    const mushroomGroup = new THREE.Group();
    mushroomGroup.name = 'male_mushroom';
    [-0.052, -0.034, -0.017, 0.0, 0.017, 0.034, 0.052].forEach((xOff, idx) => {
      const archFactor = Math.cos((xOff / 0.062) * Math.PI * 0.5);
      const zFront = 0.068 + archFactor * 0.018;
      const microSplit = (idx % 2 === 0 ? 1 : -1) * 0.0022;
      const mCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOff * 0.75, 0.172 + yShift, 0.028 + zShift),
        new THREE.Vector3(xOff * 0.92, 0.158 + yShift, zFront * 0.90 + zShift),
        new THREE.Vector3(xOff * 1.00 + microSplit, 0.138 + yShift, zFront + zShift),
        new THREE.Vector3(xOff * 0.98 + microSplit * 0.5, 0.126 + yShift, zFront - 0.004 + zShift),
      ]);
      const mGeo = buildSculptedHairRibbonGeometry(
        mCurve,
        0.025,
        0.0065,
        'blunt_hime',
        12,
        18
      );
      const mMesh = new THREE.Mesh(mGeo, hairStrandMat);
      mMesh.castShadow = true;
      mushroomGroup.add(mMesh);
    });
    maleCrownLocksAttachment.add(mushroomGroup);

    // Group B: Center Curtain & Feathered Slick Back (`male_center_curtain_bob`, `male_feathered_slick_back`, `middle_part_curtain`)
    const curtainGroup = new THREE.Group();
    curtainGroup.name = 'male_curtain';
    [-1, 1].forEach((side) => {
      const outerCurtainCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.012, 0.168 + yShift, 0.058 + zShift),
        new THREE.Vector3(side * 0.042, 0.160 + yShift, 0.082 + zShift),
        new THREE.Vector3(side * 0.068, 0.136 + yShift, 0.068 + zShift),
        new THREE.Vector3(side * 0.078, 0.112 + yShift, 0.038 + zShift),
      ]);
      const outerGeo = buildSculptedHairRibbonGeometry(
        outerCurtainCurve,
        0.032,
        0.0065,
        'feathered_wing',
        14,
        20
      );
      const outerMesh = new THREE.Mesh(outerGeo, hairStrandMat);
      outerMesh.castShadow = true;
      curtainGroup.add(outerMesh);

      const crownLiftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.014, 0.172 + yShift, 0.032 + zShift),
        new THREE.Vector3(side * 0.050, 0.162 + yShift, 0.052 + zShift),
        new THREE.Vector3(side * 0.076, 0.132 + yShift, 0.032 + zShift),
      ]);
      const liftGeo = buildSculptedHairRibbonGeometry(
        crownLiftCurve,
        0.028,
        0.0058,
        'feathered_wing',
        12,
        18
      );
      curtainGroup.add(new THREE.Mesh(liftGeo, hairStrandMat));
    });
    maleCrownLocksAttachment.add(curtainGroup);

    // Group C: Curved Side Comma 8/2 (`male_curved_side_comma`, `comma_hair_korean`)
    const commaGroup = new THREE.Group();
    commaGroup.name = 'male_comma';
    {
      const mainCommaCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.022, 0.168 + yShift, 0.060 + zShift),
        new THREE.Vector3(0.022, 0.170 + yShift, 0.086 + zShift),
        new THREE.Vector3(0.052, 0.146 + yShift, 0.088 + zShift),
        new THREE.Vector3(0.038, 0.128 + yShift, 0.082 + zShift),
      ]);
      commaGroup.add(
        new THREE.Mesh(
          buildSculptedHairRibbonGeometry(mainCommaCurve, 0.032, 0.0068, 'feathered_wing', 14, 22),
          hairStrandMat
        )
      );

      const leftSweepCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.026, 0.164 + yShift, 0.060 + zShift),
        new THREE.Vector3(-0.058, 0.148 + yShift, 0.068 + zShift),
        new THREE.Vector3(-0.076, 0.122 + yShift, 0.038 + zShift),
      ]);
      commaGroup.add(
        new THREE.Mesh(
          buildSculptedHairRibbonGeometry(leftSweepCurve, 0.028, 0.0058, 'feathered_wing', 12, 18),
          hairStrandMat
        )
      );
    }
    maleCrownLocksAttachment.add(commaGroup);

    // Group D: Classic Side Part 7/3 Wave & Ivy League (`male_classic_side_wave`, `male_ivy_league_part`, `male_widows_peak_classic`, `slicked_side_part`)
    const sidePartGroup = new THREE.Group();
    sidePartGroup.name = 'male_side_part';
    {
      [0.0, 0.018, 0.036, 0.052].forEach((zBackOff, idx) => {
        const spCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.032, 0.160 + yShift, 0.072 - zBackOff + zShift),
          new THREE.Vector3(-0.004, 0.182 + yShift - idx * 0.003, 0.078 - zBackOff + zShift),
          new THREE.Vector3(0.038, 0.176 + yShift - idx * 0.003, 0.064 - zBackOff + zShift),
          new THREE.Vector3(0.070, 0.148 + yShift - idx * 0.004, 0.034 - zBackOff + zShift),
        ]);
        const spGeo = buildSculptedHairRibbonGeometry(
          spCurve,
          0.032,
          0.0068,
          'feathered_wing',
          14,
          20
        );
        sidePartGroup.add(new THREE.Mesh(spGeo, hairStrandMat));
      });

      const leftSleekCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.044, 0.152 + yShift, 0.058 + zShift),
        new THREE.Vector3(-0.068, 0.132 + yShift, 0.040 + zShift),
        new THREE.Vector3(-0.076, 0.104 + yShift, 0.008 + zShift),
      ]);
      sidePartGroup.add(
        new THREE.Mesh(
          buildSculptedHairRibbonGeometry(leftSleekCurve, 0.028, 0.0048, 'feathered_wing', 12, 16),
          hairStrandMat
        )
      );
    }
    maleCrownLocksAttachment.add(sidePartGroup);

    // Group E: Wavy Quiff, Sleek Pompadour, High Undercut Crest & Faux Hawk (`male_wavy_quiff`, `male_sleek_pompadour`, `male_high_undercut_crest`, `male_faux_hawk_crest`, `undercut_quiff`)
    const quiffGroup = new THREE.Group();
    quiffGroup.name = 'male_quiff';
    [-0.034, -0.017, 0.0, 0.017, 0.034].forEach((xOff, idx) => {
      const centerBoost = 1.0 - Math.abs(xOff) * 8.5;
      const tiltX = xOff * 0.25 + (idx % 2 === 0 ? 0.004 : -0.004);
      const qCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOff * 0.92, 0.154 + yShift, 0.076 + zShift),
        new THREE.Vector3(
          xOff + tiltX,
          0.188 + centerBoost * 0.012 + yShift,
          0.084 + centerBoost * 0.006 + zShift
        ),
        new THREE.Vector3(
          xOff * 1.05 + tiltX,
          0.184 + centerBoost * 0.008 + yShift,
          0.030 + zShift
        ),
        new THREE.Vector3(xOff * 0.95, 0.164 + yShift, -0.034 + zShift),
      ]);
      const qGeo = buildSculptedHairRibbonGeometry(
        qCurve,
        0.028,
        0.0075,
        'feathered_wing',
        14,
        22
      );
      quiffGroup.add(new THREE.Mesh(qGeo, hairStrandMat));
    });
    maleCrownLocksAttachment.add(quiffGroup);

    // Group F: Spiky Quiff, Jagged Fringe & Wispy Korean Bangs (`male_spiky_quiff`, `male_jagged_fringe`, `male_wispy_korean_bangs`, `short_textured_crop`)
    const cropGroup = new THREE.Group();
    cropGroup.name = 'male_crop';
    [-0.044, -0.026, -0.009, 0.009, 0.026, 0.044].forEach((xOff, idx) => {
      const archZ = Math.cos((xOff / 0.055) * Math.PI * 0.5) * 0.014;
      const diagSkew = (idx % 2 === 0 ? 1 : -1) * 0.0045;
      const cropCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOff * 0.80, 0.172 + yShift, 0.018 + zShift),
        new THREE.Vector3(xOff * 0.92 + diagSkew, 0.164 + yShift, 0.056 + archZ + zShift),
        new THREE.Vector3(xOff * 0.98 + diagSkew * 0.6, 0.144 + yShift, 0.076 + archZ + zShift),
        new THREE.Vector3(xOff * 0.96, 0.128 + yShift, 0.078 + archZ + zShift),
      ]);
      const cropGeo = buildSculptedHairRibbonGeometry(
        cropCurve,
        0.022,
        0.0060,
        'feathered_wing',
        12,
        18
      );
      cropGroup.add(new THREE.Mesh(cropGeo, hairStrandMat));
    });
    maleCrownLocksAttachment.add(cropGroup);

    // Group G: Messy Spiky Wave (`male_messy_spiky_wave`, `male_curly_quiff`)
    const curlyGroup = new THREE.Group();
    curlyGroup.name = 'male_curly';
    [-0.048, -0.030, -0.015, 0.0, 0.015, 0.030, 0.048].forEach((xOff, idx) => {
      const zSign = idx % 2 === 0 ? 1 : -1;
      const archZ = Math.cos((xOff / 0.06) * Math.PI * 0.5) * 0.014;
      const curlCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOff * 0.78, 0.174 + yShift, 0.020 + zShift),
        new THREE.Vector3(xOff + zSign * 0.008, 0.168 + yShift, 0.060 + archZ + zShift),
        new THREE.Vector3(xOff - zSign * 0.009, 0.148 + yShift, 0.080 + archZ + zShift),
        new THREE.Vector3(xOff + zSign * 0.006, 0.130 + yShift, 0.082 + archZ + zShift),
      ]);
      const curlGeo = buildSculptedHairRibbonGeometry(
        curlCurve,
        0.025,
        0.0070,
        'feathered_wing',
        12,
        20
      );
      curlyGroup.add(new THREE.Mesh(curlGeo, hairStrandMat));
    });
    maleCrownLocksAttachment.add(curlyGroup);

    // Group H: Swept Fringe Layer, Long Side Swept & Emo Side Fringe (`male_swept_fringe_layer`, `male_long_side_swept`, `male_emo_side_fringe`, `two_block_layer`)
    const twoBlockGroup = new THREE.Group();
    twoBlockGroup.name = 'male_twoblock';
    [-0.046, -0.024, -0.004, 0.018, 0.042].forEach((xOff) => {
      const archZ = Math.cos((xOff / 0.058) * Math.PI * 0.5) * 0.015;
      const sweepX = 0.014 * (1.0 - Math.abs(xOff) * 8);
      const tbCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOff * 0.78, 0.170 + yShift, 0.030 + zShift),
        new THREE.Vector3(xOff * 0.94 + sweepX * 0.5, 0.158 + yShift, 0.070 + archZ + zShift),
        new THREE.Vector3(xOff * 1.02 + sweepX, 0.138 + yShift, 0.080 + archZ + zShift),
        new THREE.Vector3(xOff * 1.06 + sweepX * 1.3, 0.126 + yShift, 0.074 + archZ + zShift),
      ]);
      const tbGeo = buildSculptedHairRibbonGeometry(
        tbCurve,
        0.028,
        0.0062,
        'feathered_wing',
        12,
        20
      );
      twoBlockGroup.add(new THREE.Mesh(tbGeo, hairStrandMat));
    });
    maleCrownLocksAttachment.add(twoBlockGroup);

    // Group I: Shaggy Layered Wolf (`male_shaggy_layered_wolf`, `wolf_mullet_male`)
    const wolfFrontGroup = new THREE.Group();
    wolfFrontGroup.name = 'male_wolf_front';
    [-1, 1].forEach((side) => {
      const wolfBangCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.014, 0.168 + yShift, 0.058 + zShift),
        new THREE.Vector3(side * 0.042, 0.156 + yShift, 0.078 + zShift),
        new THREE.Vector3(side * 0.068, 0.132 + yShift, 0.068 + zShift),
        new THREE.Vector3(side * 0.078, 0.104 + yShift, 0.042 + zShift),
      ]);
      wolfFrontGroup.add(
        new THREE.Mesh(
          buildSculptedHairRibbonGeometry(wolfBangCurve, 0.028, 0.0062, 'feathered_wing', 12, 20),
          hairStrandMat
        )
      );
    });
    maleCrownLocksAttachment.add(wolfFrontGroup);
  }
  headBone.add(maleCrownLocksAttachment);

  // 8. Contoured 3D Multi-Tier Feathered Male Wolf-Mullet Nape Tail (`wolf_mullet_male`, `male_shaggy_layered_wolf`)
  const mulletTailAttachment = new THREE.Group();
  mulletTailAttachment.visible = false;
  {
    [-0.052, -0.034, -0.017, 0, 0.017, 0.034, 0.052].forEach((xOff, idx) => {
      const sideSign = xOff >= 0 ? 1 : -1;
      const isOuter = Math.abs(xOff) > 0.03;
      const mCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOff * 0.88, 0.072 + yShift, -0.064 + zShift),
        new THREE.Vector3(xOff * 1.04, 0.018 + yShift, -0.082 + zShift),
        new THREE.Vector3(
          xOff * 1.18 + sideSign * (isOuter ? 0.010 : 0.004),
          -0.038 + yShift - (idx === 3 ? 0.014 : 0),
          -0.088 + (isOuter ? 0.012 : 0) + zShift
        ),
        new THREE.Vector3(
          xOff * 1.26 + sideSign * (isOuter ? 0.016 : 0.006),
          -0.078 + yShift - (idx === 3 ? 0.016 : 0),
          -0.092 + (isOuter ? 0.020 : 0) + zShift
        ),
      ]);
      const mGeo = buildSculptedHairRibbonGeometry(
        mCurve,
        0.028,
        0.0058,
        'feathered_wing',
        12,
        20
      );
      const mMesh = new THREE.Mesh(mGeo, hairStrandMat);
      mMesh.castShadow = true;
      mulletTailAttachment.add(mMesh);
    });
  }
  headBone.add(mulletTailAttachment);

  return {
    cleanSinglePieceHair,
    cleanBasePos,
    twoBunchHair,
    ponytailAttachment,
    bunAttachment,
    lowChignonAttachment,
    longBackHairAttachment,
    himeSideLocksAttachment,
    butterflyWingsAttachment,
    femaleCustomLocksAttachment,
    maleCrownLocksAttachment,
    mulletTailAttachment,
    hairStrandMat,
    accessoryMat,
    appliedStyle: null,
    lastHairColor: '',
  };
}

const MALE_HAIRSTYLE_SET = new Set<HairstyleId>([
  'male_classic_side_wave',
  'male_wavy_quiff',
  'male_spiky_quiff',
  'male_swept_fringe_layer',
  'male_choppy_textured_crop',
  'male_sleek_pompadour',
  'male_curved_side_comma',
  'male_long_side_swept',
  'male_feathered_slick_back',
  'male_flat_crew_cut',
  'male_jagged_fringe',
  'male_high_undercut_crest',
  'male_rounded_bowl',
  'male_widows_peak_classic',
  'male_ivy_league_part',
  'male_faux_hawk_crest',
  'male_emo_side_fringe',
  'male_shaggy_layered_wolf',
  'male_center_curtain_bob',
  'male_messy_spiky_wave',
  'male_wispy_korean_bangs',
  'mushroom_cut',
  'middle_part_curtain',
  'comma_hair_korean',
  'slicked_side_part',
  'undercut_quiff',
  'short_textured_crop',
  'male_curly_quiff',
  'two_block_layer',
  'wolf_mullet_male',
  'buzz_crew_cut',
]);

function updateHeadHairSystem(
  sys: HeadHairSystem,
  style: HairstyleId,
  hairColorHex: string,
  _isMale: boolean
) {
  sys.ponytailAttachment.visible = style === 'high_ponytail';
  sys.bunAttachment.visible = style === 'updo_bun';
  sys.lowChignonAttachment.visible = style === 'low_chignon';
  sys.longBackHairAttachment.visible =
    style === 'long_wavy' ||
    style === 'long_straight' ||
    style === 'curly_voluminous' ||
    style === 'korean_hime_layer' ||
    style === 'butterfly_wolf_cut' ||
    style === 'female_side_swept_layered' ||
    style === 'female_blunt_bang_twin_curls' ||
    style === 'female_center_wavy_feather';
  sys.himeSideLocksAttachment.visible = style === 'korean_hime_layer';
  sys.butterflyWingsAttachment.visible = style === 'butterfly_wolf_cut';
  sys.mulletTailAttachment.visible =
    style === 'wolf_mullet_male' || style === 'male_shaggy_layered_wolf';

  // Toggle the 6 new female custom 3D hair attachments from Image 1
  const isCustomFemaleStyle =
    style === 'female_side_ponytail_sweep' ||
    style === 'female_side_swept_layered' ||
    style === 'female_blunt_bang_twin_curls' ||
    style === 'female_center_wavy_feather' ||
    style === 'female_center_inward_lob' ||
    style === 'female_side_low_bun_tendrils';
  sys.femaleCustomLocksAttachment.visible = isCustomFemaleStyle;
  if (isCustomFemaleStyle) {
    sys.femaleCustomLocksAttachment.children.forEach((child) => {
      if (child.name === 'fem_side_ponytail') {
        child.visible = style === 'female_side_ponytail_sweep';
      } else if (child.name === 'fem_side_layered') {
        child.visible = style === 'female_side_swept_layered';
      } else if (child.name === 'fem_twin_curls') {
        child.visible = style === 'female_blunt_bang_twin_curls';
      } else if (child.name === 'fem_center_wavy') {
        child.visible = style === 'female_center_wavy_feather';
      } else if (child.name === 'fem_inward_lob') {
        child.visible = style === 'female_center_inward_lob';
      } else if (child.name === 'fem_side_low_bun') {
        child.visible = style === 'female_side_low_bun_tendrils';
      }
    });
  }

  const isMaleStyle = MALE_HAIRSTYLE_SET.has(style);
  sys.maleCrownLocksAttachment.visible =
    isMaleStyle && style !== 'buzz_crew_cut' && style !== 'male_flat_crew_cut';
  if (sys.maleCrownLocksAttachment.visible) {
    sys.maleCrownLocksAttachment.children.forEach((child) => {
      if (child.name === 'male_mushroom') {
        child.visible =
          style === 'mushroom_cut' ||
          style === 'male_rounded_bowl' ||
          style === 'male_choppy_textured_crop';
      } else if (child.name === 'male_curtain') {
        child.visible =
          style === 'middle_part_curtain' ||
          style === 'male_center_curtain_bob' ||
          style === 'male_feathered_slick_back';
      } else if (child.name === 'male_comma') {
        child.visible =
          style === 'comma_hair_korean' || style === 'male_curved_side_comma';
      } else if (child.name === 'male_side_part') {
        child.visible =
          style === 'slicked_side_part' ||
          style === 'male_classic_side_wave' ||
          style === 'male_ivy_league_part' ||
          style === 'male_widows_peak_classic';
      } else if (child.name === 'male_quiff') {
        child.visible =
          style === 'undercut_quiff' ||
          style === 'male_wavy_quiff' ||
          style === 'male_sleek_pompadour' ||
          style === 'male_high_undercut_crest' ||
          style === 'male_faux_hawk_crest';
      } else if (child.name === 'male_crop') {
        child.visible =
          style === 'short_textured_crop' ||
          style === 'male_spiky_quiff' ||
          style === 'male_jagged_fringe' ||
          style === 'male_wispy_korean_bangs';
      } else if (child.name === 'male_curly') {
        child.visible =
          style === 'male_curly_quiff' || style === 'male_messy_spiky_wave';
      } else if (child.name === 'male_twoblock') {
        child.visible =
          style === 'two_block_layer' ||
          style === 'male_swept_fringe_layer' ||
          style === 'male_long_side_swept' ||
          style === 'male_emo_side_fringe';
      } else if (child.name === 'male_wolf_front') {
        child.visible =
          style === 'wolf_mullet_male' || style === 'male_shaggy_layered_wolf';
      }
    });
  }

  if (sys.lastHairColor !== hairColorHex) {
    sys.lastHairColor = hairColorHex;
    sys.hairStrandMat.map = getProceduralHairStrandTexture(hairColorHex);
    sys.hairStrandMat.needsUpdate = true;
  }

  if (style === 'none') {
    sys.cleanSinglePieceHair.visible = false;
    if (sys.twoBunchHair) sys.twoBunchHair.visible = false;
    sys.appliedStyle = style;
    return;
  }

  if (style === 'twin_braids' && sys.twoBunchHair) {
    sys.cleanSinglePieceHair.visible = false;
    sys.twoBunchHair.visible = true;
    applyStyledGarmentToMeshes(
      [sys.twoBunchHair],
      hairColorHex,
      undefined,
      null,
      'hair_twin_braids',
      'solid',
      true,
      115,
      140
    );
    const tbMat = sys.twoBunchHair.material as THREE.MeshStandardMaterial;
    if (tbMat) {
      tbMat.bumpMap = getSharedHairBumpTexture();
      tbMat.bumpScale = 0.0055;
      tbMat.roughness = 0.42;
      tbMat.metalness = 0.07;
      tbMat.needsUpdate = true;
    }
    sys.appliedStyle = style;
    return;
  }

  if (sys.twoBunchHair) {
    sys.twoBunchHair.visible = false;
  }
  sys.cleanSinglePieceHair.visible = true;

  if (sys.appliedStyle !== style) {
    sys.appliedStyle = style;
    const pos = sys.cleanSinglePieceHair.geometry.attributes
      .position as THREE.BufferAttribute;
    const base = sys.cleanBasePos;

    for (let i = 0; i < pos.count; i++) {
      const idx = i * 3;
      const bx = base[idx];
      const by = base[idx + 1];
      const bz = base[idx + 2];
      const ax = Math.abs(bx);

      let x = bx;
      let y = by;
      let z = bz;

      // Strict rear-only blend (`bz < -0.008`) so front/temple hair NEVER stretches down over the eyes or face!
      const backBlend = smoothstep(-0.008, -0.068, bz);
      const crownRefY = _isMale ? 1.835 : 1.745;
      const earTopY = crownRefY - 0.080;
      const napeBotY = crownRefY - 0.220;
      const browFloorY = crownRefY - 0.145; // Strict eyebrow clearance line
      const depthBelowCrown = Math.max(0, crownRefY - by);

      // Facial aperture guard: any vertex in front of the temples (`bz > 0.02` and `ax < 0.064`)
      // is gently lifted above `browFloorY` so bangs NEVER cover the eyes or face!
      const inFrontFaceZone =
        smoothstep(0.018, 0.055, bz) * (1.0 - smoothstep(0.048, 0.068, ax));

      if (style === 'long_straight' || style === 'female_side_swept_layered') {
        const vScale = 0.92 * (1 - backBlend) + 2.35 * backBlend;
        y = by < crownRefY ? crownRefY - depthBelowCrown * vScale : by;
        const dropW = smoothstep(crownRefY, crownRefY - 0.235, y) * backBlend;
        x = bx * (1 + dropW * 0.14);
        z = bz - dropW * 0.018;
        if (style === 'female_side_swept_layered' && inFrontFaceZone > 0.05) {
          // Sweep forehead bangs diagonally up and to the right temple so face is 100% open
          y = Math.max(y, browFloorY + 0.012 + (bx + 0.05) * 0.12);
        }
      } else if (style === 'long_wavy' || style === 'female_center_wavy_feather') {
        const vScale = 0.92 * (1 - backBlend) + 2.32 * backBlend;
        y = by < crownRefY ? crownRefY - depthBelowCrown * vScale : by;
        const dropW = smoothstep(crownRefY, crownRefY - 0.235, y) * backBlend;
        const waveX = Math.sin(y * 34) * 0.0085 * dropW;
        const waveZ = Math.cos(y * 30) * 0.0065 * dropW;
        x = bx * (1 + dropW * 0.18) + waveX;
        z = bz - dropW * 0.02 + waveZ;
        if (style === 'female_center_wavy_feather' && inFrontFaceZone > 0.05) {
          // Center-parted curtain opening above the brow
          const centerOpen = Math.exp(-(bx * bx) / 0.0008);
          y = Math.max(y, browFloorY + 0.010 + centerOpen * 0.018);
          x = bx * (1.0 + inFrontFaceZone * 0.14);
        }
      } else if (style === 'curly_voluminous' || style === 'female_blunt_bang_twin_curls') {
        const vScale = 0.95 * (1 - backBlend) + 2.28 * backBlend;
        y = by < crownRefY ? crownRefY - depthBelowCrown * vScale : by;
        const dropW = smoothstep(crownRefY, crownRefY - 0.235, y) * backBlend;
        const curl = Math.sin(y * 42 + bx * 24) * 0.01 * dropW;
        x = bx * (1 + dropW * 0.24) + curl;
        z = bz - dropW * 0.022 + curl * 0.4;
        if (style === 'female_blunt_bang_twin_curls' && inFrontFaceZone > 0.05) {
          // Neat straight blunt bangs resting horizontally above the eyebrows
          y = Math.max(y, browFloorY + 0.006);
        }
      } else if (style === 'korean_hime_layer') {
        const rearOnlyBlend = smoothstep(-0.008, -0.068, bz);
        const vScale = 0.96 * (1 - rearOnlyBlend) + 2.25 * rearOnlyBlend;
        y = by < crownRefY ? crownRefY - depthBelowCrown * vScale : by;
      } else if (style === 'butterfly_wolf_cut') {
        const rearFeatherBlend = smoothstep(-0.005, -0.065, bz);
        const vScale = 0.94 * (1 - rearFeatherBlend) + 2.05 * rearFeatherBlend;
        y = by < crownRefY ? crownRefY - depthBelowCrown * vScale : by;
        const crownLift = smoothstep(crownRefY - 0.10, crownRefY + 0.01, by);
        const centerPartGroove =
          Math.exp(-(bx * bx) / 0.0005) *
          crownLift *
          smoothstep(0.0, 0.11, bz);
        const lowerWingFlare = smoothstep(crownRefY - 0.26, crownRefY - 0.38, y) * rearFeatherBlend;
        x = bx * (1.0 + crownLift * 0.07 + lowerWingFlare * 0.22);
        y = y + crownLift * 0.012 - centerPartGroove * 0.011;
      } else if (style === 'shoulder_bob') {
        const vScale = 0.92 * (1 - backBlend) + 1.15 * backBlend;
        y = by < crownRefY ? crownRefY - depthBelowCrown * vScale : by;
        const dome = Math.sin(smoothstep(crownRefY - 0.21, crownRefY - 0.02, y) * Math.PI);
        const cCurlInward = smoothstep(crownRefY - 0.16, crownRefY - 0.23, y) * backBlend;
        x = bx * (1 + dome * 0.07 - cCurlInward * 0.12);
      } else if (style === 'clavicle_lob' || style === 'female_center_inward_lob') {
        const vScale = 0.94 * (1 - backBlend) + 1.48 * backBlend;
        y = by < crownRefY ? crownRefY - depthBelowCrown * vScale : by;
        if (style === 'female_center_inward_lob') {
          const bellFlare = smoothstep(crownRefY - 0.08, crownRefY - 0.20, y) * backBlend;
          const inwardCurl = smoothstep(crownRefY - 0.20, crownRefY - 0.28, y) * backBlend;
          x = bx * (1.0 + bellFlare * 0.18 - inwardCurl * 0.14);
          if (inFrontFaceZone > 0.05) {
            const centerOpen = Math.exp(-(bx * bx) / 0.0008);
            y = Math.max(y, browFloorY + 0.012 + centerOpen * 0.016);
          }
        } else {
          const flipOut = smoothstep(crownRefY - 0.22, crownRefY - 0.30, y) * backBlend;
          x = bx * (1 + flipOut * 0.16);
        }
      } else if (
        style === 'updo_bun' ||
        style === 'low_chignon' ||
        style === 'high_ponytail' ||
        style === 'pixie_short' ||
        style === 'female_side_ponytail_sweep' ||
        style === 'female_side_low_bun_tendrils'
      ) {
        const depth = Math.max(0, earTopY - by);
        y = by < earTopY ? earTopY - depth * 0.36 : by;
        const lowerRimTuck = smoothstep(earTopY, napeBotY, by);
        const frontBangsKeep = smoothstep(0.02, 0.085, bz) * smoothstep(0.075, 0.035, ax);
        const sideTuckStrength = lowerRimTuck * (1.0 - frontBangsKeep * 0.65);
        x = bx * (1.0 - sideTuckStrength * 0.28);
        if (bz < 0.02) {
          z = bz + lowerRimTuck * 0.022;
        }
        if (style === 'female_side_ponytail_sweep') {
          // Rounded volumetric crown dome as shown in Top-Left of Image 1
          const domeBoost = smoothstep(earTopY - 0.02, crownRefY, by);
          y += domeBoost * 0.012;
          x *= 1.0 + domeBoost * 0.06;
        }
      } else if (isMaleStyle) {
        // --- PRECISION BARBERSHOP MALE CRANIAL TAPER & STYLE SCULPTING (21 Styles from Images 2 & 3) ---
        const depth = Math.max(0, earTopY - by);
        const lowerTaper = smoothstep(earTopY, napeBotY, by);
        const isSideOrBack = 1.0 - smoothstep(0.035, 0.088, bz) * smoothstep(0.072, 0.038, ax);
        const crownMask = smoothstep(earTopY - 0.025, crownRefY + 0.01, by);
        const frontForeheadMask =
          smoothstep(earTopY - 0.05, crownRefY, by) * smoothstep(0.015, 0.12, bz);

        // Base male vertical trim & tight temporal/occipital taper
        y = by < earTopY ? earTopY - depth * 0.26 : by;
        x = bx * (1.0 - lowerTaper * isSideOrBack * 0.27);
        if (bz < 0.0) {
          z = bz + lowerTaper * 0.026;
        }

        if (
          style === 'mushroom_cut' ||
          style === 'male_rounded_bowl' ||
          style === 'male_choppy_textured_crop'
        ) {
          y = by < earTopY ? earTopY - depth * 0.32 : by;
          const bowlDome = Math.sin(smoothstep(earTopY - 0.07, crownRefY + 0.01, y) * Math.PI);
          const underBowlTuck = smoothstep(earTopY - 0.05, earTopY - 0.10, y);
          const strandTex =
            style === 'male_choppy_textured_crop'
              ? Math.sin(bx * 185 - bz * 145) * 0.0042 * crownMask
              : Math.sin(bx * 155 + bz * 125) * 0.0024 * crownMask;
          x = bx * (1.0 - underBowlTuck * isSideOrBack * 0.28 + bowlDome * 0.09);
          y += bowlDome * 0.012 + strandTex;
          z += bowlDome * 0.008;
        } else if (
          style === 'middle_part_curtain' ||
          style === 'male_center_curtain_bob' ||
          style === 'male_feathered_slick_back'
        ) {
          y = by < earTopY ? earTopY - depth * 0.34 : by;
          const partGroove =
            Math.exp(-(bx * bx) / 0.00042) *
            crownMask *
            smoothstep(-0.02, 0.12, bz);
          const sideCurtainArch =
            smoothstep(0.012, 0.068, ax) *
            crownMask *
            smoothstep(-0.01, 0.12, bz);
          const featherWave = Math.sin(ax * 105 + bz * 65) * 0.0038 * sideCurtainArch;
          x = bx * (1.0 - lowerTaper * isSideOrBack * 0.22 + sideCurtainArch * 0.14);
          y += sideCurtainArch * 0.016 - partGroove * 0.020 + featherWave;
          z +=
            style === 'male_feathered_slick_back'
              ? -frontForeheadMask * 0.006
              : sideCurtainArch * 0.012;
        } else if (
          style === 'comma_hair_korean' ||
          style === 'male_curved_side_comma'
        ) {
          y = by < earTopY ? earTopY - depth * 0.28 : by;
          const part64 =
            Math.exp(-Math.pow((bx + 0.022) / 0.015, 2)) *
            crownMask *
            smoothstep(-0.01, 0.12, bz);
          const rightCommaRoot = smoothstep(-0.016, 0.064, bx) * frontForeheadMask;
          const leftSleekTuck =
            smoothstep(-0.018, -0.075, bx) * smoothstep(earTopY + 0.015, earTopY - 0.08, by);
          x = bx * (1.0 - lowerTaper * isSideOrBack * 0.24 - leftSleekTuck * 0.08);
          y += rightCommaRoot * 0.020 - part64 * 0.018;
          z += rightCommaRoot * 0.014;
        } else if (
          style === 'slicked_side_part' ||
          style === 'male_classic_side_wave' ||
          style === 'male_ivy_league_part' ||
          style === 'male_widows_peak_classic'
        ) {
          const trimFactor = style === 'male_ivy_league_part' ? 0.20 : 0.24;
          y = by < earTopY ? earTopY - depth * trimFactor : by;
          const razorPart =
            Math.exp(-Math.pow((bx + 0.036) / 0.012, 2)) *
            crownMask *
            smoothstep(-0.03, 0.12, bz);
          const sweptWave = smoothstep(-0.026, 0.068, bx) * crownMask;
          const leftSideTight =
            smoothstep(-0.034, -0.078, bx) * smoothstep(earTopY + 0.03, earTopY - 0.08, by);
          const combRidges = Math.sin((bx - bz * 0.45) * 195) * 0.0028 * crownMask;
          const widowsPeakDip =
            style === 'male_widows_peak_classic'
              ? Math.exp(-(bx * bx) / 0.00035) * frontForeheadMask * 0.012
              : 0;
          x = bx * (1.0 - lowerTaper * 0.28 - leftSideTight * 0.12) + sweptWave * 0.014;
          y += sweptWave * 0.022 - razorPart * 0.018 + combRidges - widowsPeakDip;
          z += sweptWave * 0.010;
        } else if (
          style === 'undercut_quiff' ||
          style === 'male_wavy_quiff' ||
          style === 'male_sleek_pompadour' ||
          style === 'male_high_undercut_crest' ||
          style === 'male_faux_hawk_crest'
        ) {
          y = by < earTopY ? earTopY - depth * 0.21 : by;
          const sideTempleMask = smoothstep(0.044, 0.078, ax);
          const highFade =
            smoothstep(earTopY + 0.05, earTopY - 0.06, by) *
            (0.65 * sideTempleMask + 0.35 * (1.0 - frontForeheadMask));
          const hawkPeak =
            style === 'male_faux_hawk_crest'
              ? Math.exp(-(bx * bx) / 0.0008) * 0.018
              : 0;
          const crestBias =
            style === 'male_high_undercut_crest'
              ? smoothstep(0.02, -0.045, bx) * 0.014
              : 0;
          const quiffCenterMask = 1.0 - smoothstep(0.038, 0.068, ax);
          const quiffLift =
            crownMask *
            smoothstep(-0.01, 0.12, bz) *
            (0.45 + 0.55 * quiffCenterMask);
          const combRidges = Math.sin(bx * 185) * 0.0036 * quiffLift;
          x = bx * (1.0 - highFade * 0.30);
          y += quiffLift * (style === 'male_sleek_pompadour' ? 0.038 : 0.032) + hawkPeak + crestBias + combRidges;
          z += quiffLift * (style === 'male_sleek_pompadour' ? 0.012 : 0.018);
        } else if (
          style === 'short_textured_crop' ||
          style === 'male_spiky_quiff' ||
          style === 'male_jagged_fringe' ||
          style === 'male_wispy_korean_bangs'
        ) {
          y = by < earTopY ? earTopY - depth * 0.22 : by;
          const highSideFade =
            smoothstep(earTopY + 0.035, earTopY - 0.065, by) * smoothstep(0.045, 0.078, ax);
          const spikeFreq = style === 'male_spiky_quiff' ? 230 : 175;
          const cropTexture =
            (Math.sin(bx * spikeFreq + bz * 155) * 0.0046 +
              Math.cos(bx * 105 - bz * 130) * 0.0030) *
            crownMask;
          x = bx * (1.0 - lowerTaper * 0.28 - highSideFade * 0.10);
          y += crownMask * (style === 'male_spiky_quiff' ? 0.022 : 0.012) + cropTexture;
          z += frontForeheadMask * 0.006;
        } else if (
          style === 'male_curly_quiff' ||
          style === 'male_messy_spiky_wave'
        ) {
          y = by < earTopY ? earTopY - depth * 0.28 : by;
          const curl3D =
            (Math.sin(bx * 92 + bz * 78) * 0.0085 +
              Math.cos(bx * 145 - bz * 118) * 0.0052) *
            crownMask;
          x =
            bx * (1.0 - lowerTaper * isSideOrBack * 0.24 + crownMask * 0.07) +
            curl3D * (bx >= 0 ? 0.65 : -0.65);
          y += crownMask * 0.024 + curl3D;
          z += frontForeheadMask * 0.012 + curl3D * 0.5;
        } else if (
          style === 'two_block_layer' ||
          style === 'male_swept_fringe_layer' ||
          style === 'male_long_side_swept' ||
          style === 'male_emo_side_fringe'
        ) {
          y = by < earTopY ? earTopY - depth * 0.28 : by;
          const lowerUndercutBlock = smoothstep(earTopY - 0.025, earTopY - 0.08, by) * isSideOrBack;
          const sweepDir = style === 'male_long_side_swept' ? -1 : 1;
          const layerFeather = Math.sin((bx * sweepDir * 140) + bz * 98) * 0.0040 * crownMask;
          x =
            bx * (1.0 - lowerUndercutBlock * 0.28 + crownMask * 0.08) +
            frontForeheadMask * sweepDir * 0.006;
          y += crownMask * 0.016 + layerFeather;
          z += frontForeheadMask * 0.010;
        } else if (
          style === 'wolf_mullet_male' ||
          style === 'male_shaggy_layered_wolf'
        ) {
          const mulletScale = 0.24 * (1 - backBlend) + 0.96 * backBlend;
          y = by < earTopY ? earTopY - depth * mulletScale : by;
          const sideTempleTight =
            smoothstep(earTopY + 0.02, earTopY - 0.085, by) *
            smoothstep(0.042, 0.078, ax) *
            (1.0 - backBlend * 0.78);
          const shaggyWolfCrown =
            (Math.sin(bx * 145 + bz * 115) * 0.0044 +
              Math.cos(bx * 85 - bz * 95) * 0.0028) *
            crownMask;
          const napeFlare = smoothstep(earTopY - 0.045, napeBotY, y) * backBlend;
          x =
            bx *
            (1.0 -
              sideTempleTight * 0.22 +
              crownMask * 0.07 +
              napeFlare * 0.16);
          y += crownMask * 0.016 + shaggyWolfCrown;
          z -= napeFlare * 0.014;
        } else if (
          style === 'buzz_crew_cut' ||
          style === 'male_flat_crew_cut'
        ) {
          y = by < earTopY ? earTopY - depth * 0.18 : by;
          const highTightSides = smoothstep(0.046, 0.078, ax);
          const crewFlatTop = smoothstep(earTopY + 0.035, crownRefY, by) * (1.0 - highTightSides * 0.5);
          const microStubble = Math.sin(bx * 260 + bz * 260) * 0.0009 * crownMask;
          x = bx * (0.86 - highTightSides * 0.04);
          y =
            (earTopY - 0.015) +
            (y - (earTopY - 0.015)) * 0.84 -
            crewFlatTop * 0.004 +
            frontForeheadMask * 0.006 +
            microStubble;
          z = 0.014 + (z - 0.014) * 0.88 + frontForeheadMask * 0.004;
        }
      }

      // Universal Anti-Face-Occlusion Guard: never let any front-forehead vertex dip over the eyes!
      if (inFrontFaceZone > 0.01 && y < browFloorY) {
        y = browFloorY + (y - browFloorY) * (1.0 - inFrontFaceZone * 0.88);
      }

      pos.setXYZ(i, x, y, z);
    }

    sys.cleanSinglePieceHair.geometry.computeVertexNormals();
    pos.needsUpdate = true;
  }

  applyStyledGarmentToMeshes(
    [sys.cleanSinglePieceHair],
    hairColorHex,
    undefined,
    null,
    `hair_${style}`,
    'solid',
    true,
    115,
    140
  );

  // Attach fine 3D hair-strand fiber bump relief & salon sheen to the main hair mesh
  const hairMat = sys.cleanSinglePieceHair.material as THREE.MeshStandardMaterial;
  if (hairMat) {
    const prevHasBump = Boolean(hairMat.bumpMap);
    hairMat.bumpMap = getSharedHairBumpTexture();
    hairMat.bumpScale = isMaleStyle
      ? style === 'buzz_crew_cut' || style === 'male_flat_crew_cut'
        ? 0.0095
        : 0.0074
      : 0.0055;
    hairMat.roughness = isMaleStyle
      ? style === 'slicked_side_part' ||
        style === 'male_classic_side_wave' ||
        style === 'male_sleek_pompadour' ||
        style === 'comma_hair_korean' ||
        style === 'male_curved_side_comma'
        ? 0.34
        : style === 'buzz_crew_cut' || style === 'male_flat_crew_cut'
        ? 0.58
        : 0.42
      : 0.38;
    hairMat.metalness = isMaleStyle ? 0.09 : 0.08;
    if (!prevHasBump) {
      hairMat.needsUpdate = true;
    }
  }
}

/**
 * De-interleaves a SkinnedMesh geometry and attaches an immutable `aBindPos` (`vec3`) attribute
 * while preserving `tangent`, `uv`, `skinIndex`, and `skinWeight` so custom vertex sculpting
 * and pure-ASCII GPU shaders compile and render with 100% WebGL2 compatibility.
 */
function deinterleaveSkinnedGeometry(
  srcGeo: THREE.BufferGeometry,
  normalOffset = 0,
  flareLapel = false,
  skeletonBones?: THREE.Bone[]
): {
  geo: THREE.BufferGeometry;
  basePos: Float32Array;
  baseNorm: Float32Array;
  anatWeights: Float32Array;
} {
  const geo = new THREE.BufferGeometry();
  const srcPos = srcGeo.attributes.position;
  const srcNorm = srcGeo.attributes.normal;
  const srcTang = srcGeo.attributes.tangent;
  const srcUv = srcGeo.attributes.uv;
  const srcSkinIdx = srcGeo.attributes.skinIndex;
  const srcSkinWgt = srcGeo.attributes.skinWeight;
  const count = srcPos.count;

  const posArr = new Float32Array(count * 3);
  const bindPosArr = new Float32Array(count * 3);
  const normArr = new Float32Array(count * 3);
  const anatWeights = new Float32Array(count * 4);
  const tangArr = srcTang ? new Float32Array(count * 4) : null;
  const uvArr = srcUv ? new Float32Array(count * 2) : null;
  const skinIdxArr = srcSkinIdx ? new Uint16Array(count * 4) : null;
  const skinWgtArr = srcSkinWgt ? new Float32Array(count * 4) : null;

  // Pre-classify each skeleton bone into [torso, upperArm, foreArm, leg, protect]
  const boneCategory: number[][] | null = skeletonBones
    ? skeletonBones.map((b) => {
        const n = (b?.name || '').toLowerCase();
        if (
          n.includes('hand') ||
          n.includes('thumb') ||
          n.includes('index') ||
          n.includes('middle') ||
          n.includes('ring') ||
          n.includes('pinky') ||
          n.includes('foot') ||
          n.includes('toe') ||
          n.includes('head') ||
          n.includes('eye') ||
          n.includes('teeth') ||
          n.includes('tongue')
        ) {
          return [0, 0, 0, 0, 1];
        }
        if (n.includes('neck')) {
          return [0.22, 0, 0, 0, 0.78];
        }
        if (n.includes('forearm')) {
          return [0, 0, 1, 0, 0];
        }
        if (n.includes('arm')) {
          return [0, 1, 0, 0, 0];
        }
        if (n.includes('shoulder')) {
          return [0.55, 0.45, 0, 0, 0];
        }
        if (n.includes('upleg') || n.includes('leg')) {
          return [0, 0, 0, 1, 0];
        }
        return [1, 0, 0, 0, 0];
      })
    : null;

  for (let i = 0; i < count; i++) {
    const px = srcPos.getX(i);
    const py = srcPos.getY(i);
    const pz = srcPos.getZ(i);
    const nx = srcNorm ? srcNorm.getX(i) : 0;
    const ny = srcNorm ? srcNorm.getY(i) : 0;
    const nz = srcNorm ? srcNorm.getZ(i) : 1;

    let extraZ = 0;
    if (flareLapel && pz > 0.02 && py > 1.12 && py < 1.48) {
      const lapelZone = Math.exp(-Math.pow((Math.abs(px) - 0.055) / 0.025, 2));
      extraZ = lapelZone * 0.0045;
    }

    posArr[i * 3] = px + nx * normalOffset;
    posArr[i * 3 + 1] = py + ny * normalOffset;
    posArr[i * 3 + 2] = pz + nz * normalOffset + extraZ;

    bindPosArr[i * 3] = px;
    bindPosArr[i * 3 + 1] = py;
    bindPosArr[i * 3 + 2] = pz;

    normArr[i * 3] = nx;
    normArr[i * 3 + 1] = ny;
    normArr[i * 3 + 2] = nz;

    if (srcTang && tangArr) {
      tangArr[i * 4] = srcTang.getX(i);
      tangArr[i * 4 + 1] = srcTang.getY(i);
      tangArr[i * 4 + 2] = srcTang.getZ(i);
      tangArr[i * 4 + 3] = srcTang.getW(i);
    }
    if (srcUv && uvArr) {
      uvArr[i * 2] = srcUv.getX(i);
      uvArr[i * 2 + 1] = srcUv.getY(i);
    }
    if (srcSkinIdx && skinIdxArr && srcSkinWgt && skinWgtArr) {
      const i0 = srcSkinIdx.getX(i);
      const i1 = srcSkinIdx.getY(i);
      const i2 = srcSkinIdx.getZ(i);
      const i3 = srcSkinIdx.getW(i);
      const w0 = srcSkinWgt.getX(i);
      const w1 = srcSkinWgt.getY(i);
      const w2 = srcSkinWgt.getZ(i);
      const w3 = srcSkinWgt.getW(i);

      skinIdxArr[i * 4] = i0;
      skinIdxArr[i * 4 + 1] = i1;
      skinIdxArr[i * 4 + 2] = i2;
      skinIdxArr[i * 4 + 3] = i3;

      skinWgtArr[i * 4] = w0;
      skinWgtArr[i * 4 + 1] = w1;
      skinWgtArr[i * 4 + 2] = w2;
      skinWgtArr[i * 4 + 3] = w3;

      if (boneCategory) {
        let wTorso = 0;
        let wUpperArm = 0;
        let wForeArm = 0;
        let wLeg = 0;
        let wProt = 0;
        const indices = [i0, i1, i2, i3];
        const weights = [w0, w1, w2, w3];
        for (let k = 0; k < 4; k++) {
          const wk = weights[k];
          if (wk <= 0) continue;
          const cat = boneCategory[indices[k]];
          if (cat) {
            wTorso += wk * cat[0];
            wUpperArm += wk * cat[1];
            wForeArm += wk * cat[2];
            wLeg += wk * cat[3];
            wProt += wk * cat[4];
          } else {
            wTorso += wk;
          }
        }
        const sum = wTorso + wUpperArm + wForeArm + wLeg + wProt;
        if (sum > 1e-5) {
          anatWeights[i * 4] = wTorso / sum;
          anatWeights[i * 4 + 1] = wUpperArm / sum;
          anatWeights[i * 4 + 2] = wForeArm / sum;
          anatWeights[i * 4 + 3] = wLeg / sum;
        }
      }
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('aBindPos', new THREE.BufferAttribute(bindPosArr, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  if (tangArr) geo.setAttribute('tangent', new THREE.BufferAttribute(tangArr, 4));
  if (uvArr) geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  if (skinIdxArr) {
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIdxArr, 4));
  }
  if (skinWgtArr) {
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWgtArr, 4));
  }

  if (srcGeo.index) {
    const idxAttr = srcGeo.index;
    const baseIndex = new Uint32Array(idxAttr.count);
    for (let i = 0; i < idxAttr.count; i++) {
      baseIndex[i] = idxAttr.getX(i);
    }
    geo.setIndex(new THREE.BufferAttribute(baseIndex, 1));
  }

  return {
    geo,
    basePos: new Float32Array(posArr),
    baseNorm: new Float32Array(normArr),
    anatWeights,
  };
}

/**
 * Pure-ASCII GLSL Female Facial Makeup Shader (`Wolf3D_Head`).
 * Renders 3D Lipstick + Specular Lip Gloss, Cheekbone/Douyin Blush, Eyeshadow + Shimmer,
 * Winged Cat-Eye Eyeliner, and Glass-Skin Highlighter using exact 3D bind-space landmarks.
 */
function attachFemaleMakeupShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: MakeupShaderUniforms
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uEnableMakeup = uniforms.uEnableMakeup;
    shader.uniforms.uEyeLandmark = uniforms.uEyeLandmark;
    shader.uniforms.uMouthLandmark = uniforms.uMouthLandmark;
    shader.uniforms.uLipColor = uniforms.uLipColor;
    shader.uniforms.uBlushColor = uniforms.uBlushColor;
    shader.uniforms.uEyeshadowColor = uniforms.uEyeshadowColor;
    shader.uniforms.uMakeupWeights1 = uniforms.uMakeupWeights1;
    shader.uniforms.uMakeupWeights2 = uniforms.uMakeupWeights2;

    shader.vertexShader =
      `
      attribute vec3 aBindPos;
      varying vec3 vBindPos;
      varying vec3 vBindNorm;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vBindPos = aBindPos;
        vBindNorm = objectNormal;
        `
      );

    shader.fragmentShader =
      `
      uniform float uEnableMakeup;
      uniform vec3 uEyeLandmark;
      uniform vec3 uMouthLandmark;
      uniform vec3 uLipColor;
      uniform vec3 uBlushColor;
      uniform vec3 uEyeshadowColor;
      uniform vec4 uMakeupWeights1;
      uniform vec4 uMakeupWeights2;
      varying vec3 vBindPos;
      varying vec3 vBindNorm;
      float fastGauss(float d, float w) {
        float t = clamp(abs(d) / w, 0.0, 1.0);
        float u = 1.0 - t * t;
        return u * u;
      }
      float fastGauss2(float dx, float wx, float dy, float wy) {
        float tx = dx / wx;
        float ty = dy / wy;
        float u = clamp(1.0 - (tx * tx + ty * ty), 0.0, 1.0);
        return u * u;
      }
      ` +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `
          #include <map_fragment>
          float vLipMaskVal = 0.0;
          float vLipGlossVal = 0.0;
          float vDewyGlowVal = 0.0;
          if (uEnableMakeup > 0.5) {
            float bx = vBindPos.x;
            float by = vBindPos.y;
            float bz = vBindPos.z;
            float ax = abs(bx);
            vec3 nB = normalize(vBindNorm);

            float lipWeight = uMakeupWeights1.x;
            float lipGloss = uMakeupWeights1.y;
            float blushWeight = uMakeupWeights1.z;
            float shadowWeight = uMakeupWeights1.w;
            float linerWeight = uMakeupWeights2.x;
            float glowWeight = uMakeupWeights2.y;
            int mkStyle = int(uMakeupWeights2.z + 0.5); // 1=Douyin, 2=Tone Tay, 3=Tone Khoi, 4=Tone Hong Dao

            // 1. 3D Lipstick, Ombre Gradient & Hydro-Plump Lip Gloss Contour
            float mouthW = max(0.021, uMouthLandmark.x);
            float mx = ax / mouthW;
            float mxClamped = clamp(mx, 0.0, 1.05);
            float dyLip = by - uMouthLandmark.y;
            float overlineBoost = mkStyle == 2 ? 0.0008 : 0.0;
            float cupidsBow = (0.0080 + overlineBoost) - 0.0016 * cos(min(mx, 1.0) * 6.28318) - 0.0068 * mxClamped * mxClamped;
            float lowerLip = -(0.0090 + overlineBoost) * (1.0 - mxClamped * mxClamped);
            float edgeFeather = mkStyle == 1 ? 0.0028 : 0.0018;
            float inLipY = smoothstep(lowerLip - edgeFeather, lowerLip + 0.0016, dyLip) * (1.0 - smoothstep(cupidsBow - 0.0014, cupidsBow + edgeFeather, dyLip));
            float inLipX = 1.0 - smoothstep(0.86, 1.03, mx);
            float inLipZ = smoothstep(uMouthLandmark.z - 0.022, uMouthLandmark.z - 0.007, bz);
            float linearRose = clamp((diffuseColor.r - diffuseColor.g * 1.38) * 3.8, 0.0, 1.0);
            float lipMask = clamp(inLipY * inLipX * inLipZ * (0.48 + linearRose * 0.82), 0.0, 1.0);
            // Douyin inner-lip ombre gradient concentration
            float innerLipOmbre = fastGauss2(bx, mouthW * 0.72, dyLip, 0.0055);
            float effectiveLipMask = mkStyle == 1
              ? clamp(lipMask * (0.68 + 0.42 * innerLipOmbre), 0.0, 1.0)
              : lipMask;
            vLipMaskVal = effectiveLipMask * step(0.02, lipWeight + lipGloss);
            vLipGlossVal = lipGloss;

            float rawLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float lipCurvature = 0.84 + 0.16 * max(0.0, nB.z) + 0.07 * nB.y;
            float lipPartLine = fastGauss(dyLip, 0.0016) * 0.26;
            vec3 targetLipRGB = uLipColor * clamp(lipCurvature - lipPartLine, 0.48, 1.15);
            diffuseColor.rgb = mix(diffuseColor.rgb, targetLipRGB, clamp(effectiveLipMask * lipWeight * 0.92, 0.0, 0.95));

            // Natural 3D Cushion Water-Sheen Lip Gloss
            float lowerLipCushion = fastGauss2(bx, mouthW * 0.50, dyLip + 0.0036, 0.0028) * max(0.0, nB.z);
            float upperBowCushion = fastGauss2(ax - mouthW * 0.22, mouthW * 0.18, dyLip - 0.0038, 0.0020) * max(0.0, nB.y + 0.35);
            float normalSpec = pow(clamp(nB.z * 0.82 + nB.y * 0.36, 0.0, 1.0), 10.0);
            float waterSheen = effectiveLipMask * lipGloss * (lowerLipCushion * 0.36 + upperBowCushion * 0.22 + normalSpec * 0.15);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.96, 0.97), clamp(waterSheen, 0.0, 0.45));

            // 2. Style-Adaptive Blush & Sculpted Bronzer Contour
            float cheekCenterX = uEyeLandmark.x + (mkStyle == 2 ? 0.017 : 0.011);
            float cheekCenterY = mix(uMouthLandmark.y, uEyeLandmark.y, mkStyle == 1 ? 0.64 : (mkStyle == 2 ? 0.46 : 0.55));
            float dyCheek = (by - cheekCenterY) - (mkStyle == 2 ? (ax - cheekCenterX) * 0.42 : 0.0);
            float cheekGaussian = fastGauss2(ax - cheekCenterX, 0.032, dyCheek, mkStyle == 2 ? 0.018 : 0.024) * smoothstep(0.025, 0.055, bz);
            float noseBlushFactor = mkStyle == 1 ? 0.72 : (mkStyle == 4 ? 0.48 : 0.22);
            float noseBridgeBlush = fastGauss2(bx, 0.016, by - (cheekCenterY + 0.004), 0.010) * smoothstep(0.065, 0.082, bz) * noseBlushFactor;
            float noseTipBlush = mkStyle == 1
              ? fastGauss2(bx, 0.011, by - (uMouthLandmark.y + 0.024), 0.009) * smoothstep(0.080, 0.095, bz) * 0.45
              : 0.0;
            float totalBlush = clamp((cheekGaussian + noseBridgeBlush + noseTipBlush) * blushWeight * 0.72, 0.0, 0.76);
            vec3 blushTarget = mix(diffuseColor.rgb * uBlushColor * 1.35, uBlushColor * rawLum * 1.15, 0.55);
            diffuseColor.rgb = mix(diffuseColor.rgb, blushTarget, totalBlush);

            // 3. Crisp Upper Eyelid Eyeshadow, Aegyo-Sal Highlight & Precision Winged Eyeliner (Zero Smudge)
            float eyeCenterX = max(0.0285, uEyeLandmark.x);
            float ex = (ax - eyeCenterX) / 0.0165;
            float ey = (by - uEyeLandmark.y) / 0.0125;
            // Nose-bridge & temple safety guard: never allow eye makeup onto nose bridge (ax < 0.017) or far temple
            float eyeRegionGuard = smoothstep(0.0168, 0.0215, ax) * (1.0 - smoothstep(0.0465, 0.0540, ax));
            // Exclude inner eyeball socket aperture so pigment sits strictly on outer eyelid skin, never bleeding into tear duct or lower lid
            float socketAperture = fastGauss2(ex, 0.78, ey + 0.06, 0.24);
            float outsideSocket = 1.0 - clamp(socketAperture * 0.92, 0.0, 0.92);
            float lidArch = 0.26 * (1.0 - 0.45 * clamp(ex * ex, 0.0, 1.35));
            float onFrontEye = smoothstep(uEyeLandmark.z - 0.019, uEyeLandmark.z - 0.003, bz) * eyeRegionGuard;

            // Clean upper tarsal & crease eyeshadow gradient strictly above lidArch
            float dyAboveArch = ey - lidArch;
            float upperShadowX = smoothstep(-0.88, -0.42, ex) * (1.0 - smoothstep(0.68, 1.22, ex));
            float upperShadowY = smoothstep(0.02, 0.20, dyAboveArch) * (1.0 - smoothstep(0.58, 1.18, dyAboveArch));
            float outerCreaseAccent = fastGauss2(ex - 0.48, 0.42, dyAboveArch - 0.24, 0.28) * 0.35;
            float upperShadow = clamp((upperShadowX * upperShadowY + outerCreaseAccent) * outsideSocket, 0.0, 1.0) * onFrontEye;

            // Subtle outer-corner lower lash accent only for Smoky/Western styles (never under the center/inner eye)
            float lowerOuterAccent = (mkStyle == 3 || mkStyle == 2)
              ? fastGauss2(ex - 0.56, 0.36, ey + 0.34, 0.14) * smoothstep(0.20, 0.48, ex) * onFrontEye * outsideSocket * (mkStyle == 3 ? 0.32 : 0.18)
              : 0.0;
            float shadowGrad = clamp(upperShadow + lowerOuterAccent, 0.0, 1.0);

            float aegyoSalShimmer = (mkStyle == 1 || mkStyle == 4)
              ? fastGauss2(ex, 0.55, ey + 0.44, 0.14) * onFrontEye * glowWeight * 0.12
              : 0.0;
            float lidShimmer = fastGauss2(ex - 0.05, 0.42, dyAboveArch - 0.26, 0.24) * onFrontEye * outsideSocket * shadowWeight * (mkStyle == 1 ? 0.20 : 0.12) + aegyoSalShimmer;
            vec3 shadowTarget = mix(diffuseColor.rgb * uEyeshadowColor * 1.18, uEyeshadowColor * rawLum, mkStyle == 3 ? 0.68 : 0.54);
            diffuseColor.rgb = mix(diffuseColor.rgb, shadowTarget, clamp(shadowGrad * shadowWeight * (mkStyle == 3 ? 0.72 : 0.62), 0.0, 0.74));
            diffuseColor.rgb = min(vec3(1.0), diffuseColor.rgb + vec3(lidShimmer, lidShimmer * 0.93, lidShimmer * 0.88));

            // Razor-sharp upper lash line + crisp outer cat-eye wing flick (no lower-eye or inner-corner bleed)
            float lashThickness = mkStyle == 3 ? 0.105 : 0.085;
            float lashLine = fastGauss(dyAboveArch - 0.05, lashThickness)
              * smoothstep(-0.58, -0.24, ex)
              * (1.0 - smoothstep(0.76, 0.96, ex))
              * onFrontEye;
            float wingSlope = mkStyle == 1 ? 0.46 : (mkStyle == 2 || mkStyle == 3 ? 0.48 : 0.38);
            float wingY = (lidArch + 0.05) + max(0.0, ex - 0.64) * wingSlope;
            // Taper the wing thickness as it extends outward for a sharp point
            float wingTaper = mix(0.082, 0.038, clamp((ex - 0.64) / 0.52, 0.0, 1.0));
            float catWing = fastGauss(ey - wingY, wingTaper)
              * smoothstep(0.60, 0.72, ex)
              * (1.0 - smoothstep(1.02, 1.18, ex))
              * onFrontEye;
            float linerMask = max(lashLine, catWing) * linerWeight * 0.88;
            vec3 linerInkRGB = mkStyle == 4 ? vec3(0.16, 0.09, 0.07) : vec3(0.07, 0.045, 0.045);
            diffuseColor.rgb = mix(diffuseColor.rgb, linerInkRGB, clamp(linerMask, 0.0, 0.90));

            // 4. Dewy Glass Skin Highlighter (Nose Bridge, Nose Tip & Cheekbone)
            float noseBridgeGlow = fastGauss(bx, 0.0055) * smoothstep(uMouthLandmark.y + 0.026, uMouthLandmark.y + 0.036, by) * (1.0 - smoothstep(uEyeLandmark.y - 0.004, uEyeLandmark.y + 0.006, by)) * smoothstep(0.075, 0.09, bz);
            float noseTipGlow = fastGauss2(bx, 0.0080, by - (uMouthLandmark.y + 0.025), 0.0080) * smoothstep(0.082, 0.096, bz);
            float cheekHighArc = fastGauss2(ax - (eyeCenterX + 0.015), 0.016, by - (uEyeLandmark.y - 0.015), 0.0095) * smoothstep(0.045, 0.072, bz);
            float dewyGlow = (noseBridgeGlow * 0.16 + noseTipGlow * 0.20 + cheekHighArc * 0.14) * glowWeight;
            vDewyGlowVal = clamp((noseBridgeGlow * 0.65 + noseTipGlow * 0.85 + cheekHighArc * 0.65) * glowWeight, 0.0, 1.0);
            diffuseColor.rgb = min(vec3(1.0), diffuseColor.rgb + vec3(dewyGlow, dewyGlow * 0.95, dewyGlow * 0.9));
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          if (uEnableMakeup > 0.5) {
            float targetLipRough = mix(0.54, 0.05, clamp(vLipGlossVal, 0.0, 1.0));
            roughnessFactor = mix(roughnessFactor, targetLipRough, clamp(vLipMaskVal, 0.0, 1.0));
            roughnessFactor = mix(roughnessFactor, 0.20, clamp(vDewyGlowVal * 0.65, 0.0, 0.65));
          }
          `
        );
  };
  mat.customProgramCacheKey = () => 'female_makeup_shader_v5_crisp_eyelid';
  mat.needsUpdate = true;
}

/**
 * Pure-ASCII GLSL Top Garment, Torso-Anchored 3D Photo Reconstruction & True Anatomical Bare Skin Shader.
 * - Reconstructs 3D garments from uploaded background-removed photos with 85-90% fidelity:
 *   1. Maps torso [torsoLeftX..torsoRightX] 1:1 onto the 3D mannequin torso (`u in [0.18, 0.82]`) and sleeves onto `u in [0, 0.18)` & `(0.82, 1]`.
 *   2. Uses the segmented photo alpha (`photoSample.a`) + `uPhotoCutout` to carve out the exact neckline, straps, sleeves, and cropped hem over anatomical bare skin.
 *   3. Extracts multi-scale 3D normal/wrinkle gradients (`vPhotoGradX`, `vPhotoGradY`) and stitched seam bevels so the 2D photo catches real 3D directional lighting.
 */
function attachTopGarmentShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: TopShaderUniforms
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTopStyle = uniforms.uTopStyle;
    shader.uniforms.uIsMale = uniforms.uIsMale;
    shader.uniforms.uIsDress = uniforms.uIsDress;
    shader.uniforms.uFabricCode = uniforms.uFabricCode;
    shader.uniforms.uSkinColor = uniforms.uSkinColor;
    shader.uniforms.uTrimColor = uniforms.uTrimColor;
    shader.uniforms.uHasPhotoTex = uniforms.uHasPhotoTex;
    shader.uniforms.uPhotoTex = uniforms.uPhotoTex;
    shader.uniforms.uPhotoCutout = uniforms.uPhotoCutout;
    shader.uniforms.uWetness = uniforms.uWetness;

    shader.vertexShader =
      `
      attribute vec3 aBindPos;
      varying vec3 vBindPos;
      varying vec3 vBindNorm;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vBindPos = aBindPos;
        vBindNorm = objectNormal;
        `
      );

    shader.fragmentShader =
      `
      uniform float uTopStyle;
      uniform float uIsMale;
      uniform float uIsDress;
      uniform float uFabricCode;
      uniform vec3 uSkinColor;
      uniform vec3 uTrimColor;
      uniform float uHasPhotoTex;
      uniform sampler2D uPhotoTex;
      uniform vec4 uPhotoCutout;
      uniform float uWetness;
      varying vec3 vBindPos;
      varying vec3 vBindNorm;
      float fastGauss(float d, float w) {
        float t = clamp(abs(d) / w, 0.0, 1.0);
        float u = 1.0 - t * t;
        return u * u;
      }
      float fastGauss2(float dx, float wx, float dy, float wy) {
        float tx = dx / wx;
        float ty = dy / wy;
        float u = clamp(1.0 - (tx * tx + ty * ty), 0.0, 1.0);
        return u * u;
      }
      ` +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `
          #include <map_fragment>
          float vBareSkinMask = 0.0;
          float vPhotoGradX = 0.0;
          float vPhotoGradY = 0.0;
          {
            float bx = vBindPos.x;
            float by = vBindPos.y;
            float bz = vBindPos.z;
            float ax = abs(bx);
            float clothMask = 1.0;
            float trimHighlight = 0.0;
            float seamShade = 1.0;
            int st = int(uTopStyle + 0.5);
            int fab = int(uFabricCode + 0.5);

            // Sample uploaded photo texture in uniform control flow using Torso-Anchored 3D UV projection
            vec4 photoSample = vec4(1.0);
            vec4 backFabricSample = vec4(1.0);
            float reliefBump = 0.0;
            float uP = 0.5;
            float vP = 0.5;
            float minYBind = uIsMale > 0.5 ? 1.015 : 1.045;
            float maxYBind = uIsMale > 0.5 ? 1.505 : 1.462;
            float targetPhotoNeckY = uIsMale > 0.5 ? 1.435 : 1.395;
            if (uHasPhotoTex > 0.5) {
              float torsoHalfX = uIsMale > 0.5 ? 0.150 : 0.124;
              float neckDepth = clamp(uPhotoCutout.x, 0.04, 0.72);
              float hemCut = clamp(uPhotoCutout.z, 0.0, 1.0);
              minYBind = mix(uIsMale > 0.5 ? 1.015 : 1.045, 1.182, hemCut);
              maxYBind = uIsMale > 0.5 ? 1.505 : (st == 3 || st == 4 ? 1.365 : 1.462);

              float neckHalfW = uIsMale > 0.5 ? 0.086 : 0.078;
              float tNeck = clamp(ax / neckHalfW, 0.0, 1.0);
              float frontCollarMinY = mix(
                uIsMale > 0.5 ? 1.425 : 1.392,
                uIsMale > 0.5 ? 1.345 : 1.298,
                neckDepth
              );
              float shoulderNeckTopY = uIsMale > 0.5 ? 1.492 : 1.445;
              float frontNeckY = mix(frontCollarMinY, shoulderNeckTopY, tNeck * tNeck);
              float backNeckY = mix(
                uIsMale > 0.5 ? 1.456 : 1.418,
                shoulderNeckTopY,
                tNeck * tNeck
              );
              targetPhotoNeckY = mix(backNeckY, frontNeckY, smoothstep(-0.015, 0.015, bz));

              // Compress vP in the central collar column so by=targetPhotoNeckY samples clean front chest fabric
              // (vP <= 0.80) below the 2D photo's empty neck hole / inner back collar / brand tag!
              float inCollarColumn = 1.0 - smoothstep(0.015, neckHalfW + 0.022, ax);
              float effectiveMaxY = mix(maxYBind, targetPhotoNeckY + 0.008, inCollarColumn);
              float maxCollarVP = mix(0.97, mix(0.82, 0.72, neckDepth), inCollarColumn);

              uP = clamp(0.5 + (bx / torsoHalfX) * 0.32, 0.01, 0.99);
              vP = clamp(((by - minYBind) / max(0.14, effectiveMaxY - minYBind)) * maxCollarVP, 0.01, 0.98);
              photoSample = texture2D(uPhotoTex, vec2(uP, vP));
              vec4 photoDxFine = texture2D(uPhotoTex, vec2(min(0.99, uP + 0.0035), vP));
              vec4 photoDyFine = texture2D(uPhotoTex, vec2(uP, min(0.99, vP + 0.0035)));
              vec4 photoDxMacro = texture2D(uPhotoTex, vec2(min(0.99, uP + 0.014), vP));
              vec4 photoDyMacro = texture2D(uPhotoTex, vec2(uP, min(0.99, vP + 0.014)));
              float dFineX = dot(photoSample.rgb - photoDxFine.rgb, vec3(0.333));
              float dFineY = dot(photoSample.rgb - photoDyFine.rgb, vec3(0.333));
              float dMacroX = dot(photoSample.rgb - photoDxMacro.rgb, vec3(0.333));
              float dMacroY = dot(photoSample.rgb - photoDyMacro.rgb, vec3(0.333));
              vPhotoGradX = clamp(dFineX * 2.2 + dMacroX * 1.4, -0.45, 0.45);
              vPhotoGradY = clamp(dFineY * 2.2 + dMacroY * 1.4, -0.45, 0.45);
              reliefBump = (dFineX + dFineY) * 0.52 + (dMacroX + dMacroY) * 0.28;
              backFabricSample = texture2D(uPhotoTex, vec2(clamp(0.5 + (bx / torsoHalfX) * 0.16, 0.32, 0.68), clamp(vP * 0.55 + 0.22, 0.24, 0.74)));
            }

            if (st == 100) {
              clothMask = 0.0;
            } else if (uIsMale < 0.5) {
              if (st == 1) {
                // 1. silk_blouse_bow: keyhole slit below bow + tailored placket
                float keyhole = smoothstep(0.022, 0.008, ax) * smoothstep(1.35, 1.38, by) * smoothstep(1.445, 1.425, by) * step(0.02, bz);
                clothMask = 1.0 - keyhole;
                float centerPlacket = smoothstep(0.011, 0.003, ax) * smoothstep(1.03, 1.36, by) * step(0.02, bz);
                trimHighlight = centerPlacket * 0.45;
              } else if (st == 2) {
                // 2. baby_tee: curved crop hem above navel + cap sleeves + ringer trim
                float cropCurve = 1.182 - 0.014 * cos(clamp(bx / 0.14, -1.0, 1.0) * 3.14159);
                float mWaist = smoothstep(cropCurve - 0.005, cropCurve + 0.005, by);
                float capLimit = 0.186 - (1.37 - by) * 0.14;
                float mSleeve = 1.0 - smoothstep(capLimit - 0.005, capLimit + 0.004, ax) * step(1.20, by);
                float neckY = (bz > 0.0 ? 1.438 : 1.462) + ax * 0.22;
                float mNeck = 1.0 - smoothstep(neckY - 0.005, neckY + 0.005, by) * smoothstep(0.088, 0.068, ax);
                clothMask = mWaist * mSleeve * mNeck;

                float neckRing = smoothstep(0.015, 0.003, abs(by - neckY)) * smoothstep(0.092, 0.068, ax) * clothMask;
                float cuffRing = smoothstep(0.014, 0.003, abs(ax - capLimit)) * step(1.20, by) * clothMask;
                float hemRing = smoothstep(0.013, 0.003, abs(by - cropCurve)) * clothMask;
                trimHighlight = max(neckRing, max(cuffRing, hemRing * 0.75));
              } else if (st == 3) {
                // 3. off_shoulder_knit: Bardot horizontal off-shoulder neckline + folded knit band
                float bardotTop = 1.352 - 0.012 * (1.0 - smoothstep(0.0, 0.14, ax)) * step(0.0, bz);
                clothMask = 1.0 - smoothstep(bardotTop - 0.005, bardotTop + 0.005, by);
                float foldBottom = bardotTop - 0.056;
                float foldSeam = smoothstep(0.008, 0.001, abs(by - foldBottom)) * clothMask;
                float ribKnit = sin(bx * 210.0) * 0.045 * clothMask;
                seamShade = 1.0 + ribKnit - foldSeam * 0.18;
                trimHighlight = smoothstep(0.011, 0.002, abs(by - bardotTop)) * clothMask * 0.55;
              } else if (st == 4) {
                // 4. corset_top: strapless sweetheart bustier + vertical boning + Basque V-hem
                float mNoSleeves = 1.0 - smoothstep(0.125, 0.133, ax) * step(1.19, by);
                float shTop = bz >= 0.0
                  ? 1.298 + 0.058 * sin(clamp(ax / 0.116, 0.0, 1.0) * 3.14159)
                  : 1.288;
                float mTop = 1.0 - smoothstep(shTop - 0.005, shTop + 0.005, by);
                float vHem = bz >= 0.0
                  ? 1.068 + 0.052 * smoothstep(0.015, 0.125, ax)
                  : 1.095;
                float mBottom = uIsDress > 0.5 ? 1.0 : smoothstep(vHem - 0.005, vHem + 0.005, by);
                clothMask = mNoSleeves * mTop * mBottom;

                float bone1 = smoothstep(0.0045, 0.001, abs(ax - 0.038));
                float bone2 = smoothstep(0.0045, 0.001, abs(ax - 0.082));
                float boneCenter = smoothstep(0.004, 0.001, ax) * step(0.0, bz);
                float cupArc = smoothstep(0.006, 0.0015, abs(length(vec2((ax - 0.058) * 1.15, by - 1.300)) - 0.056)) * step(0.02, bz) * step(by, 1.300);
                float topPiping = smoothstep(0.010, 0.002, abs(by - shTop)) * clothMask;
                float botPiping = uIsDress > 0.5 ? 0.0 : smoothstep(0.010, 0.002, abs(by - vHem)) * clothMask;
                trimHighlight = clamp((bone1 + bone2 + boneCenter) * 0.55 + cupArc * 0.65 + topPiping * 0.85 + botPiping * 0.75, 0.0, 1.0) * clothMask;
                seamShade = 1.0 - (bone1 + bone2 + cupArc) * 0.10;
              } else if (st == 5) {
                // 5. silk_camisole: authentic spaghetti-strap satin camisole over bare shoulders, chest, arms & back
                float tNeck = clamp(ax / 0.072, 0.0, 1.0);
                float frontNeckLine = 1.276 + 0.074 * tNeck * sqrt(tNeck);
                float backBodiceLine = 1.268 + 0.014 * smoothstep(0.035, 0.11, ax);
                float tArmCut = clamp((0.128 - ax) / 0.056, 0.0, 1.0);
                float underArmCut = 1.242 + 0.108 * tArmCut * sqrt(tArmCut);
                float bodyTopY = ax <= 0.072 ? (bz >= 0.0 ? frontNeckLine : backBodiceLine) : underArmCut;
                float mBodice = (1.0 - smoothstep(bodyTopY - 0.004, bodyTopY + 0.004, by)) * (1.0 - smoothstep(0.125, 0.133, ax) * step(1.19, by));
                float strapDist = abs(ax - 0.072);
                float strapMask = smoothstep(0.0072, 0.0038, strapDist) * smoothstep(1.258, 1.275, by) * (1.0 - smoothstep(1.482, 1.494, by));
                float mHem = uIsDress > 0.5 ? 1.0 : smoothstep(1.044, 1.052, by);
                clothMask = max(mBodice, strapMask) * mHem;

                float neckPiping = smoothstep(0.009, 0.002, abs(by - bodyTopY)) * step(ax, 0.125) * clothMask;
                float strapHighlight = smoothstep(0.0045, 0.001, strapDist) * step(bodyTopY, by) * clothMask;
                trimHighlight = max(neckPiping * 0.82, strapHighlight * 0.48);
              } else if (st == 6) {
                // 6. puff_blouse: architectural square neckline + gathered cuff band
                float sqLow = bz >= 0.0 ? 1.326 : 1.375;
                float inSquare = (1.0 - smoothstep(0.068, 0.075, ax)) * smoothstep(sqLow - 0.005, sqLow + 0.005, by);
                float mCrop = uIsDress > 0.5 ? 1.0 : smoothstep(1.075, 1.085, by);
                clothMask = (1.0 - inSquare) * mCrop;

                float sqBorderX = smoothstep(0.010, 0.002, abs(ax - 0.071)) * step(sqLow, by) * step(by, 1.465);
                float sqBorderY = smoothstep(0.010, 0.002, abs(by - sqLow)) * step(ax, 0.075);
                float cuffTrim = smoothstep(0.014, 0.003, abs(ax - 0.222)) * step(1.24, by);
                trimHighlight = clamp(sqBorderX + sqBorderY + cuffTrim, 0.0, 1.0) * clothMask * 0.75;
              } else if (st == 7) {
                // 7. halter_crop: diagonal halter straps converging to neck collar + open back/shoulders
                float mWaist = uIsDress > 0.5 ? 1.0 : smoothstep(1.168, 1.178, by);
                float mNoSleeves = 1.0 - smoothstep(0.125, 0.133, ax) * step(1.19, by);
                float tH = clamp((by - 1.27) / 0.20, 0.0, 1.0);
                float halterOuterX = mix(0.126, 0.052, tH);
                float mFrontHalter = 1.0 - smoothstep(halterOuterX - 0.005, halterOuterX + 0.005, ax) * step(1.27, by);
                float keyhole = smoothstep(0.019, 0.007, ax) * smoothstep(1.34, 1.365, by) * smoothstep(1.425, 1.405, by) * step(0.02, bz);
                float mBackOpen = bz < -0.005 ? (1.0 - smoothstep(1.255, 1.265, by)) : 1.0;
                float neckBand = smoothstep(1.432, 1.442, by) * (1.0 - smoothstep(1.472, 1.482, by)) * (1.0 - smoothstep(0.062, 0.072, ax));
                clothMask = max(mWaist * mNoSleeves * mFrontHalter * (1.0 - keyhole) * mBackOpen, neckBand);

                float halterEdge = smoothstep(0.011, 0.002, abs(ax - halterOuterX)) * step(1.27, by) * step(0.0, bz) * clothMask;
                float waistEdge = uIsDress > 0.5 ? 0.0 : smoothstep(0.012, 0.002, abs(by - 1.173)) * clothMask;
                trimHighlight = max(halterEdge, max(waistEdge, neckBand * 0.65)) * 0.8;
              } else if (st == 8) {
                // 8. crop_cardigan: deep V-neck + button placket + cropped waist
                float mWaist = uIsDress > 0.5 ? 1.0 : smoothstep(1.115, 1.125, by);
                float vEdgeX = max(0.0, (by - 1.305) * 0.44);
                float inVNeck = (1.0 - smoothstep(vEdgeX - 0.005, vEdgeX + 0.005, ax)) * step(1.305, by) * step(0.01, bz);
                clothMask = mWaist * (1.0 - inVNeck);

                float placket = smoothstep(0.013, 0.003, ax) * step(by, 1.31) * step(0.01, bz) * clothMask;
                float vTrim = smoothstep(0.012, 0.002, abs(ax - vEdgeX)) * step(1.305, by) * step(0.01, bz) * clothMask;
                float buttons = smoothstep(0.007, 0.003, length(vec2(bx, mod(by - 1.13, 0.048) - 0.024))) * step(by, 1.30) * step(0.02, bz) * clothMask;
                trimHighlight = clamp(placket * 0.6 + vTrim * 0.8 + buttons, 0.0, 1.0);
              } else if (st == 10) {
                // 10. peplum_waist_top: sculpted princess seams + sweetheart collar notch
                float inNotch = (1.0 - smoothstep(0.028, 0.036, ax)) * smoothstep(1.385, 1.395, by) * step(0.015, bz);
                clothMask = 1.0 - inNotch;
                float waistBelt = uIsDress > 0.5 ? 0.0 : smoothstep(0.014, 0.003, abs(by - 1.135)) * clothMask;
                trimHighlight = waistBelt * 0.75;
              }
            } else {
              if (st == 27) {
                // 27. fitted_tank: deep athletic armholes, clean shoulder straps, U-scoop neck & racerback
                float mNoSleeves = 1.0 - smoothstep(0.154, 0.162, ax) * step(1.22, by);
                float scoopMin = bz >= 0.0 ? 1.395 : 1.425;
                float tScoop = clamp(ax / 0.072, 0.0, 1.0);
                float neckCurve = scoopMin + 0.185 * tScoop * tScoop;
                float mNeck = 1.0 - smoothstep(neckCurve - 0.005, neckCurve + 0.005, by) * (1.0 - smoothstep(0.070, 0.078, ax));

                float tArm = clamp((by - 1.30) / 0.26, 0.0, 1.0);
                float armCutX = bz >= 0.0
                  ? mix(0.154, 0.110, sin(tArm * 1.5708))
                  : mix(0.152, 0.092, sin(tArm * 1.5708));
                float mArmhole = 1.0 - smoothstep(armCutX - 0.005, armCutX + 0.005, ax) * step(1.26, by);
                clothMask = mNoSleeves * mNeck * mArmhole;

                float neckRib = smoothstep(0.014, 0.003, abs(by - neckCurve)) * step(ax, 0.078) * clothMask;
                float armRib = smoothstep(0.014, 0.003, abs(ax - armCutX)) * step(1.26, by) * clothMask;
                float ribTex = sin(bx * 240.0) * 0.032 * clothMask;
                seamShade = 1.0 + ribTex;
                trimHighlight = max(neckRib, armRib) * 0.85;
              } else if (st == 22 || st == 23) {
                float placket = smoothstep(0.014, 0.003, ax) * smoothstep(1.39, 1.40, by) * step(0.02, bz);
                trimHighlight = placket * 0.7;
              } else if (st == 26) {
                float compSeam = smoothstep(0.006, 0.0015, abs(ax - 0.095)) * step(1.05, by) * step(by, 1.48);
                trimHighlight = compSeam * 0.65;
              }
            }

            // Real-time 3D bind-space fabric micro-structure & sheen modulation (ONLY on fabric!)
            if (fab == 2) {
              float sVal = max(0.0, sin(by * 28.0 + bx * 18.0));
              float silkWave = sVal * sVal * sVal * 0.14;
              seamShade *= (1.02 + silkWave);
            } else if (fab == 3) {
              float twill = sin((bx + by) * 320.0) * 0.045;
              seamShade *= (0.98 + twill);
            } else if (fab == 4) {
              float lGrain = sin(bx * 280.0) * cos(by * 280.0) * 0.04;
              seamShade *= (1.0 + lGrain);
            } else if (fab == 5) {
              float wRib = sin(bx * 220.0) * 0.065;
              seamShade *= (0.97 + wRib);
            } else if (fab == 6) {
              float linenCross = (sin(bx * 300.0) + sin(by * 300.0)) * 0.038;
              seamShade *= (0.98 + linenCross);
            }

            vec3 nBind = normalize(vBindNorm);
            float rawLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float clothAO = mix(0.84, 1.07, clamp(rawLum, 0.0, 1.0));
            vec3 clothRGB = diffuseColor.rgb * seamShade;
            if (uHasPhotoTex < 0.5) {
              clothRGB = mix(clothRGB, uTrimColor * clothAO, clamp(trimHighlight, 0.0, 1.0));
            }

            // High-Fidelity 3D Bind-Space Uploaded Photo Reconstruction (90%+ Match on Both Front & Back)
            if (uHasPhotoTex > 0.5 && st != 100) {
              // 1. Apply clean 3D anatomical collar curve around the neck + photo silhouette on shoulders/sleeves/hem
              float photoAlpha = smoothstep(0.16, 0.62, photoSample.a);
              float sleeveSpan = uPhotoCutout.y;
              float mHemPhoto = smoothstep(minYBind - 0.005, minYBind + 0.005, by);
              float armCutX = sleeveSpan < 0.35
                ? (uIsMale > 0.5 ? 0.156 : 0.128)
                : (sleeveSpan < 0.68 ? (uIsMale > 0.5 ? 0.235 : 0.198) : 0.65);
              float mArmPhoto = 1.0 - smoothstep(armCutX - 0.006, armCutX + 0.006, ax) * step(1.20, by);

              float neckHalfW = uIsMale > 0.5 ? 0.086 : 0.078;
              float mClean3DCollar = 1.0 - smoothstep(targetPhotoNeckY - 0.005, targetPhotoNeckY + 0.005, by) * (1.0 - smoothstep(neckHalfW - 0.004, neckHalfW + 0.006, ax));
              float mBardotOrBustier = (st == 3)
                ? (1.0 - smoothstep(1.348, 1.356, by))
                : ((st == 4) ? (1.0 - smoothstep(1.315, 1.325, by)) : 1.0);

              // Only use raw 2D photoAlpha outside the central neck opening (for sleeves/shoulders ax > neckHalfW and lower hem vP < 0.16)
              // so noisy 2D collar-hole / tag / hanger pixels never create jagged artifacts at the neck!
              float outerShoulderOrHemZone = max(
                smoothstep(neckHalfW, neckHalfW + 0.025, ax) * smoothstep(0.46, 0.58, vP),
                1.0 - smoothstep(0.06, 0.16, vP)
              );
              float blendedAlpha = mix(1.0, photoAlpha, outerShoulderOrHemZone);
              clothMask = blendedAlpha * mHemPhoto * mArmPhoto * mClean3DCollar * mBardotOrBustier;

              // 2. Seamless 360-Degree Front & Back Projection using (uP, vP) + Natural 3D Back Spine Drape Shading
              vec3 safePhotoRGB = mix(diffuseColor.rgb, photoSample.rgb, smoothstep(0.20, 0.78, photoSample.a));
              float backDrapeFolds = 1.0 + sin(bx * 58.0 + by * 14.0) * 0.035 - fastGauss(bx, 0.022) * 0.045;
              float frontBlend = smoothstep(-0.022, 0.022, bz);
              vec3 wrappedPhoto = mix(safePhotoRGB * backDrapeFolds, safePhotoRGB, frontBlend);

              // 3. 3D Stitched Collar & Seam Bevel + Anatomical Drape Shading
              float collarRib = smoothstep(0.012, 0.002, abs(by - targetPhotoNeckY)) * step(ax, neckHalfW + 0.006) * clothMask;
              float edgeBevel = smoothstep(0.25, 0.72, clothMask) * (1.0 - smoothstep(0.72, 0.96, clothMask));
              float photoDrape = (0.93 + 0.09 * max(0.0, abs(nBind.z)) + 0.05 * nBind.y) * (seamShade + reliefBump * (0.65 + 0.35 * frontBlend) - collarRib * 0.04);
              clothRGB = wrappedPhoto * photoDrape + vec3((edgeBevel + collarRib * 0.5) * 0.042);
            }

            // Note: When wearing a 1-piece Dress (uIsDress > 0.5), keep clothMask = 1.0 all the way down to the bottom of topMesh
            // so the abdomen/waist is 100% dress fabric (clothRGB) and NEVER turns into bare belly skin!
            float finalCloth = clamp(clothMask, 0.0, 1.0);
            vBareSkinMask = 1.0 - finalCloth;

            // High-Definition 3D Anatomical Bare Skin Shading (collarbones, sternum cleavage, 3D breasts/pectorals,
            // inframammary fold, tapered ribcage, linea alba, obliques & sculpted navel).
            // Smoothly fades to 1.0 at the neck, upper-arm, and waist seams so Wolf3D_Outfit_Top blends 100% seamlessly
            // with Wolf3D_Head, Wolf3D_Body, and Wolf3D_Outfit_Bottom with zero holes or color steps!
            float seamFadeToBaseSkin = clamp(
              smoothstep(uIsMale > 0.5 ? 0.165 : 0.140, uIsMale > 0.5 ? 0.205 : 0.175, ax) +
              smoothstep(uIsMale > 0.5 ? 1.44 : 1.37, uIsMale > 0.5 ? 1.50 : 1.42, by) +
              (1.0 - smoothstep(1.02, 1.08, by)),
              0.0,
              1.0
            );
            float anatDetailEnv = (1.0 - seamFadeToBaseSkin) * (1.0 - smoothstep(0.125, 0.165, ax));
            float anatWrap = 0.995 + (0.025 * nBind.y + 0.025 * max(0.0, nBind.z) - 0.018 * max(0.0, -nBind.y)) * (1.0 - seamFadeToBaseSkin);
            float isFront = step(0.01, bz);
            float cleavageCenterY = uIsMale > 0.5 ? 1.35 : 1.292;
            float cleavage = fastGauss2(bx, 0.016, by - cleavageCenterY, 0.058) * isFront * anatDetailEnv;
            float bustCupX = uIsMale > 0.5 ? 0.064 : 0.055;
            float bustTopHighlight = fastGauss2(ax - bustCupX, 0.038, by - (uIsMale > 0.5 ? 1.355 : 1.308), 0.034) * isFront * anatDetailEnv;
            float underBustCreaseY = (uIsMale > 0.5 ? 1.252 : 1.226) + 0.012 * pow(clamp((ax - 0.02) / 0.09, 0.0, 1.0), 2.0);
            float underBustShadow = fastGauss(by - underBustCreaseY, uIsMale > 0.5 ? 0.012 : 0.014) * smoothstep(0.018, 0.038, ax) * (1.0 - smoothstep(0.095, 0.125, ax)) * isFront * anatDetailEnv;
            float clavicle = fastGauss(by - (uIsMale > 0.5 ? 1.485 : 1.385), 0.012) * smoothstep(0.022, 0.105, ax) * isFront * anatDetailEnv;
            float clavicleHollow = fastGauss(by - (uIsMale > 0.5 ? 1.502 : 1.402), 0.012) * smoothstep(0.018, 0.095, ax) * isFront * anatDetailEnv;
            float sternalNotch = fastGauss2(bx, 0.014, by - (uIsMale > 0.5 ? 1.475 : 1.378), 0.016) * isFront * anatDetailEnv;
            float lineaAlba = fastGauss(bx, 0.009) * smoothstep(1.06, 1.10, by) * (1.0 - smoothstep(1.20, 1.25, by)) * isFront * anatDetailEnv;
            float obliqueLine = fastGauss(ax - (uIsMale > 0.5 ? 0.056 : 0.046), 0.011) * smoothstep(1.06, 1.10, by) * (1.0 - smoothstep(1.19, 1.23, by)) * isFront * anatDetailEnv;
            float ribcageSideShade = smoothstep(0.075, 0.125, ax) * smoothstep(1.07, 1.24, by) * (1.0 - smoothstep(1.28, 1.36, by)) * 0.035 * anatDetailEnv;
            float backSpineGroove = fastGauss(bx, 0.018) * smoothstep(1.08, 1.38, by) * step(0.015, -bz) * anatDetailEnv;
            float navel = fastGauss2(bx, 0.009, by - 1.098, 0.012) * isFront * anatDetailEnv;
            float navelRim = fastGauss2(bx, 0.012, by - 1.106, 0.008) * isFront * anatDetailEnv;
            float edgeContactShadow = smoothstep(0.02, 0.48, clothMask) * (1.0 - smoothstep(0.48, 0.94, clothMask));
            float pureSkinShade =
              anatWrap
              - cleavage * (uIsMale > 0.5 ? 0.055 : 0.095)
              + bustTopHighlight * (uIsMale > 0.5 ? 0.028 : 0.042)
              - underBustShadow * (uIsMale > 0.5 ? 0.055 : 0.088)
              + clavicle * 0.038
              - clavicleHollow * 0.032
              - sternalNotch * 0.038
              - lineaAlba * 0.032
              - obliqueLine * 0.026
              - ribcageSideShade
              - backSpineGroove * 0.045
              - navel * 0.14
              + navelRim * 0.028
              - edgeContactShadow * 0.10;
            vec3 bareSkinRGB = uSkinColor * pureSkinShade;

            // Rain Wetness Physics: Water absorption darkening, shoulder/chest rain-soak patches & damp hem saturation
            if (uWetness > 0.005) {
              float shoulderSoak = smoothstep(1.24, 1.46, by) * 0.35 + max(0.0, nBind.y) * 0.35;
              float hemSoak = (1.0 - smoothstep(1.02, 1.16, by)) * 0.25;
              float rainStreak = 0.5 + 0.5 * sin(bx * 74.0 + sin(by * 26.0) * 2.1) * cos(by * 19.0 - bx * 12.0);
              float soakPattern = clamp(0.58 + shoulderSoak + hemSoak + rainStreak * 0.28, 0.0, 1.18);
              float absStrength = (fab == 4) ? 0.20 : ((fab == 2) ? 0.36 : 0.46);
              float wetDarken = clamp(uWetness * absStrength * soakPattern, 0.0, 0.56);
              clothRGB *= (1.0 - wetDarken);
              // Subtle wet specular sheen on upward-facing wet cloth folds
              float wetGlint = pow(max(0.0, nBind.y * 0.65 + abs(nBind.z) * 0.55), 5.0) * uWetness * 0.095;
              clothRGB += vec3(wetGlint);
              bareSkinRGB *= (1.0 - uWetness * 0.05);
            }

            diffuseColor.rgb = mix(bareSkinRGB, clothRGB, finalCloth);
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          float wetClothRough = mix(roughnessFactor, 0.09, clamp(uWetness * 0.85, 0.0, 0.92));
          float wetSkinRough = mix(0.44, 0.16, clamp(uWetness * 0.75, 0.0, 0.85));
          roughnessFactor = mix(wetClothRough, wetSkinRough, vBareSkinMask);
          `
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `
          #include <metalnessmap_fragment>
          float wetClothMetal = mix(metalnessFactor, 0.14, clamp(uWetness * 0.55, 0.0, 0.75));
          metalnessFactor = mix(wetClothMetal, 0.02, vBareSkinMask);
          `
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          vec3 preBumpNormal = normal;
          #include <normal_fragment_maps>
          if (uHasPhotoTex > 0.5 && vBareSkinMask < 0.95) {
            normal = normalize(normal + vec3(vPhotoGradX, vPhotoGradY, 0.0) * (1.0 - vBareSkinMask));
          }
          normal = normalize(mix(normal, preBumpNormal, vBareSkinMask));
          `
        );
  };
  mat.customProgramCacheKey = () => 'top_garment_shader_v10_dress_seamless';
  mat.needsUpdate = true;
}

/**
 * Pure-ASCII GLSL Outerwear Cutout, Lapel Trim & 3D Photo Projection Shader.
 */
function attachOuterwearCutoutShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: OuterShaderUniforms
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uOuterStyle = uniforms.uOuterStyle;
    shader.uniforms.uIsMale = uniforms.uIsMale;
    shader.uniforms.uFabricCode = uniforms.uFabricCode;
    shader.uniforms.uTrimColor = uniforms.uTrimColor;
    shader.uniforms.uHasPhotoTex = uniforms.uHasPhotoTex;
    shader.uniforms.uPhotoTex = uniforms.uPhotoTex;
    shader.uniforms.uWetness = uniforms.uWetness;

    shader.vertexShader =
      `
      attribute vec3 aBindPos;
      varying vec3 vBindPos;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vBindPos = aBindPos;
        `
      );

    shader.fragmentShader =
      `
      uniform float uOuterStyle;
      uniform float uIsMale;
      uniform float uFabricCode;
      uniform vec3 uTrimColor;
      uniform float uHasPhotoTex;
      uniform sampler2D uPhotoTex;
      uniform float uWetness;
      varying vec3 vBindPos;
      ` +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `
          #include <map_fragment>
          float vOuterGradX = 0.0;
          float vOuterGradY = 0.0;
          {
            float bx = vBindPos.x;
            float by = vBindPos.y;
            float bz = vBindPos.z;
            float ax = abs(bx);
            int ost = int(uOuterStyle + 0.5);
            bool isFront = bz > 0.005;
            float lapelTrim = 0.0;

            vec4 outerPhotoSample = vec4(1.0);
            vec4 outerBackSample = vec4(1.0);
            if (uHasPhotoTex > 0.5) {
              float torsoHalfX = uIsMale > 0.5 ? 0.158 : 0.132;
              float uP = clamp(0.5 + (bx / torsoHalfX) * 0.32, 0.015, 0.985);
              float vP = clamp((by - 1.02) / 0.46, 0.015, 0.985);
              outerPhotoSample = texture2D(uPhotoTex, vec2(uP, vP));
              vec4 outerDx = texture2D(uPhotoTex, vec2(min(0.99, uP + 0.004), vP));
              vec4 outerDy = texture2D(uPhotoTex, vec2(uP, min(0.99, vP + 0.004)));
              vOuterGradX = clamp(dot(outerPhotoSample.rgb - outerDx.rgb, vec3(0.333)) * 2.4, -0.45, 0.45);
              vOuterGradY = clamp(dot(outerPhotoSample.rgb - outerDy.rgb, vec3(0.333)) * 2.4, -0.45, 0.45);
              outerBackSample = texture2D(uPhotoTex, vec2(clamp(0.5 + (bx / torsoHalfX) * 0.16, 0.30, 0.70), clamp(vP * 0.6 + 0.2, 0.2, 0.8)));
            }

            if (ost == 0) {
              discard;
            } else if (ost == 1) {
              float openW = 0.036 + max(0.0, (by - 1.12) * 0.115);
              if (isFront && ax < openW) discard;
              lapelTrim = isFront ? smoothstep(0.018, 0.003, abs(ax - openW)) : 0.0;
            } else if (ost == 2) {
              float openW = 0.048 + max(0.0, (by - 1.15) * 0.085);
              if (isFront && ax < openW) discard;
              lapelTrim = isFront ? smoothstep(0.022, 0.004, abs(ax - openW)) : 0.0;
            } else if (ost == 3) {
              float minY = uIsMale > 0.5 ? 1.04 : 1.065;
              if (by < minY) discard;
              if (isFront && bx > -0.028 && bx < 0.048) discard;
              if (isFront && (abs(bx - (-0.028)) < 0.012 || abs(bx - 0.048) < 0.012)) {
                lapelTrim = 0.85;
              }
            } else if (ost == 4) {
              float minY = uIsMale > 0.5 ? 1.045 : 1.07;
              if (by < minY) discard;
              if (isFront && ax < 0.040) discard;
              lapelTrim = isFront ? smoothstep(0.015, 0.003, abs(ax - 0.040)) : 0.0;
            } else if (ost == 5) {
              if (isFront && ax < 0.035) discard;
              float hemY = uIsMale > 0.5 ? 1.01 : 1.04;
              lapelTrim = max(
                isFront ? smoothstep(0.012, 0.002, abs(ax - 0.035)) : 0.0,
                smoothstep(0.022, 0.004, abs(by - hemY))
              );
            } else if (ost == 6) {
              float maxArmX = uIsMale > 0.5 ? 0.164 : 0.136;
              if (ax > maxArmX && by > 1.24) discard;
              if (isFront && ax < 0.036) discard;
              lapelTrim = isFront ? smoothstep(0.014, 0.003, abs(ax - 0.036)) : 0.0;
            }

            float rawLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float ao = mix(0.82, 1.10, clamp(rawLum, 0.0, 1.0));
            if (uHasPhotoTex > 0.5) {
              vec3 safeOuterPhoto = mix(diffuseColor.rgb, outerPhotoSample.rgb, smoothstep(0.20, 0.78, outerPhotoSample.a));
              float frontBlend = smoothstep(-0.02, 0.02, bz);
              vec3 outerPhotoRGB = mix(safeOuterPhoto * 0.96, safeOuterPhoto, frontBlend);
              diffuseColor.rgb = outerPhotoRGB * (ao + (vOuterGradX + vOuterGradY) * 0.18);
            }
            diffuseColor.rgb = mix(diffuseColor.rgb, uTrimColor * ao, clamp(lapelTrim * 0.75, 0.0, 1.0));
            if (uWetness > 0.005) {
              int oFab = int(uFabricCode + 0.5);
              float shoulderRain = smoothstep(1.24, 1.46, by) * 0.35;
              float streak = 0.5 + 0.5 * sin(bx * 68.0 + sin(by * 24.0) * 2.0) * cos(by * 18.0);
              float soak = clamp(0.60 + shoulderRain + streak * 0.28, 0.0, 1.15);
              float absStr = (oFab == 4) ? 0.20 : ((oFab == 2) ? 0.34 : 0.44);
              diffuseColor.rgb *= (1.0 - clamp(uWetness * absStr * soak, 0.0, 0.52));
              diffuseColor.rgb += vec3(uWetness * 0.055 * streak);
            }
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.08, clamp(uWetness * 0.86, 0.0, 0.92));
          `
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `
          #include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 0.16, clamp(uWetness * 0.58, 0.0, 0.78));
          `
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          #include <normal_fragment_maps>
          if (uHasPhotoTex > 0.5) {
            normal = normalize(normal + vec3(vOuterGradX, vOuterGradY, 0.0));
          }
          `
        );
  };
  mat.customProgramCacheKey = () => 'outerwear_cutout_shader_v7_wet_rain';
  mat.needsUpdate = true;
}

/**
 * Pure-ASCII GLSL Bottom Garment & 3D Photo Reconstruction Shader for Skirts (bare legs below hem),
 * Shorts (cuffed shorts + bare thighs/knees/calves), Cargo Pants (3D thigh pocket flaps & snaps),
 * Jeans, Dress Trousers, Chinos, and Joggers.
 */
function attachBottomGarmentShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: BottomShaderUniforms
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uBottomStyle = uniforms.uBottomStyle;
    shader.uniforms.uIsMale = uniforms.uIsMale;
    shader.uniforms.uIsDress = uniforms.uIsDress;
    shader.uniforms.uFabricCode = uniforms.uFabricCode;
    shader.uniforms.uSkinColor = uniforms.uSkinColor;
    shader.uniforms.uTrimColor = uniforms.uTrimColor;
    shader.uniforms.uHasPhotoTex = uniforms.uHasPhotoTex;
    shader.uniforms.uPhotoTex = uniforms.uPhotoTex;
    shader.uniforms.uWetness = uniforms.uWetness;

    shader.vertexShader =
      `
      attribute vec3 aBindPos;
      varying vec3 vBindPos;
      varying vec3 vBindNorm;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vBindPos = aBindPos;
        vBindNorm = objectNormal;
        `
      );

    shader.fragmentShader =
      `
      uniform float uBottomStyle;
      uniform float uIsMale;
      uniform float uIsDress;
      uniform float uFabricCode;
      uniform vec3 uSkinColor;
      uniform vec3 uTrimColor;
      uniform float uHasPhotoTex;
      uniform sampler2D uPhotoTex;
      uniform float uWetness;
      varying vec3 vBindPos;
      varying vec3 vBindNorm;
      float fastGauss(float d, float w) {
        float t = clamp(abs(d) / w, 0.0, 1.0);
        float u = 1.0 - t * t;
        return u * u;
      }
      float fastGauss2(float dx, float wx, float dy, float wy) {
        float tx = dx / wx;
        float ty = dy / wy;
        float u = clamp(1.0 - (tx * tx + ty * ty), 0.0, 1.0);
        return u * u;
      }
      ` +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `
          #include <map_fragment>
          float vBareLegMask = 0.0;
          float vBotGradX = 0.0;
          float vBotGradY = 0.0;
          {
            float bx = vBindPos.x;
            float by = vBindPos.y;
            float bz = vBindPos.z;
            float ax = abs(bx);
            float clothMask = 1.0;
            float trimHighlight = 0.0;
            float seamShade = 1.0;
            int bst = int(uBottomStyle + 0.5);
            int fab = int(uFabricCode + 0.5);

            // Waistband & front fly common geometry (no waistband ridge or fly seam on skirts/dresses)
            float isSkirt = (bst == 1 || bst == 2 || bst == 3 || uIsDress > 0.5) ? 1.0 : 0.0;
            float waistBand = (1.0 - isSkirt) * smoothstep(0.012, 0.002, abs(by - 1.015));
            float flySeam = (1.0 - isSkirt) * smoothstep(0.006, 0.0015, ax) * step(0.85, by) * step(by, 1.015) * step(0.02, bz);

            if (bst == 100) {
              clothMask = 0.0;
            } else if (bst == 1 || bst == 2 || bst == 3) {
              // All skirts & dresses use the 3D skirt shell (alineSkirtMesh / maxiSkirtMesh / pencilSkirtMesh);
              // keep thighs, knees & calves on bottomMesh 100% anatomical bare leg skin (by < 0.86) with zero colored pants bands!
              clothMask = smoothstep(0.86, 0.90, by);
            } else if (bst == 4) {
              float shortHem = 0.745 - 0.012 * cos(clamp((ax - 0.095) / 0.09, -1.0, 1.0) * 3.14159);
              clothMask = smoothstep(shortHem - 0.005, shortHem + 0.005, by);
              float cuffBand = smoothstep(0.020, 0.003, abs(by - (shortHem + 0.016))) * clothMask;
              float pocketArc = smoothstep(0.007, 0.0015, abs(length(vec2(ax - 0.135, by - 0.965)) - 0.055)) * step(0.01, bz) * clothMask;
              trimHighlight = clamp(cuffBand * 0.85 + pocketArc * 0.75 + waistBand * 0.65 + flySeam * 0.7, 0.0, 1.0) * clothMask;
            } else if (bst == 23) {
              float shortHem = 0.565;
              clothMask = smoothstep(shortHem - 0.005, shortHem + 0.005, by);
              float cuffTurn = smoothstep(0.022, 0.004, abs(by - (shortHem + 0.018))) * clothMask;
              float slantPocket = smoothstep(0.006, 0.0015, abs((ax - 0.115) - (by - 0.88) * 0.45)) * step(0.88, by) * step(by, 0.99) * step(0.01, bz) * clothMask;
              float creaseLine = smoothstep(0.006, 0.001, abs(ax - 0.098)) * step(shortHem + 0.02, by) * step(by, 0.96) * step(0.02, bz);
              seamShade = 1.0 + creaseLine * 0.08 - cuffTurn * 0.10;
              trimHighlight = clamp(cuffTurn * 0.75 + slantPocket * 0.7 + waistBand * 0.65 + flySeam * 0.65, 0.0, 1.0) * clothMask;
            } else if (bst == 5 || bst == 22) {
              bool inPocketY = by >= 0.59 && by <= 0.79;
              bool inPocketZ = abs(bz) <= 0.072;
              bool onOuterThigh = ax >= 0.122;
              float boxBorderY = max(smoothstep(0.008, 0.0015, abs(by - 0.595)), smoothstep(0.008, 0.0015, abs(by - 0.785)));
              float boxBorderZ = max(smoothstep(0.008, 0.0015, abs(abs(bz) - 0.068)), 0.0);
              float flapLine = smoothstep(0.008, 0.0015, abs(by - 0.742));
              float centerPleat = smoothstep(0.006, 0.0015, abs(bz)) * step(0.595, by) * step(by, 0.742);
              float snapBtn1 = smoothstep(0.008, 0.003, length(vec2(bz - 0.036, by - 0.755)));
              float snapBtn2 = smoothstep(0.008, 0.003, length(vec2(bz + 0.036, by - 0.755)));
              float cargoDetail = onOuterThigh && inPocketY && inPocketZ
                ? clamp(boxBorderY + boxBorderZ + flapLine * 1.1 + centerPleat * 0.8 + (snapBtn1 + snapBtn2) * 1.4, 0.0, 1.0)
                : 0.0;
              float kneeArticulation = (smoothstep(0.006, 0.001, abs(by - 0.535)) + smoothstep(0.006, 0.001, abs(by - 0.495))) * step(0.01, bz);
              float ankleCuff = smoothstep(0.016, 0.003, abs(by - 0.215));
              seamShade = 1.0 - cargoDetail * 0.14 - kneeArticulation * 0.10;
              trimHighlight = clamp(cargoDetail * 0.9 + kneeArticulation * 0.55 + ankleCuff * 0.75 + waistBand * 0.7 + flySeam * 0.7, 0.0, 1.0);
            } else if (bst == 7 || bst == 20) {
              float pressCrease = smoothstep(0.007, 0.001, abs(ax - 0.096)) * step(0.22, by) * step(by, 0.96) * step(0.015, bz);
              seamShade = 1.0 + pressCrease * 0.11;
              trimHighlight = clamp(waistBand * 0.7 + flySeam * 0.55 + pressCrease * 0.35, 0.0, 1.0);
            } else if (bst == 25) {
              float joggerCuff = smoothstep(0.245, 0.215, by) * (0.5 + 0.5 * sin(bx * 260.0));
              trimHighlight = clamp(joggerCuff * 0.85 + waistBand * 0.85, 0.0, 1.0);
            } else {
              float outSeam = smoothstep(0.007, 0.0015, abs(bz)) * step(0.125, ax) * step(0.22, by) * step(by, 0.98);
              float pocketArc = smoothstep(0.007, 0.0015, abs(length(vec2(ax - 0.135, by - 0.965)) - 0.055)) * step(0.01, bz);
              float cuffRoll = bst == 24 ? smoothstep(0.022, 0.004, abs(by - 0.215)) : 0.0;
              trimHighlight = clamp(outSeam * 0.65 + pocketArc * 0.75 + waistBand * 0.7 + flySeam * 0.7 + cuffRoll * 0.85, 0.0, 1.0);
            }

            // Real-time 3D bind-space fabric micro-structure & sheen modulation
            if (fab == 2) {
              float sVal = max(0.0, sin(by * 26.0 + bx * 16.0));
              float silkWave = sVal * sVal * sVal * 0.14;
              seamShade *= (1.02 + silkWave);
            } else if (fab == 3) {
              float twill = sin((bx + by) * 320.0) * 0.048;
              float thighWhisker = sin(by * 140.0 + ax * 40.0) * 0.035 * smoothstep(0.75, 0.92, by) * step(0.02, bz);
              seamShade *= (0.98 + twill + thighWhisker);
            } else if (fab == 4) {
              float lGrain = sin(bx * 280.0) * cos(by * 280.0) * 0.045;
              seamShade *= (1.0 + lGrain);
            } else if (fab == 5) {
              float wRib = sin(bx * 220.0) * 0.065;
              seamShade *= (0.97 + wRib);
            } else if (fab == 6) {
              float linenCross = (sin(bx * 300.0) + sin(by * 300.0)) * 0.04;
              seamShade *= (0.98 + linenCross);
            }

            // Pure anatomical bare leg skin shading (fades smoothly to 1.0 at the ankle and waist seams)
            vec3 nBind = normalize(vBindNorm);
            float legSeamFade = smoothstep(0.20, 0.27, by) * (1.0 - smoothstep(0.95, 1.02, by));
            float legAnatWrap = 0.995 + (0.022 * max(0.0, nBind.z) + 0.018 * nBind.y) * legSeamFade;
            float kneeCap = fastGauss2(ax - 0.115, 0.042, by - 0.525, 0.045) * step(0.02, bz) * legSeamFade;
            float shinHighlight = fastGauss(ax - 0.115, 0.028) * smoothstep(0.25, 0.46, by) * (1.0 - smoothstep(0.48, 0.54, by)) * step(0.03, bz) * legSeamFade;
            float hemShadow = smoothstep(0.01, 0.45, clothMask) * (1.0 - smoothstep(0.45, 0.92, clothMask));
            vec3 bareLegSkinRGB = uSkinColor * (legAnatWrap + kneeCap * 0.032 + shinHighlight * 0.028 - hemShadow * 0.12);

            float rawLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float clothAO = mix(0.84, 1.06, clamp(rawLum, 0.0, 1.0));
            vec3 clothRGB = diffuseColor.rgb * seamShade;
            clothRGB = mix(clothRGB, uTrimColor * clothAO, clamp(trimHighlight, 0.0, 1.0));

            if (uHasPhotoTex > 0.5 && clothMask > 0.01) {
              float uP = 0.5;
              float vP = 0.5;
              if (bst == 1 || bst == 2 || bst == 3) {
                float skirtHem = (bst == 1) ? 0.70 : (bst == 3 ? 0.52 : 0.36);
                uP = clamp(0.5 + (bx / 0.145) * 0.35, 0.14, 0.86);
                vP = clamp((by - skirtHem) / max(0.20, 1.02 - skirtHem), 0.04, 0.96);
              } else {
                float minYBot = (bst == 4) ? 0.72 : (bst == 23 ? 0.55 : 0.21);
                // Map each 3D leg (bx < 0 vs bx >= 0) cleanly onto its corresponding half of the split-leg 3D atlas!
                float legLocalU = clamp((ax - 0.015) / 0.145, 0.04, 0.96);
                uP = bx < 0.0 ? (0.48 - legLocalU * 0.45) : (0.52 + legLocalU * 0.45);
                vP = clamp((by - minYBot) / max(0.20, 1.02 - minYBot), 0.02, 0.98);
              }
              vec4 photoSample = texture2D(uPhotoTex, vec2(uP, vP));
              vec4 photoDx = texture2D(uPhotoTex, vec2(min(0.99, uP + 0.004), vP));
              vec4 photoDy = texture2D(uPhotoTex, vec2(uP, min(0.99, vP + 0.004)));
              vBotGradX = clamp(dot(photoSample.rgb - photoDx.rgb, vec3(0.333)) * 2.4, -0.45, 0.45);
              vBotGradY = clamp(dot(photoSample.rgb - photoDy.rgb, vec3(0.333)) * 2.4, -0.45, 0.45);
              float reliefBump = (vBotGradX + vBotGradY) * 0.22;
              float foldAO = mix(0.80, 1.12, clamp(rawLum, 0.0, 1.0)) * (seamShade + reliefBump);
              vec3 safeBotPhoto = mix(diffuseColor.rgb, photoSample.rgb, smoothstep(0.20, 0.78, photoSample.a));
              clothRGB = safeBotPhoto * foldAO;
              clothRGB = mix(clothRGB, uTrimColor * clothAO, clamp(trimHighlight * 0.52, 0.0, 1.0));
            }

            float finalCloth = clamp(clothMask, 0.0, 1.0);
            vBareLegMask = 1.0 - finalCloth;

            // Rain Wetness Physics on Pants, Jeans, Cargo & Shorts
            if (uWetness > 0.005) {
              float thighRain = smoothstep(0.58, 0.96, by) * max(0.0, nBind.z) * 0.32;
              float cuffSplash = (1.0 - smoothstep(0.20, 0.42, by)) * 0.38;
              float rainStreak = 0.5 + 0.5 * sin(bx * 72.0 + sin(by * 28.0) * 2.2) * cos(by * 20.0);
              float soakPattern = clamp(0.56 + thighRain + cuffSplash + rainStreak * 0.28, 0.0, 1.18);
              float absStrength = (fab == 4) ? 0.20 : ((fab == 2) ? 0.36 : 0.46);
              float wetDarken = clamp(uWetness * absStrength * soakPattern, 0.0, 0.56);
              clothRGB *= (1.0 - wetDarken);
              float wetGlint = pow(max(0.0, nBind.y * 0.55 + abs(nBind.z) * 0.65), 5.0) * uWetness * 0.085;
              clothRGB += vec3(wetGlint);
              bareLegSkinRGB *= (1.0 - uWetness * 0.05);
            }

            diffuseColor.rgb = mix(bareLegSkinRGB, clothRGB, finalCloth);
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          float wetBotRough = mix(roughnessFactor, 0.10, clamp(uWetness * 0.85, 0.0, 0.92));
          float wetLegRough = mix(0.44, 0.16, clamp(uWetness * 0.75, 0.0, 0.85));
          roughnessFactor = mix(wetBotRough, wetLegRough, vBareLegMask);
          `
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `
          #include <metalnessmap_fragment>
          float wetBotMetal = mix(metalnessFactor, 0.14, clamp(uWetness * 0.55, 0.0, 0.75));
          metalnessFactor = mix(wetBotMetal, 0.02, vBareLegMask);
          `
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          vec3 preBumpNormal = normal;
          #include <normal_fragment_maps>
          if (uHasPhotoTex > 0.5 && vBareLegMask < 0.95) {
            normal = normalize(normal + vec3(vBotGradX, vBotGradY, 0.0) * (1.0 - vBareLegMask));
          }
          normal = normalize(mix(normal, preBumpNormal, vBareLegMask));
          `
        );
  };
  mat.customProgramCacheKey = () => 'bottom_garment_shader_v9_dress_seamless';
  mat.needsUpdate = true;
}

/**
 * Pure-ASCII GLSL 3D Footwear Architectural Shader (`Wolf3D_Outfit_Footwear`).
 */
function attachFootwearShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: FootwearShaderUniforms
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShoeStyle = uniforms.uShoeStyle;
    shader.uniforms.uIsMale = uniforms.uIsMale;
    shader.uniforms.uSkinColor = uniforms.uSkinColor;
    shader.uniforms.uShoeColor = uniforms.uShoeColor;
    shader.uniforms.uFootBoundsX = uniforms.uFootBoundsX;
    shader.uniforms.uFootBoundsY = uniforms.uFootBoundsY;
    shader.uniforms.uFootBoundsZ = uniforms.uFootBoundsZ;

    shader.vertexShader =
      `
      attribute vec3 aBindPos;
      varying vec3 vBindPos;
      varying vec3 vBindNorm;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vBindPos = aBindPos;
        vBindNorm = objectNormal;
        `
      );

    shader.fragmentShader =
      `
      uniform float uShoeStyle;
      uniform float uIsMale;
      uniform vec3 uSkinColor;
      uniform vec3 uShoeColor;
      uniform vec2 uFootBoundsX;
      uniform vec2 uFootBoundsY;
      uniform vec2 uFootBoundsZ;
      varying vec3 vBindPos;
      varying vec3 vBindNorm;
      float fastGauss(float d, float w) {
        float t = clamp(abs(d) / w, 0.0, 1.0);
        float u = 1.0 - t * t;
        return u * u;
      }
      ` +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `
          #include <map_fragment>
          float vFootRoughness = 0.35;
          float vFootMetalness = 0.04;
          {
            float rawBx = vBindPos.x;
            float rawBy = vBindPos.y;
            float rawBz = vBindPos.z;
            float ax = abs(rawBx);
            float fx = (ax - uFootBoundsX.x) * (0.048 / max(0.032, uFootBoundsX.y));
            float afx = abs(fx);
            float bx = rawBx >= 0.0 ? (0.169 + fx) : -(0.169 + fx);
            float by = clamp((rawBy - uFootBoundsY.x) / max(0.08, uFootBoundsY.y - uFootBoundsY.x), 0.0, 1.2) * 0.162;
            float bz = -0.075 + clamp((rawBz - uFootBoundsZ.x) / max(0.15, uFootBoundsZ.y - uFootBoundsZ.x), 0.0, 1.0) * 0.295;
            int sst = int(uShoeStyle + 0.5);

            vec3 nBind = normalize(vBindNorm);
            float anatShade = 0.94 + 0.045 * nBind.y + 0.035 * max(0.0, nBind.z);
            vec3 bareFootSkin = uSkinColor * anatShade;
            float shoeLuma = dot(uShoeColor, vec3(0.299, 0.587, 0.114));
            float leatherMicroGrain = sin(bz * 520.0 + fx * 340.0) * cos(by * 480.0 - fx * 280.0) * 0.018;
            float fresnelRim = pow(1.0 - clamp(abs(nBind.z) * 0.65 + max(0.0, nBind.y) * 0.35, 0.0, 1.0), 2.4) * 0.08;
            float weltCreaseAO = 1.0 - fastGauss(by - 0.025, 0.0045) * 0.24;
            float upperAO = (0.84 + 0.14 * nBind.y + 0.08 * max(0.0, nBind.z) + leatherMicroGrain + fresnelRim) * weltCreaseAO;
            vec3 upperCol = uShoeColor * upperAO;
            float specBase = max(0.0, nBind.y * 0.68 + max(0.0, nBind.z) * 0.78);
            float specBase2 = specBase * specBase;
            float specBase4 = specBase2 * specBase2;

            if (sst == 100) {
              diffuseColor.rgb = bareFootSkin;
              vFootRoughness = 0.46;
              vFootMetalness = 0.0;
            } else if (sst == 1) {
              float collarTop = 0.104 - 0.014 * smoothstep(-0.04, 0.04, bz) + 0.012 * smoothstep(0.03, 0.09, bz);
              float shoeMask = 1.0 - smoothstep(collarTop - 0.004, collarTop + 0.004, by);

              float soleMask = 1.0 - smoothstep(0.027, 0.030, by);
              float outsoleTread = 1.0 - smoothstep(0.005, 0.008, by);
              float foxingGroove = fastGauss(by - 0.026, 0.0032) + fastGauss(by - 0.014, 0.0024) * 0.65;
              float soleRib = sin(bz * 380.0) * 0.028 * smoothstep(0.14, 0.21, bz);
              vec3 cupSoleRGB = vec3(0.96, 0.95, 0.92) * (0.94 + 0.06 * nBind.y - foxingGroove * 0.18 + soleRib);
              cupSoleRGB = mix(cupSoleRGB, vec3(0.68, 0.52, 0.36), outsoleTread * 0.72);

              float inThroat = (1.0 - smoothstep(0.020, 0.025, afx)) * smoothstep(0.022, 0.032, bz) * (1.0 - smoothstep(0.105, 0.118, bz)) * smoothstep(0.052, 0.060, by);
              float crossLace = smoothstep(0.22, 0.78, sin(bz * 290.0 + fx * 120.0)) + smoothstep(0.22, 0.78, sin(bz * 290.0 - fx * 120.0));
              float laceMask = clamp(crossLace, 0.0, 1.0) * inThroat * (1.0 - smoothstep(0.016, 0.021, afx));
              float eyeletRow = smoothstep(0.0045, 0.0018, abs(afx - 0.020)) * smoothstep(0.45, 0.85, sin(bz * 290.0)) * inThroat;

              float toeCapSeam = fastGauss(bz - 0.138, 0.0038) * step(0.03, by);
              float quarterSeam = fastGauss(bz - 0.015, 0.0035) * step(0.03, by) * (1.0 - inThroat);
              float sideStripe = smoothstep(0.008, 0.002, abs((by - 0.045) - (bz + 0.02) * 0.28)) * step(0.018, afx) * smoothstep(-0.04, 0.09, bz) * (1.0 - smoothstep(0.09, 0.13, bz));
              float heelTab = smoothstep(0.072, 0.078, by) * (1.0 - smoothstep(-0.065, -0.045, bz));
              float collarRim = smoothstep(0.007, 0.0015, abs(by - collarTop)) * shoeMask;

              vec3 accentCol = shoeLuma > 0.65 ? vec3(0.15, 0.18, 0.24) : vec3(0.95, 0.96, 0.98);
              vec3 sneakerUpper = upperCol * (1.0 - toeCapSeam * 0.22 - quarterSeam * 0.15) + vec3(specBase4 * 0.08);
              sneakerUpper = mix(sneakerUpper, accentCol * upperAO, clamp(sideStripe * 0.78 + heelTab * 0.82 + collarRim * 0.65, 0.0, 1.0));
              sneakerUpper = mix(sneakerUpper, vec3(0.97, 0.97, 0.98) * upperAO, laceMask * 0.96);
              sneakerUpper = mix(sneakerUpper, vec3(0.84, 0.86, 0.90), eyeletRow);

              vec3 fullShoe = mix(sneakerUpper, cupSoleRGB, soleMask);
              float ankleShadow = (1.0 - shoeMask) * smoothstep(collarTop + 0.014, collarTop, by) * 0.20;
              diffuseColor.rgb = mix(bareFootSkin * (1.0 - ankleShadow), fullShoe, shoeMask);
              vFootRoughness = mix(0.46, mix(0.32, 0.68, soleMask), shoeMask);
              vFootMetalness = eyeletRow * 0.80 * shoeMask;
            } else if (sst == 2) {
              float collarTop = 0.114 - 0.012 * smoothstep(-0.03, 0.04, bz);
              float shoeMask = 1.0 - smoothstep(collarTop - 0.004, collarTop + 0.004, by);

              float waveMidsoleTop = 0.038 + 0.005 * sin(bz * 58.0);
              float soleMask = 1.0 - smoothstep(waveMidsoleTop - 0.003, waveMidsoleTop + 0.003, by);
              float carbonOutsole = 1.0 - smoothstep(0.008, 0.011, by);
              float lugCleats = step(0.0, sin(bz * 240.0)) * carbonOutsole;
              float midsolePod = sin(bz * 65.0) * cos(by * 160.0) * 0.08;

              vec3 evaMidsole = vec3(0.93, 0.92, 0.89) * (0.94 + 0.06 * nBind.y + midsolePod);
              evaMidsole = mix(evaMidsole, vec3(0.14, 0.15, 0.17), max(carbonOutsole * 0.85, lugCleats));

              float inThroat = (1.0 - smoothstep(0.022, 0.027, afx)) * smoothstep(0.02, 0.03, bz) * (1.0 - smoothstep(0.11, 0.125, bz)) * smoothstep(0.055, 0.065, by);
              float sportLaces = smoothstep(0.3, 0.8, abs(sin(bz * 270.0))) * inThroat * (1.0 - smoothstep(0.017, 0.022, afx));
              float tpuWave = smoothstep(0.010, 0.002, abs(sin(bz * 42.0 + by * 35.0) * 0.018 - (by - 0.068))) * step(0.018, afx);
              float meshDots = (0.5 + 0.5 * sin(bx * 620.0) * sin(bz * 620.0)) * 0.07;

              vec3 contrastPanel = shoeLuma > 0.5 ? uShoeColor * 0.68 : mix(uShoeColor, vec3(0.92, 0.94, 0.96), 0.45);
              vec3 dadUpper = mix(upperCol * (1.0 - meshDots), contrastPanel * upperAO, clamp(tpuWave, 0.0, 1.0));
              dadUpper = mix(dadUpper, vec3(0.95, 0.96, 0.98) * upperAO, sportLaces);

              vec3 fullShoe = mix(dadUpper, evaMidsole, soleMask);
              diffuseColor.rgb = mix(bareFootSkin, fullShoe, shoeMask);
              vFootRoughness = mix(0.46, mix(0.42, 0.65, soleMask), shoeMask);
            } else if (sst == 3) {
              float isHeelBlock = 1.0 - smoothstep(-0.028, -0.018, bz);
              float soleTopY = mix(0.032, 0.044, isHeelBlock);
              float soleMask = 1.0 - smoothstep(soleTopY - 0.003, soleTopY + 0.003, by);
              float lugTeeth = smoothstep(-0.2, 0.6, sin(bz * 230.0)) * (1.0 - smoothstep(0.014, 0.020, by)) * (1.0 - isHeelBlock * 0.7);
              float weltLine = fastGauss(by - soleTopY, 0.0045);
              float weltStitches = step(0.15, sin(bz * 380.0)) * weltLine;

              vec3 lugSoleRGB = vec3(0.09, 0.09, 0.10) * (0.90 + 0.10 * nBind.y - lugTeeth * 0.25);
              vec3 weltStitchRGB = vec3(0.82, 0.62, 0.28);

              float goreDz = (bz + 0.008) * 18.0;
              float goreCurve = goreDz * goreDz;
              float goreU = smoothstep(0.068 + goreCurve, 0.074 + goreCurve, by) * (1.0 - smoothstep(-0.042, -0.035, -abs(bz + 0.008))) * step(0.024, afx) * step(by, 0.162);
              float goreRibs = sin(bz * 480.0) * 0.06;
              vec3 goreRGB = vec3(0.12, 0.12, 0.14) * (0.92 + goreRibs);

              float brogueSeam = fastGauss(bz - 0.132, 0.0040) * step(soleTopY, by);
              float leatherSpec = specBase4 * 0.14;
              vec3 bootUpper = upperCol * (1.0 - brogueSeam * 0.22) + vec3(leatherSpec);
              bootUpper = mix(bootUpper, goreRGB, clamp(goreU, 0.0, 1.0));

              vec3 fullBoot = mix(bootUpper, lugSoleRGB, soleMask);
              fullBoot = mix(fullBoot, weltStitchRGB, clamp(weltStitches * 0.85, 0.0, 1.0));
              diffuseColor.rgb = fullBoot;
              vFootRoughness = mix(mix(0.22, 0.86, goreU), 0.78, soleMask);
              vFootMetalness = mix(0.08, 0.02, max(goreU, soleMask));
            } else if (sst == 4) {
              float loaferCollar = 0.084 - 0.012 * smoothstep(-0.03, 0.03, bz) + 0.010 * smoothstep(0.03, 0.08, bz);
              float shoeMask = 1.0 - smoothstep(loaferCollar - 0.004, loaferCollar + 0.004, by);

              float isHeel = 1.0 - smoothstep(-0.028, -0.018, bz);
              float soleTopY = mix(0.018, 0.032, isHeel);
              float soleMask = 1.0 - smoothstep(soleTopY - 0.0025, soleTopY + 0.0025, by);
              float woodStack = sin(by * 520.0) * 0.05 * isHeel;
              vec3 dressSoleRGB = vec3(0.22, 0.13, 0.08) * (0.92 + woodStack);

              float apronRadius = 0.032 * (1.0 - smoothstep(0.04, 0.185, bz) * 0.42);
              float apronSeam = fastGauss(afx - apronRadius, 0.0045) * smoothstep(0.035, 0.05, bz) * (1.0 - smoothstep(0.175, 0.19, bz)) * step(0.035, by);

              float inStrap = smoothstep(0.050, 0.055, bz) * (1.0 - smoothstep(0.080, 0.085, bz)) * smoothstep(0.056, 0.062, by) * step(afx, 0.038);
              float horsebitBar = smoothstep(0.0045, 0.0018, abs(bz - 0.066)) * step(afx, 0.024) * step(0.060, by);
              float horsebitRings = smoothstep(0.006, 0.0022, abs(length(vec2(afx - 0.022, bz - 0.066)) - 0.0065)) * step(0.058, by);
              float goldHardware = clamp(horsebitBar + horsebitRings, 0.0, 1.0) * shoeMask;

              float leatherGloss = specBase4 * specBase * 0.16;
              vec3 loaferUpper = upperCol * (1.0 + apronSeam * 0.16 + inStrap * 0.10) + vec3(leatherGloss);
              loaferUpper = mix(loaferUpper, vec3(0.85, 0.68, 0.24), goldHardware);

              vec3 fullLoafer = mix(loaferUpper, dressSoleRGB, soleMask);
              float ankleShadow = (1.0 - shoeMask) * smoothstep(loaferCollar + 0.012, loaferCollar, by) * 0.16;
              diffuseColor.rgb = mix(bareFootSkin * (1.0 - ankleShadow), fullLoafer, shoeMask);
              vFootRoughness = mix(0.46, mix(mix(0.20, 0.16, goldHardware), 0.55, soleMask), shoeMask);
              vFootMetalness = goldHardware * 0.85;
            } else if (sst == 5) {
              float pumpCollar = 0.082 - 0.026 * smoothstep(-0.02, 0.02, bz);
              float openInstep = (1.0 - smoothstep(0.024, 0.030, afx)) * smoothstep(0.002, 0.012, bz) * (1.0 - smoothstep(0.098, 0.108, bz)) * smoothstep(0.046, 0.052, by);
              float mjStrap = smoothstep(0.076, 0.080, by) * (1.0 - smoothstep(0.090, 0.094, by)) * smoothstep(0.015, 0.025, bz) * (1.0 - smoothstep(0.048, 0.056, bz));
              float goldBuckle = smoothstep(0.006, 0.002, length(vec2(fx - 0.028, by - 0.085))) * mjStrap;

              float basePumpMask = 1.0 - smoothstep(pumpCollar - 0.004, pumpCollar + 0.004, by);
              float shoeMask = clamp(max(basePumpMask * (1.0 - openInstep), mjStrap), 0.0, 1.0);

              float isHeel = 1.0 - smoothstep(-0.032, -0.020, bz);
              float soleTopY = mix(0.014, 0.045, isHeel);
              float soleMask = 1.0 - smoothstep(soleTopY - 0.0025, soleTopY + 0.0025, by);
              vec3 lacquerSoleRGB = vec3(0.12, 0.08, 0.09);

              float patentSpec = specBase4 * specBase2 * 0.22;
              vec3 pumpUpper = upperCol + vec3(patentSpec);
              pumpUpper = mix(pumpUpper, vec3(0.86, 0.70, 0.26), goldBuckle);

              vec3 fullPump = mix(pumpUpper, lacquerSoleRGB, soleMask);
              float cutShadow = (1.0 - shoeMask) * smoothstep(0.0, 0.35, basePumpMask) * 0.12;
              diffuseColor.rgb = mix(bareFootSkin * (1.0 - cutShadow), fullPump, shoeMask);
              vFootRoughness = mix(0.46, mix(0.16, 0.35, soleMask), shoeMask);
              vFootMetalness = mix(0.0, mix(0.10, 0.85, goldBuckle), shoeMask);
            } else if (sst == 6) {
              // Style 6: Strappy Stiletto Evening Heels (Open-toe sandal + slender ankle & forefoot straps + metallic heel)
              float heelCup = (1.0 - smoothstep(-0.015, 0.008, bz)) * (1.0 - smoothstep(0.095, 0.105, by));
              float ankleStrap = smoothstep(0.092, 0.097, by) * (1.0 - smoothstep(0.108, 0.113, by));
              float frontStrap = smoothstep(0.105, 0.112, bz) * (1.0 - smoothstep(0.135, 0.142, bz)) * (1.0 - smoothstep(0.056, 0.064, by));
              float crossArchStrap = smoothstep(0.006, 0.0018, abs((by - 0.032) - (0.095 - bz) * 0.52)) * smoothstep(0.0, 0.105, bz) * step(0.018, afx);
              float isHeel = 1.0 - smoothstep(-0.030, -0.018, bz);
              float soleTopY = mix(0.014, 0.048, isHeel);
              float soleMask = 1.0 - smoothstep(soleTopY - 0.0025, soleTopY + 0.0025, by);
              float shoeMask = clamp(max(max(soleMask, heelCup), max(ankleStrap, max(frontStrap, crossArchStrap))), 0.0, 1.0);

              float buckleMetal = smoothstep(0.007, 0.002, length(vec2(afx - 0.026, by - 0.100))) * ankleStrap;
              float satinSpec = specBase4 * 0.28;
              vec3 strapRGB = upperCol + vec3(satinSpec);
              strapRGB = mix(strapRGB, vec3(0.92, 0.78, 0.35), buckleMetal);
              vec3 insoleRGB = mix(vec3(0.16, 0.11, 0.10), uShoeColor * 0.75, 0.5);
              vec3 fullStiletto = mix(strapRGB, insoleRGB, soleMask * (1.0 - frontStrap));
              diffuseColor.rgb = mix(bareFootSkin, fullStiletto, shoeMask);
              vFootRoughness = mix(0.45, 0.18, shoeMask);
              vFootMetalness = mix(0.0, max(0.35, buckleMetal * 0.90), shoeMask);
            } else if (sst == 7) {
              // Style 7: Couture Knee-High / Tall Shaft Boots (Full coverage shaft + side zipper + block heel)
              float isHeel = 1.0 - smoothstep(-0.028, -0.016, bz);
              float soleTopY = mix(0.026, 0.048, isHeel);
              float soleMask = 1.0 - smoothstep(soleTopY - 0.003, soleTopY + 0.003, by);
              vec3 soleRGB = vec3(0.08, 0.07, 0.08) * (0.92 + 0.08 * nBind.y);

              float ankleSeam = fastGauss(by - 0.078, 0.0035);
              float verticalZip = smoothstep(0.0035, 0.0012, abs(bz + 0.005)) * step(0.024, afx) * step(0.045, by);
              float leatherGloss = specBase4 * 0.18;
              vec3 bootUpper = upperCol * (1.0 - ankleSeam * 0.15) + vec3(leatherGloss);
              bootUpper = mix(bootUpper, vec3(0.75, 0.76, 0.80), verticalZip * 0.75);

              diffuseColor.rgb = mix(bootUpper, soleRGB, soleMask);
              vFootRoughness = mix(0.20, 0.65, soleMask);
              vFootMetalness = mix(0.10, 0.85, verticalZip);
            } else if (sst == 8) {
              // Style 8: Platform Double-Strap Mary Jane Heels (Chunky front platform + high block heel + 2 buckle straps)
              float pumpCollar = 0.084 - 0.024 * smoothstep(-0.02, 0.02, bz);
              float openInstep = (1.0 - smoothstep(0.023, 0.030, afx)) * smoothstep(0.00, 0.012, bz) * (1.0 - smoothstep(0.096, 0.106, bz)) * smoothstep(0.048, 0.054, by);
              float strap1 = smoothstep(0.068, 0.072, by) * (1.0 - smoothstep(0.078, 0.082, by)) * smoothstep(0.038, 0.045, bz) * (1.0 - smoothstep(0.068, 0.075, bz));
              float strap2 = smoothstep(0.084, 0.088, by) * (1.0 - smoothstep(0.094, 0.098, by)) * smoothstep(0.010, 0.018, bz) * (1.0 - smoothstep(0.038, 0.045, bz));
              float doubleStraps = clamp(strap1 + strap2, 0.0, 1.0);
              float buckles = (smoothstep(0.005, 0.0018, length(vec2(afx - 0.026, by - 0.073))) * strap1) +
                              (smoothstep(0.005, 0.0018, length(vec2(afx - 0.026, by - 0.089))) * strap2);

              float baseMask = 1.0 - smoothstep(pumpCollar - 0.004, pumpCollar + 0.004, by);
              float shoeMask = clamp(max(baseMask * (1.0 - openInstep), doubleStraps), 0.0, 1.0);

              float isHeel = 1.0 - smoothstep(-0.028, -0.016, bz);
              float soleTopY = mix(0.032, 0.052, isHeel);
              float soleMask = 1.0 - smoothstep(soleTopY - 0.003, soleTopY + 0.003, by);
              float lugGroove = sin(bz * 260.0) * 0.04 * (1.0 - smoothstep(0.015, 0.022, by));
              vec3 platSoleRGB = vec3(0.09, 0.08, 0.10) * (0.94 + lugGroove);

              float patentGloss = specBase4 * specBase2 * 0.26;
              vec3 mjUpper = upperCol + vec3(patentGloss);
              mjUpper = mix(mjUpper, vec3(0.88, 0.89, 0.92), clamp(buckles, 0.0, 1.0));

              vec3 fullPlat = mix(mjUpper, platSoleRGB, soleMask);
              diffuseColor.rgb = mix(bareFootSkin, fullPlat, shoeMask);
              vFootRoughness = mix(0.46, mix(0.14, 0.52, soleMask), shoeMask);
              vFootMetalness = mix(0.0, mix(0.12, 0.88, clamp(buckles, 0.0, 1.0)), shoeMask);
            } else if (sst == 9) {
              // Style 9: Luxury Cap-Toe Oxford Dress Shoes (Burnished calfskin + stitched cap toe + closed V-throat lacing)
              float oxCollar = 0.088 - 0.012 * smoothstep(-0.03, 0.03, bz) + 0.012 * smoothstep(0.03, 0.085, bz);
              float shoeMask = 1.0 - smoothstep(oxCollar - 0.004, oxCollar + 0.004, by);

              float isHeel = 1.0 - smoothstep(-0.028, -0.018, bz);
              float soleTopY = mix(0.018, 0.034, isHeel);
              float soleMask = 1.0 - smoothstep(soleTopY - 0.0025, soleTopY + 0.0025, by);
              float weltStitch = step(0.2, sin(bz * 420.0)) * fastGauss(by - soleTopY, 0.0035);
              vec3 woodSoleRGB = mix(vec3(0.18, 0.11, 0.07), vec3(0.76, 0.58, 0.32), weltStitch * 0.65);

              float capToeSeam = fastGauss(bz - 0.136, 0.0035) * step(soleTopY, by);
              float brogueDots = smoothstep(0.45, 0.85, sin(afx * 650.0)) * capToeSeam;
              float inVThroat = (1.0 - smoothstep(0.016, 0.021, afx)) * smoothstep(0.035, 0.045, bz) * (1.0 - smoothstep(0.098, 0.108, bz)) * smoothstep(0.056, 0.064, by);
              float thinLaces = smoothstep(0.35, 0.85, sin(bz * 360.0)) * inVThroat;

              float toeBurnish = smoothstep(0.12, 0.21, bz) * 0.18;
              float calfSpec = specBase4 * 0.20;
              vec3 oxUpper = upperCol * (1.0 - toeBurnish - capToeSeam * 0.22 - brogueDots * 0.20) + vec3(calfSpec);
              oxUpper = mix(oxUpper, vec3(0.10, 0.09, 0.09), thinLaces * 0.9);

              vec3 fullOxford = mix(oxUpper, woodSoleRGB, soleMask);
              diffuseColor.rgb = mix(bareFootSkin, fullOxford, shoeMask);
              vFootRoughness = mix(0.46, mix(0.18, 0.48, soleMask), shoeMask);
              vFootMetalness = mix(0.0, 0.08, shoeMask);
            } else if (sst == 10) {
              // Style 10: High-Top Basketball Streetwear Sneakers (Tall padded ankle collar + color-blocked overlays + cupsole)
              float highCollar = 0.148 - 0.008 * smoothstep(-0.04, 0.06, bz);
              float shoeMask = 1.0 - smoothstep(highCollar - 0.004, highCollar + 0.004, by);

              float soleMask = 1.0 - smoothstep(0.028, 0.032, by);
              float outsoleBottom = 1.0 - smoothstep(0.007, 0.010, by);
              vec3 cupSoleRGB = mix(vec3(0.96, 0.95, 0.93), uShoeColor, outsoleBottom * 0.85);

              float inThroat = (1.0 - smoothstep(0.020, 0.025, afx)) * smoothstep(0.015, 0.025, bz) * (1.0 - smoothstep(0.112, 0.122, bz)) * smoothstep(0.050, 0.058, by);
              float highLaces = clamp(smoothstep(0.25, 0.75, sin(bz * 280.0 + fx * 110.0)) + smoothstep(0.25, 0.75, sin(bz * 280.0 - fx * 110.0)), 0.0, 1.0) * inThroat;
              float whiteQuarterPanel = smoothstep(0.02, 0.03, bz) * (1.0 - smoothstep(0.10, 0.115, bz)) * smoothstep(0.032, 0.040, by) * (1.0 - smoothstep(0.095, 0.105, by));
              float swooshStripe = smoothstep(0.009, 0.002, abs((by - 0.058) - (bz - 0.01) * 0.34)) * step(0.019, afx) * smoothstep(-0.04, 0.09, bz);
              float paddedAnkle = smoothstep(0.118, 0.126, by) * (1.0 - smoothstep(0.140, 0.146, by));

              vec3 whiteLeather = vec3(0.95, 0.95, 0.96) * upperAO;
              vec3 darkCollar = vec3(0.12, 0.13, 0.15) * upperAO;
              vec3 highUpper = mix(upperCol, whiteLeather, whiteQuarterPanel * (1.0 - swooshStripe));
              highUpper = mix(highUpper, darkCollar, paddedAnkle * 0.85);
              highUpper = mix(highUpper, vec3(0.96, 0.96, 0.97) * upperAO, highLaces);

              vec3 fullHighTop = mix(highUpper, cupSoleRGB, soleMask);
              diffuseColor.rgb = mix(bareFootSkin, fullHighTop, shoeMask);
              vFootRoughness = mix(0.46, mix(0.34, 0.65, soleMask), shoeMask);
              vFootMetalness = 0.04 * shoeMask;
            }
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          roughnessFactor = vFootRoughness;
          `
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `
          #include <metalnessmap_fragment>
          metalnessFactor = vFootMetalness;
          `
        );
  };
  mat.customProgramCacheKey = () => 'footwear_architectural_shader_v4_10styles';
  mat.needsUpdate = true;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function stepVal(edge: number, x: number): number {
  return x >= edge ? 1 : 0;
}

function computeAnatomicalMorphParams(
  body: BodyMeasurements,
  isMale: boolean
): AnatomicalMorphParams {
  const baseChest = isMale ? 96 : 84;
  const baseWaist = isMale ? 76 : 62;
  const baseHip = isMale ? 94 : 90;
  const baseShoulder = isMale ? 45 : 38;
  const baseBicep = isMale ? 32 : 26;
  const baseForearm = isMale ? 26.5 : 21.5;
  const baseThigh = isMale ? 56 : 51;
  const baseCalf = isMale ? 37.5 : 34;
  const baseBmi = isMale ? 22.0 : 18.8;

  const hM = Math.min(3.0, Math.max(1.0, body.heightCm / 100));
  const wKg = Math.min(500, Math.max(20, body.weightKg));
  const bmi = wKg / (hM * hM);

  const derivedLimbs = deriveMeasurementsFromHeightWeight(
    body.heightCm,
    body.weightKg,
    body.genderProfile
  );
  const effBicepCm = body.bicepCm ?? derivedLimbs.bicepCm ?? baseBicep;
  const effForearmCm = body.forearmCm ?? derivedLimbs.forearmCm ?? baseForearm;
  const effThighCm = body.thighCm ?? derivedLimbs.thighCm ?? baseThigh;
  const effCalfCm = body.calfCm ?? derivedLimbs.calfCm ?? baseCalf;
  const armSkeletalScale =
    body.armSkeletalScale ?? derivedLimbs.armSkeletalScale ?? 1.0;
  const legSkeletalScale =
    body.legSkeletalScale ?? derivedLimbs.legSkeletalScale ?? 1.0;

  const chestDelta = Math.max(
    -0.32,
    Math.min(1.15, (body.chestCm - baseChest) / baseChest)
  );
  const waistDelta = Math.max(
    -0.34,
    Math.min(1.45, (body.waistCm - baseWaist) / baseWaist)
  );
  const hipDelta = Math.max(
    -0.30,
    Math.min(1.18, (body.hipCm - baseHip) / baseHip)
  );
  const shoulderDelta = Math.max(
    -0.24,
    Math.min(0.65, (body.shoulderCm - baseShoulder) / baseShoulder)
  );
  const bmiDelta = Math.max(
    -0.38,
    Math.min(1.45, (bmi - baseBmi) / baseBmi)
  );

  // Unified full-body mass factor combining BMI and 3-ring fullness so both Weight slider
  // and 3-Ring sliders harmoniously thicken/slim the entire torso, belly, hips, legs, and arms together.
  const torsoAvgDelta = 0.30 * chestDelta + 0.44 * waistDelta + 0.26 * hipDelta;
  const massDelta = Math.max(
    -0.38,
    Math.min(
      1.45,
      Math.abs(bmiDelta) >= Math.abs(torsoAvgDelta) * 0.4
        ? 0.65 * bmiDelta + 0.35 * torsoAvgDelta
        : 0.38 * bmiDelta + 0.62 * torsoAvgDelta
    )
  );

  const rawBicepDelta = (effBicepCm - baseBicep) / baseBicep;
  const rawForearmDelta = (effForearmCm - baseForearm) / baseForearm;
  const rawThighDelta = (effThighCm - baseThigh) / baseThigh;
  const rawCalfDelta = (effCalfCm - baseCalf) / baseCalf;

  const bicepDelta = Math.max(
    -0.16,
    Math.min(1.10, 0.55 * rawBicepDelta + 0.45 * massDelta)
  );
  const forearmDelta = Math.max(
    -0.14,
    Math.min(1.00, 0.55 * rawForearmDelta + 0.45 * massDelta)
  );
  const thighDelta = Math.max(
    -0.06,
    Math.min(1.40, 0.54 * rawThighDelta + 0.30 * massDelta + 0.16 * hipDelta)
  );
  const calfDelta = Math.max(
    -0.06,
    Math.min(1.25, 0.56 * rawCalfDelta + 0.30 * massDelta + 0.14 * hipDelta)
  );

  const key = `${chestDelta.toFixed(3)}_${waistDelta.toFixed(3)}_${hipDelta.toFixed(3)}_${shoulderDelta.toFixed(3)}_${bmiDelta.toFixed(3)}_${massDelta.toFixed(3)}_${bicepDelta.toFixed(3)}_${thighDelta.toFixed(3)}`;
  return {
    key,
    chestDelta,
    waistDelta,
    hipDelta,
    shoulderDelta,
    bmiDelta,
    massDelta,
    bicepDelta,
    forearmDelta,
    thighDelta,
    calfDelta,
    armSkeletalScale,
    legSkeletalScale,
  };
}

/**
 * Sculpts 3D anatomical regions (Chest/Bust, Waist/Belly, Hips/Glutes, Thighs/Calves, Upper Arms/Forearms, and Clavicle/Shoulders)
 * using exact per-vertex skeleton skinning weights (`wTorso`, `wUpperArm`, `wForeArm`, `wLeg`, `wProtect`)
 * and 3D bone-axis radial expansion so:
 *  - When getting fatter/heavier, BOTH the arms (biceps, triceps, forearms) and the body/legs thicken smoothly in 360 degrees.
 *  - Forearms and hands in the A-pose bind mesh are never misclassified into the hip/thigh zones.
 *  - Inner skin (`Wolf3D_Body`) and outer garments (`Wolf3D_Outfit_Top`, `Wolf3D_Outerwear_Jacket`, `Wolf3D_Outfit_Bottom`)
 *    expand around the exact same 3D bone axes with zero seam separation or armpit folding.
 */
function applyAnatomicalBodyMorphToVertex(
  xIn: number,
  yIn: number,
  zIn: number,
  bx: number,
  by: number,
  bz: number,
  wTorsoIn: number,
  wUpperArmIn: number,
  wForeArmIn: number,
  wLegIn: number,
  landmarks: AnatomicalRigLandmarks,
  isMale: boolean,
  morph: AnatomicalMorphParams
): [number, number, number] {
  let x = xIn;
  let y = yIn;
  let z = zIn;
  const ax = Math.abs(bx);
  const signX = bx >= 0 ? 1 : -1;

  const wTorso = wTorsoIn;
  const wUpperArm = wUpperArmIn;
  const wForeArm = wForeArmIn;
  const wArm = wUpperArm + wForeArm;
  const wLeg = wLegIn;
  const wProtect = Math.max(0, 1.0 - (wTorso + wArm + wLeg));

  // Protect the neck collar (`by > 1.40, ax < 0.088`) so the neck never disconnects from the head
  const neckCollarProtect =
    smoothstep(isMale ? 1.43 : 1.38, isMale ? 1.485 : 1.435, by) *
    (1.0 - smoothstep(0.072, 0.105, ax));
  const neckFade = (1.0 - neckCollarProtect) * (1.0 - wProtect);

  // ============================================================================
  // 1. TORSO ANATOMICAL SCULPTING (`wTorso > 0.001`)
  // ============================================================================
  if (wTorso > 0.001) {
    let tx = x;
    let ty = y;
    let tz = z;

    // Crucial anti-sleeve-balloon mask:
    // Full lateral torso expansion applies to the anatomical trunk core (`ax < 0.14..0.16`),
    // and smoothly drops to 0 on outer sleeve cuffs (`ax > 0.16` or `wArm > 0.2`) so torso widening
    // NEVER pushes out the T-shirt/blouse sleeves!
    const armpitSocketTaper = 1.0 - 0.88 * clamp01(wArm * 2.2);
    const coreTorsoWidthMask =
      (1.0 - smoothstep(isMale ? 0.152 : 0.136, isMale ? 0.205 : 0.185, ax)) *
      armpitSocketTaper;

    // 1.0 CONTINUOUS WHOLE-TRUNK VOLUMETRIC CORE EXPANSION (`by` ~ 0.72..1.42)
    // Ensures the entire ribcage, lats, midsection, flanks, and pelvis expand/slim cohesively
    // in 360 degrees (both width X and depth Z) when weight changes.
    const trunkEnvelope =
      smoothstep(0.71, 0.84, by) *
      (1.0 - smoothstep(isMale ? 1.37 : 1.33, isMale ? 1.45 : 1.40, by)) *
      neckFade;
    const trunkMass =
      0.48 * morph.massDelta +
      0.26 * morph.waistDelta +
      0.14 * morph.chestDelta +
      0.12 * morph.hipDelta;
    if (trunkEnvelope > 0.001) {
      tx *= 1.0 + trunkMass * 0.56 * trunkEnvelope * coreTorsoWidthMask;
      tz *= 1.0 + trunkMass * 0.54 * trunkEnvelope;
    }

    // 1A. VÒNG 1: CHEST / BUST / PECTORALS & UPPER BACK LATS (`by` ~ 1.13..1.44)
    const chestCenterY = isMale ? 1.33 : 1.28;
    const chestSpanY = isMale ? 0.115 : 0.098;
    const chestBellY =
      Math.exp(-Math.pow((by - chestCenterY) / chestSpanY, 2)) * neckFade;

    if (chestBellY > 0.001) {
      const frontMask = smoothstep(-0.02, 0.05, bz);
      const effChest = 0.68 * morph.chestDelta + 0.32 * morph.massDelta;
      if (!isMale) {
        // Female 3D dual-cup breast projection + side ribcage curve + upper back fullness
        const cupProfile =
          Math.exp(-Math.pow((ax - 0.052) / 0.058, 2)) +
          0.45 * Math.exp(-Math.pow(ax / 0.048, 2));
        tz += effChest * 0.105 * chestBellY * frontMask * cupProfile;
        ty += effChest * 0.012 * chestBellY * frontMask * cupProfile;
        tx *= 1.0 + effChest * 0.58 * chestBellY * coreTorsoWidthMask;
        tz *= 1.0 + effChest * 0.42 * chestBellY * (1.0 - frontMask);
      } else {
        // Male 3D pectoral projection + V-taper latissimus dorsi & upper back expansion
        const pecProfile = Math.exp(-Math.pow((ax - 0.062) / 0.082, 2));
        tz += effChest * 0.086 * chestBellY * frontMask * pecProfile;
        tx *= 1.0 + effChest * 0.66 * chestBellY * coreTorsoWidthMask;
        tz *= 1.0 + effChest * 0.46 * chestBellY * (1.0 - frontMask);
      }
    }

    // 1B. VÒNG 2: WAIST, OBLIQUES / FLANKS & 3D ABDOMEN / BELLY (`by` ~ 0.90..1.28)
    const waistCenterY = isMale ? 1.11 : 1.10;
    const waistBellY =
      Math.exp(-Math.pow((by - waistCenterY) / (isMale ? 0.132 : 0.122), 2)) *
      neckFade;
    const effWaist = 0.68 * morph.waistDelta + 0.32 * morph.massDelta;
    if (waistBellY > 0.001) {
      // Lateral S-line waist taper / love-handle & oblique expansion
      tx *= 1.0 + effWaist * 0.86 * waistBellY * coreTorsoWidthMask;
      // Lower back & flank fullness (-Z)
      const backFlankMask = smoothstep(0.03, -0.04, bz);
      tz *= 1.0 + effWaist * 0.52 * waistBellY * backFlankMask;
    }

    // Anterior 3D belly / stomach roundness (`bz > 0`, centered around navel `by ~ 1.065`)
    const bellyCenterY = isMale ? 1.078 : 1.062;
    const bellyBellY =
      Math.exp(-Math.pow((by - bellyCenterY) / (isMale ? 0.135 : 0.128), 2)) *
      neckFade;
    if (bellyBellY > 0.001) {
      const bellyFrontMask =
        smoothstep(-0.02, 0.05, bz) *
        Math.exp(-Math.pow(ax / (isMale ? 0.148 : 0.128), 2));
      tz += effWaist * 0.142 * bellyBellY * bellyFrontMask;
      // Subtle downward lower-belly gravity curve when gaining weight
      if (effWaist > 0) {
        ty -= effWaist * 0.020 * bellyBellY * bellyFrontMask;
      }
    }

    // 1C. VÒNG 3: HIPS, PELVIS & 3D GLUTES (`by` ~ 0.70..1.08)
    const hipCenterY = isMale ? 0.935 : 0.912;
    const hipBellY =
      Math.exp(-Math.pow((by - hipCenterY) / (isMale ? 0.138 : 0.148), 2)) *
      neckFade;
    const effHip = 0.68 * morph.hipDelta + 0.32 * morph.massDelta;
    if (hipBellY > 0.001) {
      // Lateral hip & pelvic flare
      tx *= 1.0 + effHip * 0.84 * hipBellY * coreTorsoWidthMask;
      // Anterior lower-abdomen / pelvic fullness
      const frontHipMask = smoothstep(-0.015, 0.05, bz);
      tz += effHip * 0.054 * hipBellY * frontHipMask;
    }

    // Posterior 3D glutes / buttocks projection (`bz < 0`, centered at `by ~ 0.885`)
    const gluteCenterY = isMale ? 0.905 : 0.882;
    const gluteBellY =
      Math.exp(-Math.pow((by - gluteCenterY) / 0.118, 2)) * neckFade;
    if (gluteBellY > 0.001) {
      const gluteBackMask =
        smoothstep(0.02, -0.045, bz) *
        Math.exp(-Math.pow((ax - 0.056) / 0.088, 2));
      tz -= effHip * 0.124 * gluteBellY * gluteBackMask;
    }

    // 1D. CLAVICLE / SHOULDER GIRDLE BELT (`by > 1.26`)
    if (by > 1.26) {
      const shBelt =
        smoothstep(1.26, 1.38, by) *
        smoothstep(0.05, 0.11, ax) *
        neckFade *
        coreTorsoWidthMask;
      tx *= 1.0 + morph.shoulderDelta * 0.28 * shBelt;
    }

    x += (tx - x) * wTorso;
    y += (ty - y) * wTorso;
    z += (tz - z) * wTorso;
  }

  // ============================================================================
  // 2. ARM RADIAL MORPHING AROUND 3D HUMERUS & FOREARM BONE AXES (`wArm > 0.001`)
  //    Clamps radial distance to the anatomical arm core radius (`maxAnatArmRadius`)
  //    so loose garment sleeve cuffs move by the exact same millimeter thickness as the
  //    underlying arm without ever puffing/ballooning out!
  // ============================================================================
  if (wArm > 0.001 && wProtect < 0.999) {
    const sx = signX * landmarks.shoulderPos[0];
    const sy = landmarks.shoulderPos[1];
    const sz = landmarks.shoulderPos[2];

    const ex = signX * landmarks.elbowPos[0];
    const ey = landmarks.elbowPos[1];
    const ez = landmarks.elbowPos[2];

    const wx = signX * landmarks.wristPos[0];
    const wy = landmarks.wristPos[1];
    const wz = landmarks.wristPos[2];

    // Segment 1: Shoulder -> Elbow (Upper Arm: Deltoid, Bicep, Tricep)
    const u1x = ex - sx;
    const u1y = ey - sy;
    const u1z = ez - sz;
    const len1Sq = Math.max(1e-5, u1x * u1x + u1y * u1y + u1z * u1z);
    const t1 = clamp01(
      ((bx - sx) * u1x + (by - sy) * u1y + (bz - sz) * u1z) / len1Sq
    );
    const c1x = sx + t1 * u1x;
    const c1y = sy + t1 * u1y;
    const c1z = sz + t1 * u1z;
    const d1x = bx - c1x;
    const d1y = by - c1y;
    const d1z = bz - c1z;
    const proj1 = (d1x * u1x + d1y * u1y + d1z * u1z) / len1Sq;
    let r1x = d1x - proj1 * u1x;
    let r1y = d1y - proj1 * u1y;
    let r1z = d1z - proj1 * u1z;

    // Clamp radial distance on loose sleeve cuffs so sleeves follow arm thickness without ballooning
    const r1Len = Math.hypot(r1x, r1y, r1z);
    const maxAnatUpperArmR = isMale ? 0.043 : 0.037;
    if (r1Len > maxAnatUpperArmR) {
      const cuffClamp1 = maxAnatUpperArmR / r1Len;
      r1x *= cuffClamp1;
      r1y *= cuffClamp1;
      r1z *= cuffClamp1;
    }

    // Segment 2: Elbow -> Wrist (Forearm)
    const u2x = wx - ex;
    const u2y = wy - ey;
    const u2z = wz - ez;
    const len2Sq = Math.max(1e-5, u2x * u2x + u2y * u2y + u2z * u2z);
    const t2 = clamp01(
      ((bx - ex) * u2x + (by - ey) * u2y + (bz - ez) * u2z) / len2Sq
    );
    const c2x = ex + t2 * u2x;
    const c2y = ey + t2 * u2y;
    const c2z = ez + t2 * u2z;
    const d2x = bx - c2x;
    const d2y = by - c2y;
    const d2z = bz - c2z;
    const proj2 = (d2x * u2x + d2y * u2y + d2z * u2z) / len2Sq;
    let r2x = d2x - proj2 * u2x;
    let r2y = d2y - proj2 * u2y;
    let r2z = d2z - proj2 * u2z;

    const r2Len = Math.hypot(r2x, r2y, r2z);
    const maxAnatForeArmR = isMale ? 0.036 : 0.031;
    if (r2Len > maxAnatForeArmR) {
      const cuffClamp2 = maxAnatForeArmR / r2Len;
      r2x *= cuffClamp2;
      r2y *= cuffClamp2;
      r2z *= cuffClamp2;
    }

    const foreFrac = wForeArm / wArm;
    const rx = (1.0 - foreFrac) * r1x + foreFrac * r2x;
    const ry = (1.0 - foreFrac) * r1y + foreFrac * r2y;
    const rz = (1.0 - foreFrac) * r1z + foreFrac * r2z;

    // Upper arm fullness: smooth, realistic deltoid & bicep/tricep contour without sleeve puffing
    const deltoidCap = 1.0 - smoothstep(0.0, 0.38, t1);
    const bicepBelly = 1.0 + 0.16 * Math.sin(t1 * Math.PI);
    const skeletalArmBoost = (morph.armSkeletalScale - 1.0) * 0.32;
    const upperScale =
      (morph.bicepDelta * 0.56 + skeletalArmBoost) * bicepBelly +
      morph.shoulderDelta * 0.18 * deltoidCap;

    // Forearm fullness: brachioradialis contour tapering smoothly to the wrist
    const brachioBelly = 1.0 + 0.16 * Math.sin(Math.min(1.0, t2 * 1.35) * Math.PI);
    const wristTaper =
      (1.0 - smoothstep(0.68, 0.96, t2)) * (1.0 - wProtect);
    const foreScale =
      (morph.forearmDelta * 0.54 + skeletalArmBoost * 0.65) *
      brachioBelly *
      wristTaper;

    const totalArmRadialScale =
      (wUpperArm * upperScale + wForeArm * foreScale) * (1.0 - wProtect);

    x += rx * totalArmRadialScale;
    y += ry * totalArmRadialScale;
    z += rz * totalArmRadialScale;
  }

  // ============================================================================
  // 3. LEG RADIAL MORPHING AROUND 3D FEMUR & TIBIA BONE AXES (`wLeg > 0.001`)
  //    Strong, realistic 360-degree expansion of thighs (quadriceps, hamstrings, outer sweep)
  //    and calves (gastrocnemius) so lower-body mass transforms dramatically with weight!
  // ============================================================================
  if (wLeg > 0.001 && wProtect < 0.999) {
    const hx = signX * landmarks.hipPos[0];
    const hy = landmarks.hipPos[1];
    const hz = landmarks.hipPos[2];

    const kx = signX * landmarks.kneePos[0];
    const ky = landmarks.kneePos[1];
    const kz = landmarks.kneePos[2];

    const akx = signX * landmarks.anklePos[0];
    const aky = landmarks.anklePos[1];
    const akz = landmarks.anklePos[2];

    // Segment 1: Hip -> Knee (Femur / Thigh)
    const f1x = kx - hx;
    const f1y = ky - hy;
    const f1z = kz - hz;
    const fLen1Sq = Math.max(1e-5, f1x * f1x + f1y * f1y + f1z * f1z);
    const tThigh = clamp01(
      ((bx - hx) * f1x + (by - hy) * f1y + (bz - hz) * f1z) / fLen1Sq
    );
    const thighAxisX = hx + tThigh * f1x;
    const thighAxisZ = hz + tThigh * f1z;

    // Segment 2: Knee -> Ankle (Tibia / Calf)
    const f2x = akx - kx;
    const f2y = aky - ky;
    const f2z = akz - kz;
    const fLen2Sq = Math.max(1e-5, f2x * f2x + f2y * f2y + f2z * f2z);
    const tCalf = clamp01(
      ((bx - kx) * f2x + (by - ky) * f2y + (bz - kz) * f2z) / fLen2Sq
    );
    const calfAxisX = kx + tCalf * f2x;
    const calfAxisZ = kz + tCalf * f2z;

    const isThigh = smoothstep(ky - 0.045, ky + 0.075, by);
    const legAxisX = isThigh * thighAxisX + (1.0 - isThigh) * calfAxisX;
    const legAxisZ = isThigh * thighAxisZ + (1.0 - isThigh) * calfAxisZ;

    const ankleFade =
      smoothstep(aky + 0.04, aky + 0.135, by) * (1.0 - wProtect);
    // Gate leg radial expansion strictly below the pelvic/crotch merge zone (by < 0.76, ax > 0.04)
    // so vertices near the body centerline (x = 0) NEVER cross over each other or invert inside-out!
    const separateLegMask =
      (1.0 - smoothstep(0.71, 0.77, by)) * smoothstep(0.032, 0.068, ax);
    const skeletalLegBoost = (morph.legSkeletalScale - 1.0) * 0.55;

    // Anatomical thigh belly (upper/mid quadriceps & hamstring fullness), knee continuity & calf gastrocnemius belly.
    const healthyLegBase = isMale ? 0.09 : 0.12;
    const thighCurve = 1.0 + 0.32 * Math.sin(tThigh * Math.PI);
    const calfCurve = 1.0 + 0.34 * Math.sin(Math.pow(tCalf, 0.76) * Math.PI);
    const kneeContinuity =
      0.10 * Math.exp(-Math.pow((by - ky) / 0.085, 2));

    const effThighScale =
      (healthyLegBase + morph.thighDelta * 1.12 + skeletalLegBoost) *
        thighCurve +
      kneeContinuity;
    const effCalfScale =
      (healthyLegBase * 0.90 +
        morph.calfDelta * 1.02 +
        skeletalLegBoost * 0.82) *
        calfCurve +
      kneeContinuity;
    const legScale =
      (isThigh * effThighScale + (1.0 - isThigh) * effCalfScale) *
      ankleFade *
      separateLegMask *
      wLeg;

    const dxLeg = bx - legAxisX;
    const dzLeg = bz - legAxisZ;
    // Keep inner thigh movement gentle so left and right inner thighs never collide across x = 0
    const isInnerThigh =
      signX * dxLeg < 0 ? 0.45 * smoothstep(0.04, 0.085, ax) : 1.18;

    const nextLegX = x + dxLeg * legScale * isInnerThigh;
    x =
      signX >= 0
        ? Math.max(bx * 0.68, nextLegX)
        : Math.min(bx * 0.68, nextLegX);
    z += dzLeg * legScale * 1.18;
  }

  return [x, y, z];
}

function updateBodySkinMeshSilhouette(
  sys: SkinnedGarmentSystem,
  isMale: boolean,
  morph: AnatomicalMorphParams,
  isSlimFit = false
) {
  if (!sys.bodySkinMesh || !sys.baseBodyPos || !sys.baseBodyNorm) return;
  const cacheKey = `${isMale ? 'M' : 'F'}_${morph.key}_${isSlimFit ? 'slim' : 'reg'}_recessed_v4`;
  if (sys.appliedBodyMorphKey === cacheKey) return;
  sys.appliedBodyMorphKey = cacheKey;

  const posAttr = sys.bodySkinMesh.geometry.attributes
    .position as THREE.BufferAttribute;
  const basePos = sys.baseBodyPos;
  const anatW = sys.baseBodyAnatWeights;
  const count = posAttr.count;

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const wIdx = i * 4;
    const bx = basePos[idx];
    const by = basePos[idx + 1];
    const bz = basePos[idx + 2];

    const wTorso = anatW ? anatW[wIdx] : 1;
    const wUpperArm = anatW ? anatW[wIdx + 1] : 0;
    const wForeArm = anatW ? anatW[wIdx + 2] : 0;
    const wLeg = anatW ? anatW[wIdx + 3] : 0;

    // Wolf3D_Body in ReadyPlayerMe GLBs only contains bare arms (ax > 0.15) and ankles/feet (by < 0.226).
    // Keep its base coordinates un-pinched so bare upper arms and ankles connect 100% flush with Wolf3D_Outfit_Top & Bottom!
    const [mx, my, mz] = applyAnatomicalBodyMorphToVertex(
      bx,
      by,
      bz,
      bx,
      by,
      bz,
      wTorso,
      wUpperArm,
      wForeArm,
      wLeg,
      sys.landmarks,
      isMale,
      morph
    );
    posAttr.setXYZ(i, mx, my, mz);
  }

  sys.bodySkinMesh.geometry.computeVertexNormals();
  posAttr.needsUpdate = true;
}

/**
 * Sculpts the 3D vertices of `topMesh` for each `TopStyleId` + `AnatomicalMorphParams`.
 * Uses smooth, continuous normal offsets (zero jagged step discontinuities) and tucks the lower waist
 * cleanly inside skirts/dresses so the belly never pokes through!
 */
function updateTopMeshSilhouette(
  sys: SkinnedGarmentSystem,
  style: TopStyleId,
  fabric: FabricType,
  isMale: boolean,
  morph: AnatomicalMorphParams,
  hasPhotoTex = false,
  photoCutout: [number, number, number, number] = [0.35, 0.25, 0.05, 0.96],
  isDress = false,
  isWearingSkirt = false,
  fitEase: 'slim' | 'regular' | 'oversized' = 'regular'
) {
  sys.topShaderUniforms.uTopStyle.value = TOP_STYLE_SHADER_CODE[style] ?? 1;
  sys.topShaderUniforms.uIsMale.value = isMale ? 1.0 : 0.0;
  sys.topShaderUniforms.uIsDress.value = isDress ? 1.0 : 0.0;
  sys.topShaderUniforms.uFabricCode.value = FABRIC_SHADER_CODE[fabric] ?? 1;
  sys.blouseBowGroup.visible =
    !isMale && style === 'silk_blouse_bow' && !hasPhotoTex;

  if (!sys.topMesh || !sys.baseTopPos || !sys.baseTopNorm) return;
  const cacheKey = `${style}_${isMale ? 'M' : 'F'}_${isDress ? 'D' : 'T'}_${isWearingSkirt ? 'S' : 'P'}_${fitEase}_${morph.key}_${hasPhotoTex ? 'P' : '0'}_${photoCutout.map((v) => v.toFixed(2)).join('_')}`;
  if (sys.appliedTopStyle === cacheKey) return;
  sys.appliedTopStyle = cacheKey;

  const posAttr = sys.topMesh.geometry.attributes
    .position as THREE.BufferAttribute;
  const basePos = sys.baseTopPos;
  const baseNorm = sys.baseTopNorm;
  const anatW = sys.baseTopAnatWeights;
  const count = posAttr.count;

  const sleeveSpan = photoCutout[1];
  const hemCrop = photoCutout[2];

  const isSleevelessFemale =
    !isMale &&
    (style === 'silk_camisole' ||
      style === 'corset_top' ||
      style === 'halter_crop' ||
      style === 'none' ||
      (hasPhotoTex && sleeveSpan < 0.36));
  const isSleevelessMale =
    isMale &&
    (style === 'fitted_tank' ||
      style === 'none' ||
      (hasPhotoTex && sleeveSpan < 0.36));

  const isOpenCollarFemale =
    !isMale &&
    (style === 'silk_camisole' ||
      style === 'corset_top' ||
      style === 'halter_crop' ||
      style === 'off_shoulder_knit' ||
      style === 'puff_blouse' ||
      style === 'crop_cardigan' ||
      hasPhotoTex);

  const isCroppedTop =
    style === 'none' ||
    style === 'baby_tee' ||
    style === 'halter_crop' ||
    style === 'crop_cardigan' ||
    style === 'corset_top' ||
    (hasPhotoTex && hemCrop > 0.22);

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const wIdx = i * 4;
    const bx = basePos[idx];
    const by = basePos[idx + 1];
    const bz = basePos[idx + 2];
    const nx = baseNorm[idx];
    const ny = baseNorm[idx + 1];
    const nz = baseNorm[idx + 2];
    const ax = Math.abs(bx);
    const wTorso = anatW ? anatW[wIdx] : 1;
    const wUpperArm = anatW ? anatW[wIdx + 1] : 0;
    const wForeArm = anatW ? anatW[wIdx + 2] : 0;
    const notArm = 1.0 - clamp01((wUpperArm + wForeArm) * 2.0);

    let x = bx;
    let y = by;
    let z = bz;
    let effNx = nx;
    let effNy = ny;
    let effNz = nz;
    let nOffset = 0;

    // Helper: Sculpt baggy T-shirt geometry of Wolf3D_Outfit_Top directly onto a realistic anatomical bare torso & bare shoulders/arms
    // so when style === 'none' (or on bare skin regions of sleeveless/cropped/open-neck tops), the mannequin reveals
    // a clearly defined human body (clavicles, sternum cleavage, 3D breasts/pectorals, under-bust fold, cinched waist, navel, and sleek bare arms)
    // instead of looking like it is wearing a skin-colored T-shirt!
    const sculptAnatomicalBareTorsoAndArms = (
      bareTorsoBlend: number,
      bareArmBlend: number,
      bareCollarBlend: number
    ) => {
      // 1. Bare Shoulder & Upper Arm Sculpting:
      // Smoothly retract the loose short-sleeve cuff of Wolf3D_Outfit_Top along its own surface normal
      // (strictly gated to actual upper-arm sleeve vertices: by > 1.22, ax > 0.142/0.162, wUpperArm > 0.15)
      // so torso/waist vertices are NEVER pulled toward the arm and the sleeve seamlessly hugs Wolf3D_Body!
      if (bareArmBlend > 0.001 && by > 1.21 && wUpperArm > 0.12) {
        const sleeveMask =
          smoothstep(1.21, 1.255, by) *
          smoothstep(0.12, 0.35, wUpperArm) *
          smoothstep(isMale ? 0.160 : 0.140, isMale ? 0.195 : 0.172, ax) *
          bareArmBlend;
        if (sleeveMask > 0.001) {
          nOffset -= sleeveMask * (isMale ? 0.0038 : 0.0032);
          // Lift the hanging under-arm lip of the short-sleeve T-shirt cuff so it hugs the bicep/axilla
          const underSleeveHang = Math.max(0, -ny) * sleeveMask;
          y += underSleeveHang * (isMale ? 0.0062 : 0.0052);
          nOffset -= underSleeveHang * 0.0015;
        }
      }

      // 2. Bare Neck & Clavicle Sculpting: Flatten raised T-shirt crew-neck collar ring onto collarbone & neck base
      if (bareCollarBlend > 0.001 && by > 1.35) {
        const collarZone =
          smoothstep(1.355, 1.465, by) *
          (1.0 - smoothstep(0.085, 0.125, ax)) *
          bareCollarBlend;
        nOffset -= collarZone * 0.0032;
        // Suprasternal notch (hõm cổ) indentation
        const notchMask =
          Math.exp(-Math.pow(bx / 0.022, 2)) *
          Math.exp(-Math.pow((by - (isMale ? 1.475 : 1.38)) / 0.024, 2)) *
          smoothstep(0.0, 0.04, bz) *
          bareCollarBlend;
        z -= notchMask * 0.0052;
      }

      // 3. Bare Torso Sculpting: Sternum cleavage, 3D dual breast cups / pectorals, under-bust fold, cinched waist & navel
      if (bareTorsoBlend > 0.001 && notArm > 0.05) {
        const tb = bareTorsoBlend * notArm;
        const isFront = smoothstep(-0.01, 0.035, bz);
        const isBack = smoothstep(0.01, -0.035, bz);

        // Central sternum valley (pulls flat T-shirt tent inward between breasts/pectorals)
        const chestY = isMale ? 1.335 : 1.288;
        const sternumValley =
          Math.exp(-Math.pow(bx / 0.024, 2)) *
          Math.exp(-Math.pow((by - chestY) / 0.068, 2)) *
          isFront;
        z -= tb * sternumValley * (isMale ? 0.0075 : 0.0135);

        if (!isMale) {
          // Female 3D dual anatomical breast cups + inframammary under-bust crease
          const cupDist = Math.hypot((ax - 0.055) / 0.048, (by - 1.286) / 0.052);
          const cupDome = Math.max(0, 1.0 - cupDist * cupDist) * isFront;
          z += tb * cupDome * 0.0085;
          y += tb * cupDome * 0.0020;

          const underBustY = 1.224 + 0.012 * Math.pow(clamp01((ax - 0.02) / 0.085), 2);
          const underBustFold =
            Math.exp(-Math.pow((by - underBustY) / 0.022, 2)) *
            smoothstep(0.015, 0.035, ax) *
            (1.0 - smoothstep(0.095, 0.125, ax)) *
            isFront;
          z -= tb * underBustFold * 0.0115;
        } else {
          // Male athletic pectoral plate + lower pec border
          const pecPlate =
            Math.exp(-Math.pow((ax - 0.062) / 0.054, 2)) *
            Math.exp(-Math.pow((by - 1.34) / 0.055, 2)) *
            isFront;
          z += tb * pecPlate * 0.0055;
          const lowerPecFold =
            Math.exp(-Math.pow((by - 1.255) / 0.022, 2)) *
            smoothstep(0.02, 0.04, ax) *
            (1.0 - smoothstep(0.11, 0.14, ax)) *
            isFront;
          z -= tb * lowerPecFold * 0.0075;
        }

        // Cinched anatomical ribcage & waist (fades cleanly to 0 at by <= 1.065 so the waist seam
        // meets Wolf3D_Outfit_Bottom at by = 1.04..1.06 with zero shelf or step!)
        const waistCinchEnv =
          smoothstep(1.062, 1.115, by) *
          (1.0 - smoothstep(1.21, 1.28, by));
        const peakWaist =
          Math.exp(-Math.pow((by - (isMale ? 1.13 : 1.12)) / 0.068, 2)) *
          smoothstep(1.055, 1.095, by);
        const cinchFactor = 0.55 * waistCinchEnv + 0.45 * peakWaist;
        x *= 1.0 - tb * cinchFactor * (isMale ? 0.048 : 0.072);
        z *= 1.0 - tb * cinchFactor * (isMale ? 0.055 : 0.082);

        // Smoothly tuck the bottom T-shirt hem lip (by = 1.00..1.065) so it sits flush with Wolf3D_Outfit_Bottom's bare waist
        const lowerHemFlush = smoothstep(1.068, 1.015, by);
        if (isMale) {
          x *= 1.0 - tb * lowerHemFlush * 0.052;
          z *= 1.0 - tb * lowerHemFlush * 0.068;
        } else {
          z -= tb * lowerHemFlush * smoothstep(0.01, 0.11, bz) * 0.0085;
        }

        // Abdominal linea alba & navel depression
        const lineaAlba =
          Math.exp(-Math.pow(bx / 0.012, 2)) *
          smoothstep(1.06, 1.09, by) *
          (1.0 - smoothstep(1.19, 1.23, by)) *
          isFront;
        const navelIndent =
          Math.exp(-Math.pow(bx / 0.011, 2)) *
          Math.exp(-Math.pow((by - 1.098) / 0.014, 2)) *
          isFront;
        z -= tb * (lineaAlba * 0.0036 + navelIndent * 0.0068);

        // Posterior spine groove
        const spineHollow =
          Math.exp(-Math.pow(bx / 0.022, 2)) *
          smoothstep(1.07, 1.13, by) *
          (1.0 - smoothstep(1.36, 1.42, by)) *
          isBack;
        z += tb * spineHollow * 0.0075;
      }
    };

    if (style === 'none') {
      sculptAnatomicalBareTorsoAndArms(1.0, 1.0, 1.0);
      nOffset -= 0.0014;
      if (!isMale && (isDress || isWearingSkirt)) {
        const skirtWaistTuck = smoothstep(1.095, 1.015, by);
        x *= 1.0 - skirtWaistTuck * 0.12;
        z *= 1.0 - skirtWaistTuck * 0.15;
        z -= skirtWaistTuck * 0.010;
        nOffset -= skirtWaistTuck * 0.0035;
      }
    } else if (!isMale) {
      if (isOpenCollarFemale) {
        const keepStrap =
          style === 'silk_camisole' && !hasPhotoTex
            ? 1.0 - smoothstep(0.004, 0.014, Math.abs(ax - 0.072))
            : 0.0;
        sculptAnatomicalBareTorsoAndArms(0.0, 0.0, 1.0 - keepStrap);
      }

      if (isSleevelessFemale) {
        sculptAnatomicalBareTorsoAndArms(0.0, 1.0, 0.0);
      }

      if (hasPhotoTex) {
        const cropHemY = 1.035 + hemCrop * 0.235;
        const bareCropWaist =
          hemCrop > 0.22
            ? smoothstep(cropHemY + 0.025, cropHemY - 0.025, by)
            : 0.0;
        if (bareCropWaist > 0.001) {
          sculptAnatomicalBareTorsoAndArms(bareCropWaist, 0.0, 0.0);
        }
        nOffset += (1.0 - bareCropWaist) * 0.0016;
      } else if (style === 'baby_tee') {
        const bareWaist = smoothstep(1.19, 1.14, by);
        const bareLowerArm = smoothstep(0.172, 0.195, ax);
        sculptAnatomicalBareTorsoAndArms(bareWaist, bareLowerArm, 0.0);
        nOffset += (1.0 - bareWaist) * 0.0014;
      } else if (style === 'off_shoulder_knit') {
        const bareShoulder = smoothstep(1.335, 1.37, by);
        sculptAnatomicalBareTorsoAndArms(bareShoulder, bareShoulder, 1.0);
        const bardotBand =
          smoothstep(1.28, 1.315, by) * (1.0 - bareShoulder);
        nOffset += bardotBand * 0.0038;
      } else if (style === 'corset_top') {
        const bareUpper = smoothstep(1.315, 1.355, by);
        const bareLowerWaist = isDress ? 0.0 : smoothstep(1.09, 1.05, by);
        sculptAnatomicalBareTorsoAndArms(
          Math.max(bareUpper, bareLowerWaist),
          1.0,
          1.0
        );
        const waistCinch =
          Math.sin(smoothstep(1.07, 1.23, by) * Math.PI) * (1.0 - bareUpper);
        const bustLift =
          smoothstep(1.23, 1.29, by) *
          (1.0 - smoothstep(1.32, 1.35, by)) *
          smoothstep(0.02, 0.09, bz) *
          smoothstep(0.12, 0.03, ax);
        x *= 1.0 - waistCinch * 0.045;
        z *= 1.0 - waistCinch * 0.038;
        z += bustLift * 0.0045;
        y += bustLift * 0.0025;
        nOffset += (1.0 - bareUpper) * 0.0016;
      } else if (style === 'silk_camisole') {
        const frontNeck = 1.276 + 0.074 * Math.pow(clamp01(ax / 0.072), 1.45);
        const backNeck = 1.268 + 0.014 * smoothstep(0.035, 0.11, ax);
        const armCut =
          1.242 + 0.108 * Math.pow(clamp01((0.128 - ax) / 0.056), 1.45);
        const bodyTopY =
          ax <= 0.072 ? (bz >= 0.0 ? frontNeck : backNeck) : armCut;
        const onBodice = 1.0 - smoothstep(bodyTopY - 0.02, bodyTopY + 0.02, by);
        const onStrap =
          (1.0 - smoothstep(0.005, 0.012, Math.abs(ax - 0.072))) *
          smoothstep(1.258, 1.28, by) *
          (1.0 - smoothstep(1.48, 1.495, by));
        const clothWeight = Math.max(onBodice, onStrap);
        sculptAnatomicalBareTorsoAndArms(1.0 - clothWeight, 1.0, 1.0 - onStrap);
        nOffset += clothWeight * 0.0016;
      } else if (style === 'puff_blouse') {
        const sleeveT = clamp01((ax - 0.132) / 0.092);
        const onSleeve = smoothstep(1.25, 1.31, by) * stepVal(0.132, ax);
        const puffBell = Math.sin(sleeveT * Math.PI) * onSleeve;
        nOffset += 0.0015 + puffBell * 0.014;
        y += puffBell * 0.008;
      } else if (style === 'halter_crop') {
        const bareWaist = isDress ? 0.0 : smoothstep(1.185, 1.14, by);
        sculptAnatomicalBareTorsoAndArms(bareWaist, 1.0, 0.6);
        const bustLift =
          smoothstep(1.23, 1.31, by) *
          (1.0 - smoothstep(1.36, 1.4, by)) *
          smoothstep(0.02, 0.09, bz);
        z += bustLift * 0.0032;
        nOffset += (1.0 - bareWaist) * 0.0014;
      } else if (style === 'silk_blouse_bow') {
        const sleeveDrape =
          smoothstep(0.14, 0.22, ax) * smoothstep(1.25, 1.38, by);
        nOffset += 0.002 + sleeveDrape * 0.0045;
      } else if (style === 'crop_cardigan') {
        const bareWaist = isDress ? 0.0 : smoothstep(1.135, 1.095, by);
        sculptAnatomicalBareTorsoAndArms(bareWaist, 0.0, 0.6);
        nOffset += (1.0 - bareWaist) * 0.0022;
      } else if (style === 'peplum_waist_top') {
        const cinch = Math.exp(-Math.pow((by - 1.145) / 0.045, 2));
        x *= 1.0 - cinch * 0.04;
        z *= 1.0 - cinch * 0.032;
        nOffset += 0.0018;
      } else {
        nOffset += 0.0016;
      }

      if (isDress || isWearingSkirt) {
        // Tuck ONLY the lowest abdominal rim (by < 1.095) smoothly inside the 3D Dress/Skirt shell (whose top is at by = 1.135)
        // so the waist at by = 1.10..1.14 stays flush and seamless with zero waist step or inward dent!
        const skirtWaistTuck = smoothstep(1.095, 1.015, by);
        x *= 1.0 - skirtWaistTuck * 0.12;
        z *= 1.0 - skirtWaistTuck * 0.15;
        z -= skirtWaistTuck * 0.010;
        nOffset -= skirtWaistTuck * 0.0035;
      } else if (isCroppedTop) {
        // For crop tops worn with pants/shorts: tuck the very bottom rim (by < 1.045) behind the trouser waistband
        const waistbandUnderTuck = smoothstep(1.05, 1.01, by);
        nOffset -= waistbandUnderTuck * 0.0038;
      } else {
        // For full-length tops worn with pants/shorts: give smooth +2.2mm outward clearance over the trouser waistband
        const hemOverlap = smoothstep(1.08, 1.015, by);
        nOffset += hemOverlap * (fitEase === 'slim' ? 0.0014 : 0.0024);
      }
    } else {
      if (hasPhotoTex) {
        const maleCollarFlatten =
          smoothstep(1.41, 1.51, by) * (1.0 - smoothstep(0.072, 0.098, ax));
        nOffset -= maleCollarFlatten * 0.0032;
      }
      if (isSleevelessMale) {
        sculptAnatomicalBareTorsoAndArms(0.15, 1.0, 0.7);
      } else if (style === 'hoodie_street') {
        nOffset += 0.0045;
      } else {
        nOffset += 0.0022;
      }
      const maleHemOverlap = smoothstep(1.08, 1.015, by);
      nOffset += maleHemOverlap * (fitEase === 'slim' ? 0.0014 : 0.0024);
    }

    // Automatic Mesh Parameter Calibration for FitEase ('slim' | 'regular' | 'oversized'):
    // When 'slim' is active, we smoothly tighten the waist/abdomen contour and flatten excess anterior belly convexity
    // so the garment hugs the body cleanly with zero belly bulge ("lòi mỡ") or waist ridge ("gồ ghề").
    if (style !== 'none') {
      if (fitEase === 'slim') {
        const slimWaistCenterY = isMale ? 1.135 : 1.115;
        const slimWaistEnv =
          Math.exp(-Math.pow((by - slimWaistCenterY) / 0.088, 2)) * notArm;
        const slimBellyFront =
          smoothstep(0.98, 1.04, by) *
          (1.0 - smoothstep(1.21, 1.27, by)) *
          smoothstep(-0.008, 0.055, bz) *
          notArm;
        x *= 1.0 - slimWaistEnv * (isMale ? 0.058 : 0.076);
        z *= 1.0 - slimWaistEnv * (isMale ? 0.068 : 0.088);
        if (bz > 0) {
          z -= slimBellyFront * (bz * 0.165 + 0.0038);
        }
        nOffset -= 0.0008 * notArm;
      } else if (fitEase === 'oversized') {
        const drapeEnv =
          smoothstep(1.01, 1.09, by) *
          (1.0 - smoothstep(1.34, 1.42, by)) *
          notArm;
        x *= 1.0 + drapeEnv * 0.046;
        z *= 1.0 + drapeEnv * 0.052;
        nOffset += 0.0028;
      }
    }

    const sx = x + effNx * nOffset;
    const sy = y + effNy * nOffset;
    const sz = z + effNz * nOffset;
    const [mx, my, mz] = applyAnatomicalBodyMorphToVertex(
      sx,
      sy,
      sz,
      bx,
      by,
      bz,
      wTorso,
      wUpperArm,
      wForeArm,
      anatW ? anatW[wIdx + 3] : 0,
      sys.landmarks,
      isMale,
      morph
    );
    posAttr.setXYZ(i, mx, my, mz);
  }

  sys.topMesh.geometry.computeVertexNormals();
  posAttr.needsUpdate = true;
}

function updateOuterwearMeshSilhouette(
  sys: SkinnedGarmentSystem,
  style: OuterwearStyleId,
  fabric: FabricType,
  isMale: boolean,
  morph: AnatomicalMorphParams,
  fitEase: 'slim' | 'regular' | 'oversized' = 'regular'
) {
  sys.outerShaderUniforms.uOuterStyle.value =
    OUTER_STYLE_SHADER_CODE[style] ?? 0;
  sys.outerShaderUniforms.uIsMale.value = isMale ? 1.0 : 0.0;
  sys.outerShaderUniforms.uFabricCode.value = FABRIC_SHADER_CODE[fabric] ?? 1;

  if (!sys.outerwearSkinnedMesh) return;
  sys.outerwearSkinnedMesh.visible = style !== 'none';
  if (style === 'none' || !sys.baseOuterPos || !sys.baseOuterNorm) return;

  const cacheKey = `${style}_${isMale ? 'M' : 'F'}_${fitEase}_${morph.key}`;
  if (sys.appliedOuterStyle === cacheKey) return;
  sys.appliedOuterStyle = cacheKey;

  const posAttr = sys.outerwearSkinnedMesh.geometry.attributes
    .position as THREE.BufferAttribute;
  const basePos = sys.baseOuterPos;
  const baseNorm = sys.baseOuterNorm;
  const anatW = sys.baseOuterAnatWeights;
  const count = posAttr.count;

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const wIdx = i * 4;
    const bx = basePos[idx];
    const by = basePos[idx + 1];
    const bz = basePos[idx + 2];
    const nx = baseNorm[idx];
    const ny = baseNorm[idx + 1];
    const nz = baseNorm[idx + 2];
    const wTorso = anatW ? anatW[wIdx] : 1;
    const wUpperArm = anatW ? anatW[wIdx + 1] : 0;
    const wForeArm = anatW ? anatW[wIdx + 2] : 0;
    const notArm = 1.0 - clamp01((wUpperArm + wForeArm) * 2.0);

    let sx = bx;
    let sy = by;
    let sz = bz;

    if (fitEase === 'slim') {
      const slimEnv =
        Math.exp(-Math.pow((by - (isMale ? 1.135 : 1.115)) / 0.095, 2)) *
        notArm;
      sx *= 1.0 - slimEnv * 0.056;
      sz *= 1.0 - slimEnv * 0.068;
      if (bz > 0) {
        sz -= slimEnv * bz * 0.12;
      }
      sx -= nx * 0.0014;
      sy -= ny * 0.0014;
      sz -= nz * 0.0014;
    } else if (fitEase === 'oversized') {
      const drapeEnv =
        smoothstep(0.96, 1.06, by) * (1.0 - smoothstep(1.36, 1.44, by));
      sx *= 1.0 + drapeEnv * 0.044;
      sz *= 1.0 + drapeEnv * 0.048;
      sx += nx * 0.0032;
      sy += ny * 0.0032;
      sz += nz * 0.0032;
    }

    const [mx, my, mz] = applyAnatomicalBodyMorphToVertex(
      sx,
      sy,
      sz,
      bx,
      by,
      bz,
      wTorso,
      wUpperArm,
      wForeArm,
      anatW ? anatW[wIdx + 3] : 0,
      sys.landmarks,
      isMale,
      morph
    );
    posAttr.setXYZ(i, mx, my, mz);
  }

  sys.outerwearSkinnedMesh.geometry.computeVertexNormals();
  posAttr.needsUpdate = true;
}

/**
 * Sculpts the 3D vertices of `bottomMesh` (`Wolf3D_Outfit_Bottom`) for each `BottomStyleId` + `AnatomicalMorphParams` + `fitEase`.
 */
function updateBottomMeshSilhouette(
  sys: SkinnedGarmentSystem,
  style: BottomStyleId,
  fabric: FabricType,
  isMale: boolean,
  morph: AnatomicalMorphParams,
  fitEase: 'slim' | 'regular' | 'oversized' = 'regular'
) {
  sys.bottomShaderUniforms.uBottomStyle.value =
    BOTTOM_STYLE_SHADER_CODE[style] ?? 6;
  sys.bottomShaderUniforms.uIsMale.value = isMale ? 1.0 : 0.0;
  sys.bottomShaderUniforms.uFabricCode.value = FABRIC_SHADER_CODE[fabric] ?? 1;

  if (!sys.bottomMesh || !sys.baseBottomPos || !sys.baseBottomNorm) return;
  const cacheKey = `${style}_${isMale ? 'M' : 'F'}_${fitEase}_${morph.key}`;
  if (sys.appliedBottomStyle === cacheKey) return;
  sys.appliedBottomStyle = cacheKey;

  const posAttr = sys.bottomMesh.geometry.attributes
    .position as THREE.BufferAttribute;
  const basePos = sys.baseBottomPos;
  const baseNorm = sys.baseBottomNorm;
  const anatW = sys.baseBottomAnatWeights;
  const count = posAttr.count;

  const isSkirtStyle =
    style === 'aline_skirt' ||
    style === 'pleated_maxi_skirt' ||
    style === 'pencil_skirt';

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const wIdx = i * 4;
    const bx = basePos[idx];
    const by = basePos[idx + 1];
    const bz = basePos[idx + 2];
    const nx = baseNorm[idx];
    const ny = baseNorm[idx + 1];
    const nz = baseNorm[idx + 2];
    const ax = Math.abs(bx);
    const signX = bx >= 0 ? 1 : -1;

    let x = bx;
    const y = by;
    let z = bz;
    let effNx = nx;
    let effNy = ny;
    let effNz = nz;
    let nOffset = 0;

    // True 3D femur/tibia bone axis for this side (`signX`) so all leg sculpting stays 100% straight & coaxial
    const hx = signX * sys.landmarks.hipPos[0];
    const hy = sys.landmarks.hipPos[1];
    const hz = sys.landmarks.hipPos[2];
    const kx = signX * sys.landmarks.kneePos[0];
    const ky = sys.landmarks.kneePos[1];
    const kz = sys.landmarks.kneePos[2];
    const akx = signX * sys.landmarks.anklePos[0];
    const aky = sys.landmarks.anklePos[1];
    const akz = sys.landmarks.anklePos[2];

    const isUpperLegSeg = smoothstep(ky - 0.04, ky + 0.06, by);
    const tFemur = clamp01((by - hy) / Math.min(-0.05, ky - hy));
    const tTibia = clamp01((by - ky) / Math.min(-0.05, aky - ky));
    const boneAxisX =
      isUpperLegSeg * (hx + tFemur * (kx - hx)) +
      (1.0 - isUpperLegSeg) * (kx + tTibia * (akx - kx));
    const boneAxisZ =
      isUpperLegSeg * (hz + tFemur * (kz - hz)) +
      (1.0 - isUpperLegSeg) * (kz + tTibia * (akz - kz));

    // Helper: Sculpt Wolf3D_Outfit_Bottom into straight, uniform, proportionate bare legs coaxial with `boneAxisX/Z`
    const sculptAnatomicalBareLeg = (bareBlend: number, innerTuckBlend: number) => {
      if (bareBlend <= 0.001 && innerTuckBlend <= 0.001) return;

      // Gate strictly between the ankle seam (by > 0.225, flush with Wolf3D_Body) and below the crotch (by < 0.74)
      const ankleSeamFade = smoothstep(0.215, 0.265, by);
      const legCylMask =
        ankleSeamFade *
        (1.0 - smoothstep(0.69, 0.75, by)) *
        smoothstep(0.035, 0.068, ax);
      const effBare = bareBlend * legCylMask;
      const effTuck = innerTuckBlend * legCylMask;

      if (effBare > 0.001 || effTuck > 0.001) {
        const dx = bx - boneAxisX;
        const dz = bz - boneAxisZ;
        const angle = Math.atan2(dz, dx);

        const calfBell =
          Math.sin(clamp01((by - 0.23) / 0.26) * Math.PI) *
          (1.0 - smoothstep(0.46, 0.52, by));
        const thighBell =
          Math.sin(clamp01((by - 0.50) / 0.25) * Math.PI) *
          smoothstep(0.48, 0.54, by);

        // Keep radial scaling coaxial with the straight vertical bone axis (`boneAxisX`, `boneAxisZ`)
        const radialScaleX =
          (1.0 +
            (isMale ? 0.038 : 0.032) * calfBell +
            (isMale ? 0.036 : 0.030) * thighBell) *
          (1.0 - effTuck * 0.28);
        const radialScaleZ =
          (1.0 +
            (isMale ? 0.044 : 0.038) * calfBell +
            (isMale ? 0.040 : 0.034) * thighBell) *
          (1.0 - effTuck * 0.28);
        const calfBackShift = -0.0028 * calfBell * (1.0 - effTuck);

        const anatX = boneAxisX + dx * radialScaleX;
        const anatZ = boneAxisZ + dz * radialScaleZ + calfBackShift;

        const totalBlend = clamp01(Math.max(effBare, effTuck));
        x = bx + (anatX - bx) * totalBlend;
        z = bz + (anatZ - bz) * totalBlend;

        const cylNx = Math.cos(angle);
        const cylNz = Math.sin(angle);
        effNx = nx + (cylNx - nx) * totalBlend * 0.55;
        effNy = ny * (1.0 - totalBlend * 0.35);
        effNz = nz + (cylNz - nz) * totalBlend * 0.55;
      }
    };

    if (style === 'none') {
      sculptAnatomicalBareLeg(1.0, 0.0);
      nOffset = 0.0004;
    } else if (isSkirtStyle) {
      // Keep the visible lower legs, knees, and lower thighs (`by <= skirtHemY + 0.06`) 100% straight and un-pinched!
      // Only tuck hidden upper-thigh/pelvis vertices (`by > skirtHemY + 0.06`) radially toward each leg's own straight
      // bone axis (`boneAxisX`, `boneAxisZ`) so legs NEVER angle or bend inward at the bodycon dress hem!
      const skirtHemY =
        style === 'pencil_skirt'
          ? 0.495
          : style === 'pleated_maxi_skirt'
          ? 0.385
          : 0.635;
      const insideSkirtShell = smoothstep(skirtHemY + 0.06, skirtHemY + 0.18, by);
      const pelvicTuck = smoothstep(0.76, 0.92, by);
      const tuckFactor = style === 'pencil_skirt' ? 0.72 : 0.60;
      sculptAnatomicalBareLeg(1.0, insideSkirtShell * tuckFactor);
      if (insideSkirtShell > 0.001) {
        // Radially slim around the straight leg bone axis (`boneAxisX`, `boneAxisZ`) rather than pulling toward x = 0
        const radialSlim = insideSkirtShell * (style === 'pencil_skirt' ? 0.24 : 0.16);
        x = boneAxisX + (x - boneAxisX) * (1.0 - radialSlim);
        z = boneAxisZ + (z - boneAxisZ) * (1.0 - radialSlim);
      }
      if (pelvicTuck > 0.001) {
        x *= 1.0 - pelvicTuck * 0.18;
        z *= 1.0 - pelvicTuck * 0.18;
        z -= pelvicTuck * 0.008;
      }
      nOffset = -insideSkirtShell * 0.004;
    } else if (style === 'female_denim_shorts') {
      const shortHem = 0.745;
      const belowHem = smoothstep(shortHem + 0.012, shortHem - 0.025, by);
      sculptAnatomicalBareLeg(belowHem, 0.0);
      const cuffBand =
        smoothstep(shortHem - 0.005, shortHem + 0.008, by) *
        (1.0 - smoothstep(shortHem + 0.032, shortHem + 0.045, by));
      nOffset = cuffBand * 0.0036 + (1.0 - belowHem) * 0.0016;
    } else if (style === 'tailored_shorts') {
      const shortHem = 0.565;
      const belowHem = smoothstep(shortHem + 0.012, shortHem - 0.025, by);
      sculptAnatomicalBareLeg(belowHem, 0.0);
      const cuffBand =
        smoothstep(shortHem - 0.005, shortHem + 0.01, by) *
        (1.0 - smoothstep(shortHem + 0.038, shortHem + 0.052, by));
      const relaxedShort =
        smoothstep(shortHem, shortHem + 0.04, by) *
        (1.0 - smoothstep(0.92, 0.98, by));
      nOffset =
        cuffBand * 0.004 +
        relaxedShort * 0.003 +
        (1.0 - belowHem) * 0.0012;
    } else if (style === 'cargo_pants' || style === 'female_cargo_pants') {
      const pocketMaskY =
        smoothstep(0.585, 0.605, by) * (1.0 - smoothstep(0.775, 0.795, by));
      const flapMaskY =
        smoothstep(0.74, 0.752, by) * (1.0 - smoothstep(0.782, 0.795, by));
      const pocketMaskZ = 1.0 - smoothstep(0.052, 0.072, Math.abs(bz));
      const outerThighMask = smoothstep(0.118, 0.138, ax);
      const cargoBox = pocketMaskY * pocketMaskZ * outerThighMask;
      const cargoFlap = flapMaskY * pocketMaskZ * outerThighMask;

      const legBaggy =
        Math.sin(smoothstep(0.23, 0.88, by) * Math.PI) * 0.0058;
      const ankleCinch =
        smoothstep(0.25, 0.21, by) * (1.0 - smoothstep(0.20, 0.185, by));

      x += signX * (cargoBox * 0.0135 + cargoFlap * 0.0035);
      nOffset = legBaggy + cargoBox * 0.004 - ankleCinch * 0.0035;
    } else if (style === 'tailored_trousers') {
      const wideFlare = smoothstep(0.92, 0.24, by);
      nOffset = 0.002 + wideFlare * 0.0068;
      z += Math.sin(wideFlare * Math.PI * 0.5) * (bz >= 0 ? 0.003 : -0.003);
    } else if (style === 'male_dress_trousers') {
      const frontCrease =
        Math.exp(-Math.pow((ax - 0.096) / 0.014, 2)) *
        stepVal(0.01, bz) *
        smoothstep(0.22, 0.3, by) *
        (1.0 - smoothstep(0.9, 0.96, by));
      nOffset = 0.0022;
      z += frontCrease * 0.0038;
    } else if (style === 'male_jogger_sport') {
      const calfPuff =
        Math.sin(smoothstep(0.24, 0.55, by) * Math.PI) * 0.0045;
      const tightCuff = smoothstep(0.25, 0.21, by);
      nOffset = calfPuff - tightCuff * 0.0038;
    } else if (style === 'male_chino_khaki') {
      const rolledCuff =
        smoothstep(0.198, 0.208, by) * (1.0 - smoothstep(0.232, 0.242, by));
      nOffset = 0.0014 + rolledCuff * 0.0042;
    } else {
      nOffset = isMale ? 0.0022 : 0.0016;
    }

    // Automatic Mesh Parameter Calibration for FitEase ('slim' | 'regular' | 'oversized') on Bottoms:
    // Smoothly aligns the upper pelvis & waistband (`by = 0.84..1.05`) with `topMesh` when `fitEase === 'slim'`
    // to eliminate any lower-abdomen bulge ("lòi mỡ") or waistband bumpiness ("gồ ghề") without shrinking the legs!
    if (style !== 'none' && !isSkirtStyle) {
      const waistPelvisBand = smoothstep(0.82, 0.94, by);
      if (fitEase === 'slim') {
        x *= 1.0 - waistPelvisBand * (isMale ? 0.052 : 0.068);
        z *= 1.0 - waistPelvisBand * (isMale ? 0.064 : 0.082);
        if (bz > 0) {
          z -= waistPelvisBand * (bz * 0.16 + 0.0035);
        }
        nOffset -= waistPelvisBand * 0.0012;
      } else if (fitEase === 'oversized') {
        const legRelaxBand =
          smoothstep(0.22, 0.32, by) * (1.0 - smoothstep(0.95, 1.03, by));
        nOffset += legRelaxBand * 0.0028 + waistPelvisBand * 0.0012;
      }
    }

    const sx = x + effNx * nOffset;
    const sy = y + effNy * nOffset;
    const sz = z + effNz * nOffset;
    let [mx, my, mz] = applyAnatomicalBodyMorphToVertex(
      sx,
      sy,
      sz,
      bx,
      by,
      bz,
      anatW ? anatW[wIdx] : 1,
      anatW ? anatW[wIdx + 1] : 0,
      anatW ? anatW[wIdx + 2] : 0,
      anatW ? anatW[wIdx + 3] : 0,
      sys.landmarks,
      isMale,
      morph
    );
    // Keep hidden upper-thigh vertices (by > 0.58) inside the 3D bodycon/skirt shell coaxial with boneAxisX/Z
    // while leaving the knee and lower leg (by <= 0.58) 100% straight and natural
    if (isSkirtStyle && by > 0.58) {
      const upperContain = smoothstep(0.58, 0.70, by) * (style === 'pencil_skirt' ? 0.38 : 0.25);
      mx = boneAxisX + (mx - boneAxisX) * (1.0 - upperContain);
      mz = boneAxisZ + (mz - boneAxisZ) * (1.0 - upperContain);
    }
    posAttr.setXYZ(i, mx, my, mz);
  }

  sys.bottomMesh.geometry.computeVertexNormals();
  posAttr.needsUpdate = true;
}

/**
 * Sculpts the 3D vertices of `footwearMesh` (`Wolf3D_Outfit_Footwear`) so each shoe style
 * has a distinct 3D silhouette (cupsole sneaker, chunky dad sneaker, high-ankle lug Chelsea boot,
 * tapered dress loafer, pointed Mary Jane pump, or slender bare foot).
 */
function updateFootwearMeshSilhouette(
  sys: SkinnedGarmentSystem,
  style: FootwearStyleId,
  shoeColorHex: string,
  isMale: boolean
) {
  sys.footwearShaderUniforms.uShoeStyle.value =
    SHOE_STYLE_SHADER_CODE[style] ?? 1;
  sys.footwearShaderUniforms.uIsMale.value = isMale ? 1.0 : 0.0;
  sys.footwearShaderUniforms.uShoeColor.value
    .set(shoeColorHex)
    .convertSRGBToLinear();

  if (!sys.footwearMesh || !sys.baseFootwearPos || !sys.baseFootwearNorm) {
    return;
  }
  if (sys.appliedFootwearStyle === style) return;
  sys.appliedFootwearStyle = style;

  const posAttr = sys.footwearMesh.geometry.attributes
    .position as THREE.BufferAttribute;
  const basePos = sys.baseFootwearPos;
  const baseNorm = sys.baseFootwearNorm;
  const count = posAttr.count;
  const fb = sys.footBounds;

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const rawBx = basePos[idx];
    const rawBy = basePos[idx + 1];
    const rawBz = basePos[idx + 2];
    const nx = baseNorm[idx];
    const ny = baseNorm[idx + 1];
    const nz = baseNorm[idx + 2];
    const signX = rawBx >= 0 ? 1 : -1;
    const ax = Math.abs(rawBx);
    const fx = (ax - fb.centerX) * (0.048 / Math.max(0.032, fb.halfWidthX));
    const by =
      clamp01((rawBy - fb.minY) / Math.max(0.08, fb.maxY - fb.minY)) * 0.162;
    const bz =
      -0.075 +
      clamp01((rawBz - fb.minZ) / Math.max(0.15, fb.maxZ - fb.minZ)) * 0.295;

    let x = rawBx;
    let y = rawBy;
    let z = rawBz;
    let nOffset = 0;

    if (style === 'none') {
      // Barefoot: slim down bulky shoe upper & sole to anatomical foot proportions
      nOffset = -0.0046;
    } else if (style === 'minimal_sneakers') {
      // Low-top court sneaker: flat rubber cupsole wall + padded low ankle collar + bare ankle above
      const inSole = 1.0 - smoothstep(0.024, 0.032, by);
      const collarTop =
        0.104 -
        0.014 * smoothstep(-0.04, 0.04, bz) +
        0.012 * smoothstep(0.03, 0.09, bz);
      const paddedCollar =
        smoothstep(collarTop - 0.022, collarTop - 0.006, by) *
        (1.0 - smoothstep(collarTop - 0.002, collarTop + 0.006, by));
      const bareAnkle = smoothstep(collarTop - 0.002, collarTop + 0.008, by);
      x += signX * fx * inSole * 0.06;
      nOffset = inSole * 0.0022 + paddedCollar * 0.0026 - bareAnkle * 0.0045;
    } else if (style === 'chunky_dad_sneakers') {
      // Chunky streetwear sneaker: flared 3D wavy EVA platform midsole + extended rear heel pod
      const inChunkySole = 1.0 - smoothstep(0.032, 0.044, by);
      const wavePod = Math.sin(bz * 58) * 0.0022 * inChunkySole;
      const rearHeelFlare =
        (1.0 - smoothstep(-0.085, -0.035, bz)) * inChunkySole;
      const bareAnkle = smoothstep(0.112, 0.122, by);
      x += signX * fx * inChunkySole * 0.14;
      z -= rearHeelFlare * 0.0055;
      nOffset =
        inChunkySole * 0.0045 +
        wavePod +
        (1.0 - bareAnkle) * 0.0018 -
        bareAnkle * 0.0042;
    } else if (style === 'chelsea_boots') {
      // High-ankle Chelsea boot: structured tall shaft + rugged command lug sole + stacked block heel
      const isHeel = 1.0 - smoothstep(-0.03, -0.015, bz);
      const soleTop = 0.032 + isHeel * 0.012;
      const inLugSole = 1.0 - smoothstep(soleTop - 0.004, soleTop + 0.004, by);
      const lugCleat =
        Math.sin(bz * 230) * 0.0015 * (1.0 - smoothstep(0.012, 0.02, by));
      const bootShaft = smoothstep(0.08, 0.15, by);
      x += signX * fx * inLugSole * 0.1;
      nOffset = inLugSole * 0.0038 + bootShaft * 0.002;
      y += lugCleat;
    } else if (style === 'penny_loafers') {
      // Sleek Italian dress loafer: tapered almond toe + raised moccasin apron ridge + low-cut bare ankle
      const loaferCollar =
        0.084 -
        0.012 * smoothstep(-0.03, 0.03, bz) +
        0.01 * smoothstep(0.03, 0.08, bz);
      const bareAnkle = smoothstep(loaferCollar - 0.003, loaferCollar + 0.006, by);
      const toeTaper = smoothstep(0.105, 0.21, bz) * (1.0 - bareAnkle);
      const isHeel = (1.0 - smoothstep(-0.03, -0.018, bz)) * (1.0 - smoothstep(0.028, 0.035, by));
      x -= signX * fx * toeTaper * 0.14;
      nOffset = isHeel * 0.0025 + (1.0 - bareAnkle) * 0.0008 - bareAnkle * 0.0048;
    } else if (style === 'pointed_heels') {
      // Feminine pointed Mary Jane pump: sharp pointed toe box + open bare instep + ankle strap
      const pumpCollar = 0.082 - 0.026 * smoothstep(-0.02, 0.02, bz);
      const openInstep =
        (1.0 - smoothstep(0.022, 0.032, Math.abs(fx))) *
        smoothstep(0.002, 0.015, bz) *
        (1.0 - smoothstep(0.095, 0.108, bz)) *
        smoothstep(0.046, 0.055, by);
      const mjStrap =
        smoothstep(0.075, 0.08, by) *
        (1.0 - smoothstep(0.09, 0.095, by)) *
        smoothstep(0.012, 0.025, bz) *
        (1.0 - smoothstep(0.048, 0.058, bz));
      const bareZone = Math.max(
        smoothstep(pumpCollar - 0.003, pumpCollar + 0.006, by),
        openInstep
      ) * (1.0 - mjStrap);
      const pointedToe = smoothstep(0.10, 0.215, bz) * (1.0 - bareZone);
      x -= signX * fx * pointedToe * 0.28;
      z += smoothstep(0.17, 0.22, bz) * 0.006;
      nOffset = mjStrap * 0.0018 - bareZone * 0.0048;
    } else if (style === 'strappy_stiletto_heels') {
      // Open-toe strappy stiletto: slender foot arch + raised ankle & toe straps
      const ankleStrap =
        smoothstep(0.09, 0.096, by) * (1.0 - smoothstep(0.108, 0.114, by));
      const frontStrap =
        smoothstep(0.102, 0.11, bz) *
        (1.0 - smoothstep(0.136, 0.144, bz)) *
        (1.0 - smoothstep(0.056, 0.064, by));
      const inSole = 1.0 - smoothstep(0.018, 0.028, by);
      const onStrap = Math.max(ankleStrap, frontStrap);
      nOffset = onStrap * 0.0022 + inSole * 0.0012 - (1.0 - Math.max(onStrap, inSole)) * 0.0042;
    } else if (style === 'knee_high_boots') {
      // Couture tall shaft boot: sculpted boot shaft hugging the ankle/lower calf + almond pointed toe + block heel
      const isHeel = 1.0 - smoothstep(-0.03, -0.016, bz);
      const inSole = 1.0 - smoothstep(0.028, 0.042, by);
      const tallShaft = smoothstep(0.075, 0.155, by);
      const almondToe = smoothstep(0.11, 0.215, bz) * (1.0 - tallShaft);
      x -= signX * fx * almondToe * 0.18;
      z += smoothstep(0.175, 0.22, bz) * 0.0045;
      nOffset = inSole * 0.0032 + isHeel * 0.0025 + tallShaft * 0.0038 + 0.0015;
    } else if (style === 'platform_mary_jane') {
      // Chunky platform Mary Jane: thick front platform sole + double straps + rounded dome toe
      const inPlatform = 1.0 - smoothstep(0.030, 0.044, by);
      const pumpCollar = 0.084 - 0.024 * smoothstep(-0.02, 0.02, bz);
      const bareUpper = smoothstep(pumpCollar - 0.003, pumpCollar + 0.006, by);
      x += signX * fx * inPlatform * 0.12;
      y -= inPlatform * 0.003;
      nOffset = inPlatform * 0.0048 + (1.0 - bareUpper) * 0.0018 - bareUpper * 0.0042;
    } else if (style === 'oxford_dress_shoes') {
      // Bespoke Oxford dress shoe: tapered almond cap-toe + welted leather sole + low-cut dress ankle
      const oxCollar =
        0.088 -
        0.012 * smoothstep(-0.03, 0.03, bz) +
        0.012 * smoothstep(0.03, 0.085, bz);
      const bareAnkle = smoothstep(oxCollar - 0.003, oxCollar + 0.006, by);
      const toeTaper = smoothstep(0.105, 0.215, bz) * (1.0 - bareAnkle);
      const inWeltSole = 1.0 - smoothstep(0.020, 0.030, by);
      x -= signX * fx * toeTaper * 0.16;
      z += smoothstep(0.175, 0.22, bz) * 0.0035;
      nOffset = inWeltSole * 0.0024 + (1.0 - bareAnkle) * 0.0012 - bareAnkle * 0.0046;
    } else if (style === 'high_top_sneakers') {
      // High-top basketball sneaker: tall padded ankle collar + flat rubber cupsole
      const inCupSole = 1.0 - smoothstep(0.026, 0.034, by);
      const highCollar = smoothstep(0.085, 0.145, by) * (1.0 - smoothstep(0.148, 0.156, by));
      const bareTop = smoothstep(0.148, 0.156, by);
      x += signX * fx * inCupSole * 0.08;
      nOffset = inCupSole * 0.0028 + highCollar * 0.0036 + (1.0 - bareTop) * 0.0018 - bareTop * 0.0038;
    }

    posAttr.setXYZ(
      i,
      x + nx * nOffset,
      y + ny * nOffset,
      z + nz * nOffset
    );
  }

  sys.footwearMesh.geometry.computeVertexNormals();
  posAttr.needsUpdate = true;
}

function buildSkinnedGarmentSystem(
  scene: THREE.Group,
  parts: ReturnType<typeof classifyAndPrepareSkinnedMeshes>,
  topOverlayMat: THREE.MeshStandardMaterial,
  outerOverlayMat: THREE.MeshStandardMaterial,
  bottomMat: THREE.MeshStandardMaterial,
  baseHeadSkinColor: THREE.Color,
  isMale: boolean
): SkinnedGarmentSystem {
  const hipsBone = parts.bonesByName.get('Hips')!;
  const neckBone =
    parts.bonesByName.get('Neck') || parts.bonesByName.get('Spine2') || hipsBone;
  const primaryBodySkin =
    parts.skinMeshes.find((m) => m.name.toLowerCase().includes('body')) || null;
  const primaryTop = parts.topMeshes[0] || null;
  const primaryBottom = parts.bottomMeshes[0] || null;
  const primaryFootwear = parts.footwearMeshes[0] || null;

  let baseBodyPos: Float32Array | null = null;
  let baseBodyNorm: Float32Array | null = null;
  let baseBodyAnatWeights: Float32Array | null = null;
  let baseTopPos: Float32Array | null = null;
  let baseTopNorm: Float32Array | null = null;
  let baseTopAnatWeights: Float32Array | null = null;
  let outerwearSkinnedMesh: THREE.SkinnedMesh | null = null;
  let baseOuterPos: Float32Array | null = null;
  let baseOuterNorm: Float32Array | null = null;
  let baseOuterAnatWeights: Float32Array | null = null;
  let baseBottomPos: Float32Array | null = null;
  let baseBottomNorm: Float32Array | null = null;
  let baseBottomAnatWeights: Float32Array | null = null;
  let baseFootwearPos: Float32Array | null = null;
  let baseFootwearNorm: Float32Array | null = null;

  // Extract exact bind-pose 3D bone landmarks before any pose calibration rotates the skeleton
  scene.updateMatrixWorld(true);
  const mSceneInv = new THREE.Matrix4().copy(scene.matrixWorld).invert();
  const getBindBonePos = (
    boneName: string,
    fallback: [number, number, number]
  ): [number, number, number] => {
    const b = parts.bonesByName.get(boneName);
    if (!b) return fallback;
    const v = new THREE.Vector3();
    b.getWorldPosition(v);
    v.applyMatrix4(mSceneInv);
    return [Math.abs(v.x), v.y, v.z];
  };

  const landmarks: AnatomicalRigLandmarks = {
    shoulderPos: getBindBonePos(
      'LeftArm',
      isMale ? [0.172, 1.435, -0.018] : [0.142, 1.355, -0.015]
    ),
    elbowPos: getBindBonePos(
      'LeftForeArm',
      isMale ? [0.335, 1.245, -0.025] : [0.285, 1.185, -0.022]
    ),
    wristPos: getBindBonePos(
      'LeftHand',
      isMale ? [0.485, 1.045, 0.012] : [0.415, 0.995, 0.01]
    ),
    hipPos: getBindBonePos(
      'LeftUpLeg',
      isMale ? [0.098, 0.965, -0.008] : [0.094, 0.945, -0.008]
    ),
    kneePos: getBindBonePos(
      'LeftLeg',
      isMale ? [0.098, 0.515, -0.012] : [0.095, 0.505, -0.012]
    ),
    anklePos: getBindBonePos(
      'LeftFoot',
      isMale ? [0.098, 0.092, -0.022] : [0.095, 0.088, -0.022]
    ),
  };

  if (primaryBodySkin) {
    const bodyDeinterleaved = deinterleaveSkinnedGeometry(
      primaryBodySkin.geometry,
      0,
      false,
      primaryBodySkin.skeleton?.bones
    );
    primaryBodySkin.geometry = bodyDeinterleaved.geo;
    baseBodyPos = bodyDeinterleaved.basePos;
    baseBodyNorm = bodyDeinterleaved.baseNorm;
    baseBodyAnatWeights = bodyDeinterleaved.anatWeights;
  }

  const footBounds = {
    centerX: 0.145,
    halfWidthX: 0.048,
    minY: 0.0,
    maxY: 0.162,
    minZ: -0.075,
    maxZ: 0.22,
  };

  const dummyTex = getDummyWhiteTexture();

  const topShaderUniforms: TopShaderUniforms = {
    uTopStyle: { value: isMale ? 20 : 1 },
    uIsMale: { value: isMale ? 1.0 : 0.0 },
    uIsDress: { value: 0.0 },
    uFabricCode: { value: 1 },
    uSkinColor: { value: baseHeadSkinColor.clone() },
    uTrimColor: { value: new THREE.Color('#D6C7B2') },
    uHasPhotoTex: { value: 0.0 },
    uPhotoTex: { value: dummyTex },
    uPhotoCutout: { value: new THREE.Vector4(0.35, 0.25, 0.05, 0.96) },
    uWetness: { value: 0.0 },
  };

  const outerShaderUniforms: OuterShaderUniforms = {
    uOuterStyle: { value: 0 },
    uIsMale: { value: isMale ? 1.0 : 0.0 },
    uFabricCode: { value: 1 },
    uTrimColor: { value: new THREE.Color('#1E293B') },
    uHasPhotoTex: { value: 0.0 },
    uPhotoTex: { value: dummyTex },
    uWetness: { value: 0.0 },
  };

  const bottomShaderUniforms: BottomShaderUniforms = {
    uBottomStyle: { value: isMale ? 20 : 6 },
    uIsMale: { value: isMale ? 1.0 : 0.0 },
    uIsDress: { value: 0.0 },
    uFabricCode: { value: 3 },
    uSkinColor: { value: baseHeadSkinColor.clone() },
    uTrimColor: { value: new THREE.Color('#D6C7B2') },
    uHasPhotoTex: { value: 0.0 },
    uPhotoTex: { value: dummyTex },
    uWetness: { value: 0.0 },
  };

  const footwearShaderUniforms: FootwearShaderUniforms = {
    uShoeStyle: { value: 1 },
    uIsMale: { value: isMale ? 1.0 : 0.0 },
    uSkinColor: { value: baseHeadSkinColor.clone() },
    uShoeColor: { value: new THREE.Color('#F8FAFC').convertSRGBToLinear() },
    uFootBoundsX: { value: new THREE.Vector2(0.145, 0.048) },
    uFootBoundsY: { value: new THREE.Vector2(0.0, 0.162) },
    uFootBoundsZ: { value: new THREE.Vector2(-0.075, 0.22) },
  };

  if (primaryTop) {
    // 1. De-interleave primaryTop with `aBindPos` and keep 100% of triangles intact
    const topDeinterleaved = deinterleaveSkinnedGeometry(
      primaryTop.geometry,
      0,
      false,
      primaryTop.skeleton?.bones
    );
    primaryTop.geometry = topDeinterleaved.geo;
    baseTopPos = topDeinterleaved.basePos;
    baseTopNorm = topDeinterleaved.baseNorm;
    baseTopAnatWeights = topDeinterleaved.anatWeights;
    const topMat = primaryTop.material as THREE.MeshStandardMaterial;
    if (topMat) {
      topMat.side = THREE.DoubleSide;
      topMat.roughnessMap = null;
      topMat.metalnessMap = null;
      topMat.normalMap = null;
      attachTopGarmentShader(topMat, topShaderUniforms);
    }

    // 2. Create `outerwearSkinnedMesh` (+5.8mm outward normal offset + lapel ridge) bound to the same skeleton
    const outerDeinterleaved = deinterleaveSkinnedGeometry(
      primaryTop.geometry,
      0.0058,
      true,
      primaryTop.skeleton?.bones
    );
    outerwearSkinnedMesh = primaryTop.clone();
    outerwearSkinnedMesh.name = 'Wolf3D_Outerwear_Jacket';
    outerwearSkinnedMesh.geometry = outerDeinterleaved.geo;
    baseOuterPos = outerDeinterleaved.basePos;
    baseOuterNorm = outerDeinterleaved.baseNorm;
    baseOuterAnatWeights = outerDeinterleaved.anatWeights;
    const outerMat = topMat.clone();
    outerMat.side = THREE.DoubleSide;
    outerMat.roughnessMap = null;
    outerMat.metalnessMap = null;
    outerMat.normalMap = null;
    outerMat.userData = {
      ...topMat.userData,
    };
    attachOuterwearCutoutShader(outerMat, outerShaderUniforms);
    outerwearSkinnedMesh.material = outerMat;
    outerwearSkinnedMesh.bind(
      primaryTop.skeleton,
      primaryTop.bindMatrix.clone()
    );
    outerwearSkinnedMesh.castShadow = true;
    outerwearSkinnedMesh.receiveShadow = true;
    outerwearSkinnedMesh.frustumCulled = false;
    outerwearSkinnedMesh.visible = false;
    scene.add(outerwearSkinnedMesh);
  }

  if (primaryBottom) {
    // 3. De-interleave primaryBottom (`Wolf3D_Outfit_Bottom`) for Skirts, Shorts, Cargo Pants, Jeans, Trousers
    const botDeinterleaved = deinterleaveSkinnedGeometry(
      primaryBottom.geometry,
      0,
      false,
      primaryBottom.skeleton?.bones
    );
    primaryBottom.geometry = botDeinterleaved.geo;
    baseBottomPos = botDeinterleaved.basePos;
    baseBottomNorm = botDeinterleaved.baseNorm;
    baseBottomAnatWeights = botDeinterleaved.anatWeights;
    const botMat = primaryBottom.material as THREE.MeshStandardMaterial;
    if (botMat) {
      botMat.side = THREE.DoubleSide;
      botMat.roughnessMap = null;
      botMat.metalnessMap = null;
      botMat.normalMap = null;
      attachBottomGarmentShader(botMat, bottomShaderUniforms);
    }
  }

  if (primaryFootwear) {
    // 3b. De-interleave primaryFootwear (`Wolf3D_Outfit_Footwear`) for 3D Shoe Sculpting & Multi-Part Footwear Shader
    const shoeDeinterleaved = deinterleaveSkinnedGeometry(
      primaryFootwear.geometry,
      0,
      false
    );
    primaryFootwear.geometry = shoeDeinterleaved.geo;
    baseFootwearPos = shoeDeinterleaved.basePos;
    baseFootwearNorm = shoeDeinterleaved.baseNorm;

    let minAx = Infinity;
    let maxAx = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < baseFootwearPos.length; i += 3) {
      const ax = Math.abs(baseFootwearPos[i]);
      const py = baseFootwearPos[i + 1];
      const pz = baseFootwearPos[i + 2];
      if (ax < minAx) minAx = ax;
      if (ax > maxAx) maxAx = ax;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      if (pz < minZ) minZ = pz;
      if (pz > maxZ) maxZ = pz;
    }
    if (Number.isFinite(minAx) && maxAx > minAx) {
      footBounds.centerX = (minAx + maxAx) * 0.5;
      footBounds.halfWidthX = Math.max(0.032, (maxAx - minAx) * 0.5);
      footBounds.minY = minY;
      footBounds.maxY = Math.max(minY + 0.08, maxY);
      footBounds.minZ = minZ;
      footBounds.maxZ = Math.max(minZ + 0.15, maxZ);
      footwearShaderUniforms.uFootBoundsX.value.set(
        footBounds.centerX,
        footBounds.halfWidthX
      );
      footwearShaderUniforms.uFootBoundsY.value.set(
        footBounds.minY,
        footBounds.maxY
      );
      footwearShaderUniforms.uFootBoundsZ.value.set(
        footBounds.minZ,
        footBounds.maxZ
      );
    }

    const shoeMat = primaryFootwear.material as THREE.MeshStandardMaterial;
    if (shoeMat) {
      shoeMat.side = THREE.DoubleSide;
      shoeMat.map = null;
      shoeMat.roughnessMap = null;
      shoeMat.metalnessMap = null;
      shoeMat.normalMap = null;
      shoeMat.color.set('#FFFFFF');
      attachFootwearShader(shoeMat, footwearShaderUniforms);
    }
  }

  // 4. Sculpted 3D Silk Ribbon Bow Collar (`silk_blouse_bow`) attached to Neck bone
  const blouseBowGroup = new THREE.Group();
  blouseBowGroup.visible = false;
  {
    const standCollarGeo = new THREE.TorusGeometry(0.056, 0.0085, 12, 32);
    standCollarGeo.rotateX(Math.PI * 0.52);
    standCollarGeo.scale(1.0, 1.08, 1.0);
    const standCollar = new THREE.Mesh(standCollarGeo, topOverlayMat);
    standCollar.position.set(0, -0.018, 0.006);
    blouseBowGroup.add(standCollar);

    const knotGeo = new THREE.SphereGeometry(0.012, 14, 12);
    knotGeo.scale(1.1, 0.9, 0.85);
    const knot = new THREE.Mesh(knotGeo, topOverlayMat);
    knot.position.set(0, -0.025, 0.064);
    blouseBowGroup.add(knot);

    const leftLoopGeo = new THREE.TorusGeometry(0.022, 0.0065, 10, 20);
    leftLoopGeo.scale(1.35, 0.72, 0.6);
    const leftLoop = new THREE.Mesh(leftLoopGeo, topOverlayMat);
    leftLoop.position.set(0.026, -0.024, 0.062);
    leftLoop.rotation.set(0.15, -0.28, -0.22);
    blouseBowGroup.add(leftLoop);

    const rightLoop = leftLoop.clone();
    rightLoop.position.set(-0.026, -0.024, 0.062);
    rightLoop.rotation.set(0.15, 0.28, 0.22);
    blouseBowGroup.add(rightLoop);

    const leftRibbonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.008, -0.028, 0.064),
      new THREE.Vector3(0.018, -0.075, 0.074),
      new THREE.Vector3(0.024, -0.135, 0.078),
    ]);
    const leftTailGeo = new THREE.TubeGeometry(leftRibbonCurve, 12, 0.007, 8, false);
    leftTailGeo.scale(1.4, 1.0, 0.35);
    const leftTail = new THREE.Mesh(leftTailGeo, topOverlayMat);
    blouseBowGroup.add(leftTail);

    const rightRibbonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.008, -0.028, 0.064),
      new THREE.Vector3(-0.018, -0.075, 0.074),
      new THREE.Vector3(-0.024, -0.135, 0.078),
    ]);
    const rightTailGeo = new THREE.TubeGeometry(rightRibbonCurve, 12, 0.007, 8, false);
    rightTailGeo.scale(1.4, 1.0, 0.35);
    const rightTail = new THREE.Mesh(rightTailGeo, topOverlayMat);
    blouseBowGroup.add(rightTail);
  }
  neckBone.add(blouseBowGroup);

  // 5. Open-Front Trench Coat Lower Hem (`trench_coat`)
  const trenchGeo = new THREE.CylinderGeometry(
    isMale ? 0.166 : 0.152,
    isMale ? 0.218 : 0.204,
    0.36,
    36,
    4,
    true,
    Math.PI * 0.5 + 0.35,
    Math.PI * 2 - 0.70
  );
  trenchGeo.scale(1.05, 1, 0.82);
  const trenchOpenHemMesh = new THREE.Mesh(trenchGeo, outerOverlayMat);
  trenchOpenHemMesh.position.set(0, -0.13, -0.012);
  trenchOpenHemMesh.castShadow = true;
  trenchOpenHemMesh.visible = false;
  hipsBone.add(trenchOpenHemMesh);

  // 5b. Open-Front Tailored Blazer Lower Hem (`tailored_blazer`)
  const blazerGeo = new THREE.CylinderGeometry(
    isMale ? 0.165 : 0.150,
    isMale ? 0.185 : 0.170,
    0.15,
    36,
    4,
    true,
    Math.PI * 0.5 + 0.42,
    Math.PI * 2 - 0.84
  );
  blazerGeo.scale(1.05, 1, 0.80);
  const blazerTailMesh = new THREE.Mesh(blazerGeo, outerOverlayMat);
  blazerTailMesh.position.set(0, -0.025, -0.010);
  blazerTailMesh.castShadow = true;
  blazerTailMesh.visible = false;
  hipsBone.add(blazerTailMesh);

  // 6. Female Peplum Waist Flare (`peplum_waist_top`)
  const peplumGeo = new THREE.CylinderGeometry(
    0.128,
    0.184,
    0.14,
    36,
    4,
    true
  );
  const pepPos = peplumGeo.attributes.position;
  for (let i = 0; i < pepPos.count; i++) {
    const vx = pepPos.getX(i);
    const vy = pepPos.getY(i);
    const vz = pepPos.getZ(i);
    const tDown = clamp01((0.07 - vy) / 0.14);
    const angle = Math.atan2(vz, vx);
    const wave = Math.sin(angle * 10) * 0.008 * tDown;
    pepPos.setX(i, vx * (1 + wave) * 1.08);
    pepPos.setZ(i, vz * (1 + wave) * 0.78);
  }
  peplumGeo.computeVertexNormals();
  const peplumWaistMesh = new THREE.Mesh(peplumGeo, topOverlayMat);
  peplumWaistMesh.position.set(0, 0.045, -0.018);
  peplumWaistMesh.castShadow = true;
  peplumWaistMesh.visible = false;
  hipsBone.add(peplumWaistMesh);

  // 7. Continuous One-Piece 3D Princess A-Line Dress & Skirt Shell (`aline_skirt` / `aline_princess_dress` / `off_shoulder_couture_dress` / `corset_bustier_dress`)
  // Spans continuously from the natural waist (`local y = +0.135`, `by = 1.12`) through the anatomical hip swell (`tDown = 0.34`, `by = 0.94`)
  // down to the flared A-line skirt hem (`local y = -0.365`, `by = 0.62`), with a flush inward-curved waist lip so there is zero waist gap!
  const alineGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.50, 72, 28, true);
  const aPos = alineGeo.attributes.position;
  const aUv = alineGeo.attributes.uv;
  for (let i = 0; i < aPos.count; i++) {
    const ux = aPos.getX(i);
    const vy = aPos.getY(i); // -0.25 .. +0.25
    const uz = aPos.getZ(i);
    const tDown = clamp01((0.25 - vy) / 0.50);
    const angle = Math.atan2(uz, ux);

    // Top waist lip curves slightly inward into the torso at tDown = 0..0.05 so there is never a hollow gap around the waist
    const topWaistSeal = 1.0 - smoothstep(0.0, 0.055, tDown);
    const hipCurve = smoothstep(0.04, 0.36, tDown);
    const hipBell = Math.exp(-Math.pow((tDown - 0.34) / 0.24, 2));
    const skirtFlare = Math.pow(smoothstep(0.06, 1.0, tDown), 1.15);
    const godetFlutes =
      (Math.sin(angle * 8) * 0.0085 + Math.cos(angle * 4) * 0.004) *
      Math.pow(smoothstep(0.20, 1.0, tDown), 1.3);

    const rx =
      0.104 -
      0.016 * topWaistSeal +
      0.048 * hipCurve +
      0.018 * hipBell +
      0.102 * skirtFlare +
      godetFlutes;
    const rzFront =
      0.088 -
      0.014 * topWaistSeal +
      0.036 * hipCurve +
      0.016 * hipBell +
      0.082 * skirtFlare +
      godetFlutes * 0.85;
    const rzBack =
      0.078 -
      0.012 * topWaistSeal +
      0.042 * hipCurve +
      0.024 * hipBell +
      0.086 * skirtFlare +
      godetFlutes * 0.85;
    const rz = uz >= 0 ? rzFront : rzBack;
    const zCenterShift =
      0.008 * (1.0 - smoothstep(0.0, 0.45, tDown)) - 0.006 * hipBell;

    aPos.setX(i, ux * rx);
    aPos.setZ(i, uz * rz + zCenterShift);
    if (aUv) {
      aUv.setXY(
        i,
        clamp01(0.5 + ux * 0.36),
        clamp01(0.96 - tDown * 0.92)
      );
    }
  }
  alineGeo.computeVertexNormals();
  const alineSkirtMesh = new THREE.Mesh(alineGeo, bottomMat);
  alineSkirtMesh.position.set(0, -0.115, 0.0);
  alineSkirtMesh.castShadow = true;
  alineSkirtMesh.receiveShadow = true;
  alineSkirtMesh.visible = false;
  hipsBone.add(alineSkirtMesh);

  // 8. Continuous One-Piece 3D Evening Gown & Pleated Maxi Dress Shell (`pleated_maxi_skirt` / `silk_slip_evening_dress` / `pleated_gala_gown`)
  const maxiGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.76, 96, 36, true);
  const mPos = maxiGeo.attributes.position;
  const mUv = maxiGeo.attributes.uv;
  for (let i = 0; i < mPos.count; i++) {
    const ux = mPos.getX(i);
    const vy = mPos.getY(i); // -0.38 .. +0.38
    const uz = mPos.getZ(i);
    const tDown = clamp01((0.38 - vy) / 0.76);
    const angle = Math.atan2(uz, ux);

    const topWaistSeal = 1.0 - smoothstep(0.0, 0.045, tDown);
    const hipCurve = smoothstep(0.03, 0.26, tDown);
    const hipBell = Math.exp(-Math.pow((tDown - 0.24) / 0.18, 2));
    const gownFlare = Math.pow(smoothstep(0.05, 1.0, tDown), 1.14);
    const pleatPhase = angle * 32;
    const knifePleat =
      (Math.sin(pleatPhase) * 0.72 + Math.sin(pleatPhase * 2) * 0.28) *
      0.009 *
      smoothstep(0.16, 0.90, tDown);

    const rx =
      0.104 -
      0.016 * topWaistSeal +
      0.048 * hipCurve +
      0.018 * hipBell +
      0.138 * gownFlare +
      knifePleat;
    const rzFront =
      0.088 -
      0.014 * topWaistSeal +
      0.036 * hipCurve +
      0.016 * hipBell +
      0.112 * gownFlare +
      knifePleat * 0.85;
    const rzBack =
      0.078 -
      0.012 * topWaistSeal +
      0.042 * hipCurve +
      0.024 * hipBell +
      0.118 * gownFlare +
      knifePleat * 0.85;
    const rz = uz >= 0 ? rzFront : rzBack;
    const zCenterShift =
      0.008 * (1.0 - smoothstep(0.0, 0.35, tDown)) - 0.006 * hipBell;

    mPos.setX(i, ux * rx);
    mPos.setZ(i, uz * rz + zCenterShift);
    if (mUv) {
      mUv.setXY(
        i,
        clamp01(0.5 + ux * 0.36),
        clamp01(0.96 - tDown * 0.92)
      );
    }
  }
  maxiGeo.computeVertexNormals();
  const maxiSkirtMesh = new THREE.Mesh(maxiGeo, bottomMat);
  maxiSkirtMesh.position.set(0, -0.245, 0.0);
  maxiSkirtMesh.castShadow = true;
  maxiSkirtMesh.receiveShadow = true;
  maxiSkirtMesh.visible = false;
  hipsBone.add(maxiSkirtMesh);

  // 9. Continuous One-Piece 3D Hourglass Bodycon Midi Sheath Dress & Pencil Skirt (`pencil_skirt` / `bodycon_midi_dress`)
  const pencilGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.62, 72, 32, true);
  const pPos = pencilGeo.attributes.position;
  const pUv = pencilGeo.attributes.uv;
  for (let i = 0; i < pPos.count; i++) {
    const ux = pPos.getX(i);
    const vy = pPos.getY(i); // -0.31 .. +0.31
    const uz = pPos.getZ(i);
    const tDown = clamp01((0.31 - vy) / 0.62);

    const topWaistSeal = 1.0 - smoothstep(0.0, 0.05, tDown);
    const hipCurve = smoothstep(0.04, 0.34, tDown);
    const hipSwell =
      Math.sin(clamp01(tDown / 0.74) * Math.PI) * 0.85 +
      smoothstep(0.0, 0.32, tDown) * (1.0 - smoothstep(0.58, 1.0, tDown)) * 0.35;
    const lowerSheathSpan = smoothstep(0.18, 0.85, tDown);
    const kneeTaper = smoothstep(0.70, 1.0, tDown);

    // Fitted at waist (0.112m), generous over hips/thighs (0.182m), sleek midi knee hem (0.170m)
    const rx =
      0.112 -
      0.012 * topWaistSeal +
      0.042 * hipCurve +
      0.038 * hipSwell +
      0.026 * lowerSheathSpan -
      0.006 * kneeTaper;
    const rzFront =
      0.096 -
      0.010 * topWaistSeal +
      0.032 * hipCurve +
      0.028 * hipSwell +
      0.018 * lowerSheathSpan -
      0.005 * kneeTaper;
    const rzBack =
      0.086 -
      0.008 * topWaistSeal +
      0.038 * hipCurve +
      0.038 * hipSwell +
      0.020 * lowerSheathSpan -
      0.006 * kneeTaper;
    const rz = uz >= 0 ? rzFront : rzBack;
    const zCenterShift =
      0.008 * (1.0 - smoothstep(0.0, 0.42, tDown)) - 0.006 * hipSwell;

    pPos.setX(i, ux * rx);
    pPos.setZ(i, uz * rz + zCenterShift);
    if (pUv) {
      pUv.setXY(
        i,
        clamp01(0.5 + ux * 0.36),
        clamp01(0.96 - tDown * 0.92)
      );
    }
  }
  pencilGeo.computeVertexNormals();
  const pencilSkirtMesh = new THREE.Mesh(pencilGeo, bottomMat);
  pencilSkirtMesh.position.set(0, -0.175, 0.0);
  pencilSkirtMesh.castShadow = true;
  pencilSkirtMesh.receiveShadow = true;
  pencilSkirtMesh.visible = false;
  hipsBone.add(pencilSkirtMesh);

  return {
    bodySkinMesh: primaryBodySkin,
    baseBodyPos,
    baseBodyNorm,
    baseBodyAnatWeights,
    topMesh: primaryTop,
    baseTopPos,
    baseTopNorm,
    baseTopAnatWeights,
    topShaderUniforms,
    outerwearSkinnedMesh,
    baseOuterPos,
    baseOuterNorm,
    baseOuterAnatWeights,
    outerShaderUniforms,
    bottomMesh: primaryBottom,
    baseBottomPos,
    baseBottomNorm,
    baseBottomAnatWeights,
    bottomShaderUniforms,
    footwearMesh: primaryFootwear,
    baseFootwearPos,
    baseFootwearNorm,
    footwearShaderUniforms,
    landmarks,
    footBounds,
    appliedBodyMorphKey: null,
    appliedTopStyle: null,
    appliedOuterStyle: null,
    appliedBottomStyle: null,
    appliedFootwearStyle: null,
    blouseBowGroup,
    trenchOpenHemMesh,
    blazerTailMesh,
    peplumWaistMesh,
    alineSkirtMesh,
    maxiSkirtMesh,
    pencilSkirtMesh,
  };
}

function classifyAndPrepareSkinnedMeshes(
  rootObj: THREE.Object3D
): {
  bonesByName: Map<string, THREE.Bone>;
  skinMeshes: THREE.SkinnedMesh[];
  eyeMeshes: THREE.SkinnedMesh[];
  teethMeshes: THREE.SkinnedMesh[];
  hairMeshes: THREE.SkinnedMesh[];
  topMeshes: THREE.SkinnedMesh[];
  bottomMeshes: THREE.SkinnedMesh[];
  footwearMeshes: THREE.SkinnedMesh[];
} {
  const bonesByName = new Map<string, THREE.Bone>();
  const skinMeshes: THREE.SkinnedMesh[] = [];
  const eyeMeshes: THREE.SkinnedMesh[] = [];
  const teethMeshes: THREE.SkinnedMesh[] = [];
  const hairMeshes: THREE.SkinnedMesh[] = [];
  const topMeshes: THREE.SkinnedMesh[] = [];
  const bottomMeshes: THREE.SkinnedMesh[] = [];
  const footwearMeshes: THREE.SkinnedMesh[] = [];

  rootObj.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      bonesByName.set(child.name, child as THREE.Bone);
    }
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
      const mesh = child as THREE.SkinnedMesh;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;

      if (mesh.material) {
        const origMat = mesh.material as THREE.MeshStandardMaterial;
        const clonedMat = origMat.clone();
        clonedMat.normalMap = null;
        clonedMat.roughnessMap = null;
        clonedMat.metalnessMap = null;
        clonedMat.aoMap = null;
        clonedMat.userData = {
          origMap: origMat.map || null,
          origColor: origMat.color
            ? origMat.color.clone()
            : new THREE.Color('#FFFFFF'),
          origRoughness: origMat.roughness ?? 0.7,
          origMetalness: origMat.metalness ?? 0.0,
        };
        mesh.material = clonedMat;
      }

      const matName =
        ((mesh.material as THREE.Material)?.name || '').toLowerCase();
      const fullKey = `${mesh.name.toLowerCase()} ${matName}`;

      if (fullKey.includes('eye')) {
        mesh.userData.jointId = 'head';
        eyeMeshes.push(mesh);
      } else if (fullKey.includes('teeth')) {
        mesh.userData.jointId = 'head';
        teethMeshes.push(mesh);
      } else if (
        fullKey.includes('hair') ||
        fullKey.includes('headwear') ||
        fullKey.includes('beard')
      ) {
        mesh.userData.jointId = 'head';
        hairMeshes.push(mesh);
      } else if (fullKey.includes('outfit_top')) {
        mesh.userData.jointId = 'chest';
        topMeshes.push(mesh);
      } else if (fullKey.includes('outfit_bottom')) {
        mesh.userData.jointId = 'pelvis';
        bottomMeshes.push(mesh);
      } else if (
        fullKey.includes('outfit_footwear') ||
        fullKey.includes('aleksandr')
      ) {
        mesh.userData.jointId = 'leftAnkle';
        footwearMeshes.push(mesh);
      } else if (
        fullKey.includes('head') ||
        fullKey.includes('skin') ||
        fullKey.includes('body')
      ) {
        mesh.userData.jointId = fullKey.includes('head') ? 'head' : 'chest';
        skinMeshes.push(mesh);
      }
    }
  });

  return {
    bonesByName,
    skinMeshes,
    eyeMeshes,
    teethMeshes,
    hairMeshes,
    topMeshes,
    bottomMeshes,
    footwearMeshes,
  };
}

function applyStyledGarmentToMeshes(
  meshes: THREE.SkinnedMesh[],
  colorHex: string,
  secondaryColorHex: string | undefined,
  fabric: FabricType | null,
  styleTag: string,
  weavePattern: GarmentWeavePattern | undefined,
  visible: boolean,
  minLum = 142,
  lumRange = 113
) {
  const fabMeta = fabric ? FABRIC_LIBRARY[fabric] : null;
  const bumpTex = fabric ? getFabricBumpTexture(fabric) : null;

  meshes.forEach((mesh) => {
    mesh.visible = visible;
    if (!visible) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat) return;

    const prevHasMap = Boolean(mat.map);
    const prevHasBump = Boolean(mat.bumpMap);

    const origMap = mat.userData?.origMap as THREE.Texture | null;
    if (origMap) {
      mat.map = getStyledGarmentTexture(
        origMap,
        colorHex,
        secondaryColorHex,
        fabric,
        styleTag,
        weavePattern,
        minLum,
        lumRange
      );
      mat.color.set('#FFFFFF');
    } else {
      mat.color.set(colorHex);
    }

    if (fabMeta) {
      mat.roughness = fabMeta.roughness;
      mat.metalness = fabMeta.metalness;
      // Keep envMapIntensity matched with Wolf3D_Body (1.05) on top/bottom meshes so bare skin cutouts
      // have 100% identical environment reflection to the neck/arms, while outer jackets keep full sheen.
      mat.envMapIntensity = styleTag.startsWith('outer_')
        ? fabric === 'silk'
          ? 2.0
          : fabric === 'leather'
            ? 2.2
            : 1.05
        : 1.05;
      if (bumpTex) {
        mat.bumpMap = bumpTex;
        mat.bumpScale = fabMeta.normalScale * 0.015;
      }
    }
    if (
      prevHasMap !== Boolean(mat.map) ||
      prevHasBump !== Boolean(mat.bumpMap)
    ) {
      mat.needsUpdate = true;
    }
  });
}

function createAccessoryRigSystem(
  scene: THREE.Group,
  headBone: THREE.Bone,
  eyeLocalPos: THREE.Vector3,
  isMale: boolean
): AccessoryRigSystem {
  // Shared PBR Materials for 3D Accessories
  const sunglassesFrameMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1E293B'),
    roughness: 0.18,
    metalness: 0.78,
    envMapIntensity: 1.45,
  });
  const sunglassesLensMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0F172A'),
    roughness: 0.04,
    metalness: 0.32,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    reflectivity: 0.95,
    envMapIntensity: 1.65,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
  });

  const watchCaseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D4AF37'),
    roughness: 0.14,
    metalness: 0.94,
    envMapIntensity: 1.6,
  });
  const watchStrapMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#4A2C1D'),
    roughness: 0.42,
    metalness: 0.14,
    bumpMap: getFabricBumpTexture('leather'),
    bumpScale: 0.0035,
    envMapIntensity: 1.15,
  });
  const watchDialMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0F172A'),
    roughness: 0.16,
    metalness: 0.48,
    envMapIntensity: 1.35,
  });

  const handbagLeatherMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1E293B'),
    roughness: 0.36,
    metalness: 0.1,
    bumpMap: getFabricBumpTexture('leather'),
    bumpScale: 0.0055,
    envMapIntensity: 1.25,
  });
  const handbagHardwareMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D4AF37'),
    roughness: 0.13,
    metalness: 0.95,
    envMapIntensity: 1.65,
  });

  // ============================================================================
  // 1. 3D SUNGLASSES SYSTEM (Parented directly to `Head` Bone)
  // ============================================================================
  const sunglassesRoot = new THREE.Group();
  sunglassesRoot.name = 'AccessorySunglassesRoot';
  sunglassesRoot.visible = false;
  headBone.add(sunglassesRoot);

  const buildTempleArms = (
    parent: THREE.Group,
    halfSpanX: number,
    yHinge: number,
    thickness: number
  ) => {
    [-1, 1].forEach((side) => {
      // Metallic hinge bracket & pin
      const hingeGeo = new THREE.BoxGeometry(0.0045, 0.0052, 0.0068);
      const hinge = new THREE.Mesh(hingeGeo, watchCaseMat);
      hinge.position.set(side * halfSpanX, yHinge, -0.002);
      parent.add(hinge);

      // Anatomical nose pad resting gently against the nose bridge
      const padGeo = new THREE.SphereGeometry(0.0032, 8, 8);
      padGeo.scale(0.65, 1.35, 0.45);
      const pad = new THREE.Mesh(padGeo, watchCaseMat);
      pad.position.set(side * 0.0085, -0.002, -0.0045);
      pad.rotation.y = side * 0.35;
      parent.add(pad);

      // Unfolded wearable 3D temple arm extending back to ear + anatomical ear-hook curve
      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * halfSpanX, yHinge, -0.002),
        new THREE.Vector3(side * (halfSpanX + 0.005), yHinge + 0.002, -0.052),
        new THREE.Vector3(side * (halfSpanX + 0.003), yHinge + 0.001, -0.098),
        new THREE.Vector3(side * (halfSpanX - 0.002), yHinge - 0.016, -0.119),
      ]);
      const armGeo = new THREE.TubeGeometry(armCurve, 20, thickness, 10, false);
      parent.add(new THREE.Mesh(armGeo, sunglassesFrameMat));
    });
  };

  // Style 1: Classic Aviator
  const aviatorGroup = new THREE.Group();
  {
    const eyeSep = isMale ? 0.033 : 0.030;
    [-1, 1].forEach((side) => {
      const rimGeo = new THREE.TorusGeometry(0.022, 0.0018, 10, 28);
      rimGeo.scale(1.12, 0.94, 1.0);
      const rim = new THREE.Mesh(rimGeo, sunglassesFrameMat);
      rim.position.set(side * eyeSep, -0.002, 0);
      rim.rotation.z = side * -0.12;
      aviatorGroup.add(rim);

      const lensGeo = new THREE.CylinderGeometry(0.0215, 0.0215, 0.0018, 24);
      lensGeo.rotateX(Math.PI / 2);
      lensGeo.scale(1.12, 0.94, 1.0);
      const lens = new THREE.Mesh(lensGeo, sunglassesLensMat);
      lens.position.set(side * eyeSep, -0.002, 0.0005);
      lens.rotation.z = side * -0.12;
      aviatorGroup.add(lens);
    });
    // Double pilot bridge
    const topBarGeo = new THREE.CylinderGeometry(0.0012, 0.0012, eyeSep * 1.4, 8);
    topBarGeo.rotateZ(Math.PI / 2);
    const topBar = new THREE.Mesh(topBarGeo, sunglassesFrameMat);
    topBar.position.set(0, 0.014, 0.001);
    aviatorGroup.add(topBar);

    const midBarGeo = new THREE.CylinderGeometry(0.0014, 0.0014, 0.018, 8);
    midBarGeo.rotateZ(Math.PI / 2);
    const midBar = new THREE.Mesh(midBarGeo, sunglassesFrameMat);
    midBar.position.set(0, 0.005, 0.002);
    aviatorGroup.add(midBar);

    buildTempleArms(aviatorGroup, eyeSep + 0.024, 0.008, 0.0016);
  }
  sunglassesRoot.add(aviatorGroup);

  // Style 2: Retro Cat-Eye
  const catEyeGroup = new THREE.Group();
  {
    const eyeSep = isMale ? 0.033 : 0.030;
    [-1, 1].forEach((side) => {
      const rimGeo = new THREE.TorusGeometry(0.021, 0.0038, 12, 28);
      rimGeo.scale(1.22, 0.82, 0.95);
      const pos = rimGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        // Upswept outer cat-eye wing corner
        if (vx * side > 0.008 && vy > 0) {
          const wing = (vx * side - 0.008) * 0.55;
          pos.setY(i, vy + wing);
          pos.setX(i, vx + side * wing * 0.35);
        }
      }
      rimGeo.computeVertexNormals();
      const rim = new THREE.Mesh(rimGeo, sunglassesFrameMat);
      rim.position.set(side * eyeSep, 0.0, 0);
      catEyeGroup.add(rim);

      const lensGeo = new THREE.CylinderGeometry(0.0195, 0.0195, 0.002, 24);
      lensGeo.rotateX(Math.PI / 2);
      lensGeo.scale(1.18, 0.80, 1.0);
      const lens = new THREE.Mesh(lensGeo, sunglassesLensMat);
      lens.position.set(side * eyeSep, 0.001, 0.0005);
      lens.rotation.z = side * 0.16;
      catEyeGroup.add(lens);
    });
    const bridgeGeo = new THREE.BoxGeometry(0.016, 0.0045, 0.0045);
    const bridge = new THREE.Mesh(bridgeGeo, sunglassesFrameMat);
    bridge.position.set(0, 0.006, 0.001);
    catEyeGroup.add(bridge);

    buildTempleArms(catEyeGroup, eyeSep + 0.026, 0.010, 0.0028);
  }
  sunglassesRoot.add(catEyeGroup);

  // Style 3: Oversized Square
  const oversizedSquareGroup = new THREE.Group();
  {
    const eyeSep = isMale ? 0.034 : 0.031;
    [-1, 1].forEach((side) => {
      // Outer thick square frame border (4 bars per eye)
      const w = 0.048;
      const h = 0.040;
      const t = 0.0042;
      const topB = new THREE.Mesh(
        new THREE.BoxGeometry(w, t, 0.005),
        sunglassesFrameMat
      );
      topB.position.set(side * eyeSep, h / 2 - t / 2, 0);
      oversizedSquareGroup.add(topB);

      const botB = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.94, t * 0.85, 0.0045),
        sunglassesFrameMat
      );
      botB.position.set(side * eyeSep, -h / 2 + t / 2, 0);
      oversizedSquareGroup.add(botB);

      const inB = new THREE.Mesh(
        new THREE.BoxGeometry(t, h, 0.0045),
        sunglassesFrameMat
      );
      inB.position.set(side * (eyeSep - w / 2 + t / 2), 0, 0);
      oversizedSquareGroup.add(inB);

      const outB = new THREE.Mesh(
        new THREE.BoxGeometry(t * 1.15, h, 0.005),
        sunglassesFrameMat
      );
      outB.position.set(side * (eyeSep + w / 2 - t / 2), 0, 0);
      oversizedSquareGroup.add(outB);

      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(w - t * 1.6, h - t * 1.6, 0.002),
        sunglassesLensMat
      );
      lens.position.set(side * eyeSep, 0, 0.0005);
      oversizedSquareGroup.add(lens);
    });
    const flatTopBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.0055, 0.0055),
      sunglassesFrameMat
    );
    flatTopBar.position.set(0, 0.016, 0.001);
    oversizedSquareGroup.add(flatTopBar);

    buildTempleArms(oversizedSquareGroup, eyeSep + 0.024, 0.012, 0.0034);
  }
  sunglassesRoot.add(oversizedSquareGroup);

  // Style 4: Cyber Shield Sport Visor
  const cyberShieldGroup = new THREE.Group();
  {
    const visorRadius = isMale ? 0.072 : 0.068;
    const visorArc = Math.PI * 0.56;
    const shieldGeo = new THREE.CylinderGeometry(
      visorRadius,
      visorRadius * 0.98,
      0.036,
      32,
      1,
      true,
      -visorArc / 2,
      visorArc
    );
    const shieldLens = new THREE.Mesh(shieldGeo, sunglassesLensMat);
    shieldLens.position.set(0, 0.002, -visorRadius + 0.015);
    cyberShieldGroup.add(shieldLens);

    const browBarGeo = new THREE.CylinderGeometry(
      visorRadius + 0.0018,
      visorRadius + 0.0018,
      0.0055,
      32,
      1,
      true,
      -visorArc / 2,
      visorArc
    );
    const browBar = new THREE.Mesh(browBarGeo, sunglassesFrameMat);
    browBar.position.set(0, 0.019, -visorRadius + 0.015);
    cyberShieldGroup.add(browBar);

    buildTempleArms(cyberShieldGroup, isMale ? 0.056 : 0.052, 0.012, 0.003);
  }
  sunglassesRoot.add(cyberShieldGroup);

  // Style 5: Vintage Round Metal
  const vintageRoundGroup = new THREE.Group();
  {
    const eyeSep = isMale ? 0.031 : 0.0285;
    [-1, 1].forEach((side) => {
      const rimGeo = new THREE.TorusGeometry(0.0185, 0.0016, 10, 28);
      const rim = new THREE.Mesh(rimGeo, sunglassesFrameMat);
      rim.position.set(side * eyeSep, 0, 0);
      vintageRoundGroup.add(rim);

      const lensGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.0018, 24);
      lensGeo.rotateX(Math.PI / 2);
      const lens = new THREE.Mesh(lensGeo, sunglassesLensMat);
      lens.position.set(side * eyeSep, 0, 0.0004);
      vintageRoundGroup.add(lens);
    });
    const archBridgeGeo = new THREE.TorusGeometry(0.011, 0.0015, 8, 16, Math.PI);
    const archBridge = new THREE.Mesh(archBridgeGeo, sunglassesFrameMat);
    archBridge.position.set(0, 0.002, 0.001);
    vintageRoundGroup.add(archBridge);

    buildTempleArms(vintageRoundGroup, eyeSep + 0.019, 0.004, 0.0015);
  }
  sunglassesRoot.add(vintageRoundGroup);

  // ============================================================================
  // 2. 3D WRISTWATCH SYSTEM (Dynamically aligned to Left/Right Wrist in Scene)
  // ============================================================================
  const watchRoot = new THREE.Group();
  watchRoot.name = 'AccessoryWatchRoot';
  watchRoot.visible = false;
  scene.add(watchRoot);

  // Local watch coordinate space:
  // Y = along forearm axis toward hand, Z = dorsal wrist outward normal, X = across wrist width
  const buildWatchBand = (
    parent: THREE.Group,
    bandWidth: number,
    isMetalLink: boolean
  ) => {
    const strapGeo = new THREE.CylinderGeometry(
      0.0285,
      0.0295,
      bandWidth,
      28,
      1,
      true
    );
    strapGeo.scale(1.16, 1.0, 0.84);
    const strapMesh = new THREE.Mesh(
      strapGeo,
      isMetalLink ? watchStrapMat : watchStrapMat
    );
    parent.add(strapMesh);

    const innerRimGeo = new THREE.TorusGeometry(0.0285, 0.0028, 10, 28);
    innerRimGeo.rotateX(Math.PI / 2);
    innerRimGeo.scale(1.16, 1.0, 0.84);
    [-bandWidth * 0.45, bandWidth * 0.45].forEach((yOff) => {
      const edgeRing = new THREE.Mesh(innerRimGeo, watchStrapMat);
      edgeRing.position.y = yOff;
      parent.add(edgeRing);
    });

    // Clasp buckle on underside (-Z)
    const clasp = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, bandWidth * 1.05, 0.0035),
      watchCaseMat
    );
    clasp.position.set(0, 0, -0.0245);
    parent.add(clasp);
  };

  const addWatchHandsAndCrown = (
    parent: THREE.Group,
    dialZ: number,
    handLen: number,
    caseRadiusX: number
  ) => {
    const hourHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.0016, handLen * 0.68, 0.001),
      watchCaseMat
    );
    hourHand.position.set(-handLen * 0.18, handLen * 0.18, dialZ + 0.001);
    hourHand.rotation.z = 0.78;
    parent.add(hourHand);

    const minHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.0012, handLen * 0.95, 0.001),
      watchCaseMat
    );
    minHand.position.set(handLen * 0.25, handLen * 0.22, dialZ + 0.0014);
    minHand.rotation.z = -0.65;
    parent.add(minHand);

    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0024, 0.0024, 0.004, 12),
      watchCaseMat
    );
    crown.rotation.z = Math.PI / 2;
    crown.position.set(caseRadiusX + 0.0018, 0, dialZ - 0.002);
    parent.add(crown);
  };

  // Watch 1: Luxury Chronograph
  const chronoWatchGroup = new THREE.Group();
  {
    buildWatchBand(chronoWatchGroup, 0.018, true);
    const caseGeo = new THREE.CylinderGeometry(0.0195, 0.0195, 0.0075, 28);
    caseGeo.rotateX(Math.PI / 2);
    const caseMesh = new THREE.Mesh(caseGeo, watchCaseMat);
    caseMesh.position.set(0, 0, 0.0245);
    chronoWatchGroup.add(caseMesh);

    const dialGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.0015, 24);
    dialGeo.rotateX(Math.PI / 2);
    const dialMesh = new THREE.Mesh(dialGeo, watchDialMat);
    dialMesh.position.set(0, 0, 0.0282);
    chronoWatchGroup.add(dialMesh);

    // Lugs
    [-0.011, 0.011].forEach((lx) => {
      const lug = new THREE.Mesh(
        new THREE.BoxGeometry(0.0035, 0.044, 0.005),
        watchCaseMat
      );
      lug.position.set(lx, 0, 0.023);
      chronoWatchGroup.add(lug);
    });

    addWatchHandsAndCrown(chronoWatchGroup, 0.0285, 0.012, 0.0195);
  }
  watchRoot.add(chronoWatchGroup);

  // Watch 2: Minimal Dress Watch
  const dressWatchGroup = new THREE.Group();
  {
    buildWatchBand(dressWatchGroup, 0.014, false);
    const caseGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.0048, 28);
    caseGeo.rotateX(Math.PI / 2);
    const caseMesh = new THREE.Mesh(caseGeo, watchCaseMat);
    caseMesh.position.set(0, 0, 0.024);
    dressWatchGroup.add(caseMesh);

    const whiteDialMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FAF9F6'),
      roughness: 0.22,
      metalness: 0.1,
    });
    const dialGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.0012, 24);
    dialGeo.rotateX(Math.PI / 2);
    const dialMesh = new THREE.Mesh(dialGeo, whiteDialMat);
    dialMesh.position.set(0, 0, 0.0264);
    dressWatchGroup.add(dialMesh);

    addWatchHandsAndCrown(dressWatchGroup, 0.0268, 0.011, 0.017);
  }
  watchRoot.add(dressWatchGroup);

  // Watch 3: Smart Watch Ultra (Square Rounded Titanium Case)
  const smartWatchGroup = new THREE.Group();
  {
    buildWatchBand(smartWatchGroup, 0.019, false);
    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.039, 0.0082),
      watchCaseMat
    );
    caseMesh.position.set(0, 0, 0.0248);
    smartWatchGroup.add(caseMesh);

    const oledScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.029, 0.034, 0.0016),
      sunglassesLensMat
    );
    oledScreen.position.set(0, 0, 0.0288);
    smartWatchGroup.add(oledScreen);

    addWatchHandsAndCrown(smartWatchGroup, 0.029, 0.011, 0.017);
  }
  watchRoot.add(smartWatchGroup);

  // Watch 4: Vintage Gold Tank (Rectangular Case)
  const tankWatchGroup = new THREE.Group();
  {
    buildWatchBand(tankWatchGroup, 0.013, false);
    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.033, 0.0052),
      watchCaseMat
    );
    caseMesh.position.set(0, 0, 0.0242);
    tankWatchGroup.add(caseMesh);

    const creamDialMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F5F2EB'),
      roughness: 0.25,
      metalness: 0.08,
    });
    const dialMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.026, 0.0014),
      creamDialMat
    );
    dialMesh.position.set(0, 0, 0.0268);
    tankWatchGroup.add(dialMesh);

    addWatchHandsAndCrown(tankWatchGroup, 0.0272, 0.009, 0.012);
  }
  watchRoot.add(tankWatchGroup);

  // ============================================================================
  // 3. 3D HANDBAG SYSTEM (Origin at Handle Apex for Natural Gravity Hang)
  // ============================================================================
  const handbagRoot = new THREE.Group();
  handbagRoot.name = 'AccessoryHandbagRoot';
  handbagRoot.visible = false;
  scene.add(handbagRoot);

  const handbagBodyPivot = new THREE.Group();
  handbagRoot.add(handbagBodyPivot);

  const handbagShoulderStraps: THREE.Group[] = [];
  const handbagTopHandles: THREE.Group[] = [];

  const createHandleAndShoulderStrap = (
    bagGroup: THREE.Group,
    handleSpanX: number,
    handleDropY: number,
    bagTopY: number,
    isChainStrap: boolean
  ) => {
    // 1. Short arched top handle (for hand_held & crook_of_arm)
    // Apex of handle is at y = 0, connecting down to bag top at y = bagTopY
    const topHandleGrp = new THREE.Group();
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-handleSpanX, bagTopY, 0),
      new THREE.Vector3(-handleSpanX * 0.85, -handleDropY * 0.35, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(handleSpanX * 0.85, -handleDropY * 0.35, 0),
      new THREE.Vector3(handleSpanX, bagTopY, 0),
    ]);
    const handleGeo = new THREE.TubeGeometry(
      handleCurve,
      24,
      0.0055,
      10,
      false
    );
    topHandleGrp.add(new THREE.Mesh(handleGeo, handbagLeatherMat));

    // Hardware D-rings at handle bases
    [-handleSpanX, handleSpanX].forEach((hx) => {
      const ringGeo = new THREE.TorusGeometry(0.0085, 0.0022, 8, 18);
      const ring = new THREE.Mesh(ringGeo, handbagHardwareMat);
      ring.position.set(hx, bagTopY + 0.006, 0);
      bagGroup.add(ring);
    });
    bagGroup.add(topHandleGrp);
    handbagTopHandles.push(topHandleGrp);

    // 2. Long shoulder strap (shown when carryMode === 'shoulder_bag')
    // Apex at y = +0.34 (resting on shoulder) down to bag top at y = bagTopY
    const shoulderStrapGrp = new THREE.Group();
    const longCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-handleSpanX * 1.15, bagTopY, 0),
      new THREE.Vector3(-handleSpanX * 0.9, bagTopY + 0.22, 0.012),
      new THREE.Vector3(0, bagTopY + 0.44, 0),
      new THREE.Vector3(handleSpanX * 0.9, bagTopY + 0.22, -0.012),
      new THREE.Vector3(handleSpanX * 1.15, bagTopY, 0),
    ]);
    const longGeo = new THREE.TubeGeometry(
      longCurve,
      32,
      isChainStrap ? 0.0045 : 0.0065,
      10,
      false
    );
    shoulderStrapGrp.add(
      new THREE.Mesh(
        longGeo,
        isChainStrap ? handbagHardwareMat : handbagLeatherMat
      )
    );
    shoulderStrapGrp.visible = false;
    bagGroup.add(shoulderStrapGrp);
    handbagShoulderStraps.push(shoulderStrapGrp);
  };

  // Bag 1: Paris Saddle Bag
  const saddleBagGroup = new THREE.Group();
  {
    const bagTopY = -0.095;
    createHandleAndShoulderStrap(
      saddleBagGroup,
      0.075,
      0.095,
      bagTopY,
      false
    );

    // Sculpted asymmetric kidney/saddle body
    const bodyGeo = new THREE.CylinderGeometry(0.105, 0.095, 0.062, 32);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.scale(1.18, 0.82, 1.0);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      // Asymmetric saddle dip & lower curve sweep
      const dip = vx * 0.22 - Math.cos((vx / 0.12) * Math.PI) * 0.018;
      pos.setY(i, vy + dip);
    }
    bodyGeo.computeVertexNormals();
    const bodyMesh = new THREE.Mesh(bodyGeo, handbagLeatherMat);
    bodyMesh.position.set(0, bagTopY - 0.072, 0);
    saddleBagGroup.add(bodyMesh);

    // Front flap + Iconic D-Stirrup Hardware Clasp
    const stirrupRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.016, 0.0035, 10, 24),
      handbagHardwareMat
    );
    stirrupRing.position.set(0.012, bagTopY - 0.078, 0.034);
    saddleBagGroup.add(stirrupRing);

    const strapTab = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.042, 0.006),
      handbagLeatherMat
    );
    strapTab.position.set(0.012, bagTopY - 0.048, 0.032);
    saddleBagGroup.add(strapTab);
  }
  handbagBodyPivot.add(saddleBagGroup);

  // Bag 2: Structured Leather Tote
  const structuredToteGroup = new THREE.Group();
  {
    const bagTopY = -0.105;
    createHandleAndShoulderStrap(
      structuredToteGroup,
      0.068,
      0.105,
      bagTopY,
      false
    );

    // Architectural trapezoidal tote body
    const toteW = 0.25;
    const toteH = 0.21;
    const toteD = 0.092;
    const toteGeo = new THREE.BoxGeometry(toteW, toteH, toteD, 8, 8, 4);
    const tPos = toteGeo.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
      const vy = tPos.getY(i);
      const tNorm = (vy + toteH / 2) / toteH; // 0 = bottom, 1 = top
      const flare = 0.92 + tNorm * 0.14;
      tPos.setX(i, tPos.getX(i) * flare);
    }
    toteGeo.computeVertexNormals();
    const toteMesh = new THREE.Mesh(toteGeo, handbagLeatherMat);
    toteMesh.position.set(0, bagTopY - toteH / 2 + 0.008, 0);
    structuredToteGroup.add(toteMesh);

    // Top metallic zipper trim & hanging leather clochette charm
    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(toteW * 1.02, 0.008, toteD * 0.85),
      handbagHardwareMat
    );
    topTrim.position.set(0, bagTopY + 0.004, 0);
    structuredToteGroup.add(topTrim);

    const charm = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.036, 0.008),
      handbagHardwareMat
    );
    charm.position.set(0.055, bagTopY - 0.038, toteD / 2 + 0.004);
    charm.rotation.z = -0.22;
    structuredToteGroup.add(charm);
  }
  handbagBodyPivot.add(structuredToteGroup);

  // Bag 3: Quilted Chain Flap Bag
  const quiltedFlapGroup = new THREE.Group();
  {
    const bagTopY = -0.092;
    createHandleAndShoulderStrap(
      quiltedFlapGroup,
      0.072,
      0.092,
      bagTopY,
      true
    );

    const flapW = 0.215;
    const flapH = 0.135;
    const flapD = 0.068;
    const bodyGeo = new THREE.BoxGeometry(flapW, flapH, flapD, 16, 12, 6);
    const qPos = bodyGeo.attributes.position;
    for (let i = 0; i < qPos.count; i++) {
      const vx = qPos.getX(i);
      const vy = qPos.getY(i);
      const vz = qPos.getZ(i);
      // Diamond quilted puff relief on front and back faces
      if (Math.abs(vz) > flapD * 0.45) {
        const quilt =
          Math.abs(Math.sin((vx + vy) * 95) * Math.sin((vx - vy) * 95)) *
          0.0038;
        qPos.setZ(i, vz + Math.sign(vz) * quilt);
      }
    }
    bodyGeo.computeVertexNormals();
    const bodyMesh = new THREE.Mesh(bodyGeo, handbagLeatherMat);
    bodyMesh.position.set(0, bagTopY - flapH / 2 + 0.006, 0);
    quiltedFlapGroup.add(bodyMesh);

    // Front envelope flap border + Turn-lock double-ring clasp
    const flapLip = new THREE.Mesh(
      new THREE.BoxGeometry(flapW * 1.01, flapH * 0.56, flapD * 1.04),
      handbagLeatherMat
    );
    flapLip.position.set(0, bagTopY - flapH * 0.26, 0.002);
    quiltedFlapGroup.add(flapLip);

    const turnLockPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.018, 0.008),
      handbagHardwareMat
    );
    turnLockPlate.position.set(0, bagTopY - flapH * 0.52, flapD / 2 + 0.004);
    quiltedFlapGroup.add(turnLockPlate);
  }
  handbagBodyPivot.add(quiltedFlapGroup);

  // Bag 4: Mini Top-Handle Kelly Bag
  const miniTopHandleGroup = new THREE.Group();
  {
    const bagTopY = -0.082;
    createHandleAndShoulderStrap(
      miniTopHandleGroup,
      0.048,
      0.082,
      bagTopY,
      false
    );

    const miniW = 0.175;
    const miniH = 0.135;
    const miniD = 0.072;
    const miniGeo = new THREE.BoxGeometry(miniW, miniH, miniD, 8, 8, 4);
    const mPos = miniGeo.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      const vy = mPos.getY(i);
      const tNorm = (vy + miniH / 2) / miniH; // 0 = wider base, 1 = tapered top
      const taper = 1.06 - tNorm * 0.18;
      mPos.setX(i, mPos.getX(i) * taper);
      mPos.setZ(i, mPos.getZ(i) * (1.04 - tNorm * 0.14));
    }
    miniGeo.computeVertexNormals();
    const miniMesh = new THREE.Mesh(miniGeo, handbagLeatherMat);
    miniMesh.position.set(0, bagTopY - miniH / 2 + 0.006, 0);
    miniTopHandleGroup.add(miniMesh);

    // Kelly belt sangle strap & central gold padlock touret
    const beltBar = new THREE.Mesh(
      new THREE.BoxGeometry(miniW * 0.96, 0.014, miniD * 0.98),
      handbagLeatherMat
    );
    beltBar.position.set(0, bagTopY - 0.028, 0.003);
    miniTopHandleGroup.add(beltBar);

    const goldLock = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.024, 0.010),
      handbagHardwareMat
    );
    goldLock.position.set(0, bagTopY - 0.032, miniD / 2 + 0.004);
    miniTopHandleGroup.add(goldLock);
  }
  handbagBodyPivot.add(miniTopHandleGroup);

  // Bag 5: Crossbody / Shoulder Messenger Bag
  const messengerBagGroup = new THREE.Group();
  {
    const bagTopY = -0.095;
    createHandleAndShoulderStrap(
      messengerBagGroup,
      0.088,
      0.095,
      bagTopY,
      false
    );

    const msgW = 0.245;
    const msgH = 0.175;
    const msgD = 0.078;
    const msgBody = new THREE.Mesh(
      new THREE.BoxGeometry(msgW, msgH, msgD),
      handbagLeatherMat
    );
    msgBody.position.set(0, bagTopY - msgH / 2 + 0.005, 0);
    messengerBagGroup.add(msgBody);

    // Messenger front flap with twin buckle straps
    const msgFlap = new THREE.Mesh(
      new THREE.BoxGeometry(msgW * 1.02, msgH * 0.68, msgD * 1.05),
      handbagLeatherMat
    );
    msgFlap.position.set(0, bagTopY - msgH * 0.32, 0.002);
    messengerBagGroup.add(msgFlap);

    [-0.065, 0.065].forEach((bx) => {
      const buckleStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, msgH * 0.78, 0.008),
        handbagHardwareMat
      );
      buckleStrap.position.set(bx, bagTopY - msgH * 0.42, msgD / 2 + 0.004);
      messengerBagGroup.add(buckleStrap);
    });
  }
  handbagBodyPivot.add(messengerBagGroup);

  // Style 6: Pro Basketball (`pro_basketball`) — 3D Textured Basketball with 8-Panel Black Seam Ribs
  const basketballGroup = new THREE.Group();
  {
    const ballR = 0.116;
    const ballCenterY = -0.105;
    const ballSphere = new THREE.Mesh(
      new THREE.SphereGeometry(ballR, 32, 28),
      handbagLeatherMat
    );
    ballSphere.position.set(0, ballCenterY, 0.018);
    basketballGroup.add(ballSphere);

    // 4 Intersecting 3D Black Rubber Seam Ribs (Equatorial, Meridional & 2 Curved Side Channels)
    const ribMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#111827'),
      roughness: 0.72,
      metalness: 0.05,
    });
    const eqRib = new THREE.Mesh(
      new THREE.TorusGeometry(ballR + 0.0008, 0.0026, 8, 48),
      ribMat
    );
    eqRib.position.set(0, ballCenterY, 0.018);
    basketballGroup.add(eqRib);

    const merRib1 = eqRib.clone();
    merRib1.rotation.y = Math.PI / 2;
    basketballGroup.add(merRib1);

    const merRib2 = eqRib.clone();
    merRib2.rotation.x = Math.PI / 2;
    basketballGroup.add(merRib2);

    [-1, 1].forEach((s) => {
      const sideSeam = new THREE.Mesh(
        new THREE.TorusGeometry(ballR * 0.84, 0.0024, 8, 40),
        ribMat
      );
      sideSeam.position.set(s * ballR * 0.53, ballCenterY, 0.018);
      sideSeam.rotation.y = Math.PI / 2;
      basketballGroup.add(sideSeam);
    });
  }
  handbagBodyPivot.add(basketballGroup);

  // Style 7: Designer Plush Bear / Bunny Art Toy (`art_toy_plush`) — Cute 3D Collectible Art Toy held in hand
  const artToyGroup = new THREE.Group();
  {
    const plushEyeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0F172A'),
      roughness: 0.08,
      metalness: 0.35,
    });
    // Top carry loop at y = 0 (hand grip)
    const ringGeo = new THREE.TorusGeometry(0.024, 0.0045, 10, 24);
    const ring = new THREE.Mesh(ringGeo, handbagHardwareMat);
    ring.position.set(0, -0.018, 0);
    artToyGroup.add(ring);

    // Toy Head (y = -0.095)
    const headGeo = new THREE.SphereGeometry(0.058, 28, 24);
    headGeo.scale(1.08, 0.96, 0.94);
    const toyHead = new THREE.Mesh(headGeo, handbagLeatherMat);
    toyHead.position.set(0, -0.095, 0.008);
    artToyGroup.add(toyHead);

    // Cute Round Bear/Bunny Ears + Inner Ear Pads
    [-1, 1].forEach((side) => {
      const earGeo = new THREE.SphereGeometry(0.025, 18, 16);
      earGeo.scale(1.0, 1.15, 0.55);
      const ear = new THREE.Mesh(earGeo, handbagLeatherMat);
      ear.position.set(side * 0.046, -0.045, 0.006);
      ear.rotation.z = side * -0.22;
      artToyGroup.add(ear);

      const innerEarGeo = new THREE.SphereGeometry(0.015, 14, 12);
      innerEarGeo.scale(1.0, 1.12, 0.35);
      const innerEar = new THREE.Mesh(innerEarGeo, handbagHardwareMat);
      innerEar.position.set(side * 0.046, -0.046, 0.015);
      innerEar.rotation.z = side * -0.22;
      artToyGroup.add(innerEar);

      // Glossy Button Eyes
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.0075, 12, 12),
        plushEyeMat
      );
      eye.position.set(side * 0.022, -0.088, 0.058);
      artToyGroup.add(eye);
    });

    // Snout Muzzle & Nose
    const snoutGeo = new THREE.SphereGeometry(0.020, 16, 14);
    snoutGeo.scale(1.25, 0.88, 0.72);
    const snout = new THREE.Mesh(snoutGeo, handbagHardwareMat);
    snout.position.set(0, -0.104, 0.058);
    artToyGroup.add(snout);

    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.0065, 12, 10),
      plushEyeMat
    );
    nose.scale.set(1.3, 0.85, 0.8);
    nose.position.set(0, -0.099, 0.071);
    artToyGroup.add(nose);

    // Chubby Art Toy Torso (y = -0.188) + Heart/Bow Tie Badge
    const bodyGeo = new THREE.SphereGeometry(0.062, 26, 22);
    bodyGeo.scale(0.96, 1.12, 0.86);
    const toyBody = new THREE.Mesh(bodyGeo, handbagLeatherMat);
    toyBody.position.set(0, -0.188, 0.006);
    artToyGroup.add(toyBody);

    const bellyPatchGeo = new THREE.SphereGeometry(0.040, 18, 16);
    bellyPatchGeo.scale(0.95, 1.08, 0.45);
    const bellyPatch = new THREE.Mesh(bellyPatchGeo, handbagHardwareMat);
    bellyPatch.position.set(0, -0.188, 0.046);
    artToyGroup.add(bellyPatch);

    // Chubby Arms & Legs
    [-1, 1].forEach((side) => {
      const armGeo = new THREE.CapsuleGeometry(0.017, 0.036, 8, 14);
      const arm = new THREE.Mesh(armGeo, handbagLeatherMat);
      arm.position.set(side * 0.066, -0.172, 0.014);
      arm.rotation.z = side * 0.42;
      arm.rotation.x = -0.25;
      artToyGroup.add(arm);

      const legGeo = new THREE.CapsuleGeometry(0.020, 0.038, 8, 14);
      const leg = new THREE.Mesh(legGeo, handbagLeatherMat);
      leg.position.set(side * 0.034, -0.262, 0.012);
      artToyGroup.add(leg);
    });
  }
  handbagBodyPivot.add(artToyGroup);

  // Style 8: Classic Fashion Cane Umbrella (`fashion_umbrella`) — Curved J-Handle, Metallic Shaft & Pleated Canopy
  const umbrellaGroup = new THREE.Group();
  {
    // Curved J-Hook Handle at y = 0..+0.035 so palm grips the handle naturally
    const jHookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.065, 0),
      new THREE.Vector3(0, 0.015, 0),
      new THREE.Vector3(0, 0.042, 0.018),
      new THREE.Vector3(0, 0.038, 0.048),
      new THREE.Vector3(0, 0.008, 0.056),
    ]);
    const jHookGeo = new THREE.TubeGeometry(jHookCurve, 24, 0.0095, 12, false);
    umbrellaGroup.add(new THREE.Mesh(jHookGeo, handbagHardwareMat));

    // Gold collar ring below handle
    const collarRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.016, 16),
      handbagHardwareMat
    );
    collarRing.position.set(0, -0.072, 0);
    umbrellaGroup.add(collarRing);

    // Central sleek metallic cane shaft extending down to ferrule tip (y = -0.68)
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.0042, 0.62, 16),
      handbagHardwareMat
    );
    shaft.position.set(0, -0.38, 0);
    umbrellaGroup.add(shaft);

    // Tailored Furled / Semi-Flared 8-Rib Couture Canopy (y = -0.14 .. -0.58)
    const canopyGeo = new THREE.ConeGeometry(0.068, 0.45, 32, 12, true);
    // Invert cone so apex is at the bottom (-0.58) and furled crown is at top (-0.14), with 8 fluted pleats
    canopyGeo.rotateX(Math.PI);
    const cPos = canopyGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const vx = cPos.getX(i);
      const vy = cPos.getY(i);
      const vz = cPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const tBell = clamp01((vy + 0.225) / 0.45);
      const flute = 1.0 + 0.14 * Math.cos(angle * 8) * Math.sin(tBell * Math.PI);
      cPos.setX(i, vx * flute);
      cPos.setZ(i, vz * flute);
    }
    canopyGeo.computeVertexNormals();
    const canopyMesh = new THREE.Mesh(canopyGeo, handbagLeatherMat);
    canopyMesh.position.set(0, -0.365, 0);
    umbrellaGroup.add(canopyMesh);

    // Button strap band cinching the umbrella canopy
    const strapBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.0045, 10, 28),
      handbagHardwareMat
    );
    strapBand.rotation.x = Math.PI / 2;
    strapBand.position.set(0, -0.32, 0);
    umbrellaGroup.add(strapBand);

    // Bottom metal ferrule tip
    const ferruleTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.0065, 0.055, 14),
      handbagHardwareMat
    );
    ferruleTip.rotation.x = Math.PI;
    ferruleTip.position.set(0, -0.685, 0);
    umbrellaGroup.add(ferruleTip);
  }
  handbagBodyPivot.add(umbrellaGroup);

  // ============================================================================
  // 4. 3D HEADWEAR / HATS SYSTEM (Parented directly to `Head` Bone)
  // ============================================================================
  const hatCrownMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1E293B'),
    roughness: 0.46,
    metalness: 0.08,
    bumpMap: getFabricBumpTexture('cotton'),
    bumpScale: 0.0045,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
  });
  const hatTrimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D4AF37'),
    roughness: 0.24,
    metalness: 0.62,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
  });

  const hatRoot = new THREE.Group();
  hatRoot.name = 'AccessoryHatRoot';
  hatRoot.visible = false;
  headBone.add(hatRoot);

  // Hat Style 1: Sport Baseball Cap (`baseball_cap`)
  const baseballCapGroup = new THREE.Group();
  {
    const capR = isMale ? 0.104 : 0.098;
    // 6-panel domed crown hugging the upper skull
    const crownGeo = new THREE.SphereGeometry(
      capR,
      36,
      20,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.54
    );
    crownGeo.scale(0.95, 0.88, 1.08);
    const crown = new THREE.Mesh(crownGeo, hatCrownMat);
    baseballCapGroup.add(crown);

    // Top squatchee button
    const topBtn = new THREE.Mesh(
      new THREE.SphereGeometry(0.0085, 14, 12),
      hatTrimMat
    );
    topBtn.scale.set(1.0, 0.45, 1.0);
    topBtn.position.set(0, capR * 0.88, 0);
    baseballCapGroup.add(topBtn);

    // Sweatband rim around base of crown
    const bandRim = new THREE.Mesh(
      new THREE.TorusGeometry(capR * 0.98, 0.0045, 10, 36),
      hatTrimMat
    );
    bandRim.rotation.x = Math.PI / 2;
    bandRim.scale.set(0.95, 1.08, 1.0);
    bandRim.position.set(0, 0.004, 0);
    baseballCapGroup.add(bandRim);

    // Curved forward visor bill (+Z)
    const billGeo = new THREE.BoxGeometry(capR * 1.48, 0.0055, 0.088, 24, 2, 12);
    const bPos = billGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const vx = bPos.getX(i);
      const vy = bPos.getY(i);
      const vz = bPos.getZ(i); // -0.044 .. +0.044
      const tFront = clamp01((vz + 0.044) / 0.088);
      // Taper width toward the front tip of the visor + arch curve across X
      const widthTaper = 1.0 - 0.24 * Math.pow(tFront, 1.5);
      const nx = vx * widthTaper;
      const archY = -Math.pow(nx / (capR * 0.72), 2) * 0.022 - tFront * 0.016;
      const curveZ = vz + (1.0 - Math.pow(nx / (capR * 0.75), 2)) * 0.018 * tFront;
      bPos.setXYZ(i, nx, vy + archY, curveZ);
    }
    billGeo.computeVertexNormals();
    const bill = new THREE.Mesh(billGeo, hatCrownMat);
    bill.position.set(0, 0.006, capR * 1.02 + 0.026);
    baseballCapGroup.add(bill);
  }
  hatRoot.add(baseballCapGroup);

  // Hat Style 2: Streetwear Bucket Hat (`bucket_hat`)
  const bucketHatGroup = new THREE.Group();
  {
    const topR = isMale ? 0.088 : 0.083;
    const midR = isMale ? 0.104 : 0.098;
    const brimR = isMale ? 0.148 : 0.140;

    // Flat-top sloped bucket crown
    const crownCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(topR, midR, 0.078, 36, 4),
      hatCrownMat
    );
    crownCyl.scale.set(0.95, 1.0, 1.06);
    crownCyl.position.set(0, 0.044, 0);
    bucketHatGroup.add(crownCyl);

    // Woven accent band around the crown base
    const ribbon = new THREE.Mesh(
      new THREE.CylinderGeometry(midR + 0.002, midR + 0.003, 0.016, 36, 1, true),
      hatTrimMat
    );
    ribbon.scale.set(0.95, 1.0, 1.06);
    ribbon.position.set(0, 0.012, 0);
    bucketHatGroup.add(ribbon);

    // Downward-sloping 360-degree streetwear bucket brim
    const brimGeo = new THREE.CylinderGeometry(midR, brimR, 0.042, 48, 6, true);
    brimGeo.scale(0.96, 1.0, 1.06);
    const brimPos = brimGeo.attributes.position;
    for (let i = 0; i < brimPos.count; i++) {
      const vx = brimPos.getX(i);
      const vy = brimPos.getY(i);
      const vz = brimPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const wave = Math.sin(angle * 6) * 0.0025;
      brimPos.setY(i, vy + wave);
    }
    brimGeo.computeVertexNormals();
    const brim = new THREE.Mesh(brimGeo, hatCrownMat);
    brim.position.set(0, -0.014, 0);
    bucketHatGroup.add(brim);
  }
  hatRoot.add(bucketHatGroup);

  // Hat Style 3: Wide-Brim Resort Sun Hat (`wide_brim_sun_hat`)
  const sunHatGroup = new THREE.Group();
  {
    const crownR = isMale ? 0.102 : 0.096;
    const outerBrimR = isMale ? 0.225 : 0.218;

    // Rounded straw-hat dome crown
    const domeGeo = new THREE.SphereGeometry(
      crownR,
      36,
      18,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.52
    );
    domeGeo.scale(0.95, 0.86, 1.06);
    const dome = new THREE.Mesh(domeGeo, hatCrownMat);
    dome.position.set(0, 0.005, 0);
    sunHatGroup.add(dome);

    // Luxury silk ribbon band + bow knot on side
    const silkBand = new THREE.Mesh(
      new THREE.CylinderGeometry(crownR + 0.002, crownR + 0.003, 0.020, 36, 1, true),
      hatTrimMat
    );
    silkBand.scale.set(0.95, 1.0, 1.06);
    silkBand.position.set(0, 0.014, 0);
    sunHatGroup.add(silkBand);

    // Wide undulating resort sun-hat brim
    const wideBrimGeo = new THREE.RingGeometry(crownR * 0.94, outerBrimR, 64, 8);
    wideBrimGeo.rotateX(-Math.PI / 2);
    const wbPos = wideBrimGeo.attributes.position;
    for (let i = 0; i < wbPos.count; i++) {
      const vx = wbPos.getX(i);
      const vz = wbPos.getZ(i);
      const r = Math.hypot(vx, vz);
      const tOut = clamp01((r - crownR) / (outerBrimR - crownR));
      const angle = Math.atan2(vz, vx);
      // Graceful resort wave + gentle downward droop
      const droop = -0.018 * Math.pow(tOut, 1.35) + Math.sin(angle * 3) * 0.009 * tOut;
      wbPos.setY(i, droop);
    }
    wideBrimGeo.computeVertexNormals();
    const wideBrim = new THREE.Mesh(wideBrimGeo, hatCrownMat);
    wideBrim.position.set(0, 0.006, 0);
    sunHatGroup.add(wideBrim);
  }
  hatRoot.add(sunHatGroup);

  // Hat Style 4: Classic Parisian Beret (`french_beret`)
  const frenchBeretGroup = new THREE.Group();
  {
    const headBandR = isMale ? 0.098 : 0.093;
    // Snug leather/wool headband rim sitting on the forehead/crown
    const headband = new THREE.Mesh(
      new THREE.CylinderGeometry(headBandR, headBandR * 0.98, 0.018, 36),
      hatTrimMat
    );
    headband.scale.set(0.95, 1.0, 1.06);
    headband.position.set(0, 0.006, 0);
    frenchBeretGroup.add(headband);

    // Tilted soft Parisian beret puff cushion
    const beretPuffGeo = new THREE.SphereGeometry(headBandR * 1.28, 36, 24);
    beretPuffGeo.scale(1.06, 0.42, 1.08);
    const beretPuff = new THREE.Mesh(beretPuffGeo, hatCrownMat);
    beretPuff.position.set(0.018, 0.042, -0.006);
    beretPuff.rotation.z = -0.22;
    beretPuff.rotation.x = -0.08;
    frenchBeretGroup.add(beretPuff);

    // Classic French beret top stem ("cabillou" / "tige")
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.018, 8),
      hatCrownMat
    );
    stem.position.set(0.028, 0.092, -0.008);
    stem.rotation.z = -0.22;
    frenchBeretGroup.add(stem);
  }
  hatRoot.add(frenchBeretGroup);

  // Uploaded Hat Logo / Emblem Plate on Front Crown
  const hatUploadedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFFFFF'),
    roughness: 0.35,
    metalness: 0.08,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  const hatUploadedGeo = new THREE.PlaneGeometry(0.068, 0.045, 12, 4);
  const hPos = hatUploadedGeo.attributes.position;
  for (let i = 0; i < hPos.count; i++) {
    const vx = hPos.getX(i);
    hPos.setZ(i, -vx * vx * 2.8);
  }
  hatUploadedGeo.computeVertexNormals();
  const hatUploadedMesh = new THREE.Mesh(hatUploadedGeo, hatUploadedMat);
  hatUploadedMesh.position.set(0, 0.038, (isMale ? 0.104 : 0.098) * 1.07);
  hatUploadedMesh.rotation.x = -0.22;
  hatUploadedMesh.visible = false;
  hatRoot.add(hatUploadedMesh);

  // Custom 3D Uploaded Photo Plates for Sunglasses, Watch Dial & Handbag
  const sunglassesUploadedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFFFFF'),
    roughness: 0.22,
    metalness: 0.18,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  const sgPlaneGeo = new THREE.PlaneGeometry(
    isMale ? 0.132 : 0.124,
    0.058,
    16,
    4
  );
  // Subtle facial wrap curve along X so uploaded glasses contour the face naturally
  const sgPos = sgPlaneGeo.attributes.position;
  for (let i = 0; i < sgPos.count; i++) {
    const vx = sgPos.getX(i);
    sgPos.setZ(i, -vx * vx * 1.45);
  }
  sgPlaneGeo.computeVertexNormals();
  const sunglassesUploadedMesh = new THREE.Mesh(
    sgPlaneGeo,
    sunglassesUploadedMat
  );
  sunglassesUploadedMesh.position.set(0, 0.001, 0.0045);
  sunglassesUploadedMesh.visible = false;
  sunglassesRoot.add(sunglassesUploadedMesh);

  const watchUploadedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFFFFF'),
    roughness: 0.18,
    metalness: 0.24,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  const watchUploadedGeo = new THREE.PlaneGeometry(0.042, 0.042);
  const watchUploadedMesh = new THREE.Mesh(watchUploadedGeo, watchUploadedMat);
  // Placed right on top of the watch case (+Z dorsal face)
  watchUploadedMesh.position.set(0, 0, 0.0298);
  watchUploadedMesh.visible = false;
  watchRoot.add(watchUploadedMesh);

  const handbagUploadedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFFFFF'),
    roughness: 0.34,
    metalness: 0.10,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  const handbagUploadedGroup = new THREE.Group();
  handbagUploadedGroup.visible = false;
  {
    const frontPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      handbagUploadedMat
    );
    frontPlate.position.set(0, -0.175, 0.046);
    handbagUploadedGroup.add(frontPlate);

    const backPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      handbagUploadedMat
    );
    backPlate.rotation.y = Math.PI;
    backPlate.position.set(0, -0.175, -0.046);
    handbagUploadedGroup.add(backPlate);
  }
  handbagBodyPivot.add(handbagUploadedGroup);

  return {
    sunglassesRoot,
    sunglassesByStyle: {
      classic_aviator: aviatorGroup,
      retro_cat_eye: catEyeGroup,
      oversized_square: oversizedSquareGroup,
      cyber_shield_sport: cyberShieldGroup,
      vintage_round_metal: vintageRoundGroup,
    },
    sunglassesFrameMat,
    sunglassesLensMat,
    sunglassesUploadedMesh,
    sunglassesUploadedMat,
    eyeLocalPos: eyeLocalPos.clone(),
    watchRoot,
    watchByStyle: {
      luxury_chronograph: chronoWatchGroup,
      minimal_dress_watch: dressWatchGroup,
      smart_watch_ultra: smartWatchGroup,
      vintage_round_metal: tankWatchGroup,
    } as unknown as Record<Exclude<WatchStyleId, 'none'>, THREE.Group>,
    watchCaseMat,
    watchStrapMat,
    watchDialMat,
    watchUploadedMesh,
    watchUploadedMat,
    handbagRoot,
    handbagBodyPivot,
    handbagByStyle: {
      paris_saddle_bag: saddleBagGroup,
      structured_tote: structuredToteGroup,
      quilted_chain_flap: quiltedFlapGroup,
      mini_top_handle: miniTopHandleGroup,
      crossbody_messenger: messengerBagGroup,
      pro_basketball: basketballGroup,
      art_toy_plush: artToyGroup,
      fashion_umbrella: umbrellaGroup,
    },
    handbagShoulderStraps,
    handbagTopHandles,
    handbagLeatherMat,
    handbagHardwareMat,
    handbagUploadedGroup,
    handbagUploadedMat,
    hatRoot,
    hatByStyle: {
      baseball_cap: baseballCapGroup,
      bucket_hat: bucketHatGroup,
      wide_brim_sun_hat: sunHatGroup,
      french_beret: frenchBeretGroup,
    },
    hatCrownMat,
    hatTrimMat,
    hatUploadedMesh,
    hatUploadedMat,
  };
}

function updateAccessoryMaterialsAndStyles(
  sys: AccessoryRigSystem,
  outfit: OutfitConfiguration
) {
  const hideAll = Boolean(outfit.hideAllGarments);
  const acc: AccessoriesConfiguration = outfit.accessories || DEFAULT_ACCESSORIES;

  // Fix watchByStyle key mapping
  sys.watchByStyle.vintage_gold_tank =
    sys.watchByStyle.vintage_gold_tank ||
    (sys.watchByStyle as Record<string, THREE.Group>).vintage_round_metal;

  // 1. Sunglasses (with cornea-safe nose bridge offset & unfolded 3D frame)
  const sgStyle = hideAll ? 'none' : acc.sunglasses.styleId;
  sys.sunglassesRoot.visible = sgStyle !== 'none';
  if (sgStyle !== 'none') {
    sys.sunglassesUploadedMesh.visible = false;

    (
      Object.keys(sys.sunglassesByStyle) as Exclude<SunglassesStyleId, 'none'>[]
    ).forEach((k) => {
      sys.sunglassesByStyle[k].visible = k === sgStyle;
    });
    sys.sunglassesFrameMat.color.set(acc.sunglasses.frameColorHex);
    const isMetallicFrame =
      sgStyle === 'classic_aviator' ||
      sgStyle === 'vintage_round_metal' ||
      acc.sunglasses.frameColorHex === '#D4AF37' ||
      acc.sunglasses.frameColorHex === '#E2E8F0' ||
      acc.sunglasses.frameColorHex === '#E5B887';
    sys.sunglassesFrameMat.metalness = isMetallicFrame ? 0.88 : 0.22;
    sys.sunglassesFrameMat.roughness = isMetallicFrame ? 0.18 : 0.24;

    const lensCol = new THREE.Color(acc.sunglasses.lensColorHex);
    const lensLuma = 0.299 * lensCol.r + 0.587 * lensCol.g + 0.114 * lensCol.b;
    sys.sunglassesLensMat.color.copy(lensCol);
    sys.sunglassesLensMat.opacity = lensLuma > 0.68 ? 0.34 : lensLuma > 0.42 ? 0.62 : 0.84;
    sys.sunglassesLensMat.roughness = 0.08;
    sys.sunglassesLensMat.metalness = lensLuma > 0.68 ? 0.15 : 0.32;

    if (acc.sunglasses.wearPosition === 'head_crown') {
      sys.sunglassesRoot.position.set(
        0,
        sys.eyeLocalPos.y + (sys.eyeLocalPos.y > 0.08 ? 0.112 : 0.104),
        sys.eyeLocalPos.z + 0.024
      );
      sys.sunglassesRoot.rotation.set(-0.72, 0, 0);
      sys.sunglassesRoot.scale.set(1.06, 1.06, 1.06);
    } else {
      sys.sunglassesRoot.scale.set(1.0, 1.0, 1.0);
      sys.sunglassesRoot.position.set(
        0,
        sys.eyeLocalPos.y + 0.002,
        sys.eyeLocalPos.z + 0.010
      );
      sys.sunglassesRoot.rotation.set(0.02, 0, 0);
    }
  }

  // 2. Watch (with optional uploaded watch face texture on top of the wrist)
  const wStyle = hideAll ? 'none' : acc.watch.styleId;
  sys.watchRoot.visible = wStyle !== 'none';
  if (wStyle !== 'none') {
    (Object.keys(sys.watchByStyle) as Exclude<WatchStyleId, 'none'>[]).forEach(
      (k) => {
        if (sys.watchByStyle[k]) {
          sys.watchByStyle[k].visible = k === wStyle;
        }
      }
    );
    const wPhotoTex = getUploadedGarmentTexture(acc.watch.uploadedTextureUrl);
    sys.watchUploadedMesh.visible = Boolean(wPhotoTex);
    if (wPhotoTex) {
      sys.watchUploadedMat.map = wPhotoTex;
      sys.watchUploadedMat.needsUpdate = true;
    }

    sys.watchCaseMat.color.set(acc.watch.caseColorHex);
    sys.watchStrapMat.color.set(acc.watch.strapColorHex);
    const isMetalStrap =
      wStyle === 'luxury_chronograph' ||
      acc.watch.strapColorHex === '#E2E8F0' ||
      acc.watch.strapColorHex === '#CBD5E1' ||
      acc.watch.strapColorHex === '#D4AF37' ||
      acc.watch.strapColorHex === '#94A3B8';
    sys.watchStrapMat.metalness = isMetalStrap ? 0.82 : 0.12;
    sys.watchStrapMat.roughness = isMetalStrap ? 0.24 : 0.48;
  }

  // 3. Handbag & Handheld Props (Basketball, Art Toy, Umbrella, Designer Bags)
  const hbStyle = hideAll ? 'none' : acc.handbag.styleId;
  sys.handbagRoot.visible = hbStyle !== 'none';
  if (hbStyle !== 'none') {
    (
      Object.keys(sys.handbagByStyle) as Exclude<HandbagStyleId, 'none'>[]
    ).forEach((k) => {
      sys.handbagByStyle[k].visible = k === hbStyle;
    });
    const isProp =
      hbStyle === 'pro_basketball' ||
      hbStyle === 'art_toy_plush' ||
      hbStyle === 'fashion_umbrella';
    const hbPhotoTex = !isProp
      ? getUploadedGarmentTexture(acc.handbag.uploadedTextureUrl)
      : null;
    sys.handbagUploadedGroup.visible = Boolean(hbPhotoTex);
    if (hbPhotoTex) {
      sys.handbagUploadedMat.map = hbPhotoTex;
      sys.handbagUploadedMat.needsUpdate = true;
    }
    sys.handbagLeatherMat.color.set(acc.handbag.colorHex);
    sys.handbagLeatherMat.roughness =
      hbStyle === 'art_toy_plush'
        ? 0.84
        : hbStyle === 'pro_basketball'
        ? 0.54
        : hbStyle === 'fashion_umbrella'
        ? 0.28
        : 0.36;
    sys.handbagLeatherMat.bumpMap =
      hbStyle === 'art_toy_plush'
        ? getFabricBumpTexture('fleece')
        : hbStyle === 'fashion_umbrella'
        ? getFabricBumpTexture('silk')
        : getFabricBumpTexture('leather');
    sys.handbagLeatherMat.bumpScale =
      hbStyle === 'pro_basketball'
        ? 0.0075
        : hbStyle === 'art_toy_plush'
        ? 0.006
        : 0.005;
    sys.handbagHardwareMat.color.set(acc.handbag.hardwareColorHex);
    sys.handbagHardwareMat.metalness =
      hbStyle === 'art_toy_plush' || hbStyle === 'pro_basketball' ? 0.15 : 0.94;
    sys.handbagHardwareMat.roughness =
      hbStyle === 'art_toy_plush' || hbStyle === 'pro_basketball' ? 0.52 : 0.14;
  }

  // 4. 3D Headwear / Hats (`baseball_cap`, `bucket_hat`, `wide_brim_sun_hat`, `french_beret`)
  const hatCfg = acc.hat || DEFAULT_ACCESSORIES.hat!;
  const hatStyle = hideAll ? 'none' : hatCfg.styleId;
  sys.hatRoot.visible = hatStyle !== 'none';
  if (hatStyle !== 'none') {
    (Object.keys(sys.hatByStyle) as Exclude<HatStyleId, 'none'>[]).forEach(
      (k) => {
        sys.hatByStyle[k].visible = k === hatStyle;
      }
    );
    const hatPhotoTex = getUploadedGarmentTexture(hatCfg.uploadedTextureUrl);
    sys.hatUploadedMesh.visible =
      Boolean(hatPhotoTex) &&
      (hatStyle === 'baseball_cap' || hatStyle === 'bucket_hat');
    if (hatPhotoTex) {
      sys.hatUploadedMat.map = hatPhotoTex;
      sys.hatUploadedMat.needsUpdate = true;
    }
    sys.hatCrownMat.color.set(hatCfg.colorHex || '#1E293B');
    sys.hatTrimMat.color.set(hatCfg.trimColorHex || '#D4AF37');
    // Position hatRoot cleanly on the upper head crown above eyeLocalPos
    sys.hatRoot.position.set(
      0,
      sys.eyeLocalPos.y + 0.048,
      sys.eyeLocalPos.z - 0.095
    );
    sys.hatRoot.rotation.set(-0.04, 0, 0);
  }
}

export function buildHumanMannequinRig(maxAnisotropy = 4): HumanMannequinRig {
  const root = new THREE.Group();
  root.name = 'HumanModelRoot';

  const skinMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#EEC7B0'),
    roughness: 0.48,
    metalness: 0.0,
  });

  const joints: Record<JointId, THREE.Bone> = {
    pelvis: new THREE.Bone(),
    spine: new THREE.Bone(),
    chest: new THREE.Bone(),
    neck: new THREE.Bone(),
    head: new THREE.Bone(),
    leftShoulder: new THREE.Bone(),
    leftElbow: new THREE.Bone(),
    leftWrist: new THREE.Bone(),
    rightShoulder: new THREE.Bone(),
    rightElbow: new THREE.Bone(),
    rightWrist: new THREE.Bone(),
    leftHip: new THREE.Bone(),
    leftKnee: new THREE.Bone(),
    leftAnkle: new THREE.Bone(),
    rightHip: new THREE.Bone(),
    rightKnee: new THREE.Bone(),
    rightAnkle: new THREE.Bone(),
  };

  const allJointIds = Object.keys(joints) as JointId[];
  allJointIds.forEach((id) => {
    joints[id].name = id;
  });

  root.add(joints.pelvis);
  joints.pelvis.position.set(0, 0.98, 0);
  joints.pelvis.add(joints.spine);
  joints.spine.position.set(0, 0.14, 0);
  joints.spine.add(joints.chest);
  joints.chest.position.set(0, 0.18, 0);
  joints.chest.add(joints.neck);
  joints.neck.position.set(0, 0.16, 0);
  joints.neck.add(joints.head);
  joints.head.position.set(0, 0.1, 0);

  joints.chest.add(joints.leftShoulder);
  joints.leftShoulder.position.set(0.16, 0.12, 0);
  joints.leftShoulder.add(joints.leftElbow);
  joints.leftElbow.position.set(0, -0.26, 0);
  joints.leftElbow.add(joints.leftWrist);
  joints.leftWrist.position.set(0, -0.25, 0);

  joints.chest.add(joints.rightShoulder);
  joints.rightShoulder.position.set(-0.16, 0.12, 0);
  joints.rightShoulder.add(joints.rightElbow);
  joints.rightElbow.position.set(0, -0.26, 0);
  joints.rightElbow.add(joints.rightWrist);
  joints.rightWrist.position.set(0, -0.25, 0);

  joints.pelvis.add(joints.leftHip);
  joints.leftHip.position.set(0.095, -0.02, 0);
  joints.leftHip.add(joints.leftKnee);
  joints.leftKnee.position.set(0, -0.45, 0);
  joints.leftKnee.add(joints.leftAnkle);
  joints.leftAnkle.position.set(0, -0.44, 0);

  joints.pelvis.add(joints.rightHip);
  joints.rightHip.position.set(-0.095, -0.02, 0);
  joints.rightHip.add(joints.rightKnee);
  joints.rightKnee.position.set(0, -0.45, 0);
  joints.rightKnee.add(joints.rightAnkle);
  joints.rightAnkle.position.set(0, -0.44, 0);

  const jointOverlayGroup = new THREE.Group();
  jointOverlayGroup.name = 'JointHitboxAndRingOverlays';
  root.add(jointOverlayGroup);

  const jointFollowers = {} as Record<JointId, THREE.Group>;
  const jointIndicators = {} as Record<JointId, THREE.Mesh>;
  const ringGeo = new THREE.TorusGeometry(0.055, 0.003, 12, 32);
  ringGeo.rotateX(Math.PI / 2);

  const hitBoxGeo = new THREE.SphereGeometry(0.085, 8, 8);
  const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });

  allJointIds.forEach((id) => {
    const follower = new THREE.Group();
    jointOverlayGroup.add(follower);
    jointFollowers[id] = follower;

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.0,
      depthTest: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.renderOrder = 25;
    follower.add(ring);
    jointIndicators[id] = ring;

    const proxy = new THREE.Mesh(hitBoxGeo, hitBoxMat);
    proxy.userData.jointId = id;
    if (id.includes('Shoulder') || id.includes('Elbow')) {
      proxy.position.set(0, -0.11, 0);
      proxy.scale.set(0.85, 1.7, 0.85);
    } else if (id.includes('Hip') || id.includes('Knee')) {
      proxy.position.set(0, -0.18, 0);
      proxy.scale.set(1.1, 2.4, 1.1);
    } else if (id === 'chest' || id === 'spine' || id === 'pelvis') {
      proxy.scale.set(1.7, 1.3, 1.3);
    } else if (id === 'head') {
      proxy.position.set(0, 0.08, 0);
      proxy.scale.set(1.4, 1.5, 1.4);
    }
    follower.add(proxy);
  });

  const measurementRingsGroup = new THREE.Group();
  measurementRingsGroup.name = 'MeasurementRings';
  root.add(measurementRingsGroup);

  const tapeMat = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });

  const createTapeRing = (radiusX: number, radiusZ: number) => {
    const curve = new THREE.EllipseCurve(
      0,
      0,
      radiusX,
      radiusZ,
      0,
      Math.PI * 2,
      false,
      0
    );
    const pts = curve.getPoints(64).map((p) => new THREE.Vector3(p.x, 0, p.y));
    const tubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts, true),
      64,
      0.0025,
      8,
      true
    );
    return new THREE.Mesh(tubeGeo, tapeMat);
  };

  const chestRing = createTapeRing(0.16, 0.13);
  chestRing.position.set(0, 1.32, 0.02);
  measurementRingsGroup.add(chestRing);

  const waistRing = createTapeRing(0.125, 0.105);
  waistRing.position.set(0, 1.12, 0.02);
  measurementRingsGroup.add(waistRing);

  const hipRing = createTapeRing(0.175, 0.135);
  hipRing.position.set(0, 0.96, 0.01);
  measurementRingsGroup.add(hipRing);
  measurementRingsGroup.visible = false;

  // 3D Studio Posing Stool (Automatically appears underneath pelvis for seated AI poses like 'đang ngồi bắt chéo chân')
  const studioStoolGroup = new THREE.Group();
  studioStoolGroup.name = 'StudioPosingStool';
  studioStoolGroup.visible = false;
  {
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      roughness: 0.22,
      metalness: 0.86,
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.08,
    });

    // Circular weighted studio floor base
    const baseDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.23, 0.018, 36),
      chromeMat
    );
    baseDisc.position.set(0, 0.009, -0.06);
    baseDisc.receiveShadow = true;
    studioStoolGroup.add(baseDisc);

    // Central pneumatic chrome column
    const centerPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.03, 0.50, 24),
      chromeMat
    );
    centerPost.position.set(0, 0.26, -0.06);
    centerPost.castShadow = true;
    studioStoolGroup.add(centerPost);

    // Chrome footrest ring
    const footRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.155, 0.009, 12, 36),
      chromeMat
    );
    footRing.rotation.x = Math.PI / 2;
    footRing.position.set(0, 0.19, -0.06);
    studioStoolGroup.add(footRing);

    // Upholstered round leather studio seat pad
    const seatPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.175, 0.055, 36),
      cushionMat
    );
    seatPad.position.set(0, 0.525, -0.05);
    seatPad.castShadow = true;
    seatPad.receiveShadow = true;
    studioStoolGroup.add(seatPad);
  }
  root.add(studioStoolGroup);

  const garmentGroups = {
    top: [] as THREE.Object3D[],
    outerwear: [] as THREE.Object3D[],
    bottom: [] as THREE.Object3D[],
    footwear: [] as THREE.Object3D[],
  };

  let femaleSlot: CharacterRigSlot | null = null;
  let maleSlot: CharacterRigSlot | null = null;
  let isMaleLoading = false;
  let cachedSourceCleanHair: THREE.SkinnedMesh | null = null;
  let buildSlotHelper:
    | ((
        scene: THREE.Group,
        parts: ReturnType<typeof classifyAndPrepareSkinnedMeshes>,
        twoBunchHair: THREE.SkinnedMesh | null,
        idleGltf: { animations: THREE.AnimationClip[] },
        walkGltf: { animations: THREE.AnimationClip[] },
        isMale: boolean
      ) => CharacterRigSlot)
    | null = null;

  let currentBody: BodyMeasurements | null = null;
  let currentOutfit: OutfitConfiguration | null = null;
  let currentShowRings = false;

  const loader = new GLTFLoader();

  const ensureMaleSlotLoaded = () => {
    if (maleSlot || isMaleLoading || !buildSlotHelper || !cachedSourceCleanHair) {
      return;
    }
    isMaleLoading = true;
    Promise.all([
      loader.loadAsync('/models/PreviewMesh.glb'),
      loader.loadAsync('/models/M_Standing_Idle_001.glb'),
      loader.loadAsync('/models/M_Walk_001.glb'),
    ])
      .then(([maleGltf, mIdleGltf, mWalkGltf]) => {
        const mParts = classifyAndPrepareSkinnedMeshes(maleGltf.scene);
        mParts.hairMeshes.forEach((m) => {
          m.visible = false;
        });
        maleSlot = buildSlotHelper!(
          maleGltf.scene,
          mParts,
          null,
          mIdleGltf,
          mWalkGltf,
          true
        );
        root.add(maleSlot.scene);
        syncAllAppearance();
      })
      .catch((err) => {
        isMaleLoading = false;
        console.error('Failed to lazy-load male GLB model:', err);
      });
  };

  const syncAllAppearance = () => {
    if (!currentBody || !currentOutfit) return;
    const isMale = currentBody.genderProfile === 'male';
    if (isMale && !maleSlot) {
      ensureMaleSlotLoaded();
    }
    const activeSlot = isMale ? maleSlot : femaleSlot;

    if (femaleSlot) femaleSlot.scene.visible = !isMale;
    if (maleSlot) maleSlot.scene.visible = isMale;

    if (!activeSlot) return;

    // 1. Skin Tone Adjustment
    const surf =
      MANNEQUIN_SURFACES.find((s) => s.id === currentBody!.surfaceId) ||
      MANNEQUIN_SURFACES[1];
    const targetSkinCol = new THREE.Color(surf.colorHex);
    const tintR = Math.min(1.18, Math.max(0.42, targetSkinCol.r / 0.88));
    const tintG = Math.min(1.18, Math.max(0.42, targetSkinCol.g / 0.72));
    const tintB = Math.min(1.18, Math.max(0.42, targetSkinCol.b / 0.64));

    const mk = currentBody.makeup;
    const dewyHighlight = !isMale && mk ? mk.highlighterGlow : 0;

    activeSlot.skinMeshes.forEach((mesh) => {
      mesh.visible = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      mat.color.setRGB(tintR, tintG, tintB);
      mat.roughness = Math.max(0.28, surf.roughness - dewyHighlight * 0.16);
    });

    // 1b. Female 3D Makeup Uniforms & Contact Lens Iris Dyeing
    if (!isMale && activeSlot.makeupUniforms && mk) {
      const mu = activeSlot.makeupUniforms;
      mu.uEnableMakeup.value = 1.0;
      mu.uLipColor.value.set(mk.lipColorHex).convertSRGBToLinear();
      mu.uBlushColor.value.set(mk.blushColorHex).convertSRGBToLinear();
      mu.uEyeshadowColor.value.set(mk.eyeshadowColorHex).convertSRGBToLinear();
      mu.uMakeupWeights1.value.set(
        mk.lipIntensity,
        mk.lipGloss,
        mk.blushIntensity,
        mk.eyeshadowIntensity
      );
      const mkStyleCode =
        mk.presetId === 'douyin_rose_glam'
          ? 1.0
          : mk.presetId === 'soft_latte_nude'
            ? 2.0
            : mk.presetId === 'evening_burgundy'
              ? 3.0
              : mk.presetId === 'korean_peach_glow'
                ? 4.0
                : 0.0;
      mu.uMakeupWeights2.value.set(
        mk.eyelinerIntensity,
        mk.highlighterGlow,
        mkStyleCode,
        0
      );
    }

    if (currentBody.eyeColorHex) {
      activeSlot.eyeMeshes.forEach((eyeMesh) => {
        const mat = eyeMesh.material as THREE.MeshStandardMaterial;
        const origMap = mat?.userData?.origMap as THREE.Texture | null;
        if (mat && origMap) {
          const prevHasMap = Boolean(mat.map);
          mat.map = getStyledEyeIrisTexture(origMap, currentBody!.eyeColorHex);
          if (prevHasMap !== Boolean(mat.map)) {
            mat.needsUpdate = true;
          }
        }
      });
    }

    // Sync exact tinted head skin color into the GPU top, bottom & footwear shaders
    const gSys = activeSlot.garmentSystem;
    const skinR = activeSlot.baseHeadSkinColor.r * tintR;
    const skinG = activeSlot.baseHeadSkinColor.g * tintG;
    const skinB = activeSlot.baseHeadSkinColor.b * tintB;
    gSys.topShaderUniforms.uSkinColor.value.setRGB(skinR, skinG, skinB);
    gSys.bottomShaderUniforms.uSkinColor.value.setRGB(skinR, skinG, skinB);
    gSys.footwearShaderUniforms.uSkinColor.value.setRGB(skinR, skinG, skinB);

    // 2. Glitch-Free 23-Style 3D Hairstyle Switching & Hair Color Dyeing
    updateHeadHairSystem(
      activeSlot.hairSystem,
      currentBody.hairstyleId,
      currentBody.hairColorHex,
      isMale
    );

    // 3. Independent Inner Top Layer + One-Piece Dress Layer + Skinned Open-Front Outerwear Jacket Layer + 3D Photo Projection
    const activeDress =
      !isMale &&
      !currentOutfit.hideAllGarments &&
      currentOutfit.dress &&
      currentOutfit.dress.styleId !== 'none'
        ? currentOutfit.dress
        : null;

    const mapDressToBodiceAndSkirt = (
      dressStyle: DressStyleId
    ): { bodice: TopStyleId; skirt: BottomStyleId; showWaistPeplum: boolean } => {
      switch (dressStyle) {
        case 'silk_slip_evening_dress':
          return {
            bodice: 'silk_camisole',
            skirt: 'pleated_maxi_skirt',
            showWaistPeplum: false,
          };
        case 'aline_princess_dress':
          return {
            bodice: 'puff_blouse',
            skirt: 'aline_skirt',
            showWaistPeplum: false,
          };
        case 'bodycon_midi_dress':
          return {
            bodice: 'female_turtleneck',
            skirt: 'pencil_skirt',
            showWaistPeplum: false,
          };
        case 'pleated_gala_gown':
          return {
            bodice: 'silk_camisole',
            skirt: 'pleated_maxi_skirt',
            showWaistPeplum: false,
          };
        case 'off_shoulder_couture_dress':
          return {
            bodice: 'off_shoulder_knit',
            skirt: 'aline_skirt',
            showWaistPeplum: false,
          };
        case 'corset_bustier_dress':
        default:
          return {
            bodice: 'corset_top',
            skirt: 'aline_skirt',
            showWaistPeplum: false,
          };
      }
    };

    const dressParts = activeDress
      ? mapDressToBodiceAndSkirt(activeDress.styleId)
      : null;

    const effectiveTopLayer = activeDress || currentOutfit.top;
    const effectiveTopStyle: TopStyleId = currentOutfit.hideAllGarments
      ? 'none'
      : dressParts
      ? dressParts.bodice
      : currentOutfit.top.styleId === 'none'
      ? 'none'
      : currentOutfit.top.styleId;
    const hasTop = effectiveTopStyle !== 'none';
    const hasOuter =
      !currentOutfit.hideAllGarments &&
      currentOutfit.outerwear.styleId !== 'none';

    const topPhotoTex = hasTop
      ? getUploadedGarmentTexture(effectiveTopLayer.uploadedTextureUrl)
      : null;
    gSys.topShaderUniforms.uHasPhotoTex.value = topPhotoTex ? 1.0 : 0.0;
    gSys.topShaderUniforms.uPhotoTex.value =
      topPhotoTex || getDummyWhiteTexture();
    const rawTopCut: [number, number, number, number] =
      effectiveTopLayer.uploadedCutoutParams || [0.35, 0.25, 0.05, 0.96];
    const topCut: [number, number, number, number] = activeDress
      ? [rawTopCut[0], rawTopCut[1], 0.0, 0.0]
      : rawTopCut;
    gSys.topShaderUniforms.uPhotoCutout.value.set(
      topCut[0],
      topCut[1],
      topCut[2],
      topCut[3]
    );

    const topPrimaryCol = new THREE.Color(
      hasTop ? effectiveTopLayer.colorHex : surf.colorHex
    );
    const topTrimCol = effectiveTopLayer.secondaryColorHex
      ? new THREE.Color(effectiveTopLayer.secondaryColorHex)
      : topPrimaryCol
          .clone()
          .offsetHSL(
            0,
            0,
            topPrimaryCol.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? -0.14 : 0.16
          );
    gSys.topShaderUniforms.uTrimColor.value
      .copy(topTrimCol)
      .convertSRGBToLinear();

    const bodyMorph = computeAnatomicalMorphParams(currentBody, isMale);
    const effectiveBottomLayerForFit = activeDress || currentOutfit.bottom;
    const isAnySlimFit =
      effectiveTopLayer.fitEase === 'slim' ||
      effectiveBottomLayerForFit.fitEase === 'slim' ||
      (hasOuter && currentOutfit.outerwear.fitEase === 'slim');
    updateBodySkinMeshSilhouette(gSys, isMale, bodyMorph, isAnySlimFit);

    const isWearingSkirtBottom =
      !currentOutfit.hideAllGarments &&
      !isMale &&
      (Boolean(activeDress) ||
        currentOutfit.bottom.styleId === 'aline_skirt' ||
        currentOutfit.bottom.styleId === 'pleated_maxi_skirt' ||
        currentOutfit.bottom.styleId === 'pencil_skirt');

    updateTopMeshSilhouette(
      gSys,
      effectiveTopStyle,
      effectiveTopLayer.fabric,
      isMale,
      bodyMorph,
      Boolean(topPhotoTex),
      topCut,
      Boolean(activeDress),
      isWearingSkirtBottom,
      effectiveTopLayer.fitEase
    );
    applyStyledGarmentToMeshes(
      activeSlot.topMeshes,
      hasTop ? effectiveTopLayer.colorHex : surf.colorHex,
      effectiveTopLayer.secondaryColorHex,
      hasTop ? effectiveTopLayer.fabric : null,
      activeDress ? `dress_${activeDress.styleId}` : `top_${effectiveTopStyle}`,
      effectiveTopLayer.weavePattern,
      true,
      146,
      109
    );
    if (!hasTop) {
      activeSlot.topMeshes.forEach((tm) => {
        const mat = tm.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.bumpMap = null;
          mat.bumpScale = 0;
          mat.roughness = Math.max(0.28, surf.roughness - dewyHighlight * 0.16);
        }
      });
    }

    const topFabMeta = FABRIC_LIBRARY[effectiveTopLayer.fabric];
    const prevTopOverBump = Boolean(activeSlot.topOverlayMat.bumpMap);
    activeSlot.topOverlayMat.color.set(
      effectiveTopLayer.secondaryColorHex || effectiveTopLayer.colorHex
    );
    activeSlot.topOverlayMat.roughness = topFabMeta.roughness;
    activeSlot.topOverlayMat.metalness = topFabMeta.metalness;
    activeSlot.topOverlayMat.bumpMap = getFabricBumpTexture(
      effectiveTopLayer.fabric
    );
    activeSlot.topOverlayMat.bumpScale = topFabMeta.normalScale * 0.015;
    if (!prevTopOverBump) {
      activeSlot.topOverlayMat.needsUpdate = true;
    }

    gSys.peplumWaistMesh.visible =
      hasTop &&
      !isMale &&
      !activeDress &&
      effectiveTopStyle === 'peplum_waist_top' &&
      !topPhotoTex;

    const outerPhotoTex = hasOuter
      ? getUploadedGarmentTexture(currentOutfit.outerwear.uploadedTextureUrl)
      : null;
    gSys.outerShaderUniforms.uHasPhotoTex.value = outerPhotoTex ? 1.0 : 0.0;
    gSys.outerShaderUniforms.uPhotoTex.value =
      outerPhotoTex || getDummyWhiteTexture();

    if (hasOuter && gSys.outerwearSkinnedMesh) {
      const outerPrimaryCol = new THREE.Color(currentOutfit.outerwear.colorHex);
      const outerTrimCol = currentOutfit.outerwear.secondaryColorHex
        ? new THREE.Color(currentOutfit.outerwear.secondaryColorHex)
        : outerPrimaryCol
            .clone()
            .offsetHSL(
              0,
              0,
              outerPrimaryCol.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? -0.16 : 0.18
            );
      gSys.outerShaderUniforms.uTrimColor.value
        .copy(outerTrimCol)
        .convertSRGBToLinear();

      updateOuterwearMeshSilhouette(
        gSys,
        currentOutfit.outerwear.styleId,
        currentOutfit.outerwear.fabric,
        isMale,
        bodyMorph,
        currentOutfit.outerwear.fitEase
      );
      applyStyledGarmentToMeshes(
        [gSys.outerwearSkinnedMesh],
        currentOutfit.outerwear.colorHex,
        currentOutfit.outerwear.secondaryColorHex,
        currentOutfit.outerwear.fabric,
        `outer_${currentOutfit.outerwear.styleId}`,
        currentOutfit.outerwear.weavePattern,
        true,
        142,
        112
      );
    } else if (gSys.outerwearSkinnedMesh) {
      gSys.outerwearSkinnedMesh.visible = false;
    }

    const outerFabMeta = FABRIC_LIBRARY[currentOutfit.outerwear.fabric];
    const prevOuterOverBump = Boolean(activeSlot.outerOverlayMat.bumpMap);
    const prevOuterOverMap = Boolean(activeSlot.outerOverlayMat.map);
    activeSlot.outerOverlayMat.color.set(
      outerPhotoTex ? '#FFFFFF' : currentOutfit.outerwear.colorHex
    );
    activeSlot.outerOverlayMat.map = outerPhotoTex || null;
    activeSlot.outerOverlayMat.roughness = outerFabMeta.roughness;
    activeSlot.outerOverlayMat.metalness = outerFabMeta.metalness;
    activeSlot.outerOverlayMat.bumpMap = getFabricBumpTexture(
      currentOutfit.outerwear.fabric
    );
    activeSlot.outerOverlayMat.bumpScale = outerFabMeta.normalScale * 0.015;
    if (!prevOuterOverBump || prevOuterOverMap !== Boolean(outerPhotoTex)) {
      activeSlot.outerOverlayMat.needsUpdate = true;
    }

    gSys.trenchOpenHemMesh.visible =
      hasOuter && currentOutfit.outerwear.styleId === 'trench_coat';
    gSys.blazerTailMesh.visible =
      hasOuter && currentOutfit.outerwear.styleId === 'tailored_blazer';

    // 4. Bottom Layer (or Dress Lower Skirt Layer)
    const effectiveBottomLayer = activeDress || currentOutfit.bottom;
    const effectiveBottomStyle: BottomStyleId = currentOutfit.hideAllGarments
      ? 'none'
      : dressParts
      ? dressParts.skirt
      : currentOutfit.bottom.styleId === 'none'
      ? 'none'
      : currentOutfit.bottom.styleId;
    const hasBottom = effectiveBottomStyle !== 'none';
    const activeBottomColor = hasBottom
      ? effectiveBottomLayer.colorHex
      : surf.colorHex;
    const activeBottomSecColor = hasBottom
      ? effectiveBottomLayer.secondaryColorHex
      : undefined;
    const activeBottomFabric: FabricType = hasBottom
      ? effectiveBottomLayer.fabric
      : 'denim';
    const activeBottomWeave = hasBottom
      ? effectiveBottomLayer.weavePattern
      : undefined;
    const activeBottomStyleTag = activeDress
      ? `dress_skirt_${activeDress.styleId}`
      : `bottom_${effectiveBottomStyle}`;

    const botPhotoTex = hasBottom
      ? getUploadedGarmentTexture(effectiveBottomLayer.uploadedTextureUrl)
      : null;
    gSys.bottomShaderUniforms.uIsDress.value = activeDress ? 1.0 : 0.0;
    gSys.bottomShaderUniforms.uHasPhotoTex.value = botPhotoTex ? 1.0 : 0.0;
    gSys.bottomShaderUniforms.uPhotoTex.value =
      botPhotoTex || getDummyWhiteTexture();

    const botPrimaryCol = new THREE.Color(activeBottomColor);
    const botTrimCol = activeBottomSecColor
      ? new THREE.Color(activeBottomSecColor)
      : botPrimaryCol
          .clone()
          .offsetHSL(
            0,
            0,
            botPrimaryCol.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? -0.15 : 0.16
          );
    gSys.bottomShaderUniforms.uTrimColor.value
      .copy(botTrimCol)
      .convertSRGBToLinear();

    updateBottomMeshSilhouette(
      gSys,
      effectiveBottomStyle,
      activeBottomFabric,
      isMale,
      bodyMorph,
      effectiveBottomLayer.fitEase
    );
    applyStyledGarmentToMeshes(
      activeSlot.bottomMeshes,
      activeBottomColor,
      activeBottomSecColor,
      activeBottomFabric,
      activeBottomStyleTag,
      activeBottomWeave,
      true,
      142,
      113
    );

    const botFabMeta = FABRIC_LIBRARY[activeBottomFabric];
    const botOrigMap = gSys.bottomMesh
      ? ((gSys.bottomMesh.material as THREE.MeshStandardMaterial)?.userData
          ?.origMap as THREE.Texture | null)
      : null;
    const prevBotOverMap = Boolean(activeSlot.bottomOverlayMat.map);
    const prevBotOverBump = Boolean(activeSlot.bottomOverlayMat.bumpMap);
    if (botPhotoTex) {
      activeSlot.bottomOverlayMat.map = botPhotoTex;
      activeSlot.bottomOverlayMat.color.set('#FFFFFF');
    } else if (botOrigMap) {
      activeSlot.bottomOverlayMat.map = getStyledGarmentTexture(
        botOrigMap,
        activeBottomColor,
        activeBottomSecColor,
        activeBottomFabric,
        activeBottomStyleTag,
        activeBottomWeave,
        142,
        113
      );
      activeSlot.bottomOverlayMat.color.set('#FFFFFF');
    } else {
      activeSlot.bottomOverlayMat.map = null;
      activeSlot.bottomOverlayMat.color.set(activeBottomColor);
    }
    activeSlot.bottomOverlayMat.roughness = botFabMeta.roughness;
    activeSlot.bottomOverlayMat.metalness = botFabMeta.metalness;
    activeSlot.bottomOverlayMat.envMapIntensity =
      activeBottomFabric === 'silk'
        ? 2.1
        : activeBottomFabric === 'leather'
        ? 2.3
        : 1.05;
    activeSlot.bottomOverlayMat.bumpMap =
      getFabricBumpTexture(activeBottomFabric);
    activeSlot.bottomOverlayMat.bumpScale = botFabMeta.normalScale * 0.015;
    if (
      prevBotOverMap !== Boolean(activeSlot.bottomOverlayMat.map) ||
      prevBotOverBump !== Boolean(activeSlot.bottomOverlayMat.bumpMap)
    ) {
      activeSlot.bottomOverlayMat.needsUpdate = true;
    }

    // Morph 3D skirt & waist overlay meshes to hug the sculpted waist, belly & hips while never shrinking narrower than skeletal hip bones
    const skirtFitMultiplier =
      effectiveBottomLayer.fitEase === 'slim'
        ? 0.975
        : effectiveBottomLayer.fitEase === 'oversized'
        ? 1.055
        : 1.0;
    const overlayScaleX = Math.max(
      0.98,
      Math.min(
        2.25,
        (1.0 +
          Math.max(-0.04, bodyMorph.waistDelta) * 0.48 +
          Math.max(-0.02, bodyMorph.hipDelta) * 0.68 +
          Math.max(-0.02, bodyMorph.massDelta) * 0.42) *
          skirtFitMultiplier
      )
    );
    const overlayScaleZ = Math.max(
      0.98,
      Math.min(
        2.25,
        (1.0 +
          Math.max(-0.04, bodyMorph.waistDelta) * 0.54 +
          Math.max(-0.02, bodyMorph.hipDelta) * 0.68 +
          Math.max(-0.02, bodyMorph.massDelta) * 0.46) *
          skirtFitMultiplier
      )
    );
    gSys.alineSkirtMesh.position.y = -0.115;
    gSys.maxiSkirtMesh.position.y = -0.245;
    gSys.pencilSkirtMesh.position.y = -0.175;

    gSys.alineSkirtMesh.scale.set(overlayScaleX, 1.0, overlayScaleZ);
    gSys.maxiSkirtMesh.scale.set(overlayScaleX, 1.0, overlayScaleZ);
    gSys.pencilSkirtMesh.scale.set(overlayScaleX, 1.0, overlayScaleZ);
    gSys.peplumWaistMesh.scale.set(
      (1.0 + bodyMorph.waistDelta * 0.68 + bodyMorph.massDelta * 0.32) *
        skirtFitMultiplier,
      1,
      (1.0 + bodyMorph.waistDelta * 0.74 + bodyMorph.massDelta * 0.36) *
        skirtFitMultiplier
    );
    gSys.trenchOpenHemMesh.scale.set(overlayScaleX, 1, overlayScaleZ);
    gSys.blazerTailMesh.scale.set(overlayScaleX, 1, overlayScaleZ);

    gSys.alineSkirtMesh.visible =
      hasBottom && !isMale && effectiveBottomStyle === 'aline_skirt';
    gSys.maxiSkirtMesh.visible =
      hasBottom && !isMale && effectiveBottomStyle === 'pleated_maxi_skirt';
    gSys.pencilSkirtMesh.visible =
      hasBottom && !isMale && effectiveBottomStyle === 'pencil_skirt';

    // 5. Footwear Layer Selection + 3D Architectural Sculpting & Multi-Part Footwear Shader
    const effectiveShoeStyle: FootwearStyleId =
      currentOutfit.hideAllGarments || currentOutfit.footwear.styleId === 'none'
        ? 'none'
        : currentOutfit.footwear.styleId;
    const hasShoes = effectiveShoeStyle !== 'none';
    const activeShoeColor = hasShoes
      ? currentOutfit.footwear.colorHex
      : surf.colorHex;

    updateFootwearMeshSilhouette(
      gSys,
      effectiveShoeStyle,
      activeShoeColor,
      isMale
    );
    activeSlot.footwearMeshes.forEach((shoeMesh) => {
      shoeMesh.visible = true;
      const mat = shoeMesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        const prevMap = Boolean(mat.map);
        const prevBump = Boolean(mat.bumpMap);
        mat.map = null;
        mat.color.set('#FFFFFF');
        mat.bumpMap = getFabricBumpTexture('leather');
        mat.bumpScale = hasShoes ? 0.0025 : 0.0;
        if (prevMap !== Boolean(mat.map) || prevBump !== Boolean(mat.bumpMap)) {
          mat.needsUpdate = true;
        }
      }
    });

    // 6. Pure Stature & Shoulder/Hip Skeleton Morphing (NEVER stretches scene.scale in X/Z!)
    const baseStatureCm = isMale ? 178 : 168;
    const clampedHeightCm = Math.min(300, Math.max(100, currentBody.heightCm));
    const rawHeightRatio = clampedHeightCm / baseStatureCm;
    const heightScale = 0.64 + 0.36 * rawHeightRatio;

    // Only scale vertical stature on Y; X and Z stay 1.0 because all body thickness & 3-ring curves
    // are sculpted directly on the 3D anatomical vertices above!
    activeSlot.scene.scale.set(1, heightScale, 1);

    // Counter-scale the Head bone vertically so the face/head stays naturally round at any height,
    // while adding subtle cheek/jaw fullness horizontally when weight changes.
    const headBone = activeSlot.bonesByName.get('Head');
    if (headBone) {
      const headScaleY = 1 / Math.max(0.65, Math.min(1.45, Math.pow(heightScale, 0.72)));
      const faceMassScaleXZ = Math.max(
        0.92,
        Math.min(1.14, 1.0 + bodyMorph.massDelta * 0.08 + bodyMorph.waistDelta * 0.03)
      );
      headBone.scale.set(faceMassScaleXZ, headScaleY, faceMassScaleXZ);
    }

    const lShoulder = activeSlot.bonesByName.get('LeftShoulder');
    const rShoulder = activeSlot.bonesByName.get('RightShoulder');
    if (lShoulder && rShoulder) {
      const shoulderBoneShift =
        (isMale ? 0.165 : 0.142) *
        (bodyMorph.shoulderDelta * 0.32 +
          bodyMorph.chestDelta * 0.28 +
          bodyMorph.massDelta * 0.24 +
          (bodyMorph.armSkeletalScale - 1.0) * 0.18);
      lShoulder.position.x = activeSlot.baseLeftShoulderX + shoulderBoneShift;
      rShoulder.position.x = activeSlot.baseRightShoulderX - shoulderBoneShift;
    }

    const lUpLeg = activeSlot.bonesByName.get('LeftUpLeg');
    const rUpLeg = activeSlot.bonesByName.get('RightUpLeg');
    if (lUpLeg && rUpLeg) {
      const hipBoneShift = isWearingSkirtBottom
        ? 0
        : (isMale ? 0.098 : 0.092) *
          (bodyMorph.hipDelta * 0.14 +
            bodyMorph.thighDelta * 0.12 +
            bodyMorph.massDelta * 0.10);
      lUpLeg.position.x = activeSlot.baseLeftUpLegX + hipBoneShift;
      rUpLeg.position.x = activeSlot.baseRightUpLegX - hipBoneShift;
    }

    // 7. Measurement Tape Rings
    const chestRatio = currentBody.chestCm / (isMale ? 96 : 84);
    const waistRatio = currentBody.waistCm / (isMale ? 76 : 62);
    const hipRatio = currentBody.hipCm / (isMale ? 94 : 90);
    measurementRingsGroup.visible = currentShowRings;
    chestRing.position.y = 1.28 * heightScale;
    waistRing.position.y = 1.10 * heightScale;
    hipRing.position.y = 0.91 * heightScale;
    chestRing.scale.set(chestRatio, 1, chestRatio);
    waistRing.scale.set(waistRatio, 1, waistRatio);
    hipRing.scale.set(hipRatio, 1, hipRatio);

    // 8. 3D Accessories Material & Style Sync
    updateAccessoryMaterialsAndStyles(activeSlot.accessorySystem, currentOutfit);
  };

  // Load Female GLBs first (lazy-loading Male GLB on demand when user switches gender)
  Promise.all([
    loader.loadAsync('/models/rpm_female_1.glb'),
    loader.loadAsync('/models/rpm_female_2.glb'),
    loader.loadAsync('/models/F_Standing_Idle_001.glb'),
    loader.loadAsync('/models/F_Walk_002.glb'),
  ])
    .then(([female1Gltf, female2Gltf, fIdleGltf, fWalkGltf]) => {
      const f1Parts = classifyAndPrepareSkinnedMeshes(female1Gltf.scene);
      const f2Parts = classifyAndPrepareSkinnedMeshes(female2Gltf.scene);

      // Extract the clean, single-piece ReadyPlayerMe hair mesh from rpm_female_2.glb
      const sourceCleanHair = f2Parts.hairMeshes[0] || f1Parts.hairMeshes[0];
      cachedSourceCleanHair = sourceCleanHair;
      const f1TwoBunchHair = f1Parts.hairMeshes[0] || null;

      f1Parts.hairMeshes.forEach((m) => {
        m.visible = false;
      });

      const buildSlotFromParts = (
        scene: THREE.Group,
        parts: ReturnType<typeof classifyAndPrepareSkinnedMeshes>,
        twoBunchHair: THREE.SkinnedMesh | null,
        idleGltf: { animations: THREE.AnimationClip[] },
        walkGltf: { animations: THREE.AnimationClip[] },
        isMale: boolean
      ): CharacterRigSlot => {
        const headBone = parts.bonesByName.get('Head')!;
        const baseHeadSkinColor = sampleBaseSkinColorFromHead(
          parts.skinMeshes
        );
        const { mesh: cleanSinglePieceHair, basePos: cleanBasePos } =
          cloneCleanHairOntoCharacterSkeleton(
            sourceCleanHair,
            parts.bonesByName,
            scene,
            isMale
          );

        const hairSystem = createHeadHairSystem(
          headBone,
          cleanSinglePieceHair,
          cleanBasePos,
          twoBunchHair,
          isMale
        );

        let makeupUniforms: MakeupShaderUniforms | null = null;
        if (!isMale) {
          const eyeLandmark = new THREE.Vector3(0.0315, 1.545, 0.088);
          const mouthLandmark = new THREE.Vector3(0.0235, 1.482, 0.102);

          if (parts.eyeMeshes.length > 0) {
            const eyeGeo = parts.eyeMeshes[0].geometry;
            eyeGeo.computeBoundingBox();
            // Important: Wolf3D_Eyes contains BOTH left (x > 0) and right (x < 0) eyeballs in one mesh,
            // so boundingBox.getCenter().x is ~0.0 (nose bridge). Scan single-side vertices (vx > 0.005)
            // to compute the true single eyeball center (~0.0315m)!
            const posAttr = eyeGeo.attributes.position;
            if (posAttr && posAttr.count > 0) {
              let sumAbsX = 0;
              let sumY = 0;
              let sumZ = 0;
              let maxZ = -Infinity;
              let count = 0;
              for (let i = 0; i < posAttr.count; i++) {
                const vx = Math.abs(posAttr.getX(i));
                if (vx > 0.005) {
                  const vy = posAttr.getY(i);
                  const vz = posAttr.getZ(i);
                  sumAbsX += vx;
                  sumY += vy;
                  sumZ += vz;
                  if (vz > maxZ) maxZ = vz;
                  count++;
                }
              }
              if (count > 0) {
                const avgX = Math.max(0.0285, Math.min(0.036, sumAbsX / count));
                const avgY = sumY / count;
                const frontZ = Number.isFinite(maxZ) ? maxZ - 0.004 : sumZ / count;
                eyeLandmark.set(avgX, avgY, frontZ);
              }
            } else if (eyeGeo.boundingBox) {
              const c = new THREE.Vector3();
              eyeGeo.boundingBox.getCenter(c);
              const singleX = Math.max(0.031, eyeGeo.boundingBox.max.x * 0.68);
              eyeLandmark.set(singleX, c.y, c.z);
            }
          }
          if (parts.teethMeshes.length > 0) {
            const teethGeo = parts.teethMeshes[0].geometry;
            teethGeo.computeBoundingBox();
            if (teethGeo.boundingBox) {
              const c = new THREE.Vector3();
              teethGeo.boundingBox.getCenter(c);
              const halfMouthW = Math.max(
                0.022,
                Math.min(
                  0.028,
                  (teethGeo.boundingBox.max.x - teethGeo.boundingBox.min.x) * 0.52
                )
              );
              mouthLandmark.set(halfMouthW, c.y + 0.002, c.z + 0.012);
            }
          } else {
            mouthLandmark.set(0.0235, eyeLandmark.y - 0.064, eyeLandmark.z + 0.015);
          }

          makeupUniforms = {
            uEnableMakeup: { value: 1.0 },
            uEyeLandmark: { value: eyeLandmark },
            uMouthLandmark: { value: mouthLandmark },
            uLipColor: { value: new THREE.Color('#E0534E').convertSRGBToLinear() },
            uBlushColor: { value: new THREE.Color('#F28B82').convertSRGBToLinear() },
            uEyeshadowColor: { value: new THREE.Color('#C87D65').convertSRGBToLinear() },
            uMakeupWeights1: { value: new THREE.Vector4(0.72, 0.78, 0.52, 0.45) },
            uMakeupWeights2: { value: new THREE.Vector4(0.55, 0.6, 0.0, 0.0) },
          };

          parts.skinMeshes.forEach((skinMesh) => {
            if (skinMesh.name.toLowerCase().includes('head')) {
              const headDeinterleaved = deinterleaveSkinnedGeometry(
                skinMesh.geometry,
                0,
                false
              );
              skinMesh.geometry = headDeinterleaved.geo;
              const headMat = skinMesh.material as THREE.MeshStandardMaterial;
              if (headMat && makeupUniforms) {
                attachFemaleMakeupShader(headMat, makeupUniforms);
              }
            }
          });
        }

        const topOverlayMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#F3EFE6'),
          roughness: 0.5,
          metalness: 0.04,
          side: THREE.DoubleSide,
        });
        const outerOverlayMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#D6C7B2'),
          roughness: 0.55,
          metalness: 0.04,
          side: THREE.DoubleSide,
        });
        const bottomOverlayMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#2B4C7E'),
          roughness: 0.6,
          metalness: 0.02,
          side: THREE.DoubleSide,
        });
        const garmentSystem = buildSkinnedGarmentSystem(
          scene,
          parts,
          topOverlayMat,
          outerOverlayMat,
          bottomOverlayMat,
          baseHeadSkinColor,
          isMale
        );

        const applyRootSpaceCalibration = (
          boneName: string,
          degX: number,
          degY: number,
          degZ: number
        ) => {
          const b = parts.bonesByName.get(boneName);
          if (!b) return;
          const e = new THREE.Euler(
            THREE.MathUtils.degToRad(degX),
            THREE.MathUtils.degToRad(degY),
            THREE.MathUtils.degToRad(degZ),
            'XYZ'
          );
          const qDeltaRoot = new THREE.Quaternion().setFromEuler(e);
          const qParentW = new THREE.Quaternion();
          if (b.parent) {
            b.parent.getWorldQuaternion(qParentW);
            const qSceneW = new THREE.Quaternion();
            scene.getWorldQuaternion(qSceneW);
            qParentW.premultiply(qSceneW.invert());
          }
          const qParentWInv = qParentW.clone().invert();
          const qLocal = qParentWInv.multiply(qDeltaRoot).multiply(qParentW);
          b.quaternion.premultiply(qLocal);
          b.updateMatrixWorld(true);
        };

        // Compute eye & nose-bridge front landmark in pure GLB bind pose BEFORE Neck/Head bone calibration
        // because eyeMeshes & skinMeshes geometry vertices are stored in bind-pose space!
        scene.updateMatrixWorld(true);
        const eyeBindScenePos = new THREE.Vector3(
          isMale ? 0.033 : 0.031,
          isMale ? 1.655 : 1.545,
          isMale ? 0.105 : 0.098
        );
        if (parts.eyeMeshes.length > 0) {
          const eGeo = parts.eyeMeshes[0].geometry;
          eGeo.computeBoundingBox();
          if (eGeo.boundingBox) {
            const c = new THREE.Vector3();
            eGeo.boundingBox.getCenter(c);
            // Use the front surface of the cornea (boundingBox.max.z) rather than the eyeball center
            let maxCorneaAndBridgeZ = Math.max(
              c.z + 0.015,
              eGeo.boundingBox.max.z + 0.003
            );
            // Also scan head skin vertices across the eye & nose-bridge band (|x| < 0.045, |y - c.y| < 0.014)
            // so sunglasses always sit in front of eyelids, brow ridge, and corneas (never letting eyeballs poke through!)
            parts.skinMeshes.forEach((sm) => {
              const posAttr = sm.geometry.attributes.position;
              if (!posAttr) return;
              for (let i = 0; i < posAttr.count; i++) {
                const vx = posAttr.getX(i);
                const vy = posAttr.getY(i);
                const vz = posAttr.getZ(i);
                if (
                  Math.abs(vx) < 0.045 &&
                  Math.abs(vy - c.y) < 0.014 &&
                  vz > maxCorneaAndBridgeZ
                ) {
                  maxCorneaAndBridgeZ = vz;
                }
              }
            });
            eyeBindScenePos.set(Math.abs(c.x), c.y, maxCorneaAndBridgeZ);
          }
        }
        const eyeWorld = eyeBindScenePos.clone().applyMatrix4(scene.matrixWorld);
        const eyeLocalInHead = headBone.worldToLocal(eyeWorld.clone());
        const accessorySystem = createAccessoryRigSystem(
          scene,
          headBone,
          eyeLocalInHead,
          isMale
        );

        // 1. Calibrate lower body & head to capture the symmetric Default T-Pose (`tPoseBaseQuats`)
        // Keep LeftUpLeg, RightUpLeg, LeftLeg, RightLeg, LeftFoot, RightFoot at exact vertical alignment
        // (computing any residual bind-pose femur/tibia horizontal deviation from landmarks so hip->knee->ankle is 100% plumb vertical)
        const lm = garmentSystem.landmarks;
        const femurDy = Math.max(0.25, lm.hipPos[1] - lm.kneePos[1]);
        const tibiaDy = Math.max(0.25, lm.kneePos[1] - lm.anklePos[1]);
        const femurStraightenDegZ = THREE.MathUtils.radToDeg(
          Math.atan2(lm.kneePos[0] - lm.hipPos[0], femurDy)
        );
        const tibiaStraightenDegZ = THREE.MathUtils.radToDeg(
          Math.atan2(lm.anklePos[0] - lm.kneePos[0], tibiaDy)
        );
        applyRootSpaceCalibration('LeftUpLeg', 0, 0, -femurStraightenDegZ);
        applyRootSpaceCalibration('LeftLeg', 0, 0, -(tibiaStraightenDegZ - femurStraightenDegZ));
        applyRootSpaceCalibration('LeftFoot', 0, 0, tibiaStraightenDegZ);
        applyRootSpaceCalibration('RightUpLeg', 0, 0, femurStraightenDegZ);
        applyRootSpaceCalibration('RightLeg', 0, 0, tibiaStraightenDegZ - femurStraightenDegZ);
        applyRootSpaceCalibration('RightFoot', 0, 0, -tibiaStraightenDegZ);
        if (isMale) {
          applyRootSpaceCalibration('Neck', -8, 0, 0);
          applyRootSpaceCalibration('Head', 6, 0, 0);
        }

        // Lift arms slightly outward from native GLB bind pose into a crisp, symmetric 3D Mannequin T-Pose
        applyRootSpaceCalibration('LeftArm', -4, 0, 22);
        applyRootSpaceCalibration('RightArm', -4, 0, -22);
        applyRootSpaceCalibration('LeftForeArm', -4, 0, 4);
        applyRootSpaceCalibration('RightForeArm', -4, 0, -4);

        const tPoseBaseQuats = new Map<string, THREE.Quaternion>();
        parts.bonesByName.forEach((bone, name) => {
          tPoseBaseQuats.set(name, bone.quaternion.clone());
        });

        // 2. Now transition from T-Pose to the natural relaxed standing pose (`standingBaseQuats`) for fashion presets
        applyRootSpaceCalibration('LeftForeArm', 4, 0, -4);
        applyRootSpaceCalibration('RightForeArm', 4, 0, 4);
        applyRootSpaceCalibration('LeftArm', 4, 0, -22);
        applyRootSpaceCalibration('RightArm', 4, 0, 22);

        applyRootSpaceCalibration('LeftArm', 12, 0, isMale ? -24 : -25);
        applyRootSpaceCalibration('RightArm', 12, 0, isMale ? 24 : 25);
        applyRootSpaceCalibration('LeftForeArm', 6, 0, -4);
        applyRootSpaceCalibration('RightForeArm', 6, 0, 4);

        const standingBaseQuats = new Map<string, THREE.Quaternion>();
        const standingBasePos = new Map<string, THREE.Vector3>();
        const animPreDeltaQuats = new Map<string, THREE.Quaternion>();
        parts.bonesByName.forEach((bone, name) => {
          standingBaseQuats.set(name, bone.quaternion.clone());
          standingBasePos.set(name, bone.position.clone());
          animPreDeltaQuats.set(name, bone.quaternion.clone());
        });

        // Keep Hips horizontally centered at X=0, Z=0 in standing base pose
        const hipsBaseP = standingBasePos.get('Hips');
        if (hipsBaseP) {
          hipsBaseP.x = 0;
        }
        scene.position.set(0, 0, 0);
        scene.rotation.set(0, 0, 0);

        const mixer = new THREE.AnimationMixer(scene);
        const idleClip = idleGltf.animations[0] || null;
        const walkClip = walkGltf.animations[0] || null;

        const idleAction = idleClip ? mixer.clipAction(idleClip) : null;
        const walkAction = walkClip ? mixer.clipAction(walkClip) : null;

        const lShoulder = parts.bonesByName.get('LeftShoulder');
        const rShoulder = parts.bonesByName.get('RightShoulder');
        const lUpLeg = parts.bonesByName.get('LeftUpLeg');
        const rUpLeg = parts.bonesByName.get('RightUpLeg');

        return {
          scene,
          bonesByName: parts.bonesByName,
          tPoseBaseQuats,
          standingBaseQuats,
          standingBasePos,
          animPreDeltaQuats,
          mixer,
          idleAction,
          walkAction,
          baseLeftShoulderX: lShoulder ? lShoulder.position.x : 0.055,
          baseRightShoulderX: rShoulder ? rShoulder.position.x : -0.055,
          baseLeftUpLegX: lUpLeg ? lUpLeg.position.x : 0.092,
          baseRightUpLegX: rUpLeg ? rUpLeg.position.x : -0.092,
          baseHeadSkinColor,
          skinMeshes: parts.skinMeshes,
          eyeMeshes: parts.eyeMeshes,
          topMeshes: parts.topMeshes,
          bottomMeshes: parts.bottomMeshes,
          footwearMeshes: parts.footwearMeshes,
          hairSystem,
          garmentSystem,
          accessorySystem,
          makeupUniforms,
          topOverlayMat,
          outerOverlayMat,
          bottomOverlayMat,
        };
      };

      buildSlotHelper = buildSlotFromParts;
      femaleSlot = buildSlotFromParts(
        female1Gltf.scene,
        f1Parts,
        f1TwoBunchHair,
        fIdleGltf,
        fWalkGltf,
        false
      );

      root.add(femaleSlot.scene);
      syncAllAppearance();
    })
    .catch((err) => {
      console.error('Failed to load human GLB models:', err);
    });

  const _qDeltaRoot = new THREE.Quaternion();
  const _qParentWorld = new THREE.Quaternion();
  const _qParentWorldInv = new THREE.Quaternion();
  const _qLocalDelta = new THREE.Quaternion();
  const _vBoneWorld = new THREE.Vector3();
  const _mRootInv = new THREE.Matrix4();
  const _eTemp = new THREE.Euler();
  let waveClock = 0;

  const updateAnimation = (
    dt: number,
    posePreset: PosePresetId,
    weather: WeatherEffectConfig = DEFAULT_WEATHER_EFFECT
  ) => {
    const isMale = currentBody?.genderProfile === 'male';
    const activeSlot = isMale ? maleSlot : femaleSlot;
    if (!activeSlot) return;

    waveClock += dt;

    const isWindActive =
      weather.mode === 'wind' || weather.mode === 'storm';
    const isRainActive =
      weather.mode === 'rain' || weather.mode === 'storm';
    const windFactor = isWindActive
      ? THREE.MathUtils.clamp(weather.windIntensity / 100, 0, 1)
      : 0;
    const rainFactor = isRainActive
      ? THREE.MathUtils.clamp(weather.rainIntensity / 100, 0, 1)
      : 0;
    const windRad = THREE.MathUtils.degToRad(weather.windDirectionDeg || 0);
    const windDirX = Math.cos(windRad);
    const windDirZ = Math.sin(windRad);

    if (posePreset === 'catwalk_walk') {
      if (activeSlot.idleAction?.isRunning()) activeSlot.idleAction.stop();
      // Restore pre-delta animation quaternions before mixer.update so manual joint offsets never accumulate
      activeSlot.bonesByName.forEach((bone, name) => {
        const q = activeSlot.animPreDeltaQuats.get(name);
        if (q) bone.quaternion.copy(q);
      });
      if (activeSlot.walkAction && !activeSlot.walkAction.isRunning()) {
        activeSlot.walkAction.reset().play();
      }
      activeSlot.mixer.update(dt);
      // Lock Hips horizontal position (X, Z) to the studio center so root-motion in F_Walk_002 / M_Walk_001
      // never walks the mannequin forward into/past the camera or off-center!
      activeSlot.bonesByName.forEach((bone, name) => {
        activeSlot.animPreDeltaQuats.get(name)?.copy(bone.quaternion);
        const baseP = activeSlot.standingBasePos.get(name);
        if (baseP) {
          if (name === 'Hips') {
            bone.position.x = baseP.x;
            bone.position.z = baseP.z;
            bone.position.y = THREE.MathUtils.clamp(
              bone.position.y,
              baseP.y - 0.035,
              baseP.y + 0.035
            );
          } else {
            bone.position.copy(baseP);
          }
        }
      });
    } else {
      if (activeSlot.walkAction?.isRunning()) activeSlot.walkAction.stop();
      if (activeSlot.idleAction?.isRunning()) activeSlot.idleAction.stop();

      // Use the symmetric Default T-Pose (`tPoseBaseQuats`) when `posePreset === 'stand_still'`,
      // and the relaxed standing pose (`standingBaseQuats`) for other presets.
      const sourceQuats =
        posePreset === 'stand_still'
          ? activeSlot.tPoseBaseQuats
          : activeSlot.standingBaseQuats;

      activeSlot.bonesByName.forEach((bone, name) => {
        const baseQ = sourceQuats.get(name);
        if (baseQ) bone.quaternion.copy(baseQ);
        const baseP = activeSlot.standingBasePos.get(name);
        if (baseP) bone.position.copy(baseP);
      });
    }

    // Seated Pose Detection & Automatic 3D Studio Stool Grounding
    // When both thighs are flexed forward (e.g., 'đang ngồi bắt chéo chân'), lower Hips onto the studio stool
    const lHipRx = joints.leftHip.rotation.x;
    const rHipRx = joints.rightHip.rotation.x;
    const lKneeRx = joints.leftKnee.rotation.x;
    const rKneeRx = joints.rightKnee.rotation.x;
    const avgHipFlex = (lHipRx + rHipRx) * 0.5;
    const avgKneeFlex = (lKneeRx + rKneeRx) * 0.5;
    const seatProgress =
      posePreset !== 'catwalk_walk' &&
      lHipRx < -0.58 &&
      rHipRx < -0.58 &&
      avgKneeFlex > 0.55
        ? THREE.MathUtils.clamp((-avgHipFlex - 0.55) / 0.72, 0, 1)
        : 0;

    const hipsBone = activeSlot.bonesByName.get('Hips');
    const hipsBaseP = activeSlot.standingBasePos.get('Hips');
    if (hipsBone && hipsBaseP && seatProgress > 0.01) {
      hipsBone.position.y = hipsBaseP.y - seatProgress * 0.36;
      hipsBone.position.z = hipsBaseP.z - seatProgress * 0.035;
    }
    const baseStatureCm = isMale ? 178 : 168;
    const clampedHeightCm = currentBody
      ? Math.min(300, Math.max(100, currentBody.heightCm))
      : baseStatureCm;
    const heightScale = 0.64 + 0.36 * (clampedHeightCm / baseStatureCm);
    studioStoolGroup.visible = seatProgress > 0.25;
    if (studioStoolGroup.visible) {
      studioStoolGroup.scale.set(1, heightScale, 1);
    }

    // Re-apply shoulder & hip/leg skeletal lateral shifts after bone position reset
    if (currentBody) {
      const animMorph = computeAnatomicalMorphParams(currentBody, isMale);
      const shoulderBoneShift =
        (isMale ? 0.165 : 0.142) *
        (animMorph.shoulderDelta * 0.28 +
          animMorph.chestDelta * 0.24 +
          animMorph.massDelta * 0.18 +
          (animMorph.armSkeletalScale - 1.0) * 0.18);
      const lShoulder = activeSlot.bonesByName.get('LeftShoulder');
      const rShoulder = activeSlot.bonesByName.get('RightShoulder');
      if (lShoulder) {
        lShoulder.position.x =
          activeSlot.baseLeftShoulderX + shoulderBoneShift;
      }
      if (rShoulder) {
        rShoulder.position.x =
          activeSlot.baseRightShoulderX - shoulderBoneShift;
      }

      const isWearingDressOrSkirt =
        !isMale &&
        !currentOutfit?.hideAllGarments &&
        ((currentOutfit?.dress && currentOutfit.dress.styleId !== 'none') ||
          currentOutfit?.bottom?.styleId === 'aline_skirt' ||
          currentOutfit?.bottom?.styleId === 'pleated_maxi_skirt' ||
          currentOutfit?.bottom?.styleId === 'pencil_skirt');
      const hipBoneShift =
        isWearingDressOrSkirt || posePreset === 'stand_still'
          ? 0
          : (isMale ? 0.098 : 0.092) *
            (animMorph.hipDelta * 0.14 +
              animMorph.thighDelta * 0.12 +
              animMorph.massDelta * 0.10);
      const lUpLeg = activeSlot.bonesByName.get('LeftUpLeg');
      const rUpLeg = activeSlot.bonesByName.get('RightUpLeg');
      if (lUpLeg) {
        lUpLeg.position.x = activeSlot.baseLeftUpLegX + hipBoneShift;
      }
      if (rUpLeg) {
        rUpLeg.position.x = activeSlot.baseRightUpLegX - hipBoneShift;
      }
    }

    activeSlot.scene.updateMatrixWorld(true);
    _mRootInv.copy(root.matrixWorld).invert();
    const rootQuat = new THREE.Quaternion();
    root.getWorldQuaternion(rootQuat);
    const rootQuatInv = rootQuat.clone().invert();

    const isBreathingIdle =
      posePreset === 'natural_idle' ||
      posePreset === 'turn_360' ||
      posePreset === 'greeting_wave' ||
      windFactor > 0.05;
    const breathPhase = Math.sin(waveClock * 2.1);

    // Natural outward arm & leg skeletal clearance when torso, biceps & thighs are fuller
    // Disabled in `stand_still` and on legs when wearing dresses/skirts so legs remain 100% vertical and parallel
    const activeMorph = currentBody
      ? computeAnatomicalMorphParams(currentBody, isMale)
      : null;
    const isWearingSkirtOrDressNow =
      !isMale &&
      !currentOutfit?.hideAllGarments &&
      ((currentOutfit?.dress && currentOutfit.dress.styleId !== 'none') ||
        currentOutfit?.bottom?.styleId === 'aline_skirt' ||
        currentOutfit?.bottom?.styleId === 'pleated_maxi_skirt' ||
        currentOutfit?.bottom?.styleId === 'pencil_skirt');
    const armClearanceRad =
      activeMorph && posePreset !== 'stand_still'
        ? Math.min(
            0.34,
            Math.max(
              0,
              activeMorph.waistDelta * 0.36 +
                activeMorph.bicepDelta * 0.28 +
                activeMorph.massDelta * 0.38
            ) * 0.25
          )
        : 0;
    const legClearanceRad =
      activeMorph && posePreset !== 'stand_still' && !isWearingSkirtOrDressNow
        ? Math.min(
            0.05,
            Math.max(
              0,
              activeMorph.thighDelta * 0.32 +
                activeMorph.hipDelta * 0.18 +
                activeMorph.massDelta * 0.20
            ) * 0.04
          )
        : 0;

    allJointIds.forEach((jId) => {
      const bName = JOINT_TO_GLB_BONE_NAME[jId];
      const glbBone = activeSlot.bonesByName.get(bName);
      if (!glbBone) return;

      const proxyRot = joints[jId].rotation;
      let rx = proxyRot.x;
      const ry = proxyRot.y;
      let rz = proxyRot.z;

      if (armClearanceRad > 1e-4) {
        if (jId === 'leftShoulder') {
          rz += armClearanceRad;
        } else if (jId === 'rightShoulder') {
          rz -= armClearanceRad;
        }
      }
      if (legClearanceRad > 1e-4) {
        if (jId === 'leftHip') {
          rz += legClearanceRad;
        } else if (jId === 'rightHip') {
          rz -= legClearanceRad;
        }
      }

      // Subtle, symmetric procedural breathing in natural_idle / turn_360 / greeting_wave
      if (isBreathingIdle) {
        if (jId === 'chest') {
          rx -= breathPhase * 0.025;
        } else if (jId === 'spine') {
          rx += breathPhase * 0.012;
        } else if (jId === 'leftShoulder') {
          rz -= breathPhase * 0.012;
        } else if (jId === 'rightShoulder') {
          rz += breathPhase * 0.012;
        }
      }

      // Add smooth waving oscillation on forearm & wrist when in `greeting_wave` mode
      if (posePreset === 'greeting_wave') {
        if (jId === 'rightElbow') {
          rz += Math.sin(waveClock * 4.8) * 0.14;
        } else if (jId === 'rightWrist') {
          rz += Math.sin(waveClock * 4.8 - 0.35) * 0.18;
          rx += Math.cos(waveClock * 4.8) * 0.06;
        }
      }

      if (
        Math.abs(rx) > 1e-4 ||
        Math.abs(ry) > 1e-4 ||
        Math.abs(rz) > 1e-4
      ) {
        _eTemp.set(rx, ry, rz, proxyRot.order);
        _qDeltaRoot.setFromEuler(_eTemp);

        if (glbBone.parent) {
          glbBone.parent.getWorldQuaternion(_qParentWorld);
          _qParentWorld.premultiply(rootQuatInv);
        } else {
          _qParentWorld.identity();
        }

        _qParentWorldInv.copy(_qParentWorld).invert();
        _qLocalDelta
          .copy(_qParentWorldInv)
          .multiply(_qDeltaRoot)
          .multiply(_qParentWorld);

        glbBone.quaternion.premultiply(_qLocalDelta);
        glbBone.updateMatrixWorld(true);
      }

      glbBone.getWorldPosition(_vBoneWorld);
      _vBoneWorld.applyMatrix4(_mRootInv);
      jointFollowers[jId].position.copy(_vBoneWorld);
    });

    // ==========================================================================
    // Real-Time Pose-Aware 3D Accessory Alignment (Watch, Handbag, Sunglasses)
    // ==========================================================================
    const accSys = activeSlot.accessorySystem;
    const accCfg = currentOutfit?.accessories || DEFAULT_ACCESSORIES;
    const mSceneInv = new THREE.Matrix4()
      .copy(activeSlot.scene.matrixWorld)
      .invert();

    const lElRot = joints.leftElbow.rotation;
    const rElRot = joints.rightElbow.rotation;
    const lShRot = joints.leftShoulder.rotation;
    const rShRot = joints.rightShoulder.rotation;

    const isLeftHandOnHip =
      (posePreset === 'lookbook_pose' || posePreset === 'greeting_wave') &&
      Math.abs(THREE.MathUtils.radToDeg(lElRot.z) + 54) < 28;
    const isRightHandOnHip =
      posePreset === 'editorial_crossed' &&
      Math.abs(THREE.MathUtils.radToDeg(rElRot.z) - 54) < 28;
    const isRightWaving =
      posePreset === 'greeting_wave' ||
      THREE.MathUtils.radToDeg(rShRot.x) < -30 ||
      THREE.MathUtils.radToDeg(rElRot.x) < -68;
    const isLeftRaisedFront =
      posePreset === 'editorial_crossed' ||
      (THREE.MathUtils.radToDeg(lElRot.x) < -36 &&
        !isLeftHandOnHip &&
        THREE.MathUtils.radToDeg(lShRot.x) > -60);
    const isRightBentCrook =
      THREE.MathUtils.radToDeg(rElRot.x) < -36 &&
      !isRightHandOnHip &&
      !isRightWaving &&
      THREE.MathUtils.radToDeg(rShRot.x) > -60;

    // 1. Align Wristwatch to Active Forearm/Wrist Bone
    if (accSys.watchRoot.visible) {
      let watchSide: 'left' | 'right' = 'left';
      if (accCfg.watch.wristSide !== 'auto') {
        watchSide = accCfg.watch.wristSide;
      } else if (posePreset === 'greeting_wave') {
        watchSide = 'right';
      } else if (posePreset === 'editorial_crossed' || isLeftRaisedFront) {
        watchSide = 'left';
      } else if (posePreset === 'lookbook_pose' || isLeftHandOnHip) {
        watchSide = 'left';
      } else if (Math.abs(rElRot.x) > Math.abs(lElRot.x) + 0.31) {
        watchSide = 'right';
      }

      const foreArmBone = activeSlot.bonesByName.get(
        watchSide === 'left' ? 'LeftForeArm' : 'RightForeArm'
      );
      const handBone = activeSlot.bonesByName.get(
        watchSide === 'left' ? 'LeftHand' : 'RightHand'
      );

      if (foreArmBone && handBone) {
        const pFore = new THREE.Vector3();
        const pHand = new THREE.Vector3();
        foreArmBone.getWorldPosition(pFore).applyMatrix4(mSceneInv);
        handBone.getWorldPosition(pHand).applyMatrix4(mSceneInv);

        // Place watch at 82% down the forearm right at the anatomical wrist
        accSys.watchRoot.position.lerpVectors(pFore, pHand, 0.82);

        const armDir = new THREE.Vector3()
          .subVectors(pHand, pFore)
          .normalize();

        // Compute the dorsal (top / outer-front) wrist normal directly in character scene space
        // so the watch dial (+Z of watchRoot) ALWAYS sits on TOP of the wrist (`mặt đồng hồ ở trên`)
        // instead of being flipped underneath by GLB bone roll!
        const horizFactor =
          1.0 - THREE.MathUtils.smoothstep(Math.abs(armDir.y), 0.35, 0.88);
        const outSign = watchSide === 'left' ? 1 : -1;
        const dorsalGuess = new THREE.Vector3(
          outSign * THREE.MathUtils.lerp(0.45, 0.08, horizFactor),
          THREE.MathUtils.lerp(0.62, 0.92, horizFactor),
          THREE.MathUtils.lerp(0.64, 0.42, horizFactor)
        ).normalize();
        const sideAxis = new THREE.Vector3()
          .crossVectors(armDir, dorsalGuess)
          .normalize();
        const trueDorsal = new THREE.Vector3()
          .crossVectors(sideAxis, armDir)
          .normalize();
        if (trueDorsal.y < -0.05 && trueDorsal.z < 0.15) {
          trueDorsal.negate();
          sideAxis.negate();
        }

        const rotMat = new THREE.Matrix4().makeBasis(
          sideAxis,
          armDir,
          trueDorsal
        );
        accSys.watchRoot.quaternion.setFromRotationMatrix(rotMat);

        // Scale watch strap radially with forearm girth + sleeve clearance
        const hasLongSleeve =
          currentOutfit &&
          !currentOutfit.hideAllGarments &&
          (currentOutfit.outerwear.styleId !== 'none' ||
            currentOutfit.top.styleId === 'oxford_shirt' ||
            currentOutfit.top.styleId === 'hoodie_street' ||
            currentOutfit.top.styleId === 'turtleneck_knit' ||
            currentOutfit.top.styleId === 'female_turtleneck' ||
            currentOutfit.top.styleId === 'crop_cardigan' ||
            currentOutfit.top.styleId === 'silk_blouse_bow');
        const sleeveBoost = hasLongSleeve ? 1.10 : 1.0;
        const forearmRadScale =
          (isMale ? 1.12 : 1.0) *
          sleeveBoost *
          (activeMorph
            ? Math.max(
                0.84,
                Math.min(
                  1.72,
                  1.0 +
                    activeMorph.forearmDelta * 0.56 +
                    activeMorph.massDelta * 0.18
                )
              )
            : 1.0);
        accSys.watchRoot.scale.set(
          forearmRadScale,
          1.0,
          forearmRadScale
        );
      }
    }

    // 2. Align Handbag to Active Arm / Hand / Shoulder with Gravity Stabilization
    if (accSys.handbagRoot.visible) {
      let handbagSide: 'left' | 'right' = 'right';
      let carryMode: 'hand_held' | 'crook_of_arm' | 'shoulder_bag' =
        'hand_held';

      const isHandHeldProp =
        accCfg.handbag.styleId === 'pro_basketball' ||
        accCfg.handbag.styleId === 'art_toy_plush' ||
        accCfg.handbag.styleId === 'fashion_umbrella';

      if (isHandHeldProp && accCfg.handbag.carryMode === 'auto') {
        carryMode = 'hand_held';
        handbagSide =
          accCfg.handbag.armSide === 'auto'
            ? isRightWaving
              ? 'left'
              : 'right'
            : accCfg.handbag.armSide;
      } else if (
        accCfg.handbag.styleId === 'crossbody_messenger' &&
        accCfg.handbag.carryMode === 'auto'
      ) {
        carryMode = 'shoulder_bag';
        handbagSide =
          accCfg.handbag.armSide === 'auto'
            ? isRightWaving
              ? 'left'
              : 'right'
            : accCfg.handbag.armSide;
      } else if (
        accCfg.handbag.styleId === 'quilted_chain_flap' &&
        accCfg.handbag.carryMode === 'auto' &&
        posePreset === 'catwalk_walk'
      ) {
        carryMode = 'shoulder_bag';
        handbagSide =
          accCfg.handbag.armSide === 'auto' ? 'left' : accCfg.handbag.armSide;
      } else {
        if (accCfg.handbag.armSide !== 'auto') {
          handbagSide = accCfg.handbag.armSide;
        } else if (posePreset === 'editorial_crossed' || isLeftRaisedFront) {
          handbagSide = 'left';
        } else if (posePreset === 'greeting_wave') {
          handbagSide = 'left';
        } else if (posePreset === 'lookbook_pose' || isLeftHandOnHip) {
          handbagSide = 'right';
        } else if (isRightBentCrook && !isLeftRaisedFront) {
          handbagSide = 'right';
        } else {
          handbagSide = 'right';
        }

        if (accCfg.handbag.carryMode !== 'auto') {
          carryMode = accCfg.handbag.carryMode;
        } else if (
          posePreset === 'editorial_crossed' &&
          handbagSide === 'left'
        ) {
          carryMode = 'crook_of_arm';
        } else if (posePreset === 'greeting_wave') {
          carryMode = 'shoulder_bag';
        } else if (
          (handbagSide === 'left' && isLeftRaisedFront) ||
          (handbagSide === 'right' && isRightBentCrook)
        ) {
          carryMode = 'crook_of_arm';
        } else if (
          (handbagSide === 'left' && isLeftHandOnHip) ||
          (handbagSide === 'right' && isRightHandOnHip)
        ) {
          carryMode = 'shoulder_bag';
        } else {
          carryMode = 'hand_held';
        }
      }

      // Toggle short top handle vs long shoulder strap visibility
      const isShoulderCarry = carryMode === 'shoulder_bag';
      accSys.handbagShoulderStraps.forEach((s) => {
        s.visible = isShoulderCarry;
      });
      accSys.handbagTopHandles.forEach((h) => {
        h.visible = !isShoulderCarry;
      });

      const sideSign = handbagSide === 'left' ? 1 : -1;
      const armBone = activeSlot.bonesByName.get(
        handbagSide === 'left' ? 'LeftArm' : 'RightArm'
      );
      const foreArmBone = activeSlot.bonesByName.get(
        handbagSide === 'left' ? 'LeftForeArm' : 'RightForeArm'
      );
      const handBone = activeSlot.bonesByName.get(
        handbagSide === 'left' ? 'LeftHand' : 'RightHand'
      );

      // Compute extra lateral clearance when hips/thighs/waist are fuller or wearing a flared skirt / dress
      const hasActiveDress =
        currentOutfit &&
        !isMale &&
        !currentOutfit.hideAllGarments &&
        currentOutfit.dress &&
        currentOutfit.dress.styleId !== 'none';
      const skirtClearance =
        currentOutfit &&
        !currentOutfit.hideAllGarments &&
        (hasActiveDress ||
          currentOutfit.bottom.styleId === 'aline_skirt' ||
          currentOutfit.bottom.styleId === 'pleated_maxi_skirt')
          ? 0.032
          : 0.0;
      const bodyMassClearance = activeMorph
        ? Math.max(
            0,
            activeMorph.hipDelta * 0.045 +
              activeMorph.waistDelta * 0.04 +
              activeMorph.massDelta * 0.045
          )
        : 0;

      if (foreArmBone && handBone && armBone) {
        const pArm = new THREE.Vector3();
        const pFore = new THREE.Vector3();
        const pHand = new THREE.Vector3();
        armBone.getWorldPosition(pArm).applyMatrix4(mSceneInv);
        foreArmBone.getWorldPosition(pFore).applyMatrix4(mSceneInv);
        handBone.getWorldPosition(pHand).applyMatrix4(mSceneInv);

        if (carryMode === 'shoulder_bag') {
          // Hang from shoulder down to upper hip height with lateral clearance
          accSys.handbagRoot.position.set(
            pArm.x + sideSign * (0.042 + bodyMassClearance + skirtClearance * 0.6),
            pArm.y - 0.34,
            pArm.z + 0.015
          );
          const walkSway =
            posePreset === 'catwalk_walk'
              ? Math.sin(waveClock * 5.2) * 0.06
              : 0;
          accSys.handbagRoot.rotation.set(
            walkSway,
            sideSign * 0.18,
            sideSign * 0.08
          );
        } else if (carryMode === 'crook_of_arm') {
          // Hook top handle at 38% along forearm (inner elbow crook), bag body hangs vertically
          accSys.handbagRoot.position.lerpVectors(pFore, pHand, 0.38);
          accSys.handbagRoot.position.x +=
            sideSign * (0.034 + bodyMassClearance * 0.7 + skirtClearance * 0.5);
          accSys.handbagRoot.position.y += 0.012;
          accSys.handbagRoot.position.z += 0.018;

          const foreVec = new THREE.Vector3().subVectors(pHand, pFore);
          const yaw = Math.atan2(foreVec.x, foreVec.z) * 0.35;
          accSys.handbagRoot.rotation.set(
            0.03,
            yaw + sideSign * 0.22,
            sideSign * 0.07
          );
        } else {
          // 'hand_held': Grip at palm/fingers (112% along forearm->hand), hanging straight down under gravity
          accSys.handbagRoot.position.lerpVectors(pFore, pHand, 1.12);
          accSys.handbagRoot.position.x +=
            sideSign * (0.036 + bodyMassClearance * 0.8 + skirtClearance);
          accSys.handbagRoot.position.z += 0.012;

          const walkSwingX =
            posePreset === 'catwalk_walk'
              ? Math.sin(waveClock * 5.4) * 0.11
              : 0;
          accSys.handbagRoot.rotation.set(
            walkSwingX,
            sideSign * 0.32,
            sideSign * 0.06
          );
        }

        // Guarantee minimum lateral clearance outside the hip/thigh/skirt silhouette so the handbag never clips
        const minSafeHipRadius =
          (isMale ? 0.195 : 0.185) + bodyMassClearance + skirtClearance;
        if (Math.abs(accSys.handbagRoot.position.x) < minSafeHipRadius) {
          accSys.handbagRoot.position.x = sideSign * minSafeHipRadius;
        }
      }
    }

    // ==========================================================================
    // Real-Time 3D Weather Effects (Wind & Rain) on Garment Drape & Thickness
    // ==========================================================================
    const gSys = activeSlot.garmentSystem;
    const hSys = activeSlot.hairSystem;
    const animDress =
      currentOutfit &&
      !isMale &&
      !currentOutfit.hideAllGarments &&
      currentOutfit.dress &&
      currentOutfit.dress.styleId !== 'none'
        ? currentOutfit.dress
        : null;
    const topFabric: FabricType =
      animDress?.fabric || currentOutfit?.top.fabric || 'cotton';
    const outerFabric: FabricType = currentOutfit?.outerwear.fabric || 'fleece';
    const botFabric: FabricType =
      animDress?.fabric || currentOutfit?.bottom.fabric || 'denim';

    const topPhys = FABRIC_PHYSICS_META[topFabric];
    const outerPhys = FABRIC_PHYSICS_META[outerFabric];
    const botPhys = FABRIC_PHYSICS_META[botFabric];

    const baseOverlayScaleX = activeMorph
      ? Math.max(
          0.98,
          Math.min(
            2.15,
            1.0 +
              Math.max(-0.04, activeMorph.waistDelta) * 0.46 +
              Math.max(-0.02, activeMorph.hipDelta) * 0.68 +
              Math.max(-0.02, activeMorph.massDelta) * 0.36
          )
        )
      : 1.0;
    const baseOverlayScaleZ = activeMorph
      ? Math.max(
          0.98,
          Math.min(
            2.15,
            1.0 +
              Math.max(-0.04, activeMorph.waistDelta) * 0.54 +
              Math.max(-0.02, activeMorph.hipDelta) * 0.68 +
              Math.max(-0.02, activeMorph.massDelta) * 0.38
          )
        )
      : 1.0;

    // 1. Skirt, Peplum, Trench & Silk Bow Drape under Wind + Rain + Seated Lap Gravity + Pose/Walk Leg Stride
    const botWetDampen = 1.0 - rainFactor * botPhys.waterAbsorption * 0.38;
    const botWindAmp = windFactor * botPhys.drapeCoeff * botWetDampen;
    const botFlutter =
      windFactor > 0.01
        ? (Math.sin(waveClock * botPhys.windFlutterFreq) * 0.65 +
            Math.sin(waveClock * botPhys.windFlutterFreq * 1.73 + 1.1) * 0.35) *
          botWindAmp
        : 0;

    // Real-time leg stride & abduction compensation so skirts/dresses drape over posed or walking legs without clipping
    const lHipRot = joints.leftHip.rotation;
    const rHipRot = joints.rightHip.rotation;
    const walkStridePhase =
      posePreset === 'catwalk_walk' ? Math.sin(waveClock * 5.2) * 0.22 : 0;
    const legScissorZ =
      Math.abs(lHipRot.x - rHipRot.x) * 0.42 +
      Math.max(0, Math.abs(lHipRot.x), Math.abs(rHipRot.x)) * 0.24 +
      Math.abs(walkStridePhase) * 0.55;
    const legAbductX =
      (Math.abs(lHipRot.z) + Math.abs(rHipRot.z)) * 0.48 +
      legClearanceRad * 0.65;
    const legPitchFollowX =
      (lHipRot.x + rHipRot.x) * 0.38 + walkStridePhase * 0.25;
    const legRollFollowZ = (lHipRot.z + rHipRot.z) * 0.32;

    // Wet rain cling pulls high-drape/absorbent skirts closer to the legs; wind & leg stride billow them outward
    const botWetCling =
      rainFactor * (0.04 + botPhys.drapeCoeff * 0.095) * (0.4 + botPhys.waterAbsorption * 0.6);
    const botWindBillowX =
      windFactor * botPhys.drapeCoeff * (0.06 + Math.abs(windDirX) * 0.14) +
      Math.abs(botFlutter) * 0.08 +
      legAbductX;
    const botWindBillowZ =
      windFactor * botPhys.drapeCoeff * (0.06 + Math.abs(windDirZ) * 0.14) +
      Math.abs(botFlutter) * 0.08 +
      legScissorZ;

    const dynSkirtScaleX = Math.max(
      baseOverlayScaleX * 1.0,
      baseOverlayScaleX * (1.0 - botWetCling * 0.35 + botWindBillowX)
    );
    const dynSkirtScaleY = 1.0 + rainFactor * botPhys.waterAbsorption * 0.035;
    const dynSkirtScaleZ = Math.max(
      baseOverlayScaleZ * 1.0,
      baseOverlayScaleZ * (1.0 - botWetCling * 0.35 + botWindBillowZ)
    );

    const seatedSkirtTiltX =
      seatProgress > 0.02 ? avgHipFlex * 0.62 : legPitchFollowX;
    const windTiltZ =
      legRollFollowZ +
      (windDirX * botWindAmp * 0.24 + botFlutter * windDirX * 0.11) *
        (1.0 - seatProgress * 0.45);
    const windTiltX =
      seatedSkirtTiltX +
      (windDirZ * botWindAmp * 0.22 + botFlutter * windDirZ * 0.10) *
        (1.0 - seatProgress * 0.45);

    [gSys.alineSkirtMesh, gSys.maxiSkirtMesh, gSys.pencilSkirtMesh].forEach(
      (skirtMesh, idx) => {
        const lengthFactor = idx === 1 ? 1.25 : idx === 2 ? 0.72 : 1.0;
        skirtMesh.scale.set(
          dynSkirtScaleX,
          dynSkirtScaleY,
          dynSkirtScaleZ
        );
        skirtMesh.rotation.set(
          windTiltX * lengthFactor,
          botFlutter * 0.06,
          windTiltZ * lengthFactor
        );
        const baseY = idx === 0 ? -0.115 : idx === 1 ? -0.245 : -0.175;
        skirtMesh.position.set(
          windDirX * botWindAmp * 0.022 * lengthFactor,
          baseY + (seatProgress > 0.02 ? seatProgress * 0.045 : 0),
          windDirZ * botWindAmp * 0.022 * lengthFactor +
            (seatProgress > 0.02 ? seatProgress * 0.065 : 0)
        );
      }
    );

    // Outerwear Trench Coat Open Hem wind & rain response
    const outerWetDampen = 1.0 - rainFactor * outerPhys.waterAbsorption * 0.35;
    const outerWindAmp = windFactor * outerPhys.drapeCoeff * outerWetDampen;
    const outerFlutter =
      windFactor > 0.01
        ? Math.sin(waveClock * outerPhys.windFlutterFreq + 0.6) * outerWindAmp
        : 0;
    const outerWetCling =
      rainFactor * (0.03 + outerPhys.drapeCoeff * 0.07) * outerPhys.waterAbsorption;
    gSys.trenchOpenHemMesh.scale.set(
      baseOverlayScaleX *
        (1.0 - outerWetCling + outerWindAmp * 0.14 + Math.abs(outerFlutter) * 0.06),
      1.0 + rainFactor * outerPhys.waterAbsorption * 0.025,
      baseOverlayScaleZ *
        (1.0 - outerWetCling + outerWindAmp * 0.14 + Math.abs(outerFlutter) * 0.06)
    );
    gSys.trenchOpenHemMesh.rotation.set(
      seatedSkirtTiltX * 0.75 + windDirZ * outerWindAmp * 0.2 + outerFlutter * 0.08,
      outerFlutter * 0.05,
      windDirX * outerWindAmp * 0.22 + outerFlutter * 0.09
    );

    // Top Peplum Waist & Silk Ribbon Bow wind/rain response
    const topWetDampen = 1.0 - rainFactor * topPhys.waterAbsorption * 0.35;
    const topWindAmp = windFactor * topPhys.drapeCoeff * topWetDampen;
    const topFlutter =
      windFactor > 0.01
        ? Math.sin(waveClock * topPhys.windFlutterFreq + 1.4) * topWindAmp
        : 0;
    const pepBaseX = activeMorph
      ? 1.0 + activeMorph.waistDelta * 0.68 + activeMorph.massDelta * 0.32
      : 1.0;
    const pepBaseZ = activeMorph
      ? 1.0 + activeMorph.waistDelta * 0.74 + activeMorph.massDelta * 0.36
      : 1.0;
    gSys.peplumWaistMesh.scale.set(
      pepBaseX * (1.0 + topWindAmp * 0.12 + Math.abs(topFlutter) * 0.05),
      1.0,
      pepBaseZ * (1.0 + topWindAmp * 0.12 + Math.abs(topFlutter) * 0.05)
    );
    gSys.peplumWaistMesh.rotation.set(
      windDirZ * topWindAmp * 0.15 + topFlutter * 0.07,
      0,
      windDirX * topWindAmp * 0.16 + topFlutter * 0.08
    );

    if (gSys.blouseBowGroup.visible) {
      gSys.blouseBowGroup.rotation.set(
        windDirZ * topWindAmp * 0.28 + topFlutter * 0.16 - rainFactor * 0.12,
        topFlutter * 0.14,
        windDirX * topWindAmp * 0.32 + topFlutter * 0.18
      );
    }

    // Skinned Garments (`topMesh`, `outerwearSkinnedMesh`, `bottomMesh`) subtle wind ripple & wet cling
    if (gSys.topMesh) {
      const topRipple =
        1.0 +
        topWindAmp * 0.025 * Math.sin(waveClock * topPhys.windFlutterFreq) -
        rainFactor * topPhys.drapeCoeff * 0.018;
      gSys.topMesh.scale.set(topRipple, 1.0, topRipple);
    }
    if (gSys.outerwearSkinnedMesh && gSys.outerwearSkinnedMesh.visible) {
      const outerRipple =
        1.0 +
        outerWindAmp * 0.032 * Math.sin(waveClock * outerPhys.windFlutterFreq + 0.8) -
        rainFactor * outerPhys.drapeCoeff * 0.015;
      gSys.outerwearSkinnedMesh.scale.set(outerRipple, 1.0, outerRipple);
    }
    if (gSys.bottomMesh) {
      const botRipple =
        1.0 +
        botWindAmp * 0.028 * Math.sin(waveClock * botPhys.windFlutterFreq + 0.4) -
        rainFactor * botPhys.drapeCoeff * 0.02;
      gSys.bottomMesh.scale.set(botRipple, 1.0, botRipple);
    }

    // 2. Hair & Handbag Wind Sway
    const hairGust =
      windFactor > 0.01
        ? (0.65 + 0.35 * Math.sin(waveClock * 8.5)) * windFactor
        : 0;
    const hairPitch = windDirZ * hairGust * 0.24 - rainFactor * 0.06;
    const hairRoll = windDirX * hairGust * 0.26;
    hSys.ponytailAttachment.rotation.set(hairPitch * 1.2, 0, hairRoll * 1.2);
    hSys.longBackHairAttachment.rotation.set(hairPitch, 0, hairRoll);
    hSys.himeSideLocksAttachment.rotation.set(hairPitch * 0.9, 0, hairRoll * 0.9);
    hSys.butterflyWingsAttachment.rotation.set(hairPitch * 0.95, 0, hairRoll * 0.95);
    hSys.mulletTailAttachment.rotation.set(hairPitch * 0.85, 0, hairRoll * 0.85);
    hSys.maleCrownLocksAttachment.rotation.set(
      hairPitch * 0.45,
      0,
      hairRoll * 0.45
    );

    if (accSys.handbagRoot.visible) {
      accSys.handbagBodyPivot.rotation.set(
        windDirZ * windFactor * 0.18 +
          Math.sin(waveClock * 6.2) * windFactor * 0.06,
        0,
        windDirX * windFactor * 0.20 +
          Math.cos(waveClock * 5.8) * windFactor * 0.06
      );
    }

    // 3. Rain Wet Surface Physics (GPU Shader uWetness + Roughness Gloss & Absorbent Darkening)
    gSys.topShaderUniforms.uWetness.value =
      rainFactor * (0.48 + topPhys.waterAbsorption * 0.52);
    gSys.outerShaderUniforms.uWetness.value =
      rainFactor * (0.48 + outerPhys.waterAbsorption * 0.52);
    gSys.bottomShaderUniforms.uWetness.value =
      rainFactor * (0.48 + botPhys.waterAbsorption * 0.52);

    const applyWetnessToMat = (
      mat: THREE.MeshStandardMaterial | null | undefined,
      fabric: FabricType,
      dryColorHex?: string
    ) => {
      if (!mat) return;
      const baseMeta = FABRIC_LIBRARY[fabric];
      const phys = FABRIC_PHYSICS_META[fabric];
      const wetRoughness = Math.max(
        0.09,
        baseMeta.roughness * (1.0 - rainFactor * (0.58 + (1.0 - phys.waterAbsorption) * 0.28))
      );
      mat.roughness = wetRoughness;
      mat.envMapIntensity =
        (fabric === 'silk' ? 2.1 : fabric === 'leather' ? 2.3 : 1.05) +
        rainFactor * 1.35;

      if (dryColorHex) {
        const dryCol = new THREE.Color(dryColorHex);
        const wetDarken =
          1.0 - rainFactor * (0.18 + phys.waterAbsorption * 0.34);
        mat.color.copy(dryCol).multiplyScalar(wetDarken);
      }
    };

    const dryTopOverlayHex =
      animDress?.secondaryColorHex ||
      animDress?.colorHex ||
      currentOutfit?.top.secondaryColorHex ||
      currentOutfit?.top.colorHex ||
      '#F3EFE6';
    const dryOuterOverlayHex = currentOutfit?.outerwear.colorHex || '#D6C7B2';
    const dryBotOverlayHex = activeSlot.bottomOverlayMat.map
      ? '#FFFFFF'
      : animDress?.colorHex || currentOutfit?.bottom.colorHex || '#2B4C7E';

    applyWetnessToMat(activeSlot.topOverlayMat, topFabric, dryTopOverlayHex);
    applyWetnessToMat(
      activeSlot.outerOverlayMat,
      outerFabric,
      dryOuterOverlayHex
    );
    applyWetnessToMat(
      activeSlot.bottomOverlayMat,
      botFabric,
      dryBotOverlayHex
    );
    activeSlot.topMeshes.forEach((m) =>
      applyWetnessToMat(m.material as THREE.MeshStandardMaterial, topFabric)
    );
    if (gSys.outerwearSkinnedMesh) {
      applyWetnessToMat(
        gSys.outerwearSkinnedMesh.material as THREE.MeshStandardMaterial,
        outerFabric
      );
    }
    activeSlot.bottomMeshes.forEach((m) =>
      applyWetnessToMat(m.material as THREE.MeshStandardMaterial, botFabric)
    );
  };

  const updateBodyMorph = (
    body: BodyMeasurements,
    outfit: OutfitConfiguration,
    showRings: boolean
  ) => {
    currentBody = body;
    currentOutfit = outfit;
    currentShowRings = showRings;
    syncAllAppearance();
  };

  const updateGarments = (
    outfit: OutfitConfiguration,
    body: BodyMeasurements,
    _anisotropy = maxAnisotropy
  ) => {
    currentOutfit = outfit;
    currentBody = body;
    syncAllAppearance();
  };

  const highlightJoint = (
    _selectedJoint: JointId | null,
    hoveredJoint: JointId | null
  ) => {
    allJointIds.forEach((id) => {
      const mesh = jointIndicators[id];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (id === hoveredJoint) {
        mat.color.setHex(0x2563eb);
        mat.opacity = 0.48;
        mesh.scale.setScalar(1.05);
      } else {
        mat.opacity = 0.0;
        mesh.scale.setScalar(1.0);
      }
    });
  };

  /**
   * Bakes the currently active 3D mannequin (including current body morph, 17-joint pose,
   * garments, hair attachments, and accessories) into a clean static `THREE.Group` of standard
   * `THREE.Mesh` objects so both `GLTFExporter` (.glb) and `USDZExporter` (.usdz for iOS AR Quick Look)
   * can export 100% of the model without skipping SkinnedMeshes or custom shaders.
   */
  const buildExportablePosedScene = (): THREE.Group => {
    const exportGroup = new THREE.Group();
    exportGroup.name = 'SmartWardrobe_AR_Mannequin';

    root.updateMatrixWorld(true);
    const rootWorldInv = new THREE.Matrix4().copy(root.matrixWorld).invert();

    const isObjectVisibleInHierarchy = (obj: THREE.Object3D): boolean => {
      let curr: THREE.Object3D | null = obj;
      while (curr) {
        if (!curr.visible) return false;
        curr = curr.parent;
      }
      return true;
    };

    const vTemp = new THREE.Vector3();
    const mMeshToRoot = new THREE.Matrix4();

    root.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      if (!isObjectVisibleInHierarchy(child)) return;
      if (
        child.userData?.isJointIndicator ||
        child.parent === measurementRingsGroup
      ) {
        return;
      }

      const srcMesh = child as THREE.Mesh;
      const srcMat = srcMesh.material as THREE.MeshStandardMaterial;
      if (!srcMat) return;
      if (srcMat.opacity === 0) return;

      // Clone into a clean standard PBR material (no custom onBeforeCompile shader hooks) for universal AR viewer compatibility
      const exportMat = new THREE.MeshStandardMaterial({
        name: srcMat.name || srcMesh.name || 'AR_Material',
        color: srcMat.color ? srcMat.color.clone() : new THREE.Color('#FFFFFF'),
        map: srcMat.map || null,
        roughness: THREE.MathUtils.clamp(srcMat.roughness ?? 0.5, 0.05, 1.0),
        metalness: THREE.MathUtils.clamp(srcMat.metalness ?? 0.05, 0.0, 1.0),
        side: THREE.DoubleSide,
      });

      mMeshToRoot.multiplyMatrices(rootWorldInv, srcMesh.matrixWorld);

      if ((srcMesh as THREE.SkinnedMesh).isSkinnedMesh) {
        const skinned = srcMesh as THREE.SkinnedMesh;
        const bakedGeo = skinned.geometry.clone();
        bakedGeo.deleteAttribute('skinIndex');
        bakedGeo.deleteAttribute('skinWeight');
        bakedGeo.deleteAttribute('aBindPos');

        const posAttr = bakedGeo.attributes.position;
        if (posAttr) {
          for (let i = 0; i < posAttr.count; i++) {
            skinned.getVertexPosition(i, vTemp);
            vTemp.applyMatrix4(mMeshToRoot);
            posAttr.setXYZ(i, vTemp.x, vTemp.y, vTemp.z);
          }
          posAttr.needsUpdate = true;
          bakedGeo.computeVertexNormals();
        }

        const staticMesh = new THREE.Mesh(bakedGeo, exportMat);
        staticMesh.name = skinned.name || 'PosedSkinnedPart';
        exportGroup.add(staticMesh);
      } else {
        const clonedGeo = srcMesh.geometry.clone();
        clonedGeo.applyMatrix4(mMeshToRoot);
        clonedGeo.computeVertexNormals();
        const staticMesh = new THREE.Mesh(clonedGeo, exportMat);
        staticMesh.name = srcMesh.name || 'AccessoryPart';
        exportGroup.add(staticMesh);
      }
    });

    return exportGroup;
  };

  return {
    root,
    joints,
    jointIndicators,
    skinMaterial,
    garmentGroups,
    measurementRingsGroup,
    updateBodyMorph,
    updateGarments,
    updateAnimation,
    highlightJoint,
    buildExportablePosedScene,
  };
}
