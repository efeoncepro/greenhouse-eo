-- Up Migration

-- TASK-471 slice 5 — Maker-checker approval queue para cambios críticos
-- del pricing catalog. Inserts llegan desde los edit drawers cuando el
-- validator central (pricing-catalog-constraints.ts) + criticality detector
-- determinan que el cambio tiene blast radius medium/high/critical.
-- Solo las propuestas `low` bypass la queue y aplican directo.

CREATE TABLE IF NOT EXISTS greenhouse_commercial.pricing_catalog_approval_queue (
  approval_id TEXT PRIMARY KEY DEFAULT ('pcapr-' || replace(gen_random_uuid()::text, '-', '')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_sku TEXT,
  proposed_changes JSONB NOT NULL,
  proposed_by_user_id TEXT NOT NULL,
  proposed_by_name TEXT NOT NULL,
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by_user_id TEXT,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  criticality TEXT NOT NULL,
  CONSTRAINT pricing_catalog_approval_queue_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled')
  ),
  CONSTRAINT pricing_catalog_approval_queue_criticality_check CHECK (
    criticality IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT pricing_catalog_approval_queue_proposed_changes_check CHECK (
    jsonb_typeof(proposed_changes) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS idx_pricing_catalog_approval_queue_status
  ON greenhouse_commercial.pricing_catalog_approval_queue (status, proposed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_catalog_approval_queue_entity
  ON greenhouse_commercial.pricing_catalog_approval_queue (entity_type, entity_id, proposed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_catalog_approval_queue_proposer
  ON greenhouse_commercial.pricing_catalog_approval_queue (proposed_by_user_id, proposed_at DESC);

COMMENT ON TABLE greenhouse_commercial.pricing_catalog_approval_queue IS
  'Maker-checker queue para cambios high/critical del pricing catalog (TASK-471 slice 5). Los low bypass y aplican directo; el resto espera revisión de un segundo efeonce_admin (enforced: proposer != reviewer).';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.idx_pricing_catalog_approval_queue_proposer;
DROP INDEX IF EXISTS greenhouse_commercial.idx_pricing_catalog_approval_queue_entity;
DROP INDEX IF EXISTS greenhouse_commercial.idx_pricing_catalog_approval_queue_status;

DROP TABLE IF EXISTS greenhouse_commercial.pricing_catalog_approval_queue;
