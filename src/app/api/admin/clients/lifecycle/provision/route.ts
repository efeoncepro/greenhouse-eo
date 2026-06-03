import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import {
  provisionClientFromWizard,
  type WizardOrigin
} from '@/lib/client-lifecycle/commands/provision-client-from-wizard'
import { ClientLifecycleValidationError } from '@/lib/client-lifecycle/types'

export const dynamic = 'force-dynamic'

const VALID_ORIGINS: WizardOrigin[] = ['manual', 'hubspot_company', 'nubox_sale', 'adopt']

// POST /api/admin/clients/lifecycle/provision
// Single canonical front door (wizard commit): writes the org via the SSOT +
// instantiates the Cliente (+ MXN-capable billing) + opens the onboarding case,
// all in one atomic transaction. The org row is created here ONLY via
// upsertCanonicalOrganization (TASK-991), never inline.
export async function POST(request: Request) {
  const { tenant, userId, errorResponse } = await authorizeLifecycle('client.lifecycle.case.open')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  try {
    const origin = body.origin as WizardOrigin

    if (!VALID_ORIGINS.includes(origin)) {
      throw new ClientLifecycleValidationError('invalid_origin', 'origin inválido.', 400)
    }

    const identity = (body.identity ?? {}) as Record<string, unknown>
    const finance = (body.finance ?? {}) as Record<string, unknown>

    const result = await provisionClientFromWizard({
      origin,
      existingOrganizationId: typeof body.existingOrganizationId === 'string' ? body.existingOrganizationId : undefined,
      identity: {
        organizationName: String(identity.organizationName ?? ''),
        legalName: typeof identity.legalName === 'string' ? identity.legalName : undefined,
        taxId: typeof identity.taxId === 'string' ? identity.taxId : undefined,
        taxIdType: typeof identity.taxIdType === 'string' ? identity.taxIdType : undefined,
        country: typeof identity.country === 'string' ? identity.country : undefined,
        hubspotCompanyId: typeof identity.hubspotCompanyId === 'string' ? identity.hubspotCompanyId : undefined
      },
      finance: {
        paymentCurrency: typeof finance.paymentCurrency === 'string' ? (finance.paymentCurrency as never) : undefined,
        paymentTermsDays: typeof finance.paymentTermsDays === 'number' ? finance.paymentTermsDays : undefined
      },
      effectiveDate: typeof body.effectiveDate === 'string' ? body.effectiveDate : undefined,
      targetCompletionDate: typeof body.targetCompletionDate === 'string' ? body.targetCompletionDate : undefined,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
      hubspotDealId: typeof body.hubspotDealId === 'string' ? body.hubspotDealId : undefined,
      clientKind: typeof body.clientKind === 'string' ? body.clientKind : undefined,
      triggeredByUserId: userId
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return mapLifecycleError(error, 'provision_from_wizard')
  }
}
