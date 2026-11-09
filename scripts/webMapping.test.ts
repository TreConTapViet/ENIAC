/**
 * Lớp chuyển đổi dữ liệu app (/app) ↔ web (APP/src/lib/webMapping.ts).
 * Đối chiếu trực tiếp với firestore.rules để app không ghi trường hay giá trị mà luật từ chối.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  fromWebProfile,
  fromWebWardrobeDoc,
  isValidImageRef,
  newWardrobeItemId,
  toAppCategory,
  toAppGender,
  toWebCategory,
  toWebGender,
  toWebOccasion,
  toWebProfileChanges,
  toWebWardrobeFields,
  type AppCategory,
  type AppOccasion,
} from '../APP/src/lib/webMapping';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

/** Lấy danh sách chuỗi trong khối `start … end` của firestore.rules */
function quotedIn(start: string, end: string): string[] {
  const from = rules.indexOf(start);
  assert.ok(from >= 0, `không thấy "${start}" trong firestore.rules`);
  const block = rules.slice(from, rules.indexOf(end, from));
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const profileFields = quotedIn('function profileFields()', '}');
const wardrobeFields = quotedIn('data.keys().hasOnly([', ']');
const ruleList = (field: string) => quotedIn(`data.${field} in [`, ']');

const appProfile = {
  name: 'Lan',
  gender: 'female' as const,
  height_cm: 160,
  weight_kg: 50,
  bust_cm: 84,
  waist_cm: 64,
  hip_cm: 90,
  avatar_url: '/assets/avatars/avatar_1.png',
};

test('giới tính: male/female ↔ Nam/Nữ, "Khác" không hợp lệ', () => {
  assert.equal(toWebGender('male'), 'Nam');
  assert.equal(toWebGender('female'), 'Nữ');
  assert.equal(toAppGender('Nam'), 'male');
  assert.equal(toAppGender('Nữ'), 'female');
  assert.equal(toAppGender('Khác'), null);
  assert.equal(toAppGender(undefined), null);
});

test('hồ sơ: chỉ ghi trường có trong profileFields() của firestore.rules', () => {
  const out = toWebProfileChanges(appProfile);
  for (const key of Object.keys(out)) {
    assert.ok(profileFields.includes(key), `trường "${key}" không có trong profileFields()`);
  }
  assert.deepEqual(out, {
    displayName: 'Lan',
    gender: 'Nữ',
    heightCm: 160,
    weightKg: 50,
    bustCm: 84,
    waistCm: 64,
    hipCm: 90,
    avatarUrl: '/assets/avatars/avatar_1.png',
  });
});

test('hồ sơ: không ghi uid, email, createdAt (luật update cấm đổi)', () => {
  const out = toWebProfileChanges(appProfile);
  for (const key of ['uid', 'email', 'createdAt']) assert.equal(key in out, false);
});

test('hồ sơ: số đo ngoài khoảng của luật bị bỏ, không ép số', () => {
  const out = toWebProfileChanges({ ...appProfile, height_cm: 60, weight_kg: 300, waist_cm: null, hip_cm: undefined });
  assert.equal('heightCm' in out, false);
  assert.equal('weightKg' in out, false);
  assert.equal('waistCm' in out, false);
  assert.equal('hipCm' in out, false);
  assert.equal(out.bustCm, 84);
});

test('hồ sơ: ảnh đại diện sai định dạng hoặc quá lớn thì không ghi', () => {
  assert.equal('avatarUrl' in toWebProfileChanges({ ...appProfile, avatar_url: 'http://x/a.png' }), false);
  assert.equal('avatarUrl' in toWebProfileChanges({ ...appProfile, avatar_url: 'data:image/gif;base64,AAA' }), false);
  const huge = 'data:image/jpeg;base64,' + 'A'.repeat(350001);
  assert.equal('avatarUrl' in toWebProfileChanges({ ...appProfile, avatar_url: huge }), false);
  assert.equal(isValidImageRef('https://lh3.googleusercontent.com/a.png'), true);
});

test('hồ sơ: tên trống thì không ghi displayName', () => {
  assert.equal('displayName' in toWebProfileChanges({ ...appProfile, name: '   ' }), false);
});

test('đọc hồ sơ web: thiếu số đo thì lấy hồ sơ trên máy, khác giới thì bỏ số đo 3 vòng cũ', () => {
  const p = fromWebProfile({ displayName: 'Minh', gender: 'Nam' }, appProfile);
  assert.ok(p);
  assert.equal(p.gender, 'male');
  assert.equal(p.height_cm, 160);
  assert.equal(p.bust_cm, null);
  assert.equal(fromWebProfile({ gender: 'Khác' }, appProfile), null);
});

test('tủ đồ: trường món mới khớp hasOnly của wardrobeItems (trừ createdAt/updatedAt)', () => {
  const fields = toWebWardrobeFields({
    uid: 'u1',
    label: 'Áo sơ mi trắng',
    category: 'top',
    color: 'Trắng',
    imageUrl: 'data:image/jpeg;base64,AAA',
    occasion: 'work',
    favoriteStyles: ['minimalist'],
  });
  const expected = wardrobeFields.filter((k) => k !== 'createdAt' && k !== 'updatedAt').sort();
  assert.deepEqual(Object.keys(fields).sort(), expected);
  assert.ok(ruleList('category').includes(fields.category));
  assert.ok(ruleList('season').includes(fields.season));
  assert.ok(ruleList('occasion').includes(fields.occasion));
  assert.ok(fields.styleTag.length >= 1 && fields.styleTag.length <= 60);
  assert.equal(fields.favorite, false);
});

test('tủ đồ: mọi loại và dịp của app đều ra giá trị luật chấp nhận', () => {
  const cats: AppCategory[] = ['top', 'bottom', 'dress', 'outerwear', 'other'];
  for (const c of cats) assert.ok(ruleList('category').includes(toWebCategory(c)), c);
  const occs: AppOccasion[] = ['work', 'casual', 'party', 'sports', 'lounging', 'beach'];
  for (const o of occs) assert.ok(ruleList('occasion').includes(toWebOccasion(o)), o);
  assert.ok(ruleList('occasion').includes(toWebOccasion(null)));
});

test('tủ đồ: loại của web đổi về loại của app', () => {
  assert.equal(toAppCategory('Chân váy'), 'bottom');
  assert.equal(toAppCategory('Quần & Chân váy'), 'bottom');
  assert.equal(toAppCategory('Giày dép'), 'other');
  assert.equal(toAppCategory('lạ'), 'other');
  const item = fromWebWardrobeDoc('item_1', { name: 'Đầm', category: 'Đầm & Váy liền', color: 'Đỏ', imageUrl: '/assets/x.png' });
  assert.equal(item.category, 'dress');
  assert.equal(item.label, 'Đầm');
});

test('tủ đồ: tên trống và màu trống có giá trị mặc định hợp lệ', () => {
  const f = toWebWardrobeFields({ uid: 'u', label: '  ', category: 'other', color: '', imageUrl: 'https://x/y.jpg' });
  assert.equal(f.name, 'Món đồ');
  assert.equal(f.color, 'Chưa rõ');
});

test('id món đồ: bắt đầu bằng item_ và hợp lệ theo isValidId', () => {
  const id = newWardrobeItemId(1700000000000, () => 0.5);
  assert.match(id, /^item_1700000000000_[a-z0-9]+$/);
  assert.match(id, /^[a-zA-Z0-9_-]{1,128}$/);
});
