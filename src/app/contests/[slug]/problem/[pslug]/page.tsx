'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import MonacoIDE from '@/components/contest/MonacoIDE';
import ContestHeader from '@/components/contest/ContestHeader';
import ProblemNavigator from '@/components/contest/ProblemNavigator';
import { getSupabase } from '@/lib/supabase';

interface Problem {
  id: string;
  slug: string;
  title: string;
  statement: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  explanation?: string;
  difficulty: string;
  points: number;
  time_limit: number;
  tags?: string[];
  label: string;
  displayOrder: number;
}

interface Testcase {
  id: string;
  input: string;
  expected_output: string;
  explanation?: string;
}

const DIFF_COLOR: Record<string, string> = {
  Easy:   '#22c55e',
  Medium: '#f59e0b',
  Hard:   '#ef4444',
};

function Markdown({ text }: { text?: string | null }) {
  if (!text) return null;

  // Simple inline renderer for code blocks and bold
  return (
    <div style={{ lineHeight: 1.75, fontSize: '0.9rem', color: '#cbd5e1' }}>
      {text.split('\n').map((line, i) => {
        const isCode = line.startsWith('```') || line.startsWith('    ');
        return (
          <div key={i} style={isCode ? { fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '0.1rem 0.5rem', borderRadius: '4px', margin: '0.1rem 0' } : undefined}>
            {line || '\u00A0'}
          </div>
        );
      })}
    </div>
  );
}

export default function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string; pslug: string }>;
}) {
  const { slug: contestSlug, pslug: problemSlug } = use(params);
  const [contest, setContest] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [samples, setSamples]   = useState<Testcase[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [panelWidth, setPanelWidth] = useState(48); // percent for left panel

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load contest problems to find this one
      const res = await fetch(`/api/v1/contests/${contestSlug}/problems`);
      if (!res.ok) return;
      const { contest: cData, problems: pData, samples: sampleData } = await res.json();
      setContest(cData);
      setProblems(pData || []);
      const found = pData?.find((p: Problem) => p.slug === problemSlug);
      if (found) { setProblem(found); setSamples(sampleData?.[found.id] || []); }

      // Fetch active participants
      const supabase = getSupabase();
      const { count } = await (supabase as any).from('contest_participants').select('*', { count: 'exact', head: true }).eq('contest_id', cData.id);
      setParticipantCount(count || 0);

      // Fetch submissions to get solved set
      const subRes = await fetch(`/api/v1/contests/${contestSlug}/submissions`);
      if (subRes.ok) {
        const subData = await subRes.json();
        const solved = new Set<string>(subData.submissions?.filter((s: any) => s.verdict === 'AC').map((s: any) => s.contest_problems?.slug));
        setSolvedSet(solved);
      }
    } finally {
      setLoading(false);
    }
  }, [contestSlug, problemSlug]);

  useEffect(() => { load(); }, [load]);

  // Real-time Solved Indicators
  useEffect(() => {
    if (!contest) return;
    const supabase = getSupabase();
    
    // We only care about this user's submissions
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const channel = supabase.channel(`public:contest_submissions:user_id=eq.${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contest_submissions', filter: `user_id=eq.${user.id}` }, (payload) => {
          if (payload.new.verdict === 'AC') {
            // Re-fetch submissions to get the updated solved set
            // or just rely on the API call since the problem map is not easily accessible from the raw submission
            // actually we can just re-run load()
            load();
          }
        })
        .subscribe();
      
      // Cleanup inside a ref or just rely on component unmount
      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [contest, load]);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(108,99,255,0.2)', borderTopColor: 'var(--accent-1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading problem...</p>
      </div>
    </div>
  );

  if (!problem) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</p>
        <h2 style={{ color: '#f1f5f9' }}>Problem not found</h2>
        <Link href={`/contests/${contestSlug}`} style={{ color: 'var(--accent-1)', textDecoration: 'none' }}>← Back to contest</Link>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
      {/* ── TOP HEADER ── */}
      {contest && <ContestHeader contest={contest} participantCount={participantCount} />}

      {/* ── NAVIGATOR ── */}
      {problems.length > 0 && (
        <ProblemNavigator 
          problems={problems.map(p => ({ ...p, solved: solvedSet.has(p.slug) }))} 
          contestSlug={contestSlug} 
          activeSlug={problemSlug} 
        />
      )}

      {/* ── SPLIT WORKSPACE ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* ── LEFT: Problem Statement ── */}
        <div style={{ width: `${panelWidth}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--color-border)' }}>
          
          {/* Header */}
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-1)', fontFamily: 'monospace' }}>{problem.label}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{problem.title}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: DIFF_COLOR[problem.difficulty] || '#f59e0b', padding: '0.15rem 0.5rem', borderRadius: '99px', background: `${DIFF_COLOR[problem.difficulty] || '#f59e0b'}15`, flexShrink: 0 }}>
              {problem.difficulty}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-1)', flexShrink: 0 }}>{problem.points}pt</span>
          </div>

        {/* Statement scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {/* Tags */}
          {problem.tags && problem.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {problem.tags.map(tag => (
                <span key={tag} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '99px', background: 'rgba(108,99,255,0.1)', color: 'var(--accent-1)', border: '1px solid rgba(108,99,255,0.2)', fontWeight: 600 }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Limits */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', padding: '0.6rem 0.85rem', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>⏱️ Time: <strong style={{ color: '#f1f5f9' }}>{problem.time_limit}ms</strong></span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>🧠 Memory: <strong style={{ color: '#f1f5f9' }}>256 MB</strong></span>
          </div>

          {/* Problem statement */}
          <section style={{ marginBottom: '1.5rem' }}>
            <Markdown text={problem.statement} />
          </section>

          {problem.input_format && (
            <section style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input Format</h4>
              <Markdown text={problem.input_format} />
            </section>
          )}

          {problem.output_format && (
            <section style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output Format</h4>
              <Markdown text={problem.output_format} />
            </section>
          )}

          {problem.constraints && (
            <section style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Constraints</h4>
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <Markdown text={problem.constraints} />
              </div>
            </section>
          )}

          {/* Sample testcases */}
          {samples.length > 0 && (
            <section style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Examples</h4>
              {samples.map((tc, i) => (
                <div key={tc.id} style={{ marginBottom: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '0.4rem 0.75rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Example {i + 1}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                    <div style={{ padding: '0.75rem', borderRight: '1px solid var(--color-border)' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>Input</p>
                      <pre style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap' }}>{tc.input}</pre>
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>Output</p>
                      <pre style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap' }}>{tc.expected_output}</pre>
                    </div>
                  </div>
                  {tc.explanation && (
                    <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid var(--color-border)', background: 'rgba(108,99,255,0.04)' }}>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}><strong style={{ color: 'var(--accent-1)' }}>Note:</strong> {tc.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {problem.explanation && (
            <section style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explanation</h4>
              <Markdown text={problem.explanation} />
            </section>
          )}
        </div>
      </div>

      {/* ── DRAG DIVIDER ── */}
      <div
        style={{ width: '4px', cursor: 'col-resize', background: 'var(--color-border)', flexShrink: 0, transition: 'background 0.15s' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--accent-1)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--color-border)')}
        onMouseDown={e => {
          const startX = e.clientX;
          const startW = panelWidth;
          const onMove = (ev: MouseEvent) => {
            const delta = ((ev.clientX - startX) / window.innerWidth) * 100;
            setPanelWidth(Math.min(70, Math.max(30, startW + delta)));
          };
          const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
      />

      {/* ── RIGHT: Monaco IDE ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <MonacoIDE
          contestSlug={contestSlug}
          problemSlug={problemSlug}
          problemTitle={problem.title}
          timeLimit={problem.time_limit}
          storageKey={`${contestSlug}:${problemSlug}`}
        />
      </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
