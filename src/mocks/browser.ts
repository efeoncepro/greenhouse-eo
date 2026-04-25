import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

/**
 * Browser-side MSW worker for Playwright and opt-in dev mode.
 *
 * Activated explicitly by the consumer (e.g. Playwright setup or a dev-only
 * bootstrap script gated on `NEXT_PUBLIC_API_MOCKING === 'enabled'`). Never
 * started automatically in production — the worker script under
 * `public/mockServiceWorker.js` is inert until `worker.start()` is called.
 */
export const worker = setupWorker(...handlers)
