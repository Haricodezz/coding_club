'use client';

import Link from 'next/link';

interface AnnouncementBannerProps {
  announcements?: any[];
}

export function AnnouncementBanner({ announcements = [] }: AnnouncementBannerProps) {
  if (!announcements || announcements.length === 0) return null;

  // We take the latest 3 announcements for the marquee
  const latestAnnouncements = announcements.slice(0, 3);

  // We duplicate the items to make the infinite scroll smooth
  const marqueeItems = [...latestAnnouncements, ...latestAnnouncements, ...latestAnnouncements];

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(108,99,255,0.15) 0%, rgba(236,72,153,0.1) 100%)',
        borderTop: '1px solid rgba(108, 99, 255, 0.25)',
        borderBottom: '1px solid rgba(108, 99, 255, 0.25)',
        padding: '0.65rem 0',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Marquee Ticker */}
      <div className="marquee-container" style={{ flex: 1, marginRight: '1rem' }}>
        <div className="marquee-content">
          {marqueeItems.map((item, idx) => (
            <div key={`${item.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                📢 {item.type?.toUpperCase() || 'NOTICE'}
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{item.title}:</span>
              
              {item.link_url ? (
                <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                  {item.content}
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.content}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* View All Button */}
      <div style={{ paddingRight: '1rem', flexShrink: 0 }}>
        <Link href="/announcements" className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
          View All Notices →
        </Link>
      </div>
    </div>
  );
}
