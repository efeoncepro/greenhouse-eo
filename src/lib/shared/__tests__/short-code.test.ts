import { describe, expect, it, vi } from 'vitest'

import { generateBase62Code, isUniqueViolation, withUniqueShortCode } from '@/lib/shared/short-code'

describe('generateBase62Code', () => {
  it('genera un código de la longitud pedida, solo base62', () => {
    const code = generateBase62Code(12)

    expect(code).toHaveLength(12)
    expect(code).toMatch(/^[A-Za-z0-9]{12}$/)
  })

  it('rechaza longitudes fuera de [6, 32] o no enteras', () => {
    expect(() => generateBase62Code(5)).toThrow()
    expect(() => generateBase62Code(33)).toThrow()
    expect(() => generateBase62Code(10.5)).toThrow()
  })
})

describe('isUniqueViolation', () => {
  it('detecta 23505 y solo 23505', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
    expect(isUniqueViolation({ code: '23503' })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation(new Error('x'))).toBe(false)
  })
})

describe('withUniqueShortCode', () => {
  it('resuelve al primer intento si no hay colisión', async () => {
    const persist = vi.fn(async (code: string) => `ok:${code}`)

    const result = await withUniqueShortCode({ length: 10 }, persist, isUniqueViolation)

    expect(result).toMatch(/^ok:[A-Za-z0-9]{10}$/)
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('reintenta ante colisión y luego resuelve con un código nuevo', async () => {
    let calls = 0

    const persist = vi.fn(async (code: string) => {
      calls += 1
      if (calls === 1) throw { code: '23505' }

      return `ok:${code}`
    })

    const result = await withUniqueShortCode({ length: 10 }, persist, isUniqueViolation)

    expect(result).toMatch(/^ok:/)
    expect(persist).toHaveBeenCalledTimes(2)
  })

  it('propaga sin reintentar un error que NO es colisión', async () => {
    const persist = vi.fn(async () => {
      throw { code: '23503' }
    })

    await expect(withUniqueShortCode({ length: 10 }, persist, isUniqueViolation)).rejects.toEqual({ code: '23503' })
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('agota los intentos y lanza', async () => {
    const persist = vi.fn(async () => {
      throw { code: '23505' }
    })

    await expect(
      withUniqueShortCode({ length: 10, maxAttempts: 3 }, persist, isUniqueViolation)
    ).rejects.toThrow(/unique short code after 3/)
    expect(persist).toHaveBeenCalledTimes(3)
  })
})
