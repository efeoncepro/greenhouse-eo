#!/usr/bin/env node
// Local PostgreSQL lane of the V3 quoter (TASK-2025, EPIC-053).
//
// There is ONE Cloud SQL instance for development, staging and production, so nothing about the quoter schema is
// tried there first. This script owns a throwaway cluster under `.captures/task-2025/` (gitignored) and gives the
// quoter tests a database that looks like the real one where it matters:
//
//   - PostgreSQL 16, the major version of the shared instance;
//   - `greenhouse_ops` owns the objects and is NOT a superuser; the tests connect as `greenhouse_runtime`, so the
//     GRANTs of the migrations are exercised, not bypassed;
//   - the quoter migrations themselves are applied (their `Up` half), then taken down, checked to leave nothing
//     behind, and applied again.
//
// Until the operator approves applying them, the migrations live in `docs/tasks/pending-migrations/` and not in
// `migrations/`: `pnpm migrate:up` applies everything pending, to the shared instance. This script reads them from
// either place.
//
// Usage:
//   pnpm quoter:test:local [vitest args]   start the cluster, rebuild the template database, run the quoter tests
//   node scripts/commercial/quoter-local-pg.mjs start | stop | status | prepare
//
// A quoter test that needs a database is skipped when it is not run through here. Skipped is not green.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const home = join(root, '.captures/task-2025')
const dataDir = join(home, 'pg16-data')
const socketDir = join(home, 'pg-socket')
const logFile = join(home, 'pg16.log')
const port = '55462'
const bin = process.env.QUOTER_LOCAL_PG_BIN ?? '/opt/homebrew/opt/postgresql@16/bin'
const template = 'quoter_template'

// The migrations of this task, in the order they are applied. A slug with no file yet is reported and skipped.
const MIGRATION_SLUGS = ['quoter-source-documents-and-pointer', 'quoter-quote-aggregate', 'quoter-capabilities']

// `pg_ctl start` fails from a bare shell with "postmaster became multithreaded during startup" without a locale.
const env = { ...process.env, LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8' }

const fail = message => {
  console.error(`quoter-local-pg: ${message}`)
  process.exit(1)
}

const run = (program, args, options = {}) => {
  const result = spawnSync(join(bin, program), args, { encoding: 'utf8', env, ...options })

  if (result.error) fail(`${program} could not run (${result.error.code}). Is PostgreSQL 16 at ${bin}? Set QUOTER_LOCAL_PG_BIN.`)

  return result
}

const psql = (user, database, sql, { allowFailure = false } = {}) => {
  const result = run(
    'psql',
    ['-h', socketDir, '-p', port, '-U', user, '-d', database, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-1', '-f', '-'],
    { input: sql }
  )

  if (result.status !== 0 && !allowFailure) fail(`psql (${user}@${database}) failed:\n${result.stderr.trim()}`)

  return result
}

const scalar = (user, database, sql) => psql(user, database, sql).stdout.trim()

const running = () => run('pg_isready', ['-h', socketDir, '-p', port, '-q']).status === 0

const start = () => {
  if (!existsSync(join(bin, 'postgres'))) fail(`no PostgreSQL 16 server at ${bin}. Install postgresql@16 or set QUOTER_LOCAL_PG_BIN.`)

  // A Unix socket path cannot exceed 103 bytes; a checkout nested very deep would hit it.
  if (Buffer.byteLength(join(socketDir, `.s.PGSQL.${port}`)) > 103) fail(`socket path too long for PostgreSQL: ${socketDir}`)

  mkdirSync(socketDir, { recursive: true })

  if (!existsSync(dataDir)) {
    const init = run('initdb', ['-D', dataDir, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=en_US.UTF-8'])

    if (init.status !== 0) fail(`initdb failed:\n${init.stderr.trim()}`)
  }

  if (!running()) {
    const started = run('pg_ctl', ['-D', dataDir, '-l', logFile, '-w', '-o', `-k ${socketDir} -p ${port} -h ''`, 'start'])

    if (started.status !== 0) fail(`pg_ctl start failed; see ${logFile}`)
  }

  // Never mistake another server for this one: everything below drops and creates databases.
  const actual = scalar('postgres', 'postgres', 'SHOW data_directory')

  if (resolve(actual) !== resolve(dataDir)) fail(`refusing a server whose data directory is ${actual}`)

  const version = scalar('postgres', 'postgres', 'SHOW server_version_num')

  if (!version.startsWith('16')) fail(`expected PostgreSQL 16, the version of the shared instance; found ${version}`)
}

const stop = () => {
  if (existsSync(dataDir) && running()) run('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop'])
}

const findMigration = slug => {
  const applied = readdirSync(join(root, 'migrations')).find(name => name.endsWith(`_task-2025-${slug}.sql`))

  if (applied) return join(root, 'migrations', applied)

  const pending = join(root, 'docs/tasks/pending-migrations', `TASK-2025-${slug}.sql.pending`)

  return existsSync(pending) ? pending : null
}

const halves = path => {
  const [up, down] = readFileSync(path, 'utf8').split('-- Down Migration')

  if (!up.includes('-- Up Migration') || down === undefined) fail(`${path} lacks the Up/Down markers`)

  return { up, down }
}

const leftovers = () =>
  scalar(
    'postgres',
    template,
    `SELECT string_agg(found, ', ' ORDER BY found) FROM (
       SELECT 'relation ' || c.relname AS found FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'greenhouse_commercial' AND c.relname LIKE 'quoter%'
       UNION ALL
       SELECT 'function ' || p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'greenhouse_commercial' AND p.proname LIKE '%quoter%'
     ) objects`
  )

const prepare = () => {
  start()

  // Databases a previous run left behind, and the template itself: every run starts from the migrations.
  const stale = scalar('postgres', 'postgres', `SELECT string_agg(datname, ' ') FROM pg_database WHERE datname LIKE 'quoter_%'`)

  // DROP and CREATE DATABASE cannot run inside a transaction block, so they go through their own programs.
  for (const name of stale.split(' ').filter(Boolean)) {
    const dropped = run('dropdb', ['-h', socketDir, '-p', port, '-U', 'postgres', '--force', name])

    if (dropped.status !== 0) fail(`dropdb ${name} failed:\n${dropped.stderr.trim()}`)
  }

  psql(
    'postgres',
    'postgres',
    `DO $$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_ops') THEN CREATE ROLE greenhouse_ops LOGIN; END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_runtime') THEN CREATE ROLE greenhouse_runtime LOGIN; END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_app') THEN CREATE ROLE greenhouse_app; END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_migrator') THEN CREATE ROLE greenhouse_migrator LOGIN; END IF;
       ALTER ROLE greenhouse_migrator LOGIN;
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_migrator_user') THEN CREATE ROLE greenhouse_migrator_user; END IF;
     END $$;`
  )

  const created = run('createdb', ['-h', socketDir, '-p', port, '-U', 'postgres', '-O', 'greenhouse_ops', '-E', 'UTF8', template])

  if (created.status !== 0) fail(`createdb ${template} failed:\n${created.stderr.trim()}`)

  psql('postgres', template, readFileSync(join(root, 'scripts/commercial/quoter-local-pg-baseline.sql'), 'utf8'))

  const migrations = MIGRATION_SLUGS.map(slug => ({ slug, path: findMigration(slug) }))

  for (const { slug, path } of migrations) if (!path) console.log(`quoter-local-pg: no migration yet for "${slug}"; skipped`)

  const present = migrations.filter(migration => migration.path).map(migration => ({ ...migration, ...halves(migration.path) }))

  // Up, down, up: a Down that leaves an object behind, or an Up that cannot run twice over it, is found here.
  for (const migration of present) psql('greenhouse_ops', template, migration.up)
  for (const migration of [...present].reverse()) psql('greenhouse_ops', template, migration.down)

  const left = leftovers()

  if (left) fail(`the Down migrations left objects behind: ${left}`)

  for (const migration of present) psql('greenhouse_ops', template, migration.up)

  console.log(
    `quoter-local-pg: template "${template}" ready on PostgreSQL ${scalar('postgres', 'postgres', 'SHOW server_version')} ` +
      `(${present.length} of ${MIGRATION_SLUGS.length} migrations, up → down → up)`
  )
}

const test = args => {
  prepare()

  const result = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', ...(args.length ? args : ['src/lib/commercial/quoter'])], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      QUOTER_LOCAL_PG_SOCKET: socketDir,
      QUOTER_LOCAL_PG_PORT: port,
      QUOTER_LOCAL_PG_TEMPLATE: template
    }
  })

  process.exit(result.status ?? 1)
}

const [command = 'test', ...args] = process.argv.slice(2)

if (command === 'start') start()
else if (command === 'stop') stop()
else if (command === 'status') console.log(existsSync(dataDir) && running() ? `running: ${socketDir} port ${port}` : 'stopped')
else if (command === 'prepare') prepare()
else if (command === 'test') test(args)
else fail(`unknown command "${command}". Use start | stop | status | prepare | test [vitest args].`)
