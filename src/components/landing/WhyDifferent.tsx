'use client';

import { useRef, useEffect, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

const SAMPLE_FINDING =
  '> "Skills lists \'Azure Data Factory\' but no bullet\n   demonstrates it"';

function TypewriterBlock({
  text,
  trigger,
}: {
  text: string;
  trigger: boolean;
}) {
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState('');
  const fired = useRef(false);

  useEffect(() => {
    if (!trigger || fired.current) return;
    fired.current = true;
    if (reduced) {
      setDisplayed(text);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [trigger, text, reduced]);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-input)',
        borderLeft: '2px solid var(--accent-dim)',
        borderRadius: '0 4px 4px 0',
        padding: '12px 14px',
        marginTop: '16px',
        minHeight: '62px',
      }}
    >
      <pre
        className="font-mono"
        style={{
          fontSize: '11px',
          color: 'var(--muted)',
          lineHeight: 1.65,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {displayed}
        {!reduced && displayed.length < text.length && (
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '11px',
              backgroundColor: 'var(--dim)',
              verticalAlign: 'text-bottom',
            }}
          />
        )}
      </pre>
    </div>
  );
}

interface CardProps {
  kicker: string;
  heading: string;
  body: React.ReactNode;
}

function Card({ kicker, heading, body }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-soft)',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        padding: '28px 24px',
      }}
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
        {kicker}
      </p>
      <h3
        className="font-serif"
        style={{
          fontSize: '18px',
          fontWeight: 400,
          letterSpacing: '-0.015em',
          color: 'var(--text)',
          marginBottom: '14px',
          lineHeight: 1.3,
        }}
      >
        {heading}
      </h3>
      <div
        className="font-mono"
        style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.75 }}
      >
        {body}
      </div>
    </div>
  );
}

export default function WhyDifferent() {
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
            margin: '0 0 40px 0',
          }}
        >
          Why this is different.
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card
            kicker="PEER-REVIEWED BASIS"
            heading="Built on a published benchmark"
            body={
              <>
                The ABQE benchmark quantifies how four resume attributes affect
                algorithmic hiring decisions, with measured effect sizes across a
                large corpus.{' '}
                <a
                  href="https://doi.org/10.5281/zenodo.18072532"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--muted)',
                    textDecoration: 'underline',
                    textDecorationColor: 'var(--line-strong)',
                  }}
                >
                  Lingineni 2025
                </a>{' '}
                is the source — every weight in this tool traces back to it.
              </>
            }
          />

          <Card
            kicker="SPECIFIC EVIDENCE"
            heading="Every finding cites the exact line."
            body={
              <>
                No generic advice. The finding identifies the specific token,
                phrase, or gap that triggered the penalty — with a targeted
                rewrite recommendation.
                <TypewriterBlock text={SAMPLE_FINDING} trigger={inView} />
              </>
            }
          />

          <Card
            kicker="NO BLOAT"
            heading="No signup, no upsell, no stored data."
            body={
              <>
                Submit a resume and a job description, get a scored report.
                Resumes are processed in memory and immediately discarded —
                nothing is logged, retained, or sold.
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
