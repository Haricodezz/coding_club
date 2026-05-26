'use client';

import Link from 'next/link';

interface NavProblem {
  id: string;
  slug: string;
  title: string;
  label: string;
  solved?: boolean;
}

interface Props {
  problems: NavProblem[];
  contestSlug: string;
  activeSlug: string;
}

export default function ProblemNavigator({ problems, contestSlug, activeSlug }: Props) {
  return (
    <div style={{ display: 'flex', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', overflowX: 'auto', flexShrink: 0, padding: '0 1rem' }}>
      {problems.map(p => {
        const isActive = p.slug === activeSlug;
        return (
          <Link
            key={p.id}
            href={`/contests/${contestSlug}/problem/${p.slug}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1rem', textDecoration: 'none',
              borderBottom: isActive ? '2px solid var(--accent-1)' : '2px solid transparent',
              background: isActive ? 'var(--color-surface)' : 'transparent',
              transition: 'all 0.15s',
              minWidth: 'max-content'
            }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '24px', height: '24px', borderRadius: '6px',
              background: p.solved ? 'rgba(34,197,94,0.15)' : isActive ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: p.solved ? '#22c55e' : isActive ? 'var(--accent-1)' : 'var(--color-text-muted)',
              fontSize: '0.7rem', fontWeight: 800, fontFamily: 'monospace'
            }}>
              {p.solved ? '✓' : p.label}
            </span>
            <span style={{
              fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
              color: isActive ? '#f1f5f9' : 'var(--color-text-muted)'
            }}>
              {p.title}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
