import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type {
  AccountSignalMatchPredicate,
  ExternalCashSignal,
  ExternalSignalResolutionOutcome,
  ResolutionAttempt
} from './types'

/**
 * TASK-708 D5 — Evaluador canónico de reglas declarativas.
 *
 * Reglas duras (sobreviven a cualquier refactor):
 *   - vacío de predicate (objeto sin claves) NUNCA matchea — protege contra
 *     reglas catch-all peligrosas. La fila SQL puede existir, pero el evaluador
 *     la rechaza con `matched=false, reason='empty_predicate'`.
 *   - una sola regla matcheante → outcome `resolved`.
 *   - dos o más matcheantes → outcome `ambiguous` (NO se elige por priority).
 *   - cero matcheantes → outcome `no_match`.
 *   - cada evaluación se persiste en `external_signal_resolution_attempts`,
 *     incluyendo reglas que fallaron (auditabilidad).
 *
 * El evaluator_version se bumpea cuando el algoritmo cambia para que el
 * audit log sea reproducible. Cualquier cambio en este archivo que afecte
 * la semántica de matching DEBE incrementar `EVALUATOR_VERSION`.
 */
export const EVALUATOR_VERSION = '1.0.0'

interface EvaluateInput {
  signal: Pick<ExternalCashSignal, 'signalId' | 'sourceSystem' | 'spaceId' | 'amount' | 'currency' | 'sourcePayload'>
  paymentMethod?: string
  bankDescription?: string
}

export interface EvaluationResult {
  outcome: ExternalSignalResolutionOutcome
  matchedRuleId: string | null
  resolutionAccountId: string | null
  attempt: ResolutionAttempt
}

type RawRuleRow = {
  rule_id: string
  source_system: string
  space_id: string | null
  match_predicate_json: AccountSignalMatchPredicate
  resolved_account_id: string
  priority: number
  is_active: boolean
  expires_at: Date | null
} & Record<string, unknown>

export const evaluateSignalAccount = async (input: EvaluateInput): Promise<EvaluationResult> => {
  const rules = await runGreenhousePostgresQuery<RawRuleRow>(
    `
      SELECT
        rule_id,
        source_system,
        space_id,
        match_predicate_json,
        resolved_account_id,
        priority,
        is_active,
        expires_at
      FROM greenhouse_finance.account_signal_matching_rules
      WHERE is_active = TRUE
        AND source_system = $1
        AND (space_id IS NULL OR space_id = $2)
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY priority DESC, rule_id ASC
    `,
    [input.signal.sourceSystem, input.signal.spaceId]
  )

  const evaluations = rules.map(rule => evaluateRule(rule, input))
  const matched = evaluations.filter(e => e.matched)

  let outcome: ExternalSignalResolutionOutcome
  let matchedRuleId: string | null = null
  let resolutionAccountId: string | null = null

  if (matched.length === 1) {
    outcome = 'resolved'
    matchedRuleId = matched[0]!.rule_id
    resolutionAccountId = matched[0]!.resolved_account_id
  } else if (matched.length >= 2) {
    outcome = 'ambiguous'
  } else {
    outcome = 'no_match'
  }

  const attemptId = `attempt-${randomUUID()}`

  const rulesEvaluated = evaluations.map(e => ({
    ruleId: e.rule_id,
    matched: e.matched,
    reason: e.reason
  }))

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_finance.external_signal_resolution_attempts (
        attempt_id,
        signal_id,
        rules_evaluated,
        matched_rule_id,
        resolution_outcome,
        resolution_account_id,
        evaluator_version
      ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
    `,
    [
      attemptId,
      input.signal.signalId,
      JSON.stringify(rulesEvaluated),
      matchedRuleId,
      outcome,
      resolutionAccountId,
      EVALUATOR_VERSION
    ]
  )

  return {
    outcome,
    matchedRuleId,
    resolutionAccountId,
    attempt: {
      attemptId,
      signalId: input.signal.signalId,
      evaluatedAt: new Date(),
      rulesEvaluated,
      matchedRuleId,
      resolutionOutcome: outcome,
      resolutionAccountId: resolutionAccountId as ResolutionAttempt['resolutionAccountId'],
      evaluatorVersion: EVALUATOR_VERSION
    }
  }
}

interface RuleEvaluation {
  rule_id: string
  resolved_account_id: string
  matched: boolean
  reason: string
}

const evaluateRule = (rule: RawRuleRow, input: EvaluateInput): RuleEvaluation => {
  const predicate = rule.match_predicate_json
  const keys = Object.keys(predicate ?? {})

  if (keys.length === 0) {
    return {
      rule_id: rule.rule_id,
      resolved_account_id: rule.resolved_account_id,
      matched: false,
      reason: 'empty_predicate'
    }
  }

  if (predicate.currency_eq && predicate.currency_eq !== input.signal.currency) {
    return {
      rule_id: rule.rule_id,
      resolved_account_id: rule.resolved_account_id,
      matched: false,
      reason: `currency_mismatch:${input.signal.currency}!=${predicate.currency_eq}`
    }
  }

  if (predicate.amount_min !== undefined && input.signal.amount < predicate.amount_min) {
    return {
      rule_id: rule.rule_id,
      resolved_account_id: rule.resolved_account_id,
      matched: false,
      reason: `amount_below_min:${input.signal.amount}<${predicate.amount_min}`
    }
  }

  if (predicate.amount_max !== undefined && input.signal.amount > predicate.amount_max) {
    return {
      rule_id: rule.rule_id,
      resolved_account_id: rule.resolved_account_id,
      matched: false,
      reason: `amount_above_max:${input.signal.amount}>${predicate.amount_max}`
    }
  }

  if (predicate.payment_method_in && predicate.payment_method_in.length > 0) {
    if (!input.paymentMethod || !predicate.payment_method_in.includes(input.paymentMethod)) {
      return {
        rule_id: rule.rule_id,
        resolved_account_id: rule.resolved_account_id,
        matched: false,
        reason: `payment_method_not_in_list:${input.paymentMethod ?? 'null'}`
      }
    }
  }

  if (predicate.bank_description_regex) {
    const haystack = input.bankDescription ?? ''
    let regex: RegExp

    try {
      regex = new RegExp(predicate.bank_description_regex, 'iu')
    } catch (error) {
      return {
        rule_id: rule.rule_id,
        resolved_account_id: rule.resolved_account_id,
        matched: false,
        reason: `invalid_regex:${(error as Error).message}`
      }
    }

    if (!regex.test(haystack)) {
      return {
        rule_id: rule.rule_id,
        resolved_account_id: rule.resolved_account_id,
        matched: false,
        reason: `bank_description_not_matched`
      }
    }
  }

  if (predicate.metadata_match) {
    for (const [key, expected] of Object.entries(predicate.metadata_match)) {
      const actual = input.signal.sourcePayload[key]

      if (actual !== expected) {
        return {
          rule_id: rule.rule_id,
          resolved_account_id: rule.resolved_account_id,
          matched: false,
          reason: `metadata_mismatch:${key}`
        }
      }
    }
  }

  return {
    rule_id: rule.rule_id,
    resolved_account_id: rule.resolved_account_id,
    matched: true,
    reason: 'matched'
  }
}
