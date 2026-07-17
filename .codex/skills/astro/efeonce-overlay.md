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

**What Codex shipped (and where it stands, 2026-07):** embeds only the
`<greenhouse-form>` web component via the external `renderer-latest.js`. The renderer
was since **hardened and now renders the full form correctly** — the original
screenshot failure is resolved. So this is a **working, parity-satisfying**
implementation, not a broken one. **Full API Parity is satisfied by the contract
existing** (schema GET + governed submit) — Nexa / any consumer can operate the form
via the API regardless of how efeonce-think renders it; the widget-embed does **not**
violate parity. (An earlier version of this overlay overstated that — corrected here.)
Its only remaining limitation is structural: the fields live in client-painted DOM,
not server HTML, so a future renderer/CDN/network failure has no fallback (`<noscript>`
is a dead-end). That is a **defense-in-depth gap, not a live bug**.

**Resilience upgrade (C1) — OPTIONAL now that the renderer works.** Do this if
renderer failures recur, or if you want zero-JS PE / crawlable fields; otherwise a
working, hardened widget-embed is a legitimate choice. C1 is not a correctness fix:

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
   never computes the grade. Full API Parity already holds via the contract (Nexa /
   any consumer can operate the form through the API) — that's true whether efeonce-
   think renders the widget or a native form, so parity is not a reason to switch.
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

## La Radiografía AEO (`/muestras/<slug>-<token>`) — la OTRA cosa que vive en este repo

efeonce-think no es solo el render del Brand Grader. También aloja la **Radiografía AEO**: una muestra
de trabajo de 4 pantallas que es, a la vez, **herramienta de educación** (cliente y prospecto) y
**herramienta de habilitación de ventas**. Escribe un artículo real para un cliente y lo abre en canal
mostrando su capa de máquina acoplada. Primer caso: SKY (licitación Wherex 2026).

- **El cliente es un PAYLOAD, no código.** Colección Content Layer `aeoXray` (`src/content.config.ts`)
  + un JSON en `src/content/aeo-xray/<cliente>-<slug>.json`. **NUNCA** `if (cliente === 'sky')` en un
  componente: eso rompe la frontera del motor.
- **El schema Zod ES el gate de calidad, y ahora lo es DE VERDAD** (auditoría 2026-07-14). Un
  `superRefine` en la raíz rompe el build ante: **cualquier `stat` sin `source`+`asOf`** (el hueco por
  donde entraron 3 cifras que no resistían verificación — vivían en `machine.craft`, la única familia
  que el schema no miraba), **bloques huérfanos y nodos fantasma** (el contrato del acoplamiento se
  verificaba en un navegador DESPUÉS del build: un payload roto **pasaba**), **headline sin cifra**,
  **anclas duplicadas**, y un **accent del cliente bajo 4,5:1** (entra como color de TEXTO).
- 🔴 **El motor NO puede conocer al cliente — y la trampa está en cuatro sitios, no en uno:** un
  `switch` de literales sobre el `flow` (**un step renombrado servía una página EN BLANCO, sin
  ruido** → ahora es un `enum`), **la tipografía del cliente en el CSS** (era un `if (cliente ===
  'sky')` escrito en una hoja de estilos → ahora sale del payload), una **constante con un `coupleId`
  del cliente** (`HERO`), y **el gate exigiendo literalmente `Assistant`** — o sea, era el test de
  regresión de SKY, no el del motor. ✅ Verificado con **el ejercicio del segundo cliente**: un payload
  de clínica dental entra **sin tocar una línea de código**.
- **Gate propio:** `pnpm build && pnpm verify:aeo-xray` → **46 asserts** (Playwright real). Y
  `pnpm read:aeo-xray` es **OBLIGATORIO antes de tocar el texto**: la coherencia no es una propiedad
  estructural, y la prosa vive en **tres capas** (artículo · capa de máquina · átomos).
- 🔴 **El JSON-LD se renderiza como TEXTO ESCAPADO, jamás en un `<script type="application/ld+json">`**:
  emitirlo declararía en NUESTRO dominio que Efeonce publicó un artículo del cliente. Dato estructurado
  falso, en la pieza cuya tesis es el rigor. `noindex` + fuera del sitemap.
- 🔴 **La muestra se defiende sola:** ni cita nuestros documentos ("nuestra oferta dice…") ni narra su
  propia interfaz ("cada pieza de abajo…"). Hablar del artefacto **para ser honesto** sí (el disclaimer,
  el schema no emitido); narrarlo, no.
- **Imágenes por `astro:assets`** (helper `image()` de la colección), **NUNCA** desde `public/`: la pieza
  no puede reprobar su propio PageSpeed.

**Invariantes completos (cargar antes de tocarla):** `greenhouse-eo/docs/think/radiografia-aeo-architecture.md`
+ el manual `radiografia-aeo-manual.md`. Encuadre comercial:
`docs/documentation/comercial/radiografia-aeo-muestra-de-trabajo.md`. Skills: `seo-aeo-practice` (dueña
del oficio) · `greenhouse-public-private-tenders` (consumer) · `commercial-expert` (la vende).

## Primitives

- **`MaturityLadder`** (TASK-1325) — self-contained primitive + adapter pattern.
  New report visuals should follow the same shape: a self-contained primitive
  fed by an adapter that maps the headless DTO → the primitive's props. Don't
  fork scoring or re-derive; adapt the DTO.
- **`StatusScreen`** (2026-07-05) — ONE primitive intercepts EVERY full-screen
  state of the hub: `not_found` (404), `gone` (410 expired/revoked),
  `rate_limited` (429), `error` (5xx), plus the global `404.astro`. Ambient navy
  hero (orbits + calibrated bokeh depth) + the 3D Nexa character posed per state +
  display title + CTA. Contract `@lib/primitives/status-screen` (`StatusKind` +
  `STATUS_CONTENT` = canonical es-CL copy + pose + role + action); the consumer
  passes `kind` (+ optional copy override for the generic 404). It collapsed the
  duplicated inline state blocks in `/brand-visibility/r/[token]` and `/s/[code]`.
  **Pattern to reuse:** one status primitive, NOT per-route error markup — map
  each HTTP outcome → a `kind` → a branded character pose + copy. `role="status"`
  for permanent (404/410), `role="alert"` for transient (429/5xx). Character
  assets live at `public/characters/nexa-<pose>.webp` (transparent AI matting,
  generated in greenhouse-eo via `pnpm ai:image --image …` edit + `pnpm ai:image:rmbg`).

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

## Analytics / GA4 (medición)

efeonce-think mide con la **misma propiedad GA4** que efeoncepro.com (funnel unificado; subdominio = mismo stream, `486264460`). El snippet **GTM (`GTM-NGHPGRLZ`)** vive en `BaseLayout.astro`: `<script is:inline>` con el loader en `<head>` (`is:inline` SÍ — evita que Astro bundlee el snippet) + `<noscript>` **SIN** `is:inline` (esa directiva es solo para `<script>`/`<style>`; en `<noscript>` Astro 7 estricto puede colarla como atributo raro — flag de Copilot, fix PR #11). El `page_view` lo dispara un GA4 Config gateado por hostname DENTRO del container (no en el sitio Astro); los `<greenhouse-form>` ya emiten `gh_form_*` → conversiones medidas por construcción.

- **SIEMPRE** que se sume un host/sitio nuevo del ecosistema → hereda/instala el tag GA4 (mandato Tracking Engine §19.2/§19.5). Contrato + patrón + gotchas: `greenhouse-eo/docs/reference/measurement-gtm-ga4/` + skill `greenhouse-gtm-ga4-operator`.
- **NUNCA** `is:inline` en `<noscript>` (solo `<script>`/`<style>`).

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
