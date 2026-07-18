# Notion API — Error Handling canonical

> **Source**: https://developers.notion.com/reference/errors
> **Last verified**: 2026-05-17

## 1. Error object shape canonical

Todo error response retorna:

```jsonc
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "Human-readable detail",
  "request_id": "uuid"
}
```

**Crítico**: incluir `request_id` en cualquier log/Sentry capture — Notion support puede correlar incidents si tienes el ID.

## 2. Status codes + retryability

| Status | Code typical | Significado | Retryable? | Action canonical |
|---|---|---|---|---|
| 400 | `invalid_json`, `validation_error`, `invalid_request_url`, `invalid_request`, `validation_error`, `missing_version` | Tu request mal formado | **NO** | Fix code; capture Sentry; alert |
| 401 | `unauthorized` | Token inválido / revoked | **NO** | Rotate token; check Secret Manager |
| 403 | `restricted_resource` | Integration sin capability / no shared | **NO** | Share page con integration; review caps |
| 404 | `object_not_found` | Page/database deleted o `in_trash` o sin acceso | **NO** | Verify ID; check trash; verify shared |
| 409 | `conflict_error` | Concurrent modification | **SÍ** con backoff | Retry con jitter |
| 429 | `rate_limited` | Sustained > 3 req/sec | **SÍ** con `Retry-After` | Honor Retry-After + jitter |
| 500 | `internal_server_error` | Notion-side bug | **SÍ** con backoff | Retry exponencial |
| 502/503/504 | `service_unavailable`, `bad_gateway` | Notion infra issue | **SÍ** con backoff | Retry exponencial |

## 3. Decision tree canonical para retry

```typescript
const shouldRetryNotionError = (status: number, attemptNumber: number): boolean => {
  if (attemptNumber >= 5) return false  // hard cap

  // Definitely retryable
  if (status === 429 || status === 409) return true
  if (status >= 500 && status <= 599) return true

  // Definitely NOT retryable
  if (status >= 400 && status < 500) return false  // client errors

  // Default conservative
  return false
}
```

## 4. Pattern canonical de capture

```typescript
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

const callNotionSafe = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn()
  } catch (err) {
    const notionError = err as { status?: number; code?: string; request_id?: string; message?: string }

    captureWithDomain(
      err instanceof Error ? err : new Error(String(err)),
      'integrations.notion',
      {
        tags: {
          source: label,
          notion_status: String(notionError.status ?? 'unknown'),
          notion_code: notionError.code ?? 'unknown'
        },
        extra: {
          request_id: notionError.request_id,
          message: notionError.message
        }
      }
    )

    throw err  // re-throw para que el caller decida retry/dead-letter
  }
}
```

**Reglas canonical**:
- **SIEMPRE** `captureWithDomain(err, 'integrations.notion', ...)` — NUNCA `Sentry.captureException` directo
- **SIEMPRE** include `notion_status` + `notion_code` como tags para filtering Sentry
- **SIEMPRE** include `request_id` en extra para correlation con Notion support
- **NUNCA** loggees raw payload del request/response (puede contener PII property values)

## 5. Errores no documentados / silent failures

### Schema mismatch
- PATCH con property `X` que no existe en el data source → 400 `validation_error`
- PATCH a una property de tipo `formula` o `rollup` → 400 (read-only)
- PATCH con value shape inválido (ej. `number` con string) → 400

### Acceso silencioso
- Integration sin acceso a la page → 404 (no 403) — Notion no revela existencia
- Page archived → 404
- Page en trash → 404 (a menos que uses `in_trash: true` en query filter)

### Edge case relations
- `relation` con `id` que no existe en data source target → 400 `validation_error`
- `relation` con > 100 items (Notion cap) → 400

## 6. Errores específicos webhook

### Cuando Notion delivers webhook a tu endpoint
- Tu endpoint devuelve 4xx o 5xx → Notion reintenta con backoff (up to 8 attempts, 24h)
- Tu endpoint devuelve 2xx → marca como delivered

### Cuando llamas Notion API desde reactive consumer
- Tu Cloud Run/Worker se cae mid-process → outbox event queda `pending` → reactive consumer lo reintentará
- 5xx Notion mid-process → captura + re-throw → outbox state machine reintenta

## 7. Dead-letter pattern canonical (post 5 retries)

```typescript
// services/ops-worker/server.ts (TBD para TASK-901)
const handleNotionBulkWriteback = async ({ pageUpdates, runId }) => {
  const results = await Promise.allSettled(
    pageUpdates.map(update => callNotionWithRetry(() => patchPage(update)))
  )

  const failures = results
    .map((r, i) => ({ r, update: pageUpdates[i] }))
    .filter(({ r }) => r.status === 'rejected')

  for (const { r, update } of failures) {
    await persistDeadLetter({
      pageId: update.pageId,
      lastError: redactSensitive((r as PromiseRejectedResult).reason?.message),
      attemptCount: 5,
      writebackStatus: 'dead_letter'
    })

    captureWithDomain(
      new Error('notion_writeback_dead_letter'),
      'integrations.notion',
      { tags: { source: 'bulk_writeback_dead_letter', stage: 'after_5_attempts' } }
    )
  }

  return { runId, ok: pageUpdates.length - failures.length, failed: failures.length }
}
```

## 8. Reliability signals para errors

| Signal | Reader | Steady |
|---|---|---|
| `notion.metrics.writeback_dead_letter` | COUNT `writeback_status='dead_letter'` últimas 24h | 0 |
| `notion.metrics.notion_api_5xx_rate` | Rate de 5xx en últimas N requests | < 0.1% |
| `notion.metrics.notion_api_429_count` | COUNT 429 en última hora | < 5 |
| `notion.metrics.notion_api_403_count` | COUNT 403 en última hora | 0 (auth issue) |

## 9. Anti-patterns

| Anti-pattern | Por qué |
|---|---|
| `catch (e) { /* swallow */ }` | Pierdes señales — Sentry no captura |
| Retry sin backoff | Saturas + 429 cascade |
| Retry on 4xx | Wasteful + no resuelve |
| Log raw response body | PII leak garantizado |
| Ignore `request_id` | No puedes correlar con Notion support |
| Catch Notion errors en handler webhook + responder 200 | Notion no reintentará el delivery — pierdes evento |

## 10. Cross-refs

- `api-reference/rate-limits.md` — 429 handling specific
- `patterns-canonical/rate-limit-handling.md` (stub) — backoff math detallado
- `developer-platform-2026/workers-canonical.md` — Workers tienen su propio error model
- CLAUDE.md § "Cross-runtime observability — Sentry init invariant" — captureWithDomain pattern
