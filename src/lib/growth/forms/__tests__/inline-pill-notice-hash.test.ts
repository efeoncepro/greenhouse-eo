import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { inlinePillNoticeHash } from '../hash'

describe('inlinePillNoticeHash — evidencia del aviso de una píldora en línea', () => {
  const NOTE = 'Al suscribirte aceptas la {privacyLink}. Te das de baja cuando quieras.'

  it('una píldora con aviso guarda el sha256 del aviso', () => {
    expect(inlinePillNoticeHash({ presentation: 'inline_pill', inlinePill: { note: NOTE } })).toMatch(/^[a-f0-9]{64}$/)
  })

  it('el mismo aviso da el mismo hash (es verificable después)', () => {
    const a = inlinePillNoticeHash({ presentation: 'inline_pill', inlinePill: { note: NOTE } })

    expect(inlinePillNoticeHash({ presentation: 'inline_pill', inlinePill: { note: ` ${NOTE} ` } })).toBe(a)
  })

  it('sin aviso, o fuera de una píldora, no hay evidencia', () => {
    expect(inlinePillNoticeHash({ presentation: 'inline_pill', inlinePill: {} })).toBeNull()
    expect(inlinePillNoticeHash({ inlinePill: { note: NOTE } })).toBeNull()
    expect(inlinePillNoticeHash(null)).toBeNull()
  })
})
