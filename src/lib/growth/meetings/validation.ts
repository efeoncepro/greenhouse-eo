import { z } from 'zod'

import type { MeetingBookingRequest } from './contracts'

const safeAttributionValue = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9._~-]+$/)

export const meetingBookingRequestSchema = z.object({
  schedulerKey: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/),
  surfaceId: z.string().regex(/^fhsf-[A-Za-z0-9_-]{3,100}$/),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
  slot: z.object({
    startsAt: z.string().datetime({ offset: true }),
    durationMinutes: z.number().int().min(15).max(240),
    timezone: z.string().min(1).max(64),
  }).strict(),
  locale: z.literal('es'),
  contact: z.object({
    email: z.string().trim().email().max(254),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    company: z.string().trim().min(1).max(160),
  }).strict(),
  consent: z.object({
    processingAccepted: z.literal(true),
    communicationKeys: z.array(z.string().regex(/^communications_[a-f0-9]{12}$/)).max(8),
  }).strict(),
  captchaToken: z.string().min(1).max(4096),
  attribution: z.object({
    placement: safeAttributionValue.optional(),
    pagePath: z.string().trim().regex(/^\/[A-Za-z0-9/_-]*$/).max(300).optional(),
    referrerHost: z.string().trim().max(253).regex(/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/).optional(),
    utmSource: safeAttributionValue.optional(),
    utmMedium: safeAttributionValue.optional(),
    utmCampaign: safeAttributionValue.optional(),
  }).strict().optional(),
}).strict()

export const parseMeetingBookingRequest = (value: unknown): MeetingBookingRequest | null => {
  const parsed = meetingBookingRequestSchema.safeParse(value)

  if (!parsed.success) return null

  return parsed.data
}

export const normalizeMeetingBookingRequest = (input: MeetingBookingRequest): MeetingBookingRequest => ({
  ...input,
  slot: { ...input.slot, startsAt: new Date(input.slot.startsAt).toISOString() },
  contact: {
    email: input.contact.email.trim().toLowerCase(),
    firstName: input.contact.firstName.trim(),
    lastName: input.contact.lastName.trim(),
    company: input.contact.company.trim(),
  },
  consent: {
    processingAccepted: true,
    communicationKeys: [...new Set(input.consent.communicationKeys)].sort(),
  },
})
