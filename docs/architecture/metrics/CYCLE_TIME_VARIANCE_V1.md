# `CycleTimeVariance` — Cycle Time Variance — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | Cycle Time Variance (Varianza del ciclo) |
| Metric ID (registry) | `cycle_time_variance` |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive |
| Last updated | 2026-05-17 |
| Writeback state | `N.A.` (agregado per-período, no aplica writeback per-task) |
| Cross-refs | CYCLE_TIME_V1 (consume cycle_time_days) · CT_SLO_PCT_V1 · OTD_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**Cycle Time Variance** mide **qué tan predecible es el tiempo de ciclo** del equipo. Es la desviación estándar del `cycle_time_days` per-tarea dentro del período. Responde la pregunta operativa: **"¿podemos prometer plazos con confianza?"**

- `Varianza baja` (e.g. SD ≤3 días) → equipo entrega con plazos consistentes → puede comprometerse a deadlines ajustados con confianza
- `Varianza alta` (e.g. SD ≥7 días) → entregas inconsistentes (algunas rápidas, otras lentas) → operador debe agregar buffers grandes para cumplir compromisos
- **Cycle Time bajo + Varianza alta** = "rápido en promedio pero impredecible" — peor escenario operativo para planning vs cliente
- **Cycle Time alto + Varianza baja** = "lento pero predecible" — operador puede al menos planear correctamente

**A quién le importa**:

- **Management**: indicador de madurez del proceso — alta varianza = procesos no estandarizados, dependencias inestables, capacity issues
- **Sales / Comercial**: input para promesas operativas a clientes — alta varianza = vender con buffers conservadores
- **Equipo creativo**: input para retrospectivas — investigar qué tareas explotan el promedio (outliers)
- **Cliente** (vía CVR): mide la **confiabilidad** de Globe vs benchmark — agencias maduras tienen SD baja

---

## 2. Fórmula canonical

### 2.1 Per-período (agregado)

```text
CycleTimeVariance(period, scope) = STDDEV(cycle_time_days)
                                    para todas las tareas completadas en el período
                                    dentro del scope (member / space / cliente)
                                    excluyendo Bloqueado/Detenido/archivadas/canceladas
```

Es métrica **puramente agregada** — NO existe `variance per-task` (un solo número no tiene varianza con sí mismo). Vive a nivel de población (member-month, space-month, cliente-month).

### 2.2 Agregado canonical SQL

```sql
-- src/lib/ico-engine/metric-registry.ts:283-308
ROUND(STDDEV(cycle_time_days), 1) AS cycle_time_variance_days
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND <CANONICAL_COMPLETED_TASK_SQL>
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

PG STDDEV usa **sample standard deviation** (`STDDEV_SAMP`) por default — divisor `n-1`. Para `n=1` retorna `NULL` (no se puede calcular SD con 1 sample).

### 2.3 Versionado de fórmula

Hereda formula version de Cycle Time (`CYCLE_TIME_FORMULA_VERSION = 'cycle_time_v1.0'`). Si Cycle Time bumpea a v2.0 (e.g. cambio en cómo se computa días bloqueados), Variance hereda automático sin bump propio.

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `cycle_time_days` per-task | `v_tasks_enriched.cycle_time_days` materializado (post TASK-908 Slice 4) | derivado | mismo source que `cycle_time` agregado |
| `task.completed_at` (filtro) | `greenhouse_delivery.tasks.completed_at` | primitivo | filtro: solo tareas completadas entran |
| `task.task_status` (filtro) | `greenhouse_delivery.tasks.task_status` | primitivo | filtro: excluir EXCLUDED_FROM_METRICS_STATUSES |

### 3.1 Sample size requirement

`STDDEV` requiere mínimo **2 tareas** para retornar valor. Con `n=1` retorna NULL.

`metric-registry.ts` declara `trust.healthyMinSampleSize = 10` — significa que con `n < 10` la SD computada es **estadísticamente débil** (high standard error). Consumer UI debe respetar trust signal y warning/oculto cuando sample insuficiente.

### 3.2 Boundary canonical

Sin boundary específico — Variance es derivada pura de Cycle Time. Hereda boundary de `CYCLE_TIME_V1.md` §3.1.

---

## 4. Helper canonical (per-task compute)

**N.A.** Cycle Time Variance NO tiene helper per-task — es métrica puramente agregada (population statistic).

Si emerge necesidad de exponer variance computada desde TS (e.g. para projection comparison o sensitivity analysis), V2 puede crear helper `computeCycleTimeVariance(cycleTimes: number[]) → number` server-only. V1 NO — el agregado SQL del registry es suficiente.

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `cycle_time_variance` (STDDEV days) per-member-month | `src/lib/ico-engine/metric-registry.ts:283-308` | Implemented |

### 5.1 SQL canonical

Ver §2.2 arriba.

### 5.2 Denominador canonical (qué tareas entran al cálculo de SD)

- **Solo tareas completadas** (variance requiere CT computado) — `CANONICAL_COMPLETED_TASK_SQL`
- **Excluye Bloqueado/Detenido/archivadas/canceladas** — `EXCLUDED_FROM_METRICS_STATUSES`
- **Excluye CT NULL** (tareas sin completedAt o sin start válido)
- Mismo denominador exacto que `cycle_time` agregado — coherencia cross-métrica.

### 5.3 Granularidades soportadas

- `monthly` per member (default — health del proceso individual)
- `monthly` per space (Pulse — health del proceso del cliente)
- `monthly` per cliente (CVR — predictibilidad reportada al cliente)
- `weekly` (Pulse trends, pero solo confiable con n≥10/week)

---

## 6. Semántica de casos edge

| Escenario | Variance resultado |
|---|---|
| Member con `n=0` tareas completadas | NULL — sin datos, UI muestra `—` |
| Member con `n=1` tarea completada | NULL — STDDEV requiere n≥2 |
| Member con `n=2-9` tareas | Valor computado pero `trust.confidence_level='low'` por sample insuficiente — UI warning |
| Member con `n≥10` tareas | Valor confiable, UI sin warning |
| Outliers (1 tarea de 30 días vs 9 de 5 días) | Variance alta por outlier — expone el outlier visualmente (no es bug — es feature) |
| Todas las tareas con mismo CT (e.g. exactly 7 días cada una) | Variance = 0 — entregas perfectamente consistentes (raro pero posible) |
| Mezcla CT canonical + CT fallback_created_at (pre-TASK-908) | Variance computada igual, pero indicador en metadata |

### 6.1 Outliers y CT Variance

Variance es sensitive a outliers (1 tarea de 60 días infla mucho la SD de un set de 10). Esto es **comportamiento canonical** — Variance ES sobre detectar inconsistencia. Si operador quiere métrica robusta a outliers, V2 puede agregar `cycle_time_iqr` (Inter-Quartile Range) o `cycle_time_mad` (Median Absolute Deviation).

### 6.2 Variance vs Coefficient of Variation (CV)

V1 reporta SD absoluta en días. NO normaliza por mean (Coefficient of Variation `CV = SD / mean`). Justificación: operador necesita "cuántos días varían" para planning, NO "varían 35% del promedio".

V2 puede exponer CV en paralelo si emerge demanda comparativa cross-team (e.g. comparar team con CT promedio 5d + SD 2d vs team con CT promedio 20d + SD 8d → CV similar 40% aunque SD absoluta muy distinta).

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | n ≥ 10, SD computada confiable | Variance + threshold zone |
| `low_confidence` | 2 ≤ n < 10 | Variance + warning visual |
| `unavailable` | n < 2 (no se puede computar SD) | `—` |

`trust.healthyMinSampleSize = 10` enforced en `metric-registry.ts:307`. Consumer respeta.

---

## 8. Threshold canonical + benchmark

| Threshold | Min días | Max días | Severidad UI |
|---|---|---|---|
| Optimal | 0 | 3 | success (verde) |
| Attention | 3 | 7 | warning (amber) |
| Critical | 7 | ∞ | error (rojo) |

**Lower is better** (es métrica negativa — menos varianza = más predecible).

### 8.1 Benchmark interno

Greenhouse operating policy: target SD ≤ 3 días para sentirse "predecible". Agencias maduras alcanzan SD ≤ 2 días. SD > 7 indica proceso roto o capacity issues estructurales.

### 8.2 Calibración per tipo de pieza (futuro)

Out of scope V1. Hipótesis: videos largos pueden tener SD mayor legítima (más variabilidad estructural). Calibración per tipo queda como TASK derivada.

---

## 9. Writeback a Notion

**N.A.** Cycle Time Variance es agregado per-período sin equivalente per-task Notion. NO aplica writeback.

Consumers (Pulse, scorecards, Person 360) leen el agregado del registry SQL directamente.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado documentando el agregado existente en `metric-registry.ts:283-308`.
- **Decisión canonical**: Variance hereda boundary y denominador de Cycle Time (no tiene reglas propias) — coherencia cross-métrica.
- **NO crear helper TS** — es métrica puramente agregada. Helper queda como out of scope V2.
- **Trust threshold canonical**: n ≥ 10 para `valid`, 2 ≤ n < 10 para `low_confidence`. Reflect existente `trust.healthyMinSampleSize = 10`.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [CYCLE_TIME_V1.md](CYCLE_TIME_V1.md) — métrica base que Variance agrega
  - [CT_SLO_PCT_V1.md](CT_SLO_PCT_V1.md) — métrica hermana que usa mismo cycle_time_days
  - [OTD_V1.md](OTD_V1.md) — métrica complementaria (compliance vs predictability)
- **Tasks**: TASK-908 (afecta Variance vía cambio fórmula cycle_time_days; recompute downstream automático post-rematerialization)
- **Código**:
  - Agregado: `src/lib/ico-engine/metric-registry.ts:283-308`
  - Source: `v_tasks_enriched.cycle_time_days` (materializado)
- **Docs reference**:
  - Engine doc `Greenhouse_ICO_Engine_v1.md` líneas 950-995 (Variance + CT secciones)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Coefficient of Variation (CV)** como métrica complementaria normalizada: V1 expone SD absoluta. V2 si emerge demanda cross-team comparison.
- **IQR / MAD** (alternativas robustas a outliers): V1 usa STDDEV estándar. V2 si emerge necesidad de métrica robusta cuando outliers contaminen.
- **Variance per fase CSC**: V1 expone solo total. V2 podría desglosar variance por Briefing/Producción/Cambios/Entrega.
- **Helper TS para projection / sensitivity analysis**: V1 NO. Si emerge consumer real (e.g. simulator "qué pasa con SD si remove top-2 outliers"), V2 helper.
- **Per-cliente threshold**: V1 uniforme. V2 si cliente enterprise pide SLA SD específico.
