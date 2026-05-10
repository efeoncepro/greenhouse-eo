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

## Delta 2026-05-10 — Audit finance + payroll incorporada

Spec endurecida tras review combinada (skill `greenhouse-finance-accounting-operator` + `greenhouse-payroll-auditor`). Cambios contractuales aplicados:

1. `getExpectedPreviredTotalForPeriod` vive en `src/lib/payroll/`, suma solo cotizaciones legales canalizadas por Previred (AFP + Salud obligatoria + SIS + Cesantía empleador + Mutual). Excluye gratificación, IUSC, salud voluntaria sobre 7%, APV no-A y honorarios SII (esos van por F29).
2. Tolerancia de match canónica: `max(1000 CLP, expected × 0.0005)` (5 bps) en lugar de fixed $1000. Escala con tamaño de nómina.
3. `resolvePayrollPeriodFromPaymentDate` retorna `{periodId, daysSincePeriodCutoff, isLate}`. Pagos late (> día 13 mes M+1) degradan confidence un nivel y emiten outbox dedicado.
4. Coverage semantics: `isDuplicate` vs `isCompletion` separados. Permite pagos en lotes legítimos del mismo período (cotización obligatoria + APV en transferencias separadas).
5. "Abortar con error" reemplazado por **persistir como `social_security` + `pending_componentization` + outbox sin romper UX de conciliación**. Degradación honesta, no silenciosa.
6. 4 reliability signals canónicos en `RELIABILITY_REGISTRY` (subsystem `Finance Payroll Settlements`). Sustituyen la métrica ad-hoc `task707a.previredPendingComponentization`.
7. 2 outbox events declarados v1 con schema completo en `GREENHOUSE_EVENT_CATALOG_V1.md`. Contract estable para TASK-707c.
8. Capability granular `finance.previred.override_detection` (FINANCE_ADMIN + EFEONCE_ADMIN) + endpoint admin con `reason >= 10 chars` + audit log + outbox. Escape hatch para falsos positivos del detector.

Open Questions resueltas en línea:

- Q1 (`componentization_status` en `expenses` o también `expense_payments`): solo `expenses`. Coherente con TASK-768 `economic_category`.
- Q2 (owner `getExpectedPreviredTotalForPeriod`): payroll module. Importado por finance.

Cutover: el detector skipea si `paymentDate < TASK_707A_CUTOVER_DATE` para forzar 707b path en re-conciliaciones tardías de histórico.

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

- Detector explícito de pagos Previred (provider + rail + bankDescription + amount match contra payroll period esperado, con dimensión de lateness y coverage).
- Carril runtime nuevo: pagos Previred entran como `expense_type='social_security'` con `componentization_status='pending_componentization'` cuando no hay desglose o coverage incompleto, o `'componentized'` cuando ya hay anchor de payroll y coverage 100%.
- Cero mutación histórica. Detector skipea pagos con `paymentDate < TASK_707A_CUTOVER_DATE` (config env var) para forzar el path TASK-707b en re-conciliaciones tardías.
- Cero degradación silenciosa: si el detector dice "es Previred", nunca cae a `bank_fee` genérico. Si no hay match suficiente, persiste como `social_security pending_componentization` con outbox dedicado — NUNCA aborta el flow de conciliación.
- Coexistencia con TASK-706 (drawer ya consume `componentizationStatus` desde un derivador heurístico — esta task lo poblará desde columna SoT canónica con regla explícita de agregación cuando un grupo mezcle rows con SoT poblado y NULL legacy).
- Escape hatch operativo: capability granular `finance.previred.override_detection` permite a FINANCE_ADMIN/EFEONCE_ADMIN reclasificar un pago mal detectado (ej. boleta honorarios voluntaria a Previred que no es de payroll) con `reason >= 10 chars` + audit + outbox.

## Architecture Alignment

- Coordinación con TASK-708 ya verificada en TASK-707 (delta 2026-04-28): `payment_account_id NOT NULL` invariante respetada.
- TASK-706 (drawer processor_transit) ya consume `componentizationStatus` — esta task lo populará desde la nueva columna en lugar de la heurística `deriveComponentizationStatus`. Regla canónica de agregación a nivel grupo cuando hay mix SoT + NULL: el peor case gana (`pending_componentization` > `componentized`; rows con SoT NULL caen al fallback heurístico TASK-706).
- Coordinación TASK-768: el INSERT canónico con `expense_type='social_security'` dispara automáticamente el trigger `populate_expense_economic_category_default_trigger` y mapea a `economic_category='regulatory_payment'` ([migration 20260503104729619:39](../../../migrations/20260503104729619_task-768-populate-economic-category-default-trigger.sql#L39)). NUNCA override manual de `economic_category` sin razón documentada.
- Coordinación TASK-766: el helper canónico `recordExpensePayment` resuelve `payment_amount_clp` al insert via VIEW `expense_payments_normalized`. Pagos Previred CL son CLP nativos hoy (sin FX), pero el contrato queda preparado para reguladores internacionales futuros (ej. España SS, UK NI, Brasil INSS) cuando emerjan tenants Globe.
- Cero schema en `previred-clp` ledger (sigue sin saldo propio, sin legs).
- El cash sigue en cuenta pagadora real (`santander-clp` para Previred CL hoy).
- Detector y keyword `PREVIRED` son **CL-only** por diseño en V1. Cuando emerja un regulador equivalente para tenant internacional, extender vía tabla declarativa `known_regulators` (TASK-768) en lugar de hardcodear strings adicionales.

## Dependencies & Impact

### Depends on

- `src/lib/finance/payment-instruments/anchored-payments.ts` — `createPreviredSettlement` factory existente ([anchored-payments.ts:839](../../../src/lib/finance/payment-instruments/anchored-payments.ts#L839)).
- `src/lib/finance/payroll-expense-reactive.ts` — intake reactivo `payroll_period.exported` (ya emite `expense_type='social_security'` en línea 285).
- `src/lib/finance/expense-payment-ledger.ts` — entry point del runtime de pagos.
- `src/lib/finance/processor-digest.ts` (TASK-706) — `inferProcessorScope` reusable para detección + `deriveComponentizationStatus` heurística existente como fallback.
- `src/lib/payroll/chile-previsional-helpers.ts` — base para el helper nuevo `getExpectedPreviredTotalForPeriod`.
- `greenhouse_finance.expenses.expense_type` — ya soporta `'social_security'`.
- Trigger `populate_expense_economic_category_default_trigger` (TASK-768) — mapeo automático a `regulatory_payment`.

### Blocks / Impacts

- **Habilita TASK-707b** (backfill histórico) — no avanza hasta validar el carril 707a en producción ~1 semana.
- **Refina TASK-706** — el drawer dejará de heurísticamente derivar `componentizationStatus` y leerá la columna SoT canónica.
- Bloquea TASK-707c (componentization runtime) — necesita estado canónico vivo.

### Files owned (provisional)

- `src/lib/finance/payment-instruments/anchored-payments.ts` (extender `createPreviredSettlement` + nueva factory `createPreviredPendingCanonicalExpense`)
- `src/lib/finance/payment-instruments/previred-detector.ts` (NUEVO — detector + helpers + tests)
- `src/lib/finance/expense-payment-ledger.ts` (routing pre-bank_fee + cutover skip)
- `src/lib/finance/processor-digest.ts` (consumir nueva columna SoT con regla de agregación)
- `src/lib/payroll/previred-expected-total.ts` (NUEVO — owner del cálculo del total esperado)
- `src/lib/reliability/queries/previred-pending-overdue.ts` (NUEVO)
- `src/lib/reliability/queries/previred-detection-low-confidence.ts` (NUEVO)
- `src/lib/reliability/queries/previred-persisted-without-match.ts` (NUEVO)
- `src/lib/reliability/queries/previred-coverage-drift.ts` (NUEVO)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up de los 4 signals)
- `src/config/entitlements-catalog.ts` (capability `finance.previred.override_detection`)
- `src/app/api/admin/finance/expenses/[id]/previred-override/route.ts` (NUEVO endpoint admin)
- `migrations/` (columna `expenses.componentization_status` + index parcial + capability seed `capabilities_registry`)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (registrar 2 events v1)
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

### Slice 1 — Schema: componentization_status column + capability seed

- Migración aditiva en `greenhouse_finance.expenses`:
  - `componentization_status TEXT NULL` con CHECK `(componentization_status IS NULL OR componentization_status IN ('componentized', 'pending_componentization'))`.
  - NULL = non-Previred / non-applicable. Prevents backfill de la columna a un dominio no relevante.
- Index parcial `WHERE componentization_status = 'pending_componentization'` para queries de reliability + ledger-health.
- Seed de la capability `finance.previred.override_detection` en `capabilities_registry` (parity con TS via test runtime TASK-611).
- Bloque DO con RAISE EXCEPTION post-DDL para evitar el bug de pre-up-marker (ISSUE-068).
- Cero backfill — la columna nace NULL en histórico.

### Slice 2 — Detector helper canónico

`src/lib/finance/payment-instruments/previred-detector.ts`:

- `detectPreviredPayment(input)` retorna decisión enriquecida:

  ```ts
  type PreviredDetectionResult = {
    isPrevired: boolean
    confidence: 'high' | 'medium' | 'low'
    reasonCodes: string[]
    payrollPeriodId: string | null
    expectedAmountClp: number | null
    coverageBefore: number  // suma ya recorded antes de este pago
    coverageAfter: number   // suma incluyendo este pago
    isLatePayment: boolean
    daysSincePeriodCutoff: number | null
    isDuplicate: boolean    // coverageAfter > expected × 1.005
    isCompletion: boolean   // coverageBefore < expected AND coverageAfter <= expected × 1.005
    shouldAutoCanonicalize: boolean
    shouldMarkPendingComponentization: boolean
    shouldSkipCutover: boolean  // paymentDate < TASK_707A_CUTOVER_DATE
  }
  ```

- Reusa `inferProcessorScope` de `processor-digest.ts` para el matching keyword.
- Tolerancia canónica: `tolerance = max(1000, expectedAmountClp × 0.0005)` (5 bps). Documentar en spec + test que cubra empresas pequeñas (10p, ~$2M) y grandes (>100p, >$50M).
- Lateness: si `daysSincePeriodCutoff > 13` (post día 13 mes M+1), degradar confidence un nivel (high → medium, medium → low).
- Coverage semantics: `isDuplicate` solo si `coverageAfter > expected × 1.005` (50bps overshoot). `isCompletion` permite el INSERT y promueve a `componentized` cuando `coverageAfter` llega al 100%.
- Cutover: si `paymentDate < TASK_707A_CUTOVER_DATE` (env var), retornar `shouldSkipCutover=true` y dejar el routing seguir el path legacy (será migrado por TASK-707b).

Helpers nuevos:

- `resolvePayrollPeriodFromPaymentDate(date) → {periodId, daysSincePeriodCutoff, isLate}` — vive en payroll module o finance side, decisión final en discovery.
- `getExpectedPreviredTotalForPeriod(periodId)` — **vive en `src/lib/payroll/previred-expected-total.ts`** (owner: payroll module). Suma estricta: AFP + Salud obligatoria (Fonasa/Isapre 7%) + SIS + Cesantía empleador + Mutual. Excluye gratificación, IUSC, salud voluntaria sobre 7%, APV no-A, honorarios SII.
- `sumPreviredPaymentsForPeriod(periodId)` — coverage acumulado a la fecha. Lee VIEW canónica `expense_payments_normalized` (TASK-766) filtrando `expense_type='social_security'` + `payroll_period_id`.
- `hasPreviredPaymentAlreadyRecorded(periodId)` — boolean derivado de `sumPreviredPaymentsForPeriod >= expected × 0.995`. Reemplazado en favor del coverage-aware semantics arriba.

Tests unitarios:

- 4 escenarios confidence: `high` (provider explícito + amount match + no late), `medium` (texto match + amount match), `low` (texto match sin amount match), no-match.
- Coverage: pago único = expected → `componentized`; pago parcial → `pending_componentization`; pago que completa coverage → promueve a `componentized`; pago que excede coverage → `isDuplicate`.
- Lateness: pago día 13 → confidence intacta; pago día 25 → confidence degraded.
- Tolerancia escalada: empresa pequeña $2M expected, drift $500 → match; empresa grande $50M expected, drift $20K → match (5 bps); drift $30K → no match.
- Cutover: pago pre-cutover → `shouldSkipCutover=true`.

### Slice 3 — Routing en expense_payment_ledger (sin abortar UX)

En `expense-payment-ledger.ts`, antes del path genérico de `bank_fee`:

- Llamar `detectPreviredPayment`. Si `shouldSkipCutover` → fall through al path legacy (no toca histórico).
- Si `isPrevired && !shouldSkipCutover`:
  - `confidence='high'` + payroll context + coverage completo (incluyendo este pago) → `createPreviredSettlement` con `componentization_status='componentized'`.
  - `confidence='high' | 'medium'` sin payroll context, o coverage parcial → `createPreviredPendingCanonicalExpense` con `componentization_status='pending_componentization'` + outbox `finance.previred.canonical.persisted v1`.
  - `confidence='low'` → `createPreviredPendingCanonicalExpense` con `componentization_status='pending_componentization'` + outbox `finance.previred.detection.low_confidence v1` para review humano. **NO** abortar — el flow de conciliación sigue.
  - `isDuplicate=true` → outbox `finance.previred.duplicate_payment_detected v1` + persistir igualmente como `social_security pending_componentization` para que operador/manual queue resuelva (cancelación, multa, error de match). NUNCA crear sin trazabilidad.
  - `isLatePayment=true` (cualquier confidence) → además del flujo normal, emitir outbox `finance.previred.late_payment_detected v1` para que finance valide multas/intereses con SII.
- Hard rule (canónica): si `isPrevired=true && !shouldSkipCutover`, NUNCA persistir como `bank_fee`. La degradación es siempre `social_security pending_componentization` + outbox dedicado, NUNCA abortar la transacción ni romper UX de conciliación.

### Slice 4 — TASK-706 integration con regla de agregación canónica

- Refinar `processor-digest.ts` para que `componentizationStatus` lea la columna SoT cuando esté presente, fallback al derivador heurístico cuando NULL.
- **Regla de agregación a nivel grupo** (cuando un drawer agrupa N rows del mismo grupo Previred):
  1. Si TODAS las rows tienen `componentization_status` poblado y todas son `componentized` → grupo `componentized`.
  2. Si AL MENOS UNA row tiene `componentization_status='pending_componentization'` → grupo `pending_componentization` (peor case gana).
  3. Si TODAS las rows tienen `componentization_status=NULL` (histórico legacy) → fall back a `deriveComponentizationStatus` heurística TASK-706.
  4. Mix de SoT poblado + NULL → tratar el NULL como `pending_componentization` para conservadurismo (no asumir componentized en histórico no migrado).
- Agregar tests que validen los 4 casos de agregación + prioridad columna > heurística.

### Slice 5 — Reliability signals canónicos + outbox events v1

**4 reliability signals nuevos** bajo subsystem `Finance Payroll Settlements` (nuevo) o `Finance Data Quality` (existente, decisión final en discovery):

| Signal | Kind | Severity | Steady | Trigger |
| --- | --- | --- | --- | --- |
| `finance.previred.pending_componentization_overdue` | `drift` | `warning` si > 0 | 0-N legítimo (transitorio entre detección y componentization TASK-707c) | Rows con `componentization_status='pending_componentization'` AND `paymentDate > 30 días` sin promote a `componentized`. |
| `finance.previred.detection_low_confidence` | `data_quality` | `warning` si > 0 | 0 esperado | Outbox events `low_confidence` últimas 24h sin resolución humana (overrides via capability). |
| `finance.previred.persisted_without_match` | `drift` | `warning` si > 0 | 0-N transitorio | Rows medium-confidence sin `payrollPeriodId` resuelto últimas 7 días. |
| `finance.previred.coverage_drift` | `drift` | `error` si > 0 | 0 (post período cerrado) | Suma de `expense_payments` Previred por período cerrado ≠ expected total ± tolerancia 5 bps. Indica componentization parcial olvidada o expected mal calculado. |

Cada signal con reader propio en `src/lib/reliability/queries/` siguiendo el patrón TASK-720 (5 tests: ok / warning / SQL anti-regresión / degraded / pluralización).

**2 outbox events declarados v1** en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`:

```ts
// finance.previred.canonical.persisted v1
{
  schemaVersion: 1,
  expenseId: string,
  paymentId: string,
  paymentAccountId: string,
  componentizationStatus: 'pending_componentization' | 'componentized',
  confidence: 'high' | 'medium' | 'low',
  reasonCodes: string[],
  paymentDate: string,           // ISO date
  amountClp: number,
  payrollPeriodId: string | null,
  expectedAmountClp: number | null,
  coverageBefore: number,
  coverageAfter: number,
  isLatePayment: boolean,
  daysSincePeriodCutoff: number | null,
  detectedAt: string,            // ISO datetime
  actorContext: { source: 'reactive' | 'manual_reconciliation', actorUserId?: string }
}

// finance.previred.detection.low_confidence v1
{
  schemaVersion: 1,
  expenseId: string,
  paymentId: string,
  reasonCodes: string[],
  paymentDate: string,
  amountClp: number,
  bankDescription: string | null,
  paymentProvider: string | null,
  detectedAt: string
}
```

Eventos auxiliares (mismo schema base + campo `kind` discriminador): `duplicate_payment_detected`, `late_payment_detected`. Schema completo en spec del catalog.

### Slice 6 — Capability + admin override endpoint

- Agregar capability `finance.previred.override_detection` (module=`finance`, action=`update`, scope=`tenant`) en `src/config/entitlements-catalog.ts` + seed en `capabilities_registry` (Slice 1).
- Allowed sources: `FINANCE_ADMIN` + `EFEONCE_ADMIN`. NUNCA `route_group=finance` general (least privilege).
- Endpoint `POST /api/admin/finance/expenses/[id]/previred-override`:
  - Body: `{ override: 'force_previred' | 'force_non_previred', reason: string (>= 10 chars), targetComponentizationStatus?: 'pending_componentization' | 'componentized' }`.
  - Guard: `requireAdminTenantContext` + `can(subject, 'finance.previred.override_detection', 'update', 'tenant')`.
  - Atomic tx: UPDATE `expenses` (toggle `expense_type` + `componentization_status`) + INSERT audit log + outbox event `finance.previred.detection_overridden v1` con `previousState` + `newState` + `reason` + `actorUserId`.
  - Idempotente: re-llamar con mismo target state es no-op.
  - Errores sanitizados con `redactErrorForResponse` + `captureWithDomain('finance', ...)`.

### Slice 7 — Tests + integration smoke

- Tests unitarios del detector (Slice 2) + routing (Slice 3) + agregación drawer (Slice 4) + signals (Slice 5) + override (Slice 6).
- Test integración: simular `payroll_period.exported` → reactive intake → pago Previred reconciliado → `componentized` en una sola tx PG. Validar outbox event v1 emitido con schema correcto.
- Smoke E2E con Playwright + agent auth sobre staging: simular el flow del próximo pago Previred real (típicamente día 13 mes M+1).
- Test anti-regresión: pago Previred CL con `paymentDate < TASK_707A_CUTOVER_DATE` cae a path legacy (no toca histórico).

## Out of Scope

- Backfill de marzo/abril 2026 — vive en `TASK-707b`.
- Componentización efectiva de pagos `pending_componentization` a `componentized` con desglose por `payroll_entry_id` — vive en `TASK-707c`.
- Recomputación de `commercial_cost_attribution` / `client_economics` — solo aplica al backfill (707b).
- UI cambios — drawer ya consume el campo (TASK-706).
- Rediseño de payroll module / payroll engine.

## Acceptance Criteria

- [ ] Existe columna `expenses.componentization_status` con CHECK + index parcial + bloque DO post-DDL anti pre-up-marker.
- [ ] Capability `finance.previred.override_detection` seedeada en `capabilities_registry` con parity test runtime TS↔DB pasando.
- [ ] `getExpectedPreviredTotalForPeriod` vive en `src/lib/payroll/previred-expected-total.ts` y suma estricta solo cotizaciones legales canalizadas por Previred (AFP + Salud obligatoria + SIS + Cesantía empleador + Mutual). Tests cubren los excludes (gratificación, IUSC, salud voluntaria, APV no-A, honorarios SII).
- [ ] `detectPreviredPayment` retorna decisión enriquecida con `confidence`, `reasonCodes`, `coverageBefore/After`, `isLatePayment`, `isDuplicate`, `isCompletion`, `shouldSkipCutover`.
- [ ] Tolerancia de match es `max(1000, expected × 0.0005)` (5 bps), no fixed $1000. Tests cubren empresas pequeñas + grandes.
- [ ] `resolvePayrollPeriodFromPaymentDate` retorna `{periodId, daysSincePeriodCutoff, isLate}`. Pagos late degradan confidence un nivel + emiten outbox dedicado.
- [ ] Coverage semantics: `isDuplicate` vs `isCompletion` separados. Pagos en lotes legítimos del mismo período no se rechazan como duplicate.
- [ ] Pagos Previred **nuevos** entran por carril canónico (`createPreviredSettlement` o `createPreviredPendingCanonicalExpense`), NUNCA como `bank_fee`.
- [ ] "Caer a `bank_fee`" reemplazado por "persistir como `social_security pending_componentization` + outbox sin abortar". El flow de conciliación NUNCA se rompe por el detector.
- [ ] Detector skipea si `paymentDate < TASK_707A_CUTOVER_DATE` (env var). Test anti-regresión cubre el cutover.
- [ ] Trigger TASK-768 mapea automáticamente `expense_type='social_security'` → `economic_category='regulatory_payment'` sin override manual.
- [ ] El drawer TASK-706 lee `componentization_status` desde la columna SoT con regla de agregación canónica (peor case gana cuando hay mix SoT + NULL).
- [ ] Tests unitarios cubren detector (4 casos confidence + 4 casos coverage + 2 casos lateness + 2 casos tolerancia + 1 caso cutover) + routing + agregación drawer + 4 reliability signals + override endpoint.
- [ ] 4 reliability signals visibles en `/admin/operations` con steady state documentado (`finance.previred.{pending_componentization_overdue, detection_low_confidence, persisted_without_match, coverage_drift}`).
- [ ] 2 outbox events declarados v1 en `GREENHOUSE_EVENT_CATALOG_V1.md` con schema completo (`finance.previred.canonical.persisted v1` + `finance.previred.detection.low_confidence v1`).
- [ ] Endpoint `POST /api/admin/finance/expenses/[id]/previred-override` operativo con guard de capability + audit log + outbox `finance.previred.detection_overridden v1`. Idempotente.
- [ ] Cero mutación de filas históricas existentes (`componentization_status IS NULL` en histórico).
- [ ] Histórico (`componentization_status IS NULL`) sigue funcionando con derivador heurístico de TASK-706.
- [ ] Errores en endpoint admin sanitizados con `redactErrorForResponse` + `captureWithDomain('finance', ...)`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance/payment-instruments/previred-detector` (Slice 2)
- `pnpm test src/lib/payroll/previred-expected-total` (Slice 2)
- `pnpm test src/lib/finance/__tests__/processor-digest` (Slice 4 — agregación)
- `pnpm test src/lib/reliability/queries/previred-` (Slice 5 — 4 signals)
- `pnpm test src/lib/capabilities-registry/parity` (Slice 1 — capability nueva)
- `pnpm migrate:up` (Slice 1 — verificar bloque DO RAISE EXCEPTION pasa)
- `pnpm staging:request '/api/admin/reliability'` post-deploy → verificar los 4 signals nuevos con steady state esperado.
- Smoke E2E con agent auth + Playwright sobre staging:

  ```bash
  AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
  pnpm playwright test tests/e2e/smoke/finance-previred-detection.spec.ts --project=chromium
  ```

- Smoke manual sobre el siguiente pago Previred real (típicamente día 13 del mes siguiente al período payroll).
- Validar en `/finance/bank > Previred` que el drawer muestra el nuevo estado canónico desde la columna SoT, no el heurístico.
- Commit final con tag `[downstream-verified: previred-canonical-runtime]` en el mensaje (TASK-773 finance write-path E2E gate).

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] Archivo movido a `complete/`.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` registra el cutover (fecha exacta `TASK_707A_CUTOVER_DATE`) y la ventana de observación de 7+ días antes de habilitar TASK-707b.
- [ ] `changelog.md` registra el nuevo carril runtime + capability nueva + 4 reliability signals + 2 outbox events v1.
- [ ] TASK-707b queda con flag "ready to schedule" cuando 707a tenga 7+ días de operación limpia (los 4 signals en steady state esperado, cero pagos persistidos como `bank_fee` post-cutover).
- [ ] `docs/documentation/finance/modulos-caja-cobros-pagos.md` actualizado con el contrato runtime + decisión de routing.
- [ ] `docs/documentation/finance/conciliacion-bancaria.md` actualizado con la regla "el detector NUNCA aborta el flow + escape hatch admin".
- [ ] `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` actualizado con los 2 events v1 + 2 events auxiliares (duplicate, late).
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` actualizado con la sección "Previred runtime canónico" referenciando TASK-707a/b/c.
- [ ] CLAUDE.md actualizado con sección "Finance — Previred runtime canónico (TASK-707a)" si emergen reglas duras nuevas durante la implementación.

## Follow-ups

- TASK-707b: backfill histórico de filas `previred_unallocated` / `bank_fee` mal clasificadas (separado para minimizar riesgo).
- TASK-707c: componentization runtime cuando emerja el segundo pago Previred del lifecycle con desglose disponible.

## Open Questions (resueltas)

- ✅ **Q1 — Columna `componentization_status`**: solo en `greenhouse_finance.expenses`. El costo es lo componentizable; el `expense_payment` es solo cash. Coherente con TASK-768 (`economic_category` solo en `expenses`/`income`). `expense_payments` hereda via JOIN cuando un consumer downstream lo necesite.
- ✅ **Q2 — Owner de `getExpectedPreviredTotalForPeriod`**: vive en `src/lib/payroll/previred-expected-total.ts` (payroll module). Consume `payroll_entries.chile_*` columns + helpers de `chile-previsional-helpers.ts`. Finance lo importa, no lo recomputa. Tests unitarios viven con la suite payroll.
- ✅ **Q3 — Subsystem para los 4 reliability signals nuevos**: decisión final en discovery — opciones son `Finance Data Quality` (existente, ya rolls up `finance.expenses.economic_category_unresolved`, `finance.expense_payments.clp_drift`, etc.) o `Finance Payroll Settlements` (nuevo, dedicado al cruce finance↔payroll). Recomendación: empezar con `Finance Data Quality` para evitar fragmentación; promover a subsystem propio si emerge un segundo set de signals payroll-settlement (Deel/EOR, factoring de remuneraciones).
- ✅ **Q4 — Cutover date `TASK_707A_CUTOVER_DATE`**: definir en discovery contra el calendario operativo. Recomendación: `2026-05-13` (próximo día 13 hábil de pago Previred CL para período abril 2026, si la task se activa esa semana). Documentar en `Handoff.md` al activar la task.

## Open Questions

- Confirmar en discovery la fecha exacta del cutover y notificar a finance ops para que el primer pago Previred post-cutover sea observado en vivo.
- Confirmar si el endpoint admin `previred-override` necesita además un flow de "re-detect" (re-correr el detector sobre un row existente) o si la mutación directa via `force_previred` / `force_non_previred` es suficiente para los casos previstos.
