'use client';
import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, X, History, TrendingUp, Zap, ExternalLink } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';

export function LeetCodeSyncWidget({ profile, isOwnProfile, onProfileUpdate }: { profile: AppUser, isOwnProfile: boolean, onProfileUpdate: (p: AppUser) => void }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  
  const [breakdown, setBreakdown] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (showHistory && isOwnProfile) {
      loadHistory();
    }
  }, [showHistory, isOwnProfile]);

  async function loadHistory() {
    const res = await fetch('/api/sync/history');
    if (res.ok) {
      const { data } = await res.json();
      setHistory(data || []);
    }
  }

  async function handleConnect() {
    if (!usernameInput) return;
    setIsConnecting(true);
    setSyncStatus('idle');
    try {
      const res = await fetch('/api/sync/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: usernameInput, force: true })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus('success');
        setSyncMessage('Successfully connected!');
        // Refresh profile
        const supabase = getSupabase();
        const { data: userData } = await supabase.from('users').select('*').eq('id', profile.id).single();
        if (userData) onProfileUpdate(userData as unknown as AppUser);
      } else {
        setSyncStatus('error');
        setSyncMessage(data.error || 'Failed to connect');
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncMessage(e.message);
    }
    setIsConnecting(false);
  }

  async function handleSync(force = false) {
    if (!profile.leetcode_username) return;
    setSyncing(true);
    setSyncStatus('idle');
    try {
      const res = await fetch('/api/sync/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: profile.leetcode_username, force })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus('success');
        setSyncMessage('Synced recently');
        if (data.breakdown && data.points > 0) {
          setBreakdown(data.breakdown);
        }
        // Refresh profile
        const supabase = getSupabase();
        const { data: userData } = await supabase.from('users').select('*').eq('id', profile.id).single();
        if (userData) onProfileUpdate(userData as unknown as AppUser);
      } else {
        setSyncStatus('error');
        setSyncMessage(data.error || 'Rate limited or error');
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncMessage('Network error, retry later');
    }
    setSyncing(false);
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect your LeetCode account?")) return;
    const supabase = getSupabase();
    await (supabase as any).from('users').update({ leetcode_username: null }).eq('id', profile.id);
    onProfileUpdate({ ...profile, leetcode_username: undefined });
    setSyncStatus('idle');
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
        <h4 className="flex items-center gap-2" style={{ margin: 0 }}>
          <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>♨️</span> LeetCode
        </h4>
        {isOwnProfile && profile.leetcode_username && (
          <div className="flex items-center gap-3">
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => handleSync(false)}
              disabled={syncing}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              <RefreshCw size={14} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(!showHistory)}>
              <History size={14} />
            </button>
          </div>
        )}
      </div>
      
      {!profile.leetcode_username ? (
        <div className="empty-state text-center" style={{ padding: '1.5rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>No LeetCode account linked.</p>
          {isOwnProfile && (
            <div className="flex gap-2 justify-center">
              <input 
                type="text" 
                className="form-input" 
                placeholder="LeetCode Username" 
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                style={{ width: '200px' }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? 'Verifying...' : 'Connect'}
              </button>
            </div>
          )}
          {syncStatus === 'error' && <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{syncMessage}</p>}
        </div>
      ) : (
        <div className="flex-col gap-4 animate-fade-in">
          <div className="flex justify-between items-center bg-surface p-2" style={{ background: 'var(--color-surface-2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="flex-col">
              <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {/* Clickable LeetCode profile handle */}
                <a 
                  href={`https://leetcode.com/${profile.leetcode_username}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 hover:underline"
                  style={{ color: '#FFA116', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                >
                  @{profile.leetcode_username} <ExternalLink size={12} style={{ marginLeft: '2px' }} />
                </a>
                <span className="badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>CONNECTED</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {syncStatus === 'success' ? <span style={{ color: '#22c55e' }}><CheckCircle size={10} style={{ display: 'inline' }} /> {syncMessage}</span> :
                 syncStatus === 'error' ? <span style={{ color: 'var(--error)' }}><AlertCircle size={10} style={{ display: 'inline' }} /> {syncMessage}</span> : 
                 profile.lc_last_synced_at ? `Last synced: ${new Date(profile.lc_last_synced_at).toLocaleString()}` : 'Never synced'}
              </span>
            </div>
            {isOwnProfile && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={handleDisconnect}>
                Disconnect
              </button>
            )}
          </div>
          
          {/* Circular division gauge chart & details cards */}
          {(() => {
            const easySolved = profile.lc_easy_solved || 0;
            const mediumSolved = profile.lc_medium_solved || 0;
            const hardSolved = profile.lc_hard_solved || 0;
            const totalSolved = easySolved + mediumSolved + hardSolved;
            const grandTotal = 3944;

            // Segmented SVG circular ring calculations
            const r = 38;
            const c = 2 * Math.PI * r; // ~238.76
            const solvedRef = totalSolved || 1;
            const easyRatio = easySolved / solvedRef;
            const medRatio = mediumSolved / solvedRef;
            const hardRatio = hardSolved / solvedRef;

            const easyStroke = c * easyRatio;
            const medStroke = c * medRatio;
            const hardStroke = c * hardRatio;

            return (
              <div className="flex items-center gap-5 justify-between" style={{ padding: '0.5rem 0', flexWrap: 'wrap' }}>
                
                {/* Left Side: Circular SVG doughnut gauge */}
                <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <svg viewBox="0 0 100 100" width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background track */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r={r} 
                      stroke="rgba(255,255,255,0.05)" 
                      strokeWidth="8" 
                      fill="none" 
                    />
                    {totalSolved > 0 ? (
                      <>
                        {/* Easy Segment (Teal/Green) */}
                        <circle 
                          cx="50" 
                          cy="50" 
                          r={r} 
                          stroke="#22c55e" 
                          strokeWidth="8" 
                          fill="none" 
                          strokeDasharray={`${easyStroke} ${c - easyStroke}`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                        />
                        {/* Medium Segment (Yellow/Orange) */}
                        <circle 
                          cx="50" 
                          cy="50" 
                          r={r} 
                          stroke="#eab308" 
                          strokeWidth="8" 
                          fill="none" 
                          strokeDasharray={`${medStroke} ${c - medStroke}`}
                          strokeDashoffset={-easyStroke}
                          strokeLinecap="round"
                        />
                        {/* Hard Segment (Red) */}
                        <circle 
                          cx="50" 
                          cy="50" 
                          r={r} 
                          stroke="#ef4444" 
                          strokeWidth="8" 
                          fill="none" 
                          strokeDasharray={`${hardStroke} ${c - hardStroke}`}
                          strokeDashoffset={-(easyStroke + medStroke)}
                          strokeLinecap="round"
                        />
                      </>
                    ) : null}
                  </svg>

                  {/* Centered details text */}
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', lineHeight: 1 }}>{totalSolved}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>/{grandTotal}</span>
                    <span style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: 700, marginTop: '0.15rem' }}>✓ Solved</span>
                  </div>
                </div>

                {/* Right Side: Horizontal cards stack detailing totals */}
                <div className="flex-col gap-2" style={{ flex: '1 1 200px' }}>
                  
                  {/* Easy details */}
                  <div 
                    className="flex justify-between items-center" 
                    style={{ 
                      padding: '0.45rem 0.8rem', 
                      background: 'rgba(34,197,94,0.03)', 
                      border: '1px solid rgba(34,197,94,0.1)', 
                      borderRadius: 'var(--radius-sm)' 
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22c55e' }}>Easy</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFF' }}>{easySolved}<span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 500 }}>/946</span></span>
                  </div>

                  {/* Medium details */}
                  <div 
                    className="flex justify-between items-center" 
                    style={{ 
                      padding: '0.45rem 0.8rem', 
                      background: 'rgba(234,179,8,0.03)', 
                      border: '1px solid rgba(234,179,8,0.1)', 
                      borderRadius: 'var(--radius-sm)' 
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#eab308' }}>Med.</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFF' }}>{mediumSolved}<span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 500 }}>/2061</span></span>
                  </div>

                  {/* Hard details */}
                  <div 
                    className="flex justify-between items-center" 
                    style={{ 
                      padding: '0.45rem 0.8rem', 
                      background: 'rgba(239,68,68,0.03)', 
                      border: '1px solid rgba(239,68,68,0.1)', 
                      borderRadius: 'var(--radius-sm)' 
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>Hard</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFF' }}>{hardSolved}<span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 500 }}>/937</span></span>
                  </div>

                </div>

              </div>
            );
          })()}

        </div>
      )}

      {/* History Widget */}
      {showHistory && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <h5 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Recent Sync Log</h5>
          {history.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No sync history found.</p>
          ) : (
            <div className="flex-col gap-2">
              {history.map(log => (
                <div key={log.id} className="flex justify-between items-center" style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex-col gap-1">
                    <span style={{ color: log.status === 'success' ? '#22c55e' : 'var(--error)' }}>
                      {log.status === 'success' ? '✓ Success' : '✗ Failed'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.status === 'success' && (
                    <div className="flex items-center gap-2">
                      <span className="badge" style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--accent)', border: 'none' }}>
                        +{log.credits_earned} pts
                      </span>
                    </div>
                  )}
                  {log.status === 'error' && (
                    <div style={{ color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Credit Breakdown Modal */}
      {breakdown && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
          <div className="card animate-scale-up" style={{ width: '400px', background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg-2) 100%)', border: '1px solid var(--accent)', textAlign: 'center' }}>
            {/* Simple confetti placeholder */}
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Sync Complete!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>You earned <strong style={{ color: 'var(--accent)' }}>{breakdown.baseCredits * breakdown.streakMultiplier}</strong> credits.</p>
            
            <div className="flex-col gap-2 text-left" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '2rem' }}>
              <div className="flex justify-between">
                <span>🟢 Easy ({breakdown.easyDelta})</span>
                <strong>{breakdown.easyDelta * 5} pts</strong>
              </div>
              <div className="flex justify-between">
                <span>🟡 Medium ({breakdown.mediumDelta})</span>
                <strong>{breakdown.mediumDelta * 15} pts</strong>
              </div>
              <div className="flex justify-between">
                <span>🔴 Hard ({breakdown.hardDelta})</span>
                <strong>{breakdown.hardDelta * 30} pts</strong>
              </div>
              <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />
              <div className="flex justify-between">
                <span>🔥 Streak Multiplier</span>
                <strong style={{ color: '#f97316' }}>{breakdown.streakMultiplier}x</strong>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setBreakdown(null)}>Awesome!</button>
          </div>
        </div>
      )}
    </div>
  );
}
