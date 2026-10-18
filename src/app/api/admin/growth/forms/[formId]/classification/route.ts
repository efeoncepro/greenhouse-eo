import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { correctCommercialFormClassification } from '@/lib/growth/forms/classification'
import { commercialFormClassificationSchema, FormClassificationConflictError } from '@/lib/growth/forms/classification-contract'
import { getFormDefinitionById } from '@/lib/growth/forms/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/** Internal author only. Published versions, consent, destinations and source identity stay intact. */
export async function POST(request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'growth.forms.author', 'execute', 'tenant')) return canonicalErrorResponse('forbidden')
  if (!tenant.userId) return canonicalErrorResponse('unauthorized')

  let input

  try {
    input = commercialFormClassificationSchema.parse(await request.json())
  } catch {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  try {
    const { formId } = await params
    const definition = await getFormDefinitionById(formId)

    if (!definition) return canonicalErrorResponse('growth_form_not_found')
    if (definition.form_key !== input.formKey) return canonicalErrorResponse('growth_form_classification_conflict')

    return NextResponse.json(await correctCommercialFormClassification(input, tenant.userId))
  } catch (error) {
    if (error instanceof FormClassificationConflictError) return canonicalErrorResponse('growth_form_classification_conflict')
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_classification', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
