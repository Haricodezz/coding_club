'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface KPI {
  label: string;
  value: number | string;
  trend?: string;
  positive?: boolean;
  icon?: string;
  href?: string;
}

export function KPIBar({ metrics }: { metrics: KPI[] }) {
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const triggerRefresh = (label: string) => {
    setRefreshing(prev => ({ ...prev, [label]: true }));
    setTimeout(() => {
      setRefreshing(prev => ({ ...prev, [label]: false }));
    }, 800);
  };

  return (
    <div 
      className="admin-kpi-bar"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem',
        width: '100%'
      }}
    >
      {metrics.map((metric) => {
        const isRefreshing = refreshing[metric.label];

        return (
          <div 
            key={metric.label}
            className="donezo-card metric-card interactive"
            onClick={() => metric.href && router.push(metric.href)}
            style={{
              padding: '1.25rem 1.5rem',
              minHeight: '135px',
              cursor: metric.href ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Icon (subtle) */}
            {metric.icon && (
              <span style={{
                position: 'absolute',
                right: '-10px',
                bottom: '-20px',
                fontSize: '6rem',
                opacity: 0.03,
                pointerEvents: 'none'
              }}>
                {metric.icon}
              </span>
            )}

            {/* Header: Label and Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {metric.icon && <span style={{ fontSize: '1rem' }}>{metric.icon}</span>}
                <span 
                  style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-tertiary)', 
                    fontWeight: 600 
                  }}
                >
                  {metric.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {/* Refresh Trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerRefresh(metric.label);
                  }}
                  aria-label={`Refresh ${metric.label}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: '0.15rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
                    transition: 'color var(--transition-fast)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  🔄
                </button>
                {metric.href && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>→</span>
                )}
              </div>
            </div>

            {/* Body: Main value and Trend */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: 'auto' }}>
              <span 
                style={{ 
                  fontSize: '2rem', 
                  fontWeight: 800, 
                  color: 'var(--text-primary)', 
                  letterSpacing: '-0.03em',
                }}
              >
                {isRefreshing ? '...' : metric.value}
              </span>
              {metric.trend && !isRefreshing && (
                <span 
                  style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    color: metric.positive ? 'var(--accent-green)' : 'var(--accent-rose)',
                    background: metric.positive ? 'rgba(0, 200, 83, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  {metric.positive ? '↑' : '↓'} {metric.trend}
                </span>
              )}
            </div>

            {/* Custom Rotate Keyframes */}
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
}
