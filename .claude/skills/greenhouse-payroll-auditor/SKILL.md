---
name: greenhouse-payroll-auditor
description: Audit Efeonce/Greenhouse Payroll: Chile workers, honorarios, Deel/international, KPI ICO bonuses, readiness, calculations, exports, and compliance risk.
---

# Greenhouse Payroll Auditor

Use this skill whenever the task touches Payroll amounts, worker classification, Chile tax/previsional rules, honorarios, Deel/international compensation, KPI bonus eligibility, attendance/leave impact, payroll period readiness, payroll exports, or payroll incident diagnosis.

This skill is an audit and decision aid, not legal advice. For current Chile rates, caps, tax tables, minimum wage, SII retention, or labor-law interpretation, verify against official sources before approving official payroll.

Manual invocation in Claude Code: `/greenhouse-payroll-auditor [period, payroll issue, employee cohort, calculation/export/readiness symptom, or audit scope]`.

## First Reads

Read only what is needed for the requested task:

- `AGENTS.md`
- `CLAUDE.md`
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

## Supporting References

Load the smallest reference that matches the task:

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
4. Validate source data: compensation snapshot, ICO KPI snapshot when bonuses can affect pay, attendance/leave only when it can affect pay, and Chile tax/previsional snapshots when Chile dependent payroll exists.
5. Recompute formulas independently enough to detect material drift.
6. Compare persisted `payroll_entries` against the expected formula and source data.
7. Separate blockers from warnings: blockers prevent official calculation/export; warnings can allow calculation but require operator awareness or follow-up.
8. Document findings with severity, evidence, affected people, source path, and recommended fix.

## Payroll Domain Checklists

For Chile dependent payroll, verify tax table version, UTM, UF, AFP split, health, Seguro de Cesantia, legal caps, gratificacion, and non-imponible allowances. Load `references/chile-payroll-law.md`.

For `honorarios`, do not apply AFP, Fonasa/Isapre, cesantia, SIS, mutual, or IUSC as dependent payroll deductions. Apply SII retention for the emission year and escalate classification risk when the work relationship behaves like employment.

For `payRegime = 'international'` or `payrollVia = 'deel'`, keep currency explicit, do not apply Chile statutory deductions by default, and preserve KPI ICO requirements when OTD/RPA bonuses can change pay. Load `references/international-remote-payroll.md`.

## Known Payroll Audit Watchlist

When auditing current code, check these areas first:

- `src/types/hr-contracts.ts`: `SII_RETENTION_RATES` must match SII. Verify 2026; official SII rate is 15.25 percent from January 1, 2026.
- `src/lib/payroll/chile-previsional-helpers.ts`: fixed-term cesantia worker/employer split must match AFC/SP; worker should not be charged 3 percent for fixed-term contracts.
- `src/lib/payroll/calculate-chile-deductions.ts`: verify AFP, health, cesantia, SIS, and mutual caps before approving high-salary payroll.
- `src/lib/payroll/compute-chile-tax.ts`: tax table must be current for the period and non-empty; missing brackets cannot be treated as valid zero tax for Chile dependent payroll.
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
- `Formula Check`: formula used, inputs, source table/API, and observed delta.
- `Data Quality`: missing KPI, attendance, compensation, PREVIRED, ImpUnico, UF/UTM/IMM, or provider data.
- `Recommended Fix`: robust code/data/ops action, not a superficial patch.
- `Verification`: commands or runtime checks executed.
