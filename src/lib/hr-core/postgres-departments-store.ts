import 'server-only'

import type { PoolClient } from 'pg'

import type { CreateDepartmentInput, HrDepartment, HrMemberOption, UpdateDepartmentInput } from '@/types/hr-core'

import { query, withTransaction } from '@/lib/db'
import { isGreenhousePostgresConfigured } from '@/lib/postgres/client'
import { HrCoreValidationError, normalizeNullableString, normalizeString, slugify, toInt } from '@/lib/hr-core/shared'

type PostgresDepartmentRow = {
  department_id: string
  name: string
  description: string | null
  parent_department_id: string | null
  head_member_id: string | null
  head_member_name: string | null
  business_unit: string | null
  active: boolean
  sort_order: number | null
}

type MemberDepartmentContextRow = {
  member_id: string
  department_id: string | null
  department_name: string | null
}

type DepartmentHeadOptionRow = {
  member_id: string
  display_name: string | null
  role_title: string | null
}

const HR_DEPARTMENTS_POSTGRES_REQUIRED_TABLES = [
  'greenhouse_core.departments',
  'greenhouse_core.members'
] as const

const HR_DEPARTMENTS_READY_TTL_MS = 60_000

let hrDepartmentsReadyPromise: Promise<void> | null = null
let hrDepartmentsReadyAt = 0

const mapDepartment = (row: PostgresDepartmentRow): HrDepartment => ({
  departmentId: row.department_id,
  name: row.name,
  description: normalizeNullableString(row.description),
  parentDepartmentId: normalizeNullableString(row.parent_department_id),
  headMemberId: normalizeNullableString(row.head_member_id),
  headMemberName: normalizeNullableString(row.head_member_name),
  businessUnit: normalizeNullableString(row.business_unit) || '',
  active: Boolean(row.active),
  sortOrder: toInt(row.sort_order)
})

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: PoolClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return query<T>(text, values)
}

const assertHrDepartmentsPostgresReady = async () => {
  if (!isGreenhousePostgresConfigured()) {
    throw new HrCoreValidationError(
      'HR departments PostgreSQL runtime is not configured for this environment.',
      503,
      undefined,
      'HR_CORE_POSTGRES_NOT_CONFIGURED'
    )
  }

  if (Date.now() - hrDepartmentsReadyAt < HR_DEPARTMENTS_READY_TTL_MS) {
    return
  }

  if (hrDepartmentsReadyPromise) {
    return hrDepartmentsReadyPromise
  }

  hrDepartmentsReadyPromise = (async () => {
    const existingTables = await query<{ qualified_name: string }>(
      `
        SELECT schemaname || '.' || tablename AS qualified_name
        FROM pg_tables
        WHERE schemaname = 'greenhouse_core'
          AND tablename = ANY($1::text[])
      `,
      [['departments', 'members']]
    )

    const existingTableSet = new Set(existingTables.map(row => row.qualified_name))
    const missingTables = HR_DEPARTMENTS_POSTGRES_REQUIRED_TABLES.filter(tableName => !existingTableSet.has(tableName))

    if (missingTables.length > 0) {
      throw new HrCoreValidationError(
        'HR departments PostgreSQL schema is not ready in this environment.',
        503,
        { missingTables },
        'HR_CORE_POSTGRES_SCHEMA_NOT_READY'
      )
    }

    hrDepartmentsReadyAt = Date.now()
  })().catch(error => {
    hrDepartmentsReadyPromise = null
    throw error
  })

  return hrDepartmentsReadyPromise.finally(() => {
    hrDepartmentsReadyPromise = null
  })
}

const assertNonEmptyField = (value: string, fieldName: string) => {
  if (!value) {
    throw new HrCoreValidationError(`${fieldName} is required.`)
  }
}

const assertDepartmentExists = async (departmentId: string, client?: PoolClient) => {
  const [row] = await queryRows<{ department_id: string }>(
    `
      SELECT department_id
      FROM greenhouse_core.departments
      WHERE department_id = $1
      LIMIT 1
    `,
    [departmentId],
    client
  )

  if (!row) {
    throw new HrCoreValidationError('Department not found.', 404, { departmentId })
  }
}

const assertMemberExists = async (memberId: string, client?: PoolClient) => {
  const [row] = await queryRows<{ member_id: string }>(
    `
      SELECT member_id
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId],
    client
  )

  if (!row) {
    throw new HrCoreValidationError('Team member not found.', 404, { memberId })
  }
}

const assertDepartmentTreeIsAcyclic = async ({
  departmentId,
  parentDepartmentId,
  client
}: {
  departmentId: string
  parentDepartmentId: string | null
  client?: PoolClient
}) => {
  const visited = new Set<string>([departmentId])
  let cursorDepartmentId = parentDepartmentId

  while (cursorDepartmentId) {
    if (visited.has(cursorDepartmentId)) {
      throw new HrCoreValidationError('A department cannot become a descendant of itself.', 409, {
        departmentId,
        parentDepartmentId
      })
    }

    visited.add(cursorDepartmentId)

    const [row] = await queryRows<{ parent_department_id: string | null }>(
      `
        SELECT parent_department_id
        FROM greenhouse_core.departments
        WHERE department_id = $1
        LIMIT 1
      `,
      [cursorDepartmentId],
      client
    )

    cursorDepartmentId = normalizeNullableString(row?.parent_department_id)
  }
}

const syncHeadMemberDepartment = async ({
  departmentId,
  headMemberId,
  client
}: {
  departmentId: string
  headMemberId: string | null
  client: PoolClient
}) => {
  if (!headMemberId) {
    return
  }

  await client.query(
    `
      UPDATE greenhouse_core.members
      SET
        department_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE member_id = $1
        AND department_id IS DISTINCT FROM $2
    `,
    [headMemberId, departmentId]
  )
}

const validateDepartmentRelations = async ({
  departmentId,
  parentDepartmentId,
  headMemberId,
  client
}: {
  departmentId: string
  parentDepartmentId: string | null
  headMemberId: string | null
  client?: PoolClient
}) => {
  if (parentDepartmentId === departmentId) {
    throw new HrCoreValidationError('A department cannot be its own parent.', 409, {
      departmentId,
      parentDepartmentId
    })
  }

  if (parentDepartmentId) {
    await assertDepartmentExists(parentDepartmentId, client)
    await assertDepartmentTreeIsAcyclic({
      departmentId,
      parentDepartmentId,
      client
    })
  }

  if (headMemberId) {
    await assertMemberExists(headMemberId, client)
  }
}

export const listDepartmentsFromPostgres = async ({ activeOnly = false }: { activeOnly?: boolean } = {}) => {
  await assertHrDepartmentsPostgresReady()

  const rows = await query<PostgresDepartmentRow>(
    `
      SELECT
        d.department_id,
        d.name,
        d.description,
        d.parent_department_id,
        d.head_member_id,
        head.display_name AS head_member_name,
        d.business_unit,
        d.active,
        d.sort_order
      FROM greenhouse_core.departments AS d
      LEFT JOIN greenhouse_core.members AS head
        ON head.member_id = d.head_member_id
      ${activeOnly ? 'WHERE d.active = TRUE' : ''}
      ORDER BY d.sort_order ASC, d.name ASC
    `
  )

  return rows.map(mapDepartment)
}

export const listDepartmentHeadOptionsFromPostgres = async (): Promise<HrMemberOption[]> => {
  await assertHrDepartmentsPostgresReady()

  const rows = await query<DepartmentHeadOptionRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.role_title
      FROM greenhouse_core.members AS m
      WHERE m.active = TRUE
      ORDER BY m.display_name ASC NULLS LAST, m.member_id ASC
    `
  )

  return rows.map(row => ({
    memberId: row.member_id,
    displayName: normalizeNullableString(row.display_name) || row.member_id,
    roleTitle: normalizeNullableString(row.role_title)
  }))
}

export const getDepartmentByIdFromPostgres = async (departmentId: string, client?: PoolClient) => {
  await assertHrDepartmentsPostgresReady()

  const [row] = await queryRows<PostgresDepartmentRow>(
    `
      SELECT
        d.department_id,
        d.name,
        d.description,
        d.parent_department_id,
        d.head_member_id,
        head.display_name AS head_member_name,
        d.business_unit,
        d.active,
        d.sort_order
      FROM greenhouse_core.departments AS d
      LEFT JOIN greenhouse_core.members AS head
        ON head.member_id = d.head_member_id
      WHERE d.department_id = $1
      LIMIT 1
    `,
    [departmentId],
    client
  )

  return row ? mapDepartment(row) : null
}

export const createDepartmentInPostgres = async (input: CreateDepartmentInput) => {
  await assertHrDepartmentsPostgresReady()

  const normalizedName = normalizeString(input.name)
  const normalizedBusinessUnit = normalizeString(input.businessUnit)
  const departmentId = slugify(normalizeString(input.departmentId || normalizedName))
  const description = normalizeNullableString(input.description)
  const parentDepartmentId = normalizeNullableString(input.parentDepartmentId)
  const headMemberId = normalizeNullableString(input.headMemberId)
  const active = input.active ?? true
  const sortOrder = input.sortOrder ?? 0

  assertNonEmptyField(normalizedName, 'name')
  assertNonEmptyField(normalizedBusinessUnit, 'businessUnit')
  assertNonEmptyField(departmentId, 'departmentId')

  return withTransaction(async client => {
    const [existing] = await queryRows<{ department_id: string }>(
      `
        SELECT department_id
        FROM greenhouse_core.departments
        WHERE department_id = $1
        LIMIT 1
      `,
      [departmentId],
      client
    )

    if (existing) {
      throw new HrCoreValidationError('Department already exists.', 409, { departmentId })
    }

    await validateDepartmentRelations({
      departmentId,
      parentDepartmentId,
      headMemberId,
      client
    })

    await client.query(
      `
        INSERT INTO greenhouse_core.departments (
          department_id,
          name,
          description,
          parent_department_id,
          head_member_id,
          business_unit,
          active,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [departmentId, normalizedName, description, parentDepartmentId, headMemberId, normalizedBusinessUnit, active, sortOrder]
    )

    await syncHeadMemberDepartment({
      departmentId,
      headMemberId,
      client
    })

    const created = await getDepartmentByIdFromPostgres(departmentId, client)

    if (!created) {
      throw new HrCoreValidationError('Created department could not be reloaded.', 500, { departmentId })
    }

    return created
  })
}

export const updateDepartmentInPostgres = async (departmentId: string, input: UpdateDepartmentInput) => {
  await assertHrDepartmentsPostgresReady()

  return withTransaction(async client => {
    const existing = await getDepartmentByIdFromPostgres(departmentId, client)

    if (!existing) {
      throw new HrCoreValidationError('Department not found.', 404, { departmentId })
    }

    if (input.departmentId !== undefined && slugify(normalizeString(input.departmentId)) !== departmentId) {
      throw new HrCoreValidationError('departmentId cannot be changed once created.', 409, { departmentId })
    }

    const updates: string[] = []
    const values: unknown[] = [departmentId]

    const addValue = (value: unknown) => {
      values.push(value)

      return `$${values.length}`
    }

    const nextName = input.name !== undefined ? normalizeString(input.name) : existing.name
    const nextBusinessUnit = input.businessUnit !== undefined ? normalizeString(input.businessUnit) : existing.businessUnit

    const nextParentDepartmentId =
      input.parentDepartmentId !== undefined ? normalizeNullableString(input.parentDepartmentId) : existing.parentDepartmentId

    const nextHeadMemberId = input.headMemberId !== undefined ? normalizeNullableString(input.headMemberId) : existing.headMemberId

    assertNonEmptyField(nextName, 'name')
    assertNonEmptyField(nextBusinessUnit, 'businessUnit')

    await validateDepartmentRelations({
      departmentId,
      parentDepartmentId: nextParentDepartmentId,
      headMemberId: nextHeadMemberId,
      client
    })

    if (input.name !== undefined) {
      updates.push(`name = ${addValue(nextName)}`)
    }

    if (input.description !== undefined) {
      updates.push(`description = ${addValue(normalizeNullableString(input.description))}`)
    }

    if (input.parentDepartmentId !== undefined) {
      updates.push(`parent_department_id = ${addValue(nextParentDepartmentId)}`)
    }

    if (input.headMemberId !== undefined) {
      updates.push(`head_member_id = ${addValue(nextHeadMemberId)}`)
    }

    if (input.businessUnit !== undefined) {
      updates.push(`business_unit = ${addValue(nextBusinessUnit)}`)
    }

    if (input.active !== undefined) {
      updates.push(`active = ${addValue(Boolean(input.active))}`)
    }

    if (input.sortOrder !== undefined) {
      updates.push(`sort_order = ${addValue(toInt(input.sortOrder))}`)
    }

    if (updates.length === 0) {
      return existing
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')

    await client.query(
      `
        UPDATE greenhouse_core.departments
        SET ${updates.join(', ')}
        WHERE department_id = $1
      `,
      values
    )

    await syncHeadMemberDepartment({
      departmentId,
      headMemberId: nextHeadMemberId,
      client
    })

    const updated = await getDepartmentByIdFromPostgres(departmentId, client)

    if (!updated) {
      throw new HrCoreValidationError('Updated department could not be reloaded.', 500, { departmentId })
    }

    return updated
  })
}

export const getMemberDepartmentContextFromPostgres = async (memberId: string, client?: PoolClient) => {
  await assertHrDepartmentsPostgresReady()

  const [row] = await queryRows<MemberDepartmentContextRow>(
    `
      SELECT
        m.member_id,
        COALESCE(m.department_id, headed_dept.department_id) AS department_id,
        COALESCE(d.name, headed_dept.name) AS department_name
      FROM greenhouse_core.members AS m
      LEFT JOIN greenhouse_core.departments AS d
        ON d.department_id = m.department_id
      LEFT JOIN LATERAL (
        SELECT
          dept.department_id,
          dept.name
        FROM greenhouse_core.departments AS dept
        WHERE dept.head_member_id = m.member_id
        ORDER BY dept.sort_order ASC, dept.name ASC
        LIMIT 1
      ) AS headed_dept ON TRUE
      WHERE m.member_id = $1
      LIMIT 1
    `,
    [memberId],
    client
  )

  if (!row) {
    throw new HrCoreValidationError('Team member not found.', 404, { memberId })
  }

  return {
    departmentId: normalizeNullableString(row.department_id),
    departmentName: normalizeNullableString(row.department_name)
  }
}

export const updateMemberDepartmentContextInPostgres = async ({
  memberId,
  departmentId
}: {
  memberId: string
  departmentId: string | null
}) => {
  await assertHrDepartmentsPostgresReady()

  const normalizedDepartmentId = normalizeNullableString(departmentId)

  return withTransaction(async client => {
    await assertMemberExists(memberId, client)

    if (normalizedDepartmentId) {
      await assertDepartmentExists(normalizedDepartmentId, client)
    }

    await client.query(
      `
        UPDATE greenhouse_core.members
        SET
          department_id = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE member_id = $1
      `,
      [memberId, normalizedDepartmentId]
    )

    return getMemberDepartmentContextFromPostgres(memberId, client)
  })
}
