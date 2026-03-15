import { NextResponse } from 'next/server'

import { ingestAttendanceRecords } from '@/lib/hr-core/service'
import { assertWebhookSecret, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { RecordAttendanceInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    assertWebhookSecret(request)

    const body = (await request.json().catch(() => null)) as { entries?: RecordAttendanceInput[] } | null
    const entries = Array.isArray(body?.entries) ? body.entries : []

    if (entries.length === 0) {
      return NextResponse.json({ error: 'entries is required.' }, { status: 400 })
    }

    const payload = await ingestAttendanceRecords({
      entries,
      recordedBy: 'teams-webhook'
    })

    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to ingest Teams attendance webhook.')
  }
}
