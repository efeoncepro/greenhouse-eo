import { describe, expect, it } from 'vitest'

import { getPayrollPdfLogoAsset, getPayrollPdfLogoDataUri } from './pdf-logo'

describe('payroll PDF logo asset', () => {
  it('loads the Efeonce logo as a PNG data URI for server-side PDF rendering', () => {
    const dataUri = getPayrollPdfLogoDataUri()

    expect(dataUri).toMatch(/^data:image\/png;base64,/)
    expect(Buffer.from(dataUri?.split(',')[1] ?? '', 'base64').length).toBeGreaterThan(5_000)
  })

  it('exposes a stable fingerprint for receipt cache invalidation', () => {
    const asset = getPayrollPdfLogoAsset()

    expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(asset.sizeBytes).toBeGreaterThan(5_000)
  })
})
