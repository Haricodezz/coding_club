interface KPI {
  label: string;
  value: number | string;
  trend?: string;
  positive?: boolean;
}

export function KPIBar({ metrics }: { metrics: KPI[] }) {
  return (
    <div 
      className="admin-kpi-bar"
      style={{
        display: 'flex',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        background: 'var(--color-surface-2)',
        overflow: 'hidden',
        marginBottom: '1.5rem'
      }}
    >
      {metrics.map((metric, idx) => (
        <div 
          key={metric.label}
          style={{
            flex: 1,
            padding: '1rem 1.5rem',
            borderRight: idx !== metrics.length - 1 ? '1px solid var(--color-border)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}
        >
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {metric.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {metric.value}
            </span>
            {metric.trend && (
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 500, 
                color: metric.positive ? '#10b981' : '#f43f5e' 
              }}>
                {metric.positive ? '↑' : '↓'} {metric.trend}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
