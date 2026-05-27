'use client';

interface TopicOverviewProps {
  module: any;
  items: any[];
  completedItemIds: Set<string>;
  onStartLearning: (firstItem: any) => void;
}

export function TopicOverview({ module, items, completedItemIds, onStartLearning }: TopicOverviewProps) {
  if (!module) return null;

  const totalItems = items.length;
  const completedCount = items.filter(i => completedItemIds.has(i.id)).length;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  
  const estimatedTime = items.reduce((acc, item) => acc + (item.estimated_duration || 0), 0);
  const hours = Math.floor(estimatedTime / 60);
  const minutes = estimatedTime % 60;
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const itemsByType = items.reduce((acc, item) => {
    acc[item.resource_type] = (acc[item.resource_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {module.title}
        </h1>
        {progressPercent === 100 && (
          <span style={{ fontSize: '1.5rem' }} title="Topic Completed">🏆</span>
        )}
      </div>
      
      <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
        {module.description || `Master the concepts and practical applications of ${module.title}. This module contains ${totalItems} resources carefully curated to take you from beginner to advanced.`}
      </p>

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Your Progress</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: progressPercent === 100 ? 'var(--color-success)' : 'var(--text-primary)' }}>{progressPercent}%</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({completedCount}/{totalItems})</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--color-surface)', borderRadius: '99px', overflow: 'hidden', marginTop: '0.25rem' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? 'var(--color-success)' : 'var(--accent)', transition: 'width 0.5s ease' }} />
          </div>
        </div>

        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Estimated Time</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{hours > 0 ? hours : minutes}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{hours > 0 ? 'hours' : 'minutes'}</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>based on average completion</span>
        </div>

        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Contents</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
            {Object.entries(itemsByType).map(([type, count]) => (
              <span key={type} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                {String(count)} {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={() => items.length > 0 && onStartLearning(items[0])}
          className="btn btn-primary"
          style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
          disabled={items.length === 0}
        >
          {progressPercent === 0 ? 'Start Learning' : progressPercent === 100 ? 'Review Module' : 'Continue Learning'} 
        </button>
      </div>

    </div>
  );
}
