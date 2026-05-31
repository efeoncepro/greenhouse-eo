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
