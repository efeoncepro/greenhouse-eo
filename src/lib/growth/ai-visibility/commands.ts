import 'server-only'
import type { PoolClient } from 'pg'

/**
 * TASK-1226 — Growth AI Visibility Grader · High-level command (Slice 4, server-only).
 *
 * `runGraderDiagnostic` es el comando canónico que resuelve los prompts del pack
 * para un perfil y ejecuta el run. Lo consumen el endpoint admin, el smoke harness
 * y (futuro) Nexa/MCP — un primitive, muchos consumers (Full API parity).
 */

import { resolveGrowthMarket } from '@/lib/growth/markets'

import type { MarketSource } from './markets/contracts'
import { localizePromptPack } from './prompt-packs/localized'
import { localizedCategoryLabel } from './taxonomy/localized-label'
import { classifyBusinessModel } from './taxonomy'
import { assertRunCategoryResolved, resolveRunCategory } from './category-guard'
import {
  type GrowthAiVisibilityExecutionMode,
  type GrowthAiVisibilityProviderId,
  type GrowthAiVisibilityRunKind
} from './contracts'
import { resolvePromptInputs } from './prompt-pack'
import { resolvePromptPack } from './prompt-packs'
import { resolveArchetypeBaselinePack } from './prompt-packs/archetypes/baseline-packs'
import { isArchetypePromptsEnabled } from './flags'
import {
  enqueueGraderRun,
  executeGraderRun,
  type EnqueueGraderRunResult,
  type ExecuteGraderRunInput,
  type ExecuteGraderRunResult
} from './run-engine'
import type { GraderRunAttribution } from './store'
import type { ProviderAdapter } from './providers/types'

export interface RunGraderDiagnosticInput {
  marketSource?: MarketSource
  profileId?: string
  marketId?: string
  batchId?: string
  transaction?: PoolClient
  brandName: string
  websiteUrl?: string | null
  market: string
  locale: string
  /** Raw category text (public intake form / legacy). Resolved to a canonical node at run time. */
  category: string
  /** TASK-1288 — resolved canonical category from the profile (portal/operator paths). */
  categoryNodeId?: string | null
  categoryLabel?: string | null
  categoryConfidence?: number | null
  /**
   * TASK-1290 — modelo de negocio del perfil (eje de buyer-intent). Detrás del flag
   * `GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED` selecciona el baseline del arquetipo
   * (consumo/B2B/retail/…). Sin valor usa el prior canónico de categoría; sin flag
   * conserva el pack legacy (no-regresión).
   */
  businessModel?: string | null
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
export const buildExecuteInput = (input: RunGraderDiagnosticInput): ExecuteGraderRunInput => {
  const market = resolveGrowthMarket(input.market, input.locale)
  const competitorsDeclared = input.competitorsDeclared ?? []

  // TASK-1288 — resolve the CANONICAL category (never the raw HubSpot enum) and guard the
  // run universally: every path (portal/operator/public/Nexa) converges here. The display
  // label replaces the raw enum in the prompts; an unresolved category blocks the run
  // (behind the guard flag) instead of producing garbage prompts (ISSUE-110).
  const runCategory = resolveRunCategory({
    categoryNodeId: input.categoryNodeId,
    categoryLabel: input.categoryLabel,
    categoryConfidence: input.categoryConfidence,
    rawCategory: input.category
  })

  assertRunCategoryResolved(runCategory)

  // All entry points share this resolution, including public/legacy inputs without a model.
  // An explicit classification (including unknown) wins; an absent value uses the existing
  // category classifier. Ambiguous categories keep the neutral pack, never an agency default.
  const businessModel = input.businessModel?.trim()
    || classifyBusinessModel({ categoryNodeId: runCategory.resolved ? runCategory.nodeId : null }).businessModel

  const sourcePack = isArchetypePromptsEnabled()
    ? resolveArchetypeBaselinePack(businessModel)
    : resolvePromptPack(input.promptPackVersion)

  const pack = localizePromptPack(sourcePack, market)

  const category =
    localizedCategoryLabel(runCategory.nodeId, market.language) ?? runCategory.displayLabel ?? input.category

  const prompts = resolvePromptInputs(
    {
      brandName: input.brandName,
      category,
      market: market.label,
      competitor: competitorsDeclared[0] ?? null
    },
    { pack, includeBrandNamed: !input.discoveryOnly }
  )

  return {
    marketSource: input.marketSource,
    profileId: input.profileId,
    marketId: input.marketId,
    batchId: input.batchId,
    transaction: input.transaction,
    profile: {
      brandName: input.brandName,
      websiteUrl: input.websiteUrl ?? null,
      market: market.code,
      locale: market.locale,
      category,
      competitorsDeclared
    },
    runKind: input.runKind,
    mode: input.mode,
    promptPackVersion: pack.version,
    prompts,
    // Resolve again under the profile lock so configuration changes cannot race the snapshot.
    resolvePrompts: snapshot =>
      buildExecuteInput({
        ...input,
        brandName: snapshot.brand.name,
        websiteUrl: snapshot.brand.websiteUrl,
        market: snapshot.market.code,
        locale: snapshot.market.locale,
        competitorsDeclared: snapshot.competitors.map(member => member.name)
      }).prompts,
    idempotencyKey: input.idempotencyKey ?? null,
    onlyProviders: input.onlyProviders,
    adapters: input.adapters,
    attribution: input.attribution
  }
}

/** Ejecuta el run SÍNCRONO (inline endpoint / smoke). Sólo `light` cabe en el timeout Vercel. */
export const runGraderDiagnostic = async (input: RunGraderDiagnosticInput): Promise<ExecuteGraderRunResult> =>
  executeGraderRun(buildExecuteInput(input))

/**
 * TASK-1234 — Encola el run `pending` (no ejecuta): el worker Cloud Run lo drena
 * async. Es el camino para runs `full`/`internal_audit` multi-provider que exceden
 * el timeout de la función Vercel. Mismo primitive, sin ejecución inline.
 */
export const enqueueGraderDiagnostic = async (input: RunGraderDiagnosticInput): Promise<EnqueueGraderRunResult> =>
  enqueueGraderRun(buildExecuteInput(input))
