'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

interface ContestInfo {
  slug: string;
  title: string;
  start_time: string;
  end_time: string;
  contest_type: string;
}

interface Props {
  contest: ContestInfo;
  participantCount?: number;
}

export default function ContestHeader({ contest, participantCount = 0 }: Props) {
  const [display, setDisplay] = useState('');
  const [phase, setPhase] = useState<'pre' | 'active' | 'ended'>('pre');
  const [liveCount, setLiveCount] = useState(participantCount);

  useEffect(() => {
    setLiveCount(participantCount);
  }, [participantCount]);

  useEffect(() => {
    if (!contest) return;
    
    // Subscribe to new participants
    const supabase = getSupabase();
    const channel = supabase.channel(`public:contest_participants:contest_id=eq.${contest.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contest_participants', filter: `contest_id=eq.${contest.id}` }, () => {
        setLiveCount(c => c + 1);
      })
      .subscribe();
    const update = () => {
      const now = Date.now();
      const start = new Date(contest.start_time).getTime();
      const end = new Date(contest.end_time).getTime();
      
      if (now < start) {
        const diff = start - now;
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        setDisplay(`Starts in ${h}h ${m}m ${s}s`);
        setPhase('pre');
      } else if (now <= end) {
        const diff = end - now;
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        setDisplay(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
        setPhase('active');
      } else {
        setDisplay('Contest Ended');
        setPhase('ended');
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => {
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [contest]);

  const timerColor = phase === 'active'
    ? (display.startsWith('0h') || !display.includes('h') ? (display.startsWith('10m') ? '#f59e0b' : '#22c55e') : '#22c55e')
    : phase === 'ended' ? '#64748b' : '#60a5fa';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: '3.5rem', flexShrink: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', gap: '1rem' }}>
      
      {/* LEFT: Title and back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
        <Link href={`/contests/${contest.slug}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.8rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ← Hub
        </Link>
        <div style={{ width: '1px', height: '16px', background: 'var(--color-border)', flexShrink: 0 }} />
        <h1 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contest.title}
        </h1>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '99px', background: 'rgba(108,99,255,0.12)', color: 'var(--accent-1)', border: '1px solid rgba(108,99,255,0.25)', flexShrink: 0 }}>
          {contest.contest_type}
        </span>
      </div>

      {/* CENTER: Timer */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', margin: '0 0 0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          {phase === 'pre' ? 'Starts' : phase === 'active' ? 'Time Left' : 'Status'}
        </p>
        <p style={{ fontSize: '1.05rem', fontWeight: 800, color: timerColor, margin: 0, fontFamily: 'monospace', lineHeight: 1 }}>
          {display}
        </p>
      </div>

      {/* RIGHT: Participants & Leave */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.7rem' }}>👥</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>{liveCount} online</span>
        </div>
        
        <Link href={`/contests/${contest.slug}`} style={{ padding: '0.35rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s' }}>
          Leave
        </Link>
      </div>

    </div>
  );
}
