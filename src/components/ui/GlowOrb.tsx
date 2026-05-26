'use client';

import { motion } from 'framer-motion';

interface GlowOrbProps {
  x?: string;
  y?: string;
  size?: number;
  color?: string;
  delay?: number;
  blur?: number;
  opacity?: number;
}

export function GlowOrb({
  x = '50%',
  y = '50%',
  size = 400,
  color = 'rgba(108, 99, 255, 0.25)',
  delay = 0,
  blur = 80,
  opacity = 1,
}: GlowOrbProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity, scale: 1 }}
      transition={{ duration: 2.5, delay, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
