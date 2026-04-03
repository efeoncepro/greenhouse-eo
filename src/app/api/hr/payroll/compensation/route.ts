import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { createCompensationVersion, getCompensationOverview } from '@/lib/payroll/get-compensation'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { assertPayrollDateString, parsePayrollNumber } from '@/lib/payroll/shared'
import { requireHrTenantContext } from '@/lib/tenant/authorization'
import { normalizeContractType } from '@/types/hr-contracts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await getCompensationOverview()

    return NextResponse.json(data)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load compensation versions.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    const created = await createCompensationVersion({
      input: {
        memberId: String(body.memberId || ''),
        payRegime: body.payRegime === 'international' ? 'international' : 'chile',
        currency: body.currency === 'USD' ? 'USD' : 'CLP',
        baseSalary: parsePayrollNumber(body.baseSalary, 'baseSalary', { min: 0 }) ?? 0,
        remoteAllowance: parsePayrollNumber(body.remoteAllowance ?? 0, 'remoteAllowance', { min: 0 }) ?? 0,
        colacionAmount: parsePayrollNumber(body.colacionAmount ?? 0, 'colacionAmount', { min: 0 }) ?? 0,
        movilizacionAmount: parsePayrollNumber(body.movilizacionAmount ?? 0, 'movilizacionAmount', { min: 0 }) ?? 0,
        bonusOtdMin: parsePayrollNumber(body.bonusOtdMin ?? 0, 'bonusOtdMin', { min: 0 }) ?? 0,
        bonusOtdMax: parsePayrollNumber(body.bonusOtdMax ?? 0, 'bonusOtdMax', { min: 0 }) ?? 0,
        bonusRpaMin: parsePayrollNumber(body.bonusRpaMin ?? 0, 'bonusRpaMin', { min: 0 }) ?? 0,
        bonusRpaMax: parsePayrollNumber(body.bonusRpaMax ?? 0, 'bonusRpaMax', { min: 0 }) ?? 0,
        gratificacionLegalMode:
          body.gratificacionLegalMode === 'mensual_25pct' ||
          body.gratificacionLegalMode === 'anual_proporcional' ||
          body.gratificacionLegalMode === 'ninguna'
            ? body.gratificacionLegalMode
            : undefined,
        afpName: typeof body.afpName === 'string' ? body.afpName : null,
        afpRate: parsePayrollNumber(body.afpRate, 'afpRate', { allowNull: true, min: 0, max: 1 }),
        healthSystem: body.healthSystem === 'isapre' ? 'isapre' : body.healthSystem === 'fonasa' ? 'fonasa' : null,
        healthPlanUf: parsePayrollNumber(body.healthPlanUf, 'healthPlanUf', { allowNull: true, min: 0 }),
        unemploymentRate: parsePayrollNumber(body.unemploymentRate, 'unemploymentRate', {
          allowNull: true,
          min: 0,
          max: 1
        }),
        contractType: normalizeContractType(typeof body.contractType === 'string' ? body.contractType : null),
        scheduleRequired: typeof body.scheduleRequired === 'boolean' ? body.scheduleRequired : undefined,
        deelContractId: typeof body.deelContractId === 'string' ? body.deelContractId : null,
        hasApv: Boolean(body.hasApv),
        apvAmount: parsePayrollNumber(body.apvAmount ?? 0, 'apvAmount', { min: 0 }) ?? 0,
        desiredNetClp: parsePayrollNumber(body.desiredNetClp, 'desiredNetClp', { allowNull: true, min: 0 }),
        effectiveFrom: assertPayrollDateString(body.effectiveFrom, 'effectiveFrom'),
        changeReason: String(body.changeReason || '')
      },
      actorEmail: session?.user?.email || tenant.userId
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to create compensation version.')
  }
}
