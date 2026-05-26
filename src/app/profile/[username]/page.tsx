'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';

const AVATARS = Array.from({ length: 20 }, (_, i) => `avatar_${i}.svg`);

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Edit form state
  const [selectedAvatar, setSelectedAvatar] = useState('avatar_0.svg');
  const [formData, setFormData] = useState<Partial<AppUser>>({});
  const [saveMsg, setSaveMsg] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();

      // Current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      // Fetch profile by username
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (!user) { setLoading(false); return; }
      setProfile(user as unknown as AppUser);
      setSelectedAvatar(user.avatar_url || 'avatar_0.svg');
      setFormData(user as unknown as Partial<AppUser>);

      setLoading(false);
    }
    load();
  }, [username]);

  async function handleSave() {
    setSaving(true);
    // Remove read-only/computed fields before sending to API
    const { id, created_at, updated_at, total_points, lc_points, lc_easy_solved, lc_medium_solved, lc_hard_solved, lc_total_solved, ...updatePayload } = formData as any;
    
    updatePayload.avatar_url = selectedAvatar;

    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });
    
    const json = await res.json();
    if (json.data) {
      setProfile(json.data);
      setSaveMsg('Profile updated!');
      setTimeout(() => setSaveMsg(''), 3000);
    }
    setSaving(false);
    setEditing(false);
  }

  async function handleSyncLeetCode() {
    if (!profile?.leetcode_username) return;
    setSyncing(true);
    setSaveMsg('');
    
    try {
      const res = await fetch('/api/sync/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: profile.leetcode_username })
      });
      const data = await res.json();
      
      if (res.ok) {
        setSaveMsg(`Synced successfully! +${data.points} pts`);
        // reload profile
        const supabase = getSupabase();
        const { data: userData } = await supabase.from('users').select('*').eq('id', profile.id).single();
        if (userData) {
          setProfile(userData as unknown as AppUser);
          setFormData(userData as unknown as Partial<AppUser>);
        }
      } else {
        alert(data.error || 'Failed to sync');
      }
    } catch (e: any) {
      alert(e.message);
    }
    
    setSyncing(false);
    setTimeout(() => setSaveMsg(''), 4000);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwdMsg({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    setSaving(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwdMsg({ text: error.message, type: 'error' });
    } else {
      setPwdMsg({ text: 'Password updated successfully!', type: 'success' });
      setNewPassword('');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-wrapper">
        <div className="container">
          <div className="empty-state">
            <span className="empty-state-icon">👤</span>
            <h3>User not found</h3>
            <p>The profile "{username}" doesn't exist.</p>
            <button className="btn btn-primary" onClick={() => router.push('/leaderboard')}>View Leaderboard</button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 1000 }}>
        {saveMsg && <div className="alert alert-success animate-slide-in" style={{ marginBottom: '1.5rem' }}>✅ {saveMsg}</div>}

        <div className="grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
          {/* Left: Profile Card */}
          <div className="flex-col gap-4">
            <div className="card text-center" style={{ border: '1px solid rgba(108,99,255,0.25)', position: 'relative' }}>
              {/* Avatar */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <div className="profile-avatar-ring">
                  <img
                    src={profile.avatar_url?.startsWith('http') ? profile.avatar_url : `/avatars/${profile.avatar_url || 'avatar_0.svg'}`}
                    alt={profile.username}
                    className="profile-avatar"
                    style={{ objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                  />
                </div>
              </div>

              <h2 style={{ marginBottom: '0.25rem' }}>{profile.full_name || profile.username}</h2>
              <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>@{profile.username}</p>
              
              {profile.bio && <p style={{ fontSize: '0.9rem', marginBottom: '1rem', fontStyle: 'italic' }}>"{profile.bio}"</p>}

              <div className="flex justify-center gap-2 wrap" style={{ marginBottom: '1.5rem' }}>
                {profile.branch && <span className="badge">{profile.branch}</span>}
                {profile.academic_year && <span className="badge">Year {profile.academic_year}</span>}
                {profile.role === 'team' && <span className="badge badge-primary">Team Member</span>}
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="stat-box" style={{ padding: '0.875rem' }}>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--accent-3)' }}>{profile.total_points || 0}</div>
                  <div className="stat-label">Total Points</div>
                </div>
                <div className="stat-box" style={{ padding: '0.875rem' }}>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--accent-1)' }}>{profile.lc_points || 0}</div>
                  <div className="stat-label">LeetCode Pts</div>
                </div>
              </div>

              {isOwnProfile && !editing && (
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setEditing(true)}>
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {/* LeetCode Sync Card */}
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>💚 LeetCode</h4>
                {isOwnProfile && profile.leetcode_username && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={handleSyncLeetCode}
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing...' : '🔄 Sync Now'}
                  </button>
                )}
              </div>
              
              {!profile.leetcode_username ? (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  No LeetCode account linked.{isOwnProfile ? ' Edit your profile to add it.' : ''}
                </p>
              ) : (
                <div className="flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: '#94a3b8' }}>Username</span>
                    <strong>@{profile.leetcode_username}</strong>
                  </div>
                  
                  <div className="flex gap-2" style={{ marginTop: '0.5rem' }}>
                    <div style={{ flex: 1, background: 'rgba(34,197,94,0.1)', padding: '0.5rem', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '1.2rem' }}>{profile.lc_easy_solved || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Easy</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(234,179,8,0.1)', padding: '0.5rem', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid rgba(234,179,8,0.2)' }}>
                      <div style={{ color: '#eab308', fontWeight: 700, fontSize: '1.2rem' }}>{profile.lc_medium_solved || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Medium</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.2rem' }}>{profile.lc_hard_solved || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Hard</div>
                    </div>
                  </div>
                  
                  {profile.lc_last_synced_at && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right', marginTop: '0.5rem' }}>
                      Last synced: {new Date(profile.lc_last_synced_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Other Platforms */}
            <div className="card">
              <h4 style={{ marginBottom: '1rem' }}>🔗 Other Platforms</h4>
              <div className="flex-col gap-2">
                {profile.codeforces_username ? (
                  <div className="flex justify-between items-center" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span className="flex items-center gap-2">🔴 Codeforces</span>
                    <strong>@{profile.codeforces_username}</strong>
                  </div>
                ) : null}
                {profile.hackerrank_username ? (
                  <div className="flex justify-between items-center" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span className="flex items-center gap-2">🟡 HackerRank</span>
                    <strong>@{profile.hackerrank_username}</strong>
                  </div>
                ) : null}
                {profile.github_username ? (
                  <div className="flex justify-between items-center" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span className="flex items-center gap-2">🐙 GitHub</span>
                    <a href={`https://github/${profile.github_username}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-2)' }}>@{profile.github_username}</a>
                  </div>
                ) : null}
                {!profile.codeforces_username && !profile.hackerrank_username && !profile.github_username && (
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No other platforms linked.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Edit Panel OR Details */}
          <div>
            {editing ? (
              <div className="card animate-slide-in">
                <h3 style={{ marginBottom: '1.5rem' }}>✏️ Edit Profile</h3>

                {/* Avatar Picker */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Choose Avatar</label>
                  <div className="avatar-grid">
                    {AVATARS.map(av => (
                      <div
                        key={av}
                        className={`avatar-option ${selectedAvatar === av ? 'selected' : ''}`}
                        onClick={() => setSelectedAvatar(av)}
                      >
                        <img
                          src={`/avatars/${av}`}
                          alt={av}
                          width={72}
                          height={72}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="divider" />

                {/* Basic Info */}
                <div className="flex-col gap-3" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Basic Information</label>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Full Name</label>
                    <input className="form-input" value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Bio</label>
                    <textarea className="form-input" value={formData.bio || ''} onChange={e => setFormData({...formData, bio: e.target.value})} rows={2} />
                  </div>
                </div>
                
                {/* Academic Info */}
                <div className="flex-col gap-3" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Academic Details</label>
                  <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Roll Number</label>
                      <input className="form-input" value={formData.roll_number || ''} onChange={e => setFormData({...formData, roll_number: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Year (1-4)</label>
                      <input className="form-input" type="number" min={1} max={4} value={formData.academic_year || ''} onChange={e => setFormData({...formData, academic_year: parseInt(e.target.value)})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Branch (e.g. CSE)</label>
                      <input className="form-input" value={formData.branch || ''} onChange={e => setFormData({...formData, branch: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Platform Handles */}
                <div className="flex-col gap-3" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Platform Handles</label>
                  <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>LeetCode Username</label>
                      <input className="form-input" value={formData.leetcode_username || ''} onChange={e => setFormData({...formData, leetcode_username: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Codeforces Handle</label>
                      <input className="form-input" value={formData.codeforces_username || ''} onChange={e => setFormData({...formData, codeforces_username: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>HackerRank Handle</label>
                      <input className="form-input" value={formData.hackerrank_username || ''} onChange={e => setFormData({...formData, hackerrank_username: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>GitHub Username</label>
                      <input className="form-input" value={formData.github_username || ''} onChange={e => setFormData({...formData, github_username: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>

                <hr className="divider" style={{ margin: '2rem 0' }} />

                <h3 style={{ marginBottom: '1.5rem', color: '#f87171' }}>🔒 Change Password</h3>
                {pwdMsg && (
                  <div className={`alert alert-${pwdMsg.type}`} style={{ marginBottom: '1.5rem' }}>
                    {pwdMsg.type === 'error' ? '❌' : '✅'} {pwdMsg.text}
                  </div>
                )}
                <form onSubmit={handlePasswordChange} className="flex-col gap-3">
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary" disabled={saving || !newPassword}>
                    Update Password
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-col gap-4">
                <div className="card">
                  <h4 style={{ marginBottom: '1rem' }}>🎓 Academic Details</h4>
                  <div className="flex-col gap-3" style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                    <div className="flex justify-between border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--color-border)' }}>
                      <span style={{ color: '#94a3b8' }}>Roll Number</span>
                      <span>{profile.roll_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--color-border)' }}>
                      <span style={{ color: '#94a3b8' }}>Year</span>
                      <span>{profile.academic_year || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--color-border)' }}>
                      <span style={{ color: '#94a3b8' }}>Branch</span>
                      <span>{profile.branch || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between" style={{ paddingBottom: '0.5rem', borderColor: 'var(--color-border)' }}>
                      <span style={{ color: '#94a3b8' }}>Email</span>
                      <span>{profile.email}</span>
                    </div>
                  </div>
                </div>

                {profile.portfolio_url || profile.linkedin_url ? (
                  <div className="card">
                    <h4 style={{ marginBottom: '1rem' }}>🌐 Links</h4>
                    <div className="flex gap-3">
                      {profile.portfolio_url && (
                        <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="btn btn-secondary">Portfolio</a>
                      )}
                      {profile.linkedin_url && (
                        <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="btn btn-secondary">LinkedIn</a>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
