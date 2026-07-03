import 'server-only'

/**
 * TASK-1321 — Category resolution for a PUBLIC brand with NO grader profile yet.
 *
 * The portal path resolves category deterministically from `org.industry`; a public submit
 * from `/aeo-2/` has no industry and no category field, so the ONLY signal is the brand's own
 * site. This helper does the profile-less grounded read: fetch the site → run
 * `brand_intelligence` (constrained to the governed taxonomy) → resolve the canonical node via
 * the cascade. Returns `null` (SKIP — no run, degrade to the commercial lead) when the read is
 * disabled, has no signals, or the category cannot be resolved with enough confidence.
 *
 * NEVER guesses a category from the domain string (ISSUE-110/EPIC-021 lesson: a wrong category
 * produces a false report). No confident grounded read ⇒ no run.
 *
 * Profile-less by design: uses the router `runBrandIntelligence` directly (which does NOT
 * persist a snapshot — there is no profile until the run is enqueued). The catalog validation
 * of the candidate node is delegated to `resolveCanonicalCategory` (its cascade only accepts a
 * real active node), so a hallucinated node id falls through to `unknown` → skip.
 */

import { runBrandIntelligence } from './router'
import { fetchSiteContent } from './fetch-site-content'
import { getResolvableCategoryNodeChoices } from './read-brand-intelligence'
import {
  CATEGORY_CONFIDENT_THRESHOLD,
  UNKNOWN_CATEGORY_NODE_ID,
  resolveCanonicalCategory,
} from '../taxonomy'

/** Max output tokens for the grounded read (mirrors `read-brand-intelligence.ts`). */
const MAX_OUTPUT_TOKENS = 700

export interface PublicBrandCategory {
  /** A real, active taxonomy node id (never `unknown`). */
  readonly nodeId: string
  /** Canonical localized label (never the raw enum). */
  readonly label: { es: string; en: string }
  readonly confidence: number
  /** Grounded business model (feeds the archetype prompt pack when its flag is on). */
  readonly businessModel: string | null
}

export interface ResolvePublicBrandCategoryInput {
  readonly brandName: string
  readonly websiteUrl: string
  /** Optional weak prior (usually null for the public path). */
  readonly hubspotIndustry?: string | null
  /** Test seam: inject site content / fetch impl / a stub runner. */
  readonly deps?: {
    fetchImpl?: typeof fetch
    siteContent?: string | null
    runBrandIntelligence?: typeof runBrandIntelligence
  }
  readonly telemetry?: Record<string, string | null>
}

/**
 * Resolve the canonical category for a public brand. Returns `null` to SKIP the run
 * (disabled / no site signals / provider error / low-confidence → unresolved).
 */
export const resolvePublicBrandCategory = async (
  input: ResolvePublicBrandCategoryInput,
): Promise<PublicBrandCategory | null> => {
  const siteContent =
    input.deps?.siteContent !== undefined
      ? input.deps.siteContent
      : (await fetchSiteContent(input.websiteUrl, { fetchImpl: input.deps?.fetchImpl })).content

  const runner = input.deps?.runBrandIntelligence ?? runBrandIntelligence

  const result = await runner(
    {
      brandName: input.brandName,
      websiteUrl: input.websiteUrl,
      hubspotIndustry: input.hubspotIndustry ?? null,
      siteContent,
      entitySignals: null,
      allowedNodes: getResolvableCategoryNodeChoices(),
      maxTokens: MAX_OUTPUT_TOKENS,
    },
    { telemetry: input.telemetry },
  )

  // Disabled / no_signals / not_configured / provider_error / schema_invalid → honest skip.
  if (!result.fields) return null

  const resolved = resolveCanonicalCategory({
    groundedCandidate: {
      nodeId: result.fields.candidateCategoryNode,
      confidence: result.fields.confidence,
    },
  })

  if (
    resolved.nodeId === UNKNOWN_CATEGORY_NODE_ID ||
    !resolved.label ||
    resolved.confidence < CATEGORY_CONFIDENT_THRESHOLD
  ) {
    return null
  }

  return {
    nodeId: resolved.nodeId,
    label: resolved.label,
    confidence: resolved.confidence,
    businessModel: result.fields.candidateBusinessModel ?? null,
  }
}
