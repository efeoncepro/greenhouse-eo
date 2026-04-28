# Greenhouse EO — Member Loaded Cost Model V1

> **Version:** 1.0
> **Created:** 2026-04-28 by Claude (Opus 4.7) en sesión con Julio Reyes
> **Audience:** Backend engineers, agentes que implementen cost-attribution / margin / pricing, finance/PM stakeholders que necesiten entender de dónde vienen las cifras de margen
> **Related:** `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`, `GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`, `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`, TASK-705, TASK-708, TASK-709
> **Supersedes:** modelo ad-hoc actual (`expenses.allocated_client_id` + `direct_overhead_member_id` + reglas TASK-705 reactivas)
> **Status:** SPEC — no implementado. Reemplaza el approach reactivo actual con un modelo dimensional canónico.

---

## 0. Contexto y Por Qué Existe Este Spec

Hasta el 2026-04-28, Greenhouse atribuye costos a clientes vía 3 vías paralelas que no conversan:

1. **Labor allocation** — `client_labor_cost_allocation` (VIEW): payroll × staffing % FTE.
2. **Expense rules (TASK-705)** — atajos manuales (`allocated_client_id`, `direct_overhead_member_id`) seteados por reglas de supplier_name.
3. **Adopción manual** — operador asigna gastos via UI.

Limitaciones del approach actual:

- **Atajos pre-asignan expense → cliente sin pasar por el modelo dimensional**. Adobe → "equipo creativo" es heurística, no la realidad de qué seat consume cada miembro.
- **Tool catalog (`greenhouse_ai.tool_catalog`) existe pero NO se usa en attribution**. La fuente de verdad del costo unitario está separada de cómo se factura.
- **`member_tool_licenses` está vacía o subutilizada**. La declaración "Daniela usa Adobe + Notion + Frame" no existe como dato.
- **Overhead general** (Vercel, GitHub, Beeconta, Nubox, Google Cloud, comisiones bank) **no se distribuye a clientes**. Queda en bucket separado y rompe el cálculo de margen real.
- **Per-credit cost models** (Claude Opus, Veo 3) no se trackea per-miembro.
- **El miembro NO es source-of-truth** del costo cargado. Cada vista deriva su propio cálculo.

Este spec define **el modelo correcto** donde el **miembro es la unidad atómica de costo** y todo lo demás se deriva.

---

## 1. Visión y Principios Rectores

### 1.1 La pregunta canónica

Toda la lógica de cost-attribution debe responder UNA sola pregunta:

> **¿Cuánto cuesta tener a [Daniela] trabajando este [marzo 2026], y cómo se distribuye ese costo entre los clientes que ella sirve?**

Si esa pregunta tiene una sola respuesta canónica auditable, todo lo demás (margen cliente, ICO real, pricing de servicios, P&L) se deriva. Si no, cada módulo inventa su propia respuesta y el portal entero sufre drift.

### 1.2 Principio 1 — El miembro es el átomo

Cliente NO consume Adobe, Notion, ni overhead directamente. **Cliente consume miembros**, y cada miembro tiene un **costo cargado** (full loaded cost) que incluye:

- Salario directo + cargas sociales + beneficios
- Suma de tools que usa (proporcional al seat / créditos consumidos)
- Su parte del overhead general de la firma

Ese costo cargado se prorratea a clientes vía staffing % FTE.

Estándar contable: **full absorption costing**.

### 1.3 Principio 2 — Provider × Tool × Asignación es modelo dimensional clásico

El modelo es exactamente el patrón **fact tables con dimensiones** de un data warehouse:

| Dimensiones | Facts |
|---|---|
| Provider (Adobe, OpenAI, Notion...) | Expense (cargo del banco) |
| Tool (Adobe CC, ChatGPT Team, Notion Plus) | Consumption (uso real per period) |
| Member (Daniela, Andrés...) | Allocation (asignación a cliente vía FTE) |
| Client (Sky, Motogas...) | |
| Period (year, month) | |

La dimensión **Tool** actúa como junction entre Provider (cuenta financiera) y Member (capacidad humana). El **Consumption fact** es lo que activa la cadena de atribución.

### 1.4 Principio 3 — La fuente de verdad económica del tool es el contrato comercial, no el expense

Un expense Adobe puede llegar como $178,844 sin desglose. Pero el contrato Adobe CC declara **3 seats × $50 USD/seat/mes × FX rate**. Ese es el costo unitario canónico, NO `expense_total ÷ N_seats` improvisado.

`tool_catalog` es **source-of-truth del cost basis**. Cuando llega un expense:

1. Se mapea al tool (`tool_catalog_id`).
2. Se valida que `expense_total ≈ subscription_amount × seats × FX`.
3. Si difiere, se flagea como `cost_basis_drift` (over/under invoicing del provider).

Esto convierte la atribución en un **sistema de control financiero**, no solo de allocation.

### 1.5 Principio 4 — Overhead es decisión de política, no cálculo

Vercel + GitHub + Beeconta + Nubox + comisiones bank **no son "costo de Sky"** porque no se consumen por cliente. Son costo de tener la firma operando. Repartirlos entre clientes es **política**, no cálculo.

3 políticas válidas con tradeoffs distintos:

| Política | Lógica | Cuándo es justa |
|---|---|---|
| **Per-FTE** | Cliente absorbe `overhead × (FTE_cliente ÷ FTE_total)` | Overhead escala con headcount |
| **Per-revenue** | Cliente absorbe `overhead × (revenue_cliente ÷ revenue_total)` | Overhead escala con ingresos |
| **Equal absorption** | Cada cliente paga `overhead ÷ N_clientes` | Overhead es fijo independiente del tamaño |

La decisión es del **CEO/CFO**, no del sistema. El sistema debe **soportar las 3 políticas como configuración** y permitir cambiarla por business line o por período.

### 1.6 Principio 5 — Inmutabilidad temporal del costo

Daniela en marzo cuesta $X. En abril cuesta $Y. Cambiar el sueldo de Daniela en mayo NO debe re-escribir el costo de Sky en marzo.

Implementación:

- **Snapshot de cost basis** al cierre de cada período (`tool_provider_cost_basis_snapshots` ya existe).
- **Snapshot de staffing** al cierre de cada período.
- **Snapshot de overhead distribution policy** al cierre de cada período.

Después del cierre, esos snapshots son **inmutables**. El costo histórico de Sky en marzo NO se puede recalcular — está congelado.

Estándar: **deflationary-time-safe accounting**. Cualquier auditor puede recalcular cualquier período viendo SOLO los snapshots de ese período.

### 1.7 Principio 6 — Degradación honesta

Cuando faltan datos (member_tool_licenses vacío, staffing no registrado, snapshot no congelado), el sistema NO devuelve "0" silencioso. Devuelve **coverage flags** explícitos:

- `hasLaborData: false` → "Labor allocation pendiente — cierre del período no materializado"
- `hasToolConsumptionData: false` → "Asignaciones member↔tool no declaradas — costo de tools no atribuido"
- `hasOverheadDistributionPolicy: false` → "Política de overhead no configurada para este período"

UI presenta el degradation state con warnings, no zeroes silenciosos. Patrón ya validado en TASK-708.

---

## 2. Modelo Dimensional Canónico

### 2.1 Diagrama lógico

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   PROVIDER   │      │    PERIOD    │      │   CLIENT     │
│ (Adobe,      │      │ (year+month) │      │ (Sky, ...)   │
│  OpenAI, ..) │      └──────┬───────┘      └──────┬───────┘
└──────┬───────┘             │                     │
       │ owns                │                     │
       ▼                     │                     │
┌──────────────┐             │            ┌────────┴───────┐
│     TOOL     │             │            │  staffing      │
│ (Adobe CC,   │             │            │  (member×FTE×  │
│  ChatGPT,    │             │            │  client per   │
│  Notion)     │             │            │  period)       │
└──────┬───────┘             │            └────────┬───────┘
       │ has cost_model      │                     │
       │ (sub|credit|hybrid) │                     │
       │                     │                     │
       │            ┌────────┼─────────┐           │
       │            │        │         │           │
       ▼            ▼        ▼         ▼           ▼
   ┌──────────────────────────────┐   ┌────────────────────┐
   │  member_tool_consumption     │   │  member_loaded_   │
   │  (FACT: por miembro × period │◄──┤  cost_per_period  │
   │   × tool — qty + unit_cost   │   │  (FACT)           │
   │   + total = atribución       │   │  payroll          │
   │   directa al miembro)        │   │  + Σ tools        │
   └──────┬───────────────────────┘   │  + overhead share │
          │                            └────────┬──────────┘
          │ rolls up to                         │
          ▼                                     ▼
                              ┌──────────────────────────┐
                              │  client_member_cost      │
                              │  (FACT: por client ×     │
                              │   member × period        │
                              │   = loaded_cost × FTE%)  │
                              └────────┬─────────────────┘
                                       │
                                       │ aggregates to
                                       ▼
                              ┌──────────────────────────┐
                              │  client_full_cost        │
                              │  (FACT: por client ×     │
                              │   period — total)        │
                              └──────────────────────────┘
```

### 2.2 Dimensiones core

#### Provider
- Tabla actual: `greenhouse_finance.payment_provider_catalog`
- Atributos canónicos: `provider_slug`, `display_name`, `provider_type`, `country_code`, `applicable_to[]`
- Estado: ✅ Existe (TASK-701).

#### Tool
- Tabla actual: `greenhouse_ai.tool_catalog`
- Atributos canónicos: `tool_id`, `tool_name`, `provider_id` (FK), `cost_model` ENUM(`subscription`, `per_credit`, `hybrid`, `included`), `subscription_amount`, `subscription_currency`, `subscription_billing_cycle`, `subscription_seats`, `credit_unit_cost`, `credit_unit_currency`, `credits_included_monthly`
- Estado: ✅ Existe (5+ rows seeded). **Falta deprecar el tool_catalog dual en `greenhouse_core` o consolidar en uno solo.**

#### Member
- Tabla: `greenhouse_core.members`
- Estado: ✅ Existe (7 miembros activos).

#### Client
- Tabla: `greenhouse_core.clients`
- Estado: ✅ Existe.

#### Period
- Convención: `(period_year INT, period_month INT)` — primer día del mes operativo (`America/Santiago`).
- No existe tabla — se usa como compound key.

### 2.3 Facts core

#### Fact 1 — Expense (cargo banco)
- Tabla: `greenhouse_finance.expenses`
- Estado: ✅ Existe. **Refactor pendiente:** deprecar `allocated_client_id` y `direct_overhead_member_id` como atajos. El expense se vincula a `tool_catalog_id` o a un `overhead_pool_id` (NUEVO), y el modelo deriva la atribución.

#### Fact 2 — `member_tool_consumption` (NUEVO — bridge crítico que falta)

```
member_tool_consumption
─────────────────────────
  consumption_id      TEXT PK
  member_id           TEXT FK → greenhouse_core.members
  tool_catalog_id     TEXT FK → greenhouse_ai.tool_catalog
  period_year         INT
  period_month        INT
  consumption_unit    TEXT   -- 'seat' | 'credit' | 'usage'
  consumption_qty     NUMERIC -- 1 (seat), N (credits)
  unit_cost_clp       NUMERIC -- snapshot del costo unitario en moment T
  total_cost_clp      NUMERIC -- qty × unit_cost
  source_expense_id   TEXT FK → greenhouse_finance.expenses (NULLABLE — agregable post-hoc)
  allocation_method   TEXT   -- 'declared_license' | 'per_credit_split' | 'manual_override'
  cost_basis_snapshot_id TEXT FK → tool_provider_cost_basis_snapshots
  created_at, updated_at TIMESTAMPTZ
  UNIQUE (member_id, tool_catalog_id, period_year, period_month, consumption_unit)
```

- Una fila por **miembro × tool × período × unidad**.
- El materializer la genera leyendo `expenses` con `tool_catalog_id` + `member_tool_licenses` activas para el período.
- Es el **nexo único** que conecta Provider → Tool → Member → Expense → Período → (downstream) Client.

#### Fact 3 — `member_loaded_cost_per_period` (NUEVO)

```
member_loaded_cost_per_period
──────────────────────────────
  member_id           TEXT
  period_year         INT
  period_month        INT
  payroll_cost_clp    NUMERIC -- de payroll_entries × multiplier
  tool_cost_clp       NUMERIC -- SUM(member_tool_consumption.total_cost_clp)
  overhead_share_clp  NUMERIC -- según overhead_distribution_policy
  loaded_cost_clp     NUMERIC -- SUM de los 3
  policy_snapshot_id  TEXT FK → overhead_distribution_policy_snapshots
  PRIMARY KEY (member_id, period_year, period_month)
```

- Materializado post-cierre del período.
- Inmutable después del cierre.

#### Fact 4 — `client_member_cost_per_period` (NUEVO o refactor de existing)

```
client_member_cost_per_period
──────────────────────────────
  client_id           TEXT
  member_id           TEXT
  period_year         INT
  period_month        INT
  fte_contribution    NUMERIC  -- de staffing_assignments_snapshot
  loaded_cost_clp     NUMERIC  -- de member_loaded_cost_per_period × fte
  cost_breakdown_json JSONB    -- { payroll: X, tools: Y, overhead: Z }
  PRIMARY KEY (client_id, member_id, period_year, period_month)
```

#### Fact 5 — `client_full_cost_per_period` (NUEVO o refactor de v2)

```
client_full_cost_per_period
────────────────────────────
  client_id           TEXT
  period_year         INT
  period_month        INT
  total_loaded_cost_clp NUMERIC -- SUM de client_member_cost
  total_payroll_clp     NUMERIC
  total_tools_clp       NUMERIC
  total_overhead_clp    NUMERIC
  member_count          INT
  fte_total             NUMERIC
  PRIMARY KEY (client_id, period_year, period_month)
```

Reemplaza `commercial_cost_attribution_v2` (TASK-708) como source-of-truth.

### 2.4 Catálogos de soporte

#### `member_tool_licenses` (existing, expandir)
Declaración explícita de qué seats consume cada miembro. Date-ranged:

```
member_tool_licenses
─────────────────────
  license_id          TEXT PK
  member_id           TEXT FK
  tool_catalog_id     TEXT FK
  start_date          DATE NOT NULL
  end_date            DATE NULL  -- NULL = vigente
  consumption_unit    TEXT   -- 'seat' (default) | 'credit_quota' | 'usage_log'
  declared_qty        NUMERIC DEFAULT 1
  notes               TEXT
  declared_by_user_id TEXT
  created_at, updated_at
```

#### `overhead_distribution_policy` (NUEVO)

```
overhead_distribution_policy
────────────────────────────
  policy_id           TEXT PK
  effective_from      DATE NOT NULL
  effective_to        DATE NULL
  business_line_filter TEXT NULL  -- aplica a una BL específica o NULL=todas
  strategy            TEXT NOT NULL -- 'per_fte' | 'per_revenue' | 'equal' | 'no_distribution'
  declared_by_user_id TEXT
  created_at
```

Un row por período-policy. Snapshot al cierre de período.

#### `overhead_pool` (NUEVO o convención)
Conjunto de `expenses` marcados como overhead general (no atribuibles a tool ni cliente directo). Hoy esto se deriva de `cost_category='overhead' AND cost_is_direct=FALSE AND allocated_client_id IS NULL`. Se puede mantener así o materializar como tabla.

#### `tool_provider_cost_basis_snapshots` (existing)
Snapshot del costo unitario del tool al cierre de período. Inmutable.

---

## 3. Cost Models del Tool

Cada tool tiene un `cost_model` que dicta cómo se prorratea:

### 3.1 `subscription` (Adobe CC, Notion, Frame.io, Freepik Pro)

- **Provider factura**: $X / seat / mes
- **Cómo prorratear a miembros**: `expense_total ÷ N_seats_pagados`. Cada seat asignado se atribuye al miembro de la license activa.
- **Validación**: si `expense_total / subscription_amount ≠ subscription_seats`, drift detected (alguien canceló/agregó seat sin actualizar tool_catalog).
- **Caso típico**: 95% de las tools del equipo creativo.

### 3.2 `per_credit` (Claude Opus, Veo 3.1, Gemini API, ElevenLabs)

- **Provider factura**: $Y / credit consumido (post-pago basado en uso).
- **Cómo prorratear a miembros**: requiere logs de uso per-miembro. 3 estrategias:
  - **Strategy A (gold standard)**: API logs del provider con `user_id` (Anthropic Console expone esto).
  - **Strategy B (default V1)**: split equitativo entre miembros con license activa.
  - **Strategy C (declarative)**: cada miembro declara su consumo mensual en UI.
- **Recomendación V1**: Strategy B para todos los per_credit. Strategy A solo para Claude (el más caro). Strategy C como backup manual.

### 3.3 `hybrid` (Freepik AI Suite — sub + per_credit overage)

- **Provider factura**: $Z fijo + $W/credit por encima del incluido.
- **Cómo prorratear**: sub fijo per-seat (Strategy subscription). Credits de overage per-uso real (Strategy per_credit).
- **Caso típico**: tools que tienen plan base + créditos pay-as-you-go.

### 3.4 `included` (Adobe Firefly dentro de Adobe CC)

- **Provider no factura por separado**: ya está dentro del sub principal.
- **Cómo prorratear**: $0 al miembro. NO crea row en `member_tool_consumption`.
- **Para qué sirve la entry en tool_catalog**: visibility / governance / "qué le dimos a este cliente".

---

## 4. Overhead Distribution Strategies

### 4.1 Strategy: `per_fte` (recomendado default V1)

```
overhead_share_for_member(M, period) =
   overhead_total(period) × (FTE_total_de_M ÷ FTE_total_firma)
```

- `FTE_total_de_M` = suma de `fte_contribution` del miembro M en `staffing_assignments` para el período.
- `FTE_total_firma` = suma de FTE de TODOS los miembros (a clientes + a internal).

Justo si overhead escala con headcount. **Default recomendado** para Greenhouse.

### 4.2 Strategy: `per_revenue`

```
overhead_share_for_client(C, period) =
   overhead_total(period) × (revenue_C ÷ revenue_total)
```

Distribuye entre clientes según facturación. Justo si overhead escala con ingresos.

### 4.3 Strategy: `equal`

```
overhead_share_for_client(C, period) =
   overhead_total(period) ÷ N_clients_active(period)
```

Cada cliente absorbe lo mismo. Justo si overhead es realmente fijo.

### 4.4 Strategy: `no_distribution`

Overhead NO se atribuye a clientes. Queda como bucket Greenhouse interno.

UI muestra `client_full_cost = payroll + tools` (sin overhead share). Reportes adicionales pueden mostrar margen "antes de overhead" vs "después de overhead".

### 4.5 Pluggable strategy

El sistema implementa las 4 como `OverheadDistributionStrategy` interface en TS. La política activa para un período viene de `overhead_distribution_policy` snapshot inmutable.

---

## 5. Snapshots Inmutables y Política Temporal

### 5.1 Qué se snapshota al cierre de cada período

| Snapshot | Tabla canónica | Granularidad |
|---|---|---|
| Tool cost basis | `tool_provider_cost_basis_snapshots` | Por tool × período |
| Staffing | `staffing_assignments_snapshot` (NUEVO) | Por member × client × período × FTE |
| Overhead policy | `overhead_distribution_policy_snapshots` (NUEVO) | Por business_line × período |
| Member loaded cost | `member_loaded_cost_per_period` con flag `is_period_closed` | Por member × período |
| Client full cost | `client_full_cost_per_period` con flag `is_period_closed` | Por client × período |

### 5.2 Política de re-cálculo retroactivo

Estándar contable canónico para Greenhouse:

> **NO se re-calcula un período cerrado.** Cualquier ajuste posterior se registra como "ajuste de período anterior" en el período corriente, NUNCA como modificación al snapshot histórico.

Implementación:
- Snapshots tienen `is_period_closed = TRUE` después del cierre.
- Migrations futuras NUNCA modifican rows con `is_period_closed = TRUE`.
- Helper `closeAccountingPeriod(year, month)` materializa los 5 snapshots y los marca cerrados.
- Helper `recordPriorPeriodAdjustment({ originalPeriod, adjustmentReason, amountClp, applyToCurrentPeriod })` registra el ajuste en el período corriente sin tocar el snapshot histórico.

### 5.3 Pre-close vs post-close

Antes del cierre, las tablas son **proyecciones derivadas en tiempo real** (consultar VIEW dinámica).
Después del cierre, las tablas son **snapshots inmutables** (consultar tabla materializada).

UI distingue: "Período abierto · datos proyectados" vs "Período cerrado · datos finales".

---

## 6. Migración del Modelo Actual al Modelo Canónico

### 6.1 Estado actual a deprecar

| Componente | Estado | Plan |
|---|---|---|
| `expenses.allocated_client_id` shortcut | TASK-705 lo usa | Deprecar — el modelo deriva atribución vía tool→member→client. Solo usar para casos excepcionales (refunds, ajustes one-off). |
| `expenses.direct_overhead_member_id` shortcut | TASK-705 lo usa | Deprecar — el modelo deriva costo per-miembro vía member_tool_consumption. |
| Reglas TASK-705 (`expense_attribution_rules`) | Activo | Conservar pero refactorizar: regla mapea expense → tool_catalog_id (no a cliente/miembro directo). El tool determina la attribution. |
| `client_labor_cost_allocation` cruda | Activo | Conservar para audit por payroll_entry. Cualquier consumer comercial usa `client_labor_cost_allocation_consolidated` (TASK-709). |
| `client_labor_cost_allocation_consolidated` | TASK-709 | Conservar — labor allocation es una de las 3 capas del nuevo modelo. |
| `commercial_cost_attribution_v2` | TASK-708 | Migrar a `client_full_cost_per_period` (más completa: incluye tool_consumption + overhead share). |

### 6.2 Migration path en fases

**Fase 1 — Foundation (Migration P1)**:
- Crear `member_tool_consumption` table.
- Crear `overhead_distribution_policy` + snapshots table.
- Consolidar tool_catalog dual (si hay 2, elegir uno).

**Fase 2 — Materializers (Migration P2)**:
- Helper `materializeMemberToolConsumption(year, month)`: lee expenses con `tool_catalog_id`, busca seats activos, splittea, INSERT en `member_tool_consumption`.
- Helper `materializeMemberLoadedCost(year, month)`: lee payroll + tool_consumption + overhead → escribe `member_loaded_cost_per_period`.
- Helper `materializeClientFullCost(year, month)`: lee member_loaded × staffing → escribe `client_full_cost_per_period`.

**Fase 3 — Consumer migration (Migration P3)**:
- Update `commercial_cost_attribution_v2` para JOIN con `client_full_cost_per_period` en lugar de calcular ad-hoc.
- Update CostAllocationsView y todos los downstream consumers para leer del nuevo source-of-truth.
- Deprecar `allocated_client_id` y `direct_overhead_member_id` shortcuts (mark `@deprecated` en TS, log warning si se usa).

**Fase 4 — Snapshots + closing workflow (Migration P4)**:
- `closeAccountingPeriod(year, month)` workflow.
- UI admin para "cerrar período" + "registrar ajuste de período anterior".
- Reliability signals para snapshots faltantes.

**Fase 5 — Pluggable overhead strategies (Migration P5)**:
- Implementar 4 strategies (`per_fte`, `per_revenue`, `equal`, `no_distribution`).
- UI admin para configurar política por business line.

**Fase 6 — UI declarative member↔tool licenses (Migration P6)**:
- UI admin para declarar `member_tool_licenses` (qué seat consume cada miembro de cada tool).
- Bootstrap inicial via admin form o seed CSV.

**Fase 7 — Per-credit tracking** (V2, opcional):
- Anthropic API integration para consumo per-miembro de Claude.
- Strategy A activa para Claude. Resto sigue Strategy B.

### 6.3 Backwards compatibility

- **Reglas TASK-705 actuales siguen activas** durante migración. Después de fase 3 quedan como override manual de excepción.
- **`commercial_cost_attribution_v2` sigue activa** durante migración. Después de fase 3 queda como VIEW backwards-compat que internamente lee de `client_full_cost_per_period`.
- **Dashboards existentes (CostAllocationsView)** reciben mismo shape de datos pero ahora desde el nuevo source.

---

## 7. API Contracts y Consumers

### 7.1 Read endpoints canónicos

- `GET /api/cost-intelligence/member-loaded-cost?year=&month=&memberId=` — costo cargado por miembro
- `GET /api/cost-intelligence/client-full-cost?year=&month=&clientId=` — costo total por cliente con breakdown
- `GET /api/cost-intelligence/client-member-cost?year=&month=&clientId=` — costo cliente desglosado por miembro
- `GET /api/cost-intelligence/tool-consumption?year=&month=&toolId=` — consumo de un tool específico desglosado por miembro

### 7.2 Write endpoints canónicos

- `POST /api/admin/member-tool-licenses` — declarar/actualizar licencia member↔tool
- `POST /api/admin/overhead-distribution-policy` — configurar política de overhead
- `POST /api/admin/accounting-periods/close` — cerrar período (materializa snapshots)
- `POST /api/admin/accounting-periods/prior-adjustment` — registrar ajuste retroactivo

### 7.3 Consumers downstream (que deben migrar a leer del nuevo modelo)

- CostAllocationsView (`/finance/cost-allocations`)
- Cliente economics dashboard (`/finance/clients/[id]/economics`)
- ICO engine (`greenhouse_serving.ico_member_metrics`)
- P&L close-period reports
- Quote Builder (para mostrar margen estimado del recipe)
- Margin reports per business line

---

## 8. Reliability Signals

| Signal | Detecta | Severity |
|---|---|---|
| `member_tool_consumption_missing` | Período sin rows en `member_tool_consumption` cuando hay expenses con `tool_catalog_id` | Warning |
| `tool_catalog_cost_basis_drift` | `expense_total ≠ subscription_amount × seats` (provider over/under invoicing) | Warning |
| `member_tool_license_unassigned` | Tool catalog tiene rows pero `member_tool_licenses` está vacía | Warning |
| `overhead_policy_missing_for_period` | Período sin overhead_distribution_policy snapshot | Warning |
| `accounting_period_closed_late` | Período sin cerrar después de N días post-fin-de-mes (default 15) | Info |
| `member_loaded_cost_unmaterialized` | Período abierto sin proyección computed para >24h | Warning |
| `labor_allocation_saturation_drift` | Suma FTE > 1.0 por miembro/período (TASK-709, ya existe) | Warning |

Todos integrados al Finance Data Quality subsystem en `get-operations-overview.ts`.

---

## 9. Open Questions / Trade-offs

### 9.1 Tool catalog dual: cuál es source-of-truth

`greenhouse_ai.tool_catalog` tiene schema rico con cost_model, subscription_seats, etc.
`greenhouse_core.tool_catalog` existe paralelo (verificar relación).

**Decisión pendiente**: cuál es canónica. Recomendación: `greenhouse_ai.tool_catalog` (más rico). Si `greenhouse_core.tool_catalog` tiene consumers, hacer migration para consolidar.

### 9.2 Per-credit tracking: V1 default vs V2 ambitious

V1: Strategy B (split equitativo entre miembros con license). Simple, suficiente.
V2: Strategy A (API logs per-miembro). Caro de implementar, justifica solo para tools con costo > $200/mes.

**Decisión pendiente**: cuándo migrar tools individuales de B a A.

### 9.3 Overhead default policy: per_fte vs per_revenue

**Decisión pendiente del CFO/CEO**. Default V1 recomendado: `per_fte`. Cambiable por business line.

### 9.4 Re-cálculo retroactivo

Política propuesta: NUNCA. Ajustes vía "prior period adjustment" en período corriente.

**Decisión pendiente**: ¿hay casos legítimos donde el CEO necesita re-calcular un período cerrado? (Ej: descubrimiento de fraude, error contable mayor). Si sí, requiere workflow especial con audit trail explícito.

### 9.5 Snapshot vs proyección dinámica

Pre-close: VIEW dinámica.
Post-close: tabla materializada inmutable.

**Decisión pendiente**: ¿el cierre es manual (admin click) o automático (cron al día 5 del mes siguiente)?

### 9.6 Margin lane (recipe vs reality)

Modelar la diferencia entre `service_tool_recipe` (lo que prometimos al cliente) y `member_tool_consumption` (lo que realmente consumimos).

**Decisión pendiente**: scope de V1. Recomendación: V1 NO incluye margin lane. V2 lo agrega como feature de pricing/quote intelligence.

---

## 10. Anti-Patterns (Qué NO Hacer)

### 10.1 NO usar `expenses.allocated_client_id` como atajo

Pre-asigna expense → cliente sin pasar por el modelo. **Quema la flexibilidad**. El expense debe vincularse a `tool_catalog_id` o `overhead_pool` y dejar que el modelo derive.

### 10.2 NO calcular `expense_total ÷ N_seats` improvisado

El costo unitario canónico viene de `tool_catalog.subscription_amount` (snapshot). No de aritmética sobre el expense. El expense puede traer drift que debe detectarse, no enmascararse.

### 10.3 NO modificar snapshots inmutables

Después de `is_period_closed = TRUE`, NUNCA UPDATE. Cualquier ajuste va a período corriente como "prior period adjustment".

### 10.4 NO mantener tool_catalog dual

`greenhouse_ai.tool_catalog` y `greenhouse_core.tool_catalog` no pueden coexistir como fuentes paralelas. Una debe ser canónica, la otra deprecarse.

### 10.5 NO devolver "0" silencioso cuando faltan datos

Patrón anti-debugging. El sistema debe distinguir "0 porque no hay consumo" de "0 porque no hay datos de licencias declaradas". Coverage flags + UI degradation honesta.

### 10.6 NO crear endpoints paralelos

Si un nuevo módulo necesita exponer cost-attribution (ICO, quote builder, margin reports), debe consumir los endpoints canónicos definidos en §7. NO crear nueva ruta que recalcule por su lado.

### 10.7 NO atribuir overhead a "Greenhouse internal" como cliente

`Efeonce`, `Greenhouse Internal`, `client_internal` NO son clientes. Son la firma misma. Overhead que no se distribuye a clientes externos queda en bucket separado, no como cliente artificial.

---

## 11. Implementation Roadmap (Estimado, No Compromiso)

| Fase | Componentes | Effort | Status |
|---|---|---|---|
| 0. Spec + alignment (este doc) | Doc + decisiones de §9 | 2-3h | ✅ Spec escrito |
| 1. Foundation tables | Migrations P1 | 4-6h | Pendiente |
| 2. Materializers | Helpers + tests P2 | 8-12h | Pendiente |
| 3. Consumer migration | UI + endpoints P3 | 8-12h | Pendiente |
| 4. Snapshots + closing | Workflow P4 | 6-8h | Pendiente |
| 5. Pluggable overhead | Strategies P5 | 4-6h | Pendiente |
| 6. UI declarative licenses | Admin UI P6 | 8-10h | Pendiente |
| 7. Per-credit V2 (opcional) | Anthropic API | 8-12h | Pendiente |

**Total estimado V1 (fases 0-6)**: 40-58 horas.

---

## 12. Glosario

- **Loaded cost**: costo total cargado de un miembro en un período = payroll + tool licenses + overhead share.
- **FTE contribution**: fracción de capacidad del miembro asignada a un cliente en un período (0.0 a 1.0).
- **Cost basis snapshot**: precio unitario de un tool al cierre de un período. Inmutable.
- **Overhead distribution strategy**: regla pluggable que reparte overhead general entre clientes (per_fte, per_revenue, equal, no_distribution).
- **Period closure**: workflow que materializa snapshots inmutables al cierre del mes.
- **Prior period adjustment**: registro contable en período corriente que corrige error de período anterior cerrado, sin tocar el snapshot histórico.
- **Cost dimension**: capa de atribución de costo (labor / tool_consumption / overhead). El modelo une las 3.
- **Coverage flag**: bandera explícita en API responses que indica qué dimensiones están materializadas vs pendientes.
- **Bridge entity**: tabla que conecta dimensiones del modelo dimensional. `member_tool_consumption` es el bridge crítico que conecta Provider × Tool × Member × Expense × Period.

---

## 13. Spec Sign-off Checklist

Antes de iniciar Fase 1 (Foundation tables), las siguientes decisiones deben estar firmadas:

- [ ] Tool catalog canónico (greenhouse_ai vs greenhouse_core) — §9.1
- [ ] Overhead default policy (per_fte recomendado) — §9.3
- [ ] Política de re-cálculo retroactivo (NUNCA, vía prior period adjustment) — §9.4
- [ ] Cierre de período (manual admin click vs cron automático) — §9.5
- [ ] Scope V1 (incluye margin lane sí/no) — §9.6
- [ ] Lista canónica de tools del equipo + qué miembro usa cada una (data input para fase 6)
- [ ] Validación CFO/CEO de la regla per_fte como justa para Greenhouse 2026

---

> Este spec NO es código. Es contrato. Cualquier implementación que diverja de este contrato debe (a) actualizar el spec primero, (b) bumpear la versión a V2 con justificación, (c) declarar el migration path desde V1.
