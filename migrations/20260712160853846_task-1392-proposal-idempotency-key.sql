-- Up Migration

-- TASK-1392 Slice 2 (forward-fix additive) — idempotencia de creación para
-- orígenes SIN oportunidad pública (private_rfp / direct_sales): un retry del
-- command con la misma clave no duplica la Proposal. Para public_tender la
-- idempotencia ya la da la UNIQUE parcial de public_opportunity_id.
SET search_path TO public, greenhouse_commercial;

ALTER TABLE greenhouse_commercial.proposals
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_idempotency_key_unique
  ON greenhouse_commercial.proposals (owner_org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_commercial' AND table_name = 'proposals' AND column_name = 'idempotency_key'
  ) THEN
    RAISE EXCEPTION 'TASK-1392 anti pre-up-marker check: proposals.idempotency_key no quedó creada';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.proposals_idempotency_key_unique;
ALTER TABLE greenhouse_commercial.proposals DROP COLUMN IF EXISTS idempotency_key;
