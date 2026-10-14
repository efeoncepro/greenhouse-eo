import 'server-only'

import { redactSensitive } from './redact'

/**
 * TASK-1848 — limpieza de eventos Sentry del servidor (`beforeSend` / `beforeSendTransaction` en
 * `sentry.server.config.ts` y `sentry.edge.config.ts`). Sentry registra la URL de la request, el
 * nombre de la transacción y los breadcrumbs HTTP tal cual: un bearer que viaja en el PATH
 * (`/api/public/insights/shared/<token>`) terminaría en Sentry sin esta pasada. Reutiliza los
 * patrones canónicos de `redact.ts`; no define otros.
 *
 * Tipado estructural a propósito: `src/lib/**` no importa `@sentry/nextjs` (lint).
 */

interface ScrubbableBreadcrumb {
  message?: string
  data?: Record<string, unknown>
}

interface ScrubbableSpan {
  description?: string
  data?: Record<string, unknown>
}

export interface ScrubbableSentryEvent {
  transaction?: string
  request?: { url?: string; query_string?: unknown; data?: unknown; headers?: unknown; cookies?: unknown; env?: unknown }
  user?: unknown
  breadcrumbs?: ScrubbableBreadcrumb[]
  spans?: ScrubbableSpan[]
}

const URL_DATA_KEYS = ['url', 'http.url', 'to', 'from'] as const

const scrubData = (data: Record<string, unknown> | undefined): void => {
  if (!data) return

  for (const key of URL_DATA_KEYS) {
    const value = data[key]

    if (typeof value === 'string') data[key] = redactSensitive(value)
  }
}

export const scrubSentryServerEvent = <T extends ScrubbableSentryEvent>(event: T): T => {
  // Public conversion requests carry contacts and visitor identifiers. Sentry's
  // sendDefaultPii=false is not a contract to retain their request bodies/headers.
  const route = event.request?.url || event.transaction || ''

  if (/\/api\/public\/growth\/(?:forms\/[^/?\s]+\/submit|meetings\/book)(?:[/?\s]|$)/.test(route)) {
    if (event.request) {
      delete event.request.data
      delete event.request.headers
      delete event.request.cookies
      delete event.request.env
      delete event.request.query_string
      if (event.request.url) event.request.url = event.request.url.split(/[?#]/)[0]
    }

    delete event.user
  }

  if (typeof event.transaction === 'string') event.transaction = redactSensitive(event.transaction)

  if (event.request) {
    if (typeof event.request.url === 'string') event.request.url = redactSensitive(event.request.url)
    if (typeof event.request.query_string === 'string') event.request.query_string = redactSensitive(event.request.query_string)
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (typeof breadcrumb.message === 'string') breadcrumb.message = redactSensitive(breadcrumb.message)
    scrubData(breadcrumb.data)
  }

  for (const span of event.spans ?? []) {
    if (typeof span.description === 'string') span.description = redactSensitive(span.description)
    scrubData(span.data)
  }

  return event
}
