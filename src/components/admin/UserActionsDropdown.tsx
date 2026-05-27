'use client';

import { useRef, useEffect } from 'react';

interface DropdownProps {
  onSuspend: () => void;
  onTerminate: () => void;
  canRestrict: boolean;
  isSuspended?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export default function UserActionsDropdown({ onSuspend, onTerminate, canRestrict, isSuspended, isOpen, onToggle }: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onToggle(); // Close it
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  if (!canRestrict) return <span style={{ color: '#64748b', fontSize: '0.85rem' }}>-</span>;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius)', transition: 'background 0.2s' }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
      >
        •••
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: '0.25rem',
          background: '#1e1e2e', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)', padding: '0.5rem', zIndex: 9999,
          minWidth: '150px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
        }}>
          <button 
            onClick={() => { onToggle(); onSuspend(); }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem',
              background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
              borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: '0.85rem'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            {isSuspended ? '▶️ Activate' : '⏸️ Suspend'}
          </button>
          <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.25rem 0' }}></div>
          <button 
            onClick={() => { onToggle(); onTerminate(); }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem',
              background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer',
              borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: '0.85rem'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            🗑️ Terminate
          </button>
        </div>
      )}
    </div>
  );
}
