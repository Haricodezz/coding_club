'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Calendar, Clock, Filter } from 'lucide-react';
import type { Contest } from '@/types';

export function ContestsWidget({ contests }: { contests: Contest[] }) {
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const filteredContests = contests.filter(c => {
    if (activeTab === 'active') return c.status === 'active';
    if (activeTab === 'upcoming') return c.status === 'upcoming';
    return c.status === 'completed';
  });

  const getCountdown = (dateString: string) => {
    const diff = new Date(dateString).getTime() - now.getTime();
    if (diff <= 0) return 'Started';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <h3 className="flex items-center gap-2">
          <Trophy size={20} color="var(--gold)" /> Contests
        </h3>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0.2rem' }}>
          <Filter size={16} />
        </button>
      </div>

      <div className="flex gap-2" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {(['active', 'upcoming', 'completed'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              background: 'none', border: 'none', padding: '0.4rem 0.8rem', 
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: activeTab === tab ? 600 : 400,
              textTransform: 'capitalize',
              fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-col gap-3 min-h-[200px]">
        {filteredContests.length > 0 ? (
          filteredContests.map((contest) => {
            const isActive = contest.status === 'active';
            return (
              <div 
                key={contest.id}
                style={{
                  padding: '1rem', background: 'var(--color-bg-2)',
                  border: isActive ? '1px solid rgba(108, 99, 255, 0.4)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)', position: 'relative'
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                  <span 
                    className={`badge ${isActive ? 'animate-pulse-ring' : ''}`}
                    style={{ 
                      background: isActive ? 'var(--color-error-bg)' : 'rgba(108,99,255,0.1)',
                      color: isActive ? 'var(--color-error)' : 'var(--accent-3)',
                      border: isActive ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(108,99,255,0.2)'
                    }}
                  >
                    {isActive ? '● LIVE' : (activeTab === 'completed' ? 'Completed' : 'Upcoming')}
                  </span>
                  
                  {activeTab !== 'completed' && (
                    <span className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: isActive ? 'var(--color-error)' : '#64748b', fontWeight: 600 }}>
                      <Clock size={12} /> {getCountdown(isActive ? contest.end_date : contest.start_date)}
                    </span>
                  )}
                </div>
                
                <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, margin: '0.4rem 0', fontSize: '0.95rem' }}>
                  {contest.title}
                </h4>
                
                <div className="flex justify-between items-center" style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(contest.start_date).toLocaleDateString()}</span>
                  <Link 
                    href={contest.hackerrank_contest_id ? `https://hackerrank.com/${contest.hackerrank_contest_id}` : '/contests'} 
                    target="_blank" 
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    {isActive ? 'Enter Now' : (activeTab === 'completed' ? 'View Results' : 'Register')}
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state text-center" style={{ padding: '2rem 0' }}>
            <Calendar size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No {activeTab === 'completed' ? 'past' : activeTab} contests found.</p>
            {activeTab === 'active' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Keep practicing in the meantime!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
