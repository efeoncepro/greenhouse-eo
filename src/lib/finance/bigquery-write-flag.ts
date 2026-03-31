import 'server-only'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const isFinanceBigQueryWriteEnabled = () => {
  const raw = process.env.FINANCE_BIGQUERY_WRITE_ENABLED

  if (!raw) return true

  return TRUE_VALUES.has(raw.trim().toLowerCase())
}

