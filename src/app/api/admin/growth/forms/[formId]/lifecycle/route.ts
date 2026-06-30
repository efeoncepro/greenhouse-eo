import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { archiveForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1229 — `POST /api/admin/growth/forms/{formId}/lifecycle` — transición de
 * lifecycle gobernada (review/publish/deprecate/archive). `review` requiere
 * `growth.forms.review`; el resto `growth.forms.publish`. La publicación corre el
 * policy compiler; si el gate falla devuelve `blockingReasons` (no publica).
 */
export const dynamic = 'force-dynamic'

const ACTIONS = ['review', 'publish', 'deprecate', 'archive'] as const

type LifecycleAction = (typeof ACTIONS)[number]

export async function POST(request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const { formId } = await params

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  const action = typeof body.action === 'string' ? body.action : ''
  const formVersionId = typeof body.formVersionId === 'string' ? body.formVersionId : ''

  if (!ACTIONS.includes(action as LifecycleAction) || !formVersionId) {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  const requiredCapability = action === 'review' ? 'growth.forms.review' : 'growth.forms.publish'

  if (!can(tenant, requiredCapability, 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability } })
  }

  try {
    if (action === 'review') return NextResponse.json(await reviewForm(formVersionId))

    if (action === 'publish') {
      const result = await publishForm(formVersionId)

      return NextResponse.json(result, { status: result.ok ? 200 : 409 })
    }

    if (action === 'deprecate') {
      await deprecateForm(formVersionId)

      return NextResponse.json({ ok: true })
    }

    await archiveForm(formVersionId, formId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_lifecycle', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
