'use client';

import { useCallback } from 'react';
import { ParticlesProvider, useParticlesProvider } from '@tsparticles/react';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

const PARTICLE_OPTIONS: ISourceOptions = {
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
        links: { opacity: 0.4, color: '#6c63ff' },
      },
    },
  },
  particles: {
    color: { value: ['#6c63ff', '#ec4899', '#8b5cf6'] },
    links: {
      color: '#6c63ff',
      distance: 150,
      enable: true,
      opacity: 0.15,
      width: 1.5,
    },
    move: {
      direction: 'none',
      enable: true,
      outModes: { default: 'bounce' },
      random: false,
      speed: 1.2,
      straight: false,
    },
    number: {
      density: { enable: true, width: 800 },
      value: 70,
    },
    opacity: { value: 0.6 },
    shape: { type: 'circle' },
    size: { value: { min: 1, max: 3 } },
  },
  detectRetina: true,
};

function ParticlesInner() {
  const { loaded } = useParticlesProvider();

  if (!loaded) return null;

  return (
    <Particles
      id="tsparticles"
      options={PARTICLE_OPTIONS}
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
        background: 'radial-gradient(circle at 50% 50%, #0c0b16 0%, #050409 100%)',
      }}
    >
      <ParticlesProvider init={init}>
        <ParticlesInner />
      </ParticlesProvider>
    </div>
  );
}
