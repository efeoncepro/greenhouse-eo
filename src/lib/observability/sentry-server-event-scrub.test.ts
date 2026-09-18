import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/**
 * TASK-1848 — un bearer de enlace compartido viaja en el PATH. Sentry registra URL, transacción,
 * breadcrumbs y spans tal cual: la pasada del servidor debe dejarlos sin token en todos ellos.
 */

const TOKEN = `isg_${'Ab9_-'.repeat(8)}xyz`

describe('scrubSentryServerEvent', () => {
  it('redacta el token del path en request, transacción, breadcrumbs y spans', async () => {
    const { scrubSentryServerEvent } = await import('./sentry-server-event-scrub')

    const event = scrubSentryServerEvent({
      transaction: `GET /api/public/insights/shared/${TOKEN}`,
      request: { url: `https://greenhouse.efeoncepro.com/api/public/insights/shared/${TOKEN}/outputs/deck_pdf`, query_string: `ref=${TOKEN}` },
      breadcrumbs: [{ message: `fetch https://think.efeoncepro.com/insights/r/${TOKEN}`, data: { url: `https://x/api/public/insights/shared/${TOKEN}` } }],
      spans: [{ description: `GET /api/public/insights/shared/${TOKEN}`, data: { 'http.url': `/api/public/insights/shared/${TOKEN}` } }]
    })

    expect(JSON.stringify(event)).not.toContain(TOKEN)
    expect(event.request?.url).toBe('https://greenhouse.efeoncepro.com/api/public/insights/shared/[redacted]/outputs/deck_pdf')
    expect(event.transaction).toBe('GET /api/public/insights/shared/[redacted]')
  })

  it('no toca rutas ajenas', async () => {
    const { scrubSentryServerEvent } = await import('./sentry-server-event-scrub')

    expect(scrubSentryServerEvent({ transaction: 'GET /api/platform/app/insights/editions' }).transaction).toBe('GET /api/platform/app/insights/editions')
  })
})
