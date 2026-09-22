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
    otd: 'Entregas a tiempo'
  } as Readonly<Record<string, string>>,

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
  }
} as const
