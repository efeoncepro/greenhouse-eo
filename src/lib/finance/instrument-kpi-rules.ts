import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-720 — Instrument Category KPI Rules.
 *
 * Reader + helper canónico que dicta cómo cada `instrument_category` contribuye
 * a los KPIs del módulo Banco. Reemplaza la lógica inline de `getBankOverview`
 * que sumaba liability como cash, inflando "Saldo CLP" en $1.3M.
 *
 * REGLAS DURAS
 * ────────────
 * - Cualquier categoría nueva = INSERT en `instrument_category_kpi_rules`. Cero
 *   refactor de agregador.
 * - Si una cuenta tiene `instrument_category` sin rule → throw `MissingKpiRuleError`
 *   (fail-fast). El detector `task720.instrumentCategoriesWithoutKpiRule` previene
 *   que esto ocurra en producción.
 * - El cache TTL 60s amortiza lecturas en lanes hot. Bypass via `loadKpiRules({force:true})`.
 *
 * PARIDAD SQL ↔ TS
 * ────────────────
 * El shape de KpiRule mirror-ea el schema. Tests de paridad en
 * `__tests__/instrument-kpi-rules.test.ts` aseguran que aggregaciones
 * computadas en TS coincidan con la verdad de PG.
 */

export type AccountKind = 'asset' | 'liability'
export type DisplayGroup = 'cash' | 'credit' | 'platform_internal'

export type KpiRule = {
  instrumentCategory: string
  accountKind: AccountKind
  contributesToCash: boolean
  contributesToConsolidatedClp: boolean
  contributesToNetWorth: boolean
  netWorthSign: 1 | -1
  displayLabel: string
  displayGroup: DisplayGroup
  rationale: string
}

export type KpiRuleRow = {
  instrument_category: string
  account_kind: string
  contributes_to_cash: boolean
  contributes_to_consolidated_clp: boolean
  contributes_to_net_worth: boolean
  net_worth_sign: number
  display_label: string
  display_group: string
  rationale: string
}

export class MissingKpiRuleError extends Error {
  constructor(public readonly instrumentCategory: string) {
    super(
      `TASK-720: instrument_category "${instrumentCategory}" has no KPI rule. ` +
        `Add a row to greenhouse_finance.instrument_category_kpi_rules before activating accounts in this category. ` +
        `See ledger-health detector task720.instrumentCategoriesWithoutKpiRule.`
    )
    this.name = 'MissingKpiRuleError'
  }
}

const mapRow = (row: KpiRuleRow): KpiRule => ({
  instrumentCategory: row.instrument_category,
  accountKind: row.account_kind === 'liability' ? 'liability' : 'asset',
  contributesToCash: row.contributes_to_cash,
  contributesToConsolidatedClp: row.contributes_to_consolidated_clp,
  contributesToNetWorth: row.contributes_to_net_worth,
  netWorthSign: row.net_worth_sign === -1 ? -1 : 1,
  displayLabel: row.display_label,
  displayGroup:
    row.display_group === 'credit' ? 'credit'
    : row.display_group === 'platform_internal' ? 'platform_internal'
    : 'cash',
  rationale: row.rationale
})

const CACHE_TTL_MS = 60_000
let cachedRules: KpiRule[] | null = null
let cacheLoadedAt = 0

export const loadKpiRules = async (options: { force?: boolean } = {}): Promise<KpiRule[]> => {
  const now = Date.now()

  if (!options.force && cachedRules && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedRules
  }

  const rows = await runGreenhousePostgresQuery<KpiRuleRow>(
    `SELECT
       instrument_category,
       account_kind,
       contributes_to_cash,
       contributes_to_consolidated_clp,
       contributes_to_net_worth,
       net_worth_sign,
       display_label,
       display_group,
       rationale
     FROM greenhouse_finance.instrument_category_kpi_rules
     ORDER BY instrument_category ASC`
  )

  cachedRules = rows.map(mapRow)
  cacheLoadedAt = now

  return cachedRules
}

export const buildRuleIndex = (rules: KpiRule[]): Map<string, KpiRule> => {
  const map = new Map<string, KpiRule>()

  for (const rule of rules) {
    map.set(rule.instrumentCategory, rule)
  }

  return map
}

export type AccountForAggregation = {
  currency: string
  closingBalance: number
  closingBalanceClp: number | null
  instrumentCategory: string | null
}

export type KpiAggregation = {
  totalCashByCurrency: Record<string, number>
  consolidatedCashClp: number
  netWorthByCurrency: Record<string, number>
  netWorthClp: number
  byGroup: {
    cash: number
    credit: number
    platformInternal: number
  }
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Agrega los KPIs del módulo Banco a partir de cuentas + reglas declarativas.
 *
 * Pure function: misma input → mismo output. Test-friendly.
 *
 * Throws `MissingKpiRuleError` si alguna cuenta tiene `instrument_category` sin
 * rule. Eso es un fail-fast intencional: en producción el detector
 * `task720.instrumentCategoriesWithoutKpiRule` debe estar en 0 antes de que
 * `getBankOverview` corra.
 *
 * Cuentas con `instrument_category = NULL` se ignoran defensivamente (no rompen
 * el dashboard, pero el detector las flag-eará).
 */
export const aggregateBankKpis = (
  accounts: AccountForAggregation[],
  rules: KpiRule[]
): KpiAggregation => {
  const index = buildRuleIndex(rules)

  const totalCashByCurrency: Record<string, number> = {}
  const netWorthByCurrency: Record<string, number> = {}

  let consolidatedCashClp = 0
  let netWorthClp = 0

  let cashGroup = 0
  let creditGroup = 0
  let platformInternalGroup = 0

  for (const account of accounts) {
    if (!account.instrumentCategory) {
      // Cuenta sin categoría: defensiva, no contribuye. Detector la flag.
      continue
    }

    const rule = index.get(account.instrumentCategory)

    if (!rule) {
      throw new MissingKpiRuleError(account.instrumentCategory)
    }

    const currency = account.currency
    const closingNative = account.closingBalance
    const closingClp = account.closingBalanceClp ?? 0
    const sign = rule.netWorthSign

    // Cash by currency: solo cuentas que contribuyen a cash
    if (rule.contributesToCash) {
      totalCashByCurrency[currency] = (totalCashByCurrency[currency] ?? 0) + closingNative
    }

    // Consolidated cash CLP: cuentas que contribuyen a consolidated (multi-moneda)
    if (rule.contributesToConsolidatedClp) {
      consolidatedCashClp += closingClp
    }

    // Net worth: aplica signo (asset +, liability −)
    if (rule.contributesToNetWorth) {
      const signedNative = closingNative * sign
      const signedClp = closingClp * sign

      netWorthByCurrency[currency] = (netWorthByCurrency[currency] ?? 0) + signedNative
      netWorthClp += signedClp
    }

    // Display group breakdown (en CLP equivalente para mostrar suma comparable)
    const groupContribution = closingClp || closingNative

    switch (rule.displayGroup) {
      case 'cash':
        cashGroup += groupContribution
        break
      case 'credit':
        creditGroup += groupContribution
        break
      case 'platform_internal':
        platformInternalGroup += groupContribution
        break
    }
  }

  // Round all output values
  const roundedCash: Record<string, number> = {}

  for (const [k, v] of Object.entries(totalCashByCurrency)) {
    roundedCash[k] = round(v)
  }

  const roundedNetWorth: Record<string, number> = {}

  for (const [k, v] of Object.entries(netWorthByCurrency)) {
    roundedNetWorth[k] = round(v)
  }

  return {
    totalCashByCurrency: roundedCash,
    consolidatedCashClp: round(consolidatedCashClp),
    netWorthByCurrency: roundedNetWorth,
    netWorthClp: round(netWorthClp),
    byGroup: {
      cash: round(cashGroup),
      credit: round(creditGroup),
      platformInternal: round(platformInternalGroup)
    }
  }
}

/**
 * Test-only: bypass cache. NO usar en runtime.
 */
export const __resetKpiRulesCacheForTests = () => {
  cachedRules = null
  cacheLoadedAt = 0
}
