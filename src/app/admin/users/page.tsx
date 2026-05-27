'use client';

import { useEffect, useState, useMemo } from 'react';
import { User } from '@/types';
import Link from 'next/link';
import AdminStatsCard from '@/components/admin/AdminStatsCard';
import { UserBadge, StatusBadge } from '@/components/admin/AdminBadges';
import AdminModal from '@/components/admin/AdminModal';
import UserActionsDropdown from '@/components/admin/UserActionsDropdown';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Partial<User>[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'team' | 'super_admin'>('student');
  const [batchId, setBatchId] = useState('Batch_2026');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [usersRes, meRes] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json())
    ]);
    if (usersRes.data) setUsers(usersRes.data);
    if (meRes.data) setCurrentUser(meRes.data);
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, role, batch_id: batchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register user');
      
      setMsg({ text: 'User registered successfully!', type: 'success' });
      // Refresh list
      const updatedUsers = await fetch('/api/users').then(r => r.json());
      if (updatedUsers.data) setUsers(updatedUsers.data);
      
      // Reset form
      setEmail(''); setUsername(''); setPassword('');
      setTimeout(() => { setIsModalOpen(false); setMsg(null); }, 1500);
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setCreating(false);
    }
  }

  async function handleRestrict(userId: string, action: 'suspend' | 'activate' | 'terminate') {
    if (action === 'terminate') {
      if (!confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) return;
    } else if (action === 'suspend') {
      if (!confirm('Are you sure you want to suspend this user? They will not be able to log in.')) return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}/restrict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      
      if (action === 'terminate') {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else if (action === 'suspend') {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: true } as any : u));
        alert(data.message);
      } else if (action === 'activate') {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: false } as any : u));
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Derived state for stats
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'super_admin').length;
  const teamCount = users.filter(u => u.role === 'team').length;
  const studentCount = users.filter(u => u.role === 'student').length;

  // Filtering
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             u.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 400 }} />
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            User Management <span style={{ fontSize: '0.9rem', padding: '0.2rem 0.6rem', background: 'rgba(108,99,255,0.1)', color: 'var(--accent)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{totalUsers} Total</span>
          </h1>
          <p style={{ color: '#64748b' }}>View, search, and manage platform access for students and team members.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin/users/import" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)' }}>
            <span>📄</span> Bulk Import CSV
          </Link>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 0 20px rgba(108,99,255,0.4)' }}>
            <span>+</span> Create User
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <AdminStatsCard title="Total Users" value={totalUsers} subtitle="Across all roles" icon="👥" />
        <AdminStatsCard title="Students" value={studentCount} subtitle="Active learners" icon="🎓" trend="up" />
        <AdminStatsCard title="Team Members" value={teamCount} subtitle="Platform moderators" icon="🛡️" />
        <AdminStatsCard title="Super Admins" value={adminCount} subtitle="Full access accounts" icon="👑" />
      </div>

      {/* Table Section */}
      <div className="glass" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'visible' }}>
        
        {/* Table Toolbar */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input" 
                style={{ paddingLeft: '2.5rem', width: '300px', height: '38px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              />
            </div>
            <select 
              className="form-select" 
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{ height: '38px', width: '150px', background: 'var(--color-surface)' }}
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="team">Team Member</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing {filteredUsers.length} users
          </div>
        </div>

        {/* The Table */}
        <div style={{ overflowX: openDropdownId ? 'visible' : 'auto', paddingBottom: openDropdownId ? '100px' : '0', transition: 'padding 0.2s' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>User</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Role</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Joined Date</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u: any, i) => {
                const isSuperAdmin = currentUser?.role === 'super_admin';
                const isTeam = currentUser?.role === 'team';
                const canRestrict = (isSuperAdmin && u.role !== 'super_admin' && u.id !== currentUser?.id) || 
                                   (isTeam && u.role === 'student');
                const isDropdownOpen = openDropdownId === u.id;
                
                return (
                  <tr key={u.id} className="group" style={{ 
                    borderBottom: '1px solid var(--color-border)', 
                    transition: 'background 0.2s',
                    position: 'relative',
                    zIndex: isDropdownOpen ? 50 : 1,
                    animation: `fadeIn 0.3s ease-out ${(i % 10) * 0.05}s both`
                  }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)', flexShrink: 0 }}>
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>{u.username}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <UserBadge role={u.role || 'student'} />
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <StatusBadge isSuspended={u.isSuspended || false} />
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(u.created_at!).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <UserActionsDropdown 
                        canRestrict={canRestrict!} 
                        onSuspend={() => handleRestrict(u.id!, u.isSuspended ? 'activate' : 'suspend')}
                        onTerminate={() => handleRestrict(u.id!, 'terminate')}
                        isSuspended={u.isSuspended || false}
                        isOpen={isDropdownOpen}
                        onToggle={() => setOpenDropdownId(isDropdownOpen ? null : u.id!)}
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                    <div className="empty-state-icon" style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }}>🔍</div>
                    <h3 style={{ color: 'var(--text-muted)', margin: 0 }}>No users found</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Modal for Create User */}
      <AdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New User">
        {msg && (
          <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1.5rem' }}>
            {msg.type === 'error' ? '❌' : '✅'} {msg.text}
          </div>
        )}
        <form onSubmit={handleRegister} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" required className="form-input" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" required className="form-input" placeholder="johndoe" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Temporary Password</label>
            <input type="password" required className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={6} />
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>Must be at least 6 characters long.</span>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Access Role</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value as any)}>
              <option value="student">Student</option>
              {currentUser?.role === 'super_admin' && <option value="team">Team Member</option>}
              {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Batch ID</label>
            <input type="text" className="form-input" placeholder="e.g. Batch_2026" value={batchId} onChange={e => setBatchId(e.target.value)} />
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ flex: 1, boxShadow: '0 0 15px rgba(108,99,255,0.4)' }}>
              {creating ? 'Registering...' : 'Create User'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
