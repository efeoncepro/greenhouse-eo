import { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  sendAeoReportAndCreateLead,
  type SendReportBlockedReason
} from '@/lib/growth/ai-visibility/operator/send-report-and-create-lead'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1279 — `POST /api/admin/growth/ai-visibility/runs/[runId]/send-lead`
 *
 * Cross-sell operador: envía el informe AEO al contacto + crea/asocia un **Lead de HubSpot**
 * (objeto `leads`, NO un Deal). Delega en el command gobernado `sendAeoReportAndCreateLead`, que
 * gatea (capability + flag + consent), claima el audit y publica el outbox event; el reactive
 * consumer hace email + Lead (NUNCA inline acá). Espeja el lane admin de `lead-handoff`.
 *
 * Auth dual-gate: requireInternalTenantContext (clientes excluidos) + capability
 * `growth.ai_visibility.lead.open`.
 */

export const dynamic = 'force-dynamic'

const BLOCK_TO_CANONICAL: Record<SendReportBlockedReason, CanonicalErrorCode> = {
  forbidden: 'forbidden',
  disabled: 'aeo_send_disabled',
  invalid_recipient: 'aeo_send_invalid_input',
  organization_not_found: 'aeo_send_invalid_input',
  report_unavailable: 'aeo_send_report_unavailable',
  consent_required: 'aeo_send_consent_required',
  category_unresolved: 'aeo_category_unresolved',
  business_model_unconfirmed: 'aeo_business_model_unconfirmed'
}

interface SendLeadBody {
  organizationId?: unknown
  recipient?: { email?: unknown; firstName?: unknown; lastName?: unknown }
  consentRef?: unknown
}

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.lead.open', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.lead.open' }
    })
  }

  const { runId } = await params

  let body: SendLeadBody

  try {
    body = (await request.json()) as SendLeadBody
  } catch {
    return canonicalErrorResponse('aeo_send_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const organizationId = asNonEmptyString(body.organizationId)
  const email = asNonEmptyString(body.recipient?.email)

  if (!organizationId || !email) {
    return canonicalErrorResponse('aeo_send_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['organizationId', 'recipient.email'] }
    })
  }

  try {
    const result = await sendAeoReportAndCreateLead({
      subject: tenant,
      organizationId,
      runId,
      recipient: {
        email,
        firstName: asNonEmptyString(body.recipient?.firstName),
        lastName: asNonEmptyString(body.recipient?.lastName)
      },
      consentRef: asNonEmptyString(body.consentRef)
    })

    if (result.status === 'blocked') {
      return canonicalErrorResponse(BLOCK_TO_CANONICAL[result.reason])
    }

    return NextResponse.json(
      {
        sendId: result.sendId,
        leadType: result.leadType,
        idempotentHit: result.idempotentHit,
        status: 'queued'
      },
      { status: 202 }
    )
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_send_lead_route' },
      extra: { runId, organizationId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
