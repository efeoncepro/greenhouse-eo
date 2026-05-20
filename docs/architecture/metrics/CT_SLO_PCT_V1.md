# `CtSloPct` — Cycle Time SLO Percentage — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | CT SLO% (% Cycle Time dentro de SLO industria) |
| Metric ID (registry) | `cycle_time_slo_pct` (TASK-908 Slice 5 lo agrega — pending) |
| Spec version | V1 |
| Status | Accepted (canonical declared; runtime implementation pending TASK-908 Slice 5) |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive (separación canonical de OTD%) |
| Last updated | 2026-05-17 |
| Writeback state | `not_implemented` (V1 agregado SQL solo; writeback per-task no priorizado V1) |
| Cross-refs | OTD_V1 (métrica hermana — distinta semántica) · CYCLE_TIME_V1 (consume cycle_time_days) · TASK-908 (Slice 5 implementa) · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**CT SLO% (Cycle Time SLO Percentage)** mide qué porcentaje de tareas completadas en el período cerraron **dentro del threshold de tiempo de ciclo benchmark de industria** (default `≤14.2 días`). Es la lectura canonical de **competitive benchmark** del equipo — ¿somos competitivos vs estándar de mercado en velocidad operativa absoluta?

Es la respuesta a la pregunta: **"¿Nuestro tiempo de ciclo es competitivo vs industria?"** — independiente de qué deadline prometimos al cliente.

**A quién le importa**:

- **Pitch comercial**: claim "Globe opera dentro del benchmark de industria" — CT SLO% es el número que respalda esa narrativa
- **Management**: indicador de eficiencia operativa absoluta — independiente de si los deadlines acordados eran realistas o no
- **Producto / Capacity planning**: input para sizing de equipos — si CT SLO% baja sostenidamente, capacity insuficiente o proceso degradado
- **Cliente** (vía CVR): mide la velocidad absoluta de Globe vs alternativas de mercado — separado de cumplimiento del compromiso individual

---

## 2. Fórmula canonical

### 2.1 Per-task

Cada tarea completada se clasifica:

- `within_slo`: `cycle_time_days ≤ SLO_THRESHOLD` (default 14.2)
- `above_slo`: `cycle_time_days > SLO_THRESHOLD`

### 2.2 Agregado canonical (per-member per-month)

```sql
-- TASK-908 Slice 5 agregará a src/lib/ico-engine/metric-registry.ts
ROUND(
  100.0 * COUNT(*) FILTER (WHERE cycle_time_days <= 14.2)
       / NULLIF(COUNT(*) FILTER (WHERE <CANONICAL_COMPLETED_TASK_SQL>), 0),
  1
) AS cycle_time_slo_pct
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

### 2.3 Threshold configurable per tipo de pieza (futuro V2)

V1 usa threshold uniforme `14.2 días`. Helper `getSLOThreshold(taskType?)` (TASK-908 Slice 5) preparado para retornar threshold per tipo de pieza si calibrado, sino default `14.2`. V2 puede activar calibración:

- video largo → 21d
- sitio web / landing → 28d
- estático / banner → 7d
- GIF → 5d

V1 NO activa calibración — todos comparados vs `14.2` uniforme.

### 2.4 Versionado de fórmula

`CT_SLO_PCT_FORMULA_VERSION = 'ct_slo_pct_v1.0'` (constant futura en TASK-908 Slice 5). Bump cuando emerja calibración per tipo de pieza V2.

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `cycle_time_days` per-task | `v_tasks_enriched.cycle_time_days` (post TASK-908 Slice 4) | derivado | source canonical de Cycle Time per-task |
| `SLO_THRESHOLD` (constante) | `src/lib/notion-metrics/cycle-time-slo-config.ts` (TASK-908 Slice 0) | configuración | default 14.2 días, calibrable per tipo de pieza V2 |
| `task.task_status` (filtro) | `greenhouse_delivery.tasks.task_status` | primitivo | excluir EXCLUDED_FROM_METRICS_STATUSES |
| `task.completed_at` (filtro) | `greenhouse_delivery.tasks.completed_at` | primitivo | solo tareas completadas en denominador |

### 3.1 Boundary canonical

Sin boundary específico — CT SLO% es derivada de Cycle Time + threshold de config. Hereda boundary de `CYCLE_TIME_V1.md`.

### 3.2 Source del threshold canonical (Engine doc §A.5.5)

El threshold `14.2 días` viene del benchmark canonical "promedio agencia LATAM" documentado en `Greenhouse_ICO_Engine_v1.md` línea ~912. Es **constante operativa** — calibrable cuando emerja data específica per tipo de pieza, pero no per cliente individual (sería competitive disadvantage para clientes con expectativas más estrictas).

---

## 4. Helper canonical (per-task compute)

| Helper | File | Status |
|---|---|---|
| `getSLOThreshold(taskType?)` | `src/lib/notion-metrics/cycle-time-slo-config.ts` | Designed (TASK-908 Slice 0) |
| `isWithinSLO(cycleTimeDays, taskType?)` | `src/lib/notion-metrics/cycle-time-slo-config.ts` | Designed (TASK-908 Slice 5) |

### 4.1 Signature canonical V1 (TASK-908 Slice 5)

```typescript
import 'server-only'

export const CT_SLO_PCT_FORMULA_VERSION = 'ct_slo_pct_v1.0'

export type TaskType = 'video' | 'site' | 'static' | 'gif' | 'other' | null
export const DEFAULT_SLO_THRESHOLD_DAYS = 14.2

// Per-task-type calibration (V1 omite — todos retornan default)
const SLO_THRESHOLD_BY_TASK_TYPE: Partial<Record<NonNullable<TaskType>, number>> = {
  // V1: vacío. V2 poblará per tipo cuando emerja calibración data-driven.
}

export const getSLOThreshold = (taskType?: TaskType): number => {
  if (!taskType) return DEFAULT_SLO_THRESHOLD_DAYS
  return SLO_THRESHOLD_BY_TASK_TYPE[taskType] ?? DEFAULT_SLO_THRESHOLD_DAYS
}

export const isWithinSLO = (cycleTimeDays: number | null, taskType?: TaskType): boolean | null => {
  if (cycleTimeDays === null) return null
  return cycleTimeDays <= getSLOThreshold(taskType)
}
```

### 4.2 Tests anti-regresión mínimos (TASK-908 Slice 5)

Mínimo 6 paths:

1. Happy within SLO: cycleTimeDays=10 → true
2. Happy above SLO: cycleTimeDays=20 → false
3. Boundary exact: cycleTimeDays=14.2 → true (≤ inclusive)
4. Boundary just above: cycleTimeDays=14.21 → false
5. Null cycleTime → null (data unavailable)
6. Per-task-type V2 forward-compat: taskType passed pero no calibrado → fallback a default

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `cycle_time_slo_pct` per-member-month | `src/lib/ico-engine/metric-registry.ts` (TASK-908 Slice 5, pending) | NOT yet — emergerá en Slice 5 |

### 5.1 SQL canonical (target post-Slice 5)

Ver §2.2 arriba.

### 5.2 Denominador canonical

Mismo denominador exacto que `cycle_time` agregado:

- **Solo tareas completadas** — `CANONICAL_COMPLETED_TASK_SQL`
- **Excluye Bloqueado/Detenido/archivadas/canceladas** — `EXCLUDED_FROM_METRICS_STATUSES`
- **Excluye CT NULL** (tareas sin cycle_time_days computado)

### 5.3 Granularidades soportadas

- `monthly` per member (default — reviews mensuales)
- `monthly` per space (Pulse — health del proceso del cliente)
- `monthly` per cliente (CVR — narrative competitive benchmark)
- `weekly` (Pulse trends)

---

## 6. Semántica de casos edge

### 6.1 Distinción canonical OTD% vs CT SLO% (IMPORTANTE — Contrato Delta D)

Esta distinción es **load-bearing** del modelo canonical 2026-05-17. Mezclarlas es bug arquitectónico:

| Aspecto | OTD% | CT SLO% |
|---|---|---|
| Pregunta de negocio | ¿Cumplimos SU deadline? | ¿Somos competitivos vs industria? |
| Comparación | per-task deadline (variable per brief) | constante 14.2d (calibrable per tipo) |
| Bucket | on_time / late_drop / overdue / carry_over | within_slo / above_slo |
| Source canonical | `performance_indicator_code` per-task | `cycle_time_days ≤ threshold` |
| Use case | Promise compliance, retros, cliente trust | Pitch comercial, benchmark industria, capacity planning |

**Escenarios canonical**:

| Escenario | OTD% | CT SLO% |
|---|---|---|
| Tarea con due 30d, cerrada 25d (CT=25) | `on_time` (cumplió SU deadline) | `above_slo` (CT >14.2) |
| Tarea con due 5d, cerrada 8d (CT=8) | `late_drop` (no cumplió SU deadline) | `within_slo` (CT ≤14.2) |
| Tarea con due 14d, cerrada 14d (CT=14) | `on_time` | `within_slo` |
| Tarea con due 20d, cerrada 30d (CT=30) | `late_drop` | `above_slo` |

Ambos números son **igualmente importantes**. Equipo con OTD% 95% + CT SLO% 60% = "cumplimos deadlines pero somos lentos absolutos (probably overpromise buffers conservadores)". Equipo con OTD% 70% + CT SLO% 90% = "deadlines acordados eran muy ajustados o capacity insuficiente, pero somos rápidos absolutos".

### 6.2 Threshold uniforme V1

V1 usa `14.2` uniforme para todas las tareas. Tareas legítimamente complejas (video largo de 60s) cuentan como `above_slo` por defecto. V2 (calibración per tipo) corrige.

### 6.3 Tareas con CT = NULL

Tareas con `cycle_time_days` NULL (sin completion o sin start canonical) NO entran al cálculo. Si sample insuficiente (`n<10`), trust=`low_confidence`.

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | n ≥ 10 tareas con CT computable | CT SLO% + threshold zone |
| `low_confidence` | 2 ≤ n < 10 | CT SLO% + warning visual |
| `unavailable` | n < 2 o todas las tareas sin CT | `—` |

---

## 8. Threshold canonical + benchmark

| Threshold | Min % | Max % | Severidad UI |
|---|---|---|---|
| Optimal | 89% | 100% | success (verde) |
| Attention | 75% | 89% | warning (amber) |
| Critical | 0% | 75% | error (rojo) |

**Higher is better** (es métrica positiva — más tareas dentro de SLO es mejor).

### 8.1 Benchmark externo

Engine doc `Greenhouse_ICO_Engine_v1.md` línea ~912 cita: **`14.2 días`** como promedio agencia LATAM creative-tech. Industry mature operations alcanzan CT SLO% ≥ 89%.

### 8.2 Calibración per tipo de pieza (target V2)

Cuando emerja data suficiente per tipo (probablemente 6-12 meses de operación post-V1), V2 activa calibración. Hipótesis:

- video → 21d (CT SLO% ≤ 21d ideal)
- sitio → 28d
- estático → 7d
- GIF → 5d

Implementación V2 requiere:
1. Poblar `SLO_THRESHOLD_BY_TASK_TYPE` map en `cycle-time-slo-config.ts`
2. Agregar `task_type` extraction de Notion property `Tipo de pieza` (o equivalente)
3. SQL del registry usa CASE WHEN per task_type
4. Bump `CT_SLO_PCT_FORMULA_VERSION` a v2.0

---

## 9. Writeback a Notion

| Aspecto | Valor |
|---|---|
| Target property Notion per-task | `[GH] CT SLO bucket` (`within_slo` / `above_slo`, read-only) — NO priorizado V1 |
| Target property Notion per-member-month | `[GH] CT SLO% mes` (number percentage) — NO priorizado V1 |
| Estado actual | `not_implemented` |
| Task de writeback | TASK derivada futura (post agregado SQL en producción 30+ días + demanda operativa real) |
| Rationale V1 NO writeback | Agregado SQL del registry suficiente para dashboards (Pulse, scorecards, CVR). Per-task writeback no agrega valor operativo inmediato. |

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created (separación canonical de OTD%)

- Spec canonical creado post **decisión arquitectónica canonical de separar OTD% (promise compliance) vs CT SLO% (competitive benchmark)** — Contrato Delta sección D.
- **Decisión disparadora**: Engine doc línea 958-992 tenía drift definiendo OTD% como `cycle_time_days <= 14.2`. Eso es CT SLO%, NO OTD%. Resolución canonical 2026-05-17: separar formalmente en 2 specs (este + `OTD_V1.md`).
- **Threshold canonical 14.2**: confirmado del Engine doc §A.5.5 como benchmark agencia LATAM.
- **Calibración per tipo de pieza**: deferida a V2 — V1 usa uniforme `14.2`.
- **Implementación runtime**: TASK-908 Slice 5 agrega el metric al registry. V1 spec ship pre-implementation; runtime emerge cuando TASK-908 ship.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [OTD_V1.md](OTD_V1.md) — **métrica hermana CRÍTICA** (promise compliance vs competitive benchmark, NO confundir)
  - [CYCLE_TIME_V1.md](CYCLE_TIME_V1.md) — métrica base que CT SLO% consume
  - [CYCLE_TIME_VARIANCE_V1.md](CYCLE_TIME_VARIANCE_V1.md) — métrica hermana (predictabilidad vs benchmark)
- **Tasks**: TASK-908 Slice 5 (implementación runtime — pending)
- **Código**:
  - Helper canonical (futuro): `src/lib/notion-metrics/cycle-time-slo-config.ts` (TASK-908 Slice 0)
  - Agregado (futuro): `src/lib/ico-engine/metric-registry.ts` (TASK-908 Slice 5)
  - Source: `v_tasks_enriched.cycle_time_days` (post TASK-908 Slice 4 actualizado)
- **Docs reference**:
  - Contrato Delta 2026-05-17 sección D (separación canonical OTD% vs CT SLO%)
  - Engine doc `Greenhouse_ICO_Engine_v1.md` línea ~912 (benchmark 14.2d source)
  - Engine doc líneas 958-992 (drift documental a resolver — OTD% confundido con CT SLO%)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Calibración per tipo de pieza**: V1 threshold uniforme `14.2`. V2 prioridad alta cuando emerja data 6-12 meses.
- **Per-cliente threshold negociado**: ¿cliente enterprise pide SLA CT específico distinto al benchmark industria? V1 NO — CT SLO% es benchmark de industria, no SLA contractual. SLA contractual va a OTD% (promise compliance).
- **CT SLO% Percentile breakdown**: ¿exponer `% within p50_threshold`, `% within p75_threshold`, `% within p90_threshold`? V1 expone solo `within_slo` binario. V2 si emerge demanda.
- **Writeback per-task Notion**: V1 NO. Si emerge demanda operativa (operador quiere ver bucket per-tarea en Notion), TASK derivada.
- **Histórico calibración benchmark**: cuando el benchmark `14.2` se actualice (e.g. industria mejora a `12d` en 2030), bump major v2.0 + Delta histórico.
- **Métrica cross-cliente comparable**: ¿exponer CT SLO% normalizado para comparar performance vs otras agencias del benchmark? V2 si emerge data competitive intelligence.

---

## 13. Downstream consumers — qué consume CT SLO%

### 13.1 Payroll bonus calculation — **NO input bonus V1**

**No**. CT SLO% NO entra al cálculo de bonus V1.

**Razón canonical**: CT SLO% es **competitive benchmark** (vs industria), no **promise compliance** (vs deadline acordado per brief). OTD% ya cubre promise compliance — que es lo que HR/Finance consideran justo de bonus-eable. CT SLO% mide eficiencia operativa absoluta — pagar por velocidad absoluta puede incentivar trade-offs perversos (operador rushea para CT bajo a costa de quality / scope cuts). Si HR/Finance decide V2 incluir velocidad absoluta como input bonus, requiere los 7 pasos canonical de extensión documentados en [`../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`](../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md) §10.

**Distinción canonical OTD% vs CT SLO%** (NO confundir):

- **OTD% = promise compliance** → input bonus V1 sí
- **CT SLO% = competitive benchmark** → input bonus V1 NO

Ver `OTD_V1.md` §6.5 + este spec §6.1 para cross-distinction completa.

### 13.2 Pitch comercial + CVR cliente narrative

CT SLO% es la métrica que sustenta el claim "Globe opera dentro del benchmark de industria". Aparece en QBR + sales materials como diferenciador competitivo. Display per-cliente + per-período via aggregate SQL.

### 13.3 Capacity planning + sales

CT SLO% sostenidamente bajo = capacity insuficiente o proceso degradado → input a sales conversation con cliente (rebalancear scope) o capacity review interno.
