'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

type Difficulty = 'All' | 'Beginner' | 'Intermediate' | 'Advanced';

const DIFFICULTIES: Difficulty[] = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const TYPE_LABELS: Record<string, string> = {
  youtube: '📺 Video',
  article: '📝 Article',
  github: '📦 GitHub',
  practice: '⚡ Practice',
  doc: '📄 Docs',
};

export default function ResourcesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    const { data, error } = await (supabase as any)
      .from('resource_courses')
      .select('id, slug, title, description, banner_url, difficulty_level, display_order, resource_modules(id, resource_items(id))')
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (!error) setCourses(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const filtered = courses.filter(c => {
    const matchesDiff = difficulty === 'All' || c.difficulty_level === difficulty;
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    return matchesDiff && matchesSearch;
  });

  const totalModules = courses.reduce((acc, c) => acc + (c.resource_modules?.length || 0), 0);
  const totalItems = courses.reduce((acc, c) => acc + (c.resource_modules?.reduce((a: number, m: any) => a + (m.resource_items?.length || 0), 0) || 0), 0);

  const difficultyCount = (d: Difficulty) => d === 'All' ? courses.length : courses.filter(c => c.difficulty_level === d).length;

  return (
    <div className="page-wrapper">
      <div className="container">

        {/* ── Page Header ── */}
        <div className="page-header animate-fade-in">
          <p className="eyebrow">📚 Learning Hub</p>
          <h1>Curated <span className="gradient-text">Resources</span></h1>
          <p>Hand-picked roadmaps, YouTube playlists, docs, and practice links — structured into trackable courses. Zero fluff, maximum signal.</p>
        </div>

        {/* ── Stats Bar ── */}
        {!loading && courses.length > 0 && (
          <div className="card animate-slide-in" style={{ marginBottom: '2rem', border: '1px solid rgba(108,99,255,0.25)', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <Stat value={courses.length} label="Courses" />
              <div style={{ width: '1px', height: '2rem', background: 'var(--color-border)' }} />
              <Stat value={totalModules} label="Modules" />
              <div style={{ width: '1px', height: '2rem', background: 'var(--color-border)' }} />
              <Stat value={totalItems} label="Resources" />
              <div style={{ width: '1px', height: '2rem', background: 'var(--color-border)' }} />
              <div style={{ flex: 1, minWidth: '12rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Your Progress</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-3)' }}>0%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '14rem', maxWidth: '22rem' }}>
            <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', opacity: 0.5, pointerEvents: 'none' }}>🔍</span>
            <input
              type="search"
              className="form-input"
              placeholder="Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.2rem', width: '100%' }}
            />
          </div>

          {/* Difficulty Pills */}
          <div className="filter-tabs">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                className={`filter-tab ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {d === 'All' ? 'All' : d === 'Beginner' ? '🌱' : d === 'Intermediate' ? '⚡' : '🔥'}&nbsp;{d}
                <span style={{
                  marginLeft: '0.3rem',
                  fontSize: '0.7rem',
                  background: difficulty === d ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                  borderRadius: '99px',
                  padding: '0 0.4rem',
                }}>
                  {difficultyCount(d)}
                </span>
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--color-surface)', borderRadius: '8px', padding: '0.25rem', border: '1px solid var(--color-border)', marginLeft: 'auto' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'grid' ? 'rgba(108,99,255,0.2)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--accent-1)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.15s',
              }}
              title="Grid view"
            >⊞</button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'list' ? 'rgba(108,99,255,0.2)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent-1)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.15s',
              }}
              title="List view"
            >☰</button>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ height: '260px' }}>
                <div className="skeleton" style={{ height: '120px', marginBottom: '1rem', borderRadius: '8px' }} />
                <div className="skeleton" style={{ height: '16px', width: '70%', marginBottom: '0.75rem' }} />
                <div className="skeleton" style={{ height: '12px', width: '90%', marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ height: '12px', width: '55%' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📭</span>
            <h3>No courses found</h3>
            <p>Try adjusting your filters or search query.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid-3">
            {filtered.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((course, i) => (
              <CourseListRow key={course.id} course={course} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>{label}</p>
    </div>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const map: Record<string, { cls: string; icon: string }> = {
    Beginner: { cls: 'badge-beginner', icon: '🌱' },
    Intermediate: { cls: 'badge-intermediate', icon: '⚡' },
    Advanced: { cls: 'badge-advanced', icon: '🔥' },
  };
  const { cls, icon } = map[level] || { cls: 'badge-beginner', icon: '📘' };
  return <span className={`badge ${cls}`}>{icon} {level}</span>;
}

function CourseCard({ course, index }: { course: any; index: number }) {
  const moduleCount = course.resource_modules?.length || 0;
  const itemCount = course.resource_modules?.reduce((a: number, m: any) => a + (m.resource_items?.length || 0), 0) || 0;

  return (
    <Link
      href={'/resources/' + course.slug}
      className="card animate-slide-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        animationDelay: `${index * 50}ms`,
        padding: 0,
        overflow: 'hidden',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(108,99,255,0.15)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,99,255,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
        (e.currentTarget as HTMLElement).style.borderColor = '';
      }}
    >
      {/* Banner */}
      <div style={{ position: 'relative', height: '120px', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
        {course.banner_url ? (
          <img
            src={course.banner_url}
            alt={course.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, transition: 'opacity 0.3s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0f1a 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem' }}>
          <DifficultyBadge level={course.difficulty_level} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1.1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h4 style={{ color: '#f1f5f9', margin: 0, fontSize: '1rem', lineHeight: 1.35, fontWeight: 700 }}>
          {course.title}
        </h4>
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.82rem',
          lineHeight: 1.5,
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: 0,
        }}>
          {course.description || 'No description.'}
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
        }}>
          <span>{moduleCount} modules · {itemCount} resources</span>
          <span style={{ color: 'var(--accent-1)', fontWeight: 600 }}>Start →</span>
        </div>
      </div>
    </Link>
  );
}

function CourseListRow({ course, index }: { course: any; index: number }) {
  const moduleCount = course.resource_modules?.length || 0;
  const itemCount = course.resource_modules?.reduce((a: number, m: any) => a + (m.resource_items?.length || 0), 0) || 0;

  return (
    <Link
      href={'/resources/' + course.slug}
      className="card animate-slide-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        textDecoration: 'none',
        padding: '1rem 1.25rem',
        animationDelay: `${index * 40}ms`,
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,99,255,0.4)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.04)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = '';
        (e.currentTarget as HTMLElement).style.background = '';
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'var(--color-surface-2)' }}>
        {course.banner_url ? (
          <img src={course.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e1b4b, #0f0f1a)' }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h4 style={{ color: '#f1f5f9', margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{course.title}</h4>
          <DifficultyBadge level={course.difficulty_level} />
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {course.description}
        </p>
      </div>

      {/* Stats */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: 0 }}>{moduleCount} modules</p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: 0 }}>{itemCount} resources</p>
      </div>

      <span style={{ color: 'var(--accent-1)', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>→</span>
    </Link>
  );
}
