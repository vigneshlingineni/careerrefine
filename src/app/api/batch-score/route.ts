import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const systemPrompt = readFileSync(
  join(process.cwd(), 'src', 'lib', 'system-prompt.md'),
  'utf-8',
);

interface JobInput {
  id: string;
  jdText: string;
  title?: string;
  source?: string;
  url?: string;
}

const MODELS = ['claude-opus-4-5', 'claude-sonnet-4-5'] as const;

function extractJson(text: string): string {
  const t = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  return t.slice(start, end + 1);
}

async function scoreOneJob(resumeText: string, job: JobInput) {
  const userMessage =
    `RESUME:\n${resumeText.trim()}\n\nJOB DESCRIPTION:\n${job.jdText.trim()}\n\n` +
    `Set rewritten_resume to null — rewrites happen later per-job.\n\n` +
    `Reply with ONLY the JSON object. No code fences. No preamble. Start your response with { and end with }.`;

  for (const model of MODELS) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const block = message.content[0];
      if (block.type !== 'text') throw new Error('Unexpected response type');
      const parsed = JSON.parse(extractJson(block.text));
      return { id: job.id, title: job.title, source: job.source, url: job.url, ...parsed };
    } catch (err) {
      const isModelErr =
        err instanceof Anthropic.NotFoundError ||
        (err instanceof Error && err.message.includes('model'));
      if (isModelErr && model !== MODELS[MODELS.length - 1]) continue;
      throw err;
    }
  }
  throw new Error('All models unavailable');
}

async function batchWithLimit<T>(
  items: JobInput[],
  limit: number,
  fn: (item: JobInput) => Promise<T>,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (err) {
        results[i] = { status: 'rejected', reason: err };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { resumeText, jobs } = (body ?? {}) as {
    resumeText?: string;
    jobs?: JobInput[];
  };

  if (!resumeText || typeof resumeText !== 'string' || !Array.isArray(jobs) || jobs.length === 0) {
    return Response.json({ error: 'Missing resumeText or jobs array.' }, { status: 400 });
  }
  if (jobs.length > 5) {
    return Response.json({ error: 'Maximum 5 jobs per batch.' }, { status: 400 });
  }

  const settled = await batchWithLimit(jobs, 3, (job) => scoreOneJob(resumeText, job));

  const results = settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      id: jobs[i].id,
      title: jobs[i].title,
      source: jobs[i].source,
      url: jobs[i].url,
      error: r.reason instanceof Error ? r.reason.message : 'Scoring failed',
    };
  });

  return Response.json({ results });
}
