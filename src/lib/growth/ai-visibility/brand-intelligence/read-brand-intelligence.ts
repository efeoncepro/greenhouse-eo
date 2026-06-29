import 'server-only'

/**
 * TASK-1288 Slice 4 — Growth AI Visibility · Brand Intelligence · read orchestrator.
 *
 * The grounded shared read: fetch the brand site's readable content (+ optional entity
 * signals) → constrain the LLM to the governed MACRO/MID taxonomy → persist a versioned
 * snapshot. This snapshot is the shared input that category (TASK-1288), business_model
 * (TASK-1289) and prompts (TASK-1290) derive from. Behind the flag; degrades honest.
 *
 * Hard rule: the returned `candidateCategoryNode` is validated against the catalog — a real
 * active node or 'unknown'. The LLM NEVER invents a node (defense-in-depth over the prompt).
 */

import { CATEGORY_TAXONOMY, CATEGORY_TAXONOMY_NODES_BY_ID } from '../taxonomy/catalog'
import { UNKNOWN_CATEGORY_NODE_ID } from '../taxonomy/resolve-category'
import {
  type BrandIntelligenceResult,
  type TaxonomyNodeChoice
} from './contracts'
import { fetchSiteContent } from './fetch-site-content'
import { runBrandIntelligence } from './router'
import { getActiveBrandIntelligence, persistBrandIntelligence, type BrandIntelligenceSnapshot } from './store'

const MAX_OUTPUT_TOKENS = 700

/** The MACRO (industry) + MID (sector) nodes the grounded read may choose from. */
export const getResolvableCategoryNodeChoices = (): TaxonomyNodeChoice[] =>
  CATEGORY_TAXONOMY.nodes
    .filter(node => node.status === 'active' && (node.level === 'industry' || node.level === 'sector'))
    .map(node => ({ id: node.id, label: node.label.es, examples: node.examples }))

/** Constrain a model-proposed node id to a real, active taxonomy node (or 'unknown'). */
const validateNodeId = (candidate: string): string => {
  if (candidate === UNKNOWN_CATEGORY_NODE_ID) return UNKNOWN_CATEGORY_NODE_ID

  const node = CATEGORY_TAXONOMY_NODES_BY_ID.get(candidate)

  return node && node.status === 'active' ? node.id : UNKNOWN_CATEGORY_NODE_ID
}

export interface ReadBrandIntelligenceInput {
  profileId: string
  brandName: string
  websiteUrl: string | null
  hubspotIndustry: string | null
  /** Optional pre-fetched entity signals summary (KG/Wikidata). */
  entitySignals?: string | null
  /** Test seam: inject site content + fetch impl. */
  deps?: { fetchImpl?: typeof fetch; siteContent?: string | null }
}

export interface ReadBrandIntelligenceResult {
  snapshot: BrandIntelligenceSnapshot | null
  status: BrandIntelligenceResult['metadata']['status']
}

/**
 * Run the grounded read for a profile and persist the snapshot. Returns `{ snapshot: null }`
 * (with the degradation status) when the read could not produce a usable snapshot — the
 * caller then keeps the deterministic prior.
 */
export const readBrandIntelligenceForProfile = async (
  input: ReadBrandIntelligenceInput
): Promise<ReadBrandIntelligenceResult> => {
  const siteContent =
    input.deps?.siteContent !== undefined
      ? input.deps.siteContent
      : (await fetchSiteContent(input.websiteUrl, { fetchImpl: input.deps?.fetchImpl })).content

  const result = await runBrandIntelligence(
    {
      brandName: input.brandName,
      websiteUrl: input.websiteUrl,
      hubspotIndustry: input.hubspotIndustry,
      siteContent,
      entitySignals: input.entitySignals ?? null,
      allowedNodes: getResolvableCategoryNodeChoices(),
      maxTokens: MAX_OUTPUT_TOKENS
    },
    { telemetry: { profileId: input.profileId } }
  )

  if (!result.fields) {
    return { snapshot: null, status: result.metadata.status }
  }

  const snapshot = await persistBrandIntelligence(
    input.profileId,
    { ...result.fields, candidateCategoryNode: validateNodeId(result.fields.candidateCategoryNode) },
    { providerId: result.metadata.providerId, model: result.metadata.model }
  )

  return { snapshot, status: 'ok' }
}

/** Map a snapshot to a grounded candidate for `resolveCanonicalCategory` (the cascade). */
export const brandIntelligenceToGroundedCandidate = (
  snapshot: BrandIntelligenceSnapshot | null
): { nodeId: string | null; confidence: number } | null => {
  if (!snapshot || !snapshot.candidateCategoryNode) return null

  return { nodeId: snapshot.candidateCategoryNode, confidence: snapshot.confidence ?? 0 }
}

export { getActiveBrandIntelligence }
