'use client';

import { useEffect, useState } from 'react';
import { getLeaderboardAdmin, refreshLeaderboardAdmin } from '../actions';
import type { LeaderboardEntry } from '@/types';

export default function AdminLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      const data = await getLeaderboardAdmin();
      setLeaderboard(data as unknown as LeaderboardEntry[]);
      setLoading(false);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setMessage(null);
    try {
      await refreshLeaderboardAdmin();
      setMessage({ text: 'Leaderboard materialized view refreshed successfully!', type: 'success' });
      await loadLeaderboard();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-leaderboard">
      <div className="page-header animate-fade-in flex justify-between items-center">
        <div>
          <p className="eyebrow">🏆 Rankings</p>
          <h1>Platform <span className="gradient-text">Leaderboard</span></h1>
          <p>View current rankings and manually refresh the materialized view.</p>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={refreshing} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Force Refresh Data'}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div className="card glass">
        <h3 style={{ marginBottom: '1rem' }}>Top Students ({leaderboard.length})</h3>
        
        {leaderboard.length === 0 ? (
          <p style={{ color: '#64748b' }}>No leaderboard data found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-surface-3)' }}>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Rank</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Student</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Batch</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>QotD</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>Contests</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>Platform</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--accent)', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, index) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>#{index + 1}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar_url || '/avatars/avatar_0.svg'} 
                          alt="avatar" 
                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                          onError={(e) => (e.currentTarget.src = '/avatars/avatar_0.svg')}
                        />
                        <span style={{ color: 'var(--text-primary)' }}>{user.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-tertiary)' }}>{user.batch_id || '-'}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>{user.qotd_points}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>{user.contest_points}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>{user.platform_points}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--accent)', fontWeight: 'bold', textAlign: 'right' }}>{user.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
