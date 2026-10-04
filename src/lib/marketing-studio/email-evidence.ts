import { z } from 'zod'

/** Read-only provider adapters. Recipient data is never returned, logged or persisted. */
export class EmailEvidenceError extends Error {
  constructor(public readonly code: 'not_configured' | 'provider_unavailable' | 'invalid_response') {
    super(code)
  }
}
export type EmailProvider = 'hubspot' | 'resend'
export type EmailEvidence = {
  id: string
  scheduledAt: string | null
  sentAt: string | null
  observedAt: string
  status: string
  bodyText: null
  urls: string[]
  permalink: null
  emailEvidence: {
    kind: 'broadcast' | 'batch'
    completion: 'not_started' | 'partial' | 'complete' | 'unknown'
    sentCount: number | null
    expectedCount: number | null
    source: string
    lastSentAt: string | null
  }
}
export type EmailPage = { items: EmailEvidence[]; nextCursor: string | null }
const numericId = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]).transform(String)

const timestamp = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' && typeof value !== 'number') throw new EmailEvidenceError('invalid_response')
  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) throw new EmailEvidenceError('invalid_response')

  return date.toISOString()
}

const requestJson = async (url: URL, token: string, fetcher: typeof fetch) => {
  if (!token) throw new EmailEvidenceError('not_configured')

  try {
    const response = await fetcher(url, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Efeonce-Studio-Evidence/1.0' },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) throw new EmailEvidenceError('provider_unavailable')

    return (await response.json()) as unknown
  } catch (error) {
    throw error instanceof EmailEvidenceError ? error : new EmailEvidenceError('provider_unavailable')
  }
}

const decode = <T extends z.ZodTypeAny>(schema: T, raw: unknown): z.output<T> => {
  const result = schema.safeParse(raw)

  if (!result.success) throw new EmailEvidenceError('invalid_response')

  return result.data
}

const cursor = (value: string | null | undefined, pattern: RegExp) => {
  if (value && (!pattern.test(value) || value.length > 512)) throw new EmailEvidenceError('invalid_response')

  return value || null
}

const broadcast = z.object({
  id: z.string().uuid(),
  status: z.string(),
  scheduled_at: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional()
})

/** Native broadcasts only. Transactional delivery priority does not establish Studio campaign ownership. */
export const readResendEvidence = async (
  input: { token: string; cursor?: string | null; now?: Date },
  fetcher: typeof fetch = fetch
): Promise<EmailPage> => {
  const now = input.now ?? new Date()
  const url = new URL('https://api.resend.com/broadcasts')

  url.searchParams.set('limit', '100')
  const after = cursor(input.cursor, /^[a-f0-9-]{36}$/i)

  if (after) url.searchParams.set('after', after)

  const page = decode(
    z.object({ data: z.array(broadcast), has_more: z.boolean() }),
    await requestJson(url, input.token, fetcher)
  )

  const items: EmailEvidence[] = []

  for (const item of page.data) {
    const sent = timestamp(item.sent_at)

    if (sent && Date.parse(sent) > now.getTime()) throw new EmailEvidenceError('invalid_response')
    const complete = item.status === 'sent' && sent !== null

    items.push({
      id: item.id,
      observedAt: now.toISOString(),
      scheduledAt: timestamp(item.scheduled_at),
      sentAt: complete ? sent : null,
      status: item.status,
      bodyText: null,
      urls: [],
      permalink: null,
      emailEvidence: {
        kind: 'broadcast',
        completion: complete
          ? 'complete'
          : ['draft', 'scheduled', 'queued'].includes(item.status)
            ? 'not_started'
            : item.status === 'sending'
              ? 'partial'
              : 'unknown',
        sentCount: null,
        expectedCount: null,
        source: 'resend.broadcasts',
        lastSentAt: sent
      }
    })
  }

  const nextCursor = page.has_more ? (page.data.at(-1)?.id ?? null) : null

  if (page.has_more && (!nextCursor || nextCursor === after)) throw new EmailEvidenceError('invalid_response')

  return { items, nextCursor }
}

const counters = z.object({
  sent: z.number().int().nonnegative(),
  selected: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  notsent: z.number().int().nonnegative()
})

const marketingEmail = z.object({
  id: numericId,
  type: z.string(),
  state: z.string(),
  publishDate: z.string().nullable().optional(),
  sendOnPublish: z.boolean().optional(),
  isTransactional: z.boolean().optional(),
  allEmailCampaignIds: z.array(numericId).nullish(),
  primaryEmailCampaignId: numericId.nullable().optional(),
  stats: z.object({ counters: counters.nullish() }).nullish()
})

/** SENT events, not publishDate or delivery events, establish actual send time. */
export const readHubSpotEvidence = async (
  input: { token: string; portalId: string; cursor?: string | null; now?: Date },
  fetcher: typeof fetch = fetch
): Promise<EmailPage> => {
  const deadline = Date.now() + 45000
  const originalFetch = fetcher

  fetcher = async (url, init) => {
    const remaining = deadline - Date.now()

    if (remaining <= 0) throw new EmailEvidenceError('provider_unavailable')

    return originalFetch(url, { ...init, signal: AbortSignal.timeout(Math.min(remaining, 15000)) })
  }

  const now = input.now ?? new Date()

  const identity = decode(
    z.object({ portalId: numericId }),
    await requestJson(new URL('https://api.hubapi.com/integrations/v1/me'), input.token, fetcher)
  )

  if (identity.portalId !== input.portalId) throw new EmailEvidenceError('not_configured')
  const url = new URL('https://api.hubapi.com/marketing/v3/emails')

  url.searchParams.set('limit', '10')
  url.searchParams.set('includeStats', 'true')
  const after = cursor(input.cursor, /^[a-zA-Z0-9_%=-]+$/)

  if (after) {
    let decoded: string

    try {
      decoded = decodeURIComponent(after)
    } catch {
      throw new EmailEvidenceError('invalid_response')
    }

    url.searchParams.set('after', decoded)
  }

  const page = decode(
    z.object({
      results: z.array(marketingEmail),
      paging: z
        .object({ next: z.object({ after: z.union([z.string(), z.number()]).transform(String) }).optional() })
        .optional()
    }),
    await requestJson(url, input.token, fetcher)
  )

  const items: EmailEvidence[] = []

  for (const email of page.results) {
    if (email.type !== 'BATCH_EMAIL' || email.isTransactional) continue
    const stats = email.stats?.counters
    const events = new Map<string, string>()

    if (stats && stats.sent > 0) {
      const campaignIds = [
        ...new Set([
          ...(email.allEmailCampaignIds ?? []),
          ...(email.primaryEmailCampaignId ? [email.primaryEmailCampaignId] : [])
        ])
      ]

      for (const campaignId of campaignIds) {
        let offset: string | null = null
        const seen = new Set<string>()

        for (let n = 0; n < 100; n++) {
          const eventUrl = new URL('https://api.hubapi.com/email/public/v1/events')

          eventUrl.search = new URLSearchParams({
            campaignId,
            eventType: 'SENT',
            limit: '1000',
            ...(offset ? { offset } : {})
          }).toString()

          const result = decode(
            z.object({
              events: z.array(
                z.object({
                  id: z.string(),
                  type: z.literal('SENT'),
                  created: z.number().int().positive(),
                  emailCampaignId: numericId
                })
              ),
              hasMore: z.boolean(),
              offset: z.string().optional()
            }),
            await requestJson(eventUrl, input.token, fetcher)
          )

          for (const event of result.events) {
            if (event.emailCampaignId !== campaignId || event.created > now.getTime())
              throw new EmailEvidenceError('invalid_response')
            events.set(event.id, new Date(event.created).toISOString())
          }

          if (!result.hasMore) break
          if (!result.offset || seen.has(result.offset) || n === 99) throw new EmailEvidenceError('invalid_response')
          offset = result.offset
          seen.add(offset)
        }
      }
    }

    const lastSentAt = [...events.values()].sort().at(-1) ?? null

    const complete =
      email.state === 'PUBLISHED' &&
      stats &&
      stats.sent > 0 &&
      stats.pending === 0 &&
      stats.selected === stats.sent + stats.notsent &&
      events.size === stats.sent &&
      lastSentAt !== null

    items.push({
      id: email.id,
      scheduledAt:
        ['SCHEDULED', 'SCHEDULED_AB'].includes(email.state) && email.sendOnPublish === false
          ? timestamp(email.publishDate)
          : null,
      sentAt: complete ? lastSentAt : null,
      observedAt: now.toISOString(),
      status: email.state,
      bodyText: null,
      urls: [],
      permalink: null,
      emailEvidence: {
        kind: 'batch',
        completion: complete
          ? 'complete'
          : stats && stats.sent > 0
            ? 'partial'
            : ['DRAFT', 'SCHEDULED', 'SCHEDULED_AB'].includes(email.state)
              ? 'not_started'
              : 'unknown',
        sentCount: stats?.sent ?? null,
        expectedCount: stats?.selected ?? null,
        source: 'hubspot.marketing_emails+SENT_events',
        lastSentAt
      }
    })
  }

  const nextCursor = page.paging?.next?.after ?? null

  if (nextCursor && nextCursor === after) throw new EmailEvidenceError('invalid_response')

  return { items, nextCursor }
}
