'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

import './admin-theme.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const user = data as unknown as AppUser;

      if (error || !user || (user.role !== 'super_admin' && user.role !== 'team')) {
        setLoading(false);
        return;
      }

      setUser(user);
      setLoading(false);
    }

    checkAuth();

    // Check localStorage for high contrast preference
    const hcStored = localStorage.getItem('adminHighContrast') === 'true';
    setHighContrast(hcStored);

    // Decoupled window event listener for high contrast toggle
    function handleHCToggle() {
      setHighContrast(prev => {
        const nextVal = !prev;
        localStorage.setItem('adminHighContrast', String(nextVal));
        return nextVal;
      });
    }

    window.addEventListener('admin-toggle-high-contrast', handleHCToggle);
    return () => {
      window.removeEventListener('admin-toggle-high-contrast', handleHCToggle);
    };
  }, [router]);

  async function handleLogout() {
    await getSupabase().auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="admin-layout-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  if (!user || (user.role !== 'super_admin' && user.role !== 'team')) {
    return (
      <div className="admin-layout-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⛔</span>
          <h2>Access Denied</h2>
          <p style={{ margin: '1rem 0 2rem' }}>You do not have the required permissions to view the CMS administrator dashboard.</p>
          <div className="flex gap-4 justify-center">
            <button className="btn btn-primary" onClick={() => router.push('/')}>
              Return Home
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-layout-wrapper ${highContrast ? 'high-contrast-mode' : ''}`}>
      {/* Accessibility Skip to main content */}
      <a href="#admin-main-content" className="skip-to-content">
        Skip to Main Content
      </a>

      <AdminSidebar user={user} onLogout={handleLogout} />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminTopbar user={user} />
        
        {/* Main Work Area */}
        <div id="admin-main-content" style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem 2.5rem' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
