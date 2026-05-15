/* ─────────────────── Identity — Person 360 Relationship Drift Reconciliation ─────────────────── */
// TASK-891 Slice 4 — Microcopy es-CL canonical para la surface
// `/admin/identity/drift-reconciliation`. Form admin auditado que cierra la
// relacion legacy `employee` + abre nueva `contractor` en una sola tx atomic.
// Reservado a EFEONCE_ADMIN (capability granular V1.0).
//
// Tono: es-CL operativo formal. Operador EFEONCE_ADMIN ejecuta accion
// cross-domain con audit trail. Sin emojis, sin saludos, sin "por favor".
// Validado por skill greenhouse-ux-writing.
//
// Spec: docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md

export const GH_PERSON_RELATIONSHIP_DRIFT_RECONCILE = {
  page: {
    breadcrumbAdmin: 'Admin',
    breadcrumbOperations: 'Operations',
    breadcrumbCurrent: 'Reconciliar drift'
  },
  card: {
    title: 'Reconciliar relación legal — Person 360',
    subtitle: 'Acción auditada · EFEONCE_ADMIN',
    avatarIcon: 'tabler-arrow-loop-right'
  },
  warningBanner: {
    title: 'Esta acción muta Person 360',
    body: 'Cierra la relación legal activa `employee` y abre una nueva `contractor` en una sola transacción auditada. Operación reservada a EFEONCE_ADMIN. No se revierte automáticamente — para deshacer hay que ejecutar una nueva reconciliación inversa que preserva el historial.'
  },
  form: {
    memberIdLabel: 'ID del colaborador (member_id)',
    memberIdPlaceholder: 'mem-xxx-xxx',
    memberIdHelper: 'Identificador del member runtime. Obtén el valor desde el reliability signal o People 360.',
    memberIdPrefilledHelper: 'Pre-llenado desde el reliability signal. Si no corresponde, ajusta antes de continuar.',
    contractorSubtypeLabel: 'Subtipo de la nueva relación',
    contractorSubtypeOptions: {
      contractor: 'Contractor estándar',
      honorarios: 'Honorarios'
    },
    contractorSubtypeHelper: 'Define el subtipo que se persiste en metadata_json de la nueva relación contractor.',
    reasonLabel: 'Motivo de la reconciliación',
    reasonPlaceholder:
      'Ej: María Camila Hoyos transicionó a contractor via Deel. Relación employee legacy cerrada per HR review 2026-05-14.',
    reasonHelper: 'Mínimo 20 caracteres. Queda en el audit log de ambas relaciones (notes + outbox events).',
    reasonError: 'El motivo debe tener al menos 20 caracteres.',
    externalCloseDateLabel: 'Fecha de cierre externa (opcional)',
    externalCloseDateHelper:
      'ISO YYYY-MM-DD. Útil para casos donde el cierre legal ocurrió en una fecha pasada. Si se omite, se usa hoy.',
    cancelButton: 'Cancelar',
    cancelHref: '/admin/operations',
    confirmButton: 'Confirmar reconciliación',
    confirmSaving: 'Reconciliando…'
  },
  result: {
    successTitle: 'Reconciliación completada',
    successBody: (closedId: string, openedId: string) =>
      `Relación legacy ${closedId} cerrada (status='ended'). Nueva relación contractor ${openedId} abierta (status='active'). Ambos eventos publicados en outbox.`,
    errorTitleGeneric: 'No se pudo completar la reconciliación',
    errorBodyGeneric:
      'Reintenta en unos segundos. Si el error persiste, contacta al equipo de plataforma con el ID del colaborador.'
  },
  errorMessages: {
    member_not_found: 'El colaborador no existe en el directorio.',
    member_inactive: 'El colaborador no está activo. La reconciliación solo opera sobre colaboradores activos.',
    member_missing_identity_profile:
      'El colaborador no tiene perfil de identidad enlazado. Completa la ficha laboral primero.',
    no_active_employee_relationship:
      'No hay relación laboral activa de tipo "employee" para este colaborador. No hay nada que reconciliar.',
    multiple_active_employee_relationships:
      'El colaborador tiene múltiples relaciones laborales activas como "employee". Reconciliar manualmente con HR antes de continuar.',
    invalid_contractor_subtype: 'El subtipo de contractor seleccionado no es válido.',
    invalid_external_close_date:
      'La fecha de cierre externa debe ser anterior o igual a hoy y posterior al inicio de la relación legal.',
    reason_too_short: 'El motivo debe tener al menos 20 caracteres.',
    invalid_payload: 'El cuerpo de la petición no es JSON válido.',
    invalid_member_id: 'memberId es requerido en la URL.',
    reconciliation_failed:
      'No se pudo reconciliar la relación legal del colaborador. Reintenta o pide soporte al equipo de plataforma.',
    forbidden: 'No tienes permisos para ejecutar esta acción (requiere EFEONCE_ADMIN).',
    unauthorized: 'Tu sesión expiró. Inicia sesión de nuevo para continuar.'
  }
} as const

export type GhPersonRelationshipDriftReconcileCopy = typeof GH_PERSON_RELATIONSHIP_DRIFT_RECONCILE
