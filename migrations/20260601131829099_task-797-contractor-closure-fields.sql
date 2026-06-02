-- Up Migration

-- TASK-797 — Contractor Closure + Transition Controls.
--
-- Closure es un lifecycle PROPIO del contractor (NUNCA finiquito laboral). Se
-- modela sobre el state machine existente del engagement (active/paused ->
-- ending -> ended; migration 20260529221452562) + estas columnas de metadata de
-- cierre. NO se crea tabla/aggregate aparte: el cierre es 1:1 con el engagement
-- y el audit ya vive en `contractor_engagement_events` (append-only trio TASK-790).
--
-- Boundary duro (TASK-890): el cierre contractor NUNCA dispara
-- `greenhouse_payroll.final_settlements`, NUNCA toca las lanes de
-- `work_relationship_offboarding_cases`, NUNCA reactiva una relación dependiente.
--
-- Columnas:
--   - closure_reason: causal canónica de cierre (CHECK enum cerrado). NUNCA usa
--     causales DT / documento de finiquito.
--   - closure_effective_date: fecha efectiva del cierre contractual.
--   - provider_termination_ref: ref de terminación del provider (solo carril
--     EOR/provider: payroll_via ∈ {deel,remote,oyster}). NULL para honorarios CL.
--   - closure_initiated_at/by: cuándo/quién marcó el engagement como `ending`
--     (winding-down: no se aceptan nuevas work submissions).
--   - closure_executed_at/by: cuándo/quién ejecutó el cierre final (`ended`).
--   - post_closure_invoices_allowed: política explícita de invoices post-cierre.
--     Default FALSE: tras `ended`, NO se crean payables salvo allowance explícito.

ALTER TABLE greenhouse_hr.contractor_engagements
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closure_effective_date DATE,
  ADD COLUMN IF NOT EXISTS provider_termination_ref TEXT,
  ADD COLUMN IF NOT EXISTS closure_initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_initiated_by TEXT,
  ADD COLUMN IF NOT EXISTS closure_executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_executed_by TEXT,
  ADD COLUMN IF NOT EXISTS post_closure_invoices_allowed BOOLEAN NOT NULL DEFAULT FALSE;

-- CHECK del enum de causal de cierre (cerrado, NUNCA causal DT de finiquito).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contractor_engagements_closure_reason_check'
  ) THEN
    ALTER TABLE greenhouse_hr.contractor_engagements
      ADD CONSTRAINT contractor_engagements_closure_reason_check
      CHECK (closure_reason IS NULL OR closure_reason IN (
        'contract_completed',
        'mutual_agreement',
        'contractor_resignation',
        'non_renewal',
        'terminated_for_cause',
        'converted_to_employee',
        'provider_terminated',
        'other'
      ));
  END IF;
END
$$;

-- Anti pre-up-marker bug guard: aborta si las columnas no quedaron creadas.
DO $$
DECLARE
  cols_present INTEGER;
  has_check BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO cols_present
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_hr'
    AND table_name = 'contractor_engagements'
    AND column_name IN (
      'closure_reason', 'closure_effective_date', 'provider_termination_ref',
      'closure_initiated_at', 'closure_initiated_by', 'closure_executed_at',
      'closure_executed_by', 'post_closure_invoices_allowed'
    );

  IF cols_present < 8 THEN
    RAISE EXCEPTION 'TASK-797 anti pre-up-marker: expected 8 closure columns on greenhouse_hr.contractor_engagements, got %', cols_present;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contractor_engagements_closure_reason_check'
  ) INTO has_check;

  IF NOT has_check THEN
    RAISE EXCEPTION 'TASK-797 anti pre-up-marker: closure_reason CHECK constraint was NOT created.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_hr.contractor_engagements
  DROP CONSTRAINT IF EXISTS contractor_engagements_closure_reason_check;

ALTER TABLE greenhouse_hr.contractor_engagements
  DROP COLUMN IF EXISTS closure_reason,
  DROP COLUMN IF EXISTS closure_effective_date,
  DROP COLUMN IF EXISTS provider_termination_ref,
  DROP COLUMN IF EXISTS closure_initiated_at,
  DROP COLUMN IF EXISTS closure_initiated_by,
  DROP COLUMN IF EXISTS closure_executed_at,
  DROP COLUMN IF EXISTS closure_executed_by,
  DROP COLUMN IF EXISTS post_closure_invoices_allowed;
