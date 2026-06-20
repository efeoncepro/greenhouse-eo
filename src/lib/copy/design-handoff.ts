import type {
  DesignHandoffEvidenceType,
  DesignHandoffKind,
  DesignHandoffLinkType,
  DesignHandoffNodeSnapshotStatus,
  DesignHandoffPriority,
  DesignHandoffStatus
} from '@/lib/design-system/handoff/types'

export const DESIGN_HANDOFF_COPY = {
  pageTitle: 'Design handoff',
  pageDescription:
    'Control operacional para pasar nodos Figma aprobados a implementación con owners, evidencia, drift y allowlist gobernado.',
  overline: 'Evidence Ledger',
  tabs: {
    ledger: 'Ledger',
    intake: 'Nuevo nodo',
    allowlist: 'Allowlist',
    drift: 'Drift'
  },
  sections: {
    actionRequired: 'Requieren acción',
    readyForReview: 'Listos para review',
    recentImplemented: 'Implementados recientes',
    intake: 'Registrar intención aprobada',
    allowlist: 'Archivos Figma aprobados',
    drift: 'Signals de confiabilidad',
    evidence: 'Evidencia',
    workItems: 'Trazabilidad',
    commandCenter: 'Command center',
    implementationReadiness: 'Readiness de implementación'
  },
  helper: {
    emptyAllowlist:
      'El allowlist de archivos de producto está vacío. La UI queda lista, pero registrar nodos reales requiere aprobar un file_key de producto.',
    emptyLedger: 'Todavía no hay handoffs registrados.',
    emptyLedgerBody: 'Cuando un archivo de producto esté aprobado, este cockpit muestra cola, evidencia y drift.',
    figmaUrlPlaceholder: 'https://www.figma.com/design/...?...node-id=...',
    implementedSurface: 'Obligatoria para marcar como implementado.',
    noSelection: 'Selecciona una entrada del ledger para operar sin salir del contexto.',
    previewBlocked: 'El archivo aún no está aprobado para handoff de producto.',
    previewEmpty: 'Pega una URL de Figma para revisar el nodo.',
    previewUnavailable: 'Preview no disponible',
    driftUnavailable: 'Carga los signals para leer missing evidence, node drift y orphan surfaces.',
    commandFailure: 'No se pudo completar el comando.'
  },
  actions: {
    refresh: 'Refrescar',
    register: 'Registrar handoff',
    savePlanning: 'Guardar planificación',
    assignOwners: 'Asignar owners',
    attachEvidence: 'Adjuntar evidencia',
    linkWorkItem: 'Vincular work item',
    verifyNode: 'Verificar nodo Figma',
    startImplementation: 'Tomar para implementar',
    sendReview: 'Enviar a review',
    markImplemented: 'Marcar implementado',
    archive: 'Archivar',
    upsertAllowlist: 'Aprobar archivo',
    deprecateAllowlist: 'Deprecar',
    loadDrift: 'Cargar signals'
  },
  messages: {
    loaded: 'Registro actualizado.',
    created: 'Handoff registrado con verificación inicial.',
    stateChanged: 'Estado actualizado.',
    planningSaved: 'Planificación actualizada.',
    ownersSaved: 'Owners actualizados.',
    evidenceAttached: 'Evidencia adjuntada.',
    linkAttached: 'Work item vinculado.',
    nodeVerified: 'Nodo Figma verificado.',
    allowlistSaved: 'Archivo aprobado para handoff.',
    allowlistDeprecated: 'Archivo deprecado.',
    driftLoaded: 'Signals cargados.'
  }
} as const

export const DESIGN_HANDOFF_STATUS_LABELS: Record<DesignHandoffStatus, string> = {
  proposed: 'Propuesto',
  in_implementation: 'En implementación',
  in_review: 'En revisión',
  implemented: 'Implementado',
  archived: 'Archivado'
}

export const DESIGN_HANDOFF_KIND_LABELS: Record<DesignHandoffKind, string> = {
  page: 'Página',
  component: 'Componente'
}

export const DESIGN_HANDOFF_PRIORITY_LABELS: Record<DesignHandoffPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente'
}

export const DESIGN_HANDOFF_LINK_TYPE_LABELS: Record<DesignHandoffLinkType, string> = {
  task: 'Task',
  pull_request: 'Pull request',
  commit: 'Commit',
  deployment: 'Deployment',
  route: 'Ruta',
  figma_comment: 'Comentario Figma',
  external: 'Externo'
}

export const DESIGN_HANDOFF_EVIDENCE_TYPE_LABELS: Record<DesignHandoffEvidenceType, string> = {
  gvc_capture: 'GVC capture',
  runtime_route: 'Ruta runtime',
  visual_review: 'Review visual',
  accessibility_review: 'Review a11y',
  manual_exception: 'Excepción manual'
}

export const DESIGN_HANDOFF_NODE_STATUS_LABELS: Record<DesignHandoffNodeSnapshotStatus, string> = {
  reachable: 'Reachable',
  renamed: 'Renombrado',
  deleted: 'Eliminado',
  stale: 'Stale',
  unavailable: 'No disponible',
  unknown: 'Sin verificar'
}
