'use client';

import { useState } from 'react';

interface Node {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'locked';
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
}

interface CourseFlowchartProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (id: string) => void;
}

export function CourseFlowchart({ nodes, edges, onNodeClick }: CourseFlowchartProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--color-success)';
      case 'current': return 'var(--brand-primary)';
      default: return 'var(--color-surface-3)';
    }
  };

  const getStatusStroke = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--color-success)';
      case 'current': return 'var(--accent-3)';
      default: return 'var(--color-border)';
    }
  };

  return (
    <div style={{ width: '100%', height: '300px', background: 'var(--color-surface-2)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
        {/* Draw Edges */}
        {edges.map((edge, i) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const isCompletedPath = fromNode.status === 'completed' && (toNode.status === 'completed' || toNode.status === 'current');

          return (
            <line
              key={`edge-${i}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={isCompletedPath ? 'var(--color-success)' : 'var(--color-border)'}
              strokeWidth="2"
              strokeDasharray={isCompletedPath ? '0' : '4 4'}
            />
          );
        })}

        {/* Draw Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const isLocked = node.status === 'locked';

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => !isLocked && onNodeClick(node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: isLocked ? 'not-allowed' : 'pointer', transition: 'transform 0.2s ease' }}
            >
              <circle
                r={isHovered && !isLocked ? 24 : 20}
                fill={getStatusColor(node.status)}
                stroke={getStatusStroke(node.status)}
                strokeWidth="3"
                style={{ transition: 'all 0.2s ease' }}
              />
              {node.status === 'completed' && (
                <path d="M-6 0 l4 4 l8 -8" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {node.status === 'locked' && (
                <rect x="-5" y="-5" width="10" height="10" rx="2" fill="var(--text-muted)" />
              )}
              {node.status === 'current' && (
                <circle r="6" fill="#fff" />
              )}
              <text
                y="36"
                textAnchor="middle"
                fill={node.status === 'locked' ? 'var(--text-muted)' : 'var(--text-primary)'}
                fontSize="12"
                fontWeight={node.status === 'current' ? '700' : '500'}
                style={{ userSelect: 'none' }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
