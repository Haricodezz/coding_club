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
  { value: 'youtube',  label: 'YouTube Video',      icon: '▶', color: '#ef4444' },
  { value: 'playlist', label: 'YouTube Playlist',   icon: '≡', color: '#ef4444' },
  { value: 'article',  label: 'Blog / Article',     icon: '✦', color: '#3b82f6' },
  { value: 'doc',      label: 'Documentation',      icon: '⊟', color: '#8b5cf6' },
  { value: 'github',   label: 'GitHub Repo',        icon: '⌂', color: '#6b7280' },
  { value: 'practice', label: 'Practice Platform',  icon: '⚡', color: '#f59e0b' },
  { value: 'pdf',      label: 'PDF / Cheatsheet',   icon: '⊡', color: '#ec4899' },
  { value: 'roadmap',  label: 'Roadmap / Guide',    icon: '◈', color: '#14b8a6' },
];

const DIFF_OPTIONS = [
  { value: 'Beginner',     icon: '🌱', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { value: 'Intermediate', icon: '⚡', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { value: 'Advanced',     icon: '🔥', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

function diffColor(level: string) { return DIFF_OPTIONS.find(d => d.value === level)?.color || '#6b7280'; }
function typeIcon(type: string) { return RESOURCE_TYPES.find(t => t.value === type)?.icon || '↗'; }
function typeColor(type: string) { return RESOURCE_TYPES.find(t => t.value === type)?.color || '#6b7280'; }

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
      <Link href="/admin/resources" style={{ color: 'var(--accent-1)', textDecoration: 'none' }}>← Back to all courses</Link>
    </div>
  );

  const moduleCount = course.resource_modules?.length || 0;
  const itemCount = course.resource_modules?.reduce((a: number, m: any) => a + (m.resource_items?.length || 0), 0) || 0;
  const totalMins = course.resource_modules?.reduce((a: number, m: any) =>
    a + (m.resource_items?.reduce((b: number, i: any) => b + (i.estimated_duration || 0), 0) || 0), 0) || 0;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '◉' },
    { key: 'builder',  label: 'Builder',  icon: '⊞' },
    { key: 'preview',  label: 'Preview',  icon: '⊙' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .cb-header { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .cb-tab-btn { position: relative; padding: 0.55rem 1.1rem; border: none; background: transparent;
          font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: color 0.2s; letter-spacing: -0.01em; }
        .cb-tab-btn::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
          background: #6c63ff; border-radius: 2px 2px 0 0; transform: scaleX(0); transition: transform 0.2s cubic-bezier(.4,0,.2,1); }
        .cb-tab-btn.active { color: #e2e8f0; }
        .cb-tab-btn.active::after { transform: scaleX(1); }
        .cb-tab-btn:not(.active) { color: #64748b; }
        .cb-tab-btn:not(.active):hover { color: #94a3b8; }
        .stat-chip { display: flex; flex-direction: column; align-items: center; 
          padding: 0.4rem 0.75rem; border-radius: 10px; 
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); min-width: 56px; }
        .stat-chip:hover { background: rgba(255,255,255,0.07); }
        .module-card { background: #141824; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; }
        .module-card:hover { border-color: rgba(108,99,255,0.25); box-shadow: 0 0 0 1px rgba(108,99,255,0.12), 0 4px 24px rgba(0,0,0,0.3); }
        .module-header { display: flex; align-items: center; justify-content: space-between;
          padding: 0.95rem 1rem; cursor: pointer; user-select: none; transition: background 0.15s; gap: 0.75rem; }
        .module-header:hover { background: rgba(255,255,255,0.02); }
        .res-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
        .res-row:last-child { border-bottom: none; }
        .res-row:hover { background: rgba(255,255,255,0.025); }
        .icon-btn { width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent;
          color: #475569; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center;
          justify-content: center; transition: background 0.15s, color 0.15s; flex-shrink: 0; }
        .icon-btn:hover { background: rgba(255,255,255,0.07); color: #e2e8f0; }
        .icon-btn.danger:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
        .drag-handle { cursor: grab; color: #334155; font-size: 0.7rem; letter-spacing: 2px; line-height: 1;
          padding: 0.3rem; border-radius: 4px; flex-shrink: 0; transition: color 0.15s; }
        .drag-handle:hover { color: #64748b; }
        .add-mod-btn { display: flex; align-items: center; gap: 0.4rem;
          padding: 0.55rem 1.1rem; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #6c63ff 0%, #8b5cf6 100%);
          color: white; font-size: 0.82rem; font-weight: 700; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s; box-shadow: 0 4px 12px rgba(108,99,255,0.35); }
        .add-mod-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .add-res-btn { padding: 0.3rem 0.7rem; border-radius: 7px; border: 1px solid rgba(59,130,246,0.3);
          background: rgba(59,130,246,0.08); color: #3b82f6; font-size: 0.72rem; font-weight: 700; cursor: pointer;
          transition: background 0.15s, border-color 0.15s; white-space: nowrap; }
        .add-res-btn:hover { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.5); }
        .view-site-btn { display: flex; align-items: center; gap: 0.35rem;
          padding: 0.45rem 0.9rem; border-radius: 9px;
          background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.22);
          color: #a78bfa; font-size: 0.77rem; font-weight: 600; text-decoration: none; transition: background 0.15s; }
        .view-site-btn:hover { background: rgba(108,99,255,0.18); }
        .pill { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.18rem 0.55rem;
          border-radius: 99px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.04em; }
        .cb-input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px; padding: 0.65rem 0.9rem; color: #e2e8f0; font-size: 0.87rem;
          outline: none; box-sizing: border-box; transition: border-color 0.15s, background 0.15s; font-family: inherit; }
        .cb-input:focus { border-color: rgba(108,99,255,0.55); background: rgba(108,99,255,0.04); }
        .cb-input::placeholder { color: #334155; }
        .form-label { font-size: 0.71rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.07em; }
        .modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-box { background: #141824; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px; padding: 1.75rem; width: 100%; box-shadow: 0 32px 80px rgba(0,0,0,0.6);
          animation: modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1); max-height: 90vh; overflow-y: auto; }
        @keyframes modalIn { from { opacity:0; transform: scale(0.93) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .dashed-zone { border: 2px dashed rgba(255,255,255,0.08); border-radius: 14px;
          padding: 3rem 2rem; text-align: center; transition: border-color 0.2s; }
        .dashed-zone:hover { border-color: rgba(108,99,255,0.3); }
        .add-more-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          width: 100%; padding: 0.8rem; border-radius: 12px; border: 2px dashed rgba(255,255,255,0.07);
          background: transparent; color: #475569; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .add-more-btn:hover { border-color: rgba(108,99,255,0.35); color: #8b80ff; background: rgba(108,99,255,0.04); }
        @keyframes pulse { 0%,100%{ opacity:.6 } 50%{ opacity:1 } }
        .toggle-sw { width: 40px; height: 22px; border-radius: 11px; position: relative; transition: background 0.25s; cursor: pointer; flex-shrink: 0; }
        .toggle-sw .knob { position: absolute; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: white; transition: left 0.25s cubic-bezier(.34,1.56,.64,1); }
        .type-card { padding: 0.75rem 0.5rem; border-radius: 10px; border: 1px solid; 
          font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s; text-align: center; line-height: 1.3; }
        .breadcrumb { display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; color: #475569; margin-bottom: 0.5rem; }
        .breadcrumb a { color: #475569; text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: #e2e8f0; }
        .breadcrumb span { color: #334155; }
        select.cb-input option { background: #141824; }
      `}</style>

      {/* ── HEADER ── */}
      <div className="cb-header" style={{ padding: '0.75rem 1.5rem', flexShrink: 0, background: '#0d1117' }}>
        <div className="breadcrumb">
          <Link href="/admin/resources">Resources</Link>
          <span>/</span>
          <span style={{ color: '#94a3b8' }}>{course.title}</span>
          {tab !== 'builder' && <><span>/</span><span style={{ color: '#e2e8f0' }}>
            {tab === 'overview' ? 'Settings' : 'Preview'}
          </span></>}
          {tab === 'builder' && <><span>/</span><span style={{ color: '#e2e8f0' }}>Module Builder</span></>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{course.difficulty_level === 'Advanced' ? '🔥' : course.difficulty_level === 'Intermediate' ? '⚡' : '🌱'}</span>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
              {course.title}
            </h1>
            <span className="pill" style={{
              background: course.is_published ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              color: course.is_published ? '#22c55e' : '#f59e0b',
              border: `1px solid ${course.is_published ? 'rgba(34,197,94,0.22)' : 'rgba(245,158,11,0.22)'}`,
              flexShrink: 0,
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              {course.is_published ? 'Published' : 'Draft'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {[
              { label: 'Modules',   value: moduleCount },
              { label: 'Resources', value: itemCount },
              { label: 'Est. Time', value: totalMins ? `${Math.round(totalMins / 60 * 10) / 10}h` : '—' },
            ].map(s => (
              <div key={s.label} className="stat-chip">
                <p style={{ fontSize: '0.88rem', fontWeight: 800, color: '#e2e8f0', margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0.2rem 0 0', whiteSpace: 'nowrap' }}>{s.label}</p>
              </div>
            ))}
            <Link href={`/resources/${course.slug}`} target="_blank" className="view-site-btn">
              <span style={{ fontSize: '0.75rem' }}>↗</span> View Course
            </Link>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 1.5rem', height: '44px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0d1117', gap: '0.1rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`cb-tab-btn${tab === t.key ? ' active' : ''}`}>
            <span style={{ marginRight: '0.4rem', opacity: 0.7 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#0d1117' }}>
        {tab === 'overview' && <OverviewTab course={course} onSaved={loadCourse} />}
        {tab === 'builder'  && <BuilderTab  course={course} courseId={courseId} onRefresh={loadCourse} />}
        {tab === 'preview'  && <PreviewTab  course={course} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ PREVIEW TAB ═══════════════════════════════ */
function PreviewTab({ course }: { course: any }) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const widths = { desktop: '100%', tablet: '768px', mobile: '375px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.2rem', border: '1px solid rgba(255,255,255,0.07)' }}>
          {[{ id: 'desktop', icon: '⊞', label: 'Desktop' }, { id: 'tablet', icon: '⊡', label: 'Tablet' }, { id: 'mobile', icon: '⊟', label: 'Mobile' }].map(d => (
            <button key={d.id} onClick={() => setDevice(d.id as any)} style={{
              background: device === d.id ? 'rgba(108,99,255,0.2)' : 'transparent',
              color: device === d.id ? '#a78bfa' : '#475569',
              border: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px',
              fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', gap: '0.4rem', alignItems: 'center', transition: 'all 0.2s',
            }}>
              <span>{d.icon}</span> <span>{d.label}</span>
            </button>
          ))}
        </div>
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.07)' }} />
        <Link href={`/resources/${course.slug}`} target="_blank" style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          ↗ Open in New Tab
        </Link>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: device === 'desktop' ? 0 : '2rem', overflow: 'auto', background: '#080b11' }}>
        <div style={{
          width: widths[device], height: device === 'desktop' ? '100%' : '800px',
          maxHeight: device === 'desktop' ? 'none' : '100%', background: '#0d1117',
          borderRadius: device === 'desktop' ? 0 : '20px', overflow: 'hidden',
          boxShadow: device === 'desktop' ? 'none' : '0 30px 60px rgba(0,0,0,0.7)',
          border: device === 'desktop' ? 'none' : '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <iframe src={`/resources/${course.slug}`} style={{ width: '100%', height: '100%', border: 'none' }} title="Student preview" />
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
    e.preventDefault(); setSaving(true);
    try {
      await saveResourceCourse(course.id, { title, slug, description, difficulty_level: difficulty, banner_url: bannerUrl, display_order: displayOrder, is_published: isPublished });
      setSaved(true); setTimeout(() => setSaved(false), 2200); onSaved();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  const diffOpt = DIFF_OPTIONS.find(d => d.value === difficulty);

  return (
    <div style={{ padding: '2rem', maxWidth: '680px', margin: '0 auto' }}>
      {/* Banner */}
      {bannerUrl ? (
        <div style={{ height: '150px', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.75rem', position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
          <img src={bannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,17,23,0.9), transparent)' }} />
          <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem' }}>
            <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{title}</p>
          </div>
        </div>
      ) : (
        <div style={{ height: '90px', borderRadius: '16px', marginBottom: '1.75rem', background: 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(139,92,246,0.04) 100%)', border: '2px dashed rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#475569' }}>⊞ Banner image will appear here</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', margin: '0 0 0.2rem', letterSpacing: '-0.02em' }}>Course Settings</h2>
          <p style={{ color: '#475569', fontSize: '0.8rem', margin: 0 }}>Edit metadata, description, and publish settings.</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <CbField label="Course Title" required>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. DSA Complete Roadmap" className="cb-input" />
        </CbField>

        <CbField label="URL Slug" hint="/resources/[slug]">
          <input required value={slug} onChange={e => setSlug(e.target.value)} className="cb-input" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
        </CbField>

        <CbField label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            placeholder="What will students learn? What is this roadmap about?" className="cb-input" style={{ resize: 'vertical' }} />
        </CbField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <CbField label="Difficulty">
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="cb-input">
              {DIFF_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.icon} {d.value}</option>)}
            </select>
          </CbField>
          <CbField label="Sort Order" hint="Lower = shown first">
            <input type="number" value={displayOrder} onChange={e => setDisplayOrder(parseInt(e.target.value))} className="cb-input" style={{ fontFamily: 'monospace' }} />
          </CbField>
        </div>

        <CbField label="Banner Image URL" hint="Recommended: 1200×400px">
          <input type="url" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://images.unsplash.com/..." className="cb-input" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }} />
        </CbField>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}>
            <div className="toggle-sw" onClick={() => setIsPublished((p: boolean) => !p)} style={{ background: isPublished ? '#6c63ff' : 'rgba(255,255,255,0.1)' }}>
              <div className="knob" style={{ left: isPublished ? '21px' : '3px' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: isPublished ? '#22c55e' : '#475569', margin: 0 }}>
                {isPublished ? 'Published' : 'Draft'}
              </p>
              <p style={{ fontSize: '0.72rem', color: '#334155', margin: 0 }}>
                {isPublished ? 'Visible to all students' : 'Only admins can see this'}
              </p>
            </div>
          </label>
          <button type="submit" disabled={saving} style={{
            padding: '0.6rem 1.5rem', borderRadius: '10px', border: 'none',
            background: saved ? '#22c55e' : 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
            color: 'white', fontSize: '0.85rem', fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(108,99,255,0.3)',
          }}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
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
      const oldIdx = modules.findIndex((m: any) => m.id === active.id);
      const newIdx = modules.findIndex((m: any) => m.id === over.id);
      const newMods = arrayMove(modules, oldIdx, newIdx);
      setModules(newMods);
      try {
        await updateResourceModuleOrders(newMods.map((m: any, i: number) => ({ id: m.id, display_order: (i + 1) * 10 })));
        onRefresh();
      } catch (err: any) { alert(err.message); }
    } else if (type === 'resource') {
      const modId = active.data.current?.modId;
      setModules((prev: any) => prev.map((m: any) => {
        if (m.id !== modId) return m;
        const oi = m.resource_items.findIndex((i: any) => i.id === active.id);
        const ni = m.resource_items.findIndex((i: any) => i.id === over.id);
        return { ...m, resource_items: arrayMove(m.resource_items, oi, ni) };
      }));
      const mod = modules.find((m: any) => m.id === modId);
      if (!mod) return;
      const oi = mod.resource_items.findIndex((i: any) => i.id === active.id);
      const ni = mod.resource_items.findIndex((i: any) => i.id === over.id);
      const newItems = arrayMove(mod.resource_items, oi, ni);
      try {
        await updateResourceItemOrders(newItems.map((i: any, idx: number) => ({ id: i.id, display_order: (idx + 1) * 10 })));
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

  useEffect(() => {
    if (!editingRes) setResSlug(resTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }, [resTitle, editingRes]);

  function openAddMod() {
    setEditingMod(null); setModTitle(''); setModDesc('');
    setModOrder((course.resource_modules?.length || 0) * 10 + 10); setModModal(true);
  }
  function openEditMod(mod: any) {
    setEditingMod(mod); setModTitle(mod.title); setModDesc(mod.description || ''); setModOrder(mod.display_order); setModModal(true);
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
    setResOrder((modItems?.length || 0) * 10 + 10); setResPub(true); setResModal(true);
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
      await saveResourceItem(null, { module_id: modId, title: `${item.title} (Copy)`, slug: `${item.slug}-copy-${Date.now()}`, description: item.description, topic_name: item.topic_name, resource_type: item.resource_type, url: item.url, estimated_duration: item.estimated_duration, difficulty: item.difficulty, display_order: item.display_order + 5, is_published: false });
      onRefresh();
    } catch (err: any) { alert(err.message); }
  }
  async function duplicateMod(mod: any) {
    if (!confirm(`Duplicate module "${mod.title}"?`)) return;
    try {
      const newMod = await saveResourceModule(null, { course_id: courseId, title: `${mod.title} (Copy)`, description: mod.description, display_order: mod.display_order + 5 });
      if (newMod && mod.resource_items?.length > 0) {
        for (const item of mod.resource_items) {
          await saveResourceItem(null, { module_id: newMod.id, title: item.title, slug: `${item.slug}-copy-${Date.now()}`, description: item.description, topic_name: item.topic_name, resource_type: item.resource_type, url: item.url, estimated_duration: item.estimated_duration, difficulty: item.difficulty, display_order: item.display_order, is_published: false });
        }
      }
      onRefresh();
    } catch (err: any) { alert(err.message); }
  }
  async function toggleResPublish(item: any) {
    try { await saveResourceItem(item.id, { ...item, is_published: !item.is_published }); onRefresh(); }
    catch (err: any) { alert(err.message); }
  }

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '920px', margin: '0 auto' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9', margin: '0 0 0.2rem', letterSpacing: '-0.02em' }}>Module Builder</h2>
          <p style={{ fontSize: '0.77rem', color: '#475569', margin: 0 }}>
            Organize your course into sections, then add curated resources inside each module.
          </p>
        </div>
        <button className="add-mod-btn" onClick={openAddMod}>
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add Module
        </button>
      </div>

      {/* Module list */}
      {(!course.resource_modules || course.resource_modules.length === 0) ? (
        <div className="dashed-zone">
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem', lineHeight: 1 }}>⊞</p>
          <h3 style={{ color: '#94a3b8', margin: '0 0 0.45rem', fontSize: '0.95rem', fontWeight: 700 }}>No modules yet</h3>
          <p style={{ color: '#334155', fontSize: '0.8rem', margin: '0 0 1.25rem' }}>
            Start building by adding your first module — e.g. &quot;Arrays&quot;, &quot;Intro to HTML&quot;
          </p>
          <button className="add-mod-btn" onClick={openAddMod} style={{ margin: '0 auto' }}>+ Create First Module</button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {modules.map((mod: any, mIdx: number) => (
                <SortableModule
                  key={mod.id} mod={mod} mIdx={mIdx} isOpen={expandedMods[mod.id] !== false}
                  toggleOpen={() => setExpandedMods(p => ({ ...p, [mod.id]: !(expandedMods[mod.id] !== false) }))}
                  openAddRes={openAddRes} openEditMod={openEditMod} deleteMod={deleteMod} duplicateMod={duplicateMod}
                  openEditRes={openEditRes} deleteRes={deleteRes} duplicateRes={duplicateRes} toggleResPublish={toggleResPublish}
                />
              ))}
              <button className="add-more-btn" onClick={openAddMod}>+ Add Another Module</button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* MODULE MODAL */}
      {modModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>
                {editingMod ? 'Edit Module' : 'New Module'}
              </h3>
              <button className="icon-btn" onClick={() => setModModal(false)} style={{ fontSize: '1rem' }}>✕</button>
            </div>
            <form onSubmit={saveMod} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <CbField label="Module Title" required>
                <input required autoFocus value={modTitle} onChange={e => setModTitle(e.target.value)} placeholder="e.g. Arrays & Strings" className="cb-input" />
              </CbField>
              <CbField label="Description" hint="Optional">
                <textarea value={modDesc} onChange={e => setModDesc(e.target.value)} rows={2} placeholder="What topics are covered here?" className="cb-input" style={{ resize: 'vertical' }} />
              </CbField>
              <CbField label="Sort Order" hint="Lower = shown first">
                <input type="number" value={modOrder} onChange={e => setModOrder(parseInt(e.target.value))} className="cb-input" style={{ fontFamily: 'monospace' }} />
              </CbField>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setModModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', fontSize: '0.82rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={savingMod} style={{ padding: '0.55rem 1.25rem', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: savingMod ? 'not-allowed' : 'pointer', opacity: savingMod ? 0.7 : 1 }}>
                  {savingMod ? 'Saving…' : editingMod ? 'Update Module' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOURCE MODAL */}
      {resModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setResModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>
                {editingRes ? 'Edit Resource' : 'Add Resource'}
              </h3>
              <button className="icon-btn" onClick={() => setResModal(false)} style={{ fontSize: '1rem' }}>✕</button>
            </div>
            <form onSubmit={saveRes} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

              {/* Type picker */}
              <div>
                <span className="form-label" style={{ display: 'block', marginBottom: '0.6rem' }}>1. Resource Type</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {RESOURCE_TYPES.map(rt => (
                    <button key={rt.value} type="button" onClick={() => setResType(rt.value)} className="type-card" style={{
                      borderColor: resType === rt.value ? rt.color : 'rgba(255,255,255,0.07)',
                      background: resType === rt.value ? `${rt.color}18` : 'rgba(255,255,255,0.03)',
                      color: resType === rt.value ? rt.color : '#475569',
                    }}>
                      <span style={{ display: 'block', fontSize: '1.35rem', marginBottom: '0.3rem', fontFamily: 'monospace' }}>{rt.icon}</span>
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

              <div>
                <span className="form-label" style={{ display: 'block', marginBottom: '0.75rem' }}>2. Resource Details</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <CbField label="Title" required>
                    <input required autoFocus value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="e.g. Arrays Crash Course — Striver" className="cb-input" />
                  </CbField>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <CbField label="URL Slug" hint="Auto-generated">
                      <input required value={resSlug} onChange={e => setResSlug(e.target.value)} className="cb-input" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                    </CbField>
                    <CbField label="Topic Name" hint="e.g. Arrays">
                      <input value={resTopic} onChange={e => setResTopic(e.target.value)} placeholder="e.g. Two Pointers" className="cb-input" />
                    </CbField>
                  </div>
                  <CbField label="Resource URL" required>
                    <input required type="url" value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="cb-input" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }} />
                  </CbField>
                  {resUrl && (
                    <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', height: '180px', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.3rem 0.6rem', background: 'rgba(0,0,0,0.6)', fontSize: '0.65rem', color: '#475569', zIndex: 10 }}>Live Preview</div>
                      <iframe src={resUrl.includes('youtube.com/watch?v=') ? resUrl.replace('watch?v=', 'embed/') : resUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Resource Preview" />
                    </div>
                  )}
                  <CbField label="Description">
                    <textarea value={resDesc} onChange={e => setResDesc(e.target.value)} rows={2} placeholder="Brief summary… (Markdown supported)" className="cb-input" style={{ resize: 'vertical' }} />
                  </CbField>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

              <div>
                <span className="form-label" style={{ display: 'block', marginBottom: '0.75rem' }}>3. Metadata & Settings</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <CbField label="Difficulty">
                    <select value={resDiff} onChange={e => setResDiff(e.target.value)} className="cb-input">
                      {DIFF_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.icon} {d.value}</option>)}
                    </select>
                  </CbField>
                  <CbField label="Duration (mins)" hint="0 = unspecified">
                    <input type="number" value={resDuration} onChange={e => setResDuration(parseInt(e.target.value) || 0)} className="cb-input" style={{ fontFamily: 'monospace' }} />
                  </CbField>
                  <CbField label="Sort Order">
                    <input type="number" value={resOrder} onChange={e => setResOrder(parseInt(e.target.value))} className="cb-input" style={{ fontFamily: 'monospace' }} />
                  </CbField>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', cursor: 'pointer' }}>
                    <div className="toggle-sw" onClick={() => setResPub(p => !p)} style={{ background: resPub ? '#6c63ff' : 'rgba(255,255,255,0.1)' }}>
                      <div className="knob" style={{ left: resPub ? '21px' : '3px' }} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: resPub ? '#22c55e' : '#475569' }}>
                      {resPub ? 'Published' : 'Draft'}
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setResModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', fontSize: '0.82rem', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={savingRes} style={{ padding: '0.55rem 1.25rem', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: savingRes ? 'not-allowed' : 'pointer', opacity: savingRes ? 0.7 : 1 }}>
                      {savingRes ? 'Saving…' : editingRes ? 'Update Resource' : 'Add Resource'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ DND COMPONENTS ═══════════════════════════════ */
export function SortableResource({ item, iIdx, isLast, openEditRes, deleteRes, duplicateRes, toggleResPublish, modId }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id, data: { type: 'resource', modId }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 10 : 1, position: 'relative' as const,
  };
  const tColor = typeColor(item.resource_type);

  return (
    <div ref={setNodeRef} style={style}>
      <div className="res-row">
        <div {...attributes} {...listeners} className="drag-handle">⋮⋮</div>
        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#334155', width: '1.25rem', textAlign: 'right', flexShrink: 0 }}>{iIdx + 1}</span>
        <span style={{
          width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${tColor}18`, borderRadius: '5px', border: `1px solid ${tColor}30`,
          fontSize: '0.75rem', color: tColor, fontFamily: 'monospace', flexShrink: 0,
        }}>{typeIcon(item.resource_type)}</span>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {item.title}
          {item.topic_name && <span style={{ marginLeft: '0.5rem', fontSize: '0.63rem', color: '#334155', background: 'rgba(255,255,255,0.04)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>{item.topic_name}</span>}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <button onClick={() => toggleResPublish(item)} className="pill" style={{
            background: item.is_published ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
            color: item.is_published ? '#22c55e' : '#f59e0b',
            border: `1px solid ${item.is_published ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.15)'}`,
            cursor: 'pointer', font: 'inherit',
          }}>
            {item.is_published ? '✓ Live' : '○ Draft'}
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.06)' }} />
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="icon-btn" title="Open URL" style={{ textDecoration: 'none' }}>↗</a>
          <button onClick={() => duplicateRes(item, modId)} className="icon-btn" title="Duplicate">⎘</button>
          <button onClick={() => openEditRes(item, modId)} className="icon-btn" title="Edit">✎</button>
          <button onClick={() => deleteRes(item.id)} className="icon-btn danger" title="Delete">✕</button>
        </div>
      </div>
    </div>
  );
}

export function SortableModule({ mod, mIdx, isOpen, toggleOpen, openAddRes, openEditMod, deleteMod, duplicateMod, openEditRes, deleteRes, duplicateRes, toggleResPublish }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mod.id, data: { type: 'module' }
  });
  const items = mod.resource_items || [];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition, opacity: isDragging ? 0.45 : 1, zIndex: isDragging ? 20 : 1, position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="module-card" style={{ borderLeft: '3px solid rgba(108,99,255,0.4)' }}>
        {/* Module Header */}
        <div className="module-header" onClick={toggleOpen}>
          <div {...attributes} {...listeners} className="drag-handle" onClick={e => e.stopPropagation()}>⋮⋮</div>
          <span style={{
            width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(108,99,255,0.25) 0%, rgba(139,92,246,0.12) 100%)',
            border: '1px solid rgba(108,99,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 800, color: '#a78bfa', fontFamily: 'monospace',
          }}>{mIdx + 1}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {mod.title}
            </p>
            {mod.description && (
              <p style={{ fontSize: '0.71rem', color: '#475569', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mod.description}
              </p>
            )}
          </div>
          <span className="pill" style={{ background: 'rgba(108,99,255,0.1)', color: '#8b80ff', border: '1px solid rgba(108,99,255,0.2)', flexShrink: 0 }}>
            {items.length} {items.length === 1 ? 'Resource' : 'Resources'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => openAddRes(mod.id, items)} className="add-res-btn">+ Add</button>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.06)', margin: '0 0.2rem' }} />
            <button onClick={() => duplicateMod(mod)} className="icon-btn" title="Duplicate module">⎘</button>
            <button onClick={() => openEditMod(mod)} className="icon-btn" title="Edit module">✎</button>
            <button onClick={() => deleteMod(mod.id)} className="icon-btn danger" title="Delete module">✕</button>
          </div>
          <span style={{ color: '#334155', fontSize: '0.7rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block', marginLeft: '0.25rem', flexShrink: 0 }}>▾</span>
        </div>

        {/* Resource Items */}
        {isOpen && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
            {items.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.78rem', color: '#334155', margin: '0 0 0.75rem' }}>No resources yet in this module.</p>
                <button onClick={() => openAddRes(mod.id, items)} style={{ padding: '0.4rem 0.85rem', borderRadius: '7px', border: '1px dashed rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.06)', color: '#3b82f6', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>+ Add First Resource</button>
              </div>
            ) : (
              <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
                <div>
                  {items.map((item: any, iIdx: number) => (
                    <SortableResource
                      key={item.id} item={item} iIdx={iIdx} isLast={iIdx === items.length - 1}
                      openEditRes={openEditRes} deleteRes={deleteRes} duplicateRes={duplicateRes}
                      toggleResPublish={toggleResPublish} modId={mod.id}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ HELPERS ═══════════════════════════════ */
function CbField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.35rem' }}>
        <label className="form-label" style={{ margin: 0 }}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
        {hint && <span style={{ fontSize: '0.65rem', color: '#334155' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CourseEditorSkeleton() {
  return (
    <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '920px', margin: '0 auto' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: '72px', borderRadius: '14px', background: '#141824', animation: `pulse 1.5s ease-in-out infinite`, animationDelay: `${i * 0.15}s`, border: '1px solid rgba(255,255,255,0.05)' }} />
      ))}
    </div>
  );
}
