/**
 * TASK-265 — Greenhouse Microcopy Foundation: types
 *
 * Capa dictionary-ready para microcopy funcional shared. Convive con
 * `src/config/greenhouse-nomenclature.ts` (product nomenclature + nav)
 * sin duplicarla.
 *
 * Locale-aware desde día uno (TASK-265 open question resuelta SÍ) para que
 * TASK-266 + TASK-428/429/430/431 puedan conectar locales reales sin
 * reescribir la API pública.
 *
 * Importable desde server y client (NO `import 'server-only'`). Los
 * dictionaries son data estática y se serializan correctamente al cliente.
 *
 * Spec canónica: docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md (sección Copy System)
 * Skill governance: ~/.claude/skills/greenhouse-ux-writing/skill.md
 */

/**
 * Locales soportados por la plataforma. `es-CL` es el default canónico
 * mientras Greenhouse opera como portal `es-only`. `en-US` queda como stub
 * para que TASK-266 lo active sin tocar la API pública.
 *
 * Cuando se agreguen más locales (TASK-266 / TASK-431), agregar al array y
 * crear `dictionaries/<locale>/index.ts` con paridad de namespaces.
 */
export const SUPPORTED_LOCALES = ['es-CL', 'en-US'] as const

import type { AssessmentAccessRotationNoticeSkip } from '@/lib/hiring/assessment/access-recovery/vocabulary'
import type {
  AssessmentAssignmentReasonCode,
  AssessmentAssignmentResult,
} from '@/types/hiring-assessment-policy'

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'es-CL'

/**
 * Namespaces canónicos del dictionary. Cada namespace agrupa microcopy
 * funcional shared que NO es nomenclatura de producto.
 *
 * Cuando agregues un namespace nuevo:
 *  1. Agregalo a este type
 *  2. Crea el archivo `dictionaries/<locale>/<namespace>.ts`
 *  3. Re-exporta en `dictionaries/<locale>/index.ts`
 *  4. Confirma paridad de claves entre todos los locales
 */
export type MicrocopyNamespace =
  | 'actions' // CTAs base: Guardar, Cancelar, Editar, Eliminar, Continuar, Volver, etc.
  | 'states' // Estados operativos: Activo, Pendiente, Aprobado, Rechazado, etc.
  | 'loading' // Loading/processing: Cargando..., Guardando..., Procesando..., etc.
  | 'empty' // Empty states: Sin datos, Sin resultados, No hay nada por aquí, etc.
  | 'months' // Meses abreviados (Ene/Feb/.../Dic) y completos (Enero/.../Diciembre)
  | 'aria' // aria-labels comunes para a11y
  | 'errors' // Mensajes de error genéricos shared
  | 'notFound' // Copy de la página 404 (full-page not-found)
  | 'notAuthorized' // Copy de la página 401 (full-page not-authorized)
  | 'comingSoon' // Copy de la página "Coming Soon" (full-page launch placeholder)
  | 'underMaintenance' // Copy de la página "En mantenimiento" (full-page maintenance)
  | 'feedback' // Toasts, snackbars, confirmaciones genéricas
  | 'time' // Formatos de tiempo relativo: hace X minutos, ayer, etc.
  | 'emails' // Copy institucional compartido por templates y notification delivery
  | 'careers' // TASK-354: Careers pública Efeonce (attract, listing, detail, apply)
  | 'hiringDesk' // TASK-355: workspace interno de Hiring
  | 'hiringAssessment' // TASK-1363: rendición pública + review interno del assessment
  | 'hiringActivation' // TASK-1368: lane People Ops para activar hires seleccionados

/**
 * Estructura raíz de un dictionary completo por locale.
 * Cada namespace es type-safe y debe matchear paridad entre locales.
 */
export interface MicrocopyDictionary {
  actions: ActionsCopy
  states: StatesCopy
  loading: LoadingCopy
  empty: EmptyCopy
  months: MonthsCopy
  aria: AriaCopy
  errors: ErrorsCopy
  notFound: NotFoundCopy
  notAuthorized: NotAuthorizedCopy
  comingSoon: ComingSoonCopy
  underMaintenance: UnderMaintenanceCopy
  feedback: FeedbackCopy
  time: TimeCopy
  emails: EmailsCopy
  careers: CareersCopy
  hiringDesk: HiringDeskCopy
  hiringAssessment: HiringAssessmentCopy
  hiringActivation: HiringActivationCopy
}

export interface HiringAssessmentCopy {
  taking: {
    metadataTitle: string
    headerTitle: string
    loadingTitle: string
    loadingBody: string
    invalidTitle: string
    invalidBody: string
    errorTitle: string
    errorBody: string
    retry: string
    instructionsTitle: string
    instructionsBody: string
    instructionsBodyNoLimit: string
    accommodation: string
    sectionsTitle: string
    consent: string
    start: string
    progressLabel: string
    saved: string
    saving: string
    answerRequired: string
    previous: string
    next: string
    submit: string
    submitting: string
    submitTitle: string
    submitBody: string
    cancel: string
    submittedTitle: string
    submittedBody: string
    expiredTitle: string
    expiredBody: string
    timeRemaining: string
    timeToAnswer: string
    timeToSubmit: string
    submitGraceNotice: string
    timeWarningFive: string
    timeWarningOne: string
    textareaPlaceholder: string
    characterCount: string
    noQuestionsTitle: string
    noQuestionsBody: string
  }
  review: {
    title: string
    subtitle: string
    overall: string
    bars: string
    radar: string
    candidateTest: string
    interviewerScorecard: string
    assessmentStatuses: {
      assigned: string
      sent: string
      in_progress: string
      submitted: string
      scored: string
      expired: string
      cancelled: string
    }
    candidateIncomplete: string
    cancelledDetail: string
    loadReviewPrompt: string
    noModules: string
    objective: string
    scoreProgressLabel: string
    pending: string
    radarScoreLegend: string
    radarTargetLegend: string
    radarMetricScore: string
    radarPartialTitle: string
    radarPartialBody: string
    advisory: string
    queueTitle: string
    queueEmptyTitle: string
    queueEmptyBody: string
    correctionTitle: string
    question: string
    answer: string
    rubric: string
    score: string
    confirmScore: string
    aiSuggestion: string
    aiSuggestionBody: string
    useSuggestion: string
    cancel: string
    confirmed: string
    finalize: string
    /** ISSUE-159 — progreso honesto mientras el scorecard está parcial: '{scored} de {total}…' */
    partialProgress: string
    statuses: {
      optimal: string
      attention: string
      critical: string
      pending: string
      corrected: string
      /** ISSUE-159 — global con competencias aún por corregir; nunca se muestra promedio parcial. */
      partial: string
    }
  }
  /**
   * TASK-1738 — Workbench operator-only de revisión del run de scoring IA (TASK-1734).
   * CERO strings candidate-facing en este namespace (contrato anti-leak): todo lo que
   * vive acá se renderiza solo para operadores con `hiring.assessment.score`.
   */
  scoringRun: {
    provisionalTitle: string
    reviewedTitle: string
    reviewedSummary: string
    operatorOnly: string
    provisionalDisclaimer: string
    provisionalScoreLabel: string
    provisionalPending: string
    provisionalPartial: string
    provisionalFailed: string
    provisionalStale: string
    provisionalCoverage: string
    provisionalEffective: string
    provisionalResponses: string
    provisionalAbstained: string
    provisionalFailures: string
    provisionalCompetencies: string
    provisionalNeedsAttention: string
    entryChip: string
    entryExceptions: string
    entryError: string
    open: string
    title: string
    provenance: string
    refresh: string
    close: string
    statuses: {
      created: string
      enumerating: string
      scoring: string
      awaiting_review: string
      confirmable: string
      confirmed: string
      cancelled: string
      failed: string
    }
    coverageLabel: string
    coverPending: string
    coverMandatory: string
    coverSample: string
    coverBatch: string
    coverManual: string
    coverClosed: string
    /** ISSUE-159 heredado vía TASK-1734: el stale bloquea el confirm, nunca se esconde. */
    staleBanner: string
    mandatoryChip: string
    sampleChip: string
    sampleResolvedChip: string
    batchGroup: string
    sampleHint: string
    sampleContrast: string
    resolutionLabels: {
      confirmed: string
      overridden: string
      rejected_to_manual: string
    }
    questionLabel: string
    answerLabel: string
    showMore: string
    showLess: string
    /** El label lleva la consecuencia (expandir queda registrado) — DDL-3 del flow. */
    revealProposal: string
    proposalSeen: string
    proposalScore: string
    proposalProvenance: string
    perCriterion: string
    routingReasons: string
    /** Mapa de reason codes del risk router (`AI_RISK_ROUTING_REASONS`); fallback al code. */
    reasons: {
      answer_empty: string
      answer_too_short: string
      answer_malformed: string
      rubric_missing: string
      per_criterion_missing: string
      per_criterion_contradictory: string
      score_decision_near_band: string
      high_weight_competency: string
      exception_policy_disabled: string
      blind_quality_sample: string
      no_risk_signals: string
    }
    myScoreLabel: string
    scoreRangeError: string
    noteLabel: string
    resolveConfirm: string
    resolveOverride: string
    resolveReject: string
    resolveSample: string
    resolving: string
    resolved: string
    confirmTitle: string
    manifestSummary: string
    gateOpenMandatory: string
    gateOpenSample: string
    gateOpenScoring: string
    gateStale: string
    confirmFlagOff: string
    confirmRun: string
    confirming: string
    confirmed: string
    nothingToConfirm: string
    cancelRun: string
    cancelDialogTitle: string
    cancelDialogBody: string
    cancelConfirm: string
    cancelKeep: string
    cancelling: string
    cancelled: string
    terminalConfirmed: string
    terminalCancelled: string
    terminalFailed: string
    loadError: string
    retry: string
    permissionDenied: string
    lineageError: string
  }
}

export interface HiringActivationCopy {
  title: string
  eyebrow: string
  subtitle: string
  tabs: {
    onboarding: string
    offboarding: string
    readyHires: string
  }
  navigation: {
    hr: string
    lifecycle: string
    overview: string
    templates: string
  }
  kpis: {
    queue: string
    queueHint: string
    ready: string
    readyHint: string
    blockers: string
    blockersHint: string
    activated: string
    activatedHint: string
    unavailable: string
  }
  queue: {
    title: string
    subtitle: string
    emptyTitle: string
    emptyBody: string
    targetNotReadyTitle: string
    targetNotReadyBody: string
    flagOffTitle: string
    flagOffBody: string
    errorTitle: string
    retry: string
  }
  detail: {
    title: string
    pendingTitle: string
    pendingBody: string
    application360: string
    people360: string
    source: string
    handoff: string
    decision: string
    entity: string
    manager: string
    area: string
    journeyTitle: string
    readinessTitle: string
    readinessDegraded: string
    blockerTitle: string
    noBlockers: string
    activateDisabled: string
    activateReady: string
    completeWorkforceProfile: string
  }
  journey: {
    selection: string
    handoff: string
    member: string
    onboarding: string
    activation: string
    done: string
    waiting: string
    blocked: string
  }
  readiness: {
    ready: string
    warning: string
    blocked: string
    notApplicable: string
    noRowsTitle: string
    score: string
    blockers: string
    warnings: string
  }
  statuses: Record<string, string>
  blockedReasons: Record<string, string>
  actions: {
    review: string
    createMember: string
    openOnboarding: string
    resolveBlocker: string
    activate: string
    cancel: string
    close: string
    confirm: string
    goToWorkforceActivation: string
    openTemplates: string
    loading: string
  }
  dialogs: {
    activateTitle: string
    activateBody: string
    cancelTitle: string
    cancelBody: string
    cancelReasonLabel: string
    resolveTitle: string
    resolveBody: string
    resolvePendingTask: string
    resolveAvailable: string
    resolveManual: string
    resolveReasonLabel: string
    resolveReasonHint: string
    resolveNoActiveBlockers: string
    resolveNoActiveBlockersBody: string
  }
  feedback: {
    reviewOk: string
    createMemberOk: string
    openOnboardingOk: string
    completeOk: string
    cancelOk: string
    resolveOk: string
    resolveStillBlocked: string
    resolveStale: string
    commandError: string
    loadError: string
  }
  aria: {
    closeDetail: string
    closeDialog: string
    activationTabs: string
    queue: string
    readiness: string
  }
}

export interface HiringDeskCopy {
  title: string
  eyebrow: string
  subtitle: string
  navigation: {
    demand: string
    pipeline: string
    publication: string
    talentPool: string
  }
  common: {
    search: string
    retry: string
    cancel: string
    save: string
    close: string
    confirm: string
    loading: string
    noResults: string
    openApplication: string
    previous: string
    next: string
    agency: string
    demandFormRegion: string
    createOptions: string
  }
  demand: {
    title: string
    subtitle: string
    newDemand: string
    activeDemands: string
    openPositions: string
    applicants: string
    published: string
    role: string
    area: string
    owner: string
    ownerSelf: string
    status: string
    seats: string
    publication: string
    candidates: string
    targetDate: string
    openingsTitle: string
    openingsCaption: string
    emptyTitle: string
    emptyBody: string
    filteredEmptyBody: string
    drawerTitle: string
    drawerSubtitle: string
    templateLabel: string
    templatePlaceholder: string
    roleLabel: string
    areaLabel: string
    seniorityLabel: string
    skillsLabel: string
    businessUnitLabel: string
    seatsLabel: string
    modeLabel: string
    targetDateLabel: string
    summaryLabel: string
    internalCompensation: string
    compensationHint: string
    previewTitle: string
    create: string
    createAnother: string
    discardTitle: string
    discardBody: string
    discard: string
    discardContinue: string
    drawerHint: string
    created: string
  }
  pipeline: {
    title: string
    subtitle: string
    openingLabel: string
    allOpenings: string
    applicantLabel: string
    applicantsLabel: string
    searchPlaceholder: string
    boardHint: string
    moveTo: string
    saved: string
    saving: string
    rollback: string
    emptyLane: string
    keyboardHint: string
    simulateFailure: string
    sourcePublicCareers: string
    tagDelivered: string
    tagAssigned: string
    appliedDaysAgo: string
    appliedDayUnit: string
    appliedDaysUnit: string
    stages: Record<string, string>
  }
  application: {
    back: string
    overview: string
    assessment: string
    documents: string
    decision: string
    decideAction: string
    candidate: string
    contact: string
    opening: string
    score: string
    match: string
    nextStep: string
    source: string
    phoneLabel: string
    residenceCountryLabel: string
    notProvided: string
    candidateMessageTitle: string
    assessmentTitle: string
    assessmentPending: string
    assignAssessment: string
    assignmentLink: string
    copyLink: string
    reviewAssessment: string
    reviewPending: string
    aiSuggestion: string
    aiSuggestionNote: string
    scoreLabel: string
    overallScore: string
    confirmScore: string
    scoreConfirmed: string
    finalizeScorecard: string
    scorecardFinalized: string
    documentsTitle: string
    revealConfirm: string
    /**
     * TASK-1747 — copy de recuperación de acceso al test.
     *
     * Recuperar rota la credencial del candidato: el enlace anterior deja de servir. Por eso el
     * copy nunca promete recepción en bandeja (sólo el proveedor la confirma), nombra la causa
     * exacta cuando no se puede recuperar en vez de un "no disponible" genérico, y advierte que
     * el enlace se muestra una sola vez antes de mostrarlo.
     */
    /**
     * TASK-1747 — copy de la asignación gobernada (propose→confirm).
     *
     * Reemplaza el camino legacy, donde el cliente elegía plantilla y recibía el token crudo. Acá
     * el servidor decide por política y el operador confirma lo que vio. El copy nunca afirma que
     * el correo salió: el resultado trae `deliveryStatus: 'pending'`, que NO significa enviado.
     */
    assignment: {
      title: string
      intro: string
      previewTemplate: string
      previewTimeLimitLabel: string
      previewTimeLimit: string
      previewNoTimeLimit: string
      previewRecipientReady: string
      previewRecipientNotReady: string
      existingOpen: string
      existingScored: string
      confirm: string
      confirming: string
      proposing: string
      previewBlockedTitle: string
      /** Empty state: describe el estado. NO instruye una acción que el lector quizá no tiene. */
      emptyBody: string
      emptyBodyCanAssign: string
      /**
       * Atados a las uniones del DOMINIO, no a claves escritas a mano: un desenlace o un motivo
       * nuevo en `hiring-assessment-policy` rompe el build acá en vez de resolverse a `undefined`
       * y dejar al operador viendo un estado sin causa.
       */
      results: Record<AssessmentAssignmentResult['status'], string>
      /**
       * Una propuesta ya confirmada NO es un desenlace: el confirm original pudo terminar en
       * cualquiera de los 6. Por eso vive fuera de `results` — la UI no puede afirmar en cuál.
       */
      resultAlreadyConfirmed: string
      reasons: Record<AssessmentAssignmentReasonCode, string>
      errorPolicyMissing: string
      errorExpired: string
      errorStale: string
      errorNotConfirmable: string
      errorGeneric: string
      errorPermission: string
      errorNotFound: string
      errorConflict: string
      errorSession: string
      /** Fallas donde reintentar NO resuelve (`actionable: false` del contrato canónico). */
      errorStructural: string
    }
    accessRecovery: {
      cta: string
      title: string
      intro: string
      channelLabel: string
      channelEmail: string
      channelEmailHelp: string
      channelSecureLink: string
      channelSecureLinkHelp: string
      reasonLabel: string
      reasons: {
        candidate_reports_email_not_received: string
        candidate_reports_link_invalid: string
        alternate_channel_requested: string
        provider_delivery_failed: string
        token_expired_before_start: string
      }
      /**
       * TASK-1757 — qué se le va a decir (o no) al candidato. Atado a la unión del dominio: un
       * motivo de omisión nuevo rompe el build en vez de dejar al operador sin saber por qué la
       * persona no se va a enterar.
       */
      noticeWillSend: string
      noticeSkipTitle: string
      noticeSkip: Record<AssessmentAccessRotationNoticeSkip, string>
      confirm: string
      confirming: string
      emailQueued: string
      emailPending: string
      emailAlreadySent: string
      linkCopyFailed: string
      emailUnknown: string
      emailFailed: string
      emailExpiry: string
      linkTitle: string
      linkWarning: string
      linkExpiry: string
      linkCopy: string
      linkCopied: string
      linkAlreadyRevealed: string
      quotaRemainingEmail: string
      quotaExhaustedEmail: string
      quotaExhaustedAll: string
      cooldown: string
      emailBlocked: string
      emailMissing: string
      unavailableTitle: string
      unavailable: {
        assessment_recovery_method_not_supported: string
        assessment_recovery_application_closed: string
        assessment_recovery_consent_withdrawn: string
        assessment_recovery_invalid_state: string
        assessment_recovery_time_elapsed: string
        assessment_recovery_expired_after_start: string
        assessment_recovery_expiry_not_proven: string
        assessment_recovery_status_not_allowed: string
        assessment_recovery_status_cancelled: string
      }
      errorGeneric: string
      errorNotFound: string
      errorRateLimited: string
      errorIdempotencyConflict: string
      errorRecipientChanged: string
      errorConflict: string
      errorPermission: string
      errorSession: string
      errorReadFailed: string
      errorReadFailedRetry: string
      copyAriaLabel: string
      dialogAriaLabel: string
      statusAriaLive: string
    }
    /**
     * TASK-1715 — copy del panel de Documentos. Separa las dos clases del modelo
     * canónico: un archivo se ABRE (autorizado ya por la capability de la pantalla)
     * y la identidad se REVELA (capability + motivo + audit). El panel anterior las
     * trataba igual y prometía una auditoría que nunca se escribía.
     */
    documentsPanel: {
      subtitle: string
      filesGroup: string
      identityGroup: string
      sensitiveChip: string
      open: string
      download: string
      cvLabel: string
      portfolioFileLabel: string
      portfolioLinkLabel: string
      linkedinLabel: string
      uploadedOn: string
      noCv: string
      noPortfolio: string
      statusQuarantined: string
      quarantinedBody: string
      statusPending: string
      pendingBody: string
      statusLegacy: string
      legacyBody: string
      quarantineBanner: string
      identityEmpty: string
      identityMaskedHint: string
      reveal: string
      revealDialogTitle: string
      revealDialogBody: string
      revealAuditNotice: string
      revealReasonLabel: string
      revealReasonHelper: string
      revealed: string
      copyValue: string
      copied: string
      hideValue: string
      revealDenied: string
      revealError: string
      loadError: string
      openAriaLabel: string
      downloadAriaLabel: string
      revealAriaLabel: string
      viewerTitle: string
      viewerLoading: string
      viewerLoadError: string
      viewerUnsupported: string
      viewerNoEmbed: string
      viewerOpenInNewTab: string
      viewerFrameTitle: string
      view: string
      viewAriaLabel: string
    }
    decisionTitle: string
    decisionIntro: string
    decisionType: string
    decisionAdvance: string
    decisionReject: string
    decisionHold: string
    destination: string
    startDate: string
    legalEntity: string
    context: string
    reason: string
    evidence: string
    advisoryOverride: string
    confirmTitle: string
    confirmBody: string
    decided: string
    supersede: string
    handoffTitle: string
    handoffMaterializingTitle: string
    handoffMaterializingBody: string
    handoffPendingTitle: string
    handoffPendingBody: string
    handoffReadyTitle: string
    handoffReadyBody: string
    handoffBlockedTitle: string
    handoffBlockedBody: string
    handoffNoCapability: string
    approveHandoff: string
    openActivationLane: string
    handoffApproved: string
    handoffApproveError: string
    history: string
    /**
     * TASK-1737 — tab Expediente de la Application 360: timeline de notas tipadas
     * (TASK-1735) + flujo propose→confirm del dossier agéntico + gate anti-anclaje.
     * Ledger completo en docs/ui/wireframes/TASK-1737-application-360-expediente-tab.md.
     */
    expediente: {
      tabLabel: string
      title: string
      subtitle: string
      generate: string
      generating: string
      aiDisabled: string
      cvNotReady: string
      proposalTitle: string
      proposalProvenance: string
      sectionSummary: string
      sectionCoherences: string
      sectionGaps: string
      sectionInterviewFocus: string
      sectionUnverifiable: string
      unverifiableSummary: string
      evidenceTitle: string
      edit: string
      editCaption: string
      cancelEdit: string
      confirm: string
      confirming: string
      confirmed: string
      reject: string
      rejectDialogTitle: string
      rejectDialogBody: string
      rejectReasonLabel: string
      rejectConfirm: string
      rejected: string
      decisionApplied: string
      composerKindLabel: string
      kindCvAnalysis: string
      kindAssessmentReview: string
      kindInterviewNote: string
      kindGeneral: string
      composerPlaceholder: string
      composerCount: string
      addNote: string
      addingNote: string
      noteAdded: string
      agentBadge: string
      /** TASK-1735 — nota reemplazada por una posterior (append-only): es historia, no vigente. */
      supersededBadge: string
      agentProvenance: string
      stageEvent: string
      receivedEvent: string
      decisionEvent: string
      empty: string
      emptyReadOnly: string
      showMore: string
      showLess: string
      blindTitle: string
      blindBody: string
      blindCount: string
      blindCta: string
      loadError: string
      permissionDenied: string
      staleProposal: string
      noteAriaLabel: string
    }
  }
  publication: {
    title: string
    subtitle: string
    publicPreview: string
    internalOnly: string
    allowlist: string
    publish: string
    pause: string
    resume: string
    reopen: string
    close: string
    edit: string
    publishTitle: string
    publishBody: string
    pauseTitle: string
    pauseBody: string
    closeTitle: string
    closeBody: string
    resumeBody: string
    reopenBody: string
    updated: string
    noOpening: string
    /** TASK-1422 — redacción asistida del aviso público (propose→confirm de TASK-1385). */
    vacancyAi: {
      cta: string
      ctaPending: string
      ctaDisabledTooltip: string
      applyDisabledTooltip: string
      openingSelector: string
      drawerTitle: string
      drawerSubtitle: string
      templateLabel: string
      templateHint: string
      templatePlaceholder: string
      contextTitle: string
      contextExcluded: string
      generate: string
      proposing: string
      background: string
      backgroundHint: string
      reviewBanner: string
      fieldTitle: string
      fieldSummary: string
      fieldDescription: string
      fieldRequirements: string
      fieldNiceToHave: string
      fieldArea: string
      fieldSeniority: string
      fieldSeniorityPlaceholder: string
      fieldSkillTags: string
      fieldProcessNotes: string
      biasReminder: string
      requiredHint: string
      apply: string
      discard: string
      discardTitle: string
      discardBody: string
      applied: string
      discarded: string
      degraded: string
      retry: string
    }
  }
  talentPool: {
    title: string
    subtitle: string
    eyebrow: string
    searchLabel: string
    searchPlaceholder: string
    capabilityLabel: string
    capabilityPlaceholder: string
    seniorityLabel: string
    languageLabel: string
    countryLabel: string
    availabilityLabel: string
    personLabel: string
    allowedActionLabel: string
    filtersLabel: string
    filtersShow: string
    filtersHide: string
    activeFilters: string
    all: string
    clearFilters: string
    results: string
    updated: string
    loadMore: string
    loading: string
    emptyTitle: string
    emptyBody: string
    errorTitle: string
    retry: string
    profileTitle: string
    closeDetail: string
    mobileBack: string
    why: string
    evidence: string
    applications: string
    unknown: string
    observed: string
    freshUntil: string
    openApplication: string
    coverage: Record<'none' | 'partial' | 'structured', string>
    freshness: Record<'none' | 'stale' | 'current', string>
    lifecycle: Record<
      'active_process' | 'pool_eligible' | 'needs_reconsent' | 'paused' | 'withdrawn' | 'expired',
      string
    >
    reason: Record<
      | 'active_application_only'
      | 'future_consent_current'
      | 'future_consent_missing'
      | 'future_consent_expired'
      | 'consent_withdrawn'
      | 'contact_paused'
      | 'evidence_missing'
      | 'evidence_stale',
      string
    >
    source: Record<'application' | 'opening' | 'assessment_competency', string>
    actionInvite: string
    actionNoContact: string
    inviteTitle: string
    inviteBody: string
    openingLabel: string
    openingPlaceholder: string
    propose: string
    proposing: string
    confirmTitle: string
    confirmBody: string
    confirm: string
    confirming: string
    cancel: string
    inviteReceipt: string
    inviteConflict: string
    inviteError: string
    inviteDisabled: string
  }
}

export interface CareersCopy {
  metadata: {
    title: string
    description: string
  }
  header: {
    logoAlt: string
    tagline: string
    backToJobs: string
    backToDetail: string
    localeTitle: string
  }
  hero: {
    hiringBadgePrefix: string
    hiringBadgeSuffixSingular: string
    hiringBadgeSuffixPlural: string
    titleAccent: string
    titleRest: string
    subtitle: string
    primaryCta: string
    processCta: string
    proof: string
  }
  marquee: string[]
  manifesto: {
    eyebrow: string
    titlePrefix: string
    titleMark: string
    titleSuffix: string
    chips: string[]
    proofMuted: string
    proofStrong: string
    bodyPrefix: string
    bodyStrong: string
    bodySuffix: string
    cta: string
  }
  pillars: {
    eyebrow: string
    title: string
    subtitle: string
    items: Array<{
      title: string
      body: string
      icon: string
    }>
  }
  listing: {
    eyebrow: string
    title: string
    subtitle: string
    resultCountLabel: string
    searchPlaceholder: string
    areaLabel: string
    modalityLabel: string
    all: string
    clearFilters: string
    loadingTitle: string
    errorTitle: string
    errorBody: string
    retry: string
    emptyZeroTitle: string
    emptyZeroBody: string
    emptyFilteredTitle: string
    emptyFilteredBody: string
    cardCta: string
  }
  process: {
    eyebrow: string
    title: string
    subtitle: string
    steps: Array<{
      title: string
      body: string
      icon: string
    }>
  }
  talentPool: {
    eyebrow: string
    title: string
    body: string
    namePlaceholder: string
    emailPlaceholder: string
    cta: string
    successPrefix: string
    successSuffix: string
    privacy: string
  }
  talentPoolSelfService: {
    metadataTitle: string
    eyebrow: string
    title: string
    intro: string
    status: {
      active: string
      processOnly: string
      needsReconsent: string
      withdrawn: string
      expired: string
      paused: string
    }
    purposeTitle: string
    purposeBody: string
    ledger: Array<{ title: string; body: string; icon: string }>
    expiryLabel: string
    noExpiry: string
    availabilityTitle: string
    availabilityBody: string
    availabilityOptions: Array<{ value: string; label: string; description: string }>
    confirm: string
    update: string
    updating: string
    withdraw: string
    withdrawTitle: string
    withdrawBody: string
    withdrawConfirm: string
    cancel: string
    receiptPrefix: string
    privacy: string
    unavailableTitle: string
    unavailableBody: string
    retry: string
    loading: string
    error: string
    conflict: string
    rateLimited: string
  }
  detail: {
    applyCta: string
    timeHint: string
    descriptionTitle: string
    responsibilitiesTitle: string
    requirementsTitle: string
    niceToHaveTitle: string
    skillsTitle: string
    skillsHint: string
    processTitle: string
    compensationTitle: string
    compensationFallback: string
    outcomesTitle: string
    workTitle: string
    essentialsTitle: string
    preferredTitle: string
    learnablesTitle: string
    evidenceTitle: string
    companyTitle: string
    remoteTitle: string
    remoteIntro: string
    workModelTitle: string
    eligibleCountriesTitle: string
    eligibleCountriesDisclosure: string
    eligibleCountriesListLabel: string
    collaborationLabels: {
      team: string
      reportsTo: string
      language: string
      timezoneOverlap: string
      workingRhythm: string
    }
    benefitsTitle: string
    processMetaLabels: {
      expectedTiming: string
      responseCommitment: string
      accommodationPath: string
    }
    compensationUnits: Record<'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR', string>
    summaryTitle: string
    labels: {
      area: string
      location: string
      modality: string
      seniority: string
      employment: string
    }
    unavailableTitle: string
    unavailableBody: string
    unavailableCta: string
  }
  apply: {
    eyebrow: string
    titleTemplate: string
    intro: string
    optionalWord: string
    alertTitle: string
    alertBody: string
    invalidSummaryTitle: string
    invalidSummaryBody: string
    progressLabel: string
    sections: {
      personal: string
      profile: string
      message: string
    }
    fields: {
      firstName: string
      lastName: string
      email: string
      residenceCountry: string
      phone: string
      portfolio: string
      linkedin: string
      availability: string
      message: string
    }
    placeholders: {
      email: string
      residenceCountry: string
      phone: string
      portfolio: string
      linkedin: string
      availability: string
      message: string
    }
    availabilityOptions: string[]
    cv: {
      label: string
      title: string
      body: string
      hint: string
      selectedTitle: string
      browseCta: string
      replaceCta: string
      removeCta: string
      invalidType: string
      tooLarge: string
      empty: string
    }
    consent: {
      title: string
      bodyPrefix: string
      link: string
      bodySuffix: string
    }
    talentPoolConsent: {
      sectionLabel: string
      title: string
      body: string
    }
    captcha: {
      verifiedTitle: string
      verifiedBody: string
      failedTitle: string
      failedBody: string
      brand: string
      pendingTitle: string
    }
    phoneCountryAria: string
    residenceCountryHelp: string
    submit: string
    submitting: string
    successTitle: string
    successBody: string
    moreJobs: string
    disclosure: string
    errors: {
      firstName: string
      lastName: string
      emailRequired: string
      emailInvalid: string
      residenceCountryRequired: string
      phoneInvalid: string
      urlInvalid: string
      consent: string
      captcha: string
      invalid: string
      rateLimited: string
      captchaFailed: string
      notOpen: string
      server: string
    }
  }
  footer: {
    privacy: string
    terms: string
    website: string
  }
  aria: {
    skipToContent: string
    openingCardTemplate: string
    listingRegion: string
    talentPool: string
    formStatus: string
    required: string
  }
  fallbacks: {
    area: string
    location: string
    modality: string
    employment: string
    seniority: string
    summary: string
    skill: string
    responsibility: string
    requirement: string
  }
}

/**
 * CTAs base reutilizables. Verbos en infinitivo (es-CL) o gerundio para
 * progresivos. Son los CTAs que aparecen en >3 surfaces — los específicos
 * de dominio viven inline o en helpers de dominio.
 */
export interface ActionsCopy {
  save: string
  saveAndClose: string
  cancel: string
  close: string
  edit: string
  delete: string
  remove: string
  add: string
  create: string
  confirm: string
  apply: string
  reset: string
  back: string
  next: string
  continue: string
  finish: string
  send: string
  upload: string
  download: string
  export: string
  import: string
  search: string
  filter: string
  clear: string
  select: string
  selectAll: string
  deselectAll: string
  copy: string
  paste: string
  share: string
  more: string
  less: string
  expand: string
  collapse: string
  retry: string
  refresh: string
  approve: string
  reject: string
  archive: string
  unarchive: string
  duplicate: string
  view: string
  viewMore: string
  viewLess: string
  viewAll: string
  hide: string
  show: string
}

/**
 * Estados operativos canónicos. Reemplazan el patrón de status maps
 * inline (`{ pending: { label: 'Pendiente' } }`) detectado en 100
 * instancias durante el audit 2026-05-02.
 */
export interface StatesCopy {
  active: string
  inactive: string
  pending: string
  approved: string
  rejected: string
  draft: string
  inReview: string
  completed: string
  cancelled: string
  archived: string
  scheduled: string
  upcoming: string
  paused: string
  expired: string
  blocked: string
  enabled: string
  disabled: string
  online: string
  offline: string
  available: string
  unavailable: string
  paid: string
  unpaid: string
  partial: string
  overdue: string
  failed: string
  succeeded: string
  inProgress: string
  notStarted: string
}

/**
 * Loading / processing labels. Audit reveló 94 instancias inline.
 * Convención: gerundio + tres puntos suspensivos.
 */
export interface LoadingCopy {
  loading: string
  saving: string
  processing: string
  sending: string
  uploading: string
  downloading: string
  syncing: string
  fetching: string
  generating: string
  validating: string
  authenticating: string
  redirecting: string
}

/**
 * Empty states. Audit reveló 31 instancias inline. Tres tipos canónicos
 * (firstUse, noResults, error) según skill greenhouse-ux-writing §7.
 */
export interface EmptyCopy {
  noData: string
  noResults: string
  noItems: string
  emptyList: string
  searchEmpty: string
  filterEmpty: string
  firstUseTitle: string
  firstUseHint: string
  errorLoadingTitle: string
  errorLoadingHint: string
}

/**
 * Meses. Audit reveló 26 archivos duplicando arrays de meses inline.
 * Provee abreviaciones (3 letras) y nombres completos como tuples-tipados
 * (12 entries cada uno).
 */
export interface MonthsCopy {
  short: readonly [string, string, string, string, string, string, string, string, string, string, string, string]
  long: readonly [string, string, string, string, string, string, string, string, string, string, string, string]
}

/**
 * aria-labels comunes para a11y. Audit reveló 405 instancias hardcoded —
 * el caso dominante. Cubrir los más frecuentes acá; los específicos de
 * dominio quedan inline pero pasan por skill greenhouse-ux-writing.
 */
export interface AriaCopy {
  closeDialog: string
  closeDrawer: string
  closeMenu: string
  openMenu: string
  mainNavigation: string
  openSettings: string
  toggleSidebar: string
  navigateBack: string
  navigateForward: string
  selectRow: string
  expandRow: string
  collapseRow: string
  sortAscending: string
  sortDescending: string
  searchInput: string
  openSearch: string
  filterInput: string
  paginationPrev: string
  paginationNext: string
  paginationFirst: string
  paginationLast: string
  previousMonth: string
  nextMonth: string
  rowActions: string
  moreActions: string
  notifications: string
  markAllNotificationsRead: string
  markAllNotificationsUnread: string
  userMenu: string
  language: string
  theme: string
  paymentOrderTabs: string
  paymentObligationFilters: string
  breadcrumb: string
  dismissHelper: string
  leaderboardRunSelect: string
  leaderboardPagination: string
  leaderboardRowsCollapsed: string
  backToTop: string
}

/**
 * Mensajes de error genéricos shared. Específicos de dominio NO van acá.
 */
export interface ErrorsCopy {
  generic: string
  networkOffline: string
  networkTimeout: string
  unauthorized: string
  forbidden: string
  notFound: string
  serverError: string
  validationFailed: string
  requiredField: string
  invalidFormat: string
  tryAgain: string
  contactSupport: string
}

/**
 * Copy de la página 404 (full-page not-found). El glifo "404" es un código
 * HTTP, no copy traducible — vive en el componente. Estructura calmada
 * (skill greenhouse-ux-writing §6: error permanente = qué pasó + cómo salir).
 */
export interface NotFoundCopy {
  eyebrow: string
  title: string
  description: string
  messages: Array<{
    title: string
    description: string
  }>
  cta: string
  secondaryCta: string
}

/**
 * Copy de la página 401 (full-page not-authorized). El glifo "401" es un
 * código HTTP, no copy traducible — vive en el componente. Surface genérico
 * para usuario AUTENTICADO sin permiso a una superficie (distinto del rechazo
 * SSO especializado de /auth/access-denied). Tono calmado (greenhouse-ux-writing
 * §6: error permanente = qué pasó + cómo salir).
 */
export interface NotAuthorizedCopy {
  eyebrow: string
  title: string
  description: string
  messages: Array<{
    title: string
    status: string
    detail: string
    recovery: string
  }>
  cta: string
  secondaryCta: string
}

/**
 * Copy de la página "Coming Soon" (full-page launch placeholder + countdown +
 * captura de email). Tono cálido pero sobrio (greenhouse-ux-writing): primera
 * persona plural, sentence case, sin emoji (consistente con el resto de misc
 * pages del portal). Sirve como ruta pública /coming-soon y como gate de
 * feature interna. El formulario captura interés ("avísame cuando esté listo")
 * — los toasts cubren los tres estados de envío (éxito / ya registrado / error)
 * más la validación de email. Las unidades del countdown se separan para
 * permitir pluralización por locale.
 */
export interface ComingSoonCopy {
  /** Eyebrow / kicker sobre el título (overline). */
  eyebrow: string
  title: string
  description: string
  /**
   * Variantes creativas seleccionadas una vez al entrar. Mantienen la misma
   * arquitectura funcional: mensaje principal + contexto + recuperacion.
   */
  messages: Array<{
    title: string
    status: string
    recovery: string
  }>
  /** Label del input (a11y — sr-only; el campo se pre-llena con el correo de Greenhouse para autenticados). */
  emailLabel: string
  emailPlaceholder: string
  notifyCta: string
  notifyCtaLoading: string
  /** Enlace de bajo énfasis (autenticado) que revela el campo para usar otro correo. */
  useAnotherEmail: string
  /** Validación inline: formato de email inválido. */
  invalidEmail: string
  /** Toast: registro exitoso. */
  successToast: string
  /** Toast: el email ya estaba registrado (idempotente, no es error). */
  alreadySubscribedToast: string
  /** Toast: fallo al registrar (reintentable). */
  errorToast: string
  /** Etiquetas de unidades del countdown. */
  countdownDays: string
  countdownHours: string
  countdownMinutes: string
  countdownSeconds: string
  /** Mensaje breve mientras redirige al llegar a cero. */
  launching: string
}

/**
 * Copy de la página "En mantenimiento" (full-page maintenance). Surface calmada
 * para cuando el portal (o una sección) está temporalmente fuera por una
 * mantención planificada — distinta del 404 (recurso inexistente) y del 401
 * (sin permiso). Tono cálido y tranquilizador (greenhouse-ux-writing): explica
 * la causa + ofrece recuperación (reintentar / volver al inicio) + reasegura.
 * Tuteo es-CL, sentence case, sin emoji (consistente con el resto de misc pages).
 * Mismo shape que `NotFoundCopy`: varias variantes creativas + 2 CTAs.
 */
export interface UnderMaintenanceCopy {
  eyebrow: string
  title: string
  description: string
  messages: Array<{
    title: string
    description: string
  }>
  /** CTA primaria (volver al inicio). */
  cta: string
  /** CTA secundaria (reintentar — recarga para verificar si ya volvió). */
  secondaryCta: string
}

/**
 * Toasts / snackbars / confirmaciones genéricas.
 */
export interface FeedbackCopy {
  saved: string
  created: string
  updated: string
  deleted: string
  copied: string
  changesDiscarded: string
  unsavedChanges: string
  confirmDelete: string
  confirmDeleteIrreversible: string
  operationSuccess: string
  operationFailed: string
}

/**
 * Formatos de tiempo relativo. Para fechas absolutas usar
 * `Intl.DateTimeFormat` con `Locale` (TASK-429 cubrirá utilities completas).
 */
export interface TimeCopy {
  justNow: string
  minutesAgo: (n: number) => string
  hoursAgo: (n: number) => string
  daysAgo: (n: number) => string
  yesterday: string
  today: string
  tomorrow: string
}

export type NotificationCategoryCopyCode =
  | 'delivery_update'
  | 'sprint_milestone'
  | 'feedback_requested'
  | 'report_ready'
  | 'leave_status'
  | 'leave_review'
  | 'payroll_ready'
  | 'assignment_change'
  | 'ico_alert'
  | 'capacity_warning'
  | 'payroll_ops'
  | 'finance_alert'
  | 'system_event'
  | 'client_onboarding_draft'

export type NotificationCategoryCopy = Record<
  NotificationCategoryCopyCode,
  {
    label: string
    description: string
  }
>

export interface VerifyEmailTemplateCopy {
  heading: string
  greeting: (name?: string) => string
  body: string
  validityPrefix: string
  validityBold: string
  validitySuffix: string
  cta: string
  disclaimer: string
  fallback: string
  previewText: string
}

export interface MagicLinkEmailTemplateCopy {
  heading: string
  greeting: (name?: string) => string
  body: string
  validityBold: (expiresInMinutes: number) => string
  cta: string
  disclaimer: string
  fallback: string
  previewText: (expiresInMinutes: number) => string
}

export type PasswordResetEmailTemplateCopy = VerifyEmailTemplateCopy

export interface InvitationEmailTemplateCopy {
  heading: string
  greeting: (name?: string) => string
  bodyPrefix: string
  bodySuffix: string
  validityPrefix: string
  validityBold: string
  validitySuffix: string
  cta: string
  disclaimer: string
  fallback: string
  previewText: (inviter: string, client: string) => string
}

export interface NotificationEmailTemplateCopy {
  greeting: (name?: string) => string
  defaultAction: string
  fallback: string
}

export type LeaveEmailStatus = 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequestDecisionEmailTemplateCopy {
  heading: Record<LeaveEmailStatus, string>
  greeting: (name: string) => string
  body: {
    approved: (actor: string, type: string, days: number) => string
    rejected: (actor: string, type: string) => string
    cancelled: (type: string) => string
  }
  cardType: string
  cardFrom: string
  cardTo: string
  cardDays: string
  statusBadge: Record<LeaveEmailStatus, string>
  notesHeader: string
  cta: string
  fallback: string
  daysUnit: (days: number) => string
}

export interface LeaveRequestSubmittedEmailTemplateCopy {
  heading: string
  greeting: (name: string) => string
  body: (type: string, days: number) => string
  cardType: string
  cardFrom: string
  cardTo: string
  cardDays: string
  cardStatus: string
  statusPending: string
  reasonHeader: string
  cta: string
  fallback: string
  daysUnit: (days: number) => string
}

export interface LeaveRequestPendingReviewEmailTemplateCopy {
  heading: string
  greeting: (name: string) => string
  body: (member: string, type: string, days: number) => string
  cardMember: string
  cardType: string
  cardPeriod: string
  cardDays: string
  reasonHeader: string
  cta: string
  fallback: string
  disclaimer: string
  daysUnit: (days: number) => string
}

export interface LeaveReviewConfirmationEmailTemplateCopy {
  heading: Record<LeaveEmailStatus, string>
  greeting: (name: string) => string
  body: {
    approved: (member: string, type: string, days: number) => string
    rejected: (member: string, type: string) => string
    cancelled: (member: string, type: string) => string
  }
  cardMember: string
  cardType: string
  cardPeriod: string
  cardDays: string
  cardStatus: string
  statusBadge: Record<LeaveEmailStatus, string>
  notesHeader: string
  reasonHeader: string
  cta: string
  fallback: string
  disclaimer: string
  daysUnit: (days: number) => string
}

export interface PayrollReceiptEmailTemplateCopy {
  previewText: (periodLabel: string) => string
  heading: string
  greetingPrefix: string
  greetingPeriodPrefix: string
  greetingSuffix: string
  regimeLabel: string
  regimeValue: string
  currencyLabel: string
  grossLabel: string
  deductionsLabel: string
  netLabel: string
  cta: string
  pdfHelp: string
  automatedFooter: (appUrl: string) => string
}

export interface PayrollExportEmailTemplateCopy {
  previewText: (periodLabel: string, netTotalDisplay: string) => string
  kickerPrefix: string
  heading: string
  bodyPrefix: string
  bodyEntryCountPrefix: string
  bodyEntryCountLabel: string
  bodyEntryCountStrongSuffix: string
  bodyEntryCountSuffix: string
  collaboratorsLabel: string
  grossLabel: string
  netLabel: string
  netTotalLabel: string
  attachmentsHeading: string
  payrollReportTitle: string
  payrollReportSubtitle: string
  payrollReportPlainTextSubtitle: string
  payrollDetailTitle: string
  payrollDetailSubtitle: string
  payrollDetailPlainTextSubtitle: string
  exportedByPrefix: string
  exportedByFallback: string
  exportedAtLabel: string
  cta: string
  automatedFooter: string
  plainTextSeparator: string
  plainTextAttachments: string
  plainTextCta: string
}

export interface PayrollPaymentCommittedEmailTemplateCopy {
  previewText: (periodLabel: string) => string
  heading: string
  greetingPrefix: string
  greetingPeriodPrefix: string
  greetingSuffix: string
  periodLabel: string
  scheduledForLabel: string
  processorLabel: string
  netLabel: string
  cta: string
  informationalNotice: string
  automatedFooter: (appUrl: string) => string
  fallbackScheduledFor: string
}

export interface PayrollPaymentCancelledEmailTemplateCopy {
  previewText: (periodLabel: string) => string
  heading: string
  bodyPrefix: string
  bodyPeriodPrefix: string
  bodyAmountPrefix: string
  bodyAmountSuffix: string
  reasonLabel: string
  apology: string
  cta: string
  automatedFooter: (appUrl: string) => string
}

export interface PayrollLiquidacionV2EmailTemplateCopy {
  previewText: (periodLabel: string) => string
  heading: string
  bodyPrefix: string
  bodyPeriodPrefix: string
  bodySuffix: string
  periodLabel: string
  currencyLabel: string
  previousNetLabel: string
  updatedNetLabel: string
  differenceLabel: string
  noNetChange: string
  cta: string
  supportNote: string
  automatedFooterPrefix: string
}

export type BeneficiaryPaymentProfileChangedKind = 'created' | 'approved' | 'superseded' | 'cancelled'

export interface BeneficiaryPaymentProfileChangedEmailTemplateCopy {
  heading: Record<BeneficiaryPaymentProfileChangedKind, string>
  previewText: Record<BeneficiaryPaymentProfileChangedKind, string>
  intro: Record<BeneficiaryPaymentProfileChangedKind, (firstName: string, requestedByMember: boolean) => string>
  missingDate: string
  bankLabel: string
  accountLabel: string
  currencyLabel: string
  cancelledDateLabel: string
  effectiveDateLabel: string
  reasonLabel: string
  maskedFallback: string
  cta: string
  securityNotice: string
  unrecognizedChangeNotice: string
  automatedFooterPrefix: string
  automatedFooter: (appUrl: string) => string
  plainText: Record<BeneficiaryPaymentProfileChangedKind, (firstName: string, accountNumberMasked: string) => string>
}

export interface QuoteShareEmailTemplateCopy {
  previewText: (quotationNumber: string, versionNumber: number, clientName: string) => string
  overline: string
  greeting: (firstName?: string | null) => string
  bodyPrefix: string
  bodyVersionSeparator: string
  bodyClientPrefix: string
  bodyWithPdfSuffix: string
  bodyWithoutPdfSuffix: string
  totalLabel: string
  validUntilPrefix: string
  attachmentPrefix: string
  cta: string
  fallback: string
  closingNote: string
  plainTextHeader: (quotationNumber: string, versionNumber: number) => string
  plainTextClientPrefix: string
  plainTextSeparator: string
  plainTextBody: (clientName: string) => string
  plainTextAttachmentPrefix: string
  plainTextTotalPrefix: string
  plainTextValidUntilPrefix: string
  plainTextCta: string
}

/**
 * TASK-1250 — Email transaccional de entrega del informe del AI Visibility Grader
 * (dirección aprobada "Report Packet Delivery"). Cuerpo breve + adjunto PDF público-safe
 * (TASK-1273) + link tokenizado. Copy es-CL canónico; en-US como fallback legacy.
 */
export interface AiVisibilityGraderReportEmailTemplateCopy {
  previewText: (organizationName: string) => string
  heading: string
  headingPartial: string
  greeting: string
  intro: (organizationName: string) => string
  partialBanner: string
  summary: {
    scoreLabel: string
    scoreSuffix: string
    scoreEmpty: string
    levelLabel: string
    gapLabel: string
    gapEmpty: string
    contentLabel: string
    contentValue: string
  }
  insight: {
    eyebrow: string
    detectionLabel: string
    importanceLabel: string
    actionLabel: string
  }
  cta: string
  ctaHelp: string
  attachment: {
    title: string
    formatPrefix: string
    description: string
  }
  why: {
    title: string
    body: string
  }
  fallback: {
    title: string
    note: string
  }
  automatedFooter: () => string
}

export interface WeeklyExecutiveDigestEmailTemplateCopy {
  subject: string
  previewText: (periodLabel: string, totalInsights: number, spacesAffected: number) => string
  kickerPrefix: string
  heading: string
  intro: string
  includedInsightsLabel: string
  severityDistributionLabel: string
  affectedSpacesLabel: string
  severitySummary: (criticalCount: number, warningCount: number, infoCount: number) => string
  severityLabels: {
    critical: string
    warning: string
    info: string
  }
  spaceLabel: string
  insightsUnit: (count: number) => string
  emptySpaceInsights: string
  rootCauseLabel: string
  defaultInsightAction: string
  emptyHeading: string
  emptyBody: string
  cta: string
  closingLink: string
  defaultClosingNote: string
  plainTextOpenPortal: string
}

/**
 * Copy institucional compartido por emails y notificaciones externas.
 * TASK-408 lo introduce como namespace foundation antes de migrar templates:
 * primero snapshot baseline, luego consumo progresivo sin cambios de output.
 */
export interface EmailsCopy {
  layout: {
    logoAlt: string
    tagline: string
    automatedDisclaimer: string
    unsubscribe: string
  }
  common: {
    brandSignature: string
    linkLabel: string
  }
  auth: {
    verifyEmail: VerifyEmailTemplateCopy
    magicLink: MagicLinkEmailTemplateCopy
    passwordReset: PasswordResetEmailTemplateCopy
    invitation: InvitationEmailTemplateCopy
  }
  genericNotification: NotificationEmailTemplateCopy
  leave: {
    requestDecision: LeaveRequestDecisionEmailTemplateCopy
    requestSubmitted: LeaveRequestSubmittedEmailTemplateCopy
    requestPendingReview: LeaveRequestPendingReviewEmailTemplateCopy
    reviewConfirmation: LeaveReviewConfirmationEmailTemplateCopy
  }
  payroll: {
    exportReady: PayrollExportEmailTemplateCopy
    receipt: PayrollReceiptEmailTemplateCopy
    paymentCommitted: PayrollPaymentCommittedEmailTemplateCopy
    paymentCancelled: PayrollPaymentCancelledEmailTemplateCopy
    liquidacionV2: PayrollLiquidacionV2EmailTemplateCopy
  }
  beneficiaryPaymentProfileChanged: BeneficiaryPaymentProfileChangedEmailTemplateCopy
  quoteShare: QuoteShareEmailTemplateCopy
  weeklyExecutiveDigest: WeeklyExecutiveDigestEmailTemplateCopy
  growth: {
    aiVisibilityReport: AiVisibilityGraderReportEmailTemplateCopy
  }
  notificationCategories: NotificationCategoryCopy
  subjects: {
    passwordReset: string
    magicLink: (minutes: number) => string
    invitation: string
    verifyEmail: string
    payrollExport: (periodLabel: string, entryCount: number) => string
    payrollReceipt: (periodLabel: string) => string
    payrollLiquidacionV2: (periodLabel: string) => string
    payrollPaymentCommitted: (periodLabel: string) => string
    payrollPaymentCancelled: (periodLabel: string) => string
    beneficiaryPaymentProfileChanged: {
      created: string
      approved: string
      superseded: string
      cancelled: string
    }
    weeklyExecutiveDigest: (periodLabel: string) => string
    leaveRequestDecision: (leaveTypeName: string) => string
    leaveReviewConfirmation: (leaveTypeName: string) => string
    leaveRequestSubmitted: (leaveTypeName: string) => string
    leaveRequestPendingReview: (memberName: string, leaveTypeName: string) => string
    quoteShare: (quotationNumber: string, versionNumber: number, clientName: string) => string
    aiVisibilityGraderReport: (isPartial: boolean) => string
  }
}

/**
 * API pública del módulo. Una función `getMicrocopy(locale)` que devuelve
 * el dictionary completo del locale (con fallback a DEFAULT_LOCALE si el
 * locale solicitado no existe).
 *
 * En esta primera fase TASK-265, solo hay implementado `es-CL` con paridad
 * type-safe con `en-US` semilla (puede traducirse en TASK-266 sin tocar
 * consumers).
 */
export type GetMicrocopy = (locale?: Locale) => MicrocopyDictionary
