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
import { GROWTH_AI_VISIBILITY_PROMPT_PACK_VERSION, resolvePromptInputs } from './prompt-pack'
import { executeGraderRun, type ExecuteGraderRunResult } from './run-engine'
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
  onlyProviders?: GrowthAiVisibilityProviderId[]
  idempotencyKey?: string | null
  /** Adapters inyectables (smoke/tests con fake). Default = registry real. */
  adapters?: Partial<Record<GrowthAiVisibilityProviderId, ProviderAdapter>>
}

export const runGraderDiagnostic = async (
  input: RunGraderDiagnosticInput
): Promise<ExecuteGraderRunResult> => {
  const competitorsDeclared = input.competitorsDeclared ?? []

  const prompts = resolvePromptInputs(
    {
      brandName: input.brandName,
      category: input.category,
      market: input.market,
      competitor: competitorsDeclared[0] ?? null
    },
    { includeBrandNamed: !input.discoveryOnly }
  )

  return executeGraderRun({
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
    promptPackVersion: GROWTH_AI_VISIBILITY_PROMPT_PACK_VERSION,
    prompts,
    idempotencyKey: input.idempotencyKey ?? null,
    onlyProviders: input.onlyProviders,
    adapters: input.adapters
  })
}
