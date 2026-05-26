'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser, LeaderboardEntry, Question, Contest } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [userLb, setUserLb] = useState<LeaderboardEntry | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [todayQuestion, setTodayQuestion] = useState<Question | null>(null);
  const [isTodayQotdSolved, setIsTodayQotdSolved] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    async function loadDashboard() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        router.push('/login');
        return;
      }

      const userId = sessionData.session.user.id;
      
      // 1. Fetch user profile
      const { data: profile } = await supabase.from('users').select('*').eq('id', userId).single();
      if (profile) {
        const userData = profile as unknown as AppUser;
        if (['super_admin', 'team'].includes(userData.role)) {
          router.push('/admin');
          return;
        }
        setUser(userData);
      }

      // 2. Fetch leaderboard rank & specific entry for accurate total points breakdown
      const { data: lb } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_points', { ascending: false });
      if (lb) {
        const entries = lb as unknown as LeaderboardEntry[];
        const idx = entries.findIndex((e: LeaderboardEntry) => e.id === userId);
        if (idx !== -1) {
          setRank(idx + 1);
          setUserLb(entries[idx]);
        }
      }

      // 3. Fetch today's QotD
      const today = new Date().toISOString().split('T')[0];
      const { data: calendar } = await supabase
        .from('qotd_calendar')
        .select('question_id, questions(*)')
        .eq('date', today)
        .eq('is_active', true)
        .single();
      
      if (calendar?.questions) {
        const todayQ = calendar.questions as unknown as Question;
        setTodayQuestion(todayQ);

        // Check if user has already solved today's QotD
        const { data: todaySubs } = await supabase
          .from('user_qotd_submissions')
          .select('passed_tests, total_tests')
          .eq('user_id', userId)
          .eq('question_id', todayQ.id);

        if (todaySubs) {
          const solved = todaySubs.some(s => s.total_tests && s.total_tests > 0 && s.passed_tests === s.total_tests);
          setIsTodayQotdSolved(solved);
        }
      }

      // 4. Count completed learning resources
      const { count } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', true);
      setCompletedCount(count || 0);

      // 5. Fetch recent submissions
      const { data: subsData } = await supabase
        .from('user_qotd_submissions')
        .select('id, submitted_at, language, passed_tests, total_tests, points_earned, question_id, questions(title)')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(3);
      if (subsData) {
        setRecentSubmissions(subsData);
      }

      // 6. Fetch active/upcoming contests
      const { data: contestsData } = await supabase
        .from('contests')
        .select('*')
        .in('status', ['active', 'upcoming'])
        .order('start_date', { ascending: true })
        .limit(2);
      if (contestsData) {
        setActiveContests(contestsData as unknown as Contest[]);
      }

      setLoading(false);
    }
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  // Formatting helpers
  function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  function formatRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  }

  function formatContestDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateString;
    }
  }

  const totalPoints = userLb?.total_points ?? user?.platform_points ?? 0;
  const breakDownText = userLb 
    ? `CP: ${userLb.platform_points} | QotD: ${userLb.qotd_points} | Contest: ${userLb.contest_points}`
    : 'Platform stats only';

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Greeting Section */}
        <div className="page-header animate-fade-in" style={{ marginBottom: '2rem' }}>
          <p className="eyebrow">Good {getGreeting()}</p>
          <h1>
            Welcome back, <span className="gradient-text">{user?.username || 'Coder'}</span> 👋
          </h1>
          <p>Here's your coding activity at a glance.</p>
        </div>

        {/* Stats Row */}
        <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
          {[
            { 
              label: 'Global Rank', 
              value: rank ? `#${rank}` : '—', 
              icon: '🏆', 
              link: '/leaderboard', 
              subtext: 'View live standings' 
            },
            { 
              label: 'Total Points', 
              value: totalPoints, 
              icon: '⭐', 
              link: `/profile/${user?.username}`, 
              subtext: breakDownText 
            },
            { 
              label: 'Resources Completed', 
              value: completedCount, 
              icon: '📚', 
              link: '/learn', 
              subtext: 'Master DSA & Web Dev' 
            },
            { 
              label: 'Batch ID', 
              value: user?.batch_id || '—', 
              icon: '🎓', 
              link: `/profile/${user?.username}`, 
              subtext: 'Linked profile details' 
            },
          ].map(({ label, value, icon, link, subtext }) => (
            <Link href={link} key={label} className="stat-box animate-slide-in" style={{ textDecoration: 'none', display: 'block', transition: 'var(--transition)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{icon}</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9' }}>{value}</div>
              <div className="stat-label" style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{label}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{subtext}</div>
            </Link>
          ))}
        </div>

        <div className="grid-2" style={{ gap: '2rem' }}>
          {/* COLUMN 1: Challenge & Activity */}
          <div className="flex-col gap-6">
            
            {/* Today's Question of the Day (QotD) */}
            <div 
              className="card animate-slide-in" 
              style={{ 
                border: isTodayQotdSolved ? '1px solid rgba(34, 211, 160, 0.4)' : '1px solid rgba(108,99,255,0.3)',
                background: isTodayQotdSolved ? 'rgba(34, 211, 160, 0.02)' : 'var(--color-surface)',
                boxShadow: isTodayQotdSolved ? '0 0 15px rgba(34, 211, 160, 0.03)' : 'none'
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                <h3 className="flex items-center gap-2">
                  <span>💡</span> Question of the Day
                </h3>
                {todayQuestion && (
                  <div className="flex gap-2 items-center">
                    {isTodayQotdSolved && (
                      <span className="badge badge-success" style={{ textTransform: 'uppercase', background: 'rgba(34, 211, 160, 0.15)', color: 'var(--color-success)', border: '1px solid rgba(34,211,160,0.3)' }}>
                        ✓ Solved
                      </span>
                    )}
                    <span className={`badge badge-${todayQuestion.difficulty.toLowerCase()}`}>
                      {todayQuestion.difficulty}
                    </span>
                  </div>
                )}
              </div>

              {todayQuestion ? (
                <>
                  <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                    {todayQuestion.title}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }}>
                    {todayQuestion.description}
                  </p>
                  <Link 
                    href="/qotd" 
                    className={`btn ${isTodayQotdSolved ? 'btn-secondary' : 'btn-primary'}`} 
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {isTodayQotdSolved ? 'View Question & IDE ✓' : 'Solve Now — Earn 10 pts 🚀'}
                  </Link>
                </>
              ) : (
                <div className="empty-state text-center" style={{ padding: '2rem 0' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
                  <p style={{ fontSize: '0.9rem', color: '#64748b' }}>No question scheduled for today yet.</p>
                </div>
              )}
            </div>

            {/* Recent Submissions */}
            <div className="card animate-slide-in">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🧑‍💻</span> Recent Submissions
              </h3>
              {recentSubmissions.length > 0 ? (
                <div className="flex-col gap-3">
                  {recentSubmissions.map((sub) => {
                    const isPassed = sub.passed_tests === sub.total_tests && sub.total_tests > 0;
                    return (
                      <div 
                        key={sub.id} 
                        className="flex items-center justify-between" 
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'var(--color-bg-2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1, marginRight: '1rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sub.questions?.title || `Question #${sub.question_id}`}
                          </div>
                          <div className="flex gap-2 items-center" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                            <span style={{ textTransform: 'uppercase', color: 'var(--accent-3)', fontWeight: 600 }}>{sub.language}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(sub.submitted_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span 
                            className="badge" 
                            style={{ 
                              fontSize: '0.75rem',
                              background: isPassed ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                              color: isPassed ? 'var(--color-success)' : 'var(--color-error)',
                              border: isPassed ? '1px solid rgba(34,211,160,0.2)' : '1px solid rgba(248,113,113,0.2)'
                            }}
                          >
                            {sub.passed_tests}/{sub.total_tests} Tests
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isPassed ? 'var(--color-success)' : '#94a3b8' }}>
                            +{sub.points_earned} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state text-center" style={{ padding: '2rem 0' }}>
                  <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>You haven't submitted any solutions yet.</p>
                  <Link href="/qotd" className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}>
                    Solve first challenge
                  </Link>
                </div>
              )}
            </div>

          </div>

          {/* COLUMN 2: Contests & Shortcuts */}
          <div className="flex-col gap-6">

            {/* Live / Upcoming Contests */}
            <div className="card animate-slide-in">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🏆</span> Contests & Events
              </h3>
              {activeContests.length > 0 ? (
                <div className="flex-col gap-3">
                  {activeContests.map((contest) => {
                    const isActive = contest.status === 'active';
                    return (
                      <div 
                        key={contest.id}
                        style={{
                          padding: '1rem',
                          background: 'var(--color-bg-2)',
                          border: isActive ? '1px solid rgba(108, 99, 255, 0.4)' : '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)',
                          position: 'relative',
                        }}
                      >
                        <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                          <span 
                            className="badge animate-pulse-ring" 
                            style={{ 
                              background: isActive ? 'var(--color-error-bg)' : 'rgba(108,99,255,0.1)',
                              color: isActive ? 'var(--color-error)' : 'var(--accent-3)',
                              border: isActive ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(108,99,255,0.2)'
                            }}
                          >
                            {isActive ? '● LIVE NOW' : '📅 Upcoming'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {isActive ? 'Ends soon' : 'Scheduled'}
                          </span>
                        </div>
                        <h4 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                          {contest.title}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                          {contest.description || 'Join our HackerRank contest to earn placement points!'}
                        </p>
                        <div className="flex justify-between items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.625rem', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>Start: {formatContestDate(contest.start_date)}</span>
                          <Link 
                            href={contest.hackerrank_contest_id ? `https://hackerrank.com/${contest.hackerrank_contest_id}` : '/contests'} 
                            target="_blank" 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
                          >
                            {isActive ? 'Enter 🚀' : 'Details'}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state text-center" style={{ padding: '2rem 0' }}>
                  <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📅</span>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No active or upcoming contests currently.</p>
                  <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>Check back later or solve daily challenges!</p>
                </div>
              )}
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="card animate-slide-in">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚡</span> Quick Links
              </h3>
              <div className="flex-col gap-3">
                {[
                  { href: '/ide', label: 'Launch Online IDE', icon: '💻', desc: 'Write & compile in 6 languages' },
                  { href: '/leaderboard', label: 'Global Leaderboard', icon: '📊', desc: 'Compare your score & rank' },
                  { href: '/learn', label: 'Learning Resources', icon: '📚', desc: `${completedCount} modules completed` },
                  { href: `/profile/${user?.username}`, label: 'Manage Profile', icon: '👤', desc: 'Link Codeforces & LeetCode' },
                ].map(({ href, label, icon, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3"
                    style={{
                      padding: '0.875rem 1rem',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#e2e8f0' }}>{label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{desc}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#64748b' }}>→</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

