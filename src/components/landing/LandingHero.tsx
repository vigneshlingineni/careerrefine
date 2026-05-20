'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SCORES = [72, 58, 81, 67];

interface FactorValues {
  eg: number;
  sp: number;
  st: number;
  do_: number;
}

const FACTOR_DATA: FactorValues[] = [
  { eg: 68, sp: 75, st: 70, do_: 80 },
  { eg: 42, sp: 65, st: 58, do_: 72 },
  { eg: 85, sp: 78, st: 82, do_: 79 },
  { eg: 60, sp: 72, st: 72, do_: 62 },
];

const FINDINGS = [
  "Skills lists 'Azure Data Factory' — no bullet demonstrates it",
  'Unexplained 7-month gap between roles',
  "Bullets use passive verbs: 'worked on', 'helped with'",
];

const FACTOR_ROWS: { key: keyof FactorValues; label: string }[] = [
  { key: 'eg', label: 'EMPLOYMENT GAP' },
  { key: 'sp', label: 'SKILL PHRASING' },
  { key: 'st', label: 'STRUCTURE' },
  { key: 'do_', label: 'DEGREE ORIGIN' },
];

function scoreColor(s: number): string {
  if (s >= 80) return 'var(--accent)';
  if (s >= 50) return 'var(--warn)';
  return 'var(--danger)';
}

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (reduced) {
      setDisplayed(text);
      return;
    }
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, reduced]);

  return <>{displayed}</>;
}

export default function LandingHero() {
  const reduced = useReducedMotion();
  const scanControls = useAnimation();
  const scanFired = useRef(false);
  const idxRef = useRef(0);
  const jitterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [displayScore, setDisplayScore] = useState<number>(SCORES[0]);
  const [factors, setFactors] = useState<FactorValues>(FACTOR_DATA[0]);
  const [findingIdx, setFindingIdx] = useState(0);
  const [findingKey, setFindingKey] = useState(0);

  // Underline scan on "research" — fires once on mount
  useEffect(() => {
    if (reduced || scanFired.current) return;
    scanFired.current = true;
    const t = setTimeout(() => {
      scanControls
        .start({ scaleX: 1, transition: { duration: 0.6, ease: EASE } })
        .then(() => {
          scanControls.start({ opacity: 0, transition: { duration: 0.3 } });
        });
    }, 500);
    return () => clearTimeout(t);
  }, [reduced, scanControls]);

  // Score cycling (indefinite, every 4s)
  useEffect(() => {
    if (reduced) return;
    const cycleId = setInterval(() => {
      const next = (idxRef.current + 1) % SCORES.length;
      idxRef.current = next;
      const nextFindingIdx = next % FINDINGS.length;

      if (jitterRef.current) clearInterval(jitterRef.current);
      let count = 0;
      jitterRef.current = setInterval(() => {
        setDisplayScore(Math.floor(Math.random() * 55) + 25);
        count++;
        if (count >= 12) {
          clearInterval(jitterRef.current!);
          jitterRef.current = null;
          setDisplayScore(SCORES[next]);
          setFactors(FACTOR_DATA[next]);
          setFindingIdx(nextFindingIdx);
          setFindingKey((k) => k + 1);
        }
      }, 50);
    }, 4000);

    return () => {
      clearInterval(cycleId);
      if (jitterRef.current) clearInterval(jitterRef.current);
    };
  }, [reduced]);

  const currentScore = displayScore;
  const currentFactors = reduced ? FACTOR_DATA[0] : factors;
  const currentFindingIdx = reduced ? 0 : findingIdx;
  const currentFindingKey = reduced ? 0 : findingKey;

  return (
    <section style={{ padding: '80px 28px 88px', borderBottom: '1px solid var(--line)' }}>
      <div
        className="mx-auto grid grid-cols-1 lg:grid-cols-[55%_1fr] items-start gap-16"
        style={{ maxWidth: '1180px' }}
      >
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <p
            className="font-mono"
            style={{
              fontSize: '11px',
              color: 'var(--dim)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            ABQE-BACKED · RESUME DIAGNOSTICS
          </p>

          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(30px, 4vw, 50px)',
              fontWeight: 500,
              lineHeight: 1.12,
              letterSpacing: '-0.025em',
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Resume scoring backed by published{' '}
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <em style={{ fontStyle: 'italic' }}>research</em>
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
            {', not vibes.'}
          </h1>

          <p
            className="font-mono"
            style={{
              fontSize: '13px',
              lineHeight: 1.75,
              color: 'var(--muted)',
              maxWidth: '500px',
              margin: 0,
            }}
          >
            CareerRefine scores resumes against the ABQE benchmark — four
            empirically-weighted factors (employment gap, skill phrasing,
            structure, degree origin) that predict LLM and ATS filtering risk.
            Specific findings, with the research behind them.
          </p>

          <div>
            <Link
              href="/analyze"
              className="font-mono"
              style={{
                display: 'inline-block',
                backgroundColor: 'var(--accent)',
                color: '#000',
                fontSize: '13px',
                fontWeight: 700,
                padding: '14px 24px',
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
            <p
              className="font-mono"
              style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '10px', marginBottom: 0 }}
            >
              No signup. Resumes never stored.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN — Live Diagnostic Mock */}
        <div
          style={{
            backgroundImage:
              'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            padding: '20px',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-soft)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
            }}
          >
            {/* File pill */}
            <div
              className="font-mono"
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--muted)' }}>resume.docx</span>
              <span style={{ color: 'var(--dim)' }}>·</span>
              <span style={{ color: 'var(--dim)' }}>24 KB</span>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 20px 16px' }}>
              {/* Score */}
              <div style={{ marginBottom: '18px' }}>
                <span
                  className="font-serif"
                  style={{
                    fontSize: '64px',
                    fontWeight: 600,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    color: scoreColor(currentScore),
                    display: 'inline-block',
                    minWidth: '76px',
                    transition: reduced ? 'none' : 'color 120ms',
                  }}
                >
                  {currentScore}
                </span>
                <span
                  className="font-serif"
                  style={{ fontSize: '22px', fontWeight: 400, color: 'var(--dim)', marginLeft: '2px' }}
                >
                  /100
                </span>
              </div>

              {/* Factor bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {FACTOR_ROWS.map(({ key, label }) => {
                  const val = currentFactors[key];
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '9px',
                          color: 'var(--dim)',
                          letterSpacing: '0.05em',
                          width: '106px',
                          flexShrink: 0,
                          lineHeight: 1,
                        }}
                      >
                        {label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '2px',
                          backgroundColor: 'var(--bg-input)',
                          borderRadius: '1px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          animate={{ width: `${val}%` }}
                          transition={
                            reduced ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }
                          }
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            backgroundColor: scoreColor(val),
                            borderRadius: '1px',
                          }}
                        />
                      </div>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '10px',
                          color: 'var(--muted)',
                          width: '22px',
                          textAlign: 'right',
                          flexShrink: 0,
                        }}
                      >
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Finding line */}
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: '12px',
                  minHeight: '54px',
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentFindingKey}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.25, ease: EASE }}
                    className="font-mono"
                    style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}
                  >
                    <span style={{ color: 'var(--dim)', marginRight: '6px' }}>›</span>
                    {reduced ? (
                      FINDINGS[0]
                    ) : (
                      <TypewriterText text={FINDINGS[currentFindingIdx]} speed={28} />
                    )}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
