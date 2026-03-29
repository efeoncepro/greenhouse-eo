# GREENHOUSE_AI_INTELLIGENCE_LAYER_V1.md

## Objetivo

Definir la arquitectura de la **AI Intelligence Layer** de Greenhouse: una capa de inteligencia cross-module que genera scores, alertas y predicciones a partir de la composición de señales de todos los módulos operativos — más allá de Nexa como interfaz conversacional.

## Contexto y motivación

### Por qué existe esta capa

Greenhouse tiene hoy un grafo de identidad canónico (`greenhouse_core`), un sistema de eventos reactivo (`outbox_events` + `projection_registry`), y un dual-store maduro (PostgreSQL OLTP + BigQuery OLAP). Cada módulo genera data valiosa:

- **Payroll** → costo laboral, compensación, deducciones, KPIs de bonus
- **Finance** → ingresos, gastos, receivables, tipo de cambio, indicadores económicos
- **ICO** → OTD%, FTR%, RPA, cycle time, throughput, stuck assets
- **Capacity** → FTE allocation, loaded cost, utilización, overhead
- **HR** → leave patterns, org structure, contract types, seniority
- **CRM** → deal pipeline, company health, contact engagement
- **Delivery** → sprint velocity, task completion, multi-assignee attribution
- **Account 360** → memberships, organizational structure, space bindings

Pero esa data vive en módulos aislados. **Ningún módulo individual puede responder preguntas que cruzan dominios:**

| Pregunta | Requiere cruzar |
|----------|----------------|
| ¿Este cliente es rentable considerando calidad de delivery? | Finance + ICO + Capacity |
| ¿Este colaborador está rindiendo bien para su costo? | ICO + Payroll + Capacity |
| ¿El margen de este space se va a comprimir el próximo mes? | Finance + Payroll + Capacity + FX trends |
| ¿Qué proyectos tienen riesgo de incumplir? | ICO + Capacity + Delivery + HR (leaves) |
| ¿El período está listo para cerrarse en todos los módulos? | Payroll + Finance + Capacity + ICO |
| ¿Qué clientes deberían contratar un servicio adicional? | CRM + Service Modules + ICO + Finance |

### Decisión arquitectónica

**La AI Intelligence Layer NO es un módulo de analytics, no es un data warehouse, y no es Nexa.**

| Concepto | AI Intelligence Layer | Nexa | Cost Intelligence | BigQuery Marts |
|----------|----------------------|------|-------------------|---------------|
| **Qué es** | Motor de scoring y predicción cross-module | Interfaz conversacional | Orquestador de cierre y P&L | Read models analíticos |
| **Genera** | Scores, alertas, features temporales | Respuestas en lenguaje natural | Period closure status, PnL snapshots | Tablas/vistas desnormalizadas |
| **Consume** | Eventos de todos los módulos | Scores de la Intelligence Layer + data directa | Payroll + Finance + Capacity | Raw + conformed |
| **Persiste en** | `greenhouse_ai` schema (Postgres) | Conversaciones (futuro) | `greenhouse_cost_intelligence` schema | BigQuery datasets |
| **Trigger** | Reactive projections (event-driven) | User prompt | Period events | Scheduled queries |

**Nexa es consumidor de esta capa, no competidor.** La Intelligence Layer genera los insights; Nexa (y dashboards, y alertas, y APIs) los surfacean.

### Relación con Cost Intelligence

Cost Intelligence (`GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`) es el orquestador de cierre de período y P&L operativo. La AI Intelligence Layer **extiende** esa visión:

- Cost Intelligence responde: "¿Cuál fue el margen real este mes?" (retrospectivo, determinístico)
- AI Intelligence Layer responde: "¿El margen se va a comprimir el próximo mes?" (predictivo, probabilístico)

Cost Intelligence sigue siendo owner de period closure y P&L snapshots. AI Intelligence Layer consume esos outputs como features.

## 1. Principios de diseño

### 1.1 Determinístico primero, ML después

Los composite scores con pesos configurables cubren ~80% del valor de inteligencia cross-module. ML supervisado solo se justifica cuando:
- Hay outcomes etiquetados (e.g., cliente churneó, proyecto falló deadline, colaborador se fue)
- El volumen de datos históricos es suficiente (>6 meses de períodos cerrados)
- La heurística determinística ya no mejora con ajuste de pesos

**Regla: no entrenar modelos sin labels. Heurísticas transparentes > black boxes sin feedback.**

### 1.2 Reactivo, no batch

La Intelligence Layer se alimenta del mismo outbox/projection system que ya existe. Cuando un evento ocurre (payroll exportado, ICO materializado, income registrado), los scores afectados se recalculan.

Para features temporales que requieren historia (tendencias, regresiones), se usa BigQuery como feature store de lectura, no como trigger.

### 1.3 Transparente y explicable

Cada score debe ser descomponible en sus factores:

```
Client Health Score: 72/100
├─ Revenue Health: 85/100 (income stable, 15d avg payment)
├─ Delivery Quality: 65/100 (OTD cayó 12% vs mes anterior)
├─ Team Stability: 80/100 (FTE allocation estable, 0 rotación)
└─ Pipeline Momentum: 58/100 (1 deal estancado >45d)
```

**Regla: si un score no puede explicarse en ≤4 factores con lenguaje natural, está mal diseñado.**

### 1.4 Vive en `greenhouse_ai`, no en un store nuevo

El schema `greenhouse_ai` ya existe y tiene tablas de AI tooling. La Intelligence Layer extiende ese schema con tablas de features, scores y alerts. No se crea un tercer data store.

### 1.5 Canonical IDs como join keys

Todos los scores y features referencian el grafo canónico: `client_id`, `member_id`, `space_id`, `organization_id`, `profile_id`. Nunca source IDs.

### 1.6 Multi-granularidad temporal

Los scores se materializan por período operativo (`year`, `month`) alineado con el calendario de payroll y finance. Algunos scores tienen también granularidad semanal (delivery risk) o diaria (anomaly alerts).

## 2. Arquitectura general

```
┌──────────────────────────────────────────────────────────────────┐
│                         Surfaces                                  │
│  Executive Dashboard │ Agency Workspace │ People 360 │ Client 360 │
│  Nexa (conversational) │ Notifications │ Admin │ API consumers   │
└──────────────────┬───────────────────────────────────────────────┘
                   │ reads from greenhouse_serving + greenhouse_ai
                   │
┌──────────────────┴───────────────────────────────────────────────┐
│                    AI Intelligence Layer                          │
│                    greenhouse_ai schema                           │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐ │
│  │  Feature Store  │  │  Score Store   │  │  Alert Store       │ │
│  │  (temporal      │  │  (materialized │  │  (threshold +      │ │
│  │   features per  │  │   composites   │  │   anomaly +        │ │
│  │   entity/period)│  │   per entity/  │  │   trend-based)     │ │
│  │                 │  │   period)      │  │                    │ │
│  └────────┬───────┘  └───────┬────────┘  └─────────┬──────────┘ │
│           │                   │                      │            │
│  ┌────────┴───────────────────┴──────────────────────┴──────────┐│
│  │              Scoring / Inference Engine                       ││
│  │  - Composite scorers (weighted, configurable)                ││
│  │  - Trend detectors (regression, moving averages)             ││
│  │  - Anomaly detectors (z-score, IQR)                          ││
│  │  - Future: ML models (when labeled outcomes exist)           ││
│  └──────────────────────────┬───────────────────────────────────┘│
│                              │                                    │
├──────────────────────────────┼────────────────────────────────────┤
│  Event-Driven Triggers       │                                    │
│  ┌───────────────────────────┴──────────────────────────────────┐│
│  │  projection_registry → ai_intelligence domain handlers       ││
│  │  Triggers: ico.materialization.completed,                    ││
│  │            payroll_period.exported,                           ││
│  │            finance.income.created,                            ││
│  │            compensation_version.created,                      ││
│  │            assignment.created/updated,                        ││
│  │            finance.exchange_rate.upserted                    ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  Source Modules (no modificados — solo se leen)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────┐ ┌──────────┐ ┌─────┐ ┌──────┐│
│  │ Payroll │ │ Finance │ │ ICO │ │ Capacity │ │ CRM │ │  HR  ││
│  └─────────┘ └─────────┘ └─────┘ └──────────┘ └─────┘ └──────┘│
│  ┌──────────┐ ┌─────────────┐ ┌──────────────┐                  │
│  │ Delivery │ │ Account 360 │ │ Service Mods │                  │
│  └──────────┘ └─────────────┘ └──────────────┘                  │
└───────────────────────────────────────────────────────────────────┘
```

### Flujo de datos

```
1. Módulo fuente muta data → publica outbox_event
2. outbox-react cron detecta evento → busca handlers en projection_registry
3. Handler de ai_intelligence domain:
   a. Lee features necesarias de PostgreSQL (serving views, domain tables)
   b. Opcionalmente lee features temporales de BigQuery (trends, history)
   c. Ejecuta scoring engine (composite weights / trend detection / anomaly)
   d. Persiste score + breakdown en greenhouse_ai.scores
   e. Evalúa alert thresholds → persiste alerts si threshold cruzado
   f. Publica outbox_event (ai.score.updated, ai.alert.triggered)
4. Surfaces leen scores/alerts de greenhouse_ai vía API routes
5. Nexa puede consultar scores como tool calls
```

## 3. Schema: `greenhouse_ai` (extensión)

Las tablas existentes de AI tooling (`ai_tool_catalog`, `ai_credit_wallets`, `member_tool_licenses`, etc.) no se modifican. Se agregan tablas para la Intelligence Layer:

### 3.1 `greenhouse_ai.intelligence_features`

Feature store temporal — features pre-computadas por entidad y período.

```sql
CREATE TABLE greenhouse_ai.intelligence_features (
  feature_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       TEXT NOT NULL,            -- 'client', 'member', 'space', 'organization'
  entity_id         UUID NOT NULL,            -- FK a canonical anchor
  feature_key       TEXT NOT NULL,            -- 'revenue_mom_change', 'otd_pct', 'utilization_rate'
  period_year       INT NOT NULL,
  period_month      INT NOT NULL,
  feature_value     NUMERIC,                  -- valor numérico normalizado
  feature_metadata  JSONB DEFAULT '{}',       -- contexto adicional (currency, source, raw_value)
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_event_id   UUID,                     -- outbox_event que triggeró el cómputo

  UNIQUE (entity_type, entity_id, feature_key, period_year, period_month)
);

CREATE INDEX idx_features_entity ON greenhouse_ai.intelligence_features
  (entity_type, entity_id, period_year, period_month);

CREATE INDEX idx_features_key ON greenhouse_ai.intelligence_features
  (feature_key, period_year, period_month);
```

### 3.2 `greenhouse_ai.intelligence_scores`

Scores compuestos materializados por entidad y período.

```sql
CREATE TABLE greenhouse_ai.intelligence_scores (
  score_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_type        TEXT NOT NULL,            -- 'client_health', 'person_intelligence', 'margin_risk', 'delivery_risk', 'period_readiness'
  entity_type       TEXT NOT NULL,            -- 'client', 'member', 'space', 'organization', 'project'
  entity_id         UUID NOT NULL,
  period_year       INT NOT NULL,
  period_month      INT NOT NULL,

  -- Score principal
  score_value       NUMERIC NOT NULL,         -- 0-100 normalizado
  score_grade       TEXT,                     -- 'critical', 'at_risk', 'healthy', 'excellent'
  confidence        NUMERIC,                  -- 0-1, qué tan completos están los inputs

  -- Breakdown explicable
  factors           JSONB NOT NULL,           -- array de { factor_key, factor_label, weight, raw_value, weighted_score, trend }

  -- Metadata
  scoring_version   TEXT NOT NULL,            -- 'v1.0-deterministic', 'v2.0-ml-gradient-boost'
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_event_ids  UUID[],                   -- eventos que triggeraron el cómputo
  previous_score    NUMERIC,                  -- score del período anterior (para delta)

  UNIQUE (score_type, entity_type, entity_id, period_year, period_month)
);

CREATE INDEX idx_scores_lookup ON greenhouse_ai.intelligence_scores
  (score_type, entity_type, entity_id, period_year DESC, period_month DESC);

CREATE INDEX idx_scores_grade ON greenhouse_ai.intelligence_scores
  (score_type, score_grade, period_year, period_month);
```

### 3.3 `greenhouse_ai.intelligence_alerts`

Alertas generadas cuando un score cruza un threshold o una anomalía se detecta.

```sql
CREATE TABLE greenhouse_ai.intelligence_alerts (
  alert_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type        TEXT NOT NULL,            -- 'margin_erosion', 'delivery_risk', 'client_health_drop', 'anomaly_expense', 'period_blocker'
  severity          TEXT NOT NULL,            -- 'info', 'warning', 'critical'
  entity_type       TEXT NOT NULL,
  entity_id         UUID NOT NULL,
  period_year       INT NOT NULL,
  period_month      INT NOT NULL,

  -- Contenido
  title             TEXT NOT NULL,            -- "Margen de Acme Corp cayó 15% vs mes anterior"
  description       TEXT,                     -- explicación expandida
  factors           JSONB,                    -- factores que contribuyeron

  -- Lifecycle
  status            TEXT NOT NULL DEFAULT 'active',  -- 'active', 'acknowledged', 'resolved', 'dismissed'
  triggered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at   TIMESTAMPTZ,
  acknowledged_by   UUID,                     -- user_id
  resolved_at       TIMESTAMPTZ,

  -- Traceability
  score_id          UUID REFERENCES greenhouse_ai.intelligence_scores(score_id),
  source_event_ids  UUID[]
);

CREATE INDEX idx_alerts_active ON greenhouse_ai.intelligence_alerts
  (status, severity, triggered_at DESC) WHERE status = 'active';

CREATE INDEX idx_alerts_entity ON greenhouse_ai.intelligence_alerts
  (entity_type, entity_id, period_year, period_month);
```

### 3.4 `greenhouse_ai.scoring_configs`

Configuración de pesos y thresholds por tipo de score — permite tuning sin deploy.

```sql
CREATE TABLE greenhouse_ai.scoring_configs (
  config_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_type        TEXT NOT NULL UNIQUE,     -- 'client_health', 'person_intelligence', etc.
  version           TEXT NOT NULL,            -- 'v1.0'

  -- Configuración de factores
  factor_weights    JSONB NOT NULL,           -- { "revenue_health": 0.30, "delivery_quality": 0.25, ... }

  -- Thresholds para grades
  grade_thresholds  JSONB NOT NULL,           -- { "excellent": 85, "healthy": 65, "at_risk": 40, "critical": 0 }

  -- Thresholds para alertas
  alert_rules       JSONB NOT NULL DEFAULT '[]',  -- [{ "condition": "score_drop_pct > 15", "severity": "warning", "alert_type": "..." }]

  -- Governance
  active            BOOLEAN NOT NULL DEFAULT true,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        TEXT                      -- quién ajustó los pesos
);
```

### 3.5 Serving views (en `greenhouse_serving`)

```sql
-- Vista para consumo rápido del último score por entidad
CREATE VIEW greenhouse_serving.latest_intelligence_scores AS
SELECT DISTINCT ON (s.score_type, s.entity_type, s.entity_id)
  s.score_id,
  s.score_type,
  s.entity_type,
  s.entity_id,
  s.period_year,
  s.period_month,
  s.score_value,
  s.score_grade,
  s.confidence,
  s.factors,
  s.previous_score,
  s.score_value - COALESCE(s.previous_score, s.score_value) AS score_delta,
  s.computed_at
FROM greenhouse_ai.intelligence_scores s
ORDER BY s.score_type, s.entity_type, s.entity_id,
         s.period_year DESC, s.period_month DESC;

-- Vista de alertas activas para dashboards
CREATE VIEW greenhouse_serving.active_intelligence_alerts AS
SELECT
  a.alert_id,
  a.alert_type,
  a.severity,
  a.entity_type,
  a.entity_id,
  a.period_year,
  a.period_month,
  a.title,
  a.description,
  a.factors,
  a.triggered_at,
  a.score_id,
  s.score_value,
  s.score_grade
FROM greenhouse_ai.intelligence_alerts a
LEFT JOIN greenhouse_ai.intelligence_scores s ON a.score_id = s.score_id
WHERE a.status = 'active'
ORDER BY
  CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
  a.triggered_at DESC;
```

## 4. Oportunidades de inteligencia cross-module

### 4.1 Client Health Score

**Objetivo:** Scoring unificado de salud de un cliente que ningún módulo individual puede producir.

**Tipo:** `score_type = 'client_health'`, `entity_type = 'client'`

#### Factores y pesos (v1.0)

| Factor | Peso | Fuente | Feature keys | Cómo se calcula |
|--------|------|--------|-------------|-----------------|
| Revenue Health | 0.30 | Finance | `revenue_mom_change`, `avg_days_to_payment`, `receivables_aging` | Income MoM trend + payment behavior. Score 100 si income estable/creciente y pago <15d; penaliza receivables >60d |
| Delivery Quality | 0.25 | ICO | `otd_pct`, `ftr_pct`, `avg_cycle_time`, `stuck_asset_count` | Composite de OTD + FTR del período. Penaliza stuck assets y cycle time creciente |
| Team Stability | 0.20 | Capacity + HR | `fte_allocation_delta`, `team_turnover_rate`, `leave_density` | FTE allocation estable = bueno. Rotación alta o leave density concentrada = riesgo |
| Pipeline Momentum | 0.15 | CRM | `active_deals_count`, `avg_deal_age`, `pipeline_value_trend` | Deals activos en movimiento = momentum. Deals estancados >45d penalizan |
| Engagement Depth | 0.10 | Service Modules + Account 360 | `active_modules_count`, `membership_density`, `portal_activity` | Más servicios contratados + más personas activas = mayor engagement |

#### Grade thresholds

| Grade | Rango | Significado |
|-------|-------|-------------|
| `excellent` | 85–100 | Cliente sano, expansión probable |
| `healthy` | 65–84 | Sin riesgos inmediatos, monitoreo normal |
| `at_risk` | 40–64 | Señales de deterioro, requiere atención del account manager |
| `critical` | 0–39 | Riesgo de churn o pérdida. Intervención urgente |

#### Alert rules

| Condición | Severidad | Alert type |
|-----------|-----------|------------|
| Score < 40 | `critical` | `client_health_critical` |
| Score dropped >15 pts vs mes anterior | `warning` | `client_health_drop` |
| Revenue Health < 30 AND Delivery Quality < 40 | `critical` | `client_compound_risk` |
| Pipeline Momentum < 20 por 2+ meses consecutivos | `warning` | `client_pipeline_stall` |

#### Eventos trigger

- `finance.income.created` / `finance.income.updated` → recalcula Revenue Health
- `ico.materialization.completed` → recalcula Delivery Quality
- `assignment.created` / `assignment.updated` / `assignment.removed` → recalcula Team Stability
- `finance.exchange_rate.upserted` → recalcula si client tiene contratos en moneda distinta a CLP

#### Dependencias

- **Requiere (ya existe):** `fin_income`, `fin_expenses`, ICO materialized tables, `member_capacity_economics`, `client_service_modules`
- **Requiere (parcial):** CRM deals projected en PostgreSQL (hoy BigQuery-primary)
- **No requiere:** ML — composite weights son suficientes para v1

#### Superficies de consumo

- Executive Dashboard: card "Client Health" con grade + sparkline de trend
- Agency Workspace: ranked list de clientes por score, filtrable por grade
- Client 360: header badge con score + breakdown expandible
- Nexa: "¿Cómo está [cliente]?" → responde con score + factores
- Alertas: notificación proactiva cuando score cruza threshold

---

### 4.2 Person Intelligence Score

**Objetivo:** Evolucionar la reactive projection `person_intelligence` (hoy descriptiva) en un score compuesto que mida rendimiento, eficiencia de costo, confiabilidad y trayectoria de crecimiento por colaborador.

**Tipo:** `score_type = 'person_intelligence'`, `entity_type = 'member'`

#### Factores y pesos (v1.0)

| Factor | Peso | Fuente | Feature keys | Cómo se calcula |
|--------|------|--------|-------------|-----------------|
| Performance Index | 0.35 | ICO + Delivery | `otd_pct_member`, `ftr_pct_member`, `throughput_normalized`, `rpa_member` | OTD + FTR + throughput normalizado por rol/seniority. RPA bajo = mejor. Normalización: comparar vs. media del equipo |
| Cost Efficiency | 0.25 | Capacity + Payroll | `output_per_loaded_cost`, `utilization_rate`, `billable_ratio` | Output (throughput * quality) / loaded cost mensual. Utilización target ~80% |
| Reliability | 0.20 | HR + Capacity | `leave_pattern_score`, `assignment_stability`, `attendance_consistency` | Leave patterns predecibles = bueno. Cambios frecuentes de assignment = inestabilidad. Ausencias no planificadas penalizan |
| Growth Trajectory | 0.20 | Payroll + ICO | `compensation_velocity`, `performance_velocity`, `skill_breadth` | Compensación creciendo + performance creciendo = trayectoria sana. Compensación creciendo + performance estancada = riesgo de desalineación |

#### Normalización por rol y seniority

El score NO compara un diseñador junior con un tech lead senior. Cada factor se normaliza contra la cohorte relevante:

```
cohort = members WHERE job_level = target.job_level
                  AND department_id = target.department_id
normalized_value = (raw_value - cohort_mean) / cohort_stddev
```

Si la cohorte es <3 personas, se usa la media global con un penalty de confidence.

#### Grade thresholds

| Grade | Rango | Significado |
|-------|-------|-------------|
| `top_performer` | 85–100 | Excede expectativas consistentemente |
| `on_track` | 65–84 | Desempeño esperado para su nivel |
| `needs_attention` | 40–64 | Algún factor por debajo del esperado |
| `underperforming` | 0–39 | Múltiples factores en deterioro |

#### Alert rules

| Condición | Severidad | Alert type |
|-----------|-----------|------------|
| Growth Trajectory: comp velocity > 2x performance velocity por 3+ meses | `warning` | `person_comp_performance_divergence` |
| Performance Index cayó >20 pts en un mes | `warning` | `person_performance_drop` |
| Utilization < 50% por 2+ meses | `info` | `person_underutilized` |
| Cost Efficiency < 25 AND Performance < 40 | `critical` | `person_compound_risk` |

#### Eventos trigger

- `ico.materialization.completed` → recalcula Performance Index
- `payroll_period.exported` / `payroll_entry.upserted` → recalcula Cost Efficiency
- `compensation_version.created` → recalcula Growth Trajectory
- `leave_request.approved` / `leave_request.cancelled` → recalcula Reliability
- `assignment.created` / `assignment.updated` → recalcula Reliability + Cost Efficiency

#### Dependencias

- **Requiere (ya existe):** `person_intelligence` projection, `member_capacity_economics`, `payroll_entries`, `compensation_versions`, ICO member metrics
- **Requiere (parcial):** ICO metrics per member (multi-assignee attribution ya resuelto en conformed layer, pero ICO member metrics en PostgreSQL projection aún en desarrollo)
- **Requiere (nuevo):** Normalización por cohorte (helper en scoring engine)

#### Superficies de consumo

- People 360: tab "Intelligence" con score + breakdown + trend chart
- Agency Team: columna sortable con score + grade badge
- Payroll bonus calibration: score como input para ajustar KPI thresholds
- HR manager view: dashboard de equipo con distribución de grades
- Nexa: "¿Cómo está rindiendo [persona]?" → score + factores
- Alertas: notificación a HR manager cuando `needs_attention` o `underperforming`

#### Consideraciones éticas

- El score **no es un ranking público**. Solo visible para HR managers, efeonce_admin, y el propio colaborador (su tab en My Greenhouse)
- El score **nunca es el único input** para decisiones de compensación o desvinculación. Es una señal más.
- Los pesos son auditables y configurables. Si un factor genera sesgos, se ajusta sin redeploy.
- El colaborador puede ver su breakdown y entender qué lo afecta.

---

### 4.3 Margin Erosion Prediction

**Objetivo:** Detectar ANTES de que ocurra que el margen de un cliente o space se va a comprimir, usando señales tempranas de múltiples módulos.

**Tipo:** `score_type = 'margin_risk'`, `entity_type = 'client'` o `'space'`

#### Señales de erosión (features)

| Señal | Fuente | Feature key | Peso en riesgo |
|-------|--------|-------------|---------------|
| Costo laboral subiendo sin income proporcional | Payroll + Finance | `labor_cost_mom_change`, `income_mom_change` | 0.25 |
| FTE asignados aumentando sin ajuste de tarifa | Capacity + Finance | `fte_delta_vs_income_delta` | 0.20 |
| ICO metrics degradándose (más rounds, más cycle time) | ICO | `rpa_trend`, `cycle_time_trend` | 0.20 |
| Tipo de cambio erosionando contratos USD/CLP | Finance | `fx_impact_on_margin` | 0.15 |
| Overhead allocation creciendo por member | Capacity | `overhead_per_member_trend` | 0.10 |
| Compensación creciendo (ajuste por inflación/UF) | Payroll | `comp_growth_rate` | 0.10 |

#### Método de scoring

A diferencia de Client Health (que es un composite estático), Margin Risk usa **trend detection**:

```
Para cada feature:
  1. Obtener serie temporal de últimos 6 períodos
  2. Calcular tendencia (regresión lineal simple)
  3. Si tendencia es adversa Y significativa (p < 0.1), contribuye al risk score
  4. Ponderar por peso del factor

Risk Score = Σ(peso_i * trend_severity_i * trend_significance_i)
```

El risk score se invierte para normalizar: 100 = sin riesgo, 0 = erosión severa inminente.

#### Alert rules

| Condición | Severidad | Alert type |
|-----------|-----------|------------|
| Risk score < 40 (erosión probable) | `critical` | `margin_erosion_imminent` |
| Labor cost growth > income growth por 3+ meses | `warning` | `margin_labor_cost_divergence` |
| FX impact > 5% del margen esperado | `warning` | `margin_fx_erosion` |
| ICO efficiency degrading + cost rising simultáneamente | `critical` | `margin_compound_erosion` |

#### Eventos trigger

- `payroll_period.exported` → recalcula labor cost trends
- `finance.income.created` → recalcula income trends
- `finance.exchange_rate.upserted` → recalcula FX impact
- `ico.materialization.completed` → recalcula efficiency trends
- `compensation_version.created` → recalcula compensation growth

#### Dependencias

- **Requiere (ya existe):** `member_capacity_economics`, `fin_income`, `fin_expenses`, `payroll_entries`, ICO materialized, `compensation_versions`, exchange rates
- **Requiere (nuevo):** Trend computation helpers (regresión lineal simple sobre feature history), FX impact calculator
- **Requiere (de Cost Intelligence):** `operational_pl_snapshots` para margen base contra el cual medir erosión

#### Superficies de consumo

- Cost Intelligence dashboard: overlay de risk sobre P&L actual
- Agency Workspace: badge de riesgo por cliente
- Client 360: alerta proactiva cuando risk score < 60
- Executive Dashboard: "Top 3 clientes con riesgo de margen"
- Nexa: "¿Algún cliente con riesgo de margen?" → lista rankeada con factores

---

### 4.4 Smart Period Closure

**Objetivo:** Automatizar la detección de readiness del cierre mensual verificando que todos los módulos hayan completado sus procesos — reemplazando la verificación manual actual.

**Tipo:** `score_type = 'period_readiness'`, `entity_type = 'organization'`

#### Precondiciones de cierre

| Precondición | Módulo source | Evento que la satisface | Feature key |
|-------------|--------------|------------------------|-------------|
| Payroll aprobado | Payroll | `payroll_period.approved` para el período | `payroll_approved` |
| Payroll exportado | Payroll | `payroll_period.exported` para el período | `payroll_exported` |
| ICO materializado | ICO | `ico.materialization.completed` para el período | `ico_materialized` |
| Finance income reconciliado | Finance | Todos los ingresos del período con `status = 'confirmed'` | `income_reconciled` |
| Finance expenses registrados | Finance | Sin expenses `status = 'pending_review'` para el período | `expenses_reviewed` |
| Capacity economics actualizado | Capacity | `member_capacity_economics` refreshed post-payroll | `capacity_refreshed` |
| Exchange rates actualizados | Finance | Exchange rate del período disponible | `fx_rates_current` |

#### Método de scoring

El readiness score es binario por precondición, pero el score general es un porcentaje:

```
readiness_score = (precondiciones_cumplidas / total_precondiciones) * 100
readiness_grade = readiness_score == 100 ? 'ready' : readiness_score >= 70 ? 'almost_ready' : 'blocked'
```

Cada precondición tiene un `blocking` flag. Si una precondición `blocking = true` no se cumple, el grade nunca puede ser `ready` sin importar el score numérico.

#### Factores en el breakdown

```json
{
  "factors": [
    { "factor_key": "payroll_exported", "factor_label": "Payroll exportado", "status": "complete", "completed_at": "2026-03-28T...", "blocking": true },
    { "factor_key": "ico_materialized", "factor_label": "ICO materializado", "status": "complete", "completed_at": "2026-03-29T...", "blocking": true },
    { "factor_key": "income_reconciled", "factor_label": "Income reconciliado", "status": "pending", "pending_items": 3, "blocking": true },
    { "factor_key": "expenses_reviewed", "factor_label": "Expenses revisados", "status": "complete", "blocking": false }
  ]
}
```

#### Alert rules

| Condición | Severidad | Alert type |
|-----------|-----------|------------|
| Día 5 del mes siguiente y readiness < 100 | `warning` | `period_closure_delayed` |
| Día 10 del mes siguiente y readiness < 100 | `critical` | `period_closure_overdue` |
| Todas las precondiciones cumplidas | `info` | `period_ready_to_close` |

#### Eventos trigger

- `payroll_period.approved` → marca `payroll_approved = complete`
- `payroll_period.exported` → marca `payroll_exported = complete`
- `ico.materialization.completed` → marca `ico_materialized = complete`
- `finance.income.updated` → re-evalúa `income_reconciled`
- `finance.exchange_rate.upserted` → marca `fx_rates_current = complete`

#### Relación con Cost Intelligence

Smart Period Closure **complementa** el period closure de Cost Intelligence:
- Cost Intelligence es owner del **acto de cerrar** (confirmar, snapshot P&L, lock)
- AI Intelligence Layer es owner de la **detección de readiness** (¿está todo listo?)
- Cuando readiness = 100%, se puede triggerar auto-closure en Cost Intelligence (configurable)

#### Dependencias

- **Requiere (ya existe):** Outbox events de todos los módulos involucrados, `payroll_periods`, ICO materialization cron, Finance stores
- **Requiere (nuevo):** Checklist config table o extensión de `scoring_configs`
- **Requiere (de Cost Intelligence):** `period_closure_status` para el lock final

#### Superficies de consumo

- Admin dashboard: checklist visual de readiness del período actual
- Cost Intelligence: input para auto-closure toggle
- Nexa: "¿Ya podemos cerrar el mes?" → checklist con status por precondición
- Notificaciones: alerta cuando readiness = 100% o cuando se pasa del día 5

---

### 4.5 Delivery Risk Prediction

**Objetivo:** Predecir qué proyectos o sprints tienen riesgo de incumplir deadlines, combinando señales de ICO, Capacity, Delivery, y HR.

**Tipo:** `score_type = 'delivery_risk'`, `entity_type = 'project'` o `'sprint'`

#### Prerequisito bloqueante

> **Esta oportunidad depende de la canonicalización de Project y Sprint en PostgreSQL.** Hoy ambos son BigQuery-primary. Hasta que no existan `greenhouse_delivery.projects` y `greenhouse_delivery.sprints` como operational projections con IDs canónicos, este score no puede materializarse reactivamente.
>
> Ver: `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — Phase 2 migration.

#### Señales de riesgo (features)

| Señal | Fuente | Feature key | Peso |
|-------|--------|-------------|------|
| Cycle time trending up en últimos 3 sprints | ICO | `cycle_time_trend_3s` | 0.25 |
| Throughput trending down | ICO | `throughput_trend_3s` | 0.20 |
| Stuck assets > 0 | ICO | `stuck_asset_count` | 0.15 |
| Team allocation < planned FTE | Capacity | `allocation_gap` | 0.15 |
| Upcoming approved leaves overlap sprint dates | HR | `leave_overlap_days` | 0.10 |
| RPA (rounds per asset) trending up | ICO | `rpa_trend_3s` | 0.10 |
| Task completion rate declining | Delivery | `task_completion_rate_trend` | 0.05 |

#### Método de scoring

Similar a Margin Risk: trend-based con ventana de 3 sprints (no meses, porque delivery opera en sprints).

```
risk_score = 100 - Σ(peso_i * risk_signal_i_normalized)
```

100 = sin riesgo, 0 = incumplimiento casi seguro.

#### Alert rules

| Condición | Severidad | Alert type |
|-----------|-----------|------------|
| Risk score < 35 | `critical` | `delivery_high_risk` |
| Risk score < 55 AND sprint deadline en <7 días | `critical` | `delivery_imminent_risk` |
| Stuck assets > 3 AND cycle time trend positive | `warning` | `delivery_bottleneck` |
| Leave overlap > 30% del team en sprint activo | `warning` | `delivery_capacity_gap` |

#### Dependencias

- **Requiere (NO existe aún):** `greenhouse_delivery.projects` y `greenhouse_delivery.sprints` como Postgres operational projections
- **Requiere (ya existe):** ICO materialized metrics, `member_capacity_economics`, leave requests, task attribution
- **Requiere (nuevo):** Sprint-aligned temporal features (ventana por sprint, no por mes)

#### Superficies de consumo

- Agency Workspace: "Projects at Risk" panel con ranking
- Project detail view: risk badge + breakdown
- Sprint detail: risk overlay con factores
- Executive Dashboard: "Delivery Risk Summary" card
- Nexa: "¿Algún proyecto en riesgo?" → lista con factores

#### Phasing

| Sub-fase | Qué | Cuándo |
|----------|-----|--------|
| 5a | Canonicalizar Project/Sprint en PostgreSQL | Pre-requisito |
| 5b | Feature extraction por sprint (ICO + Capacity) | Post-canonicalización |
| 5c | Risk scoring engine + alerts | Post-features |
| 5d | Superficies UI | Post-scoring |

---

### 4.6 Intelligent Recommendations Engine

**Objetivo:** Generar recomendaciones contextuales que crucen todos los módulos para sugerir acciones concretas.

**Tipo:** `score_type = 'recommendation'`, `entity_type = variable`

#### Prerequisito bloqueante

> **Esta oportunidad requiere feedback loops que hoy no existen.** A diferencia de los scores anteriores (que son heurísticas determinísticas o trend-based), las recomendaciones requieren datos de outcomes para validar que las sugerencias son útiles.
>
> Sin labels (¿el usuario actuó? ¿el resultado fue positivo?), las recomendaciones serán heurísticas estáticas — útiles pero no inteligentes.

#### Tipos de recomendación previstos

| Recomendación | Cruza | Trigger | Ejemplo |
|---------------|-------|---------|---------|
| Upsell de servicio | CRM + Service Modules + Finance | Client Health > 80 AND active_modules < potential_modules | "Acme Corp usa solo CRM Solutions pero su perfil sugiere Wave como extensión" |
| Reasignación de equipo | Capacity + ICO + Person Intelligence | Person underutilized AND otro project con capacity gap | "María está al 40% utilización; Proyecto X necesita +0.5 FTE de diseño" |
| Ajuste de tarifa | Finance + Capacity + Margin Risk | Margin erosion detected AND tarifa no ajustada en >6 meses | "La tarifa de Space Y no se ajusta desde sept 2025; el margen real cayó 12%" |
| Intervención de cuenta | Client Health + CRM | Client Health dropped to `at_risk` AND no deal activity in 30d | "El score de Acme bajó a 'at risk' — considerar review meeting" |
| Compensación review | Person Intelligence + Payroll | Performance top_performer AND comp below cohort median for >6 months | "Juan lleva 6 meses como top_performer con comp por debajo de la mediana de su cohorte" |

#### Arquitectura de feedback loop (diseño futuro)

```
Recommendation generated → persisted in greenhouse_ai.recommendations
  ↓
Surfaced to user (dashboard, Nexa, notification)
  ↓
User action tracked:
  - 'dismissed' → no value signal
  - 'acknowledged' → weak positive signal
  - 'acted_upon' → strong positive signal (user took the recommended action)
  ↓
Outcome tracked (weeks/months later):
  - Did margin improve after tariff adjustment?
  - Did client health improve after account intervention?
  - Did delivery risk decrease after team reasignment?
  ↓
Feedback dataset accumulated → enables supervised ML
```

#### Schema adicional (futuro)

```sql
-- Solo se crea cuando se implemente esta oportunidad
CREATE TABLE greenhouse_ai.recommendations (
  recommendation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           UUID NOT NULL,

  title               TEXT NOT NULL,
  rationale           TEXT NOT NULL,           -- por qué se sugiere, con datos
  suggested_action    TEXT NOT NULL,           -- qué hacer concretamente

  -- Scores que motivaron la recomendación
  source_scores       JSONB,                  -- [{ score_type, score_value, factor_key }]

  -- Feedback loop
  status              TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'dismissed', 'acknowledged', 'acted_upon'
  outcome             JSONB,                  -- { measured_impact, follow_up_score_delta }

  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_at            TIMESTAMPTZ,
  outcome_measured_at TIMESTAMPTZ
);
```

#### Dependencias

- **Requiere:** Oportunidades 1-4 implementadas (scores como input)
- **Requiere (nuevo):** Feedback tracking, outcome measurement, recommendation generation rules
- **Requiere (futuro):** ML model training pipeline cuando haya suficientes labeled outcomes

#### Superficies de consumo

- Agency Workspace: "Recommended Actions" panel
- Nexa: "¿Qué debería priorizar hoy?" → top 3 recommendations con rationale
- Client 360: recommendations específicas para ese cliente
- People 360: recommendations de desarrollo o reasignación
- Executive Dashboard: "Strategic Recommendations" digest semanal

## 5. Scoring Engine: diseño de implementación

### 5.1 Estructura en el codebase

```
src/lib/intelligence/
├── engine/
│   ├── scoring-engine.ts         -- orquestador principal
│   ├── composite-scorer.ts       -- weighted composite (para Health, Person Intelligence)
│   ├── trend-scorer.ts           -- trend-based (para Margin Risk, Delivery Risk)
│   ├── checklist-scorer.ts       -- precondition-based (para Period Readiness)
│   └── types.ts                  -- ScoringInput, ScoringResult, Factor, Alert
│
├── features/
│   ├── feature-extractor.ts      -- orquestador de feature extraction
│   ├── finance-features.ts       -- revenue, expenses, FX, receivables
│   ├── ico-features.ts           -- OTD, FTR, RPA, cycle time, throughput
│   ├── capacity-features.ts      -- FTE, utilization, overhead, loaded cost
│   ├── payroll-features.ts       -- labor cost, compensation growth
│   ├── hr-features.ts            -- leave patterns, attendance
│   ├── crm-features.ts           -- deal pipeline, engagement
│   └── delivery-features.ts      -- task completion, sprint velocity
│
├── scores/
│   ├── client-health.ts          -- config + handler para client_health
│   ├── person-intelligence.ts    -- config + handler para person_intelligence
│   ├── margin-risk.ts            -- config + handler para margin_risk
│   ├── period-readiness.ts       -- config + handler para period_readiness
│   ├── delivery-risk.ts          -- config + handler para delivery_risk (stub)
│   └── recommendations.ts        -- config + handler para recommendations (stub)
│
├── alerts/
│   ├── alert-evaluator.ts        -- evalúa rules contra scores, genera alerts
│   └── alert-rules.ts            -- rule definitions por score_type
│
├── projections/
│   ├── ai-intelligence-handlers.ts  -- reactive projection handlers para el registry
│   └── registration.ts              -- registra handlers en projection_registry
│
└── stores/
    ├── feature-store.ts          -- CRUD greenhouse_ai.intelligence_features
    ├── score-store.ts            -- CRUD greenhouse_ai.intelligence_scores
    ├── alert-store.ts            -- CRUD greenhouse_ai.intelligence_alerts
    └── config-store.ts           -- read greenhouse_ai.scoring_configs
```

### 5.2 Flujo de ejecución de un score

```typescript
// Pseudocódigo del flujo cuando llega un evento trigger
async function handleIntelligenceEvent(event: OutboxEvent): Promise<void> {
  // 1. Determinar qué scores necesitan recalcularse
  const affectedScores = resolveAffectedScores(event.event_type)

  for (const scoreConfig of affectedScores) {
    // 2. Resolver entities afectadas
    const entities = await resolveAffectedEntities(event, scoreConfig)

    for (const entity of entities) {
      // 3. Extraer features
      const features = await extractFeatures(scoreConfig, entity)

      // 4. Persistir features
      await featureStore.upsertFeatures(features)

      // 5. Calcular score
      const scoringResult = scoreConfig.scorer.compute(features, scoreConfig.weights)

      // 6. Obtener score anterior para delta
      const previousScore = await scoreStore.getPreviousScore(scoreConfig.type, entity)

      // 7. Persistir score
      await scoreStore.upsertScore({
        ...scoringResult,
        previous_score: previousScore?.score_value,
        source_event_ids: [event.event_id]
      })

      // 8. Evaluar alerts
      const alerts = alertEvaluator.evaluate(scoringResult, scoreConfig.alertRules)

      // 9. Persistir alerts
      for (const alert of alerts) {
        await alertStore.createAlert(alert)
      }

      // 10. Publicar evento de score actualizado
      await publishOutboxEvent({
        event_type: `ai.score.${scoreConfig.type}.updated`,
        aggregate_type: 'intelligence_score',
        aggregate_id: scoringResult.score_id,
        payload: { entity_type: entity.type, entity_id: entity.id, score_value: scoringResult.score_value, score_grade: scoringResult.score_grade }
      })
    }
  }
}
```

### 5.3 Integración con projection_registry

Los handlers de AI Intelligence se registran en el mismo `projection_registry` que usan las projections existentes:

```typescript
// src/lib/intelligence/projections/registration.ts

export const AI_INTELLIGENCE_PROJECTIONS = [
  {
    event_types: ['finance.income.created', 'finance.income.updated', 'finance.expense.created'],
    projection: 'ai_client_health',
    handler: handleClientHealthRefresh,
    domain: 'ai_intelligence'
  },
  {
    event_types: ['ico.materialization.completed'],
    projection: 'ai_client_health',
    handler: handleClientHealthRefresh,
    domain: 'ai_intelligence'
  },
  {
    event_types: ['ico.materialization.completed', 'payroll_entry.upserted'],
    projection: 'ai_person_intelligence',
    handler: handlePersonIntelligenceRefresh,
    domain: 'ai_intelligence'
  },
  {
    event_types: ['payroll_period.exported', 'finance.income.created', 'finance.exchange_rate.upserted'],
    projection: 'ai_margin_risk',
    handler: handleMarginRiskRefresh,
    domain: 'ai_intelligence'
  },
  {
    event_types: [
      'payroll_period.approved', 'payroll_period.exported',
      'ico.materialization.completed', 'finance.income.updated'
    ],
    projection: 'ai_period_readiness',
    handler: handlePeriodReadinessRefresh,
    domain: 'ai_intelligence'
  }
]
```

Se agrega un cron dedicado: `/api/cron/outbox-react-ai` para procesar eventos del dominio `ai_intelligence`.

## 6. Ownership y fronteras

### AI Intelligence Layer es owner de:

- `greenhouse_ai.intelligence_features` — feature store
- `greenhouse_ai.intelligence_scores` — score store
- `greenhouse_ai.intelligence_alerts` — alert store
- `greenhouse_ai.scoring_configs` — configuración de pesos y thresholds
- `greenhouse_ai.recommendations` (futuro) — recomendaciones con feedback loop
- `greenhouse_serving.latest_intelligence_scores` — serving view
- `greenhouse_serving.active_intelligence_alerts` — serving view
- `src/lib/intelligence/` — toda la lógica del scoring engine
- Projection domain `ai_intelligence` en el registry
- Eventos `ai.score.*` y `ai.alert.*` en el event catalog
- Cron `/api/cron/outbox-react-ai`

### AI Intelligence Layer consume, pero NO posee:

| Módulo | Qué consume | Tipo de acceso |
|--------|------------|---------------|
| **Finance** | `fin_income`, `fin_expenses`, exchange rates, economic indicators | Read-only |
| **Payroll** | `payroll_entries`, `payroll_periods`, `compensation_versions` | Read-only |
| **ICO** | Materialized metrics (member, space, project level) | Read-only |
| **Capacity** | `member_capacity_economics` | Read-only |
| **HR** | `leave_requests`, `leave_balances` | Read-only |
| **CRM** | Deals, companies (projected) | Read-only |
| **Delivery** | Tasks, projects, sprints (conformed/projected) | Read-only |
| **Account 360** | Organizations, memberships | Read-only |
| **Service Modules** | `client_service_modules`, `service_modules` | Read-only |
| **Core** | `clients`, `members`, `identity_profiles`, `spaces` | Read-only |
| **Cost Intelligence** | `period_closure_status`, `operational_pl_snapshots` | Read-only |

### Fronteras explícitas

| Boundary | Regla |
|----------|-------|
| **vs. Cost Intelligence** | AI Intelligence detecta readiness; Cost Intelligence ejecuta el cierre. AI Intelligence predice erosión; Cost Intelligence reporta margen real. |
| **vs. ICO** | AI Intelligence consume metrics de ICO; nunca recalcula OTD/FTR/RPA. ICO es source of truth de eficiencia operativa. |
| **vs. Payroll** | AI Intelligence consume payroll entries; nunca calcula nómina ni deducciones. |
| **vs. Nexa** | Nexa es interfaz conversacional que consulta scores vía tool calls. AI Intelligence no genera lenguaje natural. |
| **vs. Finance** | AI Intelligence consume transacciones financieras; nunca crea income/expense records. |
| **vs. HR** | AI Intelligence consume leave/attendance data; nunca aprueba/rechaza solicitudes. |

## 7. API Routes

```
/api/intelligence/
├── scores/
│   ├── GET /api/intelligence/scores                    -- lista scores (filtrable por type, entity, grade)
│   ├── GET /api/intelligence/scores/[entityType]/[entityId]  -- scores de una entidad
│   └── GET /api/intelligence/scores/[entityType]/[entityId]/history  -- serie temporal
│
├── alerts/
│   ├── GET /api/intelligence/alerts                    -- alertas activas (filtrable por severity, type)
│   ├── PATCH /api/intelligence/alerts/[alertId]        -- acknowledge/dismiss alert
│   └── GET /api/intelligence/alerts/summary            -- count by severity
│
├── features/
│   └── GET /api/intelligence/features/[entityType]/[entityId]  -- features de una entidad (debug/transparency)
│
└── config/
    ├── GET /api/intelligence/config                    -- scoring configs actuales
    └── PATCH /api/intelligence/config/[scoreType]      -- ajustar pesos/thresholds (admin only)
```

### Access control

| Route | Roles permitidos |
|-------|-----------------|
| `GET /api/intelligence/scores` (client entities) | `efeonce_account`, `efeonce_operations`, `efeonce_admin` |
| `GET /api/intelligence/scores` (member entities) | `hr_manager`, `efeonce_operations`, `efeonce_admin` + el propio `collaborator` para su score |
| `GET /api/intelligence/alerts` | `efeonce_account`, `efeonce_operations`, `finance_admin`, `hr_manager`, `efeonce_admin` |
| `PATCH /api/intelligence/alerts/[alertId]` | `efeonce_operations`, `efeonce_admin` |
| `PATCH /api/intelligence/config/[scoreType]` | `efeonce_admin` only |

## 8. Eventos publicados (extensión del Event Catalog)

| Domain | Aggregate | Event | Payload | Consumers esperados |
|--------|-----------|-------|---------|-------------------|
| `ai` | `intelligence_score` | `score.updated` | `{ scoreType, entityType, entityId, scoreValue, scoreGrade, previousScore, scoreDelta }` | Nexa context enrichment, notification dispatch, executive digest |
| `ai` | `intelligence_alert` | `alert.triggered` | `{ alertType, severity, entityType, entityId, title }` | Notification dispatch, Teams/Slack webhook, executive digest |
| `ai` | `intelligence_alert` | `alert.acknowledged` | `{ alertId, acknowledgedBy }` | Audit trail |
| `ai` | `intelligence_alert` | `alert.resolved` | `{ alertId, resolvedAt }` | Audit trail, score recalculation |

## 9. Roadmap de implementación

| Fase | Entregable | Prerequisitos | Esfuerzo estimado | Impacto |
|------|-----------|--------------|-------------------|---------|
| **0 — Foundation** | Schema DDL + scoring engine skeleton + feature extractors + projection registration | Ninguno | Medio | Infraestructura base para todas las oportunidades |
| **1 — Client Health** | Score completo + alerts + serving views + API routes + dashboard card | Fase 0 + Finance income operativo + ICO materializado | Medio | Primera inteligencia cross-module visible al equipo ejecutivo |
| **2 — Person Intelligence** | Score completo + alerts + People 360 tab + Team view column | Fase 0 + ICO member metrics + payroll entries | Medio-alto | Visibilidad de rendimiento individual contexualizado |
| **3 — Margin Risk** | Trend scoring + alerts + Cost Intelligence overlay | Fase 1 + trend computation helpers + Cost Intelligence P&L | Medio | Protección proactiva de rentabilidad |
| **4 — Period Readiness** | Checklist scoring + alerts + admin dashboard + auto-closure hook | Fase 0 + Cost Intelligence period closure | Bajo-medio | Automatización del cierre mensual |
| **5 — Delivery Risk** | Sprint-aligned risk scoring + project alerts | **Bloqueado por:** Project/Sprint canonical migration a PostgreSQL | Alto | Gestión proactiva de delivery |
| **6 — Recommendations** | Recommendation engine + feedback tracking + outcome measurement | Fases 1-4 implementadas + feedback UI | Alto | End-game: inteligencia accionable con learning loop |

### Fase 0 — Foundation (detalle)

**Entregables:**
1. SQL provisioning script: `scripts/setup-postgres-ai-intelligence.sql`
2. Scoring engine core: `src/lib/intelligence/engine/`
3. Feature extractors (stubs que se completan por oportunidad): `src/lib/intelligence/features/`
4. Store layers: `src/lib/intelligence/stores/`
5. Projection registration: `src/lib/intelligence/projections/`
6. Seeding de `scoring_configs` con pesos v1.0
7. Cron route: `/api/cron/outbox-react-ai`
8. API routes skeleton: `/api/intelligence/scores`, `/api/intelligence/alerts`

**Criterio de completitud:** `pnpm build` + `pnpm tsc --noEmit` pasan. Schema provisionado en `greenhouse-pg-dev`. Projection handlers registrados (no-op hasta que haya datos).

## 10. Métricas de éxito de la Intelligence Layer

| Métrica | Target | Cómo se mide |
|---------|--------|-------------|
| Score coverage | >80% de clientes activos tienen Client Health Score | `COUNT(DISTINCT entity_id) / COUNT(active clients)` |
| Alert accuracy | <20% de alertas dismissed sin acción en 30d | `dismissed / total triggered` |
| Freshness | Scores recalculados <1h después del evento trigger | `computed_at - source_event.created_at` |
| Explainability | 100% de scores tienen breakdown con ≥3 factores | Schema constraint en `factors` JSONB |
| Adoption | Scores consultados en >50% de sesiones de agency/ops users | API call logs |

## 11. Decisiones pendientes (para iterar)

| Decisión | Opciones | Impacto | Cuándo decidir |
|----------|----------|---------|---------------|
| **Granularidad de Person Intelligence** | Mensual vs. quincenal vs. por sprint | Afecta feature extraction y storage | Fase 2 |
| **Pesos iniciales** | Expert judgment vs. data-driven calibration | Afecta accuracy de v1 | Fase 1 (empezar con expert, calibrar con data) |
| **Alert delivery channel** | Solo in-app vs. email vs. Teams/Slack | Afecta notification dispatch | Fase 1 |
| **Score visibility para colaboradores** | Full breakdown vs. solo grade vs. factores sin score numérico | Afecta UX y percepción del equipo | Fase 2 |
| **Auto-closure behavior** | Readiness 100% → auto-close vs. readiness 100% → notify human | Afecta Cost Intelligence boundary | Fase 4 |
| **Delivery Risk timing** | Esperar canonicalización o usar BigQuery features con mayor latencia | Afecta si Fase 5 se puede adelantar | Pre-fase 5 |
| **ML transition criteria** | ¿Cuántos meses de outcomes etiquetados justifican ML? | Afecta Fase 6 timeline | Post-fase 4 |

## 12. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Scores iniciales poco calibrados generan desconfianza | Alta | Alto | Lanzar como "beta" con feedback visible. Pesos ajustables sin deploy. Dashboard de confidence. |
| Sobrecarga del outbox con eventos de AI | Media | Medio | Cron dedicado (`outbox-react-ai`). Dedup por entity+period. No recalcular si features no cambiaron. |
| Person Intelligence percibido como "vigilancia" | Media | Alto | Transparencia total: el colaborador ve su propio breakdown. No se usa como único input para decisiones de HR. Comunicación clara del propósito. |
| Feature extraction lenta (BigQuery para trends) | Media | Medio | Cache de features temporales en `intelligence_features`. Solo ir a BigQuery cuando la feature no existe o expiró. |
| Scope creep: agregar más scores antes de validar los primeros | Alta | Alto | Fase estricta: no iniciar Fase N+1 hasta que Fase N tenga score coverage >60% y alert accuracy medida. |

## 13. Infraestructura GCP: mapeo a servicios existentes

### Principio rector

**La infraestructura GCP actual cubre el 100% de las necesidades de Fase 0–4.** No se provisiona ningún servicio GCP nuevo. El trabajo es DDL en Cloud SQL, TypeScript en el runtime de Vercel, y extensión de registries existentes.

### 13.1 Servicios GCP que se reusan directamente

| Servicio GCP | Instancia / Config | Rol en Intelligence Layer | Cambios necesarios |
|---|---|---|---|
| **Cloud SQL** (PostgreSQL 16) | `greenhouse-pg-dev`, `us-east4`, schema `greenhouse_ai` ya existe | Feature store, score store, alert store, scoring configs. Serving views en `greenhouse_serving`. | Solo DDL: 4 tablas nuevas + 2 views. Grants para `greenhouse_runtime` (DML) y `greenhouse_migrator` (DDL). |
| **BigQuery** | `efeonce-group`, 13 datasets, 200+ tablas | Feature extraction temporal: trends de income (`greenhouse`), ICO snapshots (`ico_engine`), payroll history (`greenhouse_marts`), exchange rates, CRM deals (`hubspot_crm`, `greenhouse_conformed`). | Read-only. Cero tablas nuevas. Queries de feature extraction contra datos existentes. |
| **Outbox + Reactive Projections** | `greenhouse_sync.outbox_events`, `projection_refresh_queue`, `outbox_reactive_log`. 12 projections live, 5 domain-partitioned crons. | Core del trigger system. Los scoring handlers se registran como projections #13–N en el mismo registry. | Agregar domain `'ai_intelligence'` al type union. Registrar projection definitions. Crear 1 cron route. |
| **Vertex AI / Gemini** | `@google/genai` con `vertexai: true`, WIF auth, 5 modelos (default: `gemini-2.5-flash`) | Nexa consume scores vía tool calls. Futuro: LLM-generated explanations en alertas críticas. | Agregar 2–3 tools en `nexa-tools.ts` que consulten `greenhouse_serving.latest_intelligence_scores` y `active_intelligence_alerts`. |
| **WIF + Auth tiered** | Pool `vercel`, provider `greenhouse-eo`, SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` | Auth para Cloud SQL, BigQuery, y Vertex AI — todos ya cubiertos por `getGoogleCredentials()`. | Ninguno. La credential resolution en `src/lib/google-credentials.ts` ya maneja WIF → SA key → ADC. |
| **Vercel Crons** | 4 scheduled + 5 reactive domain-partitioned | Orchestration event-driven del scoring engine. | Agregar 1 cron: `/api/cron/outbox-react-ai` (misma estructura que `outbox-react-finance`, `outbox-react-people`, etc.). |
| **Cloud Storage** | `efeonce-group-greenhouse-media` | Sin uso directo por Intelligence Layer. | Ninguno. |

### 13.2 Extensiones mínimas al sistema existente

#### Event Catalog (`src/lib/sync/event-catalog.ts`)

Agregar 4 event types nuevos:

```typescript
// Nuevos aggregates
'intelligence_score'
'intelligence_alert'

// Nuevos events
'ai.score.updated'           // score recalculado
'ai.alert.triggered'         // alerta activada por threshold
'ai.alert.acknowledged'      // alerta reconocida por usuario
'ai.alert.resolved'          // alerta resuelta (score mejoró)
```

Se agregan a `REACTIVE_EVENT_TYPES` para que downstream projections (Nexa context, notification dispatch, executive digest) puedan reaccionar.

#### Projection Registry (`src/lib/sync/projection-registry.ts`)

Agregar domain al type union:

```typescript
type ProjectionDomain = 'organization' | 'people' | 'finance' | 'notifications' | 'delivery' | 'ai_intelligence'
```

Registrar 4 projections iniciales (Fase 1–4):

| Projection name | Trigger events | Domain |
|---|---|---|
| `ai_client_health` | `finance.income.*`, `ico.materialization.completed`, `assignment.*`, `finance.exchange_rate.upserted` | `ai_intelligence` |
| `ai_person_intelligence` | `ico.materialization.completed`, `payroll_entry.upserted`, `compensation_version.*`, `leave_request.*`, `assignment.*` | `ai_intelligence` |
| `ai_margin_risk` | `payroll_period.exported`, `finance.income.*`, `finance.exchange_rate.upserted`, `ico.materialization.completed`, `compensation_version.*` | `ai_intelligence` |
| `ai_period_readiness` | `payroll_period.approved`, `payroll_period.exported`, `ico.materialization.completed`, `finance.income.updated`, `finance.exchange_rate.upserted` | `ai_intelligence` |

#### Nexa Tools (`src/lib/nexa/nexa-tools.ts`)

Agregar 3 tools:

| Tool name | Descripción | Roles | Source |
|---|---|---|---|
| `get_client_health` | Score de salud de cliente con breakdown | `efeonce_account`, `efeonce_operations`, `efeonce_admin` | `greenhouse_serving.latest_intelligence_scores WHERE score_type = 'client_health'` |
| `get_person_score` | Intelligence score de colaborador | `hr_manager`, `efeonce_operations`, `efeonce_admin` | `greenhouse_serving.latest_intelligence_scores WHERE score_type = 'person_intelligence'` |
| `get_active_alerts` | Alertas activas con severidad y factores | `efeonce_account`, `efeonce_operations`, `finance_admin`, `hr_manager`, `efeonce_admin` | `greenhouse_serving.active_intelligence_alerts` |

#### Cron route

```
/api/cron/outbox-react-ai/route.ts
```

Estructura idéntica a los crons existentes (`outbox-react-finance`, `outbox-react-people`):
- Max duration: 30s
- Batch size: 50
- Domain filter: `'ai_intelligence'`
- Auth: `CRON_SECRET` (mismo patrón que los 5 crons reactivos existentes)

### 13.3 Servicios GCP que NO se agregan (y cuándo reconsiderar)

| Servicio | Por qué NO ahora | Cuándo reconsiderar |
|---|---|---|
| **Pub/Sub** | El outbox en PostgreSQL ya es el event bus. Greenhouse maneja cientos de eventos/día, no millones. Pub/Sub agregaría un hop de latencia y complejidad operacional sin valor en este volumen. | Si el volumen supera ~10k eventos/día o se necesita fan-out a consumers fuera de Vercel (e.g., Cloud Run workers dedicados). |
| **Cloud Tasks** | `projection_refresh_queue` en PostgreSQL ya hace dedup, retry, backpressure y dead-lettering. Cloud Tasks sería infraestructura duplicada. | Si se necesita rate limiting granular por servicio externo o scheduling con delay preciso (>1 min). |
| **Cloud Workflows** | Los scoring flows son sincrónicos dentro de un handler (~200ms). No hay orchestration multi-step con waits o branching condicional que justifique Workflows. | Si se agrega ML training pipelines con pasos asincrónicos (Fase 6+). |
| **Vertex AI Pipelines** | No hay ML training en Fases 0–4. Los scores son determinísticos (composite weights + trend detection) calculados en TypeScript in-process. | Fase 6: cuando haya 6+ meses de labeled outcomes y se justifique training automatizado. Evaluar si BQML cubre el caso antes de agregar Vertex Pipelines. |
| **Vertex AI Feature Store** | La tabla `intelligence_features` en PostgreSQL cubre el caso (~50 features, ~100 entities, serving en <10ms). Feature Store de Vertex se justifica con >1000 features, serving de baja latencia para inference online, y versionado de feature sets para training reproducible. | Fase 6+: si el feature set crece significativamente y se necesita point-in-time feature retrieval para training. |
| **BigQuery ML (BQML)** | Sin labeled outcomes no hay supervised learning útil. `CREATE MODEL` requiere columna target (e.g., `client_churned`, `project_missed_deadline`). Los composites determinísticos y trend detection se implementan mejor en TypeScript donde hay control total del flujo y debugging. | Fase 6: con ≥6 meses de outcomes etiquetados. Primer candidato: `CREATE MODEL client_churn_model OPTIONS(model_type='LOGISTIC_REG') AS SELECT * FROM intelligence_features WHERE entity_type='client'`. |
| **Cloud Run (nuevo servicio)** | El scoring engine corre dentro del runtime de Vercel (Next.js API routes + crons). No necesita proceso separado — cada scoring handler toma <500ms y no hay estado en memoria entre invocaciones. | Si algún scoring handler requiere >60s de cómputo (e.g., batch re-scoring de todas las entities) o si Vercel cron limits (max 60s execution) se vuelven bloqueantes. |

### 13.4 Diagrama de flujo con servicios GCP

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Vercel (Next.js 16, Turbopack)                                         │
│                                                                          │
│  Surfaces:                                                               │
│  ┌────────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ Executive Dash │ │ Agency Work  │ │ People 360 │ │ Client 360    │  │
│  │ /dashboard     │ │ /agency      │ │ /people/*  │ │ /agency/org/* │  │
│  └───────┬────────┘ └──────┬───────┘ └─────┬──────┘ └──────┬────────┘  │
│          │                  │                │               │           │
│          └──────────────────┼────────────────┼───────────────┘           │
│                             ▼                                            │
│                   /api/intelligence/*                                     │
│                   (scores, alerts, features, config)                     │
│                             │                                            │
│  ┌──────────────────────────┼───────────────────────────────────────┐   │
│  │                          │                                       │   │
│  │  /api/cron/outbox-react-ai ◄── Vercel Cron (*/5 * * * *)       │   │
│  │          │                                                       │   │
│  │          ▼                                                       │   │
│  │  Scoring Engine (TypeScript in-process)                          │   │
│  │  ├─ Reads published events from outbox                           │   │
│  │  ├─ Resolves affected entities                                   │   │
│  │  ├─ Extracts features (PG-first, BQ for trends)                 │   │
│  │  ├─ Computes scores (composite / trend / checklist)              │   │
│  │  ├─ Evaluates alert rules                                       │   │
│  │  ├─ Persists results (features + scores + alerts)                │   │
│  │  └─ Publishes ai.score.updated / ai.alert.triggered events      │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                             │                                            │
│  ┌──────────────────────────┼───────────────────────────────────────┐   │
│  │  /api/home/nexa (Nexa)   │                                       │   │
│  │          │                │                                       │   │
│  │          ▼                │                                       │   │
│  │  Tool: get_client_health ─┤─► reads serving views                │   │
│  │  Tool: get_person_score ──┤                                      │   │
│  │  Tool: get_active_alerts ─┘                                      │   │
│  │          │                                                       │   │
│  │          ▼                                                       │   │
│  │  Vertex AI / Gemini (genera respuesta en lenguaje natural)       │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└───────────────┬────────────────────────────────┬─────────────────────────┘
                │                                │
      WIF / SA Key Auth                 WIF / SA Key Auth
     (google-credentials.ts)           (google-credentials.ts)
                │                                │
                ▼                                ▼
┌───────────────────────────┐  ┌──────────────────────────────────────────┐
│  Cloud SQL (us-east4)      │  │  BigQuery (US multi-region)              │
│  greenhouse-pg-dev         │  │  efeonce-group                           │
│                            │  │                                          │
│  WRITES:                   │  │  READS (feature extraction):             │
│  ├─ greenhouse_ai          │  │  ├─ ico_engine.metric_snapshots_monthly  │
│  │  ├─ intelligence_features│ │  │    (ICO trends 6+ meses)              │
│  │  ├─ intelligence_scores │  │  ├─ greenhouse.fin_income                │
│  │  ├─ intelligence_alerts │  │  │    (revenue history)                  │
│  │  └─ scoring_configs     │  │  ├─ greenhouse_conformed.crm_deals      │
│  │                         │  │  │    (pipeline momentum)                │
│  ├─ greenhouse_sync        │  │  ├─ greenhouse_raw.postgres_outbox_events│
│  │  └─ outbox_events (new) │  │  │    (historical event replay)          │
│  │                         │  │  └─ greenhouse_marts.*                   │
│  READS:                    │  │       (outbox-derived analytics)          │
│  ├─ greenhouse_payroll.*   │  │                                          │
│  ├─ greenhouse_finance.*   │  │  ZERO WRITES from Intelligence Layer    │
│  ├─ greenhouse_serving.*   │  │                                          │
│  ├─ greenhouse_hr.*        │  └──────────────────────────────────────────┘
│  ├─ greenhouse_core.*      │
│  ├─ greenhouse_delivery.*  │  ┌──────────────────────────────────────────┐
│  └─ greenhouse_crm.*       │  │  Vertex AI (global)                      │
│                            │  │  gemini-2.5-flash (default)              │
│  SERVING (read by API):    │  │                                          │
│  ├─ latest_intelligence_   │  │  Solo consumido por Nexa para traducir   │
│  │  scores (view)          │  │  scores a lenguaje natural.              │
│  └─ active_intelligence_   │  │  Intelligence Layer NO usa Gemini.       │
│     alerts (view)          │  └──────────────────────────────────────────┘
└───────────────────────────┘
```

### 13.5 Costos incrementales estimados

| Recurso | Consumo incremental | Costo estimado |
|---|---|---|
| **Cloud SQL** | ~4 tablas, ~10k rows/mes (scores + features + alerts). Storage negligible (<1 MB/mes). | $0 incremental (ya provisionado, sin cambio de tier). |
| **BigQuery** | Feature extraction queries: ~50 queries/día × ~10 MB/query = ~500 MB/día = ~15 GB/mes. | ~$0.08/mes (on-demand pricing $5/TB). Dentro del free tier de 1 TB/mes. |
| **Vercel Cron** | 1 cron adicional cada 5 min = ~8,640 invocaciones/mes. Execution ~200ms avg. | Dentro del plan existente (Vercel Pro incluye cron). |
| **Vertex AI** | Solo via Nexa tool calls. ~100 extra tool-augmented requests/mes. | ~$0.02/mes incremental (Gemini Flash pricing). |
| **Total incremental Fases 0–4** | — | **~$0.10/mes** |

### 13.6 Transición a ML: qué cambia en Fase 6

Cuando se acumulen ≥6 meses de labeled outcomes (Fase 6), la infraestructura GCP se extiende:

```
Fase 0–4 (actual)                    Fase 6 (futuro, ~6+ meses)
─────────────────                    ──────────────────────────
TypeScript scorers                → + BigQuery ML models (BQML)
  (composite, trend, checklist)       CREATE MODEL ... OPTIONS(model_type='LOGISTIC_REG')
                                      ML.PREDICT sobre intelligence_features

PostgreSQL feature store          → + Vertex AI Feature Store (si >1000 features)
  (intelligence_features)              Point-in-time retrieval para training

Vercel cron scoring               → + Cloud Run worker (si scoring >60s)
  (<500ms per entity)                  Batch re-scoring de todas las entities

Manual weight tuning              → + Vertex AI Pipelines (si training automatizado)
  (scoring_configs)                    Scheduled re-training con nuevos outcomes
```

**Decisión de Fase 6 se toma basada en datos, no en anticipación.** Los criterios:
- ¿Hay >100 labeled outcomes por score type?
- ¿El composite determinístico tiene alert accuracy <70%?
- ¿Un modelo BQML simple (logistic regression) supera al composite en backtesting?

Si la respuesta a las 3 es sí, se migra ese score type a BQML. Los demás siguen determinísticos.

## Apéndice A: Relación con Nexa

Nexa consume la Intelligence Layer como un data source más, vía tool calling:

```
User → "¿Cómo está Acme Corp?"
Nexa → tool_call: getClientHealthScore(clientId)
Intelligence Layer → { score: 72, grade: "healthy", factors: [...], alerts: [...] }
Nexa → "Acme Corp tiene un score de salud de 72 (healthy). Su delivery quality..."
```

Nexa NO recalcula scores. Nexa NO tiene acceso directo a los módulos fuente para generar inteligencia cross-module. Nexa **traduce** los outputs de la Intelligence Layer a lenguaje natural contextualizado.

Esto significa que mejorar la Intelligence Layer automáticamente mejora a Nexa sin modificar el asistente.

## Apéndice B: Por qué determinístico primero

| Approach | Pros | Contras | Cuándo usar |
|----------|------|---------|-------------|
| **Composite weights** | Transparente, explicable, configurable sin ML infra, funciona con N=1 | No descubre patrones no lineales, requiere expert judgment para pesos | v1 de todo. Siempre como baseline. |
| **Trend detection** (regresión, moving avg) | Detecta dirección sin labels, complementa composites | Sensible a outliers, requiere ≥3 períodos de historia | Margin Risk, Delivery Risk a partir de Fase 3 |
| **Anomaly detection** (z-score, IQR) | No requiere labels, detecta lo inesperado | Alto false positive rate sin tuning | Alertas complementarias, no scores principales |
| **Supervised ML** | Descubre patrones complejos, mejora con feedback | Requiere labels, opaco, necesita infra de training | Solo cuando hay ≥6 meses de outcomes + feedback loop operativo |

**Regla: cada oportunidad empieza con composite weights. Se agrega trend detection cuando hay ≥3 períodos. Se migra a ML solo cuando hay labeled outcomes.**
