/**
 * TASK-1288 — Growth AI Visibility · Canonical category resolver (cascade with confidence).
 *
 * Single entry point that turns whatever a brand's `industry` field holds (HubSpot enum,
 * CIIU/SII Spanish free-text, a declared category, or nothing) into a CANONICAL taxonomy
 * node + localized label — or an honest `unknown`. It NEVER persists or interpolates the
 * raw HubSpot enum (ISSUE-110 root cause).
 *
 * Cascade (most authoritative first):
 *   1. grounded `brand_intelligence` candidate (TASK-1288 Slice 4) — authoritative: it
 *      read what the brand actually does. Wins when confident.
 *   2. HubSpot industry enum map — cheap, somewhat-unreliable PRIOR (hand-filled).
 *   3. generic taxonomy mapper over free-text candidates (declared category, CIIU name…).
 *   4. `unknown` — low confidence / no signal → the run guard blocks and a human confirms
 *      (TASK-1291). Never guess silently.
 *
 * Slice 1 ships steps 2–4 (deterministic, no LLM). Slice 4 passes `groundedCandidate` to
 * activate step 1 additively.
 */

import { getCategoryTaxonomyNode } from './catalog'
import { resolveHubSpotIndustryNode } from './hubspot-industry-map'
import { mapCategoryCandidateToTaxonomy } from './mapper'

export const UNKNOWN_CATEGORY_NODE_ID = 'unknown' as const

export type CanonicalCategorySource = 'brand_intelligence' | 'hubspot_map' | 'taxonomy_alias' | 'unknown'

/**
 * Minimum confidence for a grounded `brand_intelligence` candidate to be treated as
 * authoritative. Below this the grounded read is not trusted and the cascade falls
 * through to the prior / alias / unknown.
 */
export const GROUNDED_CANDIDATE_MIN_CONFIDENCE = 0.6

/**
 * Confidence at/above which a resolved category is considered reliable enough to run on
 * without human confirmation. The run guard (TASK-1288 Slice 3) blocks `unknown` and
 * anything below this threshold.
 */
export const CATEGORY_CONFIDENT_THRESHOLD = 0.5

export interface GroundedCategoryCandidate {
  nodeId: string | null
  confidence: number
}

export interface ResolveCanonicalCategoryInput {
  /** Raw `organizations.industry` (HubSpot enum, CIIU Spanish name, free text, or null). */
  industry?: string | null
  /** Additional declared free-text candidates (e.g. declared category). */
  freeTextCandidates?: readonly string[]
  /** Grounded `brand_intelligence` candidate (TASK-1288 Slice 4); omitted in Slice 1. */
  groundedCandidate?: GroundedCategoryCandidate | null
}

export interface ResolvedCanonicalCategory {
  /** A real taxonomy node id, or `UNKNOWN_CATEGORY_NODE_ID`. Never the raw enum. */
  nodeId: string
  /** Localized label of the node, or null when unknown. */
  label: { es: string; en: string } | null
  source: CanonicalCategorySource
  confidence: number
}

const UNKNOWN_RESULT: ResolvedCanonicalCategory = {
  nodeId: UNKNOWN_CATEGORY_NODE_ID,
  label: null,
  source: 'unknown',
  confidence: 0
}

const resolvedFromNode = (
  nodeId: string,
  source: CanonicalCategorySource,
  confidence: number
): ResolvedCanonicalCategory | null => {
  const node = getCategoryTaxonomyNode(nodeId)

  if (!node || node.status !== 'active') return null

  return { nodeId: node.id, label: node.label, source, confidence }
}

export const resolveCanonicalCategory = (
  input: ResolveCanonicalCategoryInput
): ResolvedCanonicalCategory => {
  // 1. Grounded brand_intelligence (authoritative) — Slice 4.
  const grounded = input.groundedCandidate

  if (grounded?.nodeId && grounded.confidence >= GROUNDED_CANDIDATE_MIN_CONFIDENCE) {
    const resolved = resolvedFromNode(grounded.nodeId, 'brand_intelligence', grounded.confidence)

    if (resolved) return resolved
  }

  // 2. HubSpot industry enum map (prior/baseline).
  const hubspotMatch = resolveHubSpotIndustryNode(input.industry)

  if (hubspotMatch) {
    const resolved = resolvedFromNode(hubspotMatch.nodeId, 'hubspot_map', hubspotMatch.confidence)

    if (resolved) return resolved
  }

  // 3. Generic taxonomy mapper over free-text candidates (industry-as-text first).
  const candidates = [
    ...(input.industry ? [input.industry] : []),
    ...(input.freeTextCandidates ?? [])
  ]

  for (const candidate of candidates) {
    const association = mapCategoryCandidateToTaxonomy({ candidate, evidenceSource: 'legacy_string' })

    if (association.mappingStatus === 'mapped' && association.nodeId) {
      const resolved = resolvedFromNode(association.nodeId, 'taxonomy_alias', association.confidence)

      if (resolved) return resolved
    }
  }

  // 4. Honest unknown.
  return UNKNOWN_RESULT
}
