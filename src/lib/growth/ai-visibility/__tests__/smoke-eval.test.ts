import { describe, expect, it } from 'vitest'

import {
  GROWTH_AI_VISIBILITY_BRAND_FIXTURES,
  GROWTH_AI_VISIBILITY_SMOKE_MODE
} from '../evals/brand-fixtures'
import { extractCitationDomain } from '../observation'
import { createFakeProviderAdapter } from '../providers/fake-adapter'
import { createProviderAdapterContext } from '../providers/types'
import { resolvePromptInputs } from '../prompt-pack'

/**
 * Eval determinista de no-regresión (Slice 5): el pipeline prompt-pack → fake
 * adapter es estable y reproducible para cada brand fixture, SIN red ni PG.
 * Si el shape de la observación o la interpolación cambian, este test rompe.
 */

const deterministicContext = () => {
  let counter = 0

  return createProviderAdapterContext({
    providerPolicyVersion: 'policy.v1',
    promptPackVersion: 'prompt-pack.v1',
    timeoutMs: 20_000,
    maxRetries: 0,
    now: () => '2026-06-24T00:00:00.000Z',
    newObservationId: () => `obs-${++counter}`
  })
}

describe('growth/ai-visibility — smoke eval (no-regresión, fake adapter)', () => {
  it('incluye el sujeto Efeonce + una marca neutra', () => {
    const roles = GROWTH_AI_VISIBILITY_BRAND_FIXTURES.map(b => b.role)

    expect(roles).toContain('subject')
    expect(roles).toContain('neutral_control')
    expect(GROWTH_AI_VISIBILITY_BRAND_FIXTURES.find(b => b.role === 'subject')?.brandName).toBe('Efeonce')
  })

  for (const fixture of GROWTH_AI_VISIBILITY_BRAND_FIXTURES) {
    it(`pipeline determinista y estable para ${fixture.brandName}`, async () => {
      const prompts = resolvePromptInputs({
        brandName: fixture.brandName,
        category: fixture.category,
        market: fixture.market,
        competitor: fixture.competitorsDeclared[0] ?? null
      })

      expect(prompts.length).toBeGreaterThan(0)

      const adapter = createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' })

      const runOnce = async () =>
        Promise.all(
          prompts.slice(0, 3).map(prompt =>
            adapter.runPrompt(
              {
                runId: 'run-eval',
                promptId: prompt.promptId,
                promptText: prompt.promptText,
                locale: fixture.locale,
                market: fixture.market,
                brandName: fixture.brandName,
                websiteUrl: fixture.websiteUrl,
                competitorsDeclared: fixture.competitorsDeclared,
                mode: GROWTH_AI_VISIBILITY_SMOKE_MODE
              },
              deterministicContext()
            )
          )
        )

      const first = await runOnce()
      const second = await runOnce()

      // Todas exitosas, shape estable, hashes deterministas entre corridas.
      expect(first.every(o => o.status === 'succeeded')).toBe(true)
      expect(first.map(o => o.answerTextHash)).toEqual(second.map(o => o.answerTextHash))
      expect(first.map(o => o.providerRequestHash)).toEqual(second.map(o => o.providerRequestHash))

      // Citations consistentes con el dominio del sitio (desambiguación por dominio).
      const expectedDomain = fixture.websiteUrl ? extractCitationDomain(fixture.websiteUrl) : null

      for (const obs of first) {
        if (expectedDomain) {
          expect(obs.citations.map(c => c.domain)).toContain(expectedDomain)
        } else {
          expect(obs.citations).toEqual([])
        }
      }
    })
  }
})
