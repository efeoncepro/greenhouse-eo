import { NextResponse } from 'next/server'

import { resolveFinanceDownstreamScope } from '@/lib/finance/canonical'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { FinanceValidationError, assertNonEmptyString, assertPositiveAmount, toNumber, ALLOCATION_METHODS } from '@/lib/finance/shared'
import {
  createCostAllocation,
  getCostAllocationsByExpense,
  getCostAllocationsByClient,
  listCostAllocationsByPeriod,
  deleteCostAllocation
} from '@/lib/finance/postgres-store-intelligence'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const expenseId = searchParams.get('expenseId')
  const clientId = searchParams.get('clientId')
  const organizationId = searchParams.get('organizationId')
  const clientProfileId = searchParams.get('clientProfileId')
  const hubspotCompanyId = searchParams.get('hubspotCompanyId')
  const spaceId = searchParams.get('spaceId')
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))

  try {
    if (expenseId) {
      const allocations = await getCostAllocationsByExpense(expenseId)

      return NextResponse.json({ allocations, items: allocations, total: allocations.length })
    }

    if (year && month) {
      const resolvedScope = (clientId || organizationId || clientProfileId || hubspotCompanyId || spaceId)
        ? await resolveFinanceDownstreamScope({
            clientId,
            organizationId,
            clientProfileId,
            hubspotCompanyId,
            requestedSpaceId: spaceId,
            requireLegacyClientBridge: true
          })
        : null

      const allocations = resolvedScope?.clientId
        ? await getCostAllocationsByClient(resolvedScope.clientId, year, month)
        : await listCostAllocationsByPeriod(year, month)

      return NextResponse.json({ allocations, items: allocations, total: allocations.length })
    }

    return NextResponse.json(
      { error: 'Provide expenseId or year+month query params. Add organization/client selectors only when you want to narrow the period.' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const expenseId = assertNonEmptyString(body.expenseId, 'expenseId')
    const allocationPercent = toNumber(body.allocationPercent)

    if (allocationPercent <= 0 || allocationPercent > 1) {
      throw new FinanceValidationError('allocationPercent must be between 0 and 1 (exclusive/inclusive)')
    }

    const allocatedAmountClp = assertPositiveAmount(toNumber(body.allocatedAmountClp), 'allocatedAmountClp')
    const periodYear = toNumber(body.periodYear)
    const periodMonth = toNumber(body.periodMonth)

    if (periodYear < 2020 || periodYear > 2100) {
      throw new FinanceValidationError('periodYear must be between 2020 and 2100')
    }

    if (periodMonth < 1 || periodMonth > 12) {
      throw new FinanceValidationError('periodMonth must be between 1 and 12')
    }

    const method = body.allocationMethod || 'manual'

    if (!ALLOCATION_METHODS.includes(method)) {
      throw new FinanceValidationError(`allocationMethod must be one of: ${ALLOCATION_METHODS.join(', ')}`)
    }

    const resolvedScope = await resolveFinanceDownstreamScope({
      organizationId: body.organizationId,
      clientId: body.clientId,
      clientProfileId: body.clientProfileId,
      hubspotCompanyId: body.hubspotCompanyId,
      requestedSpaceId: body.spaceId,
      requireLegacyClientBridge: true
    })

    const clientId = assertNonEmptyString(resolvedScope.clientId, 'clientId')

    const clientName = assertNonEmptyString(
      body.clientName || resolvedScope.legalName || resolvedScope.clientName || resolvedScope.organizationId || clientId,
      'clientName'
    )

    const allocation = await createCostAllocation({
      expenseId,
      clientId,
      clientName,
      allocationPercent,
      allocatedAmountClp,
      periodYear,
      periodMonth,
      allocationMethod: method,
      notes: body.notes || null,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json({ allocation, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function DELETE(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const allocationId = searchParams.get('allocationId')

  if (!allocationId) {
    return NextResponse.json({ error: 'allocationId is required' }, { status: 400 })
  }

  await deleteCostAllocation(allocationId)

  return NextResponse.json({ deleted: true })
}
