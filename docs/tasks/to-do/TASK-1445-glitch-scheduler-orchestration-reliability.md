# TASK-1445 — Glitch Scheduler, Orchestration and Reliability

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `cron`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-1444`
- Branch: `task/TASK-1445-glitch-scheduler-orchestration-reliability`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Activa Daily, Flash y Weekly como jobs gobernados sobre ops-worker/Cloud Scheduler con locks, presupuestos, retries, recovery, kill switch y señales operativas.

## Why This Task Exists

Un cron que ejecuta un prompt no garantiza zona horaria, concurrencia, replays, deadline editorial, límites de gasto ni recuperación de fallos parciales.

## Goal

- Orquestar modos Glitch sobre commands/adapters compartidos.
- Programar Weekly los lunes 09:00 `America/Santiago` contra el placeholder del martes.
- Detectar y recuperar runs missed/stale/partial sin duplicar writes.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`

Reglas obligatorias:

- Scheduler sólo despierta commands; no contiene doctrina editorial.
- Timezone explícita y tests sobre DST/calendario.
- Kill switch y write flags OFF por defecto durante shadow.

## Normative Docs

- `services/ops-worker/README.md`
- `services/ops-worker/cron-handler-wrapper.ts`
- `docs/operations/glitch/GLITCH_AGENTIC_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1444` y primitives de TASK-1442/1443.

### Blocks / Impacts

- `TASK-1446`; ops-worker, Cloud Scheduler, reliability y costos AI.

### Files owned

- `services/ops-worker/`
- `src/lib/content/glitch/`
- `src/lib/reliability/queries/`
- `docs/operations/glitch/GLITCH_SCHEDULER_RUNBOOK_V1.md`

## Current Repo State

### Already exists

- ops-worker, cron wrapper, auth, deploy y patterns de reliability.

### Gap

- No existen jobs Glitch ni freshness/deadline signals.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `services/ops-worker/ + src/lib/content/glitch/`
- Future candidate home: `worker`
- Boundary: `handlers delgados que invocan orchestrator/commands Glitch`
- Server/browser split: `ejecución íntegramente server-side; sin consumer browser`
- Build impact: `entrypoints worker y configuración Scheduler`
- Extraction blocker: `config compartida ops-worker, Postgres y secret refs de providers`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `cron`
- Source of truth afectado: `GlitchRun/Edition de TASK-1442`
- Consumidores afectados: `ops-worker, Cloud Scheduler, reliability, equipo editorial`
- Runtime target: `cron`

### Contract surface

- Contrato existente a respetar: `cron-handler-wrapper.ts + commands/adapters TASK-1442/1444`
- Contrato nuevo o modificado: `daily/flash/weekly orchestrator handlers y recovery command`
- Backward compatibility: `compatible`
- Full API parity: `scheduler, CLI y futuro Nexa llaman el mismo orchestrator server-side`

### Data model and invariants

- Entidades/tablas/views afectadas: `runs/leases/history definidos por TASK-1442`
- Invariantes: una ejecución activa por mode/window; weekly apunta al martes siguiente; publish nunca automático; deadline/freshness explícitos.
- Tenant/space boundary: `scope Efeonce explícito en job config`
- Idempotency/concurrency: `lease/lock + run key + retry-safe step state`
- Audit/outbox/history: `step transitions, cost/usage, attempt y terminal reason append-only`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `shadow`
- Backfill plan: `no replay histórico automático; allowlist manual`
- Rollback path: `disable Scheduler + kill switch + write flags off`
- External coordination: `Cloud Scheduler config y secret/env validation`

### Security and access

- Auth/access gate: `cron auth + service identity + capabilities de adapters`
- Sensitive data posture: `secret refs server-only; logs redacted`
- Error contract: `run_conflict/deadline_missed/budget_exceeded/provider_degraded/partial_write`
- Abuse/rate-limit posture: `daily/weekly budgets, rate cap, circuit breaker, max attempts`

### Runtime evidence

- Local checks: `orchestrator/clock/concurrency tests`
- DB/runtime checks: `run transitions y locks en Postgres`
- Integration checks: `Cloud Scheduler -> ops-worker shadow canary`
- Reliability signals/logs: `glitch.run.missed/stale/failed/budget_exceeded/partial_write`
- Production verification sequence: `local clock -> staging manual trigger -> scheduled shadow -> writes OFF -> controlled writes -> monitor`

### Acceptance criteria additions

- [ ] Source of truth, concurrency, timezone, rollback, security y signals tienen evidencia runtime.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Orchestrator and scheduling

- Implementar handlers Daily/Flash/Weekly y clock/calendar tests.
- Provisionar Scheduler inicialmente disabled/shadow.

### Slice 2 — Reliability and recovery

- Implementar budgets, retries, stale/missed detection, recovery y kill switch.
- Crear runbook y canaries staging/prod.

## Out of Scope

- UI, auto-publish, nueva doctrina editorial o adapters paralelos.

## Detailed Spec

Weekly calcula el martes editorial siguiente desde `America/Santiago`; Daily usa ventanas explícitas y Flash sólo se dispara bajo señal/operador. Cada step persiste estado antes del efecto externo siguiente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Orchestrator tests -> manual shadow -> Scheduler disabled -> scheduled shadow -> reliability green -> writes controlados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble weekly | cron/DB | medium | lease + unique run key | run conflict |
| Hora incorrecta | Scheduler | medium | timezone explícita + clock tests | missed/deadline signal |
| Gasto descontrolado | AI provider | low | budgets/circuit breaker | budget exceeded |

### Feature flags / cutover

Kill switch global y flags por modo/write; todos OFF o shadow al provisionar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Scheduler | pause job + kill switch | <10 min | sí |
| Orchestrator | flag off + revert deploy | <30 min | sí |

### Production verification sequence

Staging manual, staging scheduled, prod shadow, monitor dos ventanas, activar Daily y luego Weekly; Flash queda on-demand hasta criterio explícito.

### Out-of-band coordination required

Provisioning Cloud Scheduler y confirmación de budgets/horarios por operador.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Weekly resuelve lunes 09:00 Chile hacia el martes siguiente con tests de calendario.
- [ ] Replays/concurrencia no duplican run, Notion ni WordPress.
- [ ] Daily/Flash/Weekly tienen budgets, deadlines y terminal states.
- [ ] Kill switch y flags detienen writes sin perder audit.
- [ ] Canaries y señales detectan missed/stale/partial/failed runs.

## Verification

- `pnpm task:lint --task TASK-1445`
- Tests ops-worker/orchestrator/clock.
- Staging Cloud Scheduler canary + Postgres readback.
- `pnpm qa:gates --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta/README, runbook, deploy docs, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- `TASK-1446`.
