/**
 * TASK-1659 — Sanity live de la intención declarada, contra PG real.
 *
 * Gate TASK-893: los mocks ejercitan el TS, no el SQL. Y acá el SQL es exactamente la clase
 * que un mock da por buena y PostgreSQL rechaza:
 *
 * - cerrar y reabrir una membresía DENTRO de la misma transacción contra el índice único
 *   parcial `(keyword_set_id, keyword) WHERE effective_to IS NULL`;
 * - `clock_timestamp()` y NO `NOW()` en el cierre — `NOW()` devuelve el timestamp de INICIO
 *   de transacción y produciría `effective_to = effective_from`, que revienta el CHECK
 *   `effective_to > effective_from` (23514). Ése es el bug que TASK-1308 encontró acá mismo;
 * - los dos CHECK nuevos (vocabulario cerrado + autoría acoplada a la declaración).
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1659-keyword-intent.ts
 *
 * ⚠️ POR QUÉ NO LLAMA A `trackKeywords` DIRECTO: `seo_keyword_set_members` tiene trigger
 * anti-DELETE (TASK-1299), así que las filas de prueba NO se pueden borrar; la única salida
 * limpia es una transacción que aborta, y tiene que correr sobre una CONEXIÓN FIJADA porque
 * `runGreenhousePostgresQuery` toma una del pool por llamada. Por eso se ejercita
 * `applyKeywordTracking` —el núcleo transaccional que el command EXPORTA—, no una copia de
 * sus queries: una copia puede quedar verde probando una versión vieja del SQL.
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

  const checks: Array<[string, boolean]> = []

  // ── Bloque A — el schema quedó como la migración prometió ──────────────────────────────
  //
  // Se verifica contra `information_schema`/`pg_constraint`, NO contra `src/types/db.d.ts`:
  // el codegen de Kysely refleja lo que introspectó la última vez, así que confirmaría una
  // migración que nunca se aplicó.

  const columns = await runGreenhousePostgresQuery<{ column_name: string; is_nullable: string }>(
    `SELECT column_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'greenhouse_growth'
        AND table_name = 'seo_keyword_set_members'
        AND column_name IN ('intent', 'intent_declared_by', 'intent_declared_at')`
  )

  checks.push(['las 3 columnas de intención existen', columns.length === 3])
  checks.push([
    'las 3 nacen nullable (la intención se declara hacia adelante)',
    columns.every(column => column.is_nullable === 'YES')
  ])

  const constraints = await runGreenhousePostgresQuery<{ conname: string; def: string }>(
    `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
      WHERE conrelid = 'greenhouse_growth.seo_keyword_set_members'::regclass
        AND conname LIKE '%intent%'`
  )

  checks.push([
    'CHECK de vocabulario cerrado presente',
    constraints.some(row => row.conname === 'seo_keyword_set_members_intent_check')
  ])
  checks.push([
    'CHECK de autoría acoplada presente',
    constraints.some(row => row.conname === 'seo_keyword_set_members_intent_authorship_check')
  ])

  // El backfill que NO se hizo es un resultado verificable, no una omisión: una fila vieja
  // marcada `opportunity` afirmaría que alguien la clasificó. Si este check se pone rojo,
  // alguien backfilleó y el KPI de oportunidades quedó inflado con filas que nadie declaró.
  const legacy = await runGreenhousePostgresQuery<{ con_intent: string }>(
    `SELECT COUNT(intent)::text AS con_intent
       FROM greenhouse_growth.seo_keyword_set_members
      WHERE created_at < (SELECT run_on FROM public.pgmigrations
                           WHERE name = '20260814221022082_task-1659-keyword-target-intent')`
  )

  checks.push(['filas previas a la migración siguen en NULL (sin backfill)', legacy[0]?.con_intent === '0'])

  // ── Bloque B — el command contra PG real, en una transacción que ABORTA ─────────────────
  //
  // La tabla tiene trigger anti-DELETE: las filas de prueba no se pueden borrar, así que la
  // única salida limpia es el rollback. Y tiene que correr sobre una conexión FIJADA, porque
  // `runGreenhousePostgresQuery` toma una del pool por llamada — un BEGIN suelto no cubriría
  // lo que sigue y las escrituras quedarían permanentes pese al ROLLBACK (hallazgo TASK-1300).
  const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
  const { applyKeywordTracking } = await import('@/lib/growth/seo/track-keywords')

  const target = (
    await runGreenhousePostgresQuery<{ seo_target_id: string; organization_id: string }>(
      `SELECT seo_target_id, organization_id FROM greenhouse_growth.seo_targets ORDER BY created_at LIMIT 1`
    )
  )[0]

  if (!target) {
    console.error('No hay seo_targets: no se puede ejercitar el SQL del command.')
    process.exit(1)
  }

  const SANITY_SET_NAME = 'Sanity TASK-1659 (rollback)'
  const KEYWORD = `sanity-1659-${Date.now()}`

  try {
    await withGreenhousePostgresTransaction(async client => {
      const base = {
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        setName: SANITY_SET_NAME,
        capacity: 10_000,
        actor: 'sanity-1659',
        source: 'seed' as const
      }

      // 1) Alta declarando `opportunity`.
      const first = await applyKeywordTracking(client, {
        ...base,
        intent: 'opportunity',
        requested: [{ keyword: KEYWORD, valid: true }]
      })

      checks.push(['alta con intención → outcome `tracked`', first.outcomes[0]?.status === 'tracked'])

      // 2) Cambio a `target`: cierra la anterior y abre otra, contra el índice único parcial
      //    y el CHECK `effective_to > effective_from`. Acá es donde `NOW()` reventaría (23514).
      const second = await applyKeywordTracking(client, {
        ...base,
        intent: 'target',
        requested: [{ keyword: KEYWORD, valid: true }]
      })

      checks.push(['cambio de intención → outcome `intent_changed`', second.outcomes[0]?.status === 'intent_changed'])
      checks.push(['reporta la intención anterior', second.outcomes[0]?.previousIntent === 'opportunity'])
      checks.push(['el cambio de intención no infla el conteo vigente', second.activeKeywordCount === first.activeKeywordCount])

      const history = await client.query<{ intent: string | null; effective_to: string | null }>(
        `SELECT m.intent, m.effective_to::text AS effective_to
           FROM greenhouse_growth.seo_keyword_set_members m
           JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
          WHERE s.seo_target_id = $1 AND m.keyword = $2
          ORDER BY m.effective_from`,
        [target.seo_target_id, KEYWORD]
      )

      // El invariante que sostiene todo el reporte de avance: DOS filas, no una sobrescrita.
      checks.push(['el historial conserva DOS filas (no un UPDATE)', history.rows.length === 2])
      checks.push([
        'la primera quedó cerrada con `opportunity`',
        history.rows[0]?.intent === 'opportunity' && history.rows[0]?.effective_to !== null
      ])
      checks.push([
        'la vigente es `target` y está abierta',
        history.rows[1]?.intent === 'target' && history.rows[1]?.effective_to === null
      ])

      const activeCount = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_growth.seo_keyword_set_members m
           JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
          WHERE s.seo_target_id = $1 AND m.keyword = $2 AND m.effective_to IS NULL`,
        [target.seo_target_id, KEYWORD]
      )

      checks.push(['el índice único parcial deja UNA sola vigente', activeCount.rows[0]?.n === '1'])

      // 3) Re-declarar lo mismo es no-op: no debe aparecer una tercera fila.
      const third = await applyKeywordTracking(client, {
        ...base,
        intent: 'target',
        requested: [{ keyword: KEYWORD, valid: true }]
      })

      checks.push(['re-declarar la misma intención → `already_tracked`', third.outcomes[0]?.status === 'already_tracked'])

      const afterNoop = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_growth.seo_keyword_set_members m
           JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
          WHERE s.seo_target_id = $1 AND m.keyword = $2`,
        [target.seo_target_id, KEYWORD]
      )

      checks.push(['el no-op no agrega una tercera fila', afterNoop.rows[0]?.n === '2'])

      // Salida limpia: la tabla es append-only, así que el rollback es la ÚNICA forma de no
      // dejar basura. El throw es intencional.
      throw new Error('sanity-rollback')
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'sanity-rollback') throw error
  }

  const leftovers = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_keyword_set_members WHERE keyword = $1`,
    [KEYWORD]
  )

  checks.push(['el rollback no dejó filas de prueba', leftovers[0]?.n === '0'])

  const failed = checks.filter(([, ok]) => !ok)

  for (const [label, ok] of checks) console.log(`${ok ? '✅' : '❌'} ${label}`)
  console.log(`\n${checks.length - failed.length}/${checks.length} checks verdes`)

  process.exit(failed.length === 0 ? 0 : 1)
}

void main()
