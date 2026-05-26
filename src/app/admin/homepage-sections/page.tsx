'use client';

import { useEffect, useState } from 'react';
import { getHomepageSections, saveHomepageSection } from '../actions';
import type { CmsHomepageSection } from '@/types/cms';

export default function AdminHomepageSections() {
  const [sections, setSections] = useState<CmsHomepageSection[]>([]);
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionSubtitle, setSectionSubtitle] = useState('');
  const [contentData, setContentData] = useState<any>({});

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const data = await getHomepageSections();
      setSections(data as unknown as CmsHomepageSection[]);
      const active = (data as unknown as CmsHomepageSection[]).find(s => s.section_key === selectedSectionKey);
      if (active) {
        setSectionTitle(active.section_title || '');
        setSectionSubtitle(active.section_subtitle || '');
        setContentData(active.content_data || {});
      }
      setLoading(false);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setLoading(false);
    }
  }

  // Sync state when selected section tab changes
  useEffect(() => {
    const active = sections.find(s => s.section_key === selectedSectionKey);
    if (active) {
      setSectionTitle(active.section_title || '');
      setSectionSubtitle(active.section_subtitle || '');
      setContentData(active.content_data || {});
    }
  }, [selectedSectionKey, sections]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await saveHomepageSection(selectedSectionKey, {
        section_title: sectionTitle,
        section_subtitle: sectionSubtitle,
        content_data: contentData
      });
      setMessage({ text: 'Homepage section updated successfully! 🚀', type: 'success' });
      await loadSections();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function handleContentChange(key: string, value: any) {
    setContentData((prev: any) => ({
      ...prev,
      [key]: value
    }));
  }

  function handleFeatureChange(index: number, key: string, value: string) {
    const updatedCards = [...(contentData.cards || [])];
    updatedCards[index] = { ...updatedCards[index], [key]: value };
    handleContentChange('cards', updatedCards);
  }

  function handleStatChange(index: number, key: string, value: string) {
    const updatedStats = [...(contentData.stats || [])];
    updatedStats[index] = { ...updatedStats[index], [key]: value };
    handleContentChange('stats', updatedStats);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-homepage-sections">
      <div className="page-header animate-fade-in">
        <p className="eyebrow">🛠️ CMS Configurator</p>
        <h1>Homepage <span className="gradient-text">Sections</span></h1>
        <p>Edit banner slogans, text layouts, features grids, and code block details in real-time.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 wrap" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        {['hero', 'features', 'stats', 'cta'].map((tab) => (
          <button
            key={tab}
            className={`btn ${selectedSectionKey === tab ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSelectedSectionKey(tab)}
          >
            {tab.toUpperCase()} Section
          </button>
        ))}
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSave} className="card glass flex-col gap-6">
        <h2 style={{ textTransform: 'capitalize', marginBottom: '0.5rem' }}>Edit {selectedSectionKey} Section</h2>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Section Title</label>
            <input
              type="text"
              required
              className="form-input"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Section Subtitle / Description</label>
            <textarea
              className="form-input"
              rows={2}
              value={sectionSubtitle}
              onChange={(e) => setSectionSubtitle(e.target.value)}
            />
          </div>
        </div>

        <hr style={{ borderColor: 'var(--color-border)' }} />

        {/* Dynamic Fields based on section key */}
        {selectedSectionKey === 'hero' && (
          <div className="flex-col gap-4">
            <h3>Hero Accent & Interactive Mockup</h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Promo Badge Text</label>
                <input
                  type="text"
                  className="form-input"
                  value={contentData.badge || ''}
                  onChange={(e) => handleContentChange('badge', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Editor File Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={contentData.editor_filename || ''}
                  onChange={(e) => handleContentChange('editor_filename', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Primary Button Text</label>
                <input
                  type="text"
                  className="form-input"
                  value={contentData.primary_btn_text || ''}
                  onChange={(e) => handleContentChange('primary_btn_text', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Primary Button Link</label>
                <input
                  type="text"
                  className="form-input"
                  value={contentData.primary_btn_link || ''}
                  onChange={(e) => handleContentChange('primary_btn_link', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Secondary Button Text</label>
                <input
                  type="text"
                  className="form-input"
                  value={contentData.secondary_btn_text || ''}
                  onChange={(e) => handleContentChange('secondary_btn_text', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Secondary Button Link</label>
                <input
                  type="text"
                  className="form-input"
                  value={contentData.secondary_btn_link || ''}
                  onChange={(e) => handleContentChange('secondary_btn_link', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Terminal Animation Script</label>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Start lines with <code>$</code> for commands, <code>#</code> for yellow text, and <code>&gt;</code> or <code>✓</code> for green output.
              </p>
              <textarea
                className="form-input"
                style={{ fontFamily: 'var(--font-code)' }}
                rows={10}
                value={contentData.editor_code || ''}
                onChange={(e) => handleContentChange('editor_code', e.target.value)}
              />
            </div>
          </div>
        )}

        {selectedSectionKey === 'features' && (
          <div className="flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3>Feature Cards (Max 6)</h3>
              {(contentData.cards || []).length < 6 && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const cards = [...(contentData.cards || []), { icon: '', title: '', desc: '' }];
                    handleContentChange('cards', cards);
                  }}
                >
                  + Add Card
                </button>
              )}
            </div>
            <div className="grid-2" style={{ gap: '1.5rem' }}>
              {(contentData.cards || []).map((card: any, idx: number) => (
                <div key={idx} className="card" style={{ background: 'var(--color-surface-2)', padding: '1rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>Card #{idx + 1}</h4>
                  <div className="grid-2" style={{ marginBottom: '0.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Emoji / Icon</label>
                      <input
                        type="text"
                        className="form-input"
                        value={card.icon || ''}
                        onChange={(e) => handleFeatureChange(idx, 'icon', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Title</label>
                      <input
                        type="text"
                        className="form-input"
                        value={card.title || ''}
                        onChange={(e) => handleFeatureChange(idx, 'title', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={card.desc || ''}
                      onChange={(e) => handleFeatureChange(idx, 'desc', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSectionKey === 'stats' && (
          <div className="flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3>Statistic Grid Counters (Max 4)</h3>
              {(contentData.stats || []).length < 4 && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const stats = [...(contentData.stats || []), { value: '', label: '' }];
                    handleContentChange('stats', stats);
                  }}
                >
                  + Add Stat
                </button>
              )}
            </div>
            <div className="grid-4">
              {(contentData.stats || []).map((stat: any, idx: number) => (
                <div key={idx} className="card" style={{ background: 'var(--color-surface-2)', padding: '1rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>Stat #{idx + 1}</h4>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label">Value (e.g. 50+)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={stat.value || ''}
                      onChange={(e) => handleStatChange(idx, 'value', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Label</label>
                    <input
                      type="text"
                      className="form-input"
                      value={stat.label || ''}
                      onChange={(e) => handleStatChange(idx, 'label', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSectionKey === 'cta' && (
          <div className="flex-col gap-4">
            <h3>Call-to-Action Buttons</h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Button Text</label>
                <input
                  type="text"
                  className="form-input"
                  value={contentData.btn_text || ''}
                  onChange={(e) => handleContentChange('btn_text', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Button Target Link</label>
                <input
                  type="text"
                  className="form-input"
                  value={contentData.btn_link || ''}
                  onChange={(e) => handleContentChange('btn_link', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
          {saving ? 'Saving changes...' : 'Save Configuration ✨'}
        </button>
      </form>
    </div>
  );
}
