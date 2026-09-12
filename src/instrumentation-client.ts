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
    // Sentry JAVASCRIPT-NEXTJS-94 (2026-09-12): `TypeError … reading 'M_ID'` en `app:///executors/200.js`
    // sobre /public/careers/[publicId]. Ese origen no existe en nuestro bundle (Next sirve
    // `_next/static/chunks/*`): es un script inyectado por una extensión del navegador del visitante.
    // Se descarta en origen para que la señal de la página pública no la contamine ruido ajeno.
    denyUrls: [/^app:\/\/\/executors\//i],
    beforeSend(event) {
      return isFacebookAndroidBridgeTeardownEvent(event) ? null : event
    }
  })
}

 
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
