import * as THREE from 'three';

const TEXTURE_KEYS = [
  'map',
  'normalMap',
  'bumpMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'alphaMap',
  'aoMap',
] as const;

export function disposeObject3D(
  root: THREE.Object3D,
  shouldPreserveTexture?: (tex: THREE.Texture) => boolean
): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      geometries.add(mesh.geometry);
    }
    const rawMat = (mesh as { material?: THREE.Material | THREE.Material[] })
      .material;
    if (Array.isArray(rawMat)) {
      rawMat.forEach((m) => m && materials.add(m));
    } else if (rawMat) {
      materials.add(rawMat);
    }
    const skinned = obj as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh && skinned.skeleton) {
      skeletons.add(skinned.skeleton);
    }
  });

  materials.forEach((mat) => {
    const rec = mat as unknown as Record<string, unknown>;
    TEXTURE_KEYS.forEach((key) => {
      const val = rec[key];
      if (val && (val as THREE.Texture).isTexture) {
        textures.add(val as THREE.Texture);
      }
    });
    const origMap = (mat.userData as Record<string, unknown> | undefined)
      ?.origMap;
    if (origMap && (origMap as THREE.Texture).isTexture) {
      textures.add(origMap as THREE.Texture);
    }
  });

  textures.forEach((tex) => {
    if (shouldPreserveTexture?.(tex)) return;
    tex.dispose();
  });
  materials.forEach((mat) => mat.dispose());
  geometries.forEach((geo) => geo.dispose());
  skeletons.forEach((sk) => sk.dispose());
}
