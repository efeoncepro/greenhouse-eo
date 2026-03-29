# RESEARCH-001 — Embedded AI Strategy: Intelligence in Every Module

**Status:** Active
**Created:** 2026-03-28
**Owner:** Julio Reyes
**Resulting tasks so far:** TASK-118 (ICO AI Core)

---

## Thesis

Greenhouse puede pasar de plataforma de visibilidad a plataforma de inteligencia operativa embebiendo IA directamente en cada módulo de datos — no como chatbot, sino como daemon que corre en cada ciclo de materialización y genera señales que el usuario consume como first-class data en dashboards.

El primer módulo (ICO) ya tiene spec completo (TASK-118, 13 slices). Este research brief documenta la visión completa y los módulos candidatos con su potencial.

## Principios de diseño (validados con ICO)

| Principio | Rationale |
|-----------|-----------|
| **Advisory-only** | Las señales informan, el humano decide. No hay acciones automáticas que afecten datos operativos o financieros |
| **Internal-first** | El equipo Efeonce ve las señales. Los clientes ven resultados, no predicciones internas |
| **TypeScript in-process** | Math simple (z-scores, regression, rules) es suficiente para 80% de los casos. BigQuery ML o Vertex AI solo cuando la complejidad lo requiera |
| **Puramente aditivo** | La IA se agrega como steps adicionales al pipeline existente. Si falla, el pipeline completa sin IA |
| **Prediction tracking** | Toda predicción se loguea y se compara con el resultado real para calibrar confianza |
| **Data quality gating** | Ninguna señal IA se genera sin medir primero la calidad de los datos subyacentes |

## Pattern arquitectónico compartido

Todos los módulos siguen el mismo patrón:

```
Datos crudos → Pipeline existente → [AI Core steps] → ai_signals table → Postgres cache → UI
                                          │
                                   ┌──────┼──────┐
                                   │      │      │
                              Anomaly  Predict  Recommend
                              Detect
```

Tablas compartidas:
- `{module}.ai_signals` — señales por módulo (o `greenhouse_ai.ai_signals` con `module` column)
- `{module}.ai_prediction_log` — tracking de predicciones
- `greenhouse_serving.ai_signals` — cache Postgres para consumo UI

## Nexa como consumidor universal

Nexa no calcula inteligencia — lee las señales que cada módulo AI Core genera. A medida que más módulos tengan AI Core, Nexa se vuelve más inteligente sin cambiar su código:

```
Nexa context = ICO ai_signals + Finance ai_signals + HR ai_signals + ...
```

---

## Módulo 1: ICO (Committed — TASK-118)

**Status:** Spec completo, 13 slices, ~45h estimadas

### Phase 1 — AI Intelligence
| Slice | Capa |
|-------|------|
| 1 | Anomaly Detection (z-score) |
| 2 | Root Cause Analysis (dimensional drill-down) |
| 3 | Predictive Metrics (linear extrapolation) |
| 4 | Capacity Forecasting (FTE gap) |
| 5 | Resource Optimization (rule engine) |
| 6 | Quality Scoring (LLM async) |

### Phase 2 — Robustness
| Slice | Capa |
|-------|------|
| 7 | Data Quality Scoring |
| 8 | Revenue-Weighted Metrics |
| 9 | CSC Pipeline Analytics (Markov) |
| 10 | Seasonality Model |
| 11 | Operational Maturity Model |
| 12 | Member Growth Trajectory |
| 13 | Multi-Source Enrichment |

**Referencia completa:** `docs/tasks/to-do/TASK-118-ico-ai-core-embedded-intelligence.md`

---

## Módulo 2: Finance (Research — Next Candidate)

**Status:** Investigación. Datos disponibles, alto impacto, sin spec.

### Por qué Finance es el siguiente

1. **Datos de alta calidad ya disponibles** — `greenhouse_finance.fin_income`, `fin_expenses`, `fin_suppliers`, `economic_indicators`, reconciliación bancaria
2. **Impacto directo en caja** — cada señal tiene traducción inmediata a decisiones de $$$
3. **Complementa ICO** — ICO mide delivery performance, Finance mide el resultado económico. Juntos cierran el loop
4. **La arquitectura de TASK-118 se reutiliza 1:1** — mismos patterns de ai_signals, prediction_log, graceful degradation

### Señales potenciales

#### F1 — Cash Flow Prediction
Predice cuándo llegan cobros basado en patrones históricos de pago por cliente.

```
Input: fin_income (facturas emitidas + fechas de pago históricas)
Modelo: Avg payment delay por client + distribución de probabilidad
Output: predicted_payment_date + confidence por factura abierta
Ejemplo: "Acme paga en promedio 45 días. Factura $12K emitida 1/mar → cobro esperado: 15/abr (conf: 78%)"
```

**Impacto:** Permite proyectar flujo de caja semanal/mensual. Hoy se hace manual o no se hace.

#### F2 — Expense Anomaly Detection
Detecta gastos inusuales vs patrón histórico, igual que ICO Slice 1 pero sobre datos financieros.

```
Input: fin_expenses (rolling 6 meses por categoría)
Modelo: Z-score por categoría de gasto
Output: anomaly signal cuando |z| > 2
Ejemplo: "Costo laboral marzo: 18% sobre trend 6 meses (z=2.4)"
```

**Impacto:** Detección temprana de cost creep antes de que erosione el margen.

#### F3 — Margin Erosion Early Warning
Alerta cuando el margen por Space se degrada sostenidamente, distinguiendo si el problema es revenue o costo.

```
Input: fin_income + fin_expenses por Space (rolling 6 meses)
Modelo: Trend slope de margin_pct + decomposition revenue vs cost
Output: signal cuando margin_trend < -1%/mes por 3+ meses consecutivos
Ejemplo: "Margen Space Acme: 32% → 28% → 24% en 3 meses. Revenue estable, costo laboral +15%"
Diagnóstico automático: 'cost_driven' | 'revenue_driven' | 'both'
```

**Impacto:** Intervención antes de que un Space deje de ser rentable.

#### F4 — Revenue Concentration Risk
Identifica dependencia excesiva en pocos clientes.

```
Input: fin_income por Space (rolling 12 meses)
Modelo: Herfindahl-Hirschman Index (HHI) + top-N concentration ratio
Output: concentration_score + signal si top 3 > 60% del revenue
Ejemplo: "Top 3 clientes = 68% del revenue. Si Acme churns, impacto: -$180K/año"
```

**Impacto:** Visibilidad de riesgo de concentración para decisiones de business development.

#### F5 — Invoice Payment Prediction
Predice qué facturas se pagarán tarde basado en historial del pagador.

```
Input: fin_income (facturas históricas con fecha emisión, fecha pago, monto)
Modelo: Classification (on_time / late) por features: client_id, monto, mes, historial
Output: late_payment_probability + expected_delay_days por factura abierta
Ejemplo: "Factura #247 ($8.5K, cliente Beta): 73% probabilidad de atraso, delay esperado: 12 días"
```

**Impacto:** Priorizar cobros proactivos. Ajustar cash flow forecast con probabilidad de atraso.

#### F6 — Payroll Cost Projection
Con headcount actual + tendencias, estima costo laboral del quarter.

```
Input: payroll_periods (últimos 6 meses) + greenhouse_hr.team_members (activos)
Modelo: Linear extrapolation + known upcoming changes (nuevas contrataciones, desvinculaciones)
Output: projected_payroll_cost por mes + confidence
Ejemplo: "Costo laboral Q2 proyectado: $XX.XM (+6% vs Q1, driven by 2 contrataciones abril)"
```

**Impacto:** Visibilidad de costo laboral futuro para planning financiero.

#### F7 — FX Exposure (contratos USD)
Para contratos en dólares, estima impacto de variación cambiaria.

```
Input: fin_income (contratos en USD) + economic_indicators (USD/CLP histórico)
Modelo: Sensitivity analysis (qué pasa si USD/CLP varía ±5%, ±10%)
Output: fx_exposure_monthly + impact_scenarios
Ejemplo: "3 contratos USD activos ($45K/mes). Si USD/CLP sube 5%: +$2.7M CLP/año margin improvement"
```

**Impacto:** Dimensionar riesgo cambiario para decisiones de pricing y cobertura.

### Open questions (Finance)

- [ ] ¿Hay suficiente historia de pagos para predecir cash flow? (¿cuántos meses de `fin_income` con `paid_at`?)
- [ ] ¿Los gastos están categorizados consistentemente? (si no, F2 genera ruido)
- [ ] ¿El margen por Space se calcula hoy o hay que construir el cálculo? (¿existe `client_economics`?)
- [ ] ¿Los contratos USD están marcados como tal en la data? (campo `currency` en `fin_income`?)
- [ ] ¿Payroll projected (TASK-109) ya expone datos de costo futuro que F6 pueda consumir?

### Validation criteria (cuando pasa a Task)

- [ ] Al menos 6 meses de `fin_income` con fechas de pago reales
- [ ] Categorización de gastos validada (>80% de expenses con categoría)
- [ ] Bridge Space → revenue → cost comprobado con datos reales
- [ ] Al menos 2 señales (de F1-F7) validadas como útiles por el equipo

---

## Módulo 3: Client Health Score (Research — Cross-Module Composite)

**Status:** Investigación. Requiere ICO + Finance AI para tener inputs.

### Concepto

Un score compuesto que cruza señales de múltiples módulos para evaluar la salud de cada relación con cliente. No pertenece a un solo módulo — es la primera señal verdaderamente cross-module.

```
client_health_score = weighted(
  ico_delivery_health    * 0.25,    // ICO: OTD trend, stuck assets, cycle time
  financial_health       * 0.25,    // Finance: margin trend, payment behavior
  engagement_health      * 0.20,    // Portal: login frequency, feature usage
  communication_health   * 0.10,    // Email: delivery rate, response patterns
  growth_signal          * 0.20     // Revenue: trend, expansion vs contraction
)
```

### Señales derivadas

| Señal | Lógica |
|-------|--------|
| **Churn risk** | health_score declining 3+ meses consecutivos → 'high risk' |
| **Expansion opportunity** | health_score > 80 AND revenue_growth > 0 AND capacity_available → 'expansion candidate' |
| **Intervention needed** | Cualquier componente < 40 por 2+ meses → flag específico |
| **Success story** | health_score > 90 por 6+ meses → candidate for case study |

### Open questions

- [ ] ¿Qué peso real deberían tener los componentes? (requiere calibración con casos reales de churn)
- [ ] ¿El engagement se puede medir desde `client_users` login data?
- [ ] ¿Hay suficientes eventos de churn históricos para validar el modelo?
- [ ] ¿Dónde vive la señal en la UI? (¿Agency Spaces? ¿Organization 360? ¿Ambos?)

### Depends on

- TASK-118 (ICO AI Core) — Phase 1 al menos parcial
- Finance AI Core — al menos F3 (margin) + F5 (payments)
- Login/engagement tracking en Postgres

---

## Módulo 4: People/HR Intelligence (Research — Partially Covered)

**Status:** Parcialmente cubierto por TASK-118 Slice 12 (Member Growth Trajectory).

### Lo que ya está cubierto (ICO Slice 12)

- OTD trend por miembro
- Peer comparison (percentile within role)
- Early warning (declining trajectory 3+ months)

### Lo que queda por explorar

#### H1 — Attrition Risk Prediction
```
Señales: declining performance + overload (dedication >120%) + tenure milestone + peer departures
Output: attrition_risk_score per member
```

#### H2 — Optimal Team Composition
```
Señales: ICO metrics by project × team composition → which skill combos produce best outcomes?
Output: team_effectiveness_score per project, recommended composition for new projects
```

#### H3 — Hiring Need Prediction
```
Señales: capacity gap (ICO Slice 4) + pipeline forecast + seasonal patterns
Output: hiring_need by role for next quarter
```

### Open questions

- [ ] ¿Hay suficiente data de desvinculaciones históricas para entrenar attrition?
- [ ] ¿Los roles están suficientemente normalizados para peer comparison cross-Space?
- [ ] ¿Team composition data es accesible? (quién trabajó con quién en qué proyecto)

---

## Módulo 5: Delivery Intelligence (Research — CSC Optimization)

**Status:** Parcialmente cubierto por TASK-118 Slice 9 (CSC Pipeline Analytics).

### Lo que ya está cubierto (ICO Slice 9)

- Markov chain transition matrix
- Dwell time por fase
- Predicted delivery date por task

### Lo que queda por explorar

#### D1 — Bottleneck Prediction
```
Antes de que una fase se congestione, predecir basado en inflow rate + current dwell time
"revisión_interna va a saturarse en 3 días al ritmo actual de ingreso"
```

#### D2 — Process Mining
```
Descubrir patrones no obvios: ¿hay tasks que pasan por fases no estándar?
¿Hay loops (revisión → cambios → revisión → cambios) que indican problemas de brief?
```

#### D3 — Brief Quality → Delivery Outcome Correlation
```
¿Los briefs con mayor completitud producen mejor OTD/FTR?
Requiere: quality scoring de briefs (ICO Slice 6) + outcome tracking
```

### Open questions

- [ ] ¿Los cambios de estado de Notion tienen timestamp granular suficiente para calcular dwell time?
- [ ] ¿Hay volumen suficiente de loops para que process mining sea estadísticamente significativo?
- [ ] ¿Brief quality scoring (ICO Slice 6) necesita estar activo primero?

---

## Orden estratégico recomendado

```
1. ICO AI Core (TASK-118)           ← COMMITTED, spec completo
   │
2. Finance AI Core                   ← NEXT: validar open questions, crear task
   │
3. Client Health Score               ← Requiere 1 + 2 parciales
   │
4. People/HR Intelligence            ← Parcialmente cubierto por 1
   │
5. Delivery Intelligence (advanced)  ← Parcialmente cubierto por 1
```

Cada módulo se beneficia del anterior. ICO sienta la arquitectura, Finance agrega la dimensión económica, Client Health las cruza, y People/Delivery refinan con señales más especializadas.

---

## Criterio para mover de Research → Task

Un módulo pasa de Research a Task cuando:

1. **Open questions resueltas** — todas o las bloqueantes
2. **Datos validados** — no asumidos, verificados con queries reales
3. **Al menos 2 señales** validadas como útiles por el equipo en conversación
4. **Effort estimado** — slices definidos con esfuerzo por slice
5. **Pattern probado** — la arquitectura de ai_signals ya funciona en producción (ICO lo valida primero)

---

*Efeonce Greenhouse™ — Research Brief RESEARCH-001*
*Documento interno exploratorio. Sujeto a cambios sin aviso.*
