// TASK-992 mockup — Client Onboarding wizard (single front door).
// Copy es-CL (tuteo chileno) for the two-pane onboarding wizard + its surfaces
// (HubSpot/Nubox pickers, existing-org dialog, exit dialog, success screen),
// the redefined finance facet drawer, and the Account 360 lifecycle timeline.
// All user-visible strings live here (greenhouse-ux-writing: no literals in JSX).
// Tone: onboarding = cálido/alentador; errores = [qué]+[por qué]+[cómo arreglar].
// Register: es-CL tuteo (tú) — NO voseo. Anglicismo "company" → "empresa".

export const GH_CLIENT_ONBOARDING = {
  // --- Completitud de cliente existente (media-cocido) -----------------------
  // Cuando el operador selecciona una org que ya existe (picker HubSpot o gate de
  // duplicado), el wizard detecta si quedó incompleta y adapta el CTA. Tono:
  // tranquilizador (no es un error del operador) + claro sobre qué se completará.
  completeness: {
    incompleteTitle: 'Este cliente ya existe, pero quedó incompleto',
    incompleteBody: 'Al continuar, Greenhouse completa lo que falta (no duplica nada):',
    completeCta: 'Completar cliente',
    completeTitle: 'Este cliente ya está activo y completo',
    completeBody: 'No falta ninguna pieza. Al continuar abrís su ficha y su onboarding.',
    openCta: 'Abrir cliente',
    gaps: {
      client_profile: 'Ficha de cliente (perfil + facturación)',
      space: 'Space operativo',
      onboarding_case: 'Caso de onboarding con su checklist'
    } as Record<string, string>
  },
  // --- Shell / chrome --------------------------------------------------------
  shell: {
    pageTitle: 'Nuevo cliente',
    pageEyebrow: 'Alta de cliente',
    saveAndExit: 'Guardar y salir',
    backCta: 'Atrás',
    nextCta: 'Continuar',
    createCta: 'Crear cliente',
    progressLabel: 'Progreso',
    autosaveNoChanges: 'Sin cambios',
    autosaveIdle: 'Borrador guardado',
    autosaveSaving: 'Guardando…',
    stepperAria: 'Pasos del alta de cliente',
    originChipPrefix: 'Origen',
    // Step short labels (rail)
    stepOrigen: 'Origen',
    stepIdentidad: 'Identidad',
    stepComercial: 'Comercial',
    stepFinanzas: 'Finanzas',
    stepSpace: 'Espacio',
    stepConfirmar: 'Confirmar',
    // Per-step rail status
    statusDone: 'Completado',
    statusActive: 'En curso',
    statusPending: 'Pendiente',
    statusBlocked: 'Requiere atención'
  },

  // --- Step 1: Origen --------------------------------------------------------
  origen: {
    title: '¿De dónde viene este cliente?',
    subtitle: 'Elige el origen para precargar lo que ya sabemos y que no escribas de cero.',
    hubspotCardTitle: 'Desde HubSpot',
    hubspotCardSubtitle: 'Una empresa que ya existe en tu CRM',
    hubspotCardDetail: 'Traemos nombre, país e identificadores. Tú confirmas y completas.',
    nuboxCardTitle: 'Desde Nubox',
    nuboxCardSubtitle: 'Una venta o cliente ya facturado',
    nuboxCardDetail: 'Precargamos identidad tributaria y moneda desde el registro de Nubox.',
    manualCardTitle: 'Manual',
    manualCardSubtitle: 'Lo ingresas tú desde cero',
    manualCardDetail: 'Sin precarga. Completas cada campo en los próximos pasos.',
    pickHubspotCta: 'Buscar empresa en HubSpot',
    pickNuboxCta: 'Buscar venta en Nubox',
    pickedPrefix: 'Seleccionada',
    changeSelectionCta: 'Cambiar',
    error: 'Elige un origen para continuar.',
    pickRequired: 'Elige una empresa para continuar, o cambia a modo manual.'
  },

  // --- HubSpot picker dialog -------------------------------------------------
  hubspotPicker: {
    title: 'Buscar empresa en HubSpot',
    subtitle: 'Encuentra la empresa y la traemos con sus datos.',
    searchLabel: 'Buscar por nombre o dominio',
    searchPlaceholder: 'Ej: Berel, berel.com.mx…',
    resultsCountPrefix: 'resultados',
    loading: 'Buscando en HubSpot…',
    emptyTitle: 'Sin resultados',
    empty: 'No encontramos empresas con ese término. Prueba con otro nombre o dominio.',
    clearSearchCta: 'Limpiar búsqueda',
    degradedTitle: 'HubSpot no responde',
    degradedDescription: 'No pudimos consultar tu CRM ahora. Reintenta o sigue en modo manual.',
    retryCta: 'Reintentar',
    selectCta: 'Usar esta empresa',
    cancelCta: 'Cancelar',
    columnCompany: 'Empresa',
    columnDomain: 'Dominio',
    columnCountry: 'País',
    columnStage: 'Etapa'
  },

  // --- Nubox picker dialog ---------------------------------------------------
  nuboxPicker: {
    title: 'Buscar venta en Nubox',
    subtitle: 'Traemos identidad tributaria y moneda desde el registro.',
    searchLabel: 'Buscar por razón social o ID tributario',
    searchPlaceholder: 'Ej: Pinturas Berel, PBE970101718…',
    resultsCountPrefix: 'resultados',
    emptyTitle: 'Sin resultados',
    empty: 'No encontramos registros con ese término.',
    clearSearchCta: 'Limpiar búsqueda',
    selectCta: 'Usar este registro',
    cancelCta: 'Cancelar',
    columnName: 'Razón social',
    columnTaxId: 'ID tributario',
    columnCurrency: 'Moneda'
  },

  // --- Step 2: Identidad -----------------------------------------------------
  identidad: {
    title: 'Identidad legal',
    subtitle: 'Confirma quién es y dónde tributa. Esto define cómo facturamos.',
    legalNameLabel: 'Razón social',
    legalNameHelper: 'El nombre legal completo, como aparece en sus documentos.',
    legalNameError: 'Falta la razón social. Es el nombre legal del cliente.',
    tradeNameLabel: 'Nombre comercial',
    tradeNameHelper: 'Opcional. Cómo lo conoces en el día a día si difiere del legal.',
    countryLabel: 'País',
    countryHelper: 'Define el tipo de identificador tributario y la moneda sugerida.',
    countryError: 'Elige el país. Sin él no podemos validar el ID tributario.',
    taxIdLabelGeneric: 'ID tributario',
    taxIdLabelCL: 'RUT',
    taxIdLabelMX: 'RFC',
    taxIdLabelUS: 'EIN',
    taxIdHelper: 'Lo usamos para emitir y conciliar facturas. Aceptamos con o sin puntos/guiones.',
    taxIdErrorMissing: 'Falta el ID tributario. Es obligatorio para facturar.',
    taxIdErrorFormat: 'Ese formato no coincide con el {taxIdLabel} de {country}. Revísalo.',
    taxIdValid: 'Formato válido',
    legalAddressLabel: 'Dirección legal',
    legalAddressHelper: 'Opcional. Aparece en documentos institucionales.',
    industryLabel: 'Industria',
    industryHelper: 'Opcional. Elige de la lista para reportes y segmentación.',
    industryPlaceholder: 'Busca una industria',
    inferredFromHubspot: 'desde HubSpot',
    inferredFromNubox: 'desde Nubox',
    inferredFromCountry: 'auto por país',
    inferredEditHint: 'Edita lo que no cuadre.',
    duplicateTitle: 'Ya existe un cliente con este ID tributario',
    duplicateDescription: 'Encontramos {name} con el mismo ID. ¿Quieres usar ese o seguir creando uno nuevo?',
    duplicateUseExisting: 'Usar el existente',
    duplicateCreateNew: 'Seguir creando'
  },

  // --- Step 3: Comercial -----------------------------------------------------
  comercial: {
    title: 'Términos comerciales',
    subtitle: 'Cómo arranca la relación: tipo de engagement, fechas y fases.',
    engagementKindLabel: 'Tipo de engagement',
    engagementKindHelper: 'Define cómo se trata comercialmente desde el día uno.',
    startDateLabel: 'Fecha de inicio',
    startDateHelper: 'Cuándo empieza la relación comercial.',
    startDateError: 'Falta la fecha de inicio.',
    endDateLabel: 'Fecha de término',
    endDateHelper: 'Opcional. Déjala vacía si es indefinida.',
    endDateError: 'La fecha de término no puede ser anterior al inicio.',
    ownerLabel: 'Responsable comercial',
    ownerHelper: 'Quién lidera esta cuenta.',
    phasesTitle: 'Fases del engagement',
    phasesSubtitle: 'Opcional. Estructura el recorrido (kickoff, operación, reporte, decisión).',
    addPhaseCta: 'Agregar fase',
    addFirstPhaseCta: 'Agregar la primera fase',
    phaseNameLabel: 'Nombre de la fase',
    phaseStartLabel: 'Inicio',
    phaseEndLabel: 'Término',
    phaseSaveCta: 'Agregar',
    phaseCancelCta: 'Cancelar',
    phasesEmpty: 'Todavía no agregas fases. Es opcional.',
    removePhaseAria: 'Quitar fase',
    contractTitle: 'Contrato / MSA',
    contractSubtitle: 'Opcional en este paso. Lo puedes cargar después en el checklist.',
    contractUploadCta: 'Adjuntar contrato'
  },

  // --- Step 4: Finanzas ------------------------------------------------------
  finanzas: {
    title: 'Perfil financiero',
    subtitle: 'Cómo y en qué moneda le facturamos.',
    currencyLabel: 'Moneda de pago',
    currencyHelper: 'En qué moneda emitimos y cobramos.',
    currencyError: 'Elige la moneda de pago.',
    currencyMxNote: 'Sugerida por país: clientes facturados en México usan MXN.',
    paymentTermsLabel: 'Términos de pago (días)',
    paymentTermsHelper: 'Días desde la factura hasta el pago. Ej: 30 = paga a 30 días (Net-30).',
    requiresPoLabel: 'Requiere orden de compra (OC) antes de facturar',
    requiresHesLabel: 'Requiere HES (hoja de entrada de servicio)',
    poNumberLabel: 'OC vigente',
    poNumberHelper: 'Número de la orden de compra activa.',
    hesNumberLabel: 'HES vigente',
    billingAddressLabel: 'Dirección de facturación',
    billingAddressHelper: 'Opcional. Si difiere de la dirección legal.',
    billingCountryLabel: 'País de facturación',
    contactsTitle: 'Contactos de finanzas',
    contactsSubtitle: 'A quién le mandamos las facturas y avisos de cobro.',
    addContactCta: 'Agregar contacto',
    addFirstContactCta: 'Agregar el primero',
    contactNameLabel: 'Nombre',
    contactEmailLabel: 'Email',
    contactRoleLabel: 'Cargo',
    contactSaveCta: 'Agregar',
    contactCancelCta: 'Cancelar',
    contactsEmpty: 'Todavía no agregas contactos de finanzas.',
    contactSuggestTitle: 'Sugeridos desde HubSpot',
    contactSuggestLoading: 'Buscando contactos en HubSpot…',
    contactSuggestEmpty: 'No encontramos contactos asociados en HubSpot. Agrégalo manualmente.',
    contactSuggestDegraded: 'No pudimos cargar los contactos de HubSpot. Agrega el contacto manualmente.',
    contactAddSuggestedCta: 'Agregar',
    contactAddedCta: 'Agregado',
    contactFromHubspotChip: 'HubSpot',
    removeContactAria: 'Quitar contacto',
    specialConditionsLabel: 'Condiciones especiales',
    specialConditionsHelper: 'Opcional. Acuerdos de pago o facturación fuera de lo estándar.'
  },

  // --- Step 5: Space ---------------------------------------------------------
  space: {
    title: 'Espacio operativo',
    subtitle: 'El espacio donde va a vivir la operación del cliente.',
    spaceNameLabel: 'Nombre del espacio',
    spaceNameHelper: 'Normalmente el nombre del cliente.',
    spaceNameError: 'Falta el nombre del espacio.',
    spaceTypeLabel: 'Tipo de espacio',
    numericCodeLabel: 'Código numérico',
    numericCodeHelper: 'Dos dígitos, único. Se usa en cuentas internas y reportes.',
    numericCodeError: 'Usa exactamente 2 dígitos (ej. 07).',
    provisionTitle: 'Aprovisionamiento',
    provisionSubtitle: 'Qué creamos automáticamente al dar de alta.',
    provisionNotionLabel: 'Crear teamspace nuevo en Notion (Tareas, Proyectos, Sprints)',
    provisionTeamsLabel: 'Crear canal de Teams + suscripciones de email',
    linkExistingNote: 'Si el cliente ya tiene su teamspace o canal (ej. Grupo Berel), desactiva la opción y lo vinculas en el checklist de onboarding — con el mismo flujo de conexión de Efeonce y Sky.',
    provisionNotionEcho: 'Teamspace Notion: {name}',
    provisionTeamsEcho: 'Canal Teams: {name}',
    provisionNote: 'Se preparan en segundo plano. Vas a poder verificarlos en el checklist.',

    // TASK-998 — vínculo de teamspace Notion por token scoped (el token ES el scope)
    notionTitle: 'Notion del cliente',
    notionSubtitle: 'Conecta el teamspace donde vive la operación del cliente.',
    notionModeNew: 'Crear teamspace nuevo',
    notionModeNewHint: 'Lo creamos con sus bases (Tareas, Proyectos, Ciclos) al dar de alta.',
    notionModeLink: 'Vincular teamspace existente',
    notionModeLinkHint: 'El cliente ya tiene su teamspace (ej. Grupo Berel). Lo conectas con su token.',
    notionTokenLabel: 'Token de integración Notion',
    notionTokenHelper: 'En Notion, crea una integración interna conectada al teamspace del cliente y pega su token. Empieza con "ntn_".',
    notionTokenPlaceholder: 'ntn_…',
    notionHowTo: '¿Cómo creo la integración?',
    notionValidateCta: 'Validar token',
    notionValidating: 'Validando…',
    notionValidOk: 'Token válido · {n} bases detectadas',
    notionTokenRejected: 'El token fue rechazado por Notion. Verifica que lo copiaste completo.',
    notionPickHint: 'Confirma qué base es cada una. Las marcamos automáticamente por su nombre.',
    notionMapTareas: 'Tareas',
    notionMapProyectos: 'Proyectos',
    notionMapSprints: 'Ciclos (Sprints)',
    notionMapPlaceholder: 'Elegir base…',
    notionOtherDbs: 'Otras bases detectadas ({n})',
    notionSecretNote: 'El token se guarda cifrado en nuestro gestor de secretos. Nunca queda en texto plano.',
    notionMapIncomplete: 'Elige las 3 bases (Tareas, Proyectos, Ciclos) para conectar.',

    // TASK-998 — vínculo de canal de Teams (bot Graph)
    teamsTitle: 'Teams del cliente',
    teamsSubtitle: 'Conecta el canal donde el equipo coordina con el cliente.',
    teamsModeNew: 'Crear canal nuevo',
    teamsModeNewHint: 'Creamos el canal + las suscripciones de email al dar de alta.',
    teamsModeLink: 'Vincular canal existente',
    teamsModeLinkHint: 'El cliente ya tiene su equipo en Teams (ej. Berel - Efeonce).',
    teamsTeamLabel: 'Equipo',
    teamsTeamPlaceholder: 'Elegir equipo…',
    teamsChannelLabel: 'Canal',
    teamsChannelPlaceholder: 'Elegir canal…',
    teamsLoadingTeams: 'Cargando equipos…',
    teamsLoadingChannels: 'Cargando canales…',
    teamsEmpty: 'El bot no ve ningún equipo. Verifica que esté instalado en el tenant.',
    teamsError: 'No pudimos listar los equipos de Teams. Intenta de nuevo.',
    teamsPickHint: 'Elige el equipo del cliente y luego su canal.',
    teamsSelected: 'Canal vinculado: {team} › {channel}'
  },

  // --- Step 6: Confirmar -----------------------------------------------------
  confirmar: {
    title: 'Revisa y confirma',
    subtitle: 'Esto abre un caso de onboarding y dispara las tareas de aprovisionamiento.',
    sectionOrigen: 'Origen',
    sectionIdentidad: 'Identidad',
    sectionComercial: 'Comercial',
    sectionFinanzas: 'Finanzas',
    sectionSpace: 'Espacio',
    editStepAria: 'Editar',
    editCta: 'Editar',
    willHappenTitle: 'Qué va a pasar al crear el cliente',
    willHappenCreateOrg: 'Se crea o vincula el cliente con su identidad completa.',
    willHappenOpenCase: 'Se abre un caso de onboarding con su checklist.',
    willHappenProvision: 'Se preparan el espacio, Notion y Teams en segundo plano.',
    willHappenChecklist: 'Vas a completar el checklist desde la ficha del cliente.',
    confirmReviewLabel: 'Revisé los datos de arriba y confirmo que están correctos.',
    confirmUnderstandLabel: 'Entiendo que esto crea el cliente y abre su onboarding.',
    notSet: 'Sin definir',
    // TASK-1006 — resumen de finanzas en Confirmar. "vigente" deja claro que es el número
    // del perfil, no la creación de una OC/HES formal.
    yes: 'Sí',
    no: 'No',
    requiresPoSummaryLabel: 'OC requerida',
    requiresHesSummaryLabel: 'HES requerida'
  },

  // --- Success screen --------------------------------------------------------
  success: {
    title: 'Cliente creado',
    description: 'Abrimos su onboarding. Ahora completa el checklist para activarlo del todo.',
    clientLabel: 'Cliente',
    caseLabel: 'Caso de onboarding',
    nextChecklistTitle: 'Próximos pasos del checklist',
    goToClientCta: 'Ir a la ficha del cliente',
    createAnotherCta: 'Crear otro cliente',
    checklistNote: 'Las tareas de Finanzas, Comercial y Operaciones las completa cada responsable desde la ficha del cliente.',
    notionDeferredTitle: 'La conexión de Notion quedó pendiente',
    notionDeferredNote: 'El cliente se creó igual. Completá el vínculo de Notion desde el checklist del cliente.'
  },

  // --- Exit dialog -----------------------------------------------------------
  exit: {
    title: '¿Salir sin terminar?',
    description: 'Tu progreso quedó guardado como borrador. Puedes retomarlo cuando quieras.',
    confirmCta: 'Salir',
    cancelCta: 'Seguir editando'
  },

  // --- Finance facet drawer (redefined CreateClientDrawer) -------------------
  financeDrawer: {
    title: 'Completar perfil financiero',
    subtitle: 'Este cliente ya existe. Acá completas cómo facturarle.',
    clientContextLabel: 'Cliente',
    notACreateNote: 'Esto no crea un cliente. Solo completa su perfil financiero.',
    saveCta: 'Guardar perfil',
    cancelCta: 'Cancelar',
    savedToast: 'Perfil financiero actualizado.',
    saveError: 'No pudimos guardar el perfil financiero. Reintenta en unos segundos.',
    daysAdornment: 'días'
  },

  // --- Account 360 lifecycle timeline ----------------------------------------
  timeline: {
    title: 'Recorrido del cliente',
    subtitle: 'Dónde está en su ciclo de vida y qué falta.',
    originLabel: 'Origen',
    facetsTitle: 'Completitud por área',
    facetIdentidad: 'Identidad',
    facetComercial: 'Comercial',
    facetOperaciones: 'Operaciones',
    facetFinanzas: 'Finanzas',
    facetAcceso: 'Acceso',
    facetComplete: 'Completa',
    facetPartial: 'En curso',
    facetPending: 'Pendiente',
    facetMissingPrefix: 'Falta',
    eventsTitle: 'Línea de tiempo',
    openCaseEvent: 'Caso de onboarding abierto',
    healthyTitle: 'En camino',
    healthyDescription: 'El onboarding avanza dentro de lo esperado.',
    atRiskTitle: 'Faltan pasos para activar del todo',
    atRiskDescription: 'Hay {count} áreas pendientes. Complétalas desde la ficha para activar al cliente.',
    progressTitle: 'Onboarding en curso',
    progressDescription: '{completed} de {total} pasos completados. Faltan {pending} para activar del todo — complétalos desde el checklist (firma de contrato, equipo, facturación…).',
    stalledTitle: 'Onboarding detenido',
    stalledDescription: 'Lleva {days} días sin avances. Contacta al responsable de la cuenta para destrabarlo.',
    overdueTitle: 'Vencido',
    overdueDescription: 'Pasó la fecha objetivo por {days} días.'
  },

  // --- Checklist del caso (TASK-997 — read-only) -----------------------------
  checklist: {
    title: 'Checklist de onboarding',
    subtitle: 'Los pasos para activar al cliente y quién es responsable.',
    empty: 'Este caso todavía no tiene checklist.',
    requiredChip: 'Obligatorio',
    blockingChip: 'Bloqueante',
    anchorNotionLabel: 'Anclar en Notion',
    anchorTeamsLabel: 'Anclar en Teams',
    statusCompleted: 'Completado',
    statusInProgress: 'En curso',
    statusBlocked: 'Bloqueado',
    statusSkipped: 'Omitido',
    statusPending: 'Pendiente',
    ownerCommercial: 'Comercial',
    ownerOperations: 'Operaciones',
    ownerIdentity: 'Identidad',
    ownerFinance: 'Finanzas'
  },

  // --- Personas del portal (TASK-1001 — checklist provision_client_users_access) ----
  portalUsers: {
    title: 'Personas del portal',
    subtitle: 'Invita a las personas del cliente que usarán el portal.',
    loading: 'Buscando contactos…',
    emptyTitle: 'Sin contactos sugeridos',
    empty: 'No encontramos contactos asociados en HubSpot para esta empresa. Agrégalos en HubSpot y vuelve a intentar.',
    degradedClientTitle: 'Falta crear el Cliente',
    degradedClient: 'Esta organización todavía no tiene un Cliente asociado. Créalo para poder invitar personas al portal.',
    degradedHubspotTitle: 'No pudimos cargar los contactos',
    degradedHubspot: 'HubSpot no respondió. Reintenta en unos segundos.',
    retryCta: 'Reintentar',
    pickHint: 'Confirma el rol de cada persona y envíale la invitación. Recibirá un email para activar su cuenta.',
    roleLabel: 'Rol en el portal',
    roleExecutive: 'Ejecutivo',
    roleManager: 'Manager',
    roleSpecialist: 'Especialista',
    inviteCta: 'Invitar',
    invitingCta: 'Invitando…',
    retryInviteCta: 'Reintentar',
    noEmail: 'Sin email',
    statusAlreadyChip: 'Con acceso',
    statusInvitedChip: 'Invitación enviada',
    statusErrorChip: 'No se pudo invitar',
    secretNote: 'Cada persona recibe un email para crear su contraseña. Su acceso queda limitado al portal de este cliente.'
  },
  // TASK-1013 — mockup Product Design del inbox/cockpit de casos de onboarding.
  onboardingCases: {
    filtersAria: 'Filtros rápidos de onboarding',
    openTimelineAria: 'Abrir timeline completo del caso'
  },
  // TASK-1009 — panel del preflight de onboarding Notion (ítem verify_notion_flowing).
  notionPreflight: {
    title: 'Verificar flujo al portal',
    subtitle: 'Confirma que las tareas del cliente llegan al portal antes de cerrar el onboarding.',
    idleHint: 'Corre el preflight para revisar la cadena completa, de Notion al portal. El paso se marca como completado solo si todo está en verde.',
    runCta: 'Correr preflight',
    runningCta: 'Verificando…',
    rerunCta: 'Volver a correr',
    advisoryTag: 'opcional',
    readyTitle: 'El cliente fluye al portal',
    readyBody: 'Todos los pasos críticos están en verde.',
    advancedNote: 'Marcamos este paso como completado.',
    notReadyTitle: 'Todavía no fluye',
    notReadyBody: 'Revisa los pasos en rojo y arregla el eslabón. Volvé a correr el preflight cuando lo resuelvas.',
    noSpaceTitle: 'Falta vincular el teamspace',
    noSpaceBody: 'Este caso no tiene un teamspace Notion vinculado. Vinculalo antes de correr el preflight.',
    errorTitle: 'No pudimos correr el preflight',
    errorBody: 'Tuvimos un problema al verificar. Probá de nuevo en unos segundos.',
    retryCta: 'Reintentar',
    resultHint: 'Cada eslabón muestra su estado real. Los pasos opcionales no bloquean el cierre.'
  }
} as const

export type ClientOnboardingCopy = typeof GH_CLIENT_ONBOARDING
