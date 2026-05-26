'use client';

import { useEffect, useState, useCallback } from 'react';
import type { LearningResource, ResourceCategory, Difficulty } from '@/types';

const CATEGORIES: Array<ResourceCategory | 'All'> = ['All', 'DSA', 'Web Dev', 'Competitive Programming', 'System Design'];
const DIFFICULTIES: Array<Difficulty | 'All'> = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function LearnPage() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ResourceCategory | 'All'>('All');
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (difficulty !== 'All') params.set('difficulty', difficulty);

    const res = await fetch(`/api/learning/resources?${params}`);
    const json = await res.json();
    setResources(json.data || []);
    setLoading(false);
  }, [category, difficulty]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  async function toggleComplete(resource: LearningResource) {
    setUpdatingId(resource.id);
    const newState = !resource.is_completed;

    // Optimistic UI update
    setResources(prev => prev.map(r => r.id === resource.id ? { ...r, is_completed: newState } : r));

    await fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: resource.id, completed: newState }),
    });
    setUpdatingId(null);
  }

  const filtered = resources.filter(r =>
    !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = resources.filter(r => r.is_completed).length;
  const progress = resources.length > 0 ? Math.round((completedCount / resources.length) * 100) : 0;

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Header */}
        <div className="page-header animate-fade-in">
          <p className="eyebrow">📚 Learning Module</p>
          <h1>Curated <span className="gradient-text">Resources</span></h1>
          <p>Hand-picked DSA, Web Dev, and competitive programming materials — track your progress as you go.</p>
        </div>

        {/* Progress Overview */}
        {resources.length > 0 && (
          <div className="card animate-slide-in" style={{ marginBottom: '2rem', border: '1px solid rgba(108,99,255,0.25)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{completedCount}</span>
                <span style={{ color: '#64748b' }}> / {resources.length} resources completed</span>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--accent-3)', fontSize: '1.1rem' }}>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 wrap" style={{ marginBottom: '1.5rem' }}>
          <input
            type="search"
            className="form-input"
            placeholder="🔍 Search resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <div className="filter-tabs">
            {CATEGORIES.map(c => (
              <button key={c} className={`filter-tab ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="filter-tabs">
            {DIFFICULTIES.map(d => (
              <button key={d} className={`filter-tab ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Resource Grid */}
        {loading ? (
          <div className="grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ height: 200 }}>
                <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 36, width: '100%', borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📭</span>
            <h3>No resources found</h3>
            <p>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map((resource, i) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                index={i}
                onToggle={toggleComplete}
                updating={updatingId === resource.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceCard({
  resource, index, onToggle, updating
}: {
  resource: LearningResource;
  index: number;
  onToggle: (r: LearningResource) => void;
  updating: boolean;
}) {
  const categoryClass: Record<string, string> = {
    'DSA': 'dsa', 'Web Dev': 'web', 'Competitive Programming': 'cp', 'System Design': 'sd',
  };
  const diffClass: Record<string, string> = {
    'Beginner': 'beginner', 'Intermediate': 'intermediate', 'Advanced': 'advanced',
  };

  return (
    <div
      className="card animate-slide-in"
      style={{
        animationDelay: `${index * 40}ms`,
        opacity: resource.is_completed ? 0.75 : 1,
        borderColor: resource.is_completed ? 'rgba(34,211,160,0.25)' : 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
        <span className={`badge badge-${categoryClass[resource.category] || 'dsa'}`}>
          {resource.category}
        </span>
        <span className={`badge badge-${diffClass[resource.difficulty] || 'beginner'}`}>
          {resource.difficulty}
        </span>
      </div>

      <h4 style={{ marginBottom: '0.5rem', color: resource.is_completed ? 'var(--color-success)' : '#f1f5f9' }}>
        {resource.is_completed && '✅ '}{resource.title}
      </h4>

      {resource.description && (
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {resource.description}
        </p>
      )}

      <div className="flex items-center gap-2" style={{ marginTop: 'auto' }}>
        {resource.youtube_url && (
          <a
            href={resource.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            ▶ Watch
          </a>
        )}
        <button
          className={`btn btn-sm ${resource.is_completed ? 'btn-ghost' : 'btn-success'}`}
          onClick={() => onToggle(resource)}
          disabled={updating}
          style={{ flex: resource.youtube_url ? 'none' : 1, minWidth: 100 }}
        >
          {updating ? '...' : resource.is_completed ? 'Undo ✓' : 'Mark Done ✓'}
        </button>
      </div>
    </div>
  );
}
