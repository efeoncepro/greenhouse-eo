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
}

export const GH_INSIGHTS = {
  modules: {
    seo: { title: 'Visibilidad orgánica', label: 'Visibilidad orgánica' },
    aeo: { title: 'Visibilidad en motores de respuesta', label: 'Motores de respuesta' },
    ico: { title: 'Entrega y cumplimiento', label: 'Entrega' }
  } satisfies Record<InsightModule, InsightModuleCopy>,

  /**
   * Por qué una métrica no entró. Se muestran como límites de la edición.
   *
   * Se redactan como hecho, nunca como disculpa ni como error del lector: el límite es información
   * del informe, no una falla que reportar.
   */
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
    gsc: 'Search Console',
    rank: 'Posiciones en buscadores',
    organic_etv: 'Tráfico orgánico estimado',
    overall_score: 'Puntaje de visibilidad en IA',
    rpa: 'Rondas de revisión por pieza',
    otd: 'Entregas a tiempo',
    ftr: 'Primera entrega correcta'
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
    lineTitle: 'evolución mensual',
    targetLabel: 'Meta',
    previousLabel: 'Período anterior',
    currentLabel: 'Período'
  },

  /**
   * TASK-1888 — lectura determinista por figura (fallback sin modelo). Afirma sólo lo que el dato muestra: el valor
   * contra su meta o su período anterior. NUNCA una causa ni una explicación: eso no está en la evidencia.
   */
  reading: {
    aboveTarget: 'sobre la meta de',
    belowTarget: 'bajo la meta de',
    atTarget: 'en la meta de',
    lineFrom: 'pasó de',
    lineTo: 'a',
    lineIn: 'en',
    leadValue: 'es la cifra más alta de la figura',
    nextStepGap: 'Revisar primero',
    nextStepGapReason: 'es donde la distancia con la meta es mayor.'
  },

  /**
   * Fuente legible de cada método del snapshot (por `method.name`). El nombre de la función lectora
   * es trazabilidad interna: queda en el snapshot sellado, no en la metodología que lee el cliente.
   */
  sources: {
    gsc_window_aggregate: 'Google Search Console',
    dataforseo_serp_rank: 'mediciones de posiciones en buscadores',
    dataforseo_etv: 'estimación de tráfico orgánico',
    ai_visibility_grader: 'análisis de visibilidad en motores de respuesta',
    ico_engine_monthly: 'métricas mensuales de entrega'
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
    tableRowsText: 'filas de evidencia respaldan esta tabla',
    tableLeadIn: 'en',
    tableLeadSuffix: 'la fila más alta de la tabla',
    tableDetailBy: 'Detalle por',
    tableRowsOrderedBy: (rows: number, column: string) => `${rows} filas, en el orden del plan; la barra compara ${column.toLowerCase()}.`,
    limitsCountText: 'límites que esta edición declara antes de afirmar',
    essentials: 'Lo esencial del mes',
    thesisOfTheMonth: 'La tesis del mes',
    decideInMeeting: 'Para decidir en la reunión',
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
      trend: 'Evolución en el tiempo'
    },
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
