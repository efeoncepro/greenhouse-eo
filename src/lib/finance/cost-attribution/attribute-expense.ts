import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

/**
 * TASK-705 — Expense attribution canonical helper.
 *
 * Toma un expense_id, busca la primera regla activa de
 * `expense_attribution_rules` que matchee (por supplier_name, reference,
 * description, currency), aplica la estrategia de atribución y persiste
 * el resultado en `expenses` + un audit log en `expense_attribution_audit`.
 *
 * Reusable para cualquier cuenta — TC, banco, fintech, CCA — porque la
 * regla matchea por contenido del expense, no por cuenta.
 */

export type AllocationStrategy =
  | 'single_client'
  | 'single_member'
  | 'team_split_equal'
  | 'all_active_members'
  | 'overhead_internal'
  | 'business_line'
  | 'manual_required'

export type CostCategory =
  | 'operational'
  | 'overhead'
  | 'direct_client'
  | 'direct_member'
  | 'tax'
  | 'investment'

export interface AttributionRuleRow {
  rule_id: string
  rule_priority: number
  is_active: boolean
  match_supplier_pattern: string | null
  match_reference_pattern: string | null
  match_description_pattern: string | null
  match_currency: string | null
  tool_catalog_id: string | null
  cost_category: CostCategory
  cost_is_direct: boolean
  allocation_strategy: AllocationStrategy
  default_allocated_client_id: string | null
  default_member_ids: string[] | null
  default_service_line: string | null
  default_direct_overhead_kind: string | null
  default_business_line: string | null
  rule_name: string
  rule_description: string | null
}

export interface ExpenseSubject {
  expense_id: string
  supplier_name: string | null
  description: string | null
  payment_reference: string | null
  currency: string | null
  total_amount: string | number
  cost_category: CostCategory | null
  cost_is_direct: boolean | null
  allocated_client_id: string | null
  service_line: string | null
  tool_catalog_id: string | null
  direct_overhead_kind: string | null
  direct_overhead_member_id: string | null
}

export interface AttributionSplit {
  memberId: string | null
  clientId: string | null
  amountClp: number
  share: number
}

export interface AttributionResult {
  expenseId: string
  ruleId: string | null
  ruleName: string | null
  matched: boolean
  applied: {
    costCategory: CostCategory
    costIsDirect: boolean
    allocatedClientId: string | null
    serviceLine: string | null
    toolCatalogId: string | null
    directOverheadKind: string | null
    directOverheadMemberId: string | null
  }
  splits: AttributionSplit[]
}

const buildAuditId = (expenseId: string): string =>
  `aud-${expenseId.slice(0, 32)}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`

const matchesPattern = (value: string | null | undefined, pattern: string | null): boolean => {
  if (!pattern) return true
  if (!value) return false

  // SQL LIKE-style: % is wildcard. Convert to regex case-insensitive.
  const regex = new RegExp(`^${pattern.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i')

  return regex.test(value)
}

const ruleMatches = (rule: AttributionRuleRow, subject: ExpenseSubject): boolean => {
  if (!matchesPattern(subject.supplier_name, rule.match_supplier_pattern)) return false
  if (!matchesPattern(subject.payment_reference, rule.match_reference_pattern)) return false
  if (!matchesPattern(subject.description, rule.match_description_pattern)) return false
  if (rule.match_currency && subject.currency !== rule.match_currency) return false

  return true
}

const computeSplits = async (
  client: PoolClient,
  rule: AttributionRuleRow,
  totalAmount: number
): Promise<AttributionSplit[]> => {
  switch (rule.allocation_strategy) {
    case 'single_client':
      if (!rule.default_allocated_client_id) return []

      return [{
        memberId: null,
        clientId: rule.default_allocated_client_id,
        amountClp: totalAmount,
        share: 1
      }]

    case 'single_member':
      if (!rule.default_member_ids || rule.default_member_ids.length === 0) return []

      return [{
        memberId: rule.default_member_ids[0],
        clientId: rule.default_allocated_client_id,
        amountClp: totalAmount,
        share: 1
      }]

    case 'team_split_equal': {
      if (!rule.default_member_ids || rule.default_member_ids.length === 0) return []

      const n = rule.default_member_ids.length
      const share = 1 / n
      const amountPer = Math.round(totalAmount * share * 100) / 100

      return rule.default_member_ids.map(memberId => ({
        memberId,
        clientId: null,
        amountClp: amountPer,
        share
      }))
    }

    case 'all_active_members': {
      const r = await client.query<{ member_id: string }>(
        `SELECT member_id FROM greenhouse_core.members WHERE active = TRUE ORDER BY member_id`
      )

      const ids = r.rows.map(row => row.member_id)

      if (ids.length === 0) return []

      const share = 1 / ids.length
      const amountPer = Math.round(totalAmount * share * 100) / 100

      return ids.map(memberId => ({
        memberId,
        clientId: null,
        amountClp: amountPer,
        share
      }))
    }

    case 'overhead_internal':
    case 'business_line':
    case 'manual_required':
    default:
      return []
  }
}

const applyAttribution = async (
  client: PoolClient,
  subject: ExpenseSubject,
  rule: AttributionRuleRow | null,
  resolvedByUserId: string | null
): Promise<AttributionResult> => {
  const totalAmount = Number(subject.total_amount)

  // Compute applied fields
  const appliedCostCategory: CostCategory = rule?.cost_category ?? (subject.cost_category ?? 'operational')
  const appliedCostIsDirect = rule?.cost_is_direct ?? (subject.cost_is_direct ?? false)
  const appliedToolCatalogId = rule?.tool_catalog_id ?? subject.tool_catalog_id
  const appliedServiceLine = rule?.default_service_line ?? subject.service_line
  const appliedDirectOverheadKind = rule?.default_direct_overhead_kind ?? subject.direct_overhead_kind

  let appliedAllocatedClientId = rule?.default_allocated_client_id ?? subject.allocated_client_id
  let appliedDirectOverheadMemberId = subject.direct_overhead_member_id

  // Resolve splits + pick canonical single member/client when applicable
  const splits = rule ? await computeSplits(client, rule, totalAmount) : []

  if (rule?.allocation_strategy === 'single_member' && splits.length > 0) {
    appliedDirectOverheadMemberId = splits[0].memberId
  }

  if (rule?.allocation_strategy === 'single_client' && splits.length > 0) {
    appliedAllocatedClientId = splits[0].clientId
  }

  // Determine direct_overhead_scope for canonical column (kept simple)
  const directOverheadScope = appliedDirectOverheadKind
    ? (appliedDirectOverheadMemberId ? 'member' : 'team')
    : 'none'

  // Persist on expense
  await client.query(
    `UPDATE greenhouse_finance.expenses SET
       cost_category = $1,
       cost_is_direct = $2,
       allocated_client_id = $3,
       service_line = $4,
       tool_catalog_id = $5,
       direct_overhead_scope = $6,
       direct_overhead_kind = $7,
       direct_overhead_member_id = $8,
       updated_at = NOW()
     WHERE expense_id = $9`,
    [
      appliedCostCategory,
      appliedCostIsDirect,
      appliedAllocatedClientId,
      appliedServiceLine,
      appliedToolCatalogId,
      directOverheadScope,
      appliedDirectOverheadKind,
      appliedDirectOverheadMemberId,
      subject.expense_id
    ]
  )

  // Audit log
  await client.query(
    `INSERT INTO greenhouse_finance.expense_attribution_audit (
       audit_id, expense_id, rule_id, resolved_by_user_id,
       previous_cost_category, previous_cost_is_direct, previous_allocated_client_id,
       previous_service_line, previous_tool_catalog_id,
       previous_direct_overhead_kind, previous_direct_overhead_member_id,
       applied_cost_category, applied_cost_is_direct, applied_allocated_client_id,
       applied_service_line, applied_tool_catalog_id,
       applied_direct_overhead_kind, applied_direct_overhead_member_id,
       splits_json
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7,
       $8, $9,
       $10, $11,
       $12, $13, $14,
       $15, $16,
       $17, $18,
       $19::jsonb
     )`,
    [
      buildAuditId(subject.expense_id), subject.expense_id, rule?.rule_id ?? null, resolvedByUserId,
      subject.cost_category, subject.cost_is_direct, subject.allocated_client_id,
      subject.service_line, subject.tool_catalog_id,
      subject.direct_overhead_kind, subject.direct_overhead_member_id,
      appliedCostCategory, appliedCostIsDirect, appliedAllocatedClientId,
      appliedServiceLine, appliedToolCatalogId,
      appliedDirectOverheadKind, appliedDirectOverheadMemberId,
      JSON.stringify(splits)
    ]
  )

  return {
    expenseId: subject.expense_id,
    ruleId: rule?.rule_id ?? null,
    ruleName: rule?.rule_name ?? null,
    matched: rule != null,
    applied: {
      costCategory: appliedCostCategory,
      costIsDirect: appliedCostIsDirect,
      allocatedClientId: appliedAllocatedClientId,
      serviceLine: appliedServiceLine,
      toolCatalogId: appliedToolCatalogId,
      directOverheadKind: appliedDirectOverheadKind,
      directOverheadMemberId: appliedDirectOverheadMemberId
    },
    splits
  }
}

export const attributeExpense = async (
  expenseId: string,
  resolvedByUserId: string | null = null
): Promise<AttributionResult> => {
  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    const ex = await client.query<ExpenseSubject>(
      `SELECT expense_id, supplier_name, description, payment_reference, currency,
              total_amount::text AS total_amount,
              cost_category, cost_is_direct, allocated_client_id, service_line,
              tool_catalog_id, direct_overhead_kind, direct_overhead_member_id
       FROM greenhouse_finance.expenses
       WHERE expense_id = $1`,
      [expenseId]
    )

    if (ex.rows.length === 0) {
      throw new Error(`Expense ${expenseId} not found`)
    }

    const subject = ex.rows[0]

    const rules = await client.query<AttributionRuleRow>(
      `SELECT rule_id, rule_priority, is_active,
              match_supplier_pattern, match_reference_pattern, match_description_pattern, match_currency,
              tool_catalog_id, cost_category, cost_is_direct, allocation_strategy,
              default_allocated_client_id, default_member_ids, default_service_line,
              default_direct_overhead_kind, default_business_line,
              rule_name, rule_description
       FROM greenhouse_finance.expense_attribution_rules
       WHERE is_active = TRUE
       ORDER BY rule_priority DESC, rule_id ASC`
    )

    const matched = rules.rows.find(rule => ruleMatches(rule, subject)) ?? null

    return applyAttribution(client, subject, matched, resolvedByUserId)
  })
}

export const attributeExpensesByDateRange = async (
  startDate: string,
  endDate: string,
  resolvedByUserId: string | null = null
): Promise<{ total: number; matched: number; unmatched: number; results: AttributionResult[] }> => {
  const expenseIds = await runGreenhousePostgresQuery<{ expense_id: string }>(
    `SELECT expense_id FROM greenhouse_finance.expenses
     WHERE payment_date BETWEEN $1::date AND $2::date
     ORDER BY payment_date ASC`,
    [startDate, endDate]
  )

  const results: AttributionResult[] = []
  let matched = 0
  let unmatched = 0

  for (const { expense_id } of expenseIds) {
    try {
      const r = await attributeExpense(expense_id, resolvedByUserId)

      results.push(r)

      if (r.matched) matched++
      else unmatched++
    } catch {
      unmatched++
    }
  }

  return {
    total: expenseIds.length,
    matched,
    unmatched,
    results
  }
}
