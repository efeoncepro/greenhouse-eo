/**
 * TASK-265 — Microcopy es-CL: states
 *
 * Estados operativos canónicos. Reemplazan status maps inline detectados
 * en 100 instancias durante el audit 2026-05-02. Sentence case, sin
 * punto final.
 */

import type { StatesCopy } from '../../types'

export const states: StatesCopy = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  draft: 'Borrador',
  inReview: 'En revisión',
  completed: 'Completado',
  cancelled: 'Cancelado',
  archived: 'Archivado',
  scheduled: 'Programado',
  paused: 'Pausado',
  expired: 'Vencido',
  blocked: 'Bloqueado',
  enabled: 'Habilitado',
  disabled: 'Deshabilitado',
  online: 'En línea',
  offline: 'Sin conexión',
  available: 'Disponible',
  unavailable: 'No disponible',
  paid: 'Pagado',
  unpaid: 'Sin pagar',
  partial: 'Parcial',
  overdue: 'Atrasado',
  failed: 'Falló',
  succeeded: 'Exitoso',
  inProgress: 'En curso',
  notStarted: 'Sin iniciar'
}
