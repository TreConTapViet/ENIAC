import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { composeFallbackOutfits, outfitKey, validateOutfitIds, type CandidateGarment } from '../shared/outfitEngine.ts';
import { getStylePreset } from '../shared/styles.ts';

// Danh mục nam đọc trực tiếp (không qua src/catalog/index.ts vì file đó kéo theo constants của giao diện)
const { MALE_GARMENTS } = await import('../src/catalog/garments.male.ts');
const { MALE_OUTFITS } = await import('../src/catalog/outfits.male.ts');

test('danh mục nam: id không trùng, ảnh tồn tại và nhẹ hơn 150 KB, có ghi nguồn, phong cách hợp lệ', () => {
  const ids = MALE_GARMENTS.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of MALE_GARMENTS) {
    const file = `public${g.imageUrl}`;
    assert.ok(existsSync(file), `thiếu ảnh ${file}`);
    assert.ok(statSync(file).size < 150_000, `${file} nặng hơn 150 KB`);
    assert.ok(g.credit.source && g.credit.license, `${g.id} thiếu nguồn ảnh`);
    assert.equal(g.gender, 'Nam');
    for (const s of g.styleIds) assert.ok(getStylePreset(s)?.genders.includes('Nam'), `${g.id}: phong cách ${s} không dành cho Nam`);
  }
});

test('bộ đồ nam: chỉ dùng món có trong danh mục, không bộ nào trùng món', () => {
  const known = new Set(MALE_GARMENTS.map((g) => g.id));
  const keys = new Set<string>();
  for (const o of MALE_OUTFITS) {
    for (const id of o.garmentIds) assert.ok(known.has(id), `${o.id} dùng món lạ ${id}`);
    const key = outfitKey(o.garmentIds);
    assert.ok(!keys.has(key), `${o.id} trùng món với bộ khác`);
    keys.add(key);
    assert.ok(getStylePreset(o.styleId)?.genders.includes('Nam'), `${o.id}: phong cách ${o.styleId}`);
  }
});

const pool: CandidateGarment[] = [
  { id: 't1', name: 'Áo phông trắng', category: 'Áo', color: 'Trắng', season: 'Nắng ấm' },
  { id: 't2', name: 'Sơ mi xanh', category: 'Áo', color: 'Xanh', season: 'Mọi thời tiết' },
  { id: 'b1', name: 'Jeans xanh', category: 'Quần', color: 'Xanh', season: 'Mọi thời tiết' },
  { id: 'b2', name: 'Chinos be', category: 'Quần', color: 'Be', season: 'Nắng ấm' },
  { id: 'o1', name: 'Blazer', category: 'Áo khoác', color: 'Trắng', season: 'Mát mẻ' },
  { id: 'd1', name: 'Đầm lụa', category: 'Đầm & Váy liền', color: 'Đỏ', season: 'Nắng ấm' },
];
const byId = new Map(pool.map((g) => [g.id, g]));

test('validateOutfitIds: bỏ id lạ và món trùng vị trí, bắt buộc áo + quần hoặc đầm', () => {
  assert.deepEqual(validateOutfitIds(['b1', 'x', 't1', 't2', 'o1'], byId), ['o1', 't1', 'b1']);
  assert.equal(validateOutfitIds(['t1', 't2'], byId), null);
  assert.deepEqual(validateOutfitIds(['d1', 't1'], byId), ['d1']);
  assert.equal(validateOutfitIds('t1', byId), null);
});

test('composeFallbackOutfits: không lặp bộ đã có, ưu tiên mỗi áo một lần, thêm áo khoác khi trời mát', () => {
  const warm = composeFallbackOutfits(pool, { count: 3, season: 'Nắng ấm', exclude: [outfitKey(['t1', 'b2'])] });
  const keys = warm.map((o) => outfitKey(o.garmentIds));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!keys.includes(outfitKey(['t1', 'b2'])));
  assert.equal(warm.length, 3);
  const cool = composeFallbackOutfits(pool, { count: 1, season: 'Mát mẻ' });
  assert.equal(cool[0].garmentIds[0], 'o1');
});

test('đồ ướm lên ma-nơ-canh: áo khoác không bó (slim), không dùng trench_coat, đồ nữ đủ thông số 3D', async () => {
  const { FEMALE_IMAGE_STUDIO, FEMALE_LOOK_STUDIO } = await import('../src/catalog/female.studio.ts');
  const outers = new Set(['tailored_blazer', 'bomber_jacket', 'biker_leather', 'trench_coat', 'gilet_vest', 'denim_jacket']);
  const specs = [
    ...MALE_GARMENTS.map((g) => ({ id: g.id, s: g.studio })),
    ...Object.entries(FEMALE_IMAGE_STUDIO).map(([id, s]) => ({ id, s })),
    ...Object.entries(FEMALE_LOOK_STUDIO).flatMap(([id, ps]) => ps.map((p) => ({ id, s: p.spec }))),
  ];
  for (const { id, s } of specs) {
    assert.ok(s, `${id} thiếu thông số 3D`);
    // Vạt dưới trench_coat là ống rời gắn ở hông, nhìn từ trước thành hai mảng lơ lửng
    assert.notEqual(s.styleId, 'trench_coat', `${id} dùng trench_coat`);
    // Áo khoác bó bằng áo trong thì áo trong xuyên qua (z-fighting)
    if (outers.has(s.styleId)) assert.notEqual(s.fit, 'slim', `${id}: áo khoác không được slim`);
  }
  for (const [id, ps] of Object.entries(FEMALE_LOOK_STUDIO)) {
    const cats = ps.map((p) => p.category);
    if (cats.includes('dress')) assert.deepEqual(cats, ['dress'], `${id}: đầm phải là món duy nhất`);
    else assert.ok(cats.includes('top') && cats.includes('bottom'), `${id}: thiếu áo hoặc quần/váy`);
  }
});
