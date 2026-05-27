export function UserBadge({ role }: { role: string }) {
  let config = { bg: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', border: 'rgba(100,116,139,0.2)', label: role };

  if (role === 'super_admin') {
    config = { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.3)', label: 'Super Admin' };
  } else if (role === 'team') {
    config = { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: 'rgba(56,189,248,0.3)', label: 'Team Member' };
  } else if (role === 'student') {
    config = { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)', label: 'Student' };
  }

  return (
    <span style={{ 
      background: config.bg, 
      color: config.color, 
      border: `1px solid ${config.border}`,
      padding: '0.2rem 0.6rem',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem'
    }}>
      {role === 'super_admin' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: config.color, boxShadow: `0 0 8px ${config.color}` }} />}
      {config.label}
    </span>
  );
}

export function StatusBadge({ isSuspended }: { isSuspended: boolean }) {
  if (isSuspended) {
    return (
      <span style={{ 
        background: 'rgba(239,68,68,0.1)', 
        color: '#ef4444', 
        border: '1px solid rgba(239,68,68,0.2)',
        padding: '0.15rem 0.5rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.7rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} /> Suspended
      </span>
    );
  }
  
  return (
    <span style={{ 
      background: 'rgba(34,197,94,0.1)', 
      color: '#4ade80', 
      border: '1px solid rgba(34,197,94,0.2)',
      padding: '0.15rem 0.5rem',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.7rem',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} /> Active
    </span>
  );
}
