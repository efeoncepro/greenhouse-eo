import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  GraphTransportError,
  findUserByEmail,
  getOrCreateOneOnOneChat,
  postChannelMessage,
  postChatMessage
} from '@/lib/integrations/teams/bot-framework/connector-client'
import type { TeamsAdaptiveCard } from '@/lib/integrations/teams/types'

const card: TeamsAdaptiveCard = {
  type: 'AdaptiveCard',
  version: '1.5',
  body: [{ type: 'TextBlock', text: 'hi' }]
}

const realSetTimeout = global.setTimeout

beforeEach(() => {
  global.setTimeout = ((fn: (...args: unknown[]) => void) => {
    queueMicrotask(() => fn())

    return 0 as unknown as ReturnType<typeof setTimeout>
  }) as typeof setTimeout
})

afterEach(() => {
  global.setTimeout = realSetTimeout
})

describe('postChannelMessage', () => {
  it('uses cached serviceUrl on hot path and returns activityId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '19:abc@thread.tacv2;messageid=1777200000000',
          activityId: '1777200000000'
        }),
        { status: 201 }
      )
    )

    const result = await postChannelMessage({
      token: 't',
      tenantId: 'tenant-a',
      teamId: 'team-1',
      channelId: '19:abc@thread.tacv2',
      card,
      cachedServiceUrl: 'https://smba.trafficmanager.net/teams',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result.messageId).toBe('1777200000000')
    expect(result.serviceUrl).toBe('https://smba.trafficmanager.net/teams')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = fetchImpl.mock.calls[0][0] as string

    expect(url).toContain('/teams/v3/conversations')
    expect(url).not.toContain('/amer/')

    const body = JSON.parse((fetchImpl.mock.calls[0][1] as { body: string }).body)

    expect(body.isGroup).toBe(true)
    expect(body.channelData.channel.id).toBe('19:abc@thread.tacv2')
    expect(body.channelData.tenant.id).toBe('tenant-a')
    expect(body.activity.type).toBe('message')
    expect(body.activity.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive')
  })

  it('falls back from /teams to /amer on Unknown cloud 404', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"error":{"message":"Unknown cloud \'global\'"}}', { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '19:foo@thread;messageid=1', activityId: '1' }), { status: 201 })
      )

    const result = await postChannelMessage({
      token: 't',
      tenantId: 'tenant-a',
      teamId: 'team',
      channelId: '19:foo@thread.tacv2',
      card,
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result.serviceUrl).toBe('https://smba.trafficmanager.net/amer')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('retries on 429 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'ok' }), { status: 201 }))

    const result = await postChannelMessage({
      token: 't',
      tenantId: 'tenant',
      teamId: 'team',
      channelId: 'channel',
      card,
      cachedServiceUrl: 'https://smba.trafficmanager.net/teams',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result.serviceUrl).toBe('https://smba.trafficmanager.net/teams')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws GraphTransportError on non-cloud 4xx (e.g. 401)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }))

    await expect(
      postChannelMessage({
        token: 't',
        tenantId: 'tenant',
        teamId: 'team',
        channelId: 'channel',
        card,
        cachedServiceUrl: 'https://smba.trafficmanager.net/teams',
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).rejects.toBeInstanceOf(GraphTransportError)
  })
})

describe('postChatMessage', () => {
  it('posts to /v3/conversations/{chatId}/activities', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'msg-x' }), { status: 201 }))

    const result = await postChatMessage({
      token: 't',
      tenantId: 'tenant-a',
      chatId: 'chat-xyz',
      card,
      cachedServiceUrl: 'https://smba.trafficmanager.net/teams',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result.messageId).toBe('msg-x')
    const url = fetchImpl.mock.calls[0][0] as string

    expect(url).toContain('/v3/conversations/chat-xyz/activities')
  })
})

describe('getOrCreateOneOnOneChat', () => {
  it('returns the chat id and the serviceUrl that succeeded', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'chat-123' }), { status: 201 }))

    const result = await getOrCreateOneOnOneChat({
      token: 't',
      tenantId: 'tenant-a',
      recipientUserId: 'user-1',
      cachedServiceUrl: 'https://smba.trafficmanager.net/teams',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result.chatId).toBe('chat-123')
    expect(result.serviceUrl).toBe('https://smba.trafficmanager.net/teams')

    const body = JSON.parse((fetchImpl.mock.calls[0][1] as { body: string }).body)

    expect(body.members[0].id).toBe('29:user-1')
    expect(body.tenantId).toBe('tenant-a')
    expect(body.channelData.tenant.id).toBe('tenant-a')
  })

  it('throws when no chat id is returned', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 201 }))

    await expect(
      getOrCreateOneOnOneChat({
        token: 't',
        tenantId: 'tenant-a',
        recipientUserId: 'user-1',
        cachedServiceUrl: 'https://smba.trafficmanager.net/teams',
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).rejects.toBeInstanceOf(GraphTransportError)
  })
})

describe('findUserByEmail', () => {
  it('returns the first matching Graph user', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ value: [{ id: 'u-1', displayName: 'Julio' }] }), { status: 200 })
      )

    const found = await findUserByEmail({
      graphToken: 'g-token',
      email: 'julio@efeoncepro.com',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(found).toEqual({ userId: 'u-1', displayName: 'Julio' })
    const url = fetchImpl.mock.calls[0][0] as string

    expect(url).toContain('https://graph.microsoft.com/v1.0/users')
  })

  it('returns null when no users match', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: [] }), { status: 200 }))

    const found = await findUserByEmail({
      graphToken: 'g-token',
      email: 'nobody@example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(found).toBeNull()
  })

  it('escapes single quotes in email to prevent OData injection', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: [] }), { status: 200 }))

    await findUserByEmail({
      graphToken: 'g-token',
      email: "weird'name@efeoncepro.com",
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    const url = fetchImpl.mock.calls[0][0] as string

    expect(url).toContain("weird''name")
  })
})
