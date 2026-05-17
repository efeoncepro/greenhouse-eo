# Greenhouse Metrics Index

> **Índice maestro** de specs canonicales de métricas críticas. Equivalente al `DECISIONS_INDEX.md` para métricas. Cuando un agente necesita entender, modificar o consumir una métrica, **lee primero el spec canonical referenciado acá** — no Contrato + Engine doc + código + tasks por separado.
>
> **Pattern canonical**: `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`. **Ownership boundary**: `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`.

---

## Métricas ICO (Delivery)

### Cluster A — Quality core (per-task, bonificaciones)

| Métrica | Spec canonical | Helper canonical | Agregado registry | Writeback Notion | Status spec |
|---|---|---|---|---|---|
| **RpA** (Rounds per Asset) | [RPA_V1.md](RPA_V1.md) | `src/lib/notion-metrics/calculate-rpa.ts` (TASK-901 Slice 1, pending) | `metric-registry.ts:166-193` | `not_implemented` → TASK-901 V1 | Accepted 2026-05-17 |
| **FTR** (First-Time Right) | [FTR_V1.md](FTR_V1.md) | `src/lib/notion-metrics/calculate-ftr.ts` (TASK-909 Slice 1, pending) | `metric-registry.ts:225-255` | `not_implemented` → TASK-903 (futura) | Accepted 2026-05-17 |

### Cluster B — Delivery compliance (compromiso vs benchmark)

| Métrica | Spec canonical | Helper canonical | Agregado registry | Writeback Notion | Status spec |
|---|---|---|---|---|---|
| **OTD%** (On-Time Delivery — promise compliance) | [OTD_V1.md](OTD_V1.md) | NO existe TS standalone (TASK-902 futura) | `metric-registry.ts:194-224` | `not_implemented` → TASK-902 (futura) | Accepted 2026-05-17 |
| **CT SLO%** (% within industry benchmark) | [CT_SLO_PCT_V1.md](CT_SLO_PCT_V1.md) | `src/lib/notion-metrics/cycle-time-slo-config.ts` (TASK-908 Slice 0/5, pending) | TASK-908 Slice 5 agrega | `not_implemented` → TASK derivada futura | Accepted 2026-05-17 |
| **Cumplimiento** (dual: per-task audit + alias agregado OTD) | [CUMPLIMIENTO_V1.md](CUMPLIMIENTO_V1.md) | NO TS — sync read-only Notion property | NO agregado dedicado — alias narrative de OTD | `N.A.` (per-task = sync from Notion; aggregate = alias OTD) | Accepted 2026-05-17 |

### Cluster C — Velocidad operativa (Cycle Time + Throughput + flow)

| Métrica | Spec canonical | Helper canonical | Agregado registry | Writeback Notion | Status spec |
|---|---|---|---|---|---|
| **Cycle Time** (Tiempo de ciclo) | [CYCLE_TIME_V1.md](CYCLE_TIME_V1.md) | `src/lib/notion-metrics/calculate-cycle-time.ts` (TASK-908 Slice 1, pending) | `metric-registry.ts:256-282` | `not_implemented` → TASK-908 follow-up futuro | Accepted 2026-05-17 |
| **Cycle Time Variance** (Varianza/Previsibilidad) | [CYCLE_TIME_VARIANCE_V1.md](CYCLE_TIME_VARIANCE_V1.md) | NO TS — agregado puro (population stat) | `metric-registry.ts:283-308` | `N.A.` (population stat) | Accepted 2026-05-17 |
| **Throughput** (Volumen mensual) | [THROUGHPUT_V1.md](THROUGHPUT_V1.md) | NO TS — agregado puro | `metric-registry.ts:310-336` | `N.A.` (agregado per-período) | Accepted 2026-05-17 |
| **Pipeline Velocity** (ratio completed/(completed+open) — pileup detector) | [PIPELINE_VELOCITY_V1.md](PIPELINE_VELOCITY_V1.md) | NO TS — agregado puro | `metric-registry.ts:338-367` | `N.A.` (agregado per-período) | Accepted 2026-05-17 |

### Cluster D — Health / saturation operativa

| Métrica | Spec canonical | Helper canonical | Agregado registry | Writeback Notion | Status spec |
|---|---|---|---|---|---|
| **CSC Distribution** (composición pipeline por fase CSC) | [CSC_DISTRIBUTION_V1.md](CSC_DISTRIBUTION_V1.md) | NO TS — `TASK_STATUS_TO_CSC` lookup | `metric-registry.ts:368-397` | `N.A.` (agregado distribution) | Accepted 2026-05-17 |
| **Stuck Assets** (count tareas sin movimiento ≥72h) | [STUCK_ASSETS_V1.md](STUCK_ASSETS_V1.md) | NO TS — flag `is_stuck` materializado | `metric-registry.ts:398-424` | `not_implemented` → TASK derivada futura | Accepted 2026-05-17 |
| **Stuck %** (% stuck normalizado por backlog) | [STUCK_ASSET_PCT_V1.md](STUCK_ASSET_PCT_V1.md) | NO TS — derivado de Stuck Assets | `metric-registry.ts:425-455` | `N.A.` | Accepted 2026-05-17 |
| **OCF** (Overdue Carried Forward — saturation acumulada períodos anteriores) | [OCF_V1.md](OCF_V1.md) | NO TS — agregado puro | `metric-registry.ts:456-482` | `N.A.` | Accepted 2026-05-17 |

### Cluster E — Revenue Enabled palancas (narrative-level)

| Métrica | Spec canonical | Helper canonical | Agregado registry | Writeback Notion | Status spec |
|---|---|---|---|---|---|
| **Iteration Velocity** (Revenue Enabled palanca 2) | [ITERATION_VELOCITY_V1.md](ITERATION_VELOCITY_V1.md) | `src/lib/ico-engine/iteration-velocity.ts` (IMPLEMENTED 199 líneas, TASK-219) | NO en registry (narrative-level) | `N.A.` (narrative-level) | Accepted 2026-05-17 |
| **BCS** (Brief Clarity Score — habilita TTM observed) | [BCS_V1.md](BCS_V1.md) | `src/lib/ico-engine/brief-clarity.ts` (IMPLEMENTED 412 líneas, infrastructure-ready) | NO en registry (project-level) | `not_implemented` → TASK-910 futura activa AI backend + writeback | Accepted 2026-05-17 |
| **TTM** (Time-to-Market — Revenue Enabled palanca 1 Early Launch Advantage) | [TTM_V1.md](TTM_V1.md) | `src/lib/ico-engine/time-to-market.ts` (IMPLEMENTED, TASK-218) + `src/lib/campaigns/campaign-metrics.ts` | NO en registry (per-campaign) | `not_implemented` → TASK derivada futura post BCS backend activo | Accepted 2026-05-17 |

**Total**: 14 métricas críticas canonical, **TODAS con spec V1 Accepted 2026-05-17**.

---

## Estados de writeback canonical (TASK-901 progressive pattern)

Conforme la migración progresiva avanza, cada métrica transita por estos estados:

| Estado | Significado | Pre-condiciones para avanzar |
|---|---|---|
| `not_implemented` | No hay writeback canonical. Notion property `[GH] <Metric>` no existe. Fórmula vive en Notion property formula original. | Crear task de writeback + ship Slice 0-1 |
| `shadow_mode` | Greenhouse computa + LOG-only. Notion property `[GH] <Metric>` existe pero NO se actualiza desde Greenhouse. Reliability signal de paridad activo. | 7 días verde signal `notion.metrics.shadow_paridad_<metric>` |
| `enabled` | Greenhouse computa + writeback activo. Notion property `[GH] <Metric>` se actualiza desde Greenhouse via bulk PATCH. | Operación normal canonical |
| `legacy_deprecated` | Post-30d steady state, formula Notion original se deprecia en templates nuevos (sigue como fallback histórico en tareas legacy). | Operación normal canonical |
| `N.A.` | Métrica per-campaign / agregado per-período / project-level sin equivalente per-task Notion → no aplica writeback | — |

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

### 2026-05-17 (cont.) — 12 specs nuevos canonical creados

- Sesión doc-only extendida creó las 12 specs pendientes:
  - **Cluster B**: OTD_V1, CT_SLO_PCT_V1, CUMPLIMIENTO_V1
  - **Cluster C**: CYCLE_TIME_V1, CYCLE_TIME_VARIANCE_V1, THROUGHPUT_V1, PIPELINE_VELOCITY_V1
  - **Cluster D**: CSC_DISTRIBUTION_V1, STUCK_ASSETS_V1, STUCK_ASSET_PCT_V1, OCF_V1
  - **Cluster E**: ITERATION_VELOCITY_V1, BCS_V1, TTM_V1
- **14 specs canonical TOTAL** (RPA + FTR creados antes en sesión + 12 nuevos).
- Cero código runtime tocado — todos los 14 specs documentan código existente + decisiones canonical 2026-05-17.
- TASK-909 reshape: ya NO crea `THROUGHPUT_V1.md` ni `PIPELINE_VELOCITY_V1.md` (ya existen) — solo implementa helper `calculateFtr` + Engine doc pointer Delta.

### 2026-05-17 — Índice creado + primeros 2 specs

- Pattern canonical formalizado en sesión 2026-05-17 post deep-dive boundary ownership + FTR drift.
- 2 specs creados V1 simultáneamente: RPA_V1.md + FTR_V1.md.
- 12 specs pendientes documentados con status `Pending` para migración progresiva.
- Ordering canonical de creación: a medida que cada TASK toca la métrica, el primer slice de la TASK crea el spec antes de tocar código.
