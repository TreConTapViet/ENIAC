import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface Wardrobe3DCanvasProps {
  doorsOpen: boolean;
  showInteriorTitle: boolean;
  contrastMode?: 'light-wardrobe-dark-bg' | 'dark-wardrobe-light-bg';
}

/**
 * Draws a rounded rectangle path on a 2D canvas context.
 */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Creates the honey-oak door texture matching the reference image:
 * Bevelled rounded border, warm honey-oak gradient, vertical wavy wood grain lines, and oval wood knot.
 */
function createHoneyOakDoorTexture(
  isLeftDoor: boolean,
  isLightWood: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Base wood fill
  const baseGrad = ctx.createLinearGradient(0, 0, 512, 768);
  if (isLightWood) {
    baseGrad.addColorStop(0, '#C78C52');
    baseGrad.addColorStop(0.5, '#B3763C');
    baseGrad.addColorStop(1, '#9A602A');
  } else {
    baseGrad.addColorStop(0, '#5A3A22');
    baseGrad.addColorStop(0.5, '#462B17');
    baseGrad.addColorStop(1, '#331E0E');
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 768);

  // Outer recessed dark border groove
  ctx.strokeStyle = isLightWood ? '#5E3714' : '#1E1108';
  ctx.lineWidth = 14;
  roundRectPath(ctx, 10, 10, 492, 748, 28);
  ctx.stroke();

  // Inner bright bevel highlight
  const bevelGrad = ctx.createLinearGradient(0, 16, 0, 752);
  bevelGrad.addColorStop(0, isLightWood ? '#E2AE79' : '#7C5333');
  bevelGrad.addColorStop(0.5, isLightWood ? '#C2854B' : '#583820');
  bevelGrad.addColorStop(1, isLightWood ? '#844E1E' : '#2A180B');
  ctx.strokeStyle = bevelGrad;
  ctx.lineWidth = 10;
  roundRectPath(ctx, 22, 22, 468, 724, 22);
  ctx.stroke();

  // Inner panel recessed shadow line
  ctx.strokeStyle = isLightWood ? 'rgba(92, 52, 18, 0.45)' : 'rgba(18, 10, 4, 0.6)';
  ctx.lineWidth = 4;
  roundRectPath(ctx, 30, 30, 452, 708, 18);
  ctx.stroke();

  // Vertical organic wood grain lines matching the reference illustration
  ctx.strokeStyle = isLightWood ? 'rgba(120, 68, 24, 0.55)' : 'rgba(24, 13, 5, 0.65)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  const grainColumns = isLeftDoor
    ? [75, 130, 175, 235, 310, 365, 425]
    : [85, 145, 210, 275, 345, 395, 445];

  grainColumns.forEach((baseX, idx) => {
    ctx.beginPath();
    const startY = 28;
    const endY = 740;
    ctx.moveTo(baseX, startY);
    for (let y = startY; y <= endY; y += 36) {
      const wave = Math.sin(y * 0.012 + idx * 1.4) * 9 + Math.cos(y * 0.006 - idx) * 5;
      ctx.lineTo(baseX + wave, y);
    }
    ctx.stroke();
  });

  // Characteristic oval wood knot like in the reference image
  const knotX = isLeftDoor ? 132 : 392;
  const knotY = isLeftDoor ? 495 : 345;
  ctx.save();
  ctx.translate(knotX, knotY);
  ctx.scale(1, 1.55);
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.strokeStyle = isLightWood ? 'rgba(115, 64, 21, 0.65)' : 'rgba(20, 10, 4, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.strokeStyle = isLightWood ? 'rgba(115, 64, 21, 0.45)' : 'rgba(20, 10, 4, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Soft vignette shading at bottom of door
  const bottomShade = ctx.createLinearGradient(0, 580, 0, 768);
  bottomShade.addColorStop(0, 'rgba(0,0,0,0)');
  bottomShade.addColorStop(1, 'rgba(45, 22, 5, 0.28)');
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, 580, 512, 188);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates the horizontal drawer front texture matching the two bottom drawers in the reference image.
 */
function createHoneyOakDrawerTexture(
  isLightWood: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const baseGrad = ctx.createLinearGradient(0, 0, 0, 256);
  if (isLightWood) {
    baseGrad.addColorStop(0, '#D49B63');
    baseGrad.addColorStop(0.25, '#BE8247');
    baseGrad.addColorStop(0.85, '#9F642C');
    baseGrad.addColorStop(1, '#7D4B1C');
  } else {
    baseGrad.addColorStop(0, '#6B462B');
    baseGrad.addColorStop(0.3, '#4E311B');
    baseGrad.addColorStop(1, '#2D1A0C');
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 256);

  // Dark outer recessed groove
  ctx.strokeStyle = isLightWood ? '#583211' : '#1A0E05';
  ctx.lineWidth = 12;
  roundRectPath(ctx, 8, 8, 1008, 240, 26);
  ctx.stroke();

  // Top highlight bevel
  const bevelGrad = ctx.createLinearGradient(0, 14, 0, 242);
  bevelGrad.addColorStop(0, isLightWood ? '#EAB986' : '#8A5E3B');
  bevelGrad.addColorStop(0.5, isLightWood ? '#C18449' : '#583820');
  bevelGrad.addColorStop(1, isLightWood ? '#7C491B' : '#261509');
  ctx.strokeStyle = bevelGrad;
  ctx.lineWidth = 10;
  roundRectPath(ctx, 20, 20, 984, 216, 20);
  ctx.stroke();

  // Inner panel border line
  ctx.strokeStyle = isLightWood ? 'rgba(92, 52, 18, 0.4)' : 'rgba(18, 10, 4, 0.6)';
  ctx.lineWidth = 4;
  roundRectPath(ctx, 30, 30, 964, 196, 14);
  ctx.stroke();

  // Horizontal wavy wood grain lines
  ctx.strokeStyle = isLightWood ? 'rgba(122, 68, 24, 0.5)' : 'rgba(24, 13, 5, 0.65)';
  ctx.lineWidth = 3;
  const rows = [64, 112, 158, 202];
  rows.forEach((baseY, idx) => {
    ctx.beginPath();
    ctx.moveTo(34, baseY);
    for (let x = 34; x <= 990; x += 48) {
      const dy = Math.sin(x * 0.008 + idx * 1.7) * 7;
      ctx.lineTo(x, baseY + dy);
    }
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a general warm honey-oak wood texture for the cabinet body, roof, and plinth.
 */
function createCabinetBodyWoodTexture(
  isLightWood: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  if (isLightWood) {
    grad.addColorStop(0, '#B87B42');
    grad.addColorStop(0.5, '#9E642E');
    grad.addColorStop(1, '#7F4D1E');
  } else {
    grad.addColorStop(0, '#4A2F1B');
    grad.addColorStop(0.5, '#382212');
    grad.addColorStop(1, '#24150A');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = isLightWood ? 'rgba(95, 52, 16, 0.35)' : 'rgba(15, 8, 3, 0.45)';
  ctx.lineWidth = 2.5;
  for (let i = 16; i < 512; i += 28) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    for (let x = 0; x <= 512; x += 32) {
      ctx.lineTo(x, i + Math.sin(x * 0.015 + i) * 4);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates an extra-large, high-contrast glowing "Smart Wardrobe" 3D interior sign texture.
 */
function createSmartWardrobeSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 1024, 640);

  // Rich warm golden aura backdrop inside the wardrobe
  const glow = ctx.createRadialGradient(512, 320, 30, 512, 320, 480);
  glow.addColorStop(0, 'rgba(251, 191, 36, 0.5)');
  glow.addColorStop(0.55, 'rgba(217, 119, 6, 0.22)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 640);

  // Ornamental top & bottom lines
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(150, 135);
  ctx.lineTo(874, 135);
  ctx.moveTo(190, 505);
  ctx.lineTo(834, 505);
  ctx.stroke();

  // Center diamond emblem
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.moveTo(512, 118);
  ctx.lineTo(528, 135);
  ctx.lineTo(512, 152);
  ctx.lineTo(496, 135);
  ctx.closePath();
  ctx.fill();

  // Giant Two-Line Editorial Typography: "Smart" / "Wardrobe"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(245, 158, 11, 0.98)';
  ctx.shadowBlur = 38;
  ctx.fillStyle = '#FFFBEB';

  ctx.font = '700 136px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Smart', 512, 245);

  ctx.font = '700 142px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Wardrobe', 512, 390);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a soft radial contact shadow texture for grounding the 3D wardrobe.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 22, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.34)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const Wardrobe3DCanvas: React.FC<Wardrobe3DCanvasProps> = ({
  doorsOpen,
  showInteriorTitle,
  contrastMode = 'light-wardrobe-dark-bg',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    doorsOpen,
    showInteriorTitle,
    contrastMode,
    currentDoorAngle: 0,
    currentTitleScale: 0.01,
    currentTitleOpacity: 0,
    currentCameraZ: 6.1,
  });

  useEffect(() => {
    stateRef.current.doorsOpen = doorsOpen;
    stateRef.current.showInteriorTitle = showInteriorTitle;
    stateRef.current.contrastMode = contrastMode;
  }, [doorsOpen, showInteriorTitle, contrastMode]);

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

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const isLightWardrobe = contrastMode === 'light-wardrobe-dark-bg';

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    // Position camera slightly above the wardrobe center so the angled top roof is clearly visible like the reference image
    camera.position.set(0, 2.35, 6.1);
    camera.lookAt(0, 2.02, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLightWardrobe ? 1.12 : 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const bodyWoodTex = createCabinetBodyWoodTexture(isLightWardrobe, maxAniso);
    const leftDoorTex = createHoneyOakDoorTexture(true, isLightWardrobe, maxAniso);
    const rightDoorTex = createHoneyOakDoorTexture(false, isLightWardrobe, maxAniso);
    const drawerTex = createHoneyOakDrawerTexture(isLightWardrobe, maxAniso);
    const signTex = createSmartWardrobeSignTexture(maxAniso);
    const shadowTex = createContactShadowTexture();

    // Materials matching the warm honey-oak wood in the reference image
    const cabinetBodyMat = new THREE.MeshStandardMaterial({
      map: bodyWoodTex,
      roughness: 0.42,
      metalness: 0.04,
    });

    const frameBevelMat = new THREE.MeshStandardMaterial({
      color: isLightWardrobe ? 0xb57941 : 0x4b2f1b,
      roughness: 0.36,
      metalness: 0.06,
    });

    const leftDoorMat = new THREE.MeshStandardMaterial({
      map: leftDoorTex,
      roughness: 0.38,
      metalness: 0.04,
    });

    const rightDoorMat = new THREE.MeshStandardMaterial({
      map: rightDoorTex,
      roughness: 0.38,
      metalness: 0.04,
    });

    const drawerFrontMat = new THREE.MeshStandardMaterial({
      map: drawerTex,
      roughness: 0.38,
      metalness: 0.04,
    });

    const knobWoodMat = new THREE.MeshStandardMaterial({
      color: isLightWardrobe ? 0xd29b64 : 0x6c4629,
      roughness: 0.28,
      metalness: 0.08,
    });

    const darkInteriorMat = new THREE.MeshStandardMaterial({
      color: 0x1b120b,
      roughness: 0.82,
      metalness: 0.03,
    });

    const brassRodMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.22,
      clearcoat: 0.6,
    });

    // Assemble the Honey-Oak Wardrobe Group
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.position.set(0, 0.05, 0);
    scene.add(wardrobeGroup);

    // Soft Ground Contact Shadow
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.5),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.01;
    scene.add(shadowPlane);

    // 1. Stepped Bottom Plinth Base (Matching bottom of reference image)
    const plinthShape = new THREE.Shape();
    const pw = 1.18;
    const ph = 0.18;
    plinthShape.moveTo(-pw, 0);
    plinthShape.lineTo(pw, 0);
    plinthShape.lineTo(pw, ph);
    plinthShape.lineTo(-pw, ph);
    plinthShape.closePath();

    const plinthGeo = new THREE.ExtrudeGeometry(plinthShape, {
      depth: 1.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 4,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, cabinetBodyMat);
    plinthMesh.position.set(0, 0.04, -0.57);
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    wardrobeGroup.add(plinthMesh);

    // 2. Rounded Outer Wardrobe Frame & Slanted Top Roof
    // Outer frame dimensions: width ~2.72, height ~3.45 (from y=0.22 to y=3.67)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(2.64, 3.4, 0.08),
      cabinetBodyMat
    );
    backWall.position.set(0, 1.92, -0.56);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    wardrobeGroup.add(backWall);

    const innerBackWall = new THREE.Mesh(
      new THREE.BoxGeometry(2.44, 3.24, 0.02),
      darkInteriorMat
    );
    innerBackWall.position.set(0, 1.92, -0.51);
    wardrobeGroup.add(innerBackWall);

    // Left & Right Side Walls with Rounded Front Columns
    const sideWallGeo = new THREE.BoxGeometry(0.12, 3.38, 1.18);
    const leftSideWall = new THREE.Mesh(sideWallGeo, cabinetBodyMat);
    leftSideWall.position.set(-1.28, 1.92, 0);
    leftSideWall.castShadow = true;
    leftSideWall.receiveShadow = true;
    wardrobeGroup.add(leftSideWall);

    const rightSideWall = new THREE.Mesh(sideWallGeo, cabinetBodyMat);
    rightSideWall.position.set(1.28, 1.92, 0);
    rightSideWall.castShadow = true;
    rightSideWall.receiveShadow = true;
    wardrobeGroup.add(rightSideWall);

    // Rounded Vertical Front Frame Stiles
    const stileGeo = new THREE.CylinderGeometry(0.085, 0.085, 3.38, 20);
    const leftStile = new THREE.Mesh(stileGeo, frameBevelMat);
    leftStile.position.set(-1.31, 1.92, 0.58);
    wardrobeGroup.add(leftStile);

    const rightStile = new THREE.Mesh(stileGeo, frameBevelMat);
    rightStile.position.set(1.31, 1.92, 0.58);
    wardrobeGroup.add(rightStile);

    // Top Horizontal Frame Rail, Middle Divider Rail (between doors & drawers), and Bottom Frame Rail
    const railGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.66, 20);
    railGeo.rotateZ(Math.PI / 2);

    const topRail = new THREE.Mesh(railGeo, frameBevelMat);
    topRail.position.set(0, 3.6, 0.58);
    wardrobeGroup.add(topRail);

    const bottomRail = new THREE.Mesh(railGeo, frameBevelMat);
    bottomRail.position.set(0, 0.24, 0.58);
    wardrobeGroup.add(bottomRail);

    // Middle horizontal divider bar between upper double doors and lower 2 drawers (at y = 1.40)
    const midDivider = new THREE.Mesh(
      new THREE.BoxGeometry(2.54, 0.1, 1.16),
      cabinetBodyMat
    );
    midDivider.position.set(0, 1.4, 0.02);
    wardrobeGroup.add(midDivider);

    // Top Ceiling Slab & Slanted Perspective Roof Cap (matching top of reference image)
    const topCeiling = new THREE.Mesh(
      new THREE.BoxGeometry(2.68, 0.1, 1.2),
      cabinetBodyMat
    );
    topCeiling.position.set(0, 3.62, 0);
    wardrobeGroup.add(topCeiling);

    // Trapezoidal Slanted Roof Cap so the top wood planks are visible like in the illustration
    const roofCapGeo = new THREE.BoxGeometry(2.52, 0.24, 1.12);
    const roofCap = new THREE.Mesh(roofCapGeo, cabinetBodyMat);
    roofCap.position.set(0, 3.74, -0.04);
    roofCap.rotation.x = 0.18;
    wardrobeGroup.add(roofCap);

    // 3. Lower Section: Two Horizontal Drawers with Centered Round Wooden Knobs (y from 0.30 to 1.34)
    const drawerPositionsY = [1.09, 0.57]; // Upper drawer & Lower drawer
    drawerPositionsY.forEach((dy) => {
      const drawerGroup = new THREE.Group();
      drawerGroup.position.set(0, dy, 0.59);

      // Drawer front slab with rounded bevel texture
      const drawerSlab = new THREE.Mesh(
        new THREE.BoxGeometry(2.44, 0.46, 0.08),
        drawerFrontMat
      );
      drawerSlab.castShadow = true;
      drawerSlab.receiveShadow = true;
      drawerGroup.add(drawerSlab);

      // Round wooden knob stem
      const knobStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 0.06, 20),
        knobWoodMat
      );
      knobStem.rotation.x = Math.PI / 2;
      knobStem.position.set(0, 0, 0.055);
      drawerGroup.add(knobStem);

      // Round wooden knob head
      const knobHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.088, 24, 20),
        knobWoodMat
      );
      knobHead.scale.set(1, 1, 0.68);
      knobHead.position.set(0, 0, 0.095);
      knobHead.castShadow = true;
      drawerGroup.add(knobHead);

      wardrobeGroup.add(drawerGroup);
    });

    // 4. Upper Closet Interior: Brass Hanging Rod, Side Garments & Enlarged "Smart Wardrobe" Sign
    const brassRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 2.36, 16),
      brassRodMat
    );
    brassRod.rotation.z = Math.PI / 2;
    brassRod.position.set(0, 3.36, -0.14);
    wardrobeGroup.add(brassRod);

    const fabricColors = [0xe7dec8, 0x9a6b41, 0x3b4d63, 0xd6c7b2];
    const garmentOffsets = [-0.95, -0.78, 0.78, 0.95];
    garmentOffsets.forEach((gx, idx) => {
      const garmentMat = new THREE.MeshStandardMaterial({
        color: fabricColors[idx % fabricColors.length],
        roughness: 0.82,
      });
      const garmentMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.075, 0.85, 8, 12),
        garmentMat
      );
      garmentMesh.scale.set(0.48, 1, 1.25);
      garmentMesh.position.set(gx, 2.68, -0.16);
      wardrobeGroup.add(garmentMesh);
    });

    // Enlarged Glowing "Smart Wardrobe" 3D Plaque Inside Upper Closet (centered at y = 2.48)
    const signMaterial = new THREE.MeshBasicMaterial({
      map: signTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 1.48), signMaterial);
    signMesh.position.set(0, 2.48, 0.25);
    wardrobeGroup.add(signMesh);

    // 5. Upper Section: Two Hinged Double Doors (y from 1.46 to 3.52, height = 2.06)
    function createUpperDoorLeaf(isLeft: boolean): THREE.Group {
      const pivotGroup = new THREE.Group();
      const hingeX = isLeft ? -1.22 : 1.22;
      pivotGroup.position.set(hingeX, 2.49, 0.59);

      const leafOffsetX = isLeft ? 0.605 : -0.605;
      const doorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 2.04, 0.075),
        isLeft ? leftDoorMat : rightDoorMat
      );
      doorMesh.position.set(leafOffsetX, 0, 0);
      doorMesh.castShadow = true;
      doorMesh.receiveShadow = true;
      pivotGroup.add(doorMesh);

      return pivotGroup;
    }

    const leftDoorPivot = createUpperDoorLeaf(true);
    const rightDoorPivot = createUpperDoorLeaf(false);
    wardrobeGroup.add(leftDoorPivot);
    wardrobeGroup.add(rightDoorPivot);

    // Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfffbf0, 0x8d7966, 1.05);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.55);
    keyLight.position.set(3.8, 6.2, 5.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffedd5, 0.72);
    fillLight.position.set(-4.2, 3.5, 4.5);
    scene.add(fillLight);

    const interiorLight = new THREE.PointLight(0xffb74d, 0, 5.2, 1.5);
    interiorLight.position.set(0, 2.75, 0.22);
    wardrobeGroup.add(interiorLight);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

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
      const elapsed = timer.getElapsed();
      const st = stateRef.current;

      const targetAngle = st.doorsOpen ? 2.12 : 0;
      st.currentDoorAngle = THREE.MathUtils.damp(
        st.currentDoorAngle,
        targetAngle,
        2.1,
        dt
      );
      leftDoorPivot.rotation.y = -st.currentDoorAngle;
      rightDoorPivot.rotation.y = st.currentDoorAngle;

      const openRatio = Math.min(1, st.currentDoorAngle / 1.4);
      interiorLight.intensity = openRatio * 3.8;

      const targetOpacity = st.showInteriorTitle && openRatio > 0.3 ? 1 : 0;
      const targetScale = st.showInteriorTitle && openRatio > 0.3 ? 1.06 : 0.72;
      st.currentTitleOpacity = THREE.MathUtils.damp(
        st.currentTitleOpacity,
        targetOpacity,
        3.4,
        dt
      );
      st.currentTitleScale = THREE.MathUtils.damp(
        st.currentTitleScale,
        targetScale,
        3.4,
        dt
      );

      signMaterial.opacity = st.currentTitleOpacity;
      signMesh.scale.setScalar(st.currentTitleScale);
      signMesh.position.y = 2.48 + Math.sin(elapsed * 2.2) * 0.025;

      // Zoom in closer to the upper cabinet when doors open so "Smart Wardrobe" is large and crystal clear
      const targetCamZ = st.doorsOpen ? 4.85 : 6.1;
      st.currentCameraZ = THREE.MathUtils.damp(st.currentCameraZ, targetCamZ, 1.9, dt);
      camera.position.z = st.currentCameraZ;
      camera.lookAt(0, st.doorsOpen ? 2.35 : 2.02, 0);

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
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
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
      bodyWoodTex.dispose();
      leftDoorTex.dispose();
      rightDoorTex.dispose();
      drawerTex.dispose();
      signTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
    };
  }, [contrastMode]);

  return <div ref={mountRef} className="w-full h-full" />;
};
