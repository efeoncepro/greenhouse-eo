// TASK-1361 Slice 4 — eval baseline PURO (sin IO/provider): mide correlación IA↔referencia humana.
// `runOne` es inyectable — el CLI pasa el provider real (forzado), los tests pasan un fake
// determinístico (CI-safe). Espeja runProseExtractionEval del AEO grader.

export interface ScoringEvalCase {
  id: string
  competencyKey: string
  competencyName: string
  level: string
  questionPrompt: string
  rubric: Record<string, unknown>
  candidateAnswer: string
  humanReferenceScore: number
}

export interface ScoringEvalCaseResult {
  id: string
  humanReferenceScore: number
  aiScore: number | null
  absoluteError: number | null
  withinTolerance: boolean | null
}

export interface ScoringEvalReport {
  total: number
  scored: number
  unscored: number
  meanAbsoluteError: number | null
  withinToleranceRate: number | null
  pearson: number | null
  toleranceBand: number
  results: ScoringEvalCaseResult[]
}

export type RunOneScoring = (input: ScoringEvalCase) => Promise<{ score: number | null }>

const pearson = (xs: number[], ys: number[]): number | null => {
  const n = xs.length

  if (n < 2) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
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

/**
 * Corre el eval sobre `cases`, puntuando cada uno con `runOne`. Los casos donde `runOne` devuelve
 * null (provider no configuró / degradó) se cuentan como `unscored`, NO como divergencia (honest).
 * Devuelve MAE, tasa dentro de tolerancia y correlación de Pearson (score IA vs referencia humana).
 */
export const runScoringEval = async (
  cases: ScoringEvalCase[],
  runOne: RunOneScoring,
  toleranceBand = 15,
): Promise<ScoringEvalReport> => {
  const results: ScoringEvalCaseResult[] = []

  for (const c of cases) {
    const { score } = await runOne(c)

    if (score == null || !Number.isFinite(score)) {
      results.push({ id: c.id, humanReferenceScore: c.humanReferenceScore, aiScore: null, absoluteError: null, withinTolerance: null })
      continue
    }

    const absoluteError = Math.abs(score - c.humanReferenceScore)

    results.push({
      id: c.id,
      humanReferenceScore: c.humanReferenceScore,
      aiScore: score,
      absoluteError,
      withinTolerance: absoluteError <= toleranceBand,
    })
  }

  const scoredResults = results.filter((r) => r.aiScore != null)
  const scored = scoredResults.length
  const unscored = results.length - scored

  const meanAbsoluteError =
    scored > 0 ? scoredResults.reduce((a, r) => a + (r.absoluteError ?? 0), 0) / scored : null

  const withinToleranceRate =
    scored > 0 ? scoredResults.filter((r) => r.withinTolerance).length / scored : null

  const corr = pearson(scoredResults.map((r) => r.aiScore as number), scoredResults.map((r) => r.humanReferenceScore))

  return { total: results.length, scored, unscored, meanAbsoluteError, withinToleranceRate, pearson: corr, toleranceBand, results }
}
