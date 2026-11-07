import * as THREE from 'three';
import { GenderProfile, HairstyleId } from '../types/studio';

let cachedHairNormalMap: THREE.CanvasTexture | null = null;
const cachedHairDiffuseMap = new Map<string, THREE.CanvasTexture>();
const cachedEyeTextureMap = new Map<string, THREE.CanvasTexture>();

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

/**
 * Generates a procedural longitudinal hair-strand normal map so 3D hair volumes
 * and ribbons exhibit realistic anisotropic fiber highlights under studio lighting.
 */
function getHairStrandNormalMap(): THREE.CanvasTexture {
  if (cachedHairNormalMap) return cachedHairNormalMap;

  const width = 256;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const strand1 = Math.sin((x + Math.sin(y * 0.07) * 2.0) * 1.4);
      const strand2 = Math.cos(x * 2.8 - Math.cos(y * 0.05) * 1.2);
      const strand3 = Math.sin(x * 5.2);
      const nx = 128 + Math.round(strand1 * 24 + strand2 * 14 + strand3 * 8);
      const ny = 128 + Math.round(Math.sin(y * 0.12) * 5);

      data[idx] = Math.min(255, Math.max(0, nx));
      data[idx + 1] = Math.min(255, Math.max(0, ny));
      data[idx + 2] = 255;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;

  cachedHairNormalMap = tex;
  return tex;
}

/**
 * Generates a multi-tone hair fiber diffuse texture with natural root-to-tip shading
 * and individual micro-strand highlights.
 */
function getHairStrandDiffuseMap(hairColorHex: string): THREE.CanvasTexture {
  if (cachedHairDiffuseMap.has(hairColorHex)) {
    return cachedHairDiffuseMap.get(hairColorHex)!;
  }

  const width = 256;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const base = new THREE.Color(hairColorHex);
  const r = Math.round(base.r * 255);
  const g = Math.round(base.g * 255);
  const b = Math.round(base.b * 255);

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const halo = Math.exp(-Math.pow((v - 0.42) / 0.16, 2)) * 22 - (1 - v) * 10;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const fiber =
        Math.sin(x * 1.3 + Math.sin(y * 0.05) * 2) * 11 +
        Math.cos(x * 3.7) * 7 +
        Math.sin(x * 7.1) * 4;
      const delta = Math.round(halo + fiber);

      data[idx] = Math.min(255, Math.max(0, r + delta));
      data[idx + 1] = Math.min(255, Math.max(0, g + delta));
      data[idx + 2] = Math.min(255, Math.max(0, b + delta));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  cachedHairDiffuseMap.set(hairColorHex, tex);
  return tex;
}

export function createHairMaterial(
  hairColorHex: string
): THREE.MeshPhysicalMaterial {
  const baseCol = new THREE.Color(hairColorHex);
  const sheenCol = baseCol.clone().lerp(new THREE.Color('#FFF8F0'), 0.38);

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FFFFFF'),
    map: getHairStrandDiffuseMap(hairColorHex),
    roughness: 0.38,
    metalness: 0.04,
    sheen: 0.85,
    sheenColor: sheenCol,
    sheenRoughness: 0.28,
    clearcoat: 0.22,
    clearcoatRoughness: 0.26,
    normalMap: getHairStrandNormalMap(),
    normalScale: new THREE.Vector2(0.42, 0.22),
    side: THREE.DoubleSide,
  });
}

/**
 * Generates a photorealistic 256x256 Eye Iris + Sclera + Limbal Ring + Catchlight texture
 * designed for planar frontal UVs centered at (u = 0.5, v = 0.5).
 */
function getPhotorealisticEyeTexture(irisColorHex: string): THREE.CanvasTexture {
  if (cachedEyeTextureMap.has(irisColorHex)) {
    return cachedEyeTextureMap.get(irisColorHex)!;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // 1. Sclera with soft warm outer shadow and inner caruncle warmth
  const scleraGrad = ctx.createRadialGradient(
    cx,
    cy,
    size * 0.18,
    cx,
    cy,
    size * 0.5
  );
  scleraGrad.addColorStop(0, '#FDFCFB');
  scleraGrad.addColorStop(0.72, '#F4EDE8');
  scleraGrad.addColorStop(1, '#DDBFB3');
  ctx.fillStyle = scleraGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. Dark Limbal Ring around Iris (sized realistically for planar frontal eye projection)
  const irisRadius = size * 0.28;
  ctx.beginPath();
  ctx.arc(cx, cy, irisRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#140E0C';
  ctx.fill();

  // 3. Radial Iris Base & Stroma Fibers
  const irisCol = new THREE.Color(irisColorHex || '#3E2723');
  const ir = Math.round(irisCol.r * 255);
  const ig = Math.round(irisCol.g * 255);
  const ib = Math.round(irisCol.b * 255);

  const irisGrad = ctx.createRadialGradient(
    cx,
    cy,
    irisRadius * 0.24,
    cx,
    cy,
    irisRadius * 0.92
  );
  irisGrad.addColorStop(
    0,
    `rgb(${Math.min(255, ir + 38)}, ${Math.min(255, ig + 30)}, ${Math.min(
      255,
      ib + 22
    )})`
  );
  irisGrad.addColorStop(0.65, `rgb(${ir}, ${ig}, ${ib})`);
  irisGrad.addColorStop(
    1,
    `rgb(${Math.max(0, ir - 45)}, ${Math.max(0, ig - 45)}, ${Math.max(
      0,
      ib - 45
    )})`
  );

  ctx.beginPath();
  ctx.arc(cx, cy, irisRadius * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = irisGrad;
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  for (let a = 0; a < 72; a++) {
    const angle = (a / 72) * Math.PI * 2;
    ctx.strokeStyle =
      a % 2 === 0 ? 'rgba(255, 240, 220, 0.18)' : 'rgba(18, 10, 6, 0.24)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(angle) * irisRadius * 0.34,
      Math.sin(angle) * irisRadius * 0.34
    );
    ctx.lineTo(
      Math.cos(angle) * irisRadius * 0.88,
      Math.sin(angle) * irisRadius * 0.88
    );
    ctx.stroke();
  }
  ctx.restore();

  // 4. Deep Black Pupil
  ctx.beginPath();
  ctx.arc(cx, cy, irisRadius * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = '#070709';
  ctx.fill();

  // 5. Dual Specular Window Catchlights
  ctx.beginPath();
  ctx.arc(
    cx + irisRadius * 0.28,
    cy - irisRadius * 0.28,
    irisRadius * 0.17,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    cx - irisRadius * 0.26,
    cy + irisRadius * 0.24,
    irisRadius * 0.085,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
  ctx.fill();

  // 6. Soft Upper Eyelid Cast Shadow across top of eyeball
  const topShadow = ctx.createLinearGradient(
    0,
    cy - irisRadius * 1.35,
    0,
    cy - irisRadius * 0.1
  );
  topShadow.addColorStop(0, 'rgba(30, 16, 14, 0.52)');
  topShadow.addColorStop(0.5, 'rgba(30, 16, 14, 0.14)');
  topShadow.addColorStop(1, 'rgba(30, 16, 14, 0)');
  ctx.fillStyle = topShadow;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedEyeTextureMap.set(irisColorHex, tex);
  return tex;
}

/**
 * Creates a non-twisting, flat-ribbon 3D hair lock along a CatmullRomCurve3 path.
 * Unlike `computeFrenetFrames` (which flips 180° at S-curve inflection points),
 * this uses a Head-Radial Surface Frame so every ribbon lies flat against the skull and shoulders!
 */
function createSleekHairRibbonGeometry(
  points: THREE.Vector3[],
  maxWidth: number,
  maxThickness: number,
  tubularSegments = 26,
  radialSegments = 10
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const pt = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();

    // Outward radial vector from the head/neck central axis (never flips on S-waves!)
    const R = new THREE.Vector3(
      pt.x,
      (pt.y - 0.13) * 0.22,
      pt.z + 0.015
    );
    if (R.lengthSq() < 1e-6) R.set(0, 0, -1);
    R.normalize();

    // W is tangent to the head/shoulder contour (ribbon width axis)
    const W = new THREE.Vector3().crossVectors(T, R);
    if (W.lengthSq() < 1e-6) W.set(1, 0, 0);
    W.normalize();

    // N points radially outward from the hair sheet (ribbon thickness axis)
    const N = new THREE.Vector3().crossVectors(W, T).normalize();

    let taperW = 1.0;
    let taperTh = 1.0;
    if (t < 0.12) {
      taperW = 0.55 + 0.45 * (t / 0.12);
      taperTh = 0.35 + 0.65 * (t / 0.12);
    } else if (t > 0.72) {
      const u = (t - 0.72) / 0.28;
      taperW = Math.max(0.06, Math.cos(u * Math.PI * 0.5));
      taperTh = Math.max(0.03, Math.cos(u * Math.PI * 0.5));
    }

    const w = maxWidth * taperW;
    const th = maxThickness * taperTh;

    for (let j = 0; j <= radialSegments; j++) {
      const u = j / radialSegments;
      const angle = u * Math.PI * 2;
      const localW = Math.cos(angle) * w;
      const localN = Math.sin(angle) * th;

      const vx = pt.x + W.x * localW + N.x * localN;
      const vy = pt.y + W.y * localW + N.y * localN;
      const vz = pt.z + W.z * localW + N.z * localN;

      positions.push(vx, vy, vz);
      uvs.push(u, t);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a continuous, thick 3D sculpted hair canopy that wraps seamlessly around
 * the back and sides of the head from the crown down to `yBottom`, leaving the front
 * face open while eliminating any gaps between individual hair locks.
 */
function buildContinuousHairCanopyGeometry(
  yBottom: number,
  isWavy: boolean,
  flareFactor: number
): THREE.BufferGeometry {
  const segY = 36;
  const segU = 40;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Wrap around the sides and back of the head: angle from -0.62*PI (right temple) through -PI (back) to +0.62*PI (left temple)
  const angleSpan = Math.PI * 1.32;
  const startAngle = Math.PI * 0.5 + (Math.PI * 2 - angleSpan) * 0.5;
  const yTop = 0.222; // Crown of head
  const thickness = 0.0085;

  const pushSurfaceRing = (yIdx: number, isInner: boolean) => {
    const v = yIdx / segY; // 0 = crown, 1 = bottom hair tips
    const y = THREE.MathUtils.lerp(yTop, yBottom, v);

    // Taper thickness at crown (v=0) and bottom tips (v=1)
    const tipTaper = Math.sin(Math.min(1, (1 - v) * 4.5) * (Math.PI * 0.5));
    const curThick = thickness * tipTaper * (isInner ? -0.35 : 0.65);

    for (let uIdx = 0; uIdx <= segU; uIdx++) {
      const u = uIdx / segU;
      const phi = startAngle + u * angleSpan;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      // Taper slightly near the front temples (u near 0 or 1)
      const templeFade =
        smoothstep(0.0, 0.12, u) * smoothstep(0.0, 0.12, 1 - u);

      // Base skull contour for y > 0.06, transitioning to shoulder/back drape below y = 0.06
      const crownPinch = Math.sin(Math.min(1, v * 5.5) * (Math.PI * 0.5));
      const shoulderFlare =
        smoothstep(0.25, 0.95, v) * 0.022 * flareFactor;
      const waveOffset = isWavy
        ? Math.sin(v * Math.PI * 3.5 + u * Math.PI * 4) *
          0.0055 *
          smoothstep(0.15, 0.5, v)
        : 0;

      const rx =
        (0.072 + shoulderFlare + waveOffset + curThick * templeFade) *
        crownPinch;
      const rz =
        (0.084 + shoulderFlare * 0.85 + waveOffset + curThick * templeFade) *
        crownPinch;

      const zBackDrape = -smoothstep(0.32, 1.0, v) * 0.024 * flareFactor - 0.005;

      const x = cosP * rx;
      const z = sinP * rz + zBackDrape;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  };

  // Outer surface (0 .. segY)
  for (let yIdx = 0; yIdx <= segY; yIdx++) {
    pushSurfaceRing(yIdx, false);
  }
  // Inner surface (0 .. segY)
  const innerOffset = (segY + 1) * (segU + 1);
  for (let yIdx = 0; yIdx <= segY; yIdx++) {
    pushSurfaceRing(yIdx, true);
  }

  const stride = segU + 1;
  for (let yIdx = 0; yIdx < segY; yIdx++) {
    for (let uIdx = 0; uIdx < segU; uIdx++) {
      const a = yIdx * stride + uIdx;
      const b = (yIdx + 1) * stride + uIdx;
      const c = (yIdx + 1) * stride + (uIdx + 1);
      const d = yIdx * stride + (uIdx + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);

      const ia = innerOffset + a;
      const ib = innerOffset + b;
      const ic = innerOffset + c;
      const id = innerOffset + d;
      indices.push(ia, id, ib);
      indices.push(ib, id, ic);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds realistic 3D Human Eyes (with Planar Frontal UVs so the iris & pupil face straight ahead!)
 * and contoured 3D Ears in Head Bone local coordinates.
 */
export function buildHumanFacialFeatures(
  gender: GenderProfile,
  limbSkinMaterial: THREE.MeshPhysicalMaterial,
  hairColorHex: string,
  eyeColorHex: string
): THREE.Group {
  const faceGroup = new THREE.Group();
  faceGroup.name = 'HumanFacialFeatures';

  const isFemale = gender === 'female';
  const isMale = gender === 'male';

  const eyeTex = getPhotorealisticEyeTexture(eyeColorHex || '#3E2723');
  const eyeMat = new THREE.MeshPhysicalMaterial({
    map: eyeTex,
    roughness: 0.08,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const lashMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hairColorHex).lerp(new THREE.Color('#09090B'), 0.65),
    roughness: 0.45,
  });

  const eyeSpacingX = isMale ? 0.0268 : 0.0258;
  const eyeY = 0.1078;
  const eyeZ = 0.0752;

  (['left', 'right'] as const).forEach((side) => {
    const sign = side === 'left' ? 1 : -1;
    const eyeSocketGrp = new THREE.Group();
    eyeSocketGrp.position.set(sign * eyeSpacingX, eyeY, eyeZ);
    eyeSocketGrp.rotation.y = sign * 0.18;
    eyeSocketGrp.rotation.x = -0.02;

    // Almond-shaped Corneal Eye Lens sitting flush in the orbital socket
    const lensGeo = new THREE.SphereGeometry(
      0.0094,
      28,
      22,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.52
    );
    lensGeo.rotateX(Math.PI * 0.5);
    lensGeo.scale(1.22, 0.78, 0.42);

    // CRITICAL FIX: Assign planar frontal UVs centered at (0.5, 0.5) so the pupil, iris,
    // limbal ring, and catchlights sit dead-center looking straight forward!
    const pos = lensGeo.attributes.position as THREE.BufferAttribute;
    const uv = lensGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      uv.setXY(i, 0.5 + vx / 0.021, 0.5 + vy / 0.017);
    }
    uv.needsUpdate = true;

    const lensMesh = new THREE.Mesh(lensGeo, eyeMat);
    eyeSocketGrp.add(lensMesh);

    // Delicate Upper Eyelash Rim hugging the top border of the almond eye
    const lashPts = [
      new THREE.Vector3(-sign * 0.0104, -0.0008, 0.0018),
      new THREE.Vector3(-sign * 0.0038, 0.0056, 0.0039),
      new THREE.Vector3(sign * 0.0042, 0.0054, 0.0037),
      new THREE.Vector3(sign * 0.0108, -0.0004, 0.0012),
    ];
    const lashCurve = new THREE.CatmullRomCurve3(lashPts);
    const lashGeo = new THREE.TubeGeometry(
      lashCurve,
      16,
      isFemale ? 0.00095 : 0.00065,
      8,
      false
    );
    const lashMesh = new THREE.Mesh(lashGeo, lashMat);
    eyeSocketGrp.add(lashMesh);

    faceGroup.add(eyeSocketGrp);
  });

  // Sculpted Human Ears on Left & Right Sides of Head (using blemish-free limbSkinMaterial!)
  const earGeo = new THREE.SphereGeometry(0.019, 16, 16);
  earGeo.scale(0.28, 1.15, 0.55);
  const leftEar = new THREE.Mesh(earGeo, limbSkinMaterial);
  leftEar.position.set(isMale ? 0.071 : 0.068, 0.102, -0.005);
  leftEar.rotation.y = -0.22;
  leftEar.rotation.z = -0.1;

  const rightEar = new THREE.Mesh(earGeo, limbSkinMaterial);
  rightEar.position.set(isMale ? -0.071 : -0.068, 0.102, -0.005);
  rightEar.rotation.y = 0.22;
  rightEar.rotation.z = 0.1;
  faceGroup.add(leftEar, rightEar);

  return faceGroup;
}

/**
 * Builds a realistic 3D Human Hairstyle Group in Head Bone local space
 * combining a continuous sculpted hair canopy with non-twisting radial face-framing locks.
 */
export function buildHairstyleGroup(
  hairstyleId: HairstyleId,
  hairColorHex: string
): THREE.Group {
  const hairGroup = new THREE.Group();
  hairGroup.name = 'HumanHairGroup';

  if (hairstyleId === 'none') return hairGroup;

  const hairMat = createHairMaterial(hairColorHex);

  // 1. Sleek Cranial Scalp Cap hugging the upper skull (crown at y = 0.220m)
  const capGeo = new THREE.SphereGeometry(
    0.0755,
    36,
    28,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.64
  );
  capGeo.scale(0.99, 1.08, 1.16);
  const capMesh = new THREE.Mesh(capGeo, hairMat);
  capMesh.position.set(0, 0.142, -0.005);
  capMesh.rotation.x = -0.26;
  capMesh.castShadow = true;
  capMesh.receiveShadow = true;
  hairGroup.add(capMesh);

  const addSymmetricRibbons = (
    leftPts: THREE.Vector3[],
    width: number,
    thickness: number
  ) => {
    const leftGeo = createSleekHairRibbonGeometry(
      leftPts,
      width,
      thickness,
      26,
      10
    );
    const leftMesh = new THREE.Mesh(leftGeo, hairMat);
    leftMesh.castShadow = true;
    leftMesh.receiveShadow = true;
    hairGroup.add(leftMesh);

    const rightPts = leftPts.map((p) => new THREE.Vector3(-p.x, p.y, p.z));
    const rightGeo = createSleekHairRibbonGeometry(
      rightPts,
      width,
      thickness,
      26,
      10
    );
    const rightMesh = new THREE.Mesh(rightGeo, hairMat);
    rightMesh.castShadow = true;
    rightMesh.receiveShadow = true;
    hairGroup.add(rightMesh);
  };

  if (hairstyleId === 'long_wavy') {
    // Continuous wavy back & side hair canopy down to mid-back (-0.28m)
    const canopyGeo = buildContinuousHairCanopyGeometry(-0.28, true, 1.0);
    const canopyMesh = new THREE.Mesh(canopyGeo, hairMat);
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;
    hairGroup.add(canopyMesh);

    // Soft Face-Framing Curtain Bangs
    addSymmetricRibbons(
      [
        new THREE.Vector3(0.005, 0.218, 0.044),
        new THREE.Vector3(0.044, 0.19, 0.066),
        new THREE.Vector3(0.07, 0.135, 0.046),
        new THREE.Vector3(0.074, 0.068, 0.026),
        new THREE.Vector3(0.068, 0.012, 0.03),
      ],
      0.022,
      0.0055
    );

    // Front Clavicle-Draping Silky Wavy Locks
    addSymmetricRibbons(
      [
        new THREE.Vector3(0.016, 0.22, 0.018),
        new THREE.Vector3(0.068, 0.168, 0.024),
        new THREE.Vector3(0.08, 0.075, 0.02),
        new THREE.Vector3(0.092, -0.025, 0.048),
        new THREE.Vector3(0.086, -0.125, 0.074),
        new THREE.Vector3(0.088, -0.215, 0.064),
      ],
      0.028,
      0.0065
    );
  } else if (hairstyleId === 'long_straight') {
    const canopyGeo = buildContinuousHairCanopyGeometry(-0.31, false, 0.92);
    const canopyMesh = new THREE.Mesh(canopyGeo, hairMat);
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;
    hairGroup.add(canopyMesh);

    addSymmetricRibbons(
      [
        new THREE.Vector3(0.006, 0.218, 0.042),
        new THREE.Vector3(0.052, 0.184, 0.06),
        new THREE.Vector3(0.074, 0.105, 0.038),
        new THREE.Vector3(0.078, -0.015, 0.042),
        new THREE.Vector3(0.082, -0.145, 0.056),
        new THREE.Vector3(0.08, -0.255, 0.05),
      ],
      0.028,
      0.006
    );
  } else if (hairstyleId === 'shoulder_bob') {
    const canopyGeo = buildContinuousHairCanopyGeometry(-0.025, false, 0.45);
    const canopyMesh = new THREE.Mesh(canopyGeo, hairMat);
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;
    hairGroup.add(canopyMesh);

    addSymmetricRibbons(
      [
        new THREE.Vector3(0.006, 0.218, 0.044),
        new THREE.Vector3(0.05, 0.184, 0.064),
        new THREE.Vector3(0.074, 0.115, 0.042),
        new THREE.Vector3(0.072, 0.042, 0.032),
        new THREE.Vector3(0.054, -0.012, 0.025),
      ],
      0.026,
      0.006
    );
  } else if (hairstyleId === 'high_ponytail') {
    addSymmetricRibbons(
      [
        new THREE.Vector3(0.01, 0.216, 0.046),
        new THREE.Vector3(0.05, 0.182, 0.06),
        new THREE.Vector3(0.068, 0.122, 0.034),
        new THREE.Vector3(0.062, 0.065, 0.02),
      ],
      0.016,
      0.0045
    );

    const tieGeo = new THREE.TorusGeometry(0.022, 0.006, 12, 24);
    const tieMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.5,
    });
    const tieMesh = new THREE.Mesh(tieGeo, tieMat);
    tieMesh.position.set(0, 0.185, -0.082);
    tieMesh.rotation.x = 0.45;
    hairGroup.add(tieMesh);

    for (let i = -2; i <= 2; i++) {
      const spreadX = i * 0.013;
      const tailPts = [
        new THREE.Vector3(spreadX * 0.4, 0.185, -0.082),
        new THREE.Vector3(spreadX * 0.9, 0.205, -0.122),
        new THREE.Vector3(spreadX * 1.2, 0.145, -0.148),
        new THREE.Vector3(spreadX * 1.4, 0.038, -0.14),
        new THREE.Vector3(spreadX * 1.1, -0.075, -0.122),
        new THREE.Vector3(spreadX * 0.7, -0.155, -0.13),
      ];
      const tailGeo = createSleekHairRibbonGeometry(
        tailPts,
        0.026,
        0.008,
        24,
        10
      );
      const tailMesh = new THREE.Mesh(tailGeo, hairMat);
      tailMesh.castShadow = true;
      hairGroup.add(tailMesh);
    }
  } else if (hairstyleId === 'updo_bun') {
    addSymmetricRibbons(
      [
        new THREE.Vector3(0.008, 0.216, 0.046),
        new THREE.Vector3(0.048, 0.184, 0.062),
        new THREE.Vector3(0.068, 0.125, 0.036),
        new THREE.Vector3(0.064, 0.06, 0.024),
      ],
      0.015,
      0.004
    );

    const bunGeo = new THREE.SphereGeometry(0.042, 24, 20);
    bunGeo.scale(1.06, 0.86, 1.04);
    const bunMesh = new THREE.Mesh(bunGeo, hairMat);
    bunMesh.position.set(0, 0.222, -0.056);
    bunMesh.castShadow = true;
    hairGroup.add(bunMesh);

    const wrapTorusGeo = new THREE.TorusGeometry(0.032, 0.01, 14, 28);
    wrapTorusGeo.rotateX(Math.PI * 0.35);
    const wrapMesh = new THREE.Mesh(wrapTorusGeo, hairMat);
    wrapMesh.position.set(0, 0.212, -0.048);
    hairGroup.add(wrapMesh);
  } else if (hairstyleId === 'short_textured_crop') {
    const canopyGeo = buildContinuousHairCanopyGeometry(0.075, false, 0.15);
    const canopyMesh = new THREE.Mesh(canopyGeo, hairMat);
    canopyMesh.castShadow = true;
    hairGroup.add(canopyMesh);

    for (let i = -3; i <= 3; i++) {
      const xOff = i * 0.016;
      const zCurve = Math.cos(i * 0.35) * 0.014;
      const topLockPts = [
        new THREE.Vector3(xOff * 0.6, 0.222, -0.012),
        new THREE.Vector3(xOff * 0.9, 0.216, 0.038 + zCurve),
        new THREE.Vector3(
          xOff * 1.02 + (i % 2) * 0.004,
          0.184,
          0.066 + zCurve * 0.7
        ),
        new THREE.Vector3(xOff * 0.92, 0.158, 0.073 + zCurve * 0.4),
      ];
      const lockGeo = createSleekHairRibbonGeometry(
        topLockPts,
        0.021,
        0.006,
        14,
        10
      );
      const lockMesh = new THREE.Mesh(lockGeo, hairMat);
      lockMesh.castShadow = true;
      hairGroup.add(lockMesh);
    }

    addSymmetricRibbons(
      [
        new THREE.Vector3(0.064, 0.165, 0.022),
        new THREE.Vector3(0.07, 0.135, 0.014),
        new THREE.Vector3(0.068, 0.108, 0.01),
      ],
      0.011,
      0.004
    );
  } else if (hairstyleId === 'slicked_side_part') {
    const canopyGeo = buildContinuousHairCanopyGeometry(0.075, false, 0.15);
    const canopyMesh = new THREE.Mesh(canopyGeo, hairMat);
    canopyMesh.castShadow = true;
    hairGroup.add(canopyMesh);

    for (let i = 0; i < 6; i++) {
      const u = i / 5;
      const zStart = -0.042 + u * 0.082;
      const sweepPts = [
        new THREE.Vector3(-0.04, 0.205, zStart),
        new THREE.Vector3(-0.004, 0.228, zStart + 0.01),
        new THREE.Vector3(0.04, 0.216, zStart + 0.006),
        new THREE.Vector3(0.07, 0.176, zStart - 0.004),
      ];
      const sweepGeo = createSleekHairRibbonGeometry(
        sweepPts,
        0.024,
        0.0065,
        16,
        10
      );
      const sweepMesh = new THREE.Mesh(sweepGeo, hairMat);
      sweepMesh.castShadow = true;
      hairGroup.add(sweepMesh);
    }

    const leftSidePts = [
      new THREE.Vector3(-0.044, 0.202, 0.032),
      new THREE.Vector3(-0.068, 0.172, 0.022),
      new THREE.Vector3(-0.072, 0.135, 0.004),
    ];
    hairGroup.add(
      new THREE.Mesh(
        createSleekHairRibbonGeometry(leftSidePts, 0.02, 0.0055, 12, 8),
        hairMat
      )
    );
  }

  return hairGroup;
}
