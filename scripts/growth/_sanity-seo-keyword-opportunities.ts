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
 * ⚠️ POR QUÉ NO USA EL `DELETE` DE LIMPIEZA DEL RESTO DE LOS SANITY DEL REPO:
 * `seo_gsc_daily` es append-only (trigger no-delete), así que sus filas de prueba NO se
 * pueden borrar. La única salida segura es una transacción que aborta — y tiene que ser
 * sobre una CONEXIÓN FIJADA: `runGreenhousePostgresQuery` toma una del pool por llamada, así
 * que un `BEGIN` no cubre lo que sigue y las escrituras pueden quedar permanentes pese al
 * `ROLLBACK` (hallazgo TASK-1300; un `SAVEPOINT` revienta con 25P01 y lo demuestra).
 *
 * Consecuencia: como el reader usa el pool por dentro y no podría ver esta transacción, se
 * ejercita el SQL EXPORTADO por el módulo (`SEO_KEYWORD_OPPORTUNITIES_SQL`) — no una copia,
 * para que el script no pueda quedar verde probando una versión vieja del SQL.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const ROLLBACK_SENTINEL = 'sanity-rollback'

const main = async () => {
  const { withGreenhousePostgresTransaction, runGreenhousePostgresQuery } = await import(
    '@/lib/postgres/client'
  )

  const { SEO_KEYWORD_OPPORTUNITIES_SQL } = await import(
    '@/lib/growth/seo/keyword-opportunities-reader'
  )

  const org = (
    await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_core.organizations LIMIT 1`
    )
  )[0]

  if (!org) {
    console.error('No hay organizaciones: no se puede ejercitar el SQL.')
    process.exit(1)
  }

  const checks: Array<[string, boolean]> = []

  const gscBefore = (
    await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_gsc_daily`
    )
  )[0]?.n

  try {
    await withGreenhousePostgresTransaction(async client => {
      const orgId = org.organization_id

      // Serie sintética. `dayOffset` distinto cuando se quiere serie: dos filas del mismo día
      // y la misma página son la MISMA medición (colisionan por la UNIQUE de captura), así que
      // la ponderación por impresiones se prueba ENTRE días, que es el caso real.
      const rows: Array<[string, string, number, number, number, number, number]> = [
        ['oportunidad', 'https://sanity-1302.example/a', 40, 800, 0.05, 12.0, 1],
        ['oportunidad', 'https://sanity-1302.example/a', 30, 600, 0.05, 12.4, 2],
        ['canibalizada', 'https://sanity-1302.example/b', 10, 300, 0.033, 9.0, 1],
        ['canibalizada', 'https://sanity-1302.example/c', 5, 200, 0.025, 14.0, 1],
        ['ya-top', 'https://sanity-1302.example/d', 200, 900, 0.22, 2.0, 1],
        ['ruido', 'https://sanity-1302.example/e', 0, 1, 0, 15.0, 1]
      ]

      for (const [query, page, clicks, impressions, ctr, position, dayOffset] of rows) {
        await client.query(
          `INSERT INTO greenhouse_growth.seo_gsc_daily
             (organization_id, site_url, capture_date, query, page, clicks, impressions, ctr, position)
           VALUES ($1, 'sc-domain:sanity-1302.example', CURRENT_DATE - $8::int, $2, $3, $4, $5, $6, $7)`,
          [orgId, query, page, clicks, impressions, ctr, position, dayOffset]
        )
      }

      // Umbral 10 (piso estadístico) para que el fixture no dependa del percentil de la org.
      const result = await client.query<{
        keyword: string
        page: string
        weighted_position: string
        impressions: string
        clicks: string
        competing_pages: string
      }>(SEO_KEYWORD_OPPORTUNITIES_SQL, [orgId, 28, 8, 20, 10, 50])

      const byKeyword = new Map(result.rows.map(row => [row.keyword, row]))

      checks.push(['el SQL corre contra PG real (CTEs + DISTINCT ON + agregados)', true])
      checks.push(['incluye la keyword en striking-distance', byKeyword.has('oportunidad')])
      checks.push(['excluye la que ya está en top-3', !byKeyword.has('ya-top')])
      checks.push(['excluye la que no supera el piso estadístico', !byKeyword.has('ruido')])
      checks.push([
        'detecta canibalización (>1 página para la misma query)',
        Number(byKeyword.get('canibalizada')?.competing_pages) === 2
      ])
      checks.push([
        'pondera la posición por impresiones (≈12.17, no 12.2 plano)',
        Math.abs(Number(byKeyword.get('oportunidad')?.weighted_position) - 12.1714) < 0.01
      ])
      checks.push([
        'elige como página la de más impresiones',
        byKeyword.get('oportunidad')?.page === 'https://sanity-1302.example/a'
      ])

      console.log(
        `oportunidades: ${result.rows.map(r => `${r.keyword}@${Number(r.weighted_position).toFixed(2)}`).join(', ')}`
      )

      // Aborta SIEMPRE: `seo_gsc_daily` es append-only y estas filas NO se pueden borrar.
      throw new Error(ROLLBACK_SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_SENTINEL) throw error
  }

  let failures = 0

  for (const [label, passed] of checks) {
    console.log(`${passed ? '✓' : '✗'} ${label}`)
    if (!passed) failures += 1
  }

  const gscAfter = (
    await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_gsc_daily`
    )
  )[0]?.n

  const clean = gscBefore === gscAfter

  console.log(`${clean ? '✓' : '✗'} cero residuo (antes=${gscBefore}, después=${gscAfter})`)
  if (!clean) failures += 1

  const synthetic = (
    await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_gsc_daily WHERE site_url = 'sc-domain:sanity-1302.example'`
    )
  )[0]?.n

  console.log(`${synthetic === '0' ? '✓' : '✗'} sin filas sintéticas en la serie (${synthetic})`)
  if (synthetic !== '0') failures += 1

  if (failures > 0) {
    console.error(`\nFAIL — ${failures} verificación(es) fallaron.`)
    process.exit(1)
  }

  console.log('\nOK — el striking-distance se comporta contra PG real, sin tocar la serie productiva.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
