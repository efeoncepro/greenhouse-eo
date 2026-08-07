/**
 * TASK-1307 — sanity live de los readers de la pantalla ancla contra PostgreSQL REAL.
 *
 * Existe porque los mocks de Vitest ejercitan el TypeScript, NO el SQL: el gate de
 * TASK-893 exige que toda query embebida con `CASE`/`COALESCE`/date-math se corra al menos
 * una vez contra PG antes de mergear (la clase de bug de ISSUE-071 — `COALESCE types
 * integer and boolean cannot be matched` — es invisible para un mock).
 *
 * Read-only: no escribe nada. Correr con el proxy arriba (`pnpm pg:connect`):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-performance.ts
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { readSeoPerformance } from '../../src/lib/growth/seo/performance/read-performance'
import { readSeoPerformanceCatalog } from '../../src/lib/growth/seo/performance/read-performance-catalog'

const main = async () => {
  // El flag gatea los readers; sin él ambos degradan a `disabled` y el sanity no probaría
  // ni una línea de SQL.
  process.env.GROWTH_SEO_ENABLED = 'true'

  const orgs = await runGreenhousePostgresQuery<{ organization_id: string; rows: string }>(
    `SELECT organization_id, COUNT(*)::text AS rows
       FROM greenhouse_growth.seo_gsc_daily
      GROUP BY organization_id
      ORDER BY COUNT(*) DESC
      LIMIT 3`
  )

  console.log('[sanity] orgs con datos GSC:', orgs)

  const organizationId = orgs[0]?.organization_id

  if (!organizationId) {
    console.log('[sanity] SIN datos GSC materializados — no hay qué ejercitar.')

    return
  }

  for (const mode of ['keyword', 'url'] as const) {
    const catalog = await readSeoPerformanceCatalog(organizationId, { mode, limit: 5 })

    console.log(`[sanity] catálogo ${mode}:`, catalog.ok ? catalog.items : catalog)

    if (!catalog.ok) {
      continue
    }

    const items = catalog.items.slice(0, 3).map(entry => entry.item)

    for (const metric of ['position', 'clicks', 'ctr'] as const) {
      const result = await readSeoPerformance(organizationId, { mode, metric, items, rangeDays: 90 })

      if (!result.ok) {
        console.log(`[sanity] ${mode}/${metric} → ${result.errorCode}`)
        continue
      }

      console.log(
        `[sanity] ${mode}/${metric} → source=${result.source} series=${result.series.length}`,
        `standings=${result.standings.length} sinDato=${result.itemsWithoutData.length}`,
        `range=${result.range.from}..${result.range.to}`
      )

      const first = result.standings[0]

      if (first) {
        console.log(
          `           ${first.item}: pos=${String(first.position)} Δ30d=${String(first.positionDelta30d)}`,
          `clics=${first.clicks} impr=${first.impressions} ctr=${String(first.ctr)}`,
          `puntosSparkline=${first.trend.length}`
        )
      }
    }
  }
}

main()
  .then(() => console.log('[sanity] OK'))
  .catch(error => {
    console.error('[sanity] FALLÓ:', error)
    process.exitCode = 1
  })
  // `finally`: el pool queda abierto y el proceso nunca terminaría (patrón canónico de los
  // sanity scripts del repo).
  .finally(async () => {
    await closeGreenhousePostgres()
  })
