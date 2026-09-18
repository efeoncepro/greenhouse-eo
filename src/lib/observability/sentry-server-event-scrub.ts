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
  request?: { url?: string; query_string?: unknown }
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
