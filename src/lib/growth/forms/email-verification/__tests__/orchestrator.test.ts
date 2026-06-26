import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyEmail } from '../orchestrator'
import type { DeliverabilityVerdict, EmailVerificationProvider, ProviderVerificationResult } from '../provider'

vi.mock('../cache-store', () => ({
  getCachedVerification: vi.fn(async () => null),
  upsertVerification: vi.fn(async () => undefined),
}))

import { getCachedVerification, upsertVerification } from '../cache-store'

const readyProvider = (deliverable: DeliverabilityVerdict): EmailVerificationProvider => {
  const verify = vi.fn<(email: string) => Promise<ProviderVerificationResult>>()

  verify.mockResolvedValue({ deliverable, provider: 'fake' })

  return { name: 'fake', isReady: () => true, verify }
}

const notReadyProvider: EmailVerificationProvider = (() => {
  const verify = vi.fn<(email: string) => Promise<ProviderVerificationResult>>()

  verify.mockResolvedValue({ deliverable: 'unknown', provider: 'noop' })

  return { name: 'noop', isReady: () => false, verify }
})()

beforeEach(() => {
  vi.mocked(getCachedVerification).mockResolvedValue(null)
  vi.mocked(upsertVerification).mockClear()
})

describe('verifyEmail — Tier 1 first + provider gating', () => {
  it('email inválido ⇒ email_format, sin tocar provider ni cache', async () => {
    const provider = readyProvider('deliverable')
    const r = await verifyEmail('no-es-email', { provider })

    expect(r.reasonCode).toBe('email_format')
    expect(r.syntaxValid).toBe(false)
    expect(provider.verify).not.toHaveBeenCalled()
  })

  it('corporativo + provider listo ⇒ corre Tier 2 (deliverable) ⇒ quality verified', async () => {
    const provider = readyProvider('deliverable')
    const r = await verifyEmail('juan@acme.com', { provider })

    expect(provider.verify).toHaveBeenCalledOnce()
    expect(r.deliverable).toBe('deliverable')
    expect(r.verifiedTier).toBe('tier2')
    expect(r.quality).toBe('verified')
    expect(r.reasonCode).toBeNull()
    expect(upsertVerification).toHaveBeenCalledOnce()
  })

  it('la lista comprensiva server atrapa un free provider del long-tail (no en el baseline)', async () => {
    const provider = readyProvider('deliverable')
    // 126.com es un proveedor gratis real (willwhite/freemail) que NO está en la lista corta.
    const r = await verifyEmail('alguien@126.com', { provider })

    expect(provider.verify).not.toHaveBeenCalled()
    expect(r.isFreeProvider).toBe(true)
    expect(r.isCorporate).toBe(false)
    expect(r.reasonCode).toBe('email_not_corporate')
  })

  it('NO corre Tier 2 si el dominio no es corporativo (Tier1-first economía)', async () => {
    const provider = readyProvider('deliverable')
    const r = await verifyEmail('persona@gmail.com', { provider })

    expect(provider.verify).not.toHaveBeenCalled()
    expect(r.reasonCode).toBe('email_not_corporate')
    expect(r.quality).toBe('suspect')
    expect(r.verifiedTier).toBe('tier1')
  })

  it('desechable ⇒ email_disposable, sin Tier 2', async () => {
    const provider = readyProvider('deliverable')
    const r = await verifyEmail('x@mailinator.com', { provider })

    expect(provider.verify).not.toHaveBeenCalled()
    expect(r.reasonCode).toBe('email_disposable')
    expect(r.quality).toBe('suspect')
  })

  it('provider no listo (noop) ⇒ Tier 1 only, deliverable unknown, NO degradado', async () => {
    const r = await verifyEmail('juan@acme.com', { provider: notReadyProvider })

    expect(notReadyProvider.verify).not.toHaveBeenCalled()
    expect(r.deliverable).toBe('unknown')
    expect(r.verifiedTier).toBe('tier1')
    expect(r.degraded).toBe(false)
  })
})

describe('verifyEmail — circuit breaker + cache', () => {
  it('provider que falla (unknown) ⇒ degrada a Tier 1, no rompe', async () => {
    const provider = readyProvider('unknown')
    const r = await verifyEmail('jefe@empresa.cl', { provider })

    expect(provider.verify).toHaveBeenCalledOnce()
    expect(r.deliverable).toBe('unknown')
    expect(r.degraded).toBe(true)
    expect(r.verifiedTier).toBe('tier1')
  })

  it('cache hit vigente ⇒ usa el veredicto cacheado sin llamar al provider', async () => {
    vi.mocked(getCachedVerification).mockResolvedValueOnce({
      domain: 'acme.com',
      isCorporate: true,
      isDisposable: false,
      isRoleBased: false,
      isFreeProvider: false,
      deliverable: 'deliverable',
      verifiedTier: 'tier2',
      provider: 'fake',
    })
    const provider = readyProvider('undeliverable')
    const r = await verifyEmail('juan@acme.com', { provider })

    expect(provider.verify).not.toHaveBeenCalled()
    expect(r.deliverable).toBe('deliverable')
    expect(r.quality).toBe('verified')
  })
})
