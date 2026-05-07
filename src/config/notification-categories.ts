import { getMicrocopy } from '@/lib/copy'
import type { NotificationCategoryCopyCode } from '@/lib/copy'

export type NotificationChannel = 'in_app' | 'email'

export interface NotificationCategoryConfig {
  code: NotificationCategoryCopyCode
  label: string
  description: string
  icon: string
  audience: 'client' | 'collaborator' | 'internal' | 'admin'
  defaultChannels: NotificationChannel[]
  priority: 'low' | 'normal' | 'high'
}

const LEGACY_NOTIFICATION_CATEGORY_COPY: Record<
  NotificationCategoryCopyCode,
  Pick<NotificationCategoryConfig, 'label' | 'description'>
> = {
  delivery_update: {
    label: 'Delivery updates',
    description: 'Asset aprobado, entregado o con cambios solicitados'
  },
  sprint_milestone: {
    label: 'Hitos de ciclo',
    description: 'Inicio, cierre y alertas de ciclos de producción'
  },
  feedback_requested: {
    label: 'Feedback solicitado',
    description: 'Se necesita tu revisión o aprobación'
  },
  report_ready: {
    label: 'Reporte disponible',
    description: 'Tu reporte programado está listo para descargar'
  },
  leave_status: {
    label: 'Permisos',
    description: 'Solicitud de permiso aprobada o rechazada'
  },
  leave_review: {
    label: 'Revisión de permisos',
    description: 'Solicitudes pendientes de revisión por supervisor o HR'
  },
  payroll_ready: {
    label: 'Liquidación disponible',
    description: 'Tu liquidación del período está lista para revisión'
  },
  assignment_change: {
    label: 'Asignaciones',
    description: 'Nueva asignación o cambio de proyecto'
  },
  ico_alert: {
    label: 'Alertas ICO',
    description: 'Métrica ICO cruzó umbral de semáforo'
  },
  capacity_warning: {
    label: 'Capacidad del equipo',
    description: 'Utilización sobre 90% o riesgo de sobreasignación'
  },
  payroll_ops: {
    label: 'Operación de nómina',
    description: 'Hitos operativos de cálculo y revisión del período oficial'
  },
  finance_alert: {
    label: 'Alertas financieras',
    description: 'Pagos registrados, gastos significativos y cierre de período'
  },
  system_event: {
    label: 'Eventos del sistema',
    description: 'Nuevo usuario, sync fallido, cambio de configuración'
  }
}

const resolveCategoryCopy = (code: NotificationCategoryCopyCode) => {
  return getMicrocopy().emails.notificationCategories[code] ?? LEGACY_NOTIFICATION_CATEGORY_COPY[code]
}

const withCategoryCopy = <T extends Omit<NotificationCategoryConfig, 'label' | 'description'>>(
  config: T
): T & Pick<NotificationCategoryConfig, 'label' | 'description'> => {
  const copy = resolveCategoryCopy(config.code)

  return {
    ...config,
    label: copy.label,
    description: copy.description
  }
}

export const NOTIFICATION_CATEGORIES: Record<NotificationCategoryCopyCode, NotificationCategoryConfig> = {

  // ─── Client-facing ───────────────────────────────────

  delivery_update: withCategoryCopy({
    code: 'delivery_update',
    icon: 'tabler-package',
    audience: 'client',
    defaultChannels: ['in_app'],
    priority: 'normal'
  }),

  sprint_milestone: withCategoryCopy({
    code: 'sprint_milestone',
    icon: 'tabler-flag',
    audience: 'client',
    defaultChannels: ['in_app'],
    priority: 'normal'
  }),

  feedback_requested: withCategoryCopy({
    code: 'feedback_requested',
    icon: 'tabler-message-circle',
    audience: 'client',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  }),

  report_ready: withCategoryCopy({
    code: 'report_ready',
    icon: 'tabler-file-analytics',
    audience: 'client',
    defaultChannels: ['in_app', 'email'],
    priority: 'low'
  }),

  // ─── Collaborator-facing ─────────────────────────────

  leave_status: withCategoryCopy({
    code: 'leave_status',
    icon: 'tabler-calendar-event',
    audience: 'collaborator',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  }),

  leave_review: withCategoryCopy({
    code: 'leave_review',
    icon: 'tabler-calendar-time',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  }),

  payroll_ready: withCategoryCopy({
    code: 'payroll_ready',
    icon: 'tabler-currency-dollar',
    audience: 'collaborator',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  }),

  assignment_change: withCategoryCopy({
    code: 'assignment_change',
    icon: 'tabler-user-plus',
    audience: 'collaborator',
    defaultChannels: ['in_app'],
    priority: 'normal'
  }),

  // ─── Internal/Admin ──────────────────────────────────

  ico_alert: withCategoryCopy({
    code: 'ico_alert',
    icon: 'tabler-alert-triangle',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  }),

  capacity_warning: withCategoryCopy({
    code: 'capacity_warning',
    icon: 'tabler-users',
    audience: 'internal',
    defaultChannels: ['in_app'],
    priority: 'normal'
  }),

  payroll_ops: withCategoryCopy({
    code: 'payroll_ops',
    icon: 'tabler-calculator',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  }),

  finance_alert: withCategoryCopy({
    code: 'finance_alert',
    icon: 'tabler-chart-bar',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  }),

  system_event: withCategoryCopy({
    code: 'system_event',
    icon: 'tabler-settings',
    audience: 'admin',
    defaultChannels: ['in_app'],
    priority: 'low'
  })
} as const

export function isNotificationCategoryCode(code: unknown): code is NotificationCategoryCopyCode {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(NOTIFICATION_CATEGORIES, code)
}

export function getCategoryConfig(code: string): NotificationCategoryConfig {
  if (!isNotificationCategoryCode(code)) throw new Error(`Unknown notification category: ${code}`)

  const config = NOTIFICATION_CATEGORIES[code]

  if (!config) throw new Error(`Unknown notification category: ${code}`)

  return config
}

export function getCategoriesForAudience(audience: string): NotificationCategoryConfig[] {
  return Object.values(NOTIFICATION_CATEGORIES).filter(c => c.audience === audience)
}
