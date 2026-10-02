import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GROWTH_MARKET_REGISTRY } from '@/lib/growth/markets'

import { buildExecuteInput, enqueueGraderDiagnostic, runGraderDiagnostic } from '../commands'
import { enqueueGraderRun, executeGraderRun } from '../run-engine'
import { getCategoryTaxonomyNode } from '../taxonomy'

vi.mock('../run-engine', () => ({
  enqueueGraderRun: vi.fn(async () => ({})),
  executeGraderRun: vi.fn(async () => ({}))
}))

const brands = [
  ['Aerolínea Uno', 'industry:aviation', 'cb'],
  ['Tienda Dos', 'sector:ecommerce_marketplaces', 're'],
  ['Software Tres', 'sector:b2b_saas', 'sa'],
  ['Marketplace Cuatro', 'category:marketplace_platform', 'mk'],
  ['Organismo Cinco', 'industry:government', 'pi'],
  ['Agencia Seis', 'sector:marketing_services', 'p']
] as const

const base = {
  brandName: 'Aerolínea Uno', category: 'AIRLINES_AVIATION', market: 'PE', locale: 'es-PE',
  mode: 'light' as const, runKind: 'public_diagnostic' as const, competitorsDeclared: ['Otra marca']
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED', 'true')
  vi.stubEnv('GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED', 'true')
})
afterEach(() => vi.unstubAllEnvs())

describe('universal grader command: every entry point and brand', () => {
  it.each(brands)('%s keeps its buyer intent in every supported country and language', (brandName, categoryNodeId, prefix) => {
    for (const market of Object.keys(GROWTH_MARKET_REGISTRY)) {
      for (const locale of [`es-${market}`, `en-${market}`, `fr-${market}`, 'pt-BR']) {
        const input = buildExecuteInput({
          ...base, brandName, market, locale, categoryNodeId,
          category: getCategoryTaxonomyNode(categoryNodeId)!.label.es, categoryConfidence: 1
        })

        expect(input.prompts[0].promptId.startsWith(prefix), `${brandName}/${market}/${locale}`).toBe(true)
        expect(input.profile.market).toBe(market)
        expect(input.profile.locale).toBe(locale)
        expect(input.prompts.map(p => p.promptText).join(' ')).not.toMatch(/\{\{|Efeonce/)
        if (prefix !== 'p') expect(input.prompts.map(p => p.promptText).join(' ')).not.toMatch(/agenci|agency|agência/i)
      }
    }
  })

  it('legacy/public input without a business model derives the consumer pack from its resolved category', () => {
    const input = buildExecuteInput(base)

    expect(input.prompts[0].promptId).toBe('cb01')
    expect(input.prompts[0].promptText).toContain('Perú')
    expect(input.prompts[0].promptText).not.toContain('AIRLINES_AVIATION')
  })

  it.each(['unknown', 'b2b_product_saas'])('preserves explicit classification %s over the category prior', businessModel => {
    const input = buildExecuteInput({ ...base, businessModel })

    expect(input.prompts[0].promptId).toBe(businessModel === 'unknown' ? 'gn01' : 'sa01')
  })

  it('inline and queued doors pass the same resolved prompts and geography to the common engine', async () => {
    await runGraderDiagnostic(base)
    await enqueueGraderDiagnostic(base)
    const inline = vi.mocked(executeGraderRun).mock.calls[0][0]
    const queued = vi.mocked(enqueueGraderRun).mock.calls[0][0]

    expect(inline.prompts).toEqual(queued.prompts)
    expect(inline.profile).toEqual(queued.profile)
    expect(queued.prompts[0].promptId).toBe('cb01')
  })

  it('rejects unresolved categories and unsupported countries before either engine can spend', () => {
    expect(() => buildExecuteInput({ ...base, category: 'unclassified-example' })).toThrow()
    expect(() => buildExecuteInput({ ...base, market: 'ZZ', locale: 'es-ZZ' })).toThrow()
    expect(enqueueGraderRun).not.toHaveBeenCalled()
    expect(executeGraderRun).not.toHaveBeenCalled()
  })
})
