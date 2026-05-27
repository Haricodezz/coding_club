'use client';

import { useState } from 'react';

interface ResourceCardProps {
  item: any;
  isActive: boolean;
  onSelect: (item: any) => void;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  isCompleted: boolean;
  onBookmarkToggle?: (id: string, isBookmarked: boolean) => void;
  isBookmarked?: boolean;
}

export function ResourceCard({
  item,
  isActive,
  onSelect,
  onToggleComplete,
  isCompleted,
  onBookmarkToggle,
  isBookmarked = false,
}: ResourceCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  function getTypeIcon(type: string) {
    switch (type) {
      case 'youtube': return '▶️';
      case 'article': return '📝';
      case 'github': return '📦';
      case 'practice': return '⚡';
      case 'doc': return '📄';
      default: return '🔗';
    }
  }

  function getDifficultyColor(diff: string) {
    const d = (diff || '').toLowerCase();
    if (d === 'easy' || d === 'beginner') return '#22c55e';
    if (d === 'medium' || d === 'intermediate') return '#eab308';
    if (d === 'hard' || d === 'advanced') return '#ef4444';
    return 'var(--text-muted)';
  }

  return (
    <div
      className={`learning-card ${isActive ? 'learning-card--active' : ''} ${isCompleted ? 'learning-card--completed' : ''}`}
      onClick={() => onSelect(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isActive ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
        border: `1px solid ${isActive ? 'var(--brand-primary)' : 'var(--color-border)'}`,
        borderRadius: '12px',
        padding: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.2)' : 'none',
        position: 'relative',
        opacity: isCompleted && !isActive ? 0.75 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', opacity: isCompleted ? 0.5 : 1 }}>{getTypeIcon(item.resource_type)}</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none', textDecorationColor: 'var(--text-muted)' }}>
            {item.title}
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {onBookmarkToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); onBookmarkToggle(item.id, !isBookmarked); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: isBookmarked || isHovered ? 1 : 0.3, padding: '2px' }}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? "var(--brand-primary)" : "none"} stroke={isBookmarked ? "var(--brand-primary)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleComplete(item.id, !isCompleted); }}
            style={{
              background: isCompleted ? 'var(--color-success)' : 'transparent',
              border: `1px solid ${isCompleted ? 'var(--color-success)' : 'var(--text-muted)'}`,
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isCompleted ? 'var(--color-bg)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
            title={isCompleted ? "Mark uncompleted" : "Mark completed"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {item.description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
          {item.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
        {item.estimated_duration && (
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'var(--color-surface)', color: 'var(--text-muted)', border: '1px solid var(--color-border)' }}>
            ⏱ {item.estimated_duration} min
          </span>
        )}
        {item.difficulty && (
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'var(--color-surface)', color: getDifficultyColor(item.difficulty), border: '1px solid var(--color-border)' }}>
            {item.difficulty}
          </span>
        )}
        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'var(--color-surface)', color: 'var(--text-muted)', border: '1px solid var(--color-border)', textTransform: 'uppercase' }}>
          {item.resource_type}
        </span>
      </div>
    </div>
  );
}
