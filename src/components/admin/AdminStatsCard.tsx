export default function AdminStatsCard({ title, value, subtitle, icon, trend }: { title: string, value: string | number, subtitle: string, icon: string, trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="stat-box" style={{ 
      background: 'rgba(20, 20, 25, 0.7)', 
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'left'
    }}>
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '6rem', opacity: 0.03, transform: 'rotate(15deg)' }}>
        {icon}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.5rem' }}>
        <span className="stat-value" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', background: 'none', WebkitTextFillColor: 'initial', margin: 0 }}>{value}</span>
        {trend && (
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 600, 
            color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b',
            background: trend === 'up' ? 'rgba(34,197,94,0.1)' : trend === 'down' ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>{subtitle}</p>
    </div>
  );
}
