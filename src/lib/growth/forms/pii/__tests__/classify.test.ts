import { describe, expect, it } from 'vitest'

import type { FieldDefinition } from '../../contracts'
import { resolveFieldCountry, resolvePiiClass, resolvePiiFieldKeys } from '../classify'

const fields = [
  { key: 'email', type: 'email', required: true },
  { key: 'phone', type: 'tel', validatorParams: { country: 'CL' } },
  { key: 'rut', type: 'national_id', validatorParams: { country: 'CL' } },
  { key: 'dni', type: 'national_id', validatorParams: { country: 'AR' } },
  { key: 'company', type: 'text' },
  { key: 'hp', type: 'hidden' },
] as unknown as FieldDefinition[]

describe('TASK-1255 — clasificación PII (puro)', () => {
  it('resolvePiiClass mapea tipo → clase PII', () => {
    expect(resolvePiiClass({ type: 'national_id' })).toBe('national_id')
    expect(resolvePiiClass({ type: 'email' })).toBe('email')
    expect(resolvePiiClass({ type: 'tel' })).toBe('phone')
    expect(resolvePiiClass({ type: 'text' })).toBe('non_pii')
    expect(resolvePiiClass({ type: 'select' })).toBe('non_pii')
  })

  it('resolveFieldCountry default CL', () => {
    expect(resolveFieldCountry({ validatorParams: { country: 'ar' } })).toBe('AR')
    expect(resolveFieldCountry({ validatorParams: undefined })).toBe('CL')
  })

  it('resolvePiiFieldKeys agrupa por clase con país', () => {
    const groups = resolvePiiFieldKeys(fields)

    expect(groups.email).toEqual(['email'])
    expect(groups.phone).toEqual(['phone'])
    expect(groups.nationalId).toEqual([
      { key: 'rut', country: 'CL' },
      { key: 'dni', country: 'AR' },
    ])
  })
})
