'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { KPIBar } from '@/components/admin/ui/KPIBar';
import { ActivityFeed } from '@/components/admin/ui/ActivityFeed';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = getSupabase();
      
      const [
        { count: blogs },
        { count: announcements },
        { count: events },
        { count: users },
        { data: latestUsers }
      ] = await Promise.all([
        supabase.from('cms_blogs').select('*', { count: 'exact', head: true }),
        supabase.from('cms_announcements').select('*', { count: 'exact', head: true }),
        supabase.from('cms_events').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('id, username, created_at').order('created_at', { ascending: false }).limit(6),
      ]);

      setMetrics({
        blogs: blogs || 0,
        announcements: announcements || 0,
        events: events || 0,
        users: users || 0
      });

      if (latestUsers) {
        setRecentUsers(latestUsers.map(u => ({
          id: u.id,
          action: 'registered on platform',
          target: '',
          user: u.username,
          time: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A',
          icon: '👤'
        })));
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner" style={{ width: '24px', height: '24px' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <KPIBar 
        metrics={[
          { label: 'Active Users', value: metrics?.users || 0, trend: '12% MoM', positive: true },
          { label: 'Published Blogs', value: metrics?.blogs || 0, trend: '3 new', positive: true },
          { label: 'Active Events', value: metrics?.events || 0 },
          { label: 'Pending Reviews', value: 2, trend: 'Needs action', positive: false },
        ]} 
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column - Main Workflow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-3)' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Moderation Queue</h3>
              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', borderRadius: '12px', fontWeight: 600 }}>2 Pending</span>
            </div>
            <div style={{ padding: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Blog: Introduction to Next.js App Router</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Submitted by rahul_dev • 2 hours ago</div>
                </div>
                <button style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Review</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Account Flag: Suspicious Activity</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>System triggered on user_992 • 5 hours ago</div>
                </div>
                <button style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Review</button>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-3)' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Audit Log</h3>
            </div>
            <div style={{ padding: '0 1.25rem' }}>
              <ActivityFeed items={recentUsers} />
            </div>
          </div>
        </div>

        {/* Right Column - Context & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '0.5rem' }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {['New Announcement', 'Create Event', 'Manage Homepage'].map(action => (
                <button key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  <span>{action}</span>
                  <span style={{ opacity: 0.5 }}>→</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>System Health</div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Database</span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>12ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Auth API</span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>45ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Edge Network</span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>100%</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
