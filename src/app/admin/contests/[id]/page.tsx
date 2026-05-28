'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import ProblemList, { ContestProblem } from '@/components/contest/ProblemList';
import QuestionBankDrawer from '@/components/contest/QuestionBankDrawer';
import QuestionEditorModal from '@/components/contest/QuestionEditorModal';
import ContestMonitor from '@/components/contest/ContestMonitor';
import AnnouncementPanel from '@/components/contest/AnnouncementPanel';
import { toLocalDatetimeLocal, fromLocalDatetimeLocal } from '@/lib/utils/date';

const TABS = ['Settings', 'Problems', 'Monitor', 'Announcements'];

export default function ContestAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [tab, setTab] = useState(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Modals
  const [showBank, setShowBank] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [contest, setContest] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [problems, setProblems] = useState<ContestProblem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/contests/${id}`);
      if (res.ok) {
        const d = await res.json();
        setContest(d.contest);
        setForm({
          title: d.contest.title, slug: d.contest.slug, description: d.contest.description || '',
          banner_url: d.contest.banner_url || '', 
          start_time: toLocalDatetimeLocal(d.contest.start_time),
          end_time: toLocalDatetimeLocal(d.contest.end_time), 
          contest_type: d.contest.contest_type,
          visibility: d.contest.visibility || 'public', practice_mode: !!d.contest.practice_mode,
          freeze_time_mins: d.contest.freeze_at ? Math.round((new Date(d.contest.end_time).getTime() - new Date(d.contest.freeze_at).getTime()) / 60000) : 0,
          is_published: !!d.contest.is_published, is_featured: !!d.contest.is_featured
        });
        setProblems((d.problemMap || []).map((pm: any) => ({
          mapId: pm.id,
          problem_id: pm.question_bank.id,
          slug: pm.question_bank.slug,
          title: pm.question_bank.title,
          difficulty: pm.question_bank.difficulty,
          points: pm.custom_points ?? pm.question_bank.points,
          label: pm.label,
          display_order: pm.display_order
        })));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const freeze_at = form.freeze_time_mins > 0 ? 
        new Date(new Date(form.end_time).getTime() - form.freeze_time_mins * 60000).toISOString() : null;

      const payload = { 
        ...form, 
        start_time: fromLocalDatetimeLocal(form.start_time),
        end_time: fromLocalDatetimeLocal(form.end_time),
        freeze_at 
      };
      delete payload.freeze_time_mins;

      const res = await fetch(`/api/admin/contests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBankSelect = async (selectedProblems: any[]) => {
    try {
      const newProbs = selectedProblems.map((p, idx) => ({
        problem_id: p.id,
        label: String.fromCharCode(65 + problems.length + idx)
      }));
      
      await fetch(`/api/admin/contests/${id}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problems: newProbs })
      });
      
      load();
    } catch(e) {}
  };

  const handleProblemCreated = async (newProblem: any) => {
    try {
      await fetch(`/api/admin/contests/${id}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          problem_id: newProblem.id, 
          label: String.fromCharCode(65 + problems.length)
        })
      });
      load();
    } catch(e) {}
  };

  const handleProblemRemove = async (problemId: string) => {
    if (!confirm('Remove this problem from the contest?')) return;
    try {
      await fetch(`/api/admin/contests/${id}/problems?problem_id=${problemId}`, { method: 'DELETE' });
      load();
    } catch(e) {}
  };

  const handleProblemsReorder = async (newList: ContestProblem[]) => {
    setProblems(newList);
    try {
      const updates = newList.map(p => ({
        problem_id: p.problem_id,
        display_order: p.display_order,
        label: p.label
      }));
      await fetch(`/api/admin/contests/${id}/problems`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
    } catch (e) {}
  };

  if (loading && !contest) return <div className="skeleton" style={{ height: '100vh' }} />;

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Link href="/admin/contests" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>← All Contests</Link>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 800, margin: '0.2rem 0 0' }}>{contest.title}</h1>
          <p style={{ color: 'var(--accent-1)', fontSize: '0.85rem', margin: '0.2rem 0 0', fontFamily: 'monospace' }}>/contests/{contest.slug}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {saved && <span style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 700 }}>✓ Saved</span>}
          {tab === 'Settings' && (
            <button onClick={handleSaveSettings} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving...' : '💾 Save Settings'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: '2rem' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.75rem 1.25rem', border: 'none', background: 'transparent',
            color: tab === t ? 'var(--accent-1)' : 'var(--color-text-muted)',
            fontWeight: tab === t ? 700 : 600, fontSize: '0.9rem', cursor: 'pointer',
            borderBottom: tab === t ? '2px solid var(--accent-1)' : '2px solid transparent',
            transition: 'all 0.15s'
          }}>{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      
      {tab === 'Settings' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '800px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Contest Title</label>
            <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Start Time</label>
              <input type="datetime-local" value={form.start_time} onChange={e => setForm((f: any) => ({ ...f, start_time: e.target.value }))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>End Time</label>
              <input type="datetime-local" value={form.end_time} onChange={e => setForm((f: any) => ({ ...f, end_time: e.target.value }))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Visibility</label>
              <select value={form.visibility} onChange={e => setForm((f: any) => ({ ...f, visibility: e.target.value }))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Contest Type</label>
              <select value={form.contest_type} onChange={e => setForm((f: any) => ({ ...f, contest_type: e.target.value }))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}>
                <option value="ICPC">ICPC (penalty)</option>
                <option value="IOI">IOI (partial)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            {(['is_published', 'is_featured', 'practice_mode'] as const).map(field => (
              <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form[field]} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {tab === 'Problems' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>Drag to reorder problems. Pts edits auto-save on drag drop.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowBank(true)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>📚 Bank</button>
              <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ Create New</button>
            </div>
          </div>
          
          <ProblemList 
            problems={problems} 
            onChange={handleProblemsReorder} 
            onRemove={handleProblemRemove} 
          />
        </div>
      )}

      {tab === 'Monitor' && (
        <div className="fade-in">
          <ContestMonitor contestId={id} />
        </div>
      )}

      {tab === 'Announcements' && (
        <div className="fade-in">
          <AnnouncementPanel contestId={id} />
        </div>
      )}

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
