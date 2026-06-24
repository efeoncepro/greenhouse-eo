import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type GrowthAiVisibilityProviderObservation } from '../contracts'
import { createFakeProviderAdapter } from '../providers/fake-adapter'

// Estado mutable del store mockeado.
const state: {
  existingByKey: Record<string, { runId: string }>
  inserted: GrowthAiVisibilityProviderObservation[]
  lastStatus: string | null
  lastEstimatedCost: number | null
} = { existingByKey: {}, inserted: [], lastStatus: null, lastEstimatedCost: null }

vi.mock('../store', () => ({
  findRunByIdempotencyKey: async (key: string) => state.existingByKey[key] ?? null,
  findOrCreateGraderProfile: async () => ({
    profileId: 'gprf-1',
    publicId: 'EO-GAVP-0001',
    brandName: 'Efeonce',
    websiteUrl: 'https://efeoncepro.com',
    market: 'Chile',
    locale: 'es-CL',
    category: 'marketing',
    competitorsDeclared: [],
    status: 'active'
  }),
  createGraderRun: async (input: Record<string, unknown>) => ({
    runId: 'grun-1',
    publicId: 'EO-GRUN-00001',
    profileId: 'gprf-1',
    runKind: input.runKind,
    mode: input.mode,
    status: 'pending',
    providerPolicyVersion: input.providerPolicyVersion,
    promptPackVersion: input.promptPackVersion,
    requestedProviders: input.requestedProviders,
    idempotencyKey: input.idempotencyKey ?? null,
    estimatedCostUsd: 0,
    costCeilingUsd: input.costCeilingUsd ?? null,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-06-24T00:00:00.000Z'
  }),
  updateGraderRunStatus: async (input: { runId: string; status: string; estimatedCostUsd?: number }) => {
    state.lastStatus = input.status
    if (input.estimatedCostUsd !== undefined) state.lastEstimatedCost = input.estimatedCostUsd

    return {
      runId: input.runId,
      publicId: 'EO-GRUN-00001',
      profileId: 'gprf-1',
      runKind: 'smoke',
      mode: 'full',
      status: input.status,
      providerPolicyVersion: 'policy.v1',
      promptPackVersion: 'prompt-pack.v1',
      requestedProviders: ['openai', 'anthropic'],
      idempotencyKey: null,
      estimatedCostUsd: input.estimatedCostUsd ?? 0,
      costCeilingUsd: 2,
      startedAt: '2026-06-24T00:00:00.000Z',
      finishedAt: '2026-06-24T00:00:05.000Z',
      createdAt: '2026-06-24T00:00:00.000Z'
    }
  },
  insertProviderObservations: async (observations: GrowthAiVisibilityProviderObservation[]) => {
    state.inserted.push(...observations)

    return observations.length
  },
  getRunObservations: async () => state.inserted
}))

const { executeGraderRun } = await import('../run-engine')

const baseInput = {
  profile: {
    brandName: 'Efeonce',
    websiteUrl: 'https://efeoncepro.com',
    market: 'Chile',
    locale: 'es-CL',
    category: 'marketing',
    competitorsDeclared: []
  },
  runKind: 'smoke' as const,
  mode: 'full' as const,
  promptPackVersion: 'prompt-pack.v1',
  prompts: [
    { promptId: 'p01', promptText: '¿Qué agencias en Chile?' },
    { promptId: 'p03', promptText: '¿Mejores agencias en Chile?' }
  ]
}

beforeEach(() => {
  state.existingByKey = {}
  state.inserted = []
  state.lastStatus = null
  state.lastEstimatedCost = null
})

describe('growth/ai-visibility — executeGraderRun (primitive canónico)', () => {
  it('mezcla succeed (openai) + skip (anthropic) → run partial, persiste todas las observaciones', async () => {
    const result = await executeGraderRun({
      ...baseInput,
      adapters: {
        openai: createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' }),
        anthropic: createFakeProviderAdapter({ provider: 'anthropic', behavior: 'skip' })
      }
    })

    // 2 prompts × 2 providers = 4 observaciones.
    expect(result.observations).toHaveLength(4)
    expect(state.inserted).toHaveLength(4)
    expect(result.run.status).toBe('partial')
    expect(state.lastStatus).toBe('partial')
    expect(result.idempotentHit).toBe(false)
  })

  it('todos los providers skip → run skipped', async () => {
    const result = await executeGraderRun({
      ...baseInput,
      adapters: {
        openai: createFakeProviderAdapter({ provider: 'openai', behavior: 'skip' }),
        anthropic: createFakeProviderAdapter({ provider: 'anthropic', behavior: 'skip' })
      }
    })

    expect(result.run.status).toBe('skipped')
    expect(result.observations.every(o => o.status === 'skipped')).toBe(true)
  })

  it('idempotencyKey existente → reutiliza el run, no reejecuta', async () => {
    state.existingByKey['key-1'] = { runId: 'grun-prev' }
    const openaiAdapter = createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' })
    const spy = vi.spyOn(openaiAdapter, 'runPrompt')

    const result = await executeGraderRun({
      ...baseInput,
      idempotencyKey: 'key-1',
      adapters: { openai: openaiAdapter }
    })

    expect(result.idempotentHit).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    expect(state.inserted).toHaveLength(0)
  })

  it('solo ejecuta providers presentes en adapters (intersección con la policy)', async () => {
    const result = await executeGraderRun({
      ...baseInput,
      adapters: { openai: createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' }) }
    })

    // 2 prompts × 1 provider = 2.
    expect(result.observations).toHaveLength(2)
    expect(result.observations.every(o => o.provider === 'openai')).toBe(true)
    expect(result.run.status).toBe('succeeded')
  })
})
