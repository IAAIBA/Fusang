import { useEffect, useRef } from 'react';

interface Props {
  src: string;
}

interface Particle {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

const quantize = (value: number) => Math.min(255, Math.round(value / 24) * 24);
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
    if (pointerSubscribers.size === 0) {
      window.removeEventListener('pointermove', dispatchPointerMove);
    }
  };
};

/**
 * Adapted from QingXia-Ela/Ark-Particle-Imitate (MIT, 2022):
 * https://github.com/QingXia-Ela/Ark-Particle-Imitate
 *
 * The original image is used only as an offscreen sampling source. The visible
 * result is rendered entirely as particles.
 */
export default function ParticlePortrait({ src }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const image = new Image();
    image.decoding = 'async';

    let particles: Particle[] = [];
    let particleGroups = new Map<string, Particle[]>();
    let frameId = 0;
    let resizeFrame = 0;
    let running = false;
    let inView = false;
    let destroyed = false;
    let pointerX = Number.POSITIVE_INFINITY;
    let pointerY = Number.POSITIVE_INFINITY;
    let canvasWidth = 1;
    let canvasHeight = 1;

    const render = () => {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.globalAlpha = 0.94;

      for (const [color, group] of particleGroups) {
        context.beginPath();
        for (const particle of group) {
          context.moveTo(particle.x + particle.radius, particle.y);
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        }
        context.fillStyle = color;
        context.fill();
      }

      context.globalAlpha = 1;
    };

    const update = () => {
      if (!running || destroyed) return;
      const interactionRadius = Math.max(48, canvasWidth * 0.13);
      for (const particle of particles) {
        const dx = particle.x - pointerX;
        const dy = particle.y - pointerY;
        const distance = Math.hypot(dx, dy);

        if (distance < interactionRadius && distance > 0.01) {
          const force = (1 - distance / interactionRadius) * 1.35;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }

        particle.vx += (particle.homeX - particle.x) * 0.032;
        particle.vy += (particle.homeY - particle.y) * 0.032;
        particle.vx *= 0.88;
        particle.vy *= 0.88;
        particle.x += particle.vx;
        particle.y += particle.vy;
      }

      render();
      frameId = window.requestAnimationFrame(update);
    };

    const start = () => {
      if (running || reducedMotion || particles.length === 0) return;
      running = true;
      frameId = window.requestAnimationFrame(update);
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frameId);
    };

    const rebuild = () => {
      if (!image.complete || image.naturalWidth === 0) return;
      const rect = canvas.getBoundingClientRect();
      canvasWidth = Math.max(1, rect.width);
      canvasHeight = Math.max(1, rect.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvasWidth * pixelRatio);
      canvas.height = Math.round(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const sampleSize = canvasWidth < 330 ? 150 : 210;
      const gap = canvasWidth < 330 ? 4 : 3;
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = sampleSize;
      sampleCanvas.height = sampleSize;
      const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
      if (!sampleContext) return;
      sampleContext.drawImage(image, 0, 0, sampleSize, sampleSize);
      const pixels = sampleContext.getImageData(0, 0, sampleSize, sampleSize).data;
      const padding = canvasWidth * 0.035;
      const drawableWidth = canvasWidth - padding * 2;
      const drawableHeight = canvasHeight - padding * 2;
      const next: Particle[] = [];

      for (let y = 0; y < sampleSize; y += gap) {
        for (let x = 0; x < sampleSize; x += gap) {
          const pixelIndex = (y * sampleSize + x) * 4;
          const alpha = pixels[pixelIndex + 3];
          if (alpha < 18) continue;

          const edgeDistance = Math.min(x, y, sampleSize - x, sampleSize - y);
          const edgeOpacity = Math.min(1, edgeDistance / 15);
          const noise = ((x * 17 + y * 29) % 100) / 100;
          if (noise > edgeOpacity) continue;

          const red = quantize(pixels[pixelIndex]);
          const green = quantize(pixels[pixelIndex + 1]);
          const blue = quantize(pixels[pixelIndex + 2]);
          const homeX = padding + (x / sampleSize) * drawableWidth;
          const homeY = padding + (y / sampleSize) * drawableHeight;
          const radius = canvasWidth < 330 ? 0.82 : 1.05 + ((x + y) % 3) * 0.12;

          next.push({
            homeX,
            homeY,
            x: homeX,
            y: homeY,
            vx: 0,
            vy: 0,
            radius,
            color: `rgb(${red} ${green} ${blue})`,
          });
        }
      }

      particles = next;
      particleGroups = new Map();
      for (const particle of particles) {
        const group = particleGroups.get(particle.color) ?? [];
        group.push(particle);
        particleGroups.set(particle.color, group);
      }
      canvas.dataset.particleReady = 'true';
      canvas.dataset.particleCount = String(particles.length);
      render();
      if (running) {
        stop();
        start();
      } else if (inView) {
        start();
      }
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

    image.addEventListener('load', rebuild, { once: true });
    image.src = src;
    visibilityObserver.observe(canvas);
    resizeObserver.observe(canvas);
    const unsubscribePointerMove = subscribeToPointerMove(handlePointerMove);

    return () => {
      destroyed = true;
      stop();
      window.cancelAnimationFrame(resizeFrame);
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      unsubscribePointerMove();
    };
  }, [src]);

  return (
    <div className="particle-portrait" data-parallax="0.14" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
