import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type TableRef = {
  schema: string
  table: string
}

export type TablePresenceMap = ReadonlyMap<string, boolean>

export const tablePresenceKey = (schema: string, table: string): string => `${schema}.${table}`

export const getTablePresence = async (tables: readonly TableRef[]): Promise<TablePresenceMap> => {
  const uniqueTables = Array.from(
    new Map(tables.map(entry => [tablePresenceKey(entry.schema, entry.table), entry])).values()
  )

  const fallback = new Map(uniqueTables.map(entry => [tablePresenceKey(entry.schema, entry.table), false]))

  if (uniqueTables.length === 0) {
    return fallback
  }

  const valuesPlaceholders: string[] = []
  const params: string[] = []

  uniqueTables.forEach((entry, index) => {
    const schemaIndex = index * 2 + 1
    const tableIndex = index * 2 + 2

    valuesPlaceholders.push(`($${schemaIndex}::text, $${tableIndex}::text)`)
    params.push(entry.schema, entry.table)
  })

  try {
    const rows = await runGreenhousePostgresQuery<
      Record<string, unknown> & { schema_name: string; table_name: string; exists: boolean }
    >(
      `WITH expected(schema_name, table_name) AS (
         VALUES ${valuesPlaceholders.join(', ')}
       )
       SELECT
         expected.schema_name,
         expected.table_name,
         (tables.table_name IS NOT NULL) AS exists
       FROM expected
       LEFT JOIN information_schema.tables tables
         ON tables.table_schema = expected.schema_name
        AND tables.table_name = expected.table_name`,
      params
    )

    const presence = new Map(fallback)

    for (const row of rows) {
      presence.set(tablePresenceKey(row.schema_name, row.table_name), row.exists === true)
    }

    return presence
  } catch {
    return fallback
  }
}

export const tableExistsIn = (presence: TablePresenceMap, schema: string, table: string): boolean =>
  presence.get(tablePresenceKey(schema, table)) === true

export const tableExists = async (schema: string, table: string): Promise<boolean> => {
  const presence = await getTablePresence([{ schema, table }])

  return tableExistsIn(presence, schema, table)
}
