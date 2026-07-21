# Decision framework — Webhook vs Polling

> **Default canonical**: webhook con polling como nightly safety net
> **Last verified**: 2026-05-17

## 1. Score matrix

| Eje | Webhook | Polling | Ganador |
|---|---|---|---|
| Latency (edit → response) | < 2 min (aggregated events) | Equal al interval | Webhook |
| Cost per request | $0 (push) | N req × interval × cost-per-req | Webhook |
| Delivery guarantee | At-most-once (8 retries, 24h) | At-most-once por design | Tie |
| Setup complexity | Verification token flow + HMAC | Single endpoint poll loop | Polling |
| Maintenance overhead | Subscription lifecycle (manual UI) | Cron schedule (CLI managed) | Polling |
| Cross-environment | Endpoint URL stable required | Just env var change | Polling |
| Loss tolerance | At-most-once → puede perder | Re-discovers eventually | Polling |
| Observability | Per-event tracing | Per-cycle summary | Webhook |
| Rate limit pressure | Spike during burst edits | Smooth (controlled) | Polling |
| Backfill capability | NO native | NATIVE (poll histórico) | Polling |

## 2. Decision tree canonical

```
¿Latency matters (operator UX expects < 2 min)?
    └── SÍ → Webhook + polling como safety net
    └── NO → Polling solo OK

¿Workload is bursty (high write rate periods)?
    └── SÍ → Webhook (rate-friendly)

¿Need backfill or historical reconciliation?
    └── SÍ → Necesitas polling (webhook no provee history)

¿At-most-once delivery acceptable (puede perder eventos)?
    └── SÍ → Webhook
    └── NO → Webhook + polling reconciliation nightly

¿Setup complejo justifica? (HMAC + verification token + URL stability)
    └── Probablemente SÍ si vas a producción
```

## 3. Default canonical Greenhouse

**Webhook como primary + Polling nightly como safety net** — patrón TASK-901:

```
Webhook (primary, real-time):
  Notion edit → Vercel webhook → outbox → reactive consumer → writeback
  Latency: < 2 min p95

Polling nightly (safety net, 4 AM):
  Cloud Run Job scan Notion API "last_edited > checkpoint AND last_edited_by != us"
  Per page con drift detected → re-writeback
  Atrapa: webhooks perdidos (at-most-once delivery), eventos durante outage Notion API
```

## 4. Por TASK específico

### TASK-901 RpA writeback — **Webhook + Polling nightly**
- Real-time UX importa (operador edita → ve `[GH] RpA` actualizado < 2min)
- At-most-once delivery → nightly Job atrapa misses
- Backfill histórico (S8) = batch via Cloud Tasks, no polling continuo

### TASK-908 Status Transition Foundation — **Webhook + Polling nightly**
- Mismo pattern — capture transitions canonical en real-time + nightly reconciliation

### Legacy notion-bq-sync — **Polling daily**
- Sin webhook setup actual (legacy)
- Daily Cloud Scheduler @ 7:20 AM Santiago suficiente para sync conformed → BQ → PG
- Si futura TASK-577 evolution migra a webhook, considerar webhook + safety net

### Demo teamspace (TASK-910) — **Webhook + Polling nightly**
- Mismo pattern productivo aplicado a sandbox para validar end-to-end

## 5. Anti-patterns canonical

| Anti-pattern | Por qué prohibido |
|---|---|
| Webhook ONLY sin safety net | At-most-once = eventos perdidos sin detección |
| Polling cada 5 segundos | Saturas rate limit (3 req/sec sustained) |
| Polling sin checkpoint | Reprocesa toda la historia cada cycle |
| Múltiples webhooks → mismo handler sin dedup | Race conditions, multiplicación |
| Webhook handler hace compute pesado sync | Timeout garantizado (10s budget) |

## 6. Cross-refs

- `api-reference/webhooks-canonical.md` — webhook contract
- `use-cases-greenhouse/writeback-gh-metrics.md` — pipeline end-to-end con safety net
- `use-cases-greenhouse/read-pipeline-conformed.md` — polling daily legacy
- TASK-901 S7 (Greenhouse) — nightly reconciliation Cloud Run Job
