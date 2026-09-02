/**
 * TASK-1427 — Observacion RETROACTIVA de los signals `growth.cta.*` sobre la ventana
 * productiva, contra PG real.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-cta-signal-window.ts
 *
 * Por que existe: los readers de `growth-cta-signals.ts` miran SOLO `INTERVAL '1 day'`.
 * Sirven para "esta sano ahora", NO para "estuvo steady durante los siete dias que
 * vencieron el 2026-07-25". Este script hace la pregunta que el criterio de aceptacion
 * hace de verdad: dia por dia sobre la tabla base.
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

  const span = await runGreenhousePostgresQuery<Record<string, string>>(
    `SELECT COUNT(*)::text AS eventos,
            MIN(created_at)::text AS primero,
            MAX(created_at)::text AS ultimo
       FROM greenhouse_growth.cta_conversion_event`
  )

  console.log('cta_conversion_event (todo el historico):', JSON.stringify(span[0]))

  const daily = await runGreenhousePostgresQuery<Record<string, string>>(
    `SELECT (created_at AT TIME ZONE 'America/Santiago')::date::text AS dia,
            COUNT(*)::text AS eventos,
            COUNT(*) FILTER (WHERE event_kind = 'error'
                               AND trust_level = 'server_confirmed')::text AS errores,
            COUNT(*) FILTER (WHERE ingest_status = 'rejected')::text AS rechazados
       FROM greenhouse_growth.cta_conversion_event
      WHERE created_at >= TIMESTAMPTZ '2026-07-18 00:00:00-04'
      GROUP BY 1 ORDER BY 1`
  )

  console.log('--- dia a dia desde el deploy productivo (2026-07-18) ---')
  for (const d of daily) console.log(JSON.stringify(d))

  const kill = await runGreenhousePostgresQuery<Record<string, string>>(
    `SELECT COUNT(*)::text AS enganchados
       FROM (SELECT DISTINCT ON (scope, surface_id) action
               FROM greenhouse_growth.cta_kill_switch_event
              ORDER BY scope, surface_id, created_at DESC) AS actual
      WHERE actual.action = 'engage'`
  )

  console.log('kill switches enganchados hoy:', JSON.stringify(kill[0]))

  const collisions = await runGreenhousePostgresQuery<Record<string, string>>(
    `SELECT COALESCE(SUM(observed_count), 0)::text AS colisiones
       FROM greenhouse_growth.cta_exposure_rollup
      WHERE reason_class = 'higher_priority_selected'
        AND bucket_start >= TIMESTAMPTZ '2026-07-18 00:00:00-04'`
  )

  console.log('colisiones de prioridad desde el deploy:', JSON.stringify(collisions[0]))

  const roll = await runGreenhousePostgresQuery<Record<string, string>>(
    `SELECT (bucket_start AT TIME ZONE 'America/Santiago')::date::text AS dia,
            COALESCE(SUM(observed_count),0)::text AS observados,
            COUNT(DISTINCT reason_class)::text AS clases
       FROM greenhouse_growth.cta_exposure_rollup
      GROUP BY 1 ORDER BY 1`
  )

  console.log('--- cta_exposure_rollup dia a dia ---')
  for (const d of roll) console.log(JSON.stringify(d))

  const kinds = await runGreenhousePostgresQuery<Record<string, string>>(
    `SELECT event_kind, ingest_status, COUNT(*)::text AS n
       FROM greenhouse_growth.cta_conversion_event GROUP BY 1,2 ORDER BY 3 DESC`
  )

  console.log('--- desglose de los 24 eventos ---')
  for (const k of kinds) console.log(JSON.stringify(k))
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('ERR', e?.message ?? e)
    process.exit(1)
  })
