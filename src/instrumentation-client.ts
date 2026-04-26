import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim()

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false
  })
}

 
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
