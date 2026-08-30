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
    samplingNote: 'Medición sobre una muestra de respuestas de IA, no un monitoreo continuo.',
    viewSeo: 'Ver SEO'
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
    subtitle: 'Autoría, ciclo de vida, superficies y resultados del motor de CTAs.',
    refresh: 'Actualizar',
    create: 'Crear CTA',
    createAria: 'Crear un CTA nuevo con autoría gobernada',
    summary: {
      published: 'publicados',
      review: 'en revisión',
      draft: 'borradores',
      paused: 'pausados',
      singular: {
        published: 'publicado',
        review: 'en revisión',
        draft: 'borrador',
        paused: 'pausado'
      }
    },
    inventory: {
      searchLabel: 'Buscar CTAs',
      searchPlaceholder: 'Buscar por nombre, slug o campaña…',
      searchAria: 'Buscar CTAs en el inventario',
      statusFilterLabel: 'Estado',
      statusFilterAria: 'Filtrar por estado',
      placementFilterLabel: 'Ubicación',
      placementFilterAria: 'Filtrar por ubicación',
      allStatuses: 'Todos los estados',
      allPlacements: 'Toda ubicación',
      keyboardHint: '↑↓ para navegar',
      summaryCount: (count: number) => `${count} ${count === 1 ? 'CTA en inventario' : 'CTAs en inventario'}`,
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
      closeAria: 'Cerrar el detalle del CTA',
      loadError: 'No pudimos cargar el detalle. Intenta de nuevo.',
      retry: 'Reintentar',
      edit: 'Editar y previsualizar',
      editAria: 'Editar este CTA como versión nueva y previsualizarla',
      moreAria: 'Más acciones de ciclo de vida',
      lifecycleBarAria: 'Acciones de ciclo de vida del CTA',
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
      coverageAligned:
        'Los conteos cubren toda la ventana; el CTR y la tasa se calculan desde {date}, cuando empezó el conteo de impresiones (ventana alineada, sin comparación previa aún).',
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
            desc: 'Agenda una conversación de 30 minutos con el equipo de Efeonce.',
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
            label: 'Abrir agenda externa',
            expectation: 'Abre una agenda externa para elegir fecha y hora.',
            field: 'URL del agendador',
            placeholder: 'ej. https://meetings.hubspot.com/…'
          },
          open_meeting_scheduler: {
            label: 'Abrir agenda integrada',
            expectation: 'Muestra una agenda adaptativa sin sacar al visitante de la página.',
            field: 'Surface de reuniones',
            placeholder: 'ej. efeonce-public-site',
            secondaryField: 'Scheduler key',
            secondaryPlaceholder: 'ej. efeonce-discovery-30',
            secondaryHelper: 'Ambos identificadores deben tener un binding activo; no se exponen IDs del proveedor.'
          }
        } as Record<string, { label: string; expectation: string; field: string; placeholder: string; secondaryField?: string; secondaryPlaceholder?: string; secondaryHelper?: string }>
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

/**
 * Growth · SEO — Overview cockpit microcopy (TASK-1306, EPIC-022).
 *
 * Copy reusable es-CL (tuteo) del cockpit `/admin/growth/seo`: KPIs norte, curva
 * de visibilidad, salud del sitio, movers, cross-link AEO y la matriz completa de
 * estados honestos (§10.5 del arch doc).
 *
 * Reglas de honestidad que este copy codifica y NO se pueden ablandar:
 * - Sin Search Console conectado NO hay panel: el estado es un empty accionable,
 *   nunca ceros fantasma (un 0 dice "medimos y dio cero"; la verdad es "no medimos").
 * - Medido (GSC, ●) y estimado (DataForSEO, ◑) se nombran distinto SIEMPRE y nunca
 *   se promedian. Un slot que no resuelve dice "Pendiente" + razón, nunca 0 ni NaN.
 * - La posición tiene semántica INVERTIDA: bajar de número es mejorar. El copy lo
 *   dice explícito en el tooltip y en el aria-label, no lo deja al color de la flecha.
 * - SEO y AEO NUNCA se funden en un score único (boundary §1.1): rankear #1 y no ser
 *   citado por la IA es una señal legítima, no un bug que haya que promediar.
 *
 * Validado con la skill `greenhouse-ux-writing`: tuteo es-CL, sentence case, número
 * nunca sin contexto, error = qué pasó + cómo se arregla, sin blame al usuario.
 */
export const GH_GROWTH_SEO_OVERVIEW = {
  pageTitle: 'Search Visibility · SEO',
  pageSubtitle: 'Salud de búsqueda del Space: qué se mide, qué se estima y qué necesita atención.',
  sectionTitle: 'Search Visibility',
  breadcrumbSection: 'Search Visibility',

  tabs: {
    overview: 'Resumen',
    performance: 'Rendimiento',
    keywords: 'Keywords',
    audit: 'Auditoría',
    unavailableHint: 'Disponible próximamente'
  },

  toolbar: {
    spaceLabel: 'Space',
    spacePlaceholder: 'Elige un Space',
    rangeLabel: 'Período',
    periodLabel: 'Últimos {days} días',
    rangeOptions: {
      '7': 'Últimos 7 días',
      '28': 'Últimos 28 días',
      '90': 'Últimos 90 días',
      '180': 'Últimos 180 días',
      '365': 'Últimos 12 meses'
    },
    refresh: 'Actualizar',
    refreshPending: 'Actualizando…',
    // El botón relee snapshots ya materializados: NO dispara un crawl nuevo.
    refreshHint: 'Relee los últimos datos guardados. No dispara un análisis nuevo.',
    freshness: 'Search Console: datos hasta {date}',
    freshnessUnknown: 'Search Console: sin fecha de corte disponible'
  },

  legend: {
    measured: 'Medido · GSC',
    measuredHint: 'Dato de Search Console: lo que Google registró de tu sitio.',
    estimated: 'Estimado · DataForSEO',
    estimatedHint: 'Dato de proveedor externo: una estimación de mercado, no tu dato medido.',
    ariaLabel: 'Leyenda de origen de los datos: medido y estimado'
  },

  kpis: {
    clicks: {
      title: 'Clics',
      tooltip: 'Veces que alguien llegó a tu sitio desde la búsqueda en el período.'
    },
    impressions: {
      title: 'Impresiones',
      tooltip: 'Veces que tu sitio apareció en resultados de búsqueda en el período.'
    },
    position: {
      title: 'Posición promedio',
      // La inversión se explica en palabras, no sólo con el color de la flecha.
      tooltip: 'Posición promedio ponderada por impresiones. Más bajo es mejor: pasar de 8 a 3 es una mejora.',
      ariaImprovement: 'Mejora: la posición bajó de {from} a {to}, y una posición más baja es mejor.',
      ariaDecline: 'Retroceso: la posición subió de {from} a {to}, y una posición más alta es peor.'
    },
    ctr: {
      title: 'CTR',
      tooltip: 'Porcentaje de impresiones que terminaron en clic.'
    },
    comparison: 'vs. período anterior',
    noComparison: 'Primer período con datos'
  },

  evolution: {
    title: 'Evolución de visibilidad',
    subtitle: 'Clics medidos y posición promedio en el tiempo. En posición, más abajo es mejor.',
    clicksSeries: 'Clics',
    positionSeries: 'Posición promedio',
    showTable: 'Ver tabla de datos',
    hideTable: 'Ocultar tabla de datos',
    tableCaption: 'Clics y posición promedio por fecha',
    tableDateHeader: 'Fecha',
    ariaLabel:
      'Gráfico de evolución de visibilidad. Muestra clics medidos y posición media por fecha; en el eje de posición, 1 es lo mejor y está arriba.'
  },

  health: {
    title: 'Salud del sitio',
    subtitle: 'Resultado de la última auditoría técnica.',
    scoreLabel: 'Puntaje de salud',
    findingsLabel: 'Hallazgos por severidad',
    cta: 'Ver auditoría',
    lastRun: 'Última auditoría: {date}',
    severity: {
      critical: 'Críticos',
      warning: 'Avisos',
      notice: 'Menores'
    },
    scoreAria: 'Salud del sitio: {score} de 100'
  },

  movers: {
    title: 'Movimientos de la semana',
    subtitle: 'Cambios de posición de 5 o más frente a la semana anterior.',
    gained: 'Subieron',
    lost: 'Bajaron',
    cta: 'Ver rendimiento',
    positionsUp: 'Subió {n} posiciones: de {from} a {to}',
    positionsDown: 'Bajó {n} posiciones: de {from} a {to}',
    emptyTitle: 'Sin movimientos relevantes',
    emptyDescription: 'Ninguna keyword cambió 5 posiciones o más esta semana.'
  },

  aeoGap: {
    title: 'Rankean pero la IA no las cita',
    // Copy deliberadamente de SEÑAL, no de score fusionado (boundary §1.1).
    subtitle:
      'Keywords donde tu sitio rankea bien en Google pero no aparece citado en respuestas de IA. Son dos motores distintos: no se promedian.',
    cta: 'Ver AEO Grader',
    countLabel: '{n} keywords con esta señal',
    noneTitle: 'Sin brecha detectada',
    noneDescription: 'Donde rankeas, la IA también te está citando.'
  },

  states: {
    loading: 'Cargando panel SEO…',

    // Sin GSC: el CTA es conectar. NUNCA renderizar 0 en los KPIs acá.
    emptyNoGsc: {
      title: 'Conecta Search Console para ver el panel',
      description:
        'Los KPIs de este cockpit salen de datos medidos por Google. Sin la conexión no hay nada que medir todavía.',
      cta: 'Conectar Search Console'
    },

    emptyNoSnapshots: {
      title: 'Aún no hay datos históricos',
      description:
        'La conexión está activa, pero todavía no se guardó ningún día de datos. La captura diaria los irá llenando.',
      cta: 'Ver estado de sincronización'
    },

    error: {
      title: 'No pudimos cargar el panel SEO',
      description: 'Puede ser algo temporal de nuestro lado. Intenta de nuevo en unos minutos.',
      cta: 'Reintentar'
    },

    denied: {
      title: 'No tienes acceso al módulo SEO',
      // Sin CTA de reintentar: la causa es estructural, reintentar no la resuelve.
      description: 'Pídele a un administrador que te habilite el módulo SEO para este Space.'
    },

    degradedProviderDown: {
      title: 'Mostrando solo datos medidos',
      description:
        'El proveedor de datos estimados no respondió. Los clics, impresiones y posición de Search Console siguen siendo válidos; lo estimado quedó pendiente.'
    },

    pending: 'Pendiente',
    pendingReason: 'Pendiente: {reason}',
    pendingReasons: {
      disabled: 'el módulo no está habilitado para este Space',
      not_connected: 'falta conectar la fuente de datos',
      token_unhealthy: 'la conexión necesita reautorizarse',
      query_failed: 'la consulta al proveedor falló',
      no_data: 'todavía no hay datos capturados'
    },

    spaceUpdated: 'Panel de {space} actualizado'
  }
} as const

/**
 * TASK-1310 — Portal cliente · SEO + Search Visibility 360.
 *
 * Copy es-CL (tuteo) para las tres direcciones visuales de la familia: dashboard narrativo,
 * quadrant ortogonal e informe editorial. Los estados no convierten ausencia de evidencia en
 * un cero y el lenguaje mantiene SEO/AEO como lentes separadas.
 */
export const GH_GROWTH_SEO_CLIENT = {
  page: {
    breadcrumbRoot: 'Inicio',
    breadcrumbLeaf: 'SEO',
    eyebrow: 'Search Visibility 360',
    title: 'SEO — Visibilidad en búsqueda',
    description: 'Tu lectura de búsqueda combina posición medida, cobertura observada y visibilidad IA sin mezclar fuentes.',
    asOf: (date: string) => `Search Console · corte ${date}`,
    asOfUnknown: 'Search Console · sin fecha de corte',
    measured: 'Search Console · medido',
    estimated: 'Seguimiento de posición · estimado',
    viewReport: 'Ver informe',
    viewAeo: 'Ver detalle de AEO',
    reportTitle: 'Informe de visibilidad en búsqueda',
    reportDownload: 'Imprimir / guardar PDF',
    reportDate: (date: string) => `Fecha de corte: ${date}`
  },
  navigator: {
    ariaLabel: 'Navegador de visibilidad SEO',
    summary: 'Resumen',
    evolution: 'Evolución',
    quadrant: 'SEO × AEO',
    reportHint: 'Informe presentable'
  },
  summary: {
    eyebrow: 'Lectura ejecutiva',
    leadTitle: 'Aún no hay una posición media para leer',
    title: 'Tu visibilidad orgánica tiene una historia que leer',
    titleWithPosition: (position: string) => `Posición media ${position} con señales SEO × AEO por revisar`,
    helper: 'Primero mostramos la señal medida. Luego separamos cobertura, tendencia y citabilidad para decidir qué mover sin fabricar un score único.',
    positionLabel: 'Posición media',
    keywordsLabel: 'Keywords medidas',
    pageOneLabel: 'En primera página',
    opportunityLabel: 'Señales de oportunidad',
    positionSignal: 'Rendimiento medido',
    keywordsSignal: 'Keywords medidas',
    pageOneSignal: 'Primera página',
    opportunitySignal: 'Señales a revisar',
    noData: 'Sin dato',
    positionHint: 'Más bajo es mejor: pasar de 8 a 3 es una mejora.',
    pageOneHint: 'Keywords con posición 10 o mejor en la ventana medida.',
    opportunityHint: 'Datos del mapa de visibilidad; no se mezclan con Search Console.',
    measuredHint: 'Search Console · datos medidos; los huecos quedan visibles.',
    coverageLabel: 'Cobertura de primera página',
    coverage: (shown: number, total: number) => `${shown} de ${total} keywords están en posición 10 o mejor.`,
    ariaSignals: 'Señales principales de visibilidad SEO',
    nextBestAction: 'Qué revisar ahora',
    actionPosition: 'Mantener keywords fuertes y detectar caídas tempranas.',
    actionCoverage: 'Ampliar la muestra para leer tendencia con más confianza.',
    actionAeo: 'Cruzar las keywords con la visibilidad IA vigente del dominio.'
  },
  evolution: {
    title: 'Cobertura de seguimiento',
    subtitle: 'La posición 1 aparece arriba. Si la muestra es escasa, mostramos cortes observados antes de sugerir una tendencia.',
    coverage: (measured: number, requested: number) => `${measured} de ${requested} días con medición`,
    observedScope: (chartDays: number, measured: number, requested: number) =>
      `${chartDays} días visibles en la línea; ${measured} de ${requested} días tienen alguna medición. Los huecos quedan visibles.`,
    source: 'Fuente: seguimiento de posición · los huecos quedan visibles.',
    chartStageLabel: 'Cortes observados',
    latestLabel: 'Última medición',
    bestPositionLabel: 'Mejor posición observada',
    bestPosition: (keyword: string, position: string) => `${keyword} · posición ${position}`,
    coverageProgress: (measured: number, requested: number) => `${measured} de ${requested} días`,
    emptyTitle: 'Aún no hay evolución para mostrar',
    emptyDescription: 'Cuando se capture más de una posición, aquí podrás leer la tendencia sin interpolaciones.',
    aria: 'Evolución de posiciones SEO. La posición 1 es la mejor y está arriba.',
    ariaKeywords: 'Keywords comparadas en la evolución SEO',
    ariaTable: 'Datos de evolución de posiciones',
    tableDateHeader: 'Fecha',
    tableScrollHint: 'Desliza horizontalmente para revisar todas las keywords.',
    tableLabel: 'Ver datos de la evolución',
    hideTableLabel: 'Ocultar datos de la evolución',
    printMeasurementsHeader: 'Mediciones por keyword',
    noMeasurement: 'Sin medición en este día.',
    sparseTitle: 'Evidencia inicial, no tendencia final',
    sparseNote: (measured: number, requested: number) =>
      `Muestra corta: ${measured} de ${requested} días tienen medición. Úsalo como evidencia inicial, no como tendencia final.`,
    featuredNote: (shown: number, total: number) =>
      total > shown
        ? `Mostrando ${shown} keywords destacadas de ${total}. Abre los datos para revisar la serie completa.`
        : `Mostrando las ${total} keywords medidas.`
  },
  quadrant: {
    eyebrow: 'Mapa SEO × AEO',
    title: 'Prioridad de visibilidad',
    subtitle: 'Dónde ya rankeas y cómo se cruza cada keyword con la visibilidad IA vigente del dominio.',
    xAxis: 'AEO · visibilidad IA del dominio',
    yAxis: 'SEO · posición orgánica',
    xHigh: 'Mayor visibilidad IA',
    xLow: 'Menor visibilidad IA',
    yHigh: 'Mejor posición SEO',
    yLow: 'Menor posición SEO',
    domain: 'Lectura del dominio',
    domainQuadrant: (label: string) => `Lectura dominante: ${label}`,
    pointCount: (count: number) => `${count} keywords medidas`,
    measured: 'Cada punto representa una keyword SEO cruzada con el score AEO vigente del dominio.',
    orthogonal: 'SEO y AEO son ejes distintos; en esta versión el eje AEO es del dominio, no de cada keyword.',
    granularityLabel: 'AEO por dominio',
    granularityHint: 'Las keywords aún no tienen citabilidad propia medida; se cruzan contra el último score AEO reportable del dominio.',
    distributionTitle: 'Distribución de señales',
    dominantInsight: (label: string, count: number, total: number) => `${count} de ${total} señales caen en ${label}.`,
    dominantAction: {
      dominante: 'Defiende esta posición con frescura, enlaces internos y pruebas actualizadas.',
      riesgo: 'Prioriza contenido citable: rankeas, pero el dominio todavía no muestra una señal AEO fuerte.',
      oportunidad: 'Convierte visibilidad IA del dominio en posición orgánica con contenido y enlaces internos.',
      invisible: 'Construye la base: intención, entidad, contenido recuperable y medición.'
    } as const,
    chartStageLabel: 'Mapa de oportunidad por keyword',
    tableScrollHint: 'Desliza horizontalmente para revisar el detalle completo.',
    tableExcerpt: (shown: number, total: number) =>
      total > shown ? `Mostrando ${shown} señales prioritarias de ${total}.` : `Mostrando las ${total} señales medidas.`,
    tableShowAll: (total: number) => `Ver las ${total} keywords`,
    tableHideAll: 'Mostrar solo señales prioritarias',
    tableKeyword: 'Keyword',
    tableSeo: 'SEO',
    tableAeo: 'AEO dominio',
    tableReading: 'Lectura',
    ariaLegend: 'Leyenda del mapa SEO por estado',
    ariaTable: 'Detalle de keywords del mapa SEO por visibilidad IA del dominio',
    states: {
      noAeoTitle: 'Falta la mitad IA de esta lectura',
      noAeoDescription: 'Tu SEO medido está disponible. Cuando exista un score AEO reportable del dominio, el mapa mostrará ambos ejes.',
      noSeoTitle: 'Aún no hay SEO medido para cruzar',
      noSeoDescription: 'Conecta Search Console y deja que la captura construya la primera mitad del mapa.',
      emptyTitle: 'Aún no hay puntos para el mapa',
      emptyDescription: 'El mapa aparece cuando existan datos medidos en SEO y un score AEO reportable del dominio.',
      errorTitle: 'No pudimos cargar el mapa',
      errorDescription: 'Intenta de nuevo en unos minutos.'
    },
    labels: {
      dominante: 'Dominante',
      riesgo: 'Riesgo',
      oportunidad: 'Oportunidad',
      invisible: 'Invisible'
    } as const
  },
  report: {
    eyebrow: 'Lectura ejecutiva',
    title: 'Informe de visibilidad en búsqueda',
    summary: 'Una lectura presentable de tu presencia orgánica y su relación con la visibilidad IA del dominio.',
    methodology: 'Proveniencia y metodología',
    methodologyBody: 'Los datos SEO provienen de Search Console y seguimiento de posición. El eje AEO usa el último score reportable del dominio; se muestra separado del SEO y no se promedia.',
    summaryAria: 'Resumen de métricas SEO',
    quadrantTitle: 'SEO × AEO — posicionamiento estratégico',
    evolutionTitle: 'Evolución de posiciones',
    reportStatusReady: 'Lectura completa',
    reportStatusPartial: 'Lectura parcial',
    metricPosition: 'Posición media',
    metricKeywords: 'Keywords medidas',
    metricPageOne: 'En primera página',
    metricSignals: 'Señales a revisar',
    metricPositionSignal: 'Rendimiento',
    metricKeywordsSignal: 'Base medida',
    metricPageOneSignal: 'Cobertura',
    metricSignalsSignal: 'Atención',
    metricPositionHint: 'Más bajo es mejor.',
    metricKeywordsHint: 'Search Console y seguimiento declarado.',
    metricPageOneHint: 'Posición 10 o mejor.',
    metricSignalsHint: 'SEO × AEO, sin score fusionado.',
    reportMasthead: 'Informe client-safe',
    reportReadout: 'La posición orgánica y la citabilidad en IA se leen como fuentes distintas, sin fabricar un score único.',
    reportFeaturedSignals: (shown: number, total: number) =>
      total > shown ? `Se muestran ${shown} señales destacadas de ${total}.` : `Se muestran las ${total} señales medidas.`,
    reportFullDetail: 'El detalle completo permanece disponible en el dashboard para exploración.',
    coverage: 'Cobertura client-safe, sin datos crudos de proveedor.',
    emptyTitle: 'Tu informe todavía está tomando forma',
    emptyDescription: 'Cuando exista una medición suficiente, aquí aparecerá una lectura completa y presentable.',
    errorTitle: 'No pudimos preparar tu informe',
    errorDescription: 'Intenta de nuevo en unos minutos.'
  },
  states: {
    lockedTitle: 'SEO no está activo en tu plan',
    lockedDescription: 'Tu equipo de Efeonce puede mostrarte cómo activar esta lectura de visibilidad.',
    lockedCta: 'Hablar con tu equipo',
    noOrganizationTitle: 'No encontramos una organización para esta vista',
    noOrganizationDescription: 'Tu cuenta aún no tiene un Space client-scoped asociado.',
    noGscTitle: 'Conecta Search Console para ver tu visibilidad',
    noGscDescription: 'La lectura SEO comienza con datos medidos por Google. Sin la conexión, no mostramos ceros ni estimaciones disfrazadas.',
    noGscCta: 'Conectar Search Console',
    noSnapshotsTitle: 'Aún no hay datos históricos',
    noSnapshotsDescription: 'La conexión está activa, pero la captura diaria todavía no guardó un día para tu organización.',
    errorTitle: 'No pudimos cargar tu SEO',
    errorDescription: 'Puede ser algo temporal. Intenta de nuevo en unos minutos.',
    retry: 'Reintentar',
    loading: 'Cargando tu visibilidad SEO…'
  }
} as const

/**
 * TASK-1307 — copy de la pantalla ancla `/admin/growth/seo/performance` (tab Rendimiento).
 *
 * Tres decisiones de contenido que atraviesan todo el bloque:
 *
 * 1. **La inversión de posición se dice con PALABRAS**, no sólo con el eje ni con el color
 *    de una flecha. "Más abajo es mejor" aparece en el subtítulo visible del chart, en el
 *    tooltip de la columna y en el `aria-label`. Un operador que llega de Semrush lo da por
 *    hecho; uno que llega de un reporte de tráfico, no.
 * 2. **La fuente se nombra en cada lectura** (● medido / ◑ estimado). No es decoración
 *    legal: la posición exacta de DataForSEO y la posición promedio de Search Console son
 *    números distintos que responden preguntas distintas, y el módulo tiene prohibido
 *    promediarlos. Si la pantalla no dice cuál está mostrando, el operador los mezcla.
 * 3. **Un hueco se llama "Pendiente", nunca 0.** Posición 0 no existe y "0 clics" afirma
 *    que apareciste y nadie hizo clic. Todo el copy de vacío evita el cero fantasma.
 */
export const GH_GROWTH_SEO_PERFORMANCE = {
  pageTitle: 'Rendimiento',
  pageSubtitle: 'Cómo evoluciona en el tiempo el conjunto de URLs o keywords que elijas.',

  toolbar: {
    rangeLabel: 'Período',
    rangeOptions: {
      '28': 'Últimos 28 días',
      '90': 'Últimos 90 días',
      '180': 'Últimos 180 días',
      '365': 'Últimos 12 meses'
    },
    deviceLabel: 'Dispositivo',
    deviceOptions: {
      desktop: 'Escritorio',
      mobile: 'Móvil',
      tablet: 'Tablet'
    },
    // El device no es un filtro de presentación: cambia la SERP que se consultó.
    deviceHint: 'La búsqueda en móvil y en escritorio devuelve resultados distintos.',
    freshness: 'Datos hasta {date}',
    freshnessUnknown: 'Sin fecha de corte disponible'
  },

  source: {
    measured: 'Medido · Search Console',
    measuredHint: 'Lo que Google registró de tu sitio: posición promedio, clics e impresiones.',
    estimated: 'Estimado · DataForSEO',
    estimatedHint: 'Posición exacta observada en la búsqueda por un proveedor externo.',
    // Se explica POR QUÉ no se mezclan, no sólo que son distintas.
    ariaLabel: 'Origen de los datos de este gráfico',
    mixHint: 'Son dos mediciones distintas de la misma realidad. Nunca se promedian entre sí.'
  },

  set: {
    title: 'Qué comparar',
    modeLabel: 'Comparar por',
    modeByUrl: 'URL',
    modeByKeyword: 'Keyword',
    picker: 'Elegir qué comparar',
    pickerPlaceholder: 'Busca y agrega…',
    pickerHelperKeyword: 'Keywords con datos medidos o con seguimiento de posición activo.',
    pickerHelperUrl: 'Páginas con impresiones registradas en el período.',
    trackedBadge: 'Con seguimiento',
    trackedHint: 'Esta keyword tiene serie de posición exacta.',
    impressionsHint: '{impressions} impresiones en el período',
    noImpressionsHint: 'Todavía sin impresiones registradas',
    removeAria: 'Quitar {item} de la comparación',
    max: 'Puedes comparar hasta {max} a la vez.',
    maxReached: 'Llegaste al máximo de {max}. Quita uno para agregar otro.',
    liveRegion: '{count} en comparación',
    clear: 'Limpiar selección',
    // Presets data-driven: los sets nombrados que el operador configuró en el target.
    presetsLabel: 'Tus grupos',
    presetAria: 'Comparar el grupo {name} ({count} keywords)',
    presetTruncated: 'El grupo tiene {total} keywords; se comparan las primeras {max}.'
  },

  metric: {
    label: 'Métrica',
    position: 'Posición',
    clicks: 'Clics',
    impressions: 'Impresiones',
    ctr: 'CTR'
  },

  kpis: {
    // El "contra qué" del delta, declarado junto al período (regla dura de dataviz).
    comparison: 'vs período anterior'
  },

  // Lectura cruzada de los 4 KPIs (deriveSeoPerformanceInsight). Sólo aparece cuando el
  // patrón es inequívoco; jamás especula. La variante ctr_erosion NOMBRA la hipótesis AIO
  // sin afirmarla como hecho: el dato dice "CTR cae con posición estable", no "fue la IA".
  insight: {
    title: 'Lectura del período',
    demand_drop:
      'Los clics ({clicks}) y las impresiones ({impressions}) caen juntos con la posición estable: la demanda de estas búsquedas bajó, no tu ranking.',
    ctr_erosion:
      'La posición se mantiene y las impresiones también, pero el CTR cae {ctr} puntos: el SERP está capturando el clic (AI Overviews u otros elementos) antes de llegar a tu resultado.',
    rank_gain: 'La mejora de posición ({position}) explica el alza de clics ({clicks}).',
    rank_loss: 'La pérdida de posición ({position}) explica la caída de clics ({clicks}).'
  },

  chart: {
    title: 'Evolución de {metric}',
    // La inversión, visible y en palabras. No se deja al eje ni a la intuición.
    subtitlePosition: 'Más abajo en el número es mejor: pasar de 8 a 3 es una mejora, y en el gráfico se ve subiendo.',
    subtitleVolume: 'Volumen medido por Search Console en el período.',
    // ⚠️ Cobertura EXPLÍCITA: el período pedido y los días realmente medidos casi nunca
    // coinciden (una keyword recién trackeada tiene 2 días dentro de una ventana de 90).
    // Sin decirlo, el gráfico promete una película que el dato todavía no puede contar.
    coverage: '{measured} de {requested} días con medición · {from} a {to}',
    coverageSingle: 'Una sola medición ({from}). Todavía no hay evolución que mostrar: la serie empieza a formarse con el próximo día capturado.',
    coverageShort: 'Serie recién iniciada: {measured} días medidos. La tendencia se vuelve legible con más días capturados.',
    targetLabel: 'Meta: top 3',
    targetHint: 'Referencia comercial del módulo: estar entre los tres primeros resultados.',
    showTable: 'Ver tabla de datos',
    hideTable: 'Ocultar tabla de datos',
    tableCaption: 'Valores por fecha de cada serie en comparación',
    tableDateHeader: 'Fecha',
    zoomHint: 'Arrastra bajo el gráfico para acercarte a un tramo.',
    // Granularidad: en rangos largos el día a día es ruido; la semana muestra la forma.
    granularityLabel: 'Granularidad',
    granularityDaily: 'Diario',
    granularityWeekly: 'Semanal',
    granularityWeeklyHint: 'Cada punto agrega una semana de mediciones.',
    // AI Overview: marcador honesto — sólo existe en la serie ◑ (DataForSEO captura la SERP).
    aioLegend: 'AI Overview presente en la búsqueda',
    aioMarker: 'Con AI Overview',
    // Updates confirmados de Google: contexto, no excusa. Registro curado en algorithm-updates.ts.
    updatesLegend: 'Update confirmado de Google',
    ariaPosition:
      'Gráfico de evolución de posición de {count} series entre {from} y {to}. El eje está invertido: la posición 1 es la mejor y está arriba. Un día sin medición se dibuja como hueco, no como cero.',
    ariaVolume:
      'Gráfico de evolución de {metric} de {count} series entre {from} y {to}. Un día sin medición se dibuja como hueco, no como cero.'
  },

  table: {
    title: 'Detalle por {axis}',
    axisUrl: 'URL',
    axisKeyword: 'keyword',
    ariaLabel: 'Detalle de rendimiento por elemento en comparación',
    colItemUrl: 'URL',
    colItemKeyword: 'Keyword',
    colPosition: 'Posición',
    colPositionHint: 'Última posición medida en el período. Más abajo es mejor.',
    colDelta: 'Δ 30 días',
    colDeltaHint: 'Cambio de posición frente a hace 30 días. Bajar de número es mejorar.',
    colClicks: 'Clics',
    colImpressions: 'Impresiones',
    colCtr: 'CTR',
    colTrend: 'Tendencia',
    colTrendHint: 'Posición a lo largo del período. Arriba es mejor, igual que en el gráfico.',
    // Sin dato NUNCA es un cero: la celda lo dice.
    pending: 'Pendiente',
    noComparison: 'Sin comparación',
    noComparisonHint: 'Todavía no hay una medición de hace 30 días con la cual comparar.',
    trendUnavailable: 'Sin histórico suficiente',
    drillAria: 'Ver el detalle de {item}',
    sortAria: 'Ordenar por {column}'
  },

  states: {
    loading: 'Cargando el rendimiento del conjunto…',

    emptyNoGsc: {
      title: 'Conecta Search Console para ver el rendimiento',
      description:
        'La evolución se reconstruye con datos medidos por Google. Sin la conexión no hay historia que mostrar todavía.',
      cta: 'Conectar Search Console'
    },

    emptyNoSnapshots: {
      title: 'Aún no hay días guardados',
      description:
        'La conexión está activa, pero la captura diaria todavía no guardó ningún día. La película empieza en cuanto lo haga.'
    },

    // Estado inicial legítimo del flujo, no un error: por eso no habla de "problema".
    emptyNoSet: {
      title: 'Elige qué comparar',
      description: 'Agrega hasta {max} URLs o keywords y verás cómo evolucionan lado a lado.',
      cta: 'Elegir URLs o keywords'
    },

    emptyNoData: {
      title: 'Sin datos para esta selección en {range}',
      description: 'Prueba un período más amplio, cambia el dispositivo o elige otros elementos.',
      cta: 'Ampliar el período'
    },

    error: {
      title: 'No pudimos cargar la evolución',
      description: 'Puede ser algo temporal de nuestro lado. Intenta de nuevo en unos minutos.',
      cta: 'Reintentar'
    },

    denied: {
      title: 'No tienes acceso al módulo SEO',
      // Sin CTA de reintentar: la causa es estructural y reintentar no la resuelve.
      description: 'Pídele a un administrador que te habilite el módulo SEO para este Space.'
    },

    // Degradación honesta: se nombra lo que falta en vez de dibujarlo en cero.
    partialMissing: {
      title: 'Mostramos lo que sí está medido',
      description: 'Sin datos en el período: {items}. Quedan fuera del gráfico en vez de aparecer en cero.'
    },

    sparseSeries: {
      title: 'Algunas series tienen pocos días medidos',
      description:
        'Series con seguimiento reciente: {items}. Se dibujan hasta donde hay dato, con el hueco a la vista — no se rellenan.'
    }
  }
} as const

/**
 * TASK-1308 — Oportunidades de keywords (`/admin/growth/seo/keywords`).
 *
 * ⚠️ EL COPY DICE LA VERDAD SOBRE DE DÓNDE SALE EL DATO. Toda esta pantalla se construye
 * con lo MEDIDO por Search Console — no hay volumen ni dificultad de mercado (TASK-1300 no
 * aterrizó), y donde faltan se dice "sin dato de mercado", nunca 0 ni un guion ambiguo.
 * La demanda que se muestra son impresiones reales de la propia SERP del cliente, que es
 * un dato MEJOR que un volumen estimado por un tercero para un mercado promedio.
 *
 * ⚠️ CANIBALIZACIÓN NO ES UNA VARIANTE DE "OPORTUNIDAD": ES OTRA ACCIÓN. Una query con más
 * de una página no se optimiza, se CONSOLIDA (unificar, 301, canonical o diferenciar
 * intención). Por eso tiene su propio verbo en toda la superficie, no un chip decorativo.
 */
export const GH_GROWTH_SEO_KEYWORDS = {
  pageTitle: 'Oportunidades de keywords',
  pageSubtitle: 'Dónde crecer en búsqueda: lo que ya rankea y está a un empujón de la primera plana.',
  loadingAria: 'Cargando oportunidades de keywords',

  toolbar: {
    searchPlaceholder: 'Buscar keyword',
    searchLabel: 'Buscar keyword',
    windowLabel: 'Ventana',
    windowOptions: {
      '28': 'Últimos 28 días',
      '90': 'Últimos 90 días'
    },
    // La ventana no es cosmética: define sobre qué se calculó la posición ponderada.
    windowHint: 'La posición se pondera por impresiones dentro de la ventana.',
    /**
     * ⚠️ La frescura NO es decoración en este dominio. Search Console no publica el día
     * anterior y consolida sus métricas con ~48h de retraso, así que una pantalla que
     * muestra 28 días sin decir hasta cuándo llegan los datos se lee como "hasta hoy".
     */
    freshness: 'Datos hasta {date}',
    freshnessUnknown: 'Sin fecha de corte disponible',
    freshnessHint:
      'Search Console no publica el día de ayer y ajusta sus números durante unas 48 horas. El borde reciente de la serie todavía se está consolidando.',
    refreshing: 'Actualizando…'
  },

  source: {
    measured: 'Medido · Search Console',
    measuredHint:
      'Impresiones, clics y posición que Google registró de tu sitio. Es la demanda de TU búsqueda, no un promedio de mercado.',
    estimated: 'Estimado · mercado',
    estimatedHint: 'Volumen y dificultad de un proveedor externo. Aún no disponible en este Space.',
    ariaLabel: 'Origen de los datos de esta pantalla',
    mixHint: 'Todo lo que ves acá está medido. Nada se promedia con una estimación de mercado.'
  },

  /**
   * El veredicto: lo que los datos SIGNIFICAN, antes de dibujarlos.
   *
   * ⚠️ Se redacta desde el reparto real, no desde una plantilla fija. Con Berel, 42 de 50
   * oportunidades son de consolidación — ese hallazgo cambia el trabajo de la semana y en la
   * primera versión vivía como un número al final de una leyenda. Si el reparto cambia, el
   * titular dice otra cosa; si no hay nada que destacar, no inventa un titular.
   */
  verdict: {
    ariaLabel: 'Lectura principal y filtro por acción',
    mostlyCannibalized: '{count} de {total} keywords compiten contra tu propio sitio',
    mostlyCannibalizedHint:
      'Más de una página tuya aparece para la misma búsqueda y se diluyen entre sí. Consolidar es un trabajo distinto de optimizar: unificar, redirigir, canonical o diferenciar la intención.',
    mostlyQuickWin: '{count} de {total} keywords están a un empujón de subir',
    mostlyQuickWinHint: 'Ya rankean en la primera plana; falta subir dentro de ella. Es el trabajo de mejor retorno.',
    balanced: '{total} keywords entre las posiciones 8 y 20',
    balancedHint: 'Ya rankeas para todas: existe página y existe relevancia. Lo que cambia es qué hacer con cada una.',
    gainTotal: '+{value} clics/mes est. sobre la mesa',
    gainTotalHint: 'Suma de la ganancia estimada de todas las keywords listadas, si cada una llegara a su posición objetivo.',
    filterHint: 'Toca una acción para filtrar el mapa y la tabla.',
    active: 'Filtro activo',
    clear: 'Ver todas'
  },

  map: {
    title: 'Mapa de oportunidad',
    subtitle: 'Más a la izquierda, más cerca de la primera plana. Más arriba, más gente lo busca.',
    /**
     * 🔴 LA ZONA MARCA UN HECHO, NO UNA ACCIÓN.
     *
     * Decía "Fruta madura" — que es el nombre de UNA de las tres acciones. Pero la zona
     * abarca las posiciones 8–10, y dentro caen también las canibalizadas: una keyword en
     * posición 9 con 13 páginas compitiendo está en primera plana Y NO es fruta madura, es
     * consolidación. Etiquetar una región posicional con un nombre de acción hacía que el
     * mapa se contradijera con su propia leyenda.
     */
    quickWinLabel: 'Primera plana',
    quickWinHint: 'Posición 10 o mejor. Estar acá no dice qué hacer — eso lo dice la forma de cada punto.',
    axisX: 'Posición actual',
    axisY: 'Impresiones (28 días)',
    bubbleHint: 'El tamaño de cada punto son los clics que ganarías al llegar a la posición objetivo.',
    aria:
      'Dispersión de {count} keywords: el eje horizontal es la posición actual (más a la izquierda es mejor) y el vertical las impresiones medidas. El tamaño indica los clics incrementales estimados y la forma la acción recomendada.',
    coverage: '{count} keywords entre las posiciones 8 y 20, con al menos {threshold} impresiones en la ventana.',
    zoomHint: 'Pasa el cursor por un punto para ver su detalle. La tabla de abajo tiene los valores exactos.',
    collapse: 'Ocultar mapa',
    expand: 'Ver mapa'
  },

  /**
   * La acción recomendada, que es a la vez el color, la forma y el filtro.
   *
   * Son ACCIONES, no severidades: "empujar" y "consolidar" son trabajos distintos, con
   * dueños y criterios de éxito distintos.
   */
  action: {
    label: 'Acción',
    quickWin: 'Empujar (fruta madura)',
    quickWinShort: 'Empujar',
    quickWinHint: 'Posición 10 o mejor: ya estás en la primera plana, falta subir dentro de ella.',
    striking: 'Empujar (a un paso)',
    strikingShort: 'A un paso',
    strikingHint: 'Posición 11 a 20: la segunda plana. Llegar a la primera es el salto de mayor retorno.',
    cannibalized: 'Consolidar',
    cannibalizedShort: 'Consolidar',
    // El invariante del método: no es una oportunidad peor, es otro trabajo.
    cannibalizedHint:
      'Más de una página tuya compite por esta búsqueda y se diluyen entre sí. No se optimiza: se consolida (unificar, 301, canonical o diferenciar intención).'
  },

  table: {
    title: 'Detalle',
    ariaLabel: 'Oportunidades de keywords con su posición, demanda medida y acción recomendada',
    colKeyword: 'Keyword',
    // La columna contiene "Seguir" Y "Dejar de seguir": nombrarla con una de las dos
    // acciones describía mal la mitad de su contenido.
    colTracking: 'Seguimiento',
    export: 'Exportar CSV',
    exportHint: 'Descarga lo que estás viendo, con los filtros aplicados. Para el ticket, el SOW o el mail al cliente.',
    exportFilename: 'oportunidades-keywords',
    colAction: 'Acción',
    colPosition: 'Posición',
    colPositionHint: 'Posición media ponderada por impresiones en la ventana. Más bajo es mejor.',
    colImpressions: 'Impresiones',
    colImpressionsHint: 'Cuántas veces apareciste. Es la demanda medida de tu propia búsqueda.',
    colClicks: 'Clics',
    colCtr: 'CTR',
    colGain: 'Ganancia est.',
    colGainHint:
      'Clics adicionales por mes si llegaras a la posición objetivo, según la curva de CTR de tu propio sitio.',
    colVolume: 'Volumen',
    // ⚠️ NO es "Dificultad" (ISSUE-152): la métrica del proveedor mide SOLO la barrera de
    // enlaces del top-10, y en SERPs LATAM colapsa a 0 — mostrado como "Dificultad: 0" se lee
    // "trivial", que es falso (Semrush le pone 50 a la misma keyword). Se nombra lo que mide.
    colLinkBarrier: 'Barrera de enlaces',
    colLinkBarrierHint:
      'Qué tan atrincherado con backlinks está el top 10 para esta búsqueda. Baja = se compite con contenido y autoridad, no con enlaces: una oportunidad para un dominio fuerte, no una búsqueda "fácil".',
    linkBarrierLow: 'Baja',
    linkBarrierMedium: 'Media',
    linkBarrierHigh: 'Alta',
    linkBarrierLowHint: 'El top 10 casi no tiene backlinks propios: se compite con contenido y autoridad de dominio.',
    linkBarrierMediumHint: 'El top 10 tiene un perfil de enlaces moderado: entrar exige contenido fuerte y algunos enlaces.',
    linkBarrierHighHint: 'El top 10 está atrincherado con backlinks: entrar exige una estrategia de enlaces sostenida.',
    // El estado honesto de las columnas de mercado: ni 0 ni un guion ambiguo.
    //
    // ⚠️ CORTO A PROPÓSITO (hallazgo del GVC). "Sin dato de mercado" completo se envolvía en
    // DOS líneas, en DOS columnas, en las 50 filas: 100 repeticiones de un texto largo que
    // ahogaban los números que la tabla existe para mostrar. La frase completa no se pierde
    // — vive en el tooltip de cada celda y en el banner de la pantalla, que la dice una vez.
    marketUnavailable: 'Sin dato',
    marketUnavailableHint:
      'El enriquecimiento de mercado (volumen y dificultad) todavía no está habilitado en este Space. La priorización de arriba no lo necesita: usa tu demanda medida.',
    page: 'Página',
    rowsPerPage: 'Filas por página',
    paginationRange: '{from}–{to} de {count}',
    sortedByGain: 'Ordenadas por ganancia estimada: lo de arriba es lo que más rinde.',
    colConflict: 'Páginas',
    colConflictHint:
      'Cuántas páginas tuyas aparecen para esta búsqueda. Más de una significa que compiten entre sí — y ese número es lo que decide la urgencia de consolidar.',
    competingPages: '{count} páginas compiten',
    drillAria: 'Ver la evolución de {keyword} en Rendimiento',
    openPage: 'Abrir la página que rankea hoy',
    gainUnit: '+{value} clics/mes est.',
    noGain: 'Sin ganancia estimada',
    noGainHint: 'Esta keyword ya convierte mejor que el promedio de la posición objetivo.'
  },

  follow: {
    cta: 'Seguir',
    untrack: 'Dejar de seguir',
    untrackAria: 'Dejar de seguir la keyword {keyword}',
    untrackHint: 'Sale del seguimiento diario y deja de consumir presupuesto del proveedor. Su historial se conserva.',
    feedbackUntracked: 'Dejaste de seguir "{keyword}". Su historial se conserva.',
    feedbackUntrackError: 'No pudimos dejar de seguir "{keyword}". Intenta de nuevo.',
    bulkSelected: '{count} seleccionadas',
    bulkTrack: 'Seguir seleccionadas',
    bulkClear: 'Limpiar selección',
    bulkAria: 'Seleccionar {keyword} para seguirla en lote',
    bulkSelectAll: 'Seleccionar todas las de esta página',
    feedbackBulk: 'Seguiste {tracked} de {requested} keywords.',
    undo: 'Deshacer',
    outOfScope: '{count} fuera del filtro actual',
    outOfScopeHint:
      'Las seleccionaste antes de filtrar y ahora no están a la vista. No entran en el lote: seguir algo que no estás viendo compromete gasto sin que lo hayas revisado.',
    ctaAria: 'Seguir la keyword {keyword}',
    following: 'Siguiendo',
    followingHint: 'Ya está en el set monitoreado: su posición se mide todos los días.',
    loading: 'Siguiendo…',
    // El costo se dice ANTES de hacer clic, no después.
    costHint: 'Al seguirla entra al seguimiento diario de posición, que consume presupuesto del proveedor.',
    capacity: '{used} de {capacity} keywords seguidas',
    capacityFullHint: 'El set llegó a su tope. Deja de seguir alguna antes de agregar otra.',
    feedbackTracked: 'Ahora sigues "{keyword}". Aparecerá en Rendimiento cuando se mida.',
    feedbackAlready: 'Ya seguías "{keyword}". No se agregó de nuevo.',
    feedbackCapacity: 'No se pudo seguir "{keyword}": el set llegó a su tope de {capacity} keywords.',
    feedbackError: 'No pudimos seguir "{keyword}". Intenta de nuevo.'
  },

  filters: {
    title: 'Filtros',
    ariaLabel: 'Filtros de oportunidades',
    actionAll: 'Todas',
    positionLabel: 'Posición',
    positionAll: 'Todas',
    positionFirstPage: 'Primera plana (8–10)',
    positionSecondPage: 'Segunda plana (11–20)',
    clear: 'Limpiar filtros',
    resultCount: '{count} de {total} keywords',
    resultAnnounce: '{count} keywords tras aplicar los filtros',
    viewingSubset: 'Viendo {count} de {total}'
  },

  /**
   * TASK-1665 — lente `Descubrir`.
   *
   * Tres reglas de tono que gobiernan todo este bloque, porque la pantalla compromete plata:
   *
   * 1. **Nunca prometer tráfico, ranking ni clientes.** Se descubre demanda y se decide qué
   *    investigar; lo que pase después no lo controla esta pantalla.
   * 2. **"Descubrir" ≠ "seguir".** Una sugerencia es una hipótesis; seguirla activa gasto
   *    recurrente. El copy de cada acción dice su consecuencia exacta, y por eso hay tres verbos
   *    distintos en vez de un "Agregar" ambiguo.
   * 3. **La ausencia de dato se nombra, no se rellena.** Nunca `0`, nunca `—` ambiguo, nunca un
   *    score inventado: "Sin dato de mercado" dice la verdad y deja decidir con eso.
   */
  discovery: {
    lensLabel: 'Descubrir',
    lensAriaLabel: 'Lentes de keywords',
    lensOpportunities: 'Oportunidades',

    title: 'Descubrir keywords',
    subtitle: 'Encuentra términos relacionados a partir de seeds y decide qué hacer con cada uno.',

    builder: {
      ariaLabel: 'Configuración de la corrida de descubrimiento',

      seedsLabel: 'Seeds para investigar',
      seedsHelper: 'Una por línea. Una seed es un punto de partida, no una keyword que se empiece a medir.',
      seedsPlaceholder: 'ej. pintura industrial',
      seedsCounter: '{count}/{max} seeds',
      seedsDuplicateRemoved: 'Se quitó {count} duplicado',
      seedsDuplicatesRemoved: 'Se quitaron {count} duplicados',
      seedsErrorEmpty: 'Agrega al menos una seed.',
      seedsErrorTooMany: 'Reduce la lista a {max} seeds.',
      seedsErrorTooLong: 'La seed "{seed}" es muy larga. Máximo {max} caracteres.',
      seedsErrorTooManyWords: 'La seed "{seed}" tiene demasiadas palabras. Máximo {max}.',

      sourcesLabel: 'Fuentes de seed',
      sourceGsc: 'Consultas medidas',
      sourceGscHelper: 'Consultas reales de tu Search Console de los últimos 28 días. Sin costo de proveedor.',
      sourceGscUnavailable: 'No hay consultas medidas',
      sourceTracked: 'Keywords seguidas',
      sourceTrackedHelper: 'Términos que ya monitoreas. No crea seguimiento nuevo.',
      sourceTrackedUnavailable: 'Todavía no sigues keywords',
      sourceManual: 'Seeds escritas',
      sourceManualHelper: 'El texto que ingresaste como punto de partida.',
      sourceDomain: 'Dominio propio',
      sourceDomainHelper: 'Busca keywords asociadas al dominio. Usa datos estimados y tiene costo.',

      methodsLabel: 'Métodos de expansión',
      methodsHelper: 'Hasta {max}. Definen cómo se amplía cada seed.',
      methodSuggestions: 'Sugerencias',
      methodSuggestionsHelper: 'Frases que contienen tu seed con términos añadidos.',
      methodRelated: 'Relacionadas',
      methodRelatedHelper: 'Búsquedas relacionadas del índice del proveedor.',
      methodIdeas: 'Ideas',
      methodIdeasHelper: 'Términos de la misma categoría. Amplía mucho el resultado.',
      methodsErrorEmpty: 'Elige al menos un método.',

      marketLabel: 'Mercado',
      marketHelper: 'Heredado del sitio configurado.',

      scopeLabel: 'Alcance',
      scopeQuick: 'Rápido · 25 filas',
      scopeFull: 'Completo · 50 filas',
      scopeHelper: 'Filas solicitadas por método. "Completo" no significa exhaustivo.',

      submit: 'Descubrir keywords',
      submitAriaLabel: 'Iniciar la corrida de descubrimiento',
      submitPending: 'Encolando…'
    },

    cost: {
      ariaLabel: 'Costo estimado de la corrida',
      heading: 'Antes de confirmar',
      calls: '{count} llamadas estimadas',
      rows: 'Hasta {count} filas solicitadas',
      /*
       * ⚠️ Sin `◑` en las cifras de costo, a propósito.
       *
       * `◑` está definido en la leyenda del canvas como «estimado de mercado · DataForSEO Labs»:
       * es un marcador de PROCEDENCIA de un dato de mercado, no un genérico de «aproximado».
       * Ponérselo a un monto en dólares —peor todavía al costo REAL que devolvió el proveedor—
       * le enseña al operador que `◑` significa «número con incertidumbre», y ahí muere la
       * distinción `◑` estimado / `●` medido que el resto del pipeline sostiene con rigor.
       * Para el estimado basta la palabra: ya dice «estimado».
       */
      estimate: 'Costo máximo estimado US${amount}',
      estimateFree: 'Sin costo de proveedor',
      budget: 'Presupuesto disponible US${amount}',
      budgetUnavailable: 'Cupo no disponible',
      formula: 'Fórmula: {formula}',

      /*
       * 🔴 El rebote del enqueue se dice ACÁ, no «en la banda de estado».
       *
       * Cuando el command rechaza la corrida no se inserta NINGUNA fila: la banda de estado sigue
       * mostrando la corrida anterior o nada. Si el error se traga, el operador ve un botón en
       * rojo sin razón y no distingue «cupo agotado» (no reintentes) de «proveedor caído»
       * (reintenta después). El servidor ya fabricó la prosa es-CL exacta; se muestra tal cual.
       */
      submitErrorFallback: 'No pudimos iniciar la corrida. Intenta de nuevo.',
      submitErrorRetryHint: 'Puedes reintentar.',
      submitErrorStructuralHint: 'Reintentar no lo resuelve: revisa el cupo o pide ayuda al equipo.',

      disclaimer:
        'Los datos de mercado son estimados y la corrida puede quedar parcial. Seguir una keyword después genera gasto recurrente y pide otra confirmación.',
      announce: 'Costo estimado actualizado: {calls} llamadas, hasta US${amount}.',
      calculating: 'Calculando el costo…'
    },

    disabledReason: {
      flag: 'El descubrimiento todavía no está habilitado para esta organización.',
      permission: 'Puedes revisar las corridas, pero no iniciar una nueva. Pídele acceso a Growth.',
      noSeeds: 'Agrega al menos una seed para estimar el costo.',
      noMethods: 'Elige al menos un método de expansión.',
      noTarget: 'Este Space todavía no tiene un sitio configurado.',
      budget: 'El cupo del período no alcanza para esta corrida.'
    },

    run: {
      ariaLabel: 'Estado de la corrida',
      lastRun: 'Última corrida',
      runId: 'Corrida {id}',
      queuedTitle: 'Corrida en cola',
      queuedDetail: 'Se ejecuta fuera de esta pantalla. Puedes salir y volver.',
      queuedAnnounce: 'La corrida quedó en cola.',
      runningTitle: 'Investigando seeds',
      runningDetail: 'Procesando la corrida.',
      runningDetailStage: 'Procesando {stage}.',
      runningAnnounce: 'La corrida está procesando.',
      runningIndicatorAria: 'La corrida sigue en curso',
      succeededTitle: 'Corrida completada',
      // Sin `◑`: este monto es lo que el proveedor efectivamente cobró (campo `cost` de su
      // respuesta). Marcarlo como «estimado de mercado» contradice su propio label.
      succeededDetail: '{count} candidatos · costo real US${amount}',
      succeededAnnounce: 'La corrida terminó con {count} candidatos.',
      partialTitle: 'Corrida parcial',
      partialDetail: 'Una fuente no terminó. Lo que sí se materializó está abajo.',
      partialAnnounce: 'La corrida terminó parcialmente.',
      noResultsTitle: 'No encontramos candidatos',
      noResultsDetail: 'La respuesta fue válida pero no trajo términos. Prueba otras seeds o método.',
      noResultsAnnounce: 'La corrida terminó sin candidatos.',
      budgetBlockedTitle: 'Corrida detenida por cupo',
      budgetBlockedDetail: 'Se alcanzó el límite de gasto del período. Reduce el alcance o espera al próximo.',
      budgetBlockedAnnounce: 'La corrida se detuvo por cupo.',
      providerErrorTitle: 'No pudimos completar la corrida',
      providerErrorDetail: 'El proveedor no respondió. Puedes iniciar una corrida nueva.',
      providerErrorAnnounce: 'No pudimos completar la corrida.',
      staleTitle: 'Datos anteriores',
      staleDetail: 'Capturados el {date}. Inicia una corrida nueva para actualizarlos.',
      retry: 'Nueva corrida',
      refresh: 'Actualizar estado',
      viewResults: 'Ver candidatos',
      methodDone: '{method} ✓',
      methodFailed: '{method} — no terminó',
      methodSkipped: '{method} — sin ejecutar'
    },

    empty: {
      title: 'Todavía no has hecho una corrida',
      description:
        'Escribe una o más seeds arriba y elige cómo expandirlas. Vas a ver el costo estimado antes de confirmar.',
      noTargetTitle: 'Este Space no tiene un sitio configurado',
      noTargetDescription: 'Configura el sitio y su mercado para poder investigar keywords.'
    },

    /**
     * Canvas de candidatos.
     *
     * 🔴 La columna se llama **"Barrera de enlaces"**, jamás "Dificultad" (ISSUE-152): el índice
     * crudo del proveedor colapsa a 0 en SERPs es-LATAM y un "0" se lee como "trivial", que es
     * falso. Se muestra el NIVEL de lo que la métrica realmente mide, y `unknown` es "Sin dato",
     * nunca "Baja" — un hueco presentado como barrera baja afirma una oportunidad que nadie midió.
     */
    results: {
      title: 'Candidatos',
      ariaLabel: 'Candidatos de la corrida',
      count: '{count} candidatos',

      /*
       * ⚠️ El conteo afirma el universo; la tabla sirve las páginas que se han recorrido. Cuando
       * no coinciden hay que DECIRLO: «Candidatos (312)» sobre 50 filas, sin aviso, es mentira por
       * omisión justo en el canvas donde se decide.
       *
       * TASK-1693: el aviso ya NO promete paginación futura —la promesa se cumplió—. Ahora explica
       * las dos cosas que el operador necesita saber para seguir recorriendo: por qué estos primero
       * (el orden gobernado del reader) y que recorrer NO vuelve a gastar. En una superficie donde
       * la otra acción cuesta dinero, esa segunda mitad no es un detalle.
       */
      countTruncated: '{shown} de {count} candidatos',
      truncatedNotice:
        'Primero se muestran los candidatos de mayor prioridad. Puedes recorrer el resto sin volver a gastar.',

      /*
       * Verbo de RECORRER, no de buscar: no dispara una corrida y el copy no puede sugerirlo.
       * «Ver» y no «Cargar» porque «cargar» es voz del sistema, y porque el botón convive con
       * «Descubrir», que sí gasta — dos verbos que no se puedan confundir.
       *
       * ⚠️ SIN `aria-label` propio a propósito: el texto visible ya lleva el conteo, así que es su
       * nombre accesible. Un `aria-label` distinto rompería «label in name» (WCAG 2.5.3) y dejaría
       * el botón inalcanzable por control de voz.
       */
      loadMore: 'Ver {count} candidatos más',
      loadMoreError: 'No pudimos cargar más candidatos. Los que ya ves siguen disponibles.',

      colKeyword: 'Keyword',
      colSource: 'Procedencia',
      colCluster: 'Agrupador',
      colIntent: 'Intención',
      colVolume: 'Volumen',
      colBarrier: 'Barrera de enlaces',
      colPresence: 'Presencia propia',
      colState: 'Estado',

      measuredMarker: '● Medido por Search Console',
      estimatedMarker: '◑ Estimado de mercado · DataForSEO Labs',
      legend: '● Medido por Search Console · ◑ Estimado de mercado. No se promedian.',

      volumeUnit: '{value}/mes',
      /*
       * ⚠️ DOS fechas distintas, dos frases distintas.
       *
       * `asOf` es el as-of del PROVEEDOR: cuándo actualizó su snapshot de volumen. `asOfCaptured`
       * es cuándo lo trajimos nosotros. Cuando el proveedor no declara su fecha, decir «al
       * {captura}» presenta nuestra fecha como si fuera la del dato — dos hechos distintos bajo el
       * mismo label. El drawer ya los separa con labels propios; la tabla es donde se decide en
       * volumen, así que acá también tienen que distinguirse.
       */
      asOf: 'al {date}',
      asOfCaptured: 'traído el {date}',

      noMarketData: 'Sin dato de mercado',
      noIntent: 'Sin dato de intención',
      noCluster: 'Sin agrupador',
      noPresence: 'Sin medición propia',
      notInSeries: 'No aparece en la serie',
      position: 'Posición {value}',

      sourceManual: 'Seed manual',
      sourceGsc: 'GSC medido',
      sourceTracked: 'Keyword seguida',
      sourceSuggestions: 'Sugerencias',
      sourceRelated: 'Relacionadas',
      sourceIdeas: 'Ideas',
      sourceDomain: 'Dominio propio',

      barrierLow: 'Baja',
      barrierMedium: 'Media',
      barrierHigh: 'Alta',
      barrierUnknown: 'Sin dato',
      barrierLowHint: 'Se compite con contenido y autoridad, no con enlaces. No significa fácil.',

      intentInformational: 'Informativa',
      intentNavigational: 'De navegación',
      intentCommercial: 'Comercial',
      intentTransactional: 'Transaccional',

      stateNew: 'Nuevo',
      stateTracked: 'Ya seguido',
      stateDismissed: 'Descartado',
      statePreparingAeo: 'Preparando AEO',
      stateSelectedForTarget: 'Marcado como objetivo',

      seedTrace: 'Seed: {seed}',
      emptyFiltered: 'Ningún candidato coincide con los filtros.',

      colActions: 'Detalle',
      openDetail: 'Detalles',
      openDetailAria: 'Ver el detalle de {keyword}',

      trackingCostNotice:
        'Seguir cualquiera de estos términos compromete gasto recurrente: el rank capture diario le paga al proveedor por cada keyword vigente hasta que la dejes de seguir.'
    },

    /**
     * TASK-1665 Slice 4 — detalle del candidato y sus decisiones.
     *
     * 🔴 El drawer responde "¿cómo llegó esto acá?" ANTES de ofrecer gastar. El orden del
     * wireframe (R4 §Contenido) no es estético: procedencia → mercado → medición propia →
     * advertencia → acciones. Poner las acciones arriba invitaría a decidir sin leer en qué
     * se basa la decisión.
     */
    drawer: {
      eyebrow: 'Candidato',
      closeLabel: 'Cerrar el detalle',

      provenanceTitle: '¿Cómo llegó acá?',
      provenanceChain: '{seed} → {method} → corrida del {date}',
      provenanceNoSeed: 'Sin seed registrada',
      provenanceRank: 'Puesto {rank} en la respuesta del proveedor',
      marketTitle: 'Mercado consultado',
      capturedAtLabel: 'Capturado el {date}',
      providerUpdatedLabel: 'El proveedor actualizó el dato el {date}',

      marketDataTitle: 'Estimado de mercado',
      marketDataHint:
        'Son estimaciones mensuales del proveedor sobre el mercado publicitario, no visitas medidas de tu sitio.',
      volumeLabel: 'Volumen de búsqueda',
      barrierLabel: 'Barrera de enlaces',
      barrierHint:
        'Nivel derivado de la diversidad de dominios que enlazan al top 10, no del índice crudo de dificultad.',
      intentLabel: 'Intención estimada',
      clusterLabel: 'Agrupador',
      cpcLabel: 'CPC de referencia',
      /** Sí lleva `◑`: el CPC es un estimado de mercado del proveedor, no un monto que pagamos. */
      cpcValue: '◑ USD {amount}',
      cpcHint: 'Precio publicitario, no costo de posicionarse.',
      /** Ausencia de fecha en una fila del drawer: nunca un placeholder mudo. */
      dateUnknown: 'Sin fecha',

      measuredTitle: 'Medición propia',
      measuredHint: 'Lo que Search Console midió para tu sitio en este término.',
      positionLabel: 'Posición promedio',
      impressionsLabel: 'Impresiones',

      warningTitle: 'Sugerencia no significa seguimiento',
      warningBody:
        'Este término está acá porque el proveedor lo relacionó con tus seeds. Nadie lo está midiendo todavía: eso ocurre recién cuando lo sigues, y desde ahí genera gasto en cada ciclo.',

      actionsTitle: 'Qué quieres hacer',
      noActionsTitle: 'Sin acciones disponibles',
      noActionsBody: 'Puedes leer el detalle, pero no tienes permiso para comprometer gasto ni preparar consultas.',

      trackedTitle: 'Ya lo estás siguiendo',
      trackedBody: 'Este término ya está en el seguimiento diario. Revisa su trayectoria en Rendimiento.'
    },

    /**
     * Acciones gobernadas. Cada una nombra su CONSECUENCIA, no su mecánica: el operador no
     * necesita saber qué endpoint se llama, necesita saber qué le va a pasar a la factura.
     */
    actions: {
      declareTarget: 'Declarar objetivo',
      declareTargetHint: 'Lo incorpora al seguimiento diario y lo marca como una posición que buscas ocupar.',
      declareTargetConfirm:
        'Declarar este objetivo lo incorpora al seguimiento diario y puede generar costo recurrente. Revisa el cupo antes de confirmar.',

      followOpportunity: 'Seguir oportunidad',
      followOpportunityHint: 'Lo incorpora al seguimiento diario sin declararlo como posición buscada.',
      followOpportunityConfirm: 'Seguir esta oportunidad la incorpora al seguimiento diario. No es sólo guardar la idea.',

      prepareGrounded: 'Preparar grounded queries',
      prepareGroundedHint: 'Crea un borrador de consultas AEO para revisión humana.',
      prepareGroundedConfirm:
        'Preparar consultas crea un borrador AEO para revisión. No activa el set ni ejecuta una corrida.',

      dismiss: 'Descartar',
      dismissHint: 'Registra tu decisión sin borrar la evidencia.',
      dismissConfirm: 'Descartar sólo registra tu decisión; no borra la evidencia.',

      viewTrajectory: 'Ver trayectoria',
      viewTrajectoryHint: 'Abre Rendimiento con este término. No genera gasto.',

      confirmCta: 'Confirmar',
      cancelCta: 'Cancelar',
      confirmTitle: 'Confirma la decisión',
      pendingLabel: 'Procesando…',

      capacityNotice: 'Cupo del seguimiento: {used} de {capacity} términos.',

      /**
       * 🔴 El feedback es POR keyword, jamás un «Listo» agregado.
       *
       * Los outcomes son los del command real (`tracked | already_tracked | intent_changed |
       * capacity_exceeded | invalid`), NO los del borrador del flow (`declared` /
       * `already_target`, que nunca existieron en `trackKeywords`). Un 200 con la keyword
       * rebotada por techo es un resultado que hay que leer, no un éxito.
       */
      feedbackTracked: 'Listo: ahora sigues «{keyword}».',
      feedbackTargetDeclared: 'Listo: «{keyword}» quedó declarada como objetivo.',
      feedbackAlreadyTracked: 'Ya seguías «{keyword}». No se agregó de nuevo ni se duplicó el gasto.',
      feedbackIntentChanged: 'Cambiaste la clasificación de «{keyword}». No consume cupo nuevo.',
      feedbackCapacityExceeded: 'No se agregó «{keyword}»: el seguimiento llegó a su cupo. Deja de seguir algo antes.',
      feedbackInvalid: 'No se pudo usar «{keyword}»: el término no cumple el formato del proveedor.',
      feedbackDismissed: 'Descartaste «{keyword}». Queda registrado en la bitácora.',
      feedbackGroundedDraft: 'Se creó el borrador AEO con «{keyword}». Revísalo antes de activarlo.',
      feedbackGroundedFallback:
        'Se creó el borrador base con «{keyword}», sin el modelo: revísalo con más atención antes de activarlo.',

      /*
       * 🔴 `coverageNotice` viaja OBLIGATORIO desde el bridge (TASK-1666): un draft `grounded_llm`
       * con huecos JAMÁS se presenta como cobertura total. Omitirlo acá anunciaría éxito pleno
       * sobre un borrador que dejó candidatos afuera — exactamente lo que el primitive prohíbe.
       */
      feedbackGroundedPartial:
        'Se creó el borrador AEO con «{keyword}», pero quedó con cobertura incompleta: {notice}',
      /** Reutilizar un draft vigente NO es crear uno nuevo; decir «se creó» escondería el no-op. */
      feedbackGroundedDeduped:
        'Ya existía un borrador AEO vigente con «{keyword}». Se reutilizó, sin generar uno nuevo.',

      feedbackError: 'No se pudo completar la acción sobre «{keyword}».',

      /** Una acción en vuelo bloquea las demás: dos decisiones de gasto en paralelo sobre la
       *  misma keyword dejan el orden de escritura al azar. */
      busyHint: 'Hay una acción en curso. Espera a que termine.',

      disabledGroundedNoProfile: 'Este Space todavía no tiene un perfil AEO configurado.',
      disabledGroundedNoPermission: 'No tienes permiso para gestionar consultas AEO.',
      disabledGroundedFlag: 'El módulo AEO está apagado en este ambiente.'
    }
  },

  states: {
    emptyNoOpportunities: {
      title: 'Todavía no hay oportunidades',
      description:
        'Ninguna keyword de {domain} está hoy entre las posiciones 8 y 20 con demanda suficiente. Cuando alguna llegue a ese rango, aparecerá acá.'
    },

    emptyFiltered: {
      title: 'Sin resultados para estos filtros',
      description: 'Ninguna keyword coincide con la acción o la posición que elegiste.',
      cta: 'Limpiar filtros'
    },

    emptyNoGsc: {
      title: 'Falta conectar Search Console',
      description: 'Sin Search Console no hay demanda medida, y estas oportunidades se calculan con ella.',
      cta: 'Conectar Search Console'
    },

    emptyNoSnapshots: {
      title: 'Todavía no hay días medidos',
      description: 'La conexión está lista y la primera captura aún no corre. Vuelve en unas horas.'
    },

    error: {
      title: 'No pudimos cargar las oportunidades',
      description: 'Puede ser algo temporal de nuestro lado. Intenta de nuevo en unos minutos.',
      cta: 'Reintentar'
    },

    /**
     * Error ESTRUCTURAL: reintentar no lo resuelve, así que no se ofrece el botón.
     * Ofrecerlo escondería la acción real y haría que el operador reintente en vano.
     */
    errorStructural: {
      title: 'Este Space no tiene un sitio SEO configurado',
      description: 'Hay que crear el target del sitio antes de que podamos buscar oportunidades. Pídeselo a quien administre el módulo.'
    },

    denied: {
      title: 'No tienes acceso al módulo SEO',
      description: 'Pídele a un administrador que te habilite el módulo SEO para este Space.',
      // Un estado bloqueado lleva CTA, no una instrucción: el camino tiene que ser clicable.
      cta: 'Ver los Spaces con SEO activo'
    },

    // Degradación honesta del enriquecimiento de mercado: se nombra lo que falta.
    marketUnavailable: {
      title: 'Mostramos sólo lo medido',
      description:
        'El volumen y la dificultad de mercado no están habilitados en este Space. La priorización usa tu demanda medida en Search Console, que es de tu propia búsqueda.'
    }
  }
} as const

/**
 * TASK-1309 — Auditoría del sitio (tab "Auditoría" de Search Visibility, nodo S4).
 *
 * Copy es-CL (tuteo) de la superficie operador que diagnostica salud técnica de un
 * dominio. Los estados NO colapsan: un crawl que terminó sin issues es una buena
 * noticia, no un error, y "sin auditoría" no se pinta con ceros.
 */
export const GH_GROWTH_SEO_AUDIT = {
  header: {
    title: 'Auditoría del sitio',
    subtitle: (domain: string) => `Salud técnica de ${domain} para búsqueda`,
    subtitleNoDomain: 'Salud técnica del sitio para búsqueda',
    breadcrumbLeaf: 'Auditoría',
    freshness: (days: number) =>
      days === 0 ? 'Último crawl: hoy' : days === 1 ? 'Último crawl: ayer' : `Último crawl: hace ${days} días`,
    freshnessNever: 'Sin crawl reciente',
    // El freshness es la señal de cuánto confiar en el diagnóstico: pasado cierto punto
    // deja de ser un dato de contexto y pasa a ser una advertencia.
    freshnessStale: 'Este diagnóstico ya no es reciente. Corre una auditoría para confirmarlo.'
  },

  action: {
    run: 'Correr auditoría',
    running: 'Encolando…',
    queued: 'Auditoría encolada. El crawl corre en segundo plano y la pantalla se actualiza al terminar.'
  },

  kpi: {
    health: 'Salud',
    healthAria: (score: number) => `Salud del sitio: ${score} de 100`,
    healthPending: 'Pendiente',
    healthPendingHint: 'El crawl no calculó un puntaje de salud.',
    // 🔴 El puntaje y el conteo de issues NO miden lo mismo, y ponerlos juntos sin decirlo
    // invita a leerlos como contradicción ("¿95 con 519 issues?"). El puntaje lo calcula el
    // proveedor con su propia ponderación —pesa sobre todo lo que rompe indexación— y el
    // conteo sale de nuestro catálogo curado de checks. Un sitio sin críticos puede tener
    // muchos issues menores y seguir puntuando alto: no es un error, es qué mide cada uno.
    healthScopeNoCritical:
      'El puntaje pesa sobre todo lo que rompe la indexación. Sin issues críticos se mantiene alto aunque haya muchos menores.',
    healthScopeWithCritical:
      'El puntaje pesa sobre todo lo que rompe la indexación, así que los issues críticos son los que más lo bajan.',
    critical: 'Críticos',
    warnings: 'Atención',
    notices: 'Menores',
    pages: 'Páginas revisadas',
    // El crawl tiene techo. Cuando lo choca, el conteo deja de ser "el sitio" y pasa a ser
    // "lo que alcanzamos a mirar" — decirlo evita que una muestra se lea como un censo.
    pagesCapped: 'Tope del crawl',
    pagesCappedHint: (cap: number) =>
      `El crawl revisa hasta ${cap} páginas. Si el sitio tiene más, esto es una muestra y la salud describe esa muestra, no el sitio entero.`,
    // Los conteos por severidad son también el filtro de la lista (mismo recurso que la
    // banda de veredicto de Keywords: leyenda y control en un solo objeto).
    filterAria: (severity: string) => `Filtrar la lista por ${severity}`,
    filterClear: 'Ver todos',
    bandAria: 'Reparto de issues por severidad; cada segmento filtra la lista',
    filterClearAria: 'Quitar el filtro de severidad y ver todos los issues',

    // Movimiento entre crawls. El módulo se vende como serie de tiempo, así que "95" solo
    // es media respuesta; "95, +2 desde el crawl anterior" es la otra mitad.
    trendFirstRun: 'Primer crawl: todavía no hay con qué comparar',
    trendHealth: (delta: number, date: string) =>
      `${delta > 0 ? '+' : ''}${delta.toFixed(1)} desde el crawl del ${date}`,
    trendHealthFlat: (date: string) => `Sin cambio desde el crawl del ${date}`,
    trendHealthUnknown: (date: string) => `El crawl del ${date} no calculó puntaje`,
    trendIssues: (delta: number) =>
      delta === 0
        ? 'Mismo número de issues'
        : delta > 0
          ? `${delta} ${delta === 1 ? 'issue nuevo' : 'issues nuevos'}`
          : `${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'issue menos' : 'issues menos'}`
  },

  issues: {
    title: 'Issues priorizados',
    // Se nombra EXACTAMENTE lo que ordena la lista. Prometer un criterio que los datos no
    // sostienen es la misma clase de mentira que pintar un cero donde no hubo medición.
    subtitle: 'Primero lo crítico; dentro de cada nivel, lo que más mueve la aguja en búsqueda por lo que menos cuesta resolver',
    affected: (pages: number) => (pages === 1 ? '1 página afectada' : `${pages} páginas afectadas`),
    view: 'Ver',
    viewAria: (issueName: string) => `Ver las páginas afectadas por ${issueName}`,
    effortLabel: 'Esfuerzo',
    // El esfuerzo es un juicio editorial de Efeonce, no un dato del proveedor: se declara
    // como estimación para que nadie lo lea como una medición del crawl.
    effortHint: 'El esfuerzo es una estimación nuestra, no un dato del crawl.',
    unknownIssue: (issueType: string) => `Check sin catalogar (${issueType})`,
    unknownIssueHint: 'Este check es nuevo en el proveedor y aún no tiene ficha en español.',
    filteredEmpty: (severity: string) => `Sin issues de ${severity.toLowerCase()} en este crawl.`,
    filteredCount: (shown: number, total: number) => `Mostrando ${shown} de ${total} issues`
  },

  severity: {
    critical: 'Crítico',
    warning: 'Atención',
    notice: 'Info'
  },

  effort: {
    low: 'Rápido',
    medium: 'Medio',
    high: 'Alto'
  },

  drill: {
    title: (issueName: string, pages: number) => `${issueName} — ${pages === 1 ? '1 página' : `${pages} páginas`}`,
    close: 'Cerrar',
    closeAria: 'Cerrar el detalle del issue y volver a la lista',
    colUrl: 'URL',
    colDetail: 'Detalle',
    detailEmpty: 'Sin detalle adicional',
    httpStatus: (code: number) => `HTTP ${code}`,
    onpageScore: (score: number) => `Puntaje de página ${score}`,
    truncated: (shown: number, total: number) => `Mostramos ${shown} de ${total} páginas de este grupo.`,
    // El diagnóstico tiene que poder salir de la pantalla: el site audit es material de
    // conversación de SOW, y hasta acá terminaba en copiar a mano.
    copy: 'Copiar',
    copyAria: (issueName: string) => `Copiar las páginas afectadas por ${issueName}`,
    copied: 'Copiado',
    copyFailed: 'No pudimos copiar. Selecciona el texto a mano.',
    // TSV: pega como texto en un doc y como columnas en una planilla, sin pedirle al
    // operador que elija formato.
    copyHeader: 'URL\tDetalle'
  },

  states: {
    emptyTitle: 'Sin auditoría reciente',
    emptyDescription: (domain: string) =>
      `Aún no corrimos un crawl para ${domain}. Corre una auditoría para ver la salud técnica.`,
    emptyDescriptionNoDomain: 'Aún no corrimos un crawl para este sitio. Corre una auditoría para ver la salud técnica.',

    runningTitle: 'Auditoría en curso',
    runningDescription: (domain: string) => `Estamos revisando ${domain}. Esto puede tardar unos minutos.`,
    runningDescriptionNoDomain: 'Estamos revisando el sitio. Esto puede tardar unos minutos.',

    cleanTitle: 'Sin issues detectados',
    cleanDescription: 'El crawl terminó y no encontró problemas de los que revisamos.',

    degradedTitle: 'El crawl terminó parcialmente',
    degradedDescription:
      'Algunas páginas no se pudieron revisar. Lo que ves es real, pero incompleto: no lo leas como el sitio entero.',

    failedTitle: 'La auditoría falló',
    failedDescription: 'No pudimos completar el crawl.',
    failedCta: 'Reintentar',

    readerErrorTitle: 'No pudimos cargar la auditoría',
    readerErrorDescription: 'Hubo un problema al leer el reporte.',
    readerErrorCta: 'Reintentar',

    deniedTitle: 'Sin acceso',
    deniedDescription: 'No tienes permiso para ver la auditoría de este Space.',

    noTargetTitle: 'Este Space no tiene un sitio configurado',
    noTargetDescription:
      'Hay que crear el target del sitio antes de poder auditarlo. Pídeselo a quien administre el módulo.',

    noSpacesTitle: 'Sin Spaces con SEO activo',
    noSpacesDescription: 'Ningún Space que puedas ver tiene el módulo SEO habilitado.'
  },

  runErrors: {
    alreadyRunning: 'Ya hay una auditoría corriendo para este sitio. Espera a que termine.',
    alreadyToday: 'Ya corrimos una auditoría para este sitio hoy.',
    quotaExhausted: 'Este Space agotó su cupo de auditorías del mes.',
    budgetExhausted: 'Este Space agotó su presupuesto de proveedor del mes.',
    notEntitled: 'Este Space no tiene el módulo SEO habilitado para correr auditorías.',
    generic: 'No pudimos encolar la auditoría. Intenta de nuevo.'
  }
} as const

/**
 * TASK-1309 — Ficha es-CL de cada check OnPage que Greenhouse materializa.
 *
 * El reader entrega el `issueType` como id de MÁQUINA del proveedor (`is_broken`,
 * `no_h1_tag`): sin esta ficha la lista priorizada sería una columna de identificadores
 * en inglés. Las claves espejan el allowlist curado de
 * `src/lib/growth/seo/site-audit/findings-map.ts` — cuando allá entre un check nuevo,
 * acá entra su ficha. Mientras no la tenga, la UI degrada nombrando el id crudo en vez
 * de esconder el issue: un problema sin traducir sigue siendo un problema.
 *
 * ⚠️ `effort` es un juicio editorial de Efeonce, NO un dato del crawl — DataForSEO no
 * reporta costo de arreglo. Existe porque la pregunta del operador es "¿qué ataco
 * primero?", y severidad sola no la responde: 300 imágenes sin `alt` y un 5xx no se
 * atacan igual aunque compartan volumen. Se muestra siempre etiquetado como estimación.
 *   low    → cambio de plantilla o contenido, se resuelve en lote
 *   medium → requiere criterio por página o tocar reglas del sitio
 *   high   → infraestructura, arquitectura o trabajo editorial de fondo
 *
 * ⚠️ `value` es cuánto mueve la aguja EN BÚSQUEDA, y NO es redundante con la severidad.
 * La severidad mide qué tan roto está algo; `value` mide cuánto importa arreglarlo. Dentro
 * de `notice` conviven higiene cosmética y señales reales: un favicon ausente afecta la
 * presentación de marca en el SERP, un `alt` ausente afecta búsqueda de imágenes y
 * accesibilidad. Sin este eje, el orden por alcance ascendía la trivia que toca todo el
 * sitio por encima de lo que de verdad conviene atacar (hallazgo de la auditoría `seo-aeo`
 * 2026-08-08: "Sin favicon · 91 páginas" encabezaba el tier por sobre "Imágenes sin texto
 * alternativo · 50 páginas").
 *   high   → rastreo, indexación, canonicalización, contenido, datos estructurados
 *   medium → CTR, experiencia de página, búsqueda de imágenes
 *   low    → higiene sin efecto de búsqueda medible
 */
export const GH_GROWTH_SEO_AUDIT_ISSUES: Readonly<
  Record<
    string,
    {
      readonly label: string
      readonly effort: 'low' | 'medium' | 'high'
      /** Cuánto mueve la aguja en búsqueda. NO es lo mismo que la severidad. */
      readonly value: 'low' | 'medium' | 'high'
      readonly hint: string
    }
  >
> = {
  // Estado HTTP / disponibilidad.
  is_broken: { label: 'Página rota', effort: 'high', value: 'high', hint: 'La página no responde correctamente y no puede indexarse.' },
  is_4xx_code: { label: 'Error 4xx', effort: 'medium', value: 'high', hint: 'La página responde "no encontrada" o "sin acceso" a quien la visita.' },
  is_5xx_code: { label: 'Error 5xx del servidor', effort: 'high', value: 'high', hint: 'El servidor falla al entregar la página. Es un problema de infraestructura.' },

  // Canonicalización.
  canonical_to_broken: { label: 'Canonical apunta a una página rota', effort: 'medium', value: 'high', hint: 'La página declara como versión oficial una URL que no funciona.' },
  recursive_canonical: { label: 'Canonical recursivo', effort: 'medium', value: 'high', hint: 'Las etiquetas canonical se apuntan entre sí en círculo y anulan la señal.' },
  canonical_to_redirect: { label: 'Canonical apunta a una redirección', effort: 'medium', value: 'medium', hint: 'La versión oficial declarada redirige a otra parte: la señal se diluye.' },
  canonical_chain: { label: 'Cadena de canonicals', effort: 'medium', value: 'medium', hint: 'Varias canonical encadenadas antes de llegar a la URL final.' },
  is_link_relation_conflict: { label: 'Conflicto entre relaciones de enlace', effort: 'medium', value: 'medium', hint: 'Las etiquetas de relación se contradicen sobre cuál es la versión buena.' },

  // Meta esencial.
  no_title: { label: 'Sin etiqueta de título', effort: 'low', value: 'high', hint: 'La página no declara título: el buscador inventa uno.' },
  no_description: { label: 'Sin meta descripción', effort: 'low', value: 'medium', hint: 'Sin descripción propia, el resumen del resultado lo arma el buscador.' },
  duplicate_title_tag: { label: 'Título duplicado', effort: 'medium', value: 'high', hint: 'Varias páginas comparten el mismo título y compiten entre sí.' },
  duplicate_meta_tags: { label: 'Meta tags duplicados', effort: 'medium', value: 'medium', hint: 'Metadatos repetidos entre páginas distintas.' },
  no_h1_tag: { label: 'Sin encabezado H1', effort: 'low', value: 'medium', hint: 'La página no declara de qué trata en su encabezado principal.' },
  title_too_long: { label: 'Título demasiado largo', effort: 'low', value: 'medium', hint: 'El buscador lo va a recortar en el resultado.' },
  title_too_short: { label: 'Título demasiado corto', effort: 'low', value: 'medium', hint: 'El título no alcanza a describir la página.' },

  // Redirects y protocolo.
  redirect_chain: { label: 'Cadena de redirecciones', effort: 'medium', value: 'medium', hint: 'La URL pasa por varios saltos antes de llegar a destino.' },
  has_meta_refresh_redirect: { label: 'Redirección por meta refresh', effort: 'low', value: 'medium', hint: 'Redirección hecha con una técnica que el buscador no interpreta bien.' },
  https_to_http_links: { label: 'Enlaces de HTTPS a HTTP', effort: 'medium', value: 'medium', hint: 'Una página segura enlaza a contenido sin cifrar.' },
  is_http: { label: 'Página servida por HTTP', effort: 'high', value: 'high', hint: 'La página no usa conexión segura.' },

  // Contenido.
  low_content_rate: { label: 'Poco contenido respecto al código', effort: 'high', value: 'high', hint: 'La página tiene mucho más marcado que texto útil.' },
  low_character_count: { label: 'Muy poco texto', effort: 'high', value: 'high', hint: 'El contenido es demasiado breve para responder una búsqueda.' },
  low_readability_rate: { label: 'Lectura difícil', effort: 'high', value: 'medium', hint: 'El texto exige más esfuerzo de lectura del recomendable.' },
  lorem_ipsum: { label: 'Contenido de relleno', effort: 'low', value: 'high', hint: 'Quedó texto de maqueta publicado.' },

  // Estructura y descubrimiento.
  is_orphan_page: { label: 'Página huérfana', effort: 'medium', value: 'high', hint: 'Ninguna otra página del sitio la enlaza: es difícil de descubrir.' },

  // Datos estructurados (insumo AEO).
  has_micromarkup_errors: { label: 'Errores en los datos estructurados', effort: 'medium', value: 'high', hint: 'El marcado que alimenta resultados enriquecidos y respuestas de IA tiene errores.' },

  // Performance y tamaño (lab, diagnóstico).
  high_loading_time: { label: 'Tiempo de carga alto', effort: 'high', value: 'medium', hint: 'La página tarda más de lo razonable en responder. Es una medición de laboratorio: la señal que Google usa para rankear viene de datos de campo en Search Console.' },
  large_page_size: { label: 'Página muy pesada', effort: 'medium', value: 'medium', hint: 'El peso de la página castiga a quien la abre con conexión lenta. Es una medición de laboratorio: la señal que Google usa para rankear viene de datos de campo en Search Console.' },
  has_render_blocking_resources: { label: 'Recursos que bloquean el dibujado', effort: 'medium', value: 'medium', hint: 'Scripts o estilos que retrasan lo primero que se ve. Es una medición de laboratorio: la señal que Google usa para rankear viene de datos de campo en Search Console.' },
  no_content_encoding: { label: 'Sin compresión de contenido', effort: 'low', value: 'low', hint: 'El servidor entrega la página sin comprimir. Es una medición de laboratorio: la señal que Google usa para rankear viene de datos de campo en Search Console.' },

  // Higiene HTML.
  no_image_alt: { label: 'Imágenes sin texto alternativo', effort: 'low', value: 'medium', hint: 'Las imágenes no describen su contenido: afecta accesibilidad y búsqueda de imágenes.' },
  no_favicon: { label: 'Sin favicon', effort: 'low', value: 'low', hint: 'El sitio no declara su ícono de pestaña.' },
  no_doctype: { label: 'Sin doctype', effort: 'low', value: 'low', hint: 'El documento no declara su tipo y el navegador adivina cómo interpretarlo.' },
  no_encoding_meta_tag: { label: 'Sin meta de codificación', effort: 'low', value: 'low', hint: 'La página no declara su codificación de caracteres.' },
  deprecated_html_tags: { label: 'Etiquetas HTML obsoletas', effort: 'medium', value: 'low', hint: 'El marcado usa etiquetas que el estándar ya retiró.' }
}

/**
 * TASK-1709 — Diagnóstico SEO de prospecto (tier `prospect`).
 *
 * Registro comercial FORMAL (usted/institucional): estos labels alimentan el contrato
 * de salida cuyo destino final es un artefacto client-facing para un prospecto con el
 * que aún no hay relación comercial. Regla dura del carril: toda cifra es estimada y
 * lo dice — la lente no tiene variante "medido" acá a propósito (no existe Search
 * Console de un prospecto), y NINGÚN label afirma salud ni emite veredicto.
 */
export const GH_GROWTH_SEO_PROSPECT = {
  lens: {
    estimated: 'Estimado · fuente externa',
    estimatedHint:
      'Dato estimado por un proveedor externo a partir de información pública, con su fecha de captura. No es una medición del sitio.'
  },
  status: {
    running: 'En proceso',
    completed: 'Completado',
    failed: 'No completado',
    cost_blocked: 'Detenido por tope de costo'
  } as const,
  statusHint: {
    cost_blocked:
      'El costo previsto del diagnóstico supera el tope autorizado. No se realizó ninguna consulta al proveedor.'
  },
  factKinds: {
    ranked_keywords_total: 'Búsquedas donde el dominio aparece',
    ranked_keywords_top10: 'Búsquedas en primera página',
    striking_distance_keywords: 'Búsquedas a corta distancia de la primera página',
    ai_overview_citations: 'Citas en AI Overviews de Google',
    estimated_monthly_traffic: 'Tráfico orgánico mensual estimado',
    competitors_identified: 'Competidores identificados en el mercado de búsqueda',
    link_gap_referring_domains: 'Dominios que enlazan a la competencia y no al sitio',
    site_robots_txt: 'Archivo robots.txt',
    site_jsonld_blocks: 'Datos estructurados en la portada',
    site_sitemap: 'Mapa del sitio (sitemap.xml)',
    site_home_observability: 'Portada legible para sistemas automatizados',
    site_crawl_blocked: 'Acceso de rastreo restringido por el sitio',
    onpage_critical_findings: 'Páginas cubiertas por auditoría técnica previa'
  } as const,
  magnitudePending: 'Sin dato',
  capturedAtLabel: 'Capturado el'
} as const
