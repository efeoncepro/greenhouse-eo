import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { server } from '@/mocks/node'

vi.mock('server-only', () => ({}))

// MSW: one node server shared across every Vitest suite. Handlers come from
// `src/mocks/handlers.ts`; per-test overrides go through `server.use(...)`.
// `onUnhandledRequest: 'warn'` keeps legacy `vi.stubGlobal('fetch', ...)` tests
// working (MSW stays silent when the global has been stubbed locally) while
// still flagging new drift. Migrated tests should remove their local stubs and
// rely on handlers; brand-new tests should always go through MSW.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// react-pdf → pdfjs-dist eagerly references the browser global DOMMatrix at
// module load. jsdom does not ship it, so any test that transitively imports
// CertificatePreviewDialog via the @/components/greenhouse barrel explodes
// before the test body runs. Mocking react-pdf as no-op components avoids
// loading pdfjs entirely in the test environment.
vi.mock('react-pdf', () => ({
  Document: ({ children }: { children?: React.ReactNode }) => children ?? null,
  Page: () => null,
  pdfjs: { GlobalWorkerOptions: {}, version: 'test' }
}))
