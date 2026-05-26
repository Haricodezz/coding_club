'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser, LeaderboardEntry, Question } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [todayQuestion, setTodayQuestion] = useState<Question | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
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
      // Fetch user profile
      const { data: profile } = await supabase.from('users').select('*').eq('id', userId).single();
      if (profile) {
        const userData = profile as unknown as AppUser;
        if (['super_admin', 'team'].includes(userData.role)) {
          router.push('/admin');
          return;
        }
        setUser(userData);
      }

      // Fetch leaderboard rank
      const { data: lb } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_points', { ascending: false });
      if (lb) {
        const idx = (lb as unknown as LeaderboardEntry[]).findIndex((e: LeaderboardEntry) => e.id === userId);
        if (idx !== -1) setRank(idx + 1);
      }

      // Fetch today's QotD
      const today = new Date().toISOString().split('T')[0];
      const { data: calendar } = await supabase
        .from('qotd_calendar')
        .select('question_id, questions(*)')
        .eq('date', today)
        .eq('is_active', true)
        .single();
      if (calendar?.questions) setTodayQuestion(calendar.questions as unknown as Question);

      // Count completed resources
      const { count } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', true);
      setCompletedCount(count || 0);

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

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Greeting */}
        <div className="page-header animate-fade-in">
          <p className="eyebrow">Good {getGreeting()}</p>
          <h1>
            Welcome back, <span className="gradient-text">{user?.username || 'Coder'}</span> 👋
          </h1>
          <p>Here's your coding activity at a glance.</p>
        </div>

        {/* Stats Row */}
        <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
          {[
            { label: 'Global Rank', value: rank ? `#${rank}` : '—', icon: '🏆' },
            { label: 'Total Points', value: calculatePoints(user), icon: '⭐' },
            { label: 'Resources Done', value: completedCount, icon: '📚' },
            { label: 'Batch', value: user?.batch_id || '—', icon: '🎓' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="stat-box animate-slide-in">
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
              <div className="stat-value" style={{ fontSize: '1.75rem' }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ gap: '2rem' }}>
          {/* Today's QotD */}
          <div className="card" style={{ border: '1px solid rgba(108,99,255,0.3)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
              <h3>💡 Question of the Day</h3>
              {todayQuestion && (
                <span className={`badge badge-${todayQuestion.difficulty.toLowerCase()}`}>
                  {todayQuestion.difficulty}
                </span>
              )}
            </div>
            {todayQuestion ? (
              <>
                <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '1rem' }}>
                  {todayQuestion.title}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {todayQuestion.description}
                </p>
                <Link href="/qotd" className="btn btn-primary" style={{ width: '100%' }}>
                  Solve Now — Earn 10 pts 🚀
                </Link>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '2rem 0' }}>
                <span className="empty-state-icon">📭</span>
                <p>No question scheduled for today yet.</p>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>⚡ Quick Actions</h3>
            <div className="flex-col gap-3">
              {[
                { href: '/ide', label: 'Open IDE', icon: '💻', desc: 'Write & run code in 6 languages' },
                { href: '/leaderboard', label: 'View Leaderboard', icon: '📊', desc: 'See where you rank globally' },
                { href: '/learn', label: 'Learning Resources', icon: '📚', desc: `${completedCount} resources completed` },
                { href: `/profile/${user?.username}`, label: 'My Profile', icon: '👤', desc: 'Manage linked platforms' },
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
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{desc}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: '#64748b' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function calculatePoints(user: AppUser | null): number | string {
  if (!user) return '—';
  return user.platform_points || 0;
}
