'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';

import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AcademicDetails } from '@/components/profile/AcademicDetails';
import { UnifiedStats, PlatformIntegration } from '@/components/profile/PlatformIntegration';
import { PerformanceAnalytics } from '@/components/profile/PerformanceAnalytics';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [profileStats, setProfileStats] = useState({ streak: 0, qotdPoints: 0, contestPoints: 0 });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ avatar_url: '', cover_url: '' });

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (!user) { setLoading(false); return; }
      setProfile(user as unknown as AppUser);

      // Fetch leaderboard and streaks
      const [{ data: streakData }, { data: lb }] = await Promise.all([
        (supabase as any).from('streaks').select('current_streak').eq('user_id', user.id).single(),
        (supabase as any).from('leaderboard').select('*').eq('id', user.id).single()
      ]);

      setProfileStats({
        streak: streakData?.current_streak || 0,
        qotdPoints: lb?.qotd_points || 0,
        contestPoints: lb?.contest_points || 0
      });

      setLoading(false);
    }
    load();
  }, [username]);

  function handleSyncLeetCode(p?: AppUser) {
    if (p) {
      setProfile(p);
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;
    const supabase = getSupabase();
    const { error } = await (supabase as any)
      .from('users')
      .update({ avatar_url: editForm.avatar_url, cover_url: editForm.cover_url })
      .eq('id', profile.id);
    
    if (!error) {
      setProfile({ ...profile, ...editForm } as AppUser);
      setIsEditing(false);
    }
  }

  function openEditModal() {
    if (profile) {
      setEditForm({ avatar_url: profile.avatar_url || '', cover_url: profile.cover_url || '' });
      setIsEditing(true);
    }
  }

  if (loading) {
    return (
      <div className="page-wrapper" style={{ paddingTop: 'calc(var(--navbar-height) + 2rem)' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <Skeleton style={{ height: '300px', marginBottom: '2rem' }} />
          <div className="grid-2" style={{ gap: '2rem' }}>
            <Skeleton style={{ height: '400px' }} />
            <Skeleton style={{ height: '400px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ maxWidth: 1000 }}>
          <div className="empty-state">
            <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>👤</span>
            <h3>User not found</h3>
            <p>The profile "{username}" doesn't exist.</p>
            <button className="btn btn-primary mt-4" onClick={() => router.push('/leaderboard')}>View Leaderboard</button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;

  return (
    <div className="page-wrapper" style={{ paddingTop: 'calc(var(--navbar-height) + 2rem)' }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        
        {/* Header Widget */}
        <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
          <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} onEdit={openEditModal} />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <button 
            onClick={() => setActiveTab('overview')}
            style={{ 
              background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
              color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'overview' ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: activeTab === 'overview' ? 600 : 400, fontSize: '0.95rem'
            }}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            style={{ 
              background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
              color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'analytics' ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: activeTab === 'analytics' ? 600 : 400, fontSize: '0.95rem'
            }}
          >
            Performance Analytics
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="grid-2 animate-slide-in" style={{ gap: '2rem', alignItems: 'start' }}>
            <div className="flex-col gap-6">
              <UnifiedStats profile={profile} stats={profileStats} />
              <AcademicDetails profile={profile} isOwnProfile={isOwnProfile} />
            </div>
            <div className="flex-col gap-6">
              <PlatformIntegration profile={profile} isOwnProfile={isOwnProfile} onSyncLeetCode={handleSyncLeetCode} syncing={syncing} />
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <PerformanceAnalytics userId={profile.id} />
          </div>
        )}
        
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', background: 'var(--color-bg-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Edit Profile Images</h3>
            <div className="flex-col gap-4">
              <div>
                <label className="form-label">Profile Picture URL (Public Link)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                  placeholder="https://example.com/my-avatar.jpg"
                />
              </div>
              <div>
                <label className="form-label">Cover Picture URL (Public Link)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editForm.cover_url}
                  onChange={(e) => setEditForm({...editForm, cover_url: e.target.value})}
                  placeholder="https://example.com/my-cover.jpg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3" style={{ marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
