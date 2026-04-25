import type { ProductSyncConflictField } from './types'

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Santiago'
})

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
})

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Sin registro'

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Sin registro'
  }

  return dateTimeFormatter.format(parsed)
}

export const formatRelativeAge = (value: string | null | undefined) => {
  if (!value) return 'Sin registro'

  const diffMs = Date.now() - Date.parse(value)

  if (!Number.isFinite(diffMs)) return 'Sin registro'
  if (diffMs < 1000 * 60) return 'Hace menos de 1 min'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `Hace ${diffHours} h`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays < 30) {
    return `Hace ${diffDays} dia${diffDays === 1 ? '' : 's'}`
  }

  const diffMonths = Math.floor(diffDays / 30)

  return `Hace ${diffMonths} mes${diffMonths === 1 ? '' : 'es'}`
}

export const formatCurrency = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return 'Sin valor'

  return moneyFormatter.format(value)
}

export const formatBooleanState = (value: boolean | null | undefined) => {
  if (value == null) return 'Sin valor'

  return value ? 'Si' : 'No'
}

export const formatFieldValue = (field: string, value: unknown) => {
  if (value == null) return 'Sin valor'

  if (field === 'defaultUnitPrice' && typeof value === 'number') {
    return formatCurrency(value)
  }

  if (field === 'isArchived' && typeof value === 'boolean') {
    return value ? 'Archivado' : 'Activo'
  }

  if (typeof value === 'boolean') {
    return formatBooleanState(value)
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed.length > 0 ? trimmed : 'Sin valor'
  }

  return JSON.stringify(value)
}

export const formatSnapshotValue = (value: unknown) => {
  if (value == null) return 'Sin valor'
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'Sin valor'
  if (typeof value === 'string') return value.trim() || 'Sin valor'

  return JSON.stringify(value)
}

export const fieldLabelFromKey = (field: string) => {
  const labels: Record<string, string> = {
    productName: 'Nombre del producto',
    description: 'Descripcion',
    defaultUnitPrice: 'Precio unitario base',
    isArchived: 'Archivado',
    hubspotProductId: 'Ancla HubSpot',
    productCode: 'SKU Greenhouse'
  }

  return labels[field] ?? field
}

export const formatConflictFieldLabel = (field: ProductSyncConflictField) => fieldLabelFromKey(field)
