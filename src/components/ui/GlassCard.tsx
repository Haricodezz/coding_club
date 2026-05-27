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
      whileHover={{
        y: -6,
        boxShadow: 'var(--glass-hover-shadow)',
        borderColor: 'var(--glass-hover-border)',
      }}
      className={`glass ${className}`}
      style={{
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
        ...style
      }}
    >
      {/* Glow border overlay effect — subtler in light mode */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: 'radial-gradient(800px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), var(--glass-glow-color), transparent 40%)',
          pointerEvents: 'none',
          opacity: 0.5
        }}
      />
      {children}
    </motion.div>
  );
}
