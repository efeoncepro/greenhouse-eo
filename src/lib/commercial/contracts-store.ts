import 'server-only'

import { query } from '@/lib/db'
import { resolveFinanceContractTenantScope } from '@/lib/commercial/contract-tenant-scope'
import type {
  ContractDetailRow,
  ContractListRow,
  ContractProfitabilitySnapshotRow,
  ContractQuoteRow,
  ContractRenewalReminderRow,
  ContractStatus,
  DriftDrivers,
  DriftSeverity
} from '@/lib/commercial-intelligence/contracts'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

interface ContractListDbRow extends Record<string, unknown> {
  contract_id: string
  contract_number: string
  client_id: string | null
  client_name: string | null
  msa_id: string | null
  msa_number: string | null
  msa_title: string | null
  organization_id: string | null
  space_id: string | null
  status: string
  commercial_model: string | null
  staffing_model: string | null
  start_date: string | Date
  end_date: string | Date | null
  auto_renewal: boolean | null
  renewal_frequency_months: number | null
  mrr_clp: string | number | null
  arr_clp: string | number | null
  tcv_clp: string | number | null
  acv_clp: string | number | null
  currency: string | null
  originator_quote_id: string | null
  originator_quote_number: string | null
  quotes_count: string | number | null
  linked_document_count: string | number | null
  updated_at: string | Date
  signed_at?: string | Date | null
  terminated_at?: string | Date | null
  terminated_reason?: string | null
  renewed_at?: string | Date | null
  exchange_rate_to_clp?: string | number | null
}

interface ContractQuoteDbRow extends Record<string, unknown> {
  contract_id: string
  quotation_id: string
  quotation_number: string | null
  status: string | null
  relationship_type: string
  effective_from: string | Date | null
  effective_to: string | Date | null
  quote_date: string | Date | null
  total_amount_clp: string | number | null
  pricing_model: string | null
  commercial_model: string | null
  staffing_model: string | null
}

interface ContractReminderDbRow extends Record<string, unknown> {
  contract_id: string
  last_reminder_at: string | Date | null
  reminder_count: number | null
  next_check_at: string | Date | null
  last_event_type: string | null
}

interface ContractProfitabilityDbRow extends Record<string, unknown> {
  contract_id: string
  period_year: number
  period_month: number
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  quoted_total_clp: string | number | null
  quoted_margin_pct: string | number | null
  pricing_model: string | null
  commercial_model: string | null
  staffing_model: string | null
  authorized_total_clp: string | number | null
  invoiced_total_clp: string | number | null
  realized_revenue_clp: string | number | null
  attributed_cost_clp: string | number | null
  effective_margin_pct: string | number | null
  margin_drift_pct: string | number | null
  drift_severity: string
  drift_drivers: unknown
  materialized_at: string | Date
}

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toIsoTs = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const parseDrivers = (value: unknown): DriftDrivers => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as DriftDrivers
    } catch {
      return {}
    }
  }

  return value as DriftDrivers
}

const mapContractListRow = (row: ContractListDbRow): ContractListRow => ({
  contractId: String(row.contract_id),
  contractNumber: String(row.contract_number),
  clientId: row.client_id ? String(row.client_id) : null,
  clientName: row.client_name ? String(row.client_name) : null,
  msaId: row.msa_id ? String(row.msa_id) : null,
  msaNumber: row.msa_number ? String(row.msa_number) : null,
  msaTitle: row.msa_title ? String(row.msa_title) : null,
  organizationId: row.organization_id ? String(row.organization_id) : null,
  spaceId: row.space_id ? String(row.space_id) : null,
  status: String(row.status) as ContractStatus,
  commercialModel: row.commercial_model ? String(row.commercial_model) : null,
  staffingModel: row.staffing_model ? String(row.staffing_model) : null,
  startDate: toIsoDate(row.start_date) ?? new Date().toISOString().slice(0, 10),
  endDate: toIsoDate(row.end_date),
  autoRenewal: Boolean(row.auto_renewal),
  renewalFrequencyMonths: row.renewal_frequency_months ?? null,
  mrrClp: toNum(row.mrr_clp),
  arrClp: toNum(row.arr_clp),
  tcvClp: toNum(row.tcv_clp),
  acvClp: toNum(row.acv_clp),
  currency: row.currency ? String(row.currency) : null,
  originatorQuoteId: row.originator_quote_id ? String(row.originator_quote_id) : null,
  originatorQuoteNumber: row.originator_quote_number ? String(row.originator_quote_number) : null,
  quotesCount: Number(row.quotes_count ?? 0),
  linkedDocumentCount: Number(row.linked_document_count ?? 0),
  updatedAt: toIsoTs(row.updated_at) ?? new Date().toISOString()
})

const mapContractQuoteRow = (row: ContractQuoteDbRow): ContractQuoteRow => ({
  contractId: String(row.contract_id),
  quotationId: String(row.quotation_id),
  quotationNumber: row.quotation_number ? String(row.quotation_number) : null,
  quoteStatus: row.status ? String(row.status) : null,
  relationshipType: String(row.relationship_type) as ContractQuoteRow['relationshipType'],
  effectiveFrom: toIsoDate(row.effective_from),
  effectiveTo: toIsoDate(row.effective_to),
  quoteDate: toIsoDate(row.quote_date),
  totalAmountClp: toNum(row.total_amount_clp),
  pricingModel: row.pricing_model ? String(row.pricing_model) : null,
  commercialModel: row.commercial_model ? String(row.commercial_model) : null,
  staffingModel: row.staffing_model ? String(row.staffing_model) : null
})

const mapReminderRow = (row: ContractReminderDbRow): ContractRenewalReminderRow => ({
  contractId: String(row.contract_id),
  lastReminderAt: toIsoTs(row.last_reminder_at),
  reminderCount: Number(row.reminder_count ?? 0),
  nextCheckAt: toIsoTs(row.next_check_at),
  lastEventType: row.last_event_type ? String(row.last_event_type) : null
})

const mapProfitabilityRow = (row: ContractProfitabilityDbRow): ContractProfitabilitySnapshotRow => ({
  contractId: String(row.contract_id),
  periodYear: row.period_year,
  periodMonth: row.period_month,
  clientId: row.client_id ? String(row.client_id) : null,
  organizationId: row.organization_id ? String(row.organization_id) : null,
  spaceId: row.space_id ? String(row.space_id) : null,
  quotedTotalClp: toNum(row.quoted_total_clp),
  quotedMarginPct: toNum(row.quoted_margin_pct),
  pricingModel: row.pricing_model ? String(row.pricing_model) : null,
  commercialModel: row.commercial_model ? String(row.commercial_model) : null,
  staffingModel: row.staffing_model ? String(row.staffing_model) : null,
  authorizedTotalClp: toNum(row.authorized_total_clp),
  invoicedTotalClp: toNum(row.invoiced_total_clp),
  realizedRevenueClp: toNum(row.realized_revenue_clp),
  attributedCostClp: toNum(row.attributed_cost_clp),
  effectiveMarginPct: toNum(row.effective_margin_pct),
  marginDriftPct: toNum(row.margin_drift_pct),
  driftSeverity: String(row.drift_severity) as DriftSeverity,
  driftDrivers: parseDrivers(row.drift_drivers),
  materializedAt: toIsoTs(row.materialized_at) ?? new Date().toISOString()
})

const buildContractScope = async (tenant: TenantContext) =>
  resolveFinanceContractTenantScope(tenant)

export const listFinanceContracts = async ({
  tenant,
  status,
  clientId
}: {
  tenant: TenantContext
  status?: ContractStatus | null
  clientId?: string | null
}): Promise<ContractListRow[]> => {
  const { organizationIds, spaceIds, hasScope } = await buildContractScope(tenant)

  if (!hasScope) return []

  const values: unknown[] = []
  const scopeConditions: string[] = []

  if (organizationIds.length > 0) {
    values.push(organizationIds)
    scopeConditions.push(`c.organization_id = ANY($${values.length}::text[])`)
  }

  if (spaceIds.length > 0) {
    values.push(spaceIds)
    scopeConditions.push(`c.space_id = ANY($${values.length}::text[])`)
  }

  const conditions = [`(${scopeConditions.join(' OR ')})`]

  if (status) {
    values.push(status)
    conditions.push(`c.status = $${values.length}`)
  }

  if (clientId) {
    values.push(clientId)
    conditions.push(`c.client_id = $${values.length}`)
  }

  const rows = await query<ContractListDbRow>(
    `SELECT
       c.contract_id,
       c.contract_number,
       c.client_id,
       cl.client_name,
       c.msa_id,
       ma.msa_number,
       ma.title AS msa_title,
       c.organization_id,
       c.space_id,
       c.status,
       c.commercial_model,
       c.staffing_model,
       c.start_date,
       c.end_date,
       c.auto_renewal,
       c.renewal_frequency_months,
       c.mrr_clp,
       c.arr_clp,
       c.tcv_clp,
       c.acv_clp,
       c.currency,
       c.originator_quote_id,
       q.quotation_number AS originator_quote_number,
       COALESCE((
         SELECT COUNT(*)
         FROM greenhouse_commercial.contract_quotes cq
         WHERE cq.contract_id = c.contract_id
       ), 0) AS quotes_count,
       (
         COALESCE((SELECT COUNT(*) FROM greenhouse_finance.purchase_orders po WHERE po.contract_id = c.contract_id), 0) +
         COALESCE((SELECT COUNT(*) FROM greenhouse_finance.service_entry_sheets hes WHERE hes.contract_id = c.contract_id), 0) +
         COALESCE((SELECT COUNT(*) FROM greenhouse_finance.income inc WHERE inc.contract_id = c.contract_id), 0)
       ) AS linked_document_count,
       c.updated_at
     FROM greenhouse_commercial.contracts c
     LEFT JOIN greenhouse_core.clients cl
       ON cl.client_id = c.client_id
     LEFT JOIN greenhouse_commercial.master_agreements ma
       ON ma.msa_id = c.msa_id
     LEFT JOIN greenhouse_commercial.quotations q
       ON q.quotation_id = c.originator_quote_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       CASE WHEN c.status = 'active' THEN 0 ELSE 1 END,
       c.updated_at DESC,
       c.contract_number ASC`,
    values
  )

  return rows.map(mapContractListRow)
}

export const getFinanceContractDetail = async ({
  tenant,
  contractId
}: {
  tenant: TenantContext
  contractId: string
}): Promise<ContractDetailRow | null> => {
  const { organizationIds, spaceIds, hasScope } = await buildContractScope(tenant)

  if (!hasScope) return null

  const values: unknown[] = [contractId]
  const scopeConditions: string[] = []

  if (organizationIds.length > 0) {
    values.push(organizationIds)
    scopeConditions.push(`c.organization_id = ANY($${values.length}::text[])`)
  }

  if (spaceIds.length > 0) {
    values.push(spaceIds)
    scopeConditions.push(`c.space_id = ANY($${values.length}::text[])`)
  }

  const rows = await query<ContractListDbRow>(
    `SELECT
       c.contract_id,
       c.contract_number,
       c.client_id,
       cl.client_name,
       c.msa_id,
       ma.msa_number,
       ma.title AS msa_title,
       c.organization_id,
       c.space_id,
       c.status,
       c.commercial_model,
       c.staffing_model,
       c.start_date,
       c.end_date,
       c.auto_renewal,
       c.renewal_frequency_months,
       c.mrr_clp,
       c.arr_clp,
       c.tcv_clp,
       c.acv_clp,
       c.currency,
       c.originator_quote_id,
       q.quotation_number AS originator_quote_number,
       COALESCE((
         SELECT COUNT(*)
         FROM greenhouse_commercial.contract_quotes cq
         WHERE cq.contract_id = c.contract_id
       ), 0) AS quotes_count,
       (
         COALESCE((SELECT COUNT(*) FROM greenhouse_finance.purchase_orders po WHERE po.contract_id = c.contract_id), 0) +
         COALESCE((SELECT COUNT(*) FROM greenhouse_finance.service_entry_sheets hes WHERE hes.contract_id = c.contract_id), 0) +
         COALESCE((SELECT COUNT(*) FROM greenhouse_finance.income inc WHERE inc.contract_id = c.contract_id), 0)
       ) AS linked_document_count,
       c.signed_at,
       c.terminated_at,
       c.terminated_reason,
       c.renewed_at,
       c.exchange_rate_to_clp,
       c.updated_at
     FROM greenhouse_commercial.contracts c
     LEFT JOIN greenhouse_core.clients cl
       ON cl.client_id = c.client_id
     LEFT JOIN greenhouse_commercial.master_agreements ma
       ON ma.msa_id = c.msa_id
     LEFT JOIN greenhouse_commercial.quotations q
       ON q.quotation_id = c.originator_quote_id
     WHERE c.contract_id = $1
       AND (${scopeConditions.join(' OR ')})
     LIMIT 1`,
    values
  )

  const contract = rows[0]

  if (!contract) return null

  const quoteRows = await query<ContractQuoteDbRow>(
    `SELECT
       cq.contract_id,
       cq.quotation_id,
       q.quotation_number,
       q.status,
       cq.relationship_type,
       cq.effective_from,
       cq.effective_to,
       q.quote_date,
       COALESCE(q.total_amount_clp, q.total_price) AS total_amount_clp,
       q.pricing_model,
       q.commercial_model,
       q.staffing_model
     FROM greenhouse_commercial.contract_quotes cq
     JOIN greenhouse_commercial.quotations q
       ON q.quotation_id = cq.quotation_id
     WHERE cq.contract_id = $1
     ORDER BY
       CASE cq.relationship_type
         WHEN 'originator' THEN 0
         WHEN 'renewal' THEN 1
         WHEN 'modification' THEN 2
         ELSE 3
       END,
       cq.effective_from ASC,
       q.quote_date ASC NULLS LAST`,
    [contractId]
  )

  const reminderRows = await query<ContractReminderDbRow>(
    `SELECT contract_id, last_reminder_at, reminder_count, next_check_at, last_event_type
       FROM greenhouse_commercial.contract_renewal_reminders
      WHERE contract_id = $1
      LIMIT 1`,
    [contractId]
  )

  const base = mapContractListRow(contract)

  return {
    ...base,
    signedAt: toIsoTs(contract.signed_at ?? null),
    terminatedAt: toIsoTs(contract.terminated_at ?? null),
    terminatedReason: contract.terminated_reason ? String(contract.terminated_reason) : null,
    renewedAt: toIsoTs(contract.renewed_at ?? null),
    exchangeRateToClp: toNum(contract.exchange_rate_to_clp ?? null),
    quotes: quoteRows.map(mapContractQuoteRow),
    reminder: reminderRows[0] ? mapReminderRow(reminderRows[0]) : null
  }
}

export const listContractProfitabilitySnapshots = async ({
  tenant,
  contractId,
  periodYear,
  periodMonth,
  driftSeverity
}: {
  tenant: TenantContext
  contractId?: string | null
  periodYear?: number | null
  periodMonth?: number | null
  driftSeverity?: DriftSeverity | null
}): Promise<ContractProfitabilitySnapshotRow[]> => {
  const { organizationIds, spaceIds, hasScope } = await buildContractScope(tenant)

  if (!hasScope) return []

  const values: unknown[] = []
  const scopeConditions: string[] = []

  if (organizationIds.length > 0) {
    values.push(organizationIds)
    scopeConditions.push(`s.organization_id = ANY($${values.length}::text[])`)
  }

  if (spaceIds.length > 0) {
    values.push(spaceIds)
    scopeConditions.push(`s.space_id = ANY($${values.length}::text[])`)
  }

  const conditions = [`(${scopeConditions.join(' OR ')})`]

  if (contractId) {
    values.push(contractId)
    conditions.push(`s.contract_id = $${values.length}`)
  }

  if (periodYear) {
    values.push(periodYear)
    conditions.push(`s.period_year = $${values.length}`)
  }

  if (periodMonth) {
    values.push(periodMonth)
    conditions.push(`s.period_month = $${values.length}`)
  }

  if (driftSeverity) {
    values.push(driftSeverity)
    conditions.push(`s.drift_severity = $${values.length}`)
  }

  const rows = await query<ContractProfitabilityDbRow>(
    `SELECT
       s.contract_id,
       s.period_year,
       s.period_month,
       s.client_id,
       s.organization_id,
       s.space_id,
       s.quoted_total_clp,
       s.quoted_margin_pct,
       s.pricing_model,
       s.commercial_model,
       s.staffing_model,
       s.authorized_total_clp,
       s.invoiced_total_clp,
       s.realized_revenue_clp,
       s.attributed_cost_clp,
       s.effective_margin_pct,
       s.margin_drift_pct,
       s.drift_severity,
       s.drift_drivers,
       s.materialized_at
      FROM greenhouse_serving.contract_profitability_snapshots s
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.period_year DESC, s.period_month DESC, s.contract_id ASC`,
    values
  )

  return rows.map(mapProfitabilityRow)
}

export const getContractIdByQuotationId = async (
  quotationId: string,
  spaceId?: string | null
): Promise<string | null> => {
  const values: unknown[] = [quotationId]

  const spaceClause = spaceId
    ? (() => {
        values.push(spaceId)

        return `AND c.space_id = $${values.length}`
      })()
    : ''

  const rows = await query<{ contract_id: string }>(
    `SELECT cq.contract_id
       FROM greenhouse_commercial.contract_quotes cq
       JOIN greenhouse_commercial.contracts c
         ON c.contract_id = cq.contract_id
      WHERE cq.quotation_id = $1
        ${spaceClause}
      ORDER BY
        CASE cq.relationship_type
          WHEN 'originator' THEN 0
          WHEN 'renewal' THEN 1
          WHEN 'modification' THEN 2
          ELSE 3
        END
      LIMIT 1`,
    values
  )

  return rows[0]?.contract_id ? String(rows[0].contract_id) : null
}
