import { describe, expect, it } from 'vitest'

import {
  isAgenticReadinessEnabled,
  isProbesEnabled
} from '../flags'
import {
  NO_HEADLESS_OUTCOME,
  PROBE_LAYER_VERSION,
  type Probe,
  type ProbeContext,
  type ProbeOutcome
} from '../probes/contracts'
import { runProbes } from '../probes/gatherer'
import { createProbeFetcher, resolveSubjectSite } from '../probes/safe-fetch'
import { createProbeRegistry } from '../probes/registry'

// ── Helpers ────────────────────────────────────────────────────────────────

const makeCtx = (overrides: Partial<ProbeContext> = {}): ProbeContext => ({
  domain: 'example.com',
  baseUrl: 'https://example.com',
  fetcher: async () => ({ ok: true, status: 200, url: 'https://example.com/', body: '', contentType: null, errorCode: null }),
  headless: null,
  ...overrides
})

const fakeProbe = (kind: Probe['kind'], axis: Probe['axis'], outcome: ProbeOutcome, requiresHeadless = false): Probe => ({
  kind,
  axis,
  requiresHeadless,
  run: async () => outcome
})

const okOutcome: ProbeOutcome = { status: 'succeeded', score: 80, reason: 'ok', evidence: { hits: 1 } }

// ── Gatherer: honest degradation + envelope ──────────────────────────────────

describe('TASK-1266 · probe gatherer', () => {
  it('asigna runId, kind, axis, version, latencia e id a cada probe', async () => {
    const results = await runProbes({
      runId: 'grun-1',
      probes: [fakeProbe('robots_txt', 'structural', okOutcome)],
      ctx: makeCtx(),
      clock: (() => {
        let t = 0

        return () => (t += 5)
      })(),
      newProbeId: () => 'gprb-fixed',
      now: () => '2026-06-28T00:00:00.000Z'
    })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      probeId: 'gprb-fixed',
      runId: 'grun-1',
      probeKind: 'robots_txt',
      axis: 'structural',
      status: 'succeeded',
      score: 80,
      probeLayerVersion: PROBE_LAYER_VERSION,
      createdAt: '2026-06-28T00:00:00.000Z'
    })
    expect(results[0].latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('degrada a skipped/no_headless cuando el probe requiere headless y no hay runtime', async () => {
    const results = await runProbes({
      runId: 'grun-1',
      probes: [fakeProbe('core_web_vitals', 'structural', okOutcome, true)],
      ctx: makeCtx({ headless: null })
    })

    expect(results[0].status).toBe('skipped')
    expect(results[0].score).toBeNull()
    expect(results[0].errorCode).toBe('no_headless')
    expect(results[0].reason).toBe(NO_HEADLESS_OUTCOME.reason)
  })

  it('un probe que lanza degrada a failed, sin tumbar el resto', async () => {
    const throwing: Probe = {
      kind: 'json_ld',
      axis: 'structural',
      requiresHeadless: false,
      run: async () => {
        throw new Error('boom')
      }
    }

    const results = await runProbes({
      runId: 'grun-1',
      probes: [throwing, fakeProbe('sitemap', 'structural', okOutcome)],
      ctx: makeCtx()
    })

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ probeKind: 'json_ld', status: 'failed', score: null })
    expect(results[1]).toMatchObject({ probeKind: 'sitemap', status: 'succeeded', score: 80 })
  })
})

// ── Registry: axis gating ────────────────────────────────────────────────────

describe('TASK-1266 · probe registry', () => {
  it('estructural sin agentic vs ambos ejes (agentic sólo si su flag está ON)', () => {
    const structuralOnly = createProbeRegistry({ structural: true, agentic: false })
    const both = createProbeRegistry({ structural: true, agentic: true })

    expect(structuralOnly.length).toBeGreaterThan(0)
    expect(structuralOnly.every(p => p.axis === 'structural')).toBe(true)
    expect(both.some(p => p.axis === 'agentic')).toBe(true)
    expect(both.length).toBeGreaterThan(structuralOnly.length)
    expect(createProbeRegistry({ structural: false, agentic: false })).toEqual([])
  })
})

// ── Flags: defaults OFF + gating jerárquico ──────────────────────────────────

describe('TASK-1266 · probe flags', () => {
  const env = (overrides: Record<string, string>): NodeJS.ProcessEnv => ({ ...overrides }) as NodeJS.ProcessEnv
  const base = { GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true' }

  it('probes default OFF', () => {
    expect(isProbesEnabled(env({}))).toBe(false)
    expect(isProbesEnabled(env({ GROWTH_AI_VISIBILITY_PROBES_ENABLED: 'true' }))).toBe(false) // sin kill switch global
    expect(isProbesEnabled(env({ ...base, GROWTH_AI_VISIBILITY_PROBES_ENABLED: 'true' }))).toBe(true)
  })

  it('agentic requiere probes ON', () => {
    expect(isAgenticReadinessEnabled(env({ ...base, GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED: 'true' }))).toBe(false)
    expect(
      isAgenticReadinessEnabled(
        env({
          ...base,
          GROWTH_AI_VISIBILITY_PROBES_ENABLED: 'true',
          GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED: 'true'
        })
      )
    ).toBe(true)
  })
})

// ── Safe fetch: SSRF guard + site resolution ─────────────────────────────────

describe('TASK-1266 · resolveSubjectSite', () => {
  it('normaliza host a baseUrl https', () => {
    expect(resolveSubjectSite('http://Example.com/path')).toEqual({ domain: 'example.com', baseUrl: 'https://example.com' })
    expect(resolveSubjectSite('acme.io')).toEqual({ domain: 'acme.io', baseUrl: 'https://acme.io' })
  })

  it('rechaza nulls, hosts no públicos y esquemas no http', () => {
    expect(resolveSubjectSite(null)).toBeNull()
    expect(resolveSubjectSite('http://localhost:3000')).toBeNull()
    expect(resolveSubjectSite('http://127.0.0.1')).toBeNull()
    expect(resolveSubjectSite('http://169.254.169.254')).toBeNull()
    expect(resolveSubjectSite('http://10.0.0.5')).toBeNull()
    expect(resolveSubjectSite('ftp://example.com')).toBeNull()
  })
})

describe('TASK-1266 · createProbeFetcher', () => {
  it('bloquea cross-host (path absoluto a otro dominio)', async () => {
    const fetcher = createProbeFetcher('https://example.com', { fetchImpl: (async () => new Response('x')) as typeof fetch })
    const res = await fetcher('https://evil.test/robots.txt')

    expect(res.ok).toBe(false)
    expect(res.errorCode).toBe('blocked')
  })

  it('hace GET same-host y devuelve body + status', async () => {
    const fetchImpl = (async () =>
      new Response('User-agent: *', { status: 200, headers: { 'content-type': 'text/plain' } })) as unknown as typeof fetch

    const fetcher = createProbeFetcher('https://example.com', { fetchImpl })
    const res = await fetcher('/robots.txt')

    expect(res.ok).toBe(true)
    expect(res.status).toBe(200)
    expect(res.body).toContain('User-agent')
    expect(res.errorCode).toBeNull()
  })

  it('marca http_error en 404', async () => {
    const fetchImpl = (async () => new Response('nope', { status: 404 })) as unknown as typeof fetch
    const fetcher = createProbeFetcher('https://example.com', { fetchImpl })
    const res = await fetcher('/llms.txt')

    expect(res.ok).toBe(false)
    expect(res.status).toBe(404)
    expect(res.errorCode).toBe('http_error')
  })

  it('no lee body si content-length excede el tope', async () => {
    const fetchImpl = (async () =>
      new Response('x'.repeat(50), {
        status: 200,
        headers: { 'content-length': String(10_000_000) }
      })) as unknown as typeof fetch

    const fetcher = createProbeFetcher('https://example.com', { fetchImpl })
    const res = await fetcher('/', { maxBytes: 1000 })

    expect(res.errorCode).toBe('too_large')
    expect(res.body).toBe('')
  })

  it('traduce error de red a errorCode network sin lanzar', async () => {
    const fetchImpl = (async () => {
      throw new Error('ECONNREFUSED')
    }) as unknown as typeof fetch

    const fetcher = createProbeFetcher('https://example.com', { fetchImpl })
    const res = await fetcher('/robots.txt')

    expect(res.ok).toBe(false)
    expect(res.errorCode).toBe('network')
  })
})
