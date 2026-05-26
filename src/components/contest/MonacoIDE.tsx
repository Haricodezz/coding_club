'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LANGUAGES, STARTER_CODE } from '@/lib/piston';

// Lazy-load Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
    Loading editor...
  </div>
) });

export type Verdict = 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | 'JUDGE_ERROR' | null;

interface TestcaseResult {
  passed:           boolean;
  verdict:          string;
  actual_output?:   string;
  expected_output?: string;
  runtime_ms:       number;
  is_hidden?:       boolean;
}

interface RunResult {
  verdict:          string;
  runtime_ms:       number;
  testcases_total:  number;
  testcases_passed: number;
  error_message?:   string;
  compile_output?:  string;
  results?:         TestcaseResult[];
}

interface Props {
  contestSlug:  string;
  problemSlug:  string;
  problemTitle: string;
  timeLimit?:   number;
  storageKey:   string;
}

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  AC:          { label: 'Accepted',             color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    icon: '✅' },
  WA:          { label: 'Wrong Answer',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    icon: '❌' },
  TLE:         { label: 'Time Limit Exceeded',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: '⏱️' },
  RE:          { label: 'Runtime Error',        color: '#f97316', bg: 'rgba(249,115,22,0.1)',   icon: '💥' },
  CE:          { label: 'Compilation Error',    color: '#a855f7', bg: 'rgba(168,85,247,0.1)',   icon: '🔴' },
  MLE:         { label: 'Memory Limit Exceeded',color: '#ec4899', bg: 'rgba(236,72,153,0.1)',   icon: '🧠' },
  JUDGE_ERROR: { label: 'Judge Error',          color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '⚠️' },
};

export default function MonacoIDE({ contestSlug, problemSlug, problemTitle, timeLimit = 2000, storageKey }: Props) {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode]         = useState('');
  const [running, setRunning]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<RunResult | null>(null);
  const [activeTab, setActiveTab] = useState<'run' | 'submit'>('run');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const editorRef = useRef<any>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`${storageKey}:${language}`);
    setCode(saved || STARTER_CODE[language] || '');
  }, [language, storageKey]);

  // Autosave
  const handleCodeChange = useCallback((val: string | undefined) => {
    const v = val || '';
    setCode(v);
    localStorage.setItem(`${storageKey}:${language}`, v);
  }, [language, storageKey]);

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleRun() {
    setRunning(true);
    setActiveTab('run');
    setRunResult(null);
    try {
      const res = await fetch(`/api/v1/contests/${contestSlug}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_slug: problemSlug, language, code }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || 'Run failed', 'error'); return; }
      setRunResult(json);
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setActiveTab('submit');
    setSubmitResult(null);
    try {
      const res = await fetch(`/api/v1/contests/${contestSlug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_slug: problemSlug, language, code }),
      });
      const json = await res.json();
      if (res.status === 429) { showToast(json.error, 'error'); return; }
      if (!res.ok) { showToast(json.error || 'Submission failed', 'error'); return; }
      setSubmitResult(json);
      if (json.verdict === 'AC') showToast('🎉 Accepted! Great solve!', 'success');
      else showToast(`${VERDICT_CONFIG[json.verdict]?.icon || '❌'} ${VERDICT_CONFIG[json.verdict]?.label || json.verdict}`, 'error');
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const currentVerdict = activeTab === 'run' ? runResult?.verdict : submitResult?.verdict;
  const vc = currentVerdict ? VERDICT_CONFIG[currentVerdict] : null;
  const displayResult = activeTab === 'run' ? runResult : submitResult;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── TOOLBAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0, gap: '0.75rem' }}>
        {/* Language selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>LANG</span>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#f1f5f9', fontSize: '0.8rem', padding: '0.3rem 0.5rem', outline: 'none', cursor: 'pointer' }}>
            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.displayName}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleRun} disabled={running || submitting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', borderRadius: '7px', border: '1px solid rgba(59,130,246,0.4)', background: running ? 'rgba(59,130,246,0.1)' : 'transparent', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!running && !submitting) (e.currentTarget.style.background = 'rgba(59,130,246,0.12)'); }}
            onMouseLeave={e => { if (!running) (e.currentTarget.style.background = 'transparent'); }}
          >
            {running ? '▶ Running...' : '▶ Run'}
          </button>
          <button onClick={handleSubmit} disabled={running || submitting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 1rem', borderRadius: '7px', border: 'none', background: submitting ? 'rgba(108,99,255,0.7)' : 'var(--accent-1)', color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'filter 0.15s' }}
            onMouseEnter={e => { if (!submitting) (e.currentTarget.style.filter = 'brightness(1.15)'); }}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            {submitting ? '⏳ Judging...' : '⚡ Submit'}
          </button>
        </div>
      </div>

      {/* ── MONACO EDITOR ── */}
      <div style={{ flex: '1 1 0', minHeight: 0 }}>
        <MonacoEditor
          height="100%"
          language={LANGUAGES.find(l => l.id === language)?.monacoLanguage || language}
          value={code}
          onChange={handleCodeChange}
          onMount={editor => { editorRef.current = editor; }}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            tabSize: 2,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      {/* ── RESULTS PANEL ── */}
      <div style={{ flexShrink: 0, maxHeight: '240px', overflow: 'auto', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>

        {/* Result tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          {(['run', 'submit'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '0.45rem 1rem', border: 'none', background: 'transparent',
              color: activeTab === t ? '#f1f5f9' : 'var(--color-text-muted)',
              fontSize: '0.78rem', fontWeight: activeTab === t ? 700 : 400,
              cursor: 'pointer', borderBottom: activeTab === t ? '2px solid var(--accent-1)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              {t === 'run' ? '▶ Run Output' : '⚡ Submission'}
              {t === 'run' && runResult && (
                <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: runResult.testcases_passed === runResult.testcases_total ? '#22c55e' : '#ef4444' }}>
                  {runResult.testcases_passed}/{runResult.testcases_total}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '0.75rem 1rem' }}>
          {(activeTab === 'run' && running) || (activeTab === 'submit' && submitting) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid rgba(108,99,255,0.2)', borderTopColor: 'var(--accent-1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span>{activeTab === 'run' ? 'Compiling and running code...' : 'Judging submission...'}</span>
            </div>
          ) : !displayResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>
              <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{activeTab === 'run' ? '▶️' : '⚡'}</span>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>
                {activeTab === 'run' ? 'Click Run to test your code against sample testcases.' : 'Click Submit to judge your solution.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {/* Verdict badge */}
              {vc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, background: vc.bg, color: vc.color, border: `1px solid ${vc.color}40` }}>
                    {vc.icon} {vc.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {displayResult.testcases_passed}/{displayResult.testcases_total} testcases · {displayResult.runtime_ms}ms
                  </span>
                </div>
              )}

              {/* Error message */}
              {(displayResult.compile_output || displayResult.error_message) && (
                <pre style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#fca5a5', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '120px', overflow: 'auto' }}>
                  {displayResult.compile_output || displayResult.error_message}
                </pre>
              )}

              {/* Testcase results detailed list */}
              {displayResult.results && displayResult.results.length > 0 && (
                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {displayResult.results.map((r, i) => (
                    <div key={i} style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px',
                      background: r.passed ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
                      border: `1px solid ${r.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`
                    }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, background: r.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: r.passed ? '#22c55e' : '#ef4444', flexShrink: 0 }}>
                        {r.is_hidden ? '?' : (i + 1)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: r.passed ? '#22c55e' : '#ef4444' }}>
                          {r.verdict}
                        </span>
                        {r.runtime_ms > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {r.runtime_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(108,99,255,0.15)',
          color: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : 'var(--accent-1)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(108,99,255,0.3)'}`,
          backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
