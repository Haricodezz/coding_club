'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser, LeaderboardEntry, Question, Contest } from '@/types';
import PreviewBanner from '@/components/admin/PreviewBanner';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { QuickStatsWidget } from '@/components/dashboard/QuickStatsWidget';
import { CarouselQotD } from '@/components/dashboard/CarouselQotD';
import { ContestsWidget } from '@/components/dashboard/ContestsWidget';
import { RecentSubmissionsWidget } from '@/components/dashboard/RecentSubmissionsWidget';
import { QuickLinksWidget } from '@/components/dashboard/QuickLinksWidget';

const MOTIVATIONAL_SUBTEXTS = [
  'Keep pushing — every line of code counts. 💻',
  'Consistency beats talent. Keep solving! ⚡',
  'One problem at a time. You\'re doing great! 🚀',
  'The best time to practice is right now. 🔥',
  'Small steps compound into big achievements. 🏆',
  'Debug your code, debug your limits. 🧠',
];

function RotatingSubtext() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % MOTIVATIONAL_SUBTEXTS.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
      color: '#64748b',
      fontSize: '0.95rem',
      minHeight: '1.5em',
    }}>
      {MOTIVATIONAL_SUBTEXTS[idx]}
    </p>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [userLb, setUserLb] = useState<LeaderboardEntry | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [qotdQuestions, setQotdQuestions] = useState<(Question & { isSolved?: boolean, dateLabel?: string })[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [allContests, setAllContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [stats, setStats] = useState({ winRate: 0, accuracy: 0, trend: 0, streak: 0, nextMilestone: 7 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const flag = localStorage.getItem('adminPreviewMode');
      if (flag === 'true') setIsPreviewMode(true);
    }
  }, []);

  function exitPreviewMode() {
    localStorage.removeItem('adminPreviewMode');
    setIsPreviewMode(false);
    router.push('/admin');
  }

  useEffect(() => {
    const supabase = getSupabase();
    async function loadDashboard() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        router.push('/login');
        return;
      }

      const userId = sessionData.session.user.id;
      
      const { data: profile } = await supabase.from('users').select('*').eq('id', userId).single();
      if (profile) {
        const userData = profile as unknown as AppUser;
        if (['super_admin', 'team'].includes(userData.role)) {
          router.push('/admin');
          return;
        }
        setUser(userData);
      }

      const { data: lb } = await (supabase as any).from('leaderboard').select('*').order('total_points', { ascending: false });
      if (lb) {
        const entries = lb as unknown as LeaderboardEntry[];
        const idx = entries.findIndex(e => e.id === userId);
        if (idx !== -1) { setRank(idx + 1); setUserLb(entries[idx]); }
      }

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const { data: calendar } = await (supabase as any)
        .from('qotd_calendar')
        .select('date, question_bank(*)')
        .in('date', [today, yesterday])
        .eq('is_active', true);
      
      if (calendar && calendar.length > 0) {
        const questionsArr = [];
        for (const c of calendar) {
          const q = (c.question_bank || c.questions) as unknown as Question;
          if (!q) continue;
          const { data: subs } = await supabase.from('user_qotd_submissions')
            .select('passed_tests, total_tests')
            .eq('user_id', userId)
            .eq('question_id', q.id);
          
          const isSolved = subs?.some(s => (s.total_tests ?? 0) > 0 && s.passed_tests === s.total_tests) || false;
          questionsArr.push({ ...q, isSolved, dateLabel: c.date === today ? 'Today' : 'Yesterday' });
        }
        setQotdQuestions(questionsArr.sort((a, b) => b.dateLabel === 'Today' ? 1 : -1));
      }

      const { count } = await (supabase as any).from('user_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true);
      setCompletedCount(count || 0);

      const { data: subsData } = await supabase
        .from('user_qotd_submissions')
        .select('id, submitted_at, language, passed_tests, total_tests, points_earned, question_id, questions(title)')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(10);
      if (subsData) setRecentSubmissions(subsData);

      const { data: contestsData } = await supabase.from('contests').select('*').order('start_date', { ascending: false });
      if (contestsData) setAllContests(contestsData as unknown as Contest[]);

      // Fetch real analytics & streaks
      const { data: analytics } = await (supabase as any).from('user_performance_analytics').select('*').eq('user_id', userId).single();
      const { data: streakData } = await (supabase as any).from('streaks').select('*').eq('user_id', userId).single();
      
      setStats({
        winRate: analytics?.win_rate || 0,
        accuracy: analytics?.accuracy || 0,
        trend: analytics?.improvement_trend || 0,
        streak: streakData?.current_streak || 0,
        nextMilestone: streakData?.next_milestone || 7
      });

      setLoading(false);
    }
    loadDashboard();
  }, [router]);

  function getGreeting(): { label: string; emoji: string } {
    const h = new Date().getHours();
    if (h >= 5 && h < 12)  return { label: 'Good Morning',   emoji: '☀️' };
    if (h >= 12 && h < 17) return { label: 'Good Afternoon', emoji: '🌤️' };
    if (h >= 17 && h < 21) return { label: 'Good Evening',   emoji: '🌆' };
    return                         { label: 'Good Night',     emoji: '🌙' };
  }

  const totalPoints = userLb?.total_points ?? user?.platform_points ?? 0;

  if (loading) {
    return (
      <div className="page-wrapper" style={{ paddingTop: 'calc(var(--navbar-height) + 2rem)' }}>
        <div className="container">
          <div className="flex-col gap-6">
            <div className="flex items-center justify-between">
              <SkeletonText lines={2} lastLineWidth="300px" />
              <Skeleton style={{ width: '120px', height: '120px', borderRadius: '50%' }} />
            </div>
            <div className="grid-4">
              <Skeleton style={{ height: '100px' }} /><Skeleton style={{ height: '100px' }} /><Skeleton style={{ height: '100px' }} /><Skeleton style={{ height: '100px' }} />
            </div>
            <div className="grid-2">
              <Skeleton style={{ height: '400px' }} /><Skeleton style={{ height: '400px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ paddingTop: isPreviewMode ? 'calc(var(--navbar-height) + 44px)' : undefined }}>
      {isPreviewMode && <PreviewBanner onExit={exitPreviewMode} />}
      <div className="container">
        
        {/* Dynamic Welcome Section */}
        <div className="flex justify-between items-end animate-fade-in" style={{ marginBottom: '2rem' }}>
          <div>
            <p className="eyebrow" style={{ color: 'var(--accent)' }}>{getGreeting().emoji} {getGreeting().label}</p>
            <h1 style={{ marginBottom: '0.25rem', fontSize: '2.5rem' }}>
              Welcome back, <span className="gradient-text">{user?.username || 'Coder'}</span>
            </h1>
            <RotatingSubtext />
          </div>
          
          <div className="flex items-center gap-3" style={{ background: 'var(--color-surface-2)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <span style={{ fontSize: '1.5rem', animation: 'pulse-ring 2s infinite' }}>🔥</span>
            <div className="flex-col">
              <span style={{ fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.streak} Day Streak</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stats.nextMilestone - stats.streak} more for bonus!</span>
            </div>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
          {[
            { label: 'Global Rank', value: rank ? `#${rank}` : '—', icon: '🏆', link: '/leaderboard', subtext: 'View live standings' },
            { label: 'Total Points', value: totalPoints, icon: '⭐', link: `/profile/${user?.username}`, subtext: 'CP & Challenges' },
            { label: 'Resources Completed', value: completedCount, icon: '📚', link: '/learn', subtext: 'Master DSA & Web Dev' },
            { label: 'Batch ID', value: user?.batch_id || '—', icon: '🎓', link: `/profile/${user?.username}`, subtext: 'Linked profile' },
          ].map(({ label, value, icon, link, subtext }) => (
            <Link href={link} key={label} className="stat-box animate-slide-in" style={{ textDecoration: 'none', display: 'block', transition: 'var(--transition)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{icon}</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
              <div className="stat-label" style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{label}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{subtext}</div>
            </Link>
          ))}
        </div>

        <div className="grid-2" style={{ gap: '2rem' }}>
          {/* Left Column */}
          <div className="flex-col gap-6">
            <QuickStatsWidget winRate={stats.winRate} accuracy={stats.accuracy} trend={stats.trend} />
            <CarouselQotD questions={qotdQuestions} />
            <RecentSubmissionsWidget submissions={recentSubmissions} />
          </div>

          {/* Right Column */}
          <div className="flex-col gap-6">
            <ContestsWidget contests={allContests} />
            <QuickLinksWidget />
          </div>
        </div>
      </div>
    </div>
  );
}

