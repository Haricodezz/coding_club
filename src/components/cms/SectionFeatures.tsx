'use client';

import { GlassCard } from '../ui/GlassCard';

interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
}

interface SectionFeaturesProps {
  title?: string;
  subtitle?: string;
  cards?: FeatureCard[];
}

export function SectionFeatures({ title, subtitle, cards = [] }: SectionFeaturesProps) {
  return (
    <section style={{ padding: '6rem 0' }}>
      <div className="container">
        
        {/* Header */}
        <div className="text-center" style={{ marginBottom: '4rem' }}>
          {subtitle && (
            <p 
              className="eyebrow" 
              style={{ 
                color: 'var(--accent-3)', 
                fontWeight: 600, 
                letterSpacing: '2px', 
                textTransform: 'uppercase', 
                fontSize: '0.8rem', 
                marginBottom: '0.5rem' 
              }}
            >
              {subtitle}
            </p>
          )}
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {title || 'Built for Competitive Programmers'}
          </h2>
        </div>

        {/* Grid */}
        <div className="grid-3" style={{ gap: '1.5rem' }}>
          {cards.map((card, idx) => (
            <GlassCard 
              key={card.title || idx} 
              delay={idx * 100}
              style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left'
              }}
            >
              <div 
                style={{ 
                  fontSize: '2rem', 
                  marginBottom: '1.25rem',
                  width: '50px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(108, 99, 255, 0.1)',
                  borderRadius: '10px',
                  border: '1px solid rgba(108, 99, 255, 0.2)'
                }}
              >
                {card.icon}
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                {card.title}
              </h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {card.desc}
              </p>
            </GlassCard>
          ))}
        </div>

      </div>
    </section>
  );
}
