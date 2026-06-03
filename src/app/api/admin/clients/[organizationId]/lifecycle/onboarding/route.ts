import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { provisionClientLifecycle } from '@/lib/client-lifecycle/commands/provision-client-lifecycle'
import { ClientLifecycleValidationError, type ClientLifecycleTriggerSource } from '@/lib/client-lifecycle/types'

export const dynamic = 'force-dynamic'

const ALLOWED_TRIGGERS: ClientLifecycleTriggerSource[] = ['manual', 'hubspot_deal', 'renewal', 'migration', 'adopt']

// POST /api/admin/clients/[organizationId]/lifecycle/onboarding
// Open an onboarding case on an EXISTING organization (the org row must already
// exist — wizard creation writes it via upsertCanonicalOrganization in Slice 2).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params
  const { tenant, userId, errorResponse } = await authorizeLifecycle('client.lifecycle.case.open')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  try {
    const triggerSource = (body.triggerSource as ClientLifecycleTriggerSource) ?? 'manual'

    if (!ALLOWED_TRIGGERS.includes(triggerSource)) {
      throw new ClientLifecycleValidationError('invalid_trigger_source', 'trigger_source inválido.', 400)
    }

    const effectiveDate = typeof body.effectiveDate === 'string' && body.effectiveDate
      ? body.effectiveDate
      : new Date().toISOString().slice(0, 10)

    const result = await provisionClientLifecycle({
      organizationId,
      caseKind: 'onboarding',
      triggerSource,
      triggeredByUserId: userId,
      effectiveDate,
      targetCompletionDate: typeof body.targetCompletionDate === 'string' ? body.targetCompletionDate : undefined,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
      hubspotDealId: typeof body.hubspotDealId === 'string' ? body.hubspotDealId : undefined,
      templateCode: typeof body.templateCode === 'string' ? body.templateCode : undefined
    })

    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 })
  } catch (error) {
    return mapLifecycleError(error, 'open_onboarding')
  }
}
