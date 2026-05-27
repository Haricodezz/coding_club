'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getResourceCoursesAdmin, saveResourceCourse, deleteResourceCourse } from '../actions';

const DIFF_MAP: Record<string, { icon: string; color: string }> = {
  Beginner: { icon: '🌱', color: '#22c55e' },
  Intermediate: { icon: '⚡', color: '#f59e0b' },
  Advanced: { icon: '🔥', color: '#ef4444' },
};

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Create-course modal state
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [bannerUrl, setBannerUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(10);
  const [isPublished, setIsPublished] = useState(false);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResourceCoursesAdmin();
      setCourses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  // Auto-generate slug from title
  useEffect(() => {
    setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }, [title]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveResourceCourse(null, { title, slug, description, difficulty_level: difficulty, banner_url: bannerUrl, display_order: displayOrder, is_published: isPublished });
      setShowCreate(false);
      setTitle(''); setSlug(''); setDescription(''); setDifficulty('Beginner'); setBannerUrl(''); setDisplayOrder(10); setIsPublished(false);
      loadCourses();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this course and ALL its content?')) return;
    await deleteResourceCourse(id);
    loadCourses();
  }

  const filtered = courses.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !s || c.title.toLowerCase().includes(s) || c.slug.includes(s);
    const matchDiff = filterDiff === 'All' || c.difficulty_level === filterDiff;
    const matchStatus = filterStatus === 'All' || (filterStatus === 'Published' ? c.is_published : !c.is_published);
    return matchSearch && matchDiff && matchStatus;
  });

  const stats = {
    total: courses.length,
    published: courses.filter(c => c.is_published).length,
    modules: courses.reduce((a, c) => a + (c.resource_modules?.length || 0), 0),
    resources: courses.reduce((a, c) => a + (c.resource_modules?.reduce((b: number, m: any) => b + (m.resource_items?.length || 0), 0) || 0), 0),
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', overflow: 'hidden', position: 'relative' }}>

      {/* ───────── LEFT SIDEBAR ───────── */}
      <aside style={{
        width: '17rem',
        minWidth: '17rem',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>Learning CMS</p>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Resources</h2>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                width: '28px', height: '28px', borderRadius: '7px', border: 'none',
                background: 'var(--accent-1)', color: 'white', fontSize: '1.1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'filter 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
              title="New Course"
            >+</button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses..."
              style={{
                width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.8rem',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.78rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
          {[
            { label: 'Courses', value: stats.total },
            { label: 'Published', value: stats.published },
            { label: 'Modules', value: stats.modules },
            { label: 'Resources', value: stats.resources },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--color-surface)', padding: '0.5rem 0.75rem' }}>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.15rem 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {['All', 'Published', 'Draft'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '0.2rem 0.5rem', borderRadius: '4px', border: 'none', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
              background: filterStatus === s ? 'rgba(108,99,255,0.2)' : 'transparent',
              color: filterStatus === s ? 'var(--accent-1)' : 'var(--color-text-muted)',
              transition: 'all 0.15s',
            }}>{s}</button>
          ))}
          <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.1rem' }} />
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map(d => (
            <button key={d} onClick={() => setFilterDiff(d)} style={{
              padding: '0.2rem 0.5rem', borderRadius: '4px', border: 'none', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
              background: filterDiff === d ? 'rgba(108,99,255,0.2)' : 'transparent',
              color: filterDiff === d ? 'var(--accent-1)' : 'var(--color-text-muted)',
              transition: 'all 0.15s',
            }}>{d === 'All' ? 'All Levels' : d}</button>
          ))}
        </div>

        {/* Course List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: '64px', borderRadius: '8px', background: 'var(--color-surface-2)', marginBottom: '0.35rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📭</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>No courses match your filters.</p>
            </div>
          ) : filtered.map(course => {
            const isActive = pathname === `/admin/resources/${course.id}`;
            const diff = DIFF_MAP[course.difficulty_level] || DIFF_MAP.Beginner;
            const modCount = course.resource_modules?.length || 0;
            const itemCount = course.resource_modules?.reduce((a: number, m: any) => a + (m.resource_items?.length || 0), 0) || 0;

            return (
              <Link
                key={course.id}
                href={`/admin/resources/${course.id}`}
                style={{
                  display: 'block', textDecoration: 'none', borderRadius: '8px', marginBottom: '0.25rem',
                  padding: '0.6rem 0.75rem',
                  background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(108,99,255,0.35)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem' }}>{diff.icon}</span>
                      <span style={{
                        fontSize: '0.8rem', fontWeight: 600,
                        color: isActive ? 'var(--text-primary)' : '#cbd5e1',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{course.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                        background: course.is_published ? '#22c55e' : '#f59e0b', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                        {modCount}m · {itemCount}r
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={e => handleDelete(course.id, e)}
                    style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.1rem', opacity: 0, transition: 'opacity 0.15s' }}
                    className="delete-btn"
                    title="Delete course"
                  >✕</button>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
          <Link
            href="/resources"
            target="_blank"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: '7px',
              background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
              color: 'var(--accent-1)', fontSize: '0.75rem', fontWeight: 600,
              textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.15)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.08)')}
          >
            <span>↗</span> Preview Student View
          </Link>
        </div>
      </aside>

      {/* ───────── RIGHT CONTENT PANEL ───────── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      {/* ───────── CREATE COURSE MODAL ───────── */}
      {showCreate && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '520px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>New Course / Roadmap</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>Create a new curated learning collection</p>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Title *</label>
                <input required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. DSA Complete Roadmap"
                  style={{ width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Slug (auto-generated, editable) */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>URL Slug *</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <span style={{ padding: '0 0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'monospace', flexShrink: 0 }}>/resources/</span>
                  <input required value={slug} onChange={e => setSlug(e.target.value)}
                    placeholder="dsa-complete-roadmap"
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Brief description of what students will learn..."
                  style={{ width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Difficulty + Order */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                    style={{ width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.65rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="Beginner">🌱 Beginner</option>
                    <option value="Intermediate">⚡ Intermediate</option>
                    <option value="Advanced">🔥 Advanced</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sort Order</label>
                  <input type="number" value={displayOrder} onChange={e => setDisplayOrder(parseInt(e.target.value))}
                    style={{ width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.65rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Banner URL */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Banner Image URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                <input type="url" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  style={{ width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', transition: 'border-color 0.15s' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Publish toggle + actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <div
                    onClick={() => setIsPublished(p => !p)}
                    style={{
                      width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer',
                      background: isPublished ? 'var(--accent-1)' : 'var(--color-border)',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '2px', left: isPublished ? '18px' : '2px',
                      width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isPublished ? '#22c55e' : 'var(--color-text-muted)' }}>
                    {isPublished ? 'Published' : 'Draft'}
                  </span>
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowCreate(false)}
                    style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: 'var(--accent-1)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'filter 0.15s' }}
                    onMouseEnter={e => { if (!saving) (e.currentTarget.style.filter = 'brightness(1.15)'); }}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    {saving ? 'Creating...' : 'Create Course'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .delete-btn { opacity: 0 !important; }
        a:hover .delete-btn, a:focus-within .delete-btn { opacity: 1 !important; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
