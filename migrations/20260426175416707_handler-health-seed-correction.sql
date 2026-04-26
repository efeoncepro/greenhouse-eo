-- Up Migration

-- 2026-04-26 — Re-seed handler_health from latest result, not historical
-- aggregate. The original seed (migration 20260426174236421) marked any
-- handler with active dead-letters as `failed`, which incorrectly painted
-- handlers whose LAST attempt succeeded as still broken — the dead-letters
-- were residue from bugs that had since been fixed (e.g. vat-ledger
-- $6 type fix, service_attribution_facts GRANT, quotation_pipeline
-- rejected_at column).
--
-- Canonical rule: a handler's CURRENT state is determined by its MOST
-- RECENT attempt. Historical dead-letters that have been superseded by
-- later successes are auto-recovered (mark recovered_at on the row, leave
-- the handler healthy). Active dead-letters that remain the latest attempt
-- keep the handler in failed state — that's the operator's signal to
-- investigate.
--
-- This migration is idempotent: re-deriving the seed from the log produces
-- the same result on every run.

WITH latest_per_handler AS (
  SELECT DISTINCT ON (handler)
         handler,
         result AS latest_result,
         reacted_at AS latest_at,
         error_class,
         error_family,
         event_id
    FROM greenhouse_sync.outbox_reactive_log
   ORDER BY handler, reacted_at DESC
),
counters AS (
  SELECT handler,
         COUNT(*) FILTER (WHERE result = 'dead-letter') AS total_dead_letters,
         MAX(reacted_at) FILTER (WHERE result LIKE 'success%' OR result LIKE 'coalesced%' OR result LIKE 'no-op%') AS last_success_at
    FROM greenhouse_sync.outbox_reactive_log
   GROUP BY handler
)
UPDATE greenhouse_sync.handler_health h
   SET current_state = CASE
         WHEN h.current_state = 'quarantined' THEN 'quarantined'  -- preserve manual quarantine
         WHEN l.latest_result = 'dead-letter' THEN 'failed'
         WHEN l.latest_result = 'retry' THEN 'degraded'
         ELSE 'healthy'  -- latest is success/coalesced/no-op/skipped
       END,
       consecutive_failures = CASE
         WHEN l.latest_result IN ('dead-letter','retry') THEN 1
         ELSE 0
       END,
       consecutive_successes = CASE
         WHEN l.latest_result IN ('dead-letter','retry') THEN 0
         ELSE 1
       END,
       last_failure_at = CASE
         WHEN l.latest_result IN ('dead-letter','retry') THEN l.latest_at
         ELSE h.last_failure_at
       END,
       last_success_at = c.last_success_at,
       last_error_class = CASE
         WHEN l.latest_result IN ('dead-letter','retry') THEN l.error_class
         ELSE h.last_error_class
       END,
       last_error_family = CASE
         WHEN l.latest_result IN ('dead-letter','retry') THEN l.error_family
         ELSE h.last_error_family
       END,
       last_event_id = l.event_id,
       last_dead_letter_event_id = CASE
         WHEN l.latest_result = 'dead-letter' THEN l.event_id
         ELSE h.last_dead_letter_event_id
       END,
       total_dead_letter_count = c.total_dead_letters,
       state_changed_at = NOW(),
       updated_at = NOW()
  FROM latest_per_handler l
  JOIN counters c ON c.handler = l.handler
 WHERE h.handler = l.handler;

-- Auto-recover dead-letter audit rows whose handler's LATEST result was a
-- success. The dead-letter is no longer active — the handler proved it can
-- process again. Recovery is non-destructive: row stays for forensics, just
-- leaves the active KPI count.
WITH recovered_handlers AS (
  SELECT DISTINCT ON (handler) handler, result AS latest_result
    FROM greenhouse_sync.outbox_reactive_log
   ORDER BY handler, reacted_at DESC
)
UPDATE greenhouse_sync.outbox_reactive_log r
   SET recovered_at = NOW()
  FROM recovered_handlers rh
 WHERE r.handler = rh.handler
   AND r.result = 'dead-letter'
   AND r.acknowledged_at IS NULL
   AND r.recovered_at IS NULL
   AND (
     rh.latest_result LIKE 'success%'
     OR rh.latest_result LIKE 'coalesced%'
     OR rh.latest_result LIKE 'no-op%'
     OR rh.latest_result LIKE 'skipped%'
   );


-- Down Migration

-- Cannot reverse data corrections — the prior seed's assumptions were
-- based on lifetime aggregates that this migration intentionally drops.
-- A `down` would have to re-derive from raw log which is the SAME logic
-- as the up, so leave as no-op.
SELECT 1;
