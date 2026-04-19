// Deprecated 2026-04-18 (TASK-463). Use POST /api/finance/quotes with hubspot_deal_id.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  console.warn(
    '[quotes/hubspot] Deprecated endpoint called. Use POST /api/finance/quotes with hubspot_deal_id.',
    { url: request.url }
  )

  return NextResponse.json(
    {
      error: 'Gone',
      message:
        'Endpoint deprecated. Use POST /api/finance/quotes with { hubspot_deal_id } to create canonical quote with HubSpot propagation.',
      migrationUrl: '/api/finance/quotes',
      deprecatedAt: '2026-04-18'
    },
    { status: 410 }
  )
}
