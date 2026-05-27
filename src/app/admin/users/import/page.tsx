'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CsvUserRow } from '@/lib/services/csv-import.service';

export default function BulkImportPage() {
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvUserRow[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Simple CSV parser
  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      // Split by comma, respecting quotes
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const row: any = {};
      headers.forEach((header, i) => {
        let val = values[i] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        row[header] = val;
      });
      return row as CsvUserRow;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setPreview(null);
    setResult(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
    };
    reader.readAsText(selectedFile);
  };

  const handlePreview = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/admin/users/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows })
      });
      
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
      } else {
        alert(data.error || 'Failed to generate preview');
      }
    } catch (e: any) {
      alert(e.message);
    }
    
    setLoading(false);
  };

  const handleImport = async () => {
    if (!preview || preview.validRows.length === 0) return;
    if (!confirm(`Are you sure you want to import ${preview.validRows.length} users?`)) return;
    
    setImporting(true);
    try {
      const res = await fetch('/api/admin/users/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rows: preview.validRows,
          filename: file?.name
        })
      });
      
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      alert(e.message);
    }
    setImporting(false);
  };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <p className="eyebrow">Admin Console</p>
          <h1>Bulk <span className="gradient-text">User Import</span></h1>
          <p>Upload a CSV file to add multiple students to the platform at once.</p>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="flex justify-between items-center wrap gap-3" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>1. Upload CSV</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Must include headers: full_name, email, roll_number...</p>
            </div>
            <a href="/api/admin/users/import/template" download className="btn btn-secondary text-sm">
              📥 Download Template
            </a>
          </div>
          
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            className="form-input" 
            style={{ padding: '0.5rem' }}
          />

          {parsedRows.length > 0 && !preview && !result && (
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={handlePreview} disabled={loading}>
                {loading ? 'Analyzing...' : `Preview ${parsedRows.length} Rows`}
              </button>
            </div>
          )}
        </div>

        {preview && !result && (
          <div className="card animate-fade-in" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>2. Import Preview</h3>
            
            <div className="grid-3" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="stat-box" style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }}>
                <div className="stat-value" style={{ color: '#22c55e' }}>{preview.validRows.length}</div>
                <div className="stat-label">Valid Rows</div>
              </div>
              <div className="stat-box" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
                <div className="stat-value" style={{ color: '#ef4444' }}>{preview.invalidRows.length}</div>
                <div className="stat-label">Invalid Rows</div>
              </div>
              <div className="stat-box" style={{ background: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.3)' }}>
                <div className="stat-value" style={{ color: '#eab308' }}>{preview.duplicateRows.length}</div>
                <div className="stat-label">Duplicates</div>
              </div>
            </div>

            {preview.invalidRows.length > 0 && (
              <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                <strong>⚠️ {preview.invalidRows.length} invalid rows found and will be skipped.</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.85rem' }}>
                  {preview.invalidRows.slice(0, 5).map((ir: any, idx: number) => (
                    <li key={idx}>{ir.row.email || 'Unknown'}: {ir.errors.join(', ')}</li>
                  ))}
                  {preview.invalidRows.length > 5 && <li>...and {preview.invalidRows.length - 5} more</li>}
                </ul>
              </div>
            )}

            {preview.duplicateRows.length > 0 && (
              <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                <strong>⚠️ {preview.duplicateRows.length} duplicate users found (email or roll number already exists). They will be skipped.</strong>
              </div>
            )}

            <div style={{ textAlign: 'right', marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleImport} 
                disabled={importing || preview.validRows.length === 0}
              >
                {importing ? 'Importing...' : `Confirm & Import ${preview.validRows.length} Users`}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="card animate-fade-in text-center">
            <h2 style={{ marginBottom: '1rem', color: result.success ? '#22c55e' : '#ef4444' }}>
              {result.success ? '🎉 Import Completed' : '❌ Import Failed'}
            </h2>
            
            <p style={{ fontSize: '1.1rem', marginBottom: '2rem', color: 'var(--text-muted)' }}>
              Successfully imported <strong>{result.successCount}</strong> users.
              {result.failedCount > 0 && ` Failed to import ${result.failedCount} users.`}
            </p>

            {result.errors?.length > 0 && (
              <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '2rem' }}>
                <h4 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Error Log</h4>
                <ul style={{ fontSize: '0.85rem', color: '#cbd5e1', maxHeight: '150px', overflowY: 'auto' }}>
                  {result.errors.map((e: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>{e.email}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button className="btn btn-secondary" onClick={() => {
                setFile(null); setParsedRows([]); setPreview(null); setResult(null);
                // reset input
                const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (input) input.value = '';
              }}>
                Import Another File
              </button>
              <button className="btn btn-primary" onClick={() => router.push('/leaderboard')}>
                View Leaderboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
