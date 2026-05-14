-- Up Migration

-- TASK-872 Slice 1.5 — Workforce Intake Status gate canonical en members
--
-- Estado explícito de "ficha laboral pendiente" como gate ortogonal a active /
-- assignable / status. Resuelve la trampa latente identificada en arch-architect
-- review: defaults peligrosos `contract_type='indefinido' + pay_regime='chile'`
-- harían que un member SCIM-provisioned entre a la próxima corrida payroll con
-- $0 base sin este gate explícito.
--
-- Pattern canonical: enum estado explícito (TASK-813 hubspot_sync_status mirror).
-- Default 'completed' para legacy backward compat (todos los members existentes
-- continúan elegibles para payroll/staffing).
--
-- Consumer gate canonical (Slice 4): payroll engine reader
-- `getApplicableCompensationVersionsForPeriod` filtra
-- `WHERE workforce_intake_status = 'completed'` detrás del flag
-- `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` (default false → no-op operativo).

ALTER TABLE greenhouse_core.members
  ADD COLUMN IF NOT EXISTS workforce_intake_status TEXT NOT NULL DEFAULT 'completed'
  CHECK (workforce_intake_status IN ('pending_intake', 'in_review', 'completed'));

COMMENT ON COLUMN greenhouse_core.members.workforce_intake_status IS
  'TASK-872 — Gate explícito de ficha laboral. Default completed para legacy backward compat (todos los members existentes pre-migration retienen behaviour idéntico a hoy). SCIM-provisioned members nacen pending_intake. Transición a completed via admin endpoint POST /api/admin/workforce/members/[memberId]/complete-intake con capability workforce.member.complete_intake. Payroll/capacity/compensation/assignments readers filtran = completed antes de operar sobre el member.';

-- INDEX optimiza el hot-path: reader payroll filtra WHERE != 'completed' es raro
-- (esperado: pequeña población pending_intake). Partial index sobre NOT completed
-- captura el subset relevante para reliability signals.
CREATE INDEX IF NOT EXISTS members_workforce_intake_status_pending_idx
  ON greenhouse_core.members (workforce_intake_status, created_at)
  WHERE workforce_intake_status != 'completed';

-- Anti pre-up-marker check (CLAUDE.md migration markers regla)
DO $$
DECLARE
  col_exists boolean;
  legacy_count int;
  default_completed int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='greenhouse_core'
      AND table_name='members'
      AND column_name='workforce_intake_status'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-872 anti pre-up-marker: workforce_intake_status column NOT created on greenhouse_core.members. Migration markers may be inverted.';
  END IF;

  -- Backward compat verify: TODOS los members existentes deben quedar 'completed'
  -- por default. Si emerge un member con != 'completed' post-ALTER, algo está mal.
  SELECT COUNT(*) INTO legacy_count FROM greenhouse_core.members;
  SELECT COUNT(*) INTO default_completed
  FROM greenhouse_core.members
  WHERE workforce_intake_status = 'completed';

  IF legacy_count > 0 AND default_completed != legacy_count THEN
    RAISE EXCEPTION
      'TASK-872 backward compat violation: % legacy members but only % with workforce_intake_status=completed. Default DEFAULT clause did not apply correctly.',
      legacy_count, default_completed;
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.members_workforce_intake_status_pending_idx;
ALTER TABLE greenhouse_core.members DROP COLUMN IF EXISTS workforce_intake_status;
