'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Question, TestCase, TestCaseResult } from '@/types';
import { LANGUAGES, STARTER_CODE } from '@/lib/piston';
import Markdown from '@/components/ui/Markdown';

// Monaco editor loaded client-side only (SSR not supported)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div style={{ height: 400, background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner" />
  </div>
) });

import MonacoIDE from '@/components/contest/MonacoIDE';

// ... other imports ...

export default function QotDPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/qotd/today')
      .then(r => r.json())
      .then(json => {
        if (json.data) setQuestion(json.data as Question);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div className="page-header animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <p className="eyebrow">💡 Question of the Day</p>
          <h1><span className="gradient-text">Daily Challenge</span></h1>
          <p>Solve today's problem to earn <strong style={{ color: 'var(--accent-3)' }}>10 points</strong>. Copy-paste is disabled — type your solution.</p>
        </div>

        {/* Solved Banner */}
        {alreadySolved && pointsEarned && (
          <div className="alert alert-success animate-slide-in" style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
            🎉 <strong>Congratulations!</strong> You earned <strong>{pointsEarned} points</strong> for solving today's challenge!
          </div>
        )}

        {!question ? (
          <div className="empty-state">
            <span className="empty-state-icon">📭</span>
            <h3>No question today</h3>
            <p>The admin hasn't scheduled a question yet. Check back soon!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem', height: '700px' }}>
            {/* Left: Problem Statement */}
            <div className="flex-col gap-4" style={{ overflowY: 'auto', paddingRight: '0.5rem' }}>
              <div className="card">
                <div className="flex items-center gap-2" style={{ marginBottom: '1rem' }}>
                  <h3>{question.title}</h3>
                  <span className={`badge badge-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.8 }}>
                  <Markdown text={(question as any).statement || (question as any).description || ''} />
                </div>
              </div>

              {(question as any).constraints && (
                <div className="card">
                  <h4 style={{ marginBottom: '0.5rem' }}>Constraints</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{(question as any).constraints}</p>
                </div>
              )}
            </div>

            {/* Right: Monaco IDE */}
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', background: 'var(--color-bg)' }}>
              <MonacoIDE 
                contestSlug="qotd" 
                problemSlug={(question as any).slug} 
                problemTitle={question.title} 
                storageKey={`qotd-${(question as any).slug}`} 
                executionMode={(question as any).execution_mode}
                functionTemplates={(question as any).function_templates}
                disableCopyPaste={true}
                onSubmissionComplete={(res) => {
                  if (res.points_earned > 0) {
                    setPointsEarned(res.points_earned);
                    setAlreadySolved(true);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
