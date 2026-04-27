import { describe, expect, it } from 'vitest'

import {
  extractPostgresErrorTags,
  isPostgresError,
  translatePostgresError
} from '@/lib/finance/postgres-error-translator'
import { FinanceValidationError } from '@/lib/finance/shared'

describe('isPostgresError', () => {
  it('detects 5-character SQLSTATE codes', () => {
    expect(isPostgresError({ code: '23503' })).toBe(true)
    expect(isPostgresError({ code: '23505', constraint: 'foo' })).toBe(true)
  })

  it('rejects non-PG shapes', () => {
    expect(isPostgresError(new Error('boom'))).toBe(false)
    expect(isPostgresError(null)).toBe(false)
    expect(isPostgresError({ code: 'NOTSQL' })).toBe(false)
    expect(isPostgresError({ code: 23503 })).toBe(false)
  })
})

describe('translatePostgresError', () => {
  it('maps 23503 (foreign_key_violation) to a 422 with friendly accounts_provider_slug_fk message', () => {
    const translated = translatePostgresError({
      code: '23503',
      constraint: 'accounts_provider_slug_fk',
      table: 'accounts',
      column: 'provider_slug'
    })

    expect(translated).toBeInstanceOf(FinanceValidationError)
    expect(translated?.statusCode).toBe(422)
    expect(translated?.code).toBe('foreign_key_violation')
    expect(translated?.message).toMatch(/catálogo canónico/i)
    expect(translated?.details).toMatchObject({
      constraint: 'accounts_provider_slug_fk',
      table: 'accounts',
      column: 'provider_slug'
    })
  })

  it('maps 23503 with unknown constraint to a generic 422', () => {
    const translated = translatePostgresError({ code: '23503', constraint: 'whatever_fk' })

    expect(translated?.statusCode).toBe(422)
    expect(translated?.code).toBe('foreign_key_violation')
    expect(translated?.message).toMatch(/Referencia inválida/i)
  })

  it('maps 23505 (unique_violation) to a 409', () => {
    const translated = translatePostgresError({ code: '23505', constraint: 'accounts_pkey' })

    expect(translated?.statusCode).toBe(409)
    expect(translated?.code).toBe('unique_violation')
  })

  it('maps 23502 (not_null_violation) and includes the column name', () => {
    const translated = translatePostgresError({ code: '23502', column: 'currency' })

    expect(translated?.statusCode).toBe(422)
    expect(translated?.code).toBe('not_null_violation')
    expect(translated?.message).toContain('"currency"')
  })

  it('maps 23514 (check_violation)', () => {
    const translated = translatePostgresError({
      code: '23514',
      constraint: 'payment_provider_catalog_type_known'
    })

    expect(translated?.statusCode).toBe(422)
    expect(translated?.code).toBe('check_violation')
    expect(translated?.message).toMatch(/tipo de proveedor/i)
  })

  it('returns null for unknown PG codes so caller can fall back to 500 + capture', () => {
    expect(translatePostgresError({ code: '08000' })).toBeNull()
    expect(translatePostgresError(new Error('boom'))).toBeNull()
    expect(translatePostgresError(null)).toBeNull()
  })
})

describe('extractPostgresErrorTags', () => {
  it('exposes pg_code and any present constraint/table/column for telemetry', () => {
    expect(
      extractPostgresErrorTags({
        code: '23503',
        constraint: 'accounts_provider_slug_fk',
        table: 'accounts',
        column: 'provider_slug'
      })
    ).toEqual({
      pg_code: '23503',
      pg_constraint: 'accounts_provider_slug_fk',
      pg_table: 'accounts',
      pg_column: 'provider_slug'
    })
  })

  it('omits unset fields', () => {
    expect(extractPostgresErrorTags({ code: '23505' })).toEqual({ pg_code: '23505' })
  })

  it('returns empty object for non-PG errors', () => {
    expect(extractPostgresErrorTags(new Error('boom'))).toEqual({})
  })
})
