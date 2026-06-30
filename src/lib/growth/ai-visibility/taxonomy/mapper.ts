import {
  CATEGORY_TAXONOMY,
  CATEGORY_TAXONOMY_NODES_BY_ID,
  getCategoryTaxonomyNode
} from './catalog'
import {
  CATEGORY_TAXONOMY_VERSION,
  type CategoryAssociation,
  type CategoryAssociationEvidenceSource,
  type CategoryTaxonomyLevel,
  type CategoryTaxonomyNode
} from './contracts'

export interface CategoryCandidateMappingInput {
  candidate: string
  evidenceSource?: CategoryAssociationEvidenceSource
  allowedLevels?: readonly CategoryTaxonomyLevel[]
}

export interface CategoryCandidatesMappingInput {
  candidates: readonly string[]
  evidenceSource?: CategoryAssociationEvidenceSource
  allowedLevels?: readonly CategoryTaxonomyLevel[]
}

export const normalizeCategoryCandidate = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

const aliasEntries = CATEGORY_TAXONOMY.nodes.flatMap(node => {
  const values = [node.id, node.label.es, node.label.en, ...node.aliases]

  return values.map(value => ({ key: normalizeCategoryCandidate(value), node }))
})

const ALIAS_INDEX = aliasEntries.reduce((index, entry) => {
  if (entry.key.length === 0) return index

  const current = index.get(entry.key) ?? []

  current.push(entry.node)
  index.set(entry.key, current)

  return index
}, new Map<string, CategoryTaxonomyNode[]>())

const uniqueNodes = (nodes: CategoryTaxonomyNode[]): CategoryTaxonomyNode[] => [
  ...new Map(nodes.map(node => [node.id, node])).values()
]

const mappedAssociation = (
  node: CategoryTaxonomyNode,
  evidenceSource: CategoryAssociationEvidenceSource,
  confidence: number
): CategoryAssociation => ({
  taxonomyVersion: CATEGORY_TAXONOMY_VERSION,
  mappingStatus: 'mapped',
  nodeId: node.id,
  level: node.level,
  confidence,
  evidenceSource
})

const fallbackAssociation = (
  mappingStatus: 'unknown' | 'needs_review' | 'ambiguous',
  evidenceSource: CategoryAssociationEvidenceSource,
  confidence = 0
): CategoryAssociation => ({
  taxonomyVersion: CATEGORY_TAXONOMY_VERSION,
  mappingStatus,
  nodeId: null,
  level: null,
  confidence,
  evidenceSource
})

export const mapCategoryCandidateToTaxonomy = (
  input: CategoryCandidateMappingInput | string
): CategoryAssociation => {
  const candidate = typeof input === 'string' ? input : input.candidate

  const evidenceSource =
    typeof input === 'string' ? 'legacy_string' : input.evidenceSource ?? 'legacy_string'

  const allowedLevels = typeof input === 'string' ? undefined : input.allowedLevels
  const normalized = normalizeCategoryCandidate(candidate)

  if (normalized.length === 0) {
    return fallbackAssociation('unknown', evidenceSource)
  }

  const idMatch = CATEGORY_TAXONOMY_NODES_BY_ID.get(candidate)

  if (idMatch && (!allowedLevels || allowedLevels.includes(idMatch.level)) && idMatch.status === 'active') {
    return mappedAssociation(idMatch, evidenceSource, 0.98)
  }

  const matches = uniqueNodes(ALIAS_INDEX.get(normalized) ?? [])
    .filter(node => node.status === 'active')
    .filter(node => !allowedLevels || allowedLevels.includes(node.level))

  if (matches.length === 1) {
    const node = matches[0]
    const confidence = normalizeCategoryCandidate(node.label.es) === normalized || normalizeCategoryCandidate(node.label.en) === normalized ? 0.9 : 0.92

    return mappedAssociation(node, evidenceSource, confidence)
  }

  if (matches.length > 1) {
    return fallbackAssociation('ambiguous', evidenceSource, 0.4)
  }

  return fallbackAssociation('needs_review', evidenceSource)
}

export const mapCategoryCandidatesToTaxonomy = (
  input: CategoryCandidatesMappingInput
): CategoryAssociation[] => {
  const seenMapped = new Set<string>()
  const associations: CategoryAssociation[] = []

  for (const candidate of input.candidates) {
    const association = mapCategoryCandidateToTaxonomy({
      candidate,
      evidenceSource: input.evidenceSource ?? 'legacy_string',
      allowedLevels: input.allowedLevels
    })

    if (association.mappingStatus === 'mapped' && association.nodeId) {
      if (seenMapped.has(association.nodeId)) continue
      seenMapped.add(association.nodeId)
    }

    associations.push(association)
  }

  return associations
}

export const toCanonicalCategoryAssociationIds = (
  associations: readonly CategoryAssociation[]
): string[] => [
  ...new Set(
    associations
      .filter((association): association is CategoryAssociation & { nodeId: string } =>
        association.mappingStatus === 'mapped' && Boolean(association.nodeId)
      )
      .map(association => association.nodeId)
  )
]

export const normalizeCategoryAssociationIds = (values: readonly string[]): string[] =>
  toCanonicalCategoryAssociationIds(
    mapCategoryCandidatesToTaxonomy({ candidates: values, evidenceSource: 'legacy_string' })
  )

export const hasCanonicalCategoryAssociations = (values: readonly string[]): boolean =>
  normalizeCategoryAssociationIds(values).length > 0

export const findCategoryNodeByCandidate = (candidate: string): CategoryTaxonomyNode | null => {
  const mapped = mapCategoryCandidateToTaxonomy(candidate)

  return mapped.mappingStatus === 'mapped' && mapped.nodeId ? getCategoryTaxonomyNode(mapped.nodeId) : null
}
