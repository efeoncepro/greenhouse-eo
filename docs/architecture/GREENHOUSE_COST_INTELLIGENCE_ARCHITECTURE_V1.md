# GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md

## Delta 2026-03-28
- `member_capacity_economics.total_labor_cost_target` ahora puede absorber el costo empleador real calculado por Payroll Chile desde `payroll_entries`, reutilizando la proyección canónica de Team Capacity como base loaded cost en vez de crear un store paralelo.
- El boundary de Cost Intelligence sigue igual: consume `member_capacity_economics` y no recalcula payroll ni employer costs por su cuenta.

## Objetivo

Definir la arquitectura del layer de **Cost Intelligence** de Greenhouse: un layer de orquestación que consolida señales de costo, ingreso y cierre de período desde módulos existentes (Payroll, Finance, Admin Team, ICO) para materializar P&L operativo, cost centers y ceremonia de cierre — sin crear stores transaccionales nuevos ni duplicar la contabilidad legal.

## Contexto y motivación

### Por qué existe este layer

Greenhouse tiene hoy toda la data necesaria para responder preguntas financieras operativas:
- **Payroll** calcula costo laboral por persona/período
- **Finance** registra ingresos, gastos, reconciliación bancaria y DTEs (Nubox)
- **Admin Team** gestiona assignments con FTE allocation
- **ICO** materializa métricas de eficiencia operativa
- **Team Capacity** computa overhead y loaded cost, incluyendo employer costs absorbidos desde Payroll cuando exista materialización canónica

Pero esa data vive dispersa en 5+ módulos, 3+ schemas y 11 projections sin un punto de consolidación que responda:
- ¿Cuánto ganamos/perdimos con este cliente este mes?
- ¿El mes está cerrado en todas las patas?
- ¿Cuál es el margen real por space/organización?
- ¿Dónde hay alertas de rentabilidad?

### Decisión arquitectónica

**No crear un módulo de contabilidad financiera.** Efeonce usa Nubox solo para facturación (DTEs); no tiene módulo contable externo. Este layer cubre contabilidad de gestión (management accounting), no contabilidad legal.

**Nubox = verdad tributaria (DTEs). Greenhouse = verdad operativa (costos, márgenes, cierre).**

Si Efeonce contrata el módulo contable de Nubox en el futuro, el boundary se redefine — pero hoy Greenhouse es la única fuente de inteligencia financiera más allá de facturación.

## 1. Alcance del módulo

### Cost Intelligence es responsable de:
- Ceremonia de cierre de período (auto-detect readiness + confirmación manual)
- P&L operativo por scope (client, space, organization)
- Cost center snapshots (client + member para MVP)
- Eventos de cierre y alertas de margen
- Consolidación de señales cross-module en serving views

### Cost Intelligence NO es responsable de:
- Contabilidad de partida doble, libros legales, plan de cuentas SII
- Emisión de DTEs (Nubox)
- Cálculo de nómina (Payroll)
- Registro de ingresos/gastos (Finance)
- Reconciliación bancaria (Finance)
- Gestión de roster/assignments (Admin Team)
- Métricas de eficiencia operativa (ICO)
- Presupuestos y budget (fase 2)
- Provisiones laborales: vacaciones, indemnización, SIS, mutual (fase 2)

## 2. Ownership y fronteras

### Cost Intelligence es owner de:
- `greenhouse_cost_intelligence` schema (config y estado)
- `greenhouse_serving.period_closure_status` (serving view)
- `greenhouse_serving.operational_pl_snapshots` (serving view)
- Projection domain `cost_intelligence` en el registry
- Eventos `accounting.*` en el event catalog

### Cost Intelligence consume, pero no posee:
- `greenhouse_payroll.*` — costo laboral, compensaciones, períodos
- `greenhouse_finance.*` — ingresos, gastos, cuentas, tipo de cambio, indicadores económicos
- `greenhouse_serving.member_capacity_economics` — loaded cost por persona
- `greenhouse_serving.client_economics_snapshots` — economics por cliente (TASK-055)
- `greenhouse_serving.ico_member_metrics` — métricas de eficiencia
- `greenhouse_core.members` — roster
- `greenhouse_core.client_team_assignments` — FTE allocation
- `greenhouse_core.organizations` — scope organizacional

### Fronteras explícitas con módulos vecinos

| Módulo | Boundary |
|--------|----------|
| **Finance** | Cost Intelligence lee income/expenses; Finance mantiene ownership de CRUD y reconciliación |
| **Payroll** | Cost Intelligence lee payroll_entries/periods; Payroll mantiene ownership de cálculo y lifecycle |
| **Admin Team** | Cost Intelligence lee assignments/members; Admin Team mantiene ownership de roster mutations |
| **ICO** | Cost Intelligence lee metrics_by_member; ICO mantiene ownership de materialización |
| **Team Capacity** | Cost Intelligence lee member_capacity_economics; Team Capacity mantiene ownership de overhead/pricing helpers |

## 3. Naming y taxonomía

- **Layer**: `Cost Intelligence`
- **Schema PostgreSQL**: `greenhouse_cost_intelligence`
- **Projection domain**: `cost_intelligence`
- **Event prefix**: `accounting.*`
- **Serving views**: `greenhouse_serving.period_closure_status`, `greenhouse_serving.operational_pl_snapshots`

Se eligió `cost_intelligence` sobre `accounting` para evitar confusión con contabilidad financiera/legal. Es coherente con la nomenclatura existente (`financial_intelligence`, `person_intelligence`).

## 4. Modelo de datos

### 4.1 Schema `greenhouse_cost_intelligence`

#### `period_closure_config`

Parámetros de cierre por defecto y por período override.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `config_id` | `TEXT PRIMARY KEY` | `default` o `YYYY-MM` para override |
| `require_payroll_exported` | `BOOLEAN DEFAULT TRUE` | ¿Payroll debe estar exported? |
| `require_income_recorded` | `BOOLEAN DEFAULT TRUE` | ¿Income del período debe existir? |
| `require_expenses_recorded` | `BOOLEAN DEFAULT TRUE` | ¿Expenses del período deben existir? |
| `require_bank_reconciled` | `BOOLEAN DEFAULT FALSE` | ¿Reconciliación bancaria completa? (fase 2) |
| `require_fx_locked` | `BOOLEAN DEFAULT TRUE` | ¿Tipo de cambio del período fijado? |
| `margin_alert_threshold_pct` | `NUMERIC(5,2) DEFAULT 15.00` | Umbral de margen bruto para alertas |
| `updated_at` | `TIMESTAMPTZ` | |
| `updated_by` | `TEXT` | |

#### `period_closures`

Estado de cierre por período.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `period_year` | `INTEGER` | |
| `period_month` | `INTEGER` | |
| `closure_status` | `TEXT` | `open`, `ready`, `closed`, `reopened` |
| `payroll_status` | `TEXT` | `pending`, `calculated`, `approved`, `exported` |
| `income_status` | `TEXT` | `pending`, `partial`, `complete` |
| `expense_status` | `TEXT` | `pending`, `partial`, `complete` |
| `reconciliation_status` | `TEXT` | `pending`, `partial`, `complete`, `not_required` |
| `fx_status` | `TEXT` | `pending`, `locked` |
| `readiness_pct` | `INTEGER` | 0-100 auto-computed |
| `closed_at` | `TIMESTAMPTZ` | NULL si no cerrado |
| `closed_by` | `TEXT` | Usuario que cerró |
| `reopened_at` | `TIMESTAMPTZ` | NULL si nunca reabierto |
| `reopened_by` | `TEXT` | |
| `reopened_reason` | `TEXT` | |
| `snapshot_revision` | `INTEGER DEFAULT 1` | Incrementa en cada reapertura+cierre |
| `updated_at` | `TIMESTAMPTZ` | |
| `PRIMARY KEY` | `(period_year, period_month)` | |

### 4.2 Serving views en `greenhouse_serving`

#### `period_closure_status`

Serving view materializada por la projection `period_closure_status`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `period_year` | `INTEGER` | |
| `period_month` | `INTEGER` | |
| `closure_status` | `TEXT` | `open`, `ready`, `closed`, `reopened` |
| `payroll_closed` | `BOOLEAN` | |
| `income_closed` | `BOOLEAN` | |
| `expenses_closed` | `BOOLEAN` | |
| `reconciliation_closed` | `BOOLEAN` | |
| `fx_locked` | `BOOLEAN` | |
| `readiness_pct` | `INTEGER` | |
| `snapshot_revision` | `INTEGER` | |
| `materialized_at` | `TIMESTAMPTZ` | |

#### `operational_pl_snapshots`

P&L operativo por scope y período.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `snapshot_id` | `TEXT PRIMARY KEY` | `{scope_type}-{scope_id}-{year}-{month}-r{revision}` |
| `scope_type` | `TEXT` | `client`, `space`, `organization` |
| `scope_id` | `TEXT` | ID del scope |
| `scope_name` | `TEXT` | Nombre legible |
| `period_year` | `INTEGER` | |
| `period_month` | `INTEGER` | |
| `period_closed` | `BOOLEAN` | Snapshot con closure awareness |
| `snapshot_revision` | `INTEGER` | Matches period_closures.snapshot_revision |
| `currency` | `TEXT DEFAULT 'CLP'` | Siempre normalizado a CLP |
| `revenue_clp` | `NUMERIC(18,2)` | Income reconocido |
| `labor_cost_clp` | `NUMERIC(18,2)` | Costo laboral (payroll + FTE allocation) |
| `direct_expense_clp` | `NUMERIC(18,2)` | Gastos directos atribuidos |
| `overhead_clp` | `NUMERIC(18,2)` | Overhead compartido distribuido |
| `total_cost_clp` | `NUMERIC(18,2)` | labor + direct + overhead |
| `gross_margin_clp` | `NUMERIC(18,2)` | revenue - total_cost |
| `gross_margin_pct` | `NUMERIC(5,2)` | (gross_margin / revenue) × 100 |
| `headcount_fte` | `NUMERIC(5,2)` | FTE asignado al scope |
| `revenue_per_fte_clp` | `NUMERIC(18,2)` | |
| `cost_per_fte_clp` | `NUMERIC(18,2)` | |
| `computation_reason` | `TEXT` | Qué trigger causó el recompute |
| `materialized_at` | `TIMESTAMPTZ` | |
| `UNIQUE` | `(scope_type, scope_id, period_year, period_month, snapshot_revision)` | |

## 5. Events

### 5.1 Eventos que consume (entrantes)

#### Señal de costo laboral (Payroll)
| Evento | Aggregate | Uso |
|--------|-----------|-----|
| `payroll_period.calculated` | `payroll_period` | Período listo para lectura de costos |
| `payroll_period.approved` | `payroll_period` | Período validado por HR |
| `payroll_period.exported` | `payroll_period` | Costo laboral final — gatilla check de closure |
| `payroll_entry.upserted` | `payroll_entry` | Costo individual actualizado |
| `compensation_version.created` | `compensation_version` | Base de costo cambió |
| `compensation_version.updated` | `compensation_version` | Base de costo cambió |

#### Señal de ingreso y gasto (Finance)
| Evento | Aggregate | Uso |
|--------|-----------|-----|
| `finance.income.created` | `finance_income` | Revenue reconocido |
| `finance.income.updated` | `finance_income` | Revenue ajustado |
| `finance.income_payment.created` | `finance_income_payment` | Cash cobrado |
| `finance.income_payment.recorded` | `finance_income_payment` | Cash registrado |
| `finance.expense.created` | `expense` | Gasto registrado |
| `finance.expense.updated` | `expense` | Gasto ajustado |
| `finance.cost_allocation.created` | `finance_cost_allocation` | Split de costo a cliente |
| `finance.cost_allocation.deleted` | `finance_cost_allocation` | Split removido |
| `finance.exchange_rate.upserted` | `finance_exchange_rate` | FX impacta conversión CLP |
| `finance.economic_indicator.upserted` | `economic_indicator` | UF/UTM cambian base de cálculo |

#### Señal de estructura operativa (Admin/Team)
| Evento | Aggregate | Uso |
|--------|-----------|-----|
| `assignment.created` | `assignment` | FTE allocation cambió |
| `assignment.updated` | `assignment` | FTE allocation cambió |
| `assignment.removed` | `assignment` | FTE allocation cambió |
| `membership.created` | `membership` | Scope organizacional cambió |
| `membership.deactivated` | `membership` | Scope organizacional cambió |

#### Señal de overhead
| Evento | Aggregate | Uso |
|--------|-----------|-----|
| `finance.overhead.updated` | `finance_overhead` | Overhead compartido cambió |
| `finance.license_cost.updated` | `finance_license_cost` | Costo directo de licencias |
| `finance.tooling_cost.updated` | `finance_tooling_cost` | Costo directo de herramientas |

#### Señal de eficiencia (ICO)
| Evento | Aggregate | Uso |
|--------|-----------|-----|
| `ico.materialization.completed` | `ico_materialization` | Métricas para cost-per-asset |

### 5.2 Eventos que emite (salientes)

| Evento | Aggregate | Payload | Consumers downstream |
|--------|-----------|---------|---------------------|
| `accounting.period_closed` | `period_closure` | `{ periodYear, periodMonth, closureStatus, snapshotRevision, payrollClosed, incomeClosed, expensesClosed, reconciliationClosed, fxLocked }` | `client_economics`, `person_intelligence`, `organization_executive`, Home/Nexa |
| `accounting.period_reopened` | `period_closure` | `{ periodYear, periodMonth, reopenedBy, reason, newRevision }` | `client_economics`, `person_intelligence`, `organization_executive` |
| `accounting.pl_snapshot.materialized` | `operational_pl` | `{ scopeType, scopeId, periodYear, periodMonth, grossMarginPct, snapshotRevision }` | `organization_executive`, Home/Nexa, Finance dashboards |
| `accounting.margin_alert.triggered` | `margin_alert` | `{ scopeType, scopeId, scopeName, periodYear, periodMonth, alertType, thresholdPct, actualPct }` | `notification_dispatch` |

## 6. Projections

### 6.1 `period_closure_status`

| Campo | Valor |
|-------|-------|
| **Domain** | `cost_intelligence` |
| **Trigger events** | `payroll_period.exported`, `payroll_period.approved`, `payroll_period.calculated`, `finance.income.created`, `finance.income.updated`, `finance.expense.created`, `finance.expense.updated`, `finance.exchange_rate.upserted`, `finance.cost_allocation.created` |
| **Entity scope** | `finance_period` (year-month) |
| **Materialization target** | `greenhouse_serving.period_closure_status` + `greenhouse_cost_intelligence.period_closures` |
| **Refresh action** | Chequea condiciones de cierre por pata; actualiza readiness %; si todas las condiciones se cumplen, mueve status a `ready`; NO cierra automáticamente |
| **Max retries** | 1 |

### 6.2 `operational_pl`

| Campo | Valor |
|-------|-------|
| **Domain** | `cost_intelligence` |
| **Trigger events** | `accounting.period_closed`, `accounting.period_reopened`, `payroll_entry.upserted`, `payroll_period.calculated`, `payroll_period.approved`, `payroll_period.exported`, `finance.income.created`, `finance.income.updated`, `finance.expense.created`, `finance.expense.updated`, `finance.cost_allocation.created`, `finance.cost_allocation.deleted`, `assignment.created`, `assignment.updated`, `assignment.removed`, `finance.overhead.updated` |
| **Entity scope** | `finance_period` (year-month) |
| **Materialization target** | `greenhouse_serving.operational_pl_snapshots` |
| **Refresh action** | Para cada client con actividad en el período: computa revenue, labor cost (payroll entries × FTE weight), direct expenses, overhead allocation; materializa snapshot; si margin < threshold, emite `accounting.margin_alert.triggered` |
| **Max retries** | 2 |
| **Derived events** | `accounting.pl_snapshot.materialized`, `accounting.margin_alert.triggered` |

## 7. APIs oficiales

### Runtime reads

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| `GET` | `/api/cost-intelligence/periods` | Lista de períodos con closure status | `finance_manager`, `efeonce_admin` |
| `GET` | `/api/cost-intelligence/periods/[year]/[month]` | Detalle de closure status + readiness | `finance_manager`, `efeonce_admin` |
| `GET` | `/api/cost-intelligence/pl` | P&L operativo con filtros (scope, período) | `finance_manager`, `efeonce_admin` |
| `GET` | `/api/cost-intelligence/pl/[scopeType]/[scopeId]` | P&L por scope específico, últimos N períodos | `finance_manager`, `efeonce_admin` |

### Mutations

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| `POST` | `/api/cost-intelligence/periods/[year]/[month]/close` | Cierre manual de período (valida readiness) | `finance_manager`, `efeonce_admin` |
| `POST` | `/api/cost-intelligence/periods/[year]/[month]/reopen` | Reapertura de período cerrado (con reason) | `efeonce_admin` |

### Cron

| Método | Ruta | Descripción | Frecuencia |
|--------|------|-------------|-----------|
| `GET` | `/api/cron/outbox-react-cost-intelligence` | Procesa projections del domain `cost_intelligence` | On-demand / 5 min |

## 8. Superficie UI

La surface principal vive dentro de la sección **"Economía"** del sidebar (ya existe como `Economía — P&L y rentabilidad`). El resto se consume distribuido:

| Surface | Ubicación | Qué muestra |
|---------|-----------|-------------|
| **Period Closure Dashboard** | Economía → "Cierre de Período" | Tabla de meses con semáforos por pata, readiness %, botón cerrar/reabrir |
| **P&L inline** | Economía → Period Closure → expandir mes | P&L operativo del período seleccionado por client |
| **Agency margin** | Agency → space cards | Margin % badge por space (lee operational_pl) |
| **Organization 360 P&L** | Org detail → tab Rentabilidad | Trend de P&L por organización (ya existe parcialmente) |
| **People fully-loaded cost** | People → Person → Finance tab | Costo fully-loaded con closure awareness |
| **Home/Nexa widget** | Home → financial status card | Período actual, status, margin trend, alertas activas |

## 9. Acceso y autorización

| Dato | Roles con acceso |
|------|-----------------|
| P&L por cliente, margin % | `finance_manager`, `efeonce_admin` |
| Costo fully-loaded por persona | `finance_manager`, `hr_payroll`, `efeonce_admin` |
| Period closure status | `finance_manager`, `hr_payroll`, `efeonce_admin` |
| Cierre manual de período | `finance_manager`, `efeonce_admin` |
| Reapertura de período | `efeonce_admin` |
| Alertas de margen | `efeonce_admin`, `efeonce_operations` |
| Cost center summary (sin detalle persona) | `efeonce_operations` |

No se crean roles nuevos.

## 10. Modelo de cierre de período

### Condiciones de readiness

```
readiness = check_all([
  payroll_exported,           -- nómina del mes congelada
  income_recorded,            -- al menos 1 income en el período (o flag explícito "sin ingresos")
  expenses_recorded,          -- al menos 1 expense en el período (o flag explícito "sin gastos")
  fx_rate_locked,             -- USD/CLP del período fijado
  // bank_reconciled,         -- fase 2
])
```

### Lifecycle del período

```
open → ready → closed → reopened → ready → closed
 ↑                                          │
 └──────────── (solo si nunca cerrado) ─────┘
```

- **open**: estado por defecto; readiness se computa reactivamente
- **ready**: todas las condiciones cumplidas; esperando confirmación manual
- **closed**: usuario confirmó cierre; snapshot congelado; evento `accounting.period_closed` emitido
- **reopened**: admin reabrió período; audit trail registrado; revision incrementada; re-trigger de projections downstream

### Períodos que nunca se cierran

El layer trabaja con data `provisional` y lo marca así. Consumers pueden leer P&L de períodos abiertos — el snapshot lleva `period_closed = FALSE` para que la UI lo señale visualmente.

### Cierre y reapertura

- **Cierre**: `POST .../close` valida readiness = 100%, congela snapshot, emite evento
- **Reapertura**: `POST .../reopen` solo por `efeonce_admin`, requiere `reason`, incrementa `snapshot_revision`, marca snapshots como `revised`, re-emite triggers para que downstream se recompute

## 11. Relationship to existing tasks

| Task | Relación |
|------|----------|
| **TASK-055** (finance intelligence cost coverage) | Parcialmente absorbida — `client_economics` pipeline es input directo del P&L; gaps restantes se resuelven como parte de `operational_pl` |
| **TASK-051** (finance-payroll bridge alignment) | Absorbida — el bridge Finance↔Payroll queda formalizado como pilar del layer |
| **TASK-015** (financial intelligence layer) | Parcialmente absorbida — P&L, trends y cost allocations entran al layer; LTV/CAC queda como task independiente |
| **TASK-052** (person 360 finance access) | Consumer — sigue viva, lee del layer |
| **TASK-063** (projected payroll) | Consumer — projected payroll alimenta projected margin en fase 2 |
| **TASK-046** (delivery performance ICO cutover) | Upstream — sigue viva, provee datos ICO al layer |
| **TASK-011** (ICO person 360 integration) | Sinergia — person_intelligence se enriquece con cost data |

## 12. Roadmap por fases

### Fase 1 — MVP (TASK-067 a TASK-070)

- Schema `greenhouse_cost_intelligence` con `period_closure_config` + `period_closures`
- Event catalog entries para `accounting.*`
- Projection domain `cost_intelligence` en registry
- Projection `period_closure_status`
- Projection `operational_pl`
- APIs de lectura + close/reopen
- Finance UI: tab "Cierre de Período" con P&L inline

### Fase 2 — Cross-module consumers (TASK-071)

- Agency: margin % badge por space
- Organization 360: P&L tab
- People: costo fully-loaded con closure awareness
- Home/Nexa: financial status widget

### Fase 3 — Profundización (futuro, sin task asignada)

- Cost centers por department y business unit
- Budget vs actual
- Provisiones laborales (vacaciones, indemnización)
- Costos empleador no-nómina (SIS, mutual)
- Tabla `employer_cost_parameters` y `provision_parameters`
- Reconciliación bancaria como condición de cierre
- Projected P&L (projected payroll + income pipeline = projected margin)

## 13. Gaps declarados

| Gap | Impacto | Fase esperada |
|-----|---------|---------------|
| No hay provisión de vacaciones (~4.17% sueldo) | Costo laboral subestimado | Fase 3 |
| No hay provisión de indemnización (~8.33% sueldo) | Costo laboral subestimado | Fase 3 |
| SIS + mutual no visible en payroll | Costo empleador incompleto | Fase 3 |
| Budget/presupuesto no existe | No hay variance analysis | Fase 3 |
| Bank reconciliation no es condición de cierre | Cierre posible sin reconciliación completa | Fase 3 |
| Cost centers solo a nivel client + member | No hay visión por department ni BU | Fase 3 |
