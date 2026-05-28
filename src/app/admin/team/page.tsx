'use client';

import { useEffect, useState, useRef } from 'react';
import { getTeamMembersAdmin, saveTeamMember, deleteTeamMember, getTeamSettingsAdmin, saveTeamSettings } from '../actions';
import type { CmsTeamMember, CmsTeamSettings } from '@/types/cms';
import { getSupabase } from '@/lib/supabase';

const ROLES = [
  { value: 'super_admin', label: 'Founder 👑' },
  { value: 'president', label: 'President 🏛️' },
  { value: 'vice_president', label: 'Vice President 👔' },
  { value: 'lead_mentor', label: 'Lead Mentor 🌟' },
  { value: 'mentor', label: 'Mentor ⭐' },
  { value: 'moderator', label: 'Moderator 🛡️' },
  { value: 'content_creator', label: 'Content Creator ✍️' },
  { value: 'contributor', label: 'Contributor 🛠️' },
  { value: 'community_manager', label: 'Community Manager 🤝' },
  { value: 'team', label: 'Core Team 👥' },
];

export default function AdminTeam() {
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'analytics'>('members');
  const [team, setTeam] = useState<CmsTeamMember[]>([]);
  const [settings, setSettings] = useState<CmsTeamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states - Member
  const [formData, setFormData] = useState<Partial<CmsTeamMember>>({
    name: '', email: '', role: 'team', title: '', department: '',
    avatar_url: '/avatars/avatar_0.svg', background_cover_url: '',
    github_url: '', linkedin_url: '', whatsapp_number: '', discord_handle: '', website_url: '',
    bio: '', expertise_tags: [], display_order: 0,
    is_active: true, is_archived: false, contact_visible: true,
  });

  const [tagInput, setTagInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form states - Settings
  const [settingsData, setSettingsData] = useState<Partial<CmsTeamSettings>>({
    page_title: 'Meet the CodingClub Team',
    page_description: 'The passionate people behind the platform...',
    display_mode: 'Grid', card_size: 'Standard',
    connect_links: []
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [membersData, settingsData] = await Promise.all([
        getTeamMembersAdmin(),
        getTeamSettingsAdmin().catch(() => null)
      ]);
      setTeam(membersData as any[]);
      if (settingsData) {
        setSettings(settingsData as CmsTeamSettings);
        setSettingsData(settingsData);
      }
      setLoading(false);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setLoading(false);
    }
  }

  // Optimize and upload image
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
      const fileName = `avatar_${Date.now()}.webp`;
      
      const { data, error } = await supabase.storage
        .from('public-assets')
        .upload(`team/${fileName}`, optimizedBlob, { contentType: 'image/webp' });

      if (error) {
        // Fallback to direct upload if 'public-assets' bucket doesn't exist
        console.warn('Storage upload failed, please ensure a public bucket named "public-assets" exists.', error);
        setMessage({ text: `Storage Error: ${error.message}`, type: 'error' });
        setUploadingAvatar(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('public-assets').getPublicUrl(`team/${fileName}`);
      setFormData(prev => ({ ...prev, avatar_url: publicUrlData.publicUrl }));
      setMessage({ text: 'Avatar uploaded and optimized successfully', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Error uploading avatar', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveTeamMember(editingId, formData);
      setMessage({ text: editingId ? 'Member updated successfully!' : 'Member added!', type: 'success' });
      resetForm();
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveTeamSettings(settingsData);
      setMessage({ text: 'Settings saved successfully!', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string, currentStatus: boolean) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'unarchive' : 'archive'} this member?`)) return;
    try {
      await saveTeamMember(id, { is_archived: !currentStatus });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you SURE you want to permanently delete this team member? This cannot be undone.')) return;
    try {
      await deleteTeamMember(id);
      if (editingId === id) resetForm();
      await loadData();
      setMessage({ text: 'Team member permanently deleted', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  function startEdit(item: CmsTeamMember) {
    setEditingId(item.id);
    setFormData(item);
    setActiveTab('members');
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      name: '', email: '', role: 'team', title: '', department: '',
      avatar_url: '/avatars/avatar_0.svg', background_cover_url: '',
      github_url: '', linkedin_url: '', whatsapp_number: '', discord_handle: '', website_url: '',
      bio: '', expertise_tags: [], display_order: 0,
      is_active: true, is_archived: false, contact_visible: true,
    });
  }

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.expertise_tags?.includes(tagInput.trim())) {
        setFormData(prev => ({ ...prev, expertise_tags: [...(prev.expertise_tags || []), tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      expertise_tags: (prev.expertise_tags || []).filter(t => t !== tag)
    }));
  };

  const filteredTeam = team.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addConnectLink = () => {
    setSettingsData(prev => ({
      ...prev,
      connect_links: [...(prev.connect_links || []), { platform: 'Discord', url: '', label: 'Join Discord' }]
    }));
  };

  const updateConnectLink = (index: number, field: string, value: string) => {
    setSettingsData(prev => {
      const newLinks = [...(prev.connect_links || [])];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, connect_links: newLinks };
    });
  };

  const removeConnectLink = (index: number) => {
    setSettingsData(prev => {
      const newLinks = [...(prev.connect_links || [])];
      newLinks.splice(index, 1);
      return { ...prev, connect_links: newLinks };
    });
  };

  if (loading) return <div className="flex justify-center items-center" style={{ minHeight: '300px' }}><div className="admin-loading-spinner" /></div>;

  return (
    <div className="admin-team animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <p className="eyebrow">👥 Team Management System</p>
        <h1>Manage <span className="gradient-text">CodingClub Team</span></h1>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        <button className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('members')}>Team Members</button>
        <button className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('settings')}>Public Page Settings</button>
        <button className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
      </div>

      {activeTab === 'members' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* LEFT PANEL - Roster */}
          <div className="card glass" style={{ height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Team Roster ({team.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={resetForm}>+ Add New</button>
            </div>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search members..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            
            <div className="flex-col gap-3">
              {filteredTeam.sort((a, b) => a.display_order - b.display_order).map(item => (
                <div key={item.id} className="card" style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderLeft: `4px solid ${item.is_archived ? 'var(--color-border)' : 'var(--brand-primary)'}` }}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img src={item.avatar_url || '/avatars/avatar_0.svg'} alt={item.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
                          {item.name} 
                          {item.is_archived && <span className="badge ml-2" style={{ fontSize: '0.6rem' }}>Archived</span>}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ROLES.find(r => r.value === item.role)?.label || item.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)} style={{ padding: '0.25rem' }} title="Edit">✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleArchive(item.id, item.is_archived)} style={{ padding: '0.25rem' }} title={item.is_archived ? "Unarchive" : "Archive"}>
                        {item.is_archived ? '♻️' : '📦'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)} style={{ padding: '0.25rem', color: '#ff4444' }} title="Permanently Delete">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL - Form */}
          <div className="card glass">
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              {editingId ? 'Edit Team Member' : 'Add New Team Member'}
            </h3>
            
            <form onSubmit={handleMemberSubmit} className="flex-col gap-6">
              
              {/* SECTION 1: Basic & Professional */}
              <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>1. Basic & Professional Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input type="text" required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">System Role *</label>
                    <select required className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Display Title</label>
                    <input type="text" className="form-input" placeholder="e.g. Lead Frontend Developer" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input type="text" className="form-input" placeholder="e.g. Technical, Marketing" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Join Date</label>
                    <input type="date" className="form-input" value={formData.join_date || ''} onChange={e => setFormData({...formData, join_date: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Media */}
              <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>2. Media (Avatar)</h4>
                <div className="flex gap-4 items-center">
                  <img src={formData.avatar_url || '/avatars/avatar_0.svg'} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--brand-primary)' }} />
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Upload New Avatar (auto-converts to WebP, 512x512)</label>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} className="form-input" style={{ padding: '0.5rem' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Or enter URL manually:</p>
                    <input type="text" className="form-input" style={{ marginTop: '0.25rem' }} value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Bio & Social */}
              <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>3. Bio & Social Links</h4>
                <div className="form-group">
                  <label className="form-label">Biography (Markdown supported) - Max 500 chars</label>
                  <textarea className="form-input" rows={4} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Tell us about the member..." />
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: (formData.bio?.length || 0) > 500 ? 'var(--color-error)' : 'var(--text-muted)' }}>
                    {formData.bio?.length || 0} / 500
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">GitHub URL</label>
                    <input type="url" className="form-input" value={formData.github_url} onChange={e => setFormData({...formData, github_url: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">LinkedIn URL</label>
                    <input type="url" className="form-input" value={formData.linkedin_url} onChange={e => setFormData({...formData, linkedin_url: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp Number (incl. country code)</label>
                    <input type="text" className="form-input" placeholder="+919876543210" value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discord Handle</label>
                    <input type="text" className="form-input" placeholder="username#1234" value={formData.discord_handle} onChange={e => setFormData({...formData, discord_handle: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Personal Website</label>
                    <input type="url" className="form-input" value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Skills & Display */}
              <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>4. Expertise & Settings</h4>
                <div className="form-group">
                  <label className="form-label">Expertise Tags (Press Enter to add)</label>
                  <input type="text" className="form-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="e.g. Next.js, System Design" />
                  <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {formData.expertise_tags?.map(tag => (
                      <span key={tag} className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-surface-3)' }}>
                        {tag} <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Display Order (lower = first)</label>
                    <input type="number" className="form-input" value={formData.display_order} onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                  <label className="flex items-center gap-2" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                    Visible to Public
                  </label>
                  <label className="flex items-center gap-2" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.contact_visible} onChange={e => setFormData({...formData, contact_visible: e.target.checked})} />
                    Show Contact Info
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                {editingId && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel Edit</button>}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Team Member' : 'Save New Member'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card glass" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3>Public Page Settings</h3>
          <form onSubmit={handleSettingsSubmit} className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Page Title</label>
              <input type="text" className="form-input" value={settingsData.page_title} onChange={e => setSettingsData({...settingsData, page_title: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Page Description</label>
              <textarea className="form-input" rows={3} value={settingsData.page_description} onChange={e => setSettingsData({...settingsData, page_description: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Hero Background Image URL</label>
              <input type="url" className="form-input" value={settingsData.hero_bg_url || ''} onChange={e => setSettingsData({...settingsData, hero_bg_url: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Display Mode</label>
                <select className="form-input" value={settingsData.display_mode} onChange={e => setSettingsData({...settingsData, display_mode: e.target.value})}>
                  <option value="Grid">Grid Layout</option>
                  <option value="List">List Layout</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Member Card Size</label>
                <select className="form-input" value={settingsData.card_size} onChange={e => setSettingsData({...settingsData, card_size: e.target.value})}>
                  <option value="Compact">Compact</option>
                  <option value="Standard">Standard</option>
                  <option value="Large">Large</option>
                </select>
              </div>
            </div>

            {/* Connect Links Management */}
            <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Connect Links (e.g. Discord, GitHub)</h4>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addConnectLink}>+ Add Link</button>
              </div>
              
              {!settingsData.connect_links?.length ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No connect links configured.</p>
              ) : (
                <div className="flex-col gap-3">
                  {settingsData.connect_links.map((link, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Platform (e.g. Discord)" 
                        value={link.platform} 
                        onChange={e => updateConnectLink(idx, 'platform', e.target.value)} 
                        required 
                      />
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="URL (https://...)" 
                        value={link.url} 
                        onChange={e => updateConnectLink(idx, 'url', e.target.value)} 
                        required 
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Label" 
                        value={link.label} 
                        onChange={e => updateConnectLink(idx, 'label', e.target.value)} 
                        required 
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeConnectLink(idx)} style={{ color: '#ff4444' }}>🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '1rem' }}>
              {saving ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="card glass">
          <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
            <h3>Team Analytics Dashboard</h3>
            <span className="badge badge-secondary">Coming Soon</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ background: 'var(--color-surface-2)', padding: '1.5rem', textAlign: 'center' }}>
              <h1 style={{ fontSize: '3rem', margin: 0, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {team.length}
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Total Team Members</p>
            </div>
            <div className="card" style={{ background: 'var(--color-surface-2)', padding: '1.5rem', textAlign: 'center' }}>
              <h1 style={{ fontSize: '3rem', margin: 0, color: 'var(--brand-primary)' }}>
                {team.filter(t => t.is_active && !t.is_archived).length}
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Active on Public Page</p>
            </div>
            <div className="card" style={{ background: 'var(--color-surface-2)', padding: '1.5rem', textAlign: 'center' }}>
              <h1 style={{ fontSize: '3rem', margin: 0, color: 'var(--text-muted)' }}>
                {team.filter(t => t.is_archived).length}
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Archived Members</p>
            </div>
          </div>
          <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            More detailed contribution metrics and growth charts will be implemented here.
          </p>
        </div>
      )}
    </div>
  );
}
