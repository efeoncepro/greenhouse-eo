import { describe, expect, it } from 'vitest'

import { validateFieldValue } from '@/lib/growth/forms/validators/core'

import type { RendererFieldDefinition } from '../contract'
import { resolveSystemCopy } from '../copy'
import { validateField } from '../validation'

/**
 * TASK-1253 — Paridad renderer ↔ validator registry canónico.
 *
 * El renderer usa el MISMO core puro que el servidor (`submitForm`). Este test
 * garantiza:
 *  (a) para cada tipo con valor inválido, el CORE emite reasonCode Y el renderer
 *      produce un mensaje no-nulo → el mapping reasonCode→copy está completo;
 *  (b) un valor válido pasa en AMBOS lados (core + renderer).
 * Si alguien suma un reasonCode al core sin copy en el renderer, (a) lo atrapa.
 */
const copy = resolveSystemCopy('es-CL')

const field = (over: Partial<RendererFieldDefinition> & { type: RendererFieldDefinition['type']; key: string }) =>
  over as RendererFieldDefinition

const INVALID: Array<{ f: RendererFieldDefinition; value: unknown }> = [
  { f: field({ key: 'e', type: 'email' }), value: 'bad' },
  { f: field({ key: 't', type: 'tel' }), value: '12' },
  { f: field({ key: 'u', type: 'url' }), value: 'http://' },
  { f: field({ key: 'r', type: 'national_id', validatorParams: { country: 'CL' } }), value: '11.111.111-2' },
  { f: field({ key: 'n', type: 'number' }), value: 'abc' },
  { f: field({ key: 'd', type: 'date' }), value: '25/06/2026' },
]

const VALID: Array<{ f: RendererFieldDefinition; value: unknown }> = [
  { f: field({ key: 'e', type: 'email' }), value: 'a@b.com' },
  { f: field({ key: 't', type: 'tel' }), value: '+56912345678' },
  { f: field({ key: 'u', type: 'url' }), value: 'https://x.com' },
  { f: field({ key: 'r', type: 'national_id', validatorParams: { country: 'CL' } }), value: '11.111.111-1' },
  { f: field({ key: 'n', type: 'number' }), value: '42' },
  { f: field({ key: 'd', type: 'date' }), value: '2026-06-25' },
]

describe('paridad renderer ↔ registry canónico (TASK-1253)', () => {
  it('inválido: core emite reasonCode y el renderer da mensaje (mapping completo)', () => {
    for (const { f, value } of INVALID) {
      const core = validateFieldValue(f, value)

      expect(core.valid, `${f.type} debe ser inválido en el core`).toBe(false)
      expect(core.reasonCode).not.toBeNull()

      const rendered = validateField(f, { [f.key]: value as string }, copy)

      expect(rendered, `${f.type} debe dar mensaje es-CL en el renderer`).not.toBeNull()
    }
  })

  it('válido: pasa en core y renderer', () => {
    for (const { f, value } of VALID) {
      expect(validateFieldValue(f, value).valid, `${f.type} debe ser válido en el core`).toBe(true)
      expect(validateField(f, { [f.key]: value as string }, copy)).toBeNull()
    }
  })

  it('consent requerido sin marcar → mensaje de consentimiento', () => {
    const f = field({ key: 'c', type: 'consent', required: true })

    expect(validateField(f, { c: false }, copy)).toBe(copy.errors.consentRequired)
    expect(validateField(f, { c: true }, copy)).toBeNull()
  })
})
