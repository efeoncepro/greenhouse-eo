/**
 * Copy canónico de Efeonce Insights (TASK-1847).
 *
 * Nace para cerrar un drift medido: `MODULE_TITLES` estaba duplicado con valores DISTINTOS entre el
 * planner —que sella el plan de la edición— y el mapper de render —que produce el documento—. No
 * diferían en forma sino en contenido: el plan decía «Visibilidad en motores de respuesta» y el
 * documento renderizado decía «Respuesta de IA». Un plan sellado y su render contradiciéndose es
 * justo lo que una edición inmutable existe para impedir.
 *
 * El diagnóstico importa: NO eran dos copias del mismo dato. Eran dos necesidades distintas que
 * nadie modeló —el título de un capítulo en un documento largo y la etiqueta corta de una lámina—
 * y cada consumer resolvió la suya por su cuenta. Por eso el SSOT declara los dos campos en vez de
 * elegir un texto ganador.
 *
 * Sin jerga interna en material que lee un cliente: las siglas SEO/AEO/ICO se omiten del texto
 * visible. «Motores de respuesta» se explica solo; «(ICO)» no le dice nada a quien recibe el
 * informe.
 */

import type { InsightModule } from '@/lib/efeonce-insights/contracts/request'

export interface InsightModuleCopy {
  /** Título de capítulo, para documento largo donde hay aire. */
  readonly title: string
  /** Etiqueta corta, para lámina y marginalia. */
  readonly label: string
  /** Nombre dentro del título de un informe que junta módulos («Visibilidad orgánica y respuestas de IA»). */
  readonly inTitle: string
  /** TASK-1962 — nombre de navegación y filtro del informe web («SEO», «Respuestas de IA»). */
  readonly navLabel: string
}

export const GH_INSIGHTS = {
  /**
   * Alcance del informe en la portada (chips): servicio o módulo que cubre. Lo elige quien compone el encargo
   * (`request.scope`); sin elección, se deriva de los módulos. Ícono y línea en `presentation/scope-catalog.ts`.
   */
  /** Nombre accesible de cada marca de producto (texto alternativo del lockup oficial). */
  productMarks: {
    sv360: 'Efeonce Search Visibility 360',
    aeo: 'Efeonce AEO',
    aeo_assessment: 'Efeonce AEO Assessment',
    ai_visibility_report: 'Efeonce AI Visibility Report',
    insights: 'Efeonce Insights'
  } as Readonly<Record<string, string>>,

  scopeChips: {
    seo: 'SEO',
    aeo: 'Respuestas de IA',
    ico: 'Entrega creativa',
    creative: 'Servicios creativos',
    design: 'Diseño',
    content: 'Contenido',
    performance: 'Performance',
    paid_social: 'Paid social',
    social: 'Redes sociales',
    revenue: 'Revenue',
    crm: 'CRM',
    email: 'Email marketing',
    automation: 'Automatización',
    web: 'Web',
    analytics: 'Analítica'
  } as Readonly<Record<string, string>>,

  modules: {
    seo: { title: 'Visibilidad orgánica', label: 'Visibilidad orgánica', inTitle: 'visibilidad orgánica', navLabel: 'SEO' },
    aeo: { title: 'Visibilidad en motores de respuesta', label: 'Motores de respuesta', inTitle: 'respuestas de IA', navLabel: 'Respuestas de IA' },
    ico: { title: 'Entrega y cumplimiento', label: 'Entrega', inTitle: 'entrega y cumplimiento', navLabel: 'Entrega' }
  } satisfies Record<InsightModule, InsightModuleCopy>,

  /**
   * Por qué una métrica no entró. Se muestran como límites de la edición.
   *
   * Se redactan como hecho, nunca como disculpa ni como error del lector: el límite es información
   * del informe, no una falla que reportar.
   */
  /**
   * TASK-1957 — límites EN LENGUAJE DEL LECTOR. Un límite dice qué no trae la edición, sin exponer el diagnóstico del
   * adapter (que sigue completo en la evidencia sellada) ni sonar a falla: «la fuente no sirve esta ventana» nos dejaba
   * mal frente al cliente (revisión del operador, 2026-10-02). Una línea por tema; si falta el período actual, la línea
   * de comparación no se agrega.
   */
  /** TASK-1957 — título de la figura por familia de indicador AEO (en vez de «Motores de respuesta · Porcentaje»). */
  aeoFamilyTitles: {
    mention_rate: 'Mención por motor (% de respuestas)',
    sov: 'Share of Voice frente a competidores',
    single: 'Share of Model y citas a tu sitio',
    // TASK-1962 — lo que el Grader ya mide y el informe no usaba.
    cited_source: 'Sitios que más citan los motores',
    source_type: 'Tipo de fuente que citan los motores',
    sentiment: 'Cómo hablan de la marca los motores',
    // TASK-1962 — visitas desde asistentes de IA (GA4), por asistente.
    ai_source: 'Visitas desde cada asistente de IA',
    // TASK-1962 — visitas orgánicas al sitio (GA4), en el capítulo de búsqueda.
    site: 'Visitas orgánicas al sitio'
  } as Readonly<Record<string, string>>,

  /** TASK-1962 — población de los hechos de GA4 (trazabilidad del snapshot; no se imprime como cifra). */
  ga4: {
    organicPopulation: 'Sesiones del canal Organic Search de la propiedad GA4 conectada',
    aiPopulation: 'Sesiones del canal AI Assistant de la propiedad GA4 conectada',
    tableTitle: { seo: 'Visitas al sitio desde buscadores', aeo: 'Visitas desde asistentes de IA' } as Readonly<Record<string, string>>,
    tableLead: 'Sesiones medidas por Google Analytics 4 en el sitio, según su agrupación de canales.',
    /** TASK-1974 — la porción que suma a los asistentes fuera de los 2 que más traen. */
    otherAssistants: 'Otros asistentes'
  },

  /** TASK-1962 — nombres de los tipos de fuente y tonos del Grader en el informe (nunca la clave cruda). */
  aeoSourceTypes: {
    news: 'Medios de noticias',
    earned: 'Menciones ganadas',
    social: 'Redes sociales',
    marketplace: 'Marketplaces',
    directory: 'Directorios',
    owned: 'Sitios propios',
    review: 'Sitios de reseñas',
    forum: 'Foros',
    unknown: 'Sin clasificar'
  } as Readonly<Record<string, string>>,
  aeoSentiments: { positive: 'Positivas', neutral: 'Neutras', negative: 'Negativas', mixed: 'Mixtas' } as Readonly<Record<string, string>>,
  aeoFindings: {
    topSource: 'El sitio más citado por los motores es',
    citations: 'citas',
    of: 'de',
    sourceTypeLead: 'Los motores citan más',
    sourceTypeThan: 'que',
    sourceTypeOnly: 'Lo que más citan los motores son',
    sentimentLead: 'De',
    sentimentEvaluated: 'respuestas evaluadas',
    sentimentPositive: 'son positivas y',
    sentimentNegative: 'negativas',
    sovLeader: 'concentra el',
    sovOfMentions: 'de las menciones; tu marca, el',
    sovBrandLeads: 'Tu marca lidera las menciones frente a competidores con el',
    tableTitle: 'De dónde sale lo que dicen los motores',
    tableLead: 'Los sitios que más citan los motores, el tipo de fuente y el tono de las respuestas.'
  },

  readerLimits: {
    outOfScope: 'no forma parte de esta edición',
    noComparison: 'sin comparación con el período anterior en esta edición',
    insufficientData: 'sin datos suficientes en este período',
    /** TASK-1962 — una fuente que el cliente todavía no conectó (la petición del plan lo pide). */
    notConnected: 'falta conectar la fuente'
  },

  rejections: {
    unsupported_window: 'la fuente no sirve esta ventana con exactitud',
    method_mismatch: 'la metodología disponible no es comparable',
    insufficient_data: 'no hay datos suficientes',
    suppressed: 'la métrica está suprimida por su política de evidencia',
    review_required: 'el análisis requiere revisión humana',
    module_disabled: 'el módulo está apagado',
    not_connected: 'la fuente no está conectada',
    target_ambiguous: 'hay más de un mercado activo',
    no_data: 'sin datos'
  },

  /**
   * Nombre legible de la métrica que un límite menciona (por `metricId` del rechazo). Sin entrada,
   * el límite habla del módulo: un identificador interno (`rank`, `gsc`) nunca llega al documento.
   */
  metrics: {
    // TASK-1957 — indicadores de visibilidad en motores de respuesta con su nombre estándar (skill seo-aeo §07 y el
    // informe público del Grader): Share of Model, Share of Voice competitivo y citation share.
    share_of_model: 'Share of Model',
    share_of_voice: 'Share of Voice',
    'sov.brand': 'Tu marca',
    citation_share: 'Respuestas que citan tu sitio',
    gsc: 'Search Console',
    ga4: 'Google Analytics 4',
    'site.organic_sessions': 'Visitas orgánicas al sitio',
    'site.organic_engaged_sessions': 'Visitas orgánicas con interacción',
    'site.organic_unengaged_sessions': 'Visitas orgánicas sin interacción',
    ai_sessions: 'Visitas desde asistentes de IA',
    'driver.query': 'Consultas que más cambiaron',
    'driver.page': 'Páginas que más cambiaron',
    rank: 'Posiciones en buscadores',
    organic_etv: 'Tráfico orgánico estimado',
    overall_score: 'Puntaje de visibilidad en IA',
    rpa: 'Rondas de revisión por pieza',
    otd: 'Entregas a tiempo',
    ftr: 'Primera entrega correcta',
    'delivered.completed': 'Piezas entregadas'
  } as Readonly<Record<string, string>>,

  /**
   * TASK-1888 — «Qué mide este informe»: una línea por módulo. El plan las sella en `scopeLines` (en el orden de
   * los módulos del encargo); el LLM nunca las redacta y no llevan cifras (el validador rechazaría cualquiera).
   */
  scopeLines: {
    seo: 'Visibilidad orgánica: cuánto aparece la marca en Google, con sus clics, impresiones, posiciones y tráfico estimado.',
    aeo: 'Motores de respuesta: si los asistentes de IA y las respuestas de Google mencionan la marca cuando alguien pregunta por su categoría.',
    ico: 'Entrega: cuánto de lo comprometido llegó a tiempo, cuánto salió bien a la primera y cuántas rondas de revisión necesitó.'
  } satisfies Record<InsightModule, string>,

  /** TASK-1888 — entrada de cada capítulo: qué pregunta responde. Sin cifras. */
  chapterOpenings: {
    seo: 'Cómo encuentra Google a la marca y cuánto tráfico orgánico le trae.',
    aeo: 'Qué dicen de la marca los motores de respuesta cuando alguien pregunta por su categoría.',
    ico: 'Cuánto de lo comprometido se entregó a tiempo y con qué calidad al primer intento.'
  } satisfies Record<InsightModule, string>,

  /** TASK-1888 — nombre visible de cada canal (por `channelId`); el plan lo sella resuelto en la dimensión o la serie. */
  channels: {
    google: 'Google',
    google_ai_overview: 'Respuestas de Google',
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    claude: 'Claude',
    perplexity: 'Perplexity'
  } as Readonly<Record<string, string>>,

  /**
   * TASK-1888 — metas oficiales como hechos citables (leídas del registro dueño, nunca literales). La etiqueta del
   * hecho de meta y el título de su figura.
   */
  targets: {
    otd: 'Meta de entregas a tiempo',
    ftr: 'Meta de primera entrega correcta',
    rpa: 'Meta de rondas de revisión por pieza'
  } as Readonly<Record<string, string>>,

  /** TASK-1888 — límite de la zona «cerca de la meta» (borde de la zona de atención del registro ICO), como hecho citable. */
  bands: {
    otd: 'Umbral de atención de entregas a tiempo',
    ftr: 'Umbral de atención de primera entrega correcta',
    rpa: 'Umbral de atención de rondas de revisión por pieza'
  } as Readonly<Record<string, string>>,

  /** TASK-1888 — títulos de figura por familia (sin cifras: la cifra va en la página, desde su hecho). */
  figures: {
    bulletTitle: 'contra la meta',
    /** TASK-1974 — figura única con todas las metas del capítulo. */
    targetsTitle: 'Resultado contra la meta',
    lineTitle: 'evolución mensual',
    targetLabel: 'Meta',
    previousLabel: 'Período anterior',
    currentLabel: 'Período',
    /** TASK-1962 — «¿por qué cambió?»: figuras y tablas de las consultas y páginas que más movieron los clics. */
    driversQueryTitle: 'Consultas que más movieron los clics',
    driversPageTitle: 'Páginas que más movieron los clics',
    driversQueryColumn: 'Consulta',
    driversPageColumn: 'Página',
    driversTableTitle: 'Consultas y páginas que más movieron los clics',
    driversTableLead: 'Las consultas y páginas con mayor cambio de clics frente al período anterior. Dicen dónde cambió, no por qué.',
    driversEntityColumn: 'Consulta o página',
    driversRestLabel: 'Resto de consultas',
    driversWaterfallTitle: 'Qué consultas explican el cambio de clics',
    previousTotal: 'Período anterior',
    currentTotal: 'Este período',
    weeklyTitle: 'Clics orgánicos por semana',
    weeklyLead: 'Los clics por semana',
    weeklyPrevious: 'En el período anterior, de'
  },

  /**
   * TASK-1962 — plan de acción determinista desde la cola SEO (sólo orígenes propios) y peticiones al cliente. Las cifras
   * que se citan son hechos del snapshot (impresiones y posición medidas, posición objetivo, techo estimado).
   */
  plan: {
    verbs: { optimize: 'Optimizar', create: 'Crear contenido para', consolidate: 'Consolidar las páginas que compiten por', measure: 'Medir' } as Readonly<Record<string, string>>,
    in: 'en',
    inHome: 'en la página de inicio',
    isAt: 'está en',
    with: 'con',
    impressions: 'impresiones',
    atTarget: 'en la posición',
    wouldAdd: 'sumaría hasta',
    clicks: 'clics',
    connectSearchConsole: 'Darnos acceso a Google Search Console del sitio para medir clics, impresiones y posiciones.',
    connectGa4: 'Darnos acceso de lectura a Google Analytics 4 del sitio para medir las visitas que llegan desde buscadores y asistentes de IA.',
    connectBoth: 'Darnos acceso a Google Search Console y de lectura a Google Analytics 4 del sitio para medir clics, posiciones y las visitas que llegan desde buscadores y asistentes de IA.'
  },

  /**
   * TASK-1888 — lectura determinista por figura (fallback sin modelo). Afirma sólo lo que el dato muestra: el valor
   * contra su meta o su período anterior. NUNCA una causa ni una explicación: eso no está en la evidencia.
   */
  /**
   * TASK-1974 — tarjeta de cifra (anatomía aprobada el 2026-10-03, criterio §5.1). Nombres de 3 palabras como máximo:
   * una métrica sin nombre corto no va en tarjeta (el validador rechaza un nombre largo; nunca se trunca).
   */
  stat: {
    figureTitle: 'Cifras del período',
    /** Título del tablero de cifras por capítulo. */
    boardTitle: {
      seo: 'Search Console y posiciones',
      aeo: 'Visibilidad en motores de respuesta',
      ico: 'Producción creativa'
    } as Readonly<Partial<Record<InsightModule, string>>>,
    /** Nota del tablero cuando una cifra lo necesita para leerse bien (sin cifras propias). */
    notes: {
      organic_etv: 'El tráfico estimado se calcula con la posición y el volumen de búsqueda de cada keyword.'
    } as Readonly<Record<string, string>>,
    estimated: 'Estimado',
    lowerIsBetter: 'Menor es mejor',
    /** TASK-1974 — barras apiladas de visitas orgánicas (subconjunto en dos períodos). */
    engagementTitle: 'Visitas orgánicas al sitio, con y sin interacción',
    engagedSegment: 'Con interacción',
    unengagedSegment: 'Sin interacción',
    labels: {
      clicks: 'Clics',
      impressions: 'Impresiones',
      ctr: 'CTR',
      position: 'Posición media',
      page_one_keywords: 'Primera página',
      organic_etv: 'Tráfico estimado',
      'site.organic_sessions': 'Visitas orgánicas',
      'site.organic_engaged_sessions': 'Visitas con interacción',
      ai_sessions: 'Visitas desde IA',
      share_of_model: 'Share of Model',
      citation_share: 'Respuestas con cita',
      'sov.brand': 'Share of Voice',
      'delivered.completed': 'Piezas entregadas'
    } as Readonly<Record<string, string>>,
    /** «vs 16.390 en agosto de 2026»: el período de comparación siempre explícito, con su valor. */
    versus: (value: string, period: string) => `vs ${value} en ${period}`,
    /** Sin dato: «—» en el valor y esta línea en lugar de la variación. Nunca 0. */
    noDataIn: (period: string) => `Sin dato en ${period}`
  },

  reading: {
    // TASK-1962 — de qué asistente de IA llegan las visitas (GA4). Las cifras las pone el planner desde los hechos.
    aiTopSourceMost: 'trae la mayoría de las visitas desde asistentes de IA:',
    aiTopSource: 'es el asistente de IA que más visitas trae:',
    of: 'de',
    aboveTarget: 'sobre la meta de',
    belowTarget: 'bajo la meta de',
    atTarget: 'en la meta de',
    lineFrom: 'pasó de',
    lineTo: 'a',
    lineIn: 'en',
    leadValue: 'es la cifra más alta de la figura',
    nextStepGap: 'Revisar primero',
    nextStepGapReason: 'es donde la distancia con la meta es mayor.',
    // Hallazgos deterministas: comparaciones y selecciones sobre hechos citados, nunca causas ni cifras nuevas.
    meetsTarget: 'cumple la meta',
    missesTarget: 'no alcanza la meta',
    largestChange: 'El mayor cambio fue en',
    highest: 'La cifra más alta es',
    outOf: 'de',
    previousPeriod: 'período anterior',
    /** TASK-1962 — nota de una figura con una escala por métrica (modelo web 1.3, `chart.note`). */
    ownScaleNote: 'Cada métrica en su propia escala: compara cada par actual contra anterior, no entre métricas.',
    /** TASK-1962 — hallazgos de descomposición: dicen DÓNDE cambió, nunca por qué. */
    driverQueryLead: 'La consulta que más cambió fue',
    driverPageLead: 'La página que más cambió fue',
    clicksWord: 'clics',
    homePage: 'Página de inicio',
    variation: 'variación',
    againstPrevious: 'Contra el período anterior',
    rose: 'subió',
    fell: 'bajó',
    held: 'se mantuvo',
    heldAt: 'en',
    // Una posición más alta es peor: «subió» se leería como mejora. Para posiciones, el verbo neutro.
    changed: 'cambió',
    metricOf: 'de',
    targetShort: 'meta',
    from: 'de',
    mostMentions: 'es el motor que más menciona la marca',
    bestDimension: 'La dimensión mejor evaluada es',
    onlyMissed: 'es la única meta sin cumplir',
    // Plural del verbo (sujeto plural: «Las impresiones bajaron»).
    roseMany: 'subieron',
    fellMany: 'bajaron',
    heldMany: 'se mantuvieron',
    changedMany: 'cambiaron',
    and: 'y',
    // Un superlativo exige un máximo ÚNICO; con empate se dice el empate (revisión de 1846, 2026-09-25).
    // TASK-1957 — «Todos los motores mencionan la marca en 2 de 6» se leía como contradicción: la proporción es por motor.
    allEnginesMention: 'La marca aparece en',
    allEnginesMentionTail: 'consultas en cada motor',
    mostMentionsTied: 'son los motores que más mencionan la marca',
    severalEnginesShare: 'Varios motores comparten la mención más alta',
    allDimensions: 'Todas las dimensiones marcan',
    bestDimensionsTied: 'Las dimensiones mejor evaluadas son',
    severalDimensionsShare: 'Varias dimensiones comparten la mejor evaluación',
    // TASK-1957 — antes del genérico «Varias… comparten», se nombra a los empatados en corto («Claridad de entidad y
    // participación frente a competencia lideran con 100.»): un número sin dueño no le dice nada al cliente.
    leadWith: 'lideran con',
    // TASK-1957 — base de un indicador AEO porcentual: «33,3 % (8 de 24 respuestas)». Un % sin su base no se puede leer.
    answersNoun: 'respuestas',
    /** TASK-1962 — el Share of Voice se mide sobre menciones (marca + competidores), no sobre respuestas. */
    mentionsNoun: 'menciones',
    // TASK-1957 — tasa de mención igual en todos los motores: una frase con el porcentaje y su base.
    allRatesPrefix: 'La marca aparece en el',
    allRatesTail: 'de las respuestas de cada motor',
    allEqual: 'Todas las cifras de la figura son',
    highestTied: 'Las cifras más altas son',
    severalShare: 'Varias cifras comparten el valor más alto'
  },

  /**
   * TASK-1888 — sujeto con concordancia de cada métrica para las afirmaciones v2 («Las impresiones bajaron de…»). Sin
   * entrada, la forma compacta sin verbo («Presencia en Gemini: 2 de 6.»): nunca un verbo con la concordancia adivinada.
   */
  /**
   * TASK-1888 — nombre común de un grupo de hechos empatados (bajada de la cifra principal cuando la conclusión es un
   * empate), por familia de métrica. Sin cifras: la bajada es una afirmación validada y «(0 a 100)» serían números.
   */
  /** TASK-1888 — sufijo del título de la tabla de respaldo v2: «Visibilidad orgánica: todas las cifras». */
  tableAllFigures: 'todas las cifras',

  tieSubjects: {
    presence: 'Presencia por motor',
    mention_rate: 'Mención por motor',
    sov: 'Share of Voice',
    dimension: 'Dimensiones evaluadas'
  } as Readonly<Record<string, string>>,

  metricSubjects: {
    share_of_model: { subject: 'El Share of Model', plural: false },
    citation_share: { subject: 'Las respuestas que citan tu sitio', plural: true },
    'sov.brand': { subject: 'El Share of Voice de tu marca', plural: false },
    clicks: { subject: 'Los clics orgánicos', plural: true },
    impressions: { subject: 'Las impresiones', plural: true },
    ctr: { subject: 'El CTR', plural: false },
    position: { subject: 'La posición media', plural: false },
    keywords_tracked: { subject: 'Las keywords con medición', plural: true },
    page_one_keywords: { subject: 'Las keywords en primera página', plural: true },
    overall_score: { subject: 'El puntaje de visibilidad en IA', plural: false },
    otd: { subject: 'Las entregas a tiempo', plural: true },
    ftr: { subject: 'La primera entrega correcta', plural: false },
    rpa: { subject: 'Las rondas de revisión por pieza', plural: true },
    'delivered.completed': { subject: 'Las piezas entregadas', plural: true },
    'site.organic_sessions': { subject: 'Las visitas orgánicas al sitio', plural: true },
    'site.organic_engaged_sessions': { subject: 'Las visitas orgánicas con interacción', plural: true },
    ai_sessions: { subject: 'Las visitas desde asistentes de IA', plural: true }
  } as Readonly<Record<string, { subject: string; plural: boolean }>>,

  /**
   * Fuente legible de cada método del snapshot (por `method.name`). El nombre de la función lectora
   * es trazabilidad interna: queda en el snapshot sellado, no en la metodología que lee el cliente.
   */
  sources: {
    gsc_window_aggregate: 'Google Search Console',
    seo_work_queue: 'cola de trabajo SEO priorizada',
    gsc_window_movers: 'Google Search Console',
    dataforseo_serp_rank: 'posiciones en buscadores',
    dataforseo_etv: 'tráfico orgánico estimado',
    // Nombre de producto del diagnóstico (ADR de naming Efeonce AEO): la fuente se nombra como lo conoce el cliente.
    ai_visibility_grader: 'Efeonce AEO Assessment',
    ico_engine_monthly: 'métricas mensuales de entrega',
    ga4_channel_sessions: 'Google Analytics 4'
  } as Readonly<Record<string, string>>,

  /** Unidad legible de una figura (por `EvidenceUnit`). La unidad cruda (`count`) nunca llega al documento. */
  units: {
    count: 'Cantidad',
    percent: 'Porcentaje',
    ratio: 'Índice',
    position: 'Posición media',
    score: 'Puntaje (0 a 100)',
    days: 'Días',
    visits_estimated: 'Visitas estimadas',
    usd: 'Dólares (USD)',
    clp: 'Pesos chilenos (CLP)'
  } as Readonly<Record<string, string>>,

  methodology: {
    cutoff: 'corte al',
    cutoffUndeclared: 'sin fecha de corte declarada',
    fallback: 'Las cifras provienen del snapshot sellado de la edición.'
  },

  /** Piezas fijas del documento. */
  document: {
    limitsTitle: 'Lo que esta edición no puede afirmar',
    limitsAndMethod: 'Límites y metodología',
    limitNote: 'Nota',
    comparisonLimitPrefix: 'en el período anterior,',
    limitNoCause: 'sin causa declarada',
    limitsNoneSubject: 'Sin límites',
    limitsNoneCause: 'esta edición no registró límites de evidencia',
    evidenceAbsent: 'Ausente',
    unissued: 'Sin emitir',
    executiveSummary: 'Resumen ejecutivo',
    indexTitle: 'Índice',
    indexContinued: 'Índice (continuación)',
    indexPageColumn: 'Pág.',
    // El resumen toma una afirmación por módulo: decir «no hay más» era falso cuando el capítulo traía otras.
    summaryInChapters: 'El detalle de cada módulo, con todas sus cifras, está en los capítulos siguientes.',
    chapterInFigures: 'Las demás cifras de este capítulo están en sus figuras.',
    chapterNoFindings: 'Esta sección no registró hallazgos en el período.',
    figureContinued: '(continuación)',
    figureLegendComparison: 'La barra de color es el período del informe; la gris, el período anterior. Cada métrica se mide en su propia escala.',
    figureLegendSingle: 'Las barras comparten escala; la de color marca el valor más alto de la figura.',
    figureDetailInTable: 'El detalle de esta figura está en la tabla de respaldo.',
    figureMoreInNarrative: 'Las demás cifras de esta figura se narran en el capítulo y están en la tabla de respaldo.',
    evidenceSource: 'Evidencia sellada de la edición',
    unitLabel: 'Unidad',
    sourceLabel: 'Fuente',
    coverageLabel: 'Cobertura'
  },

  /**
   * TASK-1889 — rótulos de las plantillas editoriales (canvas aprobado 2026-09-25). Son copy fijo del
   * documento; cifras, títulos y lecturas salen del plan sellado. Bloque de TASK-1889: TASK-1888 no lo
   * edita (acuerdo entre sesiones del 2026-09-25).
   */
  catalog: {
    product: 'Insights',
    editionKind: 'Informe mensual',
    readingEyebrow: 'Lectura de Efeonce',
    preparedFor: 'Preparado para',
    scopeLabel: 'Qué mide este informe',
    /** Plan sin `scopeLines` (sólo pasa con una portada blanca sellada a mano): nunca se deja la zona vacía. */
    scopeFallback: 'Lo que midió esta edición, con su evidencia sellada.',
    confidential: 'Confidencial',
    version: 'Versión',
    reportOf: 'Informe de',
    backCoverPrefix: 'Efeonce Insights',
    legalConfidential: 'Documento confidencial para uso exclusivo del cliente',
    figuresAsOf: 'Cifras al',
    chapter: 'Capítulo',
    inThisChapter: 'En este capítulo',
    inThisReport: 'En este informe',
    measuredIn: 'Medimos la marca en',
    indexEyebrow: 'Contenido',
    indexSectionColumn: 'Sección',
    tableEyebrow: 'Tabla de respaldo',
    tableContinued: 'Continúa de la página anterior',
    limitsEyebrow: 'Límites de la edición',
    /** El `<em>` resalta la negación en el título de límites (slot rich-string de la plantilla). */
    limitsTitleRich: 'Lo que esta edición <em>no</em> puede afirmar',
    methodology: 'Metodología',
    howMeasured: 'Cómo se midió',
    /** Bajada de la tabla para el lector (nunca metainformación del plan ni rótulos de columna). */
    tableLeadAll: (period: string, withPrevious: boolean) =>
      withPrevious ? `Todo lo que se midió en el período (${period}), con el anterior para comparar.` : `Todo lo que se midió en el período (${period}).`,
    tableVariation: 'Variación',
    noChange: 'sin cambio',
    tableDetailBy: 'Detalle por',
    limitsCountText: 'límites que esta edición declara antes de afirmar',
    essentials: 'Lo esencial del mes',
    thesisOfTheMonth: 'La tesis del mes',
    decideInMeeting: 'Para decidir en la reunión',
    /** La misma decisión en la lámina (menos espacio). */
    decideShort: 'Para decidir',
    decide: 'Para decidir',
    ourReading: 'Nuestra lectura',
    inOneSentence: 'En una frase',
    planOf: 'Plan de',
    actionPlan: 'Plan de acción',
    howWeMeasure: 'Cómo lo mediremos',
    whatWeNeed: 'Qué necesitamos de ustedes',
    whatWeNeedShort: 'Qué necesitamos',
    whatItMeans: 'Lo que significa',
    nextStep: 'Próximo paso',
    signature: 'Recomendación de Efeonce',
    evidence: 'Evidencia',
    evidencePage: 'p.',
    impact: 'Impacto',
    effort: 'Esfuerzo',
    planColumns: { number: '#', action: 'Acción', metric: 'Métrica de éxito', weeks: ['S1', 'S2', 'S3', 'S4'] },
    /** TASK-1889 Slice 4 — páginas de figura: antetítulo por tipo, palabras de las metas, leyenda. */
    figureEyebrow: {
      comparison: 'Comparación de períodos',
      columns: 'Comparación por dimensión',
      targets: 'Resultado contra la meta',
      trend: 'Evolución en el tiempo',
      // TASK-1975 — figuras del criterio de selección con página PDF.
      stat: 'Cifras del período',
      waterfall: 'Qué explica el cambio',
      waffle: 'Cómo se reparte',
      donut: 'Cómo se compone',
      stacked: 'Cuánto del total'
    },
    /** TASK-1975 — leyenda de la cascada: el paso que suma y el que resta (el signo va además en la cifra). */
    stepAdded: 'Sumó',
    stepRemoved: 'Restó',
    axisFromZeroNote: 'El eje empieza en cero: los pasos se ven en su proporción real sobre el total.',
    /** Nota del waffle por unidad: qué es un cuadro. */
    waffleUnitNote: (total: string) => `Cada cuadro es una unidad; el total es ${total}.`,
    /** Centro de la dona cuando muestra el total de las partes. */
    donutTotal: 'en total',
    opportunity: 'Oportunidad',
    /** Cuántas cifras trae el tablero de la página de cifras. */
    statCount: (count: number) => (count === 1 ? '1 cifra' : `${count} cifras`),
    statUnit: 'Cada cifra en su propia unidad; bajo cada una, la variación contra el período anterior.',
    achieved: 'Logrado',
    achievedRow: 'logrado',
    target: 'Meta',
    targetRow: 'meta',
    largestGap: 'Mayor brecha',
    unitCaption: 'Unidad',
    sourceCaption: 'Fuente',
    ownScale: 'Cada métrica en su escala.',
    /** Pestaña del deck para secciones sin número de capítulo. */
    tabMarks: { summary: '00', reading: 'C', plan: 'P', limits: 'L' },
    /** Marca del índice para secciones sin número de capítulo. */
    indexMarks: { summary: 'R', limits: 'L' }
  }
} as const
