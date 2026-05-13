/**
 * TASK-826 Slice 7 — Domain microcopy para /admin/client-portal/* surfaces.
 *
 * Operator-facing copy (EFEONCE_ADMIN). Español (es-CL), tuteo, sentence case.
 * Tono: profesional + claro + accionable. Mirror de GH_RELEASE_ADMIN shape.
 *
 * Pattern canonical: domain copy module per CLAUDE.md "Copy reutilizable por
 * dominio". NO duplicar strings en JSX — siempre referenciar este módulo.
 */

export const GH_CLIENT_PORTAL_ADMIN = {
  // Modules list page
  modules_title: 'Módulos asignados',
  modules_subtitle_template: (orgName: string) =>
    `Asignaciones del catálogo para ${orgName}`,

  modules_empty_title: 'Sin módulos asignados aún',
  modules_empty_body:
    'Cuando habilites el primer módulo client portal para esta organización, aparecerá aquí.',
  modules_loading_text: 'Cargando asignaciones…',

  // Catalog page
  catalog_page_title: 'Catálogo de módulos',
  catalog_page_subtitle:
    'Catálogo declarativo de módulos client portal disponibles (read-only V1.0)',
  catalog_empty_title: 'Catálogo vacío',
  catalog_empty_body:
    'No hay módulos activos en el catálogo. Revisa la migración seed TASK-824.',

  // Columns shared
  column_module: 'Módulo',
  column_status: 'Estado',
  column_source: 'Origen',
  column_applicability: 'Aplicabilidad',
  column_tier: 'Tier',
  column_effective_from: 'Vigente desde',
  column_effective_to: 'Vigente hasta',
  column_expires_at: 'Expira',
  column_actions: 'Acciones',
  column_pricing: 'Pricing',

  // Status labels
  status_label_pending: 'Pendiente',
  status_label_active: 'Activo',
  status_label_pilot: 'Piloto',
  status_label_paused: 'Pausado',
  status_label_expired: 'Expirado',
  status_label_churned: 'Dado de baja',

  // Source labels
  source_label_lifecycle_case_provision: 'Lifecycle case',
  source_label_commercial_terms_cascade: 'Cascada comercial',
  source_label_manual_admin: 'Admin manual',
  source_label_self_service_request: 'Self-service',
  source_label_migration_backfill: 'Backfill migración',
  source_label_default_business_line: 'BL por defecto',

  // Tier labels
  tier_label_standard: 'Standard',
  tier_label_addon: 'Add-on',
  tier_label_pilot: 'Pilot',
  tier_label_enterprise: 'Enterprise',
  tier_label_internal: 'Interno',

  // Actions
  action_enable: 'Habilitar módulo',
  action_pause: 'Pausar',
  action_resume: 'Reanudar',
  action_expire: 'Expirar',
  action_churn: 'Churn',
  action_close: 'Cerrar',
  action_confirm: 'Confirmar',
  action_cancel: 'Cancelar',

  // Confirmations
  confirm_pause_title: 'Pausar módulo',
  confirm_pause_body:
    '¿Pausar este módulo? El cliente dejará de verlo hasta que reanudes la asignación.',

  confirm_resume_title: 'Reanudar módulo',
  confirm_resume_body: '¿Reanudar este módulo? El cliente volverá a verlo de inmediato.',

  confirm_expire_title: 'Expirar módulo',
  confirm_expire_body:
    'Expirar marca la asignación como terminada. No se puede reactivar. Úsalo cuando termina un piloto o un período acordado.',

  confirm_churn_title: 'Dar de baja módulo',
  confirm_churn_body:
    'Dar de baja es terminal y definitivo (post-offboarding del cliente). No se puede reactivar. Si el cliente sigue activo, usa "Expirar".',
  confirm_churn_typing_label: 'Escribe el module_key para confirmar',

  // Enable dialog
  enable_dialog_title: 'Habilitar módulo nuevo',
  enable_dialog_subtitle: 'Asignar un módulo del catálogo a esta organización',
  enable_module_key_label: 'Módulo (selecciona del catálogo)',
  enable_source_label: 'Origen de la asignación',
  enable_status_label: 'Estado inicial',
  enable_effective_from_label: 'Vigente desde',
  enable_expires_at_label: 'Fecha de expiración',
  enable_expires_at_helper_pilot: 'Requerido cuando el estado inicial es Piloto.',
  enable_reason_label: 'Razón (opcional)',
  enable_override_toggle: 'Forzar asignación aunque no coincida el business line',
  enable_override_reason_label: 'Razón del override (≥ 20 caracteres)',
  enable_override_help:
    'Permite asignar este módulo aunque su aplicabilidad no coincida con el business line del cliente. Requiere razón ≥ 20 caracteres y queda registrado en el audit log.',

  // Errors
  error_load_failed: 'No pudimos cargar la información. Intenta nuevamente.',
  error_action_failed_template: (action: string) =>
    `No pudimos completar la acción "${action}". Revisa el detalle.`,
  error_validation_required_field_template: (field: string) =>
    `El campo "${field}" es requerido.`,
  error_business_line_mismatch:
    'El módulo no aplica al business_line canónico del cliente. Activa el override y declara una razón ≥ 20 caracteres para forzar.',

  // Feedback
  feedback_module_enabled: 'Módulo habilitado',
  feedback_module_paused: 'Módulo pausado',
  feedback_module_resumed: 'Módulo reanudado',
  feedback_module_expired: 'Módulo expirado',
  feedback_module_churned: 'Módulo dado de baja',
  feedback_idempotent_noop: 'Sin cambios — la asignación ya estaba en ese estado.'
} as const

export type ClientPortalAdminCopy = typeof GH_CLIENT_PORTAL_ADMIN
