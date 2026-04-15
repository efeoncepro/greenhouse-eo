# TASK-391 — Finance Factoring Operations: Registro y Visibilidad de Cesión de Facturas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño completo`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-391-finance-factoring-operations`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Efeonce opera con crédito a clientes (30 días) y habitualmente cede facturas a empresas de factoring (Xepelin) para recibir el advance el mismo día, pagando una comisión. El schema de `greenhouse_finance` ya modela esta operación completa (`factoring_operations`, `income_payments.payment_source = 'factoring_proceeds'`), pero no existe ningún endpoint ni UI para registrarla. Hoy no hay visibilidad de qué facturas fueron cedidas, cuánto se recibió realmente, ni cuánto costó el factoring en el P&L.

## Why This Task Exists

El gap es operativo y financiero a la vez: una factura cedida a Xepelin aparece como `pending` en Greenhouse (porque nunca se registró el cobro), el costo del factoring no existe como expense, y no hay forma de reconciliar el depósito de Xepelin contra la factura original. El modelo de datos está listo desde el diseño inicial — lo que falta es la superficie operativa completa.

## Goal

- Endpoint atómico que registre una operación de factoring en una sola transacción (factoring_operation + income_payment + expenses del fee)
- Income queda `paid` con `collection_method = 'factored'` inmediatamente al ceder, sin afectar la semántica de conciliación bancaria
- UI funcional en el detalle de factura (modal "Ceder a Factoring") y badges en los listados de income y cash-in

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md` — §Factoring model (líneas 197–241)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — patrón de migración

Reglas obligatorias:

- Toda la operación de factoring ocurre en una sola transacción vía `withTransaction` de `src/lib/db.ts` — si cualquier INSERT/UPDATE falla, rollback completo
- `income_payment.amount` = advance real (lo que deposita Xepelin) — para que la conciliación bancaria funcione
- `income.amount_paid` = nominal_amount (monto completo de la factura) — se setea explícitamente, NO se deriva de la suma de income_payments (la diferencia es el costo del factoring, no deuda del cliente)
- El endpoint NO puede usar `recordPayment()` de `payment-ledger.ts` — tiene guardia que rechaza pagos que excedan el balance y dejaría la factura en `partial`
- Dos expenses separados por fee: `expense_type = 'factoring_fee'` (interés variable) y `expense_type = 'factoring_advisory'` (asesoría fija) — misma `supplier_id` del proveedor de factoring
- Proveedores de factoring se identifican por `greenhouse_core.providers.provider_type = 'factoring'` — sin migración, campo ya existe

## Normative Docs

- `src/lib/finance/payment-ledger.ts` — NO usar `recordPayment()` para registrar el advance de factoring
- `src/lib/finance/postgres-store-slice2.ts` — patrón para queries de income con Postgres-first
- `src/lib/db.ts` — `withTransaction` para atomicidad
- `docs/architecture/schema-snapshot-baseline.sql` — definición completa de `factoring_operations` (líneas 1894–1912)

## Dependencies & Impact

### Depends on

- `greenhouse_finance.factoring_operations` — tabla existente, requiere migración para columnas nuevas
- `greenhouse_finance.income` — tabla existente, `collection_method` y `payment_status` se actualizan
- `greenhouse_finance.income_payments` — tabla existente, `payment_source = 'factoring_proceeds'` ya en constraint
- `greenhouse_finance.expenses` — tabla existente, `expense_type` es texto libre sin constraint
- `greenhouse_core.providers` — tabla existente, campo `provider_type` ya existe
- `greenhouse_serving.income_360` — vista existente, agrega `factoring_count` y `total_factoring_fee` — no requiere cambios

### Blocks / Impacts

- `TASK-future`: Dashboard de métricas de factoring en `/intelligence` (DSO real vs nominal, costo promedio, % revenue factorado, exposición por proveedor) — depende de que los datos de esta task estén bien poblados
- `TASK-future`: Flujo `status = 'settled'` cuando Xepelin confirma cobro al cliente — depende de `factoring_operations` correctamente creadas aquí
- Vista `cash-in` (`/finance/cash-in`) — el nuevo `income_payment` con `payment_source = 'factoring_proceeds'` aparece ahí automáticamente; el badge es una mejora visual sin cambio de API

### Files owned

- `migrations/TIMESTAMP_factoring-operations-fee-breakdown.sql`
- `src/app/api/finance/income/[id]/factor/route.ts` — nuevo endpoint
- `src/lib/finance/factoring.ts` — lógica de negocio (nuevo archivo)
- `src/app/(dashboard)/finance/income/[id]/page.tsx` — UI: botón + modal
- `src/app/(dashboard)/finance/income/page.tsx` — badge FACTORADA
- `src/app/(dashboard)/finance/cash-in/page.tsx` — badge VÍA FACTORING
- `src/types/db.d.ts` — regenerar con `pnpm db:generate-types` post-migración

## Current Repo State

### Already exists

- `greenhouse_finance.factoring_operations` — tabla completa con FKs, índices y constraint de status (`active | settled | defaulted`)
- `greenhouse_finance.income_payments.payment_source` — constraint ya incluye `'factoring_proceeds'`
- `greenhouse_finance.income.collection_method` — campo existente (`direct | factored | mixed`)
- `greenhouse_serving.income_360` — vista que ya agrega `factoring_count`, `total_factoring_fee`, `total_factoring_nominal`
- `greenhouse_core.providers.provider_type` — campo texto libre, listo para valor `'factoring'`
- `src/app/(dashboard)/finance/income/[id]/page.tsx` — página de detalle de factura donde va el botón
- `src/app/(dashboard)/finance/cash-in/page.tsx` — listado de cobros donde va el badge

### Gap

- `factoring_operations` no tiene: `interest_amount`, `advisory_fee_amount`, `external_reference`, `external_folio` — migración necesaria
- No existe `POST /api/finance/income/[id]/factor` — el directorio `income/[id]/` solo tiene `route.ts` (GET + PUT)
- No existe `src/lib/finance/factoring.ts` — la lógica transaccional de cesión no está implementada
- No hay UI de cesión en el detalle de factura (botón, modal, campos)
- No hay badge visual en listados que distinga facturas cedidas de cobros directos
- No hay validación que bloquee ceder una factura ya pagada o ya cedida al 100%

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migración de schema

- Migración SQL que agrega columnas a `factoring_operations`
- Regenerar `src/types/db.d.ts` con `pnpm db:generate-types`

### Slice 2 — Lógica de negocio + endpoint API

- `src/lib/finance/factoring.ts` con función `recordFactoringOperation()` — transacción atómica
- `src/app/api/finance/income/[id]/factor/route.ts` — `POST` handler con validación y auth
- `GET /api/finance/suppliers?providerType=factoring` o equivalente para alimentar el dropdown de proveedores

### Slice 3 — UI: modal de cesión en detalle de factura

- Botón "Ceder a Factoring" en `income/[id]/page.tsx` — visible solo si `payment_status != 'paid'` y `collection_method != 'factored'`
- Modal con campos: proveedor de factoring (dropdown filtrado por `provider_type = 'factoring'`), advance amount, interest amount, advisory fee amount, tasa mensual (auto-calculada como referencia), operation date, settlement date, external reference (Solicitud Nº), external folio, cuenta de destino del depósito
- Fee total calculado en tiempo real en el modal: `interest + advisory`
- Confirmación post-submit: toast + refetch del estado de la factura

### Slice 4 — Badges visuales en listados

- `income/page.tsx`: columna de estado muestra badge `FACTORADA` cuando `collection_method = 'factored'`
- `cash-in/page.tsx`: badge `VÍA FACTORING` cuando `payment_source = 'factoring_proceeds'`

## Out of Scope

- Flujo de reversión / `status = 'defaulted'` (Xepelin opera con recourse asumido por ellos — no es gap del MVP)
- Flujo de `status = 'settled'` (marcar cuando Xepelin confirmó cobro al cliente) — task futura
- Factoring parcial desde la UI (el schema lo soporta con `collection_method = 'mixed'`, pero el modal solo cubre cesión total por ahora)
- Factoring de múltiples facturas en una sola operación (bulk)
- Creación inline de proveedor de factoring desde el modal — deben pre-existir en Proveedores
- Dashboard de métricas de factoring en `/intelligence` — task futura
- Integración directa con API de Xepelin — registro manual por ahora

## Detailed Spec

### Migración SQL

```sql
ALTER TABLE greenhouse_finance.factoring_operations
  ADD COLUMN IF NOT EXISTS interest_amount     NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS advisory_fee_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS external_reference  TEXT,
  ADD COLUMN IF NOT EXISTS external_folio      TEXT;

COMMENT ON COLUMN greenhouse_finance.factoring_operations.interest_amount
  IS 'Componente de tasa (variable según plazo y monto). Ej: valor tasa Xepelin = $94.557';
COMMENT ON COLUMN greenhouse_finance.factoring_operations.advisory_fee_amount
  IS 'Componente de asesoría fija por operación. Ej: Asesoría Xepelin = $30.990';
COMMENT ON COLUMN greenhouse_finance.factoring_operations.external_reference
  IS 'Número de solicitud en sistema del proveedor de factoring. Ej: Solicitud Nº 371497 de Xepelin';
COMMENT ON COLUMN greenhouse_finance.factoring_operations.external_folio
  IS 'Folio interno del proveedor de factoring para esta operación. Ej: Folio 115 de Xepelin';
-- fee_amount sigue siendo la suma de ambos componentes — retrocompatible con income_360 view
```

### API: POST /api/finance/income/[id]/factor

**Request body:**
```json
{
  "factoringProviderId": "provider-xepelin-001",
  "nominalAmount": 6902000,
  "advanceAmount": 6776453,
  "interestAmount": 94557,
  "advisoryFeeAmount": 30990,
  "feeRate": 1.37,
  "operationDate": "2026-04-13",
  "settlementDate": "2026-05-13",
  "externalReference": "371497",
  "externalFolio": "115",
  "paymentAccountId": "account-xxx"
}
```

**Validaciones previas al inicio de la transacción:**
1. `income` existe y pertenece al tenant
2. `income.payment_status` no es `'paid'`
3. `income.collection_method` no es `'factored'`
4. `factoringProviderId` existe en `greenhouse_core.providers` con `provider_type = 'factoring'`
5. `advanceAmount < nominalAmount` (el advance siempre es menor al nominal)
6. `interestAmount + advisoryFeeAmount` = `nominalAmount - advanceAmount` (consistencia del fee)

**Transacción atómica (withTransaction):**

```
1. INSERT greenhouse_finance.factoring_operations
   - operation_id: uuid()
   - income_id, factoring_provider_id, nominal_amount, advance_amount
   - fee_amount: interestAmount + advisoryFeeAmount
   - interest_amount, advisory_fee_amount
   - fee_rate, operation_date, settlement_date
   - external_reference, external_folio
   - status: 'active'

2. INSERT greenhouse_finance.income_payments
   - payment_id: uuid()
   - income_id
   - payment_date: operationDate
   - amount: advanceAmount          ← efectivo real que llega al banco
   - currency: income.currency
   - payment_source: 'factoring_proceeds'
   - payment_account_id: paymentAccountId
   - reference: 'Factoring ' + externalReference
   - amount_clp: advanceAmount (si currency = CLP, sin conversión)

3. INSERT greenhouse_finance.expenses (interés)
   - expense_id: uuid()
   - expense_type: 'factoring_fee'
   - description: 'Interés factoring ' + externalReference + ' — ' + providerName
   - total_amount: interestAmount
   - supplier_id: factoringProviderId → FK a greenhouse_core.providers
   - income_id: incomeId (link al ingreso que originó el costo)
   - payment_status: 'paid'         ← Xepelin lo descuenta en origen, no hay pago separado

4. INSERT greenhouse_finance.expenses (asesoría)
   - expense_id: uuid()
   - expense_type: 'factoring_advisory'
   - description: 'Asesoría factoring ' + externalReference + ' — ' + providerName
   - total_amount: advisoryFeeAmount
   - supplier_id: factoringProviderId
   - income_id: incomeId
   - payment_status: 'paid'

5. UPDATE greenhouse_finance.income
   SET amount_paid = nominalAmount,      ← NO el advance — el nominal completo
       payment_status = 'paid',
       collection_method = 'factored',
       updated_at = CURRENT_TIMESTAMP
   WHERE income_id = $incomeId
```

**Response:**
```json
{
  "operationId": "fo-xxx",
  "incomeId": "inc-xxx",
  "nominalAmount": 6902000,
  "advanceAmount": 6776453,
  "feeTotal": 125547,
  "status": "active"
}
```

### Semántica de amount_paid vs income_payment.amount

Esta es la diferencia deliberada central del modelo:

| Campo | Valor | Significado |
|---|---|---|
| `income.amount_paid` | $6.902.000 | Obligación del cliente transferida en su totalidad → AR limpio |
| `income_payment.amount` | $6.776.453 | Efectivo real recibido → conciliable con el depósito bancario |
| `expenses.total_amount` (×2) | $125.547 | Costo del factoring → impacta P&L |

La diferencia ($125.547) no es deuda pendiente del cliente — es costo financiero de Efeonce.

### Proveedor de factoring: Xepelin

Registrar en `greenhouse_core.providers` antes de usar el endpoint:
```sql
INSERT INTO greenhouse_core.providers (provider_id, provider_name, legal_name, provider_type, country_code, status, active)
VALUES ('provider-xepelin-001', 'Xepelin', 'Xepelin SpA', 'factoring', 'CL', 'active', true);
```

El dropdown del modal filtra: `WHERE provider_type = 'factoring' AND active = true ORDER BY provider_name`.

### Detalle de campos del modal UI

| Campo | Tipo | Notas |
|---|---|---|
| Proveedor de factoring | Select | Filtra `provider_type = 'factoring'`. Si vacío, link a Proveedores |
| Monto nominal | Readonly | Pre-cargado de `income.total_amount` |
| Monto advance (transferido) | Número | Lo que Xepelin deposita |
| Interés (valor tasa) | Número | Componente variable |
| Asesoría | Número | Componente fijo |
| Fee total | Readonly calculado | = Interés + Asesoría |
| Tasa mensual (%) | Número | Referencia — `fee_rate` |
| Fecha de cesión | Date | Default: hoy |
| Fecha vencimiento Xepelin | Date | Cuando Xepelin cobra al pagador |
| Nº Solicitud | Texto | `external_reference` (371497) |
| Folio | Texto | `external_folio` (115) |
| Cuenta de destino | Select | Cuentas del tenant |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Ceder una factura crea `factoring_operation` + `income_payment` + 2 expenses en una transacción atómica — si falla cualquier paso, ningún registro persiste
- [ ] `income.payment_status = 'paid'`, `income.amount_paid = nominal_amount`, `income.collection_method = 'factored'` al completar la cesión
- [ ] `income_payment.amount = advance_amount` (no el nominal) — el depósito del banco puede conciliarse contra este registro
- [ ] `expenses`: uno con `expense_type = 'factoring_fee'` por el interés, otro con `expense_type = 'factoring_advisory'` por la asesoría — ambos con `payment_status = 'paid'`
- [ ] El endpoint retorna 409 si la factura ya está pagada o ya está factorada al 100%
- [ ] El endpoint retorna 409 si el proveedor no existe o no tiene `provider_type = 'factoring'`
- [ ] La factura muestra badge `FACTORADA` en el listado de income (`/finance/income`)
- [ ] El cobro muestra badge `VÍA FACTORING` en el listado de cash-in (`/finance/cash-in`)
- [ ] El botón "Ceder a Factoring" no aparece si la factura ya está `paid`
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` pasan sin errores

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm migrate:status` — confirmar migración aplicada
- `pnpm db:generate-types` — confirmar tipos regenerados
- Test manual: ceder factura de Sky Airline (Solicitud 371497, advance $6.776.453, interés $94.557, asesoría $30.990, external_reference "371497", external_folio "115") — verificar estado de factura + expenses creados + cash-in
- Verificar que la factura cedida aparece con badge en `/finance/income`
- Verificar que el cobro aparece en `/finance/cash-in` con badge VÍA FACTORING

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] Archivo en carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado sobre tasks de Finance y Intelligence
- [ ] `schema-snapshot-baseline.sql` actualizado con las nuevas columnas de `factoring_operations`
- [ ] Xepelin registrado en `greenhouse_core.providers` en staging y producción

## Follow-ups

- **TASK futura**: Dashboard de métricas de factoring en `/finance/intelligence` — DSO real vs nominal, costo promedio mensual, % revenue factorado vs directo, exposición por proveedor de factoring
- **TASK futura**: Flujo `status = 'settled'` — botón para marcar cuando Xepelin confirma que el pagador (ej. Sky Airline) pagó, cerrando el ciclo completo de la operación
- **TASK futura**: Factoring parcial desde UI (`collection_method = 'mixed'` — ceder un % del monto, no el 100%)

## Open Questions

_(Ninguna — todas las decisiones de diseño fueron resueltas antes de crear esta task)_
