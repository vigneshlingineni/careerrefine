'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobRow {
  id: string;
  value: string;
  mode: 'url' | 'text';
  pasteValue: string;
  fetchStatus: 'idle' | 'fetching' | 'done' | 'fail';
  fetchedText: string;
  fetchTitle: string;
  fetchSource: string;
  fetchWordCount: number;
}

interface Finding {
  factor: string;
  severity: 'high' | 'medium' | 'low';
  issue: string;
  evidence: string;
  recommendation: string;
}

interface FactorScore {
  score: number | null;
  summary: string;
}

interface ScoredResult {
  id: string;
  title?: string;
  source?: string;
  url?: string;
  jdText: string;
  overall_score: number | null;
  verdict: string;
  factor_scores: {
    employment_gap: FactorScore;
    skill_phrasing: FactorScore;
    resume_structure: FactorScore;
    degree_origin: FactorScore;
  };
  findings: Finding[];
  error?: string;
}

interface TuneData {
  status: 'idle' | 'confirm' | 'loading' | 'done' | 'error';
  skipped: boolean;
  logLines: string[];
  logComplete: boolean;
  isError: boolean;
  tunedResume: string;
  answers: string[];
  copyLabel: string;
  downloadError: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const FACTOR_ORDER = [
  'employment_gap',
  'skill_phrasing',
  'resume_structure',
  'degree_origin',
] as const;
const FACTOR_LABELS: Record<string, string> = {
  employment_gap: 'Emp. Gap',
  skill_phrasing: 'Skill Phrasing',
  resume_structure: 'Structure',
  degree_origin: 'Degree',
};
const ANSWER_QUESTIONS = [
  { label: 'Why are you interested in this role?' },
  { label: 'What is your relevant experience for this role?' },
  { label: 'Are you authorized to work in the listed country?' },
  { label: 'Do you require visa sponsorship?', helper: 'Edit based on your status' },
  {
    label: 'What is your expected salary range?',
    helper: 'Optional — leave blank to skip this field on most forms',
  },
  { label: 'When can you start?' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nanoid() {
  return Math.random().toString(36).slice(2, 9);
}

function newJobRow(): JobRow {
  return {
    id: nanoid(),
    value: '',
    mode: 'text',
    pasteValue: '',
    fetchStatus: 'idle',
    fetchedText: '',
    fetchTitle: '',
    fetchSource: '',
    fetchWordCount: 0,
  };
}

function isURL(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://');
}

function getJdText(job: JobRow): string {
  if (job.mode === 'url') {
    if (job.fetchStatus === 'done') return job.fetchedText;
    if (job.fetchStatus === 'fail') return job.pasteValue;
    return '';
  }
  return job.value;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--dim)';
  if (score >= 80) return 'var(--accent)';
  if (score >= 50) return 'var(--warn)';
  return 'var(--danger)';
}

function severityColor(s: string): string {
  if (s === 'high') return 'var(--danger)';
  if (s === 'medium') return 'var(--warn)';
  return 'var(--good)';
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function defaultTuneData(): TuneData {
  return {
    status: 'idle',
    skipped: false,
    logLines: [],
    logComplete: false,
    isError: false,
    tunedResume: '',
    answers: ['', '', 'Yes', '', '', 'Two weeks notice from offer date'],
    copyLabel: 'Copy answer pack',
    downloadError: null,
  };
}

// ─── LogLine ──────────────────────────────────────────────────────────────────

function LogLine({
  text,
  isError,
  isPulsing,
  reduced,
}: {
  text: string;
  isError: boolean;
  isPulsing: boolean;
  reduced: boolean | null;
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="font-mono"
      style={{
        fontSize: '12px',
        lineHeight: 1.7,
        color: isError ? 'var(--danger)' : 'var(--muted)',
        display: 'flex',
        gap: '8px',
        alignItems: 'baseline',
      }}
    >
      <span style={{ color: 'var(--dim)', flexShrink: 0 }}>{'>'}</span>
      <span>
        {text}
        {isPulsing && (
          <motion.span
            animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ marginLeft: '2px', color: 'var(--dim)' }}
          >
            ...
          </motion.span>
        )}
      </span>
    </motion.div>
  );
}

// ─── JobRowItem ───────────────────────────────────────────────────────────────

function JobRowItem({
  job,
  index,
  onUpdate,
  onRemove,
}: {
  job: JobRow;
  index: number;
  onUpdate: (id: string, updates: Partial<JobRow>) => void;
  onRemove: (id: string) => void;
}) {
  const isFail = job.fetchStatus === 'fail';
  const showTextarea = (job.mode === 'text' && job.value.length > 0) || isFail;

  const handleChange = (newValue: string) => {
    const newMode: 'url' | 'text' = isURL(newValue) ? 'url' : 'text';
    const resetFetch =
      newMode === 'url' && newValue !== job.value
        ? { fetchStatus: 'idle' as const, fetchedText: '', fetchTitle: '', fetchSource: '', fetchWordCount: 0 }
        : {};
    onUpdate(job.id, { value: newValue, mode: newMode, ...resetFetch });
  };

  const handleBlur = async () => {
    if (job.mode !== 'url' || job.fetchStatus !== 'idle' || !job.value.trim()) return;
    onUpdate(job.id, { fetchStatus: 'fetching' });
    try {
      const res = await fetch('/api/fetch-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: job.value }),
      });
      const data = await res.json();
      if (data.ok) {
        onUpdate(job.id, {
          fetchStatus: 'done',
          fetchedText: data.text,
          fetchTitle: data.title || '',
          fetchSource: data.source || '',
          fetchWordCount: data.wordCount || 0,
        });
      } else {
        onUpdate(job.id, { fetchStatus: 'fail' });
      }
    } catch {
      onUpdate(job.id, { fetchStatus: 'fail' });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--line)',
    borderRadius: '4px',
    color: 'var(--text)',
    fontSize: '13px',
    fontFamily: 'inherit',
    lineHeight: 1.6,
    padding: '10px 12px',
    outline: 'none',
    transition: 'border-color 150ms',
    resize: 'vertical',
  };

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <span
        className="font-mono"
        style={{
          fontSize: '11px',
          color: 'var(--dim)',
          paddingTop: '12px',
          flexShrink: 0,
          width: '40px',
          letterSpacing: '0.04em',
        }}
      >
        Job {index + 1}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {showTextarea ? (
          <textarea
            value={isFail ? job.pasteValue : job.value}
            onChange={(e) => {
              if (isFail) onUpdate(job.id, { pasteValue: e.target.value });
              else handleChange(e.target.value);
            }}
            placeholder={
              isFail
                ? "Couldn't read this URL. Paste the JD text here instead."
                : 'Paste the full job description...'
            }
            rows={5}
            className="font-mono"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-dim)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; }}
          />
        ) : (
          <input
            type="text"
            value={job.value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Job URL or paste description..."
            className="font-mono"
            style={{ ...inputStyle, resize: undefined }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-dim)'; }}
          />
        )}

        {job.fetchStatus === 'fetching' && (
          <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '4px' }}>
            Fetching...
          </p>
        )}
        {job.fetchStatus === 'done' && (
          <p className="font-mono" style={{ fontSize: '11px', color: 'var(--good)', marginTop: '4px' }}>
            Fetched · {job.fetchWordCount.toLocaleString()} words
            {job.fetchTitle ? ` · ${job.fetchTitle.slice(0, 60)}${job.fetchTitle.length > 60 ? '…' : ''}` : ''}
          </p>
        )}
        {isFail && (
          <p className="font-mono" style={{ fontSize: '11px', color: 'var(--warn)', marginTop: '4px' }}>
            Couldn&apos;t read this URL. Paste the JD text directly above.
          </p>
        )}
      </div>

      <button
        onClick={() => onRemove(job.id)}
        className="font-mono"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--dim)',
          cursor: 'pointer',
          fontSize: '14px',
          paddingTop: '10px',
          flexShrink: 0,
          transition: 'color 150ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--dim)'; }}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({
  result,
  index,
  tuneData,
  reduced,
  onTuneClick,
  onTuneConfirm,
  onSkipCard,
  onUpdateTune,
}: {
  result: ScoredResult;
  index: number;
  tuneData: TuneData;
  reduced: boolean | null;
  onTuneClick: () => void;
  onTuneConfirm: (skip: boolean) => void;
  onSkipCard: () => void;
  onUpdateTune: (updates: Partial<TuneData>) => void;
}) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showSubScores, setShowSubScores] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [findingsExpanded, setFindingsExpanded] = useState(false);
  const jitterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const target = result.overall_score ?? 0;

    if (reduced || !result.overall_score) {
      setDisplayScore(target);
      setShowSubScores(true);
      setShowFindings(true);
      return;
    }

    let count = 0;
    jitterRef.current = setInterval(() => {
      setDisplayScore(Math.floor(Math.random() * 100));
      count++;
      if (count >= 4) {
        clearInterval(jitterRef.current!);
        jitterRef.current = null;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / 280, 1);
          setDisplayScore(Math.round(easeOutQuart(p) * target));
          if (p < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            setShowSubScores(true);
            setTimeout(() => setShowFindings(true), 250);
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    }, 30);

    return () => {
      if (jitterRef.current) clearInterval(jitterRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async () => {
    if (!tuneData.tunedResume) return;
    onUpdateTune({ downloadError: null });
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewritten_resume: tuneData.tunedResume }),
      });
      if (!res.ok) {
        const d = await res.json();
        onUpdateTune({ downloadError: d.error || 'Export failed.' });
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
      onUpdateTune({ downloadError: err instanceof Error ? err.message : 'Download failed.' });
    }
  };

  const handleCopyAnswers = async () => {
    const text = ANSWER_QUESTIONS.map((q, i) => `${q.label}\n${tuneData.answers[i] || ''}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      onUpdateTune({ copyLabel: 'Copied' });
      setTimeout(() => onUpdateTune({ copyLabel: 'Copy answer pack' }), 1500);
    } catch {
      // clipboard denied — silent
    }
  };

  const handleOpenAndCopy = async () => {
    if (!result.url) return;
    window.open(result.url, '_blank');
    const text = ANSWER_QUESTIONS.map((q, i) => `${q.label}\n${tuneData.answers[i] || ''}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard denied — silent
    }
  };

  const top3 = result.findings?.slice(0, 3) ?? [];
  const allFindings = result.findings ?? [];
  const shownFindings = findingsExpanded ? allFindings : top3;

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-soft)',
    border: '1px solid var(--line)',
    borderRadius: '4px',
    padding: '28px',
  };

  if (result.error) {
    return (
      <div style={cardStyle}>
        <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: '8px', letterSpacing: '0.06em' }}>
          JOB {index + 1}
        </p>
        <p className="font-mono" style={{ fontSize: '12px', color: 'var(--danger)' }}>
          Scoring failed: {result.error}
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Top row: score + job info */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ flexShrink: 0 }}>
          <p className="font-mono" style={{ fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.07em', marginBottom: '4px' }}>
            JOB {index + 1}
          </p>
          <span
            className="font-serif"
            style={{
              fontSize: '56px',
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: scoreColor(displayScore),
              display: 'block',
              minWidth: '80px',
              transition: reduced ? 'none' : 'color 200ms',
            }}
          >
            {displayScore}
          </span>
          <span className="font-serif" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--dim)' }}>
            /100
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: '20px' }}>
          <p className="font-mono" style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {result.title || 'Pasted job description'}
          </p>
          {result.source && (
            <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: '4px' }}>
              {result.source}
            </p>
          )}
          {result.url ? (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono"
              style={{ fontSize: '11px', color: 'var(--dim)', textDecoration: 'underline', textDecorationColor: 'var(--line-strong)' }}
            >
              view JD
            </a>
          ) : (
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)' }}>
              pasted text
            </span>
          )}
        </div>
      </div>

      {/* Sub-scores */}
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={showSubScores ? { opacity: 1 } : { opacity: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.25 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          marginBottom: '20px',
        }}
      >
        {FACTOR_ORDER.map((factor, i) => {
          const fs = result.factor_scores?.[factor];
          return (
            <div
              key={factor}
              style={{
                padding: '10px 8px',
                borderRight: i < 3 ? '1px solid var(--line)' : undefined,
              }}
            >
              <div
                className="font-mono"
                style={{ fontSize: '18px', fontWeight: 700, color: scoreColor(fs?.score ?? null), marginBottom: '2px' }}
              >
                {fs?.score ?? '—'}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.3 }}
              >
                {FACTOR_LABELS[factor]}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Findings (compressed) */}
      {showFindings && allFindings.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {shownFindings.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: severityColor(f.severity),
                    flexShrink: 0,
                    marginTop: '5px',
                  }}
                />
                <p className="font-mono" style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  {f.issue}
                </p>
              </div>
            ))}
          </div>
          {allFindings.length > 3 && (
            <button
              onClick={() => setFindingsExpanded(!findingsExpanded)}
              className="font-mono"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--dim)',
                fontSize: '11px',
                cursor: 'pointer',
                marginTop: '8px',
                padding: 0,
                textDecoration: 'underline',
                textDecorationColor: 'var(--line-strong)',
              }}
            >
              {findingsExpanded
                ? 'show fewer'
                : `see all ${allFindings.length} findings`}
            </button>
          )}
        </div>
      )}

      {/* Action buttons (main card) */}
      {tuneData.status === 'idle' && !tuneData.skipped && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onTuneClick}
            className="font-mono"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#000',
              border: '1px solid var(--accent)',
              borderRadius: '4px',
              padding: '10px 18px',
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
            Tune resume for this job
          </button>
          {(result.overall_score ?? 100) < 70 && (
            <button
              onClick={onSkipCard}
              className="font-mono"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--dim)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                padding: '10px 18px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'border-color 150ms, color 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--line-strong)';
                e.currentTarget.style.color = 'var(--muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.color = 'var(--dim)';
              }}
            >
              Skip — low match
            </button>
          )}
        </div>
      )}

      {tuneData.skipped && (
        <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)', letterSpacing: '0.05em' }}>
          Skipped
        </p>
      )}

      {/* Score gate confirm */}
      {tuneData.status === 'confirm' && (
        <div
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--warn)',
            borderRadius: '4px',
            padding: '16px',
            marginTop: '4px',
          }}
        >
          <p className="font-mono" style={{ fontSize: '12px', color: 'var(--warn)', marginBottom: '14px', lineHeight: 1.6 }}>
            This match scored {result.overall_score}/100. ABQE data suggests rewrites at this level rarely close the gap. Recommend stronger matches first.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onTuneConfirm(false)}
              className="font-mono"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--muted)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '12px',
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
              Tune anyway
            </button>
            <button
              onClick={() => onTuneConfirm(true)}
              className="font-mono"
              style={{
                backgroundColor: 'var(--bg-soft)',
                color: 'var(--text)',
                border: '1px solid var(--line-strong)',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 150ms',
              }}
            >
              Skip this one
            </button>
          </div>
        </div>
      )}

      {/* Tune log */}
      {(tuneData.status === 'loading' || tuneData.status === 'done' || tuneData.status === 'error') && tuneData.logLines.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {tuneData.logLines.map((line, i) => {
            const isLast = i === tuneData.logLines.length - 1;
            const isPulsing = tuneData.status === 'loading' && tuneData.logComplete && isLast && !tuneData.isError;
            return (
              <LogLine
                key={i}
                text={line}
                isError={tuneData.isError && isLast}
                isPulsing={isPulsing}
                reduced={reduced}
              />
            );
          })}
        </div>
      )}

      {/* Tune output */}
      {tuneData.status === 'done' && (
        <div style={{ marginTop: '20px' }}>
          {/* Tuned resume */}
          <p
            className="font-mono"
            style={{ fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}
          >
            Tuned Resume
          </p>
          <pre
            className="font-mono"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderLeft: '2px solid var(--accent-dim)',
              borderRadius: '0 4px 4px 0',
              padding: '16px',
              fontSize: '12px',
              lineHeight: 1.75,
              color: 'var(--muted)',
              overflowY: 'auto',
              maxHeight: '360px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: '0 0 12px 0',
            }}
          >
            {tuneData.tunedResume}
          </pre>

          <button
            onClick={handleDownload}
            className="font-mono"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#000',
              border: '1px solid var(--accent)',
              borderRadius: '4px',
              padding: '10px 18px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              marginBottom: '28px',
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

          {tuneData.downloadError && (
            <p className="font-mono" style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '-20px', marginBottom: '20px' }}>
              {tuneData.downloadError}
            </p>
          )}

          {/* Answer pack */}
          <div
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              padding: '20px',
              marginBottom: '16px',
            }}
          >
            <p
              className="font-mono"
              style={{ fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}
            >
              Common Application Answers
            </p>
            <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: '20px', lineHeight: 1.5 }}>
              Tailored to this job. Copy individual answers or the full pack.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {ANSWER_QUESTIONS.map((q, i) => (
                <div key={i}>
                  <p className="font-mono" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', fontWeight: 500 }}>
                    {q.label}
                  </p>
                  {q.helper && (
                    <p className="font-mono" style={{ fontSize: '10px', color: 'var(--dim)', marginBottom: '4px' }}>
                      {q.helper}
                    </p>
                  )}
                  <textarea
                    value={tuneData.answers[i] ?? ''}
                    onChange={(e) => {
                      const next = [...tuneData.answers];
                      next[i] = e.target.value;
                      onUpdateTune({ answers: next });
                    }}
                    rows={i < 2 ? 3 : 1}
                    className="font-mono"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      padding: '8px 10px',
                      outline: 'none',
                      resize: 'vertical',
                      transition: 'border-color 150ms',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--accent-dim)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={handleCopyAnswers}
                className="font-mono"
                style={{
                  backgroundColor: 'var(--bg-soft)',
                  color: 'var(--text)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: '4px',
                  padding: '9px 16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'border-color 150ms',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-strong)'; }}
              >
                {tuneData.copyLabel}
              </button>

              <button
                onClick={handleOpenAndCopy}
                disabled={!result.url}
                title={!result.url ? 'URL not available' : undefined}
                className="font-mono"
                style={{
                  backgroundColor: 'transparent',
                  color: result.url ? 'var(--muted)' : 'var(--dim)',
                  border: `1px solid ${result.url ? 'var(--line)' : 'var(--line)'}`,
                  borderRadius: '4px',
                  padding: '9px 16px',
                  fontSize: '12px',
                  cursor: result.url ? 'pointer' : 'not-allowed',
                  transition: 'border-color 150ms, color 150ms',
                  letterSpacing: '0.02em',
                  opacity: result.url ? 1 : 0.45,
                }}
                onMouseEnter={(e) => {
                  if (!result.url) return;
                  e.currentTarget.style.borderColor = 'var(--accent-dim)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  if (!result.url) return;
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.color = 'var(--muted)';
                }}
              >
                Open job + copy
              </button>
            </div>
          </div>

          <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)', lineHeight: 1.5 }}>
            Apply on the portal · paste answers · review · submit. CareerRefine never submits for you.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── ApplyPage ────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const reduced = useReducedMotion();

  // Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeTokens, setResumeTokens] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [step1Open, setStep1Open] = useState(true);
  const [step2Open, setStep2Open] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Jobs
  const [jobs, setJobs] = useState<JobRow[]>(() => [newJobRow(), newJobRow()]);

  // Scoring
  const [scoringStatus, setScoringStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [scoringLog, setScoringLog] = useState<string[]>([]);
  const [scoringLogComplete, setScoringLogComplete] = useState(false);
  const [scoringIsError, setScoringIsError] = useState(false);
  const scoringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results
  const [results, setResults] = useState<ScoredResult[]>([]);

  // Tune map
  const [tuneMap, setTuneMap] = useState<Record<string, TuneData>>({});

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback(async (f: File) => {
    const name = f.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setFileError('Only PDF and DOCX files are supported.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError('File must be under 5 MB.');
      return;
    }
    setFileError(null);
    setParseError(null);
    setResumeFile(f);
    setIsParsing(true);

    const form = new FormData();
    form.append('resume', f);
    try {
      const res = await fetch('/api/parse-resume', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error || 'Could not parse resume.');
        setIsParsing(false);
        return;
      }
      setResumeText(data.text);
      setResumeTokens(data.tokenEstimate);
      setStep2Open(true);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  // ── Job row management ─────────────────────────────────────────────────────

  const updateJob = useCallback((id: string, updates: Partial<JobRow>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const addJob = useCallback(() => {
    setJobs(prev => prev.length < 5 ? [...prev, newJobRow()] : prev);
  }, []);

  // ── Score all jobs ─────────────────────────────────────────────────────────

  const scoreAllJobs = useCallback(async () => {
    const readyJobs = jobs
      .filter(j => getJdText(j).trim().length > 0)
      .map(j => ({
        id: j.id,
        jdText: getJdText(j),
        title: j.fetchTitle || undefined,
        source: j.fetchSource || undefined,
        url: j.mode === 'url' ? j.value : undefined,
      }));

    if (readyJobs.length === 0 || !resumeText || scoringStatus === 'loading') return;

    setScoringStatus('loading');
    setScoringLog([]);
    setScoringLogComplete(false);
    setScoringIsError(false);
    setResults([]);

    const tokenEst = resumeTokens.toLocaleString();
    const allLogLines = [
      `parsed resume · ${tokenEst} tokens`,
      `queued ${readyJobs.length} job${readyJobs.length > 1 ? 's' : ''}`,
      'scoring against ABQE benchmark',
      ...readyJobs.map((_, i) => `job ${i + 1} of ${readyJobs.length} · scoring`),
      'ranking by overall score',
      'preparing match report',
    ];

    if (reduced) {
      setScoringLog(allLogLines);
      setScoringLogComplete(true);
    } else {
      let idx = 0;
      scoringIntervalRef.current = setInterval(() => {
        idx++;
        setScoringLog(allLogLines.slice(0, idx));
        if (idx >= allLogLines.length) {
          clearInterval(scoringIntervalRef.current!);
          scoringIntervalRef.current = null;
          setScoringLogComplete(true);
        }
      }, 250);
    }

    try {
      const res = await fetch('/api/batch-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobs: readyJobs }),
      });
      const data = await res.json();

      if (scoringIntervalRef.current) {
        clearInterval(scoringIntervalRef.current);
        scoringIntervalRef.current = null;
      }

      if (!res.ok) {
        setScoringLog(prev => [...prev, `error: ${data.error || 'Scoring failed.'}`]);
        setScoringIsError(true);
        setScoringStatus('error');
        return;
      }

      const jdById: Record<string, string> = {};
      readyJobs.forEach(j => { jdById[j.id] = j.jdText; });

      const scored: ScoredResult[] = (data.results as Record<string, unknown>[]).map(r => ({
        ...(r as object),
        jdText: jdById[r.id as string] || '',
        url: readyJobs.find(j => j.id === r.id)?.url,
      } as ScoredResult));

      scored.sort((a, b) => {
        if (a.error && !b.error) return 1;
        if (!a.error && b.error) return -1;
        return (b.overall_score ?? -1) - (a.overall_score ?? -1);
      });

      setScoringLog(allLogLines);
      setScoringLogComplete(true);
      setResults(scored);
      setScoringStatus('done');
    } catch (err) {
      if (scoringIntervalRef.current) {
        clearInterval(scoringIntervalRef.current);
        scoringIntervalRef.current = null;
      }
      const msg = err instanceof Error ? err.message : 'Network error.';
      setScoringLog(prev => [...prev, `error: ${msg}`]);
      setScoringIsError(true);
      setScoringStatus('error');
    }
  }, [jobs, resumeText, resumeTokens, scoringStatus, reduced]);

  // ── Tune management ────────────────────────────────────────────────────────

  const updateTune = useCallback((id: string, updates: Partial<TuneData>) => {
    setTuneMap(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? defaultTuneData()), ...updates },
    }));
  }, []);

  const startTune = useCallback(async (resultId: string) => {
    const result = results.find(r => r.id === resultId);
    if (!result || !resumeFile) return;

    const jobIndex = results.indexOf(result);
    const jobName = result.title || `Job ${jobIndex + 1}`;

    const tuneLogLines = [
      `tuning resume for ${jobName}`,
      'applying ABQE-aligned rewrites',
      'preserving factual content',
      'preparing answer pack',
    ];

    updateTune(resultId, { status: 'loading', logLines: [], logComplete: false, isError: false });

    let logIdx = 0;
    const logInterval = setInterval(() => {
      logIdx++;
      updateTune(resultId, { logLines: tuneLogLines.slice(0, logIdx) });
      if (logIdx >= tuneLogLines.length) {
        clearInterval(logInterval);
        updateTune(resultId, { logComplete: true });
      }
    }, 350);

    const form = new FormData();
    form.append('resume', resumeFile);
    form.append('jd', result.jdText);

    try {
      const [analyzeRes, answersRes] = await Promise.all([
        fetch('/api/analyze', { method: 'POST', body: form }),
        fetch('/api/answer-pack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText, jdText: result.jdText, jobTitle: result.title || jobName }),
        }),
      ]);

      clearInterval(logInterval);

      const [analyzeData, answersData] = await Promise.all([analyzeRes.json(), answersRes.json()]);

      if (!analyzeRes.ok) {
        updateTune(resultId, {
          status: 'error',
          logLines: [...tuneLogLines, `error: ${analyzeData.error || 'Tune failed.'}`],
          logComplete: true,
          isError: true,
        });
        return;
      }

      const answers = [
        answersData.q1 || '',
        answersData.q2 || '',
        'Yes',
        '',
        '',
        'Two weeks notice from offer date',
      ];

      updateTune(resultId, {
        status: 'done',
        logLines: tuneLogLines,
        logComplete: true,
        tunedResume: analyzeData.rewritten_resume || '',
        answers,
      });
    } catch (err) {
      clearInterval(logInterval);
      const msg = err instanceof Error ? err.message : 'Network error.';
      updateTune(resultId, {
        status: 'error',
        logLines: [...tuneLogLines, `error: ${msg}`],
        logComplete: true,
        isError: true,
      });
    }
  }, [results, resumeFile, resumeText, updateTune]);

  const handleTuneClick = useCallback((resultId: string) => {
    const result = results.find(r => r.id === resultId);
    if (!result) return;
    if ((result.overall_score ?? 100) < 70) {
      updateTune(resultId, { ...defaultTuneData(), status: 'confirm' });
    } else {
      void startTune(resultId);
    }
  }, [results, updateTune, startTune]);

  const handleTuneConfirm = useCallback((resultId: string, skip: boolean) => {
    if (skip) {
      updateTune(resultId, defaultTuneData());
    } else {
      void startTune(resultId);
    }
  }, [updateTune, startTune]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const canScore = resumeText.length > 0 &&
    jobs.some(j => getJdText(j).trim().length > 0) &&
    scoringStatus !== 'loading';

  const jobCount = jobs.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />
      <main className="flex-1" style={{ padding: '56px 28px 96px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* A — Header */}
          <div style={{ marginBottom: '48px' }}>
            <p
              className="font-mono"
              style={{ fontSize: '11px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '12px' }}
            >
              APPLY MODE · BETA
            </p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(22px, 3.5vw, 36px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
                marginBottom: '14px',
                lineHeight: 1.2,
              }}
            >
              Score every job <em>first</em>. Apply only to the ones that fit.
            </h1>
            <p
              className="font-mono"
              style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, maxWidth: '560px' }}
            >
              Apply mode scores up to 5 jobs against your resume at once using the ABQE benchmark, then helps you tune your resume for the jobs that match. You stay in control — CareerRefine never submits anything.
            </p>
          </div>

          {/* B — Step 1: Resume */}
          <div
            style={{
              backgroundColor: 'var(--bg-soft)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              marginBottom: '12px',
            }}
          >
            <button
              onClick={() => setStep1Open(o => !o)}
              className="font-mono"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: 'var(--dim)' }}>1</span>
                <span>Your resume</span>
                {resumeText && (
                  <span style={{ color: 'var(--good)', fontWeight: 400 }}>
                    · {resumeFile?.name}
                  </span>
                )}
              </span>
              <span style={{ color: 'var(--dim)', fontSize: '11px' }}>{step1Open ? '▲' : '▼'}</span>
            </button>

            {step1Open && (
              <div style={{ borderTop: '1px solid var(--line)', padding: '24px' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: `1px dashed ${isDragging ? 'var(--accent-dim)' : 'var(--line-strong)'}`,
                    borderRadius: '4px',
                    backgroundColor: isDragging ? 'rgba(155,191,46,0.04)' : 'var(--bg-input)',
                    padding: '28px 24px',
                    cursor: 'pointer',
                    transition: 'border-color 150ms, background-color 150ms',
                    textAlign: 'center',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  {resumeFile ? (
                    <>
                      <p className="font-mono" style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>
                        {resumeFile.name}
                      </p>
                      <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)' }}>
                        {isParsing
                          ? 'Parsing...'
                          : resumeText
                          ? `${resumeTokens.toLocaleString()} tokens · click to replace`
                          : 'click to replace'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
                        Drop file here or click to upload
                      </p>
                      <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)' }}>
                        PDF or DOCX, up to 5 MB
                      </p>
                    </>
                  )}
                </div>

                {fileError && (
                  <p className="font-mono" style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}>
                    {fileError}
                  </p>
                )}
                {parseError && (
                  <p className="font-mono" style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}>
                    {parseError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* C — Step 2: Jobs */}
          <div
            style={{
              backgroundColor: 'var(--bg-soft)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              marginBottom: '12px',
              opacity: resumeText ? 1 : 0.5,
              transition: 'opacity 200ms',
            }}
          >
            <button
              onClick={() => { if (resumeText) setStep2Open(o => !o); }}
              className="font-mono"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                cursor: resumeText ? 'pointer' : 'default',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: 'var(--dim)' }}>2</span>
                <span>The jobs</span>
              </span>
              <span style={{ color: 'var(--dim)', fontSize: '11px' }}>{step2Open ? '▲' : '▼'}</span>
            </button>

            {step2Open && (
              <div style={{ borderTop: '1px solid var(--line)', padding: '24px' }}>
                <p className="font-mono" style={{ fontSize: '12px', color: 'var(--dim)', marginBottom: '20px', lineHeight: 1.6 }}>
                  Paste up to 5 job URLs or descriptions. We&apos;ll try to fetch URLs automatically. If a portal blocks us, paste the JD text directly.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                  {jobs.map((job, i) => (
                    <JobRowItem
                      key={job.id}
                      job={job}
                      index={i}
                      onUpdate={updateJob}
                      onRemove={removeJob}
                    />
                  ))}
                </div>

                {jobCount < 5 ? (
                  <button
                    onClick={addJob}
                    className="font-mono"
                    style={{
                      background: 'none',
                      border: '1px dashed var(--line)',
                      borderRadius: '4px',
                      color: 'var(--dim)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      marginBottom: '20px',
                      transition: 'border-color 150ms, color 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-dim)';
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line)';
                      e.currentTarget.style.color = 'var(--dim)';
                    }}
                  >
                    + Add another job
                  </button>
                ) : (
                  <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: '20px' }}>
                    5 max per batch
                  </p>
                )}

                <button
                  onClick={scoreAllJobs}
                  disabled={!canScore}
                  className="font-mono"
                  style={{
                    width: '100%',
                    backgroundColor: canScore ? 'var(--accent)' : 'var(--bg-input)',
                    color: canScore ? '#000' : 'var(--dim)',
                    border: `1px solid ${canScore ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: '4px',
                    padding: '14px 24px',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    cursor: canScore ? 'pointer' : 'not-allowed',
                    transition: 'transform 150ms, box-shadow 150ms, background-color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    if (!canScore) return;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,255,63,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {scoringStatus === 'loading' ? 'Scoring...' : 'Score all jobs'}
                </button>

                {/* Scoring log */}
                {scoringLog.length > 0 && (
                  <div
                    style={{
                      marginTop: '16px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    {scoringLog.map((line, i) => {
                      const isLast = i === scoringLog.length - 1;
                      const isPulsing =
                        scoringStatus === 'loading' && scoringLogComplete && isLast && !scoringIsError;
                      return (
                        <LogLine
                          key={i}
                          text={line}
                          isError={scoringIsError && isLast}
                          isPulsing={isPulsing}
                          reduced={reduced}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* D — Step 3: Results */}
          {results.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ marginBottom: '20px' }}>
                <p
                  className="font-mono"
                  style={{ fontSize: '11px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '6px' }}
                >
                  3
                </p>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(18px, 2.5vw, 24px)',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: 'var(--text)',
                  }}
                >
                  Your matches
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {results.map((result, i) => (
                  <motion.div
                    key={result.id}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced ? { duration: 0 } : { delay: i * 0.06, duration: 0.3, ease: EASE }}
                  >
                    <ResultCard
                      result={result}
                      index={i}
                      tuneData={tuneMap[result.id] ?? defaultTuneData()}
                      reduced={reduced}
                      onTuneClick={() => handleTuneClick(result.id)}
                      onTuneConfirm={(skip) => handleTuneConfirm(result.id, skip)}
                      onSkipCard={() => updateTune(result.id, { ...defaultTuneData(), skipped: true })}
                      onUpdateTune={(updates) => updateTune(result.id, updates)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
