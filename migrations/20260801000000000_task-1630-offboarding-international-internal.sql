-- Up Migration

-- TASK-1630 — Keep Offboarding and the accepted international_internal
-- contract taxonomy aligned. The case remains in the existing
-- `internal_payroll` lane; its policy is handled by the canonical exit
-- eligibility resolver using the contract snapshot.

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  DROP CONSTRAINT IF EXISTS work_relationship_offboarding_case_contract_type_snapshot_check;

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  ADD CONSTRAINT work_relationship_offboarding_case_contract_type_snapshot_check
  CHECK (contract_type_snapshot IN (
    'indefinido',
    'plazo_fijo',
    'honorarios',
    'contractor',
    'eor',
    'international_internal',
    'unknown'
  ));

-- Down Migration

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  DROP CONSTRAINT IF EXISTS work_relationship_offboarding_case_contract_type_snapshot_check;

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  ADD CONSTRAINT work_relationship_offboarding_case_contract_type_snapshot_check
  CHECK (contract_type_snapshot IN (
    'indefinido',
    'plazo_fijo',
    'honorarios',
    'contractor',
    'eor',
    'unknown'
  ));
