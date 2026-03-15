CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.postgres_outbox_events` (
  event_id STRING NOT NULL,
  aggregate_type STRING NOT NULL,
  aggregate_id STRING NOT NULL,
  event_type STRING NOT NULL,
  payload_json JSON,
  occurred_at TIMESTAMP NOT NULL,
  published_at TIMESTAMP NOT NULL,
  publish_run_id STRING NOT NULL
)
PARTITION BY DATE(occurred_at)
CLUSTER BY aggregate_type, event_type
OPTIONS(description = "Append-only stream of Postgres outbox events published from greenhouse_sync.outbox_events");
