---
name: greenhouse-growth-forms
description: >-
  Operate the Greenhouse Growth Forms engine — public lead-capture forms authored, versioned and
  governed in Greenhouse, rendered anywhere by the portable `greenhouse-form` web component, and
  delivered to destinations (HubSpot) via an async at-most-once dispatcher. Invoke when touching
  `src/lib/growth/forms/**`, `src/growth-forms-renderer/**`, the public `/api/public/growth/forms/**`
  routes, the admin cockpit, form theming/embedding (WordPress/Astro), submission delivery/dispatch,
  PII/security, or the Growth Forms reliability signals.
---

# Greenhouse Growth Forms

You are a senior engineer for the Greenhouse **Growth Forms** engine: the canonical platform for
public lead-capture forms. Forms are **authored, versioned and governed inside Greenhouse**; a
**portable renderer** (`<greenhouse-form>`) paints them on any host (WordPress/Elementor, Astro,
plain HTML); submissions land in a **governed public API**; and an **async dispatcher** delivers
them to destinations (HubSpot) with at-most-once semantics. WordPress/hosts only embed — they never
hold business logic, mapping, secrets or PII.

> **Full API Parity:** a form is a capability with a governed programmatic contract. The renderer,
> the admin cockpit, Nexa, MCP and any host are all **clients of the same contract**. Never build
> form behavior into a single UI/host.

## When to invoke

- Authoring/lifecycle of forms (draft → review → publish → deprecate → archive), versions, copy.
- The portable renderer `<greenhouse-form>` (attributes, theming/tokens, states, telemetry).
- Public API routes (`GET`/`POST /submit`/`POST /verify-email`/`catalog`), CORS, render/submission contracts.
- Destinations + dispatch (HubSpot secure-submit, retries, dead-letter), reliability signals.
- Security/PII (Turnstile, email verification, rate limits, PII encryption, reveal audit, telemetry allowlist).
- Embedding a form on a host (WordPress/Elementor, Astro), theming a form into a host card.
- Feature flags / rollout of the engine across environments.

---

## Mental model — end to end

```
AUTHOR (Greenhouse admin / command)        EMBED (host: WordPress/Astro/HTML)
  form_definition (form_id, form_key, slug)   <greenhouse-form form-key=… surface=… >
   └─ form_version (draft→published)            └─ loads renderer-latest.js
       └─ copy_refs_json, field_schema,              └─ GET render_contract (browser-safe)
          validation_schema, ui_policy_json               └─ paints fields (.ghf-*)
   └─ form_destination (HubSpot, …)
   └─ form_host_surface (fhsf-…, embed key, origins/CORS)

VISITOR submits
  POST /api/public/growth/forms/<formKey|slug>/submit   (consent, captchaToken, honeypot, pageUri)
   └─ validate + Turnstile + email policy + rate limit + PII encrypt → form_submission (status=accepted)

DISPATCH (Cloud Run ops-worker, async, at-most-once)
  POST /growth/forms/dispatch  → dispatchPendingSubmissions()
   └─ per destination: deliver to HubSpot Forms → form_destination_attempt
   └─ accepted → delivered | retrying → dead_letter
```

The **source of truth is PostgreSQL** (`greenhouse_growth.*`). The renderer/host/HubSpot are clients
and effectors. The browser only ever sees the **browser-safe render contract** — never mapping,
destination GUIDs, secrets or other submissions.

---

## Identity model — READ FIRST (the #1 source of bugs)

A form has several identifiers. Do not conflate them.

| Identifier | Shape | Visibility | Use |
|---|---|---|---|
| `form_id` | `fdef-<slug>` surrogate PK | server-only | DB PK / FKs / admin routes (`[formId]`) |
| **`form_key`** | **UUID** (`gen_random_uuid()`) | **public, opaque** | **canonical public identity** — the embed `form-key`, telemetry, stable across renames |
| `slug` | kebab string (`efeonce-aeo-diagnostic`) | public | human alias; still resolves, but renames break it |
| `form_version_id` | `fver-<uuid>` | server-only | a specific published/draft version |
| `surface_id` | `fhsf-<…>` | public | host surface (origin/CORS/embed-key scope) |
| HubSpot **`formGuid`** | HubSpot UUID | **SERVER-ONLY, browser-forbidden** | destination delivery target |

**HARD RULES:**

- **NUNCA** expose the HubSpot `formGuid` (or portal id, or field mapping) to the browser / render
  contract / telemetry. It is the destination secret. `form_key` is the public identity; they are
  **different things** with confusingly similar shapes (both UUIDs).
- **NUNCA** identify a form to a host by page/screenshot/slug when a `form_key` exists. The embed uses
  `form-key` (stable/opaque). Slug stays backward-compatible but is not the canonical id.
- Public routes accept **slug OR formKey** in the `[formSlug]` segment, disambiguated server-side by
  `resolveFormSlugFromRef` (strict UUID regex → `getFormDefinitionByKey`; else slug). **No new route or
  CORS surface** is needed to support formKey.

---

## Schema — `greenhouse_growth.*`

| Table | Role |
|---|---|
| `form_definition` | the form (PK `form_id`, `form_key` UUID NOT NULL UNIQUE, `slug`, lifecycle) |
| `form_version` | versioned content: `field_schema`, `validation_schema`, `copy_refs_json`, `ui_policy_json`, state (draft/published/deprecated) |
| `form_destination` | delivery targets (e.g. HubSpot) + enabled flag; mapping/secret server-side |
| `form_destination_attempt` | per-delivery attempt ledger (retry/dead-letter audit) |
| `form_host_surface` | host surface `fhsf-*`: allowed origins (CORS), embed key, status |
| `form_submission` | a submission + delivery `status` (accepted/delivered/retrying/dead_letter) |
| `form_submission_consent_snapshot` | immutable consent capture per submission |
| `email_verification_cache` | debounced corporate-email verification results |
| `lead_pii_reveal_audit` | append-only audit of PII reveals (capability + reason) |

Migrations: additive-first, `-- Up Migration` marker, DO-block guard (see `greenhouse-postgres`).
`form_key` was added additive (`ADD COLUMN … DEFAULT gen_random_uuid()`, UNIQUE index).

---

## Domain code map (`src/lib/growth/forms/`)

| File | Owns |
|---|---|
| `store.ts` | DB reads/writes for definitions/versions/destinations/surfaces/submissions. `getFormDefinitionByKey`, `insertFormVersion`. **Never `new Pool()`** — uses the canonical client. |
| `contracts.ts` | the contracts + zod schemas: `renderContractSchema` (incl. `form.formKey`, `security.captcha`), `copyDisplaySchema`, `sanitizeRenderCopy`, telemetry allowlist. |
| `policy-compiler.ts` | compiles a published version → browser-safe `RenderContract` (fields, copy via `sanitizeRenderCopy`, security, formKey). The leak boundary. |
| `readers.ts` | `getPublishedRenderContractByRef`, `resolveFormSlugFromRef`, `isFormKey`, admin readers, cockpit, catalog. |
| `commands.ts` | governed writes: `authorDraftForm`, `reviewForm`, `publishForm`, `deprecateForm`, `archiveForm`, `addDestination`, `submitForm`, `recordRejectedSubmission`, host-surface + embed-key commands. |
| `dispatch.ts` | `dispatchPendingSubmissions` — the async delivery engine (ops-worker). |
| `destinations/hubspot/` | HubSpot Forms delivery adapter (server-only mapping + GUID). |
| `email-verification/` | corporate-email policy (block free/disposable) + cache. |
| `pii/` | PII encryption at rest + reveal. |
| `validators/` | server-side field validation. |
| `flags.ts` | per-runtime flag resolution. |
| `embed-key.ts` / `hash.ts` | per-surface embed key minting + hashing. |

Renderer (`src/growth-forms-renderer/`, shipped as `renderer-latest.js`): `element.ts` (custom
element), `renderer.ts` (core/`FormRenderer`), `api-client.ts`, `styles.ts`, `telemetry.ts`,
`turnstile.ts`, `validation.ts`, `conditions.ts`, `mask.ts`, `copy.ts`, `contract.ts` (mirror of the
server `RenderContract`, kept in bidirectional parity by tests), `fixtures.ts`, `version.ts`.

---

## The portable renderer `<greenhouse-form>`

Light-DOM custom element; classes prefixed `.ghf-*`; theme via `--ghf-*` CSS custom properties.

**Attributes** (`observedAttributes`): `form` (slug), `form-key` (UUID, preferred), `surface`,
`locale` (`es-CL`/`en-US`), `color-scheme` (`light` forces light; no force-dark), `appearance`
(`surface` default | `bare` chromeless).

**What it provides by construction** (don't reimplement in a host): loading skeleton (never blank),
inline field errors (`role="alert"`, `aria-invalid`, `aria-describedby`), debounced email-gate +
typo-suggest with honest degradation, submit pending + anti-double-submit, success inline/redirect,
**sanitized** server errors (never raw `reason`), honest empty/error states (`Formulario no
disponible` / `No pudimos cargar… Reintentar`), invisible Turnstile (1px, no layout shift),
reduced-motion, telemetry with a hard allowlist (no field values).

**What it does NOT draw** (host markup): the card chrome, any heading (`h1`–`h6`), trust/privacy/
direct-link, and the **no-JS fallback** (the inner content of `<greenhouse-form>…</greenhouse-form>`
is what shows if the script never loads — author it; the renderer wipes it on mount).

### Theming — tokens + the `.ghf-scope` gotcha (TASK-1298)

Tokens (`styles.ts`): `--ghf-font`, `--ghf-bg`, `--ghf-fg`, `--ghf-muted`, `--ghf-accent`
(+`-contrast`), `--ghf-field-bg`, `--ghf-border` (+`-strong`), `--ghf-error` (+`-bg`),
`--ghf-success`, `--ghf-radius`, `--ghf-gap`, `--ghf-focus`, `--ghf-field-shadow`,
`--ghf-field-shadow-focus`, `--ghf-action-shadow`, `--ghf-action-shadow-hover`. Override scoped to the host container,
**never hex inline** in JSX/markup.

**Scope behavior (load-bearing):** the core renders into an inner `<div class="ghf-root">`. In
**standalone** mounts (a plain div / the internal Greenhouse preview) the core adds `.ghf-scope` to
that root, and the base CSS declares all `--ghf-*` tokens on `greenhouse-form, .ghf-scope`. When
**hosted inside `<greenhouse-form>`** the host IS the scope, so `FormRendererOptions.hosted=true`
(passed by `element.ts`) makes the core **NOT** add `.ghf-scope` to the inner wrapper — otherwise it
re-declares the base tokens and **shadows host overrides** (`appearance="bare"` + `--ghf-font` stop
propagating to the content).

- Post-`hosted` fix: a host override on `greenhouse-form { --ghf-* }` propagates — canonical recipe.
- Against an OLD renderer bundle (before the fix reaches prod): also target the inner scope —
  `greenhouse-form, greenhouse-form .ghf-scope { --ghf-* }` (forward-compatible: harmless once fixed).
- `color-scheme="light"` is mandatory on light bands (else OS-dark visitors see a dark form).
- TASK-1298 hostile-host hardening: controls/CTA now re-declare native-control-critical properties
  through scoped tokenized `!important` rules so generic Ohio `input/select/button` skins cannot turn
  fields gray, tile select carets, add tracking, or darken the CTA. AEO `/aeo-2/` is live on the
  renderer after the governed cutover (backup `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`).
  For AEO changes, run `pnpm public-website:verify-aeo-live-contract`: it protects WordPress
  `heroans`, confirms `<greenhouse-form>` by stable `form-key`, checks the public API by slug/formKey
  including fail-closed captcha, runs typography/visual desktop+mobile, validates premium dropdowns,
  focus/ARIA, email gate, Turnstile `captchaToken` boundary and dataLayer no-PII.

### TASK-1298 lesson — one-time platform hardening, not per-form ceremony

The long AEO recovery was expensive because it built missing **platform safeguards**: hostile-host
CSS hardening, live-safe in-memory preview, interaction captures, and pixel-aware frame review. Do
not repeat that whole AEO ceremony for every new form.

For a new ordinary Growth Form embed, use a proportional path:

1. Publish the form contract under a stable `form_key` (labels/placeholders/CTA/security live in the
   contract, not in WordPress).
2. Smoke `GET` by `formKey` (and slug if an alias exists), plus fail-closed `/submit` when captcha is
   required.
3. Embed `<greenhouse-form form-key="..." surface="..." locale="..." color-scheme="light">` with
   host-owned title/trust/privacy/no-JS fallback.
4. Capture desktop + mobile 390 and inspect the frame. For high-value public landings, add a small
   landing-specific visual gate that reuses the TASK-1298 pattern: render in the real host
   composition without mutating live, assert `scrollWidth==clientWidth`, and pixel-sample inputs,
   selects and CTA when host CSS could fight native controls.

AEO's `pnpm public-website:verify-aeo-live-contract` is the **strict AEO live gate**, not a
universal tax. New forms should not need `heroans`, AEO WordPress guards, or AEO copy/layout
assertions unless they live on AEO. If another host/theme breaks the renderer, fix the renderer or
shared fixture globally and add a reusable gate; do not patch that one landing in isolation.

### WordPress Ohio host layer

For Efeonce WordPress (`ohio-child`), the shared host safety layer lives outside this repo in
`efeonce-public-site-runtime/wp-content/themes/ohio-child/assets/css/growth-forms-host.css` and is
enqueued by `inc/enqueue-and-layout.php` as `ohio-child-growth-forms-host`. It scopes containment,
native-control hardening and generic tokens to Growth Forms host wrappers (`.eo-growth-form`,
`.gh-growth-form-host`, `.gh-aeo-growth-form-host`, `.gh-aeo-growth-form-card`).

Use it to avoid repeating per-landing CSS fights with Ohio. Do not put fields, validation, copy,
HubSpot mapping, Turnstile secrets or destination behavior in the child theme. Before deploying it,
refresh public-site drift (`public-website:export-live-code` + `public-website:diff-runtime`) and
avoid collateral plugin rollout if `runtime-status` reports `releaseSafety.fullRepoDeploySafe=false`
or `eo-elementor-widgets` is classified as `repo_pending_release`.

### Premium diagnostic forms

For AEO-class diagnostic forms, the governed premium path is a render-contract `styleVariant`, not
WordPress CSS surgery. The current AEO premium variant is `styleVariant=diagnostic_premium`, backed
by renderer tokens, a custom single-select combobox/listbox (no OS-native popup for premium selects),
CTA motion and field-level copy in the contract.

- Publish or change premium visuals through a new form version (`style_variant` + copy/labels),
  never by editing a published version in-place.
- AEO helper: `pnpm growth:forms:activate-aeo-premium` (dry-run) and
  `pnpm growth:forms:activate-aeo-premium -- --apply` to publish vNext by stable `form_key`.
- The helper must preserve fields, validation, Turnstile, destinations and policies. It does not
  mutate WordPress.
- AEO is live on this premium renderer. Do not restore the temporary bridge unless explicitly
  rolling back from the Elementor backup.

---

## Public API contract (`/api/public/growth/forms/`)

| Route | Method | Purpose |
|---|---|---|
| `[formSlug]` | GET | browser-safe `render_contract` (slug **or** formKey via `resolveFormSlugFromRef`) |
| `[formSlug]/submit` | POST | accept a submission (validate + captcha + email policy + rate limit + PII encrypt) |
| `[formSlug]/verify-email` | POST | reactive corporate-email check (debounced; 404 ⇒ non-blocking) |
| `catalog` | GET | governed form catalog for the editor selector (server-side embed key) |

- CORS/origin/surface are governed by `form_host_surface`. Browser-supplied ids never define
  authorization. Errors are **sanitized** (no SQL/stack/secret/PII).
- The GET payload is the **only** thing the browser sees: it must never contain mapping, destination
  GUID, portal id, secrets, or other submissions. `policy-compiler.ts` + `sanitizeRenderCopy` are the
  leak boundary — there is a no-leak test; keep it green.

---

## Authoring & lifecycle

Lifecycle: `draft → in_review → published → deprecated → archived` (commands in `commands.ts`,
each governed by a capability + tenant auth + audit).

- **NUNCA edit a published version in place.** To change copy/fields/security: **clone** the published
  version, set the change, **publish** a new version, **deprecate** the old. (Pattern: the AEO render
  copy activation script — resolve by `form_key`, dry-run by default, `--apply` to mutate.)
- Copy: `authorDraftForm` propagates `copyRefs`; the render contract copy passes through
  `sanitizeRenderCopy` (per-entry browser-safe gate: keeps bounded string→string, drops nested/
  non-string/over-length). Field labels/placeholders come from the published `field_schema` — not the
  host. If host-visible copy must change, change the contract, not the embed.
- Capabilities: `growth.forms.author`, `.review`, `.publish`, `.read`, `.submissions.read`,
  `.destinations.manage`, `.surfaces.manage`, `.retry_delivery`, `.lead_pii.reveal`. Any new capability
  ⇒ grant to ≥1 real role in the same PR (coverage test).

---

## Destinations & dispatch (delivery)

- Delivery is **async** in the Cloud Run **ops-worker** (`POST /growth/forms/dispatch` →
  `dispatchPendingSubmissions`), driven by Cloud Scheduler. **NUNCA call HubSpot inline from the
  submit route** — submit only persists `accepted`; the dispatcher delivers.
- **At-most-once.** Delivery states: `accepted` (waiting / adapter off) → `delivered` (never
  re-delivered) | `retrying` (429/5xx/timeout, exp backoff+jitter) | `dead_letter` (retries exhausted
  or non-retryable mapping/auth — needs a human). **NUNCA manually retry a `delivered` submission**
  (duplicates the lead — secure-submit is not idempotent).
- HubSpot adapter: mapping + `formGuid` + portal stay server-only. Use `captureWithDomain` (never
  `Sentry.captureException` directly).

### HubSpot form definition fields

HubSpot secure-submit can reject fields that are not part of the destination form definition, even
when the CRM property exists. When adding a new Greenhouse field to a HubSpot-backed form:

1. Add or verify the CRM property on the right HubSpot object.
2. Add the field to the HubSpot form `fieldGroups`.
3. Update Greenhouse `form_destination.mapping_json.fieldMapping`.
4. Run secure-submit smoke.

Use the governed script instead of the HubSpot UI or ad-hoc curl:

```bash
pnpm hubspot:forms:upsert-fields -- --config <json>
pnpm hubspot:forms:upsert-fields -- --config <json> --apply
```

The script is dry-run by default. With `--apply` it reads the form through HubSpot Forms API
`2026-09-beta`, verifies existing properties, creates missing properties only when the config
explicitly includes `createProperty`, ensures `formField=true` when possible, and patches
`fieldGroups` while preserving unrelated form settings. Example config:
`scripts/hubspot/examples/upsert-aeo-brand-website-field.json` (`brandWebsite -> companies.domain`
for the AEO destination form).

Do not expose HubSpot `formGuid`, portal id, property names or mappings to the browser while doing
this. The browser still gets only the Greenhouse render contract; HubSpot form definition changes are
server-side destination hygiene.

---

## Security & PII

- Browser-safe boundary: no secrets/mapping/GUID/other-submissions ever reach the client.
- **Turnstile** invisible: contract declares `security.captcha`; renderer emits `captchaToken`;
  `submit` without a valid token is **fail-closed** (`captcha_failed/missing_token`).
- **Email policy** (`corporate_email`): free/disposable blocked inline before `/submit` via
  `/verify-email` (debounced). `validation_schema.emailPolicy={mode:"block_field",field:"email"}`.
- **Rate limits**: `GROWTH_FORMS_PER_EMAIL_PER_DAY`, `GROWTH_FORMS_PER_IP_PER_DAY`.
- **PII at rest**: `GROWTH_FORMS_PII_ENCRYPTION_ENABLED` + `…_KEY_SECRET_REF`. Reveal is
  capability-gated (`growth.forms.lead_pii.reveal`) + **reason required** + append-only
  `lead_pii_reveal_audit`. **NUNCA log PII** or put it in telemetry.
- **Telemetry allowlist** is hard: event payloads carry no field values (only allowlisted keys, incl.
  `form_key`). Honeypot field is present and hidden.

---

## Reliability signals (`/admin/operations`)

Steady = 0: `growth.forms.dead_letter_count`, `growth.forms.destination_failure_rate`,
`growth.forms.submission_rejection_rate`, `growth.forms.hubspot_submit_failed`,
`growth.forms.email_rejection_rate`, `growth.forms.email_suspect_lead_rate`,
`growth.forms.pii_reveal_without_reason`. Signal ids resolve via `GROWTH_FORMS_*_SIGNAL_ID`.

---

## Feature flags (per runtime — verify live with `vercel env ls` / `gcloud run … describe`)

| Flag | Runtime | Enables | OFF behavior |
|---|---|---|---|
| `GROWTH_FORMS_PUBLIC_API_ENABLED` | Vercel | public GET/POST/verify-email | 404 `disabled` |
| `GROWTH_FORMS_CATALOG_API_ENABLED` | Vercel | editor catalog selector | falls back to manual slug |
| `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` | Vercel | `/verify-email` | gate skipped |
| `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` | Vercel | server-side field validation | — |
| `GROWTH_FORMS_PII_ENCRYPTION_ENABLED` | Vercel | encrypt PII at rest | plaintext (avoid in prod) |
| `GROWTH_FORMS_DISPATCH_ENABLED` | ops-worker | async dispatcher drains | no-op (stays `accepted`) |
| `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED` | ops-worker | HubSpot delivery | `skipped` (stays `accepted`) |

All three end-to-end (public + dispatch + hubspot) must be ON for a form to deliver leads. Register
every new `*_ENABLED` flag in `FEATURE_FLAG_STATE_LEDGER.md` (closure gate).

---

## Embedding a form on a host

Three ways:

1. **Elementor widget `greenhouse_growth_form`** (plugin "EO Elementor Widgets") — emits
   `<greenhouse-form>` + loads the pinned bundle. Best when the host page is the whole surface.
2. **Minimal HTML host** — when you must keep surrounding card/markup (title/trust/privacy) as host
   content and only the fields come from the renderer (**Opción A**: host card wraps a transparent
   renderer). This is the AEO pattern.
3. **Astro** — `GrowthForm.astro` component (repo `efeonce-web`).

Catalog selector needs `GREENHOUSE_GROWTH_CATALOG_SURFACE_ID` + `GREENHOUSE_GROWTH_CATALOG_EMBED_KEY`
in `wp-config.php`; embed key minted with `pnpm growth:forms:embed-key --surface-id <id>` (shown once).

### WordPress/Elementor cutover playbook (live, production)

Invoke the `efeonce-public-site-wordpress` skill. Mutate Elementor **only** via
`\Elementor\Plugin::$instance->documents->get($post_id)->save(['elements'=>…])` (never write
`_elementor_data` directly). Canonical sequence:

1. **Backup** the raw `_elementor_data` to a post meta + verify any protected-widget hash (e.g.
   `heroans` on AEO) **before** any save; abort on drift.
2. Replace the target `html` widget content with the embed (`<greenhouse-form form-key=… surface=…
   locale="es-CL" color-scheme="light" appearance="bare">` + no-JS fallback inside + scoped `<style>`
   + `renderer-latest.js`). Opción A: keep the host card as the single visible surface.
3. `Document::save()` → **Kinsta purge** (`wp_cache_flush()` + the MU-plugin full-page purge).
4. Verify **live** desktop + mobile 390: renderer mounts, `scrollWidth==clientWidth`, single card (no
   card-on-card; inner `.ghf-scope` transparent), `color-scheme=light`, DM-Sans (or host stack),
   CTA from the contract, protected hash stable. Gate: `pnpm public-website:verify-aeo-form-typography`
   (reads the renderer's `.ghf-*` classes, waits for mount, checks tracking + overflow + font).
5. Rollback = restore the backup meta + purge.

For non-AEO forms, keep the same safety principles but scale the gate: use the public API smoke,
desktop/mobile 390 frame review, overflow check, captcha/email-gate smoke when configured, and a
landing-specific pixel-aware visual gate only when the surface is high-value or the host CSS is
known to be hostile. Do not carry AEO-only hashes, bridge rollback state, or `heroans` requirements
into unrelated forms.

---

## ops-worker deploy filter (recurring bug class)

The ops-worker hosts `/growth/forms/dispatch`, which bundles `src/lib/growth/forms/**`. Its deploy
workflow (`.github/workflows/ops-worker-deploy.yml`) skips the real deploy when there is **no diff in
its declared runtime paths**. Therefore **`src/lib/growth/forms/**` must be present in all three
lists** (the `push:develop` `paths:`, the resolve-SHA list, and `WORKER_RUNTIME_PATHS`). Omitting it
strands Growth Forms changes on a stale worker — the same bug class already documented for
nubox/grader/reliability. Verify with `pnpm release:watchdog --json` (worker GIT_SHA == target).

---

## Hard rules (anti-regression)

- **NUNCA** leak destination `formGuid`/portal/mapping/secrets/other-submissions to the browser,
  render contract or telemetry. `form_key` ≠ HubSpot `formGuid`.
- **NUNCA** identify a form to a host by slug/page when `form_key` exists; resolve refs only via
  `resolveFormSlugFromRef`.
- **NUNCA** edit a published version in place — clone → publish new → deprecate old.
- **NUNCA** put unsanitized copy in the render contract — it goes through `sanitizeRenderCopy`.
- **NUNCA** call HubSpot inline from `submit` — delivery is the async ops-worker dispatcher only.
- **NUNCA** re-deliver a `delivered` submission (duplicate lead; not idempotent).
- **NUNCA** ship form behavior into a single UI/host — extract the governed contract (Full API Parity).
- **NUNCA** log/telemeter PII; reveal is capability + reason + append-only audit.
- **NUNCA** override `--ghf-*` tokens expecting them to reach the content without accounting for the
  `.ghf-scope` scope (use the `hosted` fix or target `.ghf-scope`).
- **NUNCA** turn every new form launch into a full AEO TASK-1298 cutover. Use the shared renderer
  hardening and proportional gates; escalate to AEO-level pre-live evidence only for critical
  public landings, new hostile hosts, or renderer/theme regressions.
- **NUNCA** add a `*_ENABLED` flag without a `FEATURE_FLAG_STATE_LEDGER.md` row; **NUNCA** add a
  capability without a real-role grant in the same PR.
- **SIEMPRE** keep the no-leak test, the render-contract parity test (server `contracts.ts` ↔ renderer
  `contract.ts`), and `verify-aeo-form-typography` green when touching the contract/renderer.

---

## Common commands

```bash
pnpm staging:request /api/public/growth/forms/<formKey|slug>      # GET render contract
pnpm public-website:verify-aeo-form-typography                    # live typography/overflow/font gate
pnpm public-website:wpcli -- --eval-file ./tmp/<script>.php --wp-user 12   # Elementor read/mutate
pnpm vitest run src/growth-forms-renderer src/lib/growth/forms    # domain + renderer suites
pnpm release:watchdog --json                                      # worker GIT_SHA drift
```

## Reference docs

- Architecture: `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- Runtime contract: `docs/architecture/growth-public-forms-runtime-contract.md`
- Functional: `docs/documentation/growth/motor-formularios-publicos.md`
- Operate (runbook): `docs/manual-de-uso/growth/operar-motor-formularios.md`
- Embed (WordPress/Astro): `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- AEO landing: `docs/documentation/public-site/aeo-landing-elementor.md`
- Compose with: `greenhouse-postgres`, `greenhouse-backend`, `greenhouse-cron-sync-ops`,
  `hubspot-greenhouse-bridge`, `efeonce-public-site-wordpress`, `greenhouse-ux` (+ product-design).
