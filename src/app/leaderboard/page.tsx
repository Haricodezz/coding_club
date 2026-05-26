'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/types';

type PlatformFilter = 'overall' | 'leetcode' | 'internal' | 'contest';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<(User & { rank: number })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [platform, setPlatform] = useState<PlatformFilter>('overall');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      const res = await fetch(`/api/leaderboard?platform=${platform}&year=${yearFilter}&branch=${branchFilter}`);
      const json = await res.json();
      setEntries(json.data || []);
      setLoading(false);
    }
    fetchLeaderboard();
  }, [platform, yearFilter, branchFilter]);

  // Apply search filter locally
  const filteredEntries = entries.filter(e => 
    !searchQuery || 
    e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.full_name && e.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const top3 = filteredEntries.slice(0, 3);
  const rest = filteredEntries.slice(3);

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 1000 }}>
        {/* Header */}
        <div className="page-header text-center animate-fade-in">
          <p className="eyebrow">📊 Rankings</p>
          <h1>The <span className="gradient-text">Leaderboard</span></h1>
          <p>Real-time rankings. Earn points from LeetCode, internal challenges, and streaks!</p>
        </div>

        {/* Multi-Dimensional Filters */}
        <div className="glass" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="flex wrap gap-3 items-center justify-between">
            {/* Category / Platform Filter */}
            <div className="filter-tabs">
              <button className={`filter-tab ${platform === 'overall' ? 'active' : ''}`} onClick={() => setPlatform('overall')}>Overall</button>
              <button className={`filter-tab ${platform === 'leetcode' ? 'active' : ''}`} onClick={() => setPlatform('leetcode')}>LeetCode</button>
              <button className={`filter-tab ${platform === 'internal' ? 'active' : ''}`} onClick={() => setPlatform('internal')}>Internal</button>
              <button className={`filter-tab ${platform === 'contest' ? 'active' : ''}`} onClick={() => setPlatform('contest')}>Contests</button>
            </div>

            {/* Search */}
            <div style={{ flex: '1 1 250px', maxWidth: '300px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div className="flex wrap gap-3 items-center">
            {/* Year Filter */}
            <select 
              className="form-input" 
              style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.8rem' }}
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
            >
              <option value="all">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>

            {/* Branch Filter */}
            <select 
              className="form-input" 
              style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.8rem' }}
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="ME">ME</option>
              <option value="CE">CE</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🏆</span>
            <h3>No scores found</h3>
            <p>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length > 0 && !searchQuery && (
              <div className="flex items-end justify-center gap-4" style={{ marginBottom: '3rem', marginTop: '2rem' }}>
                {/* Reorder: 2nd, 1st, 3rd for podium effect */}
                {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, idx) => {
                  const podiumOrder = [2, 1, 3];
                  const actualRank = podiumOrder[idx];
                  const heights = { 1: 150, 2: 120, 3: 100 };
                  const height = heights[actualRank as 1 | 2 | 3];
                  
                  const displayPoints = platform === 'leetcode' ? entry.lc_points : entry.total_points;

                  return (
                    <div key={entry.id} className="text-center animate-slide-in" style={{ animationDelay: `${idx * 100}ms`, flex: 1, maxWidth: 220 }}>
                      {/* Avatar */}
                      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                        <img
                          src={entry.avatar_url?.startsWith('http') ? entry.avatar_url : `/avatars/${entry.avatar_url || 'avatar_0.svg'}`}
                          alt={entry.username}
                          width={actualRank === 1 ? 84 : 64}
                          height={actualRank === 1 ? 84 : 64}
                          style={{ 
                            borderRadius: '50%', 
                            border: `3px solid ${actualRank === 1 ? 'var(--gold)' : actualRank === 2 ? 'var(--silver)' : 'var(--bronze)'}`,
                            objectFit: 'cover'
                          }}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                        />
                        <span style={{ position: 'absolute', bottom: -8, right: -4, fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                          {MEDAL[actualRank]}
                        </span>
                      </div>
                      
                      <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem', fontSize: actualRank === 1 ? '1.1rem' : '1rem' }}>
                        {entry.full_name || entry.username}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        {entry.branch ? `${entry.branch} • Year ${entry.academic_year}` : `@${entry.username}`}
                      </div>
                      
                      {/* Podium base */}
                      <div
                        style={{
                          height,
                          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          background: actualRank === 1
                            ? 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,165,0,0.1))'
                            : actualRank === 2
                            ? 'linear-gradient(135deg, rgba(192,192,192,0.2), rgba(169,169,169,0.1))'
                            : 'linear-gradient(135deg, rgba(205,127,50,0.2), rgba(184,115,51,0.1))',
                          border: `1px solid ${actualRank === 1 ? 'rgba(255,215,0,0.4)' : actualRank === 2 ? 'rgba(192,192,192,0.3)' : 'rgba(205,127,50,0.3)'}`,
                          borderBottom: 'none'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: actualRank === 1 ? '2rem' : '1.5rem',
                          color: actualRank === 1 ? 'var(--gold)' : actualRank === 2 ? 'var(--silver)' : 'var(--bronze)' }}>
                          #{actualRank}
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-3)', fontSize: '1.1rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                          {displayPoints || 0} pts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rest of leaderboard */}
            <div className="flex-col gap-2">
              {/* Column headers */}
              <div className="flex items-center gap-4" style={{ padding: '0.25rem 1.25rem', color: '#475569', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span style={{ minWidth: '3.5rem' }}>Rank</span>
                <span style={{ flex: 1 }}>Student</span>
                <span style={{ minWidth: 80, textAlign: 'right' }}>LeetCode</span>
                <span style={{ minWidth: 90, textAlign: 'right', color: 'var(--accent-3)' }}>Total Pts</span>
              </div>

              {/* Top 3 in list form too */}
              {top3.map((entry) => <LeaderboardRow key={entry.id} entry={entry} platform={platform} />)}

              {rest.length > 0 && <hr className="divider" style={{ margin: '0.5rem 0' }} />}

              {rest.map((entry) => <LeaderboardRow key={entry.id} entry={entry} platform={platform} />)}
            </div>

            {/* Scoring explanation */}
            <div className="card" style={{ marginTop: '2.5rem', fontSize: '0.85rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>📐 Scoring System</h4>
              <div className="flex wrap gap-4">
                <div style={{ flex: 1, minWidth: 200, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                  <h5 style={{ color: 'var(--accent-2)', marginBottom: '0.5rem' }}>LeetCode Weights</h5>
                  <div className="flex-col gap-1" style={{ color: '#94a3b8' }}>
                    <div className="flex justify-between"><span>🟢 Easy</span> <strong style={{ color: '#e2e8f0' }}>2 pts</strong></div>
                    <div className="flex justify-between"><span>🟡 Medium</span> <strong style={{ color: '#e2e8f0' }}>5 pts</strong></div>
                    <div className="flex justify-between"><span>🔴 Hard</span> <strong style={{ color: '#e2e8f0' }}>10 pts</strong></div>
                  </div>
                </div>
                
                <div style={{ flex: 1, minWidth: 200, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                  <h5 style={{ color: 'var(--accent-3)', marginBottom: '0.5rem' }}>Internal Platform</h5>
                  <div className="flex-col gap-1" style={{ color: '#94a3b8' }}>
                    <div className="flex justify-between"><span>🔥 Question of the Day</span> <strong style={{ color: '#e2e8f0' }}>10 pts</strong></div>
                    <div className="flex justify-between"><span>📅 7-Day Streak</span> <strong style={{ color: '#e2e8f0' }}>50 pts</strong></div>
                    <div className="flex justify-between"><span>🏆 Internal Contests</span> <strong style={{ color: '#e2e8f0' }}>Varies</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, platform }: { entry: User & { rank: number }, platform: PlatformFilter }) {
  const { rank } = entry;
  const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
  
  const displayPoints = platform === 'leetcode' ? entry.lc_points : entry.total_points;
  
  return (
    <div
      className={`lb-card ${rankClass}`}
      style={{ '--item-index': rank - 1 } as React.CSSProperties}
    >
      <div className={`lb-rank ${rankClass}`} style={{ minWidth: '3.5rem' }}>
        {/* We can add a rank movement icon here if we fetch snapshots */}
        <span style={{ fontSize: rank <= 3 ? '1.5rem' : '1rem', fontWeight: 800 }}>
          {rank <= 3 ? MEDAL[rank] : `#${rank}`}
        </span>
      </div>
      
      <div className="lb-avatar">
        <img
          src={entry.avatar_url?.startsWith('http') ? entry.avatar_url : `/avatars/${entry.avatar_url || 'avatar_0.svg'}`}
          alt={entry.username}
          width={44}
          height={44}
          style={{ objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
        />
      </div>
      
      <div className="lb-info">
        <div className="lb-username flex items-center gap-2">
          {entry.full_name || entry.username}
          {entry.role === 'team' && <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>Team</span>}
        </div>
        <div className="lb-batch" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>@{entry.username}</span>
          {entry.branch && <span>• {entry.branch} {entry.academic_year ? `(Yr ${entry.academic_year})` : ''}</span>}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {/* LeetCode stats */}
        <div style={{ textAlign: 'right', minWidth: 60, opacity: platform === 'leetcode' ? 1 : 0.7 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: platform === 'leetcode' ? 'var(--accent-3)' : '#e2e8f0' }}>
            {entry.lc_points || 0}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#475569' }}>LC Pts</div>
        </div>
        
        {/* Total Points */}
        <div className="lb-points" style={{ minWidth: 90 }}>
          <div className="lb-points-value" style={{ fontSize: '1.2rem', color: 'var(--accent-3)' }}>{displayPoints || 0}</div>
          <div className="lb-points-label">{platform === 'leetcode' ? 'LC Total' : 'Total pts'}</div>
        </div>
      </div>
    </div>
  );
}
