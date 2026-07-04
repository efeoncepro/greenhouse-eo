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

## The AEO grader form (the thing in the screenshot) — VERIFIED against real code

Context: a public form embed labeled "Formulario gobernado por Greenhouse" that
failed with "No pudimos cargar el formulario. Intenta de nuevo." This section was
**corrected after auditing the real repos** (efeonce-think + greenhouse-eo, 2026-07)
— it replaces the earlier "use an Astro Action" advice, which was wrong for this
governance model.

**The SSOT is the governed API contract, NOT the JS renderer.** Greenhouse already
exposes the form as a *data contract*:

- `GET /api/public/growth/forms/{form_key}` → the form **contract** (schema/fields).
- `POST /api/public/growth/forms/{form_key}/submit` → governed submit, owned by the
  `submitForm` command (honeypot + surface-auth + consent gate + dedupe + async
  outbox delivery). **Body is JSON only** (`request.json()`), not `formData`.
- CORS is **data-driven** per surface (`origin_allowlist_json`, fail-closed);
  `think.efeoncepro.com` is a governed origin. Gated by
  `GROWTH_FORMS_PUBLIC_API_ENABLED`.
- `renderer-latest.js` (the `<greenhouse-form>` web component) is **one consumer**
  of that contract — a convenience widget, not the source of truth.

**What Codex shipped (v0):** embeds only the `<greenhouse-form>` web component via
the external `renderer-latest.js`. It couples efeonce-think to a *consumer* (the
renderer), so a script-load failure = dead form + `<noscript>` dead-end. That is the
screenshot. Governance-correct, resilience-poor.

**Canonical shape (C1 — the correct target):**

1. **Server-render the form from the governed schema.** In the `.astro` fence
   (SSR/build), `fetch` `GET /api/public/growth/forms/{form_key}` and render a
   **real `<form>`** from the returned contract. The fields are now server HTML —
   present even if enhancement JS never runs. This alone kills the "couldn't load
   the form" failure class.
2. **Do NOT hand-author fields or validation.** They come from the schema. Writing
   them locally forks the governed contract (violates Full API Parity / dumb-render).
   This is why an **Astro Action is the wrong tool here** — an Action is for
   first-party logic *you own*; this form is owned by Greenhouse. (Actions remain
   correct for a form whose logic efeonce-think genuinely owns — see
   `topics/actions.md`.)
3. **Submit to the governed endpoint.** POST to `/submit` (governed by `submitForm`,
   CORS already allowlisted). Today that endpoint is **JSON-only**, so submission
   needs a thin client script (serialize → JSON → POST). Enhance with the
   `<greenhouse-form>` web component for rich UX + status polling on top.
4. **Full no-JS PE requires one small governed change:** make `/submit` also accept
   `application/x-www-form-urlencoded` (parse `formData` → same `submitForm` command).
   That's the right place for resilience — the governed write-path itself — not a
   forked native handler in efeonce-think. Until then, C1's degraded state is a
   *visible working form that needs JS to send*, which is still strictly better than
   a widget that may never paint.
5. The write path stays governed: the client submits, `submitForm` governs (honeypot,
   consent gate, dedupe, async outbox). The public form **enqueues** a grader run; it
   never computes the grade. Because the contract is data, Nexa / any consumer can
   operate the same form (Full API Parity) — not just a browser running the widget.
6. This is TASK-1327 territory — cross-link the task, don't reinvent the plan.

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
- **NEVER** couple the form to the JS renderer as if it were the SSOT — the SSOT
  is the governed API contract (`GET .../forms/{key}` schema + `POST .../submit`).
  Server-render a real `<form>` from the schema; the `<greenhouse-form>` widget is
  enhancement, not the source. A renderer-load failure must NOT leave a dead form.
- **NEVER** hand-author the form's fields/validation in efeonce-think (forks the
  governed contract) — and **NEVER** reach for an Astro Action here (Actions are for
  first-party logic you own; this form is owned by Greenhouse). Consume the schema.
- **NEVER** hardcode brand HEX — AXIS tokens as copied CSS vars; `AxisWordmark`
  never on the public site.
- **SIEMPRE** treat the form as a governed write path: submit to `/submit`
  (governed by `submitForm`; JSON-only today), enqueue a run, Greenhouse governs.
  Full no-JS PE needs `/submit` to also accept `formData` — harden the endpoint,
  don't fork a native handler.
- **SIEMPRE** verify the real frame (GVC) before calling it done.
