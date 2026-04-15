import { NextResponse } from 'next/server'

import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { pgGetPayrollEntryById, pgGetPayrollEntryVersions } from '@/lib/payroll/postgres-store'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

// TASK-412 — GET /api/hr/payroll/entries/[entryId]/versions
//
// Returns every version (v1 + v2+) of a payroll entry for the admin
// history drawer. Read-only, does not require admin elevation beyond the
// base HR tenant context (the history surface is part of the standard
// payroll operating view).

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { entryId } = await params

    const entry = await pgGetPayrollEntryById(entryId)

    if (!entry) {
      throw new PayrollValidationError(`Entry de nómina ${entryId} no existe.`, 404)
    }

    const versions = await pgGetPayrollEntryVersions(entry.periodId, entry.memberId)

    return NextResponse.json({
      entryId,
      periodId: entry.periodId,
      memberId: entry.memberId,
      memberName: entry.memberName,
      currency: entry.currency,
      versions
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'No se pudo cargar el historial de versiones.')
  }
}
