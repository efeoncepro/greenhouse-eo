import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  GraphTransportError,
  findUserByEmail,
  getOrCreateOneOnOneChat,
  installBotForUser,
  postChannelMessage,
  postChatMessage
} from '@/lib/integrations/teams/bot-framework/graph-client'
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
  it('posts and returns the message id on 201', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'msg-1' }), { status: 201 })
    )

    const result = await postChannelMessage({
      token: 't',
      teamId: 'team-1',
      channelId: 'channel-1',
      card,
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result).toEqual({ messageId: 'msg-1' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = fetchImpl.mock.calls[0][0] as string

    expect(url).toContain('/teams/team-1/channels/channel-1/messages')
  })

  it('retries on 429 and succeeds on the second attempt', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'msg-2' }), { status: 201 }))

    const result = await postChannelMessage({
      token: 't',
      teamId: 'team-1',
      channelId: 'channel-1',
      card,
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result).toEqual({ messageId: 'msg-2' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws GraphTransportError on 401', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('forbidden', { status: 401 }))

    await expect(
      postChannelMessage({
        token: 't',
        teamId: 'team',
        channelId: 'channel',
        card,
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).rejects.toBeInstanceOf(GraphTransportError)
  })
})

describe('postChatMessage', () => {
  it('posts to /chats/{id}/messages', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'm' }), { status: 201 }))

    await postChatMessage({
      token: 't',
      chatId: 'chat-xyz',
      card,
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = fetchImpl.mock.calls[0][0] as string

    expect(url).toContain('/chats/chat-xyz/messages')
  })
})

describe('getOrCreateOneOnOneChat', () => {
  it('returns the chat id from response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'chat-123', chatType: 'oneOnOne' }), { status: 201 }))

    const { chatId } = await getOrCreateOneOnOneChat({
      token: 't',
      botUserId: 'bot',
      recipientUserId: 'user-1',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(chatId).toBe('chat-123')
  })

  it('throws when no id is returned', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 201 }))

    await expect(
      getOrCreateOneOnOneChat({
        token: 't',
        botUserId: 'bot',
        recipientUserId: 'user-1',
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).rejects.toBeInstanceOf(GraphTransportError)
  })
})

describe('installBotForUser', () => {
  it('treats 409 as already installed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('already installed', { status: 409 }))

    const result = await installBotForUser({
      token: 't',
      recipientUserId: 'user-1',
      teamsAppId: 'app-1',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result).toEqual({ alreadyInstalled: true })
  })

  it('returns alreadyInstalled=false on first install', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 201 }))

    const result = await installBotForUser({
      token: 't',
      recipientUserId: 'user-1',
      teamsAppId: 'app-1',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result).toEqual({ alreadyInstalled: false })
  })
})

describe('findUserByEmail', () => {
  it('returns the first match', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ value: [{ id: 'u-1', displayName: 'Julio' }] }), { status: 200 })
      )

    const found = await findUserByEmail({
      token: 't',
      email: 'julio@efeoncepro.com',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(found).toEqual({ userId: 'u-1', displayName: 'Julio' })
  })

  it('returns null when no users match', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: [] }), { status: 200 }))

    const found = await findUserByEmail({
      token: 't',
      email: 'nobody@example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(found).toBeNull()
  })
})
