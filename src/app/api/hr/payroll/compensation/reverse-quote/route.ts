import { NextResponse } from 'next/server'

import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { parsePayrollNumber } from '@/lib/payroll/shared'
import { computeGrossFromNet } from '@/lib/payroll/reverse-payroll'
import { resolvePayrollTaxTableVersion } from '@/lib/payroll/tax-table-version'
import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { getImmForPeriod } from '@/lib/payroll/chile-previsional-helpers'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

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
    const resolvedTaxTableVersion = await resolvePayrollTaxTableVersion({ year, month })

    const [ufSnapshot, utmSnapshot, immValue] = await Promise.all([
      getHistoricalEconomicIndicatorForPeriod({ indicatorCode: 'UF', periodDate }),
      getHistoricalEconomicIndicatorForPeriod({ indicatorCode: 'UTM', periodDate }),
      getImmForPeriod(periodDate)
    ])

    if (!resolvedTaxTableVersion) {
      return NextResponse.json(
        {
          error:
            'No existe una tabla tributaria Chile sincronizada para ese mes. Sincroniza la base previsional antes de cotizar o calcular nómina Chile.'
        },
        { status: 409 }
      )
    }

    // Reverse calculation:
    // - Uses LEGAL 7% health (fonasa), not the member's Isapre plan
    // - Does NOT pass afpRate — lets the forward engine resolve it from Previred
    // - Excludes voluntary deductions (APV, Isapre excess)
    const afpName = typeof body.afpName === 'string' ? body.afpName : null

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
      afpName,
      afpRate: null,
      afpCotizacionRate: null,
      afpComisionRate: null,
      healthSystem: 'fonasa',
      healthPlanUf: null,
      contractType: body.contractType === 'plazo_fijo' ? 'plazo_fijo' : 'indefinido',
      hasApv: false,
      apvAmount: 0,
      unemploymentRate: parsePayrollNumber(body.unemploymentRate, 'unemploymentRate', { allowNull: true, min: 0, max: 1 }),
      ufValue: ufSnapshot?.value ?? null,
      taxTableVersion: resolvedTaxTableVersion,
      utmValue: utmSnapshot?.value ?? null,
      minBaseSalary: typeof immValue === 'number' && immValue > 0 ? immValue : 0
    })

    const clampedAtFloor = result.clampedAtFloor

    // Isapre excess: compute difference between plan cost and 7% legal
    const actualHealthSystem = body.healthSystem === 'isapre' ? 'isapre' : 'fonasa'
    const actualHealthPlanUf = parsePayrollNumber(body.healthPlanUf, 'healthPlanUf', { allowNull: true, min: 0 })
    let isapreExcess: number | null = null
    let netAfterIsapre: number | null = null

    if (actualHealthSystem === 'isapre' && actualHealthPlanUf && actualHealthPlanUf > 0 && ufSnapshot?.value) {
      const isapreTotal = Math.round(actualHealthPlanUf * ufSnapshot.value)
      const legalHealth7pct = result.forward.chileHealthAmount ?? 0

      if (isapreTotal > legalHealth7pct) {
        isapreExcess = isapreTotal - legalHealth7pct
        netAfterIsapre = Math.round(result.netTotalWithTax - isapreExcess)
      }
    }

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
      isapreExcess,
      netAfterIsapre,
      clampedAtFloor,
      immValue: typeof immValue === 'number' ? immValue : null,
      resolvedAfpRate: result.forward.chileAfpRate,
      indicators: {
        ufValue: ufSnapshot?.value ?? null,
        utmValue: utmSnapshot?.value ?? null,
        taxTableVersion: resolvedTaxTableVersion
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to compute reverse payroll quote.')
  }
}
