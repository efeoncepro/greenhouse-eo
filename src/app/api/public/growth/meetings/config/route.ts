import { NextResponse } from 'next/server'

import { publicFormsCorsHeaders, publicFormsOptionsResponse } from '@/app/api/public/growth/forms/cors'
import { isNativeMeetingSchedulerReadEnabled } from '@/lib/growth/meetings/flags'
import { readMeetingSchedulerConfig } from '@/lib/growth/meetings/readers'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

const METHODS = 'GET, OPTIONS'

export const OPTIONS = (request: Request) => publicFormsOptionsResponse(request, METHODS)

export async function GET(request: Request) {
  const headers = await publicFormsCorsHeaders(request, METHODS)

  if (!isNativeMeetingSchedulerReadEnabled()) {
    return NextResponse.json({ outcome: 'error', error: { code: 'unavailable' } }, { status: 404, headers })
  }

  const url = new URL(request.url)
  const surfaceId = url.searchParams.get('surfaceId')
  const schedulerKey = url.searchParams.get('schedulerKey') ?? undefined
  const timezone = url.searchParams.get('timezone')

  if (!surfaceId) {
    return NextResponse.json({ outcome: 'error', error: { code: 'validation_failed' } }, { status: 400, headers })
  }

  try {
    const config = await readMeetingSchedulerConfig({
      surfaceId,
      schedulerKey,
      timezone,
      origin: request.headers.get('origin'),
    })

    if (!config) {
      return NextResponse.json({ outcome: 'error', error: { code: 'unavailable' } }, { status: 404, headers })
    }

    return NextResponse.json(config, { status: 200, headers })
  } catch (caught) {
    captureWithDomain(caught, 'growth', { tags: { source: 'growth_meeting_config_route' } })

    return NextResponse.json({ outcome: 'error', error: { code: 'provider_degraded' } }, { status: 503, headers })
  }
}
