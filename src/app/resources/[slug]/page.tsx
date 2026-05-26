'use client';

import { useState, useEffect, use } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CourseViewerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCourseData();
  }, [slug]);

  async function loadCourseData() {
    setLoading(true);
    const supabase = getSupabase();
    try {
      const { data, error } = await (supabase as any)
        .from('resource_courses')
        .select(`
          *,
          resource_modules (
            id, title, display_order,
            resource_items (*)
          )
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;

      if (data) {
        data.resource_modules = data.resource_modules?.sort((a: any, b: any) => a.display_order - b.display_order) || [];
        data.resource_modules.forEach((mod: any) => {
          mod.resource_items = mod.resource_items?.sort((a: any, b: any) => a.display_order - b.display_order) || [];
        });

        setCourse(data);

        if (data.resource_modules.length > 0) {
          setExpandedModules({ [data.resource_modules[0].id]: true });
          if (data.resource_modules[0].resource_items?.length > 0) {
            setActiveItem(data.resource_modules[0].resource_items[0]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleModule(modId: string) {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'youtube': return '📺';
      case 'article': return '📝';
      case 'github': return '📦';
      case 'practice': return '⚡';
      case 'doc': return '📄';
      default: return '🔗';
    }
  }

  function getEmbedUrl(url: string) {
    // Handle youtube.com/watch?v= and youtu.be/ formats
    if (url.includes('youtu.be/')) {
      return 'https://www.youtube.com/embed/' + url.split('youtu.be/')[1].split('?')[0];
    }
    if (url.includes('watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    return url;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center p-4">
        <h1 className="text-3xl font-bold text-white mb-4">Course Not Found</h1>
        <Link href="/resources" className="text-[var(--brand-primary)] hover:underline">
          ← Back to Resources Hub
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* ─── LEFT SIDEBAR: COURSE ROADMAP ─── */}
      <div style={{
        width: '18rem',
        borderRight: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Course Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border-primary)',
          background: 'var(--bg-tertiary)',
        }}>
          <Link
            href="/resources"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: 'var(--text-tertiary)',
              fontSize: '0.8rem',
              marginBottom: '0.75rem',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            ← Back to Hub
          </Link>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', lineHeight: 1.3, marginBottom: '0.75rem' }}>
            {course.title}
          </h2>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '4px', overflow: 'hidden' }}>
            <div style={{ width: '0%', height: '100%', background: 'var(--brand-primary)', borderRadius: '99px', transition: 'width 0.3s' }}></div>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.4rem' }}>0% Completed</p>
        </div>

        {/* Modules + Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {course.resource_modules?.map((mod: any, mIdx: number) => (
            <div key={mod.id} style={{ marginBottom: '0.25rem' }}>
              <button
                onClick={() => toggleModule(mod.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{mIdx + 1}.</span>
                  {mod.title}
                </span>
                <span style={{ transition: 'transform 0.2s', transform: expandedModules[mod.id] ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>▾</span>
              </button>

              {expandedModules[mod.id] && (
                <div style={{ paddingLeft: '1rem', paddingBottom: '0.25rem' }}>
                  {mod.resource_items?.map((item: any) => {
                    const isActive = activeItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveItem(item)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                          color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ marginTop: '2px', opacity: 0.7, flexShrink: 0 }}>{getTypeIcon(item.resource_type)}</span>
                        <div>
                          <span style={{ display: 'block', fontWeight: isActive ? 600 : 400, lineHeight: 1.3 }}>{item.title}</span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.55, fontFamily: 'monospace' }}>
                            {item.estimated_duration ? item.estimated_duration + ' min' : item.resource_type}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {(!mod.resource_items || mod.resource_items.length === 0) && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', padding: '0.4rem 0.5rem', fontStyle: 'italic' }}>Coming soon...</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── RIGHT PANE: CONTENT VIEWER ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeItem ? (
          <>
            {/* Toolbar */}
            <div style={{
              height: '3.5rem',
              borderBottom: '1px solid var(--border-primary)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 1.5rem',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-primary)',
                }}>
                  {activeItem.resource_type.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'white' }}>{activeItem.title}</span>
              </div>
              <button
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '99px',
                  border: 'none',
                  background: 'var(--brand-primary)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'filter 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
              >
                ✓ Mark Complete
              </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
                  {activeItem.title}
                </h1>
                {activeItem.topic_name && (
                  <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-primary)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '0.2rem 0.6rem', borderRadius: '99px', marginBottom: '1rem' }}>
                    {activeItem.topic_name}
                  </span>
                )}
                {activeItem.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.7 }}>
                    {activeItem.description}
                  </p>
                )}

                {/* YouTube Embed */}
                {activeItem.resource_type === 'youtube' && (
                  <div style={{
                    position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden',
                    borderRadius: '12px', border: '1px solid var(--border-primary)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    marginBottom: '2rem',
                  }}>
                    <iframe
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      src={getEmbedUrl(activeItem.url)}
                      title={activeItem.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* External Resource Card */}
                {activeItem.resource_type !== 'youtube' && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    padding: '3rem',
                    textAlign: 'center',
                    marginBottom: '2rem',
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{getTypeIcon(activeItem.resource_type)}</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>External Resource</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
                      This resource lives on an external platform. It will open in a new tab.
                    </p>
                    <a
                      href={activeItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'white', color: 'black',
                        padding: '0.7rem 1.5rem', borderRadius: '8px',
                        fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = '#e5e5e5')}
                      onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'white')}
                    >
                      Open Resource ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📚</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Select a Resource</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '24rem' }}>
              Pick a lecture or resource from the roadmap on the left to start learning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
