import { describe, expect, it } from 'vitest'

import type { FieldDefinition } from '../../contracts'
import { redactNationalIdFromBlob } from '../boundary'

const fields = [
  { key: 'email', type: 'email' },
  { key: 'rut', type: 'national_id', validatorParams: { country: 'CL' } },
  { key: 'company', type: 'text' },
] as unknown as FieldDefinition[]

describe('TASK-1255 — boundary national_id → destinos', () => {
  it('quita national_id del blob (legacy/flag-OFF: cédula en claro)', () => {
    const out = redactNationalIdFromBlob({ email: 'x@y.com', rut: '111111111', company: 'ACME' }, fields)

    expect(out).not.toHaveProperty('rut')
    expect(out.email).toBe('x@y.com')
    expect(out.company).toBe('ACME')
    // El RUT NUNCA aparece en lo que viaja al destino.
    expect(JSON.stringify(out)).not.toContain('111111111')
  })

  it('cifrado ON (national_id ya fuera del blob) → no-op', () => {
    const out = redactNationalIdFromBlob({ email: 'x@y.com' }, fields)

    expect(out.email).toBe('x@y.com')
    expect(out).not.toHaveProperty('rut')
  })

  it('sin national_id en el schema → devuelve el blob tal cual (sin clonar)', () => {
    const blob = { email: 'x@y.com' }
    const out = redactNationalIdFromBlob(blob, [{ key: 'email', type: 'email' }] as unknown as FieldDefinition[])

    expect(out).toBe(blob)
  })
})
