import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedGridBg } from '@/components/ui/AnimatedGridBg';

export const metadata = {
  title: 'Events — Coding Club',
  description: 'Upcoming hackathons, workshops, and coding events.',
};

export default async function PublicEventsPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: events } = await supabase
    .from('cms_events')
    .select('*')
    .eq('is_published', true)
    .order('event_date', { ascending: true });

  const eventList: any[] = events || [];

  return (
    <div className="page-wrapper" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <AnimatedGridBg />

      <div className="container" style={{ position: 'relative', zIndex: 10, padding: '4rem 0 6rem' }}>
        
        {/* Header */}
        <div className="page-header text-center" style={{ marginBottom: '4rem' }}>
          <p className="eyebrow">📅 Coding Club Events</p>
          <h1 style={{ fontSize: '3rem' }}>Upcoming <span className="gradient-text">Activities</span></h1>
          <p style={{ maxWidth: '600px', margin: '0 auto' }}>
            Join our workshops, hackathons, and guest lectures to stay ahead of the curve.
          </p>
        </div>

        {/* Events Grid */}
        {eventList.length === 0 ? (
          <div className="text-center" style={{ padding: '4rem' }}>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No events scheduled at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="grid-3" style={{ gap: '2rem' }}>
            {eventList.map((event, idx) => (
              <GlassCard
                key={event.id}
                delay={idx * 100}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  background: 'var(--color-surface-2)'
                }}
              >
                {/* Optional image thumbnail */}
                {event.thumbnail_url && (
                  <div style={{ height: '180px', width: '100%', overflow: 'hidden', position: 'relative', borderBottom: '1px solid var(--color-border)', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
                    <img
                      src={event.thumbnail_url}
                      alt={event.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}

                    />
                  </div>
                )}
                
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="flex gap-1 wrap" style={{ marginBottom: '0.75rem' }}>
                    <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>
                      {new Date(event.event_date).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                    <span className="badge badge-easy" style={{ fontSize: '0.65rem' }}>
                      {event.location || 'Online'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {event.title}
                  </h3>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1 }}>
                    {event.description}
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {event.registration_link ? (
                      <a href={event.registration_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                        Register Now
                      </a>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} disabled>
                        No Registration Required
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
