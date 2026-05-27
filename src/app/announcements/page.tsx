import { AnimatedGridBg } from '@/components/ui/AnimatedGridBg';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Announcements — Coding Club',
  description: 'View all notices, alerts, and system-wide announcements for the Coding Club.',
};

export default async function AnnouncementsPage() {
  let announcements: any[] = [];

  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = await createServerSupabaseClient();

    const { data } = await supabase
      .from('cms_announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    announcements = data || [];
  } catch (err) {
    // Supabase unavailable
  }

  return (
    <div className="page-wrapper">
      <AnimatedGridBg />
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <div className="page-header animate-fade-in text-center" style={{ marginBottom: '4rem' }}>
          <p className="eyebrow">📢 Notice Board</p>
          <h1>All <span className="gradient-text">Announcements</span></h1>
          <p>Stay up to date with the latest news, alerts, and updates from the club.</p>
        </div>

        <div className="flex-col gap-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {announcements.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📭</span>
              <p>No active announcements at the moment.</p>
            </div>
          ) : (
            announcements.map((item, idx) => (
              <div 
                key={item.id} 
                className="card glass animate-slide-in"
                style={{ 
                  animationDelay: `${idx * 0.1}s`,
                  borderLeft: `4px solid ${
                    item.type === 'critical' ? 'var(--color-error)' : 
                    item.type === 'warning' ? 'var(--color-warning)' : 
                    item.type === 'success' ? 'var(--color-success)' : 'var(--color-info)'
                  }`
                }}
              >
                <div className="flex justify-between items-start wrap gap-2">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem' }}>
                    {item.title}
                    <span className="badge" style={{ fontSize: '0.65rem' }}>
                      {item.type.toUpperCase()}
                    </span>
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {new Date(item.created_at).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </span>
                </div>
                
                <p style={{ marginTop: '1rem', color: 'var(--text-tertiary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {item.content}
                </p>

                {item.link_url && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <a 
                      href={item.link_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary btn-sm"
                    >
                      View Details ↗
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
