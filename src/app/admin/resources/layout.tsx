'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getResourceCoursesAdmin, saveResourceCourse, deleteResourceCourse, updateResourceCourseOrders } from '../actions';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DIFF_MAP: Record<string, { icon: string; color: string }> = {
  Beginner: { icon: '🌱', color: '#22c55e' },
  Intermediate: { icon: '⚡', color: '#f59e0b' },
  Advanced: { icon: '🔥', color: '#ef4444' },
};

function getRelativeTime(dateString: string) {
  const d = new Date(dateString);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterLevels, setFilterLevels] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortOption, setSortOption] = useState<'custom' | 'newest' | 'alphabetical'>('custom');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('resource-search-input')?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowCreate(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('lms_sidebar_collapsed');
    if (saved) setIsCollapsed(saved === 'true');
  }, []);

  function toggleSidebar() {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('lms_sidebar_collapsed', String(next));
      return next;
    });
  }

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

  // Load initial data
  useEffect(() => {
    loadCourses();
    const c = localStorage.getItem('lms_sidebar_collapsed');
    if (c === 'true') setIsCollapsed(true);
  }, []);

  async function loadCourses() {
    try {
      setLoading(true);
      const data = await getResourceCoursesAdmin();
      setCourses(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  // DND Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = courses.findIndex(c => c.id === active.id);
      const newIndex = courses.findIndex(c => c.id === over?.id);
      const newOrder = arrayMove(courses, oldIndex, newIndex);
      setCourses(newOrder);

      // Persist to backend
      const updates = newOrder.map((c, i) => ({ id: c.id, display_order: i }));
      try {
        await updateResourceCourseOrders(updates);
      } catch (err: any) {
        alert('Failed to save order: ' + err.message);
        loadCourses(); // revert
      }
    }
  }

  function toggleSidebar() {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('lms_sidebar_collapsed', String(next));
      return next;
    });
  }

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

  function handleExportCSV() {
    if (filtered.length === 0) return;
    const headers = ['Title', 'Slug', 'Difficulty', 'Status', 'Modules', 'Created At'];
    const rows = filtered.map(c => [
      `"${c.title.replace(/"/g, '""')}"`,
      c.slug,
      c.difficulty_level,
      c.is_published ? 'Published' : 'Draft',
      c.resource_modules?.length || 0,
      new Date(c.created_at).toISOString().split('T')[0]
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lms_courses_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filtered = courses.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !s || c.title.toLowerCase().includes(s) || c.slug.includes(s);
    const matchDiff = filterLevels.length === 0 || filterLevels.includes(c.difficulty_level);
    const matchStatus = filterStatus === 'All' || (filterStatus === 'Published' ? c.is_published : !c.is_published);
    return matchSearch && matchDiff && matchStatus;
  }).sort((a, b) => {
    if (sortOption === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sortOption === 'alphabetical') return a.title.localeCompare(b.title);
    return a.display_order - b.display_order;
  });

  const activeFilterCount = (filterStatus !== 'All' ? 1 : 0) + filterLevels.length;

  function removeFilter(type: string, val?: string) {
    if (type === 'status') setFilterStatus('All');
    if (type === 'level' && val) setFilterLevels(prev => prev.filter(l => l !== val));
  }
  function clearAllFilters() {
    setFilterStatus('All');
    setFilterLevels([]);
    setSearch('');
  }

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
        width: isCollapsed ? '5rem' : '22rem',
        minWidth: isCollapsed ? '5rem' : '22rem',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.3s ease, min-width 0.3s ease',
      }}>

        {/* Header */}
        <div style={{ padding: isCollapsed ? '1rem 0.5rem' : '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isCollapsed ? '0' : '1rem' }}>
            {!isCollapsed && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(108,99,255,0.05) 100%)',
                  border: '1px solid rgba(108,99,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem'
                }}>
                  🎓
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>Learning CMS</h1>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>Manage courses, modules & resources</p>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', gap: '0.5rem', margin: isCollapsed ? '0 auto' : '0' }}>
              <button
                onClick={toggleSidebar}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: '1rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget.style.background = 'var(--color-bg)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = 'var(--color-surface-2)'); (e.currentTarget.style.color = 'var(--color-text-muted)'); }}
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isCollapsed ? '»' : '«'}
              </button>
              
              {!isCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={handleExportCSV}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: '0.9rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}
                    onMouseEnter={e => { (e.currentTarget.style.color = 'var(--accent-1)'); (e.currentTarget.style.borderColor = 'var(--accent-1)'); }}
                    onMouseLeave={e => { (e.currentTarget.style.color = 'var(--color-text-muted)'); (e.currentTarget.style.borderColor = 'var(--color-border)'); }}
                    title="Export CSV"
                  >
                    📥
                  </button>
                  <button
                    onClick={() => setShowCreate(true)}
                    style={{
                    style={{
                      height: '32px', padding: '0 0.75rem', borderRadius: '8px', border: 'none',
                      background: 'linear-gradient(135deg, #6c63ff 0%, #8b5cf6 100%)', color: 'white', fontSize: '0.8rem', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                      transition: 'transform 0.15s, opacity 0.15s', flexShrink: 0, boxShadow: '0 4px 12px rgba(108,99,255,0.3)'
                    }}
                    onMouseEnter={e => { (e.currentTarget.style.opacity = '0.9'); (e.currentTarget.style.transform = 'translateY(-1px)'); }}
                    onMouseLeave={e => { (e.currentTarget.style.opacity = '1'); (e.currentTarget.style.transform = 'translateY(0)'); }}
                  >
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> New Course
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          {!isCollapsed && (
            <div style={{ position: 'relative' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: searchFocused ? 0.8 : 0.4, color: searchFocused ? '#6c63ff' : 'inherit', transition: 'all 0.2s', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                id="resource-search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search courses, modules... (Ctrl+K)"
                style={{
                  width: '100%', height: '42px', padding: '0 0.85rem 0 2.4rem',
                  background: searchFocused ? '#0d1117' : '#141824', 
                  border: `1px solid ${searchFocused ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px', color: '#e2e8f0', fontSize: '0.82rem',
                  outline: 'none', boxSizing: 'border-box',
                  boxShadow: searchFocused ? '0 0 0 3px rgba(108,99,255,0.1)' : 'none',
                  transition: 'all 0.2s ease', fontFamily: 'inherit'
                }}
              />
              <button 
                onClick={() => setShowAdvancedFilters(true)}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget.style.color = 'var(--accent-1)'); (e.currentTarget.style.borderColor = 'var(--accent-1)'); }}
                onMouseLeave={e => { (e.currentTarget.style.color = 'var(--color-text-muted)'); (e.currentTarget.style.borderColor = 'var(--color-border)'); }}
                title="Advanced Filters"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </button>

              {/* Autocomplete Dropdown */}
              {searchFocused && !search && (
                <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 10, padding: '0.5rem', animation: 'slideUp 0.15s ease' }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem' }}>Suggested</p>
                  {courses.slice(0, 3).map(c => (
                    <div key={c.id} onMouseDown={() => { setSearch(c.title); setSearchFocused(false); }} style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '6px' }} className="hover:bg-slate-800/50">
                      {c.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        {!isCollapsed && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
            {[
              { label: 'Courses', value: stats.total, trending: '+1↑ from last month', type: 'All' },
              { label: 'Published', value: stats.published, trending: '+2↑ from last month', type: 'Published' },
              { label: 'Modules', value: stats.modules, trending: '+5↑ from last month', type: 'All' },
              { label: 'Resources', value: stats.resources, trending: '+12↑ from last month', type: 'All' },
            ].map((s, i) => (
              <div 
                key={s.label} 
                onClick={() => setFilterStatus(s.type)}
                style={{ 
                  background: '#141824', 
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px', padding: '0.85rem', 
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  position: 'relative', overflow: 'hidden'
                }} 
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,99,255,0.3)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.03)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLElement).style.background = '#141824';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</p>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem' }}>{s.label}</p>
                  {s.trending && <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{s.trending}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters & Active Badges */}
        {!isCollapsed && (
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: activeFilterCount > 0 ? '0.75rem' : '0' }}>
              {/* Segmented Status Control */}
              <div style={{ display: 'flex', background: '#141824', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
                {['All', 'Published', 'Draft'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    padding: '0.35rem 0.6rem', borderRadius: '6px', border: 'none', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                    background: filterStatus === s ? '#2e364f' : 'transparent',
                    color: filterStatus === s ? '#e2e8f0' : '#64748b',
                    boxShadow: filterStatus === s ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                    transition: 'all 0.2s',
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Active Badges */}
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active:</span>
                
                {filterStatus !== 'All' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.4rem', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent-1)', fontWeight: 600 }}>
                    {filterStatus}
                    <button onClick={() => removeFilter('status')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.7 }}>✕</button>
                  </span>
                )}
                
                {filterLevels.map(l => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.4rem', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent-1)', fontWeight: 600 }}>
                    {l}
                    <button onClick={() => removeFilter('level', l)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.7 }}>✕</button>
                  </span>
                ))}
                
                <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer', marginLeft: 'auto' }}>
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sort Options */}
        {!isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {filtered.length} Course{filtered.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Sort by:</span>
              <select
                value={sortOption}
                onChange={(e: any) => setSortOption(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                  fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="custom">Custom Order</option>
                <option value="newest">Newest First</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>
          </div>
        )}

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
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {filtered.map((course, i) => (
                  <SortableCourse
                    key={course.id}
                    course={course}
                    isActive={pathname === `/admin/resources/${course.id}`}
                    isCollapsed={isCollapsed}
                    i={i}
                    handleDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}>
          <Link
            href="/resources"
            target="_blank"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: isCollapsed ? '0.5rem' : '0.5rem 0.75rem', borderRadius: '7px',
              background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
              color: 'var(--accent-1)', fontSize: '0.75rem', fontWeight: 600,
              textDecoration: 'none', transition: 'background 0.15s',
              justifyContent: 'center', width: isCollapsed ? 'auto' : '100%',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.15)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.08)')}
            title="Preview Student View"
          >
            <span>↗</span> {!isCollapsed && "Preview Student View"}
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

      {/* ───────── ADVANCED FILTERS MODAL ───────── */}
      {showAdvancedFilters && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowAdvancedFilters(false); }}
        >
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Advanced Filters</h2>
              <button onClick={() => setShowAdvancedFilters(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['All', 'Published', 'Draft'].map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input type="radio" checked={filterStatus === s} onChange={() => setFilterStatus(s)} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty Levels</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                    <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={filterLevels.includes(l)} 
                        onChange={(e) => {
                          if (e.target.checked) setFilterLevels(prev => [...prev, l]);
                          else setFilterLevels(prev => prev.filter(v => v !== l));
                        }} 
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{DIFF_MAP[l]?.icon} {l}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={clearAllFilters} style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Reset All</button>
                <button type="button" onClick={() => setShowAdvancedFilters(false)} style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', border: 'none', background: 'var(--accent-1)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Apply Filters</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .course-card:hover .quick-actions, .course-card:focus-within .quick-actions { opacity: 1 !important; transform: translateX(0) !important; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable Course Card Component
// ─────────────────────────────────────────────────────────────────────────────
function SortableCourse({ course, isActive, isCollapsed, i, handleDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: course.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 2 : 1 };
  
  const diff = DIFF_MAP[course.difficulty_level] || DIFF_MAP.Beginner;
  const modCount = course.resource_modules?.length || 0;
  const itemCount = course.resource_modules?.reduce((a: number, m: any) => a + (m.resource_items?.length || 0), 0) || 0;

  return (
    <div ref={setNodeRef} style={{ ...style, position: 'relative', animation: 'slideUp 0.2s ease-out backwards', animationDelay: `${i * 0.05}s` }}>
      <Link
        href={`/admin/resources/${course.id}`}
        style={{
          display: 'flex', gap: '0.85rem', textDecoration: 'none', borderRadius: '12px', marginBottom: '0.65rem',
          padding: '0.85rem',
          background: isActive ? 'var(--color-bg)' : 'var(--color-surface-2)',
          border: `1px solid ${isActive ? 'var(--accent-1)' : 'var(--color-border)'}`,
          transition: isDragging ? 'none' : 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative', overflow: 'hidden'
        }}
        onMouseEnter={e => { 
          if (!isActive && !isDragging) { 
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,99,255,0.4)'; 
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
          } 
        }}
        onMouseLeave={e => { 
          if (!isActive && !isDragging) { 
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; 
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          } 
        }}
        className="course-card"
      >
        {/* Drag Handle */}
        <div {...attributes} {...listeners} style={{ position: 'absolute', top: '0', left: '0', bottom: '0', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', opacity: 0, transition: 'opacity 0.2s', background: 'rgba(0,0,0,0.1)' }} className="drag-handle" title="Drag to reorder">
           <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>⋮⋮</span>
        </div>

        {/* Thumbnail Icon */}
        <div style={{ 
          width: isCollapsed ? '40px' : '56px', height: isCollapsed ? '40px' : '56px', borderRadius: '12px', 
          background: `linear-gradient(135deg, ${diff.color}20 0%, ${diff.color}05 100%)`, 
          border: `1px solid ${diff.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isCollapsed ? '1.2rem' : '1.8rem',
          flexShrink: 0, transition: 'all 0.3s', marginLeft: '8px'
        }} title={diff.icon}>
          {diff.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: isCollapsed ? 'none' : 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Top Section */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{
              fontSize: '0.95rem', fontWeight: 800,
              color: isActive ? 'var(--text-primary)' : '#f1f5f9',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.2
            }} title={course.title}>{course.title}</span>
            
            <span style={{ 
              fontSize: '0.62rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '12px',
              background: course.is_published ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
              color: course.is_published ? '#22c55e' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem',
              border: `1px solid ${course.is_published ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`
            }} title={course.is_published ? 'Visible to learners' : 'Hidden from learners'}>
              {course.is_published ? '✓ LIVE' : '✎ DRAFT'}
            </span>
          </div>
          
          {/* Middle Section: Stats & Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              {modCount} mods
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {itemCount} res
            </span>
            
            <div style={{ flex: 1, height: '4px', background: 'var(--color-surface)', borderRadius: '2px', overflow: 'hidden', marginLeft: '0.5rem' }}>
              <div style={{ width: `${Math.min(100, modCount * 10)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-1), var(--accent-2))', borderRadius: '2px' }} />
            </div>
          </div>
          
          {/* Bottom Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.6)', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={`Modified exactly at ${new Date(course.updated_at || course.created_at).toLocaleString()}`}>
              🕒 {getRelativeTime(course.updated_at || course.created_at)}
            </span>
            
            {/* Action Buttons (appear on hover) */}
            <div className="quick-actions" style={{ display: 'flex', gap: '0.35rem', opacity: isActive ? 1 : 0, transition: 'all 0.2s', transform: 'translateX(4px)', position: 'relative', zIndex: 10 }}>
              <button onClick={e => { e.preventDefault(); e.stopPropagation(); }} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.2rem 0.35rem', fontSize: '0.8rem' }} title="Settings">⚙️</button>
              <button onClick={e => { e.preventDefault(); e.stopPropagation(); }} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.2rem 0.35rem', fontSize: '0.8rem' }} title="Duplicate">📑</button>
              <button onClick={e => handleDelete(course.id, e)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '0.2rem 0.35rem', fontSize: '0.8rem' }} title="Delete">🗑️</button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
