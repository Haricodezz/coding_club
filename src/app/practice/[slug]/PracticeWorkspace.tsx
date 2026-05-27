'use client';

import { PanelGroup, Panel } from 'react-resizable-panels';
import PanelDivider from '@/components/workspace/PanelDivider';
import MonacoIDE from '@/components/contest/MonacoIDE';
import Markdown from '@/components/ui/Markdown';

interface PracticeWorkspaceProps {
  problem: any;
  testcases: any[];
}

export default function PracticeWorkspace({ problem, testcases }: PracticeWorkspaceProps) {
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <PanelGroup direction="horizontal" autoSaveId="practice-workspace-layout-v1">
        
        {/* ── LEFT: Problem Statement ── */}
        <Panel defaultSize={48} minSize={25} style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
            
            {/* Statement */}
            <section style={{ marginBottom: '2rem' }}>
              <Markdown text={problem.statement} />
            </section>

            {/* I/O Format */}
            {(problem.input_format || problem.output_format) && (
              <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>I/O Format</h4>
                {problem.input_format && <div style={{ marginBottom: '1rem' }}><strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Input:</strong><Markdown text={problem.input_format} /></div>}
                {problem.output_format && <div><strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Output:</strong><Markdown text={problem.output_format} /></div>}
              </section>
            )}

            {/* Constraints */}
            {problem.constraints && (
              <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Constraints</h4>
                <div style={{ background: 'var(--color-bg)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-1)' }}>
                  <Markdown text={problem.constraints} />
                </div>
              </section>
            )}

            {/* Testcases */}
            {testcases.length > 0 && (
              <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sample Testcases</h4>
                {testcases.map((tc: any, i: number) => (
                  <div key={tc.id} style={{ marginBottom: '1.25rem', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      Example {i + 1}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--color-bg)' }}>
                      <div style={{ padding: '1rem', borderRight: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 700 }}>Input</div>
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{tc.input}</pre>
                      </div>
                      <div style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 700 }}>Output</div>
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{tc.expected_output}</pre>
                      </div>
                    </div>
                    {tc.explanation && (
                      <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', borderTop: '1px dashed var(--color-border)' }}>
                        <strong style={{ fontSize: '0.75rem', color: 'var(--accent-1)' }}>Explanation:</strong>
                        <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--color-text-muted)' }}><Markdown text={tc.explanation} /></div>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Explanation */}
            {problem.explanation && (
              <section style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explanation</h4>
                <Markdown text={problem.explanation} />
              </section>
            )}
          </div>
        </Panel>

        {/* ── DRAG DIVIDER ── */}
        <PanelDivider direction="horizontal" />

        {/* ── RIGHT: Monaco IDE ── */}
        <Panel defaultSize={52} minSize={25} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg)' }}>
          <MonacoIDE
            contestSlug="practice" // Special slug for practice
            problemSlug={problem.slug}
            problemTitle={problem.title}
            timeLimit={problem.time_limit}
            storageKey={`practice:${problem.slug}`}
            executionMode={problem.execution_mode}
            functionTemplates={problem.function_templates}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}
