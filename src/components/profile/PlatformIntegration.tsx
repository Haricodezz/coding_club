'use client';
import React, { useState } from 'react';
import type { User as AppUser } from '@/types';
import { Target, Star, Trophy, RefreshCw, Zap, ExternalLink, Trash2, Edit2, Check, X } from 'lucide-react';
import { LeetCodeSyncWidget } from '../sync/LeetCodeSyncWidget';
import { getSupabase } from '@/lib/supabase';

export function UnifiedStats({ profile, stats }: { profile: AppUser, stats: { streak: number, qotdPoints: number, contestPoints: number } }) {
  const [showFire, setShowFire] = useState(false);

  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--color-surface-2)', border: '1px solid rgba(108,99,255,0.2)' }}>
      <h3 className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
        <Target size={20} color="var(--accent)" /> Unified Statistics
      </h3>

      <div className="flex justify-between items-center" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(10,10,15,0.4)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
        <div className="flex-col gap-1">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Points</span>
          <span style={{ fontSize: '3rem', fontWeight: 900, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
            {profile.total_points || 0}
          </span>
        </div>
        
        <div 
          className="flex-col items-center justify-center cursor-pointer" 
          style={{ width: '80px', height: '80px', borderRadius: '50%', background: showFire ? 'rgba(249,115,22,0.1)' : 'var(--color-bg-2)', border: showFire ? '2px solid rgba(249,115,22,0.5)' : '1px solid var(--color-border)', transition: 'all 0.3s' }}
          onMouseEnter={() => setShowFire(true)}
          onMouseLeave={() => setShowFire(false)}
        >
          <span style={{ fontSize: '1.8rem', filter: showFire ? 'drop-shadow(0 0 8px rgba(249,115,22,0.8))' : 'none', transform: showFire ? 'scale(1.2)' : 'none', transition: 'all 0.3s' }}>
            🔥
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: showFire ? '#f97316' : 'var(--text-muted)', marginTop: '0.2rem' }}>{stats.streak} Days</span>
        </div>
      </div>

      <div className="grid-3" style={{ gap: '1rem' }}>
        <div className="flex-col gap-1 p-3" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <span className="flex items-center gap-1 text-xs text-muted"><Trophy size={12} color="var(--gold)" /> CP Points</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{profile.lc_points || 0}</span>
        </div>
        <div className="flex-col gap-1 p-3" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <span className="flex items-center gap-1 text-xs text-muted"><Star size={12} color="var(--accent-3)" /> QotD</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.qotdPoints}</span>
        </div>
        <div className="flex-col gap-1 p-3" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <span className="flex items-center gap-1 text-xs text-muted"><Zap size={12} color="#f59e0b" /> Contest</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.contestPoints}</span>
        </div>
      </div>
    </div>
  );
}

export function PlatformIntegration({ 
  profile, 
  isOwnProfile, 
  onSyncLeetCode, 
  syncing 
}: { 
  profile: AppUser, 
  isOwnProfile: boolean, 
  onSyncLeetCode: (p?: AppUser) => void, 
  syncing: boolean 
}) {
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);

  const platforms = [
    { 
      id: 'github', 
      name: 'GitHub', 
      username: profile.github_username, 
      dbField: 'github_username',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
          <path d="M9 18c-4.51 2-5-2-7-2"></path>
        </svg>
      ), 
      getLink: (val: string) => val.startsWith('http') ? val : `https://github.com/${val}`,
      placeholder: 'Enter GitHub username'
    },
    { 
      id: 'codeforces', 
      name: 'Codeforces', 
      username: profile.codeforces_username, 
      dbField: 'codeforces_username',
      icon: <span style={{ color: '#ef4444', fontWeight: 800 }}>CF</span>, 
      getLink: (val: string) => val.startsWith('http') ? val : `https://codeforces.com/profile/${val}`,
      placeholder: 'Enter Codeforces handle'
    },
    { 
      id: 'hackerrank', 
      name: 'HackerRank', 
      username: profile.hackerrank_username, 
      dbField: 'hackerrank_username',
      icon: <span style={{ color: '#22c55e', fontWeight: 800 }}>HR</span>, 
      getLink: (val: string) => val.startsWith('http') ? val : `https://hackerrank.com/${val}`,
      placeholder: 'Enter HackerRank username'
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      username: profile.linkedin_url, 
      dbField: 'linkedin_url',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0077b5' }}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
          <rect width="4" height="12" x="2" y="9"></rect>
          <circle cx="4" cy="4" r="2"></circle>
        </svg>
      ), 
      getLink: (val: string) => val.startsWith('http') ? val : `https://linkedin.com/in/${val}`,
      placeholder: 'Enter LinkedIn username or URL'
    },
  ];

  const handleSave = async (platformId: string, dbField: string) => {
    if (!inputValue.trim()) return;
    setLoadingPlatform(platformId);
    try {
      const supabase = getSupabase();
      const { error } = await (supabase as any)
        .from('users')
        .update({ [dbField]: inputValue.trim() })
        .eq('id', profile.id);

      if (!error) {
        onSyncLeetCode({
          ...profile,
          [dbField]: inputValue.trim()
        } as AppUser);
        setEditingPlatform(null);
        setInputValue('');
      } else {
        console.error('Failed to link platform:', error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlatform(null);
    }
  };

  const handleDisconnect = async (platformId: string, dbField: string) => {
    if (!window.confirm(`Are you sure you want to disconnect your ${platformId} handle?`)) return;
    setLoadingPlatform(platformId);
    try {
      const supabase = getSupabase();
      const { error } = await (supabase as any)
        .from('users')
        .update({ [dbField]: null })
        .eq('id', profile.id);

      if (!error) {
        onSyncLeetCode({
          ...profile,
          [dbField]: null
        } as AppUser);
      } else {
        console.error('Failed to unlink platform:', error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlatform(null);
    }
  };

  return (
    <div className="flex-col gap-4">
      {/* Advanced LeetCode Integration Widget */}
      <LeetCodeSyncWidget profile={profile} isOwnProfile={isOwnProfile} onProfileUpdate={onSyncLeetCode} />

      {/* Other Platforms */}
      <div className="card">
        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔗 Connect External Platforms
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', marginTop: 0 }}>
          Optional handles. Linking your accounts enables public clickable links for visitors.
        </p>

        <div className="flex-col gap-3">
          {platforms.map(platform => {
            const isEditing = editingPlatform === platform.id;
            const isLoading = loadingPlatform === platform.id;

            return (
              <div 
                key={platform.id} 
                className="flex justify-between items-center" 
                style={{ 
                  padding: '0.75rem 1rem', 
                  background: 'var(--color-surface-2)', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1px solid var(--color-border)' 
                }}
              >
                {/* Platform Label / Input */}
                <div className="flex items-center gap-3" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '1.5rem', justifyContent: 'center' }}>
                    {platform.icon}
                  </div>
                  
                  {isEditing ? (
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder={platform.placeholder}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', flex: 1, maxWidth: '220px' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(platform.id, platform.dbField); }}
                      disabled={isLoading}
                      autoFocus
                    />
                  ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {platform.name}
                    </span>
                  )}
                </div>

                {/* Platform Value / Link / Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isEditing ? (
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleSave(platform.id, platform.dbField)}
                        className="btn btn-primary btn-sm p-1"
                        style={{ background: 'var(--accent)', color: '#FFF', display: 'flex', alignItems: 'center' }}
                        disabled={isLoading}
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => { setEditingPlatform(null); setInputValue(''); }}
                        className="btn btn-ghost btn-sm p-1"
                        style={{ display: 'flex', alignItems: 'center' }}
                        disabled={isLoading}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : platform.username ? (
                    <div className="flex items-center gap-2">
                      {/* Clickable Public Link (Visible to anyone!) */}
                      <a 
                        href={platform.getLink(platform.username)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="badge badge-secondary flex items-center gap-1"
                        style={{ fontSize: '0.78rem', textDecoration: 'none', color: 'var(--accent-3)', fontWeight: 600, padding: '0.25rem 0.5rem' }}
                      >
                        @{platform.username.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '')} <ExternalLink size={11} />
                      </a>

                      {/* Edit / Disconnect Actions (Only for profile owner!) */}
                      {isOwnProfile && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => { setEditingPlatform(platform.id); setInputValue(platform.username || ''); }}
                            className="btn btn-ghost btn-sm p-1"
                            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDisconnect(platform.id, platform.dbField)}
                            className="btn btn-ghost btn-sm p-1"
                            style={{ color: 'var(--accent-2)', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {isOwnProfile ? (
                        <button 
                          onClick={() => { setEditingPlatform(platform.id); setInputValue(''); }}
                          className="btn btn-primary btn-sm" 
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Connect
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Not linked</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
