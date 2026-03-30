# TASK-138 — Finance Intelligence: Audit Gaps, Notifications & Cross-Module Synergies

## Delta 2026-03-30

- `auto-allocation-rules.ts` quedó endurecido para excluir assignments internos (`space-efeonce`, `efeonce_internal`, `client_internal`) del reparto comercial.
- Esto alinea Finance Intelligence con la semántica ya visible en `Agency > Team` y evita que clientes billables pierdan costo laboral por competir contra `Efeonce` interno.

## Delta 2026-03-30 — 6 slices implementados

- Slice 1: 5 finance notification mappings + `finance_alert` category + `getFinanceAdminRecipients()` helper
- Slice 2: Dashboard summary API now returns `dso`, `dpo`, `payrollToRevenueRatio` (existing trend data already present)
- Slice 3: `GET /api/people/[memberId]/finance-impact` — cost breakdown, revenue attributed by FTE, cost/revenue ratio with status
- Slice 4: `agency-finance-metrics.ts` — `getSpaceFinanceMetrics()` returns per-client revenue, expenses, margin, trend
- Slice 5: BigQuery cutover plan documented in `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` with 12-component status table
- Slice 6: `auto-allocation-rules.ts` — declarative rules: payroll by FTE, infrastructure by revenue weight

## Delta 2026-03-30 — adopción UI/runtime ya absorbida por el repo actual

- El drift documental de esta task quedó resuelto:
  - `FinanceDashboardView.tsx` ya consume `dso`, `dpo` y `payrollToRevenueRatio`
  - `PersonHrProfileTab.tsx` ya consume `/api/people/[memberId]/finance-impact`
  - `getSpaceFinanceMetrics()` ya tiene endpoint dedicado en `/api/agency/finance-metrics`
- Lectura correcta:
  - los slices declarados en `TASK-138` no quedaron “API-ready pero sin adopción”
  - la adopción visible ya ocurrió y la task sigue correctamente en `complete`

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | Finance / Intelligence / Cross-module |
| Sequence | Complementa TASK-067→071, puede ejecutarse en paralelo con ellas |

## Summary

Auditoría del módulo Finance (2026-03-30) identificó gaps en 6 áreas: notificaciones de eventos financieros, sinergias cross-module no conectadas, dashboard sin contexto comparativo, inteligencia financiera inmadura, BigQuery legacy sin cutover completo, y cost allocation subutilizada. Esta task documenta y prioriza los gaps que NO están cubiertos por TASK-067→071.

## Context: Relación con TASK-067 a TASK-071

Las tasks 067-071 son un pipeline secuencial para Cost Intelligence:

```
TASK-067 (Foundation: schema + events + domain)
    ↓
TASK-068 (Period Closure Projection) ──┐
TASK-069 (Operational P&L Projection) ─┤── pueden ejecutarse en paralelo
    ↓                                  │
TASK-070 (Finance UI: Period Dashboard)┘── necesita 068 + 069
    ↓
TASK-071 (Cross-Module Consumers) ────── necesita 068 + 069
```

**Lo que ese pipeline resuelve:**
- Period closure lifecycle (open/ready/closed/reopened)
- P&L materializado por cliente/space/org con margins
- Dashboard de cierre de período con readiness signals
- Margin badges en Agency, People, Home

**Lo que ese pipeline NO resuelve (scope de esta task):**
- Notificaciones de eventos financieros
- Dashboard KPIs con contexto comparativo (trend, YoY, metas)
- Budget vs actual
- Cash flow forecasting basado en patrones
- Revenue pipeline (HubSpot → expected revenue)
- Currency exposure analysis
- Working capital metrics (DSO, DPO)
- BigQuery legacy cutover pendiente
- Cost allocation automation

## Scope

### Slice 1 — Finance Notification Mappings (~2h)

Finance emite 13 event types pero solo 1 genera notificación. Agregar mappings a `notification-mapping.ts`:

| Evento | Categoría | Título | Recipients | Prioridad |
|--------|-----------|--------|------------|-----------|
| `finance.income_payment.recorded` | `system_event` | "Pago registrado: {amount} en {invoice}" | Finance admins | Normal |
| `finance.expense.created` (> $1M CLP) | `system_event` | "Gasto significativo: {amount} — {description}" | Finance admins | Alta |
| `accounting.period_closed` | `payroll_ops` | "Período {month} cerrado" | Finance + HR admins | Alta |
| `accounting.period_reopened` | `payroll_ops` | "Período {month} reabierto: {reason}" | Finance + HR admins | Alta |
| `accounting.margin_alert.triggered` | `system_event` | "Margen de {client} cayó a {pct}%" | Finance admins | Alta |

Crear nueva categoría de notificación:

```typescript
finance_alert: {
  code: 'finance_alert',
  label: 'Alertas financieras',
  description: 'Pagos significativos, márgenes y cierre de período',
  icon: 'tabler-chart-bar',
  audience: 'internal',
  defaultChannels: ['in_app', 'email'],
  priority: 'high'
}
```

### Slice 2 — Dashboard KPIs con contexto (~3h)

Enriquecer `FinanceDashboardView.tsx` con comparaciones:

| KPI actual | Contexto faltante | Implementación |
|------------|-------------------|----------------|
| Income mensual | Trend vs mes anterior + YoY | Agregar `trendNumber` + `subtitle` en card |
| Expenses mensual | Trend vs mes anterior | Mismo patrón |
| Cash flow neto | Trend + sparkline últimos 6m | `StatsWithAreaChart` |
| Receivables | Aging bucket breakdown (30/60/90+ días) | Chip con days outstanding |
| Payables | DSO (Days Sales Outstanding) | KPI nuevo |
| — | DPO (Days Payable Outstanding) | KPI nuevo |
| — | Payroll-to-revenue ratio | KPI nuevo: `laborCost / revenue × 100` |

Backend: extender `GET /api/finance/dashboard/summary` para incluir:
- `previousMonth` para cada KPI (calcular trend)
- `yearAgo` para YoY
- `dso` = (receivables / revenue) × 30
- `dpo` = (payables / expenses) × 30
- `payrollToRevenueRatio` = laborCost / revenue × 100

### Slice 3 — Finance ↔ People bridge: cost tab en ficha de persona (~2h)

Agregar card "Impacto financiero" en el tab HR Profile de la ficha de persona:

```
┌── Impacto financiero del colaborador ──────────────┐
│                                                     │
│  Costo mensual bruto:  $2,450,000 CLP               │
│  Overhead directo:     $180,000 CLP (licencias)     │
│  Costo total loaded:   $2,630,000 CLP               │
│                                                     │
│  Clientes asignados:   3                            │
│  Revenue atribuido:    $8,200,000 CLP (FTE-weighted)│
│  Ratio costo/revenue:  32%  ✓ Óptimo               │
│                                                     │
│  Fuente: member_capacity_economics + income (FTE)   │
└─────────────────────────────────────────────────────┘
```

Backend: crear `GET /api/people/[memberId]/finance-impact` que combine:
- `member_capacity_economics` (cost data)
- Finance income por clientes asignados × FTE weight

### Slice 4 — Finance ↔ Agency synergy: rentabilidad por Space (~2h)

Enriquecer Agency Spaces cards y economics view con data financiera directa:

- Cada Space card muestra: revenue actual, margin %, trend arrow
- Economics view muestra P&L por Space (si TASK-069 está completa, leer materialized; si no, compute on-demand)
- Ranking de Spaces por rentabilidad

Backend: extender `getAgencyPulseKpis()` para incluir finance metrics por space.

### Slice 5 — BigQuery legacy cutover plan (~1h, solo documentación)

Auditar y documentar qué queries de Finance aún van a BigQuery y plan para migrar:

| Query | Archivo | BigQuery? | Plan |
|-------|---------|-----------|------|
| Dashboard summary fallback | `postgres-store-slice2.ts` | Si (fallback) | Eliminar fallback cuando Postgres es estable |
| Reconciliation queries | `reconciliation.ts` | Si (primary!) | Migrar a `postgres-reconciliation.ts` |
| DTE coverage queries | `dte-coverage.ts` | Verificar | Migrar si usa BQ |
| Agency economics queries | `agency-queries.ts` | Si | Depende de TASK-069 materialized P&L |

No implementar migración ahora — solo documentar el plan en `GREENHOUSE_UI_PLATFORM_V1.md` o `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`.

### Slice 6 — Cost allocation automation rules (~2h)

Hoy solo existe allocation `manual` y `fte_weighted`. Agregar lógica para:

- **Auto-allocation by expense type**: si `expense_type = 'payroll'` y el expense tiene `member_id`, auto-allocar al cliente del member por FTE weight
- **Rule-based allocation**: si una expense es tagged como `infrastructure` (e.g., AWS), distribuir entre todos los clientes activos por revenue weight
- Crear `src/lib/finance/auto-allocation-rules.ts` con reglas declarativas
- Ejecutar auto-allocation como parte de `client_economics` projection (ya reacciona a expense events)

## Dependencies & Impact

- **Depende de:**
  - TASK-129 (Notifications via webhook bus) — `complete` — notification mappings ya funcionan
  - TASK-132 (Admin Notifications) — `complete` — dispatch log visible
  - TASK-023 (Notification System) — `complete`
  - Finance module — `active`
  - TASK-067→069 — para Slices 4 y 6 (materialized P&L)
- **Impacta a:**
  - TASK-070 (Finance UI) — más datos para mostrar
  - TASK-071 (Cross-module consumers) — más data points
  - People module — nueva card de impacto financiero
  - Agency module — rentabilidad por Space
  - Home — KPIs financieros en landing

## Out of Scope

- Budget module completo (requiere una task dedicada con UI de input de presupuesto)
- Revenue pipeline from HubSpot (requiere integración CRM → Finance)
- Cash flow forecasting con ML (mejora futura post-baseline)
- Currency hedging recommendations (muy específico)
- Multi-entity consolidation (una sola legal entity por ahora)

## Acceptance Criteria

- [x] 5 notification mappings financieros registrados (payment, expense, DTE, income, FX rate)
- [x] Nueva categoría `finance_alert` registrada en `notification-categories.ts`
- [x] Dashboard API retorna `dso`, `dpo`, `payrollToRevenueRatio` (trend data ya existía)
- [x] DSO y DPO calculados en el backend (API ready, UI adoption pendiente)
- [x] `GET /api/people/[memberId]/finance-impact` endpoint creado (UI adoption pendiente)
- [x] `getSpaceFinanceMetrics()` creado para Agency synergy (UI adoption pendiente)
- [x] BigQuery cutover plan documentado en `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- [x] Auto-allocation rules implementadas (payroll by FTE, infra by revenue weight)
- [x] `pnpm build` pasa
- [x] `pnpm test` pasa (127 files, 627 tests)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/webhooks/consumers/notification-mapping.ts` | Agregar 5+ finance mappings |
| `src/config/notification-categories.ts` | Nueva categoría `finance_alert` |
| `src/views/greenhouse/finance/FinanceDashboardView.tsx` | KPIs con trend + DSO/DPO |
| `src/app/api/finance/dashboard/summary/route.ts` | Extender con trend data |
| `src/app/api/people/[memberId]/finance-impact/route.ts` | Nuevo endpoint |
| `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx` | Card impacto financiero |
| `src/lib/agency/agency-queries.ts` | Agregar finance metrics por space |
| `src/lib/finance/auto-allocation-rules.ts` | Reglas de auto-allocation (nuevo) |
