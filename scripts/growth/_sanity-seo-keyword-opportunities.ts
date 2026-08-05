/**
 * TASK-1302 — Sanity live del reader de oportunidades contra PG real.
 *
 * Gate TASK-893: la SQL embebida con CTEs, `DISTINCT ON` + agregados, `PERCENTILE_CONT`
 * y comparaciones sobre columnas DATE se ejercita contra PostgreSQL, NUNCA sólo con
 * mocks — los mocks ejercitan el TS, no el SQL.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-keyword-opportunities.ts
 *
 * Inserta un target + una serie GSC sintética, verifica el striking-distance, la
 * ponderación por impresiones y la detección de canibalización, y hace ROLLBACK total.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { readKeywordOpportunities } = await import('@/lib/growth/seo/keyword-opportunities-reader')

  const org = (
    await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_core.organizations LIMIT 1`
    )
  )[0]

  if (!org) {
    console.error('No hay organizaciones: no se puede ejercitar el reader.')
    process.exit(1)
  }

  await runGreenhousePostgresQuery('BEGIN')

  try {
    const target = (
      await runGreenhousePostgresQuery<{ seo_target_id: string }>(
        `INSERT INTO greenhouse_growth.seo_targets (organization_id, root_domain, location_code, language_code)
         VALUES ($1, 'sanity-1302.example', 'cl', 'es')
         RETURNING seo_target_id`,
        [org.organization_id]
      )
    )[0]

    if (!target) throw new Error('no se pudo crear el target de prueba')

    // Serie sintética:
    //  - "oportunidad": pos 12 estable, muchas impresiones → debe aparecer.
    //  - "canibalizada": misma query en 2 páginas → debe marcarse.
    //  - "ya-top": pos 2 → fuera del rango striking-distance.
    //  - "ruido": 1 impresión → bajo el piso estadístico.
    // `dayOffset` distinto por fila cuando se quiere una serie: dos filas del mismo día
    // y la misma página son la MISMA medición (colisionan por la UNIQUE de captura). La
    // ponderación por impresiones se prueba justamente ENTRE días, que es el caso real.
    const rows: Array<[string, string, number, number, number, number, number]> = [
      ['oportunidad', 'https://sanity-1302.example/a', 40, 800, 0.05, 12.0, 1],
      ['oportunidad', 'https://sanity-1302.example/a', 30, 600, 0.05, 12.4, 2],
      ['canibalizada', 'https://sanity-1302.example/b', 10, 300, 0.033, 9.0, 1],
      ['canibalizada', 'https://sanity-1302.example/c', 5, 200, 0.025, 14.0, 1],
      ['ya-top', 'https://sanity-1302.example/d', 200, 900, 0.22, 2.0, 1],
      ['ruido', 'https://sanity-1302.example/e', 0, 1, 0, 15.0, 1]
    ]

    for (const [query, page, clicks, impressions, ctr, position, dayOffset] of rows) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_growth.seo_gsc_daily
           (organization_id, site_url, capture_date, query, page, clicks, impressions, ctr, position)
         VALUES ($1, 'sc-domain:sanity-1302.example', CURRENT_DATE - $8::int, $2, $3, $4, $5, $6, $7)`,
        [org.organization_id, query, page, clicks, impressions, ctr, position, dayOffset]
      )
    }

    const result = await readKeywordOpportunities(target.seo_target_id, { impressionsPercentile: 0 })

    if (!result.ok) {
      console.error(`FAIL — el reader degradó: ${result.errorCode}`)
      process.exit(1)
    }

    const byKeyword = new Map(result.opportunities.map(item => [item.keyword, item]))

    const checks: Array<[string, boolean]> = [
      ['SQL ejecuta contra PG real (CTEs + DISTINCT ON + PERCENTILE_CONT)', true],
      ['incluye la keyword en striking-distance', byKeyword.has('oportunidad')],
      ['excluye la que ya está en top-3', !byKeyword.has('ya-top')],
      ['excluye la que no supera el piso estadístico', !byKeyword.has('ruido')],
      ['marca canibalización cuando hay >1 página', byKeyword.get('canibalizada')?.cannibalized === true],
      ['cuenta las páginas en competencia', byKeyword.get('canibalizada')?.competingPages === 2],
      [
        'pondera la posición por impresiones (≈12.17, no 12.2 plano)',
        Math.abs((byKeyword.get('oportunidad')?.position ?? 0) - 12.17) < 0.05
      ],
      ['estima ganancia de clics no negativa', (byKeyword.get('oportunidad')?.estimatedClickGain ?? -1) >= 0],
      ['declara el mercado como no disponible (TASK-1300 pendiente)', result.market === 'unavailable']
    ]

    let failed = 0

    for (const [label, passed] of checks) {
      console.log(`${passed ? '✓' : '✗'} ${label}`)
      if (!passed) failed += 1
    }

    console.log(`\numbral de impresiones resuelto: ${result.impressionsThreshold}`)
    console.log(`oportunidades: ${result.opportunities.map(o => `${o.keyword}@${o.position}`).join(', ')}`)

    if (failed > 0) {
      console.error(`\nFAIL — ${failed} verificación(es) fallaron.`)
      process.exit(1)
    }

    console.log('\nOK — el reader se comporta contra PG real.')
  } finally {
    await runGreenhousePostgresQuery('ROLLBACK')

    const residue = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_gsc_daily WHERE site_url = 'sc-domain:sanity-1302.example'`
    )

    console.log(`residuo tras rollback: ${residue[0]?.n ?? '?'} filas`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
