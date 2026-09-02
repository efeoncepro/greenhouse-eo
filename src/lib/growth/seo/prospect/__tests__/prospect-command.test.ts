import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1709 — el command con sus gates, en orden: flag OFF → disabled sin llamadas;
 * cost_blocked → CERO llamadas al proveedor; idempotencia (mismo día) → lo existente
 * con USD 0; happy path → finalize con hechos y costo real.
 */

vi.mock('server-only', () => ({}))

const providerCalls: Array<{ endpoint: string }> = []

const state = {
  flagOn: true,
  gateAllowed: true,
  gateBlockedReason: null as string | null,
  actorUsedToday: 0,
  claimOutcome: 'claimed' as 'claimed' | 'already_exists',
  finalized: [] as Array<{ diagnosticId: string; factCount: number; actualCostUsd: number }>,
  failed: [] as string[]
}

vi.mock('../../flags', () => ({
  isSeoProspectDiagnosticEnabled: () => state.flagOn
}))

vi.mock('../../entitlement', () => ({
  enforceProspectDiagnosticBudget: async () =>
    state.gateAllowed
      ? { allowed: true, acquisitionOrganizationId: 'org-efeonce', effectiveBudgetUsd: 1, blockedReason: null }
      : {
          allowed: false,
          acquisitionOrganizationId: 'org-efeonce',
          effectiveBudgetUsd: 0.1,
          blockedReason: state.gateBlockedReason ?? 'cost_blocked'
        },
  resolveProspectDiagnosticCeilingUsd: () => 1,
  resolveProspectDiagnosticDailyActorCap: () => 10
}))

vi.mock('../collect', () => ({
  collectProspectMarketEvidence: async () => {
    providerCalls.push({ endpoint: 'market' })

    return {
      etvMethodology: {
        version: 'legacy_static_v1',
        evidence: 'explicit_request',
        requestedAt: '2026-10-15T12:00:00.000Z',
        policyVersion: 'etv-policy.v1',
        historicalBasis: null
      },
      rankedKeywords: {
        source: 'labs_ranked_keywords',
        ok: true,
        costUsd: 0.14,
        items: [
          {
            ranked_serp_element: { serp_item: { type: 'organic', rank_group: 12, etv: 10 } },
            keyword_data: { keyword: 'pintura' }
          }
        ],
        errorCode: null
      },
      competitorsDomain: { source: 'labs_competitors_domain', ok: true, costUsd: 0.02, items: [], errorCode: null },
      backlinksCompetitors: { source: 'backlinks_competitors', ok: true, costUsd: 0.02, items: [], errorCode: null },
      domainIntersection: {
        source: 'backlinks_domain_intersection',
        ok: false,
        costUsd: 0,
        items: [],
        errorCode: 'no_competitors_for_link_gap'
      },
      actualCostUsd: 0.18
    }
  }
}))

vi.mock('../site-evidence', () => ({
  collectProspectSiteEvidence: async () => [],
  collectProspectOnPageEvidence: async () => []
}))

vi.mock('../store', () => ({
  countActorDiagnosticsToday: async () => state.actorUsedToday,
  claimProspectDiagnostic: async () =>
    state.claimOutcome === 'claimed'
      ? { outcome: 'claimed', diagnosticId: 'seopd-new' }
      : {
          outcome: 'already_exists',
          existing: {
            diagnosticId: 'seopd-prev',
            subject: { rootDomain: 'acme.cl', market: 'CL', languageCode: 'es', locationCode: 2152 },
            status: 'completed',
            facts: [],
            cost: { ceilingUsd: 1, forecastUsd: 0.25, actualUsd: 0.2 },
            provenance: { runAt: 'x', completedAt: 'y', createdBy: 'op', sources: [] }
          }
        },
  finalizeProspectDiagnostic: async (input: { diagnosticId: string; facts: unknown[]; actualCostUsd: number }) => {
    state.finalized.push({
      diagnosticId: input.diagnosticId,
      factCount: input.facts.length,
      actualCostUsd: input.actualCostUsd
    })
  },
  failProspectDiagnostic: async (diagnosticId: string) => {
    state.failed.push(diagnosticId)
  },
  getProspectDiagnostic: async (diagnosticId: string) => ({
    diagnosticId,
    subject: { rootDomain: 'acme.cl', market: 'CL', languageCode: 'es', locationCode: 2152 },
    status: 'completed',
    facts: [],
    cost: { ceilingUsd: 1, forecastUsd: 0.25, actualUsd: 0.18 },
    provenance: { runAt: 'x', completedAt: 'y', createdBy: 'op', sources: [] }
  })
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: () => undefined
}))

import { runProspectDiagnostic } from '../command'

const INPUT = { rootDomain: 'acme.cl', market: 'CL', actor: 'operator@efeonce' }

beforeEach(() => {
  providerCalls.length = 0
  state.flagOn = true
  state.gateAllowed = true
  state.gateBlockedReason = null
  state.actorUsedToday = 0
  state.claimOutcome = 'claimed'
  state.finalized = []
  state.failed = []
})

describe('runProspectDiagnostic', () => {
  it('flag OFF → disabled, cero llamadas al proveedor', async () => {
    state.flagOn = false

    const result = await runProspectDiagnostic(INPUT)

    expect(result).toEqual({ ok: false, errorCode: 'disabled' })
    expect(providerCalls).toHaveLength(0)
  })

  it('sujeto inválido → invalid_domain sin gastar', async () => {
    const result = await runProspectDiagnostic({ ...INPUT, rootDomain: 'no válido' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errorCode).toBe('invalid_domain')
    expect(providerCalls).toHaveLength(0)
  })

  it('tope diario del actor alcanzado → daily_cap_exceeded sin gastar', async () => {
    state.actorUsedToday = 10

    const result = await runProspectDiagnostic(INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errorCode).toBe('daily_cap_exceeded')
    expect(providerCalls).toHaveLength(0)
  })

  it('forecast que no cabe → cost_blocked y CERO llamadas', async () => {
    state.gateAllowed = false
    state.gateBlockedReason = 'cost_blocked'

    const result = await runProspectDiagnostic(INPUT)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errorCode).toBe('cost_blocked')
      expect(result.forecastUsd).toBeGreaterThan(0)
    }

    expect(providerCalls).toHaveLength(0)
  })

  it('idempotencia: mismo dominio/mercado/día → lo existente, reused, USD 0', async () => {
    state.claimOutcome = 'already_exists'

    const result = await runProspectDiagnostic(INPUT)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.reused).toBe(true)
      expect(result.diagnostic.diagnosticId).toBe('seopd-prev')
    }

    expect(providerCalls).toHaveLength(0)
    expect(state.finalized).toHaveLength(0)
  })

  it('happy path: colecta, deriva y finaliza con el costo real', async () => {
    const result = await runProspectDiagnostic(INPUT)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.reused).toBe(false)

    expect(state.finalized).toHaveLength(1)
    expect(state.finalized[0].diagnosticId).toBe('seopd-new')
    expect(state.finalized[0].factCount).toBeGreaterThan(0)
    expect(state.finalized[0].actualCostUsd).toBe(0.18)
    expect(state.failed).toHaveLength(0)
  })
})
