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

- Types and classification: `src/types/hr-contracts.ts`, `src/types/payroll.ts`
- Period lifecycle: `src/lib/payroll/get-payroll-periods.ts`, `src/lib/payroll/period-lifecycle.ts`, `src/lib/payroll/payroll-readiness.ts`
- Calculation: `src/lib/payroll/calculate-payroll.ts`, `src/lib/payroll/calculate-chile-deductions.ts`, `src/lib/payroll/calculate-honorarios.ts`, `src/lib/payroll/compute-chile-tax.ts`, `src/lib/payroll/chile-previsional-helpers.ts`
- Source data: `src/lib/payroll/fetch-kpis-for-period.ts`, `src/lib/payroll/fetch-attendance-for-period.ts`, `src/lib/payroll/previred-sync.ts`, `src/lib/payroll/tax-table-version.ts`
- Persistence: `src/lib/payroll/postgres-store.ts`, `src/lib/payroll/persist-entry.ts`, `src/lib/payroll/supersede-entry.ts`
- Outputs: `src/lib/payroll/export-payroll.ts`, `src/lib/payroll/generate-payroll-excel.ts`, `src/lib/payroll/generate-payroll-pdf.tsx`, `src/lib/payroll/generate-payroll-receipts.ts`

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
afp = capped_imponible_base * afp_total_rate
health = capped_health_base * 0.07 or Isapre plan handling
unemployment = capped_cesantia_base * unemployment_rate
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

For `payRegime = international`, Greenhouse tracks an operational amount and does not apply Chile statutory deductions by default:

```text
gross = adjusted_base + adjusted_remote_allowance + adjusted_fixed_bonus + bonus_otd + bonus_rpa
net = gross
```

Provider/local compliance remains outside Greenhouse unless a jurisdiction-specific engine is added.

## Offboarding — temporal eligibility, review and lifecycle writeback (TASK-1349, LIVE en producción 2026-09-03)

Code paths:

- Resolver: `src/lib/payroll/exit-eligibility/query.ts` (governing case per member+period), `policy.ts` (pure `derivePolicy`), `calculation-gate.ts` (`evaluateExitReviewGate`/`collectUnresolvedExitMemberIds`), `flag.ts` (`isPayrollExitEligibilityWindowEnabled`), `index.ts`.
- Gate consumers: `src/lib/payroll/payroll-readiness.ts` (blocking codes `unresolved_exit_signal` / `exit_eligibility_unavailable`), `src/lib/payroll/calculate-payroll.ts` (409 with the same codes).
- Offboarding review: `src/lib/workforce/offboarding/review-policy.ts` (`deriveOffboardingCaseReview`, pure — decision `access_only`|`relationship_ended`, `reason` >= 10 chars, `expectedUpdatedAt` mandatory), `store.ts` (`reviewOffboardingCase`, tx + audit + outbox), `review-preview.ts` (preview before write), `state-machine.ts` (`assertOffboardingTransition`, `isTerminalOffboardingStatus` — an `identity_only` case cannot advance without a review; reviewed `access_only` fast-tracks to `executed`), `member-lifecycle.ts` (`applyOffboardingLifecycleEffects`, gated by `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`), `exit-facts.ts` (`findExecutedRealExitForMember` — anti-resurrection guard consumed by SCIM re-activation and the BigQuery canonical-360 backfill).
- Routes: `POST /api/hr/offboarding/cases/[caseId]/review` + `.../review/preview`; app-lane parity `src/lib/api-platform/resources/app-hr-offboarding-case-review.ts` + `src/app/api/platform/app/hr/offboarding/cases/[caseId]/review[/preview]/route.ts`.
- Capability: `workforce.offboarding.review_case` (execute, tenant scope) — HR route group ∪ EFEONCE_ADMIN; seeded by `migrations/20260903150515261_task-1349-offboarding-review-capability-seed.sql`.
- Signals (module `identity`, steady state 0): `src/lib/reliability/queries/offboarding-exit-drift.ts` — `hr.offboarding.unresolved_exit_signal`, `hr.offboarding.executed_member_still_active`, `workforce.offboarding.deprovisioned_member_without_case`.
- Recovery: `scripts/workforce/offboarding-recovery.ts` (`pnpm workforce:offboarding:recovery`, dry-run by default; `--apply` requires an explicit `--member` allowlist).
- `hasDecidedExitFact` (`policy.ts`) requires `exitLane !== 'identity_only'` since `0233f81e7` (PR #220): an executed access-only case never rescues an inactive member (`exclude_entire_period` + `inactive_without_exit_fact`); cases in `policy.test.ts`.
- Live smoke `src/lib/workforce/offboarding/review-execute.live.test.ts` (subjects `TASK-1349 live …` / `t1349-…@efeoncepro.com`): `afterAll` closes compensation (`effective_to = effective_from`) and deactivates users/members. Orphans from a failed run: `scripts/workforce/purge-task1349-live-subjects.sql` (aborts on any non-synthetic member).

- Shared reentry semantics: `src/lib/workforce/offboarding/reentry-predicates.ts` → executor `findReentryAfterExit`, drift detector, discovery `reentry_preserved`. Relationship types are employee/contractor/executive; engagement statuses active/paused/ending, profile-or-member anchored; start strictly after LWD and <= today, end inclusive >= today or null. The executor's guard protects availability after its historical compensation closure; it does not replace payroll period eligibility.
- Compensating recovery: `src/lib/workforce/offboarding/lifecycle-recovery.ts` (`restoreOffboardingLifecycleAfterReentry`, `hashLifecycleRecoverySnapshot`) + `scripts/workforce/restore-offboarding-lifecycle.ts --plan-file <private-json> [--apply]`. No UI/API recovery surface is introduced. Admin grant, exact snapshot/timestamps/hash and same-entity later active workforce relationship are checked transactionally. Audit `offboarding_case.lifecycle_writeback_reverted`, member/assignment events and writes commit together; same request/key is idempotent.
- Downstream safety: `src/lib/account-360/person-legal-entity-relationships.ts` prevents member activation reopening ended employee history. `src/lib/team-admin/mutate-team.ts` keeps canonical source IDs and member/outbox writes atomic. Both Vercel reactive routes and the worker must run the corrected consumer before applying a recovery.
- Verification: behavioral tests in `member-lifecycle.test.ts`, `lifecycle-recovery.test.ts`, `mutate-team.test.ts`, `person-legal-entity-relationships.test.ts`; SQL semantics in `reentry-predicates.live.test.ts` use read-only CTE fixtures through `pnpm test:live`. A production canary reads exact event processing and compares protected objects after convergence; tests are not operational mutations.

Dated execution evidence lives in `docs/audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md`; current flags in `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. The incident is repaired and its consumer canary/release documented. Do not infer another person's recovery status from that result. Repeatable procedure: `docs/operations/runbooks/workforce-reentry-recovery.md`.

## Known Audit Watchlist As Of 2026-05-01

Re-check before approving Payroll changes:

1. `SII_RETENTION_RATES[2026]` should stay aligned with SII boletas honorarios. SII publishes 15.25 percent from January 1, 2026.
2. Fixed-term Seguro de Cesantia should charge worker 0 percent and employer 3 percent.
3. AFP, health, cesantia, SIS, and mutual calculations must apply legal caps where available.
4. `computeChileTax()` missing brackets cannot be accepted as valid zero tax for Chile dependent payroll.
5. Manual compensation AFP rates can override synced rates. Verify whether compensation-stored rates are intentionally pinned or stale.
6. `honorarios` suppresses attendance and KPI requirements in readiness. That is correct for current model, but classification must be audited if the work relationship looks dependent.
7. Deel and international entries can still require ICO KPI when variable bonuses are configured. Do not skip KPI just because payroll is international.

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
