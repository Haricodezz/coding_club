'use client';

import { useState, useEffect, useCallback } from 'react';

interface BankProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  points: number;
  tags: string[];
  usage_count: number;
  acceptance_rate: number | null;
}

interface QuestionBankDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (problems: BankProblem[]) => void;
  existingProblemIds: string[];
}

export default function QuestionBankDrawer({ isOpen, onClose, onSelect, existingProblemIds }: QuestionBankDrawerProps) {
  const [problems, setProblems] = useState<BankProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (difficulty) params.set('difficulty', difficulty);
      // Assume a new API endpoint or use the existing one but map it correctly
      // Wait, we need an API endpoint for this. We can use the existing /api/admin/question-bank which takes ?q= and ?difficulty=
      // Let's use the standard ones: q instead of search
      if (search) params.set('q', search);
      const res = await fetch(`/api/admin/question-bank?${params}`);
      if (res.ok) {
        const d = await res.json();
        setProblems(d.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [isOpen, search, difficulty]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Reset selection when opened
  useEffect(() => {
    if (isOpen) setSelectedIds(new Set());
  }, [isOpen]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAddSelected = () => {
    const selected = problems.filter(p => selectedIds.has(p.id));
    onSelect(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(2px)' }} 
        onClick={onClose} 
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '600px',
        background: 'var(--color-bg)', borderLeft: '1px solid var(--color-border)',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.3)',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f1f5f9', fontWeight: 800 }}>Question Bank</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Browse and add existing problems to this contest.</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            ✕
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search problems..." 
              style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }} 
            />
            <select 
              value={difficulty} onChange={e => setDifficulty(e.target.value)}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '70px', borderRadius: '8px' }} />)
          ) : problems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
              <p>No problems found.</p>
            </div>
          ) : (
            problems.map(p => {
              const isAdded = existingProblemIds.includes(p.id);
              const isSelected = selectedIds.has(p.id);
              return (
                <div key={p.id} onClick={() => !isAdded && toggleSelect(p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', borderRadius: '8px',
                  background: isAdded ? 'rgba(255,255,255,0.02)' : isSelected ? 'rgba(108,99,255,0.1)' : 'var(--color-surface)',
                  border: `1px solid ${isSelected ? 'var(--accent-1)' : 'var(--color-border)'}`,
                  cursor: isAdded ? 'not-allowed' : 'pointer',
                  opacity: isAdded ? 0.6 : 1,
                  transition: 'all 0.15s'
                }}>
                  <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isAdded ? (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>✓</span>
                    ) : (
                      <input type="checkbox" checked={isSelected} readOnly style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)', pointerEvents: 'none' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 700,
                        background: p.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : p.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>
                        {p.difficulty}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.points} pts</span>
                      {p.usage_count > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Used {p.usage_count}x</span>}
                    </div>
                  </div>
                  {isAdded && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Added</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: '#e2e8f0', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={handleAddSelected} disabled={selectedIds.size === 0} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>Add Selected</button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
