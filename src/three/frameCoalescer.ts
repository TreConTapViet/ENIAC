export function createFrameCoalescer(
  requestFrame: (cb: () => void) => number = (cb) => requestAnimationFrame(cb),
  cancelFrame: (id: number) => void = (id) => cancelAnimationFrame(id)
) {
  let pendingId: number | null = null;
  let latestJob: (() => void) | null = null;

  return {
    schedule(job: () => void) {
      latestJob = job;
      if (pendingId !== null) return;
      pendingId = requestFrame(() => {
        pendingId = null;
        const fn = latestJob;
        latestJob = null;
        fn?.();
      });
    },
    cancel() {
      if (pendingId !== null) {
        cancelFrame(pendingId);
        pendingId = null;
      }
      latestJob = null;
    },
  };
}
