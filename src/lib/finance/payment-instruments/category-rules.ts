/**
 * Instrument Category Provider Rules — canonical helper (TASK-701).
 *
 * Mirrors the seed of `greenhouse_finance.instrument_category_provider_rules`.
 * Read API for both the admin form (which fields to render, what label, what
 * default value) and the readiness contract (which fields are required to
 * mark the instrument "ready").
 *
 * ⚠️ FOR AGENTS / FUTURE DEVS:
 * - DO NOT branch UI logic by `instrument_category` — read the rule instead.
 * - When adding a new category (employee_wallet, intercompany_loan, etc.):
 *     1. INSERT a row in `instrument_category_provider_rules` (migration)
 *     2. Add the corresponding entry HERE
 *     3. If the new category is operated by Greenhouse, append it to the
 *        `applicable_to` of the 'greenhouse' provider in the catalog
 *   The form auto-adapts. No code branching required.
 */

import type { InstrumentCategory } from '@/config/payment-instruments'

export type CounterpartyKind = 'identity_profile' | 'organization' | 'team_member'

export interface CategoryProviderRule {
  instrumentCategory: InstrumentCategory
  /** Whether the form must collect a provider for this category. */
  requiresProvider: boolean
  /** Label to render for the provider field (e.g. 'Banco emisor', 'Plataforma'). */
  providerLabel: string | null
  /** Filter for the provider dropdown by `provider_type`. */
  providerTypesAllowed: readonly string[] | null
  /**
   * If non-null, the provider is auto-assigned and the dropdown is read-only.
   * Used for `shareholder_account` → 'greenhouse' (and future internal wallets).
   */
  defaultProviderSlug: string | null
  /** Whether the form must collect a counterparty (the "other side" of the wallet). */
  requiresCounterparty: boolean
  /** What kind of entity the counterparty references. */
  counterpartyKind: CounterpartyKind | null
  /** Label to render for the counterparty field (e.g. 'Accionista'). */
  counterpartyLabel: string | null
}

const RULES: Record<InstrumentCategory, CategoryProviderRule> = {
  bank_account: {
    instrumentCategory: 'bank_account',
    requiresProvider: true,
    providerLabel: 'Banco emisor',
    providerTypesAllowed: ['bank'],
    defaultProviderSlug: null,
    requiresCounterparty: false,
    counterpartyKind: null,
    counterpartyLabel: null
  },
  credit_card: {
    instrumentCategory: 'credit_card',
    requiresProvider: true,
    providerLabel: 'Red de tarjeta',
    providerTypesAllowed: ['card_network', 'bank'],
    defaultProviderSlug: null,
    requiresCounterparty: false,
    counterpartyKind: null,
    counterpartyLabel: null
  },
  fintech: {
    instrumentCategory: 'fintech',
    requiresProvider: true,
    providerLabel: 'Operador fintech',
    providerTypesAllowed: ['fintech'],
    defaultProviderSlug: null,
    requiresCounterparty: false,
    counterpartyKind: null,
    counterpartyLabel: null
  },
  payment_platform: {
    instrumentCategory: 'payment_platform',
    requiresProvider: true,
    providerLabel: 'Plataforma',
    providerTypesAllowed: ['payment_platform'],
    defaultProviderSlug: null,
    requiresCounterparty: false,
    counterpartyKind: null,
    counterpartyLabel: null
  },
  payroll_processor: {
    instrumentCategory: 'payroll_processor',
    requiresProvider: true,
    providerLabel: 'Procesador',
    providerTypesAllowed: ['payroll_processor'],
    defaultProviderSlug: null,
    requiresCounterparty: false,
    counterpartyKind: null,
    counterpartyLabel: null
  },
  cash: {
    instrumentCategory: 'cash',
    requiresProvider: false,
    providerLabel: null,
    providerTypesAllowed: null,
    defaultProviderSlug: null,
    requiresCounterparty: false,
    counterpartyKind: null,
    counterpartyLabel: null
  },
  shareholder_account: {
    instrumentCategory: 'shareholder_account',
    requiresProvider: true,
    providerLabel: 'Plataforma',
    providerTypesAllowed: ['platform_operator'],
    defaultProviderSlug: 'greenhouse',
    requiresCounterparty: true,
    counterpartyKind: 'identity_profile',
    counterpartyLabel: 'Accionista'
  }
}

export const getCategoryProviderRule = (
  category: InstrumentCategory | string | null | undefined
): CategoryProviderRule | null => {
  if (!category) return null

  return RULES[category as InstrumentCategory] ?? null
}

/**
 * Returns true when the rule indicates the provider is auto-assigned
 * (read-only in UI, never editable by the user).
 */
export const hasFixedProvider = (
  rule: CategoryProviderRule | null
): rule is CategoryProviderRule & { defaultProviderSlug: string } =>
  Boolean(rule?.defaultProviderSlug)
