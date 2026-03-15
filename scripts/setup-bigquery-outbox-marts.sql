-- Outbox Analytical Marts
-- =====================================================
-- Views over greenhouse_raw.postgres_outbox_events
-- for analytics, dashboards, and domain-specific queries.
--
-- This script is idempotent. Safe to re-run.
-- =====================================================

-- ════════════════════════════════════════════════════════════
-- 1. Latest state per entity (generic)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW `__PROJECT_ID__.greenhouse_marts.outbox_entity_latest` AS
SELECT * EXCEPT(rn) FROM (
  SELECT
    event_id,
    aggregate_type,
    aggregate_id,
    event_type,
    payload_json,
    occurred_at,
    published_at,
    publish_run_id,
    ROW_NUMBER() OVER (
      PARTITION BY aggregate_type, aggregate_id
      ORDER BY occurred_at DESC
    ) AS rn
  FROM `__PROJECT_ID__.greenhouse_raw.postgres_outbox_events`
) WHERE rn = 1;

-- ════════════════════════════════════════════════════════════
-- 2. Event volume by type (dashboard)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW `__PROJECT_ID__.greenhouse_marts.outbox_event_volume` AS
SELECT
  aggregate_type,
  event_type,
  DATE(occurred_at) AS event_date,
  COUNT(*) AS event_count
FROM `__PROJECT_ID__.greenhouse_raw.postgres_outbox_events`
GROUP BY 1, 2, 3;

-- ════════════════════════════════════════════════════════════
-- 3. Finance accounts — latest state from outbox
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW `__PROJECT_ID__.greenhouse_marts.fin_accounts_from_outbox` AS
SELECT
  aggregate_id AS account_id,
  JSON_VALUE(payload_json, '$.accountName') AS account_name,
  JSON_VALUE(payload_json, '$.bankName') AS bank_name,
  JSON_VALUE(payload_json, '$.currency') AS currency,
  JSON_VALUE(payload_json, '$.accountType') AS account_type,
  JSON_VALUE(payload_json, '$.country') AS country,
  SAFE_CAST(JSON_VALUE(payload_json, '$.isActive') AS BOOL) AS is_active,
  SAFE_CAST(JSON_VALUE(payload_json, '$.openingBalance') AS FLOAT64) AS opening_balance,
  occurred_at AS last_event_at,
  event_type
FROM `__PROJECT_ID__.greenhouse_marts.outbox_entity_latest`
WHERE aggregate_type = 'finance_account';

-- ════════════════════════════════════════════════════════════
-- 4. Finance expenses — latest state from outbox
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW `__PROJECT_ID__.greenhouse_marts.fin_expenses_from_outbox` AS
SELECT
  aggregate_id AS expense_id,
  JSON_VALUE(payload_json, '$.memberId') AS member_id,
  JSON_VALUE(payload_json, '$.clientId') AS client_id,
  JSON_VALUE(payload_json, '$.expenseType') AS expense_type,
  JSON_VALUE(payload_json, '$.description') AS description,
  JSON_VALUE(payload_json, '$.currency') AS currency,
  SAFE_CAST(JSON_VALUE(payload_json, '$.totalAmount') AS FLOAT64) AS total_amount,
  SAFE_CAST(JSON_VALUE(payload_json, '$.totalAmountClp') AS FLOAT64) AS total_amount_clp,
  JSON_VALUE(payload_json, '$.paymentStatus') AS payment_status,
  JSON_VALUE(payload_json, '$.supplierName') AS supplier_name,
  occurred_at AS last_event_at,
  event_type
FROM `__PROJECT_ID__.greenhouse_marts.outbox_entity_latest`
WHERE aggregate_type = 'finance_expense';

-- ════════════════════════════════════════════════════════════
-- 5. Payroll entries — latest state from outbox
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW `__PROJECT_ID__.greenhouse_marts.payroll_entries_from_outbox` AS
SELECT
  aggregate_id AS entry_id,
  JSON_VALUE(payload_json, '$.memberId') AS member_id,
  JSON_VALUE(payload_json, '$.periodId') AS period_id,
  JSON_VALUE(payload_json, '$.currency') AS currency,
  SAFE_CAST(JSON_VALUE(payload_json, '$.grossTotal') AS FLOAT64) AS gross_total,
  SAFE_CAST(JSON_VALUE(payload_json, '$.netTotal') AS FLOAT64) AS net_total,
  occurred_at AS last_event_at,
  event_type
FROM `__PROJECT_ID__.greenhouse_marts.outbox_entity_latest`
WHERE aggregate_type = 'payroll_entry';
