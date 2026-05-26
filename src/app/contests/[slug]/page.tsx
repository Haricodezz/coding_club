'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import ContestJoinCard from '@/components/contest/ContestJoinCard';

type Tab = 'problems' | 'leaderboard' | 'submissions' | 'announcements';

interface Contest {
  id: string; slug: string; title: string; description?: string;
  banner_url?: string; start_time: string; end_time: string;
  contest_type: string; rules?: string; is_published: boolean;
  practice_mode: boolean; status: string;
}

interface Problem {
  id: string; slug: string; title: string; difficulty: string;
  points: number; label: string; tags?: string[];
}

interface LeaderboardEntry {
  rank: number; score: number; penalty_minutes: number;
  solved_count: number; solved_problems: any[];
  users: { display_name: string; username: string; avatar_url?: string };
}

interface Submission {
  id: string; language: string; verdict: string; runtime_ms: number;
  submitted_at: string;
  contest_problems: { slug: string; title: string };
}

const DIFF_COLOR: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };
const VERDICT_COLOR: Record<string, string> = {
  AC: '#22c55e', WA: '#ef4444', TLE: '#f59e0b', RE: '#f97316', CE: '#a855f7', JUDGE_ERROR: '#64748b',
};

function useContestTimer(contest: Contest | null) {
  const [display, setDisplay] = useState('');
  const [phase, setPhase] = useState<'pre' | 'active' | 'ended'>('pre');

  useEffect(() => {
    if (!contest) return;
    const update = () => {
      const now = Date.now();
      const start = new Date(contest.start_time).getTime();
      const end = new Date(contest.end_time).getTime();
      if (now < start) {
        const diff = start - now;
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        setDisplay(`Starts in ${h}h ${m}m ${s}s`); setPhase('pre');
      } else if (now <= end) {
        const diff = end - now;
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        setDisplay(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`); setPhase('active');
      } else {
        setDisplay('Contest Ended'); setPhase('ended');
      }
    };
    update(); const id = setInterval(update, 1000); return () => clearInterval(id);
  }, [contest]);

  return { display, phase };
}

export default function ContestArenaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('problems');
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);
  const [lbFrozen, setLbFrozen] = useState(false);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());

  const { display: timerDisplay, phase: timerPhase } = useContestTimer(contest);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contestRes, joinedRes] = await Promise.all([
        fetch(`/api/v1/contests/${slug}/problems`),
        fetch(`/api/v1/contests/${slug}/join`),
      ]);
      if (contestRes.ok) {
        const cd = await contestRes.json();
        setContest(cd.contest);
        setProblems(cd.problems || []);
      }
      if (joinedRes.ok) {
        const jd = await joinedRes.json();
        setJoined(jd.joined);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadLeaderboard = useCallback(async () => {
    const res = await fetch(`/api/v1/contests/${slug}/leaderboard`);
    if (res.ok) {
      const d = await res.json();
      setLeaderboard(d.leaderboard || []);
      setLbFrozen(d.frozen || false);
    }
  }, [slug]);

  const loadSubmissions = useCallback(async () => {
    const res = await fetch(`/api/v1/contests/${slug}/submissions`);
    if (res.ok) {
      const d = await res.json();
      setSubmissions(d.submissions || []);
      const solved = new Set<string>(d.submissions.filter((s: Submission) => s.verdict === 'AC').map((s: Submission) => s.contest_problems?.slug));
      setSolvedSet(solved);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'submissions') loadSubmissions();
  }, [tab, loadLeaderboard, loadSubmissions]);

  // Auto-refresh leaderboard every 30s
  useEffect(() => {
    if (tab !== 'leaderboard') return;
    const id = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(id);
  }, [tab, loadLeaderboard]);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await fetch(`/api/v1/contests/${slug}/join`, { method: 'POST' });
      if (res.ok) { setJoined(true); }
      else { const d = await res.json(); alert(d.error); }
    } finally { setJoining(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(108,99,255,0.2)', borderTopColor: 'var(--accent-1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading contest...</p>
      </div>
    </div>
  );

  if (!contest) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontSize: '3rem' }}>🏆</p>
      <h2 style={{ color: '#f1f5f9' }}>Contest not found</h2>
      <Link href="/contests" style={{ color: 'var(--accent-1)', textDecoration: 'none' }}>← All contests</Link>
    </div>
  );

  if (joined === false) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 1.5rem', height: '3.5rem', flexShrink: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <Link href="/contests" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>← Back to Contests</Link>
        </div>
        <ContestJoinCard contest={contest} onJoin={handleJoin} participantCount={leaderboard.length || 0} />
      </div>
    );
  }

  const timerColor = timerPhase === 'active'
    ? (timerDisplay.startsWith('0h') || !timerDisplay.includes('h') ? (timerDisplay.startsWith('10m') ? '#f59e0b' : '#22c55e') : '#22c55e')
    : timerPhase === 'ended' ? '#64748b' : '#60a5fa';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: '3.5rem', flexShrink: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <Link href="/contests" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.8rem', flexShrink: 0 }}>← Contests</Link>
          <div style={{ width: '1px', height: '16px', background: 'var(--color-border)', flexShrink: 0 }} />
          <h1 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contest.title}</h1>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '99px', background: 'rgba(108,99,255,0.12)', color: 'var(--accent-1)', border: '1px solid rgba(108,99,255,0.25)', flexShrink: 0 }}>{contest.contest_type}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          {/* Timer */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {timerPhase === 'pre' ? 'Starts' : timerPhase === 'active' ? 'Time Left' : 'Status'}
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: timerColor, margin: 0, fontFamily: 'monospace', lineHeight: 1.2 }}>{timerDisplay}</p>
          </div>

          {/* Join / joined */}
          {joined === false && timerPhase !== 'ended' && (
            <button onClick={handleJoin} disabled={joining} style={{ padding: '0.45rem 1rem', borderRadius: '7px', border: 'none', background: 'var(--accent-1)', color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: joining ? 'not-allowed' : 'pointer', transition: 'filter 0.15s' }}>
              {joining ? 'Joining...' : 'Join Contest'}
            </button>
          )}
          {joined === true && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e', padding: '0.3rem 0.75rem', borderRadius: '99px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>✓ Joined</span>
          )}
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0, padding: '0 1.5rem' }}>
        {([
          { key: 'problems',      label: `📋 Problems (${problems.length})` },
          { key: 'leaderboard',   label: `🏅 Leaderboard${lbFrozen ? ' 🔒' : ''}` },
          { key: 'submissions',   label: `📤 My Submissions` },
          { key: 'announcements', label: `📢 Announcements${announcements.length > 0 ? ` (${announcements.length})` : ''}` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '0.6rem 0.85rem', border: 'none', background: 'transparent',
            color: tab === t.key ? 'var(--accent-1)' : 'var(--color-text-muted)',
            fontWeight: tab === t.key ? 700 : 400, fontSize: '0.8rem', cursor: 'pointer',
            borderBottom: tab === t.key ? '2px solid var(--accent-1)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

        {/* PROBLEMS TAB */}
        {tab === 'problems' && (
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {!joined && (
              <div style={{ padding: '1.25rem', borderRadius: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div>
                  <p style={{ color: '#f59e0b', fontWeight: 700, margin: 0, fontSize: '0.85rem' }}>Join the contest to submit solutions</p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: 0 }}>You can view problem statements but cannot submit until you join.</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {problems.map(p => {
                const solved = solvedSet.has(p.slug);
                return (
                  <Link key={p.id} href={`/contests/${slug}/problem/${p.slug}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none',
                      padding: '1rem 1.25rem', borderRadius: '10px',
                      background: solved ? 'rgba(34,197,94,0.05)' : 'var(--color-surface)',
                      border: `1px solid ${solved ? 'rgba(34,197,94,0.25)' : 'var(--color-border)'}`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,99,255,0.35)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = solved ? 'rgba(34,197,94,0.25)' : 'var(--color-border)')}
                  >
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent-1)', fontFamily: 'monospace', flexShrink: 0 }}>{p.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#f1f5f9', fontWeight: 600, margin: 0, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                      {p.tags && p.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem' }}>
                          {p.tags.slice(0, 3).map(tag => <span key={tag} style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{tag}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: DIFF_COLOR[p.difficulty] || '#f59e0b' }}>{p.difficulty}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-1)', fontWeight: 700 }}>{p.points}pt</span>
                      {solved && <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>✓</span>}
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === 'leaderboard' && (
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            {lbFrozen && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔒</span>
                <p style={{ color: '#a855f7', fontWeight: 600, margin: 0, fontSize: '0.82rem' }}>Leaderboard is frozen — final submissions are hidden until contest ends.</p>
              </div>
            )}

            {leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏅</p>
                <p>No submissions yet. Be the first!</p>
              </div>
            ) : (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 100px 80px', padding: '0.65rem 1rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                  {['#', 'Participant', 'Score', 'Penalty', 'Solved'].map(h => (
                    <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                  ))}
                </div>

                {leaderboard.map((entry, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '48px 1fr 100px 100px 80px',
                    padding: '0.75rem 1rem', alignItems: 'center',
                    borderBottom: i < leaderboard.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background: i < 3 ? `rgba(${['255,215,0', '192,192,192', '205,127,50'][i]}, 0.04)` : 'transparent',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = i < 3 ? `rgba(${['255,215,0', '192,192,192', '205,127,50'][i]}, 0.04)` : 'transparent')}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--color-text-muted)' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : entry.rank}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                      {entry.users.avatar_url
                        ? <img src={entry.users.avatar_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} />
                        : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{(entry.users.display_name || entry.users.username || '?')[0].toUpperCase()}</div>
                      }
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.users.display_name || entry.users.username}</span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace' }}>{entry.score}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{entry.penalty_minutes}m</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-1)' }}>{entry.solved_count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBMISSIONS TAB */}
        {tab === 'submissions' && (
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📤</p>
                <p>No submissions yet. Start solving!</p>
              </div>
            ) : (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 100px', padding: '0.65rem 1rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Problem', 'Verdict', 'Lang', 'Runtime', 'Time'].map(h => (
                    <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                  ))}
                </div>
                {submissions.map((sub, i) => (
                  <div key={sub.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 100px',
                    padding: '0.7rem 1rem', alignItems: 'center',
                    borderBottom: i < submissions.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <span style={{ fontSize: '0.82rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.contest_problems?.title}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: VERDICT_COLOR[sub.verdict] || '#64748b' }}>{sub.verdict}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{sub.language}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{sub.runtime_ms ? `${sub.runtime_ms}ms` : '—'}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{new Date(sub.submitted_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {tab === 'announcements' && (
          <div style={{ maxWidth: '620px', margin: '0 auto' }}>
            {announcements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📢</p>
                <p>No announcements yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {announcements.map(a => (
                  <div key={a.id} style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <p style={{ fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.4rem' }}>{a.title}</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>{a.body}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0 }}>{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
