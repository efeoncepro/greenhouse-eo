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

Reemplaza el placeholder actual. Construye P&L real por Space y por Service.

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

**Backend:** Consume `GET /api/finance/dashboard/pnl` para totales y `getSpaceFinanceMetrics()` para per-space. Post TASK-069: lee `operational_pl_snapshots` materializado.

### 4.3 Team Capacity Engine

De vista estática a motor de constraints.

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

## 7. Reglas de implementación

1. **Space es el objeto central** — toda feature nueva debe conectar con Space 360
2. **No duplicar cálculos** — reusar P&L engine (`GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`), ICO materializations, capacity economics
3. **Inteligencia rule-based primero** — no ML hasta que las reglas manuales estén validadas
4. **Datos antes que UI** — APIs y materializations primero, vistas después
5. **Outbox-first** — toda mutación emite evento, toda señal puede generar notificación
6. **Gradual, no Big Bang** — cada fase entrega valor independiente

---

## 8. Dependencias cross-module

```
ICO Engine ──metrics──→ Agency Intelligence (anomaly + health score)
Finance ──P&L──→ Economics Engine (margin, profitability)
Payroll ──labor cost──→ Capacity Engine (loaded cost per FTE)
Delivery ──tasks──→ Space 360 (project status, stuck assets)
Notifications ──webhook bus──→ Alert delivery (anomalies, risks)
Nexa ──tools──→ Natural language access to Agency Intelligence
```

---

## 9. Anti-patterns a evitar

- No construir un "Agency BigQuery" — migrar a Postgres para operacional, BigQuery solo para analytics/histórico
- No reimplementar P&L — consumir el motor Finance existente
- No crear alertas sin acción — cada alerta debe sugerir qué hacer
- No agregar tabs sin datos — si no hay API, no hay tab
- No mezclar Agency con Admin — Agency es para operar, Admin es para gobernar
