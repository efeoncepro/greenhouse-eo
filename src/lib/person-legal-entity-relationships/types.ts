export type PersonLegalEntityRelationshipType =
  | 'shareholder'
  | 'founder'
  | 'legal_representative'
  | 'board_member'
  | 'executive'
  | 'employee'
  | 'contractor'
  | 'shareholder_current_account_holder'
  | 'lender_to_entity'
  | 'borrower_from_entity'

export type PersonLegalEntityRelationshipStatus = 'active' | 'inactive' | 'ended'

export type ContractorRelationshipSubtype = 'contractor' | 'honorarios'

export interface PersonLegalEntityRelationship {
  relationshipId: string
  publicId: string
  profileId: string
  legalEntityOrganizationId: string
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
  createdAt: string
  updatedAt: string
}

export interface CreateContractorRelationshipInput {
  profileId: string
  legalEntityOrganizationId: string
  spaceId?: string | null
  subtype: ContractorRelationshipSubtype
  effectiveFrom: string
  sourceOfTruth: string
  sourceRecordType?: string | null
  sourceRecordId?: string | null
  roleLabel?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  actorUserId: string
}

export interface EndRelationshipInput {
  relationshipId: string
  effectiveTo: string
  notes?: string | null
  metadataPatch?: Record<string, unknown>
  actorUserId: string
}
