import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Run engine (Slice 4, server-only).
 *
 * EL primitive canónico de Full API parity: orquesta un run end-to-end (resolve
 * policy → ejecutar prompt × provider → persistir observations → agregar status +
 * costo). TODOS los consumers (admin endpoint, smoke harness, Nexa/MCP futuro,
 * report builder) invocan `executeGraderRun` — nadie llama adapters ni SQL directo.
 *
 * Degradación honesta: el status del run se deriva de las observaciones
 * (resolveRunStatusFromObservations); cost guard corta si se excede el ceiling.
 */

import { captureWithDomain } from '@/lib/observability/capture'

import {
  type GrowthAiVisibilityExecutionMode,
  type GrowthAiVisibilityProviderId,
  type GrowthAiVisibilityProviderObservation,
  type GrowthAiVisibilityRunKind
} from './contracts'
import { estimateObservationCostUsd } from './cost'
import { resolveRunStatusFromObservations } from './lifecycle'
import { resolveProviderPolicy } from './policy'
import { createGrowthAiVisibilityProviderAdapters } from './providers/registry'
import { createProviderAdapterContext, type ProviderAdapter } from './providers/types'
import {
  createGraderRun,
  findOrCreateGraderProfile,
  findRunByIdempotencyKey,
  getRunObservations,
  insertProviderObservations,
  updateGraderRunStatus,
  type GraderRunRow
} from './store'

export interface GraderRunPromptInput {
  promptId: string
  promptText: string
}

export interface ExecuteGraderRunInput {
  profile: {
    brandName: string
    websiteUrl: string | null
    market: string
    locale: string
    category: string | null
    competitorsDeclared: string[]
  }
  runKind: GrowthAiVisibilityRunKind
  mode: GrowthAiVisibilityExecutionMode
  promptPackVersion: string
  prompts: GraderRunPromptInput[]
  idempotencyKey?: string | null
  /** Adapters inyectables (tests/smoke fake). Default = registry de adapters reales. */
  adapters?: Partial<Record<GrowthAiVisibilityProviderId, ProviderAdapter>>
  /** Restringe a un subconjunto de providers (intersección con la policy). */
  onlyProviders?: GrowthAiVisibilityProviderId[]
}

export interface ExecuteGraderRunResult {
  run: GraderRunRow
  observations: GrowthAiVisibilityProviderObservation[]
  /** true cuando se reutilizó un run previo por idempotencyKey (no se reejecutó). */
  idempotentHit: boolean
  /** true cuando el cost guard cortó la ejecución antes de agotar la matriz. */
  costGuardTripped: boolean
}

export const executeGraderRun = async (
  input: ExecuteGraderRunInput
): Promise<ExecuteGraderRunResult> => {
  const policy = resolveProviderPolicy(input.mode)

  // Idempotencia: un run previo con la misma key no se reejecuta.
  if (input.idempotencyKey) {
    const existing = await findRunByIdempotencyKey(input.idempotencyKey)

    if (existing) {
      return {
        run: existing,
        observations: await getRunObservations(existing.runId),
        idempotentHit: true,
        costGuardTripped: false
      }
    }
  }

  const adapters = input.adapters ?? createGrowthAiVisibilityProviderAdapters()

  const requestedProviders = policy.eligibleProviders.filter(provider => {
    if (input.onlyProviders && !input.onlyProviders.includes(provider)) {
      return false
    }

    return Boolean(adapters[provider])
  })

  const profile = await findOrCreateGraderProfile(input.profile)

  const run = await createGraderRun({
    profileId: profile.profileId,
    runKind: input.runKind,
    mode: input.mode,
    providerPolicyVersion: policy.policyVersion,
    promptPackVersion: input.promptPackVersion,
    requestedProviders,
    idempotencyKey: input.idempotencyKey ?? null,
    costCeilingUsd: policy.costCeilingUsdPerRun
  })

  await updateGraderRunStatus({ runId: run.runId, status: 'running', startedAt: new Date().toISOString() })

  const context = createProviderAdapterContext({
    providerPolicyVersion: policy.policyVersion,
    promptPackVersion: input.promptPackVersion,
    timeoutMs: policy.perCallTimeoutMs,
    maxRetries: policy.maxRetriesPerCall
  })

  const promptsToRun = input.prompts.slice(0, policy.maxPromptsPerRun)
  const observations: GrowthAiVisibilityProviderObservation[] = []
  let estimatedCostUsd = 0
  let costGuardTripped = false

  outer: for (const prompt of promptsToRun) {
    for (const provider of requestedProviders) {
      const adapter = adapters[provider]

      if (!adapter) {
        continue
      }

      const observation = await adapter.runPrompt(
        {
          runId: run.runId,
          promptId: prompt.promptId,
          promptText: prompt.promptText,
          locale: input.profile.locale,
          market: input.profile.market,
          brandName: input.profile.brandName,
          websiteUrl: input.profile.websiteUrl,
          competitorsDeclared: input.profile.competitorsDeclared,
          mode: input.mode
        },
        context
      )

      observations.push(observation)
      estimatedCostUsd = Number((estimatedCostUsd + estimateObservationCostUsd(observation)).toFixed(6))

      // Cost guard: corta si se excede el techo del modo (degradación honesta → partial).
      if (estimatedCostUsd > policy.costCeilingUsdPerRun) {
        costGuardTripped = true
        captureWithDomain(new Error('growth ai-visibility cost ceiling exceeded'), 'growth', {
          level: 'warning',
          tags: { source: 'growth_ai_visibility_run_engine', reason: 'cost_ceiling' },
          extra: { runId: run.runId, estimatedCostUsd, ceiling: policy.costCeilingUsdPerRun }
        })
        break outer
      }
    }
  }

  if (observations.length > 0) {
    await insertProviderObservations(observations)
  }

  const status = resolveRunStatusFromObservations(observations.map(observation => observation.status))

  const finalized = await updateGraderRunStatus({
    runId: run.runId,
    status,
    estimatedCostUsd,
    finishedAt: new Date().toISOString()
  })

  return { run: finalized, observations, idempotentHit: false, costGuardTripped }
}
