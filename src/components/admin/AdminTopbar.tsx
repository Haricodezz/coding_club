'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { NotificationDropdown } from './ui/NotificationDropdown';
import { useTheme } from 'next-themes';
import { getSupabase } from '@/lib/supabase';

export default function AdminTopbar({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Theme hook
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // States
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Live Database Search States
  const [searchResults, setSearchResults] = useState<{ id: string; label: string; type: string; href: string }[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Dynamic search filters stats state
  const [filterStats, setFilterStats] = useState({
    pendingBlogs: 0,
    activeContests: 0,
    newUsers: 0
  });

  // Quick Toggles (Sync with LocalStorage)
  const [highContrast, setHighContrast] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // References for elements
  const settingsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load preferences & mount state & event listeners
  useEffect(() => {
    setMounted(true);
    const hc = localStorage.getItem('adminHighContrast') === 'true';
    const maint = localStorage.getItem('adminMaintenanceMode') === 'true';
    const sync = localStorage.getItem('adminAutoSync') !== 'false';
    const email = localStorage.getItem('adminEmails') !== 'false';
    const history = JSON.parse(localStorage.getItem('adminSearchHistory') || '[]');

    setHighContrast(hc);
    setMaintenanceMode(maint);
    setAutoSync(sync);
    setEmailNotifications(email);
    setSearchHistory(history);

    // Event listener for clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }

    // Keyboard shortcut (⌘K or Ctrl+K) to focus search
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch real count stats for the saved filters in parallel on mount
  useEffect(() => {
    if (!mounted) return;

    async function fetchStats() {
      try {
        const supabase = getSupabase();
        const nowIso = new Date().toISOString();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Fetch counts in parallel
        const [
          { count: pendingCount },
          { count: contestsCount },
          { count: usersCount }
        ] = await Promise.all([
          (supabase as any).from('cms_blogs').select('*', { count: 'exact', head: true }).eq('is_published', false),
          (supabase as any).from('contest_events').select('*', { count: 'exact', head: true }).lte('start_time', nowIso).gte('end_time', nowIso),
          (supabase as any).from('users').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString())
        ]);

        setFilterStats({
          pendingBlogs: pendingCount || 0,
          activeContests: contestsCount || 0,
          newUsers: usersCount || 0
        });
      } catch (err) {
        console.error('Error fetching dynamic filter counts:', err);
      }
    }

    fetchStats();
  }, [mounted]);

  // Live Debounced Parallel Database Search Queries across ALL relevant tables
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const supabase = getSupabase();
        const query = searchQuery.trim();

        // Query users, blogs, events, announcements, contest_events, question_bank in parallel directly from Supabase
        const [
          { data: matchedUsers },
          { data: matchedBlogs },
          { data: matchedEvents },
          { data: matchedAnnouncements },
          { data: matchedContests },
          { data: matchedProblems }
        ] = await Promise.all([
          (supabase as any).from('users').select('id, username').ilike('username', `%${query}%`).limit(2),
          (supabase as any).from('cms_blogs').select('id, title').ilike('title', `%${query}%`).limit(2),
          (supabase as any).from('cms_events').select('id, title').ilike('title', `%${query}%`).limit(2),
          (supabase as any).from('cms_announcements').select('id, title').ilike('title', `%${query}%`).limit(2),
          (supabase as any).from('contest_events').select('id, title').ilike('title', `%${query}%`).limit(2),
          (supabase as any).from('question_bank').select('id, title').ilike('title', `%${query}%`).limit(2)
        ]);

        const results: { id: string; label: string; type: string; href: string }[] = [];
        
        if (matchedUsers) {
          (matchedUsers as any[]).forEach(u => {
            results.push({ id: `u-${u.id}`, label: u.username, type: 'User', href: '/admin/users' });
          });
        }
        if (matchedBlogs) {
          (matchedBlogs as any[]).forEach(b => {
            results.push({ id: `b-${b.id}`, label: b.title, type: 'Blog', href: '/admin/blogs' });
          });
        }
        if (matchedEvents) {
          (matchedEvents as any[]).forEach(e => {
            results.push({ id: `e-${e.id}`, label: e.title, type: 'Event', href: '/admin/events' });
          });
        }
        if (matchedAnnouncements) {
          (matchedAnnouncements as any[]).forEach(a => {
            results.push({ id: `a-${a.id}`, label: a.title, type: 'Announcement', href: '/admin/announcements' });
          });
        }
        if (matchedContests) {
          (matchedContests as any[]).forEach(c => {
            results.push({ id: `c-${c.id}`, label: c.title, type: 'Contest', href: '/admin/contests' });
          });
        }
        if (matchedProblems) {
          (matchedProblems as any[]).forEach(p => {
            results.push({ id: `p-${p.id}`, label: p.title, type: 'Problem', href: '/admin/question-bank' });
          });
        }

        setSearchResults(results);
      } catch (err) {
        console.error('Error querying database search:', err);
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Toggle handlers
  const toggleHighContrast = () => {
    const nextVal = !highContrast;
    setHighContrast(nextVal);
    localStorage.setItem('adminHighContrast', String(nextVal));
    window.dispatchEvent(new CustomEvent('admin-toggle-high-contrast'));
  };

  const toggleMaintenance = () => {
    const nextVal = !maintenanceMode;
    setMaintenanceMode(nextVal);
    localStorage.setItem('adminMaintenanceMode', String(nextVal));
  };

  const toggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    localStorage.setItem('adminAutoSync', String(nextVal));
  };

  const toggleEmail = () => {
    const nextVal = !emailNotifications;
    setEmailNotifications(nextVal);
    localStorage.setItem('adminEmails', String(nextVal));
  };

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'CodingClub', href: '/admin' }];
    
    paths.forEach((p, idx) => {
      if (p === 'admin') return;
      const label = p.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      const href = '/' + paths.slice(0, idx + 1).join('/');
      crumbs.push({ label, href });
    });

    if (crumbs.length === 1) {
      crumbs.push({ label: 'Overview', href: '/admin' });
    }
    
    return crumbs;
  };

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const nextHistory = [searchQuery.trim(), ...searchHistory.filter(h => h !== searchQuery.trim())].slice(0, 5);
    setSearchHistory(nextHistory);
    localStorage.setItem('adminSearchHistory', JSON.stringify(nextHistory));
    
    setSearchFocused(false);
    
    const q = searchQuery.toLowerCase();
    if (q.includes('user')) router.push('/admin/users');
    else if (q.includes('blog') || q.includes('review')) router.push('/admin/blogs');
    else if (q.includes('contest')) router.push('/admin/contests');
    else if (q.includes('event')) router.push('/admin/events');
    else if (q.includes('audit') || q.includes('log')) router.push('/admin/audit');
    else if (q.includes('practice') || q.includes('question')) router.push('/admin/practice');
    else if (q.includes('announcement')) router.push('/admin/announcements');
    else if (q.includes('team')) router.push('/admin/team');
    else if (q.includes('leaderboard')) router.push('/admin/leaderboard');
    else if (q.includes('qotd')) router.push('/admin/qotd');
    else if (q.includes('resource')) router.push('/admin/resources');
  };

  return (
    <header className="admin-topbar-header">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {getBreadcrumbs().map((crumb, idx, arr) => (
          <div key={`${crumb.href}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
            <Link
              href={crumb.href}
              style={{
                color: idx === arr.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: idx === arr.length - 1 ? 600 : 500,
                textDecoration: 'none',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={e => {
                if (idx !== arr.length - 1) e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                if (idx !== arr.length - 1) e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              {crumb.label}
            </Link>
            {idx < arr.length - 1 && <span style={{ color: 'var(--color-border-hover)', fontSize: '0.75rem' }}>/</span>}
          </div>
        ))}
      </nav>

      {/* 2. Donezo Floating Search Input */}
      <div ref={searchRef} style={{ position: 'relative', width: '320px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, fontSize: '0.85rem' }}>🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search or jump to... (⌘K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.25rem',
                background: 'var(--color-surface)',
                border: searchFocused ? '1px solid var(--accent-green)' : '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                fontWeight: 500,
                outline: 'none',
                transition: 'all var(--transition-fast)',
                boxShadow: searchFocused ? '0 0 10px rgba(0, 200, 83, 0.15)' : 'none',
              }}
            />
            {!searchFocused && (
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '0.1rem 0.35rem',
                  fontSize: '0.65rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-tertiary)',
                }}
              >
                ⌘K
              </span>
            )}
          </div>
        </form>

        {/* Search History Dropdown */}
        {searchFocused && (
          <div
            className="glass animate-fade-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '100%',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-hover)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 9999,
              padding: '0.75rem 0',
            }}
          >
            {searchQuery.trim() !== '' ? (
              <div style={{ padding: '0.5rem 0' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, padding: '0 1rem 0.35rem' }}>
                  {searching ? 'Searching Database...' : 'Database Matches'}
                </div>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {searching ? 'Querying records...' : `No records match "${searchQuery}"`}
                  </div>
                ) : (
                  searchResults.map(result => (
                    <div
                      key={result.id}
                      onClick={() => {
                        setSearchQuery('');
                        setSearchFocused(false);
                        router.push(result.href);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 1rem',
                        cursor: 'pointer',
                        fontSize: '0.775rem',
                        transition: 'all var(--transition-fast)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(0, 200, 83, 0.06)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <span>
                          {result.type === 'User' ? '👤' : 
                           result.type === 'Blog' ? '✍️' : 
                           result.type === 'Event' ? '📅' : 
                           result.type === 'Announcement' ? '📢' : 
                           result.type === 'Contest' ? '⚡' : '🧩'}
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {result.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Saved Filters Shortcut */}
                <div style={{ padding: '0 1rem 0.5rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>Saved Filters</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {[
                      { label: `Pending Approvals (${filterStats.pendingBlogs})`, query: 'Pending Approvals', href: '/admin/blogs/user-submissions' },
                      { label: `Active Contests (${filterStats.activeContests})`, query: 'Active Contests', href: '/admin/contests' },
                      { label: `New Users (${filterStats.newUsers})`, query: 'New Users', href: '/admin/users' }
                    ].map(filter => (
                      <button
                        key={filter.query}
                        onClick={() => {
                          setSearchFocused(false);
                          router.push(filter.href);
                        }}
                        style={{
                          background: 'rgba(0, 200, 83, 0.1)',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'var(--accent-green)',
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ⚡ {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent History */}
                <div style={{ padding: '0.5rem 0 0 0' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, padding: '0 1rem 0.35rem' }}>Recent Searches</div>
                  {searchHistory.length === 0 ? (
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>No search history</div>
                  ) : (
                    searchHistory.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setSearchQuery(item);
                          setSearchFocused(false);
                          const q = item.toLowerCase();
                          if (q.includes('user')) router.push('/admin/users');
                          else if (q.includes('blog') || q.includes('review')) router.push('/admin/blogs');
                          else if (q.includes('contest')) router.push('/admin/contests');
                          else if (q.includes('event')) router.push('/admin/events');
                          else if (q.includes('announcement')) router.push('/admin/announcements');
                          else router.push('/admin');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          fontSize: '0.775rem',
                          color: 'var(--text-secondary)',
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        <span>🕒</span>
                        <span>{item}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. Action Buttons & Quick Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

        {/* Live Site */}
        <Link
          href="/"
          style={{
            fontSize: '0.775rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'color var(--transition-fast) ease',
            fontWeight: 600,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Live Site ↗
        </Link>

        <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }}></div>

        {/* Notification dropdown */}
        <div style={{ position: 'relative' }}>
          <NotificationDropdown />
        </div>

        {/* Settings gear dropdown controls */}
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Admin quick settings"
            title="Admin Quick Toggles"
            className={`admin-topbar-btn ${settingsOpen ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.1rem' }}>⚙️</span>
          </button>

          {settingsOpen && (
            <div
              className="glass animate-fade-in"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '260px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-hover)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                padding: '1rem',
                zIndex: 9999,
              }}
            >
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.75rem 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Quick Settings</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', background: 'rgba(0,200,83,0.1)', padding: '1px 5px', borderRadius: '4px' }}>Active</span>
              </h4>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* 0. Light / Dark Theme Mode Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-primary)' }}>Theme Mode</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{mounted && theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={mounted ? theme === 'dark' : true}
                      onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    />
                    <span className="toggle-switch-slider"></span>
                  </label>
                </div>

                {/* 1. High Contrast Mode Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-primary)' }}>High Contrast</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>AAA Accessibility</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={highContrast}
                      onChange={toggleHighContrast}
                    />
                    <span className="toggle-switch-slider"></span>
                  </label>
                </div>

                {/* 2. Maintenance Mode Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-primary)' }}>Maintenance</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Disable public access</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={maintenanceMode}
                      onChange={toggleMaintenance}
                    />
                    <span className="toggle-switch-slider"></span>
                  </label>
                </div>

                {/* 3. Auto-Sync Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-primary)' }}>Auto-Sync</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>LeetCode credentials</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={autoSync}
                      onChange={toggleAutoSync}
                    />
                    <span className="toggle-switch-slider"></span>
                  </label>
                </div>

                {/* 4. Email Notifications Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-primary)' }}>Emails</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>System alert emails</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={emailNotifications}
                      onChange={toggleEmail}
                    />
                    <span className="toggle-switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
