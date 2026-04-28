import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { dismissExpensePhantom, dismissIncomePhantom } from '@/lib/finance/payment-instruments/dismiss-phantom'
import { FinanceValidationError } from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { parseAccountId, type AccountId } from '@/lib/finance/types/account-id'

import { evaluateSignalAccount } from './rule-evaluator'
import type { ExternalCashSignalDocumentKind, ExternalSignalResolutionOutcome } from './types'

/**
 * TASK-708b — Clasificacion + apply de remediacion historica para Cohorte A/B.
 * ===============================================================================
 *
 * Outcome determinístico por signal:
 *
 *   1. `repaired_with_account` — D5 rules resuelven cuenta con confianza alta.
 *      Apply: el bank_statement_row reconciliada del periodo (si existe) ya
 *      esta en una cuenta concreta; reanchor de la settlement_leg + UPDATE de
 *      la signal a `adopted` con resolution_method='cartola_match' o
 *      'auto_exact_match' segun fuente.
 *
 *   2. `superseded_replaced` — existe cartola con movimiento que matchea (monto
 *      + fecha + period account). Apply: NO se reemplaza el phantom payment;
 *      en su lugar se actualiza el phantom in-place poblando su payment_account_id
 *      desde el period.account_id de la cartola que lo reconcilia, y se reanchor
 *      de la settlement_leg principal. Esto convierte el phantom en un payment
 *      canonico LIMPIO sin perder audit, lo que es coherente con el caso $6.9M
 *      donde la cartola ya existe.
 *
 *   3. `dismissed_no_cash` — no hay evidencia de cash real. Apply: dismissPhantomPayment
 *      marca superseded_at + superseded_reason; el trigger D2 recompute baja
 *      el income/expense.payment_status del documento. Outbox emite
 *      finance.{income,expense}.payment_dismissed_historical.
 *
 * El mecanismo es **idempotente**: cualquier signal ya en estado terminal
 * (adopted/dismissed/superseded) se skipea con `alreadyResolved: true`.
 *
 * Reglas duras:
 *   - actorUserId obligatorio, queda en audit (resolved_by_user_id).
 *   - reason obligatorio para dismissals (8+ chars, validado por dismissPhantomPayment).
 *   - cero DELETE: solo UPDATEs auditables.
 *   - el helper NO intenta reemplazar phantom payment con uno nuevo en
 *     `superseded_replaced`. Esa estrategia (crear payment limpio + supersede
 *     phantom) requeriria que income/expense_payments permita un INSERT con
 *     mismo (income_id, reference) — bloqueado por convencion. La estrategia
 *     canonica de TASK-708b es UPDATE in-place del phantom poblando
 *     payment_account_id desde la cartola, lo que **convierte el phantom en
 *     payment canonico** sin reanchor del bank_statement_row (ya esta linkeado).
 */

export type RemediationOutcome = 'repaired_with_account' | 'superseded_replaced' | 'dismissed_no_cash'

export interface ClassificationProposal {
  signalId: string
  documentKind: ExternalCashSignalDocumentKind
  documentId: string | null
  paymentId: string
  amount: number
  currency: string
  signalDate: string
  outcome: RemediationOutcome
  reason: string
  resolvedAccountId: string | null
  evidence: {
    matchingRule?: string | null
    matchingOutcome?: ExternalSignalResolutionOutcome | null
    matchedBankStatementRowId?: string | null
    matchedPeriodAccountId?: string | null
  }
}

interface ClassifySignalInput {
  signalId: string
  spaceId: string
  documentKind: ExternalCashSignalDocumentKind
  documentId: string | null
  paymentId: string
  amount: number
  currency: string
  signalDate: string
  paymentMethod?: string | null
  bankDescription?: string | null
}

const dismissReasonFromOutcome = (
  signalDate: string,
  documentKind: ExternalCashSignalDocumentKind
): string => {
  // TASK-708b canonical reason — auditable y descriptivo (8+ chars).
  return `TASK-708b: ${documentKind === 'income' ? 'cobro' : 'pago'} historico Nubox sin evidencia de cash real (${signalDate}). Anulado sin reemplazo bajo runbook docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md.`
}

/**
 * Para cada signal Cohorte A/B (cumple promoted-payment phantom shape),
 * propone un outcome basado en evidencia automatica:
 *   1. Si una `bank_statement_row` reconciliada apunta al payment phantom o
 *      a su settlement_leg, y la period.account_id es resoluble, → repaired_with_account.
 *   2. Si D5 rules emiten `resolved` con cuenta unica para el signal,
 *      → repaired_with_account con resolution_method='auto_exact_match'.
 *   3. Si no hay cartola ni regla matcheante, → dismissed_no_cash con reason canonica.
 *
 * Esta funcion es **read-only**: produce la propuesta. El humano firma y
 * `applyHistoricalRemediation` aplica.
 */
export const classifyHistoricalSignal = async (
  input: ClassifySignalInput
): Promise<ClassificationProposal> => {
  const proposal: ClassificationProposal = {
    signalId: input.signalId,
    documentKind: input.documentKind,
    documentId: input.documentId,
    paymentId: input.paymentId,
    amount: input.amount,
    currency: input.currency,
    signalDate: input.signalDate,
    outcome: 'dismissed_no_cash',
    reason: dismissReasonFromOutcome(input.signalDate, input.documentKind),
    resolvedAccountId: null,
    evidence: {}
  }

  // 1. Buscar bank_statement_row reconciliada que apunte al phantom payment
  //    o a su settlement_leg. Si existe, la cuenta del period es la cuenta
  //    canonica → outcome `repaired_with_account`.
  const matchedRows = await runGreenhousePostgresQuery<{
    row_id: string
    period_account_id: string | null
    matched_settlement_leg_id: string | null
    matched_payment_id: string | null
  } & Record<string, unknown>>(
    `
      SELECT bsr.row_id, rp.account_id AS period_account_id,
             bsr.matched_settlement_leg_id, bsr.matched_payment_id
      FROM greenhouse_finance.bank_statement_rows bsr
      JOIN greenhouse_finance.reconciliation_periods rp ON rp.period_id = bsr.period_id
      LEFT JOIN greenhouse_finance.settlement_legs sl ON sl.settlement_leg_id = bsr.matched_settlement_leg_id
      WHERE (bsr.matched_payment_id = $1 OR sl.linked_payment_id = $1)
      LIMIT 1
    `,
    [input.paymentId]
  )

  if (matchedRows.length > 0 && matchedRows[0]?.period_account_id) {
    proposal.outcome = 'repaired_with_account'
    proposal.resolvedAccountId = matchedRows[0]!.period_account_id
    proposal.reason = `TASK-708b: cartola ${matchedRows[0]!.row_id} confirma cash en cuenta ${matchedRows[0]!.period_account_id}.`
    proposal.evidence.matchedBankStatementRowId = matchedRows[0]!.row_id
    proposal.evidence.matchedPeriodAccountId = matchedRows[0]!.period_account_id

    return proposal
  }

  // 2. Sin cartola: invocar D5 rule evaluator (TASK-708 D5 seed: nubox CLP+bank_transfer→santander-clp).
  const evalResult = await evaluateSignalAccount({
    signal: {
      signalId: input.signalId,
      sourceSystem: 'nubox',
      spaceId: input.spaceId,
      amount: input.amount,
      currency: input.currency,
      sourcePayload: {}
    },
    paymentMethod: input.paymentMethod ?? undefined,
    bankDescription: input.bankDescription ?? undefined
  })

  if (evalResult.outcome === 'resolved' && evalResult.resolutionAccountId) {
    proposal.outcome = 'repaired_with_account'
    proposal.resolvedAccountId = evalResult.resolutionAccountId
    proposal.reason = `TASK-708b: D5 rule ${evalResult.matchedRuleId} resuelve cuenta ${evalResult.resolutionAccountId} con confianza alta.`
    proposal.evidence.matchingRule = evalResult.matchedRuleId
    proposal.evidence.matchingOutcome = evalResult.outcome

    return proposal
  }

  // 3. Sin cartola ni regla → dismissed_no_cash (default conservador).
  proposal.evidence.matchingOutcome = evalResult.outcome
  proposal.evidence.matchingRule = evalResult.matchedRuleId

  return proposal
}

interface ApplyResult {
  signalId: string
  paymentId: string
  outcome: RemediationOutcome
  applied: boolean
  alreadyResolved: boolean
  details: Record<string, unknown>
}

/**
 * Aplica la remediacion para un signal segun la classification proposal firmada.
 *
 * Pre-condicion (caller debe garantizar):
 *   - signal existe en external_cash_signals
 *   - signal NO esta en estado terminal (adopted/dismissed/superseded)
 *   - actorUserId tiene capability finance.cash.adopt-external-signal y/o
 *     finance.cash.dismiss-external-signal
 *
 * Idempotencia: si el phantom ya tiene superseded_at NOT NULL, se skipea
 * con alreadyResolved=true. La signal se actualiza al estado terminal
 * correspondiente.
 */
export const applyHistoricalRemediation = async (
  proposal: ClassificationProposal,
  actorUserId: string
): Promise<ApplyResult> => {
  const result: ApplyResult = {
    signalId: proposal.signalId,
    paymentId: proposal.paymentId,
    outcome: proposal.outcome,
    applied: false,
    alreadyResolved: false,
    details: {}
  }

  if (proposal.outcome === 'dismissed_no_cash') {
    if (proposal.documentKind === 'income') {
      const dismissed = await dismissIncomePhantom({
        phantomPaymentId: proposal.paymentId,
        reason: proposal.reason,
        actorUserId
      })

      result.alreadyResolved = dismissed.alreadyDismissed
      result.applied = !dismissed.alreadyDismissed
      result.details.recomputedAmountPaid = dismissed.recomputed
    } else if (proposal.documentKind === 'expense') {
      const dismissed = await dismissExpensePhantom({
        phantomPaymentId: proposal.paymentId,
        reason: proposal.reason,
        actorUserId
      })

      result.alreadyResolved = dismissed.alreadyDismissed
      result.applied = !dismissed.alreadyDismissed
    } else {
      throw new FinanceValidationError(
        `TASK-708b: documentKind=${proposal.documentKind} no soportado para dismissal historico.`,
        400
      )
    }

    // Actualizar signal a 'dismissed' (espejo del phantom dismissal).
    await runGreenhousePostgresQuery(
      `
        UPDATE greenhouse_finance.external_cash_signals
        SET account_resolution_status = 'dismissed',
            superseded_at = COALESCE(superseded_at, NOW()),
            superseded_reason = COALESCE(superseded_reason, $1),
            resolved_by_user_id = COALESCE(resolved_by_user_id, $2),
            updated_at = NOW()
        WHERE signal_id = $3
          AND account_resolution_status NOT IN ('adopted', 'dismissed', 'superseded')
      `,
      [proposal.reason, actorUserId, proposal.signalId]
    )

    return result
  }

  if (proposal.outcome === 'repaired_with_account' || proposal.outcome === 'superseded_replaced') {
    if (!proposal.resolvedAccountId) {
      throw new FinanceValidationError(
        `TASK-708b: outcome=${proposal.outcome} requiere resolvedAccountId.`,
        400
      )
    }

    const accountId: AccountId = await parseAccountId(proposal.resolvedAccountId)

    // Estrategia canonica: UPDATE in-place del phantom poblando payment_account_id.
    // Esto convierte el phantom en payment canonico LIMPIO. La leg principal asociada
    // tambien se actualiza con el mismo instrument_id. La signal queda 'adopted' apuntando
    // al payment ya repared.
    await withTransaction(async (client: PoolClient) => {
      const phantomTable = proposal.documentKind === 'income' ? 'income_payments' : 'expense_payments'
      const settlementLegLinkType = proposal.documentKind === 'income' ? 'income_payment' : 'expense_payment'

      const phantomCheck = await client.query<{
        payment_account_id: string | null
        superseded_at: Date | null
      }>(
        `SELECT payment_account_id, superseded_at FROM greenhouse_finance.${phantomTable} WHERE payment_id = $1 FOR UPDATE`,
        [proposal.paymentId]
      )

      if (phantomCheck.rows.length === 0) {
        throw new FinanceValidationError(
          `TASK-708b: phantom payment ${proposal.paymentId} no existe.`,
          404
        )
      }

      if (phantomCheck.rows[0].superseded_at) {
        result.alreadyResolved = true

        return
      }

      if (phantomCheck.rows[0].payment_account_id === accountId) {
        result.alreadyResolved = true
        result.applied = false
        result.details.note = 'phantom_already_has_account'
      } else {
        // UPDATE in-place: poblar payment_account_id. El CHECK
        // income/expense_payments_account_required_after_cutover ya pasa
        // (el row es pre-cutover por created_at < TASK_708_CUTOVER_TS).
        await client.query(
          `UPDATE greenhouse_finance.${phantomTable}
           SET payment_account_id = $1
           WHERE payment_id = $2`,
          [accountId, proposal.paymentId]
        )

        // Reanchor settlement_leg principal: si existe leg con instrument_id NULL
        // ligada a este payment, UPDATE su instrument_id.
        await client.query(
          `UPDATE greenhouse_finance.settlement_legs
           SET instrument_id = $1, updated_at = NOW()
           WHERE linked_payment_type = $2
             AND linked_payment_id = $3
             AND instrument_id IS NULL
             AND superseded_at IS NULL
             AND leg_type IN ('receipt', 'payout')`,
          [accountId, settlementLegLinkType, proposal.paymentId]
        )

        await publishOutboxEvent(
          {
            aggregateType: `finance.${proposal.documentKind === 'income' ? 'income_payment' : 'expense_payment'}`,
            aggregateId: proposal.paymentId,
            eventType: 'finance.settlement_leg.reanchored',
            payload: {
              paymentId: proposal.paymentId,
              accountId,
              outcome: proposal.outcome,
              actorUserId,
              reason: proposal.reason
            }
          },
          client
        )

        result.applied = true
      }

      // Actualizar signal a 'adopted' apuntando al phantom (que ahora es payment canonico limpio).
      await client.query(
        `
          UPDATE greenhouse_finance.external_cash_signals
          SET account_resolution_status = 'adopted',
              resolved_account_id = $1,
              resolved_at = COALESCE(resolved_at, NOW()),
              resolved_by_user_id = COALESCE(resolved_by_user_id, $2),
              resolution_method = COALESCE(resolution_method, $3),
              promoted_payment_kind = $4,
              promoted_payment_id = $5,
              updated_at = NOW()
          WHERE signal_id = $6
            AND account_resolution_status NOT IN ('adopted', 'dismissed', 'superseded')
        `,
        [
          accountId,
          actorUserId,
          proposal.outcome === 'superseded_replaced' ? 'cartola_match' : 'auto_exact_match',
          proposal.documentKind === 'income' ? 'income_payment' : 'expense_payment',
          proposal.paymentId,
          proposal.signalId
        ]
      )
    })

    return result
  }

  throw new FinanceValidationError(`TASK-708b: outcome ${proposal.outcome} no soportado.`, 400)
}

/**
 * TASK-708b Slice 3 — re-anclar las 4 settlement_legs Cohorte C con
 * instrument_id NULL. Las 3 receipt asociadas a phantom income_payments quedan
 * resueltas automaticamente cuando applyHistoricalRemediation procesa la signal
 * Cohorte A correspondiente. La 1 funding leg `stlleg-exp-pay-c15f6f51-...funding-...`
 * NO es Cohorte B (su payment ya tiene cuenta); su funding leg es leg auxiliar
 * que el CHECK NO exige instrument_id (solo legs principales receipt/payout
 * lo requieren), asi que NO se toca.
 *
 * Esta funcion solo verifica que las 3 receipt legs queden resueltas tras los
 * applies; no hace work adicional. Si alguna queda colgada, se reporta.
 */
export const verifyCohortCResolution = async (): Promise<{
  remainingReceiptLegsWithoutInstrument: number
  remainingPayoutLegsWithoutInstrument: number
}> => {
  const rows = await runGreenhousePostgresQuery<{ leg_type: string; cnt: string } & Record<string, unknown>>(
    `
      SELECT leg_type, COUNT(*)::text AS cnt
      FROM greenhouse_finance.settlement_legs
      WHERE leg_type IN ('receipt', 'payout')
        AND instrument_id IS NULL
        AND superseded_at IS NULL
      GROUP BY leg_type
    `
  )

  const counts = { remainingReceiptLegsWithoutInstrument: 0, remainingPayoutLegsWithoutInstrument: 0 }

  for (const row of rows) {
    if (row.leg_type === 'receipt') counts.remainingReceiptLegsWithoutInstrument = Number(row.cnt)
    else if (row.leg_type === 'payout') counts.remainingPayoutLegsWithoutInstrument = Number(row.cnt)
  }

  return counts
}
