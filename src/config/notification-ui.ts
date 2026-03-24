import type { ThemeColor } from '@core/types'

export const CATEGORY_ICONS: Record<string, { icon: string; color: ThemeColor }> = {
  delivery_update: { icon: 'tabler-package', color: 'info' },
  sprint_milestone: { icon: 'tabler-flag', color: 'primary' },
  feedback_requested: { icon: 'tabler-message-circle', color: 'warning' },
  report_ready: { icon: 'tabler-file-analytics', color: 'success' },
  leave_status: { icon: 'tabler-calendar-event', color: 'info' },
  payroll_ready: { icon: 'tabler-currency-dollar', color: 'success' },
  assignment_change: { icon: 'tabler-user-plus', color: 'primary' },
  ico_alert: { icon: 'tabler-alert-triangle', color: 'error' },
  capacity_warning: { icon: 'tabler-users', color: 'warning' },
  system_event: { icon: 'tabler-settings', color: 'secondary' }
}

export const AUDIENCE_LABELS: Record<string, string> = {
  client: 'Cliente',
  collaborator: 'Colaborador',
  internal: 'Interno',
  admin: 'Administrador'
}

export const timeAgo = (dateStr: string): string => {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  if (diffMs < 60_000) return 'Ahora'

  const mins = Math.floor(diffMs / 60_000)

  if (mins < 60) return `Hace ${mins}m`

  const hours = Math.floor(mins / 60)

  if (hours < 24) return `Hace ${hours}h`

  const days = Math.floor(hours / 24)

  if (days < 7) return `Hace ${days}d`

  return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

export const getTimeGroup = (dateStr: string): string => {
  const now = new Date()
  const date = new Date(dateStr)

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86_400_000)

  if (date >= todayStart) return 'Hoy'
  if (date >= yesterdayStart) return 'Ayer'
  if (date >= weekStart) return 'Esta semana'

  return 'Anteriores'
}
