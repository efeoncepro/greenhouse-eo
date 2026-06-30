import { describe, expect, it } from 'vitest'

import { revalidateAndNormalizeFields } from '../commands'
import type { FieldDefinition } from '../contracts'

const fields = [
  { key: 'email', type: 'email', required: true },
  { key: 'phone', type: 'tel', validatorParams: { country: 'CL' } },
  { key: 'rut', type: 'national_id', validatorParams: { country: 'CL' } },
  { key: 'hp', type: 'hidden' },
] as unknown as FieldDefinition[]

describe('revalidateAndNormalizeFields (autoridad server-side TASK-1253)', () => {
  it('normaliza campos válidos (email lowercased, E.164, RUT canónico) y no toca hidden', () => {
    const r = revalidateAndNormalizeFields(fields, {
      email: '  Nombre@Empresa.CL ',
      phone: '912345678',
      rut: '11.111.111-1',
      hp: '<<bot>>',
    })

    expect(r.ok).toBe(true)

    if (r.ok) {
      expect(r.normalizedFields.email).toBe('nombre@empresa.cl')
      expect(r.normalizedFields.phone).toBe('+56912345678')
      expect(r.normalizedFields.rut).toBe('111111111')
      expect(r.normalizedFields.hp).toBe('<<bot>>')
    }
  })

  it('rechaza el primer campo con formato inválido (fieldKey + reasonCode)', () => {
    const r = revalidateAndNormalizeFields(fields, { email: 'no-arroba' })

    expect(r.ok).toBe(false)

    if (!r.ok) {
      expect(r.fieldKey).toBe('email')
      expect(r.reasonCode).toBe('email_format')
    }
  })

  it('rechaza RUT con dígito verificador inválido', () => {
    const r = revalidateAndNormalizeFields(fields, { rut: '11.111.111-2' })

    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reasonCode).toBe('national_id_check_digit')
  })

  it('salta vacíos/ausentes (el required condicional lo resuelve otro gate, no es "basura")', () => {
    expect(revalidateAndNormalizeFields(fields, { email: '', phone: '   ' }).ok).toBe(true)
  })

  it('preserva campos desconocidos sin tocarlos (utm, hidden, etc.)', () => {
    const r = revalidateAndNormalizeFields(fields, { utm_source: 'newsletter' })

    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalizedFields.utm_source).toBe('newsletter')
  })
})
