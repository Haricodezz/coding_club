'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Question, TestCase, TestCaseResult } from '@/types';
import { LANGUAGES, STARTER_CODE } from '@/lib/piston';

// Monaco editor loaded client-side only (SSR not supported)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div style={{ height: 400, background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner" />
  </div>
) });

export default function QotDPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(STARTER_CODE['python']);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const editorRef = useRef<unknown>(null);

  useEffect(() => {
    fetch('/api/qotd/today')
      .then(r => r.json())
      .then(json => {
        if (json.data) setQuestion(json.data as Question);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleLanguageChange(lang: string) {
    setLanguage(lang);
    setCode(STARTER_CODE[lang] || '');
    setRunOutput(null);
    setRunError(null);
    setTestResults(null);
  }

  // -----------------------------------------------
  // Copy-paste prevention (spec requirement)
  // Implemented on the Monaco editor's DOM container
  // -----------------------------------------------
  function handleEditorMount(editor: unknown) {
    editorRef.current = editor;
    const domNode = (editor as { getDomNode: () => HTMLElement | null }).getDomNode();
    if (!domNode) return;

    const prevent = (e: Event) => {
      const ce = e as ClipboardEvent;
      if ((e as ClipboardEvent).type === 'paste') {
        ce.preventDefault();
        // Show a user-friendly inline toast
        setRunError('⛔ Copy-paste is disabled. Please type your solution.');
        setTimeout(() => setRunError(null), 3000);
      } else {
        ce.preventDefault();
      }
    };

    // Block paste, copy, contextmenu at DOM level
    domNode.addEventListener('paste', prevent, true);
    domNode.addEventListener('copy', prevent, true);
    domNode.addEventListener('contextmenu', prevent, true);
  }

  async function handleRun() {
    if (!code.trim()) return;
    setRunning(true);
    setRunOutput(null);
    setRunError(null);
    setTestResults(null);

    const stdin = question?.example_input || '';
    const res = await fetch('/api/compiler/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, stdin }),
    });
    const result = await res.json();

    if (result.success) setRunOutput(result.output || '(no output)');
    else setRunError(`${result.error}: ${result.message}`);
    setRunning(false);
  }

  async function handleSubmit() {
    if (!question || !code.trim()) return;
    setSubmitting(true);
    setTestResults(null);
    setRunOutput(null);
    setRunError(null);

    const res = await fetch('/api/qotd/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, question_id: question.id }),
    });
    const json = await res.json();

    if (json.error) { setRunError(json.error); setSubmitting(false); return; }

    setTestResults(json.results || []);
    if (json.points_earned > 0) {
      setPointsEarned(json.points_earned);
      setAlreadySolved(true);
    }
    setSubmitting(false);
  }

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
      <div className="container" style={{ maxWidth: 1100 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem' }}>
            {/* Left: Problem Statement */}
            <div className="flex-col gap-4">
              <div className="card">
                <div className="flex items-center gap-2" style={{ marginBottom: '1rem' }}>
                  <h3>{question.title}</h3>
                  <span className={`badge badge-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.8 }}>
                  {question.description}
                </p>
              </div>

              {(question.example_input || question.example_output) && (
                <div className="card">
                  <h4 style={{ marginBottom: '0.75rem' }}>Example</h4>
                  {question.example_input && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Input</p>
                      <pre className="font-mono" style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', color: '#a8b3cf' }}>
                        {question.example_input}
                      </pre>
                    </div>
                  )}
                  {question.example_output && (
                    <div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Output</p>
                      <pre className="font-mono" style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', color: '#a8b3cf' }}>
                        {question.example_output}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {question.constraints && (
                <div className="card">
                  <h4 style={{ marginBottom: '0.5rem' }}>Constraints</h4>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{question.constraints}</p>
                </div>
              )}

              {/* Test Results */}
              {testResults && (
                <div className="card animate-slide-in">
                  <h4 style={{ marginBottom: '1rem' }}>
                    Test Results — {testResults.filter(t => t.passed).length}/{testResults.length} passed
                  </h4>
                  <div className="test-result-grid">
                    {testResults.map((t, i) => (
                      <div key={i} className={`test-case-item ${t.passed ? 'passed' : 'failed'}`}>
                        <span className="test-case-icon">{t.passed ? '✅' : '❌'}</span>
                        <span className="test-case-label">Test {i + 1}</span>
                        {!t.passed && (
                          <span className="test-case-detail font-mono">
                            Expected: {t.expected} | Got: {t.actual}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Editor */}
            <div className="flex-col gap-3">
              {/* Language Selector + Actions */}
              <div className="flex items-center gap-2 wrap">
                <select
                  className="form-select"
                  value={language}
                  onChange={e => handleLanguageChange(e.target.value)}
                  style={{ maxWidth: 160 }}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.id} value={l.id}>{l.displayName}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 'auto' }}>
                  ⛔ Copy-paste disabled
                </span>
              </div>

              {/* Editor */}
              <div className="editor-container">
                <div className="editor-toolbar">
                  <div className="editor-toolbar-dots">
                    <div className="editor-toolbar-dot red" />
                    <div className="editor-toolbar-dot yellow" />
                    <div className="editor-toolbar-dot green" />
                  </div>
                  <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    {LANGUAGES.find(l => l.id === language)?.displayName} — QotD
                  </span>
                </div>
                <MonacoEditor
                  height="400px"
                  language={LANGUAGES.find(l => l.id === language)?.monacoLanguage || language}
                  value={code}
                  onChange={v => setCode(v || '')}
                  onMount={handleEditorMount}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    fontLigatures: true,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    cursorBlinking: 'smooth',
                  }}
                />
              </div>

              {/* Run / Submit Buttons */}
              <div className="flex gap-3">
                <button
                  className="btn btn-secondary"
                  onClick={handleRun}
                  disabled={running || submitting}
                  style={{ flex: 1 }}
                >
                  {running ? '▶ Running...' : '▶ Run Code'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={running || submitting || alreadySolved}
                  style={{ flex: 1 }}
                >
                  {submitting ? 'Submitting...' : alreadySolved ? '✅ Solved!' : '⬆ Submit'}
                </button>
              </div>

              {/* Run Output */}
              {(runOutput !== null || runError) && (
                <div className={`result-panel ${runError ? 'error' : 'success'} animate-slide-in`}>
                  <div className="result-panel-header">
                    {runError ? '❌ Error' : '✅ Output'}
                  </div>
                  <div className="result-panel-body">
                    {runError || runOutput}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
