import { z } from 'zod'

/** Read-only provider adapters. Recipient data is never returned, logged or persisted. */
export class EmailEvidenceError extends Error {
  constructor(public readonly code: 'not_configured' | 'provider_unavailable' | 'invalid_response') {
    super(code)
  }
}
export type EmailProvider = 'hubspot' | 'resend'
type Metric = {
  value: number
  source: string
  observedAt: string
  windowStartAt: string | null
  windowEndAt: string | null
}
type Audience = {
  kind: 'list' | 'segment'
  id: string
  name: string | null
  role: 'include' | 'exclude'
  source: string
  observedAt: string
  contactCount: Metric | null
}
type EmailDetails = {
  source: string
  observedAt: string
  sender: { name: string | null; address: string | null; raw: string | null }
  subject: string | null
  preheader: string | null
  audiences: Audience[] | null
  delivered: Metric | null
  opens: Metric | null
  clicks: Metric | null
}

const metric = (
  value: number | null | undefined,
  source: string,
  observedAt: string,
  windowStartAt: string | null = null,
  windowEndAt: string | null = null
): Metric | null => (value == null ? null : { value, source, observedAt, windowStartAt, windowEndAt })

// Resend's documented single mailbox format. Preserve the original even if it cannot be safely split.
const sender = (raw: string | null | undefined): EmailDetails['sender'] => {
  if (raw == null) return { name: null, address: null, raw: null }
  const mailbox = /^([^<>\r\n]+) <([^<>\s@]+@[^<>\s@]+)>$/.exec(raw)

  return { raw, name: mailbox?.[1] ?? null, address: mailbox?.[2] ?? (/^[^<>\s@]+@[^<>\s@]+$/.test(raw) ? raw : null) }
}

const count = z.number().int().nonnegative()
const literal = z.string().nullish()

const boundedFetch = (original: typeof fetch): typeof fetch => {
  const deadline = Date.now() + 45000

  return async (url, init) => {
    const remaining = deadline - Date.now()

    if (remaining <= 0) throw new EmailEvidenceError('provider_unavailable')

    return original(url, { ...init, signal: AbortSignal.timeout(Math.min(remaining, 15000)) })
  }
}

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
    details: EmailDetails
    observedAt: string
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
    // Detail/list/metrics fan-out remains GET-only. Honor short provider backoff within the page deadline.
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetcher(url, {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Efeonce-Studio-Evidence/1.0' },
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      })

      if (response.status === 429 && attempt < 2) {
        const seconds = Number(response.headers.get('retry-after') ?? '1')

        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 2)
          throw new EmailEvidenceError('provider_unavailable')
        await response.body?.cancel()
        await new Promise(resolve => setTimeout(resolve, Math.max(250, seconds * 1000)))
        continue
      }

      if (!response.ok) throw new EmailEvidenceError('provider_unavailable')

      return (await response.json()) as unknown
    }

    throw new EmailEvidenceError('provider_unavailable')
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
  fetcher = boundedFetch(fetcher)
  const now = input.now ?? new Date()
  const observedAt = now.toISOString()
  const url = new URL('https://api.resend.com/broadcasts')

  url.searchParams.set('limit', '5')
  const after = cursor(input.cursor, /^[a-f0-9-]{36}$/i)

  if (after) url.searchParams.set('after', after)

  const page = decode(
    z.object({ data: z.array(broadcast), has_more: z.boolean() }),
    await requestJson(url, input.token, fetcher)
  )

  const items: EmailEvidence[] = []

  const segments = new Map<string, Audience>()

  for (const listed of page.data) {
    const item = decode(
      broadcast.extend({
        from: literal,
        subject: literal,
        preview_text: literal,
        segment_id: z.string().uuid().nullish(),
        audience_id: z.string().uuid().nullish(),
        created_at: literal
      }),
      await requestJson(new URL(`https://api.resend.com/broadcasts/${listed.id}`), input.token, fetcher)
    )

    if (item.id !== listed.id) throw new EmailEvidenceError('invalid_response')
    const segmentId = item.segment_id ?? item.audience_id

    if (segmentId && !segments.has(segmentId)) {
      const segment = decode(
        z.object({ id: z.string().uuid(), name: literal }),
        await requestJson(new URL(`https://api.resend.com/segments/${segmentId}`), input.token, fetcher)
      )

      if (segment.id !== segmentId) throw new EmailEvidenceError('invalid_response')
      // Aggregate size is private beta; do not enumerate recipients or substitute sentCount.
      segments.set(segmentId, {
        kind: 'segment',
        id: segmentId,
        name: segment.name ?? null,
        role: 'include',
        source: 'resend.segments',
        observedAt,
        contactCount: null
      })
    }

    let delivered: Metric | null = null,
      opens: Metric | null = null,
      clicks: Metric | null = null
    const start = timestamp(item.created_at)

    if (start && Date.parse(start) > now.getTime()) throw new EmailEvidenceError('invalid_response')

    if (start && ['sending', 'sent'].includes(item.status)) {
      const metricsUrl = new URL('https://api.resend.com/emails/metrics')

      metricsUrl.search = new URLSearchParams({
        broadcast_id: item.id,
        start_date: start,
        end_date: observedAt,
        metrics: 'delivered,opened,clicked'
      }).toString()

      const metrics = decode(
        z.object({
          start_date: z.string(),
          end_date: z.string(),
          totals: z.object({ delivered: count.nullish(), opened: count.nullish(), clicked: count.nullish() })
        }),
        await requestJson(metricsUrl, input.token, fetcher)
      )

      const from = timestamp(metrics.start_date),
        to = timestamp(metrics.end_date)

      if (!from || !to || Date.parse(from) > Date.parse(to) || Date.parse(to) > now.getTime())
        throw new EmailEvidenceError('invalid_response')
      delivered = metric(metrics.totals.delivered, 'resend.emails.metrics.delivered', observedAt, from, to)
      opens = metric(metrics.totals.opened, 'resend.emails.metrics.opened', observedAt, from, to)
      clicks = metric(metrics.totals.clicked, 'resend.emails.metrics.clicked', observedAt, from, to)
    }

    const details: EmailDetails = {
      source: 'resend.broadcasts',
      observedAt,
      sender: sender(item.from),
      subject: item.subject ?? null,
      preheader: item.preview_text ?? null,
      audiences: segmentId ? [segments.get(segmentId)!] : null,
      delivered,
      opens,
      clicks
    }

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
        details,
        observedAt,
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
  delivered: count.nullish(),
  open: count.nullish(),
  click: count.nullish(),
  sent: count.nullish(),
  selected: count.nullish(),
  pending: count.nullish(),
  notsent: count.nullish()
})

const marketingEmail = z.object({
  from: z.object({ fromName: literal, replyTo: literal }).nullish(),
  subject: literal,
  content: z
    .object({
      widgets: z
        .object({ preview_text: z.object({ body: z.object({ value: literal }).nullish() }).nullish() })
        .nullish()
    })
    .nullish(),
  to: z
    .object({
      contactIlsLists: z
        .object({ include: z.array(numericId).nullish(), exclude: z.array(numericId).nullish() })
        .nullish()
    })
    .nullish(),
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
  fetcher = boundedFetch(fetcher)
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

  const lists = new Map<string, Omit<Audience, 'role'>>()

  for (const email of page.results) {
    if (email.type !== 'BATCH_EMAIL' || email.isTransactional) continue
    const observedAt = now.toISOString()

    const audiences: Audience[] | null =
      Array.isArray(email.to?.contactIlsLists?.include) || Array.isArray(email.to?.contactIlsLists?.exclude) ? [] : null

    for (const role of ['include', 'exclude'] as const)
      for (const id of email.to?.contactIlsLists?.[role] ?? []) {
        if (!lists.has(id)) {
          const result = decode(
            z.object({
              list: z.object({
                listId: numericId,
                objectTypeId: z.literal('0-1'),
                name: literal,
                size: count.nullish()
              })
            }),
            await requestJson(new URL(`https://api.hubapi.com/crm/v3/lists/${id}`), input.token, fetcher)
          )

          if (result.list.listId !== id) throw new EmailEvidenceError('invalid_response')
          lists.set(id, {
            kind: 'list',
            id,
            name: result.list.name ?? null,
            source: 'hubspot.crm.lists',
            observedAt,
            contactCount: metric(result.list.size, 'hubspot.crm.lists.size', observedAt)
          })
        }

        audiences!.push({ ...lists.get(id)!, role })
      }

    const stats = email.stats?.counters

    const details: EmailDetails = {
      source: 'hubspot.marketing_emails',
      observedAt,
      // PublicEmailFromDetails: replyTo is the FROM address; customReplyTo is the override for replies.
      sender: { name: email.from?.fromName ?? null, address: email.from?.replyTo ?? null, raw: null },
      subject: email.subject ?? null,
      preheader: email.content?.widgets?.preview_text?.body?.value ?? null,
      audiences,
      delivered: metric(stats?.delivered, 'hubspot.marketing_emails.stats.counters.delivered', observedAt),
      opens: metric(stats?.open, 'hubspot.marketing_emails.stats.counters.open', observedAt),
      clicks: metric(stats?.click, 'hubspot.marketing_emails.stats.counters.click', observedAt)
    }

    const events = new Map<string, string>()

    if (stats && stats.sent != null && stats.sent > 0) {
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
      stats.sent != null &&
      stats.selected != null &&
      stats.notsent != null &&
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
        details,
        observedAt,
        kind: 'batch',
        completion: complete
          ? 'complete'
          : stats && stats.sent != null && stats.sent > 0
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
