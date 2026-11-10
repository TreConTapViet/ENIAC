/**
 * Số đo tuỳ chọn của hồ sơ (shared/measurements.ts): dài chân trong, dài lưng.
 * Đối chiếu khoảng giá trị với firestore.rules và firebase-blueprint.json để ba nơi không lệch nhau.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  OPTIONAL_MEASURES,
  describeOptionalMeasures,
  formatOptionalMeasure,
  hasOptionalMeasureKeys,
  isValidOptionalMeasure,
  parseOptionalMeasure,
  pickOptionalMeasures,
  stripOptionalMeasures,
} from '../shared/measurements';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const blueprint = JSON.parse(readFileSync(new URL('../firebase-blueprint.json', import.meta.url), 'utf8'));

test('khoảng giá trị khớp firestore.rules và có trong profileFields()', () => {
  const fieldsBlock = rules.slice(rules.indexOf('function profileFields()'), rules.indexOf(']', rules.indexOf('function profileFields()')));
  for (const m of OPTIONAL_MEASURES) {
    assert.ok(fieldsBlock.includes(`'${m.key}'`), `${m.key} chưa có trong profileFields()`);
    assert.ok(
      rules.includes(`optionalNumberIn(data, '${m.key}', ${m.min}, ${m.max})`),
      `firestore.rules thiếu optionalNumberIn cho ${m.key} (${m.min}–${m.max})`
    );
  }
});

test('khoảng giá trị khớp firebase-blueprint.json', () => {
  const props = Object.values(blueprint.entities as Record<string, { properties?: Record<string, { minimum?: number; maximum?: number }> }>)
    .map((e) => e.properties ?? {})
    .find((p) => 'heightCm' in p)!;
  for (const m of OPTIONAL_MEASURES) {
    assert.ok(props[m.key], `blueprint thiếu ${m.key}`);
    assert.equal(props[m.key].minimum, m.min);
    assert.equal(props[m.key].maximum, m.max);
  }
});

test('ô nhập: trống là null, số hợp lệ làm tròn 0,5 cm, nhận dấu phẩy', () => {
  assert.deepEqual(parseOptionalMeasure('inseamCm', '  '), { ok: true, value: null });
  assert.deepEqual(parseOptionalMeasure('inseamCm', '76.3'), { ok: true, value: 76.5 });
  assert.deepEqual(parseOptionalMeasure('backLengthCm', '40,2'), { ok: true, value: 40 });
});

test('ô nhập: sai khoảng hoặc không phải số thì báo lỗi, không tự ép số', () => {
  const low = parseOptionalMeasure('inseamCm', '20');
  assert.equal(low.ok, false);
  assert.match(!low.ok ? low.error : '', /35 đến 120 cm/);
  assert.equal(parseOptionalMeasure('backLengthCm', '61').ok, false);
  assert.equal(parseOptionalMeasure('backLengthCm', 'abc').ok, false);
});

test('chọn số đo hợp lệ: bỏ null và giá trị sai khoảng', () => {
  assert.deepEqual(pickOptionalMeasures({ inseamCm: 78, backLengthCm: null }), { inseamCm: 78 });
  assert.deepEqual(pickOptionalMeasures({ inseamCm: 500 }), {});
  assert.deepEqual(pickOptionalMeasures(null), {});
  assert.equal(isValidOptionalMeasure('backLengthCm', 30), true);
  assert.equal(isValidOptionalMeasure('backLengthCm', Number.NaN), false);
});

test('bỏ số đo khi Firestore còn luật cũ: giữ nguyên trường khác', () => {
  const data = { displayName: 'Lan', inseamCm: 78, backLengthCm: 40 };
  assert.equal(hasOptionalMeasureKeys(data), true);
  const stripped = stripOptionalMeasures(data);
  assert.deepEqual(stripped, { displayName: 'Lan' });
  assert.equal(hasOptionalMeasureKeys(stripped), false);
  assert.equal('inseamCm' in data, true, 'không được sửa tài liệu gốc');
});

test('mô tả cho Aura và hiển thị lại trong ô nhập', () => {
  assert.equal(describeOptionalMeasures({ inseamCm: 76, backLengthCm: 40 }), 'Dài chân trong 76 cm · Dài lưng 40 cm');
  assert.equal(describeOptionalMeasures({ backLengthCm: 40 }), 'Dài lưng 40 cm');
  assert.equal(describeOptionalMeasures({}), '');
  assert.equal(formatOptionalMeasure(76.5), '76.5');
  assert.equal(formatOptionalMeasure(null), '');
  assert.equal(formatOptionalMeasure(undefined), '');
});
