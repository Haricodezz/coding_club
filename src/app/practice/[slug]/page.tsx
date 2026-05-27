import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';

// Components (We will create a specialized MonacoIDE wrapper for practice)
import PracticeWorkspace from './PracticeWorkspace';
import Markdown from '@/components/ui/Markdown';

export default async function PracticeProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch the problem
  const { data: problem } = await supabase
    .from('question_bank')
    .select('*')
    .eq('slug', slug)
    .eq('available_for_practice', true)
    .eq('is_published', true)
    .single();

  if (!problem) return notFound();

  // Fetch testcases (only visible ones for the statement)
  const { data: testcases } = await supabase
    .from('question_bank_testcases')
    .select('*')
    .eq('question_id', problem.id)
    .eq('is_hidden', false)
    .order('display_order', { ascending: true });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
      {/* ── TOP HEADER ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/practice" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '1.2rem' }}>←</Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{problem.title}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '99px', background: problem.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : problem.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: problem.difficulty === 'Easy' ? '#22c55e' : problem.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>{problem.difficulty}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{problem.points} points</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── SPLIT WORKSPACE ── */}
      <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading Workspace...</div>}>
        <PracticeWorkspace problem={problem} testcases={testcases || []} />
      </Suspense>
    </div>
  );
}
