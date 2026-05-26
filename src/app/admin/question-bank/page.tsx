'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  time_limit: number;
  tags: string[];
  is_public: boolean;
  created_at: string;
}

const DIFF_COLOR: Record<string, { color: string; bg: string }> = {
  Easy:   { color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  Hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function QuestionBankPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', difficulty: 'Medium', points: 100, statement: '', time_limit: 2000, tags: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (diffFilter) params.set('difficulty', diffFilter);
      const res = await fetch(`/api/admin/question-bank?${params}`);
      if (res.ok) { const d = await res.json(); setProblems(d.data || []); }
    } finally { setLoading(false); }
  }, [search, diffFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error); return; }
      setShowCreate(false);
      router.push(`/admin/question-bank/${json.id}`);
    } finally { setCreating(false); }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This is irreversible.`)) return;
    await fetch(`/api/admin/question-bank/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem', fontWeight: 700 }}>Admin CMS</p>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>🧩 Question Bank</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.4rem 0 0' }}>Shared problem library — questions can be reused across multiple contests.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/contests" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            ← Contests
          </Link>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
            + New Problem
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: problems.length, color: 'var(--accent-1)' },
          { label: 'Easy', value: problems.filter(p => p.difficulty === 'Easy').length, color: '#22c55e' },
          { label: 'Medium', value: problems.filter(p => p.difficulty === 'Medium').length, color: '#f59e0b' },
          { label: 'Hard', value: problems.filter(p => p.difficulty === 'Hard').length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.3rem', fontWeight: 700 }}>{s.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search problems..."
          style={{ flex: 1, minWidth: '200px', padding: '0.55rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }} />
        <div className="filter-tabs">
          {['', 'Easy', 'Medium', 'Hard'].map(d => (
            <button key={d} className={`filter-tab ${diffFilter === d ? 'active' : ''}`} onClick={() => setDiffFilter(d)}>
              {d || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Problem list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '10px' }} />)}
        </div>
      ) : problems.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🧩</span>
          <h3>No problems yet</h3>
          <p>Add problems to your question bank and assign them to contests.</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">+ Add First Problem</button>
        </div>
      ) : (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px 60px 100px', padding: '0.6rem 1.25rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            {['Problem', 'Difficulty', 'Points', 'Time', 'Public', 'Actions'].map(h => (
              <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          {problems.map((p, i) => {
            const dc = DIFF_COLOR[p.difficulty] || DIFF_COLOR.Medium;
            return (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px 60px 100px',
                padding: '0.8rem 1.25rem', alignItems: 'center',
                borderBottom: i < problems.length - 1 ? '1px solid var(--color-border)' : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: '#f1f5f9', fontWeight: 600, margin: 0, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                  {p.tags && p.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                      {p.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '0.05rem 0.35rem', borderRadius: '99px', border: '1px solid var(--color-border)' }}>{t}</span>)}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dc.color, background: dc.bg, padding: '0.2rem 0.6rem', borderRadius: '99px', width: 'fit-content' }}>{p.difficulty}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-1)', fontFamily: 'monospace' }}>{p.points}pt</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{p.time_limit}ms</span>
                <span style={{ fontSize: '0.75rem', color: p.is_public ? '#22c55e' : 'var(--color-text-muted)' }}>{p.is_public ? '✓' : '—'}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <Link href={`/admin/question-bank/${p.id}`}
                    style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(108,99,255,0.3)', background: 'rgba(108,99,255,0.08)', color: 'var(--accent-1)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                    Edit
                  </Link>
                  <button onClick={() => handleDelete(p.id, p.title)}
                    style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Problem Modal ── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', width: '100%', maxWidth: '540px', padding: '2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#f1f5f9', margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>New Problem</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { field: 'title', label: 'Title *', placeholder: 'e.g. Two Sum', type: 'text' },
              ].map(({ field, label, placeholder, type }) => (
                <div key={field}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                  <input type={type} value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} required={label.includes('*')} placeholder={placeholder}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Statement *</label>
                <textarea value={form.statement} onChange={e => setForm(f => ({ ...f, statement: e.target.value }))} required rows={4} placeholder="Problem statement (Markdown supported)..."
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none' }}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Points</label>
                  <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: +e.target.value }))} min={1} max={1000}
                    style={{ width: '100%', padding: '0.6rem 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Time (ms)</label>
                  <input type="number" value={form.time_limit} onChange={e => setForm(f => ({ ...f, time_limit: +e.target.value }))} min={500} step={500}
                    style={{ width: '100%', padding: '0.6rem 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. arrays, sorting, dp"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setShowCreate(false)}
                  style={{ padding: '0.55rem 1.2rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Creating...' : 'Create & Add Testcases →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
