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
import type { GraderEngineSurface, NormalizedFindingProvider } from '@/lib/growth/ai-visibility/normalization/contracts'
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

  // Label es-CL por dimensión para superficies de cliente (el label canónico del contrato es inglés).
  dimension_label: {
    ai_visibility: 'Visibilidad en IA',
    entity_clarity: 'Claridad de entidad',
    category_ownership: 'Dominio de categoría',
    competitive_sov: 'Participación frente a competencia',
    citation_quality: 'Calidad de las citas',
    message_alignment: 'Alineación del mensaje',
    revenue_intent_coverage: 'Cobertura de intención de compra'
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

  provider_display_label: {
    openai: 'ChatGPT',
    anthropic: 'Claude',
    perplexity: 'Perplexity',
    gemini: 'Gemini',
    google_ai_overview: 'Google AI Overview',
    manual_import: 'Evidencia cargada'
  } satisfies Record<NormalizedFindingProvider, string>,

  // Surfaces del grader — labels canónicas de producto (naming inglés, NO se traduce).
  // Taxonomía + mapping motor→surface viven en normalization/contracts.ts (TASK-1265 delta).
  // `answer_engines` = asistentes conversacionales · `ai_search` = respuesta IA en el SERP.
  surface_label: {
    answer_engines: 'Answer Engines',
    ai_search: 'AI Search'
  } satisfies Record<GraderEngineSurface, string>,

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

  citation_source_targeting: (domains: string[]) =>
    `Prioriza presencia y menciones en ${domains.join(', ')}; esos dominios ya están moldeando las respuestas sobre la categoría.`,

  // Intake público del lead magnet (TASK-1240): mensajes es-CL por resultado (cliente público).
  public_intake: {
    accepted: 'Estamos preparando tu análisis. En unos minutos estará listo.',
    disabled: 'El análisis público no está disponible por ahora.',
    invalid: 'Revisa los datos: marca, sitio, mercado, categoría, un email válido y aceptar los términos.',
    // TASK-1263 — rechazo del gate de correo corporativo (TASK-1254): correo personal/gratis o temporal.
    email_not_corporate: 'Usa el correo de tu empresa para continuar. No aceptamos correos personales ni temporales.',
    captcha_failed: 'No pudimos verificar que no eres un robot. Recarga la página e intenta de nuevo.',
    rate_limited: 'Alcanzaste el límite de análisis por hoy. Intenta de nuevo mañana.',
    cost_blocked: 'Estamos con mucha demanda en este momento. Intenta de nuevo en unos minutos.'
  } satisfies Record<
    'accepted' | 'disabled' | 'invalid' | 'email_not_corporate' | 'captcha_failed' | 'rate_limited' | 'cost_blocked',
    string
  >,

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

export const GH_SEARCH_CONSOLE = {
  panel: {
    title: 'Google Search Console',
    subtitle: 'Mide la visibilidad de búsqueda de esta marca con datos reales de Google.',
    lockedTitle: 'Search Console aún no está disponible',
    lockedBody: 'La conexión está preparada, pero falta activar el flujo OAuth en este ambiente.',
    deniedTitle: 'Conexión solo lectura',
    deniedBody: 'Puedes ver el estado, pero necesitas permiso para conectar o desconectar esta fuente.',
    propertyLabel: 'Propiedad',
    propertyPlaceholder: 'sc-domain:ejemplo.com o https://ejemplo.com/',
    propertyHelper: 'Ingresa la propiedad exacta que el cliente puede autorizar en Google.',
    chooseProperty: 'Elige la propiedad',
    chooseHelper: 'Estas son las propiedades que tu cuenta de Google puede ver.',
    lastVerified: 'Última verificación',
    connectedAt: 'Conectado',
    notVerified: 'Sin verificación todavía'
  },
  status: {
    connected: 'Conectado',
    notConnected: 'No conectado',
    revoked: 'Acceso revocado',
    expired: 'Acceso expirado',
    pending: 'Pendiente',
    connecting: 'Conectando',
    error: 'Error'
  },
  state: {
    emptyTitle: 'Conecta la propiedad de búsqueda',
    emptyBody: 'Autoriza una propiedad de Search Console para medir visibilidad orgánica sin pedir tokens manuales.',
    connectedBody: 'Greenhouse puede leer Search Analytics de esta propiedad con scope de solo lectura.',
    revokedBody: 'Google revocó o bloqueó el acceso. Reconecta para seguir midiendo.',
    errorTitle: 'No pudimos completar la conexión',
    errorBody: 'Revisa la propiedad e inténtalo de nuevo. Nunca mostramos errores crudos de Google.',
    connectingTitle: 'Conectando con Google',
    connectingBody: 'Te llevamos al consentimiento de Google. No cierres esta pestaña.',
    pendingTitle: 'Cuenta de Google conectada',
    pendingBody: 'Elige qué propiedad de Search Console medir para esta marca.'
  },
  cta: {
    connect: 'Conectar',
    connectAccount: 'Conectar con Google',
    reconnect: 'Reconectar',
    disconnect: 'Desconectar',
    saveProperty: 'Guardar propiedad',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    confirmDisconnect: 'Desconectar fuente'
  },
  disconnect: {
    title: '¿Desconectar Search Console?',
    body: 'Dejaremos de medir la visibilidad de búsqueda de esta marca hasta que vuelvas a conectar.',
    success: 'Search Console quedó desconectado.',
    error: 'No pudimos desconectar Search Console. Intenta de nuevo.'
  },
  feedback: {
    connected: 'Search Console conectado.',
    connectionFailed: 'No pudimos conectar Search Console.',
    siteUrlMissing: 'Ingresa una propiedad de Search Console para continuar.',
    sitesLoading: 'Cargando tus propiedades…',
    sitesEmpty: 'Tu cuenta de Google no tiene propiedades en Search Console.',
    sitesError: 'No pudimos obtener tus propiedades. Intenta de nuevo.',
    propertySaved: 'Propiedad conectada.',
    propertyNotAccessible: 'Esa propiedad no está disponible en tu cuenta.'
  },
  aria: {
    panel: 'Estado de conexión de Google Search Console',
    propertyInput: 'Propiedad de Google Search Console',
    propertySelect: 'Selecciona la propiedad de Google Search Console',
    disconnectDialog: 'Confirmación para desconectar Google Search Console'
  }
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
    helper:
      'El diagnóstico se lee en dos ejes: percepción de marca y operabilidad agéntica. El score principal no mezcla ambos.',
    perceptionAxis: 'Percepción · ¿te mencionan?',
    perceptionTitle: 'Eje de percepción',
    perceptionHelper: 'Cómo los motores te encuentran, entienden, representan y recomiendan.',
    agenticAxis: 'Operabilidad · ¿te pueden usar?',
    agenticTitle: 'Eje de operabilidad',
    agenticHelper: 'Qué tan listo está tu sitio para que un agente pueda actuar, no solo citarte.',
    coverageBadge: 'En cobertura',
    measuredBadge: 'Medido'
  },
  level: {
    found: { ordinal: '01', label: 'Que te encuentre', labelEn: 'Be Found', question: '¿Existes para la IA?' },
    readable: {
      ordinal: '02',
      label: 'Que te entienda',
      labelEn: 'Be Readable',
      question: '¿Te puede leer sin adivinar?'
    },
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
    engineBrandsLabel: 'Evaluado en',
    coverageLabel: 'Motores consultados',
    coverageValue: (responded: number, sampled: number) => `${responded} de ${sampled} motores respondieron`,
    contextLabel: 'Contexto del informe',
    contextValue: 'Datos agregados y públicos',
    contextHelper: 'Sin datos crudos ni confidenciales.'
  },
  primaryGap: {
    title: 'Brecha principal',
    impactLabel: 'Impacto',
    executiveReadTitle: 'Lectura ejecutiva',
    affectedLevelLabel: 'Nivel afectado',
    evidenceLabel: 'Señal que lo sostiene',
    nextProofLabel: 'Próxima prueba',
    citationEvidence: (share: number | null) => (share === null ? 'Citas propias sin evidencia suficiente' : `${share}% de citas propias`),
    nextProof: (promptPackVersion: string) => `Repetir con prompt pack ${promptPackVersion} para ver si sube la citabilidad.`
  },
  recommendedMotion: { title: 'Movimiento recomendado', impactLabel: 'Impacto esperado' },
  dimensions: {
    title: 'Por qué ocurre',
    helper:
      'Las dimensiones técnicas se agrupan bajo el nivel que explican; así el score deja de ser una lista plana y se vuelve diagnóstico.',
    coverageHelper: 'Pendiente de medición específica; no se fabrica un puntaje cuando no hay evidencia suficiente.',
    colDimension: 'Dimensión',
    colScore: 'Puntaje (0-100)',
    colSeverity: 'Severidad',
    colComment: 'Qué significa'
  },
  sov: {
    title: 'Benchmark competitivo',
    helper: 'Nivel 05 · Que te prefiera: qué parte del espacio de respuesta ocupas frente a otras marcas.',
    brandLabel: 'Tu marca',
    shareLabel: 'Share of Voice',
    mentionsLabel: 'menciones'
  },
  engineSnapshot: {
    // Presencia por motor (conteos) de la marca evaluada — público-safe, con logo + nombre por motor.
    title: 'Canales de respuesta',
    helper: 'Cada motor de IA se comporta como un canal AEO distinto: mide dónde apareces y dónde se pierde presencia.',
    presentLabel: (present: number, resolved: number) => `${present} de ${resolved} respuestas`,
    takeawayTitle: 'Lectura AEO por motor',
    weakestTakeaway: (providerName: string) =>
      `${providerName} es el canal con menor presencia; conviene revisar fuentes frescas, citas externas y contenido recuperable para ese motor.`
  },
  signals: {
    title: 'Calidad de la presencia AEO',
    helper: 'No basta con aparecer: importa si te citan, cómo te describen y qué fuentes sostienen la respuesta.',
    citationShareTitle: 'Share de citas (promedio)',
    citationShareHelper: (cited: number, total: number) => `Menciones con cita: ${cited} de ${total}`,
    sentimentTitle: 'Sentimiento de menciones',
    sentimentBasis: (n: number) => `Basado en ${n} menciones calificadas por IA.`,
    prominenceTitle: 'Prominencia de marca',
    prominenceHelper: 'Mejor posición y posición promedio en respuestas de IA.',
    prominenceBest: (best: number) => `Mejor: #${best}`,
    prominenceAverage: (avg: number) => `Promedio: #${avg}`,
    sourceMixTitle: 'Fuentes que sostienen la respuesta',
    sourceMixHelper: 'Tipo de fuente citada o usada por la IA en la muestra.',
    trendTitle: 'Tendencia de visibilidad',
    trendAxisLabel: 'Puntaje de visibilidad estimada (0-100)'
  },
  recommendations: {
    title: 'Plan AEO prioritario',
    helper:
      'Focos ordenados para mover el baseline: mejorar recuperación, citabilidad, exactitud y presencia competitiva sin prometer ranking.',
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
    promptPackVersion: 'Versión del prompt pack',
    baselineTitle: 'Baseline de medición',
    baselineBody:
      'Este snapshot es comparable solo si se repite con el mismo prompt pack, motores muestreados y versión de score. La tendencia mide Share of Voice, citas y exactitud sobre esa base.'
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
    // Breadcrumb client-rooted (Inicio / AEO) — "Clientes/Org/Diagnóstico" es el modelo mental del operador
    // interno, no del cliente viendo SU propio informe. AEO = término de mercado (como SEO), no "Visibilidad en IA".
    breadcrumbRoot: 'Inicio',
    breadcrumbLeaf: 'AEO',
    title: 'AEO — Snapshot de visibilidad',
    orgChipAria: 'Organización del informe',
    asOfLabel: 'Datos al',
    samplingNote: 'Medición sobre una muestra de respuestas de IA, no un monitoreo continuo.'
  },
  summary: {
    scoreLabel: 'Puntaje de visibilidad',
    scoreOutOf: 'de 100',
    comparePrevious: 'vs medición anterior',
    noPrevious: 'Primera medición',
    perceptionAxisLabel: 'Percepción',
    agenticAxisLabel: 'Operabilidad',
    agenticCoverage: 'En cobertura',
    evaluatedOn: 'Evaluado en'
  },
  navigator: {
    ariaLabel: 'Navegador del informe: dimensiones y plan AEO',
    dimensionsHeader: 'Dimensiones',
    // Servicio done-for-you: NO es to-do del cliente; es el plan que ejecuta su equipo de Efeonce.
    recommendationsHeader: 'Plan AEO',
    dimensionsEmpty: 'Aún no hay dimensiones medidas.',
    recommendationsEmpty: 'Sin focos abiertos: tu visibilidad está en buen estado.',
    rowScoreAria: 'Puntaje',
    // El contador "Mostrando N de N focos del plan".
    recommendationsCount: (shown: number, total: number) => `Mostrando ${shown} de ${total} focos del plan`
  },
  detail: {
    overviewTitle: 'Resumen',
    openDetail: 'Ver detalle',
    // Eyebrow del ítem seleccionado (done-for-you: "Foco del plan", no "Recomendación"/tarea del cliente).
    recommendationEyebrow: (index: number, total: number) => `Foco ${index} de ${total} · Plan AEO`,
    // Nota de propiedad: el equipo de Efeonce ejecuta el foco (no es tarea del cliente).
    planAgencyNote: 'Tu equipo de Efeonce está trabajando este foco contigo.',
    dimensionEyebrow: 'Dimensión',
    relatedScoreLabel: 'Puntaje relacionado',
    relatedScoreHelp: 'Dimensión conectada con esta recomendación.',
    scoreOutOf: 'de 100',
    scoreNoData: 'Sin dato',
    comparePrevious: 'vs medición anterior',
    noPrevious: 'Primera medición',
    whyItMatters: '¿Por qué importa?',
    whatToDo: 'Qué hacer',
    // Charts.
    trendPanelTitle: 'Tendencia',
    trendPanelHelp: 'Tu puntaje frente a la medición anterior.',
    trendNoHistory: 'Primera medición — aún no hay un histórico comparable.',
    trendAxisPrevious: 'Anterior',
    trendAxisCurrent: 'Actual',
    platformPanelTitle: 'Menciones por plataforma',
    platformPanelHelp: 'En cuántas respuestas apareces, por motor de IA (actual).',
    platformPanelAria: 'Menciones por motor de IA',
    platformOf: 'de',
    signalsTitle: 'Señales de respaldo',
    signalsHelp: 'Indicadores actuales que sostienen tu visibilidad.'
  },
  signals: {
    citationTitle: 'Citas con fuente',
    citationHelp: 'Respuestas que citan tu dominio.',
    sentimentTitle: 'Sentimiento positivo',
    sentimentHelp: 'Menciones con tono favorable.',
    enginesTitle: 'Motores con mención',
    enginesHelp: 'Cobertura en modelos evaluados.',
    positionTitle: 'Posición promedio',
    positionHelp: 'Lugar cuando apareces.',
    sovTitle: 'Share de menciones',
    sovHelp: 'Tu marca vs. competidores.',
    noData: 'Sin dato'
  },
  // Affordance de soporte (NO venta): el cliente YA contrató AEO y está en el portal privado.
  support: {
    title: '¿Dudas con esta recomendación?',
    body: 'Tu equipo de Efeonce trabaja tu visibilidad contigo.',
    action: 'Hablar con tu equipo',
    ariaLabel: 'Escribir a tu equipo de Efeonce sobre tu visibilidad en IA'
  },
  states: {
    loadingTitle: 'Preparando tu informe de visibilidad…',
    empty: {
      title: 'Aún no tenemos tu medición de visibilidad',
      body: 'Tu equipo de Efeonce está preparando tu primera medición. Cuando esté lista, tu informe aparece aquí.'
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

/**
 * TASK-1278 — Portal cliente · AEO tiering + PLG trial (nodo S6 del EPIC-020). Copy es-CL (tuteo)
 * de los estados POR TIER alrededor del workbench (TASK-1248): banner de cupo trial, run self-serve,
 * upsell al agotar y teaser/locked gratis para clientes sin AEO. Touchpoint de CLIENTE → tono cálido,
 * Product-Led Growth honesto: el cupo agotado es un estado de upsell, NO un error; el teaser NO promete
 * lo que el tier no da; NUNCA expone costo/engine interno. Tuteo neutro (jamás voseo). Validado con
 * `greenhouse-ux-writing`.
 */
export const GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING = {
  // Banner de cupo (trial / pilot con revisiones disponibles).
  banner: {
    eyebrow: 'Prueba AEO',
    eyebrowAria: 'Estado de tu prueba de AEO',
    // "Te queda 1 de 3" / "Te quedan 2 de 3" — concordancia de número, número con contexto.
    remaining: (remaining: number, cap: number): string =>
      remaining === 1
        ? `Te queda 1 de ${cap} ${cap === 1 ? 'revisión' : 'revisiones'} este mes`
        : `Te quedan ${remaining} de ${cap} revisiones este mes`,
    resets: (date: string): string => `Se renuevan el ${date}`,
    help: 'Genera tu revisión del mes y mira cómo te ve la IA.'
  },
  // Run self-serve (botón → chokepoint). Estados honestos; sin exponer costo/engine.
  run: {
    cta: 'Generar revisión',
    ctaAria: 'Generar tu revisión de visibilidad en IA',
    preparingTitle: 'Tu revisión se está preparando',
    preparingBody: 'Estamos midiendo cómo te ve la IA. Esto puede tomar unos minutos; la página se actualiza sola.',
    refresh: 'Actualizar ahora',
    // Degradación honesta cuando el run self-serve aún no está habilitado en este ambiente.
    unavailable: 'Disponible próximamente',
    unavailableHelp: 'Estamos activando las revisiones self-serve. Mientras tanto, tu equipo de Efeonce puede generarla.',
    // Errores honestos del chokepoint (mapeados desde el código canónico es-CL del endpoint).
    errorQuota: 'Ya usaste tus revisiones de este mes. Se renuevan el próximo período.',
    errorProfile: 'Aún no tenemos los datos de tu marca para medir. Tu equipo de Efeonce los está preparando.',
    errorBusy: 'Estamos con mucha demanda en este momento. Intenta de nuevo en unos minutos.',
    errorGeneric: 'No pudimos generar la revisión. Intenta de nuevo en unos minutos.'
  },
  // Estado de cupo agotado = upsell (NO error). Reencuadra hacia AEO recurrente.
  upsell: {
    eyebrow: 'Prueba AEO',
    title: 'Usaste tus revisiones de este mes',
    body: (date: string): string =>
      `Se renuevan el ${date}. Si quieres seguimiento continuo de cómo te ve la IA, activa AEO recurrente con tu equipo.`,
    cta: 'Activar AEO recurrente',
    ctaAria: 'Escribir a tu equipo de Efeonce para activar AEO recurrente'
  },
  // Teaser/locked GRATIS para clientes sin entitlement (no corre el motor). Cross-sell, sin self-checkout.
  locked: {
    eyebrow: 'AEO — AI Engine Optimization',
    title: 'Descubre cómo te ve la IA',
    body: 'ChatGPT, Gemini, Claude y Perplexity ya responden sobre tu marca. AEO mide qué dicen, en qué motores apareces y dónde te ganan tus competidores.',
    bullets: [
      'Tu presencia en cada motor de IA',
      'Tu share de menciones frente a competidores',
      'Un plan para mejorar tu visibilidad'
    ],
    cta: 'Habla con tu equipo',
    ctaAria: 'Escribir a tu equipo de Efeonce sobre AEO',
    note: 'Sin costo: tu equipo de Efeonce te muestra una primera revisión.'
  },
  // Prompt de primera revisión (trial con cupo pero aún sin informe).
  firstRun: {
    title: 'Aún no generaste tu revisión de este mes',
    body: 'Genera tu primera revisión y mira cómo te ve la IA. Toma unos minutos.'
  },
  // Contacto del equipo (reusa el patrón del workbench: mailto al equipo de Efeonce).
  teamMailto: 'mailto:hola@efeonce.com'
} as const

/**
 * TASK-1247 — Admin Review UI del AEO Grader (gate humano pre-publicación).
 * Copy es-CL (tuteo) de la cola de revisión + reconciler de evidencia + decisión.
 * Surface INTERNA (capability `growth.ai_visibility.report.review`) — nunca client-facing.
 */
export const GH_GROWTH_AI_VISIBILITY_ADMIN_REVIEW = {
  breadcrumb: { admin: 'Admin', growth: 'Growth', grader: 'AEO Grader', review: 'Revisión' },
  pageTitle: 'Revisión de reportes — AI Visibility Grader',
  pageSubtitle: 'Gate humano antes de publicar un diagnóstico a un prospecto.',
  summary: {
    pending: 'Pendientes',
    inReview: 'En revisión',
    highRisk: 'Riesgo alto',
    sla: 'SLA objetivo'
  },
  actions: { refresh: 'Actualizar', export: 'Exportar', savedFilters: 'Filtros guardados' },
  filters: {
    risk: 'Riesgo',
    status: 'Estado',
    engine: 'Motor',
    age: 'Antigüedad',
    search: 'Buscar por marca o reporte…',
    all: 'Todos'
  },
  queue: {
    title: 'Cola de revisión',
    colBrand: 'Marca',
    colStatus: 'Estado',
    colScore: 'Score',
    colRisk: 'Riesgo / Razón',
    colAge: 'Antigüedad',
    colReviewer: 'Revisor',
    colConflict: 'Conflicto',
    unassigned: '—'
  },
  detail: {
    reportId: 'ID reporte',
    generated: 'Generado',
    engineHeader: 'Motores',
    publicViewTitle: 'Vista pública (exacta)',
    publicViewHint: 'Así se mostraría al publicar',
    internalReasonsTitle: 'Razones internas (no públicas)',
    consequenceTitle: 'Consecuencia pública',
    consequenceBody: 'Si se publica, este reporte será visible para el prospecto en el portal.',
    perEngineTitle: 'Presencia por motor',
    perEngineHint: 'Cada motor es un canal distinto — no se promedia.',
    present: 'Presente',
    absent: 'Ausente',
    citations: 'citas',
    citationOne: '1 cita',
    riskLabel: 'Riesgo',
    asOf: 'Medido',
    staleWarning: 'Evidencia desactualizada — los motores cambian seguido.',
    seeEvidence: 'Ver evidencia',
    impact: 'Impacto en score',
    close: 'Cerrar',
    // Runtime (TASK-1247): campos reales del GraderReport
    noScore: 'Sin dato',
    market: 'Mercado',
    category: 'Categoría',
    confidence: 'Confianza',
    evidence: 'Evidencia',
    responsesEvaluated: 'respuestas evaluadas',
    provenanceAsOf: 'Datos al',
    providersSampled: 'Motores consultados',
    loadingReport: 'Cargando evidencia del reporte…',
    reportError: 'No pudimos cargar la evidencia de este reporte.'
  },
  evidence: {
    incompleteTitle: 'Evidencia incompleta',
    incompleteBody: 'Faltan fuentes clave en algunas dimensiones evaluadas.',
    abstainedTitle: 'Datos insuficientes',
    abstainedBody: 'El grader se abstuvo: la evidencia no alcanza para un diagnóstico confiable. No se publica por defecto.'
  },
  decision: {
    rejectReasonLabel: 'Motivo del rechazo (requerido)',
    rejectReasonPlaceholder: 'Selecciona o escribe el motivo del rechazo…',
    rejectReasonRequired: 'Este campo es requerido para rechazar el reporte.',
    approve: 'Aprobar publicación',
    approveHint: 'Publica el reporte tal como está',
    reject: 'Rechazar reporte',
    rejectHint: 'Devuelve el reporte para corrección',
    commandStateTitle: 'Estado del comando',
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    conflict: 'Conflicto',
    history: 'Historial de acciones',
    // Runtime (TASK-1247): estados de la acción gobernada
    approving: 'Aprobando…',
    rejecting: 'Rechazando…',
    actionError: 'No pudimos completar la acción. Intenta de nuevo.',
    approvedFeedback: 'Reporte aprobado y publicado.',
    rejectedFeedback: 'Reporte rechazado y devuelto para corrección.'
  },
  conflict: 'Este reporte ya fue revisado por {reviewer} — actualizando la cola.',
  demo: { label: 'Vista de demostración', queue: 'Cola', loading: 'Cargando', empty: 'Cola vacía', denied: 'Sin acceso' },
  states: {
    loading: 'Cargando la cola de revisión…',
    emptyTitle: 'Sin reportes pendientes',
    emptyBody: 'No hay diagnósticos esperando revisión.',
    errorTitle: 'No pudimos cargar la cola',
    errorBody: 'Ocurrió un problema al traer los reportes pendientes.',
    retry: 'Reintentar',
    permissionTitle: 'Sin acceso a la revisión',
    permissionBody: 'Necesitas el permiso de revisión del AEO Grader. Pídeselo a un administrador.'
  }
} as const
