'use client';

import { useEffect, useState } from 'react';
import { getQuestionsAdmin, saveQuestion, deleteQuestion } from '../actions';
import type { Question } from '@/types';

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exampleInput, setExampleInput] = useState('');
  const [exampleOutput, setExampleOutput] = useState('');
  const [constraints, setConstraints] = useState('');
  const [testCasesJson, setTestCasesJson] = useState('[\n  {\n    "input": "",\n    "expected_output": "",\n    "explanation": ""\n  }\n]');
  const [difficulty, setDifficulty] = useState('Medium');
  const [tagsStr, setTagsStr] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      const data = await getQuestionsAdmin();
      setQuestions(data as unknown as Question[]);
      setLoading(false);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Parse test cases JSON
    let test_cases = [];
    try {
      test_cases = JSON.parse(testCasesJson);
      if (!Array.isArray(test_cases)) throw new Error('Test cases must be an array');
    } catch (err: any) {
      setMessage({ text: 'Invalid Test Cases JSON: ' + err.message, type: 'error' });
      setSaving(false);
      return;
    }

    // Parse tags
    const tags = tagsStr.split(',').map(s => s.trim()).filter(Boolean);

    try {
      await saveQuestion(editingId, {
        title,
        description,
        example_input: exampleInput || undefined,
        example_output: exampleOutput || undefined,
        constraints: constraints || undefined,
        test_cases,
        difficulty,
        tags,
        is_published: isPublished,
        is_public: isPublic,
      });
      setMessage({
        text: editingId ? 'Question updated successfully!' : 'Question created successfully!',
        type: 'success'
      });
      resetForm();
      await loadQuestions();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion(id);
      setMessage({ text: 'Question deleted successfully!', type: 'success' });
      await loadQuestions();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  function startEdit(item: Question) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setExampleInput(item.example_input || '');
    setExampleOutput(item.example_output || '');
    setConstraints(item.constraints || '');
    setTestCasesJson(JSON.stringify(item.test_cases, null, 2));
    setDifficulty(item.difficulty || 'Medium');
    setTagsStr(item.tags?.join(', ') || '');
    setIsPublished(item.is_published);
    setIsPublic(item.is_public);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setExampleInput('');
    setExampleOutput('');
    setConstraints('');
    setTestCasesJson('[\n  {\n    "input": "",\n    "expected_output": "",\n    "explanation": ""\n  }\n]');
    setDifficulty('Medium');
    setTagsStr('');
    setIsPublished(false);
    setIsPublic(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-questions">
      <div className="page-header animate-fade-in">
        <p className="eyebrow">❓ Question Bank</p>
        <h1>Manage <span className="gradient-text">Questions</span></h1>
        <p>Create and edit coding challenges for the platform.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Create / Edit Form */}
        <div className="card glass">
          <h3>{editingId ? `Edit Question #${editingId}` : '+ Create Question'}</h3>
          <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input type="text" required className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description (Markdown)</label>
              <textarea required className="form-input" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Example Input (Optional)</label>
                <textarea className="form-input" rows={3} value={exampleInput} onChange={(e) => setExampleInput(e.target.value)} style={{ fontFamily: 'monospace' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Example Output (Optional)</label>
                <textarea className="form-input" rows={3} value={exampleOutput} onChange={(e) => setExampleOutput(e.target.value)} style={{ fontFamily: 'monospace' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Constraints (Optional)</label>
              <textarea className="form-input" rows={2} value={constraints} onChange={(e) => setConstraints(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input type="text" className="form-input" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="Arrays, Hash Table, Two Pointers" />
            </div>

            <div className="form-group">
              <label className="form-label">Test Cases (JSON Array)</label>
              <textarea required className="form-input" rows={8} value={testCasesJson} onChange={(e) => setTestCasesJson(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Must be an array of objects with <code>input</code> and <code>expected_output</code> strings.
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPublished" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                <label htmlFor="isPublished" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Published</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                <label htmlFor="isPublic" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Publically viewable</label>
              </div>
            </div>

            <div className="flex gap-2" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Question' : 'Create Question'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Questions */}
        <div className="card glass">
          <h3>Question Bank ({questions.length})</h3>
          <div className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            {questions.length === 0 ? (
              <p style={{ color: '#64748b' }}>No questions created yet.</p>
            ) : (
              questions.map((item) => (
                <div key={item.id} className="card" style={{ background: 'var(--color-surface-2)', opacity: item.is_published ? 1 : 0.6 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        #{item.id} - {item.title}
                        {!item.is_published && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Draft</span>}
                        {!item.is_public && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Private</span>}
                      </h4>
                      <div className="flex gap-2 wrap" style={{ marginTop: '0.5rem' }}>
                        <span className={`badge ${item.difficulty === 'Easy' ? 'badge-easy' : item.difficulty === 'Medium' ? 'badge-medium' : 'badge-hard'}`}>
                          {item.difficulty}
                        </span>
                        <span className="badge badge-secondary">{item.test_cases?.length || 0} Test Cases</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#a8b3cf', marginTop: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.description}
                      </p>
                      {item.tags && item.tags.length > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                          Tags: {item.tags.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)} style={{ color: 'var(--color-error)' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
