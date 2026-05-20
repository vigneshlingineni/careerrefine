'use client';

import { useRef, useEffect } from 'react';
import { motion, useAnimation, useInView, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function ClosingCTA() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px' });
  const scanControls = useAnimation();
  const scanFired = useRef(false);

  useEffect(() => {
    if (!inView || reduced || scanFired.current) return;
    scanFired.current = true;
    scanControls
      .start({ scaleX: 1, transition: { duration: 0.6, ease: EASE } })
      .then(() => {
        scanControls.start({ opacity: 0, transition: { duration: 0.3 } });
      });
  }, [inView, reduced, scanControls]);

  return (
    <section
      ref={ref}
      style={{ padding: '96px 28px', textAlign: 'center' }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2
          className="font-serif"
          style={{
            fontSize: 'clamp(24px, 3.5vw, 40px)',
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            color: 'var(--text)',
            marginBottom: '20px',
          }}
        >
          Stop guessing why you&rsquo;re getting{' '}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <em style={{ fontStyle: 'italic' }}>filtered</em>
            {!reduced && (
              <motion.span
                initial={{ scaleX: 0, opacity: 1 }}
                animate={scanControls}
                style={{
                  position: 'absolute',
                  bottom: '1px',
                  left: 0,
                  right: 0,
                  height: '1px',
                  backgroundColor: 'var(--accent)',
                  transformOrigin: 'left center',
                  display: 'block',
                }}
              />
            )}
          </span>
          {'.'}
        </h2>

        <p
          className="font-mono"
          style={{
            fontSize: '13px',
            color: 'var(--muted)',
            marginBottom: '36px',
            lineHeight: 1.6,
          }}
        >
          Run a scan. Takes 20 seconds.
        </p>

        <Link
          href="/analyze"
          className="font-mono"
          style={{
            display: 'inline-block',
            backgroundColor: 'var(--accent)',
            color: '#000',
            fontSize: '13px',
            fontWeight: 700,
            padding: '14px 28px',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '0.02em',
            transition: 'transform 150ms, box-shadow 150ms',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = 'translateY(-2px)';
            el.style.boxShadow = '0 4px 20px rgba(212,255,63,0.25)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = '';
            el.style.boxShadow = '';
          }}
        >
          Scan my resume — free →
        </Link>
      </div>
    </section>
  );
}
