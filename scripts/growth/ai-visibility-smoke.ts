import 'server-only'

/**
 * TASK-1226 Slice 5 — AI Visibility Grader · smoke/eval harness (CANÓNICO).
 *
 * Reemplaza el harness throwaway del spike (scripts/growth/ai-visibility-spike/).
 * Corre un run low-volume por marca fixture usando el PRIMITIVE canónico
 * (runGraderDiagnostic) — el mismo que el endpoint/Nexa/report builder.
 *
 * Comportamiento:
 *  - Grader OFF (default) o GROWTH_SMOKE_FAKE=1 → usa el fake adapter determinista
 *    (no llama providers, no consume secretos) y lo deja explícito. Skip limpio.
 *  - Grader ON + flags/secrets de provider → usa el registry real (un provider por
 *    vez recomendado: prender solo GROWTH_AI_VISIBILITY_OPENAI_ENABLED primero).
 *  - Persiste en greenhouse_growth (evidence ledger). Requiere acceso a PG.
 *
 * Uso:
 *   pnpm growth:ai-visibility:smoke              # fake si grader OFF
 *   GROWTH_SMOKE_FAKE=1 pnpm growth:ai-visibility:smoke
 *   GROWTH_AI_VISIBILITY_GRADER_ENABLED=true GROWTH_AI_VISIBILITY_OPENAI_ENABLED=true \
 *     pnpm growth:ai-visibility:smoke            # real (uno por vez)
 */

import { runGraderDiagnostic } from '@/lib/growth/ai-visibility/commands'
import { type GrowthAiVisibilityProviderId } from '@/lib/growth/ai-visibility/contracts'
import { isGraderEnabled } from '@/lib/growth/ai-visibility/flags'
import {
  GROWTH_AI_VISIBILITY_BRAND_FIXTURES,
  GROWTH_AI_VISIBILITY_SMOKE_MODE,
  GROWTH_AI_VISIBILITY_SMOKE_RUN_KIND
} from '@/lib/growth/ai-visibility/evals/brand-fixtures'
import { createFakeProviderAdapter } from '@/lib/growth/ai-visibility/providers/fake-adapter'
import { type ProviderAdapter } from '@/lib/growth/ai-visibility/providers/types'

const forceFake = process.env.GROWTH_SMOKE_FAKE === '1' || !isGraderEnabled()

const fakeAdapters = (): Partial<Record<GrowthAiVisibilityProviderId, ProviderAdapter>> => ({
  openai: createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' }),
  perplexity: createFakeProviderAdapter({ provider: 'perplexity', behavior: 'succeed' }),
  gemini: createFakeProviderAdapter({ provider: 'gemini', behavior: 'succeed' }),
  google_ai_overview: createFakeProviderAdapter({ provider: 'google_ai_overview', behavior: 'succeed' })
})

const main = async () => {
  console.log(`[smoke] AI Visibility Grader · modo=${GROWTH_AI_VISIBILITY_SMOKE_MODE} · ${forceFake ? 'FAKE adapters (grader OFF / GROWTH_SMOKE_FAKE)' : 'REAL adapters (grader ON)'}`)
  console.log(`[smoke] marcas: ${GROWTH_AI_VISIBILITY_BRAND_FIXTURES.map(b => b.brandName).join(', ')}`)

  for (const brand of GROWTH_AI_VISIBILITY_BRAND_FIXTURES) {
    const result = await runGraderDiagnostic({
      brandName: brand.brandName,
      websiteUrl: brand.websiteUrl,
      market: brand.market,
      locale: brand.locale,
      category: brand.category,
      competitorsDeclared: brand.competitorsDeclared,
      mode: GROWTH_AI_VISIBILITY_SMOKE_MODE,
      runKind: GROWTH_AI_VISIBILITY_SMOKE_RUN_KIND,
      adapters: forceFake ? fakeAdapters() : undefined
    })

    const byStatus = result.observations.reduce<Record<string, number>>((acc, obs) => {
      acc[obs.status] = (acc[obs.status] ?? 0) + 1

      return acc
    }, {})

    console.log(
      `[smoke] ${brand.brandName} → run ${result.run.publicId} status=${result.run.status} ` +
        `obs=${result.observations.length} (${Object.entries(byStatus).map(([k, v]) => `${k}:${v}`).join(' ')}) ` +
        `cost~$${result.run.estimatedCostUsd} costGuard=${result.costGuardTripped}`
    )
  }

  console.log('[smoke] OK. Detalle por run: GET /api/admin/growth/ai-visibility/runs/<runId>.')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[smoke] FAIL:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
