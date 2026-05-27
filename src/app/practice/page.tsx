'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  points: number;
  tags: string[];
  companies: string[];
  acceptance_rate: number;
  status: 'solved' | 'attempted' | 'unsolved';
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadProblems = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (difficulty) q.set('difficulty', difficulty);
      if (statusFilter) q.set('status', statusFilter);

      const res = await fetch(`/api/problems?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setProblems(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, difficulty, statusFilter]);

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      loadProblems();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadProblems]);

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--text-primary)' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        <div className="page-header animate-fade-in" style={{ marginBottom: '2rem' }}>
          <p className="eyebrow" style={{ color: 'var(--accent-1)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Central Question Bank</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Problem <span className="gradient-text">Explorer</span></h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>Browse, filter, and solve practice problems.</p>
        </div>

        {/* ── FILTERS ── */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }} className="animate-slide-in">
          <input 
            type="text" 
            placeholder="🔍 Search questions..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', flex: '1 1 300px', fontSize: '0.9rem' }}
          />
          <select 
            value={difficulty} 
            onChange={e => setDifficulty(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', flex: '0 1 150px', fontSize: '0.9rem' }}
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', flex: '0 1 150px', fontSize: '0.9rem' }}
          >
            <option value="">Status</option>
            <option value="solved">Solved</option>
            <option value="attempted">Attempted</option>
            <option value="unsolved">Unsolved</option>
          </select>
        </div>

        {/* ── TABLE ── */}
        <div style={{ borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', overflow: 'hidden' }} className="animate-slide-in">
          <div style={{ display: 'grid', gridTemplateColumns: '60px 2fr 100px 100px 1.5fr', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <div style={{ textAlign: 'center' }}>Status</div>
            <div>Title</div>
            <div>Acceptance</div>
            <div>Difficulty</div>
            <div>Tags</div>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Loading problems...
            </div>
          ) : problems.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem' }}>🔍</span>
              <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-primary)' }}>No problems found</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Try adjusting your filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {problems.map((p, i) => (
                <Link key={p.id} href={`/practice/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '60px 2fr 100px 100px 1.5fr', 
                    gap: '1rem', 
                    padding: '1rem', 
                    borderBottom: i === problems.length - 1 ? 'none' : '1px solid var(--color-border)',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ textAlign: 'center', fontSize: '1.2rem' }}>
                      {p.status === 'solved' ? <span style={{ color: '#22c55e' }}>✅</span> : p.status === 'attempted' ? <span style={{ color: '#f59e0b' }}>➖</span> : <span style={{ color: 'var(--color-border)' }}>⭕</span>}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {p.acceptance_rate ? `${p.acceptance_rate}%` : 'N/A'}
                    </div>
                    <div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '99px', 
                        background: p.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : p.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', 
                        color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' 
                      }}>
                        {p.difficulty}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {(p.tags || []).slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                          {t}
                        </span>
                      ))}
                      {(p.tags || []).length > 3 && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>+{p.tags.length - 3}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
