import { describe, expect, it, vi } from 'vitest'

import { readHubSpotEvidence, readResendEvidence } from './email-evidence'
import { authorizeEmailEvidence } from './email-evidence-port'

const now = new Date('2026-10-04T12:00:00Z')
const response = (body: unknown) => new Response(JSON.stringify(body))
const id = '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794'

const email = {
  id: '123',
  type: 'BATCH_EMAIL',
  state: 'PUBLISHED',
  publishDate: '2026-10-01T10:00:00Z',
  allEmailCampaignIds: ['456'],
  stats: { counters: { sent: 2, selected: 2, pending: 0, notsent: 0 } }
}

const event = (id: string, created: number) => ({
  id,
  type: 'SENT',
  emailCampaignId: 456,
  created,
  recipient: 'private@example.test'
})

const hubspot = (item: unknown, events: unknown[], hasMore = false) =>
  vi.fn<typeof fetch>(async url => {
    const u = new URL(String(url))

    if (u.pathname.endsWith('/me')) return response({ portalId: 99 })
    if (u.pathname.endsWith('/emails'))
      return response({ results: [item, { id: 987, type: 'TICKET_EMAIL', state: 'PUBLISHED' }] })

    return response({ events, hasMore, offset: 'repeat' })
  })

describe('Studio owned email adapters', () => {
  it('Resend distinguishes draft, queued, partial and whole broadcast sent; follows provider pagination', async () => {
    const data = [
      { id, status: 'sent', sent_at: '2026-10-01 10:00:00+00' },
      { id: '59a3999c-0ce1-4ea6-ab68-afcd6dc2e794', status: 'sending', sent_at: null },
      { id: '69a3999c-0ce1-4ea6-ab68-afcd6dc2e794', status: 'queued', scheduled_at: '2026-10-05T10:00:00Z' }
    ]

    const request = vi.fn<typeof fetch>(async url => {
      const path = new URL(String(url)).pathname

      return response(path === '/broadcasts' ? { has_more: true, data } : data.find(x => path.endsWith(x.id)))
    })

    const result = await readResendEvidence({ token: 'fixture', now }, request)

    expect(result.items.map(x => x.emailEvidence.completion)).toEqual(['complete', 'partial', 'not_started'])
    expect(result.items.map(x => x.sentAt)).toEqual(['2026-10-01T10:00:00.000Z', null, null])
    expect(result.nextCursor).toBe('69a3999c-0ce1-4ea6-ab68-afcd6dc2e794')
    expect(request.mock.calls[0]?.[1]?.redirect).toBe('error')
  })
  it('reads Resend literal copy, sender and segment; scopes metrics to the broadcast and preserves zero vs absent', async () => {
    const segmentId = '59a3999c-0ce1-4ea6-ab68-afcd6dc2e794'

    const request = vi.fn<typeof fetch>(async url => {
      const u = new URL(String(url))

      if (u.pathname === '/broadcasts') return response({ has_more: false, data: [{ id, status: 'sent' }] })
      if (u.pathname === `/broadcasts/${id}`)
        return response({
          id,
          status: 'sent',
          sent_at: '2026-10-01T10:00:00Z',
          created_at: '2026-09-28T10:00:00Z',
          from: ' Equipo <news@example.test>',
          subject: '  Hola 👋\n',
          preview_text: '',
          segment_id: segmentId
        })
      if (u.pathname === `/segments/${segmentId}`) return response({ id: segmentId, name: ' Clientes ' })
      expect(u.pathname).toBe('/emails/metrics')
      expect(u.searchParams.get('broadcast_id')).toBe(id)
      expect(u.searchParams.has('dimensions')).toBe(false)
      expect(u.searchParams.get('start_date')).toBe('2026-09-28T10:00:00.000Z')

      return response({
        start_date: u.searchParams.get('start_date'),
        end_date: u.searchParams.get('end_date'),
        totals: { delivered: 12, opened: 0 }
      })
    })

    const result = (await readResendEvidence({ token: 'fixture', now }, request)).items[0]!.emailEvidence.details

    expect(result).toMatchObject({
      subject: '  Hola 👋\n',
      preheader: '',
      sender: { name: ' Equipo', address: 'news@example.test' },
      delivered: { value: 12 },
      opens: { value: 0 },
      clicks: null
    })
    expect(result.audiences).toEqual([
      {
        kind: 'segment',
        id: segmentId,
        name: ' Clientes ',
        role: 'include',
        source: 'resend.segments',
        observedAt: now.toISOString(),
        contactCount: null
      }
    ])
    expect(result.delivered?.observedAt).toBe(now.toISOString())
  })
  it('HubSpot uses FROM replyTo, literal widget preview and ILS list size, never customReplyTo or selected count as audience size', async () => {
    const request = vi.fn<typeof fetch>(async url => {
      const path = new URL(String(url)).pathname

      if (path.endsWith('/me')) return response({ portalId: 99 })
      if (path.endsWith('/emails'))
        return response({
          results: [
            {
              ...email,
              state: 'DRAFT',
              from: { fromName: ' Equipo ', replyTo: 'from@example.test', customReplyTo: 'reply@example.test' },
              subject: ' é 👋 ',
              content: { widgets: { preview_text: { body: { value: '  Texto\n' } } } },
              to: { contactIlsLists: { include: [5], exclude: [6] } },
              stats: { counters: { sent: 0, selected: 123, pending: 123, notsent: 0, delivered: 0, open: 0 } }
            }
          ]
        })
      const listId = path.split('/').at(-1)

      return response({
        list: { listId, objectTypeId: '0-1', name: `Lista ${listId}`, ...(listId === '5' ? { size: 10 } : {}) }
      })
    })

    const details = (await readHubSpotEvidence({ token: 'fixture', portalId: '99', now }, request)).items[0]!
      .emailEvidence.details

    expect(details).toMatchObject({
      sender: { name: ' Equipo ', address: 'from@example.test' },
      subject: ' é 👋 ',
      preheader: '  Texto\n',
      delivered: { value: 0 },
      opens: { value: 0 },
      clicks: null
    })
    expect(details.audiences?.[0]).toMatchObject({
      id: '5',
      role: 'include',
      contactCount: { value: 10, source: 'hubspot.crm.lists.size', observedAt: now.toISOString() }
    })
    expect(details.audiences?.[1]).toMatchObject({ id: '6', role: 'exclude', contactCount: null })
  })
  it('retries a short GET rate limit without changing provider scope or leaking its response', async () => {
    vi.useFakeTimers()

    try {
      const request = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response('private provider message', { status: 429, headers: { 'retry-after': '1' } })
        )
        .mockResolvedValueOnce(response({ has_more: false, data: [] }))

      const pending = readResendEvidence({ token: 'fixture', now }, request)

      await vi.advanceTimersByTimeAsync(1000)
      expect(await pending).toEqual({ items: [], nextCursor: null })
      expect(request).toHaveBeenCalledTimes(2)
      expect(String(request.mock.calls[0]?.[0])).toBe(String(request.mock.calls[1]?.[0]))
    } finally {
      vi.useRealTimers()
    }
  })
  it('rejects future evidence, malformed pages, foreign URLs as cursors and provider failures without raw errors', async () => {
    const request = vi.fn<typeof fetch>(async () =>
      response({ has_more: false, data: [{ id, status: 'sent', sent_at: '2027-01-01T00:00:00Z' }] })
    )

    await expect(readResendEvidence({ token: 'fixture', now }, request)).rejects.toMatchObject({
      code: 'invalid_response'
    })
    await expect(
      readResendEvidence({ token: 'fixture', cursor: 'https://foreign.example' }, request)
    ).rejects.toMatchObject({ code: 'invalid_response' })
    request.mockResolvedValue(new Response('secret failure', { status: 429 }))
    await expect(readResendEvidence({ token: 'fixture' }, request)).rejects.toThrow('provider_unavailable')
  })
  it('HubSpot needs all SENT events and terminal counts, never publishDate; removes PII and transactional mail', async () => {
    const request = hubspot(email, [
      event('second', Date.parse('2026-10-01T10:01:00Z')),
      event('first', Date.parse('2026-10-01T10:00:01Z')),
      event('first', Date.parse('2026-10-01T10:00:01Z'))
    ])

    const result = await readHubSpotEvidence({ token: 'fixture', portalId: '99', now }, request)

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.sentAt).toBe('2026-10-01T10:01:00.000Z')
    expect(result.items[0]?.emailEvidence.completion).toBe('complete')
    expect(JSON.stringify(result)).not.toContain('private@example.test')

    const partial = await readHubSpotEvidence(
      { token: 'fixture', portalId: '99', now },
      hubspot(email, [event('first', now.getTime() - 1000)])
    )

    expect(partial.items[0]?.sentAt).toBeNull()
    expect(partial.items[0]?.emailEvidence.completion).toBe('partial')
  })
  it('HubSpot requires matching portal and campaign, rejects cursor loops, records schedule without publishing', async () => {
    const request = hubspot(email, [])

    await expect(readHubSpotEvidence({ token: 'fixture', portalId: 'other', now }, request)).rejects.toMatchObject({
      code: 'not_configured'
    })
    expect(request).toHaveBeenCalledTimes(1)
    await expect(
      readHubSpotEvidence({ token: 'fixture', portalId: '99', now }, hubspot(email, [], true))
    ).rejects.toMatchObject({ code: 'invalid_response' })
    await expect(
      readHubSpotEvidence(
        { token: 'fixture', portalId: '99', now },
        hubspot(email, [{ ...event('first', now.getTime() - 1), emailCampaignId: 999 }])
      )
    ).rejects.toMatchObject({ code: 'invalid_response' })

    const scheduled = await readHubSpotEvidence(
      { token: 'fixture', portalId: '99', now },
      hubspot(
        { ...email, state: 'SCHEDULED', sendOnPublish: false, publishDate: '2026-10-05T10:00:00Z', stats: undefined },
        []
      )
    )

    expect(scheduled.items[0]).toMatchObject({ scheduledAt: '2026-10-05T10:00:00.000Z', sentAt: null })
  })
  it('intersects credential owner, organization and account; OFF and ambiguous bindings fail closed', () => {
    const binding = { organizationId: 'org-a', provider: 'resend', accountRef: 'team-a' }

    const input = {
      ...binding,
      enabled: true,
      configuredBindings: JSON.stringify([binding]),
      consumerPlatform: 'marketing-studio',
      bindingPlatform: 'marketing-studio',
      bindingScope: 'organization',
      bindingOrganizationId: 'org-a'
    }

    expect(authorizeEmailEvidence(input)).toEqual(binding)
    for (const override of [
      { enabled: false },
      { organizationId: 'org-b' },
      { accountRef: 'team-b' },
      { consumerPlatform: 'verk' },
      { bindingScope: 'internal' },
      { provider: 'salesforce_marketing_cloud_next' },
      { configuredBindings: JSON.stringify([binding, binding]) }
    ])
      expect(() => authorizeEmailEvidence({ ...input, ...override })).toThrow('not_configured')
  })
  it('accepts nullable HubSpot draft fields and decodes the provider cursor exactly once', async () => {
    const request = vi.fn<typeof fetch>(async url =>
      String(url).includes('/me')
        ? response({ portalId: 99 })
        : response({
            results: [
              {
                id: '123',
                type: 'BATCH_EMAIL',
                state: 'DRAFT',
                stats: null,
                allEmailCampaignIds: null,
                primaryEmailCampaignId: null
              }
            ],
            paging: { next: { after: 'MjA%3D' } }
          })
    )

    const page = await readHubSpotEvidence({ token: 'fixture', portalId: '99', cursor: 'MTA%3D', now }, request)

    expect(new URL(String(request.mock.calls[1]?.[0])).searchParams.get('after')).toBe('MTA=')
    expect(page.nextCursor).toBe('MjA%3D')
    expect(page.items[0]?.sentAt).toBeNull()
  })
})
