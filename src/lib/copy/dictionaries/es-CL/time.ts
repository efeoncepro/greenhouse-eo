/**
 * TASK-265 — Microcopy es-CL: time
 *
 * Tiempo relativo. Para fechas absolutas, usar `Intl.DateTimeFormat` con
 * `Locale` (TASK-429 cubrirá utilities completas locale-aware).
 */

import type { TimeCopy } from '../../types'

export const time: TimeCopy = {
  justNow: 'Recién',
  minutesAgo: n => (n === 1 ? 'Hace 1 minuto' : `Hace ${n} minutos`),
  hoursAgo: n => (n === 1 ? 'Hace 1 hora' : `Hace ${n} horas`),
  daysAgo: n => (n === 1 ? 'Hace 1 día' : `Hace ${n} días`),
  yesterday: 'Ayer',
  today: 'Hoy',
  tomorrow: 'Mañana'
}
