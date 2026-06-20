import { NextResponse } from 'next/server'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getF29ConsolidatedMonthlyPosition } from '@/lib/finance/f29-consolidated'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-1195 — Posición F29 mensual CONSOLIDADA (child E de TASK-1186).
 *
 * Une las 3 líneas del F29 (IVA TASK-725 / Retención TASK-1188 / PPM TASK-1189) en
 * una sola respuesta por entidad legal + período. Mirror del patrón de las 3 líneas:
 * scope = operating entity (RUT), NUNCA `space_id`; `fiscal_entity_unavailable` si no
 * hay entidad legal configurada.
 *
 * Cada línea puede venir `null` (degradación honesta: sin posición materializada del
 * período) y `enabledByLine` distingue oficial vs shadow — el consumer NUNCA debe
 * totalizar como F29 oficial una línea con `enabled:false`.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // El F29 se declara por entidad legal (RUT), no por space — igual que sus 3 líneas.
  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity) {
    return canonicalErrorResponse('fiscal_entity_unavailable')
  }

  const legalEntityOrganizationId = operatingEntity.organizationId

  const { searchParams } = new URL(request.url)
  const currentPeriod = getFinanceCurrentPeriod()
  const year = Number(searchParams.get('year')) || currentPeriod.year
  const month = Number(searchParams.get('month')) || currentPeriod.month

  const consolidated = await getF29ConsolidatedMonthlyPosition({ legalEntityOrganizationId, year, month })

  return NextResponse.json({
    enabledByLine: consolidated.enabledByLine,
    vat: consolidated.vat,
    retention: consolidated.retention,
    ppm: consolidated.ppm,
    periodId: consolidated.periodId,
    year,
    month,
    legalEntity: {
      organizationId: operatingEntity.organizationId,
      legalName: operatingEntity.legalName,
      taxId: operatingEntity.taxId,
      country: operatingEntity.country
    }
  })
}
