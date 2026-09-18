import * as Sentry from '@sentry/nextjs'

import { scrubSentryServerEvent } from '@/lib/observability/sentry-server-event-scrub'

const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // TASK-1848 — bearers en el path (enlaces compartidos de Insights) nunca llegan a Sentry.
    beforeSend: event => scrubSentryServerEvent(event),
    beforeSendTransaction: event => scrubSentryServerEvent(event)
  })
}
