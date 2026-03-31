'use client'

export const formatMoney = (amount: number | null | undefined, currency = 'CLP') => {
  if (amount == null) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount)
}

export const formatPct = (value: number | null | undefined) =>
  value == null ? '—' : `${Math.round(value)}%`

export const formatRatio = (value: number | null | undefined) =>
  value == null ? '—' : value.toFixed(1)

export const titleize = (value: string | null | undefined) =>
  value
    ? value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
    : '—'
