import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { addDestination } from '@/lib/growth/forms/commands'
import { DESTINATION_PROVIDERS, type DestinationProvider } from '@/lib/growth/forms/contracts'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1229 — `POST /api/admin/growth/forms/{formId}/destinations` — agrega un
 * destino a una form version. Capability `growth.forms.destinations.manage`. El
 * mapping nunca se acepta desde el browser (esto es admin gobernado).
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.destinations.manage', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.destinations.manage' } })
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  const formVersionId = typeof body.formVersionId === 'string' ? body.formVersionId : ''
  const provider = typeof body.provider === 'string' ? body.provider : ''

  if (!formVersionId || !DESTINATION_PROVIDERS.includes(provider as DestinationProvider)) {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  try {
    const destination = await addDestination({
      formVersionId,
      provider,
      adapterKind: typeof body.adapterKind === 'string' ? body.adapterKind : undefined,
      adapterVersion: typeof body.adapterVersion === 'string' ? body.adapterVersion : undefined,
      deliveryMode: typeof body.deliveryMode === 'string' ? body.deliveryMode : undefined,
      mapping: body.mapping,
      consentRequirements: body.consentRequirements,
      retryPolicy: body.retryPolicy,
    })

    return NextResponse.json({ destinationId: destination.destination_id }, { status: 201 })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_destination', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
