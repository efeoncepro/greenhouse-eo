# TASK-707a — Previred Detection & Canonical State Runtime (no backfill)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño — split de TASK-707 para minimizar riesgo en write-path`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-707a-previred-detection-and-canonical-state-runtime`
- Parent task: [`TASK-707`](TASK-707-previred-canonical-payment-runtime-and-backfill.md)

## Summary

Implementar el **carril runtime canónico** para que todo pago Previred **nuevo** se registre con `expense_type='social_security'`, ancla en la cuenta pagadora real y estado de componentización explícito. Esta task NO toca histórico — el backfill vive en `TASK-707b`. Esta task NO ejecuta componentización por `payroll_entry_id` — eso vive en `TASK-707c`.

El objetivo es validar el contrato canónico con datos nuevos durante ~1 semana antes de comprometerse al backfill, minimizando el riesgo de bug silencioso en P&L histórico.

## Why This Task Exists (split rationale)

`TASK-707` original junta 3 capas con perfiles de riesgo muy distintos:

1. **Detection + canonical state (write-path nuevo)** — riesgo medio, blast radius local.
2. **Backfill histórico de marzo/abril** — riesgo alto, muta filas consumidas por `commercial_cost_attribution`, `client_economics`, `client_labor_cost_allocation_consolidated`.
3. **Componentization runtime** — riesgo medio, requiere payroll context y solo aplica cuando aparezca el segundo pago Previred del lifecycle.

Tomar las 3 en una sesión es la receta para que un bug silencioso en (1) o (3) cambie el P&L histórico vía (2) sin que sea evidente. El split deja (1) ejecutándose y observable antes de habilitar (2).

## Goal

- Detector explícito de pagos Previred (provider + rail + bankDescription + amount match contra payroll period esperado).
- Carril runtime nuevo: pagos Previred entran como `expense_type='social_security'` con `componentization_status='pending_componentization'` cuando no hay desglose, o `'componentized'` cuando ya hay anchor de payroll.
- Cero mutación histórica.
- Cero degradación silenciosa: si el detector dice "es Previred", nunca cae a `bank_fee` genérico.
- Coexistencia con TASK-706 (drawer ya consume `componentizationStatus` desde un derivador heurístico — esta task lo poblará desde columna SoT canónica).

## Architecture Alignment

- Coordinación con TASK-708 ya verificada en TASK-707 (delta 2026-04-28): `payment_account_id NOT NULL` invariante respetada.
- TASK-706 (drawer processor_transit) ya consume `componentizationStatus` — esta task lo populará desde la nueva columna en lugar de la heurística `deriveComponentizationStatus`.
- Cero schema en `previred-clp` ledger (sigue sin saldo propio, sin legs).
- El cash sigue en cuenta pagadora real (`santander-clp` para Previred CL hoy).

## Dependencies & Impact

### Depends on

- `src/lib/finance/payment-instruments/anchored-payments.ts` — `createPreviredSettlement` factory existente.
- `src/lib/finance/payroll-expense-reactive.ts` — intake reactivo `payroll_period.exported`.
- `src/lib/finance/expense-payment-ledger.ts` — entry point del runtime de pagos.
- `src/lib/finance/processor-digest.ts` (TASK-706) — `inferProcessorScope` reusable para detección.
- `greenhouse_finance.expenses.expense_type` — ya soporta `'social_security'`.

### Blocks / Impacts

- **Habilita TASK-707b** (backfill histórico) — no avanza hasta validar el carril 707a en producción ~1 semana.
- **Refina TASK-706** — el drawer dejará de heurísticamente derivar `componentizationStatus` y leerá la columna SoT canónica.
- Bloquea TASK-707c (componentization runtime) — necesita estado canónico vivo.

### Files owned (provisional)

- `src/lib/finance/payment-instruments/anchored-payments.ts` (extender `createPreviredSettlement`)
- `src/lib/finance/expense-payment-ledger.ts` (detector + routing)
- `src/lib/finance/processor-digest.ts` (consumir nueva columna SoT)
- `migrations/` (columna `expenses.componentization_status`)
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Current Repo State

### Already exists

- Factory canónica `createPreviredSettlement()` (no enrutada automáticamente hoy).
- `payroll-expense-reactive.ts` consolida `social_security` desde `payroll_period.exported`.
- `processor-digest.ts` (TASK-706) ya identifica pagos Previred via keyword + expense_type matching.
- TASK-706 drawer consume `componentization_status` desde un derivador heurístico (`deriveComponentizationStatus`): si todos los rows tienen `payroll_period_id` Y `is_reconciled=true` → componentized; sino pending; sin rows → none.

### Gap

- No existe detector que enrute pagos nuevos a `createPreviredSettlement()`. Hoy caen como `bank_fee`/manual.
- No existe columna SoT para `componentization_status` — el estado es derivado, no persistido. Cuando TASK-707c emerja, `componentization_status` debe ser un campo explícito.
- El runtime no impide que un pago detectado como Previred persista como `bank_fee`.

## Scope

### Slice 1 — Schema: componentization_status column

- Migración aditiva en `greenhouse_finance.expenses`:
  - `componentization_status TEXT NULL` con CHECK `(componentization_status IS NULL OR componentization_status IN ('componentized', 'pending_componentization'))`.
  - NULL = non-Previred / non-applicable. Prevents backfill de la columna a un dominio no relevante.
- Index parcial `WHERE componentization_status = 'pending_componentization'` para queries de ledger-health.
- Cero backfill — la columna nace NULL en histórico.

### Slice 2 — Detector helper

- `src/lib/finance/payment-instruments/previred-detector.ts`:
  - `detectPreviredPayment(input)` con la firma del pseudocode en TASK-707.
  - Reusa `inferProcessorScope` de `processor-digest.ts` para el matching keyword.
  - Helpers nuevos: `resolvePayrollPeriodFromPaymentDate`, `getExpectedPreviredTotalForPeriod`, `hasPreviredPaymentAlreadyRecorded`.
  - Tests unitarios cubriendo `high` / `medium` / `low` confidence + duplicate detection.

### Slice 3 — Routing en expense_payment_ledger

- En `expense-payment-ledger.ts`, antes del path genérico de `bank_fee`:
  - Llamar `detectPreviredPayment`. Si `isPrevired`:
    - `high` confidence + payroll context → `createPreviredSettlement` con `componentization_status='componentized'`.
    - `high`/`medium` sin payroll context → factory nueva `createPreviredPendingCanonicalExpense` con `componentization_status='pending_componentization'`.
    - `low` → log + outbox event `finance.previred.detected.low_confidence`, NO mutación. Espera revisión humana / siguiente run.
- Hard rule: si `isPrevired=true` y `confidence != 'low'`, NUNCA caer a `bank_fee`. Si caería, abortar con error explícito.

### Slice 4 — TASK-706 integration

- Refinar `processor-digest.ts` para que `componentizationStatus` lea la columna SoT cuando esté presente, fallback al derivador heurístico cuando NULL.
- Agregar test que valida la prioridad columna > heurística.

### Slice 5 — Tests + observability

- Tests unitarios del detector + routing.
- Tests del integration smoke: pago Previred nuevo entra como social_security, no bank_fee.
- Outbox event `finance.previred.canonical.persisted` con `componentization_status` para downstream consumers.
- Métrica nueva en `ledger-health.ts`: `task707a.previredPendingComponentization` (count + sample). Steady state esperado: > 0 cuando hay pagos pendientes legítimos, 0 cuando todos están componentizados.

## Out of Scope

- Backfill de marzo/abril 2026 — vive en `TASK-707b`.
- Componentización efectiva de pagos `pending_componentization` a `componentized` con desglose por `payroll_entry_id` — vive en `TASK-707c`.
- Recomputación de `commercial_cost_attribution` / `client_economics` — solo aplica al backfill (707b).
- UI cambios — drawer ya consume el campo (TASK-706).
- Rediseño de payroll module / payroll engine.

## Acceptance Criteria

- [ ] Existe columna `expenses.componentization_status` con CHECK + index parcial.
- [ ] `detectPreviredPayment` retorna decisión explícita con confidence + reasonCodes.
- [ ] Pagos Previred **nuevos** entran por carril canónico (`createPreviredSettlement` o `createPreviredPendingCanonicalExpense`), NUNCA como `bank_fee`.
- [ ] El drawer TASK-706 lee `componentization_status` desde la columna SoT (con fallback heurístico para histórico NULL).
- [ ] Tests unitarios cubren detector (4 casos: high, medium, low, no-match) + routing.
- [ ] `ledger-health.task707a.previredPendingComponentization` métrica visible.
- [ ] Cero mutación de filas históricas existentes.
- [ ] Histórico (`componentization_status IS NULL`) sigue funcionando con derivador heurístico de TASK-706.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm migrate:up`
- Smoke manual sobre el siguiente pago Previred real (típicamente día 13 del mes siguiente al período payroll).
- Validar en `/finance/bank > Previred` que el drawer muestra el nuevo estado canónico, no el heurístico.

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] Archivo movido a `complete/`.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` registra el cutover y la ventana de observación antes de TASK-707b.
- [ ] `changelog.md` registra el nuevo carril runtime.
- [ ] TASK-707b queda con flag "ready to schedule" cuando 707a tenga 7+ días de operación limpia.
- [ ] `docs/documentation/finance/modulos-caja-cobros-pagos.md` actualizado con el contrato runtime.

## Follow-ups

- TASK-707b: backfill histórico de filas `previred_unallocated` / `bank_fee` mal clasificadas (separado para minimizar riesgo).
- TASK-707c: componentization runtime cuando emerja el segundo pago Previred del lifecycle con desglose disponible.

## Open Questions

- Confirmar en Discovery si la columna `componentization_status` debe existir solo en `expenses` o también en `expense_payments` (decisión ata cómo TASK-707c reutiliza la primitiva).
- Confirmar nombre y ownership del helper `getExpectedPreviredTotalForPeriod` — si es payroll module quien lo expone o si vive en finance side.
