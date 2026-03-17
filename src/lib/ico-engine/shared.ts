import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

// ─── Error Class ────────────────────────────────────────────────────────────

export class IcoEngineError extends Error {
  statusCode: number
  details?: unknown
  code?: string

  constructor(message: string, statusCode = 400, details?: unknown, code?: string) {
    super(message)
    this.name = 'IcoEngineError'
    this.statusCode = statusCode
    this.details = details
    this.code = code
  }
}

// ─── Type Coercion ──────────────────────────────────────────────────────────

export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object') {
    if (typeof (value as Record<string, unknown>).valueOf === 'function') {
      const primitive = (value as { valueOf: () => unknown }).valueOf()

      if (typeof primitive === 'number') return Number.isFinite(primitive) ? primitive : 0
      if (typeof primitive === 'string') {
        const parsed = Number(primitive)

        return Number.isFinite(parsed) ? parsed : 0
      }
    }

    if ('value' in value) return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()

  return value ? String(value).trim() : ''
}

export const toTimestampString = (value: { value?: string } | string | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value

  return typeof value.value === 'string' ? value.value : null
}

// ─── Query Runner ───────────────────────────────────────────────────────────

export const runIcoEngineQuery = async <T>(query: string, params?: Record<string, unknown>): Promise<T[]> => {
  const bigQuery = getBigQueryClient()

  const safeParams = params
    ? Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, value ?? ''])
      )
    : undefined

  const [rows] = await bigQuery.query({ query, params: safeParams })

  return rows as T[]
}

export const getIcoEngineProjectId = () => getBigQueryProjectId()

// ─── Response Helpers ───────────────────────────────────────────────────────

export const toIcoEngineErrorResponse = (error: unknown, fallbackMessage: string) => {
  const { NextResponse } = require('next/server') as typeof import('next/server')

  if (error instanceof IcoEngineError) {
    return NextResponse.json(
      { error: error.message, details: error.details ?? null },
      { status: error.statusCode }
    )
  }

  console.error(fallbackMessage, error)

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
