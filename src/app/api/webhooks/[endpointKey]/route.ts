import { NextResponse } from 'next/server'

import { captureWithDomain } from '@/lib/observability/capture'
import { processInboundWebhook } from '@/lib/webhooks/inbound'
import { ensureHandlersRegistered } from '@/lib/webhooks/handlers'
import {
  enqueueNotionWebhookRequest,
  isAsyncNotionEndpoint,
  isNotionWebhookAsyncIngestionEnabled
} from '@/lib/webhooks/notion-async-ingestion'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ endpointKey: string }> }
) {
  const { endpointKey } = await params

  if (isNotionWebhookAsyncIngestionEnabled() && isAsyncNotionEndpoint(endpointKey)) {
    try {
      const result = await enqueueNotionWebhookRequest(endpointKey, request)

      return NextResponse.json(result.body, { status: result.status })
    } catch (error) {
      captureWithDomain(error, 'integrations.notion', {
        level: 'error',
        tags: {
          source: 'notion-webhook-async-ingestion',
          stage: 'cloud_tasks_enqueue',
          endpoint_key: endpointKey
        }
      })

      // A queue failure must remain retryable by Notion; acknowledging here
      // would silently lose the event before durable receipt.
      return NextResponse.json(
        { received: false, queued: false, retry: true },
        { status: 503 }
      )
    }
  }

  await ensureHandlersRegistered()

  const result = await processInboundWebhook(endpointKey, request)

  return NextResponse.json(result.body, { status: result.status })
}
