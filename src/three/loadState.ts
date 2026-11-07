export type ModelLoadState = 'loading' | 'ready' | 'error';

export interface LoadStateStore {
  getState: () => ModelLoadState;
  getError: () => unknown;
  set: (next: ModelLoadState, err?: unknown) => void;
  subscribe: (fn: (s: ModelLoadState) => void) => () => void;
}

export function createLoadState(
  initial: ModelLoadState = 'loading'
): LoadStateStore {
  let state: ModelLoadState = initial;
  let lastError: unknown = null;
  const listeners = new Set<(s: ModelLoadState) => void>();

  return {
    getState: () => state,
    getError: () => lastError,
    set: (next, err = null) => {
      if (state === next && lastError === err) return;
      state = next;
      lastError = err;
      listeners.forEach((fn) => fn(state));
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
