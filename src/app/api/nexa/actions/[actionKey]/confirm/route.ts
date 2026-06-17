import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { confirmNexaAction } from '@/lib/nexa/actions/confirm'
import { recordNexaActionEvent } from '@/lib/nexa/actions/events-store'
import { buildNexaActionContext } from '@/lib/nexa/actions/registry'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ actionKey: string }>
}

interface ConfirmBody {
  idempotencyKey?: string
}

/**
 * TASK-1137 — POST /api/nexa/actions/[actionKey]/confirm
 *
 * The single, deterministic, human-triggered executor of a governed Nexa action. The LLM NEVER
 * calls this; the human confirms a proposal in the UI and the UI hits this endpoint, echoing the
 * proposal's server-generated idempotency key. Flow:
 *   1. Authenticated session + `nexa.action.execute` capability (internal pilot audience).
 *   2. `confirmNexaAction` re-validates the action at execute time and runs the bound command via
 *      the API Platform command/idempotency foundation (TASK-655, `principalKind='app_user'`).
 *   3. Canonical es-CL responses; no English/raw errors cross to the client.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { actionKey } = await params
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'nexa.action.execute', 'execute', 'own')) {
    return canonicalErrorResponse('forbidden')
  }

  let body: ConfirmBody = {}

  try {
    body = ((await request.json()) ?? {}) as ConfirmBody
  } catch {
    body = {}
  }

  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : `nexa-act-idem-${randomUUID()}`

  const context = buildNexaActionContext(tenant)

  try {
    const outcome = await confirmNexaAction({ actionKey, context, idempotencyKey, request })

    if (outcome.kind === 'gap') {
      await recordNexaActionEvent({ userId: context.userId, actionKey, eventType: 'execution_denied', reason: outcome.reason, idempotencyKey })

      return canonicalErrorResponse('nexa_action_not_available')
    }

    if (outcome.kind === 'conflict') {
      await recordNexaActionEvent({ userId: context.userId, actionKey, eventType: 'conflict', idempotencyKey })

      return canonicalErrorResponse('nexa_action_conflict')
    }

    await recordNexaActionEvent({
      userId: context.userId,
      actionKey,
      eventType: 'executed',
      idempotencyKey,
      replayed: outcome.replayed
    })

    return NextResponse.json({
      ok: outcome.result.ok,
      actionKey,
      summary: outcome.result.summary,
      metrics: outcome.result.metrics ?? [],
      replayed: outcome.replayed
    })
  } catch (error) {
    // `failed` (server fault del command) alimenta la señal `nexa.action.failure_rate`.
    await recordNexaActionEvent({ userId: context.userId, actionKey, eventType: 'failed', idempotencyKey })

    captureWithDomain(error, 'home', {
      tags: { source: 'nexa_action_confirm', actionKey },
      extra: { detail: redactErrorForResponse(error), userId: context.userId }
    })

    return canonicalErrorResponse('nexa_action_failed')
  }
}
