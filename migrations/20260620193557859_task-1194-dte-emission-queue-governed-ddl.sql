-- Up Migration

SET search_path = public;

-- TASK-1194 Slice 0: DTE retry queue is governed infrastructure.
-- Runtime must not create or alter this table; migrations own DDL.

CREATE TABLE IF NOT EXISTS greenhouse_finance.dte_emission_queue (
  queue_id      TEXT PRIMARY KEY,
  income_id     TEXT NOT NULL,
  requested_by  TEXT NOT NULL,
  dte_type_code TEXT NOT NULL DEFAULT '33',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'emitting', 'emitted', 'failed', 'retry_scheduled', 'dead_letter')),
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 3,
  last_error    TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dte_queue_income_unique UNIQUE (income_id, status)
);

CREATE INDEX IF NOT EXISTS idx_dte_queue_pending
  ON greenhouse_finance.dte_emission_queue (status, next_retry_at)
  WHERE status IN ('pending', 'retry_scheduled');

ALTER TABLE greenhouse_finance.dte_emission_queue OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_finance TO greenhouse_app, greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.dte_emission_queue TO greenhouse_app, greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_finance.dte_emission_queue TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_finance.dte_emission_queue IS
  'Governed retry queue for failed or deferred DTE emissions. DDL is migration-owned; runtime may only enqueue, claim and mark queue items.';

-- Down Migration

SET search_path = public;

-- No destructive rollback. This queue can carry operational retry/dead-letter
-- evidence. Reverting code is sufficient to restore prior runtime behavior;
-- dropping the table would risk losing emission recovery state.
