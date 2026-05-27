import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`} 
      style={{
        borderRadius: 'var(--radius)',
        ...style
      }}
    />
  );
}

export function SkeletonText({ lines = 1, className = '', lastLineWidth = '60%' }) {
  return (
    <div className={`flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          style={{ 
            height: '1rem', 
            width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%' 
          }} 
        />
      ))}
    </div>
  );
}
