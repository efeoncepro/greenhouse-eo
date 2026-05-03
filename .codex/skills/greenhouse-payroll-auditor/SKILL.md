---
name: greenhouse-payroll-auditor
description: Audit, review, diagnose, and propose fixes for Efeonce/Greenhouse Payroll across Chile dependent workers, honorarios, Deel/EOR/contractor international workers, KPI ICO bonuses, attendance/leave, PREVIRED/ImpUnico, tax tables, deductions, employer costs, payroll readiness, period calculation, exports, and compliance risk.
---

# Greenhouse Payroll Auditor

Use this skill whenever the task touches Payroll amounts, worker classification, Chile tax/previsional rules, honorarios, Deel/international compensation, KPI bonus eligibility, attendance/leave impact, payroll period readiness, payroll exports, or payroll incident diagnosis.

This skill is an audit and decision aid, not legal advice. For current Chile rates, caps, tax tables, minimum wage, SII retention, or labor-law interpretation, verify against official sources before concluding.

## First Reads

Read only what is needed for the requested task:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `src/types/hr-contracts.ts`
- `src/types/payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/calculate-honorarios.ts`
- `src/lib/payroll/chile-previsional-helpers.ts`
- `src/lib/payroll/compute-chile-tax.ts`
- `src/lib/payroll/compensation-requirements.ts`
- `src/lib/payroll/payroll-readiness.ts`

## References

- `references/chile-payroll-law.md`: Chile legal/payroll formula map and official source links.
- `references/greenhouse-payroll-runtime.md`: Greenhouse schema, code paths, formulas, known audit watchlist, and verification commands.
- `references/international-remote-payroll.md`: Remote/international worker regimes, Deel/EOR/contractor boundaries, and Efeonce audit posture.

## Core Invariants

- Classify the worker before calculating. A correct Chile formula applied to the wrong regime is still wrong.
- Never invent KPI values. Payroll bonuses that depend on ICO must consume ICO snapshots, not inline calculations or manual guesses.
- Never calculate metrics inline. Metrics come from ICO Engine/BigQuery.
- Never treat Deel/EOR/provider payroll as Chile statutory payroll unless the legal employer and jurisdiction require it.
- Every DB query must preserve tenant isolation by `space_id` where the data model has tenant scope.
- Use the canonical DB layer: `import { query, getDb, withTransaction } from '@/lib/db'` or existing payroll/postgres helpers. Never create `new Pool()`.
- Payroll must remain auditable: period, compensation version, source data, formula inputs, overrides, and exports must be explainable.

## Worker Regime Classification

Audit in this order:

1. `contractType`
2. `payRegime`
3. `payrollVia`
4. `currency`
5. `scheduleRequired`
6. `deelContractId`
7. compensation effective dates

Current canonical contract derivations live in `src/types/hr-contracts.ts`:

- `indefinido`: Chile dependent worker, internal payroll.
- `plazo_fijo`: Chile dependent worker, internal payroll.
- `honorarios`: Chile civil/service provider, internal payment with SII retention, not dependent payroll.
- `contractor`: international worker via Deel.
- `eor`: international worker where Deel acts as legal employer.

Red flag: if a person has subordination/dependency signals but is classified as `honorarios` or `contractor`, escalate as legal-classification risk before discussing net pay.

## Audit Workflow

1. Establish period: `periodId`, status, year/month, timezone, cut date, UF/UTM/IMM, tax table version, PREVIRED freshness.
2. Build roster: active members, compensation versions effective during the period, members excluded for missing compensation.
3. Classify each worker: Chile dependent, honorarios, Deel contractor, Deel EOR, or international internal exception.
4. Validate source data:
   - Compensation snapshot.
   - ICO KPI snapshot when bonuses can affect pay.
   - Attendance/leave only when it can affect pay.
   - Chile tax/previsional snapshots when Chile dependent payroll exists.
5. Recompute formulas independently enough to detect material drift.
6. Compare persisted `payroll_entries` against the expected formula and source data.
7. Separate blockers from warnings:
   - Blockers prevent official calculation/export.
   - Warnings can allow calculation but require operator awareness or follow-up.
8. Document findings with severity, evidence, affected people, source path, and recommended fix.

## Chile Dependent Payroll Checklist

For `contractType in ('indefinido', 'plazo_fijo')` and `payRegime = 'chile'`:

- Tax table must exist for the imputable month and be resolved, usually `gael-YYYY-MM`.
- UTM must exist for monthly tax.
- UF must exist when Isapre plan is in UF.
- AFP total rate and split must resolve from compensation or PREVIRED.
- Legal topes must be considered for AFP, health, accident insurance, and cesantia.
- Health is 7 percent for Fonasa; Isapre can exceed 7 percent and must split obligatory vs voluntary/excess.
- Seguro de cesantia depends on contract type: indefinido worker 0.6 percent plus employer 2.4 percent; fixed-term/obra worker 0 percent plus employer 3 percent.
- Gratificacion legal under article 50 is 25 percent of eligible monthly remuneration capped by 4.75 IMM annually, usually handled monthly as `min(base * 25%, 4.75 * IMM / 12)` when the monthly mode applies.
- Colacion/movilizacion are non-imponible only when reasonable and compensatory.

## Honorarios Checklist

For `contractType = 'honorarios'`:

- Do not apply AFP, Fonasa/Isapre, cesantia, SIS, mutual, or IUSC as dependent payroll deductions.
- Apply SII honorarios retention rate for the emission year.
- Validate the rate against SII before calculating. As of 2026, SII publishes 15.25 percent from January 1, 2026.
- If attendance, schedules, subordination, fixed command structure, or exclusivity look like employment, flag classification risk.
- KPI bonuses should not be required unless the compensation contract explicitly makes them payable and the business has modeled the legal/tax treatment.

## International/Remote Checklist

For `payRegime = 'international'` or `payrollVia = 'deel'`:

- Greenhouse stores an operational compensation snapshot; Deel/provider may be the legal payroll system.
- Do not apply Chile statutory deductions by default.
- Currency must remain explicit. Do not silently convert USD/CLP.
- Remote allowance is allowed for `contractor` and `eor` in current Greenhouse policy.
- KPI ICO is still mandatory when OTD/RPA bonus exposure can change pay, even if the worker is outside Chile.
- Treat local-country taxes, social security, benefits, and withholding as provider/legal-counsel scope unless Greenhouse has a jurisdiction-specific engine.

## Known Payroll Audit Watchlist

When auditing current code, check these areas first:

- `src/types/hr-contracts.ts`: `SII_RETENTION_RATES` must match SII. Verify 2026; official SII rate is 15.25 percent from January 1, 2026.
- `src/lib/payroll/chile-previsional-helpers.ts`: fixed-term cesantia worker/employer split must match AFC/SP; worker should not be charged 3 percent for fixed-term contracts.
- `src/lib/payroll/calculate-chile-deductions.ts`: verify whether AFP, health, cesantia, SIS, and mutual are capped by legal topes before approving high-salary payroll.
- `src/lib/payroll/compute-chile-tax.ts`: tax table must be current for the period and non-empty; missing brackets cannot be treated as a valid zero-tax result for Chile dependent payroll.
- `src/lib/payroll/compensation-requirements.ts`: readiness must block missing KPI only for compensation where variable bonuses affect pay.
- Manual overrides require a reason and should never hide missing legal/source data.

## Verification Commands

Use the smallest command set that proves the claim:

- `pnpm vitest run src/lib/payroll`
- `pnpm exec eslint src/lib/payroll src/types/payroll.ts src/types/hr-contracts.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- `pnpm staging:request /api/hr/payroll/periods/<periodId>/readiness --pretty`
- `pnpm staging:request POST /api/hr/payroll/periods/<periodId>/calculate '{}' --pretty`
- `pnpm test:e2e:setup`
- `pnpm exec playwright test tests/e2e/smoke/hr-payroll.spec.ts --project=chromium`

## Output Format

For audits, answer with:

- `Decision`: pass, pass with warnings, block, or needs legal review.
- `Scope`: period, workers, entries, exports, or code paths reviewed.
- `Findings`: ordered by severity, with affected people/entries and file paths.
- `Formula Check`: the formula used, inputs, source table/API, and observed delta.
- `Data Quality`: missing KPI, attendance, compensation, PREVIRED, ImpUnico, UF/UTM/IMM, or provider data.
- `Recommended Fix`: robust code/data/ops action, not a superficial patch.
- `Verification`: commands or runtime checks executed.
