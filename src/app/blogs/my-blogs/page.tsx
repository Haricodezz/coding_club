'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

type BlogStatus = 'draft' | 'pending' | 'approved' | 'rejected';

interface UserBlog {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  status: BlogStatus;
  rejection_note?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
  cover_image?: string;
}

const STATUS_CONFIG: Record<BlogStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
  draft:    { label: 'Draft',           color: 'var(--text-muted)', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', icon: '📝' },
  pending:  { label: 'Pending Review',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  icon: '⏳' },
  approved: { label: 'Published',       color: '#22d3a0', bg: 'rgba(34,211,160,0.1)',  border: 'rgba(34,211,160,0.3)',  icon: '✅' },
  rejected: { label: 'Rejected',        color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', icon: '❌' },
};

export default function MyBlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<UserBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<BlogStatus | 'all'>('all');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return; }
      setUser(data.session.user);
      fetch('/api/blogs/my')
        .then(r => r.json())
        .then(json => {
          setBlogs(json.blogs || []);
          setLoading(false);
        });
    });
  }, [router]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this blog? This cannot be undone.')) return;
    const res = await fetch(`/api/blogs/draft?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBlogs(prev => prev.filter(b => b.id !== id));
      setMessage('Blog deleted.');
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleResubmit(id: string) {
    const res = await fetch('/api/blogs/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (res.ok) {
      setBlogs(prev => prev.map(b => b.id === id ? { ...b, status: 'pending' } : b));
      setMessage('Resubmitted for review!');
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage(json.error);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  const filtered = filter === 'all' ? blogs : blogs.filter(b => b.status === filter);

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '860px' }}>

        <div className="page-header animate-fade-in">
          <p className="eyebrow">📚 My Writings</p>
          <h1>My <span className="gradient-text">Blog Posts</span></h1>
          <p>Manage your drafts, track review status, and write new articles.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Filters */}
          <div className="filter-tabs">
            {(['all', 'draft', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button
                key={s}
                className={`filter-tab ${filter === s ? 'active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? `All (${blogs.length})` : `${STATUS_CONFIG[s]?.icon} ${STATUS_CONFIG[s]?.label} (${blogs.filter(b => b.status === s).length})`}
              </button>
            ))}
          </div>
          <Link href="/blogs/write" className="btn btn-primary btn-sm">
            ✍️ Write New Blog
          </Link>
        </div>

        {message && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', color: 'var(--accent-3)', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '12px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">✍️</span>
            <h3>{filter === 'all' ? "You haven't written any blogs yet" : `No ${filter} blogs`}</h3>
            <p>Share your knowledge with the community!</p>
            <Link href="/blogs/write" className="btn btn-primary" style={{ marginTop: '1rem' }}>Write Your First Blog</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(blog => {
              const sc = STATUS_CONFIG[blog.status];
              return (
                <div key={blog.id} className="card animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>{blog.title}</h3>
                        {blog.is_featured && (
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: '99px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 700 }}>⭐ Featured</span>
                        )}
                      </div>
                      {blog.summary && <p style={{ margin: 0, fontSize: '0.83rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blog.summary}</p>}
                    </div>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>

                  {/* Rejection note */}
                  {blog.status === 'rejected' && blog.rejection_note && (
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', fontSize: '0.82rem', color: '#fca5a5' }}>
                      <strong>Rejection reason:</strong> {blog.rejection_note}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {(blog.tags || []).slice(0, 4).map(t => (
                        <span key={t} style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '99px', background: 'rgba(108,99,255,0.1)', color: 'var(--accent-3)', border: '1px solid rgba(108,99,255,0.2)' }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {new Date(blog.updated_at).toLocaleDateString()}
                      </span>
                      {['draft', 'rejected'].includes(blog.status) && (
                        <Link href={`/blogs/write?id=${blog.id}`} className="btn btn-ghost btn-sm">
                          ✏️ Edit
                        </Link>
                      )}
                      {blog.status === 'rejected' && (
                        <button onClick={() => handleResubmit(blog.id)} className="btn btn-secondary btn-sm">
                          🔄 Resubmit
                        </button>
                      )}
                      {blog.status === 'approved' && (
                        <Link href={`/blogs/${blog.slug}`} className="btn btn-ghost btn-sm" target="_blank">
                          👁 View
                        </Link>
                      )}
                      {blog.status === 'draft' && (
                        <button onClick={() => handleDelete(blog.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
