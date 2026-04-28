# TASK-708 — Nubox Documents-Only SoT + Reconciliation Purity Cutover

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-708-nubox-documents-only-and-reconciliation-sot-cutover`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Separar de forma canónica la source of truth de documentos y la source of truth de caja: Nubox debe seguir alimentando `ventas` y `compras`, pero ya no debe crear ni mutar automáticamente `income_payments` / `expense_payments` como si fuera dueño del cash real. Greenhouse pasa a ser la source of truth de `cobros`, `pagos`, `settlement_groups`, `settlement_legs` y `conciliación bancaria`, con hardening de invariantes para impedir candidatos cross-account, legs reconciliables sin instrumento y contaminación del ledger por syncs externos.

## Why This Task Exists

Hoy el repo todavía mezcla dos contratos incompatibles:

1. **Contrato correcto**
   - Nubox como fuente de `sales` y `purchases`
   - Greenhouse como source of truth de cash (`income_payments`, `expense_payments`, `settlement_groups`, `settlement_legs`, `bank_statement_rows`, `reconciliation_periods`)
   - conciliación bancaria como proceso que enlaza banco real con pagos/cobros canónicos de Greenhouse

2. **Contrato transicional / defectuoso**
   - `src/lib/nubox/sync-nubox-to-postgres.ts` todavía registra `income_payments` y `expense_payments` desde `nubox_bank_movements`
   - esos pagos/cobros pueden quedar sin `payment_account_id`, o con resolución heurística frágil
   - conciliación luego intenta trabajar sobre esos rows ya contaminados
   - el resultado es que `Ventas`, `Compras`, `Cobros`, `Pagos` y `Banco` se pisan entre sí en vez de colaborar

La evidencia actual en datos confirma el problema:

- `income_payments.payment_source = 'nubox_bank_sync'`: `23` rows
- de esas `23`, `23` quedaron con `payment_account_id IS NULL`
- al menos `1` ya fue reconciliada
- existe al menos `1` `bank_statement_row` conciliada contra una `settlement_leg` con `instrument_id = NULL`

Eso significa que un sync documental externo está contaminando la capa de caja y, peor, que conciliación puede cerrar movimientos sobre objetos que ni siquiera saben en qué cuenta ocurrieron.

## Investigation Findings To Preserve

La task debe preservar explícitamente los hallazgos de la investigación sobre conciliación bancaria, porque no son ruido incidental: explican por qué el contrato actual no es confiable.

1. **Candidate resolver sin scope duro por cuenta**
   - `listReconciliationCandidatesFromPostgres(periodId)` carga el período con su `account_id`, pero luego llama al resolver por rango de fechas sin pasar esa cuenta.
   - En la práctica, conciliación puede sugerir candidatos de otra cuenta si monto/fecha/referencia calzan.
   - Referencias:
     - `src/lib/finance/postgres-reconciliation.ts:911`
     - `src/lib/finance/postgres-reconciliation.ts:919`
     - `src/lib/finance/postgres-reconciliation.ts:996`
     - `src/lib/finance/postgres-reconciliation.ts:1178`

2. **Validación de cierre de período demasiado laxa**
   - el route de conciliación pasa `true` hardcodeado a `validateReconciledTransitionFromPostgres(periodId, true)`;
   - eso hace que el check de `statement_imported` dependa solo de `statement_row_count`, no del estado persistido real del período.
   - Referencias:
     - `src/app/api/finance/reconciliation/[id]/route.ts:96`
     - `src/app/api/finance/reconciliation/[id]/route.ts:100`

3. **Settlement legs reconciliables con `instrument_id = NULL`**
   - el runtime actual permite construir la leg principal usando `paymentAccountId` aunque venga vacío;
   - ya se observó en datos una fila de cartola reconciliada contra una leg sin instrumento/cuenta real.
   - Referencias:
     - `src/lib/finance/settlement-orchestration.ts:292`
     - `src/lib/finance/settlement-orchestration.ts:345`

4. **Contaminación de caja desde Nubox bank sync**
   - Nubox sigue creando `income_payments` / `expense_payments` desde `nubox_bank_movements`;
   - eso salta el contrato sano `documento -> cash Greenhouse -> conciliación bancaria`.
   - Referencias:
     - `src/lib/nubox/sync-nubox-to-postgres.ts:680`
     - `src/lib/nubox/sync-nubox-to-postgres.ts:714`
     - `src/lib/nubox/sync-nubox-to-postgres.ts:751`
     - `src/lib/nubox/sync-nubox-to-postgres.ts:800`

## Goal

- Nubox queda restringido a source of truth de `ventas` y `compras`, no de caja.
- Greenhouse queda como source of truth de `cobros`, `pagos`, `settlement_groups`, `settlement_legs` y conciliación.
- Ningún payment/cobro nuevo entra al ledger reconciliable sin `payment_account_id` o `instrument_id`.
- El candidate resolver de conciliación queda estrictamente scopeado por cuenta.
- Los datos históricos contaminados por `nubox_bank_sync` pueden repararse o aislarse sin romper downstream.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

Reglas obligatorias:

- `ventas` / `compras` y `cobros` / `pagos` son planos distintos; un sync documental no puede adjudicarse ownership del cash real.
- la cuenta bancaria real es obligatoria para cualquier payment reconciliable (`payment_account_id` o `settlement_legs.instrument_id`).
- `reconciliation_periods` solo pueden operar sobre movimientos de su propia cuenta.
- los syncs externos ambiguos deben degradar a estado explícito (`pending_account_resolution`, `unscoped`, `needs_repair`) y no contaminar el pool normal de conciliación.
- `Banco` sigue siendo lector del ledger canónico de Greenhouse, no del estado transitorio de Nubox.

## Normative Docs

- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/tasks/complete/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md`
- `docs/tasks/to-do/TASK-705-banco-read-model-snapshot-cutover.md`
- `docs/tasks/to-do/TASK-707-previred-canonical-payment-runtime-and-backfill.md`

## Dependencies & Impact

### Depends on

- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/ledger-health.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`

### Blocks / Impacts

- pureza del ledger de `Cobros`
- pureza del ledger de `Pagos`
- confiabilidad de `Banco`
- clasificación y cierre de `Conciliación`
- downstream de `Ventas` y `Compras` cuando el sistema deduce estado pagado/cobrado
- follow-ups UI y read-model que hoy heredan datos contaminados

### Files owned

- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/ledger-health.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `scripts/finance/`
- `migrations/`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Current Repo State

### Already exists

- `Ventas` y `Compras` ya tienen ingest/sync con Nubox y llaves como `nubox_document_id`, `nubox_purchase_id`
- Greenhouse ya tiene ledgers propios para `income_payments`, `expense_payments`, `settlement_groups`, `settlement_legs`
- existe modelo de conciliación bancaria con `reconciliation_periods`, `bank_statement_rows`, matching y flags `is_reconciled`
- el repo ya reconoce el concepto de `phantom` en `docs/documentation/finance/conciliacion-bancaria.md`
- `ledger-health.ts` ya observa `payment_account_id IS NULL` como señal de salud

### Gap

- Nubox sigue registrando cash (`income_payments` y `expense_payments`) desde movimientos bancarios externos
- el candidate resolver de conciliación no está scopeado por cuenta
- existen `settlement_legs` reconciliables con `instrument_id = NULL`
- el cierre de período aún confía demasiado en parámetros del route handler
- no existe un carril explícito para pagos/cobros documentales detectados sin cuenta resuelta

## Scope

### Slice 1 — Nubox documents-only cutover

- redefinir `sync-nubox-to-postgres` para que Nubox sea owner de `sales` / `purchases`, no de `payments`
- impedir que nuevos `income_payments` / `expense_payments` desde Nubox entren por default al ledger canónico
- introducir un carril degraded/audit explícito para movimientos documentales detectados pero sin cuenta Greenhouse resuelta

### Slice 2 — Reconciliation matchability policy

- centralizar la política de qué objeto es reconciliable y bajo qué invariantes
- exigir `payment_account_id` o `instrument_id` presentes para que un payment/leg pueda candidatear
- distinguir:
  - `recorded`
  - `reconciliable`
  - `pending_account_resolution`
  - `needs_repair`

### Slice 3 — Candidate scoping by account

- rehacer el candidate resolver de conciliación para que opere solo dentro de `period.account_id`
- filtrar `income_payments` por `payment_account_id = account_id`
- filtrar `expense_payments` por `payment_account_id = account_id`
- filtrar `settlement_legs` por `instrument_id = account_id`

### Slice 4 — Settlement hardening

- prohibir `receipt` / `payout` legs principales con `instrument_id = NULL`
- separar staging no reconciliable de settlement canónico cuando el upstream aún no conoce la cuenta
- bloquear matches manuales/automáticos contra legs fuera de scope o sin instrumento

### Slice 5 — Historical remediation

- detectar `income_payments` / `expense_payments` creados por `nubox_bank_sync`
- clasificar cuáles pueden:
  - repararse con una cuenta inferible confiable
  - supersederse
  - aislarse como `needs_repair`
- corregir rows ya reconciliadas contra legs nulas o fuera de scope

### Slice 6 — Lifecycle and observability

- arreglar `validateReconciledTransitionFromPostgres()` para que lea estado persistido real
- agregar health checks y señales operativas para:
  - payments sin cuenta
  - settlement legs sin instrumento
  - matched rows cross-account o con leg nula
  - pagos derivados de Nubox aún no resueltos

## Out of Scope

- rediseño visual grande de `Banco`, `Cobros`, `Pagos` o `Conciliación`
- reabrir toda la taxonomía comercial de `Ventas` / `Compras`
- resolver la latencia estructural de `/finance/bank` (vive en `TASK-705`)
- rediseñar Previred completo (vive en `TASK-706` / `TASK-707`)
- cambiar Nubox como fuente de documentos tributarios; aquí se corta solo su ownership sobre cash

## Detailed Spec

El principio rector de esta task es:

> `Nubox` puede decirnos que una venta o compra existe; no puede adjudicarse que el dinero ya entró o salió de una cuenta Greenhouse sin que Greenhouse tenga un anchor de caja real.

### Target contract

- `Sales` y `Purchases`
  - SoT: `Nubox`
  - función: documento, metadata tributaria, estado contable base

- `Income Payments` y `Expense Payments`
  - SoT: `Greenhouse`
  - función: cash real, cuenta real, settlement real, reconciliación real

- `Settlement Groups` / `Settlement Legs`
  - SoT: `Greenhouse`
  - función: operaciones multi-leg y relación con cuentas/instrumentos

- `Bank Reconciliation`
  - SoT: `Greenhouse`
  - función: enlazar cartola bancaria con movimientos canónicos ya formados

### Design consequences

1. Un `nubox_bank_movement` puede seguir siendo una señal útil, pero no debe crear automáticamente cash canónico cuando no conocemos la cuenta real.
2. La UI puede seguir mostrando hints de “documento marcado como pagado/cobrado en Nubox”, pero eso no debe equivaler a `is_reconciled`, `paid`, `settled` ni alimentar `Banco`.
3. El sistema necesita un estado intermedio explícito para “documento pagado/cobrado según Nubox, pero cash Greenhouse aún no resuelto”.
4. Los phantoms existentes dejan de ser una rareza documental y pasan a tratarse como deuda histórica de SoT.

### Implementation guidance

- `sync-nubox-to-postgres.ts` debe dejar de llamar la lane canónica de `recordPayment()` / inserts `expense_payments` por default cuando la fuente sea un bank movement Nubox.
- Si se conserva ingest de movimientos Nubox para apoyo operativo, debe persistir como staging/audit/hint, no como payment reconciliable.
- `postgres-reconciliation.ts` necesita una `matchability policy` central y reusable, en vez de reglas repartidas entre SQL y routes.
- `settlement-orchestration.ts` debe convertir `instrument_id` en requisito para cualquier leg principal reconciliable.
- `account-balances.ts` y `ledger-health.ts` deben tratar las señales Nubox ambiguas como degraded state explícito, no como cash silencioso.

### Canonical state map

La task debe documentar y respetar este flujo de estados. El principio es simple:

- `Nubox` origina o actualiza el **documento**
- `Greenhouse` registra el **cash**
- `Banco` prueba el **cash real**
- `Conciliación` enlaza **cartola** con **cash Greenhouse**
- el **documento hereda estado** desde el cash, no desde Nubox

#### Venta / cobro

```text
Nubox sale
  -> Greenhouse income
  -> status documental: issued / pending / overdue
  -> espera cash real

Cash real detectado en Greenhouse
  -> income_payment
  -> opcional settlement_group + settlement_legs
  -> income.amount_paid y income.payment_status derivan desde SUM(income_payments)

Cartola bancaria
  -> bank_statement_row
  -> conciliación contra income_payment o settlement_leg
  -> income_payment.is_reconciled = true
  -> settlement_leg.is_reconciled = true

Resultado final
  -> income puede quedar partial / paid
  -> reconciled expresa prueba bancaria del cash
```

#### Compra / pago

```text
Nubox purchase
  -> Greenhouse expense
  -> status documental: registered / pending / due
  -> espera cash real

Cash real detectado en Greenhouse
  -> expense_payment
  -> opcional settlement_group + settlement_legs
  -> expense.amount_paid y expense.payment_status derivan desde SUM(expense_payments)

Cartola bancaria
  -> bank_statement_row
  -> conciliación contra expense_payment o settlement_leg
  -> expense_payment.is_reconciled = true
  -> settlement_leg.is_reconciled = true

Resultado final
  -> expense puede quedar partial / paid
  -> reconciled expresa prueba bancaria del egreso
```

#### Estados intermedios obligatorios

Para evitar que un documento “pagado según Nubox” contamine caja antes de tiempo, el diseño objetivo necesita estados intermedios explícitos:

- `document_paid_in_source`
  - Nubox dice que el documento fue pagado/cobrado
  - Greenhouse todavía no tiene cash canónico

- `pending_cash_resolution`
  - existe señal operativa de pago/cobro, pero aún no hay `payment_account_id` o settlement válido

- `cash_recorded`
  - Greenhouse ya creó `income_payment` o `expense_payment`

- `cash_reconciled`
  - el payment/settlement ya quedó enlazado a una fila real de cartola

Regla dura:

- `document_paid_in_source` **no** debe mutar por sí solo `income.payment_status = paid` ni `expense.payment_status = paid`
- el estado `paid` del documento debe venir de `amount_paid` derivado desde payments canónicos Greenhouse
- la capa `Banco` solo consume `cash_recorded` / `cash_reconciled`, nunca hints documentales de Nubox

#### Special flows

- **Factoring**
  - el documento puede quedar `paid` aunque el cash recibido sea menor al nominal
  - el `income_payment` registra solo el advance real
  - la diferencia vive como fee/costo financiero

- **Previred / mixed settlements**
  - el documento/gasto puede tener múltiples componentes
  - el cash sale de la cuenta pagadora real
  - la conciliación enlaza la salida bancaria con el settlement/payment canónico, no con un hint externo

- **Manual / imported bank_statement payments**
  - pueden crear cash canónico directamente en Greenhouse
  - luego actualizan el documento por derivación normal

#### What the repo already supports

- write path canónico de cobros en `recordPayment()`
- write path canónico de pagos en `recordExpensePayment()`
- derivación de `amount_paid` y `payment_status` desde las tablas payment ledger
- factoring como ejemplo de documento + cash + diferencia económica desacoplados
- `balance_nubox` / divergences como señal separada del cash real

#### What this task must complete

- impedir que el carril Nubox salte directo de `document_paid_in_source` a `cash_recorded`
- formalizar dónde vive cada estado y cómo se expone
- asegurar que `Ventas` / `Compras` lean estado documental derivado correctamente
- asegurar que `Cobros` / `Pagos` / `Banco` solo lean cash Greenhouse canónico
- asegurar que `Conciliación` solo actúe sobre objetos en estado `cash_recorded`

### Minimum data repair targets

- `income_payments.payment_source = 'nubox_bank_sync'`
- `payment_account_id IS NULL`
- `is_reconciled = TRUE` con `settlement_leg.instrument_id IS NULL`
- matches en `bank_statement_rows` cuya contraparte no comparte `account_id`

## Acceptance Criteria

- [ ] Nubox ya no crea por defecto `income_payments` / `expense_payments` reconciliables sin cuenta Greenhouse resuelta
- [ ] ningún candidate resolver de conciliación devuelve rows fuera de `period.account_id`
- [ ] el runtime impide `receipt` / `payout settlement_legs` principales con `instrument_id = NULL`
- [ ] los pagos/cobros ambiguos provenientes de Nubox quedan en un estado explícito no contaminante
- [ ] existe estrategia documentada y ejecutable para remediar el histórico `nubox_bank_sync`
- [ ] health checks y observabilidad distinguen contaminación histórica vs runtime nuevo ya protegido

## Verification

- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual / API sobre `/api/finance/reconciliation/*`, `/api/finance/bank*`, `Cobros` y `Pagos`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se dejó runbook de remediación histórica con dry-run y apply explícito

## Follow-ups

- posible task específica para UI/semántica visible de “pagado según documento” vs “pagado en caja Greenhouse”
- posible task de modelado staging para movimientos Nubox ambiguos si no existe tabla/lane adecuada
- coordinación con `TASK-705` para que Banco lea solo cash canónico ya limpio

## Open Questions

- conviene modelar los hints de Nubox como tabla staging propia o como flags/metadata sobre `income` y `expenses`
- qué política exacta debe seguir el producto cuando Nubox dice “pagado” pero Greenhouse aún no encuentra el bank movement real
- si ciertos casos de Nubox pueden auto-resolverse con suficiente confianza sin violar el principio de SoT de Greenhouse
