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

  const failed = checks.filter(([, ok]) => !ok)

  for (const [label, ok] of checks) console.log(`${ok ? '✅' : '❌'} ${label}`)
  console.log(`\n${checks.length - failed.length}/${checks.length} checks verdes`)

  process.exit(failed.length === 0 ? 0 : 1)
}

void main()
