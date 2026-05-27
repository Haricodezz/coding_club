'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getSupabase } from '@/lib/supabase';

const TiptapEditor = dynamic(() => import('@/components/ui/TiptapEditor'), { ssr: false });

export default function WriteBlogPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auth check
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return; }
      supabase.from('users').select('*').eq('id', data.session.user.id).single().then(({ data: profile }) => {
        setUser(profile);
      });
    });
  }, [router]);

  function showMessage(text: string, type: 'success' | 'error' | 'info') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleSaveDraft() {
    if (!title.trim()) { showMessage('Please add a title first', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/blogs/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draftId,
          title,
          content,
          summary,
          cover_image: coverImage,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDraftId(json.blog.id);
      setLastSaved(new Date());
      showMessage('Draft saved!', 'success');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!title.trim()) { showMessage('Please add a title', 'error'); return; }
    if (!content || content === '<p></p>') { showMessage('Content cannot be empty', 'error'); return; }

    // Save draft first if not saved
    let id = draftId;
    if (!id) {
      setSaving(true);
      try {
        const res = await fetch('/api/blogs/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, content, summary,
            cover_image: coverImage,
            tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        id = json.blog.id;
        setDraftId(id);
      } catch (err: any) {
        showMessage(err.message, 'error');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/blogs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showMessage('🎉 Submitted for review! An admin will review your blog soon.', 'success');
      setTimeout(() => router.push('/blogs/my-blogs'), 2500);
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '900px' }}>

        {/* Header */}
        <div className="page-header animate-fade-in">
          <p className="eyebrow">✍️ Write</p>
          <h1>Create a <span className="gradient-text">Blog Post</span></h1>
          <p>Share your knowledge with the Coding Club community. Submitted blogs are reviewed by admins before publishing.</p>
        </div>

        {/* Message toast */}
        {message && (
          <div style={{
            marginBottom: '1.5rem', padding: '0.875rem 1.25rem', borderRadius: 'var(--radius)',
            background: message.type === 'success' ? 'rgba(34,211,160,0.1)' : message.type === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(108,99,255,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34,211,160,0.3)' : message.type === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(108,99,255,0.3)'}`,
            color: message.type === 'success' ? '#22d3a0' : message.type === 'error' ? '#f87171' : 'var(--accent-3)',
            fontSize: '0.9rem', fontWeight: 600,
          }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="An interesting title that grabs attention..."
              style={{ fontSize: '1rem', padding: '0.75rem 1rem' }}
            />
          </div>

          {/* Summary */}
          <div className="form-group">
            <label className="form-label">Brief Summary</label>
            <input
              type="text"
              className="form-input"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="A one-line teaser shown on the blog listing page"
            />
          </div>

          {/* Cover Image */}
          <div className="form-group">
            <label className="form-label">Cover Image URL</label>
            <input
              type="url"
              className="form-input"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="https://... (optional)"
            />
            {coverImage && (
              <img
                src={coverImage}
                alt="Cover preview"
                style={{ marginTop: '0.75rem', borderRadius: '8px', maxHeight: '180px', objectFit: 'cover', width: '100%' }}
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Tags <span style={{ color: '#64748b', fontWeight: 400 }}>(comma-separated)</span></label>
            <input
              type="text"
              className="form-input"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="DSA, Dynamic Programming, Beginner"
            />
          </div>

          {/* Content Editor */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Content *</label>
              {lastSaved && (
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  ✓ Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your blog post... Use the toolbar for formatting."
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', paddingBottom: '2rem' }}>
            <button
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="btn btn-secondary"
            >
              {saving ? '⏳ Saving...' : '💾 Save Draft'}
            </button>
            <button
              onClick={handleSubmitForReview}
              disabled={saving || submitting}
              className="btn btn-primary"
            >
              {submitting ? '⏳ Submitting...' : '🚀 Submit for Review'}
            </button>
            <Link href="/blogs/my-blogs" className="btn btn-ghost">
              My Blogs →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
