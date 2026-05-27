'use client';

import { useEffect, useState } from 'react';
import { getTeamMembersAdmin, saveTeamMember, deleteTeamMember } from '../actions';
import type { CmsTeamMember } from '@/types/cms';

export default function AdminTeam() {
  const [team, setTeam] = useState<CmsTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('/avatars/avatar_0.svg');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [bio, setBio] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      const data = await getTeamMembersAdmin();
      setTeam(data as unknown as CmsTeamMember[]);
      setLoading(false);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await saveTeamMember(editingId, {
        name,
        role,
        avatar_url: avatarUrl,
        github_url: githubUrl || undefined,
        linkedin_url: linkedinUrl || undefined,
        bio: bio || undefined,
        display_order: displayOrder,
        is_active: isActive,
      });
      setMessage({
        text: editingId ? 'Team member updated successfully!' : 'Team member added successfully!',
        type: 'success'
      });
      resetForm();
      await loadTeam();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    try {
      await deleteTeamMember(id);
      setMessage({ text: 'Team member removed successfully!', type: 'success' });
      await loadTeam();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  function startEdit(item: CmsTeamMember) {
    setEditingId(item.id);
    setName(item.name);
    setRole(item.role);
    setAvatarUrl(item.avatar_url);
    setGithubUrl(item.github_url || '');
    setLinkedinUrl(item.linkedin_url || '');
    setBio(item.bio || '');
    setDisplayOrder(item.display_order);
    setIsActive(item.is_active);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setRole('');
    setAvatarUrl('/avatars/avatar_0.svg');
    setGithubUrl('');
    setLinkedinUrl('');
    setBio('');
    setDisplayOrder(0);
    setIsActive(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-team">
      <div className="page-header animate-fade-in">
        <p className="eyebrow">👥 Team Roster</p>
        <h1>Manage <span className="gradient-text">Team Members</span></h1>
        <p>Add people to the public club team page.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Create / Edit Form */}
        <div className="card glass">
          <h3>{editingId ? 'Edit Team Member' : '+ Add Team Member'}</h3>
          <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <input
                type="text"
                required
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Co-Lead, Designer"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Avatar URL</label>
              <input
                type="text"
                required
                className="form-input"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="/avatars/avatar_0.svg or https://..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bio (Optional)</label>
              <textarea
                className="form-input"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">GitHub URL (Optional)</label>
              <input
                type="url"
                className="form-input"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">LinkedIn URL (Optional)</label>
              <input
                type="url"
                className="form-input"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                className="form-input"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="isActive" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Visible to public</label>
            </div>

            <div className="flex gap-2" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Member' : 'Add Member'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Team Members */}
        <div className="card glass">
          <h3>Team Roster ({team.length})</h3>
          <div className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            {team.length === 0 ? (
              <p style={{ color: '#64748b' }}>No team members added yet.</p>
            ) : (
              [...team].sort((a, b) => a.display_order - b.display_order).map((item) => (
                <div key={item.id} className="card" style={{ background: 'var(--color-surface-2)', opacity: item.is_active ? 1 : 0.6 }}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <img 
                        src={item.avatar_url} 
                        alt={item.name}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '50%' }}
                        onError={(e) => (e.currentTarget.src = '/avatars/avatar_0.svg')}
                      />
                      <div>
                        <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>
                          {item.name}
                          {!item.is_active && <span className="badge badge-secondary ml-2" style={{ fontSize: '0.65rem' }}>Hidden</span>}
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--accent)', margin: 0 }}>{item.role}</p>
                        {item.bio && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>{item.bio.substring(0, 60)}{item.bio.length > 60 ? '...' : ''}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)} style={{ color: 'var(--color-error)' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
