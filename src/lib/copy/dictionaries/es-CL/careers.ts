import type { CareersCopy } from '../../types'

export const careers: CareersCopy = {
  metadata: {
    title: 'Trabaja con Efeonce',
    description: 'Vacantes públicas de Efeonce: roles reales, proceso claro y postulación protegida.'
  },
  header: {
    logoAlt: 'Efeonce',
    tagline: 'Trabaja con nosotros',
    backToJobs: 'Volver a vacantes',
    backToDetail: 'Volver al detalle',
    localeTitle: 'Página bilingüe: es-CL y en-US'
  },
  hero: {
    hiringBadgePrefix: 'Estamos contratando',
    hiringBadgeSuffixSingular: 'vacante abierta',
    hiringBadgeSuffixPlural: 'vacantes abiertas',
    titleAccent: 'Crece',
    titleRest: 'con Efeonce',
    subtitle: 'Construimos crecimiento con marcas y con las personas que lo hacen posible.',
    primaryCta: 'Ver vacantes',
    processCta: 'Ver el proceso',
    proof: 'Postula en menos de 2 minutos · evaluamos habilidades reales'
  },
  marquee: ['Diseño', 'Tecnología', 'Marketing', 'Medios', 'Operaciones', 'Data'],
  manifesto: {
    eyebrow: 'Nuestro porqué',
    titlePrefix: 'Existimos para cambiar cómo las marcas hacen',
    titleMark: 'marketing',
    titleSuffix: '.',
    chips: ['Con método', 'Con datos', 'Creatividad que se mide'],
    proofMuted: 'No lo dejamos en intención.',
    proofStrong: 'Lo operamos.',
    bodyPrefix: 'Por eso buscamos',
    bodyStrong: 'personas inquietas',
    bodySuffix: 'que quieran cuestionar lo obvio y construir mejor.',
    cta: 'Ver vacantes abiertas'
  },
  pillars: {
    eyebrow: 'Nuestro lado del trato',
    title: 'Tú traes criterio y ganas. Nosotros ponemos el sistema.',
    subtitle: 'Buscamos personas inquietas, rigurosas y con ganas de construir. Esto encuentras al entrar.',
    items: [
      {
        title: 'Crecimiento real',
        body: 'Proyectos con impacto visible para marcas que crecen en serio. Aquí las ideas se ejecutan, no se archivan.',
        icon: 'tabler-trending-up'
      },
      {
        title: 'Trabajo con impacto',
        body: 'Tu trabajo se ve, se mide y se nota. Con libertad para proponer y espacio para dejar huella.',
        icon: 'tabler-target-arrow'
      },
      {
        title: 'Globales por diseño',
        body: 'Talento en Chile, LatAm y el mundo, en remoto o híbrido. Trabajas donde rindes mejor: cuentan los resultados, no el reloj.',
        icon: 'tabler-world'
      }
    ]
  },
  listing: {
    eyebrow: 'Únete al equipo',
    title: 'Vacantes abiertas',
    subtitle: 'Roles reales, proceso claro y espacio para crecer. Encuentra el tuyo y postula en minutos.',
    resultCountLabel: 'resultados',
    searchPlaceholder: 'Buscar un rol, área o skill...',
    areaLabel: 'Área',
    modalityLabel: 'Modalidad',
    all: 'Todas',
    clearFilters: 'Limpiar filtros',
    loadingTitle: 'Cargando vacantes',
    errorTitle: 'No pudimos cargar las vacantes',
    errorBody: 'Ocurrió un problema al cargar las vacantes. Reintenta en un momento desde esta misma página.',
    retry: 'Reintentar',
    emptyZeroTitle: 'Ahora mismo no tenemos vacantes abiertas',
    emptyZeroBody: 'Seguimos creciendo. Déjanos tu correo y te avisamos cuando abramos un rol que calce contigo.',
    emptyFilteredTitle: 'No hay roles para esta búsqueda',
    emptyFilteredBody: 'Prueba con otros términos o limpia los filtros para volver al listado completo.',
    cardCta: 'Ver y postular'
  },
  process: {
    eyebrow: 'Proceso de selección',
    title: 'Proceso claro, sin vueltas.',
    subtitle: 'Encontraste tu rol. Esto es lo que sigue: de la postulación a la decisión, con pasos y respuesta clara.',
    steps: [
      { title: 'Postulas', body: 'Envías tu postulación en minutos.', icon: 'tabler-send' },
      {
        title: 'Conversamos',
        body: 'Una primera conversación para entender tu experiencia y resolver dudas.',
        icon: 'tabler-message-2'
      },
      {
        title: 'Evaluación por competencias',
        body: 'Miramos lo que sabes hacer, no las etiquetas.',
        icon: 'tabler-checklist'
      },
      {
        title: 'Decisión',
        body: 'Te contamos cómo sigue, avances o no. Siempre con respuesta.',
        icon: 'tabler-circle-check'
      }
    ]
  },
  talentPool: {
    eyebrow: 'Banco de talento',
    title: '¿Tu rol todavía no existe? Déjanos conocerte.',
    body: 'Si quieres cambiar cómo se hace marketing con método, datos y criterio, queremos conocerte aunque hoy no tengamos tu vacante.',
    namePlaceholder: 'Tu nombre',
    emailPlaceholder: 'tu@correo.com',
    cta: 'Sumarme al banco de talento',
    successPrefix: 'Listo',
    successSuffix: 'Quedaste en nuestro radar. Te escribimos cuando se abra un rol real para ti.',
    privacy: 'Sin spam. Solo te escribimos cuando haya un rol real para ti.'
  },
  talentPoolSelfService: {
    metadataTitle: 'Tu perfil para futuras oportunidades | Efeonce',
    eyebrow: 'Banco de talento Efeonce',
    title: 'Tú decides cómo usamos tu perfil',
    intro: 'Revisa qué autorizaste, actualiza tu disponibilidad o retira el permiso desde este enlace privado.',
    status: {
      active: 'Disponible para futuras oportunidades',
      processOnly: 'Sólo para tu proceso actual',
      needsReconsent: 'Necesitamos tu confirmación',
      withdrawn: 'Permiso retirado',
      expired: 'Permiso vencido',
      paused: 'Contacto en pausa'
    },
    purposeTitle: 'Qué significa estar en el banco',
    purposeBody:
      'People puede encontrar tu perfil cuando una vacante real se relaciona con tu experiencia. No implica selección, contacto asegurado ni una decisión automática.',
    ledger: [
      {
        title: 'Finalidad acotada',
        body: 'Sólo futuras oportunidades laborales de Efeonce.',
        icon: 'tabler-target-arrow'
      },
      {
        title: 'Evidencia gobernada',
        body: 'Experiencia, disponibilidad y evidencia del proceso; nunca notas internas abiertas al público.',
        icon: 'tabler-shield-lock'
      },
      {
        title: 'Control en tus manos',
        body: 'Puedes actualizar tu disponibilidad o retirar el permiso cuando quieras.',
        icon: 'tabler-adjustments-horizontal'
      }
    ],
    expiryLabel: 'Vigencia del permiso',
    noExpiry: 'Aún no hay permiso futuro vigente',
    availabilityTitle: 'Tu disponibilidad',
    availabilityBody: 'Indica cuándo tendría sentido conversar. Esto no compromete tu agenda ni garantiza contacto.',
    availabilityOptions: [
      { value: 'immediate', label: 'Ahora', description: 'Podría conversar en estos días.' },
      {
        value: 'within_30_days',
        label: 'Dentro de 30 días',
        description: 'Estaría disponible durante el próximo mes.'
      },
      { value: 'within_60_days', label: 'En 60 días o más', description: 'Prefiero una conversación más adelante.' },
      {
        value: 'not_available',
        label: 'No disponible',
        description: 'Mantén mi perfil, pero no me contactes por ahora.'
      }
    ],
    confirm: 'Confirmar futuras oportunidades',
    update: 'Guardar disponibilidad',
    updating: 'Guardando…',
    withdraw: 'Retirar mi perfil',
    withdrawTitle: '¿Retirar tu perfil del banco?',
    withdrawBody:
      'People dejará de encontrarlo para futuras oportunidades. Conservaremos sólo la evidencia de auditoría exigida y los datos que todavía correspondan a un proceso activo.',
    withdrawConfirm: 'Sí, retirar mi perfil',
    cancel: 'Mantener mi perfil',
    receiptPrefix: 'Comprobante',
    privacy: 'Puedes revisar la finalidad, vigencia y tus derechos en el aviso de privacidad de Efeonce.',
    unavailableTitle: 'Este enlace ya no está disponible',
    unavailableBody:
      'Puede haber vencido o haber sido reemplazado. No compartimos si existe un perfil asociado a este enlace.',
    retry: 'Intentar nuevamente',
    loading: 'Consultando el estado de tu perfil…',
    error: 'No pudimos completar la operación. Tu estado anterior se mantiene.',
    conflict: 'El estado cambió mientras estabas aquí. Actualiza la información antes de continuar.',
    rateLimited: 'Hubo demasiados intentos. Espera un momento e intenta nuevamente.'
  },
  detail: {
    applyCta: 'Postular a esta vacante',
    timeHint: 'Toma menos de 2 minutos',
    descriptionTitle: 'Sobre el rol',
    responsibilitiesTitle: 'Responsabilidades',
    requirementsTitle: 'Requisitos',
    niceToHaveTitle: 'También suma',
    skillsTitle: 'Competencias clave',
    skillsHint: 'Las evaluamos durante el proceso, con foco en evidencia y habilidades reales.',
    processTitle: 'Cómo es el proceso',
    compensationTitle: 'Compensación',
    compensationFallback: 'La compensación se conversa con transparencia durante el proceso.',
    outcomesTitle: 'Cómo se ve un buen primer año',
    workTitle: 'El trabajo',
    essentialsTitle: 'Lo esencial',
    preferredTitle: 'Deseable, no excluyente',
    learnablesTitle: 'Lo que puedes aprender aquí',
    evidenceTitle: 'La evidencia que queremos ver',
    companyTitle: 'Efeonce en breve',
    remoteTitle: 'Trabajo remoto, en la práctica',
    remoteIntro:
      'Trabajamos 100% remoto con una dinámica async-first: documentamos decisiones, avances y feedback para que el trabajo fluya sin depender de reuniones constantes. Reservamos las syncs para revisiones, decisiones y conversaciones que ganan valor al ocurrir en tiempo real.',
    workModelTitle: 'Modalidad y vinculación',
    eligibleCountriesTitle: 'Puedes postular desde {count} países',
    eligibleCountriesDisclosure: 'Ver los {count} países',
    eligibleCountriesListLabel: 'Lista completa de países habilitados',
    collaborationLabels: {
      team: 'Equipo',
      reportsTo: 'Reporta a',
      language: 'Idioma de trabajo',
      timezoneOverlap: 'Overlap horario',
      workingRhythm: 'Ritmo de trabajo'
    },
    benefitsTitle: 'Lo que recibes',
    processMetaLabels: {
      expectedTiming: 'Duración estimada',
      responseCommitment: 'Nuestro compromiso',
      accommodationPath: 'Adaptaciones'
    },
    compensationUnits: {
      HOUR: 'por hora',
      DAY: 'por día',
      WEEK: 'por semana',
      MONTH: 'por mes',
      YEAR: 'por año'
    },
    summaryTitle: 'Resumen del rol',
    labels: {
      area: 'Área',
      location: 'Ubicación',
      modality: 'Modalidad',
      seniority: 'Nivel del rol',
      employment: 'Jornada'
    },
    unavailableTitle: 'Esta vacante ya no está disponible',
    unavailableBody:
      'Puede que la hayamos cerrado o que el enlace haya cambiado. Revisa el resto de nuestras vacantes abiertas.',
    unavailableCta: 'Ver vacantes abiertas'
  },
  apply: {
    eyebrow: 'Falta poco: cuéntanos de ti',
    titleTemplate: 'Postula a {role}',
    intro:
      'Un formulario corto: cuéntanos quién eres. El talento lo vemos en el proceso, no en el papeleo; puedes saltar los campos opcionales.',
    optionalWord: '(opcional)',
    alertTitle: 'Postulación protegida',
    alertBody: 'La confirmación es genérica por privacidad. Nunca mostramos si ya existía una postulación previa.',
    invalidSummaryTitle: 'Revisa los campos marcados',
    invalidSummaryBody: 'Corrige los campos marcados para enviar tu postulación.',
    progressLabel: 'Completa tu postulación',
    sections: {
      personal: 'Tus datos',
      profile: 'Tu perfil',
      message: 'Cuéntanos más'
    },
    fields: {
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Correo electrónico',
      residenceCountry: 'País de residencia',
      phone: 'Teléfono (opcional)',
      portfolio: 'Portafolio (opcional)',
      linkedin: 'LinkedIn (opcional)',
      availability: 'Disponibilidad (opcional)',
      message: 'Mensaje (opcional)'
    },
    placeholders: {
      email: 'tu@correo.com',
      residenceCountry: 'Selecciona tu país',
      phone: '+56 9 1234 5678',
      portfolio: 'https://tu-portafolio.com',
      linkedin: 'https://linkedin.com/in/tu-perfil',
      availability: 'Selecciona una opción',
      message: 'Cuéntanos brevemente por qué te interesa este rol.'
    },
    availabilityOptions: ['Inmediata', '2 a 4 semanas', '1 a 2 meses', 'Estoy explorando'],
    cv: {
      label: 'Currículum (opcional)',
      title: 'Sube tu CV',
      body: 'Arrastra o selecciona tu CV en PDF. Lo guardamos como archivo privado en Greenhouse.',
      hint: 'PDF, máximo 10 MB.',
      selectedTitle: 'CV listo para enviar',
      browseCta: 'Elegir PDF',
      replaceCta: 'Reemplazar',
      removeCta: 'Quitar',
      invalidType: 'Sube un PDF. Por seguridad no aceptamos DOC, DOCX ni ZIP en este formulario.',
      tooLarge: 'El PDF supera el máximo de 10 MB.',
      empty: 'El archivo está vacío. Elige otro PDF.'
    },
    consent: {
      title: 'Acepto que Efeonce trate mis datos para este proceso de selección.',
      bodyPrefix: 'Conforme al',
      link: 'aviso de privacidad',
      bodySuffix: '(Ley 21.719). Puedes revocarlo cuando quieras.'
    },
    talentPoolConsent: {
      sectionLabel: 'Mantener mi perfil para futuras oportunidades (opcional)',
      title: 'Quiero que Efeonce considere mi perfil para futuras oportunidades.',
      body: 'Es opcional y no afecta esta postulación. Confirmaremos tu correo antes de activar el Banco de Talento; podrás pausar o retirar el permiso.'
    },
    captcha: {
      verifiedTitle: 'Verificado',
      verifiedBody: 'Eres humano',
      failedTitle: 'No pudimos verificarte',
      failedBody: 'Recarga la página e intenta de nuevo.',
      brand: 'Turnstile',
      pendingTitle: 'Verificación pendiente'
    },
    phoneCountryAria: 'País del teléfono',
    residenceCountryHelp: 'Indica dónde resides. No se deduce del prefijo telefónico.',
    submit: 'Enviar postulación',
    submitting: 'Enviando...',
    successTitle: '¡Gracias! Recibimos tu postulación',
    successBody: 'Si tu perfil avanza, te contactamos por correo. Gracias por querer construir con Efeonce.',
    moreJobs: 'Ver más vacantes',
    disclosure: 'Nunca te pediremos documentos de identidad ni datos personales sensibles.',
    errors: {
      firstName: 'Ingresa tu nombre para continuar.',
      lastName: 'Ingresa tu apellido para continuar.',
      emailRequired: 'Ingresa tu correo para continuar.',
      emailInvalid: 'Tu correo necesita un @. Prueba nombre@empresa.com.',
      residenceCountryRequired: 'Selecciona tu país de residencia para continuar.',
      phoneInvalid: 'Ingresa un teléfono válido con código de país.',
      urlInvalid: 'El enlace debe empezar con https://.',
      consent: 'Necesitamos tu consentimiento para procesar tu postulación.',
      captcha: 'Necesitamos verificar el captcha antes de enviar.',
      invalid: 'Revisa los datos marcados e intenta de nuevo.',
      rateLimited: 'Estás enviando demasiadas veces. Intenta de nuevo en unos minutos.',
      captchaFailed: 'No pudimos verificar que no eres un robot. Recarga la página e intenta de nuevo.',
      notOpen: 'Esta vacante ya no está disponible.',
      server: 'No pudimos enviar tu postulación. Intenta de nuevo en unos minutos; tus datos no se enviaron.'
    }
  },
  footer: {
    privacy: 'Aviso de privacidad',
    terms: 'Términos',
    website: 'efeoncepro.com'
  },
  aria: {
    skipToContent: 'Saltar al contenido',
    openingCardTemplate: 'Ver y postular a {role}',
    listingRegion: 'Listado de vacantes abiertas',
    talentPool: 'Banco de talento Efeonce',
    formStatus: 'Estado del formulario de postulación',
    required: 'requerido'
  },
  fallbacks: {
    area: 'Efeonce',
    location: 'LATAM',
    modality: 'Flexible',
    employment: 'Jornada completa',
    seniority: 'A convenir',
    summary: 'Rol publicado por Efeonce. Revisa el detalle y postula en minutos.',
    skill: 'Competencias del rol',
    responsibility: 'Contribuir al crecimiento de marcas con método, datos y creatividad.',
    requirement: 'Experiencia relevante para el rol y ganas de construir con el equipo.'
  }
}
