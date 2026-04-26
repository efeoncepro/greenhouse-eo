import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/node'
import type { TeamsAdaptiveCard } from '@/lib/integrations/teams/types'

const pgQueryMock = vi.fn()
const resolveSecretByRefMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => pgQueryMock(...args)
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecretByRef: (...args: unknown[]) => resolveSecretByRefMock(...args)
}))

vi.mock('crypto', () => ({
  randomUUID: () => '11111111-1111-1111-1111-111111111111'
}))

const { postTeamsCard } = await import('@/lib/integrations/teams/sender')

const sampleCard: TeamsAdaptiveCard = {
  type: 'AdaptiveCard',
  version: '1.5',
  body: [{ type: 'TextBlock', text: 'hello' }]
}

const baseChannel = {
  channel_code: 'ops-alerts',
  channel_kind: 'azure_logic_app',
  display_name: 'Ops Alerts',
  description: null,
  secret_ref: 'greenhouse-teams-ops-alerts-webhook',
  logic_app_resource_id: null,
  bot_app_id: null,
  team_id: null,
  channel_id: null,
  azure_tenant_id: null,
  azure_subscription_id: null,
  azure_resource_group: null,
  disabled_at: null
}

const realSetTimeout = global.setTimeout

beforeEach(() => {
  pgQueryMock.mockReset()
  resolveSecretByRefMock.mockReset()
  // Replace retry sleep with an immediate microtask so 429 retries don't burn 5s.
  global.setTimeout = ((fn: (...args: unknown[]) => void) => {
    queueMicrotask(() => fn())

    return 0 as unknown as ReturnType<typeof setTimeout>
  }) as typeof setTimeout
})

afterEach(() => {
  global.setTimeout = realSetTimeout
})

describe('postTeamsCard', () => {
  it('returns channel_not_found when no row matches', async () => {
    pgQueryMock.mockResolvedValueOnce([])

    const result = await postTeamsCard('missing', sampleCard)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('channel_not_found')
    }
  })

  it('returns channel_disabled when row has disabled_at set', async () => {
    pgQueryMock.mockResolvedValueOnce([{ ...baseChannel, disabled_at: new Date('2026-01-01') }])

    const result = await postTeamsCard('ops-alerts', sampleCard)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('channel_disabled')
    }
  })

  it('returns missing_secret when resolveSecretByRef yields null', async () => {
    pgQueryMock.mockResolvedValueOnce([baseChannel])
    pgQueryMock.mockResolvedValue([])
    resolveSecretByRefMock.mockResolvedValueOnce(null)

    const result = await postTeamsCard('ops-alerts', sampleCard)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('missing_secret')
    }
  })

  it('posts payload to logic app and returns ok on 200', async () => {
    pgQueryMock.mockResolvedValueOnce([baseChannel])
    pgQueryMock.mockResolvedValue([])
    resolveSecretByRefMock.mockResolvedValueOnce('https://logic-app.example.com/trigger?sig=xyz')

    let received: unknown = null

    server.use(
      http.post('https://logic-app.example.com/trigger', async ({ request }) => {
        received = await request.json()

        return HttpResponse.text('OK', { status: 200 })
      })
    )

    const result = await postTeamsCard('ops-alerts', sampleCard, { triggeredBy: 'unit-test' })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.attempts).toBe(1)
      expect(result.channelKind).toBe('azure_logic_app')
    }

    expect(received).toMatchObject({
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: sampleCard
        }
      ]
    })
  })

  it('retries on 429 and succeeds on second attempt', async () => {
    pgQueryMock.mockResolvedValueOnce([baseChannel])
    pgQueryMock.mockResolvedValue([])
    resolveSecretByRefMock.mockResolvedValueOnce('https://logic-app.example.com/trigger')

    let attempts = 0

    server.use(
      http.post('https://logic-app.example.com/trigger', () => {
        attempts += 1

        if (attempts === 1) {
          return HttpResponse.text('rate limited', { status: 429 })
        }

        return HttpResponse.text('OK', { status: 200 })
      })
    )

    const result = await postTeamsCard('ops-alerts', sampleCard)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.attempts).toBe(2)
    }

    expect(attempts).toBe(2)
  })

  it('returns http_error after exhausting retries on persistent 429', async () => {
    pgQueryMock.mockResolvedValueOnce([baseChannel])
    pgQueryMock.mockResolvedValue([])
    resolveSecretByRefMock.mockResolvedValueOnce('https://logic-app.example.com/trigger')

    let attempts = 0

    server.use(
      http.post('https://logic-app.example.com/trigger', () => {
        attempts += 1

        return HttpResponse.text('rate limited', { status: 429 })
      })
    )

    const result = await postTeamsCard('ops-alerts', sampleCard)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('http_error')
    }

    expect(attempts).toBe(3)
  })

  it('returns card_too_large when card exceeds 26000 bytes', async () => {
    pgQueryMock.mockResolvedValueOnce([baseChannel])
    pgQueryMock.mockResolvedValue([])
    resolveSecretByRefMock.mockResolvedValueOnce('https://logic-app.example.com/trigger')

    const fatCard: TeamsAdaptiveCard = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [{ type: 'TextBlock', text: 'x'.repeat(30_000) }]
    }

    const result = await postTeamsCard('ops-alerts', fatCard)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('card_too_large')
    }
  })

  it('returns unsupported_channel_kind for teams_bot until V2 lands', async () => {
    pgQueryMock.mockResolvedValueOnce([{ ...baseChannel, channel_kind: 'teams_bot' }])
    pgQueryMock.mockResolvedValue([])

    const result = await postTeamsCard('ops-alerts', sampleCard)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('unsupported_channel_kind')
    }
  })
})
