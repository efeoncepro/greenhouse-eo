import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { generateServiceId, nextPublicId } from '@/lib/account-360/id-generation'

// ── Types ───────────────────────────────────────────────────────────────

export interface ServiceListItem {
  serviceId: string
  publicId: string | null
  name: string
  spaceId: string
  spaceName: string | null
  organizationId: string | null
  organizationName: string | null
  pipelineStage: string
  lineaDeServicio: string
  servicioEspecifico: string
  modalidad: string | null
  billingFrequency: string | null
  country: string | null
  totalCost: number | null
  amountPaid: number | null
  currency: string
  startDate: string | null
  targetEndDate: string | null
  hubspotServiceId: string | null
  active: boolean
  status: string
  createdAt: string
  updatedAt: string
}

export interface ServiceDetail extends ServiceListItem {
  hubspotCompanyId: string | null
  hubspotDealId: string | null
  notionProjectId: string | null
  hubspotLastSyncedAt: string | null
  hubspotSyncStatus: string | null
  createdBy: string | null
  updatedBy: string | null
  history: ServiceHistoryEntry[]
}

export interface ServiceHistoryEntry {
  historyId: string
  fieldChanged: string
  oldValue: string | null
  newValue: string | null
  changedBy: string | null
  changedAt: string
}

export interface CreateServiceInput {
  name: string
  spaceId: string
  organizationId?: string
  hubspotCompanyId?: string
  hubspotDealId?: string
  lineaDeServicio: string
  servicioEspecifico: string
  pipelineStage?: string
  startDate?: string
  targetEndDate?: string
  totalCost?: number
  currency?: string
  modalidad?: string
  billingFrequency?: string
  country?: string
  notionProjectId?: string
  createdBy?: string
}

// ── Row types ───────────────────────────────────────────────────────────

interface ServiceListRow extends Record<string, unknown> {
  service_id: string
  public_id: string | null
  name: string
  space_id: string
  space_name: string | null
  organization_id: string | null
  organization_name: string | null
  pipeline_stage: string
  linea_de_servicio: string
  servicio_especifico: string
  modalidad: string | null
  billing_frequency: string | null
  country: string | null
  total_cost: string | number | null
  amount_paid: string | number | null
  currency: string
  start_date: Date | string | null
  target_end_date: Date | string | null
  hubspot_service_id: string | null
  active: boolean
  status: string
  created_at: Date | string
  updated_at: Date | string
}

interface ServiceDetailRow extends ServiceListRow {
  hubspot_company_id: string | null
  hubspot_deal_id: string | null
  notion_project_id: string | null
  hubspot_last_synced_at: Date | string | null
  hubspot_sync_status: string | null
  created_by: string | null
  updated_by: string | null
}

interface HistoryRow extends Record<string, unknown> {
  history_id: string
  field_changed: string
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: Date | string
}

interface CountRow extends Record<string, unknown> {
  total: string
}

// ── Normalizers ─────────────────────────────────────────────────────────

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0
  return 0
}

const toNullableNum = (v: unknown): number | null => {
  if (v == null) return null
  const n = toNum(v)
  return n
}

const toTs = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') return v
  return ''
}

const toNullableTs = (v: unknown): string | null => {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') return v
  return null
}

const toDateStr = (v: unknown): string | null => {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'string') return v.slice(0, 10)
  return null
}

const normalizeListItem = (r: ServiceListRow): ServiceListItem => ({
  serviceId: r.service_id,
  publicId: r.public_id,
  name: r.name,
  spaceId: r.space_id,
  spaceName: r.space_name ?? null,
  organizationId: r.organization_id ?? null,
  organizationName: r.organization_name ?? null,
  pipelineStage: r.pipeline_stage,
  lineaDeServicio: r.linea_de_servicio,
  servicioEspecifico: r.servicio_especifico,
  modalidad: r.modalidad ?? null,
  billingFrequency: r.billing_frequency ?? null,
  country: r.country ?? null,
  totalCost: toNullableNum(r.total_cost),
  amountPaid: toNullableNum(r.amount_paid),
  currency: r.currency,
  startDate: toDateStr(r.start_date),
  targetEndDate: toDateStr(r.target_end_date),
  hubspotServiceId: r.hubspot_service_id ?? null,
  active: r.active,
  status: r.status,
  createdAt: toTs(r.created_at),
  updatedAt: toTs(r.updated_at)
})

const normalizeDetail = (r: ServiceDetailRow, history: ServiceHistoryEntry[]): ServiceDetail => ({
  ...normalizeListItem(r),
  hubspotCompanyId: r.hubspot_company_id ?? null,
  hubspotDealId: r.hubspot_deal_id ?? null,
  notionProjectId: r.notion_project_id ?? null,
  hubspotLastSyncedAt: toNullableTs(r.hubspot_last_synced_at),
  hubspotSyncStatus: r.hubspot_sync_status ?? null,
  createdBy: r.created_by ?? null,
  updatedBy: r.updated_by ?? null,
  history
})

const normalizeHistoryEntry = (r: HistoryRow): ServiceHistoryEntry => ({
  historyId: r.history_id,
  fieldChanged: r.field_changed,
  oldValue: r.old_value,
  newValue: r.new_value,
  changedBy: r.changed_by,
  changedAt: toTs(r.changed_at)
})

// ── Shared SQL fragments ────────────────────────────────────────────────

const LIST_COLUMNS = `
  s.service_id, s.public_id, s.name,
  s.space_id, sp.display_name AS space_name,
  s.organization_id, o.organization_name,
  s.pipeline_stage, s.linea_de_servicio, s.servicio_especifico,
  s.modalidad, s.billing_frequency, s.country,
  s.total_cost, s.amount_paid, s.currency,
  s.start_date, s.target_end_date,
  s.hubspot_service_id,
  s.active, s.status, s.created_at, s.updated_at
`

const LIST_JOINS = `
  FROM greenhouse_core.services s
  LEFT JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
  LEFT JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
`

// ── Store functions ─────────────────────────────────────────────────────

export const getServiceList = async (params: {
  page?: number
  pageSize?: number
  search?: string
  spaceId?: string
  organizationId?: string
  lineaDeServicio?: string
  pipelineStage?: string
  activeOnly?: boolean
}) => {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50))
  const offset = (page - 1) * pageSize

  let filters = ''
  const queryParams: unknown[] = []
  let paramIdx = 0

  if (params.search) {
    paramIdx++
    const searchParam = `%${params.search}%`
    filters += ` AND (s.name ILIKE $${paramIdx} OR s.public_id ILIKE $${paramIdx})`
    queryParams.push(searchParam)
  }

  if (params.spaceId) {
    paramIdx++
    filters += ` AND s.space_id = $${paramIdx}`
    queryParams.push(params.spaceId)
  }

  if (params.organizationId) {
    paramIdx++
    filters += ` AND s.organization_id = $${paramIdx}`
    queryParams.push(params.organizationId)
  }

  if (params.lineaDeServicio) {
    paramIdx++
    filters += ` AND s.linea_de_servicio = $${paramIdx}`
    queryParams.push(params.lineaDeServicio)
  }

  if (params.pipelineStage) {
    paramIdx++
    filters += ` AND s.pipeline_stage = $${paramIdx}`
    queryParams.push(params.pipelineStage)
  }

  if (params.activeOnly !== false) {
    filters += ` AND s.active = TRUE`
  }

  const countRows = await runGreenhousePostgresQuery<CountRow>(`
    SELECT COUNT(*)::text AS total
    ${LIST_JOINS}
    WHERE TRUE ${filters}
  `, queryParams)

  const total = toNum(countRows[0]?.total)

  paramIdx++
  const limitParam = paramIdx
  paramIdx++
  const offsetParam = paramIdx

  const rows = await runGreenhousePostgresQuery<ServiceListRow>(`
    SELECT ${LIST_COLUMNS}
    ${LIST_JOINS}
    WHERE TRUE ${filters}
    ORDER BY s.created_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `, [...queryParams, pageSize, offset])

  return {
    items: rows.map(normalizeListItem),
    total,
    page,
    pageSize
  }
}

export const getServiceDetail = async (idOrPublicId: string): Promise<ServiceDetail | null> => {
  const rows = await runGreenhousePostgresQuery<ServiceDetailRow>(`
    SELECT
      ${LIST_COLUMNS},
      s.hubspot_company_id, s.hubspot_deal_id,
      s.notion_project_id,
      s.hubspot_last_synced_at, s.hubspot_sync_status,
      s.created_by, s.updated_by
    ${LIST_JOINS}
    WHERE s.service_id = $1 OR s.public_id = $1
    LIMIT 1
  `, [idOrPublicId])

  if (rows.length === 0) return null

  const historyRows = await runGreenhousePostgresQuery<HistoryRow>(`
    SELECT history_id, field_changed, old_value, new_value, changed_by, changed_at
    FROM greenhouse_core.service_history
    WHERE service_id = $1
    ORDER BY changed_at DESC
    LIMIT 50
  `, [rows[0].service_id])

  return normalizeDetail(rows[0], historyRows.map(normalizeHistoryEntry))
}

export const createService = async (input: CreateServiceInput) => {
  const serviceId = generateServiceId()
  const publicId = await nextPublicId('EO-SVC')

  await runGreenhousePostgresQuery(`
    INSERT INTO greenhouse_core.services (
      service_id, public_id, name,
      space_id, organization_id, hubspot_company_id, hubspot_deal_id,
      pipeline_stage,
      linea_de_servicio, servicio_especifico,
      start_date, target_end_date,
      total_cost, currency,
      modalidad, billing_frequency, country,
      notion_project_id,
      active, status, created_by,
      created_at, updated_at
    )
    VALUES (
      $1, $2, $3,
      $4, $5, $6, $7,
      $8,
      $9, $10,
      $11, $12,
      $13, $14,
      $15, $16, $17,
      $18,
      TRUE, 'active', $19,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
    serviceId,
    publicId,
    input.name,
    input.spaceId,
    input.organizationId ?? null,
    input.hubspotCompanyId ?? null,
    input.hubspotDealId ?? null,
    input.pipelineStage ?? 'onboarding',
    input.lineaDeServicio,
    input.servicioEspecifico,
    input.startDate ?? null,
    input.targetEndDate ?? null,
    input.totalCost ?? null,
    input.currency ?? 'CLP',
    input.modalidad ?? 'continua',
    input.billingFrequency ?? 'monthly',
    input.country ?? 'CL',
    input.notionProjectId ?? null,
    input.createdBy ?? null
  ])

  return { serviceId, publicId, created: true }
}

export const updateService = async (
  serviceId: string,
  data: Partial<{
    name: string
    pipelineStage: string
    startDate: string
    targetEndDate: string
    totalCost: number
    amountPaid: number
    currency: string
    modalidad: string
    billingFrequency: string
    country: string
    notionProjectId: string
    hubspotSyncStatus: string
  }>,
  actorUserId?: string
) => {
  // Read current values for history tracking
  const currentRows = await runGreenhousePostgresQuery<Record<string, unknown>>(`
    SELECT name, pipeline_stage, start_date, target_end_date, total_cost,
           amount_paid, currency, modalidad, billing_frequency, country,
           notion_project_id, hubspot_sync_status
    FROM greenhouse_core.services
    WHERE service_id = $1
  `, [serviceId])

  if (currentRows.length === 0) return { updated: false }

  const current = currentRows[0]

  const fieldMap: Record<string, string> = {
    name: 'name',
    pipelineStage: 'pipeline_stage',
    startDate: 'start_date',
    targetEndDate: 'target_end_date',
    totalCost: 'total_cost',
    amountPaid: 'amount_paid',
    currency: 'currency',
    modalidad: 'modalidad',
    billingFrequency: 'billing_frequency',
    country: 'country',
    notionProjectId: 'notion_project_id',
    hubspotSyncStatus: 'hubspot_sync_status'
  }

  const updates: string[] = []
  const params: unknown[] = [serviceId]
  let idx = 1
  const historyInserts: { field: string; oldVal: string | null; newVal: string | null }[] = []

  for (const [key, column] of Object.entries(fieldMap)) {
    const value = data[key as keyof typeof data]
    if (value !== undefined) {
      idx++
      updates.push(`${column} = $${idx}`)
      params.push(value)

      const oldVal = current[column]
      const oldStr = oldVal != null ? String(oldVal) : null
      const newStr = value != null ? String(value) : null

      if (oldStr !== newStr) {
        historyInserts.push({ field: column, oldVal: oldStr, newVal: newStr })
      }
    }
  }

  if (updates.length === 0) return { updated: false }

  if (actorUserId) {
    idx++
    updates.push(`updated_by = $${idx}`)
    params.push(actorUserId)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')

  await runGreenhousePostgresQuery(`
    UPDATE greenhouse_core.services
    SET ${updates.join(', ')}
    WHERE service_id = $1
  `, params)

  // Record history entries for changed fields
  for (const h of historyInserts) {
    const historyId = `sh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    await runGreenhousePostgresQuery(`
      INSERT INTO greenhouse_core.service_history (
        history_id, service_id, field_changed, old_value, new_value, changed_by, changed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [historyId, serviceId, h.field, h.oldVal, h.newVal, actorUserId ?? null])
  }

  return { updated: true }
}

export const deactivateService = async (serviceId: string, actorUserId?: string) => {
  await runGreenhousePostgresQuery(`
    UPDATE greenhouse_core.services
    SET active = FALSE, status = 'inactive', pipeline_stage = 'closed',
        updated_by = $2, updated_at = CURRENT_TIMESTAMP
    WHERE service_id = $1
  `, [serviceId, actorUserId ?? null])

  const historyId = `sh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await runGreenhousePostgresQuery(`
    INSERT INTO greenhouse_core.service_history (
      history_id, service_id, field_changed, old_value, new_value, changed_by, changed_at
    ) VALUES ($1, $2, 'status', 'active', 'inactive', $3, CURRENT_TIMESTAMP)
  `, [historyId, serviceId, actorUserId ?? null])

  return { deactivated: true }
}

export const getServicesBySpace = async (spaceId: string): Promise<ServiceListItem[]> => {
  const rows = await runGreenhousePostgresQuery<ServiceListRow>(`
    SELECT ${LIST_COLUMNS}
    ${LIST_JOINS}
    WHERE s.space_id = $1 AND s.active = TRUE
    ORDER BY s.linea_de_servicio, s.servicio_especifico
  `, [spaceId])

  return rows.map(normalizeListItem)
}

export const getServicesByOrganization = async (organizationId: string): Promise<ServiceListItem[]> => {
  const rows = await runGreenhousePostgresQuery<ServiceListRow>(`
    SELECT ${LIST_COLUMNS}
    ${LIST_JOINS}
    WHERE s.organization_id = $1 AND s.active = TRUE
    ORDER BY s.linea_de_servicio, s.servicio_especifico
  `, [organizationId])

  return rows.map(normalizeListItem)
}
