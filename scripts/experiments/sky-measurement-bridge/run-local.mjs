#!/usr/bin/env node
// TASK-2094: isolated PG16 cluster; never accepts a URL, host or inherited credentials.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const bin = '/opt/homebrew/opt/postgresql@16/bin'

if (process.argv.length > 2) throw new Error('This runner only executes its fixed local suite; arguments are not accepted')
const scratch = mkdtempSync('/tmp/sky-2094-')
const data = join(scratch, 'data')
const socket = join(scratch, 'socket')

mkdirSync(socket)
mkdirSync(join(scratch, 'empty-env'))
const port = '55494'
const env = { PATH: process.env.PATH, TMPDIR: scratch, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', NODE_ENV: 'test' }

const run = (program, args, input) => {
  const result = spawnSync(program, args, { cwd: root, env, encoding: 'utf8', input, timeout: 60_000 })

  if (result.error || result.status !== 0) throw new Error(`${program}: ${result.error?.message ?? result.stderr}`)

return result.stdout.trim()
}

const pg = (name, args, input) => run(join(bin, name), args, input)
const psql = (database, sql) => pg('psql', ['-X', '-h', socket, '-p', port, '-U', 'postgres', '-d', database, '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], sql)
let started = false
let exitCode = 1

try {
  pg('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--locale=en_US.UTF-8', '-E', 'UTF8'])
  pg('pg_ctl', ['-D', data, '-l', join(scratch, 'postgres.log'), '-w', '-o', `-k ${socket} -p ${port} -h ''`, 'start'])
  started = true

  if (psql('postgres', 'SHOW data_directory') !== data || !psql('postgres', 'SHOW server_version_num').startsWith('16')) {
    throw new Error('Refusing non-owned PostgreSQL cluster')
  }

  psql('postgres', 'CREATE ROLE sky_test_app LOGIN NOSUPERUSER; CREATE DATABASE sky_bridge_test;')
  psql('sky_bridge_test', readFileSync(join(here, 'baseline.sql'), 'utf8'))
  const source = readFileSync(join(root, 'scripts/setup-postgres-identity-v2.sql'), 'utf8')
  const view = source.match(/CREATE OR REPLACE VIEW greenhouse_serving\.session_360 AS[\s\S]*?;/)?.[0]

  if (!view) throw new Error('Current session_360 definition not found; refusing substitute view')
  psql('sky_bridge_test', view)
  const insights = readFileSync(join(root, 'migrations/20260915100154428_task-1845-insights-foundation.sql'), 'utf8')
  const snapshotTable = insights.match(/CREATE TABLE IF NOT EXISTS greenhouse_insights\.insight_evidence_snapshots \([\s\S]*?\n\);/)?.[0]
  const noDelete = insights.match(/CREATE OR REPLACE FUNCTION greenhouse_insights\.assert_insights_no_delete\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/)?.[0]
  const triggerStart = insights.indexOf('CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_snapshot_immutable_when_sealed()')
  const triggerEnd = insights.indexOf('\n-- ─', triggerStart)

  if (!snapshotTable || !noDelete || triggerStart < 0 || triggerEnd < triggerStart) throw new Error('Snapshot SQL anchors changed; no substitute triggers allowed')
  psql('sky_bridge_test', snapshotTable + '\n' + noDelete + '\n' + insights.slice(triggerStart, triggerEnd))
  const appMigration = readFileSync(join(root, 'migrations/20260426021650967_task-617-api-platform-app-foundation.sql'), 'utf8')
  const appTable = appMigration.match(/CREATE TABLE IF NOT EXISTS greenhouse_core\.first_party_app_sessions \([\s\S]*?\n\);/)?.[0]

  if (!appTable) throw new Error('Real app session table not found; refusing substitute')
  psql('sky_bridge_test', appTable)
  psql('sky_bridge_test', readFileSync(join(here, 'permissions-baseline.sql'), 'utf8'))
  psql('sky_bridge_test', `GRANT USAGE ON SCHEMA greenhouse_core, greenhouse_finance, greenhouse_serving, greenhouse_insights, greenhouse_client_portal, sky_experiment TO sky_test_app;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA greenhouse_core, greenhouse_finance, greenhouse_insights, greenhouse_client_portal, sky_experiment TO sky_test_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA greenhouse_serving TO sky_test_app;`)

  const testEnv = { ...env,
    SKY_BRIDGE_LOCAL_SOCKET: socket, SKY_BRIDGE_LOCAL_DATA: data, SKY_BRIDGE_EMPTY_ENV: join(scratch, 'empty-env'),
    GREENHOUSE_POSTGRES_HOST: socket, GREENHOUSE_POSTGRES_PORT: port, GREENHOUSE_POSTGRES_DATABASE: 'sky_bridge_test',
    GREENHOUSE_POSTGRES_USER: 'sky_test_app', GREENHOUSE_POSTGRES_PASSWORD: 'synthetic-local-only',
    GREENHOUSE_POSTGRES_SSL: 'false', GREENHOUSE_POSTGRES_MAX_CONNECTIONS: '2' }

  const profile = '(version 1) (allow default) (deny network*) (allow network-outbound (remote unix-socket)) (allow network-inbound (local unix-socket)) (deny file-read* (regex #"/\\.env($|\\.)") (regex #"/\\.auth(/|$)") (regex #"/\\.config/gcloud(/|$)") (regex #"/Library/Keychains(/|$)"))'

  console.log('TASK-2094: PG16 private UNIX socket verified; app role non-superuser; IP networking denied; sanitized environment.')

  const result = spawnSync('/usr/bin/sandbox-exec', ['-p', profile, process.execPath,
    join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', join(here, 'vitest.config.ts')],
  { cwd: root, env: testEnv, stdio: 'inherit', timeout: 180_000 })

  if (result.error) console.error(result.error.message)
  exitCode = result.status ?? 1
} catch (error) {
  console.error(error.message)
} finally {
  if (started) {
    try { pg('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']) }
    catch (error) { console.error(`Cleanup failed: ${error.message}`); process.exitCode = 1; throw error }
  }

  rmSync(scratch, { recursive: true, force: true })
  console.log('TASK-2094: owned cluster stopped and ephemeral directory removed.')
}

process.exitCode = exitCode
