/**
 * TASK-1430 — sanity SQL vivo de las métricas de marketing del cockpit (gate TASK-893:
 * SQL embebido con CASE/date-math se ejercita contra PG real ANTES de mergear).
 * Read-only: cero writes.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-cta-metrics-sql.ts
 */
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

// `.env.local` puede traer un GOOGLE_APPLICATION_CREDENTIALS_JSON no parseable (newlines
// literales); para tooling local el path canónico es ADC — fallback explícito con warning.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  } catch {
    console.warn('WARN: GOOGLE_APPLICATION_CREDENTIALS_JSON no parsea — usando ADC local.')
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  }
}

const main = async () => {
  const { closeGreenhousePostgres, query } = await import('../../src/lib/db')
  const { summarizeViewedExposureWindows, summarizeCtaExposure } = await import('../../src/lib/growth/ctas/exposure')
  const { getCtaMarketingMetrics } = await import('../../src/lib/growth/ctas/readers')

  const { getLastAcceptedEventAt, listCtaDefinitions, summarizeConversionEventWindows } = await import(
    '../../src/lib/growth/ctas/store'
  )

  const definitions = await listCtaDefinitions()

  if (definitions.length === 0) {
    console.log('Sin CTAs en la instancia — se ejercita solo la query global de exposure.')
    await summarizeCtaExposure(30, null)
    await closeGreenhousePostgres()

    return
  }

  // Preferir el CTA con más eventos accepted (ejercita el bucketing con data real).
  const withEvents = await query<{ cta_id: string; n: number }>(
    `SELECT cta_id, COUNT(*)::int AS n
       FROM greenhouse_growth.cta_conversion_event
      WHERE ingest_status = 'accepted' AND cta_id IS NOT NULL
      GROUP BY 1 ORDER BY n DESC LIMIT 1`,
  )

  const ctaId = withEvents[0]?.cta_id ?? definitions[0].cta_id
  const slug = definitions.find(definition => definition.cta_id === ctaId)?.slug ?? '(sin slug)'

  console.log(`CTA de prueba: ${slug} (${ctaId}) — eventos accepted: ${withEvents[0]?.n ?? 0}`)

  const [windows, viewed, lastAt, exposureAll, exposureOne, metrics] = await Promise.all([
    summarizeConversionEventWindows(ctaId, 30),
    summarizeViewedExposureWindows(ctaId, 30),
    getLastAcceptedEventAt(ctaId),
    summarizeCtaExposure(30, null),
    summarizeCtaExposure(30, ctaId),
    getCtaMarketingMetrics(ctaId, 30),
  ])

  console.log('summarizeConversionEventWindows →', JSON.stringify(windows))
  console.log('summarizeViewedExposureWindows →', JSON.stringify(viewed))
  console.log('getLastAcceptedEventAt →', lastAt)
  console.log(`summarizeCtaExposure(30, null) → ${exposureAll.length} filas · (30, ctaId) → ${exposureOne.length} filas`)
  console.log('getCtaMarketingMetrics →', JSON.stringify(metrics, null, 2))
  console.log('OK — todas las queries ejecutaron contra PG real.')

  await closeGreenhousePostgres()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('SANITY FAILED:', error)
    process.exit(1)
  })
