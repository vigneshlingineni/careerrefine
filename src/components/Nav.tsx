'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className="font-mono"
      style={{
        fontSize: '13px',
        color: active ? 'var(--text)' : 'var(--dim)',
        letterSpacing: '0.02em',
        textDecoration: 'none',
        paddingBottom: '2px',
        borderBottom: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
        transition: 'color 150ms, border-color 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--accent)';
        if (!active) e.currentTarget.style.borderBottomColor = 'var(--accent-dim)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? 'var(--text)' : 'var(--dim)';
        e.currentTarget.style.borderBottomColor = active ? 'var(--accent)' : 'transparent';
      }}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  return (
    <header
      className="sticky top-0 z-50"
      style={{ backgroundColor: 'var(--bg-soft)', borderBottom: '1px solid var(--line)' }}
    >
      <div
        className="flex items-center justify-between mx-auto"
        style={{ maxWidth: '1180px', padding: '0 28px', height: '56px' }}
      >
        <Link
          href="/"
          className="font-serif"
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            textDecoration: 'none',
          }}
        >
          CareerRefine
        </Link>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <NavLink href="/analyze" label="Scan" />
          <NavLink href="/apply" label="Apply mode" />
        </div>
      </div>
    </header>
  );
}
