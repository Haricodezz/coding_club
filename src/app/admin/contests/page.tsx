'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ContestStatus = 'upcoming' | 'active' | 'ended' | 'practice';

interface Contest {
  id: string;
  slug: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  contest_type: string;
  is_published: boolean;
  is_featured: boolean;
  status: ContestStatus;
  problem_count: number;
  participant_count: number;
}

const STATUS_CONFIG: Record<ContestStatus | string, { label: string; color: string; bg: string }> = {
  upcoming: { label: 'Upcoming',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  active:   { label: '🔴 Live',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  ended:    { label: 'Ended',     color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  practice: { label: 'Practice',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/contests');
      if (res.ok) { const d = await res.json(); setContests(d.data || []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function togglePublish(contest: Contest) {
    await fetch('/api/admin/contests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: contest.id, is_published: !contest.is_published }),
    });
    load();
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/contests/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem', fontWeight: 700 }}>Admin CMS</p>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Contest Management</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.4rem 0 0' }}>Create and manage coding competitions.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/question-bank" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            📚 Question Bank
          </Link>
          <Link href="/admin/contests/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            + New Contest
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: contests.length, color: 'var(--accent-1)' },
          { label: 'Live', value: contests.filter(c => c.status === 'active').length, color: '#22c55e' },
          { label: 'Upcoming', value: contests.filter(c => c.status === 'upcoming').length, color: '#60a5fa' },
          { label: 'Published', value: contests.filter(c => c.is_published).length, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem', fontWeight: 700 }}>{stat.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Contest list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '10px' }} />)}
        </div>
      ) : contests.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🏆</span>
          <h3>No contests yet</h3>
          <p>Create your first contest to get started.</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">+ Create Contest</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {contests.map(c => {
            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.ended;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: '10px', background: 'var(--color-surface)', border: `1px solid ${c.status === 'active' ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`, transition: 'border-color 0.2s' }}>
                
                {/* Status indicator */}
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.color, flexShrink: 0, boxShadow: c.status === 'active' ? `0 0 6px ${sc.color}` : 'none' }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.12rem 0.5rem', borderRadius: '99px', background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.label}</span>
                    {!c.is_published && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.12rem 0.5rem', borderRadius: '99px', background: 'rgba(100,116,139,0.15)', color: '#64748b', flexShrink: 0 }}>Draft</span>}
                    {c.is_featured && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.12rem 0.5rem', borderRadius: '99px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', flexShrink: 0 }}>⭐ Featured</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>📋 {c.problem_count} problems</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>👥 {c.participant_count} participants</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>📅 {new Date(c.start_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>🏷️ {c.contest_type}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => togglePublish(c)}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: c.is_published ? '#22c55e' : 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {c.is_published ? '✓ Live' : 'Publish'}
                  </button>
                  <Link href={`/admin/contests/${c.id}`}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(108,99,255,0.3)', background: 'rgba(108,99,255,0.08)', color: 'var(--accent-1)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    Edit →
                  </Link>
                  <button onClick={() => handleDelete(c.id, c.title)}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
