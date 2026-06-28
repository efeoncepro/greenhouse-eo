import { describe, expect, it } from 'vitest'

import {
  type HeadlessRenderer,
  type ProbeContext,
  type ProbeFetchResult,
  type ProbeFetcher
} from '../probes/contracts'
import { evaluateRobotsForAiBots, robotsTxtProbe } from '../probes/structural/robots-txt'
import { jsonLdProbe } from '../probes/structural/json-ld'
import { llmsTxtProbe } from '../probes/structural/llms-txt'
import { sitemapProbe } from '../probes/structural/sitemap'
import { coreWebVitalsProbe } from '../probes/structural/core-web-vitals'

// ── Helpers ──────────────────────────────────────────────────────────────────

const fetchResult = (overrides: Partial<ProbeFetchResult>): ProbeFetchResult => ({
  ok: true,
  status: 200,
  url: 'https://example.com/',
  body: '',
  contentType: null,
  errorCode: null,
  ...overrides
})

const ctxWith = (routes: Record<string, ProbeFetchResult>, headless: HeadlessRenderer | null = null): ProbeContext => {
  const fetcher: ProbeFetcher = async (path: string) =>
    routes[path] ?? fetchResult({ ok: false, status: 404, errorCode: 'http_error' })

  return { domain: 'example.com', baseUrl: 'https://example.com', fetcher, headless }
}

// ── robots.txt evaluator (pure) ──────────────────────────────────────────────

describe('TASK-1266 · evaluateRobotsForAiBots', () => {
  it('robots vacío → todos permitidos', () => {
    expect(evaluateRobotsForAiBots('').blocked).toEqual([])
  })

  it('Disallow / para * bloquea a todos', () => {
    const { blocked, allowed } = evaluateRobotsForAiBots('User-agent: *\nDisallow: /')

    expect(allowed).toEqual([])
    expect(blocked.length).toBeGreaterThan(0)
  })

  it('bloqueo específico a GPTBot sólo afecta a GPTBot', () => {
    const { blocked } = evaluateRobotsForAiBots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:')

    expect(blocked).toEqual(['GPTBot'])
  })

  it('Allow / override gana sobre Disallow /', () => {
    const { blocked } = evaluateRobotsForAiBots('User-agent: *\nAllow: /\nDisallow: /')

    expect(blocked).toEqual([])
  })

  it('ignora comentarios', () => {
    const { blocked } = evaluateRobotsForAiBots('# comentario\nUser-agent: PerplexityBot # bot\nDisallow: /')

    expect(blocked).toEqual(['PerplexityBot'])
  })
})

// ── robots.txt probe ─────────────────────────────────────────────────────────

describe('TASK-1266 · robotsTxtProbe', () => {
  it('404 → score 100 (sin robots = allow-all medido)', async () => {
    const out = await robotsTxtProbe.run(ctxWith({}))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(100)
  })

  it('bloqueo de bots → score proporcional', async () => {
    const out = await robotsTxtProbe.run(
      ctxWith({ '/robots.txt': fetchResult({ body: 'User-agent: GPTBot\nDisallow: /' }) })
    )

    expect(out.status).toBe('succeeded')
    expect(out.score).toBeLessThan(100)
    expect((out.evidence.blocked as string[])).toContain('GPTBot')
  })

  it('error de red → failed/null (no medido)', async () => {
    const out = await robotsTxtProbe.run(
      ctxWith({ '/robots.txt': fetchResult({ ok: false, status: 0, errorCode: 'network' }) })
    )

    expect(out.status).toBe('failed')
    expect(out.score).toBeNull()
  })
})

// ── JSON-LD probe ────────────────────────────────────────────────────────────

describe('TASK-1266 · jsonLdProbe', () => {
  it('Organization JSON-LD → score 100', async () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Organization', name: 'Acme' }, { '@type': 'WebSite' }]
    })}</script></head></html>`

    const out = await jsonLdProbe.run(ctxWith({ '/': fetchResult({ body: html }) }))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(100)
    expect(out.evidence.hasEntity).toBe(true)
  })

  it('sin JSON-LD → score 0 (ausencia medida, no null)', async () => {
    const out = await jsonLdProbe.run(ctxWith({ '/': fetchResult({ body: '<html><body>hola</body></html>' }) }))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(0)
  })

  it('home inaccesible → null', async () => {
    const out = await jsonLdProbe.run(ctxWith({ '/': fetchResult({ ok: false, status: 0, errorCode: 'timeout' }) }))

    expect(out.status).toBe('failed')
    expect(out.score).toBeNull()
  })
})

// ── llms.txt + sitemap probes ────────────────────────────────────────────────

describe('TASK-1266 · llmsTxtProbe', () => {
  it('presente con contenido → 100', async () => {
    const out = await llmsTxtProbe.run(
      ctxWith({ '/llms.txt': fetchResult({ body: '# Acme\nProducto líder en X.' }) })
    )

    expect(out.score).toBe(100)
  })

  it('404 → 0 (ausencia medida)', async () => {
    const out = await llmsTxtProbe.run(ctxWith({}))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(0)
  })
})

describe('TASK-1266 · sitemapProbe', () => {
  it('urlset válido → 100', async () => {
    const out = await sitemapProbe.run(
      ctxWith({ '/sitemap.xml': fetchResult({ body: '<urlset><url><loc>https://example.com/</loc></url></urlset>' }) })
    )

    expect(out.score).toBe(100)
  })

  it('404 → 0', async () => {
    const out = await sitemapProbe.run(ctxWith({}))

    expect(out.score).toBe(0)
  })
})

// ── Core Web Vitals (headless seam) ──────────────────────────────────────────

describe('TASK-1266 · coreWebVitalsProbe', () => {
  it('sin headless → skipped/no_headless', async () => {
    const out = await coreWebVitalsProbe.run(ctxWith({}, null))

    expect(out.status).toBe('skipped')
    expect(out.errorCode).toBe('no_headless')
  })

  it('con headless → puntúa desde el performance score', async () => {
    const headless: HeadlessRenderer = {
      render: async () => ({
        html: '<html></html>',
        coreWebVitals: { lcpMs: 1200, cls: 0.02, inpMs: 150, performanceScore: 0.92 },
        webmcpTools: null
      })
    }

    const out = await coreWebVitalsProbe.run(ctxWith({}, headless))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(92)
  })
})
