import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toTimestampString,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface ClientListRow {
  client_profile_id: string
  hubspot_company_id: string
  legal_name: string | null
  tax_id: string | null
  payment_terms_days: unknown
  payment_currency: string
  requires_po: boolean
  requires_hes: boolean
  created_at: unknown
  updated_at: unknown
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
  const projectId = getFinanceProjectId()

  let filters = ''
  const params: Record<string, unknown> = {}

  if (requiresPo === 'true') {
    filters += ' AND cp.requires_po = TRUE'
  }

  if (requiresHes === 'true') {
    filters += ' AND cp.requires_hes = TRUE'
  }

  if (search) {
    filters += ' AND (LOWER(cp.legal_name) LIKE @search OR LOWER(cp.tax_id) LIKE @search OR LOWER(cp.client_profile_id) LIKE @search)'
    params.search = `%${search.toLowerCase()}%`
  }

  const countRows = await runFinanceQuery<{ total: number }>(`
    SELECT COUNT(*) AS total
    FROM \`${projectId}.greenhouse.fin_client_profiles\` cp
    WHERE TRUE ${filters}
  `, params)

  const total = toNumber(countRows[0]?.total)

  const rows = await runFinanceQuery<ClientListRow>(`
    SELECT
      cp.client_profile_id,
      cp.hubspot_company_id,
      cp.legal_name,
      cp.tax_id,
      cp.payment_terms_days,
      cp.payment_currency,
      cp.requires_po,
      cp.requires_hes,
      cp.created_at,
      cp.updated_at
    FROM \`${projectId}.greenhouse.fin_client_profiles\` cp
    WHERE TRUE ${filters}
    ORDER BY cp.legal_name ASC
    LIMIT @limit OFFSET @offset
  `, { ...params, limit: pageSize, offset: (page - 1) * pageSize })

  return NextResponse.json({
    items: rows.map(row => ({
      clientProfileId: normalizeString(row.client_profile_id),
      hubspotCompanyId: normalizeString(row.hubspot_company_id),
      legalName: row.legal_name ? normalizeString(row.legal_name) : null,
      taxId: row.tax_id ? normalizeString(row.tax_id) : null,
      paymentTermsDays: toNumber(row.payment_terms_days),
      paymentCurrency: normalizeString(row.payment_currency),
      requiresPo: normalizeBoolean(row.requires_po),
      requiresHes: normalizeBoolean(row.requires_hes),
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
    const hubspotCompanyId = body.hubspotCompanyId
      ? normalizeString(body.hubspotCompanyId)
      : null

    const clientProfileId = normalizeString(body.clientProfileId) || hubspotCompanyId

    if (!clientProfileId) {
      throw new FinanceValidationError('clientProfileId or hubspotCompanyId is required.')
    }

    const projectId = getFinanceProjectId()

    await runFinanceQuery(`
      MERGE \`${projectId}.greenhouse.fin_client_profiles\` AS target
      USING (
        SELECT
          @clientProfileId AS client_profile_id,
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
          client_profile_id, hubspot_company_id, tax_id, tax_id_type, legal_name,
          billing_address, billing_country, payment_terms_days, payment_currency,
          requires_po, requires_hes, current_po_number, current_hes_number,
          special_conditions, created_by, created_at, updated_at
        )
        VALUES (
          source.client_profile_id, source.hubspot_company_id, source.tax_id,
          source.tax_id_type, source.legal_name, source.billing_address,
          source.billing_country, source.payment_terms_days, source.payment_currency,
          source.requires_po, source.requires_hes, source.current_po_number,
          source.current_hes_number, source.special_conditions, source.created_by,
          source.created_at, source.updated_at
        )
    `, {
      clientProfileId,
      hubspotCompanyId: hubspotCompanyId || clientProfileId,
      taxId: body.taxId ? normalizeString(body.taxId) : null,
      taxIdType: body.taxIdType ? normalizeString(body.taxIdType) : 'RUT',
      legalName: body.legalName ? normalizeString(body.legalName) : null,
      billingAddress: body.billingAddress ? normalizeString(body.billingAddress) : null,
      billingCountry: normalizeString(body.billingCountry) || 'CL',
      paymentTermsDays: toNumber(body.paymentTermsDays) || 30,
      paymentCurrency: body.paymentCurrency ? normalizeString(body.paymentCurrency) : 'CLP',
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
