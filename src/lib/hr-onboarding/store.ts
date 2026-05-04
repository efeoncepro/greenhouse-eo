import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  HR_CONTRACT_TYPES,
  HrCoreValidationError,
  assertDateString,
  assertEnum,
  assertPositiveInteger,
  normalizeNullableString,
  normalizeString
} from '@/lib/hr-core/shared'
import {
  HR_ONBOARDING_ASSIGNED_ROLES,
  HR_ONBOARDING_ITEM_STATUSES,
  HR_ONBOARDING_TEMPLATE_TYPES,
  type CreateHrOnboardingInstanceInput,
  type CreateHrOnboardingTemplateInput,
  type HrOnboardingAssignedRole,
  type HrOnboardingInstance,
  type HrOnboardingInstanceItem,
  type HrOnboardingInstanceStatus,
  type HrOnboardingItemStatus,
  type HrOnboardingTemplate,
  type HrOnboardingTemplateItem,
  type HrOnboardingTemplateType,
  type UpdateHrOnboardingTemplateInput
} from '@/types/hr-onboarding'
import type { ContractType } from '@/types/hr-contracts'

type Row = Record<string, any>

export const ACTIVE_ONBOARDING_INSTANCE_STATUS: HrOnboardingInstanceStatus = 'active'

const toTimestampString = (value: unknown): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const toNullableTimestampString = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const toDateString = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toJsonRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const normalizeContractTypes = (value: unknown): ContractType[] => {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is ContractType => HR_CONTRACT_TYPES.includes(item as ContractType))
}

const addDays = (dateString: string, offset: number) => {
  const date = new Date(`${dateString}T00:00:00.000Z`)

  date.setUTCDate(date.getUTCDate() + offset)

  return date.toISOString().slice(0, 10)
}

const today = () => new Date().toISOString().slice(0, 10)

const mapTemplateItem = (row: Row): HrOnboardingTemplateItem => ({
  itemId: row.item_id,
  templateId: row.template_id,
  title: row.item_title,
  description: row.item_description,
  assignedRole: row.assigned_role,
  dueDaysOffset: Number(row.due_days_offset ?? 0),
  required: Boolean(row.required),
  displayOrder: Number(row.display_order ?? 0),
  metadata: toJsonRecord(row.metadata_json),
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const mapTemplate = (row: Row, items: HrOnboardingTemplateItem[]): HrOnboardingTemplate => ({
  templateId: row.template_id,
  name: row.template_name,
  type: row.template_type,
  description: row.description,
  applicableContractTypes: normalizeContractTypes(row.applicable_contract_types),
  active: Boolean(row.active),
  metadata: toJsonRecord(row.metadata_json),
  items,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const mapInstanceItem = (row: Row): HrOnboardingInstanceItem => ({
  instanceItemId: row.instance_item_id,
  instanceId: row.instance_id,
  templateItemId: row.template_item_id,
  title: row.item_title_snapshot,
  description: row.item_description_snapshot,
  assignedRole: row.assigned_role_snapshot,
  dueDate: toDateString(row.due_date),
  required: Boolean(row.required_snapshot),
  displayOrder: Number(row.display_order_snapshot ?? 0),
  status: row.status,
  completedAt: toNullableTimestampString(row.completed_at),
  completedByUserId: row.completed_by_user_id,
  notes: row.notes,
  metadata: toJsonRecord(row.metadata_json),
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const computeProgress = (items: HrOnboardingInstanceItem[]) => {
  const total = items.length
  const required = items.filter(item => item.required).length
  const completed = items.filter(item => item.status === 'done' || item.status === 'skipped').length
  const requiredDone = items.filter(item => item.required && (item.status === 'done' || item.status === 'skipped')).length
  const currentDate = today()
  const overdue = items.filter(item => item.status !== 'done' && item.status !== 'skipped' && item.dueDate && item.dueDate < currentDate).length
  const denominator = required || total || 1

  return {
    total,
    required,
    completed,
    overdue,
    percent: Math.round((requiredDone / denominator) * 100)
  }
}

const mapInstance = (row: Row, items: HrOnboardingInstanceItem[]): HrOnboardingInstance => ({
  instanceId: row.instance_id,
  templateId: row.template_id,
  templateName: row.template_name ?? null,
  memberId: row.member_id,
  memberName: row.member_name ?? null,
  offboardingCaseId: row.offboarding_case_id,
  type: row.instance_type,
  status: row.status,
  startDate: toDateString(row.start_date) ?? '',
  completedAt: toNullableTimestampString(row.completed_at),
  cancelledAt: toNullableTimestampString(row.cancelled_at),
  cancellationReason: row.cancellation_reason,
  source: row.source,
  sourceRef: toJsonRecord(row.source_ref),
  metadata: toJsonRecord(row.metadata_json),
  progress: computeProgress(items),
  items,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const clientRows = async <T extends Row>(client: PoolClient | undefined, sql: string, params: unknown[] = []) =>
  client ? (await client.query<T>(sql, params)).rows : await query<T>(sql, params)

const execute = async (client: PoolClient | undefined, sql: string, params: unknown[] = []) => {
  if (client) {
    await client.query(sql, params)

    return
  }

  await query(sql, params)
}

export const listOnboardingTemplates = async ({
  type,
  active
}: {
  type?: HrOnboardingTemplateType | null
  active?: boolean | null
} = {}) => {
  const params: unknown[] = []
  const filters: string[] = []

  if (type) {
    params.push(type)
    filters.push(`template_type = $${params.length}`)
  }

  if (typeof active === 'boolean') {
    params.push(active)
    filters.push(`active = $${params.length}`)
  }

  const templates = await query<Row>(
    `
      SELECT *
      FROM greenhouse_hr.onboarding_templates
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY template_type, active DESC, template_name
    `,
    params
  )

  const items = await query<Row>(
    `
      SELECT *
      FROM greenhouse_hr.onboarding_template_items
      WHERE template_id = ANY($1::text[])
      ORDER BY template_id, display_order, created_at
    `,
    [templates.map(row => row.template_id)]
  )

  const itemsByTemplate = new Map<string, HrOnboardingTemplateItem[]>()

  for (const item of items.map(mapTemplateItem)) {
    itemsByTemplate.set(item.templateId, [...(itemsByTemplate.get(item.templateId) ?? []), item])
  }

  return templates.map(row => mapTemplate(row, itemsByTemplate.get(row.template_id) ?? []))
}

export const getOnboardingTemplate = async (templateId: string, client?: PoolClient) => {
  const templates = await clientRows<Row>(
    client,
    `SELECT * FROM greenhouse_hr.onboarding_templates WHERE template_id = $1 LIMIT 1`,
    [templateId]
  )

  const template = templates[0]

  if (!template) {
    throw new HrCoreValidationError('Onboarding template not found.', 404)
  }

  const items = await clientRows<Row>(
    client,
    `
      SELECT *
      FROM greenhouse_hr.onboarding_template_items
      WHERE template_id = $1
      ORDER BY display_order, created_at
    `,
    [templateId]
  )

  return mapTemplate(template, items.map(mapTemplateItem))
}

const findTemplateForMember = async (client: PoolClient, type: HrOnboardingTemplateType, memberId: string) => {
  const rows = await client.query<Row>(
    `
      SELECT t.*, m.contract_type, m.hire_date
      FROM greenhouse_core.members m
      JOIN greenhouse_hr.onboarding_templates t
        ON t.template_type = $2
       AND t.active = TRUE
       AND (
         cardinality(t.applicable_contract_types) = 0
         OR m.contract_type = ANY(t.applicable_contract_types)
       )
      WHERE m.member_id = $1
      ORDER BY cardinality(t.applicable_contract_types) DESC, t.created_at ASC
      LIMIT 1
    `,
    [memberId, type]
  )

  return rows.rows[0] ?? null
}

const assertMemberExists = async (client: PoolClient, memberId: string) => {
  const rows = await client.query<Row>(
    `
      SELECT member_id, display_name, hire_date, contract_end_date, contract_type
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId]
  )

  const row = rows.rows[0]

  if (!row) {
    throw new HrCoreValidationError('Member not found.', 404)
  }

  return row
}

export const createOnboardingTemplate = async ({
  input,
  actorUserId
}: {
  input: CreateHrOnboardingTemplateInput
  actorUserId?: string | null
}) => withTransaction(async client => {
  const name = normalizeString(input.name)
  const type = assertEnum(input.type, HR_ONBOARDING_TEMPLATE_TYPES, 'type')

  if (!name) throw new HrCoreValidationError('Template name is required.')

  const templateId = `onboarding-template-${randomUUID()}`

  await client.query(
    `
      INSERT INTO greenhouse_hr.onboarding_templates (
        template_id, template_name, template_type, description,
        applicable_contract_types, active, created_by_user_id, updated_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $7)
    `,
    [
      templateId,
      name,
      type,
      normalizeNullableString(input.description),
      normalizeContractTypes(input.applicableContractTypes),
      input.active ?? true,
      actorUserId ?? null
    ]
  )

  for (const [index, item] of (input.items ?? []).entries()) {
    await addOnboardingTemplateItem(
      {
        templateId,
        title: item.title,
        description: item.description,
        assignedRole: item.assignedRole,
        dueDaysOffset: item.dueDaysOffset ?? 0,
        required: item.required ?? true,
        displayOrder: index + 1
      },
      client
    )
  }

  return getOnboardingTemplate(templateId, client)
})

export const updateOnboardingTemplate = async ({
  templateId,
  input,
  actorUserId
}: {
  templateId: string
  input: UpdateHrOnboardingTemplateInput
  actorUserId?: string | null
}) => withTransaction(async client => {
  await getOnboardingTemplate(templateId, client)

  const updates: string[] = []
  const params: unknown[] = []

  if (input.name !== undefined) {
    const name = normalizeString(input.name)

    if (!name) throw new HrCoreValidationError('Template name is required.')
    params.push(name)
    updates.push(`template_name = $${params.length}`)
  }

  if (input.description !== undefined) {
    params.push(normalizeNullableString(input.description))
    updates.push(`description = $${params.length}`)
  }

  if (input.applicableContractTypes !== undefined) {
    params.push(normalizeContractTypes(input.applicableContractTypes))
    updates.push(`applicable_contract_types = $${params.length}::text[]`)
  }

  if (input.active !== undefined) {
    params.push(Boolean(input.active))
    updates.push(`active = $${params.length}`)
  }

  if (updates.length > 0) {
    params.push(actorUserId ?? null)
    updates.push(`updated_by_user_id = $${params.length}`)
    params.push(templateId)

    await client.query(
      `
        UPDATE greenhouse_hr.onboarding_templates
        SET ${updates.join(', ')}
        WHERE template_id = $${params.length}
      `,
      params
    )
  }

  return getOnboardingTemplate(templateId, client)
})

export const addOnboardingTemplateItem = async (
  input: {
    templateId: string
    title: string
    description?: string | null
    assignedRole: HrOnboardingAssignedRole
    dueDaysOffset?: number
    required?: boolean
    displayOrder?: number
  },
  client?: PoolClient
) => {
  const title = normalizeString(input.title)
  const assignedRole = assertEnum(input.assignedRole, HR_ONBOARDING_ASSIGNED_ROLES, 'assignedRole')

  if (!title) throw new HrCoreValidationError('Item title is required.')

  const itemId = `onboarding-template-item-${randomUUID()}`

  await execute(
    client,
    `
      INSERT INTO greenhouse_hr.onboarding_template_items (
        item_id, template_id, item_title, item_description, assigned_role,
        due_days_offset, required, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      itemId,
      input.templateId,
      title,
      normalizeNullableString(input.description),
      assignedRole,
      Number(input.dueDaysOffset ?? 0),
      input.required ?? true,
      input.displayOrder ?? 0
    ]
  )

  return getOnboardingTemplate(input.templateId, client)
}

export const updateOnboardingTemplateItem = async ({
  templateId,
  itemId,
  input
}: {
  templateId: string
  itemId: string
  input: Partial<{
    title: string
    description: string | null
    assignedRole: HrOnboardingAssignedRole
    dueDaysOffset: number
    required: boolean
  }>
}) => withTransaction(async client => {
  const updates: string[] = []
  const params: unknown[] = []

  if (input.title !== undefined) {
    const title = normalizeString(input.title)

    if (!title) throw new HrCoreValidationError('Item title is required.')
    params.push(title)
    updates.push(`item_title = $${params.length}`)
  }

  if (input.description !== undefined) {
    params.push(normalizeNullableString(input.description))
    updates.push(`item_description = $${params.length}`)
  }

  if (input.assignedRole !== undefined) {
    params.push(assertEnum(input.assignedRole, HR_ONBOARDING_ASSIGNED_ROLES, 'assignedRole'))
    updates.push(`assigned_role = $${params.length}`)
  }

  if (input.dueDaysOffset !== undefined) {
    params.push(Number(input.dueDaysOffset))
    updates.push(`due_days_offset = $${params.length}`)
  }

  if (input.required !== undefined) {
    params.push(Boolean(input.required))
    updates.push(`required = $${params.length}`)
  }

  if (updates.length > 0) {
    params.push(templateId, itemId)
    await client.query(
      `
        UPDATE greenhouse_hr.onboarding_template_items
        SET ${updates.join(', ')}
        WHERE template_id = $${params.length - 1}
          AND item_id = $${params.length}
      `,
      params
    )
  }

  return getOnboardingTemplate(templateId, client)
})

export const deleteOnboardingTemplateItem = async (templateId: string, itemId: string) => withTransaction(async client => {
  await client.query(
    `DELETE FROM greenhouse_hr.onboarding_template_items WHERE template_id = $1 AND item_id = $2`,
    [templateId, itemId]
  )

  return getOnboardingTemplate(templateId, client)
})

export const reorderOnboardingTemplateItems = async ({
  templateId,
  itemIds
}: {
  templateId: string
  itemIds: string[]
}) => withTransaction(async client => {
  for (const [index, itemId] of itemIds.entries()) {
    await client.query(
      `
        UPDATE greenhouse_hr.onboarding_template_items
        SET display_order = $1
        WHERE template_id = $2
          AND item_id = $3
      `,
      [index + 1, templateId, itemId]
    )
  }

  return getOnboardingTemplate(templateId, client)
})

export const listOnboardingInstances = async ({
  type,
  status,
  memberId,
  limit = 100
}: {
  type?: HrOnboardingTemplateType | null
  status?: HrOnboardingInstanceStatus | 'active' | null
  memberId?: string | null
  limit?: number
} = {}) => {
  const params: unknown[] = []
  const filters: string[] = []

  if (type) {
    params.push(type)
    filters.push(`i.instance_type = $${params.length}`)
  }

  if (status === 'active') {
    filters.push(`i.status = 'active'`)
  } else if (status) {
    params.push(status)
    filters.push(`i.status = $${params.length}`)
  }

  if (memberId) {
    params.push(memberId)
    filters.push(`i.member_id = $${params.length}`)
  }

  params.push(Math.min(Math.max(Number(limit) || 100, 1), 500))

  const instances = await query<Row>(
    `
      SELECT i.*, t.template_name, m.display_name AS member_name
      FROM greenhouse_hr.onboarding_instances i
      JOIN greenhouse_hr.onboarding_templates t ON t.template_id = i.template_id
      LEFT JOIN greenhouse_core.members m ON m.member_id = i.member_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY i.status = 'active' DESC, i.created_at DESC
      LIMIT $${params.length}
    `,
    params
  )

  return hydrateInstances(instances)
}

const hydrateInstances = async (instances: Row[], client?: PoolClient) => {
  const ids = instances.map(row => row.instance_id)

  const itemRows = ids.length
    ? await clientRows<Row>(
      client,
      `
        SELECT *
        FROM greenhouse_hr.onboarding_instance_items
        WHERE instance_id = ANY($1::text[])
        ORDER BY instance_id, display_order_snapshot, created_at
      `,
      [ids]
    )
    : []

  const itemsByInstance = new Map<string, HrOnboardingInstanceItem[]>()

  for (const item of itemRows.map(mapInstanceItem)) {
    itemsByInstance.set(item.instanceId, [...(itemsByInstance.get(item.instanceId) ?? []), item])
  }

  return instances.map(row => mapInstance(row, itemsByInstance.get(row.instance_id) ?? []))
}

export const getOnboardingInstance = async (instanceId: string, client?: PoolClient) => {
  const rows = await clientRows<Row>(
    client,
    `
      SELECT i.*, t.template_name, m.display_name AS member_name
      FROM greenhouse_hr.onboarding_instances i
      JOIN greenhouse_hr.onboarding_templates t ON t.template_id = i.template_id
      LEFT JOIN greenhouse_core.members m ON m.member_id = i.member_id
      WHERE i.instance_id = $1
      LIMIT 1
    `,
    [instanceId]
  )

  const instance = (await hydrateInstances(rows, client))[0]

  if (!instance) {
    throw new HrCoreValidationError('Onboarding instance not found.', 404)
  }

  return instance
}

export const createOnboardingInstance = async ({
  input,
  actorUserId
}: {
  input: CreateHrOnboardingInstanceInput
  actorUserId?: string | null
}) => withTransaction(async client => {
  const type = assertEnum(input.type, HR_ONBOARDING_TEMPLATE_TYPES, 'type')
  const member = await assertMemberExists(client, input.memberId)

  const template = input.templateId
    ? await getOnboardingTemplate(input.templateId, client)
    : (() => null)()

  const templateRow = template
    ? { template_id: template.templateId, template_type: template.type }
    : await findTemplateForMember(client, type, input.memberId)

  if (!templateRow) {
    throw new HrCoreValidationError('No active onboarding template matches this member.', 409, {
      memberId: input.memberId,
      type
    })
  }

  if (templateRow.template_type !== type) {
    throw new HrCoreValidationError('Template type does not match instance type.', 400)
  }

  const existing = await client.query<Row>(
    `
      SELECT instance_id
      FROM greenhouse_hr.onboarding_instances
      WHERE member_id = $1
        AND instance_type = $2
        AND status = 'active'
      LIMIT 1
    `,
    [input.memberId, type]
  )

  if (existing.rows[0]) {
    return getOnboardingInstance(existing.rows[0].instance_id, client)
  }

  const startDate = input.startDate
    ? assertDateString(input.startDate, 'startDate')
    : type === 'onboarding'
      ? toDateString(member.hire_date) ?? today()
      : today()

  const instanceId = `onboarding-instance-${randomUUID()}`

  await client.query(
    `
      INSERT INTO greenhouse_hr.onboarding_instances (
        instance_id, template_id, member_id, offboarding_case_id, instance_type,
        start_date, source, source_ref, created_by_user_id, updated_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8::jsonb, $9, $9)
    `,
    [
      instanceId,
      templateRow.template_id,
      input.memberId,
      input.offboardingCaseId ?? null,
      type,
      startDate,
      input.source ?? 'manual_hr',
      JSON.stringify(input.sourceRef ?? {}),
      actorUserId ?? null
    ]
  )

  const itemRows = await client.query<Row>(
    `
      SELECT *
      FROM greenhouse_hr.onboarding_template_items
      WHERE template_id = $1
      ORDER BY display_order, created_at
    `,
    [templateRow.template_id]
  )

  for (const item of itemRows.rows) {
    await client.query(
      `
        INSERT INTO greenhouse_hr.onboarding_instance_items (
          instance_item_id, instance_id, template_item_id, item_title_snapshot,
          item_description_snapshot, assigned_role_snapshot, due_date,
          required_snapshot, display_order_snapshot, metadata_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10::jsonb)
      `,
      [
        `onboarding-instance-item-${randomUUID()}`,
        instanceId,
        item.item_id,
        item.item_title,
        item.item_description,
        item.assigned_role,
        addDays(startDate, Number(item.due_days_offset ?? 0)),
        item.required,
        item.display_order,
        JSON.stringify(toJsonRecord(item.metadata_json))
      ]
    )
  }

  const created = await getOnboardingInstance(instanceId, client)

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.onboardingInstance,
    aggregateId: instanceId,
    eventType: type === 'onboarding' ? EVENT_TYPES.hrOnboardingInstanceCreated : EVENT_TYPES.hrOffboardingInstanceCreated,
    payload: {
      instanceId,
      memberId: input.memberId,
      instanceType: type,
      offboardingCaseId: input.offboardingCaseId ?? null,
      source: input.source ?? 'manual_hr'
    }
  }, client)

  return created
})

const maybeCompleteInstance = async (client: PoolClient, instanceId: string, actorUserId?: string | null) => {
  const rows = await client.query<Row>(
    `
      SELECT
        COUNT(*) FILTER (WHERE required_snapshot = TRUE) AS required_count,
        COUNT(*) FILTER (
          WHERE required_snapshot = TRUE
            AND status IN ('done', 'skipped')
        ) AS completed_required_count
      FROM greenhouse_hr.onboarding_instance_items
      WHERE instance_id = $1
    `,
    [instanceId]
  )

  const requiredCount = Number(rows.rows[0]?.required_count ?? 0)
  const completedRequiredCount = Number(rows.rows[0]?.completed_required_count ?? 0)

  if (requiredCount > 0 && requiredCount === completedRequiredCount) {
    const updated = await client.query<Row>(
      `
        UPDATE greenhouse_hr.onboarding_instances
        SET status = 'completed',
            completed_at = NOW(),
            updated_by_user_id = $2
        WHERE instance_id = $1
          AND status = 'active'
        RETURNING instance_type, member_id
      `,
      [instanceId, actorUserId ?? null]
    )

    const row = updated.rows[0]

    if (row) {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.onboardingInstance,
        aggregateId: instanceId,
        eventType: row.instance_type === 'onboarding'
          ? EVENT_TYPES.hrOnboardingInstanceCompleted
          : EVENT_TYPES.hrOffboardingInstanceCompleted,
        payload: {
          instanceId,
          memberId: row.member_id,
          instanceType: row.instance_type
        }
      }, client)
    }
  }
}

export const updateOnboardingInstanceItemStatus = async ({
  instanceId,
  instanceItemId,
  status,
  notes,
  actorUserId,
  actorCanManage = false,
  actorMemberId = null
}: {
  instanceId: string
  instanceItemId: string
  status: HrOnboardingItemStatus
  notes?: string | null
  actorUserId?: string | null
  actorCanManage?: boolean
  actorMemberId?: string | null
}) => withTransaction(async client => {
  const nextStatus = assertEnum(status, HR_ONBOARDING_ITEM_STATUSES, 'status')
  const instance = await getOnboardingInstance(instanceId, client)
  const item = instance.items.find(candidate => candidate.instanceItemId === instanceItemId)

  if (!item) {
    throw new HrCoreValidationError('Onboarding item not found.', 404)
  }

  if (!actorCanManage && (item.assignedRole !== 'collaborator' || instance.memberId !== actorMemberId)) {
    throw new HrCoreValidationError('Only assigned collaborator items can be updated from self-service.', 403)
  }

  await client.query(
    `
      UPDATE greenhouse_hr.onboarding_instance_items
      SET status = $3,
          completed_at = CASE WHEN $3 IN ('done', 'skipped') THEN COALESCE(completed_at, NOW()) ELSE NULL END,
          completed_by_user_id = CASE WHEN $3 IN ('done', 'skipped') THEN $4 ELSE NULL END,
          notes = $5
      WHERE instance_id = $1
        AND instance_item_id = $2
    `,
    [instanceId, instanceItemId, nextStatus, actorUserId ?? null, normalizeNullableString(notes)]
  )

  const eventType = instance.type === 'onboarding'
    ? EVENT_TYPES.hrOnboardingItemCompleted
    : EVENT_TYPES.hrOffboardingItemCompleted

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.onboardingInstance,
    aggregateId: instanceId,
    eventType,
    payload: {
      instanceId,
      instanceItemId,
      memberId: instance.memberId,
      instanceType: instance.type,
      status: nextStatus
    }
  }, client)

  await maybeCompleteInstance(client, instanceId, actorUserId)

  return getOnboardingInstance(instanceId, client)
})

export const cancelOnboardingInstance = async ({
  instanceId,
  reason,
  actorUserId
}: {
  instanceId: string
  reason?: string | null
  actorUserId?: string | null
}) => withTransaction(async client => {
  const instance = await getOnboardingInstance(instanceId, client)

  if (instance.status !== 'active') {
    throw new HrCoreValidationError('Only active onboarding instances can be cancelled.', 409)
  }

  await client.query(
    `
      UPDATE greenhouse_hr.onboarding_instances
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancellation_reason = $2,
          updated_by_user_id = $3
      WHERE instance_id = $1
    `,
    [instanceId, normalizeNullableString(reason), actorUserId ?? null]
  )

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.onboardingInstance,
    aggregateId: instanceId,
    eventType: instance.type === 'onboarding'
      ? EVENT_TYPES.hrOnboardingInstanceCancelled
      : EVENT_TYPES.hrOffboardingInstanceCancelled,
    payload: {
      instanceId,
      memberId: instance.memberId,
      instanceType: instance.type,
      reason: normalizeNullableString(reason)
    }
  }, client)

  return getOnboardingInstance(instanceId, client)
})

export const assertPositiveDisplayOrder = (value: unknown) => assertPositiveInteger(value, 'displayOrder', { min: 1 })
