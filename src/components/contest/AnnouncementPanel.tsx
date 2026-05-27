'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AnnouncementPanel({ contestId }: { contestId: string }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/contests/${contestId}/announcements`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    try {
      const res = await fetch(`/api/admin/contests/${contestId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body })
      });
      if (res.ok) {
        setTitle('');
        setBody('');
        fetchAnnouncements();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete announcement?')) return;
    try {
      await fetch(`/api/admin/contests/${contestId}/announcements?id=${id}`, { method: 'DELETE' });
      fetchAnnouncements();
    } catch (e) {}
  };

  if (loading) return <div className="skeleton" style={{ height: '200px' }} />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Post new */}
      <div style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 1rem' }}>New Announcement</h3>
        <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Hint for Problem B"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} required rows={4} placeholder="Type announcement..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
          </div>
          <button type="submit" disabled={posting || !title || !body} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {posting ? 'Posting...' : '📢 Broadcast'}
          </button>
        </form>
      </div>

      {/* History */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 1rem' }}>Sent Announcements</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {announcements.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No announcements sent.</p>
          ) : (
            announcements.map(a => (
              <div key={a.id} style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)', position: 'relative' }}>
                <button onClick={() => handleDelete(a.id)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                <p style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{a.title}</p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>{a.body}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(a.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
