# International And Remote Payroll Reference

Greenhouse supports remote and international compensation, but it is not a universal global payroll/tax engine. Treat this reference as operational guidance for auditing Efeonce data and Greenhouse behavior.

## Greenhouse Contract Model

From `src/types/hr-contracts.ts`:

- `contractor`: `payRegime = international`, `payrollVia = deel`
- `eor`: `payRegime = international`, `payrollVia = deel`
- `indefinido`: `payRegime = chile`, `payrollVia = internal`
- `plazo_fijo`: `payRegime = chile`, `payrollVia = internal`
- `honorarios`: `payRegime = chile`, `payrollVia = internal`

Remote allowance policy:

- Allowed for `indefinido`, `plazo_fijo`, `contractor`, and `eor`.
- Not allowed for `honorarios` in current Greenhouse policy.

Schedule policy:

- Required for `indefinido` and `plazo_fijo`.
- Optional/overridable for `honorarios`, `contractor`, and `eor`.

## Deel/EOR Boundary

For `eor`:

- Deel/provider may be the legal employer.
- Greenhouse should store compensation, bonus, and operational payroll snapshot.
- Statutory tax/social-security calculation should stay with the provider or a jurisdiction-specific engine.
- Greenhouse should not apply Chile deductions unless the worker is actually in Chile dependent payroll.

For `contractor`:

- Deel/provider may manage contractor agreement, invoices, and payout.
- Greenhouse can calculate operational gross/net reference and KPI bonuses.
- Local tax withholding depends on worker jurisdiction and provider setup, not Chile payroll assumptions.

Audit questions:

- Does `deelContractId` exist and match the current provider contract?
- Is `payrollVia = deel` for `contractor`/`eor`?
- Are currency and amount source explicit?
- Are provider-paid benefits/fees excluded from employee net unless intentionally modeled?
- Are variable bonuses sourced from ICO when configured?

## International Internal Exceptions

If a worker is `payRegime = international` but `payrollVia = internal`, treat it as an exception requiring explicit documentation:

- Which legal entity pays?
- Which country/jurisdiction applies?
- Is the worker employee, contractor, or vendor?
- Who is responsible for withholding, social security, benefits, paid leave, and termination obligations?
- Is Greenhouse acting as system of record or only a payout worksheet?

Do not silently add Chile deductions or assume gross equals compliant net for these cases.

## KPI ICO For International Workers

KPI ICO is vital for bonuses outside Chile too.

Rules:

- If `bonusOtdMax > 0` or `bonusRpaMax > 0`, KPI source data must exist before official calculation.
- Do not waive KPI because the worker is international or paid via Deel.
- Do not backfill KPI manually unless there is a documented business override and audit trail.
- If the provider pays the bonus, Greenhouse still needs a traceable operational amount for reconciliation.

## Currency And FX

Greenhouse currently keeps payroll entry currency explicit and does not silently convert.

Audit questions:

- Is the compensation currency correct (`CLP` vs `USD`)?
- Are reports aggregating CLP and USD separately or with a documented FX rate?
- If Finance needs CLP reporting, is FX sourced from the finance/economic-indicators layer?
- Are provider fees and taxes kept separate from worker gross/net?

## Remote Work Is Not A Payroll Regime

Remote work can apply to Chile dependent workers, honorarios, contractors, or EOR workers. It changes operational obligations and risk profile, but not by itself the tax/payroll regime.

For Chile telework:

- Written telework terms may be required.
- Right to disconnect applies to covered workers.
- Equipment/connectivity reimbursements must be modeled carefully so they are not confused with salary.

## Classification Red Flags

Escalate to legal/ops review when any of these appear:

- A contractor has fixed schedule, direct supervision, exclusivity, and tools/process control similar to an employee.
- A Chile resident is paid as international contractor without clear tax/provider setup.
- A Deel contractor has employee-like benefits managed by Efeonce instead of provider.
- A worker receives recurring fixed monthly amounts but has no valid compensation version or provider contract.
- Bonuses are paid outside Greenhouse while Greenhouse reports zero or no KPI dependency.
- The country of residence, legal employer, and payment currency do not align.

## Audit Output For International Workers

Report separately:

- `Greenhouse operational amount`: what Payroll records.
- `Provider/legal payroll amount`: what Deel/local payroll owns.
- `KPI-derived bonus`: amount and source snapshot.
- `Compliance unknowns`: jurisdiction-specific items not represented in Greenhouse.
- `Reconciliation action`: who must confirm provider invoice/payout/tax treatment.
