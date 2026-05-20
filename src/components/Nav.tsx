import Link from 'next/link';

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
        <Link
          href="/analyze"
          className="font-mono"
          style={{
            fontSize: '12px',
            color: 'var(--muted)',
            letterSpacing: '0.02em',
            textDecoration: 'none',
          }}
        >
          Try it →
        </Link>
      </div>
    </header>
  );
}
