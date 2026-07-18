# Use case canonical — Writeback `[GH] <metric>` (TASK-901+)

> **Pipeline canonical end-to-end** para mover compute de métricas ICO desde formulas Notion → Greenhouse code + writeback automatic
> **TASK-901 V1.0**: RpA-only. TASK-902/903/904 V1.0: OTD/FTR/Cumplimiento progressive (mismo pattern)
> **Last verified**: 2026-05-17

## 1. El flow canonical end-to-end

```
[1] Operador edita status en Notion UI
     ↓ (page.properties_updated webhook event, ~30s-2min delay aggregated)
[2] POST /api/webhooks/notion-tasks (Vercel route handler thin)
     ↓ HMAC verify (capa 1)
     ↓ Echo-loop filter (capa 2 — drop si nuestro write)
     ↓ Property allowlist (capa 3 — drop si no es INPUT relevante)
     ↓ Inbox INSERT (capa 4 — idempotency on event_id UNIQUE)
     ↓ Emit outbox event 'notion.task.metrics_recompute_requested v1'
     ↓ Update inbox row outcome='outbox_emitted'
     ↓ Return 200 < 1s
[3] ops-outbox-publish (Cloud Scheduler @ */2 min)
     ↓ Publish pending events: outbox → BQ raw + mark 'published'
[4] Reactive consumer 'notion-metrics-writeback' (Cloud Scheduler ops-reactive-process @ */5 min)
     ↓ Filter by triggerEvents ['notion.task.metrics_recompute_requested']
     ↓ extractScope({ pageId, databaseId, metricName })
     ↓ refresh: recomputeAndEnqueueWriteback(scope)
         ↓ Re-fetch page from Notion API (NEVER trust webhook payload)
         ↓ Extract canonical inputs
         ↓ canonical helper: const result = await calculateRpa(inputs)
         ↓ Compute input_hash + check writeback_log (idempotency)
         ↓ If diff → enqueue Cloud Task to /notion-metrics/single-writeback
         ↓ Persist writeback_log row 'pending'
[5] Cloud Tasks "notion-writeback" queue (max 2.5 req/sec)
     ↓ POST /notion-metrics/single-writeback (en ops-worker)
[6] ops-worker endpoint (wrapCronHandler canonical)
     ↓ PATCH /v1/pages/{pageId} body { properties: { '[GH] RpA': { number } } }
     ↓ Notion-Version: 2026-03-11
     ↓ Update writeback_log row 'ok'
     ↓ Emit outbox 'notion.task.metrics_written v1'
[7] [Echo-loop guard at webhook]
     ↓ Notion dispara nuevo webhook page.properties_updated por nuestra escritura
     ↓ Capa 2 detect (event.authors[*].id === OUR_INTEGRATION_ID)
     ↓ Drop with outcome='echo_loop_dropped'
[8] Operador refresh Notion → ve '[GH] RpA' live actualizado
```

Latency típica end-to-end edit operador → visible Notion: **< 2 minutos**.

## 2. Defense in depth — 7 layers (TASK-742 pattern mirror)

| Capa | Defensa | Implementation |
|---|---|---|
| 1 | HMAC signature validation | `verifyNotionSignature` con timing-safe compare |
| 2 | Echo-loop filter (integration_id) | `detectEchoLoop(event, OUR_INTEGRATION_ID)` |
| 3 | Property allowlist | `INPUT_PROPS_ALLOWLIST` check |
| 4 | Inbox dedup (UNIQUE event_id) | `notion_webhook_inbox.event_id` constraint |
| 5 | Hash dedupe (writeback skip si igual) | `notion_metrics_writeback_log.input_hash` lookup |
| 6 | Capability check (admin endpoints) | `notion.metrics.recompute.manual` capability |
| 7 | Audit log append-only | `notion_metrics_writeback_log` trigger anti-update |

## 3. Tablas canonical

### `notion_metrics_writeback_log` (append-only audit + idempotency)

```sql
CREATE TABLE greenhouse_sync.notion_metrics_writeback_log (
  writeback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL,
  database_id TEXT NOT NULL,
  metric_name TEXT NOT NULL CHECK (metric_name IN ('rpa','otd','ftr','cumplimiento')),
  input_hash TEXT NOT NULL,         -- SHA-256 de canonical inputs JSON
  computed_values JSONB NOT NULL,
  formula_version TEXT NOT NULL,    -- 'rpa_v1.0', etc.
  writeback_status TEXT NOT NULL CHECK (
    writeback_status IN ('pending','ok','partial','failed','dead_letter','skipped_no_diff')
  ),
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,                  -- sanitized via redactSensitive
  triggered_by TEXT NOT NULL CHECK (
    triggered_by IN ('webhook','nightly_sweep','manual_admin','backfill')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  written_to_notion_at TIMESTAMPTZ
);

-- Partial UNIQUE INDEX — solo 1 active writeback por (page, metric)
CREATE UNIQUE INDEX writeback_log_active_per_page_metric
  ON greenhouse_sync.notion_metrics_writeback_log (page_id, metric_name)
  WHERE writeback_status IN ('pending','partial');

-- Anti-UPDATE trigger on identity fields
```

### `notion_webhook_inbox` (dedup + audit)

```sql
CREATE TABLE greenhouse_sync.notion_webhook_inbox (
  inbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,   -- dedup canonical
  event_type TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  database_id TEXT,
  page_id TEXT,
  payload_redacted JSONB NOT NULL,  -- post redactSensitive
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN (
    'outbox_emitted','echo_loop_dropped','allowlist_dropped','signature_invalid','error'
  ) OR outcome IS NULL)
);
```

## 4. Nightly safety net canonical

Webhooks pueden perderse (at-most-once delivery). Para cover gaps, Cloud Run Job nightly:

```
Cloud Scheduler ico-writeback-reconcile-daily @ 0 4 * * * America/Santiago
  ↓ POST /notion-metrics/reconcile-daily (Cloud Run Job separate, no Service)
[Job]
  ↓ Scan via Notion API: data sources con last_edited_time > checkpoint
  ↓ Filter: AND last_edited_by != OUR_INTEGRATION_USER_ID
  ↓ Per page: re-fetch + canonical helper compute + compare con last writeback_log
  ↓ If drift → enqueue Cloud Task → re-writeback
  ↓ Update checkpoint
```

Reliability signal: `notion.metrics.nightly_drift_detected` — count > 0 en última run = webhook missed events.

## 5. Reliability signals canonical (TASK-901 ships 6-7)

| Signal | Steady | Threshold |
|---|---|---|
| `notion.metrics.shadow_paridad_rpa` | paridad ≥ 95% | warning < 95%, error < 80% |
| `notion.metrics.writeback_dead_letter` | 0 | error si > 0 |
| `notion.metrics.writeback_lag` | p95 < 5min | warning > 5min, error > 30min |
| `notion.metrics.echo_loop_detected` | 0 | warning > 0 |
| `notion.metrics.webhook_signature_failures` | 0 | error > 0 |
| `notion.metrics.nightly_drift_detected` | 0 | warning > 0 |
| `notion.metrics.formula_version_drift` | 0 post-flip | warning > 0 |

Wire-up en `getReliabilityOverview` subsystem nuevo `Integrations · Notion · Metrics`.

## 6. Feature flags graduados canonical

3 flags gated:

| Flag | Default V1.0 | Cuándo flip |
|---|---|---|
| `NOTION_RPA_COMPUTE_SHADOW_ENABLED` | `false` | Post TASK-908 foundation verde + TASK-910 demo 4 sem verde |
| `NOTION_RPA_WRITEBACK_ENABLED` | `false` | Post 7d shadow ≥95% paridad + HR/Finance sign-off |
| Per-tenant override | per-tenant | Pilot Efeonce primero → Sky después de 30d verde Efeonce |

## 7. Rollback canonical

Si emerge bug post-flip:

```bash
# Disable writeback inmediato (env var + redeploy ~5min)
gcloud run services update ops-worker \
  --set-env-vars NOTION_RPA_WRITEBACK_ENABLED=false \
  --region us-east4

# Notion legacy formula RpA sigue computing (preservada 90d) — operadores no notan diff
# Investigar root cause + fix forward
```

Snapshot pre-flip BQ canonical `ico_engine_backup.metrics_by_*_<timestamp>` restorable < 1h si necesario rollback de data.

## 8. Hard rules canonical (mirror del SKILL.md global)

- **NUNCA** PATCH a Notion inline en webhook handler — siempre via outbox + Cloud Tasks defer
- **NUNCA** confiar payload webhook — siempre re-fetch
- **NUNCA** skipear capa 2 (echo-loop) — infinite loop garantizado
- **SIEMPRE** writeback_log row antes de invocar PATCH (audit trail completo)
- **SIEMPRE** captureWithDomain('integrations.notion', ...) — Sentry directo prohibido
- **NUNCA** flipping writeback flag sin shadow mode 7+ días verde

## 9. Cross-refs

- TASK-901 (Greenhouse) — spec completa
- TASK-908 (Greenhouse) — Status Transition Foundation (prerequisito calculateRpa)
- TASK-910 (Greenhouse) — Demo teamspace gate canonical
- `patterns-canonical/hmac-validation.md`
- `patterns-canonical/echo-loop-filter.md`
- `patterns-canonical/bulk-patch-batching.md`
- `greenhouse-runtime/property-allowlist.md`
- `greenhouse-runtime/tenant-config.md`
- `api-reference/webhooks-canonical.md`
