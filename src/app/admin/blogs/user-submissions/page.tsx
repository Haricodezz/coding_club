'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getSupabase } from '@/lib/supabase';

const TiptapEditor = dynamic(() => import('@/components/ui/TiptapEditor'), { ssr: false });

type UserBlog = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  status: string;
  rejection_note?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
  cover_image?: string;
  content: string;
  author: { username: string; avatar_url: string } | null;
  reviewed_at?: string;
};

export default function AdminUserSubmissionsPage() {
  const [blogs, setBlogs] = useState<UserBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [viewModal, setViewModal] = useState<UserBlog | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => { loadBlogs(); }, [filter]);

  async function loadBlogs() {
    setLoading(true);
    const supabase = getSupabase();
    const sb = supabase as any;
    
    let q = sb
      .from('user_blogs')
      .select('*, author:users!user_blogs_author_id_fkey(username, avatar_url)')
      .order('created_at', { ascending: false });
    
    if (filter !== 'all') q = q.eq('status', filter);

    const { data, error } = await q;
    if (error) console.error('Error fetching blogs:', error);
    setBlogs((data as any[]) || []);
    setLoading(false);
  }


  function showMsg(msg: string) { setActionMsg(msg); setTimeout(() => setActionMsg(null), 3500); }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/admin/blogs/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      setBlogs(prev => prev.map(b => b.id === id ? { ...b, status: 'approved' } : b));
      showMsg('✅ Blog approved and published!');
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    const res = await fetch(`/api/admin/blogs/${rejectModal.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: rejectionNote }),
    });
    if (res.ok) {
      setBlogs(prev => prev.map(b => b.id === rejectModal.id ? { ...b, status: 'rejected', rejection_note: rejectionNote } : b));
      setRejectModal(null);
      setRejectionNote('');
      showMsg('Blog rejected with note.');
    }
  }

  async function handleFeatureToggle(id: string, current: boolean) {
    const res = await fetch(`/api/admin/blogs/${id}/feature`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !current }),
    });
    if (res.ok) {
      setBlogs(prev => prev.map(b => b.id === id ? { ...b, is_featured: !current } : b));
      showMsg(!current ? '⭐ Blog featured!' : 'Blog unfeatured.');
    }
  }

  const counts = {
    all: blogs.length,
    pending: blogs.filter(b => b.status === 'pending').length,
    approved: blogs.filter(b => b.status === 'approved').length,
    rejected: blogs.filter(b => b.status === 'rejected').length,
  };

  return (
    <div>
      <div className="page-header animate-fade-in">
        <p className="eyebrow">📋 Review Queue</p>
        <h1>User Blog <span className="gradient-text">Submissions</span></h1>
        <p>Review, approve, or reject blogs submitted by students.</p>
      </div>

      {actionMsg && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', background: 'rgba(34,211,160,0.1)', border: '1px solid rgba(34,211,160,0.3)', color: '#22d3a0', fontWeight: 600, fontSize: '0.9rem' }}>
          {actionMsg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="filter-tabs" style={{ marginBottom: '1.5rem' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'pending' ? `⏳ Pending (${counts.pending})` :
             f === 'approved' ? `✅ Approved (${counts.approved})` :
             f === 'rejected' ? `❌ Rejected (${counts.rejected})` :
             `All`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />)}
        </div>
      ) : blogs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📭</span>
          <h3>No {filter !== 'all' ? filter : ''} submissions</h3>
          <p>{filter === 'pending' ? 'All caught up! No pending reviews.' : 'No blogs in this category yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {blogs.map(blog => (
            <div key={blog.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{blog.title}</h3>
                    {blog.is_featured && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: '99px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 700 }}>⭐ Featured</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                    <span>by @{blog.author?.username || 'unknown'}</span>
                    <span>•</span>
                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                  </div>
                  {blog.summary && <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>{blog.summary}</p>}
                  {blog.rejection_note && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', fontSize: '0.78rem', color: '#fca5a5' }}>
                      <strong>Note:</strong> {blog.rejection_note}
                    </div>
                  )}
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                  background: blog.status === 'pending' ? 'rgba(245,158,11,0.1)' : blog.status === 'approved' ? 'rgba(34,211,160,0.1)' : 'rgba(248,113,113,0.1)',
                  color: blog.status === 'pending' ? '#f59e0b' : blog.status === 'approved' ? '#22d3a0' : '#f87171',
                  border: `1px solid ${blog.status === 'pending' ? 'rgba(245,158,11,0.3)' : blog.status === 'approved' ? 'rgba(34,211,160,0.3)' : 'rgba(248,113,113,0.3)'}`,
                }}>
                  {blog.status === 'pending' ? '⏳ Pending' : blog.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                <button onClick={() => setViewModal(blog)} className="btn btn-secondary btn-sm">
                  👁 View Content
                </button>
                {blog.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(blog.id)} className="btn btn-success btn-sm">
                      ✅ Approve
                    </button>
                    <button onClick={() => { setRejectModal({ id: blog.id, title: blog.title }); setRejectionNote(''); }} className="btn btn-danger btn-sm">
                      ❌ Reject
                    </button>
                  </>
                )}
                {blog.status === 'approved' && (
                  <button onClick={() => handleApprove(blog.id)} className="btn btn-ghost btn-sm" disabled>
                    ✅ Approved
                  </button>
                )}
                <button
                  onClick={() => handleFeatureToggle(blog.id, blog.is_featured)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: blog.is_featured ? '#f59e0b' : undefined }}
                >
                  {blog.is_featured ? '★ Unfeature' : '☆ Feature'}
                </button>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                  {(blog.tags || []).slice(0, 3).map(t => (
                    <span key={t} style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '99px', background: 'rgba(108,99,255,0.1)', color: 'var(--accent-3)', border: '1px solid rgba(108,99,255,0.2)' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Reject Blog</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem', color: '#64748b' }}>
              Rejecting: <strong style={{ color: 'var(--text-secondary)' }}>{rejectModal.title}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Rejection Note (shown to author)</label>
              <textarea
                className="form-input form-textarea"
                rows={3}
                value={rejectionNote}
                onChange={e => setRejectionNote(e.target.value)}
                placeholder="Explain why the blog was rejected and what improvements are needed..."
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={handleReject} className="btn btn-danger" style={{ flex: 1 }}>
                ❌ Confirm Reject
              </button>
              <button onClick={() => setRejectModal(null)} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Content Modal */}
      {viewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
          <div className="card" style={{ maxWidth: '900px', width: '100%', padding: '2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{viewModal.title}</h2>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                    background: viewModal.status === 'pending' ? 'rgba(245,158,11,0.1)' : viewModal.status === 'approved' ? 'rgba(34,211,160,0.1)' : 'rgba(248,113,113,0.1)',
                    color: viewModal.status === 'pending' ? '#f59e0b' : viewModal.status === 'approved' ? '#22d3a0' : '#f87171',
                    border: `1px solid ${viewModal.status === 'pending' ? 'rgba(245,158,11,0.3)' : viewModal.status === 'approved' ? 'rgba(34,211,160,0.3)' : 'rgba(248,113,113,0.3)'}`,
                  }}>
                    {viewModal.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  By <strong>@{viewModal.author?.username}</strong> • Submitted {new Date(viewModal.created_at).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setViewModal(null)} className="btn btn-ghost" style={{ padding: '0.5rem' }} title="Close">
                ✕
              </button>
            </div>

            {viewModal.cover_image && (
              <img src={viewModal.cover_image} alt="Cover" style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1.5rem' }} />
            )}

            <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <TiptapEditor content={viewModal.content} onChange={() => {}} readOnly={true} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <button onClick={() => setViewModal(null)} className="btn btn-ghost">
                Close
              </button>
              {viewModal.status === 'pending' && (
                <>
                  <button onClick={() => { setRejectModal({ id: viewModal.id, title: viewModal.title }); setViewModal(null); }} className="btn btn-danger">
                    ❌ Reject
                  </button>
                  <button onClick={() => { handleApprove(viewModal.id); setViewModal(null); }} className="btn btn-success">
                    ✅ Approve
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

