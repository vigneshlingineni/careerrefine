'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FactorScore {
  score: number | null;
  summary: string;
}

interface Finding {
  factor: 'employment_gap' | 'skill_phrasing' | 'resume_structure' | 'degree_origin';
  severity: 'high' | 'medium' | 'low';
  issue: string;
  evidence: string;
  recommendation: string;
}

interface AnalysisResult {
  overall_score: number | null;
  verdict: string;
  factor_scores: {
    employment_gap: FactorScore;
    skill_phrasing: FactorScore;
    resume_structure: FactorScore;
    degree_origin: FactorScore;
  };
  findings: Finding[];
  rewritten_resume: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FACTOR_ORDER = [
  'employment_gap',
  'skill_phrasing',
  'resume_structure',
  'degree_origin',
] as const;

const FACTOR_LABELS: Record<string, string> = {
  employment_gap: 'Employment Gap',
  skill_phrasing: 'Skill Phrasing',
  resume_structure: 'Structure',
  degree_origin: 'Degree Origin',
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--dim)';
  if (score >= 80) return 'var(--accent)';
  if (score >= 50) return 'var(--warn)';
  return 'var(--danger)';
}

function severityColor(severity: string): string {
  if (severity === 'high') return 'var(--danger)';
  if (severity === 'medium') return 'var(--warn)';
  return 'var(--good)';
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <>
      <Nav />
      <main
        className="flex-1"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 28px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <h1
            className="font-serif"
            style={{
              fontSize: '28px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              marginBottom: '12px',
            }}
          >
            No analysis found.
          </h1>
          <p
            className="font-mono"
            style={{ fontSize: '13px', color: 'var(--dim)', marginBottom: '28px' }}
          >
            Scan a resume first.
          </p>
          <Link
            href="/analyze"
            className="font-mono"
            style={{
              display: 'inline-block',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              padding: '10px 20px',
              fontSize: '12px',
              color: 'var(--muted)',
              textDecoration: 'none',
              letterSpacing: '0.02em',
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = 'var(--accent-dim)';
              el.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = 'var(--line)';
              el.style.color = 'var(--muted)';
            }}
          >
            → Run a scan
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const reduced = useReducedMotion();

  // Data
  const [loaded, setLoaded] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [filename, setFilename] = useState('');

  // Score reveal
  const [displayScore, setDisplayScore] = useState(0);

  // Sub-score count-ups (one entry per factor, in FACTOR_ORDER)
  const [subDisplays, setSubDisplays] = useState([0, 0, 0, 0]);
  const [showSubScores, setShowSubScores] = useState(false);

  // Findings + resume
  const [showFindings, setShowFindings] = useState(false);

  // Share button
  const [shareLabel, setShareLabel] = useState('Share this analysis');

  // Download
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Refs for animation cleanup
  const jitterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countupRaf = useRef<number>(0);

  // Load from sessionStorage once on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('careerrefine:lastResult');
    if (raw) {
      try {
        const { result: r, filename: f } = JSON.parse(raw);
        setResult(r);
        setFilename(f || '');
      } catch {
        // corrupted — show empty state
      }
    }
    setLoaded(true);
  }, []);

  // Score reveal: jitter → count-up → trigger sub-scores → trigger findings
  useEffect(() => {
    if (!result) return;
    const target = result.overall_score ?? 0;
    const subTargets = FACTOR_ORDER.map((f) => result.factor_scores[f]?.score ?? 0);

    if (reduced) {
      setDisplayScore(target);
      setSubDisplays(subTargets);
      setShowSubScores(true);
      setShowFindings(true);
      return;
    }

    let jitterCount = 0;

    // Phase 1 — jitter: 6 random flashes at 50 ms each (300 ms total)
    jitterRef.current = setInterval(() => {
      setDisplayScore(Math.floor(Math.random() * 100));
      jitterCount++;

      if (jitterCount >= 6) {
        clearInterval(jitterRef.current!);
        jitterRef.current = null;

        // Phase 2 — count-up: 0 → target over 600 ms easeOutQuart
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / 600, 1);
          setDisplayScore(Math.round(easeOutQuart(progress) * target));

          if (progress < 1) {
            countupRaf.current = requestAnimationFrame(tick);
          } else {
            // Score locked — stagger sub-score count-ups (80 ms apart, 500 ms each)
            setShowSubScores(true);
            subTargets.forEach((subTarget, i) => {
              setTimeout(() => {
                const subStart = performance.now();
                const subTick = (subNow: number) => {
                  const subProg = Math.min((subNow - subStart) / 500, 1);
                  const val = Math.round(easeOutQuart(subProg) * subTarget);
                  setSubDisplays((prev) => {
                    const next = [...prev];
                    next[i] = val;
                    return next;
                  });
                  if (subProg < 1) requestAnimationFrame(subTick);
                };
                requestAnimationFrame(subTick);
              }, i * 80);
            });

            // Findings appear after all sub-scores have settled
            // Last sub starts at 3×80=240 ms, runs 500 ms → 740 ms + buffer
            setTimeout(() => setShowFindings(true), 840);
          }
        };
        countupRaf.current = requestAnimationFrame(tick);
      }
    }, 50);

    return () => {
      if (jitterRef.current) clearInterval(jitterRef.current);
      cancelAnimationFrame(countupRaf.current);
    };
  }, [result, reduced]);

  const handleDownload = async () => {
    if (!result?.rewritten_resume) return;
    setDownloadError(null);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewritten_resume: result.rewritten_resume }),
      });
      if (!res.ok) {
        const d = await res.json();
        setDownloadError(d.error || 'Export failed.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rewritten-resume.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareLabel('Copied →');
      setTimeout(() => setShareLabel('Share this analysis'), 1500);
    } catch {
      // clipboard access denied — silent fail
    }
  };

  // Avoid hydration mismatch: render nothing until sessionStorage is read
  if (!loaded) return null;
  if (!result) return <EmptyState />;

  return (
    <>
      <Nav />
      <main style={{ padding: '48px 28px 96px' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>

          {/* Meta line */}
          <div
            className="font-mono"
            style={{
              fontSize: '12px',
              color: 'var(--dim)',
              marginBottom: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            <span>Analysis for: {filename}</span>
            <span style={{ color: 'var(--line-strong)' }}>·</span>
            <Link
              href="/analyze"
              style={{
                color: 'var(--dim)',
                textDecoration: 'underline',
                textDecorationColor: 'var(--line-strong)',
              }}
            >
              re-scan →
            </Link>
          </div>

          {/* Results panel */}
          <div
            style={{
              backgroundColor: 'var(--bg-soft)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              padding: '40px',
            }}
          >

            {/* Overall score */}
            <div style={{ marginBottom: '8px' }}>
              <span
                className="font-serif"
                style={{
                  fontSize: '80px',
                  fontWeight: 600,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: scoreColor(displayScore),
                  display: 'inline-block',
                  minWidth: '140px',
                  transition: reduced ? 'none' : 'color 200ms',
                }}
              >
                {displayScore}
              </span>
              <span
                className="font-serif"
                style={{ fontSize: '28px', fontWeight: 400, color: 'var(--dim)', marginLeft: '4px' }}
              >
                /100
              </span>
            </div>

            {/* Verdict */}
            <p
              className="font-mono"
              style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}
            >
              {result.verdict}
            </p>

            {/* ABQE citation */}
            <p
              className="font-mono"
              style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: '36px' }}
            >
              Scored against{' '}
              <a
                href="https://doi.org/10.5281/zenodo.18072532"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--dim)',
                  textDecoration: 'underline',
                  textDecorationColor: 'var(--line-strong)',
                }}
              >
                ABQE benchmark
              </a>{' '}
              (Lingineni, 2025) · 4 factors
            </p>

            {/* Sub-scores */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                borderTop: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
                marginBottom: '40px',
              }}
            >
              {FACTOR_ORDER.map((factor, i) => {
                const fs = result.factor_scores[factor];
                return (
                  <motion.div
                    key={factor}
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    animate={showSubScores ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { delay: i * 0.08, duration: 0.3, ease: EASE }
                    }
                    style={{
                      padding: '16px 10px',
                      borderRight: i < 3 ? '1px solid var(--line)' : undefined,
                    }}
                  >
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: scoreColor(fs?.score ?? null),
                        marginBottom: '4px',
                      }}
                    >
                      {subDisplays[i] ?? '—'}
                    </div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '9px',
                        color: 'var(--dim)',
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        lineHeight: 1.4,
                      }}
                    >
                      {FACTOR_LABELS[factor]}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Findings */}
            <div style={{ marginBottom: '40px' }}>
              <p
                className="font-mono"
                style={{
                  fontSize: '10px',
                  color: 'var(--dim)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                }}
              >
                Findings
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {result.findings.map((finding, i) => (
                  <motion.div
                    key={i}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={showFindings ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { delay: i * 0.06, duration: 0.25, ease: EASE }
                    }
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: severityColor(finding.severity),
                          flexShrink: 0,
                          marginTop: '5px',
                        }}
                      />
                      <p
                        className="font-mono"
                        style={{
                          fontSize: '13px',
                          color: 'var(--text)',
                          fontWeight: 500,
                          lineHeight: 1.5,
                        }}
                      >
                        {finding.issue}
                      </p>
                    </div>

                    <div
                      className="font-mono"
                      style={{
                        backgroundColor: 'var(--bg)',
                        borderLeft: '2px solid var(--accent-dim)',
                        padding: '10px 12px',
                        marginBottom: '10px',
                        marginLeft: '17px',
                        fontSize: '12px',
                        color: 'var(--muted)',
                        lineHeight: 1.65,
                        overflowX: 'auto',
                      }}
                    >
                      &ldquo;{finding.evidence}&rdquo;
                    </div>

                    <p
                      className="font-mono"
                      style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        lineHeight: 1.65,
                        marginLeft: '17px',
                      }}
                    >
                      {finding.recommendation}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Rewritten resume */}
            {result.rewritten_resume && (
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={showFindings ? { opacity: 1 } : { opacity: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { delay: result.findings.length * 0.06 + 0.1, duration: 0.3 }
                }
              >
                <p
                  className="font-mono"
                  style={{
                    fontSize: '10px',
                    color: 'var(--dim)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                  }}
                >
                  Rewritten Resume
                </p>

                <pre
                  className="font-mono"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderLeft: '2px solid var(--accent-dim)',
                    borderRadius: '0 4px 4px 0',
                    padding: '20px',
                    fontSize: '12px',
                    lineHeight: 1.75,
                    color: 'var(--muted)',
                    overflowY: 'auto',
                    maxHeight: '480px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: '0 0 16px 0',
                  }}
                >
                  {result.rewritten_resume}
                </pre>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={handleDownload}
                    className="font-mono"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: '#000',
                      border: '1px solid var(--accent)',
                      borderRadius: '4px',
                      padding: '10px 20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      cursor: 'pointer',
                      transition: 'transform 150ms, box-shadow 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(212,255,63,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    Download as DOCX
                  </button>

                  <button
                    onClick={handleShare}
                    className="font-mono"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--muted)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      padding: '10px 20px',
                      fontSize: '12px',
                      letterSpacing: '0.02em',
                      cursor: 'pointer',
                      transition: 'border-color 150ms, color 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-dim)';
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line)';
                      e.currentTarget.style.color = 'var(--muted)';
                    }}
                  >
                    {shareLabel}
                  </button>
                </div>

                {downloadError && (
                  <p
                    className="font-mono"
                    style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '8px' }}
                  >
                    {downloadError}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
