import 'server-only'

// TASK-1734 Slice 3 — CLI del eval de PROMOCIÓN. Corre `runPromotionEval` sobre un dataset
// versionado (default: el fixture SINTÉTICO, que solo prueba el harness) y escribe reporte
// JSON + markdown en `.eval-reports/hiring-assessment-ai-promotion/`. El gate
// `pnpm hiring:ai:promotion-gate` consume el reporte más reciente.
//
// Uso:
//   pnpm hiring:ai:promotion-eval                          # dataset sintético + provider real
//   pnpm hiring:ai:promotion-eval -- --mock                # fake determinístico (prueba el harness, sin costo)
//   pnpm hiring:ai:promotion-eval -- --dataset <path>      # dataset humano real cuando exista
//   pnpm hiring:ai:promotion-eval -- --repeats 3
//
// El provider real requiere ANTHROPIC_API_KEY / greenhouse-anthropic-api-key + ADC. NO corre en
// CI (costo + no-determinismo). La aritmética se valida CI-safe en
// src/lib/hiring/assessment/ai/eval/promotion-eval.test.ts.

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { runResponseScoring } from '@/lib/hiring/assessment/ai/providers'
import {
  renderPromotionEvalMarkdown,
  runPromotionEval,
  type PromotionDataset,
  type RunOnePromotionScoring,
} from '@/lib/hiring/assessment/ai/eval/promotion-eval'
import { getAiRunPromotionThresholds } from '@/lib/hiring/assessment/ai/scoring-run/config'

const DEFAULT_DATASET = 'src/lib/hiring/assessment/ai/eval/__fixtures__/promotion-dataset.synthetic.v1.json'
const DEFAULT_OUT_DIR = '.eval-reports/hiring-assessment-ai-promotion'

const argValue = (flag: string): string | null => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null
}

/**
 * Fake determinístico para probar el harness sin provider: score = adjudicado + offset estable
 * por hash del id (±3); los casos adversariales ABSTIENEN (comportamiento deseado). Cero
 * varianza entre corridas ⇒ repeat stability 0.
 */
const mockRunOne: RunOnePromotionScoring = async (c) => {
  if (c.caseKind === 'adversarial') return { score: null }

  // Un instrumento sin calificar no tiene adjudicación que imitar: el mock abstiene en vez de
  // inventar un número (fabricarlo daría un reporte con métricas falsamente completas).
  if (c.adjudicatedScore == null) return { score: null }

  const offset = (createHash('sha256').update(c.id).digest().readUInt8(0) % 7) - 3

  return { score: Math.max(0, Math.min(100, c.adjudicatedScore + offset)) }
}

const providerRunOne: RunOnePromotionScoring = async (c) => {
  const result = await runResponseScoring({
    competencyKey: c.competencyKey,
    competencyName: c.competencyName,
    level: c.level,
    questionPrompt: c.questionPrompt,
    rubric: c.rubric,
    candidateAnswer: c.answerText,
  })

  return { score: result.score?.score ?? null }
}

const main = async (): Promise<void> => {
  const datasetPath = resolve(argValue('--dataset') ?? DEFAULT_DATASET)
  const outDir = resolve(argValue('--out') ?? DEFAULT_OUT_DIR)
  const mock = process.argv.includes('--mock')
  const repeatsArg = argValue('--repeats')

  const dataset = JSON.parse(readFileSync(datasetPath, 'utf8')) as PromotionDataset
  const thresholds = getAiRunPromotionThresholds()

  const report = await runPromotionEval(dataset, mock ? mockRunOne : providerRunOne, {
    thresholds,
    datasetPath,
    repeatRuns: repeatsArg ? Math.max(1, Number(repeatsArg) || thresholds.repeatRuns) : undefined,
  })

  mkdirSync(outDir, { recursive: true })

  const stamp = report.generatedAt.replace(/[:.]/g, '-')
  const jsonPath = join(outDir, `promotion-eval-${stamp}.json`)
  const mdPath = join(outDir, `promotion-eval-${stamp}.md`)

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(mdPath, renderPromotionEvalMarkdown(report))

  console.log(JSON.stringify({ summary: { ...report, results: undefined }, jsonPath, mdPath }, null, 2))

  if (report.totals.scored === 0 && !mock) {
    console.error('EVAL: 0 casos puntuados (provider no configurado o degradó).')
    process.exit(1)
  }

  if (!report.evaluation.promotable) {
    console.error(
      `EVAL: reporte generado con ${report.evaluation.blockers.length} blocker(s) de promoción — ver ${mdPath}. ` +
        'El gate (pnpm hiring:ai:promotion-gate) seguirá BLOQUEANDO.',
    )
  }
}

main().catch((error) => {
  console.error('PROMOTION EVAL FAIL:', error instanceof Error ? error.message : error)
  process.exit(1)
})
