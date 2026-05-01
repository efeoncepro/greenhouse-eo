import 'server-only'

import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { normalizeNullableString } from '@/lib/payroll/shared'
import { buildPayrollTaxTableVersion } from '@/lib/payroll/tax-table-version-format'

type TaxTableVersionRow = {
  tax_table_version: string | null
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

  const { periodStart, nextPeriodStart } = buildPeriodMonthBounds(year, month)
  const canonicalVersion = buildPayrollTaxTableVersion(year, month)

  const rows = await runGreenhousePostgresQuery<TaxTableVersionRow>(
    `
      SELECT DISTINCT tax_table_version
      FROM greenhouse_payroll.chile_tax_brackets
      WHERE effective_from >= $1::date
        AND effective_from < $2::date
      ORDER BY
        CASE WHEN tax_table_version = $3 THEN 0 ELSE 1 END,
        tax_table_version ASC
    `,
    [periodStart, nextPeriodStart, canonicalVersion]
  )

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
