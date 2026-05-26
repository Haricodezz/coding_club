'use client';

import { useEffect, useState } from 'react';
import { getLearningPathsAdmin, saveLearningPath, deleteLearningPath } from '../actions';
import type { CmsLearningPath } from '@/types/cms';

export default function AdminLearningPaths() {
  const [paths, setPaths] = useState<CmsLearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('Beginner');
  const [resourceIdsStr, setResourceIdsStr] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    loadPaths();
  }, []);

  async function loadPaths() {
    try {
      const data = await getLearningPathsAdmin();
      setPaths(data as unknown as CmsLearningPath[]);
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

    // parse resource IDs
    const resource_ids = resourceIdsStr
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));

    try {
      await saveLearningPath(editingId, {
        title,
        slug,
        description: description || undefined,
        banner_url: bannerUrl || undefined,
        difficulty_level: difficultyLevel,
        resource_ids,
        display_order: displayOrder,
        is_published: isPublished,
      });
      setMessage({
        text: editingId ? 'Learning path updated successfully!' : 'Learning path created successfully!',
        type: 'success'
      });
      resetForm();
      await loadPaths();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this learning path?')) return;
    try {
      await deleteLearningPath(id);
      setMessage({ text: 'Learning path deleted successfully!', type: 'success' });
      await loadPaths();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  function startEdit(item: CmsLearningPath) {
    setEditingId(item.id);
    setTitle(item.title);
    setSlug(item.slug);
    setDescription(item.description || '');
    setBannerUrl(item.banner_url || '');
    setDifficultyLevel(item.difficulty_level || 'Beginner');
    setResourceIdsStr(item.resource_ids?.join(', ') || '');
    setDisplayOrder(item.display_order);
    setIsPublished(item.is_published);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setBannerUrl('');
    setDifficultyLevel('Beginner');
    setResourceIdsStr('');
    setDisplayOrder(0);
    setIsPublished(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-learning-paths">
      <div className="page-header animate-fade-in">
        <p className="eyebrow">🗺️ Curriculum Center</p>
        <h1>Manage <span className="gradient-text">Learning Paths</span></h1>
        <p>Curate roadmaps and group learning resources into structured paths.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Create / Edit Form */}
        <div className="card glass">
          <h3>{editingId ? 'Edit Path' : '+ Create Path'}</h3>
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
              <label className="form-label">Slug (URL)</label>
              <input
                type="text"
                required
                className="form-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="e.g. intro-to-react"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty Level</label>
              <select className="form-select" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                <option value="Beginner">🌱 Beginner</option>
                <option value="Intermediate">🚀 Intermediate</option>
                <option value="Advanced">🔥 Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Resource IDs (comma separated)</label>
              <input
                type="text"
                className="form-input"
                value={resourceIdsStr}
                onChange={(e) => setResourceIdsStr(e.target.value)}
                placeholder="e.g. 1, 5, 12"
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                Enter the IDs of the learning resources this path includes.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Banner URL (Optional)</label>
              <input
                type="url"
                className="form-input"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
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
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <label htmlFor="isPublished" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Published (Visible to users)</label>
            </div>

            <div className="flex gap-2" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Path' : 'Create Path'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Paths */}
        <div className="card glass">
          <h3>Curriculum Paths ({paths.length})</h3>
          <div className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            {paths.length === 0 ? (
              <p style={{ color: '#64748b' }}>No learning paths created yet.</p>
            ) : (
              [...paths].sort((a, b) => a.display_order - b.display_order).map((item) => (
                <div key={item.id} className="card" style={{ background: 'var(--color-surface-2)', opacity: item.is_published ? 1 : 0.6 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {item.title}
                        {!item.is_published && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Draft</span>}
                      </h4>
                      <div className="flex gap-2 wrap" style={{ marginTop: '0.5rem' }}>
                        <span className="badge">Slug: {item.slug}</span>
                        <span className={`badge ${item.difficulty_level === 'Beginner' ? 'badge-easy' : item.difficulty_level === 'Intermediate' ? 'badge-medium' : 'badge-hard'}`}>
                          {item.difficulty_level}
                        </span>
                        <span className="badge badge-secondary">{item.resource_ids?.length || 0} Resources</span>
                      </div>
                      {item.description && (
                        <p style={{ fontSize: '0.85rem', color: '#a8b3cf', marginTop: '0.75rem' }}>
                          {item.description}
                        </p>
                      )}
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
