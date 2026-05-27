'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProblemList, { ContestProblem } from '@/components/contest/ProblemList';
import QuestionBankDrawer from '@/components/contest/QuestionBankDrawer';
import QuestionEditorModal from '@/components/contest/QuestionEditorModal';
import { fromLocalDatetimeLocal } from '@/lib/utils/date';

const STEPS = ['Details', 'Problems', 'Rules', 'Preview', 'Publish'];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function NewContestPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [showBank, setShowBank] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '', slug: '', description: '', banner_url: '',
    start_time: '', end_time: '', contest_type: 'ICPC',
    visibility: 'public', practice_mode: false, freeze_time_mins: 0
  });

  const [problems, setProblems] = useState<ContestProblem[]>([]);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = localStorage.getItem('contest-draft');
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (confirm('You have an unsaved contest draft. Restore it?')) {
          setForm(d.form);
          setProblems(d.problems);
          setCurrentStep(d.step || 0);
        } else {
          localStorage.removeItem('contest-draft');
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (form.title) { // don't save empty
      localStorage.setItem('contest-draft', JSON.stringify({ form, problems, step: currentStep }));
    }
  }, [form, problems, currentStep]);

  const handleNext = () => {
    // Validation
    if (currentStep === 0) {
      if (!form.title || !form.slug || !form.start_time || !form.end_time) {
        alert('Please fill all required fields in Details.');
        return;
      }
      if (new Date(form.end_time) <= new Date(form.start_time)) {
        alert('End time must be after start time.');
        return;
      }
    }
    if (currentStep === 1) {
      if (problems.length === 0) {
        if (!confirm('You have not added any problems. Continue anyway?')) return;
      }
    }
    setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handlePrev = () => setCurrentStep(s => Math.max(s - 1, 0));

  const handleBankSelect = (selectedProblems: any[]) => {
    const newProbs = selectedProblems.map((p, idx) => ({
      problem_id: p.id,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      points: p.points,
      label: String.fromCharCode(65 + problems.length + idx),
      display_order: problems.length + idx
    }));
    setProblems([...problems, ...newProbs]);
  };

  const handleProblemCreated = (newProblem: any) => {
    const p = {
      problem_id: newProblem.id,
      slug: newProblem.slug,
      title: newProblem.title,
      difficulty: newProblem.difficulty,
      points: newProblem.points,
      label: String.fromCharCode(65 + problems.length),
      display_order: problems.length
    };
    setProblems([...problems, p]);
  };

  const handlePublish = async (isPublished: boolean) => {
    setSaving(true);
    try {
      // 1. Create Contest
      const freeze_at = form.freeze_time_mins > 0 ? 
        new Date(new Date(form.end_time).getTime() - form.freeze_time_mins * 60000).toISOString() : null;

      const contestPayload = {
        title: form.title, slug: form.slug, description: form.description,
        banner_url: form.banner_url, 
        start_time: fromLocalDatetimeLocal(form.start_time), 
        end_time: fromLocalDatetimeLocal(form.end_time),
        contest_type: form.contest_type, visibility: form.visibility,
        practice_mode: form.practice_mode, freeze_at, is_published: isPublished
      };

      const cRes = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contestPayload)
      });
      const cData = await cRes.json();
      if (!cRes.ok) throw new Error(cData.error || 'Failed to create contest');
      
      const contestId = cData.id;

      // 2. Attach problems
      if (problems.length > 0) {
        const pRes = await fetch(`/api/admin/contests/${contestId}/problems`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problems })
        });
        if (!pRes.ok) {
          const pData = await pRes.json();
          alert('Contest created, but attaching problems failed: ' + pData.error);
        }
      }

      localStorage.removeItem('contest-draft');
      router.push(`/admin/contests`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar / Stepper Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin/contests" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '1.2rem' }}>✕</Link>
          <div style={{ height: '24px', width: '1px', background: 'var(--color-border)' }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Contest Builder</h1>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: currentStep === i ? 'var(--accent-1)' : currentStep > i ? 'rgba(34,197,94,0.1)' : 'transparent',
                color: currentStep === i ? 'var(--text-primary)' : currentStep > i ? '#22c55e' : 'var(--color-text-muted)',
                border: currentStep < i ? '1px solid var(--color-border)' : 'none',
                fontWeight: 700, fontSize: '0.8rem'
              }}>
                {currentStep > i ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: currentStep === i ? 700 : 600, color: currentStep >= i ? 'var(--text-primary)' : 'var(--color-text-muted)', display: i === STEPS.length -1 ? 'none' : 'block' }}>{s}</span>
              {i < STEPS.length - 1 && <div style={{ width: '30px', height: '2px', background: currentStep > i ? 'var(--accent-1)' : 'var(--color-border)' }} />}
            </div>
          ))}
        </div>
        <div style={{ width: '80px' }} /> {/* Spacer */}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* STEP 1: Details */}
        {currentStep === 0 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Basic Details</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '-1rem 0 0', fontSize: '0.9rem' }}>Set the name, timing, and visibility of your contest.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Contest Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))} placeholder="e.g. Weekly Contest 101"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>URL Slug *</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="weekly-contest-101"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '0.9rem', outline: 'none', fontFamily: 'monospace' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Start Time *</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>End Time *</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Brief summary for the contest page..."
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Visibility</label>
                  <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="public">Public (Anyone can see & join)</option>
                    <option value="private">Private (Link only)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Contest Type</label>
                  <select value={form.contest_type} onChange={e => setForm(f => ({ ...f, contest_type: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="ICPC">ICPC (Time penalty for WA)</option>
                    <option value="IOI">IOI (Partial scoring, no time penalty)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Problems */}
        {currentStep === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Problems ({problems.length})</h2>
                <p style={{ color: 'var(--color-text-muted)', margin: '0.2rem 0 0', fontSize: '0.9rem' }}>Add problems and drag to reorder them.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowBank(true)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>📚 Browse Bank</button>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ Create New</button>
              </div>
            </div>
            
            <ProblemList 
              problems={problems} 
              onChange={setProblems} 
              onRemove={(id) => setProblems(p => p.filter(x => x.problem_id !== id))} 
            />
          </div>
        )}

        {/* STEP 3: Rules */}
        {currentStep === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Contest Rules</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '-1rem 0 0', fontSize: '0.9rem' }}>Configure judging behavior and leaderboard settings.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.practice_mode} onChange={e => setForm(f => ({ ...f, practice_mode: e.target.checked }))} style={{ marginTop: '0.2rem', accentColor: 'var(--accent-1)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Allow Practice Mode</span>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>If enabled, students can continue to submit solutions and practice even after the contest ends. (Scores won't affect the official leaderboard).</span>
                  </div>
                </label>
              </div>

              <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Leaderboard Freeze</span>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Stop updating the public leaderboard near the end of the contest to build suspense.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="number" value={form.freeze_time_mins} onChange={e => setForm(f => ({ ...f, freeze_time_mins: +e.target.value }))} min={0} max={300}
                    style={{ width: '80px', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>minutes before the end (0 to disable)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Preview */}
        {currentStep === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Review Details</h2>
            
            <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>{form.title || 'Untitled Contest'}</h3>
                <code style={{ fontSize: '0.8rem', color: 'var(--accent-1)', background: 'rgba(108,99,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>/contests/{form.slug || 'slug'}</code>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Time Window</span>
                  <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {form.start_time ? new Date(form.start_time).toLocaleString() : 'Not set'} - {form.end_time ? new Date(form.end_time).toLocaleString() : 'Not set'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Configuration</span>
                  <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    Type: {form.contest_type} | Vis: {form.visibility} | Practice: {form.practice_mode ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Problems ({problems.length})</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {problems.length === 0 ? <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>No problems added. (Warning: Empty contest)</span> : 
                    problems.map(p => (
                      <div key={p.problem_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--color-bg)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}><b>{p.label}.</b> {p.title}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-1)', fontWeight: 700 }}>{p.points}pt</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Publish */}
        {currentStep === 4 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Ready for takeoff</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '1rem', maxWidth: '400px' }}>
              Your contest is fully configured. You can publish it immediately (visible to students) or save it as a draft to keep working on it later.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => handlePublish(false)} disabled={saving} style={{ padding: '0.85rem 1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? 'Saving...' : '💾 Save as Draft'}
              </button>
              <button onClick={() => handlePublish(true)} disabled={saving} className="btn btn-primary" style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}>
                {saving ? 'Publishing...' : '📢 Publish Contest'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 100, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handlePrev} disabled={currentStep === 0} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: currentStep === 0 ? 'rgba(255,255,255,0.2)' : 'var(--text-secondary)', fontSize: '0.9rem', cursor: currentStep === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, visibility: currentStep === 0 ? 'hidden' : 'visible' }}>
          ← Back
        </button>
        {currentStep < STEPS.length - 1 && (
          <button onClick={handleNext} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
            Next Step →
          </button>
        )}
      </div>

      <QuestionBankDrawer 
        isOpen={showBank} 
        onClose={() => setShowBank(false)} 
        onSelect={handleBankSelect} 
        existingProblemIds={problems.map(p => p.problem_id)} 
      />
      
      <QuestionEditorModal 
        isOpen={showCreate} 
        onClose={() => setShowCreate(false)} 
        onSaved={handleProblemCreated} 
      />
    </div>
  );
}
