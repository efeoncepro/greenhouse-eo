import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  archiveCtaVersion,
  deprecateCtaVersion,
  pauseCtaVersion,
  publishCtaVersion,
  resumeCtaVersion,
  submitCtaReview,
} from '@/lib/growth/ctas/commands'
import { isCtaEngineEnabled } from '@/lib/growth/ctas/flags'
import { getCtaVersionById } from '@/lib/growth/ctas/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1339 — `POST /api/admin/growth/ctas/{ctaId}/lifecycle` (transiciones gobernadas).
 *
 * Body: `{ action, ctaVersionId }`. Mapa acción → capability fina (NO admin-coarse):
 *  - `submit_review`                → `growth.cta.author`
 *  - `publish`/`deprecate`/`archive`→ `growth.cta.publish`
 *  - `pause`/`resume`               → `growth.cta.pause` (stop de emergencia §16.3 —
 *    capability separada a propósito: pausar no exige autoridad de publicación).
 * La mutación vive en los commands (endpoint de confirmación humana del loop
 * `propose → confirm → execute`); published es inmutable y el publish es atómico.
 */
export const dynamic = 'force-dynamic'

const LIFECYCLE_ACTIONS = ['submit_review', 'publish', 'pause', 'resume', 'deprecate', 'archive'] as const

type LifecycleAction = (typeof LIFECYCLE_ACTIONS)[number]

const CAPABILITY_BY_ACTION: Record<LifecycleAction, 'growth.cta.author' | 'growth.cta.publish' | 'growth.cta.pause'> = {
  submit_review: 'growth.cta.author',
  publish: 'growth.cta.publish',
  pause: 'growth.cta.pause',
  resume: 'growth.cta.pause',
  deprecate: 'growth.cta.publish',
  archive: 'growth.cta.publish',
}

export async function POST(request: Request, { params }: { params: Promise<{ ctaId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!isCtaEngineEnabled()) return canonicalErrorResponse('growth_cta_engine_disabled')

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return canonicalErrorResponse('growth_cta_invalid_input')
  }

  const { action, ctaVersionId } = (body ?? {}) as { action?: string; ctaVersionId?: string }

  if (!action || !ctaVersionId || !(LIFECYCLE_ACTIONS as readonly string[]).includes(action)) {
    return canonicalErrorResponse('growth_cta_invalid_input')
  }

  const lifecycleAction = action as LifecycleAction
  const requiredCapability = CAPABILITY_BY_ACTION[lifecycleAction]

  if (!can(tenant, requiredCapability, 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability } })
  }

  const { ctaId } = await params

  try {
    // La versión debe pertenecer al CTA de la ruta (consistencia del recurso REST).
    const version = await getCtaVersionById(ctaVersionId)

    if (!version || version.cta_id !== ctaId) return canonicalErrorResponse('growth_cta_not_found')

    if (lifecycleAction === 'publish') {
      const result = await publishCtaVersion(ctaVersionId)

      if (!result.ok) {
        if (result.reason === 'not_found') return canonicalErrorResponse('growth_cta_not_found')

        if (result.reason === 'action_not_resolvable') {
          return canonicalErrorResponse('growth_cta_action_not_resolvable', {
            extra: { blockingReasons: result.blockingReasons ?? [] },
          })
        }

        return canonicalErrorResponse('growth_cta_invalid_transition', {
          extra: { fromStatus: result.fromStatus ?? null },
        })
      }

      return NextResponse.json({ ok: true, action: lifecycleAction, ctaVersionId })
    }

    const command = {
      submit_review: submitCtaReview,
      pause: pauseCtaVersion,
      resume: resumeCtaVersion,
      deprecate: deprecateCtaVersion,
      archive: archiveCtaVersion,
    }[lifecycleAction]

    const result = await command(ctaVersionId)

    if (!result.ok) {
      if (result.reason === 'not_found') return canonicalErrorResponse('growth_cta_not_found')

      return canonicalErrorResponse('growth_cta_invalid_transition', {
        extra: { fromStatus: result.fromStatus ?? null },
      })
    }

    return NextResponse.json({ ok: true, action: lifecycleAction, ctaVersionId })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_admin_lifecycle', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
