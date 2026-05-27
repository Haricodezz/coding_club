'use client';

import { useEffect, useState } from 'react';
import { getBlogsAdmin, saveBlog, deleteBlog } from '../actions';
import type { CmsBlog } from '@/types/cms';

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<CmsBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    loadBlogs();
  }, []);

  async function loadBlogs() {
    try {
      const data = await getBlogsAdmin();
      setBlogs(data as unknown as CmsBlog[]);
      setLoading(false);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setLoading(false);
    }
  }

  // Auto-generate slug from title
  function handleTitleChange(val: string) {
    setTitle(val);
    if (!editingId) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
          .replace(/\s+/g, '-') // collapse whitespace and replace by -
          .replace(/-+/g, '-') // collapse dashes
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await saveBlog(editingId, {
        title,
        slug,
        summary,
        content,
        thumbnail_url: thumbnailUrl || undefined,
        tags,
        is_published: isPublished,
      });

      setMessage({
        text: editingId ? 'Blog post updated successfully!' : 'Blog post published successfully!',
        type: 'success',
      });
      resetForm();
      await loadBlogs();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await deleteBlog(id);
      setMessage({ text: 'Blog post deleted successfully!', type: 'success' });
      await loadBlogs();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  function startEdit(item: CmsBlog) {
    setEditingId(item.id);
    setTitle(item.title);
    setSlug(item.slug);
    setSummary(item.summary || '');
    setContent(item.content);
    setThumbnailUrl(item.thumbnail_url || '');
    setTagsInput((item.tags || []).join(', '));
    setIsPublished(item.is_published);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setSummary('');
    setContent('');
    setThumbnailUrl('');
    setTagsInput('');
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
    <div className="admin-blogs">
      <div className="page-header animate-fade-in">
        <p className="eyebrow">✍️ Publisher panel</p>
        <h1>Manage <span className="gradient-text">Blogs & News</span></h1>
        <p>Compose rich articles, announcements, coding tutorials, and release notes.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Editor Form */}
        <div className="card glass">
          <h3>{editingId ? 'Edit Article' : 'Write New Article'}</h3>
          <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                required
                className="form-input"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="How to solve Two Sum like a Pro"
              />
            </div>

            <div className="form-group">
              <label className="form-label">URL Slug</label>
              <input
                type="text"
                required
                className="form-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="how-to-solve-two-sum"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Brief Summary</label>
              <input
                type="text"
                className="form-input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A quick overview of hashing and optimal pointer movements."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Thumbnail Image URL (Supports Google Drive or external hosting)</label>
              <input
                type="url"
                className="form-input"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://drive.google.com/... or https://i.imgur.com/..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="DSA, Hashing, Beginners, Guide"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Content Body (Supports Rich Markdown text)</label>
              <textarea
                required
                className="form-input"
                style={{ fontFamily: 'var(--font-ui)' }}
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article in Markdown/Plain text here..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <label htmlFor="isPublished" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Publish immediately (visible on site)</label>
            </div>

            <div className="flex gap-2" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Publishing...' : editingId ? 'Update Article' : 'Publish Article'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Articles List */}
        <div className="card glass">
          <h3>Published & Draft Articles ({blogs.length})</h3>
          <div className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            {blogs.length === 0 ? (
              <p style={{ color: '#64748b' }}>No articles published yet.</p>
            ) : (
              blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="card flex-col gap-2"
                  style={{ background: 'var(--color-surface-2)', opacity: blog.is_published ? 1 : 0.65 }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 style={{ color: 'var(--text-primary)' }}>{blog.title}</h4>
                      <span className="badge badge-easy" style={{ fontSize: '0.65rem', marginTop: '0.25rem', display: 'inline-block' }}>
                        /{blog.slug}
                      </span>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                        {blog.summary || 'No summary provided.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(blog)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(blog.id)} style={{ color: 'var(--color-error)' }}>🗑️</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <div className="flex gap-1 wrap">
                      {(blog.tags || []).map((t) => (
                        <span key={t} className="badge badge-medium" style={{ fontSize: '0.6rem' }}>{t}</span>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Status: {blog.is_published ? '✅ Published' : '📝 Draft'}
                    </span>
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
