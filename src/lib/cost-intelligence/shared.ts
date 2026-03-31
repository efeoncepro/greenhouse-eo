import 'server-only'

export class CostIntelligenceValidationError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'CostIntelligenceValidationError'
    this.statusCode = statusCode
    this.details = details
  }
}

export { CostIntelligenceValidationError as CostIntelligenceError }

export const assertValidPeriodParts = (year: number, month: number) => {
  if (!Number.isInteger(year) || year < 2024) {
    throw new CostIntelligenceValidationError('year must be a valid integer.', 400)
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new CostIntelligenceValidationError('month must be between 1 and 12.', 400)
  }

  return { year, month }
}

export const toInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

export const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return fallback
}

export const toNullableString = (value: unknown) => {
  if (typeof value === 'string') {
    const normalized = value.trim()

    return normalized ? normalized : null
  }

  return null
}
