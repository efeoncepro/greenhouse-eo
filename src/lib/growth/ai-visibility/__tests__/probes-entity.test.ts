import { describe, expect, it } from 'vitest'

import {
  type EntityApiFetcher,
  type EntityFetchResult,
  type EntityProbeContext,
  type ProbeContext
} from '../probes/contracts'
import { knowledgeGraphProbe } from '../probes/entity/knowledge-graph'
import { redditUgcProbe } from '../probes/entity/reddit-ugc'
import { wikidataProbe } from '../probes/entity/wikidata'
import { hostMatchesDomain, normalizeBrandName } from '../probes/entity/shared'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ok = (body: string): EntityFetchResult => ({ ok: true, status: 200, body, errorCode: null })
const httpError = (status = 500): EntityFetchResult => ({ ok: false, status, body: '', errorCode: 'http_error' })

/** Fetcher canned por sustring de URL → respuesta. */
const cannedFetcher = (routes: Array<[match: string, res: EntityFetchResult]>): EntityApiFetcher => async url => {
  for (const [match, res] of routes) {
    if (url.includes(match)) return res
  }

  return { ok: false, status: 0, body: '', errorCode: 'network' }
}

const entityCtx = (overrides: Partial<EntityProbeContext> = {}): EntityProbeContext => ({
  brandName: 'Acme',
  domain: 'acme.com',
  market: 'CL',
  locale: 'es-CL',
  fetch: async () => ({ ok: false, status: 0, body: '', errorCode: 'network' }),
  knowledgeGraphApiKey: 'kg-key',
  ...overrides
})

const ctx = (entity: EntityProbeContext | null): ProbeContext => ({
  domain: 'acme.com',
  baseUrl: 'https://acme.com',
  fetcher: async () => ({ ok: false, status: 0, url: '/', body: '', contentType: null, errorCode: 'network' }),
  headless: null,
  entity
})

// ── shared helpers ───────────────────────────────────────────────────────────

describe('TASK-1267 · entity shared helpers', () => {
  it('hostMatchesDomain compara por registrable aproximado (sin www, subdominios)', () => {
    expect(hostMatchesDomain('https://acme.com/about', 'acme.com')).toBe(true)
    expect(hostMatchesDomain('www.acme.com', 'acme.com')).toBe(true)
    expect(hostMatchesDomain('shop.acme.com', 'acme.com')).toBe(true)
    expect(hostMatchesDomain('acme.com', 'www.acme.com')).toBe(true)
    expect(hostMatchesDomain('https://evil.com', 'acme.com')).toBe(false)
    expect(hostMatchesDomain(null, 'acme.com')).toBe(false)
  })

  it('normalizeBrandName ignora tildes y sufijos legales', () => {
    expect(normalizeBrandName('Açme S.A.')).toBe('acme')
    expect(normalizeBrandName('ACME SpA')).toBe('acme')
  })
})

// ── honest degradation: sin sub-contexto de entidad ──────────────────────────

describe('TASK-1267 · entity probes · honest degradation sin contexto', () => {
  it('KG, Wikidata y Reddit → skipped/no_entity_context si ctx.entity es null', async () => {
    const kg = await knowledgeGraphProbe.run(ctx(null))
    const wd = await wikidataProbe.run(ctx(null))
    const rd = await redditUgcProbe.run(ctx(null))

    for (const outcome of [kg, wd, rd]) {
      expect(outcome.status).toBe('skipped')
      expect(outcome.score).toBeNull()
      expect(outcome.errorCode).toBe('no_entity_context')
    }
  })
})

// ── Knowledge Graph probe ────────────────────────────────────────────────────

describe('TASK-1267 · knowledge_graph probe', () => {
  it('sin API key → skipped/not_configured (no 0)', async () => {
    const out = await knowledgeGraphProbe.run(ctx(entityCtx({ knowledgeGraphApiKey: null })))

    expect(out.status).toBe('skipped')
    expect(out.score).toBeNull()
    expect(out.errorCode).toBe('not_configured')
  })

  it('fetch no-OK → failed (null, no 0)', async () => {
    const out = await knowledgeGraphProbe.run(ctx(entityCtx({ fetch: cannedFetcher([['kgsearch', httpError()]]) })))

    expect(out.status).toBe('failed')
    expect(out.score).toBeNull()
  })

  it('sin match → succeeded score 0 (gap MEDIDO)', async () => {
    const out = await knowledgeGraphProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['kgsearch', ok(JSON.stringify({ itemListElement: [] }))]]) }))
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(0)
    expect(out.evidence.domainConfirmed).toBe(false)
  })

  it('match confirmado por dominio → score 100', async () => {
    const body = JSON.stringify({
      itemListElement: [
        { result: { '@type': ['Organization'], name: 'Acme', description: 'A company', url: 'https://acme.com' }, resultScore: 120 }
      ]
    })

    const out = await knowledgeGraphProbe.run(ctx(entityCtx({ fetch: cannedFetcher([['kgsearch', ok(body)]]) })))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(100)
    expect(out.evidence.domainConfirmed).toBe(true)
  })

  it('match por nombre sin dominio → score medio (riesgo homónimo)', async () => {
    const body = JSON.stringify({
      itemListElement: [
        { result: { '@type': ['Organization'], name: 'Acme', description: 'Other Acme', url: 'https://other.example' }, resultScore: 80 }
      ]
    })

    const out = await knowledgeGraphProbe.run(ctx(entityCtx({ fetch: cannedFetcher([['kgsearch', ok(body)]]) })))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBeGreaterThan(0)
    expect(out.score).toBeLessThan(100)
    expect(out.evidence.domainConfirmed).toBe(false)
  })
})

// ── Wikidata probe ───────────────────────────────────────────────────────────

describe('TASK-1267 · wikidata probe', () => {
  it('búsqueda no-OK → failed (null)', async () => {
    const out = await wikidataProbe.run(ctx(entityCtx({ fetch: cannedFetcher([['wbsearchentities', httpError()]]) })))

    expect(out.status).toBe('failed')
    expect(out.score).toBeNull()
  })

  it('sin candidatos → succeeded score 0 (gap MEDIDO)', async () => {
    const out = await wikidataProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['wbsearchentities', ok(JSON.stringify({ search: [] }))]]) }))
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(0)
  })

  it('entrada confirmada por sitio oficial (P856) → score 100', async () => {
    const search = ok(JSON.stringify({ search: [{ id: 'Q42', label: 'Acme', description: 'company' }] }))

    const get = ok(
      JSON.stringify({
        entities: {
          Q42: {
            claims: { P856: [{ mainsnak: { datavalue: { value: 'https://acme.com' } } }] },
            sitelinks: { enwiki: { title: 'Acme' } }
          }
        }
      })
    )

    const out = await wikidataProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['wbsearchentities', search], ['wbgetentities', get]]) }))
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(100)
    expect(out.evidence.domainConfirmed).toBe(true)
    expect(out.evidence.wikipediaSitelinks).toBe(1)
  })

  it('entrada con Wikipedia pero sin dominio confirmado → score medio', async () => {
    const search = ok(JSON.stringify({ search: [{ id: 'Q7', label: 'Acme', description: 'other' }] }))

    const get = ok(
      JSON.stringify({
        entities: { Q7: { claims: { P856: [{ mainsnak: { datavalue: { value: 'https://other.example' } } }] }, sitelinks: { enwiki: { title: 'Acme (other)' } } } }
      })
    )

    const out = await wikidataProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['wbsearchentities', search], ['wbgetentities', get]]) }))
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBeGreaterThan(0)
    expect(out.score).toBeLessThan(100)
    expect(out.evidence.domainConfirmed).toBe(false)
  })

  it('candidato sin poder confirmar entidades (wbgetentities falla) → degradación parcial honesta', async () => {
    const search = ok(JSON.stringify({ search: [{ id: 'Q9', label: 'Acme' }] }))

    const out = await wikidataProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['wbsearchentities', search], ['wbgetentities', httpError()]]) }))
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(50)
    expect(out.evidence.entitiesFetched).toBe(false)
  })
})

// ── Reddit / UGC probe ───────────────────────────────────────────────────────

describe('TASK-1267 · reddit_ugc probe', () => {
  it('búsqueda bloqueada/falla → failed (null, NO 0)', async () => {
    const out = await redditUgcProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['reddit.com/search', { ok: false, status: 429, body: '', errorCode: 'http_error' }]]) }))
    )

    expect(out.status).toBe('failed')
    expect(out.score).toBeNull()
  })

  it('sin menciones → succeeded score 0 (gap MEDIDO)', async () => {
    const out = await redditUgcProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['reddit.com/search', ok(JSON.stringify({ data: { children: [] } }))]]) }))
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(0)
    expect(out.evidence.mentions).toBe(0)
  })

  it('menciones con enlaces al dominio → score por volumen + domainLinkedMentions', async () => {
    const children = [
      { data: { subreddit: 'startups', url: 'https://acme.com/post', title: 'Acme launch' } },
      { data: { subreddit: 'startups', url: 'https://reddit.com/r/startups/x', title: 'about Acme' } },
      { data: { subreddit: 'SaaS', url: 'https://acme.com/blog', title: 'Acme review' } }
    ]

    const out = await redditUgcProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['reddit.com/search', ok(JSON.stringify({ data: { children } }))]]) }))
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(60) // 3 menciones → bucket medio
    expect(out.evidence.mentions).toBe(3)
    expect(out.evidence.domainLinkedMentions).toBe(2)
    expect(out.evidence.subreddits).toEqual(['startups', 'SaaS'])
  })

  it('menciones por nombre sin enlaces al dominio → flaggea riesgo de homónimo', async () => {
    const children = Array.from({ length: 12 }, (_, i) => ({
      data: { subreddit: 'random', url: `https://reddit.com/r/random/${i}`, title: 'Acme (the other one)' }
    }))

    const out = await redditUgcProbe.run(
      ctx(entityCtx({ fetch: cannedFetcher([['reddit.com/search', ok(JSON.stringify({ data: { children } }))]]) }))
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(100) // ≥10 menciones
    expect(out.evidence.domainLinkedMentions).toBe(0)
    expect(out.reason).toContain('homónimo')
  })
})
