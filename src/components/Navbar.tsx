'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';

/* ── Nav group definitions ── */
const NAV_GROUPS = [
  {
    label: 'LEARNING',
    items: [
      {
        href: '/blogs', label: 'Blogs', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        ), public: true,
      },
      {
        href: '/resources', label: 'Resources', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        ), public: true,
        dropdown: [
          { href: '/resources?cat=tutorials', label: 'Tutorials', icon: '📖' },
          { href: '/resources?cat=dsa', label: 'DSA Guide', icon: '🔢' },
          { href: '/resources?cat=interview', label: 'Interview Prep', icon: '💼' },
          { href: '/resources?cat=sheets', label: 'Cheat Sheets', icon: '📋' },
        ],
      },
      {
        href: '/qotd', label: 'QotD', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        ), public: true,
      },
      {
        href: '/practice', label: 'Practice', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>
        ), public: false,
        dropdown: [
          { href: '/practice?diff=easy', label: 'Easy', icon: '🟢' },
          { href: '/practice?diff=medium', label: 'Medium', icon: '🟡' },
          { href: '/practice?diff=hard', label: 'Hard', icon: '🔴' },
          { href: '/practice?filter=submissions', label: 'My Submissions', icon: '📝' },
          { href: '/practice?filter=bookmarks', label: 'Bookmarks', icon: '🔖' },
        ],
      },
    ],
  },
  {
    label: 'CODING',
    items: [
      {
        href: '/ide', label: 'IDE', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        ), public: true,
      },
      {
        href: '/contests', label: 'Contests', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
        ), public: true,
        dropdown: [
          { href: '/contests?status=upcoming', label: 'Upcoming', icon: '⏳' },
          { href: '/contests?status=active', label: 'Ongoing', icon: '🔴' },
          { href: '/contests?status=completed', label: 'Past', icon: '📜' },
          { href: '/contests?filter=mine', label: 'My Contests', icon: '🎯' },
        ],
      },
    ],
  },
  {
    label: 'COMMUNITY',
    items: [
      {
        href: '/leaderboard', label: 'Leaderboard', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        ), public: true,
      },
      {
        href: '/team', label: 'Team', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        ), public: true,
      },
      {
        href: 'https://discord.gg/em2hPagZ', label: 'Discord', icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M7.5 20c0 0-2-1.5-2.5-3.5c0 0-1.5-4 0-9c0 0 2-2.5 7-2.5s7 2.5 7 2.5c1.5 5 0 9 0 9c-.5 2-2.5 3.5-2.5 3.5l-1-1.5c0 0-2.5 .5-3.5 .5s-3.5-.5-3.5-.5l-1 1.5z"/></svg>
        ), public: true,
      },
    ],
  },
];

const USER_DROPDOWN_LINKS = [
  { href: '/profile', label: 'My Profile', icon: '👤' },
  { href: '/practice?filter=submissions', label: 'My Submissions', icon: '📝' },
  { href: '/practice?filter=bookmarks', label: 'Saved Problems', icon: '🔖' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropTimeout = useRef<NodeJS.Timeout | null>(null);
  const userDropRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  // Scroll shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auth
  useEffect(() => {
    const supabase = getSupabase();
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) fetchUserProfile(data.session.user.id);
    }
    loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) fetchUserProfile(session.user.id);
      else { setUser(null); setNotifications([]); setUnreadCount(0); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Notifications
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabase();
    async function fetchNotifs() {
      const { data } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    }
    fetchNotifs();
  }, [user]);

  async function fetchUserProfile(userId: string) {
    const supabase = getSupabase();
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) setUser(data as unknown as AppUser);
  }

  async function handleLogout() {
    await getSupabase().auth.signOut();
    window.location.href = '/login';
  }

  async function markAllRead() {
    if (!user) return;
    const supabase = getSupabase();
    await (supabase as any).from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userDropRef.current && !userDropRef.current.contains(e.target as Node)) setUserDropOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function openDropdown(label: string) {
    if (dropTimeout.current) clearTimeout(dropTimeout.current);
    setActiveDropdown(label);
  }
  function closeDropdown() {
    dropTimeout.current = setTimeout(() => setActiveDropdown(null), 120);
  }

  const isAdmin = user && ['super_admin', 'team'].includes(user.role);

  // Hide on admin pages & deep contest/practice pages
  if (
    pathname.startsWith('/admin') ||
    (pathname.startsWith('/contests/') && pathname !== '/contests') ||
    (pathname.startsWith('/practice/') && pathname !== '/practice')
  ) return null;

  return (
    <>
      {/* Skip to content */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      <nav
        className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}
        aria-label="Main navigation"
      >
        <div className="navbar-inner">

          {/* ── Logo ── */}
          <Link
            href={user ? '/dashboard' : '/'}
            className="navbar-logo"
            aria-label="CodingClub — Home"
          >
            <span className="navbar-logo-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </span>
            <span className="navbar-logo-text">CodingClub</span>
            <span className="navbar-logo-tagline">Learn. Compete. Grow.</span>
          </Link>

          {/* ── Desktop Nav Groups ── */}
          <ul className="navbar-groups" role="list">
            {NAV_GROUPS.map((group, gi) => (
              <li key={group.label} className="navbar-group" role="none">
                {/* Group divider */}
                {gi > 0 && <span className="nav-divider" aria-hidden="true" />}
                {/* Group label (hidden visually, for screen readers) */}
                <span className="nav-group-label" aria-hidden="true">{group.label}</span>

                {/* Group items */}
                <ul className="nav-group-items" role="list">
                  {group.items.map(item => {
                    const show = item.public || user;
                    if (!show) return null;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/') || pathname.startsWith(item.href + '?');
                    const hasDropdown = 'dropdown' in item && item.dropdown && item.dropdown.length > 0;

                    return (
                      <li
                        key={item.href}
                        className={`nav-item${hasDropdown ? ' nav-item--has-dropdown' : ''}${isActive ? ' nav-item--active' : ''}`}
                        role="none"
                        onMouseEnter={() => hasDropdown && openDropdown(item.label)}
                        onMouseLeave={() => hasDropdown && closeDropdown()}
                      >
                        <Link
                          href={item.href}
                          className={`navbar-link${isActive ? ' active' : ''}`}
                          aria-current={isActive ? 'page' : undefined}
                          aria-haspopup={hasDropdown ? 'true' : undefined}
                          aria-expanded={activeDropdown === item.label ? 'true' : undefined}
                        >
                          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                          <span>{item.label}</span>
                          {hasDropdown && (
                            <span className="nav-chevron" aria-hidden="true">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                            </span>
                          )}
                        </Link>

                        {/* Dropdown */}
                        {hasDropdown && activeDropdown === item.label && (
                          <div
                            className="nav-dropdown"
                            role="menu"
                            onMouseEnter={() => openDropdown(item.label)}
                            onMouseLeave={closeDropdown}
                          >
                            {'dropdown' in item && item.dropdown!.map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className="nav-dropdown-item"
                                role="menuitem"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="nav-dropdown-icon">{sub.icon}</span>
                                <span>{sub.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>

          {/* ── Right Section ── */}
          <div className="navbar-right" role="toolbar" aria-label="Account and settings">

            {/* Admin Console pill */}
            {isAdmin && (
              <Link
                href="/admin"
                className="nav-admin-pill"
                title="Admin Console"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Admin
              </Link>
            )}

            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="nav-icon-btn"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span style={{ display: 'inline-block', transition: 'transform 0.35s ease', transform: theme === 'light' ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '1rem' }}>
                  {theme === 'light' ? '🌙' : '☀️'}
                </span>
              </button>
            )}

            {/* Notification bell */}
            {user && (
              <div className="nav-notif-wrapper" ref={notifRef}>
                <button
                  className="nav-icon-btn nav-icon-btn--notif"
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                  onClick={() => setNotifOpen(o => !o)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="nav-badge" aria-hidden="true">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="nav-notif-dropdown" role="dialog" aria-label="Notifications">
                    <div className="nav-notif-header">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <button className="nav-notif-mark-read" onClick={markAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="nav-notif-empty">
                        <span>🎉</span>
                        <p>You're all caught up!</p>
                      </div>
                    ) : (
                      <div className="nav-notif-list">
                        {notifications.map((n: any) => (
                          <div
                            key={n.id}
                            className={`nav-notif-item${!n.is_read ? ' nav-notif-item--unread' : ''}`}
                            onClick={() => { setNotifOpen(false); if (n.link) router.push(n.link); }}
                          >
                            <span className="nav-notif-dot" aria-hidden="true" />
                            <div>
                              <p className="nav-notif-msg">{n.message}</p>
                              <p className="nav-notif-time">
                                {new Date(n.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User avatar / profile dropdown */}
            {user ? (
              <div className="nav-user-wrapper" ref={userDropRef}>
                <button
                  className="navbar-avatar"
                  onClick={() => setUserDropOpen(o => !o)}
                  aria-label={`Account menu for ${user.username}`}
                  aria-expanded={userDropOpen}
                >
                  <img
                    src={`/avatars/${user.avatar_url}`}
                    alt={user.username}
                    width={34}
                    height={34}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                  />
                </button>

                {userDropOpen && (
                  <div className="nav-user-dropdown" role="menu" aria-label="Account options">
                    {/* Header */}
                    <div className="nav-user-dropdown-header">
                      <img
                        src={`/avatars/${user.avatar_url}`}
                        alt={user.username}
                        width={40}
                        height={40}
                        className="nav-user-dropdown-avatar"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                      />
                      <div>
                        <p className="nav-user-name">{user.full_name || user.username}</p>
                        <p className="nav-user-role">{user.role}</p>
                      </div>
                    </div>
                    <div className="nav-user-dropdown-divider" />
                    {USER_DROPDOWN_LINKS.map(l => (
                      <Link
                        key={l.href}
                        href={l.href === '/profile' ? `/profile/${user.username}` : l.href}
                        className="nav-user-dropdown-item"
                        role="menuitem"
                        onClick={() => setUserDropOpen(false)}
                      >
                        <span>{l.icon}</span>
                        <span>{l.label}</span>
                      </Link>
                    ))}
                    {isAdmin && (
                      <>
                        <div className="nav-user-dropdown-divider" />
                        <Link
                          href="/admin"
                          className="nav-user-dropdown-item nav-user-dropdown-item--admin"
                          role="menuitem"
                          onClick={() => setUserDropOpen(false)}
                        >
                          <span>🛡️</span>
                          <span>Switch to Admin</span>
                        </Link>
                      </>
                    )}
                    <div className="nav-user-dropdown-divider" />
                    <button
                      className="nav-user-dropdown-item nav-user-dropdown-item--logout"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm">Sign In</Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="navbar-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      {menuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}
      <div className={`mobile-drawer${menuOpen ? ' mobile-drawer--open' : ''}`} aria-hidden={!menuOpen} role="dialog" aria-label="Navigation menu">
        {/* Drawer header */}
        <div className="mobile-drawer-header">
          <Link href={user ? '/dashboard' : '/'} className="navbar-logo" onClick={() => setMenuOpen(false)}>
            <span className="navbar-logo-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </span>
            <span className="navbar-logo-text" style={{ fontSize: '1rem' }}>CodingClub</span>
          </Link>
          <button className="nav-icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="mobile-drawer-user">
            <img src={`/avatars/${user.avatar_url}`} alt={user.username} width={40} height={40} className="mobile-drawer-avatar" onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }} />
            <div>
              <p className="nav-user-name">{user.full_name || user.username}</p>
              <p className="nav-user-role">{user.role}</p>
            </div>
          </div>
        )}

        {/* All nav groups */}
        <nav className="mobile-drawer-nav" aria-label="Mobile navigation">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mobile-drawer-group">
              <p className="mobile-drawer-group-label">{group.label}</p>
              {group.items.map(item => {
                const show = item.public || user;
                if (!show) return null;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mobile-drawer-link${isActive ? ' active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {isAdmin && (
            <div className="mobile-drawer-group">
              <p className="mobile-drawer-group-label">ADMIN</p>
              <Link href="/admin" className="mobile-drawer-link mobile-drawer-link--admin" onClick={() => setMenuOpen(false)}>
                <span>🛡️</span> Admin Console
              </Link>
            </div>
          )}
        </nav>

        {/* Footer actions */}
        <div className="mobile-drawer-footer">
          {mounted && (
            <button className="nav-icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
          )}
          {user ? (
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleLogout}>🚪 Logout</button>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }} onClick={() => setMenuOpen(false)}>Sign In</Link>
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <Link href={user ? '/dashboard' : '/'} className={`mobile-bottom-tab${pathname === '/dashboard' || pathname === '/' ? ' active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Home</span>
        </Link>
        <Link href="/practice" className={`mobile-bottom-tab${pathname.startsWith('/practice') ? ' active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>
          <span>Practice</span>
        </Link>
        <Link href="/ide" className={`mobile-bottom-tab${pathname.startsWith('/ide') ? ' active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>IDE</span>
        </Link>
        <Link href="/contests" className={`mobile-bottom-tab${pathname.startsWith('/contests') ? ' active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
          <span>Contests</span>
        </Link>
        {user ? (
          <Link href={`/profile/${user.username}`} className={`mobile-bottom-tab${pathname.startsWith('/profile') ? ' active' : ''}`}>
            <img src={`/avatars/${user.avatar_url}`} alt={user.username} width={22} height={22} style={{ borderRadius: '50%', border: '1.5px solid var(--accent)' }} onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }} />
            <span>Profile</span>
          </Link>
        ) : (
          <Link href="/login" className="mobile-bottom-tab">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <span>Sign In</span>
          </Link>
        )}
      </nav>
    </>
  );
}
