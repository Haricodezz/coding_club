'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

type ToolbarButtonProps = {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: '0.3rem 0.5rem',
        borderRadius: '5px',
        border: 'none',
        background: active ? 'rgba(108,99,255,0.2)' : 'transparent',
        color: active ? 'var(--accent-3)' : 'var(--text-muted)',
        fontSize: '0.82rem',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        minWidth: '28px',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 0.25rem' }} />;
}

export default function TiptapEditor({ content, onChange, placeholder = 'Start writing...', readOnly = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      CodeBlock,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: [
          'min-height: 320px',
          'padding: 1.25rem',
          'outline: none',
          'color: var(--text-secondary)',
          'font-size: 0.95rem',
          'line-height: 1.75',
          'font-family: var(--font-ui)',
        ].join('; '),
      },
    },
  });

  // Sync content when prop changes (e.g., loading a draft)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) return null;

  if (readOnly) {
    return (
      <div className="tiptap-output">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-surface)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.15rem', flexWrap: 'wrap',
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface-2)',
      }}>
        {/* Text formatting */}
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">&ldquo;&rdquo;</ToolbarButton>

        <Divider />

        {/* Code */}
        <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">`code`</ToolbarButton>
        <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">```</ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">≡L</ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">≡C</ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">≡R</ToolbarButton>

        <Divider />

        {/* History */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" active={false}>↩</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" active={false}>↪</ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-tertiary);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 { font-size: 1.8rem; margin: 1.25rem 0 0.75rem; color: var(--text-primary); }
        .ProseMirror h2 { font-size: 1.4rem; margin: 1rem 0 0.5rem; color: var(--text-secondary); }
        .ProseMirror h3 { font-size: 1.15rem; margin: 0.75rem 0 0.4rem; color: var(--text-secondary); }
        .ProseMirror p { margin-bottom: 0.75rem; color: var(--text-muted); }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin-bottom: 0.75rem; color: var(--text-muted); }
        .ProseMirror li { margin-bottom: 0.25rem; }
        .ProseMirror blockquote {
          border-left: 3px solid var(--accent);
          margin: 0.75rem 0; padding: 0.5rem 1rem;
          background: rgba(108,99,255,0.05);
          border-radius: 0 8px 8px 0;
          color: var(--text-muted);
          font-style: italic;
        }
        .ProseMirror code {
          background: rgba(108,99,255,0.1);
          border: 1px solid rgba(108,99,255,0.2);
          border-radius: 4px;
          padding: 0.15rem 0.35rem;
          font-family: var(--font-code);
          font-size: 0.85em;
          color: var(--accent-3);
        }
        .ProseMirror pre {
          background: var(--color-bg-3);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 1rem;
          margin: 0.75rem 0;
          overflow-x: auto;
        }
        .ProseMirror pre code {
          background: none; border: none; padding: 0;
          color: var(--text-muted);
        }
        .tiptap-output h1 { font-size: 1.8rem; margin: 1.25rem 0 0.75rem; color: var(--text-primary); }
        .tiptap-output h2 { font-size: 1.4rem; margin: 1rem 0 0.5rem; color: var(--text-secondary); }
        .tiptap-output h3 { font-size: 1.15rem; margin: 0.75rem 0 0.4rem; color: var(--text-secondary); }
        .tiptap-output p { margin-bottom: 0.75rem; color: var(--text-muted); line-height: 1.75; }
        .tiptap-output ul, .tiptap-output ol { padding-left: 1.5rem; margin-bottom: 0.75rem; color: var(--text-muted); }
        .tiptap-output blockquote {
          border-left: 3px solid var(--accent);
          margin: 0.75rem 0; padding: 0.5rem 1rem;
          background: rgba(108,99,255,0.05);
          border-radius: 0 8px 8px 0;
          color: var(--text-muted);
          font-style: italic;
        }
        .tiptap-output code {
          background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.2);
          border-radius: 4px; padding: 0.15rem 0.35rem;
          font-family: var(--font-code); font-size: 0.85em; color: var(--accent-3);
        }
        .tiptap-output pre {
          background: var(--color-bg-3); border: 1px solid var(--color-border);
          border-radius: 8px; padding: 1rem; margin: 0.75rem 0; overflow-x: auto;
        }
        .tiptap-output pre code { background: none; border: none; padding: 0; color: var(--text-muted); }
      `}</style>
    </div>
  );
}
