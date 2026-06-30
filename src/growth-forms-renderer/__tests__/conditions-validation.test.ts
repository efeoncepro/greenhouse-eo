import { describe, expect, it } from 'vitest'

import type { RendererFieldDefinition } from '../contract'
import { isFieldRequired, isFieldVisible } from '../conditions'
import { resolveSystemCopy } from '../copy'
import { validateField, validateFields } from '../validation'

const copy = resolveSystemCopy('es-CL')

describe('growth-forms-renderer · conditions', () => {
  const budget: RendererFieldDefinition = {
    key: 'budget',
    type: 'text',
    visibleWhen: [{ field: 'interest', includes: 'growth' }],
    requiredWhen: [{ field: 'interest', includes: 'growth' }],
  }

  it('hides a field until its visibleWhen matches', () => {
    expect(isFieldVisible(budget, { interest: '' })).toBe(false)
    expect(isFieldVisible(budget, { interest: 'growth' })).toBe(true)
  })

  it('never requires a hidden field', () => {
    expect(isFieldRequired(budget, { interest: '' })).toBe(false)
    expect(isFieldRequired(budget, { interest: 'growth' })).toBe(true)
  })

  it('treats array values for includes', () => {
    const f: RendererFieldDefinition = { key: 'x', type: 'text', visibleWhen: [{ field: 'tags', includes: 'a' }] }

    expect(isFieldVisible(f, { tags: ['a', 'b'] })).toBe(true)
    expect(isFieldVisible(f, { tags: ['b'] })).toBe(false)
  })
})

describe('growth-forms-renderer · validation', () => {
  it('flags required only when empty + required', () => {
    const f: RendererFieldDefinition = { key: 'email', type: 'email', required: true }

    expect(validateField(f, { email: '' }, copy)).toBe(copy.errors.required)
    expect(validateField(f, { email: 'bad' }, copy)).toBe(copy.errors.email)
    expect(validateField(f, { email: 'a@b.com' }, copy)).toBeNull()
  })

  it('validates raw phone/url/number/consent', () => {
    expect(validateField({ key: 't', type: 'tel' }, { t: '+56912345678' }, copy)).toBeNull()
    expect(validateField({ key: 't', type: 'tel' }, { t: '12' }, copy)).toBe(copy.errors.tel)
    expect(validateField({ key: 'u', type: 'url' }, { u: 'https://x.com' }, copy)).toBeNull()
    expect(validateField({ key: 'n', type: 'number' }, { n: 'abc' }, copy)).toBe(copy.errors.number)
    expect(validateField({ key: 'c', type: 'consent', required: true }, { c: false }, copy)).toBe(copy.errors.consentRequired)
  })

  it('skips hidden fields in batch validation', () => {
    const fields: RendererFieldDefinition[] = [
      { key: 'email', type: 'email', required: true },
      { key: 'h', type: 'hidden', required: true },
    ]

    const errors = validateFields(fields, { email: '', h: '' }, copy)

    expect(errors.email).toBe(copy.errors.required)
    expect(errors.h).toBeUndefined()
  })
})
