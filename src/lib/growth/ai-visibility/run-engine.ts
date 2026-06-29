import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Run engine (server-only).
 * TASK-1234 — Async execution: enqueue + claim + ejecución resumible por worker.
 *
 * EL primitive canónico de Full API parity: orquesta un run end-to-end (resolve
 * policy → ejecutar prompt × provider → persistir observations → agregar status +
 * costo). TODOS los consumers (admin endpoint, smoke harness, worker async,
 * Nexa/MCP futuro, report builder) invocan estos exports — nadie llama adapters
 * ni SQL directo.
 *
 * Descomposición (TASK-1234):
 *  - `enqueueGraderRun`   → crea el run `pending` con sus prompts persistidos (no ejecuta).
 *  - `executeClaimedGraderRun` → ejecuta un run YA en `running` (claimed) con
 *      persistencia INCREMENTAL por observación → un crash/timeout mid-run no pierde
 *      evidencia ni deja el run en estado falso.
 *  - `executeGraderRun`   → camino síncrono (inline/tests): enqueue + claim-self + execute.
 *  - `drainPendingGraderRuns` → el worker reclama N runs `pending` (atómico) y los ejecuta.
 *  - `recoverStuckRunningRuns` → finaliza runs huérfanos `running` recomputando estado.
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
import {
  GROWTH_AI_VISIBILITY_STUCK_RUNNING_THRESHOLD_MINUTES,
  resolveRunStatusFromObservations
} from './lifecycle'
import { resolveProviderPolicy } from './policy'
import { createGrowthAiVisibilityProviderAdapters } from './providers/registry'
import { createProviderAdapterContext, type ProviderAdapter } from './providers/types'
import {
  claimPendingGraderRuns,
  createGraderRun,
  findOrCreateGraderProfile,
  findRunByIdempotencyKey,
  findStuckRunningRuns,
  getGraderProfile,
  getRunObservations,
  insertProviderObservations,
  updateGraderRunStatus,
  type GraderRunAttribution,
  type GraderRunRow
} from './store'
import { finalizeRunDelivery } from './public-delivery/finalize-delivery'
import { gatherRunProbes } from './probes/command'
import {
  type PromptFamily,
  type PromptFanOutType,
  type PromptIntentStage
} from './prompt-packs/tag-vocabulary'
import { resolvePromptInputs } from './prompt-pack'
import { getActivePromptSet } from './prompt-packs/prompt-set-store'
import { isArchetypePromptsEnabled } from './flags'

export interface GraderRunPromptInput {
  promptId: string
  promptText: string
  /**
   * TASK-1290 Slice 0 — tags del set RESUELTO que VIAJAN con el run (persistidos en
   * `execution_prompts`). El scorer/normalizer los leen de acá, NO del pack estático;
   * sin esto un set con ids nuevos colapsa el score en silencio. Opcionales: un run
   * legacy sin tags cae al lookup del pack estático (no-regresión).
   */
  family?: PromptFamily
  fanOutType?: PromptFanOutType
  intentStage?: PromptIntentStage
  namesBrand?: boolean
}

type ProviderAdapterMap = Partial<Record<GrowthAiVisibilityProviderId, ProviderAdapter>>

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
  adapters?: ProviderAdapterMap
  /** Restringe a un subconjunto de providers (intersección con la policy). */
  onlyProviders?: GrowthAiVisibilityProviderId[]
  /** TASK-1277 — atribución per-org del run (chokepoint de portal/operador). */
  attribution?: GraderRunAttribution
}

export interface ExecuteGraderRunResult {
  run: GraderRunRow
  observations: GrowthAiVisibilityProviderObservation[]
  /** true cuando se reutilizó un run previo por idempotencyKey (no se reejecutó). */
  idempotentHit: boolean
  /** true cuando el cost guard cortó la ejecución antes de agotar la matriz. */
  costGuardTripped: boolean
}

export interface EnqueueGraderRunResult {
  run: GraderRunRow
  /** true cuando un run previo con la misma idempotencyKey ya existía (no se creó otro). */
  idempotentHit: boolean
}

/**
 * Crea un run `pending` con sus prompts + providers resueltos persistidos (sin
 * ejecutarlo). El worker async lo reclama después y lo ejecuta de forma resumible.
 * Idempotente: una key existente devuelve el run previo sin crear otro.
 */
export const enqueueGraderRun = async (
  input: ExecuteGraderRunInput
): Promise<EnqueueGraderRunResult> => {
  if (input.idempotencyKey) {
    const existing = await findRunByIdempotencyKey(input.idempotencyKey)

    if (existing) {
      return { run: existing, idempotentHit: true }
    }
  }

  const policy = resolveProviderPolicy(input.mode)
  const adapters = input.adapters ?? createGrowthAiVisibilityProviderAdapters()

  const requestedProviders = policy.eligibleProviders.filter(provider => {
    if (input.onlyProviders && !input.onlyProviders.includes(provider)) {
      return false
    }

    return Boolean(adapters[provider])
  })

  const profile = await findOrCreateGraderProfile(input.profile)

  // TASK-1290 Slice 2 — si hay un prompt set AUTORADO + `active` para el perfil (y el flag por
  // arquetipo está ON), el run usa ESE set congelado (reproducible) en vez del baseline; los tags
  // del set viajan con el run (Slice 0). Sin set active → se queda con el baseline (input.prompts).
  let prompts = input.prompts
  let promptSetId: string | null = null
  let promptSetVersion: number | null = null

  if (isArchetypePromptsEnabled()) {
    const activeSet = await getActivePromptSet(profile.profileId)

    if (activeSet && activeSet.prompts.length > 0) {
      prompts = resolvePromptInputs(
        {
          brandName: profile.brandName,
          category: input.profile.category ?? '',
          market: profile.market,
          competitor: profile.competitorsDeclared[0] ?? null
        },
        {
          pack: {
            version: `prompt-set.v${activeSet.version}`,
            locale: profile.locale,
            market: profile.market,
            prompts: activeSet.prompts
          }
        }
      )
      promptSetId = activeSet.setId
      promptSetVersion = activeSet.version
    }
  }

  const executionPrompts = prompts.slice(0, policy.maxPromptsPerRun).map(prompt => ({
    promptId: prompt.promptId,
    promptText: prompt.promptText,
    // TASK-1290 Slice 0 — los tags viajan con el run (self-describing); el scorer los lee de acá.
    family: prompt.family,
    fanOutType: prompt.fanOutType,
    intentStage: prompt.intentStage,
    namesBrand: prompt.namesBrand
  }))

  const run = await createGraderRun({
    profileId: profile.profileId,
    runKind: input.runKind,
    mode: input.mode,
    providerPolicyVersion: policy.policyVersion,
    promptPackVersion: input.promptPackVersion,
    requestedProviders,
    idempotencyKey: input.idempotencyKey ?? null,
    costCeilingUsd: policy.costCeilingUsdPerRun,
    executionPrompts,
    attribution: input.attribution,
    promptSetId,
    promptSetVersion
  })

  return { run, idempotentHit: false }
}

/**
 * Ejecuta un run YA reclamado (status `running`) leyendo su estado persistido:
 * perfil + prompts + providers. Persiste cada observación apenas se produce
 * (INCREMENTAL) → un fallo mid-run conserva la evidencia ya generada. Finaliza el
 * run agregando el estado desde las observaciones (degradación honesta).
 */
export const executeClaimedGraderRun = async (
  run: GraderRunRow,
  options: { adapters?: ProviderAdapterMap } = {}
): Promise<ExecuteGraderRunResult> => {
  const policy = resolveProviderPolicy(run.mode)
  const profile = await getGraderProfile(run.profileId)

  if (!profile) {
    captureWithDomain(new Error('grader run claimed without resolvable profile'), 'growth', {
      level: 'error',
      tags: { source: 'growth_ai_visibility_run_engine', reason: 'profile_missing' },
      extra: { runId: run.runId, profileId: run.profileId }
    })

    const finalized = await updateGraderRunStatus({
      runId: run.runId,
      status: 'failed',
      finishedAt: new Date().toISOString()
    })

    // TASK-1245 — materializa el delivery state público (failed → unavailable). Best-effort.
    await finalizeRunDelivery(finalized)

    return { run: finalized, observations: [], idempotentHit: false, costGuardTripped: false }
  }

  const adapters = options.adapters ?? createGrowthAiVisibilityProviderAdapters()
  const requestedProviders = run.requestedProviders.filter(provider => Boolean(adapters[provider]))

  const context = createProviderAdapterContext({
    providerPolicyVersion: policy.policyVersion,
    promptPackVersion: run.promptPackVersion,
    timeoutMs: policy.perCallTimeoutMs,
    maxRetries: policy.maxRetriesPerCall
  })

  const observations: GrowthAiVisibilityProviderObservation[] = []
  let estimatedCostUsd = 0
  let costGuardTripped = false

  outer: for (const prompt of run.executionPrompts) {
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
          locale: profile.locale,
          market: profile.market,
          brandName: profile.brandName,
          websiteUrl: profile.websiteUrl,
          competitorsDeclared: profile.competitorsDeclared,
          mode: run.mode
        },
        context
      )

      // Persistencia INCREMENTAL: un crash/timeout después de acá conserva esta evidencia.
      await insertProviderObservations([observation])
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

  const status = resolveRunStatusFromObservations(observations.map(observation => observation.status))

  const finalized = await updateGraderRunStatus({
    runId: run.runId,
    status,
    estimatedCostUsd,
    finishedAt: new Date().toISOString()
  })

  // TASK-1245 — auto-publish del snapshot + materialización del delivery state público (write-side,
  // NO on-read). succeeded/partial publicable → ready; review_required → in_review; resto → unavailable.
  await finalizeRunDelivery(finalized)

  // TASK-1266 — Probes técnicos read-only del sitio analizado (eje structural/agentic, gated por flag,
  // default OFF). Best-effort: la readiness NUNCA degrada el run de percepción (gatherRunProbes no lanza).
  await gatherRunProbes(finalized.runId)

  return { run: finalized, observations, idempotentHit: false, costGuardTripped }
}

/**
 * Camino SÍNCRONO (inline endpoint / smoke / tests): encola + reclama el propio
 * run (pending → running) + ejecuta. Persiste incrementalmente igual que el worker.
 */
export const executeGraderRun = async (
  input: ExecuteGraderRunInput
): Promise<ExecuteGraderRunResult> => {
  const { run, idempotentHit } = await enqueueGraderRun(input)

  if (idempotentHit) {
    return {
      run,
      observations: await getRunObservations(run.runId),
      idempotentHit: true,
      costGuardTripped: false
    }
  }

  const running = await updateGraderRunStatus({
    runId: run.runId,
    status: 'running',
    startedAt: new Date().toISOString()
  })

  return executeClaimedGraderRun(running, { adapters: input.adapters })
}

export interface DrainPendingGraderRunsResult {
  claimedCount: number
  results: { runId: string; status: GraderRunRow['status'] }[]
}

/**
 * TASK-1234 — Worker async: reclama hasta `batchSize` runs `pending` (claim atómico
 * `FOR UPDATE SKIP LOCKED`, sin doble ejecución) y los ejecuta. Un fallo en un run
 * no aborta el batch; se finaliza ese run como `failed` (la evidencia incremental
 * ya persistida se conserva).
 */
export const drainPendingGraderRuns = async (
  options: { batchSize?: number; adapters?: ProviderAdapterMap } = {}
): Promise<DrainPendingGraderRunsResult> => {
  const claimed = await claimPendingGraderRuns(options.batchSize ?? 3)
  const results: DrainPendingGraderRunsResult['results'] = []

  for (const run of claimed) {
    try {
      const result = await executeClaimedGraderRun(run, { adapters: options.adapters })

      results.push({ runId: run.runId, status: result.run.status })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        level: 'error',
        tags: { source: 'growth_ai_visibility_run_engine', reason: 'drain_execution_failed' },
        extra: { runId: run.runId }
      })

      const finalized = await updateGraderRunStatus({
        runId: run.runId,
        status: 'failed',
        finishedAt: new Date().toISOString()
      }).catch(() => null)

      // TASK-1245 — delivery state del run fallido (best-effort; null si el UPDATE de status falló).
      if (finalized) await finalizeRunDelivery(finalized)

      results.push({ runId: run.runId, status: finalized?.status ?? 'failed' })
    }
  }

  return { claimedCount: claimed.length, results }
}

export interface RecoverStuckRunningRunsResult {
  recoveredCount: number
  recovered: { runId: string; status: GraderRunRow['status'] }[]
}

/**
 * TASK-1234 — Recovery idempotente de runs huérfanos en `running` (crash/timeout
 * mid-run). Finaliza cada uno recomputando el estado desde sus observaciones ya
 * persistidas; sin observaciones → `failed` (corrió pero no produjo evidencia).
 * Idempotente: un run ya terminal no se vuelve a tocar (no aparece en la query).
 */
export const recoverStuckRunningRuns = async (
  thresholdMinutes: number = GROWTH_AI_VISIBILITY_STUCK_RUNNING_THRESHOLD_MINUTES
): Promise<RecoverStuckRunningRunsResult> => {
  const stuck = await findStuckRunningRuns(thresholdMinutes)
  const recovered: RecoverStuckRunningRunsResult['recovered'] = []

  for (const run of stuck) {
    const observations = await getRunObservations(run.runId)

    const status =
      observations.length === 0
        ? 'failed'
        : resolveRunStatusFromObservations(observations.map(observation => observation.status))

    const finalized = await updateGraderRunStatus({
      runId: run.runId,
      status,
      finishedAt: new Date().toISOString()
    })

    captureWithDomain(new Error('grader run recovered from stuck running'), 'growth', {
      level: 'warning',
      tags: { source: 'growth_ai_visibility_run_engine', reason: 'stuck_running_recovery' },
      extra: { runId: run.runId, status, observations: observations.length, thresholdMinutes }
    })

    // TASK-1245 — materializa el delivery state del run recuperado (best-effort).
    await finalizeRunDelivery(finalized)

    recovered.push({ runId: run.runId, status: finalized.status })
  }

  return { recoveredCount: recovered.length, recovered }
}
