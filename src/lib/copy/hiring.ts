/**
 * TASK-356 — Copy es-CL del dominio Hiring / ATS (HiringHandoff).
 *
 * Contrato de presentación de los códigos estables del handoff: 356 es dueño del enum
 * (`HiringHandoffState` + `HiringHandoffBlockedReason`); la UI que lo renderiza es
 * TASK-770 (cola internal_hire) y superficies Person 360. La UI localiza SIEMPRE desde
 * el código — NUNCA muestra el código crudo ni prosa improvisada (mismo bug class que
 * cerró canonicalErrorResponse).
 */

export const GH_HIRING_HANDOFF = {
  // Estados del handoff (HiringHandoffState → label visible)
  state_pending: 'Pendiente de aprobación',
  state_approved: 'Aprobado',
  state_in_setup: 'En preparación',
  state_completed: 'Completado',
  state_blocked: 'Bloqueado',
  state_cancelled: 'Cancelado',

  // Razones de bloqueo (HiringHandoffBlockedReason → mensaje visible).
  // Estructura: qué pasó + qué hacer (patrón de error canónico).
  blocked_destination_not_supported:
    'Este destino aún no tiene equipo receptor en Greenhouse. Coordina el traspaso fuera del portal y cancela o actualiza el handoff.',
  blocked_missing_legal_entity:
    'Falta la entidad legal propuesta. Completa la decisión con la entidad esperada antes de aprobar.',
  blocked_missing_start_date:
    'Falta la fecha tentativa de inicio. Actualiza la decisión con la fecha esperada antes de aprobar.',
  blocked_ambiguous_identity:
    'La identidad de la persona es ambigua. Pide a People Ops revisar el perfil antes de continuar.',
  blocked_decision_superseded_after_approval:
    'La decisión cambió después de aprobar este handoff. Revisa la nueva decisión y resuelve manualmente.',
  blocked_decision_revoked:
    'La selección fue revocada después de aprobar este handoff. Revisa el estado con el equipo de reclutamiento.',
  blocked_prerequisites_open:
    'Hay prerrequisitos abiertos. Complétalos antes de aprobar el handoff.',

  // Destinos (HiringFulfillmentMode → label visible)
  destination_internal_reassignment: 'Reasignación interna',
  destination_internal_hire: 'Contratación interna',
  destination_staff_augmentation: 'Staff augmentation',
  destination_contractor: 'Contractor',
  destination_partner: 'Partner',

  // Acciones del command (CTAs para 770)
  action_approve: 'Aprobar handoff',
  action_setup: 'Iniciar preparación',
  action_complete: 'Completar handoff',
  action_cancel: 'Cancelar handoff',

  // Cola internal_hire (read-model consumido por 770)
  queue_title: 'Listos para onboarding',
  queue_empty:
    'No hay contrataciones internas esperando onboarding. Cuando apruebes un handoff de contratación interna, aparecerá aquí.',
  queue_bridges_disabled:
    'La cola de handoffs aún no está habilitada en este ambiente.',
} as const

export type GhHiringHandoffCopyKey = keyof typeof GH_HIRING_HANDOFF

/** Label del estado desde el código estable (fallback seguro al código si llega uno nuevo). */
export const hiringHandoffStateLabel = (state: string): string =>
  (GH_HIRING_HANDOFF as Record<string, string>)[`state_${state}`] ?? state

/** Mensaje de bloqueo desde el código estable (fallback genérico, nunca el código crudo). */
export const hiringHandoffBlockedReasonLabel = (reason: string): string =>
  (GH_HIRING_HANDOFF as Record<string, string>)[`blocked_${reason}`] ??
  'El handoff está bloqueado. Revisa el detalle con el equipo de reclutamiento.'

/** Label del destino desde el código estable. */
export const hiringHandoffDestinationLabel = (destination: string): string =>
  (GH_HIRING_HANDOFF as Record<string, string>)[`destination_${destination}`] ?? destination
