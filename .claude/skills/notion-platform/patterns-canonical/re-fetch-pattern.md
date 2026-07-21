# Pattern canonical — Re-fetch antes de compute — STUB

> **Status**: STUB
> **Next review trigger**: TASK-901 Slice 4 reactive consumer implementation
> **Last verified**: 2026-05-17

## Context

**Regla absoluta canonical** (mirror SKILL.md hard rule #2): **NUNCA confiar payload de webhook como source of truth — siempre re-fetch desde Notion API antes de compute.**

Razones:
1. Webhook payload puede estar stale (aggregated events delay)
2. Payload no contiene values nuevos de properties (solo updated_properties array)
3. Race condition: edit posterior al webhook ya ocurrió entre delivery y processing
4. Backfill / replay scenarios — payload original puede ser obsolete

Pattern canonical:
```typescript
// Reactive consumer recibe outbox event
const event = await outbox.consume('notion.task.metrics_recompute_requested')

// Re-fetch (NO trust event.payload)
const page = await notion.pages.retrieve({ page_id: event.pageId })

// Extract canonical inputs from FRESH page
const inputs = extractCanonicalInputs(page)

// Compute con fresh data
const result = await calculateRpa(inputs)
```

Cuando TASK-901 S4 inicie, poblar con:
- Optimal re-fetch granularity (full page vs specific properties)
- Caching strategy (TTL si emerge)
- Trade-off re-fetch latency vs freshness
- Handling deleted pages (404 → mark in_trash en log)
- Handling permission revoked (403 → escalate)

## Cross-refs hoy

- `api-reference/webhooks-canonical.md` — payload limitations
- `use-cases-greenhouse/writeback-gh-metrics.md` — pipeline integration
- `anti-patterns-catalog.md` AP-08 — "Confiar payload"
