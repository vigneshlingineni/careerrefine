import { NextRequest } from 'next/server';
import mammoth from 'mammoth';
import { createClient } from '@/lib/supabase/server';

async function parsePdf(buf: Buffer): Promise<string> {
  // Dynamic import avoids Next.js bundler conflict with pdf-parse's internal test file reads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('pdf-parse');
  const parse = mod.default ?? mod;
  const result = await parse(buf);
  return result.text as string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ ok: false, error: 'Could not parse form data.' });
  }

  const resumeFile = formData.get('resume');
  if (!resumeFile || typeof resumeFile === 'string') {
    return Response.json({ ok: false, error: 'No file attached.' });
  }

  const file = resumeFile as File;
  const name = file.name.toLowerCase();

  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
    return Response.json({ ok: false, error: 'Only PDF and DOCX files are supported.' });
  }

  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ ok: false, error: 'File must be under 5 MB.' });
  }

  let text: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    if (name.endsWith('.pdf')) {
      text = await parsePdf(buf);
    } else {
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown parse error';
    return Response.json({ ok: false, error: `Failed to read file: ${msg}` });
  }

  if (!text || text.trim().length < 50) {
    return Response.json({ ok: false, error: 'Could not extract enough text from this file. Try a different file.' });
  }

  const { error: dbError } = await supabase.from('profiles').upsert({
    id: user.id,
    saved_resume_text: text.trim(),
    saved_resume_filename: file.name,
    saved_resume_updated_at: new Date().toISOString(),
  });

  if (dbError) {
    return Response.json({ ok: false, error: `Could not save to profile: ${dbError.message}` });
  }

  const tokens = Math.round(text.trim().length / 4);
  return Response.json({ ok: true, tokens, filename: file.name });
}
