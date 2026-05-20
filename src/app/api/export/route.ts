import { NextRequest } from 'next/server';
import { Document, Paragraph, TextRun, Packer, HeadingLevel } from 'docx';

function buildParagraphs(text: string): Paragraph[] {
  return text.split('\n').map(line => {
    const trimmed = line.trim();

    // All-caps section headers (e.g. "EXPERIENCE", "SKILLS")
    const isHeader = trimmed.length > 3 && /^[A-Z][A-Z\s\-/&]{2,}$/.test(trimmed);

    if (isHeader) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: trimmed, bold: true, size: 24, color: '000000' })],
      });
    }

    if (trimmed === '') {
      return new Paragraph({ spacing: { after: 80 } });
    }

    // Preserve bullet character from source text; no docx bullet API needed
    return new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: trimmed, size: 20, color: '111111' })],
    });
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('rewritten_resume' in body) ||
    typeof (body as Record<string, unknown>).rewritten_resume !== 'string'
  ) {
    return Response.json({ error: 'Missing rewritten_resume string.' }, { status: 400 });
  }

  const resumeText = (body as { rewritten_resume: string }).rewritten_resume;

  if (!resumeText.trim()) {
    return Response.json({ error: 'rewritten_resume is empty.' }, { status: 400 });
  }

  try {
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 20 },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
            },
          },
          children: buildParagraphs(resumeText),
        },
      ],
    });

    const buf = await Packer.toBuffer(doc);

    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="rewritten-resume.docx"',
        'Content-Length': String(buf.byteLength),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `DOCX generation failed: ${msg}` }, { status: 500 });
  }
}
