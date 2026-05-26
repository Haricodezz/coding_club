'use client';

import { useEffect, useState } from 'react';
import { getEventsAdmin, saveEvent, deleteEvent } from '../actions';
import type { CmsEvent } from '@/types/cms';

export default function AdminEvents() {
  const [events, setEvents] = useState<CmsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [registrationLink, setRegistrationLink] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await getEventsAdmin();
      setEvents(data as unknown as CmsEvent[]);
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

    try {
      await saveEvent(editingId, {
        title,
        description,
        thumbnail_url: thumbnailUrl || undefined,
        event_date: new Date(eventDate).toISOString(),
        location: location || 'Online',
        registration_link: registrationLink || undefined,
        is_published: isPublished,
      });
      setMessage({
        text: editingId ? 'Event updated successfully!' : 'Event created successfully!',
        type: 'success'
      });
      resetForm();
      await loadEvents();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteEvent(id);
      setMessage({ text: 'Event deleted successfully!', type: 'success' });
      await loadEvents();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  function startEdit(item: CmsEvent) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setThumbnailUrl(item.thumbnail_url || '');
    
    // Format date for datetime-local input
    const dateObj = new Date(item.event_date);
    const localDateStr = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEventDate(localDateStr);
    
    setLocation(item.location || 'Online');
    setRegistrationLink(item.registration_link || '');
    setIsPublished(item.is_published);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setThumbnailUrl('');
    setEventDate('');
    setLocation('Online');
    setRegistrationLink('');
    setIsPublished(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-events">
      <div className="page-header animate-fade-in">
        <p className="eyebrow">📅 Event Management</p>
        <h1>Manage <span className="gradient-text">Events</span></h1>
        <p>Schedule hackathons, workshops, and coding contests.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
          {message.type === 'error' ? '❌' : '✨'} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Create / Edit Form */}
        <div className="card glass">
          <h3>{editingId ? 'Edit Event' : '+ Create Event'}</h3>
          <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Event Title</label>
              <input
                type="text"
                required
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                required
                className="form-input"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input
                type="datetime-local"
                required
                className="form-input"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location (or 'Online')</label>
              <input
                type="text"
                className="form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registration Link (Optional)</label>
              <input
                type="url"
                className="form-input"
                value={registrationLink}
                onChange={(e) => setRegistrationLink(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Thumbnail URL (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <label htmlFor="isPublished" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Published (Visible to users)</label>
            </div>

            <div className="flex gap-2" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Event' : 'Create Event'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Events */}
        <div className="card glass">
          <h3>All Events ({events.length})</h3>
          <div className="flex-col gap-4" style={{ marginTop: '1.5rem' }}>
            {events.length === 0 ? (
              <p style={{ color: '#64748b' }}>No events scheduled yet.</p>
            ) : (
              events.map((item) => (
                <div key={item.id} className="card" style={{ background: 'var(--color-surface-2)', opacity: item.is_published ? 1 : 0.6 }}>
                  <div className="flex justify-between items-start">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {item.thumbnail_url && (
                        <img 
                          src={item.thumbnail_url} 
                          alt="Thumbnail" 
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius)' }} 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                      <div>
                        <h4 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {item.title}
                          {!item.is_published && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Draft</span>}
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#a8b3cf', marginTop: '0.5rem' }}>
                          {item.description.substring(0, 100)}{item.description.length > 100 ? '...' : ''}
                        </p>
                        <div className="flex gap-3 wrap" style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <span>⏱️ {new Date(item.event_date).toLocaleString()}</span>
                          <span>📍 {item.location}</span>
                        </div>
                      </div>
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
