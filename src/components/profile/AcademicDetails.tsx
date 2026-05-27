'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, Mail, Edit2, CheckCircle2 } from 'lucide-react';
import type { User as AppUser } from '@/types';

interface AcademicDetailsProps {
  profile: AppUser;
  isOwnProfile: boolean;
  onSave?: (data: Partial<AppUser>) => void;
}

export function AcademicDetails({ profile, isOwnProfile, onSave }: AcademicDetailsProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    roll_number: profile.roll_number || '',
    academic_year: profile.academic_year || '',
    branch: profile.branch || '',
  });

  const handleSave = () => {
    if (onSave) onSave(formData as any);
    setEditing(false);
  };

  return (
    <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
      <div 
        className="flex justify-between items-center" 
        style={{ cursor: 'pointer', marginBottom: expanded ? '1rem' : 0 }}
        onClick={() => setExpanded(!expanded)}
      >
        <h4 className="flex items-center gap-2" style={{ margin: 0 }}>
          <GraduationCap size={18} color="var(--accent-2)" /> Academic Details
        </h4>
        <div className="flex gap-2 items-center">
          {expanded && isOwnProfile && !editing && (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              style={{ padding: '0.2rem 0.5rem', color: 'var(--text-muted)' }}
            >
              <Edit2 size={14} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {expanded && (
        <div className="animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <div className="flex-col gap-3 p-4" style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid rgba(108,99,255,0.2)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Roll Number</label>
                <input className="form-input" value={formData.roll_number} onChange={e => setFormData({...formData, roll_number: e.target.value})} />
              </div>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Year</label>
                  <select 
                    className="form-input" 
                    value={formData.academic_year} 
                    onChange={e => setFormData({...formData, academic_year: parseInt(e.target.value) || ''})}
                  >
                    <option value="">Select Year</option>
                    {[1, 2, 3, 4].map(yr => (
                      <option key={yr} value={yr}>{yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Branch</label>
                  <select 
                    className="form-input" 
                    value={formData.branch} 
                    onChange={e => setFormData({...formData, branch: e.target.value})}
                  >
                    <option value="">Select Branch</option>
                    {['CSE', 'CSE AIML', '3DAG', 'EEE', 'CWCA', 'CE', 'ME'].map(br => (
                      <option key={br} value={br}>{br}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave}><CheckCircle2 size={14} /> Save</button>
              </div>
            </div>
          ) : (
            <div className="flex-col gap-3" style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
              <div className="flex justify-between items-center border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--color-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Roll Number</span>
                <span style={{ fontWeight: 600 }}>{profile.roll_number || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--color-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Year</span>
                <span style={{ fontWeight: 600 }}>{profile.academic_year ? `Year ${profile.academic_year}` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--color-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Branch</span>
                <span style={{ fontWeight: 600 }}>{profile.branch || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-muted)' }}><Mail size={14} style={{ display: 'inline', marginRight: 4 }} /> Email</span>
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{profile.email}</span>
              </div>
            </div>
          )}

          {/* Progress Bar (Example) */}
          {!editing && profile.academic_year && (
            <div style={{ marginTop: '1.5rem' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Degree Progress</span>
                <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>{Math.min(profile.academic_year * 25, 100)}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--color-bg-2)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(profile.academic_year * 25, 100)}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '3px' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
