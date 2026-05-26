'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';

interface Problem {
  id: string; slug: string; title: string; statement: string;
  input_format?: string; output_format?: string; constraints?: string;
  explanation?: string; difficulty: string; points: number;
  time_limit: number; memory_limit?: number; tags: string[];
  is_public: boolean;
}

interface Testcase {
  id: string; input: string; expected_output: string;
  is_hidden: boolean; explanation?: string; display_order: number;
}

const FIELD_LABELS: Record<string, string> = {
  statement: 'Problem Statement *',
  input_format: 'Input Format',
  output_format: 'Output Format',
  constraints: 'Constraints',
  explanation: 'General Explanation',
};

export default function QuestionEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [problem, setProblem]     = useState<Problem | null>(null);
  const [testcases, setTestcases] = useState<Testcase[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [form, setForm]           = useState<Partial<Problem>>({});
  const [tab, setTab]             = useState<'statement' | 'testcases' | 'settings'>('statement');

  // New testcase form
  const [newTc, setNewTc] = useState({ input: '', expected_output: '', is_hidden: true, explanation: '' });
  const [addingTc, setAddingTc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/question-bank/${id}`);
      if (res.ok) {
        const d = await res.json();
        setProblem(d.problem);
        setForm(d.problem);
        setTestcases(d.testcases || []);
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/question-bank/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: typeof form.tags === 'string' ? (form.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean) : form.tags }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } finally { setSaving(false); }
  }

  async function addTestcase() {
    if (!newTc.input || !newTc.expected_output) return;
    setAddingTc(true);
    try {
      const res = await fetch(`/api/admin/question-bank/${id}/testcases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTc, display_order: testcases.length }),
      });
      if (res.ok) {
        setNewTc({ input: '', expected_output: '', is_hidden: true, explanation: '' });
        load();
      }
    } finally { setAddingTc(false); }
  }

  async function deleteTestcase(tcId: string) {
    if (!confirm('Delete this testcase?')) return;
    await fetch(`/api/admin/question-bank/${id}/testcases?testcase_id=${tcId}`, { method: 'DELETE' });
    setTestcases(t => t.filter(x => x.id !== tcId));
  }

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', gap: '1.5rem', flexDirection: 'column' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />)}
    </div>
  );

  if (!problem) return (
    <div style={{ padding: '2rem' }}>
      <div className="empty-state">
        <span className="empty-state-icon">🔍</span>
        <h3>Problem not found</h3>
        <Link href="/admin/question-bank" style={{ color: 'var(--accent-1)', textDecoration: 'none' }}>← Back to Question Bank</Link>
      </div>
    </div>
  );

  const visibleCount = testcases.filter(t => !t.is_hidden).length;
  const hiddenCount  = testcases.filter(t => t.is_hidden).length;

  return (
    <div style={{ padding: '2rem', maxWidth: '960px' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link href="/admin/question-bank" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>← Question Bank</Link>
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{problem.title}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>{problem.slug}</code>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', background: problem.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : problem.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: problem.difficulty === 'Easy' ? '#22c55e' : problem.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>{problem.difficulty}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-1)', fontWeight: 700 }}>{problem.points}pt</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>⏱️ {problem.time_limit}ms</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {saved && <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700, alignSelf: 'center' }}>✓ Saved</span>}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        {([
          { key: 'statement', label: '📝 Statement' },
          { key: 'testcases', label: `🧪 Testcases (${testcases.length})` },
          { key: 'settings',  label: '⚙️ Settings' },
        ] as { key: typeof tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '0.6rem 1.1rem', border: 'none', background: 'transparent',
            color: tab === t.key ? 'var(--accent-1)' : 'var(--color-text-muted)',
            fontWeight: tab === t.key ? 700 : 400, fontSize: '0.82rem', cursor: 'pointer',
            borderBottom: tab === t.key ? '2px solid var(--accent-1)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── STATEMENT TAB ── */}
      {tab === 'statement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {Object.entries(FIELD_LABELS).map(([field, label]) => (
            <div key={field}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>{label}</label>
              <textarea
                value={(form as any)[field] || ''}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                rows={field === 'statement' ? 8 : 3}
                placeholder={`${label} (Markdown supported)`}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.7, boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── TESTCASES TAB ── */}
      {tab === 'testcases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Summary */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', flex: 1 }}>
              <p style={{ fontSize: '0.65rem', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: '0 0 0.2rem' }}>Visible</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e', margin: 0 }}>{visibleCount}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Shown to participants</p>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', flex: 1 }}>
              <p style={{ fontSize: '0.65rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: '0 0 0.2rem' }}>Hidden</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>{hiddenCount}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Judge-only, never exposed</p>
            </div>
          </div>

          {/* Existing testcases */}
          {testcases.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <h4 style={{ color: '#e2e8f0', margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Existing Testcases</h4>
              {testcases.map((tc, i) => (
                <div key={tc.id} style={{ borderRadius: '10px', border: `1px solid ${tc.is_hidden ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: tc.is_hidden ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: tc.is_hidden ? '#ef4444' : '#22c55e' }}>
                      {tc.is_hidden ? '🔒 Hidden' : '👁️ Visible'} — #{i + 1}
                    </span>
                    <button onClick={() => deleteTestcase(tc.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                      Delete
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ padding: '0.65rem 0.85rem', borderRight: '1px solid var(--color-border)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', margin: '0 0 0.3rem' }}>Input</p>
                      <pre style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '80px', overflow: 'auto' }}>{tc.input}</pre>
                    </div>
                    <div style={{ padding: '0.65rem 0.85rem' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', margin: '0 0 0.3rem' }}>Expected Output</p>
                      <pre style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '80px', overflow: 'auto' }}>{tc.expected_output}</pre>
                    </div>
                  </div>
                  {tc.explanation && (
                    <div style={{ padding: '0.5rem 0.85rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}><strong style={{ color: 'var(--accent-1)' }}>Note:</strong> {tc.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add testcase form */}
          <div style={{ padding: '1.25rem', borderRadius: '10px', border: '1px dashed var(--color-border)', background: 'rgba(108,99,255,0.03)' }}>
            <h4 style={{ color: '#e2e8f0', margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700 }}>+ Add Testcase</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Input *</label>
                <textarea value={newTc.input} onChange={e => setNewTc(n => ({ ...n, input: e.target.value }))} rows={4} placeholder="Enter input..."
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Expected Output *</label>
                <textarea value={newTc.expected_output} onChange={e => setNewTc(n => ({ ...n, expected_output: e.target.value }))} rows={4} placeholder="Enter expected output..."
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Explanation (optional, for visible testcases)</label>
              <input value={newTc.explanation} onChange={e => setNewTc(n => ({ ...n, explanation: e.target.value }))} placeholder="e.g. The sum of 1 and 2 is 3"
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={newTc.is_hidden} onChange={e => setNewTc(n => ({ ...n, is_hidden: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
                <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>🔒 Hidden testcase (judge-only)</span>
              </label>
              <button onClick={addTestcase} disabled={addingTc || !newTc.input || !newTc.expected_output} className="btn btn-primary btn-sm">
                {addingTc ? 'Adding...' : '+ Add Testcase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Difficulty</label>
              <select value={form.difficulty || ''} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Points</label>
              <input type="number" value={form.points || 100} onChange={e => setForm(f => ({ ...f, points: +e.target.value }))} min={1}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Time Limit (ms)</label>
              <input type="number" value={form.time_limit || 2000} onChange={e => setForm(f => ({ ...f, time_limit: +e.target.value }))} min={500} step={500}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Memory Limit (MB)</label>
              <input type="number" value={form.memory_limit || 256} onChange={e => setForm(f => ({ ...f, memory_limit: +e.target.value }))} min={64} step={64}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Tags (comma-separated)</label>
            <input value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '')} onChange={e => setForm(f => ({ ...f, tags: e.target.value as any }))} placeholder="arrays, sorting, dp"
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <input type="checkbox" checked={form.is_public || false} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
            <div>
              <p style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 700, margin: 0 }}>Make publicly visible</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Show on public practice page outside of contests</p>
            </div>
          </label>

          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
