'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { AnimatedGridBg } from '@/components/ui/AnimatedGridBg';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message || 'Invalid credentials. Please try again.');
      setLoading(false);
      return;
    }

    // Check role for redirect
    if (authData?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();
      
      if (profile && ['super_admin', 'team'].includes(profile.role as string)) {
        router.push('/admin');
        return;
      }
    }

    router.push('/dashboard');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative',
      }}
    >
      <AnimatedGridBg />
      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div className="text-center" style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: 'var(--accent-gradient)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              margin: '0 auto 1rem',
            }}
          >
            {'</>'}
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome Back</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Sign in with your batch credentials
          </p>
        </div>

        {/* Form */}
        <div className="glass-strong" style={{ padding: '2rem' }}>
          <form onSubmit={handleLogin}>
            <div className="flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email / Batch Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="user_001@club.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  <span>⚠️</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="spinner" style={{ width: 18, height: 18 }} />
                    Signing in...
                  </span>
                ) : (
                  'Sign In 🚀'
                )}
              </button>
            </div>
          </form>

          <div className="text-center" style={{ marginTop: '1.5rem' }}>
            <Link
              href="/forgot-password"
              style={{ color: 'var(--accent-3)', fontSize: '0.875rem', textDecoration: 'underline' }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <p className="text-center text-muted" style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
          New here? Contact your admin for batch credentials.
        </p>
      </div>
    </div>
  );
}
