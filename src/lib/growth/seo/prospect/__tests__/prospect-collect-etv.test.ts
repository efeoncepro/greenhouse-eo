/**
 * TASK-1805 — Guard CONDUCTUAL del carril prospecto: la única request ETV (`ranked_keywords`) lleva
 * `use_improved_etv` explícito y las demás fuentes (`competitors_domain` es `etv_ignored`; backlinks
 * no es Labs) NO lo reciben. Un grep de `use_improved_etv` no prueba esto; el payload real sí.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const providerMock = vi.fn()

vi.mock('../../register-provider-spend', () => ({}))

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { collectProspectMarketEvidence } from '../collect'

const okResponse = () => ({ ok: true, httpStatus: 200, cost: 0.01, tasks: [{ status_code: 20000, result: [{ items: [] }] }] })

const SUBJECT = { rootDomain: 'acme.cl', market: 'CL', locationCode: 2152, languageCode: 'es' }

describe('TASK-1805 — collectProspectMarketEvidence y la policy ETV', () => {
  beforeEach(() => {
    providerMock.mockReset()
    providerMock.mockResolvedValue(okResponse())
  })

  it('ranked_keywords lleva use_improved_etv:false explícito (legacy) y competitors_domain NO lleva el flag', async () => {
    const evidence = await collectProspectMarketEvidence({
      subject: SUBJECT,
      acquisitionOrganizationId: 'org-efeonce',
      competitorDomains: ['rival.cl'],
      env: {} as NodeJS.ProcessEnv
    })

    const calls = providerMock.mock.calls.map(call => call[0] as { endpoint: string; tasks: Array<Record<string, unknown>> })
    const ranked = calls.find(call => call.endpoint.includes('/ranked_keywords/'))
    const competitors = calls.find(call => call.endpoint.includes('/competitors_domain/'))
    const others = calls.filter(call => !call.endpoint.includes('/ranked_keywords/'))

    expect(ranked?.tasks[0]).toMatchObject({ use_improved_etv: false, target: 'acme.cl' })
    expect(competitors?.tasks[0]).not.toHaveProperty('use_improved_etv')
    for (const call of others) expect(call.tasks[0]).not.toHaveProperty('use_improved_etv')

    expect(evidence.etvMethodology).toMatchObject({
      version: 'legacy_static_v1',
      evidence: 'explicit_request',
      policyVersion: 'etv-policy.v1',
      historicalBasis: null
    })
    expect(Date.parse(evidence.etvMethodology.requestedAt)).not.toBeNaN()
  })

  it('el override de método (claim → collect) manda sobre la config: improved envía true', async () => {
    await collectProspectMarketEvidence({
      subject: SUBJECT,
      acquisitionOrganizationId: 'org-efeonce',
      competitorDomains: ['rival.cl'],
      env: {} as NodeJS.ProcessEnv,
      etvMethodologyVersion: 'improved_layout_clickstream_v2'
    })

    const ranked = providerMock.mock.calls
      .map(call => call[0] as { endpoint: string; tasks: Array<Record<string, unknown>> })
      .find(call => call.endpoint.includes('/ranked_keywords/'))

    expect(ranked?.tasks[0]).toMatchObject({ use_improved_etv: true })
  })

  it('config inválida falla cerrado ANTES de cualquier llamada al proveedor', async () => {
    await expect(
      collectProspectMarketEvidence({
        subject: SUBJECT,
        acquisitionOrganizationId: 'org-efeonce',
        env: { GROWTH_SEO_ETV_METHODOLOGY_VERSION: 'v3' } as unknown as NodeJS.ProcessEnv
      })
    ).rejects.toMatchObject({ code: 'invalid_etv_methodology_config' })

    expect(providerMock).not.toHaveBeenCalled()
  })
})
