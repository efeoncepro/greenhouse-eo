const DEFAULT_MAX_BYTES_BILLED = 1_000_000_000

const toPositiveInteger = (value: string | undefined) => {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export const getBigQueryMaximumBytesBilled = (env: NodeJS.ProcessEnv = process.env) =>
  toPositiveInteger(env.BIGQUERY_MAX_BYTES_BILLED) ?? DEFAULT_MAX_BYTES_BILLED

export const getBigQueryQueryOptions = (
  overrides: {
    maximumBytesBilled?: number | string
    location?: string
  } = {}
) => ({
  location: overrides.location ?? 'US',
  maximumBytesBilled: String(overrides.maximumBytesBilled ?? getBigQueryMaximumBytesBilled())
})
