import { describe, expect, it } from 'vitest'

import { GROWTH_MARKET_REGISTRY, resolveGrowthMarket, resolveGrowthFormMarket } from '..'
import { ARCHETYPE_BASELINE_PACK_BY_MODEL } from '../../ai-visibility/prompt-packs/archetypes/baseline-packs'
import { localizePromptPack } from '../../ai-visibility/prompt-packs/localized'
import { resolvePromptInputs } from '../../ai-visibility/prompt-pack'
import { CATEGORY_TAXONOMY } from '../../ai-visibility/taxonomy/catalog'
import { localizedCategoryLabel } from '../../ai-visibility/taxonomy/localized-label'

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort()

describe('market geography and multilingual packs', () => {
  it('resolves every country name in each supported language', () => {
    for (const market of Object.values(GROWTH_MARKET_REGISTRY)) {
      for (const alias of [market.code.toLowerCase(), ...Object.values(market.labels), ...market.aliases]) {
        expect(resolveGrowthMarket(` ${alias} `).code).toBe(market.code)
      }
    }

    expect(resolveGrowthMarket('Peru', 'es').locale).toBe('es-PE')
    expect(resolveGrowthMarket('US', 'es-US')).toMatchObject({ code: 'US', language: 'es' })
    expect(resolveGrowthMarket('BR', 'pt').googleAiModeLanguageCode).toBe('pt-BR')
  })
  it('rejects unknown internal markets, locales and unsupported Portuguese varieties', () => {
    for (const market of ['', 'CA', 'Santiago', 'Latam'])
      expect(() => resolveGrowthMarket(market)).toThrow('aeo_market_unknown')
    for (const locale of ['de', 'es_CL', 'pt-PT', 'en-US-u-ca-gregory'])
      expect(() => resolveGrowthMarket('CL', locale)).toThrow('aeo_locale_unsupported')
    expect(resolveGrowthFormMarket('unknown')).toMatchObject({ code: 'CL', source: 'form_default' })
  })
  it('covers every archetype in all languages without changing tags or leaking placeholders', () => {
    for (const source of Object.values(ARCHETYPE_BASELINE_PACK_BY_MODEL)) {
      for (const [code, locale] of [
        ['PE', 'es-PE'],
        ['US', 'en-US'],
        ['BR', 'pt-BR'],
        ['HT', 'fr-HT']
      ]) {
        const pack = localizePromptPack(source, resolveGrowthMarket(code, locale))

        expect(pack.version).toContain(locale)

        for (let i = 0; i < pack.prompts.length; i++) {
          const { text, ...tags } = pack.prompts[i]
          const { text: originalText, ...originalTags } = source.prompts[i]

          expect(tags).toEqual(originalTags)
          if (tags.id !== 'p11') expect(placeholders(text)).toEqual(placeholders(originalText))
          expect(text).not.toContain('Santiago')
        }

        const inputs = resolvePromptInputs(
          { brandName: 'Acme', category: 'software', market: pack.market, competitor: 'Other' },
          { pack }
        )

        expect(inputs.every(prompt => !prompt.promptText.includes('{{'))).toBe(true)
        expect(
          resolvePromptInputs({ brandName: 'Acme', category: 'software', market: pack.market }, { pack }).every(
            prompt => !prompt.promptText.includes('{{competitor}}')
          )
        ).toBe(true)
      }
    }
  })
  it('has localized labels for every canonical taxonomy node', () => {
    for (const node of CATEGORY_TAXONOMY.nodes) {
      expect(localizedCategoryLabel(node.id, 'en')).toBe(node.label.en)
      expect(localizedCategoryLabel(node.id, 'pt-BR')).toBeTruthy()
      expect(localizedCategoryLabel(node.id, 'fr')).toBeTruthy()
    }
  })
})

it('keeps Latin American Spanish locale separate from the physical country', () => {
  expect(resolveGrowthMarket('MX', 'es-419')).toMatchObject({
    code: 'MX',
    locale: 'es-419',
    language: 'es',
    locationCode: 2484
  })
})
