/**
 * TASK-1652 — Sanity live del adapter google_ai_overview contra DataForSEO real.
 *
 * Corre local con creds (source .env.local para DATAFORSEO_API_LOGIN + SECRET_REF; ADC activa):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1652-ai-mode-smoke.ts --spend [--market=CL]
 *
 * Sin `--spend` no llama al proveedor (imprime el plan y sale). Con `--spend` ejecuta
 * UNA llamada real AI Mode live advanced (~USD 0,004) vía el adapter completo y verifica:
 *   - request con location_code numérico (market ISO-2 mapeado, fix Slice 1);
 *   - task per-task status_code = 20000 en usage (gate Slice 1);
 *   - estado `succeeded` (con citas de dominios reales, parser Slice 2) o skip honesto
 *     `no_ai_overview_block` — nunca un failed por request malformado.
 */

import { createGoogleAiOverviewProviderAdapter } from '../../src/lib/growth/ai-visibility/providers/google-ai-overview-adapter'
import { createProviderAdapterContext } from '../../src/lib/growth/ai-visibility/providers/types'

const SPEND = process.argv.includes('--spend')
const MARKET = process.argv.find(a => a.startsWith('--market='))?.slice('--market='.length) ?? 'CL'

process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED = 'true'
process.env.GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED = 'true'

const main = async () => {
  if (!SPEND) {
    console.log(`[dry] Llamaría AI Mode live advanced con market=${MARKET} (~USD 0,004). Usa --spend para ejecutar.`)

    return
  }

  const adapter = createGoogleAiOverviewProviderAdapter()

  const enabled = await adapter.isEnabled()

  if (!enabled) {
    console.error('FAIL: adapter deshabilitado (flags o credenciales ausentes) — revisa .env.local + ADC')
    process.exitCode = 1

    return
  }

  const observation = await adapter.runPrompt(
    {
      runId: `sanity-task-1652-${Date.now()}`,
      promptId: 'sanity-p01',
      promptText: 'Which agencies are recommended for enterprise growth marketing in Chile?',
      locale: 'es-CL',
      market: MARKET,
      brandName: 'Efeonce',
      websiteUrl: 'https://efeoncepro.com',
      competitorsDeclared: [],
      mode: 'light'
    },
    createProviderAdapterContext({
      providerPolicyVersion: 'sanity.task-1652',
      promptPackVersion: 'sanity.task-1652',
      timeoutMs: 30_000,
      maxRetries: 0
    })
  )

  console.log(
    JSON.stringify(
      {
        status: observation.status,
        errorCode: observation.errorCode,
        usage: observation.usage,
        latencyMs: observation.latencyMs,
        citationsCount: observation.citations.length,
        citations: observation.citations.slice(0, 12),
        answerExcerpt: observation.answerExcerpt?.slice(0, 200) ?? null
      },
      null,
      2
    )
  )

  const statusCode = observation.usage.dataforseo_status_code

  const ok =
    statusCode === 20000 &&
    (observation.status === 'succeeded' ||
      (observation.status === 'skipped' && observation.errorCode === 'no_ai_overview_block'))

  console.log(ok ? 'PASS: task 20000 + estado honesto' : `FAIL: statusCode=${String(statusCode)} status=${observation.status} errorCode=${String(observation.errorCode)}`)

  if (!ok) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error('FAIL (throw):', error)
  process.exitCode = 1
})
