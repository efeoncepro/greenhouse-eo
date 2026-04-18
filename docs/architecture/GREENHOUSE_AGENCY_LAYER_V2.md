# Greenhouse EO — Agency Operator Layer Architecture V2

> **Version:** 2.0 (replanteamiento desde cero sobre la base existente)
> **Created:** 2026-03-30
> **Status:** Draft para iteración — no implementar sin validación
> **Audience:** Product owners, engineering leads, agents implementadores
> **Prerequisite reading:** `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_ARCHITECTURE_V1.md`

---

## 1. Visión

La capa de Agencia es el **sistema nervioso operativo** de Efeonce. No es un dashboard que muestra datos — es un Operator Layer que interpreta la realidad operativa, anticipa problemas, y recomienda acciones.

### Principio rector

> **De reportar a operar.** Agency no muestra KPIs para que alguien los interprete — Agency dice qué está bien, qué necesita atención, y qué hacer al respecto.

### Tres capas

```
┌──────────────────────────────────────────────────┐
│  CAPA 3: INTELIGENCIA                            │
│  Anomaly detection · Forecasting · Recommendations│
│  "Tu OTD va a caer si no reasignas Design"       │
├──────────────────────────────────────────────────┤
│  CAPA 2: OPERACIÓN                               │
│  Space 360 · Service P&L · Team Capacity Engine  │
│  "Space X genera $8M con margen 22%"             │
├──────────────────────────────────────────────────┤
│  CAPA 1: DATOS                                   │
│  ICO Engine · Finance · Payroll · Delivery · CRM │
│  "RPA 1.8, OTD 85%, 4 assets stuck"             │
└──────────────────────────────────────────────────┘
```

- **Capa 1** ya existe — ICO, Finance, Payroll, Delivery proveen datos materializados
- **Capa 2** está parcialmente construida — Pulse funciona, Economics no, Space 360 no existe
- **Capa 3** no existe — todo se muestra sin interpretación

---

## 2. Auditoría del estado actual (2026-03-30)

### Lo que funciona

| Componente | Estado | Fuente |
|------------|--------|--------|
| Pulse Dashboard (KPIs globales) | Completo | BigQuery ICO + Notion |
| Spaces tab (cards + semáforo) | Completo | BigQuery + Postgres Finance |
| ICO Engine tab | Completo | BigQuery materialized + live fallback |
| Services CRUD | Completo | Postgres |
| Delivery view | Completo | BigQuery ICO + Notion |
| Operations/Observabilidad | Completo | Postgres ops |
| Capacity tab | Completo | BigQuery |

### Lo que está roto

| Componente | Problema | Severidad |
|------------|----------|-----------|
| Space Detail (`/agency/spaces/[id]`) | Redirige a `/admin/tenants/` en vez de vista 360 propia | Crítico |
| Economics View | UI existe pero no tiene API backend | Crítico |
| Team View | Duplica queries de capacity, sin API dedicada | Medio |

### Lo que falta

| Componente | Gap | Impacto |
|------------|-----|---------|
| Space 360 | El objeto central de la agencia no tiene vista propia | UX rota |
| Service P&L | Services no alimentan economics (revenue/cost/margin por servicio) | Economics incompleta |
| Alertas operativas ICO | RPA/OTD degrada y nadie se entera automáticamente | Operaciones a ciegas |
| Campaigns ↔ Services | Campaigns no linkan a services ni presupuesto | Tracking incompleto |
| Agency outbox events | Agency no emite eventos propios (solo los observa) | Sin reactivity |
| Inteligencia | Datos sin interpretación, sin anomaly detection, sin recomendaciones | La promesa de valor central |

---

## 3. Objetos canónicos de la Agencia

### 3.1 Space (objeto central)

El Space es el **objeto más importante** de la capa de agencia. Es el equivalente a una "cuenta" en un CRM — el contenedor de toda la relación operativa con un cliente.

```
Space
├── Identity: client_id, name, business_lines, organization
├── Team: assigned members with FTE allocation
├── Services: contracted services with pipeline stage + cost
├── Projects: Notion projects scoped to this space
├── Delivery: ICO metrics (RPA, OTD, throughput, quality)
├── Finance: revenue, expenses, margin, receivables
├── Campaigns: cross-project initiatives with budget
├── Health: composite score from all dimensions
└── Risk: derived from delivery + finance + engagement signals
```

**Lo que falta:** Vista 360 dedicada que integre todas estas dimensiones en una sola página con tabs.

### 3.2 Service (motor económico)

Cada servicio contratado por un Space tiene un ciclo de vida (onboarding → active → renewal → closed) y un contrato económico.

```
Service
├── Identity: service_id, name, space, organization
├── Lifecycle: pipeline_stage (onboarding/active/renewal/closed/paused)
├── Contract: cost, currency, start_date, target_end_date
├── Delivery: linked projects, assigned team members
├── Finance: revenue attributed, cost attributed, margin
└── Health: on-time delivery %, within-budget %
```

**Lo que falta:** P&L por servicio. Hoy services tienen `totalCost` pero no revenue ni margin.

### 3.3 Team Member (constraint operativo)

El equipo es el **recurso finito** de la agencia. La capacidad determina qué se puede prometer.

```
Team Member
├── Identity: member_id, name, role_category, role_title
├── Capacity: FTE total, assignments across spaces
├── Utilization: FTE allocated / FTE available
├── Cost: loaded cost (salary + employer charges + overhead)
├── Performance: ICO metrics (RPA, OTD, throughput) per space
└── Risk: over-allocation, under-utilization, cost/revenue ratio
```

**Lo que falta:** Motor de capacity que alerte sobre-asignación, no solo la muestre.

### 3.4 Campaign (vehículo de delivery)

Las campañas agrupan múltiples proyectos bajo un objetivo y presupuesto.

```
Campaign
├── Identity: campaign_id, name, type, status
├── Scope: linked spaces, linked projects
├── Budget: budget_clp, spent, remaining
├── Services: linked services (qué se contrató para esta campaña)
├── Timeline: start_date, end_date, milestones
└── Performance: delivery metrics aggregated from projects
```

**Lo que falta:** Link a services, budget tracking contra gastos reales, timeline con milestones.

---

## 4. Arquitectura propuesta: Operator Layer

### 4.1 Space 360

La vista más importante. Cuando un Operations Lead abre un Space, debe ver todo en un lugar:

```
/agency/spaces/[id]

┌─────────────────────────────────────────────────────────────┐
│  [Logo] Space Name                         [Health Score]   │
│  Organization · Business Line              [Risk Level]     │
├─────────────────────────────────────────────────────────────┤
│  [KPI] Revenue  [KPI] Margin  [KPI] OTD  [KPI] RPA        │
├─────────────────────────────────────────────────────────────┤
│  [Overview] [Team] [Services] [Delivery] [Finance] [ICO]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TAB: Overview                                              │
│  - Health summary con semáforos por dimensión               │
│  - Recent activity (últimos eventos del Space)              │
│  - Alerts (si hay anomalías detectadas)                     │
│  - Recommendations (si inteligencia está activa)            │
│                                                             │
│  TAB: Team                                                  │
│  - Members asignados con FTE, rol, utilización              │
│  - Capacity vs delivery load                                │
│  - Drawer para asignar/desasignar                           │
│                                                             │
│  TAB: Services                                              │
│  - Servicios contratados con pipeline stage                 │
│  - Revenue/cost/margin por servicio                         │
│  - Timeline con start/end dates                             │
│                                                             │
│  TAB: Delivery                                              │
│  - ICO metrics (RPA, OTD, throughput) trend                 │
│  - Projects con status                                      │
│  - Stuck assets                                             │
│  - Sprint/cycle completion rate                             │
│                                                             │
│  TAB: Finance                                               │
│  - P&L del Space (revenue, costs, margin)                   │
│  - Receivables/payables                                     │
│  - Invoice history                                          │
│  - Payment timeline                                         │
│                                                             │
│  TAB: ICO                                                   │
│  - Full ICO metrics dashboard (existing AgencyIcoView)      │
│  - Trend charts                                             │
│  - Member-level breakdown                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Economics Engine

La surface `/agency/economics` ya quedó activada en modo `space-first`. Construye P&L real por Space sobre serving materializado y deja el detalle económico por servicio como follow-up explícito.

```
/agency/economics

┌─────────────────────────────────────────────────────────────┐
│  Economía de la agencia                                     │
├─────────────────────────────────────────────────────────────┤
│  [KPI] Revenue total  [KPI] Margin %  [KPI] Payroll ratio  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  P&L por Space (tabla expandible)                           │
│  Space     │ Revenue │ Labor │ Direct │ Overhead │ Margin │ │
│  ──────────┼─────────┼───────┼────────┼──────────┼────────│ │
│  Acme Corp │ $8.2M   │ $1.1M │ $200K  │ $150K    │ 82%   │ │
│  Beta Inc  │ $5.1M   │ $800K │ $100K  │ $100K    │ 80%   │ │
│  ...       │         │       │        │          │       │ │
│                                                             │
│  P&L por Service (drill-down)                               │
│  Trend chart: margin % últimos 6 meses                      │
│  Ranking: Spaces por rentabilidad                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Backend real (2026-04-17):**
- `GET /api/agency/economics`
- reader dedicado `src/lib/agency/agency-economics.ts`
- source principal `greenhouse_serving.operational_pl_snapshots` (`scope_type='space'`)
- expansión por fila con contexto de `services`, sin `service_economics` fabricado antes de `TASK-146`

### 4.3 Team Capacity Engine

De vista estática a motor de constraints.

Runtime canónico desde `TASK-144`:

- store: `src/lib/agency/team-capacity-store.ts`
- contrato Agency: `GET /api/agency/team`
- compatibilidad legacy:
  - `GET /api/team/capacity-breakdown` queda como wrapper sobre el mismo store
  - `GET /api/agency/capacity` deriva su overview legacy desde el mismo payload y deja de leer la lane BigQuery-first

```
Capacidad como motor:

1. ESTADO ACTUAL
   - Quién está asignado a qué, con cuánto FTE
   - Utilización por rol: Design 95%, Dev 72%, Account 110%

2. ALERTAS
   - Over-allocation: "3 personas al 110%+ de capacidad"
   - Under-utilization: "2 personas con <30% de FTE asignado"
   - Role bottleneck: "0 FTE disponible en Design para abril"

3. PROYECCIÓN
   - Pipeline de services en onboarding → cuánto FTE van a requerir
   - Renewal timeline → cuándo se libera capacidad
   - Hiring needs: "Necesitas 1 Designer para cubrir abril-junio"
```

### 4.4 Campaigns ↔ Services Bridge

```
Campaign "Q1 Launch Acme"
├── Budget: $15M CLP
├── Services linked:
│   ├── Creative Hub (service_id: svc-001) → $8M
│   └── Social Media (service_id: svc-002) → $7M
├── Projects:
│   ├── Campaña Brand Refresh (notion)
│   └── Social Media Calendar (notion)
├── Delivery:
│   ├── OTD: 85%
│   └── Assets delivered: 42
└── Financial:
    ├── Budget used: $12M (80%)
    ├── Remaining: $3M
    └── On-track: ✓
```

---

## 5. Capa de Inteligencia de Agencia

### 5.1 Principio

La inteligencia no es un módulo aparte — es una capa que enriquece cada objeto con interpretación, detección de anomalías, y recomendaciones.

### 5.2 Señales que la inteligencia consume

| Señal | Fuente | Qué indica |
|-------|--------|------------|
| RPA trend | ICO materialized | Calidad de primera entrega degradando |
| OTD trend | ICO materialized | Tiempos de entrega empeorando |
| Margin trend | Finance P&L | Rentabilidad erosionándose |
| FTE utilization | Capacity | Sobre/sub asignación |
| Receivables aging | Finance | Riesgo de cobro |
| Feedback pending | Notion tasks | Cliente sin respuesta |
| Service pipeline | Services | Volumen futuro de trabajo |
| Member performance | ICO per-member | Colaborador en riesgo o destacado |

### 5.3 Tipos de inteligencia

#### A. Anomaly Detection (reactiva, automática)

Detecta cuando una métrica se desvía significativamente de su comportamiento histórico.

```
Regla: Si OTD de un Space cae >15 puntos en 2 períodos consecutivos
  → Alerta: "Space X: OTD cayó de 92% a 75% en feb-mar"
  → Notificación: Operations Lead + Account del Space
  → Suggestion: "Revisar stuck assets y capacity de Design"

Regla: Si margen de un Space cae bajo 10% por 2 meses
  → Alerta: "Space Y: margen erosionado a 8%"
  → Notificación: Finance + Operations Lead
  → Suggestion: "Revisar scope creep o renegociar tarifa"

Regla: Si un member tiene utilización >110% por 3 períodos
  → Alerta: "María López al 115% de capacidad"
  → Notificación: Operations Lead
  → Suggestion: "Reasignar 0.2 FTE de Space A o contratar"
```

#### B. Forecasting (predictiva, periódica)

Proyecta métricas futuras basándose en tendencias históricas y pipeline.

```
Capacity Forecast:
  Input: assignments actuales + services en pipeline (onboarding)
  Output: "En abril, Design estará al 130% de capacidad"
  Action: "Contratar 1 Designer o rechazar 1 service en pipeline"

Revenue Forecast:
  Input: income trend + services con renewal_pending
  Output: "Revenue Q2 proyectado: $55M (+12% vs Q1)"
  Risk: "3 services en renewal_pending ($18M) — si no renuevan, -33%"

Delivery Forecast:
  Input: ICO trends + stuck assets + team capacity
  Output: "OTD global proyectado para abril: 78% (↓5pts)"
  Root cause: "Bottleneck en Design (2 spaces comparten 1 Designer)"
```

#### C. Recommendations (accionable, contextual)

Sugiere acciones específicas basadas en el estado actual + forecast.

```
Tipo: Reasignación
  "Mover 0.3 FTE de Developer de Space A (OTD 95%, holgado)
   a Space B (OTD 72%, stressed) mejoraría OTD de B a ~82%
   sin degradar A significativamente"

Tipo: Pricing
  "Space C genera $5M revenue con margen 8%.
   El costo laboral es $4.2M (ratio 84%).
   Opciones: renegociar tarifa (+15%), reducir scope,
   o reasignar a team más junior"

Tipo: Hiring
  "Pipeline tiene 2 services en onboarding que requieren
   1.5 FTE de Design. Capacidad actual: 0.2 FTE disponible.
   Contratar 1 Designer mid-level antes de mayo"

Tipo: Risk mitigation
  "Space D: receivables aging 60+ días ($3.2M).
   Último pago hace 45 días.
   Acción: escalar a Account Lead para follow-up de cobro"
```

### 5.4 Implementación técnica

```
┌─────────────────────────────────┐
│  Signal Collectors              │
│  (reactive projections +        │
│   scheduled materializations)   │
└──────────┬──────────────────────┘
           │
┌──────────▼──────────────────────┐
│  Intelligence Engine            │
│  src/lib/agency-intelligence/   │
│                                 │
│  ├── anomaly-detector.ts        │
│  │   Rule-based detection       │
│  │   over materialized data     │
│  │                              │
│  ├── capacity-forecaster.ts     │
│  │   FTE projection from        │
│  │   assignments + pipeline     │
│  │                              │
│  ├── risk-scorer.ts             │
│  │   Composite score per Space  │
│  │   delivery × finance ×       │
│  │   engagement × capacity      │
│  │                              │
│  └── recommendation-engine.ts   │
│      Action suggestions from    │
│      anomalies + forecasts      │
└──────────┬──────────────────────┘
           │
┌──────────▼──────────────────────┐
│  Consumers                      │
│                                 │
│  ├── Space 360 Overview tab     │
│  │   (alerts + recommendations) │
│  │                              │
│  ├── Pulse Dashboard            │
│  │   (global risk summary)      │
│  │                              │
│  ├── Notifications              │
│  │   (via webhook bus)          │
│  │                              │
│  └── Nexa (AI assistant)        │
│      (natural language access)  │
└─────────────────────────────────┘
```

### 5.5 Space Health Score

Score compuesto que resume el estado de un Space en un número y un semáforo.

```
Health Score = weighted average de:
  - Delivery Health (40%): OTD × 0.6 + RPA_inverse × 0.4
  - Financial Health (30%): margin_pct × 0.5 + receivables_aging_inverse × 0.5
  - Engagement Health (15%): feedback_response_rate × 0.5 + login_recency × 0.5
  - Capacity Health (15%): team_utilization_balance × 1.0

Semáforo:
  ≥ 80: Óptimo (verde)
  60-79: Atención (amarillo)
  < 60: Crítico (rojo)
```

### 5.6 Client Risk Score

Complementa el Health Score con una visión de riesgo de churn o conflicto.

```
Risk Score = weighted sum de:
  - OTD < 70% por 2+ meses: +30 risk points
  - Margin < 10%: +20 risk points
  - Receivables aging > 60 días: +25 risk points
  - Feedback pending > 5 items: +10 risk points
  - No login en 30+ días: +15 risk points
  - Service en renewal_pending sin acción: +20 risk points

Risk Level:
  0-20: Bajo (verde)
  21-50: Medio (amarillo)
  51+: Alto (rojo)
```

---

## 6. Roadmap de implementación

### Fase 1 — Fix & Foundation (desbloquea todo lo demás)

| ID | Qué | Esfuerzo | Desbloquea |
|----|-----|----------|------------|
| Fix Space Detail | Vista 360 por Space con tabs (Overview, Team, Services, Delivery, Finance, ICO) | Alto | UX completa |
| Fix Economics API | `/api/agency/economics` con P&L real por Space | Medio | Economics view |
| Fix Team API | `/api/agency/team` dedicado | Bajo | Team view optimizado |
| Fix Campaigns scope | Mover API o re-scoping | Bajo | Consistencia |

### Fase 2 — Operator Layer (conectar los módulos)

| ID | Qué | Esfuerzo | Desbloquea |
|----|-----|----------|------------|
| Service P&L | Revenue/cost/margin por servicio | Medio | Economics drill-down |
| Campaign ↔ Service | Link servicios a campañas con budget | Medio | Campaign tracking |
| Agency outbox events | Emitir eventos de assignment, service, space changes | Medio | Reactivity |
| Capacity Engine | Alertas de over/under allocation | Medio | Capacity proactiva |

### Fase 3 — Intelligence Layer (interpretar y recomendar)

| ID | Qué | Esfuerzo | Desbloquea |
|----|-----|----------|------------|
| Health Score | Score compuesto por Space | Medio | Priorización visual |
| Risk Score | Score de riesgo por Space | Medio | Early warning |
| Anomaly Detection | Reglas para OTD, margin, utilization | Alto | Alertas automáticas |
| Capacity Forecast | Proyección de FTE por rol + pipeline | Alto | Planning |
| Recommendations | Sugerencias accionables en Space 360 | Alto | Decision support |

### Fase 4 — Advanced Intelligence

| ID | Qué | Esfuerzo | Desbloquea |
|----|-----|----------|------------|
| Revenue Forecast | Proyección basada en pipeline + renewals | Alto | Financial planning |
| Nexa Integration | Acceso conversacional a inteligencia de agencia | Alto | AI-native experience |
| Benchmark | Comparar spaces entre sí y contra promedios | Medio | Contexto competitivo |
| What-if Scenarios | "Qué pasa si pierdo este service?" | Alto | Scenario planning |

---

## 7. Enterprise Hardening — 5 capas de robustez

Lo que diferencia un sistema enterprise de uno que "funciona por ahora" es que cada crecimiento lo fortalece en vez de romperlo. Estas son las 5 capas que garantizan eso.

### 7.1 Contratos canónicos por objeto (no código suelto)

Hoy cada vista llama queries BigQuery directas con CTEs de 100+ líneas. Si cambia cómo se calcula OTD, hay que tocar 5 archivos. Enterprise significa contratos estables.

**Un store canónico por objeto:**

```
src/lib/agency/
  ├── space-store.ts          ← SpaceStore: getSpace360(), listSpacesWithHealth()
  ├── service-economics.ts    ← ServiceEconomics: getServicePnL(), listServicesBySpace()
  ├── team-capacity-store.ts  ← TeamCapacityStore: getCapacity(), getUtilization(), forecast()
  ├── campaign-store.ts       ← CampaignStore: listBySpace(), getBudgetStatus()
  └── agency-intelligence.ts  ← AgencyIntelligence: getHealthScore(), getRiskScore(), getAnomalies()
```

**Interfaces estables entre store y consumer:**

```typescript
// El contrato es un type — si el store cambia internamente
// (migra de BigQuery a Postgres, cambia un CTE), los consumers no se enteran

interface Space360 {
  identity: SpaceIdentity
  health: SpaceHealthScore
  risk: SpaceRiskScore
  team: SpaceTeamSummary
  services: SpaceServiceSummary
  delivery: SpaceDeliverySummary
  finance: SpaceFinanceSummary
  anomalies: SpaceAnomaly[]
  recommendations: SpaceRecommendation[]
}

// Los consumers (vistas, API routes, Nexa) solo importan el type
// Nunca hacen queries directas ni conocen la fuente de datos
```

**Serving views materializadas:**

En vez de computar on-demand con CTEs complejas, materializar en `greenhouse_serving` y leer flat:

| Serving View | Fuente | Refresh | Consumer |
|-------------|--------|---------|----------|
| `space_health_scores` | ICO + Finance + Capacity + Engagement | Reactive (outbox events) | Space cards, Pulse KPIs |
| `space_risk_scores` | OTD trend + margin trend + aging + feedback | Reactive | Space 360 Overview, alerts |
| `service_economics` | Finance income + expenses + allocation by service | Reactive | Economics drill-down |
| `team_capacity_forecast` | Assignments + pipeline + utilization | Scheduled (daily) | Capacity Engine alerts |
| `agency_anomalies` | Rule engine over materialized signals | Scheduled (hourly) | Space 360, Pulse, notifications |

Patrón existente que se reutiliza: ICO `metric_snapshots_monthly` y `client_economics` ya funcionan así.

### 7.2 Observabilidad de negocio (no solo infra)

Hoy observamos la infra (Sentry, health endpoint, Ops Health). Pero no observamos el negocio:

**Cada componente de inteligencia tiene su propio health check:**

```typescript
// Materialización health — integrado en GET /api/cron/materialization-health
const AGENCY_INTELLIGENCE_CHECKS = [
  {
    name: 'space_health_scores',
    table: 'greenhouse_serving.space_health_scores',
    maxAgeHours: 6,      // debe refrescarse con cada evento
    severity: 'degraded'  // si se atrasa, la capa funciona con datos stale
  },
  {
    name: 'agency_anomalies',
    table: 'greenhouse_serving.agency_anomalies',
    maxAgeHours: 2,       // anomaly detection corre cada hora
    severity: 'warning'   // si no corre, se pierden alertas
  },
  {
    name: 'team_capacity_forecast',
    table: 'greenhouse_serving.team_capacity_forecast',
    maxAgeHours: 24,      // se materializa diariamente
    severity: 'info'      // forecast stale es aceptable por horas
  }
]
```

**Dashboard de salud de inteligencia en Ops Health:**

```
Agency Intelligence    [ok|degraded|stale]
  Health scores: fresh (hace 12 min)
  Anomalies: fresh (hace 45 min) — 2 activas
  Forecast: fresh (hace 6h) — próxima: 3:00 AM
  Recommendations: 3 pendientes de review
```

**Alertas cuando la inteligencia falla:**

Si la anomaly detection no corre en 2h, `alertCronFailure()` notifica. Si el health score de un Space no se actualiza en 6h, se marca como stale en la UI.

### 7.3 Idempotencia y recovery en todo

El patrón existe con `projection-recovery` cron. La inteligencia necesita lo mismo.

**Principio:** toda operación de inteligencia es retry-safe.

```
Anomaly Detection:
  1. Lee signals materializados → detecta anomalías
  2. Persiste en agency_anomalies con dedupe por (space_id, signal, period)
  3. Si la notificación falla → queda en outbox → webhook retry la entrega
  4. Si el cron muere → projection-recovery lo recoge

Health Score:
  1. Lee delivery + finance + capacity + engagement → computa score
  2. Upsert en space_health_scores (idempotente por space_id + period)
  3. Si una fuente está null → score parcial con flag "incomplete"
  4. Próximo refresh completa el score cuando la fuente esté disponible

Recommendations:
  1. Generadas desde anomalías + forecasts → persistidas con status
  2. Status lifecycle: generated → notified → acknowledged → acted → resolved
  3. Si una recomendación no se actúa en 7 días → re-notifica con escalamiento
  4. Resolved automáticamente si la anomalía subyacente se resuelve
```

**Tabla de recovery:**

```sql
CREATE TABLE greenhouse_serving.agency_intelligence_queue (
  queue_id TEXT PRIMARY KEY,
  computation_type TEXT NOT NULL,  -- 'health_score', 'risk_score', 'anomaly', 'forecast'
  scope_type TEXT NOT NULL,        -- 'space', 'service', 'member', 'global'
  scope_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  triggered_by TEXT,               -- event_id que lo disparó
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.4 Extensibilidad declarativa (crecer = agregar, no reescribir)

Agregar capacidad nueva al sistema debe ser **agregar una entrada a un registro**, no escribir un módulo nuevo.

**Anomaly rules — registro declarativo:**

```typescript
interface AnomalyRule {
  id: string
  signal: string              // qué métrica observar
  condition: 'drop' | 'rise' | 'threshold' | 'streak'
  threshold: number           // magnitud del cambio o valor umbral
  windowPeriods: number       // cuántos períodos evaluar
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string            // notification category
  titleTemplate: string       // "OTD cayó {delta}pts en {space}"
  suggestionTemplate: string  // "Revisar stuck assets y capacity de {role}"
  recipientStrategy: string   // 'space_account' | 'operations_lead' | 'finance_admin'
}

const ANOMALY_RULES: AnomalyRule[] = [
  {
    id: 'otd_drop',
    signal: 'otd_pct',
    condition: 'drop',
    threshold: 15,
    windowPeriods: 2,
    severity: 'high',
    category: 'ico_alert',
    titleTemplate: '{space}: OTD cayó {delta}pts ({from}% → {to}%)',
    suggestionTemplate: 'Revisar stuck assets y capacity de {bottleneck_role}',
    recipientStrategy: 'space_account'
  },
  {
    id: 'margin_erosion',
    signal: 'margin_pct',
    condition: 'drop',
    threshold: 10,
    windowPeriods: 2,
    severity: 'medium',
    category: 'finance_alert',
    titleTemplate: '{space}: margen cayó a {to}%',
    suggestionTemplate: 'Revisar scope creep o renegociar tarifa',
    recipientStrategy: 'finance_admin'
  },
  // Agregar nueva regla = 1 objeto aquí. Zero código nuevo.
]
```

**Health score weights — registro configurable:**

```typescript
interface HealthScoreDimension {
  id: string
  weight: number              // 0-1, suma = 1.0
  signalSource: string        // serving view o función
  normalize: (raw: number) => number  // 0-100 normalizado
  label: string
}

const HEALTH_DIMENSIONS: HealthScoreDimension[] = [
  { id: 'delivery', weight: 0.40, signalSource: 'ico_metrics', normalize: normalizeOtdRpa, label: 'Delivery' },
  { id: 'finance',  weight: 0.30, signalSource: 'finance_metrics', normalize: normalizeMargin, label: 'Finanzas' },
  { id: 'engagement', weight: 0.15, signalSource: 'engagement_signals', normalize: normalizeEngagement, label: 'Engagement' },
  { id: 'capacity', weight: 0.15, signalSource: 'capacity_metrics', normalize: normalizeUtilization, label: 'Capacidad' },
  // Agregar nueva dimensión = 1 objeto. El score se recalcula automáticamente.
]
```

**Recommendation templates — catálogo extensible:**

```typescript
interface RecommendationTemplate {
  id: string
  triggerAnomalies: string[]   // qué anomalías disparan esta recomendación
  type: 'reassign' | 'reprice' | 'hire' | 'escalate' | 'reduce_scope'
  titleTemplate: string
  bodyTemplate: string
  actionUrl: string            // deep link a la acción sugerida
  priority: 'low' | 'medium' | 'high'
  autoExpireDays: number       // se resuelve sola si la anomalía desaparece
}

const RECOMMENDATION_TEMPLATES: RecommendationTemplate[] = [
  {
    id: 'reassign_from_idle',
    triggerAnomalies: ['otd_drop', 'capacity_overload'],
    type: 'reassign',
    titleTemplate: 'Reasignar {fteAmount} FTE de {role} de {sourceSpace} a {targetSpace}',
    bodyTemplate: '{sourceSpace} tiene OTD {sourceOtd}% (holgado). {targetSpace} está al {targetOtd}% (stressed).',
    actionUrl: '/agency/spaces/{targetSpaceId}?tab=team',
    priority: 'high',
    autoExpireDays: 14
  },
  // Cada recomendación nueva = 1 template. La engine ya sabe ejecutarla.
]
```

### 7.5 Testing de reglas de negocio (el corazón del sistema)

Los tests actuales validan infra ("RPA viene de ICO, no de Notion"). Enterprise necesita tests que validen **decisiones de negocio**:

**Tests de anomaly detection:**

```typescript
describe('anomaly detection', () => {
  it('triggers otd_drop when OTD falls >15pts in 2 consecutive periods', () => {
    const signals = [
      { period: '2026-01', otd_pct: 92 },
      { period: '2026-02', otd_pct: 85 },
      { period: '2026-03', otd_pct: 74 }  // drop: 92 → 74 = 18pts in 2 periods
    ]
    const anomalies = detectAnomalies(signals, ANOMALY_RULES)
    expect(anomalies).toContainEqual(expect.objectContaining({
      ruleId: 'otd_drop', severity: 'high', delta: 18
    }))
  })

  it('does NOT trigger otd_drop for single-period dip', () => {
    const signals = [
      { period: '2026-01', otd_pct: 92 },
      { period: '2026-02', otd_pct: 75 },
      { period: '2026-03', otd_pct: 90 }  // recovered — not a trend
    ]
    const anomalies = detectAnomalies(signals, ANOMALY_RULES)
    expect(anomalies.filter(a => a.ruleId === 'otd_drop')).toHaveLength(0)
  })
})
```

**Tests de health score:**

```typescript
describe('health score', () => {
  it('returns 0 when all signals are null (no data)', () => {
    const score = computeHealthScore({ delivery: null, finance: null, engagement: null, capacity: null })
    expect(score.value).toBe(0)
    expect(score.completeness).toBe('no_data')
  })

  it('weighs delivery at 40% of total score', () => {
    const fullDelivery = computeHealthScore({
      delivery: { otd: 100, rpa: 1.0 },  // perfect delivery
      finance: null, engagement: null, capacity: null
    })
    expect(fullDelivery.value).toBe(40)  // 100% delivery × 0.4 weight
    expect(fullDelivery.completeness).toBe('partial')
  })

  it('returns optimal for score >= 80', () => {
    const score = computeHealthScore({
      delivery: { otd: 95, rpa: 1.2 },
      finance: { margin: 25 },
      engagement: { feedbackRate: 90, loginRecency: 2 },
      capacity: { utilizationBalance: 85 }
    })
    expect(score.value).toBeGreaterThanOrEqual(80)
    expect(score.zone).toBe('optimal')
  })
})
```

**Tests de recommendations:**

```typescript
describe('recommendation engine', () => {
  it('suggests reassignment when one space is stressed and another is idle', () => {
    const context = {
      spaces: [
        { id: 'A', otd: 95, capacityUtilization: 60 },  // idle
        { id: 'B', otd: 72, capacityUtilization: 110 }   // stressed
      ],
      anomalies: [{ ruleId: 'otd_drop', spaceId: 'B' }]
    }
    const recs = generateRecommendations(context, RECOMMENDATION_TEMPLATES)
    expect(recs).toContainEqual(expect.objectContaining({
      type: 'reassign', sourceSpaceId: 'A', targetSpaceId: 'B'
    }))
  })

  it('suggests hiring when pipeline requires FTE that does not exist', () => {
    const context = {
      capacityForecast: { design: { available: 0.2, required: 1.7 } },
      anomalies: [{ ruleId: 'capacity_overload', role: 'design' }]
    }
    const recs = generateRecommendations(context, RECOMMENDATION_TEMPLATES)
    expect(recs).toContainEqual(expect.objectContaining({
      type: 'hire', role: 'design'
    }))
  })

  it('auto-resolves recommendation when underlying anomaly disappears', () => {
    const rec = { id: 'rec-1', triggerAnomalyId: 'anomaly-1', status: 'notified' }
    const activeAnomalies = [] // anomaly resolved
    const updated = reconcileRecommendations([rec], activeAnomalies)
    expect(updated[0].status).toBe('auto_resolved')
  })
})
```

**Test coverage requirements:**

| Componente | Tests mínimos | Tipo |
|------------|--------------|------|
| Anomaly rules | 1 positive + 1 negative per rule | Unit (pure function) |
| Health score | Null handling, partial data, edge weights | Unit |
| Risk score | Each factor individually + composite | Unit |
| Recommendations | Trigger condition + auto-resolve + escalation | Unit |
| Capacity forecast | Empty pipeline, full pipeline, mixed | Unit |
| Store contracts | Each store function returns correct type | Integration |

---

## 8. Reglas de implementación

1. **Space es el objeto central** — toda feature nueva debe conectar con Space 360
2. **No duplicar cálculos** — reusar P&L engine (`GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`), ICO materializations, capacity economics
3. **Inteligencia rule-based primero** — no ML hasta que las reglas manuales estén validadas
4. **Datos antes que UI** — APIs y materializations primero, vistas después
5. **Outbox-first** — toda mutación emite evento, toda señal puede generar notificación
6. **Gradual, no Big Bang** — cada fase entrega valor independiente
7. **Contratos tipados** — stores exponen interfaces, consumers nunca hacen queries directas
8. **Materializar antes que computar** — serving views > CTEs on-demand
9. **Registros declarativos** — reglas, weights, templates son data, no código
10. **Tests de negocio obligatorios** — cada regla de anomaly/health/recommendation tiene test positivo + negativo

---

## 9. Dependencias cross-module

```
ICO Engine ──metrics──→ Agency Intelligence (anomaly + health score)
Finance ──P&L──→ Economics Engine (margin, profitability)
Payroll ──labor cost──→ Capacity Engine (loaded cost per FTE)
Delivery ──tasks──→ Space 360 (project status, stuck assets)
Notifications ──webhook bus──→ Alert delivery (anomalies, risks)
Nexa ──tools──→ Natural language access to Agency Intelligence
```

---

## 10. Anti-patterns a evitar

- No construir un "Agency BigQuery" — migrar a Postgres para operacional, BigQuery solo para analytics/histórico
- No reimplementar P&L — consumir el motor Finance existente
- No crear alertas sin acción — cada alerta debe sugerir qué hacer
- No agregar tabs sin datos — si no hay API, no hay tab
- No mezclar Agency con Admin — Agency es para operar, Admin es para gobernar
- No agregar skills/SLA sin serving view — materializar primero, consumir después
- No construir forecasting sin datos históricos de al menos 3 meses

---

## 11. Capacidades avanzadas — sobre el estándar de la industria

Las secciones 1-10 ponen a Greenhouse a la par de las mejores herramientas de agencia (Kantata, Productive.io, Forecast.app). Esta sección define lo que lo pone **por encima**.

### 11.1 Revenue Intelligence — Pipeline conectado a operación

Hoy Finance sabe cuánto facturaste. Pero no sabe cuánto **vas** a facturar. La conexión CRM → Finance → Capacity no existe como pipeline unificado.

**Flujo completo:**

```
HubSpot deals (pipeline)
  │
  ├── Expected revenue por mes (deal amount × probability)
  │
  ├── Services en renewal_pending
  │   → Revenue at risk (si no renuevan)
  │
  ├── Services en onboarding
  │   → Revenue incoming (confirmado, aún sin facturar)
  │
  └── Capacity required
      → FTE que los deals van a necesitar si se cierran
      → Match contra FTE disponible por skill

= Revenue Forecast Real
  ├── Best case: pipeline × 1.0
  ├── Expected: pipeline × probability weighted
  ├── Worst case: only confirmed (sin pipeline)
  └── At risk: renewals pendientes sin acción
```

**Data model:**

```sql
CREATE TABLE greenhouse_serving.revenue_pipeline (
  pipeline_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,           -- 'hubspot_deal', 'service_renewal', 'service_onboarding'
  source_id TEXT NOT NULL,        -- deal_id, service_id
  space_id TEXT,
  organization_id TEXT,
  expected_revenue_clp NUMERIC,
  probability NUMERIC,            -- 0-1 (deals), 1.0 (renewals activas), 0.5 (renewals pendientes)
  expected_start_date DATE,
  expected_monthly_revenue NUMERIC,
  required_fte JSONB,             -- {"design": 0.5, "development": 1.0}
  status TEXT,                    -- 'pipeline', 'confirmed', 'at_risk', 'lost'
  materialized_at TIMESTAMPTZ DEFAULT now()
);
```

**Consumers:**
- Capacity Forecast: ¿tenemos equipo para el pipeline?
- Finance Forecast: ¿cuánto vamos a facturar los próximos 3 meses?
- Risk Score: deals grandes at-risk incrementan risk score del Space
- Nexa: "¿Cómo se ve el pipeline para Q2?"

### 11.2 Task-Level Profitability — Rentabilidad por entregable

Las mejores agencias miden margen **por asset**. No solo "Space X tiene 22% de margen" sino "este video costó $800K en horas y generó $200K — margen negativo".

**Cálculo:**

```
Para cada task/asset completado:

  cost_of_asset = Σ (team_member_hours × loaded_cost_per_hour)
    └── loaded_cost_per_hour = member_capacity_economics.loaded_cost_target / (hours_per_month × fte)

  revenue_per_asset = space_revenue_period / assets_delivered_period
    └── distribuido uniformemente (v1) o por tipo de asset (v2)

  asset_margin = revenue_per_asset - cost_of_asset
  asset_margin_pct = asset_margin / revenue_per_asset × 100
```

**Prerequisito:** time tracking. Greenhouse no tiene time tracking hoy. Opciones:

1. **Estimación por FTE** (v1, sin time tracking): usar FTE allocation × período para estimar horas por Space. Menos preciso pero implementable hoy.
2. **Time tracking integrado** (v2): agregar time entries por task. Requiere UI + hábito del equipo.
3. **Inferencia desde ICO** (v1.5): usar throughput + cycle time de ICO para inferir horas por task type.

**Serving view:**

```sql
CREATE TABLE greenhouse_serving.asset_profitability (
  asset_id TEXT PRIMARY KEY,          -- task_id from ICO/Notion
  space_id TEXT NOT NULL,
  period_key TEXT NOT NULL,           -- YYYY-MM
  asset_type TEXT,                    -- 'video', 'post', 'design', etc.
  estimated_cost_clp NUMERIC,        -- cost based on FTE or time
  attributed_revenue_clp NUMERIC,    -- revenue share
  margin_clp NUMERIC,
  margin_pct NUMERIC,
  computation_method TEXT,            -- 'fte_estimate', 'time_tracked', 'ico_inference'
  materialized_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.3 Scope Intelligence — Detección automática de scope creep

Cuando un proyecto fue vendido con un scope y se entrega significativamente más, la agencia pierde margen sin darse cuenta.

**Señales de scope creep:**

| Señal | Fuente | Threshold |
|-------|--------|-----------|
| Assets entregados > assets planeados | Service scope vs ICO tasks completed | >150% |
| Duración real > duración contratada | Service start/end vs actual | >120% |
| RPA creciente (más revisiones) | ICO rpa_avg trend | >2.0 y subiendo |
| Horas/FTE consumidas > presupuesto | Capacity × período vs contrato | >130% |
| Nuevos task types no contemplados | ICO task categorization vs scope original | Cualquier mismatch |

**Implementación:**

```typescript
interface ScopeContract {
  serviceId: string
  plannedAssets: number | null
  plannedMonths: number
  plannedFte: number
  assetTypes: string[]           // tipos de entregables contemplados
  startDate: string
  targetEndDate: string
}

interface ScopeStatus {
  serviceId: string
  assetsDelivered: number
  assetsRatio: number            // actual / planned (1.0 = on scope)
  monthsElapsed: number
  monthsRatio: number            // elapsed / planned
  fteConsumed: number
  fteRatio: number               // consumed / planned
  newAssetTypes: string[]        // tipos no contemplados originalmente
  scopeCreepScore: number        // 0-100 (0 = on scope, 100 = severe creep)
  alert: boolean
}
```

**Scope Creep Score:**

```
score = weighted sum de:
  assets_ratio > 1.5: +30 points
  months_ratio > 1.2: +20 points
  fte_ratio > 1.3: +25 points
  rpa > 2.0 trending up: +15 points
  new_asset_types.length > 0: +10 points

Alert threshold: score > 40
```

### 11.4 Skills Matrix + Intelligent Staffing

Hoy Team Capacity dice "María tiene 0.8 FTE". No dice **qué sabe hacer María**. La diferencia entre asignar bien y asignar mal es la diferencia entre OTD 95% y OTD 65%.

**Data model:**

```sql
-- Skill catalog
CREATE TABLE greenhouse_core.skill_catalog (
  skill_code TEXT PRIMARY KEY,       -- 'motion_design', 'ux_research', 'react_development'
  skill_name TEXT NOT NULL,
  skill_category TEXT NOT NULL,      -- 'design', 'development', 'strategy', 'media', 'account'
  seniority_levels TEXT[] DEFAULT ARRAY['junior', 'mid', 'senior', 'lead']
);

-- Member skills (many-to-many)
CREATE TABLE greenhouse_core.member_skills (
  member_id TEXT NOT NULL,
  skill_code TEXT NOT NULL REFERENCES greenhouse_core.skill_catalog(skill_code),
  seniority_level TEXT NOT NULL,     -- 'junior', 'mid', 'senior', 'lead'
  verified_by TEXT,                  -- who validated this skill
  verified_at TIMESTAMPTZ,
  PRIMARY KEY (member_id, skill_code)
);

-- Service skill requirements (what a service needs)
CREATE TABLE greenhouse_core.service_skill_requirements (
  service_id TEXT NOT NULL,
  skill_code TEXT NOT NULL,
  required_seniority TEXT NOT NULL,  -- minimum level
  required_fte NUMERIC NOT NULL,     -- how much FTE of this skill
  PRIMARY KEY (service_id, skill_code)
);
```

**Intelligent Staffing Engine:**

```typescript
interface StaffingMatch {
  memberId: string
  memberName: string
  skillCode: string
  memberSeniority: string
  requiredSeniority: string
  seniorityMatch: 'exact' | 'over_qualified' | 'under_qualified'
  availableFte: number
  requiredFte: number
  fitScore: number              // 0-100
}

// El engine compara requirements vs available members:
// 1. Filter by skill_code match
// 2. Score by seniority match (exact=100, over=80, under=40)
// 3. Score by FTE availability (available >= required = 100, else proportional)
// 4. Rank by composite fit score
// 5. Flag gaps: skills needed but no one available
```

**Consumer en Space 360 Team tab:**

```
Team tab muestra:
  Assigned: 3 personas, 2.1 FTE
  Skill coverage:
    ✓ Motion Design (senior) — Carlos, 0.5 FTE
    ✓ Copywriting (mid) — Luis, 0.4 FTE
    ⚠ UX Research (senior) — sin asignación (required by service)

  Recommendations:
    "Service 'Creative Hub' requiere UX Research (senior).
     Ana tiene esa skill y 0.3 FTE disponible.
     ¿Asignar a este Space?"
```

**Estado runtime 2026-04-10 (TASK-157):**

- Las tablas `greenhouse_core.skill_catalog`, `greenhouse_core.member_skills` y `greenhouse_core.service_skill_requirements` ya existen en PostgreSQL y quedaron tipadas en `src/types/db.d.ts`.
- Endpoints operativos:
  - `GET /api/agency/skills`
  - `GET/PATCH /api/agency/skills/members/[memberId]?spaceId=...`
  - `GET/PATCH /api/agency/skills/services/[serviceId]?spaceId=...`
  - `GET /api/agency/staffing?spaceId=...&serviceId=...`
- El primer corte del staffing engine usa el runtime actual de team/capacity y evalúa cobertura sobre los miembros ya asignados al `space_id` canónico; gaps y fit scores quedan visibles en `Space 360 > Team`.

### 11.5 SLA/SLO contractual por servicio

Cada servicio contratado puede tener compromisos formales definidos por indicador. El primer corte ya no usa una tabla genérica `service_sla`; materializa la cadena `SLI -> SLO -> SLA` por servicio con evidencia y serving snapshot propios.

**Data model:**

```sql
CREATE TABLE greenhouse_core.service_sla_definitions (
  definition_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  indicator_code TEXT NOT NULL,      -- 'otd_pct' | 'rpa_avg' | 'ftr_pct' | 'revision_rounds' | 'ttm_days'
  indicator_formula TEXT NOT NULL,
  measurement_source TEXT NOT NULL,
  comparison_mode TEXT NOT NULL,     -- 'at_least' | 'at_most'
  unit TEXT NOT NULL,                -- 'percent' | 'ratio' | 'rounds' | 'days'
  sli_label TEXT,
  slo_target_value NUMERIC NOT NULL,
  sla_target_value NUMERIC NOT NULL,
  breach_threshold NUMERIC,
  warning_threshold NUMERIC,
  display_order INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (service_id, indicator_code)
);

CREATE TABLE greenhouse_serving.service_sla_compliance_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  indicator_code TEXT NOT NULL,
  compliance_status TEXT NOT NULL,   -- met | at_risk | breached | source_unavailable
  source_status TEXT NOT NULL,       -- ready | source_unavailable | insufficient_linkage | insufficient_sample
  trend_status TEXT NOT NULL,
  actual_value NUMERIC,
  delta_to_target NUMERIC,
  confidence_level TEXT,
  evidence_json JSONB NOT NULL
);
```

**SLA Compliance Engine:**

```typescript
interface SlaComplianceReport {
  serviceId: string
  spaceId: string
  overallStatus: 'healthy' | 'at_risk' | 'breached' | 'partial' | 'no_sla_defined'
  summary: {
    totalDefinitions: number
    metCount: number
    atRiskCount: number
    breachedCount: number
    sourceUnavailableCount: number
  }
  items: Array<{
    indicatorCode: string
    target: number
    actual: number | null
    unit: string
    complianceStatus: 'met' | 'at_risk' | 'breached' | 'source_unavailable'
    sourceStatus: 'ready' | 'source_unavailable' | 'insufficient_linkage' | 'insufficient_sample'
    deltaToTarget: number | null
    trend: 'improving' | 'stable' | 'degrading'
    evidence: {
      sourceLabel: string
      reasons: string[]
    }
  }>
}
```

**Indicadores soportados en v1:**
- `otd_pct`, `rpa_avg`, `ftr_pct` desde `ICO Engine`
- `revision_rounds` desde `ico_engine.v_tasks_enriched`
- `ttm_days` desde `greenhouse_conformed.delivery_projects` usando el helper canónico de TTM

**Indicadores explícitamente diferidos en v1:**
- `response_hours`
- `first_delivery_days`

Estos dos quedan fuera hasta que exista una fuente canónica materializada y auditable; no se estiman inline desde la UI ni desde la route.

**Consumer:**
- Service detail page: compliance dashboard
- Space 360 Services tab: SLA status per service
- Anomaly detection: SLA breach o trending-toward-breach → alert
- Admin Center: CRUD de definiciones SLA por servicio

**Runtime contract v1:**
- route canónica: `GET/POST/PATCH/DELETE /api/agency/services/[serviceId]/sla?spaceId=...`
- aislamiento tenant obligatorio por `space_id`
- las métricas nunca se calculan inline desde componentes; se leen desde ICO Engine / BigQuery y se persisten en `greenhouse_serving.service_sla_compliance_snapshots`

### 11.6 Client Lifecycle Intelligence — Más allá del delivery

El lifecycle completo de un cliente en la agencia, desde que entra hasta que se va (o crece).

**Lifecycle Stages:**

```
Prospect → Onboarding → Active → Growth → Renewal → Churned
    ↑                                          │
    └──────────── Win-back ←───────────────────┘
```

**Signals por stage:**

```typescript
interface ClientLifecycleSignals {
  // Onboarding quality
  onboardingDays: number             // días desde service start hasta primer delivery
  firstDeliveryOtd: boolean          // ¿el primer entregable fue on-time?
  onboardingSatisfaction: number     // 1-5 (si se trackea)

  // Engagement
  loginFrequency: number             // logins/week del client user
  feedbackResponseDays: number       // promedio días para responder feedback
  lastLoginDaysAgo: number

  // Growth
  servicesCountTrend: 'growing' | 'stable' | 'shrinking'
  revenueGrowthPct: number           // YoY o QoQ

  // Churn signals
  churnRiskScore: number             // composite 0-100
  churnSignals: string[]             // lista de señales activas
}
```

**Churn Prediction (rule-based, no ML):**

```
Churn Score = suma de:
  OTD < 70% por 2+ meses: +25 points
  RPA > 2.5 trending up: +15 points
  Margin < 5%: +20 points
  Receivables aging > 60 días: +15 points
  No login en 30+ días: +10 points
  Feedback pending > 5 items: +10 points
  Service en renewal_pending sin acción > 30 días: +20 points
  Revenue declining QoQ: +15 points

Churn Risk:
  0-20: Bajo → no action
  21-40: Medio → watch
  41-60: Alto → escalate to Account Lead
  61+: Crítico → escalate to Operations Lead + Account Lead
```

**Expansion Signals:**

```
Señales de oportunidad de growth:
  - OTD > 90% sostenido: cliente satisfecho, puede querer más
  - Services budget < capacity allocated: cliente paga menos de lo que usamos
  - Feedback positivo frecuente: relación fuerte
  - New business lines not covered: tiene Reach pero no Digital

→ Recommendation: "Space Acme tiene alta satisfacción (OTD 94%, feedback
   response 2h) pero solo contrata Creative Hub. Oportunidad de upsell:
   Social Media Management (línea Reach). Account Lead notificado."
```

### 11.7 Nexa Actionable — AI que ejecuta, no solo responde

Hoy Nexa responde preguntas. La visión enterprise es que Nexa **opere**:

**Nivel 1 — Query (ya existe):**

```
User: "¿Cómo está Space Acme?"
Nexa: "Space Acme tiene health score 72..."
```

**Nivel 2 — Recommend (Fase 3 del roadmap):**

```
User: "¿Qué debería hacer con Space Acme?"
Nexa: "Tengo 2 recomendaciones activas:
  1. Reasignar 0.3 FTE Design de Space Beta (holgado)
  2. Escalar cobro de $3.2M receivable aging 60+ días
  ¿Quieres que ejecute alguna?"
```

**Nivel 3 — Act (Fase 4 del roadmap):**

```
User: "Sí, reasigna el Design"
Nexa: "Moviendo 0.3 FTE de Carlos (Motion Design, senior) desde
  Space Beta a Space Acme. Confirmo:
  - Carlos pasa de 0.5 a 0.2 FTE en Beta
  - Carlos pasa de 0 a 0.3 FTE en Acme
  - Notificación enviada a Carlos y Account Lead de ambos Spaces
  ¿Confirmo?"
User: "Confirma"
Nexa: [ejecuta via /api/admin/team/assignments, emite outbox event,
       notifica via webhook bus, actualiza capacity forecast]
  "Reasignación completada. Health score proyectado de Acme: 79 (↑7pts).
   Space Beta mantiene OTD >90% con la capacidad restante."
```

**Nexa Tools necesarios:**

```typescript
// Tools que Nexa necesita para operar
const NEXA_AGENCY_TOOLS = [
  { name: 'get_space_360', description: 'Full Space health + anomalies + recommendations' },
  { name: 'get_capacity_overview', description: 'Team utilization + available FTE by skill' },
  { name: 'get_revenue_forecast', description: 'Pipeline + renewals + projections' },
  { name: 'get_anomalies', description: 'Active anomalies with suggested actions' },
  { name: 'execute_reassignment', description: 'Move FTE between spaces', requiresConfirmation: true },
  { name: 'escalate_to_lead', description: 'Send notification to Account/Ops Lead' },
  { name: 'generate_retrospective', description: 'Auto-generate cycle retrospective brief' },
]
```

### 11.8 Auto-Retrospective — Knowledge capture automático

Cuando un ciclo cierra o un período de servicio termina, Greenhouse genera automáticamente un brief:

```
┌─────────────────────────────────────────────────────┐
│  Space Acme — Retrospective Q1 2026                  │
│  Auto-generated from operational data                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  DELIVERY                                            │
│  Delivered: 42 assets (planned: 35, +20%)            │
│  OTD: 88% (target: 90%, -2pts)                       │
│  RPA: 1.4 (target: <1.5, ✓)                         │
│  Stuck assets peak: 8 (week 9)                       │
│                                                      │
│  FINANCE                                             │
│  Revenue: $15.2M CLP                                 │
│  Cost: $11.8M CLP (labor $9.1M + direct $2.7M)     │
│  Margin: 22% ($3.4M)                                │
│  Receivables: $0 (fully collected)                   │
│                                                      │
│  TEAM                                                │
│  Assigned: 3 people, 2.1 FTE                         │
│  Utilization: Design 110% (⚠), Dev 75%, Account 90% │
│                                                      │
│  CHALLENGES                                          │
│  - Design bottleneck weeks 8-10 (RPA spiked to 2.1) │
│  - Motion Design tasks took 2x estimated time        │
│  - Scope expanded +20% vs original (no price adjust) │
│                                                      │
│  RECOMMENDATIONS FOR Q2                              │
│  - Add 0.2 FTE Design or reduce video scope          │
│  - Renegotiate pricing (+15% for expanded scope)     │
│  - Set SLA: response time 24h, revision limit 2      │
│                                                      │
│  [Export PDF]  [Share with Client]  [Save to Wiki]   │
└─────────────────────────────────────────────────────┘
```

**Generación:**
- Trigger: `payroll_period.exported` o manual via Nexa/UI
- Data sources: ICO metrics, Finance P&L, Capacity economics, anomalies del período
- Template: structured markdown generado por code (no LLM para v1)
- Output: persistido en `greenhouse_serving.retrospective_briefs`, exportable como PDF

### 11.9 Client-Facing Transparency — El diferenciador

Greenhouse ya tiene portal client-facing. **Esto es raro en la industria** — la mayoría de agencias tienen herramientas internas separadas.

**Lo que podemos hacer que casi nadie hace:**

Exponer al cliente (con su login) métricas seleccionadas de su Space:

```
Client Portal — Space Dashboard (lo que el cliente ve)

  Tu equipo: 3 personas asignadas
  Entrega a tiempo: 92% ✓
  Próximo milestone: 15 de abril
  Assets entregados este mes: 12
  Feedback pendiente de tu lado: 2 items ⚠

  [No muestra: margin, cost, internal capacity, churn risk]
```

**Implementación:** filtrar el Space 360 response según `tenantType === 'client'`:
- Client ve: OTD, RPA, assets delivered, milestones, feedback pending
- Client NO ve: margin, cost, capacity utilization, health score, risk score, internal recommendations

---

## 12. Roadmap extendido

### Fases 1-4 (ya definidas en §6)

Fix → Operate → Intelligence → Advanced

### Fase 5 — Revenue & Scope Intelligence

| Capacidad | Esfuerzo | Prerequisito |
|-----------|----------|-------------|
| Revenue pipeline (HubSpot → forecast) | Alto | HubSpot integration sync |
| Scope Intelligence (planned vs actual) | Medio | Service scope fields + ICO data |
| SLA/SLO por servicio | Medio | Service model extension |
| Task-level profitability (v1 FTE estimate) | Medio | ICO tasks + capacity economics |

### Fase 6 — Team & Client Intelligence

| Capacidad | Esfuerzo | Prerequisito |
|-----------|----------|-------------|
| Skills matrix + catalog | Alto | New data model |
| Intelligent staffing engine | Alto | Skills matrix |
| Client lifecycle signals | Medio | Login tracking + engagement data |
| Churn prediction (rule-based) | Medio | Client lifecycle + delivery + finance |
| Expansion signal detection | Bajo | Client lifecycle + services |

### Fase 7 — AI-Native Operations

| Capacidad | Esfuerzo | Prerequisito |
|-----------|----------|-------------|
| Nexa agency tools (query + recommend) | Alto | Intelligence layer (Fase 3) |
| Nexa actionable (execute with confirmation) | Muy alto | Agency tools + mutation APIs |
| Auto-retrospective generation | Medio | ICO + Finance + template engine |
| Client-facing transparency (filtered Space data) | Medio | Space 360 + client portal auth |

---

## 13. Métricas de éxito del Operator Layer

Cómo saber que el sistema funciona:

| Métrica | Baseline (hoy) | Target (6 meses) | Cómo medir |
|---------|----------------|-------------------|------------|
| Tiempo para detectar OTD degradation | Manual (días) | <2h (automático) | Anomaly detection latency |
| Tiempo para detectar scope creep | Nunca (manual) | <1 semana | Scope intelligence alerts |
| % de Spaces con health score | 0% | 100% | Materialized scores |
| Recommendations generadas vs actuadas | 0 | >50% actuadas | Recommendation lifecycle |
| Revenue forecast accuracy | No existe | ±15% vs actual | Pipeline vs actual revenue |
| Client churn predicted vs actual | No existe | >70% predicted | Churn score vs actual churn |
| Nexa queries sobre Agency | Low | 5x increase | Nexa tool usage analytics |

---

## 14. Degradation Strategy — Qué pasa cuando algo falla

Cada componente del Operator Layer depende de fuentes externas. Cuando una fuente falla, el sistema debe **degradar gracefully**, no romperse ni mostrar datos engañosos.

### Principio

> **Parcial visible > completo invisible.** Mejor mostrar un health score al 60% de completitud que no mostrar nada. Pero siempre indicar qué falta.

### Degradation matrix

| Componente | Fuente | Si falla | UX | Backend |
|------------|--------|----------|-----|---------|
| Health Score | ICO materialized | Score parcial sin dimension delivery | Badge "Parcial — sin datos ICO" | `completeness: 'partial'`, `missing: ['delivery']` |
| Health Score | Finance P&L | Score parcial sin dimension finance | Badge "Parcial — sin datos financieros" | Mismo patrón |
| Health Score | Capacity | Score parcial sin dimension capacity | Badge "Parcial" | Mismo patrón |
| Risk Score | Receivables aging | Risk sin componente financiero | Score recalculado con weights redistribuidos | `excludedFactors: ['receivables']` |
| Revenue Forecast | HubSpot sync | Pipeline stale | Chip "Pipeline: hace 3 días" con color warning | `pipeline.staleDays > 0` |
| Anomaly Detection | ICO stale >2h | No detecta anomalías de delivery | Ops Health muestra "Anomaly detection: stale" | Cron health check alerta |
| Space 360 | Postgres down | Fallback a último snapshot | Banner "Datos de hace X minutos" | Cache de último response exitoso |
| SLA Compliance | ICO o Finance | Compliance parcial | "2 de 5 SLAs verificables" | `verifiableSlas: 2, totalSlas: 5` |
| Scope Intelligence | Service scope null | No puede computar scope creep | Chip "Sin scope definido" | `scopeStatus: 'no_contract'` |
| Skills Match | Skills matrix vacía | Staffing sin skill matching | "Asignación por FTE (sin skills)" | Fallback a capacity-only |

### Freshness indicators en UI

Cada sección que depende de datos materializados muestra su freshness:

```typescript
interface DataFreshness {
  source: string           // 'ico_metrics', 'finance_pnl', 'capacity_economics'
  lastMaterializedAt: string | null
  ageMinutes: number
  status: 'fresh' | 'acceptable' | 'stale' | 'unavailable'
  thresholdMinutes: number // cuándo pasa de acceptable a stale
}

// Thresholds por fuente:
// ICO metrics: fresh <60min, acceptable <360min, stale >360min
// Finance P&L: fresh <120min, acceptable <720min, stale >720min
// Capacity: fresh <1440min (24h), acceptable <2880min, stale >2880min
// Pipeline: fresh <1440min, acceptable <4320min (3d), stale >4320min
```

### Cache strategy

```
Cada serving view tiene un cache layer:
  1. Postgres serving view (source of truth, refreshed by projections)
  2. API response cache (in-memory, 5 min TTL)
  3. Client-side SWR (stale-while-revalidate, show last known while fetching)

Si Postgres falla:
  → API sirve from in-memory cache (si <30 min old)
  → Si cache expired → 503 con retry-after header
  → Client SWR muestra último conocido con banner "Reconectando..."
```

---

## 15. Permission Model dentro de Agency

No todos los internos deben ver todo. La inteligencia financiera y de riesgo requiere control granular.

### Roles dentro del Operator Layer

| Rol | Qué ve | Qué NO ve | Qué puede hacer |
|-----|--------|-----------|------------------|
| **Operations Lead** | Todo | — | Ejecutar recomendaciones, reasignar, escalar |
| **Account Lead** | Su Space(s): delivery, team, SLA, engagement | Margin %, cost breakdown, otros Spaces, churn score | Solicitar reasignación, responder feedback |
| **Team Lead** | Capacity de su rol, performance de su equipo | Finance, churn, pricing, otros roles | Ver utilización, solicitar recursos |
| **Designer/Developer** | Su propia utilización, sus assignments | Cost, margin, otros members, scores | Ver sus KPIs propios en Mi Ficha |
| **Finance Manager** | Economics, margin, P&L, receivables | Capacity por skill, client engagement | Configurar SLA financieros |
| **Admin** | Todo + governance | — | Configurar weights, thresholds, permissions |

### Implementación

```typescript
// Cada dato del Space 360 tiene un visibility level
interface Space360Field {
  field: string
  visibleTo: ('operations_lead' | 'account_lead' | 'team_lead' | 'finance' | 'admin')[]
}

const SPACE_360_VISIBILITY: Space360Field[] = [
  { field: 'health_score',           visibleTo: ['operations_lead', 'admin'] },
  { field: 'health_score_zone',      visibleTo: ['operations_lead', 'account_lead', 'admin'] }, // zone sí, number no
  { field: 'risk_score',             visibleTo: ['operations_lead', 'admin'] },
  { field: 'churn_prediction',       visibleTo: ['operations_lead', 'admin'] },
  { field: 'margin_pct',             visibleTo: ['operations_lead', 'finance', 'admin'] },
  { field: 'revenue',                visibleTo: ['operations_lead', 'account_lead', 'finance', 'admin'] },
  { field: 'cost_breakdown',         visibleTo: ['operations_lead', 'finance', 'admin'] },
  { field: 'otd_pct',                visibleTo: ['operations_lead', 'account_lead', 'team_lead', 'admin'] },
  { field: 'rpa_avg',                visibleTo: ['operations_lead', 'account_lead', 'team_lead', 'admin'] },
  { field: 'team_utilization',       visibleTo: ['operations_lead', 'team_lead', 'admin'] },
  { field: 'member_loaded_cost',     visibleTo: ['operations_lead', 'finance', 'admin'] },
  { field: 'scope_creep_score',      visibleTo: ['operations_lead', 'account_lead', 'admin'] },
  { field: 'sla_compliance',         visibleTo: ['operations_lead', 'account_lead', 'finance', 'admin'] },
  { field: 'expansion_signals',      visibleTo: ['operations_lead', 'account_lead', 'admin'] },
  { field: 'anomalies',              visibleTo: ['operations_lead', 'admin'] },
  { field: 'recommendations',        visibleTo: ['operations_lead', 'admin'] },
]
```

### Relación con TASK-136 (View Access Governance)

El permission model de Agency **no reemplaza** la gobernanza de vistas (TASK-136). Se complementan:

- TASK-136 controla **qué páginas** ve cada rol (sidebar visibility)
- Este permission model controla **qué datos dentro de una página** ve cada rol (field-level visibility)

```
TASK-136: "Account Lead puede ver /agency/spaces/[id]" → acceso a la página
Permission Model: "Account Lead en esa página ve OTD pero no ve margin" → acceso al dato
```

---

## 16. Data Retention Policy

### Principio

> **Los datos operativos tienen ciclo de vida. Los históricos se archivan, no se eliminan.**

### Retention por tipo de dato

| Dato | Hot (Postgres serving) | Warm (Postgres archive) | Cold (BigQuery) | Eliminado |
|------|----------------------|------------------------|----------------|-----------|
| Health scores | Último score + 6 meses trend | 6-24 meses | >24 meses | Nunca |
| Risk scores | Último + 6 meses | 6-24 meses | >24 meses | Nunca |
| Anomalies (open) | Indefinido mientras open | — | — | — |
| Anomalies (resolved) | 3 meses | 3-12 meses | >12 meses | Nunca |
| Recommendations (acted) | 3 meses | 3-12 meses | >12 meses | Nunca |
| Recommendations (expired) | 30 días | 1-6 meses | >6 meses | >24 meses |
| Capacity forecast | Último + 3 meses | 3-12 meses | >12 meses | >24 meses |
| Revenue pipeline | Último + 6 meses | 6-24 meses | >24 meses | Nunca |
| SLA compliance | Último + 12 meses | 12-36 meses | >36 meses | Nunca |
| Retrospectives | Indefinido | — | — | Nunca |
| Scope creep snapshots | Último + 6 meses | 6-24 meses | >24 meses | Nunca |
| Asset profitability | 12 meses | 12-36 meses | >36 meses | Nunca |

### Archiving mechanism

```sql
-- Cron mensual: mueve datos hot → warm
-- Implementar como script SQL programado
-- Pattern: INSERT INTO archive_table SELECT ... WHERE created_at < threshold; DELETE FROM hot_table WHERE ...;

-- Cron trimestral: mueve datos warm → BigQuery cold
-- Implementar como Cloud Function o cron que exporta a BigQuery dataset
```

### Protecciones

- Nunca eliminar datos que tengan `status = 'open'` o referencia activa
- Archiving es **append-only** al destino — nunca sobreescribe
- Cada tabla con retention tiene campo `archived_at` para tracking
- Dry-run mode: primero cuenta cuántos records se archivarían, requiere confirmación

---

## 17. Migration Path — De lo actual al Operator Layer

### Principio

> **Coexistencia → migración gradual → cutover → cleanup.** Nunca Big Bang.

### Fase de coexistencia

Cada componente nuevo coexiste con el viejo hasta que se valida:

| Componente actual | Componente nuevo | Coexistencia | Cutover trigger |
|-------------------|-----------------|-------------|----------------|
| `agency-queries.ts` (BigQuery CTEs) | `SpaceStore` (Postgres serving views) | Nuevo lee de serving, viejo sigue como fallback | Serving views fresh >30 días sin errores |
| Space redirect → Admin | Space 360 page | Space 360 como nueva ruta, redirect se mantiene en `/admin/tenants/[id]` | Space 360 tiene todos los tabs funcionales |
| Economics placeholder | Economics API + view | Nuevo reemplaza placeholder directamente | API retorna datos reales |
| Inline capacity queries | `TeamCapacityStore` | Store encapsula queries existentes, misma data | Store validado con tests |
| `/api/campaigns` (global compartido por internal/client) | `/api/agency/campaigns` | Coexistencia: Agency consume el namespace nuevo; global sigue sirviendo `/campaigns` y `/campanas` | Revaluar cuando se cierre una estrategia de namespace unificado para Campaigns |

Estado real 2026-04-17:

- `GET/POST /api/agency/campaigns` y los sub-routes Agency ya existen como namespace dedicado para la surface `/agency/campaigns`.
- `/api/campaigns/**` sigue vivo como runtime compartido de internal + client (`/campaigns`, `/campanas`) mientras dure la coexistencia.
- La resolución tenant-safe de campañas debe hacerse por `space_id` real y subset `campaignScopes`; no por el atajo inválido `clientId -> spaceId`.

### Migration checklist por componente

```
Para cada migración:
  □ Nuevo componente implementado con tests
  □ Nuevo componente deployado en staging
  □ Datos comparados: nuevo vs viejo producen mismos resultados
  □ Nuevo componente deployado en production como primario
  □ Viejo componente marcado @deprecated
  □ 30 días sin incidentes
  □ Viejo componente eliminado
  □ Documentación actualizada
```

### BigQuery → Postgres migration específica para Agency

Las queries de `agency-queries.ts` son las más complejas del portal (CTEs de 100+ líneas con joins a 6 tablas). No se migran de golpe:

```
Paso 1: Materializar los resultados de las CTEs en serving views
  └── greenhouse_serving.space_operational_summary
  └── greenhouse_serving.team_capacity_summary

Paso 2: Crear stores que lean de serving views
  └── SpaceStore.listWithHealth() → SELECT * FROM space_operational_summary
  └── TeamCapacityStore.getCapacity() → SELECT * FROM team_capacity_summary

Paso 3: API routes usan stores en vez de BigQuery queries
  └── /api/agency/spaces → SpaceStore.listWithHealth()

Paso 4: Reactive projections mantienen serving views fresh
  └── assignment.created → refresh space_operational_summary
  └── ico.materialization.completed → refresh space_operational_summary

Paso 5: BigQuery queries en agency-queries.ts marcadas @deprecated

Paso 6: 30 días sin fallback → eliminar BigQuery queries
```

### Backward compatibility guarantees

- **API responses no cambian shape** — mismos campos, mismos tipos, nuevos campos son aditivos
- **Sidebar no cambia** — mismos items, mismas rutas, nuevas rutas son aditivas
- **Permissions no se restringen** — si hoy ves algo, lo seguirás viendo. Nuevas restricciones se aplican solo a datos nuevos (health score, risk score, etc.)
- **Fallback siempre disponible** — si serving view está vacía, cae a BigQuery query original

---

## 18. Governance, Multi-Currency, Onboarding & Integration Testing

### 18.1 Governance del Operator Layer

**Quién controla qué:**

| Decisión | Quién decide | Dónde se configura | Cómo cambia |
|----------|-------------|-------------------|-------------|
| Health score weights | Product Owner + Operations Lead | `HEALTH_DIMENSIONS[]` en código | PR con justificación + test actualizado |
| Anomaly thresholds | Operations Lead | `ANOMALY_RULES[]` en código (v1), Admin UI (v2) | PR (v1), Admin Center panel (v2) |
| SLA defaults por tipo de servicio | Account Lead + Finance | `service_sla` table via Admin UI | CRUD endpoint |
| Recommendation approval | Operations Lead | In-app (recommendation lifecycle) | Click en "Aprobar" / "Rechazar" |
| Client transparency fields | Product Owner | `CLIENT_VISIBLE_FIELDS[]` en código | PR con review de Account Lead |
| Nexa execution permissions | Admin | Nexa tool config | `requiresConfirmation: true/false` per tool |
| Data retention thresholds | Platform Engineer | Cron config + retention policy doc | Infra PR |

**Principio de governance:**

> v1: todo configurable en código con registros declarativos + tests.
> v2: governance UI en Admin Center para thresholds y SLAs.
> v3: self-service para Account Leads en SLAs de su Space.

### 18.2 Multi-Currency

**Regla canónica:**

> Todas las comparaciones, scores y rankings se computan en **CLP**. La UI muestra moneda original + CLP cuando difieren.

**Puntos de conversión:**

| Dato | Moneda original | Conversión | Momento |
|------|----------------|------------|---------|
| Service cost | USD o CLP | `resolveExchangeRateToClp()` | Al materializar service_economics |
| Payroll (USD entries) | USD | Último FX rate × monto | En PnL computation (ya implementado) |
| Revenue pipeline | USD (HubSpot) | FX rate al materializar | Al sync pipeline |
| Asset profitability | Mixto | Normalizar a CLP en serving view | Al materializar |
| SLA monetary thresholds | CLP | — | Definidos en CLP |
| Health/Risk scores | CLP-normalized inputs | — | Inputs ya en CLP |

**Helper canónico:** `resolveExchangeRateToClp()` de `src/lib/finance/shared.ts` — ya existe, se reutiliza en todo el layer.

**Staleness protection:** `checkExchangeRateStaleness()` — si FX rate >7 días, serving views se marcan como `fxStale: true` y la UI muestra warning.

### 18.3 Onboarding del sistema

**Tres niveles de onboarding:**

**Nivel 1 — Glossary operativo (siempre visible):**

```typescript
const AGENCY_GLOSSARY: Record<string, { term: string; definition: string; example: string }> = {
  health_score: {
    term: 'Health Score',
    definition: 'Indicador compuesto 0-100 del estado de un Space. Combina delivery (40%), finanzas (30%), engagement (15%) y capacidad (15%).',
    example: 'Un Space con OTD 95%, margen 25%, login frecuente y equipo balanceado tiene score ~85 (Óptimo).'
  },
  rpa: {
    term: 'RPA (Revisiones por Aprobación)',
    definition: 'Promedio de revisiones necesarias antes de aprobar un entregable. Menor es mejor.',
    example: 'RPA 1.2 = la mayoría se aprueba con mínimas correcciones. RPA 3.0 = demasiadas iteraciones.'
  },
  scope_creep: {
    term: 'Scope Creep',
    definition: 'Cuando se entrega más de lo contratado sin ajuste de precio. Score 0-100.',
    example: 'Scope creep 65: se entregaron 2.5x más assets que los contratados.'
  },
  // ... 20+ terms
}
```

Accesible vía tooltip (`?` icon) al lado de cada métrica en la UI.

**Nivel 2 — Playbooks por anomalía (en documentación):**

```markdown
## Playbook: OTD Degradation

### Señal
OTD cayó >15 puntos en 2 períodos consecutivos.

### Diagnóstico (en orden)
1. ¿Hay stuck assets? → Revisar en Space 360 > Delivery
2. ¿Hay bottleneck de capacidad? → Revisar en Space 360 > Team
3. ¿Cambió el scope? → Revisar Scope Intelligence
4. ¿Cambió el equipo? → Revisar assignment history

### Acciones
- Si stuck assets > 5: escalar a Team Lead del rol bottleneck
- Si capacity > 100%: reasignar FTE desde Space con holgura
- Si scope creep > 40: escalar a Account Lead para renegociar
- Si equipo cambió: evaluar onboarding del nuevo member

### Escalamiento
- Si no se resuelve en 1 semana: Operations Lead interviene
- Si no se resuelve en 2 semanas: notificar a management
```

Ubicación: `docs/operations/playbooks/` (nuevo directorio).

**Nivel 3 — Interactive onboarding (futuro):**

Primera vez que un usuario abre Agency → tour guiado:
1. "Esta es tu vista Pulse — los KPIs globales de la agencia"
2. "Cada Space tiene un Health Score — verde es óptimo"
3. "Las anomalías aparecen aquí cuando algo necesita atención"
4. "Puedes pedirle a Nexa que te explique cualquier métrica"

Implementar con tooltip tour library (sin agregar dependencias — usar MUI Popover secuencial).

### 18.4 Integration Testing Strategy

Unit tests validan reglas individuales. Integration tests validan **flujos completos** que cruzan múltiples módulos.

**Test scenarios end-to-end:**

```typescript
describe('Agency Intelligence E2E', () => {

  // Scenario 1: OTD degrades → anomaly → notification → recommendation
  it('detects OTD degradation and generates actionable recommendation', async () => {
    // Setup: Space with healthy OTD
    await seedSpaceWithMetrics('space-A', { otd: [92, 90] }) // 2 healthy periods

    // Act: ICO materializes with degraded OTD
    await materializeIcoMetrics('space-A', { otd: 74 }) // drops 16pts

    // Assert: anomaly detection runs
    const anomalies = await runAnomalyDetection()
    expect(anomalies).toContainEqual(expect.objectContaining({
      spaceId: 'space-A', ruleId: 'otd_drop', severity: 'high'
    }))

    // Assert: notification dispatched
    const notifications = await getNotificationsForSpace('space-A')
    expect(notifications).toContainEqual(expect.objectContaining({
      category: 'ico_alert', title: expect.stringContaining('OTD cayó')
    }))

    // Assert: recommendation generated
    const recs = await getRecommendationsForSpace('space-A')
    expect(recs.length).toBeGreaterThan(0)
    expect(recs[0].type).toBe('reassign')
  })

  // Scenario 2: Anomaly resolves → recommendation auto-resolved
  it('auto-resolves recommendation when anomaly disappears', async () => {
    // Setup: existing anomaly + recommendation
    await seedAnomaly('space-A', 'otd_drop')
    await seedRecommendation('space-A', { triggerAnomaly: 'otd_drop', status: 'notified' })

    // Act: OTD recovers
    await materializeIcoMetrics('space-A', { otd: 91 })
    await runAnomalyDetection()

    // Assert: anomaly marked resolved
    const anomalies = await getAnomaliesForSpace('space-A')
    expect(anomalies.filter(a => a.status === 'active')).toHaveLength(0)

    // Assert: recommendation auto-resolved
    const recs = await getRecommendationsForSpace('space-A')
    expect(recs[0].status).toBe('auto_resolved')
  })

  // Scenario 3: Revenue pipeline → capacity gap → hiring recommendation
  it('detects capacity gap from pipeline and recommends hiring', async () => {
    // Setup: pipeline requires Design FTE
    await seedPipelineDeal({ requiredFte: { design: 1.5 }, startDate: '2026-05-01' })

    // Setup: current Design capacity almost full
    await seedCapacity({ design: { total: 2.0, allocated: 1.8, available: 0.2 } })

    // Act: capacity forecast runs
    await runCapacityForecast()

    // Assert: gap detected
    const forecast = await getCapacityForecast('design', '2026-05')
    expect(forecast.gapFte).toBeCloseTo(1.3) // needs 1.5, has 0.2

    // Assert: hiring recommendation generated
    const recs = await getRecommendationsByType('hire')
    expect(recs).toContainEqual(expect.objectContaining({
      role: 'design', requiredFte: 1.3
    }))
  })
})
```

**Testing infrastructure:**

| Layer | Tool | Scope |
|-------|------|-------|
| Unit tests | Vitest | Pure functions (score computation, rule matching, normalization) |
| Store tests | Vitest + PG mock | Store functions return correct types from mock data |
| API tests | Vitest + fetch mock | Routes handle auth, params, errors correctly |
| Integration tests | Vitest + test database | Multi-module flows with real Postgres (test schema) |
| E2E scenarios | Vitest + seed helpers | Full lifecycle flows (seed → act → assert across modules) |

**Test database strategy:**

```
Option A (recommended for v1): Mock PostgresQuery at module boundary
  - Fast, no external dependencies
  - Each test controls exactly what the DB "returns"
  - Limitation: doesn't catch SQL bugs

Option B (recommended for v2): Dedicated test database
  - Real Postgres instance (Docker or Cloud SQL clone)
  - Seed → test → teardown per suite
  - Catches SQL bugs, schema mismatches
  - Slower, requires infra setup
```
