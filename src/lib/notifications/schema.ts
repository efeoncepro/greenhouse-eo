import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

let ensurePromise: Promise<void> | null = null

const REQUIRED_TABLES = [
  'notifications',
  'notification_preferences',
  'notification_log'
] as const

const REQUIRED_COLUMNS = [
  { table: 'notifications', column: 'metadata' },
  { table: 'notification_log', column: 'metadata' }
] as const

const NOTIFICATIONS_SETUP_HINT =
  'greenhouse_notifications baseline is missing. Run scripts/setup-postgres-notifications.sql before enabling notifications runtime.'

type ExistingTableRow = Record<string, unknown> & {
  table_name: string
}

type ExistingColumnRow = Record<string, unknown> & {
  table_name: string
  column_name: string
}

export const ensureNotificationSchema = async (): Promise<void> => {
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    const tables = await runGreenhousePostgresQuery<ExistingTableRow>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'greenhouse_notifications'
         AND table_name = ANY($1::text[])`,
      [[...REQUIRED_TABLES]]
    )

    const existingTables = new Set(tables.map(row => row.table_name))
    const missingTables = REQUIRED_TABLES.filter(table => !existingTables.has(table))

    if (missingTables.length > 0) {
      throw new Error(`${NOTIFICATIONS_SETUP_HINT} Missing tables: ${missingTables.join(', ')}`)
    }

    const columns = await runGreenhousePostgresQuery<ExistingColumnRow>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'greenhouse_notifications'
         AND (
           (table_name = 'notifications' AND column_name = 'metadata')
           OR
           (table_name = 'notification_log' AND column_name = 'metadata')
         )`
    )

    const existingColumns = new Set(columns.map(row => `${row.table_name}.${row.column_name}`))

    const missingColumns = REQUIRED_COLUMNS
      .map(({ table, column }) => `${table}.${column}`)
      .filter(key => !existingColumns.has(key))

    if (missingColumns.length > 0) {
      throw new Error(`${NOTIFICATIONS_SETUP_HINT} Missing columns: ${missingColumns.join(', ')}`)
    }
  })().catch(err => {
    ensurePromise = null
    throw err
  })

  return ensurePromise
}
