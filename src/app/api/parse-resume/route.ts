import { NextRequest } from 'next/server';
import mammoth from 'mammoth';

async function parsePdf(buf: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('pdf-parse');
  const parse = mod.default ?? mod;
  return (await parse(buf)).text as string;
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Could not parse form data.' }, { status: 400 });
  }

  const resumeFile = formData.get('resume');
  if (!resumeFile || typeof resumeFile === 'string') {
    return Response.json({ error: 'No resume file attached.' }, { status: 400 });
  }

  const file = resumeFile as File;
  const name = file.name.toLowerCase();

  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
    return Response.json({ error: 'Resume must be a PDF or DOCX file.' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: 'File exceeds the 5 MB limit.' }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const text = name.endsWith('.pdf')
      ? await parsePdf(buf)
      : (await mammoth.extractRawText({ buffer: buf })).value;

    if (!text || text.trim().length < 50) {
      return Response.json(
        { error: 'Could not extract enough text from the resume. Try a different file.' },
        { status: 422 },
      );
    }

    const tokenEstimate = Math.round(text.trim().length / 4);
    return Response.json({ text: text.trim(), tokenEstimate });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown parse error';
    return Response.json({ error: `Failed to read resume: ${msg}` }, { status: 422 });
  }
}
