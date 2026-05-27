'use client';

import { useRouter } from 'next/navigation';

interface Props {
  onExit: () => void;
}

export default function PreviewBanner({ onExit }: Props) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '0.6rem 1.5rem',
      background: 'linear-gradient(90deg, rgba(245,158,11,0.95), rgba(251,191,36,0.95))',
      backdropFilter: 'blur(8px)',
      borderBottom: '2px solid rgba(245,158,11,0.6)',
      boxShadow: '0 4px 20px rgba(245,158,11,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1rem' }}>👁</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1c1917' }}>
          Preview Mode — Viewing as Student
        </span>
        <span style={{ fontSize: '0.75rem', color: '#44403c', fontWeight: 500 }}>
          (Admin controls are hidden)
        </span>
      </div>
      <button
        onClick={onExit}
        style={{
          padding: '0.3rem 0.9rem',
          borderRadius: '6px',
          border: '1px solid rgba(0,0,0,0.2)',
          background: 'rgba(0,0,0,0.12)',
          color: '#1c1917',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s',
          marginLeft: '0.5rem',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.22)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.12)')}
      >
        ✕ Exit Preview
      </button>
    </div>
  );
}
