'use client';

import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

export function GlassCard({ children, className = '', style = {}, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: delay * 0.001, ease: [0.16, 1, 0.3, 1] as const }}
      whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(108, 99, 255, 0.15)', borderColor: 'rgba(108, 99, 255, 0.3)' }}
      className={`glass ${className}`}
      style={{
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
        ...style
      }}
    >
      {/* Glow border overlay effect */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: 'radial-gradient(800px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255,255,255,0.06), transparent 40%)',
          pointerEvents: 'none',
          opacity: 0.5
        }}
      />
      {children}
    </motion.div>
  );
}
