import 'server-only'

import { query } from '@/lib/db'

export type PricingCatalogImpactEntityType =
  | 'sellable_role'
  | 'tool_catalog'
  | 'overhead_addon'
  | 'role_tier_margin'
  | 'commercial_model_multiplier'
  | 'country_pricing_factor'

export interface PricingCatalogImpactPreviewInput {
  spaceId?: string | null
  spaceIds?: string[] | null
  entityType: PricingCatalogImpactEntityType
  entityId?: string | null
  entitySku?: string | null
  entityCode?: string | null
  asOfDate?: string | null
  sampleLimit?: number | null
}

export interface PricingCatalogImpactPreviewQuoteSample {
  quotationId: string
  quotationNumber: string
  clientName: string | null
  totalAmountClp: number
  status: string
}

export interface PricingCatalogImpactPreviewResult {
  entityType: PricingCatalogImpactEntityType
  asOfDate: string
  affectedQuotes: {
    count: number
    totalAmountClp: number
    sample: PricingCatalogImpactPreviewQuoteSample[]
  }
  affectedDeals: {
    count: number
    totalPipelineClp: number
  }
  warnings: string[]
}

interface QuoteLineEvidenceRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string
  status: string
  total_amount_clp: string | number | null
  commercial_model: string | null
  pricing_model: string | null
  staffing_model: string | null
  business_line_code: string | null
  currency: string | null
  quote_date: string | Date | null
  hubspot_deal_id: string | null
  client_name: string | null
  line_item_id: string | null
  line_type: string | null
  role_code: string | null
  product_id: string | null
  finance_product_id: string | null
  label: string | null
  description: string | null
  subtotal_after_discount: string | number | null
  product_name: string | null
  product_type: string | null
  legacy_category: string | null
  legacy_sku: string | null
  suggested_role_code: string | null
}

interface DealSnapshotRow extends Record<string, unknown> {
  deal_id: string
  hubspot_deal_id: string
  latest_quote_id: string | null
  amount_clp: string | number | null
}

interface SellableRoleTargetRow extends Record<string, unknown> {
  role_id: string
  role_code: string
  role_sku: string
}

interface ToolCatalogTargetRow extends Record<string, unknown> {
  tool_id: string
  tool_sku: string | null
  tool_name: string
  tool_category: string
  vendor: string | null
}

interface OverheadAddonTargetRow extends Record<string, unknown> {
  addon_id: string
  addon_sku: string
  addon_name: string
  applicable_to: string[] | null
}

interface CommercialModelMultiplierRow extends Record<string, unknown> {
  model_code: string
}

interface CountryPricingFactorRow extends Record<string, unknown> {
  factor_code: string
}

interface RoleTierMarginRow extends Record<string, unknown> {
  tier: string
}

interface QuoteLineEvidence {
  roleCode: string | null
  label: string | null
  description: string | null
  productName: string | null
  legacySku: string | null
  suggestedRoleCode: string | null
  subtotalAfterDiscount: number
}

interface QuoteAggregate {
  quotationId: string
  quotationNumber: string
  clientName: string | null
  status: string
  commercialModel: string | null
  pricingModel: string | null
  staffingModel: string | null
  businessLineCode: string | null
  currency: string | null
  hubspotDealId: string | null
  totalAmountClp: number | null
  lineSubtotalClp: number
  lines: QuoteLineEvidence[]
}

const OPEN_QUOTE_STATUSES = ['draft', 'pending_approval', 'sent', 'approved'] as const

const round2 = (value: number) => Math.round(value * 100) / 100

const toNumber = (value: string | number | null | undefined): number => {
  if (value == null) return 0

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toIsoDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const normalizeText = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()

const containsToken = (haystack: string | null | undefined, needle: string) => {
  const normalizedHaystack = normalizeText(haystack)
  const normalizedNeedle = normalizeText(needle)

  if (!normalizedHaystack || !normalizedNeedle) return false

  return normalizedHaystack.includes(normalizedNeedle)
}

const resolveSpaceIds = (input: PricingCatalogImpactPreviewInput) => {
  const ids = new Set<string>()

  for (const candidate of input.spaceIds ?? []) {
    const trimmed = candidate?.trim()

    if (trimmed) ids.add(trimmed)
  }

  const single = input.spaceId?.trim()

  if (single) ids.add(single)

  return [...ids]
}

const extractSelector = (input: PricingCatalogImpactPreviewInput) =>
  input.entityCode?.trim() || input.entitySku?.trim() || input.entityId?.trim() || ''

const loadOpenQuoteRows = async (spaceIds: string[]) => {
  if (spaceIds.length === 0) return [] as QuoteLineEvidenceRow[]

  return query<QuoteLineEvidenceRow>(
    `SELECT
       q.quotation_id,
       q.quotation_number,
       COALESCE(q.legacy_status, q.status) AS status,
       q.total_amount_clp,
       q.commercial_model,
       q.pricing_model,
       q.staffing_model,
       q.business_line_code,
       q.currency,
       q.quote_date,
       q.hubspot_deal_id,
       COALESCE(q.client_name_cache, org.organization_name, org.legal_name) AS client_name,
       qli.line_item_id,
       qli.line_type,
       qli.role_code,
       qli.product_id,
       qli.finance_product_id,
       qli.label,
       qli.description,
       qli.subtotal_after_discount,
       pc.product_name,
       pc.product_type,
       pc.legacy_category,
       pc.legacy_sku,
       pc.suggested_role_code
     FROM greenhouse_commercial.quotations q
     LEFT JOIN greenhouse_core.organizations org
       ON org.organization_id = q.organization_id
     LEFT JOIN greenhouse_commercial.quotation_line_items qli
       ON qli.quotation_id = q.quotation_id
      AND qli.version_number = q.current_version
     LEFT JOIN greenhouse_commercial.product_catalog pc
       ON pc.product_id = qli.product_id
       OR pc.finance_product_id = qli.product_id
     WHERE q.space_id = ANY($1::text[])
       AND COALESCE(q.legacy_status, q.status) = ANY($2::text[])
     ORDER BY q.quote_date DESC NULLS LAST, q.updated_at DESC, q.quotation_id ASC, qli.sort_order ASC, qli.created_at ASC`,
    [spaceIds, OPEN_QUOTE_STATUSES]
  )
}

const loadDealRows = async ({
  spaceIds,
  quotationIds,
  hubspotDealIds
}: {
  spaceIds: string[]
  quotationIds: string[]
  hubspotDealIds: string[]
}) => {
  if (spaceIds.length === 0 || (quotationIds.length === 0 && hubspotDealIds.length === 0)) {
    return [] as DealSnapshotRow[]
  }

  return query<DealSnapshotRow>(
    `SELECT deal_id, hubspot_deal_id, latest_quote_id, amount_clp
     FROM greenhouse_serving.deal_pipeline_snapshots
     WHERE space_id = ANY($1::text[])
       AND is_open = TRUE
       AND (
         latest_quote_id = ANY($2::text[])
         OR hubspot_deal_id = ANY($3::text[])
       )`,
    [spaceIds, quotationIds, hubspotDealIds]
  )
}

const loadSellableRoleTarget = async (selector: string) => {
  if (!selector) return null

  const rows = await query<SellableRoleTargetRow>(
    `SELECT role_id, role_code, role_sku
     FROM greenhouse_commercial.sellable_roles
     WHERE role_id = $1
        OR role_code = $1
        OR role_sku = $1
     LIMIT 1`,
    [selector]
  )

  return rows[0] ?? null
}

const loadRolesForTier = async (tier: string) => {
  if (!tier) return [] as SellableRoleTargetRow[]

  return query<SellableRoleTargetRow>(
    `SELECT role_id, role_code, role_sku
     FROM greenhouse_commercial.sellable_roles
     WHERE tier = $1`,
    [tier]
  )
}

const loadToolTarget = async (selector: string) => {
  if (!selector) return null

  const rows = await query<ToolCatalogTargetRow>(
    `SELECT tool_id, tool_sku, tool_name, tool_category, vendor
     FROM greenhouse_ai.tool_catalog
     WHERE tool_id = $1
        OR tool_sku = $1
        OR lower(tool_name) = lower($1)
     LIMIT 1`,
    [selector]
  )

  return rows[0] ?? null
}

const loadAddonTarget = async (selector: string) => {
  if (!selector) return null

  const rows = await query<OverheadAddonTargetRow>(
    `SELECT addon_id, addon_sku, addon_name, applicable_to
     FROM greenhouse_commercial.overhead_addons
     WHERE addon_id = $1
        OR addon_sku = $1
        OR lower(addon_name) = lower($1)
     LIMIT 1`,
    [selector]
  )

  return rows[0] ?? null
}

const loadCommercialModelMultiplier = async (selector: string, asOfDate: string) => {
  if (!selector) return null

  const rows = await query<CommercialModelMultiplierRow>(
    `SELECT model_code
     FROM greenhouse_commercial.commercial_model_multipliers
     WHERE model_code = $1
       AND effective_from <= $2::date
     ORDER BY effective_from DESC
     LIMIT 1`,
    [selector, asOfDate]
  )

  return rows[0] ?? null
}

const loadCountryPricingFactor = async (selector: string, asOfDate: string) => {
  if (!selector) return null

  const rows = await query<CountryPricingFactorRow>(
    `SELECT factor_code
     FROM greenhouse_commercial.country_pricing_factors
     WHERE factor_code = $1
       AND effective_from <= $2::date
     ORDER BY effective_from DESC
     LIMIT 1`,
    [selector, asOfDate]
  )

  return rows[0] ?? null
}

const loadRoleTierMargin = async (selector: string, asOfDate: string) => {
  if (!selector) return null

  const rows = await query<RoleTierMarginRow>(
    `SELECT tier
     FROM greenhouse_commercial.role_tier_margins
     WHERE tier = $1
       AND effective_from <= $2::date
     ORDER BY effective_from DESC
     LIMIT 1`,
    [selector, asOfDate]
  )

  return rows[0] ?? null
}

const buildQuoteAggregates = (rows: QuoteLineEvidenceRow[]) => {
  const quotes = new Map<string, QuoteAggregate>()

  for (const row of rows) {
    if (!quotes.has(row.quotation_id)) {
      quotes.set(row.quotation_id, {
        quotationId: row.quotation_id,
        quotationNumber: row.quotation_number,
        clientName: row.client_name,
        status: row.status,
        commercialModel: row.commercial_model,
        pricingModel: row.pricing_model,
        staffingModel: row.staffing_model,
        businessLineCode: row.business_line_code,
        currency: row.currency,
        hubspotDealId: row.hubspot_deal_id,
        totalAmountClp: row.total_amount_clp == null ? null : toNumber(row.total_amount_clp),
        lineSubtotalClp: 0,
        lines: []
      })
    }

    const quote = quotes.get(row.quotation_id)

    if (!quote || !row.line_item_id) continue

    const line: QuoteLineEvidence = {
      roleCode: row.role_code,
      label: row.label,
      description: row.description,
      productName: row.product_name,
      legacySku: row.legacy_sku,
      suggestedRoleCode: row.suggested_role_code,
      subtotalAfterDiscount: toNumber(row.subtotal_after_discount)
    }

    quote.lines.push(line)
    quote.lineSubtotalClp = round2(quote.lineSubtotalClp + line.subtotalAfterDiscount)
  }

  return [...quotes.values()]
}

const matchSellableRoleQuotes = (quotes: QuoteAggregate[], roleCodes: Set<string>) =>
  quotes.filter(quote =>
    quote.lines.some(line => {
      const roleCode = normalizeText(line.roleCode)
      const suggested = normalizeText(line.suggestedRoleCode)

      return roleCodes.has(roleCode) || roleCodes.has(suggested)
    })
  )

const matchCommercialModelQuotes = (quotes: QuoteAggregate[], modelCode: string) =>
  quotes.filter(
    quote =>
      normalizeText(quote.commercialModel) === modelCode ||
      normalizeText(quote.pricingModel) === modelCode
  )

const matchOverheadAddonQuotes = (quotes: QuoteAggregate[], addon: OverheadAddonTargetRow) => {
  const addonSku = normalizeText(addon.addon_sku)
  const applicableTo = new Set((addon.applicable_to ?? []).map(normalizeText).filter(Boolean))

  return quotes.filter(quote => {
    const commercialModel = normalizeText(quote.commercialModel)
    const staffingModel = normalizeText(quote.staffingModel)
    const currency = normalizeText(quote.currency)
    const businessLine = normalizeText(quote.businessLineCode)

    if (addonSku === 'efo-003') return commercialModel === 'on_demand'
    if (addonSku === 'efo-004' || addonSku === 'efo-005') return staffingModel === 'named_resources'
    if (addonSku === 'efo-006') return currency !== 'clp'

    if (addonSku === 'efo-007') {
      return businessLine === 'wave' || businessLine === 'efeonce' || businessLine === 'efeonce_digital'
    }

    const quoteTags = new Set<string>(['all_projects'])

    if (quote.commercialModel) quoteTags.add(normalizeText(quote.commercialModel))
    if (quote.staffingModel === 'named_resources') quoteTags.add('staff_augmentation')
    if (quote.businessLineCode) quoteTags.add(normalizeText(quote.businessLineCode))

    for (const tag of applicableTo) {
      if (quoteTags.has(tag)) return true
    }

    return false
  })
}

const matchToolCatalogQuotes = (quotes: QuoteAggregate[], tool: ToolCatalogTargetRow) => {
  const tokens = [tool.tool_sku, tool.tool_name, tool.tool_category, tool.vendor]
    .map(normalizeText)
    .filter(Boolean)

  if (tokens.length === 0) return [] as QuoteAggregate[]

  return quotes.filter(quote =>
    quote.lines.some(line =>
      [line.label, line.description, line.productName, line.legacySku].some(haystack =>
        tokens.some(token => containsToken(haystack, token))
      )
    )
  )
}

const buildWarningsForEntity = ({
  entityType,
  targetFound
}: {
  entityType: PricingCatalogImpactEntityType
  targetFound: boolean
}) => {
  const warnings: string[] = []

  if (!targetFound) {
    warnings.push(
      `No runtime target row was found for ${entityType}; preview falls back to selector-based matching when possible.`
    )
  }

  if (entityType === 'tool_catalog') {
    warnings.push(
      'Tool catalog preview uses explicit line-item text evidence only; quotation_line_items does not carry a canonical tool_sku bridge yet.'
    )
  }

  if (entityType === 'country_pricing_factor') {
    warnings.push(
      'Country pricing factor preview is intentionally conservative: this slice has no canonical country bridge on quotations, so no rows are matched until that linkage exists.'
    )
  }

  return warnings
}

export const previewPricingCatalogImpact = async (
  input: PricingCatalogImpactPreviewInput
): Promise<PricingCatalogImpactPreviewResult> => {
  const selector = extractSelector(input)
  const asOfDate = toIsoDate(input.asOfDate) ?? new Date().toISOString().slice(0, 10)
  const sampleLimit = Math.max(1, Math.min(10, input.sampleLimit ?? 5))
  const spaceIds = resolveSpaceIds(input)

  const [
    quoteRows,
    roleTarget,
    tierTarget,
    toolTarget,
    addonTarget,
    multiplierTarget,
    countryTarget,
    tierMarginTarget
  ] = await Promise.all([
    loadOpenQuoteRows(spaceIds),
    input.entityType === 'sellable_role' ? loadSellableRoleTarget(selector) : Promise.resolve(null),
    input.entityType === 'role_tier_margin' ? loadRolesForTier(selector) : Promise.resolve([] as SellableRoleTargetRow[]),
    input.entityType === 'tool_catalog' ? loadToolTarget(selector) : Promise.resolve(null),
    input.entityType === 'overhead_addon' ? loadAddonTarget(selector) : Promise.resolve(null),
    input.entityType === 'commercial_model_multiplier' ? loadCommercialModelMultiplier(selector, asOfDate) : Promise.resolve(null),
    input.entityType === 'country_pricing_factor' ? loadCountryPricingFactor(selector, asOfDate) : Promise.resolve(null),
    input.entityType === 'role_tier_margin' ? loadRoleTierMargin(selector, asOfDate) : Promise.resolve(null)
  ])

  const quotes = buildQuoteAggregates(quoteRows)

  const warnings = buildWarningsForEntity({
    entityType: input.entityType,
    targetFound: Boolean(
      roleTarget || tierTarget.length || toolTarget || addonTarget || multiplierTarget || countryTarget || tierMarginTarget
    )
  })

  let impactedQuotes: QuoteAggregate[] = []

  switch (input.entityType) {
    case 'sellable_role': {
      const roleCodes = new Set<string>()

      if (roleTarget) {
        roleCodes.add(normalizeText(roleTarget.role_code))
      } else if (selector) {
        roleCodes.add(normalizeText(selector))
      }

      impactedQuotes = matchSellableRoleQuotes(quotes, roleCodes)
      break
    }

    case 'role_tier_margin': {
      const tierRows = tierTarget.length > 0 ? tierTarget : roleTarget ? [roleTarget] : []
      const roleCodes = new Set<string>(tierRows.map(row => normalizeText(row.role_code)).filter(Boolean))

      impactedQuotes = matchSellableRoleQuotes(quotes, roleCodes)
      break
    }

    case 'tool_catalog':
      impactedQuotes = toolTarget ? matchToolCatalogQuotes(quotes, toolTarget) : []
      break
    case 'overhead_addon':
      impactedQuotes = addonTarget ? matchOverheadAddonQuotes(quotes, addonTarget) : []
      break

    case 'commercial_model_multiplier': {
      const modelCode = normalizeText(multiplierTarget?.model_code ?? selector)

      impactedQuotes = modelCode ? matchCommercialModelQuotes(quotes, modelCode) : []
      break
    }

    case 'country_pricing_factor':
      impactedQuotes = []
      break
  }

  const impactedQuoteIds = [...new Set(impactedQuotes.map(quote => quote.quotationId))]

  const impactedHubspotDealIds = [
    ...new Set(impactedQuotes.map(quote => quote.hubspotDealId).filter((value): value is string => Boolean(value)))
  ]

  const dealRows = await loadDealRows({
    spaceIds,
    quotationIds: impactedQuoteIds,
    hubspotDealIds: impactedHubspotDealIds
  })

  const quotesForOutput = impactedQuotes
    .map(quote => ({
      ...quote,
      totalAmountClp: quote.totalAmountClp ?? round2(quote.lineSubtotalClp)
    }))
    .sort((left, right) => right.totalAmountClp - left.totalAmountClp || left.quotationNumber.localeCompare(right.quotationNumber))

  return {
    entityType: input.entityType,
    asOfDate,
    affectedQuotes: {
      count: quotesForOutput.length,
      totalAmountClp: round2(quotesForOutput.reduce((acc, quote) => acc + quote.totalAmountClp, 0)),
      sample: quotesForOutput.slice(0, sampleLimit).map(quote => ({
        quotationId: quote.quotationId,
        quotationNumber: quote.quotationNumber,
        clientName: quote.clientName,
        totalAmountClp: quote.totalAmountClp,
        status: quote.status
      }))
    },
    affectedDeals: {
      count: new Set(dealRows.map(row => row.deal_id)).size,
      totalPipelineClp: round2(dealRows.reduce((acc, row) => acc + toNumber(row.amount_clp), 0))
    },
    warnings
  }
}
