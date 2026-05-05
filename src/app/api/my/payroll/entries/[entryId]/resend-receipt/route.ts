import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { checkPayslipResendRateLimit } from '@/lib/payroll/payslip-resend-rate-limit'
import { sendPayslipForEntry } from '@/lib/payroll/send-payslip-for-entry'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ entryId: string }>
}

/**
 * TASK-759e — POST /api/my/payroll/entries/[entryId]/resend-receipt
 *
 * Self-service: el colaborador reenvia su propio recibo. Diferente del
 * endpoint admin (`/api/admin/finance/payment-orders/[orderId]/resend-payslips`)
 * que opera order-wide.
 *
 * Reglas duras:
 *  - Auth: requireMyTenantContext (efeonce_internal + memberId no-null).
 *  - Capability: `personal_workspace.payslip.resend_self` (scope=own).
 *  - Ownership: entry.memberId DEBE ser igual a session.memberId (403 si no).
 *  - Rate-limit: 1 reenvio por hora per (memberId, entryId). Fuente unica
 *    de verdad: payslip_deliveries con kind='manual_resend'.
 *  - Audit: el delivery row queda persistido por sendPayslipForEntry —
 *    no requiere log paralelo.
 *
 * Reusa helper canonico `sendPayslipForEntry({trigger:'manual_resend'})` —
 * single source de generacion + envio + persistencia de payslip_delivery.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.payslip.resend_self', 'update', 'own')) {
    return NextResponse.json(
      { error: 'Capability missing: personal_workspace.payslip.resend_self', code: 'forbidden' },
      { status: 403 }
    )
  }

  const { entryId } = await params

  try {
    const entry = await getPayrollEntryById(entryId)

    if (!entry || entry.memberId !== memberId) {
      return NextResponse.json({ error: 'Forbidden', code: 'not_owner' }, { status: 403 })
    }

    const rate = await checkPayslipResendRateLimit({ memberId, entryId })

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: 'Ya reenviaste tu recibo recientemente. Intenta nuevamente en unos minutos.',
          code: 'rate_limited',
          retryAfterSeconds: rate.retryAfterSeconds,
          lastResendAt: rate.lastResendAt
        },
        { status: 429, headers: rate.retryAfterSeconds ? { 'Retry-After': String(rate.retryAfterSeconds) } : undefined }
      )
    }

    const session = await getServerAuthSession()

    const result = await sendPayslipForEntry({
      entryId,
      trigger: 'manual_resend',
      actorEmail: session?.user?.email ?? null
    })

    if (result.status === 'sent') {
      return NextResponse.json({
        ok: true,
        status: result.status,
        receiptId: result.receiptId,
        resendId: result.resendId
      })
    }

    if (result.status === 'skipped_no_email') {
      return NextResponse.json(
        {
          ok: false,
          status: result.status,
          error: 'No tenemos un email registrado para enviar tu recibo. Contacta a HR.',
          code: 'no_email'
        },
        { status: 422 }
      )
    }

    if (result.status === 'failed_generation' || result.status === 'failed_email') {
      return NextResponse.json(
        {
          ok: false,
          status: result.status,
          error: 'No pudimos enviar tu recibo. Intenta de nuevo en unos minutos.',
          code: result.status
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, status: result.status, receiptId: result.receiptId, resendId: result.resendId })
  } catch (error) {
    captureWithDomain(error, 'payroll', {
      extra: { route: 'my/payroll/entries/resend-receipt', entryId, memberId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
