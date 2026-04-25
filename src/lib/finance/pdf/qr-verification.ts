import 'server-only'

import { createHmac, createHash } from 'node:crypto'

import QRCode from 'qrcode'

/**
 * TASK-629 — QR verification token + image generation for the PDF.
 *
 * Decision 5 (RESEARCH-005 v1.3): public verification URL with HMAC-signed
 * token. Token incluye PDF content hash → si el documento es alterado offline,
 * el QR muestra "documento invalido" en el endpoint publico de verificacion.
 *
 * Robustness:
 * - HMAC secret leído de `GREENHOUSE_QUOTE_VERIFICATION_SECRET`. Si no está
 *   set, falla cerrado (no genera QR — graceful degradation en vez de QR
 *   inseguro).
 * - QR generation usa error correction nivel 'M' (15% recovery) — balance
 *   entre densidad y resistencia a daño físico (escaneo desde celular).
 * - Cache-once por token: el mismo input siempre genera el mismo QR (los
 *   tokens son determinísticos por input).
 */

interface QuoteVerificationInput {
  quotationId: string
  versionNumber: number
  pdfHash?: string  // Optional content hash, included in token if provided
}

const getSecret = (): string | null => {
  const secret = process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET

  return secret && secret.length >= 32 ? secret : null
}

const getBaseUrl = (): string => {
  return process.env.NEXTAUTH_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://greenhouse.efeoncepro.com'
}

export const computeVerificationToken = (input: QuoteVerificationInput): string | null => {
  const secret = getSecret()

  if (!secret) return null

  const payload = `${input.quotationId}:${input.versionNumber}:${input.pdfHash ?? ''}`
  const hmac = createHmac('sha256', secret)

  hmac.update(payload)

  // 16 bytes (32 hex chars) is enough security for verification — full 32
  // bytes is overkill and makes the QR denser unnecessarily.
  return hmac.digest('hex').slice(0, 32)
}

export const buildVerificationUrl = (input: QuoteVerificationInput): string | null => {
  const token = computeVerificationToken(input)

  if (!token) return null

  const baseUrl = getBaseUrl().replace(/\/$/, '')

  return `${baseUrl}/public/quote/${input.quotationId}/${input.versionNumber}/${token}`
}

export const buildShortVerificationLabel = (input: QuoteVerificationInput): string => {
  const baseUrl = getBaseUrl().replace(/\/$/, '').replace(/^https?:\/\//, '')

  return `${baseUrl}/public/quote/${input.quotationId.slice(0, 8)}…/v${input.versionNumber}`
}

/**
 * Generate a QR PNG as base64 data URL ready for `<Image src={dataUrl}>`.
 * Returns null if the verification URL can't be built (no secret configured).
 *
 * Tuned for PDF embedding:
 * - 240px target render size at 2x scale = 480px raster (sharp on print).
 * - Error correction 'M' = 15% recovery (resistant to small physical damage).
 * - Margin 1 = minimal quiet zone (PDF caller adds its own padding).
 * - Color black on white (max contrast for any printer).
 */
export const generateVerificationQrDataUrl = async (
  input: QuoteVerificationInput
): Promise<string | null> => {
  const url = buildVerificationUrl(input)

  if (!url) return null

  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.warn(
      '[pdf-qr] QR generation failed:',
      error instanceof Error ? error.message : error
    )

    return null
  }
}

/**
 * Helper for callers that need a stable PDF content hash to bind the QR
 * token to. Called BEFORE the final render with the relevant inputs.
 */
export const computePdfContentHash = (input: {
  quotationId: string
  versionNumber: number
  total: number
  currency: string
  lineCount: number
}): string => {
  const payload = `${input.quotationId}:${input.versionNumber}:${input.total}:${input.currency}:${input.lineCount}`

  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}
