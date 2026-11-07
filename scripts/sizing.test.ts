import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRecommendedSize, DEFAULT_MEASUREMENTS } from '../shared/sizing.ts';
import { isForGender, normalizeGender } from '../shared/gender.ts';

// Thuật toán nữ trước khi tách (constants.ts cũ), để chắc bảng nữ không đổi kết quả
function legacyFemale(bust: number, weight: number, waist: number, hip: number) {
  let top = 'XL';
  if (bust <= 80 && weight <= 45) top = 'XS';
  else if (bust <= 86 && weight <= 52) top = 'S';
  else if (bust <= 91 && weight <= 59) top = 'M';
  else if (bust <= 97 && weight <= 68) top = 'L';
  let bottom = 'XL';
  let jeans = '31+';
  if (waist <= 61 && hip <= 86) [bottom, jeans] = ['XS', '25'];
  else if (waist <= 66 && hip <= 91) [bottom, jeans] = ['S', '26'];
  else if (waist <= 71 && hip <= 96) [bottom, jeans] = ['M', '27 - 28'];
  else if (waist <= 77 && hip <= 102) [bottom, jeans] = ['L', '29 - 30'];
  return { top, bottom, jeans };
}

test('bảng nữ cho kết quả y như trước khi tách', () => {
  for (const bust of [76, 82, 88, 95, 104])
    for (const weight of [42, 50, 57, 64, 75])
      for (const [waist, hip] of [[58, 84], [64, 90], [69, 95], [75, 100], [82, 108], [60, 99]]) {
        const r = calculateRecommendedSize({ gender: 'Nữ', heightCm: 160, weightKg: weight, bustCm: bust, waistCm: waist, hipCm: hip });
        const old = legacyFemale(bust, weight, waist, hip);
        assert.deepEqual([r.topSize, r.bottomSize, r.jeansSize], [old.top, old.bottom, old.jeans], `${bust}/${weight}/${waist}/${hip}`);
      }
});

test('nam dùng bảng nam: S–XXL, jeans theo inch vòng eo', () => {
  const avg = calculateRecommendedSize({ gender: 'Nam' });
  assert.equal(avg.gender, 'Nam');
  assert.equal(avg.heightCm, DEFAULT_MEASUREMENTS.Nam.heightCm);
  assert.equal(avg.topSize, 'M'); // ngực 94, 65kg
  assert.equal(avg.bottomSize, 'M'); // eo 76
  assert.equal(avg.jeansSize, '30'); // 76cm ≈ 29.9in
  assert.match(avg.fitAdvice, /quần jeans cỡ 30/);
  assert.doesNotMatch(avg.fitAdvice, /Váy|Đầm|3 vòng/);

  const big = calculateRecommendedSize({ gender: 'Nam', bustCm: 110, weightKg: 90, waistCm: 95, hipCm: 108 });
  assert.equal(big.topSize, 'XXL');
  assert.equal(big.bottomSize, 'XXL');
  assert.equal(big.jeansSize, '36+');

  const slim = calculateRecommendedSize({ gender: 'Nam', bustCm: 84, weightKg: 54, waistCm: 68, hipCm: 86 });
  assert.equal(slim.topSize, 'S');
  assert.equal(slim.jeansSize, '28');
});

test('size áo nam lấy size lớn hơn giữa vòng ngực và cân nặng', () => {
  const r = calculateRecommendedSize({ gender: 'Nam', bustCm: 86, weightKg: 80 });
  assert.equal(r.topSize, 'XL');
  assert.equal(r.overallSize, 'XL (Áo) / M (Quần)');
});

test('hồ sơ cũ "Khác" tạm tính theo bảng nữ; normalizeGender trả null để hỏi lại', () => {
  assert.equal(calculateRecommendedSize({ gender: 'Khác' }).gender, 'Nữ');
  assert.equal(normalizeGender('Khác'), null);
  assert.equal(normalizeGender('Nam'), 'Nam');
  assert.equal(normalizeGender(undefined), null);
});

test('isForGender: Unisex hợp với cả hai, đồ nữ không hiện cho nam', () => {
  assert.equal(isForGender('Unisex', 'Nam'), true);
  assert.equal(isForGender('Nữ', 'Nam'), false);
  assert.equal(isForGender('Nam', 'Nam'), true);
  assert.equal(isForGender(undefined, 'Nữ'), true);
});
