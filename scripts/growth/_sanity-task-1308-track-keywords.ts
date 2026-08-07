/**
 * TASK-1308 — Sanity live del command `trackKeywords` contra PG real.
 *
 * Gate TASK-893: el SQL embebido del command — upsert del set, `FOR UPDATE OF` sobre un
 * JOIN, `UNNEST($n::text[])` y `ON CONFLICT (…) WHERE effective_to IS NULL DO NOTHING`
 * sobre un ÍNDICE ÚNICO PARCIAL — se ejercita contra PostgreSQL, NUNCA sólo con mocks. Los
 * mocks ejercitan el TS; el `ON CONFLICT` contra un índice parcial es exactamente la clase
 * de SQL que un mock da por buena y PG rechaza.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1308-track-keywords.ts
 *
 * ⚠️ POR QUÉ NO LLAMA A `trackKeywords` DIRECTO:
 * `seo_keyword_set_members` tiene trigger anti-DELETE (TASK-1299), así que las filas de
 * prueba NO se pueden borrar; la única salida limpia es una transacción que aborta. Y esa
 * transacción tiene que correr sobre una CONEXIÓN FIJADA, porque `runGreenhousePostgresQuery`
 * toma una del pool por llamada — un `BEGIN` no cubriría lo que sigue y las escrituras
 * quedarían permanentes pese al `ROLLBACK` (hallazgo TASK-1300; un `SAVEPOINT` revienta con
 * 25P01 y lo demuestra).
 *
 * Por eso se ejercita `applyKeywordTracking` — el núcleo transaccional que el command
 * EXPORTA, no una copia de sus queries: una copia puede quedar verde probando una versión
 * vieja del SQL.
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
const SANITY_SET_NAME = 'Sanity TASK-1308 (rollback)'

const main = async () => {
  const { withGreenhousePostgresTransaction, runGreenhousePostgresQuery } = await import(
    '@/lib/postgres/client'
  )

  const { applyKeywordTracking } = await import('@/lib/growth/seo/track-keywords')

  const target = (
    await runGreenhousePostgresQuery<{ seo_target_id: string; organization_id: string }>(
      `SELECT seo_target_id, organization_id FROM greenhouse_growth.seo_targets ORDER BY created_at LIMIT 1`
    )
  )[0]

  if (!target) {
    console.error('No hay seo_targets: no se puede ejercitar el SQL.')
    process.exit(1)
  }

  const checks: Array<[string, boolean]> = []

  const countMembers = async () =>
    (
      await runGreenhousePostgresQuery<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_keyword_set_members`
      )
    )[0]?.n

  const membersBefore = await countMembers()

  const outboxBefore = (
    await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_sync.outbox_events WHERE event_type = 'growth.seo.keyword_set.updated'`
    )
  )[0]?.n

  try {
    await withGreenhousePostgresTransaction(async client => {
      const base = {
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        setName: SANITY_SET_NAME,
        actor: 'sanity-1308',
        source: 'seed' as const
      }

      // ── 1ª pasada: set nuevo + inserción real ────────────────────────────────────────
      const first = await applyKeywordTracking(client, {
        ...base,
        capacity: 1000,
        requested: [
          { keyword: 'sanity-1308 alfa', valid: true },
          { keyword: 'sanity-1308 beta', valid: true },
          { keyword: '', valid: false }
        ]
      })

      checks.push(['el SQL corre contra PG real (upsert + FOR UPDATE OF + UNNEST)', true])
      checks.push(['crea el set y devuelve su id', first.keywordSetId.startsWith('seoks-')])
      checks.push([
        'inserta las válidas y marca la inválida',
        first.outcomes.filter(o => o.status === 'tracked').length === 2 &&
          first.outcomes.some(o => o.status === 'invalid')
      ])

      // ── 2ª pasada: idempotencia real contra el índice único PARCIAL ──────────────────
      const second = await applyKeywordTracking(client, {
        ...base,
        capacity: 1000,
        requested: [
          { keyword: 'sanity-1308 alfa', valid: true },
          { keyword: 'sanity-1308 gamma', valid: true }
        ]
      })

      checks.push([
        'la keyword ya vigente se detecta como already_tracked (no duplica)',
        second.outcomes.find(o => o.keyword === 'sanity-1308 alfa')?.status === 'already_tracked'
      ])
      checks.push([
        'reusa el MISMO set en la segunda pasada (get-or-create idempotente)',
        second.keywordSetId === first.keywordSetId
      ])

      const membersInTx = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_growth.seo_keyword_set_members
          WHERE keyword_set_id = $1 AND effective_to IS NULL`,
        [first.keywordSetId]
      )

      checks.push([
        'quedan 3 membresías vigentes (alfa, beta, gamma) — cero duplicados',
        membersInTx.rows[0]?.n === '3'
      ])

      // ── 3ª pasada: el techo de gasto diferido, contra datos reales ───────────────────
      const capped = await applyKeywordTracking(client, {
        ...base,
        capacity: 4,
        requested: [
          { keyword: 'sanity-1308 delta', valid: true },
          { keyword: 'sanity-1308 epsilon', valid: true }
        ]
      })

      checks.push([
        'el techo llena el cupo libre y rebota el resto explícito',
        capped.outcomes.find(o => o.keyword === 'sanity-1308 delta')?.status === 'tracked' &&
          capped.outcomes.find(o => o.keyword === 'sanity-1308 epsilon')?.status === 'capacity_exceeded'
      ])
      checks.push(['el conteo vigente respeta el techo', capped.activeKeywordCount === 4])

      // ── Procedencia persistida ───────────────────────────────────────────────────────
      const provenance = await client.query<{ created_by: string | null; source: string | null }>(
        `SELECT created_by, source
           FROM greenhouse_growth.seo_keyword_set_members
          WHERE keyword_set_id = $1 AND keyword = 'sanity-1308 alfa'`,
        [first.keywordSetId]
      )

      checks.push([
        'persiste procedencia (created_by + source) — columnas de la migración 1308',
        provenance.rows[0]?.created_by === 'sanity-1308' && provenance.rows[0]?.source === 'seed'
      ])

      // ── El outbox viaja DENTRO de la transacción ─────────────────────────────────────
      const outboxInTx = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_sync.outbox_events
          WHERE event_type = 'growth.seo.keyword_set.updated'
            AND aggregate_id = $1`,
        [target.seo_target_id]
      )

      checks.push(['emite el evento outbox dentro de la misma transacción', Number(outboxInTx.rows[0]?.n) >= 1])

      // Aborta SIEMPRE: `seo_keyword_set_members` es append-only y estas filas no se borran.
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

  const membersAfter = await countMembers()

  const outboxAfter = (
    await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_sync.outbox_events WHERE event_type = 'growth.seo.keyword_set.updated'`
    )
  )[0]?.n

  const clean = membersBefore === membersAfter && outboxBefore === outboxAfter

  console.log(
    `${clean ? '✓' : '✗'} cero residuo (members ${membersBefore}→${membersAfter}, outbox ${outboxBefore}→${outboxAfter})`
  )
  if (!clean) failures += 1

  const orphanSets = (
    await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_keyword_sets WHERE name = $1`,
      [SANITY_SET_NAME]
    )
  )[0]?.n

  console.log(`${orphanSets === '0' ? '✓' : '✗'} sin sets sintéticos huérfanos (${orphanSets})`)
  if (orphanSets !== '0') failures += 1

  if (failures > 0) {
    console.error(`\nFAIL — ${failures} verificación(es) fallaron.`)
    process.exit(1)
  }

  console.log('\nOK — el command se comporta contra PG real, sin tocar el set productivo.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
