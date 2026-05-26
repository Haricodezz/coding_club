'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/types';
import { useState } from 'react';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/homepage-sections', label: 'Homepage', icon: '🏠' },
  { href: '/admin/blogs', label: 'Blogs', icon: '✍️' },
  { href: '/admin/announcements', label: 'News', icon: '📢' },
  { href: '/admin/events', label: 'Events', icon: '📅' },
  { href: '/admin/team', label: 'Team', icon: '👥' },
  { href: '/admin/gallery', label: 'Gallery', icon: '🖼️' },
  { href: '/admin/learning-paths', label: 'Paths', icon: '🗺️' },
  { href: '/admin/users', label: 'Users', icon: '👤' },
];

export default function AdminSidebar({ user, onLogout }: { user: User, onLogout: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`glass-strong ${collapsed ? 'w-20' : 'w-64'}`} style={{ borderRight: '1px solid var(--color-border)', transition: 'width 0.2s ease', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, zIndex: 100, background: 'var(--color-bg)' }}>
      <div style={{ height: 'var(--navbar-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: collapsed ? '0 1rem' : '0 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '0.5rem', overflow: 'hidden' }}>
          <div style={{ width: 24, height: 24, background: 'var(--text-primary)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-bg)', fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0 }}>
            C
          </div>
          {!collapsed && <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>CodingClub</span>}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.25rem' }}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
        
        {/* GROUP: CONTENT */}
        <div style={{ padding: collapsed ? '0' : '0 1rem', marginBottom: '0.25rem', marginTop: '0.5rem' }}>
          {!collapsed && <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', padding: '0 0.5rem', fontWeight: 600 }}>Content</div>}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
          {[
            { href: '/admin/blogs', label: 'Blogs', icon: '✍️' },
            { href: '/admin/announcements', label: 'Announcements', icon: '📢' },
            { href: '/admin/events', label: 'Events', icon: '📅' },
            { href: '/admin/homepage-sections', label: 'Homepage', icon: '🏠' },
          ].map(link => renderLink(link.href, link.label, link.icon))}
        </ul>

        {/* GROUP: COMMUNITY */}
        <div style={{ padding: collapsed ? '0' : '0 1rem', marginBottom: '0.25rem' }}>
          {!collapsed && <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', padding: '0 0.5rem', fontWeight: 600 }}>Community</div>}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
          {[
            { href: '/admin/users', label: 'Users', icon: '👥' },
            { href: '/admin/team', label: 'Team', icon: '🛡️' },
            { href: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
          ].map(link => renderLink(link.href, link.label, link.icon))}
        </ul>

        {/* GROUP: LEARNING */}
        <div style={{ padding: collapsed ? '0' : '0 1rem', marginBottom: '0.25rem' }}>
          {!collapsed && <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', padding: '0 0.5rem', fontWeight: 600 }}>Learning</div>}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
          {[
            { href: '/admin/questions', label: 'Questions', icon: '❓' },
            { href: '/admin/qotd', label: 'QOTD', icon: '💡' },
            { href: '/admin/resources', label: 'Resources', icon: '📚' },
          ].map(link => renderLink(link.href, link.label, link.icon))}
        </ul>

        {/* GROUP: COMPETITIONS */}
        <div style={{ padding: collapsed ? '0' : '0 1rem', marginBottom: '0.25rem' }}>
          {!collapsed && <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', padding: '0 0.5rem', fontWeight: 600 }}>Competitions</div>}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
          {[
            { href: '/admin/contests', label: 'Contests', icon: '🏆' },
            { href: '/admin/question-bank', label: 'Question Bank', icon: '🧩' },
          ].map(link => renderLink(link.href, link.label, link.icon))}
        </ul>

        {/* GROUP: SYSTEM */}
        <div style={{ padding: collapsed ? '0' : '0 1rem', marginBottom: '0.25rem' }}>
          {!collapsed && <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', padding: '0 0.5rem', fontWeight: 600 }}>System</div>}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            { href: '/admin/audit', label: 'Audit Logs', icon: '📋' },
            { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
            { href: '/admin/security', label: 'Security', icon: '🔒' },
          ].map(link => renderLink(link.href, link.label, link.icon))}
        </ul>

      </nav>

      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
          <div style={{ width: 24, height: 24, borderRadius: '4px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600, flexShrink: 0 }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1rem' }} title="Logout">
            🚪
          </button>
        )}
      </div>
    </aside>
  );

  function renderLink(href: string, label: string, icon: string) {
    const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
    return (
      <li key={href} style={{ position: 'relative' }}>
        <Link 
          href={href} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: collapsed ? '0.4rem 0' : '0.4rem 1.25rem', 
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: isActive ? 500 : 400,
            background: isActive ? 'var(--color-surface-2)' : 'transparent',
            borderLeft: `2px solid ${isActive ? 'var(--text-primary)' : 'transparent'}`,
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          <span style={{ fontSize: '0.9rem', filter: isActive ? 'none' : 'grayscale(100%)', opacity: isActive ? 1 : 0.6 }}>{icon}</span>
          {!collapsed && <span>{label}</span>}
        </Link>
      </li>
    );
  }
}
