import { describe, expect, it } from 'vitest'

import type { RendererFieldDefinition } from '../contract'
import {
  formatPhoneClDisplay,
  formatRutDisplay,
  maskOpsFor,
  resolveMaskKind,
  stripPhoneCl,
  stripRut,
} from '../mask'

const field = (over: Partial<RendererFieldDefinition>): RendererFieldDefinition => ({
  key: 'x',
  type: 'text',
  ...over,
})

describe('growth-forms-renderer · mask', () => {
  it('formats and strips RUT regardless of input format', () => {
    expect(formatRutDisplay('123456789')).toBe('12.345.678-9')
    expect(formatRutDisplay('12.345.678-9')).toBe('12.345.678-9')
    expect(formatRutDisplay('12345678-K')).toBe('12.345.678-K')
    expect(stripRut('12.345.678-9')).toBe('123456789')
    expect(stripRut('12.345.678-k')).toBe('12345678K')
  })

  it('formats and strips CL phone regardless of input format', () => {
    expect(formatPhoneClDisplay('912345678')).toBe('+56 9 1234 5678')
    expect(formatPhoneClDisplay('+56912345678')).toBe('+56 9 1234 5678')
    expect(stripPhoneCl('+56 9 1234 5678')).toBe('+56912345678')
    expect(stripPhoneCl('912345678')).toBe('+56912345678')
  })

  it('detects mask kind by type/inputMode/key, never for email/url', () => {
    expect(resolveMaskKind(field({ type: 'tel' }))).toBe('phone_cl')
    expect(resolveMaskKind(field({ type: 'text', inputMode: 'tel' }))).toBe('phone_cl')
    expect(resolveMaskKind(field({ type: 'text', key: 'rut' }))).toBe('rut')
    expect(resolveMaskKind(field({ type: 'email' }))).toBe('none')
    expect(resolveMaskKind(field({ type: 'url' }))).toBe('none')
  })

  it('identity mask passes value through untouched', () => {
    const ops = maskOpsFor(field({ type: 'text', key: 'name' }))

    expect(ops.toDisplay('Acme S.A.')).toBe('Acme S.A.')
    expect(ops.toStored('Acme S.A.')).toBe('Acme S.A.')
  })
})
