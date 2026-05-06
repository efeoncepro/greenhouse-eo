/**
 * TASK-811 — domain microcopy extracted from src/config/greenhouse-nomenclature.ts.
 *
 * This module keeps domain-specific visible copy out of the product
 * nomenclature/navigation contract while preserving type-safe GH_* ergonomics.
 * Do not rewrite strings in this file as part of trim-only work.
 */

export const GH_PRICING = {
  // Builder
  builderTitleNew: 'Nueva cotización',
  builderTitleEdit: 'Editar cotización',
  builderSaveDraft: 'Guardar borrador',
  builderSendToClient: 'Enviar al cliente',
  builderPreview: 'Vista previa',
  builderEmptyLineItems: 'Aún no has agregado ítems a esta cotización',
  builderEmptyLineItemsCta: 'Agregar rol',

  // Builder shell (full-page surface, TASK-473)
  builderBreadcrumbRoot: 'Finanzas',
  builderBreadcrumbList: 'Cotizaciones',
  builderSubtitleCreate: 'Arma la cotización combinando ítems del catálogo, servicios empaquetados, templates o líneas manuales.',
  builderSubtitleEdit: 'Ajusta contexto, líneas y términos comerciales de esta cotización.',
  builderCreated: 'Cotización creada',
  builderSaved: 'Cambios guardados',
  builderSaveAndClose: 'Guardar y cerrar',
  builderSaveAndIssue: 'Guardar y emitir',
  builderCancel: 'Cancelar',
  builderSaving: 'Guardando…',
  builderIssued: 'Cotización emitida',
  builderIssueRequested: 'La cotización quedó en aprobación',
  builderIssueErrorFallback: 'No pudimos emitir la cotización. La dejamos guardada para que la revises.',
  builderSourcesCardTitle: 'Agrega líneas a la cotización',
  builderSourcesCardSubtitle: 'Elige cómo quieres componerla',
  builderSources: {
    catalog: {
      title: 'Catálogo',
      subtitle: 'Roles, herramientas y overhead del pricing catalog',
      icon: 'tabler-books',
      color: 'primary' as const
    },
    service: {
      title: 'Servicio',
      subtitle: 'Servicios empaquetados EFG-XXX que expanden a líneas completas',
      icon: 'tabler-package',
      color: 'success' as const
    },
    template: {
      title: 'Template',
      subtitle: 'Cotizaciones predefinidas con defaults comerciales',
      icon: 'tabler-template',
      color: 'info' as const
    },
    manual: {
      title: 'Manual',
      subtitle: 'Crea una línea en blanco y edítala a mano',
      icon: 'tabler-edit',
      color: 'secondary' as const
    }
  },
  builderTemplatePickerTitle: 'Desde template',
  builderTemplatePickerSubtitle: 'Elige una cotización reutilizable',
  builderTemplatePickerEmpty: 'No hay templates disponibles',
  builderTemplatePickerEmptyHint:
    'Guarda una cotización como template desde su detalle para reutilizarla aquí.',
  builderTemplateUsageOne: (n: number) => `Usado ${n} vez`,
  builderTemplateUsageMany: (n: number) => `Usado ${n} veces`,
  builderTemplateDefaultsLabel: 'Defaults',
  builderValidationDescription: 'Agrega una descripción breve del alcance.',
  builderValidationOrganization: 'Selecciona una organización para la cotización.',
  builderValidationHubspotContact:
    'Las cotizaciones sincronizadas con HubSpot requieren un contacto activo de esa organización.',
  builderValidationHubspotDeal:
    'Las cotizaciones sincronizadas con HubSpot requieren un deal vinculado.',
  builderValidationLines: 'Agrega al menos un ítem a la cotización.',
  builderSubmitErrorGeneric: 'No pudimos guardar la cotización. Intenta de nuevo.',

  // Sellable item picker (drawer con 5 tabs)
  pickerTitle: 'Agregar ítem',
  pickerTabs: {
    roles: 'Roles',
    people: 'Personas',
    tools: 'Herramientas',
    overhead: 'Overhead',
    services: 'Servicios'
  } as Record<string, string>,
  pickerSearchPlaceholder: 'Buscar por SKU o nombre...',
  pickerEmpty: 'No hay ítems activos para este filtro',
  pickerEmptyCta: 'Ir al catálogo',
  pickerServicesPlaceholder: 'Aún no hay servicios activos. Agrega uno en Admin › Catálogo de pricing › Servicios.',
  pickerLoadingAria: 'Cargando catálogo',
  pickerSelectionNone: 'Ningún ítem seleccionado',
  pickerSelectionCountOne: (n: number) => `${n} ítem seleccionado`,
  pickerSelectionCountMany: (n: number) => `${n} ítems seleccionados`,
  pickerSubmit: 'Agregar seleccionados',
  pickerCancel: 'Cancelar',
  pickerClose: 'Cerrar',
  pickerTabsAriaLabel: 'Categorías de ítems vendibles',

  // Cost stack (gated: solo finance/admin)
  costStackTitle: 'Detalle de costo (solo interno)',
  costStackTotalCost: 'Costo total',
  costStackPriceToClient: 'Precio cliente',
  costStackGrossMargin: 'Margen bruto',
  costStackTierFit: 'Tier fit',

  // Margin semaphore
  marginLabels: {
    critical: 'Crítico',
    attention: 'Atención',
    optimal: 'Óptimo',
    overshoot: 'Sobre meta'
  } as Record<string, string>,

  // Commercial model + country factor + currency + employment type
  commercialModelLabel: 'Modelo comercial',
  countryFactorLabel: 'País del cliente',
  currencyLabel: 'Moneda',
  employmentTypeLabel: 'Tipo de contratación',

  // Send quote drawer
  sendDrawerTitle: 'Enviar cotización',
  sendDrawerTo: 'Destinatario',
  sendDrawerCc: 'Con copia',
  sendDrawerSubject: 'Asunto',
  sendDrawerMessage: 'Mensaje',
  sendDrawerSubmit: 'Enviar cotización',
  sendDrawerSaveOnly: 'Guardar sin enviar',

  // Quote list
  listKpiDrafts: 'Borradores',
  listKpiSent: 'Enviadas',
  listKpiApproved: 'Aprobadas',
  listKpiExpired: 'Vencidas',
  listNew: 'Nueva cotización',

  // Pricing catalog admin
  adminTitle: 'Catálogo de pricing',
  adminRoles: 'Roles vendibles',
  adminTools: 'Catálogo de herramientas',
  adminOverhead: 'Overhead add-ons',
  adminServicesLabel: 'Servicios empaquetados',
  adminServices: {
    label: 'Servicios empaquetados',
    title: 'Servicios empaquetados',
    subtitle:
      'Servicios reusables con recipe de roles y herramientas que se expanden automáticamente en cada cotización.',
    navDescription: 'Catálogo de servicios compuestos con SKU EFG-XXX',
    backToCatalog: 'Volver al catálogo',
    createCta: 'Nuevo servicio',
    createFirstCta: 'Crear primer servicio',
    editCta: 'Editar servicio',
    deactivateCta: 'Desactivar',
    activateCta: 'Reactivar',
    simulateCta: 'Simular precio',
    saveRecipeCta: 'Guardar receta',
    addRoleCta: 'Agregar rol',
    addToolCta: 'Agregar herramienta',
    moveUpLabel: 'Subir fila',
    moveDownLabel: 'Bajar fila',
    removeRowLabel: 'Eliminar fila',

    // Columns
    columns: {
      sku: 'SKU',
      name: 'Nombre',
      category: 'Categoría',
      tier: 'Tier',
      commercialModel: 'Modelo comercial',
      unit: 'Unidad',
      duration: 'Duración',
      businessLine: 'BL',
      active: 'Estado',
      roleCount: '# Roles',
      toolCount: '# Tools',
      actions: 'Acciones'
    },

    // Recipe columns
    recipeRoleColumns: {
      role: 'Rol',
      hours: 'Horas/periodo',
      quantity: 'Cantidad',
      optional: 'Opcional',
      notes: 'Notas'
    },
    recipeToolColumns: {
      tool: 'Herramienta',
      quantity: 'Cantidad',
      optional: 'Opcional',
      passThrough: 'Pass-through',
      notes: 'Notas'
    },

    // Filters
    filterTier: 'Tier',
    filterCategory: 'Categoría',
    filterBusinessLine: 'Unidad de negocio',
    filterStatus: 'Estado',
    filterAllTiers: 'Todos los tiers',
    filterAllCategories: 'Todas las categorías',
    filterAllBusinessLines: 'Todas las BL',
    searchPlaceholder: 'Buscar por SKU o nombre...',

    // Service units
    serviceUnits: {
      project: 'Proyecto',
      monthly: 'Mensual (retainer)'
    } as Record<string, string>,

    // Commercial models
    commercialModels: {
      on_going: 'On-going (retainer)',
      on_demand: 'On-demand (proyecto)',
      hybrid: 'Híbrido',
      license_consulting: 'Licencia + consultoría'
    } as Record<string, string>,

    // Tiers
    tierOptions: {
      '1': 'T1 · Junior',
      '2': 'T2 · Mid',
      '3': 'T3 · Senior',
      '4': 'T4 · Lead'
    } as Record<string, string>,

    // Sections
    sectionGeneral: 'Detalle general',
    sectionRecipe: 'Receta de roles y herramientas',
    sectionSimulate: 'Simular precio',
    sectionRecipeRoles: 'Roles',
    sectionRecipeTools: 'Herramientas',

    // Empty states
    emptyStateFirstTitle: 'Aún no tienes servicios empaquetados',
    emptyStateFirstDescription:
      'Los servicios agrupan roles y herramientas reusables. Al crearlos, se expanden en cada cotización sin armar desde cero.',
    emptyStateNoResultsTitle: 'Sin resultados',
    emptyStateNoResultsDescription:
      'Ajusta los filtros o usa otras palabras para buscar.',
    emptyRecipeRoles: 'Aún no hay roles en la receta. Agrega el primero para simular el servicio.',
    emptyRecipeTools: 'Aún no hay herramientas en la receta.',

    // Hints
    moduleCodeHint: 'Identificador interno (auto-generado desde el nombre, editable).',
    durationHint: 'Meses sugeridos para retainers; aplica solo si la unidad es Mensual.',
    skuHint: 'Se asigna automáticamente al guardar (prefijo EFG).',
    simulateHint: 'Calcula el precio total del servicio usando el motor de pricing v2.',

    // Validation
    validation: {
      moduleNameRequired: 'Ingresa un nombre para el servicio.',
      serviceUnitRequired: 'Selecciona la unidad de servicio.',
      commercialModelRequired: 'Selecciona el modelo comercial.',
      tierRequired: 'Selecciona el tier.',
      durationRequiredForMonthly: 'Para servicios mensuales, ingresa la duración en meses.',
      durationMustBePositive: 'La duración debe ser mayor o igual a 0.',
      roleRequired: 'Selecciona un rol para esta fila.',
      hoursMustBePositive: 'Las horas deben ser mayores a 0.',
      quantityMustBePositive: 'La cantidad debe ser al menos 1.',
      toolRequired: 'Selecciona una herramienta para esta fila.'
    },

    // Errors
    errorSkuConflict: 'Ya existe un servicio con ese código. Usa otro identificador.',
    errorConflict: 'El servicio cambió desde que lo abriste. Recarga para continuar.',
    errorLoad: 'No pudimos cargar el servicio. Intenta de nuevo.',
    errorLoadList: 'No pudimos cargar los servicios. Intenta de nuevo.',
    errorSave: 'No pudimos guardar los cambios. Revisa los valores e intenta de nuevo.',
    errorSaveRecipe: 'No pudimos guardar la receta. Revisa los valores e intenta de nuevo.',
    errorSimulate: 'No pudimos simular el precio. Revisa la receta e intenta de nuevo.',

    // Success toasts
    toastCreated: (sku: string) => `Servicio creado — SKU ${sku} asignado`,
    toastUpdated: 'Cambios guardados',
    toastRecipeUpdated: 'Receta guardada',
    toastDeactivated: (sku: string) =>
      `Servicio ${sku} desactivado — no aparecerá en nuevas cotizaciones`,
    toastReactivated: (sku: string) => `Servicio ${sku} reactivado`
  },
  adminTiers: 'Tiers de rol',
  adminCommercialModels: 'Modelos comerciales',
  adminCountryFactors: 'Factores de país',
  adminEmploymentTypes: 'Tipos de contratación',
  adminAudit: 'Historial de cambios',

  // Success / error toasts
  toastQuoteSaved: 'Borrador guardado',
  toastQuoteSent: (email: string) => `Cotización enviada a ${email}`,
  toastRoleUpdated: (label: string) => `${label} actualizado`,
  errorLoadCatalog: 'No pudimos cargar el catálogo. Intenta de nuevo.',
  errorLoadQuote: 'No pudimos cargar esta cotización. Verifica el enlace e intenta de nuevo.',

  // Builder Command Bar redesign (TASK-487)
  identityStrip: {
    draftLabel: 'Borrador',
    sentLabel: 'Enviada',
    approvedLabel: 'Aprobada',
    expiredLabel: 'Vencida',
    numberPlaceholder: 'Q-NUEVO',
    validUntilLabel: 'Válida hasta',
    validUntilEmpty: 'Sin fecha',
    ariaLabel: 'Identidad de la cotización',

    // TASK-615: dynamic subtitle that mirrors the next required step.
    // Header conserva identidad y save draft; el dock es el único centro
    // de la acción terminal.
    subtitleReady: 'Lista para emitir desde el resumen.',
    subtitleNeedsLines: 'Agrega ítems desde el detalle para calcular el total.',
    subtitleNeedsOrganization: 'Selecciona la organización para destrabar el flujo.',
    subtitleNeedsContact: 'Falta un contacto comercial para poder emitir.',
    subtitleNeedsDeal: 'Vincula un deal de HubSpot para esta cotización.',
    subtitleEditingIssued: 'Estás ajustando una cotización ya emitida.',
    subtitlePendingApproval: 'En aprobación: el cierre se libera al recibir respuesta.',
    saveDraftMeta: 'Solo guarda. Para emitir, usa el resumen abajo.'
  },
  contextChips: {
    ariaLabel: 'Contexto de la cotización',
    overflowLabel: 'Más opciones',
    requiredBadge: 'Requerido',
    lockedHint: 'No se puede cambiar después de crear la cotización',
    organization: {
      label: 'Organización',
      placeholder: 'Seleccionar organización',
      icon: 'tabler-building',
      hint: 'Cliente o prospecto de la cotización',
      unifiedSearchPlaceholder: 'Buscar por nombre o dominio…',
      unifiedMinQuery: 'Escribe al menos 2 caracteres para buscar.',
      unifiedEmpty: 'No encontramos organizaciones con ese nombre o dominio.',
      unifiedError: 'No pudimos actualizar los resultados ahora mismo.',
      unifiedRetry: 'Reintentar',
      unifiedAdopting: 'Adoptando organización desde HubSpot…',
      unifiedAdopted: 'Organización adoptada desde HubSpot',
      unifiedNoAdoptPermission: 'Sin permiso para adoptar'
    },
    contact: {
      label: 'Contacto',
      placeholder: 'Agregar contacto',
      icon: 'tabler-user',
      hint: 'Persona de la organización responsable',
      noOrgFirst: 'Selecciona una organización primero',
      loading: 'Cargando contactos…',
      empty: 'Sin contactos registrados en esta organización',
      primaryBadge: 'Principal'
    },
    deal: {
      label: 'Deal HubSpot',
      placeholder: 'Vincular deal',
      icon: 'tabler-briefcase-2',
      hint: 'Vincula la cotización a una oportunidad de HubSpot. Requiere contacto comercial.',
      noOrgFirst: 'Selecciona una organización primero',
      loading: 'Cargando deals…',
      empty: 'Sin deals disponibles para esta organización',
      emptyHelper: 'Vincula una Company HubSpot o crea un deal nuevo',
      searchFooterPrompt: '¿No encontrás el deal que buscás?',
      createNewLabel: 'Crear deal nuevo'
    },
    businessLine: {
      label: 'Business line',
      placeholder: 'Sin BL',
      icon: 'tabler-target'
    },
    commercialModel: {
      label: 'Modelo comercial',
      placeholder: 'Seleccionar modelo',
      icon: 'tabler-briefcase'
    },
    countryFactor: {
      label: 'País',
      placeholder: 'Seleccionar país',
      icon: 'tabler-world'
    },
    currency: {
      label: 'Moneda',
      placeholder: 'CLP',
      icon: 'tabler-currency-dollar'
    },
    duration: {
      label: 'Duración',
      placeholder: 'Meses',
      icon: 'tabler-clock',
      hint: 'Requerido para retainer o híbrido',
      unit: (n: number) => (n === 1 ? '1 mes' : `${n} meses`)
    },
    validUntil: {
      label: 'Válida hasta',
      placeholder: 'dd/mm/aaaa',
      icon: 'tabler-calendar-event'
    },
    progress: {
      suffix: (total: number) => `de ${total} campos`,
      readyLabel: 'Lista para emitir',
      readyAriaLive: 'Cotización lista. Puedes guardar y emitir desde el resumen.',
      nextStepPrefix: 'Sigue:',
      nextSteps: {
        organization: 'elige una organización',
        contact: 'agrega un contacto',
        deal: 'vincula un deal',
        businessLine: 'asigna una business line',
        duration: 'define la duración',
        validUntil: 'fija la fecha de validez',
        lines: 'agrega ítems al detalle'
      } as const,
      ariaLive: (filled: number, total: number) => {
        const percent = total > 0 ? Math.round((filled / total) * 100) : 0
        const missing = Math.max(0, total - filled)

        return `Cotización completa en ${percent}%. Faltan ${missing} campos.`
      }
    },
    groupLabels: {
      party: 'Cliente',
      terms: 'Términos comerciales',
      timing: 'Plazos',
      termsAndTiming: 'Términos y plazos'
    }
  },
  summaryDock: {
    ariaLabel: 'Resumen de la cotización',
    subtotalLabel: 'Subtotal',
    factorLabel: 'Factor',
    ivaLabel: 'IVA',
    totalLabel: 'Total',
    addonsChip: (n: number) => (n === 1 ? '1 addon' : `${n} addons`),
    addonsChipEmpty: 'Sin addons',
    primaryCta: 'Guardar y emitir',
    previewCta: 'Vista previa',
    loadingLabel: 'Calculando…',
    collapsedLabelPrefix: 'Total',
    collapsedExpandLabel: 'Ver detalle',
    mobileTotalLabel: 'Total de la cotización',

    // Empty / partial state copy — instructive, secuencial, no genérico.
    emptyNoOrganization: 'Elige una organización para empezar a calcular el total.',
    emptyNoLines: 'Agrega al menos un ítem para ver subtotal, IVA y margen.',

    // Disabled-CTA reasons — el dock las expone como tooltip y aria-describedby.
    disabledReasons: {
      busy: 'Estamos guardando los últimos cambios. Espera un instante.',
      noLines: 'Agrega al menos un ítem antes de emitir.',
      noOrganization: 'Selecciona la organización para poder emitir.',
      notIssueable: 'Esta cotización ya no se puede emitir desde el builder.',
      simulationError: 'Resuelve los avisos del motor antes de emitir.'
    }
  },
  addMenu: {
    triggerLabel: 'Agregar ítem',
    defaultAriaLabel: 'Agregar ítem desde catálogo',
    caretAriaLabel: 'Más opciones de agregado',
    items: {
      catalog: 'Desde catálogo',
      service: 'Desde servicio empaquetado',
      template: 'Desde template',
      manual: 'Línea manual'
    }
  },
  lineWarning: {
    ariaPrefix: 'Advertencia en fila',
    scrollAnchorLabel: 'Ir a la fila',
    genericTitle: 'Atención requerida',
    dismissLabel: 'Ocultar advertencia'
  },
  emptyItems: {
    eyebrow: 'Detalle de la cotización',
    title: 'Compón el alcance con ítems del catálogo',
    subtitle: 'Cada ítem se procesa con el motor de pricing v2: total, margen y addons se calculan en tiempo real.',

    // Method hints — ensenan el modelo de composicion (catalog / service /
    // template / manual) sin un placeholder generico "empezar".
    methodHints: [
      {
        icon: 'tabler-books',
        title: 'Desde catálogo',
        description: 'Roles, herramientas y overhead aprobados con tarifa vigente.'
      },
      {
        icon: 'tabler-package',
        title: 'Servicio empaquetado',
        description: 'Un EFG-XXX expande roles, horas y duración en un solo paso.'
      },
      {
        icon: 'tabler-template',
        title: 'Template guardado',
        description: 'Reutiliza una cotización validada y ajusta los detalles.'
      },
      {
        icon: 'tabler-edit',
        title: 'Línea manual',
        description: 'Solo cuando lo que cobras todavía no existe en el catálogo.'
      }
    ] as const,

    ctaPrimary: 'Agregar desde catálogo',
    ctaSecondary: 'Desde servicio empaquetado',
    ctaTertiary: 'Desde template',
    ctaManual: 'Crear línea manual',
    pendingNote: (label: string) => `Aún falta ${label} antes de poder emitir.`
  },
  adjustPopover: {
    triggerLabel: 'Ajustes de pricing',
    title: 'Ajustes de pricing',
    subtitle: 'Dedicación y tipo de contratación aplicados a esta línea. Los períodos se controlan desde la columna Cantidad.',
    fteLabel: 'FTE',
    fteHelper: '0.1 a 1.0 (fracción dedicada)',
    employmentTypeLabel: 'Tipo de contratación',
    employmentTypePlaceholder: 'Default del rol si vacío',
    applyLabel: 'Aplicar',
    closeLabel: 'Cerrar'
  },
  detailAccordion: {
    title: 'Detalle y notas',
    descriptionLabel: 'Descripción',
    descriptionPlaceholder: 'Alcance del servicio, contexto, notas internas…'
  },

  // ────────────────────────────────────────────────────────────────
  // TASK-481 — Cost provenance (source_kind + confidence + freshness)
  // ────────────────────────────────────────────────────────────────
  costProvenance: {
    sectionTitle: 'Trazabilidad del costo',
    sourceLabel: 'Fuente',
    confidenceLabel: 'Confianza',
    freshnessLabel: 'Vigencia',
    sourceRefLabel: 'Referencia',
    snapshotDateLabel: 'Snapshot',

    sourceKinds: {
      member_actual: {
        label: 'Costo real del miembro',
        shortDescription: 'Costo observado en compensación de la persona asignada.'
      },
      role_blended: {
        label: 'Promedio blended del rol',
        shortDescription: 'Promedio ponderado del costo observado en todas las personas del rol.'
      },
      role_modeled: {
        label: 'Modelo del rol',
        shortDescription: 'Modelado desde rate cards cuando no hay costo real del rol todavía.'
      },
      tool_snapshot: {
        label: 'Snapshot de herramienta',
        shortDescription: 'Costo observado en la última materialización del proveedor.'
      },
      tool_catalog_fallback: {
        label: 'Catálogo como fallback',
        shortDescription: 'Sin snapshot disponible; se usa el costo de catálogo como referencia.'
      },
      manual: {
        label: 'Override manual',
        shortDescription: 'Costo ingresado manualmente con motivo registrado.'
      }
    } as Record<string, { label: string; shortDescription: string }>,

    confidenceBuckets: {
      high: {
        label: 'Alta',
        shortDescription: 'Datos recientes y consistentes; úsalo como sugerencia principal.'
      },
      medium: {
        label: 'Media',
        shortDescription: 'Datos parciales o con algo de desfase; revísalo si la línea es crítica.'
      },
      low: {
        label: 'Baja',
        shortDescription: 'Datos escasos o desactualizados; considera override si el monto es relevante.'
      }
    } as Record<string, { label: string; shortDescription: string }>,

    freshnessLabelFresh: 'Reciente',
    freshnessLabelStale: 'Desactualizado',
    freshnessLabelVeryStale: 'Muy desactualizado',
    freshnessLabelUnknown: 'Sin fecha',
    freshnessValueFormatter: (days: number | null) => {
      if (days === null || !Number.isFinite(days)) return 'sin fecha'
      if (days <= 0) return 'hoy'
      if (days === 1) return 'hace 1 día'
      if (days < 30) return `hace ${days} días`
      if (days < 60) return 'hace más de un mes'
      const months = Math.floor(days / 30)

      
return `hace ${months} meses`
    },

    fallbackDisclaimerTitle: 'Costo de fallback en uso',
    fallbackDisclaimerBody:
      'No hay snapshot reciente para esta línea. El motor usó el catálogo como referencia. Si el monto es relevante, considera un override con motivo.',
    manualDisclaimerTitle: 'Costo override',
    manualDisclaimerBody:
      'Este costo fue ingresado manualmente por el equipo comercial. Revisa el motivo en el historial antes de emitir.',

    popoverTitle: 'Detalle de trazabilidad',
    popoverOpenAria: 'Abrir detalle de trazabilidad del costo',
    popoverCloseAria: 'Cerrar detalle de trazabilidad',
    resolutionNotesLabel: 'Notas del motor',
    resolutionNotesEmpty: 'Sin notas adicionales.',
    noProvenanceState: 'Aún no hay metadata de trazabilidad para esta línea.'
  },

  // ────────────────────────────────────────────────────────────────
  // TASK-481 — Cost override governance (dialog + validation + history)
  // ────────────────────────────────────────────────────────────────
  costOverride: {
    ctaLabel: 'Override costo',
    ctaLabelShort: 'Override',
    ctaDisabledTooltip:
      'No tienes permiso para aplicar overrides. Contacta a finance_admin.',

    dialogTitle: 'Aplicar override de costo',
    dialogSubtitle:
      'Reemplaza el costo sugerido por un valor manual. Queda registrado con motivo y actor.',
    dialogAriaLabel: 'Override manual del costo de la línea',
    cancelCta: 'Cancelar',
    submitCta: 'Aplicar override',
    submittingCta: 'Aplicando…',
    closeLabel: 'Cerrar',

    suggestedLabel: 'Costo sugerido',
    suggestedMissing: 'Sin sugerencia',
    suggestedProvenancePrefix: 'Fuente: ',

    overrideLabel: 'Nuevo costo por unidad',
    overrideHelper: 'Monto en USD. Se aplica al costo unitario de la línea.',
    overridePlaceholder: 'ej. 120.00',
    overrideRequiredError: 'Ingresa un costo mayor o igual a 0.',
    overrideInvalidError: 'El costo debe ser un número válido.',

    categoryLabel: 'Motivo del override',
    categoryPlaceholder: 'Selecciona una categoría',
    categoryRequiredError: 'Selecciona una categoría para continuar.',
    categoryAriaDescription:
      'Selecciona el motivo principal del override para análisis posterior.',
    categories: {
      competitive_pressure: {
        label: 'Presión competitiva',
        shortDescription: 'Ajuste por oferta competitiva o match de precio.'
      },
      strategic_investment: {
        label: 'Inversión estratégica',
        shortDescription: 'Proyecto que invertimos deliberadamente por valor futuro.'
      },
      roi_correction: {
        label: 'Corrección de ROI',
        shortDescription: 'Ajuste porque el cálculo original sobre/sub estima el ROI real.'
      },
      error_correction: {
        label: 'Corrección por error',
        shortDescription: 'Fix a un dato de catálogo o snapshot incorrecto.'
      },
      client_negotiation: {
        label: 'Negociación con cliente',
        shortDescription: 'Acuerdo puntual con el cliente que amerita registrarse.'
      },
      other: {
        label: 'Otro motivo',
        shortDescription: 'Detalla el motivo en el campo de texto.'
      }
    } as Record<string, { label: string; shortDescription: string }>,

    reasonLabel: 'Detalle del motivo',
    reasonHelperShort: '15 caracteres mínimo. Para auditoría y análisis de patrones.',
    reasonHelperOther: '30 caracteres mínimo cuando la categoría es "Otro motivo".',
    reasonPlaceholder:
      'Ej. Match de oferta de Acme por USD 10.000/mes para cerrar Q2.',
    reasonAriaDescription: 'Texto libre que describe por qué se aplica el override.',
    reasonTooShortError: (min: number, current: number) =>
      `Mínimo ${min} caracteres. Llevas ${current}.`,
    reasonTooLongError: 'Máximo 500 caracteres.',
    reasonCounter: (current: number, max: number) => `${current} / ${max}`,

    deltaLabel: 'Variación vs sugerido',
    deltaAbove: (pct: number) => `+${pct}% sobre sugerido`,
    deltaBelow: (pct: number) => `${pct}% bajo sugerido`,
    deltaEqual: 'Igual al sugerido',
    deltaNoBaseline: 'Sin sugerencia para comparar',

    impactLabel: 'Impacto estimado',
    impactMarginHintAbove: 'Un costo mayor reduce el margen de la línea.',
    impactMarginHintBelow: 'Un costo menor aumenta el margen de la línea.',
    impactLineTotalPrefix: 'Nuevo total de línea: ',

    historyTitle: 'Overrides previos',
    historyEmpty: 'Esta línea no tiene overrides previos.',
    historyCountOne: '1 override previo',
    historyCountMany: (n: number) => `${n} overrides previos`,
    historyEntryByActor: (actorLabel: string, dateLabel: string) =>
      `${actorLabel} · ${dateLabel}`,
    historyEntryActorSystem: 'Sistema',
    historyEntryActorFallback: 'Actor desconocido',
    historyLoadingLabel: 'Cargando historial…',
    historyLoadError: 'No pudimos cargar el historial. Intenta de nuevo.',

    confirmTitle: 'Confirmar override',
    confirmBody: (from: string, to: string, pct: string) =>
      `Vas a reemplazar el costo sugerido de ${from} por ${to} (${pct}). Queda registrado con tu motivo.`,
    confirmBodyNoBaseline: (to: string) =>
      `Vas a fijar el costo en ${to} manualmente. Queda registrado con tu motivo.`,

    successToast: 'Override aplicado. El costo de la línea ahora es manual.',
    errorToastGeneric:
      'No pudimos aplicar el override. Revisa el motivo e intenta de nuevo.',
    errorToastForbidden: 'No tienes permiso para aplicar este override.',
    errorToastNotFound: 'La línea ya no existe. Recarga la cotización.',

    noPermissionBanner:
      'Solo roles finance_admin o efeonce_admin pueden aplicar overrides.'
  }
} as const

// ────────────────────────────────────────────────────────────────
// TASK-457 — Revenue Pipeline comercial (unificado: deals + quotes)
// ────────────────────────────────────────────────────────────────

export const GH_PRICING_GOVERNANCE = {
  // Slice 1 — AuditDiffViewer
  auditDiff: {
    sectionTitle: 'Detalle del cambio',
    previousColumnLabel: 'Antes',
    newColumnLabel: 'Después',
    noChangesLabel: 'Sin cambios registrados',
    unchangedFieldsSummary: (n: number) => `${n} campo${n === 1 ? '' : 's'} sin cambios`,
    changedFieldsSummary: (n: number) => `${n} campo${n === 1 ? '' : 's'} con cambios`,
    noValueLabel: '(sin valor)',
    copyJsonLabel: 'Copiar JSON',
    copiedLabel: 'Copiado',
    copyFailedLabel: 'No se pudo copiar',
    addedMarker: 'Agregado',
    removedMarker: 'Quitado',
    deltaAbove: (delta: string, pct: string) => `+${delta} (+${pct}%)`,
    deltaBelow: (delta: string, pct: string) => `${delta} (${pct}%)`,
    deltaZero: 'Sin variación',
    createdStateTitle: 'Entidad creada',
    createdStateSubtitle: 'Valores iniciales de la nueva entidad.',
    deactivatedStateTitle: 'Entidad desactivada',
    deactivatedStateSubtitle: 'Último estado conocido antes de desactivar.',
    reactivatedStateTitle: 'Entidad reactivada',
    deletedStateTitle: 'Entidad eliminada',
    deletedStateSubtitle: 'Valores al momento de la eliminación.',
    bulkImportedStateTitle: 'Importación masiva',
    bulkImportedStateSubtitle: 'Cambio aplicado como parte de un batch de importación Excel.',
    recipeUpdatedStateTitle: 'Receta de servicio actualizada',
    costUpdatedStateTitle: 'Componentes de costo actualizados',
    pricingUpdatedStateTitle: 'Pricing actualizado',
    revertedStateTitle: 'Reversión aplicada',
    revertedStateSubtitle: 'Rollback de un cambio anterior.',
    approvalAppliedStateTitle: 'Cambio aprobado y aplicado',
    approvalAppliedStateSubtitle: 'Cambio aplicado tras aprobación por un segundo admin.',
    bulkEditedStateTitle: 'Edición masiva',
    bulkEditedStateSubtitle: 'Cambio aplicado a múltiples entidades en una sola acción.'
  },

  // Slice 2 — Revert
  auditRevert: {
    triggerLabel: 'Revertir',
    triggerDisabledAlreadyReverted: 'Este cambio ya fue revertido',
    triggerDisabledBulk: 'Los cambios masivos no se pueden revertir con un click',
    triggerDisabledReadOnly: 'Esta entidad no soporta revert automático',
    triggerDisabledFteGuideReadOnly:
      'La guía FTE sigue siendo solo lectura. Revísala desde governance antes de corregirla manualmente.',
    triggerDisabledEntityGone: 'La entidad ya no existe',
    triggerDisabledNoPermission: 'Solo efeonce_admin puede revertir cambios del catálogo',
    dialogTitle: 'Revertir cambio',
    dialogSubtitle: 'Vas a restaurar el estado previo de esta entidad. Queda registrado con motivo.',
    previousStateLabel: 'Estado que se va a restaurar',
    currentStateLabel: 'Estado actual (se va a perder)',
    reasonLabel: 'Motivo de la reversión',
    reasonPlaceholder: 'Ej. Corrección por error — el rol debía mantener el margen original.',
    reasonHelper: '15 caracteres mínimo. Se registra en el audit log para trazabilidad.',
    reasonTooShortError: (min: number, current: number) =>
      `Mínimo ${min} caracteres. Llevas ${current}.`,
    reasonTooLongError: 'Máximo 500 caracteres.',
    submitCta: 'Revertir cambio',
    submittingCta: 'Revirtiendo…',
    cancelCta: 'Cancelar',
    successToast: 'Cambio revertido. Se registró en el audit log.',
    errorToastGeneric: 'No pudimos revertir el cambio. Intenta de nuevo.',
    errorToastConflict: 'La entidad fue modificada después de este audit. Actualiza y vuelve a intentar.',
    errorToastForbidden: 'No tienes permiso para revertir cambios del catálogo.',
    errorToastEntityGone: 'La entidad ya no existe. No se puede revertir.'
  },

  // Slice 3 — Bulk edit
  bulkEdit: {
    selectAllLabel: 'Seleccionar todos',
    selectedCountLabel: (n: number) => `${n} seleccionado${n === 1 ? '' : 's'}`,
    clearSelectionLabel: 'Limpiar selección',
    bulkEditCta: 'Editar selección',
    bulkDeactivateCta: 'Desactivar selección',
    drawerTitle: 'Edición masiva',
    drawerSubtitle: (n: number) =>
      `${n} ${n === 1 ? 'entidad seleccionada' : 'entidades seleccionadas'}. Los cambios se aplican a todas.`,
    activeFieldLabel: 'Estado activo',
    activeFieldOnlySome: 'Solo algunos están activos actualmente',
    categoryFieldLabel: 'Categoría',
    tierFieldLabel: 'Tier',
    notesFieldLabel: 'Notas (se agrega al final)',
    notesFieldPlaceholder: 'Ej. ajuste Q2 por revisión de pricing',
    previewCtaLabel: 'Previsualizar impacto',
    previewingLabel: 'Calculando impacto…',
    applyCtaLabel: 'Aplicar a selección',
    applyingCtaLabel: 'Aplicando…',
    confirmAggregateImpact: (quotes: number, pipelineClp: string) =>
      `Este cambio afectará ${quotes} cotización${quotes === 1 ? '' : 'es'} activa${quotes === 1 ? '' : 's'} y ${pipelineClp} en pipeline.`,
    emptyChangesetError: 'Selecciona al menos un campo a modificar.',
    successToast: (n: number) => `${n} ${n === 1 ? 'entidad actualizada' : 'entidades actualizadas'}.`,
    partialToast: (ok: number, failed: number) =>
      `${ok} aplicadas, ${failed} con error. Revisa el detalle.`,
    errorToast: 'No pudimos aplicar el cambio masivo.',
    cancelCta: 'Cancelar'
  },

  // Slice 4 — Impact preview panel
  impactPreview: {
    triggerLabel: 'Ver impacto',
    triggerLoadingLabel: 'Calculando…',
    panelTitle: 'Impacto estimado',
    affectedQuotesLabel: 'Cotizaciones afectadas',
    affectedQuotesCountLabel: (n: number) => `${n} activa${n === 1 ? '' : 's'}`,
    affectedQuotesPipelineLabel: 'Monto en pipeline',
    affectedDealsLabel: 'Deals vinculados',
    affectedDealsCountLabel: (n: number) => `${n} deal${n === 1 ? '' : 's'}`,
    sampleQuotesLabel: 'Muestra',
    noImpactLabel: 'Sin impacto detectado sobre cotizaciones activas.',
    warningsLabel: 'Advertencias del validador',
    highImpactLabel: 'Impacto alto — requiere confirmación',
    highImpactCheckboxLabel: 'Entiendo el impacto y quiero continuar',
    blockingSaveCta: 'Confirmar impacto alto',
    blockingSaveToast: 'Confirma el impacto alto en el panel antes de guardar en esta pestaña.',
    refreshLabel: 'Recalcular',
    errorLoadingLabel: 'No pudimos calcular el impacto. Intenta de nuevo.'
  },

  // Slice 5 — Approvals queue (maker-checker)
  approvals: {
    navLabel: 'Aprobaciones pendientes',
    navDescription: 'Cambios críticos que esperan revisión de un segundo admin.',
    pageTitle: 'Aprobaciones de catálogo',
    pageSubtitle:
      'Cambios high/critical aplicados por el catálogo requieren la revisión de un segundo efeonce_admin antes de tomar efecto.',
    emptyStateTitle: 'Sin aprobaciones pendientes',
    emptyStateSubtitle: 'Cuando alguien proponga un cambio crítico, aparecerá acá.',
    statusLabel: 'Estado',
    proposerLabel: 'Propuesto por',
    reviewerLabel: 'Revisado por',
    criticalityLabel: 'Criticidad',
    criticalityCritical: 'Crítica',
    criticalityHigh: 'Alta',
    criticalityMedium: 'Media',
    criticalityLow: 'Baja',
    statusPending: 'Pendiente',
    statusApproved: 'Aprobada',
    statusRejected: 'Rechazada',
    statusCancelled: 'Cancelada',
    diffPreviewLabel: 'Cambio propuesto',
    justificationLabel: 'Justificación',
    justificationMissing: 'Sin justificación',
    approveCta: 'Aprobar',
    rejectCta: 'Rechazar',
    cancelCta: 'Cancelar propuesta',
    commentLabel: 'Comentario',
    commentPlaceholder: 'Ej. Aprobado tras validar con Finance.',
    commentRequiredError: 'El comentario es obligatorio para registrar la decisión.',
    commentTooShortError: (min: number) => `Mínimo ${min} caracteres.`,
    approveSuccessToast: 'Cambio aprobado y aplicado.',
    rejectSuccessToast: 'Propuesta rechazada.',
    cancelSuccessToast: 'Propuesta cancelada.',
    errorSelfApprove: 'No podés aprobar tus propias propuestas.',
    errorGenericToast: 'No se pudo completar la decisión. Intenta de nuevo.',
    proposedBannerTitle: 'Cambio propuesto para revisión',
    proposedBannerSubtitle: 'Otro efeonce_admin debe aprobarlo antes de que tome efecto.',
    proposedJustificationLabel: 'Justificación del cambio',
    proposedJustificationPlaceholder: 'Ej. Ajuste solicitado por Finance por revisión Q2.',
    proposedJustificationRequiredError: 'La justificación es obligatoria para cambios high/critical.'
  },

  // Slice 6 — Excel roundtrip
  excel: {
    exportCta: 'Exportar catálogo a Excel',
    exportingLabel: 'Generando Excel…',
    exportErrorToast: 'No pudimos generar el Excel. Intenta de nuevo.',
    importNavLabel: 'Importar catálogo',
    importNavDescription: 'Subir Excel + previsualizar cambios + aplicar selectivamente.',
    importPageTitle: 'Importar catálogo desde Excel',
    importPageSubtitle:
      'Subí un archivo Excel con el formato de export. Mostramos el diff contra el estado actual antes de aplicar cualquier cambio.',
    dropzoneLabel: 'Arrastra el archivo Excel o hacé click para seleccionar',
    dropzoneInvalidType: 'Solo se aceptan archivos .xlsx',
    uploadingLabel: 'Procesando archivo…',
    parseErrorLabel: 'No pudimos leer el archivo. Revisá que tenga el formato correcto.',
    diffSectionTitle: 'Diff del catálogo',
    noDiffsLabel: 'No hay cambios entre el archivo y el estado actual.',
    diffActionCreate: 'Crear',
    diffActionUpdate: 'Actualizar',
    diffActionDelete: 'Eliminar',
    diffActionNoop: 'Sin cambios',
    diffStatusApplyNow: 'Aplicable ahora',
    diffStatusNeedsFollowup: 'Requiere follow-up',
    diffStatusNoChanges: 'Sin acción',
    selectDiffLabel: 'Aplicar',
    skipDiffLabel: 'Saltar',
    applySelectedCta: 'Aplicar cambios seleccionados',
    proposeApprovalCta: 'Proponer aprobación',
    applyingLabel: 'Aplicando…',
    proposingLabel: 'Proponiendo…',
    diffSummaryProcessedLabel: (processed: number) =>
      `${processed} fila${processed === 1 ? '' : 's'} procesada${processed === 1 ? '' : 's'}`,
    diffSummaryApplicableLabel: (count: number) =>
      `${count} update${count === 1 ? '' : 's'} aplicable${count === 1 ? '' : 's'} ahora`,
    diffSummaryProposalLabel: (count: number) =>
      `${count} cambio${count === 1 ? '' : 's'} listo${count === 1 ? '' : 's'} para aprobación`,
    diffSummaryNeedsFollowupLabel: (count: number) =>
      `${count} cambio${count === 1 ? '' : 's'} requiere${count === 1 ? '' : 'n'} otra vía`,
    updatesOnlyBannerTitle: 'Esta pantalla aplica solo updates sobre entidades existentes',
    updatesOnlyBannerBody: (approvalReady: number) =>
      approvalReady > 0
        ? 'Los updates seleccionados aplican directo. Las altas y bajas seleccionadas van por propuesta de aprobación antes de persistirse.'
        : 'Los updates seleccionados aplican directo. Las altas y bajas necesitan pasar por propuesta de aprobación antes de persistirse.',
    approvalFollowupTitle: 'El batch incluye cambios que no se aplican desde Excel',
    approvalFollowupBody: (createCount: number, deleteCount: number) => {
      const parts = []

      if (createCount > 0) parts.push(`${createCount} alta${createCount === 1 ? '' : 's'}`)
      if (deleteCount > 0) parts.push(`${deleteCount} baja${deleteCount === 1 ? '' : 's'}`)

      return `${parts.join(' y ')} requieren revisión desde Admin / governance antes de persistirlas. Selecciónalas y usa "Proponer aprobación" para enviarlas a la cola.`
    },
    approvalQueueCta: 'Abrir cola de aprobaciones',
    followupCreateLabel: 'Alta nueva: selecciónala para mandarla a aprobación.',
    followupDeleteLabel: 'Eliminación pendiente: selecciónala para mandarla a aprobación.',
    applyReadyHelper: 'Update sobre una entidad existente.',
    applySuccessToast: (n: number) => `${n} ${n === 1 ? 'cambio aplicado' : 'cambios aplicados'}.`,
    applyPartialToast: (ok: number, failed: number) =>
      `${ok} aplicados, ${failed} con error.`,
    applyErrorToast: 'No pudimos aplicar los cambios. Intenta de nuevo.',
    proposeSuccessToast: (n: number) =>
      `${n} ${n === 1 ? 'propuesta enviada a aprobación' : 'propuestas enviadas a aprobación'}.`,
    proposeErrorToast: 'No pudimos crear las propuestas de aprobación. Intenta de nuevo.',
    sheetLabels: {
      roles: 'Roles',
      tools: 'Herramientas',
      overheads: 'Overhead addons',
      services: 'Servicios',
      employmentTypes: 'Modalidades',
      roleTierMargins: 'Tier margins (roles)',
      serviceTierMargins: 'Tier margins (servicios)',
      commercialModels: 'Modelos comerciales',
      countryFactors: 'Factores país',
      fteHoursGuide: 'Guía FTE',
      metadata: 'Metadata'
    }
  }
} as const
