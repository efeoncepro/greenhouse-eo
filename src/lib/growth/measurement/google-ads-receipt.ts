import { z } from 'zod'

/** Dedicated Google Tag handoff. Never merge userData into dataLayer or ordinary analytics. */
export const googleAdsConversionReceiptSchema = z.object({
  version: z.literal(1),
  transactionId: z.string().uuid(),
  conversionKey: z.enum(['commercial_lead', 'meeting_booking']),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  userData: z.object({
    sha256_email_address: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    sha256_phone_number: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  }).strict().refine(value => Boolean(value.sha256_email_address || value.sha256_phone_number)).optional(),
}).strict().refine(value => Date.parse(value.expiresAt) - Date.parse(value.issuedAt) === 10 * 60_000)

export type GoogleAdsConversionReceipt = z.infer<typeof googleAdsConversionReceiptSchema>

export const publishedGoogleAdsReceipt = (receipt: GoogleAdsConversionReceipt | undefined, persisted: boolean, now = new Date()): GoogleAdsConversionReceipt | undefined => {
  const parsed = googleAdsConversionReceiptSchema.safeParse(receipt)

  return persisted && parsed.success && Date.parse(parsed.data.issuedAt) <= now.getTime() && Date.parse(parsed.data.expiresAt) > now.getTime()
    ? parsed.data : undefined
}
