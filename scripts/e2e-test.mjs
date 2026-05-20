// End-to-end test using Playwright
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const JD = `
Senior Data Engineer — CloudPipe Inc

We're looking for a Senior Data Engineer to join our platform team. You will build
and maintain scalable data pipelines, design and implement APIs for data access,
and collaborate with ML engineers on feature engineering infrastructure.

Requirements:
- 4+ years of experience in data engineering or a closely related role
- Strong Python skills, including pandas, PySpark, or similar libraries
- Expert-level SQL — you write complex queries without looking things up
- Experience designing and maintaining ETL/ELT pipelines
- Familiarity with cloud infrastructure (AWS, GCP, or Azure)
- Strong communication skills; you can explain technical tradeoffs clearly

Nice to have:
- Experience with Airflow, dbt, or similar orchestration tools
- Exposure to MLOps or feature stores
- Contributions to open-source data tooling

We are a remote-first company. You will be expected to lead data initiatives,
mentor junior engineers, and take ownership of the data platform roadmap.
`.trim();

async function run() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // ── 1. Load homepage ──────────────────────────────────────────────────────
  console.log('1. Loading homepage...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: join(ROOT, 'screenshots/01-homepage.png'), fullPage: true });
  console.log('   → screenshot 01-homepage.png');

  // Check for console errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  // ── 2. Verify key UI elements ─────────────────────────────────────────────
  console.log('2. Checking UI elements...');
  const navText = await page.locator('header').innerText();
  console.log('   Nav:', navText.trim().replace(/\n/g, ' | '));

  const heroText = await page.locator('h1').innerText();
  console.log('   H1:', heroText.trim().substring(0, 80));

  const emptyState = await page.locator('text=Nothing to score yet').isVisible();
  console.log('   Empty state visible:', emptyState);

  // ── 3. Test /api/analyze via POST ─────────────────────────────────────────
  console.log('\n3. Testing /api/analyze endpoint...');
  const resumeBuffer = readFileSync(join(ROOT, 'test-resume.docx'));

  const apiResult = await page.evaluate(async ([jd, resumeB64]) => {
    const bytes = Uint8Array.from(atob(resumeB64), c => c.charCodeAt(0));
    const file = new File([bytes], 'test-resume.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const form = new FormData();
    form.append('resume', file);
    form.append('jd', jd);
    const res = await fetch('/api/analyze', { method: 'POST', body: form });
    const text = await res.text();
    return { status: res.status, body: text };
  }, [JD, resumeBuffer.toString('base64')]);

  if (apiResult.status !== 200) {
    console.error('   ANALYZE FAILED:', apiResult.status, apiResult.body.substring(0, 500));
    await browser.close();
    process.exit(1);
  }

  const analysis = JSON.parse(apiResult.body);
  console.log('   overall_score:', analysis.overall_score);
  console.log('   verdict:', analysis.verdict);
  console.log('   factor_scores:');
  for (const [k, v] of Object.entries(analysis.factor_scores)) {
    console.log(`     ${k}: ${v.score}`);
  }
  console.log('   findings count:', analysis.findings.length);
  console.log('   findings:');
  for (const f of analysis.findings) {
    console.log(`     [${f.severity}] ${f.factor}: ${f.issue.substring(0, 60)}`);
  }
  console.log('   rewritten_resume length:', analysis.rewritten_resume?.length ?? 0, 'chars');

  // ── 4. Test /api/export ───────────────────────────────────────────────────
  console.log('\n4. Testing /api/export endpoint...');
  const exportResult = await page.evaluate(async (rewritten) => {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewritten_resume: rewritten }),
    });
    const contentType = res.headers.get('content-type') ?? '';
    const blob = await res.blob();
    return { status: res.status, contentType, size: blob.size };
  }, analysis.rewritten_resume);

  console.log('   status:', exportResult.status);
  console.log('   content-type:', exportResult.contentType);
  console.log('   docx size:', exportResult.size, 'bytes');
  if (exportResult.status !== 200 || !exportResult.contentType.includes('wordprocessingml')) {
    console.error('   EXPORT FAILED');
    await browser.close();
    process.exit(1);
  }

  // Write the analysis JSON for inspection
  writeFileSync(join(ROOT, 'screenshots/analysis-result.json'), JSON.stringify(analysis, null, 2));

  // ── 5. Drive the UI with results injected ─────────────────────────────────
  console.log('\n5. Checking results panel renders...');

  // Fill the JD textarea via keyboard (React controlled input)
  await page.locator('textarea').fill(JD);

  // Upload the file via the hidden input
  await page.locator('input[type="file"]').setInputFiles(join(ROOT, 'test-resume.docx'));
  await page.waitForTimeout(300);

  // Check button is now active
  const btnEnabled = !(await page.locator('button:has-text("Analyze Resume")').isDisabled());
  console.log('   Analyze button enabled:', btnEnabled);

  await page.screenshot({ path: join(ROOT, 'screenshots/02-ready-to-submit.png'), fullPage: true });
  console.log('   → screenshot 02-ready-to-submit.png');

  // ── 6. Console errors check ───────────────────────────────────────────────
  console.log('\n6. Console errors:', errors.length === 0 ? 'none' : errors.join('\n   '));

  await browser.close();
  console.log('\n✓ End-to-end test complete.');
}

run().catch(err => { console.error('Test error:', err); process.exit(1); });
