import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { CapabilityKind, TenantCapabilityRecord, TenantCapabilityState } from '@/lib/admin/tenant-capability-types'

type UpsertAssignmentInput = {
  clientId: string
  hubspotCompanyId: string | null
  moduleCode: string
  sourceSystem: string
  sourceObjectType: string | null
  sourceObjectId: string | null
  sourceClosedwonDealId: string | null
  confidence: string
  active: boolean
  derivedFromLatestClosedwon: boolean
}

type CapabilitySyncInput = {
  clientId: string
  sourceSystem: string
  sourceObjectType: string | null
  sourceObjectId: string | null
  sourceClosedwonDealId: string | null
  confidence: string
  businessLines: string[]
  serviceModules: string[]
  derivedFromLatestClosedwon?: boolean
}

type HubSpotCapabilityDerivation = {
  hubspotCompanyId: string
  latestDealId: string | null
  businessLines: string[]
  serviceModules: string[]
}

const toIsoString = (value: unknown) => {
  if (!value) return null
  if (typeof value === 'string') return value

  if (typeof value === 'object' && value !== null && 'value' in (value as Record<string, unknown>)) {
    const rawValue = (value as { value?: unknown }).value

    return typeof rawValue === 'string' ? rawValue : null
  }

  return null
}

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const unique = (values: string[]) => Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))

const buildAssignmentId = (clientId: string, moduleCode: string) => `client-service-module-${clientId}-${moduleCode}`

const getTenantHubSpotCompanyId = async (clientId: string) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT hubspot_company_id
      FROM \`${projectId}.greenhouse.clients\`
      WHERE client_id = @clientId
      LIMIT 1
    `,
    params: { clientId }
  })

  const row = (rows as Array<Record<string, unknown>>)[0]

  return row?.hubspot_company_id ? String(row.hubspot_company_id) : null
}

export const getTenantCapabilityState = async (clientId: string): Promise<TenantCapabilityState> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      WITH latest_assignments AS (
        SELECT *
        FROM (
          SELECT
            csm.*,
            ROW_NUMBER() OVER (
              PARTITION BY csm.client_id, csm.module_code
              ORDER BY csm.updated_at DESC, csm.created_at DESC
            ) AS rn
          FROM \`${projectId}.greenhouse.client_service_modules\` AS csm
          WHERE csm.client_id = @clientId
        )
        WHERE rn = 1
      )
      SELECT
        @clientId AS client_id,
        client.hubspot_company_id,
        sm.module_code,
        sm.module_label,
        sm.module_kind,
        sm.parent_module_code,
        sm.description,
        COALESCE(la.active, FALSE) AS selected,
        la.source_system,
        la.source_object_type,
        la.source_object_id,
        la.source_closedwon_deal_id,
        la.confidence,
        COALESCE(la.derived_from_latest_closedwon, FALSE) AS derived_from_latest_closedwon,
        la.updated_at
      FROM \`${projectId}.greenhouse.service_modules\` AS sm
      LEFT JOIN latest_assignments AS la
        ON la.module_code = sm.module_code
      LEFT JOIN \`${projectId}.greenhouse.clients\` AS client
        ON client.client_id = @clientId
      WHERE sm.active = TRUE
      ORDER BY sm.sort_order ASC, sm.module_kind ASC, sm.module_label ASC
    `,
    params: { clientId }
  })

  const normalizedRows = rows as Array<Record<string, unknown>>

  const capabilities = normalizedRows.map((row): TenantCapabilityRecord => {
    const moduleKind: CapabilityKind = row.module_kind === 'business_line' ? 'business_line' : 'service_module'

    return {
      moduleCode: String(row.module_code || ''),
      moduleLabel: String(row.module_label || row.module_code || ''),
      moduleKind,
      parentModuleCode: row.parent_module_code ? String(row.parent_module_code) : null,
      description: row.description ? String(row.description) : null,
      selected: Boolean(row.selected),
      assignmentSourceSystem: row.source_system ? String(row.source_system) : null,
      assignmentSourceObjectType: row.source_object_type ? String(row.source_object_type) : null,
      assignmentSourceObjectId: row.source_object_id ? String(row.source_object_id) : null,
      assignmentClosedwonDealId: row.source_closedwon_deal_id ? String(row.source_closedwon_deal_id) : null,
      assignmentConfidence: row.confidence ? String(row.confidence) : null,
      derivedFromLatestClosedwon: Boolean(row.derived_from_latest_closedwon),
      updatedAt: toIsoString(row.updated_at)
    }
  })

  return {
    clientId,
    hubspotCompanyId: normalizedRows[0]?.hubspot_company_id ? String(normalizedRows[0].hubspot_company_id) : null,
    businessLines: capabilities.filter(item => item.moduleKind === 'business_line' && item.selected).map(item => item.moduleCode),
    serviceModules: capabilities.filter(item => item.moduleKind === 'service_module' && item.selected).map(item => item.moduleCode),
    capabilities
  }
}

const upsertClientCapabilityAssignment = async ({
  clientId,
  hubspotCompanyId,
  moduleCode,
  sourceSystem,
  sourceObjectType,
  sourceObjectId,
  sourceClosedwonDealId,
  confidence,
  active,
  derivedFromLatestClosedwon
}: UpsertAssignmentInput) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      MERGE \`${projectId}.greenhouse.client_service_modules\` AS target
      USING (
        SELECT
          @assignmentId AS assignment_id,
          @clientId AS client_id,
          @hubspotCompanyId AS hubspot_company_id,
          @moduleCode AS module_code,
          @sourceSystem AS source_system,
          @sourceObjectType AS source_object_type,
          @sourceObjectId AS source_object_id,
          @sourceClosedwonDealId AS source_closedwon_deal_id,
          @confidence AS confidence,
          @active AS active,
          @derivedFromLatestClosedwon AS derived_from_latest_closedwon
      ) AS source
      ON target.client_id = source.client_id
       AND target.module_code = source.module_code
      WHEN MATCHED THEN
        UPDATE SET
          hubspot_company_id = source.hubspot_company_id,
          source_system = source.source_system,
          source_object_type = source.source_object_type,
          source_object_id = source.source_object_id,
          source_closedwon_deal_id = source.source_closedwon_deal_id,
          confidence = source.confidence,
          active = source.active,
          derived_from_latest_closedwon = source.derived_from_latest_closedwon,
          valid_from = IF(source.active AND target.active = FALSE, CURRENT_TIMESTAMP(), COALESCE(target.valid_from, CURRENT_TIMESTAMP())),
          valid_to = IF(source.active, NULL, CURRENT_TIMESTAMP()),
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (
          assignment_id,
          client_id,
          hubspot_company_id,
          module_code,
          source_system,
          source_object_type,
          source_object_id,
          source_closedwon_deal_id,
          confidence,
          active,
          derived_from_latest_closedwon,
          valid_from,
          valid_to,
          created_at,
          updated_at
        )
        VALUES (
          source.assignment_id,
          source.client_id,
          source.hubspot_company_id,
          source.module_code,
          source.source_system,
          source.source_object_type,
          source.source_object_id,
          source.source_closedwon_deal_id,
          source.confidence,
          source.active,
          source.derived_from_latest_closedwon,
          IF(source.active, CURRENT_TIMESTAMP(), NULL),
          IF(source.active, NULL, CURRENT_TIMESTAMP()),
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
    `,
    params: {
      assignmentId: buildAssignmentId(clientId, moduleCode),
      clientId,
      hubspotCompanyId,
      moduleCode,
      sourceSystem,
      sourceObjectType,
      sourceObjectId,
      sourceClosedwonDealId,
      confidence,
      active,
      derivedFromLatestClosedwon
    }
  })
}

const validateRequestedCodes = (capabilities: TenantCapabilityRecord[], codes: string[], kind: CapabilityKind) => {
  const validCodes = new Set(capabilities.filter(item => item.moduleKind === kind).map(item => item.moduleCode))

  return unique(codes).filter(code => validCodes.has(code))
}

export const setTenantCapabilitiesFromAdmin = async ({
  clientId,
  actorUserId,
  businessLines,
  serviceModules
}: {
  clientId: string
  actorUserId: string
  businessLines: string[]
  serviceModules: string[]
}) => {
  const current = await getTenantCapabilityState(clientId)

  const selectedCodes = new Set([
    ...validateRequestedCodes(current.capabilities, businessLines, 'business_line'),
    ...validateRequestedCodes(current.capabilities, serviceModules, 'service_module')
  ])

  const hubspotCompanyId = current.hubspotCompanyId

  const pendingWrites = current.capabilities.filter(item => selectedCodes.has(item.moduleCode) || item.selected || item.assignmentSourceSystem === 'greenhouse_admin')

  for (const capability of pendingWrites) {
    await upsertClientCapabilityAssignment({
      clientId,
      hubspotCompanyId,
      moduleCode: capability.moduleCode,
      sourceSystem: 'greenhouse_admin',
      sourceObjectType: 'admin_user',
      sourceObjectId: actorUserId,
      sourceClosedwonDealId: null,
      confidence: 'controlled',
      active: selectedCodes.has(capability.moduleCode),
      derivedFromLatestClosedwon: false
    })
  }

  return getTenantCapabilityState(clientId)
}

export const deriveHubSpotCapabilitiesForTenant = async (clientId: string): Promise<HubSpotCapabilityDerivation | null> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()
  const hubspotCompanyId = await getTenantHubSpotCompanyId(clientId)

  if (!hubspotCompanyId) {
    return null
  }

  const [rows] = await bigQuery.query({
    query: `
      WITH closedwon_deals AS (
        SELECT
          CAST(deals.hs_object_id AS STRING) AS deal_id,
          deals.closedate,
          NULLIF(TRIM(deals.linea_de_servicio), '') AS business_line,
          NULLIF(TRIM(service_module), '') AS service_module
        FROM \`${projectId}.hubspot_crm.deals\` AS deals
        LEFT JOIN UNNEST(SPLIT(COALESCE(deals.servicios_especificos, ''), ';')) AS service_module
        WHERE LOWER(COALESCE(deals.dealstage, '')) = 'closedwon'
          AND @hubspotCompanyId IN UNNEST(SPLIT(REPLACE(COALESCE(deals.assoc_companies, ''), ' ', ''), ','))
      )
      SELECT
        ARRAY_AGG(DISTINCT business_line IGNORE NULLS ORDER BY business_line) AS business_lines,
        ARRAY_AGG(DISTINCT service_module IGNORE NULLS ORDER BY service_module) AS service_modules,
        ARRAY_AGG(deal_id IGNORE NULLS ORDER BY closedate DESC, deal_id DESC LIMIT 1)[OFFSET(0)] AS latest_deal_id
      FROM closedwon_deals
    `,
    params: {
      hubspotCompanyId
    }
  })

  const row = (rows as Array<Record<string, unknown>>)[0]

  return {
    hubspotCompanyId,
    latestDealId: row?.latest_deal_id ? String(row.latest_deal_id) : null,
    businessLines: normalizeStringArray(row?.business_lines),
    serviceModules: normalizeStringArray(row?.service_modules)
  }
}

export const syncTenantCapabilitiesFromSource = async ({
  clientId,
  sourceSystem,
  sourceObjectType,
  sourceObjectId,
  sourceClosedwonDealId,
  confidence,
  businessLines,
  serviceModules,
  derivedFromLatestClosedwon = false
}: CapabilitySyncInput) => {
  const current = await getTenantCapabilityState(clientId)

  const requestedCodes = new Set([
    ...validateRequestedCodes(current.capabilities, businessLines, 'business_line'),
    ...validateRequestedCodes(current.capabilities, serviceModules, 'service_module')
  ])

  const hubspotCompanyId = current.hubspotCompanyId

  const pendingWrites = current.capabilities.filter(item => {
    if (item.assignmentSourceSystem === 'greenhouse_admin') {
      return false
    }

    return requestedCodes.has(item.moduleCode) || item.selected || Boolean(item.assignmentSourceSystem)
  })

  for (const capability of pendingWrites) {
    await upsertClientCapabilityAssignment({
      clientId,
      hubspotCompanyId,
      moduleCode: capability.moduleCode,
      sourceSystem,
      sourceObjectType,
      sourceObjectId,
      sourceClosedwonDealId,
      confidence,
      active: requestedCodes.has(capability.moduleCode),
      derivedFromLatestClosedwon
    })
  }

  return getTenantCapabilityState(clientId)
}
