'use client';

export default function AdminResourcesEmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '3rem',
      background: 'var(--color-bg)',
      overflowY: 'auto',
    }}>
      {/* Decorative Grid */}
      <div style={{
        position: 'relative', width: '120px', height: '120px',
        marginBottom: '2rem',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(108,99,255,0.04) 100%)',
          border: '1px solid rgba(108,99,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '3.5rem',
        }}>📚</div>
        {/* Decorative dots */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position: 'absolute',
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'rgba(108,99,255,0.3)',
            top: i < 2 ? '-4px' : 'auto',
            bottom: i >= 2 ? '-4px' : 'auto',
            left: i % 2 === 0 ? '-4px' : 'auto',
            right: i % 2 === 1 ? '-4px' : 'auto',
          }} />
        ))}
      </div>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
        Select a Course
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '22rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
        Choose a course from the sidebar to manage its modules, lectures, and curated resources.
      </p>

      {/* Feature hints */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: '32rem', width: '100%', textAlign: 'left' }}>
        {[
          { icon: '📝', title: 'Overview', desc: 'Edit course metadata, banner, and settings' },
          { icon: '🏗️', title: 'Module Builder', desc: 'Build structured learning modules' },
          { icon: '🔗', title: 'Resource Manager', desc: 'Add YouTube, docs, repos & practice links' },
          { icon: '👁️', title: 'Live Preview', desc: 'See exactly how students see the course' },
        ].map(f => (
          <div key={f.title} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '12px', padding: '1rem',
          }}>
            <div style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>{f.icon}</div>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 0.25rem' }}>{f.title}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <p style={{ marginTop: '2rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', opacity: 0.6 }}>
        Or click <strong style={{ color: 'var(--accent-1)' }}>+</strong> in the sidebar to create a new course.
      </p>
    </div>
  );
}
