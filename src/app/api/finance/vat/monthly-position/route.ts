import { NextResponse } from 'next/server'

import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'
import {
  getVatMonthlyPosition,
  listVatLedgerEntries,
  listVatMonthlyPositions,
  type VatLedgerEntryRecord,
  type VatMonthlyPositionRecord
} from '@/lib/finance/vat-ledger'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const buildEmptyPosition = ({
  spaceId,
  year,
  month
}: {
  spaceId: string
  year: number
  month: number
}): VatMonthlyPositionRecord => ({
  vatPositionId: `EO-VMP-${year}${String(month).padStart(2, '0')}-${spaceId}`,
  periodId: `${year}-${String(month).padStart(2, '0')}`,
  periodYear: year,
  periodMonth: month,
  spaceId,
  spaceName: null,
  debitFiscalAmountClp: 0,
  creditFiscalAmountClp: 0,
  nonRecoverableVatAmountClp: 0,
  netVatPositionClp: 0,
  debitDocumentCount: 0,
  creditDocumentCount: 0,
  nonRecoverableDocumentCount: 0,
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
  position: VatMonthlyPositionRecord
  entries: VatLedgerEntryRecord[]
}) => {
  const rows: Array<Array<string | number | null>> = [
    ['period_id', position.periodId],
    ['space_id', position.spaceId],
    ['debit_fiscal_amount_clp', position.debitFiscalAmountClp],
    ['credit_fiscal_amount_clp', position.creditFiscalAmountClp],
    ['non_recoverable_vat_amount_clp', position.nonRecoverableVatAmountClp],
    ['net_vat_position_clp', position.netVatPositionClp],
    [],
    [
      'ledger_entry_id',
      'source_kind',
      'source_id',
      'source_public_ref',
      'source_date',
      'vat_bucket',
      'tax_code',
      'tax_recoverability',
      'taxable_amount',
      'amount_document',
      'amount_clp',
      'currency'
    ],
    ...entries.map(entry => [
      entry.ledgerEntryId,
      entry.sourceKind,
      entry.sourceId,
      entry.sourcePublicRef,
      entry.sourceDate,
      entry.vatBucket,
      entry.taxCode,
      entry.taxRecoverability,
      entry.taxableAmount,
      entry.amountDocument,
      entry.amountClp,
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

  const spaceId = tenant.spaceId ?? null

  if (!spaceId) {
    return NextResponse.json(
      { error: 'Finance VAT position requires a tenant with canonical space scope.' },
      { status: 422 }
    )
  }

  const { searchParams } = new URL(request.url)
  const currentPeriod = getFinanceCurrentPeriod()
  const year = Number(searchParams.get('year')) || currentPeriod.year
  const month = Number(searchParams.get('month')) || currentPeriod.month
  const format = searchParams.get('format')

  const [position, recentPositions, entries] = await Promise.all([
    getVatMonthlyPosition({ spaceId, year, month }),
    listVatMonthlyPositions({ spaceId, limit: 6 }),
    listVatLedgerEntries({ spaceId, year, month })
  ])

  const resolvedPosition = position ?? buildEmptyPosition({ spaceId, year, month })

  if (format === 'csv') {
    return new NextResponse(toCsv({ position: resolvedPosition, entries }), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="vat-position-${resolvedPosition.periodId}.csv"`
      }
    })
  }

  return NextResponse.json({
    position: resolvedPosition,
    recentPositions,
    entries,
    year,
    month,
    spaceId
  })
}
