'use client';

export default function AdminAudit() {
  return (
    <div className="admin-audit animate-fade-in">
      <div className="page-header">
        <p className="eyebrow">📋 System Monitoring</p>
        <h1>Audit <span className="gradient-text">Logs</span></h1>
        <p>View a trail of all administrative actions and system events.</p>
      </div>

      <div className="card glass" style={{ marginTop: '2rem', padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>🚧 Coming Soon</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          The Audit Log tracking system is currently under development. Once enabled, it will track all CRUD operations, role changes, and sensitive system events performed by administrators.
        </p>
        <div style={{ marginTop: '2rem' }}>
          <button className="btn btn-secondary" disabled>Export Logs (Disabled)</button>
        </div>
      </div>
    </div>
  );
}
