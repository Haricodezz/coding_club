'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  points: number;
  available_for_practice: boolean;
  created_at: string;
}

export default function AdminPractice() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadBank();
  }, []);

  async function loadBank() {
    try {
      const res = await fetch('/api/admin/question-bank');
      if (res.ok) {
        const d = await res.json();
        setProblems(d.data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function togglePractice(id: string, currentPublic: boolean) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/question-bank/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available_for_practice: !currentPublic }),
      });
      if (res.ok) {
        await loadBank();
      } else {
        alert('Failed to update problem');
      }
    } finally {
      setActionLoading(null);
    }
  }

  const practiceProblems = problems.filter(p => p.available_for_practice);
  const bankProblems = problems.filter(p => !p.available_for_practice && p.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-questions">
      <div className="page-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p className="eyebrow">❓ Practice Management</p>
          <h1>Manage <span className="gradient-text">Practice</span></h1>
          <p>Control which problems from the Question Bank are available for student practice.</p>
        </div>
        <Link href="/admin/question-bank" className="btn btn-secondary">Go to Question Bank →</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        
        {/* LEFT: Current Practice Problems */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3>✅ Currently in Practice ({practiceProblems.length})</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>These problems are visible to all students on the public Practice page.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', maxHeight: '600px', paddingRight: '0.5rem' }}>
            {practiceProblems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No problems added to practice yet.</p>
              </div>
            ) : (
              practiceProblems.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--accent-1)', borderRadius: '8px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{p.title}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>{p.difficulty}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                      <span style={{ color: 'var(--accent-1)' }}>{p.points}pt</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => togglePractice(p.id, p.available_for_practice)} 
                    disabled={actionLoading === p.id}
                    className="btn btn-ghost btn-sm" 
                    style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {actionLoading === p.id ? '...' : 'Remove'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Add from Question Bank */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3>🔍 Add from Question Bank</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Search for unpublished problems to add to the Practice section.</p>
          
          <input 
            type="text" 
            placeholder="Search question bank..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input"
            style={{ marginBottom: '1.5rem', width: '100%' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', maxHeight: '535px', paddingRight: '0.5rem' }}>
            {bankProblems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No unpublished problems found.</p>
              </div>
            ) : (
              bankProblems.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{p.title}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>{p.difficulty}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                      <span style={{ color: 'var(--accent-1)' }}>{p.points}pt</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => togglePractice(p.id, p.available_for_practice)} 
                    disabled={actionLoading === p.id}
                    className="btn btn-secondary btn-sm"
                  >
                    {actionLoading === p.id ? '...' : '+ Add'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
