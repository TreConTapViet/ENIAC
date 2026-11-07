import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameCoalescer } from '../src/three/frameCoalescer';

test('createFrameCoalescer gộp nhiều lời gọi trong cùng 1 frame thành 1 lần chạy duy nhất với tham số mới nhất', () => {
  let pendingCb: (() => void) | null = null;
  const coalescer = createFrameCoalescer(
    (cb) => {
      pendingCb = cb;
      return 1;
    },
    () => {
      pendingCb = null;
    }
  );

  const calls: number[] = [];
  coalescer.schedule(() => calls.push(1));
  coalescer.schedule(() => calls.push(2));
  coalescer.schedule(() => calls.push(3));

  assert.equal(calls.length, 0);
  pendingCb!();
  assert.deepEqual(calls, [3]);
});
