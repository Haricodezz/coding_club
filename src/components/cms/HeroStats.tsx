'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface StatItem {
  value: string;
  target: number;
  label: string;
  icon: string;
  color: string;
}

const STATS: StatItem[] = [
  { value: '0', target: 200, label: 'Active Members', icon: '👥', color: '#6c63ff' },
  { value: '0', target: 50, label: 'Resources', icon: '📚', color: '#22d3a0' },
  { value: '0', target: 6, label: 'Languages', icon: '⚡', color: '#fbbf24' },
  { value: '0', target: 42, label: 'Challenges Solved', icon: '🏆', color: '#ec4899' },
];

function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [start, target, duration]);

  return count;
}

function StatCard({ item, delay, started }: { item: StatItem; delay: number; started: boolean }) {
  const count = useCountUp(item.target, 1600, started);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      style={{
        background: 'rgba(22,22,30,0.7)',
        border: `1px solid ${item.color}30`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 20px ${item.color}18`,
        flex: '1 1 120px',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{item.icon}</span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: '1.35rem',
            color: item.color,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
          {item.target >= 50 ? '+' : ''}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3, fontWeight: 500 }}>
          {item.label}
        </div>
      </div>
    </motion.div>
  );
}

export function HeroStats() {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {STATS.map((s, i) => (
        <StatCard key={s.label} item={s} delay={0.8 + i * 0.1} started={started} />
      ))}
    </div>
  );
}
