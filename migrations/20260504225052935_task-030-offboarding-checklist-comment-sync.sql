-- Up Migration
COMMENT ON COLUMN greenhouse_hr.work_relationship_offboarding_cases.legacy_checklist_ref IS
  'Compatibility/audit reference for legacy checklist payloads. TASK-030 runtime checklists now live in greenhouse_hr.onboarding_instances and may link via onboarding_instances.offboarding_case_id.';

-- Down Migration
COMMENT ON COLUMN greenhouse_hr.work_relationship_offboarding_cases.legacy_checklist_ref IS
  'Optional reference to future/legacy HRIS checklist runtime. Nullable-by-json because TASK-030 checklist tables are documented but not deployed.';
