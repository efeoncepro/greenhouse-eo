import { NextResponse } from 'next/server'

import {
  getHubspotCompaniesExpressions,
  getHubspotDealsExpressions,
  getHubspotTableColumns
} from '@/lib/finance/hubspot'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertValidCurrency,
  assertValidTaxIdType,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toTimestampString,
  toDateString,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface ClientProfileRow {
  client_id: string | null
  greenhouse_client_name: string | null
  client_profile_id: string
  hubspot_company_id: string | null
  company_name: string | null
  company_domain: string | null
  company_country: string | null
  business_line: string | null
  service_modules_raw: string | null
  tax_id: string | null
  tax_id_type: string | null
  legal_name: string | null
  billing_address: string | null
  billing_country: string | null
  payment_terms_days: unknown
  payment_currency: string
  requires_po: boolean
  requires_hes: boolean
  current_po_number: string | null
  current_hes_number: string | null
  finance_contacts: unknown
  special_conditions: string | null
  created_by: string | null
  created_at: unknown
  updated_at: unknown
}

interface InvoiceRow {
  income_id: string
  invoice_number: string | null
  invoice_date: unknown
  due_date: unknown
  total_amount: unknown
  currency: string
  payment_status: string
  amount_paid: unknown
}

interface DealRow {
  deal_id: string | null
  deal_name: string | null
  deal_stage: string | null
  pipeline: string | null
  amount: unknown
  close_date: unknown
}

const parseFinanceContacts = (value: unknown) => {
  try {
    if (!value) {
      return []
    }

    const parsed = typeof value === 'string' ? JSON.parse(value) : value

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const parseServiceModules = (value: string | null) =>
  (value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { id } = await params
  const projectId = getFinanceProjectId()
  const companyColumns = await getHubspotTableColumns('companies')
  const dealColumns = await getHubspotTableColumns('deals')
  const companyExpressions = getHubspotCompaniesExpressions(companyColumns)
  const dealExpressions = getHubspotDealsExpressions(dealColumns)

  const rows = await runFinanceQuery<ClientProfileRow>(`
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
    )
    SELECT
      gc.client_id,
      gc.client_name AS greenhouse_client_name,
      COALESCE(fp_client.client_profile_id, fp_legacy.client_profile_id, fp_hubspot.client_profile_id, CAST(gc.client_id AS STRING), CAST(gc.hubspot_company_id AS STRING)) AS client_profile_id,
      COALESCE(fp_client.hubspot_company_id, fp_legacy.hubspot_company_id, fp_hubspot.hubspot_company_id, CAST(gc.hubspot_company_id AS STRING)) AS hubspot_company_id,
      ${companyExpressions.nameExpr} AS company_name,
      ${companyExpressions.domainExpr} AS company_domain,
      ${companyExpressions.countryExpr} AS company_country,
      ${companyExpressions.businessLineExpr} AS business_line,
      ${companyExpressions.servicesExpr} AS service_modules_raw,
      COALESCE(fp_client.tax_id, fp_legacy.tax_id, fp_hubspot.tax_id) AS tax_id,
      COALESCE(fp_client.tax_id_type, fp_legacy.tax_id_type, fp_hubspot.tax_id_type) AS tax_id_type,
      COALESCE(fp_client.legal_name, fp_legacy.legal_name, fp_hubspot.legal_name, ${companyExpressions.nameExpr}, gc.client_name) AS legal_name,
      COALESCE(fp_client.billing_address, fp_legacy.billing_address, fp_hubspot.billing_address) AS billing_address,
      COALESCE(fp_client.billing_country, fp_legacy.billing_country, fp_hubspot.billing_country, 'CL') AS billing_country,
      COALESCE(fp_client.payment_terms_days, fp_legacy.payment_terms_days, fp_hubspot.payment_terms_days, 30) AS payment_terms_days,
      COALESCE(fp_client.payment_currency, fp_legacy.payment_currency, fp_hubspot.payment_currency, 'CLP') AS payment_currency,
      COALESCE(fp_client.requires_po, fp_legacy.requires_po, fp_hubspot.requires_po, FALSE) AS requires_po,
      COALESCE(fp_client.requires_hes, fp_legacy.requires_hes, fp_hubspot.requires_hes, FALSE) AS requires_hes,
      COALESCE(fp_client.current_po_number, fp_legacy.current_po_number, fp_hubspot.current_po_number) AS current_po_number,
      COALESCE(fp_client.current_hes_number, fp_legacy.current_hes_number, fp_hubspot.current_hes_number) AS current_hes_number,
      COALESCE(fp_client.finance_contacts, fp_legacy.finance_contacts, fp_hubspot.finance_contacts) AS finance_contacts,
      COALESCE(fp_client.special_conditions, fp_legacy.special_conditions, fp_hubspot.special_conditions) AS special_conditions,
      COALESCE(fp_client.created_by, fp_legacy.created_by, fp_hubspot.created_by) AS created_by,
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
      AND (
        gc.client_id = @lookupId
        OR CAST(gc.hubspot_company_id AS STRING) = @lookupId
        OR fp_client.client_id = @lookupId
        OR fp_client.client_profile_id = @lookupId
        OR fp_legacy.client_id = @lookupId
        OR fp_legacy.client_profile_id = @lookupId
        OR fp_hubspot.client_profile_id = @lookupId
      )
    LIMIT 1
  `, { lookupId: id })

  if (rows.length === 0) {
    const fallbackRows = await runFinanceQuery<ClientProfileRow>(`
      SELECT
        fp.client_id AS client_id,
        NULL AS greenhouse_client_name,
        fp.client_profile_id,
        fp.hubspot_company_id,
        ${companyExpressions.nameExpr} AS company_name,
        ${companyExpressions.domainExpr} AS company_domain,
        ${companyExpressions.countryExpr} AS company_country,
        ${companyExpressions.businessLineExpr} AS business_line,
        ${companyExpressions.servicesExpr} AS service_modules_raw,
        fp.tax_id,
        fp.tax_id_type,
        COALESCE(fp.legal_name, ${companyExpressions.nameExpr}) AS legal_name,
        fp.billing_address,
        fp.billing_country,
        fp.payment_terms_days,
        fp.payment_currency,
        fp.requires_po,
        fp.requires_hes,
        fp.current_po_number,
        fp.current_hes_number,
        fp.finance_contacts,
        fp.special_conditions,
        fp.created_by,
        fp.created_at,
        fp.updated_at
      FROM \`${projectId}.greenhouse.fin_client_profiles\` fp
      LEFT JOIN \`${projectId}.hubspot_crm.companies\` hc
        ON fp.hubspot_company_id = ${companyExpressions.idExpr}
      WHERE fp.client_profile_id = @lookupId OR fp.hubspot_company_id = @lookupId
      LIMIT 1
    `, { lookupId: id })

    if (fallbackRows.length === 0) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    rows.push(fallbackRows[0])
  }

  const row = rows[0]

  const financeContacts = parseFinanceContacts(row.finance_contacts)
  const hubspotCompanyId = row.hubspot_company_id ? normalizeString(row.hubspot_company_id) : null
  const clientProfileId = normalizeString(row.client_profile_id)
  const clientId = row.client_id ? normalizeString(row.client_id) : null

  const invoices = await runFinanceQuery<InvoiceRow>(`
    SELECT income_id, invoice_number, invoice_date, due_date, total_amount, currency, payment_status, amount_paid
    FROM \`${projectId}.greenhouse.fin_income\`
    WHERE client_id = @clientId OR client_profile_id = @clientProfileId OR hubspot_company_id = @hubspotCompanyId
    ORDER BY invoice_date DESC
    LIMIT 50
  `, { clientId, clientProfileId, hubspotCompanyId })

  const summaryRows = await runFinanceQuery<{
    total_receivable: unknown
    active_invoices_count: unknown
    overdue_invoices_count: unknown
  }>(`
    SELECT
      COALESCE(
        SUM(
          COALESCE(total_amount_clp, 0) * SAFE_DIVIDE(
            GREATEST(COALESCE(total_amount, 0) - COALESCE(amount_paid, 0), 0),
            NULLIF(COALESCE(total_amount, 0), 0)
          )
        ),
        0
      ) AS total_receivable,
      COUNTIF(payment_status IN ('pending', 'overdue', 'partial')) AS active_invoices_count,
      COUNTIF(payment_status = 'overdue') AS overdue_invoices_count
    FROM \`${projectId}.greenhouse.fin_income\`
    WHERE client_id = @clientId OR client_profile_id = @clientProfileId OR hubspot_company_id = @hubspotCompanyId
  `, { clientId, clientProfileId, hubspotCompanyId })

  const summary = summaryRows[0]

  const deals = dealExpressions.canQueryDeals && hubspotCompanyId
    ? await runFinanceQuery<DealRow>(`
      SELECT
        ${dealExpressions.idExpr} AS deal_id,
        ${dealExpressions.nameExpr} AS deal_name,
        ${dealExpressions.stageExpr} AS deal_stage,
        ${dealExpressions.pipelineExpr} AS pipeline,
        ${dealExpressions.amountExpr} AS amount,
        ${dealExpressions.closeDateExpr} AS close_date
      FROM \`${projectId}.hubspot_crm.deals\` d
      WHERE ${dealExpressions.companyIdExpr} = @hubspotCompanyId
        AND ${dealExpressions.archivedFilter}
      ORDER BY ${dealExpressions.closeDateExpr === 'NULL' ? 'deal_id' : 'close_date'} DESC
      LIMIT 25
    `, { hubspotCompanyId })
    : []

  return NextResponse.json({
    company: {
      clientId: row.client_id ? normalizeString(row.client_id) : null,
      greenhouseClientName: row.greenhouse_client_name ? normalizeString(row.greenhouse_client_name) : null,
      hubspotCompanyId,
      companyName: row.company_name ? normalizeString(row.company_name) : null,
      companyDomain: row.company_domain ? normalizeString(row.company_domain) : null,
      companyCountry: row.company_country ? normalizeString(row.company_country) : null,
      businessLine: row.business_line ? normalizeString(row.business_line) : null,
      serviceModules: parseServiceModules(row.service_modules_raw)
    },
    financialProfile: {
      clientId,
      clientProfileId,
      hubspotCompanyId,
      companyName: row.company_name ? normalizeString(row.company_name) : null,
      taxId: row.tax_id ? normalizeString(row.tax_id) : null,
      taxIdType: row.tax_id_type ? normalizeString(row.tax_id_type) : 'RUT',
      legalName: row.legal_name ? normalizeString(row.legal_name) : null,
      billingAddress: row.billing_address ? normalizeString(row.billing_address) : null,
      billingCountry: row.billing_country ? normalizeString(row.billing_country) : 'CL',
      paymentTermsDays: toNumber(row.payment_terms_days),
      paymentCurrency: normalizeString(row.payment_currency),
      requiresPo: normalizeBoolean(row.requires_po),
      requiresHes: normalizeBoolean(row.requires_hes),
      currentPoNumber: row.current_po_number ? normalizeString(row.current_po_number) : null,
      currentHesNumber: row.current_hes_number ? normalizeString(row.current_hes_number) : null,
      financeContacts,
      specialConditions: row.special_conditions ? normalizeString(row.special_conditions) : null,
      createdBy: row.created_by ? normalizeString(row.created_by) : null,
      createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
      updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
    },
    summary: {
      totalReceivable: toNumber(summary?.total_receivable),
      activeInvoicesCount: toNumber(summary?.active_invoices_count),
      overdueInvoicesCount: toNumber(summary?.overdue_invoices_count)
    },
    invoices: invoices.map(inv => ({
      incomeId: normalizeString(inv.income_id),
      invoiceNumber: inv.invoice_number ? normalizeString(inv.invoice_number) : null,
      invoiceDate: toDateString(inv.invoice_date as string | { value?: string } | null),
      dueDate: toDateString(inv.due_date as string | { value?: string } | null),
      totalAmount: toNumber(inv.total_amount),
      currency: normalizeString(inv.currency),
      paymentStatus: normalizeString(inv.payment_status),
      amountPaid: toNumber(inv.amount_paid),
      amountPending: toNumber(inv.total_amount) - toNumber(inv.amount_paid)
    })),
    deals: deals.map(deal => ({
      dealId: deal.deal_id ? normalizeString(deal.deal_id) : null,
      dealName: deal.deal_name ? normalizeString(deal.deal_name) : null,
      dealStage: deal.deal_stage ? normalizeString(deal.deal_stage) : null,
      pipeline: deal.pipeline ? normalizeString(deal.pipeline) : null,
      amount: toNumber(deal.amount),
      closeDate: toDateString(deal.close_date as string | { value?: string } | null)
    }))
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const { id: clientProfileId } = await params
    const body = await request.json()
    const projectId = getFinanceProjectId()

    const existing = await runFinanceQuery<{
      client_profile_id: string
      client_id: string | null
      hubspot_company_id: string | null
    }>(`
      SELECT client_profile_id, client_id, hubspot_company_id
      FROM \`${projectId}.greenhouse.fin_client_profiles\`
      WHERE client_profile_id = @clientProfileId
    `, { clientProfileId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    const updates: string[] = []
    const updateParams: Record<string, unknown> = { clientProfileId }
    const existingProfile = existing[0]

    if (body.clientId !== undefined || body.hubspotCompanyId !== undefined || body.clientProfileId !== undefined) {
      const resolvedClient = await resolveFinanceClientContext({
        clientId: body.clientId ?? existingProfile.client_id,
        clientProfileId: body.clientProfileId ?? existingProfile.client_profile_id,
        hubspotCompanyId: body.hubspotCompanyId ?? existingProfile.hubspot_company_id
      })

      updates.push('client_id = @clientId')
      updateParams.clientId = resolvedClient.clientId

      updates.push('hubspot_company_id = @hubspotCompanyId')
      updateParams.hubspotCompanyId = resolvedClient.hubspotCompanyId
    }

    const stringFields: [string, string][] = [
      ['legalName', 'legal_name'], ['taxId', 'tax_id'],
      ['billingAddress', 'billing_address'], ['billingCountry', 'billing_country'],
      ['currentPoNumber', 'current_po_number'],
      ['currentHesNumber', 'current_hes_number'], ['specialConditions', 'special_conditions']
    ]

    for (const [bodyKey, dbCol] of stringFields) {
      if (body[bodyKey] !== undefined) {
        updateParams[bodyKey] = body[bodyKey] ? normalizeString(body[bodyKey]) : null
        updates.push(`${dbCol} = @${bodyKey}`)
      }
    }

    if (body.paymentTermsDays !== undefined) {
      updates.push('payment_terms_days = @paymentTermsDays')
      updateParams.paymentTermsDays = toNumber(body.paymentTermsDays) || 30
    }

    if (body.taxIdType !== undefined) {
      updates.push('tax_id_type = @taxIdType')
      updateParams.taxIdType = body.taxIdType ? assertValidTaxIdType(body.taxIdType) : null
    }

    if (body.paymentCurrency !== undefined) {
      updates.push('payment_currency = @paymentCurrency')
      updateParams.paymentCurrency = body.paymentCurrency ? assertValidCurrency(body.paymentCurrency) : null
    }

    if (body.requiresPo !== undefined) {
      updates.push('requires_po = @requiresPo')
      updateParams.requiresPo = Boolean(body.requiresPo)
    }

    if (body.requiresHes !== undefined) {
      updates.push('requires_hes = @requiresHes')
      updateParams.requiresHes = Boolean(body.requiresHes)
    }

    if (body.financeContacts !== undefined) {
      updates.push('finance_contacts = PARSE_JSON(@financeContacts)')
      updateParams.financeContacts = JSON.stringify(Array.isArray(body.financeContacts) ? body.financeContacts : [])
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_client_profiles\`
      SET ${updates.join(', ')}
      WHERE client_profile_id = @clientProfileId
    `, updateParams)

    return NextResponse.json({ clientProfileId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
