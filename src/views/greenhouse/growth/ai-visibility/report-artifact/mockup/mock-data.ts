// Mockup data + copy for the AI Visibility Report Artifact (TASK-1252).
// Route-local to the mockup. Shapes mirror the public-safe report model
// (`PublicGraderReport`, TASK-1235) plus the forward-looking 5-level framework
// spine (Be Found / Readable / Correct / Actionable / Intrinsic, per the
// Efeonce agentic-readiness framework + Delta 2026-06-27). At implementation
// time the copy promotes to GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT in
// src/lib/copy/growth.ts and the data binds to the real reader.

export type ReportSeverity = 'optimo' | 'medium' | 'attention' | 'high' | 'critical' | 'sin_dato'

export type LevelStatus = 'measured' | 'coverage'

export type ArtifactVariant = 'publicWeb' | 'clientPortal' | 'attachment' | 'adminPreview'

export type ArtifactState =
  | 'ready'
  | 'partial'
  | 'noTrend'
  | 'insufficientData'
  | 'reviewRequiredPublic'
  | 'expired'
  | 'renderError'
  | 'denied'
  | 'printReady'

export interface ReportDimensionVM {
  key: string
  label: string
  /** Short label for the radar axis. */
  shortLabel: string
  score: number | null
  /** Industry benchmark for the radar overlay. */
  benchmark: number
  severity: ReportSeverity
  comment: string
  levelId: LevelId
}

export type LevelId = 'found' | 'readable' | 'correct' | 'actionable' | 'intrinsic'

export interface ReportLevelVM {
  id: LevelId
  ordinal: string
  label: string
  labelEn: string
  question: string
  icon: string
  status: LevelStatus
  score: number | null
  severity: ReportSeverity
  /** Honest "en cobertura" pointer when status === 'coverage'. */
  coverageNote?: string
}

export interface ReportRecommendationVM {
  rank: number
  title: string
  body: string
  effort: 'low' | 'medium' | 'high'
  impact: 'medium' | 'high'
}

export interface ReportArtifactVM {
  organizationName: string
  reportDate: string
  analyzedPeriod: string
  comparisonPeriod: string
  score: number
  scoreSeverity: ReportSeverity
  scoreLevelLabel: string
  coverage: { responded: number; sampled: number; pendingProvider: string | null }
  perceptionAxisScore: number
  agenticAxisScore: number | null
  levels: ReportLevelVM[]
  dimensions: ReportDimensionVM[]
  primaryGap: { title: string; body: string; impact: 'medium' | 'high' }
  recommendedMotion: { title: string; body: string; impact: 'medium' | 'high' }
  competitiveSov: {
    brandName: string
    brandMentions: number
    competitors: { name: string; mentions: number }[]
  }
  signals: {
    citationSharePct: number
    citedMentions: number
    totalMentions: number
    sentiment: { positive: number; neutral: number; negative: number; sampleSize: number }
    prominence: number
    trend: { points: { label: string; value: number }[]; comparison: string }
  }
  engineTrend: { date: string; ChatGPT: number; Claude: number; Perplexity: number; Gemini: number }[]
  engineSnapshot: { name: string; score: number; benchmark: number }[]
  promptCoverage: { asked: number; appeared: number }
  recommendations: ReportRecommendationVM[]
  provenance: {
    reportId: string
    methodology: string
    sampledProviders: string
    scoreVersion: string
    promptPackVersion: string
    generatedAt: string
    currency: string
    language: string
  }
}

export const REPORT_COPY = {
  header: {
    title: 'Informe de visibilidad en IA',
    reportDateLabel: 'Fecha del informe',
    analyzedPeriodLabel: 'Período analizado',
    comparisonLabel: 'Comparado con',
    publicSafeChip: 'Público-safe',
    publicSafeHelper: 'Contenido sin datos confidenciales ni crudos',
    verifiedOrgAria: 'Organización verificada'
  },
  variants: {
    label: 'Variante del artefacto',
    sharedModelNote: 'Estas variantes comparten el mismo modelo de reporte.'
  },
  levelsBand: {
    title: 'Niveles para existir en un internet de agentes',
    perceptionAxis: 'Percepción · ¿te mencionan?',
    agenticAxis: 'Operabilidad · ¿te pueden usar?',
    coverageBadge: 'En cobertura'
  },
  narrative: {
    eyebrow: 'Lo que encontramos',
    lead: 'Tu marca ya existe para la IA, pero todavía no es la primera opción.',
    sub: 'Apareces de forma despareja entre motores y por debajo de 2 competidores. Tu mayor palanca es construir autoridad temática y citas verificables.'
  },
  insights: {
    engines: 'Perplexity es tu punto ciego: 15 puntos bajo tu mejor motor.',
    sov: '2 competidores aparecen más que tú en respuestas de IA.',
    dimensions: 'Tu mayor brecha vs. el benchmark: citas verificables (32 de 65).',
    sentiment: 'Mayormente neutral — todavía sin una narrativa positiva fuerte.'
  },
  verdict: {
    title: 'Veredicto ejecutivo',
    scoreLabel: 'Visibilidad estimada',
    scoreContext: 'Nivel intermedio · los líderes de tu categoría superan 85.',
    scoreDisclaimer: 'Estimación, no garantía de ranking',
    coverageLabel: 'Motores consultados',
    coverageValue: (r: number, s: number) => `${r} de ${s} motores respondieron`,
    partialLabel: 'Cobertura parcial',
    pendingProvider: (p: string) => `${p} pendiente`,
    partialHelper: 'Un motor no respondió a tiempo; el puntaje puede ajustarse.',
    contextLabel: 'Contexto del informe',
    contextValue: 'Datos agregados y públicos',
    contextHelper: 'Sin datos crudos ni confidenciales.'
  },
  primaryGap: { title: 'Brecha principal', impactLabel: 'Impacto' },
  recommendedMotion: { title: 'Movimiento recomendado', impactLabel: 'Impacto esperado' },
  sov: {
    title: 'Share of Voice competitivo',
    helper: 'Participación de menciones de tu marca frente a competidores en respuestas de IA.',
    brandLabel: 'Tu marca',
    shareLabel: 'Share of Voice',
    mentionsLabel: 'menciones'
  },
  engines: {
    snapshotTitle: 'Visibilidad por motor',
    snapshotHelper: 'Tu visibilidad no es uniforme: cada motor de IA es un canal distinto.',
    spreadLabel: 'Brecha entre motores',
    promptCoverage: (appeared: number, asked: number) =>
      `Apareciste en ${appeared} de ${asked} preguntas que tu cliente le haría a la IA.`
  },
  dimensions: {
    title: 'Desempeño por dimensión',
    colDimension: 'Dimensión',
    colScore: 'Puntaje (0-100)',
    colSeverity: 'Severidad',
    colComment: 'Comentario clave'
  },
  signals: {
    title: 'Resumen de señales AEO',
    citationShareTitle: 'Share de citas (promedio)',
    citationShareHelper: (cited: number, total: number) => `Menciones con cita: ${cited} de ${total}`,
    sentimentTitle: 'Sentimiento de menciones',
    sentimentBasis: (n: number) => `Basado en ${n} menciones calificadas por IA.`,
    prominenceTitle: 'Prominencia de marca',
    prominenceHelper: 'Índice de prominencia en respuestas de IA.',
    trendTitle: 'Tendencia de visibilidad',
    engineTrendTitle: 'Visibilidad por motor en el tiempo',
    engineTrendAxis: 'Visibilidad estimada (0-100)',
    trendComparison: 'vs. periodo anterior',
    trendAxisLabel: 'Puntaje de visibilidad estimada (0-100)',
    sentimentLabels: { positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' }
  },
  recommendations: {
    title: 'Recomendaciones prioritarias',
    colAction: 'Acción recomendada',
    colDescription: 'Descripción',
    colEffort: 'Esfuerzo',
    colImpact: 'Impacto',
    detailLink: 'Ver plan detallado de acciones'
  },
  provenance: {
    title: 'Proveniencia y metodología',
    reportId: 'ID del informe',
    methodology: 'Metodología',
    sampledProviders: 'Proveedores muestreados (agregado)',
    scoreVersion: 'Versión del score',
    promptPackVersion: 'Versión del prompt pack',
    generatedAt: 'Generado / actualizado',
    currency: 'Moneda del reporte',
    language: 'Idioma del análisis'
  },
  preview: {
    title: 'Vista previa de adjunto / PDF (print-safe)',
    summaryTitle: 'Resumen ejecutivo',
    summaryBody:
      'Tu marca tiene visibilidad moderada en IA generativa. La autoridad temática y el nivel de citas verificables son las principales oportunidades para aumentar relevancia y consideración en respuestas clave.',
    pageLabel: (c: number, t: number) => `Página ${c} de ${t}`
  },
  footer: {
    disclaimer:
      'Estimación basada en respuestas generadas por IA a partir de fuentes públicas y señales agregadas. No es un ranking ni garantiza resultados futuros.',
    noRawData: 'No incluye datos confidenciales ni crudos de proveedores.',
    publicSafeStamp: 'Contenido público-safe: sin evidencia cruda.'
  },
  effort: { low: 'Bajo', medium: 'Medio', high: 'Alto' },
  impact: { medium: 'Medio', high: 'Alto' },
  severity: {
    optimo: 'Óptimo',
    medium: 'Media',
    attention: 'Atención',
    high: 'Alta',
    critical: 'Crítica',
    sin_dato: 'Sin dato'
  } as Record<ReportSeverity, string>
} as const

export const LEVELS: ReportLevelVM[] = [
  {
    id: 'found',
    ordinal: '01',
    label: 'Que te encuentre',
    labelEn: 'Be Found',
    question: '¿Existes para la IA?',
    icon: 'tabler-flag',
    status: 'measured',
    score: 72,
    severity: 'attention'
  },
  {
    id: 'readable',
    ordinal: '02',
    label: 'Que te entienda',
    labelEn: 'Be Readable',
    question: '¿Te puede leer sin adivinar?',
    icon: 'tabler-file-text',
    status: 'measured',
    score: 51,
    severity: 'high'
  },
  {
    id: 'correct',
    ordinal: '03',
    label: 'Que te represente bien',
    labelEn: 'Be Correct',
    question: '¿Lo que dice de ti es verdad?',
    icon: 'tabler-circle-check',
    status: 'coverage',
    score: null,
    severity: 'sin_dato',
    coverageNote: 'Qué tan fielmente te representa la IA.'
  },
  {
    id: 'actionable',
    ordinal: '04',
    label: 'Que pueda actuar',
    labelEn: 'Be Actionable',
    question: '¿Te pueden usar, no solo citar?',
    icon: 'tabler-bolt',
    status: 'coverage',
    score: null,
    severity: 'sin_dato',
    coverageNote: 'Si los agentes de IA pueden operar tu sitio.'
  },
  {
    id: 'intrinsic',
    ordinal: '05',
    label: 'Que te prefiera',
    labelEn: 'Be Intrinsic',
    question: '¿Eres el default?',
    icon: 'tabler-trophy',
    status: 'measured',
    score: 59,
    severity: 'attention'
  }
]

export const REPORT_VM: ReportArtifactVM = {
  organizationName: 'Globe',
  reportDate: '20 may 2025',
  analyzedPeriod: '5–18 may 2025',
  comparisonPeriod: '21 abr – 4 may 2025',
  score: 72,
  scoreSeverity: 'attention',
  scoreLevelLabel: 'Intermedio',
  coverage: { responded: 4, sampled: 4, pendingProvider: null },
  perceptionAxisScore: 61,
  agenticAxisScore: null,
  levels: LEVELS,
  dimensions: [
    { key: 'ai_visibility', label: 'AI Visibility', shortLabel: 'AI Visibility', score: 72, benchmark: 68, severity: 'medium', comment: 'Buena presencia general en IA.', levelId: 'found' },
    { key: 'entity_clarity', label: 'Claridad de entidad', shortLabel: 'Entidad', score: 68, benchmark: 70, severity: 'medium', comment: 'Mejorar desambiguación y aliases.', levelId: 'readable' },
    { key: 'thematic_authority', label: 'Autoridad temática', shortLabel: 'Autoridad', score: 54, benchmark: 72, severity: 'high', comment: 'Cobertura limitada en temas clave.', levelId: 'readable' },
    { key: 'verified_citations', label: 'Citas verificables', shortLabel: 'Citas', score: 32, benchmark: 65, severity: 'high', comment: 'Bajo nivel de citas y referencias.', levelId: 'readable' },
    { key: 'competition', label: 'Competencia', shortLabel: 'Competencia', score: 63, benchmark: 70, severity: 'medium', comment: 'Presencia por debajo de líderes.', levelId: 'intrinsic' },
    { key: 'perceived_trust', label: 'Confianza percibida', shortLabel: 'Confianza', score: 70, benchmark: 66, severity: 'medium', comment: 'Señales positivas, pero dispersas.', levelId: 'intrinsic' },
    { key: 'purchase_intent', label: 'Intención de compra', shortLabel: 'Intención', score: 45, benchmark: 60, severity: 'high', comment: 'Debilidad en escenarios transaccionales.', levelId: 'intrinsic' }
  ],
  primaryGap: {
    title: 'Autoridad temática y citas verificables',
    body: 'Bajo nivel de citas y referencias en respuestas generadas por IA limita tu visibilidad y consideración.',
    impact: 'high'
  },
  recommendedMotion: {
    title: 'Construir autoridad citacional',
    body: 'Fortalecer cobertura en fuentes confiables, contenido especializado y datos verificables.',
    impact: 'high'
  },
  competitiveSov: {
    brandName: 'Globe',
    brandMentions: 32,
    competitors: [
      { name: 'Competidor A', mentions: 48 },
      { name: 'Competidor B', mentions: 41 },
      { name: 'Competidor C', mentions: 23 }
    ]
  },
  signals: {
    citationSharePct: 32,
    citedMentions: 32,
    totalMentions: 100,
    sentiment: { positive: 38, neutral: 45, negative: 17, sampleSize: 100 },
    prominence: 3.2,
    trend: {
      points: [
        { label: '27 abr', value: 58 },
        { label: '4 may', value: 64 },
        { label: '11 may', value: 61 },
        { label: '18 may', value: 66 },
        { label: 'Hoy', value: 72 }
      ],
      comparison: 'vs. periodo anterior'
    }
  },
  engineTrend: [
    { date: '7 abr', ChatGPT: 52, Claude: 58, Perplexity: 44, Gemini: 55 },
    { date: '14 abr', ChatGPT: 56, Claude: 60, Perplexity: 47, Gemini: 59 },
    { date: '21 abr', ChatGPT: 61, Claude: 62, Perplexity: 49, Gemini: 63 },
    { date: '28 abr', ChatGPT: 64, Claude: 66, Perplexity: 53, Gemini: 67 },
    { date: '5 may', ChatGPT: 68, Claude: 67, Perplexity: 56, Gemini: 70 },
    { date: '12 may', ChatGPT: 73, Claude: 69, Perplexity: 60, Gemini: 74 },
    { date: 'Hoy', ChatGPT: 77, Claude: 71, Perplexity: 64, Gemini: 79 }
  ],
  engineSnapshot: [
    { name: 'ChatGPT', score: 77, benchmark: 70 },
    { name: 'Claude', score: 71, benchmark: 68 },
    { name: 'Perplexity', score: 64, benchmark: 66 },
    { name: 'Gemini', score: 79, benchmark: 72 }
  ],
  promptCoverage: { asked: 12, appeared: 7 },
  recommendations: [
    { rank: 1, title: 'Fortalecer citas en fuentes de alta autoridad', body: 'Obtener cobertura y menciones en medios, directorios y sitios de la industria.', effort: 'medium', impact: 'high' },
    { rank: 2, title: 'Profundizar contenido temático', body: 'Publicar contenidos especializados con datos, casos y marcos propios.', effort: 'medium', impact: 'high' },
    { rank: 3, title: 'Optimizar intención de compra', body: 'Crear páginas y contenidos que respondan escenarios transaccionales clave.', effort: 'low', impact: 'medium' }
  ],
  provenance: {
    reportId: 'GRH-AEO-2025-0519-GLB',
    methodology: 'Greenhouse AI Visibility Grader v2.4',
    sampledProviders: '8 de 10 proveedores (80% de cobertura)',
    scoreVersion: '2.4.0',
    promptPackVersion: '2.3.1',
    generatedAt: '19 may 2025, 08:45',
    currency: 'USD',
    language: 'Español (LatAm)'
  }
}

export const VARIANT_OPTIONS: { id: ArtifactVariant; label: string; icon: string }[] = [
  { id: 'publicWeb', label: 'publicWeb', icon: 'tabler-world' },
  { id: 'clientPortal', label: 'clientPortal', icon: 'tabler-users' },
  { id: 'attachment', label: 'attachment', icon: 'tabler-paperclip' },
  { id: 'adminPreview', label: 'adminPreview', icon: 'tabler-shield-half' }
]

export const STATE_OPTIONS: { id: ArtifactState; label: string }[] = [
  { id: 'partial', label: 'Parcial' },
  { id: 'ready', label: 'Listo' },
  { id: 'noTrend', label: 'Sin histórico' },
  { id: 'insufficientData', label: 'Datos insuficientes' },
  { id: 'reviewRequiredPublic', label: 'En revisión' },
  { id: 'expired', label: 'Vencido' },
  { id: 'renderError', label: 'Error de carga' },
  { id: 'denied', label: 'Sin acceso' }
]

export const STATE_COPY: Record<ArtifactState, { title: string; body: string; cta: string | null }> = {
  ready: { title: 'Informe listo', body: 'El informe ya puede compartirse como vista web o adjunto.', cta: 'Ver informe' },
  partial: { title: 'Reporte parcial', body: 'Algunas fuentes no respondieron a tiempo. El puntaje y las conclusiones pueden cambiar cuando se complete la cobertura.', cta: 'Ver cobertura disponible' },
  noTrend: { title: 'Sin histórico comparable', body: 'Este informe aún no tiene una medición anterior comparable.', cta: null },
  insufficientData: { title: 'Datos insuficientes', body: 'La muestra disponible no alcanza para estimar visibilidad con confianza.', cta: 'Solicitar nueva medición' },
  reviewRequiredPublic: { title: 'Tu reporte se está preparando', body: 'Estamos revisando que el informe no incluya datos internos ni señales incompletas.', cta: 'Volver más tarde' },
  expired: { title: 'Este informe ya no está disponible', body: 'El enlace o adjunto pertenece a una versión vencida del reporte.', cta: 'Solicitar una versión actualizada' },
  renderError: { title: 'No pudimos cargar el informe', body: 'La información del reporte no respondió a tiempo. Tus datos no se perdieron.', cta: 'Reintentar' },
  denied: { title: 'Este informe no está disponible para tu espacio', body: 'No encontramos un reporte autorizado para esta organización.', cta: 'Volver al portal' },
  printReady: { title: 'Preparado para adjuntar', body: 'El informe usa gráficos estáticos y tablas de respaldo para impresión/PDF.', cta: 'Descargar PDF' }
}
