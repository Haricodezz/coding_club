'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import {
  getResourceCoursesAdmin,
  saveResourceCourse,
  saveResourceModule, deleteResourceModule, updateResourceModuleOrders,
  saveResourceItem, deleteResourceItem, updateResourceItemOrders,
} from '../../actions';
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ═══════════════════════════════ TYPES ═══════════════════════════════ */
type Tab = 'overview' | 'builder' | 'preview';

const RESOURCE_TYPES = [
  { value: 'youtube', label: 'YouTube Video', icon: '📺' },
  { value: 'playlist', label: 'YouTube Playlist', icon: '▶️' },
  { value: 'article', label: 'Blog / Article', icon: '📝' },
  { value: 'doc', label: 'Documentation', icon: '📄' },
  { value: 'github', label: 'GitHub Repo', icon: '📦' },
  { value: 'practice', label: 'Practice Platform', icon: '⚡' },
  { value: 'pdf', label: 'PDF / Cheatsheet', icon: '📋' },
  { value: 'roadmap', label: 'Roadmap / Guide', icon: '🗺️' },
];

const DIFF_OPTIONS = [
  { value: 'Beginner', icon: '🌱', color: '#22c55e' },
  { value: 'Intermediate', icon: '⚡', color: '#f59e0b' },
  { value: 'Advanced', icon: '🔥', color: '#ef4444' },
];

function diffIcon(level: string) {
  return DIFF_OPTIONS.find(d => d.value === level)?.icon || '📘';
}
function typeIcon(type: string) {
  return RESOURCE_TYPES.find(t => t.value === type)?.icon || '🔗';
}
function typeLabel(type: string) {
  return RESOURCE_TYPES.find(t => t.value === type)?.label || type;
}

/* ═══════════════════════════════ MAIN PAGE ═══════════════════════════════ */
export default function CourseEditorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('builder');

  const loadCourse = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResourceCoursesAdmin();
      const found = data.find((c: any) => c.id === courseId);
      if (found) {
        found.resource_modules = (found.resource_modules || []).sort((a: any, b: any) => a.display_order - b.display_order);
        found.resource_modules.forEach((m: any) => {
          m.resource_items = (m.resource_items || []).sort((a: any, b: any) => a.display_order - b.display_order);
        });
        setCourse(found);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  if (loading) return <CourseEditorSkeleton />;
  if (!course) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '3rem' }}>
      <span style={{ fontSize: '3rem' }}>🔍</span>
      <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Course not found</h2>
      <Link href="/admin/resources" style={{ color: 'var(--accent-1)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to all courses</Link>
    </div>
  );

  const moduleCount = course.resource_modules?.length || 0;
  const itemCount = course.resource_modules?.reduce((a: number, m: any) => a + (m.resource_items?.length || 0), 0) || 0;
  const totalMins = course.resource_modules?.reduce((a: number, m: any) =>
    a + (m.resource_items?.reduce((b: number, i: any) => b + (i.estimated_duration || 0), 0) || 0), 0) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--color-bg)' }}>

      {/* ── TOP HEADER BAR & BREADCRUMBS ── */}
      <div style={{
        padding: '0.75rem 1.5rem', flexShrink: 0,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
          <Link href="/admin/resources" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Resources</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{course.title}</span>
          {tab === 'builder' && <><span>/</span><span>Module Builder</span></>}
          {tab === 'overview' && <><span>/</span><span>Course Overview</span></>}
          {tab === 'preview' && <><span>/</span><span>Live Preview</span></>}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Course Title + Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.2rem' }}>{diffIcon(course.difficulty_level)}</span>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {course.title}
            </h1>
            <span style={{
              padding: '0.15rem 0.55rem', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700,
              background: course.is_published ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              color: course.is_published ? '#22c55e' : '#f59e0b',
              border: `1px solid ${course.is_published ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
              flexShrink: 0,
            }}>
              {course.is_published ? '● Published' : '○ Draft'}
            </span>
          </div>

        {/* Quick Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
          {[
            { label: 'Modules', value: moduleCount },
            { label: 'Resources', value: itemCount },
            { label: 'Est. Time', value: totalMins ? `${Math.round(totalMins / 60 * 10) / 10}h` : '—' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.1rem 0 0' }}>{s.label}</p>
            </div>
          ))}

          {/* View on site */}
          <Link href={`/resources/${course.slug}`} target="_blank"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.85rem', borderRadius: '7px',
              background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.25)',
              color: 'var(--accent-1)', fontSize: '0.75rem', fontWeight: 600,
              textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.18)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.1)')}
          >
            ↗ View Course
          </Link>
        </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        padding: '0 1.5rem', height: '2.75rem', flexShrink: 0,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        {([
          { key: 'overview', label: '📝 Overview' },
          { key: 'builder', label: '🏗️ Builder' },
          { key: 'preview', label: '👁️ Preview' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.4rem 0.85rem', border: 'none',
              background: tab === t.key ? 'rgba(108,99,255,0.15)' : 'transparent',
              color: tab === t.key ? 'var(--accent-1)' : 'var(--color-text-muted)',
              fontSize: '0.8rem', fontWeight: tab === t.key ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s', borderRadius: '0',
              borderBottom: tab === t.key ? '2px solid var(--accent-1)' : '2px solid transparent',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'overview' && <OverviewTab course={course} onSaved={loadCourse} />}
        {tab === 'builder' && <BuilderTab course={course} courseId={courseId} onRefresh={loadCourse} />}
        {tab === 'preview' && <PreviewTab course={course} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ PREVIEW TAB ═══════════════════════════════ */
function PreviewTab({ course }: { course: any }) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  const widths = { desktop: '100%', tablet: '768px', mobile: '375px' };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a' }}>
      {/* Preview Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', background: 'var(--color-surface-2)', borderRadius: '8px', padding: '0.2rem' }}>
          {[
            { id: 'desktop', icon: '💻', label: 'Desktop' },
            { id: 'tablet', icon: '📱', label: 'Tablet' },
            { id: 'mobile', icon: '📱', label: 'Mobile' }
          ].map(d => (
            <button key={d.id} onClick={() => setDevice(d.id as any)} style={{
              background: device === d.id ? 'var(--color-surface)' : 'transparent',
              color: device === d.id ? 'var(--text-primary)' : 'var(--color-text-muted)',
              border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.4rem', alignItems: 'center',
              boxShadow: device === d.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s'
            }}>
              <span>{d.icon}</span> <span className={device === d.id ? '' : 'hidden-mobile'}>{d.label}</span>
            </button>
          ))}
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 0.5rem' }} />
        <Link href={`/resources/${course.slug}`} target="_blank" style={{
          padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)',
          background: 'transparent', color: 'var(--text-primary)', fontSize: '0.75rem', textDecoration: 'none',
          display: 'flex', gap: '0.4rem', alignItems: 'center'
        }}>
          <span>↗</span> Open in New Tab
        </Link>
      </div>
      
      {/* Iframe Container */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: device === 'desktop' ? 0 : '2rem', overflow: 'auto' }}>
        <div style={{
          width: widths[device],
          height: device === 'desktop' ? '100%' : '800px',
          maxHeight: device === 'desktop' ? 'none' : '100%',
          background: 'var(--color-bg)',
          borderRadius: device === 'desktop' ? 0 : '24px',
          overflow: 'hidden',
          boxShadow: device === 'desktop' ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: device === 'desktop' ? 'none' : '8px solid #334155',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <iframe
            src={`/resources/${course.slug}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Student preview"
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ OVERVIEW TAB ═══════════════════════════════ */
function OverviewTab({ course, onSaved }: { course: any; onSaved: () => void }) {
  const [title, setTitle] = useState(course.title || '');
  const [slug, setSlug] = useState(course.slug || '');
  const [description, setDescription] = useState(course.description || '');
  const [difficulty, setDifficulty] = useState(course.difficulty_level || 'Beginner');
  const [bannerUrl, setBannerUrl] = useState(course.banner_url || '');
  const [displayOrder, setDisplayOrder] = useState(course.display_order || 0);
  const [isPublished, setIsPublished] = useState(course.is_published || false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveResourceCourse(course.id, { title, slug, description, difficulty_level: difficulty, banner_url: bannerUrl, display_order: displayOrder, is_published: isPublished });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.3rem' }}>Course Settings</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: 0 }}>Edit course metadata, description, and publishing settings.</p>
      </div>

      {/* Banner preview */}
      {bannerUrl && (
        <div style={{ height: '140px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', background: 'var(--color-surface-2)', position: 'relative' }}>
          <img src={bannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <FormField label="Course Title" required>
          <input required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. DSA Complete Roadmap"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
          />
        </FormField>

        <FormField label="URL Slug" hint="/resources/[slug]">
          <input required value={slug} onChange={e => setSlug(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
          />
        </FormField>

        <FormField label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            placeholder="What will students learn? What is this roadmap about?"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="Difficulty Level">
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ ...inputStyle }}>
              {DIFF_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.icon} {d.value}</option>)}
            </select>
          </FormField>
          <FormField label="Sort Order" hint="Lower = shown first">
            <input type="number" value={displayOrder} onChange={e => setDisplayOrder(parseInt(e.target.value))} style={{ ...inputStyle, fontFamily: 'monospace' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </FormField>
        </div>

        <FormField label="Banner Image URL" hint="Recommended: 1200×400px landscape from Unsplash">
          <input type="url" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
          />
        </FormField>

        {/* Publish toggle + Save */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div onClick={() => setIsPublished((p: boolean) => !p)} style={{
              width: '40px', height: '22px', borderRadius: '11px',
              background: isPublished ? 'var(--accent-1)' : 'var(--color-border)',
              position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: '3px', left: isPublished ? '20px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                transition: 'left 0.2s',
              }} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: isPublished ? '#22c55e' : 'var(--color-text-muted)', margin: 0 }}>
                {isPublished ? 'Published' : 'Draft'}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>
                {isPublished ? 'Visible to all students' : 'Only admins can see this'}
              </p>
            </div>
          </label>

          <button type="submit" disabled={saving} style={{
            padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
            background: saved ? '#22c55e' : 'var(--accent-1)',
            color: 'white', fontSize: '0.85rem', fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
          }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════ BUILDER TAB ═══════════════════════════════ */
function BuilderTab({ course, courseId, onRefresh }: { course: any; courseId: string; onRefresh: () => void }) {
  const [expandedMods, setExpandedMods] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    (course.resource_modules || []).forEach((m: any) => { init[m.id] = true; });
    return init;
  });

  const [modules, setModules] = useState(course.resource_modules || []);
  useEffect(() => { setModules(course.resource_modules || []); }, [course.resource_modules]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const type = active.data.current?.type;

    if (type === 'module') {
      const oldIndex = modules.findIndex((m: any) => m.id === active.id);
      const newIndex = modules.findIndex((m: any) => m.id === over.id);
      
      const newMods = arrayMove(modules, oldIndex, newIndex);
      setModules(newMods);
      
      try {
        const updates = newMods.map((m: any, idx: number) => ({ id: m.id, display_order: (idx + 1) * 10 }));
        await updateResourceModuleOrders(updates);
        onRefresh();
      } catch (err: any) { alert(err.message); }
    } else if (type === 'resource') {
      const modId = active.data.current?.modId;
      setModules((prev: any) => prev.map((m: any) => {
        if (m.id !== modId) return m;
        const oldIndex = m.resource_items.findIndex((i: any) => i.id === active.id);
        const newIndex = m.resource_items.findIndex((i: any) => i.id === over.id);
        return { ...m, resource_items: arrayMove(m.resource_items, oldIndex, newIndex) };
      }));

      const mod = modules.find((m: any) => m.id === modId);
      if (!mod) return;
      const oldIndex = mod.resource_items.findIndex((i: any) => i.id === active.id);
      const newIndex = mod.resource_items.findIndex((i: any) => i.id === over.id);
      const newItems = arrayMove(mod.resource_items, oldIndex, newIndex);

      try {
        const updates = newItems.map((i: any, idx: number) => ({ id: i.id, display_order: (idx + 1) * 10 }));
        await updateResourceItemOrders(updates);
        onRefresh();
      } catch (err: any) { alert(err.message); }
    }
  }

  // Module modal
  const [modModal, setModModal] = useState(false);
  const [editingMod, setEditingMod] = useState<any>(null);
  const [modTitle, setModTitle] = useState('');
  const [modDesc, setModDesc] = useState('');
  const [modOrder, setModOrder] = useState(10);
  const [savingMod, setSavingMod] = useState(false);

  // Resource modal
  const [resModal, setResModal] = useState(false);
  const [editingRes, setEditingRes] = useState<any>(null);
  const [resModuleId, setResModuleId] = useState('');
  const [resTitle, setResTitle] = useState('');
  const [resSlug, setResSlug] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resTopic, setResTopic] = useState('');
  const [resType, setResType] = useState('youtube');
  const [resUrl, setResUrl] = useState('');
  const [resDuration, setResDuration] = useState(0);
  const [resDiff, setResDiff] = useState('Beginner');
  const [resOrder, setResOrder] = useState(10);
  const [resPub, setResPub] = useState(true);
  const [savingRes, setSavingRes] = useState(false);

  // Auto slug from title
  useEffect(() => {
    if (!editingRes) {
      setResSlug(resTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [resTitle, editingRes]);

  function openAddMod() {
    setEditingMod(null); setModTitle(''); setModDesc('');
    setModOrder((course.resource_modules?.length || 0) * 10 + 10);
    setModModal(true);
  }
  function openEditMod(mod: any) {
    setEditingMod(mod); setModTitle(mod.title); setModDesc(mod.description || ''); setModOrder(mod.display_order);
    setModModal(true);
  }
  async function saveMod(e: React.FormEvent) {
    e.preventDefault(); setSavingMod(true);
    try {
      await saveResourceModule(editingMod?.id || null, { course_id: courseId, title: modTitle, description: modDesc, display_order: modOrder });
      setModModal(false); onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSavingMod(false); }
  }
  async function deleteMod(id: string) {
    if (!confirm('Delete this module and all its resources?')) return;
    await deleteResourceModule(id); onRefresh();
  }

  function openAddRes(modId: string, modItems: any[]) {
    setEditingRes(null); setResModuleId(modId);
    setResTitle(''); setResSlug(''); setResDesc(''); setResTopic('');
    setResType('youtube'); setResUrl(''); setResDuration(0); setResDiff('Beginner');
    setResOrder((modItems?.length || 0) * 10 + 10); setResPub(true);
    setResModal(true);
  }
  function openEditRes(item: any, modId: string) {
    setEditingRes(item); setResModuleId(modId);
    setResTitle(item.title); setResSlug(item.slug); setResDesc(item.description || '');
    setResTopic(item.topic_name || ''); setResType(item.resource_type);
    setResUrl(item.url); setResDuration(item.estimated_duration || 0);
    setResDiff(item.difficulty || 'Beginner'); setResOrder(item.display_order); setResPub(item.is_published);
    setResModal(true);
  }
  async function saveRes(e: React.FormEvent) {
    e.preventDefault(); setSavingRes(true);
    try {
      await saveResourceItem(editingRes?.id || null, {
        module_id: resModuleId, title: resTitle, slug: resSlug, description: resDesc,
        topic_name: resTopic, resource_type: resType, url: resUrl,
        estimated_duration: resDuration, difficulty: resDiff, display_order: resOrder, is_published: resPub,
      });
      setResModal(false); onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSavingRes(false); }
  }
  async function deleteRes(id: string) {
    if (!confirm('Delete this resource?')) return;
    await deleteResourceItem(id); onRefresh();
  }
  async function duplicateRes(item: any, modId: string) {
    if (!confirm(`Duplicate "${item.title}"?`)) return;
    try {
      await saveResourceItem(null, {
        module_id: modId, title: `${item.title} (Copy)`, slug: `${item.slug}-copy-${Date.now()}`,
        description: item.description, topic_name: item.topic_name, resource_type: item.resource_type,
        url: item.url, estimated_duration: item.estimated_duration, difficulty: item.difficulty,
        display_order: item.display_order + 5, is_published: false,
      });
      onRefresh();
    } catch (err: any) { alert(err.message); }
  }
  async function duplicateMod(mod: any) {
    if (!confirm(`Duplicate module "${mod.title}" and its resources?`)) return;
    try {
      const newMod = await saveResourceModule(null, {
        course_id: courseId, title: `${mod.title} (Copy)`, description: mod.description, display_order: mod.display_order + 5
      });
      if (mod.resource_items && mod.resource_items.length > 0) {
        for (const item of mod.resource_items) {
           await saveResourceItem(null, {
             module_id: newMod.id, title: item.title, slug: `${item.slug}-copy-${Date.now()}`,
             description: item.description, topic_name: item.topic_name, resource_type: item.resource_type,
             url: item.url, estimated_duration: item.estimated_duration, difficulty: item.difficulty,
             display_order: item.display_order, is_published: false,
           });
        }
      }
      onRefresh();
    } catch (err: any) { alert(err.message); }
  }
  async function toggleResPublish(item: any) {
    try {
      await saveResourceItem(item.id, { ...item, is_published: !item.is_published });
      onRefresh();
    } catch (err: any) { alert(err.message); }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Builder Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>Module Builder</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Organize your course into sections, then add curated resources inside each module.
          </p>
        </div>
        <button onClick={openAddMod} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
          background: 'var(--accent-1)', color: 'white', fontSize: '0.82rem', fontWeight: 700,
          cursor: 'pointer', transition: 'filter 0.15s', flexShrink: 0,
        }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
        >+ Add Module</button>
      </div>

      {/* Module List */}
      {(!course.resource_modules || course.resource_modules.length === 0) ? (
        <div style={{
          border: '2px dashed var(--color-border)', borderRadius: '12px',
          padding: '3rem', textAlign: 'center',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📦</p>
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem', fontSize: '1rem' }}>No modules yet</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '0 0 1.25rem' }}>
            Start building by adding your first module (e.g., "Arrays", "Intro to HTML", etc.)
          </p>
          <button onClick={openAddMod} style={{
            padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px dashed rgba(108,99,255,0.5)',
            background: 'rgba(108,99,255,0.08)', color: 'var(--accent-1)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
          }}>+ Create First Module</button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {modules.map((mod: any, mIdx: number) => (
                <SortableModule
                  key={mod.id} mod={mod} mIdx={mIdx} isOpen={expandedMods[mod.id] !== false}
                  toggleOpen={() => setExpandedMods(p => ({ ...p, [mod.id]: !(expandedMods[mod.id] !== false) }))}
                  openAddRes={openAddRes} openEditMod={openEditMod} deleteMod={deleteMod} duplicateMod={duplicateMod}
                  openEditRes={openEditRes} deleteRes={deleteRes} duplicateRes={duplicateRes} toggleResPublish={toggleResPublish}
                />
              ))}

              {/* Add module footer */}
              <button onClick={openAddMod} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.75rem', borderRadius: '12px',
                border: '2px dashed var(--color-border)', background: 'transparent',
                color: 'var(--color-text-muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,99,255,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent-1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
              >+ Add Another Module</button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ── MODULE MODAL ── */}
      {modModal && (
        <Modal title={editingMod ? 'Edit Module' : 'New Module'} onClose={() => setModModal(false)}>
          <form onSubmit={saveMod} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField label="Module Title" required>
              <input required autoFocus value={modTitle} onChange={e => setModTitle(e.target.value)}
                placeholder="e.g. Arrays & Strings" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </FormField>
            <FormField label="Description" hint="Optional - shown below the module title">
              <textarea value={modDesc} onChange={e => setModDesc(e.target.value)} rows={2}
                placeholder="What topics are covered in this section?"
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </FormField>
            <FormField label="Sort Order" hint="Lower = shown first">
              <input type="number" value={modOrder} onChange={e => setModOrder(parseInt(e.target.value))}
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </FormField>
            <ModalActions onCancel={() => setModModal(false)} saving={savingMod} label={editingMod ? 'Update Module' : 'Create Module'} />
          </form>
        </Modal>
      )}

      {/* ── RESOURCE MODAL ── */}
      {resModal && (
        <Modal title={editingRes ? 'Edit Resource' : 'Add Resource'} onClose={() => setResModal(false)} wide>
          <form onSubmit={saveRes} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Section 1: Resource Type */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={labelStyle}>1. Resource Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
                {RESOURCE_TYPES.map(rt => (
                  <button
                    key={rt.value} type="button"
                    onClick={() => setResType(rt.value)}
                    style={{
                      padding: '0.75rem 0.5rem', borderRadius: '10px', border: '1px solid',
                      borderColor: resType === rt.value ? 'var(--accent-1)' : 'var(--color-border)',
                      background: resType === rt.value ? 'rgba(108,99,255,0.12)' : 'var(--color-surface-2)',
                      color: resType === rt.value ? 'var(--accent-1)' : 'var(--color-text-muted)',
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      textAlign: 'center', lineHeight: 1.3,
                    }}
                  ><span style={{ display: 'block', fontSize: '1.4rem', marginBottom: '0.4rem' }}>{rt.icon}</span>{rt.label}</button>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />

            {/* Section 2: Identification */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{...labelStyle, marginBottom: '0.75rem'}}>2. Resource Details</label>

            <FormField label="Title" required>
              <input required autoFocus value={resTitle} onChange={e => setResTitle(e.target.value)}
                placeholder="e.g. Arrays Crash Course — Striver"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FormField label="URL Slug" hint="Auto-generated, editable">
                <input required value={resSlug} onChange={e => setResSlug(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </FormField>
              <FormField label="Topic Name" hint="e.g. Arrays, React Hooks">
                <input value={resTopic} onChange={e => setResTopic(e.target.value)}
                  placeholder="e.g. Two Pointers"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <FormField label="Resource URL" required>
                <input required type="url" value={resUrl} onChange={e => setResUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </FormField>

              {resUrl && (
                <div style={{ 
                  borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)', 
                  background: '#0f172a', height: '180px', position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.3rem 0.6rem', background: 'rgba(0,0,0,0.6)', fontSize: '0.65rem', color: '#94a3b8', zIndex: 10 }}>Live Preview</div>
                  <iframe 
                    src={resUrl.includes('youtube.com/watch?v=') ? resUrl.replace('watch?v=', 'embed/') : resUrl} 
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Resource Preview"
                  />
                </div>
              )}

              <FormField label="Description">
                <textarea value={resDesc} onChange={e => setResDesc(e.target.value)} rows={3}
                  placeholder="Brief summary of what this resource covers... (Markdown supported)"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </FormField>
            </div>
            </div>

            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />

            {/* Section 3: Metadata */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{...labelStyle, marginBottom: '0.75rem'}}>3. Metadata & Settings</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <FormField label="Difficulty">
                  <select value={resDiff} onChange={e => setResDiff(e.target.value)} style={inputStyle}>
                    {DIFF_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.icon} {d.value}</option>)}
                  </select>
                </FormField>
                <FormField label="Duration (mins)" hint="0 = not specified">
                  <input type="number" value={resDuration} onChange={e => setResDuration(parseInt(e.target.value) || 0)}
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                  />
                </FormField>
                <FormField label="Sort Order">
                  <input type="number" value={resOrder} onChange={e => setResOrder(parseInt(e.target.value))}
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                  />
                </FormField>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <div onClick={() => setResPub(p => !p)} style={{
                    width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer',
                    background: resPub ? 'var(--accent-1)' : 'var(--color-border)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <div style={{ position: 'absolute', top: '2px', left: resPub ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: resPub ? '#22c55e' : 'var(--color-text-muted)' }}>
                    {resPub ? 'Published' : 'Draft'}
                  </span>
                </label>
                <ModalActions onCancel={() => setResModal(false)} saving={savingRes} label={editingRes ? 'Update Resource' : 'Add Resource'} />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════ HELPERS ═══════════════════════════════ */
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
  borderRadius: '8px', padding: '0.6rem 0.8rem', color: 'var(--text-primary)', fontSize: '0.87rem',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
};
const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)',
  display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em',
};
function iconBtn(color: string): React.CSSProperties {
  return {
    width: '26px', height: '26px', borderRadius: '6px', border: 'none',
    background: 'transparent', color, fontSize: '0.8rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  };
}

/* ═══════════════════════════════ DND COMPONENTS ═══════════════════════════════ */

export function SortableResource({ item, iIdx, isLast, openEditRes, deleteRes, duplicateRes, toggleResPublish, modId }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: item.id,
    data: { type: 'resource', modId }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.65rem 1.1rem',
    borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
    background: isDragging ? 'var(--color-surface)' : 'transparent',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Order number & Indentation */}
      <div style={{ display: 'flex', alignItems: 'center', width: '2.5rem', flexShrink: 0 }}>
        <div style={{ width: '12px', height: '1px', background: 'var(--color-border)', marginRight: '8px' }} />
        <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{iIdx + 1}.</span>
      </div>

      {/* Drag Handle */}
      <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-muted)', opacity: 0.5 }}>⋮⋮</div>

      {/* Type icon */}
      <span style={{
        fontSize: '0.9rem', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--color-border)'
      }}>{RESOURCE_TYPES.find(t => t.value === item.resource_type)?.icon || '📄'}</span>

      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {item.title}
        {item.topic_name && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{item.topic_name}</span>}
      </p>

      {/* Status + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button onClick={() => toggleResPublish(item)} style={{
          padding: '0.12rem 0.45rem', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
          background: item.is_published ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
          color: item.is_published ? '#22c55e' : '#f59e0b', border: `1px solid ${item.is_published ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
          cursor: 'pointer'
        }} title="Toggle publish status">{item.is_published ? '✓ Live' : '○ Draft'}</button>
        <div style={{ width: '1px', height: '16px', background: 'var(--color-border)', margin: '0 0.25rem' }} />
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...iconBtn('var(--color-text-muted)'), textDecoration: 'none', opacity: 0.7 }} title="Open URL">↗</a>
        <button onClick={() => duplicateRes(item, modId)} style={iconBtn('var(--color-text-muted)')} title="Duplicate">⎘</button>
        <button onClick={() => openEditRes(item, modId)} style={iconBtn('var(--color-text-muted)')} title="Edit">✎</button>
        <button onClick={() => deleteRes(item.id)} style={iconBtn('#ef4444')} title="Delete">🗑️</button>
      </div>
    </div>
  );
}

export function SortableModule({ mod, mIdx, isOpen, toggleOpen, openAddRes, openEditMod, deleteMod, duplicateMod, openEditRes, deleteRes, duplicateRes, toggleResPublish }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: mod.id,
    data: { type: 'module' }
  });
  const items = mod.resource_items || [];
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: '12px', overflow: 'hidden',
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div ref={setNodeRef} style={style}>
      {/* Module Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.9rem 1.1rem', cursor: 'pointer', userSelect: 'none',
        background: isDragging ? 'var(--color-surface-2)' : 'transparent',
      }} onClick={toggleOpen}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          {/* Drag Handle */}
          <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-muted)', opacity: 0.5, padding: '0.2rem' }}>⋮⋮</div>
          
          <span style={{
            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(108,99,255,0.05) 100%)', 
            border: '1px solid rgba(108,99,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-1)', fontFamily: 'monospace',
          }}>{mIdx + 1}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ 
              fontSize: '1rem', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              background: 'linear-gradient(90deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              {mod.title}
            </p>
            {mod.description && (
               <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                 {mod.description}
               </p>
             )}
          </div>
          <span style={{
            fontSize: '0.68rem', color: 'var(--accent-1)', fontWeight: 600,
            background: 'rgba(108,99,255,0.1)', padding: '0.2rem 0.6rem', border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: '99px', flexShrink: 0, marginLeft: 'auto',
          }}>{items.length} Resources</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '1rem' }}>
          <button onClick={e => { e.stopPropagation(); openAddRes(mod.id, items); }} style={{...iconBtn('var(--text-primary)'), background: 'rgba(59,130,246,0.15)', color: '#3b82f6'}} title="Add resource">+ Add</button>
          <div style={{ width: '1px', height: '16px', background: 'var(--color-border)', margin: '0 0.25rem' }} />
          <button onClick={e => { e.stopPropagation(); duplicateMod(mod); }} style={iconBtn('var(--color-text-muted)')} title="Duplicate module">⎘</button>
          <button onClick={e => { e.stopPropagation(); openEditMod(mod); }} style={iconBtn('var(--color-text-muted)')} title="Edit module">✎</button>
          <button onClick={e => { e.stopPropagation(); deleteMod(mod.id); }} style={iconBtn('#ef4444')} title="Delete module">🗑️</button>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginLeft: '0.5rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
        </div>
      </div>

      {/* Resource Items */}
      {isOpen && (
        <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          {items.length === 0 ? (
            <div style={{ padding: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>No resources yet in this module.</p>
              <button onClick={() => openAddRes(mod.id, items)} style={{
                padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px dashed rgba(59,130,246,0.4)',
                background: 'rgba(59,130,246,0.06)', color: '#3b82f6', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}>+ Add First Resource</button>
            </div>
          ) : (
            <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
              <div>
                {items.map((item: any, iIdx: number) => (
                  <SortableResource 
                    key={item.id} item={item} iIdx={iIdx} isLast={iIdx === items.length - 1} 
                    openEditRes={openEditRes} deleteRes={deleteRes} duplicateRes={duplicateRes} toggleResPublish={toggleResPublish} modId={mod.id} 
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.35rem' }}>
        <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
        {hint && <span style={{ fontSize: '0.67rem', color: 'var(--color-text-muted)', opacity: 0.7 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '16px', padding: '1.75rem', width: '100%',
        maxWidth: wide ? '680px' : '480px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)', animation: 'slideUp 0.2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function ModalActions({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button type="button" onClick={onCancel} style={{
        padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)',
        background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.82rem', cursor: 'pointer',
      }}>Cancel</button>
      <button type="submit" disabled={saving} style={{
        padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none',
        background: 'var(--accent-1)', color: 'white', fontSize: '0.82rem', fontWeight: 700,
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'filter 0.15s',
      }}
        onMouseEnter={e => { if (!saving) e.currentTarget.style.filter = 'brightness(1.15)'; }}
        onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
      >{saving ? 'Saving...' : label}</button>
    </div>
  );
}
function CourseEditorSkeleton() {
  return (
    <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: '80px', borderRadius: '12px', background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}
