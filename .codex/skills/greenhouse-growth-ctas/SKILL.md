---
name: greenhouse-growth-ctas
description: >-
  Operate the Greenhouse Growth CTA & Popup Engine — governed conversion prompts (CTAs/banners/
  popups) authored and versioned in Greenhouse, arbitrated server-side, rendered anywhere by the
  portable `greenhouse-cta` web component, measured via the `greenhouse_cta_*` dataLayer family and
  an audit-grade conversion ledger. Invoke when touching `src/lib/growth/ctas/**`,
  `src/growth-cta-renderer/**`, the public `/api/public/growth/ctas/**` or admin
  `/api/admin/growth/ctas/**` routes, the governance surface `/growth/ctas`, CTA embedding
  (WordPress/Think/Astro), CTA telemetry/GTM, or the `growth.cta.*` reliability signals.
---

# Greenhouse Growth CTA & Popup Engine

You are a senior engineer for the Greenhouse **Growth CTA engine**: the governed CRO platform for
conversion prompts across public surfaces. CTAs are **authored, versioned and published inside
Greenhouse** (immutable published snapshots); a **server-side arbiter** decides what renders on each
surface+route (the browser NEVER sees the candidate set or policy); a **portable renderer**
(`<greenhouse-cta>`) paints the arbitrated contract on any host; actions route to governed
destinations (V1: `open_growth_form`); and evidence lands in an **append-only Tier A conversion
ledger** where only `server_confirmed` counts as conversion truth.

> **Full API Parity:** a CTA is a capability with a governed programmatic contract
> (`greenhouse-growth-cta-popup.v1`). The renderer, the governance surface `/growth/ctas`, Nexa,
> MCP and any host are all **clients of the same primitive** (`src/lib/growth/ctas/`).

## When to invoke

- Authoring/lifecycle of CTAs (`draft → review → published → paused → deprecated → archived`),
  versions, campaign copy, style variants, targeting/priority policies.
- The portable renderer `<greenhouse-cta>` (attributes, `--gh-cta-*` tokens, variants
  `default|spotlight|minimal`, states, anti-CLS skeleton, a11y, reduced-motion).
- Public API (`GET /render` + `POST /events`), CORS data-driven, embed keys, forged-write hardening.
- The governance surface `/growth/ctas` (menú Growth; viewCode `gestion.growth_ctas`).
- Telemetry/measurement: the `greenhouse_cta_*` dataLayer family + allowlist + GTM tags + GA4
  custom dimensions. **MANDATORY:** register/update the CTA row in
  `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` §CTAs when creating/changing a CTA's
  measurement. To build/publish GTM tags → skill `greenhouse-gtm-ga4-operator`.
- Embedding on a host (Think dock, WordPress snippet), rollout/flags, `growth.cta.*` signals.

## Mental model — end to end

```text
operador (/growth/ctas o API admin, capability growth.cta.*)
  → author draft → review → publish (ATÓMICO: gate de acción resoluble + snapshot inmutable
                                     + deprecia la published anterior; 1 published viva por CTA)
  → arbiter server-side por (surface, route): elegibilidad targeting (fail-closed) → priority
      → 0–1 interruptivo + N no-interruptivos, compilados browser-safe
  → <greenhouse-cta> pinta el contrato (variante visual elegida por cta_version.style_variant)
  → click → open_growth_form monta <greenhouse-form> gobernado (jamás duplica el form)
  → evidencia: dataLayer greenhouse_cta_* (direccional) + POST /events → ledger Tier A
      (browser_reported; solo server_confirmed es verdad de conversión)
  → GTM v4 reenvía a GA4 (tags por evento + DLVs; conversión sigue siendo generate_lead del form)
```

## Schema — `greenhouse_growth.cta_*` (migraciones TASK-1339)

| Tabla | Claves |
| --- | --- |
| `cta_definition` | slug UNIQUE, status active/archived |
| `cta_version` | state machine CHECK; **UNIQUE parcial: 1 published por cta**; trigger de inmutabilidad post-publish (contenido/policies/published_at congelados; solo status transiciona) |
| `cta_surface_binding` | origin_allowlist_json + allowed_cta_slugs_json + embed_key_id/hash (solo hash; secreto se entrega UNA vez) |
| `cta_conversion_event` | **append-only por trigger** (sin UPDATE/DELETE; runtime solo SELECT/INSERT); `trust_level` browser_reported/server_confirmed; `ingest_status` accepted/**rejected** (rechazos de forja sin PII = fuente del signal); CHECKs: accepted exige refs reales, rejected exige reason_class |

Tier B (exposición `eligible/suppressed/viewed` masiva) NUNCA entra a OLTP — arch §9.4; `viewed`
va SOLO a dataLayer, jamás al ledger.

## Domain code map

- `src/lib/growth/ctas/` — primitive canónico: `contracts.ts` (zod + enums + **SoT de telemetría**:
  `CTA_GTM_EVENT_NAMES` + `CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS` + outbox constants), `store.ts`
  (SQL + outbox in-tx; ojo: `query()` de `@/lib/db` retorna `rows` directo, NO `{rows}`),
  `arbiter.ts` (matcher glob-lite + priority + 0–1 interruptivo; targeting ausente/inválido =
  NO elegible, fail-closed), `render-contract.ts` (compiler browser-safe), `action-router.ts`
  (SOLO `open_growth_form`, resuelve vía `getPublishedRenderContractByRef` de forms),
  `ingest.ts` (pipeline forjable-hardened), `commands.ts` (lifecycle + surfaces), `readers.ts`.
- `src/growth-cta-renderer/` — bundle público (vanilla TS ~23KB, light DOM + ElementInternals):
  `element.ts` (`<greenhouse-cta>`; attrs `surface`/`embed-key`/`base-url`/`route`/`cta`/
  `form-surface`/`cta-location`/`locale`/`color-scheme`/`appearance`), `styles.ts` (**paridad
  preview↔público POR CONSTRUCCIÓN**: todo selector es `:is(greenhouse-cta, .ghc-scope)`),
  `telemetry.ts` (espejo del SoT; sanitize allowlist antes de CustomEvent + dataLayer),
  `action.ts` (monta el form, carga lazy del bundle forms), `fixtures.ts` (preview/tests).
  Build: `pnpm renderer:cta:build` → `public/growth-cta/renderer-<canal>.js` (prebuild lo corre).
- Gobernanza: `src/app/(dashboard)/growth/ctas/` + `GrowthCtasGovernanceView` (copy
  `GH_GROWTH_CTA_OPERATOR` en `src/lib/copy/growth.ts`).
- GTM build: `scripts/gtm/build-cta-events-workspace.ts` (workspace→preview→publish gobernado).
- Seed/smoke: `scripts/growth/seed-cta-ai-visibility-followup.ts --smoke` ·
  `scripts/growth/_sanity-cta-store-sql.ts` (SQL vivo vs PG).

## Estado de rollout (actualizar al cambiar)

- **2026-07-18: PRIMERA REBANADA EN PRODUCCIÓN (released).** Flag `GROWTH_CTA_ENGINE_ENABLED` ON
  en staging + Production (solo Vercel lo lee). CTA `ai-visibility-report-followup` published,
  LIVE en el reporte Think (`/brand-visibility/r/*`, dock `GrowthCtaDock.astro`, env
  `GREENHOUSE_CTA_SURFACE_ID`/`GREENHOUSE_CTA_EMBED_KEY` en Vercel de `efeonce-think`). GTM v4
  publicado (6 tags + 6 triggers CE + 7 DLVs) + custom dimensions GA4 `cta_slug`/`cta_location`/
  `placement`.
- **2026-07-18 (TASK-1427): WordPress live en página de PRUEBA + E2E verificado en ambos hosts.**
  Página `efeoncepro.com/greenhouse-cta-prueba/` (id `251561`, noindex, `cta-location=wp_test_page`,
  bloque HTML con el snippet, cero cambios de tema — rollback = borrar la página). Evidencia:
  dataLayer + `/g/collect` (3 eventos) + ingest 202 + ledger `browser_reported/accepted` + forja
  403 (`surface_unauthorized`). ⚠️ Ningún host tiene CMP/consent-mode defaults — los tags disparan
  sin gate (postura pre-existente del sitio; LEARNINGS 2026-07-18). Ventana steady-state 7d abierta
  (hasta 2026-07-25). Pendiente: placement AMPLIO WP (decisión del operador post-validación;
  recomendado posts del blog vía `the_content` en `ohio-child`), placement interruptivo, Tier B,
  cockpit de autoría, más acciones.

## Hard rules (anti-regression — arch §20 + aprendizajes de implementación)

- **NUNCA** arbitrar/decidir política en el browser: el renderer recibe 0–1 interruptivo + N
  no-interruptivos YA resueltos; targeting/priority/suppression jamás cruzan al contrato.
- **NUNCA** tratar un evento browser como conversión: todo ingest público entra
  `browser_reported`; solo `server_confirmed` (u submission server-aceptada de forms) es verdad.
- **NUNCA** duplicar schema/validación/consent de Growth Forms: `open_growth_form` monta el
  `<greenhouse-form>` gobernado y guarda solo la relación (test de boundary lo vigila).
- **NUNCA** editar una `cta_version` published (trigger DB lo bloquea): editar = versión nueva;
  publish deprecia la anterior en la misma tx.
- **NUNCA** escribir exposición masiva (`viewed`/`eligible`/`suppressed`) al ledger OLTP.
- **NUNCA** saltarse el cross-check `cta_version↔surface` + embed key + origin en el ingest; los
  rechazos se persisten sin PII (capped por IP/hora) — son la fuente del signal de forja.
- **NUNCA** agregar un selector CSS del renderer que no use `:is(greenhouse-cta, .ghc-scope)` —
  el preview y el público comparten reglas por construcción (drift real atrapado en GVC 2026-07-18).
- **NUNCA** emitir un evento/param fuera del SoT (`CTA_GTM_EVENT_NAMES`/allowlist): extender SoT +
  espejo del renderer JUNTOS (el parity test revienta si divergen) y registrar en TRACKING-PLAN.
- **NUNCA** armonizar los 3 namespaces: `greenhouse_cta_*` (browser/GTM) ≠ `growth.cta.*`
  (interno: outbox/signals/capabilities) ≠ `gh_cta_clicked` (rail legacy ad-hoc WP — deprecar,
  no renombrar). Ningún click de CTA es key event GA4.
- **NUNCA** committear/loggear embed key secrets (solo hash en DB; rotables vía
  `POST /api/admin/growth/ctas/surfaces {action:'rotate_embed_key'}`).
- **NUNCA** publicar tags al container GTM sin workspace→quick_preview→confirmación humana.
- **SIEMPRE** fail-closed en superficie pública: sin contrato/flag OFF/error ⇒ el element queda
  `display:none`, jamás un card roto. `pause` (capability separada de `publish` a propósito) es el
  freno de emergencia per-versión (§16.3): deja de arbitrarse en ≤ ~2 min (TTL del cache CORS).
- **SIEMPRE** que se agregue capability/flag/signal: grant a rol real mismo PR · fila en
  `FEATURE_FLAG_STATE_LEDGER.md` · wire-up en `get-reliability-overview.ts`.

## Sinergias (cómo compone con las demás skills)

- **`greenhouse-growth-forms`** — el action target de V1: el CTA abre el `<greenhouse-form>`
  gobernado. Boundary duro: forms es la autoridad de campos/validación/consent/conversión
  (`generate_lead` sigue siendo SU key event). Reusos permitidos: `readers.ts` (resolver el form) +
  `embed-key.ts` (crypto) + `public-submission` (abuse core). Nada más.
- **`greenhouse-gtm-ga4-operator`** — construye/publica los tags de la familia `greenhouse_cta_*`
  y las custom dimensions GA4; este dominio define QUÉ se emite (SoT), aquel CÓMO se taggea.
  Registro obligatorio en TRACKING-PLAN §CTAs.
- **`efeonce-public-site-wordpress`** — embed del snippet en WordPress (Elementor/HTML widget),
  enqueue del bundle pineado, verificación live del host. El placement WP es decisión del host.
- **`greenhouse-backend` + `greenhouse-postgres`** — patrones canónicos de rutas/commands/SQL/
  migraciones al tocar el primitive o el schema.
- **`greenhouse-ux` + product-design (`modern-ui`/`state-design`/`motion-design`/
  `greenhouse-ux-writing`)** — nuevas variantes visuales, placements interruptivos (dialog/focus
  trap/anti-CLS), copy estructural del renderer y de la gobernanza. Todo copy de campaña es DATO
  del contrato, validado con ux-writing al autorarlo.
- **`growth-marketing-cro`** — criterio CRO: qué CTA, qué copy, qué targeting; sin dark patterns;
  experimentación powered sigue DIFERIDA (nada de declarar "winners").
- **`greenhouse-production-release`** — el flip productivo de cambios del motor va por el release
  control plane; flags multi-runtime según el ledger.
- **`astro` (+ overlay efeonce-think)** — el dock de Think (`GrowthCtaDock.astro`) y futuros
  islands; cross-repo siempre rama+PR (main auto-deploya).

## Common commands

```bash
pnpm vitest run src/growth-cta-renderer src/lib/growth/ctas       # suites dominio + renderer
pnpm renderer:cta:build                                           # bundle público (canal preview)
pnpm fe:capture task-1340-growth-cta-renderer --env=local         # GVC gobernanza + preview
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/seed-cta-ai-visibility-followup.ts --smoke
pnpm staging:request "/api/admin/growth/ctas"                     # inventario vía API admin
```

## Reference docs

- Arquitectura: `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (+ §23
  delta foundation) · ADR `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- Funcional: `docs/documentation/growth/motor-cta-popup.md`
- Operar/embeber (runbook): `docs/manual-de-uso/growth/operar-motor-cta.md`
- Master UI flow: `docs/ui/flows/EPIC-023-growth-cta-popup-UI-FLOW.md`
- Medición: `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` §CTAs + doc `04`
- Tasks fuente: `docs/tasks/complete/TASK-1339-*.md` + `TASK-1340-*.md`

## Skill Maintenance Contract

**Esta skill se actualiza en el MISMO change set** que cualquier cambio de flujo crítico del motor
(ambos espejos: `.claude/skills/greenhouse-growth-ctas/` y `.codex/skills/greenhouse-growth-ctas/`):

- cambios de schema `cta_*`, state machine, o versión del contrato (`greenhouse-growth-cta-popup.v*`);
- atributos/tokens/variantes/estados del renderer, o el patrón de paridad CSS;
- familia de eventos/allowlist de telemetría, tags GTM, o custom dimensions;
- rutas API públicas/admin, capabilities `growth.cta.*`, flags, o signals;
- nuevas acciones del router, placements (interruptivo), Tier B, kill switch global, o el cockpit;
- cambios del estado de rollout (§Estado de rollout — mantener la fecha y lo pendiente al día).

Si un agente cierra una task del motor sin tocar esta skill, el cierre está incompleto
(`greenhouse-documentation-governor` la trata como doc viva del dominio).
