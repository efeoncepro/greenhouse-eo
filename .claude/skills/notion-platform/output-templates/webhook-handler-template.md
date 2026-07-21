# Template canonical — Notion Webhook Handler skeleton

> **Pattern fuente**: TASK-901 Slice 2 + TASK-706 (HubSpot mirror)
> **Last verified**: 2026-05-17

## Skeleton completo

### 1. Route handler Vercel (thin wrapper)

```typescript
// src/app/api/webhooks/notion-tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { resolveSecret } from '@/lib/secrets/secret-manager'
import { handleNotionTasksWebhook } from '@/lib/webhooks/handlers/notion-tasks'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

export const dynamic = 'force-dynamic'

export const POST = async (request: NextRequest) => {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'notion_webhook_body_read' }
    })
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const signatureHeader = request.headers.get('x-notion-signature')

  let signingSecret: string
  let integrationUserId: string
  try {
    [signingSecret, integrationUserId] = await Promise.all([
      resolveSecret(process.env.NOTION_WEBHOOK_SIGNING_SECRET_REF!),
      resolveSecret(process.env.NOTION_INTEGRATION_USER_ID_SECRET_REF!)
    ])
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'notion_webhook_secret_resolution' }
    })
    return NextResponse.json({ error: 'configuration_error' }, { status: 500 })
  }

  try {
    const result = await handleNotionTasksWebhook({
      rawBody,
      signatureHeader,
      signingSecret,
      integrationUserId,
      inputPropsAllowlist: INPUT_PROPS_ALLOWLIST
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.status })
    }

    return NextResponse.json({ ok: true, outcome: result.outcome }, { status: 200 })
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'notion_webhook_handler', stage: 'unexpected' }
    })
    return NextResponse.json(
      redactErrorForResponse(err, 'webhook_processing_failed'),
      { status: 500 }
    )
  }
}
```

### 2. Handler canonical (en `src/lib/webhooks/handlers/notion-tasks.ts`)

```typescript
import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { runGreenhousePostgresQuery, withTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/outbox-consumer'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactSensitive } from '@/lib/observability/redact'

export type NotionWebhookEvent = {
  id: string
  timestamp: string
  workspace_id: string
  subscription_id: string
  integration_id: string
  type: string
  authors?: Array<{ id: string; type: 'person' | 'bot' | 'agent' }>
  accessible_by?: Array<{ id: string; type: string }>
  attempt_number: number
  entity: { id: string; type: 'page' | 'block' | 'database' | 'data_source' | 'comment' }
  data?: {
    updated_properties?: string[]
    [key: string]: unknown
  }
}

export type HandlerResult =
  | { ok: true; outcome: 'outbox_emitted' | 'echo_loop_dropped' | 'allowlist_dropped' | 'duplicate' }
  | { ok: false; status: 401 | 400 | 500; reason: string }

export type NotionWebhookHandlerInput = {
  rawBody: string
  signatureHeader: string | null
  signingSecret: string
  integrationUserId: string
  inputPropsAllowlist: ReadonlyArray<string>
}

// === Capa 1 — HMAC validation ===
const verifyNotionSignature = (
  rawBody: string,
  signatureHeader: string | null,
  verificationToken: string
): { ok: true } | { ok: false; reason: string } => {
  if (!signatureHeader) return { ok: false, reason: 'missing_signature_header' }
  if (!signatureHeader.startsWith('sha256=')) return { ok: false, reason: 'malformed_signature_header' }

  const receivedHex = signatureHeader.slice('sha256='.length)
  const expectedHex = createHmac('sha256', verificationToken)
    .update(rawBody)
    .digest('hex')

  if (receivedHex.length !== expectedHex.length) return { ok: false, reason: 'signature_length_mismatch' }

  const match = timingSafeEqual(Buffer.from(receivedHex, 'hex'), Buffer.from(expectedHex, 'hex'))
  return match ? { ok: true } : { ok: false, reason: 'signature_mismatch' }
}

// === Capa 2 — Echo-loop filter ===
const detectEchoLoop = (event: NotionWebhookEvent, ourIntegrationUserId: string): boolean => {
  if (!event.authors || event.authors.length === 0) return false
  return event.authors.every(a => a.type === 'bot' && a.id === ourIntegrationUserId)
}

// === Capa 3 — Property allowlist ===
const isInputPropertyChange = (event: NotionWebhookEvent, allowlist: ReadonlyArray<string>): boolean => {
  const updatedProps = event.data?.updated_properties ?? []
  if (updatedProps.length === 0) return true // sin info → assume relevante, fail-safe
  return updatedProps.some(prop => allowlist.includes(prop))
}

// === Capa 4 — Inbox dedup (UNIQUE event_id) ===
const persistInboxEvent = async (event: NotionWebhookEvent, outcome: string | null): Promise<boolean> => {
  try {
    const result = await runGreenhousePostgresQuery(`
      INSERT INTO greenhouse_sync.notion_webhook_inbox (
        event_id, event_type, workspace_id, database_id, page_id,
        payload_redacted, received_at, outcome
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING inbox_id
    `, [
      event.id,
      event.type,
      event.workspace_id,
      event.entity.type === 'data_source' ? event.entity.id : null,
      event.entity.type === 'page' ? event.entity.id : null,
      JSON.stringify(redactSensitive(event)),
      outcome
    ])
    return result.rowCount === 1 // true si insertado, false si conflict
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'notion_webhook_inbox_insert' }
    })
    throw err
  }
}

// === Main handler ===
export const handleNotionTasksWebhook = async (input: NotionWebhookHandlerInput): Promise<HandlerResult> => {
  // Capa 1
  const validation = verifyNotionSignature(input.rawBody, input.signatureHeader, input.signingSecret)
  if (!validation.ok) {
    return { ok: false, status: 401, reason: `hmac_${validation.reason}` }
  }

  // Parse body
  let event: NotionWebhookEvent
  try {
    event = JSON.parse(input.rawBody)
  } catch {
    return { ok: false, status: 400, reason: 'invalid_json' }
  }

  // Capa 2 — Echo-loop filter
  if (detectEchoLoop(event, input.integrationUserId)) {
    await persistInboxEvent(event, 'echo_loop_dropped')
    return { ok: true, outcome: 'echo_loop_dropped' }
  }

  // Capa 3 — Property allowlist
  if (!isInputPropertyChange(event, input.inputPropsAllowlist)) {
    await persistInboxEvent(event, 'allowlist_dropped')
    return { ok: true, outcome: 'allowlist_dropped' }
  }

  // Capa 4 — Inbox dedup
  const inserted = await persistInboxEvent(event, null)
  if (!inserted) {
    return { ok: true, outcome: 'duplicate' }
  }

  // Emit outbox event for reactive consumer
  try {
    await publishOutboxEvent('notion.task.metrics_recompute_requested', {
      schemaVersion: 1,
      workspaceId: event.workspace_id,
      databaseId: event.entity.type === 'data_source' ? event.entity.id : null,
      pageId: event.entity.type === 'page' ? event.entity.id : null,
      metricName: 'rpa',
      triggeredAt: event.timestamp,
      sourceEventId: event.id
    })

    // Update inbox outcome
    await runGreenhousePostgresQuery(`
      UPDATE greenhouse_sync.notion_webhook_inbox
      SET outcome = 'outbox_emitted', processed_at = NOW()
      WHERE event_id = $1
    `, [event.id])

    return { ok: true, outcome: 'outbox_emitted' }
  } catch (err) {
    await runGreenhousePostgresQuery(`
      UPDATE greenhouse_sync.notion_webhook_inbox
      SET outcome = 'error', processed_at = NOW()
      WHERE event_id = $1
    `, [event.id])

    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'notion_webhook_outbox_emit' }
    })

    return { ok: false, status: 500, reason: 'outbox_emit_failed' }
  }
}
```

### 3. Tests anti-regresión obligatorios

```typescript
// src/lib/webhooks/handlers/notion-tasks.test.ts
describe('handleNotionTasksWebhook', () => {
  it('rejects with 401 when signature header missing', async () => { ... })
  it('rejects with 401 when signature is malformed', async () => { ... })
  it('rejects with 401 when signature does not match', async () => { ... })
  it('drops with outcome=echo_loop_dropped when all authors are our integration', async () => { ... })
  it('does NOT drop when some authors are human even if one is our bot', async () => { ... })
  it('drops with outcome=allowlist_dropped when no input property updated', async () => { ... })
  it('drops with outcome=duplicate when event_id already in inbox', async () => { ... })
  it('emits outbox event when valid + relevant + unique', async () => { ... })
  it('returns 500 when outbox emit fails', async () => { ... })
  it('redacts sensitive payload before persisting to inbox', async () => { ... })
})
```

### 4. Bootstrap detection (verification token POST)

Si necesitas handle bootstrap POST (sin signature válido, body con `verification_token`):

```typescript
// Insertar antes de "Capa 1 — HMAC validation"
const bootstrapAttempt = (() => {
  try { return JSON.parse(input.rawBody) } catch { return null }
})()

if (bootstrapAttempt?.verification_token && !input.signatureHeader) {
  await persistBootstrapToken({
    workspaceId: bootstrapAttempt.workspace_id,
    tokenHashed: hashForStorage(bootstrapAttempt.verification_token),
    receivedAt: new Date()
  })
  // ⚠️ NO loggear el token plain — solo confirmar receipt
  return { ok: true, outcome: 'outbox_emitted' /* o un outcome nuevo 'bootstrap' */ }
}
```

## Cross-refs

- `patterns-canonical/hmac-validation.md` — capa 1 detail
- `patterns-canonical/echo-loop-filter.md` — capas 2 + 3 detail
- `api-reference/webhooks-canonical.md` — payload spec
- `greenhouse-runtime/property-allowlist.md` — INPUT_PROPS_ALLOWLIST canonical
- `use-cases-greenhouse/writeback-gh-metrics.md` — pipeline complete (handler es el inicio)
