import 'server-only'

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export const PAYROLL_PDF_LOGO_PATH = path.join(process.cwd(), 'public/branding/logo-full.png')

type PayrollPdfLogoAsset = {
  dataUri: string
  sha256: string
  sizeBytes: number
}

let cachedLogoAsset: PayrollPdfLogoAsset | null = null

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export class PayrollPdfLogoAssetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PayrollPdfLogoAssetError'
  }
}

const assertPngLogoAsset = (logoBytes: Buffer) => {
  if (logoBytes.length < 5_000) {
    throw new PayrollPdfLogoAssetError(`Payroll PDF logo asset is unexpectedly small (${logoBytes.length} bytes).`)
  }

  if (!logoBytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new PayrollPdfLogoAssetError('Payroll PDF logo asset is not a valid PNG file.')
  }
}

export const getPayrollPdfLogoAsset = (): PayrollPdfLogoAsset => {
  if (cachedLogoAsset) return cachedLogoAsset

  let logoBytes: Buffer

  try {
    logoBytes = fs.readFileSync(PAYROLL_PDF_LOGO_PATH)
  } catch (error) {
    throw new PayrollPdfLogoAssetError(
      `Payroll PDF logo asset is unavailable at ${PAYROLL_PDF_LOGO_PATH}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  assertPngLogoAsset(logoBytes)

  cachedLogoAsset = {
    dataUri: `data:image/png;base64,${logoBytes.toString('base64')}`,
    sha256: crypto.createHash('sha256').update(logoBytes).digest('hex'),
    sizeBytes: logoBytes.length
  }

  return cachedLogoAsset
}

export const getPayrollPdfLogoDataUri = () => getPayrollPdfLogoAsset().dataUri
