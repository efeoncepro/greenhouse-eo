import 'server-only'

/**
 * TASK-1288 Slice 3 — Run-time category guard + canonical label resolution.
 *
 * The grader engine must NEVER run on an unresolved category (ISSUE-110: it interpolated
 * the raw HubSpot enum, "agencias de AIRLINES_AVIATION", into prompts → false-0). This is
 * the UNIVERSAL backstop at the run chokepoint (`buildExecuteInput`), covering every path
 * (portal, operator, public lead magnet, future Nexa/MCP). Behind
 * `GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED` (default OFF) until the backfill is verified.
 *
 * It also resolves the canonical DISPLAY LABEL used in prompts (never the raw enum).
 */

import {
  CATEGORY_CONFIDENT_THRESHOLD,
  UNKNOWN_CATEGORY_NODE_ID,
  getCategoryTaxonomyNode,
  resolveCanonicalCategory
} from './taxonomy'
import { isCategoryGuardEnabled } from './flags'

export interface RunCategoryInput {
  /** Resolved node from the profile (portal/operator paths). */
  categoryNodeId?: string | null
  categoryLabel?: string | null
  categoryConfidence?: number | null
  /** Raw category text (public intake form / legacy callers without a resolved profile). */
  rawCategory?: string | null
}

export interface ResolvedRunCategory {
  /** A real taxonomy node id, or `unknown`. Never the raw enum. */
  nodeId: string
  /** Display label for prompt interpolation (canonical es label, or raw text fallback). */
  displayLabel: string
  confidence: number
  /** True when the category is a real node with sufficient confidence to run on. */
  resolved: boolean
}

/**
 * Derive the canonical category for a run. Prefers a profile's already-resolved node;
 * otherwise resolves raw text deterministically (HubSpot prior + taxonomy alias).
 */
export const resolveRunCategory = (input: RunCategoryInput): ResolvedRunCategory => {
  const providedNodeId = input.categoryNodeId?.trim() || null

  if (providedNodeId && providedNodeId !== UNKNOWN_CATEGORY_NODE_ID) {
    const node = getCategoryTaxonomyNode(providedNodeId)
    const confidence = input.categoryConfidence ?? CATEGORY_CONFIDENT_THRESHOLD
    const displayLabel = input.categoryLabel?.trim() || node?.label.es || input.rawCategory?.trim() || ''

    return {
      nodeId: node ? node.id : UNKNOWN_CATEGORY_NODE_ID,
      displayLabel,
      confidence,
      resolved: Boolean(node) && confidence >= CATEGORY_CONFIDENT_THRESHOLD
    }
  }

  // Explicit unknown node, or no node → resolve raw text (public/legacy path).
  if (providedNodeId === UNKNOWN_CATEGORY_NODE_ID && !input.rawCategory) {
    return { nodeId: UNKNOWN_CATEGORY_NODE_ID, displayLabel: '', confidence: 0, resolved: false }
  }

  const resolved = resolveCanonicalCategory({ industry: input.rawCategory })
  const displayLabel = resolved.label?.es || input.rawCategory?.trim() || ''

  return {
    nodeId: resolved.nodeId,
    displayLabel,
    confidence: resolved.confidence,
    resolved: resolved.nodeId !== UNKNOWN_CATEGORY_NODE_ID && resolved.confidence >= CATEGORY_CONFIDENT_THRESHOLD
  }
}

/** True when a run's category is unresolved (would produce garbage prompts). */
export const isRunCategoryBlocked = (
  input: RunCategoryInput,
  env: NodeJS.ProcessEnv = process.env
): boolean => isCategoryGuardEnabled(env) && !resolveRunCategory(input).resolved

export class GraderCategoryUnresolvedError extends Error {
  readonly code = 'aeo_category_unresolved' as const
  readonly nodeId: string

  constructor(nodeId: string) {
    super(`Grader run blocked: category unresolved (node=${nodeId}). Resolve/confirm the category first.`)
    this.name = 'GraderCategoryUnresolvedError'
    this.nodeId = nodeId
  }
}

/**
 * Universal backstop: throws when the guard is ON and the category is unresolved. Called
 * inside `buildExecuteInput` so every run path is covered. The portal/operator chokepoints
 * pre-check with `isRunCategoryBlocked` to return a clean blocked result before side effects.
 */
export const assertRunCategoryResolved = (
  resolved: ResolvedRunCategory,
  env: NodeJS.ProcessEnv = process.env
): void => {
  if (isCategoryGuardEnabled(env) && !resolved.resolved) {
    throw new GraderCategoryUnresolvedError(resolved.nodeId)
  }
}
