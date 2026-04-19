import 'server-only'

export type MasterAgreementStatus =
  | 'draft'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'superseded'

export type MasterAgreementClauseCategory =
  | 'legal'
  | 'payment'
  | 'privacy'
  | 'security'
  | 'ip'
  | 'sla'
  | 'general'

export type MasterAgreementClauseLanguage = 'es' | 'en'

export interface ClauseLibraryRow {
  clauseId: string
  clauseCode: string
  version: number
  language: MasterAgreementClauseLanguage
  category: MasterAgreementClauseCategory
  title: string
  summary: string | null
  bodyTemplate: string
  defaultVariables: Record<string, unknown>
  required: boolean
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface MasterAgreementClauseRow {
  msaClauseId: string
  msaId: string
  clauseId: string
  clauseCode: string
  clauseVersion: number
  clauseLanguage: MasterAgreementClauseLanguage
  category: MasterAgreementClauseCategory
  title: string
  summary: string | null
  bodyTemplate: string
  bodyOverride: string | null
  resolvedBody: string
  defaultVariables: Record<string, unknown>
  variables: Record<string, unknown>
  included: boolean
  sortOrder: number
  effectiveFrom: string | null
  effectiveTo: string | null
  notes: string | null
  updatedAt: string
}

export interface MasterAgreementListRow {
  msaId: string
  msaNumber: string
  title: string
  counterpartyName: string | null
  organizationId: string
  organizationName: string | null
  clientId: string | null
  clientName: string | null
  status: MasterAgreementStatus
  effectiveDate: string
  expirationDate: string | null
  autoRenewal: boolean
  renewalFrequencyMonths: number | null
  renewalNoticeDays: number
  governingLaw: string | null
  jurisdiction: string | null
  paymentTermsDays: number | null
  currency: string | null
  signedAt: string | null
  signedByClient: string | null
  signedByEfeonce: string | null
  signedDocumentAssetId: string | null
  signatureProvider: string | null
  signatureStatus: string | null
  signatureDocumentToken: string | null
  signatureLastSyncedAt: string | null
  contractCount: number
  activeClauseCount: number
  updatedAt: string
}

export interface MasterAgreementContractLinkRow {
  contractId: string
  contractNumber: string
  status: string
  clientId: string | null
  organizationId: string | null
  startDate: string | null
  endDate: string | null
}

export interface MasterAgreementDetailRow extends MasterAgreementListRow {
  internalNotes: string | null
  signedDocumentDownloadUrl: string | null
  clauses: MasterAgreementClauseRow[]
  linkedContracts: MasterAgreementContractLinkRow[]
}

export interface ResolvedContractClauseRow {
  contractId: string
  msaId: string
  msaNumber: string
  clauseId: string
  clauseCode: string
  clauseVersion: number
  clauseLanguage: MasterAgreementClauseLanguage
  category: MasterAgreementClauseCategory
  title: string
  resolvedBody: string
  included: boolean
  sortOrder: number
}
