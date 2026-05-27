'use client';

import React from 'react';

interface ActivityItem {
  id: string;
  action: string;
  target: string;
  user: string;
  time: string;
  icon: string;
  type?: 'Users' | 'Content' | 'Security' | 'System';
}

export function ActivityFeed({ items = [] }: { items?: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div 
        style={{ 
          padding: '2.5rem 1.5rem', 
          textAlign: 'center', 
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span style={{ fontSize: '2.25rem' }}>📭</span>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500 }}>No recent activity records found.</p>
      </div>
    );
  }

  // Maps activity types to badge styling
  const getTypeStyles = (type: string = 'Users') => {
    switch (type) {
      case 'Security':
        return { color: 'var(--accent-rose)', bg: 'rgba(239, 68, 68, 0.08)' };
      case 'Content':
        return { color: 'var(--accent-green)', bg: 'rgba(0, 200, 83, 0.08)' };
      case 'System':
        return { color: 'var(--accent-amber)', bg: 'rgba(245, 158, 11, 0.08)' };
      default:
        return { color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.08)' };
    }
  };

  return (
    <div className="donezo-timeline" style={{ padding: '0.5rem 0.5rem 0.5rem 1.25rem' }}>
      {items.map((item) => {
        const type = item.type || 'Users';
        const badge = getTypeStyles(type);

        return (
          <div key={item.id} className="timeline-item-row" style={{ display: 'flex', gap: '1rem' }}>
            {/* Timeline Dot Indicator */}
            <div 
              className={`timeline-item-dot ${type.toLowerCase()}`}
              style={{
                borderColor: badge.color
              }}
            />

            {/* Avatar & Activity Content */}
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              {/* Initials Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                {item.user.charAt(0).toUpperCase()}
              </div>

              {/* Text Description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p 
                  style={{ 
                    fontSize: '0.825rem', 
                    margin: '0 0 0.2rem 0', 
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.user}
                  </span>{' '}
                  {item.action}{' '}
                  {item.target && (
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.target}
                    </span>
                  )}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {item.time}
                  </span>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      color: badge.color,
                      background: badge.bg
                    }}
                  >
                    {type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
