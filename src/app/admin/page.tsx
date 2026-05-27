'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { KPIBar } from '@/components/admin/ui/KPIBar';
import { ActivityFeed } from '@/components/admin/ui/ActivityFeed';

// Responsive Recharts Imports
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';

// Custom Type Definitions for Robust Compilation
interface BlogItem {
  id: string;
  title: string;
  author: string;
  created_at?: string;
  status: string;
  priority?: 'Urgent' | 'High' | 'Normal';
  author_avatar?: string;
  preview_img?: string;
  reviewer?: string;
  deadline?: string;
  description?: string;
}

interface EventItem {
  id: string;
  title: string;
  date: string;
  participants: number;
  status: 'Active' | 'Upcoming' | 'Ended';
  link: string;
  dayIndex: number; // 0=Sun, 1=Mon...
}

/** Groups real DB rows into chart-friendly weekly/daily buckets */
function buildWeekBuckets(users: any[], submissions: any[]) {
  const now = new Date();

  // Helper: get bucket label for a date
  const getWeekLabel = (d: Date) => {
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue…
    }
    const weekNum = Math.floor(diffDays / 7);
    return `Week -${weekNum}`;
  };

  const buckets: Record<string, { Users: number; Submissions: number }> = {};

  const addToBucket = (label: string, field: 'Users' | 'Submissions') => {
    if (!buckets[label]) buckets[label] = { Users: 0, Submissions: 0 };
    buckets[label][field]++;
  };

  users.forEach((u: any) => {
    if (!u.created_at) return;
    addToBucket(getWeekLabel(new Date(u.created_at)), 'Users');
  });

  submissions.forEach((s: any) => {
    if (!s.created_at) return;
    addToBucket(getWeekLabel(new Date(s.created_at)), 'Submissions');
  });

  // Sort chronologically
  const sorted = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, vals]) => ({ name, ...vals }));

  return sorted.length > 0 ? sorted : [{ name: 'No data', Users: 0, Submissions: 0 }];
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [dbPendingBlogs, setDbPendingBlogs] = useState<BlogItem[]>([]);
  const [dbEvents, setDbEvents] = useState<EventItem[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [trendingTopic, setTrendingTopic] = useState<string>('—');
  const [solveRate, setSolveRate] = useState<string>('—');
  const [contestAttendance, setContestAttendance] = useState<string>('—');
  const [flaggedUsers, setFlaggedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // System health (real latency measured via supabase round-trip)
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Filter & tab controls
  const [moderationTab, setModerationTab] = useState<'All' | 'Pending' | 'Flagged'>('Pending');
  const [activityFilter, setActivityFilter] = useState<'All' | 'Users' | 'Content' | 'Security' | 'System'>('All');
  const [selectedBulk, setSelectedBulk] = useState<string[]>([]);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'year'>('30days');

  // Mobile navigation active tab selection
  const [mobileTab, setMobileTab] = useState<'overview' | 'moderation' | 'analytics' | 'quick'>('overview');
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  // 1. Fetch all real data from the database
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = getSupabase();

        // ── Core counts ──
        const [
          { count: blogsCount },
          { count: announcementsCount },
          { count: eventsCount },
          { count: usersCount },
          { data: latestUsers },
          { data: pendingBlogs },
          { data: eventsData },
          { data: contestsData },
          { data: submissionsData },
          { data: usersWeekData },
        ] = await Promise.all([
          supabase.from('cms_blogs').select('*', { count: 'exact', head: true }),
          supabase.from('cms_announcements').select('*', { count: 'exact', head: true }),
          supabase.from('cms_events').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('id, username, created_at, role').order('created_at', { ascending: false }).limit(10),
          supabase.from('cms_blogs').select('id, title, author_name, author_id, excerpt, created_at').eq('is_published', false).order('created_at', { ascending: false }),
          supabase.from('cms_events').select('id, title, date, status, registration_link').order('date', { ascending: true }).limit(5),
          (supabase as any).from('contests').select('id, title, start_date, end_date, status').order('start_date', { ascending: false }).limit(3),
          (supabase as any).from('contest_submissions').select('id, created_at').order('created_at', { ascending: false }).limit(500),
          supabase.from('users').select('id, created_at').order('created_at', { ascending: false }).limit(500),
        ]);

        setMetrics({
          blogs: blogsCount || 0,
          announcements: announcementsCount || 0,
          events: eventsCount || 0,
          users: usersCount || 0,
        });

        // ── Activity Feed: only real user registrations ──
        if (latestUsers) {
          const mapped = latestUsers.map((u: any) => ({
            id: u.id,
            action: 'registered on platform',
            target: u.role ? `as ${u.role}` : '',
            user: u.username,
            time: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A',
            icon: '👤',
            type: 'Users',
          }));
          setRecentUsers(mapped);
        }

        // ── Pending blog moderation ──
        if (pendingBlogs) {
          const formatted = pendingBlogs.map((b: any) => ({
            id: b.id,
            title: b.title,
            author: b.author_name || 'Unknown',
            created_at: b.created_at,
            status: 'pending',
            priority: 'Normal' as const,
            description: b.excerpt || 'Blog post awaiting review.',
          }));
          setDbPendingBlogs(formatted);
        }

        // ── Real Events ──
        if (eventsData) {
          const mapped: EventItem[] = eventsData.map((e: any, i: number) => {
            const d = new Date(e.date);
            const now = new Date();
            let status: 'Active' | 'Upcoming' | 'Ended' = 'Upcoming';
            if (e.status === 'active' || (d <= now)) status = 'Active';
            if (e.status === 'ended' || e.status === 'completed') status = 'Ended';
            return {
              id: e.id,
              title: e.title,
              date: d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
              participants: 0,
              status,
              link: e.registration_link || '#',
              dayIndex: d.getDay(),
            };
          });
          setDbEvents(mapped);
        }

        // ── Real Chart Data: users & submissions per week bucket ──
        const bucketData = buildWeekBuckets(usersWeekData || [], submissionsData || []);
        setChartData(bucketData);

        // ── Trending topic: most common tag in recent approved blogs ──
        const { data: recentBlogTags } = await supabase
          .from('cms_blogs')
          .select('tags')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(20);
        if (recentBlogTags) {
          const tagFreq: Record<string, number> = {};
          recentBlogTags.forEach((b: any) => {
            const tags: string[] = Array.isArray(b.tags) ? b.tags : [];
            tags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1; });
          });
          const sorted = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]);
          setTrendingTopic(sorted[0] ? `#${sorted[0][0]}` : '—');
        }

        // ── Solve Rate: % submissions with AC verdict ──
        const { data: acData, count: acCount } = await (supabase as any)
          .from('contest_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('verdict', 'AC');
        const { count: totalSubs } = await (supabase as any)
          .from('contest_submissions')
          .select('id', { count: 'exact', head: true });
        if (totalSubs && (totalSubs as number) > 0) {
          const rate = Math.round(((acCount as number || 0) / (totalSubs as number)) * 100);
          setSolveRate(`${rate}%`);
        }

        // ── Contest Attendance: participants in latest contest ──
        if (contestsData && contestsData.length > 0) {
          const latestContest = contestsData[0];
          const { count: participants } = await (supabase as any)
            .from('contest_participants')
            .select('id', { count: 'exact', head: true })
            .eq('contest_id', latestContest.id);
          setContestAttendance(participants ? String(participants) + ' participants' : '—');
        }

      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 2. Real DB latency — measured via actual Supabase round-trip
  useEffect(() => {
    async function measureLatency() {
      try {
        const supabase = getSupabase();
        const t0 = Date.now();
        await supabase.from('users').select('id', { count: 'exact', head: true }).limit(1);
        const ms = Date.now() - t0;
        setDbLatency(ms);
        setLatencyHistory(prev => [...prev.slice(-7), ms]);
      } catch (_) {}
    }
    measureLatency();
    const timer = setInterval(measureLatency, 10000);
    return () => clearInterval(timer);
  }, []);

  // 3. Real moderation data only
  const pendingReviews = dbPendingBlogs;

  const activeModerationQueue = useMemo(() => {
    if (moderationTab === 'Pending') return pendingReviews;
    if (moderationTab === 'Flagged') return flaggedUsers;
    return [...pendingReviews, ...flaggedUsers];
  }, [moderationTab, pendingReviews, flaggedUsers]);

  // Bulk selectors
  const toggleBulk = (id: string) => {
    setSelectedBulk(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkApprove = () => {
    alert(`Bulk approved ${selectedBulk.length} items successfully!`);
    setSelectedBulk([]);
  };

  const handleApproveBlog = async (id: string) => {
    try {
      await fetch(`/api/admin/blogs/${id}/approve`, { method: 'POST' });
      setDbPendingBlogs(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectBlog = async (id: string) => {
    try {
      await fetch(`/api/admin/blogs/${id}/reject`, { method: 'POST' });
      setDbPendingBlogs(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Activity Filtering
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'All') return recentUsers;
    return recentUsers.filter(a => a.type === activityFilter);
  }, [activityFilter, recentUsers]);

  // Pie chart uses real counts from metrics
  const pieData = useMemo(() => [
    { name: 'Blogs', value: metrics?.blogs || 0, color: 'var(--accent-green)' },
    { name: 'Announcements', value: metrics?.announcements || 0, color: 'var(--accent-purple)' },
    { name: 'Events', value: metrics?.events || 0, color: 'var(--accent-amber)' },
  ], [metrics]);

  // Dynamic Audit CSV Export
  const exportToCSV = () => {
    const headers = 'ID,User,Action,Target,Time,Type\n';
    const rows = filteredActivities.map((a: any) => `"${a.id}","${a.user}","${a.action}","${a.target}","${a.time}","${a.type}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AuditLog_${dateRange}_${activityFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className="skeleton-box" style={{ height: '140px', borderRadius: '16px' }} />
        ))}
        <div className="skeleton-box" style={{ gridColumn: 'span 3', height: '400px', borderRadius: '16px', marginTop: '1.5rem' }} />
        <div className="skeleton-box" style={{ height: '400px', borderRadius: '16px', marginTop: '1.5rem' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ────────────────── MOBILE TABS OVERVIEW ────────────────── */}
      <div className="mobile-only-header" style={{ display: 'none' }}>
        <style>{`
          @media (max-width: 768px) {
            .mobile-only-header { display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
            .desktop-workspace { display: grid !important; grid-template-columns: 1fr !important; gap: 1rem !important; }
            .desktop-sidebar-col { display: none !important; }
            .mobile-bottom-tabs-nav { display: flex !important; }
          }
        `}</style>
      </div>

      {/* KPI Stats Top bar (Donezo premium styles) */}
      <KPIBar 
        metrics={[
          { label: 'Total Users', value: metrics?.users || 0, trend: 'Registered students', positive: true },
          { label: 'Published Blogs', value: metrics?.blogs || 0, trend: `${pendingReviews.length} pending review`, positive: true },
          { label: 'Active Events', value: metrics?.events || 0, trend: 'Total events', positive: true },
          { label: 'Pending Reviews', value: pendingReviews.length, trend: pendingReviews.length > 0 ? 'Action needed' : 'All clear', positive: pendingReviews.length === 0 },
        ]} 
      />

      {/* Core Center Workspace Grid Layout */}
      <div className="desktop-workspace" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Main dashboard console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', minWidth: 0 }}>
          
          {/* Section: Data Visualizations (Growth Charts & Heatmaps) */}
          <div className="donezo-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Performance & Analytics</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Platform active metrics over selected duration</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.2rem' }}>
                {(['7days', '30days', 'year'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    style={{
                      background: dateRange === range ? 'var(--accent-green)' : 'transparent',
                      border: 'none',
                      color: dateRange === range ? '#000' : 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {range === '7days' ? '7D' : range === '30days' ? '30D' : '1Y'}
                  </button>
                ))}
              </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', minHeight: '260px' }}>
              <div style={{ minHeight: '260px', width: '100%' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>User growth & Submission activity</span>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
                    <Area type="monotone" dataKey="Users" stroke="var(--accent-green)" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                    <Area type="monotone" dataKey="Submissions" stroke="var(--accent-purple)" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Content distribution pie chart */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textAlign: 'center' }}>Content share</span>
                <div style={{ width: '100%', height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legends */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                  {pieData.map((entry: any) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Moderation Queue Overhaul */}
          <div className="donezo-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Moderation Center</h3>
                  <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', borderRadius: '4px', fontWeight: 700 }}>Action Required</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Validate blog drafts and flagged user profiles</span>
              </div>

              {/* Bulk actions trigger */}
              {selectedBulk.length > 0 && (
                <button
                  onClick={handleBulkApprove}
                  style={{
                    background: 'var(--accent-green)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.4rem 0.85rem',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  ✅ Approve Selected ({selectedBulk.length})
                </button>
              )}
            </div>

            {/* Queue Filter Tabs */}
            <div className="moderation-tabs">
              {(['All', 'Pending', 'Flagged'] as const).map(tab => (
                <button
                  key={tab}
                  className={`moderation-tab-btn ${moderationTab === tab ? 'active' : ''}`}
                  onClick={() => setModerationTab(tab)}
                >
                  <span>{tab === 'All' ? '📂' : tab === 'Pending' ? '⏳' : '🚩'}</span>
                  <span>{tab === 'All' ? `All (${pendingReviews.length + flaggedUsers.length})` : tab === 'Pending' ? `Pending (${pendingReviews.length})` : `Flagged (${flaggedUsers.length})`}</span>
                </button>
              ))}
            </div>

            {/* Moderation Card List */}
            {activeModerationQueue.length === 0 ? (
              /* Fireart Empty State: trophy icon + encouraging text */
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '3.5rem 1.5rem', 
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '12px',
                  border: '1px dashed var(--color-border)'
                }}
              >
                <span style={{ fontSize: '3rem', marginBottom: '0.5rem', display: 'block' }}>🏆</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-green)', margin: '0 0 0.25rem 0' }}>Great! No pending reviews</h4>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-tertiary)', margin: 0, maxWidth: '280px' }}>Your review queue is fully resolved. Keep up the amazing work!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeModerationQueue.map((item: any) => {
                  const isChecked = selectedBulk.includes(item.id);
                  const isFlag = item.status === 'flagged';
                  
                  return (
                    <div 
                      key={item.id} 
                      className="moderation-item-card"
                      style={{
                        borderLeft: `4px solid ${isFlag ? 'var(--accent-rose)' : item.priority === 'Urgent' ? 'var(--accent-amber)' : 'var(--color-border)'}`
                      }}
                    >
                      {/* Bulk Select checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBulk(item.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-green)' }}
                      />

                      {/* Content Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                          <span 
                            style={{ 
                              fontSize: '0.625rem', 
                              fontWeight: 700, 
                              padding: '0.1rem 0.35rem', 
                              borderRadius: '4px',
                              background: isFlag ? 'rgba(239, 68, 68, 0.1)' : item.priority === 'Urgent' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                              color: isFlag ? 'var(--accent-rose)' : item.priority === 'Urgent' ? 'var(--accent-amber)' : 'var(--text-secondary)'
                            }}
                          >
                            {isFlag ? 'FLAGGED' : item.priority || 'Normal'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          Submitted by <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.author}</span> • {item.deadline || '2h ago'}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.5rem 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.description}
                        </p>
                      </div>

                      {/* Action Triggers */}
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleApproveBlog(item.id)}
                          style={{ background: 'rgba(0, 200, 83, 0.1)', border: 'none', color: 'var(--accent-green)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectBlog(item.id)}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--accent-rose)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Expandable Pending Reviews list */}
          <div className="donezo-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Expandable Review Logs</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '1.25rem' }}>Detailed article previews and submission deadlines</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingReviews.map(review => {
                const isExpanded = !!expandedReviews[review.id];
                return (
                  <div 
                    key={review.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {/* Header trigger */}
                    <div 
                      onClick={() => setExpandedReviews(prev => ({ ...prev, [review.id]: !isExpanded }))}
                      style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{review.preview_img || '📄'}</span>
                        <div>
                          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>{review.title}</div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>By {review.author} • status: <span style={{ color: 'var(--accent-amber)' }}>{review.status}</span></div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Expandable Preview Body */}
                    {isExpanded && (
                      <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0.75rem 0' }}>
                          {review.description}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>Assigned Reviewer: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{review.reviewer || 'N/A'}</span></div>
                          <div>Deadline Indicator: <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>{review.deadline}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Timeline activity feed (Audit Log) */}
          <div className="donezo-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Timeline Audit Log</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Comprehensive administrative system activity trail</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={exportToCSV}
                  title="Export timeline logs as CSV"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.75rem',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  📤 Export CSV
                </button>
              </div>
            </div>

            {/* Filter tags for audit feed */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              {(['All', 'Users', 'Content', 'Security', 'System'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setActivityFilter(filter)}
                  style={{
                    background: activityFilter === filter ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid',
                    borderColor: activityFilter === filter ? 'var(--accent-purple)' : 'var(--color-border)',
                    color: activityFilter === filter ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* ActivityFeed timeline */}
            <ActivityFeed items={filteredActivities} />
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar Floating Quick Actions & Health metrics */}
        <div className="desktop-sidebar-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Quick Actions Actions Panel */}
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>Quick Actions Panel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <button 
                onClick={() => router.push('/admin/announcements')}
                className="donezo-action-button"
              >
                <span>📢</span>
                <span style={{ flex: 1 }}>New Announcement</span>
                <span style={{ opacity: 0.5 }}>→</span>
              </button>
              <button 
                onClick={() => router.push('/admin/events')}
                className="donezo-action-button"
              >
                <span>📅</span>
                <span style={{ flex: 1 }}>Create Event</span>
                <span style={{ opacity: 0.5 }}>→</span>
              </button>
              <button 
                onClick={() => router.push('/admin/homepage-sections')}
                className="donezo-action-button"
              >
                <span>🏠</span>
                <span style={{ flex: 1 }}>Manage Homepage</span>
                <span style={{ opacity: 0.5 }}>→</span>
              </button>
            </div>
          </div>

          {/* Trending & Engagement — real data */}
          <div className="donezo-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Trending & Engagement</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Top Blog Tag</span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{trendingTopic}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Submission Solve Rate</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{solveRate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Latest Contest</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{contestAttendance}</span>
              </div>
            </div>
          </div>

          {/* System Health — real measured DB latency */}
          <div className="donezo-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>System Health</h3>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Warn at 50ms, Critical at 100ms</span>
              </div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (dbLatency ?? 0) > 100 ? '#ef4444' : (dbLatency ?? 0) > 50 ? 'var(--accent-amber)' : 'var(--accent-green)' }}></div>
            </div>

            {/* Real DB latency ring */}
            <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div className="circular-indicator-container">
                <svg width="60" height="60" className="circular-progress-svg">
                  <circle cx="30" cy="30" r="24" stroke="rgba(255,255,255,0.04)" strokeWidth="4" fill="transparent" />
                  <circle cx="30" cy="30" r="24"
                    stroke={(dbLatency ?? 0) > 100 ? '#ef4444' : (dbLatency ?? 0) > 50 ? 'var(--accent-amber)' : 'var(--accent-green)'}
                    strokeWidth="4" fill="transparent"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min((dbLatency ?? 0), 200) / 200)}
                  />
                </svg>
                <div className="circular-center-label">
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{dbLatency !== null ? `${dbLatency}ms` : '…'}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>DB Ping</span>
                </div>
              </div>

              {/* Sparkline */}
              {latencyHistory.length > 0 && (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '24px', width: '100%', padding: '0 0.5rem' }}>
                  {latencyHistory.map((val, idx) => (
                    <div key={idx} style={{ flex: 1, borderRadius: '2px', background: val > 100 ? '#ef4444' : val > 50 ? 'var(--accent-amber)' : 'var(--accent-green)', height: `${Math.min(Math.round((val / 200) * 24), 24)}px` }} />
                  ))}
                </div>
              )}
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Last {latencyHistory.length} measurements</span>
            </div>
          </div>

          {/* Active Events Widget — real DB events */}
          <div className="donezo-card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Active Events</h3>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.75rem' }}>Current schedule from database</span>

            {dbEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No events found in database.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {dbEvents.map(event => (
                  <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{event.date}</div>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px', background: event.status === 'Active' ? 'rgba(0,200,83,0.1)' : event.status === 'Ended' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)', color: event.status === 'Active' ? 'var(--accent-green)' : event.status === 'Ended' ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Weekly calendar grid using real event days */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>Weekly Calendar Grid</span>
              <div className="donezo-calendar-grid">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                  const hasEvent = dbEvents.some(e => e.dayIndex === idx);
                  return (
                    <div key={idx} className={`calendar-day-cell ${hasEvent ? 'active-event' : ''}`} title={hasEvent ? 'Event scheduled' : 'No events'}>
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User management direct access quick link */}
          <div className="donezo-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>User Administration</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0 0 0.75rem 0' }}>Manage student user rosters, import spreadsheets, and handle restriction limits.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => router.push('/admin/users')}
                style={{ flex: 1, background: 'var(--accent-purple)', border: 'none', color: '#FFF', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Manage Users
              </button>
              <button 
                onClick={() => router.push('/admin/users')}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                View All
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ────────────────── MOBILE BOTTOM TABS & FAB MENU ────────────────── */}
      <div 
        className="mobile-bottom-tabs-nav"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '60px',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 9999
        }}
      >
        <button 
          onClick={() => { setMobileTab('overview'); window.scrollTo(0,0); }}
          className={`mobile-nav-tab ${mobileTab === 'overview' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', color: mobileTab === 'overview' ? 'var(--accent-green)' : 'var(--text-muted)' }}
        >
          <span style={{ fontSize: '1.25rem' }}>📊</span>
          <span style={{ fontSize: '0.6rem', marginTop: '2px' }}>Overview</span>
        </button>
        <button 
          onClick={() => { setMobileTab('moderation'); window.scrollTo(0,0); }}
          className={`mobile-nav-tab ${mobileTab === 'moderation' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', color: mobileTab === 'moderation' ? 'var(--accent-green)' : 'var(--text-muted)' }}
        >
          <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          <span style={{ fontSize: '0.6rem', marginTop: '2px' }}>Moderation</span>
        </button>
        <button 
          onClick={() => { setMobileTab('analytics'); window.scrollTo(0,0); }}
          className={`mobile-nav-tab ${mobileTab === 'analytics' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', color: mobileTab === 'analytics' ? 'var(--accent-green)' : 'var(--text-muted)' }}
        >
          <span style={{ fontSize: '1.25rem' }}>📈</span>
          <span style={{ fontSize: '0.6rem', marginTop: '2px' }}>Analytics</span>
        </button>
      </div>

      {/* Floating Action Button for Mobile quick menu */}
      <button 
        onClick={() => setMobileActionsOpen(!mobileActionsOpen)}
        className="donezo-fab mobile-only"
        style={{ display: 'none', border: 'none' }}
      >
        <span>+</span>
      </button>

      {mobileActionsOpen && (
        <div 
          style={{
            position: 'fixed',
            bottom: '150px',
            right: '20px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-hover)',
            borderRadius: '12px',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            zIndex: 99999,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <button onClick={() => { setMobileActionsOpen(false); router.push('/admin/announcements'); }} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '0.75rem', padding: '0.5rem' }}>📢 Announcement</button>
          <button onClick={() => { setMobileActionsOpen(false); router.push('/admin/events'); }} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '0.75rem', padding: '0.5rem' }}>📅 Event</button>
        </div>
      )}

      {/* Inject custom animations for complete styles */}
      <style>{`
        @keyframes donezo-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
        @media (max-width: 768px) {
          .mobile-only { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
