import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// localStorage tối giản cho Node
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};

const {
  consumePendingGuestMerge,
  loadLocalOutfits,
  loadLocalProfile,
  loadLocalWardrobe,
  markPendingGuestMerge,
  saveLocalOutfits,
  saveLocalProfile,
  saveLocalWardrobe,
} = await import('../src/services/localStore.ts');
const { toMillis } = await import('../src/utils/time.ts');

const item = (id: string, userId: string) => ({
  id,
  userId,
  name: `Món ${id}`,
  category: 'Áo' as const,
  styleTag: 'Minimalist',
  color: 'Đen',
  season: 'Mọi thời tiết' as const,
  occasion: 'Dạo phố / Cafe' as const,
  imageUrl: '/assets/x.png',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const outfit = (id: string, userId: string) => ({
  id,
  userId,
  title: `Bộ ${id}`,
  occasion: 'Dạo phố / Cafe',
  weatherNote: 'Nắng',
  items: ['Áo', 'Quần'],
  auraAdvice: 'Hợp',
  createdAt: '2026-01-02T00:00:00.000Z',
});

const profile = (uid: string, email: string) => ({
  uid,
  displayName: 'Khách',
  email,
  gender: 'Nam' as const,
  favoriteStyles: ['Minimalist'],
  accentColor: 'amber' as const,
  themeMode: 'dark' as const,
  onboardingCompleted: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

beforeEach(() => store.clear());

test('gộp dữ liệu khách: chuyển đồ tự thêm + bộ đã lưu, bỏ đồ mẫu, xoá dữ liệu khách', () => {
  saveLocalWardrobe('guest', [item('item_1', 'guest'), item('starter_guest_0', 'guest')]);
  saveLocalOutfits('guest', [outfit('outfit_1', 'guest')]);
  saveLocalProfile('guest', profile('guest', ''));
  saveLocalWardrobe('acc', [item('item_9', 'acc')]);

  markPendingGuestMerge('guest');
  assert.equal(consumePendingGuestMerge('acc'), true);

  const wardrobe = loadLocalWardrobe('acc');
  assert.deepEqual(wardrobe.map((i) => i.id), ['item_1', 'item_9']);
  assert.ok(wardrobe.every((i) => i.userId === 'acc'));
  assert.deepEqual(loadLocalOutfits('acc').map((o) => [o.id, o.userId]), [['outfit_1', 'acc']]);
  assert.equal(loadLocalProfile('acc')?.uid, 'acc');

  assert.deepEqual(loadLocalWardrobe('guest'), []);
  assert.equal(loadLocalProfile('guest'), null);
  assert.equal(consumePendingGuestMerge('acc'), false, 'dấu gộp chỉ dùng một lần');
});

test('gộp dữ liệu khách: không ghi đè hồ sơ và món trùng id của tài khoản đích', () => {
  saveLocalWardrobe('guest', [item('item_1', 'guest')]);
  saveLocalProfile('guest', profile('guest', ''));
  saveLocalWardrobe('acc', [{ ...item('item_1', 'acc'), name: 'Bản của tài khoản' }]);
  saveLocalProfile('acc', profile('acc', 'a@b.com'));

  markPendingGuestMerge('guest');
  consumePendingGuestMerge('acc');

  assert.equal(loadLocalWardrobe('acc').length, 1);
  assert.equal(loadLocalWardrobe('acc')[0].name, 'Bản của tài khoản');
  assert.equal(loadLocalProfile('acc')?.email, 'a@b.com');
});

test('dấu gộp trùng uid hiện tại (đăng nhập thất bại, vẫn là khách) thì chỉ bị xoá', () => {
  saveLocalWardrobe('guest', [item('item_1', 'guest')]);
  markPendingGuestMerge('guest');
  assert.equal(consumePendingGuestMerge('guest'), false);
  assert.equal(loadLocalWardrobe('guest').length, 1);
  assert.equal(store.has('sw_pending_guest_merge'), false);
});

test('toMillis đọc được chuỗi ISO, Timestamp và Timestamp đã qua JSON', () => {
  assert.equal(toMillis('2026-01-01T00:00:00.000Z'), Date.UTC(2026, 0, 1));
  assert.equal(toMillis({ toMillis: () => 42 }), 42);
  assert.equal(toMillis({ seconds: 10, nanoseconds: 0 }), 10000);
  assert.equal(toMillis(null), 0);
  assert.equal(toMillis('không phải ngày'), 0);
});
