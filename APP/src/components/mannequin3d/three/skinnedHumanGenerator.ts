import * as THREE from 'three';
import { JointId } from '../types/studio';

export interface BodyMorphParams {
  bustScale: number;
  waistScale: number;
  hipScale: number;
  shoulderScale: number;
  limbMassScale: number;
  isMale: boolean;
  shrinkTorsoUnderTop?: boolean;
  shrinkArmsUnderLongSleeve?: boolean;
  shrinkArmsUnderShortSleeve?: boolean;
  shrinkLegsUnderPants?: boolean;
}

/**
 * Applies Laplacian / Taubin-style iterative vertex smoothing on a BufferGeometry
 * while preserving open boundary loops (such as sleeve cuffs, trouser hems, and necklines).
 */
export function smoothBufferGeometry(
  geometry: THREE.BufferGeometry,
  iterations = 4,
  lambda = 0.45,
  mu = -0.47
): void {
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const indexAttr = geometry.index;
  if (!posAttr || !indexAttr) return;

  const vertexCount = posAttr.count;
  const indices = indexAttr.array;

  const precision = 10000;
  const posKey = (idx: number) =>
    `${Math.round(posAttr.getX(idx) * precision)},${Math.round(
      posAttr.getY(idx) * precision
    )},${Math.round(posAttr.getZ(idx) * precision)}`;

  const canonicalMap = new Map<string, number>();
  const vertexToCanonical = new Int32Array(vertexCount);
  const canonicalToVertices = new Map<number, number[]>();

  for (let i = 0; i < vertexCount; i++) {
    const key = posKey(i);
    let canon = canonicalMap.get(key);
    if (canon === undefined) {
      canon = i;
      canonicalMap.set(key, canon);
      canonicalToVertices.set(canon, [i]);
    } else {
      canonicalToVertices.get(canon)!.push(i);
    }
    vertexToCanonical[i] = canon;
  }

  const neighbors = new Map<number, Set<number>>();
  const edgeCounts = new Map<string, number>();
  canonicalToVertices.forEach((_, canon) => neighbors.set(canon, new Set()));

  const addEdge = (a: number, b: number) => {
    if (a === b) return;
    neighbors.get(a)!.add(b);
    neighbors.get(b)!.add(a);
    const k = a < b ? `${a}_${b}` : `${b}_${a}`;
    edgeCounts.set(k, (edgeCounts.get(k) || 0) + 1);
  };

  for (let i = 0; i < indices.length; i += 3) {
    const c0 = vertexToCanonical[indices[i]];
    const c1 = vertexToCanonical[indices[i + 1]];
    const c2 = vertexToCanonical[indices[i + 2]];
    addEdge(c0, c1);
    addEdge(c1, c2);
    addEdge(c2, c0);
  }

  // Identify boundary vertices (edges shared by only 1 triangle) so open garment hems stay crisp
  const isBoundaryCanon = new Set<number>();
  edgeCounts.forEach((count, key) => {
    if (count === 1) {
      const [a, b] = key.split('_').map(Number);
      isBoundaryCanon.add(a);
      isBoundaryCanon.add(b);
    }
  });

  const tempX = new Float32Array(vertexCount);
  const tempY = new Float32Array(vertexCount);
  const tempZ = new Float32Array(vertexCount);

  const stepPass = (weight: number) => {
    for (let i = 0; i < vertexCount; i++) {
      tempX[i] = posAttr.getX(i);
      tempY[i] = posAttr.getY(i);
      tempZ[i] = posAttr.getZ(i);
    }

    canonicalToVertices.forEach((groupIdxs, canon) => {
      const adj = neighbors.get(canon)!;
      if (adj.size < 2) return;

      // Dampen smoothing on open garment hem boundaries so cuffs don't curl or shrink
      const effectiveWeight = isBoundaryCanon.has(canon) ? weight * 0.25 : weight;

      let avgX = 0;
      let avgY = 0;
      let avgZ = 0;
      adj.forEach((nCanon) => {
        avgX += tempX[nCanon];
        avgY += tempY[nCanon];
        avgZ += tempZ[nCanon];
      });
      const inv = 1 / adj.size;
      avgX *= inv;
      avgY *= inv;
      avgZ *= inv;

      const nx = tempX[canon] + effectiveWeight * (avgX - tempX[canon]);
      const ny = isBoundaryCanon.has(canon)
        ? tempY[canon]
        : tempY[canon] + effectiveWeight * (avgY - tempY[canon]);
      const nz = tempZ[canon] + effectiveWeight * (avgZ - tempZ[canon]);

      for (const vIdx of groupIdxs) {
        posAttr.setXYZ(vIdx, nx, ny, nz);
      }
    });
  };

  for (let iter = 0; iter < iterations; iter++) {
    stepPass(lambda);
    stepPass(mu);
  }

  posAttr.needsUpdate = true;
  computeWeldedVertexNormals(geometry, vertexToCanonical, canonicalToVertices);
}

/**
 * Computes seamless normals across UV seams so cylindrical lofts have zero visible seam lines.
 */
export function computeWeldedVertexNormals(
  geometry: THREE.BufferGeometry,
  vertexToCanonical?: Int32Array,
  canonicalToVertices?: Map<number, number[]>
): void {
  geometry.computeVertexNormals();
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const normAttr = geometry.attributes.normal as THREE.BufferAttribute;
  if (!posAttr || !normAttr) return;

  const vertexCount = posAttr.count;
  if (!vertexToCanonical || !canonicalToVertices) {
    const precision = 10000;
    const canonicalMap = new Map<string, number>();
    vertexToCanonical = new Int32Array(vertexCount);
    canonicalToVertices = new Map<number, number[]>();

    for (let i = 0; i < vertexCount; i++) {
      const key = `${Math.round(posAttr.getX(i) * precision)},${Math.round(
        posAttr.getY(i) * precision
      )},${Math.round(posAttr.getZ(i) * precision)}`;
      let canon = canonicalMap.get(key);
      if (canon === undefined) {
        canon = i;
        canonicalMap.set(key, canon);
        canonicalToVertices.set(canon, [i]);
      } else {
        canonicalToVertices.get(canon)!.push(i);
      }
      vertexToCanonical[i] = canon;
    }
  }

  canonicalToVertices.forEach((groupIdxs) => {
    if (groupIdxs.length <= 1) return;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (const idx of groupIdxs) {
      nx += normAttr.getX(idx);
      ny += normAttr.getY(idx);
      nz += normAttr.getZ(idx);
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const idx of groupIdxs) {
      normAttr.setXYZ(idx, nx, ny, nz);
    }
  });

  normAttr.needsUpdate = true;
}

function bell(x: number, center: number, width: number): number {
  const d = (x - center) / width;
  return Math.exp(-(d * d));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Shared analytical evaluator for the human torso, neck, and head at pelvis-local height `y`
 * (`y` in `[-0.095, 0.815]`) and angle `theta` (`[0, 2*PI]`).
 * Using this exact function for both the body and garments guarantees 100% anatomical fit
 * with zero lumpy intersections!
 */
export function evaluateTorsoAndHeadCrossSection(
  y: number,
  theta: number,
  params: BodyMorphParams,
  isGarmentDrape = false
): { rx: number; rz: number; zOffset: number } {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const { bustScale, waistScale, hipScale, shoulderScale, isMale } = params;

  let rx = 0.05;
  let rz = 0.05;
  let zOffset = 0;
  let extraRadial = 0;

  if (y < 0.505) {
    if (y < 0.035) {
      // Crotch / lower pelvis to full hip curve:
      // Smoothly taper into the central groin between the two upper thighs so there is zero hip shelf
      const t = smoothstep(-0.085, 0.035, y);
      const curve = Math.pow(t, 0.62);
      rx = (0.068 + curve * 0.092) * hipScale;
      rz = (0.052 + curve * 0.056) * hipScale;
    } else if (y < 0.175) {
      // Full Hip to Narrow Natural Waist
      const t = smoothstep(0.035, 0.175, y);
      rx = THREE.MathUtils.lerp(0.160 * hipScale, 0.100 * waistScale, t);
      rz = THREE.MathUtils.lerp(0.108 * hipScale, 0.075 * waistScale, t);
    } else if (y < 0.37) {
      // Waist up through Ribcage & Chest
      const t = smoothstep(0.175, 0.37, y);
      rx = THREE.MathUtils.lerp(0.100 * waistScale, 0.145 * shoulderScale, t);
      rz = THREE.MathUtils.lerp(0.075 * waistScale, 0.094, t);
    } else if (y < 0.455) {
      // Upper Chest to Deltoid / Clavicle Line
      const t = smoothstep(0.37, 0.455, y);
      const shoulderBell = Math.sin(t * Math.PI * 0.65);
      rx = (0.145 + shoulderBell * 0.024) * shoulderScale;
      rz = 0.094 - t * 0.012;
    } else {
      // Trapezius Slope tapering smoothly into Base of Neck
      const t = smoothstep(0.455, 0.505, y);
      rx = THREE.MathUtils.lerp(0.169 * shoulderScale, 0.042, Math.pow(t, 0.78));
      rz = THREE.MathUtils.lerp(0.082, 0.042, Math.pow(t, 0.78));
    }

    // Natural S-Curve Spine posture
    zOffset =
      bell(y, 0.18, 0.12) * 0.010 -
      bell(y, 0.36, 0.12) * 0.007 +
      bell(y, 0.0, 0.09) * -0.005;

    // 1. Chest / Bust Contour
    if (sinT > 0) {
      const bustHeight = bell(y, 0.335, 0.072);
      const teardrop = y < 0.335 ? 1.06 : 0.94;
      if (isGarmentDrape) {
        const drapeAcrossChest = bell(cosT, 0, 0.68);
        const bustProjection =
          drapeAcrossChest *
          bustHeight *
          teardrop *
          Math.pow(sinT, 1.15) *
          (isMale ? 0.014 : 0.042 * bustScale);
        extraRadial += bustProjection;
      } else {
        const leftMound = bell(cosT, 0.46, 0.35);
        const rightMound = bell(cosT, -0.46, 0.35);
        const bustProjection =
          (leftMound + rightMound) *
          bustHeight *
          teardrop *
          Math.pow(sinT, 1.3) *
          0.042 *
          bustScale;
        extraRadial += bustProjection;
      }
    }

    // 2. Gluteal Contour on Back of Pelvis
    if (sinT < 0) {
      const gluteHeight = bell(y, 0.015, 0.068);
      if (isGarmentDrape) {
        const gluteBridge = bell(cosT, 0, 0.68) * 0.022;
        extraRadial += gluteBridge * gluteHeight * Math.pow(-sinT, 1.15) * hipScale;
      } else {
        const leftCheek = bell(cosT, 0.42, 0.38);
        const rightCheek = bell(cosT, -0.42, 0.38);
        const cleftIndent = bell(cosT, 0, 0.11) * 0.007;
        const gluteProj =
          ((leftCheek + rightCheek) * 0.026 - cleftIndent) *
          gluteHeight *
          Math.pow(-sinT, 1.2) *
          hipScale;
        extraRadial += gluteProj;

        const spineGroove = bell(cosT, 0, 0.11) * bell(y, 0.25, 0.16) * -0.004 * -sinT;
        extraRadial += spineGroove;
      }
    }

    // 3. Soft Abdomen & Collarbone Relief on Bare Body
    if (sinT > 0 && !isGarmentDrape) {
      const belly =
        bell(y, 0.105, 0.065) * bell(cosT, 0, 0.5) * Math.pow(sinT, 1.5) * 0.007;
      const navel =
        bell(y, 0.155, 0.012) * bell(cosT, 0, 0.08) * Math.pow(sinT, 2) * -0.0035;
      const clavicle =
        bell(y, 0.445, 0.016) *
        (bell(cosT, 0.45, 0.35) + bell(cosT, -0.45, 0.35)) *
        Math.pow(sinT, 1.4) *
        0.004;
      extraRadial += belly + navel + clavicle;
    }

    if (!isGarmentDrape && params.shrinkTorsoUnderTop) {
      const coverMask = smoothstep(0.06, 0.11, y) * (1 - smoothstep(0.42, 0.465, y));
      extraRadial -= coverMask * 0.009;
    }
  } else if (y < 0.595) {
    // --- SLENDER NECK ---
    const t = smoothstep(0.505, 0.595, y);
    const neckCurve = 1 - Math.sin(t * Math.PI) * 0.07;
    const baseNeck = isMale ? 0.044 : 0.040;
    rx = baseNeck * neckCurve;
    rz = baseNeck * neckCurve;
    zOffset = t * 0.007;
  } else {
    // --- SCULPTED HUMAN HEAD ---
    const yMax = 0.815;
    const t = (y - 0.595) / (yMax - 0.595);

    if (t < 0.18) {
      const u = smoothstep(0, 0.18, t);
      const jawExpand = Math.pow(u, 0.65);
      rx = 0.015 + jawExpand * (isMale ? 0.048 : 0.045);
      rz = 0.017 + jawExpand * 0.055;
      zOffset = 0.007 + (1 - u) * 0.013;
    } else if (t < 0.62) {
      const u = (t - 0.18) / 0.44;
      rx = (isMale ? 0.063 : 0.060) + Math.sin(u * Math.PI * 0.72) * 0.012;
      rz = 0.072 + Math.sin(u * Math.PI * 0.65) * 0.014;
      zOffset = 0.007 - u * 0.009;
    } else {
      const u = (t - 0.62) / 0.38;
      const dome = Math.cos(u * Math.PI * 0.5);
      const smoothDome = Math.pow(Math.max(0, dome), 0.82);
      rx = Math.max(0.002, 0.072 * smoothDome);
      rz = Math.max(0.002, 0.086 * smoothDome);
      zOffset = -0.002;
    }

    if (sinT > 0 && t > 0.05 && t < 0.78) {
      const noseBridge =
        bell(cosT, 0, 0.14) * bell(t, 0.42, 0.11) * Math.pow(sinT, 2.2) * 0.012;
      const noseTip =
        bell(cosT, 0, 0.11) * bell(t, 0.35, 0.045) * Math.pow(sinT, 2.5) * 0.0065;
      const eyeSockets =
        (bell(cosT, 0.36, 0.18) + bell(cosT, -0.36, 0.18)) *
        bell(t, 0.49, 0.065) *
        Math.pow(sinT, 1.6) *
        -0.0055;
      const browArch =
        (bell(cosT, 0.34, 0.22) + bell(cosT, -0.34, 0.22)) *
        bell(t, 0.56, 0.04) *
        Math.pow(sinT, 1.6) *
        0.0035;
      const lips =
        bell(cosT, 0, 0.22) * bell(t, 0.21, 0.04) * Math.pow(sinT, 2.0) * 0.005;
      const cheekbones =
        (bell(cosT, 0.58, 0.22) + bell(cosT, -0.58, 0.22)) *
        bell(t, 0.39, 0.08) *
        Math.pow(sinT, 1.2) *
        0.004;

      extraRadial += noseBridge + noseTip + eyeSockets + browArch + lips + cheekbones;
    }
  }

  return {
    rx: Math.max(0.002, rx + extraRadial),
    rz: Math.max(0.002, rz + extraRadial),
    zOffset,
  };
}

/**
 * C-infinity smooth anatomical evaluator for a human leg from upper hip socket (`d = -0.055m`)
 * through thigh, knee (`d = 0.45m`), calf (`d = 0.585m`), down to the ankle (`d = 0.89m`).
 * Eliminates all piecewise slope kinks at the knee and hip joints!
 */
export function evaluateSmoothLegCrossSection(
  d: number,
  theta: number,
  sign: number,
  legMass: number,
  hipScale: number
): { rx: number; rz: number; xShift: number; zShift: number } {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // Smooth C2 taper from upper thigh (d = 0) down to ankle (d = 0.89)
  const thighTaper = 1 - smoothstep(-0.03, 0.44, d);
  const quadSwell = bell(d, 0.19, 0.14) * 0.006;
  const kneeBridge = bell(d, 0.45, 0.075) * 0.0025;
  const calfSwell = bell(d, 0.585, 0.115) * 0.0125;
  const ankleTaper = smoothstep(0.56, 0.88, d) * 0.0155;

  let rx =
    (0.042 + thighTaper * 0.036 + quadSwell + kneeBridge + calfSwell * 0.85 - ankleTaper) *
    legMass;
  let rz =
    (0.044 +
      thighTaper * 0.044 +
      quadSwell * 1.15 +
      kneeBridge +
      calfSwell * 1.05 -
      ankleTaper * 0.95) *
    legMass;

  // Smoothly tuck the top rim (d < 0.015) inward into the pelvis so there is zero hip ridge
  const socketBlend = smoothstep(-0.055, 0.020, d);
  const socketScale = 0.76 + 0.24 * socketBlend;
  rx *= socketScale;
  rz *= socketScale;

  // Subtle anatomical alignment shifts (100% continuous along d)
  const xShift =
    -sign * (1 - socketBlend) * 0.024 * hipScale +
    sign * bell(d, 0.22, 0.16) * 0.003 +
    sign * bell(d, 0.58, 0.12) * 0.002;

  const zShift =
    bell(d, 0.20, 0.14) * 0.003 -
    bell(d, 0.585, 0.115) * 0.0045 -
    bell(d, 0.0, 0.08) * 0.004;

  // Gentle gastrocnemius back-of-calf contour (smooth in theta: (max(0, -sinT))^2 has zero slope at sinT=0)
  const backMuscle =
    bell(d, 0.575, 0.105) * Math.pow(Math.max(0, -sinT), 2.0) * 0.005 * legMass;
  rz += backMuscle;

  return { rx, rz, xShift, zShift };
}

/**
 * Builds the continuous sculpted Torso + Neck + Head BufferGeometry in pelvis-local space
 * (`y` in `[-0.085, 0.815]`), then smooths it so there are zero seams.
 */
export function createSculptedTorsoAndHeadGeometry(
  params: BodyMorphParams
): THREE.BufferGeometry {
  const yMin = -0.085;
  const yMax = 0.815;
  const segmentsY = 112;
  const radialSegments = 72;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let yIdx = 0; yIdx <= segmentsY; yIdx++) {
    const v = yIdx / segmentsY;
    const y = yMin + v * (yMax - yMin);

    let endCap = 1.0;
    if (v < 0.035) {
      endCap = Math.sin((v / 0.035) * (Math.PI * 0.5));
    }

    for (let rIdx = 0; rIdx <= radialSegments; rIdx++) {
      const u = rIdx / radialSegments;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const { rx, rz, zOffset } = evaluateTorsoAndHeadCrossSection(
        y,
        theta,
        params,
        false
      );

      positions.push(cosT * rx * endCap, y, sinT * rz * endCap + zOffset);
      uvs.push(u, v);
    }
  }

  const ringStride = radialSegments + 1;
  for (let yIdx = 0; yIdx < segmentsY; yIdx++) {
    for (let rIdx = 0; rIdx < radialSegments; rIdx++) {
      const a = yIdx * ringStride + rIdx;
      const b = (yIdx + 1) * ringStride + rIdx;
      const c = (yIdx + 1) * ringStride + (rIdx + 1);
      const d = yIdx * ringStride + (rIdx + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  smoothBufferGeometry(geo, 3, 0.42, -0.44);

  // Recompute vertical UV coordinate `v` from actual post-smoothed vertex `y`
  // so 2D facial features (brows, eyelids, nose, lips, navel) align to the sub-millimeter!
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
  const ySpan = yMax - yMin;
  for (let i = 0; i < posAttr.count; i++) {
    const actualY = posAttr.getY(i);
    const vExact = Math.max(0, Math.min(1, (actualY - yMin) / ySpan));
    uvAttr.setY(i, vExact);
  }
  uvAttr.needsUpdate = true;

  return geo;
}

export type GarmentNecklineStyle =
  | 'crew'
  | 'v_collar'
  | 'turtleneck'
  | 'scoop'
  | 'outerwear_collar'
  | 'waistband';

/**
 * Builds a tailored, smooth 3D Torso Garment (Top, Outerwear, or Skirt/Pelvis Yoke)
 * with an anatomically contoured 3D neckline (covering the shoulders up to the neck base
 * while dipping naturally in front), natural 3D fabric drape folds, and open bottom hem.
 */
export function createTailoredTorsoGarmentGeometry(
  yBottom: number,
  yTopBase: number,
  shellOffset: number,
  easeMultiplier: number,
  openFrontAngle: number,
  isSkirtFlare: boolean,
  necklineStyle: GarmentNecklineStyle,
  params: BodyMorphParams
): THREE.BufferGeometry {
  const segY = 56;
  const segR = 64;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const startPhi = openFrontAngle > 0 ? Math.PI * 0.5 + openFrontAngle * 0.5 : 0;
  const totalPhi = Math.PI * 2 - openFrontAngle;

  const waistRef = evaluateTorsoAndHeadCrossSection(0.175, 0, params, true);

  for (let yIdx = 0; yIdx <= segY; yIdx++) {
    const v = yIdx / segY;

    for (let rIdx = 0; rIdx <= segR; rIdx++) {
      const u = rIdx / segR;
      const theta = startPhi + u * totalPhi;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      let yTop = yTopBase;
      if (necklineStyle === 'crew') {
        const frontDip = Math.pow(Math.max(0, sinT), 1.8) * 0.036;
        const backDip = Math.pow(Math.max(0, -sinT), 2.2) * 0.010;
        yTop = 0.512 - frontDip - backDip;
      } else if (necklineStyle === 'v_collar') {
        const frontVDip = Math.pow(Math.max(0, sinT), 2.6) * 0.052;
        yTop = 0.516 - frontVDip;
      } else if (necklineStyle === 'scoop') {
        const frontScoop = Math.pow(Math.max(0, sinT), 1.5) * 0.068;
        const backScoop = Math.pow(Math.max(0, -sinT), 1.6) * 0.042;
        yTop = 0.504 - frontScoop - backScoop;
      } else if (necklineStyle === 'turtleneck') {
        yTop = 0.562 - Math.pow(Math.max(0, sinT), 2.0) * 0.006;
      } else if (necklineStyle === 'outerwear_collar') {
        yTop = 0.518 - Math.pow(Math.max(0, sinT), 1.8) * 0.028;
      }

      const y = yBottom + v * (yTop - yBottom);

      const clampedY = Math.max(-0.080, Math.min(0.565, y));
      const base = evaluateTorsoAndHeadCrossSection(clampedY, theta, params, true);

      let rx = base.rx;
      let rz = base.rz;
      let zOffset = base.zOffset;

      if (!isSkirtFlare && necklineStyle !== 'waistband' && y > 0.03 && y < 0.31) {
        const relaxFactor = Math.min(0.55, (easeMultiplier - 1.0) * 5.5);
        const straightRx = THREE.MathUtils.lerp(
          0.160 * params.hipScale,
          0.146 * params.shoulderScale,
          smoothstep(0.03, 0.31, y)
        );
        const straightRz = THREE.MathUtils.lerp(
          0.108 * params.hipScale,
          0.098,
          smoothstep(0.03, 0.31, y)
        );
        rx = THREE.MathUtils.lerp(rx, Math.max(rx, straightRx), relaxFactor);
        rz = THREE.MathUtils.lerp(rz, Math.max(rz, straightRz), relaxFactor);
      }

      let drapeFold = 0;
      if (necklineStyle !== 'waistband' && !isSkirtFlare && y < 0.24) {
        const waistWaveZone = bell(y, 0.14, 0.075);
        drapeFold =
          (Math.sin(theta * 7 + y * 14) * 0.0016 +
            Math.cos(theta * 11 - y * 10) * 0.0010) *
          waistWaveZone;
      }

      // Skirt Flare OR Trouser Pelvis-to-Groin Seamless Tuck below y = 0.03
      if (y < 0.03) {
        const dropDist = 0.03 - y;
        if (isSkirtFlare) {
          const flareRx = waistRef.rx * 1.48 + dropDist * 0.25;
          const flareRz = waistRef.rz * 1.42 + dropDist * 0.21;
          const pleatWave =
            Math.sin(theta * 10) * smoothstep(0.03, -0.32, y) * 0.005;
          rx = Math.max(rx, flareRx) + pleatWave;
          rz = Math.max(rz, flareRz) + pleatWave;
          zOffset = THREE.MathUtils.lerp(base.zOffset, 0, Math.min(1, dropDist * 3));
        } else if (necklineStyle === 'waistband') {
          // Trouser pelvis yoke: smoothly tuck into the center crotch between the two upper thighs
          // so its bottom edge never overhangs or creates a ridge on the thighs!
          const tGroin = smoothstep(0.030, yBottom, y);
          rx = THREE.MathUtils.lerp(rx, 0.078 * params.hipScale, Math.pow(tGroin, 1.15));
          rz = THREE.MathUtils.lerp(rz, 0.056 * params.hipScale, Math.pow(tGroin, 1.05));
        } else {
          // Trench coat / long outerwear flare
          const coatFlare = Math.max(0, dropDist - 0.04) * 0.15;
          rx = Math.max(rx, 0.158 * params.hipScale + coatFlare);
          rz = Math.max(rz, 0.110 * params.hipScale + coatFlare * 0.85);
        }
      }

      let collarOrWaistRim = 0;
      if (v > 0.93) {
        const rimT = (v - 0.93) / 0.07;
        if (necklineStyle === 'v_collar' || necklineStyle === 'outerwear_collar') {
          collarOrWaistRim = Math.sin(rimT * Math.PI) * 0.0055;
        } else if (necklineStyle === 'turtleneck') {
          collarOrWaistRim = Math.sin(rimT * Math.PI) * 0.0045;
        } else {
          collarOrWaistRim = Math.sin(rimT * Math.PI) * 0.0022;
        }
      }
      const bottomHemRim =
        necklineStyle === 'waistband'
          ? 0
          : v < 0.04
          ? (1 - v / 0.04) * 0.0016
          : 0;

      let lapelBoost = 0;
      if (openFrontAngle > 0 && y > 0.12) {
        const edgeDist = Math.min(u, 1 - u);
        if (edgeDist < 0.09) {
          lapelBoost =
            Math.sin((1 - edgeDist / 0.09) * Math.PI) *
            smoothstep(0.12, 0.38, y) *
            0.0065;
        }
      }

      const totalOffset =
        shellOffset + drapeFold + collarOrWaistRim + bottomHemRim + lapelBoost;
      const finalRx = (rx + totalOffset) * easeMultiplier;
      const finalRz = (rz + totalOffset) * easeMultiplier;

      positions.push(cosT * finalRx, y, sinT * finalRz + zOffset);
      uvs.push(u, v);
    }
  }

  const stride = segR + 1;
  for (let yIdx = 0; yIdx < segY; yIdx++) {
    for (let rIdx = 0; rIdx < segR; rIdx++) {
      const a = yIdx * stride + rIdx;
      const b = (yIdx + 1) * stride + rIdx;
      const c = (yIdx + 1) * stride + (rIdx + 1);
      const d = yIdx * stride + (rIdx + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  smoothBufferGeometry(geo, 3, 0.42, -0.43);
  return geo;
}

/**
 * Builds a continuous, seamless Human Arm + Hand OR Leg + Foot geometry where the top socket
 * flares organically into the shoulder/pelvis (NO pinched sausage joint at t=0!)
 * and only the distal fingertip/toe tip closes smoothly at t=1.
 */
export function createSmoothContinuousLimbGeometry(
  totalLength: number,
  yTopOffset: number,
  sliceFn: (t: number, theta: number) => { x: number; z: number },
  segmentsY = 56,
  radialSegments = 36
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let yIdx = 0; yIdx <= segmentsY; yIdx++) {
    const t = yIdx / segmentsY;
    // Start slightly above the joint pivot (yTopOffset > 0) so the shoulder/hip blends into the torso
    const y = yTopOffset - t * (totalLength + yTopOffset);

    // Only close the distal tip (fingers / toes at t > 0.965); NEVER pinch the top shoulder/hip socket!
    let tipCap = 1.0;
    if (t > 0.965) {
      tipCap = Math.max(0.05, Math.cos(((t - 0.965) / 0.035) * (Math.PI * 0.5)));
    }

    for (let rIdx = 0; rIdx <= radialSegments; rIdx++) {
      const u = rIdx / radialSegments;
      const theta = u * Math.PI * 2;
      const raw = sliceFn(t, theta);

      positions.push(raw.x * tipCap, y, raw.z * tipCap);
      uvs.push(u, 1 - t);
    }
  }

  const ringStride = radialSegments + 1;
  for (let yIdx = 0; yIdx < segmentsY; yIdx++) {
    for (let rIdx = 0; rIdx < radialSegments; rIdx++) {
      const a = yIdx * ringStride + rIdx;
      const b = (yIdx + 1) * ringStride + rIdx;
      const c = (yIdx + 1) * ringStride + (rIdx + 1);
      const d = yIdx * ringStride + (rIdx + 1);

      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  smoothBufferGeometry(geo, 3, 0.42, -0.44);
  return geo;
}

/**
 * Builds an OPEN-HEMMED Sleeve or Trouser Leg geometry with ZERO sausage cap pinching!
 * Both the shoulder/hip junction and the wrist/ankle cuff remain open and cleanly tailored.
 */
export function createOpenHemGarmentLimbGeometry(
  totalLength: number,
  yTopOffset: number,
  sliceFn: (d: number, t: number, theta: number) => { x: number; z: number },
  segmentsY = 38,
  radialSegments = 36
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let yIdx = 0; yIdx <= segmentsY; yIdx++) {
    const t = yIdx / segmentsY;
    const y = yTopOffset - t * (totalLength + yTopOffset);
    const d = -y; // distance below joint pivot

    // Subtle tailored cuff rim at the bottom open edge (t > 0.94)
    const cuffRim = t > 0.94 ? Math.sin(((t - 0.94) / 0.06) * Math.PI) * 0.0018 : 0;

    for (let rIdx = 0; rIdx <= radialSegments; rIdx++) {
      const u = rIdx / radialSegments;
      const theta = u * Math.PI * 2;
      const raw = sliceFn(d, t, theta);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      positions.push(
        raw.x + cosT * cuffRim,
        y,
        raw.z + sinT * cuffRim
      );
      uvs.push(u, 1 - t);
    }
  }

  const ringStride = radialSegments + 1;
  for (let yIdx = 0; yIdx < segmentsY; yIdx++) {
    for (let rIdx = 0; rIdx < radialSegments; rIdx++) {
      const a = yIdx * ringStride + rIdx;
      const b = (yIdx + 1) * ringStride + rIdx;
      const c = (yIdx + 1) * ringStride + (rIdx + 1);
      const d = yIdx * ringStride + (rIdx + 1);

      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  smoothBufferGeometry(geo, 2, 0.38, -0.39);
  return geo;
}

/**
 * Assigns smooth 4-bone skinning weights to a Torso/Garment mesh.
 * Automatically detects whether vertex Y is in pelvis-local space `[-0.4, 0.85]`
 * or world space `[0.55, 1.80]` (where pelvis is at y = 0.96m) so weights are NEVER mismatched!
 * Bones: 0 = pelvis, 1 = spine/waist, 2 = chest, 3 = neck, 4 = head
 */
export function applyTorsoSkinWeights(
  geometry: THREE.BufferGeometry,
  isWorldSpaceY = false
): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  const centers = [0.02, 0.18, 0.36, 0.535, 0.69];
  const widths = [0.15, 0.13, 0.16, 0.085, 0.15];

  for (let i = 0; i < count; i++) {
    const rawY = pos.getY(i);
    const y = isWorldSpaceY ? rawY - 0.96 : rawY;

    const weights = centers.map((c, idx) => {
      if (idx === 0 && y < c) return 1.0;
      if (idx === 4 && y > c) return 1.0;
      return Math.exp(-Math.pow((y - c) / widths[idx], 2));
    });

    const pairs = weights
      .map((w, boneIdx) => ({ boneIdx, w }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 4);

    const sum = pairs.reduce((acc, p) => acc + p.w, 0) || 1;
    for (let j = 0; j < 4; j++) {
      skinIndices[i * 4 + j] = pairs[j].boneIdx;
      skinWeights[i * 4 + j] = pairs[j].w / sum;
    }
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
}

/**
 * Assigns smooth 4-bone skinning weights along a continuous limb or sleeve/trouser leg:
 * Bone 0: Root Anchor Bone (`chest` for arms/sleeves, `pelvis` for legs/trousers)
 * Bone 1: Upper Limb Bone (`shoulder` or `hip`)
 * Bone 2: Mid Limb Bone (`elbow` or `knee`)
 * Bone 3: Distal Limb Bone (`wrist` or `ankle`)
 *
 * Blending Bone 0 (`chest`/`pelvis`) with Bone 1 (`shoulder`/`hip`) at the top socket
 * completely eliminates shoulder and hip joint seams when the model moves!
 */
export function applySeamlessLimbSkinWeights(
  geometry: THREE.BufferGeometry,
  midJointD: number,
  distalJointD: number,
  socketBlendLength = 0.065
): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    // d is distance downward from the shoulder/hip joint pivot (negative above pivot, positive below)
    const d = -pos.getY(i);

    // Smooth blend from Root Anchor Bone (0: chest/pelvis) to Upper Limb Bone (1: shoulder/hip)
    const tSocket = smoothstep(-0.045, socketBlendLength, d);
    // Smooth blend across Mid Joint (2: elbow/knee) and Distal Joint (3: wrist/ankle)
    const tMid = smoothstep(midJointD - 0.085, midJointD + 0.085, d);
    const tDistal = smoothstep(distalJointD - 0.055, distalJointD + 0.055, d);

    const wAnchor = 1 - tSocket;
    const wUpper = tSocket * (1 - tMid);
    const wMid = tMid * (1 - tDistal);
    const wDistal = tDistal;
    const sum = wAnchor + wUpper + wMid + wDistal || 1;

    skinIndices[i * 4 + 0] = 0;
    skinIndices[i * 4 + 1] = 1;
    skinIndices[i * 4 + 2] = 2;
    skinIndices[i * 4 + 3] = 3;

    skinWeights[i * 4 + 0] = wAnchor / sum;
    skinWeights[i * 4 + 1] = wUpper / sum;
    skinWeights[i * 4 + 2] = wMid / sum;
    skinWeights[i * 4 + 3] = wDistal / sum;
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
}

export function determineJointFromTorsoHeight(localY: number): JointId {
  if (localY > 0.58) return 'head';
  if (localY > 0.48) return 'neck';
  if (localY > 0.27) return 'chest';
  if (localY > 0.11) return 'spine';
  return 'pelvis';
}
