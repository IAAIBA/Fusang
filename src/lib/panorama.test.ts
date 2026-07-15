import { describe, expect, it } from 'vitest';
import { normalizeLoopPosition, positiveModulo, progressToPosition } from './panorama';

describe('panorama loop math', () => {
  it('keeps positions inside the semantic middle cycle', () => {
    expect(normalizeLoopPosition(1000, 1000)).toBe(1000);
    expect(normalizeLoopPosition(2050, 1000)).toBe(1050);
    expect(normalizeLoopPosition(950, 1000)).toBe(1950);
  });

  it('preserves the visual offset after many forward cycles', () => {
    expect(normalizeLoopPosition(12_375, 1000)).toBe(1375);
  });

  it('handles negative progress and invalid geometry', () => {
    expect(positiveModulo(-0.25, 1)).toBe(0.75);
    expect(progressToPosition(-0.25, 1000)).toBe(1750);
    expect(normalizeLoopPosition(10, 0)).toBe(0);
  });
});
