import 'server-only'

import { GH_NEXA } from '@/lib/copy/nexa'
import { getFinanceLedgerHealth } from '@/lib/finance/ledger-health'

import type { NexaSuggestedPrompt } from './suggested-prompts-contract'
import type { ResolveDataAwareSuggestedPromptsInput } from './suggested-prompts-data-aware'

// TASK-1143 — Resolver SERVER-ONLY del contexto `finance` (dashboard de Finanzas global, NO la
// ficha de un cliente — esa es `client`). Arranca los prompts de Nexa desde las anomalías reales
// del ledger (descuadre, saldos desactualizados, gastos sin anclar, chequeos degradados) reusando
// `getFinanceLedgerHealth` (cero recompute). Anti-oracle: gatea por el route_group `finance` del
// subject. Allowlist categórica: counts/estados, NUNCA montos (los samples traen montos → no se
// echan al texto).

const COPY = GH_NEXA.floating.data_aware_prompts

const MAX_FINANCE_PROMPTS = 4

export interface FinanceLedgerFacts {
  settlementDriftCount: number
  staleBalancesCount: number
  unanchoredCount: number
  degradedChecksCount: number
}

/**
 * Mapper PURO (sin IO): salud del ledger → prompts de "gancho". Allowlist categórica (counts/
 * estados, nunca montos). Orden por severidad: descuadre (integridad) > saldos viejos > gastos
 * sin anclar > chequeos degradados. Corta a 4.
 */
export const buildFinancePrompts = (facts: FinanceLedgerFacts): NexaSuggestedPrompt[] => {
  const out: NexaSuggestedPrompt[] = []

  const push = (templateKey: keyof typeof COPY, hint: NexaSuggestedPrompt['hint'], count?: number): void => {
    const template = COPY[templateKey]

    if (!template) return

    const text = count == null ? template : template.replace(/\{count\}/g, String(count))

    if (text && !out.some(prompt => prompt.text === text)) out.push({ text, hint })
  }

  if (facts.settlementDriftCount > 0) push('finance_ledger_drift', 'anomaly', facts.settlementDriftCount)
  if (facts.staleBalancesCount > 0) push('finance_stale_balances', 'pending', facts.staleBalancesCount)
  if (facts.unanchoredCount > 0) push('finance_unanchored', 'pending', facts.unanchoredCount)
  if (facts.degradedChecksCount > 0) push('finance_ledger_degraded', 'risk')

  return out.slice(0, MAX_FINANCE_PROMPTS)
}

const hasFinanceAccess = (input: ResolveDataAwareSuggestedPromptsInput): boolean =>
  Boolean(input.tenant?.routeGroups?.includes('finance'))

/**
 * Orquesta la lectura de salud del ledger. Anti-oracle: si el subject no tiene acceso `finance` →
 * `[]` (degrada a Tier 1/1.5; no revela anomalías financieras). Puede lanzar; el composer captura.
 */
export const resolveFinancePrompts = async (
  input: ResolveDataAwareSuggestedPromptsInput
): Promise<NexaSuggestedPrompt[]> => {
  if (!hasFinanceAccess(input)) return []

  const health = await getFinanceLedgerHealth()

  return buildFinancePrompts({
    settlementDriftCount: health.settlementDrift.driftedIncomesCount,
    staleBalancesCount: health.balanceFreshness.accountsWithStaleBalances.length,
    unanchoredCount: health.unanchoredExpenses.count,
    degradedChecksCount: health.degradedChecks.length
  })
}
