import { describe, expect, it } from 'vitest'

import {
  PUBLIC_CAREERS_CV_MAX_BYTES,
  formatPublicCareersCvFileSize,
  validatePublicCareersCvUpload,
} from './cv-upload-contract'

describe('public careers CV upload contract', () => {
  it('accepts PDF files up to the public careers limit', () => {
    expect(validatePublicCareersCvUpload({ type: 'application/pdf', size: PUBLIC_CAREERS_CV_MAX_BYTES })).toBeNull()
  })

  it('rejects empty, oversized, and non-PDF files', () => {
    expect(validatePublicCareersCvUpload({ type: 'application/pdf', size: 0 })).toBe('file_empty')
    expect(validatePublicCareersCvUpload({ type: 'application/pdf', size: PUBLIC_CAREERS_CV_MAX_BYTES + 1 })).toBe('file_too_large')
    expect(validatePublicCareersCvUpload({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 })).toBe('unsupported_type')
  })

  it('formats file sizes for the public uploader UI', () => {
    expect(formatPublicCareersCvFileSize(1536)).toBe('2 KB')
    expect(formatPublicCareersCvFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})
