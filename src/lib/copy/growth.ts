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

/**
 * TASK-1276 — Vista OPERADOR del programa AEO (nodos S8-S12 del EPIC-020): cockpit `/growth/aeo`,
 * detalle por-cliente `/growth/aeo/[organizationId]`, control de estado del Plan AEO (TASK-1275),
 * cross-sell (run operador TASK-1277 + enviar informe/crear Lead TASK-1279) y facet Account 360.
 * Touchpoint INTERNO (operador Growth/Account) → tono operativo claro, es-CL tuteo neutro; los
 * estados del plan son color-independientes (texto + ícono, nunca color solo). Validado con
 * `greenhouse-ux-writing`. Diseño aprobado: mockup Claude Design "AEO Operator View".
 */
export const GH_GROWTH_AEO_OPERATOR = {
  page: {
    breadcrumbRoot: 'Inicio',
    breadcrumbGrowth: 'Growth',
    breadcrumbLeaf: 'AEO',
    cockpitTitle: 'AEO',
    cockpitSubtitle: 'Programa AEO: gestión del plan por cliente y cross-sell con diagnóstico real.',
    detailBreadcrumbAria: 'Ruta de navegación del detalle AEO'
  },
  cockpit: {
    kpiClients: 'Clientes con AEO',
    kpiClientsSub: 'Módulo activo',
    kpiAvgScore: 'Score AEO promedio',
    kpiAvgScoreSub: 'Sobre clientes con medición',
    kpiWithoutScore: 'Sin medición aún',
    kpiWithoutScoreSub: 'Con módulo, sin run listo',
    kpiPlanInProgress: 'Focos en curso',
    kpiPlanInProgressSub: 'Del Plan AEO',
    kpiRunsMonth: 'Runs este mes',
    kpiRunsMonthSub: (sales: number) => `${sales} de venta`,
    tableTitle: 'Clientes del programa',
    tableSubtitle: 'Score, tier y último run por cliente',
    colClient: 'Cliente',
    colTier: 'Tier',
    colScore: 'Score AEO',
    colLastRun: 'Último run',
    colTrend: 'Tendencia',
    colPlan: 'Plan AEO',
    planUntracked: 'Sin seguimiento aún',
    planInProgressLabel: (n: number) => `${n} en curso`,
    planDoneLabel: (n: number) => (n === 1 ? '1 hecho' : `${n} hechos`),
    trendAria: (name: string) => `Tendencia del score de ${name}`,
    filterAll: 'Todos',
    noAeoLabel: 'Sin AEO',
    motionExpansionHint: 'Cliente sin AEO — expansión',
    motionProspectHint: 'Prospecto HubSpot — new business',
    runCta: 'Correr AEO',
    runCtaAria: 'Correr AEO sobre este target',
    headerRunCta: 'Correr AEO',
    searchPlaceholder: 'Buscar cliente…',
    searchEmpty: (query: string) => `Sin resultados para "${query}". Revisa la ortografía o limpia la búsqueda.`,
    openDetailAria: 'Abrir el detalle AEO del cliente',
    scoreNoData: 'Sin medición',
    lastRunNever: 'Sin runs',
    emptyTitle: 'Aún no hay clientes con AEO',
    emptyBody: 'Cuando un cliente tenga el módulo AEO activo, aparece aquí con su score y su plan.',
    errorTitle: 'No pudimos cargar el cockpit',
    errorBody: 'Ocurrió un problema al traer los clientes del programa. Intenta de nuevo.',
    retry: 'Reintentar'
  },
  tier: {
    contracted: 'Contratado',
    trial: 'Trial',
    pilot: 'Piloto',
    none: 'Sin AEO',
    operator: 'Operador · sin tope'
  },
  // Cross-sell (Slice 5): picker de target agrupado por motion comercial + run operador (TASK-1277).
  picker: {
    title: 'Correr AEO',
    subtitle: 'Elige el target — agrupado por motion comercial',
    searchPlaceholder: 'Buscar cliente o prospecto…',
    searchEmpty: (query: string) => `Sin resultados para "${query}".`,
    groupAeo: 'Con AEO',
    groupAeoHint: 'clientes del programa',
    groupExpansion: 'Expansión',
    groupExpansionHint: 'clientes sin AEO',
    groupProspects: 'Prospecto',
    groupProspectsHint: 'HubSpot sincronizado',
    prospectsSearchHint: (n: number) => `Escribe 2+ letras para buscar entre ${n} prospectos`,
    closeAria: 'Cerrar el selector de target',
    footerNote: 'Puerta operador: run sin tope, costo atribuido a ventas.',
    cta: 'Correr AEO',
    ctaFor: (name: string) => `Correr AEO para ${name}`,
    queued: (name: string) => `Run encolado para ${name}. El informe puede tardar unos minutos.`,
    viewReport: 'Ver informe',
    running: (name: string) => `Preparando run del motor para ${name}…`
  },
  run: {
    detailCta: 'Correr AEO',
    detailCtaAria: 'Correr un nuevo diagnóstico AEO para este cliente',
    preparingTitle: 'Run en proceso…',
    preparingBody: 'El motor está midiendo la visibilidad. Esta página se actualiza sola; el informe puede tardar unos minutos.',
    refresh: 'Actualizar ahora',
    errorGeneric: 'No pudimos encolar el run. Intenta de nuevo.',
    errorProfile: 'Esta organización no tiene perfil AEO (falta el sitio web). Complétalo en Account 360.',
    errorCategory: 'Falta resolver la categoría de la marca antes de correr el diagnóstico.',
    errorBusinessModel: 'Falta confirmar el modelo de negocio de la marca antes de correr el diagnóstico.',
    errorDisabled: 'El motor AEO está apagado en este ambiente.',
    errorBusy: 'El motor está ocupado por presupuesto diario. Intenta más tarde.'
  },
  band: {
    domainAria: 'Dominio del sitio',
    lastRunLabel: 'Último run:',
    lastRunNever: 'sin runs',
    viewInAccount360: 'Ver en Account 360',
    orgIdAria: 'Identificador de la organización',
    allowanceRuns: (used: number, cap: number) => `${used}/${cap} runs este mes`
  },
  plan: {
    sectionTitle: 'Estado de ejecución',
    sectionHelp: 'Registra el avance de este foco del Plan AEO.',
    groupAria: 'Cambiar estado del foco',
    status: {
      not_started: 'Sin empezar',
      in_progress: 'En curso',
      blocked: 'Bloqueado',
      done: 'Hecho',
      dismissed: 'Descartado'
    },
    untracked: 'Sin seguimiento aún',
    reasonLabel: 'Motivo',
    reasonRequiredBlocked: 'Bloquear un foco requiere un motivo.',
    reasonRequiredDismissed: 'Descartar un foco requiere un motivo.',
    reasonPlaceholder: 'Ej. fuera del alcance del contrato este trimestre',
    reasonConfirm: 'Guardar estado',
    reasonCancel: 'Cancelar',
    saving: 'Guardando estado…',
    saved: 'Estado guardado.',
    saveError: 'No pudimos guardar el estado. Intenta de nuevo.',
    statusAnnouncement: (statusLabel: string) => `Estado del foco actualizado a ${statusLabel}`,
    updatedBy: (who: string) => `Actualizado por ${who}`,
    partialTitle: 'Plan con seguimiento parcial',
    partialBody: 'Algunos focos del Plan AEO todavía no tienen estado registrado. Se muestran como "sin seguimiento aún".'
  },
  // Enviar informe + abrir oportunidad (Slice 6, nodo S11 — command TASK-1279). El objeto comercial
  // es un LEAD de HubSpot (NUNCA Deal); leadType y base legal se DERIVAN server-side y acá solo se
  // muestran en la confirmación. Prospecto exige consentimiento capturado — NUNCA cold send.
  send: {
    cta: 'Enviar informe + abrir oportunidad',
    ctaAria: 'Enviar el informe AEO por email y abrir una oportunidad comercial',
    ctaDisabledHint: 'El envío está apagado en este ambiente.',
    notPublishedHint: 'Este cliente aún no tiene un informe publicado para enviar.',
    title: 'Enviar informe + abrir oportunidad',
    closeAria: 'Cerrar el envío de informe',
    motionLabel: {
      expansion: 'Cliente · Expansión',
      new_business: 'Prospecto · New business'
    },
    publishedBanner: 'Informe publicado — listo para enviar',
    emailLabel: 'Correo del destinatario',
    emailPlaceholder: 'nombre@empresa.com',
    emailInvalid: 'Ingresa un correo válido (ej. nombre@empresa.com)',
    firstNameLabel: 'Nombre',
    lastNameLabel: 'Apellido',
    namePlaceholder: 'Opcional',
    consentTitle: 'Registra el consentimiento del contacto para enviar',
    consentBody: 'Prospecto sin relación previa: por interés legítimo, nunca envío en frío.',
    consentCheckbox: 'Tengo el consentimiento / interés legítimo registrado',
    consentRefLabel: 'Referencia del consentimiento',
    consentRefPlaceholder: 'Ej. HS-CONSENT-4821',
    consentMissing: 'Registra la referencia del consentimiento antes de continuar.',
    continueCta: 'Continuar',
    backCta: 'Atrás',
    cancelCta: 'Cancelar',
    confirmTitle: 'Confirma la acción',
    confirmSend: (org: string, email: string) => `Enviar el informe AEO de ${org} a ${email}`,
    confirmLead: {
      expansion: 'Abrir oportunidad de expansión · objeto comercial: Lead de HubSpot',
      new_business: 'Abrir oportunidad nueva · objeto comercial: Lead de HubSpot'
    },
    confirmLegal: {
      expansion: 'Base legal derivada: relación de servicio',
      new_business: 'Base legal derivada: interés legítimo'
    },
    confirmNote: 'Queda registrado en el log de envíos con el consentimiento capturado. La acción no es reversible desde aquí.',
    confirmCta: 'Confirmar y enviar',
    sending: 'Enviando informe y abriendo la oportunidad…',
    acceptedTitle: 'Envío en proceso',
    acceptedBody: (email: string) =>
      `El informe saldrá a ${email} y el Lead se creará en HubSpot en unos minutos. Quedó registrado en el log de envíos.`,
    idempotentHint: 'Este envío ya estaba registrado para este destinatario — no se duplica.',
    closeCta: 'Cerrar',
    errorConsent: 'El envío requiere el consentimiento registrado del contacto.',
    errorReportUnavailable: 'No hay un informe publicado para este cliente. Publícalo antes de enviar.',
    errorDisabled: 'El envío está apagado en este ambiente.',
    errorInvalid: 'Revisa el correo del destinatario e intenta de nuevo.',
    errorGeneric: 'No pudimos completar el envío. Intenta de nuevo.'
  },
  facet: {
    title: 'Diagnóstico y Plan AEO',
    body: 'Score de visibilidad en IA, plan por foco y avance del servicio para este cliente.',
    cta: 'Ver detalle AEO',
    ctaAria: 'Abrir el detalle AEO de este cliente en Growth'
  },
  states: {
    deniedTitle: 'No tienes acceso a este cliente',
    deniedBody: 'Tu scope de operador no incluye esta organización. Pide acceso a un administrador de Growth.',
    emptyTitle: 'Sin runs AEO',
    emptyBody: 'Este cliente aún no tiene un diagnóstico AEO listo.',
    preparingTitle: 'El informe se está preparando',
    preparingBody: 'Hay un run en proceso. Vuelve en unos minutos para ver el diagnóstico.',
    errorTitle: 'No pudimos cargar el AEO',
    errorBody: 'Hubo un problema al leer el informe. Intenta de nuevo.',
    retry: 'Reintentar',
    notFoundTitle: 'Organización no encontrada',
    notFoundBody: 'La organización no existe o fue archivada.'
  }
} as const

/**
 * TASK-1340 — Superficie de gobernanza del motor de CTAs (`/growth/ctas`, menú Growth).
 * Copy validado con greenhouse-ux-writing (es-CL tuteo, verbo+objeto, estados honestos).
 * El copy de CAMPAÑA de cada CTA vive en su render contract (data gobernada), no acá.
 */
export const GH_GROWTH_CTA_OPERATOR = {
  title: 'CTAs y popups',
  subtitle: 'Gobernanza del motor de CTAs: inventario, estado y preview del renderer portable.',
  engineFlag: {
    on: 'Motor encendido',
    off: 'Motor apagado en este ambiente',
    offHint:
      'El flag GROWTH_CTA_ENGINE_ENABLED está apagado: las superficies públicas no muestran CTAs y las acciones de lifecycle quedan deshabilitadas. El flip se coordina con el despliegue del renderer.'
  },
  inventory: {
    title: 'Inventario de CTAs',
    columns: {
      cta: 'CTA',
      status: 'Estado',
      placement: 'Ubicación',
      campaign: 'Campaña',
      version: 'Versión',
      actions: 'Acciones'
    },
    emptyTitle: 'Aún no hay CTAs',
    emptyBody: 'Autora el primer CTA vía la API admin o el seed canónico; acá aparecerá su estado.',
    statusLabels: {
      draft: 'Borrador',
      review: 'En revisión',
      published: 'Publicado',
      paused: 'Pausado',
      deprecated: 'Deprecado',
      archived: 'Archivado'
    } as Record<string, string>
  },
  actions: {
    publish: 'Publicar',
    pause: 'Pausar',
    resume: 'Reanudar',
    submitReview: 'Enviar a revisión',
    pauseAria: 'Pausar esta versión publicada (freno de emergencia)',
    resumeAria: 'Reanudar esta versión pausada',
    publishAria: 'Publicar esta versión (deprecia la anterior)',
    confirmPauseTitle: '¿Pausar este CTA?',
    confirmPauseBody: 'La versión publicada deja de mostrarse en las superficies públicas en ~2 minutos. Puedes reanudarla cuando quieras.',
    confirmPublishTitle: '¿Publicar esta versión?',
    confirmPublishBody: 'El snapshot queda inmutable y la versión publicada anterior (si existe) se deprecia.',
    cancel: 'Cancelar',
    success: {
      publish: 'Versión publicada.',
      pause: 'CTA pausado. Deja de mostrarse en ~2 minutos.',
      resume: 'CTA reanudado.',
      submit_review: 'Versión enviada a revisión.'
    } as Record<string, string>,
    errorGeneric: 'No pudimos completar la acción. Intenta de nuevo.',
    errorTransition: 'Esa transición no está permitida desde el estado actual.',
    errorActionNotResolvable: 'La acción del CTA no resuelve: el formulario de destino no está publicado.'
  },
  surfaces: {
    title: 'Surfaces registradas',
    columns: { name: 'Surface', kind: 'Tipo', origins: 'Origins permitidos', embedKey: 'Credencial', status: 'Estado' },
    emptyTitle: 'Sin surfaces',
    emptyBody: 'Registra una surface vía la API admin para autorizar un host.',
    statusLabels: { active: 'Activa', paused: 'Pausada', archived: 'Archivada' } as Record<string, string>
  },
  preview: {
    title: 'Preview del renderer',
    body: 'Así se ve el card en un host público, con fixtures deterministas. La variante visual la elige cada versión de CTA (style_variant).',
    variantLabel: 'Variante',
    variantAria: 'Elegir la variante de preview del renderer',
    densityFull: 'Density full (contenedor ancho)',
    densityCondensed: 'Density condensed (contenedor medio)',
    densityPeek: 'Density peek (contenedor compacto)',
    slideInDemoCta: 'Probar el slide-in en vivo',
    slideInDemoAria: 'Abrir una demo del slide-in interruptivo sobre esta página',
    slideInDemoHint: 'Abre el overlay real (no modal): pruébalo con Escape, cierre y foco. El estado de cierre dura la sesión.'
  },
  // ── TASK-1430 — cockpit operator (master-detail + authoring gobernado) ──
  cockpit: {
    breadcrumbs: { growth: 'Growth', ctas: 'CTAs' },
    subtitle:
      'Autoría, ciclo de vida, superficies y resultados de cada CTA en un solo lugar. Compón por ejes gobernados; la densidad se deriva sola.',
    refresh: 'Actualizar',
    create: 'Crear CTA',
    createAria: 'Crear un CTA nuevo con autoría gobernada',
    summary: {
      published: 'publicados',
      review: 'en revisión',
      draft: 'borradores',
      paused: 'pausados'
    },
    inventory: {
      searchPlaceholder: 'Buscar por nombre, slug o campaña…',
      searchAria: 'Buscar CTAs en el inventario',
      statusFilterAria: 'Filtrar por estado',
      placementFilterAria: 'Filtrar por ubicación',
      allStatuses: 'Todos los estados',
      allPlacements: 'Toda ubicación',
      keyboardHint: '↑↓ para navegar',
      resultOne: 'CTA',
      resultMany: 'CTAs',
      resultFiltered: 'filtrados',
      resultTotal: 'en total',
      listAria: 'Inventario de CTAs',
      noSurface: 'Sin superficie',
      signalConversions: 'Conversiones',
      signalNoData: 'Sin datos',
      trustHint: 'Conversiones server-confirmed · CTR browser',
      emptyFilteredTitle: 'Sin resultados con estos filtros',
      emptyFilteredBody: 'Revisa la búsqueda o limpia los filtros para ver todo el inventario.',
      clearFilters: 'Limpiar filtros',
      errorTitle: 'No pudimos cargar el inventario',
      errorBody: 'La lectura del inventario falló. El detalle y el ciclo de vida no se ven afectados.',
      retry: 'Reintentar'
    },
    empty: {
      title: 'Aún no tienes CTAs',
      body: 'Los CTAs invitan a tu audiencia al siguiente paso —descargar un informe, agendar una demo o retomar una herramienta— sin tocar código ni JSON.',
      cta: 'Crear tu primer CTA',
      asideTitle: 'El detalle aparecerá aquí',
      asideBody: 'Cuando crees tu primer CTA verás aquí su preview con el renderer real, sus resultados y los controles de ciclo de vida.'
    },
    denied: {
      title: 'No tienes acceso a este detalle',
      body: 'Ver y operar CTAs requiere la capability growth.cta.read. Pídele acceso a quien administra Growth.',
      readOnlyHint: 'Tu acceso es de solo lectura: puedes ver inventario y resultados, pero no autorar ni cambiar el ciclo de vida.'
    },
    noSelection: {
      title: 'Selecciona un CTA',
      body: 'Elige un CTA del inventario para ver su detalle, resultados y controles de ciclo de vida.'
    },
    detail: {
      regionAria: 'Detalle del CTA seleccionado',
      loadError: 'No pudimos cargar el detalle. Intenta de nuevo.',
      retry: 'Reintentar',
      edit: 'Editar y previsualizar',
      editAria: 'Editar este CTA como versión nueva y previsualizarla',
      moreAria: 'Más acciones de ciclo de vida',
      versionCurrent: 'actual',
      metaUpdated: 'actualizado',
      openPreview: 'Abrir matriz',
      previewTitle: 'Preview del renderer',
      previewSubtitle: 'Mismo CSS y contrato que producción · densidad derivada',
      diagnosticsNote: 'Estos badges son diagnóstico del cockpit — no llegan al visitante.',
      diag: {
        surface: 'superficie',
        placement: 'ubicación',
        appearance: 'apariencia',
        density: 'densidad',
        densityDerived: 'derivada',
        action: 'acción',
        renderer: 'renderer',
        contract: 'contrato',
        kind: 'intención'
      }
    },
    metrics: {
      title: 'Resultados',
      windowLabel: 'Ventana de 30 días',
      updated: 'actualizado',
      neverMeasured: 'sin eventos aún',
      impressions: 'Impresiones',
      clicks: 'Clics',
      conversions: 'Conversiones',
      ctr: 'CTR',
      conversionRate: 'Tasa de conversión',
      trustBrowser: 'reporte del navegador',
      trustServer: 'confirmada por el servidor',
      deltaVsPrev: 'vs. ventana anterior',
      deltaNew: 'primera ventana',
      rateNoData: 'Sin datos aún',
      coverageUndercounted:
        'Cobertura parcial: el conteo de impresiones empezó después que el de clics, así que las tasas aún no son confiables. Se muestran los conteos.',
      partialTitle: 'Resultados no disponibles',
      partialBody: 'La lectura de resultados no respondió. El ciclo de vida sigue operable.',
      enforcementOn: 'enforcement activo',
      enforcementShadow: 'supresión en shadow',
      conversionTruthHint: 'Solo la conversión confirmada por el servidor cuenta como verdad; el CTR viene del reporte del navegador.'
    },
    kill: {
      title: 'Kill switch gobernado',
      scopeGlobal: 'Global',
      scopeSurface: 'Superficie',
      globalOffDesc: 'Detiene todos los CTAs en todas las superficies al instante, sin redeploy. Requiere growth.cta.pause.',
      globalOnDesc: 'Motor detenido globalmente. Ningún CTA se muestra en ninguna superficie.',
      surfaceOnDesc: 'Superficie detenida: sus visitantes no ven ningún CTA.',
      engage: 'Activar kill switch',
      release: 'Liberar',
      engageConfirmTitle: '¿Detener {scope} con kill switch?',
      engageConfirmBody:
        'La exposición se detiene de inmediato y queda auditada (quién, cuándo y por qué). Se libera cuando tú lo decidas, sin redeploy.',
      releaseConfirmTitle: '¿Liberar el kill switch de {scope}?',
      releaseConfirmBody: 'La exposición se reanuda según el ciclo de vida vigente de cada CTA.',
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'ej. rendimiento bajo el umbral acordado',
      reasonHelper: 'Obligatorio (mínimo 5 caracteres). Queda en la auditoría.',
      auditTitle: 'Auditoría',
      auditEngaged: 'activó',
      auditReleased: 'liberó',
      stateActive: 'Detenido',
      stateInactive: 'Operando',
      affectsCta: 'Este CTA está detenido por el kill switch — no se muestra aunque esté publicado.'
    },
    surfaces: {
      title: 'Superficies y bindings',
      bound: 'Vinculada',
      unbound: 'Sin vincular',
      boundHint: 'La allowlist de la superficie admite este CTA.',
      unboundHint: 'La allowlist de la superficie no incluye este slug. El binding se administra vía la API admin.',
      killed: 'Detenida',
      channelLabel: 'canal'
    },
    targeting: {
      title: 'Segmentación y supresión',
      routes: 'Rutas objetivo',
      excludeRoutes: 'Rutas excluidas',
      noExclusions: 'Sin exclusiones',
      cooldown: 'Descarte',
      cooldownValue: 'Oculta {days} días tras descartar',
      frequencyCap: 'Cap de frecuencia',
      frequencyCapValue: '{max} por ventana de {hours} h',
      afterConversion: 'Tras convertir',
      afterConversionOn: 'Se deja de mostrar',
      afterConversionOff: 'Sigue mostrándose'
    },
    versions: {
      title: 'Historial de versiones',
      current: 'Versión actual',
      publishedAt: 'publicada'
    },
    lifecycle: {
      deprecate: 'Deprecar',
      archive: 'Archivar',
      deprecateConfirmTitle: '¿Deprecar «{name}»?',
      deprecateConfirmBody: 'Deja de estar disponible para publicarse. El historial y los resultados se conservan.',
      archiveConfirmTitle: '¿Archivar «{name}»?',
      archiveConfirmBody: 'Sale del inventario operativo. Esta es la última etapa del ciclo de vida.',
      resumeConfirmTitle: '¿Reanudar «{name}»?',
      resumeConfirmBody: 'La versión pausada vuelve a publicarse y a mostrarse en sus superficies.',
      busyPublish: 'Publicando…',
      busyPause: 'Pausando…',
      busyResume: 'Reanudando…',
      busyGeneric: 'Aplicando…'
    },
    author: {
      titleNew: 'Nuevo CTA',
      titleEdit: 'Editar CTA',
      subtitleNew: 'Autoría gobernada · sin canvas libre',
      subtitleEdit: 'Autoría gobernada · crea una versión nueva',
      dialogAria: 'Autoría de CTA',
      dirtyBadge: 'Cambios sin guardar',
      closeAria: 'Cerrar la autoría',
      draftSummaryTitle: 'Borrador',
      back: 'Atrás',
      next: 'Continuar',
      nextToPreview: 'Ir a vista previa',
      nextToReview: 'Ir a revisión',
      cancel: 'Cancelar',
      submitNew: 'Enviar a revisión',
      submitEdit: 'Guardar y enviar a revisión',
      submitting: 'Enviando…',
      discardTitle: '¿Descartar los cambios?',
      discardBody: 'Tienes cambios sin guardar en este borrador. Si cierras ahora se perderán.',
      discardConfirm: 'Descartar cambios',
      discardCancel: 'Seguir editando',
      stepRailAria: 'Pasos de la autoría',
      steps: {
        intent: { label: 'Intención', hint: 'Tipo de experiencia' },
        placement: { label: 'Ubicación', hint: 'Placement' },
        appearance: { label: 'Apariencia', hint: 'Énfasis' },
        content: { label: 'Contenido', hint: 'Anatomía + asset' },
        action: { label: 'Acción', hint: 'Registro' },
        targeting: { label: 'Segmentación', hint: 'Supresión' },
        preview: { label: 'Vista previa', hint: 'Matriz' },
        review: { label: 'Revisión', hint: 'Checklist' }
      },
      intent: {
        title: 'Intención',
        subtitle: 'Elige la semántica de autoría. Define el checklist de expectativa y evidencia — no genera copy automática.',
        evidenceLabel: 'Evidencia requerida:',
        kinds: {
          report_followup: {
            label: 'Seguimiento de informe',
            desc: 'Retoma a quien vio un informe y ofrece el siguiente paso.',
            evidence: 'Requiere referencia al informe o dato visto.'
          },
          lead_magnet: {
            label: 'Imán de leads',
            desc: 'Ofrece un recurso o diagnóstico a cambio de contacto.',
            evidence: 'Requiere un recurso real y expectativa clara de entrega.'
          },
          tool_continuation: {
            label: 'Continuación de herramienta',
            desc: 'Invita a retomar una tarea o herramienta iniciada.',
            evidence: 'Requiere un destino que retome el estado guardado.'
          },
          meeting: {
            label: 'Reunión',
            desc: 'Agenda una demo, llamada o evento con el equipo.',
            evidence: 'Requiere un destino de agenda válido y gobernado.'
          }
        }
      },
      placement: {
        title: 'Ubicación',
        subtitle: 'Solo placements soportados por el renderer. El nivel de interrupción define las defensas obligatorias.',
        interruptiveBadge: 'interruptivo',
        kinds: {
          embedded: { label: 'Embedded', desc: 'Vive dentro de un dock del host (ej. el bookend de un informe). No interrumpe.' },
          inline_banner: { label: 'Banner inline', desc: 'Se inserta en el flujo del contenido. No interrumpe.' },
          sticky_banner: { label: 'Banner fijo', desc: 'Barra persistente en la superficie. Interruptivo: exige defensas.' },
          slide_in: { label: 'Slide-in', desc: 'Entra desde una esquina sin bloquear la lectura. Interruptivo: exige defensas.' },
          popup_modal: { label: 'Modal', desc: 'Centrado sobre el contenido. Máxima interrupción: exige defensas.' },
          floating_button: { label: 'Botón flotante', desc: 'Botón persistente en una esquina. No interrumpe.' }
        }
      },
      appearance: {
        title: 'Apariencia',
        subtitle: 'Énfasis y contraste dentro de tokens aprobados. Sin color picker, sin CSS, sin control de spacing.',
        kinds: {
          default: { label: 'Default', desc: 'Énfasis equilibrado y contraste estándar.' },
          spotlight: { label: 'Spotlight', desc: 'Máximo énfasis: acento y elevación de marca.' },
          minimal: { label: 'Minimal', desc: 'Discreto y editorial. Ideal para placements inline.' }
        }
      },
      content: {
        title: 'Contenido',
        subtitle: 'La anatomía del CTA con límites y guía contextual. Se refleja en vivo en la vista previa.',
        name: 'Nombre interno',
        namePlaceholder: 'ej. Descarga informe SEO Q2',
        nameHelper: 'Identifica el CTA en el inventario. No lo ve el visitante.',
        eyebrow: 'Eyebrow (opcional)',
        eyebrowPlaceholder: 'ej. Informe listo',
        headline: 'Headline',
        headlinePlaceholder: 'ej. Tu informe SEO del Q2 ya está disponible',
        headlineHelper: 'Debe sobrevivir en densidad peek. Sé concreto y honesto con la promesa.',
        body: 'Cuerpo (opcional)',
        bodyPlaceholder: 'Explica el valor en una frase.',
        ctaLabel: 'Label del botón',
        ctaLabelPlaceholder: 'ej. Descargar informe',
        dismissLabel: 'Label de descarte',
        dismissLabelPlaceholder: 'ej. Ahora no',
        footnote: 'Footnote (opcional)',
        footnotePlaceholder: 'ej. PDF · 14 páginas · sin costo',
        assetTitle: 'Asset visual',
        assetDesc: 'Referencia gobernada; nunca texto esencial embebido en la imagen.',
        assetPresent: 'Con referencia',
        assetNone: 'Sin asset',
        assetRefLabel: 'Referencia del asset',
        assetRefPlaceholder: 'ej. asset://informes/seo-q2'
      },
      action: {
        title: 'Acción',
        subtitle: 'Las opciones y campos vienen del registro de acciones. El cockpit no mantiene un enum paralelo.',
        kindLabel: 'Tipo de acción',
        expectationLabel: 'Expectativa de destino:',
        fieldHelper: 'Se valida server-side; la integridad label ↔ acción se revisa antes de publicar.',
        newContextLabel: 'Abrir en pestaña nueva',
        newContextHelper: 'Solo para destinos externos. El visitante lo verá anunciado por accesibilidad.',
        kinds: {
          open_growth_form: {
            label: 'Abrir formulario',
            expectation: 'Monta el formulario gobernado de Growth sin salir de la página.',
            field: 'Referencia del formulario',
            placeholder: 'ej. ai-visibility-grader'
          },
          link_url: {
            label: 'Ir a una URL',
            expectation: 'Navega a una ruta propia o una URL https gobernada.',
            field: 'URL o ruta',
            placeholder: 'ej. /recursos/guia-pricing'
          },
          open_think_tool: {
            label: 'Abrir herramienta Think',
            expectation: 'Lleva a una herramienta del hub Think (el motor pone el host).',
            field: 'Ruta de la herramienta',
            placeholder: 'ej. /brand-visibility'
          },
          book_meeting: {
            label: 'Agendar reunión',
            expectation: 'Abre el calendario gobernado para agendar.',
            field: 'URL del agendador',
            placeholder: 'ej. https://meetings.hubspot.com/…'
          }
        } as Record<string, { label: string; expectation: string; field: string; placeholder: string }>
      },
      targeting: {
        title: 'Segmentación y supresión',
        subtitle: 'Consume los contratos canónicos. Un placement interruptivo no avanza sin postura de supresión válida.',
        interruptiveWarning:
          'Este placement es interruptivo: exige cap de frecuencia, respeto al descarte y postura de kill switch para pasar a revisión.',
        routes: 'Rutas objetivo',
        routesHelper: 'Globs separados por coma. /** = todas las rutas de la superficie.',
        excludeRoutes: 'Rutas excluidas',
        excludeRoutesHelper: 'Opcional. El CTA nunca aparece en estas rutas.',
        cooldownDays: 'Descarte: días de silencio',
        cooldownHelper: 'Tras descartar, el CTA se oculta esta cantidad de días.',
        maxImpressions: 'Máx. impresiones por ventana',
        windowHours: 'Ventana (horas)',
        afterConversion: 'Dejar de mostrar tras convertir',
        afterConversionDesc: 'Con la conversión confirmada server-side, el CTA se retira solo.'
      },
      preview: {
        title: 'Vista previa',
        subtitle: 'El renderer canónico bajo harnesses de host, contenedor y preferencia. Cobertura pairwise + casos frontera, no todo el producto cartesiano.',
        hostLabel: 'Superficie (host)',
        hostThink: 'Think',
        hostWordpress: 'WordPress',
        themeLabel: 'Esquema',
        themeLight: 'Claro',
        themeDark: 'Oscuro',
        contentLabel: 'Contenido',
        contentNominal: 'Nominal',
        contentLong: 'Largo',
        contentMinimal: 'Mínimo',
        assetLabel: 'Asset',
        assetPresent: 'Con referencia',
        assetMissing: 'Sin asset',
        widthLabel: 'Ancho del contenedor',
        widthDensityPrefix: 'densidad',
        widthHint: 'La densidad es un resultado del renderer, nunca un override de autoría. Muévela para ver el morph full → condensed → peek.',
        presetFull: 'Full',
        presetCondensed: 'Condensed',
        presetPeek: 'Peek',
        interactHint: 'El preview es interactivo e inerte: haz clic en el botón para ver pending/formulario sin salir del portal.',
        remount: 'Remontar',
        focusPrimary: 'Enfocar botón',
        simulateFail: 'Simular fallo de preview',
        restoreRenderer: 'Restaurar renderer',
        degradedTitle: 'El renderer canónico no montó',
        degradedBody: 'No podemos probar paridad con producción. La revisión queda bloqueada hasta resolverlo.',
        failClosedNote: 'Ante un error real, el visitante no ve nada (fail-closed): jamás un card roto.',
        matrixTitle: 'Casos frontera (pairwise)',
        matrixAria: 'Matriz de casos frontera del preview',
        badgesNote: 'Estos badges son diagnóstico del cockpit — no llegan al visitante.',
        suppressedEvidenceTitle: 'No se muestra',
        suppressedEvidenceBody: 'Suprimido por cap de frecuencia o descarte reciente. Evidencia read-only del motor.',
        failClosedTitle: 'El renderer no montó este contrato (fail-closed)',
        failClosedBody:
          'La acción no resuelve un destino gobernado o el contrato no es válido: el visitante no vería nada. Corrige la acción en una versión nueva.'
      },
      review: {
        title: 'Revisión',
        subtitle: 'Contrato, superficie, accesibilidad, copy ↔ acción, supresión y paridad antes de enviar a revisión.',
        readyTitle: 'Listo para enviar a revisión',
        readyBody: 'Todas las comprobaciones de paridad y gobierno pasan.',
        blockedOne: 'bloqueo por resolver',
        blockedMany: 'bloqueos por resolver',
        blockedBody: 'Corrige los puntos marcados; el envío está deshabilitado.',
        serverNote: 'El resultado final lo confirma el servidor al enviar: acá no hay verdad optimista.',
        checks: {
          action: {
            label: 'Acción registrada y con destino',
            ok: 'La acción es válida en el registro y tiene destino definido.',
            fail: 'Selecciona una acción del registro y completa su destino en el paso Acción.'
          },
          copyMatch: {
            label: 'El copy coincide con la acción',
            ok: 'El label del botón coincide con lo que hace la acción.',
            fail: 'El label promete algo distinto a lo que hace la acción «{action}». Alinea label ↔ acción.'
          },
          interruptive: {
            label: 'Defensas de interrupción',
            ok: 'Cap de frecuencia, respeto al descarte y postura de kill switch configurados.',
            okNotNeeded: 'Placement no interruptivo: sin requisito de supresión.',
            fail: 'Un placement interruptivo no pasa a revisión sin cap, descarte y kill switch. Complétalos en Segmentación.'
          },
          anatomy: {
            label: 'Anatomía sobrevive toda densidad',
            ok: 'Headline, acción y descarte permanecen en full → condensed → peek.',
            fail: 'Falta headline, label de acción o label de descarte para las densidades compactas.'
          },
          asset: {
            label: 'Asset y fallback',
            ok: 'El asset tiene referencia gobernada o la anatomía no lo requiere.',
            fail: 'Un imán de leads necesita una referencia de asset real; sin ella la promesa queda coja.'
          },
          limits: {
            label: 'Límites de copy',
            ok: 'Todos los campos están dentro de sus límites.',
            fail: 'Hay campos sobre el límite: {fields}.'
          },
          parity: {
            label: 'Paridad de preview',
            ok: 'El preview monta el renderer canónico; sin drift con el contrato público.',
            fail: 'El harness no pudo montar el renderer canónico; no se puede probar paridad con producción.'
          }
        }
      }
    },
    toasts: {
      created: 'CTA enviado a revisión. Publícalo desde el detalle cuando lo apruebes.',
      newVersion: 'Versión nueva enviada a revisión, server-confirmed.',
      refreshed: 'Lecturas canónicas al día.',
      killEngaged: 'Kill switch activado. La exposición se detuvo.',
      killReleased: 'Kill switch liberado. La exposición se reanuda según el ciclo de vida.',
      invalidInput: 'El borrador tiene campos inválidos: {details}.'
    }
  }
} as const
