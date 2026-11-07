export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 300;

export function clampHeightCm(heightCm: number): number {
  if (!Number.isFinite(heightCm)) return 168;
  return Math.min(MAX_HEIGHT_CM, Math.max(MIN_HEIGHT_CM, heightCm));
}

export function computeStatureScale(
  heightCm: number,
  nativeHeightM: number
): number {
  const safeNativeM =
    Number.isFinite(nativeHeightM) && nativeHeightM > 0.1
      ? nativeHeightM
      : 1.68;
  const targetHeightM = clampHeightCm(heightCm) / 100;
  return targetHeightM / safeNativeM;
}
