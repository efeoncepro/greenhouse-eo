import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { isInternalCommercialAssignment } from '@/lib/team-capacity/internal-assignments'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

type PlacementRow = {
  placement_id: string
  public_id: string | null
  assignment_id: string
  client_id: string
  client_name: string | null
  space_id: string | null
  space_name: string | null
  organization_id: string | null
  organization_name: string | null
  member_id: string
  member_name: string | null
  provider_id: string | null
  provider_name: string | null
  business_unit: string
  status: string
  lifecycle_stage: string
  provider_relationship_type: string
  pay_regime_snapshot: string | null
  contract_type_snapshot: string | null
  compensation_version_id_snapshot: string | null
  cost_rate_amount: string | number | null
  cost_rate_currency: string | null
  cost_rate_source: string
  billing_rate_amount: string | number | null
  billing_rate_currency: string | null
  billing_frequency: string | null
  external_contract_ref: string | null
  legal_entity: string | null
  contractor_country: string | null
  client_reporting_to: string | null
  client_communication_channel: string | null
  client_tools: string[] | null
  required_skills: string[] | null
  matched_skills: string[] | null
  placement_notes: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  actual_end_date: string | null
  renewal_alert_days: number | string | null
  sla_availability_percent: number | string | null
  sla_response_hours: number | string | null
  sla_notice_period_days: number | string | null
  latest_snapshot_id: string | null
  created_by_user_id: string | null
  updated_by_user_id: string | null
  created_at: string | Date
  updated_at: string | Date
}

type AssignmentContextRow = {
  assignment_id: string
  client_id: string
  client_name: string | null
  member_id: string
  member_name: string | null
  space_id: string | null
  space_name: string | null
  organization_id: string | null
  organization_name: string | null
}

type CompensationSnapshotRow = {
  version_id: string
  pay_regime: string | null
  contract_type: string | null
  currency: string | null
  base_salary: string | number | null
}

type PlacementOptionRow = {
  assignment_id: string
  client_id: string | null
  client_name: string | null
  member_id: string
  member_name: string | null
  space_id: string | null
  space_name: string | null
  organization_id: string | null
  organization_name: string | null
  assignment_type: string | null
  placement_id: string | null
  placement_status: string | null
  compensation_version_id: string | null
  pay_regime: string | null
  contract_type: string | null
  cost_rate_amount: string | number | null
  cost_rate_currency: string | null
}

type EventRow = {
  staff_aug_event_id: string
  event_type: string
  event_data: Record<string, unknown> | null
  description: string | null
  created_by_user_id: string | null
  created_at: string | Date
}

type OnboardingItemRow = {
  onboarding_item_id: string
  item_key: string
  item_label: string
  category: string
  status: string
  sort_order: number | string
  blocker_note: string | null
  verified_at: string | Date | null
  verified_by_user_id: string | null
  created_at: string | Date
  updated_at: string | Date
}

const STAFF_AUG_MODULE_CODE = 'staff_augmentation'

const DEFAULT_ONBOARDING_TEMPLATE = [
  { itemKey: 'contract_validated', itemLabel: 'Validar contrato y alcance comercial', category: 'contract', sortOrder: 10 },
  { itemKey: 'client_access', itemLabel: 'Configurar accesos del cliente', category: 'access', sortOrder: 20 },
  { itemKey: 'tooling_ready', itemLabel: 'Confirmar stack y herramientas de trabajo', category: 'tooling', sortOrder: 30 },
  { itemKey: 'kickoff_scheduled', itemLabel: 'Agendar kickoff con cliente', category: 'operations', sortOrder: 40 },
  { itemKey: 'payroll_finance_ready', itemLabel: 'Verificar costo y cobertura Finance/Payroll', category: 'finance', sortOrder: 50 }
] as const

const BUSINESS_UNITS = new Set(['globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions'])
const BILLING_FREQUENCIES = new Set(['monthly', 'quarterly', 'annual'])
const STATUSES = new Set(['pipeline', 'onboarding', 'active', 'renewal_pending', 'renewed', 'ended'])
const LIFECYCLE_STAGES = new Set(['draft', 'contracting', 'client_setup', 'live', 'closed'])
const PROVIDER_REL_TYPES = new Set(['direct', 'eor', 'staffing_partner', 'other'])
const COST_RATE_SOURCES = new Set(['payroll_snapshot', 'manual'])

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown) => {
  if (value == null || value === '') return null

  return toNumber(value)
}

const toString = (value: unknown) => (typeof value === 'string' ? value.trim() || null : null)

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean)
    : []

const toTimestamp = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const toDateString = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const getCurrentDateInSantiago = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

const buildPlacementPublicId = () => `EO-PLC-${randomUUID().slice(0, 8).toUpperCase()}`

const ensureEnum = (value: unknown, allowed: Set<string>, fallback: string, label: string) => {
  const normalized = String(value || fallback).trim().toLowerCase() || fallback

  if (!allowed.has(normalized)) {
    throw new Error(`${label} is invalid.`)
  }

  return normalized
}

const loadAssignmentContext = async (assignmentId: string) => {
  const rows = await runGreenhousePostgresQuery<AssignmentContextRow>(
    `
      SELECT
        a.assignment_id,
        a.client_id,
        c.client_name,
        a.member_id,
        m.display_name AS member_name,
        s.space_id,
        s.space_name,
        s.organization_id,
        o.organization_name
      FROM greenhouse_core.client_team_assignments a
      INNER JOIN greenhouse_core.clients c ON c.client_id = a.client_id
      INNER JOIN greenhouse_core.members m ON m.member_id = a.member_id
      LEFT JOIN greenhouse_core.spaces s ON s.client_id = a.client_id AND s.active = TRUE
      LEFT JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
      WHERE a.assignment_id = $1
      LIMIT 1
    `,
    [assignmentId]
  )

  return rows[0] ?? null
}

const loadCompensationSnapshot = async (memberId: string, date: string) => {
  const rows = await runGreenhousePostgresQuery<CompensationSnapshotRow>(
    `
      SELECT version_id, pay_regime, contract_type, currency, base_salary
      FROM greenhouse_payroll.compensation_versions
      WHERE member_id = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to >= $2::date)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
    [memberId, date]
  ).catch(() => [])

  return rows[0] ?? null
}

export type StaffAugPlacementOption = {
  assignmentId: string
  clientId: string | null
  clientName: string | null
  memberId: string
  memberName: string | null
  spaceId: string | null
  spaceName: string | null
  organizationId: string | null
  organizationName: string | null
  assignmentType: string
  placementId: string | null
  placementStatus: string | null
  compensationVersionId: string | null
  payRegime: string | null
  contractType: string | null
  label: string
  compensation: {
    payRegime: string | null
    contractType: string | null
    costRateAmount: number | null
    costRateCurrency: string | null
  }
}

const normalizePlacementOption = (row: PlacementOptionRow): StaffAugPlacementOption => ({
  assignmentId: row.assignment_id,
  clientId: row.client_id,
  clientName: row.client_name,
  memberId: row.member_id,
  memberName: row.member_name,
  spaceId: row.space_id,
  spaceName: row.space_name,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  assignmentType: String(row.assignment_type || 'internal'),
  placementId: row.placement_id,
  placementStatus: row.placement_status,
  compensationVersionId: row.compensation_version_id,
  payRegime: row.pay_regime,
  contractType: row.contract_type,
  label: `${row.member_name || row.member_id} · ${row.client_name || row.client_id || 'Cliente'}`,
  compensation: {
    payRegime: row.pay_regime,
    contractType: row.contract_type,
    costRateAmount: toNullableNumber(row.cost_rate_amount),
    costRateCurrency: row.cost_rate_currency
  }
})

type ListStaffAugPlacementOptionsInput = {
  search?: string
  assignmentId?: string | null
  limit?: number
}

export const listStaffAugPlacementOptions = async ({
  search,
  assignmentId,
  limit = 20
}: ListStaffAugPlacementOptionsInput = {}) => {
  const trimmedSearch = search?.trim() || ''
  const trimmedAssignmentId = assignmentId?.trim() || ''
  const params: unknown[] = []

  const filters = [
    'a.active = TRUE',
    '(a.end_date IS NULL OR a.end_date >= CURRENT_DATE)',
    'm.active = TRUE',
    'COALESCE(m.assignable, TRUE) = TRUE',
    'placement.placement_id IS NULL'
  ]

  if (trimmedAssignmentId) {
    params.push(trimmedAssignmentId)
    filters.push(`a.assignment_id = $${params.length}`)
  } else if (trimmedSearch) {
    params.push(`%${trimmedSearch}%`)
    filters.push(`(
      m.display_name ILIKE $${params.length}
      OR c.client_name ILIKE $${params.length}
      OR o.organization_name ILIKE $${params.length}
      OR a.assignment_id ILIKE $${params.length}
    )`)
  }

  params.push(Math.min(Math.max(limit, 1), 50))
  const limitParam = `$${params.length}`

  const rows = await runGreenhousePostgresQuery<PlacementOptionRow>(
    `
      SELECT
        a.assignment_id,
        a.client_id,
        c.client_name,
        a.member_id,
        m.display_name AS member_name,
        s.space_id,
        s.space_name,
        s.organization_id,
        o.organization_name,
        a.assignment_type,
        placement.placement_id,
        placement.status AS placement_status,
        comp.version_id AS compensation_version_id,
        comp.pay_regime,
        comp.contract_type,
        comp.base_salary AS cost_rate_amount,
        comp.currency AS cost_rate_currency
      FROM greenhouse_core.client_team_assignments a
      INNER JOIN greenhouse_core.members m ON m.member_id = a.member_id
      LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
      LEFT JOIN greenhouse_delivery.staff_aug_placements placement ON placement.assignment_id = a.assignment_id
      LEFT JOIN greenhouse_core.spaces s ON s.client_id = a.client_id AND s.active = TRUE
      LEFT JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
      LEFT JOIN LATERAL (
        SELECT version_id, pay_regime, contract_type, currency, base_salary
        FROM greenhouse_payroll.compensation_versions
        WHERE member_id = a.member_id
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY effective_from DESC
        LIMIT 1
      ) comp ON TRUE
      WHERE a.active = TRUE
        AND ${filters.join('\n        AND ')}
      ORDER BY m.display_name ASC, c.client_name ASC NULLS LAST, a.assignment_id ASC
      LIMIT ${limitParam}
    `,
    params
  ).catch(() => [])

  return rows
    .filter(row => !isInternalCommercialAssignment({ clientId: row.client_id, clientName: row.client_name }))
    .map(normalizePlacementOption)
}

const normalizePlacement = (row: PlacementRow) => ({
  placementId: row.placement_id,
  publicId: row.public_id,
  assignmentId: row.assignment_id,
  clientId: row.client_id,
  clientName: row.client_name,
  spaceId: row.space_id,
  spaceName: row.space_name,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  memberId: row.member_id,
  memberName: row.member_name,
  providerId: row.provider_id,
  providerName: row.provider_name,
  businessUnit: row.business_unit,
  status: row.status,
  lifecycleStage: row.lifecycle_stage,
  providerRelationshipType: row.provider_relationship_type,
  payRegimeSnapshot: row.pay_regime_snapshot,
  contractTypeSnapshot: row.contract_type_snapshot,
  compensationVersionIdSnapshot: row.compensation_version_id_snapshot,
  costRateAmount: toNullableNumber(row.cost_rate_amount),
  costRateCurrency: row.cost_rate_currency,
  costRateSource: row.cost_rate_source,
  billingRateAmount: toNullableNumber(row.billing_rate_amount),
  billingRateCurrency: row.billing_rate_currency,
  billingFrequency: row.billing_frequency,
  externalContractRef: row.external_contract_ref,
  legalEntity: row.legal_entity,
  contractorCountry: row.contractor_country,
  clientReportingTo: row.client_reporting_to,
  clientCommunicationChannel: row.client_communication_channel,
  clientTools: row.client_tools || [],
  requiredSkills: row.required_skills || [],
  matchedSkills: row.matched_skills || [],
  placementNotes: row.placement_notes,
  contractStartDate: toDateString(row.contract_start_date),
  contractEndDate: toDateString(row.contract_end_date),
  actualEndDate: toDateString(row.actual_end_date),
  renewalAlertDays: toNumber(row.renewal_alert_days),
  slaAvailabilityPercent: toNullableNumber(row.sla_availability_percent),
  slaResponseHours: toNullableNumber(row.sla_response_hours),
  slaNoticePeriodDays: toNumber(row.sla_notice_period_days),
  latestSnapshotId: row.latest_snapshot_id,
  createdByUserId: row.created_by_user_id,
  updatedByUserId: row.updated_by_user_id,
  createdAt: toTimestamp(row.created_at) || '',
  updatedAt: toTimestamp(row.updated_at) || ''
})

const listPlacementBaseSql = `
  SELECT
    p.placement_id,
    p.public_id,
    p.assignment_id,
    p.client_id,
    c.client_name,
    p.space_id,
    s.space_name,
    p.organization_id,
    o.organization_name,
    p.member_id,
    m.display_name AS member_name,
    p.provider_id,
    provider.provider_name,
    p.business_unit,
    p.status,
    p.lifecycle_stage,
    p.provider_relationship_type,
    p.pay_regime_snapshot,
    p.contract_type_snapshot,
    p.compensation_version_id_snapshot,
    p.cost_rate_amount,
    p.cost_rate_currency,
    p.cost_rate_source,
    p.billing_rate_amount,
    p.billing_rate_currency,
    p.billing_frequency,
    p.external_contract_ref,
    p.legal_entity,
    p.contractor_country,
    p.client_reporting_to,
    p.client_communication_channel,
    p.client_tools,
    p.required_skills,
    p.matched_skills,
    p.placement_notes,
    p.contract_start_date::text,
    p.contract_end_date::text,
    p.actual_end_date::text,
    p.renewal_alert_days,
    p.sla_availability_percent,
    p.sla_response_hours,
    p.sla_notice_period_days,
    p.latest_snapshot_id,
    p.created_by_user_id,
    p.updated_by_user_id,
    p.created_at,
    p.updated_at
  FROM greenhouse_delivery.staff_aug_placements p
  INNER JOIN greenhouse_core.clients c ON c.client_id = p.client_id
  INNER JOIN greenhouse_core.members m ON m.member_id = p.member_id
  LEFT JOIN greenhouse_core.spaces s ON s.space_id = p.space_id
  LEFT JOIN greenhouse_core.organizations o ON o.organization_id = p.organization_id
  LEFT JOIN greenhouse_core.providers provider ON provider.provider_id = p.provider_id
`

export const listStaffAugPlacements = async ({
  page = 1,
  pageSize = 25,
  search,
  status,
  businessUnit
}: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  businessUnit?: string
}) => {
  const values: unknown[] = []
  const clauses: string[] = []

  if (search?.trim()) {
    values.push(`%${search.trim().toLowerCase()}%`)
    clauses.push(`(
      LOWER(COALESCE(c.client_name, '')) LIKE $${values.length}
      OR LOWER(COALESCE(m.display_name, '')) LIKE $${values.length}
      OR LOWER(COALESCE(p.public_id, p.placement_id)) LIKE $${values.length}
    )`)
  }

  if (status?.trim()) {
    values.push(status.trim().toLowerCase())
    clauses.push(`p.status = $${values.length}`)
  }

  if (businessUnit?.trim()) {
    values.push(businessUnit.trim().toLowerCase())
    clauses.push(`p.business_unit = $${values.length}`)
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const [countRow] = await runGreenhousePostgresQuery<{ total: string | number }>(
    `SELECT COUNT(*) AS total
     FROM greenhouse_delivery.staff_aug_placements p
     INNER JOIN greenhouse_core.clients c ON c.client_id = p.client_id
     INNER JOIN greenhouse_core.members m ON m.member_id = p.member_id
     ${whereSql}`,
    values
  )

  const offset = Math.max(0, page - 1) * Math.max(1, pageSize)
  const listValues = [...values, Math.max(1, pageSize), offset]

  const [summaryRow] = await runGreenhousePostgresQuery<{
    active_count: string | number
    onboarding_count: string | number
    no_snapshot_count: string | number
  }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE p.status = 'active') AS active_count,
        COUNT(*) FILTER (WHERE p.status = 'onboarding') AS onboarding_count,
        COUNT(*) FILTER (WHERE p.latest_snapshot_id IS NULL) AS no_snapshot_count
      FROM greenhouse_delivery.staff_aug_placements p
      INNER JOIN greenhouse_core.clients c ON c.client_id = p.client_id
      INNER JOIN greenhouse_core.members m ON m.member_id = p.member_id
      ${whereSql}
    `,
    values
  )

  const rows = await runGreenhousePostgresQuery<PlacementRow>(
    `
      ${listPlacementBaseSql}
      ${whereSql}
      ORDER BY p.updated_at DESC, p.created_at DESC
      LIMIT $${listValues.length - 1}
      OFFSET $${listValues.length}
    `,
    listValues
  )

  return {
    items: rows.map(normalizePlacement),
    total: toNumber(countRow?.total),
    summary: {
      activeCount: toNumber(summaryRow?.active_count),
      onboardingCount: toNumber(summaryRow?.onboarding_count),
      noSnapshotCount: toNumber(summaryRow?.no_snapshot_count)
    },
    page,
    pageSize
  }
}

const listOnboardingItems = async (placementId: string) => {
  const rows = await runGreenhousePostgresQuery<OnboardingItemRow>(
    `
      SELECT
        onboarding_item_id,
        item_key,
        item_label,
        category,
        status,
        sort_order,
        blocker_note,
        verified_at,
        verified_by_user_id,
        created_at,
        updated_at
      FROM greenhouse_delivery.staff_aug_onboarding_items
      WHERE placement_id = $1
      ORDER BY sort_order ASC, item_label ASC
    `,
    [placementId]
  )

  return rows.map(row => ({
    onboardingItemId: row.onboarding_item_id,
    itemKey: row.item_key,
    itemLabel: row.item_label,
    category: row.category,
    status: row.status,
    sortOrder: toNumber(row.sort_order),
    blockerNote: row.blocker_note,
    verifiedAt: toTimestamp(row.verified_at),
    verifiedByUserId: row.verified_by_user_id,
    createdAt: toTimestamp(row.created_at) || '',
    updatedAt: toTimestamp(row.updated_at) || ''
  }))
}

const listPlacementEvents = async (placementId: string) => {
  const rows = await runGreenhousePostgresQuery<EventRow>(
    `
      SELECT
        staff_aug_event_id,
        event_type,
        event_data,
        description,
        created_by_user_id,
        created_at
      FROM greenhouse_delivery.staff_aug_events
      WHERE placement_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `,
    [placementId]
  )

  return rows.map(row => ({
    staffAugEventId: row.staff_aug_event_id,
    eventType: row.event_type,
    eventData: row.event_data || {},
    description: row.description,
    createdByUserId: row.created_by_user_id,
    createdAt: toTimestamp(row.created_at) || ''
  }))
}

const getLatestPlacementSnapshot = async (placementId: string) => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `
      SELECT
        snapshot_id,
        placement_id,
        period_year,
        period_month,
        period_id,
        placement_status,
        projected_revenue_clp,
        payroll_gross_clp,
        payroll_employer_cost_clp,
        commercial_loaded_cost_clp,
        member_direct_expense_clp,
        tooling_cost_clp,
        gross_margin_proxy_clp,
        gross_margin_proxy_pct,
        provider_tooling_snapshot_id,
        source_compensation_version_id,
        source_payroll_entry_id,
        snapshot_status,
        updated_at::text AS updated_at
      FROM greenhouse_serving.staff_aug_placement_snapshots
      WHERE placement_id = $1
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
    `,
    [placementId]
  ).catch(() => [])

  if (!rows[0]) {
    return null
  }

  return {
    snapshotId: rows[0].snapshot_id,
    placementId: rows[0].placement_id,
    periodYear: toNumber(rows[0].period_year),
    periodMonth: toNumber(rows[0].period_month),
    periodId: String(rows[0].period_id || ''),
    placementStatus: rows[0].placement_status,
    projectedRevenueClp: toNullableNumber(rows[0].projected_revenue_clp),
    payrollGrossClp: toNullableNumber(rows[0].payroll_gross_clp),
    payrollEmployerCostClp: toNullableNumber(rows[0].payroll_employer_cost_clp),
    commercialLoadedCostClp: toNullableNumber(rows[0].commercial_loaded_cost_clp),
    memberDirectExpenseClp: toNullableNumber(rows[0].member_direct_expense_clp),
    toolingCostClp: toNullableNumber(rows[0].tooling_cost_clp),
    grossMarginProxyClp: toNullableNumber(rows[0].gross_margin_proxy_clp),
    grossMarginProxyPct: toNullableNumber(rows[0].gross_margin_proxy_pct),
    providerToolingSnapshotId: typeof rows[0].provider_tooling_snapshot_id === 'string' ? rows[0].provider_tooling_snapshot_id : null,
    sourceCompensationVersionId: typeof rows[0].source_compensation_version_id === 'string' ? rows[0].source_compensation_version_id : null,
    sourcePayrollEntryId: typeof rows[0].source_payroll_entry_id === 'string' ? rows[0].source_payroll_entry_id : null,
    snapshotStatus: typeof rows[0].snapshot_status === 'string' ? rows[0].snapshot_status : null,
    updatedAt: typeof rows[0].updated_at === 'string' ? rows[0].updated_at : null
  }
}

export const getStaffAugPlacementDetail = async (placementId: string) => {
  const rows = await runGreenhousePostgresQuery<PlacementRow>(
    `${listPlacementBaseSql} WHERE p.placement_id = $1 LIMIT 1`,
    [placementId]
  )

  const row = rows[0]

  if (!row) return null

  const [onboardingItems, events, latestSnapshot] = await Promise.all([
    listOnboardingItems(placementId),
    listPlacementEvents(placementId),
    getLatestPlacementSnapshot(placementId)
  ])

  return {
    ...normalizePlacement(row),
    onboardingItems,
    events,
    latestSnapshot
  }
}

async function getStaffAugPlacementDetailByAssignment(assignmentId: string) {
  const rows = await runGreenhousePostgresQuery<{ placement_id: string }>(
    `SELECT placement_id
     FROM greenhouse_delivery.staff_aug_placements
     WHERE assignment_id = $1
     LIMIT 1`,
    [assignmentId]
  )

  return rows[0]?.placement_id ? getStaffAugPlacementDetail(rows[0].placement_id) : null
}

const writePlacementEvent = async ({
  placementId,
  eventType,
  actorUserId,
  description,
  eventData,
  client
}: {
  placementId: string
  eventType: string
  actorUserId: string | null
  description: string | null
  eventData: Record<string, unknown>
  client: { query: (text: string, values?: unknown[]) => Promise<unknown> }
}) => {
  await client.query(
    `
      INSERT INTO greenhouse_delivery.staff_aug_events (
        staff_aug_event_id,
        placement_id,
        event_type,
        event_data,
        description,
        created_by_user_id,
        created_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, CURRENT_TIMESTAMP)
    `,
    [`staff-aug-event-${randomUUID()}`, placementId, eventType, JSON.stringify(eventData), description, actorUserId]
  )
}

type CreateStaffAugPlacementInput = {
  assignmentId: string
  businessUnit: string
  providerId?: string | null
  providerRelationshipType?: string | null
  status?: string | null
  lifecycleStage?: string | null
  billingRateAmount?: number | null
  billingRateCurrency?: string | null
  billingFrequency?: string | null
  costRateAmount?: number | null
  costRateCurrency?: string | null
  externalContractRef?: string | null
  legalEntity?: string | null
  contractorCountry?: string | null
  clientReportingTo?: string | null
  clientCommunicationChannel?: string | null
  clientTools?: string[]
  requiredSkills?: string[]
  matchedSkills?: string[]
  placementNotes?: string | null
  contractStartDate?: string | null
  contractEndDate?: string | null
  renewalAlertDays?: number | null
  slaAvailabilityPercent?: number | null
  slaResponseHours?: number | null
  slaNoticePeriodDays?: number | null
}

export const createStaffAugPlacement = async (input: CreateStaffAugPlacementInput, actorUserId: string) => {
  const assignmentId = String(input.assignmentId || '').trim()

  if (!assignmentId) {
    throw new Error('assignmentId is required.')
  }

  const assignment = await loadAssignmentContext(assignmentId)

  if (!assignment) {
    throw new Error('Assignment not found.')
  }

  const existingPlacement = await getStaffAugPlacementDetailByAssignment(assignmentId)

  if (existingPlacement) {
    throw new Error('Assignment already has a staff augmentation placement.')
  }

  const businessUnit = ensureEnum(input.businessUnit, BUSINESS_UNITS, 'reach', 'businessUnit')
  const status = ensureEnum(input.status, STATUSES, 'pipeline', 'status')
  const lifecycleStage = ensureEnum(input.lifecycleStage, LIFECYCLE_STAGES, 'draft', 'lifecycleStage')
  const providerRelationshipType = ensureEnum(input.providerRelationshipType, PROVIDER_REL_TYPES, 'direct', 'providerRelationshipType')
  const billingFrequency = ensureEnum(input.billingFrequency, BILLING_FREQUENCIES, 'monthly', 'billingFrequency')
  const snapshotDate = toString(input.contractStartDate) || getCurrentDateInSantiago()
  const comp = await loadCompensationSnapshot(assignment.member_id, snapshotDate)
  const placementId = `placement-${randomUUID()}`
  const publicId = buildPlacementPublicId()

  const placementPayload = {
    placementId,
    publicId,
    assignmentId,
    clientId: assignment.client_id,
    spaceId: assignment.space_id,
    organizationId: assignment.organization_id,
    memberId: assignment.member_id,
    providerId: toString(input.providerId),
    businessUnit,
    status,
    lifecycleStage,
    providerRelationshipType,
    payRegimeSnapshot: comp?.pay_regime || null,
    contractTypeSnapshot: comp?.contract_type || null,
    compensationVersionIdSnapshot: comp?.version_id || null,
    costRateAmount: input.costRateAmount ?? toNullableNumber(comp?.base_salary),
    costRateCurrency: toString(input.costRateCurrency) || comp?.currency || null,
    costRateSource: input.costRateAmount != null ? 'manual' : 'payroll_snapshot',
    billingRateAmount: input.billingRateAmount ?? null,
    billingRateCurrency: toString(input.billingRateCurrency) || 'USD',
    billingFrequency,
    externalContractRef: toString(input.externalContractRef),
    legalEntity: toString(input.legalEntity),
    contractorCountry: toString(input.contractorCountry),
    clientReportingTo: toString(input.clientReportingTo),
    clientCommunicationChannel: toString(input.clientCommunicationChannel),
    clientTools: toStringArray(input.clientTools),
    requiredSkills: toStringArray(input.requiredSkills),
    matchedSkills: toStringArray(input.matchedSkills),
    placementNotes: toString(input.placementNotes),
    contractStartDate: toString(input.contractStartDate),
    contractEndDate: toString(input.contractEndDate),
    renewalAlertDays: input.renewalAlertDays ?? 60,
    slaAvailabilityPercent: input.slaAvailabilityPercent ?? null,
    slaResponseHours: input.slaResponseHours ?? null,
    slaNoticePeriodDays: input.slaNoticePeriodDays ?? 30,
    actorUserId
  }

  await withGreenhousePostgresTransaction(async client => {
    await client.query(
      `
        UPDATE greenhouse_core.client_team_assignments
        SET assignment_type = 'staff_augmentation', updated_at = CURRENT_TIMESTAMP
        WHERE assignment_id = $1
      `,
      [assignmentId]
    )

    await client.query(
      `
        INSERT INTO greenhouse_delivery.staff_aug_placements (
          placement_id,
          public_id,
          assignment_id,
          client_id,
          space_id,
          organization_id,
          member_id,
          provider_id,
          service_module_assignment_id,
          business_unit,
          status,
          lifecycle_stage,
          provider_relationship_type,
          pay_regime_snapshot,
          contract_type_snapshot,
          compensation_version_id_snapshot,
          cost_rate_amount,
          cost_rate_currency,
          cost_rate_source,
          billing_rate_amount,
          billing_rate_currency,
          billing_frequency,
          external_contract_ref,
          legal_entity,
          contractor_country,
          client_reporting_to,
          client_communication_channel,
          client_tools,
          required_skills,
          matched_skills,
          placement_notes,
          contract_start_date,
          contract_end_date,
          renewal_alert_days,
          sla_availability_percent,
          sla_response_hours,
          sla_notice_period_days,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          (
            SELECT csm.assignment_id
            FROM greenhouse_core.client_service_modules csm
            INNER JOIN greenhouse_core.service_modules sm ON sm.module_id = csm.module_id
            WHERE csm.client_id = $4
              AND csm.active = TRUE
              AND sm.module_code = $9
            ORDER BY csm.updated_at DESC NULLS LAST, csm.created_at DESC
            LIMIT 1
          ),
          $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28, $29, $30, $31, $32::date, $33::date, $34, $35, $36, $37,
          $38, $38, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `,
      [
        placementPayload.placementId,
        placementPayload.publicId,
        placementPayload.assignmentId,
        placementPayload.clientId,
        placementPayload.spaceId,
        placementPayload.organizationId,
        placementPayload.memberId,
        placementPayload.providerId,
        STAFF_AUG_MODULE_CODE,
        placementPayload.businessUnit,
        placementPayload.status,
        placementPayload.lifecycleStage,
        placementPayload.providerRelationshipType,
        placementPayload.payRegimeSnapshot,
        placementPayload.contractTypeSnapshot,
        placementPayload.compensationVersionIdSnapshot,
        placementPayload.costRateAmount,
        placementPayload.costRateCurrency,
        placementPayload.costRateSource,
        placementPayload.billingRateAmount,
        placementPayload.billingRateCurrency,
        placementPayload.billingFrequency,
        placementPayload.externalContractRef,
        placementPayload.legalEntity,
        placementPayload.contractorCountry,
        placementPayload.clientReportingTo,
        placementPayload.clientCommunicationChannel,
        placementPayload.clientTools,
        placementPayload.requiredSkills,
        placementPayload.matchedSkills,
        placementPayload.placementNotes,
        placementPayload.contractStartDate,
        placementPayload.contractEndDate,
        placementPayload.renewalAlertDays,
        placementPayload.slaAvailabilityPercent,
        placementPayload.slaResponseHours,
        placementPayload.slaNoticePeriodDays,
        placementPayload.actorUserId
      ]
    )

    for (const item of DEFAULT_ONBOARDING_TEMPLATE) {
      await client.query(
        `
          INSERT INTO greenhouse_delivery.staff_aug_onboarding_items (
            onboarding_item_id,
            placement_id,
            item_key,
            item_label,
            category,
            status,
            sort_order,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, 'pending', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [`placement-onboarding-${randomUUID()}`, placementId, item.itemKey, item.itemLabel, item.category, item.sortOrder]
      )
    }

    await writePlacementEvent({
      placementId,
      eventType: EVENT_TYPES.staffAugPlacementCreated,
      actorUserId,
      description: `Placement created for ${assignment.member_name || assignment.member_id}`,
      eventData: {
        assignmentId,
        clientId: assignment.client_id,
        memberId: assignment.member_id,
        businessUnit,
        status
      },
      client
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.staffAugPlacement,
        aggregateId: placementId,
        eventType: EVENT_TYPES.staffAugPlacementCreated,
        payload: {
          placementId,
          assignmentId,
          clientId: assignment.client_id,
          memberId: assignment.member_id,
          providerId: placementPayload.providerId,
          businessUnit,
          status,
          billingRateAmount: placementPayload.billingRateAmount,
          billingRateCurrency: placementPayload.billingRateCurrency,
          contractStartDate: placementPayload.contractStartDate,
          contractEndDate: placementPayload.contractEndDate
        }
      },
      client
    )
  })

  return getStaffAugPlacementDetail(placementId)
}

type UpdateStaffAugPlacementInput = Partial<Omit<CreateStaffAugPlacementInput, 'assignmentId' | 'businessUnit'>> & {
  businessUnit?: string
  actualEndDate?: string | null
  costRateSource?: string | null
}

export const updateStaffAugPlacement = async (
  placementId: string,
  input: UpdateStaffAugPlacementInput,
  actorUserId: string
) => {
  const current = await getStaffAugPlacementDetail(placementId)

  if (!current) {
    throw new Error('Placement not found.')
  }

  const updates: Array<{ column: string; value: unknown }> = []

  const setIfDefined = (column: string, value: unknown) => {
    if (value !== undefined) {
      updates.push({ column, value })
    }
  }

  if (input.businessUnit !== undefined) setIfDefined('business_unit', ensureEnum(input.businessUnit, BUSINESS_UNITS, current.businessUnit, 'businessUnit'))
  if (input.providerId !== undefined) setIfDefined('provider_id', toString(input.providerId))
  if (input.providerRelationshipType !== undefined) setIfDefined('provider_relationship_type', ensureEnum(input.providerRelationshipType, PROVIDER_REL_TYPES, current.providerRelationshipType, 'providerRelationshipType'))
  if (input.status !== undefined) setIfDefined('status', ensureEnum(input.status, STATUSES, current.status, 'status'))
  if (input.lifecycleStage !== undefined) setIfDefined('lifecycle_stage', ensureEnum(input.lifecycleStage, LIFECYCLE_STAGES, current.lifecycleStage, 'lifecycleStage'))
  if (input.billingRateAmount !== undefined) setIfDefined('billing_rate_amount', input.billingRateAmount)
  if (input.billingRateCurrency !== undefined) setIfDefined('billing_rate_currency', toString(input.billingRateCurrency))
  if (input.billingFrequency !== undefined) setIfDefined('billing_frequency', ensureEnum(input.billingFrequency, BILLING_FREQUENCIES, current.billingFrequency || 'monthly', 'billingFrequency'))
  if (input.costRateAmount !== undefined) setIfDefined('cost_rate_amount', input.costRateAmount)
  if (input.costRateCurrency !== undefined) setIfDefined('cost_rate_currency', toString(input.costRateCurrency))
  if (input.costRateSource !== undefined) setIfDefined('cost_rate_source', ensureEnum(input.costRateSource, COST_RATE_SOURCES, current.costRateSource, 'costRateSource'))
  if (input.externalContractRef !== undefined) setIfDefined('external_contract_ref', toString(input.externalContractRef))
  if (input.legalEntity !== undefined) setIfDefined('legal_entity', toString(input.legalEntity))
  if (input.contractorCountry !== undefined) setIfDefined('contractor_country', toString(input.contractorCountry))
  if (input.clientReportingTo !== undefined) setIfDefined('client_reporting_to', toString(input.clientReportingTo))
  if (input.clientCommunicationChannel !== undefined) setIfDefined('client_communication_channel', toString(input.clientCommunicationChannel))
  if (input.clientTools !== undefined) setIfDefined('client_tools', toStringArray(input.clientTools))
  if (input.requiredSkills !== undefined) setIfDefined('required_skills', toStringArray(input.requiredSkills))
  if (input.matchedSkills !== undefined) setIfDefined('matched_skills', toStringArray(input.matchedSkills))
  if (input.placementNotes !== undefined) setIfDefined('placement_notes', toString(input.placementNotes))
  if (input.contractStartDate !== undefined) setIfDefined('contract_start_date', toString(input.contractStartDate))
  if (input.contractEndDate !== undefined) setIfDefined('contract_end_date', toString(input.contractEndDate))
  if (input.actualEndDate !== undefined) setIfDefined('actual_end_date', toString(input.actualEndDate))
  if (input.renewalAlertDays !== undefined) setIfDefined('renewal_alert_days', input.renewalAlertDays)
  if (input.slaAvailabilityPercent !== undefined) setIfDefined('sla_availability_percent', input.slaAvailabilityPercent)
  if (input.slaResponseHours !== undefined) setIfDefined('sla_response_hours', input.slaResponseHours)
  if (input.slaNoticePeriodDays !== undefined) setIfDefined('sla_notice_period_days', input.slaNoticePeriodDays)

  if (updates.length === 0) {
    return current
  }

  await withGreenhousePostgresTransaction(async client => {
    const assignments = updates.map((entry, index) => `${entry.column} = $${index + 1}`)
    const values = updates.map(entry => entry.value)

    assignments.push(`updated_by_user_id = $${values.length + 1}`)
    values.push(actorUserId)
    assignments.push('updated_at = CURRENT_TIMESTAMP')
    values.push(placementId)

    await client.query(
      `UPDATE greenhouse_delivery.staff_aug_placements
       SET ${assignments.join(', ')}
       WHERE placement_id = $${values.length}`,
      values
    )

    const changedFields = updates.map(entry => entry.column)
    const nextStatus = updates.find(entry => entry.column === 'status')?.value
    const normalizedStatus = typeof nextStatus === 'string' ? nextStatus : null

    await writePlacementEvent({
      placementId,
      eventType: EVENT_TYPES.staffAugPlacementUpdated,
      actorUserId,
      description: 'Placement updated',
      eventData: { changedFields },
      client
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.staffAugPlacement,
        aggregateId: placementId,
        eventType: EVENT_TYPES.staffAugPlacementUpdated,
        payload: {
          placementId,
          assignmentId: current.assignmentId,
          clientId: current.clientId,
          memberId: current.memberId,
          providerId: current.providerId,
          updatedFields: changedFields
        }
      },
      client
    )

    if (normalizedStatus && normalizedStatus !== current.status) {
      await writePlacementEvent({
        placementId,
        eventType: EVENT_TYPES.staffAugPlacementStatusChanged,
        actorUserId,
        description: `Placement status changed to ${normalizedStatus}`,
        eventData: { previousStatus: current.status, nextStatus: normalizedStatus },
        client
      })

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.staffAugPlacement,
          aggregateId: placementId,
          eventType: EVENT_TYPES.staffAugPlacementStatusChanged,
          payload: {
            placementId,
            assignmentId: current.assignmentId,
            clientId: current.clientId,
            memberId: current.memberId,
            previousStatus: current.status,
            nextStatus: normalizedStatus
          }
        },
        client
      )
    }
  })

  return getStaffAugPlacementDetail(placementId)
}

export const updateStaffAugOnboardingItem = async (
  placementId: string,
  onboardingItemId: string,
  input: {
    status?: string
    blockerNote?: string | null
  },
  actorUserId: string
) => {
  const status = input.status ? ensureEnum(input.status, new Set(['pending', 'blocked', 'in_progress', 'done']), 'pending', 'status') : undefined
  const blockerNote = input.blockerNote !== undefined ? toString(input.blockerNote) : undefined
  const updates: string[] = []
  const values: unknown[] = []

  if (status !== undefined) {
    values.push(status)
    updates.push(`status = $${values.length}`)
  }

  if (blockerNote !== undefined) {
    values.push(blockerNote)
    updates.push(`blocker_note = $${values.length}`)
  }

  if (status === 'done') {
    updates.push('verified_at = CURRENT_TIMESTAMP')
    values.push(actorUserId)
    updates.push(`verified_by_user_id = $${values.length}`)
  } else if (status !== undefined) {
    updates.push('verified_at = NULL')
    updates.push('verified_by_user_id = NULL')
  }

  if (updates.length === 0) {
    return listOnboardingItems(placementId)
  }

  await withGreenhousePostgresTransaction(async client => {
    values.push(onboardingItemId, placementId)
    await client.query(
      `
        UPDATE greenhouse_delivery.staff_aug_onboarding_items
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE onboarding_item_id = $${values.length - 1}
          AND placement_id = $${values.length}
      `,
      values
    )

    await writePlacementEvent({
      placementId,
      eventType: EVENT_TYPES.staffAugOnboardingItemUpdated,
      actorUserId,
      description: 'Onboarding item updated',
      eventData: { onboardingItemId, status, blockerNote },
      client
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.staffAugOnboardingItem,
        aggregateId: onboardingItemId,
        eventType: EVENT_TYPES.staffAugOnboardingItemUpdated,
        payload: {
          placementId,
          onboardingItemId,
          status,
          blockerNote
        }
      },
      client
    )
  })

  return listOnboardingItems(placementId)
}
