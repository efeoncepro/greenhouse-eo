# Notion API — Webhooks canonical

> **Source**: https://developers.notion.com/reference/webhooks + webhooks-events-delivery
> **Last verified**: 2026-05-17

## 1. Event types canonical (post 2025-09-03)

### Page events
- `page.created`
- `page.content_updated` (aggregated)
- `page.properties_updated` (aggregated) ← **el más relevante para TASK-901**
- `page.moved` (aggregated)
- `page.deleted` (aggregated)
- `page.undeleted` (aggregated)
- `page.locked` (NOT aggregated — instant)
- `page.unlocked` (NOT aggregated — instant)

### Database events (legacy)
- `database.created` (aggregated)
- `database.moved` (aggregated)
- `database.deleted` (aggregated)
- `database.undeleted` (aggregated)
- `database.schema_updated` (deprecated for new — use `data_source.schema_updated`)
- `database.content_updated` (deprecated)

### Data Source events (canonical desde 2025-09-03)
- `data_source.created` (aggregated)
- `data_source.content_updated` (aggregated)
- `data_source.moved` (aggregated)
- `data_source.deleted` (aggregated)
- `data_source.undeleted` (aggregated)
- `data_source.schema_updated` (aggregated)

### Comment events
- `comment.created` (NOT aggregated)
- `comment.updated` (NOT aggregated)
- `comment.deleted` (NOT aggregated)

### View events (Mar 19, 2026, API v2025-09-03+)
- `view.created`
- `view.updated`
- `view.deleted`

## 2. Aggregated events — delay characteristic

Eventos **aggregated** son batched para reducir noise en ediciones rápidas:

| Característica | Valor |
|---|---|
| Aggregation window | "Short" (sin numero exacto en docs) |
| Delivery delay típico | < 1 minuto |
| Delivery delay max esperado | 5 minutos |
| Cuándo se trigger 1 sola vez | múltiples ediciones rápidas → un solo webhook |

**Implicación para TASK-901**:
- Operador puede hacer 3 cambios de status seguidos → 1 solo webhook `page.properties_updated`
- Bueno: reduce ruido + ahorra invocations
- Cuidado: el `authors[]` puede tener length > 1 si múltiples users editaron

## 3. Payload shape canonical

```jsonc
{
  "id": "uuid",                              // event ID único
  "timestamp": "2026-05-17T...",             // ISO 8601, use para ordering
  "workspace_id": "uuid",
  "subscription_id": "uuid",
  "integration_id": "uuid",                  // ← CRÍTICO para echo-loop detection
  "type": "page.properties_updated",
  "authors": [
    { "id": "uuid", "type": "person" | "bot" | "agent" }
    // ← Si tu integration es el author, .id === webhook.integration_id
  ],
  "accessible_by": [                         // solo public integrations
    { "id": "uuid", "type": "person" | "bot" }
  ],
  "attempt_number": 1,                       // 1-8, exponential backoff
  "entity": {
    "id": "uuid",                            // el page_id que cambió
    "type": "page"                           // o "block", "database", "data_source", "comment"
  },
  "data": {
    // event-specific. Para page.properties_updated:
    "updated_properties": ["prop_id_1", "prop_id_2"]
  }
}
```

**Crítico**: el payload **NO contiene los valores nuevos** de las properties. Solo te dice "esta página cambió, estas properties cambiaron". **Siempre re-fetch desde API antes de compute** (pattern canonical en `patterns-canonical/re-fetch-pattern.md`).

## 4. Delivery guarantees canonical

| Aspecto | Garantía |
|---|---|
| Delivery model | **At-most-once** (NO at-least-once) |
| Delivery timeline | <5 min normal, <1 min mayoría |
| Max retry attempts | 8 |
| Retry backoff | Exponential |
| Final retry timing | ~24h después del trigger inicial |
| Out-of-order delivery | Posible — usar `timestamp` para reorder |
| Data freshness | Payload puede estar stale — re-fetch siempre |

**Implicación crítica**: at-most-once significa que un evento **puede perderse**. Por eso el design canonical TASK-901 incluye **nightly safety net** (Cloud Run Job @ 4 AM Santiago que reconcilia drift).

## 5. HMAC signature verification — canonical pattern

### Header recibido
```http
X-Notion-Signature: sha256=<hex_digest>
```

### Algoritmo
```typescript
import { createHmac, timingSafeEqual } from 'crypto'

const verifyNotionSignature = (
  rawBody: string,               // ← CRÍTICO: raw body, NO el parsed JSON
  signatureHeader: string | null,
  verificationToken: string      // ← secret returned at subscription creation
): boolean => {
  if (!signatureHeader?.startsWith('sha256=')) return false

  const receivedHex = signatureHeader.slice('sha256='.length)
  const expectedHex = createHmac('sha256', verificationToken)
    .update(rawBody)
    .digest('hex')

  // Length check before timingSafeEqual (que requiere mismo length)
  if (receivedHex.length !== expectedHex.length) return false

  return timingSafeEqual(
    Buffer.from(receivedHex, 'hex'),
    Buffer.from(expectedHex, 'hex')
  )
}
```

### Reglas duras
- **NUNCA** parsear el body antes de HMAC verify — usa el raw string del request
- **SIEMPRE** timing-safe compare (`crypto.timingSafeEqual`)
- **SIEMPRE** valida `length` antes de timingSafeEqual (sino throw)
- **SIEMPRE** verifica `sha256=` prefix (drop si missing/wrong)
- **NUNCA** loggees el verification token ni el signature header
- Sign with **minified JSON** equivalente (matching `JSON.stringify` formatting) — pero en realidad Notion firma el body que envía, así que recibirlo raw y validar es suficiente

Ver pattern completo en `patterns-canonical/hmac-validation.md`.

## 6. Subscription lifecycle

### Setup canonical (one-time, manual)
1. Connection settings → Webhooks tab → "Create a subscription"
2. Configure **Webhook URL** (debe ser HTTPS público)
3. Select event types
4. Save → Notion envía `POST` con `verification_token` en body
5. Tu endpoint debe responder 200 (NO necesita signature válida en este primer POST — es el bootstrap)
6. Copia el `verification_token` y pégalo en Notion UI para confirmar
7. Subscription activa

### URL change rule
> "You can only change the webhook URL **before verification**. After verification, if you need to change the URL, you must delete and recreate the subscription."

→ **Implicación canonical**: prefer endpoint URL estables. Si cambias dominio, recrear subscription + re-confirmar token + re-update secret en GCP Secret Manager.

### NO API para crear/listar/borrar subscriptions
Todo subscription management es **manual via Notion UI** al 2026-05-17. No hay `POST /v1/webhooks/subscriptions` ni equivalente. Esto es limitación canonical conocida.

## 7. Echo-loop detection canonical

Cuando Greenhouse escribe a Notion (PATCH page property `[GH] RpA`), Notion dispara webhook `page.properties_updated` notificándote de **tu propia escritura**. Sin filter → infinite loop.

```typescript
const isEchoLoop = (
  event: NotionWebhookEvent,
  ourIntegrationId: string
): boolean => {
  if (!event.authors || event.authors.length === 0) return false

  // Si TODOS los authors son nuestra integration → echo loop puro
  const allAuthorsAreUs = event.authors.every(
    author => author.type === 'bot' && author.id === ourIntegrationId
  )

  // Alternativa más conservadora: si ANY author es nuestro → drop
  // const anyAuthorIsUs = event.authors.some(
  //   author => author.type === 'bot' && author.id === ourIntegrationId
  // )

  return allAuthorsAreUs
}
```

**Pattern canonical Greenhouse** (3 capas defense in depth):

```typescript
// Capa 1: integration_id check (filter early)
if (isEchoLoop(event, INTEGRATION_USER_ID)) {
  return { ok: true, outcome: 'echo_loop_dropped' }
}

// Capa 2: property allowlist (drop si no es input relevante)
const updatedProps = event.data?.updated_properties ?? []
if (!updatedProps.some(p => INPUT_PROPS_ALLOWLIST.includes(p))) {
  return { ok: true, outcome: 'allowlist_dropped' }
}

// Capa 3: hash dedupe en reactive consumer (skip si ya escribimos ese hash)
// Ver patterns-canonical/idempotency-keys.md
```

Detalle completo en `patterns-canonical/echo-loop-filter.md`.

## 8. Response budget para tu endpoint

**No documentado explícito**, pero la convención industry-standard:
- Responder 2xx **< 10s** (más allá Notion considera failed → retry)
- Greenhouse pattern canonical: **< 1s** (do inbox INSERT + outbox emit, defer compute al reactive consumer)

NUNCA hacer compute pesado o llamadas downstream síncrono dentro del webhook handler — eso te garantiza timeouts + retries duplicados.

## 9. Reliability signals canonical (Greenhouse)

Para cada webhook handler Notion, mantén estos signals (TASK-901 spec):

| Signal | Steady state | Alerta |
|---|---|---|
| `notion.metrics.webhook_signature_failures` | 0 | error si count > 0 en 5min (posible exploit attempt) |
| `notion.metrics.echo_loop_detected` | 0 | warning si count > 0 (filter funciona pero hay drift) |
| `notion.metrics.writeback_lag` | < 5 min p95 | warning > 5min, error > 30min |
| `notion.metrics.writeback_dead_letter` | 0 | error si count > 0 |
| `notion.metrics.nightly_drift_detected` | 0 | warning si count > 0 en última nightly run |

## 10. Cross-refs

- `patterns-canonical/hmac-validation.md` — pattern completo con code
- `patterns-canonical/echo-loop-filter.md` — 3 capas defense in depth
- `patterns-canonical/re-fetch-pattern.md` (stub) — siempre re-fetch
- `patterns-canonical/idempotency-keys.md` (stub) — hash dedupe
- `use-cases-greenhouse/writeback-gh-metrics.md` — TASK-901 pipeline end-to-end
- `output-templates/webhook-handler-template.md` — skeleton canonical
