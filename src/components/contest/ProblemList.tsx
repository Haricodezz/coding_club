'use client';

import { useState, useRef } from 'react';

export interface ContestProblem {
  mapId?: string; // If already saved
  problem_id: string; // the actual problem id
  slug: string;
  title: string;
  difficulty: string;
  points: number;
  label: string; // A, B, C, etc.
  display_order: number;
}

interface ProblemListProps {
  problems: ContestProblem[];
  onChange: (problems: ContestProblem[]) => void;
  onRemove: (problemId: string) => void;
}

export default function ProblemList({ problems, onChange, onRemove }: ProblemListProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const dragNode = useRef<HTMLElement | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIdx(index);
    dragNode.current = e.target as HTMLElement;
    
    // Add visual styling for drag
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    
    // Reorder array
    const newList = [...problems];
    const item = newList[draggedIdx];
    newList.splice(draggedIdx, 1);
    newList.splice(targetIdx, 0, item);
    
    // Update labels and display_order
    newList.forEach((p, idx) => {
      p.display_order = idx;
      p.label = String.fromCharCode(65 + idx); // A, B, C...
    });
    
    setDraggedIdx(targetIdx);
    onChange(newList);
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.style.opacity = '1';
    }
    setDraggedIdx(null);
    dragNode.current = null;
  };

  const handlePointsChange = (idx: number, newPoints: number) => {
    const newList = [...problems];
    newList[idx] = { ...newList[idx], points: newPoints };
    onChange(newList);
  };

  if (problems.length === 0) {
    return (
      <div style={{ padding: '2rem', border: '1px dashed var(--color-border)', borderRadius: '10px', textAlign: 'center', background: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>No problems added yet. Click "Add Problems" to start.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {problems.map((p, idx) => (
        <div 
          key={p.problem_id}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragEnter={(e) => handleDragEnter(e, idx)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', 
            borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            cursor: 'grab'
          }}
        >
          <div style={{ color: 'var(--color-text-muted)', cursor: 'grab', padding: '0.2rem' }}>
            ⋮⋮
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(108,99,255,0.1)', color: 'var(--accent-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
            {p.label}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
              <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 700,
                background: p.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : p.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>
                {p.difficulty}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{p.slug}</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Pts:</label>
            <input 
              type="number" 
              value={p.points} 
              onChange={(e) => handlePointsChange(idx, Number(e.target.value))}
              style={{ width: '60px', padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none' }} 
            />
          </div>
          
          <button 
            onClick={() => onRemove(p.problem_id)}
            style={{ padding: '0.3rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', marginLeft: '0.5rem' }}
            title="Remove from contest"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
