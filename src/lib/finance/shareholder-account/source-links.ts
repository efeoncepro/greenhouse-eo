import 'server-only'

import { query } from '@/lib/db'
import {
  FinanceValidationError,
  normalizeString,
  roundCurrency,
  toDateString,
  toNumber
} from '@/lib/finance/shared'

export const SHAREHOLDER_MOVEMENT_SOURCE_TYPES = [
  'manual',
  'expense',
  'income',
  'expense_payment',
  'income_payment',
  'settlement_group'
] as const

export type ShareholderMovementSourceType = (typeof SHAREHOLDER_MOVEMENT_SOURCE_TYPES)[number]
export type ShareholderMovementLinkedPaymentType = 'income_payment' | 'expense_payment'

export type ShareholderMovementTenantScope = {
  tenantType: 'client' | 'efeonce_internal'
  clientId?: string | null
  organizationId?: string | null
  spaceId?: string | null
}

type SourceRow = {
  source_type: string
  source_id: string
  source_label: string | null
  source_subtitle: string | null
  source_status: string | null
  source_amount: unknown
  source_currency: string | null
  source_date: string | Date | null
  source_href: string | null
  linked_expense_id: string | null
  linked_income_id: string | null
  linked_payment_type: string | null
  linked_payment_id: string | null
  source_settlement_group_id: string | null
}

export type ShareholderMovementSourceSummary = {
  sourceType: ShareholderMovementSourceType
  sourceId: string
  label: string
  subtitle: string | null
  status: string | null
  amount: number | null
  currency: string | null
  date: string | null
  href: string | null
  linkedExpenseId: string | null
  linkedIncomeId: string | null
  linkedPaymentType: ShareholderMovementLinkedPaymentType | null
  linkedPaymentId: string | null
  sourceSettlementGroupId: string | null
}

export type ShareholderMovementResolvedSource = ShareholderMovementSourceSummary & {
  sourceType: Exclude<ShareholderMovementSourceType, 'manual'>
}

const buildSourceKey = (sourceType: ShareholderMovementSourceType, sourceId: string) =>
  `${sourceType}:${sourceId}`

export const inferShareholderMovementSource = ({
  sourceType,
  sourceId,
  linkedExpenseId,
  linkedIncomeId,
  linkedPaymentType,
  linkedPaymentId,
  settlementGroupId
}: {
  sourceType?: string | null
  sourceId?: string | null
  linkedExpenseId?: string | null
  linkedIncomeId?: string | null
  linkedPaymentType?: string | null
  linkedPaymentId?: string | null
  settlementGroupId?: string | null
}) => {
  const normalizedSourceType = normalizeString(sourceType) as ShareholderMovementSourceType
  const normalizedSourceId = normalizeString(sourceId) || null

  if (
    normalizedSourceType
    && SHAREHOLDER_MOVEMENT_SOURCE_TYPES.includes(normalizedSourceType)
    && (normalizedSourceType === 'manual' || normalizedSourceId)
  ) {
    return {
      sourceType: normalizedSourceType,
      sourceId: normalizedSourceId
    }
  }

  const normalizedExpenseId = normalizeString(linkedExpenseId) || null
  const normalizedIncomeId = normalizeString(linkedIncomeId) || null
  const normalizedPaymentType = normalizeString(linkedPaymentType) as ShareholderMovementLinkedPaymentType | null
  const normalizedPaymentId = normalizeString(linkedPaymentId) || null
  const normalizedSettlementGroupId = normalizeString(settlementGroupId) || null

  if (normalizedPaymentType && normalizedPaymentId) {
    return {
      sourceType: normalizedPaymentType,
      sourceId: normalizedPaymentId
    }
  }

  if (normalizedExpenseId) {
    return {
      sourceType: 'expense' as const,
      sourceId: normalizedExpenseId
    }
  }

  if (normalizedIncomeId) {
    return {
      sourceType: 'income' as const,
      sourceId: normalizedIncomeId
    }
  }

  if (normalizedSettlementGroupId) {
    return {
      sourceType: 'settlement_group' as const,
      sourceId: normalizedSettlementGroupId
    }
  }

  return {
    sourceType: 'manual' as const,
    sourceId: null
  }
}

const mapSourceRow = (row: SourceRow): ShareholderMovementSourceSummary => ({
  sourceType: normalizeString(row.source_type) as ShareholderMovementSourceType,
  sourceId: normalizeString(row.source_id),
  label: normalizeString(row.source_label || row.source_id),
  subtitle: normalizeString(row.source_subtitle) || null,
  status: normalizeString(row.source_status) || null,
  amount: row.source_amount != null ? roundCurrency(toNumber(row.source_amount)) : null,
  currency: normalizeString(row.source_currency) || null,
  date: toDateString(row.source_date),
  href: normalizeString(row.source_href) || null,
  linkedExpenseId: normalizeString(row.linked_expense_id) || null,
  linkedIncomeId: normalizeString(row.linked_income_id) || null,
  linkedPaymentType: normalizeString(row.linked_payment_type) as ShareholderMovementLinkedPaymentType | null,
  linkedPaymentId: normalizeString(row.linked_payment_id) || null,
  sourceSettlementGroupId: normalizeString(row.source_settlement_group_id) || null
})

const pushParam = (params: unknown[], value: unknown) => {
  params.push(value)

  return `$${params.length}`
}

const appendExpenseScope = (scope: ShareholderMovementTenantScope, params: unknown[]) => {
  if (scope.spaceId) {
    return `e.space_id = ${pushParam(params, scope.spaceId)}`
  }

  if (scope.tenantType === 'client' && scope.clientId) {
    return `e.client_id = ${pushParam(params, scope.clientId)}`
  }

  return 'TRUE'
}

const appendIncomeScope = (scope: ShareholderMovementTenantScope, params: unknown[]) => {
  const clauses: string[] = []

  if (scope.organizationId) {
    clauses.push(`i.organization_id = ${pushParam(params, scope.organizationId)}`)
  }

  if (scope.tenantType === 'client' && scope.clientId) {
    clauses.push(`i.client_id = ${pushParam(params, scope.clientId)}`)
  }

  return clauses.length > 0 ? `(${clauses.join(' OR ')})` : 'TRUE'
}

const appendPaymentScope = (
  paymentType: ShareholderMovementLinkedPaymentType,
  scope: ShareholderMovementTenantScope,
  params: unknown[]
) => (paymentType === 'expense_payment' ? appendExpenseScope(scope, params) : appendIncomeScope(scope, params))

const appendSearchClause = (columns: string[], search: string, params: unknown[]) => {
  const term = `%${search.toLowerCase()}%`
  const placeholder = pushParam(params, term)

  return `(${columns.map(column => `LOWER(COALESCE(${column}, '')) LIKE ${placeholder}`).join(' OR ')})`
}

const selectExpenseSources = async ({
  scope,
  ids,
  search
}: {
  scope: ShareholderMovementTenantScope
  ids?: string[]
  search?: string
}) => {
  const params: unknown[] = []
  const conditions = [appendExpenseScope(scope, params)]

  if (ids && ids.length > 0) {
    conditions.push(`e.expense_id = ANY(${pushParam(params, ids)}::text[])`)
  }

  if (search) {
    conditions.push(
      appendSearchClause(['e.expense_id', 'e.description', 'e.supplier_name', 'e.document_number'], search, params)
    )
  }

  const limitClause = search ? 'LIMIT 20' : ''

  return query<SourceRow>(
    `
      SELECT
        'expense' AS source_type,
        e.expense_id AS source_id,
        COALESCE(NULLIF(e.document_number, ''), e.expense_id) AS source_label,
        COALESCE(NULLIF(e.description, ''), NULLIF(e.supplier_name, ''), 'Documento de compra') AS source_subtitle,
        e.payment_status AS source_status,
        e.total_amount AS source_amount,
        e.currency AS source_currency,
        COALESCE(e.document_date, e.due_date, e.payment_date) AS source_date,
        '/finance/expenses/' || e.expense_id AS source_href,
        e.expense_id AS linked_expense_id,
        NULL::text AS linked_income_id,
        NULL::text AS linked_payment_type,
        NULL::text AS linked_payment_id,
        NULL::text AS source_settlement_group_id
      FROM greenhouse_finance.expenses e
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(e.document_date, e.due_date, e.payment_date) DESC NULLS LAST, e.updated_at DESC
      ${limitClause}
    `,
    params
  )
}

const selectIncomeSources = async ({
  scope,
  ids,
  search
}: {
  scope: ShareholderMovementTenantScope
  ids?: string[]
  search?: string
}) => {
  const params: unknown[] = []
  const conditions = [appendIncomeScope(scope, params)]

  if (ids && ids.length > 0) {
    conditions.push(`i.income_id = ANY(${pushParam(params, ids)}::text[])`)
  }

  if (search) {
    conditions.push(
      appendSearchClause(['i.income_id', 'i.invoice_number', 'i.client_name', 'i.description'], search, params)
    )
  }

  const limitClause = search ? 'LIMIT 20' : ''

  return query<SourceRow>(
    `
      SELECT
        'income' AS source_type,
        i.income_id AS source_id,
        COALESCE(NULLIF(i.invoice_number, ''), i.income_id) AS source_label,
        COALESCE(NULLIF(i.client_name, ''), NULLIF(i.description, ''), 'Documento de venta') AS source_subtitle,
        i.payment_status AS source_status,
        i.total_amount AS source_amount,
        i.currency AS source_currency,
        COALESCE(i.invoice_date, i.due_date) AS source_date,
        '/finance/income/' || i.income_id AS source_href,
        NULL::text AS linked_expense_id,
        i.income_id AS linked_income_id,
        NULL::text AS linked_payment_type,
        NULL::text AS linked_payment_id,
        NULL::text AS source_settlement_group_id
      FROM greenhouse_finance.income i
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(i.invoice_date, i.due_date) DESC NULLS LAST, i.updated_at DESC
      ${limitClause}
    `,
    params
  )
}

const selectPaymentSources = async ({
  paymentType,
  scope,
  ids,
  search
}: {
  paymentType: ShareholderMovementLinkedPaymentType
  scope: ShareholderMovementTenantScope
  ids?: string[]
  search?: string
}) => {
  const params: unknown[] = []
  const paymentAlias = paymentType === 'expense_payment' ? 'ep' : 'ip'

  const paymentTable = paymentType === 'expense_payment'
    ? 'greenhouse_finance.expense_payments'
    : 'greenhouse_finance.income_payments'

  const documentTable = paymentType === 'expense_payment'
    ? 'greenhouse_finance.expenses'
    : 'greenhouse_finance.income'

  const documentAlias = paymentType === 'expense_payment' ? 'e' : 'i'
  const documentIdColumn = paymentType === 'expense_payment' ? 'expense_id' : 'income_id'
  const documentHref = paymentType === 'expense_payment' ? '/finance/expenses/' : '/finance/income/'
  const scopeClause = appendPaymentScope(paymentType, scope, params)
  const conditions = [scopeClause]

  if (ids && ids.length > 0) {
    conditions.push(`${paymentAlias}.payment_id = ANY(${pushParam(params, ids)}::text[])`)
  }

  if (search) {
    conditions.push(
      appendSearchClause(
        [
          `${paymentAlias}.payment_id`,
          `${paymentAlias}.reference`,
          `${documentAlias}.${documentIdColumn}`,
          paymentType === 'expense_payment' ? `${documentAlias}.description` : `${documentAlias}.client_name`
        ],
        search,
        params
      )
    )
  }

  const limitClause = search ? 'LIMIT 20' : ''

  return query<SourceRow>(
    `
      SELECT
        '${paymentType}' AS source_type,
        ${paymentAlias}.payment_id AS source_id,
        COALESCE(NULLIF(${paymentAlias}.reference, ''), ${paymentAlias}.payment_id) AS source_label,
        COALESCE(
          NULLIF(${documentAlias}.${paymentType === 'expense_payment' ? 'document_number' : 'invoice_number'}, ''),
          ${documentAlias}.${documentIdColumn}
        ) AS source_subtitle,
        CASE
          WHEN ${paymentAlias}.is_reconciled THEN 'reconciled'
          ELSE ${documentAlias}.payment_status
        END AS source_status,
        ${paymentAlias}.amount AS source_amount,
        COALESCE(${paymentAlias}.currency, ${documentAlias}.currency) AS source_currency,
        ${paymentAlias}.payment_date AS source_date,
        '${documentHref}' || ${documentAlias}.${documentIdColumn} AS source_href,
        ${paymentType === 'expense_payment' ? `${documentAlias}.expense_id` : 'NULL::text'} AS linked_expense_id,
        ${paymentType === 'income_payment' ? `${documentAlias}.income_id` : 'NULL::text'} AS linked_income_id,
        '${paymentType}' AS linked_payment_type,
        ${paymentAlias}.payment_id AS linked_payment_id,
        ${paymentAlias}.settlement_group_id AS source_settlement_group_id
      FROM ${paymentTable} ${paymentAlias}
      INNER JOIN ${documentTable} ${documentAlias}
        ON ${documentAlias}.${documentIdColumn} = ${paymentAlias}.${documentIdColumn}
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${paymentAlias}.payment_date DESC NULLS LAST, ${paymentAlias}.created_at DESC
      ${limitClause}
    `,
    params
  )
}

const selectSettlementSources = async ({
  scope,
  ids
}: {
  scope: ShareholderMovementTenantScope
  ids: string[]
}) => {
  const params: unknown[] = [ids]

  const scopeClause = `
    CASE
      WHEN sg.source_payment_type = 'expense_payment' THEN ${appendExpenseScope(scope, params)}
      WHEN sg.source_payment_type = 'income_payment' THEN ${appendIncomeScope(scope, params)}
      ELSE TRUE
    END
  `

  return query<SourceRow>(
    `
      SELECT
        'settlement_group' AS source_type,
        sg.settlement_group_id AS source_id,
        sg.settlement_group_id AS source_label,
        COALESCE(
          NULLIF(ip.reference, ''),
          NULLIF(ep.reference, ''),
          NULLIF(i.invoice_number, ''),
          NULLIF(e.document_number, ''),
          'Liquidación'
        ) AS source_subtitle,
        sg.provider_status AS source_status,
        COALESCE(ip.amount, ep.amount) AS source_amount,
        COALESCE(ip.currency, ep.currency, i.currency, e.currency) AS source_currency,
        COALESCE(ip.payment_date, ep.payment_date) AS source_date,
        CASE
          WHEN sg.source_payment_type = 'income_payment' AND i.income_id IS NOT NULL THEN '/finance/income/' || i.income_id
          WHEN sg.source_payment_type = 'expense_payment' AND e.expense_id IS NOT NULL THEN '/finance/expenses/' || e.expense_id
          ELSE NULL
        END AS source_href,
        e.expense_id AS linked_expense_id,
        i.income_id AS linked_income_id,
        sg.source_payment_type AS linked_payment_type,
        sg.source_payment_id AS linked_payment_id,
        sg.settlement_group_id AS source_settlement_group_id
      FROM greenhouse_finance.settlement_groups sg
      LEFT JOIN greenhouse_finance.income_payments ip
        ON sg.source_payment_type = 'income_payment'
       AND sg.source_payment_id = ip.payment_id
      LEFT JOIN greenhouse_finance.income i
        ON i.income_id = ip.income_id
      LEFT JOIN greenhouse_finance.expense_payments ep
        ON sg.source_payment_type = 'expense_payment'
       AND sg.source_payment_id = ep.payment_id
      LEFT JOIN greenhouse_finance.expenses e
        ON e.expense_id = ep.expense_id
      WHERE sg.settlement_group_id = ANY($1::text[])
        AND ${scopeClause}
    `,
    params
  )
}

export const searchShareholderMovementSources = async ({
  scope,
  sourceType,
  search
}: {
  scope: ShareholderMovementTenantScope
  sourceType: Exclude<ShareholderMovementSourceType, 'manual' | 'settlement_group'>
  search: string
}) => {
  const normalizedSearch = normalizeString(search).toLowerCase()

  if (normalizedSearch.length < 2) {
    return []
  }

  let rows: SourceRow[] = []

  if (sourceType === 'expense') {
    rows = await selectExpenseSources({ scope, search: normalizedSearch })
  } else if (sourceType === 'income') {
    rows = await selectIncomeSources({ scope, search: normalizedSearch })
  } else if (sourceType === 'income_payment' || sourceType === 'expense_payment') {
    rows = await selectPaymentSources({ paymentType: sourceType, scope, search: normalizedSearch })
  }

  return rows.map(mapSourceRow)
}

export const resolveShareholderMovementSource = async ({
  scope,
  sourceType,
  sourceId
}: {
  scope: ShareholderMovementTenantScope
  sourceType: Exclude<ShareholderMovementSourceType, 'manual'>
  sourceId: string
}): Promise<ShareholderMovementResolvedSource> => {
  const normalizedSourceId = normalizeString(sourceId)

  if (!normalizedSourceId) {
    throw new FinanceValidationError('sourceId is required.', 422)
  }

  const sourceMap = await getShareholderMovementSourceSummaries({
    scope,
    refs: [{ sourceType, sourceId: normalizedSourceId }]
  })

  const resolved = sourceMap.get(buildSourceKey(sourceType, normalizedSourceId))

  if (!resolved) {
    throw new FinanceValidationError(`Source "${normalizedSourceId}" not found for type "${sourceType}".`, 404)
  }

  return resolved as ShareholderMovementResolvedSource
}

export const getShareholderMovementSourceSummaries = async ({
  scope,
  refs
}: {
  scope: ShareholderMovementTenantScope
  refs: Array<{ sourceType: ShareholderMovementSourceType; sourceId: string | null }>
}) => {
  const expenseIds = new Set<string>()
  const incomeIds = new Set<string>()
  const incomePaymentIds = new Set<string>()
  const expensePaymentIds = new Set<string>()
  const settlementGroupIds = new Set<string>()

  for (const ref of refs) {
    const sourceId = normalizeString(ref.sourceId)

    if (!sourceId) {
      continue
    }

    if (ref.sourceType === 'expense') expenseIds.add(sourceId)
    if (ref.sourceType === 'income') incomeIds.add(sourceId)
    if (ref.sourceType === 'income_payment') incomePaymentIds.add(sourceId)
    if (ref.sourceType === 'expense_payment') expensePaymentIds.add(sourceId)
    if (ref.sourceType === 'settlement_group') settlementGroupIds.add(sourceId)
  }

  const rows: SourceRow[] = []

  if (expenseIds.size > 0) {
    rows.push(...await selectExpenseSources({ scope, ids: [...expenseIds] }))
  }

  if (incomeIds.size > 0) {
    rows.push(...await selectIncomeSources({ scope, ids: [...incomeIds] }))
  }

  if (incomePaymentIds.size > 0) {
    rows.push(...await selectPaymentSources({ paymentType: 'income_payment', scope, ids: [...incomePaymentIds] }))
  }

  if (expensePaymentIds.size > 0) {
    rows.push(...await selectPaymentSources({ paymentType: 'expense_payment', scope, ids: [...expensePaymentIds] }))
  }

  if (settlementGroupIds.size > 0) {
    rows.push(...await selectSettlementSources({ scope, ids: [...settlementGroupIds] }))
  }

  return new Map(rows.map(row => {
    const summary = mapSourceRow(row)

    return [buildSourceKey(summary.sourceType, summary.sourceId), summary]
  }))
}
