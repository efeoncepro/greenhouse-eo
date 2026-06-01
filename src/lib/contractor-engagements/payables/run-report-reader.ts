import 'server-only'

import {
  getOperationalPayrollMonth,
  type OperationalCalendarContextInput
} from '@/lib/calendar/operational-calendar'
import { query } from '@/lib/db'
import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { resolveProfileDisplayNames } from '@/lib/identity/profile-display-names'
import { getSiiRetentionRate } from '@/types/hr-contracts'

import { getContractorEngagementById } from '../store'
import {
  CONTRACTOR_REPORT_REGIME_GROUP_ORDER,
  deriveContractorRemittanceRegime,
  toContractorReportRegimeGroup,
  type ContractorReportRegimeGroup
} from '../remittance/regime'
import { getRemittanceAdviceNumbersForPayables } from '../remittance/remittance-number-allocator'
import type { RemittanceRegime } from '../remittance/types'

import { mapContractorPayable, PAYABLE_SELECT_COLUMNS } from './store'
import type { ContractorPayable, ContractorPayableStatus } from './types'

/**
 * TASK-980 — reader canónico del reporte de período "Nómina de Contractors".
 *
 * Lista los contractor payables del **mes operativo** (mismo ancla que TASK-978/979:
 * `getOperationalPayrollMonth(due_date ?? created_at)`), los agrupa en los 2 grupos
 * contables (Honorarios CL con retención SII vs Internacional) con subtotales
 * mutuamente excluyentes por moneda, y lee los montos **verbatim** del payable
 * (TASK-793/794/960 son dueños de los números — cero recompute acá).
 *
 * Estados: incluidos = comprometidos (`ready_for_finance` / `obligation_created` /
 * `payment_order_created` / `paid`); excluidos = `blocked` / `pending_readiness`
 * (visibles pero fuera de subtotales); `cancelled` omitido. Espejo del reporte de
 * payroll (TASK-782) que muestra incluidos + excluidos del período.
 */

const INCLUDED_STATUSES: ReadonlySet<ContractorPayableStatus> = new Set([
  'ready_for_finance',
  'obligation_created',
  'payment_order_created',
  'paid'
])

const EXCLUDED_STATUSES: ReadonlySet<ContractorPayableStatus> = new Set([
  'blocked',
  'pending_readiness'
])

const MONTH_LABELS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export interface ContractorRunReportRow {
  contractorPayableId: string
  publicId: string
  contractorName: string
  engagementPublicId: string
  regime: RemittanceRegime
  regimeGroup: ContractorReportRegimeGroup
  payrollVia: string
  grossAmount: number
  withholdingAmount: number
  netPayable: number
  currency: string
  withholdingRateSnapshot: number | null
  status: ContractorPayableStatus
  dueDate: string | null
  /** EO-RA-NNNNNN — solo presente para payables `paid` ya emitidos (TASK-960). */
  remittanceNumber: string | null
}

export interface ContractorRunReportCurrencySubtotal {
  currency: string
  payableCount: number
  grossTotal: number
  /** Retención SII — solo > 0 en el grupo honorarios_cl. Reconcilia F29. */
  withholdingTotal: number
  netTotal: number
  /** Neto de los payables `paid` — reconcilia banco. */
  netPaidTotal: number
}

export interface ContractorRunReportRegimeGroupSummary {
  group: ContractorReportRegimeGroup
  rows: ContractorRunReportRow[]
  byCurrency: ContractorRunReportCurrencySubtotal[]
}

export interface ContractorRunReport {
  periodYear: number
  periodMonth: number
  operationalMonthKey: string
  monthLabel: string
  generatedAt: string
  operatingEntity: { legalName: string; taxId: string; legalAddress: string | null } | null
  siiRateForPeriod: number
  /** Grupos con filas incluidas (solo los no vacíos, en orden canónico). */
  groups: ContractorRunReportRegimeGroupSummary[]
  /** Payables bloqueados / no listos del período — visibles, fuera de subtotales. */
  excluded: ContractorRunReportRow[]
  /** Totales por moneda de TODOS los incluidos (cross-group, segmentado por moneda). */
  grandTotalsByCurrency: ContractorRunReportCurrencySubtotal[]
  isEmpty: boolean
}

const buildCurrencySubtotals = (rows: ContractorRunReportRow[]): ContractorRunReportCurrencySubtotal[] => {
  const byCurrency = new Map<string, ContractorRunReportCurrencySubtotal>()

  for (const row of rows) {
    const acc = byCurrency.get(row.currency) ?? {
      currency: row.currency,
      payableCount: 0,
      grossTotal: 0,
      withholdingTotal: 0,
      netTotal: 0,
      netPaidTotal: 0
    }

    acc.payableCount += 1
    acc.grossTotal += row.grossAmount
    acc.withholdingTotal += row.withholdingAmount
    acc.netTotal += row.netPayable

    if (row.status === 'paid') {
      acc.netPaidTotal += row.netPayable
    }

    byCurrency.set(row.currency, acc)
  }

  return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency))
}

export const buildContractorRunReport = async (input: {
  periodYear: number
  periodMonth: number
  calendarOptions?: OperationalCalendarContextInput | null
}): Promise<ContractorRunReport> => {
  const { periodYear, periodMonth } = input
  const calendarOptions = input.calendarOptions ?? null
  const targetKey = `${periodYear}-${String(periodMonth).padStart(2, '0')}`

  // Ventana calendario generosa que cubre todas las fechas cuyo mes operativo es
  // (Y,M): un mes operativo se alimenta de fechas tardías de su mes calendario +
  // tempranas del siguiente. Acotamos a [mes-1, mes+1] y refinamos en TS por el
  // operationalMonthKey canónico — bounded + correcto (volúmenes contractor bajos).
  // periodMonth es 1-12 → índice 0-11. Ventana [mes-1, fin de mes+1].
  const fromBound = new Date(Date.UTC(periodYear, periodMonth - 2, 1))
  const toBound = new Date(Date.UTC(periodYear, periodMonth + 1, 0))
  const fromKey = fromBound.toISOString().slice(0, 10)
  const toKey = toBound.toISOString().slice(0, 10)

  const rawRows = await query(
    `SELECT ${PAYABLE_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_payables
     WHERE status <> 'cancelled'
       AND COALESCE(due_date, created_at::date) BETWEEN $1::date AND $2::date
     ORDER BY COALESCE(due_date, created_at::date) ASC, contractor_payable_id ASC`,
    [fromKey, toKey]
  )

  const payables = rawRows
    .map(row => mapContractorPayable(row as Parameters<typeof mapContractorPayable>[0]))
    .filter(payable => {
      const anchor = payable.dueDate ?? payable.createdAt

      
return getOperationalPayrollMonth(anchor, calendarOptions).operationalMonthKey === targetKey
    })

  const operatingEntity = await getOperatingEntityIdentity().catch(() => null)

  if (payables.length === 0) {
    return {
      periodYear,
      periodMonth,
      operationalMonthKey: targetKey,
      monthLabel: `${MONTH_LABELS_ES[periodMonth - 1]} ${periodYear}`,
      generatedAt: new Date().toISOString(),
      operatingEntity: operatingEntity
        ? { legalName: operatingEntity.legalName, taxId: operatingEntity.taxId, legalAddress: operatingEntity.legalAddress }
        : null,
      siiRateForPeriod: getSiiRetentionRate(periodYear),
      groups: [],
      excluded: [],
      grandTotalsByCurrency: [],
      isEmpty: true
    }
  }

  // Enriquecer: engagement (régimen + tasa snapshot) + display name + EO-RA.
  const engagementIds = [...new Set(payables.map(p => p.contractorEngagementId))]

  const engagements = await Promise.all(
    engagementIds.map(id => getContractorEngagementById(id).catch(() => null))
  )

  const engagementById = new Map(
    engagements.filter((e): e is NonNullable<typeof e> => Boolean(e)).map(e => [e.contractorEngagementId, e])
  )

  const profileIds = [...engagementById.values()].map(e => e.profileId)
  const names = await resolveProfileDisplayNames(profileIds).catch(() => new Map<string, string>())

  const paidPayableIds = payables.filter(p => p.status === 'paid').map(p => p.contractorPayableId)

  const remittanceNumbers = paidPayableIds.length
    ? await getRemittanceAdviceNumbersForPayables(paidPayableIds).catch(() => new Map<string, string>())
    : new Map<string, string>()

  const toRow = (payable: ContractorPayable): ContractorRunReportRow => {
    const engagement = engagementById.get(payable.contractorEngagementId) ?? null

    const regime = engagement
      ? deriveContractorRemittanceRegime(engagement, payable)
      : payable.withholdingAmount > 0
        ? 'international_withholding'
        : 'provider_managed'

    return {
      contractorPayableId: payable.contractorPayableId,
      publicId: payable.publicId,
      contractorName: (engagement ? names.get(engagement.profileId) : null) ?? 'Contractor',
      engagementPublicId: engagement?.publicId ?? payable.contractorEngagementId,
      regime,
      regimeGroup: toContractorReportRegimeGroup(regime),
      payrollVia: payable.payrollVia,
      grossAmount: payable.grossAmount,
      withholdingAmount: payable.withholdingAmount,
      netPayable: payable.netPayable,
      currency: payable.currency,
      withholdingRateSnapshot: engagement?.taxWithholdingRateSnapshot ?? null,
      status: payable.status,
      dueDate: payable.dueDate,
      remittanceNumber: remittanceNumbers.get(payable.contractorPayableId) ?? null
    }
  }

  const allRows = payables.map(toRow)
  const includedRows = allRows.filter(r => INCLUDED_STATUSES.has(r.status))
  const excludedRows = allRows.filter(r => EXCLUDED_STATUSES.has(r.status))

  const groups: ContractorRunReportRegimeGroupSummary[] = CONTRACTOR_REPORT_REGIME_GROUP_ORDER.map(group => {
    const rows = includedRows.filter(r => r.regimeGroup === group)

    
return { group, rows, byCurrency: buildCurrencySubtotals(rows) }
  }).filter(g => g.rows.length > 0)

  return {
    periodYear,
    periodMonth,
    operationalMonthKey: targetKey,
    monthLabel: `${MONTH_LABELS_ES[periodMonth - 1]} ${periodYear}`,
    generatedAt: new Date().toISOString(),
    operatingEntity: operatingEntity
      ? { legalName: operatingEntity.legalName, taxId: operatingEntity.taxId, legalAddress: operatingEntity.legalAddress }
      : null,
    siiRateForPeriod: getSiiRetentionRate(periodYear),
    groups,
    excluded: excludedRows,
    grandTotalsByCurrency: buildCurrencySubtotals(includedRows),
    isEmpty: includedRows.length === 0 && excludedRows.length === 0
  }
}
