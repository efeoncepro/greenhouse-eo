# Greenhouse Metrics Index

> **Índice maestro** de specs canonicales de métricas críticas. Equivalente al `DECISIONS_INDEX.md` para métricas. Cuando un agente necesita entender, modificar o consumir una métrica, **lee primero el spec canonical referenciado acá** — no Contrato + Engine doc + código + tasks por separado.
>
> **Pattern canonical**: `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`. **Ownership boundary**: `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`.

---

## Métricas ICO (Delivery)

| Métrica | Spec canonical | Helper canonical | Agregado registry | Writeback Notion | Status spec |
|---|---|---|---|---|---|
| **RpA** (Rounds per Asset) | [RPA_V1.md](RPA_V1.md) | `src/lib/notion-metrics/calculate-rpa.ts` (TASK-901 Slice 1, pending) | `src/lib/ico-engine/metric-registry.ts:226-249` | `not_implemented` → TASK-901 V1 | Accepted 2026-05-17 |
| **FTR** (First-Time Right) | [FTR_V1.md](FTR_V1.md) | `src/lib/notion-metrics/calculate-ftr.ts` (TASK-909 Slice 1, pending) | `src/lib/ico-engine/metric-registry.ts:226-249` | `not_implemented` → TASK-903 (futura) | Accepted 2026-05-17 |
| **OTD%** (On-Time Delivery) | `OTD_V1.md` (pending) | inline en registry (per-task `performance_indicator_code`) | `src/lib/ico-engine/metric-registry.ts:202-206` | `not_implemented` → TASK-902 (futura) | Pending |
| **Cumplimiento** (dual meaning) | `CUMPLIMIENTO_V1.md` (pending) | `delivery_compliance` per-task (sync read-only) | NO agregado (audit signal per-task) | `not_implemented` → TASK-904 (futura) | Pending |
| **Cycle Time** | `CYCLE_TIME_V1.md` (pending) | `src/lib/notion-metrics/calculate-cycle-time.ts` (TASK-908 Slice 1, pending) | `src/lib/ico-engine/metric-registry.ts:257-282` (lee `cycle_time_days` materializado) | `not_implemented` → TASK-905+ (futura) | Pending |
| **CT SLO%** | `CT_SLO_PCT_V1.md` (pending) | shares CT helper (TASK-908 Slice 5, pending) | `metric-registry.ts` extensión TASK-908 Slice 5 | `not_implemented` → TASK-905+ (futura) | Pending |
| **Throughput** | `THROUGHPUT_V1.md` (pending) | inline en registry (no helper per-task) | `src/lib/ico-engine/metric-registry.ts:310-323` | `N.A.` (agregado per-período, no per-task) | Pending |
| **Pipeline Velocity** | `PIPELINE_VELOCITY_V1.md` (pending) | inline en registry (no helper per-task) | `src/lib/ico-engine/metric-registry.ts:338-367` | `N.A.` (agregado per-período, no per-task) | Pending |
| **Iteration Velocity** | `ITERATION_VELOCITY_V1.md` (pending) | `src/lib/ico-engine/iteration-velocity.ts` (helper standalone) | NO en registry hoy (TASK-219 policy) | `not_implemented` | Pending |
| **BCS** (Brief Clarity Score) | `BCS_V1.md` (pending) | `src/lib/ico-engine/brief-clarity.ts` (infrastructure-ready, data-empty) | `ico_engine.ai_metric_scores` (BQ) | `not_implemented` → TASK-910 (futura) | Pending |
| **TTM** (Time-to-Market) | `TTM_V1.md` (pending) | `src/lib/campaigns/campaign-metrics.ts` (per-campaign, no per-task) | per-campaign aggregate | `N.A.` (per-campaign, no per-task Notion) | Pending |

**Total**: 11 métricas críticas canonical. 2 specs creados V1 (RPA + FTR). 9 pendientes — se crean a medida que cada métrica se toca (strangler migration).

---

## Estados de writeback canonical (TASK-901 progressive pattern)

Conforme la migración progresiva avanza, cada métrica transita por estos estados:

| Estado | Significado | Pre-condiciones para avanzar |
|---|---|---|
| `not_implemented` | No hay writeback canonical. Notion property `[GH] <Metric>` no existe. Fórmula vive en Notion property formula original. | Crear task de writeback + ship Slice 0-1 |
| `shadow_mode` | Greenhouse computa + LOG-only. Notion property `[GH] <Metric>` existe pero NO se actualiza desde Greenhouse. Reliability signal de paridad activo. | 7 días verde signal `notion.metrics.shadow_paridad_<metric>` |
| `enabled` | Greenhouse computa + writeback activo. Notion property `[GH] <Metric>` se actualiza desde Greenhouse via bulk PATCH. | Operación normal canonical |
| `legacy_deprecated` | Post-30d steady state, formula Notion original se deprecia en templates nuevos (sigue como fallback histórico en tareas legacy). | Operación normal canonical |
| `N.A.` | Métrica per-campaign o per-período sin equivalente per-task Notion → no aplica writeback | — |

---

## Cross-refs

- **ADR pattern**: `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **ADR boundary**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
- **Template canonical**: [_TEMPLATE.md](_TEMPLATE.md)
- **Narrativa de negocio**: `../Contrato_Metricas_ICO_v1.md` (consume los specs, no los redefine)
- **Framework conceptual**: `../Greenhouse_ICO_Engine_v1.md` (consume los specs, no los redefine)
- **Runtime contract**: `src/lib/ico-engine/metric-registry.ts`
- **DECISIONS_INDEX**: `../DECISIONS_INDEX.md` entrada "1 métrica = 1 spec canonical pattern"

---

## Histórico

### 2026-05-17 — Índice creado

- Pattern canonical formalizado en sesión 2026-05-17 post deep-dive boundary ownership + FTR drift
- 2 specs creados V1 simultáneamente: RPA_V1.md + FTR_V1.md
- 9 specs pendientes documentados con status `Pending` para migración progresiva
- Ordering canonical de creación: a medida que cada TASK toca la métrica, el primer slice de la TASK crea el spec antes de tocar código
