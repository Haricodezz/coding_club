'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Terminal, Trophy, BookOpen, User } from 'lucide-react';

interface LinkItem {
  id: string;
  href: string;
  label: string;
  desc: string;
  icon: string;
  badge?: number;
}

const INITIAL_LINKS: LinkItem[] = [
  { id: 'ide', href: '/ide', label: 'Launch Online IDE', icon: 'terminal', desc: 'Write & compile in 6 languages' },
  { id: 'lb', href: '/leaderboard', label: 'Global Leaderboard', icon: 'trophy', desc: 'Compare your score & rank' },
  { id: 'learn', href: '/resources', label: 'Learning Resources', icon: 'book', desc: 'Master DSA & Web Dev', badge: 2 },
  { id: 'profile', href: '/profile/me', label: 'Manage Profile', icon: 'user', desc: 'Link Codeforces & LeetCode' },
];

function SortableItem({ id, item }: { id: string, item: LinkItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'terminal': return <Terminal size={18} color="var(--accent)" />;
      case 'trophy': return <Trophy size={18} color="var(--gold)" />;
      case 'book': return <BookOpen size={18} color="#38bdf8" />;
      case 'user': return <User size={18} color="#a855f7" />;
      default: return null;
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-3 ${isDragging ? 'drag-card-active' : ''}`}
      {...attributes}
    >
      {/* Drag Handle */}
      <div {...listeners} className="drag-handle flex items-center justify-center" style={{ padding: '0.5rem 0.2rem' }}>
        <GripVertical size={16} />
      </div>

      <Link
        href={item.href}
        className="flex items-center gap-3 w-full"
        style={{
          padding: '0.875rem 1rem',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          transition: 'var(--transition)',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
          (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
          (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
        }}
      >
        <div style={{ flexShrink: 0, padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          {getIcon(item.icon)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.label}</span>
            {item.badge && (
              <span className="badge" style={{ background: 'var(--color-error)', color: '#fff', fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                {item.badge} New
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {item.desc}
          </div>
        </div>
        <span style={{ marginLeft: 'auto', color: '#64748b' }}>→</span>
      </Link>
    </div>
  );
}

export function QuickLinksWidget() {
  const [links, setLinks] = useState<LinkItem[]>(INITIAL_LINKS);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('dashboard_quick_links_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLinks(parsed);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('dashboard_quick_links_v2', JSON.stringify(links));
    }
  }, [links, isClient]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setLinks((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
        <h3 className="flex items-center gap-2">
          <span>⚡</span> Quick Links
        </h3>
      </div>
      
      {isClient ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-col gap-2">
              {links.map(link => (
                <SortableItem key={link.id} id={link.id} item={link} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex-col gap-2">
          {links.map(link => (
            <SortableItem key={link.id} id={link.id} item={link} />
          ))}
        </div>
      )}
    </div>
  );
}
