import { describe, expect, it, vi } from 'vitest'

import { questionOfMetric } from '../presentation/content-contract'
import { resolveInsightWindows } from '../window'
import { aiSourceOf, ga4AiFacts, ga4OrganicFacts } from './ga4-site-facts'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/growth/analytics-ga4/reader', () => ({ readGa4Analytics: vi.fn() }))

/**
 * TASK-1962 — GA4 en el Search Visibility 360: visitas orgánicas al sitio (SEO) y visitas desde asistentes de IA (AEO).
 * Los hechos salen sólo de lo que GA4 entrega por canal; flag apagado no deja rastro, sin conexión se pide al cliente.
 */

const window = resolveInsightWindows({ start: '2026-09-01', endExclusive: '2026-10-01', timeZone: 'UTC' }, { kind: 'none' }, new Date('2026-10-02T12:00:00.000Z')).current

const row = (channel: string, sourceMedium: string, sessions: number, engagedSessions: number) => ({
  dimensions: { sessionDefaultChannelGroup: channel, sessionSourceMedium: sourceMedium },
  metrics: { sessions, engagedSessions }
})

const ok = {
  ok: true as const,
  propertyId: '328274754',
  rowCount: 6,
  rows: [
    row('Organic Search', 'google / organic', 40000, 27000),
    row('Organic Search', 'bing / organic', 3575, 2636),
    row('AI Assistant', 'chatgpt.com / referral', 1200, 850),
    row('AI Assistant', 'gemini.google.com / referral', 300, 220),
    row('AI Assistant', 'copilot.microsoft.com / referral', 187, 129),
    row('Paid Social', 'facebook / paid', 187849, 93498)
  ]
}

describe('ga4-site-facts', () => {
  it('suma las visitas del canal Organic Search de todos los buscadores, sin marcarlas como Google', () => {
    const { facts, rejections, source } = ga4OrganicFacts('org-1', window, ok, { 'site.organic_sessions': 'seo.site.organic_sessions.prev' })

    expect(rejections).toEqual([])
    expect(source?.reader).toBe('readGa4Analytics')
    // TASK-1974 — el complemento «sin interacción» llega como hecho (suma por fila), nunca como resta en el render.
    expect(facts.map(fact => [fact.metricId, fact.value])).toEqual([['site.organic_sessions', 43575], ['site.organic_engaged_sessions', 29636], ['site.organic_unengaged_sessions', 13939]])
    expect(facts[1]!.value! + facts[2]!.value!).toBe(facts[0]!.value)
    expect(facts[0]!.comparisonFactId).toBe('seo.site.organic_sessions.prev')
    expect(facts.every(fact => fact.channelId === undefined)).toBe(true)
    expect(facts.every(fact => questionOfMetric('seo', fact.metricId) === 'outcome')).toBe(true)
  })

  it('cuenta las visitas desde asistentes de IA y las reparte por asistente con su isotipo', () => {
    const { facts } = ga4AiFacts('org-1', window, ok, {}, true)

    expect(facts[0]).toMatchObject({ metricId: 'ai_sessions', value: 1687, unit: 'count' })
    expect(facts.slice(1).map(fact => [fact.metricId, fact.label, fact.value, fact.channelId])).toEqual([
      ['ai_source.chatgpt', 'ChatGPT', 1200, 'chatgpt'],
      ['ai_source.gemini', 'Gemini', 300, 'gemini'],
      ['ai_source.copilot', 'Copilot', 187, undefined]
    ])
    // Partes del total de visitas desde IA: «1.200 de 1.687».
    expect(facts[1]).toMatchObject({ numerator: 1200, denominator: 1687 })
    expect(facts.every(fact => questionOfMetric('aeo', fact.metricId) === 'outcome')).toBe(true)
  })

  it('con más de 3 asistentes: los 2 que más traen y el resto SUMADO como «otros» (partes de una dona, TASK-1974)', () => {
    const many = { ...ok, rows: [...ok.rows, row('AI Assistant', 'perplexity.ai / referral', 40, 30)] }
    const { facts } = ga4AiFacts('org-1', window, many, {}, true)

    expect(facts.slice(1).map(fact => [fact.metricId, fact.label, fact.value])).toEqual([
      ['ai_source.chatgpt', 'ChatGPT', 1200],
      ['ai_source.gemini', 'Gemini', 300],
      ['ai_source.other', 'Otros asistentes', 227]
    ])
    expect(facts.slice(1).reduce((sum, fact) => sum + fact.value!, 0)).toBe(facts[0]!.value)
  })

  it('sin contrato v2 o sin visitas desde IA no hay desglose por asistente', () => {
    expect(ga4AiFacts('org-1', window, ok, {}, false).facts.map(fact => fact.metricId)).toEqual(['ai_sessions'])
    expect(ga4AiFacts('org-1', window, { ...ok, rows: ok.rows.filter(item => item.dimensions.sessionDefaultChannelGroup !== 'AI Assistant') }, {}, true).facts).toMatchObject([{ metricId: 'ai_sessions', value: 0 }])
  })

  it('flag apagado no deja hechos ni límite; sin conexión se declara para pedirla; un fallo es dato insuficiente', () => {
    expect(ga4OrganicFacts('org-1', window, { ok: false, errorCode: 'disabled' }, {})).toEqual({ facts: [], rejections: [], source: null })
    expect(ga4AiFacts('org-1', window, { ok: false, errorCode: 'not_connected' }, {}, true).rejections).toEqual([
      expect.objectContaining({ module: 'aeo', metricId: 'ga4', reason: 'not_connected' })
    ])
    expect(ga4OrganicFacts('org-1', window, { ok: false, errorCode: 'token_unhealthy' }, {}).rejections).toEqual([
      expect.objectContaining({ module: 'seo', metricId: 'ga4', reason: 'insufficient_data' })
    ])
  })

  it('nombra los asistentes por su marca, nunca por el host crudo cuando se conoce', () => {
    expect(aiSourceOf('chatgpt.com / referral')).toEqual({ key: 'chatgpt', label: 'ChatGPT', channelId: 'chatgpt' })
    expect(aiSourceOf('perplexity.ai / referral')).toMatchObject({ label: 'Perplexity', channelId: 'perplexity' })
    expect(aiSourceOf('claude.ai / referral')).toMatchObject({ label: 'Claude', channelId: 'claude' })
    expect(aiSourceOf('nuevo-asistente.io / referral')).toEqual({ key: 'nuevo_asistente_io', label: 'nuevo-asistente.io' })
    // Varios hosts del mismo asistente son una sola fila.
    expect(aiSourceOf('copilot.com / referral').key).toBe(aiSourceOf('copilot.microsoft.com / referral').key)
  })
})
