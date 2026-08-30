/**
 * TASK-1699 — Verificación del DÍA 1 de la serie del top-N (Pasos 5 y 6 de la
 * `Production verification sequence`). NO gasta: sólo lee lo que el cron ya escribió.
 *
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/_verify-task-1699-day-one.ts [--date 2026-08-29]
 *
 * ⚠️ Los tres criterios del Paso 5 se afinaron contra los datos REALES del día 1, porque la
 * prosa de la spec era pre-observación:
 *
 *  (a) «~20 filas por keyword» se cuenta sobre `item_type='organic'`. El writer persiste
 *      TODOS los item_types a propósito (ai_overview, people_also_ask, local_pack, …), así
 *      que el total por keyword es legítimamente mayor que 20 y no dice nada del top-N.
 *
 *  (b) «exactamente una fila `is_own_domain`» es FALSO como invariante: un dominio aparece
 *      varias veces en un SERP real (subdominios, múltiples orgánicos, local_pack), y en una
 *      keyword diagnóstica como `site:berel.com` aparece en TODAS. Lo que sí es invariante:
 *      el **`rank_group` MÍNIMO entre las filas propias orgánicas** debe igualar
 *      `seo_rank_snapshots.position` — que es justo lo que el snapshot mide.
 *
 *  (c) el costo del día 1 debe ser IDÉNTICO al de los días previos a la serie (misma familia,
 *      mismo consumer, mismo call_count). Es la prueba de costo marginal cero.
 */

import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'

const dateArgIndex = process.argv.indexOf('--date')
const DAY = dateArgIndex >= 0 ? process.argv[dateArgIndex + 1] : '2026-08-29'

let pass = 0
let fail = 0

const check = (ok: boolean, label: string, detail?: unknown) => {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
  ok ? (pass += 1) : (fail += 1)
}

const main = async () => {
  console.log(`TASK-1699 — verificación del día 1 (${DAY})\n`)

  // ── (a) ~20 filas ORGÁNICAS por keyword ──────────────────────────────────
  const organic = await runGreenhousePostgresQuery<{
    keywords: number
    min_filas: number
    max_filas: number
    avg_filas: number
  }>(
    `SELECT COUNT(*)::int AS keywords, MIN(n)::int AS min_filas, MAX(n)::int AS max_filas,
            ROUND(AVG(n), 2)::float8 AS avg_filas
       FROM (SELECT keyword, COUNT(*)::int AS n
               FROM greenhouse_growth.seo_serp_top_results
              WHERE capture_date = $1::date AND item_type = 'organic'
              GROUP BY keyword) q`,
    [DAY]
  )

  const a = organic[0]

  check(
    a !== undefined && a.keywords > 0 && a.avg_filas >= 10 && a.avg_filas <= 20,
    '(a) ~20 filas orgánicas por keyword (el proveedor sirve hasta 20)',
    a
  )

  // ── (b) el mejor orgánico propio == la posición del snapshot ─────────────
  const parity = await runGreenhousePostgresQuery<{
    comparadas: number
    coinciden: number
    discrepan: number
  }>(
    `WITH mejor_propia AS (
       SELECT seo_target_id, keyword, engine, device, capture_date,
              MIN(rank_group)::int AS mejor_rank
         FROM greenhouse_growth.seo_serp_top_results
        WHERE capture_date = $1::date AND is_own_domain AND item_type = 'organic'
        GROUP BY 1, 2, 3, 4, 5
     )
     SELECT COUNT(*)::int AS comparadas,
            COUNT(*) FILTER (WHERE m.mejor_rank = s.position)::int AS coinciden,
            COUNT(*) FILTER (WHERE m.mejor_rank <> s.position)::int AS discrepan
       FROM mejor_propia m
       JOIN greenhouse_growth.seo_rank_snapshots s
         ON s.seo_target_id = m.seo_target_id AND s.keyword = m.keyword
        AND s.capture_date = m.capture_date AND s.engine = m.engine AND s.device = m.device
      WHERE s.position IS NOT NULL`,
    [DAY]
  )

  const b = parity[0]

  check(
    b !== undefined && b.comparadas > 0 && b.discrepan === 0,
    '(b) el rank_group mínimo propio orgánico == seo_rank_snapshots.position',
    b
  )

  // ── (c) costo marginal CERO: día 1 idéntico al baseline pre-serie ────────
  const cost = await runGreenhousePostgresQuery<{
    dia: string
    organization_id: string
    call_count: number
    costo: number
  }>(
    `SELECT to_char(spend_date, 'YYYY-MM-DD') AS dia, organization_id, call_count,
            provider_cost_usd::float8 AS costo
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE family = 'serp' AND consumer = 'seo'
        AND spend_date BETWEEN $1::date - 3 AND $1::date
      ORDER BY spend_date`,
    [DAY]
  )

  console.table(cost)

  const dia1 = cost.filter(r => r.dia === DAY)
  const baseline = cost.filter(r => r.dia !== DAY)

  const identico =
    dia1.length > 0 &&
    baseline.length > 0 &&
    baseline.every(b0 =>
      dia1.some(d => d.organization_id === b0.organization_id && d.costo === b0.costo && d.call_count === b0.call_count)
    )

  check(identico, '(c) costo marginal CERO: el día 1 cuesta lo mismo que los días previos a la serie', {
    dia1: dia1.map(r => ({ costo: r.costo, calls: r.call_count })),
    baseline: baseline.map(r => ({ dia: r.dia, costo: r.costo, calls: r.call_count }))
  })

  // ── (Paso 6) el no-op de la re-corrida del mismo día ─────────────────────
  const dup = await runGreenhousePostgresQuery<{ ranuras_duplicadas: number }>(
    `SELECT COUNT(*)::int AS ranuras_duplicadas
       FROM (SELECT seo_target_id, keyword, engine, device, capture_date, rank_absolute
               FROM greenhouse_growth.seo_serp_top_results
              GROUP BY 1, 2, 3, 4, 5, 6
             HAVING COUNT(*) > 1) q`
  )

  check(
    dup[0]?.ranuras_duplicadas === 0,
    '(Paso 6) cero ranuras duplicadas — el ON CONFLICT DO NOTHING sostiene el no-op',
    dup[0]
  )

  console.log(`\n${fail === 0 ? '✓' : '✗'} TASK-1699 día 1: ${pass} pass / ${fail} fail`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
