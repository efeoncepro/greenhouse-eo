import { ENTITLEMENT_CAPABILITY_CATALOG } from '../../src/config/entitlements-catalog'
import { closeGreenhousePostgres, query } from '../../src/lib/db'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

type DeprecatedCandidateRow = {
  capability_key: string
  module: string
  allowed_actions: string[]
  introduced_at: Date | string
  role_defaults_count: number | string | bigint | null
  user_overrides_count: number | string | bigint | null
}

type CsvValue = string | number | bigint | Date | null | undefined | readonly string[]

const CATALOG_KEYS = ENTITLEMENT_CAPABILITY_CATALOG.map(definition => definition.key)

const CSV_HEADERS = [
  'capability_key',
  'module',
  'allowed_actions',
  'introduced_at',
  'role_defaults_count',
  'user_overrides_count',
  'active_grant_count'
] as const

const toCount = (value: number | string | bigint | null) => {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return Number.parseInt(value, 10)

  return value ?? 0
}

export const escapeCsvValue = (value: CsvValue) => {
  const normalized = Array.isArray(value)
    ? value.join('|')
    : value instanceof Date
      ? value.toISOString()
      : value == null
        ? ''
        : String(value)

  if (!/[",\n\r]/.test(normalized)) {
    return normalized
  }

  return `"${normalized.replaceAll('"', '""')}"`
}

export const toCsvLine = (values: readonly CsvValue[]) => values.map(escapeCsvValue).join(',')

const findDeprecatedCandidates = async () => {
  return query<DeprecatedCandidateRow>(
    `
      WITH ts_catalog(capability_key) AS (
        SELECT unnest($1::text[])
      ),
      role_default_counts AS (
        SELECT capability, COUNT(*)::int AS role_defaults_count
        FROM greenhouse_core.role_entitlement_defaults
        GROUP BY capability
      ),
      user_override_counts AS (
        SELECT capability, COUNT(*)::int AS user_overrides_count
        FROM greenhouse_core.user_entitlement_overrides
        WHERE (expires_at IS NULL OR expires_at > NOW())
          AND approval_status <> 'rejected'
        GROUP BY capability
      )
      SELECT
        cr.capability_key,
        cr.module,
        cr.allowed_actions,
        cr.introduced_at,
        COALESCE(rdc.role_defaults_count, 0)::int AS role_defaults_count,
        COALESCE(uoc.user_overrides_count, 0)::int AS user_overrides_count
      FROM greenhouse_core.capabilities_registry cr
      LEFT JOIN ts_catalog ts ON ts.capability_key = cr.capability_key
      LEFT JOIN role_default_counts rdc ON rdc.capability = cr.capability_key
      LEFT JOIN user_override_counts uoc ON uoc.capability = cr.capability_key
      WHERE cr.deprecated_at IS NULL
        AND ts.capability_key IS NULL
      ORDER BY
        (COALESCE(rdc.role_defaults_count, 0) + COALESCE(uoc.user_overrides_count, 0)) DESC,
        cr.introduced_at ASC,
        cr.capability_key ASC
    `,
    [CATALOG_KEYS]
  )
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  try {
    const rows = await findDeprecatedCandidates()

    console.log(toCsvLine(CSV_HEADERS))

    for (const row of rows) {
      const roleDefaultsCount = toCount(row.role_defaults_count)
      const userOverridesCount = toCount(row.user_overrides_count)

      console.log(toCsvLine([
        row.capability_key,
        row.module,
        row.allowed_actions,
        row.introduced_at,
        roleDefaultsCount,
        userOverridesCount,
        roleDefaultsCount + userOverridesCount
      ]))
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
