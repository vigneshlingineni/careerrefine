'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RemoveResumeButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('profiles')
          .update({
            saved_resume_text: null,
            saved_resume_filename: null,
            saved_resume_updated_at: null,
          })
          .eq('id', user.id);

        router.refresh();
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
        e.currentTarget.style.borderColor = 'var(--danger)';
        e.currentTarget.style.color = 'var(--danger)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--dim)';
      }}
    >
      Remove
    </button>
  );
}
