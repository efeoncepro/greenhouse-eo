/** Operator copy for the existing governed Nexa action card; no new composition. */
export const CLIENT_SERVICE_ENABLEMENT_COPY = {
  applyTitle: 'Habilitar servicios',
  applySummary: 'Se crearán las asignaciones indicadas. Las comprobaciones de apertura permanecen pendientes.',
  applyConfirm: 'Confirma las asignaciones de esta organización. El cambio queda registrado con tu usuario.',
  rollbackTitle: 'Compensar habilitación',
  rollbackSummary: 'Se pausarán las asignaciones creadas por este recibo, si no tuvieron cambios posteriores.',
  rollbackConfirm: 'Confirma la pausa de estas asignaciones. Se conservarán el historial y los módulos anteriores.',
  cancel: 'Cancelar',
  organization: 'Organización',
  modules: 'Módulos',
  people: 'Personas',
  checks: 'Comprobaciones pendientes',
  assignments: 'Asignaciones',
  blocked: 'La habilitación tiene bloqueos pendientes. Revisa el preview del servicio antes de continuar.',
  stale: 'El preview cambió. Solicita uno nuevo antes de confirmar.',
  applied: 'Habilitación registrada. La apertura operativa conserva sus comprobaciones pendientes.',
  compensated: 'Compensación registrada; se pausaron las asignaciones del recibo.'
} as const
