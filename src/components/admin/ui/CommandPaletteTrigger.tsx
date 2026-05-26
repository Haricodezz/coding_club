export function CommandPaletteTrigger() {
  return (
    <button 
      className="admin-command-trigger"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '240px',
        padding: '0.4rem 0.75rem',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        color: 'var(--text-tertiary)',
        fontSize: '0.8rem',
        cursor: 'text',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-hover)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.color = 'var(--text-tertiary)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ opacity: 0.7 }}>🔍</span>
        <span>Search or jump to...</span>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.15rem 0.35rem',
        background: 'var(--color-surface-3)',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 500,
        fontFamily: 'monospace'
      }}>
        ⌘K
      </div>
    </button>
  );
}
