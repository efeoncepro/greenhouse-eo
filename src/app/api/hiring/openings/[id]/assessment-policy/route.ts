import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, hiringNotFoundResponse, toHiringErrorResponse } from '@/lib/hiring'
import {
  configureOpeningAssessmentPolicy,
  disableOpeningAssessmentPolicy,
  enableOpeningAssessmentPolicy,
  listPolicyEvents,
  resolveActivePolicyForOpening,
} from '@/lib/hiring/assessment/assignment-policy'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1719 Slice 1 — `GET/PUT/POST /api/hiring/openings/[id]/assessment-policy`.
 *
 * GET (read): policy vigente de la vacante + su historia append-only.
 * PUT (govern): crea o reconfigura la policy. SIEMPRE la deja en `draft` — configurar no es
 * habilitar (ADR D5.1).
 * POST (govern): transición de estado explícita (`{ action: 'enable' | 'disable' }`). Habilitar
 * exige opening `published` + digest de contenido observado + audit; deshabilitar es el kill
 * switch canónico y nunca borra nada.
 *
 * El caller NUNCA elige la plantilla en el momento de asignar: la declara acá, una vez, y
 * Greenhouse la resuelve server-side desde la vacante.
 */
export const dynamic = 'force-dynamic'

const GOVERN_CAPABILITY = 'hiring.assessment.policy.govern'

interface PolicyBody {
  templateId?: string
  mode?: string
  triggerStage?: string | null
  timeLimitMinutes?: number | null
  volumeCapPerWindow?: number | null
  volumeWindowMinutes?: number | null
}

interface PolicyActionBody {
  action?: 'enable' | 'disable'
  reasonCode?: string | null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.read' } })
  }

  try {
    const { id } = await params
    const policy = await resolveActivePolicyForOpening(id)

    if (!policy) {
      return NextResponse.json({ policy: null, events: [], canGovern: can(tenant, GOVERN_CAPABILITY, 'execute', 'tenant') })
    }

    const events = await listPolicyEvents(policy.policyId)

    return NextResponse.json({
      policy,
      events,
      canGovern: can(tenant, GOVERN_CAPABILITY, 'execute', 'tenant'),
    })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_policy_detail')
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, GOVERN_CAPABILITY, 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: GOVERN_CAPABILITY } })
  }

  let body: PolicyBody

  try {
    body = (await request.json()) as PolicyBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const { id } = await params

    const policy = await configureOpeningAssessmentPolicy(
      {
        openingId: id,
        templateId: body.templateId ?? '',
        mode: body.mode ?? null,
        triggerStage: body.triggerStage ?? null,
        timeLimitMinutes: body.timeLimitMinutes ?? null,
        volumeCapPerWindow: body.volumeCapPerWindow ?? null,
        volumeWindowMinutes: body.volumeWindowMinutes ?? null,
      },
      tenant.userId,
    )

    return NextResponse.json({ policy })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_policy_configure')
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, GOVERN_CAPABILITY, 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: GOVERN_CAPABILITY } })
  }

  let body: PolicyActionBody

  try {
    body = (await request.json()) as PolicyActionBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  if (body.action !== 'enable' && body.action !== 'disable') {
    return NextResponse.json(
      { error: 'La acción debe ser enable o disable.', code: 'assessment_policy_invalid_action', actionable: false },
      { status: 400 },
    )
  }

  try {
    const { id } = await params
    const current = await resolveActivePolicyForOpening(id)

    if (!current) {
      return hiringNotFoundResponse(
        'La vacante todavía no declara una policy de evaluación.',
        'assessment_policy_not_found',
      )
    }

    const policy =
      body.action === 'enable'
        ? await enableOpeningAssessmentPolicy(current.policyId, tenant.userId)
        : await disableOpeningAssessmentPolicy(current.policyId, tenant.userId, body.reasonCode ?? null)

    return NextResponse.json({ policy })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_policy_transition')
  }
}
