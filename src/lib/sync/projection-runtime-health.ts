import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ProjectionDefinition, TablePrivilege } from './projection-registry'

export interface ProjectionTablePrivilegeStatus {
  tableName: string
  requiredPrivileges: TablePrivilege[]
  missingPrivileges: TablePrivilege[]
  healthy: boolean
  reason: string | null
}

export interface ProjectionRuntimeHealth {
  projectionName: string
  status: 'not_declared' | 'ready' | 'degraded'
  currentUser: string | null
  checks: ProjectionTablePrivilegeStatus[]
}

interface TablePrivilegeRow extends Record<string, unknown> {
  current_user_name: string
  table_name: string
  required_privileges: string[] | null
  missing_privileges: string[] | null
}

const uniquePrivileges = (privileges: TablePrivilege[]): TablePrivilege[] =>
  [...new Set(privileges)]

const normalizePrivileges = (privileges: string[] | null | undefined): TablePrivilege[] =>
  (privileges ?? [])
    .map(privilege => privilege.toUpperCase())
    .filter((privilege): privilege is TablePrivilege =>
      ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'].includes(privilege)
    )

export const readProjectionRuntimeHealth = async (
  projection: ProjectionDefinition
): Promise<ProjectionRuntimeHealth> => {
  const requirements = projection.requiredTablePrivileges ?? []

  if (requirements.length === 0) {
    return {
      projectionName: projection.name,
      status: 'not_declared',
      currentUser: null,
      checks: []
    }
  }

  const valuesSql = requirements
    .map((_, index) => {
      const tableNameParam = index * 3 + 1
      const privilegesParam = index * 3 + 2
      const reasonParam = index * 3 + 3

      return `($${tableNameParam}::text, $${privilegesParam}::text[], $${reasonParam}::text)`
    })
    .join(', ')

  const params = requirements.flatMap(requirement => [
    requirement.tableName,
    uniquePrivileges(requirement.privileges),
    requirement.reason ?? null
  ])

  const rows = await runGreenhousePostgresQuery<TablePrivilegeRow>(
    `WITH required(table_name, required_privileges, reason) AS (
       VALUES ${valuesSql}
     )
     SELECT
       CURRENT_USER::text AS current_user_name,
       table_name,
       required_privileges,
       ARRAY(
         SELECT privilege
         FROM unnest(required.required_privileges) AS privilege
         WHERE NOT has_table_privilege(CURRENT_USER, required.table_name, privilege)
       )::text[] AS missing_privileges
     FROM required`,
    params
  )

  const checks = rows.map(row => {
    const requiredPrivileges = normalizePrivileges(row.required_privileges)
    const missingPrivileges = normalizePrivileges(row.missing_privileges)

    const declaredRequirement =
      requirements.find(requirement => requirement.tableName === row.table_name) ?? null

    return {
      tableName: row.table_name,
      requiredPrivileges,
      missingPrivileges,
      healthy: missingPrivileges.length === 0,
      reason: declaredRequirement?.reason ?? null
    }
  })

  return {
    projectionName: projection.name,
    status: checks.every(check => check.healthy) ? 'ready' : 'degraded',
    currentUser: rows[0]?.current_user_name ? String(rows[0].current_user_name) : null,
    checks
  }
}

export const readProjectionRuntimeHealthMap = async (
  projections: readonly ProjectionDefinition[]
): Promise<Map<string, ProjectionRuntimeHealth>> => {
  const entries = await Promise.all(
    projections.map(async projection => [projection.name, await readProjectionRuntimeHealth(projection)] as const)
  )

  return new Map(entries)
}
