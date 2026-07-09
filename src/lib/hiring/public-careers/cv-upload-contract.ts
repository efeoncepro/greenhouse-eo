export const PUBLIC_CAREERS_CV_MAX_BYTES = 10 * 1024 * 1024
export const PUBLIC_CAREERS_CV_ACCEPTED_MIME_TYPES = ['application/pdf'] as const

export type PublicCareersCvValidationError = 'file_empty' | 'file_too_large' | 'unsupported_type'

export type PublicCareersCvLike = {
  size: number
  type: string
}

export const formatPublicCareersCvFileSize = (sizeBytes: number) =>
  sizeBytes >= 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`

export const validatePublicCareersCvUpload = (file: PublicCareersCvLike): PublicCareersCvValidationError | null => {
  if (file.size <= 0) return 'file_empty'
  if (file.size > PUBLIC_CAREERS_CV_MAX_BYTES) return 'file_too_large'
  if (!PUBLIC_CAREERS_CV_ACCEPTED_MIME_TYPES.includes(file.type as 'application/pdf')) return 'unsupported_type'

  return null
}
