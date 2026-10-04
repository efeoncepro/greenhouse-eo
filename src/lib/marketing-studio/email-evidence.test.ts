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
    const request = vi.fn<typeof fetch>(async () =>
      response({
        has_more: true,
        data: [
          { id, status: 'sent', sent_at: '2026-10-01 10:00:00+00' },
          { id: '59a3999c-0ce1-4ea6-ab68-afcd6dc2e794', status: 'sending', sent_at: null },
          { id: '69a3999c-0ce1-4ea6-ab68-afcd6dc2e794', status: 'queued', scheduled_at: '2026-10-05T10:00:00Z' }
        ]
      })
    )

    const result = await readResendEvidence({ token: 'fixture', now }, request)

    expect(result.items.map(x => x.emailEvidence.completion)).toEqual(['complete', 'partial', 'not_started'])
    expect(result.items.map(x => x.sentAt)).toEqual(['2026-10-01T10:00:00.000Z', null, null])
    expect(result.nextCursor).toBe('69a3999c-0ce1-4ea6-ab68-afcd6dc2e794')
    expect(request.mock.calls[0]?.[1]?.redirect).toBe('error')
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
