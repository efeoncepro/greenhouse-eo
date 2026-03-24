export type NotificationChannel = 'in_app' | 'email'

export interface NotificationCategoryConfig {
  code: string
  label: string
  description: string
  icon: string
  audience: 'client' | 'collaborator' | 'internal' | 'admin'
  defaultChannels: NotificationChannel[]
  priority: 'low' | 'normal' | 'high'
}

export const NOTIFICATION_CATEGORIES: Record<string, NotificationCategoryConfig> = {

  // ─── Client-facing ───────────────────────────────────

  delivery_update: {
    code: 'delivery_update',
    label: 'Delivery updates',
    description: 'Asset aprobado, entregado o con cambios solicitados',
    icon: 'tabler-package',
    audience: 'client',
    defaultChannels: ['in_app'],
    priority: 'normal'
  },

  sprint_milestone: {
    code: 'sprint_milestone',
    label: 'Hitos de ciclo',
    description: 'Inicio, cierre y alertas de ciclos de producción',
    icon: 'tabler-flag',
    audience: 'client',
    defaultChannels: ['in_app'],
    priority: 'normal'
  },

  feedback_requested: {
    code: 'feedback_requested',
    label: 'Feedback solicitado',
    description: 'Se necesita tu revisión o aprobación',
    icon: 'tabler-message-circle',
    audience: 'client',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },

  report_ready: {
    code: 'report_ready',
    label: 'Reporte disponible',
    description: 'Tu reporte programado está listo para descargar',
    icon: 'tabler-file-analytics',
    audience: 'client',
    defaultChannels: ['in_app', 'email'],
    priority: 'low'
  },

  // ─── Collaborator-facing ─────────────────────────────

  leave_status: {
    code: 'leave_status',
    label: 'Permisos',
    description: 'Solicitud de permiso aprobada o rechazada',
    icon: 'tabler-calendar-event',
    audience: 'collaborator',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },

  payroll_ready: {
    code: 'payroll_ready',
    label: 'Liquidación disponible',
    description: 'Tu liquidación del período está lista para revisión',
    icon: 'tabler-currency-dollar',
    audience: 'collaborator',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },

  assignment_change: {
    code: 'assignment_change',
    label: 'Asignaciones',
    description: 'Nueva asignación o cambio de proyecto',
    icon: 'tabler-user-plus',
    audience: 'collaborator',
    defaultChannels: ['in_app'],
    priority: 'normal'
  },

  // ─── Internal/Admin ──────────────────────────────────

  ico_alert: {
    code: 'ico_alert',
    label: 'Alertas ICO',
    description: 'Métrica ICO cruzó umbral de semáforo',
    icon: 'tabler-alert-triangle',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },

  capacity_warning: {
    code: 'capacity_warning',
    label: 'Capacidad del equipo',
    description: 'Utilización sobre 90% o riesgo de sobreasignación',
    icon: 'tabler-users',
    audience: 'internal',
    defaultChannels: ['in_app'],
    priority: 'normal'
  },

  system_event: {
    code: 'system_event',
    label: 'Eventos del sistema',
    description: 'Nuevo usuario, sync fallido, cambio de configuración',
    icon: 'tabler-settings',
    audience: 'admin',
    defaultChannels: ['in_app'],
    priority: 'low'
  }
} as const

export function getCategoryConfig(code: string): NotificationCategoryConfig {
  const config = NOTIFICATION_CATEGORIES[code]

  if (!config) throw new Error(`Unknown notification category: ${code}`)

  return config
}

export function getCategoriesForAudience(audience: string): NotificationCategoryConfig[] {
  return Object.values(NOTIFICATION_CATEGORIES).filter(c => c.audience === audience)
}
