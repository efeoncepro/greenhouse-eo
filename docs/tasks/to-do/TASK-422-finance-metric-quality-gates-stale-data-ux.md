# TASK-422 — Finance Metric Quality Gates Runtime + Stale Data UX (v2)

## Delta 2026-05-05 — pre-execution hardening (priority + execution order)

Re-priorización P2 → **P1** y reordenamiento de la cadena de ejecución del programa Finance Metric Registry.

### Por qué P1 (no P2)

`qualityGates` declarados sin enforcement runtime es **peor que no declararlos** — genera falsa confianza. Si TASK-419 (dashboard cutover) cierra sin TASK-422, queda activo el bug raíz que motivó el programa: "0 signals = todo bien O cron caído, no sabes cuál". Anti-pattern Pilar 3 Resilience canónico ("UI shows $0 for both 'no data' and 'data fetch failed'").

Además, si TASK-420 (Cost Intelligence + cross-module consumers Agency/Org 360/People/Home/Nexa) cablea el dashboard sin gates de freshness, después es **5× más caro retrofitearlo** — mismo error de TASK-265 → 407 que motivó pre-execution audit recalibrar densidad real.

### Orden canónico de ejecución revisado

```text
416 → 417 → 418 → 419 → 422 → 420 → 421 → 423 → 425 → 424 → 426 → 427
                          ↑
                          422 entra ANTES de 420 (no después)
```

**422 entra ANTES de 420** porque:

1. Cierra el contract de honesty del dashboard antes que cross-module consumers lo hereden
2. TASK-419 ya declara la state machine canónica `<MetricKpiCard>` (Delta 2026-05-05) — 422 implementa los lifecycles `loading → fresh → stale` sin redefinir el contract
3. Cost Intelligence views (TASK-420) y Agency/Org 360/People/Home consumers heredan automáticamente la stale UX sin trabajo adicional

### Sinergia obligatoria con TASK-419 (state machine canónica)

`<MetricKpiCard>` declara 5 estados en TASK-419 Delta. TASK-422 implementa la transición `loading → fresh → stale` consumiendo:

- `isMetricFresh(metricId, servingRow)` → mapea a `state: 'fresh' | 'stale'`
- `areRequiredInputsReady(metricId, period)` → mapea a `state: 'failed'` si quality gate roto + freshness SLA excedido > 2×

**NO** redefinir nuevos states; consumir el enum `METRIC_KPI_CARD_STATES` declarado en TASK-419.

### Sinergia con TASK-425 (DAG runtime cascade)

TASK-425 implementa `recomputing` en el mismo state machine. La precedencia ya declarada en TASK-419 Delta:

```text
recomputing > stale > failed > fresh > loading
```

Cuando ambos `stale` (freshness excedido) y `recomputing` (cascade in progress) son true, prevalece `recomputing` — es transición que va a cerrar el stale al completar.

### Reliability signal canónico

Agregar al scope (no estaba explícito en spec original): `finance.metrics.stale_count` (kind=`drift`, severity=`warning` si count>0, `error` si > 5 métricas stale simultáneamente). Subsystem rollup: `Finance Data Quality`. Visible en `/admin/operations`.

### Acceptance criteria adicionales

- [ ] Priority actualizado a P1 en `docs/tasks/README.md`
- [ ] `<MetricKpiCard>` consume `METRIC_KPI_CARD_STATES` declarado en TASK-419 (NO redefine)
- [ ] Reliability signal `finance.metrics.stale_count` registrada en `RELIABILITY_REGISTRY` con domain `finance`
- [ ] Endpoint `/api/finance/intelligence/health` retorna shape compatible con `Platform Health V1` contract (TASK-672)

## Status

- Lifecycle: `to-do`
- Priority: `P1` (re-priorizado desde P2 por Delta 2026-05-05)
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417, TASK-418, TASK-419`
- Branch: `task/TASK-422-finance-metric-quality-gates-stale-data-ux`

## Summary

Activar runtime enforcement de `qualityGates` declaradas en el registry: el signal engine omite señales cuando dependencias no están materializadas o cuando la data supera su freshness SLA, y el dashboard muestra estado stale contractualizado (banner, opacidad, o "datos en refresh") en vez de ocultar silenciosamente. Cierra un gap visible de la v1 donde "0 signals" podía ser correcta o podía ser síntoma de un cron caído.

## Why This Task Exists

v1 del registry declara quality gates pero no hace nada con ellos en runtime. El resultado es ambigüedad: si `client_economics` no materializó por un fallo de cron, el dashboard muestra KPIs en cero sin indicación y el signal engine produce 0 signals (que el usuario interpreta como "todo bien") aunque el estado real sea "no sabemos". Sin contractualizar stale data UX, cada superficie improvisa.

## Goal

- Signal engine skip de métricas con `qualityGates.requiredInputs` no satisfechas; skip logged para observabilidad (Ops Health)
- Signal engine skip de métricas con freshness SLA excedido
- Dashboard: cada KPI muestra estado stale cuando `servingSource.freshnessSlaHours` excedido (banner sutil, ícono warning)
- Endpoint `/api/finance/intelligence/health` expone freshness status per-metric
- Contrato formal "stale data UX" documentado en `GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §11 (debt #5: stale data UX contract)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — freshness signaling

Reglas obligatorias:

- Stale state NO oculta el valor (confunde usuario); muestra con marca visual + tooltip explicativo
- Signal engine no emite "false empty state" cuando hay deps rotas
- Ops Health muestra cuáles métricas están stale

## Dependencies & Impact

### Depends on

- TASK-416, TASK-417, TASK-418, TASK-419

### Blocks / Impacts

- Reduce falsos positivos / negativos en alertas financieras
- Mejora confianza del usuario en el dashboard

### Files owned

- `src/lib/finance/metric-registry/quality.ts` — primitivas para evaluar quality gates
- `src/lib/finance/ai/anomaly-detector.ts` — integración de skip
- `src/app/api/finance/intelligence/health/route.ts` (nuevo)
- `src/components/greenhouse/MetricKpiCard.tsx` — renderizado de stale state
- `src/views/greenhouse/admin/OpsHealthView.tsx` — panel de métricas stale

## Current Repo State

### Already exists (tras TASK-418)

- Signal engine lee detection config del registry pero no evalúa quality gates

### Gap

- Stale data pasa silenciosa
- Ops Health no visibiliza freshness financiero

## Scope

### Slice 1 — Quality primitives

- `isMetricFresh(metricId, servingRow): boolean`
- `areRequiredInputsReady(metricId, period): boolean`
- Test unit cubriendo edge cases

### Slice 2 — Signal engine integration

- `anomaly-detector.ts` llama primitivas antes de evaluar detection
- Skip genera entrada en outbox `finance.ai_signals.skipped` con razón

### Slice 3 — Dashboard stale UX

- `MetricKpiCard` acepta `freshness` y renderiza ícono warning + tooltip cuando stale
- Threshold: si `lastUpdated` > `freshnessSlaHours` → stale

### Slice 4 — Health endpoint + Ops Health surface

- GET `/api/finance/intelligence/health` retorna array de métricas con status fresh/stale/missing
- Panel en Admin > Ops Health enumera métricas stale con link al runbook

## Out of Scope

- Per-scope thresholds → TASK-423
- Reactive propagation del DAG → TASK-425

## Acceptance Criteria

- [ ] Signal engine documentadamente skip métricas con quality gates no satisfechas
- [ ] Dashboard muestra stale state con pattern consistente
- [ ] Ops Health visibiliza métricas financieras stale
- [ ] Contrato stale UX documentado en spec
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- Deliberadamente bloquear materialization de `client_economics` para un período y verificar:
  - Dashboard muestra stale banner en KPIs afectados
  - Signal engine NO emite signals falsamente normales
  - Ops Health lista los afectados

## Closing Protocol

- [ ] Delta en spec con stale UX contract documentado
- [ ] Lifecycle + carpeta sincronizados
- [ ] Runbook en `docs/documentation/finance/` para responder a alertas de stale

## Follow-ups

- TASK-425 runtime DAG propagation automatiza recovery
