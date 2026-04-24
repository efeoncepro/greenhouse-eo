import { NextResponse } from 'next/server'

import { assertFinanceBigQueryReadiness } from '@/lib/finance/schema'
import { assertPayrollBigQueryReadiness } from '@/lib/payroll/schema'
import {
  EXPENSE_DRAWER_CATEGORIES,
  EXPENSE_DRAWER_TAB_LABELS,
  EXPENSE_DRAWER_TABS,
  EXPENSE_SOURCE_TYPES,
  PAYMENT_PROVIDERS,
  PAYMENT_RAILS,
  RECURRENCE_FREQUENCIES
} from '@/lib/finance/expense-taxonomy'
import {
  ACCOUNT_TYPES,
  PAYMENT_METHODS,
  SERVICE_LINES,
  SOCIAL_SECURITY_TYPES,
  TAX_TYPES,
  normalizeString,
  runFinanceQuery,
  getFinanceProjectId
} from '@/lib/finance/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  listFinanceSuppliersFromPostgres,
  listFinanceAccountsFromPostgres,
  shouldFallbackFromFinancePostgres
} from '@/lib/finance/postgres-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type FinanceMemberOption = {
  member_id: string
  display_name: string | null
}

type FinanceSpaceOption = {
  space_id: string
  space_name: string | null
  client_id: string | null
  organization_id: string | null
}

type SupplierToolLinkRow = {
  supplier_id: string
  tool_id: string
  tool_name: string
  provider_name: string | null
}

const DEFAULT_SOCIAL_SECURITY_INSTITUTIONS = [
  'AFP Capital',
  'AFP Cuprum',
  'AFP Habitat',
  'AFP Modelo',
  'AFP PlanVital',
  'AFP ProVida',
  'AFC Chile',
  'Caja Los Andes',
  'Fonasa',
  'Isapre',
  'Mutual de Seguridad'
]

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await assertFinanceBigQueryReadiness({ tables: ['fin_suppliers', 'fin_accounts', 'fin_expenses'] })
  const projectId = getFinanceProjectId()

  // ── Postgres-first for accounts ──
  let suppliersList:
    | { supplierId: string; legalName: string; tradeName: string | null; paymentCurrency: string | null }[]
    | null = null
  let accountsList: { accountId: string; accountName: string; currency: string; accountType: string }[] | null = null

  try {
    const pgSuppliers = await listFinanceSuppliersFromPostgres({
      active: true,
      page: 1,
      pageSize: 1000
    })

    suppliersList = pgSuppliers.items.map(s => ({
      supplierId: s.supplierId,
      legalName: s.legalName,
      tradeName: s.tradeName,
      paymentCurrency: s.paymentCurrency
    }))
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  try {
    const pgAccounts = await listFinanceAccountsFromPostgres()

    accountsList = pgAccounts.map(a => ({
      accountId: a.accountId,
      accountName: a.accountName,
      currency: a.currency,
      accountType: ACCOUNT_TYPES.includes(normalizeString(a.accountType) as (typeof ACCOUNT_TYPES)[number])
        ? normalizeString(a.accountType)
        : 'other'
    }))
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  const [suppliers, bqAccounts, priorInstitutions, payrollInstitutions, members, spaces, supplierToolLinks] = await Promise.all([
    suppliersList
      ? Promise.resolve(null)
      : runFinanceQuery<{
          supplier_id: string
          legal_name: string
          trade_name: string | null
          payment_currency: string | null
        }>(`
          SELECT supplier_id, legal_name, trade_name, payment_currency
          FROM \`${projectId}.greenhouse.fin_suppliers\`
          WHERE is_active = TRUE
          ORDER BY COALESCE(trade_name, legal_name) ASC
        `),
    accountsList ? Promise.resolve(null) : runFinanceQuery<{
      account_id: string
      account_name: string
      currency: string
      account_type: string
    }>(`
      SELECT account_id, account_name, currency, account_type
      FROM \`${projectId}.greenhouse.fin_accounts\`
      WHERE is_active = TRUE
      ORDER BY account_name ASC
    `),
    runFinanceQuery<{ institution: string | null }>(`
      SELECT DISTINCT social_security_institution AS institution
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE social_security_institution IS NOT NULL
        AND TRIM(social_security_institution) != ''
    `),
    assertPayrollBigQueryReadiness({ tables: ['compensation_versions'] })
      .then(() =>
        runFinanceQuery<{ institution: string | null }>(`
          SELECT DISTINCT institution
          FROM (
            SELECT afp_name AS institution
            FROM \`${projectId}.greenhouse.compensation_versions\`
            WHERE afp_name IS NOT NULL AND TRIM(afp_name) != ''
            UNION ALL
            SELECT
              CASE
                WHEN LOWER(TRIM(health_system)) = 'fonasa' THEN 'Fonasa'
                WHEN LOWER(TRIM(health_system)) = 'isapre' THEN 'Isapre'
                ELSE NULL
              END AS institution
            FROM \`${projectId}.greenhouse.compensation_versions\`
          )
          WHERE institution IS NOT NULL
        `)
      )
      .catch(() => []),
    runGreenhousePostgresQuery<FinanceMemberOption>(
      `
        SELECT member_id, display_name
        FROM greenhouse_core.members
        WHERE active = TRUE
        ORDER BY display_name ASC NULLS LAST, member_id ASC
      `
    ).catch(() => []),
    runGreenhousePostgresQuery<FinanceSpaceOption>(
      `
        SELECT space_id, space_name, client_id, organization_id
        FROM greenhouse_core.spaces
        WHERE active = TRUE
        ORDER BY space_name ASC NULLS LAST, space_id ASC
      `
    ).catch(() => []),
    runGreenhousePostgresQuery<SupplierToolLinkRow>(
      `
        SELECT
          t.fin_supplier_id AS supplier_id,
          t.tool_id,
          t.tool_name,
          p.provider_name
        FROM greenhouse_ai.tool_catalog AS t
        LEFT JOIN greenhouse_core.providers AS p
          ON p.provider_id = t.provider_id
        WHERE t.fin_supplier_id IS NOT NULL
          AND t.is_active = TRUE
        ORDER BY t.tool_name ASC
      `
    ).catch(() => [])
  ])

  const institutionSet = new Set(
    [...DEFAULT_SOCIAL_SECURITY_INSTITUTIONS, ...priorInstitutions, ...payrollInstitutions]
      .map(row => (typeof row === 'string' ? row : row.institution))
      .map(value => normalizeString(value))
      .filter(Boolean)
  )

  return NextResponse.json({
    suppliers:
      suppliersList ??
      (suppliers ?? []).map(row => ({
        supplierId: normalizeString(row.supplier_id),
        legalName: normalizeString(row.legal_name),
        tradeName: row.trade_name ? normalizeString(row.trade_name) : null,
        paymentCurrency: row.payment_currency ? normalizeString(row.payment_currency) : null
      })),
    accounts: accountsList ?? (bqAccounts ?? []).map(row => ({
      accountId: normalizeString(row.account_id),
      accountName: normalizeString(row.account_name),
      currency: normalizeString(row.currency),
      accountType: ACCOUNT_TYPES.includes(normalizeString(row.account_type) as (typeof ACCOUNT_TYPES)[number])
        ? normalizeString(row.account_type)
        : 'other'
    })),
    paymentMethods: PAYMENT_METHODS,
    paymentProviders: PAYMENT_PROVIDERS,
    paymentRails: PAYMENT_RAILS,
    sourceTypes: EXPENSE_SOURCE_TYPES,
    recurrenceFrequencies: RECURRENCE_FREQUENCIES,
    serviceLines: SERVICE_LINES,
    drawerTabs: EXPENSE_DRAWER_TABS.map(tab => ({
      value: tab,
      label: EXPENSE_DRAWER_TAB_LABELS[tab],
      categories: EXPENSE_DRAWER_CATEGORIES[tab]
    })),
    socialSecurityTypes: SOCIAL_SECURITY_TYPES,
    socialSecurityInstitutions: Array.from(institutionSet).sort((left, right) => left.localeCompare(right)),
    taxTypes: TAX_TYPES,
    members: members.map(row => ({
      memberId: normalizeString(row.member_id),
      displayName: normalizeString(row.display_name) || normalizeString(row.member_id)
    })),
    spaces: spaces.map(row => ({
      spaceId: normalizeString(row.space_id),
      spaceName: normalizeString(row.space_name) || normalizeString(row.space_id),
      clientId: row.client_id ? normalizeString(row.client_id) : null,
      organizationId: row.organization_id ? normalizeString(row.organization_id) : null
    })),
    supplierToolLinks: supplierToolLinks.map(row => ({
      supplierId: normalizeString(row.supplier_id),
      toolId: normalizeString(row.tool_id),
      toolName: normalizeString(row.tool_name),
      providerName: row.provider_name ? normalizeString(row.provider_name) : null
    }))
  })
}
