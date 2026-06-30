import 'server-only'

/**
 * TASK-1271 — Growth AI Visibility · Prose Extraction · Eval/cost CLI.
 *
 * Corre la eval metodológica de prosa contra uno o más proveedores REALES
 * (anthropic/gemini/openai) vía el router, con TOPE DE PRESUPUESTO acumulado.
 * Es el harness de cutover EVIDENCIA-FIRST (Slice 3): reporta exactitud de
 * sentiment, false positives/negatives, preservación de `unknown`, drift, schema-
 * valid rate, latencia y costo estimado por proveedor. No cambia el default
 * productivo: sólo produce evidencia para decidir el cutover.
 *
 * Open Question #2 (resuelta): el shadow/eval es ALLOWLISTED (este CLI), NO se
 * dispara doble-provider en runs normales → cero costo extra en producción.
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/ai-visibility-prose-eval.ts            # los 3, cap $0.50
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/ai-visibility-prose-eval.ts --providers gemini,openai --max-cost 0.25
 */

import {
  runProseExtractionEval,
  type ProseEvalRunOne
} from '@/lib/growth/ai-visibility/evals/prose-extraction-eval'
import { PROSE_EXTRACTION_METHODOLOGY_FIXTURES } from '@/lib/growth/ai-visibility/evals/prose-extraction-methodology-fixtures'
import { runProseExtraction } from '@/lib/growth/ai-visibility/normalization/prose-extraction/router'
import {
  PROSE_EXTRACTION_PROVIDER_IDS,
  type ProseExtractionProviderId
} from '@/lib/growth/ai-visibility/normalization/prose-extraction/contracts'

const argValue = (flag: string): string | undefined => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 ? process.argv[idx + 1] : undefined
}

const parseProviders = (): ProseExtractionProviderId[] => {
  const raw = argValue('--providers')

  if (!raw) {
    return [...PROSE_EXTRACTION_PROVIDER_IDS]
  }

  return raw
    .split(',')
    .map(p => p.trim().toLowerCase())
    .filter((p): p is ProseExtractionProviderId =>
      (PROSE_EXTRACTION_PROVIDER_IDS as readonly string[]).includes(p)
    )
}

const main = async (): Promise<void> => {
  const providers = parseProviders()
  const maxCostUsd = Number.parseFloat(argValue('--max-cost') ?? '0.5')

  // El router gatea en `isLlmExtractionEnabled()`. El CLI lo fuerza ON sólo para esta
  // corrida de eval (NO toca el flag del environment; el proveedor se fuerza por opción).
  process.env.GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED = 'true'

  console.log(`Prose Extraction Eval — providers: ${providers.join(', ')} · cap acumulado: $${maxCostUsd}`)
  console.log(`Casos metodológicos: ${PROSE_EXTRACTION_METHODOLOGY_FIXTURES.length}\n`)

  let spentUsd = 0
  let budgetTripped = false

  for (const provider of providers) {
    if (budgetTripped) {
      console.log(`\n⏭  ${provider}: SKIPPED (presupuesto acumulado agotado).`)
      continue
    }

    const runOne: ProseEvalRunOne = async input => {
      if (spentUsd >= maxCostUsd) {
        budgetTripped = true

        return { fields: null, metadata: { providerId: provider, model: null, version: 'prose_extraction_v1', status: 'disabled', costEstimateUsd: 0, latencyMs: 0, usage: null } }
      }

      const result = await runProseExtraction(input, { provider })

      spentUsd += result.metadata.costEstimateUsd

      return result
    }

    const report = await runProseExtractionEval(PROSE_EXTRACTION_METHODOLOGY_FIXTURES, runOne)

    console.log(`── ${provider} ──────────────────────────────`)
    console.log(`  schema-valid rate:        ${(report.schemaValidRate * 100).toFixed(0)}% (${report.schemaValid}/${report.total})`)
    console.log(`  sentiment accuracy:       ${(report.sentimentAccuracy * 100).toFixed(0)}%`)
    console.log(`  false positives:          ${report.falsePositives}`)
    console.log(`  false negatives:          ${report.falseNegatives}`)
    console.log(`  unknown preservation:     ${(report.unknownPreservationRate * 100).toFixed(0)}% (${report.unknownPreserved}/${report.unknownExpected})`)
    console.log(`  drift matches:            ${report.driftMatches}/${report.total}`)
    console.log(`  avg latency:              ${report.avgLatencyMs} ms`)
    console.log(`  costo estimado:           $${report.totalCostUsd}`)

    for (const r of report.results) {
      const flag = r.falsePositive ? 'FP' : r.falseNegative ? 'FN' : r.sentimentMatch ? 'ok' : r.schemaValid ? '≠' : 'ERR'

      console.log(`    [${flag}] ${r.id}: esperado=${r.sentimentExpected} actual=${r.sentimentActual ?? '(null)'} status=${r.status}`)
    }

    console.log('')
  }

  console.log(`Gasto acumulado total: $${spentUsd.toFixed(6)} (cap $${maxCostUsd})${budgetTripped ? ' — CAP ALCANZADO' : ''}`)
  console.log('\nDecisión de cutover: el default productivo NO cambia por este CLI. Documentar el veredicto')
  console.log('en GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md y sólo entonces flip de _PROSE_EXTRACTION_PROVIDER en staging.')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
