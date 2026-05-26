'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠', public: false },
  { href: '/blogs', label: 'Blogs', icon: '📝', public: true },
  { href: '/events', label: 'Events', icon: '📅', public: true },
  { href: '/resources', label: 'Resources', icon: '📚', public: true },
  { href: '/qotd', label: 'QotD', icon: '💡', public: true },
  { href: '/ide', label: 'IDE', icon: '⚡', public: true },
  { href: '/contests', label: 'Contests', icon: '🏆', public: true },
  { href: '/leaderboard', label: 'Leaderboard', icon: '📊', public: true },
  { href: '/questions', label: 'Questions', icon: '🧩', public: false },
];

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<AppUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for shadow effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch auth state
  useEffect(() => {
    const supabase = getSupabase();
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) fetchUserProfile(data.session.user.id);
    }
    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) fetchUserProfile(session.user.id);
      else setUser(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string) {
    const supabase = getSupabase();
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) setUser(data as unknown as AppUser);
  }

  async function handleLogout() {
    await getSupabase().auth.signOut();
    window.location.href = '/login';
  }

  if (pathname.startsWith('/admin') || (pathname.startsWith('/contests/') && pathname !== '/contests')) {
    return null;
  }

  return (
    <nav className="navbar" style={{ boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.4)' : 'none' }}>
      <div className="container navbar-inner">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="navbar-logo">
          <span className="navbar-logo-icon">{'</>'}</span>
          <span className="navbar-logo-text">CodingClub</span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="navbar-links">
          {NAV_LINKS.filter((link) => {
            const isAdmin = user && ['super_admin', 'team'].includes(user.role);
            if (link.href === '/dashboard' && isAdmin) return false;
            return link.public || user;
          }).map(({ href, label, icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`navbar-link ${pathname.startsWith(href) ? 'active' : ''}`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            </li>
          ))}
          {user && user.role && ['super_admin', 'team'].includes(user.role) && (
            <li>
              <Link
                href="/admin"
                className={`navbar-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
                style={{ color: 'var(--gold)' }}
              >
                <span>⚙️</span>
                Admin Console
              </Link>
            </li>
          )}
        </ul>

        {/* Right side */}
        <div className="navbar-right">
          {user ? (
            <>
              <Link
                href={`/profile/${user.username}`}
                className="navbar-avatar"
                title={user.username}
              >
                <img
                  src={`/avatars/${user.avatar_url}`}
                  alt={user.username}
                  width={36}
                  height={36}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg';
                  }}
                />
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            className="navbar-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="glass-strong"
          style={{
            position: 'absolute',
            top: 'var(--navbar-height)',
            left: 0,
            right: 0,
            padding: '1rem',
            zIndex: 99,
            borderTop: '1px solid var(--color-border)',
            borderRadius: '0 0 16px 16px',
          }}
        >
          {NAV_LINKS.filter((link) => {
            const isAdmin = user && ['super_admin', 'team'].includes(user.role);
            if (link.href === '/dashboard' && isAdmin) return false;
            return link.public || user;
          }).map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`navbar-link ${pathname.startsWith(href) ? 'active' : ''}`}
              style={{ display: 'flex', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '4px' }}
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ marginRight: '0.5rem' }}>{icon}</span>
              {label}
            </Link>
          ))}
          {user && user.role && ['super_admin', 'team'].includes(user.role) && (
            <Link
              href="/admin"
              className={`navbar-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
              style={{ display: 'flex', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '4px', color: 'var(--gold)' }}
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ marginRight: '0.5rem' }}>⚙️</span>
              Admin Console
            </Link>
          )}
          {user && (
            <>
              <hr className="divider" />
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
