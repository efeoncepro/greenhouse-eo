# Notion API — Rate Limits canonical

> **Source**: https://developers.notion.com + community observation
> **Last verified**: 2026-05-17

## 1. Límites canonical

| Métrica | Valor | Notas |
|---|---|---|
| Sustained rate | **~3 requests/second** average per integration | Notion documenta "average rate of 3 requests per second" |
| Burst capacity | ~5-10 req/sec en burst corto | No documentado exact — observación community |
| Response 429 → Retry-After header | Devuelve segundos a esperar | Standard HTTP |
| Per-user (PAT) vs Per-integration | Per integration token | PAT cuenta al user que lo creó |

## 2. Headers de rate limit

Notion **NO expone headers proactivos** tipo `X-RateLimit-Remaining`. Solo te enteras del límite cuando recibes 429.

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3
```

→ Implicación canonical: design defensivo. Asume 3 req/sec hard cap y throttle upstream.

## 3. Pattern canonical Greenhouse — Cloud Tasks throttling

Para writeback (TASK-901) y cualquier batch operation a Notion:

```bash
# services/ops-worker/deploy.sh
gcloud tasks queues create notion-writeback \
  --location=us-east4 \
  --max-dispatches-per-second=2.5 \    # safety margin under 3
  --max-concurrent-dispatches=5 \
  --max-attempts=5 \
  --max-retry-duration=24h \
  --min-backoff=2s \
  --max-backoff=300s
```

**Reglas canonical**:
- `max_dispatches_per_second: 2.5` (NUNCA 3.0 — sin headroom)
- `max_concurrent_dispatches: 5` (limit horizontal explosion)
- `max_attempts: 5` con exponential backoff
- Dead letter queue dedicada (`notion-writeback-dead-letter`)

## 4. 429 handling canonical

```typescript
const callNotionWithRetry = async (request: () => Promise<Response>) => {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await request()

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5', 10)
      const jitterMs = Math.random() * 1000
      const waitMs = retryAfter * 1000 + jitterMs

      captureWithDomain(
        new Error(`notion_rate_limited: attempt=${attempt} retry_after=${retryAfter}`),
        'integrations.notion',
        { tags: { source: 'rate_limit_429' } }
      )

      await new Promise(r => setTimeout(r, waitMs))
      continue
    }

    return response
  }

  throw new Error('notion_rate_limited_max_attempts_exceeded')
}
```

**Reglas canonical**:
- **SIEMPRE** respeta `Retry-After` (si presente)
- **AÑADE jitter** (random 0-1s) para evitar thundering herd entre múltiples workers
- **CAP retries** a 5 — más allá manda a dead letter
- **EMIT signal** cuando 429 se hits (reliability surface)

## 5. Cuándo NO necesitas throttling

- Read-only single-page requests (1-5 req per operation) → directo OK
- Discovery / exploration scripts manuales → 1-2 segundos delay manual basta
- Webhook handler que responde el inbox INSERT — eso es 0 calls Notion (defer al reactive consumer)

## 6. Cuándo SÍ necesitas throttling

- Cualquier batch operation > 5 requests
- Cualquier path productivo automatizado
- Backfill histórico (TASK-901 S8: 3,200 PATCHes Sky)
- Nightly reconciliation Job

## 7. Estimaciones canonical para TASK-901

### Steady-state runtime
- Operador edits 1 task → 1 webhook → 1 PATCH writeback
- Sky tiene ~500 tasks activas, ~10-30 edits/día → ~30 PATCHes/día → trivial
- Efeonce similar → trivial

### Backfill histórico (S8)
- 3,200 tareas Sky desde Aug 2025
- 3,200 PATCHes / 2.5 req/sec = ~21 min wall time
- Idempotente — re-runable

### Nightly reconciliation (S7)
- Scan tareas con `last_edited_time > checkpoint AND last_edited_by != integration`
- Worst case: 500 tareas updated en 24h → 200 PATCHes recompute → ~80 sec wall time

## 8. Workers + rate limits

Los **Notion Workers** (Beta) corren dentro de Notion runtime. **No queda claro al 2026-05-17** si tienen su propio rate limit budget separado o cuentan al global de la integration. Investigation gap registrado en `investigation-gaps/workers-production-readiness.md`.

## 9. Anti-patterns canonical

| Anti-pattern | Por qué |
|---|---|
| `Promise.all([...500 requests])` sin throttling | Garantizado 429 + dead letter |
| Inline retry loop sin backoff | Saturas el rate limit, peor |
| Ignore `Retry-After` | Notion penaliza con backoff aún más largo |
| Mismo token cross-services sin coordinación | Todos comparten 3 req/sec — colisiones |
| Webhook handler que hace 5+ API calls síncronos | Timeout garantizado, retries |

## 10. Cross-refs

- `api-reference/error-handling.md` — status code matrix
- `patterns-canonical/rate-limit-handling.md` (stub) — pattern detallado con backoff math
- `patterns-canonical/bulk-patch-batching.md` — Cloud Tasks queue setup canonical
- CLAUDE.md § "Cloud Run ops-worker" — pattern Cloud Scheduler + Cloud Tasks
