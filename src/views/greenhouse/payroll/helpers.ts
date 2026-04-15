import type { PayrollCurrency, PayrollEntry, PeriodStatus, PayRegime } from '@/types/payroll'

// ── Currency formatting ──────────────────────────────────────────────

export const formatCurrency = (amount: number | null | undefined, currency: PayrollCurrency): string => {
  if (amount == null) return '—'

  if (currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const buildPayrollCurrencySummary = (
  entries: PayrollEntry[],
  selectAmount: (entry: PayrollEntry) => number
): {
  hasMixedCurrency: boolean
  primaryCurrency: PayrollCurrency
  totals: Record<PayrollCurrency, number>
  summaryLabel: string
} => {
  const totals = entries.reduce<Record<PayrollCurrency, number>>(
    (acc, entry) => {
      acc[entry.currency] += selectAmount(entry)

      return acc
    },
    { CLP: 0, USD: 0 }
  )

  const currencies = (['CLP', 'USD'] as const).filter(currency =>
    entries.some(entry => entry.currency === currency)
  )

  const primaryCurrency = currencies[0] ?? 'CLP'
  const hasMixedCurrency = currencies.length > 1

  const summaryLabel = hasMixedCurrency
    ? currencies.map(currency => `${currency}: ${formatCurrency(totals[currency], currency)}`).join(' · ')
    : formatCurrency(totals[primaryCurrency], primaryCurrency)

  return {
    hasMixedCurrency,
    primaryCurrency,
    totals,
    summaryLabel
  }
}

export const formatPercent = (value: number | null | undefined): string => {
  if (value == null) return '—'

  return `${value.toFixed(1)}%`
}

export const formatDecimal = (value: number | null | undefined, decimals = 2): string => {
  if (value == null) return '—'

  return value.toFixed(decimals)
}

// ── Period helpers ───────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const formatPeriodLabel = (year: number, month: number): string => {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export const formatPeriodIdLabel = (periodId: string): string => {
  const [y, m] = periodId.split('-')

  return formatPeriodLabel(Number(y), Number(m))
}

// ── Status ──────────────────────────────────────────────────────────

type StatusConfig = {
  label: string
  color: 'default' | 'warning' | 'info' | 'success' | 'primary'
  icon: string
}

export const periodStatusConfig: Record<PeriodStatus, StatusConfig> = {
  draft: { label: 'Borrador', color: 'default', icon: 'tabler-file-text' },
  calculated: { label: 'Calculado', color: 'info', icon: 'tabler-calculator' },
  approved: { label: 'Aprobado', color: 'success', icon: 'tabler-circle-check' },
  exported: { label: 'Exportado', color: 'primary', icon: 'tabler-file-export' },
  reopened: { label: 'Reabierto', color: 'warning', icon: 'tabler-arrow-back-up' }
}

// ── Regime ───────────────────────────────────────────────────────────

export const regimeLabel: Record<PayRegime, string> = {
  chile: 'CLP',
  international: 'USD'
}

export const regimeColor: Record<PayRegime, 'success' | 'info'> = {
  chile: 'success',
  international: 'info'
}

// ── KPI Semaphore ───────────────────────────────────────────────────

export const otdSemaphore = (pct: number | null, prorationFactor?: number | null) => {
  if (pct == null) return { label: 'Sin data', color: 'default' as const }
  if (pct >= 94) return { label: '100%', color: 'success' as const }

  if (pct >= 70) {
    const factorLabel = prorationFactor != null ? `${(prorationFactor * 100).toFixed(0)}%` : 'Prorrateo'

    return { label: factorLabel, color: 'warning' as const }
  }

  return { label: 'No califica', color: 'error' as const }
}

export const rpaSemaphore = (rpa: number | null, prorationFactor?: number | null) => {
  if (rpa == null) return { label: 'Sin data', color: 'default' as const }

  if (rpa <= 3) {
    const factorLabel = prorationFactor != null ? `${(prorationFactor * 100).toFixed(0)}%` : 'Califica'

    return { label: factorLabel, color: 'success' as const }
  }

  return { label: 'No califica', color: 'error' as const }
}

// ── Attendance formatting ───────────────────────────────────────────

export const formatAttendanceRatio = (present: number | null, total: number | null): string => {
  if (present == null || total == null) return '—'

  return `${present}/${total}`
}

export const formatFactor = (value: number | null): string => {
  if (value == null) return '—'

  return `${(value * 100).toFixed(0)}%`
}

// ── Timestamp formatting ────────────────────────────────────────────

export const formatTimestamp = (ts: string | null): string => {
  if (!ts) return '—'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(ts))
}
