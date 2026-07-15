export const PANORAMA_VIEWPORTS = 9.6;

export function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
export function normalizeLoopPosition(position: number, cycleWidth: number): number {
  if (!Number.isFinite(position) || !Number.isFinite(cycleWidth) || cycleWidth <= 0) {
    return 0;
  }

  return cycleWidth + positiveModulo(position - cycleWidth, cycleWidth);
}

export function progressToPosition(progress: number, cycleWidth: number): number {
  return cycleWidth + positiveModulo(progress, 1) * cycleWidth;
}
