import 'server-only'

import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { normalizeNullableString } from '@/lib/payroll/shared'
import { buildPayrollTaxTableVersion } from '@/lib/payroll/tax-table-version-format'

type TaxTableVersionRow = {
  tax_table_version: string | null
}

type TaxTableRelationProbeRow = {
  exists: boolean | null
}

const isMissingTaxTableInfrastructureError = (error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : null

  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String(error.message).toLowerCase() : ''

  return code === '42P01' || code === '3F000' || message.includes('greenhouse_payroll.chile_tax_brackets')
}

const hasChileTaxTableRelation = async () => {
  const [row] = await runGreenhousePostgresQuery<TaxTableRelationProbeRow>(
    `
      SELECT to_regclass('greenhouse_payroll.chile_tax_brackets') IS NOT NULL AS exists
    `
  )

  return row?.exists === true
}

const buildPeriodMonthBounds = (year: number, month: number) => {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const next = new Date(Date.UTC(year, month, 1))

  return {
    periodStart: start.toISOString().slice(0, 10),
    nextPeriodStart: next.toISOString().slice(0, 10)
  }
}

export const listPayrollTaxTableVersionsForMonth = async ({
  year,
  month
}: {
  year: number
  month: number
}): Promise<string[]> => {
  if (!isGreenhousePostgresConfigured()) {
    return []
  }

  if (!(await hasChileTaxTableRelation())) {
    return []
  }

  const { periodStart, nextPeriodStart } = buildPeriodMonthBounds(year, month)
  const canonicalVersion = buildPayrollTaxTableVersion(year, month)

  const rows = await runGreenhousePostgresQuery<TaxTableVersionRow>(
    `
      SELECT tax_table_version
      FROM (
        SELECT
          tax_table_version,
          CASE WHEN tax_table_version = $3 THEN 0 ELSE 1 END AS sort_priority
        FROM greenhouse_payroll.chile_tax_brackets
        WHERE effective_from >= $1::date
          AND effective_from < $2::date
        GROUP BY tax_table_version
      ) AS available_versions
      ORDER BY
        sort_priority ASC,
        tax_table_version ASC
    `,
    [periodStart, nextPeriodStart, canonicalVersion]
  ).catch(error => {
    if (isMissingTaxTableInfrastructureError(error)) {
      return [] as TaxTableVersionRow[]
    }

    throw error
  })

  return (Array.isArray(rows) ? rows : [])
    .map(row => normalizeNullableString(row.tax_table_version))
    .filter((value): value is string => value != null)
}

export const resolvePayrollTaxTableVersion = async ({
  year,
  month,
  requestedVersion,
  allowMonthFallbackForRequestedVersion = false
}: {
  year: number
  month: number
  requestedVersion?: string | null
  allowMonthFallbackForRequestedVersion?: boolean
}): Promise<string | null> => {
  const normalizedRequestedVersion = normalizeNullableString(requestedVersion)
  const availableVersions = await listPayrollTaxTableVersionsForMonth({ year, month })

  if (availableVersions.length === 0) {
    return null
  }

  if (normalizedRequestedVersion) {
    if (availableVersions.includes(normalizedRequestedVersion)) {
      return normalizedRequestedVersion
    }

    return allowMonthFallbackForRequestedVersion && availableVersions.length === 1 ? availableVersions[0] : null
  }

  const canonicalVersion = buildPayrollTaxTableVersion(year, month)

  if (availableVersions.includes(canonicalVersion)) {
    return canonicalVersion
  }

  return availableVersions.length === 1 ? availableVersions[0] : null
}
