# TASK-978 — Contractor Payment Due-Date Rule (cierre + N días) + SLA Signal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|hr`
- Blocked by: `none`
- Branch: `task/TASK-978-contractor-payment-due-date-sla`
- Legacy ID: `none`

## Summary

Computa automáticamente la **fecha de pago comprometida** del contractor payable como **cierre del período + N días hábiles** (compromiso Efeonce: pagar a colaboradores y contractors dentro de los primeros 5 días posteriores al cierre de mes), usando el calendario operativo canónico, y emite un **reliability signal de SLA** cuando un payable/obligación de contractor está vencido contra ese compromiso. Hoy el `due_date` es input manual (default vacío) y no existe ninguna métrica del compromiso de los 5 días.

## Why This Task Exists

Revisión exhaustiva 2026-05-31 (sin inferencias): no existe **ninguna** lógica de calendario de pago para contractors. Verificado:

- Grep exhaustivo (`first 5 days`, `cierre.*5`, `month_close`, `payout_due`, etc.) en `contractor-engagements/`, `payment-obligations/`, `payment-orders/`, `calendar/` → **vacío**.
- `ContractorPayable.due_date` se setea por `body.dueDate ?? null` en `POST /api/finance/contractor-payables` → **input manual, default vacío**, sin relación con el cierre del período.

Consecuencia: el compromiso de los 5 días hoy es 100% manual/operativo; el sistema no lo deriva ni lo mide. Sin esto, no hay forma de saber si Finanzas está cumpliendo el SLA de pago.

## Goal

- `due_date` del contractor payable derivado del cierre del período + N días hábiles (configurable, default 5) vía el calendario operativo canónico.
- Reliability signal de SLA: payables/obligaciones de contractor vencidas vs el compromiso. Steady=0.
- El `due_date` manual sigue permitido como override explícito (no se rompe el input actual).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Mandatory Skills (OBLIGATORIO — no negociable)

1. **`greenhouse-finance-accounting-operator`** — semántica de due_date, obligaciones, SLA de pago, reconciliación.
2. **`greenhouse-payroll-auditor`** — el cierre del período + calendario operativo es terreno compartido con nómina; validar que se reusa el calendario canónico (no helpers locales).
3. **`arch-architect`** (4-pillar) — diseño del signal + la derivación de due_date (reversibilidad, blast radius).

Si emerge superficie visible (mostrar el due_date/SLA en la UI), coordinar con TASK-974 e invocar las **skills de product design**.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (Delta 2026-05-31 "Monthly payment convergence target")
- `CLAUDE.md` → "Payroll Operational Calendar" (calendario canónico `src/lib/calendar/operational-calendar.ts`; NO usar helpers locales de vista para decidir ventana de cierre o mes vigente)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- **NUNCA** computar la ventana de cierre / días hábiles con helpers locales. Usar el calendario operativo canónico (`src/lib/calendar/operational-calendar.ts` + feriados `nager-date-holidays.ts`), timezone `America/Santiago`.
- **NUNCA** sobreescribir un `due_date` provisto manualmente por el operador (override explícito gana). La derivación aplica cuando el due_date no fue provisto.
- **NUNCA** bloquear la creación del payable por due_date (es informativo + SLA, no un readiness gate). El SLA es un signal, no un blocker.
- **NUNCA** invocar `Sentry.captureException` directo; usar `captureWithDomain(err, 'finance', ...)`.

## Dependencies & Impact

### Depends on

- Calendario operativo canónico (`src/lib/calendar/operational-calendar.ts`).
- `ContractorPayable` (`due_date` ya existe) + `createContractorPayableFromSubmission`/`OffCycle`.
- Reliability Control Plane (`get-reliability-overview.ts`).
- (Idealmente coordinado con TASK-977 para que el SLA mida pagos reales; pero el due_date + signal son independientes y pueden shippear antes).

### Blocks / Impacts

- Da visibilidad del compromiso de los 5 días (hoy invisible).
- Alimenta a TASK-979 (corrida mensual usa el due_date para priorizar).

### Files owned

- `src/lib/contractor-engagements/payables/due-date.ts` (helper canónico de derivación)
- `src/lib/contractor-engagements/payables/store.ts` (aplicar la derivación al crear, si no hay due_date manual)
- `src/lib/reliability/queries/contractor-payable-payment-sla-overdue.ts` (signal nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up)
- Posible config: `CONTRACTOR_PAYMENT_SLA_BUSINESS_DAYS` (default 5)

## Current Repo State

### Already exists

- Calendario operativo canónico con feriados + timezone.
- `ContractorPayable.due_date` (columna) + input manual.

### Gap

- Ninguna derivación automática; ningún signal de SLA; el compromiso de 5 días es invisible al sistema.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Derivación canónica del due_date

- Helper puro `resolveContractorPaymentDueDate({ periodCloseDate | servicePeriodEnd, businessDays })` usando el calendario operativo (días hábiles, feriados, timezone Santiago).
- Aplicarlo en `createContractorPayableFromSubmission`/`OffCycle` cuando `dueDate` no fue provisto; preservar el override manual.

### Slice 2 — SLA signal

- Signal `finance.contractor_payable.payment_sla_overdue` (kind=lag, moduleKey finance): payables/obligaciones de contractor no pagadas con `due_date < hoy` (o sin due_date pasada la ventana). Severidad por antigüedad. Steady=0.
- Wire-up + tests + smoke live.

### Slice 3 — Cierre

- Docs (arch Delta + funcional update). CLAUDE.md invariant si aplica.

## Out of Scope

- Settlement al banco → TASK-977.
- Corrida mensual / batch → TASK-979.
- UI del due_date/SLA → TASK-974 (esta task expone el dato; la pantalla lo muestra).

## Detailed Spec

**Derivación**: `due_date = N-ésimo día hábil posterior al cierre del período` (default N=5). El "cierre del período" para un contractor se ancla al `service_period_end` del payable o al cierre del mes operativo vigente — decidir en Plan Mode (finance skill) cuál es el ancla canónica. Reusar `operational-calendar.ts` para contar días hábiles (excluye fines de semana + feriados Nager + overrides).

**SLA**: el signal mide el compromiso de los 5 días. No es un readiness gate (no bloquea el pago); es observabilidad para que Finanzas sepa si está cumpliendo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (due_date) → Slice 2 (signal) → Slice 3 (cierre). El signal depende de que el due_date exista.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Derivar due_date con calendario equivocado | finance | low | Reusar `operational-calendar.ts` canónico; tests con feriados | n/a |
| Sobrescribir un due_date manual | finance | low | Solo derivar cuando dueDate ausente | n/a |
| Falsos positivos de SLA antes de TASK-977 | finance | medium | Documentar que el SLA mide el compromiso aunque el settlement siga manual; severidad informativa hasta TASK-977 ON | el propio signal |

### Feature flags / cutover

Sin flag para la derivación (additive, no rompe input manual). El signal es read-only. Cutover inmediato.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-3 | revert PR (additive; due_date sigue aceptando manual) | <10 min | sí |

### Production verification sequence

1. Deploy staging + crear payable sin due_date → verify due_date derivado = cierre + 5 hábiles.
2. Crear payable con due_date manual → verify se respeta el manual.
3. Verify el signal SLA en `/admin/operations`.
4. Repetir en prod.

### Out-of-band coordination required

Confirmar con HR/Finanzas el ancla del cierre + el N de días (default 5) antes de shippear.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El due_date del payable se deriva de cierre + N días hábiles (calendario canónico) cuando no es provisto manualmente.
- [ ] El override manual de due_date se respeta.
- [ ] Signal `finance.contractor_payable.payment_sla_overdue` operativo; steady=0.
- [ ] No bloquea la creación del payable (no es readiness gate).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm vitest run src/lib/contractor-engagements src/lib/reliability`
- Smoke live del signal.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-974, TASK-977, TASK-979)
- [ ] CLAUDE.md invariant + arch Delta + doc funcional update

## Follow-ups

- Replicar la regla de due_date/SLA para nómina si emerge necesidad de unificar el compromiso de pago.

## Open Questions

- ~~¿El ancla del cierre es `service_period_end` del payable o el cierre del mes operativo vigente?~~ **RESUELTA** (ver Análisis pre-ejecución).
- ~~¿N días hábiles o corridos?~~ **RESUELTA → días hábiles** (ver Análisis pre-ejecución).

## Análisis pre-ejecución 2026-05-31 (3-skill: finance + payroll + arch) — ajustes verificados contra el código

Verificado contra `src/lib/calendar/operational-calendar.ts`, `src/lib/contractor-engagements/payables/types.ts`, `src/lib/finance/payment-obligations/materialize-payroll.ts`, `src/lib/sync/projections/contractor-payable-finance-obligation.ts`, `src/lib/finance/pdf/sections/investment-timeline.tsx`:

1. **OQ#2 RESUELTA → días HÁBILES (business days), no corridos.** Confirmado por la constante canónica `DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS = 5` + `isWithinPayrollCloseWindow` (cuenta business days) + el PDF `investment-timeline.tsx` ("Pagos los primeros 5 días **hábiles** del periodo correspondiente").

2. **OQ#1 RESUELTA → ancla = cierre del mes operativo del payable.** El supuesto "anclar a `service_period_end` del payable" es **imposible**: el `contractor_payable` NO tiene columna `service_period_end` (solo `due_date`). Ancla canónica V1 = **último día hábil del mes operativo** del payable (`getLastBusinessDayOfMonth` vía `getOperationalPayrollMonth` de `created_at`); el path `createContractorPayableFromSubmission` puede pasar el período real del work submission si lo tiene. Agregar un `service_period` al payable es mejora de precisión futura (no V1).

3. **AJUSTE — el helper "N-ésimo día hábil posterior" va en el calendario CANÓNICO, no contractor-local.** `operational-calendar.ts` tiene `countBusinessDays`/`getLastBusinessDayOfMonth` pero **NO** un `addBusinessDays(date, n)`. → Agregar `addBusinessDays`/`nthBusinessDayAfter` a `operational-calendar.ts` (SSOT, +tests con feriados). `resolveContractorPaymentDueDate` queda como wrapper delgado que compone `getLastBusinessDayOfMonth` (ancla) + el nuevo `addBusinessDays`. **Rationale cross-domain**: las obligaciones de **nómina hoy usan `dueDate: periodEnd`** (no cierre+5) — inconsistente con el compromiso de 5 días que aplica a colaboradores Y contractors; el helper SSOT permite que una task futura alinee nómina (eleva el Follow-up).

4. **AJUSTE — reusar `DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS` (=5), NO crear `CONTRACTOR_PAYMENT_SLA_BUSINESS_DAYS`.** La constante ya existe; un config nuevo la duplica. Si se necesita override, env var que **defaultea a la constante canónica**.

5. **INCORPORAR (finance/payroll) — distinguir el pago NETO del compromiso vs la remesa de retención.** El SLA mide el **pago NETO al contractor** (cierre + 5 hábiles). La **remesa de la retención SII** (honorarios CL, 15,25% 2026) es una **obligación DISTINTA** con su propio deadline **F29 (día 12 papel / 20 electrónico del mes siguiente)** — out of scope, pero la spec/doc debe flaggearlo explícitamente para que nadie confunda el SLA de pago al contractor con el deadline de remesa al SII. Es el punto "retención como pasivo a remesar": vence en otra fecha, a otro beneficiario.

6. **AJUSTE del signal** — mide el `contractor_payable` comprometido (`ready_for_finance`+ y no `paid`) con `due_date < hoy`; severidad tiered por antigüedad. La obligación **hereda** el `due_date` del payable (el bridge ya pasa `dueDate: payable.dueDate`), así que medir el payable es la fuente correcta (la obligación es downstream).

**Files owned actualizado**: helper de días hábiles en `src/lib/calendar/operational-calendar.ts` (canónico, +tests); `src/lib/contractor-engagements/payables/due-date.ts` como wrapper delgado del dominio. Sin `CONTRACTOR_PAYMENT_SLA_BUSINESS_DAYS` config nuevo.
