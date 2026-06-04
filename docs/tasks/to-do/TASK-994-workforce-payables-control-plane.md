# TASK-994 — Workforce Payables Control Plane

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|payroll|hr|workforce|reliability|ui|data`
- Blocked by: `ADR acceptance: docs/architecture/GREENHOUSE_WORKFORCE_PAYABLES_CONTROL_PLANE_V1.md`
- Branch: `task/TASK-994-workforce-payables-control-plane`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Crear un control plane read-only/projection-first para pagos de workforce:
Payroll y Contractor Payables siguen siendo rails especializados, pero Finance
puede ver en una sola superficie el estado de pago, readiness, ordenes,
settlement, artefactos, notificaciones y conciliacion de toda persona que cobra
por Efeonce.

## Why This Task Exists

Payroll y Contractors ya convergen tecnicamente en `payment_obligations`,
`payment_orders`, `expense_payments` y settlement, pero la operacion sigue
fragmentada por dominio. El resultado es deuda cognitiva: Finanzas debe entrar
a Payroll para entender nomina, a Contractors para payables/boletas, a Payment
Orders para approval/payment y a Email/Admin para delivery.

Esa separacion es correcta para calcular y documentar; no es optima para operar
Tesoreria. La sinergia robusta es un **Workforce Payables Control Plane** que
observe y componga el estado, sin reescribir montos ni borrar las fronteras
legales.

## Goal

- Crear una proyeccion/reader canonico de payables workforce cross-domain.
- Exponer una UI Finance/Tesoreria para revisar pagos de empleados, honorarios,
  contractors, Deel/EOR, retenciones y cotizaciones desde un mismo workbench.
- Normalizar lifecycle operacional sin colapsar regimen legal.
- Mostrar readiness, payment order, settlement, reconciliation, artifacts y
  notification status con deep links al dominio owner.
- Agregar signals de drift/dead-letter/staleness para que la vista no parezca
  sana cuando una proyeccion o delivery fallo.
- Mantener Payroll y Contractors como source of truth de calculo/evidencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WORKFORCE_PAYABLES_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_PREVIEW_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- **Projection-first V1**: no crear un nuevo source of truth ni tabla write-path
  de pagos workforce.
- **No recalcular montos**: gross/net/withholding se leen del dominio owner.
- **No mezclar legal semantics**: Payroll receipt, contractor `EO-RA`,
  Previred/LRE y boletas siguen siendo documentos distintos.
- **No mail on download**: report downloads son read-only; notificaciones salen
  de eventos lifecycle.
- **Payment Orders owns payment**: paid/settlement/reconciliation se derivan de
  Payment Orders y expense/payment ledgers.
- **Deep-link, no duplicated forms**: acciones de calculo o correccion viven en
  Payroll, Contractors, Payment Profiles, Payment Orders o Reconciliation.
- **Sensitive payment data masked**: no revelar cuentas bancarias en esta vista.
- **Access dual-plane**: view visible + capabilities finas; no confiar solo en
  route group.
- **Fail honest**: si una fuente esta degradada, la UI debe mostrar degraded y
  la reliability debe alertar.

## Normative Docs

- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/documentation/hr/pagos-de-nomina.md`
- `docs/documentation/finance/pagos-a-contractors.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/finance/pagos-a-contractors.md`
- `docs/manual-de-uso/finance/ordenes-de-pago.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- ADR accepted checkpoint:
  - `docs/architecture/GREENHOUSE_WORKFORCE_PAYABLES_CONTROL_PLANE_V1.md`
- Payroll foundations:
  - `src/lib/payroll/get-payroll-periods.ts`
  - `src/lib/payroll/get-payroll-entries.ts`
  - `src/lib/payroll/payroll-readiness.ts`
  - `src/lib/payroll/payroll-export-packages.ts`
  - `src/lib/payroll/payroll-export-packages-store.ts`
  - `src/lib/payroll/payroll-receipts-store.ts`
  - `src/lib/finance/payment-obligations/materialize-payroll.ts`
  - `src/lib/sync/projections/payment-obligations-from-payroll.ts`
  - `src/lib/sync/projections/payroll-export-ready.ts`
  - `src/lib/sync/projections/payroll-receipts.ts`
  - `src/lib/sync/projections/payslip-on-payment-paid.ts`
- Contractor foundations:
  - `src/lib/contractor-engagements/payables/store.ts`
  - `src/lib/contractor-engagements/payables/readiness.ts`
  - `src/lib/contractor-engagements/payables/monthly-run.ts`
  - `src/lib/contractor-engagements/payables/payment-run-store.ts`
  - `src/lib/contractor-engagements/payables/run-report-reader.ts`
  - `src/lib/sync/projections/contractor-payable-finance-obligation.ts`
  - `src/lib/sync/projections/contractor-payable-expense-materialize.ts`
  - `src/lib/sync/projections/contractor-payable-paid-cascade.ts`
  - `src/lib/sync/projections/contractor-payable-paid-email.ts`
  - `docs/tasks/to-do/TASK-993-contractor-payment-run-ready-email.md`
- Finance/Treasury foundations:
  - `src/types/payment-obligations.ts`
  - `src/lib/finance/payment-obligations/reconcile-obligation.ts`
  - `src/lib/finance/payment-orders/create-from-obligations.ts`
  - `src/lib/finance/payment-orders/mark-paid-atomic.ts`
  - `src/lib/finance/payment-orders/payroll-status-reader.ts`
  - `src/lib/finance/payment-orders/source-instrument-policy.ts`
  - `src/lib/finance/expense-payment-ledger.ts`
  - `src/views/greenhouse/finance/payment-orders/PaymentOrdersView.tsx`

### Blocks / Impacts

- Creates the canonical convergence surface for workforce payments.
- Provides natural follow-up home for SII withholding remittance convergence.
- Improves operator observability for TASK-993 contractor run-ready email.
- May reduce future duplicated dashboards in Payroll, Contractors and Payment
  Orders.
- Must not block existing Payroll close or Contractor payment flows.

### Files owned

Candidate new files:

- `src/lib/finance/workforce-payables/types.ts`
- `src/lib/finance/workforce-payables/lifecycle.ts`
- `src/lib/finance/workforce-payables/reader.ts`
- `src/lib/finance/workforce-payables/artifacts.ts`
- `src/lib/finance/workforce-payables/notifications.ts`
- `src/lib/finance/workforce-payables/readiness.ts`
- `src/lib/reliability/queries/workforce-payables-*.ts`
- `src/app/api/finance/workforce-payables/route.ts`
- `src/app/api/finance/workforce-payables/[id]/route.ts`
- `src/app/api/finance/workforce-payables/export/route.ts`
- `src/views/greenhouse/finance/workforce-payables/WorkforcePayablesView.tsx`
- `src/views/greenhouse/finance/workforce-payables/WorkforcePayablesFilters.tsx`
- `src/views/greenhouse/finance/workforce-payables/WorkforcePayableDetailDrawer.tsx`
- `src/views/greenhouse/finance/workforce-payables/WorkforcePayablesKpiRow.tsx`
- `src/lib/copy/workforce-payables.ts`
- `scripts/frontend/scenarios/workforce-payables.scenario.ts`

Existing files likely touched:

- `src/config/entitlements-catalog.ts`
- `src/config/greenhouse-nomenclature.ts`
- `src/config/navigation/vertical.ts`
- `src/lib/navigation/route-reachability-manifest.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/sync/projections/index.ts` if projection/materialized refresh is used
- `src/views/greenhouse/finance/payment-orders/OrderDetailDrawer.tsx` only for
  deep-link/backlink affordances if needed
- `docs/architecture/GREENHOUSE_WORKFORCE_PAYABLES_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/manual-de-uso/finance/workforce-payables.md`
- `docs/documentation/finance/workforce-payables.md`
- `docs/manual-de-uso/README.md`
- `docs/documentation/README.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Payroll exports packages with persisted private assets, freshness check,
  PDF/CSV attachments and delivery state:
  - `src/lib/payroll/payroll-export-packages.ts`
  - `src/lib/payroll/payroll-export-packages-store.ts`
- Payroll creates obligations after export:
  - `src/lib/finance/payment-obligations/materialize-payroll.ts`
  - `src/lib/sync/projections/payment-obligations-from-payroll.ts`
- Payroll downstream payment status reader:
  - `src/lib/finance/payment-orders/payroll-status-reader.ts`
  - `src/views/greenhouse/payroll/PayrollPaymentStatusCard.tsx`
- Contractor payables create obligations when ready:
  - `src/lib/sync/projections/contractor-payable-finance-obligation.ts`
- Contractor payables create expenses and settle through Payment Orders:
  - `src/lib/sync/projections/contractor-payable-expense-materialize.ts`
  - `src/lib/finance/payment-orders/mark-paid-atomic.ts`
- Contractor monthly run creates payment orders grouped by currency:
  - `src/lib/contractor-engagements/payables/monthly-run.ts`
- Contractor paid cascade and remittance email exist:
  - `src/lib/sync/projections/contractor-payable-paid-cascade.ts`
  - `src/lib/sync/projections/contractor-payable-paid-email.ts`
- Payment Orders already centralizes maker-checker and paid settlement.

### Gap

- No cross-domain read model answers "all workforce payables this period".
- No single Finance UI shows Payroll + Contractors + tax/social obligations
  together with readiness and downstream state.
- Payroll has artifact package persistence; Contractors report artifacts are
  generated on demand pending TASK-993/TASK-specific package extraction.
- Notification delivery state is not visible from a workforce payment lens.
- Lifecycle vocabulary is not normalized across Payroll, Contractor Payables,
  Payment Orders and settlement.
- SII withholding remittance is split: Payroll honorarios creates SII
  obligations, Contractor withholding remains a future remittance lane.
- Reliability signals exist per rail, but not as a unified control-plane health
  summary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — ADR acceptance checkpoint + final V1 cut

- Review `GREENHOUSE_WORKFORCE_PAYABLES_CONTROL_PLANE_V1.md` with Finance,
  Payroll and HR.
- Decide whether ADR moves from `Proposed` to `Accepted` or remains research.
- If accepted, update `docs/architecture/DECISIONS_INDEX.md`.
- Freeze V1 scope: read-only control plane, no write actions.

### Slice 1 — Canonical taxonomy + lifecycle mapper

- Create `src/lib/finance/workforce-payables/types.ts`.
- Create stable categories:
  - `employee_net_pay`
  - `payroll_honorarios_net_pay`
  - `payroll_honorarios_withholding`
  - `payroll_social_security`
  - `contractor_net_pay`
  - `contractor_withholding`
  - `provider_or_eor_payroll`
- Create lifecycle mapper:
  - `not_ready`
  - `ready_to_obligate`
  - `obligation_generated`
  - `in_payment_order`
  - `pending_approval`
  - `approved`
  - `scheduled`
  - `submitted`
  - `paid_unreconciled`
  - `reconciled`
  - `closed`
  - `cancelled`
  - `degraded`
- Unit tests cover each known Payroll and Contractor state mapping.

### Slice 2 — Read-only workforce payables reader

- Implement `src/lib/finance/workforce-payables/reader.ts`.
- Compose existing sources:
  - payroll entries + obligations + payment orders + expense payments;
  - contractor payables + obligations + payment orders + expense payments;
  - artifact package/receipt/remittance status;
  - notification delivery status where available.
- Return discriminated union rows with source metadata, not anonymous flattened
  amounts.
- Include degraded source metadata if any dependency fails.
- Do not introduce new runtime writes in this slice.

### Slice 3 — Reliability signals

- Add signals for:
  - `finance.workforce_payables.projection_stale`
  - `finance.workforce_payables.obligation_missing`
  - `finance.workforce_payables.artifact_missing`
  - `finance.workforce_payables.notification_dead_letter`
  - `finance.workforce_payables.withholding_remittance_gap`
- Signals must be read-only.
- Wire into `get-reliability-overview`.
- Tests prove steady-state returns zero for synthetic healthy fixtures.

### Slice 4 — API surface

- Add `GET /api/finance/workforce-payables`.
- Add `GET /api/finance/workforce-payables/[id]`.
- Optional: add `GET /api/finance/workforce-payables/export` for operational
  CSV/XLSX if the UI needs it.
- Auth: `requireFinanceTenantContext`.
- Capability gate: `finance.workforce_payables.read`.
- No mutation endpoints in V1.

### Slice 5 — UI workbench

- Add route `/finance/workforce-payables`.
- Add navigation entry under Finance/Tesoreria only if access is granted.
- Build an operational workbench:
  - KPI row by lifecycle and amount;
  - filters by period, rail, category, lifecycle, currency, blocker owner;
  - dense table with source rail, person, net/gross/withholding, due date,
    payment order status and artifact status;
  - detail drawer with deep links to source owner surfaces.
- Use `src/lib/copy/workforce-payables.ts` for reusable copy.
- No in-app explanatory paragraphs that duplicate manual content.

### Slice 6 — Deep links and source-owner affordances

- Payroll row links:
  - Payroll period;
  - payroll entry detail/receipt if available;
  - Payment Order detail;
  - Payment Profile if blocked.
- Contractor row links:
  - Contractor payable detail;
  - contractor work submission/supports where available;
  - Payment Order detail;
  - remittance advice if paid;
  - Payment Profile if blocked.
- Tax/social rows links:
  - Payment Order detail;
  - compliance export/remittance owner if available.

### Slice 7 — Documentation and operating model

- Create `docs/manual-de-uso/finance/workforce-payables.md`.
- Create `docs/documentation/finance/workforce-payables.md`.
- Update Payroll, Contractors and Payment Orders docs with cross-links.
- Update architecture docs with final accepted V1 deltas.
- Update `Handoff.md` and `changelog.md`.

### Slice 8 — GVC scenario + staging smoke

- Add `scripts/frontend/scenarios/workforce-payables.scenario.ts`.
- Capture desktop and mobile.
- Verify:
  - table renders with mixed Payroll/Contractor fixture or staging data;
  - filters do not overlap;
  - drawer deep links exist;
  - degraded state is visible when API returns degraded fixture.

## Out of Scope

- Replacing Payroll calculation.
- Replacing Contractor payable calculation.
- Creating new payment orders from the control plane in V1.
- Approving/submitting/marking paid from the control plane in V1.
- Exposing full bank account numbers.
- Automating SII/F29/F50 remittance.
- Creating a new workforce identity source of truth.
- Accepting or implementing the broader Unified Workforce Foundation.
- Refactoring `members` into a projection.
- Changing Payroll close/export status semantics.
- Changing Contractor `ready_for_finance` or monthly run semantics.

## Detailed Spec

### Proposed row shape

```ts
export type WorkforcePayableSourceDomain =
  | 'payroll'
  | 'contractor'
  | 'payment_order'
  | 'tax_or_social_security'

export type WorkforcePayableCategory =
  | 'employee_net_pay'
  | 'payroll_honorarios_net_pay'
  | 'payroll_honorarios_withholding'
  | 'payroll_social_security'
  | 'contractor_net_pay'
  | 'contractor_withholding'
  | 'provider_or_eor_payroll'

export type WorkforcePayableLifecycleState =
  | 'not_ready'
  | 'ready_to_obligate'
  | 'obligation_generated'
  | 'in_payment_order'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'submitted'
  | 'paid_unreconciled'
  | 'reconciled'
  | 'closed'
  | 'cancelled'
  | 'degraded'
```

Each row must preserve source evidence:

- `sourceDomain`
- `sourceKind`
- `sourceRef`
- `sourcePublicId`
- `periodId` or `{ periodYear, periodMonth }`
- `identityProfileId`
- `memberId`
- `legalRelationshipId` or `null`
- `contractorEngagementId` or `null`
- `payrollEntryId` or `null`
- `contractorPayableId` or `null`
- `obligationId`
- `paymentOrderId`
- `expensePaymentId`
- `settlementGroupId`
- `reconciliationStatus`
- `artifactStatus`
- `notificationStatus`
- `readinessBlockers`
- `degradedReason`

### Amount semantics

Rows must not present one total without context.

- `grossAmount`: full labor/provider cost when the source exposes it.
- `netAmount`: amount paid to the worker/provider.
- `withholdingAmount`: retained amount not paid to worker.
- `employerOrProviderAmount`: social security/provider component where distinct.
- `currency`: source currency.

For contractor honorarios:

- gross = expense;
- net = bank payment to contractor;
- withholding = liability to SII.

For Chile dependent payroll:

- net = bank payment to employee;
- employee deductions and employer contributions remain visible but separated;
- Previred is not employee net pay.

### UI states

The table must distinguish:

- `ready` with data;
- `empty_positive` when no workforce payables exist for filters;
- `empty_pending` when upstream period/run has not happened yet;
- `degraded` when one or more readers failed;
- `stale` when projection age exceeds threshold.

Never collapse degraded/stale into "No hay datos".

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (ADR accepted) MUST happen before any runtime implementation.
- Slice 1 (taxonomy/lifecycle) -> Slice 2 (reader) -> Slice 3 (signals).
- Slice 4 (API) depends on Slice 2 and Slice 3.
- Slice 5 (UI) depends on Slice 4.
- Slice 6 (deep links) can start after Slice 5 skeleton.
- Slice 7 (docs) begins after Slice 5 and must finish before closing.
- Slice 8 (GVC/staging smoke) is final pre-close gate.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI implies contractors are payroll employees | payroll / contractor / compliance | medium | explicit category/regime labels, ADR hard rules, docs review | manual UI review + GVC |
| Projection silently stale | finance / reliability | medium | freshness timestamps + stale signal | `finance.workforce_payables.projection_stale` |
| Sensitive payment data exposure | finance / security | low | masked only, no reveal path V1, capability review | audit logs / access review |
| Double-count total workforce payable amounts | finance / management accounting | medium | separated gross/net/withholding/statutory buckets | unit tests + docs |
| Reader becomes too slow | data / UI | medium | measure query cost, consider materialized projection after reader proof | latency logs / Sentry |
| Missing contractor package artifacts confuse email state | contractor / notifications | medium | make TASK-993 dependency explicit; show pending/degraded | `artifact_missing` |
| Agents mutate source domains from control plane | platform / controls | low | no mutation routes V1; tests ensure GET-only API | route coverage test |

### Feature flags / cutover

Recommended:

- `WORKFORCE_PAYABLES_CONTROL_PLANE_ENABLED=false` default.
- `WORKFORCE_PAYABLES_CONTROL_PLANE_UI_ENABLED=false` default if backend ships first.

Rollout:

1. Ship reader/signals behind flag.
2. Enable in staging for Finance/admin users.
3. Verify Payroll period + Contractor run mixed data.
4. Enable UI in staging.
5. Enable in production read-only after 7 days signals steady in staging.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | ADR remains Proposed or is superseded | immediate | yes |
| Slice 1 | revert taxonomy code PR | <30 min | yes |
| Slice 2 | disable flag; revert reader | <30 min | yes |
| Slice 3 | disable signal registration or revert | <30 min | yes |
| Slice 4 | disable flag; route returns 404/disabled | <10 min | yes |
| Slice 5 | hide nav/view via flag/view grants | <10 min | yes |
| Slice 6 | remove/degrade deep links | <30 min | yes |
| Slice 7 | docs revert/update | <30 min | yes |
| Slice 8 | evidence-only; remove/refresh capture scenario if it blocks CI | <30 min | yes |

### Production verification sequence

1. `pnpm task:lint --task TASK-994`.
2. ADR accepted and indexed.
3. Unit tests for taxonomy/lifecycle.
4. API smoke in local/staging with flag OFF returns disabled or no nav.
5. Flag ON in staging with Finance agent auth.
6. Verify Payroll-only period.
7. Verify Contractor-only period.
8. Verify mixed period if available.
9. Verify no mutation endpoints exist.
10. Verify GVC desktop/mobile.
11. Monitor reliability signals for 7 days before production ON if there is material data volume.

### Out-of-band coordination required

- Finance/Payroll/HR product review of terminology before UI launch.
- Optional Finance sign-off on aggregated totals and labels.
- No bank/provider external coordination in V1 because there are no new payment actions.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR `GREENHOUSE_WORKFORCE_PAYABLES_CONTROL_PLANE_V1.md` is accepted or the task remains blocked.
- [ ] V1 exposes a read-only workforce payables reader with Payroll and Contractor rows.
- [ ] Lifecycle mapping is unit-tested for Payroll exported/unexported, contractor ready/in-order/paid, and payment order states.
- [ ] The API is GET-only and gated by Finance tenant context + capability.
- [ ] UI route `/finance/workforce-payables` is reachable and not orphaned.
- [ ] UI clearly separates Payroll, Contractors, withholding, Previred/social and provider rows.
- [ ] No UI copy calls contractors "employees" or contractor remittance "payslip".
- [ ] Payment profile-sensitive data remains masked.
- [ ] Degraded/stale source state is visible in UI and reliability signals.
- [ ] Deep links route to Payroll, Contractor Payables, Payment Orders and Payment Profiles without duplicating edit forms.
- [ ] GVC evidence exists for desktop and mobile.
- [ ] Docs/manuals explain how Finance uses the control plane and where source-owner actions live.
- [ ] Existing Payroll and Contractor test suites remain green.

## Verification

- `pnpm task:lint --task TASK-994`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/finance/workforce-payables`
- `pnpm exec vitest run src/lib/payroll src/lib/contractor-engagements/payables src/lib/finance/payment-orders`
- `pnpm route-reachability-gate --strict`
- `pnpm design:lint`
- `pnpm build`
- `pnpm fe:capture workforce-payables --env=staging`

## Closing Protocol

- [ ] Move task file to `docs/tasks/complete/`.
- [ ] Update `Lifecycle` to `complete`.
- [ ] Update `docs/tasks/README.md`.
- [ ] Update `docs/tasks/TASK_ID_REGISTRY.md`.
- [ ] Update `docs/architecture/DECISIONS_INDEX.md` with final ADR status.
- [ ] Update docs/manual indexes.
- [ ] Update `Handoff.md` with rollout evidence and flags.
- [ ] Update `changelog.md`.
- [ ] Document any disabled-by-default feature flag as rollout pending, not complete.
