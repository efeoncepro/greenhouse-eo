/**
 * TASK-976 — Serializable shapes shared between the contractor onboarding server
 * page and the runtime wizard view. Pure (client + server safe): no server-only,
 * no Pool, no IO. The page fetches the readers and maps to these lean shapes.
 */

/** A lean executed offboarding case for the Path B picker. */
export interface ExecutedOffboardingItem {
  offboardingCaseId: string
  publicId: string
  personName: string
  profileId: string
  /** ISO date (YYYY-MM-DD) | null. Contractor effective_from must be AFTER this. */
  lastWorkingDay: string | null
  separationType: string
  relationshipType: string
}

/** The operating entity (legal_entity_organization_id) used as Path A legal entity. */
export interface OperatingEntitySummary {
  organizationId: string
  legalName: string
}

/** People-picker item (mirrors /api/organizations/people-search). */
export interface PersonSearchItem {
  profileId: string
  fullName: string | null
  canonicalEmail: string | null
}

/** Path A resolve response (GET /api/hr/contractors/onboarding/resolve). */
export interface OnboardingResolveResult {
  contractorRelationship: {
    relationshipId: string
    legalEntityOrganizationId: string
    legalEntityName: string | null
  } | null
  executedOffboarding: {
    offboardingCaseId: string
    publicId: string
    lastWorkingDay: string | null
    separationType: string
    relationshipType: string
  } | null
}
