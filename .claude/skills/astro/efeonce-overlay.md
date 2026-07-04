# Efeonce / efeonce-think overlay

**Read this first for any efeonce-think work.** It pins the repo-specific
decisions that override generic Astro advice below. Generic Astro is in `topics/`;
this file is what makes the advice *correct for our setup*.

## What efeonce-think is

- A **separate repo / Vercel project** (`efeonce-think` → `think.efeoncepro.com`),
  **not** greenhouse-eo. Astro powers it; Greenhouse computes.
- The public render of the **AI Visibility / Brand Grader** report — a **"dumb
  render"** of a headless model produced in Greenhouse (TASK-1280). Astro's job
  is to **paint**, not to think.
- Report render is live/enterprise (TASK-1325). The maturity escalera is
  canonized as a primitive **`MaturityLadder`** (self-contained + adapter).
- Follow-up context: TASK-1324 (repoint correo, still 404), TASK-1327 (public
  lead-magnet landing + form embed — the AEO grader form).

## The load-bearing doctrine: "dumb render" = SSOT

The intelligence (scoring, model, snapshots, decisions) lives in the **Greenhouse
headless model**. Astro consumes a DTO and renders it. This is the single source
of truth boundary.

- **NEVER** compute a score, derive the model, branch business logic, or make a
  decision inside efeonce-think — not in the fence, not in an island, not in a
  loader transform beyond shaping. If you're tempted to `if (score > X)` to
  *decide* something, it belongs in the headless model.
- The Content Layer **custom loader** that pulls the Greenhouse model is the
  clean seam: Astro validates (Zod) + renders; the model computes. See
  `topics/content-layer.md`.

## The AEO grader form (the thing in the screenshot)

Context: a public form embed labeled "Formulario gobernado por Greenhouse" that
failed with "No pudimos cargar el formulario. Intenta de nuevo." — the classic
client-side-fetch-only failure.

**Canonical shape:**

1. It **is an island** — the one genuinely interactive thing on a content page.
   `client:visible` (below the fold; the hero is the LCP). Not `client:load`.
2. **Full API Parity**: the form is *governed by Greenhouse*. The form contract
   is resolved **server-side** (build/request), rendered as a real `<form>`, and
   the island only enhances UX. Prefer an **Astro Action** (`accept: 'form'`) so
   it degrades without JS. See `topics/actions.md`.
3. **NEVER** a form that only exists via a client-side `fetch` of the schema — a
   failed fetch = the dead-end error we saw. Server-render the shell; hydrate on
   top.
4. The write path is governed: the island proposes/submits, Greenhouse governs
   the action (mirrors the platform's `propose → confirm → execute` doctrine for
   anything that mutates). The public form enqueues a grader run; it does not
   compute the grade.
5. This is TASK-1327 territory — cross-link the task, don't reinvent the plan.

## Brand: AXIS tokens are COPIED, not imported

- efeonce-think's brand = **AXIS design tokens copied** into the Astro repo as a
  SoT file, referenced as **CSS custom properties** (`var(--…)`). It is *not* a
  runtime import from greenhouse-eo (separate repo, no shared dependency).
- **NEVER** hardcode brand HEX in a component — reference the token var.
- When AXIS changes upstream, the copy is re-synced deliberately (documented),
  not auto-linked. Keep the copy identifiable as "copied from AXIS Figma
  `yyMksCoijfMaIoYplXKZaR`" so drift is traceable.
- Brand architecture is **Efeonce**, not "Greenhouse" — "EO" is a repo
  abbreviation, never visible copy. The `AxisWordmark` is design-system-only:
  never in product UI, emails, PDFs, or the public site.
- Proprietary illustrations / isotypes follow repo brand-asset rules — don't
  hand-transcribe third-party marks; import per the repo's brand SSOT.

## Primitives

- **`MaturityLadder`** (TASK-1325) — self-contained primitive + adapter pattern.
  New report visuals should follow the same shape: a self-contained primitive
  fed by an adapter that maps the headless DTO → the primitive's props. Don't
  fork scoring or re-derive; adapt the DTO.

## Rendering & deploy defaults for efeonce-think

- **`output: 'static'`** — it's a content/report hub. Prerender everything;
  flip a route to `prerender = false` only if it truly needs request-time data
  (the form submission path via an Action route).
- Vercel adapter; `site: 'https://think.efeoncepro.com'`; Node **22.12+**.
- Follow `CLAUDE.md` Vercel discipline even though it's a separate project:
  confirm canonical `.vercel/project.json` / pass `--scope efeonce-7670142f`,
  never hand-create `VERCEL_AUTOMATION_BYPASS_SECRET`, redeploy after env
  changes.
- The site is **graded by AI engines itself** → crawlable server-rendered HTML +
  CWV are product signals, not just UX. Compose `seo-aeo`.

## Verification (this repo's bar)

- Verify the **real rendered frame** (desktop + mobile), don't ship on green
  assertions alone — the AEO form regression shipped exactly because the gate
  didn't *look*. Use the repo GVC/Playwright discipline (`greenhouse-gvc-playwright`).
- E2E the form's progressive enhancement: it must work with JS disabled.
- Enterprise-modern finish at the current year, verified in a loop.

## Cross-links

- `[[TASK-1327]]` public lead-magnet landing + form embed
- `[[TASK-1325]]` report render live + MaturityLadder primitive
- `[[TASK-1280]]` headless model that efeonce-think renders
- seo-aeo skill (the site is its own grader's subject)
- vercel-ops / repo Vercel discipline

## Hard rules (overlay)

- **NEVER** compute/derive/decide business logic in efeonce-think — dumb render,
  SSOT in the headless model.
- **NEVER** a client-fetch-only form — server-render the governed form shell +
  Action, hydrate for UX.
- **NEVER** hardcode brand HEX — AXIS tokens as copied CSS vars; `AxisWordmark`
  never on the public site.
- **SIEMPRE** treat the form as a governed write path (enqueue a run; Greenhouse
  governs), and as a `client:visible` island over a real `<form>`.
- **SIEMPRE** verify the real frame (GVC) before calling it done.
