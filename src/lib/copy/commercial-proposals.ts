/**
 * TASK-1413 — copy del dominio Proposal Studio (ventana operador de propuestas).
 *
 * es-CL tuteo (UI operativa interna). Validado con greenhouse-ux-writing: sentence case,
 * verbos + objeto en CTAs, estados con texto (nunca solo color), cero literales en JSX.
 * Los labels de estado espejan la state machine del aggregate (12 estados, TENDER_STATES);
 * el terminal `won` se resuelve por `origin` — una venta directa no se «adjudica».
 */

export const GH_PROPOSALS = {
  header_title: 'Propuestas',
  header_subtitle: 'Estado, historial de versiones por artefacto y descarga de propuestas comerciales',

  // Tabla
  col_proposal: 'Propuesta',
  col_origin: 'Origen',
  col_state: 'Estado',
  col_deadline: 'Deadline',
  col_artifacts: 'Artefactos',
  col_updated: 'Actualizada',
  filter_all_states: 'Todos los estados',
  showing_count: (shown: number, total: number) => `Mostrando ${shown} de ${total} propuestas`,

  // Estados de la state machine (labels visibles; el tono semántico lo decide la view)
  state_intake: 'Intake',
  state_analyzing: 'Analizando RFP',
  state_analyzed: 'Analizada',
  state_fit_review: 'Decisión bid/no-bid',
  state_declined: 'Declinada',
  state_producing: 'En producción',
  state_base_ready: 'Base lista',
  state_packaging: 'Empaquetando',
  state_ready_to_submit: 'Lista para presentar',
  state_submitted: 'Presentada',
  state_won_public_tender: 'Adjudicada',
  state_won: 'Ganada',
  state_lost: 'Perdida',

  // Origen
  origin_public_tender: 'Licitación pública',
  origin_private_rfp: 'RFP privado',
  origin_direct_sales: 'Venta directa',

  // Estados de superficie
  empty_title: 'Aún no hay propuestas',
  empty_body:
    'Las propuestas nacen desde el intake del Proposal Studio (API o agente gobernado). Cuando exista la primera, acá vas a ver su estado, sus versiones y sus descargas.',
  error_title: 'No pudimos cargar las propuestas',
  error_body: 'Verifica tu conexión e intenta de nuevo.',
  retry_cta: 'Reintentar',
  versions_unavailable: 'El historial de versiones no está disponible en este momento. La lista sigue vigente.',
  no_artifacts: 'Sin artefactos todavía',

  // Sidecar
  sidecar_versions_title: 'Artefactos por tipo',
  sidecar_history_title: 'Historial de estado',
  sidecar_close_aria: 'Cerrar el detalle de la propuesta',
  version_current: 'Vigente',
  audience_internal: 'Interno',
  audience_internal_tooltip: 'Documento de uso interno de Efeonce: no se comparte con el cliente.',
  download_cta: 'Descargar',
  download_aria: (kind: string, version: number) => `Descargar ${kind} versión ${version}`,
  deadline_assumed_tooltip: 'Deadline asumido: las bases no lo declaran con certeza.',

  // Kinds de artefacto (espejo del enum ProposalAssetKind)
  kind_rfp_source: 'Bases / RFP',
  kind_fillable_template: 'Plantilla de las bases',
  kind_diagnostic: 'Diagnóstico',
  kind_technical_offer: 'Oferta técnica',
  kind_economic_offer: 'Oferta económica',
  kind_admissibility_matrix: 'Matriz de admisibilidad',
  kind_deck: 'Deck',
  kind_other_doc: 'Otro documento',

  // Timeline de transiciones
  transition_by_member: 'por el equipo',
  transition_by_system: 'automática',
  transition_by_cli: 'por consola'
} as const
