'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ContestStatus = 'upcoming' | 'active' | 'ended' | 'practice';

interface Contest {
  id: string;
  slug: string;
  title: string;
  description?: string;
  banner_url?: string;
  start_time: string;
  end_time: string;
  contest_type: string;
  is_featured: boolean;
  practice_mode: boolean;
  status: ContestStatus;
}

const STATUS_CONFIG: Record<ContestStatus, { label: string; color: string; bg: string }> = {
  upcoming: { label: 'Upcoming',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  active:   { label: '🔴 Live',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  ended:    { label: 'Ended',     color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  practice: { label: 'Practice',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
};

function useCountdown(targetTime: string, status: ContestStatus) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (status === 'ended') { setTimeLeft('Ended'); return; }

    const target = new Date(targetTime).getTime();
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTimeLeft(status === 'upcoming' ? 'Starting...' : 'Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTime, status]);

  return timeLeft;
}

function ContestCard({ contest }: { contest: Contest }) {
  const sc = STATUS_CONFIG[contest.status];
  const countdownTarget = contest.status === 'upcoming' ? contest.start_time : contest.end_time;
  const countdown = useCountdown(countdownTarget, contest.status);

  return (
    <Link
      href={`/contests/${contest.slug}`}
      className="card animate-slide-in"
      style={{
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
        borderColor: contest.status === 'active' ? 'rgba(34,197,94,0.3)' : undefined,
        boxShadow: contest.status === 'active' ? '0 0 24px rgba(34,197,94,0.08)' : undefined,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(108,99,255,0.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = contest.status === 'active' ? '0 0 24px rgba(34,197,94,0.08)' : '';
      }}
    >
      {/* Featured badge */}
      {contest.is_featured && (
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.65rem', fontWeight: 800, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '99px', padding: '0.15rem 0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ⭐ Featured
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Contest type badge */}
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          🏆
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1rem', fontWeight: 700 }}>{contest.title}</h3>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '99px', background: sc.bg, color: sc.color, border: `1px solid ${sc.color}40`, flexShrink: 0 }}>
              {sc.label}
            </span>
          </div>
          {contest.description && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contest.description}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '0 0 0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>{new Date(contest.start_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '0 0 0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>{new Date(contest.end_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '0 0 0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>{contest.contest_type}</p>
          </div>
        </div>

        {countdown && contest.status !== 'ended' && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '0 0 0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {contest.status === 'upcoming' ? 'Starts in' : 'Ends in'}
            </p>
            <p style={{ fontSize: '0.95rem', fontWeight: 800, color: contest.status === 'active' ? '#22c55e' : 'var(--text-primary)', margin: 0, fontFamily: 'monospace' }}>
              {countdown}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ContestStatus | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contests');
      const json = await res.json();
      setContests(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const live     = contests.filter(c => c.status === 'active');
  const upcoming = contests.filter(c => c.status === 'upcoming');
  const filtered = filter === 'all' ? contests : contests.filter(c => c.status === filter);

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '860px' }}>

        {/* Header */}
        <div className="page-header animate-fade-in">
          <p className="eyebrow">🏆 Contests</p>
          <h1>Coding <span className="gradient-text">Competitions</span></h1>
          <p>Participate in our internal coding contests. Solve algorithmic problems, climb the leaderboard, and earn points.</p>
        </div>

        {/* Live banner */}
        {live.length > 0 && (
          <div className="card animate-slide-in" style={{ marginBottom: '2rem', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              <div>
                <p style={{ color: '#22c55e', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>
                  🔴 {live.length} contest{live.length > 1 ? 's' : ''} running right now!
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: 0 }}>
                  Join immediately to compete.
                </p>
              </div>
              <Link href={`/contests/${live[0].slug}`} className="btn btn-success btn-sm" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                Join Now →
              </Link>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="filter-tabs">
            {([
              { key: 'all',      label: `All (${contests.length})` },
              { key: 'active',   label: `🔴 Live (${live.length})` },
              { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
              { key: 'ended',    label: 'Ended' },
              { key: 'practice', label: 'Practice' },
            ] as { key: typeof filter; label: string }[]).map(f => (
              <button key={f.key} className={`filter-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contest list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🏆</span>
            <h3>No contests found</h3>
            <p>Check back soon — new contests are added regularly.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map((c, i) => (
              <div key={c.id} style={{ animationDelay: `${i * 50}ms` }}>
                <ContestCard contest={c} />
              </div>
            ))}
          </div>
        )}

        {/* How points work */}
        <div className="card" style={{ marginTop: '2.5rem', background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.15)' }}>
          <h4 style={{ color: 'var(--accent-1)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>💡 How Contest Points Work</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {[
              { icon: '✅', title: 'Solve problems', desc: 'Earn base points per problem' },
              { icon: '⚡', title: 'Solve faster', desc: 'Less penalty = higher rank' },
              { icon: '🥇', title: 'Rank high', desc: 'Top 3 earn bonus rank points' },
              { icon: '📈', title: 'Points added', desc: '80% of points → leaderboard' },
            ].map(item => (
              <div key={item.title} style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: '1.2rem', margin: '0 0 0.3rem' }}>{item.icon}</p>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 0.2rem' }}>{item.title}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
