export default function Footer() {
  return (
    <footer
      className="mt-auto"
      style={{ borderTop: '1px solid var(--line)', padding: '20px 28px' }}
    >
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 mx-auto font-mono"
        style={{ maxWidth: '1180px', fontSize: '11px', color: 'var(--dim)' }}
      >
        <span>CareerRefine</span>
        <Dot />
        <span>
          Built on the{' '}
          <a
            href="https://doi.org/10.5281/zenodo.18072532"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--muted)', textDecoration: 'underline', textDecorationColor: 'var(--line-strong)' }}
          >
            ABQE benchmark
          </a>{' '}
          (Lingineni, 2025)
        </span>
        <Dot />
        <a
          href="https://github.com/vigneshlingineni"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--dim)' }}
        >
          github
        </a>
        <Dot />
        <span>Resumes are processed in-memory and not stored.</span>
      </div>
    </footer>
  );
}

function Dot() {
  return <span style={{ color: 'var(--line-strong)' }}>·</span>;
}
