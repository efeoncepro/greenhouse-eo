import 'server-only'

// TASK-1361 Slice 4 — CLI del eval baseline de scoring. Corre el grader REAL (Anthropic) sobre el
// dataset curado y emite MAE / tolerancia / correlación. Gate de cutover: no habilitar
// HIRING_ASSESSMENT_AI_ENABLED en prod sin una corrida verde de este eval (Runtime Rollout Gate).
//
// Uso (requiere ANTHROPIC_API_KEY / greenhouse-anthropic-api-key + ADC):
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/assessment-scoring-eval.ts
//
// NO se corre en CI (costo + no-determinismo del LLM). El test CI-safe valida la aritmética con un
// runOne fake (src/lib/hiring/assessment/ai/eval/eval-runner.test.ts).

import { runResponseScoring } from '@/lib/hiring/assessment/ai/providers'
import { runScoringEval, type ScoringEvalCase } from '@/lib/hiring/assessment/ai/eval/eval-runner'
import baseline from '@/lib/hiring/assessment/ai/eval/__fixtures__/eval-baseline-scoring.v1.json'

const main = async (): Promise<void> => {
  const cases = baseline.cases as ScoringEvalCase[]
  const toleranceBand = (baseline._meta?.toleranceBand as number) ?? 15

  const report = await runScoringEval(
    cases,
    async (c) => {
      const result = await runResponseScoring({
        competencyKey: c.competencyKey,
        competencyName: c.competencyName,
        level: c.level,
        questionPrompt: c.questionPrompt,
        rubric: c.rubric,
        candidateAnswer: c.candidateAnswer,
      })

      return { score: result.score?.score ?? null }
    },
    toleranceBand,
  )

   
  console.log(JSON.stringify({ summary: { ...report, results: undefined }, results: report.results }, null, 2))

  if (report.scored === 0) {
     
    console.error('EVAL: 0 casos puntuados (provider no configurado o degradó). No apto para cutover.')
    process.exit(1)
  }
}

main().catch((error) => {
   
  console.error('EVAL FAIL:', error instanceof Error ? error.message : error)
  process.exit(1)
})
