import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type GrowthAiVisibilityProviderObservation } from '../contracts'
import { type GraderExecutionPrompt, type GraderRunRow } from '../store'
import { type ProviderAdapter, type ProviderAdapterContext } from '../providers/types'

/**
 * TASK-1696 — La organización del gasto se deriva SÓLO del perfil, server-side.
 *
 * El gasto atribuido a la organización EQUIVOCADA es peor que el gasto sin atribuir: el segundo
 * se ve en la señal de drift, el primero se le cobra al presupuesto de un cliente que no lo gastó
 * y nadie lo nota hasta que ese cliente se queda sin cupo. Por eso el valor sale de
 * `grader_profiles.organization_id` y NUNCA de las columnas de atribución del run (que las
 * escribe el chokepoint y pueden faltar o venir de otra puerta).
 *
 * El caso decisivo del test es el tercero: un run cuyo `organization_id` DIFIERE del perfil. Si
 * alguien "simplificara" la derivación leyendo `run.organizationId`, ese test se pone rojo.
 */

const PROFILE_WITH_ORG = {
  profileId: 'gprf-cliente',
  publicId: 'EO-GAVP-0001',
  brandName: 'Berel',
  websiteUrl: 'https://berel.com.mx',
  market: 'MX',
  locale: 'es-MX',
  category: 'pinturas',
  competitorsDeclared: [] as string[],
  status: 'active',
  organizationId: 'org-cliente-real'
}

const PROFILE_PUBLIC = { ...PROFILE_WITH_ORG, profileId: 'gprf-publico', organizationId: null }

let activeProfile: typeof PROFILE_WITH_ORG | typeof PROFILE_PUBLIC = PROFILE_WITH_ORG
let runOverrides: Record<string, unknown> = {}
let runSeq = 0

const db: { runsById: Map<string, GraderRunRow>; observations: GrowthAiVisibilityProviderObservation[] } = {
  runsById: new Map(),
  observations: []
}

const makeRun = (input: Record<string, unknown>): GraderRunRow => ({
  runId: `grun-${++runSeq}`,
  publicId: `EO-GRUN-${String(runSeq).padStart(5, '0')}`,
  pollToken: `gpt-test-${runSeq}`,
  profileId: activeProfile.profileId,
  runKind: 'public_diagnostic',
  mode: 'light',
  status: 'pending',
  providerPolicyVersion: 'policy.v1',
  promptPackVersion: 'prompt-pack.v1',
  requestedProviders: ['google_ai_overview'],
  idempotencyKey: null,
  estimatedCostUsd: 0,
  costCeilingUsd: null,
  executionPrompts: (input.executionPrompts as GraderExecutionPrompt[]) ?? [],
  organizationId: null,
  assignmentId: null,
  runSource: null,
  costAttribution: null,
  promptSetId: null,
  promptSetVersion: null,
  startedAt: null,
  finishedAt: null,
  createdAt: '2026-08-27T00:00:00.000Z',
  ...runOverrides
})

vi.mock('../public-delivery/finalize-delivery', () => ({ finalizeRunDelivery: async () => null }))
vi.mock('../probes/command', () => ({
  gatherRunProbes: async () => ({ results: [], skippedReason: 'probes_disabled' })
}))
vi.mock('../scoring/command', () => ({ scoreGraderRun: async () => ({ score: {}, findings: [] }) }))

vi.mock('../store', () => ({
  findRunByIdempotencyKey: async () => null,
  findOrCreateGraderProfile: async () => activeProfile,
  getGraderProfile: async () => activeProfile,
  createGraderRun: async (input: Record<string, unknown>) => {
    const run = makeRun(input)

    db.runsById.set(run.runId, run)

    return run
  },
  updateGraderRunStatus: async (input: { runId: string; status: GraderRunRow['status'] }) => {
    const prev = db.runsById.get(input.runId)

    if (!prev) throw new Error(`run ${input.runId} not found`)

    const next = { ...prev, status: input.status }

    db.runsById.set(next.runId, next)

    return next
  },
  insertProviderObservations: async (observations: GrowthAiVisibilityProviderObservation[]) => {
    db.observations.push(...observations)

    return observations.length
  },
  getRunObservations: async (runId: string) => db.observations.filter(o => o.runId === runId),
  claimPendingGraderRuns: async () => [],
  findStuckRunningRuns: async () => []
}))

const { executeGraderRun } = await import('../run-engine')

/** Adapter espía: sólo guarda el contexto con el que lo llaman. */
const capturedContexts: ProviderAdapterContext[] = []

const spyAdapter: ProviderAdapter = {
  provider: 'google_ai_overview',
  capabilities: {
    provider: 'google_ai_overview',
    supportsWebSearch: true,
    defaultModel: 'dataforseo/google-ai-mode-live-advanced'
  },
  isEnabled: async () => true,
  runPrompt: async (input, context) => {
    capturedContexts.push(context)

    return {
      observationId: `obs-${capturedContexts.length}`,
      runId: input.runId,
      promptId: input.promptId,
      provider: 'google_ai_overview',
      model: 'dataforseo/google-ai-mode-live-advanced',
      status: 'succeeded',
      answerTextHash: 'hash',
      answerExcerpt: 'excerpt',
      citations: [],
      usage: {},
      latencyMs: 10,
      providerRequestHash: 'req',
      rawEvidencePointer: null,
      errorCode: null,
      providerPolicyVersion: context.providerPolicyVersion,
      promptPackVersion: context.promptPackVersion,
      createdAt: '2026-08-27T00:00:00.000Z'
    } as GrowthAiVisibilityProviderObservation
  }
}

const baseInput = {
  profile: {
    brandName: 'Berel',
    websiteUrl: 'https://berel.com.mx',
    market: 'MX',
    locale: 'es-MX',
    category: 'pinturas',
    competitorsDeclared: []
  },
  runKind: 'public_diagnostic' as const,
  mode: 'light' as const,
  promptPackVersion: 'prompt-pack.v1',
  prompts: [{ promptId: 'p01', promptText: '¿Mejores pinturas en México?' }],
  adapters: { google_ai_overview: spyAdapter }
}

beforeEach(() => {
  db.runsById = new Map()
  db.observations = []
  capturedContexts.length = 0
  runOverrides = {}
  activeProfile = PROFILE_WITH_ORG
  runSeq = 0
})

describe('run-engine — propagación de la organización al contexto del adapter (TASK-1696)', () => {
  it('un perfil ligado a un cliente lleva su organización al contexto', async () => {
    await executeGraderRun(baseInput)

    expect(capturedContexts).toHaveLength(1)
    expect(capturedContexts[0]?.organizationId).toBe('org-cliente-real')
  })

  it('un perfil público llega con null, no con una organización inventada', async () => {
    activeProfile = PROFILE_PUBLIC

    await executeGraderRun(baseInput)

    // `null` es un estado legítimo: prospecto sin cliente. Fabricar una organización sintética
    // para "no perder el dato" le cobraría a alguien un gasto que no es suyo.
    expect(capturedContexts[0]?.organizationId).toBeNull()
  })

  it('NO toma la organización del run aunque el run declare una distinta', async () => {
    // El run puede traer columnas de atribución escritas por otra puerta (operador, portal) y no
    // tienen por qué coincidir con el perfil. La autoridad es el perfil, server-side.
    runOverrides = { organizationId: 'org-de-otro-cliente' }

    await executeGraderRun(baseInput)

    expect(capturedContexts[0]?.organizationId).toBe('org-cliente-real')
    expect(capturedContexts[0]?.organizationId).not.toBe('org-de-otro-cliente')
  })
})
