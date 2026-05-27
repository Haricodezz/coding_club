'use client';

export default function AdminSettings() {
  return (
    <div className="admin-settings animate-fade-in">
      <div className="page-header">
        <p className="eyebrow">⚙️ Configuration</p>
        <h1>Platform <span className="gradient-text">Settings</span></h1>
        <p>Manage global configuration, integrations, and feature flags.</p>
      </div>

      <div className="card glass" style={{ marginTop: '2rem', padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>🚧 Coming Soon</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Global platform settings are currently hardcoded via environment variables. A database-backed settings panel will be released in the next update to allow hot-swapping configurations like OAuth providers, maintenance mode, and contest syncing intervals.
        </p>
      </div>
    </div>
  );
}
