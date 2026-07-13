import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { scanAndGateUploadedAsset } from '@/lib/storage/asset-scan/gate'
import { attachAssetToAggregate, createPrivatePendingAsset } from '@/lib/storage/greenhouse-assets'

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

const annotateDraftCvAsset = async (assetId: string, metadata: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_core.assets
      SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || $2::jsonb
      WHERE asset_id = $1
        AND owner_aggregate_type = 'hiring_application_cv_draft'
        AND status <> 'deleted'
    `,
    [assetId, JSON.stringify(metadata)],
  )
}

export type PublicCareersCvOutcome =
  | { outcome: 'attached'; assetId: string }
  | { outcome: 'quarantined'; assetId: string; scanId: string }

export type ScannedPublicCareersCvAssetReference = {
  assetId: string
  status: 'clean' | 'quarantined'
  scanId: string
  scanner?: string
  advisoryFindingCodes?: string[]
}

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

  const gate = await scanAndGateUploadedAsset({
    assetId: uploaded.assetId,
    bytes,
    declaredMimeType,
    fileName: file.name,
  })

  if (gate.outcome === 'quarantined') {
    // Observabilidad sin PII: nunca el nombre del archivo ni el email del candidato.
    captureWithDomain(new Error(`public_careers_cv_quarantined:${gate.verdict}`), 'hiring', {
      extra: {
        assetId: gate.assetId,
        scanId: gate.scanId,
        verdict: gate.verdict,
        findingCodes: gate.findingCodes,
      },
    })

    return { outcome: 'quarantined', assetId: gate.assetId, scanId: gate.scanId }
  }

  await attachAssetToAggregate({
    assetId: uploaded.assetId,
    ownerAggregateType: 'hiring_application_cv',
    ownerAggregateId: applicationId,
    actorUserId: null,
    metadata: {
      ...documentMetadata,
      scanStatus: 'clean',
      scanId: gate.scanId,
      scanner: gate.scanner,
      // Hallazgos advisory (p. ej. un PDF con /JavaScript exportado por Word):
      // no bloquean, pero quedan visibles para quien audite el documento.
      advisoryFindingCodes: gate.advisoryFindingCodes,
    },
  })

  return { outcome: 'attached', assetId: uploaded.assetId }
}

export const attachScannedPublicCareersCvAssetToApplication = async ({
  asset,
  applicationId,
  openingId,
  openingPublicId,
  identityProfileId,
  candidateFacetId,
}: {
  asset: ScannedPublicCareersCvAssetReference
  applicationId: string
  openingId: string
  openingPublicId: string
  identityProfileId: string
  candidateFacetId: string
}): Promise<PublicCareersCvOutcome> => {
  const documentMetadata = {
    source: 'growth_forms',
    privacyClass: 'candidate_cv',
    openingId,
    openingPublicId,
    identityProfileId,
    candidateFacetId,
    applicationId,
    scanStatus: asset.status,
    scanId: asset.scanId,
  } as const

  await annotateDraftCvAsset(asset.assetId, documentMetadata)

  if (asset.status !== 'clean') {
    return { outcome: 'quarantined', assetId: asset.assetId, scanId: asset.scanId }
  }

  await attachAssetToAggregate({
    assetId: asset.assetId,
    ownerAggregateType: 'hiring_application_cv',
    ownerAggregateId: applicationId,
    actorUserId: null,
    metadata: {
      ...documentMetadata,
      scanStatus: 'clean',
      scanner: asset.scanner,
      advisoryFindingCodes: asset.advisoryFindingCodes ?? [],
    },
  })

  return { outcome: 'attached', assetId: asset.assetId }
}
