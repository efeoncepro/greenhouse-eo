# Payroll Compliance Exports Chile

Greenhouse can generate audited Chile compliance exports for closed payroll periods:

- Previred planilla (`/api/hr/payroll/periods/:periodId/export/previred`)
- LRE CSV (`/api/hr/payroll/periods/:periodId/export/lre`)

Both exports are read-only projections over `greenhouse_payroll.payroll_entries`. They never recalculate payroll and never mutate entries, periods, payment orders or settlements.

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

`TASK-707a` is still required for full parity with the canonical `payment_order` social_security runtime. Until then, Previred parity is enforced against `calculatePreviredEntryBreakdown` and closed payroll entries.

