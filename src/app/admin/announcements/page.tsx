'use client';

import { useEffect, useState } from 'react';
import { getAnnouncementsAdmin, saveAnnouncement, deleteAnnouncement } from '../actions';
import type { CmsAnnouncement } from '@/types/cms';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<CmsAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'critical'>('info');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      const data = await getAnnouncementsAdmin();
      setAnnouncements(data as unknown as CmsAnnouncement[]);
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
      await saveAnnouncement(editingId, {
        title,
        content,
        type,
        is_active: isActive,
      });
      setMessage({
        text: editingId ? 'Announcement updated successfully!' : 'Announcement created successfully!',
        type: 'success'
      });
      resetForm();
      await loadAnnouncements();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      setMessage({ text: 'Announcement deleted successfully!', type: 'success' });
      await loadAnnouncements();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  function startEdit(item: CmsAnnouncement) {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setLinkUrl(item.link_url || '');
    setType(item.type);
    setIsActive(item.is_active);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setContent('');
    setLinkUrl('');
    setType('info');
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
    <div className="admin-announcements">
      <div className="page-header animate-fade-in">
        <p className="eyebrow">📢 Broadcast Center</p>
        <h1>Manage <span className="gradient-text">Announcements</span></h1>
        <p>Display important notices, alerts, and system-wide banners to students.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Create / Edit Form */}
        <div className="card glass">
          <h3>{editingId ? 'Edit Announcement' : '+ Create Announcement'}</h3>
          <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                required
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Type / Category</label>
              <select className="form-select" value={type} onChange={(e: any) => setType(e.target.value)}>
                <option value="info">💬 Info (Blue)</option>
                <option value="success">✅ Success (Green)</option>
                <option value="warning">⚠️ Warning (Yellow)</option>
                <option value="critical">🚨 Critical / Alert (Red)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notice Message (Rich Text/Markdown)</label>
              <textarea
                required
                className="form-input"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Details of the announcement..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Action Link (Optional URL)</label>
              <input
                type="url"
                className="form-input"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="isActive" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Active Banner (Show to users)</label>
            </div>

            <div className="flex gap-2" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Notice' : 'Broadcast Announcement'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Notices */}
        <div className="card glass">
          <h3>Active & Archived Notices ({announcements.length})</h3>
          <div className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            {announcements.length === 0 ? (
              <p style={{ color: '#64748b' }}>No announcements created yet.</p>
            ) : (
              announcements.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderLeft: `4px solid ${
                      item.type === 'critical' ? 'var(--color-error)' : 
                      item.type === 'warning' ? 'var(--color-warning)' : 
                      item.type === 'success' ? 'var(--color-success)' : 'var(--color-info)'
                    }`,
                    opacity: item.is_active ? 1 : 0.6
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {item.title}
                        {!item.is_active && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Archived</span>}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#a8b3cf', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                        {item.content}
                      </p>
                      {item.link_url && (
                        <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.5rem', textDecoration: 'underline' }}>
                          🔗 {item.link_url}
                        </a>
                      )}
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.75rem' }}>
                        Posted: {new Date(item.created_at).toLocaleString()}
                      </span>
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
