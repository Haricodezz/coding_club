'use client';

import { motion } from 'framer-motion';

interface StatItem {
  value: string;
  label: string;
}

interface SectionStatsProps {
  items?: StatItem[];
  title?: string;
  subtitle?: string;
}

export function SectionStats({ items = [], title, subtitle }: SectionStatsProps) {
  return (
    <section style={{ padding: '4rem 0' }}>
      <div className="container">
        {title && (
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            {subtitle && <p className="eyebrow" style={{ color: 'var(--accent-3)' }}>{subtitle}</p>}
            <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>{title}</h2>
          </div>
        )}
        <div className="grid-4" style={{ gap: '1.5rem' }}>
          {items.map((stat, idx) => (
            <motion.div
              key={stat.label || idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="stat-box glass"
              style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div 
                style={{ 
                  fontSize: '3rem', 
                  fontWeight: 850, 
                  color: 'var(--text-primary)', 
                  marginBottom: '0.5rem',
                  background: 'var(--accent-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(108,99,255,0.2)'
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
