# TASK-1353 — HubSpot Portal Grader — foundation `growth.hubspot_portal` (Fase 1, slice-scoped)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-024`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `growth|data|ecosystem`
- Blocked by: `none`
- Branch: `task/TASK-1353-growth-hubspot-portal-grader-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la foundation server-side de `growth.hubspot_portal` **acotada a la Fase 1 de EPIC-024**: el dominio, el schema (`portal_diagnostic_run` state machine + `portal_diagnostic_report` token inmutable), los chokepoints de run gobernados (`createPublicPortalDiagnosticRun` público / `requestPortalDiagnosticRunForOrganization` per-org), el entitlement per-org (`hubspot_portal_v1` vía `module_assignments`) con capabilities + grants + coverage, y los flags default-OFF. El **scoring real** (command Kortex `score_self_assessment` o rubric-artifact) queda como **seam declarado** que llena TASK-1354; esta task provee un adapter placeholder determinista para ejercitar el ciclo run→report end-to-end. Espeja `src/lib/growth/ai-visibility/**`. **NO** incluye intake público completo/report model rico (TASK-1354), superficie Think (TASK-1355), form (TASK-1356), ni la puerta conectada/OAuth (TASK-1357, Fase 2).

## Why This Task Exists

EPIC-024 (ADR `GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md`) aceptó construir el HubSpot Portal Grader como segundo lead magnet `growth`, con motor en Kortex, contrato gobernado en Greenhouse y superficie en Think, modelo híbrido de dos puertas. La secuenciación fasea la **puerta pública (self-assessment) primero** (no depende del cutover prod de Kortex). Esta task materializa la **columna vertebral gobernada** — run lifecycle + report token + entitlement per-org — para que TASK-1354 (scoring + intake), TASK-1355 (Think) y TASK-1356 (form) tengan un contrato estable que consumir. Sin ella, cada superficie improvisaría su propio run/persistencia y se rompería Full API Parity + el modelo "un motor, N puertas".

## Goal

- `growth.hubspot_portal` existe como capability con primitive canónico en `src/lib/growth/hubspot-portal/` (readers + commands), schema `greenhouse_growth`, y contrato gobernado a nivel capability (Full API Parity).
- Un `portal_diagnostic_run` recorre su state machine (`draft → submitted → queued → running → scored → report_ready → failed`) y produce un `portal_diagnostic_report` con token no-enumerable + `expires_at` inmutable.
- El entitlement per-org `hubspot_portal_v1` (vía `module_assignments`, NO por-rol) gatea las puertas: **pública** sin entitlement (captcha + rate-limit + budget global), **portal/trial/contratado/operador** vía `requestPortalDiagnosticRunForOrganization` con claim atómico (los runs SON el ledger, espejo TASK-1277).
- El **scoring seam** (`PortalScoringPort`) está declarado con un adapter placeholder determinista; TASK-1354 lo reemplaza por el command Kortex / rubric-artifact real.
- Flags `HUBSPOT_PORTAL_GRADER_ENABLED` + `HUBSPOT_PORTAL_GRADER_CONNECTED_DOOR_ENABLED` (ambos default OFF) registrados en el ledger.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md` (ADR raíz — boundary Kortex↔Greenhouse↔Think, dos puertas, data posture, runtime contract, 4 pilares)
- `docs/public-site/decisions/PDR-007-hubspot-portal-grader-lead-magnet.md` (posicionamiento) + `PDR-006` (landing hermana)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (template a espejar — §6 SoT boundaries, §7 aggregates run/report, §9 public experience, §11 API parity; Delta TASK-1277 = entitlement per-org)
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md` + PDR-003 (Greenhouse le pide comandos gobernados a Kortex; NO reimplementa el motor)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` + `docs/tasks/complete/TASK-1277-aeo-entitlement-metering-platform.md` (module_assignments per-org, "un motor N puertas")
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (state machine + CHECK + audit; capability⇒grant+coverage; flag default-OFF + shadow + flip)

Reglas obligatorias:

- Placement de dominio `growth.hubspot_portal` — NO bajo `public_site`/`commercial`/`platform`/`growth.ai_visibility`/`kortex.*`.
- **NO reimplementar el motor de auditoría**: el scoring vive como seam/port; la puerta conectada (Fase 2) invoca `kortex.audit.run` vía el command adapter, nunca escribe HubSpot directo (regla dura PDR-003/ADR).
- `portal_diagnostic_report` published es **inmutable** (snapshot); re-run = report nuevo. Report token 256-bit no-enumerable + `expires_at`.
- Entitlement per-org vía `module_assignments` (`hubspot_portal_v1`), NO `role_view_assignments`; tier en `metadata_json`; claim atómico (`FOR UPDATE` + COUNT de runs del mes en la misma tx) — los runs SON el ledger.
- **Data-minimization (Fase 2, pero declarado ya):** la puerta conectada guardará score/métricas, NUNCA contactos/deals/PII crudos del portal del prospecto.
- Migration marker `-- Up Migration` + bloque DO de verificación post-DDL (anti pre-up-marker bug); verificar contra `information_schema`.
- SQL embebido ejercitado contra PG real vía proxy antes de mergear (ISSUE-071/TASK-893); `canonicalErrorResponse` para errores client-facing; `captureWithDomain(err, 'growth', …)`.

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — registrar `HUBSPOT_PORTAL_GRADER_ENABLED` + `HUBSPOT_PORTAL_GRADER_CONNECTED_DOOR_ENABLED` al declararlos.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — mecánica de migración (node-pg-migrate).
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` — los 14 ROLE_CODES reales para el grant de capability.

## Dependencies & Impact

### Depends on

- Schema `greenhouse_growth` existente (hoy hospeda `growth.forms`/`growth.ai_visibility`). `[verificar]`
- Entitlement platform per-org: `greenhouse_client_portal.modules` + `module_assignments` + `resolveAeoEntitlement`/`hasModuleAccess` como precedente (TASK-1277). `[verificar]` paths en `src/lib/growth/ai-visibility/entitlement.ts` + `request-run.ts`.
- `capabilities_registry` + `src/lib/entitlements/*` (catalog + runtime grants + coverage test).
- Reliability control plane: `src/lib/reliability/queries/` + `getReliabilityOverview`.
- Precedente completo a espejar: `src/lib/growth/ai-visibility/**` (`request-run.ts`, `entitlement.ts`, `commands.ts`, `contracts.ts`, `store.ts`, `public-report-url.ts`).
- **Fase 2 (declarado, no consumido acá):** Kortex command adapter `POST /api/admin/kortex/commands` (`kortex.audit.run`, TASK-1164) para la puerta conectada.

### Blocks / Impacts

- **Bloquea TASK-1354** (scoring self-assessment + intake público + report model) — consume el run lifecycle + report token + seam.
- **Bloquea TASK-1356** (Growth Form `efeonce-hubspot-portal-audit` + handoff) — engancha al run.
- Habilita TASK-1355 (superficie Think) que consumirá el reader de report por token.
- No impacta `growth.ai_visibility` ni `growth.forms` runtime (comparte patrón, no schema/tablas).

### Files owned

- `migrations/[timestamp]_task-1353-growth-hubspot-portal-foundation.sql`
- `src/lib/growth/hubspot-portal/**` (nuevo: `contracts.ts`, `readers.ts`, `commands.ts`, `request-run.ts`, `entitlement.ts`, `store.ts`, `scoring-port.ts`, `public-report-url.ts`, `flags.ts`, `index.ts`, `__tests__/**`)
- `src/app/api/public/growth/hubspot-portal/**` (skeleton público — run request + report read; el intake rico es TASK-1354)
- `src/app/api/admin/growth/hubspot-portal/**` (operator run + report review)
- `src/lib/entitlements/*` (agregar capabilities `growth.hubspot_portal.run.portal|operator` + grants — edición acotada)
- `src/lib/reliability/queries/growth-hubspot-portal-*.ts` (nuevo)
- `src/types/db.d.ts` (regenerado por migración)
- Seed del módulo `hubspot_portal_v1` en `greenhouse_client_portal.modules` (migración, espejo del seed `ai_visibility_v1`)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (filas de los flags)

## Current Repo State

### Already exists

- `growth.ai_visibility` como capability hermana con precedente completo: motor/run/report/entitlement/token (`src/lib/growth/ai-visibility/**`), API pública `/api/public/growth/ai-visibility/**`, entitlement per-org (`module_assignments`, tier en `metadata_json`), claim atómico, runs-as-ledger (TASK-1277).
- Kortex command adapter (`greenhouse-kortex-command-adapter.v1`, TASK-1164) con `kortex.audit.run` en el catálogo — motor de la puerta conectada (Fase 2).
- Canonical error contract, entitlements + coverage test, reliability control plane.

### Gap

- No existe `src/lib/growth/hubspot-portal/`, ni schema/tablas `portal_diagnostic_*`, ni capability `growth.hubspot_portal.*`, ni módulo `hubspot_portal_v1`, ni API pública/admin del portal grader.
- El "diagnóstico de portal" de PDR-006/TASK-1352 no existe como objeto gobernado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration` (+ `db`, `command`, `reader`, `api` additive)
- Source of truth afectado: nuevo schema `greenhouse_growth` tablas `portal_diagnostic_run` / `portal_diagnostic_report`; módulo `hubspot_portal_v1` en `greenhouse_client_portal.modules`; readers/commands en `src/lib/growth/hubspot-portal/`
- Consumidores afectados: scoring+intake (TASK-1354), superficie Think (TASK-1355), Growth Form (TASK-1356), puerta conectada (TASK-1357), Nexa/MCP (Full API Parity), admin review
- Runtime target: `local` → `staging` → `production` (gateado por flag OFF)

### Contract surface

- Contrato existente a respetar: entitlement per-org (`module_assignments`, patrón `resolveAeoEntitlement`), canonical error contract, entitlements catalog/runtime, reliability plane.
- Contrato nuevo o modificado: contrato versionado `greenhouse-growth-hubspot-portal.v1` — run request (POST público/admin), report read por token (GET público), operator run (admin), readers (list/report/eligibility). Report model versionado (shape rico = TASK-1354; acá el shell del token + snapshot).
- Backward compatibility: `not applicable` (capability nueva, gateada por flag default OFF).
- Full API parity: la lógica vive en `src/lib/growth/hubspot-portal/` (commands/readers); superficie Think, admin, Nexa, MCP son consumers del MISMO primitive. Ver `## Capability Definition of Done`.

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_growth.portal_diagnostic_run`, `greenhouse_growth.portal_diagnostic_report`; seed módulo `hubspot_portal_v1`.
- Invariantes que no se pueden romper:
  - `portal_diagnostic_run.status` sigue la state machine `draft → submitted → queued → running → scored → report_ready → failed` — CHECK constraint + guard en command; un run que ve input elegible pero produce 0 score degrada a `failed` con evidencia, nunca reporta en $0/vacío como `report_ready`.
  - `portal_diagnostic_run.door` ∈ `{public_self_assessment, connected_audit}`; `engine_source` ∈ `{kortex, rubric_artifact, placeholder}` (placeholder solo en esta task; TASK-1354 lo quita del path productivo).
  - `portal_diagnostic_report` es **inmutable** post `report_ready` (sin UPDATE de snapshot); re-run = report nuevo. `report_token` 256-bit no-enumerable + `expires_at`.
  - Los runs SON el ledger de entitlement: `organization_id`/`assignment_id`/`run_source`/`cost_attribution` en la fila del run; claim atómico (`FOR UPDATE` sobre el assignment + COUNT runs `portal_%` del mes en la misma tx).
  - La puerta pública NO requiere entitlement (captcha + rate-limit por email/IP + budget diario global); las puertas per-org sí.
  - **Data-minimization (Fase 2):** la puerta conectada persiste score/métricas derivadas, NUNCA CRM crudo/PII del prospecto.
- Tenant/space boundary: puerta pública anónima (sin tenant); puertas per-org autorizan por `module_assignments` del `organization_id` + capability `growth.hubspot_portal.run.*`. Binding a Kortex (Fase 2) vía `sister_platform_bindings` (`EO-SPB-0002`), no en esta task.
- Idempotency/concurrency: run request con idempotency key; claim de entitlement atómico; report token único; `publish`/`report_ready` atómico (snapshot inmutable).
- Audit/outbox/history: transitions del run emiten outbox event v1 (`growth.hubspot_portal.*`) para downstream/reconciliación; el run row es append-only en su historia de estado.

### Migration, backfill and rollout

- Migration posture: `additive` (nuevas tablas + índices + GRANTs + seed del módulo; sin tocar tablas existentes).
- Default state: `flag OFF` — `HUBSPOT_PORTAL_GRADER_ENABLED=false`; rutas responden 404/disabled hasta el flip. `HUBSPOT_PORTAL_GRADER_CONNECTED_DOOR_ENABLED=false` (Fase 2).
- Backfill plan: none (sin data histórica; el primer run se crea vía command).
- Rollback path: flag OFF + revert PR + reverse migration (`DROP` de tablas nuevas + revert del seed del módulo — seguro por additive y sin consumers en prod hasta el flip).
- External coordination: el flip productivo se coordina con TASK-1354 (scoring) + TASK-1355 (Think) — sin scoring real, la foundation es shadow. Puerta conectada (Fase 2) NO se habilita acá.

### Security and access

- Auth/access gate: admin/operator = session + capability `growth.hubspot_portal.run.operator` (scope `tenant`); puerta per-org = `growth.hubspot_portal.run.portal` (scope `own`) + `hasModuleAccess(org, 'hubspot_portal_v1')` (regla "capability = puede; módulo = tiene"); puerta pública = captcha + rate-limit + budget global (sin sesión).
- Sensitive data posture: sin PII en el report model público; identificadores de visitante pseudónimos; `consent_source` registrado. Fase 2 (conectada): OAuth least-privilege read-only + data-minimization + delete-on-disconnect (declarado, implementado en TASK-1357).
- Error contract: `canonicalErrorResponse` (es-CL, `code`, `actionable`) — errores canónicos `hubspot_portal_not_entitled` 403 / `hubspot_portal_run_disabled` 409 / `hubspot_portal_quota_exhausted` 429 / `hubspot_portal_cost_blocked` 429 (espejo AEO); `captureWithDomain(err, 'growth', …)`; sin raw errors/stack/SQL al cliente.
- Abuse/rate-limit posture: puerta pública con captcha + rate-limit por email/IP + budget diario global (espejo `createPublicGraderRun`); signal ante forja/abuso.

### Runtime evidence

- Local checks: `pnpm test src/lib/growth/hubspot-portal`, `pnpm lint`, `pnpm typecheck`.
- DB/runtime checks: `pnpm migrate:up` + verificación `information_schema` de las 2 tablas + CHECK constraints + GRANTs + seed del módulo; smoke SQL del claim atómico contra PG real vía proxy (ISSUE-071/TASK-893).
- Integration checks: smoke del ciclo run→report con el adapter placeholder (run llega a `report_ready`, token resuelve el reader); smoke del claim de entitlement per-org (allowance decrementa; `quota_exhausted` cuando se agota).
- Reliability signals/logs: `growth.hubspot_portal.run_failed`, `growth.hubspot_portal.entitlement_claim_error`, `growth.hubspot_portal.public_abuse_blocked` registradas y visibles en `/admin/operations`.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth (`greenhouse_growth.portal_diagnostic_run/report`, módulo `hubspot_portal_v1`), contract surface (`greenhouse-growth-hubspot-portal.v1`) y consumers (TASK-1354/1355/1356/1357, admin, Nexa/MCP) nombrados con paths reales.
- [ ] Invariantes (state machine + CHECK, report inmutable, runs-as-ledger, puerta pública sin entitlement, data-minimization declarada) listados y con CHECK/guard.
- [ ] Access boundary explícito (público captcha/budget vs per-org capability+módulo vs operador).
- [ ] Migration additive + rollback (flag OFF + reverse migration + revert seed) explícito.
- [ ] Evidencia DB/runtime listada (migrate verify + claim SQL smoke + ciclo run→report placeholder).
- [ ] Errores canónicos + `captureWithDomain` + sin leak de PII/internals.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive:** commands/readers en `src/lib/growth/hubspot-portal/`, no en UI/superficie.
- [ ] **Modelada como aggregate/recurso/command** (`portal_diagnostic_run`/`portal_diagnostic_report` + lifecycle commands + report reader), no click-handler.
- [ ] **Read** como reader canónico (report por token, list, eligibility); **write** como command con command semantics, authorization fina (`growth.hubspot_portal.run.*`, NO admin-coarse), idempotencia, audit/outbox, errores canónicos, observabilidad.
- [ ] **Capability + grant en el MISMO PR:** registrar `growth.hubspot_portal.run.portal` (scope own) + `growth.hubspot_portal.run.operator` (scope tenant) en registry + catalog + grant a ≥1 rol real (`efeonce_admin` + rol growth/marketing aplicable) + coverage test verde.
- [ ] **Camino programático declarado:** `/api/admin/growth/hubspot-portal/**` (governance/operator) + `/api/public/growth/hubspot-portal/**` (data plane); MCP/ecosystem heredan por el primitive.
- [ ] **Write apto para `propose → confirm → execute`** (operator run / Fase 2 conectada); NO integración Nexa-específica.
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

### Slice 1 — Schema + migración + seed del módulo

- Migración additive `greenhouse_growth`: `portal_diagnostic_run` (state machine + CHECK `status`/`door`/`engine_source`, `organization_id`/`assignment_id`/`run_source`/`cost_attribution` nullable para público) y `portal_diagnostic_report` (`report_token` no-enumerable, `run_id` FK, snapshot inmutable, `expires_at`).
- Seed del módulo `hubspot_portal_v1` en `greenhouse_client_portal.modules` (espejo de `ai_visibility_v1`: tier addon, `view_codes`, `data_sources=['growth.hubspot_portal']`).
- Marker `-- Up Migration` + bloque DO de verificación post-DDL + GRANTs runtime + índices (incl. UNIQUE parcial del report activo por run).
- Regenerar `src/types/db.d.ts`.

### Slice 2 — Primitive canónico: readers/commands + entitlement + scoring seam

- `src/lib/growth/hubspot-portal/`: run reader/report reader, lifecycle command set (`createRun`, `queue`, `markRunning`, `scoreRun` vía port, `markReportReady` atómico inmutable, `markFailed`), `scoring-port.ts` (`PortalScoringPort` interface + adapter placeholder determinista), `entitlement.ts` (espejo `resolveAeoEntitlement`), `public-report-url.ts` (token → URL Think).
- Capabilities `growth.hubspot_portal.run.portal|operator` en registry + catalog + grants + coverage test (mismo PR).
- Smoke del SQL embebido del claim atómico contra PG real vía proxy.

### Slice 3 — Chokepoints + API skeleton (público/admin) + flags

- `requestPortalDiagnosticRunForOrganization` (gate `isPortalRunEnabled` → entitlement → ventana → allowance → costo, claim atómico) + `createPublicPortalDiagnosticRun` (captcha + rate-limit + budget global) + `requestPortalDiagnosticRunAsOperator`.
- API público skeleton: `POST /api/public/growth/hubspot-portal/run` (crea run público) + `GET /api/public/growth/hubspot-portal/report/[token]` (report reader; shape rico = TASK-1354). API admin: operator run + report list/review. Canonical errors + `captureWithDomain`.
- Flags `HUBSPOT_PORTAL_GRADER_ENABLED` + `HUBSPOT_PORTAL_GRADER_CONNECTED_DOOR_ENABLED` (default OFF) + filas en `FEATURE_FLAG_STATE_LEDGER.md`.

### Slice 4 — Reliability signals + ciclo end-to-end (placeholder)

- Registrar signals `growth.hubspot_portal.run_failed`, `growth.hubspot_portal.entitlement_claim_error`, `growth.hubspot_portal.public_abuse_blocked` en el reliability plane.
- Ejercitar el ciclo completo con el adapter placeholder: run público + run per-org llegan a `report_ready`, el token resuelve el reader, la allowance decrementa, `quota_exhausted` cuando se agota. Outbox events v1 emitidos por transición.

## Out of Scope

- **Scoring real** (command Kortex `score_self_assessment` / rubric-artifact autorado por Kortex + shape rico del report model) → **TASK-1354**.
- **Intake público completo** (cuestionario/UX de self-assessment, campos, validación) → **TASK-1354**.
- **Superficie pública en Think** (`/hubspot-portal` + `/hubspot-portal/r/[token]`, render headless) → **TASK-1355** (repo `efeonce-think`).
- **Growth Form** `efeonce-hubspot-portal-audit` + handoff HubSpot → **TASK-1356**.
- **Puerta conectada (OAuth) / `kortex.audit.run` / trial-contratado deep audit / data-minimization impl** → **TASK-1357** (Fase 2, gateada).
- Admin cockpit UI del grader; experimentación; métricas de negocio del reporte.

## Detailed Spec

Ver el ADR `GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md` (boundary, dos puertas, data posture, runtime contract) + el template `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (§7 aggregates run/report, §9 public experience, §11 API parity; Delta TASK-1277 entitlement). No duplicar aquí; el agente lee esas secciones en Discovery y espeja `src/lib/growth/ai-visibility/**`.

Notas de implementación:

- El `scoring-port.ts` desacopla el motor: la foundation no sabe si el score viene de Kortex (`kortex.audit.run` / `score_self_assessment`) o de un rubric-artifact; TASK-1354 implementa el adapter real y quita el `placeholder` del path productivo. La puerta conectada (Fase 2) implementa el adapter Kortex vía el command adapter.
- El claim de entitlement es un espejo directo de `requestGraderRunForOrganization` (TASK-1277): `FOR UPDATE` sobre la fila del assignment + COUNT de runs `portal_%` del mes en la misma tx; los runs son el ledger, sin tabla allowance separada.
- El report token y `public-report-url.ts` son el contrato que TASK-1355 (Think) consume por `GET .../report/[token]` — render headless, token nunca al browser.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema + seed) → Slice 2 (primitive + entitlement + capability + seam) → Slice 3 (chokepoints + API + flags) → Slice 4 (signals + ciclo placeholder).
- Slice 2 DEBE incluir capability + grant + coverage test en el mismo PR que el `can()`-check (guard CI rompe el build si falta).
- Ningún slice prende el flag en producción; el flip se coordina con TASK-1354 (scoring real) — sin scoring, la foundation es shadow.
- La puerta conectada (`CONNECTED_DOOR_ENABLED`) NO se habilita en esta task (Fase 2).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| SQL del claim atómico con type mismatch / race condition infla allowance | growth.hubspot_portal / PG | medium | Espejar el claim probado de TASK-1277 (`FOR UPDATE` + COUNT en la misma tx); smoke contra PG real vía proxy (ISSUE-071/TASK-893) | `growth.hubspot_portal.entitlement_claim_error` |
| Puerta pública abusada (runs forjados / budget drain) | growth.hubspot_portal / public write | high | Captcha + rate-limit por email/IP + budget diario global (espejo `createPublicGraderRun`); `public_abuse_blocked` | `growth.hubspot_portal.public_abuse_blocked` |
| Migración additive con marker invertido registra sin ejecutar DDL | migration / PG | low | `-- Up Migration` + bloque DO con RAISE EXCEPTION post-DDL; verificar `information_schema` | falla en `migrate:up` / DO exception |
| Capability sin grant rompe build por coverage test | entitlements | low | Grant a ≥1 rol real en el mismo PR (TASK-873/935) | CI coverage test |
| Un run sin score real (placeholder) se toma como productivo | growth.hubspot_portal | medium | `engine_source='placeholder'` explícito + flag OFF; TASK-1354 quita placeholder del path productivo antes del flip | revisión + run con `engine_source=placeholder` en prod |
| Sobre-claim de la integración Kortex conectada (aún staging) | ecosystem / marca | medium | Puerta conectada gateada por flag propio OFF + Fase 2; esta task no invoca `kortex.audit.run` | flag `CONNECTED_DOOR_ENABLED` en prod |

### Feature flags / cutover

- `HUBSPOT_PORTAL_GRADER_ENABLED` (default `false`) — controla si las rutas responden. `HUBSPOT_PORTAL_GRADER_CONNECTED_DOOR_ENABLED` (default `false`, Fase 2) — controla la puerta conectada. Registrar ambas filas en `FEATURE_FLAG_STATE_LEDGER.md` (gate `docs:closure-check`). Revert: flag OFF + redeploy (<5 min). Flip productivo diferido a TASK-1354.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (`DROP` de las 2 tablas + revert seed del módulo — additive, sin consumers en prod) | <10 min | sí |
| Slice 2 | revert PR (primitive/capability nuevos, sin efecto con flag OFF) | <5 min | sí |
| Slice 3 | flag OFF (rutas dejan de responder) + revert PR | <5 min | sí |
| Slice 4 | flag OFF; signals no productivas | <5 min | sí |

### Production verification sequence

1. `pnpm migrate:up` en staging + verificar 2 tablas + CHECK + GRANTs + seed `hubspot_portal_v1` vía `information_schema`.
2. Deploy a staging con `HUBSPOT_PORTAL_GRADER_ENABLED=false` + verificar que rutas responden disabled y que `growth.ai_visibility`/`growth.forms` no cambiaron.
3. Flip flag `true` en staging + ciclo run→report con placeholder: run público + run per-org llegan a `report_ready`, token resuelve el reader, allowance decrementa, `quota_exhausted` al agotar.
4. Smoke de abuso público (rate-limit/budget) → rechazado + `public_abuse_blocked`.
5. Verificar que la puerta conectada sigue OFF (no invoca `kortex.audit.run`).
6. Mantener shadow hasta TASK-1354 (scoring real); NO flip productivo sin scoring.
7. Monitorear signals 7d.

### Out-of-band coordination required

- Coordinar el flip productivo con TASK-1354 (scoring real quita el placeholder). Sin scoring, la foundation queda code-complete en shadow.
- Confirmar el rol growth/marketing real (además de `efeonce_admin`) para el grant (contra `role-codes.ts`).
- Fase 2: coordinar con TASK-1357 + el cutover prod de Kortex + revisión seguridad/PII antes de habilitar la puerta conectada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen `greenhouse_growth.portal_diagnostic_run/portal_diagnostic_report` con state machine + CHECK + report inmutable + GRANTs, verificadas contra `information_schema`; módulo `hubspot_portal_v1` sembrado.
- [ ] `src/lib/growth/hubspot-portal/` expone readers + lifecycle commands + entitlement + `PortalScoringPort` (con adapter placeholder) + `public-report-url`, con `report_ready` inmutable.
- [ ] Capabilities `growth.hubspot_portal.run.portal` (scope own) + `growth.hubspot_portal.run.operator` (scope tenant) registradas + grant a ≥1 rol real + coverage test verde en el mismo PR.
- [ ] `requestPortalDiagnosticRunForOrganization` gatea por entitlement (`module_assignments`) + capability con claim atómico (runs-as-ledger); `createPublicPortalDiagnosticRun` no requiere entitlement pero aplica captcha + rate-limit + budget global.
- [ ] `POST /api/public/growth/hubspot-portal/run` + `GET .../report/[token]` responden gateados por flag; el token es no-enumerable y el reader no filtra PII ni internals.
- [ ] El scoring vive como seam (`PortalScoringPort`); el motor real (Kortex/rubric) NO se reimplementa en Greenhouse; la puerta conectada queda OFF (Fase 2).
- [ ] Signals `growth.hubspot_portal.run_failed/entitlement_claim_error/public_abuse_blocked` registradas y visibles en `/admin/operations`.
- [ ] `HUBSPOT_PORTAL_GRADER_ENABLED` + `HUBSPOT_PORTAL_GRADER_CONNECTED_DOOR_ENABLED` (default OFF) registrados en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Errores client-facing usan `canonicalErrorResponse` (es-CL); errores server usan `captureWithDomain(err,'growth',…)`; sin leak de PII/internals.
- [ ] Ciclo run→report ejercitado end-to-end con placeholder (run público + per-org → `report_ready`; allowance decrementa; `quota_exhausted` al agotar).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (full suite — atrapa contratos cross-module; foco en `src/lib/growth/hubspot-portal` + entitlements coverage)
- `pnpm migrate:up` + verificación `information_schema` de tablas/constraints/GRANTs/seed
- Smoke SQL del claim atómico contra PG real vía `pnpm pg:connect` proxy
- Smoke del ciclo run→report con el adapter placeholder (público + per-org)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambió comportamiento/estructura
- [ ] chequeo de impacto cruzado (marcar TASK-1354/1356 desbloqueadas al publicar el run lifecycle + report token)
- [ ] `pnpm test` (full) + `pnpm build` (prod) verdes en el último commit antes de cerrar (Task Closing Quality Gate)
- [ ] filas de flags en `FEATURE_FLAG_STATE_LEDGER.md` reflejan el estado real por environment

## Follow-ups

- **TASK-1354** — puerta pública: scoring self-assessment (command Kortex `score_self_assessment` o rubric-artifact) + intake público + report model rico (consume el seam + run lifecycle).
- **TASK-1355** — superficie pública en Think (`/hubspot-portal` + `/hubspot-portal/r/[token]`, repo `efeonce-think`).
- **TASK-1356** — Growth Form `efeonce-hubspot-portal-audit` + tokenized report success + CORS + handoff HubSpot.
- **TASK-1357** (Fase 2) — puerta conectada: OAuth app least-privilege + `kortex.audit.run` orchestration + trial/contratado + data-minimization + delete-on-disconnect.
- **TASK-1358** — admin/operator control plane + reliability review.
- **TASK-1352** (Delta) — el CTA secundario de la landing apunta a la superficie de Think cuando la Fase 1 esté live.

## Open Questions

- ¿El schema `greenhouse_growth` ya existe (hoy hospeda `growth.forms`/`ai_visibility`) o hay algún matiz de ownership para las tablas nuevas? `[verificar]`
- ¿Qué rol growth/marketing real (además de `efeonce_admin`) recibe el grant de `growth.hubspot_portal.run.*`? Confirmar contra `role-codes.ts` (candidatos: `efeonce_account`, `efeonce_operations`).
- ¿El report model shell de esta task es suficiente para que TASK-1355 (Think) empiece en paralelo, o Think espera el shape rico de TASK-1354? Asumido: Think espera TASK-1354; esta task solo garantiza el token + reader.
- ¿El `run_source`/tiers per-org (`portal`/`trial`/`contracted`/`operator`) se espejan 1:1 del AEO (TASK-1277) o el portal grader necesita tiers distintos? Asumido 1:1; confirmar en Discovery.
