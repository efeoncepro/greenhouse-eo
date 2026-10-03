import { describe, expect, it } from 'vitest'

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { PlanStatItemV1 } from '../contracts/plan'
import { statBoardChannelsOf, statItemView, statPlatformOf } from './stat-card'

/**
 * Tarjeta con isotipo de canal (contrato AXIS `efeonce.insights-stat-card` 0.2.0, aprobada el 2026-10-03): la fuente
 * manda sobre el canal; una vez en el título si todas las cifras salen de las mismas plataformas; en cada celda si el
 * tablero mezcla motores de respuesta.
 */
const fact = (factId: string, metricId: string, source: string, channelId?: EvidenceFactV1['channelId']): EvidenceFactV1 => ({
  factVersion: 'evidence_fact_v1',
  factId,
  module: 'aeo',
  metricId,
  label: metricId,
  value: 33.3,
  unit: 'percent',
  numerator: null,
  denominator: null,
  population: 'p',
  source,
  method: { name: 'm', version: '1', description: 'd' } as EvidenceFactV1['method'],
  coverage: { kind: 'complete', ratio: null, populationSize: null },
  freshness: { asOf: '2026-09-30' },
  observation: 'observed',
  window: { start: '2026-09-01', endExclusive: '2026-10-01', timeZone: 'America/Santiago', granularity: 'period' } as unknown as EvidenceFactV1['window'],
  evidenceRef: 'ref',
  comparisonFactId: null,
  ...(channelId ? { channelId } : {})
})

const item = (f: EvidenceFactV1, label: string): PlanStatItemV1 => ({ itemId: f.metricId, label, factId: f.factId, comparisonFactId: null, direction: 'higher_is_better', estimated: false })

describe('isotipos de la tarjeta de cifra', () => {
  it('la fuente manda: Search Console, GA4 e ICO tienen su isotipo; si no, el canal del hecho', () => {
    expect(statPlatformOf(fact('a', 'clicks', 'greenhouse_growth.seo_gsc_daily', 'google'))).toBe('google_search_console')
    expect(statPlatformOf(fact('b', 'site.organic_sessions', 'ga4:property/1'))).toBe('google_analytics')
    expect(statPlatformOf(fact('c', 'ai_sessions.chatgpt', 'ga4:property/1', 'chatgpt'))).toBe('chatgpt')
    expect(statPlatformOf(fact('d', 'delivered.completed', 'ico_engine.ICO_METRIC_REGISTRY'))).toBe('greenhouse')
    expect(statPlatformOf(fact('e', 'page_one_keywords', 'greenhouse_growth.seo_rank_snapshots', 'google'))).toBe('google')
    expect(statPlatformOf(fact('f', 'share_of_model', 'greenhouse_growth.grader_runs'))).toBeNull()
  })

  it('SEO: una vez en el título, Search Console primero; ninguna celda lleva isotipo', () => {
    const board = statBoardChannelsOf([fact('a', 'clicks', 'greenhouse_growth.seo_gsc_daily', 'google'), fact('b', 'page_one_keywords', 'greenhouse_growth.seo_rank_snapshots', 'google')])

    expect(board).toEqual({ title: ['google_search_console', 'google'], perCell: false })
  })

  it('una cifra sin plataforma conocida apaga los isotipos del tablero (el título no afirma una fuente que no es)', () => {
    expect(statBoardChannelsOf([fact('a', 'share_of_model', 'greenhouse_growth.grader_runs'), fact('b', 'clicks', 'greenhouse_growth.seo_gsc_daily', 'google')])).toEqual({ title: [], perCell: false })
  })

  it('motores de respuesta distintos: isotipo en cada celda, nombre del canal y la métrica en context', () => {
    const facts = [fact('m1', 'mention_rate.google_ai_overview', 'greenhouse_growth.grader_runs', 'google_ai_overview'), fact('m2', 'mention_rate.openai', 'greenhouse_growth.grader_runs', 'chatgpt')]
    const board = statBoardChannelsOf(facts)
    const byId = new Map(facts.map(f => [f.factId, f]))

    expect(board).toEqual({ title: [], perCell: true })

    const view = statItemView(item(facts[0]!, 'Mención AIO'), byId, 'es-CL', board)!

    expect(view.label).toBe('AI Overview')
    expect(view.channel).toEqual({ platform: 'google_ai_overview', name: 'AI Overview' })
    expect(view.context).toBe('de las respuestas menciona la marca')
    expect(statItemView(item(facts[1]!, 'Mención GPT'), byId, 'es-CL', board)!.label).toBe('ChatGPT')
  })

  it('sin tablero (consumidor anterior) la cifra no cambia: sin canal ni context', () => {
    const f = fact('m1', 'mention_rate.openai', 'greenhouse_growth.grader_runs', 'chatgpt')
    const view = statItemView(item(f, 'Mención en ChatGPT'), new Map([[f.factId, f]]), 'es-CL')!

    expect([view.label, view.channel, view.context]).toEqual(['Mención en ChatGPT', null, null])
  })
})
