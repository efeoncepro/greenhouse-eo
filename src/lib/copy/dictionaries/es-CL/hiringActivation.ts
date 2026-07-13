import type { HiringActivationCopy } from '../../types'

export const hiringActivation: HiringActivationCopy = {
  eyebrow: 'Lifecycle / Onboarding & Offboarding',
  title: 'Onboarding & Offboarding',
  subtitle: 'Convierte contrataciones aprobadas en colaboradores operativos sin saltarte readiness, onboarding ni trazabilidad HRIS.',
  tabs: {
    onboarding: 'Onboarding',
    offboarding: 'Offboarding',
    readyHires: 'Contrataciones listas'
  },
  navigation: {
    hr: 'HR',
    lifecycle: 'Onboarding & Offboarding',
    overview: 'Overview',
    templates: 'Plantillas'
  },
  kpis: {
    queue: 'En cola de activación',
    queueHint: 'Handoffs aprobados',
    ready: 'Listas para activar',
    readyHint: 'Confirmado en detalle',
    blockers: 'Con blockers',
    blockersHint: 'Requieren seguimiento',
    activated: 'Activadas este mes',
    activatedHint: 'Según cola disponible',
    unavailable: 'Sin dato'
  },
  queue: {
    title: 'Cola de activación',
    subtitle: 'contrataciones aprobadas, listas para revisar',
    emptyTitle: 'Sin contrataciones pendientes',
    emptyBody: 'Cuando Hiring apruebe un handoff internal_hire, aparecerá aquí para activar su paso a HRIS.',
    flagOffTitle: 'Bridge de activación deshabilitado',
    flagOffBody: 'La cola existe, pero los flags HIRING_ACTIVATION_ENABLED / HIRING_HANDOFF_BRIDGES_ENABLED no están activos en este ambiente.',
    errorTitle: 'No se pudo cargar la cola',
    retry: 'Reintentar'
  },
  detail: {
    title: 'Detalle de activación',
    pendingTitle: 'Selecciona una contratación',
    pendingBody: 'Abre un caso de la cola para revisar su journey, readiness y próximas acciones.',
    people360: 'Ver People 360',
    source: 'Fuente',
    handoff: 'Handoff',
    decision: 'Decisión',
    entity: 'Entidad legal',
    manager: 'Manager',
    area: 'Área',
    journeyTitle: 'Journey de contratación',
    readinessTitle: 'Readiness HRIS',
    readinessDegraded: 'El readiness completo aparece después de crear o vincular el colaborador.',
    blockerTitle: 'Bloqueo activo',
    noBlockers: 'Sin blockers críticos detectados.',
    activateDisabled: 'Activar se habilita sólo cuando Workforce Activation marca readiness OK.',
    activateReady: 'Readiness completo. Puedes cerrar el bridge de activación.',
    completeWorkforceProfile: 'Completa la ficha laboral en Workforce Activation antes de activar.'
  },
  journey: {
    selection: 'Selección aprobada',
    handoff: 'Handoff recibido',
    member: 'Colaborador creado',
    onboarding: 'Onboarding abierto',
    activation: 'Activación HRIS',
    done: 'Listo',
    waiting: 'Pendiente',
    blocked: 'Bloqueado'
  },
  readiness: {
    ready: 'Listo',
    warning: 'Advertencia',
    blocked: 'Bloqueado',
    notApplicable: 'No aplica',
    noRowsTitle: 'Sin checklist detallado todavía',
    score: 'Score readiness',
    blockers: 'Blockers',
    warnings: 'Advertencias'
  },
  statuses: {
    pending_hr_review: 'Pendiente revisión HR',
    blocked: 'Bloqueada',
    member_created: 'Colaborador creado',
    onboarding_open: 'Onboarding abierto',
    ready_to_activate: 'Lista para activar',
    active: 'Activa',
    cancelled: 'Cancelada',
    approved: 'Aprobada',
    in_setup: 'En preparación',
    completed: 'Completada',
    pending: 'Pendiente'
  },
  blockedReasons: {
    ambiguous_identity: 'Identidad ambigua',
    member_conflict: 'Conflicto de colaborador',
    member_already_active: 'Colaborador ya activo',
    onboarding_template_missing: 'Falta plantilla de onboarding',
    handoff_not_approved: 'Handoff sin aprobar',
    legal_data_missing: 'Faltan datos legales',
    unknown: 'Bloqueo por revisar'
  },
  actions: {
    review: 'Revisar contratación',
    createMember: 'Crear colaborador',
    openOnboarding: 'Abrir onboarding',
    resolveBlocker: 'Resolver blocker',
    activate: 'Activar',
    cancel: 'Cancelar proceso',
    close: 'Cerrar',
    confirm: 'Confirmar',
    goToWorkforceActivation: 'Ir a Workforce Activation',
    openTemplates: 'Abrir plantillas',
    loading: 'Procesando…'
  },
  dialogs: {
    activateTitle: '¿Activar esta contratación?',
    activateBody: 'Se cerrará el bridge de Hiring con la evidencia del colaborador y onboarding ya preparados. Esta acción no reemplaza la ficha laboral.',
    cancelTitle: 'Cancelar activación',
    cancelBody: 'Registra un motivo para dejar trazabilidad del cierre manual.',
    cancelReasonLabel: 'Motivo de cancelación',
    resolveTitle: 'Resolución de blocker',
    resolveBody: 'Este blocker necesita un command backend con payload gobernado. Hasta que TASK-1400 cierre, esta UI sólo puede guiarte a la surface correcta.',
    resolvePendingTask: 'Follow-up backend: TASK-1400.'
  },
  feedback: {
    reviewOk: 'Contratación tomada para revisión.',
    createMemberOk: 'Colaborador creado o vinculado.',
    openOnboardingOk: 'Onboarding abierto.',
    completeOk: 'Bridge de activación cerrado.',
    cancelOk: 'Activación cancelada.',
    commandError: 'No se pudo completar la acción.',
    loadError: 'No se pudo cargar Hiring Activation.'
  },
  aria: {
    activationTabs: 'Carriles de Onboarding & Offboarding',
    closeDetail: 'Cerrar detalle de activación',
    closeDialog: 'Cerrar diálogo',
    queue: 'Cola de contrataciones listas',
    readiness: 'Checklist de readiness HRIS'
  }
}
