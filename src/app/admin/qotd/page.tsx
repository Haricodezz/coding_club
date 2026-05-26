'use client';

import { useEffect, useState } from 'react';
import { getQotdCalendarAdmin, saveQotd, deleteQotd, getQuestionsAdmin } from '../actions';
import type { QotDCalendar, Question } from '@/types';

// Extended type to include the joined question title
type QotDWithTitle = QotDCalendar & { questions?: { title: string } };

export default function AdminQotd() {
  const [calendar, setCalendar] = useState<QotDWithTitle[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [questionId, setQuestionId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [qotdData, questionsData] = await Promise.all([
        getQotdCalendarAdmin(),
        getQuestionsAdmin()
      ]);
      setCalendar(qotdData as unknown as QotDWithTitle[]);
      setQuestions(questionsData as unknown as Question[]);
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
        question_id: questionId,
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
    // Format date properly (e.g. "2024-05-20" if it isn't already)
    const formattedDate = new Date(item.date).toISOString().split('T')[0];
    setDate(formattedDate);
    setQuestionId(item.question_id);
    setIsActive(item.is_active);
  }

  function resetForm() {
    setEditingDate(null);
    setDate(new Date().toISOString().split('T')[0]);
    setQuestionId('');
    setIsActive(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-qotd">
      <div className="page-header animate-fade-in">
        <p className="eyebrow">📅 QotD Calendar</p>
        <h1>Question of <span className="gradient-text">the Day</span></h1>
        <p>Schedule questions to appear as the daily challenge.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Create / Edit Form */}
        <div className="card glass">
          <h3>{editingDate ? `Edit QotD for ${editingDate}` : '+ Schedule QotD'}</h3>
          <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!!editingDate} // Primary key cannot be easily changed in upsert this way
              />
              {editingDate && <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>Date cannot be changed while editing.</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Question</label>
              <select 
                className="form-select" 
                required 
                value={questionId} 
                onChange={(e) => setQuestionId(Number(e.target.value))}
              >
                <option value="" disabled>-- Select a Question --</option>
                {questions.map(q => (
                  <option key={q.id} value={q.id}>#{q.id} - {q.title} ({q.difficulty})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="isActive" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Active (Show on platform)</label>
            </div>

            <div className="flex gap-2" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingDate ? 'Update Schedule' : 'Schedule Question'}
              </button>
              {editingDate && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing QotD Schedule */}
        <div className="card glass">
          <h3>Scheduled Challenges ({calendar.length})</h3>
          <div className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            {calendar.length === 0 ? (
              <p style={{ color: '#64748b' }}>No questions scheduled yet.</p>
            ) : (
              calendar.map((item) => {
                const isPast = new Date(item.date) < new Date(new Date().toDateString());
                const isToday = item.date === new Date().toISOString().split('T')[0];
                
                return (
                  <div key={item.date} className="card" style={{ 
                    background: isToday ? 'rgba(74, 144, 226, 0.1)' : 'var(--color-surface-2)',
                    border: isToday ? '1px solid var(--accent)' : 'none',
                    opacity: isPast ? 0.6 : 1 
                  }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          {item.date}
                          {isToday && <span className="badge badge-easy" style={{ fontSize: '0.65rem' }}>Today</span>}
                          {!item.is_active && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Inactive</span>}
                        </h4>
                        <p style={{ fontSize: '0.9rem', color: '#a8b3cf', marginTop: '0.25rem', marginBottom: 0 }}>
                          Question: <strong style={{ color: '#fff' }}>{item.questions?.title || `ID #${item.question_id}`}</strong>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.date)} style={{ color: 'var(--color-error)' }}>🗑️</button>
                      </div>
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
