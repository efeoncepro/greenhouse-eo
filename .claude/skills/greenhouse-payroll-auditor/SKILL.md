---
name: greenhouse-payroll-auditor
description: "Audit Efeonce/Greenhouse Payroll: Chile workers, honorarios, Deel/international, KPI ICO bonuses, readiness, calculations, exports, and compliance risk."
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
- `src/lib/payroll/exit-eligibility/policy.ts` + `calculation-gate.ts` — optional, when the task touches exits, temporal eligibility, or a period blocked by an unresolved exit (TASK-1349)
- `src/lib/workforce/offboarding/review-policy.ts` — optional, when the task touches offboarding review decisions (`access_only`/`relationship_ended`, TASK-1349)

## Supporting References

Load the smallest reference that matches the task:

- `references/chile-payroll-law.md`: Chile legal/payroll formula map and official source links.
- `references/greenhouse-payroll-runtime.md`: Greenhouse schema, code paths, formulas, known audit watchlist, and verification commands.
- `references/international-remote-payroll.md`: Remote/international worker regimes, Deel/EOR/contractor boundaries, and Efeonce audit posture.
- `../greenhouse-talent-people-operator/references/efeonce-candidate-benefits-charter.md`: approved candidate-facing global benefits baseline; use when an offer, agreement or provider instruction must reconcile public claims with payroll/leave implementation.
- `references/international-withholding-americas-sii.md`: SII discovery summary for `international_internal` withholding across Americas, including LIR Art. 59/60/74/79, treaty evidence gates, country matrix, and TASK-905 fail-closed posture.
- `references/international-withholding-europe-sii.md`: SII discovery summary for future Europe `international_internal` withholding, including European DTA list, MFN circular rate changes, MLI notes, territorial caveats, and fail-closed seed posture.

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

For `international_internal`, do not assume gross equals compliant net. If a Chile payer directly pays a non-resident, load `references/international-withholding-americas-sii.md` and, for European tax residence, `references/international-withholding-europe-sii.md` before approving calculation, readiness, receipts, or payment obligations. Europe is outside TASK-905 Americas V1 approved seed; Spain/Europe must resolve `needs_tax_review` until a Europe-specific catalog is legally approved. Never apply a treaty zero/reduced withholding rate without residence certificate, no-PE/base-fixed declaration, beneficiary eligibility, service category, period, and evidence snapshot.

## Leave and Anniversary Communication Reconciliation

Before approving or explaining vacation entitlement—especially for `contractor`, `eor`, or Deel profiles—reconcile all of these independently:

1. canonical `hire_date` in both BigQuery and PostgreSQL;
2. `contract_type`, `pay_regime`, `payroll_via`, and jurisdiction;
3. the leave policy actually selected by the resolver;
4. materialized allowance, used, reserved, and current balance;
5. the applicable agreement, provider rules, and candidate benefits charter;
6. the exact case-specific instruction or communication, if one exists.

Never substitute compensation `effective_from`, record creation time, or synchronization timestamps for `hire_date`. Updating `hire_date` does not prove that leave balances were recalculated. A sent message proves what was communicated, not what the runtime calculates or what the governing agreement grants.

If those layers disagree, document the drift and route the policy decision to People/Payroll/Legal before changing a balance or generalizing the case. Use `docs/audits/payroll/CONTRACTOR_VACATION_ANNIVERSARY_AUDIT_2026-08-25.md` as the source case.

## Offboarding review, temporal eligibility and lifecycle writeback (TASK-1349 — LIVE en producción 2026-09-03)

When the audit touches a departing/departed member — payroll eligibility for a partial month, readiness that blocks on an exit, or a member still `active=true` after leaving — this is a governed domain, not something to infer from `members.active` or SCIM.

- **Temporal eligibility resolver** (`src/lib/payroll/exit-eligibility/{query,policy,calculation-gate,index}.ts`): for each member+period it picks the governing offboarding case by temporal relevance (`COALESCE(last_working_day, effective_date, created_at::date) <= periodEnd`, decided cases first, latest episode), then derives a `projectionPolicy` (`full_period` | `partial_until_cutoff` | `exclude_from_cutoff` | `exclude_entire_period`). `members.active=false` alone is NEVER treated as a historical eligibility fact — an inactive member with a decided exit follows the cutoff (history preserved even for a month before the exit); inactive without any exit fact degrades to `exclude_entire_period` + warning `inactive_without_exit_fact`. A compensation version starting after a decided exit's cutoff (and on/before `periodEnd`) is a re-entry → `full_period` + info `reentry_after_prior_exit` (the prior exit does not govern the new episode). An unresolved case (`draft`/`needs_review`/`blocked`) whose signal date is `<= periodEnd` sets `reviewRequired=true` + blocking warning `unresolved_exit_signal` — the member is still projected (access alone never removes pay) but nobody may authorize calculation/approval until a human decides.
- **Calculation gate**: `src/lib/payroll/payroll-readiness.ts` surfaces the blocking codes `unresolved_exit_signal` / `exit_eligibility_unavailable` (resolver failed — a preview may degrade to the legacy roster, an official calculation/approval never silently includes everybody); `calculatePayroll()` (`src/lib/payroll/calculate-payroll.ts`) throws 409 with those same codes. Both gated by `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` — **ON in Production and staging**.
- **Offboarding review command** (`src/lib/workforce/offboarding/{store,review-policy,review-preview}.ts`, `reviewOffboardingCase`/`deriveOffboardingCaseReview`): turns an explicit human decision into persisted facts. Decision is `access_only` | `relationship_ended` — never inferred. `reason` requires >=10 chars, `expectedUpdatedAt` is mandatory (409 `offboarding_case_version_conflict` on a stale read), `relationship_ended` requires an explicit `separationType` from a closed enum (never `identity_only`/inferred) + `effectiveDate` + `lastWorkingDay`. The lane is recomputed via `resolveOffboardingLane`; a prior approval is invalidated unless the caller both requests `approveNow` and holds `hr.offboarding_case:approve`. Every review appends `offboarding_case.reviewed` (audit + outbox) inside one transaction.
- **State machine** (`src/lib/workforce/offboarding/state-machine.ts`): a case born `identity_only` (an access signal, e.g. SCIM deprovisioning) can NEVER be approved/scheduled/executed without a review first (409 `offboarding_case_review_required`) — an access signal is not a labor fact. Once reviewed `access_only`, the case fast-tracks straight to `executed` as informational (nothing to approve/schedule/settle).
- **Lifecycle executor** (`applyOffboardingLifecycleEffects`, `src/lib/workforce/offboarding/member-lifecycle.ts`): `access_only` is informational (touches nothing). A real exit refuses to execute over a future compensation version (409 `compensation_future_version_conflict`), closes compensation at the last working day, and — only behind `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` — ends the legal relationship with the REAL date BEFORE flipping `members.active=false`/`status='inactive'`, closes `client_team_assignments`, and publishes `member.deactivated` (`deactivationKind='offboarding_executed'`). Flag **ON in Production and staging** since 2026-09-03 (release `62356c9b7fd4`).
- **Ownership guard against resurrection** (`findExecutedRealExitForMember`, `src/lib/workforce/offboarding/exit-facts.ts`): once Greenhouse holds an EXECUTED real exit (lane <> `identity_only`, LWD in the past) for a member, neither SCIM re-activation by OID (`src/lib/scim/provisioning-internal-collaborator.ts`, outcome `linked_inactive_prior_exit`) nor the BigQuery canonical-360 backfill (`scripts/backfill-postgres-canonical-360.ts`) may flip `members.active` back to `true` — a genuine re-hire is a new episode through the governed intake/activation commands, never a silent resurrection.
- **Reliability signals** (module `identity`, steady state 0, `src/lib/reliability/queries/offboarding-exit-drift.ts`): `hr.offboarding.unresolved_exit_signal`, `hr.offboarding.executed_member_still_active` (ISSUE-117 shape — recover with the governed command, never SQL), `workforce.offboarding.deprovisioned_member_without_case` (an access deactivation with no offboarding case at all — detection only, never infer the labor exit).
- **Recovery**: `pnpm workforce:offboarding:recovery` (dry-run by default; `--apply --member <id> --decision relationship_ended --separation-type <causal> --reason "..." [--approve]` or `--decision access_only --access-revoked-on YYYY-MM-DD --reason "..."`). Never recover by SQL.

**LIVE STATE (2026-09-03):** released to production via `62356c9b7fd4` (PR #219, orchestrator run `33779259694`); both flags ON in Production and staging. The actual data recovery (Valentina/Luis/María Camila lifecycle backfill + stale SCIM stubs; Felipe as `relationship_ended` with a People-declared causal) is NOT applied yet — blocked by the permission classifier pending operator authorization on real-person data. Signals as of release: `unresolved_exit_signal=2`, `executed_member_still_active=3`, `deprovisioned_without_case=0`. September payroll readiness blocks by design on Felipe (`blocked`) and Maria Fernanda (`draft`, 07-29) until reviewed. Finance side-effect: June obligation 550.875 + SII (June/July) 99.125 for Felipe were generated in error — no `cancelPaymentObligation` command exists (only supersede), so this is a Finance dependency, never a direct SQL fix.

**Hard rules:**
- NEVER infer a labor exit from a SCIM/access-deprovisioning signal alone.
- NEVER approve/schedule/execute an `identity_only` case without a review first.
- NEVER use `members.active` as the historical payroll-eligibility filter (use the resolver).
- NEVER authorize a calculation/approval with an unresolved exit signal or a failed resolver.
- NEVER let SCIM/BQ backfill resurrect an executed real exit.
- NEVER recover offboarding/exit data by direct SQL — use the governed command/recovery script.
- NEVER treat an `unknown` closure-completeness layer as complete.
- ALWAYS run the focal suites (`pnpm vitest run src/lib/payroll src/lib/workforce/offboarding`) + the real-PG smoke when touching this domain.

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
- `pnpm typecheck` (NO bare `tsc --noEmit` — OOM bajo el Node 20 de Volta, ISSUE-104)
- `pnpm build`
- `pnpm staging:request /api/hr/payroll/periods/<periodId>/readiness --pretty`
- `pnpm staging:request POST /api/hr/payroll/periods/<periodId>/calculate '{}' --pretty`
- `pnpm test:e2e:setup`
- `pnpm exec playwright test tests/e2e/smoke/hr-payroll.spec.ts --project=chromium`
- `pnpm payroll:exit-eligibility:smoke` (TASK-1349 — exercises the resolver against real PG)
- `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED=true pnpm test:live src/lib/workforce/offboarding` (TASK-1349 — live review→execute circuit, synthetic subjects via the SCIM primitive)

## Output Format

For audits, answer with:

- `Decision`: pass, pass with warnings, block, or needs legal review.
- `Scope`: period, workers, entries, exports, or code paths reviewed.
- `Findings`: ordered by severity, with affected people/entries and file paths.
- `Formula Check`: formula used, inputs, source table/API, and observed delta.
- `Data Quality`: missing KPI, attendance, compensation, PREVIRED, ImpUnico, UF/UTM/IMM, or provider data.
- `Recommended Fix`: robust code/data/ops action, not a superficial patch.
- `Verification`: commands or runtime checks executed.
