-- ══════════════════════════════════════════════════════
-- TASK-008: Formalize Capacity Model
-- Adds contracted_hours_month to assignments for
-- 4-type capacity: contracted, assigned, used, available
-- ══════════════════════════════════════════════════════

-- 1. Add contracted_hours_month (baseline contractual per assignment)
ALTER TABLE greenhouse_core.client_team_assignments
  ADD COLUMN IF NOT EXISTS contracted_hours_month INTEGER;

COMMENT ON COLUMN greenhouse_core.client_team_assignments.contracted_hours_month IS
  'Baseline contractual hours per month for this assignment. If NULL, computed as fte_allocation * 160. Used for capacity planning: available = contracted - used.';

-- 2. Backfill: set contracted = fte * 160 where not already set
UPDATE greenhouse_core.client_team_assignments
SET contracted_hours_month = ROUND(fte_allocation * 160)
WHERE contracted_hours_month IS NULL
  AND active = TRUE;
