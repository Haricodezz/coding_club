'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Target, TrendingUp } from 'lucide-react';

interface QuickStatsProps {
  winRate: number;
  accuracy: number;
  trend: number;
}

export function QuickStatsWidget({ winRate, accuracy, trend }: QuickStatsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ padding: '1rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
      <div 
        className="flex justify-between items-center" 
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Activity size={18} color="var(--accent-3)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Quick Stats</span>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="grid-3" style={{ marginTop: '1rem', gap: '1rem', padding: '1rem 0 0 0', borderTop: '1px solid var(--color-border)' }}>
          <div className="flex-col gap-1 items-center">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Win Rate</span>
            <div className="flex items-center gap-1">
              <Target size={14} color="#fbbf24" />
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{winRate}%</span>
            </div>
          </div>
          <div className="flex-col gap-1 items-center">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accuracy</span>
            <div className="flex items-center gap-1">
              <Activity size={14} color="#38bdf8" />
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{accuracy}%</span>
            </div>
          </div>
          <div className="flex-col gap-1 items-center">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trend</span>
            <div className="flex items-center gap-1">
              <TrendingUp size={14} color={trend >= 0 ? '#22c55e' : '#ef4444'} />
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
