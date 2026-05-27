'use client';
import React, { useState } from 'react';
import { Mail, Link as LinkIcon, Edit3, Award } from 'lucide-react';
import type { User as AppUser } from '@/types';

interface ProfileHeaderProps {
  profile: AppUser;
  isOwnProfile: boolean;
  onEdit: () => void;
}

export function ProfileHeader({ profile, isOwnProfile, onEdit }: ProfileHeaderProps) {
  const avatarUrl = profile.avatar_url?.startsWith('http') ? profile.avatar_url : `/avatars/${profile.avatar_url || 'avatar_0.svg'}`;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Gradient Header Banner */}
      <div 
        style={{ 
          height: '160px', 
          background: profile.cover_url 
            ? `url("${profile.cover_url}") center/cover no-repeat` 
            : 'linear-gradient(135deg, rgba(108, 99, 255, 0.4), rgba(236, 72, 153, 0.2))',
          backgroundImage: profile.cover_url 
            ? `url("${profile.cover_url}")` 
            : 'radial-gradient(circle at 50% 50%, rgba(108,99,255,0.4), transparent), url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z\' fill=\'%23ffffff\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} 
      />
      
      {isOwnProfile && (
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={onEdit}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(10,10,15,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Edit3 size={14} /> Edit Profile
        </button>
      )}

      <div style={{ padding: '0 2rem 2rem 2rem', marginTop: '-60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <img
            src={avatarUrl}
            alt={profile.username}
            style={{ 
              width: '140px', height: '140px', objectFit: 'cover', borderRadius: '50%', 
              border: '4px solid var(--color-surface)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              background: 'var(--color-bg-2)'
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
          />
        </div>

        {/* Info */}
        <h1 style={{ marginTop: '1rem', marginBottom: '0.2rem', fontSize: '1.75rem', fontWeight: 800 }}>
          {profile.full_name || profile.username}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1rem' }}>@{profile.username}</p>

        {/* Bio */}
        {profile.bio ? (
          <p style={{ textAlign: 'center', maxWidth: '600px', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {profile.bio}
          </p>
        ) : (
          <p style={{ textAlign: 'center', maxWidth: '600px', color: '#64748b', marginBottom: '1.5rem', fontStyle: 'italic', fontSize: '0.9rem' }}>
            {isOwnProfile ? "You haven't written a bio yet. Tell the world about yourself!" : "This user prefers to keep their bio a mystery."}
          </p>
        )}

        {/* Badges */}
        <div className="flex gap-2 wrap justify-center" style={{ marginBottom: '2rem' }}>
          {profile.role === 'team' && <span className="badge" style={{ background: 'var(--accent-gradient)', color: '#fff', border: 'none' }}>Team Member</span>}
          {profile.branch && <span className="badge badge-cp">{profile.branch}</span>}
          {profile.academic_year && <span className="badge badge-sd">Year {profile.academic_year}</span>}
        </div>

        {/* Social Links Row */}
        <div className="flex gap-4 justify-center" style={{ width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
          {profile.github_username && (
            <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <span>🐙 GitHub</span>
            </a>
          )}
          {profile.leetcode_username && (
            <a href={`https://leetcode.com/${profile.leetcode_username}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#FFA116'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <span>♨️ LeetCode</span>
            </a>
          )}
          {profile.linkedin_url && (
            <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <span>🔗 LinkedIn</span>
            </a>
          )}
          {profile.portfolio_url && (
            <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-3)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <LinkIcon size={18} /> <span>Portfolio</span>
            </a>
          )}
          <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-muted" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <Mail size={18} /> <span>Email</span>
          </a>
        </div>
      </div>
    </div>
  );
}
