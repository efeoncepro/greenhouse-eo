import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { reopenPayrollPeriod } from '@/lib/payroll/reopen-period'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { ROLE_CODES } from '@/config/role-codes'
import { hasRoleCode, requireHrTenantContext } from '@/lib/tenant/authorization'

// TASK-410 — POST /api/hr/payroll/periods/[periodId]/reopen
//
// Reopens an exported payroll period for reliquidación. Gated by
// `efeonce_admin` role. The endpoint is thin — all business logic lives in
// `reopenPayrollPeriod()` which runs the transactional state change and
// writes the audit row. This route only handles HTTP concerns: auth, body
// parsing, error translation.

export const dynamic = 'force-dynamic'

interface ReopenRequestBody {
  reason?: string
  reasonDetail?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Elevation: reopen is an admin-only action even within HR route group.
  if (!hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
    return NextResponse.json(
      { error: 'Solo usuarios con rol efeonce_admin pueden reabrir nóminas cerradas.' },
      { status: 403 }
    )
  }

  try {
    const { periodId } = await params

    let body: ReopenRequestBody = {}

    try {
      body = (await request.json()) as ReopenRequestBody
    } catch {
      throw new PayrollValidationError('El cuerpo de la solicitud debe ser JSON válido.', 400)
    }

    const session = await getServerAuthSession()
    const actorUserId = session?.user?.userId || tenant.userId

    if (!actorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await reopenPayrollPeriod({
      periodId,
      reason: body.reason ?? '',
      reasonDetail: body.reasonDetail ?? null,
      actorUserId
    })

    // Reload the period to confirm the transition landed. Callers use this
    // payload to update their cached view without a second GET.
    const updatedPeriod = await getPayrollPeriod(periodId)

    return NextResponse.json({
      ok: true,
      auditId: result.auditId,
      periodId: result.periodId,
      periodStatus: result.periodStatus,
      operationalMonth: result.operationalMonth,
      previousStatus: result.previousStatus,
      reason: result.reason,
      reopenedAt: result.reopenedAt,
      period: updatedPeriod
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'No se pudo reabrir la nómina para reliquidación.')
  }
}
