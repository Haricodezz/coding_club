'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/types';
import { useState, useEffect } from 'react';

interface SidebarGroup {
  id: string;
  label: string;
  items: {
    href: string;
    label: string;
    icon: string;
  }[];
}

export default function AdminSidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    content: true,
    community: true,
    learning: true,
    competitions: true,
    moderation: true,
  });

  // Handle auto-collapsing on smaller tablet screen sizes initially
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const groups: SidebarGroup[] = [
    {
      id: 'content',
      label: 'Content',
      items: [
        { href: '/admin/blogs', label: 'Blogs', icon: '✍️' },
        { href: '/admin/blogs/user-submissions', label: 'User Submissions', icon: '📬' },
        { href: '/admin/announcements', label: 'Announcements', icon: '📢' },
        { href: '/admin/events', label: 'Events', icon: '📅' },
        { href: '/admin/homepage-sections', label: 'Homepage', icon: '🏠' },
      ],
    },
    {
      id: 'community',
      label: 'Community',
      items: [
        { href: '/admin/users', label: 'Users', icon: '👥' },
        { href: '/admin/team', label: 'Team', icon: '🛡️' },
        { href: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
      ],
    },
    {
      id: 'learning',
      label: 'Learning',
      items: [
        { href: '/admin/practice', label: 'Practice', icon: '❓' },
        { href: '/admin/qotd', label: 'QotD', icon: '💡' },
        { href: '/admin/resources', label: 'Resources', icon: '📚' },
      ],
    },
    {
      id: 'competitions',
      label: 'Competitions',
      items: [
        { href: '/admin/contests', label: 'Contests', icon: '⚡' },
        { href: '/admin/question-bank', label: 'Question Bank', icon: '🧩' },
      ],
    },
    {
      id: 'moderation',
      label: 'Moderation',
      items: [
        { href: '/admin/security', label: 'Flags', icon: '🚩' },
        { href: '/admin/blogs/user-submissions', label: 'Reviews', icon: '🔍' },
        { href: '/admin/audit', label: 'Audit Log', icon: '📋' },
      ],
    },
  ];

  return (
    <aside
      className={`glass-strong ${collapsed ? 'w-20' : 'w-64'}`}
      style={{
        borderRight: '1px solid var(--color-border)',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-surface)',
        flexShrink: 0,
      }}
    >
      {/* Header Logo */}
      <div
        style={{
          height: 'var(--navbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: collapsed ? '0 1.25rem' : '0 1.5rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '0.6rem', overflow: 'hidden' }}>
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(139,92,246,0.3))' }}>
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="26" fill="url(#logo-grad)" />
            <path d="M34 33L17 50L34 67" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M46 72L54 28" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M66 33L83 50L66 67" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && (
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.05rem',
                letterSpacing: '-0.03em',
                whiteSpace: 'nowrap',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CodingClub
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.35rem 0.5rem',
            fontSize: '0.7rem',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent-green)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '1.25rem 0', overflowY: 'auto' }} aria-label="Admin Navigation">

        {groups.map(group => {
          const isGroupExpanded = expandedGroups[group.id];
          return (
            <div key={group.id} style={{ marginBottom: '1rem' }}>
              {/* Group Title Accordion Header */}
              <div
                onClick={() => !collapsed && toggleGroup(group.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: collapsed ? '0 1rem' : '0 1.5rem',
                  marginBottom: '0.35rem',
                  cursor: collapsed ? 'default' : 'pointer',
                  userSelect: 'none',
                }}
              >
                {!collapsed ? (
                  <>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {group.label}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isGroupExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      ▼
                    </span>
                  </>
                ) : (
                  <div style={{ width: '100%', height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />
                )}
              </div>

              {/* Group Items */}
              {(!collapsed && isGroupExpanded) || collapsed ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {group.items.map(link => {
                    const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                    return (
                      <li key={link.label} style={{ position: 'relative', margin: '0.15rem 0.75rem' }}>
                        <Link
                          href={link.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: collapsed ? '0.6rem 0' : '0.55rem 1rem',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            textDecoration: 'none',
                            fontSize: '0.825rem',
                            fontWeight: isActive ? 600 : 500,
                            borderRadius: '8px',
                            background: isActive ? 'rgba(0, 200, 83, 0.08)' : 'transparent',
                            borderLeft: isActive ? '3px solid var(--accent-green)' : '3px solid transparent',
                            transition: 'all var(--transition-fast)',
                          }}
                          onMouseEnter={e => {
                            if (!isActive) {
                              e.currentTarget.style.color = 'var(--text-primary)';
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isActive) {
                              e.currentTarget.style.color = 'var(--text-secondary)';
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <span style={{ fontSize: '0.95rem', filter: isActive ? 'none' : 'grayscale(30%)', opacity: isActive ? 1 : 0.75 }}>
                            {link.icon}
                          </span>
                          {!collapsed && <span>{link.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* Footer Profile Section */}
      <div
        style={{
          padding: '1rem 0.75rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          background: 'rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--accent-1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(139,92,246,0.2)',
                overflow: 'hidden',
              }}
            >
              {user.avatar_url && !imgError ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.full_name || user.username || user.email} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={() => setImgError(true)} 
                />
              ) : (
                (user.full_name || user.username || user.email || 'A').charAt(0).toUpperCase()
              )}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.full_name ? user.full_name.split(' ')[0] : (user.username || user.email?.split('@')[0])}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {user.role === 'super_admin' ? 'Founder 👑' : user.role.replace('_', ' ')}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {/* Settings direct access */}
              <Link
                href="/admin/settings"
                title="Admin Settings"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >
                ⚙️
              </Link>
              <button
                onClick={onLogout}
                title="Logout"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-rose)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >
                🚪
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
