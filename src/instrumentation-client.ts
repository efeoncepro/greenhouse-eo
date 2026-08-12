import * as Sentry from '@sentry/nextjs'

import { isFacebookAndroidBridgeTeardownEvent } from '@/lib/observability/sentry-client-event-filter'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim()

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      return isFacebookAndroidBridgeTeardownEvent(event) ? null : event
    }
  })
}

 
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
