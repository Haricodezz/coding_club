'use client';

import { useState, useEffect, useCallback } from 'react';

interface MonitorStats {
  totalParticipants: number;
  totalSubmissions: number;
  submissionsPerMin: number;
  judgeHealth: string;
  recentLogs: any[];
}

export default function ContestMonitor({ contestId }: { contestId: string }) {
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/contests/${contestId}/monitor`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) {
    return <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Active Participants</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{stats?.totalParticipants || 0}</p>
        </div>
        
        <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Submissions / Min</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{stats?.submissionsPerMin || 0}</p>
            {(stats?.submissionsPerMin || 0) > 20 && <span style={{ padding: '0.15rem 0.5rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700, borderRadius: '4px' }}>HIGH LOAD</span>}
          </div>
        </div>

        <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Judge Health</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: stats?.judgeHealth === 'Healthy' ? '#22c55e' : stats?.judgeHealth === 'Warning' ? '#f59e0b' : '#ef4444' }} />
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: stats?.judgeHealth === 'Healthy' ? '#22c55e' : stats?.judgeHealth === 'Warning' ? '#f59e0b' : '#ef4444', margin: 0 }}>
              {stats?.judgeHealth || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Judge Logs */}
      <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1rem' }}>Judge System Logs</h3>
        {(!stats?.recentLogs || stats.recentLogs.length === 0) ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No recent judge errors.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.recentLogs.map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--color-bg)', borderRadius: '6px', borderLeft: `3px solid ${log.level === 'ERROR' ? '#ef4444' : '#f59e0b'}` }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
