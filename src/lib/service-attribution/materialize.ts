import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { getMonthDateRange } from '@/lib/finance/periods'

export const SERVICE_ATTRIBUTION_CONFIDENCE = {
  high: 0.95,
  medium: 0.75,
  low: 0.6
} as const

export type ServiceAttributionConfidenceLabel = keyof typeof SERVICE_ATTRIBUTION_CONFIDENCE

export type ServiceAttributionAmountKind = 'revenue' | 'direct_cost' | 'labor_cost' | 'overhead_cost'

export type ServiceAttributionSourceDomain =
  | 'finance_revenue'
  | 'finance_direct_cost'
  | 'commercial_labor'
  | 'commercial_overhead'

export type ServiceAttributionFact = {
  attributionId: string
  spaceId: string
  organizationId: string | null
  clientId: string | null
  serviceId: string
  periodYear: number
  periodMonth: number
  sourceDomain: ServiceAttributionSourceDomain
  sourceType: string
  sourceId: string
  amountKind: ServiceAttributionAmountKind
  sourceCurrency: string | null
  sourceAmount: number | null
  amountClp: number
  attributionMethod: string
  confidenceLabel: ServiceAttributionConfidenceLabel
  confidenceScore: number
  evidenceJson: Record<string, unknown>
  materializationReason: string | null
}

export type ServiceAttributionUnresolved = {
  unresolvedId: string
  periodYear: number
  periodMonth: number
  spaceId: string | null
  organizationId: string | null
  clientId: string | null
  sourceDomain: ServiceAttributionSourceDomain
  sourceType: string
  sourceId: string
  amountKind: ServiceAttributionAmountKind
  sourceCurrency: string | null
  sourceAmount: number | null
  amountClp: number
  attemptedMethod: string | null
  reasonCode: string
  confidenceLabel: ServiceAttributionConfidenceLabel
  confidenceScore: number
  candidateServiceIds: string[]
  candidateSpaceIds: string[]
  evidenceJson: Record<string, unknown>
  materializationReason: string | null
}

export type ServiceAttributionSummaryRow = {
  serviceId: string
  serviceName: string
  spaceId: string
  organizationId: string | null
  clientId: string | null
  periodYear: number
  periodMonth: number
  revenueClp: number
  directCostClp: number
  laborCostClp: number
  overheadCostClp: number
  totalCostClp: number
  grossMarginClp: number
}

type ServiceContextRow = {
  service_id: string
  service_name: string
  space_id: string
  organization_id: string | null
  client_id: string | null
  hubspot_deal_id: string | null
  linea_de_servicio: string | null
}

export type QuoteBridgeRow = {
  quotation_id: string
  hubspot_deal_id: string | null
  organization_id: string | null
  space_id: string | null
}

type ContractBridgeRow = {
  contract_id: string
  hubspot_deal_id: string | null
}

export type PurchaseOrderBridgeRow = {
  purchase_order_id: string
  contract_id: string | null
  quotation_id: string | null
  organization_id: string | null
  space_id: string | null
}

export type HESBridgeRow = {
  source_hes_id: string
  purchase_order_id: string | null
  contract_id: string | null
  quotation_id: string | null
  organization_id: string | null
  space_id: string | null
}

type IncomeSourceRow = {
  income_id: string
  client_id: string | null
  organization_id: string | null
  hubspot_deal_id: string | null
  contract_id: string | null
  purchase_order_id: string | null
  quotation_id: string | null
  source_hes_id: string | null
  service_line: string | null
  currency: string | null
  total_amount: number | string | null
  total_amount_clp: number | string | null
  partner_share_amount: number | string | null
  exchange_rate_to_clp: number | string | null
  invoice_date: string | null
}

type ExpenseSourceRow = {
  expense_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  linked_income_id: string | null
  service_line: string | null
  currency: string | null
  total_amount: number | string | null
  total_amount_clp: number | string | null
  effective_date: string | null
}

type AllocationSourceRow = {
  allocation_id: string
  expense_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  linked_income_id: string | null
  service_line: string | null
  allocated_amount_clp: number | string | null
  expense_currency: string | null
  expense_total_amount: number | string | null
  effective_date: string | null
}

type CommercialCostRow = {
  member_id: string
  client_id: string
  organization_id: string | null
  commercial_labor_cost_target: number | string | null
  commercial_direct_overhead_target: number | string | null
  commercial_shared_overhead_target: number | string | null
}

export type ServiceContext = {
  serviceId: string
  serviceName: string
  spaceId: string
  organizationId: string | null
  clientId: string | null
  hubspotDealId: string | null
  lineaDeServicio: string | null
}

export type ServiceIndexes = {
  byId: Map<string, ServiceContext>
  byHubspotDealId: Map<string, ServiceContext[]>
  bySpaceLine: Map<string, ServiceContext[]>
  byOrganizationLine: Map<string, ServiceContext[]>
  byClientId: Map<string, ServiceContext[]>
  byOrganizationId: Map<string, ServiceContext[]>
  bySpaceId: Map<string, ServiceContext[]>
}

export type ResolveCandidatesInput = {
  serviceId?: string | null
  clientId?: string | null
  organizationId?: string | null
  spaceId?: string | null
  hubspotDealId?: string | null
  contractId?: string | null
  quotationId?: string | null
  purchaseOrderId?: string | null
  sourceHesId?: string | null
  serviceLine?: string | null
}

export type ResolutionAttempt = {
  candidateServiceIds: string[]
  candidateSpaceIds: string[]
  attemptedMethod: string | null
  confidenceLabel: ServiceAttributionConfidenceLabel
  confidenceScore: number
  evidence: Record<string, unknown>
}

const round2 = (value: number) => Math.round(value * 100) / 100

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const normalizeNullableString = (value: unknown) => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed === '' ? null : trimmed
}

const normalizeLine = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase()

  return normalized || null
}

const pushToMap = <T>(map: Map<string, T[]>, key: string | null, value: T) => {
  if (!key) return

  const current = map.get(key) || []

  current.push(value)
  map.set(key, current)
}

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))))

export const distributeAmountByWeights = (
  totalAmount: number,
  weights: Array<{ serviceId: string; weight: number }>
) => {
  const normalizedTotal = round2(totalAmount)

  if (normalizedTotal <= 0 || weights.length === 0) return [] as Array<{ serviceId: string; amountClp: number }>

  const totalWeight = weights.reduce((sum, item) => sum + Math.max(0, item.weight), 0)

  if (totalWeight <= 0) return [] as Array<{ serviceId: string; amountClp: number }>

  let remaining = normalizedTotal

  return weights.map((item, index) => {
    if (index === weights.length - 1) {
      return { serviceId: item.serviceId, amountClp: round2(remaining) }
    }

    const amountClp = round2((normalizedTotal * item.weight) / totalWeight)

    remaining = round2(remaining - amountClp)

    return { serviceId: item.serviceId, amountClp }
  }).filter(item => item.amountClp > 0)
}

export const buildServiceIndexes = (services: ServiceContext[]): ServiceIndexes => {
  const indexes: ServiceIndexes = {
    byId: new Map(),
    byHubspotDealId: new Map(),
    bySpaceLine: new Map(),
    byOrganizationLine: new Map(),
    byClientId: new Map(),
    byOrganizationId: new Map(),
    bySpaceId: new Map()
  }

  for (const service of services) {
    indexes.byId.set(service.serviceId, service)
    pushToMap(indexes.byHubspotDealId, service.hubspotDealId, service)
    pushToMap(indexes.bySpaceLine, service.spaceId && service.lineaDeServicio ? `${service.spaceId}|${service.lineaDeServicio}` : null, service)
    pushToMap(
      indexes.byOrganizationLine,
      service.organizationId && service.lineaDeServicio ? `${service.organizationId}|${service.lineaDeServicio}` : null,
      service
    )
    pushToMap(indexes.byClientId, service.clientId, service)
    pushToMap(indexes.byOrganizationId, service.organizationId, service)
    pushToMap(indexes.bySpaceId, service.spaceId, service)
  }

  return indexes
}

const narrowUniqueByServiceLine = (
  candidates: ServiceContext[],
  serviceLine: string | null | undefined
) => {
  const line = normalizeLine(serviceLine)

  if (!line || candidates.length <= 1) return candidates

  const narrowed = candidates.filter(candidate => normalizeLine(candidate.lineaDeServicio) === line)

  return narrowed.length > 0 ? narrowed : candidates
}

const resolveDocumentDealIds = ({
  contractId,
  quotationId,
  purchaseOrderId,
  sourceHesId,
  quoteById,
  contractDealIds,
  poById,
  hesById
}: {
  contractId?: string | null
  quotationId?: string | null
  purchaseOrderId?: string | null
  sourceHesId?: string | null
  quoteById: Map<string, QuoteBridgeRow>
  contractDealIds: Map<string, string[]>
  poById: Map<string, PurchaseOrderBridgeRow>
  hesById: Map<string, HESBridgeRow>
}) => {
  const dealIds = new Set<string>()
  const evidence: Record<string, unknown> = {}

  const addQuoteDeal = (id: string | null | undefined, label: string) => {
    if (!id) return

    const quote = quoteById.get(id)

    if (!quote?.hubspot_deal_id) return

    dealIds.add(quote.hubspot_deal_id)
    evidence[label] = id
  }

  const addContractDeals = (id: string | null | undefined, label: string) => {
    if (!id) return

    const deals = contractDealIds.get(id) || []

    for (const dealId of deals) {
      dealIds.add(dealId)
    }

    if (deals.length > 0) {
      evidence[label] = id
    }
  }

  addQuoteDeal(quotationId, 'quotationId')
  addContractDeals(contractId, 'contractId')

  const po = purchaseOrderId ? poById.get(purchaseOrderId) : null

  if (po) {
    evidence.purchaseOrderId = po.purchase_order_id
    addQuoteDeal(po.quotation_id, 'purchaseOrderQuotationId')
    addContractDeals(po.contract_id, 'purchaseOrderContractId')
  }

  const hes = sourceHesId ? hesById.get(sourceHesId) : null

  if (hes) {
    evidence.sourceHesId = hes.source_hes_id
    addQuoteDeal(hes.quotation_id, 'hesQuotationId')
    addContractDeals(hes.contract_id, 'hesContractId')

    if (hes.purchase_order_id) {
      const nestedPo = poById.get(hes.purchase_order_id)

      if (nestedPo) {
        evidence.hesPurchaseOrderId = nestedPo.purchase_order_id
        addQuoteDeal(nestedPo.quotation_id, 'hesPurchaseOrderQuotationId')
        addContractDeals(nestedPo.contract_id, 'hesPurchaseOrderContractId')
      }
    }
  }

  return { dealIds: Array.from(dealIds), evidence }
}

export const resolveServiceCandidates = (
  input: ResolveCandidatesInput,
  indexes: ServiceIndexes,
  quoteById: Map<string, QuoteBridgeRow>,
  contractDealIds: Map<string, string[]>,
  poById: Map<string, PurchaseOrderBridgeRow>,
  hesById: Map<string, HESBridgeRow>
): ResolutionAttempt => {
  if (input.serviceId) {
    const direct = indexes.byId.get(input.serviceId)

    if (direct) {
      return {
        candidateServiceIds: [direct.serviceId],
        candidateSpaceIds: [direct.spaceId],
        attemptedMethod: 'service_id_direct',
        confidenceLabel: 'high',
        confidenceScore: SERVICE_ATTRIBUTION_CONFIDENCE.high,
        evidence: { serviceId: input.serviceId }
      }
    }
  }

  const documentResolution = resolveDocumentDealIds({
    contractId: input.contractId,
    quotationId: input.quotationId,
    purchaseOrderId: input.purchaseOrderId,
    sourceHesId: input.sourceHesId,
    quoteById,
    contractDealIds,
    poById,
    hesById
  })

  const dealIds = uniqueStrings([input.hubspotDealId, ...documentResolution.dealIds])

  if (dealIds.length > 0) {
    let candidates = dealIds.flatMap(dealId => indexes.byHubspotDealId.get(dealId) || [])

    if (input.spaceId) {
      candidates = candidates.filter(candidate => candidate.spaceId === input.spaceId)
    }

    if (input.organizationId) {
      candidates = candidates.filter(candidate => candidate.organizationId === input.organizationId)
    }

    candidates = narrowUniqueByServiceLine(candidates, input.serviceLine)

    return {
      candidateServiceIds: uniqueStrings(candidates.map(candidate => candidate.serviceId)),
      candidateSpaceIds: uniqueStrings(candidates.map(candidate => candidate.spaceId)),
      attemptedMethod: documentResolution.dealIds.length > 0 ? 'document_hubspot_deal_bridge' : 'hubspot_deal_bridge',
      confidenceLabel: 'high',
      confidenceScore: SERVICE_ATTRIBUTION_CONFIDENCE.high,
      evidence: {
        ...documentResolution.evidence,
        hubspotDealIds: dealIds,
        serviceLine: normalizeLine(input.serviceLine)
      }
    }
  }

  const line = normalizeLine(input.serviceLine)

  if (line && input.spaceId) {
    const candidates = indexes.bySpaceLine.get(`${input.spaceId}|${line}`) || []

    if (candidates.length > 0) {
      return {
        candidateServiceIds: uniqueStrings(candidates.map(candidate => candidate.serviceId)),
        candidateSpaceIds: uniqueStrings(candidates.map(candidate => candidate.spaceId)),
        attemptedMethod: 'service_line_unique_within_space',
        confidenceLabel: 'medium',
        confidenceScore: SERVICE_ATTRIBUTION_CONFIDENCE.medium,
        evidence: {
          serviceLine: line,
          spaceId: input.spaceId
        }
      }
    }
  }

  if (line && input.organizationId) {
    const candidates = indexes.byOrganizationLine.get(`${input.organizationId}|${line}`) || []

    if (candidates.length > 0) {
      return {
        candidateServiceIds: uniqueStrings(candidates.map(candidate => candidate.serviceId)),
        candidateSpaceIds: uniqueStrings(candidates.map(candidate => candidate.spaceId)),
        attemptedMethod: 'service_line_unique_within_organization',
        confidenceLabel: 'medium',
        confidenceScore: SERVICE_ATTRIBUTION_CONFIDENCE.medium,
        evidence: {
          serviceLine: line,
          organizationId: input.organizationId
        }
      }
    }
  }

  const scopedCandidates = (
    (input.spaceId ? indexes.bySpaceId.get(input.spaceId) : null) ||
    (input.clientId ? indexes.byClientId.get(input.clientId) : null) ||
    (input.organizationId ? indexes.byOrganizationId.get(input.organizationId) : null) ||
    []
  )

  const scopedServiceIds = uniqueStrings(scopedCandidates.map(candidate => candidate.serviceId))
  const scopedSpaceIds = uniqueStrings(scopedCandidates.map(candidate => candidate.spaceId))

  return {
    candidateServiceIds: scopedServiceIds,
    candidateSpaceIds: scopedSpaceIds,
    attemptedMethod: scopedCandidates.length === 1 ? 'unique_active_service_scope' : scopedCandidates.length > 1 ? 'scope_candidates' : null,
    confidenceLabel: 'low',
    confidenceScore: SERVICE_ATTRIBUTION_CONFIDENCE.low,
    evidence: {
      clientId: input.clientId,
      organizationId: input.organizationId,
      spaceId: input.spaceId,
      serviceLine: line
    }
  }
}

const buildResolvedFact = ({
  service,
  periodYear,
  periodMonth,
  sourceDomain,
  sourceType,
  sourceId,
  amountKind,
  sourceCurrency,
  sourceAmount,
  amountClp,
  attributionMethod,
  confidenceLabel,
  confidenceScore,
  evidenceJson,
  materializationReason
}: {
  service: ServiceContext
  periodYear: number
  periodMonth: number
  sourceDomain: ServiceAttributionSourceDomain
  sourceType: string
  sourceId: string
  amountKind: ServiceAttributionAmountKind
  sourceCurrency: string | null
  sourceAmount: number | null
  amountClp: number
  attributionMethod: string
  confidenceLabel: ServiceAttributionConfidenceLabel
  confidenceScore: number
  evidenceJson: Record<string, unknown>
  materializationReason: string | null
}): ServiceAttributionFact => ({
  attributionId: `sat-${randomUUID()}`,
  spaceId: service.spaceId,
  organizationId: service.organizationId,
  clientId: service.clientId,
  serviceId: service.serviceId,
  periodYear,
  periodMonth,
  sourceDomain,
  sourceType,
  sourceId,
  amountKind,
  sourceCurrency,
  sourceAmount,
  amountClp: round2(amountClp),
  attributionMethod,
  confidenceLabel,
  confidenceScore,
  evidenceJson,
  materializationReason
})

const buildUnresolved = ({
  periodYear,
  periodMonth,
  spaceId,
  organizationId,
  clientId,
  sourceDomain,
  sourceType,
  sourceId,
  amountKind,
  sourceCurrency,
  sourceAmount,
  amountClp,
  attemptedMethod,
  reasonCode,
  confidenceLabel,
  confidenceScore,
  candidateServiceIds,
  candidateSpaceIds,
  evidenceJson,
  materializationReason
}: Omit<ServiceAttributionUnresolved, 'unresolvedId'>): ServiceAttributionUnresolved => ({
  unresolvedId: `sau-${randomUUID()}`,
  periodYear,
  periodMonth,
  spaceId,
  organizationId,
  clientId,
  sourceDomain,
  sourceType,
  sourceId,
  amountKind,
  sourceCurrency,
  sourceAmount,
  amountClp: round2(amountClp),
  attemptedMethod,
  reasonCode,
  confidenceLabel,
  confidenceScore,
  candidateServiceIds,
  candidateSpaceIds,
  evidenceJson,
  materializationReason
})

const loadPeriodContext = async (year: number, month: number) => {
  const db = await getDb()
  const { periodStart, periodEnd } = getMonthDateRange(year, month)

  const [servicesResult, quotesResult, contractsResult, poResult, hesResult, incomeResult, expenseResult, allocationResult, costResult] =
    await Promise.all([
      sql<ServiceContextRow>`
        SELECT
          s.service_id,
          s.name AS service_name,
          s.space_id,
          s.organization_id,
          sp.client_id,
          s.hubspot_deal_id,
          s.linea_de_servicio
        FROM greenhouse_core.services s
        LEFT JOIN greenhouse_core.spaces sp
          ON sp.space_id = s.space_id
        WHERE s.active = TRUE
          AND (s.start_date IS NULL OR s.start_date <= ${periodEnd})
          AND (s.target_end_date IS NULL OR s.target_end_date >= ${periodStart})
      `.execute(db),
      sql<QuoteBridgeRow>`
        SELECT quotation_id, hubspot_deal_id, organization_id, space_id
        FROM greenhouse_commercial.quotations
      `.execute(db),
      sql<ContractBridgeRow>`
        SELECT cq.contract_id, q.hubspot_deal_id
        FROM greenhouse_commercial.contract_quotes cq
        INNER JOIN greenhouse_commercial.quotations q
          ON q.quotation_id = cq.quotation_id
        WHERE q.hubspot_deal_id IS NOT NULL
      `.execute(db),
      sql<PurchaseOrderBridgeRow>`
        SELECT
          po_id AS purchase_order_id,
          contract_id,
          quotation_id,
          organization_id,
          space_id
        FROM greenhouse_finance.purchase_orders
      `.execute(db),
      sql<HESBridgeRow>`
        SELECT
          hes_id AS source_hes_id,
          purchase_order_id,
          contract_id,
          quotation_id,
          organization_id,
          space_id
        FROM greenhouse_finance.service_entry_sheets
      `.execute(db),
      sql<IncomeSourceRow>`
        SELECT
          income_id,
          client_id,
          organization_id,
          hubspot_deal_id,
          contract_id,
          purchase_order_id,
          quotation_id,
          source_hes_id,
          service_line,
          currency,
          total_amount,
          total_amount_clp,
          partner_share_amount,
          exchange_rate_to_clp,
          invoice_date::text AS invoice_date
        FROM greenhouse_finance.income
        WHERE invoice_date >= ${periodStart}
          AND invoice_date <= ${periodEnd}
          AND COALESCE(is_annulled, FALSE) = FALSE
      `.execute(db),
      sql<ExpenseSourceRow>`
        SELECT
          e.expense_id,
          e.allocated_client_id AS client_id,
          COALESCE(s.organization_id, cp.organization_id) AS organization_id,
          e.space_id,
          e.linked_income_id,
          e.service_line,
          e.currency,
          COALESCE(e.effective_cost_amount, e.total_amount) AS total_amount,
          COALESCE(e.effective_cost_amount_clp, e.total_amount_clp) AS total_amount_clp,
          COALESCE(e.document_date, e.payment_date)::text AS effective_date
        FROM greenhouse_finance.expenses e
        LEFT JOIN greenhouse_core.spaces s
          ON s.space_id = e.space_id
        LEFT JOIN greenhouse_finance.client_profiles cp
          ON cp.client_id = e.allocated_client_id
        WHERE e.allocated_client_id IS NOT NULL
          AND e.payroll_entry_id IS NULL
          AND COALESCE(e.document_date, e.payment_date) >= ${periodStart}
          AND COALESCE(e.document_date, e.payment_date) <= ${periodEnd}
      `.execute(db),
      sql<AllocationSourceRow>`
        SELECT
          ca.allocation_id,
          ca.expense_id,
          ca.client_id,
          ca.organization_id,
          ca.space_id,
          e.linked_income_id,
          e.service_line,
          e.currency AS expense_currency,
          e.total_amount AS expense_total_amount,
          ca.allocated_amount_clp,
          COALESCE(e.document_date, e.payment_date)::text AS effective_date
        FROM greenhouse_finance.cost_allocations ca
        INNER JOIN greenhouse_finance.expenses e
          ON e.expense_id = ca.expense_id
        WHERE ca.period_year = ${year}
          AND ca.period_month = ${month}
          AND e.payroll_entry_id IS NULL
      `.execute(db),
      sql<CommercialCostRow>`
        SELECT
          member_id,
          client_id,
          organization_id,
          commercial_labor_cost_target,
          commercial_direct_overhead_target,
          commercial_shared_overhead_target
        FROM greenhouse_serving.commercial_cost_attribution
        WHERE period_year = ${year}
          AND period_month = ${month}
      `.execute(db)
    ])

  const services: ServiceContext[] = servicesResult.rows.map(row => ({
    serviceId: row.service_id,
    serviceName: row.service_name,
    spaceId: row.space_id,
    organizationId: normalizeNullableString(row.organization_id),
    clientId: normalizeNullableString(row.client_id),
    hubspotDealId: normalizeNullableString(row.hubspot_deal_id),
    lineaDeServicio: normalizeLine(row.linea_de_servicio)
  }))

  const quoteById = new Map<string, QuoteBridgeRow>(quotesResult.rows.map(row => [row.quotation_id, row]))
  const contractDealIds = new Map<string, string[]>()

  for (const row of contractsResult.rows) {
    const current = contractDealIds.get(row.contract_id) || []

    if (row.hubspot_deal_id) {
      current.push(row.hubspot_deal_id)
      contractDealIds.set(row.contract_id, uniqueStrings(current))
    }
  }

  return {
    services,
    indexes: buildServiceIndexes(services),
    quoteById,
    contractDealIds,
    poById: new Map(poResult.rows.map(row => [row.purchase_order_id, row])),
    hesById: new Map(hesResult.rows.map(row => [row.source_hes_id, row])),
    incomes: incomeResult.rows,
    expenses: expenseResult.rows,
    allocations: allocationResult.rows,
    commercialCosts: costResult.rows
  }
}

export const materializeServiceAttributionForPeriod = async (
  year: number,
  month: number,
  reason: string | null = null
) => {
  const {
    indexes,
    quoteById,
    contractDealIds,
    poById,
    hesById,
    incomes,
    expenses,
    allocations,
    commercialCosts
  } = await loadPeriodContext(year, month)

  const facts: ServiceAttributionFact[] = []
  const unresolved: ServiceAttributionUnresolved[] = []
  const incomeFactsByIncomeId = new Map<string, ServiceAttributionFact[]>()

  const serviceById = indexes.byId

  for (const income of incomes) {
    const grossRevenueClp = round2(
      toNumber(income.total_amount_clp) - (toNumber(income.partner_share_amount) * Math.max(1, toNumber(income.exchange_rate_to_clp)))
    )

    if (grossRevenueClp <= 0) continue

    const resolution = resolveServiceCandidates(
      {
        clientId: income.client_id,
        organizationId: income.organization_id,
        hubspotDealId: income.hubspot_deal_id,
        contractId: income.contract_id,
        quotationId: income.quotation_id,
        purchaseOrderId: income.purchase_order_id,
        sourceHesId: income.source_hes_id,
        serviceLine: income.service_line
      },
      indexes,
      quoteById,
      contractDealIds,
      poById,
      hesById
    )

    const candidates = resolution.candidateServiceIds.map(candidateId => serviceById.get(candidateId)).filter(Boolean) as ServiceContext[]

    const narrowedCandidates = resolution.attemptedMethod?.startsWith('unique_active_service')
      ? candidates.slice(0, 1)
      : candidates

    if (narrowedCandidates.length === 1) {
      const fact = buildResolvedFact({
        service: narrowedCandidates[0],
        periodYear: year,
        periodMonth: month,
        sourceDomain: 'finance_revenue',
        sourceType: 'income',
        sourceId: income.income_id,
        amountKind: 'revenue',
        sourceCurrency: normalizeNullableString(income.currency),
        sourceAmount: round2(toNumber(income.total_amount)),
        amountClp: grossRevenueClp,
        attributionMethod: resolution.attemptedMethod || 'service_id_direct',
        confidenceLabel: resolution.confidenceLabel,
        confidenceScore: resolution.confidenceScore,
        evidenceJson: {
          ...resolution.evidence,
          incomeId: income.income_id
        },
        materializationReason: reason
      })

      facts.push(fact)
      incomeFactsByIncomeId.set(income.income_id, [fact])
    } else {
      unresolved.push(buildUnresolved({
        periodYear: year,
        periodMonth: month,
        spaceId: resolution.candidateSpaceIds.length === 1 ? resolution.candidateSpaceIds[0] : null,
        organizationId: normalizeNullableString(income.organization_id),
        clientId: normalizeNullableString(income.client_id),
        sourceDomain: 'finance_revenue',
        sourceType: 'income',
        sourceId: income.income_id,
        amountKind: 'revenue',
        sourceCurrency: normalizeNullableString(income.currency),
        sourceAmount: round2(toNumber(income.total_amount)),
        amountClp: grossRevenueClp,
        attemptedMethod: resolution.attemptedMethod,
        reasonCode: narrowedCandidates.length === 0 ? 'no_matching_service' : 'ambiguous_service_candidates',
        confidenceLabel: resolution.confidenceLabel,
        confidenceScore: resolution.confidenceScore,
        candidateServiceIds: resolution.candidateServiceIds,
        candidateSpaceIds: resolution.candidateSpaceIds,
        evidenceJson: {
          ...resolution.evidence,
          incomeId: income.income_id
        },
        materializationReason: reason
      }))
    }
  }

  const directCostFromLinkedIncome = (
    linkedIncomeId: string | null,
    amountClp: number,
    sourceDomain: ServiceAttributionSourceDomain,
    sourceType: string,
    sourceId: string,
    sourceCurrency: string | null,
    sourceAmount: number | null,
    evidence: Record<string, unknown>
  ) => {
    if (!linkedIncomeId) return false

    const linkedFacts = incomeFactsByIncomeId.get(linkedIncomeId) || []

    if (linkedFacts.length === 0) return false

    const weights = linkedFacts.map(fact => ({ serviceId: fact.serviceId, weight: fact.amountClp }))

    for (const slice of distributeAmountByWeights(amountClp, weights)) {
      const service = serviceById.get(slice.serviceId)

      if (!service) continue

      facts.push(buildResolvedFact({
        service,
        periodYear: year,
        periodMonth: month,
        sourceDomain,
        sourceType,
        sourceId,
        amountKind: 'direct_cost',
        sourceCurrency,
        sourceAmount,
        amountClp: slice.amountClp,
        attributionMethod: 'linked_income_bridge',
        confidenceLabel: 'high',
        confidenceScore: SERVICE_ATTRIBUTION_CONFIDENCE.high,
        evidenceJson: {
          ...evidence,
          linkedIncomeId
        },
        materializationReason: reason
      }))
    }

    return true
  }

  for (const expense of expenses) {
    const amountClp = round2(toNumber(expense.total_amount_clp))

    if (amountClp <= 0) continue

    const bridged = directCostFromLinkedIncome(
      expense.linked_income_id,
      amountClp,
      'finance_direct_cost',
      'expense',
      expense.expense_id,
      normalizeNullableString(expense.currency),
      round2(toNumber(expense.total_amount)),
      { expenseId: expense.expense_id, effectiveDate: expense.effective_date }
    )

    if (bridged) continue

    const resolution = resolveServiceCandidates(
      {
        clientId: expense.client_id,
        organizationId: expense.organization_id,
        spaceId: expense.space_id,
        serviceLine: expense.service_line
      },
      indexes,
      quoteById,
      contractDealIds,
      poById,
      hesById
    )

    const candidates = resolution.candidateServiceIds.map(candidateId => serviceById.get(candidateId)).filter(Boolean) as ServiceContext[]
    const narrowedCandidates = resolution.attemptedMethod === 'unique_active_service_scope' ? candidates.slice(0, 1) : candidates

    if (narrowedCandidates.length === 1) {
      facts.push(buildResolvedFact({
        service: narrowedCandidates[0],
        periodYear: year,
        periodMonth: month,
        sourceDomain: 'finance_direct_cost',
        sourceType: 'expense',
        sourceId: expense.expense_id,
        amountKind: 'direct_cost',
        sourceCurrency: normalizeNullableString(expense.currency),
        sourceAmount: round2(toNumber(expense.total_amount)),
        amountClp,
        attributionMethod: resolution.attemptedMethod || 'service_line_unique_within_space',
        confidenceLabel: resolution.confidenceLabel,
        confidenceScore: resolution.confidenceScore,
        evidenceJson: {
          ...resolution.evidence,
          expenseId: expense.expense_id,
          effectiveDate: expense.effective_date
        },
        materializationReason: reason
      }))
    } else {
      unresolved.push(buildUnresolved({
        periodYear: year,
        periodMonth: month,
        spaceId: normalizeNullableString(expense.space_id),
        organizationId: normalizeNullableString(expense.organization_id),
        clientId: normalizeNullableString(expense.client_id),
        sourceDomain: 'finance_direct_cost',
        sourceType: 'expense',
        sourceId: expense.expense_id,
        amountKind: 'direct_cost',
        sourceCurrency: normalizeNullableString(expense.currency),
        sourceAmount: round2(toNumber(expense.total_amount)),
        amountClp,
        attemptedMethod: resolution.attemptedMethod,
        reasonCode: narrowedCandidates.length === 0 ? 'no_matching_service' : 'ambiguous_service_candidates',
        confidenceLabel: resolution.confidenceLabel,
        confidenceScore: resolution.confidenceScore,
        candidateServiceIds: resolution.candidateServiceIds,
        candidateSpaceIds: resolution.candidateSpaceIds,
        evidenceJson: {
          ...resolution.evidence,
          expenseId: expense.expense_id,
          effectiveDate: expense.effective_date
        },
        materializationReason: reason
      }))
    }
  }

  for (const allocation of allocations) {
    const amountClp = round2(toNumber(allocation.allocated_amount_clp))

    if (amountClp <= 0) continue

    const bridged = directCostFromLinkedIncome(
      allocation.linked_income_id,
      amountClp,
      'finance_direct_cost',
      'cost_allocation',
      allocation.allocation_id,
      normalizeNullableString(allocation.expense_currency),
      round2(toNumber(allocation.expense_total_amount)),
      { allocationId: allocation.allocation_id, expenseId: allocation.expense_id, effectiveDate: allocation.effective_date }
    )

    if (bridged) continue

    const resolution = resolveServiceCandidates(
      {
        clientId: allocation.client_id,
        organizationId: allocation.organization_id,
        spaceId: allocation.space_id,
        serviceLine: allocation.service_line
      },
      indexes,
      quoteById,
      contractDealIds,
      poById,
      hesById
    )

    const candidates = resolution.candidateServiceIds.map(candidateId => serviceById.get(candidateId)).filter(Boolean) as ServiceContext[]
    const narrowedCandidates = resolution.attemptedMethod === 'unique_active_service_scope' ? candidates.slice(0, 1) : candidates

    if (narrowedCandidates.length === 1) {
      facts.push(buildResolvedFact({
        service: narrowedCandidates[0],
        periodYear: year,
        periodMonth: month,
        sourceDomain: 'finance_direct_cost',
        sourceType: 'cost_allocation',
        sourceId: allocation.allocation_id,
        amountKind: 'direct_cost',
        sourceCurrency: normalizeNullableString(allocation.expense_currency),
        sourceAmount: round2(toNumber(allocation.expense_total_amount)),
        amountClp,
        attributionMethod: resolution.attemptedMethod || 'service_line_unique_within_space',
        confidenceLabel: resolution.confidenceLabel,
        confidenceScore: resolution.confidenceScore,
        evidenceJson: {
          ...resolution.evidence,
          allocationId: allocation.allocation_id,
          expenseId: allocation.expense_id
        },
        materializationReason: reason
      }))
    } else {
      unresolved.push(buildUnresolved({
        periodYear: year,
        periodMonth: month,
        spaceId: normalizeNullableString(allocation.space_id),
        organizationId: normalizeNullableString(allocation.organization_id),
        clientId: normalizeNullableString(allocation.client_id),
        sourceDomain: 'finance_direct_cost',
        sourceType: 'cost_allocation',
        sourceId: allocation.allocation_id,
        amountKind: 'direct_cost',
        sourceCurrency: normalizeNullableString(allocation.expense_currency),
        sourceAmount: round2(toNumber(allocation.expense_total_amount)),
        amountClp,
        attemptedMethod: resolution.attemptedMethod,
        reasonCode: narrowedCandidates.length === 0 ? 'no_matching_service' : 'ambiguous_service_candidates',
        confidenceLabel: resolution.confidenceLabel,
        confidenceScore: resolution.confidenceScore,
        candidateServiceIds: resolution.candidateServiceIds,
        candidateSpaceIds: resolution.candidateSpaceIds,
        evidenceJson: {
          ...resolution.evidence,
          allocationId: allocation.allocation_id,
          expenseId: allocation.expense_id
        },
        materializationReason: reason
      }))
    }
  }

  const clientRevenueWeights = new Map<string, Array<{ serviceId: string; amountClp: number }>>()

  for (const fact of facts.filter(item => item.sourceDomain === 'finance_revenue' && item.amountKind === 'revenue')) {
    if (!fact.clientId) continue

    const rows = clientRevenueWeights.get(fact.clientId) || []
    const existing = rows.find(row => row.serviceId === fact.serviceId)

    if (existing) {
      existing.amountClp = round2(existing.amountClp + fact.amountClp)
    } else {
      rows.push({ serviceId: fact.serviceId, amountClp: fact.amountClp })
    }

    clientRevenueWeights.set(fact.clientId, rows)
  }

  for (const row of commercialCosts) {
    const sourceId = `${row.member_id}:${row.client_id}:${year}-${String(month).padStart(2, '0')}`
    const revenueWeights = clientRevenueWeights.get(row.client_id) || []

    const fallbackServices = revenueWeights.length === 0
      ? (() => {
          const clientServices = indexes.byClientId.get(row.client_id) || []

          return clientServices.length === 1 ? [{ serviceId: clientServices[0].serviceId, amountClp: 1 }] : []
        })()
      : revenueWeights

    const weights = fallbackServices.map(item => ({ serviceId: item.serviceId, weight: item.amountClp }))
    const attemptedMethod = revenueWeights.length > 0 ? 'client_period_revenue_share' : 'unique_active_service_scope'
    const confidenceLabel: ServiceAttributionConfidenceLabel = revenueWeights.length > 0 ? 'medium' : 'low'
    const confidenceScore = SERVICE_ATTRIBUTION_CONFIDENCE[confidenceLabel]

    const allocateCommercialAmount = (
      amountKind: ServiceAttributionAmountKind,
      sourceDomain: ServiceAttributionSourceDomain,
      sourceType: string,
      totalAmount: number
    ) => {
      if (totalAmount <= 0) return

      const distributed = distributeAmountByWeights(totalAmount, weights)

      if (distributed.length === 0) {
        unresolved.push(buildUnresolved({
          periodYear: year,
          periodMonth: month,
          spaceId: null,
          organizationId: normalizeNullableString(row.organization_id),
          clientId: row.client_id,
          sourceDomain,
          sourceType,
          sourceId,
          amountKind,
          sourceCurrency: 'CLP',
          sourceAmount: totalAmount,
          amountClp: totalAmount,
          attemptedMethod,
          reasonCode: 'no_resolved_revenue_share',
          confidenceLabel,
          confidenceScore,
          candidateServiceIds: uniqueStrings((indexes.byClientId.get(row.client_id) || []).map(service => service.serviceId)),
          candidateSpaceIds: uniqueStrings((indexes.byClientId.get(row.client_id) || []).map(service => service.spaceId)),
          evidenceJson: {
            memberId: row.member_id,
            clientId: row.client_id,
            organizationId: row.organization_id
          },
          materializationReason: reason
        }))

        return
      }

      for (const slice of distributed) {
        const service = serviceById.get(slice.serviceId)

        if (!service) continue

        facts.push(buildResolvedFact({
          service,
          periodYear: year,
          periodMonth: month,
          sourceDomain,
          sourceType,
          sourceId,
          amountKind,
          sourceCurrency: 'CLP',
          sourceAmount: totalAmount,
          amountClp: slice.amountClp,
          attributionMethod: attemptedMethod,
          confidenceLabel,
          confidenceScore,
          evidenceJson: {
            memberId: row.member_id,
            clientId: row.client_id,
            organizationId: row.organization_id,
            revenueWeightedServiceIds: weights.map(item => item.serviceId)
          },
          materializationReason: reason
        }))
      }
    }

    allocateCommercialAmount('labor_cost', 'commercial_labor', 'commercial_labor', round2(toNumber(row.commercial_labor_cost_target)))
    allocateCommercialAmount('overhead_cost', 'commercial_overhead', 'commercial_direct_overhead', round2(toNumber(row.commercial_direct_overhead_target)))
    allocateCommercialAmount('overhead_cost', 'commercial_overhead', 'commercial_shared_overhead', round2(toNumber(row.commercial_shared_overhead_target)))
  }

  const db = await getDb()

  await db.transaction().execute(async trx => {
    await sql`
      DELETE FROM greenhouse_serving.service_attribution_facts
      WHERE period_year = ${year}
        AND period_month = ${month}
    `.execute(trx)

    await sql`
      DELETE FROM greenhouse_serving.service_attribution_unresolved
      WHERE period_year = ${year}
        AND period_month = ${month}
    `.execute(trx)

    for (const fact of facts) {
      await sql`
        INSERT INTO greenhouse_serving.service_attribution_facts (
          attribution_id,
          space_id,
          organization_id,
          client_id,
          service_id,
          period_year,
          period_month,
          source_domain,
          source_type,
          source_id,
          amount_kind,
          source_currency,
          source_amount,
          amount_clp,
          attribution_method,
          confidence_label,
          confidence_score,
          evidence_json,
          materialization_reason
        ) VALUES (
          ${fact.attributionId},
          ${fact.spaceId},
          ${fact.organizationId},
          ${fact.clientId},
          ${fact.serviceId},
          ${fact.periodYear},
          ${fact.periodMonth},
          ${fact.sourceDomain},
          ${fact.sourceType},
          ${fact.sourceId},
          ${fact.amountKind},
          ${fact.sourceCurrency},
          ${fact.sourceAmount},
          ${fact.amountClp},
          ${fact.attributionMethod},
          ${fact.confidenceLabel},
          ${fact.confidenceScore},
          ${JSON.stringify(fact.evidenceJson)}::jsonb,
          ${fact.materializationReason}
        )
      `.execute(trx)
    }

    for (const row of unresolved) {
      await sql`
        INSERT INTO greenhouse_serving.service_attribution_unresolved (
          unresolved_id,
          period_year,
          period_month,
          space_id,
          organization_id,
          client_id,
          source_domain,
          source_type,
          source_id,
          amount_kind,
          source_currency,
          source_amount,
          amount_clp,
          attempted_method,
          reason_code,
          confidence_label,
          confidence_score,
          candidate_service_ids,
          candidate_space_ids,
          evidence_json,
          materialization_reason
        ) VALUES (
          ${row.unresolvedId},
          ${row.periodYear},
          ${row.periodMonth},
          ${row.spaceId},
          ${row.organizationId},
          ${row.clientId},
          ${row.sourceDomain},
          ${row.sourceType},
          ${row.sourceId},
          ${row.amountKind},
          ${row.sourceCurrency},
          ${row.sourceAmount},
          ${row.amountClp},
          ${row.attemptedMethod},
          ${row.reasonCode},
          ${row.confidenceLabel},
          ${row.confidenceScore},
          ${row.candidateServiceIds}::text[],
          ${row.candidateSpaceIds}::text[],
          ${JSON.stringify(row.evidenceJson)}::jsonb,
          ${row.materializationReason}
        )
      `.execute(trx)
    }
  })

  return {
    periodYear: year,
    periodMonth: month,
    factsWritten: facts.length,
    unresolvedWritten: unresolved.length
  }
}

export const materializeAllAvailableServiceAttributionPeriods = async (reason: string | null = null) => {
  const db = await getDb()

  const periodRows = await sql<{ period_year: number; period_month: number }>`
    SELECT DISTINCT period_year, period_month
    FROM (
      SELECT EXTRACT(YEAR FROM invoice_date)::int AS period_year, EXTRACT(MONTH FROM invoice_date)::int AS period_month
      FROM greenhouse_finance.income
      WHERE invoice_date IS NOT NULL
      UNION
      SELECT period_year, period_month
      FROM greenhouse_finance.cost_allocations
      UNION
      SELECT period_year, period_month
      FROM greenhouse_serving.commercial_cost_attribution
    ) periods
    ORDER BY period_year ASC, period_month ASC
  `.execute(db)

  const results = []

  for (const row of periodRows.rows) {
    results.push(await materializeServiceAttributionForPeriod(row.period_year, row.period_month, reason))
  }

  return results
}

export const readServiceAttributionFactsForPeriod = async ({
  year,
  month,
  spaceId
}: {
  year: number
  month: number
  spaceId: string
}) => {
  const db = await getDb()

  const result = await sql<ServiceAttributionFact & { attribution_id: string; space_id: string; organization_id: string | null; client_id: string | null; service_id: string; period_year: number; period_month: number; source_domain: ServiceAttributionSourceDomain; source_type: string; source_id: string; amount_kind: ServiceAttributionAmountKind; source_currency: string | null; source_amount: number | string | null; amount_clp: number | string; attribution_method: string; confidence_label: ServiceAttributionConfidenceLabel; confidence_score: number | string; evidence_json: Record<string, unknown>; materialization_reason: string | null }>`
    SELECT *
    FROM greenhouse_serving.service_attribution_facts
    WHERE period_year = ${year}
      AND period_month = ${month}
      AND space_id = ${spaceId}
    ORDER BY service_id ASC, amount_kind ASC, source_type ASC, source_id ASC
  `.execute(db)

  return result.rows.map(row => ({
    attributionId: row.attribution_id,
    spaceId: row.space_id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    serviceId: row.service_id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    sourceDomain: row.source_domain,
    sourceType: row.source_type,
    sourceId: row.source_id,
    amountKind: row.amount_kind,
    sourceCurrency: row.source_currency,
    sourceAmount: row.source_amount == null ? null : round2(toNumber(row.source_amount)),
    amountClp: round2(toNumber(row.amount_clp)),
    attributionMethod: row.attribution_method,
    confidenceLabel: row.confidence_label,
    confidenceScore: toNumber(row.confidence_score),
    evidenceJson: row.evidence_json,
    materializationReason: row.materialization_reason
  }))
}

export const readServiceAttributionUnresolvedForPeriod = async ({
  year,
  month,
  spaceId
}: {
  year: number
  month: number
  spaceId: string
}) => {
  const db = await getDb()

  const result = await sql<ServiceAttributionUnresolved & { unresolved_id: string; period_year: number; period_month: number; space_id: string | null; organization_id: string | null; client_id: string | null; source_domain: ServiceAttributionSourceDomain; source_type: string; source_id: string; amount_kind: ServiceAttributionAmountKind; source_currency: string | null; source_amount: number | string | null; amount_clp: number | string; attempted_method: string | null; reason_code: string; confidence_label: ServiceAttributionConfidenceLabel; confidence_score: number | string; candidate_service_ids: string[]; candidate_space_ids: string[]; evidence_json: Record<string, unknown>; materialization_reason: string | null }>`
    SELECT *
    FROM greenhouse_serving.service_attribution_unresolved
    WHERE period_year = ${year}
      AND period_month = ${month}
      AND (
        space_id = ${spaceId}
        OR ${spaceId} = ANY(candidate_space_ids)
      )
    ORDER BY source_type ASC, source_id ASC, amount_kind ASC
  `.execute(db)

  return result.rows.map(row => ({
    unresolvedId: row.unresolved_id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    spaceId: row.space_id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    sourceDomain: row.source_domain,
    sourceType: row.source_type,
    sourceId: row.source_id,
    amountKind: row.amount_kind,
    sourceCurrency: row.source_currency,
    sourceAmount: row.source_amount == null ? null : round2(toNumber(row.source_amount)),
    amountClp: round2(toNumber(row.amount_clp)),
    attemptedMethod: row.attempted_method,
    reasonCode: row.reason_code,
    confidenceLabel: row.confidence_label,
    confidenceScore: toNumber(row.confidence_score),
    candidateServiceIds: row.candidate_service_ids || [],
    candidateSpaceIds: row.candidate_space_ids || [],
    evidenceJson: row.evidence_json,
    materializationReason: row.materialization_reason
  }))
}

export const readServiceAttributionByServiceForPeriod = async ({
  year,
  month,
  spaceId
}: {
  year: number
  month: number
  spaceId: string
}): Promise<ServiceAttributionSummaryRow[]> => {
  const db = await getDb()

  const result = await sql<{
    service_id: string
    service_name: string
    space_id: string
    organization_id: string | null
    client_id: string | null
    revenue_clp: number | string
    direct_cost_clp: number | string
    labor_cost_clp: number | string
    overhead_cost_clp: number | string
  }>`
    SELECT
      f.service_id,
      s.name AS service_name,
      f.space_id,
      f.organization_id,
      f.client_id,
      COALESCE(SUM(CASE WHEN f.amount_kind = 'revenue' THEN f.amount_clp ELSE 0 END), 0) AS revenue_clp,
      COALESCE(SUM(CASE WHEN f.amount_kind = 'direct_cost' THEN f.amount_clp ELSE 0 END), 0) AS direct_cost_clp,
      COALESCE(SUM(CASE WHEN f.amount_kind = 'labor_cost' THEN f.amount_clp ELSE 0 END), 0) AS labor_cost_clp,
      COALESCE(SUM(CASE WHEN f.amount_kind = 'overhead_cost' THEN f.amount_clp ELSE 0 END), 0) AS overhead_cost_clp
    FROM greenhouse_serving.service_attribution_facts f
    INNER JOIN greenhouse_core.services s
      ON s.service_id = f.service_id
    WHERE f.period_year = ${year}
      AND f.period_month = ${month}
      AND f.space_id = ${spaceId}
    GROUP BY f.service_id, s.name, f.space_id, f.organization_id, f.client_id
    ORDER BY revenue_clp DESC, s.name ASC
  `.execute(db)

  return result.rows.map(row => {
    const revenueClp = round2(toNumber(row.revenue_clp))
    const directCostClp = round2(toNumber(row.direct_cost_clp))
    const laborCostClp = round2(toNumber(row.labor_cost_clp))
    const overheadCostClp = round2(toNumber(row.overhead_cost_clp))
    const totalCostClp = round2(directCostClp + laborCostClp + overheadCostClp)

    return {
      serviceId: row.service_id,
      serviceName: row.service_name,
      spaceId: row.space_id,
      organizationId: row.organization_id,
      clientId: row.client_id,
      periodYear: year,
      periodMonth: month,
      revenueClp,
      directCostClp,
      laborCostClp,
      overheadCostClp,
      totalCostClp,
      grossMarginClp: round2(revenueClp - totalCostClp)
    }
  })
}
