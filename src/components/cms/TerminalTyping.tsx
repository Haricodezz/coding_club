'use client';

import { useEffect, useState, useRef } from 'react';

const COMMANDS = [
  { prompt: '~', cmd: 'cd bpmce-coding-club', delay: 60 },
  { prompt: '~/bpmce-coding-club', cmd: 'npm start', delay: 60 },
  { prompt: '', cmd: '▶  Starting BPMCE Coding Club environment...', color: '#22d3a0', delay: 30 },
  { prompt: '', cmd: '✓  Ready to code! 🚀', color: '#22d3a0', delay: 30 },
  { prompt: '~/bpmce-coding-club', cmd: 'echo "Welcome!"', delay: 55 },
  { prompt: '', cmd: 'Welcome to BPMCE Coding Club!', color: '#fbbf24', delay: 30 },
];

interface Line {
  text: string;
  color?: string;
  done: boolean;
}

export function TerminalTyping({ customCode }: { customCode?: string }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let activeCommands = COMMANDS;
    if (customCode && customCode.trim()) {
      activeCommands = customCode.split('\n').map(line => {
        const t = line.trim();
        if (t.startsWith('$')) return { prompt: '~', cmd: t.replace(/^\$\s*/, ''), delay: 60 };
        if (t.startsWith('✓') || t.startsWith('▶') || t.startsWith('>')) return { prompt: '', cmd: line, color: '#22d3a0', delay: 30 };
        if (t.startsWith('#')) return { prompt: '', cmd: line, color: '#fbbf24', delay: 30 };
        return { prompt: '', cmd: line, delay: 40 };
      });
    }

    if (currentLine >= activeCommands.length) {
      // Restart loop after pause
      const t = setTimeout(() => {
        setLines([]);
        setCurrentLine(0);
        setCurrentChar(0);
      }, 3000);
      return () => clearTimeout(t);
    }

    const entry = activeCommands[currentLine];
    const fullText = entry.prompt ? `${entry.prompt} $ ${entry.cmd}` : entry.cmd;

    if (currentChar < fullText.length) {
      const t = setTimeout(() => {
        setLines((prev) => {
          const next = [...prev];
          const existing = next[currentLine];
          if (existing) {
            next[currentLine] = { ...existing, text: fullText.slice(0, currentChar + 1) };
          } else {
            next[currentLine] = { text: fullText.slice(0, currentChar + 1), color: entry.color, done: false };
          }
          return next;
        });
        setCurrentChar((c) => c + 1);
      }, entry.delay);
      return () => clearTimeout(t);
    } else {
      // Line complete
      setLines((prev) => {
        const next = [...prev];
        if (next[currentLine]) next[currentLine] = { ...next[currentLine], done: true };
        return next;
      });
      const t = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 180);
      return () => clearTimeout(t);
    }
  }, [currentLine, currentChar]);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: 'var(--font-code)',
        fontSize: '0.75rem',
        lineHeight: 1.7,
        color: '#c8d3f5',
        padding: '0.75rem',
        overflowY: 'hidden',
        maxHeight: '100%',
        userSelect: 'none',
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ color: line.color || '#c8d3f5', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {line.text}
          {/* Blinking cursor on the active line */}
          {i === currentLine && !line.done && (
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '12px',
                background: '#6c63ff',
                marginLeft: '2px',
                verticalAlign: 'middle',
                animation: 'blink 0.8s step-end infinite',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
