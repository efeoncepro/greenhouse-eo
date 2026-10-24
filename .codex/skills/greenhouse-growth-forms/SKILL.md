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

## AXIS input behavior (2026-10-04)

El adapter opt-in `inputBehaviors` comparte formato, nunca autoridad de validación. Cargar
[decisión de adopción](../../../docs/architecture/GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md).
AXIS `a0c6130` está en `main` (ajuste de assets `6fff346`); primitives 0.5.0 sigue sin publicar.
El port del renderer es local y no está activado: no cambiar pins/hosts ni inferir adopción desde el Lab.
`display` es texto editable y `value` puede ser null: conservar/rechazar, nunca vaciar ni truncar.
Formato al salir; no transformar durante IME. El producto conserva reset y validación de servidor;
`ready` no prueba validez de negocio. Correo sin máscara, preservando alias y mayúsculas; RUT sin
verificación de dígito. Teléfono/URL/correo/RUT son mappings explícitos; moneda y documentos de otros
países requieren contrato. Configurar `inputBehaviors` antes de conectar el custom element.

El selector vigente deriva **18 países/prefijos** de `CALLING_CODES` en
`src/lib/growth/forms/validators/phone.ts`; no es una allowlist estricta de números internacionales con
`+`. AXIS ofrece `phoneCountryOptions(locale, allowlist?)` en `/input-phone` (245 países/territorios en
la metadata actual), pero ni el port ni el host amplían el catálogo automáticamente. Para adoptarlo,
definir cobertura de producto, consumir el helper publicado y verificar payload/validación del motor.
No copiar tablas ni imponer 245 como constante eterna. `PhoneField.countrySearch` habilita búsqueda
React con mensajes explícitos; no introduce React ni ese control en el web component de Growth Forms.

## When to invoke

- Authoring/lifecycle of forms (draft → review → publish → deprecate → archive), versions, copy.
- The portable renderer `<greenhouse-form>` (attributes, theming/tokens, states, telemetry).
- Public API routes (`GET`/`POST /submit`/`POST /verify-email`/`catalog`), CORS, render/submission contracts.
- Destinations + dispatch (HubSpot secure-submit, retries, dead-letter), reliability signals.
- Security/PII (Turnstile, email verification, rate limits, PII encryption, reveal audit, telemetry allowlist).
- Telemetry/measurement: the `gh_form_*` dataLayer/GTM events + parameter allowlist + how to name a new event → canonical reference `docs/reference/measurement-gtm-ga4/` (start with `04-greenhouse-gh-event-convention.md`; the `gh_form_*` family is its live example). SoT of the event vocabulary: `src/lib/growth/forms/contracts.ts → GTM_EVENT_NAMES`.
  - **MANDATORY:** before creating a form and when publishing one, **read** `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` (reuse before minting) and **register/update its row** there with its tagging status (page/surface, dataLayer yes/no, GA4 event, key event, `✅ tagged` / `⏳ pending`). A measurable form is not "done" while its row is `⏳ pending` — leave it recorded, never omitted. To actually **build/publish the GTM tag** that catches these events → skill `greenhouse-gtm-ga4-operator`.
- Embedding a form on a host (WordPress/Elementor, Astro), theming a form into a host card.
- The **Success Card / thank-you card** (`success_behavior_json`, `presentation='success_card'`) or the
  **AEO grader-on-submit** capability of `/aeo-2/` → companion `references/SUCCESS_CARD_AND_GRADER_ON_SUBMIT.md`.
- A host with its own DOM patcher, a consumer-pinned bundle, `initial-values` or the
  `content_marketing` presentation → `references/CONTENT_MARKETING_HOST_AND_RENDERER.md`.
- Feature flags / rollout of the engine across environments.

---

## Matching publicitario — contrato publicado

Antes de tocar captura, identidad o destinos, cargar el
[ADR de políticas](../../../docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md),
[runtime vigente](../../../docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md)
y `greenhouse-gtm-ga4-operator`. La configuración administrable está implementada; la propuesta
anterior es histórica y no debe usarse como instrucción de añadir listas fijas.

- `measurementContext` se lee al enviar desde categorías HubSpot resueltas y GPC. La casilla
  de procesamiento/comunicaciones no autoriza publicidad. Missing, edad >10 min, ads denied o
  GPC omiten matching sin rechazar por ese motivo la aceptación comercial.
- La política publicada resuelve `form_key` estable, versión `fver-*`, surface/origen y mapping
  tipado. `prepare.ts` toma los campos normalizados mediante ese mapping: no exige que el key
  del formulario se llame `email`. Teléfono sólo con normalizador E.164; nombres derivados
  sólo si la fuente declara `namePolicy`. No inferir desde labels ni inventar país/apellido.
- Publicar el formulario o taggear GA4 no publica su política publicitaria. El seed conserva
  seis Forms iniciales y la agenda; no es una allowlist runtime ni debe editarse para cada alta.
- La aceptación guarda submission, consentimiento y outbox comercial. La proyección de medición
  cifrada comparte transacción mediante SAVEPOINT aislado. Un fallo de medición no revierte
  aceptación ni entrega a HubSpot Forms; el mapping CRM conserva su autoridad independiente.
- `measurement_conversion` / `measurement_delivery` conservan revisión autorizante, UUID externo
  y tiempo por ocurrencia; retries no crean otra conversión ni actualizan consentimiento.
  Enqueue y worker revalidan política/destino. Desactivar/superseder impide envíos pendientes,
  pero no retira un HTTP ya iniciado.
- El POST original captura IP real de XFF/x-real-ip y User-Agent en `visitor-request.ts`; nunca
  sustituir por IP/UA del worker. Snapshot cifrado; Meta recibe IP/UA y `_fbp`/`_fbc` sin hash.
  El bridge conserva atribución fbclid tras ads grant y la limpia ante revoke/GPC. Email,
  teléfono internacional sin `+`, fn/ln normalizados y external_id estable van SHA-256 hex;
  external_id usa email normalizado, fallback teléfono, nunca submissionId.
- Meta se entrega mediante ingreso autenticado sGTM schema 2 con prueba de política cerrada;
  se elimina esa prueba antes del tag. `action_source=website`, URL real segura sin query/fragment,
  UNIX segundos y UUID estable. No hay Meta Lead browser activo; no reactivar sus triggers legacy.
- Google UPD requiere analytics + ads y client_id real; contiene user_data **sin events**.
  GA4 conserva su único `generate_lead` browser-reported. Nunca PII/hash en GA4 ordinario,
  dataLayer, dimensiones, logs, Sentry o URLs.
- `GROWTH_MEASUREMENT_CAPTURE_ENABLED` gobierna captura web; flags Meta/Google UPD/retención
  gobiernan Ops. AES-256-GCM, hasta cinco intentos/24 h y purga ciphertext a 48 h permanecen.

[Release histórico y evidencia 14/10](../../../docs/audits/releases/2026-10-14-scalable-measurement-agent-first-release.md):
En ese corte Server 9 estricto; nueva fuente configurada por datos/CLI y recibida en Meta Test Events sin
redeploy ni publish GTM adicional; fixture desactivada/archivada. Un ACK, Test Events o flag ON
no demuestra entrega CRM, primera conversión comercial, mejora EMQ ni elegibilidad de audiencia.

## Identidad nativa de la entrega HubSpot

Para `conversionId`/rastreo exacto, cargar el [ADR de recibos](../../../docs/architecture/GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md)
y el [manual de activación](../../../docs/manual-de-uso/growth/guardar-identidad-nativa-hubspot.md).
Checkpoint 18/10: expansión SQL aplicada y worker compatible servido; en Performance están verificados
la propiedad `ef_greenhouse_submission_id`, el campo nativo oculto/opcional y el mapping CAS.
No extender ese opt-in a otros destinos por inferencia: verificar propiedad, campo del form y mapping
para cada uno, preservando su contrato comercial. Primera identidad nativa de una ocurrencia pendiente.
`provider_submission_id` sólo se certifica tras GET con match único y cobertura completa. El worker
recupera evidencia sin otro POST, aunque no haya nuevos leads. Nunca sustituir la ocurrencia por el
valor actual del contacto, email/hora, URL o `hsforms-*`. Schema antes del POST; no repetir la
migración ya aplicada ni los pasos de provisión como una prueba de lectura.

Revisión de recibos: exigir checks/fecha UTC/cobertura coherentes al leer `verified`; un marcador sin
`conversionId` válido no confirma identidad nativa. El selector de pendientes debe proteger casts de
fechas corruptas antes de evaluar SQL. Múltiples destinos conservan sus IDs por separado, con resumen
por ocurrencia; evidencia mixta implica cobertura parcial. Nunca solucionar estos fallos con otro POST.
[Revisión local](../../../docs/audits/growth/2026-10-17-meta-cli-final-review.md).

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
(`surface` default | `bare` chromeless), `initial-values` (JSON prefill restricted to declared fields;
never put PII into host markup or overwrite edits by repeatedly changing this attribute).

**What it provides by construction** (don't reimplement in a host): loading skeleton (never blank),
inline field errors (`role="alert"`, `aria-invalid`, `aria-describedby`), debounced email-gate +
typo-suggest with honest degradation, submit pending + anti-double-submit, success inline/redirect,
**sanitized** server errors (never raw `reason`), honest empty/error states (`Formulario no
disponible` / `No pudimos cargar… Reintentar`), invisible Turnstile (1px, no layout shift),
reduced-motion, telemetry with a hard allowlist (no field values). Since `ab622e958` (2026-10-15,
code complete, not yet in production): `type: 'radio'` = native radiogroup of cards in **every**
`styleVariant` (full row, 2 columns from a 520 px container; pillar keeps its own chips); the consent
privacy link text is the locale copy `privacyLinkLabel` (URL only in `href`); label icons are inline SVG
without `data-icon` (except `linkedin`, glyph `in`). Contract: `growth-public-forms-runtime-contract.md`
§«Renderer: opciones visibles…». Source and build live in Greenhouse and ship only with a Greenhouse
production release (`prebuild` → `renderer:build`) until **TASK-2038** moves them to AXIS (EPIC-035
delivery plane; Greenhouse keeps contract/API/server validation/consent/destinations/measurement).

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

- Post-`hosted` fix: a host override on `greenhouse-form { --ghf-* }` propagates — canonical recipe
  **for the default style only**.
- With a `styleVariant` (e.g. `diagnostic_premium`) the variant re-declares `--ghf-*` on the inner
  `.ghf-root[data-ghf-style-variant]`, so overrides on `greenhouse-form`/`.ghf-scope` lose (2026-10-15,
  `/agencia-creativa/`: live CTA teal `#36c8bf` instead of host `#0375db`). Scope under the host card:
  `greenhouse-form :is(.ghf-scope,.ghf-root[data-ghf-style-variant]) { --ghf-* }`; verify the submit
  button's computed style on the live page.
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

**New-surface checklist (canonical runbook).** Before declaring a form live on a **new host/domain**,
follow `docs/manual-de-uso/growth/alta-surface-growth-form-checklist.md`. It splits **Tier 1**
(config-only: publish → surface+origin/CORS → HubSpot destination → embed → smoke) from **Tier 2**
(`tokenized_report`/async: adds the domain reactive consumer + status/report CORS + domain-data
degradation). Two gaps recur and bite in production: (a) the host's **Turnstile hostname** must be added
to the widget — subdomains are NOT inherited from the root (verified on `think.efeoncepro.com`: the
`efeoncepro.com` root did not cover it); and (b) a **real-browser end-to-end smoke on the real surface**
is the closure gate — curl/tests never exercise Turnstile or cross-origin CORS. Source incident: TASK-1327.

**TASK-1327 tokenized_report production lesson (Think Brand Visibility).** For `tokenized_report`,
a successful `/submit` is only the first commit. The renderer emits `gh_form_submission_accepted`
with scalar `run_handle`/`status_url`; a domain reactive consumer must convert the accepted
submission/outbox event into the domain object. For the grader that consumer is
`growth_grader_run_from_submission`, which creates `grader_lead` + `grader_run`. Do not add a fake
`form_destination` just to create the run: `DESTINATIONS: []` can be correct for
`fdef-ai-visibility-grader` because destinations deliver leads, while the grader run is domain
projection work. If the loader polls forever, inspect in order: browser POST/OPTIONS/Turnstile →
`greenhouse_growth.form_submission` → `growth.forms.submission_accepted` outbox → reactive consumer
logs/result → `grader_lead`/`grader_run` → status route CORS + `reportToken`. The TASK-1327 root
cause after Turnstile was `category unresolved (node=unknown)` in the consumer, not the Think host.
Public intake classification must resolve or degrade before enqueue; it must never dead-end a user
after an accepted submit. Canonical Think form: `formKey=69cd5269-5f97-4d32-99c4-0b23f41aa2f5`,
`surface=fhsf-ai-visibility-grader`, host `https://think.efeoncepro.com`.

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
HubSpot mapping, Turnstile secrets or destination behavior in the child theme. It is live on Kinsta
after the scoped 2026-07-01 rollout (only `growth-forms-host.css` + `inc/enqueue-and-layout.php`;
remote backup `/tmp/greenhouse-growth-forms-host-layer-20260701T103729Z`; AEO live gate green after
Kinsta purge). The public-site control plane now includes `eo-elementor-widgets` in the governed
export/binding and the reconciled report
`docs/operations/public-site-drift/drift-2026-07-01T10-54-46-557Z.json` is green
(`fullRepoDeploySafe=true`, no content drift, no pending release). Still refresh drift
(`public-website:export-live-code` + `public-website:diff-runtime`) before any rollout and avoid
collateral plugin rollout if `runtime-status` regresses to `releaseSafety.fullRepoDeploySafe=false`
or classifies `eo-elementor-widgets` as `repo_pending_release`.

### Premium diagnostic forms

For AEO-class diagnostic forms, the governed premium path is a render-contract `styleVariant`, not
WordPress CSS surgery. The current AEO premium variant is `styleVariant=diagnostic_premium`, backed
by renderer tokens, a custom single-select combobox/listbox (no OS-native popup for premium selects),
CTA motion and field-level copy in the contract.

- Premium select overlay contract (TASK-1343): the renderer owns overlay stacking, not the
  WordPress host. When a premium select opens, `renderer.ts` marks the closest `.ghf-field` with
  `data-overlay-open="true"`, `styles.ts` raises `.ghf-field:focus-within` and
  `.ghf-field[data-overlay-open="true"]`, and `.ghf-select-list` sits above following grid rows.
  Selected/hover options use `--ghf-fg`, not `--ghf-accent-contrast`, because white-on-mint can be
  unreadable. Hosts may add section chrome, but should not rebuild or page-scope this listbox
  behavior. Verification: open the dropdown in the real host and assert `aria-expanded=true`, list
  visible, top option is the `elementFromPoint`, selected text is dark, no overflow, and
  reduced-motion remains honest.
- Publish or change premium visuals through a new form version (`style_variant` + copy/labels),
  never by editing a published version in-place.
- AEO helper: `pnpm growth:forms:activate-aeo-premium` (dry-run) and
  `pnpm growth:forms:activate-aeo-premium -- --apply` to publish vNext by stable `form_key`.
- The helper must preserve fields, validation, Turnstile, destinations and policies. It does not
  mutate WordPress.
- AEO is live on this premium renderer. Do not restore the temporary bridge unless explicitly
  rolling back from the Elementor backup.

### Editorial Premium Brief host composition (TASK-1598)

For high-intent public campaign briefs, the approved reference combines the governed
`diagnostic_premium` renderer with an editorial host card. Read
`references/EDITORIAL_PREMIUM_BRIEF_STYLE.md` before reproducing the treatment. It defines the
renderer/host boundary, hierarchy, semantic icons, country flags, responsive behavior and live
evidence requirements. This is a host composition recipe, not a new form `styleVariant`: never copy
its page-scoped CSS as form behavior or create a parallel select/value store.

---

## Success Card (thank-you card) + AEO grader-on-submit → **companion**

Two engine capabilities added 2026-07 (TASK-1319/1320/1321) live in the companion
`references/SUCCESS_CARD_AND_GRADER_ON_SUBMIT.md` — **read it before touching either**:

- **Success Card (thank-you card):** the success state generalized from a plain inline message to a
  structured card (`success_behavior_json`: `presentation='success_card'` + title/body/steps/reward/
  actions, orthogonal to `kind`). It **crosses to the browser as-is** → the schema is the leak
  boundary (bounded strings + `successCardHrefSchema` browser-safe allowlist). Any form can declare
  one; change it via clone→publish→deprecate with `preserveFormVersionFields` (never edit in place),
  and only publish `presentation='success_card'` after the renderer reaches prod (the activation
  script's runtime guard enforces this). Renderer-level mark/motion are shared; AEO WordPress markers
  remain host-specific bridge CSS until the runtime bundle carries the source.
- **AEO grader-on-submit:** the **landing** form `/aeo-2/` (`fdef-efeonce-aeo-diagnostic`, a
  **commercial** intake — **NOT** the grader's own self-serve form `fdef-ai-visibility-grader`) was
  given the capability to auto-run the AEO Grader on submit, via a **sibling** projection
  (`growth-aeo-diagnostic-grader-run-from-submission`, kill-switch `GROWTH_AEO_FORM_GRADER_INTAKE_ENABLED`
  default-ON). The run engine stays the SSOT; this is a second client (remap + grounded category +
  own cost-cap). Do not conflate the two forms; do not branch the grader-form's projection.

---

## Public API contract (`/api/public/growth/forms/`)

| Route | Method | Purpose |
|---|---|---|
| `[formSlug]` | GET | browser-safe `render_contract` (slug **or** formKey via `resolveFormSlugFromRef`) |
| `[formSlug]/submit` | POST | accept a submission (validate + captcha + email policy + rate limit + PII encrypt) |
| `[formSlug]/verify-email` | POST | reactive corporate-email check (debounced; 404 ⇒ non-blocking) |
| `catalog` | GET | governed form catalog for the editor selector (server-side embed key) |
| `[formSlug]/registrations-count` | GET | TASK-2053 — `{ count, display, shown }`: confirmed event registrations, floored to the ten, only above the threshold; 10-min cache + per-IP rate limit |

- CORS/origin/surface are governed by `form_host_surface`. Browser-supplied ids never define
  authorization. Errors are **sanitized** (no SQL/stack/secret/PII).
- **Governed CORS transport (TASK-1335).** The public route helper `cors.ts` has **no hardcoded
  origin set**. Transport ACAO = the **UNION of `origin_allowlist_json` across `active` surfaces**
  (SoT = `form_host_surface`), via `listActivePublicFormOrigins` (store), cached in-memory (TTL ~90s)
  with stale-while-revalidate + stale-on-error. **Authorizing a new host = adding its origin to the
  right surface (DATA), never editing the route helper.** Transport is **surface-agnostic** because the
  `OPTIONS` preflight carries no `surfaceId`; the fine per-surface authority (origin + slug + surface)
  stays server-side in `submitForm` (double defense). Invariant: fail-CLOSED for unknown origin,
  fail-SAFE for the data source (last-known-good on DB blip; cold + DB-down → empty union, but the form
  is already broken then). `publicFormsCorsHeaders`/`publicFormsOptionsResponse` are **async** — route
  handlers `await` them.
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

### HubSpot destination registry (2026-10-09)

Each public-site Growth Form has **its own HubSpot form**; destinations are never shared. The
mapping lives in `scripts/growth/hubspot-destinations.registry.ts` and is applied with
`pnpm growth:forms:activate-hubspot-destinations` (dry-run by default; flags `--apply-hubspot`,
`--smoke`, `--apply-greenhouse`, `--only=<slug>`). Select options are derived from the published
`field_schema`, so HubSpot cannot drift from the Greenhouse contract.

- **`status='delivered'` does not prove HubSpot delivery.** Without an enabled `direct`
  destination the dispatcher marks the submission as delivered *to the ledger*. Proof is a
  `form_destination_attempt` row with `status=succeeded`, HTTP 200 and `external_id`.
- **Three non-retryable 400s send a lead to dead-letter**, and the tool's contract check covers
  all three: `FIELD_NOT_IN_FORM_DEFINITION` (mapped property missing from the HubSpot form),
  `VALUE_NOT_IN_FIELD_DEFINITION` (option mismatch) and `REQUIRED_FIELD` (a HubSpot-required field
  Greenhouse does not guarantee, e.g. `lastname` for a one-word name). HubSpot forms used as
  destinations keep everything but `email` optional: Greenhouse owns validation.
- **HubSpot forms built in the new editor (`embedType: V4`, e.g. "AEO - Lead Form") cannot be
  modified through the Forms API** (403 "not allowlisted to perform an operation to v4 forms").
  Add their fields in the HubSpot UI, then re-run the tool; it reports the gap instead of failing.
  New forms are created as V3 by cloning "Contact Form - EO".
- A PATCH with a field group of more than 3 fields is rejected even if the form already had it.
- **`--apply-greenhouse` always checks the live HubSpot form**, never the dry-run projection.
- The portal has non-HubSpot form capture on (`leadin`), which records every `<form>` submit as
  "<page title>: <form class>" — a second conversion per lead, fired even when validation blocks
  the submit. The renderer opts out by rendering `<form class="ghf-form" data-hs-do-not-collect>`
  (`HUBSPOT_DO_NOT_COLLECT_ATTRIBUTE` in `renderer.ts`; HubSpot evaluates it when it discovers
  the node, so it must exist before insertion). **Consequence: a Growth Form reaches HubSpot only
  through its governed destination.** A form without an enabled `direct` destination no longer
  shows up in HubSpot at all — add it to the registry instead of relying on the scraper.
  Rollout is per bundle: `renderer-latest.js` ships with the Greenhouse release; the WordPress
  plugin's pinned bundles (`content-marketing-forms.js`, `hubspot-forms.js`) need their own rebuild
  and plugin rollout. Never switch the portal-level capture off: the footer newsletter (CF7) and
  the meeting scheduler (`.ghm-form`) still depend on it.

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

**Pendiente: «¿cómo nos conociste?» (operador, 2026-10-22).** La
[estrategia de love brand](../../../docs/strategy/EFEONCE_LOVE_BRAND_AND_COMMUNITY_STRATEGY_V1.md) (§11 y §14.1)
exige medir el puente fan → conversación con ese campo en formularios y diagnósticos y una propiedad de fuente de
primer contacto en HubSpot. Hoy no existe: no lo declares implementado. Requiere task propia; cuando se haga, entra
como nueva versión de cada formulario y por el camino de arriba (propiedad, `fieldGroups`, `fieldMapping` y smoke).

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

**Canvas-designed form (Claude Design or similar):** treat it as a configuration brief, never as host
markup. Map each control to an existing type/presentation — chips/cards → `type: 'radio'`
(`ghf-choice-group--cards`), label icons → `presentation.icon`, country → `presentation.control:
'country_select'` — with visual parity as acceptance. Two columns need `greenhouse-form` ≥520 px (container
query), so the host card's width/padding decides. Measure width, radio groups and icons live before
closing; only true gaps (pill-chip look, AXIS checkbox styling, other custom listboxes) become a renderer
extension, flagged to the operator before publishing. Creativa's v1 used `select` and no icons; switching
to `radio` needed the renderer fix below (its two-step version waits for that release:
`scripts/growth/activate-creative-diagnostic-two-step.ts`, then rebind the measurement policy to the new
`form_version_id` with `pnpm --silent growth:measurement`). **Verify in the renderer that is LIVE, not only in source:** until
`ab622e958` (2026-10-15), `type: 'radio'` rendered as cards only under `hubspot_pillar` and fell through to an
empty text input in every other style, and label icons were text glyphs that Ohio's `[data-icon]` CSS turned into
words. Preview a contract change on the real host by intercepting the contract (and, for a renderer change, the
bundle) in a test browser before publishing a version. The renderer only reaches production with a Greenhouse
release until TASK-2038 moves it to AXIS. Host checklist: `efeonce-public-site-wordpress`
`references/growth-forms-wordpress.md` §Canvas-designed forms.

**Design-fidelity fields (TASK-2044 contract + TASK-2045 render, code complete 2026-10-23; renderer `1.1.0`, ships with the next `main` release).** Declare a canvas
design instead of styling it: `fields[].presentation.width` (`auto|half|full`), `consent.presentation` (`tile|compact`)
+ `consent.privacyLinkLabel` + one `{privacyLink}` marker in a checkbox `label` (compiler blocks HTML, other markers,
repeats and a missing `privacyUrl`), `successBehavior.icon` (`celebration|orbit|none`) and success action
`kind: 'dismiss'` (no `href`/`target`). In a Growth CTA, `open_growth_form` takes `presentation: 'dialog'` + optional
`dialog: { eyebrow, title, lead }`. Absent = today's contract. The live renderer ignores them gracefully **except**
`{privacyLink}`, which an old renderer shows literally: never publish the marker before the TASK-2045 renderer is in
production. Full table: `docs/architecture/growth-public-forms-runtime-contract.md` §Formularios diseñados en canvas.
Host skin = tokens (`--ghf-field-*`, `--ghf-label-*`, `--ghf-btn-*`, `--ghf-consent-*`, `--ghf-orbit`, `--ghf-placeholder`,
`--ghf-column-gap`) + `data-ghf-part` hooks, never internal classes; `color-scheme="dark"` now forces dark; `steps: []`
hides default success steps; `dismiss` emits DOM `ghf:dismiss` (telemetry-independent); `data-ghf-busy` while
submitting; Turnstile mounts next to the form (works inside a modal `<dialog>`). Worked example + evidence:
`scripts/public-website/partners-source/partner-dialog-skin.css`, `docs/ui/reviews/TASK-2045/`.

**Inline pill + event registration (TASK-2053 contract + TASK-2054 render, code complete 2026-10-24; renderer `1.2.0`,
ships with the next `main` release).** `ui_policy.presentation: 'inline_pill'` + optional `ui_policy.inlinePill` labels
draws the blog-v3 canvas pill (button → email field + send → orbit loader → fill + check → final text). Only one
required visible `email` (+ `hidden`), notice consent without checkboxes, `static`, no `redirect`/`success_card` — the
compiler blocks the rest. `fields[].staticValue` (hidden only) is enforced server-side (`applyStaticFieldValues`): the
event identity, never host-injected. `ui_policy.eventRegistration` (server-only, `event_registration` kind) gives
capacity + `waitlist|reject`; the seat is decided inside the submit transaction under `pg_advisory_xact_lock`
(distinct email hashes, waitlisted excluded); `reject` → outcome `capacity_full` (409); responses carry
`registrationStatus`. Publish with `pnpm growth:forms:publish-event-registration -- --config <json>` (dry-run first).
Host = tokens `--ghf-inline-*` (tone/on-tone/hover/active) + `data-ghf-part="inline-*"` hooks; give `<greenhouse-form>`
its column width (≥ 480 px for desktop widths). DOM event `ghf:success` syncs instances of the same `formKey`.
**Never** publish an `inline_pill` version on a page before the renderer release (old renderer draws the standard form).
Visual gate: `node scripts/growth/forms/fixtures/inline-pill.scenario.mjs` (canvas literal vs real element, ≤ 1 %;
standard forms 0 px against a baseline rev). Lesson: measure the canvas's COMPUTED styles — its `button{font:inherit}`
reset beats `.ab`, so the approved open button renders 16 px/400, not the declared 15/600. Full table:
`docs/architecture/growth-public-forms-runtime-contract.md` §Formulario en línea.

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
- **NUNCA** hardcode a public CORS origin set in the route helper (`cors.ts`) — transport ACAO is the
  governed UNION of `active` surfaces' `origin_allowlist_json` (TASK-1335). Add a host by appending its
  origin to a surface (DATA/migration), not code. **NUNCA** make transport CORS surface-aware per request
  (the `OPTIONS` preflight has no `surfaceId` → it would drop ACAO for every origin, breaking `/aeo-2`).
  **NUNCA** use `Access-Control-Allow-Origin: *` on submit/render APIs.
- **NUNCA** re-deliver a `delivered` submission (duplicate lead; not idempotent).
- **NUNCA** ship form behavior into a single UI/host — extract the governed contract (Full API Parity).
- **NUNCA** log/telemeter PII; reveal is capability + reason + append-only audit.
- **NUNCA** override `--ghf-*` tokens expecting them to reach the content without accounting for the
  `.ghf-scope` scope (use the `hosted` fix or target `.ghf-scope`) or a `styleVariant` root that
  re-declares them (target `.ghf-root[data-ghf-style-variant]` too).
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

- **Companion — Success Card + AEO grader-on-submit: `references/SUCCESS_CARD_AND_GRADER_ON_SUBMIT.md`**
- **Editorial Premium Brief host recipe: `references/EDITORIAL_PREMIUM_BRIEF_STYLE.md`**
- Architecture: `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- Runtime contract: `docs/architecture/growth-public-forms-runtime-contract.md`
- Functional: `docs/documentation/growth/motor-formularios-publicos.md`
- Operate (runbook): `docs/manual-de-uso/growth/operar-motor-formularios.md`
- Embed (WordPress/Astro): `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- AEO landing: `docs/documentation/public-site/aeo-landing-elementor.md`
- Compose with: `greenhouse-postgres`, `greenhouse-backend`, `greenhouse-cron-sync-ops`,
  `hubspot-greenhouse-bridge`, `efeonce-public-site-wordpress`, `greenhouse-ux` (+ product-design).

## Published policies: agents and panel share one contract

Use the [policy ADR](../../../docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md)
and [operator manual](../../../docs/manual-de-uso/growth/configurar-medicion-conversiones.md).
The policy binds stable source/version, surface, origin, typed mapping and independent destinations.
Destinations default OFF. Commercial purpose excludes subscribe/application/survey and high-risk
sources; new forms of those kinds are not automatically eligible. Only the two approved HTTPS
hosts are supported. A compatible source/version is enabled by reviewed policy data; a new
behavior, field type, provider, event or host may require code and governed publication.

### Agent operating loop

1. Use the canonical user-bound agent-session from `scripts/playwright-auth-setup.mjs` and a
   private `0600` ignored storage state. Set `GROWTH_MEASUREMENT_BASE_URL` to the exact HTTPS origin
   and `GROWTH_MEASUREMENT_STORAGE_STATE` to that file. Session expiry/denial requires refreshing
   canonical auth; never mint actor/role in JSON or copy cookies to another host/gateway. The
   CLI restricts cookies to that host/session and rejects redirects. Secrets stay out of arguments/logs.
2. Run `pnpm --silent growth:measurement --help`, then `discover`. Structured JSON includes
   `growth-measurement-policy.v1`, effective read/author/publish/disable capabilities, typed
   source fields/versions, blockers and current heads. Client users are denied; a local role
   label or an internal URL does not grant authority.
3. Build a metadata-only command from discovery; no contact values, IP, hashes or JavaScript.
   `validate comando.json` POSTs `{dryRun:true,command}` without draft/audit/conversion writes.
   Validation does not reserve state or publish; execution revalidates fresh server authority.
4. Within existing operator authorization, execute
   `apply comando.json --apply --receipt .auth/recibo.json`. Use one UUID per intended command and the discovered current
   `expectedPublishedRevisionId` (including null). Draft→review→publish uses distinct commands
   and keys; disable is separate. Publication is immutable: edits create a new revision.
5. `verify .auth/recibo.json` performs independent GET. Receipt `0600` is reserved before POST and
   the known write receipt is checkpointed before GET. Unknown outcome: retry the exact body,
   key and receipt; known receipt: retry GET only. A409 requires discovery and deliberate new
   authority, never overwrite or key reuse with changed content. The panel shares this client,
   retains unsaved values on conflict/reload and requires readback before success.

All four operations use `pnpm --silent growth:measurement …` (or
`pnpm exec tsx scripts/measurement/policy-cli.ts …`) for clean JSON. Exit 0 is success, 2 invalid, 3 conflict,
4 denied, 5 unavailable during validation, 6 potentially unknown outcome. Keep private receipts
for recovery; never print arbitrary provider errors or credentials.

Operational policy commands need no SQL or browser. They do not create forms, submit/book,
configure HubSpot mappings, write CRM contacts or send provider tests. New source provisioning
still uses its canonical Forms/Meetings commands. Growth Forms→HubSpot Forms→CRM and the
consented measurement projection retain separate mappings, outboxes and evidence. No MCP/Nexa
registration, issuer/OAuth scope expansion or new infrastructure was introduced by this CLI.
Provider delivery and real commercial outcomes require their own readback; CLI success is not
that evidence. Release proofs and pending real traffic/EMQ stay in the linked runtime/audit.


## LinkedIn Ads — preparación propuesta19/10/2026

Cargar [manual LinkedIn](../../../docs/manual-de-uso/growth/preparar-medicion-linkedin.md) y
[arquitectura Proposed](../../../docs/architecture/GREENHOUSE_LINKEDIN_ADS_MEASUREMENT_ARCHITECTURE_V1.md).
Forms accepted; Grader comercial sí, Contacto general/ebooks/empleo/newsletter/soporte no.
No existen policy/destino/recibo/bridge LinkedIn en este motor; no transformar `googleAdsConversion`,
`gh_ads_conversion` ni generate_lead genérico en permiso LinkedIn. Requiere cuenta/reglas/consentimiento
propios y eventId durable del hecho compartido con CAPI si se adopta; duplicados/polling no reemiten.
La cobertura Google no inscribe LinkedIn. No crear leads/reservas ficticios ni publicar al documentar.

## Google Ads online y EC — contrato y checkpoint 18-10-2026

Cierre vigente: [release Grader/clasificación main2559e9242](../../../docs/audits/releases/2026-10-18-grader-commercial-measurement-production-release.md), manifest released y canarios negativos.
Antes de operar, releer estado real; no repetir correcciones/planes históricos ni crear leads para
completar evidencia. TASK-2034 sigue parcial por recepción/atribución y recibos reales pendientes.

Cargar [contrato/activación](../../../docs/manual-de-uso/growth/activar-conversiones-google-ads.md),
[arquitectura](../../../docs/architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md)
y [evidencia de activación](../../../docs/audits/growth/2026-10-18-google-ads-activation.md).
Recibo Ads postcommit con UUID/key, nunca en dedupe/replay; policy opt-in y flag global default OFF.
Exigir los cuatro permisos Google explícitos y GPC sin veto. Hashes sólo en el canal reservado
`user_data`, con memoria privada ≤10 s; nunca en dataLayer ni telemetría ordinaria. El evento dedicado
`gh_ads_conversion` queda excluido del forwarding GA4. No derivar Ads del `generate_lead` genérico
ni mezclar UPD/Meta. GCLID/GBRAID/WBRAID se observan con consentimiento; no se generan ni se disparan.
El circuito online sigue dependiendo del navegador y no tiene retries backend.

Checkpoint fechado 18/10: Web **6** / Server **10** publicados, Server primero; EC efectiva ON en
**6862539491**, bridge compatible publicado en WordPress/Think y flag Production true con companion
READY del mismo main liberado. Cobertura ampliada22:57Z:13 formularios comerciales y Discovery
(reserva) con Ads publicado. Son fuentes del sitio, no tipos de campaña Ads. Ambas acciones
siguen secundarias, ONE_PER_CLICK y valor de medición 0 CLP; no se modificaron pujas ni campañas.
Primera ocurrencia real, recepción proveedor y atribución siguen **sin verificar**; protocolo aislado,
negativos, tag fired, un flag o HTTP 200 no sustituyen esa evidencia. Releer estado live antes de operar.
Los drafts Web 8/Server 12 del [corte 17/10](../../../docs/audits/growth/2026-10-17-google-ads-online-conversions.md)
fueron consumidos por la publicación; no reconstruirlos ni reejecutar scripts privados históricos.
`pnpm --silent google-ads conversions bindings` relee IDs/labels saneados; el compilador offline no publica.

### Cobertura comercial por política

El alcance ratificado por el operador es sólo formularios que captan solicitudes comerciales
(contacto, cotización, diagnósticos y briefs elegibles). Excluye ebooks/descargas, newsletter,
postulaciones, soporte, encuestas y fixtures. La intención y `kind` se verifican en la fuente:
no inferir elegibilidad del nombre de la landing ni cambiar una clasificación por SQL directo.
Reutilizar `commercial_lead` y los tags genéricos; no crear un tag por formulario ni hardcodear slugs.
La agenda conserva `meeting_booking`, con confirmación proveedor y política propias.

Para ampliar: descubrir versión/surface/origen/head frescos, validar mapping y elegibilidad,
preservar destinos Meta/UPD y mapping CRM, luego draft→review→publish→readback mediante el comando
canónico dentro del alcance autorizado. El flag global no inscribe nuevas fuentes. Publicar una
versión Forms o cambiar un binding exige revisar la compatibilidad de su política; GA4 tagged no
significa Ads habilitado. La revisión al publicar es hoy un paso del operador, no una autopolicy.

[Publicación de cobertura18/10](../../../docs/audits/growth/2026-10-18-commercial-forms-policy-publication.md):
12 formularios adicionales publicados y verificados,13 Forms comerciales+Discovery activos.
AI Grader tiene intención comercial confirmada por el operador. Contacto es general y queda fueraAds.
Lead Gen Web corregido a quote_request por command/store Forms, preservando identidad y versión;
no se exceptúa globalmente lead_magnet ni se publica el plan viejo. La API nueva de clasificación
está servida en main2559e9242, con auditoría API Platform en la misma transacción que el UPDATE
y commandExecutionId para correlación; usar el [manual](../../../docs/manual-de-uso/growth/corregir-clasificacion-comercial.md).
Canarios negativos de Grader/clasificación PASS, sin leads ficticios ni corrección positiva de prueba.
La política y los canarios no certifican recepción ni atribución de conversiones reales.


Grader: cargar [contrato de transporte](../../../docs/architecture/GROWTH_GRADER_COMMERCIAL_MEASUREMENT_V1.md).
Think vigente usa Forms portátil, no el POST histórico. La fachada histórica reutiliza UUID/versión
publicados, contexto visitante y recibo sólo post-persistencia; duplicados no reemiten. Su publicación
se verifica en la auditoría enlazada. Nunca probarla creando leads ni inferir recepción por CORS/READY.
