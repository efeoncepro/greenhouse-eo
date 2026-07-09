import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  executeHiringVacancyPublicationCommand,
  hiringInvalidBodyResponse,
  toHiringErrorResponse,
} from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1371 — internal operator endpoint for publishing Hiring vacancies from an
 * approved structured brief. Full API parity surface for agents, Nexa and the future
 * Hiring Desk. It reuses the domain command; it never writes tables directly.
 */
export const dynamic = 'force-dynamic'

const readMode = (body: unknown): string => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'dryRun'

  const mode = (body as { mode?: unknown }).mode

  return typeof mode === 'string' && mode.trim() ? mode.trim() : 'dryRun'
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return hiringInvalidBodyResponse()
  }

  const mode = readMode(body)
  const needsWrite = mode === 'execute' || mode === 'publish'
  const needsPublish = mode === 'publish'

  if (needsWrite && !can(tenant, 'hiring.demand.write', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.demand.write' } })
  }

  if (needsWrite && !can(tenant, 'hiring.opening.write', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.write' } })
  }

  if (needsPublish && !can(tenant, 'hiring.opening.publish', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.publish' } })
  }

  try {
    const result = await executeHiringVacancyPublicationCommand({
      request,
      actorUserId: tenant.userId,
      body,
    })

    return NextResponse.json(result.data, { status: result.status ?? 200, headers: result.headers })
  } catch (error) {
    return toHiringErrorResponse(error, 'vacancy_publication_operator')
  }
}
