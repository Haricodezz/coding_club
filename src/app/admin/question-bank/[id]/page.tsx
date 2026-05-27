'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import Link from 'next/link';

interface Problem {
  id: string; slug: string; title: string; statement: string;
  input_format?: string; output_format?: string; constraints?: string;
  explanation?: string; difficulty: string; points: number;
  time_limit: number; memory_limit?: number; tags: string[];
  is_published: boolean;
  available_for_practice: boolean;
  available_for_contests: boolean;
  available_for_qotd: boolean;
  execution_mode?: 'function' | 'full';
  function_params?: { name: string; type: string }[];
  function_return_type?: string;
  function_templates?: any;
}

interface Testcase {
  id: string; input: string; expected_output: string;
  is_hidden: boolean; explanation?: string; display_order: number;
}

const UNIVERSAL_TYPES = [
  { value: 'integer',       label: 'Integer',       placeholder: '5',           example: '42' },
  { value: 'string',        label: 'String',         placeholder: '"hello"',     example: '"abc"' },
  { value: 'boolean',       label: 'Boolean',        placeholder: 'true',        example: 'true' },
  { value: 'integer_array', label: 'Integer Array',  placeholder: '[1,2,3]',     example: '[1,2,3,4]' },
  { value: 'string_array',  label: 'String Array',   placeholder: '["a","b"]',   example: '["x","y"]' },
  { value: 'matrix',        label: '2D Matrix',      placeholder: '[[1,2],[3,4]]', example: '[[1,0],[0,1]]' },
  { value: 'linked_list',   label: 'Linked List',    placeholder: '[1,2,3]',     example: '[1,2,3]' },
  { value: 'tree',          label: 'Binary Tree',    placeholder: '[1,2,3,null]', example: '[1,2,null,3]' },
];

const TYPE_MAP: Record<string, { placeholder: string; label: string }> = {};
UNIVERSAL_TYPES.forEach(t => { TYPE_MAP[t.value] = { placeholder: t.placeholder, label: t.label }; });

// Guided step ordering for the question creation workflow
const STEP_ORDER = ['execution', 'testcases', 'statement', 'settings'] as const;
type TabKey = typeof STEP_ORDER[number];

const FIELD_LABELS: Record<string, { label: string; rows: number; help: string }> = {
  statement:    { label: 'Problem Statement',  rows: 12, help: 'Describe the problem in Markdown. Include examples after defining testcases.' },
  input_format: { label: 'Input Format',       rows: 3,  help: 'Describe the format of input (for STDIN mode problems).' },
  output_format:{ label: 'Output Format',      rows: 3,  help: 'Describe the format of output.' },
  constraints:  { label: 'Constraints',        rows: 4,  help: 'e.g. 1 <= nums.length <= 10^5, -10^9 <= nums[i] <= 10^9' },
  explanation:  { label: 'General Explanation', rows: 3,  help: 'Optional editorial or hint for learners.' },
};

export default function QuestionEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [problem, setProblem]     = useState<Problem | null>(null);
  const [testcases, setTestcases] = useState<Testcase[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm]           = useState<Partial<Problem>>({});
  const [tab, setTab]             = useState<TabKey>('execution');
  
  // Dynamic parsing state for function mode
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  // New testcase form
  const [newTc, setNewTc] = useState({ input: '', expected_output: '', is_hidden: true, explanation: '' });
  const [addingTc, setAddingTc] = useState(false);

  // ── Derived State ──
  const hasParams = useMemo(() => 
    form.function_params && form.function_params.length > 0 && form.function_params.every(p => p.name && p.type), 
    [form.function_params]
  );
  const hasReturnType = !!form.function_return_type;
  const isFunctionMode = form.execution_mode !== 'full';
  const executionReady = isFunctionMode ? (hasParams && hasReturnType) : true;
  const visibleCount = testcases.filter(t => !t.is_hidden).length;
  const hiddenCount  = testcases.filter(t => t.is_hidden).length;

  // ── Completeness indicators per tab ──
  const tabStatus = useMemo(() => {
    const exec = isFunctionMode ? (hasParams && hasReturnType) : true;
    const tc = testcases.length > 0;
    const stmt = !!(form.statement && form.statement.trim().length > 20);
    const sett = !!(form.difficulty && form.points);
    return { execution: exec, testcases: tc, statement: stmt, settings: sett };
  }, [isFunctionMode, hasParams, hasReturnType, testcases.length, form.statement, form.difficulty, form.points]);

  // ── Data loading ──
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

  const loadTestcases = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/question-bank/${id}`);
      if (res.ok) {
        const d = await res.json();
        setTestcases(d.testcases || []);
      }
    } catch {}
  }, [id]);

  // ── Save ──
  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const payload = { ...form, tags: typeof form.tags === 'string' ? (form.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean) : form.tags };
      const res = await fetch(`/api/admin/question-bank/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) { 
        setProblem(payload as any);
        setSaved(true); 
        setTimeout(() => setSaved(false), 3000); 
      } else {
        const err = await res.json();
        setSaveError(err.error || 'Save failed');
      }
    } catch (e: any) {
      setSaveError(e.message || 'Network error');
    } finally { setSaving(false); }
  }

  // ── Add testcase ──
  async function addTestcase() {
    let finalInput = newTc.input;
    if (isFunctionMode && form.function_params) {
      for (const p of form.function_params) {
        if (!paramValues[p.name]) return alert(`Missing value for parameter: ${p.name}`);
        try { 
          JSON.parse(paramValues[p.name]); 
        } catch { return alert(`Invalid JSON format for parameter: ${p.name}`); }
      }
      try { JSON.parse(newTc.expected_output); } catch { return alert(`Invalid JSON format for expected output`); }
      finalInput = form.function_params.map(p => paramValues[p.name]).join('\n');
    } else if (!newTc.input || !newTc.expected_output) {
      return;
    }

    setAddingTc(true);
    try {
      const res = await fetch(`/api/admin/question-bank/${id}/testcases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTc, input: finalInput, display_order: testcases.length }),
      });
      if (res.ok) {
        setNewTc({ input: '', expected_output: '', is_hidden: true, explanation: '' });
        setParamValues({});
        loadTestcases();
      }
    } finally { setAddingTc(false); }
  }

  // ── Generate templates ──
  function generateTemplates() {
    import('@/lib/CodeTemplateGenerator').then(mod => {
      const gen = mod.CodeTemplateGenerator;
      const params = form.function_params || [];
      const ret = form.function_return_type || 'void';
      const t = {
        cpp: gen.generate('cpp', params, ret),
        c: gen.generate('c', params, ret),
        python: gen.generate('python', params, ret),
        java: gen.generate('java', params, ret),
        javascript: gen.generate('javascript', params, ret),
        go: gen.generate('go', params, ret),
      };
      setForm(f => ({ ...f, function_templates: t }));
    });
  }

  // ── Auto-generate statement ──
  function autoGenerateStatement() {
    if (!isFunctionMode || !form.function_params || form.function_params.length === 0) {
      alert("Please define Function Parameters in the Execution tab first.");
      return;
    }

    const visibleTcs = testcases.filter(t => !t.is_hidden);
    if (visibleTcs.length === 0) {
      alert("Please add at least one visible testcase to generate examples.");
      return;
    }
    
    const current = form.statement || '';
    if (current.includes('## Example') || current.includes('**Input:**')) {
      if (!confirm("Your statement already contains Examples. Replace them?")) return;
    }

    let baseText = current;
    const splitTokens = ['## Example', '# Example', '## Constraint', '# Constraint', '---'];
    for (const token of splitTokens) {
      if (baseText.includes(token)) {
        baseText = baseText.substring(0, baseText.indexOf(token)).trim();
      }
    }

    let generated = baseText ? baseText + '\n\n---\n\n' : '';
    
    generated += `## Examples\n\n`;
    visibleTcs.forEach((tc, idx) => {
      generated += `**Example ${idx + 1}:**\n`;
      const lines = tc.input.split('\n');
      generated += `**Input:** ${form.function_params!.map((p, i) => `\`${p.name} = ${lines[i]}\``).join(', ')}\n`;
      
      if (!tc.expected_output.includes('\n')) {
        generated += `**Output:** \`${tc.expected_output}\`\n`;
      } else {
        generated += `**Output:** \n\`\`\`\n${tc.expected_output}\n\`\`\`\n`;
      }
      if (tc.explanation) {
        generated += `**Explanation:** ${tc.explanation}\n`;
      }
      generated += '\n';
    });

    if (!current.toLowerCase().includes('constraint')) {
      generated += `---\n\n## Constraints\n- \n- \n`;
    }

    setForm(f => ({ ...f, statement: generated }));
  }

  // ── Delete testcase ──
  async function deleteTestcase(tcId: string) {
    if (!confirm('Delete this testcase?')) return;
    await fetch(`/api/admin/question-bank/${id}/testcases?testcase_id=${tcId}`, { method: 'DELETE' });
    loadTestcases();
  }

  // ── Validation for Add Testcase button ──  
  const canAddTestcase = useMemo(() => {
    if (!newTc.expected_output) return false;
    if (isFunctionMode) {
      if (!form.function_params || form.function_params.length === 0) return false;
      for (const p of form.function_params) {
        if (!paramValues[p.name]) return false;
        try { JSON.parse(paramValues[p.name]); } catch { return false; }
      }
      try { JSON.parse(newTc.expected_output); } catch { return false; }
      return true;
    }
    return !!newTc.input;
  }, [isFunctionMode, form.function_params, paramValues, newTc]);

  // ── Loading / Not Found states ──
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

  const TAB_CONFIG: { key: TabKey; label: string; icon: string; step: number; tooltip: string }[] = [
    { key: 'execution',  label: 'Execution',  icon: '⚡', step: 1, tooltip: 'Step 1: Define how the problem runs' },
    { key: 'testcases',  label: `Testcases (${testcases.length})`, icon: '🧪', step: 2, tooltip: 'Step 2: Add test inputs and outputs' },
    { key: 'statement',  label: 'Statement',  icon: '📝', step: 3, tooltip: 'Step 3: Write the problem description' },
    { key: 'settings',   label: 'Settings',   icon: '⚙️', step: 4, tooltip: 'Step 4: Configure metadata and visibility' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '960px' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link href="/admin/question-bank" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>← Question Bank</Link>
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{problem.title}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>{problem.slug}</code>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', background: problem.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : problem.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: problem.difficulty === 'Easy' ? '#22c55e' : problem.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>{problem.difficulty}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-1)', fontWeight: 700 }}>{problem.points}pt</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>⏱️ {problem.time_limit}ms</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {saveError && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>⚠ {saveError}</span>}
          {saved && <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>✓ Saved</span>}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm" aria-label="Save all changes to this question">
            {saving ? 'Saving...' : '💾 Save All Changes'}
          </button>
        </div>
      </div>

      {/* ── TABS with step indicators ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        {TAB_CONFIG.map(t => {
          const isActive = tab === t.key;
          const isComplete = tabStatus[t.key];
          return (
            <button key={t.key} onClick={() => setTab(t.key)} title={t.tooltip} aria-label={t.tooltip} style={{
              padding: '0.6rem 1.1rem', border: 'none', background: 'transparent',
              color: isActive ? 'var(--accent-1)' : 'var(--color-text-muted)',
              fontWeight: isActive ? 700 : 400, fontSize: '0.82rem', cursor: 'pointer',
              borderBottom: isActive ? '2px solid var(--accent-1)' : '2px solid transparent',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <span style={{ fontSize: '0.65rem', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isComplete ? 'rgba(34,197,94,0.15)' : isActive ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.05)', color: isComplete ? '#22c55e' : isActive ? 'var(--accent-1)' : 'var(--color-text-muted)', fontWeight: 800 }}>
                {isComplete ? '✓' : t.step}
              </span>
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {/* ── EXECUTION TAB (Step 1) ── */}
      {tab === 'execution' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
          
          {/* Guide banner */}
          <div style={{ padding: '0.85rem 1.1rem', borderRadius: '10px', background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>Step 1: Define how the problem executes</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Choose the execution mode, define function parameters and return type. This must be done before adding testcases.</p>
            </div>
          </div>

          <div style={{ padding: '1.25rem', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Execution Mode</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="emode" checked={isFunctionMode} onChange={() => setForm(f => ({ ...f, execution_mode: 'function' }))} aria-label="Function Mode" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Function Mode (LeetCode Style)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="emode" checked={!isFunctionMode} onChange={() => setForm(f => ({ ...f, execution_mode: 'full' }))} aria-label="Full Program Mode" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Full Program Mode (STDIN/STDOUT)</span>
              </label>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
              {!isFunctionMode ? 'Users write a full program. Testcases are passed directly via STDIN.' : 'Users only write the core function. The platform automatically generates hidden I/O driver code.'}
            </p>
          </div>

          {isFunctionMode && (
            <div style={{ padding: '1.25rem', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Function Signature</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Return Type - with sensible default */}
                <div>
                  <label htmlFor="return-type-select" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                    Return Type <span style={{ color: '#ef4444' }} aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <select id="return-type-select" value={form.function_return_type || ''} onChange={e => setForm(f => ({ ...f, function_return_type: e.target.value }))}
                    aria-required="true"
                    style={{ width: '100%', padding: '0.6rem 0.5rem', marginTop: '0.3rem', borderRadius: '6px', border: `1px solid ${!hasReturnType ? 'rgba(245,158,11,0.5)' : 'var(--color-border)'}`, background: 'var(--color-bg)', color: 'var(--text-primary)' }}>
                    <option value="" disabled>Select the output type...</option>
                    {UNIVERSAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — e.g. {t.example}</option>)}
                  </select>
                  {!hasReturnType && (
                    <p style={{ fontSize: '0.7rem', color: '#f59e0b', margin: '0.3rem 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      ⚠ Required — this determines the output type for testcases
                    </p>
                  )}
                </div>
                
                {/* Parameters */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Parameters <span style={{ color: '#ef4444' }} aria-hidden="true">*</span></span>
                    <button onClick={() => setForm(f => ({ ...f, function_params: [...(f.function_params || []), { name: '', type: '' }] }))} style={{ background: 'transparent', border: 'none', color: 'var(--accent-1)', cursor: 'pointer', fontWeight: 700 }}>+ Add Param</button>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {(form.function_params || []).map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input value={p.name} onChange={e => { const np = [...(form.function_params||[])]; np[i] = { ...np[i], name: e.target.value }; setForm(f => ({ ...f, function_params: np })); }} 
                          placeholder="Name (e.g. nums)" aria-label={`Parameter ${i+1} name`}
                          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: `1px solid ${!p.name ? 'rgba(245,158,11,0.4)' : 'var(--color-border)'}`, background: 'var(--color-bg)', color: 'var(--text-primary)' }} />
                        <select value={p.type} onChange={e => { const np = [...(form.function_params||[])]; np[i] = { ...np[i], type: e.target.value }; setForm(f => ({ ...f, function_params: np })); }}
                          aria-label={`Parameter ${i+1} type`}
                          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: `1px solid ${!p.type ? 'rgba(245,158,11,0.4)' : 'var(--color-border)'}`, background: 'var(--color-bg)', color: 'var(--text-primary)' }}>
                          <option value="" disabled>Select type...</option>
                          {UNIVERSAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <button onClick={() => { const np = [...(form.function_params||[])]; np.splice(i, 1); setForm(f => ({ ...f, function_params: np })); }} 
                          aria-label={`Remove parameter ${i+1}`}
                          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                    {(!form.function_params || form.function_params.length === 0) && (
                      <p style={{ fontSize: '0.8rem', color: '#f59e0b', fontStyle: 'italic', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        ⚠ Add at least one parameter to enable testcase creation
                      </p>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                {executionReady && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>
                      ✓ Execution config ready — you can now save and proceed to Testcases
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button onClick={generateTemplates} className="btn btn-secondary" style={{ flex: 1 }} disabled={!executionReady}>⚡ Auto-Generate Driver Templates</button>
                  <button onClick={() => { handleSave(); }} className="btn btn-primary" style={{ flex: 1 }} disabled={!executionReady || saving}>
                    {saving ? 'Saving...' : '💾 Save & Continue →'}
                  </button>
                </div>
                {form.function_templates && (
                  <p style={{ fontSize: '0.8rem', color: '#22c55e', marginTop: '0.25rem', textAlign: 'center' }}>✓ Driver templates generated for C++, Python, Java, JavaScript</p>
                )}
              </div>
            </div>
          )}

          {/* Full program mode - simpler, just save and go */}
          {!isFunctionMode && (
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#22c55e', fontWeight: 600 }}>✓ Full Program Mode selected — proceed to Testcases when ready</p>
              <button onClick={() => { handleSave(); setTab('testcases'); }} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} disabled={saving}>
                {saving ? 'Saving...' : 'Save & Continue to Testcases →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TESTCASES TAB (Step 2) ── */}
      {tab === 'testcases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Dependency warning */}
          {isFunctionMode && !executionReady && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', gap: '0.75rem', alignItems: 'center' }} role="alert">
              <span style={{ fontSize: '1.3rem' }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>Execution config incomplete</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {!hasReturnType && !hasParams ? 'Define function parameters and return type in the Execution tab.' :
                   !hasReturnType ? 'Select a return type in the Execution tab.' :
                   'Complete all parameter names and types in the Execution tab.'}
                </p>
                <button onClick={() => setTab('execution')} style={{ marginTop: '0.5rem', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', padding: '0.35rem 0.85rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                  ← Go to Execution Tab
                </button>
              </div>
            </div>
          )}

          {/* Summary cards with tooltips */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div title="Visible testcases are shown to users as examples. They help users understand the expected input/output format." style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', flex: 1, cursor: 'help', transition: 'border-color 0.15s' }}>
              <p style={{ fontSize: '0.65rem', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: '0 0 0.2rem' }}>👁️ Visible</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e', margin: 0 }}>{visibleCount}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Shown as examples to participants</p>
            </div>
            <div title="Hidden testcases are used only by the judge for evaluation. Users never see these inputs/outputs. Add hidden testcases to catch edge cases." style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', flex: 1, cursor: 'help', transition: 'border-color 0.15s' }}>
              <p style={{ fontSize: '0.65rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: '0 0 0.2rem' }}>🔒 Hidden</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>{hiddenCount}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Judge-only, for evaluation</p>
            </div>
          </div>

          {/* Existing testcases */}
          {testcases.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <h4 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Existing Testcases</h4>
              {testcases.map((tc, i) => (
                <div key={tc.id} style={{ borderRadius: '10px', border: `1px solid ${tc.is_hidden ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: tc.is_hidden ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: tc.is_hidden ? '#ef4444' : '#22c55e' }}>
                        {tc.is_hidden ? '🔒 Hidden' : '👁️ Visible'} — #{i + 1}
                      </span>
                      {tc.is_hidden && (
                        <span title="This testcase is only used by the automated judge. Users will never see this input or output." style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', background: 'rgba(239,68,68,0.08)', padding: '0.1rem 0.4rem', borderRadius: '4px', cursor: 'help' }}>
                          Judge-only
                        </span>
                      )}
                      {!tc.is_hidden && (
                        <span title="This testcase is displayed as an example on the problem page. Users can see the input and expected output." style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', background: 'rgba(34,197,94,0.08)', padding: '0.1rem 0.4rem', borderRadius: '4px', cursor: 'help' }}>
                          Shown in examples
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteTestcase(tc.id)} aria-label={`Delete testcase ${i+1}`}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                      Delete
                    </button>
                  </div>
                  
                  {/* Parameter Cards rendering for Function Mode */}
                  <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--color-border)' }}>
                    {isFunctionMode && form.function_params && form.function_params.length > 0 ? (
                      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.1)' }}>
                        {tc.input.split('\n').map((line, idx) => {
                          const p = form.function_params![idx];
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{p?.name || `param_${idx}`} <span style={{ color: 'var(--accent-1)' }}>({TYPE_MAP[p?.type]?.label || p?.type})</span></span>
                              <pre style={{ margin: 0, padding: '0.4rem', background: 'var(--color-bg)', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line}</pre>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--color-border)' }}>
                        <p style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', margin: '0 0 0.3rem' }}>Raw Input (STDIN)</p>
                        <pre style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '80px', overflow: 'auto' }}>{tc.input}</pre>
                      </div>
                    )}
                    <div style={{ padding: '0.75rem' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', margin: '0 0 0.3rem' }}>Expected Output {isFunctionMode && form.function_return_type ? <span style={{color:'var(--accent-1)'}}>({TYPE_MAP[form.function_return_type]?.label || form.function_return_type})</span> : ''}</p>
                      <pre style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, padding: '0.4rem', background: 'var(--color-bg)', borderRadius: '4px', border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{tc.expected_output}</pre>
                    </div>
                  </div>

                  {tc.explanation && (
                    <div style={{ padding: '0.5rem 0.85rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}><strong style={{ color: 'var(--accent-1)' }}>Note:</strong> {tc.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add testcase form */}
          <div style={{ padding: '1.25rem', borderRadius: '10px', border: '1px dashed var(--color-border)', background: 'rgba(108,99,255,0.03)' }}>
            <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700 }}>+ Add Testcase</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                {(isFunctionMode && form.function_params && form.function_params.length > 0 && form.function_params.every(p => p.name && p.type)) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {form.function_params.map(p => {
                      const val = paramValues[p.name] || '';
                      let err = '';
                      const ph = TYPE_MAP[p.type]?.placeholder || '5';
                      
                      if (val) {
                        try { 
                          JSON.parse(val); 
                          if (p.type.includes('array') && !val.trim().startsWith('[')) throw new Error('Must be an array');
                        } catch { 
                          err = `❌ Invalid format. Expected: ${ph}`;
                        } 
                      }

                      return (
                        <div key={p.name}>
                          <label htmlFor={`param-${p.name}`} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                            {p.name} <span style={{color:'var(--accent-1)'}}>({TYPE_MAP[p.type]?.label || p.type})</span> <span style={{ color: '#ef4444' }} aria-hidden="true">*</span>
                          </label>
                          <textarea id={`param-${p.name}`} value={val} onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))} rows={2} placeholder={ph}
                            aria-required="true" aria-invalid={!!err}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: `1px solid ${err ? '#ef4444' : 'var(--color-border)'}`, background: 'var(--color-bg)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                          {err && <p style={{ fontSize: '0.65rem', color: '#ef4444', margin: '0.2rem 0 0' }} role="alert">{err}</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : isFunctionMode ? (
                  <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} role="alert">
                    <p style={{ color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600, margin: 0, textAlign: 'center' }}>⚠ Define parameters in the Execution tab first</p>
                    <button onClick={() => setTab('execution')} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                      ← Go to Execution
                    </button>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="raw-input" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                      Raw Input (STDIN) <span style={{ color: '#ef4444' }} aria-hidden="true">*</span>
                    </label>
                    <textarea id="raw-input" value={newTc.input} onChange={e => setNewTc(n => ({ ...n, input: e.target.value }))} rows={4} placeholder="Enter raw input..."
                      aria-required="true"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="expected-output" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                  Expected Output {isFunctionMode && form.function_return_type ? <span style={{color:'var(--accent-1)'}}>({TYPE_MAP[form.function_return_type]?.label || form.function_return_type})</span> : ''} <span style={{ color: '#ef4444' }} aria-hidden="true">*</span>
                </label>
                <textarea id="expected-output" value={newTc.expected_output} onChange={e => setNewTc(n => ({ ...n, expected_output: e.target.value }))} 
                  rows={isFunctionMode && form.function_params ? (form.function_params.length * 3) : 4} 
                  placeholder={isFunctionMode ? (TYPE_MAP[form.function_return_type || '']?.placeholder || 'JSON value (e.g. 5 or [1,2,3])') : 'Enter expected output...'}
                  aria-required="true"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                {isFunctionMode && newTc.expected_output && (() => {
                  try { JSON.parse(newTc.expected_output); return null; } catch { return <p style={{ fontSize: '0.65rem', color: '#ef4444', margin: '0.2rem 0 0' }} role="alert">❌ Invalid format. Must be valid JSON.</p>; }
                })()}
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="tc-explanation" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Explanation (optional, for visible testcases)</label>
              <input id="tc-explanation" value={newTc.explanation} onChange={e => setNewTc(n => ({ ...n, explanation: e.target.value }))} placeholder="e.g. The sum of 1 and 2 is 3"
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={newTc.is_hidden} onChange={e => setNewTc(n => ({ ...n, is_hidden: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {newTc.is_hidden ? '🔒 Hidden testcase (judge-only)' : '👁️ Visible testcase (shown as example)'}
                </span>
              </label>
              <button onClick={addTestcase} disabled={addingTc || !canAddTestcase} className="btn btn-primary btn-sm"
                title={!canAddTestcase ? (isFunctionMode && !executionReady ? 'Define function parameters first' : 'Fill in all required fields') : 'Add this testcase'}
                aria-label="Add testcase"
                style={{ opacity: canAddTestcase ? 1 : 0.5 }}>
                {addingTc ? 'Adding...' : '+ Add Testcase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STATEMENT TAB (Step 3) ── */}
      {tab === 'statement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Context-aware guidance */}
          {testcases.length === 0 && (
            <div style={{ padding: '0.85rem 1.1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem' }}>💡</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>Tip: Add testcases first</p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>The ✨ Auto-Generate Statement button works best when you have visible testcases defined. <button onClick={() => setTab('testcases')} style={{ background: 'none', border: 'none', color: 'var(--accent-1)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.75rem', padding: 0 }}>Go to Testcases</button></p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-0.5rem' }}>
            <button onClick={autoGenerateStatement} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}
              disabled={!executionReady || testcases.filter(t => !t.is_hidden).length === 0}
              title={!executionReady ? 'Define function parameters first' : testcases.filter(t => !t.is_hidden).length === 0 ? 'Add visible testcases first' : 'Auto-generate examples from your testcases'}>
              ✨ Auto-Generate Statement
            </button>
          </div>
          {Object.entries(FIELD_LABELS).map(([field, config]) => (
            <div key={field}>
              <label htmlFor={`field-${field}`} style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span>{config.label} {field === 'statement' && <span style={{ color: '#ef4444' }} aria-hidden="true">*</span>}</span>
                <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '0.68rem', letterSpacing: 0 }}>{config.help}</span>
              </label>
              <textarea
                id={`field-${field}`}
                value={(form as any)[field] || ''}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                rows={config.rows}
                placeholder={config.help}
                aria-required={field === 'statement'}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.7, boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── SETTINGS TAB (Step 4) ── */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>

          {/* Guide banner */}
          <div style={{ padding: '0.85rem 1.1rem', borderRadius: '10px', background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem' }}>⚙️</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>Problem Metadata & Visibility</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Configure difficulty, scoring, tags, and control where this problem appears on the platform.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="difficulty-select" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Difficulty</label>
              <select id="difficulty-select" value={form.difficulty || ''} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label htmlFor="points-input" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Points</label>
              <input id="points-input" type="number" value={form.points || 100} onChange={e => setForm(f => ({ ...f, points: +e.target.value }))} min={1}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label htmlFor="time-limit" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Time Limit (ms)</label>
              <input id="time-limit" type="number" value={form.time_limit || 2000} onChange={e => setForm(f => ({ ...f, time_limit: +e.target.value }))} min={500} step={500}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label htmlFor="memory-limit" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Memory Limit (MB)</label>
              <input id="memory-limit" type="number" value={form.memory_limit || 256} onChange={e => setForm(f => ({ ...f, memory_limit: +e.target.value }))} min={64} step={64}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label htmlFor="tags-input" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span>Tags (comma-separated)</span>
              <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '0.68rem', letterSpacing: 0 }}>Freeform — type any tags</span>
            </label>
            <input id="tags-input" value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '')} onChange={e => setForm(f => ({ ...f, tags: e.target.value as any }))} placeholder="e.g. arrays, hashing, sorting, two-pointers, dp"
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ecosystem Availability</h4>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <input type="checkbox" checked={form.is_published || false} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>Published (Base Visibility)</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Must be checked for the question to appear anywhere on the platform.</p>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <input type="checkbox" checked={form.available_for_practice || false} onChange={e => setForm(f => ({ ...f, available_for_practice: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>Practice Problem</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Show on the public Practice page.</p>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <input type="checkbox" checked={form.available_for_contests || false} onChange={e => setForm(f => ({ ...f, available_for_contests: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>Contest Eligible</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Can be selected when creating a live contest.</p>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <input type="checkbox" checked={form.available_for_qotd || false} onChange={e => setForm(f => ({ ...f, available_for_qotd: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>QOTD Eligible</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>Can be scheduled as the Question of the Day.</p>
              </div>
            </label>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }} aria-label="Save all settings">
            {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
