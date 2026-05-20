import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { updateCompensationVersion } from '@/lib/payroll/get-compensation'
import { PayrollValidationError, assertPayrollDateString, parsePayrollNumber } from '@/lib/payroll/shared'
import { requireHrTenantContext } from '@/lib/tenant/authorization'
import {
  INTERNATIONAL_INTERNAL_CONTRACT_CAPABILITY,
  INTERNATIONAL_INTERNAL_LEGAL_REVIEW_ERROR_CODE,
  isInternationalInternalContractType,
  normalizeContractType
} from '@/types/hr-contracts'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const session = await getServerAuthSession()
    const { versionId } = await params
    const contractType = normalizeContractType(typeof body.contractType === 'string' ? body.contractType : null)

    if (isInternationalInternalContractType(contractType)) {
      const subject = buildTenantEntitlementSubject(tenant)

      if (!can(subject, INTERNATIONAL_INTERNAL_CONTRACT_CAPABILITY, 'update', 'tenant')) {
        throw new PayrollValidationError(
          `Forbidden — capability ${INTERNATIONAL_INTERNAL_CONTRACT_CAPABILITY}:update required`,
          403,
          { capability: INTERNATIONAL_INTERNAL_CONTRACT_CAPABILITY }
        )
      }

      if (typeof body.legalReviewReference !== 'string' || body.legalReviewReference.trim().length < 10) {
        throw new PayrollValidationError(
          'legalReviewReference is required for international_internal contracts.',
          400,
          null,
          INTERNATIONAL_INTERNAL_LEGAL_REVIEW_ERROR_CODE
        )
      }
    }

    const updated = await updateCompensationVersion({
      versionId,
      input: {
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
        contractType,
        scheduleRequired: typeof body.scheduleRequired === 'boolean' ? body.scheduleRequired : undefined,
        deelContractId: typeof body.deelContractId === 'string' ? body.deelContractId : null,
        hasApv: Boolean(body.hasApv),
        apvAmount: parsePayrollNumber(body.apvAmount ?? 0, 'apvAmount', { min: 0 }) ?? 0,
        desiredNetClp: parsePayrollNumber(body.desiredNetClp, 'desiredNetClp', { allowNull: true, min: 0 }),
        legalReviewReference: typeof body.legalReviewReference === 'string' ? body.legalReviewReference : null,
        effectiveFrom: assertPayrollDateString(body.effectiveFrom, 'effectiveFrom'),
        changeReason: String(body.changeReason || '')
      },
      actorEmail: session?.user?.email || tenant.userId
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to update compensation version.')
  }
}
