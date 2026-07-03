import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAMPLE_PUBLIC_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'
import { GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION } from '@/lib/growth/ai-visibility/report/contracts'

/**
 * TASK-1280 Slice 2 — Test de contrato del PAYLOAD público headless.
 *
 * `GET /report/[token]` alimenta a `efeonce-web` (render tonto). Este test bloquea el
 * contrato a nivel del payload serializado: que exponga el modelo render-ready + versión
 * + header, que incluya el headline público (`engineSnapshot`) y que NUNCA filtre internos
 * (`providerFindings`/`accuracyFindings`/narrativa cruda). El no-leak es por construcción de
 * tipo (el modelo deriva de `PublicGraderReport`); este test lo verifica en el borde de red.
 *
 * `organizationName` en runtime es la marca evaluada por token (`grader_profiles.brand_name`);
 * "Globe" acá es sólo el fixture de test.
 */

const guard = { allowed: true }

const snapshotState = {
  value: {
    reportId: 'grpt-1',
    runId: 'run-1',
    reportToken: 'grt-deadbeef',
    asOf: '2026-05-20T12:00:00.000Z',
    expiresAt: null as string | null,
    publicReport: SAMPLE_PUBLIC_REPORT,
    brandName: 'Globe'
  } as unknown | null
}

vi.mock('@/lib/growth/ai-visibility/public-delivery/read-guard', () => ({
  checkPublicReadAllowed: async () => guard.allowed
}))

vi.mock('@/lib/growth/ai-visibility/report/snapshot', () => ({
  readPublicGraderReport: async () => snapshotState.value
}))

const callGet = async (token = 'grt-deadbeef') => {
  const { GET } = await import('../route')
  const request = new Request(`http://localhost/api/public/growth/ai-visibility/report/${token}`)

  return GET(request, { params: Promise.resolve({ token }) })
}

beforeEach(() => {
  guard.allowed = true
  snapshotState.value = {
    reportId: 'grpt-1',
    runId: 'run-1',
    reportToken: 'grt-deadbeef',
    asOf: '2026-05-20T12:00:00.000Z',
    expiresAt: null,
    publicReport: SAMPLE_PUBLIC_REPORT,
    brandName: 'Globe'
  }
})

describe('GET /report/[token] — contrato público headless (TASK-1280)', () => {
  it('expone model (publicWeb) + modelVersion + header manteniendo back-compat', async () => {
    const res = await callGet()

    expect(res.status).toBe(200)
    const body = await res.json()

    // Modelo render-ready + versión estable.
    expect(body.model.variant).toBe('publicWeb')
    expect(body.modelVersion).toBe(GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION)

    // Header render-ready (masthead): org evaluada + fecha + período, no vacíos.
    expect(body.header.organizationName).toBe('Globe')
    expect(typeof body.header.reportDate).toBe('string')
    expect(body.header.reportDate.length).toBeGreaterThan(0)
    expect(body.header.periodLabel.length).toBeGreaterThan(0)

    // Back-compat: el DTO crudo + metadata previos intactos.
    expect(body.report.audience).toBe('public')
    expect(body.asOf).toBe('2026-05-20T12:00:00.000Z')
    expect(body).toHaveProperty('expiresAt')
  })

  it('incluye engineSnapshot (headline público del lead magnet), NO es un leak', async () => {
    const res = await callGet()
    const body = await res.json()

    // Visibilidad por motor = valor público del lead magnet (TASK-1252): SÍ va en el payload.
    expect(Array.isArray(body.model.engineSnapshot)).toBe(true)
    expect(body.model.engineSnapshot.length).toBeGreaterThan(0)
    expect(Array.isArray(body.report.providerPresence)).toBe(true)
  })

  it('incluye señales public-safe additive en model para el render headless', async () => {
    const res = await callGet()
    const body = await res.json()

    expect(body.model.citationSourceBreakdown).toEqual(body.report.citationSourceBreakdown)
    expect(body.model.categoryTaxonomySummary).toEqual(body.report.categoryTaxonomySummary)
    expect(body.model.readiness).toEqual(body.report.readiness)
    expect(body.model.agenticAxisScore).toBeNull()
  })

  it('NUNCA filtra internos: providerFindings/accuracyFindings/narrativa cruda', async () => {
    const res = await callGet()
    const body = await res.json()
    const serialized = JSON.stringify(body)

    // Claves internal-only que NO existen en PublicGraderReport (no-leak por construcción).
    expect(serialized).not.toContain('providerFindings')
    expect(serialized).not.toContain('accuracyFindings')
    // Marcadores de narrativa cruda del run interno (fixture) que NUNCA deben cruzar.
    expect(serialized).not.toContain('INTERNAL')
    expect(serialized).not.toContain('invisible en Perplexity')
  })

  it('rate-limit → 429 sin filtrar el snapshot', async () => {
    guard.allowed = false
    const res = await callGet()

    expect(res.status).toBe(429)
    const body = await res.json()

    expect(body).not.toHaveProperty('model')
  })

  it('token inexistente/expirado → 404 indistinto', async () => {
    snapshotState.value = null
    const res = await callGet('grt-missing')

    expect(res.status).toBe(404)
  })
})
