'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ContestInfo {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  contest_type: string;
  difficulty?: string;
}

interface Props {
  contest: ContestInfo;
  onJoin: () => Promise<void>;
  participantCount?: number;
}

export default function ContestJoinCard({ contest, onJoin, participantCount = 0 }: Props) {
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await onJoin();
    } finally {
      setJoining(false);
    }
  };

  const start = new Date(contest.start_time);
  const end = new Date(contest.end_time);
  const durationMs = end.getTime() - start.getTime();
  const durationHrs = Math.floor(durationMs / 3600000);
  const durationMins = Math.floor((durationMs % 3600000) / 60000);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', width: '100%', background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        
        {/* Banner area */}
        <div style={{ height: '120px', background: 'linear-gradient(135deg, var(--accent-1) 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, margin: 0, zIndex: 1, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{contest.title}</h1>
        </div>

        <div style={{ padding: '2.5rem' }}>
          {contest.description && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem', textAlign: 'center' }}>
              {contest.description}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Start Time</span>
              <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>{start.toLocaleString()}</span>
            </div>
            <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Duration</span>
              <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>{durationHrs > 0 && `${durationHrs}h `}{durationMins > 0 && `${durationMins}m`}</span>
            </div>
            <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Ruleset</span>
              <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>{contest.contest_type}</span>
            </div>
            <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Registered</span>
              <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>{participantCount} hackers</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={handleJoin} disabled={joining} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '10px' }}>
              {joining ? 'Registering...' : 'Join Contest'}
            </button>
            <Link href="/contests" style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
              ← Back to Contests
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
