'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { History, ChevronLeft, ChevronRight, Filter, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Submission {
  id: string;
  submitted_at: string;
  language: string;
  passed_tests: number;
  total_tests: number;
  points_earned: number;
  question_id: string;
  questions?: { title: string };
  status?: string; // 'AC', 'WA', 'RE', 'TLE'
}

export function RecentSubmissionsWidget({ submissions }: { submissions: Submission[] }) {
  const [page, setPage] = useState(1);
  const [filterLang, setFilterLang] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const ITEMS_PER_PAGE = 4;

  // Enrich legacy submissions with status if not present
  const enriched = submissions.map(sub => {
    let status = sub.status;
    if (!status) {
      if (sub.total_tests > 0 && sub.passed_tests === sub.total_tests) status = 'AC';
      else if (sub.total_tests > 0 && sub.passed_tests > 0) status = 'WA';
      else status = 'RE'; // default fallback for 0 passed
    }
    return { ...sub, status };
  });

  const filtered = enriched.filter(sub => {
    if (filterLang !== 'all' && sub.language !== filterLang) return false;
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AC': return <CheckCircle size={14} color="#22c55e" />;
      case 'WA': return <XCircle size={14} color="#ef4444" />;
      case 'TLE': return <Clock size={14} color="#f59e0b" />;
      default: return <AlertTriangle size={14} color="#f97316" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AC': return '#22c55e';
      case 'WA': return '#ef4444';
      case 'TLE': return '#f59e0b';
      default: return '#f97316';
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <h3 className="flex items-center gap-2">
          <History size={20} color="var(--accent-2)" /> Submissions
        </h3>
        
        {/* Filters */}
        <div className="flex gap-2">
          <select 
            className="form-select" 
            style={{ padding: '0.2rem 1.5rem 0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto', backgroundSize: '10px' }}
            value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="all">All Status</option>
            <option value="AC">Accepted</option>
            <option value="WA">Wrong Answer</option>
            <option value="TLE">Time Limit</option>
          </select>
        </div>
      </div>

      <div className="flex-col gap-2 min-h-[300px]">
        {paginated.length > 0 ? paginated.map(sub => (
          <div 
            key={sub.id} 
            className="flex items-center justify-between" 
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-2)',
              border: `1px solid ${sub.status === 'AC' ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius)',
              transition: 'var(--transition)'
            }}
          >
            <div style={{ minWidth: 0, flex: 1, marginRight: '1rem' }}>
              <div className="flex items-center gap-2">
                {getStatusIcon(sub.status!)}
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sub.questions?.title || `Question #${sub.question_id}`}
                </div>
              </div>
              <div className="flex gap-2 items-center" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                <span style={{ textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>{sub.language}</span>
                <span>•</span>
                <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                <span>•</span>
                <span style={{ color: getStatusColor(sub.status!) }}>{sub.status}</span>
              </div>
            </div>

            <div className="flex-col items-end gap-1">
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: sub.status === 'AC' ? 'var(--color-success)' : 'var(--text-muted)' }}>
                +{sub.points_earned} pts
              </span>
              <div className="flex gap-2">
                <Link href={`/qotd?id=${sub.question_id}`} className="text-xs" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                  Re-attempt
                </Link>
              </div>
            </div>
          </div>
        )) : (
          <div className="empty-state text-center" style={{ padding: '2rem 0', margin: 'auto' }}>
            <History size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No submissions found for these filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center" style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <button 
            className="btn btn-ghost btn-sm" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '0.2rem 0.5rem' }}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button 
            className="btn btn-ghost btn-sm" 
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.2rem 0.5rem' }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
