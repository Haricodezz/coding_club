'use client';

import { useEffect, useState, useMemo } from 'react';
import { getQotdCalendarAdmin, saveQotd, deleteQotd, getQuestionBankForQotd } from '../actions';
import type { QotDCalendar } from '@/types';

// Extended type to include the joined question title
type QotDWithTitle = QotDCalendar & { question_bank?: { title: string }, question_bank_id: string };

interface QuestionBankOption {
  id: string;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  statement: string;
}

export default function AdminQotd() {
  const [calendar, setCalendar] = useState<QotDWithTitle[]>([]);
  const [questions, setQuestions] = useState<QuestionBankOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [questionId, setQuestionId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  // Filter states
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [qotdData, questionsData] = await Promise.all([
        getQotdCalendarAdmin(),
        getQuestionBankForQotd()
      ]);
      setCalendar(qotdData as unknown as QotDWithTitle[]);
      setQuestions(questionsData as unknown as QuestionBankOption[]);
      setLoading(false);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!questionId) {
      setMessage({ text: 'Please select a question', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await saveQotd(date, {
        question_bank_id: questionId,
        is_active: isActive,
      });
      setMessage({
        text: 'QotD scheduled successfully!',
        type: 'success'
      });
      resetForm();
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(targetDate: string) {
    if (!confirm('Are you sure you want to unschedule the question for this date?')) return;
    try {
      await deleteQotd(targetDate);
      setMessage({ text: 'QotD unscheduled successfully!', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  function startEdit(item: QotDWithTitle) {
    setEditingDate(item.date);
    const formattedDate = new Date(item.date).toISOString().split('T')[0];
    setDate(formattedDate);
    setQuestionId(item.question_bank_id || '');
    setIsActive(item.is_active);
  }

  function resetForm() {
    setEditingDate(null);
    setDate(new Date().toISOString().split('T')[0]);
    setQuestionId('');
    setIsActive(true);
  }

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    questions.forEach(q => (q.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
      if (tagFilter && !(q.tags || []).includes(tagFilter)) return false;
      return true;
    });
  }, [questions, difficultyFilter, tagFilter]);

  const selectedQuestion = useMemo(() => {
    return questions.find(q => q.id === questionId);
  }, [questions, questionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-qotd" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div className="page-header animate-fade-in" style={{ marginBottom: '2rem' }}>
        <p className="eyebrow" style={{ color: 'var(--accent-1)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 QotD Calendar</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>Question of <span style={{ color: 'var(--accent-1)' }}>the Day</span></h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Schedule unified Question Bank problems to appear as the daily challenge.</p>
      </div>

      {message && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: message.type === 'error' ? '#ef4444' : '#22c55e', border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, fontWeight: 500 }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Create / Edit Form */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            {editingDate ? `Edit QotD for ${editingDate}` : '+ Schedule QotD'}
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!!editingDate}
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--text-primary)', outline: 'none' }}
              />
              {editingDate && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', display: 'block' }}>Date cannot be changed while editing.</span>}
            </div>

            <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>Select from Question Bank</label>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}>
                  <option value="">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}>
                  <option value="">All Tags</option>
                  {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <select 
                required 
                value={questionId} 
                onChange={(e) => setQuestionId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--accent-1)', background: 'var(--color-surface)', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
              >
                <option value="" disabled>-- Select a Question --</option>
                {filteredQuestions.map(q => (
                  <option key={q.id} value={q.id}>{q.title} ({q.difficulty})</option>
                ))}
              </select>
              {filteredQuestions.length === 0 && <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem', fontStyle: 'italic' }}>No questions match filters.</p>}
            </div>

            {/* PREVIEW PANEL */}
            {selectedQuestion && (
              <div style={{ background: 'rgba(108,99,255,0.05)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '8px', padding: '1rem', marginTop: '-0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--accent-1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Preview: {selectedQuestion.title}
                  <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '99px', background: selectedQuestion.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : selectedQuestion.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: selectedQuestion.difficulty === 'Easy' ? '#22c55e' : selectedQuestion.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>
                    {selectedQuestion.difficulty}
                  </span>
                </h4>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {(selectedQuestion.tags || []).slice(0, 5).map(t => (
                    <span key={t} style={{ fontSize: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--color-text-muted)' }}>{t}</span>
                  ))}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxHeight: '100px', overflowY: 'auto', background: 'var(--color-bg)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  {selectedQuestion.statement.substring(0, 200)}...
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.5rem 0' }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-1)' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Active (Show on platform)</span>
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving...' : editingDate ? 'Update Schedule' : 'Schedule Question'}
              </button>
              {editingDate && (
                <button type="button" onClick={resetForm} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing QotD Schedule */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
            Scheduled Challenges <span style={{ color: 'var(--accent-1)', background: 'rgba(108,99,255,0.1)', padding: '0.1rem 0.6rem', borderRadius: '99px', fontSize: '0.9rem' }}>{calendar.length}</span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', maxHeight: '600px', paddingRight: '0.5rem' }}>
            {calendar.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No questions scheduled yet.</p>
            ) : (
              calendar.map((item) => {
                const isPast = new Date(item.date) < new Date(new Date().toDateString());
                const isToday = item.date === new Date().toISOString().split('T')[0];
                
                return (
                  <div key={item.date} style={{ 
                    background: isToday ? 'rgba(108,99,255,0.05)' : 'var(--color-bg)',
                    border: isToday ? '1px solid var(--accent-1)' : '1px solid var(--color-border)',
                    opacity: isPast ? 0.6 : 1,
                    padding: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'transform 0.1s',
                  }}>
                    <div>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.3rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.date}
                        {isToday && <span style={{ fontSize: '0.65rem', background: 'var(--accent-1)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 600 }}>Today</span>}
                        {!item.is_active && <span style={{ fontSize: '0.65rem', background: 'var(--color-surface-2)', color: 'var(--text-secondary)', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 600, border: '1px solid var(--color-border)' }}>Inactive</span>}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.question_bank?.title || `ID ${item.question_bank_id?.substring(0, 8)}`}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => startEdit(item)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} title="Edit">✏️</button>
                      <button onClick={() => handleDelete(item.date)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} title="Unschedule">🗑️</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
