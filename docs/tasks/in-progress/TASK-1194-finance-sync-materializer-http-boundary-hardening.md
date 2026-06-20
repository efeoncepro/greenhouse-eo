# TASK-1194 — Finance sync/materializer HTTP boundary hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `cron`
- Epic: `optional`
- Status real: `Parcial`
- Rank: `TBD`
- Domain: `finance|sync|ops|access`
- Blocked by: `none`
- Branch: `task/TASK-1194-finance-sync-materializer-http-boundary-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Tercera ola de remediación F9: endurece las rutas HTTP de sync/materialización Finance para que no sean ejecutables por cualquier usuario con route-group Finance. Decide ruta por ruta si deben vivir solo en Cloud Scheduler/ops-worker, o quedar como manual-run admin con capability explícita, actor, reason y evidencia.

## Why This Task Exists

F9 detectó que endpoints como Nubox sync, economic indicators sync, exchange-rates sync, clients sync, supplier backfill y payment obligations materialize usan auth amplia o admin context sin una frontera operacional uniforme. Esas rutas pueden mutar datos, disparar integraciones externas o rematerializar serving tables. Deben tener un boundary operativo claro: scheduler/service account, shared secret/HMAC, o admin capability explícita con audit.

## Goal

- Clasificar cada sync/materializer HTTP route como `scheduler-only`, `manual-admin-run`, `deprecated/remove`, o `read-only`.
- Agregar capabilities/admin gates o cron/service-token guards según clasificación.
- Agregar actor/reason/audit para manual runs.
- Evitar regresiones sobre TASK-1191: Nubox sync ya estampa período fiscal; esta task solo endurece el boundary HTTP/ops.
- Documentar el patrón canónico para futuros sync/materializers Finance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md`
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md` (F2/F3/F9)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `services/ops-worker/deploy.sh`
- `vercel.json`

Reglas obligatorias:

- **NUNCA** correr sync/materializer mutante solo con `requireFinanceTenantContext()`.
- **SIEMPRE** distinguir scheduler/service execution de manual admin execution.
- **SIEMPRE** dejar actor, reason y scope en manual runs.
- **NO** cambiar la semántica fiscal-period de Nubox de TASK-1191; esta task solo puede tocar auth/ops boundary.

## Normative Docs

- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/finance/fx/sync-orchestrator.ts` `[verificar]`

## Dependencies & Impact

### Depends on

- `TASK-1191` complete (Nubox fiscal period stamping/backfill), porque una ruta afectada es `src/app/api/finance/nubox/sync/route.ts`.
- F2/F3 de la auditoría Finance para DTE retry y Vercel cron migration context.
- Existing Cloud Scheduler/ops-worker lane.

### Blocks / Impacts

- Reduce riesgo operativo de re-runs manuales no auditados.
- Prepara migración F2/F3 a Cloud Scheduler/ops-worker.
- Aclara qué endpoints quedan Product API manual-run vs scheduler-only.

### Files owned

- `src/app/api/finance/nubox/sync/route.ts`
- `src/app/api/finance/economic-indicators/sync/route.ts`
- `src/app/api/finance/exchange-rates/sync/route.ts`
- `src/app/api/finance/clients/sync/route.ts`
- `src/app/api/finance/suppliers/backfill-provider-links/route.ts`
- `src/app/api/admin/finance/payment-obligations/materialize-period/route.ts`
- `vercel.json`
- `services/ops-worker/deploy.sh`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- tests associated.

## Current Repo State

### Already exists

- Cloud Scheduler + ops-worker is canonical lane for most Finance syncs.
- Some Vercel cron jobs still exist for economic indicators / FX LATAM.
- Nubox sync route exists and was recently touched by TASK-1191.
- Admin repair/rematerialization routes have good precedent with capabilities (`finance.payroll.rematerialize`, `finance.payments.repair_clp`).

### Gap

- Several sync/materializer HTTP routes are callable with broad Finance context.
- Manual-run semantics do not consistently require reason, actor or capability.
- Scheduler-only vs manual-admin-run boundary is not documented per route.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `cron`
- Source of truth afectado: Finance sync/materializer route boundaries and scheduler lane
- Consumidores afectados: ops-worker, Cloud Scheduler, admin manual run operators, Finance data pipelines
- Runtime target: `app`, `worker`, `cron`

### Contract surface

- Contrato existente a respetar: current sync routes and ops-worker jobs.
- Contrato nuevo o modificado:
  - route classification ledger for sync/materializers;
  - manual-run capabilities such as `finance.sync.run`, `finance.nubox.sync`, `finance.fx.sync`, `finance.payment_obligations.materialize` `[nombres finales en Slice 1]`;
  - service-token/cron guard for scheduler-only routes if HTTP remains.
- Backward compatibility: `gated` (manual access narrows; scheduler access preserved).
- Full API parity: manual operational commands remain programmatic and governed; scheduler-only jobs use service contract, not UI-only or broad route-group access.

### Data model and invariants

- Entidades/tablas/views afectadas: capability registry/grants; no business data schema expected.
- Invariantes que no se pueden romper:
  - Existing scheduled jobs continue running after migration.
  - Manual sync runs require actor + reason + scoped period/source when applicable.
  - No provider raw errors leak to clients.
  - Nubox fiscal period behavior from TASK-1191 remains intact.
- Tenant/space boundary: internal ops/admin only; no client access.
- Idempotency/concurrency: preserve existing sync idempotency; add guardrails for repeated manual runs.
- Audit/outbox/history: manual run emits/logs actor, reason, route, scope and result; use existing source_sync_runs if available.

### Migration, backfill and rollout

- Migration posture: `seed` (capabilities/grants) + possibly cron config changes.
- Default state: scheduler access preserved; manual runs restricted to explicit capabilities.
- Backfill plan: N/A.
- Rollback path: revert PR + restore previous scheduler config / grants.
- External coordination: Cloud Scheduler/Vercel/ops-worker deploy if route ownership changes.

### Security and access

- Auth/access gate: scheduler token/HMAC/service account OR admin tenant + `can()`.
- Sensitive data posture: finance integrations, provider logs, fiscal data.
- Error contract: sanitized errors; details in logs/Sentry with domain tags.
- Abuse/rate-limit posture: manual runs should require explicit reason and avoid unbounded periods; consider rate/period guard.

### Runtime evidence

- Local checks: route tests for scheduler token/manual capability/missing capability.
- DB/runtime checks: capability/grant parity; source sync run logs.
- Integration checks: staging scheduler/manual-run smoke for each classification family.
- Reliability signals/logs: sync run status, Finance audit F2/F3 signals where applicable.
- Production verification sequence: staging scheduler smoke → deploy → monitor next scheduled run.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Manual-run commands are governed capabilities, not broad Finance buttons.
- [ ] Scheduler-only commands have service contract and are not public/manual by accident.
- [ ] Capability + grant in same PR for manual runs.
- [ ] Command semantics include actor/reason/scope for manual operational writes.
- [ ] One primitive/path per sync/materializer; UI/CLI/worker do not duplicate logic.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — DTE retry queue governance addendum (Codex, 2026-06-20)

- Treat `greenhouse_finance.dte_emission_queue` as governed DB infrastructure, not runtime-created state.
- Add migration for the queue table/indexes and remove runtime DDL from `src/lib/finance/dte-emission-queue.ts`.
- Keep `/api/cron/dte-emission-retry` behind existing `requireCronAuth`; scheduler registration/parity remains for later slices.
- Branch exception: operator requested staying on `develop`; this execution remains on `develop` instead of `task/TASK-1194-*`.

Slice 0 implementation status:

- Migration `20260620193557859_task-1194-dte-emission-queue-governed-ddl.sql` creates the queue table, grants and pending/retry index.
- `ensureDteEmissionQueueSchema()` is validation-only against `information_schema.columns`; it no longer runs `CREATE`/`ALTER`/`CREATE INDEX`.
- Cloud SQL dev: migration applied; `pnpm pg:connect:status` reports `No migrations to run`; SQL smoke confirms `greenhouse_finance.dte_emission_queue` exists with `0` rows.
- Remaining in TASK-1194: route classification, capability/service boundary, scheduler parity and reliability signal.

### Slice 1 — Route classification ledger

- Clasificar cada route sync/materializer: scheduler-only, manual-admin-run, deprecated/remove, read-only.
- Confirmar current callers desde `vercel.json`, `services/ops-worker/deploy.sh`, Cloud Scheduler docs/scripts.
- Definir capability/service guard por route.

### Slice 2 — Capability/service guard foundation

- Agregar capabilities/grants para manual-admin-run routes.
- Crear/reusar helper para scheduler-only guard si HTTP queda vivo.
- Tests de access boundary.

### Slice 3 — Apply route hardening

- Aplicar gates a Nubox sync, economic indicators, exchange rates, clients sync, supplier backfill y payment obligations materialize según clasificación.
- Agregar actor/reason/scope a manual runs.

### Slice 4 — Scheduler parity and docs

- Si alguna ruta migra de Vercel cron a ops-worker/Cloud Scheduler, actualizar config y docs.
- Documentar patrón canónico para futuros sync/materializers Finance.

### Slice 5 — Staging/prod verification

- Staging smoke de scheduler/manual runs.
- Verificar next scheduled run y logs.
- Actualizar audit F9/F2/F3 statuses.

## Out of Scope

- TASK-1191 Nubox fiscal period behavior/backfill (solo se respeta; no se reimplementa).
- Payment/Treasury capabilities (TASK-1192).
- DTE/Income/Expense/HES/PO action gates (TASK-1193).
- Cambiar lógica de negocio de syncs fuera del boundary de ejecución.

## Detailed Spec

Cada route queda con una decisión explícita:

- `scheduler-only`: valida service token/HMAC/cron guard; no se usa por UI.
- `manual-admin-run`: `requireAdminTenantContext()` o context apropiado + `can()` + body con reason/scope.
- `deprecated/remove`: retorna 410 o se elimina tras verificar callers.
- `read-only`: conserva auth base si no muta estado.

No mezclar esta task con cambios de datos o backfills.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- No cambiar scheduler config sin staging smoke.
- No endurecer route antes de confirmar su caller real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Romper cron/scheduler productivo | cron/worker | medium | caller inventory + staging scheduled smoke | source sync stale |
| Bloquear manual recovery legítimo | finance/ops | medium | manual-admin-run capability + grants + runbook | 403/error ops |
| Reintroducir conflicto con TASK-1191 | Nubox/VAT | low | blocked by TASK-1191; no fiscal-period edits | VAT signals |
| Provider errors leak to operator | integrations | low | sanitized response + logs/Sentry | route tests/log review |

### Feature flags / cutover

No feature flag general. Cutover por route classification. Scheduler-only routes require service guard deployed together with scheduler config.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | revert helper/capability/grants | <15 min | sí |
| Slice 3 | revert route gates | <15 min | sí |
| Slice 4 | restore previous scheduler config / revert deploy | <30 min | sí |
| Slice 5 | docs/status revert if needed | <5 min | sí |

### Production verification sequence

1. Staging route smoke for scheduler-only token and manual-admin-run capability.
2. Staging scheduled run executes successfully.
3. Deploy prod with scheduler config.
4. Observe next scheduled runs for economic indicators/FX/Nubox where applicable.
5. Confirm manual run without capability returns 403.

### Out-of-band coordination required

Ops owner sign-off for scheduler config changes and any Cloud Scheduler/Vercel cron migration.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Every Finance sync/materializer route in scope is classified and documented.
- [ ] Scheduler-only routes require service/cron guard or are moved fully to ops-worker.
- [ ] Manual-admin-run routes require capability + actor + reason + scoped inputs.
- [ ] Capabilities/grants exist with coverage tests where manual run remains.
- [ ] Staging scheduled/manual smoke proves no cron regression.
- [ ] Audit F9 and F2/F3 statuses updated where applicable.

## Verification

- `pnpm test` focal access tests for affected routes.
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm docs:closure-check`
- Staging scheduler/manual-run smoke.
- Cloud Scheduler/Vercel/ops-worker logs for next run.

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md` actualizado con status Wave 3
- [ ] `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md` actualizado para F2/F3/F9 si cambian
- [ ] Architecture/source-sync docs updated if scheduler ownership changes

## Follow-ups

- F2: `/api/cron/dte-emission-retry` register/remove can be folded here if route inventory proves it belongs to Finance sync boundary; otherwise create a focused task.
- F3: Vercel cron migration for economic indicators/FX can be completed here if scope remains small; otherwise split.

## Open Questions

- ¿Qué routes deben quedar manual-run vs scheduler-only? Resolver con ops owner en Slice 1.
- ¿Existe ya un canonical scheduler-token helper que Finance debe reusear? Verificar antes de crear uno.
