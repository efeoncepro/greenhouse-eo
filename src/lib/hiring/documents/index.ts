/**
 * TASK-1362 — Documentos del candidato: un primitive, muchos consumers.
 *
 * `access` autoriza (capability hiring, `client_*` nunca), `resolve` reúne los
 * tres sustratos (assets / enlaces / identidad enmascarada). El attach de
 * archivos vive en la plataforma de assets (`@/lib/storage/greenhouse-assets`)
 * y el escaneo en `@/lib/storage/asset-scan`: acá no se recrea ninguno.
 */
export { canAccessHiringCandidateDocument } from './access'
export { captureCandidateIdentityDocument } from './capture-identity-document'
export type { CaptureCandidateIdentityDocumentInput } from './capture-identity-document'
export { resolveCandidateDocuments } from './resolve'
export {
  CANDIDATE_DOCUMENT_RETENTION_MONTHS,
  listOverdueCandidateRetentions,
  resolveRetentionMonths,
} from './retention'
export type { OverdueCandidateRetention } from './retention'
export type {
  CandidateDocumentFile,
  CandidateDocumentKind,
  CandidateDocumentLink,
  CandidateDocumentLinkKind,
  CandidateDocumentScan,
  CandidateDocumentStatus,
  CandidateDocuments,
  CandidateIdentityDocument,
} from './types'
