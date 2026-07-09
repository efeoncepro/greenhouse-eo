import 'server-only'

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
}) => {
  const validationError = validatePublicCareersCvUpload(file)

  if (validationError) {
    throw new PublicCareersCvUploadError(validationError)
  }

  const uploaded = await createPrivatePendingAsset({
    contextType: 'hiring_application_cv_draft',
    uploadedByUserId: null,
    fileName: resolveCvFileName(file, applicationId),
    contentType: file.type || 'application/octet-stream',
    bytes: await file.arrayBuffer(),
    metadata: {
      source: 'public_careers',
      uploadFlow: 'turnstile_verified_submit',
      privacyClass: 'candidate_cv',
      scanStatus: 'not_scanned_pdf_only_v1',
      openingId,
      openingPublicId,
      applicationId,
      identityProfileId,
      candidateFacetId,
    },
  })

  return attachAssetToAggregate({
    assetId: uploaded.assetId,
    ownerAggregateType: 'hiring_application_cv',
    ownerAggregateId: applicationId,
    actorUserId: null,
    metadata: {
      source: 'public_careers',
      privacyClass: 'candidate_cv',
      scanStatus: 'not_scanned_pdf_only_v1',
      openingId,
      openingPublicId,
      identityProfileId,
      candidateFacetId,
    },
  })
}
