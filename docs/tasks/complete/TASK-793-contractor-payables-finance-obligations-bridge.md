# TASK-793 — Contractor Payables to Finance Payment Obligations Bridge

## Delta 2026-05-30 — CLOSED ✅ (complete)

Shipped end-to-end en `develop` (sin push remoto; local-first). Commits:
`07f9dec8` (Slice 1 schema), `c3e986cf` + `72fd2329` (Slice 2 readiness/API/caps + fix),
`a310105f` (Slice 3 bridge projection), `ba96c9a8` (Slice 3 signals fix),
`ba761519` (Slice 3 wiring overview), `e97aadd7` (Slice 4 bridge test).

- **Schema**: `greenhouse_hr.contractor_payables` (state-machine `pending_readiness → ready_for_finance → obligation_created → payment_order_created → paid` + `blocked`/`cancelled`) + `contractor_payable_events` append-only + CHECK `net = gross − withholding` + CHECK `economic_category = 'labor_cost_external'` + ALTER `contractor_work_submissions` FK `consumed_by_payable_id` + ALTER `payment_obligations` source_kind `+contractor_payable`. DB guards verificados en vivo (rolled back).
- **Runtime**: types + state-machine + withholding (SII honorarios CL únicamente, resto 0) + readers + `createContractorPayableFromSubmission` (consume submission misma tx, dup-guard) + `createContractorPayableOffCycle`.
- **Readiness fail-closed** (7 gates): source/invoice/net/currency/FX/payment-profile/provider-split + waiver gobernado.
- **API** `/api/finance/contractor-payables` (list/create + detail + ready + cancel + waive) gated por `can(tenant, …)`.
- **Capabilities** `finance.contractor_payable{,.waive_payment_profile}` + runtime grants (finance route_group ∪ FINANCE_ADMIN ∪ EFEONCE_ADMIN; waiver admins-only) — grant-coverage test verde.
- **Bridge** projection `contractor_payable_finance_obligation`: `ready_for_finance` → UNA `payment_obligation` (idempotente, `amount=net_payable`, `obligation_kind=provider_payroll`) → `obligation_created`. 8 tests.
- **Reliability**: `finance.contractor_payable.ready_without_obligation` (lag) + `finance.contractor_payable.bridge_dead_letter` (dead_letter), wired en `getReliabilityOverview` (moduleKey finance).
- **Outbox v1**: `workforce.contractor_payable.{created,ready_for_finance,obligation_created,blocked,cancelled}`.
- Verificación final: `tsc` 0 repo-wide, lint 0, payroll non-regression gate verde (522 passed), 31 tests focales del dominio payable + 8 del bridge.

## Delta 2026-05-30

- **TASK-792 ✅ complete**: existen las work submissions (`greenhouse_hr.contractor_work_submissions`). El payable PAYG/milestone consume las submissions aprobadas vía `listWorkSubmissionsReadyForPayable(engagementId)` (approved ∧ no consumidas) y DEBE llamar `markContractorWorkSubmissionConsumed({submissionId, payableId})` dentro de la misma tx de creación del payable (dup-guard idempotente). Agregar la FK `contractor_work_submissions.consumed_by_payable_id → contractor_payables` (additiva, la columna ya existe NULL) cuando se cree la tabla `contractor_payables`. La aprobación de la submission NO es pago — el pago nace aquí (793) hacia Finance.
- **TASK-791 ✅ complete**: los soportes (invoice PDF, tax XML, work evidence, provider statement/payout, FX receipt) viven en `greenhouse_hr.contractor_invoice_assets` adjuntos vía el uploader canónico. El readiness `ready_for_finance` del payable debe verificar que existe el asset principal (`asset_role='invoice_pdf'` o el artefacto requerido) cuando `requires_invoice=true`, leyendo `listContractorInvoiceAssetsByEngagement`. NUNCA aceptar `gs://`/URLs externas como contrato de invoice.

## Delta 2026-05-29

- Desbloqueado por **TASK-790 ✅ complete**: el aggregate `contractor_engagements` existe. El `ContractorPayable` de esta task FK-ancla al engagement + invoice/work submission. **Recordatorio de invariante TASK-790**: el engagement NUNCA escribe a `payroll_entries`/`compensation_versions`/`final_settlements` — el payable nace aquí (793) hacia Finance (`payment_obligations` → `payment_orders`), idempotente por `contractor_payable_id`, con `tax_compliance_owner` + `payroll_via` del engagement como input. Outbox bridge: input `workforce.contractor_payable.ready_for_finance.v1` → output `finance.payment_obligation.generated.v1`.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-790, TASK-791, TASK-792, TASK-749, TASK-750`
- Branch: `task/TASK-793-contractor-payables-finance-bridge`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear `ContractorPayable` como obligacion economica aprobada previa a Finance y un bridge idempotente hacia `greenhouse_finance.payment_obligations`, manteniendo a Finance como owner de payment orders, banco y conciliacion.

## Why This Task Exists

Contractor payment no debe ser payroll adjustment ni expense generico directo. Hace falta un source aggregate con readiness, dedupe, tax owner, FX policy, invoice/submission refs y payment profile antes de crear obligaciones financieras.

## Goal

- Implementar `greenhouse_hr.contractor_payables`.
- Implementar readiness fail-closed.
- Generar Finance Payment Obligations idempotentes desde payables listos.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- Contractor payable aprobado genera obligation, no payment directo.
- Idempotency by `contractor_payable_id`.
- Economic category must be `labor_cost_external`, `payroll` or `provider_payroll` according to source.
- Payment profile resolver remains canonical.

## Dependencies & Impact

### Depends on

- `TASK-790`, `TASK-791`, `TASK-792`.
- `TASK-749`, `TASK-750`.
- `TASK-752` for broader beneficiary coverage where needed.

### Blocks / Impacts

- Blocks `TASK-794`, `TASK-795`, `TASK-796`, `TASK-798`.
- Impacts Finance obligations/orders and payment calendar.

### Files owned

- `migrations/**`
- `src/lib/contractor-engagements/payables/**`
- `src/lib/finance/payment-obligations/**` `[verificar]`
- `src/lib/finance/payment-routing/**`

## Current Repo State

### Already exists

- Payment profiles V1 for member/shareholder.
- Payment obligations/orders architecture and runtime.
- Finance economic category dimension has `labor_cost_external`.

### Gap

- No contractor source aggregate can generate obligations.
- No readiness for invoice asset, FX, tax owner, provider split or duplicates.

## Scope

### Slice 1 — Payable schema/runtime

- Add payable table with invoice/submission refs, gross/withholding/net, currency, payment currency, tax owner, FX policy, payment profile and status.

### Slice 2 — Readiness engine

- Gate approved invoice/submission, asset attached, gross/net reconcile, currency/FX, payment profile, tax owner, provider split and duplicate candidate.

### Slice 3 — Finance bridge

- Consume `workforce.contractor_payable.ready_for_finance.v1`.
- Create payment obligation with source aggregate refs and idempotency.

### Slice 4 — Tests and recovery

- Add tests for duplicate replay, missing profile, missing FX, missing invoice asset and provider split.

## Payroll Non-Regression Guardrails (hard rules)

793 puentea contractor payables → Finance obligations. Finance es owner del banco; Payroll no participa. Riesgo: que un payable contamine el motor de nómina o la categoría económica. Auditado con `greenhouse-payroll-auditor`.

- **NUNCA** generar `payroll_entries` ni `payroll_adjustments` desde un payable. El payable listo crea una Finance payment obligation, no un movimiento de nómina.
- **NUNCA** clasificar el payout del contractor como remuneración dependiente. Economic category = `labor_cost_external` / `provider_payroll` según source; fees de plataforma y FX spread van a sus categorías propias, nunca a `payroll` dependiente.
- **NUNCA** invocar el materializador de gastos de nómina (`materializePayrollExpensesForExportedPeriod`) ni reusar el path de payment orders de payroll para contractor. El bridge contractor es propio e idempotente por `contractor_payable_id`.
- **NUNCA** mutar `members.{payroll_via,contract_type,pay_regime}` al resolver el payment routing del contractor.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` además de las suites contractor/finance, para probar no-regresión del motor dependiente.

## Out of Scope

- Executing the bank payment.
- Provider API import.
- Global tax engine.

## Acceptance Criteria

- [ ] Ready payable creates exactly one Finance obligation after replay.
- [ ] Missing payment profile blocks readiness unless a governed waiver exists.
- [ ] Missing FX policy blocks cross-currency readiness.
- [ ] Duplicate invoice/submission/payable candidates are blocked or flagged.
- [ ] Finance obligation preserves source aggregate `contractor_payable`.
- [ ] Payroll non-regression: no `payroll_entries`/`payroll_adjustments` desde payables; economic category nunca `payroll` dependiente; suite `src/lib/payroll` verde.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/lib/contractor-engagements src/lib/finance/payment-routing`
- `pnpm vitest run src/lib/payroll` — payroll non-regression gate.
- `pnpm pg:doctor`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] Finance architecture delta updated if bridge contract changes.
