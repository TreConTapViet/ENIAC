import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_INVITE_DISMISSED_KEY,
  APP_INVITE_SNOOZE_MS,
  readAppInviteDismissedAt,
  shouldShowAppInvite,
  writeAppInviteDismissedAt,
} from '../src/utils/appInvite';

const NOW = 1_800_000_000_000;

test('lời mời tải app: chưa đóng bao giờ thì hiện', () => {
  assert.equal(shouldShowAppInvite(NOW, null, false), true);
});

test('lời mời tải app: vừa đóng thì ẩn, đủ 14 ngày thì hiện lại', () => {
  assert.equal(shouldShowAppInvite(NOW, NOW - 1000, false), false);
  assert.equal(shouldShowAppInvite(NOW, NOW - APP_INVITE_SNOOZE_MS, false), true);
});

test('lời mời tải app: đang chạy dạng app đã cài thì không hiện', () => {
  assert.equal(shouldShowAppInvite(NOW, null, true), false);
});

test('lời mời tải app: đọc/ghi localStorage, lỗi lưu trữ không làm vỡ trang', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  assert.equal(readAppInviteDismissedAt(storage), null);
  writeAppInviteDismissedAt(storage, NOW);
  assert.equal(store.get(APP_INVITE_DISMISSED_KEY), String(NOW));
  assert.equal(readAppInviteDismissedAt(storage), NOW);

  const broken = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(readAppInviteDismissedAt(broken), null);
  assert.doesNotThrow(() => writeAppInviteDismissedAt(broken, NOW));
  assert.equal(readAppInviteDismissedAt(undefined), null);
});
