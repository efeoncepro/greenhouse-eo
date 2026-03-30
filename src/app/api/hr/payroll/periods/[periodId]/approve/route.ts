import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getBigQueryProjectId } from '@/lib/bigquery'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { getPayrollPeriodReadiness } from '@/lib/payroll/payroll-readiness'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import { PayrollValidationError, runPayrollQuery } from '@/lib/payroll/shared'
import { requireHrTenantContext } from '@/lib/tenant/authorization'
import { isPayrollPostgresEnabled, pgSetPeriodApproved } from '@/lib/payroll/postgres-store'

export const dynamic = 'force-dynamic'

const getProjectId = () => getBigQueryProjectId()

export async function POST(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensurePayrollInfrastructure()
    const projectId = getProjectId()

    const { periodId } = await params
    const period = await getPayrollPeriod(periodId)

    if (!period) {
      throw new PayrollValidationError('Payroll period not found.', 404)
    }

    if (period.status !== 'calculated') {
      throw new PayrollValidationError('Only calculated payroll periods can be approved.', 409)
    }

    const entries = await getPayrollEntries(periodId)

    if (entries.length === 0) {
      throw new PayrollValidationError('Payroll period has no calculated entries to approve.', 409)
    }

    const invalidBonusEntries = entries.filter(
      entry =>
        (!entry.kpiOtdQualifies && entry.bonusOtdAmount !== 0) ||
        (entry.kpiOtdQualifies && (entry.bonusOtdAmount < 0 || entry.bonusOtdAmount > entry.bonusOtdMax)) ||
        (!entry.kpiRpaQualifies && entry.bonusRpaAmount !== 0) ||
        (entry.kpiRpaQualifies && (entry.bonusRpaAmount < 0 || entry.bonusRpaAmount > entry.bonusRpaMax))
    )

    if (invalidBonusEntries.length > 0) {
      throw new PayrollValidationError('Some payroll entries still have bonus values outside the allowed rules.', 400, {
        entryIds: invalidBonusEntries.map(entry => entry.entryId)
      })
    }

    const readiness = await getPayrollPeriodReadiness(periodId)

    if (!readiness.approval.ready) {
      throw new PayrollValidationError('Payroll period is not ready for approval.', 409, {
        blockingIssues: readiness.approval.blockingIssues
      })
    }

    const session = await getServerSession(authOptions)
    const actorIdentifier = session?.user?.email || tenant.userId

    if (isPayrollPostgresEnabled()) {
      await pgSetPeriodApproved(periodId, actorIdentifier)
    } else {
      await runPayrollQuery(
        `
          UPDATE \`${projectId}.greenhouse.payroll_periods\`
          SET
            status = 'approved',
            approved_at = CURRENT_TIMESTAMP(),
            approved_by = @actorIdentifier
          WHERE period_id = @periodId
        `,
        {
          periodId,
          actorIdentifier
        }
      )
    }

    const updated = await getPayrollPeriod(periodId)

    return NextResponse.json(updated)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to approve payroll period.')
  }
}
