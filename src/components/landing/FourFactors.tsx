'use client';

import { useRef, useEffect, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

const FACTORS = [
  { label: 'Employment Gap', pct: 35, effectSize: '-1.15' },
  { label: 'Skill Phrasing', pct: 30, effectSize: '-0.48' },
  { label: 'Structure', pct: 20, effectSize: '-0.32' },
  { label: 'Degree Origin', pct: 15, effectSize: '-0.20' },
];

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

function FactorCard({
  label,
  pct,
  effectSize,
  trigger,
}: {
  label: string;
  pct: number;
  effectSize: string;
  trigger: boolean;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const fired = useRef(false);

  useEffect(() => {
    if (!trigger || fired.current) return;
    fired.current = true;
    if (reduced) {
      setDisplay(pct);
      return;
    }
    const duration = 900;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(easeOutQuart(progress) * pct));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, pct, reduced]);

  const fillPct = reduced ? pct : display;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-soft)',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '28px 24px 22px', flex: 1 }}>
        <div
          className="font-mono"
          style={{
            fontSize: 'clamp(44px, 5.5vw, 68px)',
            fontWeight: 700,
            lineHeight: 1,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
          }}
        >
          {display}%
        </div>
        <div
          className="font-serif"
          style={{
            fontSize: '16px',
            fontWeight: 400,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
            marginBottom: '8px',
          }}
        >
          {label}
        </div>
        <div
          className="font-mono"
          style={{ fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.03em' }}
        >
          effect size: {effectSize} · ABQE 2025
        </div>
      </div>

      {/* Synchronized fill bar */}
      <div style={{ height: '3px', backgroundColor: 'var(--bg-input)' }}>
        <div
          style={{
            height: '100%',
            width: `${fillPct}%`,
            backgroundColor: 'var(--accent)',
          }}
        />
      </div>
    </div>
  );
}

export default function FourFactors() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px' });

  return (
    <section ref={ref} style={{ padding: '80px 28px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <h2
          className="font-serif"
          style={{
            fontSize: 'clamp(18px, 2.2vw, 26px)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            marginBottom: '40px',
            margin: '0 0 40px 0',
          }}
        >
          The four factors. Empirically weighted.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FACTORS.map((f) => (
            <FactorCard key={f.label} {...f} trigger={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
