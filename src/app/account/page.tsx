import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import SignOutButton from '@/components/SignOutButton';
import RemoveResumeButton from '@/components/RemoveResumeButton';
import GhostLink from '@/components/GhostLink';
import { createClient } from '@/lib/supabase/server';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--dim)';
  if (score >= 80) return 'var(--accent)';
  if (score >= 50) return 'var(--warn)';
  return 'var(--danger)';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanRow {
  id: string;
  jd_title: string | null;
  jd_source: string | null;
  overall_score: number | null;
  created_at: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [profileRes, scansRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, saved_resume_filename, saved_resume_updated_at, saved_resume_text')
      .eq('id', user.id)
      .single(),
    supabase
      .from('scans')
      .select('id, jd_title, jd_source, overall_score, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  const profile = profileRes.data as {
    full_name: string | null;
    saved_resume_filename: string | null;
    saved_resume_updated_at: string | null;
    saved_resume_text: string | null;
  } | null;

  const scans = (scansRes.data ?? []) as ScanRow[];
  const totalScans = scansRes.count ?? scans.length;

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const charCount = profile?.saved_resume_text?.length ?? 0;
  const tokenEst = Math.round(charCount / 4);
  const hasResume = charCount > 0;

  return (
    <>
      <Nav />
      <main style={{ paddingTop: '96px', paddingBottom: '96px', paddingLeft: '28px', paddingRight: '28px' }}>
        <div style={{ maxWidth: '920px', margin: '0 auto' }}>

          {/* ── A: Header ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: '56px' }}>
            <p
              className="font-mono"
              style={{
                fontSize: '11px',
                color: 'var(--dim)',
                letterSpacing: '0.1em',
                marginBottom: '16px',
              }}
            >
              ACCOUNT
            </p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
                lineHeight: 1.15,
                marginBottom: '12px',
              }}
            >
              Welcome back, {firstName}.
            </h1>
            <p
              className="font-mono"
              style={{ fontSize: '12px', color: 'var(--dim)', letterSpacing: '0.01em' }}
            >
              {user.email}
            </p>
          </div>

          {/* ── B: Saved Resume ────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '40px', marginBottom: '48px' }}>
            <h2
              className="font-serif"
              style={{
                fontSize: '20px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: 'var(--text)',
                marginBottom: '8px',
              }}
            >
              Your saved resume
            </h2>
            <p
              className="font-mono"
              style={{
                fontSize: '12px',
                color: 'var(--dim)',
                marginBottom: '28px',
                lineHeight: 1.6,
              }}
            >
              Used as the default for every scan and apply session.
            </p>

            {hasResume ? (
              <div>
                {/* Filename + stats */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '12px',
                      color: 'var(--text)',
                      backgroundColor: 'var(--bg-soft)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {profile?.saved_resume_filename ?? 'resume'}
                  </span>
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--dim)' }}>
                    {charCount.toLocaleString()} chars · ~{tokenEst.toLocaleString()} tokens
                  </span>
                </div>
                {profile?.saved_resume_updated_at && (
                  <p
                    className="font-mono"
                    style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: '24px' }}
                  >
                    updated {timeAgo(profile.saved_resume_updated_at)}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <GhostLink href="/account/resume">Replace resume →</GhostLink>
                  <RemoveResumeButton />
                </div>
              </div>
            ) : (
              <div>
                <GhostLink href="/account/resume">Upload resume →</GhostLink>
                <p
                  className="font-mono"
                  style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '10px', lineHeight: 1.5 }}
                >
                  PDF or DOCX. We extract the text and remember it.
                </p>
              </div>
            )}
          </div>

          {/* ── C: Scan History ────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '40px', marginBottom: '64px' }}>
            <h2
              className="font-serif"
              style={{
                fontSize: '20px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: 'var(--text)',
                marginBottom: '28px',
              }}
            >
              Scan history
            </h2>

            {scans.length === 0 ? (
              <div>
                <p
                  className="font-mono"
                  style={{ fontSize: '13px', color: 'var(--dim)', marginBottom: '16px', lineHeight: 1.6 }}
                >
                  No scans yet.
                </p>
                <GhostLink href="/analyze">Run your first scan →</GhostLink>
              </div>
            ) : (
              <div>
                {/* Table rows */}
                <div>
                  {scans.map((scan, i) => (
                    <div
                      key={scan.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        padding: '14px 0',
                        borderTop: i === 0 ? '1px solid var(--line)' : undefined,
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      {/* Score */}
                      <span
                        className="font-serif"
                        style={{
                          fontSize: '24px',
                          fontWeight: 600,
                          lineHeight: 1,
                          letterSpacing: '-0.02em',
                          color: scoreColor(scan.overall_score),
                          flexShrink: 0,
                          width: '40px',
                          textAlign: 'right',
                        }}
                      >
                        {scan.overall_score ?? '—'}
                      </span>

                      {/* Title */}
                      <span
                        className="font-serif"
                        style={{
                          fontSize: '14px',
                          color: 'var(--text)',
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {scan.jd_title
                          ? (scan.jd_title.length > 50 ? scan.jd_title.slice(0, 50) + '…' : scan.jd_title)
                          : 'Position'}
                      </span>

                      {/* Source */}
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '11px',
                          color: 'var(--dim)',
                          flexShrink: 0,
                          width: '100px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {scan.jd_source ?? '—'}
                      </span>

                      {/* Timestamp */}
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '11px',
                          color: 'var(--dim)',
                          flexShrink: 0,
                          width: '72px',
                          textAlign: 'right',
                        }}
                      >
                        {timeAgo(scan.created_at)}
                      </span>

                      {/* View link */}
                      <a
                        href={`/account/scans/${scan.id}`}
                        className="account-view-link"
                        style={{ flexShrink: 0 }}
                      >
                        ↗
                      </a>
                    </div>
                  ))}
                </div>

                {/* Pagination footer */}
                {totalScans > 25 && (
                  <p
                    className="font-mono"
                    style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '16px' }}
                  >
                    Showing latest 25 of {totalScans.toLocaleString()} scans
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── D: Sign out ────────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '40px' }}>
            <SignOutButton />
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
