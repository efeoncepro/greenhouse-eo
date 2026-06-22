import { NextResponse } from 'next/server'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { isPpmPositionEnabled } from '@/lib/finance/ppm/flags'
import {
  buildPpmPeriodId,
  getPpmMonthlyPosition,
  listPpmMonthlyPositions,
  type PpmMonthlyPositionRecord
} from '@/lib/finance/ppm-ledger'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const buildEmptyPosition = ({
  legalEntityOrgId,
  year,
  month
}: {
  legalEntityOrgId: string
  year: number
  month: number
}): PpmMonthlyPositionRecord => ({
  ppmPositionId: `EO-PMP-${year}${String(month).padStart(2, '0')}-${legalEntityOrgId}`,
  periodId: buildPpmPeriodId(year, month),
  periodYear: year,
  periodMonth: month,
  organizationId: legalEntityOrgId,
  baseAmountClp: 0,
  ppmRate: 0,
  ppmAmountClp: 0,
  rateSource: null,
  documentCount: 0,
  materializedAt: null,
  materializationReason: null
})

const escapeCsv = (value: string | number | null) => {
  const normalized = value == null ? '' : String(value)

  return `"${normalized.replaceAll('"', '""')}"`
}

const toCsv = ({ position }: { position: PpmMonthlyPositionRecord }) => {
  const rows: Array<Array<string | number | null>> = [
    ['period_id', position.periodId],
    ['base_amount_clp', position.baseAmountClp],
    ['ppm_rate', position.ppmRate],
    ['ppm_amount_clp', position.ppmAmountClp],
    ['rate_source', position.rateSource],
    ['document_count', position.documentCount]
  ]

  return rows.map(row => row.map(value => escapeCsv(value)).join(',')).join('\n')
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-1189 — La línea PPM del F29 se declara por entidad legal (RUT), no por
  // space. Mismo patrón que IVA/retenciones: scope = operating entity.
  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity) {
    return canonicalErrorResponse('fiscal_entity_unavailable')
  }

  const legalEntityOrganizationId = operatingEntity.organizationId

  const { searchParams } = new URL(request.url)
  const currentPeriod = getFinanceCurrentPeriod()
  const year = Number(searchParams.get('year')) || currentPeriod.year
  const month = Number(searchParams.get('month')) || currentPeriod.month
  const format = searchParams.get('format')

  const [position, recentPositions] = await Promise.all([
    getPpmMonthlyPosition({ legalEntityOrganizationId, year, month }),
    listPpmMonthlyPositions({ legalEntityOrganizationId, limit: 6 })
  ])

  const resolvedPosition = position ?? buildEmptyPosition({ legalEntityOrgId: legalEntityOrganizationId, year, month })

  if (format === 'csv') {
    return new NextResponse(toCsv({ position: resolvedPosition }), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ppm-position-${resolvedPosition.periodId}.csv"`
      }
    })
  }

  return NextResponse.json({
    // TASK-1189 — `enabled:false` (default, shadow): la cifra (y la tasa PPM, hoy
    // placeholder) NO es el F29 oficial hasta validación contable + flip.
    enabled: isPpmPositionEnabled(),
    position: resolvedPosition,
    recentPositions,
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
