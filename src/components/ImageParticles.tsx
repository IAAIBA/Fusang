import { useEffect, useMemo, useRef } from 'react';
import {
  advanceParticles,
  calculateFitRect,
  particleColorKey,
  reconcileParticles,
  resolveParticleOptions,
  sampleParticleTargets,
  type Particle,
  type ParticleAppearanceOptions,
  type ParticleInteractionOptions,
  type ParticleSamplingOptions,
  type ParticleTransitionOptions,
  type ResolvedParticleOptions,
} from '../lib/imageParticles';

export interface ImageParticlesProps {
  src: string;
  fit?: 'cover' | 'contain';
  sampling?: ParticleSamplingOptions;
  appearance?: ParticleAppearanceOptions;
  interaction?: ParticleInteractionOptions;
  transition?: ParticleTransitionOptions;
  className?: string;
  ariaHidden?: boolean;
}

interface ControllerUpdate {
  src: string;
  fit: 'cover' | 'contain';
  options: ResolvedParticleOptions;
}

interface ImageParticlesController {
  update: (next: ControllerUpdate) => void;
  destroy: () => void;
}

const pointerSubscribers = new Set<(event: PointerEvent) => void>();

const dispatchPointerMove = (event: PointerEvent) => {
  pointerSubscribers.forEach((subscriber) => subscriber(event));
};

const subscribeToPointerMove = (subscriber: (event: PointerEvent) => void) => {
  if (pointerSubscribers.size === 0) {
    window.addEventListener('pointermove', dispatchPointerMove, { passive: true });
  }
  pointerSubscribers.add(subscriber);
  return () => {
    pointerSubscribers.delete(subscriber);
    if (pointerSubscribers.size === 0) window.removeEventListener('pointermove', dispatchPointerMove);
  };
};

const createController = (canvas: HTMLCanvasElement): ImageParticlesController | null => {
  const context = canvas.getContext('2d');
  if (!context) return null;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let updateState: ControllerUpdate | null = null;
  let image: HTMLImageElement | null = null;
  let source = '';
  let particles: Particle[] = [];
  let particleGroups = new Map<string, Particle[]>();
  let colorsDirty = true;
  let frameId = 0;
  let resizeFrame = 0;
  let sourceVersion = 0;
  let running = false;
  let inView = false;
  let destroyed = false;
  let pointerX = Number.POSITIVE_INFINITY;
  let pointerY = Number.POSITIVE_INFINITY;
  let canvasWidth = 1;
  let canvasHeight = 1;

  const rebuildGroups = () => {
    particleGroups = new Map();
    for (const particle of particles) {
      if (particle.opacity <= 0.02) continue;
      const key = particleColorKey(particle);
      const group = particleGroups.get(key) ?? [];
      group.push(particle);
      particleGroups.set(key, group);
    }
    colorsDirty = false;
  };

  const render = () => {
    if (!updateState) return;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    if (colorsDirty) rebuildGroups();

    for (const [key, group] of particleGroups) {
      const [red, green, blue, alpha] = key.split(',').map(Number);
      context.globalAlpha = updateState.options.appearance.opacity * (alpha / 40);
      context.beginPath();
      for (const particle of group) {
        context.moveTo(particle.x + particle.radius, particle.y);
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      }
      context.fillStyle = `rgb(${red} ${green} ${blue})`;
      context.fill();
    }
    context.globalAlpha = 1;
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(frameId);
  };

  const update = () => {
    if (!running || destroyed || !updateState) return;
    const result = advanceParticles(particles, pointerX, pointerY, canvasWidth, updateState.options);
    particles = result.particles;
    colorsDirty ||= result.colorsChanged;
    render();
    frameId = window.requestAnimationFrame(update);
  };

  const start = () => {
    if (running || reducedMotion || particles.length === 0) return;
    running = true;
    frameId = window.requestAnimationFrame(update);
  };

  const setError = () => {
    canvas.dataset.particleState = 'error';
    if (particles.length === 0) canvas.dataset.particleReady = 'false';
  };

  const rebuild = () => {
    if (!updateState || !image || !image.complete || image.naturalWidth === 0) return;
    const rect = canvas.getBoundingClientRect();
    canvasWidth = Math.max(1, rect.width);
    canvasHeight = Math.max(1, rect.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const sampleLongestSide = canvasWidth < 330 ? 150 : 210;
    const sampleScale = sampleLongestSide / Math.max(canvasWidth, canvasHeight);
    const sampleWidth = Math.max(1, Math.round(canvasWidth * sampleScale));
    const sampleHeight = Math.max(1, Math.round(canvasHeight * sampleScale));
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sampleContext) {
      setError();
      return;
    }

    const fitRect = calculateFitRect(image.naturalWidth, image.naturalHeight, sampleWidth, sampleHeight, updateState.fit);
    sampleContext.clearRect(0, 0, sampleWidth, sampleHeight);
    sampleContext.drawImage(image, fitRect.x, fitRect.y, fitRect.width, fitRect.height);

    try {
      const imageData = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
      const targets = sampleParticleTargets(imageData, sampleWidth, sampleHeight, canvasWidth, canvasHeight, updateState.options);
      particles = reducedMotion
        ? reconcileParticles([], targets, canvasWidth, canvasHeight, 'replace')
        : reconcileParticles(particles, targets, canvasWidth, canvasHeight, updateState.options.transition.mode);
      colorsDirty = true;
      canvas.dataset.particleReady = 'true';
      canvas.dataset.particleCount = String(targets.length);
      canvas.dataset.particleState = 'ready';
      render();
      if (inView) start();
    } catch {
      setError();
    }
  };

  const loadSource = (nextSource: string) => {
    const version = ++sourceVersion;
    canvas.dataset.particleState = 'loading';
    const nextImage = new Image();
    nextImage.decoding = 'async';
    nextImage.addEventListener('load', () => {
      if (destroyed || version !== sourceVersion) return;
      image = nextImage;
      source = nextSource;
      rebuild();
    }, { once: true });
    nextImage.addEventListener('error', () => {
      if (!destroyed && version === sourceVersion) setError();
    }, { once: true });
    nextImage.src = nextSource;
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
    if (pointerX < -80 || pointerY < -80 || pointerX > rect.width + 80 || pointerY > rect.height + 80) {
      pointerX = Number.POSITIVE_INFINITY;
      pointerY = Number.POSITIVE_INFINITY;
    }
  };

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inView = Boolean(entry?.isIntersecting);
    if (inView) start();
    else stop();
  }, { rootMargin: '35%' });

  const resizeObserver = new ResizeObserver(() => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(rebuild);
  });

  visibilityObserver.observe(canvas);
  resizeObserver.observe(canvas);
  const unsubscribePointerMove = subscribeToPointerMove(handlePointerMove);

  return {
    update(next) {
      const sourceChanged = next.src !== source;
      updateState = next;
      if (sourceChanged) loadSource(next.src);
      else rebuild();
    },
    destroy() {
      destroyed = true;
      stop();
      window.cancelAnimationFrame(resizeFrame);
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      unsubscribePointerMove();
    },
  };
};

/**
 * Canvas-only image particle renderer. The source image remains an offscreen
 * sampling input; consumers can update src to morph existing particles.
 */
export default function ImageParticles({
  src,
  fit = 'cover',
  sampling,
  appearance,
  interaction,
  transition,
  className,
  ariaHidden = true,
}: ImageParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ImageParticlesController | null>(null);
  const optionsKey = JSON.stringify({ fit, sampling, appearance, interaction, transition });
  const options = useMemo(
    () => resolveParticleOptions(sampling, appearance, interaction, transition),
    [optionsKey],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = createController(canvas);
    controllerRef.current = controller;
    return () => {
      controller?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update({ src, fit, options });
  }, [src, fit, options]);

  return <canvas ref={canvasRef} className={className} aria-hidden={ariaHidden} data-particle-ready="false" data-particle-state="idle" />;
}
