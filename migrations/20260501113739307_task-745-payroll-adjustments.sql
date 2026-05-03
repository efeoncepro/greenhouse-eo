-- Up Migration

-- TASK-745 — Payroll Adjustments Foundation V1
-- Modelo event-sourced de ajustes de nomina con 3 kinds ortogonales:
-- exclude / gross_factor / fixed_deduction (+ manual_override de transicion).
-- Inmutabilidad via chain superseded_by. Maker-checker via status pending_approval.
-- Compliance Chile dependiente via trigger.

CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_adjustments (
  adjustment_id            TEXT PRIMARY KEY,
  payroll_entry_id         TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_entries(entry_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  member_id                TEXT NOT NULL,
  period_id                TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  kind                     TEXT NOT NULL CHECK (kind IN (
                             'exclude',
                             'gross_factor',
                             'gross_factor_per_component',
                             'fixed_deduction',
                             'manual_override'
                           )),
  payload                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_kind              TEXT NOT NULL DEFAULT 'manual' CHECK (source_kind IN (
                             'manual',
                             'recurring_schedule',
                             'finance_event',
                             'reliquidation_clone'
                           )),
  source_ref               TEXT,
  reason_code              TEXT NOT NULL,
  reason_note              TEXT NOT NULL CHECK (length(reason_note) >= 5),
  status                   TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
                             'pending_approval',
                             'active',
                             'reverted',
                             'superseded'
                           )),
  requested_by             TEXT NOT NULL,
  requested_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by              TEXT,
  approved_at              TIMESTAMPTZ,
  reverted_by              TEXT,
  reverted_at              TIMESTAMPTZ,
  reverted_reason          TEXT,
  superseded_by            TEXT REFERENCES greenhouse_payroll.payroll_adjustments(adjustment_id) DEFERRABLE INITIALLY DEFERRED,
  effective_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  version                  SMALLINT NOT NULL DEFAULT 1,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo 1 row 'pending_approval' o 'active' por (entry, kind, source_ref).
-- Permite reverted/superseded coexistir como historico.
CREATE UNIQUE INDEX IF NOT EXISTS payroll_adjustments_active_per_entry_kind_uniq
  ON greenhouse_payroll.payroll_adjustments (payroll_entry_id, kind, COALESCE(source_ref, ''))
  WHERE status IN ('pending_approval', 'active');

CREATE INDEX IF NOT EXISTS payroll_adjustments_entry_status_idx
  ON greenhouse_payroll.payroll_adjustments (payroll_entry_id, status);

CREATE INDEX IF NOT EXISTS payroll_adjustments_member_period_status_idx
  ON greenhouse_payroll.payroll_adjustments (member_id, period_id, status);

CREATE INDEX IF NOT EXISTS payroll_adjustments_reason_active_idx
  ON greenhouse_payroll.payroll_adjustments (reason_code)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS payroll_adjustments_source_ref_idx
  ON greenhouse_payroll.payroll_adjustments (source_kind, source_ref)
  WHERE source_ref IS NOT NULL;

-- Trigger compliance: Chile dependiente (indefinido / plazo_fijo) NO puede ser
-- excluido o tener factor=0 sin reason_code legal documentado.
CREATE OR REPLACE FUNCTION greenhouse_payroll.assert_chile_dependent_adjustment_compliance()
RETURNS TRIGGER AS $$
DECLARE
  v_pay_regime TEXT;
  v_contract_type TEXT;
  v_factor NUMERIC;
BEGIN
  -- Lee snapshots del entry (no joinea tabla externa)
  SELECT pe.pay_regime, pe.contract_type_snapshot
    INTO v_pay_regime, v_contract_type
    FROM greenhouse_payroll.payroll_entries pe
   WHERE pe.entry_id = NEW.payroll_entry_id;

  IF v_pay_regime = 'chile' AND v_contract_type IN ('indefinido', 'plazo_fijo') THEN
    -- Factor 0 cuenta como exclusion efectiva
    v_factor := NULL;
    IF NEW.kind = 'gross_factor' THEN
      v_factor := COALESCE((NEW.payload ->> 'factor')::NUMERIC, NULL);
    END IF;

    IF NEW.kind = 'exclude' OR (NEW.kind = 'gross_factor' AND v_factor = 0) THEN
      IF NEW.reason_code NOT IN ('leave_unpaid', 'unauthorized_absence', 'termination_pending') THEN
        RAISE EXCEPTION 'Chile dependent payroll cannot be excluded or zeroed without legal reason_code (leave_unpaid|unauthorized_absence|termination_pending). Got reason_code=%', NEW.reason_code
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payroll_adjustment_compliance_trigger ON greenhouse_payroll.payroll_adjustments;

CREATE TRIGGER payroll_adjustment_compliance_trigger
  BEFORE INSERT OR UPDATE OF kind, payload, reason_code
  ON greenhouse_payroll.payroll_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_payroll.assert_chile_dependent_adjustment_compliance();

-- Trigger updated_at automatico
CREATE OR REPLACE FUNCTION greenhouse_payroll.payroll_adjustments_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payroll_adjustments_updated_at_trigger ON greenhouse_payroll.payroll_adjustments;

CREATE TRIGGER payroll_adjustments_updated_at_trigger
  BEFORE UPDATE ON greenhouse_payroll.payroll_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_payroll.payroll_adjustments_set_updated_at();

COMMENT ON TABLE greenhouse_payroll.payroll_adjustments IS
  'TASK-745 - Event-sourced payroll adjustments. Each row is immutable once active; changes create new rows in superseded_by chain. See docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md.';

COMMENT ON COLUMN greenhouse_payroll.payroll_adjustments.kind IS
  'exclude=skip from calc; gross_factor=multiply natural gross by payload.factor; gross_factor_per_component=per-line factor map; fixed_deduction=subtract payload.amount from net; manual_override=force payload.netClp final.';

COMMENT ON COLUMN greenhouse_payroll.payroll_adjustments.source_kind IS
  'manual=human; recurring_schedule=auto from TASK-746 schedule; finance_event=triggered by finance projection; reliquidation_clone=cloned from v1 entry on reopen.';


-- Down Migration

DROP TRIGGER IF EXISTS payroll_adjustment_compliance_trigger ON greenhouse_payroll.payroll_adjustments;
DROP TRIGGER IF EXISTS payroll_adjustments_updated_at_trigger ON greenhouse_payroll.payroll_adjustments;
DROP FUNCTION IF EXISTS greenhouse_payroll.assert_chile_dependent_adjustment_compliance();
DROP FUNCTION IF EXISTS greenhouse_payroll.payroll_adjustments_set_updated_at();
DROP TABLE IF EXISTS greenhouse_payroll.payroll_adjustments;
