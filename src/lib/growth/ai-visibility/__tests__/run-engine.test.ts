import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type GrowthAiVisibilityProviderObservation } from '../contracts'
import { createFakeProviderAdapter } from '../providers/fake-adapter'
import { type GraderExecutionPrompt, type GraderRunRow } from '../store'

// ── In-memory store mock (stateful) ──────────────────────────────────────────
// TASK-1234: el store ahora persiste prompts + soporta claim/recovery; el mock
// modela el estado real para ejercitar enqueue → claim → ejecución incremental.

const PROFILE = {
  profileId: 'gprf-1',
  publicId: 'EO-GAVP-0001',
  brandName: 'Efeonce',
  websiteUrl: 'https://efeoncepro.com',
  market: 'Chile',
  locale: 'es-CL',
  category: 'marketing',
  competitorsDeclared: [] as string[],
  status: 'active'
}

let runSeq = 0

const db: {
  runsById: Map<string, GraderRunRow>
  runsByKey: Map<string, GraderRunRow>
  observations: GrowthAiVisibilityProviderObservation[]
  insertCalls: GrowthAiVisibilityProviderObservation[][]
} = { runsById: new Map(), runsByKey: new Map(), observations: [], insertCalls: [] }

const makeRun = (input: Record<string, unknown>): GraderRunRow => ({
  runId: `grun-${++runSeq}`,
  publicId: `EO-GRUN-${String(runSeq).padStart(5, '0')}`,
  pollToken: `gpt-test-${runSeq}`,
  profileId: String(input.profileId ?? 'gprf-1'),
  runKind: (input.runKind as GraderRunRow['runKind']) ?? 'smoke',
  mode: (input.mode as GraderRunRow['mode']) ?? 'full',
  status: 'pending',
  providerPolicyVersion: String(input.providerPolicyVersion ?? 'policy.v1'),
  promptPackVersion: String(input.promptPackVersion ?? 'prompt-pack.v1'),
  requestedProviders: (input.requestedProviders as GraderRunRow['requestedProviders']) ?? [],
  idempotencyKey: (input.idempotencyKey as string | null) ?? null,
  estimatedCostUsd: 0,
  costCeilingUsd: (input.costCeilingUsd as number | null) ?? null,
  executionPrompts: (input.executionPrompts as GraderExecutionPrompt[]) ?? [],
  startedAt: null,
  finishedAt: null,
  createdAt: '2026-06-24T00:00:00.000Z'
})

// El delivery finalizer (TASK-1245) tiene su propio test; acá se aísla como no-op para mantener
// el boundary unitario del run-engine (no toca PG/report/snapshot reales).
vi.mock('../public-delivery/finalize-delivery', () => ({
  finalizeRunDelivery: async () => null,
}))

vi.mock('../store', () => ({
  findRunByIdempotencyKey: async (key: string) => db.runsByKey.get(key) ?? null,
  findOrCreateGraderProfile: async () => PROFILE,
  getGraderProfile: async () => PROFILE,
  createGraderRun: async (input: Record<string, unknown>) => {
    const run = makeRun(input)

    db.runsById.set(run.runId, run)
    if (run.idempotencyKey) db.runsByKey.set(run.idempotencyKey, run)

    return run
  },
  updateGraderRunStatus: async (input: {
    runId: string
    status: GraderRunRow['status']
    estimatedCostUsd?: number
    startedAt?: string | null
    finishedAt?: string | null
  }) => {
    const prev = db.runsById.get(input.runId)

    if (!prev) throw new Error(`run ${input.runId} not found in mock`)

    const next: GraderRunRow = {
      ...prev,
      status: input.status,
      estimatedCostUsd: input.estimatedCostUsd ?? prev.estimatedCostUsd,
      startedAt: input.startedAt ?? prev.startedAt,
      finishedAt: input.finishedAt ?? prev.finishedAt
    }

    db.runsById.set(next.runId, next)

    return next
  },
  insertProviderObservations: async (observations: GrowthAiVisibilityProviderObservation[]) => {
    db.insertCalls.push(observations)
    db.observations.push(...observations)

    return observations.length
  },
  getRunObservations: async (runId: string) => db.observations.filter(o => o.runId === runId),
  claimPendingGraderRuns: async (limit: number) => {
    const claimed: GraderRunRow[] = []

    for (const run of db.runsById.values()) {
      if (run.status !== 'pending' || claimed.length >= limit) continue
      const next: GraderRunRow = { ...run, status: 'running', startedAt: '2026-06-24T00:00:01.000Z' }

      db.runsById.set(next.runId, next)
      claimed.push(next)
    }

    return claimed
  },
  findStuckRunningRuns: async () =>
    Array.from(db.runsById.values()).filter(run => run.status === 'running')
}))

const {
  executeGraderRun,
  enqueueGraderRun,
  drainPendingGraderRuns,
  recoverStuckRunningRuns
} = await import('../run-engine')

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
  db.runsById = new Map()
  db.runsByKey = new Map()
  db.observations = []
  db.insertCalls = []
  runSeq = 0
})

describe('growth/ai-visibility — executeGraderRun (primitive síncrono)', () => {
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
    expect(db.observations).toHaveLength(4)
    expect(result.run.status).toBe('partial')
    expect(result.idempotentHit).toBe(false)
  })

  it('persiste cada observación INCREMENTALMENTE (un insert por observación)', async () => {
    await executeGraderRun({
      ...baseInput,
      adapters: {
        openai: createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' }),
        anthropic: createFakeProviderAdapter({ provider: 'anthropic', behavior: 'succeed' })
      }
    })

    // 4 observaciones ⇒ 4 inserts separados de tamaño 1 (no un bloque al final).
    expect(db.insertCalls).toHaveLength(4)
    expect(db.insertCalls.every(call => call.length === 1)).toBe(true)
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
    const openaiAdapter = createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' })

    // Primer run crea el run con la key.
    await executeGraderRun({ ...baseInput, idempotencyKey: 'key-1', adapters: { openai: openaiAdapter } })
    const insertsAfterFirst = db.insertCalls.length

    const spy = vi.spyOn(openaiAdapter, 'runPrompt')
    const result = await executeGraderRun({ ...baseInput, idempotencyKey: 'key-1', adapters: { openai: openaiAdapter } })

    expect(result.idempotentHit).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    expect(db.insertCalls.length).toBe(insertsAfterFirst)
  })

  it('solo ejecuta providers presentes en adapters (intersección con la policy)', async () => {
    const result = await executeGraderRun({
      ...baseInput,
      adapters: { openai: createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' }) }
    })

    expect(result.observations).toHaveLength(2)
    expect(result.observations.every(o => o.provider === 'openai')).toBe(true)
    expect(result.run.status).toBe('succeeded')
  })
})

describe('growth/ai-visibility — enqueue + worker async (TASK-1234)', () => {
  it('enqueueGraderRun crea el run pending con prompts persistidos, sin ejecutar', async () => {
    const { run, idempotentHit } = await enqueueGraderRun(baseInput)

    expect(idempotentHit).toBe(false)
    expect(run.status).toBe('pending')
    expect(run.executionPrompts).toHaveLength(2)
    expect(db.observations).toHaveLength(0)
  })

  it('drainPendingGraderRuns reclama el run encolado y lo ejecuta (succeeded)', async () => {
    await enqueueGraderRun(baseInput)

    const result = await drainPendingGraderRuns({
      adapters: { openai: createFakeProviderAdapter({ provider: 'openai', behavior: 'succeed' }) }
    })

    expect(result.claimedCount).toBe(1)
    expect(result.results[0].status).toBe('succeeded')
    // 2 prompts × 1 provider (openai) = 2 observaciones incrementales.
    expect(db.observations).toHaveLength(2)
  })

  it('recoverStuckRunningRuns finaliza un run running con evidencia ya persistida (no la pierde)', async () => {
    const { run } = await enqueueGraderRun(baseInput)

    // Lo dejamos huérfano en running con una observación succeeded ya persistida.
    db.runsById.set(run.runId, { ...db.runsById.get(run.runId)!, status: 'running', startedAt: '2026-06-24T00:00:01.000Z' })
    db.observations.push({
      observationId: 'obs-1',
      runId: run.runId,
      promptId: 'p01',
      provider: 'openai',
      model: 'gpt',
      status: 'succeeded',
      answerTextHash: null,
      answerExcerpt: null,
      citations: [],
      usage: {},
      latencyMs: 10,
      providerRequestHash: 'h',
      rawEvidencePointer: null,
      errorCode: null,
      providerPolicyVersion: 'policy.v1',
      promptPackVersion: 'prompt-pack.v1',
      createdAt: '2026-06-24T00:00:02.000Z'
    })

    const result = await recoverStuckRunningRuns(0)

    expect(result.recoveredCount).toBe(1)
    expect(result.recovered[0].status).toBe('succeeded')
    expect(db.runsById.get(run.runId)?.finishedAt).not.toBeNull()
  })

  it('recoverStuckRunningRuns sin observaciones → failed (corrió pero no produjo evidencia)', async () => {
    const { run } = await enqueueGraderRun(baseInput)

    db.runsById.set(run.runId, { ...db.runsById.get(run.runId)!, status: 'running', startedAt: '2026-06-24T00:00:01.000Z' })

    const result = await recoverStuckRunningRuns(0)

    expect(result.recovered[0].status).toBe('failed')
  })
})
