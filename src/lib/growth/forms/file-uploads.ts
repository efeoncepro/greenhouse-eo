import 'server-only'

import { Buffer } from 'node:buffer'

import { captureWithDomain } from '@/lib/observability/capture'
import { scanAndGateUploadedAsset } from '@/lib/storage/asset-scan/gate'
import { createPrivatePendingAsset } from '@/lib/storage/greenhouse-assets'

import type { FieldDefinition, FileUploadPolicy } from './contracts'

export type GrowthFormUploadedFileDescriptor = {
  kind: 'uploaded_file'
  fieldKey: string
  assetId: string
  status: 'clean' | 'quarantined'
  mimeType: string
  sizeBytes: number
  storageContext: FileUploadPolicy['storageContext']
  scanId: string
  scanner?: string
  advisoryFindingCodes?: string[]
}

export type GrowthFormUploadedFiles = Record<string, File>

export class GrowthFormUploadError extends Error {
  constructor(
    readonly code:
      | 'unexpected_file'
      | 'file_required'
      | 'file_empty'
      | 'file_too_large'
      | 'unsupported_type'
      | 'upload_policy_missing'
      | 'multiple_not_supported',
    readonly fieldKey?: string
  ) {
    super(code)
    this.name = 'GrowthFormUploadError'
  }
}

const isFileField = (field: FieldDefinition): boolean => field.type === 'file'

const safeFileName = (file: File, fieldKey: string): string => {
  const name = file.name.trim()

  return name || `${fieldKey}.pdf`
}

const validateFileAgainstPolicy = (field: FieldDefinition, file: File): FileUploadPolicy => {
  const policy = field.uploadPolicy

  if (!policy) throw new GrowthFormUploadError('upload_policy_missing', field.key)
  if (policy.multiple !== false) throw new GrowthFormUploadError('multiple_not_supported', field.key)
  if (file.size <= 0) throw new GrowthFormUploadError('file_empty', field.key)
  if (file.size > policy.maxBytes) throw new GrowthFormUploadError('file_too_large', field.key)

  const declaredMimeType = file.type || 'application/octet-stream'

  if (!policy.acceptedMimeTypes.includes(declaredMimeType)) {
    throw new GrowthFormUploadError('unsupported_type', field.key)
  }

  return policy
}

export const prepareGrowthFormUploadedFiles = async ({
  formId,
  formVersionId,
  surfaceId,
  fields,
  uploadedFiles
}: {
  formId: string
  formVersionId: string
  surfaceId: string | null
  fields: FieldDefinition[]
  uploadedFiles: GrowthFormUploadedFiles
}): Promise<Record<string, GrowthFormUploadedFileDescriptor>> => {
  const fileFields = fields.filter(isFileField)
  const fileFieldByKey = new Map(fileFields.map(field => [field.key, field]))
  const descriptors: Record<string, GrowthFormUploadedFileDescriptor> = {}

  for (const fieldKey of Object.keys(uploadedFiles)) {
    if (!fileFieldByKey.has(fieldKey)) throw new GrowthFormUploadError('unexpected_file', fieldKey)
  }

  for (const field of fileFields) {
    const file = uploadedFiles[field.key] ?? null

    if (!file) {
      if (field.required) throw new GrowthFormUploadError('file_required', field.key)
      continue
    }

    const policy = validateFileAgainstPolicy(field, file)
    const declaredMimeType = file.type || 'application/octet-stream'
    const bytes = Buffer.from(await file.arrayBuffer())

    const uploaded = await createPrivatePendingAsset({
      contextType: policy.storageContext,
      uploadedByUserId: null,
      fileName: safeFileName(file, field.key),
      contentType: declaredMimeType,
      bytes,
      // Public application uploads can remain pending until the reactive projection runs.
      // Content-hash dedupe across pending candidate CVs could otherwise share one asset
      // between different submissions if two people upload the same PDF.
      dedupe: false,
      metadata: {
        source: 'growth_forms',
        privacyClass: 'candidate_cv',
        formId,
        formVersionId,
        surfaceId,
        fieldKey: field.key,
        uploadFlow: 'growth_forms_public_submit',
        scanStatus: 'pending'
      }
    })

    const gate = await scanAndGateUploadedAsset({
      assetId: uploaded.assetId,
      bytes,
      declaredMimeType,
      fileName: file.name
    })

    if (gate.outcome === 'quarantined') {
      captureWithDomain(new Error(`growth_form_upload_quarantined:${gate.verdict}`), 'growth', {
        tags: { source: 'growth_forms_file_upload', stage: 'scan_gate' },
        extra: {
          formId,
          formVersionId,
          surfaceId,
          fieldKey: field.key,
          assetId: gate.assetId,
          scanId: gate.scanId,
          verdict: gate.verdict,
          findingCodes: gate.findingCodes
        }
      })

      descriptors[field.key] = {
        kind: 'uploaded_file',
        fieldKey: field.key,
        assetId: gate.assetId,
        status: 'quarantined',
        mimeType: declaredMimeType,
        sizeBytes: file.size,
        storageContext: policy.storageContext,
        scanId: gate.scanId
      }
      continue
    }

    descriptors[field.key] = {
      kind: 'uploaded_file',
      fieldKey: field.key,
      assetId: gate.assetId,
      status: 'clean',
      mimeType: declaredMimeType,
      sizeBytes: file.size,
      storageContext: policy.storageContext,
      scanId: gate.scanId,
      scanner: gate.scanner,
      advisoryFindingCodes: gate.advisoryFindingCodes
    }
  }

  return descriptors
}
