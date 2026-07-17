export type RGB = readonly [number, number, number];

export interface ParticleColorCulling {
  minAlpha?: number;
  luminance?: { min?: number; max?: number };
  saturation?: { min?: number; max?: number };
  excluded?: ReadonlyArray<{ color: RGB; tolerance: number }>;
}

export interface ParticleColorOptions {
  quantization?: number;
  culling?: ParticleColorCulling;
  background?: RGB;
  minimumContrast?: number;
  saturation?: number;
  lightness?: number;
}

export interface ParticleSamplingOptions {
  density?: number;
  maxParticles?: number;
}

export interface ParticleAppearanceOptions {
  size?: number;
  opacity?: number;
  color?: ParticleColorOptions;
}

export interface ParticleInteractionOptions {
  enabled?: boolean;
  radiusRatio?: number;
  minRadius?: number;
  force?: number;
  spring?: number;
  damping?: number;
}

export interface ParticleTransitionOptions {
  mode?: 'morph' | 'replace';
}

export interface ResolvedParticleOptions {
  sampling: Required<ParticleSamplingOptions>;
  appearance: {
    size: number;
    opacity: number;
    color: {
      quantization: number;
      culling: Required<Pick<ParticleColorCulling, 'minAlpha'>> & Omit<ParticleColorCulling, 'minAlpha'>;
      background: RGB;
      minimumContrast: number;
      saturation: number;
      lightness: number;
    };
  };
  interaction: Required<ParticleInteractionOptions>;
  transition: Required<ParticleTransitionOptions>;
}

export interface ParticleTarget {
  homeX: number;
  homeY: number;
  radius: number;
  color: RGB;
}

export interface Particle extends ParticleTarget {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetRadius: number;
  targetColor: RGB;
  opacity: number;
  targetOpacity: number;
  exiting: boolean;
}

export const DEFAULT_PARTICLE_OPTIONS: ResolvedParticleOptions = {
  sampling: {
    density: 1,
    maxParticles: 7000,
  },
  appearance: {
    size: 1,
    opacity: 0.94,
    color: {
      quantization: 24,
      culling: { minAlpha: 18 },
      background: [0, 0, 0],
      minimumContrast: 1,
      saturation: 1,
      lightness: 1,
    },
  },
  interaction: {
    enabled: true,
    radiusRatio: 0.13,
    minRadius: 48,
    force: 1.35,
    spring: 0.032,
    damping: 0.88,
  },
  transition: {
    mode: 'morph',
  },
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const roundChannel = (value: number) => Math.round(clamp(value, 0, 255));
const rgbDistanceSquared = (left: RGB, right: RGB) => (
  (left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2 + (left[2] - right[2]) ** 2
);

export const resolveParticleOptions = (
  sampling: ParticleSamplingOptions = {},
  appearance: ParticleAppearanceOptions = {},
  interaction: ParticleInteractionOptions = {},
  transition: ParticleTransitionOptions = {},
): ResolvedParticleOptions => {
  const color = appearance.color ?? {};
  const culling = color.culling ?? {};

  return {
    sampling: {
      density: clamp(sampling.density ?? DEFAULT_PARTICLE_OPTIONS.sampling.density, 0.25, 3),
      maxParticles: Math.max(1, Math.floor(sampling.maxParticles ?? DEFAULT_PARTICLE_OPTIONS.sampling.maxParticles)),
    },
    appearance: {
      size: clamp(appearance.size ?? DEFAULT_PARTICLE_OPTIONS.appearance.size, 0.2, 4),
      opacity: clamp(appearance.opacity ?? DEFAULT_PARTICLE_OPTIONS.appearance.opacity, 0.05, 1),
      color: {
        quantization: Math.max(1, Math.floor(color.quantization ?? DEFAULT_PARTICLE_OPTIONS.appearance.color.quantization)),
        culling: {
          minAlpha: clamp(culling.minAlpha ?? DEFAULT_PARTICLE_OPTIONS.appearance.color.culling.minAlpha, 0, 255),
          luminance: culling.luminance,
          saturation: culling.saturation,
          excluded: culling.excluded,
        },
        background: color.background ?? DEFAULT_PARTICLE_OPTIONS.appearance.color.background,
        minimumContrast: Math.max(1, color.minimumContrast ?? DEFAULT_PARTICLE_OPTIONS.appearance.color.minimumContrast),
        saturation: Math.max(0, color.saturation ?? DEFAULT_PARTICLE_OPTIONS.appearance.color.saturation),
        lightness: Math.max(0, color.lightness ?? DEFAULT_PARTICLE_OPTIONS.appearance.color.lightness),
      },
    },
    interaction: {
      enabled: interaction.enabled ?? DEFAULT_PARTICLE_OPTIONS.interaction.enabled,
      radiusRatio: Math.max(0, interaction.radiusRatio ?? DEFAULT_PARTICLE_OPTIONS.interaction.radiusRatio),
      minRadius: Math.max(0, interaction.minRadius ?? DEFAULT_PARTICLE_OPTIONS.interaction.minRadius),
      force: Math.max(0, interaction.force ?? DEFAULT_PARTICLE_OPTIONS.interaction.force),
      spring: Math.max(0, interaction.spring ?? DEFAULT_PARTICLE_OPTIONS.interaction.spring),
      damping: clamp(interaction.damping ?? DEFAULT_PARTICLE_OPTIONS.interaction.damping, 0, 1),
    },
    transition: {
      mode: transition.mode ?? DEFAULT_PARTICLE_OPTIONS.transition.mode,
    },
  };
};

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const rgbToHsl = ([red, green, blue]: RGB): Hsl => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: lightness };

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  return { h: hue / 6, s: saturation, l: lightness };
};

const hueToChannel = (p: number, q: number, hue: number) => {
  let nextHue = hue;
  if (nextHue < 0) nextHue += 1;
  if (nextHue > 1) nextHue -= 1;
  if (nextHue < 1 / 6) return p + (q - p) * 6 * nextHue;
  if (nextHue < 1 / 2) return q;
  if (nextHue < 2 / 3) return p + (q - p) * (2 / 3 - nextHue) * 6;
  return p;
};

const hslToRgb = ({ h, s, l }: Hsl): RGB => {
  if (s === 0) {
    const channel = roundChannel(l * 255);
    return [channel, channel, channel];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    roundChannel(hueToChannel(p, q, h + 1 / 3) * 255),
    roundChannel(hueToChannel(p, q, h) * 255),
    roundChannel(hueToChannel(p, q, h - 1 / 3) * 255),
  ];
};

export const relativeLuminance = ([red, green, blue]: RGB) => {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return linearize(red) * 0.2126 + linearize(green) * 0.7152 + linearize(blue) * 0.0722;
};

export const contrastRatio = (left: RGB, right: RGB) => {
  const [lighter, darker] = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

export const compositeColor = (foreground: RGB, background: RGB, opacity: number): RGB => [
  roundChannel(foreground[0] * opacity + background[0] * (1 - opacity)),
  roundChannel(foreground[1] * opacity + background[1] * (1 - opacity)),
  roundChannel(foreground[2] * opacity + background[2] * (1 - opacity)),
];

const quantizeColor = (color: RGB, step: number): RGB => [
  Math.min(255, Math.round(color[0] / step) * step),
  Math.min(255, Math.round(color[1] / step) * step),
  Math.min(255, Math.round(color[2] / step) * step),
];

export const shouldIncludePixel = (color: RGB, alpha: number, culling: ResolvedParticleOptions['appearance']['color']['culling']) => {
  if (alpha < culling.minAlpha) return false;
  const luminance = relativeLuminance(color);
  if (culling.luminance?.min !== undefined && luminance < culling.luminance.min) return false;
  if (culling.luminance?.max !== undefined && luminance > culling.luminance.max) return false;

  const saturation = rgbToHsl(color).s;
  if (culling.saturation?.min !== undefined && saturation < culling.saturation.min) return false;
  if (culling.saturation?.max !== undefined && saturation > culling.saturation.max) return false;

  return !culling.excluded?.some(({ color: excludedColor, tolerance }) => (
    rgbDistanceSquared(color, excludedColor) <= tolerance ** 2
  ));
};

export const transformParticleColor = (
  source: RGB,
  colorOptions: ResolvedParticleOptions['appearance']['color'],
  opacity: number,
): RGB => {
  const hsl = rgbToHsl(source);
  const adjusted: Hsl = {
    h: hsl.h,
    s: clamp(hsl.s * colorOptions.saturation),
    l: clamp(hsl.l * colorOptions.lightness),
  };
  const colorAt = (lightness: number) => quantizeColor(hslToRgb({ ...adjusted, l: lightness }), colorOptions.quantization);
  const current = colorAt(adjusted.l);
  const reachesContrast = (candidate: RGB) => (
    contrastRatio(compositeColor(candidate, colorOptions.background, opacity), colorOptions.background)
    >= colorOptions.minimumContrast
  );

  if (reachesContrast(current)) return current;

  const darken = relativeLuminance(colorOptions.background) >= 0.5;
  let low = darken ? 0 : adjusted.l;
  let high = darken ? adjusted.l : 1;
  let best = colorAt(darken ? 0 : 1);

  for (let iteration = 0; iteration < 14; iteration += 1) {
    const midpoint = (low + high) / 2;
    const candidate = colorAt(midpoint);
    if (reachesContrast(candidate)) {
      best = candidate;
      if (darken) low = midpoint;
      else high = midpoint;
    } else if (darken) {
      high = midpoint;
    } else {
      low = midpoint;
    }
  }

  return best;
};

export const calculateFitRect = (
  sourceWidth: number,
  sourceHeight: number,
  destinationWidth: number,
  destinationHeight: number,
  fit: 'cover' | 'contain',
) => {
  const scale = fit === 'cover'
    ? Math.max(destinationWidth / sourceWidth, destinationHeight / sourceHeight)
    : Math.min(destinationWidth / sourceWidth, destinationHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (destinationWidth - width) / 2,
    y: (destinationHeight - height) / 2,
    width,
    height,
  };
};

export const sampleParticleTargets = (
  pixels: Uint8ClampedArray,
  sampleWidth: number,
  sampleHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  options: ResolvedParticleOptions,
): ParticleTarget[] => {
  const baseGap = canvasWidth < 330 ? 4 : 3;
  const gap = baseGap / options.sampling.density;
  const padding = canvasWidth * 0.035;
  const drawableWidth = canvasWidth - padding * 2;
  const drawableHeight = canvasHeight - padding * 2;
  const edgeFade = Math.max(1, Math.min(sampleWidth, sampleHeight) * (15 / 210));
  const targets: ParticleTarget[] = [];

  for (let y = 0; y < sampleHeight; y += gap) {
    for (let x = 0; x < sampleWidth; x += gap) {
      const sampleX = Math.min(sampleWidth - 1, Math.floor(x));
      const sampleY = Math.min(sampleHeight - 1, Math.floor(y));
      const pixelIndex = (sampleY * sampleWidth + sampleX) * 4;
      const color: RGB = [pixels[pixelIndex], pixels[pixelIndex + 1], pixels[pixelIndex + 2]];
      const alpha = pixels[pixelIndex + 3];
      if (!shouldIncludePixel(color, alpha, options.appearance.color.culling)) continue;

      const edgeDistance = Math.min(sampleX, sampleY, sampleWidth - sampleX - 1, sampleHeight - sampleY - 1);
      const edgeOpacity = Math.min(1, edgeDistance / edgeFade);
      const noise = ((sampleX * 17 + sampleY * 29) % 100) / 100;
      if (noise > edgeOpacity) continue;

      const baseRadius = canvasWidth < 330 ? 0.82 : 1.05 + ((sampleX + sampleY) % 3) * 0.12;
      targets.push({
        homeX: padding + (sampleX / sampleWidth) * drawableWidth,
        homeY: padding + (sampleY / sampleHeight) * drawableHeight,
        radius: baseRadius * options.appearance.size,
        color: transformParticleColor(color, options.appearance.color, options.appearance.opacity),
      });
    }
  }

  if (targets.length <= options.sampling.maxParticles) return targets;
  const stride = Math.ceil(targets.length / options.sampling.maxParticles);
  return targets.filter((_, index) => index % stride === 0).slice(0, options.sampling.maxParticles);
};

export const materializeParticles = (targets: ReadonlyArray<ParticleTarget>): Particle[] => targets.map((target) => ({
  ...target,
  x: target.homeX,
  y: target.homeY,
  vx: 0,
  vy: 0,
  targetRadius: target.radius,
  targetColor: target.color,
  opacity: 1,
  targetOpacity: 1,
  exiting: false,
}));

export const reconcileParticles = (
  current: Particle[],
  targets: ReadonlyArray<ParticleTarget>,
  canvasWidth: number,
  canvasHeight: number,
  mode: ResolvedParticleOptions['transition']['mode'],
): Particle[] => {
  if (mode === 'replace' || current.length === 0) return materializeParticles(targets);

  const next = current.slice();
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const particle = next[index];
    if (particle) {
      particle.homeX = target.homeX;
      particle.homeY = target.homeY;
      particle.targetRadius = target.radius;
      particle.targetColor = target.color;
      particle.targetOpacity = 1;
      particle.exiting = false;
      continue;
    }

    const seed = index + 1;
    const originX = ((seed * 73) % 997) / 997 * canvasWidth;
    const originY = ((seed * 151) % 991) / 991 * canvasHeight;
    next.push({
      ...target,
      x: originX,
      y: originY,
      vx: 0,
      vy: 0,
      radius: target.radius,
      targetRadius: target.radius,
      color: target.color,
      targetColor: target.color,
      opacity: 0,
      targetOpacity: 1,
      exiting: false,
    });
  }

  for (let index = targets.length; index < next.length; index += 1) {
    const particle = next[index];
    particle.homeX = particle.x;
    particle.homeY = particle.y;
    particle.targetRadius = particle.radius;
    particle.targetColor = particle.color;
    particle.targetOpacity = 0;
    particle.exiting = true;
  }

  return next;
};

const moveToward = (current: number, target: number, factor: number) => current + (target - current) * factor;

export const advanceParticles = (
  particles: Particle[],
  pointerX: number,
  pointerY: number,
  canvasWidth: number,
  options: ResolvedParticleOptions,
) => {
  const interactionRadius = Math.max(options.interaction.minRadius, canvasWidth * options.interaction.radiusRatio);
  let colorsChanged = false;

  for (const particle of particles) {
    if (options.interaction.enabled) {
      const dx = particle.x - pointerX;
      const dy = particle.y - pointerY;
      const distance = Math.hypot(dx, dy);
      if (distance < interactionRadius && distance > 0.01) {
        const force = (1 - distance / interactionRadius) * options.interaction.force;
        particle.vx += (dx / distance) * force;
        particle.vy += (dy / distance) * force;
      }
    }

    particle.vx += (particle.homeX - particle.x) * options.interaction.spring;
    particle.vy += (particle.homeY - particle.y) * options.interaction.spring;
    particle.vx *= options.interaction.damping;
    particle.vy *= options.interaction.damping;
    particle.x += particle.vx;
    particle.y += particle.vy;

    const previousColor = particle.color;
    const previousOpacityBucket = Math.round(particle.opacity * 40);
    particle.color = [
      roundChannel(moveToward(particle.color[0], particle.targetColor[0], 0.14)),
      roundChannel(moveToward(particle.color[1], particle.targetColor[1], 0.14)),
      roundChannel(moveToward(particle.color[2], particle.targetColor[2], 0.14)),
    ];
    particle.radius = moveToward(particle.radius, particle.targetRadius, 0.14);
    particle.opacity = moveToward(particle.opacity, particle.targetOpacity, 0.12);
    if (
      previousColor[0] !== particle.color[0]
      || previousColor[1] !== particle.color[1]
      || previousColor[2] !== particle.color[2]
      || previousOpacityBucket !== Math.round(particle.opacity * 40)
    ) {
      colorsChanged = true;
    }
  }

  const activeParticles = particles.filter((particle) => !particle.exiting || particle.opacity > 0.02);
  return { particles: activeParticles, colorsChanged: colorsChanged || activeParticles.length !== particles.length };
};

export const particleColorKey = (particle: Particle) => (
  `${particle.color[0]},${particle.color[1]},${particle.color[2]},${Math.round(particle.opacity * 40)}`
);
