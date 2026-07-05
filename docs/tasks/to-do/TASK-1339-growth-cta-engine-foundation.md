# TASK-1339 — Growth CTA & Popup Engine — foundation `growth.cta` (slice-scoped)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-023`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `growth|public-site|data`
- Blocked by: `none`
- Branch: `task/TASK-1339-growth-cta-engine-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la foundation server-side de `growth.cta` **acotada a la primera rebanada vertical** de EPIC-023: define y publica un CTA (contrato inmutable), arbitra server-side qué prompt aplica en una surface, ingesta evidencia de conversión audit-grade y rutea la acción `open_growth_form` hacia el motor de Growth Forms. No incluye renderer visible (eso es TASK-1340), Tier B de exposición, otras acciones, otros placements ni experimentación.

## Why This Task Exists

EPIC-023 aceptó la arquitectura de un motor de CTA/popup gobernado por Greenhouse (`GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`), con Full API Parity y renderer portable. La secuenciación canónica (Arch §18) es **vertical-slice-first**: probar la espina completa (compile → arbitrate → ledger → action) contra un consumidor real antes de generalizar, en vez de construir una foundation horizontal especulativa sin renderer. Esta task materializa esa espina como contrato server-side para que TASK-1340 (renderer portable en WordPress + Think) tenga un contrato publicado estable que consumir. Sin ella, el renderer no tiene fuente de verdad y el diseño degradaría a snippets por página (Alternative B rechazada).

## Goal

- `growth.cta` existe como capability con primitive canónico en `src/lib/growth/ctas/` (readers + commands), schema `greenhouse_growth`, y contrato gobernado a nivel capability (Full API Parity).
- Un `cta_definition` + `cta_version` publicado inmutable se compila a un render contract browser-safe y se arbitra **server-side** por surface+route+contexto (0–1 interruptivo + N no-interruptivos).
- La API pública sirve el render contract y **ingesta evidencia de conversión tratada como untrusted** (cross-check `cta_version↔surface_id`, `trust_level`, `consent_source`); la API admin autora/publica/pausa vía commands.
- El action router rutea `open_growth_form` hacia el contrato existente de Growth Forms **sin duplicar** schema/validación/consent; una reliability signal cubre el path.
- El CTA follow-up del reporte AI Visibility queda definido y publicado como primer caso real, con surface bindings para **ambas** surfaces (`wordpress` + `astro/think`) desde el día uno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (spec raíz — §6 boundaries, §7/§7.1 placement + Full API Parity, §9 domain model, §11 arbitración server-side, §12 action routing, §13 telemetry, §16 seguridad/consent/kill-switch, §18 secuenciación, §20 hard rules)
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md` (ADR — runtime contract, Deferred out of V1)
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` (precedente de renderer portable + surface binding + embed key + action target)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (state machine + CHECK + audit; capability⇒grant+coverage; flag default-OFF + shadow + flip)

Reglas obligatorias:

- Placement de dominio `growth.cta` — NO bajo `public_site`/`commercial`/`platform`/`growth.forms`.
- Published versions inmutables; editar un CTA vivo crea una versión nueva.
- Evidencia de conversión append-only en Postgres (audit-grade); NUNCA `eligible`/`suppressed`/`viewed` sincrónicos en OLTP (esa Tier B queda fuera de scope, TASK futura).
- Arbitración server-side; el browser recibe el resultado resuelto, nunca el candidate set ni la política de prioridad.
- Ingest público = write forjable: cross-check `cta_version↔surface_id`, `trust_level`, rate-limit/idempotencia; solo `server_confirmed` cuenta como conversión.
- Migration marker `-- Up Migration` + bloque DO de verificación post-DDL (anti pre-up-marker bug).
- `canonicalErrorResponse` para todo error client-facing; `captureWithDomain` (dominio `growth` o el que aplique) en vez de Sentry directo.

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — registrar `GROWTH_CTA_ENGINE_ENABLED` al declararlo.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — mecánica de migración (node-pg-migrate).
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` — los 14 ROLE_CODES reales para el grant de capability.

## Dependencies & Impact

### Depends on

- Schema `greenhouse_growth` existente (verificar; hoy hospeda `growth.forms`). `[verificar]`
- Contrato de Growth Forms para `open_growth_form`: `src/lib/growth/forms/contracts.ts`, `src/lib/growth/forms/readers.ts`, form key `fdef-ai-visibility-grader`/`fhsf-ai-visibility-grader`. `[verificar]`
- `capabilities_registry` + `src/lib/entitlements/*` (catalog + runtime grants + coverage test).
- Reliability control plane: `src/lib/reliability/queries/` + `getReliabilityOverview`.

### Blocks / Impacts

- **Bloquea TASK-1340** (renderer portable + surfaces WordPress/Think) — consume el render contract publicado por esta task.
- Impacta EPIC-023 exit criteria (foundation `growth.cta`).
- No impacta `growth.forms` runtime (lo consume como action target, no lo modifica).

### Files owned

- `migrations/[timestamp]_task-1339-growth-cta-foundation.sql`
- `src/lib/growth/ctas/**` (nuevo: `contracts.ts`, `readers.ts`, `commands.ts`, `arbiter.ts`, `render-contract.ts`, `action-router.ts`, `ingest.ts`, `index.ts`, `__tests__/**`)
- `src/app/api/public/growth/ctas/**` (nuevo)
- `src/app/api/admin/growth/ctas/**` (nuevo)
- `src/lib/entitlements/*` (agregar capability `growth.cta.*` + grants — edición acotada)
- `src/lib/reliability/queries/growth-cta-*.ts` (nuevo)
- `src/types/db.d.ts` (regenerado por migración)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag)

## Current Repo State

### Already exists

- `growth.forms` como capability hermana con precedente completo: `src/lib/growth/forms/` (contracts, commands, readers, policy-compiler, embed-key, destinations), API pública `/api/public/growth/forms/**` + admin `/api/admin/growth/forms/**`, y renderer portable shipeado `src/growth-forms-renderer/**` (TASK-1231, complete).
- Canonical error contract (`src/lib/api/canonical-error-response.ts`), entitlements + coverage test, reliability control plane.

### Gap

- No existe `src/lib/growth/ctas/`, ni schema/tablas de CTA, ni capability `growth.cta.*`, ni API pública/admin de CTAs, ni arbiter/ingest/action-router de CTA.
- El CTA follow-up del reporte AI Visibility no existe como objeto gobernado (hoy sería un anchor por página).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api` (+ `db`/`migration` additive, `reader`, `command`)
- Source of truth afectado: nuevo schema `greenhouse_growth` tablas `cta_definition` / `cta_version` / `cta_surface_binding` / `cta_conversion_event`; readers/commands en `src/lib/growth/ctas/`
- Consumidores afectados: renderer público (TASK-1340), admin cockpit (task futura), Nexa/MCP (por Full API Parity), Growth Forms (como action target)
- Runtime target: `local` → `staging` → `production` (gateado por flag OFF)

### Contract surface

- Contrato existente a respetar: Growth Forms `contracts.ts`/`readers.ts` (para `open_growth_form`), canonical error contract, entitlements catalog/runtime.
- Contrato nuevo o modificado: contrato versionado `greenhouse-growth-cta-popup.v1` — render contract (GET público), conversion event ingest (POST público), lifecycle commands (admin), readers (list/report/eligibility).
- Backward compatibility: `not applicable` (capability nueva, gateada por flag default OFF).
- Full API parity: la lógica vive en `src/lib/growth/ctas/` (commands/readers); admin UI, Nexa, MCP, CLI son consumers del MISMO primitive. Writes de lifecycle aptos para `propose → confirm → execute`. Ver `## Capability Definition of Done` abajo.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.cta_definition`, `greenhouse_growth.cta_version`, `greenhouse_growth.cta_surface_binding`, `greenhouse_growth.cta_conversion_event` (Tier A).
- Invariantes que no se pueden romper:
  - `cta_version.status` sigue la state machine `draft → review → published → paused → deprecated → archived`; published es inmutable (editar = versión nueva) — CHECK constraint + guard en command.
  - `cta_conversion_event` es append-only (sin UPDATE/DELETE); solo `trust_level='server_confirmed'` cuenta como conversión.
  - El ingest público valida surface binding + origin + embed key y cruza `cta_version ↔ surface_id`; mismatch se rechaza y emite signal.
  - Un `cta_definition` puede tener muchas versions; un CTA puede bindear a múltiples surfaces con rollout/telemetría separada.
  - El render contract expuesto al browser solo tiene campos browser-safe (sin notas de campaña, scoring, destination mapping ni PII).
- Tenant/space boundary: superficies públicas anónimas — no hay tenant; la autorización de gobernanza (admin) deriva de session + capability `growth.cta.*`. El ingest se autoriza por surface binding + embed key + origin, no por sesión.
- Idempotency/concurrency: ingest con idempotency key por `(visitor_key_hash, event_kind, cta_version_id, dedupe_window)`; lifecycle commands transaccionales; publish es atómico (snapshot inmutable).
- Audit/outbox/history: `cta_conversion_event` es el ledger append-only; lifecycle transitions emiten outbox event v1 (`growth.cta.*`) para downstream/reconciliación.

### Migration, backfill and rollout

- Migration posture: `additive` (nuevas tablas + índices + GRANTs; sin tocar tablas existentes).
- Default state: `flag OFF` — `GROWTH_CTA_ENGINE_ENABLED=false`; las rutas responden 404/disabled hasta el flip.
- Backfill plan: none (no hay data histórica que migrar; el primer CTA se autora vía command).
- Rollback path: flag OFF + revert PR + reverse migration (`DROP` de tablas nuevas, seguro por ser additive y sin consumers en prod hasta el flip).
- External coordination: registrar embed key/surface binding para las 2 surfaces; el flip productivo se coordina con TASK-1340 (renderer) — sin renderer, la foundation es shadow.

### Security and access

- Auth/access gate: admin = session + capability `growth.cta.author`/`publish`/`pause`/`read`; ingest público = surface binding + embed key + origin allowlist + `cta_version↔surface_id` cross-check.
- Sensitive data posture: sin PII en telemetría ni en render contract; identificadores de visitante son hashes pseudónimos; `consent_source` registrado.
- Error contract: `canonicalErrorResponse` (es-CL, `code`, `actionable`); `captureWithDomain(err, 'growth', …)`; sin raw errors/stack/SQL al cliente.
- Abuse/rate-limit posture: rate-limit + idempotencia en el ingest; bot filtering básico; `growth.cta.surface_unauthorized_attempt` ante forja/mismatch.

### Runtime evidence

- Local checks: `pnpm test src/lib/growth/ctas`, `pnpm lint`, `pnpm typecheck`.
- DB/runtime checks: `pnpm migrate:up` + verificación `information_schema` de las 4 tablas + CHECK constraints + GRANTs; smoke SQL del arbiter contra PG real vía proxy (ISSUE-071/TASK-893: ejercitar el SQL embebido antes de mergear).
- Integration checks: smoke del action router `open_growth_form` contra el reader de Growth Forms (resuelve el form contract sin duplicar schema).
- Reliability signals/logs: `growth.cta.render_error_rate`, `growth.cta.event_ingest_error_rate`, `growth.cta.surface_unauthorized_attempt`, `growth.cta.form_handoff_failed` registradas y visibles en `/admin/operations`.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth (`greenhouse_growth.cta_*`), contract surface (`greenhouse-growth-cta-popup.v1`) y consumers (renderer TASK-1340, admin, Nexa/MCP) nombrados con paths reales.
- [ ] Invariantes (published inmutable, append-only, surface cross-check, browser-safe) listados y con CHECK/guard.
- [ ] Access boundary explícito (admin capability vs surface/embed-key para ingest).
- [ ] Migration additive + rollback (flag OFF + reverse migration) explícito.
- [ ] Evidencia DB/runtime listada (migrate verify + arbiter SQL smoke + form-handoff smoke).
- [ ] Errores canónicos + `captureWithDomain` + sin leak de PII/internals.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive:** commands/readers en `src/lib/growth/ctas/`, no en UI.
- [ ] **Modelada como aggregate/recurso/command** (`cta_definition`/`cta_version` + lifecycle commands + render-contract reader), no click-handler.
- [ ] **Read** como reader canónico (render contract, list, report); **write** como command con command semantics, authorization fina (`growth.cta.*`, NO admin-coarse), idempotencia, audit/outbox, errores canónicos, observabilidad.
- [ ] **Capability + grant en el MISMO PR:** registrar `growth.cta.author/publish/pause/read` en registry + catalog + grant a ≥1 rol real (`efeonce_admin` + rol growth/marketing aplicable) + coverage test verde.
- [ ] **Camino programático declarado:** `/api/admin/growth/ctas/**` (governance) + `/api/public/growth/ctas/**` (data plane); MCP/ecosystem heredan por el primitive.
- [ ] **Write apto para `propose → confirm → execute`** (lifecycle); NO integración Nexa-específica.
- [ ] **Un primitive, muchos consumers:** cero lógica duplicada por consumer.
- [ ] **Parity check = SÍ** a nivel capability.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + migración (Tier A)

- Migración additive `greenhouse_growth`: `cta_definition`, `cta_version` (con state machine + CHECK `status`), `cta_surface_binding` (surface_kind, origin_allowlist, allowed_cta_slugs, embed_key_id, status), `cta_conversion_event` (append-only, `trust_level`, `consent_source`, hashes, allowlisted payload).
- Marker `-- Up Migration` + bloque DO de verificación post-DDL + GRANTs runtime + índices (incl. UNIQUE parcial de versión published activa).
- Regenerar `src/types/db.d.ts`.

### Slice 2 — Primitive canónico: readers/commands + arbiter + render contract

- `src/lib/growth/ctas/`: definition/version reader, lifecycle command set (`author`, `submitReview`, `publish` atómico inmutable, `pause`, `deprecate`), render-contract compiler (browser-safe), **arbiter server-side** (eligibility → suppression básica → priority → 0–1 interruptivo + N no-interruptivos), surface-binding + embed-key verifier con cross-check.
- Capability `growth.cta.*` en registry + catalog + grants + coverage test (mismo PR).
- Smoke del SQL embebido del arbiter contra PG real vía proxy.

### Slice 3 — API pública + admin + ingest (forgeable-write hardening)

- Público: `GET /api/public/growth/ctas/render` (render contract arbitrado por surface+route+context) y `POST /api/public/growth/ctas/events` (ingest conversión Tier A, `trust_level`, cross-check, idempotencia, rate-limit).
- Admin: `GET`/`POST` lifecycle (list/author/publish/pause) vía commands; canonical errors; `captureWithDomain`.

### Slice 4 — Action router `open_growth_form` + reliability signals

- Action router con **solo** `open_growth_form` resolviendo el contrato de Growth Forms (sin duplicar schema/validación/consent); `cta_action_attempt` cuando requiera confirmación server-side.
- Registrar signals `growth.cta.render_error_rate`, `growth.cta.event_ingest_error_rate`, `growth.cta.surface_unauthorized_attempt`, `growth.cta.form_handoff_failed` en el reliability plane.
- Autorar + publicar el primer CTA real (follow-up reporte AI Visibility) con binding a `wordpress` + `astro/think`.

## Out of Scope

- Renderer visible / Web Component / wrappers WordPress/Think (→ **TASK-1340**).
- **Tier B exposición** (`eligible`/`suppressed`/`viewed` alto volumen), visitor-state store a escala, frequency capping a escala (solo pausa/suppression básica acá).
- Otras acciones (`embed_growth_form`, `download_asset`, `book_meeting`, `hubspot_handoff`), otros placements (interruptivos), admin cockpit UI.
- **Experimentación powered** (assignment/SRM/guardrails) — diferida fuera de V1 (ADR §Deferred).
- Kill switch global a escala (esta task solo cubre `paused` por versión/surface; el emergency global es parte de la Tier B/suppression task).
- GTM/dataLayer event emission (vive en el renderer, TASK-1340).

## Detailed Spec

Ver `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` §9 (domain model: campos de cada aggregate), §10 (placement embedded/banner para el primer caso), §11 (arbitración + priority flow), §12 (action routing `open_growth_form`), §13 (telemetry contract — el server recibe la evidencia; los dataLayer events son del renderer), §16 (seguridad/consent/ingest forjable). No duplicar aquí; el agente que tome la task lee esas secciones en Discovery.

Notas de implementación:

- El arbiter es un reader server-side puro: input `(surface_id, route, coarse context)` → output `render_contract[]` ya resuelto. Nunca expone candidatos ni política.
- `publish` toma un snapshot inmutable de copy/placement/action/targeting/priority en `cta_version`; ediciones posteriores crean versión nueva.
- El ingest separa `trust_level`: `browser_reported` (directional) vs `server_confirmed`. Solo el segundo cuenta como conversión y alimenta reportes.
- El action router para `open_growth_form` resuelve el form contract vía el reader de `growth.forms` — el CTA guarda solo la relación (form key + submission join), nunca copia campos/validación/consent.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema) → Slice 2 (primitive + arbiter + capability) → Slice 3 (API + ingest) → Slice 4 (action router + signals + primer CTA).
- Slice 2 DEBE incluir capability + grant + coverage test en el mismo PR que el `can()`-check (guard CI rompe el build si falta).
- Ningún slice prende el flag en producción; el flip productivo se coordina con TASK-1340 (sin renderer la foundation es shadow).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| SQL embebido del arbiter con type mismatch (DATE vs TIMESTAMP, COALESCE) revienta en runtime | growth.cta / PG | medium | Smoke contra PG real vía proxy antes de mergear (ISSUE-071/TASK-893); lint `no-extract-epoch-from-date-subtraction` | `growth.cta.render_error_rate` |
| Ingest público forjado infla el ledger / futura contaminación de reportes | growth.cta / public write | high | Cross-check `cta_version↔surface_id` + embed key + origin + `trust_level` + rate-limit/idempotencia + bot filtering básico | `growth.cta.surface_unauthorized_attempt` |
| Migración additive con marker invertido registra sin ejecutar DDL | migration / PG | low | `-- Up Migration` + bloque DO con RAISE EXCEPTION post-DDL; verificar `information_schema` | falla en `migrate:up` / DO exception |
| Capability sin grant rompe build por coverage test | entitlements | low | Grant a ≥1 rol real en el mismo PR (TASK-873/935) | CI coverage test |
| Action router duplica schema/consent de Growth Forms | growth.forms boundary | low | Router resuelve vía reader de forms; solo guarda la relación; test de no-duplicación | revisión + `growth.cta.form_handoff_failed` |

### Feature flags / cutover

- Env var `GROWTH_CTA_ENGINE_ENABLED` (default `false`). Controla si las rutas públicas/admin de CTA responden. Registrar fila en `FEATURE_FLAG_STATE_LEDGER.md` al declararlo (gate `docs:closure-check`). Revert: flag a `false` + redeploy (<5 min Vercel). Flip productivo diferido a la coordinación con TASK-1340.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (`DROP TABLE` de las 4 nuevas — additive, sin consumers en prod) | <10 min | sí |
| Slice 2 | revert PR (primitive/capability nuevos, sin efecto con flag OFF) | <5 min | sí |
| Slice 3 | flag OFF (rutas dejan de responder) + revert PR | <5 min | sí |
| Slice 4 | pausar el CTA autorado (`pause` command) + flag OFF | <5 min | sí |

### Production verification sequence

1. `pnpm migrate:up` en staging + verificar 4 tablas + CHECK + GRANTs vía `information_schema`.
2. Deploy a staging con `GROWTH_CTA_ENGINE_ENABLED=false` + verificar que rutas responden disabled y que `growth.forms` no cambió.
3. Flip flag `true` en staging + autorar/publicar el CTA follow-up + `GET /render` devuelve contrato browser-safe + `POST /events` (server_confirmed) escribe en el ledger + arbiter devuelve 0–1 interruptivo.
4. Smoke de ingest forjado (mismatch surface) → rechazado + `surface_unauthorized_attempt` emite.
5. Smoke `open_growth_form` → resuelve el form contract del grader sin duplicar campos.
6. Repetir 1–5 en producción **coordinado con TASK-1340** (el flip productivo sin renderer no aporta valor; mantener shadow hasta el renderer).
7. Monitorear signals 7d post-flip.

### Out-of-band coordination required

- Registrar embed key + surface binding para `wordpress` y `astro/think` (config, no secreto de visitante).
- Coordinar el flip productivo con TASK-1340 (renderer). Sin renderer, la foundation queda code-complete en shadow.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen `greenhouse_growth.cta_definition/cta_version/cta_surface_binding/cta_conversion_event` con state machine + CHECK + append-only + GRANTs, verificadas contra `information_schema`.
- [ ] `src/lib/growth/ctas/` expone readers + lifecycle commands + arbiter server-side + render-contract compiler + action router (`open_growth_form`), con `published` inmutable.
- [ ] Capability `growth.cta.author/publish/pause/read` registrada + grant a ≥1 rol real + coverage test verde en el mismo PR.
- [ ] `GET /api/public/growth/ctas/render` devuelve solo campos browser-safe y contrato arbitrado (0–1 interruptivo + N no-interruptivos); nunca candidate set ni política.
- [ ] `POST /api/public/growth/ctas/events` valida surface+origin+embed key + cross-check `cta_version↔surface_id`, escribe append-only con `trust_level`/`consent_source`, es idempotente y rate-limited; mismatch → rechazo + `surface_unauthorized_attempt`.
- [ ] `open_growth_form` resuelve el contrato de Growth Forms sin duplicar schema/validación/consent (test de no-duplicación).
- [ ] Signals `growth.cta.render_error_rate/event_ingest_error_rate/surface_unauthorized_attempt/form_handoff_failed` registradas y visibles en `/admin/operations`.
- [ ] El CTA follow-up del reporte AI Visibility está autorado + publicado con binding a `wordpress` + `astro/think`.
- [ ] `GROWTH_CTA_ENGINE_ENABLED` (default OFF) registrado en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Errores client-facing usan `canonicalErrorResponse` (es-CL); errores server usan `captureWithDomain`; sin leak de PII/internals.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (full suite — atrapa contratos cross-module; foco en `src/lib/growth/ctas` + entitlements coverage)
- `pnpm migrate:up` + verificación `information_schema` de tablas/constraints/GRANTs
- Smoke SQL del arbiter contra PG real vía `pnpm pg:connect` proxy
- Smoke del action router `open_growth_form` contra el reader de Growth Forms

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambió comportamiento/estructura
- [ ] chequeo de impacto cruzado (marcar TASK-1340 desbloqueada al publicar el render contract)
- [ ] `pnpm test` (full) + `pnpm build` (prod) verdes en el último commit antes de cerrar (Task Closing Quality Gate)
- [ ] fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` refleja el estado real por environment

## Follow-ups

- **TASK-1340** — renderer portable + surfaces WordPress/Think (consume el render contract).
- Task futura — Tier B exposición + visitor-state store + frequency capping + kill switch global.
- Task futura — acciones adicionales (`embed_growth_form`, `download_asset`, `book_meeting`, `hubspot_handoff`) + placement interruptivo.
- Task futura — admin cockpit `/admin/growth/ctas`.
- Task futura (post-V1) — experimentación powered (`growth.experiment`).

## Open Questions

- ¿El schema `greenhouse_growth` ya existe o hay que crearlo en la migración? `[verificar]`
- ¿Qué rol growth/marketing real (además de `efeonce_admin`) recibe el grant de `growth.cta.author/publish`? Confirmar contra `role-codes.ts` (candidatos: `efeonce_account`, `efeonce_operations`).
- ¿El primer CTA follow-up abre el grader form (`open_growth_form`) o linkea al hub Think? Para esta foundation se asume `open_growth_form`; confirmar con el diseño de TASK-1340.
