import type { PersonDocumentType, VerificationStatus } from '@/lib/person-legal-profile/types'

/** Qué es el archivo, no dónde vive. El contexto de asset es detalle de storage. */
export type CandidateDocumentKind = 'cv' | 'portfolio_file'

/**
 * TASK-1362 — Estado del archivo desde la perspectiva de quien lo va a leer.
 *
 * `quarantined` y `legacy_unscanned` existen para que el desk degrade con
 * honestidad: un documento faltante y un documento bloqueado por el escáner NO
 * son lo mismo, y un CV que entró antes de que existiera el escaneo tampoco es
 * lo mismo que uno verificado.
 */
export type CandidateDocumentStatus = 'available' | 'quarantined' | 'legacy_unscanned' | 'pending'

export type CandidateDocumentScan = {
  verdict: string
  scanner: string
  findingCodes: string[]
  scannedAt: string | null
}

export type CandidateDocumentFile = {
  assetId: string
  publicId: string
  kind: CandidateDocumentKind
  fileName: string
  mimeType: string
  sizeBytes: number
  /** Sólo el CV se ancla a una postulación; el portafolio es del candidato. */
  applicationId: string | null
  uploadedAt: string | null
  status: CandidateDocumentStatus
  scan: CandidateDocumentScan | null
  /** `null` cuando el archivo no es descargable (cuarentena / aún pending). */
  downloadUrl: string | null
}

export type CandidateDocumentLinkKind = 'portfolio' | 'linkedin'

export type CandidateDocumentLink = {
  kind: CandidateDocumentLinkKind
  /** Ya viene saneado (https-only, sin fetch server-side) desde el intake de TASK-1367. */
  url: string
}

/** Siempre enmascarado. `value_full` sólo sale por el reveal auditado de TASK-784. */
export type CandidateIdentityDocument = {
  documentId: string
  documentType: PersonDocumentType
  countryCode: string
  displayMask: string
  verificationStatus: VerificationStatus
  evidenceAssetId: string | null
}

export type CandidateDocuments = {
  candidateFacetId: string
  identityProfileId: string
  files: CandidateDocumentFile[]
  links: CandidateDocumentLink[]
  identityDocuments: CandidateIdentityDocument[]
  quarantinedCount: number
}
