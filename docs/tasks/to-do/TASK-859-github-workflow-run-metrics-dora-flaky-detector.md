# TASK-859 — GitHub Workflow Run Metrics + DORA Signals + Flaky Detector (TASK-857 follow-up)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-859-github-workflow-run-metrics-dora`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Materializar TODOS los `workflow_run` y `workflow_job` events que ya ingesta el receiver TASK-857 (no solo los release-related) en una tabla canónica `greenhouse_sync.workflow_run_metrics`, y construir 3 reliability signals derivados: `ci.workflow_duration_p95`, `ci.flaky_workflow_rate`, `ci.change_failure_rate`. Habilita métricas DORA (deploy frequency, lead time for changes, change failure rate, MTTR) sin polling GH API.

## Why This Task Exists

TASK-857 recibe `workflow_run`/`workflow_job` events de TODOS los workflows pero solo los reconcilia contra `release_manifests` (i.e., descarta los que no son release deploys). Eso deja sobre la mesa observabilidad CI completa: degradación gradual de duración, flaky tests, change failure rate de PRs no-release. Hoy esa info se descubre por queja de devs ("ayer CI tardaba 5min, hoy 12min") en lugar de signal proactivo. DORA metrics son la lingua franca de release engineering moderno y Greenhouse no las tiene.

## Goal

- Tabla `greenhouse_sync.workflow_run_metrics` materializa TODO `workflow_run` event con duration, conclusion, actor, branch, attempt_n.
- Tabla `greenhouse_sync.workflow_job_metrics` materializa cada job con step duration breakdown.
- 3 reliability signals nuevos bajo subsystem `Platform CI`: `workflow_duration_p95`, `flaky_workflow_rate`, `change_failure_rate`.
- Dashboard `/admin/operations/ci-health` con KPIs DORA + top-5 workflows lentos + flaky list.
- Helper canónico `getDoraMetrics({fromDate, toDate})` para consumers downstream.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Receiver TASK-857 NO se modifica. Esta task agrega un consumer/projection que lee desde `webhook_inbox_events` (o equivalente del store TASK-857) y materializa.
- `workflow_run_metrics` y `workflow_job_metrics` son append-only desde el consumer (re-aplicar mismo `delivery_id` no duplica).
- Owner schema `greenhouse_sync` (consistente con `release_manifests`); ownership `greenhouse_ops`, GRANT runtime read/insert.
- Reliability signals siguen patrón TASK-742: subsystem rollup + steady state declarado + degradación honesta.
- DORA metrics se computan vía VIEW canónica; NO recompute inline en cada caller.

## Normative Docs

- `docs/tasks/complete/TASK-857-github-webhooks-release-event-ingestion.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- DORA reference: Forsgren / Humble / Kim — *Accelerate* (4 key metrics)

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-857-github-webhooks-release-event-ingestion.md` (receiver + inbox)
- `docs/tasks/complete/TASK-848-production-release-control-plane.md` (release_manifests para change failure rate)
- `src/lib/release/github-webhook-ingestion.ts`
- `greenhouse_sync.webhook_inbox_events` (o tabla equivalente del store TASK-857)

### Blocks / Impacts

- Habilita futuras decisiones data-driven sobre CI cost/performance.
- Insumo para evaluación de cambios a la suite de tests (flaky list).
- Base para reportes ejecutivos DORA.

### Files owned

- `migrations/*-task-859-workflow-run-metrics-tables.sql`
- `src/lib/sync/projections/workflow-run-metrics.ts` (consumer reactivo)
- `src/lib/sync/projections/workflow-run-metrics.test.ts`
- `src/lib/ci-metrics/dora-metrics.ts` (helper canónico)
- `src/lib/ci-metrics/dora-metrics.test.ts`
- `src/lib/reliability/queries/ci-workflow-duration-p95.ts`
- `src/lib/reliability/queries/ci-flaky-workflow-rate.ts`
- `src/lib/reliability/queries/ci-change-failure-rate.ts`
- `src/lib/reliability/get-reliability-overview.ts` (wire-up source `platformCi[]`)
- `src/app/(dashboard)/admin/operations/ci-health/page.tsx`
- `src/views/greenhouse/admin/ci-health/CiHealthView.tsx`
- `src/lib/copy/ci-health.ts`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (Delta subsystem `Platform CI`)
- `docs/documentation/plataforma/ci-health-dora-metrics.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Receiver `/api/webhooks/github/release-events` recibe `workflow_run`/`workflow_job` events firmados (TASK-857).
- Inbox `greenhouse_sync.webhook_inbox_events` con dedup por `X-GitHub-Delivery`.
- Reconciler `github-webhook-reconciler.ts` matchea contra `release_manifests` (solo release deploys).
- Reliability Control Plane registry: `src/lib/reliability/registry.ts` + `getReliabilityOverview`.
- Dashboard pattern canónico: `/admin/operations` con cards de subsystems.

### Gap

- Workflows que NO son release deploys (`ci.yml`, `design-contract.yml`, `playwright.yml`, `reliability-verify.yml`, watchdog mismo, etc.) son ignorados después de la dedup en inbox.
- No existe tabla materializada para queries analíticas sobre workflow runs.
- No hay helper DORA — change failure rate, lead time, deploy frequency, MTTR no están computados en ningún lugar.
- No existe subsystem `Platform CI` en el reliability registry.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + DDL

- Migration crea `greenhouse_sync.workflow_run_metrics`:
  - `run_id BIGINT PRIMARY KEY` (GitHub workflow_run.id)
  - `workflow_name TEXT NOT NULL`
  - `workflow_path TEXT NOT NULL`
  - `head_sha TEXT NOT NULL`
  - `head_branch TEXT NOT NULL`
  - `event TEXT NOT NULL` (`push`, `workflow_dispatch`, `schedule`, etc.)
  - `actor_login TEXT NULL`
  - `triggered_at TIMESTAMPTZ NOT NULL`
  - `started_at TIMESTAMPTZ NULL`
  - `completed_at TIMESTAMPTZ NULL`
  - `duration_seconds INT NULL` (computed via trigger o helper at insert)
  - `conclusion TEXT NULL` (`success`, `failure`, `cancelled`, `timed_out`, `action_required`)
  - `attempt_n INT NOT NULL DEFAULT 1`
  - `delivery_id TEXT NOT NULL UNIQUE` (X-GitHub-Delivery, dedup)
  - `raw_event_id BIGINT NULL` (FK a webhook_inbox_events)
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
- Migration crea `greenhouse_sync.workflow_job_metrics` (mismo shape per-job, FK a `workflow_run_metrics.run_id`).
- INDEXes: `(workflow_name, triggered_at DESC)`, `(head_sha)`, `(conclusion, completed_at DESC)`, `(head_branch, triggered_at DESC)`.
- Anti-regresión: bloque `DO ... RAISE EXCEPTION` post-DDL verifica tablas creadas (anti pre-up-marker bug).

### Slice 2 — Consumer reactivo

- `src/lib/sync/projections/workflow-run-metrics.ts`: registrado en `src/lib/sync/projections/index.ts` con `triggerEvents: ['github.webhook.workflow_run.received', 'github.webhook.workflow_job.received']` (o equivalente que TASK-857 emite [verificar nombre exacto]).
- `refresh({entityId})`: re-lee evento desde inbox, parsea, UPSERT en `workflow_run_metrics`. Idempotente.
- Si webhook payload está incompleto (no `started_at` aún), insert con NULL y deja UPSERT futuro completarlo.
- Tests: 5 escenarios (run nuevo, retry mismo delivery_id, run completion, cancellation, malformed payload).

### Slice 3 — Helper DORA

- `src/lib/ci-metrics/dora-metrics.ts`:
  - `getDeployFrequency({fromDate, toDate, env})` → deploys/día.
  - `getLeadTimeForChanges({fromDate, toDate})` → tiempo PR merged → deploy production.
  - `getChangeFailureRate({fromDate, toDate})` → % releases `degraded|aborted|rolled_back` / total.
  - `getMttr({fromDate, toDate})` → tiempo `degraded|aborted` → `released` siguiente.
- `getDoraMetrics({fromDate, toDate})` agregador. JOIN entre `workflow_run_metrics` (deploy events) y `release_manifests` (release outcomes).
- Tests: 6 escenarios canónicos por métrica.

### Slice 4 — 3 reliability signals + subsystem `Platform CI`

- `ci.workflow_duration_p95` (kind=`lag`, severity=warning >+30% vs baseline 30d, error >+50%). Per workflow_name.
- `ci.flaky_workflow_rate` (kind=`drift`, severity=warning >5%, error >10%). Cuenta workflows con `attempt_n > 1` y `conclusion='success'` en attempt > 1.
- `ci.change_failure_rate` (kind=`drift`, severity=warning >15%, error >30%). Computado via helper DORA.
- Wire-up en `getReliabilityOverview` source `platformCi[]`.
- Cada signal tiene 5 tests Vitest (ok / warning / error / SQL anti-regresión / degraded).

### Slice 5 — Dashboard `/admin/operations/ci-health`

- Server page con `requireServerSession` + capability `platform.ci.read` (NUEVA — agregar al catalog).
- KPI cards canónicos: DORA 4 métricas + DORA tier (Elite/High/Medium/Low por benchmarks).
- Tabla top-10 workflows lentos (sortable por duration_p95).
- Tabla flaky list ordenada por flaky_rate desc.
- Chart ECharts: duration p50/p95 timeline 30d.
- Empty state honesto cuando data insuficiente (<7d históricos).
- Microcopy es-CL en `src/lib/copy/ci-health.ts` (`GH_CI_HEALTH`).

### Slice 6 — Spec + doc + close

- Delta `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`: nuevo subsystem `Platform CI` + 3 signals.
- Doc funcional `docs/documentation/plataforma/ci-health-dora-metrics.md`.
- Capability `platform.ci.read` seedeada en `capabilities_registry`.
- CLAUDE.md sección con hard rules: NUNCA computar DORA inline + NUNCA leer `workflow_run_metrics` saltándose el helper canónico.
- TASK lifecycle close.

## Out of Scope

- NO modifica el receiver TASK-857 ni la tabla inbox.
- NO automatiza acciones sobre flaky workflows (no auto-rerun, no auto-quarantine).
- NO instrumenta métricas a nivel step (job-level es suficiente V1).
- NO hace backfill histórico de workflow runs pre-TASK-857 (data nace cuando webhook empieza a llegar).
- NO agrega webhook receiver para `pull_request` events (eso es TASK-860).

## Detailed Spec

### DORA reference values (target)

| Métrica | Elite | High | Medium | Low |
|---|---|---|---|---|
| Deploy frequency | On-demand (multiple/day) | Daily-weekly | Weekly-monthly | <Monthly |
| Lead time | <1h | <1d | 1d-1mo | >1mo |
| Change failure rate | 0-15% | 16-30% | 16-30% | 16-30% |
| MTTR | <1h | <1d | 1d-1wk | >1wk |

Greenhouse target inicial: **High tier** en deploy_frequency + lead_time, **Elite** en change_failure_rate (<15%), **High** en MTTR (<1d).

### Anti-regresión KPI

Cada métrica DORA tiene un test que verifica el cómputo exacto contra fixture conocido. Esto evita drift cuando alguien refactoriza el helper.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Tablas `workflow_run_metrics` y `workflow_job_metrics` creadas con anti pre-up-marker check.
- [ ] Consumer materializa cada `workflow_run` event recibido vía TASK-857 inbox.
- [ ] Consumer es idempotente (re-aplicar mismo `delivery_id` NO duplica).
- [ ] Helper `getDoraMetrics` retorna las 4 métricas con cómputos verificables vs fixture.
- [ ] 3 reliability signals registrados en subsystem `Platform CI`.
- [ ] Dashboard `/admin/operations/ci-health` muestra DORA + top workflows lentos + flaky list.
- [ ] Capability `platform.ci.read` seedeada y enforced en endpoint/page.
- [ ] CLAUDE.md hard rules canonizadas.
- [ ] Tests Vitest verdes (consumer + DORA helper + 3 signals).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/sync/projections/workflow-run-metrics src/lib/ci-metrics src/lib/reliability/queries/ci-`
- `pnpm migrate:up`
- Live: visitar `/admin/operations/ci-health` post-deploy y verificar que aparecen runs últimos 7d.

## Closing Protocol

- [ ] `Lifecycle` sync
- [ ] archivo en `complete/`
- [ ] `docs/tasks/README.md` sync
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-857, TASK-854 (DORA puede sustituir parcialmente `deploy_duration_p95`)
- [ ] Spec `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` Delta agregado
- [ ] Doc funcional `ci-health-dora-metrics.md` creado
- [ ] CLAUDE.md hard rules canonizadas

## Follow-ups

- Backfill histórico opcional via `gh api` polling 30d back, escribiendo directo a `workflow_run_metrics` (one-shot script).
- Auto-quarantine de flaky workflows con tasa > 25% sostenida 7d (V1.1 candidate).
- Insight "qué cambio en main causó el spike de duration_p95" cruzando con commits.
- Reporte ejecutivo mensual DORA email-able.

## Open Questions

- Nombre exacto del event que TASK-857 emite cuando recibe webhook (`github.webhook.workflow_run.received` es ejemplo — Discovery confirma).
- Tablas materializadas en `greenhouse_sync` vs `greenhouse_serving`. Inclinación: `greenhouse_sync` por consistencia con `release_manifests`. Confirmar con arch-architect overlay si emerge duda.
- ¿Cómo se mapea "deployment" a "release" para change failure rate? Por SHA matched a `release_manifests.target_sha` o por workflow_name in `RELEASE_DEPLOY_WORKFLOWS`?
