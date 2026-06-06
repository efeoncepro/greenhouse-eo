export const GH_WORKFORCE_CONTRACTING = {
  productName: 'Workforce Contracting',
  studioName: 'Workforce Contracting Studio',
  mockupTitle: 'Workforce Contracting',
  runtimeTitle: 'Contratos laborales',
  runtimeSubtitle:
    'Prepara cartas oferta y contratos laborales bilingües con redacción asistida, validación determinista, aprobación humana y firma futura.',
  commandCenter: 'Centro operativo',
  guidedBuilder: 'Flujo guiado',
  bilingualReview: 'Revisión bilingüe',
  collaboratorViewer: 'Portal colaborador',
  requiredLanguages: 'ES + EN obligatorios',
  authoritativeSpanish: 'Español legal prevalente',
  aiGuardrail: 'Claude redacta, Greenhouse valida',
  createDocument: 'Nueva carta o contrato',
  approveBilingualDraft: 'Aprobar borrador bilingüe',
  reviewBilingualDraft: 'Revisar borrador bilingüe',
  generateBilingualDraft: 'Generar borrador bilingüe',
  requestChanges: 'Solicitar cambios',
  compare: 'Comparar',
  showSources: 'Mostrar fuentes',
  previousIssue: 'Hallazgo anterior',
  nextIssue: 'Siguiente hallazgo',
  generatePdf: 'Generar PDF',
  readyForSignature: 'Listo para firma',
  pendingSignature: 'Firma pendiente',
  blockedByData: 'Bloqueado por datos',
  parityOk: 'Paridad OK',
  parityWarning: 'Atención',
  parityBlocked: 'Bloqueante',
  // Runtime — Command Center
  filters: {
    all: 'Todos',
    offers: 'Cartas oferta',
    contracts: 'Contratos',
    chile: 'Chile',
    international: 'Internacional',
    risk: 'Riesgo'
  },
  columns: {
    person: 'Persona',
    document: 'Documento',
    pack: 'Pack jurisdiccional',
    status: 'Estado',
    parity: 'Paridad',
    risk: 'Riesgo',
    nextAction: 'Próxima acción',
    start: 'Inicio'
  },
  detail: {
    title: 'Detalle del caso',
    pack: 'Pack jurisdiccional',
    authoritative: 'Idioma autoritativo',
    signableFormat: 'Formato firmable',
    drafts: 'Borradores',
    timeline: 'Línea de tiempo',
    validation: 'Validación',
    noBlockers: 'Sin bloqueantes',
    blockers: 'Bloqueantes',
    selectHint: 'Elige un caso de la cola para ver su detalle.',
    notAvailable: '—'
  },
  // Honest states (state-design)
  states: {
    loading: 'Cargando casos…',
    loadingDetail: 'Cargando detalle…',
    emptyTitle: 'Aún no hay casos',
    emptyBody: 'Cuando se cree una carta oferta o un contrato laboral, aparecerá acá.',
    emptyFilteredTitle: 'Sin resultados para este filtro',
    emptyFilteredBody: 'Ajusta los filtros o vuelve a “Todos”.',
    clearFilters: 'Ver todos',
    errorTitle: 'No pudimos cargar el detalle',
    errorBody: 'Reintenta en unos segundos.',
    retry: 'Reintentar'
  },
  // Create (Guided Builder)
  create: {
    title: 'Nueva carta o contrato',
    subtitle: 'Abre un caso bilingüe. La redacción y la firma llegan en pasos siguientes.',
    kind: 'Tipo de documento',
    subject: 'Persona',
    subjectPlaceholder: 'Busca por nombre…',
    subjectHint: 'Escribe al menos 2 letras para buscar.',
    pack: 'Pack jurisdiccional',
    startDate: 'Fecha de inicio',
    legalRef: 'Referencia de revisión legal',
    legalRefHint: 'Este pack exige revisión legal (mín. 10 caracteres).',
    entityMissing: 'No se pudo resolver la entidad operadora. Contacta a Admin.',
    submit: 'Abrir caso',
    submitting: 'Abriendo…',
    success: 'Caso abierto.',
    error: 'No se pudo abrir el caso.',
    selectSubject: 'Selecciona una persona.',
    selectPack: 'Selecciona un pack jurisdiccional.'
  },
  // Bilingual Review Desk
  review: {
    selectFromQueue: 'Selecciona un caso en el Centro operativo para revisarlo.',
    noDraftTitle: 'Sin borrador todavía',
    noDraftBody: 'Genera el borrador bilingüe para revisar cláusula por cláusula.',
    generateDraft: 'Generar borrador IA',
    generatingDraft: 'Generando borrador…',
    aiDisabled: 'La redacción IA está deshabilitada en este ambiente.',
    // Estado "la IA está pensando" — Claude tarda ~1-2 min redactando ES+EN.
    aiThinkingTitle: 'Redactando con IA…',
    aiThinkingHint:
      'Claude redacta el español legal y su traducción al inglés; Greenhouse valida la paridad. Puede tomar hasta un par de minutos.',
    aiThinkingSteps: [
      'Reuniendo los datos del caso…',
      'Redactando en español (versión legal)…',
      'Traduciendo al inglés (referencia)…',
      'Validando la paridad bilingüe…'
    ],
    sectionsHeader: 'Cláusula',
    langEs: 'Español',
    langEsTag: 'Versión legal',
    langEsHint: 'Esta versión prevalece legalmente',
    langEn: 'Inglés',
    langEnTag: 'Referencia',
    langEnHint: 'Traducción de apoyo, no vinculante',
    pendingFieldsChip: 'por definir',
    missingLanguageChip: 'Falta un idioma',
    approve: 'Aprobar par bilingüe',
    approving: 'Aprobando…',
    approved: 'Borrador aprobado.',
    approveError: 'No se pudo aprobar.',
    voided: 'Caso anulado.',
    voidError: 'No se pudo anular.',
    voidConfirm: 'reason',
    structuralParity: 'Paridad estructural',
    generating: 'Generando PDF…',
    generatePdfDone: 'PDF generado.',
    generatePdfError: 'No se pudo generar el PDF.',
    // TASK-1024 — send to electronic signature (ZapSign). The worker is the only e-signer; the
    // employer representative's signature is already pre-stamped in the rendered PDF.
    sendToSignature: 'Enviar a firma',
    sending: 'Enviando a firma…',
    sentToSignature: 'Enviado a firma. El colaborador recibirá un correo para firmar.',
    sendToSignatureError: 'No se pudo enviar a firma.',
    sendToSignatureHint:
      'Se envía al colaborador para firma electrónica. La firma del representante de Efeonce ya está incorporada en el documento.',
    signatureStatusSent: 'Pendiente de firma del colaborador',
    signatureStatusSigned: 'Firmado por el colaborador',
    signatureStatusFailed: 'La firma falló o expiró. Reenvía cuando el documento esté listo.',
    downloadSigned: 'Descargar firmado'
  },
  // Modes not yet built (locked / honest)
  locked: {
    badge: 'Próximamente',
    builderTitle: 'Flujo guiado de creación',
    builderBody:
      'El asistente de creación + redacción bilingüe llega en una entrega siguiente (TASK-1021). Por ahora, los casos se gestionan desde el Centro operativo.',
    reviewTitle: 'Revisión bilingüe',
    reviewBody:
      'La comparación ES+EN cláusula por cláusula del borrador llega en una entrega siguiente (TASK-1021). La validación y los bloqueantes ya se ven en el detalle del caso.'
  },
  actions: {
    void: 'Anular',
    openDraft: 'Ver borrador',
    pendingEpic: 'Disponible al integrar firma (EPIC-001)'
  },
  kindLabels: {
    offer_letter: 'Carta oferta',
    employment_contract: 'Contrato laboral'
  },
  // Etiquetas humanas de los packs jurisdiccionales (NUNCA el código crudo en UI).
  packLabels: {
    CL_CHILE_DEPENDENT_V1: 'Chile · Dependiente',
    CL_FOREIGNER_WORKING_IN_CHILE_V1: 'Chile · Extranjero',
    INTERNATIONAL_INTERNAL_REMOTE_V1: 'Internacional · Remoto interno'
  } as Record<string, string>,
  // Etiquetas humanas es-CL de las cláusulas/secciones (NUNCA el código snake_case crudo en UI).
  // Cubre el vocabulario canónico de los packs (registry.ts) + alias que la IA puede emitir.
  sectionLabels: {
    place_and_date: 'Lugar y fecha',
    parties_identification: 'Identificación de las partes',
    services_nature_and_location: 'Naturaleza y lugar de los servicios',
    remuneration: 'Remuneración',
    compensation: 'Remuneración',
    working_hours: 'Jornada laboral',
    contract_term: 'Vigencia del contrato',
    additional_pacts_and_benefits: 'Pactos y beneficios adicionales',
    benefits: 'Beneficios',
    remote_work_setup: 'Modalidad de trabajo remoto',
    governing_law_and_jurisdiction: 'Ley aplicable y jurisdicción',
    visa_work_authorization: 'Visa y autorización de trabajo',
    work_authorization: 'Autorización de trabajo',
    residence_permit: 'Permiso de residencia',
    travel_clause_if_applicable: 'Cláusula de viajes (si aplica)',
    confidentiality: 'Confidencialidad',
    intellectual_property: 'Propiedad intelectual',
    data_protection: 'Protección de datos',
    termination: 'Término del contrato',
    probation: 'Período de prueba',
    non_compete: 'No competencia',
    pay_method: 'Forma de pago',
    pay_period: 'Periodicidad de pago',
    signatures: 'Firmas',
    signature: 'Firmas'
  } as Record<string, string>,
  // Etiquetas humanas es-CL del origen del borrador (NUNCA el token crudo 'claude_ai').
  sourceLabels: {
    claude_ai: 'Redactado con IA',
    manual: 'Redacción manual'
  } as Record<string, string>,
  riskLabels: {
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto'
  },
  parityLabels: {
    pass: 'ES+EN OK',
    fail: 'ES+EN diverge',
    unknown: 'ES+EN sin evaluar'
  },
  signatureLabels: {
    not_applicable: 'No aplica',
    not_ready: 'Sin preparar',
    ready_for_pdf: 'Listo para PDF',
    ready_for_signature: 'Listo para firma',
    pending_signature: 'Firma pendiente',
    signed: 'Firmado'
  },
  // Case statuses (offer 11 + contract 19) — es-CL
  statusLabels: {
    // offer
    draft: 'Borrador',
    ai_drafted: 'Borrador IA',
    pending_internal_review: 'Pendiente de revisión',
    approved: 'Aprobada',
    sent: 'Enviada',
    viewed: 'Vista',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    expired: 'Vencida',
    withdrawn: 'Retirada',
    converted_to_contract: 'Convertida a contrato',
    // contract
    intake_pending: 'Intake pendiente',
    validation_blocked: 'Bloqueado por validación',
    pending_review: 'Pendiente de revisión',
    legal_review: 'Revisión legal',
    internal_approved: 'Aprobado interno',
    ready_for_pdf: 'Listo para PDF',
    ready_for_signature: 'Listo para firma',
    sent_for_signature: 'Enviado a firma',
    partially_signed: 'Parcialmente firmado',
    fully_signed: 'Firmado',
    registered_external: 'Registrado',
    active: 'Vigente',
    voided: 'Anulado',
    superseded: 'Reemplazado',
    signature_failed: 'Firma fallida',
    needs_amendment: 'Requiere addenda'
  },
  nextActionLabels: {
    create_draft: 'Crear borrador',
    review_bilingual_draft: 'Revisar borrador bilingüe',
    approve_offer: 'Aprobar oferta',
    send_offer: 'Enviar oferta',
    await_candidate: 'Esperar al candidato',
    convert_to_contract: 'Convertir a contrato',
    resolve_blockers: 'Resolver bloqueantes',
    advance_review: 'Avanzar revisión',
    approve_contract: 'Aprobar contrato',
    generate_pdf: 'Generar PDF',
    send_to_signature: 'Enviar a firma',
    remind_signer: 'Recordar firma',
    register_external: 'Registrar (DT/REL)',
    mark_active: 'Marcar vigente',
    retry_signature: 'Reintentar firma',
    none: 'Sin acción'
  },
  // Collaborator viewer (/my/offers + /my/contracts) — honest, read-only, bilingual
  collaborator: {
    offersTitle: 'Mis ofertas',
    offersSubtitle: 'Tus cartas oferta y su estado. Acá ves el avance; el texto legal vive en el documento.',
    contractsTitle: 'Mis contratos',
    contractsSubtitle: 'Tus contratos laborales y su estado de firma.',
    bilingual: 'Español e inglés',
    readOnlyNote: 'Esto es solo lectura. El texto legal no se edita desde aquí.',
    nextStep: 'Próximo paso',
    openSignature: 'Abrir firma',
    downloadSigned: 'Descargar PDF firmado',
    comingSoon: 'Disponible pronto',
    emptyOffersTitle: 'No tienes ofertas',
    emptyOffersBody: 'Cuando se te envíe una carta oferta, aparecerá acá.',
    emptyContractsTitle: 'No tienes contratos',
    emptyContractsBody: 'Cuando se prepare tu contrato laboral, aparecerá acá.',
    errorTitle: 'No pudimos cargar tus documentos',
    errorBody: 'Reintenta en unos segundos.',
    retry: 'Reintentar',
    // coarse status groups (collaborator-facing — agrupa los estados internos)
    statusPreparing: 'En preparación',
    statusPendingSignature: 'Pendiente de firma',
    statusReadyToSign: 'Lista para firmar',
    statusDone: 'Completado',
    statusActive: 'Vigente',
    statusClosed: 'Cerrada',
    signed: 'Firmado'
  },
  aria: {
    prototypeMode: 'Modo del Workforce Contracting',
    legalReadinessProgress: 'Progreso de validación legal',
    commandQueueTable: 'Tabla de casos de Workforce Contracting',
    bilingualReviewTable: 'Tabla de revisión bilingüe de contrato'
  },
  // TASK-1023 — chrome del documento firmable (PDF bilingüe es-CL + en-US).
  document: {
    prevalentBannerEs: 'Versión en español · prevalente',
    referenceBannerEn: 'English version · reference',
    termsTitleEs: 'Resumen de la oferta',
    termsTitleEn: 'Offer summary',
    signatureEmployer: 'Por el empleador',
    signatureWorker: 'El trabajador',
    signatureWitness: 'Ministro de fe',
    representativeRole: 'Representante legal',
    preStamped: 'Firma electrónica pre-estampada',
    signViaZapsignEs: 'Firma vía ZapSign',
    signViaZapsignEn: 'Signature via ZapSign',
    offerAcceptEs: 'Acepto la oferta · firma vía ZapSign',
    offerAcceptEn: 'I accept the offer · signature via ZapSign',
    watermarkProyecto: 'PROYECTO',
    watermarkVoided: 'ANULADO',
    watermarkRejected: 'RECHAZADO',
    watermarkExpired: 'EXPIRADO',
    watermarkSuperseded: 'REEMPLAZADO'
  }
} as const

/**
 * Etiqueta humana es-CL de una cláusula/sección del documento.
 * Resuelve el vocabulario canónico (sectionLabels) y, para cualquier código
 * emitido por la IA fuera del catálogo, humaniza el snake_case (NUNCA muestra el código crudo).
 */
export const contractingSectionLabel = (code: string): string => {
  const known = GH_WORKFORCE_CONTRACTING.sectionLabels[code]

  if (known) return known

  const humanized = code
    .replace(/_/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

  return humanized.charAt(0).toUpperCase() + humanized.slice(1)
}

/** Etiqueta humana es-CL del origen del borrador (claude_ai → "Redactado con IA"). */
export const contractingSourceLabel = (source: string): string =>
  GH_WORKFORCE_CONTRACTING.sourceLabels[source] ?? source
