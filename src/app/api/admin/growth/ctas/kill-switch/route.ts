import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  CTA_KILL_SWITCH_ACTIONS,
  CTA_KILL_SWITCH_SCOPES,
  type CtaKillSwitchAction,
  type CtaKillSwitchScope,
} from '@/lib/growth/ctas/contracts'
import { getKillSwitchState, listKillSwitchAudit, setCtaKillSwitch } from '@/lib/growth/ctas/kill-switch'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1428 — `GET/POST /api/admin/growth/ctas/kill-switch` (arch §16.3).
 *
 * GET  → estado vigente + audit trail (capability `growth.cta.read`).
 * POST → `{ action: 'engage'|'release', scope: 'global'|'surface', surfaceId?, reason }`
 *        (capability `growth.cta.pause` — la autoridad del stop de emergencia,
 *        deliberadamente separada de `publish`). La mutación vive en el command
 *        (endpoint de confirmación humana del loop propose → confirm → execute);
 *        el estado se persiste en DB (NUNCA env var) y opera sin redeploy.
 *
 * Nota: este endpoint NO se gatea por `GROWTH_CTA_ENGINE_ENABLED` en POST — el kill
 * switch debe poder operarse incluso mientras se degrada el motor (releasing un
 * switch con el motor apagado es inocuo; el flag OFF ya detiene el render).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.cta.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.cta.read' } })
  }

  try {
    const [state, audit] = await Promise.all([getKillSwitchState(), listKillSwitchAudit()])

    return NextResponse.json({ state, audit })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_admin_kill_switch', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.cta.pause', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.cta.pause' } })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return canonicalErrorResponse('growth_cta_invalid_input')
  }

  const payload = (body ?? {}) as {
    action?: string
    scope?: string
    surfaceId?: string
    reason?: string
  }

  if (
    !payload.action ||
    !(CTA_KILL_SWITCH_ACTIONS as readonly string[]).includes(payload.action) ||
    !payload.scope ||
    !(CTA_KILL_SWITCH_SCOPES as readonly string[]).includes(payload.scope) ||
    typeof payload.reason !== 'string'
  ) {
    return canonicalErrorResponse('growth_cta_invalid_input')
  }

  try {
    const result = await setCtaKillSwitch({
      scope: payload.scope as CtaKillSwitchScope,
      surfaceId: payload.surfaceId ?? null,
      action: payload.action as CtaKillSwitchAction,
      reason: payload.reason,
      actorRef: tenant.userId ?? null,
    })

    if (!result.ok) {
      if (result.reason === 'surface_not_found') return canonicalErrorResponse('growth_cta_not_found')

      return canonicalErrorResponse('growth_cta_invalid_input')
    }

    return NextResponse.json({
      ok: true,
      action: payload.action,
      scope: payload.scope,
      surfaceId: payload.surfaceId ?? null,
      changed: result.changed,
    })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_admin_kill_switch', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
