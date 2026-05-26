'use client';

import { useState } from 'react';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (problem: any) => void;
}

export default function QuestionEditorModal({ isOpen, onClose, onSaved }: QuestionEditorModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', statement: '', difficulty: 'Medium', points: 100,
    time_limit: 2000, memory_limit: 256, tags: ''
  });
  const [testcases, setTestcases] = useState([{ input: '', expected_output: '', is_hidden: false }]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      
      const validTestcases = testcases.filter(tc => tc.input.trim() && tc.expected_output.trim());
      if (validTestcases.length > 0) {
        payload.testcases = validTestcases;
      }
      const res = await fetch('/api/admin/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onSaved({
        id: data.id,
        slug: data.slug,
        title: form.title,
        difficulty: form.difficulty,
        points: form.points,
        tags: payload.tags
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create problem');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '700px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f1f5f9', fontWeight: 800 }}>Create New Problem</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          <form id="question-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Find Max Subarray"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Statement *</label>
              <textarea value={form.statement} onChange={e => setForm(f => ({ ...f, statement: e.target.value }))} required rows={6} placeholder="Markdown supported..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Difficulty</label>
                <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Points</label>
                <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: +e.target.value }))} required min={1}
                  style={{ width: '100%', padding: '0.65rem 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Time Limit (ms)</label>
                <input type="number" value={form.time_limit} onChange={e => setForm(f => ({ ...f, time_limit: +e.target.value }))} required min={500} step={500}
                  style={{ width: '100%', padding: '0.65rem 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Mem Limit (MB)</label>
                <input type="number" value={form.memory_limit} onChange={e => setForm(f => ({ ...f, memory_limit: +e.target.value }))} required min={64} step={64}
                  style={{ width: '100%', padding: '0.65rem 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Tags (comma separated)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="arrays, math"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </form>
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Testcases (Optional but Recommended)</h3>
              <button type="button" onClick={() => setTestcases([...testcases, { input: '', expected_output: '', is_hidden: true }])} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>+ Add Testcase</button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 1rem' }}>
              Add testcases now so the problem can be judged immediately. Mark edge cases as hidden.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {testcases.map((tc, i) => (
                <div key={i} style={{ padding: '1rem', background: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Testcase #{i + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 600 }}>
                        <input type="checkbox" checked={tc.is_hidden} onChange={e => {
                          const nt = [...testcases]; nt[i].is_hidden = e.target.checked; setTestcases(nt);
                        }} style={{ accentColor: 'var(--accent-1)' }} />
                        Hidden (Secret)
                      </label>
                      {testcases.length > 1 && (
                        <button type="button" onClick={() => setTestcases(testcases.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Input</label>
                      <textarea value={tc.input} onChange={e => { const nt = [...testcases]; nt[i].input = e.target.value; setTestcases(nt); }} rows={2} placeholder="e.g. 5\n1 2 3"
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Expected Output</label>
                      <textarea value={tc.expected_output} onChange={e => { const nt = [...testcases]; nt[i].expected_output = e.target.value; setTestcases(nt); }} rows={2} placeholder="e.g. 15"
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: '#e2e8f0', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button type="submit" form="question-form" disabled={saving} className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
            {saving ? 'Creating...' : 'Create & Add to Contest'}
          </button>
        </div>

      </div>
    </div>
  );
}
