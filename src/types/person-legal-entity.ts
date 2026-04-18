export const PERSON_LEGAL_ENTITY_RELATIONSHIP_TYPES = [
  'shareholder',
  'founder',
  'legal_representative',
  'board_member',
  'executive',
  'employee',
  'contractor',
  'shareholder_current_account_holder',
  'lender_to_entity',
  'borrower_from_entity'
] as const

export type PersonLegalEntityRelationshipType =
  (typeof PERSON_LEGAL_ENTITY_RELATIONSHIP_TYPES)[number]

export const PERSON_LEGAL_ENTITY_RELATIONSHIP_STATUSES = ['active', 'inactive', 'ended'] as const

export type PersonLegalEntityRelationshipStatus =
  (typeof PERSON_LEGAL_ENTITY_RELATIONSHIP_STATUSES)[number]

export const PERSON_LEGAL_ENTITY_SOURCE_OF_TRUTH = {
  operatingEntityMemberRuntime: 'operating_entity_member_runtime',
  shareholderAccountRuntime: 'shareholder_account_runtime',
  manual: 'manual'
} as const

export type PersonLegalEntityRelationship = {
  relationshipId: string
  publicId: string
  profileId: string
  legalEntityOrganizationId: string
  legalEntityName: string | null
  spaceId: string | null
  relationshipType: PersonLegalEntityRelationshipType
  status: PersonLegalEntityRelationshipStatus
  sourceOfTruth: string
  sourceRecordType: string | null
  sourceRecordId: string | null
  roleLabel: string | null
  notes: string | null
  effectiveFrom: string
  effectiveTo: string | null
  metadata: Record<string, unknown>
  createdByUserId: string | null
  createdAt: string | null
  updatedAt: string | null
}

export const isPersonLegalEntityRelationshipType = (
  value: string | null | undefined
): value is PersonLegalEntityRelationshipType =>
  PERSON_LEGAL_ENTITY_RELATIONSHIP_TYPES.includes(
    (value || '') as PersonLegalEntityRelationshipType
  )
