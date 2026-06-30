import { describe, expect, it } from 'vitest'

import {
  type HeadlessRenderer,
  type ProbeContext,
  type ProbeFetchResult,
  type ProbeFetcher
} from '../probes/contracts'
import { wellKnownMcpProbe } from '../probes/agentic/well-known-mcp'
import { apiDiscoverabilityProbe } from '../probes/agentic/api-discoverability'
import { structuredActionsProbe } from '../probes/agentic/structured-actions'
import { domSemanticsProbe } from '../probes/agentic/dom-semantics'
import { webmcpToolsProbe } from '../probes/agentic/webmcp-tools'

const fetchResult = (overrides: Partial<ProbeFetchResult>): ProbeFetchResult => ({
  ok: true,
  status: 200,
  url: 'https://example.com/',
  body: '',
  contentType: null,
  errorCode: null,
  ...overrides
})

/** routes: path → result. Paths no listados → 404 definitivo (ausencia medida). */
const ctxWith = (
  routes: Record<string, ProbeFetchResult>,
  opts: { headless?: HeadlessRenderer | null; missingAsNetwork?: boolean } = {}
): ProbeContext => {
  const fetcher: ProbeFetcher = async (path: string) =>
    routes[path] ??
    (opts.missingAsNetwork
      ? fetchResult({ ok: false, status: 0, errorCode: 'network' })
      : fetchResult({ ok: false, status: 404, errorCode: 'http_error' }))

  return { domain: 'example.com', baseUrl: 'https://example.com', fetcher, headless: opts.headless ?? null }
}

describe('TASK-1266 · wellKnownMcpProbe', () => {
  it('200 → 100', async () => {
    const out = await wellKnownMcpProbe.run(ctxWith({ '/.well-known/mcp': fetchResult({ body: '{}' }) }))

    expect(out.score).toBe(100)
  })

  it('404 definitivo → 0 (ausencia medida)', async () => {
    const out = await wellKnownMcpProbe.run(ctxWith({}))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(0)
  })

  it('sólo errores de red → null (no medible)', async () => {
    const out = await wellKnownMcpProbe.run(ctxWith({}, { missingAsNetwork: true }))

    expect(out.status).toBe('failed')
    expect(out.score).toBeNull()
  })
})

describe('TASK-1266 · apiDiscoverabilityProbe', () => {
  it('openapi.json presente → 100', async () => {
    const out = await apiDiscoverabilityProbe.run(ctxWith({ '/openapi.json': fetchResult({ body: '{"openapi":"3.0"}' }) }))

    expect(out.score).toBe(100)
  })

  it('todos 404 → 0', async () => {
    const out = await apiDiscoverabilityProbe.run(ctxWith({}))

    expect(out.score).toBe(0)
  })
})

describe('TASK-1266 · structuredActionsProbe', () => {
  it('SearchAction → 100', async () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'WebSite',
      potentialAction: { '@type': 'SearchAction', target: 'https://example.com/q={query}' }
    })}</script>`

    const out = await structuredActionsProbe.run(ctxWith({ '/': fetchResult({ body: html }) }))

    expect(out.score).toBe(100)
    expect(out.evidence.hasSearch).toBe(true)
  })

  it('potentialAction no-search → 70', async () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Restaurant',
      potentialAction: { '@type': 'OrderAction' }
    })}</script>`

    const out = await structuredActionsProbe.run(ctxWith({ '/': fetchResult({ body: html }) }))

    expect(out.score).toBe(70)
  })

  it('sin acciones → 0; home inaccesible → null', async () => {
    expect((await structuredActionsProbe.run(ctxWith({ '/': fetchResult({ body: '<html></html>' }) }))).score).toBe(0)
    expect(
      (await structuredActionsProbe.run(ctxWith({ '/': fetchResult({ ok: false, status: 0, errorCode: 'timeout' }) }))).score
    ).toBeNull()
  })
})

describe('TASK-1266 · domSemanticsProbe', () => {
  it('DOM completo → 100', async () => {
    const html =
      '<html><head><title>Acme</title><meta name="description" content="Acme líder"></head>' +
      '<body><header></header><nav></nav><main><h1>Acme</h1></main><footer></footer></body></html>'

    const out = await domSemanticsProbe.run(ctxWith({ '/': fetchResult({ body: html }) }))

    expect(out.score).toBe(100)
  })

  it('DOM pobre → score bajo medido (no null)', async () => {
    const out = await domSemanticsProbe.run(ctxWith({ '/': fetchResult({ body: '<html><body><div>hola</div></body></html>' }) }))

    expect(out.status).toBe('succeeded')
    expect(out.score).toBe(0)
  })

  it('home inaccesible → null', async () => {
    const out = await domSemanticsProbe.run(ctxWith({ '/': fetchResult({ ok: false, status: 0, errorCode: 'network' }) }))

    expect(out.score).toBeNull()
  })
})

describe('TASK-1266 · webmcpToolsProbe', () => {
  it('sin headless → skipped/no_headless', async () => {
    const out = await webmcpToolsProbe.run(ctxWith({}, { headless: null }))

    expect(out.status).toBe('skipped')
    expect(out.errorCode).toBe('no_headless')
  })

  it('con tools registradas → 100', async () => {
    const headless: HeadlessRenderer = {
      render: async () => ({ html: '<html></html>', coreWebVitals: null, webmcpTools: ['search', 'book'] })
    }

    const out = await webmcpToolsProbe.run(ctxWith({}, { headless }))

    expect(out.score).toBe(100)
    expect(out.evidence.toolCount).toBe(2)
  })

  it('headless sin tools → 0 (medido)', async () => {
    const headless: HeadlessRenderer = {
      render: async () => ({ html: '<html></html>', coreWebVitals: null, webmcpTools: [] })
    }

    const out = await webmcpToolsProbe.run(ctxWith({}, { headless }))

    expect(out.score).toBe(0)
  })
})
