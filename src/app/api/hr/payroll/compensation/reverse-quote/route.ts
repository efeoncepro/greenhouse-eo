import { NextResponse } from 'next/server'

import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { parsePayrollNumber } from '@/lib/payroll/shared'
import { computeGrossFromNet } from '@/lib/payroll/reverse-payroll'
import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const buildTaxTableVersion = (year: number, month: number) =>
  `gael-${year}-${String(month).padStart(2, '0')}`

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

    const desiredNetClp = parsePayrollNumber(body.desiredNetClp, 'desiredNetClp', { min: 1 })

    if (!desiredNetClp) {
      return NextResponse.json({ error: 'desiredNetClp is required and must be > 0' }, { status: 400 })
    }

    const periodDate = typeof body.periodDate === 'string' && body.periodDate.length >= 10
      ? body.periodDate
      : new Date().toISOString().slice(0, 10)

    const year = Number(periodDate.slice(0, 4))
    const month = Number(periodDate.slice(5, 7))

    const [ufSnapshot, utmSnapshot] = await Promise.all([
      getHistoricalEconomicIndicatorForPeriod({ indicatorCode: 'UF', periodDate }),
      getHistoricalEconomicIndicatorForPeriod({ indicatorCode: 'UTM', periodDate })
    ])

    const result = await computeGrossFromNet({
      desiredNetClp,
      periodDate,
      remoteAllowance: parsePayrollNumber(body.remoteAllowance ?? 0, 'remoteAllowance', { min: 0 }) ?? 0,
      colacionAmount: parsePayrollNumber(body.colacionAmount ?? 0, 'colacionAmount', { min: 0 }) ?? 0,
      movilizacionAmount: parsePayrollNumber(body.movilizacionAmount ?? 0, 'movilizacionAmount', { min: 0 }) ?? 0,
      fixedBonusAmount: parsePayrollNumber(body.fixedBonusAmount ?? 0, 'fixedBonusAmount', { min: 0 }) ?? 0,
      gratificacionLegalMode:
        body.gratificacionLegalMode === 'mensual_25pct' ||
        body.gratificacionLegalMode === 'anual_proporcional' ||
        body.gratificacionLegalMode === 'ninguna'
          ? body.gratificacionLegalMode
          : 'ninguna',
      afpName: typeof body.afpName === 'string' ? body.afpName : null,
      afpRate: parsePayrollNumber(body.afpRate, 'afpRate', { allowNull: true, min: 0, max: 1 }),
      healthSystem: body.healthSystem === 'isapre' ? 'isapre' : body.healthSystem === 'fonasa' ? 'fonasa' : 'fonasa',
      healthPlanUf: parsePayrollNumber(body.healthPlanUf, 'healthPlanUf', { allowNull: true, min: 0 }),
      contractType: body.contractType === 'plazo_fijo' ? 'plazo_fijo' : 'indefinido',
      hasApv: Boolean(body.hasApv),
      apvAmount: parsePayrollNumber(body.apvAmount ?? 0, 'apvAmount', { min: 0 }) ?? 0,
      unemploymentRate: parsePayrollNumber(body.unemploymentRate, 'unemploymentRate', { allowNull: true, min: 0, max: 1 }),
      ufValue: ufSnapshot?.value ?? null,
      taxTableVersion: buildTaxTableVersion(year, month),
      utmValue: utmSnapshot?.value ?? null
    })

    return NextResponse.json({
      converged: result.converged,
      iterations: result.iterations,
      baseSalary: result.baseSalary,
      netDifferenceCLP: result.netDifferenceCLP,
      netTotalWithTax: result.netTotalWithTax,
      taxAmountClp: result.taxAmountClp,
      employerTotalCost: result.employerTotalCost,
      forward: {
        grossTotal: result.forward.grossTotal,
        chileGratificacionLegalAmount: result.forward.chileGratificacionLegalAmount,
        chileAfpAmount: result.forward.chileAfpAmount,
        chileHealthAmount: result.forward.chileHealthAmount,
        chileUnemploymentAmount: result.forward.chileUnemploymentAmount,
        chileApvAmount: result.forward.chileApvAmount,
        chileTotalDeductions: result.forward.chileTotalDeductions,
        chileColacionAmount: result.forward.chileColacionAmount,
        chileMovilizacionAmount: result.forward.chileMovilizacionAmount,
        chileEmployerTotalCost: result.forward.chileEmployerTotalCost
      },
      indicators: {
        ufValue: ufSnapshot?.value ?? null,
        utmValue: utmSnapshot?.value ?? null,
        taxTableVersion: buildTaxTableVersion(year, month)
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to compute reverse payroll quote.')
  }
}
