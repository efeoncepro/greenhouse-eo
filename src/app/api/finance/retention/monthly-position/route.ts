import { NextResponse } from 'next/server'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'
import { isRetentionPositionEnabled } from '@/lib/finance/retention/flags'
import {
  buildRetentionPeriodId,
  getRetentionMonthlyPosition,
  listRetentionLedgerEntries,
  listRetentionMonthlyPositions,
  type RetentionLedgerEntryRecord,
  type RetentionMonthlyPositionRecord
} from '@/lib/finance/retention-ledger'
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
}): RetentionMonthlyPositionRecord => ({
  retentionPositionId: `EO-RMP-${year}${String(month).padStart(2, '0')}-${legalEntityOrgId}`,
  periodId: buildRetentionPeriodId(year, month),
  periodYear: year,
  periodMonth: month,
  organizationId: legalEntityOrgId,
  totalRetentionAmountClp: 0,
  honorariosRetentionAmountClp: 0,
  segundaCategoriaRetentionAmountClp: 0,
  grossBaseAmountClp: 0,
  documentCount: 0,
  ledgerEntryCount: 0,
  materializedAt: null,
  materializationReason: null
})

const escapeCsv = (value: string | number | null) => {
  const normalized = value == null ? '' : String(value)

  return `"${normalized.replaceAll('"', '""')}"`
}

const toCsv = ({
  position,
  entries
}: {
  position: RetentionMonthlyPositionRecord
  entries: RetentionLedgerEntryRecord[]
}) => {
  const rows: Array<Array<string | number | null>> = [
    ['period_id', position.periodId],
    ['total_retention_amount_clp', position.totalRetentionAmountClp],
    ['honorarios_retention_amount_clp', position.honorariosRetentionAmountClp],
    ['segunda_categoria_retention_amount_clp', position.segundaCategoriaRetentionAmountClp],
    ['gross_base_amount_clp', position.grossBaseAmountClp],
    ['document_count', position.documentCount],
    [],
    [
      'retention_entry_id',
      'source_kind',
      'source_id',
      'source_public_ref',
      'counterparty_name',
      'source_date',
      'retention_bucket',
      'gross_amount',
      'retention_amount',
      'retention_amount_clp',
      'currency'
    ],
    ...entries.map(entry => [
      entry.retentionEntryId,
      entry.sourceKind,
      entry.sourceId,
      entry.sourcePublicRef,
      entry.counterpartyName,
      entry.sourceDate,
      entry.retentionBucket,
      entry.grossAmount,
      entry.retentionAmount,
      entry.retentionAmountClp,
      entry.currency
    ])
  ]

  return rows.map(row => row.map(value => escapeCsv(value)).join(',')).join('\n')
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-1188 — La línea de retenciones del F29 se declara por entidad legal
  // (RUT), no por space. Mismo patrón que IVA (TASK-725): scope = operating entity.
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

  const [position, recentPositions, entries] = await Promise.all([
    getRetentionMonthlyPosition({ legalEntityOrganizationId, year, month }),
    listRetentionMonthlyPositions({ legalEntityOrganizationId, limit: 6 }),
    listRetentionLedgerEntries({ legalEntityOrganizationId, year, month })
  ])

  const resolvedPosition = position ?? buildEmptyPosition({ legalEntityOrgId: legalEntityOrganizationId, year, month })

  if (format === 'csv') {
    return new NextResponse(toCsv({ position: resolvedPosition, entries }), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="retention-position-${resolvedPosition.periodId}.csv"`
      }
    })
  }

  return NextResponse.json({
    // TASK-1188 — `enabled:false` (default, shadow): la cifra existe pero NO es el
    // F29 oficial hasta validación contable + flip de RETENTION_POSITION_ENABLED.
    enabled: isRetentionPositionEnabled(),
    position: resolvedPosition,
    recentPositions,
    entries,
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
