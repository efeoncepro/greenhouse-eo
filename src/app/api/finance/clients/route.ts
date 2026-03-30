import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getHubspotCompaniesExpressions, getHubspotTableColumns } from '@/lib/finance/hubspot'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import { upsertFinanceClientProfileInPostgres } from '@/lib/finance/postgres-store-slice2'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  assertValidTaxIdType,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toTimestampString,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

type ClientListRow = Record<string, unknown> & {
  client_id: string
  client_profile_id: string
  greenhouse_client_name: string | null
  hubspot_company_id: string | null
  company_name: string | null
  company_domain: string | null
  company_country: string | null
  business_line: string | null
  service_modules_raw: string | null
  legal_name: string | null
  tax_id: string | null
  payment_terms_days: unknown
  payment_currency: string
  requires_po: boolean
  requires_hes: boolean
  total_receivable: unknown
  active_invoices_count: unknown
  created_at: unknown
  updated_at: unknown
}

type ClientReceivableMatchRow = Record<string, unknown> & {
  income_id: string
  outstanding_amount_clp: unknown
  income_key: string
}

const parseServiceModules = (value: string | null) =>
  (value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)

const DEFAULT_COMPANY_EXPRESSIONS = {
  idExpr: 'NULL',
  nameExpr: 'NULL',
  domainExpr: 'NULL',
  countryExpr: 'NULL',
  archivedFilter: 'TRUE',
  businessLineExpr: 'NULL',
  servicesExpr: 'NULL'
}

const shouldFallbackFromFinanceClientReads = (error: unknown) => {
  if (shouldFallbackFromFinancePostgres(error)) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  return (
    message.includes('relation') && message.includes('does not exist')
  ) || message.includes('greenhouse_crm') || message.includes('v_client_active_modules')
}

const readFinanceClientsFromPostgres = async ({
  page,
  pageSize,
  requiresPo,
  requiresHes,
  search
}: {
  page: number
  pageSize: number
  requiresPo: string | null
  requiresHes: string | null
  search: string | null
}) => {
  const conditions: string[] = ['c.active = TRUE']
  const values: unknown[] = []
  let idx = 0

  const push = (clause: string, value: unknown) => {
    idx += 1
    conditions.push(clause.replaceAll('$?', `$${idx}`))
    values.push(value)
  }

  if (requiresPo === 'true') push('COALESCE(cp.requires_po, FALSE) = $?', true)
  if (requiresHes === 'true') push('COALESCE(cp.requires_hes, FALSE) = $?', true)

  if (search) {
    const searchValue = `%${search.toLowerCase()}%`

    const placeholders = Array.from({ length: 5 }, () => {
      idx += 1
      values.push(searchValue)

      return `$${idx}`
    })

    conditions.push(
      `(
        LOWER(COALESCE(cc.company_name, cp.legal_name, c.client_name, '')) LIKE ${placeholders[0]}
        OR LOWER(COALESCE(cc.website_url, '')) LIKE ${placeholders[1]}
        OR LOWER(COALESCE(cp.tax_id, '')) LIKE ${placeholders[2]}
        OR LOWER(COALESCE(cp.client_profile_id, c.client_id, '')) LIKE ${placeholders[3]}
        OR LOWER(COALESCE(cp.hubspot_company_id, c.hubspot_company_id, '')) LIKE ${placeholders[4]}
      )`
    )
  }

  const whereClause = conditions.join(' AND ')

  const cte = `
    WITH latest_profiles AS (
      SELECT DISTINCT ON (cp.client_profile_id)
        cp.client_profile_id,
        cp.client_id,
        cp.hubspot_company_id,
        cp.legal_name,
        cp.tax_id,
        cp.payment_terms_days,
        cp.payment_currency,
        cp.requires_po,
        cp.requires_hes,
        cp.created_at,
        cp.updated_at
      FROM greenhouse_finance.client_profiles cp
      ORDER BY cp.client_profile_id, cp.updated_at DESC, cp.created_at DESC
    ),
    crm_company_by_client AS (
      SELECT DISTINCT ON (client_id)
        client_id,
        hubspot_company_id,
        company_name,
        country_code,
        website_url
      FROM greenhouse_crm.companies
      WHERE client_id IS NOT NULL
        AND is_deleted = FALSE
      ORDER BY client_id, updated_at DESC, synced_at DESC
    ),
    module_summary_by_client AS (
      SELECT
        vam.client_id,
        MIN(sm.business_line) FILTER (WHERE sm.business_line IS NOT NULL) AS business_line,
        STRING_AGG(DISTINCT vam.module_code, ';' ORDER BY vam.module_code) AS service_modules_raw
      FROM greenhouse_core.v_client_active_modules vam
      JOIN greenhouse_core.service_modules sm ON sm.module_id = vam.module_id
      GROUP BY vam.client_id
    ),
    receivable_summary AS (
      SELECT
        COALESCE(client_id, client_profile_id, hubspot_company_id) AS income_key,
        SUM(
          COALESCE(total_amount_clp, 0) * CASE
            WHEN COALESCE(total_amount, 0) = 0 THEN 0
            ELSE GREATEST(COALESCE(total_amount, 0) - COALESCE(amount_paid, 0), 0) / NULLIF(COALESCE(total_amount, 0), 0)
          END
        ) AS total_receivable,
        COUNT(*) FILTER (WHERE payment_status IN ('pending', 'overdue', 'partial')) AS active_invoices_count
      FROM greenhouse_finance.income
      WHERE COALESCE(client_id, client_profile_id, hubspot_company_id) IS NOT NULL
      GROUP BY COALESCE(client_id, client_profile_id, hubspot_company_id)
    ),
    base_clients AS (
      SELECT
        c.client_id,
        COALESCE(cp.client_profile_id, c.client_id, c.hubspot_company_id) AS client_profile_id,
        c.client_name AS greenhouse_client_name,
        COALESCE(cp.hubspot_company_id, c.hubspot_company_id) AS hubspot_company_id,
        cc.company_name,
        NULLIF(REGEXP_REPLACE(COALESCE(cc.website_url, ''), '^https?://(www\\.)?', ''), '') AS company_domain,
        cc.country_code AS company_country,
        ms.business_line,
        ms.service_modules_raw,
        COALESCE(cp.legal_name, cc.company_name, c.client_name) AS legal_name,
        cp.tax_id,
        COALESCE(cp.payment_terms_days, 30) AS payment_terms_days,
        COALESCE(cp.payment_currency, 'CLP') AS payment_currency,
        COALESCE(cp.requires_po, FALSE) AS requires_po,
        COALESCE(cp.requires_hes, FALSE) AS requires_hes,
        COALESCE(cp.created_at, c.created_at) AS created_at,
        COALESCE(cp.updated_at, c.updated_at) AS updated_at,
        COALESCE(rs_client.total_receivable, rs_profile.total_receivable, rs_hubspot.total_receivable, 0) AS total_receivable,
        COALESCE(rs_client.active_invoices_count, rs_profile.active_invoices_count, rs_hubspot.active_invoices_count, 0) AS active_invoices_count
      FROM greenhouse_core.clients c
      LEFT JOIN latest_profiles cp ON cp.client_id = c.client_id
      LEFT JOIN crm_company_by_client cc ON cc.client_id = c.client_id
      LEFT JOIN module_summary_by_client ms ON ms.client_id = c.client_id
      LEFT JOIN receivable_summary rs_client ON rs_client.income_key = c.client_id
      LEFT JOIN receivable_summary rs_profile ON rs_profile.income_key = cp.client_profile_id
      LEFT JOIN receivable_summary rs_hubspot ON rs_hubspot.income_key = COALESCE(cp.hubspot_company_id, c.hubspot_company_id)
      WHERE ${whereClause}
    )
  `

  const countRows = await runGreenhousePostgresQuery<{ total: string }>(
    `${cte} SELECT COUNT(*) AS total FROM base_clients`,
    values
  )

  const pageValues = [...values, pageSize, (page - 1) * pageSize]

  const rows = await runGreenhousePostgresQuery<ClientListRow>(
    `${cte}
     SELECT
       client_id,
       client_profile_id,
       greenhouse_client_name,
       hubspot_company_id,
       company_name,
       company_domain,
       company_country,
       business_line,
       service_modules_raw,
       legal_name,
       tax_id,
       payment_terms_days,
       payment_currency,
       requires_po,
       requires_hes,
       total_receivable,
       active_invoices_count,
       created_at,
       updated_at
     FROM base_clients
     ORDER BY COALESCE(company_name, legal_name, greenhouse_client_name) ASC
     LIMIT $${idx + 1} OFFSET $${idx + 2}`,
    pageValues
  )

  return {
    items: rows.map(row => ({
      clientId: normalizeString(row.client_id),
      clientProfileId: normalizeString(row.client_profile_id),
      hubspotCompanyId: row.hubspot_company_id ? normalizeString(row.hubspot_company_id) : null,
      companyName: row.company_name ? normalizeString(row.company_name) : null,
      greenhouseClientName: row.greenhouse_client_name ? normalizeString(row.greenhouse_client_name) : null,
      companyDomain: row.company_domain ? normalizeString(row.company_domain) : null,
      companyCountry: row.company_country ? normalizeString(row.company_country) : null,
      businessLine: row.business_line ? normalizeString(row.business_line) : null,
      serviceModules: parseServiceModules(row.service_modules_raw),
      legalName: row.legal_name ? normalizeString(row.legal_name) : null,
      taxId: row.tax_id ? normalizeString(row.tax_id) : null,
      paymentTermsDays: toNumber(row.payment_terms_days),
      paymentCurrency: normalizeString(row.payment_currency),
      requiresPo: normalizeBoolean(row.requires_po),
      requiresHes: normalizeBoolean(row.requires_hes),
      totalReceivable: toNumber(row.total_receivable),
      activeInvoicesCount: toNumber(row.active_invoices_count),
      createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
      updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
    })),
    total: toNumber(countRows[0]?.total),
    page,
    pageSize
  }
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, toNumber(searchParams.get('page') || '1'))
  const pageSize = Math.min(200, Math.max(1, toNumber(searchParams.get('pageSize') || '50')))
  const requiresPo = searchParams.get('requiresPo')
  const requiresHes = searchParams.get('requiresHes')
  const search = searchParams.get('search')

  try {
    const response = await readFinanceClientsFromPostgres({
      page,
      pageSize,
      requiresPo,
      requiresHes,
      search
    })

    return NextResponse.json(response)
  } catch (error) {
    if (!shouldFallbackFromFinanceClientReads(error)) {
      throw error
    }

    console.warn('[finance/clients] Postgres-first read path unavailable, falling back to BigQuery.', error)
  }

  const projectId = getFinanceProjectId()
  let companyExpressions = DEFAULT_COMPANY_EXPRESSIONS
  let hubspotCompaniesJoin = ''

  try {
    const companyColumns = await getHubspotTableColumns('companies')

    companyExpressions = getHubspotCompaniesExpressions(companyColumns)
    hubspotCompaniesJoin = `
      LEFT JOIN \`${projectId}.hubspot_crm.companies\` hc
        ON CAST(gc.hubspot_company_id AS STRING) = ${companyExpressions.idExpr}
    `
  } catch (error) {
    console.error(
      'Finance clients list: unable to load HubSpot companies metadata, falling back to projected/canonical data only.',
      error
    )
  }

  let filters = ''
  const params: Record<string, unknown> = {}

  if (requiresPo === 'true') {
    filters += ' AND requires_po = TRUE'
  }

  if (requiresHes === 'true') {
    filters += ' AND requires_hes = TRUE'
  }

  if (search) {
    filters += `
      AND (
        LOWER(COALESCE(company_name, legal_name, greenhouse_client_name, '')) LIKE @search
        OR LOWER(COALESCE(company_domain, '')) LIKE @search
        OR LOWER(COALESCE(tax_id, '')) LIKE @search
        OR LOWER(COALESCE(client_profile_id, '')) LIKE @search
        OR LOWER(COALESCE(hubspot_company_id, '')) LIKE @search
      )
    `
    params.search = `%${search.toLowerCase()}%`
  }

  const baseClientsCte = `
    WITH profile_by_client AS (
      SELECT *
      FROM \`${projectId}.greenhouse.fin_client_profiles\`
      WHERE client_id IS NOT NULL
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY client_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, client_profile_id
      ) = 1
    ),
    profile_by_legacy_id AS (
      SELECT *
      FROM \`${projectId}.greenhouse.fin_client_profiles\`
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY client_profile_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, client_profile_id
      ) = 1
    ),
    profile_by_hubspot AS (
      SELECT *
      FROM \`${projectId}.greenhouse.fin_client_profiles\`
      WHERE hubspot_company_id IS NOT NULL
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY hubspot_company_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, client_profile_id
      ) = 1
    ),
    crm_company_by_client AS (
      SELECT *
      FROM \`${projectId}.greenhouse_conformed.crm_companies\`
      WHERE client_id IS NOT NULL
        AND is_deleted = FALSE
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY client_id
        ORDER BY updated_at DESC NULLS LAST, synced_at DESC NULLS LAST, company_source_id
      ) = 1
    ),
    module_summary_by_client AS (
      SELECT
        csm.client_id,
        STRING_AGG(
          DISTINCT IF(sm.module_kind = 'business_line', sm.module_code, NULL),
          ';' IGNORE NULLS
          ORDER BY IF(sm.module_kind = 'business_line', sm.module_code, NULL)
        ) AS business_lines_raw,
        STRING_AGG(
          DISTINCT IF(sm.module_kind = 'service_module', sm.module_code, NULL),
          ';' IGNORE NULLS
          ORDER BY IF(sm.module_kind = 'service_module', sm.module_code, NULL)
        ) AS service_modules_raw
      FROM \`${projectId}.greenhouse.client_service_modules\` csm
      LEFT JOIN \`${projectId}.greenhouse.service_modules\` sm
        ON sm.module_code = csm.module_code
      WHERE csm.active = TRUE
      GROUP BY csm.client_id
    ),
    base_clients AS (
      SELECT
        gc.client_id,
        gc.client_name AS greenhouse_client_name,
        CAST(gc.hubspot_company_id AS STRING) AS hubspot_company_id,
        COALESCE(
          fp_client.client_profile_id,
          fp_legacy.client_profile_id,
          fp_hubspot.client_profile_id,
          CAST(gc.client_id AS STRING),
          CAST(gc.hubspot_company_id AS STRING)
        ) AS client_profile_id,
        COALESCE(fp_client.legal_name, fp_legacy.legal_name, fp_hubspot.legal_name, cc.legal_name, cc.company_name, ${companyExpressions.nameExpr}, gc.client_name) AS legal_name,
        COALESCE(fp_client.tax_id, fp_legacy.tax_id, fp_hubspot.tax_id) AS tax_id,
        COALESCE(fp_client.payment_terms_days, fp_legacy.payment_terms_days, fp_hubspot.payment_terms_days, 30) AS payment_terms_days,
        COALESCE(fp_client.payment_currency, fp_legacy.payment_currency, fp_hubspot.payment_currency, 'CLP') AS payment_currency,
        COALESCE(fp_client.requires_po, fp_legacy.requires_po, fp_hubspot.requires_po, FALSE) AS requires_po,
        COALESCE(fp_client.requires_hes, fp_legacy.requires_hes, fp_hubspot.requires_hes, FALSE) AS requires_hes,
        COALESCE(cc.company_name, ${companyExpressions.nameExpr}) AS company_name,
        COALESCE(
          NULLIF(REGEXP_EXTRACT(COALESCE(cc.website_url, ''), r'^(?:https?://)?(?:www\\.)?([^/]+)'), ''),
          ${companyExpressions.domainExpr}
        ) AS company_domain,
        COALESCE(cc.country_code, ${companyExpressions.countryExpr}) AS company_country,
        COALESCE(
          SPLIT(COALESCE(ms.business_lines_raw, ''), ';')[SAFE_OFFSET(0)],
          ${companyExpressions.businessLineExpr}
        ) AS business_line,
        COALESCE(ms.service_modules_raw, ${companyExpressions.servicesExpr}) AS service_modules_raw,
        COALESCE(fp_client.created_at, fp_legacy.created_at, fp_hubspot.created_at) AS created_at,
        COALESCE(fp_client.updated_at, fp_legacy.updated_at, fp_hubspot.updated_at) AS updated_at
      FROM \`${projectId}.greenhouse.clients\` gc
      LEFT JOIN profile_by_client fp_client
        ON fp_client.client_id = gc.client_id
      LEFT JOIN profile_by_legacy_id fp_legacy
        ON fp_legacy.client_profile_id = gc.client_id
      LEFT JOIN profile_by_hubspot fp_hubspot
        ON fp_hubspot.hubspot_company_id = CAST(gc.hubspot_company_id AS STRING)
      LEFT JOIN crm_company_by_client cc
        ON cc.client_id = gc.client_id
      LEFT JOIN module_summary_by_client ms
        ON ms.client_id = gc.client_id
      ${hubspotCompaniesJoin}
      WHERE gc.active = TRUE
        AND (cc.company_source_id IS NOT NULL OR ${companyExpressions.archivedFilter})
    )
  `

  const countRows = await runFinanceQuery<{ total: number }>(`
    ${baseClientsCte}
    SELECT COUNT(*) AS total
    FROM base_clients
    WHERE TRUE ${filters}
  `, params)

  const total = toNumber(countRows[0]?.total)

  const rows = await runFinanceQuery<ClientListRow>(`
    ${baseClientsCte}
    SELECT
      bc.*,
      0 AS total_receivable,
      0 AS active_invoices_count
    FROM base_clients bc
    WHERE TRUE ${filters}
    ORDER BY COALESCE(bc.company_name, bc.legal_name, bc.greenhouse_client_name) ASC
    LIMIT @limit OFFSET @offset
  `, { ...params, limit: pageSize, offset: (page - 1) * pageSize })

  const clientRollups = new Map<string, { totalReceivable: number; activeInvoicesCount: number }>()

  if (rows.length > 0) {
    const clientIdsByKey = new Map<string, Set<string>>()

    rows.forEach(row => {
      const keys = [normalizeString(row.client_id), normalizeString(row.client_profile_id), normalizeString(row.hubspot_company_id)]
        .filter(Boolean)

      keys.forEach(key => {
        const existing = clientIdsByKey.get(key) ?? new Set<string>()

        existing.add(row.client_id)
        clientIdsByKey.set(key, existing)
      })
    })

    try {
      const receivableRows = await runFinanceQuery<ClientReceivableMatchRow>(`
        WITH open_income AS (
          SELECT income_id, outstanding_amount_clp, income_key
          FROM (
            SELECT
              income_id,
              COALESCE(total_amount_clp, 0) * SAFE_DIVIDE(
                GREATEST(COALESCE(total_amount, 0) - COALESCE(amount_paid, 0), 0),
                NULLIF(COALESCE(total_amount, 0), 0)
              ) AS outstanding_amount_clp,
              [client_id, client_profile_id, hubspot_company_id] AS income_keys
            FROM \`${projectId}.greenhouse.fin_income\`
            WHERE payment_status IN ('pending', 'overdue', 'partial')
          ),
          UNNEST(income_keys) AS income_key
          WHERE income_key IS NOT NULL
            AND income_key != ''
            AND income_key IN UNNEST(@clientKeys)
        )
        SELECT DISTINCT income_id, outstanding_amount_clp, income_key
        FROM open_income
      `, { clientKeys: Array.from(clientIdsByKey.keys()) })

      const incomeIdsByClientId = new Map<string, Set<string>>()
      const receivableByClientId = new Map<string, number>()

      receivableRows.forEach(row => {
        const matchingClientIds = clientIdsByKey.get(row.income_key)

        if (!matchingClientIds || matchingClientIds.size === 0) {
          return
        }

        matchingClientIds.forEach(clientId => {
          const seenIncomeIds = incomeIdsByClientId.get(clientId) ?? new Set<string>()

          if (seenIncomeIds.has(row.income_id)) {
            return
          }

          seenIncomeIds.add(row.income_id)
          incomeIdsByClientId.set(clientId, seenIncomeIds)
          receivableByClientId.set(
            clientId,
            (receivableByClientId.get(clientId) ?? 0) + toNumber(row.outstanding_amount_clp)
          )
        })
      })

      rows.forEach(row => {
        clientRollups.set(row.client_id, {
          totalReceivable: receivableByClientId.get(row.client_id) ?? 0,
          activeInvoicesCount: incomeIdsByClientId.get(row.client_id)?.size ?? 0
        })
      })
    } catch (error) {
      console.error('Finance clients list: receivable rollup failed, returning base client directory without income aggregates.', error)
    }
  }

  return NextResponse.json({
    items: rows.map(row => ({
      clientId: normalizeString(row.client_id),
      clientProfileId: normalizeString(row.client_profile_id),
      hubspotCompanyId: row.hubspot_company_id ? normalizeString(row.hubspot_company_id) : null,
      companyName: row.company_name ? normalizeString(row.company_name) : null,
      greenhouseClientName: row.greenhouse_client_name ? normalizeString(row.greenhouse_client_name) : null,
      companyDomain: row.company_domain ? normalizeString(row.company_domain) : null,
      companyCountry: row.company_country ? normalizeString(row.company_country) : null,
      businessLine: row.business_line ? normalizeString(row.business_line) : null,
      serviceModules: parseServiceModules(row.service_modules_raw),
      legalName: row.legal_name ? normalizeString(row.legal_name) : null,
      taxId: row.tax_id ? normalizeString(row.tax_id) : null,
      paymentTermsDays: toNumber(row.payment_terms_days),
      paymentCurrency: normalizeString(row.payment_currency),
      requiresPo: normalizeBoolean(row.requires_po),
      requiresHes: normalizeBoolean(row.requires_hes),
      totalReceivable: clientRollups.get(row.client_id)?.totalReceivable ?? 0,
      activeInvoicesCount: clientRollups.get(row.client_id)?.activeInvoicesCount ?? 0,
      createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
      updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
    })),
    total,
    page,
    pageSize
  })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const resolvedClient = await resolveFinanceClientContext({
      clientId: body.clientId,
      clientProfileId: body.clientProfileId,
      hubspotCompanyId: body.hubspotCompanyId
    })

    const hubspotCompanyId = resolvedClient.hubspotCompanyId || normalizeString(body.hubspotCompanyId)
    const clientProfileId = resolvedClient.clientProfileId || normalizeString(body.clientProfileId) || resolvedClient.clientId || hubspotCompanyId

    if (!clientProfileId) {
      throw new FinanceValidationError('clientProfileId or hubspotCompanyId is required.')
    }

    const legalName = assertNonEmptyString(body.legalName, 'legalName')
    const paymentCurrency = body.paymentCurrency ? assertValidCurrency(body.paymentCurrency) : 'CLP'
    const taxIdType = body.taxIdType ? assertValidTaxIdType(body.taxIdType) : 'RUT'

    try {
      await upsertFinanceClientProfileInPostgres({
        clientProfileId,
        clientId: resolvedClient.clientId,
        hubspotCompanyId: hubspotCompanyId || clientProfileId,
        taxId: body.taxId ? normalizeString(body.taxId) : null,
        taxIdType,
        legalName,
        billingAddress: body.billingAddress ? normalizeString(body.billingAddress) : null,
        billingCountry: normalizeString(body.billingCountry) || 'CL',
        paymentTermsDays: toNumber(body.paymentTermsDays) || 30,
        paymentCurrency,
        requiresPo: Boolean(body.requiresPo),
        requiresHes: Boolean(body.requiresHes),
        currentPoNumber: body.currentPoNumber ? normalizeString(body.currentPoNumber) : null,
        currentHesNumber: body.currentHesNumber ? normalizeString(body.currentHesNumber) : null,
        financeContacts: Array.isArray(body.financeContacts) ? body.financeContacts : [],
        specialConditions: body.specialConditions ? normalizeString(body.specialConditions) : null,
        createdByUserId: tenant.userId || null
      })
    } catch (error) {
      if (!shouldFallbackFromFinancePostgres(error)) {
        throw error
      }

      if (!isFinanceBigQueryWriteEnabled()) {
        return NextResponse.json(
          {
            error: 'Finance BigQuery fallback write is disabled for client profiles.',
            code: 'FINANCE_BQ_WRITE_DISABLED'
          },
          { status: 503 }
        )
      }

      await ensureFinanceInfrastructure()

      const projectId = getFinanceProjectId()

      await runFinanceQuery(`
        MERGE \`${projectId}.greenhouse.fin_client_profiles\` AS target
        USING (
          SELECT
            @clientProfileId AS client_profile_id,
            @clientId AS client_id,
            @hubspotCompanyId AS hubspot_company_id,
            @taxId AS tax_id,
            @taxIdType AS tax_id_type,
            @legalName AS legal_name,
            @billingAddress AS billing_address,
            @billingCountry AS billing_country,
            @paymentTermsDays AS payment_terms_days,
            @paymentCurrency AS payment_currency,
            @requiresPo AS requires_po,
            @requiresHes AS requires_hes,
            @currentPoNumber AS current_po_number,
            @currentHesNumber AS current_hes_number,
            @specialConditions AS special_conditions,
            @createdBy AS created_by,
            CURRENT_TIMESTAMP() AS created_at,
            CURRENT_TIMESTAMP() AS updated_at
        ) AS source
        ON target.client_profile_id = source.client_profile_id
        WHEN MATCHED THEN
          UPDATE SET
            client_id = COALESCE(source.client_id, target.client_id),
            hubspot_company_id = COALESCE(source.hubspot_company_id, target.hubspot_company_id),
            legal_name = source.legal_name,
            tax_id = source.tax_id,
            tax_id_type = source.tax_id_type,
            billing_address = source.billing_address,
            billing_country = source.billing_country,
            payment_terms_days = source.payment_terms_days,
            payment_currency = source.payment_currency,
            requires_po = source.requires_po,
            requires_hes = source.requires_hes,
            current_po_number = source.current_po_number,
            current_hes_number = source.current_hes_number,
            special_conditions = source.special_conditions,
            updated_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN
          INSERT (
            client_profile_id, client_id, hubspot_company_id, tax_id, tax_id_type, legal_name,
            billing_address, billing_country, payment_terms_days, payment_currency,
            requires_po, requires_hes, current_po_number, current_hes_number,
            special_conditions, created_by, created_at, updated_at
          )
          VALUES (
            source.client_profile_id, source.client_id, source.hubspot_company_id, source.tax_id,
            source.tax_id_type, source.legal_name, source.billing_address,
            source.billing_country, source.payment_terms_days, source.payment_currency,
            source.requires_po, source.requires_hes, source.current_po_number,
            source.current_hes_number, source.special_conditions, source.created_by,
            source.created_at, source.updated_at
          )
      `, {
        clientProfileId,
        clientId: resolvedClient.clientId,
        hubspotCompanyId: hubspotCompanyId || clientProfileId,
        taxId: body.taxId ? normalizeString(body.taxId) : null,
        taxIdType,
        legalName,
        billingAddress: body.billingAddress ? normalizeString(body.billingAddress) : null,
        billingCountry: normalizeString(body.billingCountry) || 'CL',
        paymentTermsDays: toNumber(body.paymentTermsDays) || 30,
        paymentCurrency,
        requiresPo: Boolean(body.requiresPo),
        requiresHes: Boolean(body.requiresHes),
        currentPoNumber: body.currentPoNumber ? normalizeString(body.currentPoNumber) : null,
        currentHesNumber: body.currentHesNumber ? normalizeString(body.currentHesNumber) : null,
        specialConditions: body.specialConditions ? normalizeString(body.specialConditions) : null,
        createdBy: tenant.userId || null
      })
    }

    return NextResponse.json({ clientProfileId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
