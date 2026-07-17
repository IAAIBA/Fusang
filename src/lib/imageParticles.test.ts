import { describe, expect, it } from 'vitest';
import {
  advanceParticles,
  compositeColor,
  contrastRatio,
  materializeParticles,
  reconcileParticles,
  resolveParticleOptions,
  sampleParticleTargets,
  shouldIncludePixel,
  transformParticleColor,
  type RGB,
} from './imageParticles';

const solidPixels = (width: number, height: number, color: RGB, alpha = 255) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = alpha;
  }
  return pixels;
};

describe('image particle sampling', () => {
  it('scales particle density and size while honoring the count cap', () => {
    const pixels = solidPixels(80, 80, [72, 122, 92]);
    const sparse = sampleParticleTargets(
      pixels,
      80,
      80,
      400,
      400,
      resolveParticleOptions({ density: 0.5, maxParticles: 7000 }),
    );
    const dense = sampleParticleTargets(
      pixels,
      80,
      80,
      400,
      400,
      resolveParticleOptions({ density: 1.5, maxParticles: 7000 }),
    );
    const capped = sampleParticleTargets(
      pixels,
      80,
      80,
      400,
      400,
      resolveParticleOptions({ density: 3, maxParticles: 24 }),
    );
    const normalSize = sampleParticleTargets(
      pixels,
      80,
      80,
      400,
      400,
      resolveParticleOptions({ density: 1 }),
    );
    const doubledSize = sampleParticleTargets(
      pixels,
      80,
      80,
      400,
      400,
      resolveParticleOptions({ density: 1 }, { size: 2 }),
    );

    expect(dense.length).toBeGreaterThan(sparse.length);
    expect(capped.length).toBeLessThanOrEqual(24);
    expect(doubledSize[0].radius).toBeCloseTo(normalSize[0].radius * 2);
  });

  it('applies alpha, luminance, saturation and explicit color culling', () => {
    const alphaOptions = resolveParticleOptions({}, { color: { culling: { minAlpha: 128 } } });
    const luminanceOptions = resolveParticleOptions({}, { color: { culling: { luminance: { max: 0.3 } } } });
    const saturationOptions = resolveParticleOptions({}, { color: { culling: { saturation: { min: 0.5 } } } });
    const excludedOptions = resolveParticleOptions({}, {
      color: { culling: { excluded: [{ color: [30, 160, 80], tolerance: 8 }] } },
    });

    expect(shouldIncludePixel([30, 160, 80], 127, alphaOptions.appearance.color.culling)).toBe(false);
    expect(shouldIncludePixel([245, 245, 245], 255, luminanceOptions.appearance.color.culling)).toBe(false);
    expect(shouldIncludePixel([110, 110, 110], 255, saturationOptions.appearance.color.culling)).toBe(false);
    expect(shouldIncludePixel([34, 156, 84], 255, excludedOptions.appearance.color.culling)).toBe(false);
    expect(shouldIncludePixel([20, 100, 60], 255, excludedOptions.appearance.color.culling)).toBe(true);
  });
});

describe('image particle appearance', () => {
  it('keeps a light-theme particle above the requested composited contrast', () => {
    const options = resolveParticleOptions({}, {
      opacity: 1,
      color: {
        background: [244, 245, 239],
        minimumContrast: 2.5,
        saturation: 1,
        lightness: 0.82,
      },
    });
    const color = transformParticleColor([248, 248, 244], options.appearance.color, options.appearance.opacity);
    const visible = compositeColor(color, options.appearance.color.background, options.appearance.opacity);

    expect(contrastRatio(visible, options.appearance.color.background)).toBeGreaterThanOrEqual(2.5);
    expect(color[0]).toBeLessThan(248);
  });
});

describe('image particle transitions', () => {
  it('reuses existing particles and fades the count difference during a morph', () => {
    const initial = materializeParticles([
      { homeX: 10, homeY: 20, radius: 1, color: [30, 40, 50] },
      { homeX: 30, homeY: 40, radius: 1.2, color: [80, 90, 100] },
    ]);
    initial[0].x = 4;
    initial[0].y = 6;

    const expanded = reconcileParticles(initial, [
      { homeX: 80, homeY: 90, radius: 1.5, color: [20, 120, 70] },
      { homeX: 100, homeY: 110, radius: 1.3, color: [50, 100, 90] },
      { homeX: 120, homeY: 130, radius: 1, color: [90, 80, 70] },
    ], 200, 200, 'morph');

    expect(expanded[0]).toBe(initial[0]);
    expect(expanded[0].x).toBe(4);
    expect(expanded[0].homeX).toBe(80);
    expect(expanded[2].opacity).toBe(0);
    expect(expanded[2].targetOpacity).toBe(1);

    const reduced = reconcileParticles(expanded, [
      { homeX: 20, homeY: 30, radius: 1, color: [40, 50, 60] },
    ], 200, 200, 'morph');
    const beforeFade = reduced[1].opacity;
    const stepped = advanceParticles(reduced, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 200, resolveParticleOptions({}, {}, { enabled: false }));

    expect(reduced.slice(1).every((particle) => particle.exiting && particle.targetOpacity === 0)).toBe(true);
    expect(stepped.particles[1].opacity).toBeLessThan(beforeFade);
  });
});
