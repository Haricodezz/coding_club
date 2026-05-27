'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';
import { 
  Trophy, Search, Filter, RefreshCw, ArrowUpDown, ChevronLeft, ChevronRight, 
  UserCheck, Calendar, Award, Zap, BarChart2, Users, Flame, Info, CheckCircle2, 
  ExternalLink, Sparkles, Share2, Eye, X, BookOpen, AlertCircle, RefreshCcw
} from 'lucide-react';

type PlatformFilter = 'overall' | 'leetcode' | 'weekly_leetcode' | 'internal' | 'contest';

interface LeaderboardUser {
  id: string;
  username: string;
  full_name?: string;
  email: string;
  roll_number?: string;
  avatar_url?: string;
  role: string;
  branch?: string;
  academic_year?: number;
  total_points: number;
  lc_points: number;
  lc_easy_solved: number;
  lc_medium_solved: number;
  lc_hard_solved: number;
  lc_total_solved: number;
  lc_last_synced_at?: string;
  current_streak: number;
  longest_streak: number;
  problems_solved: number;
  rank: number;
  trend: number;
  weekly_credits?: number;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Curated sample data fallback removed. Leaderboard displays real database metrics only.

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardUser[]>([]);
  const [meta, setMeta] = useState<any>({ branchCounts: {}, yearCounts: {}, tabCounts: {} });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Logged-in User Session Context
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  
  // Filters
  const [platform, setPlatform] = useState<PlatformFilter>('overall');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting States
  const [sortBy, setSortBy] = useState<'rank' | 'points' | 'streak' | 'solved'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Search History
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Accordion toggle
  const [showStatsAccordion, setShowStatsAccordion] = useState(false);
  
  // Compare Modal
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareFriend, setCompareFriend] = useState<LeaderboardUser | null>(null);
  const [compareQuery, setCompareQuery] = useState('');
  
  // Share Card Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUser, setShareUser] = useState<LeaderboardUser | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const userRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Weekly selector
  const [selectedWeeklyRange, setSelectedWeeklyRange] = useState('Last 7 Days');

  // Load Session Profile & Smart Defaults
  useEffect(() => {
    async function loadSession() {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (data) {
            setCurrentUserProfile(data as AppUser);
            // Apply Smart Defaults: Pre-select current year and student's branch
            if (data.branch) setBranchFilter(data.branch);
            if (data.academic_year) setYearFilter(String(data.academic_year));
          }
        }
      } catch (err) {
        console.error('Failed to load session profile', err);
      }
    }
    loadSession();

    // Load Recent Searches
    const saved = localStorage.getItem('cc_recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Fetch Leaderboard entries from API
  async function fetchLeaderboard(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setSyncing(true);
    try {
      const res = await fetch(`/api/leaderboard?platform=${platform}`);
      const json = await res.json();
      
      if (json.data) {
        setEntries(json.data);
      } else {
        setEntries([]);
      }

      if (json.meta) {
        setMeta(json.meta);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setEntries([]); // Fallback to empty list on error
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchLeaderboard();
  }, [platform]);

  // Periodic Auto-refresh (5 Minutes)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLeaderboard(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [platform]);

  // Handle Search Input & History
  const handleSearchSubmit = (queryText: string) => {
    if (!queryText.trim()) return;
    const filtered = recentSearches.filter(q => q.toLowerCase() !== queryText.toLowerCase());
    const updated = [queryText, ...filtered].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('cc_recent_searches', JSON.stringify(updated));
    setSearchQuery(queryText);
    setCurrentPage(1);
  };

  const removeSearchHistory = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(q => q !== tag);
    setRecentSearches(updated);
    localStorage.setItem('cc_recent_searches', JSON.stringify(updated));
  };

  // Check if an email is institutional/verified
  const isVerifiedStudent = (entry: LeaderboardUser) => {
    if (entry.roll_number) return true;
    const domain = entry.email?.split('@')?.[1];
    return domain?.endsWith('.edu') || domain?.endsWith('.ac.in') || domain?.includes('college');
  };

  // Reset Filters helper
  const handleResetFilters = () => {
    setYearFilter('all');
    setBranchFilter('all');
    setSearchQuery('');
    setSortBy('rank');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  // Apply visual Confetti celebration on high score milestones (Points >= 1000 or Rank 1-3)
  useEffect(() => {
    if (entries.length > 0 && currentUserProfile) {
      const myRow = entries.find(e => e.id === currentUserProfile.id);
      if (myRow && (myRow.total_points >= 1000 || myRow.rank <= 3)) {
        // Trigger CSS Confetti Rain
        triggerConfettiRain();
      }
    }
  }, [entries, currentUserProfile]);

  function triggerConfettiRain() {
    if (typeof window === 'undefined') return;
    const containerId = 'confetti-container';
    if (document.getElementById(containerId)) return; // Prevent double trigger
    
    const container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    const colors = ['#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#10B981', '#EC4899'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.style.position = 'absolute';
      piece.style.width = Math.random() * 8 + 6 + 'px';
      piece.style.height = Math.random() * 15 + 6 + 'px';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.top = '-20px';
      piece.style.borderRadius = '3px';
      piece.style.opacity = (Math.random() * 0.7 + 0.3).toString();
      
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 1.5;
      piece.style.transition = `transform ${duration}s linear, top ${duration}s linear, opacity ${duration}s ease-out`;
      piece.style.transitionDelay = `${delay}s`;
      
      container.appendChild(piece);
      
      setTimeout(() => {
        piece.style.top = '105vh';
        piece.style.transform = `rotate(${Math.random() * 720}deg) translateX(${Math.random() * 80 - 40}px)`;
        piece.style.opacity = '0';
      }, 100);
    }
    
    setTimeout(() => {
      container.remove();
    }, 6000);
  }

  // Local Processing: Search, Multi-Filter, Multi-Sort
  const processedEntries = useMemo(() => {
    let result = [...entries];

    // 1. Apply Year Filter
    if (yearFilter !== 'all') {
      result = result.filter(e => String(e.academic_year) === yearFilter);
    }

    // 2. Apply Branch Filter
    if (branchFilter !== 'all') {
      result = result.filter(e => e.branch?.toLowerCase() === branchFilter.toLowerCase());
    }

    // 3. Apply Search (ByName or ByRollNumber or ByUsername)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.username?.toLowerCase().includes(q) ||
        e.full_name?.toLowerCase().includes(q) ||
        e.roll_number?.toLowerCase().includes(q)
      );
    }

    // 4. Apply Multi-Sort
    result.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortBy === 'rank') {
        valA = a.rank;
        valB = b.rank;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortBy === 'points') {
        valA = platform === 'weekly_leetcode' ? (a.weekly_credits || 0) : a.total_points;
        valB = platform === 'weekly_leetcode' ? (b.weekly_credits || 0) : b.total_points;
      } else if (sortBy === 'streak') {
        valA = a.current_streak;
        valB = b.current_streak;
      } else if (sortBy === 'solved') {
        valA = a.problems_solved;
        valB = b.problems_solved;
      }

      return sortOrder === 'desc' ? valA - valB : valB - valA;
    });

    return result;
  }, [entries, yearFilter, branchFilter, searchQuery, sortBy, sortOrder, platform]);

  // Pagination Logic
  const totalEntriesCount = processedEntries.length;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedEntries.slice(start, start + pageSize);
  }, [processedEntries, currentPage, pageSize]);

  const totalPages = Math.ceil(totalEntriesCount / pageSize) || 1;

  // Podium (Top 3 overall in current view)
  const podiumEntries = useMemo(() => {
    if (searchQuery || yearFilter !== 'all' || branchFilter !== 'all') {
      return []; // Disable podium during search/dense filter for better list reading
    }
    return processedEntries.slice(0, 3);
  }, [processedEntries, searchQuery, yearFilter, branchFilter]);

  // Logged-in User Position Metrics
  const myPositionMetrics = useMemo(() => {
    if (!currentUserProfile || entries.length === 0) return null;
    const index = entries.findIndex(e => e.id === currentUserProfile.id);
    if (index === -1) return null;
    const myRow = entries[index];
    const totalUsers = entries.length;
    const percentile = Math.round(((totalUsers - myRow.rank) / totalUsers) * 100);
    return {
      rank: myRow.rank,
      points: platform === 'weekly_leetcode' ? (myRow.weekly_credits || 0) : myRow.total_points,
      percentile,
      totalUsers,
      user: myRow
    };
  }, [currentUserProfile, entries, platform]);

  // Handle Scroll to Position
  const handleViewMyPosition = () => {
    if (myPositionMetrics?.user) {
      // Switch filters to default so the user is guaranteed to be in the list
      handleResetFilters();
      
      setTimeout(() => {
        const rowElement = userRowRefs.current[myPositionMetrics.user.id];
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          rowElement.classList.add('neon-pulse-gold');
          setTimeout(() => {
            rowElement.classList.remove('neon-pulse-gold');
          }, 3000);
        }
      }, 300);
    }
  };

  // Toggle dynamic sorting on header click
  const handleSortChange = (metric: 'rank' | 'points' | 'streak' | 'solved') => {
    if (sortBy === metric) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(metric);
      setSortOrder('desc'); // Default to high-to-low for points/streak
    }
    setCurrentPage(1);
  };

  // Search filter list for Compare Mode
  const compareFriendList = useMemo(() => {
    if (!compareQuery.trim()) return [];
    return entries.filter(e => 
      e.id !== currentUserProfile?.id && 
      (e.full_name?.toLowerCase().includes(compareQuery.toLowerCase()) || 
       e.username?.toLowerCase().includes(compareQuery.toLowerCase()))
    ).slice(0, 5);
  }, [entries, compareQuery, currentUserProfile]);

  // Draw Share Achievement on HTML Canvas
  useEffect(() => {
    if (isShareModalOpen && shareUser && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Enable premium high-dpi scale
      canvas.width = 600;
      canvas.height = 420;

      // Background Gradient (Coding Club brand style: Dark Slate to Deep Purple)
      const grad = ctx.createLinearGradient(0, 0, 600, 420);
      grad.addColorStop(0, '#0F172A'); // Slate-900
      grad.addColorStop(1, '#1E1B4B'); // Purple-950
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 420);

      // Cyber Grid Accent Drawing
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 600; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 420); ctx.stroke();
      }
      for (let j = 0; j < 420; j += 30) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(600, j); ctx.stroke();
      }

      // Border glow
      ctx.strokeStyle = '#6366F1'; // Accent
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 580, 400);

      // Gold Glow if Top 3
      if (shareUser.rank <= 3) {
        ctx.strokeStyle = '#F59E0B'; // Gold
        ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, 576, 396);
      }

      // Title header
      ctx.fillStyle = '#6366F1';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('⚡ CODING CLUB CERTIFICATE', 40, 50);

      // Main Trophy Icon drawing or placeholder
      ctx.fillStyle = shareUser.rank <= 3 ? '#F59E0B' : '#E2E8F0';
      ctx.font = '64px sans-serif';
      ctx.fillText('🏆', 40, 140);

      // Student Rank details
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(shareUser.full_name || shareUser.username, 140, 100);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '16px sans-serif';
      ctx.fillText(`@${shareUser.username}`, 140, 125);
      
      if (shareUser.branch) {
        ctx.fillStyle = '#818CF8';
        ctx.font = 'semibold 13px sans-serif';
        ctx.fillText(`${shareUser.branch} Student • Year ${shareUser.academic_year || '—'}`, 140, 150);
      }

      // Draw Rank Badge block
      const badgeY = 200;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.fillRect(40, badgeY, 520, 120);
      ctx.strokeRect(40, badgeY, 520, 120);

      // Rank display
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(`#${shareUser.rank}`, 70, badgeY + 80);
      
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.fillText('GLOBAL RANK', 70, badgeY + 35);

      // Stats points column
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 36px sans-serif';
      const ptsText = platform === 'weekly_leetcode' ? `${shareUser.weekly_credits || 0}` : `${shareUser.total_points}`;
      ctx.fillText(ptsText, 250, badgeY + 80);
      
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.fillText(platform === 'weekly_leetcode' ? 'WEEKLY CREDITS' : 'TOTAL POINTS', 250, badgeY + 35);

      // Stats streak column
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(`${shareUser.current_streak} days`, 420, badgeY + 80);
      
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.fillText('ACTIVE STREAK', 420, badgeY + 35);

      // Footer watermarks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '11px sans-serif';
      ctx.fillText('verify at codingclub.college.edu', 40, 390);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('CodingClub', 500, 390);
    }
  }, [isShareModalOpen, shareUser, platform]);

  const handleDownloadShareImage = () => {
    if (!canvasRef.current || !shareUser) return;
    const link = document.createElement('a');
    link.download = `${shareUser.username}_leaderboard_rank_${shareUser.rank}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCopyShareImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          alert('Shareable certificate image copied to clipboard! 🚀');
        }
      });
    } catch (err) {
      console.error('Failed to copy image', err);
      alert('Could not copy image to clipboard automatically. Please download it using the download button.');
    }
  };

  // Computed distributions and lists
  const branchList = Object.keys(meta.branchCounts || {});
  const yearList = Object.keys(meta.yearCounts || {});

  // Dynamic header explanations depending on active category
  const activeMetricsExplanation = {
    overall: 'Ranked by: Total Points (LeetCode syncs + QotD + Contests × 0.8)',
    leetcode: 'Ranked by: LeetCode points earned from linked profile challenges',
    weekly_leetcode: `Ranked by: LeetCode points accumulated during ${selectedWeeklyRange}`,
    internal: 'Ranked by: Internal Coding Club Question of the Day & special milestones',
    contest: 'Ranked by: Official Contest achievements and penalty-weighted speed calculations'
  };

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: '6rem' }}>
      
      {/* Confetti styles injected */}
      <style jsx global>{`
        @keyframes border-glow-hologram {
          0% { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 10px rgba(99, 102, 241, 0.2); }
          50% { border-color: rgba(236, 72, 153, 0.6); box-shadow: 0 0 20px rgba(236, 72, 153, 0.4); }
          100% { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 10px rgba(99, 102, 241, 0.2); }
        }
        .top-tier-glow {
          animation: border-glow-hologram 4s infinite ease-in-out;
          border-width: 2px !important;
        }
        .neon-pulse-gold {
          animation: gold-pulse-anim 1.5s 2 ease-in-out;
        }
        @keyframes gold-pulse-anim {
          0% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.1); }
          100% { box-shadow: 0 0 0 15px rgba(245, 158, 11, 0); background: transparent; }
        }
      `}</style>

      <div className="container" style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
        
        {/* Dynamic Incentives Banner */}
        <div 
          className="animate-fade-in flex items-center justify-between gap-4" 
          style={{ 
            background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.5rem',
            marginBottom: '2rem'
          }}
        >
          <div className="flex items-center gap-3">
            <div style={{ background: 'rgba(139, 92, 246, 0.3)', padding: '0.5rem', borderRadius: '50%' }}>
              <Award size={20} color="#F59E0B" />
            </div>
            <div>
              <h5 style={{ margin: 0, fontWeight: 700, color: '#FFFFFF' }}>🎁 Monthly Rewards Program Active!</h5>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8' }}>
                Top 10 users this month receive exclusive Coding Club stickers, personalized digital certificates, and a highlighted profile.
              </p>
            </div>
          </div>
          <Link href="/practice" className="btn btn-primary btn-sm flex items-center gap-1" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            <Sparkles size={14} /> Start Solving
          </Link>
        </div>

        {/* Header */}
        <div className="page-header text-center animate-fade-in" style={{ marginBottom: '2.5rem' }}>
          <p className="eyebrow flex items-center justify-center gap-1">
            <Trophy size={16} color="var(--accent)" /> Global Club Rankings
          </p>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0' }}>
            The <span className="gradient-text">Leaderboard</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: 600, margin: '0 auto' }}>
            Real-time developer statistics. Earn points automatically from LeetCode syncs, QotD solves, and contest penalties.
          </p>
          
          {/* Last Updated tag */}
          <div className="flex items-center justify-center gap-2 mt-3" style={{ fontSize: '0.75rem', color: '#64748B' }}>
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            <span>Last calculated: {lastUpdated.toLocaleTimeString()} ({syncing ? 'Updating live...' : 'Auto-refreshes every 5m'})</span>
            <button 
              onClick={() => fetchLeaderboard(true)} 
              className="btn btn-ghost btn-sm" 
              style={{ padding: '0.1rem 0.3rem', height: 'auto', fontSize: '0.7rem' }}
              disabled={syncing}
            >
              Sync Now
            </button>
          </div>
        </div>

        {/* Dynamic Category Tabs */}
        <div className="filter-tabs flex wrap justify-center gap-2 mb-6" style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '0.4rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {[
            { id: 'overall', name: 'Overall', count: meta.tabCounts?.overall },
            { id: 'leetcode', name: 'LeetCode', count: meta.tabCounts?.leetcode },
            { id: 'weekly_leetcode', name: 'Weekly LeetCode', count: meta.tabCounts?.weekly_leetcode },
            { id: 'internal', name: 'Internal QotD', count: meta.tabCounts?.internal },
            { id: 'contest', name: 'Contests', count: meta.tabCounts?.contest }
          ].map(tab => (
            <button
              key={tab.id}
              className={`filter-tab flex items-center gap-2 ${platform === tab.id ? 'active' : ''}`}
              onClick={() => {
                setPlatform(tab.id as PlatformFilter);
                setCurrentPage(1);
              }}
              style={{
                background: platform === tab.id ? 'var(--accent-gradient)' : 'transparent',
                color: platform === tab.id ? '#FFFFFF' : '#94A3B8',
                borderRadius: 'var(--radius)',
                padding: '0.5rem 1rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {tab.name}
              {tab.count !== undefined && (
                <span 
                  style={{ 
                    background: platform === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', 
                    padding: '0.05rem 0.4rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.7rem',
                    color: platform === tab.id ? '#FFFFFF' : '#cbd5e1'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Multi-Dimensional Filter panel */}
        <div className="glass" style={{ padding: '1.25rem', marginBottom: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <div className="flex wrap gap-4 items-center justify-between">
            
            {/* Search Input */}
            <div className="flex items-center gap-2" style={{ flex: '1 1 300px', position: 'relative' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} color="#64748B" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by student name or roll number..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(searchQuery); }}
                  style={{ padding: '0.5rem 1rem 0.5rem 2.25rem', fontSize: '0.88rem', width: '100%', borderRadius: 'var(--radius)' }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Dropdowns */}
            <div className="flex wrap gap-3 items-center" style={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
              
              {/* Year Select */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Year:</span>
                <select 
                  className="form-input" 
                  value={yearFilter}
                  onChange={e => { setYearFilter(e.target.value); setCurrentPage(1); }}
                  style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <option value="all">All Years</option>
                  {[1, 2, 3, 4].map(yr => (
                    <option key={yr} value={yr}>
                      {yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year ({meta.yearCounts?.[yr] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Select */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Branch:</span>
                <select 
                  className="form-input" 
                  value={branchFilter}
                  onChange={e => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                  style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <option value="all">All Branches</option>
                  {['CSE', 'CSE AIML', '3DAG', 'EEE', 'CWCA', 'CE', 'ME'].map(br => (
                    <option key={br} value={br}>
                      {br} ({meta.branchCounts?.[br] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters action */}
              {(yearFilter !== 'all' || branchFilter !== 'all' || searchQuery) && (
                <button 
                  onClick={handleResetFilters} 
                  className="btn btn-ghost btn-sm flex items-center gap-1"
                  style={{ fontSize: '0.8rem', color: 'var(--accent-2)' }}
                >
                  <RefreshCcw size={13} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex wrap gap-2 items-center mt-3" style={{ fontSize: '0.75rem', color: '#64748B' }}>
              <span>Recent searches:</span>
              {recentSearches.map((tag, idx) => (
                <span 
                  key={idx}
                  onClick={() => { setSearchQuery(tag); setCurrentPage(1); }}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '1rem', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  className="hover:text-white"
                >
                  {tag}
                  <X size={10} onClick={(e) => removeSearchHistory(tag, e)} />
                </span>
              ))}
            </div>
          )}

          {/* Collapsible stats & distributions summary */}
          <div className="border-t border-slate-800 mt-4 pt-3">
            <button 
              onClick={() => setShowStatsAccordion(!showStatsAccordion)}
              className="btn btn-ghost btn-sm flex items-center gap-1 p-0 text-muted"
              style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              <BarChart2 size={13} />
              <span>{showStatsAccordion ? 'Hide' : 'Show'} Branch & Year Distribution Charts</span>
            </button>

            {showStatsAccordion && (
              <div className="grid-2 animate-fade-in mt-4" style={{ gap: '2rem' }}>
                {/* Branch Breakdown */}
                <div>
                  <h6 style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.5rem', fontWeight: 600 }}>Branch Demographics</h6>
                  <div className="flex-col gap-2">
                    {['CSE', 'CSE AIML', '3DAG', 'EEE', 'CWCA', 'CE', 'ME'].map(br => {
                      const count = meta.branchCounts?.[br] || 0;
                      const total = Object.values(meta.branchCounts || {}).reduce((a: any, b: any) => a + b, 0) as number || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={br} className="flex-col gap-1">
                          <div className="flex justify-between" style={{ fontSize: '0.75rem', color: '#CBD5E1' }}>
                            <span>{br}</span>
                            <span>{count} students ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '2px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Academic Year Breakdown */}
                <div>
                  <h6 style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.5rem', fontWeight: 600 }}>Academic Year Demographics</h6>
                  <div className="flex-col gap-2">
                    {[1, 2, 3, 4].map(yr => {
                      const count = meta.yearCounts?.[yr] || 0;
                      const total = Object.values(meta.yearCounts || {}).reduce((a: any, b: any) => a + b, 0) as number || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={yr} className="flex-col gap-1">
                          <div className="flex justify-between" style={{ fontSize: '0.75rem', color: '#CBD5E1' }}>
                            <span>{yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year</span>
                            <span>{count} students ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #F59E0B, #EC4899)', borderRadius: '2px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Preset controls if Weekly LeetCode is selected */}
        {platform === 'weekly_leetcode' && (
          <div className="flex items-center gap-2 mb-4 glass" style={{ padding: '0.5rem 1rem', width: 'fit-content', borderRadius: 'var(--radius)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} /> Date Range:</span>
            {['Last 7 Days', 'Last 30 Days', 'This Month'].map(range => (
              <button
                key={range}
                onClick={() => setSelectedWeeklyRange(range)}
                className={`btn btn-sm ${selectedWeeklyRange === range ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
              >
                {range}
              </button>
            ))}
          </div>
        )}

        {/* Top Podium (Ranks 1, 2, 3 visualization) */}
        {podiumEntries.length > 0 && (
          <div className="flex items-end justify-center gap-4 mb-10 mt-6 wrap">
            
            {/* 2nd place */}
            {podiumEntries[1] && (
              <Link 
                href={`/profile/${podiumEntries[1].username}`} 
                className="text-center animate-slide-in flex-1" 
                style={{ maxWidth: 220, textDecoration: 'none', cursor: 'pointer', order: 1 }}
              >
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                  <img
                    src={podiumEntries[1].avatar_url?.startsWith('http') ? podiumEntries[1].avatar_url : `/avatars/${podiumEntries[1].avatar_url || 'avatar_0.svg'}`}
                    alt={podiumEntries[1].username}
                    width={64}
                    height={64}
                    style={{ borderRadius: '50%', border: '3px solid var(--silver)', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                  />
                  <span style={{ position: 'absolute', bottom: -8, right: -4, fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                    {MEDALS[2]}
                  </span>
                </div>
                
                <div style={{ fontWeight: 700, color: '#E2E8F0', marginBottom: '0.25rem' }}>
                  {podiumEntries[1].full_name || podiumEntries[1].username}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '0.5rem' }}>
                  {podiumEntries[1].branch ? `${podiumEntries[1].branch} • Yr ${podiumEntries[1].academic_year}` : `@${podiumEntries[1].username}`}
                </div>
                
                <div
                  style={{
                    height: 120,
                    borderRadius: 'var(--radius) var(--radius) 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(192,192,192,0.15), rgba(169,169,169,0.05))',
                    border: '1px solid rgba(192,192,192,0.25)',
                    borderBottom: 'none'
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: '1.5rem', color: 'var(--silver)' }}>#2</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-3)', fontSize: '0.95rem', background: 'rgba(0,0,0,0.2)', padding: '0.15rem 0.5rem', borderRadius: '1rem' }}>
                    {platform === 'weekly_leetcode' ? podiumEntries[1].weekly_credits : podiumEntries[1].total_points} pts
                  </div>
                </div>
              </Link>
            )}

            {/* 1st place */}
            {podiumEntries[0] && (
              <Link 
                href={`/profile/${podiumEntries[0].username}`} 
                className="text-center animate-slide-in flex-1" 
                style={{ maxWidth: 240, textDecoration: 'none', cursor: 'pointer', order: 2 }}
              >
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                  <img
                    src={podiumEntries[0].avatar_url?.startsWith('http') ? podiumEntries[0].avatar_url : `/avatars/${podiumEntries[0].avatar_url || 'avatar_0.svg'}`}
                    alt={podiumEntries[0].username}
                    width={84}
                    height={84}
                    style={{ borderRadius: '50%', border: '4px solid var(--gold)', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                  />
                  <span style={{ position: 'absolute', bottom: -6, right: -4, fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                    {MEDALS[1]}
                  </span>
                </div>
                
                <div style={{ fontWeight: 800, color: '#FFFFFF', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                  {podiumEntries[0].full_name || podiumEntries[0].username}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '0.5rem' }}>
                  {podiumEntries[0].branch ? `${podiumEntries[0].branch} • Yr ${podiumEntries[0].academic_year}` : `@${podiumEntries[0].username}`}
                </div>
                
                <div
                  style={{
                    height: 150,
                    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.05))',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderBottom: 'none'
                  }}
                  className="top-tier-glow"
                >
                  <div style={{ fontWeight: 950, fontSize: '2rem', color: 'var(--gold)' }}>#1</div>
                  <div style={{ fontWeight: 900, color: '#F59E0B', fontSize: '1.05rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                    {platform === 'weekly_leetcode' ? podiumEntries[0].weekly_credits : podiumEntries[0].total_points} pts
                  </div>
                </div>
              </Link>
            )}

            {/* 3rd place */}
            {podiumEntries[2] && (
              <Link 
                href={`/profile/${podiumEntries[2].username}`} 
                className="text-center animate-slide-in flex-1" 
                style={{ maxWidth: 200, textDecoration: 'none', cursor: 'pointer', order: 3 }}
              >
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                  <img
                    src={podiumEntries[2].avatar_url?.startsWith('http') ? podiumEntries[2].avatar_url : `/avatars/${podiumEntries[2].avatar_url || 'avatar_0.svg'}`}
                    alt={podiumEntries[2].username}
                    width={56}
                    height={56}
                    style={{ borderRadius: '50%', border: '3px solid var(--bronze)', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                  />
                  <span style={{ position: 'absolute', bottom: -8, right: -4, fontSize: '1.4rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                    {MEDALS[3]}
                  </span>
                </div>
                
                <div style={{ fontWeight: 700, color: '#CBD5E1', marginBottom: '0.25rem' }}>
                  {podiumEntries[2].full_name || podiumEntries[2].username}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '0.5rem' }}>
                  {podiumEntries[2].branch ? `${podiumEntries[2].branch} • Yr ${podiumEntries[2].academic_year}` : `@${podiumEntries[2].username}`}
                </div>
                
                <div
                  style={{
                    height: 100,
                    borderRadius: 'var(--radius) var(--radius) 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(205,127,50,0.15), rgba(184,115,51,0.05))',
                    border: '1px solid rgba(205,127,50,0.25)',
                    borderBottom: 'none'
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: '1.3rem', color: 'var(--bronze)' }}>#3</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-3)', fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '0.15rem 0.5rem', borderRadius: '1rem' }}>
                    {platform === 'weekly_leetcode' ? podiumEntries[2].weekly_credits : podiumEntries[2].total_points} pts
                  </div>
                </div>
              </Link>
            )}

          </div>
        )}

        {/* Dynamic Scoring Header Explanation */}
        <div className="flex wrap items-center justify-between mb-4 mt-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#818CF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Info size={12} /> {activeMetricsExplanation[platform]}
          </span>
          <button 
            onClick={() => setIsCompareOpen(true)}
            className="btn btn-ghost btn-sm flex items-center gap-1"
            style={{ fontSize: '0.8rem', color: 'var(--accent-3)' }}
          >
            ⚖️ Compare with Friend
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius)' }} />
            ))}
          </div>
        ) : paginatedEntries.length === 0 ? (
          
          /* Crisis Empty State Redesign */
          <div 
            className="empty-state text-center" 
            style={{ 
              padding: '3rem 2rem', 
              background: 'rgba(30, 41, 59, 0.2)', 
              border: '1px dashed rgba(255,255,255,0.1)', 
              borderRadius: 'var(--radius-lg)' 
            }}
          >
            <Trophy size={48} color="#64748B" style={{ margin: '0 auto 1.5rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>No Scores Found</h3>
            
            {/* Context Explanation */}
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: 450, margin: '0 auto 1.5rem' }}>
              {searchQuery || yearFilter !== 'all' || branchFilter !== 'all' 
                ? 'Your active search filters are too restrictive. Try resetting them above to view active student entries.'
                : 'Nobody has solved any challenges or synchronized their accounts in this category yet.'}
            </p>

            {/* Smart fallback call to actions */}
            <div className="flex justify-center gap-3">
              <button onClick={handleResetFilters} className="btn btn-ghost btn-sm">
                Reset Filters
              </button>
              <Link href="/qotd" className="btn btn-primary btn-sm flex items-center gap-1">
                <BookOpen size={14} /> Solve Question of the Day
              </Link>
              <Link href="/practice" className="btn btn-secondary btn-sm flex items-center gap-1">
                <Zap size={14} /> Go to Practice
              </Link>
            </div>
          </div>
        ) : (
          
          /* Dense Leaderboard Listing */
          <div className="flex-col gap-2 animate-fade-in">
            
            {/* Table Header Column Titles */}
            <div 
              className="flex items-center gap-4 text-muted select-none" 
              style={{ 
                padding: '0.5rem 1.25rem', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '1px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div 
                className="flex items-center gap-1 cursor-pointer hover:text-white" 
                style={{ width: '4.5rem' }}
                onClick={() => handleSortChange('rank')}
              >
                Rank <ArrowUpDown size={12} />
              </div>
              <div style={{ flex: 1 }}>Student</div>
              <div className="hidden-mobile" style={{ width: '8rem', textAlign: 'center' }}>Branch/Year</div>
              <div 
                className="hidden-mobile flex items-center justify-center gap-1 cursor-pointer hover:text-white" 
                style={{ width: '8rem' }}
                onClick={() => handleSortChange('solved')}
              >
                LC Solved <ArrowUpDown size={12} />
              </div>
              <div 
                className="flex items-center justify-center gap-1 cursor-pointer hover:text-white" 
                style={{ width: '6rem' }}
                onClick={() => handleSortChange('streak')}
              >
                Streak <ArrowUpDown size={12} />
              </div>
              <div 
                className="flex items-center justify-end gap-1 cursor-pointer hover:text-white" 
                style={{ width: '7rem', color: 'var(--accent-3)' }}
                onClick={() => handleSortChange('points')}
              >
                Score <ArrowUpDown size={12} />
              </div>
              <div style={{ width: '2.5rem' }}></div>
            </div>

            {/* List Rows */}
            {paginatedEntries.map((entry) => {
              const rankVal = entry.rank;
              const isTop3 = rankVal <= 3;
              
              // Top 1% Holographic borders logic
              const isTop1Percent = entries.length >= 10 && rankVal <= Math.max(1, Math.round(entries.length * 0.01));
              
              const pointsDisplay = platform === 'weekly_leetcode' ? (entry.weekly_credits || 0) : entry.total_points;
              
              const verified = isVerifiedStudent(entry);
              
              // Rank change snapshot indicator
              const hasTrend = entry.trend !== 0;
              const isTrendUp = entry.trend > 0;

              return (
                <Link 
                  href={`/profile/${entry.username}`}
                  key={entry.id}
                  ref={el => { userRowRefs.current[entry.id] = el; }}
                  className={`lb-card flex items-center gap-4 ${isTop1Percent ? 'top-tier-glow' : ''}`}
                  style={{ 
                    padding: '0.75rem 1.25rem',
                    background: currentUserProfile?.id === entry.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(30, 41, 59, 0.25)',
                    border: currentUserProfile?.id === entry.id ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex'
                  }}
                >
                  
                  {/* Rank & Medals Column */}
                  <div style={{ width: '4.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ fontSize: isTop3 ? '1.5rem' : '0.9rem', fontWeight: 800, minWidth: '1.8rem' }}>
                      {isTop3 ? MEDALS[rankVal] : `#${rankVal}`}
                    </div>
                    
                    {/* Rank Trend movement arrow */}
                    {hasTrend && (
                      <span 
                        style={{ fontSize: '0.68rem', fontWeight: 700, color: isTrendUp ? '#10B981' : '#EF4444' }}
                        title={`Rank moved ${isTrendUp ? 'up' : 'down'} by ${Math.abs(entry.trend)} spots since yesterday`}
                      >
                        {isTrendUp ? `↑${entry.trend}` : `↓${Math.abs(entry.trend)}`}
                      </span>
                    )}
                  </div>

                  {/* Student Details Column */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    
                    {/* Avatar */}
                    <div style={{ position: 'relative' }}>
                      <img
                        src={entry.avatar_url?.startsWith('http') ? entry.avatar_url : `/avatars/${entry.avatar_url || 'avatar_0.svg'}`}
                        alt={entry.username}
                        width={36}
                        height={36}
                        style={{ borderRadius: '50%', border: '2px solid rgba(255,255,255,0.05)', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                      />
                      {isTop1Percent && (
                        <span style={{ position: 'absolute', top: -10, left: -6, fontSize: '0.8rem', transform: 'rotate(-20deg)' }}>👑</span>
                      )}
                    </div>

                    <div className="flex-col">
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {entry.full_name || entry.username}
                        {entry.role === 'team' && <span className="badge badge-primary" style={{ fontSize: '0.55rem', padding: '0.05rem 0.25rem' }}>Team</span>}
                        
                        {/* Institutional verification badge */}
                        {verified && (
                          <UserCheck size={13} color="#10B981" title="Institutional Verified Student" />
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        @{entry.username}
                        <span className="visible-mobile-inline"> • {entry.branch || 'CSE'} (Yr {entry.academic_year || 1})</span>
                      </div>
                    </div>
                  </div>

                  {/* Branch & Year Column (Desktop) */}
                  <div className="hidden-mobile" style={{ width: '8rem', textAlign: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
                    {entry.branch ? `${entry.branch} • Yr ${entry.academic_year}` : '—'}
                  </div>

                  {/* LeetCode Solved Count Column (Desktop) */}
                  <div className="hidden-mobile flex-col items-center" style={{ width: '8rem', textAlign: 'center', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{entry.problems_solved || 0} solved</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748B' }}>
                      <span color="#10B981">🟢{entry.lc_easy_solved || 0}</span> • <span color="#F59E0B">🟡{entry.lc_medium_solved || 0}</span> • <span color="#EF4444">🔴{entry.lc_hard_solved || 0}</span>
                    </div>
                  </div>

                  {/* Active Streak Column */}
                  <div className="flex-col items-center" style={{ width: '6rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center', color: '#EF4444', fontWeight: 700, fontSize: '0.9rem' }}>
                      <Flame size={14} fill="#EF4444" /> {entry.current_streak || 0}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B' }}>longest: {entry.longest_streak || 0}d</div>
                  </div>

                  {/* Total Score Column */}
                  <div className="flex-col items-end" style={{ width: '7rem' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-3)' }}>{pointsDisplay || 0}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748B' }}>{platform === 'weekly_leetcode' ? 'weekly pts' : 'total pts'}</div>
                  </div>

                  {/* Action columns (Share cert details) */}
                  <div style={{ width: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareUser(entry); setIsShareModalOpen(true); }}
                      className="btn btn-ghost btn-sm p-1"
                      title="Share Achievement Card"
                      style={{ color: '#64748B', display: 'flex', alignItems: 'center' }}
                    >
                      <Share2 size={15} />
                    </button>
                  </div>
                </Link>
              );
            })}

            {/* Pagination Controls */}
            <div 
              className="flex wrap justify-between items-center border-t border-slate-800 pt-4 mt-2 gap-3" 
              style={{ fontSize: '0.8rem', color: '#94A3B8' }}
            >
              <div>
                Showing <strong style={{ color: '#FFF' }}>{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalEntriesCount)}</strong> of <strong style={{ color: '#FFF' }}>{totalEntriesCount}</strong> students
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-2">
                
                {/* Page Size Selector */}
                <span style={{ fontSize: '0.75rem' }}>Rows per page:</span>
                <select 
                  value={pageSize} 
                  onChange={e => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '0.15rem 0.5rem', borderRadius: '3px' }}
                >
                  {[5, 10, 20, 50].map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>

                <div className="flex gap-1">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-ghost btn-sm p-1"
                    style={{ minWidth: '2rem', height: '2rem' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pg = i + 1;
                    // Only show first, last and surrounding pages to avoid huge pagination clusters
                    if (pg === 1 || pg === totalPages || Math.abs(currentPage - pg) <= 1) {
                      return (
                        <button
                          key={pg}
                          onClick={() => setCurrentPage(pg)}
                          className={`btn btn-sm ${currentPage === pg ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ minWidth: '2rem', height: '2rem', padding: 0 }}
                        >
                          {pg}
                        </button>
                      );
                    } else if (pg === 2 || pg === totalPages - 1) {
                      return <span key={pg} style={{ padding: '0 0.25rem' }}>...</span>;
                    }
                    return null;
                  })}

                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn btn-ghost btn-sm p-1"
                    style={{ minWidth: '2rem', height: '2rem' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Static Scoring Rules details */}
        <div className="card" style={{ marginTop: '3rem', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)' }}>
          <h4 className="flex items-center gap-2" style={{ marginBottom: '1rem', fontSize: '1.05rem', fontWeight: 700 }}>
            <Award size={18} color="var(--accent-2)" /> 📐 Scoring Metric Blueprint
          </h4>
          <div className="grid-3" style={{ gap: '1.25rem' }}>
            
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: 'var(--radius)' }}>
              <h5 style={{ color: 'var(--accent-2)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>LeetCode Weights</h5>
              <div className="flex-col gap-1" style={{ color: '#94A3B8', fontSize: '0.78rem' }}>
                <div className="flex justify-between"><span>🟢 Easy Question</span> <strong style={{ color: '#cbd5e1' }}>2 pts</strong></div>
                <div className="flex justify-between"><span>🟡 Medium Question</span> <strong style={{ color: '#cbd5e1' }}>5 pts</strong></div>
                <div className="flex justify-between"><span>🔴 Hard Question</span> <strong style={{ color: '#cbd5e1' }}>10 pts</strong></div>
              </div>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: 'var(--radius)' }}>
              <h5 style={{ color: 'var(--accent-3)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Internal Challenges</h5>
              <div className="flex-col gap-1" style={{ color: '#94A3B8', fontSize: '0.78rem' }}>
                <div className="flex justify-between"><span>🔥 Question of the Day</span> <strong style={{ color: '#cbd5e1' }}>10 pts</strong></div>
                <div className="flex justify-between"><span>🏆 Monthly Contests</span> <strong style={{ color: '#cbd5e1' }}>Based on Rank</strong></div>
                <div className="flex justify-between"><span>⭐ Verification bonus</span> <strong style={{ color: '#cbd5e1' }}>25 pts</strong></div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: 'var(--radius)' }}>
              <h5 style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Streak Multipliers</h5>
              <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: 0 }}>
                Maintaining streaks activates point multipliers. A 7-Day streak triggers <strong>1.1x</strong> bonus, 14-Day triggers <strong>1.25x</strong>, and a massive 30-Day streak grants a permanent <strong>1.5x</strong> multiplier!
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Personal Rank Context bar */}
        {myPositionMetrics && (
          <div 
            className="animate-fade-in flex items-center justify-between"
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '800px',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 15px rgba(99, 102, 241, 0.1)',
              borderRadius: '2rem',
              padding: '0.6rem 1.5rem',
              zIndex: 100
            }}
          >
            <div className="flex items-center gap-3">
              <div style={{ background: 'var(--accent-gradient)', width: '2.2rem', height: '2.2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifycenter: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#FFF', justifyContent: 'center' }}>
                #{myPositionMetrics.rank}
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: '#FFF', fontWeight: 600 }}>Your standing:</span> You are ranked{' '}
                <strong style={{ color: 'var(--accent-3)' }}>#{myPositionMetrics.rank}</strong> out of{' '}
                <strong style={{ color: '#FFF' }}>{myPositionMetrics.totalUsers}</strong> students{' '}
                <span className="hidden-mobile" style={{ color: '#10B981' }}>(Top {myPositionMetrics.percentile}%)</span>
              </div>
            </div>
            
            <button 
              onClick={handleViewMyPosition}
              className="btn btn-primary btn-sm flex items-center gap-1"
              style={{ fontSize: '0.78rem', borderRadius: '1.5rem', padding: '0.3rem 0.9rem' }}
            >
              <Eye size={12} /> View My Position
            </button>
          </div>
        )}

      </div>

      {/* Compare modal side-by-side */}
      {isCompareOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0,0,0,0.85)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 999 
          }}
          className="animate-fade-in"
        >
          <div 
            className="card" 
            style={{ 
              width: '90%', 
              maxWidth: '700px', 
              background: '#0F172A', 
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '1.5rem', 
              position: 'relative',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <button 
              onClick={() => { setIsCompareOpen(false); setCompareFriend(null); setCompareQuery(''); }}
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
            >
              <X size={20} />
            </button>

            <h3 className="flex items-center gap-2" style={{ marginBottom: '1rem', fontWeight: 800, fontSize: '1.25rem' }}>
              ⚖️ Side-by-Side Student Comparison
            </h3>

            {/* Select Friend Input */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search friend to compare..."
                value={compareQuery}
                onChange={e => setCompareQuery(e.target.value)}
                style={{ width: '100%' }}
              />
              
              {compareFriendList.length > 0 && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '105%', 
                    left: 0, 
                    width: '100%', 
                    background: '#1E293B', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    zIndex: 10
                  }}
                >
                  {compareFriendList.map(user => (
                    <div 
                      key={user.id}
                      onClick={() => { setCompareFriend(user); setCompareQuery(''); }}
                      style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      className="hover:bg-slate-700"
                    >
                      <img 
                        src={user.avatar_url?.startsWith('http') ? user.avatar_url : `/avatars/${user.avatar_url || 'avatar_0.svg'}`} 
                        alt={user.username} 
                        width={24} 
                        height={24} 
                        style={{ borderRadius: '50%' }} 
                      />
                      <span style={{ fontSize: '0.85rem', color: '#FFF' }}>{user.full_name || user.username} (@{user.username})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comparison panels */}
            <div className="grid-2" style={{ gap: '1.5rem' }}>
              
              {/* Logged in User stats */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.04)' }}>
                {currentUserProfile ? (
                  <div className="text-center">
                    <img 
                      src={currentUserProfile.avatar_url?.startsWith('http') ? currentUserProfile.avatar_url : `/avatars/${currentUserProfile.avatar_url || 'avatar_0.svg'}`} 
                      alt="You" 
                      width={50} 
                      height={50} 
                      style={{ borderRadius: '50%', margin: '0 auto 0.5rem', border: '2px solid var(--accent)' }} 
                    />
                    <h5 style={{ margin: 0, fontWeight: 700 }}>{currentUserProfile.full_name || currentUserProfile.username} (You)</h5>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>@{currentUserProfile.username}</p>

                    <div className="flex-col gap-2 mt-4" style={{ fontSize: '0.8rem' }}>
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span>Rank:</span>
                        <strong style={{ color: myPositionMetrics ? 'var(--accent-3)' : '#FFF' }}>#{myPositionMetrics?.rank || '—'}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span>Total Points:</span>
                        <strong>{myPositionMetrics?.points || 0} pts</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span>LC Solved:</span>
                        <strong>{myPositionMetrics?.user.problems_solved || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Streak:</span>
                        <strong style={{ color: '#EF4444' }}><Flame size={12} style={{ display: 'inline' }} /> {myPositionMetrics?.user.current_streak || 0}d</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted" style={{ fontSize: '0.85rem' }}>Login to compare your stats</p>
                )}
              </div>

              {/* Friend Stats */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.04)' }}>
                {compareFriend ? (
                  <div className="text-center animate-fade-in">
                    <img 
                      src={compareFriend.avatar_url?.startsWith('http') ? compareFriend.avatar_url : `/avatars/${compareFriend.avatar_url || 'avatar_0.svg'}`} 
                      alt="Friend" 
                      width={50} 
                      height={50} 
                      style={{ borderRadius: '50%', margin: '0 auto 0.5rem', border: '2px solid var(--accent-3)' }} 
                    />
                    <h5 style={{ margin: 0, fontWeight: 700 }}>{compareFriend.full_name || compareFriend.username}</h5>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>@{compareFriend.username}</p>

                    <div className="flex-col gap-2 mt-4" style={{ fontSize: '0.8rem' }}>
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span>Rank:</span>
                        <strong style={{ color: myPositionMetrics && compareFriend.rank < myPositionMetrics.rank ? '#10B981' : '#FFF' }}>
                          #{compareFriend.rank} {myPositionMetrics && compareFriend.rank < myPositionMetrics.rank ? '👑' : ''}
                        </strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span>Total Points:</span>
                        <strong style={{ color: myPositionMetrics && compareFriend.total_points > myPositionMetrics.points ? '#10B981' : '#FFF' }}>
                          {compareFriend.total_points} pts
                        </strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span>LC Solved:</span>
                        <strong style={{ color: myPositionMetrics && compareFriend.problems_solved > (myPositionMetrics?.user.problems_solved || 0) ? '#10B981' : '#FFF' }}>
                          {compareFriend.problems_solved}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Streak:</span>
                        <strong style={{ color: myPositionMetrics && compareFriend.current_streak > (myPositionMetrics?.user.current_streak || 0) ? '#10B981' : '#EF4444' }}>
                          <Flame size={12} style={{ display: 'inline' }} /> {compareFriend.current_streak}d
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-col items-center justify-center text-center text-muted" style={{ height: '100%', minHeight: '150px', justifyContent: 'center' }}>
                    <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.85rem' }}>Select a friend above to begin side-by-side comparison comparison</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Share achievement card modal */}
      {isShareModalOpen && shareUser && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0,0,0,0.85)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 999 
          }}
          className="animate-fade-in"
        >
          <div 
            className="card" 
            style={{ 
              width: '90%', 
              maxWidth: '640px', 
              background: '#0F172A', 
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '1.5rem', 
              position: 'relative',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center'
            }}
          >
            <button 
              onClick={() => { setIsShareModalOpen(false); setShareUser(null); }}
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.25rem' }}>
              🎨 Download / Share Certificate Card
            </h3>

            {/* Hidden Canvas on DOM, displayed as scaled mockup */}
            <div style={{ background: '#020617', padding: '0.5rem', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <canvas ref={canvasRef} style={{ width: '100%', maxWidth: '500px', height: 'auto', borderRadius: 'var(--radius)' }} />
            </div>

            <div className="flex justify-center gap-3">
              <button 
                onClick={handleCopyShareImage}
                className="btn btn-secondary flex items-center gap-1"
              >
                Copy to Clipboard
              </button>
              <button 
                onClick={handleDownloadShareImage}
                className="btn btn-primary flex items-center gap-1"
              >
                Download PNG Image
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
