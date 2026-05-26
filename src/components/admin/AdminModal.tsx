'use client';

import { useEffect, useState } from 'react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function AdminModal({ isOpen, onClose, title, children }: AdminModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end',
        pointerEvents: isOpen ? 'auto' : 'none'
      }}
    >
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0, transition: 'opacity 0.3s ease'
        }} 
      />
      
      {/* Slide-over Content */}
      <div 
        style={{
          position: 'relative', width: '100%', maxWidth: '450px', background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)', height: '100%', display: 'flex', flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', borderRadius: '50%' }}>
            ✕
          </button>
        </div>
        
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
