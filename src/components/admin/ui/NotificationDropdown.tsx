'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

type NotificationType = 'info' | 'warning' | 'success' | 'system' | 'security';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  time: string;
  read: boolean;
  link?: string;
}

// Time-ago formatting helper
function formatTimeAgo(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch (e) {
    return 'recently';
  }
}

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const supabase = getSupabase();
        
        // 1. Fetch real pending reviews (unpublished administrative blogs)
        const { data: pendingBlogs } = await (supabase as any)
          .from('cms_blogs')
          .select('id, title, created_at')
          .eq('is_published', false)
          .order('created_at', { ascending: false })
          .limit(5);

        // 2. Fetch real student submissions awaiting approval (status = 'pending')
        const { data: pendingUserBlogs } = await (supabase as any)
          .from('user_blogs')
          .select('id, title, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        const rawItems: { id: string; title: string; message: string; type: NotificationType; timeStr: string; date: Date; link?: string }[] = [];

        if (pendingBlogs) {
          (pendingBlogs as any[]).forEach(b => {
            rawItems.push({
              id: `blog-${b.id}`,
              title: 'Draft Awaiting Approval',
              message: `"${b.title}" is pending administrative approval.`,
              type: 'warning',
              timeStr: b.created_at ? formatTimeAgo(b.created_at) : 'recently',
              date: b.created_at ? new Date(b.created_at) : new Date(0),
              link: '/admin/blogs'
            });
          });
        }

        if (pendingUserBlogs) {
          (pendingUserBlogs as any[]).forEach(ub => {
            rawItems.push({
              id: `userblog-${ub.id}`,
              title: 'Student Submission',
              message: `"${ub.title}" needs review and approval.`,
              type: 'warning',
              timeStr: ub.created_at ? formatTimeAgo(ub.created_at) : 'recently',
              date: ub.created_at ? new Date(ub.created_at) : new Date(0),
              link: '/admin/blogs/user-submissions'
            });
          });
        }

        // Sort items chronologically (latest first)
        rawItems.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Get read notification IDs from localStorage
        const readIds: string[] = JSON.parse(localStorage.getItem('adminReadNotifications') || '[]');

        // Map to notifications format
        const finalNotifs: AppNotification[] = rawItems.map(item => ({
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          time: item.timeStr,
          read: readIds.includes(item.id),
          link: item.link
        }));

        // Add a standard system health notification if completely clean
        if (finalNotifs.length === 0) {
          finalNotifs.push({
            id: 'sys-ok',
            title: 'System operating normally',
            message: 'All queues are empty. No pending reviews or approvals at this time.',
            type: 'success',
            time: 'just now',
            read: true
          });
        }

        setNotifications(finalNotifs);
      } catch (err) {
        console.error('Error fetching admin notifications:', err);
      }
    }

    fetchNotifications();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const readIds: string[] = JSON.parse(localStorage.getItem('adminReadNotifications') || '[]');
    const nextReadIds = Array.from(new Set([...readIds, ...allIds]));
    localStorage.setItem('adminReadNotifications', JSON.stringify(nextReadIds));

    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    const readIds: string[] = JSON.parse(localStorage.getItem('adminReadNotifications') || '[]');
    if (!readIds.includes(id)) {
      const nextReadIds = [...readIds, id];
      localStorage.setItem('adminReadNotifications', JSON.stringify(nextReadIds));
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'info': return <span style={{ color: '#3b82f6' }}>ℹ️</span>;
      case 'warning': return <span style={{ color: '#f59e0b' }}>⚠️</span>;
      case 'success': return <span style={{ color: '#00C853' }}>✅</span>;
      case 'system': return <span style={{ color: '#8b5cf6' }}>⚙️</span>;
      case 'security': return <span style={{ color: '#ef4444' }}>🛡️</span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications"
        style={{ 
          background: isOpen ? 'var(--color-surface-3)' : 'none', 
          border: 'none', 
          color: 'var(--text-secondary)', 
          cursor: 'pointer', 
          padding: '0.35rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: '6px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
        onMouseLeave={e => {
          if (!isOpen) e.currentTarget.style.background = 'none';
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{ 
            position: 'absolute', 
            top: '2px', 
            right: '2px', 
            width: '8px', 
            height: '8px', 
            background: '#ef4444', 
            borderRadius: '50%',
            border: '2px solid var(--color-surface)'
          }}></span>
        )}
      </button>

      {isOpen && (
        <div 
          className="glass animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-surface)'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1rem', 
            borderBottom: '1px solid var(--color-border)',
            background: 'rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div style={{ padding: '0.5rem 0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                All caught up!
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    setIsOpen(false);
                    if (notif.link) {
                      router.push(notif.link);
                    }
                  }}
                  style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    padding: '0.75rem 1rem',
                    background: notif.read ? 'transparent' : 'rgba(0, 200, 83, 0.04)',
                    borderLeft: `2px solid ${notif.read ? 'transparent' : 'var(--accent-green)'}`,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(0, 200, 83, 0.04)'}
                >
                  <div style={{ flexShrink: 0, marginTop: '2px', fontSize: '0.9rem' }}>
                    {getIconForType(notif.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.15rem' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: notif.read ? 500 : 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notif.title}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.5rem' }}>{notif.time}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
