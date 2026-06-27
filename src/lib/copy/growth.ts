/**
 * Growth · AI Visibility microcopy canonical layer (TASK-1235).
 *
 * Copy reusable es-CL (tuteo) del `grader_report`: explainers por dimensión
 * (plain-language, a11y cognitiva), plantillas de recomendación gap→acción
 * (§8.4 del arch + tácticas `seo-aeo`), gate states (razón + próxima acción),
 * headline frames, severidad nombrada y disclaimer. Plantilla determinista —
 * NO generación libre por LLM. Sin difamación de competidores.
 *
 * Validado con la skill `greenhouse-ux-writing`: tuteo, factual no alarmista,
 * "nunca un número sin contexto", verbos de acción al frente.
 */

import type {
  GraderReportGateStatus,
  GraderReportSeverity,
  GraderReportTrendStatus,
  RecommendationGapKey,
  SentimentNet,
  TrendDirection
} from '@/lib/growth/ai-visibility/report/contracts'
import type { NormalizedFindingProvider } from '@/lib/growth/ai-visibility/normalization/contracts'
import type { AccuracyFindingKind } from '@/lib/growth/ai-visibility/accuracy/contracts'
import type { ScoreDimensionKey } from '@/lib/growth/ai-visibility/scoring/config'

export const GH_GROWTH_AI_VISIBILITY = {
  // Explainer plain-language de 1 línea por dimensión (P-6, sin jerga).
  dimension_explainer: {
    ai_visibility: '¿Apareces cuando la IA recomienda servicios como el tuyo?',
    entity_clarity: '¿La IA entiende quién eres, qué vendes y para quién?',
    category_ownership: '¿La IA te asocia con tu categoría y sus casos de uso?',
    competitive_sov: '¿Apareces frente a tus competidores cuando la IA responde?',
    citation_quality: '¿Las fuentes que la IA cita sobre ti son creíbles y útiles?',
    message_alignment: '¿La IA repite tu posicionamiento o uno desviado?',
    revenue_intent_coverage: '¿Apareces en preguntas de compra, comparación o implementación?'
  } satisfies Record<ScoreDimensionKey, string>,

  // Severidad nombrada (la superficie la mapea a token AXIS + encoding secundario).
  severity_label: {
    critico: 'Crítico',
    atencion: 'Atención',
    optimo: 'Óptimo',
    sin_dato: 'Sin dato'
  } satisfies Record<GraderReportSeverity, string>,

  // Mapeo gap → recomendación accionable (§8.4 + seo-aeo). Verbo de acción al frente.
  recommendation: {
    low_entity_clarity: {
      title: 'Aclara tu identidad ante la IA',
      action:
        'Reescribe y amplía tu página de servicios y el contenido "quiénes somos" con datos estructurados (schema Organization) para que los motores entiendan quién eres, qué vendes y para quién.'
    },
    low_category_ownership: {
      title: 'Apropia tu categoría',
      action:
        'Publica un explainer de categoría, una página comparativa y perfiles en directorios de terceros para asociarte a la categoría y sus casos de uso.'
    },
    weak_citation_quality: {
      title: 'Gánate citas creíbles',
      action:
        'Consigue menciones externas confiables con PR digital y actualiza la frescura de tus fuentes propias; las menciones de marca pesan cerca de 3 veces más que los backlinks para la visibilidad en IA.'
    },
    competitors_dominate: {
      title: 'Disputa los prompts de compra',
      action:
        'Crea contenido comparativo y de alternativas con evidencia (casos y resultados) para aparecer donde hoy dominan otros proveedores.'
    },
    message_drift: {
      title: 'Alinea tu mensaje',
      action:
        'Alinea tu sitio, LinkedIn, snippets de HubSpot y bios públicas con tu narrativa deseada para que la IA repita tu posicionamiento, no uno desviado.'
    },
    weak_revenue_intent: {
      title: 'Cubre la intención de compra',
      action:
        'Agrega contenido de precios, implementación y casos de uso con pruebas para aparecer en preguntas de compra y comparación.'
    }
  } satisfies Record<RecommendationGapKey, { title: string; action: string }>,

  // Gate states: razón + próxima acción renderizables (P-3).
  gate: {
    ready: {
      reason: 'Diagnóstico completo con cobertura suficiente.',
      nextAction: 'Revisa el plan de acción priorizado del reporte.'
    },
    insufficient_data: {
      reason: 'No reunimos evidencia suficiente para un diagnóstico confiable.',
      nextAction: 'Amplía la muestra de motores o vuelve a correr el análisis con más prompts.'
    },
    review_required: {
      reason: 'El análisis detectó lenguaje sensible que requiere revisión humana antes de publicar.',
      nextAction: 'Un especialista revisa la evidencia antes de compartir el reporte.'
    },
    partial: {
      reason: 'Algunos motores no respondieron; el reporte es parcial pero honesto.',
      nextAction: 'Vuelve a correr el análisis para completar los motores faltantes.'
    }
  } satisfies Record<GraderReportGateStatus, { reason: string; nextAction: string }>,

  // Headline frame factual (no alarmista), por severidad. Recibe el label de la dimensión.
  headline_frame: {
    critico: (label: string) => `${label} con brecha crítica en answer engines`,
    atencion: (label: string) => `${label} con espacio de mejora en answer engines`,
    optimo: (label: string) => `${label} sólida en answer engines`,
    sin_dato: (label: string) => `${label} sin evidencia suficiente`
  } satisfies Record<GraderReportSeverity, (label: string) => string>,

  // Frame de una métrica de dimensión: "Etiqueta: 0/100." o "Etiqueta: sin evidencia."
  dimension_metric_frame: (label: string, score: number | null) =>
    score === null ? `${label}: sin evidencia suficiente.` : `${label}: ${score}/100.`,

  // Contexto comparativo del finding competitivo.
  competitive_context: (brandMentions: number, competitorCount: number) =>
    `Apareces ${brandMentions} ${brandMentions === 1 ? 'vez' : 'veces'} frente a ${competitorCount} ${
      competitorCount === 1 ? 'competidor' : 'competidores'
    } en las respuestas.`,

  // Tendencia run-over-run (TASK-1236): razón por estado + etiqueta de dirección del delta.
  trend_status: {
    sin_historico: 'Primer análisis: aún no hay un período anterior para comparar.',
    incomparable: 'El análisis anterior usó otra versión de prompts; no es comparable.',
    con_tendencia: 'Comparado con tu análisis anterior.'
  } satisfies Record<GraderReportTrendStatus, string>,

  trend_direction_label: {
    subio: 'Subió',
    bajo: 'Bajó',
    sin_cambio: 'Sin cambios',
    sin_dato: 'Sin dato'
  } satisfies Record<TrendDirection, string>,

  // Enriquecimiento de señales (TASK-1237): etiquetas de motor + saldo de sentimiento + findings por motor.
  provider_label: {
    openai: 'ChatGPT (OpenAI)',
    anthropic: 'Claude (Anthropic)',
    perplexity: 'Perplexity',
    gemini: 'Gemini (Google)',
    google_ai_overview: 'Google AI Overview / AI Mode',
    manual_import: 'Evidencia cargada'
  } satisfies Record<NormalizedFindingProvider, string>,

  sentiment_net_label: {
    positivo: 'Positivo',
    neutral: 'Neutral',
    negativo: 'Negativo',
    mixto: 'Mixto',
    sin_dato: 'Sin dato'
  } satisfies Record<SentimentNet, string>,

  // Finding por motor: presente / invisible, con el conteo de respuestas como contexto.
  provider_finding_present: (label: string, present: number, resolved: number) =>
    `Presente en ${label}: apareces en ${present} de ${resolved} ${resolved === 1 ? 'respuesta' : 'respuestas'}.`,
  provider_finding_absent: (label: string, resolved: number) =>
    `Invisible en ${label}: no apareces en ${resolved} ${resolved === 1 ? 'respuesta evaluada' : 'respuestas evaluadas'}.`,

  // Intake público del lead magnet (TASK-1240): mensajes es-CL por resultado (cliente público).
  public_intake: {
    accepted: 'Estamos preparando tu análisis. En unos minutos estará listo.',
    disabled: 'El análisis público no está disponible por ahora.',
    invalid: 'Revisa los datos: marca, sitio, mercado, categoría, un email válido y aceptar los términos.',
    captcha_failed: 'No pudimos verificar que no eres un robot. Recarga la página e intenta de nuevo.',
    rate_limited: 'Alcanzaste el límite de análisis por hoy. Intenta de nuevo mañana.',
    cost_blocked: 'Estamos con mucha demanda en este momento. Intenta de nuevo en unos minutos.'
  } satisfies Record<'accepted' | 'disabled' | 'invalid' | 'captcha_failed' | 'rate_limited' | 'cost_blocked', string>,

  // Status público del run por poll (TASK-1245): mensajes es-CL honestos, sin razones internas
  // (review_required nunca revela el porqué). Cliente público del lead magnet.
  public_status: {
    queued: 'Recibimos tu solicitud. Estamos preparando tu análisis.',
    processing: 'Estamos analizando tu marca en los motores de IA. Esto toma unos minutos.',
    ready: 'Tu análisis está listo.',
    in_review: 'Tu análisis está casi listo. Le estamos dando una última revisión y te avisamos apenas esté.',
    unavailable: 'No pudimos completar tu análisis esta vez. Vuelve a intentarlo en unos minutos.',
    not_found: 'No encontramos este análisis. Revisa el enlace o solicita uno nuevo.'
  } satisfies Record<'queued' | 'processing' | 'ready' | 'in_review' | 'unavailable' | 'not_found', string>,

  // Rate-limit de reads públicos (TASK-1245 Slice 3): 429 honesto, sin revelar el límite exacto.
  public_read_rate_limited: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',

  // Exactitud de marca (TASK-1238, INTERNAL): etiqueta por tipo de inexactitud (admin review).
  accuracy_kind_label: {
    category_mismatch: 'Categoría equivocada',
    entity_collision: 'Confusión de identidad',
    misattribution: 'Atribución desviada',
    unverifiable_claim: 'Afirmación no verificable'
  } satisfies Record<AccuracyFindingKind, string>,

  // Nota del finding headline cuando el KPI dominante es el resultado compuesto (ai_visibility).
  outcome_note: 'Tu visibilidad en IA resume las brechas de las dimensiones que la explican.',

  // Nota del finding headline cuando la dimensión dominante está en buen estado.
  headline_strength_note: 'Es tu mayor fortaleza relativa; mantén la frescura para sostenerla.',

  disclaimer:
    'Diagnóstico muestreado y asistido por IA. No garantiza posiciones ni resultados; refleja una muestra de respuestas en la fecha del análisis.'
} as const

/**
 * TASK-1252 — AI Visibility Report Artifact · copy reusable del informe completo.
 *
 * Labels/títulos/disclaimers del report artifact (web + attachment + admin/client).
 * SoT de copy del artefacto; todos los render adapters y consumers (TASK-1241/1248/
 * 1250) lo heredan, no lo redeciden. Reusa `GH_GROWTH_AI_VISIBILITY` para severidad,
 * gate, trend, sentimiento y disclaimer (no se duplica). Validado con
 * `greenhouse-ux-writing`: es-CL tuteo, factual no alarmista, "estimación, no
 * garantía de ranking" centralizado aquí.
 */
export const GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT = {
  header: {
    title: 'Informe de visibilidad en IA',
    reportDateLabel: 'Fecha del informe',
    analyzedPeriodLabel: 'Período analizado',
    comparisonLabel: 'Comparado con',
    publicSafeChip: 'Público-safe',
    publicSafeHelper: 'Contenido sin datos confidenciales ni crudos',
    verifiedOrgAria: 'Organización verificada'
  },
  narrative: {
    eyebrow: 'Lo que encontramos'
  },
  // Framework de 5 niveles (Delta 2026-06-27). Labels + pregunta guía por nivel.
  levelsBand: {
    title: 'Niveles para existir en un internet de agentes',
    perceptionAxis: 'Percepción · ¿te mencionan?',
    agenticAxis: 'Operabilidad · ¿te pueden usar?',
    coverageBadge: 'En cobertura'
  },
  level: {
    found: { ordinal: '01', label: 'Que te encuentre', labelEn: 'Be Found', question: '¿Existes para la IA?' },
    readable: { ordinal: '02', label: 'Que te entienda', labelEn: 'Be Readable', question: '¿Te puede leer sin adivinar?' },
    correct: {
      ordinal: '03',
      label: 'Que te represente bien',
      labelEn: 'Be Correct',
      question: '¿Lo que dice de ti es verdad?',
      coverageNote: 'Qué tan fielmente te representa la IA.'
    },
    actionable: {
      ordinal: '04',
      label: 'Que pueda actuar',
      labelEn: 'Be Actionable',
      question: '¿Te pueden usar, no solo citar?',
      coverageNote: 'Si los agentes de IA pueden operar tu sitio.'
    },
    intrinsic: { ordinal: '05', label: 'Que te prefiera', labelEn: 'Be Intrinsic', question: '¿Eres el default?' }
  } satisfies Record<
    'found' | 'readable' | 'correct' | 'actionable' | 'intrinsic',
    { ordinal: string; label: string; labelEn: string; question: string; coverageNote?: string }
  >,
  verdict: {
    title: 'Veredicto ejecutivo',
    scoreLabel: 'Visibilidad estimada',
    scoreContext: 'Nivel intermedio · los líderes de tu categoría superan 85.',
    scoreDisclaimer: 'Estimación, no garantía de ranking',
    coverageLabel: 'Motores consultados',
    coverageValue: (responded: number, sampled: number) => `${responded} de ${sampled} motores respondieron`,
    contextLabel: 'Contexto del informe',
    contextValue: 'Datos agregados y públicos',
    contextHelper: 'Sin datos crudos ni confidenciales.'
  },
  primaryGap: { title: 'Brecha principal', impactLabel: 'Impacto' },
  recommendedMotion: { title: 'Movimiento recomendado', impactLabel: 'Impacto esperado' },
  dimensions: {
    title: 'Desempeño por dimensión',
    colDimension: 'Dimensión',
    colScore: 'Puntaje (0-100)',
    colSeverity: 'Severidad',
    colComment: 'Qué significa'
  },
  sov: {
    title: 'Share of Voice competitivo',
    helper: 'Participación de menciones de tu marca frente a competidores en respuestas de IA.',
    brandLabel: 'Tu marca',
    shareLabel: 'Share of Voice',
    mentionsLabel: 'menciones'
  },
  engineSnapshot: {
    // Presencia por motor (conteos) de la marca evaluada — público-safe, con logo + nombre por motor.
    title: 'Visibilidad por motor',
    helper: 'Tu visibilidad no es uniforme: cada motor de IA es un canal distinto.',
    presentLabel: (present: number, resolved: number) => `${present} de ${resolved} respuestas`
  },
  signals: {
    title: 'Resumen de señales AEO',
    citationShareTitle: 'Share de citas (promedio)',
    citationShareHelper: (cited: number, total: number) => `Menciones con cita: ${cited} de ${total}`,
    sentimentTitle: 'Sentimiento de menciones',
    sentimentBasis: (n: number) => `Basado en ${n} menciones calificadas por IA.`,
    prominenceTitle: 'Prominencia de marca',
    prominenceHelper: 'Mejor posición y posición promedio en respuestas de IA.',
    prominenceBest: (best: number) => `Mejor: #${best}`,
    prominenceAverage: (avg: number) => `Promedio: #${avg}`,
    trendTitle: 'Tendencia de visibilidad',
    trendAxisLabel: 'Puntaje de visibilidad estimada (0-100)'
  },
  recommendations: {
    title: 'Recomendaciones prioritarias',
    colAction: 'Acción recomendada',
    colDescription: 'Descripción',
    colSeverity: 'Prioridad',
    detailLink: 'Ver plan detallado de acciones'
  },
  provenance: {
    title: 'Proveniencia y metodología',
    asOf: 'Datos al',
    sampledProviders: 'Proveedores muestreados',
    promptCount: 'Prompts evaluados',
    scoreVersion: 'Versión del score',
    promptPackVersion: 'Versión del prompt pack'
  },
  footer: {
    publicSafeStamp: 'Contenido público-safe: sin evidencia cruda.'
  },
  // Estados del artefacto (gate + consumer): título + cuerpo + CTA. Honestos, sin precisión falsa.
  state: {
    partial: {
      title: 'Reporte parcial',
      body: 'Algunas fuentes no respondieron a tiempo. El puntaje y las conclusiones pueden cambiar cuando se complete la cobertura.'
    },
    insufficient_data: {
      title: 'Datos insuficientes',
      body: 'La muestra disponible no alcanza para estimar visibilidad con confianza.'
    },
    review_required: {
      title: 'Tu reporte se está preparando',
      body: 'Estamos revisando que el informe no incluya datos internos ni señales incompletas.'
    },
    no_trend: {
      title: 'Sin histórico comparable',
      body: 'Este informe aún no tiene una medición anterior comparable.'
    }
  }
} as const

/**
 * TASK-1248 — Portal cliente · AI Visibility (workbench master-detail). Copy es-CL (tuteo) del
 * 4.º consumer del reporte: navigator (Dimensiones + Recomendaciones) + detail canvas. Touchpoint
 * de CLIENTE → tono cálido/profesional, marca Greenhouse by Efeonce; data-first, número con contexto,
 * estados honestos. NUNCA promete un monitoreo recurrente (ese SKU no existe). Validado con
 * `greenhouse-ux-writing`.
 */
export const GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT = {
  page: {
    breadcrumbRoot: 'Greenhouse',
    breadcrumbGrowth: 'Crecimiento',
    title: 'Visibilidad en IA',
    subtitle: 'Cómo te ve la inteligencia artificial cuando responde por tu categoría.',
    orgChipAria: 'Organización del informe',
    asOfLabel: 'Datos al',
    samplingNote: 'Medición sobre una muestra de respuestas de IA, no un monitoreo continuo.'
  },
  navigator: {
    ariaLabel: 'Navegador del informe: dimensiones y recomendaciones',
    dimensionsHeader: 'Dimensiones',
    recommendationsHeader: 'Recomendaciones',
    dimensionsEmpty: 'Aún no hay dimensiones medidas.',
    recommendationsEmpty: 'Sin recomendaciones: tu visibilidad está en buen estado.',
    rowScoreAria: 'Puntaje',
    selectHint: 'Selecciona un ítem para ver el detalle'
  },
  detail: {
    overviewTitle: 'Resumen',
    scoreLabel: 'Puntaje de visibilidad',
    scoreOutOf: 'de 100',
    scoreNoData: 'Sin dato',
    comparePrevious: 'vs medición anterior',
    noPrevious: 'Primera medición',
    perceptionAxisLabel: 'Percepción · ¿te mencionan?',
    agenticAxisLabel: 'Operabilidad · ¿te pueden usar?',
    agenticCoverage: 'En cobertura',
    whyItMatters: '¿Por qué importa?',
    whatToDo: 'Qué hacer',
    motionLabel: 'Enfoque sugerido',
    trendTitle: 'Tendencia',
    trendMetricName: 'Visibilidad',
    providerPresenceTitle: 'Presencia por motor',
    providerPresenceHelp: 'En cuántas respuestas apareces, por motor de IA.',
    providerPresenceAria: 'Presencia por motor de IA',
    providerOf: 'de',
    signalsTitle: 'Señales',
    dimensionScoreContext: 'Puntaje de esta dimensión, en una escala de 0 a 100.'
  },
  signals: {
    citationTitle: 'Citas a tu sitio',
    citationHelp: 'De las respuestas con fuentes, cuántas citan tu dominio.',
    citationNoData: 'Sin citas evaluables',
    sentimentTitle: 'Sentimiento',
    sentimentHelp: 'Saldo del tono con que la IA habla de tu marca.',
    positionTitle: 'Posición',
    positionHelp: 'Qué tan arriba apareces cuando te mencionan.',
    positionBest: 'Mejor',
    positionAverage: 'Promedio',
    positionNoData: 'Sin posición resuelta'
  },
  cta: {
    scheduleConversation: 'Agendar conversación',
    scheduleHelp: 'Conversemos cómo mejorar tu visibilidad con tu equipo de Efeonce.',
    ariaLabel: 'Agendar una conversación con tu equipo de Efeonce'
  },
  states: {
    loadingTitle: 'Preparando tu informe de visibilidad…',
    empty: {
      title: 'Aún no tienes un informe de visibilidad',
      body: 'Cuando midamos cómo te ve la IA, tu informe aparece aquí con tu puntaje y las acciones recomendadas.',
      cta: 'Solicitar diagnóstico'
    },
    preparing: {
      title: 'Tu informe se está preparando',
      body: 'Estamos terminando de medir tu visibilidad. Vuelve en un rato y estará listo.'
    },
    error: {
      title: 'No pudimos cargar tu informe',
      body: 'Tuvimos un problema al traer tus datos. Intenta de nuevo en unos minutos.',
      retry: 'Reintentar'
    },
    permissionDenied: {
      title: 'No tienes acceso a este informe',
      body: 'Tu cuenta no tiene permiso para ver la visibilidad en IA. Contacta a tu equipo de Efeonce.'
    }
  }
} as const
