'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ text }: { text?: string | null }) {
  if (!text) return null;

  return (
    <div className="markdown-body" style={{ lineHeight: 1.75, fontSize: '0.9rem', color: '#cbd5e1' }}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 style={{fontSize: '1.5rem', fontWeight: 700, margin: '1.5rem 0 1rem', color: 'var(--text-primary)'}} {...props}/>,
          h2: ({node, ...props}) => <h2 style={{fontSize: '1.25rem', fontWeight: 700, margin: '1.5rem 0 0.8rem', color: 'var(--text-primary)'}} {...props}/>,
          h3: ({node, ...props}) => <h3 style={{fontSize: '1.1rem', fontWeight: 700, margin: '1.2rem 0 0.5rem', color: 'var(--text-primary)'}} {...props}/>,
          p: ({node, ...props}) => <p style={{margin: '0 0 1rem 0'}} {...props}/>,
          a: ({node, ...props}) => <a style={{color: 'var(--accent-1)', textDecoration: 'none'}} {...props}/>,
          ul: ({node, ...props}) => <ul style={{margin: '0 0 1rem 1.5rem', padding: 0}} {...props}/>,
          ol: ({node, ...props}) => <ol style={{margin: '0 0 1rem 1.5rem', padding: 0}} {...props}/>,
          li: ({node, ...props}) => <li style={{margin: '0.25rem 0'}} {...props}/>,
          pre: ({node, ...props}) => (
            <pre style={{
              background: 'rgba(255,255,255,0.04)',
              padding: '1rem',
              borderRadius: '8px',
              overflowX: 'auto',
              margin: '1rem 0',
              border: '1px solid var(--color-border)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }} {...props}/>
          ),
          code: ({node, className, children, ...props}: any) => {
            // Block code usually has a language- class if specified, but if not, 
            // react-markdown wraps it in a pre anyway.
            // If it contains newlines, it's likely a block code (even without language).
            const isBlock = className?.includes('language-') || (typeof children === 'string' && children.includes('\n'));
            
            if (isBlock) {
              return <code className={className} {...props}>{children}</code>;
            }

            return (
              <code style={{
                background: 'rgba(255,255,255,0.08)',
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.85em',
                color: 'var(--accent-1)'
              }} {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({node, ...props}) => (
            <blockquote style={{
              margin: '1rem 0',
              padding: '0.5rem 1rem',
              borderLeft: '4px solid var(--accent-1)',
              background: 'rgba(108,99,255,0.05)',
              color: 'var(--text-secondary)',
              borderRadius: '0 4px 4px 0'
            }} {...props}/>
          ),
          table: ({node, ...props}) => (
            <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }} {...props}/>
            </div>
          ),
          th: ({node, ...props}) => <th style={{ borderBottom: '2px solid var(--color-border)', padding: '0.5rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }} {...props}/>,
          td: ({node, ...props}) => <td style={{ borderBottom: '1px solid var(--color-border)', padding: '0.5rem' }} {...props}/>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
