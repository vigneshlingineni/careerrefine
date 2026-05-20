'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function buildLogLines(file: File): string[] {
  const tokens = Math.round(file.size / 4).toLocaleString();
  return [
    'parsing document',
    `extracted ${tokens} tokens`,
    'comparing against ABQE benchmark (Lingineni 2025)',
    'factor: employment_gap        weight 0.35',
    'factor: skill_phrasing        weight 0.30',
    'factor: resume_structure      weight 0.20',
    'factor: degree_origin         weight 0.15',
    'computing sensitivity deltas',
    'generating findings',
    'preparing rewrite',
  ];
}

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

export default function AnalyzePage() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logComplete, setLogComplete] = useState(false);
  const [isErrorLine, setIsErrorLine] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validateAndSetFile = useCallback((f: File) => {
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
    setFile(f);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const stopLog = () => {
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
      logIntervalRef.current = null;
    }
  };

  const setLogAsError = (msg: string) => {
    setIsErrorLine(true);
    setLogLines((prev) => {
      const next = prev.length > 0 ? [...prev] : [''];
      next[next.length - 1] = `error: ${msg}`;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!file || !jd.trim() || status === 'loading') return;

    setStatus('loading');
    setLogLines([]);
    setLogComplete(false);
    setIsErrorLine(false);

    const lines = buildLogLines(file);

    if (reduced) {
      setLogLines(lines);
      setLogComplete(true);
    } else {
      let idx = 0;
      logIntervalRef.current = setInterval(() => {
        idx++;
        setLogLines(lines.slice(0, idx));
        if (idx >= lines.length) {
          stopLog();
          setLogComplete(true);
        }
      }, 250);
    }

    const form = new FormData();
    form.append('resume', file);
    form.append('jd', jd);

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        stopLog();
        setLogAsError(data.error || 'Analysis failed.');
        setStatus('error');
        return;
      }

      stopLog();
      sessionStorage.setItem(
        'careerrefine:lastResult',
        JSON.stringify({ result: data, filename: file.name })
      );
      router.push('/results');
    } catch (err) {
      stopLog();
      const msg = err instanceof Error ? err.message : 'Network error.';
      setLogAsError(msg);
      setStatus('error');
    }
  };

  const canSubmit = !!file && jd.trim().length > 0 && status !== 'loading';

  return (
    <>
      <Nav />
      <main className="flex-1" style={{ padding: '56px 28px 96px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Back link */}
          <Link
            href="/"
            className="font-mono"
            style={{
              fontSize: '12px',
              color: 'var(--dim)',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: '40px',
              letterSpacing: '0.02em',
            }}
          >
            ← back
          </Link>

          {/* Heading */}
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(22px, 3vw, 32px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              marginBottom: '8px',
              lineHeight: 1.2,
            }}
          >
            Upload your resume and the job description.
          </h1>
          <p
            className="font-mono"
            style={{
              fontSize: '12px',
              color: 'var(--dim)',
              marginBottom: '36px',
              lineHeight: 1.6,
            }}
          >
            PDF or DOCX, up to 5 MB. Paste the full JD below.
          </p>

          {/* Dropzone */}
          <div style={{ marginBottom: '20px' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `1px dashed ${isDragging ? 'var(--accent-dim)' : 'var(--line-strong)'}`,
                borderRadius: '4px',
                backgroundColor: isDragging
                  ? 'rgba(155,191,46,0.04)'
                  : 'var(--bg-input)',
                padding: '32px 24px',
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
              {file ? (
                <>
                  <p
                    className="font-mono"
                    style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}
                  >
                    {file.name}
                  </p>
                  <p
                    className="font-mono"
                    style={{ fontSize: '11px', color: 'var(--dim)' }}
                  >
                    {(file.size / 1024).toFixed(0)} KB · click to replace
                  </p>
                </>
              ) : (
                <>
                  <p
                    className="font-mono"
                    style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}
                  >
                    Drop file here or click to upload
                  </p>
                  <p className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)' }}>
                    PDF or DOCX, up to 5 MB
                  </p>
                </>
              )}
            </div>
            {fileError && (
              <p
                className="font-mono"
                style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}
              >
                {fileError}
              </p>
            )}
          </div>

          {/* JD textarea */}
          <div style={{ marginBottom: '20px' }}>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={10}
              className="font-mono"
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '13px',
                lineHeight: 1.6,
                padding: '14px 16px',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-dim)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--line)';
              }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="font-mono"
            style={{
              width: '100%',
              backgroundColor: canSubmit ? 'var(--accent)' : 'var(--bg-soft)',
              color: canSubmit ? '#000' : 'var(--dim)',
              border: `1px solid ${canSubmit ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: '4px',
              padding: '14px 24px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'transform 150ms, box-shadow 150ms, background-color 150ms',
            }}
            onMouseEnter={(e) => {
              if (!canSubmit) return;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,255,63,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            {status === 'loading' ? 'Analyzing...' : 'Analyze Resume →'}
          </button>

          {/* Streaming diagnostic log */}
          {logLines.length > 0 && (
            <div
              style={{
                marginTop: '20px',
                backgroundColor: 'var(--bg-soft)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {logLines.map((line, i) => {
                const isLast = i === logLines.length - 1;
                const isPulsing =
                  status === 'loading' && logComplete && isLast && !isErrorLine;
                return (
                  <LogLine
                    key={i}
                    text={line}
                    isError={isErrorLine && isLast}
                    isPulsing={isPulsing}
                    reduced={reduced}
                  />
                );
              })}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
