# Greenhouse Payroll Runtime Reference

This reference maps Efeonce Payroll behavior to code, schema, and operational checks.

## Canonical Architecture

- Technical architecture: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- Functional docs: `docs/documentation/hr/periodos-de-nomina.md`
- User manual: `docs/manual-de-uso/hr/periodos-de-nomina.md`

Payroll owns:

- `greenhouse_payroll.compensation_versions`
- `greenhouse_payroll.payroll_periods`
- `greenhouse_payroll.payroll_entries`
- `greenhouse_payroll.payroll_bonus_config`

Payroll consumes:

- Core members/users.
- HR attendance and approved leave.
- ICO Engine KPI snapshots.
- Finance/economic indicators for UF/UTM/IMM.
- PREVIRED/ImpUnico sync tables for Chile foundations.

## Main Code Paths

- Types and classification:
  - `src/types/hr-contracts.ts`
  - `src/types/payroll.ts`
- Period lifecycle:
  - `src/lib/payroll/get-payroll-periods.ts`
  - `src/lib/payroll/period-lifecycle.ts`
  - `src/lib/payroll/payroll-readiness.ts`
- Calculation:
  - `src/lib/payroll/calculate-payroll.ts`
  - `src/lib/payroll/calculate-chile-deductions.ts`
  - `src/lib/payroll/calculate-honorarios.ts`
  - `src/lib/payroll/compute-chile-tax.ts`
  - `src/lib/payroll/chile-previsional-helpers.ts`
- Source data:
  - `src/lib/payroll/fetch-kpis-for-period.ts`
  - `src/lib/payroll/fetch-attendance-for-period.ts`
  - `src/lib/payroll/previred-sync.ts`
  - `src/lib/payroll/tax-table-version.ts`
- Persistence:
  - `src/lib/payroll/postgres-store.ts`
  - `src/lib/payroll/persist-entry.ts`
  - `src/lib/payroll/supersede-entry.ts`
- Outputs:
  - `src/lib/payroll/export-payroll.ts`
  - `src/lib/payroll/generate-payroll-excel.ts`
  - `src/lib/payroll/generate-payroll-pdf.tsx`
  - `src/lib/payroll/generate-payroll-receipts.ts`

## Period Readiness Contract

`src/lib/payroll/compensation-requirements.ts` decides what is actually required:

- KPI required when variable OTD/RPA bonus exposure can affect pay and contract is not `honorarios`.
- Attendance required when pay can be attendance-adjusted, contract is not `honorarios`, payroll is not `deel`, and schedule is required.
- Chile tax table required when `payRegime = chile` and contract is not `honorarios`.

This prevents false blockers for honorarios and Deel workers while preserving blockers for workers whose pay actually depends on KPI or attendance.

## Current Formula Map

### Chile dependent internal payroll

`calculatePayrollTotals()` builds:

```text
total_variable_bonus = bonus_otd + bonus_rpa + bonus_other
gratificacion = if enabled then min(base_salary * 0.25, IMM * 4.75 / 12)
gross_total = base_salary + remote_allowance + colacion + movilizacion + fixed_bonus + total_variable_bonus + gratificacion
imponible_base = base_salary + fixed_bonus + total_variable_bonus + gratificacion
afp = imponible_base * afp_total_rate
health = isapre_plan_uf * UF or imponible_base * 0.07
unemployment = imponible_base * unemployment_rate
taxable_base = max(0, imponible_base - afp - health - unemployment)
net = imponible_base + remote_allowance + colacion + movilizacion - afp - health - unemployment - tax - APV
```

Then `computeChileTax()` applies:

```text
tax = max(0, taxable_base_utm * rate - deduction_utm) * UTM
```

### Honorarios

`calculateHonorariosTotals()` builds:

```text
gross = base_salary + fixed_bonus + bonus_otd + bonus_rpa + bonus_other
retention = gross * SII_RETENTION_RATE[year]
net = gross - retention
```

No dependent payroll deductions should apply.

### Deel/international

`calculatePayrollTotals()` returns gross equals net for `payRegime = international`. In `calculate-payroll.ts`, Deel entries use:

```text
gross = adjusted_base + adjusted_remote_allowance + adjusted_fixed_bonus + bonus_otd + bonus_rpa
net = gross
```

Provider/local compliance remains outside Greenhouse unless a jurisdiction-specific engine is added.

## Known Audit Watchlist As Of 2026-05-01

These are not theoretical. Re-check before approving Payroll changes:

1. `src/types/hr-contracts.ts` has `SII_RETENTION_RATES[2026] = 0.145`. SII publishes 15.25 percent for boletas honorarios from January 1, 2026. Any 2026 honorarios entry using 14.5 percent is materially stale.
2. `src/lib/payroll/chile-previsional-helpers.ts` returns `0.03` as worker unemployment rate for `plazo_fijo`. AFC/SP indicate fixed-term worker share is 0 percent and employer share is 3 percent.
3. `resolveChileEmployerCostAmounts()` uses employer cesantia rate `0` for `plazo_fijo`. That understates employer cost for fixed-term workers.
4. `calculatePayrollTotals()` imports cap helpers indirectly but does not apply AFP/health/cesantia topes in the visible formula. Audit high salaries against legal caps before trusting deductions.
5. `computeChileTax()` can return `computed: false` with zero tax if brackets are missing. Readiness/calculate should block Chile dependent payroll before this is treated as valid.
6. Manual compensation AFP rates can override synced rates. Verify whether compensation-stored rates are intentionally pinned or stale.
7. `honorarios` suppresses attendance and KPI requirements in readiness. That is correct for current model, but classification must be audited if the work relationship looks dependent.
8. Deel and international entries can still require ICO KPI when variable bonuses are configured. Do not skip KPI just because payroll is international.

## Data Quality Audit

For a period, inspect:

- `payroll_periods.status`
- `payroll_periods.tax_table_version`
- `payroll_entries.version` and `is_active`
- compensation versions effective during the month
- `source_sync_runs` for PREVIRED/ImpUnico freshness
- `chile_tax_brackets` for tax table version
- `chile_previred_indicators` for IMM, SIS, topes
- `chile_afp_rates` for period AFP totals
- ICO snapshots for OTD/RPA
- attendance/leave snapshots for required workers

## Staging/API Checks

Use the agent-auth staging helper instead of ad hoc curl:

```bash
pnpm staging:request /api/hr/payroll/periods/2026-04/readiness --pretty
pnpm staging:request POST /api/hr/payroll/periods/2026-04/calculate '{}' --pretty
pnpm staging:request /api/cron/sync-previred?start=2026-04\\&end=2026-05 --pretty
```

For browser verification:

```bash
pnpm test:e2e:setup
pnpm exec playwright test tests/e2e/smoke/hr-payroll.spec.ts --project=chromium
```

## Robust Fix Standard

A robust payroll fix should:

- Encode the rule once in a shared helper.
- Add tests for each worker regime impacted.
- Preserve old entries through reliquidation/supersession rules instead of mutating exported history.
- Fail closed for missing legal/source data.
- Keep operator copy explicit: what is missing, who is affected, and what action resolves it.
- Update architecture/docs/manual when behavior changes.
- Validate with unit tests plus staging/browser check for user-visible payroll flows.
