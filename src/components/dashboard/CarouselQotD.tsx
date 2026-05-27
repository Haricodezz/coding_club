'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Tag, Play } from 'lucide-react';
import type { Question } from '@/types';

interface CarouselQotDProps {
  questions: (Question & { isSolved?: boolean, dateLabel?: string })[];
}

export function CarouselQotD({ questions }: CarouselQotDProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  if (!questions || questions.length === 0) {
    return (
      <div className="card text-center" style={{ padding: '3rem 1rem' }}>
        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
        <p style={{ color: '#64748b' }}>No daily challenges available right now.</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  
  const next = () => setCurrentIndex((i) => (i + 1) % questions.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + questions.length) % questions.length);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Carousel Controls */}
      <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
        <h3 className="flex items-center gap-2">
          <span>💡</span> Daily Challenges
        </h3>
        {questions.length > 1 && (
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-sm" onClick={prev} style={{ padding: '0.2rem' }}><ChevronLeft size={18} /></button>
            <button className="btn btn-ghost btn-sm" onClick={next} style={{ padding: '0.2rem' }}><ChevronRight size={18} /></button>
          </div>
        )}
      </div>

      <div className="flex-col gap-3 animate-fade-in" key={currentQ.id}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
            {currentQ.dateLabel || 'Today\'s Pick'}
          </span>
          <div className="flex gap-2">
            {currentQ.isSolved && (
              <span className="badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(34,211,160,0.3)' }}>
                ✓ Solved
              </span>
            )}
            <span className={`badge badge-${currentQ.difficulty.toLowerCase()}`}>
              {currentQ.difficulty}
            </span>
          </div>
        </div>

        <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>
          {currentQ.title}
        </h4>
        
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
          {currentQ.description}
        </p>

        {/* Metadata Row */}
        <div className="flex gap-4 items-center" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div className="flex gap-1 items-center">
            <Clock size={14} />
            <span>Est: {currentQ.difficulty === 'Easy' ? '15m' : currentQ.difficulty === 'Medium' ? '30m' : '45m'}</span>
          </div>
          <div className="flex gap-1 items-center">
            <Tag size={14} />
            <span>{currentQ.tags?.[0] || 'Algorithms'}</span>
          </div>
        </div>

        <div className="flex gap-3" style={{ marginTop: '0.5rem' }}>
          <Link 
            href={currentQ.dateLabel === 'Today' ? '/qotd' : `/practice/${currentQ.slug}`} 
            className="btn btn-primary" 
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setIsTimerRunning(true)}
          >
            <Play size={16} /> {currentQ.isSolved ? 'Review Solution' : 'Start Solving'}
          </Link>
          
          {!currentQ.isSolved && (
            <button 
              className="btn btn-secondary" 
              onClick={() => alert('Reminder set for later!')}
              style={{ padding: '0 1rem' }}
              title="Remind me later"
            >
              <Clock size={16} />
            </button>
          )}
        </div>

        {isTimerRunning && !currentQ.isSolved && (
          <div className="text-center animate-pulse-ring" style={{ fontSize: '0.8rem', color: 'var(--accent-3)', marginTop: '0.5rem' }}>
            ⏱️ Timer running: {formatTime(timer)}
          </div>
        )}
      </div>
    </div>
  );
}
