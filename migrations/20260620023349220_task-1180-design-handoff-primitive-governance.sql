-- Up Migration

-- TASK-1180 — Design Handoff x Design System Primitive Governance Loop.
--
-- Additive layer over TASK-1175:
-- - current primitive governance decision on the entry aggregate;
-- - append-only event for decision updates;
-- - implemented guard that blocks closure without a resolved DS strategy;
-- - fine-grained command capability.

ALTER TABLE greenhouse_core.design_handoff_entries
  ADD COLUMN IF NOT EXISTS implementation_strategy TEXT,
  ADD COLUMN IF NOT EXISTS primitive_key TEXT,
  ADD COLUMN IF NOT EXISTS primitive_variant TEXT,
  ADD COLUMN IF NOT EXISTS primitive_kind TEXT,
  ADD COLUMN IF NOT EXISTS primitive_lab_route TEXT,
  ADD COLUMN IF NOT EXISTS primitive_runtime_route TEXT,
  ADD COLUMN IF NOT EXISTS primitive_gvc_ref TEXT,
  ADD COLUMN IF NOT EXISTS primitive_docs_ref TEXT,
  ADD COLUMN IF NOT EXISTS primitive_rationale TEXT,
  ADD COLUMN IF NOT EXISTS primitive_decision_owner TEXT,
  ADD COLUMN IF NOT EXISTS primitive_decision_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS primitive_decision_updated_at TIMESTAMPTZ;

ALTER TABLE greenhouse_core.design_handoff_entries
  DROP CONSTRAINT IF EXISTS design_handoff_entries_implementation_strategy_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_primitive_lab_route_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_primitive_runtime_route_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_primitive_gvc_ref_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_primitive_implemented_strategy_check;

ALTER TABLE greenhouse_core.design_handoff_entries
  ADD CONSTRAINT design_handoff_entries_implementation_strategy_check
    CHECK (
      implementation_strategy IS NULL
      OR implementation_strategy IN (
        'route_only',
        'reuse_primitive',
        'extend_primitive',
        'new_primitive',
        'variant_kind',
        'research_required'
      )
    ),
  ADD CONSTRAINT design_handoff_entries_primitive_lab_route_check
    CHECK (
      primitive_lab_route IS NULL
      OR (
        primitive_lab_route LIKE '/%'
        AND primitive_lab_route NOT LIKE '%://%'
      )
    ),
  ADD CONSTRAINT design_handoff_entries_primitive_runtime_route_check
    CHECK (
      primitive_runtime_route IS NULL
      OR (
        primitive_runtime_route LIKE '/%'
        AND primitive_runtime_route NOT LIKE '%://%'
      )
    ),
  ADD CONSTRAINT design_handoff_entries_primitive_gvc_ref_check
    CHECK (
      primitive_gvc_ref IS NULL
      OR primitive_gvc_ref LIKE '.captures/%'
    ),
  ADD CONSTRAINT design_handoff_entries_primitive_implemented_strategy_check
    CHECK (
      status <> 'implemented'
      OR (
        implementation_strategy IS NOT NULL
        AND implementation_strategy <> 'research_required'
      )
    );

CREATE INDEX IF NOT EXISTS idx_design_handoff_entries_primitive_strategy
  ON greenhouse_core.design_handoff_entries (implementation_strategy, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_design_handoff_entries_primitive_key
  ON greenhouse_core.design_handoff_entries (primitive_key)
  WHERE primitive_key IS NOT NULL;

ALTER TABLE greenhouse_core.design_handoff_entry_events
  DROP CONSTRAINT IF EXISTS design_handoff_entry_events_event_type_check;

ALTER TABLE greenhouse_core.design_handoff_entry_events
  ADD CONSTRAINT design_handoff_entry_events_event_type_check
    CHECK (
      event_type IN (
        'registered',
        'transitioned',
        'archived',
        'allowlist_upserted',
        'allowlist_deprecated',
        'owner_assigned',
        'planning_updated',
        'work_item_linked',
        'evidence_attached',
        'figma_node_verified',
        'primitive_decision_updated'
      )
    );

CREATE OR REPLACE FUNCTION greenhouse_core.validate_design_handoff_entry_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_implementation_evidence boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'archived' THEN
    RAISE EXCEPTION 'design_handoff_entries status archived is terminal'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.status = 'archived' THEN
    NEW.archived_at := COALESCE(NEW.archived_at, NOW());
    RETURN NEW;
  END IF;

  IF OLD.status = 'proposed' AND NEW.status = 'in_implementation' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_implementation' AND NEW.status = 'in_review' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_review' AND NEW.status = 'implemented' THEN
    SELECT EXISTS (
      SELECT 1
      FROM greenhouse_core.design_handoff_entry_evidence evidence
      WHERE evidence.entry_id = NEW.entry_id
        AND evidence.evidence_type IN ('gvc_capture', 'runtime_route', 'manual_exception')
    ) INTO has_implementation_evidence;

    IF NOT has_implementation_evidence THEN
      RAISE EXCEPTION 'design_handoff_entries implemented requires runtime evidence'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.implementation_strategy IS NULL OR NEW.implementation_strategy = 'research_required' THEN
      RAISE EXCEPTION 'design_handoff_entries implemented requires a resolved primitive governance decision'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.implementation_strategy IN ('reuse_primitive', 'extend_primitive', 'new_primitive', 'variant_kind')
       AND (NEW.primitive_key IS NULL OR length(trim(NEW.primitive_key)) = 0) THEN
      RAISE EXCEPTION 'design_handoff_entries primitive strategy requires primitive_key'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.implementation_strategy = 'variant_kind'
       AND (
         NEW.primitive_variant IS NULL OR length(trim(NEW.primitive_variant)) = 0
         OR NEW.primitive_kind IS NULL OR length(trim(NEW.primitive_kind)) = 0
       ) THEN
      RAISE EXCEPTION 'design_handoff_entries variant_kind requires primitive variant and kind'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.implementation_strategy = 'route_only'
       AND (NEW.primitive_rationale IS NULL OR length(trim(NEW.primitive_rationale)) = 0) THEN
      RAISE EXCEPTION 'design_handoff_entries route_only requires rationale'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.implementation_strategy IN ('extend_primitive', 'new_primitive')
       AND (NEW.primitive_lab_route IS NULL OR length(trim(NEW.primitive_lab_route)) = 0) THEN
      RAISE EXCEPTION 'design_handoff_entries primitive extension requires lab route'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.implementation_strategy = 'new_primitive'
       AND (
         NEW.primitive_docs_ref IS NULL OR length(trim(NEW.primitive_docs_ref)) = 0
         OR NEW.primitive_gvc_ref IS NULL OR length(trim(NEW.primitive_gvc_ref)) = 0
       ) THEN
      RAISE EXCEPTION 'design_handoff_entries new_primitive requires docs and GVC refs'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid design_handoff_entries transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

GRANT EXECUTE ON FUNCTION greenhouse_core.validate_design_handoff_entry_transition() TO greenhouse_runtime;

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, deprecated_at)
VALUES
  ('design_system.handoff.primitive_decision.manage',
   'design_system',
   ARRAY['update'],
   ARRAY['tenant'],
   'Registrar y actualizar la decisión de gobernanza Primitive/Variant/Kind de un handoff de producto.',
   NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL,
  introduced_at = COALESCE(greenhouse_core.capabilities_registry.introduced_at, NOW());

DO $$
DECLARE
  has_strategy_column boolean;
  cap_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'design_handoff_entries'
      AND column_name = 'implementation_strategy'
  ) INTO has_strategy_column;

  IF NOT has_strategy_column THEN
    RAISE EXCEPTION 'TASK-1180 anti pre-up-marker: implementation_strategy column was not created.';
  END IF;

  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'design_system.handoff.primitive_decision.manage'
    AND module = 'design_system'
    AND deprecated_at IS NULL;

  IF cap_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1180 anti pre-up-marker: primitive decision capability missing.';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'design_system.handoff.primitive_decision.manage';

DROP INDEX IF EXISTS greenhouse_core.idx_design_handoff_entries_primitive_key;
DROP INDEX IF EXISTS greenhouse_core.idx_design_handoff_entries_primitive_strategy;

ALTER TABLE greenhouse_core.design_handoff_entry_events
  DROP CONSTRAINT IF EXISTS design_handoff_entry_events_event_type_check;

ALTER TABLE greenhouse_core.design_handoff_entry_events
  ADD CONSTRAINT design_handoff_entry_events_event_type_check
    CHECK (
      event_type IN (
        'registered',
        'transitioned',
        'archived',
        'allowlist_upserted',
        'allowlist_deprecated',
        'owner_assigned',
        'planning_updated',
        'work_item_linked',
        'evidence_attached',
        'figma_node_verified'
      )
    );

CREATE OR REPLACE FUNCTION greenhouse_core.validate_design_handoff_entry_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_implementation_evidence boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'archived' THEN
    RAISE EXCEPTION 'design_handoff_entries status archived is terminal'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.status = 'archived' THEN
    NEW.archived_at := COALESCE(NEW.archived_at, NOW());
    RETURN NEW;
  END IF;

  IF OLD.status = 'proposed' AND NEW.status = 'in_implementation' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_implementation' AND NEW.status = 'in_review' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_review' AND NEW.status = 'implemented' THEN
    SELECT EXISTS (
      SELECT 1
      FROM greenhouse_core.design_handoff_entry_evidence evidence
      WHERE evidence.entry_id = NEW.entry_id
        AND evidence.evidence_type IN ('gvc_capture', 'runtime_route', 'manual_exception')
    ) INTO has_implementation_evidence;

    IF NOT has_implementation_evidence THEN
      RAISE EXCEPTION 'design_handoff_entries implemented requires runtime evidence'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid design_handoff_entries transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

ALTER TABLE greenhouse_core.design_handoff_entries
  DROP CONSTRAINT IF EXISTS design_handoff_entries_primitive_implemented_strategy_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_primitive_gvc_ref_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_primitive_runtime_route_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_primitive_lab_route_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_implementation_strategy_check;

ALTER TABLE greenhouse_core.design_handoff_entries
  DROP COLUMN IF EXISTS primitive_decision_updated_at,
  DROP COLUMN IF EXISTS primitive_decision_due_at,
  DROP COLUMN IF EXISTS primitive_decision_owner,
  DROP COLUMN IF EXISTS primitive_rationale,
  DROP COLUMN IF EXISTS primitive_docs_ref,
  DROP COLUMN IF EXISTS primitive_gvc_ref,
  DROP COLUMN IF EXISTS primitive_runtime_route,
  DROP COLUMN IF EXISTS primitive_lab_route,
  DROP COLUMN IF EXISTS primitive_kind,
  DROP COLUMN IF EXISTS primitive_variant,
  DROP COLUMN IF EXISTS primitive_key,
  DROP COLUMN IF EXISTS implementation_strategy;
