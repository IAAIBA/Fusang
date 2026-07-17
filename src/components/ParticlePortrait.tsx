import { useEffect, useState } from 'react';
import ImageParticles from './ImageParticles';
import type { ParticleAppearanceOptions } from '../lib/imageParticles';

interface Props {
  src: string;
}

type Theme = 'dark' | 'light';

const DARK_APPEARANCE: ParticleAppearanceOptions = {
  opacity: 0.94,
  color: {
    background: [8, 8, 8],
    minimumContrast: 1.2,
    saturation: 0.76,
    lightness: 1.08,
  },
};

const LIGHT_APPEARANCE: ParticleAppearanceOptions = {
  opacity: 1,
  color: {
    background: [244, 245, 239],
    minimumContrast: 2.5,
    saturation: 1,
    lightness: 0.82,
  },
};

const readTheme = (): Theme => (
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
);

const useDocumentTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const root = document.documentElement;
    setTheme(readTheme());
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
};

/**
 * Homepage layout adapter for ImageParticles. The particle implementation is
 * reusable; this wrapper only supplies the site's theme profile and placement.
 */
export default function ParticlePortrait({ src }: Props) {
  const theme = useDocumentTheme();

  return (
    <div className="particle-portrait" data-parallax="0.14" data-particle-theme={theme} aria-hidden="true">
      <ImageParticles
        src={src}
        appearance={theme === 'light' ? LIGHT_APPEARANCE : DARK_APPEARANCE}
      />
    </div>
  );
}
