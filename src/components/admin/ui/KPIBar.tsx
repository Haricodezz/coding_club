'use client';

import { useState } from 'react';

interface KPI {
  label: string;
  value: number | string;
  trend?: string;
  positive?: boolean;
}

export function KPIBar({ metrics }: { metrics: KPI[] }) {
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const triggerRefresh = (label: string) => {
    setRefreshing(prev => ({ ...prev, [label]: true }));
    setTimeout(() => {
      setRefreshing(prev => ({ ...prev, [label]: false }));
    }, 800);
  };

  // Maps labels to colors: green for healthy, orange for warnings, red for critical
  const getColorCategory = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('pending') || l.includes('review') || l.includes('flag')) {
      return 'orange';
    }
    if (l.includes('error') || l.includes('warn') || l.includes('critical')) {
      return 'red';
    }
    return 'green';
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
        const statusColor = getColorCategory(metric.label);

        return (
          <div 
            key={metric.label}
            className="donezo-card metric-card interactive"
            style={{
              padding: '1.25rem 1.5rem',
              minHeight: '135px'
            }}
          >
            {/* Top Color Coded Status Marker */}
            <div className={`metric-status-marker ${statusColor}`} />

            {/* Header: Label and Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span 
                style={{ 
                  fontSize: '0.725rem', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.06em', 
                  color: 'var(--text-tertiary)', 
                  fontWeight: 700 
                }}
              >
                {metric.label}
              </span>
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
                {/* View Details Arrow */}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'default' }}>
                  →
                </span>
              </div>
            </div>

            {/* Body: Main value and Trend */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: 'auto' }}>
              <span 
                style={{ 
                  fontSize: '1.85rem', 
                  fontWeight: 700, 
                  color: 'var(--text-primary)', 
                  letterSpacing: '-0.03em',
                  fontFamily: "'Outfit', sans-serif"
                }}
              >
                {isRefreshing ? '...' : metric.value}
              </span>
              {metric.trend && !isRefreshing && (
                <span 
                  className={`card-trend ${metric.positive ? 'positive' : 'negative'}`}
                  style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 600, 
                    padding: '0.15rem 0.4rem',
                    borderRadius: 'var(--radius-full)',
                    color: metric.positive ? 'var(--accent-green)' : 'var(--accent-rose)',
                    background: metric.positive ? 'rgba(0, 200, 83, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.15rem'
                  }}
                >
                  {metric.positive ? '▲' : '▼'} {metric.trend}
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
