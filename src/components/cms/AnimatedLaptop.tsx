'use client';

import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useRef, useCallback } from 'react';
import { TerminalTyping } from './TerminalTyping';

// ------------------------------------------------------------------
// AnimatedLaptop
// A pure CSS + SVG laptop that opens its lid with a 3-D perspective
// tilt on mouse hover. The screen shows the TerminalTyping component.
// ------------------------------------------------------------------

const SPRING = { stiffness: 80, damping: 18 };

export function AnimatedLaptop({ terminalCode }: { terminalCode?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse-tracking motion values for 3-D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), SPRING);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), SPRING);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [mouseX, mouseY]
  );

  const onMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        perspective: 900,
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
        cursor: 'default',
      }}
    >
      {/* Outer 3-D tilt wrapper */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ---- LAPTOP BASE ---- */}
        <div style={{ position: 'relative' }}>
          {/* Glow under the laptop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.8, delay: 0.6 }}
            style={{
              position: 'absolute',
              bottom: -30,
              left: '10%',
              width: '80%',
              height: 60,
              background: 'radial-gradient(ellipse, rgba(108,99,255,0.45) 0%, transparent 75%)',
              filter: 'blur(20px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* Laptop chassis */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              background: 'linear-gradient(160deg, #1c1c2e 0%, #13131f 100%)',
              borderRadius: '12px 12px 4px 4px',
              border: '1.5px solid rgba(108,99,255,0.25)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
              padding: '12px 12px 0',
              paddingBottom: 0,
            }}
          >
            {/* ---- LID (opens) ---- */}
            <motion.div
              initial={{ rotateX: -90 }}
              animate={{ rotateX: 0 }}
              transition={{ duration: 1.2, delay: 0.8, ease: [0.4, 0, 0.2, 1] }}
              style={{
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                position: 'relative',
              }}
            >
              {/* Lid shell (back) */}
              <div
                style={{
                  background: 'linear-gradient(160deg, #1e1e30 0%, #12121c 100%)',
                  borderRadius: '10px 10px 0 0',
                  border: '1.5px solid rgba(108,99,255,0.2)',
                  padding: '3px',
                  paddingBottom: 0,
                  boxShadow: '0 -4px 20px rgba(108,99,255,0.1)',
                }}
              >
                {/* Screen bezel */}
                <div
                  style={{
                    background: '#090912',
                    borderRadius: '8px 8px 0 0',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Screen power-on glow */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 2.0 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(ellipse at 50% 40%, rgba(108,99,255,0.12) 0%, transparent 70%)',
                      pointerEvents: 'none',
                      zIndex: 10,
                    }}
                  />

                  {/* Taskbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'rgba(15,15,26,0.95)',
                      borderBottom: '1px solid rgba(108,99,255,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 5 }}>
                      {['#ef4444', '#eab308', '#22c55e'].map((c) => (
                        <span
                          key={c}
                          style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'block' }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        fontSize: '0.6rem',
                        color: '#475569',
                        fontFamily: 'var(--font-code)',
                      }}
                    >
                      coding-club — zsh
                    </span>
                    <div style={{ width: 32 }} />
                  </div>

                  {/* Terminal content area */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 2.1 }}
                    style={{ height: 200 }}
                  >
                    <TerminalTyping customCode={terminalCode} />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* ---- KEYBOARD BASE ---- */}
            <div
              style={{
                height: 14,
                background: 'linear-gradient(180deg, #1a1a2e, #0f0f1a)',
                borderRadius: '0 0 8px 8px',
                border: '1px solid rgba(108,99,255,0.1)',
                borderTop: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Keyboard grid lines hint */}
              <div
                style={{
                  width: '80%',
                  height: 3,
                  background:
                    'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 12px)',
                  borderRadius: 2,
                }}
              />
            </div>
          </div>

          {/* Trackpad base platform */}
          <div
            style={{
              height: 12,
              background: 'linear-gradient(180deg, #111120 0%, #0a0a14 100%)',
              borderRadius: '0 0 12px 12px',
              border: '1.5px solid rgba(108,99,255,0.12)',
              borderTop: 'none',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
