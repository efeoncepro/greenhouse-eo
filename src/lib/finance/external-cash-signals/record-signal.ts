import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ExternalCashSignal, RecordSignalInput } from './types'

/**
 * TASK-708 D1 — Inserta una signal en `greenhouse_finance.external_cash_signals`.
 *
 * Idempotente vía `UNIQUE (source_system, source_event_id)`. Si la signal ya
 * existe, retorna la fila existente sin mutar (ON CONFLICT DO NOTHING + SELECT).
 * Esto permite que cualquier sync corra N veces sin duplicar.
 *
 * En Slice 0 esta función deja la signal en estado `unresolved`. Slice 1 va a
 * encadenar `evaluateSignalAccount(...)` después del INSERT para resolver
 * cuenta inmediatamente cuando una regla matchea de forma única.
 */
export const recordSignal = async (input: RecordSignalInput): Promise<ExternalCashSignal> => {
  if (input.amount <= 0) {
    throw new Error('TASK-708: signal amount must be > 0')
  }

  if (!input.sourceSystem || !input.sourceEventId) {
    throw new Error('TASK-708: signal requires non-empty sourceSystem and sourceEventId')
  }

  const signalId = `signal-${randomUUID()}`

  const inserted = await runGreenhousePostgresQuery<{ signal_id: string }>(
    `
      INSERT INTO greenhouse_finance.external_cash_signals (
        signal_id,
        source_system,
        source_event_id,
        source_payload_json,
        source_observed_at,
        document_kind,
        document_id,
        signal_date,
        amount,
        currency,
        account_resolution_status,
        space_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unresolved', $11
      )
      ON CONFLICT (source_system, source_event_id) DO NOTHING
      RETURNING signal_id
    `,
    [
      signalId,
      input.sourceSystem,
      input.sourceEventId,
      JSON.stringify(input.sourcePayload),
      input.sourceObservedAt.toISOString(),
      input.documentKind,
      input.documentId ?? null,
      input.signalDate,
      input.amount,
      input.currency,
      input.spaceId
    ]
  )

  const resolvedSignalId = inserted[0]?.signal_id ?? null

  if (resolvedSignalId) {
    return getSignalByIdOrThrow(resolvedSignalId)
  }

  return getSignalBySourceEventOrThrow(input.sourceSystem, input.sourceEventId)
}

const getSignalByIdOrThrow = async (signalId: string): Promise<ExternalCashSignal> => {
  const rows = await runGreenhousePostgresQuery<RawSignalRow>(
    SIGNAL_SELECT_SQL + ' WHERE signal_id = $1 LIMIT 1',
    [signalId]
  )

  if (rows.length === 0) {
    throw new Error(`TASK-708: signal ${signalId} not found after insert`)
  }

  return mapSignalRow(rows[0]!)
}

const getSignalBySourceEventOrThrow = async (
  sourceSystem: string,
  sourceEventId: string
): Promise<ExternalCashSignal> => {
  const rows = await runGreenhousePostgresQuery<RawSignalRow>(
    SIGNAL_SELECT_SQL + ' WHERE source_system = $1 AND source_event_id = $2 LIMIT 1',
    [sourceSystem, sourceEventId]
  )

  if (rows.length === 0) {
    throw new Error(`TASK-708: signal (${sourceSystem}, ${sourceEventId}) not found`)
  }

  return mapSignalRow(rows[0]!)
}

const SIGNAL_SELECT_SQL = `
  SELECT
    signal_id,
    source_system,
    source_event_id,
    source_payload_json,
    source_observed_at,
    document_kind,
    document_id,
    signal_date,
    amount,
    currency,
    account_resolution_status,
    resolved_account_id,
    resolved_at,
    resolved_by_user_id,
    resolution_method,
    promoted_payment_kind,
    promoted_payment_id,
    superseded_at,
    superseded_reason,
    space_id,
    observed_at,
    created_at,
    updated_at
  FROM greenhouse_finance.external_cash_signals
`

type RawSignalRow = {
  signal_id: string
  source_system: string
  source_event_id: string
  source_payload_json: Record<string, unknown>
  source_observed_at: Date
  document_kind: 'income' | 'expense' | 'unknown'
  document_id: string | null
  signal_date: string | Date
  amount: string
  currency: string
  account_resolution_status: ExternalCashSignal['accountResolutionStatus']
  resolved_account_id: string | null
  resolved_at: Date | null
  resolved_by_user_id: string | null
  resolution_method: ExternalCashSignal['resolutionMethod']
  promoted_payment_kind: ExternalCashSignal['promotedPaymentKind']
  promoted_payment_id: string | null
  superseded_at: Date | null
  superseded_reason: string | null
  space_id: string
  observed_at: Date
  created_at: Date
  updated_at: Date
} & Record<string, unknown>

const mapSignalRow = (row: RawSignalRow): ExternalCashSignal => ({
  signalId: row.signal_id,
  sourceSystem: row.source_system,
  sourceEventId: row.source_event_id,
  sourcePayload: row.source_payload_json,
  sourceObservedAt: new Date(row.source_observed_at),
  documentKind: row.document_kind,
  documentId: row.document_id,
  signalDate: typeof row.signal_date === 'string' ? row.signal_date : row.signal_date.toISOString().slice(0, 10),
  amount: Number(row.amount),
  currency: row.currency,
  accountResolutionStatus: row.account_resolution_status,
  resolvedAccountId: row.resolved_account_id as ExternalCashSignal['resolvedAccountId'],
  resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
  resolvedByUserId: row.resolved_by_user_id,
  resolutionMethod: row.resolution_method,
  promotedPaymentKind: row.promoted_payment_kind,
  promotedPaymentId: row.promoted_payment_id,
  supersededAt: row.superseded_at ? new Date(row.superseded_at) : null,
  supersededReason: row.superseded_reason,
  spaceId: row.space_id,
  observedAt: new Date(row.observed_at),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at)
})
