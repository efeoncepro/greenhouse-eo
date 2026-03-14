import { NextResponse } from 'next/server'

import { getHubspotCompaniesExpressions, getHubspotTableColumns } from '@/lib/finance/hubspot'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
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

interface ClientListRow {
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

const parseServiceModules = (value: string | null) =>
  (value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)

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
  const projectId = getFinanceProjectId()
  const companyColumns = await getHubspotTableColumns('companies')
  const companyExpressions = getHubspotCompaniesExpressions(companyColumns)

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
    base_clients AS (
      SELECT
        gc.client_id,
        gc.client_name AS greenhouse_client_name,
        CAST(gc.hubspot_company_id AS STRING) AS hubspot_company_id,
        COALESCE(fp_client.client_profile_id, fp_legacy.client_profile_id, fp_hubspot.client_profile_id, CAST(gc.client_id AS STRING), CAST(gc.hubspot_company_id AS STRING)) AS client_profile_id,
        COALESCE(fp_client.legal_name, fp_legacy.legal_name, fp_hubspot.legal_name, ${companyExpressions.nameExpr}, gc.client_name) AS legal_name,
        COALESCE(fp_client.tax_id, fp_legacy.tax_id, fp_hubspot.tax_id) AS tax_id,
        COALESCE(fp_client.payment_terms_days, fp_legacy.payment_terms_days, fp_hubspot.payment_terms_days, 30) AS payment_terms_days,
        COALESCE(fp_client.payment_currency, fp_legacy.payment_currency, fp_hubspot.payment_currency, 'CLP') AS payment_currency,
        COALESCE(fp_client.requires_po, fp_legacy.requires_po, fp_hubspot.requires_po, FALSE) AS requires_po,
        COALESCE(fp_client.requires_hes, fp_legacy.requires_hes, fp_hubspot.requires_hes, FALSE) AS requires_hes,
        ${companyExpressions.nameExpr} AS company_name,
        ${companyExpressions.domainExpr} AS company_domain,
        ${companyExpressions.countryExpr} AS company_country,
        ${companyExpressions.businessLineExpr} AS business_line,
        ${companyExpressions.servicesExpr} AS service_modules_raw,
        COALESCE(fp_client.created_at, fp_legacy.created_at, fp_hubspot.created_at) AS created_at,
        COALESCE(fp_client.updated_at, fp_legacy.updated_at, fp_hubspot.updated_at) AS updated_at
      FROM \`${projectId}.greenhouse.clients\` gc
      LEFT JOIN profile_by_client fp_client
        ON fp_client.client_id = gc.client_id
      LEFT JOIN profile_by_legacy_id fp_legacy
        ON fp_legacy.client_profile_id = gc.client_id
      LEFT JOIN profile_by_hubspot fp_hubspot
        ON fp_hubspot.hubspot_company_id = CAST(gc.hubspot_company_id AS STRING)
      LEFT JOIN \`${projectId}.hubspot_crm.companies\` hc
        ON CAST(gc.hubspot_company_id AS STRING) = ${companyExpressions.idExpr}
      WHERE gc.active = TRUE
        AND ${companyExpressions.archivedFilter}
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
    , client_keys AS (
      SELECT bc.client_id, client_key
      FROM base_clients bc,
      UNNEST([CAST(bc.client_id AS STRING), bc.client_profile_id, bc.hubspot_company_id]) AS client_key
      WHERE client_key IS NOT NULL
        AND client_key != ''
    ),
    open_income AS (
      SELECT income_id, outstanding_amount, income_key
      FROM (
        SELECT
          income_id,
          GREATEST(COALESCE(total_amount, 0) - COALESCE(amount_paid, 0), 0) AS outstanding_amount,
          [client_id, client_profile_id, hubspot_company_id] AS income_keys
        FROM \`${projectId}.greenhouse.fin_income\`
        WHERE payment_status IN ('pending', 'overdue', 'partial')
      ),
      UNNEST(income_keys) AS income_key
      WHERE income_key IS NOT NULL
        AND income_key != ''
    ),
    client_income_matches AS (
      SELECT DISTINCT ck.client_id, oi.income_id, oi.outstanding_amount
      FROM client_keys ck
      INNER JOIN open_income oi
        ON oi.income_key = ck.client_key
    ),
    client_income_rollup AS (
      SELECT
        client_id,
        COALESCE(SUM(outstanding_amount), 0) AS total_receivable,
        COUNT(*) AS active_invoices_count
      FROM client_income_matches
      GROUP BY client_id
    )
    SELECT
      bc.*,
      COALESCE(cir.total_receivable, 0) AS total_receivable,
      COALESCE(cir.active_invoices_count, 0) AS active_invoices_count
    FROM base_clients bc
    LEFT JOIN client_income_rollup cir
      ON cir.client_id = bc.client_id
    WHERE TRUE ${filters}
    ORDER BY COALESCE(bc.company_name, bc.legal_name, bc.greenhouse_client_name) ASC
    LIMIT @limit OFFSET @offset
  `, { ...params, limit: pageSize, offset: (page - 1) * pageSize })

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
      totalReceivable: toNumber(row.total_receivable),
      activeInvoicesCount: toNumber(row.active_invoices_count),
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

  await ensureFinanceInfrastructure()

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

    return NextResponse.json({ clientProfileId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
