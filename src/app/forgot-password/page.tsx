'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = getSupabase();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div className="text-center" style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Reset Password</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Enter your email and we'll send a reset link.
          </p>
        </div>

        <div className="glass-strong" style={{ padding: '2rem' }}>
          {sent ? (
            <div className="text-center">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ marginBottom: '0.75rem' }}>Check your inbox</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                We sent a reset link to <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>
              </p>
              <Link href="/login" className="btn btn-secondary" style={{ width: '100%' }}>
                ← Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex-col gap-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="user_001@club.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <Link href="/login" className="btn btn-ghost" style={{ width: '100%', textAlign: 'center' }}>
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
