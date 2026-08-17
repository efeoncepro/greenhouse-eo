// TASK-1734 Slice 3 — Eval de GRADO PROMOCIÓN (ADR D2/Slice 3): harness PURO (sin IO/provider)
// sobre un dataset versionado con doble rating humano independiente + adjudicación.
//
// Diferencia con `eval-runner.ts` (TASK-1361, smoke de provider con 6 casos curados): este
// harness mide lo que la promoción a revisión por excepción exige de verdad —
//   - acuerdo humano-humano (MAE + Pearson entre raters independientes) como piso de referencia;
//   - acuerdo IA-humano RELATIVO a ese piso (la IA debe quedar dentro del rango de desacuerdo
//     humano, nunca un número absoluto inventado);
//   - tolerancia calibrada POR BANDA, matriz de confusión por banda y CERO confusiones entre
//     bandas no adyacentes;
//   - repeat stability (N corridas del mismo caso → stddev), tasa de abstención y fallos por
//     pregunta/template con intervalos de confianza básicos (bootstrap determinístico).
//
// ⚠️ REALIDAD DEL DATASET: el dataset de promoción REAL exige doble rating humano independiente
// + adjudicación — trabajo de personas (Talent: gold set, rater training, adjudicación) con lead
// time propio. El fixture `promotion-dataset.synthetic.v1.json` existe SOLO para probar este
// harness y está marcado `synthetic: true`; el gate mecánico
// (`scripts/hiring/assessment-ai-promotion-gate.mjs`) BLOQUEA la promoción mientras el dataset
// humano no exista. Este módulo NUNCA fabrica ratings humanos.
//
// Módulo puro: cero IO, cero env. `runOne` es inyectable (CLI pasa el provider real; tests
// pasan fakes determinísticos). Los thresholds efectivos del runtime viven en
// `scoring-run/config.ts` (`getAiRunPromotionThresholds()`); acá viven los defaults versionados.

// ── Bandas canónicas del eval (escala 0–100) ──

export const PROMOTION_SCORE_BANDS = ['low', 'mid', 'high'] as const
export type PromotionScoreBand = (typeof PROMOTION_SCORE_BANDS)[number]

// ── Thresholds de promoción (defaults versionados; override acotado en config.ts) ──

/**
 * Versión de los thresholds que entra al reporte. Cambiar cualquier default DEBE bump-ear
 * esta versión (un reporte con thresholds viejos queda stale para el gate).
 */
export const HIRING_ASSESSMENT_AI_PROMOTION_THRESHOLDS_VERSION =
  'hiring_assessment_ai_promotion_thresholds.v1'

export interface AiRunPromotionThresholds {
  version: string
  /** Banda de tolerancia por defecto (puntos 0–100) cuando la banda no define una propia. */
  toleranceBandDefault: number
  /** Tolerancia calibrada por banda (mid contiene la banda decision-near ⇒ más estricta). */
  toleranceBandByBand: Record<PromotionScoreBand, number>
  /** Fronteras de banda: low = [0, lowMax) · mid = [lowMax, midMax) · high = [midMax, 100]. */
  bandBoundaries: { lowMax: number; midMax: number }
  /**
   * Acuerdo IA-humano RELATIVO al humano-humano: exige
   * `aiHumanMae <= humanHumanMae * maxAiHumanMaeRatio`. Nunca un absoluto universal.
   */
  maxAiHumanMaeRatio: number
  /** Tasa mínima de casos estándar dentro de tolerancia (sobre los puntuados). */
  minWithinToleranceRate: number
  /** Confusiones entre bandas NO adyacentes (low↔high) permitidas. HARD RULE: 0, sin override. */
  maxNonAdjacentBandConfusions: 0
  /** Tasa máxima de abstención sobre casos estándar (los adversariales DEBEN abstener/rutear). */
  maxAbstentionRate: number
  /** Corridas por caso para repeat stability. */
  repeatRuns: number
  /** Stddev máximo permitido entre corridas del mismo caso (puntos 0–100). */
  maxRepeatStddev: number
  /**
   * Mínimo de casos por estrato (template × banda) y mínimo de casos adversariales.
   * ⚠️ VALORES PROVISIONALES DE HARNESS: la spec prohíbe inventar un N universal — los mínimos
   * DEFINITIVOS los fija la policy aceptada JUNTO con el dataset humano real (Talent + policy
   * owner). Estos defaults existen solo para que el gate tenga un piso mecánico ejecutable.
   */
  minCasesPerStratum: number
  minAdversarialCases: number
  /** Iteraciones del bootstrap determinístico para los intervalos de confianza. */
  bootstrapIterations: number
}

/**
 * ⚠️ Los VALORES DEFINITIVOS de todos estos thresholds los fija la policy aceptada con el
 * dataset de promoción humano real (ADR D2 + Slice 3). Estos defaults son el piso conservador
 * del harness: sirven para probar la mecánica del gate, no como evidencia de promoción.
 */
export const DEFAULT_AI_RUN_PROMOTION_THRESHOLDS: AiRunPromotionThresholds = {
  version: HIRING_ASSESSMENT_AI_PROMOTION_THRESHOLDS_VERSION,
  toleranceBandDefault: 15,
  toleranceBandByBand: { low: 15, mid: 10, high: 15 },
  bandBoundaries: { lowMax: 40, midMax: 70 },
  maxAiHumanMaeRatio: 1,
  minWithinToleranceRate: 0.85,
  maxNonAdjacentBandConfusions: 0,
  maxAbstentionRate: 0.2,
  repeatRuns: 3,
  maxRepeatStddev: 5,
  minCasesPerStratum: 5,
  minAdversarialCases: 5,
  bootstrapIterations: 1000,
}

export const resolvePromotionBand = (
  score: number,
  thresholds: AiRunPromotionThresholds,
): PromotionScoreBand => {
  if (score < thresholds.bandBoundaries.lowMax) return 'low'
  if (score < thresholds.bandBoundaries.midMax) return 'mid'

  return 'high'
}

// ── Dataset (formato documentado en __fixtures__/promotion-dataset.schema.md) ──

export type PromotionEvalCaseKind = 'standard' | 'adversarial'

export interface PromotionEvalCase {
  id: string
  questionId: string
  templateKey: string
  templateVersion: string
  competencyKey: string
  competencyName: string
  level: string
  questionPrompt: string
  rubric: Record<string, unknown>
  /** Respuesta sintética o real ANONIMIZADA con propósito aprobado; nunca texto crudo de candidato sin contrato. */
  answerText: string
  caseKind: PromotionEvalCaseKind
  /**
   * Rating del rater A, independiente (sin ver B ni la propuesta IA).
   * `null` mientras el INSTRUMENTO no haya sido calificado por una persona — ningún agente
   * puede rellenarlo, y el gate bloquea mientras siga vacío.
   */
  humanRatingA: number | null
  /** Rating del rater B, independiente (sin ver A ni la propuesta IA). `null` = sin calificar. */
  humanRatingB: number | null
  /** Score adjudicado (tercera instancia humana resuelve la discrepancia A/B). `null` = sin adjudicar. */
  adjudicatedScore: number | null
  /**
   * Banda declarada; el validador exige consistencia con `adjudicatedScore`. `null` mientras no
   * exista adjudicación — declararla antes anclaría al rater con el estrato de origen.
   */
  band: PromotionScoreBand | null
  /**
   * Ruta C (routing-only): etiqueta humana de la decisión BINARIA "¿esta respuesta necesita
   * revisión humana?". Habilita mejorar el router, NUNCA `batch_eligible`.
   */
  humanNeedsReview?: boolean | null
  /**
   * Razón que el rater anota cuando duda (protocolo §Reglas duras). Es material de adjudicación
   * y de mejora de la BARS: NUNCA entra a ninguna métrica ni al veredicto del gate.
   */
  ratingNoteA?: string | null
  ratingNoteB?: string | null
}

// ── Diseño de rating: qué evidencia trae REALMENTE el dataset ──
//
// El caso real: no siempre hay dos personas de Talent disponibles. En vez de decir sólo
// "BLOQUEADO", el harness y el gate NOMBRAN la ruta que detectan y declaran qué habilita cada
// una. Ninguna de las rutas degradadas equivale al doble rating: se dice, no se vende.

export const PROMOTION_RATING_DESIGNS = [
  /** A y B por raters distintos, independientes, con adjudicación. Única ruta que habilita `batch_eligible`. */
  'double_rating_independent',
  /** Ruta B: el MISMO rater califica dos veces con ≥7 días y orden distinto (estabilidad intra-rater). */
  'test_retest_intra_rater',
  /** Ruta C: sólo la decisión binaria "¿necesita revisión humana?", sin score continuo. */
  'routing_decision_only',
  /** El instrumento existe pero nadie lo ha calificado todavía. */
  'unrated_instrument',
] as const
export type PromotionRatingDesign = (typeof PROMOTION_RATING_DESIGNS)[number]

export interface PromotionRouteCapability {
  label: string
  enables: string[]
  doesNotEnable: string[]
}

/**
 * Qué habilita cada ruta, en términos de los flags REALES de TASK-1734. Es el contrato que el
 * gate imprime: una ruta degradada no es "casi" el doble rating, habilita cosas distintas.
 */
export const PROMOTION_ROUTE_CAPABILITIES: Record<PromotionRatingDesign, PromotionRouteCapability> = {
  double_rating_independent: {
    label: 'Ruta A — doble rating humano independiente + adjudicación',
    enables: [
      'Evaluar los gates métricos completos (acuerdo IA-humano relativo al humano-humano, tolerancia, bandas, abstención, estabilidad).',
      'Con gate VERDE + canary owner nombrado: considerar HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED (siempre shadow → canary primero).',
    ],
    doesNotEnable: [
      'Saltarse el shadow y el canary: el gate verde autoriza evaluar la promoción, no encender el flag de una.',
    ],
  },
  test_retest_intra_rater: {
    label: 'Ruta B — test-retest intra-rater (un solo rater, dos pasadas ≥7 días)',
    enables: [
      'Medir estabilidad INTRA-rater y detectar deriva del modelo entre corridas (repeat stability, matriz de bandas como diagnóstico).',
      'Sostener un canary observado con revisión humana total, sin reducir revisión.',
    ],
    doesNotEnable: [
      'HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED / batch_eligible: no mide la varianza ENTRE personas, que es la mayor de las dos.',
      'Usar el MAE "humano-humano" como piso de referencia: acá ese número es estabilidad de una persona consigo misma, no desacuerdo humano.',
    ],
  },
  routing_decision_only: {
    label: 'Ruta C — sólo la decisión binaria de ruteo (¿necesita revisión humana?)',
    enables: [
      'Medir y mejorar el ROUTER de riesgo (precisión/recall de mandatory_review) con un solo rater competente.',
      'Ajustar señales y thresholds de la risk policy con evidencia humana real.',
    ],
    doesNotEnable: [
      'HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED / batch_eligible: no hay score continuo, así que no hay acuerdo IA-humano que medir.',
      'Cualquier afirmación sobre exactitud del score de la IA.',
    ],
  },
  unrated_instrument: {
    label: 'Instrumento SIN calificar — la muestra existe, la evidencia no',
    enables: [
      'Repartir el instrumento a los raters entrenados con la BARS y empezar a calificar.',
    ],
    doesNotEnable: [
      'Absolutamente nada del rollout: sin ratings humanos no hay evidencia de promoción de ningún grado.',
    ],
  },
}

/**
 * Detecta la ruta por la EVIDENCIA del dataset, no sólo por lo que declara `_meta`. Si la
 * declaración y los datos no coinciden, manda el dato y el desacuerdo se reporta como blocker
 * (`rating_design_declaration_mismatch`): una declaración es auditable, no autoritativa.
 */
export const detectPromotionRatingDesign = (
  dataset: PromotionDataset,
): { design: PromotionRatingDesign; declared: PromotionRatingDesign | null; evidence: string[] } => {
  const cases = dataset.cases ?? []
  const declared = dataset._meta?.ratingDesign ?? null
  const evidence: string[] = []

  const withA = cases.filter((c) => Number.isFinite(c.humanRatingA as number)).length
  const withB = cases.filter((c) => Number.isFinite(c.humanRatingB as number)).length
  const withAdjudication = cases.filter((c) => Number.isFinite(c.adjudicatedScore as number)).length
  const withRoutingLabel = cases.filter((c) => typeof c.humanNeedsReview === 'boolean').length

  evidence.push(
    `casos=${cases.length} · con ratingA=${withA} · con ratingB=${withB} · con adjudicación=${withAdjudication} · con etiqueta de ruteo=${withRoutingLabel}`,
  )

  if (cases.length === 0 || (withA === 0 && withB === 0 && withRoutingLabel === 0)) {
    evidence.push('ningún caso trae rating ni etiqueta humana ⇒ instrumento sin calificar')

    return { design: 'unrated_instrument', declared, evidence }
  }

  if (withA === 0 && withB === 0 && withRoutingLabel > 0) {
    evidence.push('sólo etiquetas binarias de ruteo, sin score continuo ⇒ ruta C')

    return { design: 'routing_decision_only', declared, evidence }
  }

  if (declared === 'test_retest_intra_rater' || dataset._meta?.retestIntervalDays != null) {
    evidence.push(
      `dos pasadas del MISMO rater (intervalo declarado: ${dataset._meta?.retestIntervalDays ?? 'no declarado'} días) ⇒ ruta B`,
    )

    return { design: 'test_retest_intra_rater', declared, evidence }
  }

  if (withA > 0 && withB > 0 && dataset._meta?.doubleRating?.independent === true) {
    evidence.push('dos raters independientes declarados + ratings A/B presentes ⇒ ruta A')

    return { design: 'double_rating_independent', declared, evidence }
  }

  evidence.push('hay ratings pero `_meta.doubleRating.independent` no está declarado en true ⇒ no califica como ruta A')

  return { design: 'test_retest_intra_rater', declared, evidence }
}

export interface PromotionDatasetMeta {
  version: string
  /** true ⇒ el dataset sirve SOLO para probar el harness; el gate bloquea la promoción. */
  synthetic: boolean
  scale: string
  /** Ruta declarada; la detección la contrasta contra la evidencia real de los casos. */
  ratingDesign?: PromotionRatingDesign
  /** Ruta B: días entre la primera y la segunda pasada del mismo rater (protocolo exige ≥7). */
  retestIntervalDays?: number | null
  doubleRating: {
    /** Ratings A y B emitidos de forma independiente (sin verse entre sí ni ver la IA). */
    independent: boolean
    /** Discrepancias resueltas por adjudicación humana (no promedio automático). */
    adjudicated: boolean
    /** Referencia al material de rater training / gold set; null mientras Talent lo produce. */
    raterTrainingReference: string | null
  }
  notes?: string
}

export interface PromotionDataset {
  _meta: PromotionDatasetMeta
  cases: PromotionEvalCase[]
}

// ── Validación de dataset (blockers con código estable; el gate mjs replica los de JSON) ──

export const validatePromotionDataset = (
  dataset: PromotionDataset,
  thresholds: AiRunPromotionThresholds = DEFAULT_AI_RUN_PROMOTION_THRESHOLDS,
): string[] => {
  const blockers: string[] = []

  if (dataset._meta.synthetic) {
    blockers.push('dataset_synthetic: dataset marcado synthetic — solo prueba el harness, jamás promueve')
  }

  const { design, declared } = detectPromotionRatingDesign(dataset)

  // Un instrumento sin calificar es un estado LEGÍTIMO del flujo, no un archivo corrupto: se
  // reporta como tal (un blocker claro) en vez de escupir un `ratings_invalid` por cada caso.
  if (design === 'unrated_instrument') {
    blockers.push(
      'dataset_unrated_instrument: el instrumento existe pero ningún humano lo ha calificado — ' +
        'los ratings son trabajo de personas y ningún agente puede fabricarlos',
    )
  } else if (design !== 'double_rating_independent') {
    blockers.push(
      `dataset_rating_design_insufficient: ruta detectada \`${design}\` — no habilita batch_eligible ` +
        '(sólo la ruta A, doble rating humano independiente + adjudicación, lo hace)',
    )
  }

  if (declared != null && declared !== design) {
    blockers.push(
      `rating_design_declaration_mismatch: \`_meta.ratingDesign\` declara \`${declared}\` pero la evidencia de los casos es \`${design}\``,
    )
  }

  if (!dataset._meta.doubleRating?.independent || !dataset._meta.doubleRating?.adjudicated) {
    blockers.push('dataset_double_rating_incomplete: falta doble rating humano independiente + adjudicación')
  }

  const seen = new Set<string>()

  for (const c of dataset.cases) {
    if (seen.has(c.id)) blockers.push(`dataset_duplicate_case_ids: ${c.id}`)
    seen.add(c.id)

    // En un instrumento sin calificar los ratings vacíos son lo esperado: no se reporta caso a caso.
    if (design === 'unrated_instrument') continue

    const ratingsOk = [c.humanRatingA, c.humanRatingB, c.adjudicatedScore].every(
      (v) => Number.isFinite(v) && (v as number) >= 0 && (v as number) <= 100,
    )

    if (!ratingsOk) {
      blockers.push(`dataset_case_ratings_invalid: ${c.id}`)
      continue
    }

    if (resolvePromotionBand(c.adjudicatedScore as number, thresholds) !== c.band) {
      blockers.push(`dataset_band_mismatch: ${c.id} declara ${c.band} pero adjudicatedScore=${c.adjudicatedScore}`)
    }
  }

  const standard = dataset.cases.filter((c) => c.caseKind === 'standard')
  const adversarial = dataset.cases.filter((c) => c.caseKind === 'adversarial')

  const strata = new Map<string, number>()

  for (const c of standard) {
    // Sin adjudicación no hay banda, y un estrato `…:null` con muchos casos daría un falso verde.
    if (c.band == null) continue

    const key = `${c.templateKey}@${c.templateVersion}:${c.band}`

    strata.set(key, (strata.get(key) ?? 0) + 1)
  }

  if (strata.size === 0 && standard.length > 0) {
    blockers.push(
      'stratum_bands_undetermined: ningún caso estándar tiene banda adjudicada — los estratos template×banda ' +
        'sólo existen después de la adjudicación humana',
    )
  }

  for (const [key, count] of strata) {
    if (count < thresholds.minCasesPerStratum) {
      blockers.push(`stratum_minimum_unmet: ${key} tiene ${count} < ${thresholds.minCasesPerStratum}`)
    }
  }

  if (adversarial.length < thresholds.minAdversarialCases) {
    blockers.push(
      `adversarial_minimum_unmet: ${adversarial.length} < ${thresholds.minAdversarialCases} casos adversariales`,
    )
  }

  return blockers
}

// ── Runner inyectable (attempt permite fakes determinísticos por corrida) ──

export type RunOnePromotionScoring = (
  input: PromotionEvalCase,
  attempt: number,
) => Promise<{ score: number | null }>

// ── Estadística básica determinística ──

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

const stddev = (xs: number[]): number | null => {
  if (xs.length < 2) return null

  const m = mean(xs)

  return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1))
}

const pearson = (xs: number[], ys: number[]): number | null => {
  const n = xs.length

  if (n < 2) return null

  const mx = mean(xs)
  const my = mean(ys)
  let num = 0
  let dx2 = 0
  let dy2 = 0

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my

    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }

  const den = Math.sqrt(dx2 * dy2)

  if (den === 0) return null

  return num / den
}

/** PRNG determinístico (mulberry32): el bootstrap SIEMPRE reproduce el mismo intervalo. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a

    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** IC 95% bootstrap simple (percentiles 2.5/97.5 de la media re-muestreada). */
export const bootstrapCi95 = (
  values: number[],
  iterations: number,
  seed = 0xc0ffee,
): [number, number] | null => {
  if (values.length < 2) return null

  const rand = mulberry32(seed)
  const means: number[] = []

  for (let b = 0; b < iterations; b++) {
    let acc = 0

    for (let i = 0; i < values.length; i++) {
      acc += values[Math.floor(rand() * values.length)]
    }

    means.push(acc / values.length)
  }

  means.sort((a, b) => a - b)

  const lo = means[Math.floor(0.025 * (means.length - 1))]
  const hi = means[Math.ceil(0.975 * (means.length - 1))]

  return [lo, hi]
}

// ── Resultados y reporte ──

export interface PromotionEvalCaseResult {
  id: string
  questionId: string
  templateKey: string
  templateVersion: string
  caseKind: PromotionEvalCaseKind
  band: PromotionScoreBand | null
  humanRatingA: number | null
  humanRatingB: number | null
  adjudicatedScore: number | null
  /** Score de la PRIMERA corrida (contrato determinístico); null = abstención/fallo del provider. */
  aiScore: number | null
  repeatScores: Array<number | null>
  /** Stddev entre corridas con score (null si <2 corridas puntuadas). */
  repeatStddev: number | null
  toleranceBand: number
  absoluteError: number | null
  withinTolerance: boolean | null
  aiBand: PromotionScoreBand | null
  /** true si |bandIndex(adjudicada) − bandIndex(IA)| > 1 (low↔high). */
  nonAdjacentConfusion: boolean
}

export interface PromotionEvalGroupStats {
  key: string
  cases: number
  scored: number
  abstained: number
  outsideTolerance: number
  bandMismatch: number
  mae: number | null
  failureRate: number | null
  failureRateCi95: [number, number] | null
}

export interface PromotionEvalReport {
  generatedAt: string
  datasetVersion: string
  datasetSynthetic: boolean
  datasetPath: string | null
  /**
   * Ruta de rating detectada por evidencia + qué habilita. El gate la re-deriva del dataset JSON
   * de forma independiente (mismo patrón que los thresholds: se computa una vez acá y viaja
   * embebida, pero el gate no confía ciegamente y verifica que coincidan).
   */
  ratingDesign: {
    detected: PromotionRatingDesign
    declared: PromotionRatingDesign | null
    evidence: string[]
    capability: PromotionRouteCapability
  }
  thresholds: AiRunPromotionThresholds
  totals: { cases: number; standard: number; adversarial: number; scored: number; abstained: number }
  /** Métricas headline SOLO sobre casos estándar puntuados. */
  aiHuman: {
    mae: number | null
    pearson: number | null
    withinToleranceRate: number | null
    maeCi95: [number, number] | null
    withinToleranceRateCi95: [number, number] | null
  }
  /** Piso de referencia: desacuerdo entre raters humanos independientes (casos estándar). */
  humanHuman: { mae: number | null; pearson: number | null }
  /** aiHumanMae / humanHumanMae — la IA debe quedar dentro del rango de desacuerdo humano. */
  relativeAgreement: { ratio: number | null }
  /** Abstención sobre casos estándar (cuenta contra) vs adversariales (comportamiento deseado). */
  abstention: { standardRate: number | null; adversarialRate: number | null; adversarialScored: number }
  bandConfusion: {
    /** filas = banda adjudicada · columnas = banda IA o 'abstained' (solo casos estándar). */
    matrix: Record<PromotionScoreBand, Record<PromotionScoreBand | 'abstained', number>>
    nonAdjacentCount: number
  }
  repeatStability: { runsPerCase: number; meanStddev: number | null; maxStddev: number | null }
  byQuestion: PromotionEvalGroupStats[]
  byTemplate: PromotionEvalGroupStats[]
  /** Veredicto mecánico: blockers de dataset + métricas. Vacío NO implica promoción automática. */
  evaluation: { promotable: boolean; blockers: string[] }
  results: PromotionEvalCaseResult[]
}

const BAND_INDEX: Record<PromotionScoreBand, number> = { low: 0, mid: 1, high: 2 }

const emptyConfusionMatrix = (): PromotionEvalReport['bandConfusion']['matrix'] => ({
  low: { low: 0, mid: 0, high: 0, abstained: 0 },
  mid: { low: 0, mid: 0, high: 0, abstained: 0 },
  high: { low: 0, mid: 0, high: 0, abstained: 0 },
})

const groupStats = (
  results: PromotionEvalCaseResult[],
  keyOf: (r: PromotionEvalCaseResult) => string,
  iterations: number,
): PromotionEvalGroupStats[] => {
  const groups = new Map<string, PromotionEvalCaseResult[]>()

  for (const r of results) {
    const key = keyOf(r)
    const list = groups.get(key) ?? []

    list.push(r)
    groups.set(key, list)
  }

  return [...groups.entries()].map(([key, rs]) => {
    const scored = rs.filter((r) => r.aiScore != null)
    const abstained = rs.length - scored.length
    const outsideTolerance = scored.filter((r) => r.withinTolerance === false).length
    const bandMismatch = scored.filter((r) => r.aiBand != null && r.aiBand !== r.band).length

    // Fallo = abstención (en estándar) ∪ fuera de tolerancia ∪ banda equivocada
    const failures = rs.map((r) =>
      r.aiScore == null || r.withinTolerance === false || (r.aiBand != null && r.aiBand !== r.band) ? 1 : 0,
    )

    return {
      key,
      cases: rs.length,
      scored: scored.length,
      abstained,
      outsideTolerance,
      bandMismatch,
      mae: scored.length > 0 ? mean(scored.map((r) => r.absoluteError as number)) : null,
      failureRate: rs.length > 0 ? mean(failures) : null,
      failureRateCi95: bootstrapCi95(failures, iterations),
    }
  })
}

/**
 * Evalúa los blockers mecánicos de promoción sobre dataset + métricas. El gate
 * (`assessment-ai-promotion-gate.mjs`) replica los checks de dataset a nivel JSON y consume
 * estos blockers desde el reporte. Lista vacía = gate mecánico verde; la promoción REAL además
 * exige las actividades humanas ya autorizadas (gold set Talent, canary owner nombrado).
 */
export const evaluatePromotionBlockers = (
  dataset: PromotionDataset,
  report: Omit<PromotionEvalReport, 'evaluation'>,
): string[] => {
  const blockers = validatePromotionDataset(dataset, report.thresholds)
  const t = report.thresholds

  if (report.totals.scored === 0) {
    blockers.push('no_scored_cases: ninguna corrida produjo score (provider no configurado o degradó)')

    return blockers
  }

  const hhMae = report.humanHuman.mae
  const aiMae = report.aiHuman.mae

  if (hhMae == null || aiMae == null) {
    blockers.push('agreement_not_computable: faltan casos estándar puntuados para computar acuerdo')
  } else if (hhMae === 0) {
    // Dos raters independientes con desacuerdo CERO en todo el dataset es implausible en data
    // humana real — huele a ratings copiados/fabricados. Guard anti-atajo.
    blockers.push('human_human_agreement_implausible: MAE humano-humano = 0 (¿ratings no independientes?)')
  } else if (aiMae > hhMae * t.maxAiHumanMaeRatio) {
    blockers.push(
      `ai_human_agreement_above_human_range: MAE IA-humano ${aiMae.toFixed(2)} > ${t.maxAiHumanMaeRatio} × MAE humano-humano ${hhMae.toFixed(2)}`,
    )
  }

  const wtr = report.aiHuman.withinToleranceRate

  if (wtr != null && wtr < t.minWithinToleranceRate) {
    blockers.push(`within_tolerance_below_min: ${wtr.toFixed(3)} < ${t.minWithinToleranceRate}`)
  }

  if (report.bandConfusion.nonAdjacentCount > t.maxNonAdjacentBandConfusions) {
    blockers.push(
      `non_adjacent_band_confusion: ${report.bandConfusion.nonAdjacentCount} confusiones low↔high (máximo permitido: 0)`,
    )
  }

  const sar = report.abstention.standardRate

  if (sar != null && sar > t.maxAbstentionRate) {
    blockers.push(`abstention_rate_exceeded: ${sar.toFixed(3)} > ${t.maxAbstentionRate} sobre casos estándar`)
  }

  const maxStd = report.repeatStability.maxStddev

  if (maxStd != null && maxStd > t.maxRepeatStddev) {
    blockers.push(`repeat_stability_exceeded: stddev máximo ${maxStd.toFixed(2)} > ${t.maxRepeatStddev}`)
  }

  return blockers
}

// ── Runner principal ──

export interface RunPromotionEvalOptions {
  thresholds?: AiRunPromotionThresholds
  datasetPath?: string | null
  /** Override de corridas por caso (tests/mock); default `thresholds.repeatRuns`. */
  repeatRuns?: number
  now?: () => Date
}

/**
 * Corre el eval de promoción: `repeatRuns` corridas por caso vía `runOne` (inyectable),
 * computa métricas headline sobre casos estándar, sección adversarial separada (ahí la
 * abstención es el comportamiento DESEADO) y veredicto mecánico de blockers.
 */
export const runPromotionEval = async (
  dataset: PromotionDataset,
  runOne: RunOnePromotionScoring,
  options: RunPromotionEvalOptions = {},
): Promise<PromotionEvalReport> => {
  const thresholds = options.thresholds ?? DEFAULT_AI_RUN_PROMOTION_THRESHOLDS
  const repeatRuns = Math.max(1, options.repeatRuns ?? thresholds.repeatRuns)
  const results: PromotionEvalCaseResult[] = []

  for (const c of dataset.cases) {
    const repeatScores: Array<number | null> = []

    for (let attempt = 0; attempt < repeatRuns; attempt++) {
      const { score } = await runOne(c, attempt)

      repeatScores.push(score != null && Number.isFinite(score) ? score : null)
    }

    const aiScore = repeatScores[0]

    const toleranceBand =
      (c.band != null ? thresholds.toleranceBandByBand[c.band] : undefined) ?? thresholds.toleranceBandDefault

    // Sin adjudicación humana no hay error que medir. NUNCA se sustituye por el score previo ni
    // por un promedio A/B: eso convertiría la ausencia de evidencia en evidencia.
    const absoluteError =
      aiScore != null && c.adjudicatedScore != null ? Math.abs(aiScore - c.adjudicatedScore) : null

    const aiBand = aiScore != null ? resolvePromotionBand(aiScore, thresholds) : null

    results.push({
      id: c.id,
      questionId: c.questionId,
      templateKey: c.templateKey,
      templateVersion: c.templateVersion,
      caseKind: c.caseKind,
      band: c.band,
      humanRatingA: c.humanRatingA,
      humanRatingB: c.humanRatingB,
      adjudicatedScore: c.adjudicatedScore,
      aiScore,
      repeatScores,
      repeatStddev: stddev(repeatScores.filter((s): s is number => s != null)),
      toleranceBand,
      absoluteError,
      withinTolerance: absoluteError != null ? absoluteError <= toleranceBand : null,
      aiBand,
      nonAdjacentConfusion:
        c.band != null && aiBand != null && Math.abs(BAND_INDEX[c.band] - BAND_INDEX[aiBand]) > 1,
    })
  }

  const standard = results.filter((r) => r.caseKind === 'standard')
  const adversarial = results.filter((r) => r.caseKind === 'adversarial')
  const standardScored = standard.filter((r) => r.aiScore != null)
  const adversarialScored = adversarial.filter((r) => r.aiScore != null)
  const scored = results.filter((r) => r.aiScore != null)

  // Las métricas headline sólo existen sobre casos con adjudicación humana: un caso sin calificar
  // no aporta ni a favor ni en contra, y desaparecer de la métrica es lo correcto.
  const standardAdjudicated = standardScored.filter((r) => r.absoluteError != null)
  const absErrors = standardAdjudicated.map((r) => r.absoluteError as number)
  const withinFlags = standardAdjudicated.map((r) => (r.withinTolerance ? 1 : 0))

  const matrix = emptyConfusionMatrix()
  let nonAdjacentCount = 0

  for (const r of standard) {
    if (r.band == null) continue

    matrix[r.band][r.aiBand ?? 'abstained'] += 1

    if (r.nonAdjacentConfusion) nonAdjacentCount += 1
  }

  const stddevs = results
    .map((r) => r.repeatStddev)
    .filter((s): s is number => s != null)

  const withoutEvaluation: Omit<PromotionEvalReport, 'evaluation'> = {
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    datasetVersion: dataset._meta.version,
    datasetSynthetic: dataset._meta.synthetic,
    datasetPath: options.datasetPath ?? null,
    ratingDesign: (() => {
      const detection = detectPromotionRatingDesign(dataset)

      return {
        detected: detection.design,
        declared: detection.declared,
        evidence: detection.evidence,
        capability: PROMOTION_ROUTE_CAPABILITIES[detection.design],
      }
    })(),
    thresholds,
    totals: {
      cases: results.length,
      standard: standard.length,
      adversarial: adversarial.length,
      scored: scored.length,
      abstained: results.length - scored.length,
    },
    aiHuman: {
      mae: absErrors.length > 0 ? mean(absErrors) : null,
      pearson: pearson(
        standardAdjudicated.map((r) => r.aiScore as number),
        standardAdjudicated.map((r) => r.adjudicatedScore as number),
      ),
      withinToleranceRate: withinFlags.length > 0 ? mean(withinFlags) : null,
      maeCi95: bootstrapCi95(absErrors, thresholds.bootstrapIterations),
      withinToleranceRateCi95: bootstrapCi95(withinFlags, thresholds.bootstrapIterations),
    },
    humanHuman: (() => {
      // Piso de referencia: sólo los casos que REALMENTE tienen dos lecturas humanas.
      const bothRated = standard.filter(
        (r) => Number.isFinite(r.humanRatingA as number) && Number.isFinite(r.humanRatingB as number),
      )

      return {
        mae:
          bothRated.length > 0
            ? mean(bothRated.map((r) => Math.abs((r.humanRatingA as number) - (r.humanRatingB as number))))
            : null,
        pearson: pearson(
          bothRated.map((r) => r.humanRatingA as number),
          bothRated.map((r) => r.humanRatingB as number),
        ),
      }
    })(),
    relativeAgreement: { ratio: null },
    abstention: {
      standardRate: standard.length > 0 ? (standard.length - standardScored.length) / standard.length : null,
      adversarialRate:
        adversarial.length > 0 ? (adversarial.length - adversarialScored.length) / adversarial.length : null,
      adversarialScored: adversarialScored.length,
    },
    bandConfusion: { matrix, nonAdjacentCount },
    repeatStability: {
      runsPerCase: repeatRuns,
      meanStddev: stddevs.length > 0 ? mean(stddevs) : null,
      maxStddev: stddevs.length > 0 ? Math.max(...stddevs) : null,
    },
    byQuestion: groupStats(standard, (r) => r.questionId, thresholds.bootstrapIterations),
    byTemplate: groupStats(standard, (r) => `${r.templateKey}@${r.templateVersion}`, thresholds.bootstrapIterations),
    results,
  }

  const hh = withoutEvaluation.humanHuman.mae
  const ai = withoutEvaluation.aiHuman.mae

  withoutEvaluation.relativeAgreement.ratio = hh != null && hh > 0 && ai != null ? ai / hh : null

  const blockers = evaluatePromotionBlockers(dataset, withoutEvaluation)

  return { ...withoutEvaluation, evaluation: { promotable: blockers.length === 0, blockers } }
}

// ── Reporte markdown ──

const fmt = (v: number | null | undefined, digits = 3): string => (v == null ? '—' : v.toFixed(digits))

const fmtCi = (ci: [number, number] | null): string =>
  ci == null ? '—' : `[${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}]`

export const renderPromotionEvalMarkdown = (report: PromotionEvalReport): string => {
  const lines: string[] = []

  lines.push('# Eval de promoción — Assessment AI scoring (TASK-1734 Slice 3)')
  lines.push('')
  lines.push(`- Generado: ${report.generatedAt}`)
  lines.push(`- Dataset: \`${report.datasetVersion}\` — synthetic: **${report.datasetSynthetic}**`)
  lines.push(`- Thresholds: \`${report.thresholds.version}\``)
  lines.push(
    `- Casos: ${report.totals.cases} (estándar ${report.totals.standard} · adversariales ${report.totals.adversarial}) · puntuados ${report.totals.scored} · abstenciones ${report.totals.abstained}`,
  )
  lines.push('')
  lines.push('## Ruta de rating detectada')
  lines.push('')
  lines.push(`**${report.ratingDesign.capability.label}** (\`${report.ratingDesign.detected}\`)`)
  lines.push('')

  for (const e of report.ratingDesign.evidence) lines.push(`- Evidencia: ${e}`)

  lines.push('')
  lines.push('**Habilita:**')
  lines.push('')

  for (const e of report.ratingDesign.capability.enables) lines.push(`- ${e}`)

  lines.push('')
  lines.push('**NO habilita:**')
  lines.push('')

  for (const e of report.ratingDesign.capability.doesNotEnable) lines.push(`- ${e}`)

  lines.push('')
  lines.push('## Acuerdo (casos estándar)')
  lines.push('')
  lines.push('| Métrica | Valor | IC 95% |')
  lines.push('|---|---|---|')
  lines.push(`| MAE IA-humano (adjudicado) | ${fmt(report.aiHuman.mae, 2)} | ${fmtCi(report.aiHuman.maeCi95)} |`)
  lines.push(`| Pearson IA-humano | ${fmt(report.aiHuman.pearson)} | — |`)
  lines.push(
    `| Dentro de tolerancia (por banda) | ${fmt(report.aiHuman.withinToleranceRate)} | ${fmtCi(report.aiHuman.withinToleranceRateCi95)} |`,
  )
  lines.push(`| MAE humano-humano (raters A/B) | ${fmt(report.humanHuman.mae, 2)} | — |`)
  lines.push(`| Pearson humano-humano | ${fmt(report.humanHuman.pearson)} | — |`)
  lines.push(`| Ratio MAE IA-humano / humano-humano | ${fmt(report.relativeAgreement.ratio, 2)} | — |`)
  lines.push('')
  lines.push('## Abstención')
  lines.push('')
  lines.push(`- Estándar (cuenta contra el gate): ${fmt(report.abstention.standardRate)}`)
  lines.push(
    `- Adversarial (abstener/rutear es lo deseado): ${fmt(report.abstention.adversarialRate)} — puntuados: ${report.abstention.adversarialScored}`,
  )
  lines.push('')
  lines.push('## Matriz de confusión por banda (adjudicada → IA)')
  lines.push('')
  lines.push('| Adjudicada \\ IA | low | mid | high | abstained |')
  lines.push('|---|---|---|---|---|')

  for (const band of PROMOTION_SCORE_BANDS) {
    const row = report.bandConfusion.matrix[band]

    lines.push(`| ${band} | ${row.low} | ${row.mid} | ${row.high} | ${row.abstained} |`)
  }

  lines.push('')
  lines.push(`Confusiones no adyacentes (low↔high): **${report.bandConfusion.nonAdjacentCount}** (máximo: 0)`)
  lines.push('')
  lines.push('## Repeat stability')
  lines.push('')
  lines.push(
    `- Corridas por caso: ${report.repeatStability.runsPerCase} · stddev medio: ${fmt(report.repeatStability.meanStddev, 2)} · stddev máximo: ${fmt(report.repeatStability.maxStddev, 2)}`,
  )
  lines.push('')
  lines.push('## Fallos por pregunta')
  lines.push('')
  lines.push('| Pregunta | Casos | Abstenciones | Fuera de tolerancia | Banda errada | MAE | Failure rate | IC 95% |')
  lines.push('|---|---|---|---|---|---|---|---|')

  for (const g of report.byQuestion) {
    lines.push(
      `| ${g.key} | ${g.cases} | ${g.abstained} | ${g.outsideTolerance} | ${g.bandMismatch} | ${fmt(g.mae, 2)} | ${fmt(g.failureRate)} | ${fmtCi(g.failureRateCi95)} |`,
    )
  }

  lines.push('')
  lines.push('## Fallos por template')
  lines.push('')
  lines.push('| Template | Casos | Abstenciones | Fuera de tolerancia | Banda errada | MAE | Failure rate | IC 95% |')
  lines.push('|---|---|---|---|---|---|---|---|')

  for (const g of report.byTemplate) {
    lines.push(
      `| ${g.key} | ${g.cases} | ${g.abstained} | ${g.outsideTolerance} | ${g.bandMismatch} | ${fmt(g.mae, 2)} | ${fmt(g.failureRate)} | ${fmtCi(g.failureRateCi95)} |`,
    )
  }

  lines.push('')
  lines.push('## Veredicto mecánico')
  lines.push('')

  if (report.evaluation.promotable) {
    lines.push('Gate mecánico VERDE. La promoción real además exige las actividades humanas ya autorizadas')
    lines.push('(gold set Talent con doble rating + adjudicación, canary owner nombrado).')
  } else {
    lines.push('**Promoción BLOQUEADA.** Blockers:')
    lines.push('')

    for (const b of report.evaluation.blockers) {
      lines.push(`- ${b}`)
    }
  }

  lines.push('')

  return lines.join('\n')
}

// ── Hook protected-group (TASK-1365) — DECLARADO, NO implementado ──
//
// Cláusula de (no-)dependencia de la spec (Slice 3): "TASK-1365 está code-complete con prod OFF
// y cero data demográfica real hoy — el fairness check es best-effort con lo que 1365 tenga
// disponible y su ausencia NO bloquea el resto de los gates de promoción de esta task (si Legal
// exige lo contrario al ejecutar, se registra en el ADR y se re-secuencia)."
//
// Cuando TASK-1365 tenga runtime ON y data demográfica lícita, consentida y suficientemente
// agregada, un adapter podrá implementar esta interface y ANEXAR sus hallazgos al reporte como
// sección informativa. Su resultado (o su ausencia) NUNCA entra a `evaluation.blockers`.
export interface PromotionFairnessHook {
  (report: PromotionEvalReport): Promise<{
    /** false ⇒ 1365 sin data/runtime: se reporta "no disponible" y el eval sigue sin bloquear. */
    available: boolean
    /** Notas agregadas PII-free (jamás datos individuales ni atributos protegidos crudos). */
    notes: string[]
  }>
}
