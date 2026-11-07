import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStatureScale, clampHeightCm } from '../src/three/bodyScale';

test('clampHeightCm giữ chiều cao trong khoảng [100, 300]', () => {
  assert.equal(clampHeightCm(80), 100);
  assert.equal(clampHeightCm(350), 300);
  assert.equal(clampHeightCm(170), 170);
});

test('computeStatureScale ánh xạ tuyến tính chiều cao thực sang tỉ lệ so với nativeHeightM của GLB', () => {
  assert.ok(Math.abs(computeStatureScale(168, 1.68) - 1.0) < 1e-6);
  const s150 = computeStatureScale(150, 1.68);
  assert.ok(Math.abs(s150 * 1.68 - 1.50) < 1e-6);
  const s190 = computeStatureScale(190, 1.78);
  assert.ok(Math.abs(s190 * 1.78 - 1.90) < 1e-6);
});
