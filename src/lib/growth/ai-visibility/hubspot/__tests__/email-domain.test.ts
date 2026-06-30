import { describe, expect, it } from 'vitest'

import { classifyEmailDomain, extractEmailDomain, isCorporateEmail } from '../email-domain'

describe('extractEmailDomain', () => {
  it('extrae y normaliza el dominio', () => {
    expect(extractEmailDomain('Juan@Acme.COM')).toBe('acme.com')
    expect(extractEmailDomain('  ana@sub.acme.cl  ')).toBe('sub.acme.cl')
  })

  it('toma el dominio después del último @', () => {
    expect(extractEmailDomain('weird@local@acme.com')).toBe('acme.com')
  })

  it('devuelve null para emails inválidos', () => {
    expect(extractEmailDomain('')).toBeNull()
    expect(extractEmailDomain(null)).toBeNull()
    expect(extractEmailDomain(undefined)).toBeNull()
    expect(extractEmailDomain('sin-arroba.com')).toBeNull()
    expect(extractEmailDomain('@acme.com')).toBeNull()
    expect(extractEmailDomain('juan@')).toBeNull()
    expect(extractEmailDomain('juan@localhost')).toBeNull()
    expect(extractEmailDomain('juan@acme.')).toBeNull()
    expect(extractEmailDomain('juan@ acme.com')).toBeNull()
  })
})

describe('classifyEmailDomain', () => {
  it('clasifica dominios corporativos como corporate', () => {
    const result = classifyEmailDomain('juan@acme.com')

    expect(result).toEqual({ domain: 'acme.com', classification: 'corporate', isCorporate: true })
  })

  it('clasifica free providers como personal (no crea company)', () => {
    for (const email of [
      'a@gmail.com',
      'b@hotmail.com',
      'c@outlook.cl',
      'd@yahoo.com.mx',
      'e@icloud.com',
      'f@proton.me',
    ]) {
      const result = classifyEmailDomain(email)

      expect(result.classification, email).toBe('personal')
      expect(result.isCorporate, email).toBe(false)
    }
  })

  it('clasifica dominios desechables como personal', () => {
    expect(classifyEmailDomain('x@mailinator.com').classification).toBe('personal')
  })

  it('default conservador: email inválido ⇒ personal con domain null', () => {
    const result = classifyEmailDomain('no-es-un-email')

    expect(result).toEqual({ domain: null, classification: 'personal', isCorporate: false })
  })

  it('es case-insensitive para la detección de free providers', () => {
    expect(classifyEmailDomain('Juan@GMAIL.com').classification).toBe('personal')
  })
})

describe('isCorporateEmail', () => {
  it('es true solo para dominios corporativos', () => {
    expect(isCorporateEmail('juan@acme.com')).toBe(true)
    expect(isCorporateEmail('juan@gmail.com')).toBe(false)
    expect(isCorporateEmail('basura')).toBe(false)
  })
})
