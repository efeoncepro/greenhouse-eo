import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-838 Fase 3 / ISSUE-068 — Runtime guard de tablas críticas.
 *
 * Lista declarativa de tablas que el runtime de Greenhouse asume existen.
 * El reader que la consume verifica via `information_schema.tables` que cada
 * fila esté presente. Detecta:
 *
 *   - Migrations rotas que se "aplicaron" sin crear sus tablas (bug class
 *     ISSUE-068 / TASK-768 Slice 1, ahora cubierto por CI gate Fase 2 a
 *     nivel PR; este guard es la red de seguridad runtime).
 *   - Rollbacks parciales o restores desde backup viejo en producción.
 *   - DROPs manuales accidentales.
 *
 * Steady state esperado: 0 tablas missing.
 *
 * Pattern: lista declarativa que crece cuando emerja una nueva tabla crítica.
 * Al agregar entry: incluir `schema.table` + comentario corto del ¿por qué crítica?.
 */

export type CriticalTableEntry = {
  schema: string
  table: string
  rationale: string
}

/**
 * Tablas que el runtime asume existen en cada request. Si falta cualquiera,
 * features dependientes degradan; el signal emite error.
 */
export const CRITICAL_TABLES: readonly CriticalTableEntry[] = [
  // Identity & access (TASK-742, TASK-784, TASK-785, TASK-611, TASK-838).
  { schema: 'greenhouse_core', table: 'client_users',                         rationale: 'auth subjects' },
  { schema: 'greenhouse_core', table: 'user_role_assignments',                rationale: 'role grants' },
  { schema: 'greenhouse_core', table: 'roles',                                rationale: 'role catalog' },
  { schema: 'greenhouse_core', table: 'identity_profiles',                    rationale: 'canonical persona identity' },
  { schema: 'greenhouse_core', table: 'organizations',                        rationale: 'canonical 360 organization' },
  { schema: 'greenhouse_core', table: 'spaces',                               rationale: 'client↔org bridge canónico' },
  { schema: 'greenhouse_core', table: 'clients',                              rationale: 'legacy client scope canónico' },
  { schema: 'greenhouse_core', table: 'client_team_assignments',              rationale: 'member↔client assignments' },
  { schema: 'greenhouse_core', table: 'capabilities_registry',                rationale: 'TASK-611 capabilities catalog reflection' },
  { schema: 'greenhouse_core', table: 'role_entitlement_defaults',            rationale: 'TASK-404/838 governance overlay' },
  { schema: 'greenhouse_core', table: 'user_entitlement_overrides',           rationale: 'TASK-404/838 governance overlay' },
  { schema: 'greenhouse_core', table: 'entitlement_governance_audit_log',     rationale: 'TASK-404/838 governance audit append-only' },
  { schema: 'greenhouse_core', table: 'person_identity_documents',            rationale: 'TASK-784 person legal profile' },
  { schema: 'greenhouse_core', table: 'person_addresses',                     rationale: 'TASK-784 person legal profile' },
  // Sync & outbox infrastructure (TASK-773).
  { schema: 'greenhouse_sync', table: 'outbox_events',                        rationale: 'outbox publisher state' },
  { schema: 'greenhouse_sync', table: 'outbox_reactive_log',                  rationale: 'reactive consumer dedupe' }
]

export type CriticalTablesStatus = {
  missing: CriticalTableEntry[]
  total: number
  observedAt: string
}

/**
 * Verifies which critical tables exist in `information_schema.tables`.
 * Returns the missing list (empty when all present).
 *
 * Single PG roundtrip — selecciona presence per (schema, table) tuple.
 */
export const verifyCriticalTablesExist = async (): Promise<CriticalTablesStatus> => {
  const observedAt = new Date().toISOString()

  if (CRITICAL_TABLES.length === 0) {
    return { missing: [], total: 0, observedAt }
  }

  // Build a single query: VALUES (schema, table), (schema, table), ...
  // LEFT JOIN information_schema.tables; rows where table_name IS NULL = missing.
  const valuesPlaceholders: string[] = []
  const params: string[] = []

  CRITICAL_TABLES.forEach((entry, index) => {
    const schemaIdx = index * 2 + 1
    const tableIdx = index * 2 + 2

    valuesPlaceholders.push(`($${schemaIdx}::text, $${tableIdx}::text)`)
    params.push(entry.schema, entry.table)
  })

  const sql = `
    WITH expected (schema_name, table_name) AS (
      VALUES ${valuesPlaceholders.join(', ')}
    )
    SELECT e.schema_name, e.table_name
    FROM expected e
    LEFT JOIN information_schema.tables t
      ON t.table_schema = e.schema_name AND t.table_name = e.table_name
    WHERE t.table_name IS NULL
    ORDER BY e.schema_name, e.table_name
  `

  const rows = await query<{ schema_name: string; table_name: string }>(sql, params)

  const missing = rows
    .map(row => CRITICAL_TABLES.find(e => e.schema === row.schema_name && e.table === row.table_name))
    .filter((entry): entry is CriticalTableEntry => Boolean(entry))

  return {
    missing,
    total: CRITICAL_TABLES.length,
    observedAt
  }
}
