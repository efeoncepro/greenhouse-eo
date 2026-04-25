import 'server-only'

export const formatDateDMY = (iso: string | null): string => {
  if (!iso) return '—'
  const value = iso.slice(0, 10)
  const parts = value.split('-')

  if (parts.length !== 3) return value

  const [y, m, d] = parts

  return `${d}/${m}/${y}`
}

const getCurrencySymbol = (currency: string): string => {
  const upper = currency.toUpperCase()

  if (upper === 'CLP' || upper === 'CLF') return '$'
  if (upper === 'USD') return 'US$'

  return `${upper} `
}

export const formatCurrency = (value: number, currency: string): string => {
  const upper = currency.toUpperCase()
  const symbol = getCurrencySymbol(upper)

  if (upper === 'CLP') {
    return `${symbol}${new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))}`
  }

  return `${symbol}${new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`
}

export const formatQuantity = (value: number): string => {
  if (!Number.isFinite(value)) return '0'

  if (Number.isInteger(value)) return String(value)

  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

export const formatRate = (value: number): string =>
  new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(value)

export const todayLabel = (): string => {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const y = now.getFullYear()

  return `${d}/${m}/${y}`
}
