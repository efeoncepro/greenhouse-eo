/** TASK-1863. Disposable local database only; no cloud credentials or shared schema changes. */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

if (process.env.TASK_1863_LOCAL_PG !== 'true')
  throw new Error('Set TASK_1863_LOCAL_PG=true for the explicit local test')
const psql = join(process.env.TASK_1863_PG_BIN ?? '/opt/homebrew/opt/postgresql@18/bin', 'psql')
const common = ['-h', '127.0.0.1', '-p', '55463', '-U', process.env.USER, '-X', '-v', 'ON_ERROR_STOP=1']

const run = (sql, database = 'postgres') =>
  execFileSync(psql, [...common, '-d', database, '-At'], { input: sql, encoding: 'utf8' })

if (run("SELECT current_setting('data_directory')").trim() !== '/tmp/task-1863-pg')
  throw new Error('Refusing non-ephemeral PostgreSQL')
run(
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='greenhouse_runtime') THEN CREATE ROLE greenhouse_runtime; END IF; END $$"
)
const database = `task1863_schema_${process.pid}`

const schemas = ['migrations/20260928094832901_task-1863-market-rollout.sql'].map(path => readFileSync(path, 'utf8').split('-- Down Migration'))

run(`CREATE DATABASE ${database}`)

try {
  run(
    readFileSync('scripts/growth/__tests__/fixtures/market-schema-baseline.sql', 'utf8').replace(
      'CREATE ROLE greenhouse_runtime;',
      ''
    ),
    database
  )
  for (const [up] of schemas) run('BEGIN;' + up + 'COMMIT;', database)
  run(readFileSync('scripts/growth/__tests__/fixtures/market-schema-assertions.sql', 'utf8'), database)
  for (const [, down] of [...schemas].reverse()) run('BEGIN;' + down + 'COMMIT;', database)
  for (const [up] of schemas) run('BEGIN;' + up + 'COMMIT;', database)
  console.log(
    JSON.stringify({
      result: 'passed',
      migrationRoundtrip: 'up-down-up',
      invariants: 'market identity, competitor immutability, snapshot immutability, primary handover',
      database: 'disposable-local'
    })
  )
} finally {
  run(`DROP DATABASE ${database}`)
}
