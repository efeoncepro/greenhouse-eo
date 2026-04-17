import 'server-only'

import { query, withTransaction } from '@/lib/db'

import type {
  QuotationPricingModel,
  QuoteTemplate,
  QuoteTemplateItem
} from './contracts'
import { QUOTATION_PRICING_MODELS } from './contracts'

interface TemplateRow extends Record<string, unknown> {
  template_id: string
  template_name: string
  template_code: string
  business_line_code: string | null
  pricing_model: string
  default_currency: string
  default_billing_frequency: string
  default_payment_terms_days: number
  default_contract_duration_months: number | null
  default_conditions_text: string | null
  default_term_ids: string[] | null
  description: string | null
  active: boolean
  usage_count: number
  last_used_at: string | Date | null
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

interface TemplateItemRow extends Record<string, unknown> {
  template_item_id: string
  template_id: string
  product_id: string | null
  line_type: string
  label: string
  description: string | null
  role_code: string | null
  suggested_hours: string | number | null
  unit: string
  quantity: string | number
  default_margin_pct: string | number | null
  default_unit_price: string | number | null
  sort_order: number
}

const toIso = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const mapTemplate = (row: TemplateRow): QuoteTemplate => ({
  templateId: row.template_id,
  templateName: row.template_name,
  templateCode: row.template_code,
  businessLineCode: row.business_line_code,
  pricingModel: row.pricing_model as QuotationPricingModel,
  defaultCurrency: row.default_currency,
  defaultBillingFrequency: row.default_billing_frequency,
  defaultPaymentTermsDays: row.default_payment_terms_days,
  defaultContractDurationMonths: row.default_contract_duration_months,
  defaultConditionsText: row.default_conditions_text,
  defaultTermIds: row.default_term_ids ?? [],
  description: row.description,
  active: row.active,
  usageCount: row.usage_count,
  lastUsedAt: toIso(row.last_used_at),
  createdBy: row.created_by,
  createdAt: toIso(row.created_at) as string,
  updatedAt: toIso(row.updated_at) as string
})

const mapItem = (row: TemplateItemRow): QuoteTemplateItem => ({
  templateItemId: row.template_item_id,
  templateId: row.template_id,
  productId: row.product_id,
  lineType: row.line_type as QuoteTemplateItem['lineType'],
  label: row.label,
  description: row.description,
  roleCode: row.role_code,
  suggestedHours: toNumberOrNull(row.suggested_hours),
  unit: row.unit as QuoteTemplateItem['unit'],
  quantity: toNumberOrNull(row.quantity) ?? 1,
  defaultMarginPct: toNumberOrNull(row.default_margin_pct),
  defaultUnitPrice: toNumberOrNull(row.default_unit_price),
  sortOrder: row.sort_order
})

export class TemplateValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'TemplateValidationError'
    this.statusCode = statusCode
  }
}

const validatePricingModel = (value: unknown): QuotationPricingModel => {
  if (typeof value !== 'string' || !QUOTATION_PRICING_MODELS.includes(value as QuotationPricingModel)) {
    throw new TemplateValidationError(
      `pricingModel inválido. Debe ser uno de: ${QUOTATION_PRICING_MODELS.join(', ')}.`
    )
  }

  return value as QuotationPricingModel
}

export const listTemplates = async (params?: {
  activeOnly?: boolean
  businessLineCode?: string | null
  pricingModel?: QuotationPricingModel | null
}): Promise<QuoteTemplate[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  if (params?.activeOnly !== false) {
    conditions.push('active = TRUE')
  }

  if (params?.businessLineCode) {
    idx += 1
    conditions.push(`(business_line_code IS NULL OR business_line_code = $${idx})`)
    values.push(params.businessLineCode)
  }

  if (params?.pricingModel) {
    idx += 1
    conditions.push(`pricing_model = $${idx}`)
    values.push(params.pricingModel)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<TemplateRow>(
    `SELECT template_id, template_name, template_code, business_line_code,
            pricing_model, default_currency, default_billing_frequency,
            default_payment_terms_days, default_contract_duration_months,
            default_conditions_text, default_term_ids, description, active,
            usage_count, last_used_at, created_by, created_at, updated_at
       FROM greenhouse_commercial.quote_templates
       ${where}
       ORDER BY usage_count DESC, template_name ASC
       LIMIT 200`,
    values
  )

  return rows.map(mapTemplate)
}

export const getTemplate = async (
  templateId: string
): Promise<(QuoteTemplate & { items: QuoteTemplateItem[] }) | null> => {
  const rows = await query<TemplateRow>(
    `SELECT template_id, template_name, template_code, business_line_code,
            pricing_model, default_currency, default_billing_frequency,
            default_payment_terms_days, default_contract_duration_months,
            default_conditions_text, default_term_ids, description, active,
            usage_count, last_used_at, created_by, created_at, updated_at
       FROM greenhouse_commercial.quote_templates
       WHERE template_id = $1`,
    [templateId]
  )

  if (rows.length === 0) return null

  const itemRows = await query<TemplateItemRow>(
    `SELECT template_item_id, template_id, product_id, line_type, label,
            description, role_code, suggested_hours, unit, quantity,
            default_margin_pct, default_unit_price, sort_order
       FROM greenhouse_commercial.quote_template_items
       WHERE template_id = $1
       ORDER BY sort_order ASC`,
    [templateId]
  )

  return {
    ...mapTemplate(rows[0]),
    items: itemRows.map(mapItem)
  }
}

interface CreateTemplateInput {
  templateName: string
  templateCode: string
  businessLineCode?: string | null
  pricingModel: QuotationPricingModel
  defaultCurrency?: string
  defaultBillingFrequency?: string
  defaultPaymentTermsDays?: number
  defaultContractDurationMonths?: number | null
  defaultConditionsText?: string | null
  defaultTermIds?: string[]
  description?: string | null
  active?: boolean
  createdBy: string
  items?: Array<{
    productId?: string | null
    lineType: 'person' | 'role' | 'deliverable' | 'direct_cost'
    label: string
    description?: string | null
    roleCode?: string | null
    suggestedHours?: number | null
    unit?: 'hour' | 'month' | 'unit' | 'project'
    quantity?: number
    defaultMarginPct?: number | null
    defaultUnitPrice?: number | null
    sortOrder?: number
  }>
}

export const createTemplate = async (input: CreateTemplateInput): Promise<QuoteTemplate> => {
  const pricingModel = validatePricingModel(input.pricingModel)

  if (!input.templateName?.trim()) throw new TemplateValidationError('templateName es requerido.')
  if (!input.templateCode?.trim()) throw new TemplateValidationError('templateCode es requerido.')

  return withTransaction(async client => {
    const templateRow = await client.query<TemplateRow>(
      `INSERT INTO greenhouse_commercial.quote_templates (
         template_name, template_code, business_line_code, pricing_model,
         default_currency, default_billing_frequency, default_payment_terms_days,
         default_contract_duration_months, default_conditions_text,
         default_term_ids, description, active, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING template_id, template_name, template_code, business_line_code,
                 pricing_model, default_currency, default_billing_frequency,
                 default_payment_terms_days, default_contract_duration_months,
                 default_conditions_text, default_term_ids, description, active,
                 usage_count, last_used_at, created_by, created_at, updated_at`,
      [
        input.templateName.trim(),
        input.templateCode.trim(),
        input.businessLineCode ?? null,
        pricingModel,
        input.defaultCurrency ?? 'CLP',
        input.defaultBillingFrequency ?? 'monthly',
        input.defaultPaymentTermsDays ?? 30,
        input.defaultContractDurationMonths ?? null,
        input.defaultConditionsText ?? null,
        input.defaultTermIds ?? [],
        input.description ?? null,
        input.active ?? true,
        input.createdBy
      ]
    )

    const template = mapTemplate(templateRow.rows[0])

    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        await client.query(
          `INSERT INTO greenhouse_commercial.quote_template_items (
             template_id, product_id, line_type, label, description,
             role_code, suggested_hours, unit, quantity, default_margin_pct,
             default_unit_price, sort_order
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            template.templateId,
            item.productId ?? null,
            item.lineType,
            item.label,
            item.description ?? null,
            item.roleCode ?? null,
            item.suggestedHours ?? null,
            item.unit ?? 'hour',
            item.quantity ?? 1,
            item.defaultMarginPct ?? null,
            item.defaultUnitPrice ?? null,
            item.sortOrder ?? 0
          ]
        )
      }
    }

    return template
  })
}

interface UpdateTemplateInput {
  templateName?: string
  businessLineCode?: string | null
  pricingModel?: QuotationPricingModel
  defaultCurrency?: string
  defaultBillingFrequency?: string
  defaultPaymentTermsDays?: number
  defaultContractDurationMonths?: number | null
  defaultConditionsText?: string | null
  defaultTermIds?: string[]
  description?: string | null
  active?: boolean
}

export const updateTemplate = async (
  templateId: string,
  input: UpdateTemplateInput
): Promise<QuoteTemplate | null> => {
  const updates: string[] = []
  const values: unknown[] = [templateId]
  let idx = 1

  const push = (column: string, value: unknown) => {
    idx += 1
    updates.push(`${column} = $${idx}`)
    values.push(value)
  }

  if (input.templateName !== undefined) push('template_name', input.templateName)
  if (input.businessLineCode !== undefined) push('business_line_code', input.businessLineCode)
  if (input.pricingModel !== undefined) push('pricing_model', validatePricingModel(input.pricingModel))
  if (input.defaultCurrency !== undefined) push('default_currency', input.defaultCurrency)
  if (input.defaultBillingFrequency !== undefined) push('default_billing_frequency', input.defaultBillingFrequency)
  if (input.defaultPaymentTermsDays !== undefined) push('default_payment_terms_days', input.defaultPaymentTermsDays)
  if (input.defaultContractDurationMonths !== undefined)
    push('default_contract_duration_months', input.defaultContractDurationMonths)
  if (input.defaultConditionsText !== undefined) push('default_conditions_text', input.defaultConditionsText)
  if (input.defaultTermIds !== undefined) push('default_term_ids', input.defaultTermIds)
  if (input.description !== undefined) push('description', input.description)
  if (input.active !== undefined) push('active', input.active)

  if (updates.length === 0) return null

  updates.push('updated_at = CURRENT_TIMESTAMP')

  const rows = await query<TemplateRow>(
    `UPDATE greenhouse_commercial.quote_templates
        SET ${updates.join(', ')}
        WHERE template_id = $1
        RETURNING template_id, template_name, template_code, business_line_code,
                  pricing_model, default_currency, default_billing_frequency,
                  default_payment_terms_days, default_contract_duration_months,
                  default_conditions_text, default_term_ids, description, active,
                  usage_count, last_used_at, created_by, created_at, updated_at`,
    values
  )

  return rows[0] ? mapTemplate(rows[0]) : null
}

export const deactivateTemplate = async (templateId: string): Promise<boolean> => {
  const rows = await query<{ template_id: string }>(
    `UPDATE greenhouse_commercial.quote_templates
        SET active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE template_id = $1
        RETURNING template_id`,
    [templateId]
  )

  return rows.length > 0
}

export interface TemplateUsageSnapshot {
  templateId: string
  templateCode: string
  templateName: string
  items: QuoteTemplateItem[]
  defaults: {
    currency: string
    billingFrequency: string
    paymentTermsDays: number
    contractDurationMonths: number | null
    conditionsText: string | null
    termIds: string[]
    pricingModel: QuotationPricingModel
    businessLineCode: string | null
  }
}

export const recordTemplateUsage = async (templateId: string): Promise<TemplateUsageSnapshot | null> => {
  const template = await getTemplate(templateId)

  if (!template) return null

  await query(
    `UPDATE greenhouse_commercial.quote_templates
        SET usage_count = usage_count + 1,
            last_used_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE template_id = $1`,
    [templateId]
  )

  return {
    templateId: template.templateId,
    templateCode: template.templateCode,
    templateName: template.templateName,
    items: template.items,
    defaults: {
      currency: template.defaultCurrency,
      billingFrequency: template.defaultBillingFrequency,
      paymentTermsDays: template.defaultPaymentTermsDays,
      contractDurationMonths: template.defaultContractDurationMonths,
      conditionsText: template.defaultConditionsText,
      termIds: template.defaultTermIds,
      pricingModel: template.pricingModel,
      businessLineCode: template.businessLineCode
    }
  }
}
