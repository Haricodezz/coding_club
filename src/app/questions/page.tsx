'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { CustomQuestion, TestCase, User } from '@/types';
import { LANGUAGES, STARTER_CODE } from '@/lib/piston';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div style={{ height: 300, background: '#1e1e2e' }} />,
});

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<CustomQuestion | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDiff, setFormDiff] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [formPublic, setFormPublic] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', expected_output: '', explanation: '' }]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Solve state
  const [solveCode, setSolveCode] = useState(STARTER_CODE['python']);
  const [solveLang, setSolveLang] = useState('python');
  const [solveResults, setSolveResults] = useState<Array<{ passed: boolean; input: string; expected: string; actual: string }> | null>(null);
  const [solving, setSolving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/questions').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json())
    ]).then(([questionsRes, userRes]) => {
      setQuestions(questionsRes.data || []);
      if (userRes.data) setCurrentUser(userRes.data);
      setLoading(false);
    });
  }, []);

  function addTestCase() {
    setTestCases(prev => [...prev, { input: '', expected_output: '', explanation: '' }]);
  }

  function updateTestCase(i: number, field: keyof TestCase, value: string) {
    setTestCases(prev => prev.map((tc, idx) => idx === i ? { ...tc, [field]: value } : tc));
  }

  function removeTestCase(i: number) {
    setTestCases(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: formTitle, description: formDesc, difficulty: formDiff, is_public: formPublic, test_cases: testCases, is_published: true }),
    });
    const json = await res.json();
    if (json.data) {
      setQuestions(prev => [json.data, ...prev]);
      setCreating(false);
      setFormTitle(''); setFormDesc(''); setTestCases([{ input: '', expected_output: '', explanation: '' }]);
      setSaveMsg('Question created!');
      setTimeout(() => setSaveMsg(''), 3000);
    }
    setSaving(false);
  }

  async function handleSolve() {
    if (!activeQuestion) return;
    setSolving(true);
    setSolveResults(null);
    const res = await fetch('/api/questions/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: solveCode, language: solveLang, question_id: activeQuestion.id }),
    });
    const json = await res.json();
    setSolveResults(json.results || []);
    setSolving(false);
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="page-header animate-fade-in">
          <p className="eyebrow">🧩 Custom Questions</p>
          <h1>Practice <span className="gradient-text">Problems</span></h1>
          <p>Create your own questions with test cases, or solve problems created by others.</p>
        </div>

        {saveMsg && <div className="alert alert-success animate-slide-in" style={{ marginBottom: '1.5rem' }}>✅ {saveMsg}</div>}

        {/* Header Actions */}
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
          <span style={{ color: '#64748b' }}>{questions.length} questions available</span>
          {(currentUser?.role === 'super_admin' || currentUser?.role === 'team') && (
            <button className="btn btn-primary" onClick={() => setCreating(!creating)}>
              {creating ? '✕ Cancel' : '+ Create Question'}
            </button>
          )}
        </div>

        {/* Create Form */}
        {creating && (
          <div className="card animate-slide-in" style={{ marginBottom: '2rem', border: '1px solid rgba(108,99,255,0.3)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>✍️ New Question</h3>
            <form onSubmit={handleCreate}>
              <div className="flex-col gap-4">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" placeholder="e.g. Two Sum" value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select className="form-select" value={formDiff} onChange={e => setFormDiff(e.target.value as 'Easy' | 'Medium' | 'Hard')}>
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Problem Description</label>
                  <textarea className="form-textarea" placeholder="Describe the problem clearly..." value={formDesc} onChange={e => setFormDesc(e.target.value)} required style={{ minHeight: 140 }} />
                </div>

                {/* Test Cases */}
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">Test Cases</label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addTestCase}>+ Add Case</button>
                  </div>
                  <div className="flex-col gap-3">
                    {testCases.map((tc, i) => (
                      <div key={i} className="card" style={{ padding: '1rem', background: 'var(--color-surface-2)' }}>
                        <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#94a3b8' }}>Test Case {i + 1}</span>
                          {testCases.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => removeTestCase(i)}>Remove</button>}
                        </div>
                        <div className="grid-2">
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>Input</label>
                            <textarea className="form-textarea font-mono" value={tc.input} onChange={e => updateTestCase(i, 'input', e.target.value)} style={{ minHeight: 70, fontSize: '0.82rem' }} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>Expected Output</label>
                            <textarea className="form-textarea font-mono" value={tc.expected_output} onChange={e => updateTestCase(i, 'expected_output', e.target.value)} style={{ minHeight: 70, fontSize: '0.82rem' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isPublic" checked={formPublic} onChange={e => setFormPublic(e.target.checked)} />
                  <label htmlFor="isPublic" className="form-label" style={{ margin: 0 }}>Make public (visible to all students)</label>
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions Grid + Solver */}
        <div style={{ display: 'grid', gridTemplateColumns: activeQuestion ? '1fr 1.2fr' : '1fr', gap: '1.5rem' }}>
          {/* Question List */}
          <div>
            {loading ? (
              <div className="flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />)}
              </div>
            ) : questions.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🧩</span>
                <h3>No questions yet</h3>
                <p>Create the first question using the button above!</p>
              </div>
            ) : (
              <div className="flex-col gap-3">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="card animate-slide-in"
                    style={{
                      animationDelay: `${i * 40}ms`,
                      cursor: 'pointer',
                      borderColor: activeQuestion?.id === q.id ? 'var(--accent)' : 'var(--color-border)',
                      boxShadow: activeQuestion?.id === q.id ? '0 0 16px var(--accent-glow)' : 'none',
                    }}
                    onClick={() => { setActiveQuestion(q); setSolveCode(STARTER_CODE['python']); setSolveLang('python'); setSolveResults(null); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>{q.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{q.test_cases?.length || 0} test cases</div>
                      </div>
                      <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solver Panel */}
          {activeQuestion && (
            <div className="flex-col gap-3 animate-slide-in">
              <div className="card">
                <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
                  <h4>{activeQuestion.title}</h4>
                  <span className={`badge badge-${activeQuestion.difficulty.toLowerCase()}`}>{activeQuestion.difficulty}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                  {activeQuestion.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select className="form-select" value={solveLang} onChange={e => { setSolveLang(e.target.value); setSolveCode(STARTER_CODE[e.target.value] || ''); }} style={{ maxWidth: 160 }}>
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.displayName}</option>)}
                </select>
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSolve} disabled={solving}>
                  {solving ? 'Running...' : '▶ Run Tests'}
                </button>
              </div>

              <div className="editor-container">
                <div className="editor-toolbar">
                  <div className="editor-toolbar-dots">
                    <div className="editor-toolbar-dot red" /><div className="editor-toolbar-dot yellow" /><div className="editor-toolbar-dot green" />
                  </div>
                </div>
                <MonacoEditor
                  height="280px"
                  language={LANGUAGES.find(l => l.id === solveLang)?.monacoLanguage || solveLang}
                  value={solveCode}
                  onChange={v => setSolveCode(v || '')}
                  theme="vs-dark"
                  options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 10 }, fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>

              {solveResults && (
                <div className="card animate-slide-in">
                  <h4 style={{ marginBottom: '0.75rem' }}>
                    Results — {solveResults.filter(r => r.passed).length}/{solveResults.length} passed
                  </h4>
                  <div className="test-result-grid">
                    {solveResults.map((r, i) => (
                      <div key={i} className={`test-case-item ${r.passed ? 'passed' : 'failed'}`}>
                        <span className="test-case-icon">{r.passed ? '✅' : '❌'}</span>
                        <span className="test-case-label">Test {i + 1}</span>
                        {!r.passed && <span className="test-case-detail font-mono">Expected: {r.expected} | Got: {r.actual}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
