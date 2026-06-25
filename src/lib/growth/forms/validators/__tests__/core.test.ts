import { describe, expect, it } from 'vitest'

import { resolveValidatorName, validateFieldValue, validateFormValue } from '../core'

describe('email_syntax', () => {
  it('normaliza a lowercase + trim', () => {
    const r = validateFormValue('email_syntax', '  Nombre@Empresa.CL ')

    expect(r.valid).toBe(true)
    expect(r.normalized).toBe('nombre@empresa.cl')
  })

  it('rechaza formato inválido', () => {
    expect(validateFormValue('email_syntax', 'no-arroba').reasonCode).toBe('email_format')
  })
})

describe('e164_phone', () => {
  it('prefija calling code del país cuando falta +', () => {
    expect(validateFormValue('e164_phone', '912345678', { country: 'CL' }).normalized).toBe('+56912345678')
  })

  it('respeta el + explícito', () => {
    expect(validateFormValue('e164_phone', '+54 9 11 1234 5678').normalized).toBe('+5491112345678')
  })

  it('no duplica el calling code si ya está presente', () => {
    expect(validateFormValue('e164_phone', '56912345678', { country: 'CL' }).normalized).toBe('+56912345678')
  })

  it('rechaza un número fuera de rango E.164', () => {
    expect(validateFormValue('e164_phone', '+1').reasonCode).toBe('phone_format')
  })
})

describe('url', () => {
  it('antepone https:// si falta scheme', () => {
    expect(validateFormValue('url', 'tuempresa.com').normalized).toBe('https://tuempresa.com')
  })

  it('rechaza url inválida', () => {
    expect(validateFormValue('url', 'http://').reasonCode).toBe('url_format')
  })
})

describe('national_id', () => {
  it('CL valida dígito verificador', () => {
    expect(validateFormValue('national_id', '11.111.111-1', { country: 'CL' }).valid).toBe(true)
    expect(validateFormValue('national_id', '11.111.111-2', { country: 'CL' }).reasonCode).toBe('national_id_check_digit')
  })
})

describe('number / date / consent / text', () => {
  it('number normaliza a Number', () => {
    expect(validateFormValue('number', ' 42 ').normalized).toBe(42)
    expect(validateFormValue('number', 'x').reasonCode).toBe('number_format')
  })

  it('date exige ISO yyyy-mm-dd válido', () => {
    expect(validateFormValue('date', '2026-06-25').valid).toBe(true)
    expect(validateFormValue('date', '25/06/2026').reasonCode).toBe('date_format')
  })

  it('consent acepta true/"true"', () => {
    expect(validateFormValue('consent', true).valid).toBe(true)
    expect(validateFormValue('consent', false).reasonCode).toBe('consent_required')
  })

  it('text hace passthrough con trim', () => {
    expect(validateFormValue('text', '  hola  ').normalized).toBe('hola')
  })
})

describe('resolveValidatorName', () => {
  it('deriva el validador por type', () => {
    expect(resolveValidatorName({ type: 'email' })).toBe('email_syntax')
    expect(resolveValidatorName({ type: 'tel' })).toBe('e164_phone')
    expect(resolveValidatorName({ type: 'national_id' })).toBe('national_id')
    expect(resolveValidatorName({ type: 'text' })).toBe('text')
  })

  it('respeta el override explícito del campo', () => {
    expect(resolveValidatorName({ type: 'text', validator: 'national_id' })).toBe('national_id')
  })
})

describe('validateFieldValue (resolve + validate, paridad cliente/servidor)', () => {
  it('usa params.country del campo para national_id', () => {
    const field = { type: 'national_id', validatorParams: { country: 'CL' } }

    expect(validateFieldValue(field, '11.111.111-1').valid).toBe(true)
  })
})
