'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';
import type { User as AppUser } from '@/types';

// New Components
import { CircularProgress } from '@/components/learning/CircularProgress';
import { CourseFlowchart } from '@/components/learning/CourseFlowchart';
import { ResourceCard } from '@/components/learning/ResourceCard';
import { DiscussionBoard } from '@/components/learning/DiscussionBoard';
import { TopicOverview } from '@/components/learning/TopicOverview';

export default function EnhancedCourseViewerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  
  // Data State
  const [user, setUser] = useState<AppUser | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Progress & Bookmarks
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [recentlyCompleted, setRecentlyCompleted] = useState<string | null>(null);

  // UI State
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Videos' | 'Practice' | 'Articles'>('All');
  
  // Mobile / View State
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  // 1. Initial Load & Auth
  useEffect(() => {
    const supabase = getSupabase();
    async function loadUserAndData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        if (userData) setUser(userData as unknown as AppUser);
      }
      loadCourseData(session?.user?.id);
    }
    loadUserAndData();
  }, [slug]);

  // 2. Fetch Course & Progress
  async function loadCourseData(userId?: string) {
    setLoading(true);
    const supabase = getSupabase();
    try {
      const { data, error } = await (supabase as any)
        .from('resource_courses')
        .select(`
          *,
          resource_modules (
            id, title, description, display_order,
            resource_items (*)
          )
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;

      if (data) {
        // Sort modules and items
        data.resource_modules = data.resource_modules?.sort((a: any, b: any) => a.display_order - b.display_order) || [];
        data.resource_modules.forEach((mod: any) => {
          mod.resource_items = mod.resource_items?.sort((a: any, b: any) => a.display_order - b.display_order) || [];
        });

        setCourse(data);

        // Set initial UI state
        if (data.resource_modules.length > 0) {
          const firstModId = data.resource_modules[0].id;
          setActiveModuleId(firstModId);
          setExpandedModules({ [firstModId]: true });
        }

        // Fetch user progress & bookmarks if logged in
        if (userId) {
          const { data: progData } = await (supabase as any).from('resource_progress').select('item_id').eq('user_id', userId).eq('completed', true);
          if (progData) setCompletedItems(new Set(progData.map((p: any) => p.item_id)));

          const { data: bmData } = await (supabase as any).from('resource_bookmarks').select('item_id').eq('user_id', userId);
          if (bmData) setBookmarkedItems(new Set(bmData.map((b: any) => b.item_id)));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 3. Actions
  function toggleModule(modId: string) {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
    setActiveModuleId(modId);
    setActiveItem(null); // Show topic overview
  }

  async function handleToggleComplete(itemId: string, isCompleted: boolean) {
    if (!user) return alert("Please login to track progress");
    
    // Optimistic
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (isCompleted) next.add(itemId);
      else next.delete(itemId);
      return next;
    });

    if (isCompleted) {
      setRecentlyCompleted(itemId);
      setTimeout(() => setRecentlyCompleted(null), 3000); // Trigger confetti/animation
    }

    const supabase = getSupabase();
    try {
      await (supabase as any).from('resource_progress').upsert({
        user_id: user.id,
        item_id: itemId,
        completed: isCompleted,
        completed_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to update progress', err);
    }
  }

  async function handleBookmarkToggle(itemId: string, isBookmarked: boolean) {
    if (!user) return alert("Please login to bookmark");
    
    // Optimistic
    setBookmarkedItems(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });

    const supabase = getSupabase();
    try {
      if (isBookmarked) {
        await (supabase as any).from('resource_bookmarks').insert({ user_id: user.id, item_id: itemId });
      } else {
        await (supabase as any).from('resource_bookmarks').delete().match({ user_id: user.id, item_id: itemId });
      }
    } catch (err) {
      console.error('Failed to update bookmark', err);
    }
  }

  // 4. Derived Data
  const activeModule = useMemo(() => {
    return course?.resource_modules?.find((m: any) => m.id === activeModuleId);
  }, [course, activeModuleId]);

  const allCourseItems = useMemo(() => {
    if (!course) return [];
    return course.resource_modules.flatMap((m: any) => m.resource_items || []);
  }, [course]);

  const totalCourseItems = allCourseItems.length;
  const totalCompleted = completedItems.size;
  const courseProgressPercent = totalCourseItems > 0 ? Math.round((totalCompleted / totalCourseItems) * 100) : 0;
  
  const estimatedRemainingHours = useMemo(() => {
    const uncompletedItems = allCourseItems.filter((i: any) => !completedItems.has(i.id));
    const totalMins = uncompletedItems.reduce((acc: number, item: any) => acc + (item.estimated_duration || 0), 0);
    return Math.ceil(totalMins / 60);
  }, [allCourseItems, completedItems]);

  const filteredModuleItems = useMemo(() => {
    if (!activeModule?.resource_items) return [];
    return activeModule.resource_items.filter((item: any) => {
      // Search
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Tab
      if (activeTab === 'Videos' && item.resource_type !== 'youtube') return false;
      if (activeTab === 'Practice' && item.resource_type !== 'practice') return false;
      if (activeTab === 'Articles' && item.resource_type !== 'article' && item.resource_type !== 'doc') return false;
      return true;
    });
  }, [activeModule, searchQuery, activeTab]);

  // Flowchart data
  const flowchartNodes = useMemo(() => {
    if (!course?.resource_modules) return [];
    return course.resource_modules.map((m: any, i: number) => {
      const moduleItems = m.resource_items || [];
      const moduleCompletedItems = moduleItems.filter((item: any) => completedItems.has(item.id)).length;
      const isCompleted = moduleItems.length > 0 && moduleCompletedItems === moduleItems.length;
      const isCurrent = m.id === activeModuleId;
      
      // Calculate simple zig-zag layout
      const x = 50 + (i * 120);
      const y = 150 + (i % 2 === 0 ? -40 : 40);

      return {
        id: m.id,
        label: m.title.split(' ')[0], // short label
        status: isCompleted ? 'completed' : isCurrent ? 'current' : 'locked',
        x, y
      };
    });
  }, [course, activeModuleId, completedItems]);

  const flowchartEdges = useMemo(() => {
    if (!course?.resource_modules) return [];
    const edges = [];
    for (let i = 0; i < course.resource_modules.length - 1; i++) {
      edges.push({ from: course.resource_modules[i].id, to: course.resource_modules[i+1].id });
    }
    return edges;
  }, [course]);

  // 5. Render Helpers
  function getEmbedUrl(url: string) {
    if (url.includes('youtu.be/')) return 'https://www.youtube.com/embed/' + url.split('youtu.be/')[1].split('?')[0];
    if (url.includes('watch?v=')) return url.replace('watch?v=', 'embed/');
    return url;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center p-4 bg-bg-primary">
        <h1 className="text-3xl font-bold text-white mb-4">Course Not Found</h1>
        <Link href="/resources" className="text-brand-primary hover:underline">← Back to Resources</Link>
      </div>
    );
  }

  return (
    <div className="course-layout">
      {/* Dynamic styles specifically for this layout */}
      <style dangerouslySetInnerHTML={{__html: `
        .course-layout {
          display: grid;
          grid-template-columns: 320px 1fr 320px;
          height: calc(100vh - var(--navbar-height));
          margin-top: var(--navbar-height);
          background: var(--color-bg);
          color: var(--text-primary);
          overflow: hidden;
        }
        .course-sidebar-left {
          border-right: 1px solid var(--color-border);
          background: var(--color-surface);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          z-index: 10;
        }
        /* Custom scrollbar for sidebar */
        .course-sidebar-left::-webkit-scrollbar { width: 4px; }
        .course-sidebar-left::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 4px; }
        
        .course-main {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--color-bg);
          position: relative;
        }
        .course-sidebar-right {
          border-left: 1px solid var(--color-border);
          background: var(--color-surface);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          z-index: 10;
        }
        .course-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface-2);
        }
        .tree-module-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
        }
        .tree-module-btn:hover { background: var(--color-surface-2); }
        .tree-module-btn.active { background: rgba(108,99,255,0.08); border-left: 4px solid var(--accent); }
        
        .tree-item-btn {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem 0.75rem 2.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }
        .tree-item-btn:hover { background: var(--color-surface-2); }
        .tree-item-btn.active { color: var(--accent-3); background: rgba(108,99,255,0.04); font-weight: 600; }
        
        /* Mobile handling & Grid Breakpoints */
        .course-mobile-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 80;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .course-mobile-backdrop.open {
          display: block;
          opacity: 1;
          pointer-events: auto;
        }

        @media (max-width: 1440px) {
          .course-layout { grid-template-columns: 280px 1fr 280px; }
        }
        @media (max-width: 1024px) {
          .course-layout { grid-template-columns: 320px 1fr; }
          .course-sidebar-right { 
            position: fixed; right: 0; top: var(--navbar-height); bottom: 0; width: 320px; 
            transform: translateX(100%); transition: transform 0.2s ease; z-index: 90;
            box-shadow: -10px 0 30px rgba(0,0,0,0.5);
          }
          .course-sidebar-right.open { transform: translateX(0); }
        }
        @media (max-width: 768px) {
          .course-layout { grid-template-columns: 1fr; }
          .course-sidebar-left { 
            position: fixed; left: 0; top: var(--navbar-height); bottom: 0; width: 85vw; max-width: 320px;
            transform: translateX(-100%); transition: transform 0.2s ease; z-index: 90;
            box-shadow: 10px 0 30px rgba(0,0,0,0.5);
          }
          .course-sidebar-left.open { transform: translateX(0); }
          .course-sidebar-right { width: 85vw; max-width: 320px; }
        }
        
        /* Print layout */
        @media print {
          .course-layout { display: block; height: auto; overflow: visible; }
          .course-sidebar-left, .course-sidebar-right { display: none !important; }
          .course-main { overflow: visible; }
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          background: var(--accent);
          animation: fall 1s ease-out forwards;
          z-index: 9999;
          pointer-events: none;
        }
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100px) rotate(360deg) scale(0); opacity: 0; }
        }
      `}}/>

      <div className={`course-mobile-backdrop ${showLeftSidebar || showRightSidebar ? 'open' : ''}`} onClick={() => { setShowLeftSidebar(false); setShowRightSidebar(false); }}></div>

      {/* ─── CONFETTI OVERLAY ─── */}
      {recentlyCompleted && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="confetti" style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 20}%`,
              background: ['#22c55e', '#eab308', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 4)],
              animationDelay: `${Math.random() * 0.2}s`,
              animationDuration: `${0.8 + Math.random() * 0.5}s`
            }} />
          ))}
        </div>
      )}

      {/* ─── LEFT SIDEBAR (Navigation Tree) ─── */}
      <div className={`course-sidebar-left ${showLeftSidebar ? 'open' : ''}`}>
        <div className="course-header">
          <Link href="/resources" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-tertiary)', fontSize: '0.8rem', textDecoration: 'none', marginBottom: '0.5rem' }}>
            ← Back to Hub
          </Link>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: 'var(--text-secondary)' }}>
            {course.title}
          </h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {course.resource_modules?.map((mod: any, mIdx: number) => {
            const modItems = mod.resource_items || [];
            const modCompleted = modItems.filter((i:any) => completedItems.has(i.id)).length;
            const modProgress = modItems.length > 0 ? Math.round((modCompleted / modItems.length) * 100) : 0;

            return (
              <div key={mod.id}>
                <button 
                  className={`tree-module-btn ${activeModuleId === mod.id ? 'active' : ''}`}
                  onClick={() => toggleModule(mod.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 800 }}>{String(mIdx + 1).padStart(2, '0')}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: activeModuleId === mod.id ? 800 : 600, color: activeModuleId === mod.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{mod.title}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '1.8rem' }}>
                      ({modItems.length} items)
                    </div>
                    {/* Tiny Progress Bar */}
                    <div style={{ width: '100%', height: '3px', background: 'var(--color-surface)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${modProgress}%`, height: '100%', background: modProgress === 100 ? 'var(--color-success)' : 'var(--accent)' }} />
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedModules[mod.id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {expandedModules[mod.id] && (
                  <div style={{ background: 'var(--color-bg)', padding: '0.25rem 0' }}>
                    {modItems.map((item: any) => {
                      const isItemActive = activeItem?.id === item.id;
                      const isItemCompleted = completedItems.has(item.id);
                      return (
                        <button
                          key={item.id}
                          className={`tree-item-btn ${isItemActive ? 'active' : ''}`}
                          onClick={() => { setActiveModuleId(mod.id); setActiveItem(item); }}
                        >
                          <div style={{ 
                            width: '16px', height: '16px', borderRadius: '50%', border: `1.5px solid ${isItemCompleted ? 'var(--color-success)' : 'var(--text-muted)'}`, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
                            background: isItemCompleted ? 'var(--color-success)' : 'transparent'
                          }}>
                            {isItemCompleted && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ display: 'block', fontSize: '0.85rem', lineHeight: 1.3, color: isItemActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                              {item.estimated_duration ? `${item.estimated_duration}m • ` : ''}{item.resource_type}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="course-main">
        {/* Topbar for mobile controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost btn-sm" style={{ display: 'none' }} onClick={() => setShowLeftSidebar(!showLeftSidebar)} id="mobile-menu-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            <span style={{ marginLeft: '8px' }}>Chapters</span>
          </button>
          
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Link href="/resources" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Resources</Link>
            <span>›</span>
            <span style={{ color: 'var(--text-secondary)' }}>{course.title}</span>
            <span>›</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeModule?.title || 'Overview'}</span>
          </div>

          <button className="btn btn-ghost btn-sm" style={{ display: 'none' }} onClick={() => setShowRightSidebar(!showRightSidebar)} id="mobile-tools-btn">
            Tools ⚙️
          </button>
          {/* Inject media query to show these buttons on mobile */}
          <style dangerouslySetInnerHTML={{__html: `@media(max-width: 1024px) { #mobile-menu-btn, #mobile-tools-btn { display: flex !important; } }`}}/>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          
          {/* VIEW 1: Individual Resource View */}
          {activeItem ? (
            <div>
              {/* Video Player Section */}
              {activeItem.resource_type === 'youtube' && (
                <div style={{ background: '#000', width: '100%' }}>
                  <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      src={getEmbedUrl(activeItem.url)}
                      title={activeItem.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Content Details */}
              <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-primary)', lineHeight: 1.2 }}>{activeItem.title}</h1>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {activeItem.topic_name && <span className="badge badge-dsa">{activeItem.topic_name}</span>}
                      {activeItem.difficulty && <span className="badge">{activeItem.difficulty}</span>}
                      {activeItem.estimated_duration && <span className="badge">⏱ {activeItem.estimated_duration} min</span>}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      className={`btn ${bookmarkedItems.has(activeItem.id) ? 'btn-secondary' : 'btn-ghost'}`}
                      onClick={() => handleBookmarkToggle(activeItem.id, !bookmarkedItems.has(activeItem.id))}
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      {bookmarkedItems.has(activeItem.id) ? '🔖 Saved' : '🔖 Save'}
                    </button>
                    <button 
                      className={`btn ${completedItems.has(activeItem.id) ? 'btn-success' : 'btn-primary'}`}
                      onClick={() => handleToggleComplete(activeItem.id, !completedItems.has(activeItem.id))}
                    >
                      {completedItems.has(activeItem.id) ? '✓ Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </div>

                {activeItem.description && (
                  <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem', background: 'var(--color-surface-2)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                    {activeItem.description}
                  </p>
                )}

                {/* External Link for non-video */}
                {activeItem.resource_type !== 'youtube' && (
                  <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)', borderRadius: '12px', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>External Resource</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>This {activeItem.resource_type} opens in a new tab.</p>
                    <a href={activeItem.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" onClick={() => handleToggleComplete(activeItem.id, true)}>
                      Open Resource ↗
                    </a>
                  </div>
                )}

                {/* Discussion Board Integration */}
                <DiscussionBoard itemId={activeItem.id} user={user} />
              </div>
            </div>
          ) : (
            /* VIEW 2: Topic Overview / Dashboard */
            <div style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
              
              {/* If we are at the root (no module active) or just showing the module overview */}
              {activeModule ? (
                <>
                  <TopicOverview 
                    module={activeModule} 
                    items={activeModule.resource_items || []} 
                    completedItemIds={completedItems} 
                    onStartLearning={(item) => setActiveItem(item)}
                  />

                  {/* Resource Filters / Tabs within Topic */}
                  <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                    {['All', 'Videos', 'Practice', 'Articles'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                          background: 'none', border: 'none', padding: '0.75rem 0', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                          color: activeTab === tab ? 'var(--accent-3)' : 'var(--text-muted)',
                          borderBottom: `2px solid ${activeTab === tab ? 'var(--accent-3)' : 'transparent'}`,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <input 
                      type="search" 
                      placeholder="Search within topic..." 
                      className="form-input" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ maxWidth: '300px' }}
                    />
                  </div>

                  {/* Sub-items Grid */}
                  {filteredModuleItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--color-surface)', borderRadius: '12px' }}>
                      No resources found for this filter.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {filteredModuleItems.map((item: any) => (
                        <ResourceCard
                          key={item.id}
                          item={item}
                          isActive={false}
                          isCompleted={completedItems.has(item.id)}
                          isBookmarked={bookmarkedItems.has(item.id)}
                          onSelect={(i) => setActiveItem(i)}
                          onToggleComplete={handleToggleComplete}
                          onBookmarkToggle={handleBookmarkToggle}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Fallback if no module is selected at all */
                <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
                  <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome to {course.title}</h1>
                  <p style={{ color: 'var(--text-secondary)' }}>Select a module from the sidebar to begin.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT SIDEBAR (Progress & Tools) ─── */}
      <div className={`course-sidebar-right ${showRightSidebar ? 'open' : ''}`}>
        {/* Progress Header */}
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--color-surface-2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1.5rem 0', color: 'var(--text-primary)', width: '100%', textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Course Progress
          </h3>
          
          <CircularProgress 
            progress={courseProgressPercent} 
            size={160} 
            strokeWidth={12} 
            label="COMPLETED"
            sublabel={`${totalCompleted} / ${totalCourseItems} items`}
          />

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{estimatedRemainingHours} hours</span> estimated remaining
          </div>
        </div>

        {/* Tools Tabs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          
          {/* Interactive Flowchart Mini */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Learning Path</h4>
            <CourseFlowchart 
              nodes={flowchartNodes} 
              edges={flowchartEdges} 
              onNodeClick={(id) => {
                toggleModule(id);
                if (window.innerWidth <= 1024) setShowRightSidebar(false);
              }} 
            />
          </div>

          {/* Bookmarks Section */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔖</span> My Bookmarks
            </h4>
            
            {bookmarkedItems.size === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic', background: 'var(--color-surface)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                No saved items yet. Click the bookmark icon on resources to save them here for quick access.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Array.from(bookmarkedItems).slice(0, 5).map(id => {
                  const item = allCourseItems.find((i: any) => i.id === id);
                  if (!item) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        const mod = course.resource_modules.find((m:any) => m.resource_items?.some((i:any) => i.id === id));
                        if (mod) {
                          setExpandedModules(prev => ({...prev, [mod.id]: true}));
                          setActiveModuleId(mod.id);
                        }
                        setActiveItem(item);
                        if (window.innerWidth <= 1024) setShowRightSidebar(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem',
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px',
                        textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    >
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{item.resource_type === 'youtube' ? '▶️' : '📝'}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
      
    </div>
  );
}
