import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/ai/dataforseo', () => ({ postDataForSeoTask: vi.fn() }))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { replayEtvFixtures, type EtvProviderFixture } from '../replay'

const fixture = (name: string): EtvProviderFixture =>
  JSON.parse(readFileSync(path.resolve(__dirname, '..', '__fixtures__', `${name}.json`), 'utf8')) as EtvProviderFixture

describe('TASK-1805 — replay de fixtures con los parsers de producción', () => {
  it('foto de dominio: mismas posiciones/count, ETV y traffic cost cambian, cero llamadas', () => {
    const replay = replayEtvFixtures({
      family: 'domain_rank_overview',
      legacy: fixture('domain_rank_overview.legacy'),
      improved: fixture('domain_rank_overview.improved'),
      mode: 'exact_ab',
      context: { domain: 'cliente.cl', locationCode: '2152', languageCode: 'es' }
    })

    expect(replay.providerCalls).toBe(0)
    expect(replay.proves).toBe('technical_compatibility_only')
    expect(replay.comparison.organicCount.absolute).toBe(0)
    expect(replay.comparison.organicEtv).toMatchObject({ legacy: 8210.44, improved: 6377.9 })
    expect(replay.comparison.organicEstimatedTrafficCostUsd.relative).toBeLessThan(0)
  })

  it('relevant pages: la fórmula cambia valor Y membresía del top-N (entradas/salidas/rank)', () => {
    const replay = replayEtvFixtures({
      family: 'relevant_pages',
      legacy: fixture('relevant_pages.legacy'),
      improved: fixture('relevant_pages.improved'),
      mode: 'exact_ab'
    })

    expect(replay.comparison.membership).toMatchObject({
      entries: ['cliente.cl/ubica-tienda'],
      exits: ['cliente.cl/blog/colores'],
      shared: 3,
      jaccard: 0.6
    })
    expect(replay.comparison.membership.rankChanges).toEqual(
      expect.arrayContaining([
        { subject: 'cliente.cl/tiendas', legacyRank: 4, improvedRank: 2 },
        { subject: 'cliente.cl/guia', legacyRank: 2, improvedRank: 3 }
      ])
    )
  })

  it('un fixture con task fallido no es evidencia: lanza', () => {
    const broken = { ...fixture('domain_rank_overview.legacy'), tasks: [{ status_code: 40000, result: [] }] }

    expect(() =>
      replayEtvFixtures({ family: 'domain_rank_overview', legacy: broken, improved: fixture('domain_rank_overview.improved'), mode: 'exact_ab' })
    ).toThrowError(/etv_fixture_invalid/)
  })
})
