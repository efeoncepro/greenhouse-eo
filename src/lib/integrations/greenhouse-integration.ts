import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { syncTenantCapabilitiesFromSource } from '@/lib/admin/tenant-capabilities'
import { buildModulePublicId, buildTenantPublicId } from '@/lib/ids/greenhouse-ids'
import type {
  IntegrationCapabilityCatalogItem,
  IntegrationTenantSelector,
  IntegrationTenantSnapshot
} from '@/lib/integrations/greenhouse-integration-types'

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

const parsePositiveLimit = (value: string | null, fallback: number, max: number) => {
  if (!value) return fallback

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(Math.floor(parsed), max)
}

const findTenantByPublicId = async (publicId: string) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        client_id,
        hubspot_company_id
      FROM \`${projectId}.greenhouse.clients\`
    `
  })

  const match = (rows as Array<Record<string, unknown>>).find(row => {
    const clientId = String(row.client_id || '')
    const hubspotCompanyId = row.hubspot_company_id ? String(row.hubspot_company_id) : null

    return buildTenantPublicId({ clientId, hubspotCompanyId }).toUpperCase() === publicId.toUpperCase()
  })

  return match ? String(match.client_id || '') : null
}

export const resolveTenantClientId = async (selector: IntegrationTenantSelector) => {
  if (selector.clientId?.trim()) {
    return selector.clientId.trim()
  }

  if (selector.publicId?.trim()) {
    return findTenantByPublicId(selector.publicId.trim())
  }

  if (
    selector.sourceSystem?.trim().toLowerCase() === 'hubspot_crm' &&
    selector.sourceObjectType?.trim().toLowerCase() === 'company' &&
    selector.sourceObjectId?.trim()
  ) {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    const [rows] = await bigQuery.query({
      query: `
        SELECT client_id
        FROM \`${projectId}.greenhouse.clients\`
        WHERE hubspot_company_id = @sourceObjectId
        LIMIT 1
      `,
      params: {
        sourceObjectId: selector.sourceObjectId.trim()
      }
    })

    const row = (rows as Array<Record<string, unknown>>)[0]

    return row?.client_id ? String(row.client_id) : null
  }

  return null
}

export const listCapabilityCatalogForIntegration = async (): Promise<{
  exportedAt: string
  businessLines: IntegrationCapabilityCatalogItem[]
  serviceModules: IntegrationCapabilityCatalogItem[]
}> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        module_code,
        module_label,
        module_kind,
        parent_module_code,
        description,
        sort_order
      FROM \`${projectId}.greenhouse.service_modules\`
      WHERE active = TRUE
      ORDER BY sort_order ASC, module_kind ASC, module_label ASC
    `
  })

  const items = (rows as Array<Record<string, unknown>>).map(row => {
    const moduleKind = row.module_kind === 'business_line' ? 'business_line' : 'service_module'

    return {
      moduleCode: String(row.module_code || ''),
      publicModuleId: buildModulePublicId({
        moduleCode: String(row.module_code || ''),
        moduleKind
      }),
      moduleLabel: String(row.module_label || row.module_code || ''),
      moduleKind,
      parentModuleCode: row.parent_module_code ? String(row.parent_module_code) : null,
      description: row.description ? String(row.description) : null,
      sortOrder: Number(row.sort_order || 0)
    } satisfies IntegrationCapabilityCatalogItem
  })

  return {
    exportedAt: new Date().toISOString(),
    businessLines: items.filter(item => item.moduleKind === 'business_line'),
    serviceModules: items.filter(item => item.moduleKind === 'service_module')
  }
}

export const listTenantsForIntegration = async ({
  selector,
  updatedSince,
  limit
}: {
  selector: IntegrationTenantSelector
  updatedSince: string | null
  limit: number
}) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  let targetClientId: string | null = null

  if (selector.clientId || selector.publicId || selector.sourceObjectId) {
    targetClientId = await resolveTenantClientId(selector)

    if (!targetClientId) {
      return []
    }
  }

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
        )
        WHERE rn = 1
      ),
      tenant_snapshots AS (
        SELECT
          c.client_id,
          c.client_name,
          c.status,
          c.active,
          c.primary_contact_email,
          c.portal_home_path,
          c.hubspot_company_id,
          c.updated_at AS tenant_updated_at,
          MAX(la.updated_at) AS capabilities_updated_at,
          ARRAY_AGG(
            DISTINCT IF(sm.module_kind = 'business_line' AND la.active = TRUE, la.module_code, NULL)
            IGNORE NULLS
            ORDER BY IF(sm.module_kind = 'business_line' AND la.active = TRUE, la.module_code, NULL)
          ) AS business_lines,
          ARRAY_AGG(
            DISTINCT IF(sm.module_kind = 'service_module' AND la.active = TRUE, la.module_code, NULL)
            IGNORE NULLS
            ORDER BY IF(sm.module_kind = 'service_module' AND la.active = TRUE, la.module_code, NULL)
          ) AS service_modules
        FROM \`${projectId}.greenhouse.clients\` AS c
        LEFT JOIN latest_assignments AS la
          ON la.client_id = c.client_id
        LEFT JOIN \`${projectId}.greenhouse.service_modules\` AS sm
          ON sm.module_code = la.module_code
         AND sm.active = TRUE
        WHERE (@targetClientId = '' OR c.client_id = @targetClientId)
        GROUP BY
          c.client_id,
          c.client_name,
          c.status,
          c.active,
          c.primary_contact_email,
          c.portal_home_path,
          c.hubspot_company_id,
          tenant_updated_at
      )
      SELECT *
      FROM tenant_snapshots
      WHERE (
        @updatedSince = ''
        OR COALESCE(capabilities_updated_at, tenant_updated_at) >= TIMESTAMP(@updatedSince)
      )
      ORDER BY COALESCE(capabilities_updated_at, tenant_updated_at) DESC, client_name ASC
      LIMIT @limit
    `,
    params: {
      targetClientId: targetClientId || '',
      updatedSince: updatedSince || '',
      limit
    },
    types: {
      targetClientId: 'STRING',
      updatedSince: 'STRING',
      limit: 'INT64'
    }
  })

  return (rows as Array<Record<string, unknown>>).map(row => {
    const clientId = String(row.client_id || '')
    const hubspotCompanyId = row.hubspot_company_id ? String(row.hubspot_company_id) : null

    return {
      clientId,
      publicId: buildTenantPublicId({ clientId, hubspotCompanyId }),
      clientName: String(row.client_name || ''),
      status: String(row.status || ''),
      active: Boolean(row.active),
      primaryContactEmail: row.primary_contact_email ? String(row.primary_contact_email) : null,
      portalHomePath: String(row.portal_home_path || ''),
      hubspotCompanyId,
      businessLines: normalizeStringArray(row.business_lines),
      serviceModules: normalizeStringArray(row.service_modules),
      updatedAt: toIsoString(row.tenant_updated_at),
      capabilitiesUpdatedAt: toIsoString(row.capabilities_updated_at)
    } satisfies IntegrationTenantSnapshot
  })
}

export const syncTenantCapabilitiesFromIntegration = async ({
  selector,
  sourceSystem,
  sourceObjectType,
  sourceObjectId,
  confidence,
  businessLines,
  serviceModules
}: {
  selector: IntegrationTenantSelector
  sourceSystem: string
  sourceObjectType: string | null
  sourceObjectId: string | null
  confidence: string
  businessLines: string[]
  serviceModules: string[]
}) => {
  const clientId = await resolveTenantClientId(selector)

  if (!clientId) {
    return null
  }

  return syncTenantCapabilitiesFromSource({
    clientId,
    sourceSystem,
    sourceObjectType,
    sourceObjectId,
    sourceClosedwonDealId: null,
    confidence,
    businessLines: unique(businessLines),
    serviceModules: unique(serviceModules),
    derivedFromLatestClosedwon: false
  })
}

export const parseIntegrationLimit = (value: string | null) => parsePositiveLimit(value, 50, 200)
