/**
 * TASK-708 — Public API del módulo `external-cash-signals`.
 *
 * Único punto de escritura sobre `greenhouse_finance.external_cash_signals` y
 * tablas asociadas (auto_adopt_policies, account_signal_matching_rules,
 * resolution_attempts).
 *
 * Slice 0 (esta task): tipos + skeleton de funciones canónicas.
 * Slice 1 (siguiente): Nubox sync delega acá; evaluador de reglas D5; auto-adopt.
 *
 * Hard rules (heredadas de los principios de resilencia de TASK-708):
 *   - cualquier escritura sobre la tabla pasa por las funciones de este módulo;
 *     NO se permite raw INSERT desde otros módulos.
 *   - los tipos `AccountId` (branded) garantizan en compile time que cualquier
 *     promoción a payment canónico tiene cuenta resuelta no nula.
 *   - el evaluador es función pura `(signal, rules) → ResolutionOutcome`; no
 *     produce side effects salvo persistir el attempt log.
 */

export * from './types'
export { recordSignal } from './record-signal'
export { evaluateSignalAccount, EVALUATOR_VERSION } from './rule-evaluator'
export { resolveAutoAdoptPolicy } from './auto-adopt-policy'
export { listSignals } from './list-signals'
export type { ListSignalsFilters, ListSignalsResult } from './list-signals'
export { adoptSignalManually } from './adopt-signal'
export type { AdoptSignalManuallyResult } from './adopt-signal'
export { dismissSignal } from './dismiss-signal'
export type { DismissSignalResult } from './dismiss-signal'
