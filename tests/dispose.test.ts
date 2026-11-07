import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { disposeObject3D } from '../src/three/dispose';

test('disposeObject3D giải phóng geometry, material và các texture không nằm trong danh sách giữ lại', () => {
  const root = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const ownedTex = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  const sharedTex = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    map: ownedTex,
    bumpMap: sharedTex,
  });
  const mesh = new THREE.Mesh(geo, mat);
  root.add(mesh);

  const disposed: string[] = [];
  geo.addEventListener('dispose', () => disposed.push('geo'));
  mat.addEventListener('dispose', () => disposed.push('mat'));
  ownedTex.addEventListener('dispose', () => disposed.push('ownedTex'));
  sharedTex.addEventListener('dispose', () => disposed.push('sharedTex'));

  disposeObject3D(root, (tex) => tex === sharedTex);

  assert.deepEqual(disposed.sort(), ['geo', 'mat', 'ownedTex']);
});
