import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw,
  Sparkles,
  Check,
  Trash2,
  Save,
  Shuffle,
  Shirt,
  History,
  UserCheck,
  Wand2,
} from 'lucide-react';
import { ACCENT_COLORS, OCCASION_TYPES } from '../constants';
import {
  AccentColorKey,
  AuraOutfitRecommendation,
  GenderOption,
  OccasionType,
  SavedOutfit,
  WardrobeItem,
  WeatherContextData,
} from '../types';

interface MannequinTryOnStudioProps {
  gender: GenderOption;
  accentColor: AccentColorKey;
  themeMode: 'light' | 'dark';
  wardrobeItems: WardrobeItem[];
  savedOutfits: SavedOutfit[];
  weather: WeatherContextData;
  selectedOccasion: OccasionType;
  initialTryOnOutfit?: AuraOutfitRecommendation | null;
  onSaveTryOnHistory: (entry: {
    title: string;
    occasion: string;
    weatherNote: string;
    items: string[];
    auraAdvice: string;
    imageUrl?: string;
    styleTag?: string;
  }) => Promise<void>;
  onDeleteHistoryItem: (id: string) => Promise<void>;
}

/**
 * Helper to convert common Vietnamese color names into realistic 3D fabric hex colors.
 */
function resolveGarmentColorHex(colorText?: string, fallback = 0xd6d3d1): number {
  if (!colorText) return fallback;
  const lower = colorText.toLowerCase();
  if (lower.includes('đen') || lower.includes('black') || lower.includes('than')) return 0x262626;
  if (lower.includes('trắng') || lower.includes('white') || lower.includes('ivory') || lower.includes('sữa')) return 0xf5f5f4;
  if (lower.includes('beige') || lower.includes('kem') || lower.includes('be') || lower.includes('vàng')) return 0xdfd3be;
  if (lower.includes('nâu') || lower.includes('brown') || lower.includes('cafe')) return 0x6b4423;
  if (lower.includes('xanh navy') || lower.includes('navy') || lower.includes('chàm')) return 0x1e293b;
  if (lower.includes('xanh') || lower.includes('indigo') || lower.includes('denim')) return 0x3b5998;
  if (lower.includes('rêu') || lower.includes('lục') || lower.includes('emerald') || lower.includes('cốm')) return 0x3f6212;
  if (lower.includes('đỏ') || lower.includes('hồng') || lower.includes('rose')) return 0xbe123c;
  if (lower.includes('tím') || lower.includes('pastel')) return 0xc4b5fd;
  if (lower.includes('xám') || lower.includes('grey') || lower.includes('gray')) return 0x64748b;
  return fallback;
}

export const MannequinTryOnStudio: React.FC<MannequinTryOnStudioProps> = ({
  gender,
  accentColor,
  themeMode,
  wardrobeItems,
  savedOutfits,
  weather,
  selectedOccasion,
  initialTryOnOutfit,
  onSaveTryOnHistory,
  onDeleteHistoryItem,
}) => {
  const accent = ACCENT_COLORS[accentColor] || ACCENT_COLORS.amber;

  // Categorized items from user's wardrobe
  const topItems = wardrobeItems.filter(
    (i) => i.category === 'Áo' || i.category === 'Đầm & Váy liền'
  );
  const bottomItems = wardrobeItems.filter(
    (i) =>
      i.category === 'Quần' ||
      i.category === 'Chân váy' ||
      i.category === 'Quần & Chân váy' ||
      i.category === 'Đầm & Váy liền'
  );
  const outerItems = wardrobeItems.filter((i) => i.category === 'Áo khoác');
  const shoeItems = wardrobeItems.filter((i) => i.category === 'Giày dép');
  const accessoryItems = wardrobeItems.filter((i) => i.category === 'Phụ kiện');

  // Equipped items on Mannequin
  const [selectedTop, setSelectedTop] = useState<WardrobeItem | null>(topItems[0] || null);
  const [selectedBottom, setSelectedBottom] = useState<WardrobeItem | null>(bottomItems[0] || null);
  const [selectedOuter, setSelectedOuter] = useState<WardrobeItem | null>(outerItems[0] || null);
  const [selectedShoes, setSelectedShoes] = useState<WardrobeItem | null>(shoeItems[0] || null);
  const [selectedAccessory, setSelectedAccessory] = useState<WardrobeItem | null>(
    accessoryItems[0] || null
  );

  // Apply initialTryOnOutfit when user clicks "Ướm thử lên Manocanh" from an Outfit Detail Modal
  useEffect(() => {
    if (!initialTryOnOutfit) return;
    const virtualTop: WardrobeItem = {
      id: `tryon_top_${initialTryOnOutfit.id || Date.now()}`,
      userId: 'current',
      name: initialTryOnOutfit.topName || initialTryOnOutfit.items[0] || initialTryOnOutfit.title,
      category: 'Áo',
      styleTag: initialTryOnOutfit.styleTag,
      color: initialTryOnOutfit.topColor || 'Trắng kem',
      season: 'Mọi thời tiết',
      occasion: (initialTryOnOutfit.occasion as OccasionType) || selectedOccasion,
      imageUrl: initialTryOnOutfit.topImageUrl || initialTryOnOutfit.imageUrl,
      favorite: true,
    };
    const virtualBottom: WardrobeItem = {
      id: `tryon_bottom_${initialTryOnOutfit.id || Date.now()}`,
      userId: 'current',
      name:
        initialTryOnOutfit.bottomName ||
        initialTryOnOutfit.items[1] ||
        (initialTryOnOutfit.isDressOrSkirt ? 'Chân váy phối kèm' : 'Quần phối kèm'),
      category: 'Quần & Chân váy',
      styleTag: initialTryOnOutfit.styleTag,
      color: initialTryOnOutfit.bottomColor || 'Đen',
      season: 'Mọi thời tiết',
      occasion: (initialTryOnOutfit.occasion as OccasionType) || selectedOccasion,
      imageUrl: initialTryOnOutfit.bottomImageUrl || initialTryOnOutfit.imageUrl,
      favorite: true,
    };
    setSelectedTop(virtualTop);
    setSelectedBottom(virtualBottom);
    setSelectedOuter(null);
    setCustomTitle(initialTryOnOutfit.title);
  }, [initialTryOnOutfit, selectedOccasion]);

  const [mannequinPose, setMannequinPose] = useState<'Nữ' | 'Nam' | 'Unisex'>(
    gender === 'Nam' ? 'Nam' : gender === 'Nữ' ? 'Nữ' : 'Unisex'
  );
  const [autoRotate, setAutoRotate] = useState(true);
  const [manualYaw, setManualYaw] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [historySortMode, setHistorySortMode] = useState<'newest' | 'oldest' | 'occasion'>('newest');
  const [historyOccasionFilter, setHistoryOccasionFilter] = useState<string>('Tất cả');

  const sortedHistoryOutfits = React.useMemo(() => {
    const parseTime = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val?.toMillis === 'function') return val.toMillis();
      if (typeof val?.seconds === 'number') return val.seconds * 1000;
      const parsed = Date.parse(String(val));
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const filtered = savedOutfits.filter((item) => {
      if (historyOccasionFilter === 'Tất cả') return true;
      return item.occasion === historyOccasionFilter;
    });

    return [...filtered].sort((a, b) => {
      const timeA = parseTime(a.createdAt);
      const timeB = parseTime(b.createdAt);
      if (historySortMode === 'newest') return timeB - timeA;
      if (historySortMode === 'oldest') return timeA - timeB;
      const occOrderA = OCCASION_TYPES.indexOf(a.occasion as OccasionType);
      const occOrderB = OCCASION_TYPES.indexOf(b.occasion as OccasionType);
      const rankA = occOrderA === -1 ? 99 : occOrderA;
      const rankB = occOrderB === -1 ? 99 : occOrderB;
      if (rankA !== rankB) return rankA - rankB;
      return timeB - timeA;
    });
  }, [savedOutfits, historySortMode, historyOccasionFilter]);

  // Sync defaults when wardrobe loads
  useEffect(() => {
    if (!selectedTop && topItems.length > 0) setSelectedTop(topItems[0]);
    if (!selectedBottom && bottomItems.length > 0) setSelectedBottom(bottomItems[0]);
    if (!selectedOuter && outerItems.length > 0) setSelectedOuter(outerItems[0]);
  }, [wardrobeItems]);

  // Three.js 3D Interactive Tailor Mannequin
  const mountRef = useRef<HTMLDivElement>(null);
  const mannequinStateRef = useRef({
    pose: mannequinPose,
    autoRotate,
    manualYaw,
    themeMode,
    topColor: resolveGarmentColorHex(selectedTop?.color, 0xe7dec8),
    bottomColor: resolveGarmentColorHex(selectedBottom?.color, 0x292524),
    outerColor: resolveGarmentColorHex(selectedOuter?.color, 0x334155),
    shoeColor: resolveGarmentColorHex(selectedShoes?.color, 0x451a03),
    hasTop: Boolean(selectedTop),
    hasBottom: Boolean(selectedBottom),
    hasOuter: Boolean(selectedOuter),
    hasAccessory: Boolean(selectedAccessory),
    isSkirt: Boolean(
      selectedBottom?.name.toLowerCase().includes('váy') ||
        selectedBottom?.name.toLowerCase().includes('đầm') ||
        selectedBottom?.name.toLowerCase().includes('yếm') ||
        selectedBottom?.name.toLowerCase().includes('skirt')
    ),
  });

  useEffect(() => {
    mannequinStateRef.current = {
      pose: mannequinPose,
      autoRotate,
      manualYaw,
      themeMode,
      topColor: resolveGarmentColorHex(selectedTop?.color, 0xe7dec8),
      bottomColor: resolveGarmentColorHex(selectedBottom?.color, 0x292524),
      outerColor: resolveGarmentColorHex(selectedOuter?.color, 0x334155),
      shoeColor: resolveGarmentColorHex(selectedShoes?.color, 0x451a03),
      hasTop: Boolean(selectedTop),
      hasBottom: Boolean(selectedBottom),
      hasOuter: Boolean(selectedOuter),
      hasAccessory: Boolean(selectedAccessory),
      isSkirt: Boolean(
        selectedBottom?.name.toLowerCase().includes('váy') ||
          selectedBottom?.name.toLowerCase().includes('đầm') ||
          selectedBottom?.name.toLowerCase().includes('yếm') ||
          selectedBottom?.name.toLowerCase().includes('skirt')
      ),
    };
  }, [
    mannequinPose,
    autoRotate,
    manualYaw,
    themeMode,
    selectedTop,
    selectedBottom,
    selectedOuter,
    selectedShoes,
    selectedAccessory,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 420;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    const bgHex = themeMode === 'dark' ? 0x141210 : 0xf8fafc;
    scene.background = new THREE.Color(bgHex);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(0, 1.85, 4.9);
    camera.lookAt(0, 1.65, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Materials
    const linenBodyMat = new THREE.MeshStandardMaterial({
      color: 0xede0ce,
      roughness: 0.72,
      metalness: 0.03,
    });
    const walnutWoodMat = new THREE.MeshStandardMaterial({
      color: 0x4a3222,
      roughness: 0.35,
      metalness: 0.1,
    });
    const brassMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.2,
      clearcoat: 0.6,
    });

    const topFabricMat = new THREE.MeshStandardMaterial({
      color: mannequinStateRef.current.topColor,
      roughness: 0.78,
      metalness: 0.04,
    });
    const bottomFabricMat = new THREE.MeshStandardMaterial({
      color: mannequinStateRef.current.bottomColor,
      roughness: 0.75,
      metalness: 0.04,
    });
    const outerFabricMat = new THREE.MeshStandardMaterial({
      color: mannequinStateRef.current.outerColor,
      roughness: 0.68,
      metalness: 0.06,
    });
    const shoeLeatherMat = new THREE.MeshStandardMaterial({
      color: mannequinStateRef.current.shoeColor,
      roughness: 0.32,
      metalness: 0.12,
    });

    // Composite 10-Part Procedural Tailor Mannequin (`THREE.Group`)
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Studio Pedestal Base & Brass Stand Pole
    const baseDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.68, 0.08, 32),
      walnutWoodMat
    );
    baseDisc.position.y = 0.04;
    baseDisc.receiveShadow = true;
    rootGroup.add(baseDisc);

    const brassRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.12, 24),
      brassMetalMat
    );
    brassRing.position.y = 0.12;
    rootGroup.add(brassRing);

    const centerPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 1.15, 16),
      brassMetalMat
    );
    centerPole.position.y = 0.65;
    rootGroup.add(centerPole);

    // 2. Sculpted Mannequin Torso (LatheGeometry)
    const torsoPoints = [
      new THREE.Vector2(0.04, 0),
      new THREE.Vector2(0.24, 0.08),
      new THREE.Vector2(0.26, 0.25), // Hips
      new THREE.Vector2(0.2, 0.52), // Waist
      new THREE.Vector2(0.27, 0.85), // Chest
      new THREE.Vector2(0.29, 1.02), // Shoulders
      new THREE.Vector2(0.09, 1.12), // Neck base
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 32);
    const torsoMesh = new THREE.Mesh(torsoGeo, linenBodyMat);
    torsoMesh.scale.set(1.08, 1, 0.72);
    torsoMesh.position.y = 1.18;
    torsoMesh.castShadow = true;
    rootGroup.add(torsoMesh);

    // 3. Neck & Turned Wood Finial Knob + Sculpted Egg Head
    const neckCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.085, 0.14, 24),
      walnutWoodMat
    );
    neckCollar.position.y = 2.34;
    rootGroup.add(neckCollar);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 28, 24),
      linenBodyMat
    );
    headMesh.scale.set(0.88, 1.22, 0.92);
    headMesh.position.y = 2.58;
    headMesh.castShadow = true;
    rootGroup.add(headMesh);

    const topFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 16, 16),
      brassMetalMat
    );
    topFinial.position.y = 2.79;
    rootGroup.add(topFinial);

    // 4. Articulated Left & Right Arms
    const armGroupLeft = new THREE.Group();
    armGroupLeft.position.set(-0.34, 2.15, 0);
    armGroupLeft.rotation.z = 0.14;
    rootGroup.add(armGroupLeft);

    const shoulderBallL = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 16, 16),
      walnutWoodMat
    );
    armGroupLeft.add(shoulderBallL);

    const upperArmL = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.052, 0.58, 8, 16),
      linenBodyMat
    );
    upperArmL.position.y = -0.34;
    armGroupLeft.add(upperArmL);

    const armGroupRight = armGroupLeft.clone();
    armGroupRight.position.set(0.34, 2.15, 0);
    armGroupRight.rotation.z = -0.14;
    rootGroup.add(armGroupRight);

    // 5.Garment Layer A: Top Shirt / Sweater Overlay
    const topGarmentGroup = new THREE.Group();
    rootGroup.add(topGarmentGroup);

    const topTorsoGeo = new THREE.LatheGeometry(
      torsoPoints.map((p) => new THREE.Vector2(p.x * 1.045, p.y)),
      32
    );
    const topTorsoMesh = new THREE.Mesh(topTorsoGeo, topFabricMat);
    topTorsoMesh.scale.set(1.09, 0.88, 0.74);
    topTorsoMesh.position.y = 1.32;
    topTorsoMesh.castShadow = true;
    topGarmentGroup.add(topTorsoMesh);

    const sleeveGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.44, 20);
    const sleeveL = new THREE.Mesh(sleeveGeo, topFabricMat);
    sleeveL.position.set(-0.36, 1.92, 0);
    sleeveL.rotation.z = 0.15;
    topGarmentGroup.add(sleeveL);

    const sleeveR = new THREE.Mesh(sleeveGeo, topFabricMat);
    sleeveR.position.set(0.36, 1.92, 0);
    sleeveR.rotation.z = -0.15;
    topGarmentGroup.add(sleeveR);

    // 6. Garment Layer B: Tailored Jacket / Blazer / Coat Overlay
    const outerGarmentGroup = new THREE.Group();
    rootGroup.add(outerGarmentGroup);

    // Open-front tailored jacket shell (phiLength < 2*PI so inner shirt shows in front)
    const jacketGeo = new THREE.CylinderGeometry(
      0.32,
      0.31,
      0.86,
      28,
      1,
      false,
      0.35,
      Math.PI * 2 - 0.7
    );
    const jacketMesh = new THREE.Mesh(jacketGeo, outerFabricMat);
    jacketMesh.scale.set(1.06, 1, 0.78);
    jacketMesh.position.y = 1.76;
    jacketMesh.rotation.y = Math.PI / 2;
    jacketMesh.castShadow = true;
    outerGarmentGroup.add(jacketMesh);

    const outerSleeveGeo = new THREE.CylinderGeometry(0.078, 0.068, 0.62, 20);
    const outerSleeveL = new THREE.Mesh(outerSleeveGeo, outerFabricMat);
    outerSleeveL.position.set(-0.37, 1.84, 0);
    outerSleeveL.rotation.z = 0.15;
    outerGarmentGroup.add(outerSleeveL);

    const outerSleeveR = new THREE.Mesh(outerSleeveGeo, outerFabricMat);
    outerSleeveR.position.set(0.37, 1.84, 0);
    outerSleeveR.rotation.z = -0.15;
    outerGarmentGroup.add(outerSleeveR);

    // 7. Garment Layer C: Bottom Trousers OR Pleated Skirt
    const trousersGroup = new THREE.Group();
    rootGroup.add(trousersGroup);

    const pelvisBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.28, 0.28, 28),
      bottomFabricMat
    );
    pelvisBand.scale.set(1.08, 1, 0.74);
    pelvisBand.position.y = 1.24;
    trousersGroup.add(pelvisBand);

    const legPantGeo = new THREE.CylinderGeometry(0.125, 0.105, 0.92, 24);
    const leftPant = new THREE.Mesh(legPantGeo, bottomFabricMat);
    leftPant.position.set(-0.135, 0.68, 0);
    leftPant.castShadow = true;
    trousersGroup.add(leftPant);

    const rightPant = new THREE.Mesh(legPantGeo, bottomFabricMat);
    rightPant.position.set(0.135, 0.68, 0);
    rightPant.castShadow = true;
    trousersGroup.add(rightPant);

    const skirtMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.44, 0.78, 32),
      bottomFabricMat
    );
    skirtMesh.scale.set(1.06, 1, 0.82);
    skirtMesh.position.y = 1.02;
    skirtMesh.castShadow = true;
    rootGroup.add(skirtMesh);

    // 8. Footwear Display Pair on Pedestal Base
    const shoeGeo = new THREE.BoxGeometry(0.13, 0.08, 0.28);
    const shoeL = new THREE.Mesh(shoeGeo, shoeLeatherMat);
    shoeL.position.set(-0.14, 0.12, 0.06);
    rootGroup.add(shoeL);

    const shoeR = new THREE.Mesh(shoeGeo, shoeLeatherMat);
    shoeR.position.set(0.14, 0.12, 0.06);
    rootGroup.add(shoeR);

    // 9. Crossbody Bag / Necklace Accessory Accent
    const accessoryGroup = new THREE.Group();
    const necklace = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.009, 12, 32),
      brassMetalMat
    );
    necklace.rotation.x = Math.PI / 2 + 0.25;
    necklace.position.set(0, 2.24, 0.02);
    accessoryGroup.add(necklace);
    rootGroup.add(accessoryGroup);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.95);
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    keyLight.position.set(3.5, 5.5, 4.5);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.7);
    rimLight.position.set(-3.5, 4.0, -3.0);
    scene.add(rimLight);

    const timer = new THREE.Timer();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.1);
      const st = mannequinStateRef.current;

      // Update background color smoothly on theme switch
      scene.background = new THREE.Color(st.themeMode === 'dark' ? 0x141210 : 0xf8fafc);

      // Update garment colors & visibility dynamically
      topFabricMat.color.setHex(st.topColor);
      bottomFabricMat.color.setHex(st.bottomColor);
      outerFabricMat.color.setHex(st.outerColor);
      shoeLeatherMat.color.setHex(st.shoeColor);

      topGarmentGroup.visible = st.hasTop;
      outerGarmentGroup.visible = st.hasOuter;
      trousersGroup.visible = st.hasBottom && !st.isSkirt;
      skirtMesh.visible = st.hasBottom && st.isSkirt;
      accessoryGroup.visible = st.hasAccessory;

      // Adjust shoulder proportion based on Nữ / Nam / Unisex
      const targetScaleX = st.pose === 'Nam' ? 1.12 : st.pose === 'Nữ' ? 0.96 : 1.04;
      rootGroup.scale.x = THREE.MathUtils.damp(rootGroup.scale.x, targetScaleX, 4, dt);

      if (st.autoRotate) {
        rootGroup.rotation.y += dt * 0.55;
      } else {
        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          st.manualYaw,
          5,
          dt
        );
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 420;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
    };
  }, []);

  const handleRandomMix = () => {
    if (topItems.length > 0) {
      setSelectedTop(topItems[Math.floor(Math.random() * topItems.length)]);
    }
    if (bottomItems.length > 0) {
      setSelectedBottom(bottomItems[Math.floor(Math.random() * bottomItems.length)]);
    }
    if (outerItems.length > 0) {
      setSelectedOuter(
        Math.random() > 0.25 ? outerItems[Math.floor(Math.random() * outerItems.length)] : null
      );
    }
  };

  const handleSaveLookToHistory = async () => {
    const equippedNames = [
      selectedTop?.name,
      selectedBottom?.name,
      selectedOuter?.name,
      selectedShoes?.name,
      selectedAccessory?.name,
    ].filter(Boolean) as string[];

    if (equippedNames.length === 0) return;

    setSaving(true);
    try {
      const lookTitle =
        customTitle.trim() ||
        `Phối đồ Manocanh (${new Date().toLocaleDateString('vi-VN')} · ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`;

      await onSaveTryOnHistory({
        title: lookTitle,
        occasion: selectedOccasion,
        weatherNote: `${weather.city} · ${weather.temp}°C (${weather.condition})`,
        items: equippedNames,
        auraAdvice: `Bộ trang phục ướm thử trên Manocanh (${mannequinPose}) gồm ${equippedNames.length} món, tối ưu cho dịp ${selectedOccasion} dưới tiết trời ${weather.temp}°C.`,
      });

      setCustomTitle('');
      setToastMsg('Đã lưu bộ phối vào Lịch sử phối đồ!');
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Studio Split Grid: Left 3D Mannequin Stage + Right Garment Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT 5 COLS: 3D Interactive Mannequin Viewport */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden flex flex-col justify-between"
        >
          {/* Top Studio Header */}
          <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl ${accent.bgClass} text-white flex items-center justify-center shadow-2xs`}
              >
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  Manocanh 3D Ướm Thử Đồ
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Phom dáng: {mannequinPose} · Xoay 360° trực quan
                </p>
              </div>
            </div>

            {/* Body Type Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              {(['Nữ', 'Nam', 'Unisex'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMannequinPose(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mannequinPose === p
                      ? `${accent.bgClass} text-white shadow-2xs`
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Canvas Stage */}
          <div className="relative h-[420px] w-full bg-slate-50 dark:bg-stone-950">
            <div ref={mountRef} className="w-full h-full" />

            {/* Floating Bottom Rotation Controls */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  autoRotate
                    ? `${accent.bgClass} text-white`
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                {autoRotate ? 'Đang tự xoay 360°' : 'Tự xoay: Tắt'}
              </button>

              <div className="flex items-center gap-2 flex-1 max-w-[170px]">
                <span className="text-[11px] text-stone-500 shrink-0">Góc xoay:</span>
                <input
                  type="range"
                  min={-3.14}
                  max={3.14}
                  step={0.05}
                  value={manualYaw}
                  onChange={(e) => {
                    setAutoRotate(false);
                    setManualYaw(parseFloat(e.target.value));
                  }}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Currently Wearing Summary Bar */}
          <div className="p-4 bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-100 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Đang mặc trên Manocanh:
              </span>
              <button
                type="button"
                onClick={handleRandomMix}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${accent.textClass} hover:underline cursor-pointer`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Phối ngẫu nhiên</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Áo trong', item: selectedTop },
                { label: 'Áo khoác', item: selectedOuter },
                { label: 'Quần / Váy', item: selectedBottom },
              ].map((slot, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center gap-2"
                >
                  {slot.item ? (
                    <>
                      <img
                        src={slot.item.imageUrl}
                        alt={slot.item.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] text-stone-400 block">{slot.label}</span>
                        <span className="text-xs font-semibold truncate block">
                          {slot.item.name}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-stone-400 py-1 px-1">
                      {slot.label}: Trống
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* RIGHT 7 COLS: Garment Slot Picker & Save to History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-7 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 flex flex-col justify-between space-y-6 shadow-xs"
        >
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                  Chọn trang phục để ướm lên Manocanh
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Chạm vào từng món đồ bên dưới để thay đổi trực tiếp màu sắc & kiểu dáng trên Manocanh 3D
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTop(topItems[0] || null);
                  setSelectedBottom(bottomItems[0] || null);
                  setSelectedOuter(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại mặc định</span>
              </button>
            </div>

            {/* 1. Chọn Áo (Tops) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  1. Chọn Áo ({topItems.length} món)
                </span>
                {selectedTop && (
                  <span className={accent.textClass}>Đang chọn: {selectedTop.name}</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {topItems.map((item) => {
                  const active = selectedTop?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedTop(item)}
                      className={`p-2 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        active
                          ? `${accent.softBgClass} ${accent.borderClass} ring-1 ring-current ${accent.textClass}`
                          : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">{item.color}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Chọn Áo Khoác Layer (Outerwear) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  2. Chọn Áo khoác ngoài ({outerItems.length} món)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedOuter(null)}
                  className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer"
                >
                  Cởi áo khoác
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {outerItems.map((item) => {
                  const active = selectedOuter?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedOuter(active ? null : item)}
                      className={`p-2 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        active
                          ? `${accent.softBgClass} ${accent.borderClass} ring-1 ring-current ${accent.textClass}`
                          : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">{item.color}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Chọn Quần & Chân váy (Bottoms) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  3. Chọn Quần & Chân váy ({bottomItems.length} món)
                </span>
                {selectedBottom && (
                  <span className={accent.textClass}>Đang chọn: {selectedBottom.name}</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {bottomItems.map((item) => {
                  const active = selectedBottom?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedBottom(item)}
                      className={`p-2 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        active
                          ? `${accent.softBgClass} ${accent.borderClass} ring-1 ring-current ${accent.textClass}`
                          : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">{item.color}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Save Outfit to History Box */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Đặt tên bộ phối (VD: Outfit Đi Làm Thứ Hai)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm focus:outline-none focus:border-stone-400"
              />
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveLookToHistory}
                className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap ${accent.bgClass}`}
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu vào Lịch sử phối đồ'}</span>
              </button>
            </div>

            <AnimatePresence>
              {toastMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{toastMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Outfit History Timeline Section */}
      <section className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <History className={`w-5 h-5 ${accent.textClass}`} />
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                Lịch Sử Phối Đồ Gần Đây ({sortedHistoryOutfits.length}/{savedOutfits.length})
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sắp xếp theo thời gian gần nhất hoặc theo dịp sử dụng để tìm lại nhanh các outfit yêu thích
              </p>
            </div>
          </div>

          {savedOutfits.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs">
                {[
                  { id: 'newest', label: 'Thời gian gần nhất' },
                  { id: 'occasion', label: 'Theo dịp sử dụng' },
                  { id: 'oldest', label: 'Cũ nhất' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHistorySortMode(opt.id as 'newest' | 'oldest' | 'occasion')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      historySortMode === opt.id
                        ? `${accent.bgClass} text-white shadow-2xs`
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <select
                value={historyOccasionFilter}
                onChange={(e) => setHistoryOccasionFilter(e.target.value)}
                aria-label="Lọc theo dịp sử dụng"
                className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 focus:outline-none cursor-pointer"
              >
                <option value="Tất cả">Tất cả dịp sử dụng</option>
                {OCCASION_TYPES.map((occ) => (
                  <option key={occ} value={occ}>
                    Dịp: {occ}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {savedOutfits.length === 0 ? (
          <div className="p-8 rounded-2xl bg-stone-50 dark:bg-stone-950/60 text-center space-y-2">
            <Shirt className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Chưa có lịch sử phối đồ nào được lưu
            </p>
            <p className="text-xs text-stone-500">
              Hãy chọn đồ trên Manocanh 3D ở trên và nhấn "Lưu vào Lịch sử phối đồ" để ghi lại bộ trang phục của bạn.
            </p>
          </div>
        ) : sortedHistoryOutfits.length === 0 ? (
          <div className="p-8 rounded-2xl bg-stone-50 dark:bg-stone-950/60 text-center space-y-2">
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Không tìm thấy bộ trang phục nào cho dịp "{historyOccasionFilter}"
            </p>
            <button
              type="button"
              onClick={() => setHistoryOccasionFilter('Tất cả')}
              className={`text-xs font-semibold underline cursor-pointer ${accent.textClass}`}
            >
              Xem tất cả dịp sử dụng
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedHistoryOutfits.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                    <span className={`font-semibold ${accent.textClass}`}>
                      {entry.occasion} · <span className="font-normal text-stone-500">{entry.weatherNote}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteHistoryItem(entry.id)}
                      className="text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Xóa khỏi lịch sử"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                    {entry.title}
                  </h4>

                  <ul className="space-y-1 text-xs text-stone-700 dark:text-stone-300">
                    {entry.items.map((piece, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${accent.bgClass}`} />
                        <span>{piece}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-[11px] text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-200/60 dark:border-stone-800 italic">
                  {entry.auraAdvice}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
