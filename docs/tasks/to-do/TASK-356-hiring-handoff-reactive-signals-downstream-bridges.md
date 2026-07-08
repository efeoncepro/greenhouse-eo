# TASK-356 — Hiring Handoff, Reactive Signals & Downstream Bridges

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

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Backend impact: `sync`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-353`
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

- `TASK-353` (foundation: schema `greenhouse_hiring`, store, columnas snapshot de decisión, eventos `hiring.*` v1)
- **Seam con `TASK-355`:** el evento `hiring.application.decided` v1 (356 lo registra en el catálogo; 355 lo emite). Sin él, el consumer de 356 no tiene trigger (shippea dormido, sin error).
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

### Already exists (verificado 2026-07-08)

- **Sustrato reactivo maduro:** `ProjectionDefinition` (`projection-registry.ts:48`), `registerProjection`/`getProjectionsForEvent`, `ensureProjectionsRegistered()` (`projections/index.ts:94`), dispatcher `processReactiveEvents()` (`reactive-consumer.ts`), idempotencia `outbox_reactive_log ON CONFLICT (event_id, handler)`, dead-letter tras `maxRetries`, `sweepAuditOnlyEvents()` para eventos sin handler. Ejemplo canónico: `src/lib/sync/projections/staff-augmentation.ts`.
- **Publisher/consumer en Cloud Scheduler + ops-worker** (`services/ops-worker/server.ts`: `POST /outbox/publish-batch`, `POST /reactive/process`, `/reactive/process-domain`, `/reactive/recover`).
- **Emit helper canónico:** `publishOutboxEvent(event, client?)` (`src/lib/sync/publish-event.ts:41`), transaccional in-tx.
- **Columnas snapshot de decisión** presentes en `hiring_application` (migración `20260707235655376`:167-178).
- **Downstream targets** presentes: `createStaffAugPlacement`, `getPersonComplete360`, `getPersonDetail`.
- **Reliability shape:** `ReliabilitySignal` (`src/types/reliability.ts:167`); ejemplo `queries/workforce-unlinked-internal-users.ts`.
- **Capability `hiring.application.decide`** ya existe + granteada (`entitlements-catalog.ts:2105-2120`, `runtime.ts:455-495`).

### Gap

- No existe `HiringHandoff` (aggregate/store/type/tabla) — solo el enum de etapa `handoff_ready` y las columnas snapshot inertes.
- No existe `hiring.application.decided` ni `hiring.handoff.*` en `event-catalog.ts` (reservados por comentario :1085).
- No existe consumer reactivo hiring-aware ni entrada en `projections/index.ts`.
- No existe `hiring` en `ProjectionDomain` (se rutea a `people`) ni en `ReliabilityModuleKey` (hay que agregarlo).
- No existen reliability queries `hiring-*` ni bridge explícito hacia assignment/placement.
- No existe capability `hiring.handoff.*`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (reactive prod-path + additive migration + capability nueva + reliability module; el borde crítico de creación de `member` NO vive acá — es 770)
- Impacto principal: `sync` (reactive consumer) + `migration` (tabla handoff) + `command` (approve) + `reader` (cola + person-360 hiring-aware) + `api`
- Source of truth afectado: `greenhouse_hiring.hiring_handoff` (nuevo aggregate); la decisión sigue siendo `hiring_application.*` (SSOT, 353/355 — 356 la lee, no la duplica)
- Consumidores afectados: reactive worker (ops-worker), TASK-770 (cola internal_hire), Person 360/People readers, Staff Aug store, Nexa (por parity)
- Runtime target: `worker` (reactive) + `staging`/`production` (flag-gated)

### Contract surface

- Contrato existente a respetar: `ProjectionDefinition` (`projection-registry.ts`), `publishOutboxEvent` (`publish-event.ts`), `ReliabilitySignal` (`types/reliability.ts`), `outbox_reactive_log` idempotency, boundary Hiring↛member/placement/payroll.
- Contrato nuevo o modificado:
  - **Evento (seam):** `hiring.application.decided` v1 — aggregate `hiring_application`; registrado por 356, emitido por 355.
  - **Eventos nuevos:** `hiring.handoff.created|approved|in_setup|completed|blocked|cancelled` v1 (aggregate `hiring_handoff`).
  - **Command:** `approveHiringHandoff` / `transitionHiringHandoff(input)` + `POST /api/hiring/handoffs/[id]/(approve|setup|complete|cancel)`.
  - **Readers:** `listInternalHireReadyForOnboarding()` (cola read-model para 770), `getHiringJourneyForPerson(identityProfileId)` (person-360 hiring-aware).
  - **Reliability signals:** `hiring.coverage_risk`, `hiring.opening_stalled`, `hiring.handoff_blocked_stale`, `hiring.internal_hire_awaiting_onboarding`.
- Backward compatibility: `gated` (flag `HIRING_REACTIVE_HANDOFF_ENABLED` default OFF; consumer registrado pero dormido hasta flip). Todo additive.
- Full API parity: el handoff approve/transition es un **command gobernado** (capability `hiring.handoff.approve`), consumido por UI (770) + Nexa (propose→confirm) por construcción; NO click-handler acoplado.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_handoff` (nuevo) + `hiring_handoff_audit` (append-only) + read-model de cola (view o reader). Lee `hiring_application` (snapshot) + `identity_profiles`.
- Invariantes que no se pueden romper:
  - **Un handoff por aplicación decidida:** UNIQUE `hiring_handoff(hiring_application_id)` + `ON CONFLICT DO NOTHING` (idempotencia del materializer).
  - **State-machine:** `pending → approved → in_setup → completed`; `pending|approved → blocked` (con razón); `pending|approved|blocked → cancelled`. CHECK constraint + transición validada en el command; `completed` requiere `downstream_ref` (evidencia del owner), nunca por inferencia.
  - **Identidad:** la Person del handoff = `identity_profile_id` del candidate_facet; NUNCA se crea persona nueva ni pipeline paralelo.
  - **Boundary:** el materializer/command NUNCA escribe `members`/`assignments`/`placements`/`payroll_*`/`compensation_versions`/`final_settlements`. Solo persiste el handoff + la intención.
  - **Trigger:** el consumer reacciona SOLO a `hiring.application.decided` (nunca `stage_changed`). `extractScope()` retorna `{entityType:'hiring_application', entityId}` no-null (ISSUE-046).
- Tenant/space boundary: el handoff hereda scope del `hiring_application`/opening (BU/área/legal entity previstas); las reads filtran por el mismo scope que 353.
- Idempotency/concurrency: (1) evento → `outbox_reactive_log ON CONFLICT (event_id, handler)`; (2) aggregate → UNIQUE + `ON CONFLICT DO NOTHING`; (3) command approve → idempotente por `(handoff_id, target_state)`. `refresh()` idempotente y sin silent-skip (throw + `captureWithDomain` si precondición rota, nunca `recorded=0` mudo — Playbook V2 §silent-skip interno).
- Audit/outbox/history: `hiring_handoff_audit` append-only (create/approve/block/complete/cancel: quién, cuándo, IDs downstream, prerequisitos abiertos) + eventos `hiring.handoff.*` v1 al outbox.

### Migration, backfill and rollout

- Migration posture: `additive` — `CREATE TABLE hiring_handoff` + `hiring_handoff_audit` + índices + UNIQUE + CHECK + GRANTs. Marker `-- Up Migration`, DDL solo en Up, bloque DO anti pre-up-marker verificando la tabla, Down solo DROP.
- Default state: `flag OFF` (`HIRING_REACTIVE_HANDOFF_ENABLED`) — el `ProjectionDefinition` se registra siempre pero el `refresh()` retorna no-op cuando el flag está OFF (shadow-safe); registrar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (gate `docs:closure-check`).
- Backfill plan: `none` en V1 (no hay decisiones históricas emitidas; el evento nace con 355). Si al flip existieran applications ya decididas, backfill idempotente opcional que re-emita `hiring.application.decided` para las `decision IS NOT NULL` sin handoff (dry-run → apply, batched).
- Rollback path: `flag off` (consumer vuelve a no-op) → `revert PR` → `reverse migration` (DROP tabla; segura por additive). Los eventos ya publicados quedan como audit inerte.
- External coordination: env var `HIRING_REACTIVE_HANDOFF_ENABLED` en staging+prod+worker; **redeploy del ops-worker** para que registre el projection nuevo; ningún secreto/webhook externo.

### Security and access

- Auth/access gate: command approve/transition = `session` + capability `hiring.handoff.approve` (fina, NO admin-coarse) + grant a rol real (`efeonce_operations`/`hr_manager` u `efeonce_account` — el que corresponda al recruiting owner) mismo PR. El consumer reactivo corre como worker (service context), sin sesión de usuario.
- Sensitive data posture: `no PII sensible en eventos` (IDs + snapshots mínimos); el handoff referencia `identity_profile_id`, no copia PII. Cualquier compensación/costo en el snapshot es **propuesta**, no payroll truth.
- Error contract: `canonicalErrorResponse` es-CL en el endpoint; `captureWithDomain(err, 'agency'|'workforce', ...)` en el materializer y el command (NUNCA `Sentry.captureException` directo, NUNCA prosa inglesa cruda al cliente).
- Abuse/rate-limit posture: `N/A` — superficie interna gobernada por capability (no pública). El replay guard lo da `outbox_reactive_log`.

### Runtime evidence

- Local checks: `pnpm test` (unit: state-machine, materializer idempotente, extractScope no-null, boundary NO escribe member/placement) + `pnpm lint` + `pnpm tsc --noEmit` + `pnpm build`.
- DB/runtime checks: `pnpm migrate:up` + verificación `information_schema` de la tabla/UNIQUE/CHECK; smoke del consumer contra PG real (proxy) con un `hiring.application.decided` sembrado → un solo `hiring_handoff` materializado; replay del mismo evento → sin duplicado.
- Integration checks: `pnpm staging:request` para readers de cola; ejercer el reactive `POST /reactive/process-domain` (people) en staging tras flip.
- Reliability signals/logs: `hiring.coverage_risk`, `hiring.opening_stalled`, `hiring.handoff_blocked_stale`, `hiring.internal_hire_awaiting_onboarding` en `/admin/operations` (steady=0); `outbox_reactive_log` sin dead-letter para eventos hiring.
- Production verification sequence: (1) deploy con flag OFF (consumer dormido) → (2) verificar registro del projection + `queue-depth` sano → (3) flip flag en staging → sembrar decisión real (via 355) → confirmar handoff único + señales steady → (4) flip prod tras sign-off.

### Acceptance criteria additions

- [ ] Source of truth (`hiring_handoff`), contract surface (eventos + command + readers + signals) y consumers (770/360/StaffAug/Nexa) nombrados con paths reales.
- [ ] Invariantes (un-handoff-por-app, state-machine CHECK, boundary NO-member, trigger solo `decided`) explícitos; idempotencia en dos planos.
- [ ] Migration additive + flag OFF + rollback (flag/revert/reverse) explícito.
- [ ] Evidencia DB/worker listada (materialize + replay + signals steady).
- [ ] Errores canónicos + audit/outbox + sin leak de PII.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive (`src/lib/hiring/handoff/**` command/reader + `projections/hiring-handoff-materialize.ts`), NO en UI.
- [ ] Modelada como aggregate/command (`HiringHandoff` + `transitionHiringHandoff`), no click-handler.
- [ ] Read = `listInternalHireReadyForOnboarding`/`getHiringJourneyForPerson` (readers canónicos); write = command con semantics + authorization fina (`hiring.handoff.approve`) + idempotencia + audit/outbox + errores canónicos + observabilidad.
- [ ] Capability + grant en el MISMO PR (`hiring.handoff.approve` en catálogo + grant a ≥1 rol real + coverage test verde).
- [ ] Camino programático declarado: `POST /api/hiring/handoffs/[id]/*` interno + reader para 770; Nexa por parity.
- [ ] Write apto para `propose → confirm → execute` (Nexa opera el approve por construcción, no integración Nexa-específica).
- [ ] Un primitive, muchos consumers (770 UI, Person 360, Staff Aug, Nexa) — cero lógica duplicada.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION LOG (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- Zone 2 queda como marker al crear la task. El agente ejecutor registra aquí
     Discovery/Audit/Plan/slices reales al tomarla. No llenar al crear. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migration: `hiring_handoff` aggregate + audit

- `CREATE TABLE greenhouse_hiring.hiring_handoff` con: `hiring_handoff_id` (PK), `hiring_application_id` (FK, **UNIQUE**), `identity_profile_id`, `candidate_facet_id`, `selected_destination` (CHECK espejo del enum de 353), `state` (CHECK `pending|approved|in_setup|completed|blocked|cancelled`), `expected_legal_entity`, `tentative_start_date`, `suggested_manager_member_id`, `modality`, `country_regime`, `prerequisites_snapshot_json`, `downstream_ref` (nullable; requerido para `completed`), `blocked_reason`, timestamps + `state_changed_at`.
- `CREATE TABLE hiring_handoff_audit` (append-only): `handoff_id`, `from_state`, `to_state`, `actor_user_id`, `reason`, `downstream_ref`, `open_prerequisites_json`, `occurred_at`.
- Marker `-- Up Migration`, DDL solo en Up, bloque DO anti pre-up-marker, GRANTs a `greenhouse_runtime`, Down solo DROP. `pnpm migrate:up` + `db.d.ts` en el mismo commit.

### Slice 2 — HiringHandoff aggregate + state-machine + command

- `src/lib/hiring/handoff/{types,store,state-machine}.ts`: `HiringHandoff` type, `createHiringHandoffFromDecision(applicationSnapshot, client)` (idempotente, `ON CONFLICT DO NOTHING`), `transitionHiringHandoff({handoffId, targetState, actorUserId, reason?, downstreamRef?})` con validación de transición + audit en la misma tx + emisión `hiring.handoff.*`.
- `approved` requiere capability `hiring.handoff.approve` + destino explícito; `completed` requiere `downstream_ref`.
- Endpoint `POST /api/hiring/handoffs/[id]/(approve|setup|complete|cancel)` (auth + capability + `canonicalErrorResponse`).
- Capability `hiring.handoff.approve` en `entitlements-catalog.ts` + grant a rol real en `runtime.ts` (coverage test verde) — mismo slice.

### Slice 3 — Reactive consumer + event catalog (el seam con 355)

- Registrar en `event-catalog.ts`: aggregate `hiring_handoff` + eventos `hiring.application.decided`, `hiring.handoff.created|approved|in_setup|completed|blocked|cancelled` (v1, payload mínimo sin PII).
- `src/lib/sync/projections/hiring-handoff-materialize.ts`: `ProjectionDefinition` domain **`people`**, `triggerEvents:['hiring.application.decided']`, `extractScope` → `{entityType:'hiring_application', entityId}` (no-null), `refresh` = leer snapshot de decisión de `hiring_application` → `createHiringHandoffFromDecision` (idempotente) → emitir `hiring.handoff.created`. Respeta flag `HIRING_REACTIVE_HANDOFF_ENABLED` (no-op si OFF, sin silent-skip: retorna resultado explícito).
- `registerProjection(...)` en `projections/index.ts`. Redeploy ops-worker.
- **Nota de seam:** 355 emite `hiring.application.decided` desde `decideHiringApplication`. Si 356 shippea antes, el consumer queda dormido (sin eventos) — safe.

### Slice 4 — Downstream bridges (People / Person 360 / Staff Aug)

- Reader `getHiringJourneyForPerson(identityProfileId)` hiring-aware (candidate→application→handoff→member si HRIS lo aceptó) consumido por Person 360/People — anti silent-catch (`observeAndRethrow`/degradación honesta, nunca `.catch(()=>[])`).
- Bridge Staff Augmentation: para `selected_destination='staff_augmentation'`, exponer la intención de handoff a `staff-augmentation` (el owner llama `createStaffAugPlacement` explícito; 356 NO crea placement).
- HRIS/onboarding: reader `listInternalHireReadyForOnboarding()` (cola read-model) — solo handoffs `internal_hire` `approved` no `completed`. Consumido por TASK-770 (su UI). Si HRIS crea/promueve `member`, es sobre el mismo `identity_profile_id`.
- Estados fallidos/bloqueados soportados: datos incompletos, identidad ambigua sospechosa, legal entity faltante, fecha inválida, aprobación pendiente → handoff `blocked` con `blocked_reason` auditado.

### Slice 5 — Reliability signals + audit + tests

- `hiring` ReliabilityModuleKey/domain nuevo (`types/reliability.ts` + `registry-store.ts` entry, `incidentDomainTag:'agency'` o `'workforce'`).
- Queries `src/lib/reliability/queries/hiring-*.ts` (patrón `workforce-unlinked-internal-users.ts`, steady=0): `coverage_risk`, `opening_stalled`, `handoff_blocked_stale`, `internal_hire_awaiting_onboarding` (handoff `internal_hire` approved sin member/onboarding tras ventana configurable). Wire-up en `get-reliability-overview.ts`.
- Tests: state-machine (transiciones válidas/ inválidas), materializer idempotente (replay → sin duplicado), `extractScope` no-null, **boundary negativo** (materialize/command NO tocan `members`/`placements`/`payroll_*`), señales en steady.

## Out of Scope

- Landing pública de careers (354), desk interno principal (355), assessment (1360/1361/1363), doc capture (1362).
- La **UI** de la cola internal_hire y la **creación/promoción real de `member`** → TASK-770.
- Creación de `placement` / `assignment` / payroll truth (solo intención + trazabilidad).
- Scorecards/analítica predictiva; automatización downstream sin confirmación humana (capability separada futura).
- Nuevo `ProjectionDomain`/cron partition `hiring` (se rutea a `people`/`notifications`).

## Detailed Spec

La task debe dejar explícito (y probado):

- **Cómo se evita crear `member` demasiado pronto:** el materializer solo persiste `HiringHandoff` + intención; ni el consumer ni el command escriben `members`. La creación es 770, gatillada por la cola.
- **Cómo `internal_hire` → colaborador sin duplicar persona ni saltarse HRIS:** handoff sobre `identity_profile_id`; cola `listInternalHireReadyForOnboarding`; 770 crea/promueve `member` en `pre_onboarding`.
- **Cómo `staff_augmentation` sin crear placement:** intención expuesta al owner; `createStaffAugPlacement` es acción explícita downstream.
- **Cómo el handoff se traduce a runtime en el momento correcto:** state-machine `approved → in_setup → completed` con `downstream_ref` como evidencia; nunca `completed` por inferencia.
- **Qué señales ameritan ops en V1:** `handoff_blocked_stale` + `internal_hire_awaiting_onboarding` (SLA de no perder un hire); `coverage_risk`/`opening_stalled` como observabilidad.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Migration (Slice 1) → aggregate/command + capability grant (Slice 2) → event catalog + consumer reactivo (Slice 3) → bridges (Slice 4) → signals + tests (Slice 5). **NO** registrar el consumer reactivo (Slice 3) antes de que la tabla (Slice 1) exista. **NO** flip del flag antes de Slice 5 verde + smoke de materialize/replay.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Consumer dispara handoff en cada `stage_changed` | reactive | Media | Trigger SOLO `hiring.application.decided`; test de trigger | `handoff_blocked_stale` anómalo |
| Handoff duplicado por replay | reactive/DB | Media | UNIQUE `(hiring_application_id)` + `ON CONFLICT DO NOTHING` + `outbox_reactive_log` | dedupe count |
| Silent-skip (extractScope null) → backlog | reactive | Media | `extractScope` no-null; no-op explícito si flag OFF (Playbook V2) | `outbox.unpublished_lag` / queue-depth |
| Side effect prohibido (crea member/placement) | identity/StaffAug | Baja | Boundary test negativo; command solo persiste handoff | boundary test CI |
| Capability sin grant | entitlements | Baja | `hiring.handoff.approve` + grant mismo PR | `capability-grant-coverage.test` |
| Cron nuevo a vercel.json | infra | Baja | Regla dura: solo Cloud Scheduler/ops-worker | vercel-cron gate |

### Feature flags / cutover

- `HIRING_REACTIVE_HANDOFF_ENABLED` (default OFF). Consumer registrado siempre; `refresh()` no-op si OFF (shadow-safe). Registrar en `FEATURE_FLAG_STATE_LEDGER.md`. Flip: staging → sign-off → prod.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 migration | reverse migration (DROP tabla additive) | ~min | Sí |
| 2 aggregate/command/cap | revert PR + redeploy | ~min | Sí |
| 3 consumer/eventos | flag OFF (no-op) + revert registro | ~min | Sí |
| 4 bridges | revert PR (readers additive) | ~min | Sí |
| 5 signals | revert PR (signals additive) | ~min | Sí |

### Production verification sequence

Deploy flag OFF → verificar registro projection + queue-depth sano → flip staging → sembrar decisión real (355) → 1 handoff único + señales steady + replay sin dup → sign-off → flip prod.

### Out-of-band coordination required

- Env var `HIRING_REACTIVE_HANDOFF_ENABLED` (staging/prod/worker) + **redeploy ops-worker**. Coordinar con 355 el emit de `hiring.application.decided` (seam). Sin secretos/webhooks externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `HiringHandoff` como aggregate runtime (tabla + store + type) con state-machine + CHECK + audit trail append-only.
- [ ] El consumer reactivo (`ProjectionDefinition`, domain `people`) materializa el handoff **solo** desde `hiring.application.decided`, es idempotente (replay → sin duplicado) y no hace silent-skip.
- [ ] `hiring.application.decided` + `hiring.handoff.*` registrados y versionados en `event-catalog.ts`, documentados en `GREENHOUSE_EVENT_CATALOG_V1.md`, sin PII sensible.
- [ ] El materializer y el command **NUNCA** escriben `members`/`assignments`/`placements`/`payroll_*` (boundary test negativo verde).
- [ ] Un `internal_hire` aprobado llega a la cola `listInternalHireReadyForOnboarding` (read-model) para que HRIS/770 cree/promueva `member` sobre el mismo `identity_profile_id`.
- [ ] La conversión (770) deja el `member` en `pre_onboarding`/`onboarding`; 356 no activa nada por side effect (verificado por boundary, no por 356 crear member).
- [ ] Command `transitionHiringHandoff` gobernado por `hiring.handoff.approve` (capability + grant + coverage test mismo PR), idempotente, con audit + errores canónicos.
- [ ] Reliability signals `hiring.*` publicadas en el control plane existente (nuevo `hiring` module) en steady=0.
- [ ] Reader hiring-aware de Person 360 (journey longitudinal) sin silent-catch.
- [ ] Flag `HIRING_REACTIVE_HANDOFF_ENABLED` default OFF + fila en el ledger; nada corre en prod sin flip.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test` (full) · `pnpm build`
- `pnpm migrate:up` + verificación `information_schema` (tabla/UNIQUE/CHECK/GRANT)
- Smoke consumer contra PG real (proxy): sembrar `hiring.application.decided` → 1 `hiring_handoff`; replay → sin duplicado
- Prueba negativa: handoff aprobado NO crea `placement`/`member`/payroll automáticamente
- Prueba positiva: `internal_hire` aprobado aparece en la cola sobre el mismo `identity_profile_id`
- Prueba negativa: identidad ambigua / datos legales faltantes → handoff `blocked` con razón auditada
- Prueba de idempotencia/replay de eventos `hiring.*` (`outbox_reactive_log` sin dead-letter)
- `pnpm qa:gates --changed` + `pnpm docs:closure-check`

## Closing Protocol

- [ ] Eventos y señales registrados en el control plane institucional (projection-registry + RELIABILITY_REGISTRY), NO en bus ad hoc.
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` + `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` con `## Delta`.
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` con la fila del flag; `Handoff.md` + `changelog.md`.
- [ ] `## Delta` a TASK-770 (consume la cola/handoff) y a TASK-355 (seam del evento) si cambian supuestos.
- [ ] Runtime Rollout Completion Gate: si queda code-complete sin flip/redeploy, reportar `code complete, rollout pendiente`.

## Follow-ups

- `TASK-770` — cerrar `internal_hire` como colaborador activo vía HRIS/People + onboarding readiness (consume la cola de 356).
- Consumers hiring-aware adicionales en Person 360 / observabilidad ops del dominio.
- Automatización downstream (capability separada, auditoría reforzada, compensating actions) — post V1.

## Resolved Open Questions

- **Trigger del handoff:** SOLO `hiring.application.decided` (evento semántico), nunca `hiring.application.stage_changed`. El evento es el seam con 355 (356 lo registra, 355 lo emite).
- **Dominio reactivo:** `people` (no un partition `hiring` nuevo). Reliability: `hiring` module key nuevo (additive).
- **V1 humano-asistido:** no crea `assignment`/`placement`/`member`/payroll automáticamente. La activación final del colaborador pertenece a HRIS/People (770), no a Hiring.
- **`staff_augmentation`:** `selected application → decided → handoff approved → owner crea/linkea placement`. Hiring solo conserva trazabilidad.
- **`internal_hire`:** `decided → handoff approved → cola HRIS → member facet sobre mismo identity_profile → onboarding → activo cuando HRIS completa readiness`.
