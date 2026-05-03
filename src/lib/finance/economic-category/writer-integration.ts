import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  resolveExpenseEconomicCategory,
  resolveIncomeEconomicCategory,
  type ResolveExpenseInput,
  type ResolveIncomeInput
} from './resolver'
import type { ExpenseEconomicCategory, IncomeEconomicCategory } from './types'

/**
 * TASK-768 — Helper de integración write-time para canonical writers.
 *
 * Cualquier writer canónico que crea expenses / income debe invocar este
 * helper ANTES del INSERT para resolver `economic_category` con confidence
 * canónica (no solo el trigger PG transparente que mapea desde expense_type).
 *
 * Sinergia con TASK-765 path canónico (payment_orders → recordExpensePayment):
 * el resolver tiene acceso a member_id, supplier_id, cost_category, raw
 * description — datos que el trigger transparente NO puede usar. Resultado:
 * confidence=high para casos identity-resolved, no fallback genérico.
 *
 * Defense-in-depth: si un writer olvida invocar este helper, el trigger PG
 * `populate_economic_category_default` igual poblará la columna con un
 * default razonable (transparent map). Pero `confidence=transparent_map`
 * vs `confidence=high` es distinguible en el audit log.
 */

interface WriterClient {
  query: (text: string, params?: unknown[]) => Promise<unknown>
}

/**
 * Resuelve economic_category para un nuevo expense + persiste audit log +
 * enqueue manual queue si confidence baja. Retorna la categoría que el
 * writer debe anexar al INSERT.
 *
 * Patrón de uso desde un writer canónico:
 *
 * ```ts
 * const { category, confidence, matchedRule } =
 *   await resolveAndPersistExpenseEconomicCategory({
 *     expenseId,
 *     resolverInput: { ... },
 *     client
 *   })
 *
 * // Pass category to INSERT statement
 * await client.query('INSERT INTO greenhouse_finance.expenses (..., economic_category) VALUES (..., $N)', [..., category])
 * ```
 *
 * El trigger BEFORE INSERT respeta valores ya poblados (no sobrescribe), por
 * lo que el resolver tiene precedencia sobre el transparent map.
 */
export const resolveAndPersistExpenseEconomicCategory = async (params: {
  expenseId: string
  resolverInput: ResolveExpenseInput
  client?: WriterClient
}): Promise<{
  category: ExpenseEconomicCategory
  confidence: 'high' | 'medium' | 'low' | 'manual_required'
  matchedRule: string
}> => {
  const result = await resolveExpenseEconomicCategory(params.resolverInput)

  const evidence = JSON.stringify(result.evidence)
  const needsManualReview = result.confidence === 'low' || result.confidence === 'manual_required'

  await persistResolutionLog({
    targetKind: 'expense',
    targetId: params.expenseId,
    resolvedCategory: result.category,
    matchedRule: result.matchedRule,
    confidence: result.confidence,
    evidenceJson: evidence,
    resolvedBy: 'canonical-writer',
    client: params.client
  })

  if (needsManualReview) {
    await enqueueManualReview({
      targetKind: 'expense',
      targetId: params.expenseId,
      candidateCategory: result.category,
      candidateConfidence: result.confidence,
      candidateRule: result.matchedRule,
      candidateEvidence: evidence,
      client: params.client
    })
  }

  return {
    category: result.category,
    confidence: result.confidence,
    matchedRule: result.matchedRule
  }
}

/**
 * Mirror para income.
 */
export const resolveAndPersistIncomeEconomicCategory = async (params: {
  incomeId: string
  resolverInput: ResolveIncomeInput
  client?: WriterClient
}): Promise<{
  category: IncomeEconomicCategory
  confidence: 'high' | 'medium' | 'low' | 'manual_required'
  matchedRule: string
}> => {
  const result = await resolveIncomeEconomicCategory(params.resolverInput)

  const evidence = JSON.stringify(result.evidence)
  const needsManualReview = result.confidence === 'low' || result.confidence === 'manual_required'

  await persistResolutionLog({
    targetKind: 'income',
    targetId: params.incomeId,
    resolvedCategory: result.category,
    matchedRule: result.matchedRule,
    confidence: result.confidence,
    evidenceJson: evidence,
    resolvedBy: 'canonical-writer',
    client: params.client
  })

  if (needsManualReview) {
    await enqueueManualReview({
      targetKind: 'income',
      targetId: params.incomeId,
      candidateCategory: result.category,
      candidateConfidence: result.confidence,
      candidateRule: result.matchedRule,
      candidateEvidence: evidence,
      client: params.client
    })
  }

  return {
    category: result.category,
    confidence: result.confidence,
    matchedRule: result.matchedRule
  }
}

const persistResolutionLog = async (params: {
  targetKind: 'expense' | 'income'
  targetId: string
  resolvedCategory: string
  matchedRule: string
  confidence: string
  evidenceJson: string
  resolvedBy: string
  client?: WriterClient
}): Promise<void> => {
  const sql = `INSERT INTO greenhouse_finance.economic_category_resolution_log
       (log_id, target_kind, target_id, resolved_category, matched_rule,
        confidence, evidence_json, resolved_by, batch_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)`

  const args: unknown[] = [
    `ecr-${randomUUID()}`,
    params.targetKind,
    params.targetId,
    params.resolvedCategory,
    params.matchedRule,
    params.confidence,
    params.evidenceJson,
    params.resolvedBy
  ]

  if (params.client) {
    await params.client.query(sql, args)
  } else {
    await runGreenhousePostgresQuery(sql, args)
  }
}

const enqueueManualReview = async (params: {
  targetKind: 'expense' | 'income'
  targetId: string
  candidateCategory: string
  candidateConfidence: string
  candidateRule: string
  candidateEvidence: string
  client?: WriterClient
}): Promise<void> => {
  const sql = `INSERT INTO greenhouse_finance.economic_category_manual_queue
       (queue_id, target_kind, target_id, candidate_category,
        candidate_confidence, candidate_rule, candidate_evidence)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (target_kind, target_id) DO UPDATE SET
       candidate_category = EXCLUDED.candidate_category,
       candidate_confidence = EXCLUDED.candidate_confidence,
       candidate_rule = EXCLUDED.candidate_rule,
       candidate_evidence = EXCLUDED.candidate_evidence,
       updated_at = NOW()`

  const args: unknown[] = [
    `ecq-${randomUUID()}`,
    params.targetKind,
    params.targetId,
    params.candidateCategory,
    params.candidateConfidence,
    params.candidateRule,
    params.candidateEvidence
  ]

  if (params.client) {
    await params.client.query(sql, args)
  } else {
    await runGreenhousePostgresQuery(sql, args)
  }
}

/**
 * Re-export tipo PoolClient para que canonical writers tengan tipo correcto.
 */
export type { PoolClient }
