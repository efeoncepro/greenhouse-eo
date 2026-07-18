// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import { isLocallyDismissed, markLocallyDismissed, parseConsentState, resolveVisitorIdentity } from '../visitor'

/**
 * TASK-1429 — identidad pseudónima consent-aware (espejo browser de TASK-1428):
 * session siempre; visitor durable SOLO con consent granted; keys opacas estables
 * por storage; guard local de dismiss por sesión.
 */

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('resolveVisitorIdentity', () => {
  it('sin consent (unknown/denied) → SOLO sessionKey; el id durable NUNCA se crea', () => {
    for (const consentState of ['unknown', 'denied'] as const) {
      localStorage.clear()

      const identity = resolveVisitorIdentity({ consentState, consentSource: null })

      expect(identity.sessionKey).toBeTruthy()
      expect(identity.visitorKey).toBeNull()
      expect(localStorage.getItem('ghc_visitor')).toBeNull()
    }
  })

  it('consent granted → visitorKey durable + sessionKey; estables entre llamadas', () => {
    const first = resolveVisitorIdentity({ consentState: 'granted', consentSource: 'host_cmp' })
    const second = resolveVisitorIdentity({ consentState: 'granted', consentSource: 'host_cmp' })

    expect(first.visitorKey).toBeTruthy()
    expect(first.visitorKey).toBe(second.visitorKey)
    expect(first.sessionKey).toBe(second.sessionKey)
    expect(first.consentSource).toBe('host_cmp')
  })

  it('las keys son opacas (UUID random), no derivadas del browser (cero fingerprinting)', () => {
    const identity = resolveVisitorIdentity({ consentState: 'granted', consentSource: null })

    expect(identity.visitorKey).toMatch(/^[0-9a-f-]{36}$|^ghc-/)
    expect(identity.consentSource).toBe('none')
  })
})

describe('parseConsentState', () => {
  it('solo granted/denied son válidos; el resto cae a unknown', () => {
    expect(parseConsentState('granted')).toBe('granted')
    expect(parseConsentState('denied')).toBe('denied')
    expect(parseConsentState('yes')).toBe('unknown')
    expect(parseConsentState(null)).toBe('unknown')
  })
})

describe('guard local de dismiss (defensa en profundidad, sesión-scoped)', () => {
  it('marca y consulta por ctaId; no cruza a otros CTAs', () => {
    expect(isLocallyDismissed('cdef-a')).toBe(false)

    markLocallyDismissed('cdef-a')

    expect(isLocallyDismissed('cdef-a')).toBe(true)
    expect(isLocallyDismissed('cdef-b')).toBe(false)
  })
})
