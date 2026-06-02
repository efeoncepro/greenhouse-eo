/**
 * TASK-790 — Subtype family consistency (pure). Decision D2.
 *
 * The anchored `person_legal_entity_relationship` stores a COARSE subtype in
 * `metadata_json.relationshipSubtype` with only two values:
 *   - 'honorarios'  → Chile civil/service-provider relationship
 *   - 'contractor'  → everything else (international / freelance / provider)
 *
 * The engagement declares its OWN fine-grained `relationshipSubtype` (5 values)
 * as SSOT. It must stay in the SAME FAMILY as the relationship's coarse subtype.
 * This is a consistency check, NOT a derivation — the engagement owns the fine
 * value; we only forbid cross-family drift. No write-back to the relationship.
 */
import type { ContractorEngagementSubtype } from './types'

/** Coarse relationship subtype as stored in metadata.relationshipSubtype. */
export type RelationshipCoarseSubtype = 'honorarios' | 'contractor'

const SUBTYPE_FAMILY: Record<
  RelationshipCoarseSubtype,
  readonly ContractorEngagementSubtype[]
> = {
  honorarios: ['honorarios_cl'],
  contractor: [
    'freelance',
    'independent_professional',
    'international_contractor',
    'provider_platform'
  ]
}

export const normalizeRelationshipCoarseSubtype = (
  value: unknown
): RelationshipCoarseSubtype | null => {
  if (value === 'honorarios' || value === 'contractor') {
    return value
  }

  return null
}

export const isSubtypeConsistent = (
  coarse: RelationshipCoarseSubtype,
  fine: ContractorEngagementSubtype
): boolean => SUBTYPE_FAMILY[coarse].includes(fine)

export class ContractorSubtypeConsistencyError extends Error {
  readonly code = 'engagement_subtype_inconsistent_with_relationship'
  readonly coarse: RelationshipCoarseSubtype
  readonly fine: ContractorEngagementSubtype

  constructor(coarse: RelationshipCoarseSubtype, fine: ContractorEngagementSubtype) {
    super(
      `El subtype del engagement (${fine}) no pertenece a la familia de la relación contractor anclada (${coarse}).`
    )
    this.name = 'ContractorSubtypeConsistencyError'
    this.coarse = coarse
    this.fine = fine
  }
}

/**
 * Asserts the engagement's fine subtype is consistent with the relationship's
 * coarse subtype. When the relationship has no recognizable coarse subtype
 * (legacy metadata), we do NOT block — the engagement subtype stands as SSOT
 * (honest degradation; the reliability signal flags persistent drift).
 */
export const assertSubtypeConsistency = (
  coarse: RelationshipCoarseSubtype | null,
  fine: ContractorEngagementSubtype
): void => {
  if (coarse === null) {
    return
  }

  if (!isSubtypeConsistent(coarse, fine)) {
    throw new ContractorSubtypeConsistencyError(coarse, fine)
  }
}
