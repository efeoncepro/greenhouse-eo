import { NextResponse } from 'next/server'

import { processInboundWebhook } from '@/lib/webhooks/inbound'
import { ensureHandlersRegistered } from '@/lib/webhooks/handlers'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ endpointKey: string }> }
) {
  const { endpointKey } = await params

  await ensureHandlersRegistered()

  const result = await processInboundWebhook(endpointKey, request)

  return NextResponse.json(result.body, { status: result.status })
}
