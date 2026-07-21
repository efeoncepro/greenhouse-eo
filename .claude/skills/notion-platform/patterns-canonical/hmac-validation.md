# Pattern canonical — HMAC validation Notion webhooks

> **Source**: https://developers.notion.com/reference/webhooks
> **Pattern fuente Greenhouse**: TASK-706 HubSpot webhook handler + TASK-901 Slice 2 design
> **Last verified**: 2026-05-17

## 1. El contrato canonical

Notion firma cada webhook event con HMAC-SHA256:

```http
X-Notion-Signature: sha256=<hex_digest>
```

Donde:
- Algorithm: **HMAC-SHA256**
- Secret: `verification_token` (entregado al setup de la subscription)
- Body firmado: **raw body** del request (matching `JSON.stringify` formatting de Notion)
- Encoding: hex

## 2. Implementación canonical TypeScript

```typescript
// src/lib/webhooks/handlers/notion-tasks.ts (TBD canonical)
import { createHmac, timingSafeEqual } from 'crypto'
import { captureWithDomain } from '@/lib/observability/capture'

export type HmacValidationResult =
  | { ok: true }
  | { ok: false; reason: 'missing_header' | 'malformed_header' | 'length_mismatch' | 'signature_mismatch' }

export const verifyNotionSignature = (
  rawBody: string,
  signatureHeader: string | null,
  verificationToken: string
): HmacValidationResult => {
  if (!signatureHeader) {
    return { ok: false, reason: 'missing_header' }
  }

  if (!signatureHeader.startsWith('sha256=')) {
    return { ok: false, reason: 'malformed_header' }
  }

  const receivedHex = signatureHeader.slice('sha256='.length)
  const expectedHex = createHmac('sha256', verificationToken)
    .update(rawBody)
    .digest('hex')

  // Length check first — timingSafeEqual throws si lengths difieren
  if (receivedHex.length !== expectedHex.length) {
    return { ok: false, reason: 'length_mismatch' }
  }

  const match = timingSafeEqual(
    Buffer.from(receivedHex, 'hex'),
    Buffer.from(expectedHex, 'hex')
  )

  return match ? { ok: true } : { ok: false, reason: 'signature_mismatch' }
}
```

## 3. Wire-up en route handler Vercel

```typescript
// src/app/api/webhooks/notion-tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { resolveSecret } from '@/lib/secrets/secret-manager'
import { verifyNotionSignature } from '@/lib/webhooks/handlers/notion-tasks'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

export const POST = async (request: NextRequest) => {
  // 1. Read raw body FIRST (must be raw for HMAC)
  const rawBody = await request.text()

  // 2. Extract signature header
  const signatureHeader = request.headers.get('x-notion-signature')

  // 3. Resolve secret from GCP Secret Manager
  const verificationToken = await resolveSecret(
    process.env.NOTION_WEBHOOK_SIGNING_SECRET_REF!
  )

  // 4. Verify
  const validation = verifyNotionSignature(rawBody, signatureHeader, verificationToken)

  if (!validation.ok) {
    captureWithDomain(
      new Error(`notion_webhook_signature_invalid: ${validation.reason}`),
      'integrations.notion',
      { tags: { source: 'notion_webhook_signature', reason: validation.reason } }
    )
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  // 5. Now safe to parse body
  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // 6. Continue to handler (echo-loop filter, allowlist, inbox dedup, outbox emit)
  // ... ver patterns-canonical/echo-loop-filter.md

  return NextResponse.json({ ok: true }, { status: 200 })
}
```

## 4. Caso especial — verification_token bootstrap

Cuando creas una subscription nueva en Notion UI:
1. Notion envía un POST inicial al endpoint con `verification_token` en el body
2. Este POST **NO tiene `X-Notion-Signature` válido** — es el bootstrap
3. Tu endpoint debe:
   - Detectar el bootstrap (body shape `{ verification_token: "..." }`)
   - Responder 200
   - Loggear el token para que operador pueda copiarlo a Notion UI

```typescript
// Bootstrap detection (antes del HMAC verify)
const bootstrapAttempt = (() => {
  try { return JSON.parse(rawBody) } catch { return null }
})()

if (bootstrapAttempt?.verification_token && !signatureHeader) {
  // Loggear de manera SEGURA (sin que aparezca en stdout productivo)
  await persistBootstrapToken({
    token: bootstrapAttempt.verification_token,
    timestamp: new Date()
  })
  return NextResponse.json({ ok: true }, { status: 200 })
}
```

⚠️ **NO loggees el token en stdout/Sentry** — es el secret de signing. Persiste a una tabla admin auditada que operador puede leer una vez para copiarlo.

## 5. Hard rules canonical

- **NUNCA** parsear body antes de HMAC verify — usa raw string
- **SIEMPRE** timing-safe compare (`crypto.timingSafeEqual`)
- **SIEMPRE** length check antes de timingSafeEqual (sino throws)
- **NUNCA** loggees `verification_token` ni signature header
- **NUNCA** uses comparación normal (`===`) — timing attack vulnerability
- **SIEMPRE** emit reliability signal cuando signature fails (es señal de exploit attempt o secret rotation gap)
- **NUNCA** disable verification "for testing" en path productivo — solo en local dev con env var explícito
- **SIEMPRE** rotar el `verification_token` si sospechas leak (require subscription recreate)
- **SIEMPRE** un secret por subscription — NO compartir cross-environments (prod, staging, demo)

## 6. Defense in depth — Greenhouse pattern

3 capas obligatorias en el handler post-HMAC:
1. **Echo-loop filter** (ver `patterns-canonical/echo-loop-filter.md`)
2. **Property allowlist** (drop si event no relevante)
3. **Inbox dedup** (UNIQUE constraint on `event_id`)

HMAC validation es la primera capa — sin ella, las otras 3 no importan.

## 7. Reliability signal canonical

```typescript
// src/lib/reliability/queries/notion-metrics-webhook-signature-failures.ts (TASK-901 S2)
export const getNotionWebhookSignatureFailures = async (): Promise<ReliabilitySignal> => {
  const result = await query(`
    SELECT COUNT(*) as count
    FROM greenhouse_sync.notion_webhook_inbox
    WHERE outcome = 'signature_invalid'
      AND received_at > NOW() - INTERVAL '5 minutes'
  `)

  const count = parseInt(result.rows[0]?.count ?? '0', 10)

  return {
    signalId: 'notion.metrics.webhook_signature_failures',
    severity: count > 0 ? 'error' : 'ok',
    value: count,
    steadyState: 0,
    subsystemId: 'Integrations · Notion · Metrics'
  }
}
```

## 8. Anti-patterns

| Anti-pattern | Por qué prohibido |
|---|---|
| `verifyNotionSignature(JSON.stringify(parsed), ...)` | Stringify puede diferir del raw enviado (whitespace, key order) → mismatch |
| `===` comparison del hex | Timing attack vulnerability |
| Logear `signatureHeader` o `verificationToken` | Secret leak |
| Skip verify en staging | Staging es prod-shape — mismas rules |
| Compartir secret prod ↔ staging ↔ demo | Cross-env contamination |
| Catch error verify + return 200 | Notion no reintentaría — pierdes evento |

## 9. Cross-refs

- `api-reference/webhooks-canonical.md` — webhook contract
- `patterns-canonical/echo-loop-filter.md` — capa 2 post-HMAC
- `patterns-canonical/idempotency-keys.md` (stub) — capa 3
- `output-templates/webhook-handler-template.md` — skeleton completo
- CLAUDE.md § "Secret Manager Hygiene" — secret rotation canonical
