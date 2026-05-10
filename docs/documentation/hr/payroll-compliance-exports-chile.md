# Payroll Compliance Exports Chile

Greenhouse can generate audited Chile compliance exports for closed payroll periods:

- Previred planilla (`/api/hr/payroll/periods/:periodId/export/previred`)
- LRE CSV (`/api/hr/payroll/periods/:periodId/export/lre`)

Both exports are read-only projections over `greenhouse_payroll.payroll_entries`. They never mutate entries,
periods, payment orders or settlements.

Previred is a regulatory projection, not a receipt clone. It keeps worker identity, closed entry context and
taxable bases from payroll, but resolves period-sensitive statutory fields from the canonical payroll snapshots:

- AFP rate: `greenhouse_payroll.chile_afp_rates`
- SIS rate and monthly IMM/minimum taxable income: `greenhouse_payroll.chile_previred_indicators`
- Employment schedule/jornada: `greenhouse_core.members.employment_type`
- Isapre obligatory amount: 7% of taxable base; the difference against the pactada amount is emitted as additional.
- Regulatory taxable bases: full-time entries use at least the period IMM for Previred statutory bases, while the
  payroll receipt keeps the closed entry amounts untouched.
- AFC employee/employer split: derived from `contract_type_snapshot`.
- Previred worked days: emitted as 30 in V1 unless a future movement-of-personnel profile explicitly declares a
  supported movement for the period; attendance working days remain in payroll receipts/LRE.
- ISL/accident contribution: calculated with the canonical Chile accident insurance rate and emitted in the ISL
  fields unless a future profile explicitly models a supported mutual code.

This preserves auditability without overwriting the payroll receipt amounts. If a required periodized rate or
jornada is missing, Previred export fails closed instead of inventing a value.

Required state:

- Payroll period status is `approved` or `exported`.
- Entry is Chile dependent internal: `pay_regime='chile'`, `payroll_via='internal'`, `contract_type_snapshot IN ('indefinido','plazo_fijo')`.
- Collaborator has verified `CL_RUT` in Person Legal Profile.
- Operator has `hr.payroll.export_previred` or `hr.payroll.export_lre`.

Audit trail:

- Metadata is inserted in `greenhouse_payroll.compliance_export_artifacts`.
- Outbox events are emitted as `payroll.export.previred_generated` and `payroll.export.lre_generated`.
- Person Legal Profile snapshots write `export_snapshot` audit entries when RUT is read.

Known V1 boundary:

`TASK-707a` is still required for full parity with the canonical `payment_order` social_security runtime. Until then,
Previred parity is enforced against the generated compliance projection and closed payroll entries.
