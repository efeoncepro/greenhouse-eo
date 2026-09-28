/** Bounded standalone canary; no persisted reports, profiles or historical evidence changes. */
import { GROWTH_MARKET_REGISTRY, resolveGrowthMarket } from '../../src/lib/growth/markets'
import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { createGoogleAiOverviewProviderAdapter } from '../../src/lib/growth/ai-visibility/providers/google-ai-overview-adapter'
import { createProviderAdapterContext } from '../../src/lib/growth/ai-visibility/providers/types'
import { GROWTH_AI_VISIBILITY_PROVIDER_POLICY_VERSION } from '../../src/lib/growth/ai-visibility/policy'

const languageCases = [
  { market: 'PE', locale: 'es-PE', prompt: '¿Qué marcas de café de Perú son conocidas por su calidad?' },
  { market: 'MX', locale: 'es-MX', prompt: '¿Qué marcas de café de México son conocidas por su calidad?' },
  { market: 'US', locale: 'en-US', prompt: 'Which coffee brands in the United States are known for their quality?' },
  { market: 'BR', locale: 'pt-BR', prompt: 'Quais marcas de café do Brasil são conhecidas pela qualidade?' },
  { market: 'HT', locale: 'fr-HT', prompt: 'Quelles marques de café en Haïti sont connues pour leur qualité ?' }
]

const cases = process.argv.includes('--all')
  ? Object.keys(GROWTH_MARKET_REGISTRY).map(code => {
      const resolved = resolveGrowthMarket(code)

      const prompt =
        languageCases.find(sample => sample.locale === resolved.locale)?.prompt ??
        `¿Qué marcas de café en ${resolved.label} son conocidas por su calidad?`

      return { market: code, locale: resolved.locale, prompt }
    })
  : languageCases

async function main() {
  if (!process.argv.includes('--spend')) {
    console.log(JSON.stringify({ dryRun: true, calls: cases.length, cases }))

    return
  }

  loadGreenhouseToolEnv()
  // Process-local switches only; no Vercel/Cloud Run flag mutation.
  process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED = 'true'
  process.env.GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED = 'true'
  const adapter = createGoogleAiOverviewProviderAdapter()
  const results = []

  for (const sample of cases) {
    const observation = await adapter.runPrompt(
      {
        runId: `canary-task1863-${Date.now()}`,
        promptId: 'canary',
        promptText: sample.prompt,
        locale: sample.locale,
        market: sample.market,
        brandName: 'Canary',
        websiteUrl: null,
        competitorsDeclared: [],
        mode: 'light'
      },
      createProviderAdapterContext({
        organizationId: null,
        providerPolicyVersion: GROWTH_AI_VISIBILITY_PROVIDER_POLICY_VERSION,
        promptPackVersion: 'task1863.canary.v1',
        timeoutMs: 45_000,
        maxRetries: 0
      })
    )

    results.push({
      market: sample.market,
      locale: sample.locale,
      status: observation.status,
      errorCode: observation.errorCode,
      usage: observation.usage,
      citations: observation.citations.length,
      latencyMs: observation.latencyMs
    })
    console.log(JSON.stringify(results[results.length - 1]))
    if (observation.status === 'failed' || observation.status === 'rate_limited') process.exitCode = 1
  }
}

main().catch(() => {
  console.error('multilingual_canary_failed')
  process.exitCode = 1
})
