import type { PayrollCurrency, PeriodStatus, PayRegime } from '@/types/payroll'

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
  exported: { label: 'Exportado', color: 'primary', icon: 'tabler-file-export' }
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

export const otdSemaphore = (pct: number | null) => {
  if (pct == null) return { label: 'Sin data', color: 'default' as const }
  if (pct >= 89) return { label: 'Califica', color: 'success' as const }

  return { label: 'No califica', color: 'default' as const }
}

export const rpaSemaphore = (rpa: number | null) => {
  if (rpa == null) return { label: 'Sin data', color: 'default' as const }
  if (rpa < 2.0) return { label: 'Califica', color: 'success' as const }

  return { label: 'No califica', color: 'default' as const }
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
