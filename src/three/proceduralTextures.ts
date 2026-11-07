import * as THREE from 'three';
import { FabricType, GenderProfile } from '../types/studio';
import { FABRIC_LIBRARY } from '../data/presets';

const normalMapCache = new Map<string, THREE.CanvasTexture>();
const garmentDiffuseCache = new Map<string, THREE.CanvasTexture>();
const skinTextureCache = new Map<string, THREE.CanvasTexture>();

export type GarmentDetailKind =
  | 'crew_tshirt'
  | 'oxford_shirt'
  | 'turtleneck_knit'
  | 'fitted_tank'
  | 'outerwear_coat'
  | 'trouser_yoke'
  | 'trouser_leg_wide'
  | 'trouser_leg_jeans'
  | 'trouser_leg_cargo'
  | 'skirt_aline'
  | 'sleeve';

/**
 * Generates a high-resolution 1024x1024 photorealistic human skin & facial complexion texture
 * aligned with the unified Torso + Neck + Head UV map:
 * - u = 0.25 is Center Front (+Z), u = 0.75 is Center Back (-Z)
 * - v in [0, 1] maps pelvis-local y from -0.095m to +0.815m (total span = 0.910m)
 */
export function createHumanSkinAndFaceTexture(
  baseSkinHex: string,
  gender: GenderProfile,
  hairColorHex: string
): THREE.CanvasTexture {
  const cacheKey = `${baseSkinHex}_${gender}_${hairColorHex}`;
  if (skinTextureCache.has(cacheKey)) {
    return skinTextureCache.get(cacheKey)!;
  }

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseColor = new THREE.Color(baseSkinHex);
  const rBase = Math.round(baseColor.r * 255);
  const gBase = Math.round(baseColor.g * 255);
  const bBase = Math.round(baseColor.b * 255);

  ctx.fillStyle = `rgb(${rBase}, ${gBase}, ${bBase})`;
  ctx.fillRect(0, 0, size, size);

  // Helper to convert (u, yPelvis) -> canvas (cx, cy)
  // Matches createSculptedTorsoAndHeadGeometry yMin = -0.085, yMax = 0.815
  const yMin = -0.085;
  const yMax = 0.815;
  const toCanvasY = (yPelvis: number) => {
    const v = (yPelvis - yMin) / (yMax - yMin);
    return (1 - v) * size;
  };
  const toCanvasX = (u: number) => u * size;

  // Helper for soft radial blush/shading
  const drawSoftEllipticalGradient = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    innerRgba: string,
    outerRgba = 'rgba(0,0,0,0)'
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0, innerRgba);
    grad.addColorStop(
      0.55,
      innerRgba.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.45})`)
    );
    grad.addColorStop(1, outerRgba);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const isFemale = gender === 'female';
  const isMale = gender === 'male';

  // 1. Subtle anatomical body shading (navel, collarbone, sternum, spine groove)
  const frontX = toCanvasX(0.25);
  const backX = toCanvasX(0.75);

  // Navel at y = 0.155
  drawSoftEllipticalGradient(
    frontX,
    toCanvasY(0.155),
    10,
    11,
    'rgba(85, 45, 35, 0.28)'
  );
  // Subtle linea alba & abdominal contour
  drawSoftEllipticalGradient(
    frontX,
    toCanvasY(0.22),
    16,
    75,
    'rgba(110, 65, 50, 0.07)'
  );
  // Clavicle warm highlights & subtle hollow at suprasternal notch (y = 0.455)
  drawSoftEllipticalGradient(
    frontX,
    toCanvasY(0.455),
    24,
    14,
    'rgba(95, 50, 40, 0.16)'
  );
  // Back spinal groove shadow
  drawSoftEllipticalGradient(
    backX,
    toCanvasY(0.26),
    18,
    140,
    'rgba(90, 50, 40, 0.12)'
  );

  // 2. Subsurface Facial Warmth (Cheeks, Nose Bridge, Chin)
  // Head spans y = 0.595 (chin) to 0.815 (crown)
  const yChin = 0.595;
  const yHeadSpan = 0.22;
  const headY = (t: number) => toCanvasY(yChin + t * yHeadSpan);

  // Rosy cheek blush at t = 0.38, u = 0.25 ± 0.082
  const blushAlpha = isFemale ? 0.22 : 0.11;
  drawSoftEllipticalGradient(
    toCanvasX(0.25 - 0.082),
    headY(0.38),
    44,
    25,
    `rgba(218, 92, 88, ${blushAlpha})`
  );
  drawSoftEllipticalGradient(
    toCanvasX(0.25 + 0.082),
    headY(0.38),
    44,
    25,
    `rgba(218, 92, 88, ${blushAlpha})`
  );

  // Warmth on nose tip (t = 0.35) & nose bridge highlight
  drawSoftEllipticalGradient(
    frontX,
    headY(0.35),
    22,
    14,
    'rgba(210, 100, 90, 0.15)'
  );
  drawSoftEllipticalGradient(
    frontX,
    headY(0.43),
    6,
    22,
    'rgba(255, 245, 238, 0.24)'
  );
  // Nose bridge side shadows
  drawSoftEllipticalGradient(
    toCanvasX(0.25 - 0.026),
    headY(0.43),
    12,
    24,
    'rgba(95, 55, 42, 0.16)'
  );
  drawSoftEllipticalGradient(
    toCanvasX(0.25 + 0.026),
    headY(0.43),
    12,
    24,
    'rgba(95, 55, 42, 0.16)'
  );
  // Subtle nostril shadows at t = 0.322
  drawSoftEllipticalGradient(
    toCanvasX(0.25 - 0.014),
    headY(0.322),
    7,
    4.5,
    'rgba(65, 34, 28, 0.42)'
  );
  drawSoftEllipticalGradient(
    toCanvasX(0.25 + 0.014),
    headY(0.322),
    7,
    4.5,
    'rgba(65, 34, 28, 0.42)'
  );

  // 3. Natural Blended Lips with Cupid's Bow at t = 0.21
  const lipCenterY = headY(0.21);
  const lipHalfW = isMale ? 38 : 36;
  const lipH = isFemale ? 13.5 : 11;

  // Soft outer vermilion glow
  drawSoftEllipticalGradient(
    frontX,
    lipCenterY,
    lipHalfW * 1.15,
    lipH * 1.35,
    isFemale ? 'rgba(202, 86, 88, 0.46)' : 'rgba(175, 98, 92, 0.34)'
  );

  // Sculpted Upper Lip (Cupid's bow)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(frontX - lipHalfW, lipCenterY + 1);
  ctx.quadraticCurveTo(
    frontX - lipHalfW * 0.45,
    lipCenterY - lipH * 0.95,
    frontX,
    lipCenterY - lipH * 0.55
  );
  ctx.quadraticCurveTo(
    frontX + lipHalfW * 0.45,
    lipCenterY - lipH * 0.95,
    frontX + lipHalfW,
    lipCenterY + 1
  );
  ctx.quadraticCurveTo(
    frontX,
    lipCenterY + 2.5,
    frontX - lipHalfW,
    lipCenterY + 1
  );
  ctx.closePath();
  ctx.fillStyle = isFemale
    ? 'rgba(190, 68, 74, 0.78)'
    : 'rgba(165, 86, 82, 0.56)';
  ctx.fill();

  // Sculpted Lower Lip cushion
  ctx.beginPath();
  ctx.moveTo(frontX - lipHalfW * 0.92, lipCenterY + 1);
  ctx.quadraticCurveTo(
    frontX,
    lipCenterY + lipH * 1.15,
    frontX + lipHalfW * 0.92,
    lipCenterY + 1
  );
  ctx.closePath();
  ctx.fillStyle = isFemale
    ? 'rgba(208, 82, 86, 0.74)'
    : 'rgba(176, 94, 88, 0.52)';
  ctx.fill();

  // Subtle natural lower lip gloss highlight
  drawSoftEllipticalGradient(
    frontX,
    lipCenterY + lipH * 0.42,
    lipHalfW * 0.42,
    lipH * 0.25,
    isFemale ? 'rgba(255, 235, 235, 0.35)' : 'rgba(255, 235, 235, 0.18)'
  );

  // Gentle mouth parting line
  ctx.strokeStyle = 'rgba(75, 28, 30, 0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(frontX - lipHalfW * 0.88, lipCenterY + 0.8);
  ctx.quadraticCurveTo(
    frontX,
    lipCenterY + 2.2,
    frontX + lipHalfW * 0.88,
    lipCenterY + 0.8
  );
  ctx.stroke();
  ctx.restore();

  // 4. Orbital Eye Socket Shading & Feathered Eyebrows (t = 0.49 for eyes, t = 0.575 for brows)
  const browCol = new THREE.Color(hairColorHex).lerp(
    new THREE.Color('#1E1B18'),
    0.35
  );
  const browRgb = `${Math.round(browCol.r * 255)}, ${Math.round(
    browCol.g * 255
  )}, ${Math.round(browCol.b * 255)}`;

  ([-1, 1] as const).forEach((dir) => {
    const eyeCenterX = toCanvasX(0.25 + dir * 0.062);
    const eyeCenterY = headY(0.49);

    // Warm orbital socket & upper eyelid eyeshadow
    drawSoftEllipticalGradient(
      eyeCenterX,
      eyeCenterY - 2,
      29,
      14,
      isFemale ? 'rgba(135, 75, 65, 0.28)' : 'rgba(115, 68, 55, 0.20)'
    );

    // Upper eyelid crease line & soft lashline contour
    ctx.save();
    ctx.strokeStyle = 'rgba(82, 44, 36, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eyeCenterX - dir * 18, eyeCenterY - 5.5);
    ctx.quadraticCurveTo(
      eyeCenterX,
      eyeCenterY - 11.5,
      eyeCenterX + dir * 20,
      eyeCenterY - 4.5
    );
    ctx.stroke();

    // Feathered Multi-Stroke Eyebrow at t = 0.575
    const browY = headY(isMale ? 0.565 : 0.58);
    const browInnerX = toCanvasX(0.25 + dir * 0.031);
    const browArchX = toCanvasX(0.25 + dir * 0.070);
    const browOuterX = toCanvasX(0.25 + dir * 0.104);
    const browThickness = isMale ? 6.5 : 4.5;

    // Soft brow base shadow
    ctx.strokeStyle = `rgba(${browRgb}, 0.62)`;
    ctx.lineWidth = browThickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(browInnerX, browY + 1.5);
    ctx.quadraticCurveTo(
      browArchX,
      browY - (isFemale ? 5.5 : 3.0),
      browOuterX,
      browY + 2.5
    );
    ctx.stroke();

    // Individual feathered brow hair strokes
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(${browRgb}, 0.72)`;
    for (let s = 0; s <= 22; s++) {
      const f = s / 22;
      const sx = THREE.MathUtils.lerp(browInnerX, browOuterX, f);
      const archOffset = Math.sin(f * Math.PI) * (isFemale ? -4.5 : -2.8);
      const sy = browY + archOffset + (1 - f) * 1.5;
      const strokeH =
        (1 - Math.pow(f - 0.35, 2) * 0.9) * browThickness * 0.65;
      ctx.beginPath();
      ctx.moveTo(sx, sy + strokeH * 0.5);
      ctx.lineTo(sx + dir * 3.5, sy - strokeH * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  skinTextureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Generates a pure, natural human skin texture for arms, hands, legs, feet, and ears
 * with subtle warm subsurface shading and zero facial markings.
 */
export function createNaturalLimbSkinTexture(
  baseSkinHex: string
): THREE.CanvasTexture {
  const cacheKey = `limb_${baseSkinHex}`;
  if (skinTextureCache.has(cacheKey)) {
    return skinTextureCache.get(cacheKey)!;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseColor = new THREE.Color(baseSkinHex);
  const rBase = Math.round(baseColor.r * 255);
  const gBase = Math.round(baseColor.g * 255);
  const bBase = Math.round(baseColor.b * 255);

  ctx.fillStyle = `rgb(${rBase}, ${gBase}, ${bBase})`;
  ctx.fillRect(0, 0, size, size);

  // Subtle warm subsurface rosy tint near knees/elbows/hands (v = 0.45 and v = 0.9)
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(215, 110, 95, 0.04)');
  grad.addColorStop(0.45, 'rgba(210, 95, 85, 0.08)');
  grad.addColorStop(0.75, 'rgba(255, 245, 240, 0.03)');
  grad.addColorStop(1, 'rgba(210, 95, 85, 0.10)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  skinTextureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Generates procedural fabric weave normal maps PLUS subtle cloth drape folds
 * so garments look like real woven/knitted textiles instead of rigid plastic shells.
 */
export function getFabricNormalMap(
  fabric: FabricType,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  if (normalMapCache.has(fabric)) {
    return normalMapCache.get(fabric)!;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let nx = 128;
      let ny = 128;
      const nz = 255;

      // Subtle low-frequency cloth drape micro-folds
      const foldX =
        Math.sin((x / size) * Math.PI * 4 + Math.cos((y / size) * Math.PI * 2) * 1.2) * 7;
      const foldY =
        Math.cos((y / size) * Math.PI * 6 + Math.sin((x / size) * Math.PI * 2) * 1.0) * 6;

      if (fabric === 'denim') {
        const twill = Math.sin(((x * 2 + y) / 4) * Math.PI * 2);
        const warp = Math.cos((x / 2) * Math.PI * 2) * 0.5;
        nx = 128 + Math.round(twill * 22 + warp * 12 + foldX);
        ny = 128 + Math.round(twill * 16 - warp * 10 + foldY);
      } else if (fabric === 'cotton') {
        const knitX = Math.sin((x / 3) * Math.PI * 2);
        const knitY = Math.cos((y / 3) * Math.PI * 2);
        nx = 128 + Math.round(knitX * 11 + foldX);
        ny = 128 + Math.round(knitY * 11 + foldY);
      } else if (fabric === 'silk') {
        const filament =
          Math.sin((y / 1.5) * Math.PI * 2) * Math.cos((x / 8) * Math.PI * 2);
        nx = 128 + Math.round(filament * 4 + foldX * 1.3);
        ny = 128 + Math.round(filament * 6 + foldY * 1.3);
      } else if (fabric === 'leather') {
        const cellX = Math.sin(x * 0.18 + Math.cos(y * 0.14) * 2.2);
        const cellY = Math.cos(y * 0.18 + Math.sin(x * 0.14) * 2.2);
        const fine = Math.sin(x * 0.45) * Math.cos(y * 0.45);
        nx = 128 + Math.round(cellX * 18 + fine * 6 + foldX);
        ny = 128 + Math.round(cellY * 18 + fine * 6 + foldY);
      } else if (fabric === 'fleece') {
        const n1 = Math.sin(x * 0.31 + y * 0.17) * Math.cos(x * 0.13 - y * 0.29);
        const n2 = Math.sin(x * 0.67 - y * 0.53);
        nx = 128 + Math.round(n1 * 20 + n2 * 10 + foldX);
        ny = 128 + Math.round(n2 * 20 - n1 * 10 + foldY);
      } else if (fabric === 'linen') {
        const threadX =
          Math.sin((x / 3.5) * Math.PI * 2) * (1 + 0.4 * Math.sin(y * 0.08));
        const threadY =
          Math.sin((y / 3.5) * Math.PI * 2) * (1 + 0.4 * Math.cos(x * 0.08));
        nx = 128 + Math.round(threadX * 20 + foldX);
        ny = 128 + Math.round(threadY * 20 + foldY);
      }

      data[idx] = Math.min(255, Math.max(0, nx));
      data[idx + 1] = Math.min(255, Math.max(0, ny));
      data[idx + 2] = nz;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;

  normalMapCache.set(fabric, texture);
  return texture;
}

/**
 * Generates a 512x512 Tailored Garment Diffuse Texture with realistic seams,
 * stitching, buttons, waistbands, ribbed trim, pocket details, and natural drape shading.
 */
function getGarmentDetailTexture(
  colorHex: string,
  fabric: FabricType,
  detailKind?: GarmentDetailKind
): THREE.CanvasTexture {
  const key = `${colorHex}_${fabric}_${detailKind || 'plain'}`;
  if (garmentDiffuseCache.has(key)) {
    return garmentDiffuseCache.get(key)!;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const base = new THREE.Color(colorHex);
  const r = Math.round(base.r * 255);
  const g = Math.round(base.g * 255);
  const b = Math.round(base.b * 255);

  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, size, size);

  // 1. Subtle vertical & diagonal cloth drape shading across the garment
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let py = 0; py < size; py++) {
    const v = 1 - py / size; // 0 at bottom hem, 1 at top edge
    for (let px = 0; px < size; px++) {
      const u = px / size; // u = 0.25 is front center, u = 0.75 is back center
      const idx = (py * size + px) * 4;

      // Natural soft fabric drape folds
      let shade =
        Math.sin(u * Math.PI * 12 + Math.sin(v * Math.PI * 3) * 0.8) * 3.5 +
        Math.cos(v * Math.PI * 5) * 2.5;

      // Ribbed knit vertical texture for turtleneck or ribbed cuffs
      if (detailKind === 'turtleneck_knit') {
        shade += Math.sin(u * Math.PI * 160) * 5.5;
      }

      // Denim warp/weft grain & subtle thigh fade for jeans
      if (fabric === 'denim') {
        const grain =
          Math.sin(px * 1.7 + py * 0.8) * 3.0 + Math.cos(py * 2.1) * 2.0;
        shade += grain;
        if (detailKind === 'trouser_leg_jeans') {
          const frontBackFade =
            Math.exp(-Math.pow((v - 0.62) / 0.25, 2)) *
            Math.abs(Math.sin(u * Math.PI * 2)) *
            14;
          shade += frontBackFade;
        }
      }

      // Pressed front & back vertical crease on tailored trousers
      if (detailKind === 'trouser_leg_wide') {
        const creaseDist = Math.min(
          Math.abs(u - 0.25),
          Math.abs(u - 0.75)
        );
        if (creaseDist < 0.012) {
          shade += (1 - creaseDist / 0.012) * 12;
        }
      }

      // Side seam subtle shadow at u = 0.0, 0.5, 1.0
      const sideDist = Math.min(
        Math.abs(u),
        Math.abs(u - 0.5),
        Math.abs(u - 1.0)
      );
      if (sideDist < 0.01) {
        shade -= (1 - sideDist / 0.01) * 14;
      }

      // Bottom hem & top neckline/waistband double-stitch shading
      if (v < 0.035 || v > 0.96) {
        shade -= 7;
      }

      data[idx] = Math.min(255, Math.max(0, r + Math.round(shade)));
      data[idx + 1] = Math.min(255, Math.max(0, g + Math.round(shade)));
      data[idx + 2] = Math.min(255, Math.max(0, b + Math.round(shade)));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Crisp Vector Tailoring Details (Plackets, Buttons, Waistbands, Pockets)
  const frontX = size * 0.25;

  if (detailKind === 'oxford_shirt') {
    // Center front button placket strip
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(frontX - 7, 0, 14, size);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(frontX - 7, 0, 14, size);

    // 6 Mother-of-pearl shirt buttons down the center placket
    for (let i = 1; i <= 6; i++) {
      const by = (i / 7) * size;
      ctx.beginPath();
      ctx.arc(frontX, by, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.stroke();
    }
  } else if (detailKind === 'trouser_yoke') {
    // Tailored waistband at top of trousers (py from 0 to 56)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, size, 52);
    ctx.strokeStyle =
      fabric === 'denim' ? 'rgba(217, 119, 6, 0.65)' : 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(size, 52);
    // Center front fly seam
    ctx.moveTo(frontX, 52);
    ctx.lineTo(frontX, size * 0.68);
    ctx.quadraticCurveTo(frontX + 12, size * 0.72, frontX + 14, size * 0.52);
    ctx.stroke();

    // Waistband button at center front
    ctx.beginPath();
    ctx.arc(frontX, 26, 5, 0, Math.PI * 2);
    ctx.fillStyle =
      fabric === 'denim' ? 'rgba(180, 130, 70, 0.9)' : 'rgba(30, 41, 59, 0.75)';
    ctx.fill();
  } else if (detailKind === 'outerwear_coat') {
    // Tailored lapel edge & front pocket welt lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 0, size - 20, size);

    // Left & Right Hip Welt Pockets
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.fillRect(size * 0.16, size * 0.68, 44, 10);
    ctx.fillRect(size * 0.74, size * 0.68, 44, 10);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  garmentDiffuseCache.set(key, tex);
  return tex;
}

export function createFabricMaterial(
  fabric: FabricType,
  colorHex: string,
  maxAnisotropy = 4,
  detailKind?: GarmentDetailKind
): THREE.MeshPhysicalMaterial {
  const meta = FABRIC_LIBRARY[fabric];
  const normalMap = getFabricNormalMap(fabric, maxAnisotropy);
  const diffuseMap = getGarmentDetailTexture(colorHex, fabric, detailKind);
  const baseColor = new THREE.Color(colorHex);
  const sheenColor = baseColor.clone().lerp(new THREE.Color('#FFFFFF'), 0.35);

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FFFFFF'),
    map: diffuseMap,
    roughness: meta.roughness,
    metalness: meta.metalness,
    sheen: meta.sheen,
    sheenColor,
    sheenRoughness: meta.sheenRoughness,
    clearcoat: meta.clearcoat,
    clearcoatRoughness: meta.clearcoatRoughness,
    normalMap,
    normalScale: new THREE.Vector2(meta.normalScale, meta.normalScale),
    side: THREE.DoubleSide,
  });
}

/**
 * Creates a soft radial contact shadow texture to ground the mannequin on the white studio floor.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.04,
    size / 2,
    size / 2,
    size * 0.48
  );
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0.34)');
  gradient.addColorStop(0.35, 'rgba(15, 23, 42, 0.16)');
  gradient.addColorStop(0.7, 'rgba(15, 23, 42, 0.04)');
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function disposeCachedTextures(): void {
  normalMapCache.forEach((tex) => tex.dispose());
  normalMapCache.clear();
  garmentDiffuseCache.forEach((tex) => tex.dispose());
  garmentDiffuseCache.clear();
  skinTextureCache.forEach((tex) => tex.dispose());
  skinTextureCache.clear();
}
