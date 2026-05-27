'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LANGUAGES, STARTER_CODE } from '@/lib/piston';
import type { ExecutionResult } from '@/types';
import { PanelGroup, Panel } from 'react-resizable-panels';
import PanelDivider from '@/components/workspace/PanelDivider';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 500, background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  ),
});

export default function IDEPage() {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(STARTER_CODE['python']);
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showStdin, setShowStdin] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  function handleLanguageChange(lang: string) {
    setLanguage(lang);
    setCode(STARTER_CODE[lang] || '');
    setResult(null);
  }

  async function handleRun() {
    if (!code.trim()) return;
    setRunning(true);
    setResult(null);

    const res = await fetch('/api/compiler/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, stdin }),
    });
    const data: ExecutionResult = await res.json();
    setResult(data);
    setRunning(false);
  }

  function handleClear() {
    setCode(STARTER_CODE[language] || '');
    setResult(null);
    setStdin('');
  }

  const resultStatus = result ? (result.success ? 'success' : 'error') : 'idle';

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div className="page-header animate-fade-in">
          <p className="eyebrow">⚡ Online IDE</p>
          <h1><span className="gradient-text">Code Editor</span></h1>
          <p>Write and execute code in 6 languages. Results appear instantly below.</p>
        </div>

        {/* Toolbar */}
        <div
          className="glass"
          style={{ padding: '0.875rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
        >
          {/* Language selector */}
          <div className="flex items-center gap-2">
            <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Language</span>
            <div className="filter-tabs">
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  className={`filter-tab ${language === l.id ? 'active' : ''}`}
                  onClick={() => handleLanguageChange(l.id)}
                >
                  {l.displayName}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? '↙️ Exit Fullscreen' : '⛶ Fullscreen'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowStdin(!showStdin)}
            >
              {showStdin ? 'Hide' : 'Show'} Input
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleClear}>Reset</button>
            <button
              className="btn btn-primary"
              onClick={handleRun}
              disabled={running}
              style={{ minWidth: 100 }}
            >
              {running ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Running...
                </span>
              ) : '▶ Run Code'}
            </button>
          </div>
        </div>

          {/* Editor + Output layout */}
          <div 
            style={isFullscreen ? {
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              zIndex: 9999, background: 'var(--color-bg)', padding: '1.5rem',
              display: 'flex', gap: '1.5rem',
              overflow: 'hidden'
            } : {
              display: 'flex', gap: '1rem', height: '600px',
            }}
          >
            {isFullscreen && (
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10000 }}
                onClick={() => setIsFullscreen(false)}
              >
                ✕ Exit Fullscreen
              </button>
            )}

            <PanelGroup direction="horizontal" autoSaveId="practice-workspace-layout-v1">
              {/* Editor */}
              <Panel defaultSize={60} minSize={30} className="editor-container animate-slide-in" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="editor-toolbar">
                  <div className="editor-toolbar-dots">
                    <div className="editor-toolbar-dot red" />
                    <div className="editor-toolbar-dot yellow" />
                    <div className="editor-toolbar-dot green" />
                  </div>
                  <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    {LANGUAGES.find(l => l.id === language)?.displayName || language}
                  </span>
                  <span style={{ marginLeft: 'auto', color: '#475569', fontSize: '0.72rem' }}>
                    Powered by Judge0 API
                  </span>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MonacoEditor
                    height="100%"
                    language={LANGUAGES.find(l => l.id === language)?.monacoLanguage || language}
                    value={code}
                    onChange={v => setCode(v || '')}
                    theme="vs-dark"
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      padding: { top: 16, bottom: 16 },
                      fontFamily: 'JetBrains Mono, Fira Code, monospace',
                      fontLigatures: true,
                      automaticLayout: true,
                      lineNumbers: 'on',
                      roundedSelection: true,
                      cursorBlinking: 'smooth',
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </Panel>

              <PanelDivider direction="horizontal" />

              {/* Right panel: stdin + output */}
              <Panel defaultSize={40} minSize={25} className="flex-col gap-3" style={{ height: "100%", overflowY: 'auto', paddingTop: isFullscreen ? '2.5rem' : 0 }}>
            {/* Stdin */}
            {showStdin && (
              <div className="animate-slide-in">
                <div className="form-group">
                  <label className="form-label">📥 Standard Input (stdin)</label>
                  <textarea
                    className="form-textarea font-mono"
                    value={stdin}
                    onChange={e => setStdin(e.target.value)}
                    placeholder="Enter input here..."
                    style={{ minHeight: 120, fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}

            {/* Output */}
            <div className="flex-col gap-2" style={{ flex: 1 }}>
              <div className={`result-panel ${resultStatus}`} style={{ flex: 1 }}>
                <div className="result-panel-header">
                  {resultStatus === 'idle' && '⬛ Output'}
                  {resultStatus === 'success' && '✅ Output'}
                  {resultStatus === 'error' && '❌ Error'}
                </div>
                <div className="result-panel-body" style={{ minHeight: isFullscreen ? 200 : (showStdin ? 200 : 340), flex: 1 }}>
                  {!result && !running && (
                    <span style={{ color: '#475569' }}>Run your code to see output here...</span>
                  )}
                  {running && (
                    <span className="flex items-center gap-2" style={{ color: '#64748b' }}>
                      <span className="spinner" style={{ width: 16, height: 16 }} />
                      Executing...
                    </span>
                  )}
                  {result?.success && (result.output || '(no output)')}
                  {result && !result.success && (
                    <span style={{ color: 'var(--color-error)' }}>
                      {result.error}: {result.message}
                      {result.compile_output && `\n\n${result.compile_output}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              {result?.success && (
                <div className="glass" style={{ padding: '0.75rem 1rem' }}>
                  <div className="flex gap-4 text-sm">
                    {result.time !== undefined && (
                      <div>
                        <span style={{ color: '#64748b' }}>Time: </span>
                        <span style={{ color: 'var(--accent-3)', fontWeight: 600 }}>{result.time}s</span>
                      </div>
                    )}
                    {result.memory !== undefined && (
                      <div>
                        <span style={{ color: '#64748b' }}>Memory: </span>
                        <span style={{ color: 'var(--accent-3)', fontWeight: 600 }}>{result.memory}KB</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Language info */}
              <div className="card" style={{ padding: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>⌨️ Supported Languages</h4>
                <div className="flex-col gap-2">
                  {LANGUAGES.map(l => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between"
                      style={{
                        padding: '0.4rem 0.625rem',
                        borderRadius: 'var(--radius)',
                        background: language === l.id ? 'rgba(108,99,255,0.15)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                      onClick={() => handleLanguageChange(l.id)}
                    >
                      <span style={{ fontSize: '0.85rem', color: language === l.id ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                        {l.displayName}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>v{l.version}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  </div>
  );
}
