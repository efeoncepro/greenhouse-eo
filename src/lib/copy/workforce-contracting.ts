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
    aiDisabled: 'La redacción IA está deshabilitada en este ambiente.',
    sectionsHeader: 'Sección',
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
