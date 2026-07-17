import { NextResponse } from 'next/server'

import { processInboundWebhook } from '@/lib/webhooks/inbound'
import { ensureHandlersRegistered } from '@/lib/webhooks/handlers'
import {
  parseNotionWebhookTaskEnvelope
} from '@/lib/webhooks/notion-async-ingestion'
import { verifyNotionWebhookTaskRequest } from '@/lib/webhooks/cloud-tasks-oidc'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let authorized = false

  try {
    authorized = await verifyNotionWebhookTaskRequest(request)
  } catch {
    authorized = false
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const envelope = parseNotionWebhookTaskEnvelope(await request.json().catch(() => null))

  if (!envelope) {
    return NextResponse.json({ error: 'Invalid task payload' }, { status: 400 })
  }

  await ensureHandlersRegistered()

  const inboundRequest = new Request(
    `https://internal.greenhouse/api/webhooks/${encodeURIComponent(envelope.endpointKey)}`,
    {
      method: 'POST',
      headers: {
        'content-type': envelope.contentType,
        'x-notion-signature': envelope.signature
      },
      body: envelope.rawBody
    }
  )

  const result = await processInboundWebhook(envelope.endpointKey, inboundRequest, {
    retryFailedDuplicates: true,
    surfaceHandlerFailures: true
  })

  return NextResponse.json(result.body, { status: result.status })
}
