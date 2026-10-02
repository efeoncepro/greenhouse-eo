import { describe, expect, it } from 'vitest'

import { buildDataForSeoPresetPayload } from '../dataforseo-cli-presets'

describe('DataForSEO CLI presets', () => {
  it('builds exact page keyword research with an explicitly declared scope', () => {
    expect(
      buildDataForSeoPresetPayload({
        preset: 'keywords-for-site',
        target: 'https://www.example.com/Article/?id=A',
        targetKind: 'url',
        market: 'MX',
        limit: 25
      })
    ).toEqual([
      {
        target: 'https://www.example.com/Article/?id=A',
        location_code: 2484,
        language_code: 'es',
        limit: 25,
        order_by: ['relevance,desc'],
        include_clickstream_data: false
      }
    ])
    expect(() => buildDataForSeoPresetPayload({ preset: 'keywords-for-site', target: 'example.com' })).toThrow(
      '--target-kind'
    )
  })

  it('uses the shared market resolver and never sends a localized label as provider identity', () => {
    expect(
      buildDataForSeoPresetPayload({
        preset: 'ai-mode',
        keyword: 'bancos para empresas',
        market: 'Perú',
        locale: 'es-PE'
      })
    ).toEqual([
      {
        keyword: 'bancos para empresas',
        location_code: 2604,
        language_code: 'es',
        device: 'desktop'
      }
    ])
  })

  it('fails closed for unknown markets instead of falling back to the United States', () => {
    expect(() =>
      buildDataForSeoPresetPayload({ preset: 'organic', keyword: 'x', market: 'mercado inventado' })
    ).toThrow('aeo_market_unknown')
  })

  it('preserves pt-BR for Brazilian provider requests', () => {
    expect(buildDataForSeoPresetPayload({ preset: 'organic', keyword: 'agência', market: 'BR' })).toEqual([
      {
        keyword: 'agência',
        location_code: 2076,
        language_code: 'pt-BR',
        device: 'desktop'
      }
    ])
  })

  it('adds bounded organic depth, target and explicit asynchronous AI Overview loading', () => {
    expect(
      buildDataForSeoPresetPayload({
        preset: 'organic',
        keyword: 'iphone 18 pro max',
        market: 'CL',
        target: 'paris.cl',
        depth: 20,
        loadAiOverview: true
      })
    ).toEqual([
      {
        keyword: 'iphone 18 pro max',
        location_code: 2152,
        language_code: 'es',
        device: 'desktop',
        target: 'paris.cl',
        depth: 20,
        load_async_ai_overview: true
      }
    ])
  })

  it('builds bounded LLM response research requests from a live model chosen by the operator', () => {
    expect(
      buildDataForSeoPresetPayload({
        preset: 'chatgpt-response',
        prompt: '¿Qué marcas recomiendas?',
        model: 'gpt-live',
        market: 'CL',
        webSearch: true,
        forceWebSearch: true,
        maxOutputTokens: 1024
      })
    ).toEqual([
      {
        user_prompt: '¿Qué marcas recomiendas?',
        model_name: 'gpt-live',
        max_output_tokens: 1024,
        web_search: true,
        force_web_search: true,
        web_search_country_iso_code: 'CL'
      }
    ])
  })

  it('keeps LLM Mentions platforms explicit and rejects unsupported ChatGPT geography', () => {
    expect(() =>
      buildDataForSeoPresetPayload({
        preset: 'llm-mentions',
        target: 'example.com',
        platform: 'chat_gpt',
        market: 'CL'
      })
    ).toThrow('sólo admite US/en')

    expect(
      buildDataForSeoPresetPayload({
        preset: 'llm-mentions',
        target: 'https://www.example.com/',
        platform: 'google',
        market: 'CL'
      })
    ).toEqual([
      {
        target: [{ domain: 'example.com' }],
        platform: 'google',
        location_code: 2152,
        language_code: 'es',
        internal_list_limit: 10
      }
    ])
  })
})
