import 'server-only'

export interface RawTaskParityRow {
  task_source_id: string | null
  space_id: string | null
  task_status: string | null
  due_date: string | null
  assignee_source_id: string | null
  tarea_principal_ids: string[] | null
  subtareas_ids: string[] | null
}

export interface ConformedTaskParityRow {
  task_source_id: string | null
  space_id: string | null
  task_status: string | null
  due_date: string | null
  assignee_source_id: string | null
  tarea_principal_ids: string[] | null
  subtareas_ids: string[] | null
}

export interface NotionTaskParityCounters {
  totalTasks: number
  withAssigneeSource: number
  withDueDate: number
  withHierarchy: number
}

export interface NotionTaskParitySnapshot {
  distinctTaskCount: number
  spaceTotals: Record<string, NotionTaskParityCounters>
  statusCounts: Record<string, Record<string, number>>
}

export interface NotionTaskParitySpaceResult {
  spaceId: string
  rawCount: number
  conformedCount: number
  missingTaskIds: number
  unexpectedTaskIds: number
  statusMismatches: number
  dueDateMismatches: number
  assigneeCoverageDelta: number
  dueDateCoverageDelta: number
  hierarchyCountDelta: number
  hierarchyContentMismatches: number
  ok: boolean
}

export interface NotionTaskParityValidationResult {
  ok: boolean
  spaces: NotionTaskParitySpaceResult[]
  failingSpaces: NotionTaskParitySpaceResult[]
}

const NULL_KEY = '__NULL__'

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed || null
  }

  return String(value).trim() || null
}

const toStringArray = (value: string[] | null | undefined) =>
  Array.from(
    new Set((value ?? []).map(item => toNullableString(item)).filter((item): item is string => Boolean(item)))
  ).sort()

const toNullKey = (value: string | null | undefined) => value ?? NULL_KEY

const createRowMap = <T extends { task_source_id: string | null }>(rows: T[]) =>
  new Map(
    rows
      .map(row => [toNullableString(row.task_source_id), row] as const)
      .filter((entry): entry is readonly [string, T] => Boolean(entry[0]))
  )

export const buildNotionTaskParitySnapshot = (
  rows: Array<RawTaskParityRow | ConformedTaskParityRow>
): NotionTaskParitySnapshot => {
  const distinctTaskIds = new Set<string>()
  const spaceTotals: Record<string, NotionTaskParityCounters> = {}
  const statusCounts: Record<string, Record<string, number>> = {}

  for (const row of rows) {
    const taskSourceId = toNullableString(row.task_source_id)
    const spaceKey = toNullKey(toNullableString(row.space_id))
    const statusKey = toNullKey(toNullableString(row.task_status))

    if (taskSourceId) {
      distinctTaskIds.add(taskSourceId)
    }

    if (!spaceTotals[spaceKey]) {
      spaceTotals[spaceKey] = {
        totalTasks: 0,
        withAssigneeSource: 0,
        withDueDate: 0,
        withHierarchy: 0
      }
    }

    if (!statusCounts[spaceKey]) {
      statusCounts[spaceKey] = {}
    }

    spaceTotals[spaceKey].totalTasks += 1

    if (toNullableString(row.assignee_source_id)) {
      spaceTotals[spaceKey].withAssigneeSource += 1
    }

    if (toNullableString(row.due_date)) {
      spaceTotals[spaceKey].withDueDate += 1
    }

    if (toStringArray(row.tarea_principal_ids).length > 0 || toStringArray(row.subtareas_ids).length > 0) {
      spaceTotals[spaceKey].withHierarchy += 1
    }

    statusCounts[spaceKey][statusKey] = (statusCounts[spaceKey][statusKey] ?? 0) + 1
  }

  return {
    distinctTaskCount: distinctTaskIds.size,
    spaceTotals,
    statusCounts
  }
}

export const compareNotionTaskParitySnapshots = (
  expected: NotionTaskParitySnapshot,
  actual: NotionTaskParitySnapshot
) => {
  const mismatches: string[] = []

  if (expected.distinctTaskCount !== actual.distinctTaskCount) {
    mismatches.push(
      `distinct_task_count mismatch expected=${expected.distinctTaskCount} actual=${actual.distinctTaskCount}`
    )
  }

  const spaceKeys = Array.from(
    new Set([...Object.keys(expected.spaceTotals), ...Object.keys(actual.spaceTotals)])
  ).sort()

  for (const spaceKey of spaceKeys) {
    const expectedSpace = expected.spaceTotals[spaceKey] ?? {
      totalTasks: 0,
      withAssigneeSource: 0,
      withDueDate: 0,
      withHierarchy: 0
    }

    const actualSpace = actual.spaceTotals[spaceKey] ?? {
      totalTasks: 0,
      withAssigneeSource: 0,
      withDueDate: 0,
      withHierarchy: 0
    }

    if (expectedSpace.totalTasks !== actualSpace.totalTasks) {
      mismatches.push(
        `space ${spaceKey} total mismatch expected=${expectedSpace.totalTasks} actual=${actualSpace.totalTasks}`
      )
    }

    if (expectedSpace.withAssigneeSource !== actualSpace.withAssigneeSource) {
      mismatches.push(
        `space ${spaceKey} assignee mismatch expected=${expectedSpace.withAssigneeSource} actual=${actualSpace.withAssigneeSource}`
      )
    }

    if (expectedSpace.withDueDate !== actualSpace.withDueDate) {
      mismatches.push(
        `space ${spaceKey} due_date mismatch expected=${expectedSpace.withDueDate} actual=${actualSpace.withDueDate}`
      )
    }

    if (expectedSpace.withHierarchy !== actualSpace.withHierarchy) {
      mismatches.push(
        `space ${spaceKey} hierarchy mismatch expected=${expectedSpace.withHierarchy} actual=${actualSpace.withHierarchy}`
      )
    }

    const statusKeys = Array.from(
      new Set([
        ...Object.keys(expected.statusCounts[spaceKey] ?? {}),
        ...Object.keys(actual.statusCounts[spaceKey] ?? {})
      ])
    ).sort()

    for (const statusKey of statusKeys) {
      const expectedCount = expected.statusCounts[spaceKey]?.[statusKey] ?? 0
      const actualCount = actual.statusCounts[spaceKey]?.[statusKey] ?? 0

      if (expectedCount !== actualCount) {
        mismatches.push(
          `space ${spaceKey} status ${statusKey} mismatch expected=${expectedCount} actual=${actualCount}`
        )
      }
    }
  }

  return mismatches
}

export const validateRawToConformedTaskParity = ({
  rawRows,
  conformedRows
}: {
  rawRows: RawTaskParityRow[]
  conformedRows: ConformedTaskParityRow[]
}): NotionTaskParityValidationResult => {
  const spaceIds = Array.from(
    new Set(
      [...rawRows, ...conformedRows]
        .map(row => toNullableString(row.space_id))
        .filter((spaceId): spaceId is string => Boolean(spaceId))
    )
  ).sort()

  const spaces = spaceIds.map(spaceId => {
    const scopedRawRows = rawRows.filter(row => toNullableString(row.space_id) === spaceId)
    const scopedConformedRows = conformedRows.filter(row => toNullableString(row.space_id) === spaceId)
    const rawMap = createRowMap(scopedRawRows)
    const conformedMap = createRowMap(scopedConformedRows)

    let missingTaskIds = 0
    let unexpectedTaskIds = 0
    let statusMismatches = 0
    let dueDateMismatches = 0
    let hierarchyContentMismatches = 0

    for (const [taskSourceId, rawRow] of rawMap.entries()) {
      const conformedRow = conformedMap.get(taskSourceId)

      if (!conformedRow) {
        missingTaskIds++
        continue
      }

      if (toNullableString(rawRow.task_status) !== toNullableString(conformedRow.task_status)) {
        statusMismatches++
      }

      if (toNullableString(rawRow.due_date) !== toNullableString(conformedRow.due_date)) {
        dueDateMismatches++
      }

      const rawParents = toStringArray(rawRow.tarea_principal_ids)
      const rawChildren = toStringArray(rawRow.subtareas_ids)
      const conformedParents = toStringArray(conformedRow.tarea_principal_ids)
      const conformedChildren = toStringArray(conformedRow.subtareas_ids)

      if (
        rawParents.join('|') !== conformedParents.join('|') ||
        rawChildren.join('|') !== conformedChildren.join('|')
      ) {
        hierarchyContentMismatches++
      }
    }

    for (const taskSourceId of conformedMap.keys()) {
      if (!rawMap.has(taskSourceId)) {
        unexpectedTaskIds++
      }
    }

    const rawWithAssignee = scopedRawRows.filter(row => Boolean(toNullableString(row.assignee_source_id))).length
    const conformedWithAssignee = scopedConformedRows.filter(row => Boolean(toNullableString(row.assignee_source_id))).length
    const rawWithDueDate = scopedRawRows.filter(row => Boolean(toNullableString(row.due_date))).length
    const conformedWithDueDate = scopedConformedRows.filter(row => Boolean(toNullableString(row.due_date))).length

    const rawWithHierarchy = scopedRawRows.filter(
      row => toStringArray(row.tarea_principal_ids).length > 0 || toStringArray(row.subtareas_ids).length > 0
    ).length

    const conformedWithHierarchy = scopedConformedRows.filter(
      row => toStringArray(row.tarea_principal_ids).length > 0 || toStringArray(row.subtareas_ids).length > 0
    ).length

    const result = {
      spaceId,
      rawCount: scopedRawRows.length,
      conformedCount: scopedConformedRows.length,
      missingTaskIds,
      unexpectedTaskIds,
      statusMismatches,
      dueDateMismatches,
      assigneeCoverageDelta: rawWithAssignee - conformedWithAssignee,
      dueDateCoverageDelta: rawWithDueDate - conformedWithDueDate,
      hierarchyCountDelta: rawWithHierarchy - conformedWithHierarchy,
      hierarchyContentMismatches,
      ok:
        scopedRawRows.length === scopedConformedRows.length &&
        missingTaskIds === 0 &&
        unexpectedTaskIds === 0 &&
        statusMismatches === 0 &&
        dueDateMismatches === 0 &&
        rawWithAssignee === conformedWithAssignee &&
        rawWithDueDate === conformedWithDueDate &&
        rawWithHierarchy === conformedWithHierarchy &&
        hierarchyContentMismatches === 0
    } satisfies NotionTaskParitySpaceResult

    return result
  })

  return {
    ok: spaces.every(space => space.ok),
    spaces,
    failingSpaces: spaces.filter(space => !space.ok)
  }
}
