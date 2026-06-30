/**
 * TASK-1272 — Growth AI Visibility · Category taxonomy contract.
 *
 * Repo-governed source of truth for how the grader classifies a brand/category
 * association. Provider/LLM prose is untrusted input; product-facing output must
 * map to these canonical IDs or degrade honestly.
 */

export const CATEGORY_TAXONOMY_VERSION = 'category_taxonomy_v1' as const
export type CategoryTaxonomyVersion = typeof CATEGORY_TAXONOMY_VERSION

export const CATEGORY_TAXONOMY_LEVELS = [
  'industry',
  'sector',
  'product_service_category',
  'use_case',
  'buyer_persona',
  'market'
] as const
export type CategoryTaxonomyLevel = (typeof CATEGORY_TAXONOMY_LEVELS)[number]

export const CATEGORY_TAXONOMY_NODE_STATUSES = ['active', 'deprecated', 'internal'] as const
export type CategoryTaxonomyNodeStatus = (typeof CATEGORY_TAXONOMY_NODE_STATUSES)[number]

export interface CategoryTaxonomyNode {
  id: string
  level: CategoryTaxonomyLevel
  label: { es: string; en: string }
  aliases: string[]
  parentIds: string[]
  examples: string[]
  status: CategoryTaxonomyNodeStatus
}

export interface CategoryTaxonomy {
  version: CategoryTaxonomyVersion
  nodes: CategoryTaxonomyNode[]
}

export const CATEGORY_MAPPING_STATUSES = ['mapped', 'unknown', 'needs_review', 'ambiguous'] as const
export type CategoryMappingStatus = (typeof CATEGORY_MAPPING_STATUSES)[number]

export const CATEGORY_ASSOCIATION_EVIDENCE_SOURCES = [
  'llm_candidate',
  'legacy_string',
  'declared_profile',
  'manual_review'
] as const
export type CategoryAssociationEvidenceSource = (typeof CATEGORY_ASSOCIATION_EVIDENCE_SOURCES)[number]

export interface CategoryAssociation {
  taxonomyVersion: CategoryTaxonomyVersion
  mappingStatus: CategoryMappingStatus
  nodeId: string | null
  level: CategoryTaxonomyLevel | null
  confidence: number
  evidenceSource: CategoryAssociationEvidenceSource
}

export interface CategoryTaxonomyValidationResult {
  ok: boolean
  errors: string[]
}
