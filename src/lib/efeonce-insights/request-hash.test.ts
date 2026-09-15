import { describe, expect, it } from 'vitest'

import { canonicalJson, hashCanonical } from './request-hash'

describe('TASK-1845 — request hash canónico', () => {
  it('ignora el orden de claves y las claves undefined, pero NO el orden de arrays', () => {
    const a = { modules: ['seo', 'aeo'], period: { start: '2026-08-01', endExclusive: '2026-09-01' }, x: undefined }
    const b = { period: { endExclusive: '2026-09-01', start: '2026-08-01' }, modules: ['seo', 'aeo'] }
    const c = { period: { endExclusive: '2026-09-01', start: '2026-08-01' }, modules: ['aeo', 'seo'] }

    expect(hashCanonical(a)).toBe(hashCanonical(b))
    expect(hashCanonical(a)).not.toBe(hashCanonical(c))
    expect(canonicalJson(a)).toBe('{"modules":["seo","aeo"],"period":{"endExclusive":"2026-09-01","start":"2026-08-01"}}')
  })

  it('produce sha256 hex de 64 caracteres', () => {
    expect(hashCanonical({ a: 1 })).toMatch(/^[0-9a-f]{64}$/)
  })
})
