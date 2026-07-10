# TASK-356 — Hiring Handoff, Reactive Signals & Downstream Bridges

## Delta 2026-07-10 — Ejecución completada (local-first, develop, sin push)

Implementación cerrada en 7 commits sobre `develop`. Divergencias/deltas contra la spec recalibrada:

- **Slice 0 fue evidencia, no acción:** el runtime vivo tenía **0 eventos `hiring.application.decided`** en el outbox y **0 aplicaciones decididas** (verificado por proxy el 2026-07-10, pre-implementación). No hubo nada que re-marcar como `no-op:pending-task-356-consumer`, y el backfill (`scripts/hiring/backfill-handoffs.ts`, dry-run→apply, entregado igual) reportó `candidates=0`. El SQL de re-marcado no fue necesario.
- **Revocación (gap real cerrado, no estaba en la spec):** una re-decisión de `selected` → `rejected|withdrawn|on_hold|backup_selected` sobre un handoff existente NO es no-op: en `pending`/`blocked` pre-aprobación → `cancelled` auditado; en `approved|in_setup|completed` → `blocked:decision_revoked` (nuevo valor del enum, 7 razones en total). Un handoff bloqueado por supersede/revocación post-aprobación es **sticky**: solo un humano lo resuelve (cancel vía command).
- **`approved → completed` directo permitido** (in_setup es opcional): forzar el paso intermedio era burocracia sin invariante que lo exija; `completed` sigue exigiendo `downstream_ref`.
- **Reopen:** una nueva decisión `selected` sobre un handoff `cancelled` reutiliza la fila (UNIQUE) y la re-deriva a `pending`/`blocked` con audit `decision_superseded` — sin esto una re-selección legítima quedaba atascada para siempre.
- **Reliability:** se creó el módulo `hiring` (decisión explícita de la spec) y las 2 señales de TASK-1362 migraron de `documents` → `hiring` en el mismo PR. `ReliabilityModuleDomain` reusa `'hr'` (no se extendió el union).
- **Smoke E2E real verde** (`scripts/hiring/_sanity-handoff-reactive.ts`): seed sintético → decide selected → consumer scoped por handlerKey → 1 handoff pending → replay sin re-fetch → supersede de destino → revocación → cancelled → cleanup completo, contra `greenhouse-pg-dev`.
- **Estado de rollout:** migración APLICADA (única instancia = prod data plane); código local-first sin push. Al pushear: redeploy del ops-worker para registrar el projection. Flag `HIRING_HANDOFF_BRIDGES_ENABLED` OFF (fila en el ledger). Ver Handoff.md.

## Delta 2026-07-10 — Revisión 5-lentes contra runtime real (arch + talent + payroll + finance + product-design)

Revisada con `arch-architect` (+overlay Greenhouse), `greenhouse-talent-people-operator`, `greenhouse-payroll-auditor`, `greenhouse-finance-accounting-operator` y `greenhouse-ux`. Todo verificado contra el código, no contra `db.d.ts` ni contra el Delta anterior. **El Delta 2026-07-08 quedó obsoleto en su premisa central y en cuatro decisiones de diseño.** Correcciones:

- **`TASK-355` está COMPLETA y el evento ya existe y ya se emite en runtime.** `hiring.application.decided` está registrado en `src/lib/sync/event-catalog.ts:1102` (aggregate `hiring_application`, `:240`) y se publica al outbox dentro de la tx del command en `src/lib/hiring/decide.ts:236-252`. El endpoint `POST /api/hiring/applications/[id]/decide` está live y `hiring.application.decide` está granteada (`runtime.ts:494`). **356 NO registra el evento en el catálogo y NO "shippea dormido": el trigger ya está disparando.** Lo único que falta es el consumer.
- **El flag OFF sobre el materializer PIERDE eventos — se elimina.** Un `refresh()` que retorna `null` hace que el consumer escriba `result='coalesced:no-op'` en `outbox_reactive_log` bajo la clave `<projection>:<eventType>`, y la query Phase A (`reactive-consumer.ts:507-528`) solo re-lee eventos cuyo `result` sea `retry`/`dead-letter`. Un `no-op:*` es **terminal**: al prender el flag, esos eventos nunca vuelven a la cola. El materializer pasa a ser **incondicional** (el handoff es una fila inerte en su propio aggregate, sin side effects fuera del dominio — ése es el boundary de esta task). El flag gatea SOLO las superficies consumidoras (reader de cola + bridges).
- **Los eventos ya emitidos NO están perdidos, pero hay que protegerlos.** `sweepAuditOnlyEvents()` los acusa con el handler centinela `system:no-handler` (`reactive-consumer.ts:134,395`), distinto de la clave del handler de la proyección — así que Phase A los recoge igual cuando 356 registre el consumer. **Riesgo residual:** el cron de retención (follow-up del Playbook V2 §"Path hacia retencion") haría `DELETE FROM outbox_events` sobre `result='no-op:audit-only'`. Protección canónica documentada: re-marcar esos eventos como `no-op:pending-task-356-consumer` (Playbook V2 §"Caveat — pending consumers"), igual que se hizo para TASK-377.
- **La decisión es append-only y supersedible → `ON CONFLICT DO NOTHING` es un bug.** `decideHiringApplication` mantiene historial en `explainability_json.decisionHistory[]` y el payload lleva `decisionId` + `supersedesDecisionId` (`decide.ts:179-192`). Un reclutador puede re-decidir (p.ej. `internal_hire` → `contractor`). Con `DO NOTHING` el handoff se queda con el destino viejo, en silencio. Se pasa a **upsert con guarda de estado** + columna `decision_id`. Además: hay **coalescing por scope** (`reactive-consumer.ts:643-662`), así que `refresh()` debe leer el snapshot **actual** de `hiring_application`, nunca el `representativePayload`.
- **`decided` se emite para las 5 decisiones — falta el filtro.** `DECISION_STAGE` (`decide.ts:27-33`) cubre `selected | backup_selected | rejected | withdrawn | on_hold`, y `assertDestination` (`:82-97`) exige `selected_destination` también para `backup_selected`. Sin filtro por `decision`, cada rechazo materializa un handoff y cada candidato de respaldo entra a la cola de onboarding de HRIS. **El handoff se materializa SOLO con `decision='selected'`.**
- **3 de los 5 destinos no tenían owner downstream.** El CHECK es `{internal_reassignment, internal_hire, staff_augmentation, contractor, partner}` (migración `20260707235655376`:173-175). V1 soporta `internal_hire` (→770) y `staff_augmentation`; `contractor` pertenece a EPIC-013 (`src/lib/contractor-engagements/**`), y `partner`/`internal_reassignment` no tienen owner. Los no soportados nacen `blocked:destination_not_supported` — nunca `pending` mudo.
- **Columnas sin fuente / columnas faltantes.** `modality`, `country_regime` y `suggested_manager_member_id` NO existen ni en el snapshot de decisión ni en el payload → se eliminan del Slice 1. Faltaban `opening_id` (única vía de scope: `hiring_application` **no tiene** `space_id`/`organization_id`; se hereda por `opening_id → hiring_opening.space_id/organization_id`) y `decision_id`.
- **`blocked_reason` pasa a código estable + detalle.** Texto libre termina como prosa inglesa en la UI de 770 (mismo bug class que cerró `canonicalErrorResponse`). El consumer localiza desde el código.
- **Payroll/talent:** `expected_legal_entity` como TEXT libre es vector de **misclasificación** (subordinación clasificada como `honorarios`/`contractor`). El handoff transporta el destino (que sí tiene CHECK) y **NUNCA** un campo interpretable como `contractType` (`src/types/hr-contracts.ts`). El boundary test negativo debe cubrir también `contractor_engagements`, `providers` y `expenses`, no solo `members`/`placements`/`payroll_*`.
- **Reliability:** `coverage_risk` y `opening_stalled` **no son reliability signals** (el control plane es steady=0 = falla de sistema; una vacante sin llenar es estado de negocio). Bajan a follow-up. Quedan `handoff_blocked_stale` e `internal_hire_awaiting_onboarding` como detectores de workflow atascado. **Costo real de un `hiring` ReliabilityModuleKey:** rompe tsc en dos `Record<ReliabilityModuleKey,…>` exhaustivos (`incident-mapping.ts:39` y `:137`), requiere entrada en `STATIC_RELIABILITY_REGISTRY` (si no, la señal se descarta en silencio — `get-reliability-overview.ts:1285`), `ReliabilityModuleDomain` tampoco tiene `hiring` (`documents` usa `hr`), y ya hay 2 señales de hiring bajo `moduleKey:'documents'` (`hiring-candidate-retention-overdue.ts`, `asset-scan-open-quarantine.ts`) que habría que migrar o queda drift desde el día 1.
- **Hechos menores corregidos:** `ProjectionDomain` tiene 8 valores (`+knowledge`, `+growth`), no 6 — rutear a `people` sigue siendo correcto, pero no por falta de precedente. `captureWithDomain` ya tiene el dominio `'hiring'` (`capture.ts:74`). `refresh(scope, payload)` **no recibe client ni tx** (`projection-registry.ts:69`) → abre la suya. El Playbook V2 ya mata el silent-skip de `extractScope → null` (lo acusa `no-op:no-scope`); la regla sigue siendo buena práctica, pero no por el mecanismo de ISSUE-046.
- **`UI impact: none` confirmado** (lente product-design): la cola es read-model (consumer visual = 770) y el journey de Person 360 alimenta surfaces existentes. Única deuda de diseño que 356 genera: el enum de `blocked_reason` + su namespace de copy en `src/lib/copy/` que 770 va a consumir.

## Delta 2026-07-08 — Revisión 3-lentes (arch-architect + talent/people-ops + product-design) + migración a formato backend-data

Revisada con `arch-architect` (lente dominante — es capa reactiva/outbox/CQRS), `greenhouse-talent-people-operator` (el handoff = seam candidato→colaborador) y product-design (para **descartar** UI: 356 es backend-data puro). Hechos verificados contra el repo real (no `db.d.ts`) y ajustes:

- **El seam con 355 es un evento que hoy NO existe.** 353 emite `hiring.application.stage_changed`, pero **no hay `hiring.application.decided`**. Las columnas snapshot de decisión SÍ existen en `hiring_application` (migración `20260707235655376`:167-178, comentadas *"consumido por TASK-356; sin efectos operativos aquí"*). Frontera CQRS: **355** escribe la decisión + emite `hiring.application.decided` v1; **356** lo consume. 356 **registra** el evento en `event-catalog.ts` (dueño del dominio reactivo); 355 lo **emite**. El consumer de 356 shippea dormido → sin hard-dependency de runtime. **Disparar el handoff SOLO con `hiring.application.decided`, nunca con `stage_changed`** (evita handoff falso en movimientos intermedios de etapa).
- **"Signals" estaba conflacionado.** Se separan dos cosas distintas: (a) **eventos de dominio / read-model** (`handoff_ready`, `shortlist_ready`) → van como `hiring.handoff.*` + un read-model de cola; (b) **reliability signals** (`coverage_risk`, `opening_stalled`, `handoff_blocked_stale`, `internal_hire_awaiting_onboarding`) → `src/lib/reliability/queries/hiring-*.ts` con un **`hiring` ReliabilityModuleKey nuevo** (hoy NO existe en `ReliabilityModuleKey`).
- **NO inventar un `ProjectionDomain` `hiring` ni cron nuevo.** El `ProjectionDomain` es `organization|people|finance|notifications|delivery|cost_intelligence` — no hay `hiring`. Las proyecciones reactivas de 356 rutean a **`people`** (sinergia con `hr-onboarding-auto-create.ts`, `assignment-membership-sync.ts`) y a **`notifications`** (señales que notifican). Agregar un partition nuevo = blast radius en `vercel.json` + ops-worker, innecesario. **SÍ** agregar un `hiring` ReliabilityModuleKey (additive, bajo blast).
- **Capabilities:** `hiring.application.decide` YA existe y está granteada (la usa el command de 355). `hiring.handoff.*` **NO existe** → 356 lo agrega a `entitlements-catalog.ts` + grant a ≥1 rol real en `runtime.ts` **mismo PR** (coverage guard `capability-grant-coverage.test.ts`).
- **UI impact = none.** 356 no pinta superficie visible: la cola `internal_hire_ready_for_onboarding` es un **read-model** cuyo consumer UI es **TASK-770**; el journey hiring-aware en Person 360 es un **reader** consumido por surfaces 360 existentes. Se descarta wireframe/flow/motion. 356 es el nodo **N10 (reactivo)** del master flow (ver `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`, Delta 2026-07-08).
- **Idempotencia en dos planos:** (1) evento → `outbox_reactive_log` `ON CONFLICT (event_id, handler)` (lo da el consumer canónico); (2) aggregate → UNIQUE `hiring_handoff(hiring_application_id)` (un handoff por aplicación decidida) + `ON CONFLICT DO NOTHING`. `extractScope()` NUNCA retorna null para un evento manejado (ISSUE-046 silent-skip).

## Delta 2026-07-07

- **Desbloqueada (foundation):** `TASK-353` completa. Ya existe:
  - **Snapshot de handoff embebido** en `hiring_application`: `decision`, `decision_at`, `decision_by`, `selected_destination`, `tentative_start_date`, `expected_legal_entity`, `expected_context`, `prerequisites_snapshot_json` (verificado en migración `20260707235655376`:167-178). Leé esos para crear `HiringHandoff` — la Person es `identity_profile_id` (no dupliques identidad).
  - **Outbox events v1 ya emitidos** por el store (`talent_demand.*`, `hiring.opening.*` incl. published/unpublished, `hiring.candidate_facet.*`, `hiring.application.created|stage_changed`, `hiring.assessment.*`) vía `publishOutboxEvent()` — **sin consumer reactivo todavía**. Vos construís el consumer reactivo + `hiring.handoff.*` + `hiring.signal.*` (nuevos) + el `HiringHandoff` como aggregate propio. Aggregate/event types en `src/lib/sync/event-catalog.ts` (comentario en :1085 reserva estos eventos para esta task).
  - **Boundary duro (respetá):** Hiring NO crea `member`/`assignment`/`placement`/payroll. El `internal_hire` → colaborador activo lo cierra `TASK-770` bajo HRIS/People, no acá.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Backend impact: `sync`
- Epic: `EPIC-011`
- Status real: `COMPLETE 2026-07-10 — code complete en develop local (sin push); migración APLICADA; rollout pendiente: push + redeploy ops-worker (registra el projection) + flag bridges OFF hasta TASK-770`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-356-hiring-handoff-reactive-signals-downstream-bridges`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1 + RESEARCH-003`
- GitHub Issue: `none`

## Summary

Materializar el `HiringHandoff` como aggregate propio (state-machine + CHECK + audit), el **consumer reactivo** que lo construye desde el evento `hiring.application.decided`, los eventos `hiring.handoff.*`, las **reliability signals** del dominio (`hiring` module nuevo) y los **bridges downstream** hacia `People`/`Person 360`, `HRIS` (cola internal_hire) y `Staff Augmentation` — todo dentro del control plane reactivo existente, sin bus paralelo y sin crear `member`/`placement` por side effect.

## Why This Task Exists

La arquitectura de `Hiring / ATS` no termina en la decisión del reclutador (355). Para que el dominio sea fulfillment real y no un silo de captura, necesita:

- un **boundary object explícito y auditable** (`HiringHandoff`) entre la decisión y el runtime downstream;
- **reacción coreografiada** (outbox → reactive consumer) que materialice el handoff desde `hiring.application.decided`, en lugar de side effects inline acoplados a la UII;
- **reliability signals** de riesgo de cobertura, openings estancados y handoffs bloqueados/sin onboarding;
- **bridges** hacia People/HRIS/Staff Augmentation que respeten el boundary (nadie crea `member` por inferencia).

Sin esta task, el ATS queda como silo desconectado del grafo Greenhouse: la decisión se toma pero nadie downstream se entera de forma gobernada.

## Goal

- Materializar `HiringHandoff` como aggregate con state-machine, CHECK constraints y audit trail.
- Construir el consumer reactivo (`ProjectionDefinition`, domain `people`) disparado por `hiring.application.decided`.
- Publicar `hiring.handoff.*` versionados + reliability signals del dominio (`hiring` module).
- Conectar handoff/señales con `People`/`Person 360`, `HRIS` (cola internal_hire) y `Staff Augmentation` sin side effects ocultos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` (VIGENTE; V1 superseded)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón outbox+reactive+dead-letter · state-machine+CHECK+audit · capability⇒grant · flag default-OFF+shadow+flip)
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`

Reglas obligatorias:

- `HiringHandoff` debe ser explícito y auditable (state-machine + CHECK + audit trio).
- `Hiring / ATS` **NUNCA** crea `member`/`assignment`/`placement`/payroll (boundary bidireccional, espejo del boundary contractor↔payroll). El handoff **entrega una solicitud aprobable**; el runtime lo cierra el owner downstream (770/HRIS/Staff Aug).
- Los eventos `hiring.*` entran al control plane reactivo **existente** (`projection-registry` → `reactive-consumer` → `outbox_reactive_log`), **NO** a un bus paralelo. **NUNCA** agregar crons de reactive/projection a `vercel.json` (el publisher/consumer corre en Cloud Scheduler + ops-worker, TASK-773).
- V1 del handoff es **humano-asistido**: downstream recibe una cola auditable y confirma antes de crear `member`/`assignment`/`placement`.
- El handoff declara destino (`internal_reassignment`, `internal_hire`, `staff_augmentation`, `contractor`, `partner`) y prerequisitos pendientes. `internal_hire` = entregar solicitud aprobable a HRIS/People para crear/promover la faceta `member` **sobre el mismo `identity_profile_id`**; nunca activa payroll/accesos por side effect.
- La conversión a colaborador pasa por `pre_onboarding`/`onboarding` antes de activo.
- Los eventos `hiring.*` se versionan y documentan en `GREENHOUSE_EVENT_CATALOG_V1.md`; **sin PII sensible** en payload (IDs + snapshots mínimos).

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (356 = nodo N10 reactivo)

## Dependencies & Impact

### Depends on

- `TASK-353` (foundation: schema `greenhouse_hiring`, store, columnas snapshot de decisión, eventos `hiring.*` v1) — **complete**
- `TASK-355` (desk interno + `decideHiringApplication`) — **complete**. El evento `hiring.application.decided` ya está registrado (`event-catalog.ts:1102`) y **ya se emite en runtime** (`decide.ts:236-252`). 356 **NO** lo registra ni depende de un seam pendiente: solo agrega el consumer que hoy no existe. Los eventos ya emitidos siguen recuperables (el sweep los acusa bajo `system:no-handler`, no bajo la clave del handler de la proyección).
- Sustrato reactivo: `src/lib/sync/projection-registry.ts`, `src/lib/sync/reactive-consumer.ts`, `src/lib/sync/projections/index.ts`, `src/lib/sync/publish-event.ts`
- Downstream: `src/lib/staff-augmentation/store.ts` (`createStaffAugPlacement`), `src/lib/person-360/person-complete-360.ts` (`getPersonComplete360`), `src/lib/people/get-person-detail.ts` (`getPersonDetail`)
- Reliability: `src/lib/reliability/registry-store.ts`, `src/lib/reliability/queries/*`, `src/types/reliability.ts`

### Blocks / Impacts

- `TASK-770` (Hiring→HRIS): consume la cola `internal_hire_ready_for_onboarding` (read-model) + el estado del handoff.
- Person 360 / People: reader hiring-aware del journey longitudinal (candidate→application→handoff→member).
- Staff Augmentation: recibe la intención de handoff (no crea placement por side effect).
- ops/reactive visibility del dominio Hiring (nuevo `hiring` reliability module).

### Files owned

- `src/lib/hiring/handoff/**` (aggregate + store + types + state-machine)
- `src/lib/sync/projections/hiring-handoff-materialize.ts` (consumer reactivo, domain `people`)
- `src/lib/sync/projections/index.ts` (registro — solo agregar el/los projection hiring)
- `src/lib/sync/event-catalog.ts` (solo agregar aggregate/event keys `hiring.handoff.*` + `hiring.application.decided`)
- `src/lib/reliability/queries/hiring-*.ts` (signals) + `src/lib/reliability/registry-store.ts` + `src/types/reliability.ts` (solo agregar `hiring` module key/domain)
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (solo agregar `hiring.handoff.*` + grant)
- `src/app/api/hiring/handoffs/**` (command endpoint approve/setup/complete/cancel)
- `src/lib/person-360/**` / `src/lib/people/**` (solo readers hiring-aware derivados)
- `src/lib/staff-augmentation/**` (solo bridge explícito de handoff)
- `migrations/*` (tabla `greenhouse_hiring.hiring_handoff` + audit)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Current Repo State

### Already exists (verificado 2026-07-10 contra el código)

- **Sustrato reactivo maduro:** `ProjectionDefinition` (`projection-registry.ts:48-80`), `registerProjection`/`getProjectionsForEvent`, `ensureProjectionsRegistered()` lazy+idempotente (`projections/index.ts:93-97`), dispatcher `processReactiveEvents()` (`reactive-consumer.ts`), idempotencia `outbox_reactive_log ON CONFLICT (event_id, handler)` (`:253-260`), **coalescing por scope** (`:643-662`), dead-letter tras `maxRetries` (default 2), circuit breaker per-projection, `sweepAuditOnlyEvents()` para eventos sin handler (`:355`). Ejemplo canónico: `src/lib/sync/projections/staff-augmentation.ts:104-145`.
- **`refresh(scope, payload)` NO recibe client ni transacción** (`projection-registry.ts:69`; invocación en `reactive-consumer.ts:729`). Abre la suya.
- **`ProjectionDomain` = 8 valores** (`projection-registry.ts:14-28`): `organization|people|finance|notifications|delivery|cost_intelligence|knowledge|growth`. No hay `hiring`. El `domain` gobierna qué cron lane del ops-worker drena la proyección.
- **Publisher/consumer en Cloud Scheduler + ops-worker** (`services/ops-worker/server.ts`: `POST /outbox/publish-batch`, `POST /reactive/process`, `/reactive/process-domain`, `/reactive/recover`).
- **Emit helper canónico:** `publishOutboxEvent(event, client?)` (`src/lib/sync/publish-event.ts:41`), transaccional in-tx (acepta `PoolClient` o Kysely tx).
- **`hiring.application.decided` YA EXISTE Y YA SE EMITE:** catálogo `event-catalog.ts:1102`, aggregate `hiringApplication` (`:240`), emisión in-tx en `src/lib/hiring/decide.ts:236-252` con payload `{applicationId, decisionId, decision, selectedDestination, decidedBy, decidedAt, supersedesDecisionId}`.
- **Semántica de la decisión (355):** historial append-only en `explainability_json.decisionHistory[]` (`decide.ts:194-227`), decisiones supersedibles (`supersedesDecisionId`), idempotencia por `idempotencyKey` del caller. `DECISION_STAGE` cubre 5 decisiones (`:27-33`); `assertDestination` exige destino para `selected` **y** `backup_selected` (`:82-97`).
- **Columnas snapshot de decisión** en `hiring_application` (migración `20260707235655376`:167-179). **La tabla NO tiene `space_id`/`organization_id`** — el scope se hereda por `opening_id → hiring_opening.space_id/organization_id` (`:77-78`) → `talent_demand`.
- **Downstream targets** presentes: `createStaffAugPlacement`, `getPersonComplete360`, `getPersonDetail`.
- **Reliability shape:** `ReliabilitySignal` (`src/types/reliability.ts:167-177`); `ReliabilityModuleKey` = 15 valores (`:15-30`), sin `hiring` ni `agency`; ejemplo `queries/workforce-unlinked-internal-users.ts`. Ya hay 2 señales de hiring emitiendo bajo `moduleKey:'documents'` (`hiring-candidate-retention-overdue.ts`, `asset-scan-open-quarantine.ts`).
- **`captureWithDomain` ya soporta el dominio `'hiring'`** (`src/lib/observability/capture.ts:74`).
- **Capability `hiring.application.decide`** existe + granteada a `EFEONCE_ADMIN`/`HR_MANAGER`/`EFEONCE_OPERATIONS` + routeGroup `internal` (`entitlements-catalog.ts:2112`, `runtime.ts:486-495`).

### Gap

- No existe `HiringHandoff` (aggregate/store/type/tabla) — solo el enum de etapa `handoff_ready` y las columnas snapshot inertes.
- No existen los eventos `hiring.handoff.*` ni el aggregate `hiring_handoff` en `event-catalog.ts` (el comentario `:1088-1089` los reserva para esta task).
- **No existe consumer reactivo para `hiring.application.decided`** — hoy los eventos se acusan `no-op:audit-only` bajo `system:no-handler` (recuperables, pero expuestos al futuro cron de retención).
- No existe `hiring` en `ProjectionDomain` (se rutea a `people`) ni en `ReliabilityModuleKey`.
- No existen reliability queries `hiring-*` bajo un módulo propio ni bridge explícito hacia assignment/placement.
- No existe capability `hiring.handoff.*`.
- No existe owner downstream declarado para los destinos `contractor`, `partner`, `internal_reassignment`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (reactive prod-path + additive migration + capability nueva + reliability module; el borde crítico de creación de `member` NO vive acá — es 770)
- Impacto principal: `sync` (reactive consumer) + `migration` (tabla handoff) + `command` (approve) + `reader` (cola + person-360 hiring-aware) + `api`
- Source of truth afectado: `greenhouse_hiring.hiring_handoff` (nuevo aggregate); la decisión sigue siendo `hiring_application.*` (SSOT, 353/355 — 356 la lee, no la duplica)
- Consumidores afectados: reactive worker (ops-worker), TASK-770 (cola internal_hire), Person 360/People readers, Staff Aug store, Nexa (por parity)
- Runtime target: `worker` (reactive) + `staging`/`production` (flag-gated)

### Contract surface

- Contrato existente a respetar: `ProjectionDefinition` (`projection-registry.ts`), `publishOutboxEvent` (`publish-event.ts`), `ReliabilitySignal` (`types/reliability.ts`), `outbox_reactive_log` idempotency + coalescing por scope, boundary Hiring↛member/placement/payroll/contractor-engagement.
- Contrato existente **consumido** (no creado por esta task): `hiring.application.decided` v1 — aggregate `hiring_application`, emitido por `decideHiringApplication` (355, complete). Payload: `{applicationId, decisionId, decision, selectedDestination, decidedBy, decidedAt, supersedesDecisionId}`.
- Contrato nuevo o modificado:
  - **Eventos nuevos:** `hiring.handoff.created|approved|in_setup|completed|blocked|cancelled|decision_superseded` v1 (aggregate `hiring_handoff`, nuevo en `AGGREGATE_TYPES`).
  - **Command:** `transitionHiringHandoff(input)` + `POST /api/hiring/handoffs/[id]/(approve|setup|complete|cancel)`.
  - **Readers:** `listInternalHireReadyForOnboarding()` (cola read-model para 770), `getHiringJourneyForPerson(identityProfileId)` (person-360 hiring-aware).
  - **Reliability signals V1:** `hiring.handoff_blocked_stale`, `hiring.internal_hire_awaiting_onboarding`. (`coverage_risk` / `opening_stalled` → follow-up, NO son señales steady=0 de sistema.)
  - **Enum `HiringHandoffBlockedReason`** (código estable + detalle opcional): `destination_not_supported`, `missing_legal_entity`, `missing_start_date`, `ambiguous_identity`, `decision_superseded_after_approval`, `prerequisites_open`. El consumer (770) localiza desde el código; **NUNCA** prosa cruda.
- Backward compatibility: `additive`. **El materializer NO va gateado por flag** (ver Migration/rollout). El flag `HIRING_HANDOFF_BRIDGES_ENABLED` (default OFF) gatea solo el reader de cola + los bridges downstream.
- Full API parity: el handoff approve/transition es un **command gobernado** (capability `hiring.handoff.approve`), consumido por UI (770) + Nexa (propose→confirm) por construcción; NO click-handler acoplado.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_handoff` (nuevo) + `hiring_handoff_audit` (append-only) + read-model de cola (view o reader). Lee `hiring_application` (snapshot) + `hiring_opening` (scope) + `identity_profiles`.
- Invariantes que no se pueden romper:
  - **Trigger doble:** el consumer reacciona SOLO a `hiring.application.decided` (nunca `stage_changed`) **y** solo materializa cuando `decision = 'selected'`. `backup_selected`, `rejected`, `withdrawn`, `on_hold` se acusan como no-op explícito (`no-op:decision-not-selected`), NUNCA crean handoff. `extractScope()` retorna `{entityType:'hiring_application', entityId}` no-null.
  - **Lectura de estado, no de payload:** hay coalescing por scope, así que `refresh()` lee el snapshot **actual** de `hiring_application` (incluida la última entrada de `decisionHistory[]`). **NUNCA** derivar el handoff del `representativePayload`.
  - **Un handoff por aplicación, con supersede explícito:** UNIQUE `hiring_handoff(hiring_application_id)` + columna `decision_id`. Upsert con guarda de estado:
    - no existe → crear (`pending` o `blocked`).
    - existe en `pending` y `decision_id` cambió → actualizar destino/snapshot + `decision_id`, audit `decision_superseded`, emitir `hiring.handoff.decision_superseded`.
    - existe en `approved|in_setup|completed` y llega decisión superseding → **NO sobrescribir**: transicionar a `blocked` con `blocked_reason='decision_superseded_after_approval'` + evento. Lo resuelve un humano.
    - existe con el mismo `decision_id` → no-op idempotente.
  - **Destinos soportados en V1:** `internal_hire` (→770) y `staff_augmentation`. `contractor` (owner: EPIC-013 `src/lib/contractor-engagements/**`), `partner` e `internal_reassignment` nacen `blocked` con `blocked_reason='destination_not_supported'` — nunca `pending` mudo.
  - **State-machine:** `pending → approved → in_setup → completed`; `pending|approved → blocked` (con código de razón); `pending|approved|blocked → cancelled`. CHECK constraint + transición validada en el command; `completed` requiere `downstream_ref` (evidencia del owner), nunca por inferencia.
  - **Identidad:** la Person del handoff = `identity_profile_id` del candidate_facet; NUNCA se crea persona nueva ni pipeline paralelo.
  - **Boundary (bidireccional):** el materializer/command NUNCA escribe `members`/`assignments`/`placements`/`payroll_*`/`compensation_versions`/`final_settlements`/`contractor_engagements`/`providers`/`expenses`. Solo persiste el handoff + la intención.
  - **Anti-misclasificación (payroll/talent):** el handoff transporta `selected_destination` (CHECK del enum) y **NUNCA** un campo que un downstream pueda leer como `contractType` (`src/types/hr-contracts.ts`). `expected_legal_entity` se conserva como snapshot informativo de la decisión, explícitamente marcado como **propuesta no vinculante**; la clasificación del régimen la hace el owner downstream (770 / EPIC-013 / legal), nunca Hiring.
- Tenant/space boundary: `hiring_application` **no tiene** columna de scope. El handoff denormaliza `opening_id` y resuelve `space_id`/`organization_id` vía `hiring_opening`; las reads filtran por el mismo scope que 353.
- Idempotency/concurrency: (1) evento → `outbox_reactive_log ON CONFLICT (event_id, handler)`; (2) aggregate → UNIQUE `(hiring_application_id)` + upsert guardado por `decision_id` + `state` (ver arriba), con `SELECT ... FOR UPDATE` sobre la fila del handoff dentro de la tx; (3) command transition → idempotente por `(handoff_id, target_state)`. `refresh()` idempotente y sin silent-skip: si una precondición está rota (opening inexistente, identidad ambigua), **resolver loud** — emitir `hiring.handoff.blocked` con razón estructurada, `captureWithDomain(err, 'hiring', …)` y throw tipado; nunca `recorded=0` mudo (Playbook V2 §"resolver loud").
- Audit/outbox/history: `hiring_handoff_audit` append-only (create/approve/block/complete/cancel: quién, cuándo, IDs downstream, prerequisitos abiertos) + eventos `hiring.handoff.*` v1 al outbox.

### Migration, backfill and rollout

- Migration posture: `additive` — `CREATE TABLE hiring_handoff` + `hiring_handoff_audit` + índices + UNIQUE + CHECK + GRANTs. Marker `-- Up Migration`, DDL solo en Up, bloque DO anti pre-up-marker verificando la tabla, Down solo DROP.
- **Default state — el materializer NO va gateado.** Regla dura verificada: un `refresh()` que retorna `null` hace que el consumer escriba `result='coalesced:no-op'` bajo la clave `<projection>:<eventType>` en `outbox_reactive_log`, y Phase A (`reactive-consumer.ts:507-528`) solo re-lee `retry`/`dead-letter`. **Un flag OFF sobre el materializer descarta los eventos de forma permanente.** El handoff es una fila inerte en su propio aggregate, sin side effects fuera del dominio → se materializa siempre. El flag `HIRING_HANDOFF_BRIDGES_ENABLED` (default OFF) gatea SOLO el reader de cola (`listInternalHireReadyForOnboarding`) y los bridges downstream. Registrar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (gate `docs:closure-check`) declarando runtime = **Vercel + ops-worker**.
- **Backfill plan: obligatorio (no opcional).** `hiring.application.decided` se emite desde que 355 shippeó, sin consumer. Esos eventos NO están perdidos (el sweep los acusa bajo el handler centinela `system:no-handler`, distinto de la clave del handler de la proyección → Phase A los recoge al registrar el consumer), pero quedan expuestos al cron de retención (`DELETE FROM outbox_events WHERE result='no-op:audit-only'`, follow-up del Playbook V2). Dos acciones, en este orden:
  1. **Antes de mergear:** re-marcar los `hiring.application.decided` swept como `no-op:pending-task-356-consumer` (convención Playbook V2 §"Caveat — pending consumers", precedente TASK-377). SQL documentado en el Delta de esta task.
  2. **Post-deploy:** script idempotente (dry-run → apply, batched) que materialice handoffs para `hiring_application WHERE decision='selected' AND NOT EXISTS (handoff)`, leyendo el snapshot actual — no re-emitiendo eventos. Verificar `COUNT` esperado antes de aplicar.
- Rollback path: `revert PR` (desregistra el projection) → `reverse migration` (DROP tabla; segura por additive). El flag de bridges apagado deja el handoff materializándose sin consumers, que es un estado seguro. Los eventos ya publicados quedan como audit inerte.
- External coordination: env var `HIRING_HANDOFF_BRIDGES_ENABLED` en staging+prod+**ops-worker** (el reader de cola lo consume 770 desde Vercel; los bridges reactivos corren en el worker — mapear con `grep -rn "HIRING_HANDOFF_BRIDGES_ENABLED" src/ services/` antes de prender); **redeploy del ops-worker** para que registre el projection nuevo; ningún secreto/webhook externo.

### Security and access

- Auth/access gate: command approve/transition = `session` + capability `hiring.handoff.approve` (fina, NO admin-coarse) + grant a rol real (`efeonce_operations`/`hr_manager` u `efeonce_account` — el que corresponda al recruiting owner) mismo PR. El consumer reactivo corre como worker (service context), sin sesión de usuario.
- Sensitive data posture: `no PII sensible en eventos` (IDs + snapshots mínimos); el handoff referencia `identity_profile_id`, no copia PII. Cualquier compensación/costo/legal entity en el snapshot es **propuesta no vinculante**, no payroll truth ni clasificación de contrato.
- Error contract: `canonicalErrorResponse` es-CL en el endpoint; `captureWithDomain(err, 'hiring', ...)` en el materializer y el command (el dominio `'hiring'` ya existe en `capture.ts:74`; NUNCA `Sentry.captureException` directo, NUNCA prosa inglesa cruda al cliente). `blocked_reason` es un código estable del enum, nunca prosa.
- Abuse/rate-limit posture: `N/A` — superficie interna gobernada por capability (no pública). El replay guard lo da `outbox_reactive_log`.

### Runtime evidence

- Local checks: `pnpm test` (unit: state-machine, materializer idempotente, **filtro por `decision='selected'`**, **supersede: 2.ª decisión en `pending` actualiza / en `approved` bloquea**, `extractScope` no-null, boundary NO escribe member/placement/contractor-engagement) + `pnpm lint` + `pnpm typecheck` (NO `tsc --noEmit` crudo — ISSUE-104) + `pnpm build`.
- DB/runtime checks: `pnpm migrate:up` + verificación `information_schema` de la tabla/UNIQUE/CHECK/GRANT; smoke del consumer contra PG real (proxy) con un `hiring.application.decided` sembrado → un solo `hiring_handoff` materializado; replay del mismo evento → sin duplicado; sembrar `decision='rejected'` → cero handoffs.
- Integration checks: `pnpm staging:request` para readers de cola; ejercer el reactive `POST /reactive/process-domain` (people) en staging.
- Reliability signals/logs: `hiring.handoff_blocked_stale`, `hiring.internal_hire_awaiting_onboarding` en `/admin/operations` (steady=0); `outbox_reactive_log` sin dead-letter para eventos hiring.
- Production verification sequence: (1) re-marcar los `decided` swept como `no-op:pending-task-356-consumer` → (2) deploy + redeploy ops-worker (materializer activo, bridges con flag OFF) → (3) verificar registro del projection + `queue-depth` sano + handoffs materializándose → (4) correr el backfill dry-run → apply → (5) flip `HIRING_HANDOFF_BRIDGES_ENABLED` en staging → confirmar cola + señales steady → (6) flip prod tras sign-off.

### Acceptance criteria additions

- [x] Source of truth (`hiring_handoff`), contract surface (eventos + command + readers + signals) y consumers (770/360/StaffAug/Nexa) nombrados con paths reales.
- [x] Invariantes (trigger doble `decided`+`selected`, lectura de snapshot no de payload, supersede guardado por estado, boundary NO-member/NO-contractor-engagement, destinos no soportados → `blocked`) explícitos; idempotencia en dos planos.
- [x] Migration additive + **materializer sin flag** + flag de bridges OFF + rollback (revert/reverse) explícito.
- [x] Backfill obligatorio documentado (re-marcado `pending-task-356-consumer` + script idempotente dry-run→apply).
- [x] Evidencia DB/worker listada (materialize + replay + rejected-no-crea + supersede + signals steady).
- [x] Errores canónicos + `blocked_reason` como código estable + audit/outbox + sin leak de PII.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en el primitive (`src/lib/hiring/handoff/**` command/reader + `projections/hiring-handoff-materialize.ts`), NO en UI.
- [x] Modelada como aggregate/command (`HiringHandoff` + `transitionHiringHandoff`), no click-handler.
- [x] Read = `listInternalHireReadyForOnboarding`/`getHiringJourneyForPerson` (readers canónicos); write = command con semantics + authorization fina (`hiring.handoff.approve`) + idempotencia + audit/outbox + errores canónicos + observabilidad.
- [x] Capability + grant en el MISMO PR (`hiring.handoff.approve` en catálogo + grant a ≥1 rol real + coverage test verde).
- [x] Camino programático declarado: `POST /api/hiring/handoffs/[id]/*` interno + reader para 770; Nexa por parity.
- [x] Write apto para `propose → confirm → execute` (Nexa opera el approve por construcción, no integración Nexa-específica).
- [x] Un primitive, muchos consumers (770 UI, Person 360, Staff Aug, Nexa) — cero lógica duplicada.
- [x] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION LOG (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

### Execution Log (2026-07-10, Claude — local-first develop)

- **Discovery:** verificado contra runtime real (consumer semantics de `reactive-consumer.ts`, payload de `decide.ts`, schema de la migración 353, patrón capability/grant, wire-up reliability de 5 puntos + registry filter). PG vivo: 0 eventos decided, 0 decisiones → Slice 0 = evidencia.
- **Slice 1** (`2444a12cb`): migración `20260710173221695` — `hiring_handoff` + `hiring_handoff_audit` (append-only, triggers) + seed `hiring.handoff.approve` + DO guards; aplicada + verificada contra `information_schema`; `db.d.ts` regenerado.
- **Slice 2**: dominio `src/lib/hiring/handoff/**` (types/state-machine/store/materialize/transition) + endpoint `POST /api/hiring/handoffs/[id]/[action]` + capability en catálogo TS + grant tier governance + aggregate/7 eventos en event-catalog + `decided` a REACTIVE_EVENT_TYPES.
- **Slice 3**: projection `hiring_handoff_materialize` (domain people, SIN flag) registrado; backfill idempotente (dry-run vivo: candidates=0).
- **Slice 4**: cola `listInternalHireReadyForOnboarding` + journey `getHiringJourneyForPerson` + bridge `listStaffAugmentationHandoffIntents` + flag config + `src/lib/copy/hiring.ts`.
- **Slice 5**: módulo reliability `hiring` (types + 2 Records incident-mapping + registry) + signals `handoff_blocked_stale`/`internal_hire_awaiting_onboarding` + migración de las 2 señales de `documents`.
- **Slice 6**: 49 tests dominio + boundary negativo estático/runtime + tests del projection; smoke E2E contra PG real verde.
- **Gates:** `pnpm test` full 9030 ✓ · `pnpm typecheck` ✓ · lint ✓ · `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` 573 ✓ · coverage capability ✓ · build prod ✓ (ver Handoff).


<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Proteger los eventos ya emitidos (antes de tocar código)

- `hiring.application.decided` se emite desde que 355 shippeó. Sin consumer, `sweepAuditOnlyEvents()` los acusa `no-op:audit-only` bajo `system:no-handler`. **No están perdidos** (Phase A filtra por la clave del handler de la proyección), pero el cron de retención futuro los borraría.
- Re-marcar como `no-op:pending-task-356-consumer` (convención Playbook V2 §"Caveat — pending consumers", precedente TASK-377). Contar primero, aplicar después; dejar el SQL + el `COUNT` observado en el Delta de esta task.

### Slice 1 — Migration: `hiring_handoff` aggregate + audit

- `CREATE TABLE greenhouse_hiring.hiring_handoff` con: `hiring_handoff_id` (PK), `hiring_application_id` (FK, **UNIQUE**), **`opening_id`** (FK — única vía de scope; `hiring_application` no tiene `space_id`), **`decision_id`** (TEXT NOT NULL — la decisión de `decisionHistory[]` que produjo esta fila; ancla del supersede), `identity_profile_id`, `candidate_facet_id`, `selected_destination` (CHECK espejo del enum de 353), `state` (CHECK `pending|approved|in_setup|completed|blocked|cancelled`), `expected_legal_entity` (snapshot informativo, **NO** clasificación de contrato), `tentative_start_date`, `prerequisites_snapshot_json`, `downstream_ref` (nullable; requerido para `completed`), `blocked_reason` (CHECK sobre el enum `HiringHandoffBlockedReason`), `blocked_detail` (nullable, no client-facing), timestamps + `state_changed_at`.
- **Eliminados del diseño anterior:** `modality`, `country_regime`, `suggested_manager_member_id` — no tienen fuente ni en el snapshot de decisión ni en el payload del evento. Si más adelante se necesitan, salen de `hiring_opening` (`workMode`/`hiringRegion`), no del handoff.
- `CREATE TABLE hiring_handoff_audit` (append-only, triggers anti-UPDATE/anti-DELETE): `handoff_id`, `from_state`, `to_state`, `decision_id`, `actor_user_id`, `reason_code`, `reason_detail`, `downstream_ref`, `open_prerequisites_json`, `occurred_at`.
- Marker `-- Up Migration`, DDL solo en Up, bloque DO anti pre-up-marker, GRANTs a `greenhouse_runtime`, Down solo DROP. `pnpm migrate:up` + `db.d.ts` en el mismo commit.

### Slice 2 — HiringHandoff aggregate + state-machine + command

- `src/lib/hiring/handoff/{types,store,state-machine}.ts`: `HiringHandoff` type, enum `HiringHandoffBlockedReason`, `materializeHandoffFromApplication(applicationId)` (abre su propia tx — `refresh()` no recibe client; `SELECT ... FOR UPDATE` sobre el handoff; upsert guardado por `decision_id` + `state` según los invariantes), `transitionHiringHandoff({handoffId, targetState, actorUserId, reasonCode?, downstreamRef?})` con validación de transición + audit en la misma tx + emisión `hiring.handoff.*`.
- `approved` requiere capability `hiring.handoff.approve` + destino soportado; `completed` requiere `downstream_ref`.
- Endpoint `POST /api/hiring/handoffs/[id]/(approve|setup|complete|cancel)` (auth + capability + `canonicalErrorResponse`).
- Capability `hiring.handoff.approve` en `entitlements-catalog.ts` (module `hiring`) + grant en `runtime.ts` en el loop de governance tier (junto a `hiring.application.decide`, `runtime.ts:494` → `EFEONCE_ADMIN`/`HR_MANAGER`/`EFEONCE_OPERATIONS`), coverage test verde — mismo slice.

### Slice 3 — Reactive consumer + event catalog

- Registrar en `event-catalog.ts`: aggregate `hiringHandoff: 'hiring_handoff'` + eventos `hiring.handoff.created|approved|in_setup|completed|blocked|cancelled|decision_superseded` (v1, payload mínimo sin PII). **`hiring.application.decided` ya está registrado (`:1102`) — no tocar.**
- `src/lib/sync/projections/hiring-handoff-materialize.ts`: `ProjectionDefinition` domain **`people`**, `triggerEvents:['hiring.application.decided']`, `extractScope` → `{entityType:'hiring_application', entityId}` (no-null), `refresh` = **leer el snapshot actual de `hiring_application`** (hay coalescing por scope; nunca derivar del `representativePayload`) → si `decision !== 'selected'` retornar `'no-op:decision-not-selected'` explícito → si destino no soportado crear/actualizar handoff `blocked` → si no, `materializeHandoffFromApplication` → emitir `hiring.handoff.created|decision_superseded|blocked`.
- **Sin flag.** El materializer corre siempre (un flag OFF acusaría los eventos como `coalesced:no-op`, terminal → pérdida permanente).
- Resolver loud ante precondición rota: emitir `hiring.handoff.blocked` + `captureWithDomain(err, 'hiring', …)` + throw tipado. Nunca `recorded=0` mudo.
- `registerProjection(...)` en `projections/index.ts`. Redeploy ops-worker.
- Backfill post-deploy: script idempotente `scripts/hiring/backfill-handoffs.ts` (dry-run → apply, batched) para `decision='selected'` sin handoff.

### Slice 4 — Downstream bridges (People / Person 360 / Staff Aug) — flag `HIRING_HANDOFF_BRIDGES_ENABLED`

- **Ownership por destino (los 5, explícito):**
  - `internal_hire` → TASK-770 (HRIS/People) vía la cola. **V1.**
  - `staff_augmentation` → owner de Staff Aug llama `createStaffAugPlacement` explícito. **V1.**
  - `contractor` → EPIC-013 (`src/lib/contractor-engagements/**`). **V1 = `blocked:destination_not_supported`** + follow-up.
  - `partner`, `internal_reassignment` → sin owner. **V1 = `blocked:destination_not_supported`** + follow-up.
- Reader `getHiringJourneyForPerson(identityProfileId)` hiring-aware (candidate→application→handoff→member si HRIS lo aceptó) consumido por Person 360/People — anti silent-catch (`observeAndRethrow`/degradación honesta, nunca `.catch(()=>[])`).
- HRIS/onboarding: reader `listInternalHireReadyForOnboarding()` (cola read-model) — solo handoffs `internal_hire` `approved` no `completed`. Consumido por TASK-770 (su UI). Si HRIS crea/promueve `member`, es sobre el mismo `identity_profile_id`, en `pending_intake`.
- Estados bloqueados soportados (enum): `destination_not_supported`, `missing_legal_entity`, `missing_start_date`, `ambiguous_identity`, `decision_superseded_after_approval`, `prerequisites_open` → handoff `blocked` con código auditado. Declarar el namespace de copy es-CL que 770 va a consumir (`src/lib/copy/hiring.ts`) — **356 no pinta UI**, pero es dueño del contrato del código.

### Slice 5 — Reliability signals + audit + tests

- **Decisión de módulo (tomar explícitamente antes de codear).** Crear `hiring` ReliabilityModuleKey cuesta: agregarlo a `types/reliability.ts:15` **y** rellenar los dos `Record<ReliabilityModuleKey,…>` exhaustivos de `incident-mapping.ts` (`:39` y `:137` — los únicos que rompen tsc), **y** agregar entrada a `STATIC_RELIABILITY_REGISTRY` (`registry.ts`) o la señal se descarta en silencio (`get-reliability-overview.ts:1285`), **y** decidir `ReliabilityModuleDomain` (no hay `hiring`; `documents` usa `'hr'`). Además hay 2 señales de hiring ya emitiendo bajo `moduleKey:'documents'` (`hiring-candidate-retention-overdue.ts`, `asset-scan-open-quarantine.ts`) → **si se crea el módulo, migrarlas en el mismo PR** o queda drift desde el día 1. `incidentDomainTag:'hiring'` (ya válido en `capture.ts:74`).
- Queries `src/lib/reliability/queries/hiring-*.ts` (patrón `workforce-unlinked-internal-users.ts`, steady=0, degradan a `severity:'unknown'` sin throw): `handoff_blocked_stale`, `internal_hire_awaiting_onboarding` (handoff `internal_hire` approved sin member/onboarding tras ventana configurable). Wire-up en los 6 puntos de `get-reliability-overview.ts`.
- **Fuera de V1:** `coverage_risk` y `opening_stalled` no son reliability signals (el control plane es steady=0 = falla de sistema; una vacante sin llenar es estado de negocio). Van a follow-up como métricas de workforce planning / ICO.
- Tests: state-machine (transiciones válidas/inválidas), materializer idempotente (replay → sin duplicado), **filtro por decisión** (`rejected|withdrawn|on_hold|backup_selected` → cero handoffs), **supersede** (2.ª decisión en `pending` actualiza destino; en `approved` bloquea, no sobrescribe), `extractScope` no-null, **boundary negativo** (materialize/command NO tocan `members`/`assignments`/`placements`/`payroll_*`/`compensation_versions`/`final_settlements`/`contractor_engagements`/`providers`/`expenses`), señales en steady.
- **Gate de cierre cross-dominio:** `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (cualquier rojo en finiquito/offboarding es regresión, no "test ajeno").

## Out of Scope

- Landing pública de careers (354), desk interno principal (355), assessment (1360/1361/1363), doc capture (1362).
- La **UI** de la cola internal_hire y la **creación/promoción real de `member`** → TASK-770.
- Creación de `placement` / `assignment` / payroll truth (solo intención + trazabilidad).
- Scorecards/analítica predictiva; automatización downstream sin confirmación humana (capability separada futura).
- Nuevo `ProjectionDomain`/cron partition `hiring` (se rutea a `people`/`notifications`).

## Detailed Spec

La task debe dejar explícito (y probado):

- **Cómo se evita crear `member` demasiado pronto:** el materializer solo persiste `HiringHandoff` + intención; ni el consumer ni el command escriben `members`. La creación es 770, gatillada por la cola.
- **Cómo `internal_hire` → colaborador sin duplicar persona ni saltarse HRIS:** handoff sobre `identity_profile_id`; cola `listInternalHireReadyForOnboarding`; 770 crea/promueve `member` en `pending_intake` → onboarding → activo.
- **Cómo `staff_augmentation` sin crear placement:** intención expuesta al owner; `createStaffAugPlacement` es acción explícita downstream.
- **Cómo se comporta ante una re-decisión:** el evento trae `decisionId` + `supersedesDecisionId`. Si el handoff sigue `pending`, se actualiza y se audita `decision_superseded`. Si ya está `approved`/`in_setup`/`completed`, se bloquea con `decision_superseded_after_approval` — **nunca** se sobrescribe en silencio un handoff ya aprobado.
- **Cómo se comporta ante un rechazo:** `hiring.application.decided` también se emite para `rejected|withdrawn|on_hold|backup_selected`. El materializer los acusa como no-op explícito y **no crea handoff**. Un candidato de respaldo no entra a la cola de onboarding.
- **Cómo el handoff se traduce a runtime en el momento correcto:** state-machine `approved → in_setup → completed` con `downstream_ref` como evidencia; nunca `completed` por inferencia.
- **Por qué el materializer no lleva flag:** un `refresh()` no-op escribe una fila terminal en `outbox_reactive_log` y el evento no vuelve. El flag vive donde sí es reversible: los consumers.
- **Qué señales ameritan ops en V1:** `handoff_blocked_stale` + `internal_hire_awaiting_onboarding` (SLA de no perder un hire). `coverage_risk`/`opening_stalled` NO son reliability signals — son estado de negocio, van a follow-up.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Proteger eventos swept (Slice 0) → Migration (Slice 1) → aggregate/command + capability grant (Slice 2) → event catalog + consumer reactivo + backfill (Slice 3) → bridges (Slice 4) → signals + tests (Slice 5). **NO** registrar el consumer reactivo (Slice 3) antes de que la tabla (Slice 1) exista. **NO** flip del flag de bridges antes de Slice 5 verde + smoke de materialize/replay/supersede.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| **Flag OFF sobre el materializer descarta eventos permanentemente** | reactive | **Alta si se implementa como estaba** | Materializer sin flag; flag solo en bridges | `hiring_handoff` count vs `decision='selected'` count |
| **Handoff con destino stale tras re-decisión** | reactive/DB | **Alta** | Upsert guardado por `decision_id` + `state`; `approved`+supersede → `blocked` | `hiring.handoff_blocked_stale` |
| **Handoff creado para rechazado/backup** | reactive | **Alta** | Filtro `decision='selected'`; test de trigger | cola `internal_hire` con rechazados |
| Eventos swept borrados por cron de retención | reactive | Media | Re-marcar `no-op:pending-task-356-consumer` (Slice 0) | `COUNT` pre/post |
| Consumer dispara handoff en cada `stage_changed` | reactive | Media | Trigger SOLO `hiring.application.decided` | `handoff_blocked_stale` anómalo |
| Handoff duplicado por replay | reactive/DB | Media | UNIQUE `(hiring_application_id)` + upsert idempotente + `outbox_reactive_log` | dedupe count |
| Handoff derivado del payload (coalescing) → decisión vieja | reactive | Media | `refresh()` lee snapshot actual; test de coalescing | supersede test |
| Destino sin owner queda `pending` mudo | bridges | Media | `blocked:destination_not_supported` explícito | `handoff_blocked_stale` |
| Misclasificación laboral vía `expected_legal_entity` | payroll/legal | Media | Snapshot informativo; el régimen lo clasifica el owner downstream | revisión legal en 770 |
| Side effect prohibido (member/placement/engagement) | identity/StaffAug/EPIC-013 | Baja | Boundary test negativo ampliado | boundary test CI |
| Capability sin grant | entitlements | Baja | `hiring.handoff.approve` + grant mismo PR | `capability-grant-coverage.test` |
| Módulo reliability nuevo rompe tsc / señal invisible | reliability | Media | 2 `Record` exhaustivos + entrada en registry en el mismo PR | `pnpm typecheck` + `/admin/operations` |
| Cron nuevo a vercel.json | infra | Baja | Regla dura: solo Cloud Scheduler/ops-worker | vercel-cron gate |

### Feature flags / cutover

- **El materializer NO va gateado** (un flag OFF acusa los eventos como terminal → pérdida permanente).
- `HIRING_HANDOFF_BRIDGES_ENABLED` (default OFF) gatea el reader de cola + los bridges. Registrar en `FEATURE_FLAG_STATE_LEDGER.md` declarando runtime = Vercel + ops-worker (mapear con `grep -rn` antes de prender — prender solo en Vercel dejaría los bridges reactivos muertos). Flip: staging → sign-off → prod.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 re-marcado | SQL inverso sobre `outbox_reactive_log` | ~min | Sí |
| 1 migration | reverse migration (DROP tabla additive) | ~min | Sí |
| 2 aggregate/command/cap | revert PR + redeploy | ~min | Sí |
| 3 consumer/eventos | revert registro del projection + redeploy worker (los handoffs ya materializados quedan inertes) | ~min | Sí |
| 4 bridges | flag OFF + revert PR (readers additive) | ~min | Sí |
| 5 signals | revert PR (signals additive) | ~min | Sí |

### Production verification sequence

Re-marcar eventos swept → deploy + redeploy ops-worker (materializer activo, bridges OFF) → verificar registro projection + queue-depth sano + handoffs materializándose → backfill dry-run → apply → flip `HIRING_HANDOFF_BRIDGES_ENABLED` staging → sembrar decisión real (355) → 1 handoff único + señales steady + replay sin dup + `rejected` sin handoff → sign-off → flip prod.

### Out-of-band coordination required

- Env var `HIRING_HANDOFF_BRIDGES_ENABLED` (staging/prod/**ops-worker**) + **redeploy ops-worker**. **NO** hay seam pendiente con 355: el evento ya se emite. Sin secretos/webhooks externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe `HiringHandoff` como aggregate runtime (tabla + store + type) con state-machine + CHECK + audit trail append-only (triggers anti-UPDATE/DELETE).
- [x] El consumer reactivo (`ProjectionDefinition`, domain `people`) materializa el handoff **solo** desde `hiring.application.decided` **y solo cuando `decision='selected'`**, leyendo el snapshot actual (no el payload), es idempotente (replay → sin duplicado) y no hace silent-skip.
- [x] Una re-decisión sobre un handoff `pending` lo actualiza + audita; sobre uno `approved|in_setup|completed` lo bloquea con `decision_superseded_after_approval` (nunca sobrescribe en silencio).
- [x] `hiring.handoff.*` registrados y versionados en `event-catalog.ts`, documentados en `GREENHOUSE_EVENT_CATALOG_V1.md`, sin PII sensible. (`hiring.application.decided` ya existía — no se re-registra.)
- [x] El materializer y el command **NUNCA** escriben `members`/`assignments`/`placements`/`payroll_*`/`compensation_versions`/`final_settlements`/`contractor_engagements`/`providers`/`expenses` (boundary test negativo verde).
- [x] Los destinos sin owner (`contractor`, `partner`, `internal_reassignment`) nacen `blocked:destination_not_supported`, nunca `pending` mudo.
- [x] Un `internal_hire` aprobado llega a la cola `listInternalHireReadyForOnboarding` (read-model) para que HRIS/770 cree/promueva `member` sobre el mismo `identity_profile_id`.
- [x] La conversión (770) deja el `member` en `pending_intake`/`onboarding`; 356 no activa nada por side effect (verificado por boundary, no por 356 crear member).
- [x] El handoff NO transporta ningún campo interpretable como `contractType`; `expected_legal_entity` está marcado como propuesta no vinculante.
- [x] Command `transitionHiringHandoff` gobernado por `hiring.handoff.approve` (capability + grant + coverage test mismo PR), idempotente, con audit + errores canónicos + `blocked_reason` como código estable.
- [x] Reliability signals `hiring.handoff_blocked_stale` + `hiring.internal_hire_awaiting_onboarding` wired (módulo `hiring` creado; las 2 señales bajo `documents` migradas mismo PR). *Verificación visual en `/admin/operations` queda para el deploy (código local-first sin push); queries verdes contra PG real.*
- [x] Reader hiring-aware de Person 360 (journey longitudinal) sin silent-catch.
- [x] **El materializer NO está gateado**; `HIRING_HANDOFF_BRIDGES_ENABLED` default OFF + fila en el ledger declarando runtime Vercel + ops-worker.
- [x] Eventos `decided` previos re-marcados `no-op:pending-task-356-consumer` y backfill idempotente ejecutado (dry-run → apply) con `COUNT` verificado.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (gate cross-dominio)
- `pnpm migrate:up` + verificación `information_schema` (tabla/UNIQUE/CHECK/GRANT)
- Smoke consumer contra PG real (proxy): sembrar `hiring.application.decided` → 1 `hiring_handoff`; replay → sin duplicado
- Prueba negativa: `decision='rejected'|'withdrawn'|'on_hold'|'backup_selected'` → 0 handoffs
- Prueba de supersede: 2.ª decisión con destino distinto sobre handoff `pending` → actualiza + audita; sobre `approved` → `blocked`, no sobrescribe
- Prueba negativa: handoff aprobado NO crea `placement`/`member`/`contractor_engagement`/payroll automáticamente
- Prueba positiva: `internal_hire` aprobado aparece en la cola sobre el mismo `identity_profile_id`
- Prueba negativa: identidad ambigua / datos legales faltantes / destino sin owner → handoff `blocked` con código auditado
- Prueba de idempotencia/replay de eventos `hiring.*` (`outbox_reactive_log` sin dead-letter)
- `pnpm qa:gates --changed` + `pnpm docs:closure-check` + `pnpm flags:audit --strict`

## Closing Protocol

- [x] Eventos y señales registrados en el control plane institucional (projection-registry + RELIABILITY_REGISTRY), NO en bus ad hoc.
- [x] `GREENHOUSE_EVENT_CATALOG_V1.md` + `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` con `## Delta`.
- [x] `FEATURE_FLAG_STATE_LEDGER.md` con la fila del flag; `Handoff.md` + `changelog.md`.
- [x] `## Delta` a TASK-770 (consume la cola/handoff) y a TASK-355 (seam del evento) si cambian supuestos.
- [x] Runtime Rollout Completion Gate: si queda code-complete sin flip/redeploy, reportar `code complete, rollout pendiente`.

## Follow-ups

- `TASK-770` — cerrar `internal_hire` como colaborador activo vía HRIS/People + onboarding readiness (consume la cola de 356).
- **Bridge `contractor` → EPIC-013** (`src/lib/contractor-engagements/**`): hoy `blocked:destination_not_supported`. Requiere task propia con el boundary contractor↛payroll ya canonizado.
- **Owner para `partner` e `internal_reassignment`** (hoy sin dueño downstream).
- **`coverage_risk` / `opening_stalled`** como métricas de workforce planning / ICO (NO reliability signals).
- Consumers hiring-aware adicionales en Person 360 / observabilidad ops del dominio.
- Automatización downstream (capability separada, auditoría reforzada, compensating actions) — post V1.

## Resolved Open Questions

- **Trigger del handoff:** `hiring.application.decided` **y** `decision='selected'`. Nunca `stage_changed`; nunca `rejected|withdrawn|on_hold|backup_selected`. El evento **ya existe y ya se emite** (355 complete) — 356 solo agrega el consumer.
- **Idempotencia del aggregate:** UNIQUE `(hiring_application_id)` + upsert guardado por `decision_id` y `state`. **NO** `ON CONFLICT DO NOTHING` (perdería re-decisiones). El `refresh()` lee el snapshot actual, no el payload (hay coalescing).
- **Flag:** el materializer NO va gateado (un no-op acusa el evento como terminal y lo pierde). `HIRING_HANDOFF_BRIDGES_ENABLED` gatea solo readers/bridges.
- **Dominio reactivo:** `people` (no un partition `hiring` nuevo; `ProjectionDomain` ya tiene 8 valores, el criterio es qué cron lane drena). Reliability: decidir explícitamente `hiring` module key nuevo (con su costo tsc + migración de las 2 señales bajo `documents`) vs reuse.
- **V1 humano-asistido:** no crea `assignment`/`placement`/`member`/`contractor_engagement`/payroll automáticamente. La activación final del colaborador pertenece a HRIS/People (770), no a Hiring.
- **Destinos soportados en V1:** `internal_hire` + `staff_augmentation`. Los otros 3 nacen `blocked` con código.
- **`staff_augmentation`:** `selected application → decided → handoff approved → owner crea/linkea placement`. Hiring solo conserva trazabilidad.
- **`internal_hire`:** `decided → handoff approved → cola HRIS → member facet sobre mismo identity_profile → onboarding → activo cuando HRIS completa readiness`.
- **Riesgo residual aceptado:** `decisionHistory[]` vive en `explainability_json` (JSONB), sin FK. La correlación `hiring_handoff.decision_id → decisionHistory[].decisionId` es un acoplamiento a un shape JSON, no a un contrato relacional. Si esto se vuelve frágil, promover el historial a tabla propia (task aparte, 355 es dueño).
