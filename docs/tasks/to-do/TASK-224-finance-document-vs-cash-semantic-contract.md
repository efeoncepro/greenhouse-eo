# TASK-224 - Finance Document vs Cash Semantic Contract

## Delta 2026-04-03

- Se aplicó un primer slice visible en el repo para dejar de presentar `income` / `expenses` como sinónimo de caja:
  - navegación Finance renombrada de forma visible a `Ventas` / `Compras`
  - copy contextual en listas de Finance aclarando `documento/devengo` vs `cobro/pago`
  - `project_context.md` y `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` ya formalizan la distinción
- Este delta no cierra la lane:
  - el runtime sigue usando tablas y APIs llamadas `income` / `expenses`
  - varios consumers todavía mezclan documento tributario/comercial con evento de caja
  - la separación completa sigue dependiendo de follow-ons como `TASK-194`
- Guardia operativa nueva:
  - esta lane no puede dejar huérfanos los cálculos actuales de `Finance` o `Cost Intelligence`
  - tampoco puede “desaparecer” la realidad ya materializada de facturas cobradas o compras pagadas
  - la separación correcta debe preservar el bridge entre documento, devengo y caja real

## Delta 2026-04-08

- Se endureció el contrato de caja sobre el ledger canónico:
  - `IncomeDetailView` registra cobros por `POST /api/finance/income/[id]/payments`
  - el endpoint legacy `POST /api/finance/income/[id]/payment` quedó como wrapper compatible del carril canónico y ya no puede caer a BigQuery
  - `Cobros` y `Pagos` quedaron alineados a la shape real de sus APIs Postgres-first
- Se agregó remediación operativa para histórico y drift:
  - nuevo módulo `payment-ledger-remediation`
  - scripts `pnpm audit:finance:payment-ledgers` y `pnpm backfill:finance:payment-ledgers`
  - el backfill usa `recordPayment` / `recordExpensePayment`, por lo que también publica `finance.income_payment.recorded` y `finance.expense_payment.recorded`
- El sync de movimientos bancarios Nubox ya usa el write path canónico de `income_payments`, evitando que cobros sincronizados queden fuera del contrato reactivo que consumen `client_economics`, `operational_pl` y `commercial_cost_attribution`
- `data-quality` y los summaries Postgres-first ahora reportan gaps tipo `paid without ledger`

## Delta 2026-04-08 — Cash surface materializada (TASK-280 + TASK-281)

- La surface de caja real quedó completamente materializada:
  - **Cobros** (`/finance/cash-in`) con instrumento de pago y logo en tabla
  - **Pagos** (`/finance/cash-out`) con instrumento de pago y logo en tabla
  - **Posición de caja** (`/finance/cash-position`) con resultado cambiario y multi-moneda
- Payment Instruments Registry operativo en Admin Center con 20 proveedores (bancos, TC, fintech, payroll processors)
- FX gain/loss auto-calculado al registrar pagos USD
- `CreateIncomeDrawer` y `CreateExpenseDrawer` incluyen selector de instrumento
- TASK-194 (expense payment ledger separation) absorbida completamente por TASK-280
- La separación documento/caja queda visible a nivel de navegación y UX — resta formalizar en runtime (renombrar APIs internas de `income`/`expenses` a vocabulario semántico)

## Status

- Lifecycle: `to-do` (revertida 2026-05-05 — solo 1 commit doc-only en 60+ días, ningún slice empezado; vuelve a backlog para re-triage)
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Parcial`
- Rank: `TBD`
- Domain: `finance`
- GitHub Project: `TBD`
- GitHub Issue: `TBD`

## Summary

Formalizar en Finance un contrato semántico explícito que separe:

- `documento comercial/tributario`
- `devengo`
- `evento de caja`

Hoy Greenhouse sincroniza ventas y compras de `Nubox` hacia `greenhouse_finance.income` y `greenhouse_finance.expenses`, pero varias surfaces visibles y algunos consumers downstream todavía los presentan o interpretan como si fueran directamente `ingresos` o `egresos` de caja. Esta lane institucionaliza el lenguaje correcto y define el backlog restante para que Finance no confunda factura con cobro ni compra con pago.

La aclaración importante es que esta lane **no busca invalidar** los cálculos ya construidos sobre facturas cobradas/pagadas. Busca ordenar el contrato para que:

- el documento siga existiendo como hecho comercial/tributario
- el devengo siga alimentando `P&L`, costos y serving financiero cuando corresponda
- la caja siga reconociéndose a partir de cobros/pagos reales ya persistidos

## Why This Task Exists

El problema no es solo de naming. Es un drift de contrato de dominio:

- una `factura de venta` respalda revenue/devengo, pero no equivale automáticamente a un cobro
- una `factura de compra` respalda costo/obligación, pero no equivale automáticamente a un pago
- `income_payments` ya modela bien el cobro real en el lado de ventas
- el lado de compras ya tiene `expense_payments` como ledger de caja, pero todavía conserva campos derivados embebidos (`payment_date`, `payment_status`, `amount_paid`) que deben tratarse como estado materializado y no como source of truth

Síntomas visibles hoy:

- la UI puede sugerir que `Ingresos` = `cobros`
- la UI puede sugerir que `Egresos` = `pagos`
- algunas tablas/KPIs mezclan lenguaje de documento con lenguaje de caja
- downstream consumers pueden heredar una lectura equivocada si toman labels o summaries al pie de la letra

Riesgo operativo:

- malas decisiones de producto y reporting
- interpretación incorrecta de KPIs financieros
- mayor confusión al integrar `Nubox`, conciliación bancaria, `P&L`, `cashflow` y ledgers de pago
- si se corrige solo el naming sin preservar el bridge actual, se puede dejar huérfano el cálculo vigente de:
  - facturas cobradas
  - facturas pagadas
  - cuentas por cobrar / por pagar
  - `P&L`
  - `cashflow`
  - cierres operativos y snapshots de Finance

## Goal

- Formalizar el vocabulario canónico de Finance para `venta`, `compra`, `cobro`, `pago`, `devengo` y `caja`.
- Alinear surfaces visibles y documentación viva para que `Nubox` no quede presentado como caja directa.
- Inventariar y cerrar los consumers/runtime paths que todavía mezclan `documento` y `cash event`.
- Dejar la relación explícita entre esta lane y los follow-ons técnicos que completan la separación física del modelo.
- Preservar explícitamente los cálculos actuales que ya usan realidad de facturas cobradas/pagadas, evitando dejar huérfanos `Finance`, `Cost Intelligence` o readers downstream.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- `Nubox sales` y `Nubox purchases` deben interpretarse primero como documentos fuente, no como caja.
- `P&L` puede seguir leyendo devengo desde `income` / `expenses`, pero no debe venderse como cashflow.
- `cashflow` y conciliación deben apoyarse en ledgers/pagos reales (`income_payments`, `expense_payments`), no en flags embebidos del documento cuando exista un ledger canónico.
- no se debe renombrar físicamente el schema de golpe en esta lane si eso mezcla refactor masivo con semántica funcional.
- las surfaces visibles deben preferir lenguaje explícito aunque el storage legacy conserve nombres históricos.
- todo ajuste de contrato en esta lane debe ser aditivo o bridge-safe:
  - no romper `payment_status`, `amount_paid`, `income_payments`, `expense_payments`, `payment_date` ni los readers que hoy sí capturan realidad de cobro/pago
  - no degradar cálculos actuales de `Finance Dashboard`, `cashflow`, `P&L`, `client_economics` o `operational_pl`

## Dependencies & Impact

### Depends on

- `TASK-163` - separación básica de tipos documentales (`quotes`, `credit notes`, `debit notes`)
- `TASK-194` - `Expense Payment Ledger Separation`
- `greenhouse_finance.income`
- `greenhouse_finance.income_payments`
- `greenhouse_finance.expenses`
- sync actual `src/lib/nubox/sync-nubox-to-postgres.ts`

### Impacts to

- `TASK-015` - Financial Intelligence Layer
- `TASK-070` - Cost Intelligence Finance UI
- `TASK-179` - Finance Reconciliation Postgres-Only Cutover & Integration Hardening
- dashboards `P&L`, `summary`, `cashflow`
- surfaces `Finance`, `Agency`, `Organization 360`, `People 360` y consumers que exponen revenue/cost/caja
- `TASK-188` cuando documenta contratos runtime para `Nubox`

### Files owned

- `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `project_context.md`
- `src/config/greenhouse-nomenclature.ts`
- `src/views/greenhouse/finance/IncomeListView.tsx`
- `src/views/greenhouse/finance/ExpensesListView.tsx`
- `src/app/api/finance/dashboard/**`
- `src/app/api/finance/income/**`
- `src/app/api/finance/expenses/**`

## Current Repo State

### Ya existe

- `income` ya distingue varios tipos documentales relevantes (`service_fee`, `credit_note`, `debit_note`, `quote` ya separado)
- `income_payments` ya modela cobros reales como ledger 1:N
- `expense_payments` ya modela pagos reales como ledger 1:N
- `cashflow` y `P&L` ya están separados como conceptos en arquitectura
- `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` ya documenta `income` / `expenses` como carril de devengo y `income_payments` como caja del lado ventas
- la capa visible principal ya recibió un primer ajuste de copy/navegación para `Ventas` / `Compras`
- `Finance` y `Cost Intelligence` ya calculan realidad útil a partir de estos objetos:
  - facturación/devengo por documento
  - cobros reales vía `income_payments`
  - pagos reales vía `expense_payments`
  - cuentas por cobrar / pagar y vistas de cierre

### Gap actual

- el runtime sigue exponiendo nombres históricos `income` / `expenses` y no siempre agrega metadata explícita de `document vs cash`
- algunos consumers siguen usando `Ingresos` / `Egresos` como shorthand ambiguo
- la separación visible ya empezó, pero todavía no existe un inventario formal de todas las surfaces que deben alinearse
- el gap no es “reemplazar” lo que hoy calcula Finance, sino explicitar qué parte del cálculo viene de:
  - documento/devengo
  - cobro/pago real
  - estados derivados/materializados

## Scope

### Slice 1 - Canonical vocabulary

- definir vocabulario visible y técnico para:
  - documento de venta
  - documento de compra
  - devengo
  - cuenta por cobrar
  - cuenta por pagar
  - cobro
  - pago
  - caja
- dejar mapping explícito `Nubox -> Greenhouse Finance`

### Slice 2 - Visible surface alignment

- alinear navegación, metadata, headers, helper text y estados vacíos de las surfaces principales de Finance
- evitar que `income` se venda como equivalente directo a cobro
- evitar que `expenses` se venda como equivalente directo a pago

### Slice 3 - Runtime/API alignment inventory

- inventariar endpoints y readers que todavía mezclan documento y caja
- definir dónde hace falta agregar metadata explícita o una surface nueva de `Caja`
- coordinar este slice con `TASK-194` para cerrar la asimetría del lado compras
- identificar explícitamente qué readers ya dependen de realidad de cobro/pago y deben preservarse sin regresión

### Slice 4 - Downstream consumer propagation

- revisar dashboards y consumers cross-module donde el copy o el contrato todavía sea ambiguo
- dejar follow-ons claros en lugar de asumir que el fix visible ya resolvió toda la semántica

## Out of Scope

- renombrar físicamente tablas `income` / `expenses` en PostgreSQL o BigQuery
- rehacer completo el `P&L` engine en esta lane
- migrar todas las rutas API a nuevos paths públicos en este mismo lote
- rediseñar por completo las surfaces de `Cobros` / `Pagos` en este mismo lote

## Acceptance Criteria

- [ ] Existe una task canónica que formaliza la separación `documento/devengo` vs `caja` para Finance.
- [ ] La task deja explícita la relación con `Nubox`, `income_payments` y `TASK-194`.
- [ ] La arquitectura viva y el contexto del proyecto documentan el contrato correcto.
- [ ] Las surfaces visibles principales de Finance no presentan facturas de Nubox como cobros automáticos ni compras como pagos automáticos.
- [ ] El inventario de gaps runtime/downstream restantes queda declarado en esta lane o en follow-ons enlazados.
- [ ] La lane declara explícitamente que no debe dejar huérfanos los cálculos actuales de `Finance` y `Cost Intelligence` sobre facturas cobradas/pagadas.
- [ ] Cualquier follow-on derivado preserva la realidad ya materializada de cobros y pagos mientras mejora la semántica del modelo.
- [ ] `pnpm lint` pasa para los cambios visibles que apliquen a esta lane.

## Verification

- `pnpm lint`
- revisión manual de:
  - `/finance/income`
  - `/finance/expenses`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `project_context.md`

## Follow-ups

- `TASK-194` debe cerrar la separación física entre obligación y pago en egresos.
- Si Finance necesita una surface explícita de `Caja`, abrir un follow-on dedicado en vez de sobrecargar esta lane con un rediseño mayor.
