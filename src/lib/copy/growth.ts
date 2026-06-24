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
  TrendDirection
} from '@/lib/growth/ai-visibility/report/contracts'
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

  // Nota del finding headline cuando el KPI dominante es el resultado compuesto (ai_visibility).
  outcome_note: 'Tu visibilidad en IA resume las brechas de las dimensiones que la explican.',

  // Nota del finding headline cuando la dimensión dominante está en buen estado.
  headline_strength_note: 'Es tu mayor fortaleza relativa; mantén la frescura para sostenerla.',

  disclaimer:
    'Diagnóstico muestreado y asistido por IA. No garantiza posiciones ni resultados; refleja una muestra de respuestas en la fecha del análisis.'
} as const
