import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadState } from '../src/three/loadState';

test('createLoadState phát thông báo khi chuyển trạng thái loading -> ready / error', () => {
  const store = createLoadState('loading');
  const seen: string[] = [];
  const unsub = store.subscribe((s) => seen.push(s));

  assert.equal(store.getState(), 'loading');
  store.set('ready');
  store.set('error', new Error('404'));
  assert.equal((store.getError() as Error).message, '404');
  unsub();
  store.set('ready');

  assert.deepEqual(seen, ['ready', 'error']);
  assert.equal(store.getError(), null);
});
