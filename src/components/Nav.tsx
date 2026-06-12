'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

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

function AuthSlot() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // undefined = loading — render nothing to avoid flicker
  if (user === undefined) return null;

  if (user === null) {
    return (
      <button
        onClick={() => {
          const supabase = createClient();
          void supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
            },
          });
        }}
        className="font-mono"
        style={{
          background: 'transparent',
          border: '1px solid var(--line)',
          borderRadius: '4px',
          color: 'var(--dim)',
          fontSize: '12px',
          cursor: 'pointer',
          padding: '5px 12px',
          letterSpacing: '0.02em',
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
        Sign in →
      </button>
    );
  }

  const email = user.email ?? '';
  const displayEmail = email.length > 20 ? email.slice(0, 20) + '…' : email;
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initial = ((user.user_metadata?.full_name as string | undefined) ?? email)[0]?.toUpperCase() ?? '?';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Email pill linking to /account */}
      <Link
        href="/account"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--line)',
          borderRadius: '100px',
          padding: '3px 10px 3px 4px',
          transition: 'border-color 150ms',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--line-strong)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--line)';
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={18}
            height={18}
            style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }}
          />
        ) : (
          <span
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-soft)',
              border: '1px solid var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              color: 'var(--dim)',
              flexShrink: 0,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {initial}
          </span>
        )}
        <span
          className="font-mono"
          style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '0.01em' }}
        >
          {displayEmail}
        </span>
      </Link>

      {/* Sign out */}
      <button
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.refresh();
        }}
        className="font-mono"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--dim)',
          fontSize: '12px',
          cursor: 'pointer',
          padding: '0',
          letterSpacing: '0.02em',
          transition: 'color 150ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--dim)'; }}
      >
        Sign out
      </button>
    </div>
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
          <AuthSlot />
        </div>
      </div>
    </header>
  );
}
