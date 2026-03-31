# TASK-183 - Finance Expenses Reactive Intake & Cost Ledger Hardening

## Delta 2026-03-31

- Cerrada junto con `TASK-182`.
- Entregado en runtime:
  - hardening del ledger `expenses` con `space_id`, `source_type`, `payment_provider` y `payment_rail`
  - tenant isolation por `space_id` en reads/writes del slice tocado
  - intake reactivo desde `payroll_period.exported` para materializar expenses `payroll` y `social_security`
  - nueva proyección `finance_expense_reactive_intake` registrada en `src/lib/sync/projections/index.ts`
  - separación explícita entre `payment_method` y `payment_provider/payment_rail`
- Validación ejecutada:
  - `pnpm build` ✅
  - `pnpm lint` ✅ (`0 errors`, quedan 2 warnings legacy en `src/views/greenhouse/hr-core/HrDepartmentsView.tsx`)

## Delta 2026-03-31

- Se consolidó una postura recomendada para las decisiones de diseño más sensibles de la lane:
  - trigger de generación reactiva de nómina
  - modelado de Previred y cargas sociales
  - fees bancarios vs fees de gateway
  - separación `payment_method` vs `payment_provider/payment_rail`
  - boundary explícito entre `Finance` como ledger owner y `Cost Intelligence` como consumer/attributor
- La task deja de estar planteada principalmente como set de preguntas abiertas y pasa a tener una recomendación base concreta para `P0`.
- Auditoría contra runtime/schema versionado:
  - `greenhouse_finance.expenses` no tiene hoy columnas físicas para `source_type`, `payment_provider`, `payment_rail` ni `space_id`
  - el runtime actual tampoco filtra `expenses` por `space_id`, aunque esta lane sí debe cerrarlo para tenant isolation
  - los IDs operativos de expenses hoy siguen formato `EXP-*`, no la convención `EO-*` descrita para objetos canónicos
  - la revisión del schema real live quedó bloqueada por falta de `psql` local y de permisos/credenciales Postgres operativas en este entorno; la base de auditoría es código + DDL versionado
  - `TASK-182` y `TASK-183` quedan acopladas por contrato backend/metadata, no solo por UX

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `54`
- Domain: `finance`
- GitHub Project: `TBD`
- GitHub Issue: `TBD`

## Summary

`Finance > Expenses` ya funciona como CRUD operativo de egresos, pero todavía no actúa como ledger canónico y reactivo de costos para Greenhouse. La lane nueva formaliza a `expenses` como intake central de egresos manuales y system-generated: nómina derivada desde Payroll, comisiones bancarias detectadas desde reconciliación, fees de gateways/pagos online y metadatos de pago más expresivos. Cost Intelligence debe consumir este ledger ya normalizado y clasificado, no crearlo.

## Why This Task Exists

Hoy el módulo tiene bases reales pero sigue incompleto para una operación financiera enterprise:

- `CreateExpenseDrawer` ya soporta `supplier`, `payroll`, `social_security`, `tax`, `miscellaneous`, pero la entrada de nómina sigue siendo demasiado manual.
- `Finance > Expenses` registra `paymentMethod`, pero el catálogo actual mezcla método y rail/proveedor de pago.
- La arquitectura ya contempla `finance.expense.*` como señal hacia `client_economics`, `member_capacity_economics` y `operational_pl`, pero faltan carriles para varios egresos relevantes del mundo real.
- `operational_pl` hoy aplica la regla anti-doble-conteo de payroll, lo que confirma que el boundary correcto es:
  - Finance registra el gasto.
  - Cost Intelligence lo clasifica y lo atribuye.

Gaps concretos:

- La nómina aprobada/exportada no termina materializada de forma consistente como expense canónico.
- Previred / cargas sociales / remesas siguen necesitando definición operativa más clara en Finance.
- No existe taxonomía explícita para `bank_fee`, `gateway_fee`, `financial_cost`.
- No está separado `payment_method` de `payment_provider` / `payment_rail`.
- `bank_statement_rows` y reconciliación todavía no emiten un flujo claro hacia `expenses` para comisiones o cargos bancarios detectados.
- `TASK-182` rediseña el drawer y su taxonomía visible, pero no cierra el ledger reactivo ni la sinergia real con Payroll/Reconciliation/Cost.

## Goal

- Consolidar `greenhouse_finance.expenses` como ledger canónico de egresos operativos, fiscales, financieros y system-generated.
- Materializar gastos derivados desde Payroll y otros carriles operativos sin depender de ingreso manual.
- Separar claramente `payment_method` de `payment_provider` / `payment_rail`.
- Dejar a Cost Intelligence como consumer y motor de attribution, no como originador de gastos.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Reglas obligatorias:

- `Finance` sigue siendo owner del ledger `expenses`; `Cost Intelligence` solo consume y atribuye.
- No introducir doble conteo entre payroll derivado y `operational_pl`; preservar explícitamente la regla anti-doble-conteo existente.
- No mezclar esta lane con refactor masivo de reconciliación o con reescrituras generales del módulo; los slices deben ser graduales y verificables.
- No colapsar `payment_method` y `payment_provider` en un mismo campo nuevo; son dimensiones distintas.
- Si se automatiza nómina hacia expense, el origen debe quedar trazado por `payroll_entry_id`, `payroll_period_id`, `member_id` y `source_type`.
- Toda query nueva o migrada debe quedar aislada por `space_id`.

## Dependencies & Impact

### Depends on

- `TASK-174` — integridad de writes, idempotency y seguridad concurrente
- `TASK-175` — cobertura de tests del core Finance
- `TASK-179` — reconciliación Postgres-only cutover & hardening
- `TASK-182` — taxonomía y UX del drawer de egresos
- `greenhouse_finance.expenses`
- `greenhouse_payroll.payroll_entries`
- `greenhouse_payroll.payroll_periods`
- `greenhouse_finance.bank_statement_rows`

### Impacts to

- `TASK-182` — el drawer debe consumir la taxonomía y metadatos finales de esta lane
- `TASK-176` — fully-loaded cost model
- `TASK-177` — P&L por business unit
- `TASK-178` — budget vs actual
- `member_capacity_economics`
- `client_economics`
- `operational_pl`
- `Finance > Expenses`
- `Finance > Reconciliation`
- `HR > Payroll`

### Files owned

- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/meta/route.ts`
- `src/app/api/finance/expenses/payroll-candidates/route.ts`
- `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
- `src/lib/finance/shared.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/auto-allocation-rules.ts`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/sync/projections/*` aplicables a Finance/Cost
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Ya existe

- `expenses` es Postgres-first con fallback.
- El drawer ya soporta tipos `supplier`, `payroll`, `social_security`, `tax`, `miscellaneous`.
- Existe linkage `payroll_entry_id -> member_id`.
- Existen reglas de auto-allocation para `payroll` y `social_security`.
- `Finance` ya emite `finance.expense.created` y `finance.expense.updated`.
- `operational_pl` ya consume señales `finance.expense.*` y `payroll_*`.

### Gap actual

- `payroll` todavía depende de intervención manual en el drawer para parte del ciclo.
- No hay source type canónico para distinguir gasto manual de gasto derivado.
- El catálogo de métodos de pago no cubre bien tarjeta, gateways y rails online.
- No hay distinción explícita entre:
  - método de pago
  - proveedor/rail de pago
  - origen operativo del egreso
- No hay carril formal para comisiones bancarias / fees de adquirencia / costos financieros detectados desde conciliación.
- El sistema no deja aún una semántica clara de `expense_type` macro vs categoría analítica fina.

## Scope

### Slice 1 - Expense Ledger Model Hardening

- Introducir el modelo recomendado de clasificación:
  - `expense_type` macro
  - `source_type` / `origin`
  - `payment_method`
  - `payment_provider` / `payment_rail`
  - `space_id`
- Definir si se agregan columnas nuevas o si parte del modelo vive primero en payload/metadata controlada, pero no dejar tenant isolation delegado a metadata opaca.
- Ampliar catálogo base para cubrir al menos:
  - `bank_fee`
  - `gateway_fee`
  - `financial_cost`
  - `payroll_generated`
  - `bank_statement_detected`
  - `gateway_sync`

### Slice 2 - Payroll -> Expense Reactive Generation

- Diseñar y luego implementar el carril reactivo desde Payroll hacia Finance.
- Fijar `payroll_period.exported` como trigger principal del ledger.
- Mantener `approved` solo como señal operativa previa de readiness/candidates.
- Generar expenses system-generated con trazabilidad a:
  - `payroll_entry_id`
  - `payroll_period_id`
  - `member_id`
- Formalizar tratamiento de:
  - nómina neta
  - costo laboral
  - previred / cargas sociales
  - remesas/impuestos asociados si aplica
- Dejar reglas explícitas de anti-doble-conteo en `operational_pl`.

### Slice 3 - Bank Fees and Payment Rail Signals

- Definir cómo `bank_statement_rows` y reconciliación pueden sugerir o crear expenses de:
  - comisiones bancarias
  - cargos por transferencia
  - mantención
  - intereses
  - costos por gateway/adquirencia
- Evaluar si el primer slice es:
  - auto-create conservador, o
  - suggested classification con confirmación manual
- Formalizar el mapping entre fila bancaria / rail de pago y taxonomía de Finance.

### Slice 4 - Drawer and API Convergence

- Alinear `CreateExpenseDrawer` con el modelo expandido sin reabrir todo el rediseño UX de `TASK-182`.
- Cambiar metadata y validadores del POST de expenses para aceptar los nuevos ejes.
- Mantener compatibilidad transicional con los valores legacy cuando aún existan rows antiguas.

### Slice 5 - Cost Consumer Contract

- Documentar y endurecer el contrato downstream:
  - qué campos usa `member_capacity_economics`
  - qué campos usa `client_economics`
  - qué campos usa `operational_pl`
- Confirmar qué expenses deben entrar como:
  - direct labor
  - indirect labor
  - operational
  - infrastructure
  - tax/social
  - financial leakage

## Out of Scope

- Reescribir completo el módulo de reconciliación.
- Implementar en esta misma lane todas las integraciones reales con Stripe/Webpay/PayPal.
- Reemplazar `TASK-182`; esa task sigue siendo la lane de UX/taxonomía visible del drawer.
- Hacer un big bang de migración histórica de expenses legacy sin estrategia de compatibilidad.
- Resolver aquí todo el modelo presupuestario o de budget variance.

## Acceptance Criteria

- [ ] Existe una propuesta documentada y alineada de `expense_type` macro, `source_type`, `payment_method` y `payment_provider`.
- [ ] `greenhouse_finance.expenses` queda con tenant isolation trazable por `space_id` en writes y reads del slice tocado.
- [ ] Finance puede materializar expenses derivados desde Payroll con trazabilidad explícita.
- [ ] Existe carril definido para comisiones bancarias y fees de pago online, aunque el primer slice sea sugerido/manual asistido.
- [ ] `CreateExpenseDrawer` y `POST /api/finance/expenses` quedan alineados al nuevo contrato sin romper compatibilidad transicional.
- [ ] `operational_pl` y consumers relacionados preservan regla anti-doble-conteo para payroll.
- [ ] La relación entre esta task y `TASK-182`, `TASK-174`, `TASK-175`, `TASK-176`, `TASK-177`, `TASK-179` queda documentada y no ambigua.

## Verification

- `pnpm exec vitest run src/app/api/finance/expenses/*.test.ts src/lib/finance/*.test.ts`
- `pnpm exec eslint src/app/api/finance/expenses src/lib/finance src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- Validación manual en:
  - `/finance/expenses`
  - `/finance/reconciliation`
  - `/hr/payroll`

## Decision Recommendations

### 1. Payroll trigger

Recomendación:

- generar expenses reactivos al entrar el período en `payroll_period.exported`
- usar `approved` solo como estado operativo previo, visible para readiness/candidates pero no como disparador final del ledger

Justificación:

- `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1` ya documenta que el gasto final del período debe consolidarse al entrar en `exported`
- reduce riesgo de registrar costos definitivos sobre una nómina todavía revisable
- conversa mejor con cierre financiero y regla anti-doble-conteo ya vigente en Finance

### 2. Payroll modeling inside Finance

Recomendación:

- no modelar todo el período como un único expense
- crear un expense system-generated por `payroll_entry`
- mantener además carriles agregados separados para obligaciones consolidadas del período

Shape recomendado:

- `expense_type = payroll`
- `source_type = payroll_generated`
- trazabilidad obligatoria:
  - `payroll_entry_id`
  - `payroll_period_id`
  - `member_id`

Resultado esperado:

- granularidad suficiente para `member_capacity_economics`
- trazabilidad persona-first
- cierre contable compatible con el P&L y con el bridge Finance ↔ Payroll ya existente

### 3. Previred and social security

Recomendación:

- modelar `Previred` como un supplier único consolidado por período dentro de Finance
- crear un expense consolidado del período para cargas sociales/previsionales
- permitir breakdown interno posterior como metadata o tabla hija, pero no exigir múltiples expenses desde el primer slice

Shape recomendado:

- supplier: `Previred`
- `expense_type = social_security`
- `source_type = payroll_generated`
- un registro principal por período

Justificación:

- así ocurre el pago real
- Finance necesita registrar la obligación/pago consolidado
- evita artificialidad operativa al crear múltiples expenses para AFP/salud/AFC/mutual si todavía no agregan valor al runtime

### 4. Tax remittances

Recomendación:

- separar remesas/impuestos laborales o fiscales de `Previred` cuando el pago/obligación sea efectivamente distinto
- no mezclar todo bajo `social_security`

Shape recomendado:

- `expense_type = tax`
- `source_type = payroll_generated` o `system_adjustment` según origen

### 5. Bank fees

Recomendación:

- introducir `expense_type = bank_fee`
- no mandarlas a `miscellaneous`
- arrancar con clasificación sugerida desde reconciliación o bank statement, no con auto-create ciego

Subcategorías sugeridas:

- `transfer_fee`
- `account_maintenance`
- `interest`
- `penalty`
- `fx_spread`
- `card_processing_fee`

### 6. Gateway / online payment fees

Recomendación:

- introducir `expense_type = gateway_fee` separado de `bank_fee`
- usar este carril para Stripe, Webpay, PayPal, MercadoPago u otros adquirentes/gateways

Justificación:

- una comisión bancaria y una comisión de adquirencia no son el mismo fenómeno económico
- luego permite leer mejor leakage financiero, costo de cobro y costo de rails digitales

Primer rollout:

- manual o sugerido
- no depender de integración profunda con APIs externas en `P0`

### 7. Payment method vs payment provider

Recomendación:

- separar obligatoriamente `payment_method` de `payment_provider` / `payment_rail`
- no colapsarlos en un solo campo

Catálogo sugerido de `payment_method`:

- `bank_transfer`
- `credit_card`
- `debit_card`
- `cash`
- `check`
- `wallet`
- `online_gateway`
- `other`

Catálogo sugerido de `payment_provider` / `payment_rail`:

- `bank_portal`
- `webpay`
- `stripe`
- `paypal`
- `mercadopago`
- `wise`
- `khipu`
- `link`
- `other`

Justificación:

- `transferencia` y `Stripe` no viven en el mismo eje semántico
- la separación ayuda a reporting, reconciliación, fees y auditoría

### 8. Legacy payment method compatibility

Recomendación:

- mantener compatibilidad transicional con el catálogo actual
- mapear gradualmente los valores legacy al nuevo modelo

Mapeo inicial sugerido:

- `transfer` -> `payment_method = bank_transfer`
- `credit_card` -> `credit_card`
- `paypal` -> `payment_method = wallet|online_gateway` + `payment_provider = paypal`
- `wise` -> `payment_method = wallet|bank_transfer` + `payment_provider = wise`
- `check`, `cash`, `other` se preservan

### 9. Expense type strategy

Recomendación:

- ampliar `EXPENSE_TYPES`, no romperlos de golpe

Mantener:

- `supplier`
- `payroll`
- `social_security`
- `tax`
- `miscellaneous`

Agregar:

- `bank_fee`
- `gateway_fee`
- `financial_cost`

Y agregar explícitamente `source_type`:

- `manual`
- `payroll_generated`
- `bank_statement_detected`
- `reconciliation_suggested`
- `gateway_sync`
- `system_adjustment`

### 10. Boundary with Cost Intelligence

Recomendación:

- `Finance` sigue siendo owner de la existencia y semántica base del gasto
- `Cost Intelligence` sigue siendo owner de la atribución y lectura económica derivada

Finance decide:

- que el gasto existe
- cuánto vale
- de dónde vino
- cómo se pagó
- qué rail/proveedor/origen tuvo

Cost Intelligence decide:

- cómo se atribuye
- cómo cae en P&L
- si se interpreta como `direct_labor`, `indirect_labor`, `operational`, `infrastructure`, `tax_social` o leakage financiero

## Recommended P0

El `P0` recomendado de esta task debería cerrar:

- generación reactiva de `payroll` expenses al `exported`
- generación de `social_security` consolidado por período para `Previred`
- introducción de `bank_fee` y `gateway_fee`
- separación `payment_method` vs `payment_provider`
- introducción de `source_type`
- preservación explícita de la regla anti-doble-conteo en `operational_pl`
- compatibilidad transicional con rows y catálogos legacy

## Residual Open Questions

- ¿el `social_security` consolidado de `Previred` necesita breakdown persistido desde `P0` o basta metadata en el primer slice?
- ¿el primer rollout de fees bancarios debe crear suggestion rows en reconciliación o expenses draft directamente?
- ¿qué gateways ameritan catálogo explícito desde `P0` (`webpay`, `stripe`, `paypal`, `mercadopago`) y cuáles pueden entrar como `other` al inicio?

## Follow-ups

- Si esta task cristaliza el contrato canónico del ledger de expenses, `TASK-182` debe ajustarse para consumir ese contrato en vez de proponerlo por separado.
- `TASK-175` debería cubrir específicamente:
  - expenses system-generated
  - anti-doble-conteo payroll
  - payment rails / provider metadata
- `TASK-174` debe considerar idempotency para generadores reactivos de expenses, no solo para POST manuales.
