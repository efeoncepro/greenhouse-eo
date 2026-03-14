import 'server-only'

import { getFinanceProjectId, runFinanceQuery } from '@/lib/finance/shared'

type HubspotTableName = 'companies' | 'deals'

const tableColumnsCache = new Map<HubspotTableName, Promise<Set<string>>>()

const pickColumn = (columns: Set<string>, candidates: string[]) => candidates.find(candidate => columns.has(candidate)) ?? null

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

export const getHubspotCompaniesExpressions = (columns: Set<string>) => {
  const companyIdColumn = pickColumn(columns, ['hs_object_id'])
  const companyNameColumn = pickColumn(columns, ['name', 'company_name'])
  const domainColumn = pickColumn(columns, ['domain'])
  const countryColumn = pickColumn(columns, ['country'])
  const archivedColumn = pickColumn(columns, ['hs_archived'])
  const businessLineColumn = pickColumn(columns, ['linea_de_servicio'])
  const servicesColumn = pickColumn(columns, ['servicios_especificos'])

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
  const dealIdColumn = pickColumn(columns, ['hs_object_id'])
  const dealNameColumn = pickColumn(columns, ['dealname', 'name'])
  const stageColumn = pickColumn(columns, ['dealstage', 'stage'])
  const amountColumn = pickColumn(columns, ['amount'])
  const closeDateColumn = pickColumn(columns, ['closedate', 'close_date'])
  const pipelineColumn = pickColumn(columns, ['pipeline'])
  const companyIdColumn = pickColumn(columns, ['associatedcompanyid', 'hubspot_company_id'])
  const archivedColumn = pickColumn(columns, ['hs_archived'])

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
