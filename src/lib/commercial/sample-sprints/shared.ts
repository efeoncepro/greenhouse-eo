import 'server-only'

export interface PgErrorLike {
  code?: string
  constraint?: string
  message?: string
}

export const toIsoDateKey = (value: Date | string, fieldName = 'date'): string => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${fieldName} must be a valid date.`)
    }

    return value.toISOString().slice(0, 10)
  }

  const trimmed = value.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format.`)
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new Error(`${fieldName} must be a real calendar date.`)
  }

  return trimmed
}

export const toDateString = (value: Date | string | null): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

export const toIsoTimestamp = (value: Date | string, fieldName = 'timestamp'): string => {
  const parsed = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid timestamp.`)
  }

  return parsed.toISOString()
}

export const toTimestampString = (value: Date | string | null): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

export const trimRequired = (value: string | undefined | null, fieldName: string): string => {
  const trimmed = value?.trim() ?? ''

  if (!trimmed) throw new Error(`${fieldName} is required.`)

  return trimmed
}

export const isUniqueConstraintError = (error: unknown): boolean => {
  const pgError = error as PgErrorLike

  return pgError?.code === '23505'
}
