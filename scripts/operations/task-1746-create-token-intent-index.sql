\set ON_ERROR_STOP on

-- TASK-1746 Slice 2A — run with the operations role before deploying the rotation-owner writers.
-- This is deliberately outside the transactional migration runner: CONCURRENTLY preserves
-- INSERT/UPDATE availability for every other email type while PostgreSQL builds the backstop.

SELECT (COUNT(*)>0) AS has_duplicates
  FROM (
    SELECT email_type,source_event_id,source_entity
      FROM greenhouse_notifications.email_deliveries
     WHERE email_type IN ('hiring_assessment_assigned','hiring_talent_pool_verification')
       AND source_event_id IS NOT NULL
       AND source_entity IS NOT NULL
     GROUP BY email_type,source_event_id,source_entity
    HAVING COUNT(*)>1
  ) duplicates
\gset

\if :has_duplicates
  \echo 'TASK-1746 blocked: duplicate token-sensitive delivery intents exist.'
  \quit 3
\endif

SELECT EXISTS (
  SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid=i.indexrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='greenhouse_notifications'
     AND c.relname='uq_email_deliveries_token_intent'
     AND (NOT i.indisvalid OR NOT i.indisready)
) AS invalid_index
\gset

\if :invalid_index
  \echo 'TASK-1746 blocked: uq_email_deliveries_token_intent exists but is INVALID. Drop it with DROP INDEX CONCURRENTLY and rerun this script.'
  \quit 4
\endif

SET lock_timeout='2s';
SET statement_timeout='15min';

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_email_deliveries_token_intent
  ON greenhouse_notifications.email_deliveries (email_type,source_event_id,source_entity)
  WHERE email_type IN ('hiring_assessment_assigned','hiring_talent_pool_verification')
    AND source_event_id IS NOT NULL
    AND source_entity IS NOT NULL;

SELECT (COUNT(*)>0) AS duplicate_groups_after_build
  FROM (
    SELECT email_type,source_event_id,source_entity
      FROM greenhouse_notifications.email_deliveries
     WHERE email_type IN ('hiring_assessment_assigned','hiring_talent_pool_verification')
       AND source_event_id IS NOT NULL
       AND source_entity IS NOT NULL
     GROUP BY email_type,source_event_id,source_entity
    HAVING COUNT(*)>1
  ) duplicates
\gset

\if :duplicate_groups_after_build
  \echo 'TASK-1746 blocked: duplicate intents appeared during index provisioning.'
  \quit 6
\endif

SELECT EXISTS (
  SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid=i.indexrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='greenhouse_notifications'
     AND c.relname='uq_email_deliveries_token_intent'
     AND i.indisunique AND i.indisvalid AND i.indisready
     AND i.indnkeyatts=3
     AND pg_get_indexdef(i.indexrelid,1,true)='email_type'
     AND pg_get_indexdef(i.indexrelid,2,true)='source_event_id'
     AND pg_get_indexdef(i.indexrelid,3,true)='source_entity'
     AND pg_get_expr(i.indpred,i.indrelid) LIKE '%hiring_assessment_assigned%'
     AND pg_get_expr(i.indpred,i.indrelid) LIKE '%hiring_talent_pool_verification%'
) AS index_contract_ok
\gset

\if :index_contract_ok
  \echo 'TASK-1746 token intent index is valid, ready, unique and contract-compatible.'
\else
  \echo 'TASK-1746 blocked: token intent index readback did not satisfy the expected contract.'
  \quit 5
\endif
