import { describe, expect, it } from 'vitest'

import {
  arbitrateCandidates,
  isRouteEligible,
  matchRoutePattern,
  resolvePriorityScore,
  type ArbiterCandidate,
} from '../arbiter'
import { CTA_CONTRACT_VERSION, type CtaRenderContract } from '../contracts'

const contract = (overrides: {
  slug: string
  interruptive: boolean
}): CtaRenderContract => ({
  contractVersion: CTA_CONTRACT_VERSION,
  cta: {
    ctaId: `cdef-${overrides.slug}`,
    slug: overrides.slug,
    campaignSlug: null,
    ctaVersionId: `cver-${overrides.slug}`,
    version: 1,
    locale: 'es-CL',
  },
  placement: overrides.interruptive ? 'popup_modal' : 'embedded',
  interruptive: overrides.interruptive,
  content: { headline: 'Título', ctaLabel: 'Acción' },
  action: { kind: 'open_growth_form', formSlug: 'ai-visibility-grader' },
  variantId: 'control',
  surfacePolicy: { surfaceId: 'csur-x', allowedOrigins: [], rendererChannel: 'stable' },
})

describe('matchRoutePattern', () => {
  it('matchea todo con /**', () => {
    expect(matchRoutePattern('/**', '/')).toBe(true)
    expect(matchRoutePattern('/**', '/blog/post-1')).toBe(true)
  })

  it('matchea prefijo + descendientes con sufijo /**', () => {
    expect(matchRoutePattern('/blog/**', '/blog')).toBe(true)
    expect(matchRoutePattern('/blog/**', '/blog/a/b')).toBe(true)
    expect(matchRoutePattern('/blog/**', '/pricing')).toBe(false)
  })

  it('matchea exactamente un segmento con *', () => {
    expect(matchRoutePattern('/blog/*', '/blog/post-1')).toBe(true)
    expect(matchRoutePattern('/blog/*', '/blog/a/b')).toBe(false)
  })

  it('match exacto ignora querystring/hash y trailing slash', () => {
    expect(matchRoutePattern('/pricing', '/pricing?utm_source=x')).toBe(true)
    expect(matchRoutePattern('/pricing', '/pricing/')).toBe(true)
    expect(matchRoutePattern('/pricing', '/pricing/enterprise')).toBe(false)
  })
})

describe('isRouteEligible', () => {
  it('incluye por routes y respeta excludeRoutes', () => {
    const policy = { routes: ['/**'], excludeRoutes: ['/legal/**'] }

    expect(isRouteEligible(policy, '/blog/x')).toBe(true)
    expect(isRouteEligible(policy, '/legal/privacidad')).toBe(false)
  })

  it('policy inválida es NO elegible (fail-closed)', () => {
    expect(isRouteEligible({ routes: 'no-es-array' }, '/blog')).toBe(false)
    expect(isRouteEligible(null, '/blog')).toBe(false)
  })
})

describe('resolvePriorityScore', () => {
  it('usa el score de la policy y colapsa policy inválida a 0', () => {
    expect(resolvePriorityScore({ score: 500 })).toBe(500)
    expect(resolvePriorityScore({ score: 'alto' })).toBe(0)
    expect(resolvePriorityScore(undefined)).toBe(100)
  })
})

describe('arbitrateCandidates', () => {
  it('devuelve a lo sumo UN interruptivo (el de mayor score) + N no-interruptivos', () => {
    const candidates: ArbiterCandidate[] = [
      { renderContract: contract({ slug: 'popup-a', interruptive: true }), priorityScore: 100 },
      { renderContract: contract({ slug: 'popup-b', interruptive: true }), priorityScore: 300 },
      { renderContract: contract({ slug: 'banner-a', interruptive: false }), priorityScore: 50 },
      { renderContract: contract({ slug: 'banner-b', interruptive: false }), priorityScore: 200 },
    ]

    const result = arbitrateCandidates(candidates)

    expect(result.interruptive?.cta.slug).toBe('popup-b')
    expect(result.nonInterruptive.map(c => c.cta.slug)).toEqual(['banner-b', 'banner-a'])
  })

  it('tie-break determinista por slug asc', () => {
    const candidates: ArbiterCandidate[] = [
      { renderContract: contract({ slug: 'zeta', interruptive: true }), priorityScore: 100 },
      { renderContract: contract({ slug: 'alfa', interruptive: true }), priorityScore: 100 },
    ]

    expect(arbitrateCandidates(candidates).interruptive?.cta.slug).toBe('alfa')
  })

  it('sin candidatos devuelve vacío estable', () => {
    expect(arbitrateCandidates([])).toEqual({ interruptive: null, nonInterruptive: [] })
  })
})
