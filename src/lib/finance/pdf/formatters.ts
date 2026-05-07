import 'server-only'

import { formatCurrency as formatLocaleCurrency, formatNumber } from '@/lib/format'

export const formatDateDMY = (iso: string | null): string => {
  if (!iso) return '—'
  const value = iso.slice(0, 10)
  const parts = value.split('-')

  if (parts.length !== 3) return value

  const [y, m, d] = parts

  return `${d}/${m}/${y}`
}

export const formatCurrency = (value: number, currency: string): string => {
  return formatLocaleCurrency(value, currency.toUpperCase() as 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN' | 'BRL')
}

export const formatQuantity = (value: number): string => {
  if (!Number.isFinite(value)) return '0'

  if (Number.isInteger(value)) return String(value)

  return formatNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

export const formatRate = (value: number): string =>
  formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })

export const todayLabel = (): string => {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const y = now.getFullYear()

  return `${d}/${m}/${y}`
}
