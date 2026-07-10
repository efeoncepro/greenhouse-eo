import 'server-only'

import { listIdentityDocumentsForProfileMasked } from '@/lib/person-legal-profile'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getLatestScanResultsForAssets } from '@/lib/storage/asset-scan/store'

import { HiringNotFoundError, HiringValidationError } from '../errors'
import { getCandidateFacetById, getCandidateFacetByProfile, listHiringApplications } from '../store'
import type {
  CandidateDocumentFile,
  CandidateDocumentKind,
  CandidateDocumentLink,
  CandidateDocumentStatus,
  CandidateDocuments,
} from './types'

type AssetRow = {
  asset_id: string
  public_id: string
  owner_aggregate_type: string
  owner_aggregate_id: string | null
  status: string
  filename: string
  mime_type: string
  size_bytes: string | number
  metadata_json: Record<string, unknown> | null
  uploaded_at: string | null
}

const KIND_BY_CONTEXT: Record<string, CandidateDocumentKind> = {
  hiring_application_cv: 'cv',
  hiring_application_cv_draft: 'cv',
  hiring_candidate_portfolio_file: 'portfolio_file',
  hiring_candidate_portfolio_file_draft: 'portfolio_file',
}

/**
 * Los assets `attached` se anclan por `owner_aggregate_id` (CV → postulación,
 * portafolio → facet). Los que quedaron `pending` o `quarantined` NUNCA llegaron
 * a tener `owner_aggregate_id` (el INSERT lo deja en NULL), así que la única
 * forma de encontrarlos es por el `candidateFacetId` que viaja en su metadata.
 * Omitir esa segunda rama haría desaparecer del desk justo los documentos
 * bloqueados por el escáner — que son los que un humano tiene que mirar.
 */
const ASSETS_SQL = `
  SELECT
    asset_id, public_id, owner_aggregate_type, owner_aggregate_id, status,
    filename, mime_type, size_bytes, metadata_json, uploaded_at
  FROM greenhouse_core.assets
  WHERE owner_aggregate_type = ANY($1::text[])
    AND status <> 'deleted'
    AND (
      owner_aggregate_id = ANY($2::text[])
      OR metadata_json->>'candidateFacetId' = $3
    )
  ORDER BY uploaded_at DESC NULLS LAST, asset_id DESC
`

const CANDIDATE_ASSET_CONTEXTS = Object.keys(KIND_BY_CONTEXT)

const resolveStatus = (assetStatus: string, scanVerdict: string | undefined): CandidateDocumentStatus => {
  if (assetStatus === 'quarantined') return 'quarantined'
  if (assetStatus !== 'attached') return 'pending'
  if (scanVerdict === 'legacy_unscanned') return 'legacy_unscanned'

  return 'available'
}

const isDownloadable = (status: CandidateDocumentStatus) => status === 'available' || status === 'legacy_unscanned'

const toNumber = (value: string | number) => (typeof value === 'number' ? value : Number.parseInt(value, 10) || 0)

const readString = (metadata: Record<string, unknown> | null, key: string) => {
  const value = metadata?.[key]

  return typeof value === 'string' && value ? value : null
}

const buildLinks = ({
  portfolioUrl,
  linkedinUrl,
}: {
  portfolioUrl: string | null
  linkedinUrl: string | null
}): CandidateDocumentLink[] => {
  const links: CandidateDocumentLink[] = []

  if (portfolioUrl) links.push({ kind: 'portfolio', url: portfolioUrl })
  if (linkedinUrl) links.push({ kind: 'linkedin', url: linkedinUrl })

  return links
}

/**
 * TASK-1362 — Reader unificado de TODOS los documentos de un candidato.
 *
 * Un solo primitive, muchos consumers (desk TASK-355, handoff TASK-356, Nexa/MCP
 * por construcción). Reúne tres sustratos que ya existían por separado y que
 * nadie había juntado: los archivos (`greenhouse_core.assets`), los enlaces
 * (`candidate_facet.portfolio_url`/`linkedin_url`, TASK-1367) y la identidad
 * (`person_identity_documents`, TASK-784 — SIEMPRE enmascarada acá).
 *
 * NO autoriza: el caller aplica `canAccessHiringCandidateDocument` antes de
 * llamar. NO revela `value_full` de identidad bajo ninguna condición: eso exige
 * el reveal auditado con capability + reason.
 *
 * NO degrada en silencio (invariante de readers canónicos del 360): si una de
 * las tres fuentes falla, la excepción sube. Un candidato "sin documentos" y un
 * candidato cuya consulta falló NO pueden verse iguales.
 */
export const resolveCandidateDocuments = async ({
  candidateFacetId,
  identityProfileId,
}: {
  candidateFacetId?: string
  identityProfileId?: string
}): Promise<CandidateDocuments> => {
  if (!candidateFacetId && !identityProfileId) {
    throw new HiringValidationError(
      'Se requiere candidateFacetId o identityProfileId para resolver documentos.',
      'hiring_documents_missing_identifier',
    )
  }

  const facet = candidateFacetId
    ? await getCandidateFacetById(candidateFacetId)
    : await getCandidateFacetByProfile(identityProfileId as string)

  if (!facet) {
    throw new HiringNotFoundError('No existe una ficha de candidato para el identificador entregado.')
  }

  // `candidate_facet.identity_profile_id` es UNIQUE (persona ↔ facet es 1:1), así
  // que filtrar por perfil devuelve exactamente las postulaciones de este candidato.
  const applications = await listHiringApplications({ identityProfileId: facet.identityProfileId })

  // El facet ancla el portafolio; cada postulación ancla su propio CV.
  const anchorIds = [facet.candidateFacetId, ...applications.map(application => application.applicationId)]

  const rows = await runGreenhousePostgresQuery<AssetRow>(ASSETS_SQL, [
    CANDIDATE_ASSET_CONTEXTS,
    anchorIds,
    facet.candidateFacetId,
  ])

  const scans = await getLatestScanResultsForAssets(rows.map(row => row.asset_id))

  const files: CandidateDocumentFile[] = rows.map(row => {
    const scan = scans.get(row.asset_id)
    const status = resolveStatus(row.status, scan?.verdict)

    return {
      assetId: row.asset_id,
      publicId: row.public_id,
      kind: KIND_BY_CONTEXT[row.owner_aggregate_type] ?? 'cv',
      fileName: row.filename,
      mimeType: row.mime_type,
      sizeBytes: toNumber(row.size_bytes),
      applicationId: row.owner_aggregate_id ?? readString(row.metadata_json, 'applicationId'),
      uploadedAt: row.uploaded_at,
      status,
      scan: scan
        ? {
            verdict: scan.verdict,
            scanner: scan.scanner,
            findingCodes: scan.findings.map(finding => finding.code),
            scannedAt: scan.scannedAt,
          }
        : null,
      downloadUrl: isDownloadable(status) ? `/api/assets/private/${row.asset_id}` : null,
    }
  })

  const identityDocuments = await listIdentityDocumentsForProfileMasked(facet.identityProfileId)

  return {
    candidateFacetId: facet.candidateFacetId,
    identityProfileId: facet.identityProfileId,
    files,
    links: buildLinks(facet),
    identityDocuments: identityDocuments.map(document => ({
      documentId: document.documentId,
      documentType: document.documentType,
      countryCode: document.countryCode,
      displayMask: document.displayMask,
      verificationStatus: document.verificationStatus,
      evidenceAssetId: document.evidenceAssetId,
    })),
    quarantinedCount: files.filter(file => file.status === 'quarantined').length,
  }
}
