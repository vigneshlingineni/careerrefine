'use client';

import Link from 'next/link';

export default function GhostLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-mono"
      style={{
        display: 'inline-block',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        padding: '9px 18px',
        fontSize: '12px',
        color: 'var(--muted)',
        textDecoration: 'none',
        letterSpacing: '0.02em',
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
      {children}
    </Link>
  );
}
