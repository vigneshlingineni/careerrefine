'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
      }}
      className="font-mono"
      style={{
        background: 'transparent',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        color: 'var(--dim)',
        fontSize: '12px',
        cursor: 'pointer',
        padding: '9px 18px',
        letterSpacing: '0.02em',
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
      Sign out
    </button>
  );
}
