-- Up Migration

-- TASK-810 — Engagement Anti-Zombie DB Guard.
--
-- Discovery correction:
-- The original task proposed a CHECK constraint with EXISTS against
-- engagement_outcomes. PostgreSQL CHECK constraints cannot contain
-- subqueries, and a CURRENT_DATE-based CHECK would not revalidate rows just
-- because time passes. The canonical DB guard is therefore a trigger, aligned
-- with TASK-765 payment_orders anti-zombie trigger.
--
-- Invariant:
-- A non-regular engagement may not stay active beyond 120 days without an
-- outcome or lineage transition. The normal operator path is
-- /agency/sample-sprints/[serviceId]/outcome.

CREATE OR REPLACE FUNCTION greenhouse_core.assert_engagement_requires_decision_before_120d()
RETURNS TRIGGER AS $$
DECLARE
  has_decision_evidence BOOLEAN;
  days_since_start INT;
BEGIN
  -- Only Sample Sprints / non-regular engagements are in scope.
  IF NEW.engagement_kind = 'regular' THEN
    RETURN NEW;
  END IF;

  -- TASK-813 guard compatibility: archived, unmapped or inactive services are
  -- not operational engagements and should not create a dead end.
  IF NEW.active IS DISTINCT FROM TRUE
    OR NEW.status = 'legacy_seed_archived'
    OR NEW.hubspot_sync_status = 'unmapped' THEN
    RETURN NEW;
  END IF;

  -- Explicitly terminal services are not zombies.
  IF NEW.status IN ('cancelled', 'closed') THEN
    RETURN NEW;
  END IF;

  -- Pending approval or other non-active lifecycle states are monitored by
  -- dedicated reliability signals, not this hard guard.
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  -- Without a start date the 120-day invariant cannot be evaluated safely.
  IF NEW.start_date IS NULL THEN
    RETURN NEW;
  END IF;

  days_since_start := CURRENT_DATE - NEW.start_date::date;

  IF days_since_start <= 120 THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM greenhouse_commercial.engagement_outcomes o
    WHERE o.service_id = NEW.service_id
  ) OR EXISTS (
    SELECT 1
    FROM greenhouse_commercial.engagement_lineage l
    WHERE l.parent_service_id = NEW.service_id
       OR l.child_service_id = NEW.service_id
  )
  INTO has_decision_evidence;

  IF has_decision_evidence THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'services_engagement_requires_decision_before_120d: service=% lleva % dias activo sin outcome ni lineage; registra outcome en /agency/sample-sprints/%/outcome antes de actualizar',
    NEW.service_id,
    days_since_start,
    NEW.service_id
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_engagement_requires_decision_before_120d ON greenhouse_core.services;

CREATE TRIGGER services_engagement_requires_decision_before_120d
  BEFORE INSERT OR UPDATE ON greenhouse_core.services
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_engagement_requires_decision_before_120d();

COMMENT ON FUNCTION greenhouse_core.assert_engagement_requires_decision_before_120d() IS
  'TASK-810: DB guard anti-zombie para engagements non-regular activos >120d sin outcome ni lineage. Implementado como trigger porque PostgreSQL CHECK no admite subqueries.';

-- Down Migration

DROP TRIGGER IF EXISTS services_engagement_requires_decision_before_120d ON greenhouse_core.services;
DROP FUNCTION IF EXISTS greenhouse_core.assert_engagement_requires_decision_before_120d();
