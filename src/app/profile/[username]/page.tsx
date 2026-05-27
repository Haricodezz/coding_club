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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      // 1. Image Optimization using Canvas
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No canvas context');
          
          // Crop to 1:1 ratio
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, 512, 512);
          
          // Convert to WebP
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject('Conversion failed');
          }, 'image/webp', 0.9);
        };
        img.src = url;
      });

      // 2. Upload to Supabase Storage
      const supabase = getSupabase();
      const fileName = `user_avatar_${Date.now()}.webp`;
      
      const { data, error } = await supabase.storage
        .from('public-assets')
        .upload(`avatars/${fileName}`, optimizedBlob, { contentType: 'image/webp' });

      if (error) {
        console.warn('Storage upload failed, please ensure a public bucket named "public-assets" exists.', error);
        alert(`Storage Error: ${error.message}`);
        setUploadingAvatar(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('public-assets').getPublicUrl(`avatars/${fileName}`);
      setEditForm(prev => ({ ...prev, avatar_url: publicUrlData.publicUrl }));
    } catch (err: any) {
      alert('Error uploading avatar: ' + (err.message || err));
    } finally {
      setUploadingAvatar(false);
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
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '500px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>Edit Profile Images</h3>
            
            <div className="flex-col gap-5">
              {/* Image Preview Area */}
              <div className="flex gap-4 items-center" style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: '12px' }}>
                <img 
                  src={editForm.avatar_url?.startsWith('http') ? editForm.avatar_url : `/avatars/${editForm.avatar_url || 'avatar_0.svg'}`} 
                  alt="Avatar Preview" 
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--brand-primary)', boxShadow: '0 4px 15px rgba(108,99,255,0.2)' }} 
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Live Preview</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choose a preset below or upload a custom image.</p>
                </div>
              </div>

              {/* Upload Custom File */}
              {((profile.role !== 'student') ? (
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Upload Custom Avatar</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="form-input" 
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  />
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Auto-converts to optimized WebP format (512x512px).</p>
                </div>
              ) : (
                <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  🔒 Custom file uploads are reserved for team members and mentors. Please provide a public image URL or select a preset below.
                </div>
              ))}

              {/* Preset Selector Grid */}
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Select Preset Avatar</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(10, 1fr)', 
                  gap: '0.4rem', 
                  background: 'var(--color-surface-2)', 
                  padding: '0.75rem', 
                  borderRadius: '8px',
                  maxHeight: '110px',
                  overflowY: 'auto'
                }}>
                  {Array.from({ length: 20 }).map((_, idx) => {
                    const name = `avatar_${idx}.svg`;
                    const isSelected = editForm.avatar_url === name;
                    return (
                      <img
                        key={name}
                        src={`/avatars/${name}`}
                        alt={`Preset ${idx}`}
                        onClick={() => setEditForm(prev => ({ ...prev, avatar_url: name }))}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--color-border)',
                          padding: '1.5px',
                          background: isSelected ? 'rgba(108,99,255,0.15)' : 'var(--color-surface)',
                          transition: 'transform 0.1s, border-color 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Manual URL Input */}
              <div>
                <label className="form-label">Or paste public Avatar URL</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                  placeholder="https://example.com/my-avatar.jpg"
                />
              </div>

              {/* Cover URL Input */}
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

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={uploadingAvatar}>
                {uploadingAvatar ? 'Uploading...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
