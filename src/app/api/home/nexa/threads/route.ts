import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { listNexaThreads } from '@/lib/nexa/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return canonicalErrorResponse('unauthorized')
  }

  try {
    const threads = await listNexaThreads({
      userId: session.user.userId,
      clientId: session.user.clientId,
      limit: 20
    })

    return NextResponse.json(threads)
  } catch (error) {
    captureWithDomain(error, 'home', {
      tags: { source: 'nexa_threads_list_endpoint' },
      extra: { detail: redactErrorForResponse(error), userId: session.user.userId }
    })

    return canonicalErrorResponse('internal_error')
  }
}
