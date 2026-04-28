/**
 * TASK-714 — Instrument Detail Presentation Resolver.
 * ======================================================
 *
 * Single source of UI semantics for the bank-instrument detail drawer. The
 * resolver maps a `TreasuryBankAccountOverview` to an `InstrumentDetailProfile`
 * with title, identity row, KPIs, chart, movements vocabulary, and empty
 * states. Replaces the historical "saldo / ingresos / salidas" gramatica that
 * worked for transactional accounts but mistranslated for credit cards and
 * other liability instruments.
 *
 * Why a resolver, not inline branching:
 *   - Spec TASK-714 demands a reusable contract for future profiles
 *     (`shareholder_account`, `payroll_processor`, `loan_account`, wallets).
 *   - Inline `if instrumentCategory === 'credit_card'` in the drawer would
 *     scale poorly and silently desync from the BankView treatment of the
 *     same instrument.
 *   - A typed resolver lets us unit-test copy regressions and gives downstream
 *     consumers (TASK-705 read-model cutover, TASK-706 Previred drawer) a
 *     stable API.
 *
 * Output shape: profile-rich enough that the drawer renders without knowing
 * accounting rules (asset vs liability sign convention, last4 gating, etc).
 * The drawer renders a profile; it does not interpret an instrument.
 */

import type { TreasuryBankAccountOverview } from '@/lib/finance/account-balances'
import {
  INSTRUMENT_CATEGORY_ICONS,
  INSTRUMENT_CATEGORY_LABELS,
  type InstrumentCategory
} from '@/config/payment-instruments'

export type InstrumentProfileKey =
  | 'transactional_account'
  | 'credit_card'
  | 'shareholder_account'
  | 'processor_transit'
  | 'loan_account'
  | 'generic'

type AvatarColor = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'secondary'

export interface InstrumentDetailKpi {
  key: string
  title: string
  value: number | null
  /** Optional tooltip explaining what the metric represents. */
  subtitle: string
  avatarIcon: string
  avatarColor: AvatarColor
  /** When true, the UI should render the value as a percentage instead of currency. */
  isPercentage?: boolean
}

export interface InstrumentMovementVocabulary {
  sectionTitle: string
  sectionSubtitle: string
  /** What to display for sl.direction in the movement table. */
  directionLabels: { incoming: string; outgoing: string }
  /** Empty-state copy when there are zero movements in the period. */
  emptyLabel: string
  /** Header for the amount column. */
  amountHeader: string
}

export interface InstrumentChartConfig {
  title: string
  subtitle: string
  /** Inflow series label and bar color hex. */
  inflowLabel: string
  inflowColor: string
  /** Outflow series label and bar color hex. */
  outflowLabel: string
  outflowColor: string
}

export interface InstrumentIdentityField {
  label: string
  value: string
}

export interface InstrumentDetailProfile {
  profileKey: InstrumentProfileKey
  /** Drawer title, e.g. "Detalle de cuenta" / "Detalle de tarjeta". */
  drawerTitle: string
  /** One-liner under the title. */
  drawerSubtitle: string
  /** Identity strip rendered next to the PaymentInstrumentChip (e.g. "•••• 2505 · Mastercard"). */
  identityFields: InstrumentIdentityField[]
  /** Three KPI cards — order is presentation order. */
  kpis: InstrumentDetailKpi[]
  chart: InstrumentChartConfig
  movements: InstrumentMovementVocabulary
  /** Optional banner shown above the KPI row, e.g. for liability instruments. */
  contextBanner: { tone: 'info' | 'warning'; text: string } | null
}

const SUCCESS_HEX = '#3DBA5D'
const ERROR_HEX = '#FF4D49'
const PRIMARY_HEX = 'var(--mui-palette-primary-main)'
const WARNING_HEX = 'var(--mui-palette-warning-main)'

const formatCardIdentity = (account: TreasuryBankAccountOverview): InstrumentIdentityField[] => {
  const fields: InstrumentIdentityField[] = []

  if (account.cardLastFour) {
    fields.push({ label: 'Tarjeta', value: `•••• ${account.cardLastFour}` })
  }

  if (account.cardNetwork) {
    const network = account.cardNetwork.charAt(0).toUpperCase() + account.cardNetwork.slice(1)

    fields.push({ label: 'Red', value: network })
  }

  fields.push({ label: 'Moneda', value: account.currency })

  return fields
}

const formatTransactionalIdentity = (account: TreasuryBankAccountOverview): InstrumentIdentityField[] => {
  const fields: InstrumentIdentityField[] = []

  if (account.bankName) {
    fields.push({ label: 'Banco', value: account.bankName })
  }

  fields.push({ label: 'Moneda', value: account.currency })

  return fields
}

/**
 * Compute consumed/available for a credit_card account from its closing balance.
 * Mirror of getBankOverview's creditCards[] computation, extracted so the
 * detail drawer can reuse it without re-running the overview query.
 *
 * Convention (per TASK-703 liability sign):
 *   closingBalance > 0 = active debt (cupo utilizado)
 *   closingBalance < 0 = overpayment / credit balance
 *   consumed = max(0, closingBalance) — clamped because banks display debt only
 *   available = creditLimit - consumed (null when no limit declared)
 */
export const computeCreditCardSemantics = (
  account: Pick<TreasuryBankAccountOverview, 'closingBalance' | 'creditLimit' | 'metadata'>
) => {
  const metadataLimit = account.metadata
    ? Number(
        (account.metadata as Record<string, unknown>).creditLimit
          ?? (account.metadata as Record<string, unknown>).credit_limit
          ?? null
      )
    : null

  const creditLimit = account.creditLimit
    ?? (Number.isFinite(metadataLimit) && metadataLimit !== null && metadataLimit > 0 ? metadataLimit : null)

  const runningBalance = Math.round(account.closingBalance * 100) / 100
  const consumed = Math.max(0, runningBalance)
  const available = creditLimit !== null ? Math.round((creditLimit - consumed) * 100) / 100 : null

  const utilizationPct = creditLimit !== null && creditLimit > 0
    ? Math.round((consumed / creditLimit) * 1000) / 10
    : null

  return { creditLimit, consumed, available, utilizationPct }
}

/**
 * Resolves a presentation profile for a transactional account (bank, fintech,
 * cash, payment_platform). Default profile preserves the historical drawer
 * UX with copy normalized through the resolver.
 */
const resolveTransactionalAccountProfile = (account: TreasuryBankAccountOverview): InstrumentDetailProfile => {
  const categoryLabel = account.instrumentCategory
    ? INSTRUMENT_CATEGORY_LABELS[account.instrumentCategory as InstrumentCategory] ?? 'Cuenta'
    : 'Cuenta'

  return {
    profileKey: 'transactional_account',
    drawerTitle: `Detalle de ${categoryLabel.toLowerCase()}`,
    drawerSubtitle: 'Saldo, movimientos recientes y cierre del período sobre el ledger real de tesorería.',
    identityFields: formatTransactionalIdentity(account),
    kpis: [
      {
        key: 'closingBalance',
        title: 'Saldo actual',
        value: account.closingBalance,
        subtitle: 'Snapshot al cierre del período consultado',
        avatarIcon: 'tabler-building-bank',
        avatarColor: 'primary'
      },
      {
        key: 'periodInflows',
        title: 'Ingresos del período',
        value: account.periodInflows,
        subtitle: 'Cobros, refunds y traspasos recibidos',
        avatarIcon: 'tabler-arrow-down-left',
        avatarColor: 'success'
      },
      {
        key: 'periodOutflows',
        title: 'Salidas del período',
        value: account.periodOutflows,
        subtitle: 'Pagos, fees o transferencias enviadas',
        avatarIcon: 'tabler-arrow-up-right',
        avatarColor: 'error'
      }
    ],
    chart: {
      title: 'Últimos 12 meses',
      subtitle: 'Ingresos y salidas materializados por cuenta',
      inflowLabel: 'Ingresos',
      inflowColor: SUCCESS_HEX,
      outflowLabel: 'Salidas',
      outflowColor: ERROR_HEX
    },
    movements: {
      sectionTitle: 'Movimientos recientes',
      sectionSubtitle: 'Timeline operativo leído desde settlement legs y fallback de payment ledger',
      directionLabels: { incoming: 'Entrada', outgoing: 'Salida' },
      emptyLabel: 'Esta cuenta no tiene movimientos en el período consultado.',
      amountHeader: 'Monto'
    },
    contextBanner: null
  }
}

/**
 * Resolves a presentation profile for a credit_card instrument. Inverts
 * the inflow/outflow semantics: from the cardholder's POV, "incoming" to the
 * card means "pago/abono" (debt reduction) and "outgoing" means "cargo"
 * (debt increase). The KPI row leads with the bank-statement primitives
 * (disponible, consumido/deuda, cupo) instead of the ledger primitives.
 */
const resolveCreditCardProfile = (account: TreasuryBankAccountOverview): InstrumentDetailProfile => {
  const semantics = computeCreditCardSemantics(account)

  return {
    profileKey: 'credit_card',
    drawerTitle: 'Detalle de tarjeta',
    drawerSubtitle: 'Cupo, consumo y movimientos de la tarjeta corporativa.',
    identityFields: formatCardIdentity(account),
    kpis: [
      {
        key: 'available',
        title: 'Disponible',
        value: semantics.available,
        subtitle: semantics.creditLimit !== null
          ? 'Cupo restante al cierre del período'
          : 'Cupo total no declarado',
        avatarIcon: 'tabler-credit-card',
        avatarColor: 'success'
      },
      {
        key: 'consumed',
        title: 'Deuda actual',
        value: semantics.consumed,
        subtitle: semantics.utilizationPct !== null
          ? `${semantics.utilizationPct}% del cupo utilizado`
          : 'Cargos acumulados al cierre',
        avatarIcon: 'tabler-receipt',
        avatarColor: semantics.utilizationPct !== null && semantics.utilizationPct >= 80 ? 'error' : 'warning'
      },
      {
        key: 'creditLimit',
        title: 'Cupo total',
        value: semantics.creditLimit,
        subtitle: semantics.creditLimit !== null
          ? 'Línea de crédito asignada'
          : 'Sin cupo declarado en sistema',
        avatarIcon: 'tabler-wallet',
        avatarColor: 'primary'
      }
    ],
    chart: {
      title: 'Últimos 12 meses',
      subtitle: 'Cargos y pagos/abonos materializados sobre la tarjeta',
      inflowLabel: 'Pagos / abonos',
      inflowColor: SUCCESS_HEX,
      outflowLabel: 'Cargos',
      outflowColor: WARNING_HEX
    },
    movements: {
      sectionTitle: 'Movimientos de la tarjeta',
      sectionSubtitle: 'Cargos, pagos y abonos del período',
      directionLabels: { incoming: 'Pago / abono', outgoing: 'Cargo' },
      emptyLabel: 'Esta tarjeta no registra cargos ni pagos en el período consultado.',
      amountHeader: 'Monto'
    },
    contextBanner: semantics.creditLimit === null
      ? { tone: 'info', text: 'Esta tarjeta no tiene cupo declarado en sistema. Las métricas de disponible quedan ocultas hasta que se registre el límite.' }
      : null
  }
}

const resolveShareholderAccountProfile = (account: TreasuryBankAccountOverview): InstrumentDetailProfile => ({
  profileKey: 'shareholder_account',
  drawerTitle: 'Detalle de cuenta accionista',
  drawerSubtitle: 'Saldo, aportes y reembolsos sobre la cuenta corriente del accionista.',
  identityFields: [
    { label: 'Cuenta', value: account.accountName },
    { label: 'Moneda', value: account.currency }
  ],
  kpis: [
    {
      key: 'closingBalance',
      title: 'Saldo actual',
      value: account.closingBalance,
      subtitle: 'Posición al cierre del período (positivo = empresa debe)',
      avatarIcon: 'tabler-user-dollar',
      avatarColor: account.closingBalance >= 0 ? 'warning' : 'success'
    },
    {
      key: 'periodInflows',
      title: 'Aportes del período',
      value: account.periodInflows,
      subtitle: 'Movimientos que aumentan saldo accionista',
      avatarIcon: 'tabler-arrow-down-left',
      avatarColor: 'info'
    },
    {
      key: 'periodOutflows',
      title: 'Reembolsos del período',
      value: account.periodOutflows,
      subtitle: 'Movimientos que reducen saldo accionista',
      avatarIcon: 'tabler-arrow-up-right',
      avatarColor: 'secondary'
    }
  ],
  chart: {
    title: 'Últimos 12 meses',
    subtitle: 'Aportes y reembolsos materializados',
    inflowLabel: 'Aportes',
    inflowColor: SUCCESS_HEX,
    outflowLabel: 'Reembolsos',
    outflowColor: PRIMARY_HEX
  },
  movements: {
    sectionTitle: 'Movimientos del accionista',
    sectionSubtitle: 'Aportes, reembolsos y ajustes sobre la cuenta',
    directionLabels: { incoming: 'Aporte', outgoing: 'Reembolso' },
    emptyLabel: 'Sin movimientos del accionista en el período consultado.',
    amountHeader: 'Monto'
  },
  contextBanner: null
})

/**
 * Public entry point. Returns the profile that the drawer should render for
 * the given account. Falls back to `transactional_account` for unknown
 * categories so the UI never breaks on a new instrument type.
 */
export const resolveInstrumentDetailPresentation = (
  account: TreasuryBankAccountOverview
): InstrumentDetailProfile => {
  const category = account.instrumentCategory

  if (category === 'credit_card') {
    return resolveCreditCardProfile(account)
  }

  if (category === 'shareholder_account') {
    return resolveShareholderAccountProfile(account)
  }

  // Default: transactional gramatica (bank_account, fintech, cash, payment_platform)
  // Future profiles (payroll_processor in TASK-706, loan_account, wallets) plug
  // here via additional branches.
  return resolveTransactionalAccountProfile(account)
}

/**
 * Helper for the drawer to pick the right tabler icon when no profile-specific
 * icon was set. Falls through to `INSTRUMENT_CATEGORY_ICONS` and ultimately
 * to `tabler-building-bank`.
 */
export const resolveInstrumentIcon = (account: Pick<TreasuryBankAccountOverview, 'instrumentCategory'>): string => {
  if (!account.instrumentCategory) return 'tabler-building-bank'

  return INSTRUMENT_CATEGORY_ICONS[account.instrumentCategory as InstrumentCategory] ?? 'tabler-building-bank'
}
