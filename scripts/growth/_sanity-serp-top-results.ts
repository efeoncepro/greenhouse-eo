/**
 * TASK-1699 — Sanity live del top-N del SERP (PG real, SIN proveedor, SIN residuo).
 *
 * Corre con el proxy Cloud SQL arriba:
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-serp-top-results.ts
 *
 * Gate TASK-893: los mocks ejercitan el TS, nunca el SQL. Acá se ejercita contra
 * PostgreSQL real: el INSERT productivo del writer (dos filas de la misma keyword con
 * distinto rank_absolute entran; la ranura repetida es no-op del DO NOTHING), el trigger
 * append-only, y el SQL de los readers (percentile_cont, HAVING, DATE − int).
 *
 * La tabla es append-only (DELETE prohibido por trigger), así que la limpieza NO puede ser
 * un DELETE en finally: los INSERTs de prueba corren DENTRO de `withTransaction` y la
 * transacción se aborta a propósito con un sentinel — rollback real de una sola conexión,
 * cero residuo. (El anti-patrón que esta técnica evita es el BEGIN/ROLLBACK cross-pool,
 * que no es transaccional.)
 */

import { withTransaction } from '../../src/lib/db'
import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { readSerpCompetitorCandidates, readSerpTopResults } from '../../src/lib/growth/seo/competitor-discovery'
import { parseSerpTopResults, persistSerpTopResults } from '../../src/lib/growth/seo/serp-top-results'

const TARGET = 'seot-berel-mx'
const SENTINEL = 'sanity-task-1699-rollback'

const ENV_ON = {
  ...process.env,
  GROWTH_SEO_ENABLED: 'true',
  GROWTH_SEO_SERP_TOP_RESULTS_ENABLED: 'true'
} as NodeJS.ProcessEnv

let pass = 0
let fail = 0

const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) {
    pass += 1
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    fail += 1
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const main = async () => {
  // El parser sobre un fixture con rank_group repetido entre bloques (el caso que
  // justifica la ranura absoluta) alimenta el INSERT real.
  const rows = parseSerpTopResults(
    [
      {
        result: [
          {
            items: [
              { type: 'ai_overview', rank_absolute: 1, rank_group: 1 },
              { type: 'organic', rank_absolute: 2, rank_group: 1, domain: 'comex.com.mx', url: 'https://comex.com.mx/x', title: 'Sanity 1699' },
              { type: 'video', rank_absolute: 3, rank_group: 1, title: 'Video sanity' }
            ]
          }
        ]
      }
    ],
    'berel.com'
  )

  check('parser: 3 filas con rank_group repetido entre bloques', rows.length === 3)

  try {
    await withTransaction(async client => {
      const base = {
        seoTargetId: TARGET,
        keyword: 'sanity task 1699',
        engine: 'google',
        device: 'desktop',
        captureDate: '2001-01-01', // fecha imposible del cron: jamás colisiona con datos reales
        sourceRunId: 'sanity-task-1699'
      }

      const first = await persistSerpTopResults(client, { ...base, rows })

      check('INSERT productivo: entran las 3 filas', first.rowsWritten === 3, `rowsWritten=${first.rowsWritten}`)

      // Ranura repetida (mismo rank_absolute): el DO NOTHING la resuelve como no-op.
      const dup = await persistSerpTopResults(client, { ...base, rows: [rows[0]] })

      check('ranura repetida = no-op (DO NOTHING sobre la UNIQUE)', dup.rowsWritten === 0, `rowsWritten=${dup.rowsWritten}`)

      const count = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_serp_top_results
          WHERE seo_target_id = $1 AND capture_date = '2001-01-01'`,
        [TARGET]
      )

      check('conteo dentro de la tx = 3', count.rows[0]?.n === '3')

      // Trigger append-only: UPDATE debe reventar (y con eso la tx queda abortada — da
      // igual: el paso siguiente es el rollback deliberado).
      let updateBlocked = false

      try {
        await client.query(
          `UPDATE greenhouse_growth.seo_serp_top_results SET result_title = 'x'
            WHERE seo_target_id = $1 AND capture_date = '2001-01-01'`,
          [TARGET]
        )
      } catch {
        updateBlocked = true
      }

      check('trigger append-only bloquea UPDATE', updateBlocked)

      throw new Error(SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== SENTINEL) {
      // El sentinel es el final feliz; cualquier otra cosa es un fallo real.
      check('rollback deliberado', false, error instanceof Error ? error.message : String(error))
    } else {
      check('rollback deliberado (sentinel)', true)
    }
  }

  const residue = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_serp_top_results
      WHERE capture_date = '2001-01-01'`
  )

  check('cero residuo tras el rollback', residue[0]?.n === '0', `filas=${residue[0]?.n}`)

  // ── Readers contra SQL real (serie vacía pre-rollout = estado honesto) ──
  const top = await readSerpTopResults(TARGET, { env: ENV_ON, limit: 5 })

  check('readSerpTopResults ok contra PG real', top.ok, top.ok ? `rows=${top.rows.length}` : top.errorCode)

  const candidates = await readSerpCompetitorCandidates(TARGET, { env: ENV_ON })

  check(
    'readSerpCompetitorCandidates ok (percentile_cont + HAVING contra PG real)',
    candidates.ok,
    candidates.ok ? `candidatos=${candidates.candidates.length}` : candidates.errorCode
  )

  console.log(`\n${fail === 0 ? '✓' : '✗'} sanity TASK-1699: ${pass} pass / ${fail} fail`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(error => {
  console.error('sanity TASK-1699 reventó:', error)
  process.exit(1)
})
