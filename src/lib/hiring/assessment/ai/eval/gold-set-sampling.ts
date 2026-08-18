// TASK-1734 Slice 3 — MUESTREO ESTRATIFICADO del gold set de promoción (módulo PURO).
//
// Construye el INSTRUMENTO que un humano califica: respuestas REALES ya calificadas por humanos,
// anonimizadas, estratificadas por competencia × banda de score, con sobre-muestreo deliberado de
// casos difíciles y orden de presentación aleatorizado de forma determinística.
//
// ⚠️ LÍMITE ÉTICO INVIOLABLE: este módulo NUNCA produce `humanRatingA`, `humanRatingB` ni
// `adjudicatedScore`. Emite el instrumento con esos campos en `null`. La calificación es el acto
// que da validez al instrumento y sólo la puede hacer una persona entrenada con la BARS. Ningún
// agente puede fabricarla, y el gate mecánico sigue bloqueando hasta que exista.
//
// ⚠️ ANTI-ANCLAJE: el instrumento NO lleva el score humano previo, ni la banda de estratificación,
// ni la propuesta de la IA, ni el `responseId` de la DB. Todo eso vive en la LLAVE DE
// ESTRATIFICACIÓN sellada (`GoldSetStratificationKey`), que el rater no abre hasta terminar. Ver
// que un caso quedó en "banda alta" ancla la calificación tan bien como ver el número.
//
// Módulo puro: cero IO, cero env, cero `Math.random` (toda selección sale de sha256 sembrado).
// El script `scripts/hiring/build-gold-set-sample.ts` le inyecta las filas leídas de PostgreSQL.

import { createHash } from 'node:crypto'

import { redactCandidateContactText } from '@/lib/hiring/candidate-review/parser'

import {
  DEFAULT_AI_RUN_PROMOTION_THRESHOLDS,
  type AiRunPromotionThresholds,
  type PromotionDataset,
  type PromotionEvalCase,
} from './promotion-eval'

// ── Bandas de ESTRATIFICACIÓN (≠ bandas del harness) ──
//
// El harness evalúa sobre `template × band` con fronteras 40/70 (`bandBoundaries`). El muestreo
// estratifica sobre `competencia × banda` con las fronteras operativas que usa Talent para leer un
// resultado (baja <60 · media 60–79 · alta ≥80). Son dos cortes distintos a propósito: uno gobierna
// la métrica, el otro gobierna la COBERTURA de lo que se manda a calificar. Mezclarlos haría que la
// muestra herede las fronteras del evaluador y perdería los casos que Talent considera limítrofes.

export const GOLD_SET_STRATUM_BANDS = ['baja', 'media', 'alta'] as const
export type GoldSetStratumBand = (typeof GOLD_SET_STRATUM_BANDS)[number]

export const GOLD_SET_BAND_BOUNDARIES = { bajaMax: 60, mediaMax: 80 } as const

export const resolveGoldSetStratumBand = (score: number): GoldSetStratumBand => {
  if (score < GOLD_SET_BAND_BOUNDARIES.bajaMax) return 'baja'
  if (score < GOLD_SET_BAND_BOUNDARIES.mediaMax) return 'media'

  return 'alta'
}

// ── Casos difíciles (sobre-muestreo deliberado) ──
//
// Una muestra que sólo trae respuestas "normales" mide el caso fácil y promete un acuerdo que no
// se sostiene en producción. Estas etiquetas se computan de la data REAL y ordenan la selección
// dentro de cada celda: a igualdad de cupo, entra primero el caso difícil.

export const GOLD_SET_DIFFICULTY_TAGS = [
  /** Menos caracteres útiles que el `minAnswerChars` del propio router (señal `answer_too_short`). */
  'answer_short',
  /** Respuesta larga (≥ P75 del pool) que aun así quedó en banda baja: volumen sin sustancia. */
  'answer_long_low_substance',
  /** Score previo en el piso del rango: candidata a fuera de tema. HEURÍSTICA — la confirma el rater. */
  'answer_off_topic_suspect',
  /** El router de riesgo marcó `per_criterion_contradictory` sobre esta respuesta. */
  'router_per_criterion_contradictory',
  /** El router de riesgo marcó `answer_too_short` sobre esta respuesta. */
  'router_answer_too_short',
] as const
export type GoldSetDifficultyTag = (typeof GOLD_SET_DIFFICULTY_TAGS)[number]

/** Score previo ≤ este valor ⇒ sospecha de respuesta fuera de tema (heurística declarada). */
export const GOLD_SET_OFF_TOPIC_SUSPECT_MAX_SCORE = 30

// ── Entrada: una respuesta real leída de PostgreSQL ──

export interface GoldSetSourceResponse {
  /** `hiring_assessment_response.response_id`. NUNCA viaja al instrumento (vive en la llave sellada). */
  responseId: string
  questionId: string
  /** `hiring_assessment.template_id` (el template no tiene `key` propio en el schema). */
  templateKey: string
  /** `v{hiring_assessment_template.version}`. */
  templateVersion: string
  competencyKey: string
  competencyName: string
  /** Peso del módulo en el template (0–100) o null si la competencia no está modulada. */
  competencyWeight: number | null
  level: string
  questionPrompt: string
  rubric: Record<string, unknown>
  /** Texto CRUDO de la respuesta; este módulo lo redacta antes de emitirlo. */
  answerText: string
  /** `human_score` previo. Sirve SÓLO para estratificar; jamás entra al instrumento. */
  priorHumanScore: number | null
  /** `routing_reasons` acumulados de los run items de esta respuesta. */
  routerReasons: string[]
}

// ── Dimensionamiento con fundamento (nada de un N inventado) ──

export interface GoldSetSizingInputs {
  /**
   * Semi-amplitud tolerada del IC 95% de la tasa "dentro de tolerancia" para el PISO de la muestra.
   * 0.10 ⇒ el intervalo mide ±10 puntos porcentuales.
   */
  headlineHalfWidthFloor: number
  /** Semi-amplitud del IC 95% para el TARGET (lectura estrecha). */
  headlineHalfWidthTarget: number
  /** Cota superior tolerada de la tasa de fallo cuando un estrato observa CERO fallos (regla de tres). */
  perStratumZeroFailureUpperBoundFloor: number
  perStratumZeroFailureUpperBoundTarget: number
}

export const DEFAULT_GOLD_SET_SIZING_INPUTS: GoldSetSizingInputs = {
  headlineHalfWidthFloor: 0.1,
  headlineHalfWidthTarget: 0.075,
  perStratumZeroFailureUpperBoundFloor: 0.25,
  perStratumZeroFailureUpperBoundTarget: 0.2,
}

export interface GoldSetSizing {
  /** Mínimo de casos estándar para que el IC 95% headline sea legible. */
  standardTotalFloor: number
  /** Objetivo de casos estándar para una lectura estrecha. */
  standardTotalTarget: number
  /** Mínimo por banda del harness (3 bandas ⇒ el piso total nunca baja de 3 × esto). */
  perHarnessBandFloor: number
  perHarnessBandTarget: number
  /** Mínimo de casos adversariales (los AUTORA Talent; no salen de data real de candidatos). */
  adversarialFloor: number
  /** Explicación auditable de cada número (entra al reporte y a la llave de estratificación). */
  rationale: string[]
  inputs: GoldSetSizingInputs
}

/** n para que el IC 95% normal de una proporción `p` tenga semi-amplitud `halfWidth`. */
const sampleSizeForProportionCi = (p: number, halfWidth: number): number =>
  Math.ceil((1.96 * 1.96 * p * (1 - p)) / (halfWidth * halfWidth))

/** Regla de tres: con 0 fallos en n, la cota superior 95% de la tasa de fallo es 3/n. */
const sampleSizeForZeroFailureUpperBound = (upperBound: number): number => Math.ceil(3 / upperBound)

/**
 * Deriva el N del gold set de lo que el harness NECESITA para reportar intervalos útiles —
 * nunca de un número universal inventado (la spec lo prohíbe explícitamente).
 *
 * Dos requisitos independientes, y el N es el máximo de ambos:
 *
 * 1. **Headline**: el gate compara la tasa "dentro de tolerancia" contra `minWithinToleranceRate`.
 *    Para que ese contraste signifique algo, el IC 95% bootstrap de la tasa tiene que ser más
 *    angosto que la distancia a la que se juega la decisión. Con p = `minWithinToleranceRate`,
 *    n = 1.96²·p(1−p)/h².
 * 2. **Por banda**: un estrato con cero fallos no prueba nada si es chico. La regla de tres acota
 *    la tasa de fallo real en 3/n cuando no se observó ninguno; se elige n para que esa cota sea
 *    tolerable. Como el harness estratifica en 3 bandas, el piso total nunca baja de 3 × ese n.
 */
export const computeGoldSetSizing = (
  thresholds: AiRunPromotionThresholds = DEFAULT_AI_RUN_PROMOTION_THRESHOLDS,
  inputs: GoldSetSizingInputs = DEFAULT_GOLD_SET_SIZING_INPUTS,
): GoldSetSizing => {
  const p = thresholds.minWithinToleranceRate
  const headlineFloor = sampleSizeForProportionCi(p, inputs.headlineHalfWidthFloor)
  const headlineTarget = sampleSizeForProportionCi(p, inputs.headlineHalfWidthTarget)
  const bandFloor = sampleSizeForZeroFailureUpperBound(inputs.perStratumZeroFailureUpperBoundFloor)
  const bandTarget = sampleSizeForZeroFailureUpperBound(inputs.perStratumZeroFailureUpperBoundTarget)
  const bandCount = 3

  const standardTotalFloor = Math.max(headlineFloor, bandFloor * bandCount, thresholds.minCasesPerStratum * bandCount)
  const standardTotalTarget = Math.max(headlineTarget, bandTarget * bandCount, standardTotalFloor)

  return {
    standardTotalFloor,
    standardTotalTarget,
    perHarnessBandFloor: Math.max(bandFloor, thresholds.minCasesPerStratum),
    perHarnessBandTarget: bandTarget,
    adversarialFloor: thresholds.minAdversarialCases,
    inputs,
    rationale: [
      `Headline: con p=${p} (minWithinToleranceRate) y semi-amplitud IC95 ±${inputs.headlineHalfWidthFloor} ⇒ n≥${headlineFloor}; ` +
        `±${inputs.headlineHalfWidthTarget} ⇒ n≥${headlineTarget}.`,
      `Por banda (regla de tres, cero fallos observados): cota ≤${inputs.perStratumZeroFailureUpperBoundFloor} ⇒ n≥${bandFloor}; ` +
        `cota ≤${inputs.perStratumZeroFailureUpperBoundTarget} ⇒ n≥${bandTarget}. El harness estratifica en ${bandCount} bandas.`,
      `Piso mecánico del harness: minCasesPerStratum=${thresholds.minCasesPerStratum} por estrato template×banda.`,
      `N estándar = máx(headline, bandas×${bandCount}, piso del harness) ⇒ piso ${standardTotalFloor} · objetivo ${standardTotalTarget}.`,
      `Adversariales: ${thresholds.minAdversarialCases} como piso. NO se muestrean de data real — se AUTORAN (prompt injection, ` +
        `PII embebida ficticia, fuera de tema, vacía, multilingüe). Inyectar eso en la respuesta de un candidato real sería fabricar evidencia.`,
      `Celda competencia×banda: cuota de COBERTURA (que ninguna competencia quede invisible), no de IC. ` +
        `Los intervalos los sostiene la banda; la celda sostiene la amplitud del contenido.`,
    ],
  }
}

// ── Selección determinística (sha256 sembrado; jamás Math.random) ──

const hashUnit = (seed: string, ...parts: string[]): number => {
  const digest = createHash('sha256').update([seed, ...parts].join('|')).digest()

  return digest.readUInt32BE(0) / 0x1_0000_0000
}

/** Id opaco del caso. El instrumento NO lleva el `responseId` de la DB: sólo la llave sellada lo mapea. */
export const goldSetCaseId = (seed: string, responseId: string): string =>
  `gs-${createHash('sha256').update(`${seed}|case|${responseId}`).digest('hex').slice(0, 12)}`

// ── Etiquetado de dificultad ──

export const tagGoldSetDifficulty = (
  source: GoldSetSourceResponse,
  context: { longAnswerCharsP75: number; minAnswerChars: number },
): GoldSetDifficultyTag[] => {
  const tags: GoldSetDifficultyTag[] = []
  const chars = source.answerText.trim().length

  if (chars < context.minAnswerChars) tags.push('answer_short')

  if (
    chars >= context.longAnswerCharsP75 &&
    source.priorHumanScore != null &&
    resolveGoldSetStratumBand(source.priorHumanScore) === 'baja'
  ) {
    tags.push('answer_long_low_substance')
  }

  if (source.priorHumanScore != null && source.priorHumanScore <= GOLD_SET_OFF_TOPIC_SUSPECT_MAX_SCORE) {
    tags.push('answer_off_topic_suspect')
  }

  if (source.routerReasons.includes('per_criterion_contradictory')) tags.push('router_per_criterion_contradictory')

  if (source.routerReasons.includes('answer_too_short')) tags.push('router_answer_too_short')

  return tags
}

/** Percentil (interpolación lineal) sobre una lista de números; [] ⇒ 0. */
export const percentile = (values: number[], q: number): number => {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)

  if (lo === hi) return sorted[lo]

  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

// ── Cuotas por celda competencia × banda ──

export interface GoldSetCellQuota {
  competencyKey: string
  band: GoldSetStratumBand
  /** Cupo objetivo derivado del peso de la competencia dentro de la banda. */
  quotaTarget: number
  /** Casos realmente disponibles en el pool para esa celda. */
  available: number
  /** Casos efectivamente seleccionados = min(quotaTarget, available). */
  selected: number
  /** quotaTarget − selected. > 0 ⇒ estrato INCOMPLETO (se declara, nunca se rellena con otro estrato). */
  shortfall: number
}

/**
 * Reparte el objetivo total entre celdas `competencia × banda`: las bandas se llevan un tercio cada
 * una (el IC lo sostiene la banda) y dentro de cada banda las competencias reparten proporcional a
 * su peso en el template, con piso 1 (ninguna competencia puede quedar invisible).
 */
export const computeCellQuotas = (
  competencies: Array<{ key: string; weight: number | null }>,
  standardTotalTarget: number,
): Map<string, number> => {
  const quotas = new Map<string, number>()

  if (competencies.length === 0) return quotas

  const perBand = standardTotalTarget / GOLD_SET_STRATUM_BANDS.length
  const totalWeight = competencies.reduce((sum, c) => sum + (c.weight ?? 0), 0)

  for (const band of GOLD_SET_STRATUM_BANDS) {
    for (const competency of competencies) {
      const share =
        totalWeight > 0 ? (competency.weight ?? 0) / totalWeight : 1 / competencies.length

      quotas.set(`${competency.key}:${band}`, Math.max(1, Math.round(perBand * share)))
    }
  }

  return quotas
}

// ── Construcción del instrumento + llave sellada ──

export interface GoldSetStratificationEntry {
  caseId: string
  responseId: string
  competencyKey: string
  /** Banda de estratificación derivada del score humano PREVIO. Sellada: verla ancla al rater. */
  stratumBand: GoldSetStratumBand
  difficultyTags: GoldSetDifficultyTag[]
  answerChars: number
}

export interface GoldSetStratificationKey {
  _warning: string
  datasetVersion: string
  seed: string
  generatedAt: string
  sizing: GoldSetSizing
  quotas: GoldSetCellQuota[]
  bandTotals: Array<{ band: GoldSetStratumBand; selected: number; quotaTarget: number; shortfall: number }>
  totals: {
    poolAvailable: number
    poolStratifiable: number
    selected: number
    standardTotalFloor: number
    standardTotalTarget: number
    shortfallVsFloor: number
    shortfallVsTarget: number
    adversarialRequired: number
    adversarialPresent: number
  }
  incompleteStrata: string[]
  entries: GoldSetStratificationEntry[]
}

export interface BuildGoldSetSampleOptions {
  seed: string
  datasetVersion: string
  thresholds?: AiRunPromotionThresholds
  sizingInputs?: GoldSetSizingInputs
  generatedAt: string
  /** Procedencia + contrato de anonimización/retención; entra a `_meta.notes`. */
  notes: string
  raterTrainingReference: string | null
}

export interface GoldSetBuildResult {
  instrument: PromotionDataset
  stratificationKey: GoldSetStratificationKey
}

const SEALED_KEY_WARNING =
  'LLAVE SELLADA — NO ABRIR ANTES DE CALIFICAR. Contiene la banda del score humano previo por caso. ' +
  'Verla antes de calificar ancla al rater y destruye la independencia del instrumento.'

/**
 * Construye el instrumento del gold set desde respuestas REALES ya calificadas por humanos.
 *
 * Emite dos artefactos:
 *  - `instrument`: lo que el rater abre. Ratings en `null`, sin banda, sin score previo, sin
 *    propuesta de IA, sin `responseId`, con PII autodeclarada redactada y orden aleatorizado.
 *  - `stratificationKey`: la llave sellada con el mapeo `caseId → responseId`, la banda de
 *    estratificación, las cuotas objetivo vs reales y los estratos incompletos.
 *
 * NUNCA rellena un estrato incompleto con casos de otro estrato: el faltante se declara.
 */
export const buildGoldSetSample = (
  sources: GoldSetSourceResponse[],
  options: BuildGoldSetSampleOptions,
): GoldSetBuildResult => {
  const thresholds = options.thresholds ?? DEFAULT_AI_RUN_PROMOTION_THRESHOLDS
  const sizing = computeGoldSetSizing(thresholds, options.sizingInputs)

  const stratifiable = sources.filter((s) => s.priorHumanScore != null)

  const longAnswerCharsP75 = percentile(
    sources.map((s) => s.answerText.trim().length),
    0.75,
  )

  const competencyIndex = new Map<string, { key: string; weight: number | null }>()

  for (const source of stratifiable) {
    if (!competencyIndex.has(source.competencyKey)) {
      competencyIndex.set(source.competencyKey, { key: source.competencyKey, weight: source.competencyWeight })
    }
  }

  const quotaByCell = computeCellQuotas([...competencyIndex.values()], sizing.standardTotalTarget)

  // Agrupar el pool por celda competencia × banda.
  const cells = new Map<string, GoldSetSourceResponse[]>()

  for (const source of stratifiable) {
    const band = resolveGoldSetStratumBand(source.priorHumanScore as number)
    const key = `${source.competencyKey}:${band}`

    cells.set(key, [...(cells.get(key) ?? []), source])
  }

  const selected: Array<{ source: GoldSetSourceResponse; tags: GoldSetDifficultyTag[]; band: GoldSetStratumBand }> = []
  const quotas: GoldSetCellQuota[] = []

  for (const [cellKey, pool] of [...cells.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [competencyKey, band] = cellKey.split(':') as [string, GoldSetStratumBand]
    const quotaTarget = quotaByCell.get(cellKey) ?? 1

    const ranked = pool
      .map((source) => ({
        source,
        tags: tagGoldSetDifficulty(source, { longAnswerCharsP75, minAnswerChars: 40 }),
        band,
      }))
      // Los casos difíciles entran primero; a igualdad de dificultad, orden determinístico por hash.
      .sort((a, b) => {
        if (b.tags.length !== a.tags.length) return b.tags.length - a.tags.length

        return hashUnit(options.seed, 'pick', a.source.responseId) - hashUnit(options.seed, 'pick', b.source.responseId)
      })

    const take = ranked.slice(0, quotaTarget)

    selected.push(...take)
    quotas.push({
      competencyKey,
      band,
      quotaTarget,
      available: pool.length,
      selected: take.length,
      shortfall: Math.max(0, quotaTarget - take.length),
    })
  }

  // Las celdas sin ningún caso disponible también son faltantes declarados.
  for (const [cellKey, quotaTarget] of quotaByCell) {
    if (cells.has(cellKey)) continue

    const [competencyKey, band] = cellKey.split(':') as [string, GoldSetStratumBand]

    quotas.push({ competencyKey, band, quotaTarget, available: 0, selected: 0, shortfall: quotaTarget })
  }

  quotas.sort((a, b) => `${a.competencyKey}:${a.band}`.localeCompare(`${b.competencyKey}:${b.band}`))

  // Orden de presentación aleatorizado (determinístico) — el rater no debe poder inferir el
  // estrato por la posición ni encontrar juntos los casos de una misma competencia.
  const presented = [...selected].sort(
    (a, b) =>
      hashUnit(options.seed, 'order', a.source.responseId) - hashUnit(options.seed, 'order', b.source.responseId),
  )

  const cases: PromotionEvalCase[] = presented.map(({ source }) => ({
    id: goldSetCaseId(options.seed, source.responseId),
    questionId: source.questionId,
    templateKey: source.templateKey,
    templateVersion: source.templateVersion,
    competencyKey: source.competencyKey,
    competencyName: source.competencyName,
    level: source.level,
    questionPrompt: source.questionPrompt,
    rubric: source.rubric,
    answerText: redactCandidateContactText(source.answerText),
    caseKind: 'standard',
    // ⚠️ Los ratings los pone una PERSONA. Este módulo jamás los fabrica.
    humanRatingA: null,
    humanRatingB: null,
    adjudicatedScore: null,
    // La banda se DERIVA de la adjudicación; declararla antes sería anclar al rater.
    band: null,
  }))

  const bandTotals = GOLD_SET_STRATUM_BANDS.map((band) => {
    const rows = quotas.filter((q) => q.band === band)

    return {
      band,
      selected: rows.reduce((sum, q) => sum + q.selected, 0),
      quotaTarget: rows.reduce((sum, q) => sum + q.quotaTarget, 0),
      shortfall: rows.reduce((sum, q) => sum + q.shortfall, 0),
    }
  })

  const entries: GoldSetStratificationEntry[] = presented.map(({ source, tags, band }) => ({
    caseId: goldSetCaseId(options.seed, source.responseId),
    responseId: source.responseId,
    competencyKey: source.competencyKey,
    stratumBand: band,
    difficultyTags: tags,
    answerChars: source.answerText.trim().length,
  }))

  const stratificationKey: GoldSetStratificationKey = {
    _warning: SEALED_KEY_WARNING,
    datasetVersion: options.datasetVersion,
    seed: options.seed,
    generatedAt: options.generatedAt,
    sizing,
    quotas,
    bandTotals,
    totals: {
      poolAvailable: sources.length,
      poolStratifiable: stratifiable.length,
      selected: cases.length,
      standardTotalFloor: sizing.standardTotalFloor,
      standardTotalTarget: sizing.standardTotalTarget,
      shortfallVsFloor: Math.max(0, sizing.standardTotalFloor - cases.length),
      shortfallVsTarget: Math.max(0, sizing.standardTotalTarget - cases.length),
      adversarialRequired: sizing.adversarialFloor,
      adversarialPresent: 0,
    },
    incompleteStrata: quotas.filter((q) => q.shortfall > 0).map((q) => `${q.competencyKey}:${q.band}`),
    entries,
  }

  const instrument: PromotionDataset = {
    _meta: {
      version: options.datasetVersion,
      // Data REAL de candidatos, no sintética. Aun así el gate bloquea: sin ratings no hay evidencia.
      synthetic: false,
      scale: '0-100',
      ratingDesign: 'unrated_instrument',
      doubleRating: {
        // Todavía no hay doble rating: el instrumento nace vacío de ratings a propósito.
        independent: false,
        adjudicated: false,
        raterTrainingReference: options.raterTrainingReference,
      },
      notes: options.notes,
    },
    cases,
  }

  return { instrument, stratificationKey }
}
