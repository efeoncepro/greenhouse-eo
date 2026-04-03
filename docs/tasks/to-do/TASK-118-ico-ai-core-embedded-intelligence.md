# TASK-118 — ICO AI Core: Embedded Intelligence Layer

## Delta 2026-04-03 — AI layer must follow metric trust foundation and north-star contract

- El body de esta task fue escrito antes de cerrar la ola de trust foundation y antes de alinear el backlog con `docs/architecture/Contrato_Metricas_ICO_v1.md`.
- Lectura correcta desde hoy:
  - cualquier señal, predicción o recomendación de IA debe consumir métricas `ICO` ya normalizadas por semántica, benchmark y confianza
  - los thresholds legacy o stage-specific ejemplos dentro del body no deben asumirse como contrato vigente si contradicen `Contrato_Metricas_ICO_v1.md` o `TASK-216`
  - `Revenue Enabled`, `TTM`, `Iteration Velocity` y `BCS` no deben tratarse como inputs maduros hasta que cierren `TASK-218` a `TASK-221`
- Esta lane sigue vigente, pero debe leerse como consumer avanzado del sistema de métricas ya endurecido, no como lugar donde se decide la semántica de los KPIs.

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

---

## Phase 2 — ICO Robustness (Slices 7-13)

Los slices 1-6 agregan inteligencia al pipeline. Los slices 7-13 robustecen la base sobre la que esa inteligencia opera: calidad de datos, ponderación económica, modelado de pipeline, estacionalidad, y crecimiento de personas.

### Slice 7 — Data Quality Scoring (prerequisite para confianza)

**Qué hace:** Calcula un score de calidad por Space basado en completitud de campos clave en sus tasks. Cada métrica ICO se acompaña de un `confidence` basado en la calidad de los datos subyacentes.

**Campos evaluados:**
```
Para cada task en v_tasks_enriched del Space:
  has_assignee     = assignee_member_ids IS NOT NULL AND ARRAY_LENGTH(assignee_member_ids) > 0
  has_due_date     = fecha_entrega IS NOT NULL OR fecha_limite IS NOT NULL
  has_status       = estado IS NOT NULL AND estado != ''
  has_project      = proyecto_ids IS NOT NULL AND ARRAY_LENGTH(proyecto_ids) > 0
  has_completed_at = fecha_de_completado IS NOT NULL (solo para completed tasks)

  task_completeness = (has_assignee + has_due_date + has_status + has_project) / 4

Space quality score:
  data_quality_pct = AVG(task_completeness) * 100  -- 0-100%
  otd_confidence   = % de tasks completadas que tienen due_date (sin due_date, OTD es incalculable)
  rpa_confidence   = % de tasks completadas que tienen rpa_value > 0
  ftr_confidence   = % de tasks completadas que tienen client_change_round_final definido
```

**Output:**
- Nuevo campo `data_quality` en `metric_snapshots_monthly`: `{ score_pct, otd_confidence, rpa_confidence, ftr_confidence }`
- Señales en `ai_signals` con `signal_type = 'data_quality'` cuando score < 70%
- UI muestra badge de confianza junto a cada métrica: "OTD: 84% (confianza: 92%)" vs "OTD: 84% (confianza: 45% ⚠️)"

**Archivos:**
- `src/lib/ico-engine/ai/data-quality-scorer.ts` (nuevo)
- `src/lib/ico-engine/materialize.ts` (agregar step previo a anomaly detection)

**Esfuerzo:** ~2 horas. Queries simples sobre campos existentes.

**Impacto:** TASK-118 Slices 1-3 (anomaly, root cause, predictions) deben leer `data_quality` y degradar confianza de sus señales cuando el score es bajo. Sin esto, predicciones sobre datos sucios son teatro.

### Slice 8 — Revenue-Weighted Metrics

**Qué hace:** Pondera métricas ICO por el revenue del Space, para que la degradación en un cliente de $50K/mes pese más que en uno de $5K/mes.

**Datos disponibles:**
- `greenhouse_finance.fin_income` ya tiene revenue por Space
- `greenhouse_serving.organization_operational_metrics` tiene datos por org
- El bridge `space_id → client_id → fin_income` ya existe

**Métricas nuevas:**
```
revenue_weighted_otd = SUM(otd_pct * monthly_revenue) / SUM(monthly_revenue)
revenue_at_risk = SUM(monthly_revenue) WHERE otd_pct < 80% OR anomaly detected
revenue_concentration = TOP_3_spaces_revenue / total_revenue  -- riesgo de concentración
```

**Output:**
- Campos adicionales en agency-level aggregation
- Señal `ai_signals` con `signal_type = 'revenue_risk'` cuando `revenue_at_risk > 20%` del total

**Archivos:**
- `src/lib/ico-engine/ai/revenue-weighting.ts` (nuevo)
- `src/lib/ico-engine/read-metrics.ts` (agregar revenue-weighted reads)

**Esfuerzo:** ~3 horas. JOIN con finance tables, math de ponderación.

### Slice 9 — CSC Pipeline Analytics (Markov Chain)

**Qué hace:** Modela la dinámica del Creative Supply Chain como cadena de Markov: probabilidades de transición entre fases, tiempo de permanencia por fase, y predicción de fecha de entrega basada en fase actual.

**Modelo:**
```
Fases CSC: briefing → produccion → revision_interna → cambios_cliente → entrega

Para cada Space (rolling 6 meses):
  transition_matrix[from][to] = COUNT(tasks that moved from→to) / COUNT(tasks in from)
  avg_dwell_time[phase] = AVG(hours in phase before transitioning)

  Ejemplo:
    P(revision_interna → entrega) = 0.65  (65% pasan directo)
    P(revision_interna → cambios_cliente) = 0.30  (30% van a cambios)
    P(revision_interna → revision_interna) = 0.05  (5% se quedan stuck)
    avg_dwell_time[revision_interna] = 52 hours

Para una task en revision_interna:
  predicted_delivery = now + avg_dwell_time[revision_interna]
                     + P(cambios_cliente) * avg_dwell_time[cambios_cliente]
                     + avg_dwell_time[entrega]
```

**Output:**
- `ico_engine.csc_transition_matrix` — tabla con probabilidades por Space
- `ico_engine.csc_dwell_times` — tiempo promedio por fase por Space
- Señales: bottleneck identification (fase con mayor dwell time), predicted delivery date por task activa
- UI: visualización Sankey o funnel con probabilidades reales

**Archivos:**
- `src/lib/ico-engine/ai/csc-pipeline-analyzer.ts` (nuevo)
- `src/lib/ico-engine/materialize.ts` (agregar step)

**Esfuerzo:** ~5 horas. Markov chain math, transition matrix computation.

**Valor:** Más preciso que predicción lineal (Slice 3) porque modela el pipeline real. "Esta task tiene 65% de probabilidad de entrega directa y 30% de ir a cambios — delivery estimado: 4 de abril."

### Slice 10 — Seasonality Model

**Qué hace:** Calcula el patrón estacional de cada métrica por Space (12 meses mínimo). El anomaly detector (Slice 1) descuenta la estacionalidad para evitar false alarms.

**Algoritmo:**
```
Para cada (space_id, metric) con >=12 meses de historia:
  seasonal_index[month] = AVG(metric for that month) / AVG(metric overall)

  Ejemplo para OTD:
    enero: 1.05 (5% sobre promedio — post-vacaciones hay menos carga)
    diciembre: 0.88 (12% bajo promedio — siempre lento)

  seasonally_adjusted_value = current_value / seasonal_index[current_month]

  Anomaly detection usa seasonally_adjusted_value en vez de current_value
```

**Output:**
- `ico_engine.seasonal_indices` — tabla con index por (space_id, metric, month)
- Anomaly detector (Slice 1) recibe flag `use_seasonality = true` cuando hay >=12 meses de data
- Señal mejorada: "OTD bajó 5% pero el ajuste estacional es -4%, la anomalía real es solo 1% → no generar alerta"

**Archivos:**
- `src/lib/ico-engine/ai/seasonality-model.ts` (nuevo)
- `src/lib/ico-engine/ai/anomaly-detector.ts` (modificar para usar seasonal adjustment)

**Esfuerzo:** ~3 horas. Seasonal decomposition simple.

**Prerequisite:** >=12 meses de `metric_snapshots_monthly` por Space. Spaces con menos historia no reciben ajuste estacional.

### Slice 11 — Operational Maturity Model

**Qué hace:** Clasifica cada Space en una etapa de madurez operativa y ajusta targets/thresholds según la etapa.

**Framework:**
```
Etapas:
  1. Onboarding    (0-3 meses, <50 tasks completadas)
  2. Establishing   (3-9 meses, 50-200 tasks completadas)
  3. Optimizing     (9-18 meses, 200-500 tasks, improving trends)
  4. Excelling      (18+ meses, 500+ tasks, consistently above targets)

Targets dinámicos:
  Onboarding:    OTD >70% = Óptimo, >55% = Atención
  Establishing:  OTD >80% = Óptimo, >65% = Atención
  Optimizing:    OTD >85% = Óptimo, >75% = Atención
  Excelling:     OTD >90% = Óptimo, >82% = Atención

Progression:
  score = weighted(months_active, total_completed, trend_direction, consistency)
  stage = map(score → stage thresholds)
```

**Output:**
- Campo `maturity_stage` en `metric_snapshots_monthly`
- Targets de métricas ajustados por stage (el semáforo se recalibra)
- Señal de progresión: "Space Acme pasó de Establishing a Optimizing este mes"
- UI badge: etapa visible en Space cards

**Archivos:**
- `src/lib/ico-engine/ai/maturity-model.ts` (nuevo)
- `src/lib/ico-engine/metric-registry.ts` (modificar thresholds para ser stage-aware)

**Esfuerzo:** ~3 horas. Framework rule-based, sin modelo.

### Slice 12 — Member Growth Trajectory

**Qué hace:** Analiza la evolución de cada miembro en el tiempo y detecta trends positivos, negativos, y comparación con peers del mismo rol.

**Métricas:**
```
Para cada member con >=3 meses de metrics_by_member:
  otd_trend = slope of OTD% over last 6 months (positivo = mejorando)
  rpa_trend = slope of RPA over last 6 months (negativo = mejorando)

  peer_group = members with same role_code AND >=3 months of data
  otd_percentile = PERCENT_RANK(member.otd) within peer_group
  rpa_percentile = PERCENT_RANK(member.rpa) within peer_group

  growth_signal:
    'improving'  if otd_trend > 0.5%/month AND rpa_trend < -0.1/month
    'declining'  if otd_trend < -1%/month for 3+ consecutive months
    'stable'     otherwise

  early_warning:
    IF declining for 3+ months → signal: 'member_attention_needed'
    IF percentile < 25% for 2+ months → signal: 'below_peer_benchmark'
```

**Output:**
- Campos en serving: `otd_trend`, `growth_signal`, `otd_percentile`, `rpa_percentile`
- Señales `ai_signals` con `signal_type = 'member_growth'`
- Person 360 muestra: trend arrow, peer comparison, growth signal badge
- HR surface: lista de miembros con declining trajectory para coaching proactivo

**Archivos:**
- `src/lib/ico-engine/ai/member-trajectory.ts` (nuevo)
- `src/lib/person-360/get-person-ico-profile.ts` (enriquecer con trajectory)

**Esfuerzo:** ~4 horas. Regression + percentile computation.

### Slice 13 — Multi-Source Enrichment (Cross-Schema Signals)

**Qué hace:** Cruza datos de ICO con Finance, Payroll, y Email Delivery para generar señales compuestas que ningún módulo puede ver solo.

**Señales cross-schema:**
```
1. Cost-per-Delivery:
   cost = member.compensation / member.throughput
   → Señal si cost_per_delivery sube >20% vs promedio de 3 meses

2. Revenue-Delivery Correlation:
   IF Space.revenue declining AND Space.otd declining → 'correlated_decline' (alto riesgo)
   IF Space.revenue declining AND Space.otd stable → 'commercial_issue' (no es delivery)

3. Communication Health:
   IF Space has >3 failed emails in 7 days AND otd declining → 'communication_breakdown'

4. Dedication-Performance Mismatch:
   IF member.dedication > 100% AND member.otd declining → 'overload_degradation'
   IF member.dedication < 50% AND member.otd declining → 'engagement_risk'
```

**Input:** `greenhouse_serving.*` (ICO + finance + payroll + email_deliveries)
**Output:** Señales `ai_signals` con `signal_type = 'cross_signal'`

**Archivos:**
- `src/lib/ico-engine/ai/cross-schema-signals.ts` (nuevo)

**Esfuerzo:** ~4 horas. JOINs cross-schema, rule engine.

---

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

**Phase 1 — AI Intelligence (Slices 1-6):**
- `src/lib/ico-engine/ai/anomaly-detector.ts` (nuevo)
- `src/lib/ico-engine/ai/root-cause-analyzer.ts` (nuevo)
- `src/lib/ico-engine/ai/predictor.ts` (nuevo)
- `src/lib/ico-engine/ai/prediction-log.ts` (nuevo)
- `src/lib/ico-engine/ai/capacity-forecaster.ts` (nuevo)
- `src/lib/ico-engine/ai/recommender.ts` (nuevo)
- `src/lib/ico-engine/ai/eligibility.ts` (nuevo — threshold check)
- `src/lib/ico-engine/ai/types.ts` (nuevo — shared interfaces)

**Phase 2 — Robustness (Slices 7-13):**
- `src/lib/ico-engine/ai/data-quality-scorer.ts` (nuevo)
- `src/lib/ico-engine/ai/revenue-weighting.ts` (nuevo)
- `src/lib/ico-engine/ai/csc-pipeline-analyzer.ts` (nuevo)
- `src/lib/ico-engine/ai/seasonality-model.ts` (nuevo)
- `src/lib/ico-engine/ai/maturity-model.ts` (nuevo)
- `src/lib/ico-engine/ai/member-trajectory.ts` (nuevo)
- `src/lib/ico-engine/ai/cross-schema-signals.ts` (nuevo)
- `src/lib/ico-engine/metric-registry.ts` (modificar — stage-aware thresholds)
- `src/lib/person-360/get-person-ico-profile.ts` (enriquecer)

**Shared:**
- `src/lib/ico-engine/materialize.ts` (modificar — steps adicionales)
- DDL migrations para BigQuery + Postgres

## Out of Scope

- Acciones semi-automáticas (toda señal es advisory-only)
- Client-facing signals en Phase 1 (solo agency surfaces; Phase 2 puede abrir semáforo curado)
- BigQuery ML (se usa TypeScript in-process)
- LLM para capas 1-5 (solo capa 6 usa LLM)
- Cambios al pipeline de materialización existente (Steps 1-7 intactos)
- Rediseño completo de UI (las señales se agregan a surfaces existentes)
- HRIS integration (fuera del scope de este task)
- Real-time streaming (el batch actual es suficiente para Phase 1 y 2)

## Orden de ejecución

### Phase 1 — AI Intelligence

```
Slice 1 (Anomaly) → Slice 2 (Root Cause) → Slice 3 (Predictions)
                                                    ↓
                                          Slice 4 (Capacity)
                                                    ↓
                                          Slice 5 (Recommendations)
                                                    ↓
                                          Slice 6 (Quality/LLM)
```

### Phase 2 — Robustness

```
Slice 7 (Data Quality) ──→ mejora confianza de Slices 1-3
         ↓
Slice 8 (Revenue Weight) ─→ agrega dimensión económica a recommendations
         ↓
Slice 9 (CSC Markov) ─────→ reemplaza predicción lineal con modelo de pipeline
         ↓
Slice 10 (Seasonality) ───→ mejora anomaly detection con ajuste estacional
         ↓
Slice 11 (Maturity) ──────→ targets dinámicos por etapa de Space
         ↓
Slice 12 (Member Growth) ─→ trajectory y peer comparison en Person 360
         ↓
Slice 13 (Cross-Schema) ──→ señales compuestas ICO × Finance × Payroll × Email
```

**Nota:** Slice 7 (Data Quality) es el prerequisite más crítico de Phase 2 — idealmente se ejecuta antes o en paralelo con Phase 1 Slice 1. Sin calidad de datos medida, las señales de IA carecen de confianza.

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

### Slice 7 — Data Quality Scoring
- [ ] `data_quality` score (0-100%) calculado por Space en cada materialización
- [ ] Per-metric confidence: `otd_confidence`, `rpa_confidence`, `ftr_confidence`
- [ ] Señal `data_quality` cuando score < 70%
- [ ] Slices 1-3 degradan confianza de señales cuando quality score es bajo

### Slice 8 — Revenue-Weighted Metrics
- [ ] `revenue_weighted_otd` calculado a nivel agency
- [ ] `revenue_at_risk` calculado (sum revenue de Spaces degradados)
- [ ] Señal `revenue_risk` cuando `revenue_at_risk > 20%` del total

### Slice 9 — CSC Pipeline Analytics
- [ ] Transition matrix calculada por Space (rolling 6 meses)
- [ ] Dwell time promedio por fase por Space
- [ ] Predicted delivery date por task activa basada en fase actual + Markov
- [ ] Bottleneck identification (fase con mayor dwell time)

### Slice 10 — Seasonality Model
- [ ] Seasonal index por (Space, metric, month) con >=12 meses de data
- [ ] Anomaly detector usa `seasonally_adjusted_value` cuando disponible
- [ ] Spaces con <12 meses no reciben ajuste (fallback a z-score simple)

### Slice 11 — Operational Maturity Model
- [ ] Spaces clasificados en 4 etapas (Onboarding → Excelling)
- [ ] Thresholds de semáforo ajustados por etapa
- [ ] Señal de progresión cuando un Space cambia de etapa

### Slice 12 — Member Growth Trajectory
- [ ] `otd_trend`, `growth_signal`, `otd_percentile` por miembro
- [ ] Early warning para declining trajectory (3+ meses consecutivos)
- [ ] Peer comparison visible en Person 360

### Slice 13 — Multi-Source Enrichment
- [ ] Cost-per-delivery calculado (compensation / throughput)
- [ ] Revenue-delivery correlation detectada
- [ ] Dedication-performance mismatch flagged
- [ ] Señales `cross_signal` persistidas en `ai_signals`

### Transversal
- [ ] Zero TS errors, lint clean
- [ ] `pnpm build` pasa
- [ ] Ops Health muestra AI Core como subsystem
- [ ] Señales sincronizadas a `greenhouse_serving.ico_ai_signals` vía cron o reactive
- [ ] Cada slice degrada gracefully si falla (no bloquea materialización ni otros slices)
