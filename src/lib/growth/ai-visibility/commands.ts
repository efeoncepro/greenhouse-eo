import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · High-level command (Slice 4, server-only).
 *
 * `runGraderDiagnostic` es el comando canónico que resuelve los prompts del pack
 * para un perfil y ejecuta el run. Lo consumen el endpoint admin, el smoke harness
 * y (futuro) Nexa/MCP — un primitive, muchos consumers (Full API parity).
 */

import {
  type GrowthAiVisibilityExecutionMode,
  type GrowthAiVisibilityProviderId,
  type GrowthAiVisibilityRunKind
} from './contracts'
import { resolvePromptInputs } from './prompt-pack'
import { resolvePromptPack } from './prompt-packs'
import {
  enqueueGraderRun,
  executeGraderRun,
  type EnqueueGraderRunResult,
  type ExecuteGraderRunResult
} from './run-engine'
import { type GraderRunAttribution } from './store'
import { type ProviderAdapter } from './providers/types'

export interface RunGraderDiagnosticInput {
  brandName: string
  websiteUrl?: string | null
  market: string
  locale: string
  category: string
  competitorsDeclared?: string[]
  mode: GrowthAiVisibilityExecutionMode
  runKind: GrowthAiVisibilityRunKind
  /** Excluye los prompts que nombran la marca (descubrimiento puro / AEO). Default false. */
  discoveryOnly?: boolean
  /** Versión del prompt pack a usar. Default V1 (snapshots reproducibles); V2 opt-in. */
  promptPackVersion?: string
  onlyProviders?: GrowthAiVisibilityProviderId[]
  idempotencyKey?: string | null
  /** Adapters inyectables (smoke/tests con fake). Default = registry real. */
  adapters?: Partial<Record<GrowthAiVisibilityProviderId, ProviderAdapter>>
  /** TASK-1277 — atribución per-org del run (chokepoint de portal/operador). */
  attribution?: GraderRunAttribution
}

/** Resuelve el input ejecutable del run (prompts del pack + perfil) — compartido por run/enqueue. */
const buildExecuteInput = (input: RunGraderDiagnosticInput) => {
  const competitorsDeclared = input.competitorsDeclared ?? []
  const pack = resolvePromptPack(input.promptPackVersion)

  const prompts = resolvePromptInputs(
    {
      brandName: input.brandName,
      category: input.category,
      market: input.market,
      competitor: competitorsDeclared[0] ?? null
    },
    { pack, includeBrandNamed: !input.discoveryOnly }
  )

  return {
    profile: {
      brandName: input.brandName,
      websiteUrl: input.websiteUrl ?? null,
      market: input.market,
      locale: input.locale,
      category: input.category,
      competitorsDeclared
    },
    runKind: input.runKind,
    mode: input.mode,
    promptPackVersion: pack.version,
    prompts,
    idempotencyKey: input.idempotencyKey ?? null,
    onlyProviders: input.onlyProviders,
    adapters: input.adapters,
    attribution: input.attribution
  }
}

/** Ejecuta el run SÍNCRONO (inline endpoint / smoke). Sólo `light` cabe en el timeout Vercel. */
export const runGraderDiagnostic = async (
  input: RunGraderDiagnosticInput
): Promise<ExecuteGraderRunResult> => executeGraderRun(buildExecuteInput(input))

/**
 * TASK-1234 — Encola el run `pending` (no ejecuta): el worker Cloud Run lo drena
 * async. Es el camino para runs `full`/`internal_audit` multi-provider que exceden
 * el timeout de la función Vercel. Mismo primitive, sin ejecución inline.
 */
export const enqueueGraderDiagnostic = async (
  input: RunGraderDiagnosticInput
): Promise<EnqueueGraderRunResult> => enqueueGraderRun(buildExecuteInput(input))
