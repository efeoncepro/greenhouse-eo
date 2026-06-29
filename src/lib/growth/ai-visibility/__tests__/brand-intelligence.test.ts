import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  brandIntelligenceToGroundedCandidate,
  getResolvableCategoryNodeChoices,
  htmlToReadableText,
  runBrandIntelligence,
  sanitizeBrandIntelligenceOutput
} from '../brand-intelligence'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('growth/ai-visibility — brand intelligence (grounded read)', () => {
  it('htmlToReadableText: quita scripts/estilos/markup y colapsa whitespace', () => {
    const html =
      '<html><head><style>.x{color:red}</style><script>alert(1)</script></head>' +
      '<body><h1>Berel</h1><p>Fabricante de   pinturas &amp; recubrimientos</p></body></html>'

    const text = htmlToReadableText(html)

    expect(text).toContain('Berel')
    expect(text).toContain('Fabricante de pinturas & recubrimientos')
    expect(text).not.toContain('alert')
    expect(text).not.toContain('color:red')
    expect(text).not.toContain('<')
  })

  it('sanitizeBrandIntelligenceOutput: shape válido pasa, nodo vacío → unknown, modelo inválido → unknown', () => {
    const fields = sanitizeBrandIntelligenceOutput({
      whatTheBrandDoes: 'Aerolínea de pasajeros low-cost en Sudamérica.',
      candidateCategoryNode: 'industry:aviation',
      fineCategory: 'aerolínea low-cost',
      candidateBusinessModel: 'consumer_b2c',
      signalsUsed: ['homepage vende pasajes', 'wikidata: airline'],
      confidence: 0.9
    })

    expect(fields).not.toBeNull()
    expect(fields?.candidateCategoryNode).toBe('industry:aviation')
    expect(fields?.candidateBusinessModel).toBe('consumer_b2c')

    const defaulted = sanitizeBrandIntelligenceOutput({
      whatTheBrandDoes: 'Algo',
      candidateCategoryNode: '',
      fineCategory: '',
      candidateBusinessModel: 'not_a_model',
      signalsUsed: 'nope',
      confidence: 5
    })

    expect(defaulted?.candidateCategoryNode).toBe('unknown')
    expect(defaulted?.candidateBusinessModel).toBe('unknown')
    expect(defaulted?.signalsUsed).toEqual([])
    expect(defaulted?.confidence).toBe(1) // clamp 0..1
  })

  it('sanitizeBrandIntelligenceOutput: sin whatTheBrandDoes → null (snapshot inservible)', () => {
    expect(sanitizeBrandIntelligenceOutput({ whatTheBrandDoes: '' })).toBeNull()
    expect(sanitizeBrandIntelligenceOutput(null)).toBeNull()
  })

  it('getResolvableCategoryNodeChoices: solo macro (industry) + mid (sector)', () => {
    const choices = getResolvableCategoryNodeChoices()
    const ids = choices.map(c => c.id)

    expect(ids).toContain('industry:aviation')
    expect(ids).toContain('sector:passenger_airlines')
    // No niveles más finos como nodos elegibles (esos viven como fine_category, no como nodo).
    expect(ids.some(id => id.startsWith('use_case:') || id.startsWith('buyer_persona:') || id.startsWith('market:'))).toBe(
      false
    )
  })

  it('brandIntelligenceToGroundedCandidate: mapea snapshot → candidate; null → null', () => {
    expect(brandIntelligenceToGroundedCandidate(null)).toBeNull()
    expect(
      brandIntelligenceToGroundedCandidate({
        brandIntelligenceId: 'gbi-1',
        profileId: 'p1',
        version: 1,
        whatTheBrandDoes: 'x',
        candidateCategoryNode: 'industry:finance',
        fineCategory: 'banca retail',
        candidateBusinessModel: 'consumer_b2c',
        signalsUsed: [],
        confidence: 0.85,
        model: 'gemini',
        provider: 'gemini',
        status: 'active',
        createdAt: '2026-06-29T00:00:00Z'
      })
    ).toEqual({ nodeId: 'industry:finance', confidence: 0.85 })
  })

  it('runBrandIntelligence: degrada honesto con flag OFF (default)', async () => {
    const result = await runBrandIntelligence({
      brandName: 'X',
      websiteUrl: null,
      hubspotIndustry: null,
      siteContent: 'algo',
      entitySignals: null,
      allowedNodes: [],
      maxTokens: 500
    })

    expect(result.fields).toBeNull()
    expect(result.metadata.status).toBe('disabled')
  })

  it('runBrandIntelligence: flag ON pero sin señales → no_signals (no paga LLM)', async () => {
    vi.stubEnv('GROWTH_AI_VISIBILITY_GRADER_ENABLED', 'true')
    vi.stubEnv('GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED', 'true')

    const result = await runBrandIntelligence({
      brandName: 'X',
      websiteUrl: null,
      hubspotIndustry: null,
      siteContent: null,
      entitySignals: null,
      allowedNodes: [],
      maxTokens: 500
    })

    expect(result.fields).toBeNull()
    expect(result.metadata.status).toBe('no_signals')
  })
})
