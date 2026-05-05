/**
 * Quick schema check for TASK-784 (run from repo root):
 *   node scripts/identity/_verify-task-784-schema.mjs
 *
 * Requires Cloud SQL Proxy on 127.0.0.1:15432 (run `pnpm pg:connect` first).
 */
import fs from 'node:fs'
import path from 'node:path'

import pg from 'pg'

const envPath = path.resolve(process.cwd(), '.env.local')

const env = fs
  .readFileSync(envPath, 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)

    if (m) acc[m[1]] = m[2].replace(/^["']|["']$/g, '')
    
return acc
  }, {})

const password =
  env.GREENHOUSE_POSTGRES_OPS_PASSWORD ||
  env.GREENHOUSE_POSTGRES_ADMIN_PASSWORD ||
  process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

if (!password) {
  console.error('No ops/admin password found in .env.local')
  process.exit(1)
}

const client = new pg.Client({
  host: '127.0.0.1',
  port: 15432,
  database: 'greenhouse_app',
  user: 'greenhouse_ops',
  password
})

await client.connect()

try {
  const tables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'greenhouse_core'
      AND tablename IN ('person_identity_documents', 'person_addresses',
                        'person_identity_document_audit_log', 'person_address_audit_log')
    ORDER BY tablename
  `)

  console.log('--- tables ---')
  console.log(tables.rows.map(r => r.tablename).join('\n') || '(none)')

  const grants = await client.query(`
    SELECT grantee, table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'greenhouse_core'
      AND table_name IN ('person_identity_documents', 'person_addresses',
                         'person_identity_document_audit_log', 'person_address_audit_log')
    ORDER BY table_name, grantee, privilege_type
  `)

  console.log('\n--- grants ---')
  console.log(
    grants.rows.map(r => `${r.table_name} | ${r.grantee} | ${r.privilege_type}`).join('\n')
  )

  const triggers = await client.query(`
    SELECT trigger_name, event_object_table, event_manipulation
    FROM information_schema.triggers
    WHERE trigger_schema = 'greenhouse_core'
      AND event_object_table IN ('person_identity_documents', 'person_addresses',
                                  'person_identity_document_audit_log', 'person_address_audit_log')
    ORDER BY event_object_table, trigger_name
  `)

  console.log('\n--- triggers ---')
  console.log(
    triggers.rows
      .map(r => `${r.event_object_table} | ${r.trigger_name} (${r.event_manipulation})`)
      .join('\n')
  )

  const indexes = await client.query(`
    SELECT tablename, indexname FROM pg_indexes
    WHERE schemaname = 'greenhouse_core'
      AND tablename IN ('person_identity_documents', 'person_addresses')
    ORDER BY tablename, indexname
  `)

  console.log('\n--- indexes ---')
  console.log(indexes.rows.map(r => `${r.tablename} | ${r.indexname}`).join('\n'))
} finally {
  await client.end()
}
