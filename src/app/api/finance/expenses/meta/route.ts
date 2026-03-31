import { NextResponse } from 'next/server'

import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
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
import {
  listFinanceSuppliersFromPostgres,
  listFinanceAccountsFromPostgres,
  shouldFallbackFromFinancePostgres
} from '@/lib/finance/postgres-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

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

  await ensureFinanceInfrastructure()
  await ensurePayrollInfrastructure()

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

  const [suppliers, bqAccounts, priorInstitutions, payrollInstitutions] = await Promise.all([
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
    serviceLines: SERVICE_LINES,
    socialSecurityTypes: SOCIAL_SECURITY_TYPES,
    socialSecurityInstitutions: Array.from(institutionSet).sort((left, right) => left.localeCompare(right)),
    taxTypes: TAX_TYPES
  })
}
