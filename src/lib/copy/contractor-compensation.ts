/**
 * TASK-968 — Contractor compensation copy (es-CL domain module).
 *
 * Visible copy for the admin compensation editor + the contractor read-only
 * derived block + the payable guardrail. Domain copy module (mirror of
 * `agency.ts` / `payroll.ts`); approved mockup strings relocated here so the
 * runtime surfaces consume a single source. Pure (client + server safe).
 */

export const GH_CONTRACTOR_COMPENSATION = {
  editor: {
    panelTitle: 'Compensación',
    panelSubheader: 'El monto acordado se define aquí. El contractor nunca lo escribe.',
    editCta: 'Editar compensación',
    defineCta: 'Definir compensación',
    emptyTitle: 'Sin monto acordado',
    emptyDescription:
      'Este engagement aún no tiene compensación definida. El contractor no puede declarar trabajo hasta definirla.',
    agreedChip: 'Acordado',
    drawerTitle: 'Compensación del engagement',
    rateTypeLabel: 'Tipo de tarifa',
    amountLabel: 'Monto acordado',
    amountHelper: 'Monto bruto antes de retención.',
    amountError: 'Ingresa un monto mayor a 0.',
    currencyLabel: 'Moneda',
    currencyHelper: 'Se define al crear el engagement.',
    cadenceLabel: 'Cadencia',
    expectedLabel: 'Monto esperado por pago',
    expectedByQuantity: 'Según cantidad declarada',
    auditNote: 'Cada cambio queda registrado (quién y cuándo).',
    save: 'Guardar compensación',
    saving: 'Guardando…',
    saved: 'Guardado',
    cancel: 'Cancelar',
    saveError: 'No pudimos guardar la compensación. Intenta de nuevo.'
  },
  contractor: {
    derivedTitle: 'Monto del período',
    derivedNote: 'Según tu compensación acordada. No editable.',
    missingTitle: 'Aún no tienes monto acordado',
    missingDescription:
      'Tu engagement aún no tiene monto acordado definido. Contacta a HR para habilitar tus envíos.'
  },
  guardrail: {
    panelTitle: 'Guardrail del monto acordado',
    panelSubheader: 'Bloquea pagar por encima de lo acordado. La excepción la autoriza Finanzas (SoD) y queda auditada.',
    breachTitle: 'Excede el monto acordado',
    okTitle: 'Sin payables bloqueados por monto',
    okDescription: 'Ningún payable de este engagement supera el monto acordado.',
    // SoD: quien fija el monto (HR) no autoriza la excepción. Aquí es solo lectura;
    // la excepción se resuelve en el workbench de Finanzas.
    resolvedInFinanceNote: 'La excepción la autoriza Finanzas, no HR. Acá solo ves el bloqueo.',
    reviewInFinanceCta: 'Revisar en Pagos a contractors'
  },
  // TASK-975 — Engagement detail + lifecycle + classification review.
  // Detail (Drawer + Dialogs) viven dentro del workbench HR /hr/contractors.
  lifecycle: {
    panelLabel: 'Ciclo de vida',
    stateLabel: 'Estado',
    state: {
      draft: 'Borrador',
      pending_review: 'En revisión',
      active: 'Activo',
      paused: 'En pausa',
      ending: 'En cierre',
      ended: 'Finalizado',
      cancelled: 'Cancelado'
    },
    // Transition CTAs (verbo + objeto cuando aporta claridad).
    activate: 'Activar engagement',
    sendToReview: 'Enviar a revisión',
    returnToDraft: 'Volver a borrador',
    pause: 'Pausar',
    resume: 'Reanudar',
    startEnding: 'Iniciar cierre',
    finish: 'Finalizar',
    cancel: 'Cancelar engagement',
    terminalNote: 'Estado terminal. No admite más transiciones.',
    activateBlockedNote: 'No puedes activar con riesgo de clasificación abierto. Revisa la clasificación primero.',
    // Confirm dialog.
    confirmTitle: 'Confirmar cambio de estado',
    confirmIntro: 'El engagement pasará de {from} a {to}. La transición queda registrada.',
    confirmReasonLabel: 'Motivo',
    confirmReasonHelper: 'Explica brevemente el cambio. Mínimo 10 caracteres.',
    confirmReasonError: 'Ingresa un motivo de al menos 10 caracteres.',
    confirmCta: 'Confirmar transición',
    confirmCancel: 'Cancelar',
    transitionError: 'No pudimos cambiar el estado del engagement. Intenta de nuevo.'
  },
  // TASK-984 — Cierre contractor (drawer de operador en /hr/contractors).
  // El cierre es un lifecycle propio: NUNCA finiquito laboral (boundary TASK-797/890).
  closure: {
    openCta: 'Cerrar contractor',
    drawerTitle: 'Cerrar contractor',
    notFiniquitoNote:
      'Este cierre no dispara cálculo de finiquito, causales DT ni documentos laborales dependientes.',
    loading: 'Cargando el estado de cierre…',
    loadError: 'No pudimos cargar el estado de cierre. Intenta de nuevo.',
    retryCta: 'Reintentar',
    readinessLabel: 'Verificación de cierre',
    noBlockers: 'Sin bloqueadores. Puedes ejecutar el cierre.',
    blockersLabel: 'Bloqueadores',
    advisoriesLabel: 'Recordatorios',
    blocker: {
      open_work_submissions: 'Envíos de trabajo abiertos',
      open_payables: 'Payables sin liquidar',
      provider_termination_ref_missing: 'Falta la referencia de terminación del provider',
      classification_risk_blocking: 'Riesgo de clasificación bloqueante'
    },
    advisory: {
      access_handoff_reminder: 'Traspaso de accesos'
    },
    acknowledgeCta: 'Reconocer y cerrar igual',
    acknowledgedTag: 'Reconocido',
    acknowledgeReasonLabel: 'Razón del reconocimiento',
    acknowledgeReasonHelper: 'Explica por qué cierras con este ítem abierto. Mínimo 10 caracteres.',
    causalLabel: 'Causal de cierre',
    causalPlaceholder: 'Selecciona una causal',
    causal: {
      contract_completed: 'Contrato completado',
      mutual_agreement: 'Acuerdo mutuo',
      contractor_resignation: 'Renuncia del contractor',
      non_renewal: 'No renovación',
      terminated_for_cause: 'Terminación con causa',
      converted_to_employee: 'Conversión a empleado',
      provider_terminated: 'Terminado por el provider',
      other: 'Otra'
    },
    effectiveDateLabel: 'Fecha efectiva',
    providerRefLabel: 'Referencia de terminación del provider',
    providerRefHelper: 'Solo para engagements vía provider/EOR (Deel, Remote, Oyster).',
    reasonLabel: 'Motivo del cierre',
    reasonHelper: 'Explica brevemente el cierre. Mínimo 10 caracteres.',
    reasonError: 'Ingresa un motivo de al menos 10 caracteres.',
    postClosureToggle: 'Permitir invoices después del cierre',
    postClosureHelper: 'Habilita crear payables luego del cierre. Queda auditado.',
    initiateCta: 'Iniciar cierre',
    executeCta: 'Ejecutar cierre',
    executeDisabledHint: 'Reconoce todos los bloqueadores para ejecutar el cierre.',
    initiateSuccess: 'Cierre iniciado. El engagement quedó en cierre.',
    executeSuccess: 'Engagement cerrado.',
    actionError: 'No pudimos completar el cierre. Intenta de nuevo.',
    closedNote: 'Este engagement ya está cerrado.',
    // Resumen del cierre ejecutado (estado cerrado).
    summaryLabel: 'Resumen del cierre',
    executedAtLabel: 'Cerrado el',
    postClosureStateLabel: 'Invoices post-cierre',
    postClosureAllowed: 'Permitidos',
    postClosureBlocked: 'No permitidos',
    notSet: '—'
  },
  classification: {
    panelLabel: 'Clasificación laboral',
    statusLabel: 'Estado de clasificación',
    status: {
      clear: 'Sin riesgo',
      needs_review: 'Necesita revisión',
      legal_review_required: 'Requiere revisión legal',
      blocked: 'Bloqueado'
    },
    // Los 7 factores (label + descripción corta).
    factors: {
      imposedFixedSchedule: {
        label: 'Horario fijo impuesto',
        description: 'El contratante impone una jornada fija.'
      },
      directSupervision: {
        label: 'Supervisión directa tipo empleado',
        description: 'Jefatura directa y control disciplinario como a un empleado.'
      },
      exclusivity: {
        label: 'Exclusividad contractual',
        description: 'No puede prestar servicios a terceros.'
      },
      economicDependency: {
        label: 'Dependencia económica material',
        description: 'El ingreso de este engagement es prácticamente su única fuente.'
      },
      immediateEmployeeContinuity: {
        label: 'Continuidad inmediata de relación laboral',
        description: 'Viene directo de una relación dependiente previa.'
      },
      internalRoleIndistinguishable: {
        label: 'Cargo interno indistinguible de empleado',
        description: 'Ocupa un cargo interno igual al de un empleado.'
      },
      recurringPaymentsWithoutDeliverables: {
        label: 'Pagos recurrentes sin entregables',
        description: 'Pagos periódicos sin invoice ni evidencia de trabajo.'
      }
    },
    factorPresent: 'Presente',
    factorAbsent: 'Ausente',
    reviewCta: 'Revisar clasificación',
    // Review dialog.
    dialogTitle: 'Revisión de clasificación laboral',
    dialogIntro: 'Marca los factores presentes. El estado de riesgo se recalcula al instante.',
    sodNote: 'Lo revisa una firma distinta a quien creó el engagement (separación de funciones).',
    factorsLegend: 'Factores de riesgo',
    reviewedSwitch: 'Marcar como revisado',
    reviewedHelper: 'Un engagement sin revisar nunca queda “sin riesgo”.',
    blockSwitch: 'Escalar a bloqueado',
    blockHelper: 'Bloqueo manual explícito. Detiene el engagement.',
    reasonLabel: 'Motivo de la revisión',
    reasonHelper: 'Explica tu decisión. Mínimo 10 caracteres.',
    reasonError: 'Ingresa un motivo de al menos 10 caracteres.',
    resultLabel: 'Resultado de la revisión',
    saveCta: 'Guardar revisión',
    cancelCta: 'Cancelar',
    saveError: 'No pudimos guardar la revisión. Intenta de nuevo.'
  },
  detail: {
    drawerTitle: 'Detalle del engagement',
    openCta: 'Ver detalle completo',
    editTermsCta: 'Editar términos',
    summaryLabel: 'Resumen',
    contractorField: 'Contractor',
    engagementIdField: 'ID del engagement',
    relationField: 'Relación',
    countryField: 'País',
    entityField: 'Entidad contratante',
    complianceField: 'Estado tributario',
    // Section headers.
    sectionEconomics: 'Términos económicos',
    sectionTax: 'Tributario',
    sectionProvider: 'Proveedor',
    sectionDates: 'Fechas',
    sectionLifecycle: 'Ciclo de vida',
    sectionClassification: 'Clasificación',
    stateMachineLabel: 'Máquina de estados',
    nextTransitionsLabel: 'Transiciones disponibles',
    noNextTransitions: 'Sin transiciones disponibles.',
    // Field labels.
    paymentModelField: 'Modelo de pago',
    rateTypeField: 'Tipo de tarifa',
    rateAmountField: 'Monto acordado',
    cadenceField: 'Cadencia',
    currencyField: 'Moneda',
    paymentCurrencyField: 'Moneda de pago',
    fxPolicyField: 'Política FX',
    providerContractField: 'Contrato del proveedor',
    providerWorkerField: 'ID del trabajador',
    requiresInvoiceField: 'Requiere invoice',
    requiresWorkApprovalField: 'Requiere aprobación de trabajo',
    bonusPolicyField: 'Política de bono',
    startDateField: 'Inicio',
    endDateField: 'Término',
    taxOwnerField: 'Responsable tributario',
    withholdingRateField: 'Tasa de retención',
    yes: 'Sí',
    no: 'No',
    notSet: '—',
    loading: 'Cargando el detalle del engagement…',
    loadError: 'No pudimos cargar el detalle del engagement. Intenta de nuevo.',
    retryCta: 'Reintentar'
  },
  // TASK-976 — Contractor onboarding wizard (employee→contractor + new contractor).
  // Path B = "Desde una salida laboral" (transición empleado→contractor sobre un
  // offboarding ejecutado). Path A = "Contractor nuevo" (relación contractor ya
  // existente). Lane C — wizard multi-paso. SoD: el camino B es read-only sobre
  // finiquito + offboarding + member (no muta contract_type ni finiquito).
  onboarding: {
    // Header
    pageTitle: 'Nuevo contractor',
    pageSubtitle:
      'Crea el engagement de un contractor: desde una salida laboral o desde una relación contractor existente.',

    // Scenario preview bar (mockup-only).
    previewLegend: 'Vista previa',
    previewPathB: 'Camino B · Desde salida',
    previewPathA: 'Camino A · Contractor nuevo',
    previewOutcomeLabel: 'Resultado camino B',
    previewResolveLabel: 'Estado persona camino A',

    // Stepper labels (per path).
    stepOnboardingType: 'Tipo de onboarding',
    stepPickOffboarding: 'Elegir salida laboral',
    stepPickPerson: 'Elegir persona',
    stepTerms: 'Términos del engagement',
    stepConfirm: 'Confirmación',

    // Step 1 — path choice cards.
    typeStepTitle: '¿Cómo entra este contractor?',
    typeStepSubtitle: 'Elige el camino. Define los pasos siguientes.',
    pathBCardTitle: 'Desde una salida laboral',
    pathBCardSubtitle: 'Un colaborador que dejó de ser empleado y sigue como contractor.',
    pathBCardDetail: 'Cierra la relación de empleado, abre la de contractor y crea el engagement.',
    pathACardTitle: 'Contractor nuevo',
    pathACardSubtitle: 'Una persona con relación de contractor ya existente.',
    pathACardDetail: 'Crea el engagement sobre la relación contractor activa de la persona.',
    pathSelectedAria: 'Camino seleccionado',

    // Step B2 — pick executed offboarding.
    pickOffboardingTitle: 'Elige la salida laboral',
    pickOffboardingSubtitle: 'Solo aparecen salidas ya ejecutadas. La transición se ancla a ese caso.',
    offboardingLastDay: 'Último día',
    offboardingSeparation: 'Tipo de salida',
    offboardingEmptyTitle: 'Sin salidas ejecutadas',
    offboardingEmptyDescription: 'No hay salidas laborales ejecutadas disponibles para transicionar.',
    pickOffboardingError: 'Selecciona una salida laboral para continuar.',

    // Step A2 — pick person + resolve outcomes.
    pickPersonTitle: 'Elige la persona',
    pickPersonSubtitle: 'Busca por nombre o correo. Validamos su relación contractor al seleccionarla.',
    personSearchLabel: 'Buscar persona',
    personSearchPlaceholder: 'ej. nombre o correo@empresa.com',
    personSearchEmpty: 'No hay resultados para esa búsqueda. Revisa la ortografía o intenta con otras palabras.',
    personResolving: 'Validando la relación de la persona…',
    // Outcome: has contractor relationship (continue).
    resolveOkTitle: 'Relación contractor activa',
    resolveOkDescription: 'Esta persona tiene una relación de contractor vigente. Puedes continuar.',
    resolveRelationLabel: 'Relación',
    // Outcome: has executed offboarding → derive to Path B.
    deriveToBTitle: 'Esta persona viene de una relación laboral',
    deriveToBDescription: 'Tiene una salida laboral ejecutada. Usá el camino “Desde una salida laboral”.',
    deriveToBCta: 'Cambiar a ese camino',
    // Outcome: no relationship → Person 360 dead-end.
    noRelationTitle: 'Sin relación de contractor activa',
    noRelationDescription:
      'Esta persona no tiene una relación de contractor activa. Primero creá la relación en Person 360.',
    noRelationHint: 'Person 360 está fuera del alcance de este asistente.',
    pickPersonError: 'Selecciona una persona con relación contractor activa para continuar.',

    // Step 3 — engagement terms (shared field copy).
    termsTitle: 'Términos del engagement',
    termsSubtitleB: 'Define el subtipo, la fecha de inicio como contractor y los términos económicos.',
    termsSubtitleA: 'Define el subtipo de la relación y los términos económicos del engagement.',
    contractorSubtypeLabel: 'Subtipo de contractor',
    contractorSubtypeHelper: 'Define el régimen de la relación que se abre.',
    relationshipSubtypeLabel: 'Subtipo de la relación',
    effectiveFromLabel: 'Inicio como contractor',
    effectiveFromHelper: 'Debe ser posterior al último día como empleado.',
    effectiveFromError: 'La fecha debe ser posterior al último día como empleado ({lastDay}).',
    startDateLabel: 'Fecha de inicio',
    startDateHelper: 'Cuándo empieza a regir el engagement.',
    startDateError: 'Ingresa una fecha de inicio para continuar.',
    payrollViaLabel: 'Canal de pago',
    paymentModelLabel: 'Modelo de pago',
    rateTypeLabel: 'Tipo de tarifa',
    cadenceLabel: 'Cadencia',
    rateAmountLabel: 'Monto acordado',
    rateAmountHelper: 'Opcional. Monto bruto antes de retención.',
    rateAmountPreview: 'Vista previa',
    currencyLabel: 'Moneda',
    requiresInvoiceLabel: 'Requiere invoice',
    requiresWorkApprovalLabel: 'Requiere aprobación de trabajo',
    taxOwnerLabel: 'Responsable tributario',
    taxOwnerHelper: 'Opcional. Quién asume el cumplimiento tributario.',
    bonusPolicyLabel: 'Política de bono',
    reasonLabel: 'Motivo de la transición',
    reasonHelper: 'Explica brevemente el cambio. Mínimo 10 caracteres.',
    reasonError: 'Ingresa un motivo de al menos 10 caracteres.',
    resolvedPersonLabel: 'Persona',
    operatingEntityLabel: 'Entidad contratante',
    // Boundary note shown on Path B terms.
    boundaryNote:
      'El camino B no modifica el finiquito ni el tipo de contrato del empleado. Solo cierra la relación laboral, abre la de contractor y crea el engagement.',

    // Step 4 — confirmation + outcomes.
    confirmTitleB: 'Confirma la transición a contractor',
    confirmTitleA: 'Confirma la creación del contractor',
    confirmSubtitleB: 'Revisa qué va a pasar antes de crear el engagement.',
    confirmSubtitleA: 'Revisa los términos antes de crear el engagement.',
    confirmWillHappen: 'Qué va a pasar',
    confirmStepCloseEmployee: 'Se cierra la relación de empleado (append-only, auditada).',
    confirmStepOpenContractor: 'Se abre la relación de contractor.',
    confirmStepCreateEngagement: 'Se crea el engagement y se activa si la clasificación no es bloqueante.',
    confirmStepCreateEngagementA:
      'Se crea el engagement sobre la relación contractor existente y se activa si la clasificación no es bloqueante.',
    confirmStepDraftReview: 'Si hay riesgo de clasificación bloqueante, queda retenido para revisión legal.',
    createCta: 'Crear contractor',
    backCta: 'Atrás',
    nextCta: 'Siguiente',

    // Idempotent outcomes (Path B) — honest preview of the 3 server states.
    outcomeTransitioned: 'transitioned',
    outcomeEngagementOnExisting: 'engagement_created_on_existing_relationship',
    outcomeAlreadyComplete: 'already_complete',
    outcomeTransitionedTitle: 'Contractor creado',
    outcomeTransitionedDescription:
      'Se cerró la relación de empleado, se abrió la de contractor y se creó el engagement.',
    outcomeEngagementTitle: 'Engagement creado sobre relación existente',
    outcomeEngagementDescription:
      'La relación de contractor ya existía. Se creó el engagement sobre ella.',
    outcomeAlreadyTitle: 'Ya estaba completo',
    outcomeAlreadyDescription: 'Esta salida ya había sido transicionada. No se creó nada nuevo.',
    outcomeEngagementId: 'ID del engagement',
    outcomeDraftNote: 'Queda en estado Borrador. Revisá la clasificación antes de activar.',
    // TASK-985 — nota del resultado, condicional al estado real del engagement.
    outcomeActiveNote: 'El contractor quedó activo.',
    outcomeRetainedNote:
      'Quedó retenido para revisión de clasificación antes de activar (riesgo de reclasificación).',

    // Outcome (Path A) success.
    outcomeCreatedTitle: 'Contractor creado',
    outcomeCreatedDescription: 'El engagement se creó sobre la relación contractor de la persona.',

    // aria
    stepperAria: 'Pasos del asistente de onboarding',
    previewBarAria: 'Controles de vista previa del asistente',

    // --- Runtime-only (wiring): loading + fetch/submit errors + success CTAs ---
    searchMinCharsHint: 'Escribe al menos 2 caracteres para buscar.',
    searchError: 'No pudimos buscar personas. Intenta de nuevo.',
    resolveError: 'No pudimos validar la relación de la persona. Intenta de nuevo.',
    submitError: 'No pudimos crear el contractor. Revisa los datos e intenta de nuevo.',
    creatingCta: 'Creando…',
    workbenchCta: 'Ir a contractors',
    onboardAnotherCta: 'Onboardear otro',
    noManagePermissionNote: 'No tienes permiso para crear contractors desde una salida laboral.',
    noCreatePermissionNote: 'No tienes permiso para crear contractors.'
  },
  terms: {
    drawerTitle: 'Editar términos del engagement',
    paymentModelLabel: 'Modelo de pago',
    fxPolicyLabel: 'Política FX',
    fxPolicyPlaceholder: 'ej. cl_usd_spot_monthly',
    providerContractLabel: 'Contrato del proveedor',
    providerContractPlaceholder: 'ej. DEEL-CT-48213',
    providerWorkerLabel: 'ID del trabajador',
    providerWorkerPlaceholder: 'ej. DEEL-WK-90217',
    requiresInvoiceLabel: 'Requiere invoice',
    requiresWorkApprovalLabel: 'Requiere aprobación de trabajo',
    bonusPolicyLabel: 'Política de bono',
    endDateLabel: 'Fecha de término',
    save: 'Guardar términos',
    saving: 'Guardando…',
    saved: 'Guardado',
    cancel: 'Cancelar',
    saveError: 'No pudimos guardar los términos. Intenta de nuevo.'
  }
} as const
