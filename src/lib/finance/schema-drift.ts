import { NextResponse } from 'next/server'

const FINANCE_SCHEMA_DRIFT_ERROR_CODE = 'FINANCE_SCHEMA_DRIFT'

export const isFinanceSchemaDriftError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  const rawCode = String((error as Error & { code?: string | number }).code ?? '').toUpperCase()
  const numericCode = Number((error as Error & { code?: string | number }).code)

  return (
    rawCode === '42P01' ||
    rawCode === '42703' ||
    numericCode === 42703 ||
    (message.includes('relation') && message.includes('does not exist')) ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('table') && message.includes('does not exist'))
  )
}

export const financeSchemaDriftMessage = (surface: string) =>
  `Finance data for ${surface} is temporarily unavailable because the database schema is not ready.`

export const logFinanceSchemaDrift = (surface: string, error: unknown) => {
  console.error(`[finance] ${surface} degraded due to schema drift:`, error)
}

export const financeSchemaDriftResponse = <T extends Record<string, unknown>>(surface: string, payload: T) =>
  NextResponse.json({
    ...payload,
    degraded: true,
    errorCode: FINANCE_SCHEMA_DRIFT_ERROR_CODE,
    message: financeSchemaDriftMessage(surface)
  })
