# TASK-118 — ICO AI Core: Embedded Intelligence Layer

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño completado, implementación pendiente`
- Rank: `44`
- Domain: `ico-engine / ai`
- Assigned to: **Codex (backend/pipeline)** + **Claude (UI signals)**

## Summary

Transformar ICO de un motor de medición pasivo a un motor de inteligencia embebida. La IA corre como daemon en cada ciclo de materialización — no como chat, no bajo demanda. Genera anomalías, predicciones, root cause analysis, y recomendaciones que se persisten como first-class data y se consumen directamente en dashboards.

## Why This Task Exists

ICO hoy mide correctamente: OTD, RPA, FTR, cycle time, throughput, stuck assets. Pero es pasivo:

- El usuario mira el dashboard, interpreta, y decide qué hacer
- No hay detección automática de cuándo algo cambió significativamente
- No hay predicción de dónde va a terminar el mes
- No hay diagnosis automática de por qué una métrica se degradó
- No hay recomendaciones de qué hacer al respecto
- La tabla `ai_metric_scores` existe vacía desde el spec original

El ciclo de feedback es humano y lento. IA en el core lo acelera.

## Design Decisions (acordadas)

### D1 — Advisory-only, no semi-automático

ICO alimenta bonos variables en payroll (OTD bonus, RPA bonus). Si la IA moviera work items automáticamente, afectaría liquidaciones reales. Las señales de IA son informativas — el humano decide y actúa.

**Evolución futura:** Cuando las predicciones tengan >80% de accuracy medida durante 3-6 meses, evaluar semi-automático con capa de aprobación.

### D2 — Internal-only (agency surfaces), no client-facing

Si un cliente ve "tu OTD predicho es 79%", Efeonce pierde control de la narrativa. El equipo ve la predicción, actúa, y el cliente solo ve el resultado.

**Fase 2 (futuro):** Versión curada para clients — semáforo de proyección ("En camino" / "Riesgo") sin mostrar el número crudo.

### D3 — In-process TypeScript, no BigQuery ML

BigQuery ML agrega complejidad operativa que no se justifica hasta saber qué señales son útiles. TypeScript puro con math simple (moving averages, z-scores, linear regression) es suficiente para las capas 1-4 y se debuggea directo.

**Migración a BigQuery ML:** Solo si un modelo específico necesita 12+ meses de features complejas. No antes.

### D4 — Observabilidad dentro de Ops Health existente

La surface de Ops Health (TASK-113) ya existe. AI Core se agrega como subsystem adicional en `getOperationsOverview()`, no como surface separada.

### D5 — Threshold mínimo por Space

Spaces con <30 tasks completadas en rolling 3 meses no tienen suficiente señal estadística. Flag `ai_eligible` por Space. Spaces debajo ven métricas normales sin señales de IA.

### D6 — Prediction tracking desde día 1

Sin tracking de predicción vs resultado, no hay forma de calibrar la IA. `ai_prediction_log` se implementa junto con la primera predicción, no después.

## Architecture

### Pipeline actual (sin cambios)

```
Notion → Sync → Conformed → Enriched → Materialized (Steps 1-7) → Postgres → UI
```

### Pipeline propuesto (aditivo)

```
Notion → Sync → Conformed → Enriched → Materialized (Steps 1-7)
                                              ↓
                                     AI Core (Steps 8-11)
                                        │
                              ┌─────────┼──────────┐
                              │         │          │
                        Step 8:    Step 9:    Step 10:
                        Anomaly    Predictor  Recommender
                        Detector              (Root Cause +
                              │         │     Optimization)
                              └─────────┼──────────┘
                                        ↓
                                   Step 11:
                                   Persist ai_signals
                                        ↓
                                   Postgres cache
                                        ↓
                                   UI (dashboards, person-360, Nexa context)
```

### Principio: puramente aditivo

Steps 1-7 de `materialize.ts` no se tocan. AI Core se agrega como steps 8-11. Si el AI Core falla, la materialización completa sin IA (graceful degradation). Zero riesgo para el pipeline existente.

### Tablas nuevas

```sql
-- Señales generadas por el AI Core en cada materialización
CREATE TABLE ico_engine.ai_signals (
  signal_id         STRING NOT NULL,
  signal_type       STRING NOT NULL,  -- 'anomaly' | 'prediction' | 'root_cause' | 'recommendation'
  space_id          STRING NOT NULL,
  member_id         STRING,           -- NULL para señales a nivel Space
  project_id        STRING,           -- NULL para señales a nivel Space/Member
  metric_name       STRING NOT NULL,  -- 'otd_pct' | 'rpa_avg' | 'ftr_pct' | 'cycle_time_avg' | ...
  period_year       INT64 NOT NULL,
  period_month      INT64 NOT NULL,

  -- Anomaly fields
  current_value     FLOAT64,
  expected_value    FLOAT64,          -- mean of historical window
  z_score           FLOAT64,          -- standard deviations from mean
  severity          STRING,           -- 'info' | 'warning' | 'critical'

  -- Prediction fields
  predicted_value   FLOAT64,          -- forecast for end of period
  confidence        FLOAT64,          -- 0.0 to 1.0
  prediction_horizon STRING,          -- 'end_of_month' | 'next_month'

  -- Root cause fields
  contribution_pct  FLOAT64,          -- how much this dimension explains the anomaly
  dimension         STRING,           -- 'member' | 'project' | 'phase'
  dimension_id      STRING,           -- the specific member_id/project_id/phase

  -- Recommendation fields
  action_type       STRING,           -- 'rebalance' | 'escalate' | 'prioritize' | 'investigate'
  action_summary    STRING,           -- human-readable recommendation
  action_target_id  STRING,           -- who/what to act on

  -- Metadata
  model_version     STRING NOT NULL,  -- 'v1.0.0' — tracks which logic generated this
  generated_at      TIMESTAMP NOT NULL,
  materialization_id STRING,          -- links to the materialization run

  -- Eligibility
  ai_eligible       BOOL NOT NULL DEFAULT TRUE
);

-- Prediction tracking for calibration
CREATE TABLE ico_engine.ai_prediction_log (
  prediction_id     STRING NOT NULL,
  space_id          STRING NOT NULL,
  metric_name       STRING NOT NULL,
  period_year       INT64 NOT NULL,
  period_month      INT64 NOT NULL,
  predicted_value   FLOAT64 NOT NULL,
  predicted_at      TIMESTAMP NOT NULL,
  confidence        FLOAT64 NOT NULL,
  actual_value      FLOAT64,          -- filled at period close
  actual_recorded_at TIMESTAMP,       -- when actual was recorded
  error_pct         FLOAT64,          -- |predicted - actual| / actual * 100
  model_version     STRING NOT NULL
);
```

### Postgres serving cache

```sql
-- Últimas señales AI por Space (consumed by UI)
CREATE TABLE greenhouse_serving.ico_ai_signals (
  signal_id       UUID PRIMARY KEY,
  signal_type     TEXT NOT NULL,
  space_id        TEXT NOT NULL,
  member_id       TEXT,
  metric_name     TEXT NOT NULL,
  period_year     INT NOT NULL,
  period_month    INT NOT NULL,
  severity        TEXT,
  current_value   NUMERIC,
  predicted_value NUMERIC,
  confidence      NUMERIC,
  action_type     TEXT,
  action_summary  TEXT,
  model_version   TEXT NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_signals_space ON greenhouse_serving.ico_ai_signals(space_id, period_year, period_month);
CREATE INDEX idx_ai_signals_member ON greenhouse_serving.ico_ai_signals(member_id) WHERE member_id IS NOT NULL;
```

## Scope — 6 Slices ordenados por impacto/esfuerzo

### Slice 1 — Anomaly Detection (Step 8)

**Qué hace:** Compara cada métrica del snapshot actual contra su ventana histórica (6 meses rolling). Calcula z-score. Si |z| > 2, genera señal de anomalía.

**Algoritmo:**
```
Para cada (space_id, metric) con >=3 meses de historia:
  mean = AVG(metric) over last 6 months
  stddev = STDDEV(metric) over last 6 months
  z_score = (current - mean) / stddev

  if |z_score| > 3.0 → severity: 'critical'
  if |z_score| > 2.0 → severity: 'warning'
  else → no signal
```

**Input:** `ico_engine.metric_snapshots_monthly` (últimos 6 meses por Space)
**Output:** Rows en `ico_engine.ai_signals` con `signal_type = 'anomaly'`

**Archivos:**
- `src/lib/ico-engine/ai/anomaly-detector.ts` (nuevo)
- `src/lib/ico-engine/materialize.ts` (agregar Step 8)

**Esfuerzo:** ~2 horas. Math simple, zero dependencias.

### Slice 2 — Root Cause Analysis (Step 9)

**Qué hace:** Cuando se detecta una anomalía, hace drill-down dimensional automático para encontrar qué miembro, proyecto o fase CSC contribuye más al cambio.

**Algoritmo:**
```
Para cada anomalía detectada en Slice 1:
  1. Agrupar metric_by_member para ese Space+período
  2. Calcular contribución de cada miembro al delta (current vs expected)
  3. Rankear por |contribución|
  4. Top 3 contributors → signals con signal_type = 'root_cause'

  Repetir para dimension = 'project' y dimension = 'phase'
```

**Input:** Anomalías de Step 8 + `metrics_by_member`, `metrics_by_project`
**Output:** Rows en `ai_signals` con `signal_type = 'root_cause'`

**Archivos:**
- `src/lib/ico-engine/ai/root-cause-analyzer.ts` (nuevo)
- `src/lib/ico-engine/materialize.ts` (agregar Step 9)

**Esfuerzo:** ~3 horas. Dimensional drill-down, sin modelo externo.

### Slice 3 — Predictive Metrics (Step 10)

**Qué hace:** Predice el valor de cada métrica al cierre del período actual, basado en trend histórico + velocidad actual del pipeline.

**Algoritmo (Linear Extrapolation v1):**
```
Para cada (space_id, metric) con >=6 meses de historia:
  trend = linear regression slope over last 6 months
  days_remaining = days until end of month
  days_elapsed = days since start of month
  progress_ratio = days_elapsed / total_days_in_month

  // Blend: historical trend + current pace
  predicted = current_value + (trend * (1 - progress_ratio))
  confidence = min(0.95, 0.5 + (months_of_history / 24) + progress_ratio * 0.3)
```

**Input:** `metric_snapshots_monthly` (6+ meses) + snapshot parcial del mes actual
**Output:** Rows en `ai_signals` con `signal_type = 'prediction'` + `ai_prediction_log`

**Archivos:**
- `src/lib/ico-engine/ai/predictor.ts` (nuevo)
- `src/lib/ico-engine/ai/prediction-log.ts` (nuevo — tracking)
- `src/lib/ico-engine/materialize.ts` (agregar Step 10)

**Esfuerzo:** ~4 horas. Linear regression in TypeScript, prediction logging.

### Slice 4 — Capacity Forecasting

**Qué hace:** Compara throughput actual × pipeline activo vs capacidad contratada para proyectar gap del mes siguiente.

**Algoritmo:**
```
Para cada Space:
  avg_monthly_throughput = AVG(throughput) last 3 months
  active_pipeline = COUNT(tasks WHERE status = active)
  contracted_fte = SUM(member_fte) for Space

  projected_demand_fte = active_pipeline / avg_monthly_throughput
  gap = projected_demand_fte - contracted_fte

  if gap > 0.5 FTE → signal: 'capacity_gap', action: 'expand'
  if gap < -0.5 FTE → signal: 'capacity_surplus', action: 'optimize'
```

**Input:** `metric_snapshots_monthly` + `member_capacity_economics` (Postgres)
**Output:** Rows en `ai_signals` con `signal_type = 'recommendation'`, `action_type = 'rebalance'`

**Archivos:**
- `src/lib/ico-engine/ai/capacity-forecaster.ts` (nuevo)
- `src/lib/ico-engine/materialize.ts` (agregar step)

**Esfuerzo:** ~3 horas.

### Slice 5 — Resource Optimization Recommendations

**Qué hace:** Basado en anomalías + root cause + predicciones + capacity, genera recomendaciones de acción concretas.

**Lógica rule-based:**
```
Rules:
1. IF anomaly(otd, critical) AND root_cause(member, >60% contribution) AND member.dedication > 100%
   → RECOMMEND: "Reasignar N tasks de [member] a miembros con capacity disponible"

2. IF anomaly(cycle_time, warning) AND root_cause(phase=revision_interna, >50%)
   → RECOMMEND: "Bottleneck en revisión interna — priorizar feedback de [project]"

3. IF prediction(otd, <80%) AND days_remaining > 10
   → RECOMMEND: "OTD proyectado bajo target — foco en [top 3 tasks by deadline proximity]"

4. IF stuck_assets > 5 AND root_cause(project, >40%)
   → RECOMMEND: "5 assets stuck en [project] — escalar con account manager"
```

**Input:** Todas las señales de Slices 1-4
**Output:** Rows en `ai_signals` con `signal_type = 'recommendation'`

**Archivos:**
- `src/lib/ico-engine/ai/recommender.ts` (nuevo)
- `src/lib/ico-engine/materialize.ts` (agregar step)

**Esfuerzo:** ~3 horas. Rule engine, sin modelo.

### Slice 6 — Quality Scoring (LLM)

**Qué hace:** Evalúa calidad semántica de deliverables más allá de RPA/FTR. Usa la tabla `ai_metric_scores` que ya existe vacía.

**Scope:**
- Async: no corre en materialización, corre como job separado sobre tasks completadas
- Evalúa: naming consistency, description completeness, tagging quality
- Usa Gemini API (ya integrado vía `nexa-service.ts`)

**Esfuerzo:** ~6 horas. Es el más experimental. Hacer último.

## Contrato UI — cómo se consumen las señales

### En Agency Delivery dashboard

```
Hoy:                              Con AI Core:
┌──────────────────┐              ┌──────────────────────────────────┐
│ OTD: 84% ↓       │              │ OTD: 84% ↓ ⚠️ Anomalía (z=2.3) │
│ Atención          │              │ Predicción fin de mes: 79%       │
│                   │              │ Causa: 4 tasks stuck en Acme     │
│                   │              │ → Reasignar 2 tasks de María     │
└──────────────────┘              └──────────────────────────────────┘
```

### En Person 360

```
Hoy:                              Con AI Core:
┌──────────────────┐              ┌──────────────────────────────────┐
│ María - OTD: 78%  │              │ María - OTD: 78% ⚠️              │
│                   │              │ Dedicación: 140% (riesgo)        │
│                   │              │ Contribuye 35% del delta OTD     │
│                   │              │ de Space Acme                    │
└──────────────────┘              └──────────────────────────────────┘
```

### En Nexa (contexto enriquecido, no cálculo)

Nexa no calcula señales — las lee de `greenhouse_serving.ico_ai_signals` y las usa como contexto:

```
Usuario: "¿Cómo va el OTD?"
Nexa: "El OTD es 84%, con una anomalía detectada (2.3 desviaciones bajo tu trend).
       El modelo predice 79% a fin de mes. La causa principal son 4 tasks
       bloqueadas en Acme, asignadas a María que está al 140% de dedicación.
       ¿Quieres ver las opciones de reasignación?"
```

## Dependencies & Impact

### Depends on

- ICO pipeline actual (Steps 1-7 de `materialize.ts`) — estable y funcional
- `metric_snapshots_monthly` con >=3 meses de historia por Space
- TASK-064 (assignee attribution) — idealmente remediado para Slice 2
- Schema `ico_engine` en BigQuery + `greenhouse_serving` en Postgres

### Impacts to

- `src/lib/ico-engine/materialize.ts` — nuevos steps aditivos
- `src/lib/ico-engine/ai/` — directorio nuevo completo
- Agency Delivery UI — consume señales
- Person 360 — consume señales por miembro
- Ops Health — health del AI Core como subsystem
- Nexa — contexto enriquecido (TASK-114/115)

### Files owned

- `src/lib/ico-engine/ai/anomaly-detector.ts` (nuevo)
- `src/lib/ico-engine/ai/root-cause-analyzer.ts` (nuevo)
- `src/lib/ico-engine/ai/predictor.ts` (nuevo)
- `src/lib/ico-engine/ai/prediction-log.ts` (nuevo)
- `src/lib/ico-engine/ai/capacity-forecaster.ts` (nuevo)
- `src/lib/ico-engine/ai/recommender.ts` (nuevo)
- `src/lib/ico-engine/ai/eligibility.ts` (nuevo — threshold check)
- `src/lib/ico-engine/ai/types.ts` (nuevo — shared interfaces)
- `src/lib/ico-engine/materialize.ts` (modificar — steps 8-11)
- DDL migrations para BigQuery + Postgres

## Out of Scope

- Acciones semi-automáticas (toda señal es advisory-only)
- Client-facing signals (solo agency surfaces)
- BigQuery ML (se usa TypeScript in-process)
- LLM para capas 1-5 (solo capa 6 usa LLM)
- Cambios al pipeline de materialización existente (Steps 1-7 intactos)
- Rediseño de UI (las señales se agregan a surfaces existentes)

## Orden de ejecución

```
Slice 1 (Anomaly) → Slice 2 (Root Cause) → Slice 3 (Predictions)
                                                    ↓
                                          Slice 4 (Capacity)
                                                    ↓
                                          Slice 5 (Recommendations)
                                                    ↓
                                          Slice 6 (Quality/LLM)
```

Cada slice es desplegable independientemente. El pipeline degrada gracefully si cualquier step falla.

## Acceptance Criteria

### Slice 1 — Anomaly Detection
- [ ] Step 8 corre en `materialize.ts` sin afectar Steps 1-7
- [ ] Anomalías con z-score >2 se persisten en `ai_signals`
- [ ] Spaces con <30 tasks en 3 meses no generan señales (`ai_eligible = false`)
- [ ] Graceful degradation: si Step 8 falla, materialización completa sin IA

### Slice 2 — Root Cause Analysis
- [ ] Top 3 contributors por dimensión (member, project, phase) para cada anomalía
- [ ] `contribution_pct` es correcto y suma ~100% por anomalía

### Slice 3 — Predictive Metrics
- [ ] Predicción de fin de mes para OTD, RPA, FTR por Space
- [ ] `ai_prediction_log` registra cada predicción con confidence
- [ ] Al cierre del período, `actual_value` se llena y `error_pct` se calcula

### Slice 4 — Capacity Forecasting
- [ ] Gap de capacidad proyectado por Space (FTE)
- [ ] Señal solo se genera cuando gap > 0.5 FTE

### Slice 5 — Resource Optimization
- [ ] Recomendaciones rule-based basadas en señales de Slices 1-4
- [ ] `action_summary` legible por un humano sin contexto técnico

### Slice 6 — Quality Scoring
- [ ] Job async que evalúa tasks completadas
- [ ] Scores en `ai_metric_scores` (tabla existente)
- [ ] Fallback: si LLM falla, task queda sin score (no bloquea)

### Transversal
- [ ] Zero TS errors, lint clean
- [ ] `pnpm build` pasa
- [ ] Ops Health muestra AI Core como subsystem
- [ ] Señales sincronizadas a `greenhouse_serving.ico_ai_signals` vía cron o reactive
