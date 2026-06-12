import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ResumeUploadForm from '@/components/ResumeUploadForm';

export default function ResumePage() {
  return (
    <>
      <Nav />
      <main className="flex-1" style={{ padding: '56px 28px 96px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Back link */}
          <Link
            href="/account"
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
            ← back to account
          </Link>

          {/* Heading */}
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(22px, 3vw, 32px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              marginBottom: '10px',
              lineHeight: 1.2,
            }}
          >
            Save your resume.
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
            We extract the text once. Future scans reuse it automatically. Replace anytime.
          </p>

          <ResumeUploadForm />

        </div>
      </main>
      <Footer />
    </>
  );
}
