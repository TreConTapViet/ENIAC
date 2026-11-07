import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FAVORITE_STYLES,
  STYLE_PRESETS,
  makeCustomStyle,
  matchesStyles,
  migrateLegacyStyles,
  resolveStyleId,
  styleLabel,
  styleTagBadge,
  stylesForGender,
} from '../shared/styles.ts';
import { normalizeVi } from '../shared/text.ts';

test('mỗi giới tính có 10–20 phong cách, id không trùng, mỗi phong cách có mô tả cho giới tính của nó', () => {
  const ids = STYLE_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of ['Nam', 'Nữ'] as const) {
    const list = stylesForGender(g);
    assert.ok(list.length >= 10 && list.length <= 20, `${g}: ${list.length}`);
    for (const p of list) assert.ok(p.byGender[g]?.subtitle, `${p.id} thiếu mô tả cho ${g}`);
  }
  assert.ok(STYLE_PRESETS.every((p) => p.label.length <= 60));
});

test('normalizeVi bỏ dấu, đ → d, gộp khoảng trắng', () => {
  assert.equal(normalizeVi('  Đà   Lạt '), 'da lat');
  assert.equal(normalizeVi('Tối giản (Minimalist)'), 'toi gian (minimalist)');
});

test('tên phong cách cũ trong hồ sơ được đổi sang id', () => {
  const legacy = ['Dark Coquette (Tiểu thư Cổ điển)', 'Tối giản (Minimalist)', 'Thanh lịch (Smart Casual)'];
  assert.deepEqual(migrateLegacyStyles(legacy, 'Nữ'), ['coquette_party', 'minimalist', 'smart_casual']);
});

test('chuyển cho Nam: bỏ phong cách chỉ dành cho Nữ, giữ phong cách dùng chung', () => {
  const legacy = ['Dark Coquette (Tiểu thư Cổ điển)', 'Đường phố (Streetwear)', 'Cá tính Y2K (Cyber Grunge)'];
  assert.deepEqual(migrateLegacyStyles(legacy, 'Nam'), ['streetwear']);
});

test('tên không nhận ra được giữ lại dạng custom:, bỏ trùng, giữ nguyên id mới', () => {
  assert.deepEqual(
    migrateLegacyStyles(['minimalist', 'Áo dài cách tân', 'Tối giản', 'custom:Áo dài cách tân'], 'Nữ'),
    ['minimalist', 'custom:Áo dài cách tân']
  );
});

test('"Preppy" của Nam không khớp nhầm bộ "Preppy Goth" của Nữ', () => {
  assert.equal(resolveStyleId('Preppy', 'Nam'), 'preppy_men');
  assert.equal(resolveStyleId('Preppy', 'Nữ'), 'preppy_korean');
  assert.equal(matchesStyles('Preppy Goth / Học đường (Korean Chic)', ['preppy_men'], 'Nam'), false);
  assert.equal(matchesStyles('Preppy Goth / Học đường (Korean Chic)', ['preppy_korean'], 'Nữ'), true);
});

test('matchesStyles: so theo id, không so chuỗi con; danh sách rỗng là không lọc', () => {
  assert.equal(matchesStyles('Tối giản (Minimalist)', ['minimalist']), true);
  assert.equal(matchesStyles('Tối giản (Minimalist)', ['streetwear']), false);
  assert.equal(matchesStyles('Ma-nơ-canh 3D', ['minimalist']), false);
  assert.equal(matchesStyles('Bất kỳ', []), true);
  assert.equal(matchesStyles('ao dai cach tan', ['custom:Áo dài cách tân']), true);
});

test('phong cách tự nhập: cắt 50 ký tự, rỗng thì null; nhãn hiển thị', () => {
  assert.equal(makeCustomStyle('   '), null);
  const long = makeCustomStyle('x'.repeat(80))!;
  assert.equal(long.length, 'custom:'.length + 50);
  assert.ok(long.length <= 60, 'vừa giới hạn 60 ký tự của firestore.rules');
  assert.equal(styleLabel('custom:Áo dài'), 'Áo dài');
  assert.equal(styleLabel('city_boy', 'short'), 'City Boy');
  assert.equal(styleTagBadge('Tối giản (Minimalist)'), 'Minimalist');
  assert.equal(MAX_FAVORITE_STYLES, 8);
});

test('tên phong cách tiếng Việt của bản AI Studio (52d16c7) cũng được nhận ra', () => {
  assert.deepEqual(migrateLegacyStyles(['Tối giản Tinh tế', 'Học đường Trẻ trung', 'Phóng khoáng Du lịch'], 'Nữ'), ['minimalist', 'preppy_korean', 'boho_resort']);
  assert.equal(resolveStyleId('Học đường', 'Nam'), 'preppy_men');
});
