'use client';

import { useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { ParticlesProvider, useParticlesProvider } from '@tsparticles/react';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

function getParticleOptions(isDark: boolean): ISourceOptions {
  return {
    fullScreen: { enable: false },
    fpsLimit: 120,
    interactivity: {
      events: {
        onHover: { enable: true, mode: 'grab' },
        resize: { enable: true },
      },
      modes: {
        grab: {
          distance: 180,
          links: {
            opacity: isDark ? 0.4 : 0.3,
            color: isDark ? '#6c63ff' : '#5b54e5',
          },
        },
      },
    },
    particles: {
      color: {
        value: isDark
          ? ['#6c63ff', '#ec4899', '#8b5cf6']
          : ['#5b54e5', '#4f46e5', '#7c3aed'], // Middle ground colors
      },
      links: {
        color: isDark ? '#6c63ff' : '#5b54e5',
        distance: 150,
        enable: true,
        opacity: isDark ? 0.15 : 0.2, // Dialed back from 0.3
        width: isDark ? 1.5 : 1, // Back to 1px
      },
      move: {
        direction: 'none',
        enable: true,
        outModes: { default: 'bounce' },
        random: false,
        speed: isDark ? 1.2 : 0.8,
        straight: false,
      },
      number: {
        density: { enable: true, width: 800 },
        value: isDark ? 70 : 60,
      },
      opacity: { value: isDark ? 0.6 : 0.5 }, // Middle ground opacity
      shape: { type: 'circle' },
      size: { value: { min: 1, max: isDark ? 3 : 2 } },
    },
    detectRetina: true,
  };
}

function ParticlesInner({ isDark }: { isDark: boolean }) {
  const { loaded } = useParticlesProvider();
  const options = useMemo(() => getParticleOptions(isDark), [isDark]);

  if (!loaded) return null;

  return (
    <Particles
      id="tsparticles"
      options={options}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
}

export function AnimatedGridBg() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  const init = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: 'var(--animated-grid-bg)',
      }}
    >
      <ParticlesProvider init={init}>
        <ParticlesInner isDark={isDark} />
      </ParticlesProvider>
    </div>
  );
}
