import { PanelResizeHandle } from 'react-resizable-panels';

interface PanelDividerProps {
  direction?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

export default function PanelDivider({ direction = 'horizontal', className = '', style = {} }: PanelDividerProps) {
  const isHorizontal = direction === 'horizontal';

  return (
    <PanelResizeHandle
      className={`panel-resize-handle ${direction} ${className}`}
      style={{
        ...style,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-border)',
        transition: 'background 0.2s',
        [isHorizontal ? 'width' : 'height']: '4px',
        cursor: isHorizontal ? 'col-resize' : 'row-resize',
        zIndex: 10,
      }}
    >
      <div 
        className="resize-grip"
        style={{
          width: isHorizontal ? '2px' : '20px',
          height: isHorizontal ? '20px' : '2px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '4px',
          transition: 'background 0.2s, transform 0.2s',
        }}
      />

      <style>{`
        .panel-resize-handle:hover {
          background: rgba(108, 99, 255, 0.4) !important;
        }
        .panel-resize-handle:hover .resize-grip {
          background: rgba(255,255,255,0.6) !important;
          transform: scale(1.5);
        }
        .panel-resize-handle[data-resize-handle-active] {
          background: var(--accent-1) !important;
        }
        .panel-resize-handle[data-resize-handle-active] .resize-grip {
          background: #fff !important;
          transform: scale(1.5);
        }
      `}</style>
    </PanelResizeHandle>
  );
}
