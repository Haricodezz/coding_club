'use client';

import Link from 'next/link';
import { User } from '@/types';

import { CommandPaletteTrigger } from './ui/CommandPaletteTrigger';
import { NotificationDropdown } from './ui/NotificationDropdown';

export default function AdminTopbar({ user }: { user: User }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: 'var(--navbar-height)', borderBottom: '1px solid var(--color-border)', background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>CodingClub</span> <span style={{ margin: '0 0.25rem', color: 'var(--color-border-hover)' }}>/</span> <span style={{ color: 'var(--text-primary)' }}>Overview</span>
        </div>
      </div>
      
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        <CommandPaletteTrigger />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <NotificationDropdown />
        
        <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }}></div>

        <Link href="/" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s ease', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
          Live Site ↗
        </Link>
      </div>
    </header>
  );
}
