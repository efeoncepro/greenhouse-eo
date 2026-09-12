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
    // Sentry JAVASCRIPT-NEXTJS-94 (2026-09-12): `TypeError … reading 'M_ID'` en `…/executors/200.js`
    // sobre /public/careers/[publicId]. Esa ruta no existe en nuestro bundle (Next sirve
    // `_next/static/chunks/*`): es un script inyectado por una extensión del navegador del visitante.
    // OJO: `denyUrls` se evalúa en `inboundFilters`, que corre ANTES de la integración de Next que
    // reescribe los frames a `app:///…`; el patrón debe casar con el filename CRUDO (`<origin>/executors/N.js`),
    // nunca con el prefijo `app:///`. Se agregan los schemes de extensiones, que Sentry documenta como ruido.
    denyUrls: [/\/executors\/\d+\.js$/i, /^(chrome|moz|safari-web)-extension:\/\//i],
    beforeSend(event) {
      return isFacebookAndroidBridgeTeardownEvent(event) ? null : event
    }
  })
}

 
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
