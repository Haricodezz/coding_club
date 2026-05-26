'use client';

import { useState, useRef, useEffect } from 'react';

type NotificationType = 'info' | 'warning' | 'success' | 'system' | 'security';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: '1', title: 'New user registered', message: 'john_doe just signed up.', type: 'info', time: '5m ago', read: false },
  { id: '2', title: 'Contest starts in 2 hours', message: 'Weekly coding challenge is about to begin.', type: 'system', time: '10m ago', read: false },
  { id: '3', title: 'Blog draft pending review', message: 'A new article "Intro to React" needs approval.', type: 'warning', time: '1h ago', read: false },
  { id: '4', title: 'CSV import completed', message: 'Successfully imported 45 students.', type: 'success', time: '2h ago', read: true },
  { id: '5', title: 'User suspended', message: 'user_123 was flagged for policy violation.', type: 'security', time: '3h ago', read: true },
];

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'info': return <span style={{ color: '#3b82f6' }}>ℹ️</span>;
      case 'warning': return <span style={{ color: '#f59e0b' }}>⚠️</span>;
      case 'success': return <span style={{ color: '#10b981' }}>✅</span>;
      case 'system': return <span style={{ color: '#8b5cf6' }}>⚙️</span>;
      case 'security': return <span style={{ color: '#ef4444' }}>🛡️</span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
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
          className="glass"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '1px solid var(--color-border)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1rem', 
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)'
          }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
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
                  style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    padding: '0.75rem 1rem',
                    background: notif.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                    borderLeft: `2px solid ${notif.read ? 'transparent' : 'var(--accent)'}`,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)'}
                >
                  <div style={{ flexShrink: 0, marginTop: '2px', fontSize: '0.9rem' }}>
                    {getIconForType(notif.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.15rem' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: notif.read ? 400 : 500, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notif.title}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: '0.5rem' }}>{notif.time}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
