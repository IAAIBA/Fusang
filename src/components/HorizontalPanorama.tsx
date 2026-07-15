import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import { normalizeLoopPosition, positiveModulo } from '../lib/panorama';
import ParticlePortrait from './ParticlePortrait';
import './HorizontalPanorama.css';

gsap.registerPlugin(Observer);

export interface PanoramaWriting {
  title: string;
  description: string;
  href: string;
  date: string;
  layout: 'long' | 'vertical-short' | 'horizontal-short';
}

interface Props {
  featured: PanoramaWriting;
  writing: PanoramaWriting[];
  avatarSrc: string;
  images: {
    nightWater: PanoramaImageSource;
    rainLeaves: PanoramaImageSource;
    mistRiverbank: PanoramaImageSource;
    rainGlass: PanoramaImageSource;
  };
}

interface PanoramaImageSource {
  src: string;
  srcSet: string;
}

const sceneAnchors = [
  { id: 'home', offset: 0 },
  { id: 'writing', offset: 4.96 },
  { id: 'archive', offset: 6.42 },
  { id: 'about', offset: 7.58 },
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 42 18" aria-hidden="true">
      <path d="M1 9h38M32 2l7 7-7 7" />
    </svg>
  );
}

function PanoramaCycle({ featured, writing, images, avatarSrc, copy }: Props & { copy: 'before' | 'middle' | 'after' }) {
  const semantic = copy === 'middle';

  return (
    <div
      className="panorama-cycle"
      data-cycle={copy}
      aria-hidden={semantic ? undefined : true}
      inert={semantic ? undefined : true}
    >
      <section className="scene scene--home" id={semantic ? 'home' : undefined} data-anchor={semantic ? 'home' : undefined}>
        <div className="home-copy text-safe">
          <h1><span>Fu</span>sang</h1>
          <p>写散文，也记录那些不适合被归档的瞬间。</p>
          <a className="panorama-link" href={featured.href}>
            阅读代表作 <ArrowIcon />
          </a>
        </div>
        <p className="home-note">夜色落下以后，文字开始显影。</p>
        <div className="image-frame image-frame--glass" data-parallax="0.18" aria-hidden="true">
          <img src={images.rainGlass.src} srcSet={images.rainGlass.srcSet} sizes="31vw" alt="" loading={semantic ? 'eager' : 'lazy'} draggable="false" />
        </div>
        <ParticlePortrait src={avatarSrc} />
        <div className="rain-field rain-field--home" aria-hidden="true"></div>
      </section>

      <section className="scene scene--water" aria-label={semantic ? '夜水' : undefined}>
        <div className="image-frame image-frame--water" data-parallax="0.1" aria-hidden="true">
          <img src={images.nightWater.src} srcSet={images.nightWater.srcSet} sizes="94vw" alt="" loading="lazy" draggable="false" />
        </div>
        <p className="water-phrase text-safe">水面保存光，<br />雨替它删去边界。</p>
        <span className="water-index">01 — 04</span>
      </section>

      <section className="scene scene--featured" aria-label={semantic ? '代表作' : undefined}>
        <div className="featured-copy text-safe">
          <span className="scene-number">NO. 01</span>
          <h2>{featured.title}</h2>
          <p>{featured.description}</p>
          <div className="featured-meta">
            <time>{featured.date}</time>
            <span>约八分钟</span>
          </div>
          <a className="panorama-link" href={featured.href}>
            开始阅读 <ArrowIcon />
          </a>
        </div>
        <div className="image-frame image-frame--leaves" data-parallax="-0.16" aria-hidden="true">
          <img src={images.rainLeaves.src} srcSet={images.rainLeaves.srcSet} sizes="61vw" alt="" loading="lazy" draggable="false" />
        </div>
        <p className="featured-ghost" aria-hidden="true">记忆并不留在原处</p>
      </section>

      <section className="scene scene--fragment" aria-label={semantic ? '文字片段' : undefined}>
        <p className="fragment-large text-safe">来路已经被雨<br />重新写过。</p>
        <p className="fragment-small text-safe">植物伏低身体。<br />它们不解释风，也不保存雨。</p>
        <span className="fragment-mark" aria-hidden="true">，</span>
      </section>

      <section
        className="scene scene--writing"
        id={semantic ? 'writing' : undefined}
        data-anchor={semantic ? 'writing' : undefined}
      >
        <div className="writing-heading text-safe">
          <h2>文章索引</h2>
          <p>长文与短章，按阅读方向各自展开。</p>
        </div>
        <div className="panorama-writing-list text-safe">
          {writing.slice(0, 3).map((entry, index) => (
            <a href={entry.href} className="panorama-writing-row" key={entry.href}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{entry.title}</strong>
              <time>{entry.date}</time>
              <ArrowIcon />
            </a>
          ))}
          <a className="panorama-link panorama-link--all" href="/writing">
            查看全部 <ArrowIcon />
          </a>
        </div>
        <div className="writing-orbit" data-parallax="0.2" aria-hidden="true"></div>
      </section>

      <section
        className="scene scene--archive"
        id={semantic ? 'archive' : undefined}
        data-anchor={semantic ? 'archive' : undefined}
      >
        <div className="archive-copy text-safe">
          <h2>时间不是目录，<br />只是作品留下的水位。</h2>
          <div className="archive-years">
            <span>2026</span><span>03 篇</span>
            <span>持续写作</span><span>DENVER · UTC−6</span>
          </div>
          <a className="panorama-link" href="/archive">进入归档 <ArrowIcon /></a>
        </div>
        <div className="archive-ripples" data-parallax="-0.12" aria-hidden="true">
          <i></i><i></i><i></i>
        </div>
      </section>

      <section
        className="scene scene--about"
        id={semantic ? 'about' : undefined}
        data-anchor={semantic ? 'about' : undefined}
      >
        <div className="image-frame image-frame--mist" data-parallax="0.12" aria-hidden="true">
          <img src={images.mistRiverbank.src} srcSet={images.mistRiverbank.srcSet} sizes="77vw" alt="" loading="lazy" draggable="false" />
        </div>
        <div className="about-copy text-safe">
          <h2>写作者<br /><em>Fusang</em></h2>
          <p>在夜色、植物与潮湿的城市之间，保存一些不急于得出结论的文字。</p>
          <a className="panorama-link" href="/about">关于本站 <ArrowIcon /></a>
        </div>
      </section>

      <section className="scene scene--seam" aria-label={semantic ? '循环接缝' : undefined}>
        <p className="seam-quote text-safe">读到这里，<br />也是另一种开始。</p>
        <p className="seam-hint">继续向右 · 首页正在前方</p>
        <div className="seam-line" aria-hidden="true"></div>
      </section>
    </div>
  );
}

export default function HorizontalPanorama(props: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const middleCycleRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const stage = stageRef.current;
    if (!shell || !stage) return;

    middleCycleRef.current = stage.querySelector('[data-cycle="middle"]');
    const middleCycle = middleCycleRef.current;
    if (!middleCycle) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      shell.classList.add('is-reduced', 'is-ready');
      const hash = window.location.hash.slice(1);
      const target = hash ? middleCycle.querySelector<HTMLElement>(`[data-anchor="${hash}"]`) : null;
      target?.scrollIntoView({ inline: 'start', block: 'nearest' });
      return;
    }

    let cycleWidth = middleCycle.getBoundingClientRect().width;
    let position = cycleWidth;
    let velocity = 0;
    let lastHashUpdate = 0;
    const setStageX = gsap.quickSetter(stage, 'x', 'px');
    const parallaxNodes = Array.from(stage.querySelectorAll<HTMLElement>('[data-parallax]'));
    const revealGroups = new Map<string, HTMLElement[]>();
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const key = (entry.target as HTMLElement).dataset.revealKey;
        if (!key) continue;
        revealGroups.get(key)?.forEach((node) => node.classList.add('is-revealed'));
      }
    }, {
      root: shell,
      rootMargin: '0px -5% 0px -5%',
      threshold: 0.12,
    });

    stage.querySelectorAll<HTMLElement>('.panorama-cycle').forEach((cycle) => {
      cycle.querySelectorAll<HTMLElement>('.scene').forEach((scene, sceneIndex) => {
        scene.querySelectorAll<HTMLElement>('.text-safe, .image-frame, .particle-portrait').forEach((node, nodeIndex) => {
          const key = `${sceneIndex}:${nodeIndex}`;
          const group = revealGroups.get(key) ?? [];
          group.push(node);
          revealGroups.set(key, group);
          node.dataset.revealKey = key;
          node.classList.add('reveal-target');
          node.style.setProperty('--reveal-delay', `${Math.min(nodeIndex, 3) * 90}ms`);
          revealObserver.observe(node);
        });
      });
    });

    const setPosition = (next: number) => {
      position = normalizeLoopPosition(next, cycleWidth);
      setStageX(-position);
    };

    const updateParallax = () => {
      const viewportCenter = window.innerWidth / 2;
      for (const node of parallaxNodes) {
        const rect = node.getBoundingClientRect();
        if (rect.right < -160 || rect.left > window.innerWidth + 160) continue;
        const depth = Number(node.dataset.parallax ?? 0);
        const distance = (rect.left + rect.width / 2 - viewportCenter) / window.innerWidth;
        node.style.setProperty('--parallax-x', `${distance * depth * -180}px`);
        node.style.setProperty('--parallax-y', `${Math.abs(distance) * depth * 34}px`);
      }
    };

    const updateNavigation = (time: number) => {
      if (time - lastHashUpdate < 180) return;
      lastHashUpdate = time;
      const localViewport = positiveModulo(position - cycleWidth, cycleWidth) / window.innerWidth;
      let active: (typeof sceneAnchors)[number] = sceneAnchors[0];
      let nearest = Number.POSITIVE_INFINITY;

      for (const anchor of sceneAnchors) {
        const direct = Math.abs(localViewport - anchor.offset);
        const wrapped = Math.min(direct, 9.6 - direct);
        if (wrapped < nearest) {
          nearest = wrapped;
          active = anchor;
        }
      }

      document.querySelectorAll<HTMLElement>('[data-panorama-target]').forEach((link) => {
        if (link.dataset.panoramaTarget === active.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });

      const nextHash = `#${active.id}`;
      if (window.location.hash !== nextHash) {
        history.replaceState(null, '', `${window.location.pathname}${nextHash}`);
      }
    };

    const ticker = (_time: number, _deltaTime: number, frame: number) => {
      if (Math.abs(velocity) > 0.01) {
        setPosition(position + velocity);
        velocity *= 0.89;
      } else {
        velocity = 0;
      }

      updateParallax();
      const progress = positiveModulo(position - cycleWidth, cycleWidth) / cycleWidth;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
      if (frame % 10 === 0) updateNavigation(performance.now());
    };

    const observer = Observer.create({
      target: shell,
      type: 'wheel,touch,pointer',
      preventDefault: true,
      dragMinimum: 3,
      tolerance: 1,
      onPress: () => shell.classList.add('is-dragging'),
      onRelease: () => shell.classList.remove('is-dragging'),
      onWheel: (self) => {
        const delta = Math.abs(self.deltaY) >= Math.abs(self.deltaX) ? self.deltaY : self.deltaX;
        velocity += gsap.utils.clamp(-90, 90, delta * 0.13);
      },
      onDrag: (self) => {
        velocity += gsap.utils.clamp(-78, 78, -self.deltaX * 0.32);
      },
    });

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        velocity += event.key === 'PageDown' ? window.innerWidth * 0.055 : 24;
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        velocity -= event.key === 'PageUp' ? window.innerWidth * 0.055 : 24;
      }
    };

    const seekTo = (id: string, smooth = true) => {
      const anchor = middleCycle.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
      if (!anchor) return;
      const destination = cycleWidth + anchor.offsetLeft;
      velocity = 0;
      if (!smooth) {
        setPosition(destination);
        return;
      }
      const state = { value: position };
      gsap.to(state, {
        value: destination,
        duration: 1.15,
        ease: 'power3.inOut',
        overwrite: true,
        onUpdate: () => setPosition(state.value),
      });
    };

    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-panorama-target]'));
    const navHandlers = navLinks.map((link) => {
      const handler = (event: MouseEvent) => {
        event.preventDefault();
        seekTo(link.dataset.panoramaTarget ?? 'home');
      };
      link.addEventListener('click', handler);
      return { link, handler };
    });

    const resizeObserver = new ResizeObserver(() => {
      const progress = cycleWidth > 0 ? positiveModulo(position - cycleWidth, cycleWidth) / cycleWidth : 0;
      cycleWidth = middleCycle.getBoundingClientRect().width;
      position = cycleWidth + progress * cycleWidth;
      setStageX(-position);
    });

    resizeObserver.observe(middleCycle);
    window.addEventListener('keydown', handleKeydown);
    gsap.ticker.add(ticker);
    setStageX(-position);
    seekTo(window.location.hash.slice(1) || 'home', false);
    shell.classList.add('is-ready');

    return () => {
      observer.kill();
      shell.classList.remove('is-dragging');
      revealObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeydown);
      gsap.ticker.remove(ticker);
      navHandlers.forEach(({ link, handler }) => link.removeEventListener('click', handler));
      gsap.killTweensOf('*');
    };
  }, []);

  return (
    <div className="panorama-shell" ref={shellRef} tabIndex={-1} aria-label="连续横向文学画布">
      <div className="panorama-stage" ref={stageRef}>
        <PanoramaCycle {...props} copy="before" />
        <PanoramaCycle {...props} copy="middle" />
        <PanoramaCycle {...props} copy="after" />
      </div>
      <div className="panorama-progress" aria-hidden="true"><span ref={progressRef}></span></div>
      <p className="panorama-instruction"><b>滚轮</b> CONTINUOUS HORIZONTAL SCROLL</p>
    </div>
  );
}
