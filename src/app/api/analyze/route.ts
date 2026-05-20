import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';

const client = new Anthropic();

const systemPrompt = readFileSync(
  join(process.cwd(), 'src', 'lib', 'system-prompt.md'),
  'utf-8',
);

async function parsePdf(buf: Buffer): Promise<string> {
  // Dynamic import avoids Next.js bundler conflict with pdf-parse's internal test file reads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('pdf-parse');
  const parse = mod.default ?? mod;
  const result = await parse(buf);
  return result.text as string;
}

function extractJson(text: string): string {
  let t = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return t.slice(start, end + 1);
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Could not parse form data.' }, { status: 400 });
  }

  const resumeFile = formData.get('resume');
  const jd = (formData.get('jd') as string | null) ?? '';

  if (!resumeFile || typeof resumeFile === 'string') {
    return Response.json({ error: 'No resume file attached.' }, { status: 400 });
  }

  const file = resumeFile as File;
  const name = file.name.toLowerCase();

  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
    return Response.json({ error: 'Resume must be a PDF or DOCX file.' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: 'Resume file exceeds the 5 MB limit.' }, { status: 400 });
  }

  let resumeText: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    if (name.endsWith('.pdf')) {
      resumeText = await parsePdf(buf);
    } else {
      const result = await mammoth.extractRawText({ buffer: buf });
      resumeText = result.value;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown parse error';
    return Response.json({ error: `Failed to read resume: ${msg}` }, { status: 422 });
  }

  if (!resumeText || resumeText.trim().length < 50) {
    return Response.json(
      { error: 'Could not extract enough text from the resume. Try a different file.' },
      { status: 422 },
    );
  }

  const userMessage =
    `RESUME:\n${resumeText.trim()}\n\nJOB DESCRIPTION:\n${jd.trim() || '(none provided)'}\n\nReply with ONLY the JSON object. No code fences. No preamble. Start your response with { and end with }.`;

  const MODELS = ['claude-opus-4-5', 'claude-sonnet-4-5'] as const;
  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const block = message.content[0];
      if (block.type !== 'text') {
        return Response.json({ error: 'Unexpected response type from analysis engine.' }, { status: 500 });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(extractJson(block.text));
      } catch {
        console.error('[analyze] JSON parse failed. Raw response:\n', block.text);
        return Response.json(
          { error: 'Analysis engine returned malformed JSON. Please try again.' },
          { status: 502 },
        );
      }

      return Response.json(parsed);
    } catch (err) {
      const isModelError =
        err instanceof Anthropic.NotFoundError ||
        (err instanceof Error && err.message.includes('model'));

      if (isModelError && model !== MODELS[MODELS.length - 1]) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      const msg = err instanceof Error ? err.message : 'Unknown error';
      return Response.json({ error: `Analysis failed: ${msg}` }, { status: 500 });
    }
  }

  return Response.json(
    { error: lastError?.message ?? 'All models unavailable.' },
    { status: 503 },
  );
}
