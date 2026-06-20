# TASK-1190 — Cost Intelligence recovery + Operational P&L health gate

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `sync`
- Epic: `none`
- Status real: `Complete 2026-06-20`
- Rank: `1`
- Domain: `finance|cost-intelligence|management-accounting|reliability`
- Blocked by: `none`
- Branch: `develop` (operador pidio ejecucion inmediata; worktree multi-agente activo)
- Legacy ID: `none`
- GitHub Issue: `ISSUE-102`

## Summary

Cierra los hallazgos F7/F8 de la auditoría Finance 2026-06-20: recuperar los handlers reactivos históricos de `commercial_cost_attribution`, completar la cadena junio 2026 (`client_labor_cost_allocation_consolidated` → `commercial_cost_attribution` → `operational_pl_snapshots`) y agregar un health gate para que Operational P&L no vuelva a publicar margen canónico cuando falta costo.

## Why This Task Exists

La auditoría de Finance detectó que Transactional Finance estaba sano, pero Management Accounting / Cost Intelligence no: `commercial_cost_attribution` conservaba handlers `failed` por `infra.db_privilege` y junio 2026 mostraba revenue con costo `0`, lo que infla margen y contamina dashboards, Account 360, Home/Nexa y cualquier insight financiero basado en `operational_pl`.

El DDL runtime ya fue removido y la migración gobernada existe, pero la task no está completa hasta que la evidencia runtime pruebe:

- handler health recuperado o neutralizado con replay/recovery trazable;
- junio tiene labor allocation y snapshots rematerializados, o queda marcado como degradado de forma honesta;
- Operational P&L no se presenta como baseline canónico cuando falta cost attribution.

## Goal

- `commercial_cost_attribution:*` deja de quedar en `failed` por `infra.db_privilege` después del recovery.
- Mayo y junio 2026 quedan rematerializados con evidencia DB; junio no puede quedar como margen canónico con costo `0` si falta labor allocation.
- Existe un health gate/read signal que degrada Operational P&L cuando hay revenue pero falta costo atribuible para el período.
- La auditoría Finance, arquitectura, handoff y task lifecycle reflejan el estado real final.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- NUNCA ocultar costo faltante como `0` si hay revenue o actividad del período. Eso es margen falso.
- NUNCA devolver privilegios `CREATE` runtime sobre `greenhouse_serving` para arreglar el síntoma; el DDL vive en migraciones gobernadas.
- NUNCA leer `client_labor_cost_allocation` cruda para attribution comercial; usar `client_labor_cost_allocation_consolidated`.
- NUNCA marcar junio 2026 como baseline de margen si la fuente upstream de labor allocation sigue vacía.
- Todo recovery mutante debe ser allowlisted, auditable y verificable con SQL antes/después.

## Normative Docs

- `docs/tasks/complete/TASK-279-labor-cost-attribution-client-economics-pipeline.md`
- `docs/tasks/complete/TASK-777-canonical-expense-distribution-and-shared-cost-pools.md`
- `docs/tasks/complete/TASK-801-engagement-primitive-services-extension.md`
- `docs/tasks/complete/TASK-893-payroll-participation-window.md`

## Dependencies & Impact

### Depends on

- Migración `migrations/20260620141000000_commercial-cost-attribution-governed-ddl.sql` aplicada.
- `src/lib/commercial-cost-attribution/store.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/lib/sync/projections/commercial-cost-attribution.ts`
- `src/lib/sync/projections/operational-pl.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `greenhouse_sync.handler_health`
- `greenhouse_serving.client_labor_cost_allocation_consolidated`
- `greenhouse_serving.commercial_cost_attribution`
- `greenhouse_serving.operational_pl_snapshots`

### Blocks / Impacts

- Finance / Cost Intelligence dashboards.
- Account 360 economics facets.
- Home/Nexa loaders that consume `operational_pl_snapshots`.
- Future Fiscal / Management Accounting baselines.
- Finance audit closure for F7/F8.

### Files owned

- `src/lib/commercial-cost-attribution/**`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/reliability/queries/**`
- `src/lib/reliability/get-reliability-overview.ts`
- `scripts/finance/**` or `scripts/cost-intelligence/**` for recovery/health tooling
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `ensureCommercialCostAttributionSchema()` ya valida la tabla con `SELECT 1` y no ejecuta DDL.
- Mayo 2026 tiene `commercial_cost_attribution` materializado con 3 rows y costo real.
- `materializeOperationalPl()` rematerializa `commercial_cost_attribution` antes de `operational_pl`.
- `handler_health` persiste el estado por handler reactivo.
- `reactive:backfill` puede drenar backlog normal de `cost_intelligence`.

### Gap

- `handler_health` aún conserva handlers `commercial_cost_attribution:*` en `failed` por el error histórico de permisos.
- Junio 2026 no tiene rows en `client_labor_cost_allocation_consolidated`; por tanto `commercial_cost_attribution` queda sin filas y `operational_pl_snapshots` publica revenue con costo `0`.
- No hay health gate específico que marque Operational P&L como degradado cuando hay revenue pero falta cost attribution/labor allocation.
- El replay local con `replayFailedHandlers=true` se colgó previamente; se necesita recovery focal y verificable.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync` + `command` + `reader`
- Source of truth afectado: serving management accounting (`client_labor_cost_allocation_consolidated`, `commercial_cost_attribution`, `operational_pl_snapshots`) y handler state (`handler_health`)
- Consumidores afectados: Finance UI, Account 360, Home/Nexa, Reliability Overview, ops-worker reactive consumer
- Runtime target: `worker` + Cloud SQL dev/staging data

### Contract surface

- Contrato existente a respetar: `materializeCommercialCostAttributionForPeriod`, `materializeOperationalPl`, reactive projections `commercial_cost_attribution` y `operational_pl`, `handler_health` state machine.
- Contrato nuevo o modificado: recovery CLI/command focal para Cost Intelligence y reliability signal/read gate de Operational P&L degradado.
- Backward compatibility: `compatible`; sin cambio de schema destructivo esperado.
- Full API parity: `N/A — recovery/health interno`; si se expone command admin, debe usar capability fina existente o nueva con grant y test.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_sync.handler_health`, `greenhouse_serving.client_labor_cost_allocation_consolidated`, `greenhouse_serving.commercial_cost_attribution`, `greenhouse_serving.operational_pl_snapshots`.
- Invariantes que no se pueden romper:
  - Revenue con costo `0` solo es canónico si la fuente de costo existe y el costo real es `0`; si falta upstream, debe ser degraded.
  - `commercial_cost_attribution` consume la view consolidada, nunca la view cruda.
  - Handler recovery no borra evidencia histórica sin registrar transición/recovered count o explicación documental.
  - Mayo no debe regresar a costo `0`.
- Tenant/space boundary: management accounting interno; scopes `client`, `space`, `organization` derivan de snapshots existentes.
- Idempotency/concurrency: rematerialización por período re-runnable; recovery debe ser allowlisted por handler/período y seguro ante repetición.
- Audit/outbox/history: conservar `handler_health` / reactive logs / source_sync_runs cuando aplique; documentar cualquier reset explícito.

### Migration, backfill and rollout

- Migration posture: `none` esperado; si el health gate requiere tabla, debe ser additive y justificado.
- Default state: health gate activo/read-only; recovery focal manual.
- Backfill plan: mayo y junio 2026 allowlist; junio solo se rematerializa como canónico si labor allocation existe o se repara upstream.
- Rollback path: revert PR; para data, rematerializar el período desde el materializador anterior solo si el health gate prueba regresión.
- External coordination: ninguna externa; si junio requiere payroll/labor source correction fuera de repo, documentar bloqueo operacional con evidencia y no marcar goal completo.

### Security and access

- Auth/access gate: CLI local con perfil ops/runtime o endpoint admin existente; sin endpoint público nuevo por default.
- Sensitive data posture: finance + payroll/labor costs; no loggear PII ni montos por persona fuera de evidencia controlada.
- Error contract: errores canónicos/sanitizados; `captureWithDomain('finance')` donde aplique.
- Abuse/rate-limit posture: recovery scoped; no loop sin límite; batch/período allowlist.

### Runtime evidence

- Local checks: unit/focal tests para health gate/recovery, eslint focal, tsc si toca tipos.
- DB/runtime checks: queries read-only antes/después de `handler_health`, `client_labor_cost_allocation_consolidated`, `commercial_cost_attribution`, `operational_pl_snapshots`.
- Integration checks: `pnpm reactive:backfill --domain=cost_intelligence --dry-run` y/o recovery focal.
- Reliability signals/logs: nuevo/existente signal de P&L degraded + handler_health healthy/recovered.
- Production verification sequence: primero dev/staging DB; production solo con autorización explícita.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- auto-aprobado por instrucción explícita del operador: "arma task y ejecutala de inmediato" -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Runtime diagnosis + task registration

- Registrar esta task y snapshot DB actual de F7/F8.
- Confirmar si junio falla por falta upstream real, por query/materializer, o por cron/replay no ejecutado.

### Slice 2 — Recovery command / replay focal

- Implementar o usar un command focal para recuperar handlers `commercial_cost_attribution:*` fallidos, sin borrar evidencia a ciegas.
- Ejecutar recovery contra dev/staging con allowlist y verificar `handler_health`.

### Slice 3 — Operational P&L degraded health gate

- Agregar detector/read signal que marque períodos con revenue y costo `0` como degraded cuando falta labor allocation o cost attribution.
- Wire en Reliability Overview o registry canónico correspondiente.

### Slice 4 — Rematerialización mayo/junio

- Re-materializar mayo y junio 2026 con evidencia antes/después.
- Si junio no puede materializar costo porque falta upstream, dejarlo explícitamente degraded y abrir/fijar el source upstream dentro de esta task si el código lo permite.

### Slice 5 — Docs + closure

- Actualizar auditoría F7/F8, arquitectura y Handoff.
- Mover task a `complete/` solo si handler recovery + P&L health gate + mayo/junio quedan probados.

## Out of Scope

- Rediseñar todo Cost Intelligence o el modelo de allocation.
- Cambiar UI visible de Finance.
- Retenciones/PPM/F22 de TASK-1186.
- Mutaciones productivas sin autorización explícita.

## Detailed Spec

La solución mínima aceptable tiene dos carriles:

1. **Recovery/handler truth:** si el DDL fix ya está desplegado, los handlers históricos deben reintentarse o marcarse recovered de forma trazable. Un `failed` histórico persistente no puede seguir contaminando Ops Health.
2. **P&L truth:** `operational_pl_snapshots` debe distinguir costo real cero vs costo desconocido. Cuando hay revenue y la cadena de labor allocation/cost attribution está vacía, el periodo es degraded, no margen canónico.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 diagnosis antes de cualquier mutación.
- Slice 2 recovery antes de declarar F7 cerrado.
- Slice 3 health gate antes de declarar F8 cerrado.
- Slice 4 rematerialización después de confirmar o reparar el source upstream.
- Slice 5 cierre documental solo tras evidencia DB/runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Publicar margen falso por costo `0` | finance/cost-intelligence | high | health gate degraded cuando falta source upstream | Operational P&L degraded signal |
| Recovery borra evidencia de handlers fallidos | sync/reliability | medium | replay/transition trazable, no DELETE ciego | `handler_health`, transitions |
| Junio requiere source payroll no disponible | payroll/finance | medium | diagnosticar upstream; marcar degraded si no se puede reparar | labor allocation count |
| Rematerialización rompe mayo ya corregido | finance | low | SQL before/after + tests focales | `commercial_cost_attribution` rows/cost |

### Feature flags / cutover

- Sin flag para health gate read-only.
- Recovery es command manual allowlisted, no automático.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | Re-run materializer previo / restaurar handler state desde transition evidence si aplica | <30 min | parcial |
| Slice 3 | revert PR del detector | <10 min | sí |
| Slice 4 | rematerializar período con razón `rollback` usando materializer vigente | <30 min | sí |

### Production verification sequence

1. Dev/staging read-only snapshot F7/F8.
2. Recovery focal en dev/staging.
3. Re-materialización mayo/junio dev/staging.
4. Verificar health gate.
5. Solo con autorización: repetir en production o documentar pendiente.

### Out-of-band coordination required

No se requiere coordinación externa para el health gate ni para el recovery dev/staging. Si el diagnóstico prueba que junio 2026 no tiene fuente payroll/labor allocation suficiente en DB, el cierre operativo debe degradar el período y documentar explícitamente el bloqueo upstream; cualquier mutación productiva o reparación de fuente laboral queda sujeta a autorización del operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `handler_health` no conserva `commercial_cost_attribution:*` en `failed` por `infra.db_privilege`, o queda documentado como recovered/obsolete con transición auditable.
- [x] Mayo 2026 conserva `commercial_cost_attribution` y `operational_pl_snapshots` con costo > 0.
- [x] Junio 2026 queda con costo materializado > 0 o con degraded signal explícito que impide tratarlo como margen canónico.
- [x] Operational P&L health gate detecta revenue con costo `0` + source upstream faltante.
- [x] `pnpm task:lint --task TASK-1190`, checks focales y SQL before/after documentados.
- [x] Auditoría Finance F7/F8 actualizada con el estado final.

## Verification

- `pnpm task:lint --task TASK-1190` — `errors=0 warnings=0`.
- `pnpm ops:lint --changed` — `errors=0 warnings=0`.
- `pnpm vitest run src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/reliability/queries/operational-pl-cost-coverage-degraded.test.ts` — 7 tests passed.
- `pnpm tsc --noEmit` — 0 errors.
- `gtimeout 180s pnpm reactive:backfill --domain=cost_intelligence --replay-failed-handlers --max-iterations=1 --batch-size=25` — smoke ancho; procesó 25 events / 50 projections sin fail.
- `gtimeout 240s pnpm reactive:backfill --domain=cost_intelligence --replay-failed-handlers --max-iterations=3 --batch-size=100 --handler=<9 commercial_cost_attribution failed handlers>` — drenó 126 CCA events, 4 scopes coalesced, 0 failures.
- `pnpm pg:connect:shell` post-recovery:
  - `handler_health` CCA: `21` handlers `healthy`, `0` failed.
  - `outbox_reactive_log` CCA active dead letters: `0`.
  - mayo 2026 `commercial_cost_attribution`: `3` rows, `2,706,028.15` CLP loaded cost.
  - mayo 2026 `operational_pl_snapshots`: cada scope con `6,902,000.00` CLP revenue y `2,706,028.15` CLP cost.
  - junio 2026 `operational_pl_snapshots`: cada scope con `6,902,000.00` CLP revenue y `0` cost por falta upstream.
- Runtime health gate `finance.operational_pl.cost_coverage_degraded`: `severity=error`, `period_count=4`, períodos `2025-11, 2025-12, 2026-01, 2026-06`.

## Closing Protocol

- [x] `Lifecycle: complete` + mover a `docs/tasks/complete/`.
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados.
- [x] `Handoff.md` actualizado.
- [x] Auditoría Finance F7/F8 actualizada.
- [x] Arquitectura Cost Intelligence / Commercial Cost Attribution actualizada si cambia contrato.
- [x] Goal del hilo solo se marca complete si todos los criterios quedan probados con evidencia actual.

## Follow-ups

- El source upstream de junio queda degradado, no falso: no existe payroll period junio `approved/exported`, por eso `client_labor_cost_allocation_consolidated` no produce filas. La reparación de payroll/labor allocation de junio debe ocurrir en el flujo payroll/capacity normal antes de usar junio como baseline de margen.
