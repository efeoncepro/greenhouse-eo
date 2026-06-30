import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { authorDraftForm } from '@/lib/growth/forms/commands'
import { type FormKind, type RiskProfile, FORM_KINDS, RISK_PROFILES } from '@/lib/growth/forms/contracts'
import { listFormsAdmin } from '@/lib/growth/forms/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1229 — `/api/admin/growth/forms` (Product API gobernada del motor).
 *
 * GET: lista forms (capability `growth.forms.read`).
 * POST: crea una draft version (capability `growth.forms.author`).
 *
 * Full API parity: delega 100% en los commands/readers de `src/lib/growth/forms/**`.
 * Dual-gate: requireInternalTenantContext (clientes excluidos) + can().
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.read' } })
  }

  try {
    const items = await listFormsAdmin()

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_list', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.author', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.author' } })
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  const slug = typeof body.slug === 'string' ? body.slug : ''
  const name = typeof body.name === 'string' ? body.name : ''
  const formKind = typeof body.formKind === 'string' ? body.formKind : ''
  const purpose = typeof body.purpose === 'string' ? body.purpose : ''

  if (!slug || !name || !FORM_KINDS.includes(formKind as FormKind) || !purpose) {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  const riskProfile =
    typeof body.riskProfile === 'string' && RISK_PROFILES.includes(body.riskProfile as RiskProfile)
      ? (body.riskProfile as RiskProfile)
      : undefined

  try {
    const result = await authorDraftForm({
      slug,
      name,
      formKind: formKind as FormKind,
      purpose,
      riskProfile,
      locale: typeof body.locale === 'string' ? body.locale : undefined,
      fieldSchema: body.fieldSchema ?? [],
      // TASK-1256 Slice 3 — el builder persiste la política de validación (emailPolicy)
      // en validation_schema_json vía el command gobernado (el command ya lo aceptaba).
      validationSchema: body.validationSchema,
      uiPolicy: body.uiPolicy,
      successBehavior: body.successBehavior,
      consentPolicyVersion: typeof body.consentPolicyVersion === 'string' ? body.consentPolicyVersion : undefined,
      dataClassification: body.dataClassification,
      destinationPolicy: body.destinationPolicy,
      analyticsPolicy: body.analyticsPolicy,
      retentionPolicy: body.retentionPolicy,
      commercialHandoffPolicy: body.commercialHandoffPolicy,
      createdBy: tenant.userId ?? undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_author', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
