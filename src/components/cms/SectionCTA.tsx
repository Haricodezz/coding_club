'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface SectionCTAProps {
  title?: string;
  subtitle?: string;
  data: {
    btn_text?: string;
    btn_link?: string;
  };
}

export function SectionCTA({ title, subtitle, data }: SectionCTAProps) {
  return (
    <section style={{ padding: '4rem 0 6rem', textAlign: 'center' }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass"
          style={{
            padding: '4rem 2rem',
            maxWidth: '700px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(236,72,153,0.03) 100%)',
            border: '1px solid rgba(108, 99, 255, 0.25)',
            boxShadow: '0 15px 45px rgba(108, 99, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle decoration inside */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120%',
              height: '120%',
              background: 'radial-gradient(circle, rgba(108,99,255,0.05) 0%, transparent 60%)',
              pointerEvents: 'none'
            }}
          />

          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            {title || 'Ready to Start Coding?'}
          </h2>
          <p style={{ marginBottom: '2.5rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 2.5rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
            {subtitle || "Join today to access daily challenges, run code in our IDE, and sync with HackerRank contests."}
          </p>
          
          {data.btn_text && (
            <Link href={data.btn_link || '/login'} className="btn btn-primary btn-lg" style={{ boxShadow: '0 0 20px rgba(108,99,255,0.3)' }}>
              {data.btn_text}
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}
