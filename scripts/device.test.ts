import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portraitDistanceScale, isLowPowerDevice, isPhone, renderPixelRatio, type DeviceEnv } from '../src/utils/device';

const desktop: DeviceEnv = {
  coarsePointer: false,
  shortSide: 1080,
  devicePixelRatio: 2,
  hardwareConcurrency: 10,
  reduceMotion: false,
};
const phone: DeviceEnv = { ...desktop, coarsePointer: true, shortSide: 390, devicePixelRatio: 3 };

test('điện thoại: cảm ứng và màn nhỏ', () => {
  assert.equal(isPhone(phone), true);
  assert.equal(isPhone(desktop), false);
  // Máy tính bảng lớn cảm ứng vẫn không phải điện thoại
  assert.equal(isPhone({ ...phone, shortSide: 1024 }), false);
});

test('máy yếu: điện thoại, RAM ít hoặc ít nhân', () => {
  assert.equal(isLowPowerDevice(phone), true);
  assert.equal(isLowPowerDevice(desktop), false);
  assert.equal(isLowPowerDevice({ ...desktop, deviceMemory: 4 }), true);
  assert.equal(isLowPowerDevice({ ...desktop, hardwareConcurrency: 4 }), true);
});

test('tỉ lệ điểm ảnh bị giới hạn trên điện thoại', () => {
  assert.equal(renderPixelRatio(phone), 1.5);
  assert.equal(renderPixelRatio(desktop), 2);
  assert.equal(renderPixelRatio({ ...desktop, devicePixelRatio: 1 }), 1);
});

test('màn dọc lùi camera, màn ngang giữ nguyên', () => {
  assert.equal(portraitDistanceScale(1.6), 1);
  const portrait = portraitDistanceScale(390 / 700);
  assert.ok(portrait > 1.8 && portrait < 2.6);
  assert.equal(portraitDistanceScale(0.1), 2.6);
});
