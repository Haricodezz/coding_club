'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatedLaptop } from './AnimatedLaptop';
import { FloatingParticles } from './FloatingParticles';
import { HeroStats } from './HeroStats';
import { GlowOrb } from '@/components/ui/GlowOrb';

// ------------------------------------------------------------------
// Typing headline effect
// ------------------------------------------------------------------
const HEADLINES = [
  'Code Smarter.',
  'Compete Harder.',
  'Learn Together.',
];

function TypingHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const phrase = HEADLINES[phraseIndex];

    if (!deleting && displayed.length < phrase.length) {
      timerRef.current = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 65);
    } else if (!deleting && displayed.length === phrase.length) {
      timerRef.current = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timerRef.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % HEADLINES.length);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [displayed, deleting, phraseIndex]);

  return (
    <span style={{ color: 'var(--accent-3)' }}>
      {displayed}
      <span
        style={{
          display: 'inline-block',
          width: 3,
          height: '1em',
          background: 'var(--accent)',
          marginLeft: 2,
          verticalAlign: 'middle',
          animation: 'blink 0.8s step-end infinite',
        }}
      />
    </span>
  );
}

// ------------------------------------------------------------------
// Floating dashboard card (shows above / beside laptop)
// ------------------------------------------------------------------
interface FloatingCardProps {
  emoji: string;
  title: string;
  value: string;
  sub: string;
  delay: number;
  style?: React.CSSProperties;
}

function FloatingCard({ emoji, title, value, sub, delay, style }: FloatingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const }}
      style={{
        position: 'absolute',
        background: 'rgba(22,22,30,0.85)',
        border: '1px solid rgba(108,99,255,0.25)',
        borderRadius: 12,
        padding: '10px 14px',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 20,
        minWidth: 160,
        ...style,
      }}
    >
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.5 }}
        style={{ fontSize: '1.4rem', flexShrink: 0 }}
      >
        {emoji}
      </motion.div>
      <div>
        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </div>
        <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: '0.68rem', color: '#6c63ff' }}>{sub}</div>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------
// HeroScene  —  the full cinematic hero section
// ------------------------------------------------------------------
interface HeroSceneProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  primaryBtnText?: string;
  primaryBtnLink?: string;
  secondaryBtnText?: string;
  secondaryBtnLink?: string;
}

export function HeroScene({
  title,
  subtitle,
  badge = '🎓 Open to all students',
  primaryBtnText = 'Get Started 🚀',
  primaryBtnLink = '/login',
  secondaryBtnText = 'View Leaderboard',
  secondaryBtnLink = '/leaderboard',
  data,
}: HeroSceneProps & { data?: any }) {
  const [phase, setPhase] = useState(0); // Drive staggered reveal
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),   // grid
      setTimeout(() => setPhase(2), 300),   // glows
      setTimeout(() => setPhase(3), 600),   // left content
      setTimeout(() => setPhase(4), 900),   // laptop
      setTimeout(() => setPhase(5), 2500),  // floating cards
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        padding: '80px 0 60px',
      }}
    >
      {/* ── Layer 0: Animated grid background ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 1.5 }}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(108, 99, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(108, 99, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          zIndex: 0,
        }}
      />

      {/* ── Layer 1: Glow orbs ── */}
      {phase >= 2 && (
        <>
          <GlowOrb x="15%" y="40%" size={600} color="rgba(108,99,255,0.18)" delay={0} blur={90} />
          <GlowOrb x="75%" y="30%" size={500} color="rgba(139,92,246,0.15)" delay={0.2} blur={100} />
          <GlowOrb x="60%" y="80%" size={350} color="rgba(236,72,153,0.10)" delay={0.4} blur={80} />
        </>
      )}

      {/* ── Content ── */}
      <div
        className="container hero-grid-2col"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
        }}
      >
        {/* ────────── LEFT: text + stats ────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 3 ? 1 : 0 }}
          transition={{ duration: 0.8 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* Badge */}
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : -10 }}
            transition={{ duration: 0.5, delay: 0 }}
            className="badge"
            style={{
              alignSelf: 'flex-start',
              fontSize: '0.75rem',
              background: 'rgba(108,99,255,0.12)',
              color: 'var(--accent-3)',
              border: '1px solid rgba(108,99,255,0.3)',
              padding: '0.3rem 0.9rem',
            }}
          >
            {badge}
          </motion.span>

          {/* Static headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 30 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-1px',
              color: '#fff',
              margin: 0,
            }}
          >
            {title ? (
              title
            ) : (
              <>
                Coding Club
                <br />
                <TypingHeadline />
              </>
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontSize: '1.1rem',
              color: '#94a3b8',
              lineHeight: 1.65,
              maxWidth: 480,
              margin: 0,
            }}
          >
            {subtitle ||
              'Your all-in-one platform for daily challenges, live IDE, HackerRank contests, curated learning paths, and real-time leaderboards.'}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
          >
            <Link
              href={primaryBtnLink}
              className="btn btn-primary btn-lg"
              style={{ boxShadow: '0 0 24px rgba(108,99,255,0.45)' }}
            >
              {primaryBtnText}
            </Link>
            <Link href={secondaryBtnLink} className="btn btn-secondary btn-lg">
              {secondaryBtnText}
            </Link>
          </motion.div>

          {/* Stats row removed based on user feedback */}
          {/* <motion.div ...> <HeroStats /> </motion.div> */}
        </motion.div>

        {/* ────────── RIGHT: laptop scene ────────── */}
        <motion.div
          className="hero-right-scene"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 4 ? 1 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ position: 'relative', minHeight: 380 }}
        >
          {/* Particle field */}
          <div style={{ position: 'absolute', inset: '-20px', zIndex: 1, borderRadius: 20, overflow: 'hidden' }}>
            <FloatingParticles />
          </div>

          {/* Laptop */}
          <div style={{ position: 'relative', zIndex: 5 }}>
            <AnimatedLaptop terminalCode={data?.editor_code} />
          </div>

          {/* ── Floating dashboard cards removed based on user feedback ── */}
        </motion.div>
      </div>

      {/* Bottom fade-out gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: 'linear-gradient(to bottom, transparent, var(--color-bg))',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}
