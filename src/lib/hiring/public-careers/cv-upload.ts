import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { isBlockingVerdict, scanAssetBytes } from '@/lib/storage/asset-scan'
import { recordAssetScanResult } from '@/lib/storage/asset-scan/store'
import { attachAssetToAggregate, createPrivatePendingAsset, quarantineAsset } from '@/lib/storage/greenhouse-assets'

import {
  validatePublicCareersCvUpload,
  type PublicCareersCvValidationError,
} from './cv-upload-contract'

export class PublicCareersCvUploadError extends Error {
  readonly code: PublicCareersCvValidationError

  constructor(code: PublicCareersCvValidationError) {
    super(code)
    this.name = 'PublicCareersCvUploadError'
    this.code = code
  }
}

const resolveCvFileName = (file: File, applicationId: string) => {
  const fileName = file.name.trim()

  return fileName || `cv-${applicationId}.pdf`
}

export type PublicCareersCvOutcome =
  | { outcome: 'attached'; assetId: string }
  | { outcome: 'quarantined'; assetId: string; scanId: string }

/**
 * TASK-1362 — Adjunta el CV del apply público, escaneando ANTES del attach.
 *
 * `validatePublicCareersCvUpload` sólo mira `file.type`, que lo declara el
 * cliente: nunca fue una verificación de contenido. El escaneo estructural lee
 * los magic bytes reales, así que un binario renombrado a `.pdf` queda en
 * cuarentena en vez de adjuntarse al aggregate.
 *
 * La cuarentena NO hace fallar la postulación: los datos del candidato son
 * válidos aunque el archivo no lo sea, y lanzar 500 acá le confirmaría al
 * atacante qué payload fue rechazado. El desk resuelve el documento como
 * `quarantined` y el reliability signal levanta la mano para triage humano.
 */
export const attachPublicCareersCvToApplication = async ({
  file,
  applicationId,
  openingId,
  openingPublicId,
  identityProfileId,
  candidateFacetId,
}: {
  file: File
  applicationId: string
  openingId: string
  openingPublicId: string
  identityProfileId: string
  candidateFacetId: string
}): Promise<PublicCareersCvOutcome> => {
  const validationError = validatePublicCareersCvUpload(file)

  if (validationError) {
    throw new PublicCareersCvUploadError(validationError)
  }

  const declaredMimeType = file.type || 'application/octet-stream'
  const bytes = Buffer.from(await file.arrayBuffer())

  const documentMetadata = {
    source: 'public_careers',
    privacyClass: 'candidate_cv',
    openingId,
    openingPublicId,
    identityProfileId,
    candidateFacetId,
  } as const

  const uploaded = await createPrivatePendingAsset({
    contextType: 'hiring_application_cv_draft',
    uploadedByUserId: null,
    fileName: resolveCvFileName(file, applicationId),
    contentType: declaredMimeType,
    bytes,
    metadata: {
      ...documentMetadata,
      uploadFlow: 'turnstile_verified_submit',
      applicationId,
      scanStatus: 'pending',
    },
  })

  const scan = await scanAssetBytes({ bytes, declaredMimeType, fileName: file.name })

  const scanId = await recordAssetScanResult({
    assetId: uploaded.assetId,
    result: scan,
    declaredMimeType,
    sizeBytes: bytes.byteLength,
  })

  if (isBlockingVerdict(scan.verdict)) {
    const findingCodes = scan.findings.filter(finding => finding.severity === 'blocking').map(finding => finding.code)

    await quarantineAsset({ assetId: uploaded.assetId, scanId, verdict: scan.verdict, findingCodes })

    // Observabilidad sin PII: nunca el nombre del archivo ni el email del candidato.
    captureWithDomain(new Error(`public_careers_cv_quarantined:${scan.verdict}`), 'hiring', {
      extra: { assetId: uploaded.assetId, scanId, verdict: scan.verdict, findingCodes, scanner: scan.scanner },
    })

    return { outcome: 'quarantined', assetId: uploaded.assetId, scanId }
  }

  await attachAssetToAggregate({
    assetId: uploaded.assetId,
    ownerAggregateType: 'hiring_application_cv',
    ownerAggregateId: applicationId,
    actorUserId: null,
    metadata: {
      ...documentMetadata,
      scanStatus: scan.verdict,
      scanId,
      scanner: scan.scanner,
      // Hallazgos advisory (p. ej. un PDF con /JavaScript exportado por Word):
      // no bloquean, pero quedan visibles para quien audite el documento.
      advisoryFindingCodes: scan.findings
        .filter(finding => finding.severity === 'advisory')
        .map(finding => finding.code),
    },
  })

  return { outcome: 'attached', assetId: uploaded.assetId }
}
