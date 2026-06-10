import { NextRequest } from 'next/server';
import { load } from 'cheerio';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, reason: 'invalid_input' });
  }

  const { url } = (body as { url?: string }) ?? {};
  if (!url || typeof url !== 'string') {
    return Response.json({ ok: false, reason: 'invalid_url' });
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return Response.json({ ok: false, reason: 'blocked' });
    html = await res.text();
  } catch (err) {
    return Response.json({
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Fetch failed',
    });
  }

  try {
    const $ = load(html);

    const title =
      $('meta[property="og:title"]').attr('content') || $('title').text().trim() || '';

    let hostname = '';
    try {
      hostname = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      // ignore
    }

    // Remove non-content elements
    $('nav, footer, script, style, header, aside, iframe, [aria-hidden="true"]').remove();

    let text = '';

    // Strategy 1: JSON-LD JobPosting
    $('script[type="application/ld+json"]').each((_, el) => {
      if (text) return;
      try {
        const data = JSON.parse($(el).text());
        const items: unknown[] = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const obj = item as Record<string, unknown>;
          if (obj['@type'] === 'JobPosting' && typeof obj.description === 'string') {
            text = load(obj.description).text().trim();
            break;
          }
        }
      } catch {
        // ignore malformed LD+JSON
      }
    });

    // Strategy 2: common JD container selectors
    if (text.length < 200) {
      const selectors = [
        'div[class*="job-description"]',
        'section[class*="description"]',
        'div#job-description',
        'div.posting',
        '[data-test="jobDescription"]',
        'main article',
        'main',
      ];
      for (const sel of selectors) {
        const el = $(sel).first();
        if (el.length) {
          const candidate = el.text().replace(/\s+/g, ' ').trim();
          if (candidate.length > 200) {
            text = candidate;
            break;
          }
        }
      }
    }

    // Strategy 3: full body fallback
    if (text.length < 200) {
      text = $('body').text().replace(/\s+/g, ' ').trim();
    }

    if (text.length < 200) return Response.json({ ok: false, reason: 'empty' });

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Response.json({ ok: true, text, title, source: hostname, wordCount });
  } catch (err) {
    return Response.json({
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Parse failed',
    });
  }
}
