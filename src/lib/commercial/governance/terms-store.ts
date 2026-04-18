import 'server-only'

import { query, withTransaction } from '@/lib/db'

import type { QueryableClient } from './audit-log'

import type {
  QuotationPricingModel,
  QuotationTerm,
  Term,
  TermCategory
} from './contracts'
import { QUOTATION_PRICING_MODELS, TERM_CATEGORIES } from './contracts'

interface TermRow extends Record<string, unknown> {
  term_id: string
  term_code: string
  category: string
  title: string
  body_template: string
  applies_to_model: string | null
  default_for_bl: string[] | null
  required: boolean
  sort_order: number
  active: boolean
  version: number
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

interface QuotationTermRow extends Record<string, unknown> {
  quotation_term_id: string
  quotation_id: string
  term_id: string
  term_code: string | null
  title: string | null
  category: string | null
  body_resolved: string
  sort_order: number
  included: boolean
  required: boolean | null
  created_at: string | Date
  updated_at: string | Date
}

const toIso = (value: string | Date): string => (value instanceof Date ? value.toISOString() : value)

const mapTerm = (row: TermRow): Term => ({
  termId: row.term_id,
  termCode: row.term_code,
  category: row.category as TermCategory,
  title: row.title,
  bodyTemplate: row.body_template,
  appliesToModel: row.applies_to_model as QuotationPricingModel | null,
  defaultForBl: row.default_for_bl ?? [],
  required: row.required,
  sortOrder: row.sort_order,
  active: row.active,
  version: row.version,
  createdBy: row.created_by,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
})

const mapQuotationTerm = (row: QuotationTermRow): QuotationTerm => ({
  quotationTermId: row.quotation_term_id,
  quotationId: row.quotation_id,
  termId: row.term_id,
  termCode: row.term_code,
  title: row.title,
  category: row.category as TermCategory | null,
  bodyResolved: row.body_resolved,
  sortOrder: row.sort_order,
  included: row.included,
  required: row.required ?? false,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
})

export class TermValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'TermValidationError'
    this.statusCode = statusCode
  }
}

const validateCategory = (value: unknown): TermCategory => {
  if (typeof value !== 'string' || !TERM_CATEGORIES.includes(value as TermCategory)) {
    throw new TermValidationError(
      `Categoría inválida. Debe ser uno de: ${TERM_CATEGORIES.join(', ')}.`
    )
  }

  return value as TermCategory
}

const validateAppliesTo = (value: unknown): QuotationPricingModel | null => {
  if (value === null || value === undefined || value === '') return null

  if (
    typeof value !== 'string' ||
    !QUOTATION_PRICING_MODELS.includes(value as QuotationPricingModel)
  ) {
    throw new TermValidationError('appliesToModel inválido.')
  }

  return value as QuotationPricingModel
}

// ── Terms library CRUD ────────────────────────────────────────

export const listTerms = async (params?: {
  activeOnly?: boolean
  category?: TermCategory
}): Promise<Term[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  if (params?.activeOnly !== false) {
    conditions.push('active = TRUE')
  }

  if (params?.category) {
    idx += 1
    conditions.push(`category = $${idx}`)
    values.push(params.category)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<TermRow>(
    `SELECT term_id, term_code, category, title, body_template,
            applies_to_model, default_for_bl, required, sort_order,
            active, version, created_by, created_at, updated_at
       FROM greenhouse_commercial.terms_library
       ${where}
       ORDER BY sort_order ASC, title ASC`,
    values
  )

  return rows.map(mapTerm)
}

interface CreateTermInput {
  termCode: string
  category: TermCategory
  title: string
  bodyTemplate: string
  appliesToModel?: QuotationPricingModel | null
  defaultForBl?: string[]
  required?: boolean
  sortOrder?: number
  active?: boolean
  createdBy: string
}

export const createTerm = async (input: CreateTermInput): Promise<Term> => {
  const category = validateCategory(input.category)
  const appliesTo = validateAppliesTo(input.appliesToModel ?? null)

  if (!input.termCode?.trim()) throw new TermValidationError('termCode es requerido.')
  if (!input.title?.trim()) throw new TermValidationError('title es requerido.')
  if (!input.bodyTemplate?.trim()) throw new TermValidationError('bodyTemplate es requerido.')

  const rows = await query<TermRow>(
    `INSERT INTO greenhouse_commercial.terms_library (
       term_code, category, title, body_template, applies_to_model,
       default_for_bl, required, sort_order, active, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING term_id, term_code, category, title, body_template,
               applies_to_model, default_for_bl, required, sort_order,
               active, version, created_by, created_at, updated_at`,
    [
      input.termCode.trim(),
      category,
      input.title.trim(),
      input.bodyTemplate,
      appliesTo,
      input.defaultForBl ?? [],
      input.required ?? false,
      input.sortOrder ?? 100,
      input.active ?? true,
      input.createdBy
    ]
  )

  return mapTerm(rows[0])
}

interface UpdateTermInput {
  title?: string
  bodyTemplate?: string
  category?: TermCategory
  appliesToModel?: QuotationPricingModel | null
  defaultForBl?: string[]
  required?: boolean
  sortOrder?: number
  active?: boolean
}

export const updateTerm = async (
  termId: string,
  input: UpdateTermInput
): Promise<Term | null> => {
  const updates: string[] = []
  const values: unknown[] = [termId]
  let idx = 1

  const push = (column: string, value: unknown) => {
    idx += 1
    updates.push(`${column} = $${idx}`)
    values.push(value)
  }

  if (input.title !== undefined) push('title', input.title)
  if (input.bodyTemplate !== undefined) push('body_template', input.bodyTemplate)
  if (input.category !== undefined) push('category', validateCategory(input.category))
  if (input.appliesToModel !== undefined) push('applies_to_model', validateAppliesTo(input.appliesToModel))
  if (input.defaultForBl !== undefined) push('default_for_bl', input.defaultForBl)
  if (input.required !== undefined) push('required', input.required)
  if (input.sortOrder !== undefined) push('sort_order', input.sortOrder)
  if (input.active !== undefined) push('active', input.active)

  if (updates.length === 0) return null

  updates.push('updated_at = CURRENT_TIMESTAMP')
  updates.push('version = version + 1')

  const rows = await query<TermRow>(
    `UPDATE greenhouse_commercial.terms_library
        SET ${updates.join(', ')}
        WHERE term_id = $1
        RETURNING term_id, term_code, category, title, body_template,
                  applies_to_model, default_for_bl, required, sort_order,
                  active, version, created_by, created_at, updated_at`,
    values
  )

  return rows[0] ? mapTerm(rows[0]) : null
}

export const deactivateTerm = async (termId: string): Promise<boolean> => {
  const rows = await query<{ term_id: string }>(
    `UPDATE greenhouse_commercial.terms_library
        SET active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE term_id = $1
        RETURNING term_id`,
    [termId]
  )

  return rows.length > 0
}

// ── Variable resolution ────────────────────────────────────────

export interface TermVariableContext {
  paymentTermsDays?: number | null
  contractDurationMonths?: number | null
  billingFrequency?: string | null
  validUntil?: string | null
  organizationName?: string | null
  escalationPct?: number | null
}

const formatBillingFrequency = (value: string | null | undefined): string => {
  switch (value) {
    case 'monthly':
      return 'mensual'
    case 'milestone':
      return 'por hito'
    case 'one_time':
      return 'único'
    default:
      return value ?? ''
  }
}

const formatDate = (value: string | null | undefined): string => {
  if (!value) return ''
  const dateOnly = value.slice(0, 10)
  const [y, m, d] = dateOnly.split('-')

  if (!y || !m || !d) return value

  return `${d}/${m}/${y}`
}

export const resolveTermVariables = (
  template: string,
  context: TermVariableContext
): string => {
  const values: Record<string, string> = {
    payment_terms_days: context.paymentTermsDays != null ? String(context.paymentTermsDays) : '',
    contract_duration: context.contractDurationMonths != null ? `${context.contractDurationMonths} meses` : '',
    billing_frequency: formatBillingFrequency(context.billingFrequency),
    valid_until: formatDate(context.validUntil),
    organization_name: context.organizationName ?? '',
    escalation_pct: context.escalationPct != null ? `${context.escalationPct}%` : ''
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    return key in values ? values[key] : match
  })
}

// ── Quotation terms ────────────────────────────────────────────

export const listQuotationTerms = async (quotationId: string): Promise<QuotationTerm[]> => {
  const rows = await query<QuotationTermRow>(
    `SELECT qt.quotation_term_id, qt.quotation_id, qt.term_id,
            tl.term_code, tl.title, tl.category, tl.required,
            qt.body_resolved, qt.sort_order, qt.included,
            qt.created_at, qt.updated_at
       FROM greenhouse_commercial.quotation_terms qt
       JOIN greenhouse_commercial.terms_library tl USING (term_id)
       WHERE qt.quotation_id = $1
       ORDER BY qt.sort_order ASC, tl.title ASC`,
    [quotationId]
  )

  return rows.map(mapQuotationTerm)
}

interface QuotationContext {
  quotationId: string
  businessLineCode: string | null
  pricingModel: QuotationPricingModel | null
  variables: TermVariableContext
}

export const seedQuotationDefaultTerms = async (
  input: QuotationContext,
  client?: QueryableClient
): Promise<number> => {
  const doInsert = async (c: QueryableClient | undefined) => {
    const run = async <R extends Record<string, unknown>>(
      text: string,
      values: unknown[]
    ): Promise<R[]> => {
      if (c) {
        const result = (await c.query(text, values)) as unknown as { rows: R[] }

        return result.rows
      }

      return query<R>(text, values)
    }

    const terms = await run<TermRow>(
      `SELECT term_id, term_code, category, title, body_template,
              applies_to_model, default_for_bl, required, sort_order,
              active, version, created_by, created_at, updated_at
         FROM greenhouse_commercial.terms_library
         WHERE active = TRUE
           AND (applies_to_model IS NULL OR applies_to_model = $1)
           AND (
             required = TRUE
             OR cardinality(default_for_bl) = 0
             OR $2::text = ANY(default_for_bl)
           )
         ORDER BY sort_order ASC`,
      [input.pricingModel, input.businessLineCode]
    )

    let inserted = 0

    for (const term of terms) {
      const resolved = resolveTermVariables(term.body_template, input.variables)

      const rows = await run<{ quotation_term_id: string }>(
        `INSERT INTO greenhouse_commercial.quotation_terms (
           quotation_id, term_id, body_resolved, sort_order, included
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (quotation_id, term_id) DO NOTHING
         RETURNING quotation_term_id`,
        [input.quotationId, term.term_id, resolved, term.sort_order, true]
      )

      if (rows.length > 0) inserted += 1
    }

    return inserted
  }

  if (client) {
    return doInsert(client)
  }

  return withTransaction(async txClient => doInsert(txClient as unknown as QueryableClient))
}

export interface QuotationTermUpsertInput {
  termId: string
  included?: boolean
  sortOrder?: number
  bodyResolvedOverride?: string | null
}

export interface UpsertQuotationTermsParams {
  quotationId: string
  variables: TermVariableContext
  terms: QuotationTermUpsertInput[]
}

export const upsertQuotationTerms = async (
  params: UpsertQuotationTermsParams
): Promise<QuotationTerm[]> => {
  return withTransaction(async client => {
    for (const item of params.terms) {
      const templateRows = await client.query<{
        body_template: string
        sort_order: number
        required: boolean
      }>(
        `SELECT body_template, sort_order, required
           FROM greenhouse_commercial.terms_library
           WHERE term_id = $1 AND active = TRUE`,
        [item.termId]
      )

      const template = templateRows.rows[0]

      if (!template) continue

      const resolved =
        item.bodyResolvedOverride ?? resolveTermVariables(template.body_template, params.variables)

      const included = template.required ? true : item.included ?? true
      const sortOrder = item.sortOrder ?? template.sort_order

      await client.query(
        `INSERT INTO greenhouse_commercial.quotation_terms (
           quotation_id, term_id, body_resolved, sort_order, included
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (quotation_id, term_id) DO UPDATE SET
           body_resolved = EXCLUDED.body_resolved,
           sort_order = EXCLUDED.sort_order,
           included = EXCLUDED.included,
           updated_at = CURRENT_TIMESTAMP`,
        [params.quotationId, item.termId, resolved, sortOrder, included]
      )
    }

    const rows = await client.query<QuotationTermRow>(
      `SELECT qt.quotation_term_id, qt.quotation_id, qt.term_id,
              tl.term_code, tl.title, tl.category, tl.required,
              qt.body_resolved, qt.sort_order, qt.included,
              qt.created_at, qt.updated_at
         FROM greenhouse_commercial.quotation_terms qt
         JOIN greenhouse_commercial.terms_library tl USING (term_id)
         WHERE qt.quotation_id = $1
         ORDER BY qt.sort_order ASC`,
      [params.quotationId]
    )

    return rows.rows.map(mapQuotationTerm)
  })
}
