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
import type { ProcessorComponentizationStatus, TreasuryProcessorDigest } from '@/lib/finance/processor-digest'
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

/**
 * TASK-776 — Modos temporales canonicos del drawer de cuenta.
 *
 * Todo drawer/dashboard de finance que muestre agregaciones temporales DEBE
 * declarar su modo via este enum. Cada modo tiene semantica clara:
 *
 *   - `snapshot`: rolling window (default 30 dias) — caso de uso "que pasa hoy".
 *     KPIs + chart 12m + lista ultimos N dias. NO requiere year+month.
 *   - `period`: un mes calendario especifico — caso de uso "estoy cerrando Mayo".
 *     Filtra movimientos al year+month exacto. KPIs muestran cierre del periodo.
 *   - `audit`: historico completo desde anchor OTB — caso de uso "auditoria".
 *     Movimientos desde genesis_date del active OTB. Sin filtro mes/window.
 */
export type TemporalMode = 'snapshot' | 'period' | 'audit'

export interface TemporalDefaults {
  /** Modo a usar cuando el caller no override (drawer abre por primera vez). */
  mode: TemporalMode
  /** Solo aplica si mode='snapshot'. Default 30. */
  windowDays?: number
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
  /**
   * TASK-776 — Default temporal mode + window for this instrument category.
   * If not declared, drawer falls back to mode='period' (legacy behavior).
   */
  temporalDefaults?: TemporalDefaults
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
    contextBanner: null,
    // TASK-776 — bank_account: caso de uso "que paso recientemente". Default
    // snapshot rolling 30 dias. Cierre mensual via mode='period' explicito.
    temporalDefaults: { mode: 'snapshot', windowDays: 30 }
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
      : null,
    // TASK-776 — credit_card: caso de uso "que pase con la TC esta semana".
    // Default snapshot rolling 30 dias. Cierre del ciclo TC via mode='period'.
    temporalDefaults: { mode: 'snapshot', windowDays: 30 }
  }
}

/**
 * TASK-714b — Sign + label canónico para shareholder_account (CCA).
 *
 * Convención liability (TASK-703 sign inversion ya aplicada en
 * `materializeAccountBalance`):
 *   - `incoming` (settlement leg ENTRA al CCA) → REDUCE closing_balance.
 *     Ejemplo: la empresa transfiere desde Santander al CCA Julio Reyes.
 *     Semánticamente: la empresa devolvió plata al accionista (pago de deuda)
 *     o adelantó plata que el accionista deberá rendir.
 *     Label correcto: "Reembolso al accionista" / "Pago al accionista".
 *
 *   - `outgoing` (settlement leg SALE del CCA) → AUMENTA closing_balance.
 *     Ejemplo: un expense_payment con `payment_account_id=CCA` paga un
 *     proveedor desde la cuenta del accionista.
 *     Semánticamente: la empresa usó plata del accionista para pagar el
 *     gasto, generando deuda (la empresa le debe al accionista lo que usó).
 *     Label correcto: "Aporte del accionista" / "Cargo a CCA".
 *
 * KPI saldo:
 *   - closing > 0 → empresa debe al accionista (deuda pendiente).
 *   - closing < 0 → accionista debe a la empresa (sobrepago / saldo a favor).
 *   - closing = 0 → cuenta saldada.
 *
 * Pre-fix (bug TASK-714 introduced 2026-04-28): los labels estaban
 * invertidos — `incoming` se mostraba como "Aporte" y `outgoing` como
 * "Reembolso", lo opuesto del efecto contable real. Confirmado en vivo
 * con CCA Julio Reyes 2026-04: closing -$933,826 (accionista debe) con
 * inflows de $1,949,078 que el UI mostraba como "Aportes" cuando
 * realmente eran reembolsos al accionista (transferencias Santander → CCA).
 */
const resolveShareholderAccountProfile = (account: TreasuryBankAccountOverview): InstrumentDetailProfile => {
  const closing = account.closingBalance
  const empresaDebe = closing > 0
  const accionistaDebe = closing < 0

  const saldoLabel = empresaDebe
    ? 'Empresa debe al accionista'
    : accionistaDebe
      ? 'Accionista debe a la empresa'
      : 'Cuenta saldada'

  // Magnitud absoluta para que el operador lea "$933,826 — Accionista debe a
  // la empresa" en lugar de un negativo ambiguo. El KPI banner narra la
  // dirección.
  const saldoMagnitude = Math.abs(closing)

  return {
    profileKey: 'shareholder_account',
    drawerTitle: 'Detalle de cuenta accionista',
    drawerSubtitle: 'Posición bilateral entre empresa y accionista. Aportes, reembolsos y ajustes.',
    identityFields: [
      { label: 'Cuenta', value: account.accountName },
      { label: 'Moneda', value: account.currency }
    ],
    kpis: [
      {
        key: 'closingBalance',
        title: 'Saldo actual',
        value: saldoMagnitude,
        subtitle: saldoLabel,
        avatarIcon: 'tabler-user-dollar',
        // empresa debe → warning (la empresa tiene una obligación pendiente).
        // accionista debe → info (cuenta a favor de la empresa).
        // saldada → success.
        avatarColor: empresaDebe ? 'warning' : accionistaDebe ? 'info' : 'success'
      },
      {
        key: 'periodOutflows',
        title: 'Aportes del accionista',
        value: account.periodOutflows,
        subtitle: 'Movimientos que aumentan deuda con el accionista',
        avatarIcon: 'tabler-arrow-down-left',
        avatarColor: 'info'
      },
      {
        key: 'periodInflows',
        title: 'Reembolsos al accionista',
        value: account.periodInflows,
        subtitle: 'Movimientos que reducen deuda con el accionista',
        avatarIcon: 'tabler-arrow-up-right',
        avatarColor: 'secondary'
      }
    ],
    chart: {
      title: 'Últimos 12 meses',
      subtitle: 'Aportes del accionista (+) vs reembolsos al accionista (−)',
      inflowLabel: 'Reembolsos al accionista',
      inflowColor: PRIMARY_HEX,
      outflowLabel: 'Aportes del accionista',
      outflowColor: SUCCESS_HEX
    },
    movements: {
      sectionTitle: 'Movimientos del accionista',
      sectionSubtitle: 'Aportes, reembolsos y ajustes sobre la cuenta corriente bilateral',
      // incoming al CCA = la empresa devolvió plata = reembolso al accionista.
      // outgoing del CCA = se usó plata del accionista = aporte del accionista.
      directionLabels: { incoming: 'Reembolso al accionista', outgoing: 'Aporte del accionista' },
      emptyLabel: 'Sin movimientos del accionista en el período consultado.',
      amountHeader: 'Monto'
    },
    contextBanner: null,
    // TASK-776 — shareholder_account (CCA): caso de uso "auditoria historica
    // completa del accionista". Default audit (desde anchor OTB) — todos los
    // aportes/reembolsos visibles sin filtrar por mes.
    temporalDefaults: { mode: 'audit' }
  }
}

const COMPONENTIZATION_LABEL: Record<ProcessorComponentizationStatus, string> = {
  componentized: 'Desglose completo',
  pending_componentization: 'Desglose pendiente',
  none: 'Sin pagos del período'
}

const COMPONENTIZATION_AVATAR_COLOR: Record<ProcessorComponentizationStatus, AvatarColor> = {
  componentized: 'success',
  pending_componentization: 'warning',
  none: 'secondary'
}

const formatProcessorIdentity = (
  account: TreasuryBankAccountOverview,
  digest: TreasuryProcessorDigest | null
): InstrumentIdentityField[] => {
  const fields: InstrumentIdentityField[] = [
    { label: 'Procesador', value: account.accountName }
  ]

  if (digest && digest.payerAccounts.length > 0) {
    const primaryPayer = digest.payerAccounts[0]

    fields.push({
      label: digest.payerAccounts.length === 1 ? 'Cuenta pagadora' : 'Cuentas pagadoras',
      value: digest.payerAccounts.length === 1
        ? primaryPayer.accountName
        : `${primaryPayer.accountName} +${digest.payerAccounts.length - 1}`
    })
  }

  fields.push({ label: 'Moneda', value: account.currency })

  return fields
}

/**
 * TASK-706 — `payroll_processor` accounts surface processor activity, NOT a
 * bank ledger. The KPI row leads with operational primitives (payments
 * processed, amount processed, componentization status) and the drawer body
 * renders a list of processed payments instead of bank-style movements.
 *
 * The cash always remains visible in the real payer account (santander-clp
 * for Previred); this profile narrates the processor side without
 * duplicating cash.
 */
const resolveProcessorTransitProfile = (
  account: TreasuryBankAccountOverview,
  digest: TreasuryProcessorDigest | null
): InstrumentDetailProfile => {
  const status: ProcessorComponentizationStatus = digest?.componentizationStatus ?? 'none'
  const paymentCount = digest?.paymentCount ?? 0
  const processedAmount = digest?.processedAmount ?? 0
  const primaryPayer = digest?.payerAccounts[0] ?? null

  const banner: InstrumentDetailProfile['contextBanner'] = (() => {
    if (status === 'none') {
      return {
        tone: 'info',
        text: `${account.accountName} no es una cuenta bancaria con saldo propio. Es un procesador operacional: el cash siempre vive en la cuenta pagadora real. No se detectaron pagos en el período consultado.`
      }
    }

    if (status === 'pending_componentization') {
      return {
        tone: 'warning',
        text: `Hay pagos detectados desde ${primaryPayer?.accountName ?? 'la cuenta pagadora'}, pero el desglose previsional aún no está completo. El monto total ya está reflejado en caja; solo falta la componentización por cotizante / institución.`
      }
    }

    // componentized — confirmar visualmente que el cash sí salió del banco
    return {
      tone: 'info',
      text: `Pagos del período componentizados. El cash salió desde ${primaryPayer?.accountName ?? 'la cuenta pagadora'}; este procesador solo refleja la actividad operativa.`
    }
  })()

  return {
    profileKey: 'processor_transit',
    drawerTitle: `Procesador ${account.accountName}`,
    drawerSubtitle: 'Pagos previsionales procesados, cuenta pagadora real y estado de desglose. No tiene saldo propio.',
    identityFields: formatProcessorIdentity(account, digest),
    kpis: [
      {
        key: 'paymentCount',
        title: 'Pagos del período',
        value: paymentCount,
        subtitle: paymentCount === 0
          ? 'Sin pagos detectados'
          : paymentCount === 1
            ? 'Pago detectado'
            : `${paymentCount} pagos detectados`,
        avatarIcon: 'tabler-receipt-2',
        avatarColor: paymentCount > 0 ? 'primary' : 'secondary'
      },
      {
        key: 'processedAmount',
        title: 'Monto procesado',
        value: processedAmount,
        subtitle: primaryPayer
          ? `Cash desde ${primaryPayer.accountName}`
          : 'Sin cuenta pagadora detectada',
        avatarIcon: 'tabler-cash-banknote',
        avatarColor: 'info'
      },
      {
        key: 'componentizationStatus',
        title: 'Estado del desglose',
        // Use null so the drawer renders the status label string from `subtitle`
        // and the avatar tone, instead of formatting a number.
        value: null,
        subtitle: COMPONENTIZATION_LABEL[status],
        avatarIcon: status === 'componentized'
          ? 'tabler-check'
          : status === 'pending_componentization'
            ? 'tabler-progress-alert'
            : 'tabler-circle-dashed',
        avatarColor: COMPONENTIZATION_AVATAR_COLOR[status]
      }
    ],
    chart: {
      title: 'Procesamiento de los últimos 12 meses',
      subtitle: 'Pagos detectados por mes (no es saldo bancario)',
      inflowLabel: 'Pagos procesados',
      inflowColor: SUCCESS_HEX,
      outflowLabel: 'Sin uso',
      outflowColor: WARNING_HEX
    },
    movements: {
      sectionTitle: 'Pagos del procesador',
      sectionSubtitle: 'Cada fila es un pago detectado en una cuenta pagadora real.',
      directionLabels: { incoming: 'Procesado', outgoing: 'Procesado' },
      emptyLabel: status === 'none'
        ? `No hay pagos de ${account.accountName} en el período consultado.`
        : 'No hay pagos detectados todavía. Cuando llegue la cartola, este timeline se enriquece automáticamente.',
      amountHeader: 'Monto procesado'
    },
    contextBanner: banner,
    // TASK-776 — processor_transit (Deel/Stripe/etc): caso de uso "cierre
    // mensual de comisiones procesador". Default period (mes seleccionado).
    temporalDefaults: { mode: 'period' }
  }
}

/**
 * Public entry point. Returns the profile that the drawer should render for
 * the given account. Falls back to `transactional_account` for unknown
 * categories so the UI never breaks on a new instrument type.
 *
 * `digest` is optional and only consumed for the `processor_transit` profile.
 * Other profiles ignore it.
 */
export const resolveInstrumentDetailPresentation = (
  account: TreasuryBankAccountOverview,
  digest?: TreasuryProcessorDigest | null
): InstrumentDetailProfile => {
  const category = account.instrumentCategory

  if (category === 'credit_card') {
    return resolveCreditCardProfile(account)
  }

  if (category === 'shareholder_account') {
    return resolveShareholderAccountProfile(account)
  }

  if (category === 'payroll_processor') {
    return resolveProcessorTransitProfile(account, digest ?? null)
  }

  // Default: transactional gramatica (bank_account, fintech, cash, payment_platform)
  // Future profiles (loan_account, wallets) plug here via additional branches.
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
