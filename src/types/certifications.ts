import type { MemberSkill } from './agency-skills'
import type { MemberTool, MemberLanguage } from './talent-taxonomy'

export const CERTIFICATION_VERIFICATION_STATUSES = ['self_declared', 'pending_review', 'verified', 'rejected'] as const
export type CertificationVerificationStatus = (typeof CERTIFICATION_VERIFICATION_STATUSES)[number]

export const CERTIFICATION_VISIBILITY_VALUES = ['internal', 'client_visible'] as const
export type CertificationVisibility = (typeof CERTIFICATION_VISIBILITY_VALUES)[number]

export interface MemberCertification {
  certificationId: string
  memberId: string
  name: string
  issuer: string
  issuedDate: string | null
  expiryDate: string | null
  validationUrl: string | null
  assetId: string | null
  assetDownloadUrl: string | null
  assetMimeType: string | null
  visibility: CertificationVisibility
  verificationStatus: CertificationVerificationStatus
  verifiedBy: string | null
  verifiedAt: string | null
  rejectionReason: string | null
  notes: string | null
  isExpired: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface CreateCertificationInput {
  name: string
  issuer: string
  issuedDate?: string | null
  expiryDate?: string | null
  validationUrl?: string | null
  assetId?: string | null
  visibility?: CertificationVisibility
  notes?: string | null
}

export interface UpdateCertificationInput {
  name?: string
  issuer?: string
  issuedDate?: string | null
  expiryDate?: string | null
  validationUrl?: string | null
  assetId?: string | null
  visibility?: CertificationVisibility
  notes?: string | null
}

export interface VerifyCertificationInput {
  action: 'verify' | 'reject'
  rejectionReason?: string | null
}

export interface ProfessionalProfile {
  memberId: string
  displayName: string
  headline: string | null
  aboutMe: string | null
  professionalLinks: {
    linkedinUrl: string | null
    portfolioUrl: string | null
    twitterUrl: string | null
    threadsUrl: string | null
    behanceUrl: string | null
    githubUrl: string | null
    dribbbleUrl: string | null
  }
  contact: {
    phone: string | null
    locationCity: string | null
    locationCountry: string | null
  }
  skills: MemberSkill[]
  certifications: MemberCertification[]
  tools: MemberTool[]
  languages: MemberLanguage[]
  summary: {
    skillCount: number
    certificationCount: number
    verifiedSkillCount: number
    verifiedCertCount: number
    activeCertCount: number
    expiringSoonCount: number
    toolCount: number
    languageCount: number
  }
}
