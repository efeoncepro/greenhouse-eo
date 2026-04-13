import 'server-only'

import { getFinanceProjectId, runFinanceQuery } from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

type HubspotTableName = 'companies' | 'deals'

const tableColumnsCache = new Map<HubspotTableName, Promise<Set<string>>>()

/**
 * Returns the first matching candidate column from the set.
 * Logs a warning when the first preferred candidate is not found and a fallback is used,
 * which indicates potential schema drift in the HubSpot CRM dataset.
 */
const pickColumn = (columns: Set<string>, candidates: string[], fieldHint?: string): string | null => {
  const found = candidates.find(candidate => columns.has(candidate)) ?? null

  if (found && fieldHint && found !== candidates[0]) {
    console.warn(`[hubspot-finance] Column drift: "${fieldHint}" resolved to fallback column "${found}" (expected "${candidates[0]}")`)
  }

  return found
}

export const getHubspotTableColumns = async (tableName: HubspotTableName) => {
  const cached = tableColumnsCache.get(tableName)

  if (cached) {
    return cached
  }

  const promise = (async () => {
    const projectId = getFinanceProjectId()

    const rows = await runFinanceQuery<{ column_name: string }>(`
      SELECT column_name
      FROM \`${projectId}.hubspot_crm.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @tableName
    `, { tableName })

    return new Set(rows.map(row => row.column_name))
  })().catch(error => {
    tableColumnsCache.delete(tableName)
    throw error
  })

  tableColumnsCache.set(tableName, promise)

  return promise
}

/**
 * Validates that required and expected columns exist in the HubSpot schema.
 * - Missing required columns: throws (sync will fail — better than silent corruption).
 * - Missing expected columns: emits an outbox event for observability.
 */
async function validateHubSpotSchema(
  tableName: HubspotTableName,
  columns: Set<string>,
  required: string[],
  expected: string[]
): Promise<void> {
  const missingRequired = required.filter(col => !columns.has(col))

  if (missingRequired.length > 0) {
    const msg = `[hubspot-finance] Critical schema drift on "${tableName}": required columns missing: ${missingRequired.join(', ')}`

    console.error(msg)
    await publishOutboxEvent({
      aggregateType: 'integration_health',
      aggregateId: `hubspot-${tableName}`,
      eventType: 'integration.schema_drift.detected',
      payload: { source: 'hubspot', table: tableName, missingRequired, severity: 'critical' }
    })
    throw new Error(msg)
  }

  const missingExpected = expected.filter(col => !columns.has(col))

  if (missingExpected.length > 0) {
    console.warn(`[hubspot-finance] Schema drift on "${tableName}": expected columns missing: ${missingExpected.join(', ')}`)
    await publishOutboxEvent({
      aggregateType: 'integration_health',
      aggregateId: `hubspot-${tableName}`,
      eventType: 'integration.schema_drift.detected',
      payload: { source: 'hubspot', table: tableName, missingExpected, severity: 'warning' }
    })
  }
}

/**
 * Call before building company SQL expressions. Emits outbox event on schema drift.
 * Throws if hs_object_id is missing (query would produce corrupt NULL IDs).
 */
export const validateHubSpotCompaniesSchema = (columns: Set<string>) =>
  validateHubSpotSchema('companies', columns, ['hs_object_id'], ['name', 'domain', 'country'])

/**
 * Call before building deal SQL expressions. Emits outbox event on schema drift.
 * Throws if hs_object_id or associatedcompanyid is missing.
 */
export const validateHubSpotDealsSchema = (columns: Set<string>) =>
  validateHubSpotSchema('deals', columns, ['hs_object_id', 'associatedcompanyid'], ['dealname', 'dealstage', 'amount'])

export const getHubspotCompaniesExpressions = (columns: Set<string>) => {
  const companyIdColumn = pickColumn(columns, ['hs_object_id'], 'company_id')
  const companyNameColumn = pickColumn(columns, ['name', 'company_name'], 'company_name')
  const domainColumn = pickColumn(columns, ['domain'], 'domain')
  const countryColumn = pickColumn(columns, ['country'], 'country')
  const archivedColumn = pickColumn(columns, ['hs_archived'], 'archived')
  const businessLineColumn = pickColumn(columns, ['linea_de_servicio'], 'business_line')
  const servicesColumn = pickColumn(columns, ['servicios_especificos'], 'services')

  return {
    idExpr: companyIdColumn ? `CAST(hc.${companyIdColumn} AS STRING)` : 'NULL',
    nameExpr: companyNameColumn ? `CAST(hc.${companyNameColumn} AS STRING)` : 'NULL',
    domainExpr: domainColumn ? `CAST(hc.${domainColumn} AS STRING)` : 'NULL',
    countryExpr: countryColumn ? `CAST(hc.${countryColumn} AS STRING)` : 'NULL',
    archivedFilter: archivedColumn ? `(hc.${archivedColumn} = FALSE OR hc.${archivedColumn} IS NULL)` : 'TRUE',
    businessLineExpr: businessLineColumn ? `CAST(hc.${businessLineColumn} AS STRING)` : 'NULL',
    servicesExpr: servicesColumn ? `CAST(hc.${servicesColumn} AS STRING)` : 'NULL'
  }
}

export const getHubspotDealsExpressions = (columns: Set<string>) => {
  const dealIdColumn = pickColumn(columns, ['hs_object_id'], 'deal_id')
  const dealNameColumn = pickColumn(columns, ['dealname', 'name'], 'deal_name')
  const stageColumn = pickColumn(columns, ['dealstage', 'stage'], 'deal_stage')
  const amountColumn = pickColumn(columns, ['amount'], 'amount')
  const closeDateColumn = pickColumn(columns, ['closedate', 'close_date'], 'close_date')
  const pipelineColumn = pickColumn(columns, ['pipeline'], 'pipeline')
  const companyIdColumn = pickColumn(columns, ['associatedcompanyid', 'hubspot_company_id'], 'company_id')
  const archivedColumn = pickColumn(columns, ['hs_archived'], 'archived')

  return {
    canQueryDeals: Boolean(dealIdColumn && companyIdColumn),
    idExpr: dealIdColumn ? `CAST(d.${dealIdColumn} AS STRING)` : 'NULL',
    companyIdExpr: companyIdColumn ? `CAST(d.${companyIdColumn} AS STRING)` : 'NULL',
    nameExpr: dealNameColumn ? `CAST(d.${dealNameColumn} AS STRING)` : 'NULL',
    stageExpr: stageColumn ? `CAST(d.${stageColumn} AS STRING)` : 'NULL',
    amountExpr: amountColumn ? `d.${amountColumn}` : 'NULL',
    closeDateExpr: closeDateColumn ? `d.${closeDateColumn}` : 'NULL',
    pipelineExpr: pipelineColumn ? `CAST(d.${pipelineColumn} AS STRING)` : 'NULL',
    archivedFilter: archivedColumn ? `(d.${archivedColumn} = FALSE OR d.${archivedColumn} IS NULL)` : 'TRUE'
  }
}
