-----

## name: careerrefine-design
description: Design system and aesthetic rules for CareerRefine — an AI resume scoring & rewrite tool built on the ABQE bias benchmark. Use whenever building or editing any UI, page, component, or styling for this project. Enforces a serious, research-credible, product-tool aesthetic. Prevents generic SaaS-template look.

# CareerRefine Design System

This skill defines the visual identity of CareerRefine. The brief:
this is a **tool**, not a marketing site. It looks like something
researchers and senior engineers would trust. Editorial-technical,
quietly confident, never gimmicky. The credibility cue (peer-reviewed
research backing) should be felt through restraint, not loud badges.

## Aesthetic direction

Dark, instrumental, precise. Think: scientific instrument crossed with
a clean developer tool. Generous monospace. Sharp dividers. Numbers
shown like measurements, not marketing stats. A single accent color
used like a status indicator, not decoration.

The opposite of “AI startup landing page.” No gradients on hero text,
no glowing orbs, no “powered by AI” sparkle emojis.

## Color tokens

- `--bg: #0a0a0b`         page background
- `--bg-soft: #111113`    raised surfaces, cards, input fields
- `--bg-input: #16161a`   form inputs, file dropzones
- `--line: #26262b`       all borders and dividers
- `--line-strong: #3a3a40` borders that need slightly more presence
- `--text: #e8e8e6`       primary text
- `--muted: #8a8a85`      secondary, body copy
- `--dim: #5a5a57`        metadata, captions
- `--accent: #d4ff3f`     scoring highlights, primary CTAs (sparingly)
- `--accent-dim: #9bbf2e` accent hover/glow
- `--warn: #ffb547`       medium-risk scores, warnings
- `--danger: #ff6b6b`     high-risk findings, critical issues
- `--good: #6ddc8c`       positive findings, “passes” indicators

Rule: accent for primary actions and headline scores. Warn/danger
only for actual scoring outputs. Never decorate with semantic colors.

## Typography

- Display / headings: **Fraunces** (serif, optical sizing, 400-600).
  Italic for the single emphasized word in a heading.
- Body / UI / data / scores: **JetBrains Mono** (400/500/700).
- Numbers and scores are ALWAYS mono. The “78/100” score should feel
  like a measurement on an instrument.

## Spacing

8px base grid (8/16/24/32/48/64/96). Max content width 1180px for
the tool view (wider than portfolio — this is a working surface, not
a read-only page). 28px side gutters.

## Layout principles

- The product is **one primary surface**: input on the left, results
  on the right. Don’t fragment.
- Asymmetric two-column where possible — never centered 50/50.
- Section dividers are 1px `--line` lines, never decorative.
- Empty states have personality: short editorial copy + a hint of
  what’ll appear. Avoid “Get started by uploading…”  marketing tone.

## Scoring visual language

This is the heart of the product. Scores must feel like measurements.

- The **overall score** (0–100) is shown in massive Fraunces digits.
  Color shifts based on bucket: 80+ accent (good), 50-79 warn (mid),
  <50 danger (poor).
- **Sub-scores** are smaller, mono, in a tidy row with hairline
  separators. Each maps to an ABQE factor (Employment Gap Risk, Skill
  Phrasing Variance, Resume Structure, Degree Origin) — labeled as if
  on a control panel.
- Each finding has a severity dot: green/warn/danger. Plain text.
  No emoji.
- Cite the research subtly — a small line under the overall score
  reading “Scored against ABQE benchmark (Lingineni, 2025) · 4 factors”
  with a link to the Zenodo dataset. Credibility through restraint.

## Components

- **Primary button**: solid `--accent` background, black text, bold
  mono, 2px lift on hover. Used for “Analyze Resume” only.
- **Secondary button**: 1px `--line` border, accent on hover.
- **Input fields & textareas**: `--bg-input`, 1px `--line`, focus
  state turns border to `--accent-dim`. Mono font inside.
- **File dropzone**: dashed `--line` border, hover lights to
  `--accent-dim`. Shows “PDF or DOCX, up to 5MB” in dim text.
- **Cards**: `--bg-soft` on `--bg`, 1px `--line` border. Hover
  doesn’t change background (this is a tool, not a clickable demo).
- **Code/quote blocks** (for showing original vs rewritten text):
  `--bg-input` background, mono, subtle left border in accent.

## Motion (Framer Motion)

- The product is computational — animations should feel like the
  machine “thinking” and “reporting.” Not playful.
- Loading state during scoring: a subtle pulse on a status line
  (“Parsing resume…”, “Comparing against benchmark…”, “Computing
  factor sensitivities…”). Real moving text, not a spinner.
- Score reveal: number counts up from 0 to final score in ~700ms,
  easeOutQuart. Sub-scores fade in stagger after the headline number
  lands.
- Findings list: stagger fade-up, 60ms between items.
- No bouncing, no scale-pops, no celebration confetti — this is a
  diagnostic tool, not a game.
- Respect `prefers-reduced-motion`: hard-disable all transforms.

## Hard “do not” list

- No purple gradients. No glassmorphism. No “AI-powered ✨” copy.
- No success illustrations of trophies, rockets, or graphs going up.
- No emoji anywhere in the product UI.
- Don’t fake-imply hiring outcomes (“Get hired 3x faster!”). The
  research-backed framing only works if we never overclaim.
- Don’t add testimonials with fake people. Empty testimonials section
  is better than fabricated quotes.
- No “Try for free →” green-buttons SaaS visual energy.

When in doubt: imagine you’re showing this to the program committee
of a fairness conference. Would they take it seriously? If not, cut it.