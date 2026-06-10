import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM =
  'You are a job application assistant. Generate concise, honest answers tailored to the specific resume and job description. Reference the actual company name, job title, and real resume content. Never fabricate experience. Return only valid JSON with keys "q1" and "q2".';

const MODELS = ['claude-opus-4-5', 'claude-sonnet-4-5'] as const;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { resumeText, jdText, jobTitle } = (body ?? {}) as {
    resumeText?: string;
    jdText?: string;
    jobTitle?: string;
  };

  if (!resumeText || !jdText) {
    return Response.json({ error: 'Missing resumeText or jdText.' }, { status: 400 });
  }

  const userMessage =
    `RESUME:\n${resumeText.trim()}\n\n` +
    `JOB DESCRIPTION:\n${jdText.trim()}\n\n` +
    `Job title: ${jobTitle || 'Unknown role'}\n\n` +
    `Generate two job application answers:\n` +
    `1. "Why are you interested in this role?" — 2-3 sentences referencing the company and specific JD aspects.\n` +
    `2. "What is your relevant experience for this role?" — 3-4 sentences referencing specific resume bullets that match the JD.\n\n` +
    `Return ONLY: {"q1": "...", "q2": "..."}`;

  for (const model of MODELS) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
      });

      const block = message.content[0];
      if (block.type !== 'text') throw new Error('Unexpected response');

      const raw = block.text
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '');
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON found');

      const parsed = JSON.parse(raw.slice(start, end + 1));
      return Response.json({ q1: parsed.q1 ?? '', q2: parsed.q2 ?? '' });
    } catch (err) {
      const isModelErr =
        err instanceof Anthropic.NotFoundError ||
        (err instanceof Error && err.message.includes('model'));
      if (isModelErr && model !== MODELS[MODELS.length - 1]) continue;
      return Response.json(
        { error: err instanceof Error ? err.message : 'Generation failed.' },
        { status: 500 },
      );
    }
  }

  return Response.json({ error: 'All models unavailable.' }, { status: 503 });
}
