# TASK-707 — Previred Canonical Payment Runtime & Backfill

## Delta 2026-04-28 — Coordinación verificada con TASK-708 + TASK-708b

TASK-708 cerrada con coordinación explícita: los paths Previred ya validan `paymentAccountId` no-nulo en `materialize-payments-from-period.ts:155-162` (verifica existence de cuenta) y `anchored-payments.ts:35,152` (firma `paymentAccountId: string` no-nullable + `ensureAccount` validator). La invariante `payment_account_id NOT NULL after_cutover` (CHECK SQL) NO rompe Previred runtime.

Si emerge una cohorte histórica de Previred phantom payments, **el patrón canónico de remediación está listo**: copiar `docs/operations/runbooks/_template-external-signal-remediation.md` y adaptar. Helpers reusables: `dismissIncomePhantom`/`dismissExpensePhantom`, `cohort-backfill`, `historical-remediation`. Migración VALIDATE idempotente (Camino E) + cascade supersede atómico documentados.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseño — coordinación TASK-708 verificada (Previred no rompe invariante). Patrón remediación reusable disponible si emerge cohorte histórica.`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-707-previred-canonical-payment-runtime-and-backfill`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Implementar el carril canónico para que todo pago de `Previred` nuevo se registre automáticamente donde corresponde: el cash en la cuenta pagadora real, el costo como `social_security`, y el estado de desglose previsional explícito. La task también cubre el backfill histórico de rows mal clasificadas (`bank_fee` / `previred_unallocated`) con protección contra doble contabilización y rematerialización downstream controlada.

## Why This Task Exists

Hoy conviven dos contratos incompatibles para Previred:

1. **Contrato canónico deseado**
   - `createPreviredSettlement()` en `anchored-payments.ts`
   - `expense_payments` anclados al pago real
   - `expense_type = 'social_security'`
   - posibilidad de componentización por `payroll_entry_id` + `social_security_type`

2. **Contrato transicional / defectuoso en datos**
   - rows reconciliadas como `bank_fee`
   - `miscellaneous_category = 'previred_unallocated'`
   - `cost_category = 'overhead'`
   - sin `payroll_period_id`, `payroll_entry_id` ni `social_security_*`

Eso genera cuatro problemas:

- el costo entra mal clasificado;
- la UI de Banco queda semánticamente confundida;
- downstream (`client_economics`, `commercial_cost_attribution`, checks operativos) recibe señales ambiguas;
- cada nuevo pago Previred corre riesgo de repetir el patrón manual equivocado.

La solución robusta no es corregir marzo/abril una vez, sino crear un carril automático para pagos nuevos y un backfill seguro para los históricos ya contaminados.

## Goal

- todo pago Previred nuevo detectado en conciliación / bank-ledger entra automáticamente por un carril canónico;
- el cash sigue en la cuenta pagadora real y el costo queda en `social_security`;
- el sistema soporta dos estados explícitos:
  - `componentized`
  - `pending_componentization`
- el histórico mal clasificado puede migrarse sin duplicar costo ni romper projections downstream;
- el runtime impide que un pago identificado como Previred vuelva a persistirse como `bank_fee` genérico.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

Reglas obligatorias:

- el cash de Previred vive en la cuenta pagadora real (`payment_account_id` / `instrument_id`), no en `previred-clp`;
- `Previred` se trata como `payroll_processor` y rail/proveedor operacional, no como cuenta de caja;
- la source of truth sigue siendo el ledger canónico (`expenses`, `expense_payments`, `settlement_groups`, `settlement_legs`, payroll refs);
- el runtime debe preferir factories canónicas (`createPreviredSettlement()`) sobre rutas genéricas de bank fee;
- el backfill histórico debe evitar doble conteo antes de rematerializar downstream.

## Normative Docs

- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/tasks/to-do/TASK-705-banco-read-model-snapshot-cutover.md`
- `docs/tasks/to-do/TASK-706-previred-processor-ux-and-bank-semantics.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-183-finance-expenses-reactive-intake-cost-ledger.md`
- `docs/tasks/complete/TASK-697-payment-instrument-admin-workspace-enterprise.md`
- `docs/tasks/complete/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md`
- `src/lib/finance/payment-instruments/anchored-payments.ts`
- `src/lib/finance/payroll-expense-reactive.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/payment-ledger-remediation.ts`
- `scripts/finance/conciliate-march-april-2026.ts`

### Blocks / Impacts

- canonicalización automática de pagos Previred nuevos
- clasificación de costos previsionales en `expenses`
- downstream de:
  - `commercial_cost_attribution`
  - `client_economics`
  - checks operativos / data quality
- follow-up UI `TASK-706`

### Files owned

- `src/lib/finance/payment-instruments/anchored-payments.ts`
- `src/lib/finance/payroll-expense-reactive.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/payment-ledger-remediation.ts`
- `src/lib/sync/projections/commercial-cost-attribution.ts`
- `src/lib/sync/projections/client-economics.ts`
- `scripts/remediate-finance-payment-ledgers.ts`
- `migrations/`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Current Repo State

### Already exists

- factory canónica `createPreviredSettlement()` en `src/lib/finance/payment-instruments/anchored-payments.ts`
- intake reactivo de `social_security` consolidado desde `payroll_period.exported` en `src/lib/finance/payroll-expense-reactive.ts`
- ledger canónico de `expense_payments` y eventos outbox downstream
- scripts/herramientas de remediación de payment ledgers ya existentes
- señales reales en datos de rows Previred mal clasificadas (`bank_fee`, `previred_unallocated`)

### Gap

- no existe una detección automática que enrute pagos Previred nuevos a la factory canónica;
- el runtime no expresa todavía un estado explícito `pending_componentization`;
- el histórico existente de marzo/abril quedó mal clasificado como overhead;
- no hay cutover formal entre:
  - consolidado reactivo de payroll,
  - pago bancario reconciliado,
  - eventual breakdown por `payroll_entry_id`;
- falta una estrategia documentada para superseder / neutralizar el costo viejo antes de recomputar projections.

## Scope

### Slice 1 — Previred detection and routing

- identificar el punto canónico del runtime donde un pago reconciliado se clasifica como Previred;
- agregar heurísticas/gates explícitos para detectar pagos Previred por referencia, proveedor, rail o metadata operativa;
- enrutar pagos nuevos detectados a un carril Previred dedicado, no a la ruta genérica `bank_fee`.

### Slice 2 — Canonical unresolved state

- crear un estado canónico persistible para pagos Previred detectados pero aún no componentizados;
- registrar el pago como `social_security` y `previred` sin mentir sobre el desglose;
- guardar metadata suficiente para que UI y jobs downstream distingan:
  - `componentized`
  - `pending_componentization`

### Slice 3 — Componentization runtime

- definir cómo un pago Previred pasa de `pending_componentization` a `componentized` cuando existe contexto suficiente de payroll;
- reutilizar `createPreviredSettlement()` o factorizarla si hace falta soportar:
  - consolidado provisional
  - posterior split por `payroll_entry_id`
- asegurar idempotencia y trazabilidad del vínculo entre pago bancario, settlement y componentes.

### Slice 4 — Historical backfill

- detectar y migrar rows históricas `Previred` mal clasificadas (`bank_fee`, `previred_unallocated`);
- evitar doble conteo:
  - superseder, neutralizar o reconciliar el costo legacy antes de crear/actualizar el canónico
- proveer script/runbook de dry-run y apply controlado para staging/prod-like.

### Slice 5 — Downstream rematerialization and guards

- definir recomputación segura de `commercial_cost_attribution` y `client_economics` tras canonicalización/backfill;
- endurecer guardrails para que un pago identificado como Previred no vuelva a persistirse por la lane genérica equivocada;
- documentar degraded states y señales operativas.

## Out of Scope

- rediseño UI de Banco o Expenses como principal deliverable
- mover el cash desde la cuenta pagadora real a `previred-clp`
- crear una cuenta ledger artificial para Previred
- reabrir todo el modelo de payroll o reliquidación
- resolver desde esta task la latencia estructural de `/finance/bank` (eso vive en `TASK-705`)

## Detailed Spec

El diseño objetivo separa tres capas:

1. **Detection**
   - un pago reconciliado se reconoce como Previred
   - no cae por la lane de `bank_fee`

2. **Canonical payment state**
   - el pago queda en la cuenta pagadora real
   - el costo se registra como `social_security`
   - el sistema sabe si está:
     - `pending_componentization`
     - `componentized`

3. **Componentization**
   - cuando existe payroll context suficiente, el consolidado se descompone en componentes
   - cada componente puede quedar anclado a `payroll_entry_id`, `payroll_period_id`, `member_id`, `social_security_type`

Casos mínimos a cubrir:

- pago Previred nuevo detectado y aún sin desglose
- pago Previred nuevo detectado con desglose disponible
- migración de rows históricas marzo/abril 2026
- recomputación downstream sin doble costo

### Detection pseudocode

El detector objetivo debe usar múltiples señales y devolver una decisión explícita, no solo un `LIKE '%PREVIRED%'`.

```ts
type PreviredDetectionResult = {
  isPrevired: boolean
  confidence: 'high' | 'medium' | 'low'
  reasonCodes: string[]
  payrollPeriodId: string | null
  expectedAmountClp: number | null
  shouldAutoCanonicalize: boolean
  shouldMarkPendingComponentization: boolean
}

async function detectPreviredPayment(input: {
  bankDescription?: string | null
  paymentReference?: string | null
  paymentProvider?: string | null
  paymentRail?: string | null
  supplierName?: string | null
  paymentDate: string
  amountClp: number
  paymentAccountId: string | null
}): Promise<PreviredDetectionResult> {
  const reasonCodes: string[] = []

  const normalizedText = [
    input.bankDescription,
    input.paymentReference,
    input.paymentProvider,
    input.paymentRail,
    input.supplierName
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()

  const explicitProvider =
    input.paymentProvider === 'previred' ||
    input.paymentRail === 'previred'

  const textSuggestsPrevired =
    normalizedText.includes('PREVIRED')

  if (explicitProvider) reasonCodes.push('explicit_provider')
  if (textSuggestsPrevired) reasonCodes.push('bank_text_match')

  const payrollPeriodId = resolvePayrollPeriodFromPaymentDate(input.paymentDate)

  let expectedAmountClp: number | null = null
  let amountMatchesPayroll = false

  if (payrollPeriodId) {
    expectedAmountClp = await getExpectedPreviredTotalForPeriod(payrollPeriodId)

    if (expectedAmountClp && Math.abs(expectedAmountClp - input.amountClp) <= 1000) {
      amountMatchesPayroll = true
      reasonCodes.push('matches_payroll_total')
    }
  }

  const alreadyReconciled = payrollPeriodId
    ? await hasPreviredPaymentAlreadyRecorded(payrollPeriodId, input.amountClp)
    : false

  if (alreadyReconciled) {
    reasonCodes.push('possible_duplicate_period_payment')
  }

  const isPrevired = explicitProvider || textSuggestsPrevired
  const confidence =
    explicitProvider && amountMatchesPayroll && !alreadyReconciled
      ? 'high'
      : (textSuggestsPrevired && (amountMatchesPayroll || explicitProvider))
        ? 'medium'
        : isPrevired
          ? 'low'
          : 'low'

  return {
    isPrevired,
    confidence,
    reasonCodes,
    payrollPeriodId,
    expectedAmountClp,
    shouldAutoCanonicalize:
      isPrevired &&
      !alreadyReconciled &&
      (
        explicitProvider ||
        (textSuggestsPrevired && amountMatchesPayroll)
      ),
    shouldMarkPendingComponentization:
      isPrevired &&
      !alreadyReconciled &&
      !amountMatchesPayroll
  }
}
```

### Routing pseudocode

```ts
const detection = await detectPreviredPayment(payment)

if (detection.shouldAutoCanonicalize && detection.payrollPeriodId) {
  if (canBuildPreviredComponents(detection.payrollPeriodId)) {
    await createPreviredSettlement(...)
  } else {
    await createPreviredPendingCanonicalExpense(...)
  }
} else if (detection.shouldMarkPendingComponentization) {
  await createPreviredPendingCanonicalExpense(...)
} else {
  await continueGenericExpenseFlow(...)
}
```

### Detection rules

- `high`
  - autocanonicalizar directo por carril Previred
- `medium`
  - persistir como Previred canónico `pending_componentization`
- `low`
  - no autoclasificar todavía; dejar revisión/manual queue

Regla dura:

- si el texto bancario o provider ya sugiere `Previred`, **nunca** degradar silenciosamente a `bank_fee` / overhead genérico;
- si no hay breakdown suficiente, registrar como Previred canónico pendiente;
- si ya existe pago reconciliado para el mismo período, tratarlo como posible duplicado antes de crear costo nuevo.

### Helpers expected

- `resolvePayrollPeriodFromPaymentDate(date)`
- `getExpectedPreviredTotalForPeriod(periodId)`
- `hasPreviredPaymentAlreadyRecorded(periodId, amount)`
- `canBuildPreviredComponents(periodId)`
- `createPreviredPendingCanonicalExpense(input)`

## Acceptance Criteria

- [ ] existe un carril runtime explícito para que pagos Previred nuevos no se persistan como `bank_fee` genérico.
- [ ] el runtime puede persistir un pago Previred en estado `pending_componentization` sin perder el vínculo con la cuenta pagadora real.
- [ ] cuando existe contexto suficiente de payroll, el pago Previred puede pasar a `componentized` de forma idempotente.
- [ ] el backfill histórico de rows `previred_unallocated` evita doble contabilización antes de rematerializar downstream.
- [ ] `commercial_cost_attribution` y `client_economics` quedan recomputados sobre la semántica nueva sin drift obvio.
- [ ] existen guardrails para que la clasificación equivocada no reaparezca en pagos nuevos.
- [ ] la documentación funcional explica el nuevo contrato entre cash account, processor y estado de componentización.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm audit:finance:payment-ledgers`
- dry-run/apply controlado del script de backfill Previred `[verificar script name]`
- validación manual/staging sobre al menos un pago Previred nuevo y el histórico marzo/abril 2026

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/finance/conciliacion-bancaria.md` y `docs/documentation/finance/modulos-caja-cobros-pagos.md` quedaron actualizados con el contrato runtime final

## Follow-ups

- endurecer surfaces de observabilidad para distinguir `pending_componentization` como estado permitido pero visible
- consolidar readers/UI de `TASK-706` una vez el write path canónico esté activo

## Open Questions

- si el estado `pending_componentization` debe vivir en columnas nuevas del expense canónico, metadata JSON, o una tabla auxiliar explícita
- si la componentización debe ejecutarse inline en la conciliación cuando el contexto ya existe, o siempre vía worker reactivo
- nombre definitivo del script de backfill Previred y si conviene extender `payment-ledger-remediation` versus crear uno dedicado
