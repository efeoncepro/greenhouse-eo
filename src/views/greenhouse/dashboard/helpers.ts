'use client'

import type { ThemeColor } from '@core/types'

export const CLIENT_STATUS_COLORS = {
  active: '#2196F3',
  review: '#FF9800',
  changes: '#F44336',
  completed: '#4CAF50'
} as const

const absoluteDateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
})

const updatedDateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Santiago'
})

const integerFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0
})

const decimalFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})

const getUtcDate = (value: string) => new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`)

export const formatInteger = (value: number) => integerFormatter.format(value)

export const formatDecimal = (value: number) => decimalFormatter.format(value)

export const formatPercent = (value: number | null) => (value === null ? '0%' : `${formatInteger(Math.round(value))}%`)

export const formatFte = (hours: number) => `${formatDecimal(hours / 160)} FTE`

export const formatHours = (hours: number) => `${formatInteger(hours)} horas`

export const formatAbsoluteDate = (value: string | null) => {
  if (!value) {
    return 'Sin fecha visible'
  }

  return absoluteDateFormatter.format(getUtcDate(value))
}

export const formatRelativeDate = (value: string | null) => {
  if (!value) {
    return 'Sin actividad reciente'
  }

  const target = getUtcDate(value)
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dateUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate())
  const diffDays = Math.floor((today - dateUtc) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'hoy'
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  if (diffDays < 14) return 'hace 1 semana'
  if (diffDays < 21) return 'hace 2 semanas'

  return formatAbsoluteDate(value)
}

export const formatUpdatedAt = (value: string | null) => {
  if (!value) {
    return 'Datos actualizados: sin sincronización registrada'
  }

  return `Datos actualizados: ${updatedDateFormatter.format(new Date(value))}`
}

export const getRelationshipSummary = (months: number) => {
  if (months <= 0) return 'Relación activa: menos de 1 mes.'
  if (months === 1) return 'Relación activa: 1 mes.'

  return `Relación activa: ${formatInteger(months)} meses.`
}

export const getRpaStatus = (value: number | null): {
  tone: ThemeColor | 'default'
  label: string
  icon: string
} => {
  if (value === null || value === 0) {
    return { tone: 'default', label: 'Sin actividad este mes', icon: 'tabler-circle-dashed' }
  }

  if (value <= 1.5) {
    return { tone: 'success', label: 'Saludable', icon: 'tabler-check' }
  }

  if (value <= 2.5) {
    return { tone: 'warning', label: 'Bajo observación', icon: 'tabler-alert-triangle' }
  }

  return { tone: 'error', label: 'Requiere atención', icon: 'tabler-alert-circle' }
}

export const getOtdStatus = (value: number): {
  tone: ThemeColor | 'default'
  label: string
  icon: string
} => {
  if (value >= 90) {
    return { tone: 'success', label: 'Saludable', icon: 'tabler-check' }
  }

  if (value >= 70) {
    return { tone: 'warning', label: 'Bajo observación', icon: 'tabler-alert-triangle' }
  }

  if (value === 0) {
    return { tone: 'default', label: 'Sin actividad este mes', icon: 'tabler-circle-dashed' }
  }

  return { tone: 'error', label: 'Requiere atención', icon: 'tabler-alert-circle' }
}

export const getReviewStatus = (reviewCount: number, openComments: number) => {
  const pending = reviewCount + openComments

  if (pending <= 0) {
    return { tone: 'success' as const, label: 'Sin pendientes', icon: 'tabler-check' }
  }

  return { tone: 'info' as const, label: 'Feedback pendiente', icon: 'tabler-message-circle' }
}

export const getTrend = (current: number | null, previous: number | null): 'positive' | 'negative' | 'neutral' => {
  if (current === null || previous === null) return 'neutral'
  if (current > previous) return 'positive'
  if (current < previous) return 'negative'

  return 'neutral'
}

export const formatTrendValue = (current: number | null, previous: number | null, suffix = '') => {
  if (current === null || previous === null) return '0'

  return `${formatInteger(Math.abs(Math.round(current - previous)))}${suffix}`
}

export const formatTeamMemberInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')

export const getProjectAttentionLabel = (count: number) => {
  if (count <= 0) return 'Todos los proyectos operan normalmente.'
  if (count === 1) return '1 proyecto con alertas activas.'

  return `${formatInteger(count)} proyectos con alertas activas.`
}
