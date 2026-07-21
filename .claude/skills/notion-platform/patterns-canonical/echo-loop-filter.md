# Pattern canonical — Echo-loop filter

> **Por qué es crítico**: cuando Greenhouse escribe `[GH] RpA` a Notion via API, Notion dispara un webhook `page.properties_updated` notificándonos de **nuestra propia escritura**. Sin filter → recompute → re-PATCH → recompute → infinite loop → rate limit cascade → degraded service.
> **Source**: webhook payload spec + community pattern
> **Last verified**: 2026-05-17

## 1. El contrato canonical

3 capas de defense in depth (todas obligatorias):

```
Webhook payload
    ↓
Capa 1: HMAC validation                        (api-reference/webhooks-canonical.md)
    ↓ ok
Capa 2: integration_id check                   ← ESTE archivo
    ↓ ok (no es nuestro write)
Capa 3: property allowlist                      ← ESTE archivo (parte B)
    ↓ ok (es un input relevante)
Inbox INSERT (idempotency)
    ↓
Outbox event emit
    ↓
Reactive consumer
    ↓
Capa 4 (defense in depth extra): hash dedupe   (patterns-canonical/idempotency-keys.md stub)
    ↓
Compute + writeback
```

## 2. Capa A — integration_id check

### Identificar tu integration

```typescript
// One-time setup: query Notion para get tu bot ID
// GET /v1/users/me con tu integration token
// Response: { object: 'user', id: '<INTEGRATION_USER_ID>', type: 'bot', bot: { ... } }

const INTEGRATION_USER_ID = await resolveSecret(
  process.env.NOTION_INTEGRATION_USER_ID_SECRET_REF!
)
// Almacenar en GCP Secret Manager separado del token (no es token, pero es identifier confidencial-adyacente)
```

### Filter implementation

```typescript
export type EchoLoopFilterResult =
  | { isEchoLoop: false }
  | { isEchoLoop: true; reason: 'all_authors_self' | 'sole_author_self' }

export const detectEchoLoop = (
  event: NotionWebhookEvent,
  ourIntegrationUserId: string
): EchoLoopFilterResult => {
  if (!event.authors || event.authors.length === 0) {
    return { isEchoLoop: false }
  }

  // Author shape: { id: 'uuid', type: 'person' | 'bot' | 'agent' }
  const isOurBot = (author: { id: string; type: string }) =>
    author.type === 'bot' && author.id === ourIntegrationUserId

  // Si SOLO authors are us → echo loop puro
  const allAuthorsAreUs = event.authors.every(isOurBot)
  if (allAuthorsAreUs) {
    return {
      isEchoLoop: true,
      reason: event.authors.length === 1 ? 'sole_author_self' : 'all_authors_self'
    }
  }

  return { isEchoLoop: false }
}
```

### Decisión canonical: `every` vs `some`

| Strategy | Comportamiento | Trade-off |
|---|---|---|
| **`every(isOurBot)`** (canonical) | Drop solo si TODOS los authors son nuestro bot | Si hay aggregated event con humano + bot, NO drop (procesamos el edit humano) |
| `some(isOurBot)` | Drop si CUALQUIER author es nuestro bot | Más agresivo — puede dropear edits humanos legítimos que ocurrieron simultáneo a nuestro write |

**Decisión canonical Greenhouse**: `every` — conservativo, prefer process aunque haya algún noise nuestro. La capa 3 (allowlist) y capa 4 (hash dedupe) atrapan el noise residual.

## 3. Capa B — property allowlist

Aunque el event pase el integration_id check (no es nuestro write), puede ser un edit de property que NO es relevante para computar RpA. Por ejemplo: operador updates `Notes` field → no necesita recompute.

```typescript
export const INPUT_PROPS_ALLOWLIST = [
  'Status',                  // status transitions → drives RpA
  'Estado',                  // alias Sky tenant
  'Correcciones',            // legacy property (read by some consumers durante shadow mode)
  'Client Change Round',     // future Frame.io signal
  'Workflow Change Round',   // future Frame.io signal
  'Review Source',           // future Frame.io signal
  'completed_at',            // OTD denominator
  'due_date'                 // OTD numerator
] as const

export const isInputPropertyChange = (event: NotionWebhookEvent): boolean => {
  const updatedProps = event.data?.updated_properties ?? []
  return updatedProps.some(propName =>
    INPUT_PROPS_ALLOWLIST.includes(propName as typeof INPUT_PROPS_ALLOWLIST[number])
  )
}
```

⚠️ **Nota**: `event.data.updated_properties` puede contener `property_id` UUIDs o `name` strings dependiendo de version Notion. Verificar durante TASK-901 Discovery + ajustar el matching accordingly (puede requerir lookup ID → name vía data source schema fetch).

## 4. Pattern combinado completo

```typescript
export const handleNotionTasksWebhook = async (input: {
  rawBody: string
  signatureHeader: string | null
  signingSecret: string
  integrationUserId: string
}): Promise<HandlerResult> => {
  // Capa 1 — HMAC (ver hmac-validation.md)
  const validation = verifyNotionSignature(input.rawBody, input.signatureHeader, input.signingSecret)
  if (!validation.ok) {
    return { ok: false, status: 401, reason: `hmac_${validation.reason}` }
  }

  const event = JSON.parse(input.rawBody) as NotionWebhookEvent

  // Capa 2 — echo-loop filter
  const echoCheck = detectEchoLoop(event, input.integrationUserId)
  if (echoCheck.isEchoLoop) {
    await persistInboxEvent({ event, outcome: 'echo_loop_dropped' })
    incrementSignal('notion.metrics.echo_loop_detected')
    return { ok: true, outcome: 'echo_loop_dropped' }
  }

  // Capa 3 — property allowlist
  if (!isInputPropertyChange(event)) {
    await persistInboxEvent({ event, outcome: 'allowlist_dropped' })
    return { ok: true, outcome: 'allowlist_dropped' }
  }

  // Capa 4 — inbox dedup (UNIQUE on event_id)
  const inserted = await persistInboxEvent({ event, outcome: null }) // null = pending
  if (!inserted) {
    return { ok: true, outcome: 'duplicate' }
  }

  // Emit outbox event for reactive consumer
  await publishOutboxEvent('notion.task.metrics_recompute_requested', {
    workspaceId: event.workspace_id,
    databaseId: event.entity.id, // si entity es data_source
    pageId: event.entity.id,
    metricName: 'rpa',
    triggeredAt: event.timestamp
  })

  await updateInboxOutcome(event.id, 'outbox_emitted')
  return { ok: true, outcome: 'outbox_emitted' }
}
```

## 5. Reliability signal canonical

```typescript
// src/lib/reliability/queries/notion-metrics-echo-loop-detected.ts
export const getNotionEchoLoopDetected = async (): Promise<ReliabilitySignal> => {
  const result = await query(`
    SELECT COUNT(*) as count
    FROM greenhouse_sync.notion_webhook_inbox
    WHERE outcome = 'echo_loop_dropped'
      AND received_at > NOW() - INTERVAL '5 minutes'
  `)

  const count = parseInt(result.rows[0]?.count ?? '0', 10)

  return {
    signalId: 'notion.metrics.echo_loop_detected',
    severity: count > 0 ? 'warning' : 'ok',
    value: count,
    steadyState: 0,    // 0 esperado si filter funciona perfectamente
    subsystemId: 'Integrations · Notion · Metrics',
    description: 'Echo-loop filter activations — should be 0 in steady state'
  }
}
```

**Por qué warning si > 0** (no `ok`): el filter SÍ está funcionando (sino tendrías infinite loop). Pero count > 0 significa que Greenhouse está escribiendo + Notion notificando — esperado durante writeback activo. Aceptable mientras count sea bajo (~1-2 per página editada).

Si count > 100/hora sustained → posible bug en hash dedupe o nightly re-write loop → escalate.

## 6. Hard rules canonical

- **NUNCA** skipear capa 2 (echo-loop) — infinite loop garantizado en producción
- **NUNCA** skipear capa 3 (allowlist) — wasted compute + rate limit pressure
- **SIEMPRE** las 3 capas en ese orden (HMAC → echo → allowlist → inbox)
- **SIEMPRE** persist inbox event con outcome, even cuando dropped (audit trail completo)
- **NUNCA** asume el set de properties es estable — verificar contra data source schema durante Discovery
- **SIEMPRE** reliability signal `echo_loop_detected` debe estar wired-up — sin él, drift invisible
- **NUNCA** sobreescribas `INPUT_PROPS_ALLOWLIST` con env var run-time — debe ser code-controlled + lint-protected

## 7. Edge cases

### Cuando el author es un Custom Agent o External Agent
- `author.type === 'agent'` (NEW desde May 2026)
- Si un Custom Agent edita la page → no es nuestro write → procesar normalmente
- Pero si un External Agent (e.g. Claude Code via Notion) edita en nombre de un user → tratar como write humano

### Cuando aggregated event tiene mix authors
- `authors: [{ type: 'person', id: 'X' }, { type: 'bot', id: OUR_INTEGRATION_ID }]`
- Con strategy `every` → NO es echo loop (procesar)
- Resultado: re-compute aunque haya noise nuestro → hash dedupe (capa 4) lo atrapa si nada cambió input-wise

### Cuando otro integration también escribe
- Notion soporta múltiples integrations en mismo workspace
- Tu `OUR_INTEGRATION_ID` matchea solo tu bot — otros bots not filtered
- Si otro integration escribe → es legitimate edit (no echo) → procesar

## 8. Cross-refs

- `patterns-canonical/hmac-validation.md` — capa 1
- `patterns-canonical/idempotency-keys.md` (stub) — capa 4 (hash dedupe)
- `api-reference/webhooks-canonical.md` — payload spec
- `greenhouse-runtime/property-allowlist.md` — INPUT_PROPS canonical
