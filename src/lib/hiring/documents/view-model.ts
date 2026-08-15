import 'server-only'

import type { CandidateDocumentKind, CandidateDocumentLinkKind, CandidateDocuments } from './types'

/**
 * `missing` NO viene del reader: es la ausencia, elevada a estado de primera clase.
 *
 * El panel anterior mostraba "Enmascarado" para las cuatro situaciones a la vez, así
 * que un archivo bloqueado por el antivirus y un candidato que nunca adjuntó CV se
 * veían idénticos — y el reclutador culpaba al candidato por una falla del sistema.
 * Cada estado tiene su propio copy y su propia (no-)acción.
 */
export type CandidateDocumentRowStatus = CandidateDocuments['files'][number]['status'] | 'missing'

export type CandidateDocumentFileRow = {
  /** Estable para `key` de React: `assetId` cuando hay archivo, el kind cuando es una ausencia. */
  rowKey: string
  kind: CandidateDocumentKind
  fileName: string | null
  mimeType: string | null
  sizeBytes: number | null
  uploadedAt: string | null
  status: CandidateDocumentRowStatus
  /** `null` cuando el archivo no es legible (cuarentena, escaneo pendiente o ausencia). */
  openHref: string | null
  downloadHref: string | null
}

export type CandidateDocumentLinkRow = {
  kind: CandidateDocumentLinkKind
  url: string
}

export type CandidateIdentityRow = {
  documentId: string
  documentType: string
  countryCode: string
  displayMask: string
  verificationStatus: string
}

export type CandidateDocumentsViewModel = {
  candidateFacetId: string
  files: CandidateDocumentFileRow[]
  links: CandidateDocumentLinkRow[]
  identityDocuments: CandidateIdentityRow[]
  quarantinedCount: number
}

const KIND_ORDER: Record<CandidateDocumentKind, number> = { cv: 0, portfolio_file: 1 }

/**
 * `uploadedAt` viene tipado `string | null`, pero en runtime el driver de PG
 * entrega un `Date` para las columnas timestamp. Tratarlo como string revienta
 * (`localeCompare is not a function`) y los mocks NO lo atrapan: un fixture con
 * string pasa el test mientras la página falla. Se normaliza en la frontera, que
 * además es lo que el Client Component necesita (un ISO serializable).
 */
const toIsoString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()

  return value
}

const toEpoch = (value: string | null) => {
  if (!value) return 0

  const time = Date.parse(value)

  return Number.isNaN(time) ? 0 : time
}

const toRow = (file: CandidateDocuments['files'][number]): CandidateDocumentFileRow => ({
  rowKey: file.assetId,
  kind: file.kind,
  fileName: file.fileName,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  uploadedAt: toIsoString(file.uploadedAt),
  status: file.status,
  // `downloadUrl` ya es la ruta estable por assetId (sin token ni expiración). Con
  // `inline=1` la ruta responde `Content-Disposition: inline`: es la fuente del visor
  // EN EL PORTAL y, a la vez, la salida accesible de "abrir en pestaña" cuando el
  // visor no aplica (tipo no previsualizable, fallo de carga, tecnología asistiva).
  openHref: file.downloadUrl ? `${file.downloadUrl}?inline=1` : null,
  downloadHref: file.downloadUrl,
})

const missingRow = (kind: CandidateDocumentKind): CandidateDocumentFileRow => ({
  rowKey: `missing:${kind}`,
  kind,
  fileName: null,
  mimeType: null,
  sizeBytes: null,
  uploadedAt: null,
  status: 'missing',
  openHref: null,
  downloadHref: null,
})

/**
 * TASK-1715 — traduce el paquete documental del dominio a filas listas para pintar.
 *
 * Vive en `src/lib/**` y no en el componente por dos razones: el reader es
 * `server-only` y su semántica (qué es descargable, qué significa cada status) es
 * conocimiento de dominio que el browser no debe reinterpretar. El panel recibe
 * filas ya decididas y sólo las dibuja.
 *
 * La fila del CV se emite SIEMPRE, aunque no exista archivo: la sección no
 * desaparece cuando está vacía, porque "no hay CV" es información que el
 * reclutador necesita ver, no una ausencia que deba deducir de un hueco.
 */
export const buildCandidateDocumentsViewModel = (documents: CandidateDocuments): CandidateDocumentsViewModel => {
  const rows = documents.files.map(toRow).sort((left, right) => {
    const byKind = KIND_ORDER[left.kind] - KIND_ORDER[right.kind]

    if (byKind !== 0) return byKind

    // Dentro del mismo tipo, lo más reciente primero. Los CV de postulaciones
    // anteriores NO se ocultan: son evidencia del proceso.
    return toEpoch(right.uploadedAt) - toEpoch(left.uploadedAt)
  })

  if (!rows.some(row => row.kind === 'cv')) rows.push(missingRow('cv'))

  return {
    candidateFacetId: documents.candidateFacetId,
    files: rows,
    links: documents.links.map(link => ({ kind: link.kind, url: link.url })),
    identityDocuments: documents.identityDocuments.map(document => ({
      documentId: document.documentId,
      documentType: document.documentType,
      countryCode: document.countryCode,
      displayMask: document.displayMask,
      verificationStatus: document.verificationStatus,
    })),
    quarantinedCount: documents.quarantinedCount,
  }
}
