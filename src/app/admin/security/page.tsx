'use client';

export default function AdminSecurity() {
  return (
    <div className="admin-security animate-fade-in">
      <div className="page-header">
        <p className="eyebrow">🔒 Access Control</p>
        <h1>Platform <span className="gradient-text">Security</span></h1>
        <p>Manage API keys, rate limits, and authentication policies.</p>
      </div>

      <div className="card glass" style={{ marginTop: '2rem', padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>🚧 Coming Soon</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Advanced security features such as IP whitelisting, strict Rate Limit configurations, and API Key management for external integrations will be available in V2.
        </p>
      </div>
    </div>
  );
}
