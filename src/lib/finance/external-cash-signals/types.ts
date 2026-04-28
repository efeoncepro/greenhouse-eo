/**
 * TASK-708 — Tipos canónicos del módulo `external-cash-signals`.
 *
 * Mirrors del schema `greenhouse_finance.external_cash_signals` y compañeras.
 * Mantenidos consistentes con CHECK constraints SQL (D1, D3, D5).
 */

import type { AccountId } from '@/lib/finance/types/account-id'

export const EXTERNAL_CASH_SIGNAL_RESOLUTION_STATUSES = [
  'unresolved',
  'resolved_high_confidence',
  'resolved_low_confidence',
  'adopted',
  'superseded',
  'dismissed'
] as const

export type ExternalCashSignalResolutionStatus = (typeof EXTERNAL_CASH_SIGNAL_RESOLUTION_STATUSES)[number]

export const EXTERNAL_CASH_SIGNAL_DOCUMENT_KINDS = ['income', 'expense', 'unknown'] as const
export type ExternalCashSignalDocumentKind = (typeof EXTERNAL_CASH_SIGNAL_DOCUMENT_KINDS)[number]

export const EXTERNAL_CASH_SIGNAL_RESOLUTION_METHODS = [
  'auto_exact_match',
  'manual_admin',
  'cartola_match',
  'superseded_by_otb'
] as const
export type ExternalCashSignalResolutionMethod = (typeof EXTERNAL_CASH_SIGNAL_RESOLUTION_METHODS)[number]

export const EXTERNAL_CASH_SIGNAL_PROMOTED_PAYMENT_KINDS = ['income_payment', 'expense_payment'] as const
export type ExternalCashSignalPromotedPaymentKind = (typeof EXTERNAL_CASH_SIGNAL_PROMOTED_PAYMENT_KINDS)[number]

export const EXTERNAL_SIGNAL_AUTO_ADOPT_MODES = ['review', 'auto_adopt'] as const
export type ExternalSignalAutoAdoptMode = (typeof EXTERNAL_SIGNAL_AUTO_ADOPT_MODES)[number]

export const EXTERNAL_SIGNAL_RESOLUTION_OUTCOMES = ['resolved', 'ambiguous', 'no_match'] as const
export type ExternalSignalResolutionOutcome = (typeof EXTERNAL_SIGNAL_RESOLUTION_OUTCOMES)[number]

export const ACCOUNT_SIGNAL_RULE_PROVENANCE = ['admin_ui', 'migration_seed', 'imported_from_legacy'] as const
export type AccountSignalRuleProvenance = (typeof ACCOUNT_SIGNAL_RULE_PROVENANCE)[number]

/**
 * Shape canónico de `match_predicate_json`. Todos los campos opcionales se
 * combinan con AND en el evaluador. Vacío (sin ningún campo) es rechazado por
 * el evaluador para prevenir regla "catch-all" peligrosa.
 */
export interface AccountSignalMatchPredicate {
  bank_description_regex?: string
  payment_method_in?: string[]
  currency_eq?: string
  amount_min?: number
  amount_max?: number
  metadata_match?: Record<string, string | number | boolean>
}

export interface ExternalCashSignal {
  signalId: string
  sourceSystem: string
  sourceEventId: string
  sourcePayload: Record<string, unknown>
  sourceObservedAt: Date
  documentKind: ExternalCashSignalDocumentKind
  documentId: string | null
  signalDate: string
  amount: number
  currency: string
  accountResolutionStatus: ExternalCashSignalResolutionStatus
  resolvedAccountId: AccountId | null
  resolvedAt: Date | null
  resolvedByUserId: string | null
  resolutionMethod: ExternalCashSignalResolutionMethod | null
  promotedPaymentKind: ExternalCashSignalPromotedPaymentKind | null
  promotedPaymentId: string | null
  supersededAt: Date | null
  supersededReason: string | null
  spaceId: string
  observedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface RecordSignalInput {
  sourceSystem: string
  sourceEventId: string
  sourcePayload: Record<string, unknown>
  sourceObservedAt: Date
  documentKind: ExternalCashSignalDocumentKind
  documentId?: string | null
  signalDate: string
  amount: number
  currency: string
  spaceId: string
}

export interface ResolutionAttempt {
  attemptId: string
  signalId: string
  evaluatedAt: Date
  rulesEvaluated: Array<{ ruleId: string; matched: boolean; reason: string }>
  matchedRuleId: string | null
  resolutionOutcome: ExternalSignalResolutionOutcome
  resolutionAccountId: AccountId | null
  evaluatorVersion: string
}
